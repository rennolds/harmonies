<script>
    export let onClose;

    function handleClose() {
        onClose();
    }

</script>


<div class="help-overlay">
    <button class="exit-btn" on:click={handleClose}>
        <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g id="ph:x">
          <path id="Vector" d="M20.8878 19.7376C20.9633 19.8131 21.0232 19.9027 21.064 20.0014C21.1049 20.1 21.1259 20.2057 21.1259 20.3125C21.1259 20.4192 21.1049 20.5249 21.064 20.6236C21.0232 20.7222 20.9633 20.8118 20.8878 20.8873C20.8123 20.9628 20.7227 21.0227 20.6241 21.0635C20.5254 21.1044 20.4197 21.1254 20.313 21.1254C20.2062 21.1254 20.1005 21.1044 20.0019 21.0635C19.9032 21.0227 19.8136 20.9628 19.7381 20.8873L13.0005 14.1486L6.2628 20.8873C6.11034 21.0398 5.90356 21.1254 5.68795 21.1254C5.47234 21.1254 5.26557 21.0398 5.11311 20.8873C4.96065 20.7349 4.875 20.5281 4.875 20.3125C4.875 20.0969 4.96065 19.8901 5.11311 19.7376L11.8518 13L5.11311 6.26231C4.96065 6.10985 4.875 5.90307 4.875 5.68746C4.875 5.47186 4.96065 5.26508 5.11311 5.11262C5.26557 4.96016 5.47234 4.87451 5.68795 4.87451C5.90356 4.87451 6.11034 4.96016 6.2628 5.11262L13.0005 11.8513L19.7381 5.11262C19.8906 4.96016 20.0973 4.87451 20.313 4.87451C20.5286 4.87451 20.7353 4.96016 20.8878 5.11262C21.0403 5.26508 21.1259 5.47186 21.1259 5.68746C21.1259 5.90307 21.0403 6.10985 20.8878 6.26231L14.1491 13L20.8878 19.7376Z" fill="black"/>
          </g>
          </svg>         
    </button>
    <div class="help-header">
      <h1>How to Play</h1>
    </div>
    <div class="help-description">
      <p>Find groups of four squares that share a common connection. Everything is music related!</p>
      <ul>
        <li>Select four squares and tap the submit/play button to check your guess.</li>
        <li>After 4 mistakes all harmonies are revealed.</li>
      </ul>
      <p>Example of a revealed Harmony board:</p>
    </div>
    <div class="help-categories">
      <div class="help-svg-container"> 
        <p>Easiest</p>
        <svg width="330" height="59" viewBox="0 0 330 59" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="330" height="59" rx="6" fill="#CBFF70"/>
        </svg>
      </div>
      <div class="help-svg-container"> 
        <p>Harder</p>
        <svg width="330" height="59" viewBox="0 0 330 59" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="330" height="59" rx="6" fill="#CBFF70"/>
        </svg>
      </div>
      <div class="help-svg-container"> 
        <p>You're gonna need to be a music nerd...</p>
        <svg width="330" height="59" viewBox="0 0 330 59" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="330" height="59" rx="6" fill="#CBFF70"/>
        </svg>
      </div>
      <div class="help-svg-container"> 
        <p>Maybe Anthony Fantano would know.</p>
        <svg width="330" height="59" viewBox="0 0 330 59" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="330" height="59" rx="6" fill="#CBFF70"/>
        </svg>
      </div>
    </div>

    <div class="help-description">
      <p>
        Each board has one solution. But watch out for squares that might belong to multiple categories...
      </p>
      <p> 
        Feeling stuck? Click the playlist button at the top to listen to today's squares. Maybe you'll find some inspiration.
      </p>
    </div>
</div>


<style>
    .help-overlay {
      position: absolute;
      top: 52%; /* Position at the vertical center */
      left: 50%; /* Position at the horizontal center */
      transform: translate(-50%, -50%); /* Center the element */
      width: 371px;
      height: 694px;
      border-radius: 6px;
      background: #D9D9D9;
      z-index: 9999;
      color: #000;
    }

    .exit-btn {
      background: none;
      border-style: none;
      float: right;
      margin-top: 5px;
    }

    .exit-btn:hover {
      cursor: pointer;
    }

    .help-header {
        font-size: 12px;
        font-style: normal;
        font-weight: 600;
        line-height: normal;
        text-align: left;
        margin-left: 20px;
    }

    .help-description {
        font-size: 14px;
        font-style: normal;
        font-weight: 400;
        line-height: normal;
        text-align: left;
        margin-left: 20px;
    }

    .help-description li {
        margin-left: -30px;
    }

    .help-svg-container {
        margin-bottom: 0px; /* Adjust this value as needed */
    }

    .help-svg-container p {
        font-size: 8px;
        font-style: italic;
        font-weight: 400;
        line-height: normal;
        text-align: left;
        margin-left: 25px;
    }

</style>