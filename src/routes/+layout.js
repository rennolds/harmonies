import posthog from 'posthog-js'
import { browser } from '$app/environment';

export const load = async () => {

  if (browser) {
    posthog.init(
      'phc_NxGLcb5AH8tXe8jkrUpVYLAs2zV0HHMqZszPbU5Ea6w',
      { api_host: "https://us.i.posthog.com" }
    )
  }
  return
};