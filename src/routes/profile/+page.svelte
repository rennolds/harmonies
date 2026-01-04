<script>
  import { onMount } from "svelte";
  import Navbar from "../Navbar.svelte";
  import StatsModal from "../StatsModal.svelte";
  import { supabase } from "$lib/supabaseClient";
  import { authUser, userProfile } from "$lib/stores/statsStore.js";
  import { validateUsername } from "$lib/validation.js";
  import { browser } from "$app/environment";
  import moment from "moment";
  import "../styles.css";

  export let data; // Server data with session, profile, and puzzles

  // Username editing state
  let isEditingUsername = false;
  let newUsername = "";
  let usernameError = "";
  let isSavingUsername = false;

  // Toast notification state
  let showCopiedToast = false;
  let copiedToastTimeout = null;

  // Sync userProfile store with server data on mount
  // This ensures the avatar color is always up-to-date
  onMount(() => {
    if (data.profile) {
      userProfile.set(data.profile);
    }
  });

  // Check if on mobile device
  function isMobileDevice() {
    if (!browser) return false;
    return (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) ||
      (navigator.maxTouchPoints && navigator.maxTouchPoints > 2)
    );
  }

  // Check if Web Share API is available
  function canShare() {
    return browser && navigator.share !== undefined;
  }

  // Dummy function for navbar compatibility
  function toggleHelpOverlay() {}

  async function handleLogOut() {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Sign out error:", err);
      // Continue with local cleanup even if signOut fails
    }
    // Clear stores after signOut
    authUser.set(null);
    userProfile.set(null);
    // Redirect to home
    window.location.href = "/";
  }

  // Show toast notification
  function showToast() {
    showCopiedToast = true;
    if (copiedToastTimeout) clearTimeout(copiedToastTimeout);
    copiedToastTimeout = setTimeout(() => {
      showCopiedToast = false;
    }, 2000);
  }

  // Share or copy puzzle link
  async function sharePuzzleLink(puzzleId, puzzleTitle) {
    const url = `${window.location.origin}/?puzzle=${puzzleId}`;
    const title = puzzleTitle || `Custom Puzzle ${puzzleId.slice(0, 4)}`;

    // On mobile with Web Share API support, use native sharing
    if (isMobileDevice() && canShare()) {
      try {
        await navigator.share({
          title: `Harmonies - ${title}`,
          text: `Play my custom Harmonies puzzle!`,
          url: url,
        });
      } catch (err) {
        // User cancelled or error - fall back to clipboard
        if (err.name !== "AbortError") {
          copyToClipboard(url);
        }
      }
    } else {
      // On desktop, copy to clipboard
      copyToClipboard(url);
    }
  }

  // Copy to clipboard and show toast
  function copyToClipboard(url) {
    navigator.clipboard
      .writeText(url)
      .then(() => {
        showToast();
      })
      .catch((err) => {
        console.error("Failed to copy: ", err);
      });
  }

  // Username editing functions
  function startEditingUsername() {
    newUsername = $userProfile?.username || data.profile?.username || "";
    usernameError = "";
    isEditingUsername = true;
  }

  function cancelEditingUsername() {
    isEditingUsername = false;
    newUsername = "";
    usernameError = "";
  }

  async function saveUsername() {
    const userId = $authUser?.id || data?.user?.id;
    if (!userId) return;

    usernameError = "";

    isSavingUsername = true;

    try {
      const validationError = await validateUsername(newUsername);
      if (validationError) {
        usernameError = validationError;
        isSavingUsername = false;
        return;
      }
      const uname = newUsername.trim().toLowerCase();

      const currentUsername = $userProfile?.username || data.profile?.username;
      if (uname === currentUsername) {
        isEditingUsername = false;
        isSavingUsername = false;
        return;
      }

      // Check uniqueness
      const { data: existing, error: checkErr } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", uname)
        .maybeSingle();

      if (!checkErr && existing) {
        usernameError = "That username is taken. Try another.";
        isSavingUsername = false;
        return;
      }

      // Update
      const { error } = await supabase
        .from("profiles")
        .update({ username: uname })
        .eq("id", userId);

      if (error) throw error;

      // Optimistic update
      userProfile.update((p) => ({ ...p, username: uname }));
      isEditingUsername = false;
    } catch (err) {
      console.error("Error updating username:", err);
      usernameError = "Failed to update username. Please try again.";
    } finally {
      isSavingUsername = false;
    }
  }

  // Puzzles list
  $: puzzles = data.puzzles || [];

  // Use store data with fallback to server data
  $: displayUsername = $userProfile?.username || data.profile?.username || null;
  $: avatarColor =
    $userProfile?.avatar_color || data.profile?.avatar_color || "#ba81c2";

  // Format join date like Spotle
  function formatJoinDate(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }

  $: joinDate = data?.user?.created_at
    ? formatJoinDate(data.user.created_at)
    : "";
</script>

<Navbar
  {toggleHelpOverlay}
  playlist=""
  isArchiveMode={false}
  isProfilePage={true}
