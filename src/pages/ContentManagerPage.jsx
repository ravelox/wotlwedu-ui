import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Loading from "../components/Loading";
import { ErrorBanner, SuccessBanner } from "../components/Feedback";
import { extractCollection, extractEntity, toApiError } from "../lib/api";

const CONFIG = {
  image: {
    label: "Images",
    path: "/image",
    key: "images",
    singular: "image",
    supportsUpload: true,
  },
  item: {
    label: "Items",
    path: "/item",
    key: "items",
    singular: "item",
  },
  list: {
    label: "Lists",
    path: "/list",
    key: "lists",
    singular: "list",
  },
  election: {
    label: "Polls",
    path: "/election",
    key: "elections",
    singular: "election",
  },
};

const ELECTION_TYPE_OPTIONS = [
  { value: "0", label: "Ranked choice" },
  { value: "1", label: "Single choice" },
  { value: "2", label: "Approval" },
];

function emptyForm(kind, activeWorkgroupId) {
  if (kind === "image") {
    return {
      id: "",
      name: "",
      description: "",
      workgroupId: activeWorkgroupId || "",
      categoryId: "",
      imageFile: null,
    };
  }
  if (kind === "item") {
    return {
      id: "",
      name: "",
      description: "",
      workgroupId: activeWorkgroupId || "",
      categoryId: "",
      imageId: "",
      url: "",
      location: "",
    };
  }
  if (kind === "list") {
    return {
      id: "",
      name: "",
      description: "",
      workgroupId: activeWorkgroupId || "",
      categoryId: "",
      itemIds: [],
    };
  }
  return {
    id: "",
    name: "",
    description: "",
    workgroupId: activeWorkgroupId || "",
    categoryId: "",
    listId: "",
    groupId: "",
    imageId: "",
    electionType: "",
    expiration: "",
  };
}

function normalizeDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
}

function defaultExpirationValue() {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 16);
}

function summarizeRow(kind, row) {
  if (kind === "item") return row.location || row.url || row.description || "No summary";
  if (kind === "list") return row.description || `${row.items?.length || 0} items`;
  if (kind === "election") return row.description || row.expiration || "No summary";
  return row.description || row.filename || "No summary";
}

function toOptionalValue(value) {
  return value === "" ? null : value;
}

