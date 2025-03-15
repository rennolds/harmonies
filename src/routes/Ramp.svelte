<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { browser } from "$app/environment";
  
  export let PUB_ID;
  export let WEBSITE_ID;
  
  if (browser) {  
      let rampComponentLoaded = false;
      let lastPathname;
      
      onMount(() => {
        if (!PUB_ID || !WEBSITE_ID) {
          console.log('Missing Publisher Id and Website Id');
          return;
        }
        
        window.ramp = window.ramp || {};
        window.ramp.que = window.ramp.que || [];
        window.ramp.passiveMode = true;
        
        // Load the Ramp configuration script
        const configScript = document.createElement("script");
        configScript.src = `https://cdn.intergient.com/${PUB_ID}/${WEBSITE_ID}/ramp.js`;
        document.body.appendChild(configScript); // Insert before closing</body> tag
        
        configScript.onload = () => {
          rampComponentLoaded = true;
          window.ramp.que.push(() => {
              window.ramp.spaNewPage();
              window.ramp.addTag("standard_iab_head1");
          });
        };
      });
  
      $: if (
          rampComponentLoaded &&
          window.ramp &&
          window.ramp.spaNewPage &&
          $page.url.pathname !== lastPathname
      ) {
        lastPathname = $page.url.pathname;
        window.ramp.que.push(() => {
          window.ramp.spaNewPage($page.url.pathname);
        });
      }
  }
  </script>
  
  <!-- Add the top ad container previously from TopAdBanner.svelte -->
  <div class="top-ad-container">
    <div data-pw-mobi="standard_iab_head1" class="ad-content">
      <!-- Ad Space -->
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
      z-index: 1000;
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
      /* border: 1px dashed rgba(255, 255, 255, 0.3); */
    }
  
    /* Hide on larger screens if desired */
    @media (min-width: 768px) {
      .top-ad-container {
        display: none;
      }
    }
  </style>