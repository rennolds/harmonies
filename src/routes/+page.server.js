export const load = async ({ url, locals }) => {
	const puzzleId = url.searchParams.get('puzzle');
	
	if (puzzleId) {
		// Fetch custom puzzle from database
		const { data: puzzle, error } = await locals.supabase
			.from('harmonies_puzzles')
			.select('*')
			.eq('id', puzzleId)
			.single();
		
		if (error || !puzzle) {
			return {
				customPuzzle: null,
				puzzleNotFound: true
			};
		}

		// Fetch author username if user_id exists
		if (puzzle.user_id) {
			const { data: profile } = await locals.supabase
				.from('profiles')
				.select('username')
				.eq('id', puzzle.user_id)
				.maybeSingle();
			
			if (profile) {
				puzzle.authorUsername = profile.username;
			}
		}
		
		return {
			customPuzzle: puzzle
		};
	}
	
	return {
		customPuzzle: null
	};
};

