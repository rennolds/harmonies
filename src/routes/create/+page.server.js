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

			categories.push({ name, color, elements: items });
		}

		const playlist = formData.get('playlist');
		const gameoverGif = formData.get('gameoverGif');
        const formTitle = formData.get('title');
        const title = formTitle || 'Untitled';
        
        // New fields
        const dailySubmission = formData.get('daily_submission') === 'on';
        const creditName = formData.get('credit_name') || null;

		const puzzleData = {
			categories,
			playlist,
			gameoverGif
		};

        if (formTitle) {
            puzzleData['special-message'] = true;
            puzzleData['message-content'] = formTitle;
        }

        if (creditName) {
            puzzleData['shoutout'] = true;
            puzzleData['shoutout-name'] = creditName;
        }

		const { data, error } = await locals.supabase.from('harmonies_puzzles').insert({
			user_id: session.user.id,
			puzzle_data: puzzleData,
            title: title,
            daily_submission: dailySubmission,
            credit_name: creditName
		}).select('id').single();

		if (error) {
            console.error(error);
			return fail(500, { error: 'Failed to create puzzle' });
		}

		return { success: true, puzzleId: data.id, submittedToDaily: dailySubmission };
	}
};
