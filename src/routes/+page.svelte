<script>
    import posthog from 'posthog-js'
    import moment from "moment";
    import "moment-timezone";
    import { flip } from 'svelte/animate';
    import { writable } from 'svelte/store';
    import { fade, fly, slide, scale } from 'svelte/transition';
    import { onMount } from 'svelte';
    import { browser } from "$app/environment";
    import {goto} from '$app/navigation';
    import ClearedCategory from './ClearedCategory.svelte';
    import HelpOverlay from './HelpOverlay.svelte';
    import ResultGrid from './ResultGrid.svelte';
    import gameBoards from '$lib/data/gameboards.json';
    import './styles.css';
    import {visited, currentGameDate, guessHistory, clearedCategories, mistakeCount} from './store.js';

    onMount(() => {
      if (browser) {
        window.ezstandalone = window.ezstandalone || {};
          ezstandalone.cmd = ezstandalone.cmd || [];
          ezstandalone.cmd.push(function() {
              ezstandalone.enable();
              ezstandalone.display();
          });
      }
    });

    //date stuff, see if this can be moved to another component
    function getEasternTimeDate() {
        const date = new Date();
        const easternTimeOffset = -4; // Eastern Time is UTC-4 during standard time
        const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
        const easternTime = new Date(utc + (3600000 * easternTimeOffset));
        return easternTime.toLocaleDateString('en-US', {timeZone: 'America/New_York'});
    } 

    let timeUntilFourAMUTC = 0;
    let timer = null;

    function updateTimer() {
      const now = moment(); // Current time in user's timezone

      const fourAMUTC = moment(now).utc().startOf("day").add(4, "hours"); // 4 AM UTC

      if (now > fourAMUTC) {
        fourAMUTC.add(1, "days"); // Increment to next day if already passed
      }

      timeUntilFourAMUTC = fourAMUTC.diff(now); // Difference in milliseconds
    }

    function formatTime(milliseconds) {
      const totalSeconds = Math.floor(milliseconds / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }

    function startTimer() {
      updateTimer(); // Run once to initialize
      timer = setInterval(updateTimer, 1000);
    }

    startTimer();

    moment.tz.setDefault('UTC');
    const todaysDate = moment().utc().format("MM/DD/YYYY"); // Current date in UTC

    const categories = gameBoards[todaysDate.toString()]["categories"] || [];
    const shoutout = gameBoards[todaysDate.toString()]["shoutout"] || false;
    const shoutoutName = gameBoards[todaysDate.toString()]["shoutout-name"] || "";
    const shoutoutSocials = gameBoards[todaysDate.toString()]["shoutout-socials"] || false;
    const youtube = gameBoards[todaysDate.toString()]["youtube"] || "";
    const instagram = gameBoards[todaysDate.toString()]["instagram"] || "";
    const twitter = gameBoards[todaysDate.toString()]["twitter"] || "";
    const tiktok = gameBoards[todaysDate.toString()]["tiktok"] || "";
    const twitch = gameBoards[todaysDate.toString()]["twitch"] || "";
    const spotify = gameBoards[todaysDate.toString()]["spotify"] || "";
    const src = gameBoards[todaysDate.toString()]["gameoverGif"] || "";
    const playlist = gameBoards[todaysDate.toString()]["playlist"] || "";
    const keys = Object.keys(gameBoards);
    const harmonyNumber = keys.indexOf(todaysDate) + 1; // Adding 1 to make it 1-based index

    console.log(todaysDate);

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
    let selectedElements = [];
    let shake = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,0, 0, 0, 0];
    let hideOverlay = true;

    let playbackWidth = (5 + $mistakeCount * 20);
    if (playbackWidth > 80) {
      playbackWidth = 80;
    }

    let helpOverlay = false;
    const today = getEasternTimeDate();
    
    if ($currentGameDate == today) {
      if ($mistakeCount >= 4) {
        gameoverStore.set({
          isOver: true,
          headerMessage: "Better luck tmr..."
        });
      const remainingCategories = categories.filter(category => !$clearedCategories.includes(category));
        remainingCategories.forEach((category) => {
          swapElements(category.elements);
          remainingElements = remainingElements.filter(item => !category.elements.includes(item));
        });
        // remove any elements from remaining elements present in clearedCategories
      }

      // if won
      if ($clearedCategories.length == 4 && $mistakeCount < 4) {
        console.log('winning game');
        remainingElements = [];
        gameoverStore.set({
          isOver: true,
          headerMessage: "Incredible!"
        });
      }

      //neither won nor lost

      if ($clearedCategories.length < 4 && $mistakeCount < 4) {
        const allClearedElements = $clearedCategories.map(category => category.elements).flat();
        remainingElements = remainingElements.filter(remainingElement => !allClearedElements.includes(remainingElement));
      }
    } 
    else { // stale game, reset
      $currentGameDate = today;
      $mistakeCount = 0;
      $clearedCategories = [];
      $guessHistory = [];
      onMount(() => {
        if (browser) {
          const thisPage = window.location.pathname;
          goto('/').then(
            () => goto(thisPage)
        );
        }

      }); 
    }

    if ($visited === false) {
      $visited = true;
      setTimeout(() => {
        helpOverlay = true;
      }, 500);
    }

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
      if ($guessHistory.length == 0) {
        posthog.capture('game started', { property: 'true' })
      }
      if (selectedElements.length != 4) {
        //do  nothing, not valid guess
        return
      }
      else {
        for (let i = 0; i < $guessHistory.length; i++) {
          categories.map(item => item.elements).flat();
          const guess = $guessHistory[i].map(entry => entry.guess);
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
          // If category is found, add guess and color to $guessHistory
          if (category) {
              tempGuessHistory.push({ guess: element, color: category.color });
          }
        });
        $guessHistory.push(tempGuessHistory);
        $guessHistory = $guessHistory;

      }
      for (let i = 0; i < categories.length; i++) {
        const commonItems = countSimilarItems(selectedElements, categories[i].elements);
        // if found 4 items in common, a cleared category
        if (commonItems == 4) {
          // trigger animation or sound effect

          setTimeout(swapElements(selectedElements), 300);
          $clearedCategories.push(categories[i]);
          $clearedCategories = $clearedCategories;

          remainingElements = remainingElements.filter(item => !selectedElements.includes(item)); 
          selectedElements = [];

          if ($clearedCategories.length == 4) {
            posthog.capture('game won', { property: 'true' })
            setTimeout(() => {
              gameoverStore.set({
              isOver: true,
              headerMessage: "Incredible!",
              });
              toggleOverlay();
            }, 2500);
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
        posthog.capture('game lost', { property: 'true' })
        setTimeout(() => {
          const remainingCategories = categories.filter(category => !$clearedCategories.includes(category));
          remainingCategories.forEach((category) => {
            swapElements(category.elements);
            $clearedCategories.push(category);
            $clearedCategories = $clearedCategories;
            remainingElements = remainingElements.filter(item => !category.elements.includes(item));
          });
        }, 1000);

        setTimeout(() => {
            gameoverStore.set({
            isOver: true,
            headerMessage: "Better luck tmr...",
          });
            toggleOverlay();
        }, 2500);
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
      var tempElements = remainingElements.filter(item => !elementsToSwap.includes(item)); 
      remainingElements = [...elementsToSwap, ...tempElements];
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
  
    function toggleHelpOverlay() {
      helpOverlay = !helpOverlay;
    }

    function shareResult() {
      posthog.capture('shared result', { property: 'true' })
      const emoji_mapping = {
        "#CBff70": "🟩",
        "#FAA3FF": "🟪",
        "#78DAF9": "🟦",
        "#FFBC21": "🟧"
      }

      var header = "harmonies #" + harmonyNumber + "🎧\n\n";
      
      let grid = '';

      for (let i = 0; i < $guessHistory.length; i++) {
        const block_one = emoji_mapping[$guessHistory[i][0].color];
        const block_two = emoji_mapping[$guessHistory[i][1].color];
        const block_three = emoji_mapping[$guessHistory[i][2].color];
        const block_four = emoji_mapping[$guessHistory[i][3].color];
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

    onMount(() => {
      const gridItems = document.querySelectorAll('.grid-item');
      // Loop through each grid item
      gridItems.forEach(item => {
        // Get the paragraph element within the grid item
        const paragraph = item.querySelector('p');
        // Get the text content of the paragraph
        const text = paragraph.textContent.trim();
        
        // Check if any word in the text is longer than 9 characters
        const longWord = text.split(' ').find(word => word.length > 7);
        const reallyLongWord = text.split(' ').find(word => word.length > 9);
        const shortWord = text.split(' ').length === 1 && text.length < 7;

        const wordsCount = text.split(' ').length;
        const manyWords = wordsCount >= 5;

        // If a long word is found, reduce the font size
        if ((longWord && !reallyLongWord) || manyWords) {
          const currentFontSize = parseFloat(window.getComputedStyle(paragraph).fontSize);
          paragraph.style.fontSize = (currentFontSize * 0.80) + 'px';
        } else if (reallyLongWord) {
          const currentFontSize = parseFloat(window.getComputedStyle(paragraph).fontSize);
          paragraph.style.fontSize = (currentFontSize * 0.70) + 'px';
        } else if (shortWord) {
          const currentFontSize = parseFloat(window.getComputedStyle(paragraph).fontSize);
          paragraph.style.fontSize = (currentFontSize * 1.2) + 'px';
        }
      });
    });

  </script>

  <main>
    {#if !hideOverlay}
    <div in:slide={{delay: 500}} class="gameover-overlay">
      <button class="exit-btn" on:click={toggleOverlay}>
        <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g id="ph:x">
          <path id="Vector" d="M20.8878 19.7376C20.9633 19.8131 21.0232 19.9027 21.064 20.0014C21.1049 20.1 21.1259 20.2057 21.1259 20.3125C21.1259 20.4192 21.1049 20.5249 21.064 20.6236C21.0232 20.7222 20.9633 20.8118 20.8878 20.8873C20.8123 20.9628 20.7227 21.0227 20.6241 21.0635C20.5254 21.1044 20.4197 21.1254 20.313 21.1254C20.2062 21.1254 20.1005 21.1044 20.0019 21.0635C19.9032 21.0227 19.8136 20.9628 19.7381 20.8873L13.0005 14.1486L6.2628 20.8873C6.11034 21.0398 5.90356 21.1254 5.68795 21.1254C5.47234 21.1254 5.26557 21.0398 5.11311 20.8873C4.96065 20.7349 4.875 20.5281 4.875 20.3125C4.875 20.0969 4.96065 19.8901 5.11311 19.7376L11.8518 13L5.11311 6.26231C4.96065 6.10985 4.875 5.90307 4.875 5.68746C4.875 5.47186 4.96065 5.26508 5.11311 5.11262C5.26557 4.96016 5.47234 4.87451 5.68795 4.87451C5.90356 4.87451 6.11034 4.96016 6.2628 5.11262L13.0005 11.8513L19.7381 5.11262C19.8906 4.96016 20.0973 4.87451 20.313 4.87451C20.5286 4.87451 20.7353 4.96016 20.8878 5.11262C21.0403 5.26508 21.1259 5.47186 21.1259 5.68746C21.1259 5.90307 21.0403 6.10985 20.8878 6.26231L14.1491 13L20.8878 19.7376Z" fill="black"/>
          </g>
          </svg>         
      </button>
      <h1>{$gameoverStore.headerMessage}</h1>
      <h2>Harmonies #{harmonyNumber}</h2>
        <div out:scale class="gameover-gif"><img {src} alt="Game over gif"></div>
        <!-- <ResultGrid bind:guesses={$guessHistory}></ResultGrid> -->
      <h2>Next Board</h2>
      <p class="timer">{formatTime(timeUntilFourAMUTC)}</p>

      <button on:click={shareResult} style="background-color: #000;" class="results-button">SHARE RESULT</button>
      <a href="https://spotle.io" target="_blank"><button style="background-color: #1DB954;" class="results-button">PLAY SPOTLE</button></a>
    </div>
    {/if}

    {#if helpOverlay}
    <HelpOverlay onClose={toggleHelpOverlay}> </HelpOverlay>
    {/if}
    <div style="{!hideOverlay ? 'filter: blur(1px)' : ''} {helpOverlay ? 'filter: blur(1px)' : ''}" class="container">

    <div class="header">
      <div class="logo-container">
      <h1>Harmonies.</h1>
      </div>
      <div class="header-button-container">
        <a href={playlist}>
          <svg width="67" height="26" viewBox="0 0 67 26" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M48.8204 1.68867C48.8854 0.763811 49.4189 0.284668 50.4199 0.284668H57.3517C58.3527 0.284668 58.875 0.763811 58.9405 1.68867H48.8204ZM46.8941 4.70281C47.0575 3.71249 47.5255 3.16835 48.6134 3.16835H59.0709C60.1592 3.16835 60.6267 3.71249 60.7902 4.70281H46.8941ZM47.7758 25.7155C45.5124 25.7155 44.3586 24.5947 44.3586 22.342V9.80624C44.3586 7.56467 45.5124 6.4332 47.7758 6.4332H60.2242C62.4987 6.4332 63.6414 7.56467 63.6414 9.80624V22.342C63.6414 24.5835 62.5094 25.7155 60.5506 25.7155H47.7758ZM56.99 14.2235C57.4631 14.0953 57.6107 13.9969 57.6107 13.4253V11.4944C57.6107 11.1202 57.4826 10.9526 56.9607 11.0807L54.0738 11.7999C53.591 11.9183 53.4828 12.0167 53.4828 12.598V17.0412C53.4828 17.4748 53.4433 17.5538 52.9507 17.6912L52.0444 17.928C51.1479 18.1648 50.3892 18.6964 50.3892 19.6621C50.3892 20.4992 51.0198 21.1102 52.0147 21.1102C53.4238 21.1102 54.3793 20.0953 54.3793 18.6667V15.2876C54.3793 14.9231 54.4582 14.8247 54.6848 14.775L56.99 14.2235Z" fill="white"/>
            <path d="M1.31729 4.67188V3.72727H6.94585V4.67188H4.67667V11H3.58292V4.67188H1.31729ZM9.61097 11.1101C9.09961 11.1101 8.65335 10.9929 8.27219 10.7585C7.89104 10.5241 7.59511 10.1963 7.38441 9.77486C7.17371 9.35346 7.06836 8.86103 7.06836 8.29759C7.06836 7.73177 7.17371 7.23698 7.38441 6.81321C7.59511 6.38944 7.89104 6.06037 8.27219 5.82599C8.65335 5.59162 9.09961 5.47443 9.61097 5.47443C10.1223 5.47443 10.5686 5.59162 10.9498 5.82599C11.3309 6.06037 11.6268 6.38944 11.8375 6.81321C12.0482 7.23698 12.1536 7.73177 12.1536 8.29759C12.1536 8.86103 12.0482 9.35346 11.8375 9.77486C11.6268 10.1963 11.3309 10.5241 10.9498 10.7585C10.5686 10.9929 10.1223 11.1101 9.61097 11.1101ZM9.61452 10.2188C9.94596 10.2188 10.2206 10.1312 10.4384 9.95597C10.6562 9.78078 10.8172 9.54759 10.9213 9.25639C11.0279 8.9652 11.0811 8.64441 11.0811 8.29403C11.0811 7.94602 11.0279 7.62642 10.9213 7.33523C10.8172 7.04167 10.6562 6.80611 10.4384 6.62855C10.2206 6.45099 9.94596 6.36222 9.61452 6.36222C9.28072 6.36222 9.00373 6.45099 8.78356 6.62855C8.56576 6.80611 8.40359 7.04167 8.29705 7.33523C8.19289 7.62642 8.1408 7.94602 8.1408 8.29403C8.1408 8.64441 8.19289 8.9652 8.29705 9.25639C8.40359 9.54759 8.56576 9.78078 8.78356 9.95597C9.00373 10.1312 9.28072 10.2188 9.61452 10.2188ZM15.3807 11.1065C14.9403 11.1065 14.5473 10.9941 14.2017 10.7692C13.8584 10.5419 13.5885 10.2187 13.392 9.79972C13.1979 9.37831 13.1009 8.87287 13.1009 8.28338C13.1009 7.69389 13.1991 7.18963 13.3956 6.7706C13.5945 6.35156 13.8667 6.03078 14.2124 5.80824C14.558 5.5857 14.9498 5.47443 15.3878 5.47443C15.7263 5.47443 15.9986 5.53125 16.2045 5.64489C16.4129 5.75616 16.5739 5.88636 16.6875 6.03551C16.8035 6.18466 16.8935 6.31605 16.9574 6.42969H17.0213V3.72727H18.0831V11H17.0462V10.1513H16.9574C16.8935 10.2673 16.8011 10.3999 16.6804 10.549C16.562 10.6982 16.3987 10.8284 16.1903 10.9396C15.982 11.0509 15.7121 11.1065 15.3807 11.1065ZM15.6151 10.201C15.9205 10.201 16.1785 10.1205 16.3892 9.95952C16.6023 9.79616 16.7633 9.57008 16.8722 9.28125C16.9834 8.99242 17.0391 8.65625 17.0391 8.27273C17.0391 7.89394 16.9846 7.5625 16.8757 7.27841C16.7668 6.99432 16.607 6.77296 16.3963 6.61435C16.1856 6.45573 15.9252 6.37642 15.6151 6.37642C15.2955 6.37642 15.0291 6.45928 14.8161 6.625C14.603 6.79072 14.442 7.01681 14.3331 7.30327C14.2266 7.58973 14.1733 7.91288 14.1733 8.27273C14.1733 8.63731 14.2277 8.9652 14.3366 9.25639C14.4455 9.54759 14.6065 9.77841 14.8196 9.94886C15.035 10.117 15.3002 10.201 15.6151 10.201ZM21.1859 11.1207C20.8403 11.1207 20.5278 11.0568 20.2484 10.929C19.969 10.7988 19.7477 10.6106 19.5843 10.3643C19.4234 10.1181 19.3429 9.81629 19.3429 9.45881C19.3429 9.15104 19.402 8.89773 19.5204 8.69886C19.6388 8.5 19.7986 8.34257 19.9998 8.22656C20.2011 8.11056 20.426 8.02296 20.6745 7.96378C20.9231 7.90459 21.1764 7.85961 21.4345 7.82884C21.7612 7.79096 22.0263 7.76018 22.2299 7.73651C22.4335 7.71046 22.5815 7.66903 22.6738 7.61222C22.7662 7.5554 22.8123 7.46307 22.8123 7.33523V7.31037C22.8123 7.00024 22.7247 6.75994 22.5495 6.58949C22.3767 6.41903 22.1187 6.33381 21.7754 6.33381C21.4179 6.33381 21.1362 6.41312 20.9302 6.57173C20.7266 6.72798 20.5858 6.90199 20.5076 7.09375L19.5098 6.86648C19.6281 6.53504 19.801 6.26752 20.0282 6.06392C20.2579 5.85795 20.5218 5.70881 20.8201 5.61648C21.1184 5.52178 21.4321 5.47443 21.7612 5.47443C21.979 5.47443 22.2098 5.50047 22.4537 5.55256C22.6999 5.60227 22.9295 5.6946 23.1426 5.82955C23.358 5.96449 23.5344 6.15743 23.6717 6.40838C23.809 6.65696 23.8777 6.98011 23.8777 7.37784V11H22.8407V10.2543H22.7981C22.7295 10.3916 22.6265 10.5265 22.4892 10.6591C22.3519 10.7917 22.1755 10.9018 21.96 10.9893C21.7446 11.0769 21.4866 11.1207 21.1859 11.1207ZM21.4167 10.2685C21.7103 10.2685 21.9612 10.2105 22.1696 10.0945C22.3803 9.97846 22.5401 9.82694 22.649 9.63991C22.7602 9.45052 22.8159 9.24811 22.8159 9.03267V8.32955C22.778 8.36742 22.7046 8.40294 22.5957 8.43608C22.4892 8.46686 22.3672 8.49408 22.2299 8.51776C22.0926 8.53906 21.9589 8.55919 21.8287 8.57812C21.6984 8.5947 21.5895 8.6089 21.502 8.62074C21.296 8.64678 21.1078 8.69058 20.9373 8.75213C20.7692 8.81368 20.6343 8.90246 20.5325 9.01847C20.4331 9.1321 20.3833 9.28362 20.3833 9.47301C20.3833 9.7358 20.4804 9.93466 20.6745 10.0696C20.8687 10.2022 21.1161 10.2685 21.4167 10.2685ZM25.7678 13.0455C25.6091 13.0455 25.4647 13.0324 25.3345 13.0064C25.2043 12.9827 25.1072 12.9567 25.0433 12.9283L25.299 12.0582C25.4931 12.1103 25.666 12.1328 25.8175 12.1257C25.969 12.1186 26.1027 12.0618 26.2188 11.9553C26.3371 11.8487 26.4413 11.6747 26.5312 11.4332L26.6626 11.071L24.6669 5.54545H25.8033L27.1847 9.77841H27.2415L28.6229 5.54545H29.7628L27.5149 11.728C27.4107 12.0121 27.2782 12.2524 27.1172 12.4489C26.9562 12.6477 26.7644 12.7969 26.5419 12.8963C26.3194 12.9957 26.0613 13.0455 25.7678 13.0455ZM32.0151 3.72727V4.40909C32.0151 4.61032 31.9772 4.82221 31.9015 5.04474C31.8281 5.26491 31.7239 5.4768 31.589 5.6804C31.454 5.884 31.2954 6.05919 31.1131 6.20597L30.5875 5.82955C30.7272 5.62595 30.848 5.40933 30.9498 5.17969C31.0539 4.95005 31.106 4.69673 31.106 4.41974V3.72727H32.0151ZM36.4398 6.87713L35.4775 7.04759C35.4372 6.92448 35.3733 6.80729 35.2857 6.69602C35.2005 6.58475 35.0845 6.49361 34.9377 6.42259C34.7909 6.35156 34.6074 6.31605 34.3873 6.31605C34.0866 6.31605 33.8356 6.38352 33.6344 6.51847C33.4332 6.65104 33.3326 6.82268 33.3326 7.03338C33.3326 7.21567 33.4 7.36245 33.535 7.47372C33.6699 7.58499 33.8877 7.67614 34.1884 7.74716L35.0549 7.94602C35.5568 8.06203 35.9308 8.24077 36.177 8.48224C36.4232 8.72372 36.5463 9.03741 36.5463 9.4233C36.5463 9.75 36.4516 10.0412 36.2623 10.2969C36.0752 10.5502 35.8136 10.7491 35.4775 10.8935C35.1436 11.0379 34.7566 11.1101 34.3162 11.1101C33.7054 11.1101 33.2071 10.9799 32.8212 10.7195C32.4353 10.4567 32.1986 10.0838 32.111 9.60085L33.1373 9.4446C33.2012 9.71212 33.3326 9.91454 33.5314 10.0518C33.7303 10.1868 33.9895 10.2543 34.3091 10.2543C34.6571 10.2543 34.9353 10.1821 35.1436 10.0376C35.352 9.89086 35.4561 9.71212 35.4561 9.50142C35.4561 9.33097 35.3922 9.18774 35.2644 9.07173C35.1389 8.95573 34.946 8.86813 34.6855 8.80895L33.7623 8.60653C33.2533 8.49053 32.8768 8.30587 32.633 8.05256C32.3915 7.79924 32.2708 7.47846 32.2708 7.0902C32.2708 6.76823 32.3607 6.48651 32.5407 6.24503C32.7206 6.00355 32.9692 5.81534 33.2864 5.6804C33.6036 5.54309 33.967 5.47443 34.3766 5.47443C34.9661 5.47443 35.4301 5.60227 35.7686 5.85795C36.1072 6.11127 36.3309 6.45099 36.4398 6.87713ZM3.68768 23V15.7273H6.28001C6.84582 15.7273 7.31457 15.8303 7.68626 16.0362C8.05794 16.2422 8.33612 16.5239 8.52077 16.8814C8.70543 17.2365 8.79776 17.6366 8.79776 18.0817C8.79776 18.5291 8.70425 18.9316 8.51722 19.2891C8.33256 19.6442 8.05321 19.9259 7.67915 20.1342C7.30747 20.3402 6.8399 20.4432 6.27646 20.4432H4.49379V19.5128H6.17702C6.53451 19.5128 6.82451 19.4512 7.04705 19.3281C7.26959 19.2027 7.43294 19.0322 7.53711 18.8168C7.64128 18.6013 7.69336 18.3563 7.69336 18.0817C7.69336 17.8071 7.64128 17.5632 7.53711 17.3501C7.43294 17.1371 7.26841 16.9702 7.0435 16.8494C6.82096 16.7287 6.5274 16.6683 6.16282 16.6683H4.78498V23H3.68768ZM11.0607 15.7273V23H9.99893V15.7273H11.0607ZM14.0765 23.1207C13.7309 23.1207 13.4184 23.0568 13.139 22.929C12.8597 22.7988 12.6383 22.6106 12.475 22.3643C12.314 22.1181 12.2335 21.8163 12.2335 21.4588C12.2335 21.151 12.2927 20.8977 12.411 20.6989C12.5294 20.5 12.6892 20.3426 12.8904 20.2266C13.0917 20.1106 13.3166 20.023 13.5652 19.9638C13.8137 19.9046 14.0671 19.8596 14.3251 19.8288C14.6518 19.791 14.917 19.7602 15.1206 19.7365C15.3242 19.7105 15.4721 19.669 15.5645 19.6122C15.6568 19.5554 15.7029 19.4631 15.7029 19.3352V19.3104C15.7029 19.0002 15.6154 18.7599 15.4402 18.5895C15.2673 18.419 15.0093 18.3338 14.666 18.3338C14.3085 18.3338 14.0268 18.4131 13.8208 18.5717C13.6172 18.728 13.4764 18.902 13.3983 19.0938L12.4004 18.8665C12.5188 18.535 12.6916 18.2675 12.9189 18.0639C13.1485 17.858 13.4125 17.7088 13.7108 17.6165C14.0091 17.5218 14.3227 17.4744 14.6518 17.4744C14.8696 17.4744 15.1004 17.5005 15.3443 17.5526C15.5905 17.6023 15.8201 17.6946 16.0332 17.8295C16.2486 17.9645 16.425 18.1574 16.5623 18.4084C16.6996 18.657 16.7683 18.9801 16.7683 19.3778V23H15.7314V22.2543H15.6887C15.6201 22.3916 15.5171 22.5265 15.3798 22.6591C15.2425 22.7917 15.0661 22.9018 14.8507 22.9893C14.6352 23.0769 14.3772 23.1207 14.0765 23.1207ZM14.3074 22.2685C14.6009 22.2685 14.8519 22.2105 15.0602 22.0945C15.2709 21.9785 15.4307 21.8269 15.5396 21.6399C15.6509 21.4505 15.7065 21.2481 15.7065 21.0327V20.3295C15.6686 20.3674 15.5952 20.4029 15.4863 20.4361C15.3798 20.4669 15.2579 20.4941 15.1206 20.5178C14.9833 20.5391 14.8495 20.5592 14.7193 20.5781C14.5891 20.5947 14.4802 20.6089 14.3926 20.6207C14.1866 20.6468 13.9984 20.6906 13.8279 20.7521C13.6599 20.8137 13.5249 20.9025 13.4231 21.0185C13.3237 21.1321 13.274 21.2836 13.274 21.473C13.274 21.7358 13.371 21.9347 13.5652 22.0696C13.7593 22.2022 14.0067 22.2685 14.3074 22.2685ZM18.6584 25.0455C18.4998 25.0455 18.3554 25.0324 18.2251 25.0064C18.0949 24.9827 17.9979 24.9567 17.9339 24.9283L18.1896 24.0582C18.3838 24.1103 18.5566 24.1328 18.7081 24.1257C18.8596 24.1186 18.9934 24.0618 19.1094 23.9553C19.2277 23.8487 19.3319 23.6747 19.4219 23.4332L19.5533 23.071L17.5575 17.5455H18.6939L20.0753 21.7784H20.1321L21.5135 17.5455H22.6534L20.4055 23.728C20.3014 24.0121 20.1688 24.2524 20.0078 24.4489C19.8468 24.6477 19.6551 24.7969 19.4325 24.8963C19.21 24.9957 18.9519 25.0455 18.6584 25.0455ZM24.7131 15.7273V23H23.6513V15.7273H24.7131ZM26.1415 23V17.5455H27.2033V23H26.1415ZM26.6777 16.7038C26.4931 16.7038 26.3345 16.6423 26.2019 16.5192C26.0717 16.3937 26.0066 16.2446 26.0066 16.0717C26.0066 15.8965 26.0717 15.7474 26.2019 15.6243C26.3345 15.4988 26.4931 15.4361 26.6777 15.4361C26.8624 15.4361 27.0198 15.4988 27.15 15.6243C27.2826 15.7474 27.3489 15.8965 27.3489 16.0717C27.3489 16.2446 27.2826 16.3937 27.15 16.5192C27.0198 16.6423 26.8624 16.7038 26.6777 16.7038ZM32.7191 18.8771L31.7567 19.0476C31.7165 18.9245 31.6526 18.8073 31.565 18.696C31.4798 18.5848 31.3638 18.4936 31.217 18.4226C31.0702 18.3516 30.8867 18.3161 30.6665 18.3161C30.3659 18.3161 30.1149 18.3835 29.9137 18.5185C29.7125 18.651 29.6119 18.8227 29.6119 19.0334C29.6119 19.2157 29.6793 19.3625 29.8143 19.4737C29.9492 19.585 30.167 19.6761 30.4677 19.7472L31.3342 19.946C31.8361 20.062 32.2101 20.2408 32.4563 20.4822C32.7025 20.7237 32.8256 21.0374 32.8256 21.4233C32.8256 21.75 32.7309 22.0412 32.5415 22.2969C32.3545 22.5502 32.0929 22.7491 31.7567 22.8935C31.4229 23.0379 31.0359 23.1101 30.5955 23.1101C29.9847 23.1101 29.4864 22.9799 29.1005 22.7195C28.7146 22.4567 28.4779 22.0838 28.3903 21.6009L29.4165 21.4446C29.4805 21.7121 29.6119 21.9145 29.8107 22.0518C30.0096 22.1868 30.2688 22.2543 30.5884 22.2543C30.9364 22.2543 31.2146 22.1821 31.4229 22.0376C31.6313 21.8909 31.7354 21.7121 31.7354 21.5014C31.7354 21.331 31.6715 21.1877 31.5437 21.0717C31.4182 20.9557 31.2253 20.8681 30.9648 20.8089L30.0415 20.6065C29.5326 20.4905 29.1561 20.3059 28.9123 20.0526C28.6708 19.7992 28.5501 19.4785 28.5501 19.0902C28.5501 18.7682 28.64 18.4865 28.82 18.245C28.9999 18.0036 29.2485 17.8153 29.5657 17.6804C29.8829 17.5431 30.2463 17.4744 30.6559 17.4744C31.2454 17.4744 31.7094 17.6023 32.0479 17.858C32.3865 18.1113 32.6102 18.451 32.7191 18.8771ZM36.5392 17.5455V18.3977H33.5598V17.5455H36.5392ZM34.3588 16.2386H35.4206V21.3984C35.4206 21.6044 35.4514 21.7595 35.513 21.8636C35.5745 21.9654 35.6538 22.0353 35.7509 22.0732C35.8503 22.1087 35.958 22.1264 36.074 22.1264C36.1593 22.1264 36.2338 22.1205 36.2978 22.1087C36.3617 22.0968 36.4114 22.0874 36.4469 22.0803L36.6387 22.9574C36.5771 22.9811 36.4895 23.0047 36.3759 23.0284C36.2623 23.0545 36.1202 23.0687 35.9498 23.071C35.6704 23.0758 35.41 23.026 35.1685 22.9219C34.927 22.8177 34.7317 22.6567 34.5826 22.4389C34.4334 22.2211 34.3588 21.9477 34.3588 21.6186V16.2386Z" fill="white"/>
          </svg>            
        </a>
        <div class="help-btn" on:click={toggleHelpOverlay}>
          <svg width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M25 12.3826C25 15.6667 23.683 18.8163 21.3388 21.1385C18.9946 23.4607 15.8152 24.7653 12.5 24.7653C9.18479 24.7653 6.00537 23.4607 3.66117 21.1385C1.31696 18.8163 0 15.6667 0 12.3826C0 9.09855 1.31696 5.94898 3.66117 3.62679C6.00537 1.30459 9.18479 0 12.5 0C15.8152 0 18.9946 1.30459 21.3388 3.62679C23.683 5.94898 25 9.09855 25 12.3826ZM8.5875 9.33805H9.87656C10.0922 9.33805 10.2641 9.16315 10.2922 8.95109C10.4328 7.93572 11.1359 7.19586 12.3891 7.19586C13.4609 7.19586 14.4422 7.72676 14.4422 9.00372C14.4422 9.98659 13.8578 10.4386 12.9344 11.1258C11.8828 11.8827 11.05 12.7665 11.1094 14.2013L11.1141 14.5372C11.1157 14.6388 11.1576 14.7356 11.2307 14.8068C11.3037 14.8781 11.4022 14.918 11.5047 14.918H12.7719C12.8755 14.918 12.9748 14.8772 13.0481 14.8046C13.1213 14.7321 13.1625 14.6336 13.1625 14.531V14.3685C13.1625 13.2572 13.5891 12.9337 14.7406 12.0684C15.6922 11.3518 16.6844 10.5562 16.6844 8.88608C16.6844 6.54732 14.6906 5.4174 12.5078 5.4174C10.5281 5.4174 8.35938 6.33062 8.21094 8.95574C8.2088 9.00572 8.217 9.05561 8.23505 9.10234C8.25309 9.14907 8.2806 9.19165 8.31587 9.22746C8.35114 9.26327 8.39343 9.29155 8.44014 9.31057C8.48686 9.32959 8.537 9.33894 8.5875 9.33805ZM12.2203 19.3107C13.1734 19.3107 13.8281 18.7009 13.8281 17.8759C13.8281 17.0215 13.1719 16.4209 12.2203 16.4209C11.3078 16.4209 10.6437 17.0215 10.6437 17.8759C10.6437 18.7009 11.3063 19.3107 12.2203 19.3107Z" fill="white"/>
          </svg>
        </div>
      </div>
    </div>

    {#if !shoutout}
    <h2 class="header-msg">Create groups of four!</h2>
    {/if}
    {#if shoutout}
    <div class="shoutout">
      <p>
        Today's board designed by...
      </p>
      <h3>
        {shoutoutName}
      </h3>
      {#if shoutoutSocials}
      <div class="shoutout-socials">
        {#if youtube}
          <button>
            <a href="{youtube}" target="_blank">
              <svg width="30" height="22" viewBox="0 0 30 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 0C16.2825 0 17.598 0.0330001 18.873 0.0870001L20.379 0.159L21.8205 0.2445L23.1705 0.336L24.4035 0.432C25.7416 0.534417 27.0007 1.10542 27.9593 2.04456C28.9179 2.9837 29.5146 4.23081 29.6445 5.5665L29.7045 6.204L29.817 7.569C29.922 8.9835 30 10.5255 30 12C30 13.4745 29.922 15.0165 29.817 16.431L29.7045 17.796C29.685 18.015 29.6655 18.2265 29.6445 18.4335C29.5146 19.7694 28.9176 21.0167 27.9587 21.9559C26.9998 22.8951 25.7403 23.4659 24.402 23.568L23.172 23.6625L21.822 23.7555L20.379 23.841L18.873 23.913C17.5827 23.9691 16.2915 23.9981 15 24C13.7085 23.9981 12.4173 23.9691 11.127 23.913L9.621 23.841L8.1795 23.7555L6.8295 23.6625L5.5965 23.568C4.25843 23.4656 2.99933 22.8946 2.04071 21.9554C1.08209 21.0163 0.485361 19.7692 0.3555 18.4335L0.2955 17.796L0.183 16.431C0.0683063 14.9567 0.00726603 13.4787 0 12C0 10.5255 0.078 8.9835 0.183 7.569L0.2955 6.204C0.315 5.985 0.3345 5.7735 0.3555 5.5665C0.485311 4.23105 1.08183 2.98412 2.04014 2.04501C2.99845 1.10591 4.25719 0.534754 5.595 0.432L6.8265 0.336L8.1765 0.2445L9.6195 0.159L11.1255 0.0870001C12.4163 0.0309494 13.708 0.00194293 15 0ZM15 3C13.7625 3 12.489 3.033 11.25 3.084L9.783 3.1545L8.3745 3.237L7.0515 3.327L5.8395 3.4215C5.2025 3.4667 4.60207 3.73597 4.14464 4.18159C3.68721 4.62721 3.40233 5.22039 3.3405 5.856C3.165 7.6695 3 9.927 3 12C3 14.073 3.165 16.3305 3.3405 18.144C3.468 19.452 4.506 20.469 5.8395 20.5785L7.0515 20.6715L8.3745 20.7615L9.783 20.8455L11.25 20.916C12.489 20.967 13.7625 21 15 21C16.2375 21 17.511 20.967 18.75 20.916L20.217 20.8455L21.6255 20.763L22.9485 20.673L24.1605 20.5785C24.7975 20.5333 25.3979 20.264 25.8554 19.8184C26.3128 19.3728 26.5977 18.7796 26.6595 18.144C26.835 16.3305 27 14.073 27 12C27 9.927 26.835 7.6695 26.6595 5.856C26.5977 5.22039 26.3128 4.62721 25.8554 4.18159C25.3979 3.73597 24.7975 3.4667 24.1605 3.4215L22.9485 3.3285L21.6255 3.2385L20.217 3.1545L18.75 3.084C17.5007 3.03025 16.2504 3.00224 15 3ZM12 8.3625C11.9999 8.2159 12.0356 8.07149 12.104 7.94183C12.1725 7.81218 12.2715 7.7012 12.3926 7.61855C12.5137 7.5359 12.6532 7.48409 12.7988 7.46761C12.9445 7.45113 13.092 7.47049 13.2285 7.524L13.35 7.584L19.65 11.22C19.7755 11.2924 19.8816 11.394 19.9594 11.5162C20.0372 11.6383 20.0843 11.7775 20.0968 11.9218C20.1094 12.0661 20.0869 12.2113 20.0313 12.345C19.9757 12.4787 19.8886 12.5971 19.7775 12.69L19.65 12.78L13.35 16.4175C13.223 16.491 13.08 16.5324 12.9334 16.538C12.7868 16.5436 12.6411 16.5133 12.5089 16.4497C12.3767 16.3861 12.262 16.2912 12.1749 16.1731C12.0878 16.0551 12.0308 15.9176 12.009 15.7725L12 15.6375V8.3625Z" fill="white"/>
              </svg>              
            </a>
          </button>
        {/if}
        {#if twitter}
          <button>
            <a href="{twitter}" target="_blank">
              <svg width="23" height="22" viewBox="0 0 23 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18.1135 0H21.6401L13.9351 8.89642L23 21H15.9026L10.3442 13.6583L3.98283 21H0.45425L8.69592 11.484L0 0.000968099H7.27758L12.3021 6.71152L18.1135 0ZM16.8763 18.8683H18.8303L6.21575 2.02033H4.11892L16.8763 18.8683Z" fill="white"/>
              </svg>  
            </a>          
          </button>
          {/if}
          {#if tiktok}
          <button>
            <a href="{tiktok}" target="_blank">
              <svg width="19" height="22" viewBox="0 0 19 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15.074 3.44667C14.2457 2.49287 13.7892 1.26797 13.7895 0H10.0453V15.1556C10.0164 15.9757 9.67312 16.7525 9.08773 17.3225C8.50233 17.8924 7.7205 18.211 6.90689 18.2111C5.18622 18.2111 3.75638 16.7933 3.75638 15.0333C3.75638 12.9311 5.76786 11.3544 7.83992 12.0022V8.14C3.65944 7.57778 0 10.8533 0 15.0333C0 19.1033 3.34439 22 6.89477 22C10.6996 22 13.7895 18.8833 13.7895 15.0333V7.34556C15.3078 8.44537 17.1307 9.03546 19 9.03222V5.25556C19 5.25556 16.7219 5.36556 15.074 3.44667Z" fill="white"/>
              </svg>   
            </a>         
          </button>
          {/if}
          {#if instagram}
          <button>
            <a href="{instagram}" target="_blank">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6.38 0H15.62C19.14 0 22 2.86 22 6.38V15.62C22 17.3121 21.3278 18.9349 20.1313 20.1313C18.9349 21.3278 17.3121 22 15.62 22H6.38C2.86 22 0 19.14 0 15.62V6.38C0 4.68792 0.672177 3.06514 1.86866 1.86866C3.06514 0.672177 4.68792 0 6.38 0ZM6.16 2.2C5.10974 2.2 4.1025 2.61721 3.35986 3.35986C2.61721 4.1025 2.2 5.10974 2.2 6.16V15.84C2.2 18.029 3.971 19.8 6.16 19.8H15.84C16.8903 19.8 17.8975 19.3828 18.6401 18.6401C19.3828 17.8975 19.8 16.8903 19.8 15.84V6.16C19.8 3.971 18.029 2.2 15.84 2.2H6.16ZM16.775 3.85C17.1397 3.85 17.4894 3.99487 17.7473 4.25273C18.0051 4.51059 18.15 4.86033 18.15 5.225C18.15 5.58967 18.0051 5.93941 17.7473 6.19727C17.4894 6.45513 17.1397 6.6 16.775 6.6C16.4103 6.6 16.0606 6.45513 15.8027 6.19727C15.5449 5.93941 15.4 5.58967 15.4 5.225C15.4 4.86033 15.5449 4.51059 15.8027 4.25273C16.0606 3.99487 16.4103 3.85 16.775 3.85ZM11 5.5C12.4587 5.5 13.8576 6.07946 14.8891 7.11091C15.9205 8.14236 16.5 9.54131 16.5 11C16.5 12.4587 15.9205 13.8576 14.8891 14.8891C13.8576 15.9205 12.4587 16.5 11 16.5C9.54131 16.5 8.14236 15.9205 7.11091 14.8891C6.07946 13.8576 5.5 12.4587 5.5 11C5.5 9.54131 6.07946 8.14236 7.11091 7.11091C8.14236 6.07946 9.54131 5.5 11 5.5ZM11 7.7C10.1248 7.7 9.28542 8.04768 8.66655 8.66655C8.04768 9.28542 7.7 10.1248 7.7 11C7.7 11.8752 8.04768 12.7146 8.66655 13.3335C9.28542 13.9523 10.1248 14.3 11 14.3C11.8752 14.3 12.7146 13.9523 13.3335 13.3335C13.9523 12.7146 14.3 11.8752 14.3 11C14.3 10.1248 13.9523 9.28542 13.3335 8.66655C12.7146 8.04768 11.8752 7.7 11 7.7Z" fill="white"/>
              </svg>
            </a>
          </button>
          {/if}
          {#if twitch}
          <button>
            <a href="{twitch}" target="_blank">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9.852 4.716H11.568V9.852H9.852M14.568 4.716H16.284V9.852H14.568M4.284 0L0 4.284V19.716H5.136V24L9.432 19.716H12.852L20.568 12V0M18.852 11.148L15.432 14.568H12L9 17.568V14.568H5.136V1.716H18.852V11.148Z" fill="white"/>
              </svg>
            </a>
          </button>
          {/if}
          {#if spotify}
          <button>
            <a href="{spotify}" target="_blank">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15.9 8.9C12.7 7 7.35 6.8 4.3 7.75C3.8 7.9 3.3 7.6 3.15 7.15C3 6.65 3.3 6.15 3.75 6C7.3 4.95 13.15 5.15 16.85 7.35C17.3 7.6 17.45 8.2 17.2 8.65C16.95 9 16.35 9.15 15.9 8.9ZM15.8 11.7C15.55 12.05 15.1 12.2 14.75 11.95C12.05 10.3 7.95 9.8 4.8 10.8C4.4 10.9 3.95 10.7 3.85 10.3C3.75 9.9 3.95 9.45 4.35 9.35C8 8.25 12.5 8.8 15.6 10.7C15.9 10.85 16.05 11.35 15.8 11.7ZM14.6 14.45C14.4 14.75 14.05 14.85 13.75 14.65C11.4 13.2 8.45 12.9 4.95 13.7C4.6 13.8 4.3 13.55 4.2 13.25C4.1 12.9 4.35 12.6 4.65 12.5C8.45 11.65 11.75 12 14.35 13.6C14.7 13.75 14.75 14.15 14.6 14.45ZM10 0C8.68678 0 7.38642 0.258658 6.17317 0.761205C4.95991 1.26375 3.85752 2.00035 2.92893 2.92893C1.05357 4.8043 0 7.34784 0 10C0 12.6522 1.05357 15.1957 2.92893 17.0711C3.85752 17.9997 4.95991 18.7362 6.17317 19.2388C7.38642 19.7413 8.68678 20 10 20C12.6522 20 15.1957 18.9464 17.0711 17.0711C18.9464 15.1957 20 12.6522 20 10C20 8.68678 19.7413 7.38642 19.2388 6.17317C18.7362 4.95991 17.9997 3.85752 17.0711 2.92893C16.1425 2.00035 15.0401 1.26375 13.8268 0.761205C12.6136 0.258658 11.3132 0 10 0Z" fill="white"/>
              </svg>
            </a>
          </button>
          {/if}

        </div>
        {/if}
    </div>
    {/if}
    {#if $alertStore.message}
    <div transition:fade class="alert-message-container">
      <h2>{ $alertStore.message }</h2>

    </div>
    {/if}

    <div class="grid-container">
      {#each $clearedCategories as category}
        <ClearedCategory category={category}></ClearedCategory>
      {/each}
      {#each remainingElements as element, i (element)}
          <div animate:flip on:click={() => toggleSelection(element)} class="grid-item {selectedElements.includes(element) ? 'selected' : ''} {shake[i] ? 'shake' : ''}"><p>{element}</p></div>
      {/each}
    </div>

    {#if !$gameoverStore.isOver}
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
  {:else}
  <div class="result-button-container">
    <button on:click={toggleOverlay} style="background-color: #fff;; color: black;" class="results-button">VIEW RESULTS</button>
  </div>
  {/if}

  <div class="ad-space">
  </div>

  

  <div class="footer">
      <p> made by flatwhite studios </p> <p>&nbsp;| <a href="./privacy" target="_blank">privacy</a> | <a href="https://twitter.com/Spotle_io" target="_blank">follow us!</a></p>
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

    .result-button-container {
      margin-top: 20px;
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

    @font-face {
        font-family: 'StarJedi';
        font-style: normal;
        font-weight: 500;
        src: url('/fonts/Starjedi.ttf'); /* IE9 Compat Modes */
        src: local(''), url('/fonts/Starjedi.ttf') format('embedded-opentype'),
            /* IE6-IE8 */ url('/fonts/Starjedi.ttf') format('woff2'),
            /* Super Modern Browsers */ url('/fonts/Starjedi.ttf') format('woff'),
            /* Modern Browsers */ url('/fonts/Starjedi.ttf') format('truetype'),
            /* Safari, Android, iOS */ url('/fonts/Starjedi.ttf') format('svg'); /* Legacy iOS */
    }

    .logo-text {
      font-family: 'StarJedi', sans-serif;
      color: #fff;
    }

    .help-btn {
      margin-left: 7.5px;
    }

    .help-btn:hover {
      cursor: pointer;
    }

    .header-button-container
    {
      display: flex;
      justify-content: flex-end;
      align-items: center;
    }

    .header-msg {
      font-weight: 300;
      font-size: 18px;
      margin-top: -5px;
    }

    .alert-message-container {
      position: absolute;
      top: 43.5%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 9999; 
      background-color: #D9D9D9;
      color: black;
      border-radius: 5px;
      display: flex;
      width: 156px;
      height: 35px;
      flex-direction: column;
      justify-content: center;
      flex-shrink: 0;

    }

    .alert-message-container h2 {
      font-size: 14px;
    }

    .grid-container {
      display: grid;
      align-items: center;
      grid-template-rows: repeat(4, minmax(0, 1fr));
      grid-template-columns: repeat(4, minmax(0, 1fr));
      grid-gap: 11px;
      max-width: 400px;
      min-width: 350px;
      font-weight: bold;
      padding: 2px;
      text-transform: uppercase;
      margin-bottom: 3px;
    }

    .grid-item {
      border-style: none;
      border-radius: 8px;
      background-color: #fff;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 90px;
      width: 90px;
      text-align: center;
      cursor: pointer; /* Optional: Changes the cursor to indicate clickable items */
      transition: background-color 0.4s, border-color 0.3s, transform 1s;
      overflow: hidden; /* Hide overflowing content */
      font-weight: 700;
      font-size: 14px;
      color: black;
      line-height: 18px;
      overflow-wrap: break-word;
    }

    .grid-item p {
      max-width: 90%;
    }

    @media only screen and (max-width: 390px) {
      .grid-item {
        font-size: 11.5px;
        height: 82px;
        width: 82px;
        padding-left: 2px;
      }

      .grid-container {
        max-width: 92vw;
      }
    }

    @media only screen and (min-width: 391px) and (max-width: 600px)  { /* smartphones, iPhone, portrait 480x320 phones */ 
      .grid-item {
        font-size: 13px;
        height: 20.5vw;
        width: 20.5vw;
        padding-left: 2px;
      }

      .grid-container {
        max-width: 92vw;
      }
    }

    @media only screen and (max-width: 1200px) and (min-width: 601px) {
      .grid-item {
        font-size: 15px;
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
      position: absolute;
      margin-top: auto; /* Pushes the footer to the bottom */
      display: flex;
      align-items: flex-end; /* Aligns items to the bottom */
      color: #fff;
      font-size: 12px;
      font-style: normal;
      font-weight: 500;
      line-height: normal;
      bottom: 0; /* Align to the bottom */
      width: 100%; /* Full width */
    }

    .footer-right {
      margin-left: auto;
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

    /* Adjust margin and padding */

    .shoutout {
      max-width: 350px;
      min-width: 300px;
      align-self: center;
    }

    .shoutout p,
    .shoutout h3,
    .shoutout-socials {
      margin: 2px 0; /* Adjust as needed */
      overflow: line-break;
    }
    .shoutout-socials {
      margin-top: 2px;
    }

    .shoutout h3 {
      color: #fff;
      align-self: center;
    }

    .shoutout button {
      margin-left: 4px;
      margin-right: 4px;
    }

    /* Make buttons inline */
    .shoutout-socials button {
      display: inline-block;
      margin-right: 5.5px; /* Adjust as needed */
    }

    /* Optionally, you can remove default button styles */
    .shoutout-socials button {
      border: none;
      background-color: transparent;
      padding: 0;
      color: red;
    }

    .shoutout {
      margin-bottom: 10px;
    }

    .ad-space {
      height: 100px;
    }
</style>