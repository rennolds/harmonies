<script>
  import { flip } from "svelte/animate";

  export let categories;
  export let isArchiveMode = false;
  export let isTodayCompleted = false;
  export let onComplete; // onComplete(mistakeCount, win)

  const MAX_MISTAKES = 4;

  function getElementKey(element) {
    if (typeof element === "object" && element.type === "image") {
      return `image:${element.url}`;
    }
    return String(element);
  }

  function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  let allElements = shuffleArray(categories.flatMap((c) => c.elements));

  let assignments = {};
  let lockedCategories = new Set();
  let selectedItemKeys = [];
  let shakingKeys = new Set();
  let mistakeCount = 0;
  let checking = false;
  let gameOver = false;

  if (isTodayCompleted) {
    categories.forEach((cat, i) => {
      cat.elements.forEach((el) => {
        assignments[getElementKey(el)] = i;
      });
      lockedCategories.add(i);
    });
    lockedCategories = new Set(lockedCategories);
    gameOver = true;
  }

  // Reactive assigned count per category — drives dot fill
  $: assignedCounts = categories.map((_, i) =>
    allElements.filter((el) => assignments[getElementKey(el)] === i).length
  );

  // Auto-check fires when all 16 items are placed
  $: allAssigned = Object.keys(assignments).length === allElements.length;
  $: if (allAssigned && !checking && !gameOver) {
    checking = true;
    checkAssignments();
  }

  function checkAssignments() {
    const newLocked = new Set(lockedCategories);
    const itemsToUnassign = [];
    let wrongThisRound = 0;

    for (let i = 0; i < categories.length; i++) {
      if (newLocked.has(i)) continue;
      const assignedKeys = allElements
        .filter((el) => assignments[getElementKey(el)] === i)
        .map((el) => getElementKey(el));
      const correctKeys = categories[i].elements.map((el) => getElementKey(el));
      const isCorrect =
        assignedKeys.length === correctKeys.length &&
        correctKeys.every((k) => assignedKeys.includes(k));
      if (isCorrect) {
        newLocked.add(i);
      } else {
        itemsToUnassign.push(...assignedKeys);
        wrongThisRound++;
      }
    }

    mistakeCount += wrongThisRound;
    lockedCategories = new Set(newLocked);

    if (newLocked.size === 4) {
      checking = false;
      gameOver = true;
      setTimeout(() => onComplete(mistakeCount, true), 600);
      return;
    }

    if (mistakeCount >= MAX_MISTAKES) {
      shakingKeys = new Set(itemsToUnassign);
      setTimeout(() => {
        shakingKeys = new Set();
        const revealAssignments = {};
        const allLocked = new Set();
        categories.forEach((cat, i) => {
          cat.elements.forEach((el) => {
            revealAssignments[getElementKey(el)] = i;
          });
          allLocked.add(i);
        });
        assignments = revealAssignments;
        lockedCategories = new Set(allLocked);
        checking = false;
        gameOver = true;
        setTimeout(() => onComplete(mistakeCount, false), 800);
      }, 800);
      return;
    }

    // Shake wrong items then bounce back to pool
    shakingKeys = new Set(itemsToUnassign);
    setTimeout(() => {
      const newAssignments = { ...assignments };
      itemsToUnassign.forEach((k) => delete newAssignments[k]);
      assignments = newAssignments;
      shakingKeys = new Set();
      checking = false;
    }, 800);
  }

  function getAssignedColor(element) {
    const idx = assignments[getElementKey(element)];
    if (idx === undefined) return null;
    return categories[idx].color;
  }

  function isItemLocked(element) {
    const idx = assignments[getElementKey(element)];
    return idx !== undefined && lockedCategories.has(idx);
  }

  function handleItemClick(element) {
    if (checking || gameOver) return;
    if (isItemLocked(element)) return;
    const key = getElementKey(element);
    const idx = selectedItemKeys.indexOf(key);
    if (idx > -1) {
      selectedItemKeys = selectedItemKeys.filter((k) => k !== key);
    } else if (selectedItemKeys.length < 4) {
      selectedItemKeys = [...selectedItemKeys, key];
    }
  }

  function handleCategoryClick(catIndex) {
    if (checking || gameOver) return;
    if (lockedCategories.has(catIndex)) return;
    if (selectedItemKeys.length === 0) return;
    const newAssignments = { ...assignments };
    selectedItemKeys.forEach((key) => {
      newAssignments[key] = catIndex;
    });
    assignments = newAssignments;
    selectedItemKeys = [];
  }
