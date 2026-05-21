import { api } from "./client";

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

      formData.append("images", file);
      sortOrders.push(Number(slot));
    });

    formData.append("sortOrders", JSON.stringify(sortOrders));

    const response = await api.post(
      `/media/skills/${skillId}/upload-direct`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );

    return response.data;
  },
};