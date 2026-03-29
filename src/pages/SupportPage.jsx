import { useEffect, useState } from "react";
import { ErrorBanner, SuccessBanner } from "../components/Feedback";
import { extractCollection, extractEntity, toApiError } from "../lib/api";
import { adminEnablePollTutorial } from "../lib/tutorial";

function formatAuditMessage(audit) {
  if (!audit) return "Unknown activity";
  return audit.message || `${audit.eventType || "activity"} ${audit.provider || ""}`.trim();
}

function formatMethodLabel(method) {
  if (!method) return "Unknown";
  return `${method.provider || "provider"}${method.email ? ` • ${method.email}` : ""}`;
}

function chipClass(outcome) {
  const normalized = String(outcome || "unknown").toLowerCase();
  if (normalized === "success") return "chip audit-chip-success";
  if (normalized === "pending") return "chip audit-chip-pending";
  if (["blocked", "error", "failed"].includes(normalized)) {
    return "chip audit-chip-blocked";
  }
  return "chip";
}

export default function SupportPage({ api, session }) {
  const [organizationId, setOrganizationId] = useState(session?.organizationId || "");
  const [days, setDays] = useState(7);
  const [eventType, setEventType] = useState("");
  const [outcome, setOutcome] = useState("");
  const [provider, setProvider] = useState("");
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [overview, setOverview] = useState(null);
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedMethods, setSelectedMethods] = useState({
    passwordEnabled: false,
    linkedProviders: [],
  });
  const [selectedAudits, setSelectedAudits] = useState([]);
  const [selectedTutorial, setSelectedTutorial] = useState(null);
  const [inspectingUser, setInspectingUser] = useState(false);
  const [updatingTutorial, setUpdatingTutorial] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canAccessSupport =
    session?.systemAdmin === true || session?.organizationAdmin === true;

  const scopeParams = {
    ...(session?.systemAdmin === true
      ? organizationId.trim()
        ? { organizationId: organizationId.trim() }
        : {}
      : session?.organizationId
        ? { organizationId: session.organizationId }
        : {}),
  };

  async function loadSupportData() {
    if (!canAccessSupport) return;
    setLoading(true);
    setError("");

    try {
      const params = {
        ...scopeParams,
        days,
        ...(eventType.trim() ? { eventType: eventType.trim() } : {}),
        ...(outcome.trim() ? { outcome: outcome.trim() } : {}),
        ...(provider.trim() ? { provider: provider.trim() } : {}),
        ...(email.trim() ? { email: email.trim() } : {}),
        ...(userId.trim() ? { userId: userId.trim() } : {}),
      };

      const [overviewResponse, auditResponse] = await Promise.all([
        api.get("/support/auth/overview", { params }),
        api.get("/support/auth/audit", { params: { ...params, items: 25, page: 1 } }),
      ]);

      if (overviewResponse.status >= 400) {
        throw toApiError(overviewResponse, "Failed to load support overview");
      }
      if (auditResponse.status >= 400) {
        throw toApiError(auditResponse, "Failed to load support audit feed");
      }

      setOverview(extractEntity(overviewResponse, "data") || overviewResponse.data?.data || null);
      setAudits(extractCollection(auditResponse, "audits"));
    } catch (err) {
      setError(err.message || "Failed to load support data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSupportData().catch(() => {});
  }, [
    session?.organizationId,
    session?.systemAdmin,
    days,
    eventType,
    outcome,
    provider,
    email,
    userId,
    organizationId,
  ]);

  async function searchUsers(event) {
    event.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSelectedUser(null);
      setSelectedMethods({ passwordEnabled: false, linkedProviders: [] });
      setSelectedAudits([]);
      setSelectedTutorial(null);
      return;
    }

    setError("");
    setSuccess("");

    try {
      const response = await api.get("/user", {
        params: { page: 1, items: 25, filter: searchQuery.trim() },
      });
      if (response.status >= 400) {
        throw toApiError(response, "Failed to search users");
      }
      const users = extractCollection(response, "users");
      setSearchResults(Array.isArray(users) ? users : []);
      if (!users.length) {
        setSuccess("No users matched the current search.");
      }
    } catch (err) {
      setError(err.message || "Failed to search users");
    }
  }

  async function inspectUser(user) {
    if (!user?.id) return;
    setInspectingUser(true);
    setSelectedUser(user);
    setSelectedTutorial(null);
    setError("");

    try {
      const [methodsResponse, auditsResponse] = await Promise.all([
        api.get(`/user/${user.id}/signin-method`),
        api.get(`/user/${user.id}/authaudit`, { params: { items: 20 } }),
      ]);
      if (methodsResponse.status >= 400) {
        throw toApiError(methodsResponse, "Failed to load sign-in methods");
      }
      if (auditsResponse.status >= 400) {
        throw toApiError(auditsResponse, "Failed to load user audit activity");
      }
      setSelectedMethods(extractEntity(methodsResponse, "methods") || {
        passwordEnabled: false,
        linkedProviders: [],
      });
      setSelectedAudits(extractCollection(auditsResponse, "audits"));
    } catch (err) {
      setError(err.message || "Failed to inspect user");
    } finally {
      setInspectingUser(false);
    }
  }

  async function handleEnableSelectedUserTutorial(options = {}) {
    if (!selectedUser?.id) return;
    setUpdatingTutorial(true);
    setError("");
    setSuccess("");
    try {
      const tutorial = await adminEnablePollTutorial(api, selectedUser.id, options);
      setSelectedTutorial(tutorial);
      setSuccess(
        options.restart === true
          ? "Tutorial restarted for the selected user."
          : "Tutorial re-enabled for the selected user."
      );
    } catch (err) {
      setError(err.message || "Failed to update tutorial");
    } finally {
      setUpdatingTutorial(false);
    }
  }

  if (!canAccessSupport) {
    return (
      <div className="screen-stack">
        <section className="surface-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Support</p>
              <h3>Support console</h3>
            </div>
          </div>
          <ErrorBanner error="Organization admin or system admin access required." />
        </section>
      </div>
    );
  }

  return (
    <div className="screen-stack">
      <section className="hero-card">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">Support</p>
            <h2>Auth observability console</h2>
            <p className="subtle-copy">
              Review overview metrics, trace audit activity, and inspect individual sign-in setups
              without leaving the main UI.
            </p>
          </div>
        </div>
        <ErrorBanner error={error} />
        <SuccessBanner message={success} />
        <div className="support-filter-grid">
          {session?.systemAdmin === true ? (
            <label className="field">
              <span>Organization ID</span>
              <input value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} />
            </label>
          ) : null}
          <label className="field">
            <span>Window (days)</span>
            <input
              type="number"
              min={1}
              max={30}
              value={days}
              onChange={(event) => setDays(Number(event.target.value) || 7)}
            />
          </label>
          <label className="field">
            <span>Event Type</span>
            <input value={eventType} onChange={(event) => setEventType(event.target.value)} />
          </label>
          <label className="field">
            <span>Outcome</span>
            <input value={outcome} onChange={(event) => setOutcome(event.target.value)} />
          </label>
          <label className="field">
            <span>Provider</span>
            <input value={provider} onChange={(event) => setProvider(event.target.value)} />
          </label>
          <label className="field">
            <span>Email</span>
            <input value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label className="field">
            <span>User ID</span>
            <input value={userId} onChange={(event) => setUserId(event.target.value)} />
          </label>
        </div>
      </section>

      <section className="surface-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Metrics</p>
            <h3>Observability snapshot</h3>
          </div>
        </div>
        {loading ? (
          <div className="loading">Loading support overview...</div>
        ) : (
          <div className="support-metric-grid">
            <article className="metric-card">
              <span className="tiny-meta">Total events</span>
              <strong>{overview?.totals?.totalEvents ?? 0}</strong>
            </article>
            <article className="metric-card">
              <span className="tiny-meta">Success</span>
              <strong>{overview?.totals?.successCount ?? 0}</strong>
            </article>
            <article className="metric-card">
              <span className="tiny-meta">Non-success</span>
              <strong>{overview?.totals?.nonSuccessCount ?? 0}</strong>
            </article>
            <article className="metric-card">
              <span className="tiny-meta">Unique actors</span>
              <strong>{overview?.totals?.uniqueActors ?? 0}</strong>
            </article>
          </div>
        )}
        {!!overview && (
          <>
            <div className="section-heading" style={{ marginTop: 20 }}>
              <div>
                <p className="eyebrow">Breakdown</p>
                <h3>Top event signals</h3>
              </div>
            </div>
            <div className="record-stack">
              {[["Event Types", overview.eventTypes], ["Outcomes", overview.outcomes], ["Providers", overview.providers]].map(
                ([label, rows]) => (
                  <div className="record-card" key={label}>
                    <div className="split-heading">
                      <strong>{label}</strong>
                      <span className="chip">{Array.isArray(rows) ? rows.length : 0}</span>
                    </div>
                    <div className="support-meta">
                      {(rows || []).slice(0, 8).map((row) => (
                        <span className="chip" key={`${label}-${row.key}`}>
                          {row.key}: {row.count}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
          </>
        )}
      </section>

      <section className="surface-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Failures</p>
            <h3>Recent non-success events</h3>
          </div>
        </div>
        <div className="record-stack">
          {(overview?.recentFailures || []).length ? (
            overview.recentFailures.map((audit) => (
              <div className="record-card" key={audit.id}>
                <div className="split-heading">
                  <strong>{audit.eventType || "Activity"}</strong>
                  <span className={chipClass(audit.outcome)}>{audit.outcome || "unknown"}</span>
                </div>
                <p>{formatAuditMessage(audit)}</p>
                <p className="tiny-meta">
                  {audit.createdAt ? new Date(audit.createdAt).toLocaleString() : "Unknown"}
                </p>
              </div>
            ))
          ) : (
            <div className="empty-state">No recent non-success events.</div>
          )}
        </div>
      </section>

      <section className="surface-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Audit</p>
            <h3>Support audit feed</h3>
          </div>
        </div>
        <div className="record-stack">
          {audits.length ? (
            audits.map((audit) => (
              <div className="record-card" key={audit.id}>
                <div className="split-heading">
                  <strong>{audit.eventType || "Activity"}</strong>
                  <span className={chipClass(audit.outcome)}>{audit.outcome || "unknown"}</span>
                </div>
                <p>{formatAuditMessage(audit)}</p>
                <div className="support-meta">
                  {audit.email ? <span className="chip">{audit.email}</span> : null}
                  {audit.provider ? <span className="chip">{audit.provider}</span> : null}
                  {audit.organizationId ? <span className="chip">{audit.organizationId}</span> : null}
                </div>
                <p className="tiny-meta">
                  {audit.createdAt ? new Date(audit.createdAt).toLocaleString() : "Unknown"}
                </p>
              </div>
            ))
          ) : (
            <div className="empty-state">No audit events matched the current filter.</div>
          )}
        </div>
      </section>

      <section className="surface-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Investigation</p>
            <h3>User lookup</h3>
          </div>
        </div>
        <form className="support-search-grid" onSubmit={searchUsers}>
          <label className="field field-full">
            <span>User Search</span>
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Name, alias, or email"
            />
          </label>
          <button className="btn" type="submit">
            Search Users
          </button>
        </form>

        <div className="record-stack" style={{ marginTop: 14 }}>
          {searchResults.map((user) => (
            <div className="record-card" key={user.id}>
              <div className="split-heading">
                <div>
                  <strong>{user.fullName || user.alias || user.email || user.id}</strong>
                  <p className="tiny-meta">{user.email || user.id}</p>
                </div>
                <button className="btn btn-secondary" onClick={() => inspectUser(user)} type="button">
                  Inspect
                </button>
              </div>
            </div>
          ))}
        </div>

        {selectedUser ? (
          <div className="record-stack" style={{ marginTop: 18 }}>
            <div className="record-card">
              <div className="split-heading">
                <strong>{selectedUser.fullName || selectedUser.alias || selectedUser.email}</strong>
                <span className="chip">{inspectingUser ? "Loading..." : "Selected"}</span>
              </div>
              <p>{selectedUser.email || selectedUser.id}</p>
              <div className="support-meta">
                <span className="chip">
                  Password {selectedMethods.passwordEnabled ? "Enabled" : "Disabled"}
                </span>
                {(selectedMethods.linkedProviders || []).map((method) => (
                  <span className="chip" key={method.id}>
                    {formatMethodLabel(method)}
                  </span>
                ))}
              </div>
              <div className="split-actions" style={{ marginTop: 12 }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleEnableSelectedUserTutorial({})}
                  type="button"
                  disabled={updatingTutorial}
                >
                  {updatingTutorial ? "Updating..." : "Re-enable Tutorial"}
                </button>
                <button
                  className="btn btn-tonal"
                  onClick={() => handleEnableSelectedUserTutorial({ restart: true })}
                  type="button"
                  disabled={updatingTutorial}
                >
                  Restart Tutorial
                </button>
              </div>
              {selectedTutorial ? (
                <div className="support-meta" style={{ marginTop: 10 }}>
                  <span className="chip">Status: {selectedTutorial.status || "unknown"}</span>
                  {selectedTutorial.nextStepKey ? (
                    <span className="chip">Next: {selectedTutorial.nextStepKey}</span>
                  ) : null}
                  {selectedTutorial.startedAt ? (
                    <span className="chip">
                      Started: {new Date(selectedTutorial.startedAt).toLocaleString()}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>

            {selectedAudits.length ? (
              selectedAudits.map((audit) => (
                <div className="record-card" key={audit.id}>
                  <div className="split-heading">
                    <strong>{audit.eventType || "Activity"}</strong>
                    <span className={chipClass(audit.outcome)}>{audit.outcome || "unknown"}</span>
                  </div>
                  <p>{formatAuditMessage(audit)}</p>
                  <p className="tiny-meta">
                    {audit.createdAt ? new Date(audit.createdAt).toLocaleString() : "Unknown"}
                  </p>
                </div>
              ))
            ) : (
              <div className="empty-state">
                {inspectingUser ? "Loading selected user activity..." : "No recent audit activity for this user."}
              </div>
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}
