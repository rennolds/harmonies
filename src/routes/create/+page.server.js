import { fail } from '@sveltejs/kit';

export const load = async ({ locals }) => {
	const { session } = await locals.safeGetSession();

	// Don't redirect - let the page load and show an overlay if not authenticated
	return {
		session,
		isAuthenticated: !!session
	};
};

export const actions = {
	default: async ({ request, locals }) => {
		const { session } = await locals.safeGetSession();
		if (!session) {
			return fail(401, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const categories = [];
        
        // Fixed colors in difficulty order
        const COLORS = ['#CBff70', '#FAA3FF', '#78DAF9', '#FFBC21'];

			// Collect all items for duplicate checking
		const allItems = [];

		for (let i = 0; i < 4; i++) {
			const name = formData.get(`category_${i}_name`);
			// Use fixed color instead of form input
			const color = COLORS[i];
			const items = [
				formData.get(`category_${i}_item_0`),
				formData.get(`category_${i}_item_1`),
				formData.get(`category_${i}_item_2`),
				formData.get(`category_${i}_item_3`)
			];

			if (!name || items.some((item) => !item)) {
				return fail(400, { error: 'All category fields are required' });
			}

			// Collect items for duplicate check (case-insensitive)
			for (const item of items) {
				allItems.push(item.trim().toLowerCase());
			}

			categories.push({ name, color, elements: items });
		}

		// Check for duplicate items across all categories
		const seen = new Set();
		const duplicates = [];
		for (const item of allItems) {
			if (seen.has(item)) {
				if (!duplicates.includes(item)) {
					duplicates.push(item);
				}
			} else {
				seen.add(item);
			}
		}
		
		if (duplicates.length > 0) {
			return fail(400, { error: `Duplicate items are not allowed: "${duplicates.join('", "')}"` });
		}

		const playlist = formData.get('playlist');
		const gameoverGif = formData.get('gameoverGif');
        const formTitle = formData.get('title');
        const title = formTitle || 'Untitled';
        
        // New fields
        const dailySubmission = formData.get('daily_submission') === 'on';
        const creditUsername = formData.get('credit_username') === 'on';
        const anonymous = !creditUsername; // Inverted: unchecked = anonymous

		const puzzleData = {
			categories,
			playlist,
			gameoverGif
		};

        if (formTitle) {
            puzzleData['special-message'] = true;
            puzzleData['message-content'] = formTitle;
        }

        // Anonymous credit (respected for daily submissions, too)
        puzzleData['anonymous'] = anonymous;
        if (anonymous) {
            // Don't show shoutout when anonymous
            puzzleData['shoutout'] = false;
            puzzleData['shoutout-name'] = '';
        } else {
            // Fetch username to credit the creator
            const { data: profile } = await locals.supabase
                .from('profiles')
                .select('username')
                .eq('id', session.user.id)
                .maybeSingle();
            
            if (profile?.username) {
                puzzleData['shoutout'] = true;
                puzzleData['shoutout-name'] = profile.username;
            }
        }

		const { data, error } = await locals.supabase.from('harmonies_puzzles').insert({
			user_id: session.user.id,
			puzzle_data: puzzleData,
            title: title,
            daily_submission: dailySubmission
		}).select('id').single();

		if (error) {
            console.error(error);
			return fail(500, { error: 'Failed to create puzzle' });
		}

		return { success: true, puzzleId: data.id, submittedToDaily: dailySubmission };
	}
};
