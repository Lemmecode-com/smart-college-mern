import api from "./axios";

export const getGeneralSettings = async () => {
  const response = await api.get("/general-settings");
  return response.data;
};

export const updateGeneralSettings = async (data) => {
  const response = await api.put("/general-settings", data);
  return response.data;
};
