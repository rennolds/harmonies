import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import { supabase } from '$lib/supabaseClient';
import { getUserStats, uploadLocalStats, recordGameResult } from '$lib/db/stats';

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

      setLocalStats({
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
      await recordGameResult(supabase, u.id, gameData, updatedStats);
    } catch (err) {
      console.error('Error syncing game:', err);
    }
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
