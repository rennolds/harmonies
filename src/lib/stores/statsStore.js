import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import { supabase } from '$lib/supabaseClient';
import { getUserStats, uploadLocalStats, recordGameResult } from '$lib/db/stats';

/**
 * Auth store - tracks current user session
 */
export const authUser = writable(null);
export const authLoading = writable(true);

/**
 * Sync status store
 */
export const syncStatus = writable({
  synced: false,
  syncing: false,
  lastSyncError: null
});

/**
 * Initialize auth listener
 * Call this once in the layout component
 */
export function initAuthListener() {
  if (!browser) return;

  // Get initial session
  supabase.auth.getSession().then(({ data: { session } }) => {
    authUser.set(session?.user ?? null);
    authLoading.set(false);
    
    if (session?.user) {
      // User is logged in, sync stats
      syncStatsOnLogin(session.user.id);
    }
  });

  // Listen for auth changes
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      const user = session?.user ?? null;
      authUser.set(user);
      authLoading.set(false);

      if (event === 'SIGNED_IN' && user) {
        await syncStatsOnLogin(user.id);
      } else if (event === 'SIGNED_OUT') {
        syncStatus.set({ synced: false, syncing: false, lastSyncError: null });
      }
    }
  );

  // Return unsubscribe function
  return () => subscription.unsubscribe();
}

/**
 * Get current local stats from localStorage
 */
function getLocalStats() {
  if (!browser) return null;

  const played = parseInt(localStorage.getItem('played') || '0', 10);
  const currentStreak = parseInt(localStorage.getItem('currentStreak') || '0', 10);
  const maxStreak = parseInt(localStorage.getItem('maxStreak') || '0', 10);
  
  let solveList = [];
  try {
    const solveListRaw = localStorage.getItem('solveList');
    if (solveListRaw) {
      solveList = JSON.parse(solveListRaw);
    }
  } catch (e) {
    console.error('Error parsing solveList:', e);
  }

  let completedDays = [];
  try {
    const completedDaysRaw = localStorage.getItem('completedDays');
    if (completedDaysRaw) {
      completedDays = JSON.parse(completedDaysRaw);
    }
  } catch (e) {
    console.error('Error parsing completedDays:', e);
  }

  return {
    played,
    currentStreak,
    maxStreak,
    solveList,
    completedDays
  };
}

/**
 * Update local stats in localStorage
 */
function setLocalStats(stats) {
  if (!browser) return;

  if (stats.played !== undefined) {
    localStorage.setItem('played', stats.played.toString());
  }
  if (stats.currentStreak !== undefined) {
    localStorage.setItem('currentStreak', stats.currentStreak.toString());
  }
  if (stats.maxStreak !== undefined) {
    localStorage.setItem('maxStreak', stats.maxStreak.toString());
  }
  if (stats.solveList !== undefined) {
    localStorage.setItem('solveList', JSON.stringify(stats.solveList));
  }
  if (stats.completedDays !== undefined) {
    localStorage.setItem('completedDays', JSON.stringify(stats.completedDays));
  }
}

/**
 * Sync stats when user logs in
 * Implements the merge strategy from the plan
 */
async function syncStatsOnLogin(userId) {
  syncStatus.set({ synced: false, syncing: true, lastSyncError: null });

  try {
    // Check if user has cloud stats
    const { data: cloudStats, error } = await getUserStats(supabase, userId);
    
    if (error) {
      throw error;
    }

    const localStats = getLocalStats();

    if (cloudStats) {
      // Case B: Existing cloud user - cloud overwrites local
      // Convert cloud stats to local format and save
      const solveListFromCloud = buildSolveListFromDistribution(
        cloudStats.win_distribution,
        cloudStats.games_played,
        cloudStats.games_won
      );

      setLocalStats({
        played: cloudStats.games_played,
        currentStreak: cloudStats.current_streak,
        maxStreak: cloudStats.max_streak,
        solveList: solveListFromCloud
        // Note: completedDays would need to come from game_history, keeping local for now
      });

      console.log('Synced cloud stats to local storage');
    } else if (localStats && localStats.played > 0) {
      // Case A: Fresh cloud user with local data - upload local to cloud
      const { error: uploadError } = await uploadLocalStats(supabase, userId, localStats);
      
      if (uploadError) {
        throw uploadError;
      }

      console.log('Uploaded local stats to cloud');
    } else {
      // Case C: New user with no data - nothing to do
      console.log('New user, no stats to sync');
    }

    syncStatus.set({ synced: true, syncing: false, lastSyncError: null });
  } catch (err) {
    console.error('Error syncing stats:', err);
    syncStatus.set({ synced: false, syncing: false, lastSyncError: err.message });
  }
}

/**
 * Build a solveList array from cloud win_distribution
 * This is an approximation since we lose some granularity
 */
function buildSolveListFromDistribution(winDistribution, gamesPlayed, gamesWon) {
  const solveList = [];
  
  if (!winDistribution || typeof winDistribution !== 'object') {
    // If no distribution, create placeholder entries
    for (let i = 0; i < gamesWon; i++) {
      solveList.push(4); // Assume perfect games
    }
    const losses = gamesPlayed - gamesWon;
    for (let i = 0; i < losses; i++) {
      solveList.push(0); // Losses
    }
    return solveList;
  }

  // Add wins based on distribution (mistakes: count)
  for (const [mistakes, count] of Object.entries(winDistribution)) {
    const mistakeNum = parseInt(mistakes, 10);
    const score = 4 + mistakeNum; // Convert back to score format
    for (let i = 0; i < count; i++) {
      solveList.push(score);
    }
  }

  // Add losses (score = 0)
  const winsFromDist = Object.values(winDistribution).reduce((a, b) => a + b, 0);
  const losses = gamesPlayed - winsFromDist;
  for (let i = 0; i < losses; i++) {
    solveList.push(0);
  }

  return solveList;
}

/**
 * Record a completed game - updates both local and cloud (if authenticated)
 * This is the main function to call from game logic
 */
export async function recordGameCompletion(gameData, updatedStats) {
  const user = get(authUser);
  
  if (user) {
    // User is authenticated - sync to cloud
    try {
      const { success, error } = await recordGameResult(
        supabase,
        user.id,
        gameData,
        updatedStats
      );
      
      if (!success) {
        console.error('Failed to sync game to cloud:', error);
      } else {
        console.log('Game synced to cloud');
      }
    } catch (err) {
      console.error('Error syncing game:', err);
    }
  }
}

/**
 * Sign out the current user
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Error signing out:', error);
    throw error;
  }
}

/**
 * Derived store: is user authenticated?
 */
export const isAuthenticated = derived(authUser, $user => !!$user);


