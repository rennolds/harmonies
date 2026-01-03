import { browser } from '$app/environment';

// Lazy-loaded filter instance
let filter = null;

/**
 * Get or create the profanity filter (lazy initialization)
 */
async function getFilter() {
  if (!filter) {
    const { Filter } = await import('bad-words');
    filter = new Filter();
  }
  return filter;
}

/**
 * Check if text contains profanity
 * @param {string} text - The text to check
 * @returns {Promise<boolean>} - True if profanity found
 */
export async function containsProfanity(text) {
  if (!text || typeof text !== 'string') return false;
  
  // Only check profanity in browser
  if (!browser) return false;
  
  try {
    const f = await getFilter();
    return f.isProfane(text);
  } catch (err) {
    console.error('Error checking profanity:', err);
    return false;
  }
}

/**
 * Validate a username
 * @param {string} username - The username to validate
 * @returns {Promise<string|null>} - Error message if invalid, null if valid
 */
export async function validateUsername(username) {
  if (!username || typeof username !== 'string') {
    return 'Username is required.';
  }

  const trimmed = username.trim();

  if (trimmed.length < 3) {
    return 'Username must be at least 3 characters.';
  }

  if (trimmed.length > 24) {
    return 'Username must be 24 characters or less.';
  }

  // Only allow letters, numbers, underscores, and hyphens
  if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return 'Username can only contain letters, numbers, underscores, and hyphens.';
  }

  // Check for profanity
  if (await containsProfanity(trimmed)) {
    return 'Username contains inappropriate language.';
  }

  return null;
}
