export const CREATE_POLL_DRAFT_STORAGE_KEY = "wotlwedu_ui_create_poll_draft";

export function readStoredCreatePollDraft() {
  try {
    const raw = localStorage.getItem(CREATE_POLL_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function saveCreatePollDraft(form) {
  try {
    localStorage.setItem(CREATE_POLL_DRAFT_STORAGE_KEY, JSON.stringify({
      ...form,
      savedAt: new Date().toISOString(),
    }));
  } catch {
    // Draft persistence is a convenience only.
  }
}

export function clearStoredCreatePollDraft() {
  try {
    localStorage.removeItem(CREATE_POLL_DRAFT_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
