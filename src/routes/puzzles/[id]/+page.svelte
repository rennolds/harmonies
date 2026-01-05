<script>
  import { flip } from "svelte/animate";
  import { writable } from "svelte/store";
  import { fade, fly, slide, scale } from "svelte/transition";
  import { onMount } from "svelte";
  import { browser } from "$app/environment";
  import ClearedCategory from "../../ClearedCategory.svelte";
  import HelpOverlay from "../../HelpOverlay.svelte";
  import Navbar from "../../Navbar.svelte";
  import Ramp from "../../Ramp.svelte";
  import "../../styles.css";

  export let data;

  // Extract puzzle data
  const puzzle = data.puzzle;
  const board = puzzle.puzzle_data;
  
  // Custom store keys for this puzzle to avoid conflicts with daily game
  const STORAGE_KEY_PREFIX = `harmonies_custom_${puzzle.id}_`;

  // Local state for this game instance
  let selected = [];
  let mistakesRemaining = 4;
  let hasLost = false;
  let hasWon = false;
  let localClearedCategories = [];
  let categories = board.categories || [];
  
  // Metadata
  const puzzleTitle = puzzle.title || "Untitled Puzzle";
  const shoutout = board["shoutout"] || false;
  const shoutoutName = board["shoutout-name"] || "";
  const specialMessage = board["special-message"] || false;
  const messageContent = board["message-content"] || "";
  const playlist = board["playlist"] || "";
  const gameoverGif = board["gameoverGif"] || "";

  // Stores
  const gameoverStore = writable({
    isOver: false,
    headerMessage: "",
  });

  const alertStore = writable({
    message: "",
    visible: false,
  });

  let showHelp = false;
  
  // Initialize grid items
  let gridItems = [];
  
  function initializeGrid() {
    let items = [];
    categories.forEach((category) => {
      category.elements.forEach((element) => {
        items.push({
          text: element,
          category: category.name,
          color: category.color,
          selected: false,
          cleared: false,
          id: Math.random().toString(36).substr(2, 9)
        });
      });
    });
    
    // Shuffle items
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    
    return items;
  }

  onMount(() => {
    // Check local storage for saved progress
    const savedState = localStorage.getItem(STORAGE_KEY_PREFIX + 'state');
    
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        mistakesRemaining = state?.mistakesRemaining ?? mistakesRemaining;
        hasLost = !!state?.hasLost;
        hasWon = !!state?.hasWon;
        localClearedCategories = Array.isArray(state?.clearedCategories)
          ? state.clearedCategories
          : [];
      } catch (e) {
        console.warn("Invalid saved state for custom puzzle, clearing:", e);
        localStorage.removeItem(STORAGE_KEY_PREFIX + 'state');
      }
      
      // Reconstruct grid items
      // First, get all items
      let allItems = initializeGrid();
      
      // Filter out cleared items
      const clearedTexts = new Set();
      localClearedCategories.forEach(cat => {
        cat.elements.forEach(el => clearedTexts.add(el));
      });
      
      gridItems = allItems.filter(item => !clearedTexts.has(item.text));
      
      // Restore remaining items order if saved (optional, simplified here)
    } else {
      gridItems = initializeGrid();
    }
    
    if (hasLost || hasWon) {
      gameoverStore.set({
        isOver: true,
        headerMessage: hasWon ? "You found all the Harmonies!" : "Game Over"
      });
    }
  });

  function saveState() {
    if (!browser) return;
    const state = {
      mistakesRemaining,
      hasLost,
      hasWon,
      clearedCategories: localClearedCategories
    };
    localStorage.setItem(STORAGE_KEY_PREFIX + 'state', JSON.stringify(state));
  }

  function showAlert(message) {
    alertStore.set({
      message,
      visible: true,
    });

    setTimeout(() => {
      alertStore.set({
        message: "",
        visible: false,
      });
    }, 3000);
  }

  function toggleSelection(item) {
    if (hasLost || hasWon) return;
    
    const index = selected.findIndex((s) => s.id === item.id);
    
    if (index !== -1) {
      // Deselect
      selected.splice(index, 1);
      selected = selected;
      item.selected = false;
    } else {
      // Select
      if (selected.length < 4) {
        selected = [...selected, item];
        item.selected = true;
      }
    }
    gridItems = gridItems; // Trigger reactivity
  }

  function checkSelection() {
    if (selected.length !== 4) return;
    
    const firstCategory = selected[0].category;
    const allMatch = selected.every((item) => item.category === firstCategory);
    
    if (allMatch) {
      // Success!
      // Find the full category object
      const category = categories.find(c => c.name === firstCategory);
      
      localClearedCategories = [...localClearedCategories, category];
      
      // Remove items from grid
      const selectedIds = new Set(selected.map(s => s.id));
      gridItems = gridItems.filter(item => !selectedIds.has(item.id));
      
      // Clear selection
      selected = [];
      
      // Check win condition
      if (gridItems.length === 0) {
        hasWon = true;
        gameoverStore.set({
          isOver: true,
          headerMessage: "You found all the Harmonies!"
        });
      }
    } else {
      // Mistake
      mistakesRemaining--;
      
      // Check if "one away"
      const categoryCounts = {};
      selected.forEach(item => {
        categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
      });
      
      const maxCount = Math.max(...Object.values(categoryCounts));
      
      if (maxCount === 3) {
        showAlert("One away...");
      } else {
        showAlert("Incorrect group.");
      }
      
      // Shake animation would go here
      
      // Deselect all
      selected.forEach(item => item.selected = false);
      selected = [];
      gridItems = gridItems;
      
      // Check loss condition
      if (mistakesRemaining === 0) {
        hasLost = true;
        gameoverStore.set({
          isOver: true,
          headerMessage: "Game Over"
        });
        
        // Reveal remaining categories (simplified: just clear grid)
        // Ideally we'd move remaining items to cleared categories to show them
        // For now, let's just leave them or auto-solve
      }
    }
    
    saveState();
  }
  
  function shuffleBoard() {
    if (hasLost || hasWon) return;
    for (let i = gridItems.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [gridItems[i], gridItems[j]] = [gridItems[j], gridItems[i]];
    }
    gridItems = gridItems;
  }
  
  function deselectAll() {
    if (hasLost || hasWon) return;
    selected.forEach(item => item.selected = false);
    selected = [];
    gridItems = gridItems;
  }
  
  function toggleHelpOverlay() {
    showHelp = !showHelp;
  }
