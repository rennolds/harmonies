<script>
    import { sineInOut } from "svelte/easing";
    export let category;

    let isActive = true;
    const customTransition = () => {
        return {
        css: (t) => {
            return `
            transform: scale(${t});
            `;
        },
        delay: 1250,
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
    height: 100px;
    border-style: none;
    border-radius: 8px;
    color: black;
    line-height: 25px;
    overflow: hidden;
    height: 90px; 
    justify-content: center;
    display: flex;
    flex-direction: column;
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