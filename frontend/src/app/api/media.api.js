import { api } from "./client";

export const mediaApi = {
  presignSkill: async (skillId, files) =>
    (await api.post(`/media/skills/${skillId}/presign`, { files })).data, // { uploads }

  confirmSkill: async (skillId, items) =>
    (await api.post(`/media/skills/${skillId}/confirm`, { items })).data, // { ok, media }
};
