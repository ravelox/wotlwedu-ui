import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useParams } from "react-router-dom";
import Loading from "../components/Loading";
import { ErrorBanner, SuccessBanner } from "../components/Feedback";
import { extractCollection, extractEntity, toApiError } from "../lib/api";

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

function displayUserName(user) {
  return user?.fullName || user?.alias || user?.email || user?.id || "Unknown user";
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

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === form.categoryId) || null,
    [categories, form.categoryId]
  );

  async function loadLookups() {
    const requests = [api.get("/category", { params: { page: 1, items: 200 } })];

    if (session?.organizationId) {
      requests.push(api.get(`/organization/${session.organizationId}/membership`));
    } else {
      requests.push(api.get("/user", { params: { page: 1, items: 200 } }));
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
    const response = await api.get("/group", {
      params: { page: 1, items: 200, detail: "user,category" },
    });
    if (response.status >= 400) {
      throw toApiError(response, "Failed to load audience groups");
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
      const response = await api.get(`/group/${groupId}`, { params: { detail: "user,category" } });
      if (response.status >= 400) {
        throw toApiError(response, "Failed to load audience group");
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
        await Promise.all([loadLookups(), loadGroups(recordId && recordId !== "add" ? recordId : "")]);
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load audience groups");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [api, recordId, session?.organizationId]);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function syncMembers(groupId, previousIds = []) {
    const nextIds = ensureArray(form.memberIds);
    const priorIds = ensureArray(previousIds);
    const addIds = nextIds.filter((id) => !priorIds.includes(id));
    const removeIds = priorIds.filter((id) => !nextIds.includes(id));

    if (addIds.length) {
      const response = await api.put(`/group/${groupId}/bulkuseradd`, { userList: addIds });
      if (response.status >= 400) {
        throw toApiError(response, "Failed to add audience members");
      }
    }

    if (removeIds.length) {
      const response = await api.put(`/group/${groupId}/bulkuserdel`, { userList: removeIds });
      if (response.status >= 400) {
        throw toApiError(response, "Failed to remove audience members");
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
        ? await api.put(`/group/${form.id}`, payload)
        : await api.post("/group", payload);
      if (response.status >= 400) {
        throw toApiError(response, "Failed to save audience group");
      }

      const savedGroupId = extractEntity(response, "group")?.id || form.id;
      await syncMembers(savedGroupId, form.id ? originalMemberIds : []);
      await loadGroups(savedGroupId);
      setSuccess(form.id ? "Audience group updated." : "Audience group created.");
    } catch (err) {
      setError(err.message || "Failed to save audience group");
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
      const response = await api.delete(`/group/${form.id}`);
      if (response.status >= 400) {
        throw toApiError(response, "Failed to delete audience group");
      }
      setSuccess("Audience group deleted.");
      setSelectedGroupId("");
      setForm(emptyForm());
      setOriginalMemberIds([]);
      await loadGroups("");
    } catch (err) {
      setError(err.message || "Failed to delete audience group");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loading text="Loading audience groups..." />;

  return (
    <div className="screen-stack">
      <section className="surface-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Audience</p>
            <h2>Audience Groups</h2>
          </div>
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
            New Group
          </button>
        </div>
        <ErrorBanner error={error} />
        <SuccessBanner message={success} />
        <div className="card-list">
          {groups.length === 0 ? (
            <div className="empty-state">No audience groups created yet.</div>
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
            <h3>{form.id ? "Edit audience group" : "Create audience group"}</h3>
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
            {users.length === 0 ? (
              <div className="empty-state">No eligible users are available for this audience group.</div>
            ) : (
              <div className="selection-grid">
                {users.map((user) => (
                  <label className="toggle-field" key={user.id}>
                    <span>{displayUserName(user)}</span>
                    <input
                      checked={ensureArray(form.memberIds).includes(user.id)}
                      onChange={(event) =>
                        updateField(
                          "memberIds",
                          event.target.checked
                            ? [...ensureArray(form.memberIds), user.id]
                            : ensureArray(form.memberIds).filter((id) => id !== user.id)
                        )
                      }
                      type="checkbox"
                    />
                  </label>
                ))}
              </div>
            )}
          </label>

          <div className="split-actions wrap-actions">
            <button className="btn" disabled={saving} type="submit">
              {saving ? "Saving..." : form.id ? "Save Group" : "Create Group"}
            </button>
            {form.id ? (
              <button className="btn btn-danger" disabled={saving} onClick={removeGroup} type="button">
                Delete Group
              </button>
            ) : null}
            <Link className="text-link" to="/app/election/add">
              Use in a poll
            </Link>
          </div>
        </form>
      </section>
    </div>
  );
}
