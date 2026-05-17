import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Loading from "../components/Loading";
import { ErrorBanner, SuccessBanner } from "../components/Feedback";
import { extractEntity, toApiError } from "../lib/api";
import TutorialPanel from "../components/TutorialPanel";
import { getPollTutorial } from "../lib/tutorial";
import { PollCard, PollVisual, formatPollDate, normalizePollCard } from "../components/PollCard";

const STATUS_COLUMNS = ["Yes", "No", "Maybe", "Pending"];

function renderValue(data, key) {
  return data?.[key] ?? 0;
}

function buildResultSummary(stats, lookup, itemLookup = {}) {
  const results = stats?.Results || {};
  const rows = Object.entries(results).map(([itemId, values]) => {
    const yes = Number(values?.Yes) || 0;
    const maybe = Number(values?.Maybe) || 0;
    const no = Number(values?.No) || 0;
    const pending = Number(values?.Pending) || 0;
    return {
      itemId,
      name: lookup?.[itemId] || itemId,
      yes,
      maybe,
      no,
      pending,
      score: yes * 2 + maybe,
      imageUrl: itemLookup[itemId]?.image?.url || null,
      description: itemLookup[itemId]?.description || "",
    };
  });
  const sorted = rows.sort((a, b) => b.score - a.score || b.yes - a.yes || a.name.localeCompare(b.name));
  const topScore = sorted[0]?.score ?? null;
  const winners = topScore === null ? [] : sorted.filter((row) => row.score === topScore);
  return { rows: sorted, winners, isTie: winners.length > 1 };
}

