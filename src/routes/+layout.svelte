<script>
  import './styles.css';
  import Ramp from './Ramp.svelte';
  
  // Define constants for Ramp
  const PUB_ID = 1025391;
  const WEBSITE_ID = 75241;
  
  export let data;
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