import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useParams } from "react-router-dom";
import Loading from "../components/Loading";
import { ErrorBanner, SuccessBanner } from "../components/Feedback";
import { extractCollection, extractEntity, toApiError } from "../lib/api";
import TutorialPanel from "../components/TutorialPanel";
import { getPollTutorial, getRelevantTutorialStep } from "../lib/tutorial";
import PeoplePicker from "../components/PeoplePicker";

function emptyForm() {
  return {
    id: "",
    name: "",
    description: "",
    categoryId: "",
    memberIds: [],
  };
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

export default function AudienceGroupsPage({ api, session }) {
  const { recordId } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [groups, setGroups] = useState([]);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [originalMemberIds, setOriginalMemberIds] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [tutorial, setTutorial] = useState(null);
  const isNewRecord = !recordId || recordId === "add";
  const tutorialStep = getRelevantTutorialStep(
    tutorial,
    ["create_audience", "add_yourself_to_audience"]
  );

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === form.categoryId) || null,
    [categories, form.categoryId]
  );

  async function loadLookups() {
    const requests = [api.get("/category", { params: { page: 1, items: 200 } })];

    if (session?.organizationId) {
      requests.push(api.get(`/organization/${session.organizationId}/membership`));
    } else {
      requests.push(api.get("/person", { params: { page: 1, items: 200 } }));
    }

    const [categoryRes, userRes] = await Promise.all(requests);
    if (categoryRes.status >= 400) {
      throw toApiError(categoryRes, "Failed to load categories");
    }
    if (userRes.status >= 400) {
      throw toApiError(userRes, "Failed to load available members");
    }

      setCategories(extractCollection(categoryRes, "categories"));

    const membershipUsers =
      userRes.data?.data?.membership?.members ||
      userRes.data?.membership?.members ||
      extractCollection(userRes, "users");
    setUsers(ensureArray(membershipUsers));
  }

  async function loadGroups(targetGroupId) {
    const response = await api.get("/circle", {
      params: { page: 1, items: 200, detail: "user,category" },
    });
    if (response.status >= 400) {
      throw toApiError(response, "Failed to load circles");
    }

    const nextGroups = extractCollection(response, "groups");
    setGroups(nextGroups);

    if (!nextGroups.length) {
      setSelectedGroupId("");
      setForm(emptyForm());
      setOriginalMemberIds([]);
      return;
    }

    const nextId =
      targetGroupId && nextGroups.some((group) => group.id === targetGroupId)
        ? targetGroupId
        : selectedGroupId && nextGroups.some((group) => group.id === selectedGroupId)
          ? selectedGroupId
          : nextGroups[0].id;

    await selectGroup(nextId, nextGroups);
  }

  async function selectGroup(groupId, groupList = groups) {
    if (!groupId) {
      setSelectedGroupId("");
      setForm(emptyForm());
      setOriginalMemberIds([]);
      return;
    }

    const cached = ensureArray(groupList).find((group) => group.id === groupId);
    let detailEntity = cached;

    if (!cached?.users || !cached?.category) {
      const response = await api.get(`/circle/${groupId}`, { params: { detail: "user,category" } });
      if (response.status >= 400) {
        throw toApiError(response, "Failed to load circle");
      }
      detailEntity = extractEntity(response, "group");
    }

    setSelectedGroupId(groupId);
    setForm({
      id: detailEntity?.id || "",
      name: detailEntity?.name || "",
      description: detailEntity?.description || "",
      categoryId: detailEntity?.category?.id || detailEntity?.categoryId || "",
      memberIds: ensureArray(detailEntity?.users).map((user) => user.id).filter(Boolean),
    });
    setOriginalMemberIds(
      ensureArray(detailEntity?.users).map((user) => user.id).filter(Boolean)
    );
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const tutorialValue = await getPollTutorial(api);
        if (!cancelled) setTutorial(tutorialValue);
        await Promise.all([loadLookups(), loadGroups(recordId && recordId !== "add" ? recordId : "")]);
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load circles");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [api, recordId, session?.organizationId]);

  useEffect(() => {
    if (!isNewRecord || !tutorial?.names?.groupName) return;
    setForm((current) => {
      if (current.name) return current;
      return { ...current, name: tutorial.names.groupName };
    });
  }, [isNewRecord, tutorial]);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function syncMembers(groupId, previousIds = []) {
    const nextIds = ensureArray(form.memberIds);
    const priorIds = ensureArray(previousIds);
    const addIds = nextIds.filter((id) => !priorIds.includes(id));
    const removeIds = priorIds.filter((id) => !nextIds.includes(id));

    if (addIds.length) {
      const response = await api.put(`/circle/${groupId}/bulkpersonadd`, { personList: addIds });
      if (response.status >= 400) {
        throw toApiError(response, "Failed to add circle members");
      }
    }

    if (removeIds.length) {
      const response = await api.put(`/circle/${groupId}/bulkpersondel`, { personList: removeIds });
      if (response.status >= 400) {
        throw toApiError(response, "Failed to remove circle members");
      }
    }
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        name: form.name,
        description: form.description,
        categoryId: form.categoryId || null,
      };

      const response = form.id
        ? await api.put(`/circle/${form.id}`, payload)
        : await api.post("/circle", payload);
      if (response.status >= 400) {
        throw toApiError(response, "Failed to save circle");
      }

      const savedGroupId = extractEntity(response, "group")?.id || form.id;
      await syncMembers(savedGroupId, form.id ? originalMemberIds : []);
      await loadGroups(savedGroupId);
      setSuccess(form.id ? "Circle updated." : "Circle created.");
    } catch (err) {
      setError(err.message || "Failed to save circle");
    } finally {
      setSaving(false);
    }
  }

  async function removeGroup() {
    if (!form.id) return;
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.delete(`/circle/${form.id}`);
      if (response.status >= 400) {
        throw toApiError(response, "Failed to delete circle");
      }
      setSuccess("Circle deleted.");
      setSelectedGroupId("");
      setForm(emptyForm());
      setOriginalMemberIds([]);
      await loadGroups("");
    } catch (err) {
      setError(err.message || "Failed to delete circle");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loading text="Loading circles..." />;

  return (
    <div className="screen-stack">
      {tutorial ? <TutorialPanel tutorial={tutorial} compact title="Poll tutorial" /> : null}
      <section className="surface-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Circle</p>
            <h2>Circles</h2>
          </div>
          <div className="split-actions">
            <Link className="text-link" to="/app/space">
              Manage Spaces
            </Link>
            <button
              className="btn btn-tonal"
              onClick={() => {
                setSelectedGroupId("");
                setForm(emptyForm());
                setOriginalMemberIds([]);
                setSuccess("");
                setError("");
              }}
              type="button"
            >
              New Circle
            </button>
          </div>
        </div>
        <ErrorBanner error={error} />
        <SuccessBanner message={success} />
        {tutorialStep ? (
          <div className="tutorial-inline-hint">
            <strong>{tutorialStep.title}</strong>
            <p>{tutorialStep.detail}</p>
            {tutorialStep.suggestedName ? (
              <div className="chip-row">
                <span className="chip">Suggested name</span>
                <span className="chip chip-soft">{tutorialStep.suggestedName}</span>
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="card-list">
          {groups.length === 0 ? (
            <div className="empty-state">No circles created yet.</div>
          ) : (
            groups.map((group) => (
              <button
                className={`list-card preference-row${selectedGroupId === group.id ? " preference-row-active" : ""}`}
                key={group.id}
                onClick={() => selectGroup(group.id)}
                type="button"
              >
                <div className="section-heading compact">
                  <div>
                    <strong>{group.name || group.id}</strong>
                    {group.description ? <p>{group.description}</p> : null}
                  </div>
                  <span className="chip">{ensureArray(group.users).length} members</span>
                </div>
              </button>
            ))
          )}
        </div>
      </section>

      <section className="surface-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Editor</p>
            <h3>{form.id ? "Edit circle" : "Create circle"}</h3>
          </div>
        </div>
        <form className="stack-form" onSubmit={save}>
          <label className="field">
            <span>Name</span>
            <input
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>Description</span>
            <textarea
              rows="4"
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
            />
          </label>
          <label className="field">
            <span>Category</span>
            <select
              value={form.categoryId}
              onChange={(event) => updateField("categoryId", event.target.value)}
            >
              <option value="">None</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name || category.id}
                </option>
              ))}
            </select>
          </label>

          <div className="detail-grid">
            <div>
              <span className="detail-label">Category</span>
              <span>{selectedCategory?.name || "None"}</span>
            </div>
            <div>
              <span className="detail-label">Members</span>
              <span>{ensureArray(form.memberIds).length}</span>
            </div>
          </div>

          <label className="field">
            <span>Members</span>
            <PeoplePicker
              disabled={saving}
              emptyText="No eligible people are available for this circle."
              onSelectedIdsChange={(memberIds) => updateField("memberIds", memberIds)}
              people={users}
              selectedIds={form.memberIds}
              title="Circle members"
            />
          </label>

          <div className="split-actions wrap-actions">
            <button className="btn" disabled={saving} type="submit">
              {saving ? "Saving..." : form.id ? "Save Circle" : "Create Circle"}
            </button>
            {form.id ? (
              <button
                aria-label="Delete circle"
                className="btn btn-danger btn-icon-delete"
                disabled={saving}
                onClick={removeGroup}
                title="Delete circle"
                type="button"
              >
                Delete Circle
              </button>
            ) : null}
            <Link className="text-link" to="/app/poll/add">
              Use in a poll
            </Link>
          </div>
        </form>
      </section>
    </div>
  );
}
