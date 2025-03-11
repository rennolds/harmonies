<script>
    import './styles.css';
    
    export let data;
  </script>
  
  <div class:game-body={data.isMainGame}>
    <slot />
  </div>
  
  <style>
    .game-body {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
  </style>