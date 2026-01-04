export const load = ({ url }) => {
    // Query params are not part of pathname; main game is always `/`
    const isMainGame = url.pathname === '/';
    
    return {
      isMainGame
    };
  };