</script>

<div class="reverse-categories">
  {#each categories as category, i}
    <button
      class="category-strip
        {lockedCategories.has(i) ? 'locked' : ''}
        {selectedItemKeys.length > 0 && !lockedCategories.has(i) && !gameOver ? 'targetable' : ''}"
      style="border-color: {category.color};
        {lockedCategories.has(i) ? `background-color: ${category.color};` : ''}"
      on:click={() => handleCategoryClick(i)}
    >
      <span
        class="category-name"
        style="color: {lockedCategories.has(i) ? '#202020' : '#ddd'};"
      >{category.name}</span>
      <div class="dot-row">
        {#each [0, 1, 2, 3] as slot}
          <div
            class="dot"
            style="background-color: {assignedCounts[i] > slot
              ? lockedCategories.has(i)
                ? 'rgba(0,0,0,0.25)'
                : category.color
              : '#444'};"
          ></div>
        {/each}
      </div>
    </button>
  {/each}
</div>

<div class="grid-container">
  {#each allElements as element (getElementKey(element))}
    {@const isSelected = selectedItemKeys.includes(getElementKey(element))}
    {@const assignedColor = getAssignedColor(element)}
    <div
      animate:flip={{ duration: 250 }}
      class="grid-item
        {shakingKeys.has(getElementKey(element)) ? 'shake' : ''}
        {isItemLocked(element) ? 'locked-item' : ''}"
      style:background-color={isSelected
        ? '#505050'
        : (assignedColor ?? undefined)}
      style:color={isSelected ? '#fff' : (assignedColor ? '#202020' : undefined)}
      on:click={() => handleItemClick(element)}
    >
      {#if typeof element === "object" && element.type === "image"}
        <img src={element.url} alt={element.alt || ""} class="grid-image" />
      {:else}
        <p>{element}</p>
      {/if}
    </div>
  {/each}
</div>

{#if !gameOver}
  <div class="mistakes-bar">
    <span class="mistakes-label">mistakes remaining:</span>
    <div class="mistake-dots">
      {#each Array(MAX_MISTAKES) as _, i}
        <div
          class="mistake-dot {i < MAX_MISTAKES - mistakeCount ? 'active' : 'used'}"
        ></div>
      {/each}
    </div>
  </div>
{/if}

<style>
  /* ── Category strips ─────────────────────────────────────────────── */
  .reverse-categories {
    display: flex;
    flex-direction: column;
    gap: 6px;
    width: 100%;
    max-width: 400px;
    min-width: 350px;
    margin: 0 auto 8px auto;
    box-sizing: border-box;
  }

  .category-strip {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    border: 2px solid;
    border-radius: 8px;
    background: transparent;
    cursor: pointer;
    transition: background-color 0.35s ease, filter 0.15s ease,
      transform 0.1s ease;
    width: 100%;
    text-align: left;
    box-sizing: border-box;
    min-height: 44px;
  }

  .category-strip:active {
    transform: scale(0.98);
  }

  .category-strip.targetable:hover {
    filter: brightness(1.2);
  }

  .category-strip.locked {
    cursor: default;
  }

  .category-name {
    font-size: 13px;
    font-weight: 700;
    flex: 1;
    text-align: left;
    margin-right: 10px;
    line-height: 1.3;
  }

  .dot-row {
    display: flex;
    gap: 5px;
    flex-shrink: 0;
  }

  .dot {
    width: 11px;
    height: 11px;
    border-radius: 50%;
    transition: background-color 0.3s ease;
    flex-shrink: 0;
  }

  /* ── Mistakes bar ────────────────────────────────────────────────── */
  .mistakes-bar {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin-top: 6px;
    padding: 4px 0 2px;
  }

  .mistakes-label {
    font-size: 12px;
    font-weight: 600;
    color: #aaa;
  }

  .mistake-dots {
    display: flex;
    gap: 6px;
  }

  .mistake-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    transition: background-color 0.3s ease;
  }

  .mistake-dot.active {
    background-color: #ddd;
  }

  .mistake-dot.used {
    background-color: #444;
  }

  /* ── Grid (scoped copy of +page.svelte styles) ───────────────────── */
  .grid-container {
    display: grid;
    align-items: center;
    grid-template-rows: repeat(4, minmax(0, 1fr));
    grid-template-columns: repeat(4, minmax(0, 1fr));
    grid-gap: 10px;
    width: 100%;
    max-width: 400px;
    min-width: 350px;
    font-weight: bold;
    padding: 2px;
    text-transform: uppercase;
    margin-bottom: 3px;
    box-sizing: border-box;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .grid-item {
    border-style: none;
    border-radius: 8px;
    background-color: #fff;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 80px;
    font-size: 14px;
    width: 90px;
    text-align: center;
    cursor: pointer;
    transition: background-color 0.4s, border-color 0.3s, transform 1s;
    overflow: hidden;
    font-weight: 700;
    color: black;
    line-height: 18px;
    overflow-wrap: break-word;
  }

  .grid-item p {
    max-width: 90%;
    margin: 0;
  }

  .grid-item:not(.locked-item):hover {
    background-color: #b7b7b7;
    transition: background-color 0.2s;
  }

  .locked-item {
    cursor: default;
  }

  .grid-image {
    max-width: 90%;
    max-height: 90%;
    object-fit: contain;
  }

  @keyframes shake {
    0% { transform: translate(0, 0); }
    10%, 90% { transform: translate(-4px, 0); }
    20%, 80% { transform: translate(4px, 0); }
    30%, 50%, 70% { transform: translate(-4px, 0); }
    40%, 60% { transform: translate(4px, 0); }
    100% { transform: translate(0, 0); }
  }

  .shake {
    animation: shake 0.5s ease-in-out;
  }

  /* ── Responsive ──────────────────────────────────────────────────── */
  @media (max-width: 767px) {
    .grid-item {
      align-items: center;
      box-sizing: border-box;
    }
    .grid-item p {
      display: -webkit-box;
      -webkit-line-clamp: 4;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  @media only screen and (max-width: 390px) {
    .reverse-categories { min-width: auto; max-width: 92vw; }
    .grid-container { max-width: 92vw; min-width: auto; }
    .grid-item { font-size: 11px; height: 60px; width: 82px; }
    .grid-item p { -webkit-line-clamp: 3; line-height: 14px; }
  }

  @media only screen and (min-width: 391px) and (max-width: 500px) {
    .grid-container { max-width: 92vw; }
    .grid-item { font-size: 12px; height: 68px; width: 20.5vw; }
    .grid-item p { -webkit-line-clamp: 3; line-height: 15px; }
  }

  @media only screen and (min-width: 501px) and (max-width: 600px) {
    .grid-item { font-size: 12px; height: 68px; width: 16.5vw; }
    .grid-item p { -webkit-line-clamp: 3; line-height: 15px; }
  }

  @media only screen and (max-width: 767px) and (min-width: 601px) {
    .grid-item { font-size: 14px; height: 70px; width: 10vw; }
    .grid-item p { -webkit-line-clamp: 3; line-height: 16px; }
  }

  @media (min-width: 768px) {
    .reverse-categories {
      display: grid;
      grid-template-columns: 1fr 1fr;
      max-width: 680px;
      min-width: 660px;
    }
    .grid-container { max-width: 680px; }
    .grid-item.has-image { height: 185px; width: 185px; }
    .category-strip { min-height: 52px; }
    .category-name { font-size: 14px; }
  }
</style>
