import { writable } from "svelte/store";
import { browser } from "$app/environment";


export const visited = writable(browser && localStorage.getItem("visited") || false)
visited.subscribe((val) => {
    if (browser) return (localStorage.visited = val);
});

export const currentGameDate = writable(browser && localStorage.getItem("currentGameDate") || new Date("01/01/2000"))
currentGameDate.subscribe((val) => {
    if (browser) return (localStorage.currentGameDate = val);
});


let parsed = "";
const itemNameGuess = "guessHistory"
if (browser) {
    const retrieved = localStorage.getItem(itemNameGuess)
    if (retrieved) {
        parsed = JSON.parse(retrieved);
        if (typeof(parsed) == "string") {
            parsed = JSON.parse(parsed);
        }
    }
}

export const guessHistory = writable(browser && parsed === null ? [] : parsed)
guessHistory.subscribe((value) => {
    if (browser) return (localStorage.setItem(itemNameGuess, JSON.stringify(value)))
});


parsed = "";
const itemNameCleared = "clearedCategories"
if (browser) {
    const retrieved = localStorage.getItem(itemNameCleared)
    if (retrieved) {
        parsed = JSON.parse(retrieved);
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
        solveListParsed = JSON.parse(retrieved);
    }
}
export const solveList = writable(browser && solveListParsed === null ? [] : solveListParsed);
solveList.subscribe((val) => {
    if (browser) return (localStorage.setItem(solveListName, JSON.stringify(val)));
});