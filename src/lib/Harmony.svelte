<!-- CategoryDisplay.svelte -->
<script>
    export let category;
  </script>
  
  <div class="category-display">
    {category}
  </div>
  
  <style>
    .category-display {
      text-align: center;
      margin-bottom: 10px;
      font-weight: bold;
    }
  </style>