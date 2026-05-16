import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import Loading from "../components/Loading";
import { ErrorBanner, SuccessBanner } from "../components/Feedback";
import { toApiError } from "../lib/api";

const SESSION_PREFIX = "wotlwedu_public_poll_session:";
const DECISIONS = [
  { value: "yes", label: "Yes" },
  { value: "maybe", label: "Maybe" },
  { value: "no", label: "No" },
];

function getStoredSession(token) {
  try {
    const raw = localStorage.getItem(`${SESSION_PREFIX}${token}`);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed?.sessionToken) return null;
    if (parsed.expiresAt && new Date(parsed.expiresAt).getTime() <= Date.now()) {
      localStorage.removeItem(`${SESSION_PREFIX}${token}`);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function storeSession(token, session) {
  localStorage.setItem(`${SESSION_PREFIX}${token}`, JSON.stringify(session));
}

function clearStoredSession(token) {
  localStorage.removeItem(`${SESSION_PREFIX}${token}`);
}

function formatDate(value) {
  if (!value) return "No expiration";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No expiration";
  return date.toLocaleString();
}

function isExpired(value) {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.getTime() <= Date.now();
}

export default function PublicPollPage({ api, appVersion }) {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("invite") || "";
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [voting, setVoting] = useState("");
  const [reporting, setReporting] = useState(false);
  const [poll, setPoll] = useState(null);
  const [session, setSession] = useState(() => getStoredSession(token));
  const [votes, setVotes] = useState({});
  const [displayName, setDisplayName] = useState("");
  const [reportReason, setReportReason] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canVote = poll?.canGuestVote === true && !isExpired(poll?.expiration);
  const items = useMemo(() => poll?.list?.items || [], [poll]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await api.get(`/public/poll/${token}`);
        if (response.status >= 400) throw toApiError(response, "Failed to load public poll");
        if (!cancelled) setPoll(response.data?.data?.election || null);
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load public poll");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [api, token]);

  useEffect(() => {
    const stored = getStoredSession(token);
    setSession(stored);
  }, [token]);

  async function startSession(event) {
    event.preventDefault();
    setStarting(true);
    setError("");
    setSuccess("");
    try {
      const response = await api.post(`/public/poll/${token}/session`, {
        displayName,
        inviteToken: inviteToken || undefined,
      });
      if (response.status >= 400) throw toApiError(response, "Failed to start guest session");
      const nextSession = {
        sessionToken: response.data?.data?.sessionToken,
        participantId: response.data?.data?.participantId,
        consentState: response.data?.data?.consentState,
        expiresAt: response.data?.data?.expiresAt,
      };
      storeSession(token, nextSession);
      setSession(nextSession);
      setSuccess("You're ready to vote.");
    } catch (err) {
      setError(err.message || "Failed to start guest session");
    } finally {
      setStarting(false);
    }
  }

  async function castVote(itemId, decision) {
    if (!session?.sessionToken) return;
    setVoting(`${itemId}:${decision}`);
    setError("");
    setSuccess("");
    try {
      const response = await api.post(`/public/poll/${token}/vote`, {
        sessionToken: session.sessionToken,
        itemId,
        decision,
      });
      if (response.status >= 400) throw toApiError(response, "Failed to save vote");
      setVotes((current) => ({ ...current, [itemId]: decision }));
      const expiresAt = response.data?.data?.vote?.expiresAt || session.expiresAt;
      const nextSession = { ...session, expiresAt };
      storeSession(token, nextSession);
      setSession(nextSession);
      setSuccess("Vote saved.");
    } catch (err) {
      if (/expired/i.test(err.message || "")) {
        clearStoredSession(token);
        setSession(null);
      }
      setError(err.message || "Failed to save vote");
    } finally {
      setVoting("");
    }
  }

  async function reportPoll(event) {
    event.preventDefault();
    setReporting(true);
    setError("");
    setSuccess("");
    try {
      const response = await api.post(`/public/poll/${token}/report`, {
        reason: reportReason || "reported",
      });
      if (response.status >= 400) throw toApiError(response, "Failed to report poll");
      setReportReason("");
      setSuccess("Report sent. Thanks for helping keep public polls healthy.");
    } catch (err) {
      setError(err.message || "Failed to report poll");
    } finally {
      setReporting(false);
    }
  }

  if (loading) {
    return (
      <main className="public-poll-shell">
        <Loading text="Loading public poll..." />
      </main>
    );
  }

  return (
    <main className="public-poll-shell">
      <section className="public-poll-layout">
        <div className="public-poll-main">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Public poll</p>
              <h1>{poll?.name || "Public poll"}</h1>
            </div>
            <Link className="text-link" to="/login">
              Sign in
            </Link>
          </div>
          <ErrorBanner error={error} />
          <SuccessBanner message={success} />
          {poll?.description ? <p className="public-poll-copy">{poll.description}</p> : null}
          <div className="detail-grid">
            <div>
              <span className="detail-label">Status</span>
              <span>{poll?.publicContext?.statusLabel || "Open"}</span>
            </div>
            <div>
              <span className="detail-label">Closes</span>
              <span>{formatDate(poll?.expiration)}</span>
            </div>
            <div>
              <span className="detail-label">Privacy</span>
              <span>Anyone with this link can view this poll.</span>
            </div>
            <div>
              <span className="detail-label">Guest voting</span>
              <span>{canVote ? "Enabled" : "Not available"}</span>
            </div>
          </div>

          {!poll ? (
            <div className="empty-state">This public poll could not be loaded.</div>
          ) : !items.length ? (
            <div className="empty-state">This poll does not have ideas available yet.</div>
          ) : (
            <div className="public-idea-grid">
              {items.map((item) => (
                <article className="public-idea-card" key={item.id}>
                  {item.image?.url ? (
                    <img className="public-idea-image" src={item.image.url} alt="" />
                  ) : null}
                  <div>
                    <strong>{item.name || "Untitled idea"}</strong>
                    {item.description ? <p>{item.description}</p> : null}
                    {item.location ? <span className="chip">{item.location}</span> : null}
                    {item.url ? (
                      <a className="text-link" href={item.url} rel="noreferrer" target="_blank">
                        Open link
                      </a>
                    ) : null}
                  </div>
                  {canVote && session?.sessionToken ? (
                    <div className="decision-row">
                      {DECISIONS.map((decision) => (
                        <button
                          className={`btn ${votes[item.id] === decision.value ? "" : "btn-tonal"}`}
                          disabled={Boolean(voting)}
                          key={decision.value}
                          onClick={() => castVote(item.id, decision.value)}
                          type="button"
                        >
                          {voting === `${item.id}:${decision.value}` ? "Saving..." : decision.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </div>

        <aside className="public-poll-side">
          {canVote ? (
            session?.sessionToken ? (
              <section className="surface-card">
                <p className="eyebrow">Guest session</p>
                <h2>Vote as guest</h2>
                <p>Your progress is stored on this device until {formatDate(session.expiresAt)}.</p>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    clearStoredSession(token);
                    setSession(null);
                    setVotes({});
                  }}
                  type="button"
                >
                  Restart Session
                </button>
              </section>
            ) : (
              <section className="surface-card">
                <p className="eyebrow">Join</p>
                <h2>Start voting</h2>
                <form className="stack-form" onSubmit={startSession}>
                  <label className="field">
                    <span>Name</span>
                    <input
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                      placeholder="Optional"
                    />
                  </label>
                  <button className="btn" disabled={starting} type="submit">
                    {starting ? "Starting..." : "Start Guest Session"}
                  </button>
                  <p className="tiny-meta">
                    By starting a guest session, you agree to the{" "}
                    <Link className="text-link" to="/terms">Terms</Link> and{" "}
                    <Link className="text-link" to="/privacy">Privacy Policy</Link>. Wotlwedu
                    stores your display name if provided, invite status, votes, and abuse signals
                    so this poll can count responses and stay healthy.
                  </p>
                </form>
              </section>
            )
          ) : (
            <section className="surface-card">
              <p className="eyebrow">Voting</p>
              <h2>Voting is closed</h2>
              <p>This link can be viewed, but guest voting is not currently available.</p>
            </section>
          )}

          <section className="surface-card">
            <p className="eyebrow">Report</p>
            <h2>Something wrong?</h2>
            <p className="tiny-meta">
              Reports are reviewed under the <Link className="text-link" to="/abuse">Abuse Policy</Link>.
            </p>
            <form className="stack-form" onSubmit={reportPoll}>
              <label className="field">
                <span>Reason</span>
                <textarea
                  rows="3"
                  value={reportReason}
                  onChange={(event) => setReportReason(event.target.value)}
                  placeholder="Spam, abusive content, or another concern"
                />
              </label>
              <button className="btn btn-secondary" disabled={reporting || !poll?.reportable} type="submit">
                {reporting ? "Sending..." : "Report Poll"}
              </button>
            </form>
          </section>
          <p className="tiny-meta">wotlwedu {appVersion}</p>
        </aside>
      </section>
    </main>
  );
}
