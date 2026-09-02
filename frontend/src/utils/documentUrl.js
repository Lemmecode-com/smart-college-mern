import api from "../api/axios";

export const getDocumentViewUrl = (documentId) => {
  if (!documentId) return null;
  return `${api.defaults.baseURL}/documents/${documentId}`;
};

export const getDocumentDownloadUrl = (documentId) => {
  if (!documentId) return null;
  return `${api.defaults.baseURL}/documents/${documentId}/download`;
};
