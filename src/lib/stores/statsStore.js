import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import { supabase } from '$lib/supabaseClient';
import { getUserStats, uploadLocalStats, recordGameResult, getCompletedDays } from '$lib/db/stats';
import { 
  played, 
  currentStreak, 
  maxStreak, 
  solveList, 
  completedDays 
} from '../../routes/store.js';

/**
 * Auth stores
 */
export const authUser = writable(null);
export const user = authUser; // Alias
export const userProfile = writable(null);
export const authLoading = writable(true);

/**
 * Sync status store
 */
export const syncStatus = writable({
  synced: false,
  syncing: false,
  lastSyncError: null
});

// Offline Queue Store
// IMPORTANT: this must be scoped per-user to prevent cross-user leakage on shared devices.
const QUEUE_PREFIX = 'harmonies_offline_queue:';
const LEGACY_QUEUE_KEY = 'harmonies_offline_queue';

function queueKeyForUser(userId) {
  return `${QUEUE_PREFIX}${userId}`;
}

function getOfflineQueue(userId) {
  if (!browser || !userId) return [];
  try {
    const q = localStorage.getItem(queueKeyForUser(userId));
    return q ? JSON.parse(q) : [];
  } catch {
    return [];
  }
}

function setOfflineQueue(userId, queue) {
  if (!browser || !userId) return;
  localStorage.setItem(queueKeyForUser(userId), JSON.stringify(queue));
}

function addToOfflineQueue(userId, item) {
  if (!browser || !userId) return;
  const q = getOfflineQueue(userId);
  q.push({ ...item, timestamp: Date.now() });
  setOfflineQueue(userId, q);
}

function removeFromOfflineQueue(userId, timestamp) {
  if (!browser || !userId) return;
  const q = getOfflineQueue(userId).filter(item => item.timestamp !== timestamp);
  setOfflineQueue(userId, q);
}

function clearOfflineQueue(userId) {
  if (!browser || !userId) return;
  localStorage.removeItem(queueKeyForUser(userId));
}

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
 * Process offline queue
 */
async function processOfflineQueue(userId) {
  const queue = getOfflineQueue(userId);
  if (queue.length === 0) return;

  console.log(`Processing ${queue.length} offline items...`);
  
  for (const item of queue) {
    try {
        // If it's a game completion
        if (item.type === 'game_completion') {
           const { gameData, updatedStats } = item.payload;
           const result = await recordGameResult(supabase, userId, gameData, updatedStats ?? null);
           if (result.success) {
               removeFromOfflineQueue(userId, item.timestamp);
           } else {
               console.error('Failed to process offline item:', result.error);
           }
        }
    } catch (err) {
        console.error('Error processing offline queue item:', err);
    }
  }
}

/**
 * Get current local stats from Svelte stores
 */
function getLocalStats() {
  if (!browser) return null;

  return {
    played: get(played),
    currentStreak: get(currentStreak),
    maxStreak: get(maxStreak),
    solveList: get(solveList),
    completedDays: get(completedDays)
  };
}

/**
 * Update Svelte stores with new stats
 */
function updateStores(stats) {
  if (!browser) return;

  if (stats.played !== undefined) played.set(stats.played);
  if (stats.currentStreak !== undefined) currentStreak.set(stats.currentStreak);
  if (stats.maxStreak !== undefined) maxStreak.set(stats.maxStreak);
  if (stats.solveList !== undefined) solveList.set(stats.solveList);
  if (stats.completedDays !== undefined) completedDays.set(stats.completedDays);
}

/**
 * Sync stats when user logs in - MERGE STRATEGY
 */
