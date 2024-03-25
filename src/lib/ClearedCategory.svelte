<script>
    import { sineInOut } from "svelte/easing";
    import { fade } from "svelte/transition";
    export let category;

    let isActive = true;
    const customTransition = () => {
        return {
        css: (t) => {
            return `
            transform: scale(${t});
            `;
        },
        delay: 1500,
        duration: 1000,
        easing: sineInOut
        };
    };
    
</script>
<div transition:customTransition style="background-color: {category.color}" class="full-row">
    <h2>{category.name}</h2>
    <p>{category.elements[0]}, {category.elements[1]}, {category.elements[2]}, {category.elements[3]}</p>
</div>

<style>
body {
    background-color: red;
}

.full-row {
    grid-column: 1 / -1; /* Spans entire row */
    border-style: none;
    border-radius: 8px;
    color: black;
    line-height: 25px;
    overflow: hidden;
    height: 100%;
    width: 100%;
    justify-content: center;
    display: flex;
    flex-direction: column;
}

@media only screen and (max-width: 600px)  { /* smartphones, iPhone, portrait 480x320 phones */ 
    .full-row {
    height: 20vw;
    }
}

@media only screen and (max-width: 1200px) and (min-width: 601px) {
    .full-row {
    height: 90px;
    }
}

h2 {
    position: relative;
    left: 50;
    font-size: 18px;
    margin-bottom: -12px;
}

p {
    font-size: 11px;
}

</style>