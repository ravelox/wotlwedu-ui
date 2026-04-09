import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Loading from "../components/Loading";
import { ErrorBanner, SuccessBanner } from "../components/Feedback";
import { extractCollection, extractEntity, toApiError } from "../lib/api";

function emptyForm(organizationId = "") {
  return {
    id: "",
    organizationId,
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

export default function WorkgroupsPage({ api, session, activeWorkgroupId, onChangeActiveWorkgroupId }) {
  const { recordId } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workgroups, setWorkgroups] = useState([]);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [form, setForm] = useState(emptyForm(session?.organizationId || ""));
  const [selectedWorkgroupId, setSelectedWorkgroupId] = useState("");
  const [originalMemberIds, setOriginalMemberIds] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canCreateWorkgroup = session?.systemAdmin === true || session?.organizationAdmin === true;
  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === form.categoryId) || null,
    [categories, form.categoryId]
  );
  const selectedOrganization = useMemo(
    () => organizations.find((organization) => organization.id === form.organizationId) || null,
    [form.organizationId, organizations]
  );

  async function loadLookups() {
    const requests = [
      api.get("/category", { params: { page: 1, items: 200 } }),
      session?.systemAdmin === true
        ? api.get("/organization", { params: { page: 1, items: 200 } })
        : api.get(`/organization/${session.organizationId}`),
      session?.organizationId
        ? api.get(`/organization/${session.organizationId}/membership`)
        : api.get("/user", { params: { page: 1, items: 200 } }),
    ];

    const [categoryRes, organizationRes, userRes] = await Promise.all(requests);
    if (categoryRes.status >= 400) throw toApiError(categoryRes, "Failed to load categories");
    if (organizationRes.status >= 400) throw toApiError(organizationRes, "Failed to load organizations");
    if (userRes.status >= 400) throw toApiError(userRes, "Failed to load available members");

    setCategories(extractCollection(categoryRes, "categories"));
    setOrganizations(
      session?.systemAdmin === true
        ? extractCollection(organizationRes, "organizations")
        : [extractEntity(organizationRes, "organization")].filter(Boolean)
    );

    const membershipUsers =
      userRes.data?.data?.membership?.members ||
      userRes.data?.membership?.members ||
      extractCollection(userRes, "users");
    setUsers(ensureArray(membershipUsers));
  }

  async function loadWorkgroups(targetWorkgroupId) {
    const response = await api.get("/workgroup", {
      params: {
        page: 1,
        items: 200,
        detail: "user,category",
        organizationId: session?.systemAdmin ? form.organizationId || undefined : undefined,
      },
    });
    if (response.status >= 400) {
      throw toApiError(response, "Failed to load workgroups");
    }

    const nextWorkgroups = extractCollection(response, "workgroups");
    setWorkgroups(nextWorkgroups);

    if (!nextWorkgroups.length) {
      setSelectedWorkgroupId("");
      setForm(emptyForm(session?.organizationId || ""));
      setOriginalMemberIds([]);
      return;
    }

    const nextId =
      targetWorkgroupId && nextWorkgroups.some((workgroup) => workgroup.id === targetWorkgroupId)
        ? targetWorkgroupId
        : selectedWorkgroupId && nextWorkgroups.some((workgroup) => workgroup.id === selectedWorkgroupId)
          ? selectedWorkgroupId
          : nextWorkgroups[0].id;

    await selectWorkgroup(nextId, nextWorkgroups);
  }

  async function selectWorkgroup(workgroupId, workgroupList = workgroups) {
    if (!workgroupId) {
      setSelectedWorkgroupId("");
      setForm(emptyForm(session?.organizationId || ""));
      setOriginalMemberIds([]);
      return;
    }

    const cached = ensureArray(workgroupList).find((workgroup) => workgroup.id === workgroupId);
    let detailEntity = cached;

    if (!cached?.users || !cached?.category) {
      const response = await api.get(`/workgroup/${workgroupId}`, {
        params: { detail: "user,category" },
      });
      if (response.status >= 400) {
        throw toApiError(response, "Failed to load workgroup");
      }
      detailEntity = extractEntity(response, "workgroup");
    }

    setSelectedWorkgroupId(workgroupId);
    setForm({
      id: detailEntity?.id || "",
      organizationId: detailEntity?.organizationId || session?.organizationId || "",
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
        await Promise.all([
          loadLookups(),
          loadWorkgroups(recordId && recordId !== "add" ? recordId : ""),
        ]);
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load workgroups");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [api, form.organizationId, recordId, session?.organizationId, session?.systemAdmin]);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function syncMembers(workgroupId, previousIds = []) {
    const nextIds = ensureArray(form.memberIds);
    const priorIds = ensureArray(previousIds);
    const addIds = nextIds.filter((id) => !priorIds.includes(id));
    const removeIds = priorIds.filter((id) => !nextIds.includes(id));

    if (addIds.length) {
      const response = await api.put(`/workgroup/${workgroupId}/bulkuseradd`, {
        userList: addIds,
      });
      if (response.status >= 400) {
        throw toApiError(response, "Failed to add workgroup members");
      }
    }

    if (removeIds.length) {
      const response = await api.put(`/workgroup/${workgroupId}/bulkuserdel`, {
        userList: removeIds,
      });
      if (response.status >= 400) {
        throw toApiError(response, "Failed to remove workgroup members");
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
        organizationId: form.organizationId || session?.organizationId || null,
        name: form.name,
        description: form.description,
        categoryId: form.categoryId || null,
      };

      const response = form.id
        ? await api.put(`/workgroup/${form.id}`, payload)
        : await api.post("/workgroup", payload);
      if (response.status >= 400) {
        throw toApiError(response, "Failed to save workgroup");
      }

      const savedWorkgroupId = extractEntity(response, "workgroup")?.id || form.id;
      await syncMembers(savedWorkgroupId, form.id ? originalMemberIds : []);
      await loadWorkgroups(savedWorkgroupId);
      if (!activeWorkgroupId && savedWorkgroupId) {
        onChangeActiveWorkgroupId?.(savedWorkgroupId);
      }
      setSuccess(form.id ? "Workgroup updated." : "Workgroup created.");
    } catch (err) {
      setError(err.message || "Failed to save workgroup");
    } finally {
      setSaving(false);
    }
  }

  async function removeWorkgroup() {
    if (!form.id) return;
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.delete(`/workgroup/${form.id}`);
      if (response.status >= 400) {
        throw toApiError(response, "Failed to delete workgroup");
      }
      if (activeWorkgroupId === form.id) {
        onChangeActiveWorkgroupId?.(null);
      }
      setSuccess("Workgroup deleted.");
      setSelectedWorkgroupId("");
      setForm(emptyForm(session?.organizationId || ""));
      setOriginalMemberIds([]);
      await loadWorkgroups("");
    } catch (err) {
      setError(err.message || "Failed to delete workgroup");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loading text="Loading workgroups..." />;

  return (
    <div className="screen-stack">
      <section className="surface-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Workgroups</p>
            <h2>Workgroup Management</h2>
          </div>
          <button
            className="btn btn-tonal"
            disabled={!canCreateWorkgroup}
            onClick={() => {
              setSelectedWorkgroupId("");
              setForm(emptyForm(session?.organizationId || ""));
              setOriginalMemberIds([]);
              setSuccess("");
              setError("");
            }}
            type="button"
          >
            New Workgroup
          </button>
        </div>
        <ErrorBanner error={error} />
        <SuccessBanner message={success} />
        <div className="card-list">
          {workgroups.length === 0 ? (
            <div className="empty-state">No workgroups created yet.</div>
          ) : (
            workgroups.map((workgroup) => (
              <button
                className={`list-card preference-row${selectedWorkgroupId === workgroup.id ? " preference-row-active" : ""}`}
                key={workgroup.id}
                onClick={() => selectWorkgroup(workgroup.id)}
                type="button"
              >
                <div className="section-heading compact">
                  <div>
                    <strong>{workgroup.name || workgroup.id}</strong>
                    {workgroup.description ? <p>{workgroup.description}</p> : null}
                  </div>
                  <span className="chip">{ensureArray(workgroup.users).length} members</span>
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
            <h3>{form.id ? "Edit workgroup" : "Create workgroup"}</h3>
          </div>
        </div>
        <form className="stack-form" onSubmit={save}>
          {session?.systemAdmin === true ? (
            <label className="field">
              <span>Organization</span>
              <select
                value={form.organizationId}
                onChange={(event) => updateField("organizationId", event.target.value)}
              >
                <option value="">Select organization</option>
                {organizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.name || organization.id}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
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
              <span className="detail-label">Organization</span>
              <span>{selectedOrganization?.name || session?.organizationId || "Not set"}</span>
            </div>
            <div>
              <span className="detail-label">Category</span>
              <span>{selectedCategory?.name || "None"}</span>
            </div>
            <div>
              <span className="detail-label">Members</span>
              <span>{ensureArray(form.memberIds).length}</span>
            </div>
            <div>
              <span className="detail-label">Active Scope</span>
              <span>{activeWorkgroupId || "All visible workgroups"}</span>
            </div>
          </div>

          <label className="field">
            <span>Members</span>
            {users.length === 0 ? (
              <div className="empty-state">No eligible users are available for this workgroup.</div>
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
            <button
              className="btn"
              disabled={saving || (!canCreateWorkgroup && !form.id)}
              type="submit"
            >
              {saving ? "Saving..." : form.id ? "Save Workgroup" : "Create Workgroup"}
            </button>
            {form.id ? (
              <button className="btn btn-secondary" onClick={() => onChangeActiveWorkgroupId?.(form.id)} type="button">
                Set Active Scope
              </button>
            ) : null}
            {form.id ? (
              <button className="btn btn-danger" disabled={saving} onClick={removeWorkgroup} type="button">
                Delete Workgroup
              </button>
            ) : null}
            <Link className="text-link" to="/app/group/add">
              Create Audience Group
            </Link>
            <Link className="text-link" to="/app/election/add">
              Create Poll
            </Link>
          </div>
        </form>
      </section>
    </div>
  );
}
