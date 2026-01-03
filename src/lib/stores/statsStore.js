import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import { supabase } from '$lib/supabaseClient';
import { getUserStats, uploadLocalStats, recordGameResult, getCompletedDays, convertDateFromDBFormat, getTodayEST } from '$lib/db/stats';
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
const QUEUE_KEY = 'harmonies_offline_queue';
function getOfflineQueue() {
  if (!browser) return [];
  try {
    const q = localStorage.getItem(QUEUE_KEY);
    return q ? JSON.parse(q) : [];
  } catch (e) {
    return [];
  }
}

function addToOfflineQueue(item) {
  if (!browser) return;
  const q = getOfflineQueue();
  q.push({ ...item, timestamp: Date.now() });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}

function removeFromOfflineQueue(timestamp) {
  if (!browser) return;
  let q = getOfflineQueue();
  q = q.filter(item => item.timestamp !== timestamp);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}

/**
 * Initialize auth listener
 */
export function initAuthListener() {
  if (!browser) return;

  // Get initial session
  supabase.auth.getSession().then(({ data: { session }, error }) => {
    if (error) {
      console.warn('Session error (clearing local state):', error.message);
      // Clear any stale local state
      authUser.set(null);
      authLoading.set(false);
      return;
    }
    
    const u = session?.user ?? null;
    authUser.set(u);
    authLoading.set(false);
    
    if (u) {
      fetchUserProfile(u.id);
      syncStatsOnLogin(u.id);
      processOfflineQueue(u.id); // Try to flush queue on login
    }
  }).catch(err => {
    console.warn('Failed to get session:', err.message);
    authUser.set(null);
    authLoading.set(false);
  });

  // Listen for auth changes
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      const u = session?.user ?? null;
      authUser.set(u);
      authLoading.set(false);

      if (event === 'SIGNED_IN' && u) {
        await fetchUserProfile(u.id);
        await syncStatsOnLogin(u.id);
        await processOfflineQueue(u.id);
      } else if (event === 'SIGNED_OUT') {
        authUser.set(null);
        userProfile.set(null);
        syncStatus.set({ synced: false, syncing: false, lastSyncError: null });
      }
    }
  );

  return () => subscription.unsubscribe();
}

/**
 * Process offline queue
 */
async function processOfflineQueue(userId) {
  const queue = getOfflineQueue();
  if (queue.length === 0) return;

  console.log(`Processing ${queue.length} offline items...`);
  
  for (const item of queue) {
    try {
        // If it's a game completion
        if (item.type === 'game_completion') {
           const { gameData, updatedStats } = item.payload;
           const result = await recordGameResult(supabase, userId, gameData, updatedStats);
           if (result.success) {
               removeFromOfflineQueue(item.timestamp);
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
 * Fetch user profile from the database
 */
async function fetchUserProfile(userId) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', userId)
      .maybeSingle();
    
    if (error) throw error;
    userProfile.set(data);
  } catch (err) {
    console.error('Error fetching user profile:', err);
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
 * Record a completed game
 */
export async function recordGameCompletion(gameData, updatedStats) {
  const u = get(authUser);
  
  if (u) {
    try {
      console.log('Attempting to record game completion for user:', u.id);
      
      const safeStats = updatedStats || {};
      
      const result = await recordGameResult(supabase, u.id, gameData, safeStats);
      
      if (!result.success) {
        console.error('Error from recordGameResult, adding to offline queue:', result.error);
        // Add to offline queue on failure
        addToOfflineQueue({
            type: 'game_completion',
            payload: { gameData, updatedStats: safeStats }
        });
        syncStatus.set({ synced: false, syncing: false, lastSyncError: 'Saved locally (offline)' });
      } else {
        syncStatus.set({ synced: true, syncing: false, lastSyncError: null });
      }
    } catch (err) {
      console.error('Error syncing game, adding to offline queue:', err);
      // Add to offline queue on exception
      addToOfflineQueue({
        type: 'game_completion',
        payload: { gameData, updatedStats: updatedStats || {} }
      });
      syncStatus.set({ synced: false, syncing: false, lastSyncError: 'Saved locally (offline)' });
    }
  } else {
    console.log('User not authenticated, skipping game recording');
  }
}

/**
 * Log out the current user
 */
export async function signOut() {
  // Call Supabase to clear session
  await supabase.auth.signOut();
  
  // Clear stores after signOut completes
  authUser.set(null);
  userProfile.set(null);
  syncStatus.set({ synced: false, syncing: false, lastSyncError: null });
}

/**
 * Derived store: is user authenticated?
 */
export const isAuthenticated = derived(authUser, $user => !!$user);
