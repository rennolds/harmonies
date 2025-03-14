<!-- src/routes/Navbar.svelte - Modified to force reload when returning to today's game -->
<script>
  import moment from 'moment';
  import SlideMenu from './SlideMenu.svelte';
  import { page } from '$app/stores';
  import { currentGameDate } from './store';
  
  export let toggleHelpOverlay;
  export let playlist;
  export let isArchiveMode = false; // Add this prop to detect if we're in archive mode or on the archives page

  let menuOpen = false;
  
  function toggleMenu() {
    menuOpen = !menuOpen;
  }
  
  function closeMenu() {
    menuOpen = false;
  }

  // Function to navigate to today's game from the indicator with a hard reload
  function goToTodaysGame() {
    window.location.href = '/'; // Force a complete page reload
  }
</script>

<SlideMenu isOpen={menuOpen} closeMenu={closeMenu} isArchiveMode={isArchiveMode} />

<div class="navbar-wrapper">
<nav class="navbar">
  <div class="navbar-left">
    <button class="menu-button" on:click={toggleMenu}>
      {#if !menuOpen}
        <svg width="23" height="23" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 12H21" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M3 6H21" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M3 18H21" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      {:else}
        <svg width="23" height="23" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 6L6 18" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M6 6L18 18" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      {/if}
    </button>
  </div>
  
  <!-- Add archive mode indicator with clickable behavior -->
  {#if isArchiveMode}
    <div class="archive-indicator" on:click={goToTodaysGame}>
      <div class="archive-indicator-content">
        <span class="date-text">
          {$page.url.pathname === '/archives' 
            ? 'Archives' 
            : (typeof $currentGameDate === 'string' 
                ? moment($currentGameDate).format('MM/DD/YYYY')
                : $currentGameDate)}
        </span>
        <span class="back-to-today">Today</span>
      </div>
    </div>
  {/if}
  
  <div class="navbar-right">
    <a href={playlist} class="icon-button" class:disabled={!playlist}>
      <svg width="" height="" viewBox="0 0 67 26" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M48.8204 1.68867C48.8854 0.763811 49.4189 0.284668 50.4199 0.284668H57.3517C58.3527 0.284668 58.875 0.763811 58.9405 1.68867H48.8204ZM46.8941 4.70281C47.0575 3.71249 47.5255 3.16835 48.6134 3.16835H59.0709C60.1592 3.16835 60.6267 3.71249 60.7902 4.70281H46.8941ZM47.7758 25.7155C45.5124 25.7155 44.3586 24.5947 44.3586 22.342V9.80624C44.3586 7.56467 45.5124 6.4332 47.7758 6.4332H60.2242C62.4987 6.4332 63.6414 7.56467 63.6414 9.80624V22.342C63.6414 24.5835 62.5094 25.7155 60.5506 25.7155H47.7758ZM56.99 14.2235C57.4631 14.0953 57.6107 13.9969 57.6107 13.4253V11.4944C57.6107 11.1202 57.4826 10.9526 56.9607 11.0807L54.0738 11.7999C53.591 11.9183 53.4828 12.0167 53.4828 12.598V17.0412C53.4828 17.4748 53.4433 17.5538 52.9507 17.6912L52.0444 17.928C51.1479 18.1648 50.3892 18.6964 50.3892 19.6621C50.3892 20.4992 51.0198 21.1102 52.0147 21.1102C53.4238 21.1102 54.3793 20.0953 54.3793 18.6667V15.2876C54.3793 14.9231 54.4582 14.8247 54.6848 14.775L56.99 14.2235Z" fill="white"/>
      </svg>                
    </a>
    <button class="icon-button help-btn" on:click={toggleHelpOverlay}>
      <svg width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M25 12.3826C25 15.6667 23.683 18.8163 21.3388 21.1385C18.9946 23.4607 15.8152 24.7653 12.5 24.7653C9.18479 24.7653 6.00537 23.4607 3.66117 21.1385C1.31696 18.8163 0 15.6667 0 12.3826C0 9.09855 1.31696 5.94898 3.66117 3.62679C6.00537 1.30459 9.18479 0 12.5 0C15.8152 0 18.9946 1.30459 21.3388 3.62679C23.683 5.94898 25 9.09855 25 12.3826ZM8.5875 9.33805H9.87656C10.0922 9.33805 10.2641 9.16315 10.2922 8.95109C10.4328 7.93572 11.1359 7.19586 12.3891 7.19586C13.4609 7.19586 14.4422 7.72676 14.4422 9.00372C14.4422 9.98659 13.8578 10.4386 12.9344 11.1258C11.8828 11.8827 11.05 12.7665 11.1094 14.2013L11.1141 14.5372C11.1157 14.6388 11.1576 14.7356 11.2307 14.8068C11.3037 14.8781 11.4022 14.918 11.5047 14.918H12.7719C12.8755 14.918 12.9748 14.8772 13.0481 14.8046C13.1213 14.7321 13.1625 14.6336 13.1625 14.531V14.3685C13.1625 13.2572 13.5891 12.9337 14.7406 12.0684C15.6922 11.3518 16.6844 10.5562 16.6844 8.88608C16.6844 6.54732 14.6906 5.4174 12.5078 5.4174C10.5281 5.4174 8.35938 6.33062 8.21094 8.95574C8.2088 9.00572 8.217 9.05561 8.23505 9.10234C8.25309 9.14907 8.2806 9.19165 8.31587 9.22746C8.35114 9.26327 8.39343 9.29155 8.44014 9.31057C8.48686 9.32959 8.537 9.33894 8.5875 9.33805ZM12.2203 19.3107C13.1734 19.3107 13.8281 18.7009 13.8281 17.8759C13.8281 17.0215 13.1719 16.4209 12.2203 16.4209C11.3078 16.4209 10.6437 17.0215 10.6437 17.8759C10.6437 18.7009 11.3063 19.3107 12.2203 19.3107Z" fill="white"/>
      </svg>
    </button>
  </div>
</nav>
</div>

<style>
.navbar-wrapper {
  position: fixed;
  top: 50px; /* Adjusted from 0 to 50px to accommodate the ad */
  left: 0;
  width: 100%;
  z-index: 1001; /* Higher than the slide menu */
  background: #202020;
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

.navbar-left, .navbar-right {
  display: flex;
  align-items: center;
}

.navbar-left {
  margin-left: 5px;
}

.navbar-right {
  margin-right: 5px;
}

.menu-button, .icon-button {
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
  color: #BA81C2;
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
  color: #BA81C2;
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
  transition: transform 0.3s ease, opacity 0.3s ease;
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
  color: #BA81C2;
}

.icon-button {
  margin-left: 10px;
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

/* Hide navbar top margin on larger screens if the ad is not displayed */
@media (min-width: 768px) {
  .navbar-wrapper {
    top: 0; /* Reset top position for desktop */
  }
}
</style>