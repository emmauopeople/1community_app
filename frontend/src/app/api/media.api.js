import { api } from "./client";

function getApiBaseUrl() {
  const fromAxios = api?.defaults?.baseURL;

  if (fromAxios) {
    return String(fromAxios).replace(/\/$/, "");
  }

  const fromEnv = import.meta.env.VITE_BACKEND_URL;

  if (fromEnv) {
    return String(fromEnv).replace(/\/$/, "");
  }

  return "";
}

export const mediaApi = {
  presignSkill: async (skillId, files) =>
    (await api.post(`/media/skills/${skillId}/presign`, { files })).data,

  confirmSkill: async (skillId, items) =>
    (await api.post(`/media/skills/${skillId}/confirm`, { items })).data,

  uploadSkillDirect: async (skillId, filesBySlot) => {
    const formData = new FormData();
    const sortOrders = [];

    Object.entries(filesBySlot).forEach(([slot, file]) => {
      if (!file) return;

      formData.append("images", file, file.name || `skill-image-${slot}`);
      sortOrders.push(Number(slot));
    });

    formData.append("sortOrders", JSON.stringify(sortOrders));

    const baseUrl = getApiBaseUrl();

    const response = await fetch(
      `${baseUrl}/media/skills/${skillId}/upload-direct`,
      {
        method: "POST",
        body: formData,
        credentials: "include",
      },
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data?.error || `Upload failed with status ${response.status}`);
    }

    return data;
  },
};