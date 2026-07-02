import type { UserProfile } from "@/types/auth";

export function getPostAuthPath(profile: UserProfile | null) {
  void profile;
  return "/admin";
}
