<script>
  import { createEventDispatcher, onDestroy } from "svelte";
  import { flip } from "svelte/animate";
  import { scale } from "svelte/transition";
  import ClearedCategory from "./ClearedCategory.svelte";

  export let categories = [];
  export let decoys = [];
  export let gameOver = false;

  const dispatch = createEventDispatcher();

  // ─── Helpers ────────────────────────────────────────────────────────────────

  function getElementKey(element) {
    if (typeof element === "object" && element.type === "image") {
      return `image:${element.url}`;
    }
    return String(element);
  }

  function shuffleArray(arr) {
    let a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ─── State ──────────────────────────────────────────────────────────────────

  let allItems = shuffleArray([
    ...categories.flatMap((c) => c.elements),
    ...decoys,
  ]);

  // slots[catIndex][slotIndex] = item | null
  let slots = categories.map(() => [null, null, null, null]);

  let lockedCategories = new Set();
  let mistakeCount = 0;
  let submissionHistory = [];
  let showingResult = false;
  let lastSubmissionResult = null;

  // ─── Derived ────────────────────────────────────────────────────────────────

  $: lockedItemKeys = new Set(
    [...lockedCategories].flatMap((ci) =>
      categories[ci].elements.map(getElementKey),
    ),
  );

  $: slottedItemKeys = new Set(slots.flat().filter(Boolean).map(getElementKey));

  $: pool = allItems.filter((item) => {
    const key = getElementKey(item);
    return !lockedItemKeys.has(key) && !slottedItemKeys.has(key);
  });
  $: redHerringsCategory = {
    name: "RED HERRINGS",
    color: "#E07A8A",
    elements: pool.slice(0, 4),
  };

  $: canSubmit =
    !gameOver &&
    !showingResult &&
    categories.every(
      (_, i) => lockedCategories.has(i) || slots[i].every((s) => s !== null),
    );

  // ─── Drag State ─────────────────────────────────────────────────────────────

  // ─── Drag State ─────────────────────────────────────────────────────────────

  /** @type {any} */
  let dragItem = null;
  /** @type {'pool' | { catIndex: number, slotIndex: number }} */
  let dragSource = null;
  let ghostX = 0;
  let ghostY = 0;
  let ghostW = 0;
  let ghostH = 0;
  let ghostOffsetX = 0;
  let ghostOffsetY = 0;
  let dragHasMoved = false;
  let suppressClick = false;

  /** @type {{ type: 'slot', catIndex: number, slotIndex: number } | { type: 'category', catIndex: number } | { type: 'pool' } | null} */
  let hoveredDrop = null;

  // ─── Drag Logic ─────────────────────────────────────────────────────────────
  // Desktop: drag starts immediately on pointerdown.
  // Mobile (touch): drag starts after a 300ms long-press. If the finger moves
  // before that, the hold timer is cancelled and the browser scrolls normally.
  // Tap (short press + release) always goes through the tap-to-place flow.

  const LONG_PRESS_MS = 300;
  const LONG_PRESS_MOVE_TOLERANCE = 8; // px — cancel hold if finger drifts

  let holdTimer = null;
  let holdItem = null;
  let holdSource = null;
  let holdStartX = 0;
  let holdStartY = 0;
  /** @type {EventTarget | null} */
  let holdTarget = null;
  let isDragging = false; // true once drag is fully active (ghost visible)

  function resetDragState() {
    dragItem = null;
    dragSource = null;
    hoveredDrop = null;
    dragHasMoved = false;
    isDragging = false;
    clearHoldTimer();
  }

  function clearHoldTimer() {
    if (holdTimer) {
      clearTimeout(holdTimer);
      holdTimer = null;
    }
    holdItem = null;
    holdSource = null;
    holdTarget = null;
  }

  function cleanupListeners() {
    if (typeof window === "undefined") return;
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", handlePointerUp);
    window.removeEventListener("pointercancel", handlePointerCancel);
    window.removeEventListener("blur", handlePointerCancel);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  }

  function handleVisibilityChange() {
    if (typeof document !== "undefined" && document.hidden) {
      handlePointerCancel();
    }
  }

  function startDrag(event, item, source) {
    if (gameOver || showingResult) return;

    // If a previous drag is stuck, force-cancel it
    if (dragItem || isDragging) {
      cleanupListeners();
      resetDragState();
    }
    cleanupListeners();

    const isTouch = event.pointerType === "touch";

    if (isTouch) {
      // --- Touch: start a long-press timer ---
      holdItem = item;
      holdSource = source;
      holdStartX = event.clientX;
      holdStartY = event.clientY;
      holdTarget = event.currentTarget;

      holdTimer = setTimeout(() => {
        // Long press succeeded — begin drag
        activateDrag(holdItem, holdSource, holdTarget, holdStartX, holdStartY);
        clearHoldTimer();
      }, LONG_PRESS_MS);

      // Listen for move/up to cancel the hold if needed
      window.addEventListener("pointermove", handleHoldMove, {
        passive: true,
      });
      window.addEventListener("pointerup", handleHoldUp);
      window.addEventListener("pointercancel", handleHoldCancel);
    } else {
      // --- Mouse: start drag immediately ---
      activateDrag(
        item,
        source,
        event.currentTarget,
        event.clientX,
        event.clientY,
      );
    }
  }

  // Called when a drag actually begins (immediately for mouse, after hold for touch)
  function activateDrag(item, source, targetEl, clientX, clientY) {
    if (!targetEl) return;
    const rect = targetEl.getBoundingClientRect();

    dragItem = item;
    dragSource = source;
    dragHasMoved = false;
    isDragging = true;

    ghostW = rect.width;
    ghostH = rect.height;
    ghostOffsetX = clientX - rect.left;
    ghostOffsetY = clientY - rect.top;
    ghostX = rect.left;
    ghostY = rect.top;

    // Clean up hold-phase listeners before adding drag-phase listeners
    window.removeEventListener("pointermove", handleHoldMove);
    window.removeEventListener("pointerup", handleHoldUp);
    window.removeEventListener("pointercancel", handleHoldCancel);

    window.addEventListener("pointermove", handlePointerMove, {
      passive: false,
    });
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerCancel);
    window.addEventListener("blur", handlePointerCancel);
    document.addEventListener("visibilitychange", handleVisibilityChange);
  }

  // --- Hold-phase handlers (touch only, before drag activates) ---

  function handleHoldMove(event) {
    if (!holdTimer) return;
    const dx = event.clientX - holdStartX;
    const dy = event.clientY - holdStartY;
    if (
      Math.abs(dx) > LONG_PRESS_MOVE_TOLERANCE ||
      Math.abs(dy) > LONG_PRESS_MOVE_TOLERANCE
    ) {
      // Finger moved too far — cancel hold, let browser scroll
      handleHoldCancel();
    }
  }

  function handleHoldUp() {
    // Released before long-press threshold — treat as tap
    const item = holdItem;
    const source = holdSource;
    handleHoldCancel();
    if (item) {
      handleTap(item, source);
    }
  }

  function handleHoldCancel() {
    clearHoldTimer();
    window.removeEventListener("pointermove", handleHoldMove);
    window.removeEventListener("pointerup", handleHoldUp);
    window.removeEventListener("pointercancel", handleHoldCancel);
  }

  // --- Drag-phase handlers (active drag for both mouse and touch) ---

  function handlePointerMove(event) {
    if (!dragItem) return;
    event.preventDefault(); // lock scroll while actively dragging

    dragHasMoved = true;
    ghostX = event.clientX - ghostOffsetX;
    ghostY = event.clientY - ghostOffsetY;

    updateHoveredDrop(event.clientX, event.clientY);
  }

  function handlePointerUp(event) {
    if (!dragItem) {
      cleanupListeners();
      return;
    }

    const drop = hoveredDrop;
    const item = dragItem;
    const source = dragSource;
    const moved = dragHasMoved;

    cleanupListeners();
    resetDragState();

    if (!moved) {
      handleTap(item, source);
      return;
    }

    suppressClick = true;
    setTimeout(() => {
      suppressClick = false;
    }, 0);

    performDrop(item, source, drop);
  }

  function handlePointerCancel() {
    cleanupListeners();
    resetDragState();
  }

  onDestroy(cleanupListeners);

  function updateHoveredDrop(x, y) {
    const elements = document.elementsFromPoint(x, y);
    hoveredDrop = null;
    for (const el of elements) {
      if (el.dataset.dropSlot) {
        const [ci, si] = el.dataset.dropSlot.split(",").map(Number);
        hoveredDrop = { type: "slot", catIndex: ci, slotIndex: si };
        return;
      }
      if (el.dataset.dropCategory !== undefined) {
        hoveredDrop = {
          type: "category",
          catIndex: parseInt(el.dataset.dropCategory),
        };
        return;
      }
      if (el.dataset.dropPool !== undefined) {
        hoveredDrop = { type: "pool" };
        return;
      }
    }
  }

  function performDrop(item, source, target) {
    if (!target) return; // dropped on nothing — leave in place (no change)

    const newSlots = slots.map((cs) => [...cs]);

    if (target.type === "pool") {
      // Return item to pool: remove from its source slot
      if (source !== "pool") {
        newSlots[source.catIndex][source.slotIndex] = null;
        slots = newSlots;
      }
      return;
    }

    if (target.type === "slot") {
      const { catIndex, slotIndex } = target;
      if (lockedCategories.has(catIndex)) return;

      const existing = newSlots[catIndex][slotIndex];

      if (source !== "pool") {
        newSlots[source.catIndex][source.slotIndex] = existing; // swap or clear
      }
      newSlots[catIndex][slotIndex] = item;
      slots = newSlots;
      return;
    }

    if (target.type === "category") {
      const { catIndex } = target;
      if (lockedCategories.has(catIndex)) return;

      // Find first empty slot
      const firstEmpty = newSlots[catIndex].findIndex((s) => !s);
      if (firstEmpty === -1) return; // no room

      if (source !== "pool") {
        newSlots[source.catIndex][source.slotIndex] = null;
      }
      newSlots[catIndex][firstEmpty] = item;
      slots = newSlots;
      return;
    }
  }

  // ─── Tap fallback (for mobile or short clicks) ───────────────────────────────
  // Keeps a "selected item" and lets user tap a slot or category to place it.

  /** @type {any} */
  let selectedItem = null;
  let selectedSource = null;

  function handleTap(item, source) {
    if (selectedItem && getElementKey(selectedItem) === getElementKey(item)) {
      // Deselect
      selectedItem = null;
      selectedSource = null;
      return;
    }
    selectedItem = item;
    selectedSource = source;
  }

  function handleSlotTap(catIndex, slotIndex) {
    if (suppressClick) return;
    if (gameOver || showingResult) return;
    if (lockedCategories.has(catIndex)) return;

    if (!selectedItem) {
      // Try to pick up the item in this slot
      const item = slots[catIndex][slotIndex];
      if (item) {
        selectedItem = item;
        selectedSource = { catIndex, slotIndex };
      }
      return;
    }

    // Place selected item here
    const newSlots = slots.map((cs) => [...cs]);
    const existing = newSlots[catIndex][slotIndex];

    if (selectedSource !== "pool") {
      newSlots[selectedSource.catIndex][selectedSource.slotIndex] = existing;
    }
    newSlots[catIndex][slotIndex] = selectedItem;

    slots = newSlots;
    selectedItem = null;
    selectedSource = null;
  }

  function handlePoolItemTap(item) {
    if (suppressClick) return;
    if (gameOver || showingResult) return;

    if (
      selectedItem &&
      getElementKey(selectedItem) === getElementKey(item) &&
      selectedSource === "pool"
    ) {
      // Deselect
      selectedItem = null;
      selectedSource = null;
      return;
    }

    if (selectedItem && selectedSource !== "pool") {
      // Place current selection back in pool (remove from slot)
      const newSlots = slots.map((cs) => [...cs]);
      newSlots[selectedSource.catIndex][selectedSource.slotIndex] = null;
      slots = newSlots;
    }

    selectedItem = item;
    selectedSource = "pool";
  }

  function handleCategoryAreaTap(catIndex) {
    if (suppressClick) return;
    if (gameOver || showingResult) return;
    if (lockedCategories.has(catIndex)) return;
    if (!selectedItem) return;

    const newSlots = slots.map((cs) => [...cs]);
    const firstEmpty = newSlots[catIndex].findIndex((s) => !s);
    if (firstEmpty === -1) return;

    if (selectedSource !== "pool") {
      newSlots[selectedSource.catIndex][selectedSource.slotIndex] = null;
    }
    newSlots[catIndex][firstEmpty] = selectedItem;
    slots = newSlots;
    selectedItem = null;
    selectedSource = null;
  }

  // Clear selected when clicking empty space
  function handleContainerClick(event) {
    if (event.target === event.currentTarget) {
      selectedItem = null;
      selectedSource = null;
    }
  }

  // ─── Game Logic ─────────────────────────────────────────────────────────────

  function handleSubmit() {
    if (!canSubmit) return;

    let result = [];
    let newMistakes = 0;
    let newLocked = new Set(lockedCategories);

    for (let i = 0; i < 4; i++) {
      if (lockedCategories.has(i)) {
        result.push({
          index: i,
          correct: true,
          alreadyLocked: true,
          color: categories[i].color,
        });
        continue;
      }

      const catItems = slots[i].filter(Boolean);
      const correctElements = categories[i].elements;

      const allCorrect =
        catItems.length === 4 &&
        catItems.every((item) => {
          const key = getElementKey(item);
          return correctElements.some((c) => getElementKey(c) === key);
        });

      if (allCorrect) {
        newLocked.add(i);
        result.push({
          index: i,
          correct: true,
          alreadyLocked: false,
          color: categories[i].color,
        });
      } else {
        newMistakes++;
        result.push({
          index: i,
          correct: false,
          color: categories[i].color,
        });
      }
    }

    lastSubmissionResult = result;
    showingResult = true;
    submissionHistory = [...submissionHistory, result];

    setTimeout(() => {
      // Lock correct categories (clear their slots so ClearedCategory takes over)
      const newSlots = slots.map((cs) => [...cs]);
      for (const r of result) {
        if (r.correct && !r.alreadyLocked) {
          newSlots[r.index] = [null, null, null, null];
        }
        // Clear wrong categories too so items return to pool
        if (!r.correct) {
          newSlots[r.index] = [null, null, null, null];
        }
      }

      slots = newSlots;
      lockedCategories = newLocked;
      mistakeCount += newMistakes;
      showingResult = false;
      lastSubmissionResult = null;
      selectedItem = null;
      selectedSource = null;

      dispatch("mistake", { count: mistakeCount, added: newMistakes });

      if (newLocked.size === 4) {
        setTimeout(() => {
          dispatch("win", {
            mistakes: mistakeCount,
            submissions: submissionHistory,
          });
        }, 600);
      } else if (mistakeCount >= 4) {
        // Reveal all remaining
        const revealSlots = slots.map((cs) => [...cs]);
        for (let i = 0; i < 4; i++) {
          revealSlots[i] = [null, null, null, null];
          newLocked.add(i);
        }
        slots = revealSlots;
        lockedCategories = newLocked;
        setTimeout(() => {
          dispatch("lose", {
            mistakes: mistakeCount,
            submissions: submissionHistory,
          });
        }, 600);
      }
    }, 1500);
  }

  function shufflePool() {
    if (showingResult) return;
    allItems = shuffleArray(allItems);
  }

  function clearAll() {
    if (showingResult) return;
    const newSlots = slots.map((cs) =>
      lockedCategories.has(slots.indexOf(cs))
        ? [...cs]
        : [null, null, null, null],
    );
    // Recompute using index
    slots = slots.map((cs, i) =>
      lockedCategories.has(i) ? [...cs] : [null, null, null, null],
    );
    selectedItem = null;
    selectedSource = null;
  }

  // Helpers for result display
  function isCategoryWrong(catIndex) {
    if (!lastSubmissionResult) return false;
    const r = lastSubmissionResult.find((x) => x.index === catIndex);
    return r && !r.correct;
  }
  function isCategoryNewlyCorrect(catIndex) {
    if (!lastSubmissionResult) return false;
    const r = lastSubmissionResult.find((x) => x.index === catIndex);
    return r && r.correct && !r.alreadyLocked;
  }

  function isItemDragging(item) {
    return dragItem && getElementKey(dragItem) === getElementKey(item);
  }
  function isSelected(item) {
    return selectedItem && getElementKey(selectedItem) === getElementKey(item);
  }

  function isSlotHovered(catIndex, slotIndex) {
    if (!hoveredDrop) return false;
    return (
      hoveredDrop.type === "slot" &&
      hoveredDrop.catIndex === catIndex &&
      hoveredDrop.slotIndex === slotIndex
    );
  }

  function isCategoryHovered(catIndex) {
    if (!hoveredDrop) return false;
    return hoveredDrop.type === "category" && hoveredDrop.catIndex === catIndex;
  }

  // Mistakes bar
  function calcPlaybackWidth(m) {
    return Math.min(5 + m * 20, 80);
  }
  $: playbackWidth = calcPlaybackWidth(mistakeCount);

  // Zoom modal
  let zoomedImage = null;
  let zoomedAlt = "";
  function openZoom(url, alt) {
    zoomedImage = url;
    zoomedAlt = alt || "";
  }
  function closeZoom() {
    zoomedImage = null;
  }

  // Public accessors for parent
  export function getSubmissionHistory() {
    return submissionHistory;
  }
  export function getMistakeCount() {
    return mistakeCount;
  }
