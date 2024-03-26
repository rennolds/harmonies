<script>
    import { flip } from 'svelte/animate';
    import { writable } from 'svelte/store';
    import { fade, fly, slide, scale } from 'svelte/transition';
    import { onMount } from 'svelte';
    import ClearedCategory from './lib/ClearedCategory.svelte'
    import ResultGrid from './lib/ResultGrid.svelte'
    import gameBoards from "./static/data/gameboards.json";

    const stored = localStorage.$mistakeCount;
    export const mistakeCount = writable(Number(stored) || 0);
    mistakeCount.subscribe((value) => localStorage.$mistakeCount = value);

    console.log($mistakeCount);
    $mistakeCount = 0;


    //date stuff, see if this can be moved to another component
    function getEasternTimeDate() {
      const date = new Date();
      const easternTimeOffset = -4; // Eastern Time is UTC-4 during standard time
      const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
      const easternTime = new Date(utc + (3600000 * easternTimeOffset));
      return easternTime.toLocaleDateString('en-US', {timeZone: 'America/New_York'});
    } 

    let timeUntilMidnightET = 0;
    let timer = null;

    function updateTimer() {
      const now = new Date();
      const midnightET = new Date(now);
      midnightET.setUTCHours(4, 0, 0, 0); // 4 AM UTC = Midnight ET

      if (now > midnightET) {
        midnightET.setDate(midnightET.getDate() + 1); // Increment to next day
  }

  timeUntilMidnightET = midnightET - now;
    }

    function formatTime(milliseconds) {
      const totalSeconds = Math.floor(milliseconds / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    function startTimer() {
      timer = setInterval(updateTimer, 1000);
    }

    startTimer();
    // end date stuff

    const todaysDate = getEasternTimeDate();
    const categories = gameBoards[todaysDate.toString()]["categories"] || [];
    const src = gameBoards[todaysDate.toString()]["gameoverGif"] || "";
    const playlist = gameBoards[todaysDate.toString()]["playlist"] || "";
    const keys = Object.keys(gameBoards);
    const harmonyNumber = keys.indexOf(todaysDate) + 1; // Adding 1 to make it 1-based index

    const gameoverStore = writable({
      isOver: false,
      headerMessage: ''
    });

    const alertStore = writable({
      message: '',
      visible: false
    });

    function showAlert(message) {
      alertStore.set({
        message,
        visible: true
      });

      setTimeout(() => {
        alertStore.set({
          message: '',
          visible: false
        });
      }, 3000); 
    }

    let remainingElements = categories.map(item => item.elements).flat();
    let clearedCategories = [];
    let selectedElements = [];
    let guessHistory = [];
    let shake = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,0, 0, 0, 0];
    let hideOverlay = true;


    let playbackWidth = (5 + $mistakeCount * 20);
    if (playbackWidth > 80) {
      playbackWidth = 80;
    }
    console.log(playbackWidth);



    function shuffleElements() {
        let currentIndex = remainingElements.length, randomIndex;

        // While there remain elements to shuffle.
        while (currentIndex > 0) {
          // Pick a remaining element.
          randomIndex = Math.floor(Math.random() * currentIndex);
          currentIndex--;

          // And swap it with the current element.
          [remainingElements[currentIndex], remainingElements[randomIndex]] = [
            remainingElements[randomIndex], remainingElements[currentIndex]];
        }

        return remainingElements;
    } 
    remainingElements = shuffleElements(remainingElements);

    function countSimilarItems(list1, list2) {
        let count = 0;
        const map = new Map();
        
        // Count occurrences of items in list1
        for (const item of list1) {
            map.set(item, (map.get(item) || 0) + 1);
        }
        
        // Check occurrences of items in list2 and update count
        for (const item of list2) {
            if (map.has(item) && map.get(item) > 0) {
                count++;
                map.set(item, map.get(item) - 1);
            }
        }
        
        return count;
    }

    function removeElements() {
      remainingElements = remainingElements.filter(item => !selectedElements.includes(item));
    }

    function handleSubmit() {
      // check if selectedElements match any categories
      if (selectedElements.length != 4) {
        //do  nothing, not valid guess
        return
      }
      else {
        
        let guessHistoryFlattened = [];
        for (let i = 0; i < guessHistory.length; i++) {
          categories.map(item => item.elements).flat();
          const guess = guessHistory[i].map(entry => entry.guess);
          const commonItems = countSimilarItems(guess, selectedElements);
          if (commonItems == selectedElements.length) {
            showAlert("Already guessed!");
            return;
          }
        }

        let tempGuessHistory = [];
        selectedElements.forEach(element => {
          // Find the category that contains the current element
          const category = categories.find(cat => cat.elements.includes(element));
          // If category is found, add guess and color to guessHistory
          if (category) {
              tempGuessHistory.push({ guess: element, color: category.color });
          }
        });
        guessHistory.push(tempGuessHistory);
        guessHistory = guessHistory;

      }
      for (let i = 0; i < categories.length; i++) {
        const commonItems = countSimilarItems(selectedElements, categories[i].elements);
        // if found 4 items in common, a cleared category
        if (commonItems == 4) {
          // trigger animation or sound effect
          clearedCategories.push(categories[i]);
          clearedCategories = clearedCategories;

          setTimeout(swapElements(selectedElements), 300);

          remainingElements = remainingElements.filter(item => !selectedElements.includes(item)); 
          selectedElements = [];

          if (clearedCategories.length == 4) {
            setTimeout(() => {
              gameoverStore.set({
              isOver: true,
              headerMessage: "Incredible!",
              });
              toggleOverlay();
            }, 3250);
          }
          return;
        }
        if (commonItems == 3) {
          showAlert("One away...");
          break;
        }
      }

      // If we got here, we are dealing with a wrong guess.
      for (let i = 0; i < remainingElements.length; i++) {
        if (selectedElements.includes(remainingElements[i])) {
          shake[i] = true;
          shake = shake;
        }
      }

      setTimeout(() => {
          shake = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
      }, 1000);

      $mistakeCount++;
      if ($mistakeCount == 4) {
        playbackWidth = 80;
      }
      else {
        playbackWidth += 20;
      }

      if ($mistakeCount == 4) {
        //reveal categories not found
        setTimeout(() => {
          const remainingCategories = categories.filter(category => !clearedCategories.includes(category));
          remainingCategories.forEach((category) => {
            swapElements(category.elements);
            clearedCategories.push(category);
            clearedCategories = clearedCategories;
            remainingElements = remainingElements.filter(item => !category.elements.includes(item));
          });
        }, 1000);

        setTimeout(() => {
            gameoverStore.set({
            isOver: true,
            headerMessage: "Better luck tmr...",
          });
            toggleOverlay();
        }, 4000);
      }
    }

    function toggleSelection(element) {
      const index = selectedElements.indexOf(element);
      if (index > -1) {
        selectedElements.splice(index, 1); // Remove the element if it's already selected
        selectedElements = selectedElements;
        } else if (selectedElements.length < 4) {
          selectedElements.push(element); // Add the element if less than 4 are selected
          selectedElements = selectedElements;
      }
    }

    function swapElements(elementsToSwap) {
      // remainingElements and selectedElements, selectedElements to the top
      elementsToSwap.forEach((element) => {
        let index;
        for (let i = 0; i < remainingElements.length; i++) {
            if (element == remainingElements[i]) {
                index = i;
            }
        }
        const temp = remainingElements[0];
        remainingElements[0] = element;
        remainingElements[index] = temp;
        remainingElements = remainingElements;
      });
    }

    function deselect() {
      selectedElements = [];
    }

    function toggleOverlay() {
      if (hideOverlay) {
        hideOverlay = false;
      }
      else {
        hideOverlay = true;
      }
    }

    function shareResult() {
      const emoji_mapping = {
        "#CBff70": "🟩",
        "#FAA3FF": "🟪",
        "#78DAF9": "🟦",
        "#FFBC21": "🟧"
      }

      var header = "harmonies #" + harmonyNumber + "🎧\n\n";
      
      let grid = '';

      for (let i = 0; i < guessHistory.length; i++) {
        const block_one = emoji_mapping[guessHistory[i][0].color];
        const block_two = emoji_mapping[guessHistory[i][1].color];
        const block_three = emoji_mapping[guessHistory[i][2].color];
        const block_four = emoji_mapping[guessHistory[i][3].color];
        const row = block_one + block_two + block_three + block_four;
        grid = grid + row + "\n";
      }

      const result = header + grid + "\n" + "harmonies.io";

      if (navigator.share) { 
        navigator.share({
          text: result
        }).then(() => {
          console.log('Thanks for sharing!');
        })
        .catch(console.error);
        } else {
          navigator.clipboard.writeText(result)
          .then(() => { console.log('copied'); })
          .catch((error) => { alert(`Copy failed! ${error}`) })
      }

    }

  </script>

  <main>
    <div class="container">
    {#if !hideOverlay}
    <div transition:slide class="gameover-overlay">
      <button class="exit-btn" on:click={toggleOverlay}>
        <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g id="ph:x">
          <path id="Vector" d="M20.8878 19.7376C20.9633 19.8131 21.0232 19.9027 21.064 20.0014C21.1049 20.1 21.1259 20.2057 21.1259 20.3125C21.1259 20.4192 21.1049 20.5249 21.064 20.6236C21.0232 20.7222 20.9633 20.8118 20.8878 20.8873C20.8123 20.9628 20.7227 21.0227 20.6241 21.0635C20.5254 21.1044 20.4197 21.1254 20.313 21.1254C20.2062 21.1254 20.1005 21.1044 20.0019 21.0635C19.9032 21.0227 19.8136 20.9628 19.7381 20.8873L13.0005 14.1486L6.2628 20.8873C6.11034 21.0398 5.90356 21.1254 5.68795 21.1254C5.47234 21.1254 5.26557 21.0398 5.11311 20.8873C4.96065 20.7349 4.875 20.5281 4.875 20.3125C4.875 20.0969 4.96065 19.8901 5.11311 19.7376L11.8518 13L5.11311 6.26231C4.96065 6.10985 4.875 5.90307 4.875 5.68746C4.875 5.47186 4.96065 5.26508 5.11311 5.11262C5.26557 4.96016 5.47234 4.87451 5.68795 4.87451C5.90356 4.87451 6.11034 4.96016 6.2628 5.11262L13.0005 11.8513L19.7381 5.11262C19.8906 4.96016 20.0973 4.87451 20.313 4.87451C20.5286 4.87451 20.7353 4.96016 20.8878 5.11262C21.0403 5.26508 21.1259 5.47186 21.1259 5.68746C21.1259 5.90307 21.0403 6.10985 20.8878 6.26231L14.1491 13L20.8878 19.7376Z" fill="black"/>
          </g>
          </svg>            
      </button>
      <h1>{$gameoverStore.headerMessage}</h1>
      <h2>Harmonies #1</h2>
        <div out:scale class="gameover-gif"><img {src} alt="Game over gif"></div>
        <!-- <ResultGrid bind:guesses={guessHistory}></ResultGrid> -->
      <h2>Next Harmony</h2>
      <p class="timer">{formatTime(timeUntilMidnightET)}</p>

      <button on:click={shareResult} style="background-color: #000;" class="results-button">SHARE RESULT</button>
      <a href="https://spotle.io" target="_blank"><button style="background-color: #1DB954;" class="results-button">PLAY SPOTLE</button></a>
    </div>
    {/if}

    <div class="header">
      <div class="logo-container">
        <h1>harmonies.</h1>
      </div>
      <div class="header-button-container">

      </div>
    </div>
    <!-- <h1>harmonies.</h1> -->
    <div class="alert-message-container">
      {#if $alertStore.message}
        <h2 transition:fade class="alert">{ $alertStore.message }</h2>
      {/if}
    </div>

    <div class="grid-container">
      {#each clearedCategories as category}
        <ClearedCategory category={category}></ClearedCategory>
      {/each}
      {#each remainingElements as element, i (element)}
          <div animate:flip on:click={() => toggleSelection(element)} class="grid-item {selectedElements.includes(element) ? 'selected' : ''} {shake[i] ? 'shake' : ''}"> {element} </div>
      {/each}
    </div>

    <div class="mistakes-remaining-container">
      <div class="mistakes-remaining-text-container">
        <div class="mistakes-remaining-text">mistakes remaining:&nbsp;</div>
        {#key $mistakeCount} <div in:scale={{duration: 1000, opacity: 100}} class="mistakes-remaining-number">{4-$mistakeCount}</div>{/key}
      </div>
      <div class="mistakes-playback-container">
        <div class="left-playback-number">{$mistakeCount}:05</div>
        <div class="background"></div>
        <div style="width: {playbackWidth}%;" class="foreground"></div>
        <div class="right-playback-number">{4-$mistakeCount}:00</div>
      </div>
    </div>

    <div class="play-button-container">
      <div class="button-container">
        <button class="play-button left-btn" on:click={shuffleElements(remainingElements)}>
          <svg width="32" height="24" viewBox="0 0 32 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M30.0613 17.9386C30.2011 18.078 30.312 18.2436 30.3878 18.4259C30.4635 18.6082 30.5024 18.8037 30.5024 19.0011C30.5024 19.1986 30.4635 19.394 30.3878 19.5764C30.312 19.7587 30.2011 19.9243 30.0613 20.0636L27.0613 23.0636C26.7795 23.3454 26.3973 23.5037 25.9988 23.5037C25.6002 23.5037 25.218 23.3454 24.9363 23.0636C24.6545 22.7818 24.4961 22.3997 24.4961 22.0011C24.4961 21.6026 24.6545 21.2204 24.9363 20.9386L25.375 20.4999H25.1138C23.6017 20.4982 22.1119 20.1365 20.7674 19.4446C19.423 18.7527 18.2627 17.7506 17.3825 16.5211L12.1725 9.22239C11.5704 8.38101 10.7765 7.6952 9.85656 7.22176C8.93662 6.74831 7.91712 6.50085 6.8825 6.49989H4C3.60218 6.49989 3.22064 6.34185 2.93934 6.06055C2.65804 5.77924 2.5 5.39771 2.5 4.99989C2.5 4.60206 2.65804 4.22053 2.93934 3.93923C3.22064 3.65792 3.60218 3.49989 4 3.49989H6.8825C8.39452 3.50156 9.8844 3.86331 11.2288 4.55519C12.5733 5.24708 13.7336 6.24921 14.6138 7.47864L19.8275 14.7774C20.4296 15.6188 21.2235 16.3046 22.1434 16.778C23.0634 17.2515 24.0829 17.4989 25.1175 17.4999H25.375L24.935 17.0611C24.6532 16.7793 24.4949 16.3972 24.4949 15.9986C24.4949 15.6001 24.6532 15.2179 24.935 14.9361C25.2168 14.6543 25.599 14.496 25.9975 14.496C26.396 14.496 26.7782 14.6543 27.06 14.9361L30.0613 17.9386ZM18.1087 8.86114C18.4081 9.12297 18.7993 9.25519 19.1961 9.2287C19.593 9.20221 19.9631 9.01919 20.225 8.71989C20.8351 8.0225 21.5873 7.46363 22.4311 7.08075C23.275 6.69786 24.1909 6.49981 25.1175 6.49989H25.375L24.935 6.93864C24.6532 7.22043 24.4949 7.60262 24.4949 8.00114C24.4949 8.39965 24.6532 8.78184 24.935 9.06364C25.2168 9.34543 25.599 9.50374 25.9975 9.50374C26.396 9.50374 26.7782 9.34543 27.06 9.06364L30.06 6.06364C30.1998 5.92428 30.3108 5.75869 30.3865 5.57636C30.4622 5.39404 30.5012 5.19856 30.5012 5.00114C30.5012 4.80372 30.4622 4.60824 30.3865 4.42591C30.3108 4.24358 30.1998 4.07799 30.06 3.93864L27.06 0.938637C26.7782 0.656844 26.396 0.498535 25.9975 0.498535C25.599 0.498535 25.2168 0.656845 24.935 0.938637C24.6532 1.22043 24.4949 1.60262 24.4949 2.00114C24.4949 2.39965 24.6532 2.78184 24.935 3.06364L25.375 3.49989H25.1138C23.7591 3.50054 22.4203 3.79087 21.1872 4.3514C19.954 4.91194 18.8549 5.72972 17.9638 6.74989C17.7039 7.04949 17.5733 7.43979 17.6005 7.83544C17.6277 8.23109 17.8104 8.59987 18.1087 8.86114ZM13.8912 15.1386C13.5919 14.8768 13.2007 14.7446 12.8039 14.7711C12.407 14.7976 12.0369 14.9806 11.775 15.2799C11.1649 15.9773 10.4127 16.5361 9.56885 16.919C8.72504 17.3019 7.80912 17.5 6.8825 17.4999H4C3.60218 17.4999 3.22064 17.6579 2.93934 17.9392C2.65804 18.2205 2.5 18.6021 2.5 18.9999C2.5 19.3977 2.65804 19.7792 2.93934 20.0605C3.22064 20.3419 3.60218 20.4999 4 20.4999H6.8825C8.2371 20.4992 9.5759 20.2089 10.8091 19.6484C12.0423 19.0878 13.1413 18.2701 14.0325 17.2499C14.2928 16.9508 14.424 16.5607 14.3976 16.1651C14.3711 15.7695 14.1891 15.4004 13.8912 15.1386Z" fill="white"/>
          </svg>                        
        </button>
        <h3>Shuffle</h3>
      </div>
      <div class="button-container">
        <div class="play-container">
          <div class="skip-btns">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g id="bi:skip-end-fill">
              <path id="Vector" d="M6.125 21C6.125 21.2321 6.21719 21.4546 6.38128 21.6187C6.54537 21.7828 6.76794 21.875 7 21.875C7.23206 21.875 7.45463 21.7828 7.61872 21.6187C7.78281 21.4546 7.875 21.2321 7.875 21V15.316L18.8423 21.679C19.7873 22.225 21 21.5635 21 20.461V7.539C21 6.4365 19.789 5.7715 18.8423 6.31925L7.875 12.6822V7C7.875 6.76794 7.78281 6.54537 7.61872 6.38128C7.45463 6.21719 7.23206 6.125 7 6.125C6.76794 6.125 6.54537 6.21719 6.38128 6.38128C6.21719 6.54537 6.125 6.76794 6.125 7L6.125 21Z" fill="#969696"/>
              </g>
              </svg>                        
          </div>
          <button class="play-button" on:click={handleSubmit}> 
            <svg width="55" height="55" viewBox="0 0 55 55" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g id="Mask group">
              <mask id="mask0_29_3989" style="mask-type:luminance" maskUnits="userSpaceOnUse" x="0" y="0" width="55" height="55">
              <g id="Group">
              <g id="Group_2">
              <path id="Vector" d="M27.5 53C41.5836 53 53 41.5836 53 27.5C53 13.4164 41.5836 2 27.5 2C13.4164 2 2 13.4164 2 27.5C2 41.5836 13.4164 53 27.5 53Z" fill="white" stroke="white" stroke-width="4" stroke-linejoin="round"/>
              <path id="Vector_2" d="M22.3999 27.5002V18.667L30.0499 23.0836L37.6999 27.5002L30.0499 31.9168L22.3999 36.3334V27.5002Z" fill="black" stroke="black" stroke-width="4" stroke-linejoin="round"/>
              </g>
              </g>
              </mask>
              <g mask="url(#mask0_29_3989)">
              <path id="Vector_3" d="M-3.1001 -3.1001H58.0999V58.0999H-3.1001V-3.1001Z" fill="white"/>
              </g>
              </g>
              </svg>            
          </button>
          <div class="skip-btns">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g id="bi:skip-end-fill">
              <path id="Vector" d="M21.875 7C21.875 6.76794 21.7828 6.54538 21.6187 6.38128C21.4546 6.21719 21.2321 6.125 21 6.125C20.7679 6.125 20.5454 6.21719 20.3813 6.38128C20.2172 6.54538 20.125 6.76794 20.125 7V12.684L9.15775 6.321C8.21275 5.775 7 6.4365 7 7.539V20.461C7 21.5635 8.211 22.2285 9.15775 21.6807L20.125 15.3178V21C20.125 21.2321 20.2172 21.4546 20.3813 21.6187C20.5454 21.7828 20.7679 21.875 21 21.875C21.2321 21.875 21.4546 21.7828 21.6187 21.6187C21.7828 21.4546 21.875 21.2321 21.875 21V7Z" fill="#969696"/>
              </g>
            </svg>
          </div>
        </div>
        <h3>Submit</h3>
      </div>
      <div class="button-container right-btn">
        <button class="play-button" on:click={deselect}>
          <svg width="35" height="35" viewBox="0 0 35 35" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g id="ic:round-replay">
            <path id="Vector" d="M17.4998 7.29185V3.2231C17.4998 2.56685 16.7123 2.24602 16.2602 2.71269L10.7185 8.23977C10.4268 8.53144 10.4268 8.98352 10.7185 9.27519L16.2456 14.8023C16.7123 15.2544 17.4998 14.9335 17.4998 14.2773V10.2085C22.9393 10.2085 27.2414 15.196 26.0456 20.8398C25.3602 24.1502 22.6768 26.8189 19.381 27.5044C14.1748 28.5981 9.53726 25.0252 8.83726 20.1981C8.78526 19.8553 8.61286 19.5423 8.35095 19.3151C8.08904 19.088 7.75477 18.9615 7.40809 18.9585C6.53309 18.9585 5.83309 19.7314 5.94976 20.6064C6.85392 27.0085 12.9498 31.7481 19.8477 30.4064C24.3977 29.5169 28.0581 25.8564 28.9477 21.3064C30.3914 13.8252 24.7039 7.29185 17.4998 7.29185Z" fill="white"/>
            </g>
            </svg>            
        </button>
        <h3>Clear</h3>
      </div>
  </div>

  <div class="footer">
    <p> made by <a>tommy rennolds</a> & <a>paul pursifull<a/></p>
  </div>

</div>
  </main>

  <style>

    .container {
      display: flex;
      flex-direction: column;
      height: 100vh;
      justify-content: flex-start;
    }

    .gameover-overlay {
      position: absolute;
      top: 50%; /* Position at the vertical center */
      left: 50%; /* Position at the horizontal center */
      transform: translate(-50%, -50%); /* Center the element */
      background-color: white; /* Semi-transparent black overlay */
      width: 300px; /* Cover the entire parent */
      height: auto; /* Let height adjust based on content */
      max-height: calc(100vh - 20px); /* Limit height to viewport height */
      overflow-y: auto; /* Enable vertical scrolling if content overflows */
      z-index: 9999; /* Ensure the overlay appears on top */
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 5px; /* Add padding for spacing */
      border-radius: 10px;
    }

    .gameover-gif img {
      width: 250px;
      height: 250px;
      border-radius: 5px;
    }

    .gameover-overlay h1 {
      color: #000;
        font-size: 24px;
        font-weight: 600;
        margin: 10px 0; /* Adjust margin for spacing between elements */
        margin-top: -10px;
        text-align: center;
    }

    .gameover-overlay h2,
    .timer {
        color: #000;
        font-size: 20px;
        font-weight: 500;
        margin: 10px 0; /* Adjust margin for spacing between elements */
        text-align: center;
    }

    .timer {
      margin-top: -7.5px;
      margin-bottom: 15px;
    }

    /* .gameover-overlay h1 {
      color: #000;
      font-size: 24px;
      font-style: normal;
      font-weight: 700;
      line-height: normal;
      margin-top: -10px;
    }

    .gameover-overlay h2 {
      color: #000;
      font-size: 20px;
      font-style: normal;
      font-weight: 500;
      line-height: normal;
    }

    .timer {
      color: #000;
      text-align: center;
      font-size: 18px;
      font-style: normal;
      font-weight: 500;
      line-height: normal;
    } */

    .results-button {
        height: 34px;
        width: 130px;
        font-size: 15px;
        text-align: center;
        line-height: normal;
        color: #fff;
        border-style: none;
        width: 176px;
        height: 52px;
        margin-bottom: 10px;
        border-radius: 100px;
        cursor: pointer;
    }

    .exit-btn {
      align-self: flex-end;
      background: none;
      border-style: none;
      padding-left: 2px;
    }

    .exit-btn:hover {
      cursor: pointer;
    }

    .logo-container {
      display: flex;
      justify-content: flex-start;
      align-items: center; 
    }

    .alert-message-container {
      position: absolute;
      top: 15%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 9999; 
      background-color: #D9D9D9;
      color: black;
      border-radius: 5px;

    }

    .grid-container {
      display: grid;
      align-items: center;
      grid-template-rows: repeat(4, minmax(0, 1fr));
      grid-template-columns: repeat(4, minmax(0, 1fr));
      grid-gap: 11px;
      max-width: 400px;
      font-weight: bold;
      padding: 2px;
      text-transform: uppercase;
      margin-bottom: 3px;
    }

    .grid-item {
      border-style: none;
      border-radius: 8px;
      color: black;
      background-color: #fff;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 6vw;
      width: 6vw;
      text-align: center;
      cursor: pointer; /* Optional: Changes the cursor to indicate clickable items */
      transition: background-color 0.4s, border-color 0.3s, transform 1s;
      font-size: .9vw;
      line-height: 20px;
      overflow: hidden; /* Hide overflowing content */
    }

    @media only screen and (max-width: 600px)  { /* smartphones, iPhone, portrait 480x320 phones */ 
      .grid-item {
        font-size: 3.25vw;
        height: 20vw;
        width: 20vw;
        padding-left: 2px;
      }

      .grid-container {
        max-width: 92vw;
      }
    }

    @media only screen and (max-width: 1200px) and (min-width: 601px) {
      .grid-item {
        font-size: 1.5vw;
        height: 90px;
        width: 90px;
        padding-left: 2px;
      }
    }

    .selected {
      color: #fff;
      background-color: #505050;
    }

    .grid-item:hover {
      background-color: #b7b7b7;
      transition: background-color 0.2s;
    }

    .selected:hover {
      color: #fff;
      background-color: #505050;
    }

    .play-button {
      background-color: inherit;
      border-style: none; 
      cursor: pointer;
      margin-right: 18px;
      margin-left: 18px;
    }

    .play-button:hover {
      transform: scale(1.1) perspective(1px);
    }

    .play-button-container {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .play-container {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .mistakes-remaining-container {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      margin-top: 15px;
      margin-bottom: 20px;
    }

    .mistakes-remaining-text-container {
      display: flex;
      align-items: center; /* Optional: Align items vertically center */
    }

    .mistakes-remaining-text {
      margin-bottom: 5px;
      font-size: 14px;
    }

    .mistakes-remaining-number {
      margin-bottom: 5px;
      font-size: 14px;
    }

    .mistakes-playback-container {
      position: relative;
      width: 100%;
      height: 10px; /* Adjust height as needed */
      border-radius: 10px; /* Rounded corners */
      overflow: hidden; /* Hide overflow */
      display: flex; /* Add this line */
      align-items: center; /* Add this line */
    }

    .left-playback-number,
    .right-playback-number {
      color: #fff; /* Color of the playback numbers */
      font-size: 11px; /* Adjust font size as needed */
      padding: 0 5px; /* Padding around the playback numbers */
      position: absolute;
      top: 44%;
      transform: translateY(-50%);
      overflow: visible;
      
    }

    .left-playback-number {
      left: 0;
    }

    .right-playback-number {
      right: 0;
      overflow: visible;
    }

    .background {
      position: absolute;
      top: 20%;
      left: 10%;
      width: 80%;
      height: 45%;
      background-color: #505050; /* Background color of the progress bar */
      border-radius: 10px;
    }

    .foreground {
      position: absolute;
      top: 20%;
      left: 10%;
      height: 45%;
      background-color: #fff; /* Color of the progress bar */
      border-radius: 5px;
      width: 20%;
      -webkit-transition: width 1s ease-in-out;
      -moz-transition: width 1s ease-in-out;
      -o-transition: width 1s ease-in-out;
      transition: width 1s ease-in-out;
    }


    .button-container h3 {
      color: #BA81C2;
      font-size: 10px;
      margin: auto;
      text-transform: lowercase;
    }

    .footer {
      margin-top: auto; /* Pushes the footer to the bottom */
      display: flex;
      align-items: flex-end; /* Aligns items to the bottom */
      color: #fff;
      font-size: 16px;
      font-style: normal;
      font-weight: 500;
      line-height: normal;
      position: fixed;
      bottom: 0; /* Align to the bottom */
      width: 100%; /* Full width */
    }

    .footer a {
      color: #A18CD1;
      text-decoration: underline;

    }

    @keyframes shake {
      0% { transform: translate(0, 0); }
      10%, 90% { transform: translate(-4px, 0); }
      20%, 80% { transform: translate(4px, 0); }
      30%, 50%, 70% { transform: translate(-4px, 0); }
      40%, 60% { transform: translate(4px, 0); }
      100% { transform: translate(0, 0); }
    }

    .shake {
      animation: shake 0.5s ease-in-out;
    }
    @keyframes shake-guesses {
      0% { transform: translate(0, 0); }
      10%, 90% { transform: translate(0, -1px); }
      20%, 80% { transform: translate(0, 1.25px); }
      30%, 50%, 70% { transform: translate(0, -1px); }
      40%, 60% { transform: translate(0px, 1.25px); }
      100% { transform: translate(0, 0); }
    }

    .shake-guesses {
      animation: shake 1s ease-in-out;
    }
</style>
