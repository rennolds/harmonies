export const load = async ({ url }) => {
    // Get date parameter from URL if present
    const dateParam = url.searchParams.get('date');
    
    return {
      dateParam
    };
  };