</script>

<!-- ── Ghost element follows pointer ── -->
{#if isDragging && dragItem && dragHasMoved}
  <div
    class="drag-ghost"
    style="left: {ghostX}px; top: {ghostY}px; width: {ghostW}px; height: {ghostH}px;"
  >
    {#if typeof dragItem === "object" && dragItem.type === "image"}
      <img src={dragItem.url} alt={dragItem.alt || ""} class="ghost-img" />
    {:else}
      <p>{dragItem}</p>
    {/if}
  </div>
{/if}

<div
  class="reverse-container"
  role="presentation"
  on:click={handleContainerClick}
>
  <!-- Compact header -->
  <h2 class="header-msg">Sort items into their categories!</h2>

  <!-- ── Cleared categories (Grid) ── -->
  {#if lockedCategories.size > 0}
    <div class="cleared-grid">
      {#each categories as cat, i}
        {#if lockedCategories.has(i)}
          <div class="cleared-item">
            <ClearedCategory category={cat} />
          </div>
        {/if}
      {/each}
    </div>
  {/if}

  <!-- ── Category buckets (Grid) ── -->
  <div class="buckets-wrapper">
    {#each categories as cat, catIndex}
      {#if !lockedCategories.has(catIndex)}
        {@const isWrong = showingResult && isCategoryWrong(catIndex)}
        {@const isNewlyCorrect =
          showingResult && isCategoryNewlyCorrect(catIndex)}
        <div
          class="category-bucket"
          class:hovered-cat={isCategoryHovered(catIndex) &&
            !slots[catIndex].every((s) => s !== null)}
          class:wrong={isWrong}
          class:correct={isNewlyCorrect}
          data-drop-category={catIndex}
          role="button"
          tabindex="0"
          on:click|self={() => handleCategoryAreaTap(catIndex)}
          on:keydown={(e) =>
            e.key === "Enter" && handleCategoryAreaTap(catIndex)}
        >
          <!-- Header -->
          <div
            class="cat-header"
            style="background-color: {cat.color}"
            role="button"
            tabindex="0"
            on:click={() => handleCategoryAreaTap(catIndex)}
            on:keydown={(e) =>
              e.key === "Enter" && handleCategoryAreaTap(catIndex)}
          >
            <span class="cat-name">{cat.name}</span>
            <span class="cat-fill-count">
              {slots[catIndex].filter(Boolean).length}/4
            </span>
          </div>

          <!-- Slot row (2x2) -->
          <div class="slots-row">
            {#each slots[catIndex] as slotItem, slotIndex}
              {@const hovered = isSlotHovered(catIndex, slotIndex)}
              {@const slotHasSelected = isSelected(slotItem)}
              <div
                class="slot"
                class:slot-filled={!!slotItem}
                class:slot-hovered={hovered}
                class:slot-target={!!dragItem || !!selectedItem}
                data-drop-slot="{catIndex},{slotIndex}"
                role="button"
                tabindex="0"
                on:click={() => handleSlotTap(catIndex, slotIndex)}
                on:keydown={(e) =>
                  e.key === "Enter" && handleSlotTap(catIndex, slotIndex)}
              >
                {#if slotItem}
                  <div
                    class="slot-item"
                    class:is-dragging={isItemDragging(slotItem)}
                    class:is-selected={slotHasSelected}
                    class:has-image={typeof slotItem === "object" &&
                      slotItem.type === "image"}
                    on:pointerdown={(e) =>
                      startDrag(e, slotItem, { catIndex, slotIndex })}
                  >
                    {#if typeof slotItem === "object" && slotItem.type === "image"}
                      <img
                        src={slotItem.url}
                        alt={slotItem.alt || ""}
                        class="item-img"
                        draggable="false"
                      />
                    {:else}
                      <p>{slotItem}</p>
                    {/if}
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      {/if}
    {/each}
  </div>

  {#if gameOver && pool.length > 0}
    <div class="red-herrings-row">
      <ClearedCategory category={redHerringsCategory} />
    </div>
  {:else}
    <!-- ── Item pool ── -->
    <div class="pool-header">
      <!-- <span class="pool-title">Item Pool</span>
      <span class="pool-subtitle">(Contains 4 decoys!)</span> -->
    </div>
    <div class="pool-area" data-drop-pool="true">
      {#each pool as item (getElementKey(item))}
        <div
          animate:flip={{ duration: 200 }}
          class="pool-item"
          class:is-dragging={isItemDragging(item)}
          class:is-selected={isSelected(item)}
          class:has-image={typeof item === "object" && item.type === "image"}
          role="button"
          tabindex="0"
          on:pointerdown={(e) => startDrag(e, item, "pool")}
          on:click={() => handlePoolItemTap(item)}
          on:keydown={(e) => e.key === "Enter" && handlePoolItemTap(item)}
        >
          {#if typeof item === "object" && item.type === "image"}
            <img
              src={item.url}
              alt={item.alt || ""}
              class="item-img"
              draggable="false"
            />
            <button
              class="zoom-btn"
              on:click|stopPropagation={() => openZoom(item.url, item.alt)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path
                  d="M15 3H21M21 3V9M21 3L14 10M9 21H3M3 21V15M3 21L10 14"
                  stroke="white"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
          {:else}
            <p>{item}</p>
          {/if}
        </div>
      {/each}
    </div>
  {/if}

  <!-- ── Mistakes bar ── -->
  {#if !gameOver}
    <div class="mistakes-remaining-container">
      <div class="mistakes-remaining-text-container">
        <div class="mistakes-remaining-text">mistakes remaining:&nbsp;</div>
        {#key mistakeCount}
          <div
            in:scale={{ duration: 800, opacity: 100 }}
            class="mistakes-remaining-number"
          >
            {4 - mistakeCount}
          </div>
        {/key}
      </div>
      <div class="mistakes-playback-container">
        <div class="left-playback-number">{mistakeCount}:05</div>
        <div class="background"></div>
        <div style="width: {playbackWidth}%;" class="foreground"></div>
        <div class="right-playback-number">{4 - mistakeCount}:00</div>
      </div>
    </div>

    <!-- ── Controls ── -->
    <div class="play-button-container">
      <div class="button-container">
        <button class="play-button left-btn" on:click={shufflePool}>
          <!-- Shuffle icon -->
          <svg width="32" height="24" viewBox="0 0 32 24" fill="none">
            <path
              d="M30.0613 17.9386C30.2011 18.078 30.312 18.2436 30.3878 18.4259C30.4635 18.6082 30.5024 18.8037 30.5024 19.0011C30.5024 19.1986 30.4635 19.394 30.3878 19.5764C30.312 19.7587 30.2011 19.9243 30.0613 20.0636L27.0613 23.0636C26.7795 23.3454 26.3973 23.5037 25.9988 23.5037C25.6002 23.5037 25.218 23.3454 24.9363 23.0636C24.6545 22.7818 24.4961 22.3997 24.4961 22.0011C24.4961 21.6026 24.6545 21.2204 24.9363 20.9386L25.375 20.4999H25.1138C23.6017 20.4982 22.1119 20.1365 20.7674 19.4446C19.423 18.7527 18.2627 17.7506 17.3825 16.5211L12.1725 9.22239C11.5704 8.38101 10.7765 7.6952 9.85656 7.22176C8.93662 6.74831 7.91712 6.50085 6.8825 6.49989H4C3.60218 6.49989 3.22064 6.34185 2.93934 6.06055C2.65804 5.77924 2.5 5.39771 2.5 4.99989C2.5 4.60206 2.65804 4.22053 2.93934 3.93923C3.22064 3.65792 3.60218 3.49989 4 3.49989H6.8825C8.39452 3.50156 9.8844 3.86331 11.2288 4.55519C12.5733 5.24708 13.7336 6.24921 14.6138 7.47864L19.8275 14.7774C20.4296 15.6188 21.2235 16.3046 22.1434 16.778C23.0634 17.2515 24.0829 17.4989 25.1175 17.4999H25.375L24.935 17.0611C24.6532 16.7793 24.4949 16.3972 24.4949 15.9986C24.4949 15.6001 24.6532 15.2179 24.935 14.9361C25.2168 14.6543 25.599 14.496 25.9975 14.496C26.396 14.496 26.7782 14.6543 27.06 14.9361L30.0613 17.9386ZM18.1087 8.86114C18.4081 9.12297 18.7993 9.25519 19.1961 9.2287C19.593 9.20221 19.9631 9.01919 20.225 8.71989C20.8351 8.0225 21.5873 7.46363 22.4311 7.08075C23.275 6.69786 24.1909 6.49981 25.1175 6.49989H25.375L24.935 6.93864C24.6532 7.22043 24.4949 7.60262 24.4949 8.00114C24.4949 8.39965 24.6532 8.78184 24.935 9.06364C25.2168 9.34543 25.599 9.50374 25.9975 9.50374C26.396 9.50374 26.7782 9.34543 27.06 9.06364L30.06 6.06364C30.1998 5.92428 30.3108 5.75869 30.3865 5.57636C30.4622 5.39404 30.5012 5.19856 30.5012 5.00114C30.5012 4.80372 30.4622 4.60824 30.3865 4.42591C30.3108 4.24358 30.1998 4.07799 30.06 3.93864L27.06 0.938637C26.7782 0.656844 26.396 0.498535 25.9975 0.498535C25.599 0.498535 25.2168 0.656845 24.935 0.938637C24.6532 1.22043 24.4949 1.60262 24.4949 2.00114C24.4949 2.39965 24.6532 2.78184 24.935 3.06364L25.375 3.49989H25.1138C23.7591 3.50054 22.4203 3.79087 21.1872 4.3514C19.954 4.91194 18.8549 5.72972 17.9638 6.74989C17.7039 7.04949 17.5733 7.43979 17.6005 7.83544C17.6277 8.23109 17.8104 8.59987 18.1087 8.86114ZM13.8912 15.1386C13.5919 14.8768 13.2007 14.7446 12.8039 14.7711C12.407 14.7976 12.0369 14.9806 11.775 15.2799C11.1649 15.9773 10.4127 16.5361 9.56885 16.919C8.72504 17.3019 7.80912 17.5 6.8825 17.4999H4C3.60218 17.4999 3.22064 17.6579 2.93934 17.9392C2.65804 18.2205 2.5 18.6021 2.5 18.9999C2.5 19.3977 2.65804 19.7792 2.93934 20.0605C3.22064 20.3419 3.60218 20.4999 4 20.4999H6.8825C8.2371 20.4992 9.5759 20.2089 10.8091 19.6484C12.0423 19.0878 13.1413 18.2701 14.0325 17.2499C14.2928 16.9508 14.424 16.5607 14.3976 16.1651C14.3711 15.7695 14.1891 15.4004 13.8912 15.1386Z"
              fill="white"
            />
          </svg>
        </button>
        <h3>Shuffle</h3>
      </div>

      <div class="button-container">
        <div class="play-container">
          <button
            class="play-button submit-btn"
            class:submit-disabled={!canSubmit}
            on:click={handleSubmit}
          >
            <svg width="55" height="55" viewBox="0 0 55 55" fill="none">
              <g>
                <mask
                  id="rmask"
                  style="mask-type:luminance"
                  maskUnits="userSpaceOnUse"
                  x="0"
                  y="0"
                  width="55"
                  height="55"
                >
                  <g>
                    <path
                      d="M27.5 53C41.5836 53 53 41.5836 53 27.5C53 13.4164 41.5836 2 27.5 2C13.4164 2 2 13.4164 2 27.5C2 41.5836 13.4164 53 27.5 53Z"
                      fill="white"
                      stroke="white"
                      stroke-width="4"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M22.3999 27.5002V18.667L30.0499 23.0836L37.6999 27.5002L30.0499 31.9168L22.3999 36.3334V27.5002Z"
                      fill="black"
                      stroke="black"
                      stroke-width="4"
                      stroke-linejoin="round"
                    />
                  </g>
                </mask>
                <g mask="url(#rmask)">
                  <path
                    d="M-3.1001 -3.1001H58.0999V58.0999H-3.1001V-3.1001Z"
                    fill={canSubmit ? "white" : "#555"}
                  />
                </g>
              </g>
            </svg>
          </button>
        </div>
        <h3>Submit</h3>
      </div>

      <div class="button-container right-btn">
        <button class="play-button" on:click={clearAll}>
          <!-- Clear/Replay icon -->
          <svg width="35" height="35" viewBox="0 0 35 35" fill="none">
            <path
              d="M17.4998 7.29185V3.2231C17.4998 2.56685 16.7123 2.24602 16.2602 2.71269L10.7185 8.23977C10.4268 8.53144 10.4268 8.98352 10.7185 9.27519L16.2456 14.8023C16.7123 15.2544 17.4998 14.9335 17.4998 14.2773V10.2085C22.9393 10.2085 27.2414 15.196 26.0456 20.8398C25.3602 24.1502 22.6768 26.8189 19.381 27.5044C14.1748 28.5981 9.53726 25.0252 8.83726 20.1981C8.78526 19.8553 8.61286 19.5423 8.35095 19.3151C8.08904 19.088 7.75477 18.9615 7.40809 18.9585C6.53309 18.9585 5.83309 19.7314 5.94976 20.6064C6.85392 27.0085 12.9498 31.7481 19.8477 30.4064C24.3977 29.5169 28.0581 25.8564 28.9477 21.3064C30.3914 13.8252 24.7039 7.29185 17.4998 7.29185Z"
              fill="white"
            />
          </svg>
        </button>
        <h3>Clear</h3>
      </div>
    </div>
  {/if}
</div>

<!-- ── Zoom modal ── -->
{#if zoomedImage}
  <div
    class="zoom-modal"
    role="button"
    tabindex="0"
    on:click={closeZoom}
    on:keydown={(e) => e.key === "Escape" && closeZoom()}
  >
    <div
      class="zoom-content"
      role="presentation"
      on:click|stopPropagation
      on:keydown|stopPropagation
    >
      <button class="zoom-close" on:click={closeZoom}>×</button>
      <img src={zoomedImage} alt={zoomedAlt} />
    </div>
  </div>
{/if}

<style>
  /* ── Layout ── */
  .reverse-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    max-width: 420px;
    padding: 0 6px; /* Reduced padding */
    box-sizing: border-box;
  }

  @media (min-width: 768px) {
    .reverse-container {
      max-width: 700px;
      padding: 0 10px;
    }
  }

  .header-msg {
    font-weight: 300;
    font-size: 15px; /* Slightly smaller */
    margin-top: 5px; /* Reduced margin */
    margin-bottom: 8px; /* Reduced margin */
    color: #aaa;
  }

  /* ── Cleared Grid ── */
  .cleared-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px; /* Reduced gap */
    width: 100%;
    margin-bottom: 8px;
  }

  .cleared-item {
    width: 100%;
  }

  .red-herrings-row {
    width: 100%;
    margin-bottom: 8px;
  }

  /* ── Buckets wrapper (2 Columns) ── */
  .buckets-wrapper {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr 1fr; /* 2 columns side by side */
    gap: 6px; /* Reduced gap */
    margin-bottom: 10px; /* Reduced margin */
  }

  /* ── Category bucket ── */
  .category-bucket {
    border-radius: 8px;
    overflow: hidden;
    border: 2px solid transparent;
    transition: border-color 0.2s;
    background-color: rgba(255, 255, 255, 0.03);
    display: flex;
    flex-direction: column;
  }

  .category-bucket.hovered-cat {
    border-color: rgba(255, 255, 255, 0.4);
  }

  .category-bucket.wrong {
    animation: flash-wrong 1.2s ease;
  }

  .category-bucket.correct {
    animation: flash-correct 0.6s ease;
  }

  @keyframes flash-wrong {
    0%,
    100% {
      border-color: transparent;
    }
    20%,
    60% {
      border-color: #ff4444;
      box-shadow: 0 0 12px rgba(255, 68, 68, 0.5);
    }
  }

  @keyframes flash-correct {
    0%,
    100% {
      border-color: transparent;
    }
    50% {
      border-color: #00cc66;
      box-shadow: 0 0 12px rgba(0, 204, 102, 0.5);
    }
  }

  /* ── Category header bar ── */
  .cat-header {
    display: flex;
    flex-direction: column; /* Stack name and count to save width */
    align-items: center;
    justify-content: center;
    padding: 4px 2px; /* Reduced padding */
    cursor: pointer;
    user-select: none;
    text-align: center;
    min-height: 32px; /* Reduced height */
  }

  .cat-name {
    font-size: 10px; /* Smaller font */
    font-weight: 700;
    text-transform: uppercase;
    color: #000;
    line-height: 1.1;
    margin-bottom: 1px;
  }

  .cat-fill-count {
    font-size: 9px; /* Smaller font */
    font-weight: 700;
    color: rgba(0, 0, 0, 0.6);
  }

  /* ── Slots row (2x2 Grid) ── */
  .slots-row {
    display: grid;
    grid-template-columns: 1fr 1fr; /* 2x2 grid */
    gap: 3px; /* Reduced gap */
    padding: 3px; /* Reduced padding */
  }

  /* ── Individual slot ── */
  .slot {
    height: 52px;
    border-radius: 6px;
    border: 1px dashed rgba(255, 255, 255, 0.2);
    background-color: rgba(255, 255, 255, 0.03);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    overflow: hidden;
    box-sizing: border-box;
  }

  .slot.slot-filled {
    border-style: solid;
    border-color: transparent;
    background-color: transparent;
    padding: 0;
  }

  .slot.slot-hovered {
    border-color: rgba(255, 255, 255, 0.7);
    background-color: rgba(255, 255, 255, 0.1);
  }

  /* Highlight all empty slots when dragging or item selected */
  .slot.slot-target:not(.slot-filled) {
    border-color: rgba(255, 255, 255, 0.35);
  }

  /* ── Slot Item (Smaller text) ── */
  .slot-item {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #fff;
    border-radius: 4px;
    font-size: 9px; /* Smaller font for compact slots */
    font-weight: 700;
    text-transform: uppercase;
    color: #000;
    line-height: 11px;
    text-align: center;
    cursor: grab;
    overflow: hidden;
    touch-action: none;
    user-select: none;
    box-sizing: border-box;
    padding: 2px;
    transition:
      opacity 0.15s,
      transform 0.1s;
  }

  .slot-item p {
    margin: 0;
    max-width: 90%;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    text-overflow: ellipsis;
  }

  .slot-item.is-dragging {
    opacity: 0.3;
    transform: scale(0.95);
  }

  .slot-item.is-selected {
    box-shadow: 0 0 0 3px #ba81c2;
    transform: scale(0.97);
  }

  .slot-item:active {
    cursor: grabbing;
  }

  /* ── Item pool ── */
  .pool-header {
    width: 100%;
    max-width: 400px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-bottom: 4px; /* Reduced margin */
  }

  @media (min-width: 768px) {
    .pool-header {
      max-width: 680px;
    }
  }

  .pool-title {
    font-size: 12px; /* Smaller font */
    font-weight: 700;
    color: #fff;
    text-transform: uppercase;
  }

  .pool-subtitle {
    font-size: 11px; /* Smaller font */
    font-weight: 400;
    color: #ba81c2;
    font-style: italic;
  }

  .pool-area {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 5px; /* Reduced gap */
    width: 100%;
    padding: 2px;
    margin-bottom: 2px; /* Reduced margin */
    box-sizing: border-box;
  }

  @media (min-width: 768px) {
    .pool-area {
      max-width: 680px;
    }
  }

  /* ── Pool item ── */
  .pool-item {
    position: relative;
    border-radius: 8px;
    background-color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 55px; /* Compact height */
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    color: #000;
    line-height: 13px;
    text-align: center;
    cursor: grab;
    touch-action: none;
    user-select: none;
    overflow: hidden;
    transition:
      opacity 0.15s,
      transform 0.1s,
      box-shadow 0.15s;
    box-sizing: border-box;
  }

  .pool-item p {
    margin: 0;
    max-width: 90%;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    text-overflow: ellipsis;
  }

  .pool-item:active {
    cursor: grabbing;
  }

  .pool-item:hover {
    background-color: #e8e8e8;
  }

  .pool-item.is-dragging {
    opacity: 0.3;
    transform: scale(0.95);
  }

  .pool-item.is-selected {
    box-shadow: 0 0 0 3px #ba81c2;
    transform: scale(0.97);
  }

  .pool-item.has-image {
    height: 55px;
  }

  .item-img {
    max-width: 90%;
    max-height: 90%;
    object-fit: contain;
    pointer-events: none;
    -webkit-user-drag: none;
    user-drag: none;
  }

  /* ── Drag ghost ── */
  .drag-ghost {
    position: fixed;
    z-index: 9999;
    pointer-events: none;
    border-radius: 8px;
    background-color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    color: #000;
    line-height: 15px;
    text-align: center;
    opacity: 0.9;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    overflow: hidden;
    box-sizing: border-box;
    padding: 4px;
  }

  .drag-ghost p {
    margin: 0;
    max-width: 90%;
  }

  .ghost-img {
    max-width: 90%;
    max-height: 90%;
    object-fit: contain;
    pointer-events: none;
  }

  /* ── Zoom button on images ── */
  .zoom-btn {
    position: absolute;
    top: 4px;
    right: 4px;
    background: rgba(0, 0, 0, 0.5);
    border: none;
    border-radius: 4px;
    width: 22px;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.2s;
  }

  .pool-item:hover .zoom-btn {
    opacity: 1;
  }

  @media (max-width: 767px) {
    .zoom-btn {
      display: none;
    }
    /* Mobile: allow scrolling by default; long-press drag locks scroll via JS */
    .slot-item,
    .pool-item,
    .slot {
      touch-action: auto;
    }
  }

  /* ── Mistakes bar (same as main game) ── */
  .mistakes-remaining-container {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    margin-top: 10px; /* Reduced margin */
    margin-bottom: 15px; /* Reduced margin */
    width: 100%;
    max-width: 400px;
    padding: 0 10px;
    box-sizing: border-box;
  }

  .mistakes-remaining-text-container {
    display: flex;
    align-items: center;
  }

  .mistakes-remaining-text,
  .mistakes-remaining-number {
    margin-bottom: 3px; /* Reduced margin */
    font-size: 13px; /* Smaller font */
  }

  .mistakes-playback-container {
    position: relative;
    width: 100%;
    height: 8px; /* Reduced height */
    border-radius: 10px;
    overflow: hidden;
    display: flex;
    align-items: center;
  }

  .left-playback-number,
  .right-playback-number {
    color: #fff;
    font-size: 10px; /* Smaller font */
    padding: 0 5px;
    position: absolute;
    top: 44%;
    transform: translateY(-50%);
    overflow: visible;
  }

  .left-playback-number {
    left: 0;
  }
  .right-playback-number {
    right: 0;
  }

  .background {
    position: absolute;
    top: 20%;
    left: 10%;
    width: 80%;
    height: 45%;
    background-color: #505050;
    border-radius: 10px;
  }

  .foreground {
    position: absolute;
    top: 20%;
    left: 10%;
    height: 45%;
    background-color: #fff;
    border-radius: 5px;
    width: 20%;
    transition: width 1s ease-in-out;
  }

  /* ── Controls (same pattern as main game) ── */
  .play-button-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    max-width: 400px;
    margin: 0 auto;
    padding: 0 10px;
    box-sizing: border-box;
    margin-bottom: 20px; /* Reduced margin */
  }

  .play-button {
    background-color: inherit;
    border-style: none;
    cursor: pointer;
    margin-right: 18px;
    margin-left: 18px;
  }

  .play-button:hover {
    transform: scale(1.1) perspective(1px);
  }

  .submit-btn.submit-disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .submit-btn.submit-disabled:hover {
    transform: none;
  }

  .play-container {
    display: flex;
    align-items: center;
  }

  .button-container h3 {
    color: #ba81c2;
    font-size: 10px;
    margin: auto;
    text-transform: lowercase;
  }

  /* ── Zoom modal ── */
  .zoom-modal {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
  }

  .zoom-content {
    position: relative;
    max-width: 90vw;
    max-height: 90vh;
  }

  .zoom-content img {
    max-width: 100%;
    max-height: 90vh;
    object-fit: contain;
  }

  .zoom-close {
    position: absolute;
    top: -40px;
    right: 0;
    background: none;
    border: none;
    color: white;
    font-size: 32px;
    cursor: pointer;
  }

  @media (min-width: 768px) {
    /* Desktop adjustments */
    .buckets-wrapper {
      grid-template-columns: repeat(4, 1fr); /* 4 columns on wide screens */
    }
    .slot {
      height: 60px;
    }
    .pool-item {
      height: 70px;
      font-size: 12px;
    }
    .pool-item.has-image {
      height: 70px;
    }
  }
</style>
