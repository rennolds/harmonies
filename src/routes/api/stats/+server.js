import { json } from '@sveltejs/kit';

export async function GET({ locals }) {
  const { session, user } = await locals.safeGetSession();
  if (!session || !user) return json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await locals.supabase
    .from('harmonies_user_stats')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is "Row not found"
    return json({ error: error.message }, { status: 500 });
  }

  // If no data found, return null stats (client will handle sync)
  return json({ stats: data || null });
}

