import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Loading from "../components/Loading";
import { ErrorBanner } from "../components/Feedback";
import EmptyState from "../components/EmptyState";
import { extractCollection, toApiError } from "../lib/api";
import { PollCard, formatPollDate, normalizePollCard } from "../components/PollCard";

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
      const response = await api.get("/poll", {
        params: {
          page: 1,
          items: 50,
          workgroupId: activeWorkgroupId || undefined,
          detail: "list,group,image",
        },
      });

      if (response.status >= 400) throw toApiError(response, "Failed to load polls");
      const nextElections = extractCollection(response, "elections");
      setElections(nextElections);
      const summaries = await Promise.all(
        nextElections.map(async (election) => {
          try {
            const summaryRes = await api.get(`/poll/${election.id}/participation`);
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
            <Link className="text-link" to="/app/create-poll">
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
            <EmptyState
              title="No polls here yet."
              copy="Create one for this space and it will show up here with progress, people, and a quick way back in."
              action={(
                <Link className="btn btn-secondary" to="/app/create-poll">
                  Create Poll
                </Link>
              )}
            />
          ) : (
            elections.map((election) => {
              const summary = participationByElectionId[election.id];
              const participation = summary?.participation;
              const audience = summary?.audience;
              const participantsWaiting = audience?.participants
                ?.filter((participant) => participant.state !== "completed")
                .slice(0, 3)
                .map((participant) => participant.fullName || participant.email || participant.id)
                .join(", ");
              const card = normalizePollCard(election, {
                participantCount: participation?.expectedParticipants,
                completionRate: participation?.completionRate,
                action: {
                  label: participation?.completionRate >= 100 ? "View Results" : "Vote",
                  href: participation?.completionRate >= 100
                    ? `/app/statistics/${election.id}`
                    : `/app/cast-vote/${election.id}`,
                },
              });

              return (
                <PollCard
                  card={card}
                  key={election.id}
                  meta={(
                    <div className="poll-card-meta-grid">
                      <span>
                        <strong>{formatPollDate(election.expiration)}</strong>
                        <small>deadline</small>
                      </span>
                      <span>
                        <strong>{audience?.group?.name || election.group?.name || "No circle selected"}</strong>
                        <small>circle</small>
                      </span>
                      <span>
                        <strong>{audience?.list?.name || election.list?.name || "No idea list selected"}</strong>
                        <small>ideas</small>
                      </span>
                      <span>
                        <strong>{participantsWaiting || "No follow-up needed"}</strong>
                        <small>waiting on</small>
                      </span>
                    </div>
                  )}
                />
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