/>

<main class="profile-page">
  <div class="profile-container">
    <!-- Profile Header -->
    <div class="profile-header">
      <div class="avatar-circle" style:background={avatarColor}>
        <span class="avatar-initial">
          {displayUsername ? displayUsername[0].toUpperCase() : "?"}
        </span>
      </div>
      <div class="user-info">
        <div class="username-container-fixed">
          {#if isEditingUsername}
            <div class="edit-username-container">
              <input
                type="text"
                bind:value={newUsername}
                class="username-input"
                placeholder="New username"
                maxlength="24"
              />
              <div class="edit-actions">
                <button
                  class="save-btn"
                  on:click={saveUsername}
                  disabled={isSavingUsername}
                >
                  {isSavingUsername ? "Saving..." : "Save"}
                </button>
                <button
                  class="cancel-btn"
                  on:click={cancelEditingUsername}
                  disabled={isSavingUsername}
                >
                  Cancel
                </button>
              </div>
              {#if usernameError}
                <p class="error-msg">{usernameError}</p>
              {/if}
            </div>
          {:else}
            <div class="username-wrapper">
              <h1 class="username">{displayUsername ?? "User"}</h1>
              <button
                class="edit-icon-btn"
                on:click={startEditingUsername}
                aria-label="Edit username"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M18.5 2.50001C18.8978 2.10219 19.4374 1.87869 20 1.87869C20.5626 1.87869 21.1022 2.10219 21.5 2.50001C21.8978 2.89784 22.1213 3.4374 22.1213 4.00001C22.1213 4.56262 21.8978 5.10219 21.5 5.50001L12 15L8 16L9 12L18.5 2.50001Z"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </button>
            </div>
          {/if}
          <p class="join-date">Since {joinDate}</p>
        </div>
      </div>
    </div>

    <!-- Your Puzzles Section -->
    <div class="section puzzles-section">
      <h2>Your Puzzles</h2>
      {#if puzzles.length > 0}
        <div class="puzzles-list">
          {#each puzzles as puzzle}
            <div class="puzzle-row">
              <div class="puzzle-info">
                <span class="puzzle-title">
                  {puzzle.title || `Custom Puzzle ${puzzle.id.slice(0, 4)}`}
                </span>
                <span class="puzzle-date"
                  >{moment(puzzle.created_at).format("MMM D, YYYY")}</span
                >
              </div>
              <div class="puzzle-actions">
                <a href="/?puzzle={puzzle.id}" class="play-btn" title="Play">
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 55 55"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <mask
                      id="mask0_play_{puzzle.id}"
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
                    <g mask="url(#mask0_play_{puzzle.id})">
                      <path
                        d="M-3.1001 -3.1001H58.0999V58.0999H-3.1001V-3.1001Z"
                        fill="white"
                      />
                    </g>
                  </svg>
                </a>
                <button
                  class="copy-btn"
                  on:click={() => sharePuzzleLink(puzzle.id, puzzle.title)}
                  title="Share Link"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M8 4V16C8 17.1046 8.89543 18 10 18H18C19.1046 18 20 17.1046 20 16V7.24264C20 6.71221 19.7893 6.20357 19.4142 5.82843L16.1716 2.58579C15.7964 2.21071 15.2878 2 14.7574 2H10C8.89543 2 8 2.89543 8 4Z"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M16 18V20C16 21.1046 15.1046 22 14 22H6C4.89543 22 4 21.1046 4 20V8C4 6.89543 4.89543 6 6 6H8"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <div class="empty-state">
          <p>You haven't created any puzzles yet.</p>
          <a href="/create" class="create-btn">Create a Puzzle</a>
        </div>
      {/if}
    </div>

    <!-- Stats Section -->
    <div class="section stats-section">
      <h2>Stats</h2>
      <div class="stats-content-wrapper">
        <StatsModal isOpen={true} inline={true} />
      </div>
    </div>

    <!-- Logout Button -->
    <button class="logout-btn" on:click={handleLogOut}> Log Out </button>
  </div>
</main>

<!-- Copied Toast Notification -->
{#if showCopiedToast}
  <div class="copied-toast">Copied to clipboard!</div>
{/if}

<style>
  .profile-page {
    min-height: 100vh;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 100px;
    padding-bottom: 120px; /* Extra space for bottom banner ad */
    overflow-x: hidden;
    position: relative;
    z-index: 1; /* Create stacking context above ads */
  }

  .profile-container {
    width: 100%;
    max-width: 600px;
    padding: 20px;
    padding-bottom: 80px; /* Additional bottom padding */
    box-sizing: border-box;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    position: relative;
    z-index: 10; /* Ensure content is above ad overlays */
  }

  /* Profile Header */
  .profile-header {
    display: flex;
    align-items: flex-start;
    justify-content: flex-start;
    width: 100%;
    margin-bottom: 40px;
    gap: 20px;
    box-sizing: border-box;
  }

  .avatar-circle {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 3px solid #121212;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    flex-shrink: 0;
    margin-top: 5px;
  }

  .avatar-initial {
    color: #121212;
    font-size: 36px;
    font-weight: 800;
    line-height: 1;
  }

  .user-info {
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    flex-grow: 1;
    min-height: 80px;
    padding-top: 15px;
  }

  .join-date {
    color: rgba(255, 255, 255, 0.5);
    font-size: 14px;
    margin: 4px 0 0 0;
    font-weight: 500;
    line-height: 1.5;
    text-align: left;
  }

  .username-container-fixed {
    position: relative;
    width: 100%;
    margin-bottom: 4px;
  }

  .username-wrapper {
    display: flex;
    align-items: center;
    gap: 10px;
    height: 34px;
  }

  .username {
    color: #fff;
    font-size: 28px;
    font-weight: 700;
    margin: 0;
    line-height: 1.2;
  }

  .edit-icon-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    opacity: 0.7;
    transition: opacity 0.2s;
    display: flex;
    align-items: center;
    color: #fff;
  }

  .edit-icon-btn:hover {
    opacity: 1;
  }

  .edit-username-container {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
    max-width: 300px;
  }

  .username-input {
    background: #1e1e1e;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    padding: 6px 10px;
    color: white;
    font-size: 16px;
    font-weight: 600;
    width: 100%;
  }

  .edit-actions {
    display: flex;
    gap: 8px;
  }

  .save-btn,
  .cancel-btn {
    padding: 4px 12px;
    border-radius: 4px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    border: none;
  }

  .save-btn {
    background: #ba81c2;
    color: #121212;
  }

  .save-btn:hover {
    background: #c994d0;
  }

  .cancel-btn {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }

  .cancel-btn:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .error-msg {
    color: #ef4444;
    font-size: 12px;
    margin: 0;
  }

  .section {
    width: 100%;
    margin-bottom: 40px;
    background-color: #2a2a2a;
    border-radius: 12px;
    padding: 20px;
    border: 1px solid #333;
    box-sizing: border-box;
  }

  .section h2 {
    color: #ba81c2;
    font-size: 18px;
    margin: 0 0 20px 0;
    font-weight: 600;
    border-bottom: 1px solid #444;
    padding-bottom: 10px;
    text-align: left;
  }

  /* Puzzles List Styles */
  .puzzles-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .puzzle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px;
    background-color: #333;
    border-radius: 8px;
    transition: background-color 0.2s;
    gap: 12px;
    box-sizing: border-box;
  }

  .puzzle-row:hover {
    background-color: #3a3a3a;
  }

  .puzzle-info {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    flex: 1;
    overflow: hidden;
    gap: 12px;
  }

  .puzzle-title {
    color: white;
    font-weight: 500;
    font-size: 15px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .puzzle-date {
    color: #888;
    font-size: 12px;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .puzzle-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .play-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    transition:
      transform 0.2s,
      opacity 0.2s;
    opacity: 0.9;
  }

  .play-btn:hover {
    transform: scale(1.1);
    opacity: 1;
  }

  .copy-btn {
    background: transparent;
    border: none;
    color: #888;
    cursor: pointer;
    padding: 8px;
    border-radius: 4px;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .copy-btn:hover {
    color: white;
    background-color: #444;
  }

  .empty-state {
    text-align: center;
    padding: 20px 0;
    color: #888;
  }

  .create-btn {
    display: inline-block;
    margin-top: 10px;
    color: #ba81c2;
    text-decoration: none;
    font-weight: 500;
  }

  .create-btn:hover {
    text-decoration: underline;
  }

  /* Stats Content Wrapper */
  .stats-content-wrapper {
    position: relative;
  }

  .logout-btn {
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    color: #fff;
    font-size: 14px;
    font-weight: 500;
    padding: 12px 32px;
    cursor: pointer;
    transition: all 0.2s ease;
    width: auto;
    align-self: flex-start;
    position: relative;
    z-index: 100; /* Ensure button is above any ad overlays */
    -webkit-tap-highlight-color: transparent; /* Better mobile touch feedback */
  }

  .logout-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.3);
  }

  .logout-btn:active {
    background: rgba(255, 255, 255, 0.15);
    transform: scale(0.98);
  }

  /* Mobile: account for the fixed top ad + navbar and keep equal side padding */
  @media (max-width: 767px) {
    .profile-page {
      padding-top: 120px;
    }
  }

  @media (max-width: 480px) {
    .profile-page {
      padding-top: 120px;
    }

    .profile-container {
      padding: 16px;
    }

    .avatar-circle {
      width: 64px;
      height: 64px;
    }

    .avatar-initial {
      font-size: 28px;
    }

    .username {
      font-size: 22px;
    }
  }

  /* Copied Toast Notification */
  .copied-toast {
    position: fixed;
    bottom: 100px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    z-index: 10010;
    animation: toastFadeIn 0.2s ease-out;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  @keyframes toastFadeIn {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }
</style>
