"use client";

import { create } from "zustand";
import type { UserProfile } from "@/types/auth";

type AuthStore = {
  profile: UserProfile | null;
  isLoading: boolean;
  setProfile: (profile: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  clearProfile: () => void;
};

export const useAuthStore = create<AuthStore>((set) => ({
  profile: null,
  isLoading: true,
  setProfile: (profile) => set({ profile, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  clearProfile: () => set({ profile: null, isLoading: false }),
}));
