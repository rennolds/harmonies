<script>
  export let isOpen = false;
  export let closeMenu;
  export let isArchiveMode = false; // Add this prop to detect if we're in archive mode or on the archives page
  
  // Function to handle navigation to today's game with forced reload
  function goToTodaysGame() {
    // Use window.location.href to force a complete page reload
    window.location.href = '/';
    closeMenu();
  }
</script>

<div class="slide-menu-overlay" class:active={isOpen} on:click={closeMenu}></div>
<div class="slide-menu" class:active={isOpen}>
  <!-- Wrap main content in a div so the footer can be pushed to the bottom -->
  <div>
    
    <nav class="menu-navigation">
      <ul>
        <!-- Add "Today's Harmonies" option when in archive mode -->
        {#if isArchiveMode}
          <li><button on:click={goToTodaysGame} class="menu-link">Today's Harmonies</button></li>
        {/if}
        <li><a href="/archives">Archives</a></li>
        <li><a href="https://form.jotform.com/250716973857067">Submit a board</a></li>
        <li><a href="https://twitter.com/Spotle_io" target="_blank">Follow us</a></li>
        <li><a href="/privacy">Privacy</a></li>
      </ul>
    </nav>
    
    <div class="other-games">
      <h2>Our Games</h2>
      
      <div class="game-cards">
        <a href="https://spotle.io" class="game-card">
          <div class="game-image spotle-image"></div>
          <h3>Spotle</h3>
        </a>
        
        <a href="#" class="game-card">
          <div class="game-image crosstune-image"></div>
          <h3>Crosstune</h3>
        </a>
      </div>
    </div>
  </div>
  
  <footer>
    <p class="company-name">made by flatwhite studios</p>
    <p class="company-email">inquiries: company@flatwhite-studios.com</p>
  </footer>
</div>

<style>
  .slide-menu-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 998;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.3s ease, visibility 0.3s ease;
  }
  
  .slide-menu-overlay.active {
    opacity: 1;
    visibility: visible;
  }
  
  .slide-menu {
    position: fixed;
    top: 0;
    left: 0;
    width: 350px;
    height: 100%;
    background: linear-gradient(145deg, #2a1e2d, #1a141d);
    color: white;
    z-index: 999;
    padding: 20px;
    box-sizing: border-box;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
    overflow-y: auto;
    /* Make the menu a flex container with vertical layout */
    display: flex;
    flex-direction: column;
    padding-top: 120px;

  }
  
  @media (max-width: 600px) {
    .slide-menu {
      width: 100%;
    }
  }
  
  .slide-menu.active {
    transform: translateX(0);
  }


  .menu-navigation ul {
    list-style: none;
    padding: 0;
    margin: 0 0 25px 0;
  }
  
  .menu-navigation li {
    margin-bottom: 2px;
  }
  
  @media (max-width: 600px) {
    .menu-navigation li {
      margin-bottom: 4px;
    }
    
    .menu-navigation a, .menu-navigation .menu-link {
      font-size: 18px;
      padding: 4px 0;
    }
  }
  
  .menu-navigation a, .menu-navigation .menu-link {
    color: white;
    text-decoration: none;
    font-size: 16px;
    font-weight: 500;
    display: block;
    padding: 5px 0;
    transition: color 0.2s;
    text-align: left;
  }
  
  /* Style the button to look like other menu links */
  .menu-link {
    background: none;
    border: none;
    cursor: pointer;
    width: 100%;
    text-align: left;
    padding: 6px 0;
  }
  
  .menu-navigation a:hover, .menu-navigation .menu-link:hover {
    color: #BA81C2;
  }
  
  /* Left-align the "Our Games" heading */
  .other-games h2 {
    font-size: 18px;
    margin-bottom: 20px;
    color: #BA81C2;
    text-align: left;
  }
  
  /* Stack game cards vertically */
  .game-cards {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }
  
  .game-card {
    width: 238px;
    height: 95px;
    margin-bottom: 75px;
    text-decoration: none;
    color: white;
    text-align: center;
    transition: transform 0.2s;
  }

  @media (max-width: 768px) {
    .game-card {
      height: 80px;
    }
  }
  
  .game-card:hover {
    transform: translateY(-5px);
  }
  
  .game-image {
    width: 100%;
    height: 120px;
    border-radius: 10px;
    margin-bottom: 10px;
    background-size: cover;
    background-position: center;
  }
  
  .spotle-image {
    background-color: #1DB954;
    background-image: url('./spotle.png');
    background-size: 80%;
    background-repeat: no-repeat;
    background-position: center;
  }
  
  .crosstune-image {
    background-color: #FF6B00;
    background-image: url('/images/crosstune.png');
    background-size: 80%;
    background-repeat: no-repeat;
    background-position: center;
  }
  
  .game-card h3 {
    font-size: 16px;
    margin: 0;
  }
  
  /* Footer pushed to the bottom and left-aligned */
  footer {
    margin-top: auto;
    text-align: left;
    color: #fff;
    padding: 10px 0;
  }
  
  /* Style for company name */
  .company-name {
    font-size: 11px;
    margin-bottom: 4px;
  }
  
  /* Style for company email */
  .company-email {
    font-size: 10px;
    font-weight: 400;
    margin-top: 0;
    color: rgba(255, 255, 255, 0.8);
  }
</style>