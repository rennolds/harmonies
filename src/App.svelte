<script>
    import { flip } from 'svelte/animate';
    import { quintOut } from 'svelte/easing'

    /*

      need to get the associations for the day. color, name, elements
      get list of elements, and shuffle the order
      








    */

    const associations = [
      {
        'difficulty': 1,
        'name': 'Songs from Olivia Rodrigo\'s "GUTS" album',
        'elements': ['all-american bitch', 'get him back!', 'pretty isn\'t pretty', 'bad idea right?']
      },
      {
        'difficulty': 2,
        'name': 'All things Panic! At the Disco',
        'elements': ['Panic! At the Disco', 'Pretty. Odd.', 'I Write Sins Not Tragedies', 'Don\'t Threaten Me With A Good Time']
      },
      {
        'difficulty': 3,
        'name': 'Artists with alphanumeric characters in their name',
        'elements': ['Ke$ha', 'P!nk', '$uicideboy$', 'AS@P Rocky']
      },
      {
        'difficulty': 4,
        'name': 'blink-182 and their members side projects',
        'elements': ['Boxcar Racer', '+44', 'Angels & Airwaves', 'blink-182']
      }
    ]

    let elements = associations.flatMap(assoc => assoc.elements);
    let complete = [];
    let incomplete = associations;
    // let grid = generateRandomGrid();
  

    function generateRandomList() {
      // Shuffle the elements

      for (let i = elements.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [elements[i], elements[j]] = [elements[j], elements[i]]; // Swap
      }
    }

    generateRandomList();


    $: selectedElements = [];

    function toggleSelection(element) {
      const index = selectedElements.indexOf(element);
      if (index > -1) {
        selectedElements.splice(index, 1); // Remove the element if it's already selected
        selectedElements = selectedElements;
      } else if (selectedElements.length < 4) {
        selectedElements.push(element); // Add the element if less than 4 are selected
        selectedElements = selectedElements;
        
      }
      // If trying to select more than 4, do nothing or you can alert the user
      console.log(selectedElements);
    }

    function checkMatch() {
      for (const assoc of associations) {
        const matchedElements = selectedElements.filter(element => assoc.elements.includes(element));
        if (matchedElements.length === 4) {
          // Correct guess

          console.log(matchedElements);
          // swap selected elements
          swapElements(matchedElements);

          
          selectedElements = [];


          console.log("MATCH FOUND");
          break;

        } else if (matchedElements.length === 3) {
          console.log("ONE AWAY");
          break;
        } else {
          console.log("MISTAKE");
        }
      }
    }

    function swapElements(matchedElements) {
      console.log('in swap elements');
      //for each element in matchedElements, find it's index
      let availableColumn = 0;

      for (let i = 0; i < grid.length; i++) {


          const row = grid[i];
          for (let j = 0; j < row.length; j++) {
              const currentItem = row[j];
              if (matchedElements.includes(currentItem)) {
                console.log(grid[i][j]);
                
                let temp = grid[0][availableColumn];
                grid[0][availableColumn] = grid[i][j];
                grid[i][j] = temp;
                availableColumn++;
                flipped[i][j] = true;
                flipped[0][availableColumn] = true;
                
                setTimeout(() => {
                  flipped[i][j] = false;
                  flipped[0][availableColumn] = false;
                }, 250);


              }
          }
      }
    }


  </script>

  <main>
    <div class="revealed-container"> 


    </div>

    <div class="grid-container">
      <!-- class:flip-it={flipped[index]} -->
      <!-- {#each grid as row, rowIndex} -->
      {#each elements as element, index}
        <!-- {#each row as cell, cellIndex} -->
            <div 
              class="grid-item {selectedElements.includes(element) ? 'selected' : ''}" 
              on:click={() => toggleSelection(element)}
            >
              {element}
            </div>
      {/each}
    </div>

    <button on:click={checkMatch}>Check Match</button>
  </main>

  <style>
    /* 
    370px is grid
    85px 85px
    */
    
    .revealed-row {
      grid-column: 1 / -1;
      background-color: blue;
      height: 100px;
    } 
  
    .revealed-container {
      position: absolute;
      display: block;

    }

    .grid-container {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
        max-width: 400px;
        margin: auto;
    }
    
    .grid-item {
        background-color: #f0f0f0;
        border: 2px solid #ddd;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100px;
        width: 100px;

        padding: 20px;
        text-align: center;
        cursor: pointer; /* Optional: Changes the cursor to indicate clickable items */
        transition: background-color 0.3s, border-color 0.3s, transform 1s;
    }

    .flip-it {
		  transform: rotateY(360deg);
    }

    .selected {
      border-color: #666; /* Change as needed */
      background-color: #fff; /* Change as needed */
    }
</style>
