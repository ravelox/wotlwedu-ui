import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Loading from "../components/Loading";
import { ErrorBanner, SuccessBanner } from "../components/Feedback";
import { extractCollection, extractEntity, toApiError } from "../lib/api";

const NOTIFICATION_PREFS = [
  {
    name: "notification.pollUpdates",
    label: "Poll updates",
    detail: "Live poll starts, closes, reminders, and result changes.",
  },
  {
    name: "notification.emailInvites",
    label: "Email invites",
    detail: "Messages related to public poll and organization invites.",
  },
  {
    name: "notification.reminders",
    label: "Voting reminders",
    detail: "Follow-up nudges when a poll still needs your response.",
  },
];

export default function PreferencesPage({ api }) {
  const navigate = useNavigate();
  const { preferenceId } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState([]);
  const [form, setForm] = useState({ id: "", name: "", value: "" });
  const [notificationPrefs, setNotificationPrefs] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load(selectedId = preferenceId) {
    setLoading(true);
    setError("");

    try {
      const listRes = await api.get("/preference", { params: { page: 1, items: 100 } });
      if (listRes.status >= 400) {
        throw toApiError(listRes, "Failed to load preferences");
      }

      const rows = extractCollection(listRes, "preferences");
      setPreferences(rows);
      setNotificationPrefs(
        Object.fromEntries(
          NOTIFICATION_PREFS.map((pref) => {
            const row = rows.find((entry) => entry.name === pref.name);
            return [pref.name, row?.value === undefined ? true : row.value !== "false"];
          })
        )
      );

      if (selectedId && selectedId !== "add") {
        const detailRes = await api.get(`/preference/${selectedId}`);
        if (detailRes.status >= 400) {
          throw toApiError(detailRes, "Failed to load preference");
        }
        const preference = extractEntity(detailRes, "preference");
        setForm({
          id: preference?.id || "",
          name: preference?.name || "",
          value: preference?.value || "",
        });
      } else {
        setForm({ id: "", name: "", value: "" });
      }
    } catch (err) {
      setError(err.message || "Failed to load preferences");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [api, preferenceId]);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function savePreference(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = form.id
        ? await api.put(`/preference/${form.id}`, { name: form.name, value: form.value })
        : await api.post("/preference", { name: form.name, value: form.value });

      if (response.status >= 400) {
        throw toApiError(response, "Failed to save preference");
      }

      setSuccess("Preference saved.");
      navigate("/app/preference", { replace: true });
      await load("add");
    } catch (err) {
      setError(err.message || "Failed to save preference");
    } finally {
      setSaving(false);
    }
  }

  async function deletePreference() {
    if (!form.id) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.delete(`/preference/${form.id}`);
      if (response.status >= 400) {
        throw toApiError(response, "Failed to delete preference");
      }
      setSuccess("Preference deleted.");
      navigate("/app/preference", { replace: true });
      await load("add");
    } catch (err) {
      setError(err.message || "Failed to delete preference");
    } finally {
      setSaving(false);
    }
  }

  async function saveNotificationPreference(name, enabled) {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await api.put(`/preference/${name}`, {
        name,
        value: enabled ? "true" : "false",
      });
      if (response.status >= 400) throw toApiError(response, "Failed to save notification preference");
      setNotificationPrefs((current) => ({ ...current, [name]: enabled }));
      setSuccess("Notification preference saved.");
      await load(form.id || "add");
    } catch (err) {
      setError(err.message || "Failed to save notification preference");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loading text="Loading preferences..." />;

  return (
    <div className="screen-stack">
      <section className="surface-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Preferences</p>
            <h2>Your settings</h2>
          </div>
          <button className="btn btn-tonal" onClick={() => navigate("/app/preference/add")} type="button">
            Add
          </button>
        </div>
        <ErrorBanner error={error} />
        <SuccessBanner message={success} />
        <div className="preference-control-list">
          {NOTIFICATION_PREFS.map((pref) => (
            <label className="preference-toggle" key={pref.name}>
              <span>
                <strong>{pref.label}</strong>
                <small>{pref.detail}</small>
              </span>
              <input
                checked={notificationPrefs[pref.name] !== false}
                disabled={saving}
                onChange={(event) => saveNotificationPreference(pref.name, event.target.checked)}
                type="checkbox"
              />
            </label>
          ))}
        </div>
        <div className="card-list">
          {preferences.length === 0 ? (
            <div className="empty-state">No preferences saved yet.</div>
          ) : (
            preferences.map((preference) => (
              <button
                className={`list-card preference-row${form.id === preference.id ? " preference-row-active" : ""}`}
                key={preference.id}
                onClick={() => navigate(`/app/preference/${preference.id}`)}
                type="button"
              >
                <strong>{preference.name}</strong>
                <p>{preference.value}</p>
              </button>
            ))
          )}
        </div>
      </section>

      <section className="surface-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Editor</p>
            <h3>{form.id ? "Edit preference" : "Add preference"}</h3>
          </div>
        </div>
        <form className="stack-form" onSubmit={savePreference}>
          <label className="field">
            <span>Name</span>
            <input
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>Value</span>
            <textarea
              rows="4"
              value={form.value}
              onChange={(event) => updateField("value", event.target.value)}
              required
            />
          </label>
          <div className="split-actions">
            <button className="btn" disabled={saving} type="submit">
              {saving ? "Saving..." : "Save"}
            </button>
            {form.id ? (
              <button
                aria-label="Delete preference"
                className="btn btn-danger btn-icon-delete"
                disabled={saving}
                onClick={deletePreference}
                title="Delete preference"
                type="button"
              >
                Delete
              </button>
            ) : null}
          </div>
        </form>
      </section>
    </div>
  );
}
