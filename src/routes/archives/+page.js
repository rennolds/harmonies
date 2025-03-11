// export const prerender = true;

// Adding a load function would be needed if server-side rendering
// is required for the archive page
export const load = async ({ url }) => {
  return {
    url: url.pathname
  };
};