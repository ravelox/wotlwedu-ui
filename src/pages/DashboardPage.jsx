import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Loading from "../components/Loading";
import { ErrorBanner } from "../components/Feedback";
import { extractCollection } from "../lib/api";

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

export default function DashboardPage({ api, activeWorkgroupId }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [elections, setElections] = useState([]);
  const [votes, setVotes] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const [unreadRes, electionRes, voteRes] =
          await Promise.all([
            api.get("/notification/unreadcount"),
            api.get("/election", {
              params: {
                page: 1,
                items: 6,
                workgroupId: activeWorkgroupId || undefined,
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
        setVotes((voteRes.data?.data?.rows || voteRes.data?.rows || []).slice(0, 4));
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

  if (loading) return <Loading text="Loading dashboard..." />;

  return (
    <div className="screen-stack">
      <ErrorBanner error={error} />

      <section className="hero-card">
        <p className="eyebrow">Home</p>
        <h2>Your election activity</h2>
        <p>
          The minimal client home only surfaced elections. This version stays consumer-focused
          and adds direct access to your pending votes and notifications.
        </p>
        <div className="metric-grid">
          <div className="metric-card">
            <strong>{elections.length}</strong>
            <span>Visible elections</span>
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
      </section>

      <section className="surface-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Action</p>
            <h3>Vote now</h3>
          </div>
          <Link className="text-link" to="/app/cast-vote">
            Open voting
          </Link>
        </div>
        <div className="card-list">
          {votes.length === 0 ? (
            <div className="empty-state">You do not have any pending votes right now.</div>
          ) : (
            votes.map((vote) => (
              <article className="list-card" key={vote.id}>
                <div>
                  <strong>{vote.election?.name || "Election"}</strong>
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
      </section>

      <section className="surface-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Upcoming</p>
            <h3>Elections</h3>
          </div>
          <Link className="text-link" to="/app/elections">
            View all
          </Link>
        </div>
        <div className="card-list">
          {elections.length === 0 ? (
            <div className="empty-state">No elections are visible for the current scope.</div>
          ) : (
            elections.map((election) => (
              <article className="list-card" key={election.id}>
                <div>
                  <strong>{election.name || "Untitled election"}</strong>
                  <p>{election.description || "No description provided."}</p>
                </div>
                <div className="chip-row">
                  <span className="chip">{formatDate(election.expiration)}</span>
                  {election.workgroupId ? (
                    <span className="chip chip-soft">{election.workgroupId}</span>
                  ) : null}
                </div>
                <div className="split-actions">
                  <Link className="text-link" to={`/app/cast-vote/${election.id}`}>
                    Vote in this election
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
