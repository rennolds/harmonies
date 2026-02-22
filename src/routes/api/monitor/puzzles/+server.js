import { json } from '@sveltejs/kit';
import gameboards from '$lib/data/gameboards.json';

export async function GET({ url }) {
  try {
    const days = parseInt(url.searchParams.get('days') ?? '21', 10);

    if (isNaN(days) || days < 1) {
      return json(
        {
          status: 'error',
          timestamp: new Date().toISOString(),
          error: 'Invalid "days" parameter — must be a positive integer'
        },
        { status: 400 }
      );
    }

    // Build a list of the next `days` dates starting from today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const puzzles = {};

    for (let i = 0; i < days; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);

      // Format as MM/DD/YYYY to match gameboards.json keys
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const yyyy = d.getFullYear();
      const key = `${mm}/${dd}/${yyyy}`;

      puzzles[key] = gameboards[key] ?? null;
    }

    return json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      days,
      puzzles
    });
  } catch (error) {
    console.error('Monitor puzzles endpoint error:', error);
    return json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Failed to read gameboards data'
      },
      { status: 500 }
    );
  }
}
