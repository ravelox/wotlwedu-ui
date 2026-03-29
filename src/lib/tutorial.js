import { toApiError } from "./api";

export async function getPollTutorial(api) {
  const response = await api.get("/tutorial/poll");
  if (response.status === 404) return null;
  if (response.status >= 400) throw toApiError(response, "Failed to load tutorial");
  return response.data?.data?.tutorial || response.data?.tutorial || null;
}

export async function startPollTutorial(api, options = {}) {
  const response = await api.post("/tutorial/poll/start", options);
  if (response.status >= 400) throw toApiError(response, "Failed to start tutorial");
  return response.data?.data?.tutorial || response.data?.tutorial || null;
}

export function getRelevantTutorialStep(tutorial, keys = []) {
  if (!tutorial?.steps?.length) return null;
  return tutorial.steps.find((step) => keys.includes(step.key) && step.complete !== true) || null;
}

export function getTutorialStepStatus(tutorial, key) {
  return tutorial?.steps?.find((step) => step.key === key) || null;
}
