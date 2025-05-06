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
      easing: sineInOut,
    };
  };

  function formatElement(element) {
    if (typeof element === "object" && element.type === "image") {
      return element.alt || "Image";
    }
    return element;
  }
</script>

{#if category.name == "2000's Emo Songs"}
  <div
    transition:customTransition
    style="background-color: {category.color}"
    class="full-row"
  >
    <h2>{category.name}</h2>
    <p>
      This Ain't a Scene..., You Know What They Do..., Lying Is The Most Fun,
      Cute Without the 'E'
    </p>
  </div>
{:else}
  <div
    transition:customTransition
    style="background-color: {category.color}"
    class="full-row"
  >
    <h2>{category.name}</h2>
    <p>
      {formatElement(category.elements[0])}, {formatElement(
        category.elements[1]
      )}, {formatElement(category.elements[2])}, {formatElement(
        category.elements[3]
      )}
    </p>
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
    width: 100%;
    justify-content: center;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  @media (max-width: 768px) {
    .full-row {
      line-height: 1.3;
    }

    .full-row h2 {
      font-weight: 800;
      font-size: clamp(10px, 2.5vw, 14px);
      margin-bottom: -5px;
    }
    .full-row p {
      font-size: clamp(8px, 2vw, 11px);
    }
  }

  @media (max-width: 767px) {
    .full-row {
      height: 65px; /* Adjust as needed for visual consistency */
    }
  }

  h2 {
    position: relative;
    left: 50;
    font-size: clamp(11px, 3vw, 16px);
    margin-bottom: -12px;
    width: 95%;
    font-weight: bold;
  }

  p {
    font-size: clamp(9px, 2.5vw, 12px);
    width: 95%;
    justify-content: center;
  }
</style>
