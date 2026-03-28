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
  const [participationByElectionId, setParticipationByElectionId] = useState({});

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

      if (response.status >= 400) throw toApiError(response, "Failed to load polls");
      const nextElections = extractCollection(response, "elections");
      setElections(nextElections);
      const summaries = await Promise.all(
        nextElections.map(async (election) => {
          try {
            const summaryRes = await api.get(`/election/${election.id}/participation`);
            if (summaryRes.status >= 400) return [election.id, null];
            return [election.id, summaryRes.data?.data || null];
          } catch {
            return [election.id, null];
          }
        })
      );
      setParticipationByElectionId(Object.fromEntries(summaries));
      setError("");
    } catch (err) {
      setError(err.message || "Failed to load polls");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
  }, [api, activeWorkgroupId]);

  if (loading) return <Loading text="Loading polls..." />;

  return (
    <div className="screen-stack">
      <section className="surface-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Voting</p>
            <h2>Poll feed</h2>
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
        <ErrorBanner error={error} />

        <div className="card-list">
          {elections.length === 0 ? (
            <div className="empty-state">No polls available for this scope.</div>
          ) : (
            elections.map((election) => (
              <article className="election-card" key={election.id}>
                {(() => {
                  const summary = participationByElectionId[election.id];
                  const participation = summary?.participation;
                  const audience = summary?.audience;
                  return (
                    <>
                <div className="section-heading compact">
                  <div>
                    <strong>{election.name || "Untitled poll"}</strong>
                    {election.description ? <p>{election.description}</p> : null}
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
                    <span>{audience?.group?.name || election.groupId || "Not set"}</span>
                  </div>
                  <div>
                    <span className="detail-label">List</span>
                    <span>{audience?.list?.name || election.listId || "Not set"}</span>
                  </div>
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

                {audience?.participants?.length ? (
                  <p className="tiny-meta">
                    Next follow-up:{" "}
                    {audience.participants
                      .filter((participant) => participant.state !== "completed")
                      .slice(0, 3)
                      .map((participant) => participant.fullName || participant.email || participant.id)
                      .join(", ") || "No follow-up needed"}
                  </p>
                ) : null}

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
                    </>
                  );
                })()}
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
