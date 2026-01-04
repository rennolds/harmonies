/**
 * Database service for Harmonies stats sync
 */
import moment from 'moment-timezone';

const TIMEZONE = 'America/New_York';

/**
 * Get current date in EST as YYYY-MM-DD
 */
export function getTodayEST() {
  return moment().tz(TIMEZONE).format('YYYY-MM-DD');
}

/**
 * Convert date from MM/DD/YYYY (JSON format) to YYYY-MM-DD (DB format)
 */
export function convertDateToDBFormat(dateStr) {
  if (!dateStr) return null;
  // If already in YYYY-MM-DD format, return as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  const [month, day, year] = parts;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

/**
 * Convert date from YYYY-MM-DD (DB format) to MM/DD/YYYY (JSON format)
 */
export function convertDateFromDBFormat(dateStr) {
  if (!dateStr) return null;
  // If already in MM/DD/YYYY format, return as is
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;

  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  const [year, month, day] = parts;
  return `${month}/${day}/${year}`;
}

/**
 * Fetch user stats from the database
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 * @returns {Promise<{data: object|null, error: Error|null}>}
 */
export async function getUserStats(supabase, userId) {
  const { data, error } = await supabase
    .from('harmonies_stats')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  return { data, error };
}

/**
 * Fetch completed games history for user to sync calendar
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 */
export async function getCompletedDays(supabase, userId) {
  const { data, error } = await supabase
    .from('harmonies_game_history')
    .select('puzzle_date')
    .eq('user_id', userId);
    
  if (error) return { data: [], error };
  
  // Return unique list of dates in MM/DD/YYYY format
  const dates = [...new Set(data.map(d => convertDateFromDBFormat(d.puzzle_date)))];
  return { data: dates, error: null };
}

/**
 * Upload local stats to the database (initial sync when user has no cloud data)
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 * @param {object} localStats - Stats from localStorage
 * @returns {Promise<{data: object|null, error: Error|null}>}
 */
export async function uploadLocalStats(supabase, userId, localStats) {
  // Build win distribution from solveList
  const winDistribution = {};
  if (localStats.solveList && Array.isArray(localStats.solveList)) {
    for (const score of localStats.solveList) {
      if (score > 0) {
        // score represents total guesses (4 = perfect, 5 = 1 mistake, etc.)
        // Convert to mistakes: mistakes = score - 4
        const mistakes = Math.max(0, score - 4);
        winDistribution[mistakes] = (winDistribution[mistakes] || 0) + 1;
      }
    }
  }

  // Calculate games won from solveList
  const gamesWon = localStats.solveList 
    ? localStats.solveList.filter(score => score >= 4).length 
    : 0;

  // Get last played date from completedDays
  let lastPlayedDate = null;
  if (localStats.completedDays && localStats.completedDays.length > 0) {
    // Get the most recent completed day
    const sortedDays = [...localStats.completedDays].sort((a, b) => {
      const dateA = new Date(a);
      const dateB = new Date(b);
      return dateB - dateA;
    });
    lastPlayedDate = convertDateToDBFormat(sortedDays[0]);
  }

  // 1. Upload Aggregate Stats
  const { data, error } = await supabase
    .from('harmonies_stats')
    .upsert({
      user_id: userId,
      games_played: localStats.played || 0,
      games_won: gamesWon,
      current_streak: localStats.currentStreak || 0,
      max_streak: localStats.maxStreak || 0,
      win_distribution: winDistribution,
      last_played_date: lastPlayedDate,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id'
    })
    .select()
    .single();

  if (error) {
     return { data, error };
  }

  // 2. Backfill History for Calendar consistency
  // We iterate through completedDays and insert placeholder records if they don't exist.
  // We can't know the exact result/guesses for these legacy games, but we can assume 'WIN' 
  // or a default state so they appear on other devices.
  if (localStats.completedDays && localStats.completedDays.length > 0) {
     const historyInserts = localStats.completedDays.map(dateStr => ({
        user_id: userId,
        puzzle_date: convertDateToDBFormat(dateStr),
        result: 'WIN', // Assumed for legacy backfill
        guesses_count: 4, // Assumed perfect for legacy backfill
        time_taken_seconds: null
     }));
     
     // Insert in batches or all at once (ignoring duplicates via upsert/ignore)
     const { error: backfillError } = await supabase
        .from('harmonies_game_history')
        .upsert(historyInserts, { onConflict: 'user_id, puzzle_date', ignoreDuplicates: true });
        
     if (backfillError) {
         console.warn('Error backfilling history:', backfillError);
         // Don't fail the whole operation, this is best-effort
     }
  }

  return { data, error };
}

/**
 * Record a game result (both stats update and game history entry)
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 * @param {object} gameData - { puzzleDate, result, guessesCount, timeTakenSeconds }
 * @param {object} newStats - Updated aggregated stats (optional, if null, only history is recorded)
 * @returns {Promise<{success: boolean, error: Error|null}>}
 */
export async function recordGameResult(supabase, userId, gameData, newStats) {
  // Debug log
  const shouldUpdateAggregates =
    newStats && typeof newStats === 'object' && Object.keys(newStats).length > 0;
  console.log('recordGameResult called with:', { userId, gameData, shouldUpdateAggregates });

  // 1. Insert game history record
  // Use upsert to prevent duplicate entries for the same day if replayed/resynced
  const historyData = {
    user_id: userId,
    puzzle_date: convertDateToDBFormat(gameData.puzzleDate),
    result: gameData.result, // 'WIN' or 'LOSS'
    guesses_count: gameData.guessesCount,
    time_taken_seconds: gameData.timeTakenSeconds || null
  };
  
  console.log('Inserting into harmonies_game_history:', historyData);

  // We use upsert on history to avoid duplicates if offline queue retries
  // Assumes there's a unique constraint on (user_id, puzzle_date)
  const { error: historyError } = await supabase
    .from('harmonies_game_history')
    .upsert(historyData, { onConflict: 'user_id, puzzle_date' });

  if (historyError) {
    console.error('Error inserting game history:', historyError);
    return { success: false, error: historyError };
  } else {
    console.log('Successfully inserted game history');
  }

  // 2. Update aggregated stats (if provided)
  // We only update aggregates if this is a "main" game (not archive)
  if (shouldUpdateAggregates) {
    // Robust Update Strategy: Read-Modify-Write
    // Instead of blindly overwriting with client stats (which might be stale/racey),
    // we fetch the current DB stats and apply this single game's result.
    // This handles the case where multiple devices play concurrently or offline queues sync out of order.

    const { data: currentDbStats, error: fetchError } = await supabase
      .from('harmonies_stats')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching current stats for update:', fetchError);
      return { success: false, error: fetchError };
    }

    let nextStats = {
      games_played: 0,
      games_won: 0,
      current_streak: 0,
      max_streak: 0,
      win_distribution: {},
      last_played_date: null
    };

    if (currentDbStats) {
      nextStats = { ...currentDbStats };
    } else {
        // If no record exists, use the client's baseline (minus this game, logically, but we can just use 0s + game)
        // actually, if no record, we can trust the client's full state OR start fresh.
        // Trusting client state for FIRST creation is safe.
        // But `recordGameResult` is called after `syncStatsOnLogin` usually.
        // If it's a new user, `uploadLocalStats` might have run.
    }

    // However, if we are offline-queue processing, `newStats` from the client
    // contains the *total* at that time.
    // If we rely on `nextStats` (DB) + `gameData`, we are safe.

    // Calculate Delta
    const isWin = gameData.result === 'WIN';
    
    // Check if this specific date was already counted in stats?
    // The DB `last_played_date` helps, but user might replay old puzzles?
    // If they replay an old puzzle, we shouldn't increment `games_played` again for the same day?
    // Harmonies seems to be a daily puzzle. Replaying implies "archive mode", which passes `newStats: null`.
    // So if `newStats` is passed, it IS a main game play.
    
    // Sanity check: If DB says last_played_date is TODAY, and we are trying to add TODAY...
    // It might be a duplicate submission.
    const puzzleDateDB = convertDateToDBFormat(gameData.puzzleDate);
    if (nextStats.last_played_date === puzzleDateDB) {
        console.warn('Stats already updated for this date, skipping aggregate update.');
        // We still return success as the history was recorded.
        return { success: true, error: null };
    }

    nextStats.games_played = (nextStats.games_played || 0) + 1;
    if (isWin) {
      nextStats.games_won = (nextStats.games_won || 0) + 1;
      nextStats.current_streak = (nextStats.current_streak || 0) + 1;
      if (nextStats.current_streak > (nextStats.max_streak || 0)) {
        nextStats.max_streak = nextStats.current_streak;
      }
    } else {
      nextStats.current_streak = 0;
    }

    // Update Distribution
    const dist = nextStats.win_distribution || {};
    let mistakes = 4; // Default to loss/max
    if (gameData.guessesCount && gameData.guessesCount >= 4) {
       // if win, mistakes = guesses - 4. If loss, guesses usually not meaningful or capped.
       // Assuming standard logic:
       if (isWin) {
           mistakes = Math.max(0, gameData.guessesCount - 4);
       } else {
           mistakes = 4; // loss bucket
       }
    }
    dist[mistakes] = (dist[mistakes] || 0) + 1;
    nextStats.win_distribution = dist;
    
    nextStats.last_played_date = puzzleDateDB;
    nextStats.updated_at = new Date().toISOString();

    // If we didn't have a record before, and we are relying on this "delta" logic, 
    // we might miss previous history if `uploadLocalStats` wasn't called.
    // But `syncStatsOnLogin` ensures `uploadLocalStats` is called if no cloud stats exist.
    // So "Read-Modify-Write" is safe.

    // Fallback: If `currentDbStats` was null, we really should use `newStats` from client 
    // as the baseline because it includes all history up to now.
    if (!currentDbStats && newStats) {
       // Revert to using client stats fully if this is the FIRST ever server record
       // (and somehow uploadLocalStats didn't run or failed)
       console.log('No server stats found, using client stats as baseline');
       const winDistribution = {};
       if (newStats.solveList && Array.isArray(newStats.solveList)) {
        for (const score of newStats.solveList) {
            if (score > 0) {
            const m = Math.max(0, score - 4);
            winDistribution[m] = (winDistribution[m] || 0) + 1;
            }
        }
       }
       nextStats = {
        user_id: userId,
        games_played: newStats.played || 0,
        games_won: newStats.solveList ? newStats.solveList.filter(s => s >= 4).length : 0,
        current_streak: newStats.currentStreak || 0,
        max_streak: newStats.maxStreak || 0,
        win_distribution: winDistribution,
        last_played_date: puzzleDateDB,
        updated_at: new Date().toISOString()
       };
    }

    const { error: statsError } = await supabase
      .from('harmonies_stats')
      .upsert(nextStats, {
        onConflict: 'user_id'
      });

    if (statsError) {
      console.error('Error updating stats:', statsError);
      return { success: false, error: statsError };
    }
  }

  return { success: true, error: null };
}

/**
 * Get user's game history
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 * @param {number} limit
 * @returns {Promise<{data: Array|null, error: Error|null}>}
 */
export async function getGameHistory(supabase, userId, limit = 50) {
  const { data, error } = await supabase
    .from('harmonies_game_history')
    .select('*')
    .eq('user_id', userId)
    .order('puzzle_date', { ascending: false }) // Changed from played_at to puzzle_date
    .limit(limit);

  return { data, error };
}
