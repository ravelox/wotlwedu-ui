import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ErrorBanner, SuccessBanner } from "../components/Feedback";
import { extractCollection, extractEntity, toApiError } from "../lib/api";

export default function ProfilePage({
  api,
  session,
  activeWorkgroupId,
  onLogout,
  onSessionRefresh,
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [form, setForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    alias: "",
    enable2fa: false,
  });
  const [resetPassword, setResetPassword] = useState(false);
  const [setup2fa, setSetup2fa] = useState(null);
  const [totp, setTotp] = useState("");
  const [organization, setOrganization] = useState(null);
  const [organizationMembership, setOrganizationMembership] = useState({
    members: [],
    workgroups: [],
    pendingInviteCount: 0,
  });
  const [inviteEmail, setInviteEmail] = useState("");
  const [organizationInvites, setOrganizationInvites] = useState([]);
  const [pendingInvite, setPendingInvite] = useState(null);
  const [signInMethods, setSignInMethods] = useState({
    passwordEnabled: false,
    linkedProviders: [],
  });
  const [userAudits, setUserAudits] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [inviteFilter, setInviteFilter] = useState("all");
  const [privacyLoading, setPrivacyLoading] = useState(false);
  const [deletionReason, setDeletionReason] = useState("");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const activeWorkgroupName =
    organizationMembership.workgroups.find((workgroup) => workgroup.id === activeWorkgroupId)?.name ||
    null;

  async function loadProfile() {
    const requests = [
      api.get(`/person/${session?.userId}`),
      api.get(`/person/${session?.userId}/signin-method`),
      api.get(`/person/${session?.userId}/authaudit`, { params: { items: 10 } }),
      api.get("/login/session"),
    ];
    const canManageOrganization =
      session?.organizationId && (session?.organizationAdmin || session?.systemAdmin);

    if (canManageOrganization) {
      requests.push(api.get(`/organization/${session.organizationId}`));
      requests.push(api.get(`/organization/${session.organizationId}/membership`));
      requests.push(
        api.get(`/organization/${session.organizationId}/invite`, {
          params: inviteFilter === "all" ? undefined : { status: inviteFilter },
        })
      );
    } else if (session?.organizationId) {
      requests.push(api.get(`/organization/${session.organizationId}`));
      requests.push(api.get(`/organization/${session.organizationId}/membership`));
    }

    const [
      userResponse,
      signInResponse,
      userAuditResponse,
      sessionResponse,
      organizationResponse,
      membershipResponse,
      inviteResponse,
    ] = await Promise.all(requests);
    if (userResponse.status >= 400) {
      throw toApiError(userResponse, "Failed to load profile");
    }
    if (signInResponse.status >= 400) {
      throw toApiError(signInResponse, "Failed to load sign-in methods");
    }
    if (userAuditResponse.status >= 400) {
      throw toApiError(userAuditResponse, "Failed to load audit history");
    }
    if (sessionResponse.status >= 400) {
      throw toApiError(sessionResponse, "Failed to load sessions");
    }

    const user = extractEntity(userResponse, "user");
    setCurrentUser(user);
    setSignInMethods(extractEntity(signInResponse, "methods") || {
      passwordEnabled: false,
      linkedProviders: [],
    });
    setUserAudits(extractCollection(userAuditResponse, "audits"));
    setSessions(extractCollection(sessionResponse, "sessions"));
    setForm({
      email: user?.email || "",
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      alias: user?.alias || "",
      enable2fa: user?.enable2fa === true,
    });

    if (organizationResponse) {
      if (organizationResponse.status >= 400) {
        throw toApiError(organizationResponse, "Failed to load organization");
      }
      setOrganization(extractEntity(organizationResponse, "organization"));
    } else {
      setOrganization(null);
    }

    if (membershipResponse) {
      if (membershipResponse.status >= 400) {
        throw toApiError(membershipResponse, "Failed to load organization membership");
      }
      setOrganizationMembership(
        membershipResponse.data?.data?.membership || {
          members: [],
          workgroups: [],
          pendingInviteCount: 0,
        }
      );
    } else {
      setOrganizationMembership({ members: [], workgroups: [], pendingInviteCount: 0 });
    }

    if (inviteResponse) {
      if (inviteResponse.status >= 400) {
        throw toApiError(inviteResponse, "Failed to load organization invites");
      }
      setOrganizationInvites(extractCollection(inviteResponse, "invites"));
    } else {
      setOrganizationInvites([]);
    }

  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        await loadProfile();
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load profile");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (session?.userId) {
      load();
    } else {
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [api, inviteFilter, session?.userId]);

  useEffect(() => {
    const inviteToken = new URLSearchParams(window.location.search).get("invite") || "";
    if (!inviteToken || !session?.authToken) {
      setPendingInvite(null);
      return;
    }

    let cancelled = false;
    async function loadInvite() {
      try {
        const response = await api.get(`/login/invite/${encodeURIComponent(inviteToken)}`);
        if (response.status >= 400) {
          throw toApiError(response, "Invite not found");
        }
        if (!cancelled) {
          setPendingInvite(response.data?.data?.invite || response.data?.invite || null);
        }
      } catch (err) {
        if (!cancelled) {
          setPendingInvite(null);
          setError(err.message || "Invite not found");
        }
      }
    }

    loadInvite();
    return () => {
      cancelled = true;
    };
  }, [api, session?.authToken]);

  function inviteStatusLabel(status) {
    if (status === "pending") return "Pending";
    if (status === "accepted") return "Accepted";
    if (status === "revoked") return "Revoked";
    if (status === "expired") return "Expired";
    return "Unknown";
  }

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function formatAudit(audit) {
    const who = audit?.email || audit?.provider || "Event";
    const detail = audit?.message || audit?.eventType || "Activity";
    return `${who}: ${detail}`;
  }

  function formatDate(value) {
    return value ? new Date(value).toLocaleString() : "Unknown";
  }

  function clearInviteQuery() {
    const url = new URL(window.location.href);
    url.searchParams.delete("invite");
    window.history.replaceState({}, "", `${url.pathname}${url.search}`);
  }

  async function submitProfile(event) {
    event.preventDefault();
    setSaving(true);
    setSuccess("");
    setError("");

    try {
      const response = await api.put(`/person/${session.userId}`, {
        email: form.email,
        firstName: form.firstName,
        lastName: form.lastName,
        alias: form.alias,
        enable2fa: form.enable2fa,
      });
      if (response.status >= 400) {
        throw toApiError(response, "Failed to update profile");
      }

      if (resetPassword) {
        const passwordRes = await api.post("/login/resetreq", { email: form.email });
        if (passwordRes.status >= 400) {
          throw toApiError(passwordRes, "Failed to request password reset");
        }
      }

      if (response.data?.data?.emailChange === true) {
        setSuccess("Email changed. Sign in again after confirming the new address.");
        onLogout();
        return;
      }

      setSuccess(
        resetPassword
          ? "Profile saved and password reset email sent."
          : "Profile saved."
      );
      setResetPassword(false);
      await loadProfile();
    } catch (err) {
      setError(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  function downloadJson(filename, payload) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  async function exportAccountData() {
    if (!session?.userId) return;
    setPrivacyLoading(true);
    setError("");
    setSuccess("");
    try {
      const response = await api.get(`/person/${session.userId}/privacy/export`);
      if (response.status >= 400) {
        throw toApiError(response, "Failed to export account data");
      }
      const payload = response.data?.data?.export || response.data?.export || response.data;
      downloadJson(`wotlwedu-account-export-${session.userId}.json`, payload);
      setSuccess("Account data export generated.");
    } catch (err) {
      setError(err.message || "Failed to export account data");
    } finally {
      setPrivacyLoading(false);
    }
  }

  async function requestAccountDeletion(event) {
    event.preventDefault();
    if (!session?.userId) return;
    setPrivacyLoading(true);
    setError("");
    setSuccess("");
    try {
      const response = await api.post(`/person/${session.userId}/privacy/delete-request`, {
        reason: deletionReason,
      });
      if (response.status >= 400) {
        throw toApiError(response, "Failed to request account deletion");
      }
      setDeletionReason("");
      setSuccess("Account deletion request submitted for support review.");
      await loadProfile();
    } catch (err) {
      setError(err.message || "Failed to request account deletion");
    } finally {
      setPrivacyLoading(false);
    }
  }

  async function begin2faSetup() {
    setError("");
    setSuccess("");

    try {
      const response = await api.post("/login/2fa");
      if (response.status >= 400) {
        throw toApiError(response, "Failed to start 2FA setup");
      }
      setSetup2fa(response.data?.data || response.data);
      setTotp("");
    } catch (err) {
      setError(err.message || "Failed to start 2FA setup");
    }
  }

  async function confirm2fa(event) {
    event.preventDefault();
    if (!setup2fa?.verificationToken) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.post("/login/verify2fa", {
        userId: session.userId,
        verificationToken: setup2fa.verificationToken,
        authToken: totp,
      });
      if (response.status >= 400) {
        throw toApiError(response, "Failed to verify 2FA");
      }

      onSessionRefresh?.(response.data);
      setSetup2fa(null);
      setTotp("");
      setSuccess("Two-factor authentication enabled.");
      await loadProfile();
    } catch (err) {
      setError(err.message || "Failed to verify 2FA");
    } finally {
      setSaving(false);
    }
  }

  async function submitInvite(event) {
    event.preventDefault();
    if (!session?.organizationId) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.post(`/organization/${session.organizationId}/invite`, {
        email: inviteEmail,
      });
      if (response.status >= 400) {
        const conflict = response.data?.data?.conflict;
        if (conflict?.organizationName) {
          throw new Error(
            `${response.data?.message || "Invite conflict"}: ${conflict.organizationName}. ${conflict.resolution || ""}`.trim()
          );
        }
        throw toApiError(response, "Failed to invite person");
      }
      setInviteEmail("");
      setSuccess("Invitation sent.");
      await loadProfile();
    } catch (err) {
      setError(err.message || "Failed to invite person");
    } finally {
      setSaving(false);
    }
  }

  async function unlinkMethod(identityId) {
    if (!session?.userId || !identityId) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.delete(`/person/${session.userId}/signin-method/${identityId}`);
      if (response.status >= 400) {
        throw toApiError(response, "Failed to unlink sign-in method");
      }
      setSuccess("Linked sign-in method removed.");
      await loadProfile();
    } catch (err) {
      setError(err.message || "Failed to unlink sign-in method");
    } finally {
      setSaving(false);
    }
  }

  async function resendInvite(inviteId) {
    if (!session?.organizationId || !inviteId) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.post(
        `/organization/${session.organizationId}/invite/${inviteId}/resend`
      );
      if (response.status >= 400) {
        throw toApiError(response, "Failed to resend invite");
      }
      setSuccess("Invitation resent with a new link.");
      await loadProfile();
    } catch (err) {
      setError(err.message || "Failed to resend invite");
    } finally {
      setSaving(false);
    }
  }

  async function revokeInvite(inviteId) {
    if (!session?.organizationId || !inviteId) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.delete(`/organization/${session.organizationId}/invite/${inviteId}`);
      if (response.status >= 400) {
        throw toApiError(response, "Failed to revoke invite");
      }
      setSuccess("Invitation revoked.");
      await loadProfile();
    } catch (err) {
      setError(err.message || "Failed to revoke invite");
    } finally {
      setSaving(false);
    }
  }

  async function acceptPendingInvite() {
    const inviteToken = new URLSearchParams(window.location.search).get("invite") || "";
    if (!inviteToken) return;

    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await api.post(`/login/invite/${encodeURIComponent(inviteToken)}/accept`);
      if (response.status >= 400) {
        throw toApiError(response, "Failed to accept invitation");
      }
      onSessionRefresh?.(response.data);
      clearInviteQuery();
      setPendingInvite(null);
      setSuccess("Invitation accepted.");
      await loadProfile();
    } catch (err) {
      setError(err.message || "Failed to accept invitation");
    } finally {
      setSaving(false);
    }
  }

  async function declinePendingInvite() {
    const inviteToken = new URLSearchParams(window.location.search).get("invite") || "";
    if (!inviteToken) return;

    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await api.post(`/login/invite/${encodeURIComponent(inviteToken)}/decline`);
      if (response.status >= 400) {
        throw toApiError(response, "Failed to decline invitation");
      }
      clearInviteQuery();
      setPendingInvite(null);
      setSuccess("Invitation declined.");
      await loadProfile();
    } catch (err) {
      setError(err.message || "Failed to decline invitation");
    } finally {
      setSaving(false);
    }
  }

  async function revokeSession(sessionId) {
    if (!sessionId) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await api.delete(`/login/session/${sessionId}`);
      if (response.status >= 400) {
        throw toApiError(response, "Failed to revoke session");
      }
      if (sessionId === session?.sessionId) {
        onLogout();
        return;
      }
      setSuccess("Session revoked.");
      await loadProfile();
    } catch (err) {
      setError(err.message || "Failed to revoke session");
    } finally {
      setSaving(false);
    }
  }

  async function revokeAllSessions() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await api.post("/login/logout/all");
      if (response.status >= 400) {
        throw toApiError(response, "Failed to revoke sessions");
      }
      onLogout();
    } catch (err) {
      setError(err.message || "Failed to revoke sessions");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="screen-stack">
        <div className="loading">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="screen-stack">
      <section className="surface-card">
        <p className="eyebrow">Identity</p>
        <h2>{currentUser?.alias || currentUser?.email || "Person"}</h2>
        <div className="detail-grid">
          <div>
            <span className="detail-label">Email</span>
            <span>{currentUser?.email || "Unknown"}</span>
          </div>
          <div>
            <span className="detail-label">Organization</span>
            <span>{organization?.name || "Personal"}</span>
          </div>
          <div>
            <span className="detail-label">Verification</span>
            <span>{currentUser?.verified ? "Verified" : "Pending email confirmation"}</span>
          </div>
          <div>
            <span className="detail-label">Scope</span>
            <span>{activeWorkgroupName || "All visible spaces"}</span>
          </div>
        </div>
      </section>

      <section className="surface-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Security</p>
            <h3>Active Sessions</h3>
          </div>
          <button className="btn btn-secondary" disabled={saving} onClick={revokeAllSessions} type="button">
            Logout All Devices
          </button>
        </div>
        <div className="record-stack">
          {sessions.map((row) => (
            <div className="record-card" key={row.id}>
              <div className="split-heading">
                <strong>{row.current ? "Current session" : "Session"}</strong>
                <span className="chip">{row.revokedAt ? "Revoked" : "Active"}</span>
              </div>
              <p className="tiny-meta">{row.userAgent || "Unknown device"}</p>
              <p className="tiny-meta">
                Last used {row.lastUsedAt ? new Date(row.lastUsedAt).toLocaleString() : "unknown"}
              </p>
              <p className="tiny-meta">
                Expires {row.expiresAt ? new Date(row.expiresAt).toLocaleString() : "unknown"}
              </p>
              {!row.revokedAt ? (
                <button
                  className="btn btn-secondary"
                  disabled={saving}
                  onClick={() => revokeSession(row.id)}
                  type="button"
                >
                  {row.current ? "Logout This Device" : "Revoke"}
                </button>
              ) : null}
            </div>
          ))}
          {sessions.length === 0 ? <p className="tiny-meta">No active sessions found.</p> : null}
        </div>
      </section>

      <section className="surface-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Privacy</p>
            <h3>Account data</h3>
          </div>
          <Link className="text-link" to="/privacy">Privacy Policy</Link>
        </div>
        <ErrorBanner error={error} />
        <SuccessBanner message={success} />
        <div className="record-stack">
          <div className="record-card">
            <div className="split-heading">
              <strong>Export your data</strong>
              <span className="chip">JSON</span>
            </div>
            <p className="tiny-meta">
              Includes profile, organization membership, sessions, notifications, sign-in methods,
              and recent account audit history. Secret authentication material is excluded.
            </p>
            <button
              className="btn btn-secondary"
              disabled={privacyLoading}
              onClick={exportAccountData}
              type="button"
            >
              {privacyLoading ? "Working..." : "Export My Data"}
            </button>
          </div>
          <div className="record-card">
            <div className="split-heading">
              <strong>Request account deletion</strong>
              <span className="chip">Support review</span>
            </div>
            <p className="tiny-meta">
              Submits a deletion request for review. Organization-owned resources may be transferred
              or retained when required for security, abuse handling, or shared poll history.
            </p>
            <form className="stack-form" onSubmit={requestAccountDeletion}>
              <label className="field">
                <span>Reason</span>
                <textarea
                  rows="3"
                  value={deletionReason}
                  onChange={(event) => setDeletionReason(event.target.value)}
                  placeholder="Optional context for support"
                />
              </label>
              <button className="btn btn-secondary" disabled={privacyLoading} type="submit">
                {privacyLoading ? "Submitting..." : "Request Account Deletion"}
              </button>
            </form>
          </div>
        </div>
      </section>

      {pendingInvite ? (
        <section className="surface-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Invitation</p>
              <h3>{pendingInvite.organizationName || "Organization"} invite</h3>
            </div>
          </div>
          <div className="record-card">
            <p className="tiny-meta">{pendingInvite.email}</p>
            <p className="tiny-meta">
              {pendingInvite.expiresAt
                ? `Expires ${new Date(pendingInvite.expiresAt).toLocaleString()}`
                : "No expiration"}
            </p>
            <div className="split-actions">
              <button className="btn" disabled={saving} onClick={acceptPendingInvite} type="button">
                Accept Invite
              </button>
              <button
                className="btn btn-secondary"
                disabled={saving}
                onClick={declinePendingInvite}
                type="button"
              >
                Decline
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {session?.organizationId ? (
        <section className="surface-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Organization</p>
              <h3>{organization?.name || session.organizationId}</h3>
            </div>
          </div>
          <div className="detail-grid">
            <div>
              <span className="detail-label">Members</span>
              <span>{organizationMembership.members.length}</span>
            </div>
            <div>
              <span className="detail-label">Spaces</span>
              <span>{organizationMembership.workgroups.length}</span>
            </div>
            <div>
              <span className="detail-label">Pending Invites</span>
              <span>{organizationMembership.pendingInviteCount || 0}</span>
            </div>
          </div>
          <div className="record-stack">
            {organizationMembership.members.slice(0, 8).map((member) => (
              <div className="record-card" key={member.id}>
                <div className="split-heading">
                  <strong>{member.fullName || member.alias || member.email || member.id}</strong>
                  <span className="chip">
                    {member.organizationAdmin ? "Org admin" : member.workgroupAdmin ? "Space admin" : "Member"}
                  </span>
                </div>
                <p className="tiny-meta">{member.email || member.alias || member.id}</p>
              </div>
            ))}
            {!organizationMembership.members.length ? (
              <div className="empty-state">No members available.</div>
            ) : null}
          </div>
        </section>
      ) : null}

      {session?.organizationId ? (
        <section className="surface-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Spaces</p>
              <h3>Switch and review membership</h3>
            </div>
            <Link className="text-link" to="/app/space">
              Manage Spaces
            </Link>
          </div>
          <div className="record-stack">
            {organizationMembership.workgroups.length ? (
              organizationMembership.workgroups.map((workgroup) => (
                <div className="record-card" key={workgroup.id}>
                  <div className="split-heading">
                    <strong>{workgroup.name || workgroup.id}</strong>
                    <span className="chip">
                      {activeWorkgroupId === workgroup.id
                        ? "Active"
                        : workgroup.isMember
                          ? "Member"
                          : "Visible"}
                    </span>
                  </div>
                  <p className="tiny-meta">{workgroup.description || "No description"}</p>
                  <p className="tiny-meta">{workgroup.memberCount} members</p>
                </div>
              ))
            ) : (
              <div className="empty-state">No spaces available.</div>
            )}
          </div>
        </section>
      ) : null}

      <section className="surface-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Access</p>
            <h3>Sign-in methods</h3>
          </div>
        </div>
          <div className="record-stack">
          <div className="record-card">
            <div className="split-heading">
              <strong>Password</strong>
              <span className="chip">
                {signInMethods.passwordEnabled ? "Enabled" : "Disabled"}
              </span>
            </div>
          </div>
          {(signInMethods.linkedProviders || []).map((method) => (
            <div className="record-card" key={method.id}>
              <div className="split-heading">
                <strong>{method.provider}</strong>
                <span className="chip">{method.email || "Linked"}</span>
              </div>
              <p className="tiny-meta">
                Last updated{" "}
                {method.updatedAt ? new Date(method.updatedAt).toLocaleString() : "Unknown"}
              </p>
              <div className="split-actions">
                <button
                  className="btn btn-secondary"
                  disabled={saving}
                  onClick={() => unlinkMethod(method.id)}
                  type="button"
                >
                  Unlink
                </button>
              </div>
            </div>
          ))}
          {!signInMethods.linkedProviders?.length ? (
            <div className="empty-state">No linked social sign-in methods.</div>
          ) : null}
        </div>
      </section>

      <section className="surface-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Security</p>
            <h3>Recent account activity</h3>
          </div>
        </div>
        <div className="audit-table-scroll">
          {userAudits.length ? (
            <table className="audit-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Event</th>
                  <th>Outcome</th>
                  <th>Message</th>
                  <th>Context</th>
                </tr>
              </thead>
              <tbody>
                {userAudits.map((audit) => (
                  <tr key={audit.id}>
                    <td>{formatDate(audit.createdAt)}</td>
                    <td>{audit.eventType || "Activity"}</td>
                    <td>
                      <span className={`chip audit-chip-${audit.outcome || "unknown"}`}>
                        {audit.outcome || "unknown"}
                      </span>
                    </td>
                    <td>{formatAudit(audit)}</td>
                    <td>
                      {[audit.email, audit.provider, audit.organizationId].filter(Boolean).join(" / ") ||
                        "Account"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">No account activity recorded yet.</div>
          )}
        </div>
      </section>

      {session?.organizationId && (session?.organizationAdmin || session?.systemAdmin) ? (
        <section className="surface-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Organization</p>
              <h3>Invitations</h3>
            </div>
          </div>
          <form className="stack-form" onSubmit={submitInvite}>
            <label className="field">
              <span>Invite Email</span>
              <input
                type="email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="name@example.com"
                required
              />
            </label>
            <button className="btn" disabled={saving} type="submit">
              {saving ? "Sending..." : "Send Invite"}
            </button>
          </form>
          <div className="chip-row wrap-actions">
            {["all", "pending", "accepted", "revoked", "expired"].map((status) => (
              <button
                key={status}
                className={`btn ${inviteFilter === status ? "" : "btn-tonal"}`}
                disabled={saving}
                onClick={() => setInviteFilter(status)}
                type="button"
              >
                {status === "all" ? "All" : inviteStatusLabel(status)}
              </button>
            ))}
          </div>
          <div className="record-stack">
            {organizationInvites.length ? (
              organizationInvites.map((inviteRow) => {
                const inviteUrl = `${window.location.origin}/login?invite=${encodeURIComponent(
                  inviteRow.token
                )}`;
                const isPending = inviteRow.status === "pending";
                return (
                  <div className="record-card" key={inviteRow.id}>
                    <div className="split-heading">
                      <strong>{inviteRow.email}</strong>
                      <span className="chip">{inviteStatusLabel(inviteRow.status)}</span>
                    </div>
                    <p className="tiny-meta">
                      Created{" "}
                      {inviteRow.createdAt
                        ? new Date(inviteRow.createdAt).toLocaleString()
                        : "Unknown"}
                    </p>
                    <p className="tiny-meta">
                      {inviteRow.expiresAt
                        ? `Expires ${new Date(inviteRow.expiresAt).toLocaleString()}`
                        : "No expiration"}
                    </p>
                    {inviteRow.invitedByName ? (
                      <p className="tiny-meta">Invited by {inviteRow.invitedByName}</p>
                    ) : null}
                    {inviteRow.acceptedAt ? (
                      <p className="tiny-meta">
                        Accepted {new Date(inviteRow.acceptedAt).toLocaleString()}
                        {inviteRow.acceptedByName ? ` by ${inviteRow.acceptedByName}` : ""}
                      </p>
                    ) : null}
                    {inviteRow.revokedAt ? (
                      <p className="tiny-meta">
                        Revoked {new Date(inviteRow.revokedAt).toLocaleString()}
                        {inviteRow.revokedByName ? ` by ${inviteRow.revokedByName}` : ""}
                      </p>
                    ) : null}
                    {isPending ? <p className="tiny-meta invite-link">{inviteUrl}</p> : null}
                    {isPending ? (
                      <div className="split-actions">
                        <button
                          className="btn btn-tonal"
                          disabled={saving}
                          onClick={() => resendInvite(inviteRow.id)}
                          type="button"
                        >
                          Resend
                        </button>
                        <button
                          className="btn btn-secondary"
                          disabled={saving}
                          onClick={() => revokeInvite(inviteRow.id)}
                          type="button"
                        >
                          Revoke
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <div className="empty-state">No invites for this filter.</div>
            )}
          </div>
        </section>
      ) : null}

      <section className="surface-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Profile</p>
            <h3>Edit account</h3>
          </div>
          <Link className="text-link" to="/app/friend">
            Friends
          </Link>
        </div>
        <ErrorBanner error={error} />
        <SuccessBanner message={success} />
        <form className="stack-form" onSubmit={submitProfile}>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={form.email}
              onChange={(event) => updateField("email", event.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>First Name</span>
            <input
              value={form.firstName}
              onChange={(event) => updateField("firstName", event.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>Last Name</span>
            <input
              value={form.lastName}
              onChange={(event) => updateField("lastName", event.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>Alias</span>
            <input
              value={form.alias}
              onChange={(event) => updateField("alias", event.target.value)}
            />
          </label>
          <label className="toggle-field">
            <span>Send password reset email after save</span>
            <input
              checked={resetPassword}
              onChange={(event) => setResetPassword(event.target.checked)}
              type="checkbox"
            />
          </label>
          <button className="btn" disabled={saving || currentUser?.verified === false} type="submit">
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </form>
      </section>

      <section className="surface-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Security</p>
            <h3>Two-factor authentication</h3>
          </div>
        </div>
        {!form.enable2fa && !setup2fa ? (
          <button className="btn btn-secondary" onClick={begin2faSetup} type="button">
            Enable 2FA
          </button>
        ) : null}
        {setup2fa ? (
          <form className="stack-form" onSubmit={confirm2fa}>
            {setup2fa.QRCode ? (
              <img alt="2FA QR code" className="qr-code" src={setup2fa.QRCode} />
            ) : null}
            {setup2fa.secret ? <div className="chip">Secret: {setup2fa.secret}</div> : null}
            <label className="field">
              <span>Verification Code</span>
              <input
                inputMode="numeric"
                value={totp}
                onChange={(event) => setTotp(event.target.value)}
                placeholder="123456"
                required
              />
            </label>
            <div className="split-actions">
              <button className="btn" disabled={saving} type="submit">
                {saving ? "Verifying..." : "Verify 2FA"}
              </button>
              <button
                className="btn btn-tonal"
                onClick={() => {
                  setSetup2fa(null);
                  setTotp("");
                }}
                type="button"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}
      </section>

      <section className="surface-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">More</p>
            <h3>App sections</h3>
          </div>
        </div>
        <div className="chip-row wrap-actions">
          <Link className="text-link" to="/app/friend">
            Friends
          </Link>
          <Link className="text-link" to="/app/notification">
            Notifications
          </Link>
          <Link className="text-link" to="/app/preference">
            Preferences
          </Link>
          <Link className="text-link" to="/app/picture">
            Pictures
          </Link>
          <Link className="text-link" to="/app/item">
            Items
          </Link>
          <Link className="text-link" to="/app/list">
            Lists
          </Link>
          <Link className="text-link" to="/app/poll">
            Polls
          </Link>
        </div>
      </section>

      <section className="surface-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Session</p>
            <h3>Quick actions</h3>
          </div>
        </div>
        <button className="btn btn-danger" onClick={onLogout}>
          Logout
        </button>
      </section>
    </div>
  );
}
