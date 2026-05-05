/**
 * Auth Storage
 *
 * Provides the authentication storage adapter for Supabase.
 * Uses localStorage in browser environments, undefined for SSR.
 *
 * Copyright © 2026 Mrinal Prakash. All rights reserved.
 */

/**
 * Returns the appropriate storage adapter for Supabase Auth.
 * Falls back gracefully in SSR contexts where `window` is unavailable.
 */
export function getAuthStorage(): Storage | undefined {
  if (typeof window === "undefined") return undefined;
  return localStorage;
}
