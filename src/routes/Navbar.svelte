<script>
  import moment from "moment";
  import SlideMenu from "./SlideMenu.svelte";
  import { page } from "$app/stores";
  import { currentGameDate } from "./store";
  import SpotifyModal from "./SpotifyModal.svelte";
  import StatsModal from "./StatsModal.svelte";

  export let toggleHelpOverlay;
  export let playlist;
  export let isArchiveMode = false; // Add this prop to detect if we're in archive mode or on the archives page

  let menuOpen = false;
  let spotifyModalOpen = false;
  let statsModalOpen = false;

  function toggleMenu() {
    menuOpen = !menuOpen;
  }

  function closeMenu() {
    menuOpen = false;
  }

  // Function to toggle the Spotify modal
  function toggleSpotifyModal() {
    if (playlist) {
      spotifyModalOpen = !spotifyModalOpen;
    }
  }

  // Function to toggle the Stats modal
  function toggleStatsModal() {
    statsModalOpen = !statsModalOpen;
  }

  // Function to navigate to today's game from the indicator with a hard reload
  function goToTodaysGame() {
    window.location.href = "/"; // Force a complete page reload
  }
</script>

<SlideMenu isOpen={menuOpen} {closeMenu} {isArchiveMode} />

<!-- Add the Spotify Modal component -->
<SpotifyModal
  isOpen={spotifyModalOpen}
  playlistUrl={playlist}
  onClose={() => (spotifyModalOpen = false)}
/>

<!-- Add the Stats Modal component -->
<StatsModal isOpen={statsModalOpen} onClose={() => (statsModalOpen = false)} />

