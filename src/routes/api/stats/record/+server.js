import { json } from '@sveltejs/kit';

export async function POST({ request, locals }) {
  const { session, user } = await locals.safeGetSession();
  if (!session || !user) return json({ error: 'Unauthorized' }, { status: 401 });

  const { 
    puzzleDate, 
    win, 
    guessesCount, 
    mistakeCount, 
    guessHistory,
    // Current aggregates to update:
    newPlayed,
    newCurrentStreak,
    newMaxStreak,
    newSolveList,
    newCompletedDays
  } = await request.json();

  // 1. Record detailed history
  const { error: historyError } = await locals.supabase
    .from('harmonies_game_history')
    .insert({
      user_id: user.id,
      puzzle_date: puzzleDate,
      win,
      guesses_count: guessesCount,
      mistake_count: mistakeCount,
      guess_history: guessHistory
    });

  if (historyError) {
    console.error('Error saving game history:', historyError);
    // We continue to update stats even if history fails, or maybe return error?
    // Let's log it but try to update aggregate stats as that's user-facing.
  }

  // 2. Update aggregate stats
  // We use upsert here to handle cases where sync might have failed or race conditions
  const { error: statsError } = await locals.supabase
    .from('harmonies_user_stats')
    .upsert({
      user_id: user.id,
      played: newPlayed,
      current_streak: newCurrentStreak,
      max_streak: newMaxStreak,
      solve_list: newSolveList,
      completed_days: newCompletedDays,
      updated_at: new Date().toISOString()
    });

  if (statsError) return json({ error: statsError.message }, { status: 500 });

  return json({ success: true });
}

