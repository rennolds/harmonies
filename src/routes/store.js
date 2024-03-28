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
