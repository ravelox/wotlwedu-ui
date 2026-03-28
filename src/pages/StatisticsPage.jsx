import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Loading from "../components/Loading";
import { ErrorBanner } from "../components/Feedback";
import { extractEntity, toApiError } from "../lib/api";

const STATUS_COLUMNS = ["Yes", "No", "Maybe", "Pending"];

function renderValue(data, key) {
  return data?.[key] ?? 0;
}

export default function StatisticsPage({ api }) {
  const { electionId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [election, setElection] = useState(null);
  const [stats, setStats] = useState(null);
  const [lookup, setLookup] = useState({});
  const [participation, setParticipation] = useState(null);
  const [audience, setAudience] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const [electionRes, statsRes, participationRes] = await Promise.all([
          api.get(`/election/${electionId}`),
          api.get(`/election/${electionId}/stats`),
          api.get(`/election/${electionId}/participation`),
        ]);
        if (electionRes.status >= 400) {
          throw toApiError(electionRes, "Failed to load election");
        }
        if (statsRes.status >= 400) {
          throw toApiError(statsRes, "Failed to load statistics");
        }
        if (!cancelled) {
          setElection(extractEntity(electionRes, "election"));
          setStats(statsRes.data?.data?.statistics || statsRes.data?.statistics || null);
          setLookup(statsRes.data?.data?.lookup || statsRes.data?.lookup || {});
          setParticipation(participationRes.data?.data?.participation || null);
          setAudience(participationRes.data?.data?.audience || null);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load statistics");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [api, electionId]);

  if (loading) return <Loading text="Loading statistics..." />;

  return (
    <div className="screen-stack">
      <section className="surface-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Statistics</p>
            <h2>{election?.name || "Poll statistics"}</h2>
          </div>
          <Link className="text-link" to={`/app/cast-vote/${electionId}`}>
            Back to vote
          </Link>
        </div>
        <ErrorBanner error={error} />
        {!stats ? (
          <div className="empty-state">No statistics available.</div>
        ) : (
          <div className="stack-form">
            {participation ? (
              <div className="surface-card">
                <div className="section-heading compact">
                  <div>
                    <p className="eyebrow">Audience</p>
                    <h3>Participation</h3>
                  </div>
                </div>
                <div className="detail-grid">
                  <div>
                    <span className="detail-label">Group</span>
                    <span>{audience?.group?.name || election?.group?.name || election?.groupId || "Not set"}</span>
                  </div>
                  <div>
                    <span className="detail-label">List</span>
                    <span>{audience?.list?.name || election?.list?.name || election?.listId || "Not set"}</span>
                  </div>
                  <div>
                    <span className="detail-label">Participants</span>
                    <span>{participation.expectedParticipants}</span>
                  </div>
                  <div>
                    <span className="detail-label">Completion</span>
                    <span>{participation.completionRate}%</span>
                  </div>
                  <div>
                    <span className="detail-label">Completed</span>
                    <span>{participation.completedCount}</span>
                  </div>
                  <div>
                    <span className="detail-label">In Progress</span>
                    <span>{participation.inProgressCount}</span>
                  </div>
                  <div>
                    <span className="detail-label">Not Started</span>
                    <span>{participation.notStartedCount}</span>
                  </div>
                  <div>
                    <span className="detail-label">Needs Follow-up</span>
                    <span>{participation.followUpCount}</span>
                  </div>
                </div>
                {audience?.participants?.length ? (
                  <div className="card-list">
                    {audience.participants.map((participant) => (
                      <article className="list-card" key={participant.id}>
                        <div>
                          <strong>{participant.fullName || participant.email || participant.id}</strong>
                          {participant.email ? <p>{participant.email}</p> : null}
                        </div>
                        <div className="chip-row">
                          <span className="chip chip-soft">{participant.state.replaceAll("_", " ")}</span>
                          <span className="chip">{participant.castVotes} cast</span>
                          <span className="chip">{participant.pendingVotes} pending</span>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
            {Object.entries(stats).map(([sheetName, entries]) => (
              <div className="stats-sheet" key={sheetName}>
                <strong>{sheetName}</strong>
                <div className="stats-grid stats-grid-head">
                  <span>&nbsp;</span>
                  {STATUS_COLUMNS.map((name) => (
                    <span key={name}>{name}</span>
                  ))}
                </div>
                {Object.entries(entries || {}).map(([rowKey, values]) => (
                  <div className="stats-grid" key={rowKey}>
                    <span>{lookup[rowKey] || rowKey}</span>
                    {STATUS_COLUMNS.map((name) => (
                      <span key={name}>{renderValue(values, name)}</span>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
