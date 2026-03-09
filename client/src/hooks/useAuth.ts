import { useUser, useAuth as useClerkAuth } from "@clerk/react";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

/**
 * useAuth — Drop-in replacement for the old Replit-based hook.
 *
 * Returns the same shape as before:
 *   { user, isLoading, isAuthenticated, error }
 *
 * `user` is the full DB user record (including subscriptionTier, usage etc.)
 * fetched from /api/auth/user. Falls back to null if unauthenticated.
 */
export function useAuth() {
  const { isLoaded: clerkLoaded, isSignedIn } = useClerkAuth();

  const { data: user, isLoading: userLoading, error } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    enabled: clerkLoaded && !!isSignedIn,
    retry: false,
  });

  return {
    user: user ?? null,
    isLoading: !clerkLoaded || (!!isSignedIn && userLoading),
    isAuthenticated: !!isSignedIn && !!user,
    error,
  };
}

/**
 * useClerkUser — access Clerk's own user object directly.
 * Use this when you need profile info before the DB user is loaded.
 */
export function useClerkUser() {
  return useUser();
}