function pollStatus(election) {
  const statusName = election?.status?.name || "";
  if (statusName.toLowerCase() === "stopped") return "Closed";
  if (election?.expiration && new Date(election.expiration).getTime() < Date.now()) return "Closed";
  return statusName || "Open";
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
  const [publicShareUrl, setPublicShareUrl] = useState("");
  const [tutorial, setTutorial] = useState(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");

  async function load(cancelledRef = { current: false }) {
      setLoading(true);
      setError("");

      try {
        const [electionRes, statsRes, participationRes, publicStatsRes] = await Promise.all([
          api.get(`/poll/${electionId}`, { params: { detail: "list,group,image" } }),
          api.get(`/poll/${electionId}/stats`),
          api.get(`/poll/${electionId}/participation`),
          api.get(`/poll/${electionId}/public/stats`).catch(() => null),
        ]);
        const tutorialValue = await getPollTutorial(api);
        if (electionRes.status >= 400) {
          throw toApiError(electionRes, "Failed to load poll");
        }
        if (statsRes.status >= 400) {
          throw toApiError(statsRes, "Failed to load statistics");
        }
        if (!cancelledRef.current) {
          setElection(extractEntity(electionRes, "election"));
          setStats(statsRes.data?.data?.statistics || statsRes.data?.statistics || null);
          setLookup(statsRes.data?.data?.lookup || statsRes.data?.lookup || {});
          setParticipation(participationRes.data?.data?.participation || null);
          setAudience(participationRes.data?.data?.audience || null);
          setPublicShareUrl(publicStatsRes?.data?.data?.publicElection?.publicShareUrl || "");
          setTutorial(tutorialValue);
        }
      } catch (err) {
        if (!cancelledRef.current) setError(err.message || "Failed to load statistics");
      } finally {
        if (!cancelledRef.current) setLoading(false);
      }
    }

  useEffect(() => {
    const cancelledRef = { current: false };
    load(cancelledRef);
    return () => {
      cancelledRef.current = true;
    };
  }, [api, electionId]);

  const itemLookup = Object.fromEntries((election?.list?.items || []).map((item) => [item.id, item]));
  const enrichedResultSummary = buildResultSummary(stats, lookup, itemLookup);
  const completionLabel = participation
    ? `${participation.completedCount}/${participation.expectedParticipants} done (${participation.completionRate}%)`
    : "Participation unavailable";

  async function closePoll() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await api.post(`/poll/${electionId}/stop`);
      if (response.status >= 400) throw toApiError(response, "Failed to close poll");
      setSuccess("Poll closed.");
      await load();
    } catch (err) {
      setError(err.message || "Failed to close poll");
    } finally {
      setSaving(false);
    }
  }

  async function copySummary() {
    const winnerText = enrichedResultSummary.winners.length
      ? enrichedResultSummary.isTie
        ? `Tie: ${enrichedResultSummary.winners.map((row) => row.name).join(", ")}`
        : `Winner: ${enrichedResultSummary.winners[0].name}`
      : "No winner yet";
    const lines = [
      `${election?.name || "Poll"} results`,
      winnerText,
      completionLabel,
      publicShareUrl ? `Share: ${publicShareUrl}` : "",
    ].filter(Boolean);
    await navigator.clipboard?.writeText(lines.join("\n"));
    setSuccess("Summary copied.");
  }

  if (loading) return <Loading text="Loading statistics..." />;

  return (
    <div className="screen-stack">
      {tutorial ? <TutorialPanel tutorial={tutorial} compact title="Poll tutorial" /> : null}
      <section className="surface-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Results</p>
            <h2>{election?.name || "Poll results"}</h2>
          </div>
          <div className="split-actions wrap-actions">
            <Link className="text-link" to={`/app/cast-vote/${electionId}`}>
              Vote
            </Link>
            <button className="btn btn-tonal" disabled={saving} onClick={copySummary} type="button">
              Copy Summary
            </button>
            {pollStatus(election) !== "Closed" ? (
              <button className="btn btn-danger" disabled={saving} onClick={closePoll} type="button">
                {saving ? "Closing..." : "Decide Now"}
              </button>
            ) : null}
          </div>
        </div>
        <ErrorBanner error={error} />
        <SuccessBanner message={success} />
        {!stats ? (
          <div className="empty-state">Results are not ready yet.</div>
        ) : (
          <div className="stack-form">
            <PollCard
              poll={election}
              card={normalizePollCard(election, {
                participantCount: participation?.expectedParticipants,
                completionRate: participation?.completionRate,
                winner: enrichedResultSummary.winners[0],
                action: {
                  label: pollStatus(election) === "Closed" ? "Review Votes" : "Vote",
                  href: `/app/cast-vote/${electionId}`,
                },
              })}
              tone={pollStatus(election) === "Closed" ? "default" : "urgent"}
              meta={(
                <div className="poll-card-meta-grid">
                  <span>
                    <strong>{audience?.group?.name || election?.group?.name || "No circle selected"}</strong>
                    <small>circle</small>
                  </span>
                  <span>
                    <strong>{audience?.list?.name || election?.list?.name || "No idea list selected"}</strong>
                    <small>idea list</small>
                  </span>
                  <span>
                    <strong>{formatPollDate(election?.expiration)}</strong>
                    <small>deadline</small>
                  </span>
                  <span>
                    <strong>
                      {enrichedResultSummary.winners.length
                        ? enrichedResultSummary.winners.map((row) => row.name).join(", ")
                        : "No winner yet"}
                    </strong>
                    <small>{enrichedResultSummary.isTie ? "tie" : "top result"}</small>
                  </span>
                </div>
              )}
            />
            <div className="result-summary">
              <div>
                <span className="detail-label">Status</span>
                <strong>{pollStatus(election)}</strong>
              </div>
              <div>
                <span className="detail-label">{enrichedResultSummary.isTie ? "Tie" : "Winner"}</span>
                <strong>
                  {enrichedResultSummary.winners.length
                    ? enrichedResultSummary.winners.map((row) => row.name).join(", ")
                    : "No winner yet"}
                </strong>
              </div>
              <div>
                <span className="detail-label">Completion</span>
                <strong>{completionLabel}</strong>
              </div>
              <div>
                <span className="detail-label">Share</span>
                <strong>{publicShareUrl || "Private poll"}</strong>
              </div>
            </div>
            {enrichedResultSummary.rows.length ? (
              <div className="stats-sheet">
                <strong>Ranked results</strong>
                <div className="visual-result-list">
                  {enrichedResultSummary.rows.map((row, index) => (
                    <article className="visual-result-card" key={row.itemId}>
                      <PollVisual
                        card={{ name: row.name, imageUrl: row.imageUrl }}
                        className="visual-result-image"
                      />
                      <div className="visual-result-body">
                        <div className="split-heading compact">
                          <div>
                            <span className="detail-label">#{index + 1}</span>
                            <strong>{row.name}</strong>
                          </div>
                          {enrichedResultSummary.winners.some((winner) => winner.itemId === row.itemId) ? (
                            <span className="chip">Winner</span>
                          ) : null}
                        </div>
                        {row.description ? <p>{row.description}</p> : null}
                        <div className="result-vote-bars">
                          <span style={{ "--bar-size": `${Math.min(row.yes * 20, 100)}%` }}>
                            <strong>{row.yes}</strong> yes
                          </span>
                          <span style={{ "--bar-size": `${Math.min(row.maybe * 20, 100)}%` }}>
                            <strong>{row.maybe}</strong> maybe
                          </span>
                          <span style={{ "--bar-size": `${Math.min(row.no * 20, 100)}%` }}>
                            <strong>{row.no}</strong> no
                          </span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}
            {participation ? (
              <div className="result-panel">
                <div className="section-heading compact">
                  <div>
                    <p className="eyebrow">Circle</p>
                    <h3>Participation</h3>
                  </div>
                </div>
                <div className="detail-grid">
                  <div>
                    <span className="detail-label">Circle</span>
                    <span>{audience?.group?.name || election?.group?.name || "No circle selected"}</span>
                  </div>
                  <div>
                    <span className="detail-label">List</span>
                    <span>{audience?.list?.name || election?.list?.name || "No idea list selected"}</span>
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
