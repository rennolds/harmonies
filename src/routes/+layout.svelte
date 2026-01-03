<script>
  import './styles.css';
  import Ramp from './Ramp.svelte';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { initAuthListener, handleVisibilityChange, userProfile, authUser } from '$lib/stores/statsStore.js';
  
  // Define constants for Ramp
  const PUB_ID = 1025391;
  const WEBSITE_ID = 75241;
  
  export let data;

  // Always sync server profile data to the store on each navigation
  // This ensures the user's chosen color is always displayed
  $: if (data.profile) {
    userProfile.set(data.profile);
  }
  $: if (data.user) {
    authUser.set(data.user);
  }

  // Initialize auth listener and visibility change handler on mount
  onMount(() => {
    if (browser) {
      const unsubscribe = initAuthListener();
      
      // Refresh session when tab becomes visible (handles stale sessions)
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      return () => {
        if (unsubscribe) unsubscribe();
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  });
</script>

<div class="gradient-background"></div>
<Ramp PUB_ID={PUB_ID} WEBSITE_ID={WEBSITE_ID} />
<div class:game-body={data.isMainGame}>
  <slot />
</div>

<style>
  .game-body {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
  }
</style>