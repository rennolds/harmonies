import { writable } from "svelte/store";
import { browser } from "$app/environment";


export const visited = writable(browser && localStorage.getItem("visited") || false)
visited.subscribe((val) => {
    if (browser) return (localStorage.visited = val);
});

function getEasternTimeDate() {
    const date = new Date();
    const easternTimeOffset = -4; // Eastern Time is UTC-4 during standard time
    const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
    const easternTime = new Date(utc + (3600000 * easternTimeOffset));
    return easternTime.toLocaleDateString('en-US', {timeZone: 'America/New_York'});
} 

export const currentGameDate = writable(browser && localStorage.getItem("currentGameDate") || getEasternTimeDate())
currentGameDate.subscribe((val) => {
    if (browser) return (localStorage.currentGameDate = val);
});


let parsed = "";
const itemNameGuess = "guessHistory"
if (browser) {
    const retrieved = localStorage.getItem(itemNameGuess)
    if (retrieved) {
        parsed = JSON.parse(retrieved);
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
