<!-- src/routes/archives/Calendar.svelte -->
<script>
    import { onMount } from 'svelte';
    import moment from 'moment';
    import 'moment-timezone';
    import gameBoards from '$lib/data/gameboards.json';
    import { completedDays } from '../store.js';
    
    export let currentMonth;
    export let currentYear;
    export let onSelectDate;
    
    // To track which days have gameboards
    let availableDates = [];
    
    $: calendarDays = generateCalendarDays(currentMonth, currentYear);
    
    onMount(() => {
      // Extract available dates from gameboards.json
      if (gameBoards) {
        availableDates = Object.keys(gameBoards);
      }
    });
    
    function generateCalendarDays(month, year) {
      const firstDay = moment([year, month]).startOf('month');
      const daysInMonth = firstDay.daysInMonth();
      const dayOfWeek = firstDay.day(); // 0 is Sunday
      
      let calendarGrid = [];
      
      // Add empty cells for days before the 1st of the month
      for (let i = 0; i < dayOfWeek; i++) {
        calendarGrid.push({
          date: null,
          day: '',
          isAvailable: false,
          isCompleted: false
        });
      }
      
      // Add days of the month
      for (let i = 1; i <= daysInMonth; i++) {
        const currentDate = moment([year, month, i]).format('MM/DD/YYYY');
        const isAvailable = availableDates.includes(currentDate);
        const isPast = moment(currentDate, 'MM/DD/YYYY').isSameOrBefore(moment(), 'day');
        const isCompleted = $completedDays && $completedDays.includes(currentDate);
        
        calendarGrid.push({
          date: currentDate,
          day: i,
          isAvailable,
          isPast,
          isCompleted
        });
      }
      
      return calendarGrid;
    }
    
    function handleDayClick(day) {
      if (day.date && day.isPast) {
        // Check if we have a gameboard for this date
        const hasGameboard = availableDates.includes(day.date);
        if (hasGameboard) {
          onSelectDate(day.date);
        } else {
          // Show feedback that this day has no puzzle available
          alert('No puzzle available for this date');
        }
      }
    }
  </script>
  
  <div class="calendar-container">
    <div class="calendar">
      <div class="weekdays">
        <div class="weekday">Sun</div>
        <div class="weekday">Mon</div>
        <div class="weekday">Tue</div>
        <div class="weekday">Wed</div>
        <div class="weekday">Thu</div>
        <div class="weekday">Fri</div>
        <div class="weekday">Sat</div>
      </div>
      
      <div class="days-grid">
        {#each calendarDays as day}
          <div 
            class="day-cell {!day.date ? 'empty' : ''} {day.isPast ? 'past' : 'future'} {day.isAvailable ? 'available' : ''} {day.isCompleted ? 'completed' : ''}"
            on:click={() => handleDayClick(day)}
          >
            {day.day}
          </div>
        {/each}
      </div>
    </div>
  </div>
  
  <style>
    .calendar-container {
      width: 100%;
      display: flex;
      justify-content: center;
    }
  
    .calendar {
      width: 100%;
      max-width: 600px;
      background-color: rgba(0, 0, 0, 0.2);
      border-radius: 12px;
      padding: 20px;
      box-sizing: border-box;
    }
    
    .weekdays {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      margin-bottom: 15px;
    }
    
    .weekday {
      text-align: center;
      font-size: 16px;
      font-weight: 600;
      color: #BA81C2;
      padding: 10px 0;
    }
    
    .days-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      grid-gap: 10px;
    }
    
    .day-cell {
      aspect-ratio: 1/1; /* Makes cells square */
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: 500;
      background-color: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .day-cell.empty {
      background-color: transparent;
      cursor: default;
    }
    
    .day-cell.past {
      color: white;
    }
    
    .day-cell.future {
      color: rgba(255, 255, 255, 0.3);
      cursor: not-allowed;
    }
    
    .day-cell.available {
      background-color: rgba(186, 129, 194, 0.2);
      border: 1px solid #BA81C2;
    }
    
    .day-cell.completed {
      background-color: rgba(75, 181, 67, 0.4);
      border: 1px solid #4BB543;
      color: white;
    }
    
    .day-cell.past:hover:not(.empty) {
      background-color: rgba(255, 255, 255, 0.2);
      transform: scale(1.05);
    }
    
    /* Responsive adjustments */
    @media (max-width: 600px) {
      .calendar {
        padding: 15px;
      }
      
      .weekday {
        font-size: 14px;
        padding: 5px 0;
      }
      
      .day-cell {
        font-size: 16px;
      }
      
      .days-grid {
        grid-gap: 5px;
      }
    }
</style>