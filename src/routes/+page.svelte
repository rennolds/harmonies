<script>
  import moment from "moment";
  import "moment-timezone";
  import { flip } from "svelte/animate";
  import { writable } from "svelte/store";
  import { fade, fly, slide, scale } from "svelte/transition";
  import { onMount } from "svelte";
  import { browser } from "$app/environment";
  import { goto } from "$app/navigation";
  import ClearedCategory from "./ClearedCategory.svelte";
  import HelpOverlay from "./HelpOverlay.svelte";
  import Navbar from "./Navbar.svelte";
  import gameBoards from "$lib/data/gameboards.json";
  // import TopAdBanner from './old.svelte';
  import Ramp from "./Ramp.svelte";
  import "./styles.css";
  import {
    visited,
    currentGameDate,
    guessHistory,
    clearedCategories,
    mistakeCount,
    played,
    maxStreak,
    currentStreak,
    solveList,
    completedDays,
    todaysProgressDate,
  } from "./store.js";

  const PUB_ID = 1025391;
  const WEBSITE_ID = 75241;

  export let data;

  let selectedDate = "";
  if (data && data.dateParam) {
    selectedDate = data.dateParam;
  }

  async function sendError(message) {
    const response = await fetch("/api/report-error", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: message }),
    });
  }

  function getEasternTimeDate() {
    // If a date was selected from archives, use that instead
    if (selectedDate) {
      return selectedDate;
    }

    const date = new Date();
    const easternTimeOffset = -4; // Eastern Time is UTC-4 during standard time
    const utc = date.getTime() + date.getTimezoneOffset() * 60000;
    const easternTime = new Date(utc + 3600000 * easternTimeOffset);
    return easternTime.toLocaleDateString("en-US", {
      timeZone: "America/New_York",
    });
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

  // First, get today's actual date (not a selected date)
  const actualToday = moment().tz("America/New_York").format("MM/DD/YYYY");

  // Check if we're viewing an archived puzzle
  const isArchiveMode = selectedDate && selectedDate !== actualToday;

  // For display and board selection, use the selectedDate or today
  const displayDate = selectedDate || actualToday;

  moment.tz.setDefault("America/New_York");
  const todaysDate = displayDate;

  const todayBoard = gameBoards[todaysDate];

  // Check if the gameboard exists
  if (!todayBoard) {
    // Log the error to the server console
    console.error(`No gameboard found for date ${todaysDate}`);
    if (browser) {
      sendError(`Harmonies has no gameboard found for the date ${todaysDate}`);
    }
  }

  // Use todayBoard if it exists; otherwise, default to an empty object
  const board = todayBoard || {};

  const categories = board.categories || [];

  if (categories.length != 4 && todayBoard) {
    console.error(`Gameboard is malformed for ${todaysDate}`);
    if (browser) {
      sendError(`Harmonies has a malformed gameboard for ${todaysDate}`);
    }
  }
  const shoutout = board["shoutout"] || false;
  const shoutoutName = board["shoutout-name"] || "";
  const shoutoutSocials = board["shoutout-socials"] || false;
  const specialMessage = board["special-message"] || false;
  const messageContent = board["message-content"] || "";
  const disableHeader = board["disable-header"] || false;
  const youtube = board["youtube"] || "";
  const instagram = board["instagram"] || "";
  const twitter = board["twitter"] || "";
  const tiktok = board["tiktok"] || "";
  const twitch = board["twitch"] || "";
  const spotify = board["spotify"] || "";
  const letterboxd = board["letterboxd"] || "";
  const src = board["gameoverGif"] || "";
  if (src == "" && todayBoard) {
    console.error(`Gameover gif is missing for ${todaysDate}`);
    if (browser) {
      sendError(`Harmonies is missing a gameover gif for ${todaysDate}`);
    }
  }
  const playlist = board["playlist"] || "";
  if (playlist == "" && todayBoard) {
    console.error(`Playlist is missing for ${todaysDate}`);
    if (browser) {
      sendError(`Harmonies is missing a playlist for ${todaysDate}`);
    }
  }

  // Calculate harmonyNumber based on available dates
  const keys = Object.keys(gameBoards);
  const harmonyNumber = keys.indexOf(todaysDate) + 1; // Adding 1 to make it 1-based index

  const gameoverStore = writable({
    isOver: false,
    headerMessage: "",
  });

  const alertStore = writable({
    message: "",
    visible: false,
  });

  function showAlert(message) {
    alertStore.set({
      message,
      visible: true,
    });

    setTimeout(() => {
      alertStore.set({
        message: "",
        visible: false,
      });
    }, 3000);
  }

  // Initialize local variables for archive mode
  let localMistakeCount = 0;
  let localClearedCategories = [];
  let localGuessHistory = [];

  let remainingElements = categories.map((item) => item.elements).flat();
  let selectedElements = [];
  let shake = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  let hideOverlay = true;

  function calculatePlaybackWidth(mistakes) {
    return Math.min(5 + mistakes * 20, 80);
  }

  let playbackWidth = isArchiveMode
    ? calculatePlaybackWidth(localMistakeCount)
    : calculatePlaybackWidth($mistakeCount);

  let helpOverlay = false;
  const today = getEasternTimeDate();

  // Game state initialization
  if (isArchiveMode) {
    // We're playing an archived puzzle
    // Don't update any persistent state, use local variables

    // Check if this archive puzzle was previously completed
    const isCompleted = $completedDays.includes(displayDate);

    // Shuffle elements for the archived puzzle
    remainingElements = shuffleElements(remainingElements);

    if (isCompleted) {
      // Show as completed
      gameoverStore.set({
        isOver: true,
        headerMessage: "You've played this puzzle before!",
      });
    }
  } else {
    // We're playing today's puzzle

    // Check if this is our first time playing today
    if ($todaysProgressDate !== actualToday) {
      // First time today, reset the state
      playbackWidth = calculatePlaybackWidth($mistakeCount);
      $todaysProgressDate = actualToday;
      $currentGameDate = actualToday;
      $mistakeCount = 0;
      $clearedCategories = [];
      $guessHistory = [];

      // Shuffle elements for a new day
      remainingElements = shuffleElements(remainingElements);
    } else {
      // Continue with today's progress
      if ($mistakeCount >= 4) {
        gameoverStore.set({
          isOver: true,
          headerMessage: "Better luck tmr...",
        });
        const remainingCategories = categories.filter(
          (category) => !$clearedCategories.includes(category)
        );
        remainingCategories.forEach((category) => {
          swapElements(category.elements);
          remainingElements = remainingElements.filter(
            (item) => !category.elements.includes(item)
          );
        });
      }

      // if won
      if (
        (isArchiveMode
          ? localClearedCategories.length
          : $clearedCategories.length) == 4 &&
        (isArchiveMode ? localMistakeCount : $mistakeCount) < 4
      ) {
        console.log("winning game");
        remainingElements = [];
        gameoverStore.set({
          isOver: true,
          headerMessage: "Incredible!",
        });
      }

      // neither won nor lost
      if (
        (isArchiveMode
          ? localClearedCategories.length
          : $clearedCategories.length) < 4 &&
        (isArchiveMode ? localMistakeCount : $mistakeCount) < 4
      ) {
        const allClearedElements = (
          isArchiveMode ? localClearedCategories : $clearedCategories
        )
          .map((category) => category.elements)
          .flat();

        // Helper function to get a unique identifier for an element
        function getElementKey(element) {
          if (typeof element === "object" && element.type === "image") {
            return `image:${element.url}`; // Use URL as unique identifier for images
          }
          return element; // For non-image elements, use the element itself
        }

        // Create a map of cleared elements for faster lookup
        const clearedElementsMap = new Map();
        allClearedElements.forEach((element) => {
          const key = getElementKey(element);
          clearedElementsMap.set(key, true);
        });

        remainingElements = remainingElements.filter(
          (remainingElement) =>
            !clearedElementsMap.has(getElementKey(remainingElement))
        );
      }
    }
  }

  if ($visited === false) {
    $visited = true;
    // Only show help overlay for first-time visitors on the main game (not archive mode)
    // and when there's no date parameter
    if (!isArchiveMode && !selectedDate) {
      setTimeout(() => {
        helpOverlay = true;
      }, 500);
    }
  }

  function handleStats(guessCount, win) {
    $played = $played + 1;

    // Record this date as completed regardless of win/loss
    if (!$completedDays.includes(todaysDate)) {
      $completedDays = [...$completedDays, todaysDate];
    }

    if (!win) {
      // loss
      $solveList.push(0);
      $solveList = $solveList;
      $currentStreak = 0;
    } else {
      // win
      $currentStreak = $currentStreak + 1;
      $solveList.push(guessCount);
      $solveList = $solveList;
      if ($currentStreak > $maxStreak) {
        $maxStreak = $currentStreak;
      }
    }
  }

  function shuffleElements() {
    let currentIndex = remainingElements.length,
      randomIndex;

    // While there remain elements to shuffle.
    while (currentIndex > 0) {
      // Pick a remaining element.
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;

      // And swap it with the current element.
      [remainingElements[currentIndex], remainingElements[randomIndex]] = [
        remainingElements[randomIndex],
        remainingElements[currentIndex],
      ];
    }

    return remainingElements;
  }
  remainingElements = shuffleElements(remainingElements);

  function countSimilarItems(list1, list2) {
    let count = 0;
    const map = new Map();

    // Helper function to get a unique identifier for an element
    function getElementKey(element) {
      if (typeof element === "object" && element.type === "image") {
        return `image:${element.url}`; // Use URL as unique identifier for images
      }
      return element; // For non-image elements, use the element itself
    }

    // Count occurrences of items in list1
    for (const item of list1) {
      const key = getElementKey(item);
      map.set(key, (map.get(key) || 0) + 1);
    }

    // Check occurrences of items in list2 and update count
    for (const item of list2) {
      const key = getElementKey(item);
      if (map.has(key) && map.get(key) > 0) {
        count++;
        map.set(key, map.get(key) - 1);
      }
    }

    return count;
  }

  function handleSubmit() {
    // check if selectedElements match any categories
    if (selectedElements.length != 4) {
      //do  nothing, not valid guess
      return;
    } else {
      if (!isArchiveMode) {
        // Check for duplicate guesses in today's puzzle
        for (let i = 0; i < $guessHistory.length; i++) {
          const guess = $guessHistory[i].map((entry) => entry.guess);
          const commonItems = countSimilarItems(guess, selectedElements);
          if (commonItems == selectedElements.length) {
            showAlert("Already guessed!");
            return;
          }
        }
      } else {
        // Check for duplicate guesses in archive mode
        for (let i = 0; i < localGuessHistory.length; i++) {
          const guess = localGuessHistory[i].map((entry) => entry.guess);
          const commonItems = countSimilarItems(guess, selectedElements);
          if (commonItems == selectedElements.length) {
            showAlert("Already guessed!");
            return;
          }
        }
      }

      let tempGuessHistory = [];
      selectedElements.forEach((element) => {
        // Find the category that contains the current element
        const category = categories.find((cat) =>
          cat.elements.includes(element)
        );
        // If category is found, add guess and color to $guessHistory
        if (category) {
          tempGuessHistory.push({ guess: element, color: category.color });
        }
      });

      if (!isArchiveMode) {
        // Update today's game history
        $guessHistory.push(tempGuessHistory);
        $guessHistory = $guessHistory;
      } else {
        // Update local history for archive mode
        localGuessHistory.push(tempGuessHistory);
      }
    }

    for (let i = 0; i < categories.length; i++) {
      const commonItems = countSimilarItems(
        selectedElements,
        categories[i].elements
      );
      // if found 4 items in common, a cleared category
      if (commonItems == 4) {
        // trigger animation or sound effect
        setTimeout(swapElements(selectedElements), 300);

        if (!isArchiveMode) {
          // Check if this category is already in clearedCategories
          const isAlreadyCleared = $clearedCategories.some(
            (existingCategory) => {
              // Compare elements using the same logic as countSimilarItems
              const existingElements = existingCategory.elements;
              const newElements = categories[i].elements;

              // Helper function to get a unique identifier for an element
              function getElementKey(element) {
                if (typeof element === "object" && element.type === "image") {
                  return `image:${element.url}`; // Use URL as unique identifier for images
                }
                return element; // For non-image elements, use the element itself
              }

              // Create maps for faster lookup
              const existingMap = new Map();
              existingElements.forEach((element) => {
                const key = getElementKey(element);
                existingMap.set(key, true);
              });

              // Check if all elements in newElements exist in existingElements
              return newElements.every((element) =>
                existingMap.has(getElementKey(element))
              );
            }
          );

          // Only add if not already cleared
          if (!isAlreadyCleared) {
            // Update cleared categories for today's puzzle
            $clearedCategories.push(categories[i]);
            $clearedCategories = $clearedCategories;
          }

          if ($clearedCategories.length == 4) {
            gtag("event", "gameover", {
              result: "win",
              guesses: $guessHistory.length,
            });
            handleStats($guessHistory.length, true);
            setTimeout(() => {
              gameoverStore.set({
                isOver: true,
                headerMessage: "Incredible!",
              });
              toggleOverlay();
            }, 2500);
          }
        } else {
          // Check if this category is already in localClearedCategories
          const isAlreadyCleared = localClearedCategories.some(
            (existingCategory) => {
              // Compare elements using the same logic as countSimilarItems
              const existingElements = existingCategory.elements;
              const newElements = categories[i].elements;

              // Helper function to get a unique identifier for an element
              function getElementKey(element) {
                if (typeof element === "object" && element.type === "image") {
                  return `image:${element.url}`; // Use URL as unique identifier for images
                }
                return element; // For non-image elements, use the element itself
              }

              // Create maps for faster lookup
              const existingMap = new Map();
              existingElements.forEach((element) => {
                const key = getElementKey(element);
                existingMap.set(key, true);
              });

              // Check if all elements in newElements exist in existingElements
              return newElements.every((element) =>
                existingMap.has(getElementKey(element))
              );
            }
          );

          // Only add if not already cleared
          if (!isAlreadyCleared) {
            // Update local state for archive mode
            localClearedCategories.push(categories[i]);
            localClearedCategories = [...localClearedCategories]; // Ensure reactivity
          }

          if (localClearedCategories.length == 4) {
            // Mark this archive puzzle as completed
            if (!$completedDays.includes(displayDate)) {
              $completedDays = [...$completedDays, displayDate];
            }

            setTimeout(() => {
              gameoverStore.set({
                isOver: true,
                headerMessage: "Incredible!",
              });
              toggleOverlay();
            }, 2500);
          }
        }

        remainingElements = remainingElements.filter(
          (item) => !selectedElements.includes(item)
        );
        selectedElements = [];

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
      shake = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    }, 1000);

    if (!isArchiveMode) {
      // Update mistake count for today's puzzle
      $mistakeCount++;
      playbackWidth = calculatePlaybackWidth($mistakeCount);

      if ($mistakeCount == 4) {
        //reveal categories not found
        gtag("event", "gameover", {
          result: "loss",
        });
        handleStats($guessHistory.length, false);
        setTimeout(() => {
          const remainingCategories = categories.filter(
            (category) => !$clearedCategories.includes(category)
          );
          remainingCategories.forEach((category) => {
            swapElements(category.elements);
            $clearedCategories.push(category);
            $clearedCategories = $clearedCategories;
            remainingElements = remainingElements.filter(
              (item) => !category.elements.includes(item)
            );
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
    } else {
      // Update local mistake count for archived puzzle
      localMistakeCount++;
      playbackWidth = calculatePlaybackWidth(localMistakeCount);

      if (localMistakeCount == 4) {
        // Mark this archive puzzle as completed
        if (!$completedDays.includes(displayDate)) {
          $completedDays = [...$completedDays, displayDate];
        }

        setTimeout(() => {
          const remainingCategories = categories.filter(
            (category) => !localClearedCategories.includes(category)
          );
          remainingCategories.forEach((category) => {
            swapElements(category.elements);
            localClearedCategories.push(category);
            localClearedCategories = [...localClearedCategories]; // Ensure reactivity
            remainingElements = remainingElements.filter(
              (item) => !category.elements.includes(item)
            );
          });
        }, 1000);

        setTimeout(() => {
          gameoverStore.set({
            isOver: true,
            headerMessage: "Better luck next time...",
          });
          toggleOverlay();
        }, 2500);
      }
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
    var tempElements = remainingElements.filter(
      (item) => !elementsToSwap.includes(item)
    );
    remainingElements = [...elementsToSwap, ...tempElements];
  }

  function deselect() {
    selectedElements = [];
  }

  function toggleOverlay() {
    if (hideOverlay) {
      hideOverlay = false;
    } else {
      hideOverlay = true;
    }
  }

  function toggleHelpOverlay() {
    helpOverlay = !helpOverlay;
  }

  function shareResult() {
    if (browser) {
      gtag("event", "shared_result", {
        guesses: $guessHistory.length,
      });
    }
    const emoji_mapping = {
      "#CBff70": "🟩",
      "#FAA3FF": "🟪",
      "#78DAF9": "🟦",
      "#FFBC21": "🟧",
    };

    var header = "harmonies #" + harmonyNumber + "🎧\n\n";

    let grid = "";

    const historyToUse = isArchiveMode ? localGuessHistory : $guessHistory;

    for (let i = 0; i < historyToUse.length; i++) {
      const block_one = emoji_mapping[historyToUse[i][0].color];
      const block_two = emoji_mapping[historyToUse[i][1].color];
      const block_three = emoji_mapping[historyToUse[i][2].color];
      const block_four = emoji_mapping[historyToUse[i][3].color];
      const row = block_one + block_two + block_three + block_four;
      grid = grid + row + "\n";
    }

    const result = header + grid + "\n" + "harmonies.io";

    if (navigator.share) {
      navigator
        .share({
          text: result,
        })
        .then(() => {
          console.log("Thanks for sharing!");
        })
        .catch(console.error);
    } else {
      navigator.clipboard
        .writeText(result)
        .then(() => {
          console.log("copied");
        })
        .catch((error) => {
          alert(`Copy failed! ${error}`);
        });
    }
  }

  onMount(() => {
    const gridItems = document.querySelectorAll(".grid-item");
    // Loop through each grid item
    gridItems.forEach((item) => {
      // Get the paragraph element within the grid item
      const paragraph = item.querySelector("p");
      // Get the text content of the paragraph
      const text = paragraph.textContent.trim();

      // Check if any word in the text is longer than 9 characters
      const longWord = text.split(" ").find((word) => word.length > 7);
      const reallyLongWord = text.split(" ").find((word) => word.length > 9);
      const shortWord = text.split(" ").length === 1 && text.length < 7;

      const wordsCount = text.split(" ").length;
      const manyWords = wordsCount >= 5;
      const emoTitle = wordsCount >= 10;
      const superEmoTitle = wordsCount >= 13;

      // If a long word is found, reduce the font size
      if ((longWord && !reallyLongWord) || manyWords) {
        const currentFontSize = parseFloat(
          window.getComputedStyle(paragraph).fontSize
        );
        paragraph.style.fontSize = currentFontSize * 0.82 + "px";
      } else if (reallyLongWord) {
        const currentFontSize = parseFloat(
          window.getComputedStyle(paragraph).fontSize
        );
        paragraph.style.fontSize = currentFontSize * 0.79 + "px";
      } else if (shortWord) {
        const currentFontSize = parseFloat(
          window.getComputedStyle(paragraph).fontSize
        );
        paragraph.style.fontSize = currentFontSize * 1.1 + "px";
      }

      if (emoTitle) {
        const currentFontSize = parseFloat(
          window.getComputedStyle(paragraph).fontSize
        );
        paragraph.style.fontSize = currentFontSize * 0.7 + "px";
      }
      if (superEmoTitle) {
        const currentFontSize = parseFloat(
          window.getComputedStyle(paragraph).fontSize
        );
        paragraph.style.fontSize = currentFontSize * 0.9 + "px";
      }
    });
  });

  // Add new state for zoom modal
  let zoomedImage = null;
  let zoomedAlt = "";

  function openZoomModal(url, alt) {
    zoomedImage = url;
    zoomedAlt = alt || "";
  }

  function closeZoomModal() {
    zoomedImage = null;
    zoomedAlt = "";
  }

  // Safely render markdown-style links [text](url) in special messages
  function escapeHtml(input) {
    return String(input)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function sanitizeUrl(url) {
    if (typeof url !== "string") return "#";
    const trimmed = url.trim();
    if (!/^https?:\/\//i.test(trimmed)) return "#";
    return trimmed;
  }

  function renderSpecialMessage(message) {
    if (!message) return "";
    const pattern = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
    let result = "";
    let lastIndex = 0;
    for (const match of message.matchAll(pattern)) {
      const index = match.index ?? 0;
      result += escapeHtml(message.slice(lastIndex, index));
      const text = match[1];
      const url = match[2];
      const safeText = escapeHtml(text);
      const safeUrl = sanitizeUrl(url);
      result += `<a class="special-message-link" href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeText}</a>`;
      lastIndex = index + match[0].length;
    }
    result += escapeHtml(message.slice(lastIndex));
    return result;
  }
</script>

<main>
  <!-- <TopAdBanner /> -->
  <!-- <Ramp PUB_ID={PUB_ID} WEBSITE_ID={WEBSITE_ID} /> -->
  {#if !hideOverlay}
    <div in:slide={{ delay: 500 }} class="gameover-overlay">
      <button class="exit-btn" on:click={toggleOverlay}>
        <svg
          width="26"
          height="26"
          viewBox="0 0 26 26"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g id="ph:x">
            <path
              id="Vector"
              d="M20.8878 19.7376C20.9633 19.8131 21.0232 19.9027 21.064 20.0014C21.1049 20.1 21.1259 20.2057 21.1259 20.3125C21.1259 20.4192 21.1049 20.5249 21.064 20.6236C21.0232 20.7222 20.9633 20.8118 20.8878 20.8873C20.8123 20.9628 20.7227 21.0227 20.6241 21.0635C20.5254 21.1044 20.4197 21.1254 20.313 21.1254C20.2062 21.1254 20.1005 21.1044 20.0019 21.0635C19.9032 21.0227 19.8136 20.9628 19.7381 20.8873L13.0005 14.1486L6.2628 20.8873C6.11034 21.0398 5.90356 21.1254 5.68795 21.1254C5.47234 21.1254 5.26557 21.0398 5.11311 20.8873C4.96065 20.7349 4.875 20.5281 4.875 20.3125C4.875 20.0969 4.96065 19.8901 5.11311 19.7376L11.8518 13L5.11311 6.26231C4.96065 6.10985 4.875 5.90307 4.875 5.68746C4.875 5.47186 4.96065 5.26508 5.11311 5.11262C5.26557 4.96016 5.47234 4.87451 5.68795 4.87451C5.90356 4.87451 6.11034 4.96016 6.2628 5.11262L13.0005 11.8513L19.7381 5.11262C19.8906 4.96016 20.0973 4.87451 20.313 4.87451C20.5286 4.87451 20.7353 4.96016 20.8878 5.11262C21.0403 5.26508 21.1259 5.47186 21.1259 5.68746C21.1259 5.90307 21.0403 6.10985 20.8878 6.26231L14.1491 13L20.8878 19.7376Z"
              fill="black"
            />
          </g>
        </svg>
      </button>
      <h1>{$gameoverStore.headerMessage}</h1>
      <h2>Harmonies #{harmonyNumber}</h2>
      <div out:scale class="gameover-gif">
        <img {src} alt="Game over gif" />
      </div>
      <!-- <ResultGrid bind:guesses={$guessHistory}></ResultGrid> -->
      <h2>Next Board</h2>
      <p class="timer">{formatTime(timeUntilFourAMUTC)}</p>

      <button
        on:click={shareResult}
        style="background-color: #BA81C2;"
        class="results-button">SHARE RESULT</button
      >
      <a href="https://spotle.io" target="_blank"
        ><button style="background-color: #1DB954;" class="results-button"
          >PLAY SPOTLE</button
        ></a
      >

      <a href="https://crosstune.io" target="_blank"
        ><button
          style="background-color: #FF6B00 !important;"
          class="results-button">PLAY CROSSTUNE</button
        ></a
      >
    </div>
  {/if}

  {#if helpOverlay}
    <HelpOverlay onClose={toggleHelpOverlay} />
  {/if}
  <div class="container game-container">
    <Navbar {toggleHelpOverlay} {playlist} {isArchiveMode} />

    {#if !shoutout && !disableHeader}
      <h2 class="header-msg">
        <!-- check out our new game, <a
          href="https://crosstune.io"
          target="_blank"
          style="color: #FF6B00; text-decoration: none;"
          class="crosstune-link">crosstune.io</a
        >! -->
        Create groups of four!
      </h2>
    {/if}
    {#if shoutout}
      <div class="shoutout">
        <p>Today's board designed by...</p>
        <div class="shoutout-name-container">
          <h3>
            {shoutoutName}
          </h3>
          {#if shoutoutSocials}
            <div class="shoutout-socials">
              {#if youtube}
                <button>
                  <a href={youtube} target="_blank">
                    <!-- svg for youtube -->
                    <svg
                      width="30"
                      height="22"
                      viewBox="0 0 30 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M15 0C16.2825 0 17.598 0.0330001 18.873 0.0870001L20.379 0.159L21.8205 0.2445L23.1705 0.336L24.4035 0.432C25.7416 0.534417 27.0007 1.10542 27.9593 2.04456C28.9179 2.9837 29.5146 4.23081 29.6445 5.5665L29.7045 6.204L29.817 7.569C29.922 8.9835 30 10.5255 30 12C30 13.4745 29.922 15.0165 29.817 16.431L29.7045 17.796C29.685 18.015 29.6655 18.2265 29.6445 18.4335C29.5146 19.7694 28.9176 21.0167 27.9587 21.9559C26.9998 22.8951 25.7403 23.4659 24.402 23.568L23.172 23.6625L21.822 23.7555L20.379 23.841L18.873 23.913C17.5827 23.9691 16.2915 23.9981 15 24C13.7085 23.9981 12.4173 23.9691 11.127 23.913L9.621 23.841L8.1795 23.7555L6.8295 23.6625L5.5965 23.568C4.25843 23.4656 2.99933 22.8946 2.04071 21.9554C1.08209 21.0163 0.485361 19.7692 0.3555 18.4335L0.2955 17.796L0.183 16.431C0.0683063 14.9567 0.00726603 13.4787 0 12C0 10.5255 0.078 8.9835 0.183 7.569L0.2955 6.204C0.315 5.985 0.3345 5.7735 0.3555 5.5665C0.485311 4.23105 1.08183 2.98412 2.04014 2.04501C2.99845 1.10591 4.25719 0.534754 5.595 0.432L6.8265 0.336L8.1765 0.2445L9.6195 0.159L11.1255 0.0870001C12.4163 0.0309494 13.708 0.00194293 15 0ZM15 3C13.7625 3 12.489 3.033 11.25 3.084L9.783 3.1545L8.3745 3.237L7.0515 3.327L5.8395 3.4215C5.2025 3.4667 4.60207 3.73597 4.14464 4.18159C3.68721 4.62721 3.40233 5.22039 3.3405 5.856C3.165 7.6695 3 9.927 3 12C3 14.073 3.165 16.3305 3.3405 18.144C3.468 19.452 4.506 20.469 5.8395 20.5785L7.0515 20.6715L8.3745 20.7615L9.783 20.8455L11.25 20.916C12.489 20.967 13.7625 21 15 21C16.2375 21 17.511 20.967 18.75 20.916L20.217 20.8455L21.6255 20.763L22.9485 20.673L24.1605 20.5785C24.7975 20.5333 25.3979 20.264 25.8554 19.8184C26.3128 19.3728 26.5977 18.7796 26.6595 18.144C26.835 16.3305 27 14.073 27 12C27 9.927 26.835 7.6695 26.6595 5.856C26.5977 5.22039 26.3128 4.62721 25.8554 4.18159C25.3979 3.73597 24.7975 3.4667 24.1605 3.4215L22.9485 3.3285L21.6255 3.2385L20.217 3.1545L18.75 3.084C17.5007 3.03025 16.2504 3.00224 15 3ZM12 8.3625C11.9999 8.2159 12.0356 8.07149 12.104 7.94183C12.1725 7.81218 12.2715 7.7012 12.3926 7.61855C12.5137 7.5359 12.6532 7.48409 12.7988 7.46761C12.9445 7.45113 13.092 7.47049 13.2285 7.524L13.35 7.584L19.65 11.22C19.7755 11.2924 19.8816 11.394 19.9594 11.5162C20.0372 11.6383 20.0843 11.7775 20.0968 11.9218C20.1094 12.0661 20.0869 12.2113 20.0313 12.345C19.9757 12.4787 19.8886 12.5971 19.7775 12.69L19.65 12.78L13.35 16.4175C13.223 16.491 13.08 16.5324 12.9334 16.538C12.7868 16.5436 12.6411 16.5133 12.5089 16.4497C12.3767 16.3861 12.262 16.2912 12.1749 16.1731C12.0878 16.0551 12.0308 15.9176 12.009 15.7725L12 15.6375V8.3625Z"
                        fill="white"
                      />
                    </svg>
                  </a>
                </button>
              {/if}
              {#if twitter}
                <button>
                  <a href={twitter} target="_blank">
                    <!-- svg for twitter -->
                    <svg
                      width="23"
                      height="22"
                      viewBox="0 0 23 21"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M18.1135 0H21.6401L13.9351 8.89642L23 21H15.9026L10.3442 13.6583L3.98283 21H0.45425L8.69592 11.484L0 0.000968099H7.27758L12.3021 6.71152L18.1135 0ZM16.8763 18.8683H18.8303L6.21575 2.02033H4.11892L16.8763 18.8683Z"
                        fill="white"
                      />
                    </svg>
                  </a>
                </button>
              {/if}
              {#if tiktok}
                <button>
                  <a href={tiktok} target="_blank">
                    <!-- svg for tiktok -->
                    <svg
                      width="19"
                      height="22"
                      viewBox="0 0 19 22"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M15.074 3.44667C14.2457 2.49287 13.7892 1.26797 13.7895 0H10.0453V15.1556C10.0164 15.9757 9.67312 16.7525 9.08773 17.3225C8.50233 17.8924 7.7205 18.211 6.90689 18.2111C5.18622 18.2111 3.75638 16.7933 3.75638 15.0333C3.75638 12.9311 5.76786 11.3544 7.83992 12.0022V8.14C3.65944 7.57778 0 10.8533 0 15.0333C0 19.1033 3.34439 22 6.89477 22C10.6996 22 13.7895 18.8833 13.7895 15.0333V7.34556C15.3078 8.44537 17.1307 9.03546 19 9.03222V5.25556C19 5.25556 16.7219 5.36556 15.074 3.44667Z"
                        fill="white"
                      />
                    </svg>
                  </a>
                </button>
              {/if}
              {#if instagram}
                <button>
                  <a href={instagram} target="_blank">
                    <!-- svg for instagram -->
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 22 22"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M6.38 0H15.62C19.14 0 22 2.86 22 6.38V15.62C22 17.3121 21.3278 18.9349 20.1313 20.1313C18.9349 21.3278 17.3121 22 15.62 22H6.38C2.86 22 0 19.14 0 15.62V6.38C0 4.68792 0.672177 3.06514 1.86866 1.86866C3.06514 0.672177 4.68792 0 6.38 0ZM6.16 2.2C5.10974 2.2 4.1025 2.61721 3.35986 3.35986C2.61721 4.1025 2.2 5.10974 2.2 6.16V15.84C2.2 18.029 3.971 19.8 6.16 19.8H15.84C16.8903 19.8 17.8975 19.3828 18.6401 18.6401C19.3828 17.8975 19.8 16.8903 19.8 15.84V6.16C19.8 3.971 18.029 2.2 15.84 2.2H6.16ZM16.775 3.85C17.1397 3.85 17.4894 3.99487 17.7473 4.25273C18.0051 4.51059 18.15 4.86033 18.15 5.225C18.15 5.58967 18.0051 5.93941 17.7473 6.19727C17.4894 6.45513 17.1397 6.6 16.775 6.6C16.4103 6.6 16.0606 6.45513 15.8027 6.19727C15.5449 5.93941 15.4 5.58967 15.4 5.225C15.4 4.86033 15.5449 4.51059 15.8027 4.25273C16.0606 3.99487 16.4103 3.85 16.775 3.85ZM11 5.5C12.4587 5.5 13.8576 6.07946 14.8891 7.11091C15.9205 8.14236 16.5 9.54131 16.5 11C16.5 12.4587 15.9205 13.8576 14.8891 14.8891C13.8576 15.9205 12.4587 16.5 11 16.5C9.54131 16.5 8.14236 15.9205 7.11091 14.8891C6.07946 13.8576 5.5 12.4587 5.5 11C5.5 9.54131 6.07946 8.14236 7.11091 7.11091C8.14236 6.07946 9.54131 5.5 11 5.5ZM11 7.7C10.1248 7.7 9.28542 8.04768 8.66655 8.66655C8.04768 9.28542 7.7 10.1248 7.7 11C7.7 11.8752 8.04768 12.7146 8.66655 13.3335C9.28542 13.9523 10.1248 14.3 11 14.3C11.8752 14.3 12.7146 13.9523 13.3335 13.3335C13.9523 12.7146 14.3 11.8752 14.3 11C14.3 10.1248 13.9523 9.28542 13.3335 8.66655C12.7146 8.04768 11.8752 7.7 11 7.7Z"
                        fill="white"
                      />
                    </svg>
                  </a>
                </button>
              {/if}
              {#if twitch}
                <button>
                  <a href={twitch} target="_blank">
                    <!-- svg for twitch -->
                    <svg
                      width="22"
                      height="22"
                      viewBox="0 0 22 22"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M9.852 4.716H11.568V9.852H9.852M14.568 4.716H16.284V9.852H14.568M4.284 0L0 4.284V19.716H5.136V24L9.432 19.716H12.852L20.568 12V0M18.852 11.148L15.432 14.568H12L9 17.568V14.568H5.136V1.716H18.852V11.148Z"
                        fill="white"
                      />
                    </svg>
                  </a>
                </button>
              {/if}
              {#if spotify}
                <button>
                  <a href={spotify} target="_blank">
                    <!-- svg for spotify -->
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M15.9 8.9C12.7 7 7.35 6.8 4.3 7.75C3.8 7.9 3.3 7.6 3.15 7.15C3 6.65 3.3 6.15 3.75 6C7.3 4.95 13.15 5.15 16.85 7.35C17.3 7.6 17.45 8.2 17.2 8.65C16.95 9 16.35 9.15 15.9 8.9ZM15.8 11.7C15.55 12.05 15.1 12.2 14.75 11.95C12.05 10.3 7.95 9.8 4.8 10.8C4.4 10.9 3.95 10.7 3.85 10.3C3.75 9.9 3.95 9.45 4.35 9.35C8 8.25 12.5 8.8 15.6 10.7C15.9 10.85 16.05 11.35 15.8 11.7ZM14.6 14.45C14.4 14.75 14.05 14.85 13.75 14.65C11.4 13.2 8.45 12.9 4.95 13.7C4.6 13.8 4.3 13.55 4.2 13.25C4.1 12.9 4.35 12.6 4.65 12.5C8.45 11.65 11.75 12 14.35 13.6C14.7 13.75 14.75 14.15 14.6 14.45ZM10 0C8.68678 0 7.38642 0.258658 6.17317 0.761205C4.95991 1.26375 3.85752 2.00035 2.92893 2.92893C1.05357 4.8043 0 7.34784 0 10C0 12.6522 1.05357 15.1957 2.92893 17.0711C3.85752 17.9997 4.95991 18.7362 6.17317 19.2388C7.38642 19.7413 8.68678 20 10 20C12.6522 20 15.1957 18.9464 17.0711 17.0711C18.9464 15.1957 20 12.6522 20 10C20 8.68678 19.7413 7.38642 19.2388 6.17317C18.7362 4.95991 17.9997 3.85752 17.0711 2.92893C16.1425 2.00035 15.0401 1.26375 13.8268 0.761205C12.6136 0.258658 11.3132 0 10 0Z"
                        fill="white"
                      />
                    </svg>
                  </a>
                </button>
              {/if}
              {#if letterboxd}
                <button>
                  <a href={letterboxd} target="_blank">
                    <!-- svg for letterboxd -->
                    <svg
                      width="25px"
                      height="25px"
                      viewBox="0 0 500 500"
                      version="1.1"
                      xmlns="http://www.w3.org/2000/svg"
                      xmlns:xlink="http://www.w3.org/1999/xlink"
                    >
                      <title>letterboxd-decal-dots-pos-mono</title>
                      <defs>
                        <rect
                          id="path-1"
                          x="0"
                          y="0"
                          width="129.847328"
                          height="141.443299"
                        ></rect>
                        <rect
                          id="path-3"
                          x="0"
                          y="0"
                          width="129.847328"
                          height="141.443299"
                        ></rect>
                      </defs>
                      <g
                        id="letterboxd-decal-dots-pos-mono"
                        stroke="none"
                        stroke-width="1"
                        fill="none"
                        fill-rule="evenodd"
                      >
                        <circle
                          id="Circle"
                          fill="#202830"
                          cx="250"
                          cy="250"
                          r="250"
                        ></circle>
                        <g
                          id="Dots"
                          transform="translate(61.000000, 180.000000)"
                        >
                          <ellipse
                            id="Green"
                            fill="#FFFFFF"
                            cx="189"
                            cy="70"
                            rx="70.0786517"
                            ry="70"
                          ></ellipse>
                          <g
                            id="Blue"
                            transform="translate(248.152672, 0.000000)"
                          >
                            <mask id="mask-2" fill="white">
                              <use xlink:href="#path-1"></use>
                            </mask>
                            <g id="Mask"></g>
                            <ellipse
                              fill="#FFFFFF"
                              mask="url(#mask-2)"
                              cx="59.7686766"
                              cy="70"
                              rx="70.0786517"
                              ry="70"
                            ></ellipse>
                          </g>
                          <g id="Orange">
                            <mask id="mask-4" fill="white">
                              <use xlink:href="#path-3"></use>
                            </mask>
                            <g id="Mask"></g>
                            <ellipse
                              fill="#FFFFFF"
                              mask="url(#mask-4)"
                              cx="70.0786517"
                              cy="70"
                              rx="70.0786517"
                              ry="70"
                            ></ellipse>
                          </g>
                          <path
                            d="M129.539326,107.063108 C122.810493,96.3149291 118.921348,83.611134 118.921348,70 C118.921348,56.388866 122.810493,43.6850709 129.539326,32.9368922 C136.268159,43.6850709 140.157303,56.388866 140.157303,70 C140.157303,83.611134 136.268159,96.3149291 129.539326,107.063108 L129.539326,107.063108 Z"
                            id="Overlap"
                            fill="#202830"
                          ></path>
                          <path
                            d="M248.460674,32.9368922 C255.189507,43.6850709 259.078652,56.388866 259.078652,70 C259.078652,83.611134 255.189507,96.3149291 248.460674,107.063108 C241.731841,96.3149291 237.842697,83.611134 237.842697,70 C237.842697,56.388866 241.731841,43.6850709 248.460674,32.9368922 L248.460674,32.9368922 Z"
                            id="Overlap"
                            fill="#202830"
                          ></path>
                        </g>
                      </g>
                    </svg>
                  </a>
                </button>
              {/if}
            </div>
          {/if}
        </div>
      </div>
    {/if}
    {#if specialMessage}
      <div class="special-message">
        {#if disableHeader}🚨{/if}{@html renderSpecialMessage(
          messageContent
        )}{#if disableHeader}🚨{/if}
      </div>
    {/if}
    {#if $alertStore.message}
      <div transition:fade class="alert-message-container">
        <h2>{$alertStore.message}</h2>
      </div>
    {/if}

    <div class="grid-container">
      {#each [...new Set((isArchiveMode ? localClearedCategories : $clearedCategories).map( (category) => {
              // Create a deep copy of the category with consistent element representation
              const processedCategory = JSON.parse(JSON.stringify(category));
              // Process elements to ensure consistent representation
              processedCategory.elements = processedCategory.elements.map( (element) => {
                    if (typeof element === "object" && element.type === "image") {
                      return { ...element, _key: `image:${element.url}` };
                    }
                    return element;
                  } );
              return JSON.stringify(processedCategory);
            } ))].map((str) => {
        const category = JSON.parse(str);
        // Remove the temporary _key property we added
        category.elements = category.elements.map((element) => {
          if (element._key) {
            const { _key, ...rest } = element;
            return rest;
          }
          return element;
        });
        return category;
      }) as category}
        <ClearedCategory {category}></ClearedCategory>
      {/each}
      {#each remainingElements as element, i (element)}
        <div
          animate:flip
          on:click={() => toggleSelection(element)}
          class="grid-item {selectedElements.includes(element)
            ? 'selected'
            : ''} {shake[i] ? 'shake' : ''} {typeof element === 'object' &&
          element.type === 'image'
            ? 'has-image'
            : ''}"
        >
          {#if typeof element === "object" && element.type === "image"}
            <img src={element.url} alt={element.alt || ""} class="grid-image" />
            <button
              class="zoom-button"
              on:click|stopPropagation={() =>
                openZoomModal(element.url, element.alt)}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M15 3H21M21 3V9M21 3L14 10M9 21H3M3 21V15M3 21L10 14"
                  stroke="white"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
          {:else}
            <p>{element}</p>
          {/if}
        </div>
      {/each}
    </div>

    {#if !$gameoverStore.isOver}
      <div class="mistakes-remaining-container">
        <div class="mistakes-remaining-text-container">
          <div class="mistakes-remaining-text">mistakes remaining:&nbsp;</div>
          {#key $mistakeCount}
            <div
              in:scale={{ duration: 1000, opacity: 100 }}
              class="mistakes-remaining-number"
            >
              {4 - $mistakeCount}
            </div>{/key}
        </div>
        <div class="mistakes-playback-container">
          <div class="left-playback-number">{$mistakeCount}:05</div>
          <div class="background"></div>
          <div style="width: {playbackWidth}%;" class="foreground"></div>
          <div class="right-playback-number">{4 - $mistakeCount}:00</div>
        </div>
      </div>

      <div class="play-button-container">
        <div class="button-container">
          <button
            class="play-button left-btn"
            on:click={shuffleElements(remainingElements)}
          >
            <svg
              width="32"
              height="24"
              viewBox="0 0 32 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M30.0613 17.9386C30.2011 18.078 30.312 18.2436 30.3878 18.4259C30.4635 18.6082 30.5024 18.8037 30.5024 19.0011C30.5024 19.1986 30.4635 19.394 30.3878 19.5764C30.312 19.7587 30.2011 19.9243 30.0613 20.0636L27.0613 23.0636C26.7795 23.3454 26.3973 23.5037 25.9988 23.5037C25.6002 23.5037 25.218 23.3454 24.9363 23.0636C24.6545 22.7818 24.4961 22.3997 24.4961 22.0011C24.4961 21.6026 24.6545 21.2204 24.9363 20.9386L25.375 20.4999H25.1138C23.6017 20.4982 22.1119 20.1365 20.7674 19.4446C19.423 18.7527 18.2627 17.7506 17.3825 16.5211L12.1725 9.22239C11.5704 8.38101 10.7765 7.6952 9.85656 7.22176C8.93662 6.74831 7.91712 6.50085 6.8825 6.49989H4C3.60218 6.49989 3.22064 6.34185 2.93934 6.06055C2.65804 5.77924 2.5 5.39771 2.5 4.99989C2.5 4.60206 2.65804 4.22053 2.93934 3.93923C3.22064 3.65792 3.60218 3.49989 4 3.49989H6.8825C8.39452 3.50156 9.8844 3.86331 11.2288 4.55519C12.5733 5.24708 13.7336 6.24921 14.6138 7.47864L19.8275 14.7774C20.4296 15.6188 21.2235 16.3046 22.1434 16.778C23.0634 17.2515 24.0829 17.4989 25.1175 17.4999H25.375L24.935 17.0611C24.6532 16.7793 24.4949 16.3972 24.4949 15.9986C24.4949 15.6001 24.6532 15.2179 24.935 14.9361C25.2168 14.6543 25.599 14.496 25.9975 14.496C26.396 14.496 26.7782 14.6543 27.06 14.9361L30.0613 17.9386ZM18.1087 8.86114C18.4081 9.12297 18.7993 9.25519 19.1961 9.2287C19.593 9.20221 19.9631 9.01919 20.225 8.71989C20.8351 8.0225 21.5873 7.46363 22.4311 7.08075C23.275 6.69786 24.1909 6.49981 25.1175 6.49989H25.375L24.935 6.93864C24.6532 7.22043 24.4949 7.60262 24.4949 8.00114C24.4949 8.39965 24.6532 8.78184 24.935 9.06364C25.2168 9.34543 25.599 9.50374 25.9975 9.50374C26.396 9.50374 26.7782 9.34543 27.06 9.06364L30.06 6.06364C30.1998 5.92428 30.3108 5.75869 30.3865 5.57636C30.4622 5.39404 30.5012 5.19856 30.5012 5.00114C30.5012 4.80372 30.4622 4.60824 30.3865 4.42591C30.3108 4.24358 30.1998 4.07799 30.06 3.93864L27.06 0.938637C26.7782 0.656844 26.396 0.498535 25.9975 0.498535C25.599 0.498535 25.2168 0.656845 24.935 0.938637C24.6532 1.22043 24.4949 1.60262 24.4949 2.00114C24.4949 2.39965 24.6532 2.78184 24.935 3.06364L25.375 3.49989H25.1138C23.7591 3.50054 22.4203 3.79087 21.1872 4.3514C19.954 4.91194 18.8549 5.72972 17.9638 6.74989C17.7039 7.04949 17.5733 7.43979 17.6005 7.83544C17.6277 8.23109 17.8104 8.59987 18.1087 8.86114ZM13.8912 15.1386C13.5919 14.8768 13.2007 14.7446 12.8039 14.7711C12.407 14.7976 12.0369 14.9806 11.775 15.2799C11.1649 15.9773 10.4127 16.5361 9.56885 16.919C8.72504 17.3019 7.80912 17.5 6.8825 17.4999H4C3.60218 17.4999 3.22064 17.6579 2.93934 17.9392C2.65804 18.2205 2.5 18.6021 2.5 18.9999C2.5 19.3977 2.65804 19.7792 2.93934 20.0605C3.22064 20.3419 3.60218 20.4999 4 20.4999H6.8825C8.2371 20.4992 9.5759 20.2089 10.8091 19.6484C12.0423 19.0878 13.1413 18.2701 14.0325 17.2499C14.2928 16.9508 14.424 16.5607 14.3976 16.1651C14.3711 15.7695 14.1891 15.4004 13.8912 15.1386Z"
                fill="white"
              />
            </svg>
          </button>
          <h3>Shuffle</h3>
        </div>
        <div class="button-container">
          <div class="play-container">
            <div class="skip-btns">
              <svg
                width="28"
                height="28"
                viewBox="0 0 28 28"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g id="bi:skip-end-fill">
                  <path
                    id="Vector"
                    d="M6.125 21C6.125 21.2321 6.21719 21.4546 6.38128 21.6187C6.54537 21.7828 6.76794 21.875 7 21.875C7.23206 21.875 7.45463 21.7828 7.61872 21.6187C7.78281 21.4546 7.875 21.2321 7.875 21V15.316L18.8423 21.679C19.7873 22.225 21 21.5635 21 20.461V7.539C21 6.4365 19.789 5.7715 18.8423 6.31925L7.875 12.6822V7C7.875 6.76794 7.78281 6.54537 7.61872 6.38128C7.45463 6.21719 7.23206 6.125 7 6.125C6.76794 6.125 6.54537 6.21719 6.38128 6.38128C6.21719 6.54537 6.125 6.76794 6.125 7L6.125 21Z"
                    fill="#969696"
                  />
                </g>
              </svg>
            </div>
            <button class="play-button" on:click={handleSubmit}>
              <svg
                width="55"
                height="55"
                viewBox="0 0 55 55"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g id="Mask group">
                  <mask
                    id="mask0_29_3989"
                    style="mask-type:luminance"
                    maskUnits="userSpaceOnUse"
                    x="0"
                    y="0"
                    width="55"
                    height="55"
                  >
                    <g id="Group">
                      <g id="Group_2">
                        <path
                          id="Vector"
                          d="M27.5 53C41.5836 53 53 41.5836 53 27.5C53 13.4164 41.5836 2 27.5 2C13.4164 2 2 13.4164 2 27.5C2 41.5836 13.4164 53 27.5 53Z"
                          fill="white"
                          stroke="white"
                          stroke-width="4"
                          stroke-linejoin="round"
                        />
                        <path
                          id="Vector_2"
                          d="M22.3999 27.5002V18.667L30.0499 23.0836L37.6999 27.5002L30.0499 31.9168L22.3999 36.3334V27.5002Z"
                          fill="black"
                          stroke="black"
                          stroke-width="4"
                          stroke-linejoin="round"
                        />
                      </g>
                    </g>
                  </mask>
                  <g mask="url(#mask0_29_3989)">
                    <path
                      id="Vector_3"
                      d="M-3.1001 -3.1001H58.0999V58.0999H-3.1001V-3.1001Z"
                      fill="white"
                    />
                  </g>
                </g>
              </svg>
            </button>
            <div class="skip-btns">
              <svg
                width="28"
                height="28"
                viewBox="0 0 28 28"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g id="bi:skip-end-fill">
                  <path
                    id="Vector"
                    d="M21.875 7C21.875 6.76794 21.7828 6.54538 21.6187 6.38128C21.4546 6.21719 21.2321 6.125 21 6.125C20.7679 6.125 20.5454 6.21719 20.3813 6.38128C20.2172 6.54538 20.125 6.76794 20.125 7V12.684L9.15775 6.321C8.21275 5.775 7 6.4365 7 7.539V20.461C7 21.5635 8.211 22.2285 9.15775 21.6807L20.125 15.3178V21C20.125 21.2321 20.2172 21.4546 20.3813 21.6187C20.5454 21.7828 20.7679 21.875 21 21.875C21.2321 21.875 21.4546 21.7828 21.6187 21.6187C21.7828 21.4546 21.875 21.2321 21.875 21V7Z"
                    fill="#969696"
                  />
                </g>
              </svg>
            </div>
          </div>
          <h3>Submit</h3>
        </div>
        <div class="button-container right-btn">
          <button class="play-button" on:click={deselect}>
            <svg
              width="35"
              height="35"
              viewBox="0 0 35 35"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g id="ic:round-replay">
                <path
                  id="Vector"
                  d="M17.4998 7.29185V3.2231C17.4998 2.56685 16.7123 2.24602 16.2602 2.71269L10.7185 8.23977C10.4268 8.53144 10.4268 8.98352 10.7185 9.27519L16.2456 14.8023C16.7123 15.2544 17.4998 14.9335 17.4998 14.2773V10.2085C22.9393 10.2085 27.2414 15.196 26.0456 20.8398C25.3602 24.1502 22.6768 26.8189 19.381 27.5044C14.1748 28.5981 9.53726 25.0252 8.83726 20.1981C8.78526 19.8553 8.61286 19.5423 8.35095 19.3151C8.08904 19.088 7.75477 18.9615 7.40809 18.9585C6.53309 18.9585 5.83309 19.7314 5.94976 20.6064C6.85392 27.0085 12.9498 31.7481 19.8477 30.4064C24.3977 29.5169 28.0581 25.8564 28.9477 21.3064C30.3914 13.8252 24.7039 7.29185 17.4998 7.29185Z"
                  fill="white"
                />
              </g>
            </svg>
          </button>
          <h3>Clear</h3>
        </div>
      </div>
    {:else}
      <div class="result-button-container">
        <button
          on:click={toggleOverlay}
          style="background-color: #fff;; color: black;"
          class="results-button">VIEW RESULTS</button
        >
      </div>
    {/if}

    <!-- <div class="ad-space">
</div> -->
  </div>
</main>

{#if zoomedImage}
  <div class="zoom-modal" on:click={closeZoomModal}>
    <div class="zoom-content" on:click|stopPropagation>
      <button class="zoom-close" on:click={closeZoomModal}>×</button>
      <img src={zoomedImage} alt={zoomedAlt} />
    </div>
  </div>
{/if}

<style>
  main {
    position: absolute;
    -ms-overflow-style: none; /* IE and Edge */
    scrollbar-width: none; /* Firefox */
    padding-top: 250px; /* Default padding for mobile (ad + navbar) */
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  @media (min-width: 768px) {
    main {
      padding-top: 175px; /* Reduced padding for desktop (navbar only) */
    }
  }

  main::-webkit-scrollbar {
    display: none; /* Safari and Chrome */
  }

  .container {
    display: flex;
    align-self: center;
    flex-direction: column;
    align-items: center;
    height: 100vh;
    justify-content: flex-start;
    width: 100%;
    max-width: 420px;
    padding: 0 10px;
    box-sizing: border-box;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    touch-action: pan-x;
  }
  .gameover-overlay {
    position: absolute;
    top: 50%; /* Position at the vertical center */
    left: 50%; /* Position at the horizontal center */
    transform: translate(-50%, -50%); /* Center the element */
    background-color: white; /* Semi-transparent black overlay */
    width: 300px; /* Cover the entire parent */
    height: auto; /* Let height adjust based on content */
    max-height: calc(
      100vh - 40px
    ); /* Limit height to viewport height with more margin */
    overflow-y: auto; /* Enable vertical scrolling if content overflows */
    z-index: 9999; /* Ensure the overlay appears on top */
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 8px; /* Add padding for spacing */
    border-radius: 10px;
  }

  .gameover-gif img {
    width: 180px;
    height: 180px;
    border-radius: 5px;
  }

  .gameover-overlay h1 {
    color: #000;
    font-size: 22px;
    font-weight: 600;
    margin: 6px 0;
    margin-top: 0px;
    text-align: center;
  }

  .gameover-overlay h2,
  .timer {
    color: #000;
    font-size: 18px;
    font-weight: 500;
    margin: 6px 0;
    text-align: center;
  }

  .timer {
    margin-top: -4px;
    margin-bottom: 8px;
  }

  .results-button {
    height: 38px !important;
    width: 170px !important;
    font-size: 14px;
    text-align: center;
    line-height: normal;
    color: #fff;
    border-style: none;
    width: 170px;
    height: 38px;
    margin-bottom: 8px;
    border-radius: 100px;
    cursor: pointer;
  }

  .result-button-container {
    margin-top: 20px;
    margin-bottom: 150px;
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

  @font-face {
    font-family: "StarJedi";
    font-style: normal;
    font-weight: 500;
    src: url("/fonts/Starjedi.ttf"); /* IE9 Compat Modes */
    src:
      local(""),
      url("/fonts/Starjedi.ttf") format("embedded-opentype"),
      /* IE6-IE8 */ url("/fonts/Starjedi.ttf") format("woff2"),
      /* Super Modern Browsers */ url("/fonts/Starjedi.ttf") format("woff"),
      /* Modern Browsers */ url("/fonts/Starjedi.ttf") format("truetype"),
      /* Safari, Android, iOS */ url("/fonts/Starjedi.ttf") format("svg"); /* Legacy iOS */
  }

  .header-msg {
    font-weight: 300;
    font-size: 18px;
    margin-top: 20px;
  }

  .alert-message-container {
    position: absolute;
    top: 43.5%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 9999;
    background-color: #d9d9d9;
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
    grid-gap: 10px;
    width: 100%;
    max-width: 400px;
    min-width: 350px;
    font-weight: bold;
    padding: 2px;
    text-transform: uppercase;
    margin-bottom: 3px;
    box-sizing: border-box;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .grid-item {
    border-style: none;
    border-radius: 8px;
    background-color: #fff;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 80px;
    font-size: 14px;
    width: 90px;
    text-align: center;
    cursor: pointer;
    transition:
      background-color 0.4s,
      border-color 0.3s,
      transform 1s;
    overflow: hidden;
    font-weight: 700;
    color: black;
    line-height: 18px;
    overflow-wrap: break-word;
  }

  .grid-image {
    max-width: 90%;
    max-height: 90%;
    object-fit: contain;
  }

  .grid-item p {
    max-width: 90%;
  }

  @media (max-width: 400px) {
    .container,
    .grid-container,
    .mistakes-remaining-container,
    .play-button-container {
      padding: 0 5px;
      min-width: auto;
      width: 100%;
    }
  }

  @media only screen and (max-width: 390px) {
    .grid-item {
      font-size: 11px;
      height: 60px;
      width: 82px;
      /* padding-left: 2px; */
    }

    .grid-container {
      max-width: 92vw;
    }
  }

  @media only screen and (min-width: 501px) and (max-width: 600px) {
    .grid-item {
      font-size: 12px;
      height: 68px;
      width: 16.5vw;
    }
  }

  @media only screen and (min-width: 391px) and (max-width: 500px) {
    /* smartphones, iPhone, portrait 480x320 phones */
    .grid-item {
      font-size: 12px;
      height: 68px;
      width: 20.5vw;
      /* padding-left: 2px; */
    }

    .grid-container {
      max-width: 92vw;
    }

    .header-msg {
      margin-top: -5px;
    }
  }

  @media only screen and (max-width: 767px) and (min-width: 601px) {
    /* MODIFIED HERE */
    .grid-item {
      font-size: 14px;
      height: 70px;
      width: 10vw;
      /* padding-left: 2px; */
    }

    .header-msg {
      margin-top: -5px;
    }
  }

  /* --- Desktop adjustments START --- */
  @media (min-width: 768px) {
    /* Increase container width on desktop */
    .grid-container {
      max-width: 650px;
    }

    /* Increase size for grid items containing images on desktop */
    .grid-item.has-image {
      height: 150px;
      width: 150px;
    }
  }
  /* --- Desktop adjustments END --- */

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
    width: 100%;
    max-width: 400px;
    margin: 0 auto;
    padding: 0 10px;
    box-sizing: border-box;
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
    width: 100%;
    max-width: 400px;
    padding: 0 10px;
    box-sizing: border-box;
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
    color: #ba81c2;
    font-size: 10px;
    margin: auto;
    text-transform: lowercase;
  }

  @keyframes shake {
    0% {
      transform: translate(0, 0);
    }
    10%,
    90% {
      transform: translate(-4px, 0);
    }
    20%,
    80% {
      transform: translate(4px, 0);
    }
    30%,
    50%,
    70% {
      transform: translate(-4px, 0);
    }
    40%,
    60% {
      transform: translate(4px, 0);
    }
    100% {
      transform: translate(0, 0);
    }
  }

  .shake {
    animation: shake 0.5s ease-in-out;
  }

  /* Adjust margin and padding */

  .shoutout {
    max-width: 350px;
    min-width: 300px;
    align-self: center;
    margin-top: -5px;
    margin-bottom: 10px;
  }

  .shoutout p,
  .shoutout h3,
  .shoutout-socials {
    margin: 2px 0; /* Adjust as needed */
    overflow: line-break;
  }
  .shoutout-socials {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    margin-top: 5px;
  }

  .shoutout-name-container {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    justify-content: center;
  }

  .shoutout h3 {
    color: #fff;
    margin-right: 10px;
  }

  .shoutout button {
    border: none;
    background-color: transparent;
    padding: 0;
  }

  .shoutout button a {
    display: flex;
    align-items: center;
  }

  /* Make buttons inline */
  .shoutout-socials button {
    display: inline-block;
    margin-right: 3.5px;
  }

  /* Optionally, you can remove default button styles */
  .shoutout-socials button {
    border: none;
    background-color: transparent;
    padding: 0;
  }
  .special-message {
    margin-top: -5px;
    margin-bottom: 5px;
    font-size: 15px;
    font-style: italic;
    font-weight: 400;
  }

  @media only screen and (max-width: 450px) {
    .shoutout-socials button {
      margin-top: -1px;
    }

    .shoutout p {
      display: none;
    }
  }

  /* Add new styles for image grid items */
  .grid-item.selected:has(img) {
    background-color: #cbff70;
  }

  .grid-item.selected:has(img):hover {
    background-color: #cbff70;
  }

  /* Zoom button styles */
  .zoom-button {
    position: absolute;
    top: 5px;
    right: 5px;
    background: rgba(0, 0, 0, 0.5);
    border: none;
    border-radius: 4px;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  .grid-item.has-image {
    position: relative;
  }

  .grid-item.has-image:hover .zoom-button {
    opacity: 1;
  }

  /* Zoom modal styles */
  .zoom-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
  }

  .zoom-content {
    position: relative;
    max-width: 90vw;
    max-height: 90vh;
  }

  .zoom-content img {
    max-width: 100%;
    max-height: 90vh;
    object-fit: contain;
  }

  .zoom-close {
    position: absolute;
    top: -40px;
    right: 0;
    background: none;
    border: none;
    color: white;
    font-size: 32px;
    cursor: pointer;
    padding: 5px;
  }

  :global(a.special-message-link),
  :global(a.special-message-link:visited),
  :global(a.special-message-link:hover),
  :global(a.special-message-link:active) {
    color: #ff6b00;
  }

  /* Only show zoom button on desktop */
  @media (max-width: 767px) {
    .zoom-button {
      display: none;
    }
  }
</style>
