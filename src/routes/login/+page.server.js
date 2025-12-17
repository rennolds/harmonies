import { redirect } from '@sveltejs/kit';

export const load = async ({ url, locals }) => {
  const ALLOWED = new Set([
    'https://harmonies.io',
    'https://auth.harmonies.pages.dev',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175'
  ]);

  const r = url.searchParams.get('r') ?? '';
  const n = url.searchParams.get('next') ?? '/';

  const safeNext = n.startsWith('/') ? n : '/';
  const allowed = ALLOWED.has(r);

  // If user is already logged in, redirect to home immediately
  const { session } = await locals.safeGetSession();
  if (session) {
    throw redirect(303, '/');
  }

  return {
    allowed,
    returnTo: allowed ? r : 'https://harmonies.io',
    nextPath: safeNext,
    session
  };
};


