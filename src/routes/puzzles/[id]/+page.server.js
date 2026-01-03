import { redirect } from '@sveltejs/kit';

export const load = async ({ params }) => {
	// Redirect to main page with puzzle query param
	throw redirect(302, `/?puzzle=${params.id}`);
};
