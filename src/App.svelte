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
    const categories = gameBoards[todaysDate.toString()] || [];
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
      <ResultGrid bind:guesses={guessHistory}></ResultGrid>
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
          <svg width="35" height="35" viewBox="0 0 35 35" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M34.4486 24.9847C34.6234 25.1604 34.762 25.3691 34.8567 25.599C34.9513 25.8288 35 26.0752 35 26.3241C35 26.573 34.9513 26.8194 34.8567 27.0492C34.762 27.2791 34.6234 27.4878 34.4486 27.6635L30.6989 31.4452C30.3467 31.8004 29.869 32 29.3709 32C28.8728 32 28.3951 31.8004 28.0429 31.4452C27.6907 31.09 27.4928 30.6082 27.4928 30.1058C27.4928 29.6035 27.6907 29.1217 28.0429 28.7665L28.5913 28.2134H28.2647C26.3749 28.2113 24.5127 27.7553 22.8323 26.8831C21.1519 26.0109 19.7016 24.7476 18.6015 23.1978L12.0896 13.9972C11.337 12.9365 10.3447 12.072 9.1949 11.4752C8.04508 10.8784 6.77081 10.5664 5.47765 10.5652H1.87484C1.3776 10.5652 0.900727 10.366 0.549127 10.0114C0.197527 9.65678 0 9.17582 0 8.67433C0 8.17284 0.197527 7.69189 0.549127 7.33728C0.900727 6.98267 1.3776 6.78346 1.87484 6.78346H5.47765C7.36751 6.78556 9.22969 7.24158 10.9101 8.11376C12.5905 8.98594 14.0408 10.2492 15.1409 11.799L21.6575 20.9997C22.4101 22.0603 23.4023 22.9248 24.5522 23.5217C25.702 24.1185 26.9763 24.4304 28.2694 24.4316H28.5913L28.0413 23.8786C27.6891 23.5233 27.4912 23.0415 27.4912 22.5392C27.4912 22.0368 27.6891 21.555 28.0413 21.1998C28.3935 20.8446 28.8712 20.645 29.3693 20.645C29.8674 20.645 30.3451 20.8446 30.6973 21.1998L34.4486 24.9847ZM19.5092 13.5418C19.8834 13.8718 20.3723 14.0385 20.8683 14.0051C21.3644 13.9717 21.8269 13.741 22.1543 13.3637C22.9169 12.4846 23.8571 11.7801 24.9118 11.2974C25.9664 10.8148 27.1112 10.5651 28.2694 10.5652H28.5913L28.0413 11.1183C27.6891 11.4735 27.4912 11.9553 27.4912 12.4577C27.4912 12.96 27.6891 13.4418 28.0413 13.797C28.3935 14.1523 28.8712 14.3518 29.3693 14.3518C29.8674 14.3518 30.3451 14.1523 30.6973 13.797L34.447 10.0153C34.6218 9.83961 34.7605 9.63087 34.8551 9.40103C34.9497 9.17119 34.9984 8.92478 34.9984 8.67591C34.9984 8.42704 34.9497 8.18063 34.8551 7.95079C34.7605 7.72095 34.6218 7.51221 34.447 7.33654L30.6973 3.55479C30.3451 3.19956 29.8674 3 29.3693 3C28.8712 3 28.3935 3.19956 28.0413 3.55479C27.6891 3.91001 27.4912 4.39179 27.4912 4.89416C27.4912 5.39652 27.6891 5.8783 28.0413 6.23353L28.5913 6.78346H28.2647C26.5716 6.78427 24.8983 7.15026 23.3569 7.85687C21.8156 8.56347 20.4419 9.59435 19.328 10.8804C19.0032 11.258 18.84 11.75 18.874 12.2488C18.9079 12.7475 19.1363 13.2124 19.5092 13.5418ZM14.2378 21.4551C13.8636 21.125 13.3748 20.9584 12.8787 20.9917C12.3827 21.0251 11.9201 21.2558 11.5927 21.6331C10.8301 22.5123 9.88997 23.2168 8.8353 23.6994C7.78062 24.1821 6.63582 24.4317 5.47765 24.4316H1.87484C1.3776 24.4316 0.900727 24.6309 0.549127 24.9855C0.197527 25.3401 0 25.821 0 26.3225C0 26.824 0.197527 27.305 0.549127 27.6596C0.900727 28.0142 1.3776 28.2134 1.87484 28.2134H5.47765C7.17075 28.2126 8.84411 27.8466 10.3855 27.14C11.9268 26.4334 13.3005 25.4025 14.4144 24.1165C14.7397 23.7394 14.9038 23.2478 14.8707 22.749C14.8376 22.2503 14.6101 21.7851 14.2378 21.4551Z" fill="white"/>
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
