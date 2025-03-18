<script>
  import { goto } from '$app/navigation';
  // import TopAdBanner from '../TopAdBanner.svelte';
  import Navbar from '../Navbar.svelte';
  import Calendar from './Calendar.svelte';
  import '../styles.css';
  import moment from 'moment';
  import 'moment-timezone';

  // Define launch date constants
  const LAUNCH_DATE = moment('03/29/2024', 'MM/DD/YYYY');
  const LAUNCH_MONTH = LAUNCH_DATE.month();
  const LAUNCH_YEAR = LAUNCH_DATE.year();
  
  // Get current date info for future month restriction
  const TODAY = moment();
  const CURRENT_MONTH = TODAY.month();
  const CURRENT_YEAR = TODAY.year();

  // Initialize date to current month or launch month if current is before launch
  let currentMonth = CURRENT_MONTH;
  let currentYear = CURRENT_YEAR;
  
  // Ensure we don't start before the launch date
  if (currentYear < LAUNCH_YEAR || (currentYear === LAUNCH_YEAR && currentMonth < LAUNCH_MONTH)) {
    currentMonth = LAUNCH_MONTH;
    currentYear = LAUNCH_YEAR;
  }
  
  function handleDateSelect(selectedDate) {
    // Format the date as MM/DD/YYYY to match your game's date format
    const formattedDate = moment(selectedDate).format('MM/DD/YYYY');
    gtag('event', 'play_archive', {
        'date': moment(selectedDate).format('MM/DD/YYYY'),
    });
    // Navigate to the home page with the date parameter
    goto(`/?date=${formattedDate}`);
  }

  function nextMonth() {
    // Calculate the new month and year
    let newMonth = currentMonth + 1;
    let newYear = currentYear;
    
    if (newMonth > 11) {
      newMonth = 0;
      newYear += 1;
    }
    
    // Check if the new date would be beyond the current month/year
    if (newYear > CURRENT_YEAR || (newYear === CURRENT_YEAR && newMonth > CURRENT_MONTH)) {
      // Do nothing - we're already at the latest available month
      return;
    }
    
    // If we pass validation, update the state
    currentMonth = newMonth;
    currentYear = newYear;
  }

  function prevMonth() {
    // Calculate the new month and year
    let newMonth = currentMonth - 1;
    let newYear = currentYear;
    
    if (newMonth < 0) {
      newMonth = 11;
      newYear -= 1;
    }
    
    // Check if new date would be before launch date
    if (newYear < LAUNCH_YEAR || (newYear === LAUNCH_YEAR && newMonth < LAUNCH_MONTH)) {
      // Do nothing - we're already at the earliest available month
      return;
    }
    
    // If we pass validation, update the state
    currentMonth = newMonth;
    currentYear = newYear;
  }
  
  // Set isArchiveMode to true since we're on the archives page
  const isArchiveMode = true;
  
  // Computed properties to check month navigation limits
  $: isAtEarliestMonth = currentMonth === LAUNCH_MONTH && currentYear === LAUNCH_YEAR;
  $: isAtLatestMonth = currentMonth === CURRENT_MONTH && currentYear === CURRENT_YEAR;
</script>

<svelte:head>
  <title>Harmonies Archives</title>
</svelte:head>

<!-- <TopAdBanner/> -->

<div class="archive-page">
  <Navbar toggleHelpOverlay={() => {}} playlist="" isArchiveMode={isArchiveMode} />
  
  <div class="archive-content">
    <div class="header">
      <!-- <h1>Archives</h1>
      <p>Browse and play past Harmonies puzzles</p> -->
    </div>
    
    <div class="month-selector">
      <button on:click={prevMonth} class="month-btn" disabled={isAtEarliestMonth}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 18L9 12L15 6" stroke={isAtEarliestMonth ? "#666" : "white"} stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <h2>{moment().month(currentMonth).format('MMMM')} {currentYear}</h2>
      <button on:click={nextMonth} class="month-btn" disabled={isAtLatestMonth}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 18L15 12L9 6" stroke={isAtLatestMonth ? "#666" : "white"} stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>
    
    <Calendar 
      {currentMonth} 
      {currentYear} 
      onSelectDate={handleDateSelect} 
    />
  </div>
</div>

<style>
  /* Full page styles */
  .archive-page {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-height: 100vh;
    width: 100%;
    padding-top: 100px;
  }
  
  /* Content container */
  .archive-content {
    width: 100%;
    max-width: 800px;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 20px;
    box-sizing: border-box;
  }
  
  /* Header styles */
  .header {
    text-align: center;
    margin-bottom: 30px;
    width: 100%;
  }
  
  .header h1 {
    font-size: 28px;
    color: white;
    margin-bottom: 10px;
  }
  
  .header p {
    font-size: 16px;
    color: rgba(255, 255, 255, 0.8);
    font-weight: 400;
  }
  
  /* Month selector styles */
  .month-selector {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    max-width: 600px;
    margin-bottom: 20px;
  }
  
  .month-selector h2 {
    font-size: 24px;
    color: white;
    margin: 0;
  }
  
  .month-btn {
    background: rgba(255, 255, 255, 0.1);
    border: none;
    width: 48px;
    height: 48px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  
  .month-btn:disabled {
    background: rgba(255, 255, 255, 0.05);
    cursor: not-allowed;
  }
  
  .month-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.2);
  }
  
  /* Media queries for responsiveness */
  @media (max-width: 600px) {

    .archive-content {
      padding: 15px;
    }
    
    .header h1 {
      font-size: 24px;
    }
    
    .month-selector h2 {
      font-size: 20px;
    }
    
    .month-btn {
      width: 40px;
      height: 40px;
    }
  }
</style>