/**
 * Database service for Harmonies stats sync
 */

/**
 * Convert date from MM/DD/YYYY (JSON format) to YYYY-MM-DD (DB format)
 */
export function convertDateToDBFormat(dateStr) {
  if (!dateStr) return null;
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

  return { data, error };
}

/**
 * Record a game result (both stats update and game history entry)
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 * @param {object} gameData - { puzzleDate, result, guessesCount, timeTakenSeconds }
 * @param {object} newStats - Updated aggregated stats
 * @returns {Promise<{success: boolean, error: Error|null}>}
 */
export async function recordGameResult(supabase, userId, gameData, newStats) {
  // Debug log
  console.log('recordGameResult called with:', { userId, gameData, newStats: !!newStats });

  // 1. Insert game history record
  const historyData = {
    user_id: userId,
    puzzle_date: convertDateToDBFormat(gameData.puzzleDate),
    result: gameData.result, // 'WIN' or 'LOSS'
    guesses_count: gameData.guessesCount,
    time_taken_seconds: gameData.timeTakenSeconds || null
  };
  
  console.log('Inserting into harmonies_game_history:', historyData);

  const { error: historyError } = await supabase
    .from('harmonies_game_history')
    .insert(historyData);

  if (historyError) {
    console.error('Error inserting game history:', historyError);
    return { success: false, error: historyError };
  } else {
    console.log('Successfully inserted game history');
  }

  // 2. Update aggregated stats (if provided)
  if (newStats) {
    // Build win distribution from solveList
    const winDistribution = {};
    if (newStats.solveList && Array.isArray(newStats.solveList)) {
      for (const score of newStats.solveList) {
        if (score > 0) {
          const mistakes = Math.max(0, score - 4);
          winDistribution[mistakes] = (winDistribution[mistakes] || 0) + 1;
        }
      }
    }

    const gamesWon = newStats.solveList 
      ? newStats.solveList.filter(score => score >= 4).length 
      : 0;

    const { error: statsError } = await supabase
      .from('harmonies_stats')
      .upsert({
        user_id: userId,
        games_played: newStats.played || 0,
        games_won: gamesWon,
        current_streak: newStats.currentStreak || 0,
        max_streak: newStats.maxStreak || 0,
        win_distribution: winDistribution,
        last_played_date: convertDateToDBFormat(gameData.puzzleDate),
        updated_at: new Date().toISOString()
      }, {
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
    .order('played_at', { ascending: false })
    .limit(limit);

  return { data, error };
}


