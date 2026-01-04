import { json } from '@sveltejs/kit';

export async function POST({ request, locals }) {
  const { session, user } = await locals.safeGetSession();
  if (!session || !user) return json({ error: 'Unauthorized' }, { status: 401 });

  const { played, currentStreak, maxStreak, solveList, completedDays } = await request.json();

  // 1. Check if stats already exist
  const { data: existing, error: checkError } = await locals.supabase
    .from('harmonies_user_stats')
    .select('user_id')
    .eq('user_id', user.id)
    .single();

  if (checkError && checkError.code !== 'PGRST116') {
    return json({ error: checkError.message }, { status: 500 });
  }

  if (existing) {
    return json({ message: 'Stats already exist, skipping sync' });
  }

  // 2. Insert local stats
  const { error: insertError } = await locals.supabase
    .from('harmonies_user_stats')
    .insert({
      user_id: user.id,
      played: played || 0,
      current_streak: currentStreak || 0,
      max_streak: maxStreak || 0,
      solve_list: solveList || [],
      completed_days: completedDays || []
    });

  if (insertError) return json({ error: insertError.message }, { status: 500 });

  return json({ success: true });
}

