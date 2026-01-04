<script>
  import './styles.css';
  import Ramp from './Ramp.svelte';
  import { onMount } from 'svelte';
  import { invalidateAll } from '$app/navigation';
  import { supabase } from '$lib/supabaseClient';
  import { browser } from '$app/environment';
  import { applyHydratedAuth, ensureValidSession } from '$lib/stores/statsStore.js';
  import { 
    played, currentStreak, maxStreak, solveList, completedDays,
    guessHistory, mistakeCount, todaysProgressDate, currentGameDate
  } from './store.js';
  import { get } from 'svelte/store';
  
  // Define constants for Ramp
  const PUB_ID = 1025391;
  const WEBSITE_ID = 75241;
  
  export let data;

  onMount(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && data.user) {
        const result = await ensureValidSession();
        
        if (!result.valid) {
           await invalidateAll();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'SIGNED_OUT') {
        const currentUserId = data.user?.id;
        const newUserId = session?.user?.id;
        
        // If the user ID changed, or we have a session but data doesn't reflect it yet
        if (newUserId !== currentUserId) {
           await invalidateAll();
           
           // If we have a user now, immediately update store for UI feedback
           // (Profile will come in after invalidateAll completes)
           if (session?.user && !currentUserId) {
             applyHydratedAuth({ user: session.user, profile: data?.profile }); 
           }
        }
      }
    });

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  });

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
      // Ensure valid session before syncing
      await ensureValidSession();

      // 1. Try to get DB stats
      const res = await fetch('/api/stats');
      const { stats, todaysGame } = await res.json();

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

      // 2. Restore today's game state if exists
      if (todaysGame) {
        // Mark today as progressed/finished
        todaysProgressDate.set(todaysGame.puzzle_date);
        currentGameDate.set(todaysGame.puzzle_date);
        
        // Restore game specific state
        guessHistory.set(todaysGame.guess_history);
        mistakeCount.set(todaysGame.mistake_count);
        // Note: clearedCategories logic is handled in +page.svelte 
        // by detecting that the game is "completed" based on completedDays
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