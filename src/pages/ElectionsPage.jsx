import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Loading from "../components/Loading";
import { ErrorBanner } from "../components/Feedback";
import { extractCollection, toApiError } from "../lib/api";

function getElectionStatus(expiration) {
  if (!expiration) return "Draft";
  const date = new Date(expiration);
  if (Number.isNaN(date.getTime())) return "Scheduled";
  return date.getTime() < Date.now() ? "Closed" : "Open";
}

function formatDate(value) {
  if (!value) return "No expiration";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default function ElectionsPage({ api, activeWorkgroupId }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [elections, setElections] = useState([]);

  async function load({ silent = false } = {}) {
    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await api.get("/election", {
        params: {
          page: 1,
          items: 50,
          workgroupId: activeWorkgroupId || undefined,
        },
      });

      if (response.status >= 400) throw toApiError(response, "Failed to load elections");
      setElections(extractCollection(response, "elections"));
      setError("");
    } catch (err) {
      setError(err.message || "Failed to load elections");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, [api, activeWorkgroupId]);

  if (loading) return <Loading text="Loading elections..." />;

  return (
    <div className="screen-stack">
      <section className="surface-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Voting</p>
            <h2>Election feed</h2>
          </div>
          <div className="split-actions">
            <Link className="text-link" to="/app/election">
              Create
            </Link>
            <button className="btn btn-tonal" onClick={() => load({ silent: true })}>
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>
        <p className="subtle-copy">
          Scoped to the active workgroup when one is selected. Open a vote to cast decisions
          for the current election.
        </p>
        <ErrorBanner error={error} />

        <div className="card-list">
          {elections.length === 0 ? (
            <div className="empty-state">No elections available for this scope.</div>
          ) : (
            elections.map((election) => (
              <article className="election-card" key={election.id}>
                <div className="section-heading compact">
                  <div>
                    <strong>{election.name || "Untitled election"}</strong>
                    <p>{election.description || "No description provided."}</p>
                  </div>
                  <span className={`status-pill status-${getElectionStatus(election.expiration).toLowerCase()}`}>
                    {getElectionStatus(election.expiration)}
                  </span>
                </div>

                <div className="detail-grid">
                  <div>
                    <span className="detail-label">Expires</span>
                    <span>{formatDate(election.expiration)}</span>
                  </div>
                  <div>
                    <span className="detail-label">Workgroup</span>
                    <span>{election.workgroupId || "Unscoped"}</span>
                  </div>
                  <div>
                    <span className="detail-label">Audience</span>
                    <span>{election.groupId || "Not set"}</span>
                  </div>
                  <div>
                    <span className="detail-label">List</span>
                    <span>{election.listId || "Not set"}</span>
                  </div>
                </div>

                <div className="split-actions">
                  <Link className="btn btn-secondary" to={`/app/cast-vote/${election.id}`}>
                    Vote
                  </Link>
                  <Link className="text-link" to={`/app/election/${election.id}`}>
                    Edit
                  </Link>
                  <Link className="text-link" to={`/app/statistics/${election.id}`}>
                    Statistics
                  </Link>
                  <span className="tiny-meta">ID {election.id}</span>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