</script>

<div class="page-container">
  <HelpOverlay isOpen={showHelp} onClose={() => (showHelp = false)} />
  <Navbar {playlist} {toggleHelpOverlay} isArchiveMode={true} />

  {#if $alertStore.visible}
    <div class="alert-overlay" transition:fade>
      <div class="alert-box">
        {$alertStore.message}
      </div>
    </div>
  {/if}

  <div class="content">
    <div class="header-section">
      <h1>{puzzleTitle}</h1>
      {#if shoutout}
        <p class="shoutout-text">Created by <span class="shoutout-name">{shoutoutName}</span></p>
      {/if}
      {#if specialMessage}
        <p class="special-message">{messageContent}</p>
      {/if}
    </div>

    {#if hasWon}
      <div class="game-over-container" transition:fade>
        <h2>You found all the Harmonies!</h2>
        {#if gameoverGif}
          <img src={gameoverGif} alt="Victory" class="victory-gif" />
        {/if}
        <div class="victory-buttons">
          <a href="/create" class="action-btn">Create Your Own</a>
          <a href="/" class="action-btn secondary">Play Daily Game</a>
        </div>
      </div>
    {/if}
    
    {#if hasLost}
      <div class="game-over-container" transition:fade>
        <h2>Game Over</h2>
        <p>Better luck next time!</p>
        <div class="victory-buttons">
            <button class="action-btn" on:click={() => window.location.reload()}>Try Again</button>
            <a href="/create" class="action-btn secondary">Create Your Own</a>
        </div>
      </div>
    {/if}

    <div class="game-board">
      <!-- Cleared Categories -->
      <div class="cleared-section">
        {#each localClearedCategories as category (category.name)}
          <div animate:flip={{ duration: 300 }}>
            <ClearedCategory
              name={category.name}
              elements={category.elements.join(", ")}
              color={category.color}
            />
          </div>
        {/each}
      </div>

      <!-- Active Grid -->
      {#if !hasWon && !hasLost}
        <div class="grid-container">
            {#each gridItems as item (item.id)}
              <div
                animate:flip={{ duration: 300 }}
                class="grid-item {item.selected ? 'selected' : ''}"
                style="--category-color: {item.category === 'selected' ? '#ba81c2' : '#333'}"
                on:click={() => toggleSelection(item)}
                on:keydown={(e) => e.key === 'Enter' && toggleSelection(item)}
                role="button"
                tabindex="0"
              >
                <span class="item-text">{item.text}</span>
              </div>
            {/each}
        </div>
      {/if}
    </div>

    {#if !hasWon && !hasLost}
      <div class="controls">
        <div class="mistakes-container">
          <span>Mistakes remaining:</span>
          <div class="mistakes-dots">
            {#each Array(4) as _, i}
              <div class="dot {i < mistakesRemaining ? 'active' : 'inactive'}"></div>
            {/each}
          </div>
        </div>

        <div class="button-row">
          <button class="game-btn" on:click={shuffleBoard}>Shuffle</button>
          <button class="game-btn" on:click={deselectAll} disabled={selected.length === 0}>Deselect All</button>
          <button class="game-btn submit-btn" on:click={checkSelection} disabled={selected.length !== 4}>Submit</button>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .page-container {
    min-height: 100vh;
    background-color: #202020;
    color: white;
    padding-top: 60px;
    padding-bottom: 40px;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .content {
    width: 100%;
    max-width: 680px;
    padding: 20px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .header-section {
    text-align: center;
    margin-bottom: 20px;
  }

  h1 {
    color: #ba81c2;
    margin: 0 0 10px 0;
    font-size: 28px;
  }
  
  .shoutout-text {
    color: #888;
    margin: 0;
    font-size: 14px;
  }
  
  .shoutout-name {
    color: #fff;
    font-weight: 600;
  }
  
  .special-message {
    margin-top: 8px;
    color: #ddd;
    font-style: italic;
  }

  .game-board {
    width: 100%;
    margin-bottom: 30px;
  }
  
  .cleared-section {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 10px;
    width: 100%;
  }

  .grid-container {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    width: 100%;
  }

  .grid-item {
    background-color: #333;
    border-radius: 8px;
    aspect-ratio: 1.6;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 5px;
    cursor: pointer;
    transition: transform 0.1s, background-color 0.2s;
    user-select: none;
    font-weight: 600;
    font-size: 14px; /* Default for mobile */
    color: white;
    border: 2px solid transparent;
  }

  /* Desktop Styles */
  @media (min-width: 768px) {
    .grid-container {
        gap: 12px;
    }

    .grid-item {
        font-size: 16px;
        border-radius: 10px;
    }
  }

  .grid-item:active {
    transform: scale(0.95);
  }

  .grid-item.selected {
    background-color: #5a4a5e;
    color: white;
    border-color: #ba81c2;
  }

  .controls {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
  }

  .mistakes-container {
    display: flex;
    align-items: center;
    gap: 10px;
    color: #ccc;
  }

  .mistakes-dots {
    display: flex;
    gap: 6px;
  }

  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background-color: #444;
  }

  .dot.active {
    background-color: #ba81c2;
  }

  .button-row {
    display: flex;
    gap: 10px;
  }

  .game-btn {
    padding: 10px 20px;
    border-radius: 20px;
    border: 1px solid #555;
    background: transparent;
    color: white;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .game-btn:hover:not(:disabled) {
    background-color: #333;
    border-color: #777;
  }

  .game-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .submit-btn {
    border-color: white;
  }

  .submit-btn:hover:not(:disabled) {
    background-color: white;
    color: #202020;
  }

  .alert-overlay {
    position: fixed;
    top: 80px;
    left: 0;
    right: 0;
    display: flex;
    justify-content: center;
    z-index: 2000;
    pointer-events: none;
  }

  .alert-box {
    background-color: white;
    color: black;
    padding: 10px 20px;
    border-radius: 4px;
    font-weight: 600;
    box-shadow: 0 4px 10px rgba(0,0,0,0.3);
  }
  
  .game-over-container {
    text-align: center;
    margin-bottom: 30px;
    background: #2a2a2a;
    padding: 30px;
    border-radius: 12px;
    width: 100%;
    box-sizing: border-box;
  }
  
  .victory-gif {
    max-width: 100%;
    border-radius: 8px;
    margin: 20px 0;
  }
  
  .victory-buttons {
    display: flex;
    gap: 15px;
    justify-content: center;
    margin-top: 20px;
  }
  
  .action-btn {
    background-color: #ba81c2;
    color: white;
    text-decoration: none;
    padding: 10px 20px;
    border-radius: 20px;
    font-weight: 600;
    border: none;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .action-btn:hover {
    background-color: #a06da6;
  }
  
  .action-btn.secondary {
    background-color: transparent;
    border: 1px solid #ba81c2;
    color: #ba81c2;
  }
  
  .action-btn.secondary:hover {
    background-color: rgba(186, 129, 194, 0.1);
  }
  
  @media (max-width: 600px) {
    .button-row {
        width: 100%;
        justify-content: center;
    }
    
    .game-btn {
        padding: 10px 15px;
        font-size: 14px;
    }
    
    .grid-item {
        font-size: 13px; /* Smaller text on mobile to fit words */
    }
  }
</style>

