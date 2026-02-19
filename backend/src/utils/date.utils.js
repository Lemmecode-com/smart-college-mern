/**
 * DATE-DAY MAPPING UTILITIES
 * 
 * Purpose:
 * - Calculate all dates for a specific day (MON, TUE, etc.) in a date range
 * - Validate if a date matches a day (e.g., is Feb 17 a Monday?)
 * - Get current day name (MON, TUE, etc.)
 * - Check if date is in past/future
 */

/**
 * Get day name from date
 * @param {Date|string} date - Date object or ISO string
 * @returns {string} Day name (MON, TUE, WED, THU, FRI, SAT, SUN)
 */
exports.getDayName = (date) => {
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const d = new Date(date);
  return days[d.getDay()];
};

/**
 * Check if a date matches a specific day
 * @param {Date|string} date - Date to check
 * @param {string} dayName - Day name (MON, TUE, etc.)
 * @returns {boolean} True if date matches day
 */
exports.isDateMatchesDay = (date, dayName) => {
  const actualDay = this.getDayName(date);
  return actualDay === dayName;
};

/**
 * Get all dates for a specific day within a date range
 * @param {string} dayName - Day name (MON, TUE, etc.)
 * @param {Date} startDate - Range start
 * @param {Date} endDate - Range end
 * @returns {Date[]} Array of matching dates
 */
exports.getAllDatesForDay = (dayName, startDate, endDate) => {
  const dates = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    if (this.getDayName(current) === dayName) {
      dates.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }

  return dates;
};

/**
 * Get semester date range from academic year
 * @param {string} academicYear - "2025-2026"
 * @param {number} semester - Semester number
 * @returns {{start: Date, end: Date}} Date range
 */
exports.getSemesterDateRange = (academicYear, semester) => {
  const [startYear] = academicYear.split('-').map(Number);
  
  // Assuming semester starts:
  // Odd semesters (1, 3, 5, 7): August
  // Even semesters (2, 4, 6, 8): January
  
  let startMonth;
  if (semester % 2 === 1) {
    // Odd semester - August
    startMonth = 7; // 0-indexed (July = 7, so August 1st)
  } else {
    // Even semester - January
    startMonth = 0; // January
  }

  const startDate = new Date(startYear, startMonth, 1);
  
  // End date: 6 months later
  const endDate = new Date(startYear, startMonth + 6, 30);

  return { start: startDate, end: endDate };
};

/**
 * Check if date is in past
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if date is in past
 */
exports.isPastDate = (date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  return checkDate < today;
};

/**
 * Check if date is in future (more than 7 days ahead)
 * @param {Date|string} date - Date to check
 * @param {number} daysAhead - How many days ahead allowed (default: 7)
 * @returns {boolean} True if date is too far in future
 */
exports.isFutureDate = (date, daysAhead = 7) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + daysAhead);
  
  return checkDate > maxDate;
};

/**
 * Check if date is today
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if date is today
 */
exports.isToday = (date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  return checkDate.getTime() === today.getTime();
};

/**
 * Get valid dates for a slot (dates that match slot's day)
 * @param {string} dayName - Slot's day (MON, TUE, etc.)
 * @param {string} academicYear - "2025-2026"
 * @param {number} semester - Semester number
 * @returns {Date[]} Array of valid dates
 */
exports.getValidDatesForSlot = (dayName, academicYear, semester) => {
  const { start, end } = this.getSemesterDateRange(academicYear, semester);
  return this.getAllDatesForDay(dayName, start, end);
};

/**
 * Format date to ISO string (YYYY-MM-DD)
 * @param {Date} date - Date object
 * @returns {string} ISO date string
 */
exports.formatDate = (date) => {
  return date.toISOString().split('T')[0];
};

/**
 * Parse date string to Date object
 * @param {string} dateString - YYYY-MM-DD
 * @returns {Date} Date object
 */
exports.parseDate = (dateString) => {
  return new Date(dateString);
};
