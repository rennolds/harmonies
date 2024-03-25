<script>
    export let guesses;
</script>

<div class="grid-container">
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
        height: 25px;
        width: 25px;
        border-radius: 5px;
    }
</style>




