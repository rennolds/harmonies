// export const prerender = true;

// Add load function to handle date parameter
export const load = async ({ url, data }) => {
  // Get date parameter from URL if present
  const dateParam = url.searchParams.get('date');
  
  // Get puzzle ID for custom puzzles
  const puzzleId = url.searchParams.get('puzzle');
  
  // Determine if we're in archive mode based on presence of date parameter
  const isArchiveMode = dateParam ? true : false;
  
  return {
    // Spread the server data first (includes customPuzzle if present)
    ...data,
    dateParam,
    isArchiveMode,
    puzzleId
  };
};