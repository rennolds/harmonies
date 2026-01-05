/**
 * Date utility functions
 */
import moment from 'moment-timezone';

const TIMEZONE = 'America/New_York';

/**
 * Get current date in EST as MM/DD/YYYY (Client/JSON format)
 */
export function getTodayUS() {
  return moment().tz(TIMEZONE).format('MM/DD/YYYY');
}

/**
 * Get current date in EST as YYYY-MM-DD (DB format)
 */
export function getTodayEST() {
  return moment().tz(TIMEZONE).format('YYYY-MM-DD');
}

/**
 * Convert date from MM/DD/YYYY (JSON format) to YYYY-MM-DD (DB format)
 */
export function convertDateToDBFormat(dateStr) {
  if (!dateStr) return null;
  // If already in YYYY-MM-DD format, return as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  const [month, day, year] = parts;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

/**
 * Convert date from YYYY-MM-DD (DB format) to MM/DD/YYYY (JSON format)
 */
export function convertDateFromDBFormat(dateStr) {
  if (!dateStr) return null;
  // If already in MM/DD/YYYY format, return as is
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;

  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  const [year, month, day] = parts;
  return `${month}/${day}/${year}`;
}
