import { redirect } from '@sveltejs/kit';

export const load = async ({ locals }) => {
  const { session, user } = await locals.safeGetSession();
  
  // If user is not logged in, redirect to login
  if (!session) {
    throw redirect(303, '/login');
  }

  // Fetch user's profile
  const { data: profile, error: profileError } = await locals.supabase
    .from('profiles')
    .select('username, avatar_color')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    console.error('Error fetching profile:', profileError);
  }

  // Fetch user's puzzles
  const { data: puzzles, error } = await locals.supabase
    .from('harmonies_puzzles')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching puzzles:', error);
  }

  return {
    session,
    user,
    profile: profile || null,
    puzzles: puzzles || []
  };
};

