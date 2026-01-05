export const load = ({ url, data }) => {
    // Query params are not part of pathname; main game is always `/`
    const isMainGame = url.pathname === '/';
    
    return {
      ...data,  // Pass through server data (session, user, profile)
      isMainGame
    };
  };