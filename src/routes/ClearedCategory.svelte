<script>
    import { sineInOut } from "svelte/easing";
    export let category;

    let isActive = true;
    const customTransition = () => {
        return {
        css: (t) => {
            return `
            transform: scale(${t});
            `;
        },
        delay: 600,
        duration: 900,
        easing: sineInOut
        };
    };
    
</script>
{#if category.name == "Why did Fall Out Boy love paragraph song titles?"}
<div transition:customTransition style="background-color: {category.color}" class="full-row">
    <h2>{category.name}</h2>
    <p>I Slept With..., Our Lawyer..., Sophomore Slump..., A Little Less...</p>
</div>
{:else}
<div transition:customTransition style="background-color: {category.color}" class="full-row">
    <h2>{category.name}</h2>
    <p>{category.elements[0]}, {category.elements[1]}, {category.elements[2]}, {category.elements[3]}</p>
</div>
{/if}

<style>

.full-row {
    grid-column: 1 / -1; /* Spans entire row */
    border-style: none;
    border-radius: 8px;
    color: black;
    line-height: 25px;
    overflow: hidden;
    height: 80px;
    width: 100%;
    justify-content: center;
    display: flex;
    flex-direction: column;
    align-items: center;
}

@media only screen and (max-width: 390px) {
    .full-row {
        height: 60px;
    }
}

@media only screen and (min-width: 501px) and (max-width: 600px)  { 
    .full-row {
      font-size: 12px;
      height: 68px;
      width: 100%;
    }
  }

@media only screen and (min-width: 391px) and (max-width: 500px)  { /* smartphones, iPhone, portrait 480x320 phones */ 
    .full-row {
        height: 68px;
    }
}

@media only screen and (max-width: 1200px) and (min-width: 601px) {
    .full-row {
        height: 70px;
    }
}

@media (max-width: 768px) {
  .full-row {
    line-height: 19px;
  }

  .full-row h2 {
    font-weight: 800;
    font-size: 12px;
  }
}

h2 {
    position: relative;
    left: 50;
    font-size: 12px;
    margin-bottom: -12px;
    width: 95%;
}

p {
    font-size: 9px;
    width: 95%;
    justify-content: center;
}

</style>