<!-- src/routes/SpotifyModal.svelte -->
<script>
    import { fade, fly } from 'svelte/transition';
    
    // Props
    export let isOpen = false;
    export let playlistUrl = '';
    export let onClose = () => {};
    
    // Extract playlist ID from the URL if provided
    $: playlistId = extractPlaylistId(playlistUrl);
    
    // Function to extract the playlist ID from a Spotify URL
    function extractPlaylistId(url) {
      if (!url) return '';
      
      // Handle both full URLs and just IDs
      if (url.includes('spotify.com/playlist/')) {
        const parts = url.split('spotify.com/playlist/');
        if (parts.length > 1) {
          // Extract the ID and remove any query parameters
          return parts[1].split('?')[0];
        }
      } else if (url.includes('spotify.com/embed/playlist/')) {
        const parts = url.split('spotify.com/embed/playlist/');
        if (parts.length > 1) {
          return parts[1].split('?')[0];
        }
      }
      
      // If it's just the ID or we couldn't parse it, return as is
      return url;
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
      if (event.key === 'Escape') {
        onClose();
      }
    }
  </script>
  
  <svelte:window on:keydown={handleKeydown} />
  
  {#if isOpen}
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
        <h2>Today's Playlist</h2>
        <button class="close-button" on:click={onClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M6 6L18 18" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
      
      <div class="iframe-container">
        {#if playlistId}
          <iframe 
            title="Spotify Playlist"
            src="https://open.spotify.com/embed/playlist/{playlistId}?utm_source=generator" 
            width="100%" 
            frameborder="0" 
            allowfullscreen="" 
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
            loading="lazy"
          ></iframe>
        {:else}
          <div class="no-playlist">
            <p>No playlist available for today.</p>
          </div>
        {/if}
      </div>
      
      <div class="modal-footer">
        <a href={playlistUrl} target="_blank" rel="noopener noreferrer" class="open-spotify-btn">
          <span class="spotify-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 0C5.4 0 0 5.4 0 12C0 18.6 5.4 24 12 24C18.6 24 24 18.6 24 12C24 5.4 18.66 0 12 0ZM17.521 17.34C17.281 17.699 16.861 17.82 16.5 17.58C13.68 15.84 10.14 15.479 5.939 16.439C5.521 16.56 5.16 16.26 5.04 15.9C4.92 15.479 5.22 15.12 5.58 15C10.14 13.979 14.1 14.399 17.279 16.319C17.639 16.5 17.76 16.979 17.521 17.34ZM18.961 14.04C18.66 14.46 18.12 14.64 17.7 14.34C14.46 12.36 9.54 11.76 5.76 12.9C5.281 13.08 4.74 12.84 4.56 12.36C4.38 11.88 4.62 11.34 5.1 11.16C9.42 9.9 14.88 10.561 18.66 12.9C19.02 13.14 19.2 13.74 18.961 14.04ZM19.081 10.68C15.24 8.4 8.82 8.16 5.16 9.301C4.561 9.48 3.96 9.12 3.78 8.58C3.6 7.979 3.96 7.38 4.5 7.2C8.76 5.88 15.78 6.181 20.221 8.821C20.76 9.121 20.94 9.84 20.64 10.38C20.341 10.86 19.62 11.04 19.081 10.68Z" fill="white"/>
            </svg>
          </span>
          Open in Spotify
        </a>
      </div>
    </div>
  </div>
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
      z-index: 1100; /* Higher than navbar and other overlays */
      padding: 20px;
      box-sizing: border-box;
    }
    
    .modal-content {
      width: 100%;
      max-width: 500px;
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
      color: #BA81C2;
      font-weight: 600;
    }
    
    .close-button {
      background: none;
      border: none;
      cursor: pointer;
      padding: 5px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: background-color 0.2s;
    }
    
    .close-button:hover {
      background-color: rgba(255, 255, 255, 0.1);
    }
    
    .iframe-container {
      width: 100%;
      background-color: #121212;
      border-radius: 8px;
      overflow: hidden;
    }
    
    .iframe-container iframe {
      display: block; /* Ensures no extra space below iframe */
      height: 380px; /* Fixed height for desktop */
    }
    
    .no-playlist {
      height: 200px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 16px;
    }
    
    .modal-footer {
      padding: 16px 20px;
      display: flex;
      justify-content: center;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .open-spotify-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #1DB954; /* Spotify green */
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 30px;
      font-weight: 600;
      font-size: 14px;
      text-decoration: none;
      transition: background-color 0.2s;
    }
    
    .open-spotify-btn:hover {
      background-color: #1ed760;
    }
    
    .spotify-icon {
      display: inline-flex;
      align-items: center;
      margin-right: 8px;
    }
    
    /* Mobile responsiveness */
    @media (max-width: 600px) {
      .modal-backdrop {
        padding: 10px;
        align-items: flex-start;
        overflow-y: auto;
        padding-top: 60px;
      }
      
      .modal-content {
        max-width: 95%;
        height: auto;
        max-height: none; /* Remove max-height constraint */
      }
      
      .modal-header h2 {
        font-size: 16px;
      }
      
      .iframe-container iframe {
        height: 400px; /* Taller on mobile for better visibility */
        min-height: 350px; /* Ensure minimum height */
      }
      
      /* Ensure buttons are easier to tap on mobile */
      .close-button, 
      .open-spotify-btn {
        padding: 10px;
      }
      
      .open-spotify-btn {
        width: 100%;
        max-width: 240px;
        padding: 12px 20px;
      }
    }
    
    /* Small mobile screens */
    @media (max-width: 375px) {
      .iframe-container iframe {
        height: 340px; /* Slightly smaller for very small screens */
      }
    }
  </style>