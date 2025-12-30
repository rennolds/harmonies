import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import { supabase } from '$lib/supabaseClient';
import { getUserStats, uploadLocalStats, recordGameResult } from '$lib/db/stats';
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

/**
 * Initialize auth listener
 */
export function initAuthListener() {
  if (!browser) return;

  // Get initial session
  supabase.auth.getSession().then(({ data: { session } }) => {
    const u = session?.user ?? null;
    authUser.set(u);
    authLoading.set(false);
    
    if (u) {
      fetchUserProfile(u.id);
      syncStatsOnLogin(u.id);
    }
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
 * Sync stats when user logs in
 */
async function syncStatsOnLogin(userId) {
  syncStatus.set({ synced: false, syncing: true, lastSyncError: null });

  try {
    const { data: cloudStats, error } = await getUserStats(supabase, userId);
    
    if (error) {
      throw error;
    }

    const localStats = getLocalStats();

    if (cloudStats) {
      const solveListFromCloud = buildSolveListFromDistribution(
        cloudStats.win_distribution,
        cloudStats.games_played,
        cloudStats.games_won
      );

      updateStores({
        played: cloudStats.games_played,
        currentStreak: cloudStats.current_streak,
        maxStreak: cloudStats.max_streak,
        solveList: solveListFromCloud
      });
    } else if (localStats && localStats.played > 0) {
      await uploadLocalStats(supabase, userId, localStats);
    }

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
      console.log('Game Data:', gameData);
      
      // updatedStats can be null for archive games (we don't update aggregates)
      // but recordGameResult expects it for calculating win distribution if it's there
      // We'll pass an empty object if null to be safe, or modify recordGameResult to handle it
      // Let's modify the call to be safe
      const safeStats = updatedStats || {};
      
      const result = await recordGameResult(supabase, u.id, gameData, safeStats);
      console.log('Record game result:', result);
      
      if (result.error) {
        console.error('Error from recordGameResult:', result.error);
      }
    } catch (err) {
      console.error('Error syncing game:', err);
    }
  } else {
    console.log('User not authenticated, skipping game recording');
  }
}

/**
 * Log out the current user
 */
export async function signOut() {
  // Clear stores immediately for instant UI update
  authUser.set(null);
  userProfile.set(null);
  syncStatus.set({ synced: false, syncing: false, lastSyncError: null });
  
  // Call Supabase to clear session
  await supabase.auth.signOut();
}

/**
 * Derived store: is user authenticated?
 */
export const isAuthenticated = derived(authUser, $user => !!$user);
