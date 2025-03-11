export const load = ({ url }) => {
    // Check the current path
    const path = url.pathname;
    const isMainGame = path === '/' || path.includes('/?date=');
    
    return {
      isMainGame
    };
  };