async function syncStatsOnLogin(userId) {
  syncStatus.set({ synced: false, syncing: true, lastSyncError: null });

  try {
    // 1. Fetch Cloud Stats
    const { data: cloudStats, error: statsError } = await getUserStats(supabase, userId);
    if (statsError) throw statsError;

    // 2. Fetch Completed Days (Source of Truth for History)
    const { data: cloudCompletedDays, error: historyError } = await getCompletedDays(supabase, userId);
    if (historyError) throw historyError;

    const localStats = getLocalStats();
    
    // 3. MERGE LOGIC
    // We want to ensure any locally completed days that aren't in the cloud get uploaded
    // And any cloud days that aren't local get downloaded
    
    const localCompletedSet = new Set(localStats.completedDays || []);
    const cloudCompletedSet = new Set(cloudCompletedDays || []);
    
    // Find days present locally but missing from cloud (Offline play)
    // Note: This assumes localStats.completedDays is accurate. 
    // Ideally we would check 'harmonies_game_history' for these dates, but we don't store full game data locally in a way that's easy to upload retroactively without more work.
    // For now, we will assume if it's in 'completedDays', it's done. 
    // However, without the full game data (guesses, etc), we can't insert into 'game_history' properly.
    // We only have the aggregate stats.
    
    // CRITICAL: We can't retroactively create history entries without data. 
    // But we CAN ensure the aggregate stats reflect the maximums.

    let mergedPlayed = 0;
    let mergedStreak = 0;
    let mergedMaxStreak = 0;
    let mergedSolveList = [];
    let mergedCompletedDays = [];

    if (cloudStats) {
        // Cloud exists, merge into it
        
        // Take the larger of the two for simple counters (rough heuristic)
        mergedPlayed = Math.max(localStats.played, cloudStats.games_played);
        mergedMaxStreak = Math.max(localStats.maxStreak, cloudStats.max_streak);
        
        // For current streak, it's trickier. Trust cloud if it has a recent play? 
        // Or trust local if it's "fresher"?
        // Let's trust the one with the most recent 'last_played_date' if we could compare.
        // For now, let's take the max, assuming streaks don't decrease without a reset.
        mergedStreak = Math.max(localStats.currentStreak, cloudStats.current_streak);

        // Merge Completed Days
        const allDays = new Set([...localCompletedSet, ...cloudCompletedSet]);
        mergedCompletedDays = Array.from(allDays);
        
        // Rebuild solveList from cloud distribution + any local variance?
        // Actually, let's prioritize Cloud Distribution as the base, but if local played count is higher,
        // we might be missing some 'wins' or 'losses' in the distribution.
        // Since we can't easily decompose the extra local games into wins/losses without history,
        // we will Default to Cloud Distribution for the solveList structure to ensure consistency.
        // If the user played offline, those specific game details might be lost from the 'distribution' 
        // until they play again and it syncs? 
        // No, `uploadLocalStats` handles initial, but subsequent merges are hard.
        
        // COMPROMISE: Trust Cloud for Stats, but merge Completed Days for the Calendar.
        // The offline queue will handle uploading pending games to fix the stats eventually.
        
        const solveListFromCloud = buildSolveListFromDistribution(
            cloudStats.win_distribution,
            cloudStats.games_played,
            cloudStats.games_won
        );
        
        mergedSolveList = solveListFromCloud;
        
        // If we have an offline queue, those will get processed and update the cloud stats shortly.
        
    } else {
        // No cloud stats, upload local
        if (localStats.played > 0) {
            await uploadLocalStats(supabase, userId, localStats);
            // After upload, use local stats as the merged state
            mergedPlayed = localStats.played;
            mergedStreak = localStats.currentStreak;
            mergedMaxStreak = localStats.maxStreak;
            mergedSolveList = localStats.solveList;
            mergedCompletedDays = localStats.completedDays;
        }
    }
    
    // Always merge the completed days list so the calendar is correct
    // (Union of local and cloud)
    const finalCompletedDays = [...new Set([...(localStats.completedDays || []), ...(cloudCompletedDays || [])])];

    updateStores({
        played: cloudStats ? cloudStats.games_played : mergedPlayed,
        currentStreak: cloudStats ? cloudStats.current_streak : mergedStreak,
        maxStreak: cloudStats ? cloudStats.max_streak : mergedMaxStreak,
        solveList: cloudStats ? mergedSolveList : mergedSolveList,
        completedDays: finalCompletedDays
    });

    syncStatus.set({ synced: true, syncing: false, lastSyncError: null });
  } catch (err) {
    console.error('Error syncing stats:', err);
    syncStatus.set({ synced: false, syncing: false, lastSyncError: err.message });
  }
}

/**
 * Build a solveList array from cloud win_distribution
 */
