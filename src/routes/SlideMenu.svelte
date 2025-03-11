<script>
    export let isOpen = false;
    export let closeMenu;
  </script>
  
  <div class="slide-menu-overlay" class:active={isOpen} on:click={closeMenu}></div>
  <div class="slide-menu" class:active={isOpen}>
    <!-- Wrap main content in a div so the footer can be pushed to the bottom -->
    <div>
      <div class="menu-header">
        <button class="close-button" on:click={closeMenu}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M6 6L18 18" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
      
      <nav class="menu-navigation">
        <ul>
          <li><a href="/archives">Archives</a></li>
          <li><a href="/submit">Submit a board</a></li>
          <li><a href="https://twitter.com/Spotle_io" target="_blank">Follow us</a></li>
          <li><a href="/privacy">Privacy</a></li>
        </ul>
      </nav>
      
      <div class="other-games">
        <h2>Our Other Games</h2>
        
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
      <p>made by flatwhite studios</p>
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
    }
    
    @media (max-width: 600px) {
      .slide-menu {
        width: 100%;
        padding-top: 100px; /* Add space for the navbar */
      }
    }
    
    .slide-menu.active {
      transform: translateX(0);
    }
    
    .menu-header {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 20px;
    }
    
    .close-button {
      background: none;
      border: none;
      cursor: pointer;
      padding: 5px;
    }
    
    @media (max-width: 600px) {
      .menu-header {
        display: none;
      }
    }
    
    .menu-navigation ul {
      list-style: none;
      padding: 0;
      margin: 0 0 25px 0;
    }
    
    .menu-navigation li {
      margin-bottom: 8px;
    }
    
    @media (max-width: 600px) {
      .menu-navigation li {
        margin-bottom: 12px;
      }
      
      .menu-navigation a {
        font-size: 18px;
        padding: 8px 0;
      }
    }
    
    .menu-navigation a {
      color: white;
      text-decoration: none;
      font-size: 16px;
      font-weight: 500;
      display: block;
      padding: 6px 0;
      transition: color 0.2s;
      text-align: left;
    }
    
    .menu-navigation a:hover {
      color: #BA81C2;
    }
    
    .other-games h2 {
      font-size: 18px;
      margin-bottom: 20px;
      color: #BA81C2;
    }
    
    /* Stack game cards vertically */
    .game-cards {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }
    
    .game-card {
      width: 120px;
      text-decoration: none;
      color: white;
      text-align: center;
      transition: transform 0.2s;
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
      background-image: url('/images/spotle.png');
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
    
    /* Footer pushed to the bottom */
    footer {
      margin-top: auto;
      text-align: center;
      color: #fff;
      font-size: 12px;
      padding: 10px 0;
    }
</style>
  