<div class="navbar-wrapper">
  <nav class="navbar">
    <div class="navbar-left">
      <button class="menu-button" on:click={toggleMenu}>
        {#if !menuOpen}
          <svg
            width="28"
            height="28"
            viewBox="0 0 28 28"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M25.7353 23.5882C26.3018 23.5885 26.8465 23.8067 27.2565 24.1977C27.6664 24.5886 27.9103 25.1223 27.9375 25.6881C27.9648 26.254 27.7733 26.8086 27.4027 27.2371C27.0321 27.6655 26.5109 27.935 25.9471 27.9897L25.7353 28H2.20588C1.63939 27.9997 1.09471 27.7815 0.684726 27.3906C0.274738 26.9996 0.0308647 26.466 0.00364079 25.9001C-0.0235831 25.3343 0.167929 24.7797 0.538493 24.3512C0.909057 23.9227 1.43027 23.6532 1.99412 23.5985L2.20588 23.5882H25.7353ZM25.7353 13.2941C26.3203 13.2941 26.8814 13.5265 27.2951 13.9402C27.7088 14.3539 27.9412 14.915 27.9412 15.5C27.9412 16.085 27.7088 16.6461 27.2951 17.0598C26.8814 17.4735 26.3203 17.7059 25.7353 17.7059H2.20588C1.62085 17.7059 1.05977 17.4735 0.646088 17.0598C0.232405 16.6461 0 16.085 0 15.5C0 14.915 0.232405 14.3539 0.646088 13.9402C1.05977 13.5265 1.62085 13.2941 2.20588 13.2941H25.7353ZM25.7353 3C26.3203 3 26.8814 3.2324 27.2951 3.64609C27.7088 4.05977 27.9412 4.62085 27.9412 5.20588C27.9412 5.79092 27.7088 6.35199 27.2951 6.76568C26.8814 7.17936 26.3203 7.41176 25.7353 7.41176H2.20588C1.62085 7.41176 1.05977 7.17936 0.646088 6.76568C0.232405 6.35199 0 5.79092 0 5.20588C0 4.62085 0.232405 4.05977 0.646088 3.64609C1.05977 3.2324 1.62085 3 2.20588 3H25.7353Z"
              fill="white"
            />
            <circle cx="23" cy="5" r="5" fill="#FF6A00" />
          </svg>
        {:else}
          <svg
            width="23"
            height="23"
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
        {/if}
      </button>
    </div>

    <!-- Add archive mode indicator with clickable behavior -->
    {#if isArchiveMode}
      <div class="archive-indicator" on:click={goToTodaysGame}>
        <div class="archive-indicator-content">
          <span class="date-text">
            {$page.url.pathname === "/archives"
              ? "Archives"
              : typeof $currentGameDate === "string"
                ? moment($currentGameDate).format("MM/DD/YYYY")
                : $currentGameDate}
          </span>
          <span class="back-to-today">Today</span>
        </div>
      </div>
    {/if}

    <div class="navbar-right">
      <div class="icon-group">
        <!-- Stats button -->
        <button
          class="icon-button"
          on:click={toggleStatsModal}
          aria-label="View Statistics"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 12H6V22H2V12Z" fill="white"/>
            <path d="M10 8H14V22H10V8Z" fill="white"/>
            <path d="M18 3H22V22H18V3Z" fill="white"/>
          </svg>
        </button>

        <!-- Playlist button -->
        <button
          class="icon-button {!playlist ? 'disabled' : ''}"
          on:click={toggleSpotifyModal}
          disabled={!playlist}
          aria-label="Open Playlist"
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 28 28"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M8.42194 1.8184C8.49194 0.822397 9.06644 0.306396 10.1444 0.306396H17.6094C18.6874 0.306396 19.2499 0.822397 19.3204 1.8184H8.42194ZM6.34744 5.0644C6.52344 3.9979 7.02744 3.4119 8.19894 3.4119H19.4609C20.6329 3.4119 21.1364 3.9979 21.3124 5.0644H6.34744ZM7.29694 27.6934C4.85944 27.6934 3.61694 26.4864 3.61694 24.0604V10.5604C3.61694 8.1464 4.85944 6.9279 7.29694 6.9279H20.7029C23.1524 6.9279 24.3829 8.1464 24.3829 10.5604V24.0604C24.3829 26.4744 23.1639 27.6934 21.0544 27.6934H7.29694ZM17.2199 15.3174C17.7294 15.1794 17.8884 15.0734 17.8884 14.4579V12.3784C17.8884 11.9754 17.7504 11.7949 17.1884 11.9329L14.0794 12.7074C13.5594 12.8349 13.4429 12.9409 13.4429 13.5669V18.3519C13.4429 18.8189 13.4004 18.9039 12.8699 19.0519L11.8939 19.3069C10.9284 19.5619 10.1114 20.1344 10.1114 21.1744C10.1114 22.0759 10.7904 22.7339 11.8619 22.7339C13.3794 22.7339 14.4084 21.6409 14.4084 20.1024V16.4634C14.4084 16.0709 14.4934 15.9649 14.7374 15.9114L17.2199 15.3174Z"
              fill="white"
            />
          </svg>
        </button>

        <!-- Help button -->
        <button
          class="icon-button help-btn"
          on:click={toggleHelpOverlay}
          aria-label="Help"
        >
          <svg
            width="25"
            height="25"
            viewBox="0 0 25 25"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M25 12.3826C25 15.6667 23.683 18.8163 21.3388 21.1385C18.9946 23.4607 15.8152 24.7653 12.5 24.7653C9.18479 24.7653 6.00537 23.4607 3.66117 21.1385C1.31696 18.8163 0 15.6667 0 12.3826C0 9.09855 1.31696 5.94898 3.66117 3.62679C6.00537 1.30459 9.18479 0 12.5 0C15.8152 0 18.9946 1.30459 21.3388 3.62679C23.683 5.94898 25 9.09855 25 12.3826ZM8.5875 9.33805H9.87656C10.0922 9.33805 10.2641 9.16315 10.2922 8.95109C10.4328 7.93572 11.1359 7.19586 12.3891 7.19586C13.4609 7.19586 14.4422 7.72676 14.4422 9.00372C14.4422 9.98659 13.8578 10.4386 12.9344 11.1258C11.8828 11.8827 11.05 12.7665 11.1094 14.2013L11.1141 14.5372C11.1157 14.6388 11.1576 14.7356 11.2307 14.8068C11.3037 14.8781 11.4022 14.918 11.5047 14.918H12.7719C12.8755 14.918 12.9748 14.8772 13.0481 14.8046C13.1213 14.7321 13.1625 14.6336 13.1625 14.531V14.3685C13.1625 13.2572 13.5891 12.9337 14.7406 12.0684C15.6922 11.3518 16.6844 10.5562 16.6844 8.88608C16.6844 6.54732 14.6906 5.4174 12.5078 5.4174C10.5281 5.4174 8.35938 6.33062 8.21094 8.95574C8.2088 9.00572 8.217 9.05561 8.23505 9.10234C8.25309 9.14907 8.2806 9.19165 8.31587 9.22746C8.35114 9.26327 8.39343 9.29155 8.44014 9.31057C8.48686 9.32959 8.537 9.33894 8.5875 9.33805ZM12.2203 19.3107C13.1734 19.3107 13.8281 18.7009 13.8281 17.8759C13.8281 17.0215 13.1719 16.4209 12.2203 16.4209C11.3078 16.4209 10.6437 17.0215 10.6437 17.8759C10.6437 18.7009 11.3063 19.3107 12.2203 19.3107Z"
              fill="white"
            />
          </svg>
        </button>
      </div>
    </div>
  </nav>
</div>

<style>
  .navbar-wrapper {
    position: fixed;
    top: 50px; /* Default position below ad for mobile */
    left: 0;
    width: 100%;
    z-index: 1001; /* Higher than the slide menu */
    background: #202020;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }

  /* Move navbar to top on desktop */
  @media (min-width: 768px) {
    .navbar-wrapper {
      top: 0;
    }
  }

  .navbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 10px;
    max-width: 400px;
    margin: 0 auto;
    box-sizing: border-box;
  }

  .navbar-left,
  .navbar-right {
    display: flex;
    align-items: center;
  }

  .navbar-left {
    margin-left: 5px;
  }

  .navbar-right {
    margin-right: 5px;
  }

  .icon-group {
    display: flex;
    align-items: center;
  }

  .menu-button,
  .icon-button {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
  }

  /* Archive mode indicator */
  .archive-indicator {
    font-size: 14px;
    margin-right: 100px;
    color: #ba81c2;
    font-weight: 600;
    padding: 4px 8px;
    cursor: pointer;
    transition: color 0.2s;
  }

  .archive-indicator:hover {
    color: #d9a7e0;
  }

  .archive-indicator-content {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .back-to-today {
    font-size: 12px;
    color: #ba81c2;
    position: relative;
  }

  .back-to-today::before {
    content: "«";
    margin-right: 2px;
  }

  .date-text {
    /* Keeps the date text properly styled */
  }

  .mobile-menu {
    position: absolute;
    top: 100%;
    left: 0;
    width: 200px;
    background-color: rgba(30, 30, 30, 0.9);
    border-radius: 0 0 8px 0;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
    opacity: 0;
    transform: translateX(-100%);
    transition:
      transform 0.3s ease,
      opacity 0.3s ease;
    z-index: 1000;
  }

  .mobile-menu.active {
    transform: translateX(0);
    opacity: 1;
  }

  .mobile-menu ul {
    list-style-type: none;
    padding: 0;
    margin: 0;
  }

  .mobile-menu li {
    padding: 15px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .mobile-menu li:last-child {
    border-bottom: none;
  }

  .mobile-menu a {
    color: white;
    text-decoration: none;
    font-size: 16px;
    display: block;
    transition: color 0.2s;
  }

  .mobile-menu a:hover {
    color: #ba81c2;
  }

  .icon-button {
    margin-left: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .icon-button svg {
    height: 20px;
    width: auto;
  }

  .icon-button:first-child svg {
    height: 22px;
    width: auto;
  }

  .icon-button.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (max-width: 600px) {
    .navbar-title h1 {
      font-size: 16px;
    }

    .icon-button svg {
      height: 18px;
    }

    .icon-button:first-child svg {
      height: 20px;
    }

    .navbar {
      padding: 6px 8px;
    }

    .archive-indicator {
      font-size: 12px;
    }
  }

  /* Preserve the 50px top position on mobile, but hide the ad on larger screens */
  /* @media (min-width: 768px) {
  .navbar-wrapper {
    top: 0; 
  }
} */

  /* Updated icon-button styles */
  .icon-button {
    margin-left: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 6px; /* Increased padding to make clickable area larger */
  }

  .icon-button svg {
    height: 24px; /* Increased from 20px */
    width: auto;
  }

  .icon-button:first-child svg {
    height: 26px; /* Increased from 22px */
    width: auto;
  }

  /* Also increase menu button size */
  .menu-button svg {
    height: 26px; /* Increased from 23px */
    width: 26px;
  }

  /* Make sure mobile still looks good */
  @media (max-width: 600px) {
    .icon-button svg {
      height: 22px; /* Slightly smaller on mobile but still larger than before */
    }

    .icon-button:first-child svg {
      height: 24px;
    }

    .menu-button svg {
      height: 24px;
      width: 24px;
    }
  }
</style>
