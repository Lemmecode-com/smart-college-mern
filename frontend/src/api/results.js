import api from "./axios";

const BASE = "/results";

export const generateResult = (data) =>
  api.post(`${BASE}/generate`, data).then((r) => r.data);

export const getResult = (resultId) =>
  api.get(`${BASE}/${resultId}`).then((r) => r.data);

export const lockResult = (resultId) =>
  api.post(`${BASE}/${resultId}/lock`).then((r) => r.data);

export const unlockResult = (resultId, reason) =>
  api.post(`${BASE}/${resultId}/unlock`, { reason }).then((r) => r.data);

export const publishResult = (resultId) =>
  api.post(`${BASE}/${resultId}/publish`).then((r) => r.data);

export const getMyResults = () =>
  api.get(`${BASE}/my-results`).then((r) => r.data);
