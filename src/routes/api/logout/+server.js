export const POST = async ({ locals, cookies }) => {
  try {
    await locals.supabase.auth.signOut();
  } catch (err) {
    // Continue with cookie cleanup even if signOut fails
  }
  
  // Manually clear all Supabase auth cookies as a fallback
  const allCookies = cookies.getAll();
  for (const cookie of allCookies) {
    if (cookie.name.startsWith('sb-') || cookie.name.includes('supabase')) {
      cookies.delete(cookie.name, { path: '/' });
      // If there are other common paths or domains, they could be added here
    }
  }
  
  // Also clear the session cookie specifically if it has a different name
  cookies.delete('supabase-auth-token', { path: '/' });
  
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 
      'Content-Type': 'application/json',
      // Ensure the browser doesn't cache this response
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    }
  });
};
