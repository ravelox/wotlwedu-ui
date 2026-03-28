import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Loading from "../components/Loading";
import { ErrorBanner } from "../components/Feedback";
import { extractCollection } from "../lib/api";

const DASHBOARD_VIEWS = {
  votes: "votes",
  polls: "polls",
};

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

export default function DashboardPage({ api, activeWorkgroupId, onLogout }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [elections, setElections] = useState([]);
  const [myPolls, setMyPolls] = useState([]);
  const [votes, setVotes] = useState([]);
  const [dashboardView, setDashboardView] = useState(DASHBOARD_VIEWS.votes);
  const [participationByElectionId, setParticipationByElectionId] = useState({});

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const [unreadRes, electionRes, myPollsRes, voteRes] =
          await Promise.all([
            api.get("/notification/unreadcount"),
            api.get("/election", {
              params: {
                page: 1,
                items: 6,
                workgroupId: activeWorkgroupId || undefined,
              },
            }),
            api.get("/election", {
              params: {
                page: 1,
                items: 6,
              },
            }),
            api.get("/vote/next/all"),
          ]);

        if (cancelled) return;

        setUnreadCount(
          Number(
            unreadRes.data?.count ??
              unreadRes.data?.data?.count ??
              unreadRes.data?.data ??
              0
          ) || 0
        );
        setElections(extractCollection(electionRes, "elections").slice(0, 4));
        const nextMyPolls = extractCollection(myPollsRes, "elections").slice(0, 4);
        setMyPolls(nextMyPolls);
        setVotes((voteRes.data?.data?.rows || voteRes.data?.rows || []).slice(0, 4));
        const participationEntries = await Promise.all(
          nextMyPolls.map(async (poll) => {
            try {
              const response = await api.get(`/election/${poll.id}/participation`);
              if (response.status >= 400) return [poll.id, null];
              return [poll.id, response.data?.data || null];
            } catch {
              return [poll.id, null];
            }
          })
        );
        if (!cancelled) {
          setParticipationByElectionId(Object.fromEntries(participationEntries));
        }
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load dashboard");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [api, activeWorkgroupId]);

  useEffect(() => {
    if (votes.length > 0) {
      setDashboardView(DASHBOARD_VIEWS.votes);
      return;
    }
    if (myPolls.length > 0) {
      setDashboardView(DASHBOARD_VIEWS.polls);
    }
  }, [myPolls.length, votes.length]);

  if (loading) return <Loading text="Loading dashboard..." />;

  return (
    <div className="screen-stack">
      <ErrorBanner error={error} />

      <section className="hero-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Home</p>
            <h2>Your poll activity</h2>
          </div>
          <button className="btn btn-danger" onClick={onLogout} type="button">
            Logout
          </button>
        </div>
        <div className="metric-grid">
          <div className="metric-card">
            <strong>{myPolls.length}</strong>
            <span>My polls</span>
          </div>
          <div className="metric-card">
            <strong>{votes.length}</strong>
            <span>Pending votes</span>
          </div>
          <div className="metric-card">
            <strong>{unreadCount}</strong>
            <span>Unread alerts</span>
          </div>
        </div>
        <div className="split-actions">
          <Link className="btn" to="/app/election/add">
            Create Poll
          </Link>
          <Link className="btn btn-tonal" to="/app/notifications">
            View Notifications
          </Link>
          <Link className="text-link" to="/app/friend">
            Friends
          </Link>
        </div>
      </section>

      <section className="surface-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Participate</p>
            <h3>{dashboardView === DASHBOARD_VIEWS.votes ? "Pending votes" : "My polls"}</h3>
          </div>
          <div className="chip-row">
            <button
              className={`btn ${dashboardView === DASHBOARD_VIEWS.votes ? "" : "btn-tonal"}`}
              onClick={() => setDashboardView(DASHBOARD_VIEWS.votes)}
              type="button"
            >
              Pending Votes
            </button>
            <button
              className={`btn ${dashboardView === DASHBOARD_VIEWS.polls ? "" : "btn-tonal"}`}
              onClick={() => setDashboardView(DASHBOARD_VIEWS.polls)}
              type="button"
            >
              My Polls
            </button>
          </div>
        </div>
        {dashboardView === DASHBOARD_VIEWS.votes ? (
          <div className="card-list">
            {votes.length === 0 ? (
              <div className="empty-state">You do not have any pending votes right now.</div>
            ) : (
              votes.map((vote) => (
                <article className="list-card" key={vote.id}>
                  <div>
                    <strong>{vote.election?.name || "Poll"}</strong>
                    <p>{vote.item?.name || "Pending vote item"}</p>
                  </div>
                  <div className="split-actions">
                    <Link className="btn btn-secondary" to={`/app/cast-vote/${vote.election?.id || ""}`}>
                      Cast Vote
                    </Link>
                    <span className="tiny-meta">Vote ID {vote.id}</span>
                  </div>
                </article>
              ))
            )}
          </div>
        ) : (
          <div className="card-list">
            {myPolls.length === 0 ? (
              <div className="empty-state">You have not created any polls yet.</div>
            ) : (
              myPolls.map((poll) => (
                <article className="list-card" key={poll.id}>
                  {(() => {
                    const summary = participationByElectionId[poll.id];
                    const participation = summary?.participation;
                    const audience = summary?.audience;
                    return (
                      <>
                        <div>
                          <strong>{poll.name || "Untitled poll"}</strong>
                          {poll.description ? <p>{poll.description}</p> : null}
                        </div>
                        <div className="chip-row">
                          {poll.expiration ? <span className="chip">{formatDate(poll.expiration)}</span> : null}
                          {poll.workgroupId ? <span className="chip chip-soft">{poll.workgroupId}</span> : null}
                          {audience?.group?.name ? <span className="chip chip-soft">{audience.group.name}</span> : null}
                        </div>
                        {participation ? (
                          <div className="detail-grid">
                            <div>
                              <span className="detail-label">Participants</span>
                              <span>{participation.expectedParticipants}</span>
                            </div>
                            <div>
                              <span className="detail-label">Completed</span>
                              <span>{participation.completedCount}</span>
                            </div>
                            <div>
                              <span className="detail-label">Needs Follow-up</span>
                              <span>{participation.followUpCount}</span>
                            </div>
                            <div>
                              <span className="detail-label">Completion</span>
                              <span>{participation.completionRate}%</span>
                            </div>
                          </div>
                        ) : null}
                        <div className="split-actions">
                          <Link className="btn btn-secondary" to={`/app/election/${poll.id}`}>
                            Edit Poll
                          </Link>
                          <Link className="text-link" to={`/app/statistics/${poll.id}`}>
                            Results
                          </Link>
                        </div>
                      </>
                    );
                  })()}
                </article>
              ))
            )}
          </div>
        )}
      </section>

      <section className="surface-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Upcoming</p>
            <h3>Polls</h3>
          </div>
          <Link className="text-link" to="/app/elections">
            View all
          </Link>
        </div>
        <div className="card-list">
          {elections.length === 0 ? (
            <div className="empty-state">No polls are visible for the current scope.</div>
          ) : (
            elections.map((election) => (
              <article className="list-card" key={election.id}>
                <div>
                  <strong>{election.name || "Untitled poll"}</strong>
                  {election.description ? <p>{election.description}</p> : null}
                </div>
                <div className="chip-row">
                  <span className="chip">{formatDate(election.expiration)}</span>
                  {election.workgroupId ? (
                    <span className="chip chip-soft">{election.workgroupId}</span>
                  ) : null}
                </div>
                <div className="split-actions">
                  <Link className="text-link" to={`/app/cast-vote/${election.id}`}>
                    Vote
                  </Link>
                  <Link className="text-link" to={`/app/statistics/${election.id}`}>
                    View stats
                  </Link>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