function buildSolveListFromDistribution(winDistribution, gamesPlayed, gamesWon) {
  const solveList = [];
  
  if (!winDistribution || typeof winDistribution !== 'object') {
    for (let i = 0; i < gamesWon; i++) {
      solveList.push(4);
    }
    const losses = gamesPlayed - gamesWon;
    for (let i = 0; i < losses; i++) {
      solveList.push(0);
    }
    return solveList;
  }

  for (const [mistakes, count] of Object.entries(winDistribution)) {
    const mistakeNum = parseInt(mistakes, 10);
    const score = 4 + mistakeNum;
    for (let i = 0; i < count; i++) {
      solveList.push(score);
    }
  }

  const winsFromDist = Object.values(winDistribution).reduce((a, b) => a + b, 0);
  const losses = gamesPlayed - winsFromDist;
  for (let i = 0; i < losses; i++) {
    solveList.push(0);
  }

  return solveList;
}

/**
 * SSR hydration is the source of truth for auth + profile.
 * This function should be called from `src/routes/+layout.svelte` whenever `data.user/profile` changes.
 */
let lastHydratedUserId = null;
export async function applyHydratedAuth({ user, profile }) {
  authUser.set(user ?? null);
  userProfile.set(profile ?? null);
  authLoading.set(false);

  if (!browser) return;

  // Remove legacy global queue to prevent cross-user leakage.
  // (We don't attempt migration because we can't attribute those items safely.)
  try {
    localStorage.removeItem(LEGACY_QUEUE_KEY);
  } catch {
    // ignore
  }

  if (!user?.id) {
    lastHydratedUserId = null;
    return;
  }

  // Only do expensive sync/queue processing when the user actually changes.
  if (user.id === lastHydratedUserId) return;
  lastHydratedUserId = user.id;

  await syncStatsOnLogin(user.id);
  await processOfflineQueue(user.id);
}

/**
 * Record a completed game
 * Validates session before attempting DB write to avoid stale auth errors.
 */
export async function recordGameCompletion(gameData, updatedStats) {
  const cachedUser = get(authUser);
  
  // Quick check: if no cached user, skip entirely
  if (!cachedUser?.id) {
    console.log('User not authenticated, skipping game recording');
    return;
  }
  
  // Validate session is still valid before DB write (uses getUser() for server verification)
  const { valid, userId } = await ensureValidSession();

  // IMPORTANT: preserve `null` to mean "history only" (archive/custom games)
  const statsOrNull = updatedStats ?? null;
  
  if (!valid || !userId) {
    console.log('Session expired or invalid, adding to offline queue');
    addToOfflineQueue(cachedUser.id, {
      type: 'game_completion',
      payload: { gameData, updatedStats: statsOrNull }
    });
    syncStatus.set({ synced: false, syncing: false, lastSyncError: 'Session expired - saved locally' });
    return;
  }
  
  try {
    console.log('Attempting to record game completion for user:', userId);

    const result = await recordGameResult(supabase, userId, gameData, statsOrNull);
    
    if (!result.success) {
      console.error('Error from recordGameResult, adding to offline queue:', result.error);
      // Add to offline queue on failure
      addToOfflineQueue(userId, {
          type: 'game_completion',
          payload: { gameData, updatedStats: statsOrNull }
      });
      syncStatus.set({ synced: false, syncing: false, lastSyncError: 'Saved locally (offline)' });
    } else {
      syncStatus.set({ synced: true, syncing: false, lastSyncError: null });
    }
  } catch (err) {
    console.error('Error syncing game, adding to offline queue:', err);
    // Add to offline queue on exception
    addToOfflineQueue(userId, {
      type: 'game_completion',
      payload: { gameData, updatedStats: statsOrNull }
    });
    syncStatus.set({ synced: false, syncing: false, lastSyncError: 'Saved locally (offline)' });
  }
}

/**
 * Log out the current user
 * Uses a server-side endpoint to properly clear cookies
 */
export async function signOut() {
  if (!browser) return;

  const currentUserId = get(authUser)?.id ?? null;
  
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

  // Clear any offline queue items for the current (and any previous) user(s)
  if (currentUserId) clearOfflineQueue(currentUserId);
  try {
    localStorage.removeItem(LEGACY_QUEUE_KEY);
    // Also remove any stray per-user queue keys
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(QUEUE_PREFIX)) keysToRemove.push(key);
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch {
    // ignore
  }
  
  // Clear stores
  authUser.set(null);
  userProfile.set(null);
  syncStatus.set({ synced: false, syncing: false, lastSyncError: null });
  
  // Clear localStorage
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
}

/**
 * Derived store: is user authenticated?
 */
export const isAuthenticated = derived(authUser, $user => !!$user);
