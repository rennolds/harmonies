import { json } from '@sveltejs/kit';
import moment from 'moment-timezone';

export async function GET({ locals }) {
  const { session, user } = await locals.safeGetSession();
  if (!session || !user) return json({ error: 'Unauthorized' }, { status: 401 });

  // 1. Get User Stats
  const { data: stats, error } = await locals.supabase
    .from('harmonies_user_stats')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is "Row not found"
    return json({ error: error.message }, { status: 500 });
  }

  // 2. Check if played today
  const today = moment().tz("America/New_York").format("MM/DD/YYYY");
  
  const { data: todaysGame } = await locals.supabase
    .from('harmonies_game_history')
    .select('*')
    .eq('user_id', user.id)
    .eq('puzzle_date', today)
    .maybeSingle();

  // If no data found, return null stats (client will handle sync)
  return json({ 
    stats: stats || null,
    todaysGame: todaysGame || null
  });
}
