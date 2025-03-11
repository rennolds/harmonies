<!-- src/routes/TopAdBanner.svelte -->
<script>
    // This component displays a banner ad at the top of the screen
  </script>
  
  <div class="top-ad-container">
    <div class="ad-content">
      Ad Space
    </div>
  </div>
  
  <style>
    .top-ad-container {
      width: 100%;
      height: 50px;
      background-color: #202020; /* Match navbar background color */
      display: flex;
      justify-content: center;
      align-items: center;
      position: fixed;
      top: 0;
      left: 0;
      z-index: 1002; /* Higher than navbar to ensure it stays on top */
    }
  
    .ad-content {
      width: 350px;
      height: 50px;
      display: flex;
      justify-content: center;
      align-items: center;
      color: white;
      font-size: 14px;
      font-weight: 500;
      letter-spacing: 0.5px;
      border: 1px dashed rgba(255, 255, 255, 0.3);
    }
  
    /* Hide on larger screens if desired */
    @media (min-width: 768px) {
      .top-ad-container {
        display: none;
      }
    }
  </style>