import { createServerClient } from '@supabase/ssr';
import { sequence } from '@sveltejs/kit/hooks';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

const supabase = async ({ event, resolve }) => {
	event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		cookies: {
			getAll: () => event.cookies.getAll(),
			setAll: (cookiesToSet) => {
				try {
					cookiesToSet.forEach(({ name, value, options }) => {
						event.cookies.set(name, value, { ...options, path: '/' });
					});
				} catch (error) {
					// Silently ignore - cookies can't be set after response is sent
					// This is expected behavior during async auth operations
				}
			}
		}
	});

	event.locals.safeGetSession = async () => {
		// Per-request cache: avoids duplicate auth roundtrips if multiple loads call this.
		if (event.locals._safeGetSessionCache) return event.locals._safeGetSessionCache;

		const {
			data: { session },
		} = await event.locals.supabase.auth.getSession();

		if (!session) {
			event.locals._safeGetSessionCache = { session: null, user: null };
			return event.locals._safeGetSessionCache;
		}

		const {
			data: { user },
			error
		} = await event.locals.supabase.auth.getUser();
		
		if (error) {
			event.locals._safeGetSessionCache = { session: null, user: null };
			return event.locals._safeGetSessionCache;
		}

		event.locals._safeGetSessionCache = { session, user };
		return event.locals._safeGetSessionCache;
	};

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			/**
			 * Supabase libraries use the `content-range` and `x-supabase-api-version`
			 * headers, so we need to tell SvelteKit to pass it through.
			 */
			return name === 'content-range' || name === 'x-supabase-api-version';
		}
	});
};

export const handle = sequence(supabase);
