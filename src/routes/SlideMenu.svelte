<script>
  export let isOpen = false;
  export let closeMenu;
</script>

<div
  class="slide-menu-overlay"
  class:active={isOpen}
  on:click={closeMenu}
  on:keydown={(e) => e.key === "Escape" && closeMenu()}
  role="button"
  tabindex="-1"
  aria-label="Close menu"
></div>
<div class="slide-menu" class:active={isOpen}>
  <!-- Wrap main content in a div so the footer can be pushed to the bottom -->
  <div>
    <nav class="menu-navigation">
      <ul>
        <li><a href="/archives">Archives</a></li>
        <li>
          <a href="/create">Create a board</a>
        </li>
        <li>
          <a href="https://twitter.com/Spotle_io" target="_blank">Follow us</a>
        </li>
        <li><a href="https://spotle.io/privacy" target="_blank">Privacy</a></li>
      </ul>
    </nav>

    <div class="other-games">
      <h2>Our Games</h2>

      <div class="game-cards">
        <a href="https://spotle.io" class="game-card">
          <div class="game-image spotle-image"></div>
          <h3>Spotle | Guess the artist</h3>
        </a>

        <a href="https://crosstune.io" class="game-card">
          <div class="game-image crosstune-image"></div>
          <h3>Crosstune | Music crossword</h3>
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
    right: 0;
    bottom: 0;
    width: 100vw;
    height: 100vh;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 998;
    opacity: 0;
    visibility: hidden;
    transition:
      opacity 0.3s ease,
      visibility 0.3s ease;
  }

  .slide-menu-overlay.active {
    opacity: 1;
    visibility: visible;
  }

  .slide-menu {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    width: 100vw;
    height: 100vh;
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
      width: 100vw;
      left: 0;
      right: 0;
    }
  }

  @media (min-width: 601px) {
    .slide-menu {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      padding-top: 80px;
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

    .menu-navigation a {
      font-size: 18px;
      padding: 4px 0;
    }
  }

  .menu-navigation a {
    color: white;
    text-decoration: none;
    font-size: 19px;
    font-weight: 500;
    display: block;
    padding: 5px 0;
    transition: color 0.2s;
    text-align: left;
  }

  .menu-navigation a:hover {
    color: #ba81c2;
  }

  /* Left-align the "Our Games" heading */
  .other-games h2 {
    font-size: 21px;
    margin-bottom: 20px;
    color: #ba81c2;
    text-align: left;
  }

  /* Stack game cards vertically */
  .game-cards {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .game-card {
    width: 260px;
    height: 136px;
    display: flex;
    flex-direction: column;
    margin-bottom: 20px;
    text-decoration: none;
    color: white;
    text-align: center;
    transition: transform 0.2s;
    border-radius: 10px;
    overflow: hidden;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  }

  @media (max-width: 768px) {
    .game-card {
      width: 240px;
    }

    footer {
      margin-bottom: 15px;
    }
  }

  .game-card:hover {
    transform: translateY(-5px);
  }

  .game-image {
    width: 100%;
    height: 100px;
    background-position: center;
  }

  .spotle-image {
    background-color: #1db954;
    background-image: url("/spotle_thumbnail.png");
    background-size: 100%;
    background-repeat: no-repeat;
    background-position: center;
  }

  .crosstune-image {
    background-color: #ff6b00;
    background-image: url("/crosstune_thumbnail.png");
    background-size: 100%;
    background-repeat: no-repeat;
    background-position: center;
  }

  .game-card h3 {
    font-size: 16px;
    margin: 0;
    padding: 12px 0;
    background-color: rgba(0, 0, 0, 0.4);
  }

  /* Footer pushed to the bottom and left-aligned */
  footer {
    margin-top: auto;
    text-align: left;
    color: #fff;
    padding: 10px 0;
    margin-bottom: 80px;
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
