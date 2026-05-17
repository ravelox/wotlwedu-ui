import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Loading from "../components/Loading";
import { ErrorBanner } from "../components/Feedback";
import TutorialPanel from "../components/TutorialPanel";
import {
  dismissPollTutorial,
  enablePollTutorial,
  getPollTutorial,
  skipPollTutorial,
  startPollTutorial,
} from "../lib/tutorial";

function formatDate(value) {
  if (!value) return "No expiration";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function timeUntil(value) {
  if (!value) return "No deadline";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No deadline";
  const diffMs = date.getTime() - Date.now();
  if (diffMs <= 0) return "Closed";
  const diffHours = Math.round(diffMs / (60 * 60 * 1000));
  if (diffHours < 24) return `${Math.max(diffHours, 1)}h left`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d left`;
}

function cardAction(card) {
  return card?.action || {
    label: card?.status?.name === "Ended" ? "View Results" : "View Results",
    href: `/app/statistics/${card?.id || ""}`,
  };
}

function PollVisual({ card }) {
  const label = card?.name || "Poll";
  if (card?.imageUrl) {
    return <img className="social-poll-image" src={card.imageUrl} alt="" />;
  }
  return (
    <div className="social-poll-image social-poll-image-fallback" aria-hidden="true">
      {label.slice(0, 1).toUpperCase()}
    </div>
  );
}

function AvatarStack({ creator, count = 0 }) {
  const people = [
    creator || { initials: "W", name: "Wotlwedu" },
    ...(count > 1 ? [{ initials: "+", name: `${count - 1} more` }] : []),
  ].slice(0, 3);
  return (
    <div className="avatar-stack" aria-label={`${count || 1} participant${count === 1 ? "" : "s"}`}>
      {people.map((person, index) => (
        <span className="avatar-dot" title={person.name} key={`${person.name || "person"}-${index}`}>
          {person.initials || "W"}
        </span>
      ))}
    </div>
  );
}

function PollCard({ card, tone = "default" }) {
  if (!card) return null;
  const action = cardAction(card);
  return (
    <article className={`social-poll-card social-poll-card-${tone}`}>
      <PollVisual card={card} />
      <div className="social-poll-body">
        <div className="split-heading">
          <div>
            <p className="eyebrow">{card.status?.name || "Open"}</p>
            <h3>{card.name || "Untitled poll"}</h3>
          </div>
          <span className="chip">{timeUntil(card.expiration)}</span>
        </div>
        {card.description ? <p>{card.description}</p> : null}
        <div className="idea-chip-row">
          {(card.ideas || []).slice(0, 3).map((idea) => (
            <span className="chip chip-soft" key={idea.id}>
              {idea.name}
            </span>
          ))}
          {!card.ideas?.length && card.audience?.name ? (
            <span className="chip chip-soft">{card.audience.name}</span>
          ) : null}
        </div>
        <div className="social-card-footer">
          <div className="participant-summary">
            <AvatarStack creator={card.creator} count={card.participantCount} />
            <span>
              {card.participantCount || 0} participant{card.participantCount === 1 ? "" : "s"} ·{" "}
              {card.completionRate || 0}% complete
            </span>
          </div>
          <Link className="btn btn-secondary" to={action.href}>
            {action.label}
          </Link>
        </div>
      </div>
    </article>
  );
}

function ActivityItem({ activity }) {
  if (!activity) return null;
  const initials = activity.actor?.initials || "W";
  return (
    <Link className="activity-item" to={activity.href || "/app/home"}>
      <span className="avatar-dot">{initials}</span>
      <span>
        <strong>{activity.title}</strong>
        <small>{activity.text}</small>
      </span>
      <span className="tiny-meta">{formatDate(activity.createdAt)}</span>
    </Link>
  );
}

function EmptySocialState({ title, copy, actionTo, actionLabel }) {
  return (
    <div className="empty-state social-empty-state">
      <strong>{title}</strong>
      <p>{copy}</p>
      {actionTo ? (
        <Link className="btn btn-secondary" to={actionTo}>
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

export default function DashboardPage({ api, activeWorkgroupId, onLogout }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [home, setHome] = useState(null);
  const [tutorial, setTutorial] = useState(null);
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
            <Link className="quick-start-card" key={`list-${list.id}`} to="/app/create-poll">
              <strong>Reuse {list.name}</strong>
              <span>{list.description || "Bring these ideas into a new poll."}</span>
            </Link>
          ))}
          {(home?.quickStarts?.recentCircles || []).slice(0, 2).map((circle) => (
            <Link className="quick-start-card" key={`circle-${circle.id}`} to="/app/create-poll">
              <strong>Ask {circle.name}</strong>
              <span>{circle.description || "Start with a circle you already use."}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
