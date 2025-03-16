<script>
    import { scale } from 'svelte/transition';
 
    export let guesses;
</script>

<div in:scale={{ duration: 1000 }} class="grid-container">
    {#each guesses as guess}
        {#each guess as g}
            <div style="background-color:{g.color}" class="block"></div>
        {/each}
    {/each}
</div>


<style>
    .grid-container {
      display: grid;
      align-items: center;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      grid-gap: 5px;
      align-self: center;
      max-height: 200px;
      
    }

    .block {
        height: 15px;
        width: 15px;
        border-radius: 5px;
    }
</style>