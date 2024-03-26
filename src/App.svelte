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
        <h1>Harmonies.</h1>
      </div>
      <div class="header-button-container">
        <a href="https://spotle.io">
          <svg width="97" height="26" viewBox="0 0 97 26" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M78.8204 1.68867C78.8854 0.763811 79.4189 0.284668 80.4199 0.284668H87.3517C88.3527 0.284668 88.875 0.763811 88.9405 1.68867H78.8204ZM76.8941 4.70281C77.0575 3.71249 77.5255 3.16835 78.6134 3.16835H89.0709C90.1592 3.16835 90.6267 3.71249 90.7902 4.70281H76.8941ZM77.7758 25.7155C75.5124 25.7155 74.3586 24.5947 74.3586 22.342V9.80624C74.3586 7.56467 75.5124 6.4332 77.7758 6.4332H90.2242C92.4987 6.4332 93.6414 7.56467 93.6414 9.80624V22.342C93.6414 24.5835 92.5094 25.7155 90.5506 25.7155H77.7758ZM86.99 14.2235C87.4631 14.0953 87.6107 13.9969 87.6107 13.4253V11.4944C87.6107 11.1202 87.4826 10.9526 86.9607 11.0807L84.0738 11.7999C83.591 11.9183 83.4828 12.0167 83.4828 12.598V17.0412C83.4828 17.4748 83.4433 17.5538 82.9507 17.6912L82.0444 17.928C81.1479 18.1648 80.3892 18.6964 80.3892 19.6621C80.3892 20.4992 81.0198 21.1102 82.0147 21.1102C83.4238 21.1102 84.3793 20.0953 84.3793 18.6667V15.2876C84.3793 14.9231 84.4582 14.8247 84.6848 14.775L86.99 14.2235Z" fill="white"/>
            <path d="M31.3173 4.67188V3.72727H36.9458V4.67188H34.6767V11H33.5829V4.67188H31.3173ZM39.611 11.1101C39.0996 11.1101 38.6533 10.9929 38.2722 10.7585C37.891 10.5241 37.5951 10.1963 37.3844 9.77486C37.1737 9.35346 37.0684 8.86103 37.0684 8.29759C37.0684 7.73177 37.1737 7.23698 37.3844 6.81321C37.5951 6.38944 37.891 6.06037 38.2722 5.82599C38.6533 5.59162 39.0996 5.47443 39.611 5.47443C40.1223 5.47443 40.5686 5.59162 40.9498 5.82599C41.3309 6.06037 41.6268 6.38944 41.8375 6.81321C42.0482 7.23698 42.1536 7.73177 42.1536 8.29759C42.1536 8.86103 42.0482 9.35346 41.8375 9.77486C41.6268 10.1963 41.3309 10.5241 40.9498 10.7585C40.5686 10.9929 40.1223 11.1101 39.611 11.1101ZM39.6145 10.2188C39.946 10.2188 40.2206 10.1312 40.4384 9.95597C40.6562 9.78078 40.8172 9.54759 40.9213 9.25639C41.0279 8.9652 41.0811 8.64441 41.0811 8.29403C41.0811 7.94602 41.0279 7.62642 40.9213 7.33523C40.8172 7.04167 40.6562 6.80611 40.4384 6.62855C40.2206 6.45099 39.946 6.36222 39.6145 6.36222C39.2807 6.36222 39.0037 6.45099 38.7836 6.62855C38.5658 6.80611 38.4036 7.04167 38.2971 7.33523C38.1929 7.62642 38.1408 7.94602 38.1408 8.29403C38.1408 8.64441 38.1929 8.9652 38.2971 9.25639C38.4036 9.54759 38.5658 9.78078 38.7836 9.95597C39.0037 10.1312 39.2807 10.2188 39.6145 10.2188ZM45.3807 11.1065C44.9403 11.1065 44.5473 10.9941 44.2017 10.7692C43.8584 10.5419 43.5885 10.2187 43.392 9.79972C43.1979 9.37831 43.1009 8.87287 43.1009 8.28338C43.1009 7.69389 43.1991 7.18963 43.3956 6.7706C43.5945 6.35156 43.8667 6.03078 44.2124 5.80824C44.558 5.5857 44.9498 5.47443 45.3878 5.47443C45.7263 5.47443 45.9986 5.53125 46.2045 5.64489C46.4129 5.75616 46.5739 5.88636 46.6875 6.03551C46.8035 6.18466 46.8935 6.31605 46.9574 6.42969H47.0213V3.72727H48.0831V11H47.0462V10.1513H46.9574C46.8935 10.2673 46.8011 10.3999 46.6804 10.549C46.562 10.6982 46.3987 10.8284 46.1903 10.9396C45.982 11.0509 45.7121 11.1065 45.3807 11.1065ZM45.6151 10.201C45.9205 10.201 46.1785 10.1205 46.3892 9.95952C46.6023 9.79616 46.7633 9.57008 46.8722 9.28125C46.9834 8.99242 47.0391 8.65625 47.0391 8.27273C47.0391 7.89394 46.9846 7.5625 46.8757 7.27841C46.7668 6.99432 46.607 6.77296 46.3963 6.61435C46.1856 6.45573 45.9252 6.37642 45.6151 6.37642C45.2955 6.37642 45.0291 6.45928 44.8161 6.625C44.603 6.79072 44.442 7.01681 44.3331 7.30327C44.2266 7.58973 44.1733 7.91288 44.1733 8.27273C44.1733 8.63731 44.2277 8.9652 44.3366 9.25639C44.4455 9.54759 44.6065 9.77841 44.8196 9.94886C45.035 10.117 45.3002 10.201 45.6151 10.201ZM51.1859 11.1207C50.8403 11.1207 50.5278 11.0568 50.2484 10.929C49.969 10.7988 49.7477 10.6106 49.5843 10.3643C49.4234 10.1181 49.3429 9.81629 49.3429 9.45881C49.3429 9.15104 49.402 8.89773 49.5204 8.69886C49.6388 8.5 49.7986 8.34257 49.9998 8.22656C50.2011 8.11056 50.426 8.02296 50.6745 7.96378C50.9231 7.90459 51.1764 7.85961 51.4345 7.82884C51.7612 7.79096 52.0263 7.76018 52.2299 7.73651C52.4335 7.71046 52.5815 7.66903 52.6738 7.61222C52.7662 7.5554 52.8123 7.46307 52.8123 7.33523V7.31037C52.8123 7.00024 52.7247 6.75994 52.5495 6.58949C52.3767 6.41903 52.1187 6.33381 51.7754 6.33381C51.4179 6.33381 51.1362 6.41312 50.9302 6.57173C50.7266 6.72798 50.5858 6.90199 50.5076 7.09375L49.5098 6.86648C49.6281 6.53504 49.801 6.26752 50.0282 6.06392C50.2579 5.85795 50.5218 5.70881 50.8201 5.61648C51.1184 5.52178 51.4321 5.47443 51.7612 5.47443C51.979 5.47443 52.2098 5.50047 52.4537 5.55256C52.6999 5.60227 52.9295 5.6946 53.1426 5.82955C53.358 5.96449 53.5344 6.15743 53.6717 6.40838C53.809 6.65696 53.8777 6.98011 53.8777 7.37784V11H52.8407V10.2543H52.7981C52.7295 10.3916 52.6265 10.5265 52.4892 10.6591C52.3519 10.7917 52.1755 10.9018 51.96 10.9893C51.7446 11.0769 51.4866 11.1207 51.1859 11.1207ZM51.4167 10.2685C51.7103 10.2685 51.9612 10.2105 52.1696 10.0945C52.3803 9.97846 52.5401 9.82694 52.649 9.63991C52.7602 9.45052 52.8159 9.24811 52.8159 9.03267V8.32955C52.778 8.36742 52.7046 8.40294 52.5957 8.43608C52.4892 8.46686 52.3672 8.49408 52.2299 8.51776C52.0926 8.53906 51.9589 8.55919 51.8287 8.57812C51.6984 8.5947 51.5895 8.6089 51.502 8.62074C51.296 8.64678 51.1078 8.69058 50.9373 8.75213C50.7692 8.81368 50.6343 8.90246 50.5325 9.01847C50.4331 9.1321 50.3833 9.28362 50.3833 9.47301C50.3833 9.7358 50.4804 9.93466 50.6745 10.0696C50.8687 10.2022 51.1161 10.2685 51.4167 10.2685ZM55.7678 13.0455C55.6091 13.0455 55.4647 13.0324 55.3345 13.0064C55.2043 12.9827 55.1072 12.9567 55.0433 12.9283L55.299 12.0582C55.4931 12.1103 55.666 12.1328 55.8175 12.1257C55.969 12.1186 56.1027 12.0618 56.2188 11.9553C56.3371 11.8487 56.4413 11.6747 56.5312 11.4332L56.6626 11.071L54.6669 5.54545H55.8033L57.1847 9.77841H57.2415L58.6229 5.54545H59.7628L57.5149 11.728C57.4107 12.0121 57.2782 12.2524 57.1172 12.4489C56.9562 12.6477 56.7644 12.7969 56.5419 12.8963C56.3194 12.9957 56.0613 13.0455 55.7678 13.0455ZM62.0151 3.72727V4.40909C62.0151 4.61032 61.9772 4.82221 61.9015 5.04474C61.8281 5.26491 61.7239 5.4768 61.589 5.6804C61.454 5.884 61.2954 6.05919 61.1131 6.20597L60.5875 5.82955C60.7272 5.62595 60.848 5.40933 60.9498 5.17969C61.0539 4.95005 61.106 4.69673 61.106 4.41974V3.72727H62.0151ZM66.4398 6.87713L65.4775 7.04759C65.4372 6.92448 65.3733 6.80729 65.2857 6.69602C65.2005 6.58475 65.0845 6.49361 64.9377 6.42259C64.7909 6.35156 64.6074 6.31605 64.3873 6.31605C64.0866 6.31605 63.8356 6.38352 63.6344 6.51847C63.4332 6.65104 63.3326 6.82268 63.3326 7.03338C63.3326 7.21567 63.4 7.36245 63.535 7.47372C63.6699 7.58499 63.8877 7.67614 64.1884 7.74716L65.0549 7.94602C65.5568 8.06203 65.9308 8.24077 66.177 8.48224C66.4232 8.72372 66.5463 9.03741 66.5463 9.4233C66.5463 9.75 66.4516 10.0412 66.2623 10.2969C66.0752 10.5502 65.8136 10.7491 65.4775 10.8935C65.1436 11.0379 64.7566 11.1101 64.3162 11.1101C63.7054 11.1101 63.2071 10.9799 62.8212 10.7195C62.4353 10.4567 62.1986 10.0838 62.111 9.60085L63.1373 9.4446C63.2012 9.71212 63.3326 9.91454 63.5314 10.0518C63.7303 10.1868 63.9895 10.2543 64.3091 10.2543C64.6571 10.2543 64.9353 10.1821 65.1436 10.0376C65.352 9.89086 65.4561 9.71212 65.4561 9.50142C65.4561 9.33097 65.3922 9.18774 65.2644 9.07173C65.1389 8.95573 64.946 8.86813 64.6855 8.80895L63.7623 8.60653C63.2533 8.49053 62.8768 8.30587 62.633 8.05256C62.3915 7.79924 62.2708 7.47846 62.2708 7.0902C62.2708 6.76823 62.3607 6.48651 62.5407 6.24503C62.7206 6.00355 62.9692 5.81534 63.2864 5.6804C63.6036 5.54309 63.967 5.47443 64.3766 5.47443C64.9661 5.47443 65.4301 5.60227 65.7686 5.85795C66.1072 6.11127 66.3309 6.45099 66.4398 6.87713ZM33.6877 23V15.7273H36.28C36.8458 15.7273 37.3146 15.8303 37.6863 16.0362C38.0579 16.2422 38.3361 16.5239 38.5208 16.8814C38.7054 17.2365 38.7978 17.6366 38.7978 18.0817C38.7978 18.5291 38.7042 18.9316 38.5172 19.2891C38.3326 19.6442 38.0532 19.9259 37.6792 20.1342C37.3075 20.3402 36.8399 20.4432 36.2765 20.4432H34.4938V19.5128H36.177C36.5345 19.5128 36.8245 19.4512 37.0471 19.3281C37.2696 19.2027 37.4329 19.0322 37.5371 18.8168C37.6413 18.6013 37.6934 18.3563 37.6934 18.0817C37.6934 17.8071 37.6413 17.5632 37.5371 17.3501C37.4329 17.1371 37.2684 16.9702 37.0435 16.8494C36.821 16.7287 36.5274 16.6683 36.1628 16.6683H34.785V23H33.6877ZM41.0607 15.7273V23H39.9989V15.7273H41.0607ZM44.0765 23.1207C43.7309 23.1207 43.4184 23.0568 43.139 22.929C42.8597 22.7988 42.6383 22.6106 42.475 22.3643C42.314 22.1181 42.2335 21.8163 42.2335 21.4588C42.2335 21.151 42.2927 20.8977 42.411 20.6989C42.5294 20.5 42.6892 20.3426 42.8904 20.2266C43.0917 20.1106 43.3166 20.023 43.5652 19.9638C43.8137 19.9046 44.0671 19.8596 44.3251 19.8288C44.6518 19.791 44.917 19.7602 45.1206 19.7365C45.3242 19.7105 45.4721 19.669 45.5645 19.6122C45.6568 19.5554 45.7029 19.4631 45.7029 19.3352V19.3104C45.7029 19.0002 45.6154 18.7599 45.4402 18.5895C45.2673 18.419 45.0093 18.3338 44.666 18.3338C44.3085 18.3338 44.0268 18.4131 43.8208 18.5717C43.6172 18.728 43.4764 18.902 43.3983 19.0938L42.4004 18.8665C42.5188 18.535 42.6916 18.2675 42.9189 18.0639C43.1485 17.858 43.4125 17.7088 43.7108 17.6165C44.0091 17.5218 44.3227 17.4744 44.6518 17.4744C44.8696 17.4744 45.1004 17.5005 45.3443 17.5526C45.5905 17.6023 45.8201 17.6946 46.0332 17.8295C46.2486 17.9645 46.425 18.1574 46.5623 18.4084C46.6996 18.657 46.7683 18.9801 46.7683 19.3778V23H45.7314V22.2543H45.6887C45.6201 22.3916 45.5171 22.5265 45.3798 22.6591C45.2425 22.7917 45.0661 22.9018 44.8507 22.9893C44.6352 23.0769 44.3772 23.1207 44.0765 23.1207ZM44.3074 22.2685C44.6009 22.2685 44.8519 22.2105 45.0602 22.0945C45.2709 21.9785 45.4307 21.8269 45.5396 21.6399C45.6509 21.4505 45.7065 21.2481 45.7065 21.0327V20.3295C45.6686 20.3674 45.5952 20.4029 45.4863 20.4361C45.3798 20.4669 45.2579 20.4941 45.1206 20.5178C44.9833 20.5391 44.8495 20.5592 44.7193 20.5781C44.5891 20.5947 44.4802 20.6089 44.3926 20.6207C44.1866 20.6468 43.9984 20.6906 43.8279 20.7521C43.6599 20.8137 43.5249 20.9025 43.4231 21.0185C43.3237 21.1321 43.274 21.2836 43.274 21.473C43.274 21.7358 43.371 21.9347 43.5652 22.0696C43.7593 22.2022 44.0067 22.2685 44.3074 22.2685ZM48.6584 25.0455C48.4998 25.0455 48.3554 25.0324 48.2251 25.0064C48.0949 24.9827 47.9979 24.9567 47.9339 24.9283L48.1896 24.0582C48.3838 24.1103 48.5566 24.1328 48.7081 24.1257C48.8596 24.1186 48.9934 24.0618 49.1094 23.9553C49.2277 23.8487 49.3319 23.6747 49.4219 23.4332L49.5533 23.071L47.5575 17.5455H48.6939L50.0753 21.7784H50.1321L51.5135 17.5455H52.6534L50.4055 23.728C50.3014 24.0121 50.1688 24.2524 50.0078 24.4489C49.8468 24.6477 49.6551 24.7969 49.4325 24.8963C49.21 24.9957 48.9519 25.0455 48.6584 25.0455ZM54.7131 15.7273V23H53.6513V15.7273H54.7131ZM56.1415 23V17.5455H57.2033V23H56.1415ZM56.6777 16.7038C56.4931 16.7038 56.3345 16.6423 56.2019 16.5192C56.0717 16.3937 56.0066 16.2446 56.0066 16.0717C56.0066 15.8965 56.0717 15.7474 56.2019 15.6243C56.3345 15.4988 56.4931 15.4361 56.6777 15.4361C56.8624 15.4361 57.0198 15.4988 57.15 15.6243C57.2826 15.7474 57.3489 15.8965 57.3489 16.0717C57.3489 16.2446 57.2826 16.3937 57.15 16.5192C57.0198 16.6423 56.8624 16.7038 56.6777 16.7038ZM62.7191 18.8771L61.7567 19.0476C61.7165 18.9245 61.6526 18.8073 61.565 18.696C61.4798 18.5848 61.3638 18.4936 61.217 18.4226C61.0702 18.3516 60.8867 18.3161 60.6665 18.3161C60.3659 18.3161 60.1149 18.3835 59.9137 18.5185C59.7125 18.651 59.6119 18.8227 59.6119 19.0334C59.6119 19.2157 59.6793 19.3625 59.8143 19.4737C59.9492 19.585 60.167 19.6761 60.4677 19.7472L61.3342 19.946C61.8361 20.062 62.2101 20.2408 62.4563 20.4822C62.7025 20.7237 62.8256 21.0374 62.8256 21.4233C62.8256 21.75 62.7309 22.0412 62.5415 22.2969C62.3545 22.5502 62.0929 22.7491 61.7567 22.8935C61.4229 23.0379 61.0359 23.1101 60.5955 23.1101C59.9847 23.1101 59.4864 22.9799 59.1005 22.7195C58.7146 22.4567 58.4779 22.0838 58.3903 21.6009L59.4165 21.4446C59.4805 21.7121 59.6119 21.9145 59.8107 22.0518C60.0096 22.1868 60.2688 22.2543 60.5884 22.2543C60.9364 22.2543 61.2146 22.1821 61.4229 22.0376C61.6313 21.8909 61.7354 21.7121 61.7354 21.5014C61.7354 21.331 61.6715 21.1877 61.5437 21.0717C61.4182 20.9557 61.2253 20.8681 60.9648 20.8089L60.0415 20.6065C59.5326 20.4905 59.1561 20.3059 58.9123 20.0526C58.6708 19.7992 58.5501 19.4785 58.5501 19.0902C58.5501 18.7682 58.64 18.4865 58.82 18.245C58.9999 18.0036 59.2485 17.8153 59.5657 17.6804C59.8829 17.5431 60.2463 17.4744 60.6559 17.4744C61.2454 17.4744 61.7094 17.6023 62.0479 17.858C62.3865 18.1113 62.6102 18.451 62.7191 18.8771ZM66.5392 17.5455V18.3977H63.5598V17.5455H66.5392ZM64.3588 16.2386H65.4206V21.3984C65.4206 21.6044 65.4514 21.7595 65.513 21.8636C65.5745 21.9654 65.6538 22.0353 65.7509 22.0732C65.8503 22.1087 65.958 22.1264 66.074 22.1264C66.1593 22.1264 66.2338 22.1205 66.2978 22.1087C66.3617 22.0968 66.4114 22.0874 66.4469 22.0803L66.6387 22.9574C66.5771 22.9811 66.4895 23.0047 66.3759 23.0284C66.2623 23.0545 66.1202 23.0687 65.9498 23.071C65.6704 23.0758 65.41 23.026 65.1685 22.9219C64.927 22.8177 64.7317 22.6567 64.5826 22.4389C64.4334 22.2211 64.3588 21.9477 64.3588 21.6186V16.2386Z" fill="white"/>
          </svg>          
        </a>
      </div>
    </div>

    <h2 class="header-msg">Create groups of four!</h2>
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

    .header {
      display: flex;
      justify-content: space-between;
      flex-direction: row;
    }

    .logo-container {
      justify-content: flex-start;
    }

    .header-button-container
    {
      display: flex;
      justify-content: flex-end;
      align-items: center;
    }

    .header-msg {
      font-weight: 300;
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
