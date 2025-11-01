import { json } from '@sveltejs/kit';
import gameboards from '$lib/data/gameboards.json';

export async function GET() {
  try {
    // Extract and return only the dates from gameboards data
    const dates = Object.keys(gameboards);
    
    return json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      dates: dates
    });
  } catch (error) {
    console.error('Monitor endpoint error:', error);
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

