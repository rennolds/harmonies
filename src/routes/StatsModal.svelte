<script>
  import { fade, fly } from "svelte/transition";
  import { currentStreak, maxStreak, solveList } from "./store.js";
  import { isAuthenticated, syncStatus } from "$lib/stores/statsStore.js";

  // Props
  export let isOpen = false;
  export let onClose = () => {};
  export let inline = false; // When true, renders without modal backdrop

  // Calculate statistics directly from solveList
  $: allGames = $solveList || [];
  $: wins = allGames.filter((score) => score >= 4).length;
  $: losses = allGames.filter((score) => score === 0).length;
  $: totalPlayed = wins + losses;
  $: winPercentage =
    totalPlayed > 0 ? Math.round((wins / totalPlayed) * 100) : 0;

  /*
   * solveList values:
   * 0 -> denotes a loss (count as 4 mistakes in distribution)
   * 4 -> perfect game (4 guesses, 0 mistakes)
   * 5 -> 1 mistake
   * 6 -> 2 mistakes
   * 7 -> 3 mistakes
   * 8 -> theoretical (4 mistakes, though game ends at 3)
   */
  $: perfectGames = allGames.filter((score) => score === 4).length;

  // Calculate mistake distribution from solveList
  $: mistakeDistribution = calculateMistakeDistribution(allGames);
  $: maxDistributionValue = Math.max(...Object.values(mistakeDistribution));

  // Function to compute the mistake distribution
  function calculateMistakeDistribution(scoreList) {
    const distribution = {
      0: 0,
      1: 0,
      2: 0,
      3: 0,
      4: 0,
    };

    // Count occurrences of each mistake count
    for (const score of scoreList) {
      if (score === 0) {
        // Loss - count as 4 mistakes
        distribution[4]++;
      } else if (score === 4) {
        // Perfect game (0 mistakes)
        distribution[0]++;
      } else if (score === 5) {
        // 1 mistake
        distribution[1]++;
      } else if (score === 6) {
        // 2 mistakes
        distribution[2]++;
      } else if (score === 7 || score === 8) {
        // 3 mistakes
        distribution[3]++;
      }
    }

    return distribution;
  }

  // Function to handle clicks outside the modal content
  function handleBackdropClick(event) {
    // Only close if the backdrop itself was clicked, not the content
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  // Function to handle key presses (for accessibility)
  function handleKeydown(event) {
    if (event.key === "Escape") {
      onClose();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
  {#if inline}
    <!-- Inline mode: just render the content without modal backdrop -->
    <div class="inline-stats">
      <div class="stats-summary">
        <div class="stat-box">
          <div class="stat-value">{totalPlayed}</div>
          <div class="stat-label">Played</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">{winPercentage}%</div>
          <div class="stat-label">Win %</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">{$currentStreak}</div>
          <div class="stat-label">Current Streak</div>
        </div>
        <div class="stat-box">
          <div class="stat-value">{$maxStreak}</div>
          <div class="stat-label">Max Streak</div>
        </div>
      </div>

      <div class="perfect-games-row">
        <div class="perfect-label">Perfect Games</div>
        <div class="perfect-value">{perfectGames}</div>
      </div>

      <div class="mistake-distribution">
        <h3>Mistake Distribution</h3>

        <div class="distribution-chart">
          {#each Object.entries(mistakeDistribution) as [mistakes, count], i}
            <div class="chart-row">
              <div class="label">{mistakes}</div>
              <div class="bar-container">
                <div
                  class="bar"
                  style="width: {count > 0
                    ? (count / maxDistributionValue) * 100
                    : 0}%"
                >
                  {count > 0 ? count : ""}
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  {:else}
    <!-- Modal mode: render with backdrop -->
    <div
      class="modal-backdrop"
      on:click={handleBackdropClick}
      in:fade={{ duration: 200 }}
      out:fade={{ duration: 150 }}
    >
      <div
        class="modal-content"
        in:fly={{ y: 20, duration: 250 }}
        out:fly={{ y: 20, duration: 200 }}
      >
        <div class="modal-header">
          <h2>Statistics</h2>
          <button class="close-button" on:click={onClose}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M18 6L6 18"
                stroke="white"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M6 6L18 18"
                stroke="white"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        </div>

        <div class="stats-summary">
          <div class="stat-box">
            <div class="stat-value">{totalPlayed}</div>
            <div class="stat-label">Played</div>
          </div>
          <div class="stat-box">
            <div class="stat-value">{winPercentage}%</div>
            <div class="stat-label">Win %</div>
          </div>
          <div class="stat-box">
            <div class="stat-value">{$currentStreak}</div>
            <div class="stat-label">Current Streak</div>
          </div>
          <div class="stat-box">
            <div class="stat-value">{$maxStreak}</div>
            <div class="stat-label">Max Streak</div>
          </div>
        </div>

        <div class="perfect-games-row">
          <div class="perfect-label">Perfect Games</div>
          <div class="perfect-value">{perfectGames}</div>
        </div>

        <div class="mistake-distribution">
          <h3>Mistake Distribution</h3>

          <div class="distribution-chart">
            {#each Object.entries(mistakeDistribution) as [mistakes, count], i}
              <div class="chart-row">
                <div class="label">{mistakes}</div>
                <div class="bar-container">
                  <div
                    class="bar"
                    style="width: {count > 0
                      ? (count / maxDistributionValue) * 100
                      : 0}%"
                  >
                    {count > 0 ? count : ""}
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>

        <!-- Sync status indicator -->
        <div class="sync-status">
          {#if $isAuthenticated}
            {#if $syncStatus.syncing}
              <span class="sync-indicator syncing">
                <span class="sync-dot"></span>
                Syncing...
              </span>
            {:else if $syncStatus.synced}
              <span class="sync-indicator synced">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="#22c55e"/>
                </svg>
                Synced to cloud
              </span>
            {:else if $syncStatus.lastSyncError}
              <span class="sync-indicator error">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="#ef4444"/>
                </svg>
                Sync error
              </span>
            {/if}
          {:else}
            <a href="/login" class="sync-indicator not-logged-in">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="8" r="3.5" stroke="currentColor" stroke-width="1.5" />
                <path d="M5 20C5 17.2386 8.13401 15 12 15C15.866 15 19 17.2386 19 20V21H5V20Z" stroke="currentColor" stroke-width="1.5" />
              </svg>
              Log in to sync stats
            </a>
          {/if}
        </div>
      </div>
    </div>
  {/if}
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.75);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10002; /* Above navbar for full-screen modal */
    padding: 20px;
    box-sizing: border-box;
  }

  .modal-content {
    width: 100%;
    max-width: 400px;
    background: linear-gradient(145deg, #2a1e2d, #1a141d);
    border-radius: 12px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .modal-header h2 {
    margin: 0;
    font-size: 18px;
    color: rgba(255, 255, 255, 0.7);
    font-weight: 600;
  }

  .close-button {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: background-color 0.2s;
  }

  .close-button:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }

  .stats-summary {
    display: flex;
    justify-content: space-around;
    padding: 20px 10px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .stat-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0 10px;
  }

  .stat-value {
    font-size: 24px;
    font-weight: 700;
    color: white;
    margin-bottom: 5px;
  }

  .stat-label {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.7);
    text-align: center;
  }

  .perfect-games-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px 20px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .perfect-label {
    font-size: 14px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.7);
  }

  .perfect-value {
    font-size: 18px;
    font-weight: 700;
    color: white;
  }

  .mistake-distribution {
    padding: 20px;
  }

  .mistake-distribution h3 {
    font-size: 16px;
    margin: 0 0 15px 0;
    color: rgba(255, 255, 255, 0.7);
    text-align: center;
  }

  .distribution-chart {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .chart-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .label {
    width: 15px;
    font-size: 14px;
    font-weight: 600;
    color: white;
    text-align: center;
  }

  .bar-container {
    flex: 1;
    height: 30px;
    background-color: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    overflow: visible; /* Changed to visible to allow numbers to overflow if needed */
    position: relative;
  }

  .bar {
    height: 100%;
    background-color: #ba81c2;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 600;
    font-size: 14px;
    transition: width 0.5s ease-out;
    position: relative;
    min-width: 30px; /* Ensure minimum width for number display */
  }

  /* Mobile responsiveness */
  @media (max-width: 600px) {
    .modal-backdrop {
      padding: 15px;
      align-items: center;
    }

    .modal-content {
      max-width: 95%;
    }

    .stat-value {
      font-size: 20px;
    }

    .stat-label {
      font-size: 11px;
    }
  }

  /* Small mobile screens */
  @media (max-width: 375px) {
    .stats-summary {
      padding: 15px 5px;
    }

    .stat-box {
      padding: 0 5px;
    }

    .stat-value {
      font-size: 18px;
    }

    .stat-label {
      font-size: 10px;
    }
  }

  /* Sync status styles */
  .sync-status {
    padding: 12px 20px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    text-align: center;
  }

  .sync-indicator {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
  }

  .sync-indicator.synced {
    color: #22c55e;
  }

  .sync-indicator.syncing {
    color: #ba81c2;
  }

  .sync-indicator.error {
    color: #ef4444;
  }

  .sync-indicator.not-logged-in {
    color: rgba(255, 255, 255, 0.5);
    text-decoration: none;
    transition: color 0.2s;
  }

  .sync-indicator.not-logged-in:hover {
    color: #ba81c2;
  }

  .sync-dot {
    width: 8px;
    height: 8px;
    background: #ba81c2;
    border-radius: 50%;
    animation: pulse 1.5s infinite;
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.4;
    }
  }

  /* Inline stats styles */
  .inline-stats {
    width: 100%;
  }

  .inline-stats .stats-summary {
    border-bottom: none;
    padding: 10px 0;
  }

  .inline-stats .perfect-games-row {
    padding: 15px 0;
  }

  .inline-stats .mistake-distribution {
    padding: 20px 0;
  }

  .inline-stats .sync-status {
    padding: 12px 0;
  }
</style>
