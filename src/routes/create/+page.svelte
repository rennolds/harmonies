<script>
  import { enhance } from "$app/forms";
  import { onMount } from "svelte";
  import { browser } from "$app/environment";
  import { goto } from "$app/navigation";
  import Navbar from "../Navbar.svelte";

  export let form;
  export let data;

  let submitting = false;
  let formElement;

  // Check if user is authenticated
  $: isAuthenticated = data?.isAuthenticated ?? false;

  // Form field values for binding
  let title = "";
  let categories = [
    { name: "", items: ["", "", "", ""] },
    { name: "", items: ["", "", "", ""] },
    { name: "", items: ["", "", "", ""] },
    { name: "", items: ["", "", "", ""] },
  ];
  let playlist = "";
  let gameoverGif = "";
  let dailySubmission = false;
  let creditName = "";

  const STORAGE_KEY = "harmonies_draft_puzzle";

  // Default colors matching the game with difficulty labels
  const CATEGORY_CONFIG = [
    { color: "#CBff70", difficulty: "Straightforward" },
    { color: "#FAA3FF", difficulty: "Medium" },
    { color: "#78DAF9", difficulty: "Hard" },
    { color: "#FFBC21", difficulty: "Tricky" },
  ];

  // Save form data to localStorage
  function saveFormToStorage() {
    if (!browser) return;
    const formData = {
      title,
      categories,
      playlist,
      gameoverGif,
      dailySubmission,
      creditName,
      savedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
  }

  // Load form data from localStorage
  function loadFormFromStorage() {
    if (!browser) return false;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return false;

      const formData = JSON.parse(saved);

      // Check if data is less than 7 days old
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - formData.savedAt > sevenDays) {
        localStorage.removeItem(STORAGE_KEY);
        return false;
      }

      title = formData.title || "";
      categories = formData.categories || categories;
      playlist = formData.playlist || "";
      gameoverGif = formData.gameoverGif || "";
      dailySubmission = formData.dailySubmission || false;
      creditName = formData.creditName || "";
      return true;
    } catch (e) {
      console.error("Error loading saved form:", e);
      return false;
    }
  }

  // Clear saved form data
  function clearFormStorage() {
    if (!browser) return;
    localStorage.removeItem(STORAGE_KEY);
  }

  // Handle "Login to Create" button click
  function handleLoginToCreate() {
    saveFormToStorage();
    goto("/login?mode=create&next=/create");
  }

  // On mount, restore any saved form data
  onMount(() => {
    const hadSavedData = loadFormFromStorage();
    if (hadSavedData && isAuthenticated) {
      // User just logged in with saved data - show a brief note
      console.log("Restored your draft puzzle!");
    }
  });

  // Clear storage on successful submission and scroll to top
  $: if (form?.success) {
    clearFormStorage();
    if (browser) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  // Generated puzzle URL for sharing/copying
  $: puzzleUrl = form?.puzzleId
    ? `https://harmonies.io/puzzles/${form.puzzleId}`
    : "";

  // Play link (uses query parameter like profile page)
  $: playLink = form?.puzzleId ? `/?puzzle=${form.puzzleId}` : "";

  // Copy link state
  let copied = false;

  async function copyLink() {
    if (!puzzleUrl) return;
    try {
      await navigator.clipboard.writeText(puzzleUrl);
      copied = true;
      setTimeout(() => (copied = false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }

  function resetForm() {
    // Reset form fields
    title = "";
    categories = [
      { name: "", items: ["", "", "", ""] },
      { name: "", items: ["", "", "", ""] },
      { name: "", items: ["", "", "", ""] },
      { name: "", items: ["", "", "", ""] },
    ];
    playlist = "";
    gameoverGif = "";
    dailySubmission = false;
    creditName = "";
    // Clear the form response by reloading
    window.location.href = "/create";
  }
</script>

<div class="page-container">
  <Navbar playlist={null} toggleHelpOverlay={() => {}} isProfilePage={true} />

  <div class="content">
    {#if !form?.success}
      <h1 style="color: #fff;">Create a Puzzle</h1>
    {/if}

    <form
      bind:this={formElement}
      method="POST"
      on:input={saveFormToStorage}
      use:enhance={() => {
        submitting = true;
        return async ({ update }) => {
          submitting = false;
          update();
        };
      }}
    >
      {#if form?.error}
        <div class="error">{form.error}</div>
      {/if}

      {#if form?.success}
        <div class="success-container">
          <div class="success-header">
            <h2 class="success-title">Voilà! Here is your Harmonies board.</h2>
          </div>

          <div class="link-box">
            <span class="puzzle-link">{puzzleUrl}</span>
          </div>

          <div class="success-actions">
            <a href={playLink} class="play-now-btn">Play Now</a>
            <button type="button" class="copy-btn" on:click={copyLink}>
              {#if copied}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              {:else}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path
                    d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
                  ></path>
                </svg>
              {/if}
            </button>
          </div>

          <div class="success-footer">
            <p class="success-info">
              You can view this puzzle in your profile anytime. Enjoy!
            </p>
            {#if form?.submittedToDaily}
              <p class="success-info highlight">
                We'll email you if we feature the puzzle.
              </p>
            {/if}
          </div>

          <button type="button" class="create-another-btn" on:click={resetForm}>
            Create another!
          </button>
        </div>
      {:else}
        <div class="form-group main-title">
          <label for="title">Puzzle Title (Optional)</label>
          <input
            type="text"
            id="title"
            name="title"
            placeholder="e.g. My Favorite Things"
            bind:value={title}
          />
        </div>

        <div class="categories">
          {#each CATEGORY_CONFIG as config, i}
            <div
              class="category-group"
              style="border-left: 6px solid {config.color}"
            >
              <div class="category-header">
                <div
                  class="difficulty-badge"
                  style="background-color: {config.color}; color: #000;"
                >
                  {config.difficulty}
                </div>
                <h3>Category {i + 1}</h3>
              </div>

              <div class="form-row">
                <div class="field name-field">
                  <input
                    type="text"
                    id="category_{i}_name"
                    name="category_{i}_name"
                    placeholder="Category Name (e.g. Songs by Ariana Grande)"
                    bind:value={categories[i].name}
                    required
                  />
                </div>
              </div>

              <div class="items-grid">
                {#each Array(4) as _, j}
                  <div class="field">
                    <input
                      type="text"
                      id="category_{i}_item_{j}"
                      name="category_{i}_item_{j}"
                      placeholder="Item {j + 1}"
                      bind:value={categories[i].items[j]}
                      required
                    />
                  </div>
                {/each}
              </div>
            </div>
          {/each}
        </div>

        <div class="optional-section">
          <h3>Optional Extras</h3>
          <div class="form-group">
            <label for="playlist">Spotify Playlist URL</label>
            <input
              type="url"
              id="playlist"
              name="playlist"
              placeholder="https://open.spotify.com/..."
              bind:value={playlist}
            />
          </div>

          <div class="form-group">
            <label for="gameoverGif">Game Over GIF URL</label>
            <input
              type="url"
              id="gameoverGif"
              name="gameoverGif"
              placeholder="https://media.giphy.com/..."
              bind:value={gameoverGif}
            />
          </div>
        </div>

        <div class="submission-section">
          <h3>Submission</h3>
          <div class="checkbox-group">
            <input
              type="checkbox"
              id="daily_submission"
              name="daily_submission"
              bind:checked={dailySubmission}
            />
            <label for="daily_submission" class="checkbox-label">
              <strong>Submit this puzzle to be featured on Harmonies?</strong>
              <span class="subtext">
                By checking this box, you grant Harmonies permission to use your
                puzzle. We may edit categories or items for clarity and
                consistency.
              </span>
            </label>
          </div>

          <div class="form-group">
            <label for="credit_name">Credit Name (Optional)</label>
            <input
              type="text"
              id="credit_name"
              name="credit_name"
              placeholder="e.g. Your Name or @handle (leave blank for anonymous)"
              bind:value={creditName}
            />
            <p class="help-text">
              How you would like to be credited if your puzzle is chosen.
            </p>
          </div>
        </div>

        <div class="actions">
          {#if isAuthenticated}
            <button type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create Puzzle"}
            </button>
          {:else}
            <button
              type="button"
              class="login-to-create"
              on:click={handleLoginToCreate}
            >
              Login to Create
            </button>
          {/if}
        </div>
      {/if}
    </form>
  </div>
</div>

<style>
  .page-container {
    min-height: 100vh;
    background-color: #202020;
    color: white;
    padding-top: 60px; /* Space for navbar */
    padding-bottom: 120px; /* Extra space for bottom banner ad */
    position: relative;
  }

  .content {
    max-width: 680px; /* Matches game container width */
    margin: 0 auto;
    padding: 20px;
    padding-bottom: 80px; /* Additional bottom padding */
    box-sizing: border-box;
  }

  h1 {
    text-align: center;
    color: #ba81c2;
    margin-bottom: 30px;
    font-size: 24px;
  }

  h3 {
    color: #fff;
    margin: 0;
    font-size: 16px;
    font-weight: 600;
  }

  .form-group {
    margin-bottom: 20px;
  }

  .main-title label {
    color: #ba81c2;
    font-size: 16px;
    float: left;
  }

  .main-title input {
    font-size: 18px;
    padding: 12px;
  }

  label {
    display: block;
    margin-bottom: 8px;
    font-size: 14px;
    font-weight: 500;
    color: #aaa;
  }

  input[type="text"],
  input[type="url"] {
    width: 100%;
    padding: 10px;
    border-radius: 8px;
    border: 1px solid #444;
    background-color: #333;
    color: white;
    font-size: 14px;
    box-sizing: border-box;
    transition: border-color 0.2s;
  }

  input[type="text"]:focus,
  input[type="url"]:focus {
    outline: none;
    border-color: #ba81c2;
    background-color: #383838;
  }

  .category-group {
    background-color: #2a2a2a;
    padding: 20px;
    border-radius: 12px;
    margin-bottom: 25px;
    border: 1px solid #333;
    position: relative;
    overflow: hidden;
  }

  .category-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 15px;
  }

  .difficulty-badge {
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
  }

  .form-row {
    margin-bottom: 15px;
  }

  .items-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  @media (max-width: 500px) {
    .items-grid {
      grid-template-columns: 1fr;
    }
  }

  .optional-section,
  .submission-section {
    margin-top: 40px;
    border-top: 1px solid #333;
    padding-top: 20px;
    text-align: left;
  }

  .optional-section h3,
  .submission-section h3 {
    color: #ba81c2;
    margin-bottom: 20px;
    text-align: left;
  }

  .checkbox-group {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 25px;
    background-color: #2a2a2a;
    padding: 15px;
    border-radius: 8px;
    border: 1px solid #333;
  }

  input[type="checkbox"] {
    margin-top: 4px;
    width: 20px;
    height: 20px;
    cursor: pointer;
    accent-color: #ba81c2;
  }

  .checkbox-label {
    cursor: pointer;
    margin-bottom: 0;
  }

  .subtext {
    display: block;
    font-weight: 400;
    font-size: 13px;
    color: #888;
    margin-top: 4px;
    line-height: 1.4;
  }

  .help-text {
    font-size: 12px;
    color: #888;
    margin-top: 6px;
    margin-bottom: 0;
  }

  .actions {
    display: flex;
    justify-content: center;
    margin-top: 40px;
  }

  button[type="submit"] {
    background-color: #ba81c2;
    color: white;
    border: none;
    padding: 12px 60px;
    border-radius: 25px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition:
      transform 0.2s,
      background-color 0.2s;
    width: 100%;
    max-width: 300px;
  }

  button[type="submit"]:hover {
    transform: translateY(-2px);
    background-color: #c991d1;
  }

  button[type="submit"]:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none;
  }

  .login-to-create {
    background: linear-gradient(135deg, #ba81c2 0%, #9b5de5 100%);
    color: white;
    border: none;
    padding: 14px 40px;
    border-radius: 25px;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s ease;
    width: 100%;
    max-width: 300px;
    box-shadow: 0 4px 15px rgba(186, 129, 194, 0.3);
  }

  .login-to-create:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(186, 129, 194, 0.4);
  }

  /* Success Container Styles */
  .success-container {
    text-align: left;
    padding: 10px 0;
    max-width: 600px;
    margin: 0 auto;
    box-sizing: border-box;
  }

  .success-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 10px;
  }

  .success-title {
    font-size: 24px;
    font-weight: 700;
    color: #fff;
    margin: 0;
  }

  .success-note {
    color: rgba(255, 255, 255, 0.4);
    font-size: 12px;
    font-style: italic;
    margin: 0;
  }

  .link-box {
    background: #f5f5f5;
    border: 1px solid #ddd;
    border-radius: 6px;
    padding: 5px;
    margin-bottom: 16px;
    text-align: left;
    display: flex;
    align-items: center;
    width: 98%;
  }

  .puzzle-link {
    color: #444;
    font-size: 14px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
      Helvetica, Arial, sans-serif;
    word-break: break-all;
    flex: 1;
  }

  .success-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;
  }

  .success-footer {
    margin-bottom: 30px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    padding-top: 20px;
  }

  .success-info {
    color: rgba(255, 255, 255, 0.7);
    font-size: 14px;
    line-height: 1.5;
    margin: 0 0 10px 0;
  }

  .success-info.highlight {
    color: #ba81c2;
    font-weight: 500;
  }

  .play-now-btn {
    background: #ba81c2;
    color: white;
    padding: 10px 24px;
    border-radius: 6px;
    font-size: 15px;
    font-weight: 700;
    text-decoration: none;
    transition: all 0.2s ease;
  }

  .play-now-btn:hover {
    background: #c994d0;
    transform: translateY(-1px);
  }

  .copy-btn {
    background: #333;
    color: white;
    border: none;
    padding: 10px 12px;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .copy-btn:hover {
    background: #444;
  }

  .create-another-btn {
    display: block;
    margin: 0 auto;
    background: transparent;
    color: rgba(255, 255, 255, 0.5);
    border: none;
    padding: 10px 20px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    text-decoration: underline;
    transition: color 0.2s ease;
  }

  .create-another-btn:hover {
    color: #ba81c2;
  }

  .error {
    background-color: rgba(255, 0, 0, 0.2);
    border: 1px solid #ff4444;
    color: #ffcccc;
    padding: 15px;
    border-radius: 8px;
    margin-bottom: 20px;
    text-align: center;
  }
</style>
