import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Loading from "../components/Loading";
import { ErrorBanner, SuccessBanner } from "../components/Feedback";
import { extractCollection, extractEntity, toApiError } from "../lib/api";
import { getPollTemplate, POLL_TEMPLATES } from "../lib/pollTemplates";

const STEPS = ["Template", "Ideas", "Audience", "Sharing", "Publish"];

function defaultExpirationValue() {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 16);
}

function addDays(value) {
  const date = new Date(Date.now() + value * 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 16);
}

function toOptionalValue(value) {
  return value === "" ? null : value;
}

function localId(seed = "") {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}-${seed}`;
}

function initialIdeaRows(templateId) {
  return getPollTemplate(templateId).ideas.map((name) => ({
    id: localId(name),
    name,
    note: "",
  }));
}

function normalizeEmails(value) {
  return [...new Set(
    String(value || "")
      .split(/[\s,;]+/)
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  )];
}

export default function CreatePollWizardPage({ api, activeWorkgroupId }) {
  const [searchParams] = useSearchParams();
  const initialTemplateId = POLL_TEMPLATES.some(
    (template) => template.id === searchParams.get("template")
  )
    ? searchParams.get("template")
    : "food";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [refs, setRefs] = useState({ categories: [], groups: [], workgroups: [] });
  const [published, setPublished] = useState(null);
  const [form, setForm] = useState({
    templateId: initialTemplateId,
    title: getPollTemplate(initialTemplateId).title,
    description: getPollTemplate(initialTemplateId).description,
    categoryId: "",
    workgroupId: activeWorkgroupId || "",
    ideas: initialIdeaRows(initialTemplateId),
    groupId: "",
    audienceMode: "circle",
    expiration: defaultExpirationValue(),
    publicAccess: false,
    allowGuestVotes: true,
    inviteEmails: "",
    smsNumbers: "",
    startNow: true,
  });

  const selectedTemplate = getPollTemplate(form.templateId);
  const cleanIdeas = form.ideas
    .map((idea) => ({ ...idea, name: idea.name.trim(), note: idea.note.trim() }))
    .filter((idea) => idea.name);
  const inviteEmails = useMemo(() => normalizeEmails(form.inviteEmails), [form.inviteEmails]);
  const canPublish =
    form.title.trim() &&
    cleanIdeas.length >= 2 &&
    ((form.audienceMode === "public" && form.publicAccess) || form.groupId) &&
    form.expiration;

  useEffect(() => {
    let cancelled = false;

    async function loadRefs() {
      setLoading(true);
      setError("");
      try {
        const [categoryRes, groupRes, workgroupRes] = await Promise.all([
          api.get("/category", { params: { page: 1, items: 100 } }),
          api.get("/circle", { params: { page: 1, items: 100, detail: "user" } }),
          api.get("/space", { params: { page: 1, items: 100 } }),
        ]);
        if (categoryRes.status >= 400) throw toApiError(categoryRes, "Failed to load categories");
        if (groupRes.status >= 400) throw toApiError(groupRes, "Failed to load circles");
        if (workgroupRes.status >= 400) throw toApiError(workgroupRes, "Failed to load spaces");
        if (!cancelled) {
          setRefs({
            categories: extractCollection(categoryRes, "categories"),
            groups: extractCollection(groupRes, "groups"),
            workgroups: extractCollection(workgroupRes, "workgroups"),
          });
        }
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load poll setup");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadRefs();
    return () => {
      cancelled = true;
    };
  }, [api]);

  useEffect(() => {
    setForm((current) => {
      if (current.categoryId) return current;
      const matching = refs.categories.find(
        (category) => category.name?.toLowerCase() === selectedTemplate.category.toLowerCase()
      );
      return matching ? { ...current, categoryId: matching.id } : current;
    });
  }, [refs.categories, selectedTemplate.category]);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function selectTemplate(templateId) {
    const template = getPollTemplate(templateId);
    const matchingCategory = refs.categories.find(
      (category) => category.name?.toLowerCase() === template.category.toLowerCase()
    );
    setForm((current) => ({
      ...current,
      templateId,
      title: current.title === getPollTemplate(current.templateId).title ? template.title : current.title,
      description:
        current.description === getPollTemplate(current.templateId).description
          ? template.description
          : current.description,
      categoryId: matchingCategory?.id || "",
      ideas: initialIdeaRows(templateId),
    }));
  }

  function updateIdea(id, key, value) {
    setForm((current) => ({
      ...current,
      ideas: current.ideas.map((idea) => (idea.id === id ? { ...idea, [key]: value } : idea)),
    }));
  }

  function addIdea() {
    setForm((current) => ({
      ...current,
      ideas: [
        ...current.ideas,
        { id: localId("idea"), name: "", note: "" },
      ],
    }));
  }

  function removeIdea(id) {
    setForm((current) => ({
      ...current,
      ideas: current.ideas.filter((idea) => idea.id !== id),
    }));
  }

  async function ensureCategory() {
    if (form.categoryId) return form.categoryId;
    const existing = refs.categories.find(
      (category) => category.name?.toLowerCase() === selectedTemplate.category.toLowerCase()
    );
    if (existing) return existing.id;
    const response = await api.post("/category", {
      name: selectedTemplate.category,
      description: `${selectedTemplate.name} poll template`,
    });
    if (response.status >= 400) throw toApiError(response, "Failed to create poll category");
    return extractEntity(response, "category")?.id || null;
  }

  async function createOrReuseItem(idea, categoryId) {
    const payload = {
      name: idea.name,
      description: idea.note || `Idea for ${form.title}`,
      workgroupId: toOptionalValue(form.workgroupId),
      categoryId: toOptionalValue(categoryId),
      location: idea.note || idea.name,
    };
    const response = await api.post("/item", payload);
    if (response.status < 400) return extractEntity(response, "item");
    if (response.status !== 421) throw toApiError(response, `Failed to create ${idea.name}`);

    const lookupRes = await api.get("/item", {
      params: {
        page: 1,
        items: 10,
        filter: idea.name,
        workgroupId: form.workgroupId || undefined,
      },
    });
    if (lookupRes.status >= 400) throw toApiError(response, `Failed to create ${idea.name}`);
    const existing = extractCollection(lookupRes, "items").find(
      (item) => item.name?.toLowerCase() === idea.name.toLowerCase()
    );
    if (!existing) throw toApiError(response, `Failed to create ${idea.name}`);
    return existing;
  }

  async function createListWithFallback(categoryId) {
    const basePayload = {
      name: `${form.title} ideas`,
      description: `Options for ${form.title}`,
      workgroupId: toOptionalValue(form.workgroupId),
      categoryId: toOptionalValue(categoryId),
    };
    let response = await api.post("/list", basePayload);
    if (response.status === 421) {
      response = await api.post("/list", {
        ...basePayload,
        name: `${form.title} ideas ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`,
      });
    }
    if (response.status >= 400) throw toApiError(response, "Failed to create poll idea list");
    return extractEntity(response, "list");
  }

  async function publishPoll() {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (!canPublish) {
        throw new Error("Choose a template, add at least two ideas, choose an audience, and set an expiration.");
      }

      const categoryId = await ensureCategory();
      const itemIds = [];
      for (const idea of cleanIdeas) {
        const item = await createOrReuseItem(idea, categoryId);
        if (item?.id) itemIds.push(item.id);
      }

      const listId = (await createListWithFallback(categoryId))?.id;
      if (itemIds.length && listId) {
        const addRes = await api.post(`/list/${listId}/bulkitemadd`, { itemList: itemIds });
        if (addRes.status >= 400) throw toApiError(addRes, "Failed to attach ideas");
      }

      const pollRes = await api.post("/poll", {
        name: form.title,
        description: form.description || selectedTemplate.description,
        workgroupId: toOptionalValue(form.workgroupId),
        categoryId: toOptionalValue(categoryId),
        listId,
        groupId: form.audienceMode === "circle" ? toOptionalValue(form.groupId) : null,
        electionType: 2,
        expiration: form.expiration,
      });
      if (pollRes.status >= 400) throw toApiError(pollRes, "Failed to create poll");
      const poll = extractEntity(pollRes, "election");
      const pollId = poll?.id;

      if (form.startNow && pollId && form.groupId) {
        const startRes = await api.post(`/poll/${pollId}/start`);
        if (startRes.status >= 400) throw toApiError(startRes, "Poll saved, but could not start voting");
      }

      let shareUrl = "";
      if (form.publicAccess && pollId) {
        const publicRes = await api.post(`/poll/${pollId}/public/enable`, {
          publicAccessMode: form.allowGuestVotes ? "link_vote" : "link_view",
          guestVotingEnabled: form.allowGuestVotes,
          allowPlatformInvites: inviteEmails.length > 0,
        });
        if (publicRes.status >= 400) throw toApiError(publicRes, "Failed to create share link");
        shareUrl = publicRes.data?.data?.publicElection?.publicShareUrl || "";

        if (inviteEmails.length) {
          const inviteRes = await api.post(`/poll/${pollId}/invite`, { emails: inviteEmails });
          if (inviteRes.status >= 400) throw toApiError(inviteRes, "Failed to send email invites");
        }
      }

      const nextPublished = {
        pollId,
        title: form.title,
        shareUrl,
        smsBody: shareUrl ? `${form.title}: ${shareUrl}` : "",
      };
      setPublished(nextPublished);
      setSuccess("Poll published.");
      setStep(4);
    } catch (err) {
      setError(err.message || "Failed to publish poll");
    } finally {
      setSaving(false);
    }
  }

  async function copyShareText() {
    if (!published?.shareUrl) return;
    await navigator.clipboard?.writeText(`${published.title}: ${published.shareUrl}`);
    setSuccess("Share text copied.");
  }

  if (loading) return <Loading text="Loading poll builder..." />;

  return (
    <div className="screen-stack">
      <section className="surface-card poll-wizard">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Create Poll</p>
            <h2>Build a poll</h2>
          </div>
          <Link className="text-link" to="/app/polls">
            Poll feed
          </Link>
        </div>
        <div className="wizard-steps" aria-label="Poll creation steps">
          {STEPS.map((label, index) => (
            <button
              className={`wizard-step${index === step ? " wizard-step-active" : ""}${index < step ? " wizard-step-done" : ""}`}
              key={label}
              onClick={() => setStep(index)}
              type="button"
            >
              <span>{index + 1}</span>
              <strong>{label}</strong>
            </button>
          ))}
        </div>
        <ErrorBanner error={error} />
        <SuccessBanner message={success} />

        {step === 0 ? (
          <div className="wizard-panel">
            <div className="template-grid">
              {POLL_TEMPLATES.map((template) => (
                <button
                  className={`template-tile${form.templateId === template.id ? " template-tile-active" : ""}`}
                  key={template.id}
                  onClick={() => selectTemplate(template.id)}
                  type="button"
                >
                  <strong>{template.name}</strong>
                  <span>{template.title}</span>
                </button>
              ))}
            </div>
            <label className="field">
              <span>Poll title</span>
              <input value={form.title} onChange={(event) => updateField("title", event.target.value)} />
            </label>
            <label className="field">
              <span>Short note</span>
              <textarea rows="3" value={form.description} onChange={(event) => updateField("description", event.target.value)} />
            </label>
            <label className="field">
              <span>Category</span>
              <select value={form.categoryId} onChange={(event) => updateField("categoryId", event.target.value)}>
                <option value="">Use {selectedTemplate.category}</option>
                {refs.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="wizard-panel">
            <div className="card-list">
              {form.ideas.map((idea, index) => (
                <div className="idea-row" key={idea.id}>
                  <span className="idea-number">{index + 1}</span>
                  <input
                    aria-label={`Idea ${index + 1}`}
                    value={idea.name}
                    onChange={(event) => updateIdea(idea.id, "name", event.target.value)}
                    placeholder="Idea name"
                  />
                  <input
                    aria-label={`Idea ${index + 1} note`}
                    value={idea.note}
                    onChange={(event) => updateIdea(idea.id, "note", event.target.value)}
                    placeholder="Optional note"
                  />
                  <button className="btn btn-tonal" onClick={() => removeIdea(idea.id)} type="button">
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <button className="btn btn-secondary" onClick={addIdea} type="button">
              Add Idea
            </button>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="wizard-panel">
            <div className="segmented-control">
              <button className={form.audienceMode === "circle" ? "selected" : ""} onClick={() => updateField("audienceMode", "circle")} type="button">
                Circle
              </button>
              <button
                className={form.audienceMode === "public" ? "selected" : ""}
                onClick={() =>
                  setForm((current) => ({ ...current, audienceMode: "public", publicAccess: true }))
                }
                type="button"
              >
                Share link
              </button>
            </div>
            <label className="field">
              <span>Space</span>
              <select value={form.workgroupId} onChange={(event) => updateField("workgroupId", event.target.value)}>
                <option value="">All visible spaces</option>
                {refs.workgroups.map((workgroup) => (
                  <option key={workgroup.id} value={workgroup.id}>
                    {workgroup.name || workgroup.id}
                  </option>
                ))}
              </select>
            </label>
            {form.audienceMode === "circle" ? (
              <label className="field">
                <span>Circle</span>
                <select value={form.groupId} onChange={(event) => updateField("groupId", event.target.value)}>
                  <option value="">Choose a circle</option>
                  {refs.groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name || group.id}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <div className="empty-state">
                A public link is created after publishing. Add email invites in the next step or share the link by text.
              </div>
            )}
            <label className="field">
              <span>Expiration</span>
              <input type="datetime-local" value={form.expiration} onChange={(event) => updateField("expiration", event.target.value)} />
            </label>
            <div className="chip-row wrap-actions">
              <button className="btn btn-tonal" onClick={() => updateField("expiration", addDays(1))} type="button">
                1 Day
              </button>
              <button className="btn btn-tonal" onClick={() => updateField("expiration", addDays(3))} type="button">
                3 Days
              </button>
              <button className="btn btn-tonal" onClick={() => updateField("expiration", addDays(7))} type="button">
                1 Week
              </button>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="wizard-panel">
            <label className="toggle-field">
              <span>Create a public share link</span>
              <input checked={form.publicAccess} onChange={(event) => updateField("publicAccess", event.target.checked)} type="checkbox" />
            </label>
            <label className="toggle-field">
              <span>Let link visitors vote</span>
              <input checked={form.allowGuestVotes} disabled={!form.publicAccess} onChange={(event) => updateField("allowGuestVotes", event.target.checked)} type="checkbox" />
            </label>
            <label className="field">
              <span>Email invites</span>
              <textarea rows="3" value={form.inviteEmails} onChange={(event) => updateField("inviteEmails", event.target.value)} placeholder="name@example.com, friend@example.com" />
            </label>
            <label className="field">
              <span>SMS recipients</span>
              <textarea rows="3" value={form.smsNumbers} onChange={(event) => updateField("smsNumbers", event.target.value)} placeholder="Use the share text after publishing" />
            </label>
            <label className="toggle-field">
              <span>Start internal voting after publishing</span>
              <input checked={form.startNow} disabled={!form.groupId} onChange={(event) => updateField("startNow", event.target.checked)} type="checkbox" />
            </label>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="wizard-panel">
            {published ? (
              <>
                <div className="detail-grid">
                  <div>
                    <span className="detail-label">Poll</span>
                    <span>{published.title}</span>
                  </div>
                  <div>
                    <span className="detail-label">Ideas</span>
                    <span>{cleanIdeas.length}</span>
                  </div>
                  <div>
                    <span className="detail-label">Emails</span>
                    <span>{inviteEmails.length}</span>
                  </div>
                  <div>
                    <span className="detail-label">Link</span>
                    <span>{published.shareUrl || "Private"}</span>
                  </div>
                </div>
                <div className="split-actions wrap-actions">
                  <Link className="btn" to={`/app/statistics/${published.pollId}`}>
                    View Results
                  </Link>
                  <Link className="btn btn-secondary" to={`/app/cast-vote/${published.pollId}`}>
                    Vote
                  </Link>
                  {published.shareUrl ? (
                    <>
                      <button className="btn btn-tonal" onClick={copyShareText} type="button">
                        Copy Share Text
                      </button>
                      <a className="btn btn-tonal" href={`sms:?&body=${encodeURIComponent(published.smsBody)}`}>
                        Text Link
                      </a>
                    </>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="detail-grid">
                <div>
                  <span className="detail-label">Template</span>
                  <span>{selectedTemplate.name}</span>
                </div>
                <div>
                  <span className="detail-label">Ideas</span>
                  <span>{cleanIdeas.length}</span>
                </div>
                <div>
                  <span className="detail-label">Audience</span>
                  <span>{form.audienceMode === "circle" ? refs.groups.find((group) => group.id === form.groupId)?.name || "Choose a circle" : "Share link"}</span>
                </div>
                <div>
                  <span className="detail-label">Sharing</span>
                  <span>{form.publicAccess ? "Public link" : "Private"}</span>
                </div>
              </div>
            )}
          </div>
        ) : null}

        <div className="wizard-actions">
          <button className="btn btn-secondary" disabled={step === 0 || saving} onClick={() => setStep((current) => Math.max(current - 1, 0))} type="button">
            Back
          </button>
          {step < 4 ? (
            <button className="btn" disabled={saving} onClick={() => setStep((current) => Math.min(current + 1, 4))} type="button">
              Next
            </button>
          ) : (
            <button className="btn" disabled={saving || !canPublish || Boolean(published)} onClick={publishPoll} type="button">
              {saving ? "Publishing..." : published ? "Published" : "Publish Poll"}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
