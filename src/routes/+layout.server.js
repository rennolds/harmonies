export const load = async ({ locals }) => {
  const { session, user } = await locals.safeGetSession();
  
  let profile = null;
  
  // If user is logged in, fetch their profile
  if (user) {
    const { data, error } = await locals.supabase
      .from('profiles')
      .select('username, avatar_color')
      .eq('id', user.id)
      .maybeSingle();
    
    if (!error && data) {
      profile = data;
    }
  }

  return {
    session,
    user,
    profile
  };
};


