import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Loading from "../components/Loading";
import { ErrorBanner, SuccessBanner } from "../components/Feedback";
import { toApiError } from "../lib/api";

function extractVoteRows(response) {
  const rows = response?.data?.data?.rows || response?.data?.rows || [];
  return Array.isArray(rows) ? rows : [];
}

function imageUrl(entity) {
  return entity?.image?.url || null;
}

export default function VotingPage({ api }) {
  const { electionId } = useParams();
  const [loading, setLoading] = useState(true);
  const [casting, setCasting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [votes, setVotes] = useState([]);
  const [currentVoteId, setCurrentVoteId] = useState("");

  const currentVote = votes.find((vote) => vote.id === currentVoteId) || votes[0] || null;

  async function load() {
    setLoading(true);
    setError("");

    try {
      const response = electionId
        ? await api.get(`/vote/${electionId}/next`)
        : await api.get("/vote/next/all");

      if (response.status >= 400) {
        throw toApiError(response, "Failed to load votes");
      }

      const nextVotes = extractVoteRows(response);
      setVotes(nextVotes);
      setCurrentVoteId(nextVotes[0]?.id || "");
    } catch (err) {
      setVotes([]);
      setCurrentVoteId("");
      setError(err.message || "Failed to load votes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [api, electionId]);

  async function castVote(decision) {
    if (!currentVote?.id) return;

    setCasting(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.post(`/cast/${currentVote.id}/decision`, { decision });
      if (response.status >= 400) {
        throw toApiError(response, "Failed to cast vote");
      }

      setSuccess(`Vote recorded as ${decision}.`);
      await load();
    } catch (err) {
      setError(err.message || "Failed to cast vote");
    } finally {
      setCasting(false);
    }
  }

  if (loading) return <Loading text="Loading votes..." />;

  return (
    <div className="screen-stack">
      <section className="surface-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Voting</p>
            <h2>{electionId ? "Current election vote" : "Your next votes"}</h2>
          </div>
          <button className="btn btn-tonal" onClick={load} type="button">
            Refresh
          </button>
        </div>
        <p className="subtle-copy">
          This follows the minimal app flow: fetch the next pending vote and let the user cast
          `Yes`, `No`, or `Maybe`.
        </p>
        <SuccessBanner message={success} />
        <ErrorBanner error={error} />

        {votes.length > 1 ? (
          <div className="resource-strip">
            {votes.map((vote) => (
              <button
                key={vote.id}
                className={`resource-chip${vote.id === currentVote?.id ? " resource-chip-active" : ""}`}
                onClick={() => setCurrentVoteId(vote.id)}
                type="button"
              >
                {vote.election?.name || vote.id}
              </button>
            ))}
          </div>
        ) : null}

        {!currentVote ? (
          <div className="empty-state">No pending votes are available.</div>
        ) : (
          <div className="stack-form">
            <div className="vote-panel">
              <div className="vote-section-label">Election</div>
              <div className="vote-card">
                {imageUrl(currentVote.election) ? (
                  <img
                    alt={currentVote.election?.name || "Election"}
                    className="vote-image"
                    src={imageUrl(currentVote.election)}
                  />
                ) : null}
                <div>
                  <strong>{currentVote.election?.name || "Untitled election"}</strong>
                  <p>{currentVote.election?.description || "No description provided."}</p>
                </div>
              </div>
            </div>

            <div className="vote-panel">
              <div className="vote-section-label">Your Vote</div>
              <div className="vote-card">
                {imageUrl(currentVote.item) ? (
                  <img
                    alt={currentVote.item?.name || "Vote item"}
                    className="vote-image"
                    src={imageUrl(currentVote.item)}
                  />
                ) : null}
                <div>
                  <strong>{currentVote.item?.name || "Unnamed option"}</strong>
                  <p>{currentVote.item?.description || "No description provided."}</p>
                  {currentVote.item?.location ? (
                    <p className="tiny-meta">{currentVote.item.location}</p>
                  ) : null}
                  {currentVote.item?.url ? (
                    <a className="text-link" href={currentVote.item.url} rel="noreferrer" target="_blank">
                      Open link
                    </a>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="decision-row">
              <button className="btn" disabled={casting} onClick={() => castVote("yes")} type="button">
                Yes
              </button>
              <button
                className="btn btn-secondary"
                disabled={casting}
                onClick={() => castVote("no")}
                type="button"
              >
                No
              </button>
              <button
                className="btn btn-tonal"
                disabled={casting}
                onClick={() => castVote("maybe")}
                type="button"
              >
                Maybe
              </button>
            </div>

            <div className="split-actions">
              <Link className="text-link" to="/app/home">
                Back home
              </Link>
              <span className="tiny-meta">Vote ID {currentVote.id}</span>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
