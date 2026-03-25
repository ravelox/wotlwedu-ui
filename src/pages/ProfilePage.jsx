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
  const [inviteEmail, setInviteEmail] = useState("");
  const [organizationInvites, setOrganizationInvites] = useState([]);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  async function loadProfile() {
    const requests = [api.get(`/user/${session?.userId}`)];
    const canManageOrganization =
      session?.organizationId && (session?.organizationAdmin || session?.systemAdmin);

    if (canManageOrganization) {
      requests.push(api.get(`/organization/${session.organizationId}`));
      requests.push(api.get(`/organization/${session.organizationId}/invite`));
    }

    const [userResponse, organizationResponse, inviteResponse] = await Promise.all(requests);
    if (userResponse.status >= 400) {
      throw toApiError(userResponse, "Failed to load profile");
    }

    const user = extractEntity(userResponse, "user");
    setCurrentUser(user);
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
  }, [api, session?.userId]);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submitProfile(event) {
    event.preventDefault();
    setSaving(true);
    setSuccess("");
    setError("");

    try {
      const response = await api.put(`/user/${session.userId}`, {
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
        throw toApiError(response, "Failed to invite user");
      }
      setInviteEmail("");
      setSuccess("Invitation sent.");
      await loadProfile();
    } catch (err) {
      setError(err.message || "Failed to invite user");
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
        <h2>{currentUser?.alias || currentUser?.email || "User"}</h2>
        <div className="detail-grid">
          <div>
            <span className="detail-label">Email</span>
            <span>{currentUser?.email || "Unknown"}</span>
          </div>
          <div>
            <span className="detail-label">Organization</span>
            <span>{organization?.name || session?.organizationId || "Not assigned"}</span>
          </div>
          <div>
            <span className="detail-label">Verification</span>
            <span>{currentUser?.verified ? "Verified" : "Pending email confirmation"}</span>
          </div>
          <div>
            <span className="detail-label">Scope</span>
            <span>{activeWorkgroupId || "All visible workgroups"}</span>
          </div>
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
          <p className="subtle-copy">
            Invite a Google account by email. The invite is consumed when that user signs in
            through the invite link and the Google account email matches.
          </p>
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
          <div className="record-stack">
            {organizationInvites.length ? (
              organizationInvites.map((inviteRow) => {
                const inviteUrl = `${window.location.origin}/login?invite=${encodeURIComponent(
                  inviteRow.token
                )}`;
                return (
                  <div className="record-card" key={inviteRow.id}>
                    <strong>{inviteRow.email}</strong>
                    <p className="tiny-meta">
                      {inviteRow.expiresAt
                        ? `Expires ${new Date(inviteRow.expiresAt).toLocaleString()}`
                        : "No expiration"}
                    </p>
                    <p className="tiny-meta invite-link">{inviteUrl}</p>
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
                  </div>
                );
              })
            ) : (
              <div className="empty-state">No pending invites.</div>
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
        <p className="subtle-copy">
          Current status: {form.enable2fa ? "Enabled" : "Disabled"}
        </p>
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
            <h3>Consumer routes</h3>
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
          <Link className="text-link" to="/app/image">
            Images
          </Link>
          <Link className="text-link" to="/app/item">
            Items
          </Link>
          <Link className="text-link" to="/app/list">
            Lists
          </Link>
          <Link className="text-link" to="/app/election">
            Elections
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
