import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Loading from "../components/Loading";
import Avatar from "../components/Avatar";
import { ErrorBanner } from "../components/Feedback";
import EmptyState from "../components/EmptyState";
import TutorialPanel from "../components/TutorialPanel";
import { PollCard, formatPollDate } from "../components/PollCard";
import { clearStoredCreatePollDraft, readStoredCreatePollDraft } from "../lib/createPollDraft";
import {
  dismissPollTutorial,
  enablePollTutorial,
  getPollTutorial,
  skipPollTutorial,
  startPollTutorial,
} from "../lib/tutorial";

function ActivityItem({ activity }) {
  if (!activity) return null;
  const actorName = activity.actor?.name || activity.actor?.fullName || activity.actor?.email || activity.title || "Someone";
  return (
    <Link className="activity-item" to={activity.href || "/app/home"}>
      <Avatar label={actorName} title={actorName} />
      <span>
        <strong>{activity.title}</strong>
        <small>{activity.text}</small>
      </span>
      <span className="tiny-meta">{formatPollDate(activity.createdAt)}</span>
    </Link>
  );
}

function EmptySocialState({ title, copy, actionTo, actionLabel }) {
  return (
    <EmptyState
      className="social-empty-state"
      title={title}
      copy={copy}
      action={actionTo ? (
        <Link className="btn btn-secondary" to={actionTo}>
          {actionLabel}
        </Link>
      ) : null}
    />
  );
}

function buildCreateUrl(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  return `/app/create-poll${query.toString() ? `?${query.toString()}` : ""}`;
}

function HabitPrompt({ prompt }) {
  const body = (
    <>
      <span className="habit-icon" aria-hidden="true">{prompt.mark}</span>
      <span>
        <small>{prompt.kicker}</small>
        <strong>{prompt.title}</strong>
        <span>{prompt.copy}</span>
      </span>
      <em>{prompt.action}</em>
    </>
  );

  if (prompt.onDelete) {
    return (
      <div className={`habit-card habit-card-${prompt.tone || "default"} habit-card-with-delete`}>
        <Link className="habit-card-link" to={prompt.href}>
          {body}
        </Link>
        <button
          aria-label="Delete draft"
          className="btn btn-danger btn-icon-delete habit-delete-btn"
          onClick={prompt.onDelete}
          title="Delete draft"
          type="button"
        >
          Delete
        </button>
      </div>
    );
  }

  return (
    <Link className={`habit-card habit-card-${prompt.tone || "default"}`} to={prompt.href}>
      {body}
    </Link>
  );
}

