import { useEffect, useState } from "react";
import { ErrorBanner, SuccessBanner } from "./Feedback";
import { toApiError } from "../lib/api";
import PeoplePicker from "./PeoplePicker";

function formatDate(value) {
  if (!value) return "Never";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Never" : date.toLocaleString();
}

function publicSummary(stats) {
  const publicElection = stats?.publicElection || {};
  return {
    publicAccessMode: publicElection.publicAccessMode || "private",
    publicShareUrl: publicElection.publicShareUrl || "",
    guestVotingEnabled: publicElection.guestVotingEnabled === true,
    allowPlatformInvites: publicElection.allowPlatformInvites === true,
    abuseStatus: publicElection.abuseStatus || "normal",
  };
}

export default function PublicPollControls({ api, electionId }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState(null);
  const [trust, setTrust] = useState(null);
  const [invites, setInvites] = useState([]);
  const [inviteEmails, setInviteEmails] = useState("");
  const [settings, setSettings] = useState({
    publicAccessMode: "link_vote",
    guestVotingEnabled: true,
    allowPlatformInvites: false,
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadPublicSettings() {
    if (!electionId) return;
    setLoading(true);
    setError("");
    try {
      const [statsRes, invitesRes, trustRes] = await Promise.all([
        api.get(`/poll/${electionId}/public/stats`),
        api.get(`/poll/${electionId}/invite`),
        api.get("/poll/public/trust"),
      ]);
      if (statsRes.status >= 400) throw toApiError(statsRes, "Failed to load public poll settings");
      if (invitesRes.status >= 400) throw toApiError(invitesRes, "Failed to load public poll invites");
      if (trustRes.status >= 400) throw toApiError(trustRes, "Failed to load invite trust settings");
      const nextStats = statsRes.data?.data || null;
      setStats(nextStats);
      setInvites(invitesRes.data?.data?.invites || []);
      setTrust(trustRes.data?.data?.trustProfile || null);
      const summary = publicSummary(nextStats);
      setSettings({
        publicAccessMode: summary.publicAccessMode === "link_view" ? "link_view" : "link_vote",
        guestVotingEnabled: summary.guestVotingEnabled,
        allowPlatformInvites: summary.allowPlatformInvites,
      });
    } catch (err) {
      setError(err.message || "Failed to load public poll settings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPublicSettings();
  }, [api, electionId]);

  function updateSetting(key, value) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  async function enablePublicPoll() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await api.post(`/poll/${electionId}/public/enable`, settings);
      if (response.status >= 400) throw toApiError(response, "Failed to enable public poll");
      setSuccess("Public link updated.");
      await loadPublicSettings();
    } catch (err) {
      setError(err.message || "Failed to enable public poll");
    } finally {
      setSaving(false);
    }
  }

  async function disablePublicPoll() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await api.post(`/poll/${electionId}/public/disable`);
      if (response.status >= 400) throw toApiError(response, "Failed to disable public poll");
      setSuccess("Public link disabled.");
      await loadPublicSettings();
    } catch (err) {
      setError(err.message || "Failed to disable public poll");
    } finally {
      setSaving(false);
    }
  }

  async function sendInvites(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const emails = inviteEmails
        .split(/[\n,;]/)
        .map((email) => email.trim())
        .filter(Boolean);
      const response = await api.post(`/poll/${electionId}/invite`, { emails });
      if (response.status >= 400) throw toApiError(response, "Failed to send public poll invites");
      const results = response.data?.data?.results || [];
      const sentCount = results.filter((row) => row.status < 400).length;
      setInviteEmails("");
      setSuccess(`${sentCount} invite${sentCount === 1 ? "" : "s"} queued.`);
      await loadPublicSettings();
    } catch (err) {
      setError(err.message || "Failed to send public poll invites");
    } finally {
      setSaving(false);
    }
  }

  async function revokeInvite(inviteId) {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await api.delete(`/poll/${electionId}/invite/${inviteId}`);
      if (response.status >= 400) throw toApiError(response, "Failed to revoke invite");
      setSuccess("Invite revoked.");
      await loadPublicSettings();
    } catch (err) {
      setError(err.message || "Failed to revoke invite");
    } finally {
      setSaving(false);
    }
  }

  async function copyShareUrl() {
    const url = publicSummary(stats).publicShareUrl;
    if (!url) return;
    await navigator.clipboard?.writeText(url);
    setSuccess("Public link copied.");
  }

  async function copyShareText() {
    const url = publicSummary(stats).publicShareUrl;
    if (!url) return;
    await navigator.clipboard?.writeText(`Help decide with this wotlwedu poll: ${url}`);
    setSuccess("Share text copied.");
  }

  async function sharePublicPoll() {
    const url = publicSummary(stats).publicShareUrl;
    if (!url) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "wotlwedu public poll",
          text: "Help decide with this wotlwedu poll.",
          url,
        });
        setSuccess("Share sheet opened.");
        return;
      } catch (err) {
        if (err?.name === "AbortError") return;
      }
    }
    await navigator.clipboard?.writeText(`Help decide with this wotlwedu poll: ${url}`);
    setSuccess("Share text copied.");
  }

  if (!electionId) return null;

  const summary = publicSummary(stats);
  const counts = stats?.statistics || {};
  const invitesAllowed =
    summary.allowPlatformInvites &&
    trust?.canSendExternalInvites === true &&
    trust?.trustTier !== "restricted";

  return (
    <section className="surface-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Public sharing</p>
          <h3>Public poll controls</h3>
        </div>
      </div>
      <ErrorBanner error={error} />
      <SuccessBanner message={success} />
      {loading ? (
        <div className="loading">Loading public settings...</div>
      ) : (
        <div className="stack-form">
          <div className="detail-grid">
            <div>
              <span className="detail-label">Access</span>
              <span>{summary.publicAccessMode.replace("_", " ")}</span>
            </div>
            <div>
              <span className="detail-label">Reports</span>
              <span>{counts.reportCount || 0}</span>
            </div>
            <div>
              <span className="detail-label">Guests</span>
              <span>{counts.participantCount || 0}</span>
            </div>
            <div>
              <span className="detail-label">Guest votes</span>
              <span>{counts.voteCount || 0}</span>
            </div>
          </div>

          {summary.publicShareUrl ? (
            <div className="invite-banner">
              <span className="detail-label">Share link</span>
              <span className="invite-link">{summary.publicShareUrl}</span>
              <p className="tiny-meta">
                Anyone with this link can view the public page. Guest voting follows the settings below.
              </p>
              <div className="split-actions wrap-actions">
                <button className="btn" onClick={sharePublicPoll} type="button">
                  Share Poll
                </button>
                <button className="btn btn-secondary" onClick={copyShareUrl} type="button">
                  Copy Link
                </button>
                <button className="btn btn-secondary" onClick={copyShareText} type="button">
                  Copy Invite Text
                </button>
                <a className="btn btn-tonal" href={summary.publicShareUrl} rel="noreferrer" target="_blank">
                  Open Public Page
                </a>
              </div>
            </div>
          ) : null}

          <label className="field">
            <span>Public Access</span>
            <select
              value={settings.publicAccessMode}
              onChange={(event) => updateSetting("publicAccessMode", event.target.value)}
            >
              <option value="link_vote">View and vote by link</option>
              <option value="link_view">View only by link</option>
            </select>
          </label>
          <label className="toggle-field">
            <span>Allow guest voting</span>
            <input
              checked={settings.guestVotingEnabled}
              onChange={(event) => updateSetting("guestVotingEnabled", event.target.checked)}
              type="checkbox"
            />
          </label>
          <label className="toggle-field">
            <span>Allow platform email invites</span>
            <input
              checked={settings.allowPlatformInvites}
              onChange={(event) => updateSetting("allowPlatformInvites", event.target.checked)}
              type="checkbox"
            />
          </label>
          <div className="split-actions wrap-actions">
            <button className="btn" disabled={saving} onClick={enablePublicPoll} type="button">
              {saving ? "Saving..." : "Enable or Update"}
            </button>
            <button className="btn btn-danger" disabled={saving} onClick={disablePublicPoll} type="button">
              Disable Public Link
            </button>
          </div>

          <form className="stack-form" onSubmit={sendInvites}>
            <label className="field">
              <span>Invite emails</span>
              <PeoplePicker
                allowEmails
                disabled={!invitesAllowed}
                emailPlaceholder={
                  invitesAllowed
                    ? "one@example.com, two@example.com"
                    : "Enable invites with a trusted account to send email invites"
                }
                emailValue={inviteEmails}
                onEmailValueChange={setInviteEmails}
                title="Public invite recipients"
              />
            </label>
            <button className="btn btn-secondary" disabled={saving || !invitesAllowed} type="submit">
              Send Invites
            </button>
          </form>

          <div className="card-list">
            {invites.length ? (
              invites.map((invite) => (
                <article className="list-card" key={invite.id}>
                  <div className="section-heading compact">
                    <div>
                      <strong>{invite.recipientEmail}</strong>
                      <p>
                        {invite.status} • sent {invite.sendCount || 0} time
                        {invite.sendCount === 1 ? "" : "s"} • last sent {formatDate(invite.lastSentAt)}
                      </p>
                    </div>
                    {!invite.revokedAt && invite.status !== "accepted" ? (
                      <button
                        className="btn btn-danger"
                        disabled={saving}
                        onClick={() => revokeInvite(invite.id)}
                        type="button"
                      >
                        Revoke
                      </button>
                    ) : null}
                  </div>
                </article>
              ))
            ) : (
              <div className="empty-state">No public invites yet.</div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