export default function ContentManagerPage({ api, activeWorkgroupId, kindOverride }) {
  const navigate = useNavigate();
  const { kind: routeKind, recordId } = useParams();
  const kind = kindOverride || routeKind;
  const config = CONFIG[kind];

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState([]);
  const [refs, setRefs] = useState({
    workgroups: [],
    categories: [],
    images: [],
    items: [],
    lists: [],
    groups: [],
  });
  const [form, setForm] = useState(() => emptyForm(kind, activeWorkgroupId));
  const [originalItemIds, setOriginalItemIds] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isElection = kind === "election";
  const selectedList = refs.lists.find((row) => row.id === form.listId) || null;
  const selectedGroup = refs.groups.find((row) => row.id === form.groupId) || null;
  const selectedImage = refs.images.find((row) => row.id === form.imageId) || null;
  const canStartPoll = Boolean(form.listId && form.groupId);

  async function loadRows() {
    const response = await api.get(config.path, {
      params: {
        page: 1,
        items: 100,
        workgroupId: activeWorkgroupId || undefined,
      },
    });
    if (response.status >= 400) {
      throw toApiError(response, `Failed to load ${config.label.toLowerCase()}`);
    }
    setRows(extractCollection(response, config.key));
  }

  async function loadRefs() {
    const endpoints = [
      api.get("/workgroup", { params: { page: 1, items: 100 } }),
      api.get("/category", { params: { page: 1, items: 100 } }),
      api.get("/image", { params: { page: 1, items: 100, workgroupId: activeWorkgroupId || undefined } }),
      api.get("/item", { params: { page: 1, items: 100, workgroupId: activeWorkgroupId || undefined } }),
      api.get("/list", { params: { page: 1, items: 100, workgroupId: activeWorkgroupId || undefined } }),
      api.get("/group", { params: { page: 1, items: 100 } }),
    ];

    const [workgroupsRes, categoriesRes, imagesRes, itemsRes, listsRes, groupsRes] =
      await Promise.all(endpoints);

    setRefs({
      workgroups: extractCollection(workgroupsRes, "workgroups"),
      categories: extractCollection(categoriesRes, "categories"),
      images: extractCollection(imagesRes, "images"),
      items: extractCollection(itemsRes, "items"),
      lists: extractCollection(listsRes, "lists"),
      groups: extractCollection(groupsRes, "groups"),
    });
  }

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function loadDetail() {
    if (!recordId || recordId === "add") {
      setForm(emptyForm(kind, activeWorkgroupId));
      setOriginalItemIds([]);
      return;
    }

    const response = await api.get(`${config.path}/${recordId}`, {
      params: kind === "list" ? { detail: "item,image" } : undefined,
    });
    if (response.status >= 400) {
      throw toApiError(response, `Failed to load ${config.singular}`);
    }
    const entity = extractEntity(response, config.singular);

    if (kind === "image") {
      setOriginalItemIds([]);
      setForm({
        id: entity?.id || "",
        name: entity?.name || "",
        description: entity?.description || "",
        workgroupId: entity?.workgroupId || activeWorkgroupId || "",
        categoryId: entity?.categoryId || "",
        imageFile: null,
      });
      return;
    }

    if (kind === "item") {
      setOriginalItemIds([]);
      setForm({
        id: entity?.id || "",
        name: entity?.name || "",
        description: entity?.description || "",
        workgroupId: entity?.workgroupId || activeWorkgroupId || "",
        categoryId: entity?.categoryId || "",
        imageId: entity?.imageId || "",
        url: entity?.url || "",
        location: entity?.location || "",
      });
      return;
    }

    if (kind === "list") {
      const itemIds = (entity?.items || []).map((item) => item.id);
      setOriginalItemIds(itemIds);
      setForm({
        id: entity?.id || "",
        name: entity?.name || "",
        description: entity?.description || "",
        workgroupId: entity?.workgroupId || activeWorkgroupId || "",
        categoryId: entity?.categoryId || "",
        itemIds,
      });
      return;
    }

    setOriginalItemIds([]);
    setForm({
      id: entity?.id || "",
      name: entity?.name || "",
      description: entity?.description || "",
      workgroupId: entity?.workgroupId || activeWorkgroupId || "",
      categoryId: entity?.categoryId || "",
      listId: entity?.listId || "",
      groupId: entity?.groupId || "",
      imageId: entity?.imageId || "",
      electionType: entity?.electionType ?? "",
      expiration: normalizeDateTime(entity?.expiration),
    });
  }

  useEffect(() => {
    if (!config) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      setSuccess("");
      try {
        await Promise.all([loadRows(), loadRefs(), loadDetail()]);
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load content");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [api, kind, recordId, activeWorkgroupId]);

  useEffect(() => {
    const isNewRecord = !recordId || recordId === "add";
    if (!isElection || !isNewRecord) return;

    setForm((current) => {
      const next = { ...current };
      let changed = false;

      if (!next.workgroupId && activeWorkgroupId) {
        next.workgroupId = activeWorkgroupId;
        changed = true;
      }
      if (!next.electionType) {
        next.electionType = ELECTION_TYPE_OPTIONS[0].value;
        changed = true;
      }
      if (!next.expiration) {
        next.expiration = defaultExpirationValue();
        changed = true;
      }
      if (!next.listId && refs.lists.length === 1) {
        next.listId = refs.lists[0].id;
        changed = true;
      }
      if (!next.groupId && refs.groups.length === 1) {
        next.groupId = refs.groups[0].id;
        changed = true;
      }

      return changed ? next : current;
    });
  }, [activeWorkgroupId, isElection, recordId, refs.groups, refs.lists]);

  async function uploadImageFile(imageId) {
    if (!form.imageFile || !imageId) return;

    const extension = form.imageFile.name.split(".").pop() || "jpg";
    const data = new FormData();
    data.append("imageUpload", form.imageFile);
    data.append("fileextension", extension);

    const response = await api.post(`/image/file/${imageId}`, data);
    if (response.status >= 400) {
      throw toApiError(response, "Failed to upload image file");
    }
  }

  async function syncListItems(listId, previousItemIds = []) {
    const nextIds = form.itemIds;
    const addIds = nextIds.filter((id) => !previousItemIds.includes(id));
    const removeIds = previousItemIds.filter((id) => !nextIds.includes(id));

    if (addIds.length > 0) {
      const response = await api.post(`/list/${listId}/bulkitemadd`, { itemList: addIds });
      if (response.status >= 400) throw toApiError(response, "Failed to add list items");
    }

    if (removeIds.length > 0) {
      const response = await api.post(`/list/${listId}/bulkitemdel`, { itemList: removeIds });
      if (response.status >= 400) throw toApiError(response, "Failed to remove list items");
    }
  }

  async function save(event, { startAfterSave = false } = {}) {
    event?.preventDefault?.();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      let response;
      const isEdit = Boolean(form.id);
      let createdId = form.id;

      if (kind === "image") {
        const payload = {
          name: form.name,
          description: form.description,
          workgroupId: toOptionalValue(form.workgroupId),
          categoryId: toOptionalValue(form.categoryId),
        };
        response = isEdit
          ? await api.put(`/image/${form.id}`, payload)
          : await api.post("/image", payload);
        if (response.status >= 400) throw toApiError(response, "Failed to save image");
        createdId = extractEntity(response, "image")?.id || form.id;
        await uploadImageFile(createdId);
      } else if (kind === "item") {
        const payload = {
          name: form.name,
          description: form.description,
          workgroupId: toOptionalValue(form.workgroupId),
          categoryId: toOptionalValue(form.categoryId),
          image: toOptionalValue(form.imageId),
          imageId: toOptionalValue(form.imageId),
          url: form.url || null,
          location: form.location || null,
        };
        response = isEdit
          ? await api.put(`/item/${form.id}`, payload)
          : await api.post("/item", payload);
        if (response.status >= 400) throw toApiError(response, "Failed to save item");
        createdId = extractEntity(response, "item")?.id || form.id;
      } else if (kind === "list") {
        const payload = {
          name: form.name,
          description: form.description,
          workgroupId: toOptionalValue(form.workgroupId),
          categoryId: toOptionalValue(form.categoryId),
        };
        response = isEdit
          ? await api.put(`/list/${form.id}`, payload)
          : await api.post("/list", payload);
        if (response.status >= 400) throw toApiError(response, "Failed to save list");
        createdId = extractEntity(response, "list")?.id || form.id;
        await syncListItems(createdId, isEdit ? originalItemIds : []);
        setOriginalItemIds(form.itemIds);
      } else {
        const payload = {
          name: form.name,
          description: form.description,
          workgroupId: toOptionalValue(form.workgroupId),
          categoryId: toOptionalValue(form.categoryId),
          listId: toOptionalValue(form.listId),
          groupId: toOptionalValue(form.groupId),
          electionType: form.electionType === "" ? null : Number(form.electionType),
          expiration: form.expiration || null,
        };
        response = isEdit
          ? await api.put(`/election/${form.id}`, {
              ...payload,
              imageId: toOptionalValue(form.imageId),
            })
          : await api.post("/election", payload);
        if (response.status >= 400) throw toApiError(response, "Failed to save election");
        createdId = extractEntity(response, "election")?.id || form.id;
        if (!isEdit && form.imageId) {
          const patchRes = await api.put(`/election/${createdId}`, {
            imageId: form.imageId,
            workgroupId: toOptionalValue(form.workgroupId),
          });
          if (patchRes.status >= 400) throw toApiError(patchRes, "Failed to attach election image");
        }

        if (startAfterSave) {
          if (!payload.listId || !payload.groupId) {
            throw new Error("Select both a list and an audience group before starting the poll.");
          }
          const startRes = await api.post(`/election/${createdId}/start`);
          if (startRes.status >= 400) throw toApiError(startRes, "Failed to start poll");
        }
      }

      setSuccess(
        startAfterSave && isElection ? "Poll saved and started." : `${config.singular} saved.`
      );
      navigate(
        startAfterSave && isElection ? "/app/cast-vote" : `/app/${kind}/${createdId || "add"}`,
        { replace: true }
      );
      await Promise.all([loadRows(), loadRefs(), loadDetail()]);
    } catch (err) {
      setError(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!form.id) return;
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.delete(`${config.path}/${form.id}`);
      if (response.status >= 400) throw toApiError(response, `Failed to delete ${config.singular}`);
      setSuccess(`${config.singular} deleted.`);
      navigate(`/app/${kind}/add`, { replace: true });
      setForm(emptyForm(kind, activeWorkgroupId));
      setOriginalItemIds([]);
      await loadRows();
    } catch (err) {
      setError(err.message || "Failed to delete");
    } finally {
      setSaving(false);
    }
  }

  if (!config) {
    return (
      <div className="screen-stack">
        <div className="empty-state">Unsupported content type.</div>
      </div>
    );
  }

  if (loading) return <Loading text={`Loading ${config.label.toLowerCase()}...`} />;

  return (
    <div className="screen-stack">
      <section className="surface-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Create</p>
            <h2>{config.label}</h2>
          </div>
          <Link className="text-link" to={`/app/${kind}/add`}>
            New {config.singular}
          </Link>
        </div>
        <div className="resource-strip">
          {Object.keys(CONFIG).map((key) => (
            <Link
              className={`resource-chip${key === kind ? " resource-chip-active" : ""}`}
              key={key}
              to={`/app/${key}/add`}
            >
              {CONFIG[key].label}
            </Link>
          ))}
        </div>
        <div className="card-list">
          {rows.length === 0 ? (
            <div className="empty-state">No {config.label.toLowerCase()} available yet.</div>
          ) : (
            rows.map((row) => (
              <button
                className={`list-card preference-row${form.id === row.id ? " preference-row-active" : ""}`}
                key={row.id}
                onClick={() => navigate(`/app/${kind}/${row.id}`)}
                type="button"
              >
                <strong>{row.name || row.id}</strong>
                <p>{summarizeRow(kind, row)}</p>
              </button>
            ))
          )}
        </div>
      </section>

      <section className="surface-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Editor</p>
            <h3>{form.id ? `Edit ${config.singular}` : `New ${config.singular}`}</h3>
          </div>
        </div>
        <ErrorBanner error={error} />
        <SuccessBanner message={success} />
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
              required
            />
          </label>
          <label className="field">
            <span>Workgroup</span>
            <select
              value={form.workgroupId}
              onChange={(event) => updateField("workgroupId", event.target.value)}
            >
              <option value="">Unscoped</option>
              {refs.workgroups.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name || row.id}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Category</span>
            <select
              value={form.categoryId}
              onChange={(event) => updateField("categoryId", event.target.value)}
            >
              <option value="">None</option>
              {refs.categories.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name || row.id}
                </option>
              ))}
            </select>
          </label>

          {kind === "image" ? (
            <label className="field">
              <span>Image File</span>
              <input
                accept="image/png,image/jpeg,image/jpg"
                onChange={(event) => updateField("imageFile", event.target.files?.[0] || null)}
                type="file"
              />
            </label>
          ) : null}

          {kind === "item" ? (
            <>
              <label className="field">
                <span>Image</span>
                <select
                  value={form.imageId}
                  onChange={(event) => updateField("imageId", event.target.value)}
                >
                  <option value="">None</option>
                  {refs.images.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.name || row.id}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>URL</span>
                <input
                  value={form.url}
                  onChange={(event) => updateField("url", event.target.value)}
                />
              </label>
              <label className="field">
                <span>Location</span>
                <input
                  value={form.location}
                  onChange={(event) => updateField("location", event.target.value)}
                />
              </label>
            </>
          ) : null}

          {kind === "list" ? (
            <label className="field">
              <span>Items</span>
              <div className="selection-grid">
                {refs.items.map((row) => (
                  <label className="toggle-field" key={row.id}>
                    <span>{row.name || row.id}</span>
                    <input
                      checked={form.itemIds.includes(row.id)}
                      onChange={(event) =>
                        updateField(
                          "itemIds",
                          event.target.checked
                            ? [...form.itemIds, row.id]
                            : form.itemIds.filter((id) => id !== row.id)
                        )
                      }
                      type="checkbox"
                    />
                  </label>
                ))}
              </div>
            </label>
          ) : null}

          {kind === "election" ? (
            <>
              <div className="detail-grid">
                <div>
                  <span className="detail-label">What people vote on</span>
                  <span>{selectedList?.name || "Choose a list"}</span>
                </div>
                <div>
                  <span className="detail-label">Who can vote</span>
                  <span>{selectedGroup?.name || "Choose an audience group"}</span>
                </div>
                <div>
                  <span className="detail-label">Type</span>
                  <span>
                    {ELECTION_TYPE_OPTIONS.find((option) => option.value === String(form.electionType))?.label ||
                      "Choose a poll type"}
                  </span>
                </div>
                <div>
                  <span className="detail-label">Cover image</span>
                  <span>{selectedImage?.name || "Optional"}</span>
                </div>
              </div>
              <label className="field">
                <span>List</span>
                <select
                  value={form.listId}
                  onChange={(event) => updateField("listId", event.target.value)}
                >
                  <option value="">None</option>
                  {refs.lists.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.name || row.id}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Audience Group</span>
                <select
                  value={form.groupId}
                  onChange={(event) => updateField("groupId", event.target.value)}
                >
                  <option value="">None</option>
                  {refs.groups.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.name || row.id}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Image</span>
                <select
                  value={form.imageId}
                  onChange={(event) => updateField("imageId", event.target.value)}
                >
                  <option value="">None</option>
                  {refs.images.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.name || row.id}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Poll Type</span>
                <select
                  value={form.electionType}
                  onChange={(event) => updateField("electionType", event.target.value)}
                >
                  {ELECTION_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Expiration</span>
                <input
                  type="datetime-local"
                  value={form.expiration}
                  onChange={(event) => updateField("expiration", event.target.value)}
                />
              </label>
            </>
          ) : null}

          <div className="split-actions">
            <button className="btn" disabled={saving} type="submit">
              {saving ? "Saving..." : isElection ? "Save Draft" : "Save"}
            </button>
            {isElection ? (
              <button
                className="btn btn-secondary"
                disabled={saving || !canStartPoll}
                onClick={(event) => save(event, { startAfterSave: true })}
                type="button"
              >
                {saving ? "Saving..." : "Save & Start"}
              </button>
            ) : null}
            {form.id ? (
              <button className="btn btn-danger" disabled={saving} onClick={remove} type="button">
                Delete
              </button>
            ) : null}
          </div>
        </form>
      </section>
    </div>
  );
}
