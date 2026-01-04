<script>
  import './styles.css';
  import Ramp from './Ramp.svelte';
  import { browser } from '$app/environment';
  import { applyHydratedAuth } from '$lib/stores/statsStore.js';
  import { 
    played, currentStreak, maxStreak, solveList, completedDays 
  } from './store.js';
  import { get } from 'svelte/store';
  
  // Define constants for Ramp
  const PUB_ID = 1025391;
  const WEBSITE_ID = 75241;
  
  export let data;

  // SSR hydration is the source of truth for auth + profile.
  // On client navigations, SvelteKit updates `data.*` and we re-apply it here.
  $: if (browser) {
    applyHydratedAuth({ user: data?.user, profile: data?.profile });
  }

  $: if (browser && data?.user) {
    syncAndLoadStats();
  }

  async function syncAndLoadStats() {
    try {
      // 1. Try to get DB stats
      const res = await fetch('/api/stats');
      const { stats } = await res.json();

      if (stats) {
        // CASE A: User has stats in DB -> Load them into stores
        // This overwrites local storage with the "truth" from DB
        played.set(stats.played);
        currentStreak.set(stats.current_streak);
        maxStreak.set(stats.max_streak);
        solveList.set(stats.solve_list);
        completedDays.set(stats.completed_days);
      } else {
        // CASE B: User has NO stats in DB -> Sync local stats UP to DB
        // This is the "One Time Sync"
        await fetch('/api/stats/sync', {
          method: 'POST',
          body: JSON.stringify({
            played: get(played),
            currentStreak: get(currentStreak),
            maxStreak: get(maxStreak),
            solveList: get(solveList),
            completedDays: get(completedDays)
          })
        });
        // No need to re-fetch; local stats are already correct
      }
    } catch (err) {
      console.error("Stats sync failed", err);
    }
  }
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