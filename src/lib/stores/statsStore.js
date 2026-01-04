import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import { supabase } from '$lib/supabaseClient';

/**
 * Auth stores
 */
export const authUser = writable(null);
export const user = authUser; // Alias
export const userProfile = writable(null);
export const authLoading = writable(true);

/**
 * Sync status store (kept for API compatibility, but no longer used for DB sync)
 */
export const syncStatus = writable({
  synced: false,
  syncing: false,
  lastSyncError: null
});

/**
 * Ensure we have a valid session by verifying with Supabase server.
 * Uses getUser() which validates the JWT server-side (more secure than getSession()).
 * @returns {Promise<{valid: boolean, userId: string|null}>}
 */
export async function ensureValidSession() {
  try {
    // First check if we have a session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return { valid: false, userId: null };
    }
    
    // Verify the session is actually valid by calling getUser() 
    // This makes a server call to validate the JWT
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      // Session exists but is invalid - try to refresh
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError || !refreshData.session) {
        console.warn('Session refresh failed:', refreshError?.message);
        return { valid: false, userId: null };
      }
      
      // Update the auth store with refreshed user
      authUser.set(refreshData.session.user);
      return { valid: true, userId: refreshData.session.user.id };
    }
    
    return { valid: true, userId: user.id };
  } catch (err) {
    console.error('Error validating session:', err);
    return { valid: false, userId: null };
  }
}

/**
 * SSR hydration is the source of truth for auth + profile.
 * This function should be called from `src/routes/+layout.svelte` whenever `data.user/profile` changes.
 */
export async function applyHydratedAuth({ user, profile }) {
  authUser.set(user ?? null);
  userProfile.set(profile ?? null);
  authLoading.set(false);
}

/**
 * Log out the current user
 * Uses a server-side endpoint to properly clear cookies
 */
export async function signOut() {
  if (!browser) return;
  
  try {
    // Call server-side logout endpoint which has proper cookie access
    await fetch('/api/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    // Continue with local cleanup even if server call fails
  }
  
  // Also try client-side signOut (with timeout to prevent hanging)
  try {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout')), 2000);
    });
    await Promise.race([
      supabase.auth.signOut({ scope: 'local' }),
      timeoutPromise
    ]);
  } catch (err) {
    // Continue with local cleanup
  }
  
  // Clear stores
  authUser.set(null);
  userProfile.set(null);
  syncStatus.set({ synced: false, syncing: false, lastSyncError: null });
  
  // Clear Supabase-related localStorage items
  if (browser) {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }
}

/**
 * Derived store: is user authenticated?
 */
export const isAuthenticated = derived(authUser, $user => !!$user);
