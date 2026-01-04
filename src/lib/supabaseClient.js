import { createBrowserClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { browser } from '$app/environment';

// Helper to parse cookies
function parseCookies() {
  if (!browser) return {};
  const cookies = {};
  document.cookie.split(';').forEach(cookie => {
    const [key, value] = cookie.trim().split('=');
    if (key) cookies[key] = value;
  });
  return cookies;
}

// Create a browser client with proper cookie configuration for SvelteKit
export const supabase = createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
  cookies: {
    get(key) {
      if (!browser) return undefined;
      return parseCookies()[key];
    },
    set(key, value, options) {
      if (!browser) return;
      let cookieStr = `${key}=${value}`;
      if (options?.path) cookieStr += `; path=${options.path}`;
      if (options?.maxAge) cookieStr += `; max-age=${options.maxAge}`;
      if (options?.domain) cookieStr += `; domain=${options.domain}`;
      if (options?.sameSite) cookieStr += `; samesite=${options.sameSite}`;
      if (options?.secure) cookieStr += `; secure`;
      document.cookie = cookieStr;
    },
    remove(key, options) {
      if (!browser) return;
      let cookieStr = `${key}=; max-age=0`;
      if (options?.path) cookieStr += `; path=${options.path}`;
      if (options?.domain) cookieStr += `; domain=${options.domain}`;
      document.cookie = cookieStr;
    }
  }
});
