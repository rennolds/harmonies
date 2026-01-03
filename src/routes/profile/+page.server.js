import { redirect } from '@sveltejs/kit';

export const load = async ({ locals }) => {
  const { session, user } = await locals.safeGetSession();
  
  // If user is not logged in, redirect to login
  if (!session) {
    throw redirect(303, '/login');
  }

  return {
    session,
    user
  };
};

