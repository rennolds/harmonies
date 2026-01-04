import { writable } from "svelte/store";
import { browser } from "$app/environment";
import { getTodayUS } from "$lib/dateUtils";

// Add this new store to track whether we're in archive mode
// export const isArchive = writable(false);

export const visited = writable(browser && localStorage.getItem("visited") || false)
visited.subscribe((val) => {
    if (browser) return (localStorage.visited = val);
});
  
  // Use formatted string date instead of Date object
  export const currentGameDate = writable(browser && localStorage.getItem("currentGameDate") || getTodayUS())
  currentGameDate.subscribe((val) => {
      if (browser) return (localStorage.currentGameDate = val);
});

const safeJsonParse = (value, fallback) => {
    if (value == null) return fallback;
    if (typeof value !== "string") return fallback;
    const trimmed = value.trim();
    if (!trimmed) return fallback;
    try {
        return JSON.parse(trimmed);
    } catch {
        return fallback;
    }
};


let parsed = [];
const itemNameGuess = "guessHistory"
if (browser) {
    const retrieved = localStorage.getItem(itemNameGuess)
    if (retrieved) {
        // Support legacy "double-encoded" values while preventing JSON.parse("") crashes
        const first = safeJsonParse(retrieved, []);
        if (typeof first === "string") {
            parsed = safeJsonParse(first, []);
        } else {
            parsed = Array.isArray(first) ? first : [];
        }
    }
}

export const guessHistory = writable(browser && parsed === null ? [] : parsed)
guessHistory.subscribe((value) => {
    if (browser) return (localStorage.setItem(itemNameGuess, JSON.stringify(value)))
});


parsed = [];
const itemNameCleared = "clearedCategories"
if (browser) {
    const retrieved = localStorage.getItem(itemNameCleared)
    if (retrieved) {
        const parsedValue = safeJsonParse(retrieved, []);
        parsed = Array.isArray(parsedValue) ? parsedValue : [];
    }
}
export const clearedCategories = writable(browser && parsed === null ? [] : parsed)
clearedCategories.subscribe((value) => {
    if (browser) return (localStorage.setItem(itemNameCleared, JSON.stringify(value)))
});


export const mistakeCount = writable(browser && localStorage.getItem("mistakeCount") || 0)
mistakeCount.subscribe((val) => {
    if (browser) return (localStorage.mistakeCount = val);
});



// PLAYED

let playedParsed = 0;
const playedName = "played";
if (browser) {
    const retrieved = localStorage.getItem(playedName);
    if (retrieved) {
        playedParsed = parseInt(retrieved, 10);
    }
}
export const played = writable(browser && playedParsed === null ? 0 : playedParsed);
played.subscribe((val) => {
    if (browser) return (localStorage.setItem(playedName, val));
});

/* 
  currentStreak 
*/
let currentStreakParsed = 0;
const currentStreakName = "currentStreak";
if (browser) {
    const retrieved = localStorage.getItem(currentStreakName);
    if (retrieved) {
        currentStreakParsed = parseInt(retrieved, 10);
    }
}
export const currentStreak = writable(browser && currentStreakParsed === null ? 0 : currentStreakParsed);
currentStreak.subscribe((val) => {
    if (browser) return (localStorage.setItem(currentStreakName, val));
});

/* 
  maxStreak 
*/
let maxStreakParsed = 0;
const maxStreakName = "maxStreak";
if (browser) {
    const retrieved = localStorage.getItem(maxStreakName);
    if (retrieved) {
        maxStreakParsed = parseInt(retrieved, 10);
    }
}
export const maxStreak = writable(browser && maxStreakParsed === null ? 0 : maxStreakParsed);
maxStreak.subscribe((val) => {
    if (browser) return (localStorage.setItem(maxStreakName, val));
});

/*
  solveList
*/
let solveListParsed = [];
const solveListName = "solveList";
if (browser) {
    const retrieved = localStorage.getItem(solveListName);
    if (retrieved) {
        const parsedValue = safeJsonParse(retrieved, []);
        solveListParsed = Array.isArray(parsedValue) ? parsedValue : [];
    }
}
export const solveList = writable(browser && solveListParsed === null ? [] : solveListParsed);
solveList.subscribe((val) => {
    if (browser) return (localStorage.setItem(solveListName, JSON.stringify(val)));
});

/*
  completedDays - Stores a list of dates for which the user has completed the board
*/
let completedDaysParsed = [];
const completedDaysName = "completedDays";
if (browser) {
    const retrieved = localStorage.getItem(completedDaysName);
    if (retrieved) {
        const parsedValue = safeJsonParse(retrieved, []);
        completedDaysParsed = Array.isArray(parsedValue) ? parsedValue : [];
    }
}
export const completedDays = writable(browser && completedDaysParsed === null ? [] : completedDaysParsed);
completedDays.subscribe((val) => {
    if (browser) return (localStorage.setItem(completedDaysName, JSON.stringify(val)));
});

export const todaysProgressDate = writable(
    browser && localStorage.getItem("todaysProgressDate") || ""
  );
  todaysProgressDate.subscribe((val) => {
    if (browser) return (localStorage.todaysProgressDate = val);
  });