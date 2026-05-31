import type { User } from "../types";
import { apiJson, apiNoContent } from "./http";

export const settingsApi = {
  async updateProfile(currentUser: User, data: Partial<User>) {
    const result = await apiJson<{ user: User }>("/api/settings/profile", {
      method: "PUT",
      body: {
        name: data.name ?? currentUser.name,
        username: data.username ?? currentUser.username,
        bio: data.bio ?? currentUser.bio,
        location: data.location ?? currentUser.location,
      },
    });

    return result.user;
  },

  async requestEmailChange() {
    throw new Error("Tính năng đổi email chưa được hỗ trợ");
  },

  async verifyEmailChange() {
    throw new Error("Tính năng xác thực email chưa được hỗ trợ");
  },

  changePassword(current: string, newPass: string) {
    return apiNoContent("/api/settings/password", {
      method: "PUT",
      body: { currentPassword: current, newPassword: newPass },
    });
  },

  setPassword(newPass: string) {
    return apiNoContent("/api/settings/password", {
      method: "POST",
      body: { newPassword: newPass },
    });
  },
};
