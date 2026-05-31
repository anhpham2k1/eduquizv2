import { create } from "zustand";
import { clearStoredAuthSession, persistAuthSession, readStoredAuthSession } from "../api/http";
import type { User } from "../types";

interface AuthState {
  user: User | null;
  token: string | null;
  login: (user: User, token?: string) => void;
  logout: () => void;
  restoreSession: () => void;
}

const initialSession = readStoredAuthSession();

export const useAuthStore = create<AuthState>((set, get) => ({
  user: initialSession.user,
  token: initialSession.token,

  login: (user, token) => {
    const nextToken = token ?? get().token;

    if (nextToken) {
      persistAuthSession({ user, token: nextToken });
    }

    set({ user, token: nextToken ?? null });
  },

  logout: () => {
    clearStoredAuthSession();
    set({ user: null, token: null });
  },

  restoreSession: () => {
    set(readStoredAuthSession());
  },
}));
