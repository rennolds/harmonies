<!-- src/routes/archives/+page.svelte -->
<script>
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { browser } from "$app/environment";
    import Navbar from '../Navbar.svelte';
    import Calendar from './Calendar.svelte';
    import '../styles.css';
    import moment from 'moment';
    import 'moment-timezone';
  
    // Initialize date to current month
    let currentMonth = moment().month();
    let currentYear = moment().year();
    
    function handleDateSelect(selectedDate) {
      // Format the date as MM/DD/YYYY to match your game's date format
      const formattedDate = moment(selectedDate).format('MM/DD/YYYY');
      
      // Here you would load the specific board for that date
      // For now we'll just navigate back to the home page with a query parameter
      goto(`/?date=${formattedDate}`);
    }
  
    function nextMonth() {
      if (currentMonth === 11) {
        currentMonth = 0;
        currentYear += 1;
      } else {
        currentMonth += 1;
      }
    }
  
    function prevMonth() {
      if (currentMonth === 0) {
        currentMonth = 11;
        currentYear -= 1;
      } else {
        currentMonth -= 1;
      }
    }
  </script>
  
  <svelte:head>
    <title>Harmonies Archives</title>
  </svelte:head>
  
  <div class="archive-page">
    <Navbar toggleHelpOverlay={() => {}} playlist="" />
    
    <div class="archive-content">
      <div class="header">
        <!-- <h1>Archives</h1>
        <p>Browse and play past Harmonies puzzles</p> -->
      </div>
      
      <div class="month-selector">
        <button on:click={prevMonth} class="month-btn">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 18L9 12L15 6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <h2>{moment().month(currentMonth).format('MMMM')} {currentYear}</h2>
        <button on:click={nextMonth} class="month-btn">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 18L15 12L9 6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
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
      padding-top: 50px;
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
    
    .month-btn:hover {
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