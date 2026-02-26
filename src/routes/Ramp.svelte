<script>
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { browser } from "$app/environment";

  export let PUB_ID;
  export let WEBSITE_ID;

  if (browser) {
    let rampComponentLoaded = false;
    let lastPathname;

    // Defense 2: MutationObserver watchdog — detect and remove rogue
    // full-screen ad overlays that get injected directly onto <body>.
    onMount(() => {
      const appElementIds = new Set([
        "ad-container",
        "standard_iab_head1",
        "svelte",
      ]);

      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            // Skip non-element nodes
            if (node.nodeType !== 1) continue;

            // Skip known app elements by ID
            if (appElementIds.has(node.id)) continue;

            // Skip known safe tags
            if (
              node.tagName === "NAV" ||
              node.tagName === "SCRIPT" ||
              node.tagName === "LINK" ||
              node.tagName === "STYLE" ||
              node.tagName === "META"
            )
              continue;

            // Cheap pre-check: only proceed if inline position is fixed/absolute
            const inlinePos = node.style?.position;
            if (inlinePos !== "fixed" && inlinePos !== "absolute") continue;

            try {
              const style = window.getComputedStyle(node);
              const w = parseFloat(style.width) || 0;
              const h = parseFloat(style.height) || 0;
              const z = parseInt(style.zIndex) || 0;

              const isFullScreen =
                w > window.innerWidth * 0.7 && h > window.innerHeight * 0.4;
              const isHighZ = z >= 900;

              if (isFullScreen && isHighZ) {
                console.warn("[AdGuard] Blocked rogue ad overlay:", {
                  tag: node.tagName,
                  id: node.id,
                  class: node.className,
                  size: `${w}x${h}`,
                  zIndex: z,
                });
                node.remove();
              }
            } catch (e) {
              // Ignore errors from cross-origin iframes
            }
          }
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });

      // Ramp ad SDK initialization
      if (!PUB_ID || !WEBSITE_ID) {
        console.log("Missing Publisher Id and Website Id");
        return () => observer.disconnect();
      }

      window.ramp = window.ramp || {};
      window.ramp.que = window.ramp.que || [];
      window.ramp.passiveMode = true;

      const configScript = document.createElement("script");
      configScript.src = `https://cdn.intergient.com/${PUB_ID}/${WEBSITE_ID}/ramp.js`;
      document.body.appendChild(configScript);

      configScript.onload = () => {
        rampComponentLoaded = true;
        window.ramp.que.push(() => {
          window.ramp.spaNewPage();
          window.ramp.addTag("standard_iab_head1");
        });
      };

      return () => observer.disconnect();
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

<div id="ad-container" class="top-ad-container">
  <div
    data-pw-mobi="standard_iab_head1"
    id="standard_iab_head1"
    class="ad-content"
  >
    <!-- Ad Space -->
  </div>
</div>

<style>
  /* Defense 1: CSS Containment — outer ad container */
  .top-ad-container {
    width: 100%;
    height: 50px !important;
    max-height: 50px !important;
    background-color: #202020;
    display: flex;
    justify-content: center;
    align-items: center;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 10000;
    overflow: hidden !important;
    contain: strict;
  }

  /* Defense 1: CSS Containment — inner ad slot */
  .ad-content {
    width: 350px;
    height: 50px;
    max-height: 50px !important;
    overflow: hidden !important;
    position: relative;
    margin: 0 auto;
    padding: 0;
  }

  /* Defense 1: CSS Containment — trap any iframes/divs injected by the ad SDK */
  :global(#standard_iab_head1 iframe),
  :global(#standard_iab_head1 div),
  :global(#ad-container iframe) {
    max-height: 50px !important;
    max-width: 350px !important;
    overflow: hidden !important;
  }

  /* Hide on desktop screens */
  @media (min-width: 768px) {
    .top-ad-container {
      display: none;
    }
  }
</style>