export default function DashboardPage({ api, activeWorkgroupId, onLogout }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [home, setHome] = useState(null);
  const [tutorial, setTutorial] = useState(null);
  const [storedDraft, setStoredDraft] = useState(() => readStoredCreatePollDraft());
  const [startingTutorial, setStartingTutorial] = useState(false);
  const [updatingTutorial, setUpdatingTutorial] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const [homeRes, tutorialValue] = await Promise.all([
          api.get("/home", {
            params: {
              workgroupId: activeWorkgroupId || undefined,
            },
          }),
          getPollTutorial(api),
        ]);

        if (cancelled) return;
        if (homeRes.status >= 400) {
          throw new Error(homeRes.data?.message || "Failed to load home");
        }
        setHome(homeRes.data?.data?.home || homeRes.data?.home || null);
        setTutorial(tutorialValue);
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load home");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [api, activeWorkgroupId]);

  const metrics = useMemo(() => {
    return {
      needsVote: home?.needsVote?.length || 0,
      closingSoon: home?.closingSoon?.length || 0,
      unread: home?.unreadNotificationCount || 0,
      winners: home?.recentWinners?.length || 0,
    };
  }, [home]);

  const habitPrompts = useMemo(() => {
    const prompts = [];
    const needsVote = home?.needsVote?.[0];
    const closingSoon = home?.closingSoon?.[0];
    const recentWinner = home?.recentWinners?.find((card) => card.winner) || home?.recentWinners?.[0];
    const recentList = home?.quickStarts?.recentLists?.[0];
    const recentCircle = home?.quickStarts?.recentCircles?.[0];
    const recentTemplate = home?.quickStarts?.templates?.[0];

    if (needsVote) {
      prompts.push({
        mark: "1",
        kicker: "Waiting on you",
        title: needsVote.name,
        copy: "A group decision is easier when your vote is in.",
        action: "Vote",
        href: needsVote.action?.href || `/app/cast-vote/${needsVote.id}`,
        tone: "urgent",
      });
    }

    if (closingSoon) {
      prompts.push({
        mark: "2",
        kicker: "Closing soon",
        title: closingSoon.name,
        copy: `${formatPollDate(closingSoon.expiration)} deadline.`,
        action: "Check in",
        href: closingSoon.action?.href || `/app/statistics/${closingSoon.id}`,
        tone: "deadline",
      });
    }

    if (recentWinner) {
      prompts.push({
        mark: "3",
        kicker: "Recently decided",
        title: recentWinner.winner?.name || recentWinner.name,
        copy: "Run a rematch with the same ideas and people.",
        action: "Rematch",
        href: buildCreateUrl({ rematchPollId: recentWinner.id }),
        tone: "winner",
      });
    }

    if (recentList) {
      prompts.push({
        mark: "4",
        kicker: "Start from last ideas",
        title: recentList.name,
        copy: recentList.description || "Reuse a list you already curated.",
        action: "Reuse",
        href: buildCreateUrl({ listId: recentList.id }),
      });
    }

    if (recentCircle) {
      prompts.push({
        mark: "5",
        kicker: "Reuse this group",
        title: recentCircle.name,
        copy: recentCircle.description || "Ask the same people again.",
        action: "Ask",
        href: buildCreateUrl({ groupId: recentCircle.id }),
      });
    }

    if (storedDraft) {
      prompts.push({
        mark: "6",
        kicker: "Continue a draft",
        title: storedDraft.title || "Start from last time",
        copy: recentTemplate?.description || storedDraft.description || "Bring back your last poll setup and adjust it.",
        action: "Resume",
        href: buildCreateUrl({ fromLast: "1", template: storedDraft.templateId || recentTemplate?.id }),
        tone: "draft",
        onDelete: () => {
          const confirmed = window.confirm("Delete this draft poll? This only removes the saved draft from this browser.");
          if (!confirmed) return;
          clearStoredCreatePollDraft();
          setStoredDraft(null);
        },
      });
    }

    return prompts.slice(0, 6);
  }, [home, storedDraft]);

  if (loading) return <Loading text="Loading home..." />;

  async function handleStartTutorial() {
    setStartingTutorial(true);
    setError("");
    try {
      const nextTutorial = await startPollTutorial(api, {});
      setTutorial(nextTutorial);
    } catch (err) {
      setError(err.message || "Failed to start tutorial");
    } finally {
      setStartingTutorial(false);
    }
  }

  async function handleSkipTutorial() {
    setUpdatingTutorial(true);
    setError("");
    try {
      setTutorial(await skipPollTutorial(api));
    } catch (err) {
      setError(err.message || "Failed to skip tutorial");
    } finally {
      setUpdatingTutorial(false);
    }
  }

  async function handleDismissTutorial() {
    setUpdatingTutorial(true);
    setError("");
    try {
      await dismissPollTutorial(api);
      setTutorial({ status: "dismissed" });
    } catch (err) {
      setError(err.message || "Failed to dismiss tutorial");
    } finally {
      setUpdatingTutorial(false);
    }
  }

  async function handleEnableTutorial() {
    setUpdatingTutorial(true);
    setError("");
    try {
      setTutorial(await enablePollTutorial(api, {}));
    } catch (err) {
      setError(err.message || "Failed to resume tutorial");
    } finally {
      setUpdatingTutorial(false);
    }
  }

  async function handleRestartTutorial() {
    setUpdatingTutorial(true);
    setError("");
    try {
      setTutorial(await enablePollTutorial(api, { restart: true }));
    } catch (err) {
      setError(err.message || "Failed to restart tutorial");
    } finally {
      setUpdatingTutorial(false);
    }
  }

  return (
    <div className="screen-stack social-home">
      <ErrorBanner error={error} />

      <section className="hero-card social-hero">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Home</p>
            <h2>What are we deciding?</h2>
            <p className="subtle-copy">
              Jump into votes, catch closing polls, and reuse the groups you already bring together.
            </p>
          </div>
          <button className="btn btn-danger" onClick={onLogout} type="button">
            Logout
          </button>
        </div>
        <div className="social-metric-grid">
          <Link className="social-metric-card" to="/app/cast-vote">
            <strong>{metrics.needsVote}</strong>
            <span>need your vote</span>
          </Link>
          <Link className="social-metric-card" to="/app/polls">
            <strong>{metrics.closingSoon}</strong>
            <span>closing soon</span>
          </Link>
          <Link className="social-metric-card" to="/app/notifications">
            <strong>{metrics.unread}</strong>
            <span>new alerts</span>
          </Link>
          <Link className="social-metric-card" to="/app/polls">
            <strong>{metrics.winners}</strong>
            <span>recent decisions</span>
          </Link>
        </div>
        <div className="social-proof-strip">
          <div className="avatar-stack">
            {(home?.friendActivity || []).slice(0, 3).map((activity, index) => (
              <Avatar
                key={activity.id || index}
                label={activity.actor?.name || activity.actor?.email || activity.title}
              />
            ))}
            {!home?.friendActivity?.length ? (
              <>
                <Avatar label="You" />
                <Avatar label="Friends" />
                <Avatar label="Poll crew" />
              </>
            ) : null}
          </div>
          <span>
            {home?.friendActivity?.length
              ? "Your circle has been moving decisions along."
              : "Invite a few friends and this becomes your shared decision feed."}
          </span>
        </div>
        <div className="split-actions wrap-actions">
          <Link className="btn" to="/app/create-poll">
            Create Poll
          </Link>
          <Link className="btn btn-secondary" to="/app/friend">
            Invite Friends
          </Link>
          <Link className="btn btn-tonal" to="/app/polls">
            Browse Polls
          </Link>
        </div>
      </section>

      <TutorialPanel
        tutorial={tutorial}
        onStart={tutorial ? null : handleStartTutorial}
        onSkip={tutorial?.status === "active" ? handleSkipTutorial : null}
        onDismiss={handleDismissTutorial}
        onEnable={tutorial?.status === "skipped" ? handleEnableTutorial : null}
        onRestart={tutorial ? handleRestartTutorial : null}
        starting={startingTutorial}
        busy={updatingTutorial}
        title="Create your first poll"
      />

      <section className="surface-card habit-loop-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Next best move</p>
            <h3>Keep decisions moving</h3>
          </div>
          <Link className="text-link" to="/app/create-poll">
            New poll
          </Link>
        </div>
        <div className="habit-grid">
          {habitPrompts.map((prompt) => (
            <HabitPrompt prompt={prompt} key={`${prompt.kicker}-${prompt.title}`} />
          ))}
        </div>
      </section>

      <section className="surface-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Needs your vote</p>
            <h3>Help the group decide</h3>
          </div>
          <Link className="text-link" to="/app/cast-vote">
            Vote queue
          </Link>
        </div>
        <div className="social-card-grid">
          {home?.needsVote?.length ? (
            home.needsVote.map((card) => <PollCard card={card} key={card.id} tone="urgent" />)
          ) : (
            <EmptySocialState
              title="Nothing is waiting on you."
              copy="Start a poll and give friends something easy to answer."
              actionTo="/app/create-poll"
              actionLabel="Create Poll"
            />
          )}
        </div>
      </section>

      <section className="surface-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Closing soon</p>
            <h3>Polls with a deadline</h3>
          </div>
          <Link className="text-link" to="/app/polls">
            View all
          </Link>
        </div>
        <div className="social-card-grid compact-social-grid">
          {home?.closingSoon?.length ? (
            home.closingSoon.map((card) => <PollCard card={card} key={card.id} />)
          ) : (
            <EmptySocialState
              title="No deadlines are looming."
              copy="When polls get close, they will show up here with a quick way back in."
              actionTo="/app/polls"
              actionLabel="Browse Polls"
            />
          )}
        </div>
      </section>

      <section className="social-two-column">
        <div className="surface-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Activity</p>
              <h3>What your people are doing</h3>
            </div>
          </div>
          <div className="activity-list">
            {home?.friendActivity?.length ? (
              home.friendActivity.map((activity) => (
                <ActivityItem activity={activity} key={activity.id} />
              ))
            ) : (
              <EmptySocialState
                title="No activity yet."
                copy="Create a poll or invite friends to make this feed come alive."
                actionTo="/app/friend"
                actionLabel="Invite Friends"
              />
            )}
          </div>
        </div>

        <div className="surface-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Recent winners</p>
              <h3>Decisions made</h3>
            </div>
          </div>
          <div className="winner-list">
            {home?.recentWinners?.length ? (
              home.recentWinners.map((card) => (
                <Link className="winner-row" to={`/app/statistics/${card.id}`} key={card.id}>
                  <span>
                    <strong>{card.winner?.name || card.name}</strong>
                    <small>{card.name}</small>
                  </span>
                  <span className="chip">{card.winner?.yesVotes || card.castVotes || 0} votes</span>
                </Link>
              ))
            ) : (
              <EmptySocialState
                title="No winners yet."
                copy="Completed polls will land here so you can quickly remember what the group picked."
              />
            )}
          </div>
        </div>
      </section>

      <section className="surface-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Start from this</p>
            <h3>Fast ways to make the next decision</h3>
          </div>
          <Link className="text-link" to="/app/create-poll">
            Full wizard
          </Link>
        </div>
        <div className="quick-start-grid">
          {(home?.quickStarts?.templates || []).map((template) => (
            <Link
              className="quick-start-card"
              key={template.id}
              to={`/app/create-poll?template=${encodeURIComponent(template.id)}`}
            >
              <strong>{template.label || template.title}</strong>
              <span>{template.description}</span>
            </Link>
          ))}
          {(home?.quickStarts?.recentLists || []).slice(0, 2).map((list) => (
            <Link className="quick-start-card" key={`list-${list.id}`} to={buildCreateUrl({ listId: list.id })}>
              <strong>Reuse {list.name}</strong>
              <span>{list.description || "Bring these ideas into a new poll."}</span>
            </Link>
          ))}
          {(home?.quickStarts?.recentCircles || []).slice(0, 2).map((circle) => (
            <Link className="quick-start-card" key={`circle-${circle.id}`} to={buildCreateUrl({ groupId: circle.id })}>
              <strong>Ask {circle.name}</strong>
              <span>{circle.description || "Start with a circle you already use."}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
