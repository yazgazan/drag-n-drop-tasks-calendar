/**
 * Date utilities for calendar functionality
 */

export interface CalendarDate {
  date: Date;
  dayName: string;
  shortDayName: string;
  dayNumber: number;
  monthName: string;
  shortMonthName: string;
  isToday: boolean;
  isCurrentWeek: boolean;
}

/**
 * Get the start of the current week (Monday)
 */
export const getStartOfWeek = (date: Date = new Date()): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
  return new Date(d.setDate(diff));
};

/**
 * Get the end of the current week (Sunday)
 */
export const getEndOfWeek = (date: Date = new Date()): Date => {
  const startOfWeek = getStartOfWeek(date);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  return endOfWeek;
};

/**
 * Get an array of dates for the current week
 */
export const getCurrentWeekDates = (baseDate: Date = new Date()): CalendarDate[] => {
  const startOfWeek = getStartOfWeek(baseDate);
  const today = new Date();
  const currentWeekStart = getStartOfWeek(today);
  const currentWeekEnd = getEndOfWeek(today);
  
  const weekDates: CalendarDate[] = [];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    
    const isToday = date.toDateString() === today.toDateString();
    const isCurrentWeek = date >= currentWeekStart && date <= currentWeekEnd;
    
    weekDates.push({
      date,
      dayName: date.toLocaleDateString('en-US', { weekday: 'long' }),
      shortDayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNumber: date.getDate(),
      monthName: date.toLocaleDateString('en-US', { month: 'long' }),
      shortMonthName: date.toLocaleDateString('en-US', { month: 'short' }),
      isToday,
      isCurrentWeek
    });
  }
  
  return weekDates;
};

/**
 * Format a date for display in calendar header
 */
export const formatCalendarHeaderDate = (date: CalendarDate): string => {
  return `${date.shortDayName} ${date.shortMonthName} ${date.dayNumber}`;
};

/**
 * Get week range string for display
 */
export const getWeekRangeString = (weekDates: CalendarDate[]): string => {
  if (weekDates.length === 0) return '';
  
  const firstDate = weekDates[0];
  const lastDate = weekDates[6];
  
  if (firstDate.monthName === lastDate.monthName) {
    return `${firstDate.monthName} ${firstDate.dayNumber}-${lastDate.dayNumber}`;
  } else {
    return `${firstDate.shortMonthName} ${firstDate.dayNumber} - ${lastDate.shortMonthName} ${lastDate.dayNumber}`;
  }
};

/**
 * Convert calendar slot to ISO date string for Todoist API
 */
export const calendarSlotToDate = (date: CalendarDate, timeSlot: string): string => {
  const [time, ampm] = timeSlot.split(' ');
  const [hours, minutes] = time.split(':').map(Number);
  
  let hour24 = hours;
  if (ampm === 'PM' && hours !== 12) {
    hour24 += 12;
  } else if (ampm === 'AM' && hours === 12) {
    hour24 = 0;
  }
  
  const dateTime = new Date(date.date);
  dateTime.setHours(hour24, minutes || 0, 0, 0);
  
  // Return in RFC3339 format that Todoist expects
  return dateTime.toISOString();
};

/**
 * Get previous week dates
 */
export const getPreviousWeek = (currentWeekStart: Date): CalendarDate[] => {
  const prevWeekStart = new Date(currentWeekStart);
  prevWeekStart.setDate(currentWeekStart.getDate() - 7);
  return getCurrentWeekDates(prevWeekStart);
};

/**
 * Get next week dates
 */
export const getNextWeek = (currentWeekStart: Date): CalendarDate[] => {
  const nextWeekStart = new Date(currentWeekStart);
  nextWeekStart.setDate(currentWeekStart.getDate() + 7);
  return getCurrentWeekDates(nextWeekStart);
};

/**
 * Get the start of the month (first day)
 */
export const getStartOfMonth = (date: Date = new Date()): Date => {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), 1);
};

/**
 * Get the end of the month (last day)
 */
export const getEndOfMonth = (date: Date = new Date()): Date => {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
};

/**
 * Get an array of dates for the current month including leading/trailing days
 * to fill complete weeks (starts on Monday)
 */
export const getCurrentMonthDates = (baseDate: Date = new Date()): CalendarDate[] => {
  const startOfMonth = getStartOfMonth(baseDate);
  const endOfMonth = getEndOfMonth(baseDate);
  const today = new Date();
  const currentWeekStart = getStartOfWeek(today);
  const currentWeekEnd = getEndOfWeek(today);
  
  // Get the Monday of the week containing the first day of the month
  const calendarStart = getStartOfWeek(startOfMonth);
  
  // Get the Sunday of the week containing the last day of the month
  const calendarEnd = getEndOfWeek(endOfMonth);
  
  const monthDates: CalendarDate[] = [];
  
  const currentDate = new Date(calendarStart);
  while (currentDate <= calendarEnd) {
    const isToday = currentDate.toDateString() === today.toDateString();
    const isCurrentWeek = currentDate >= currentWeekStart && currentDate <= currentWeekEnd;
    
    monthDates.push({
      date: new Date(currentDate),
      dayName: currentDate.toLocaleDateString('en-US', { weekday: 'long' }),
      shortDayName: currentDate.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNumber: currentDate.getDate(),
      monthName: currentDate.toLocaleDateString('en-US', { month: 'long' }),
      shortMonthName: currentDate.toLocaleDateString('en-US', { month: 'short' }),
      isToday,
      isCurrentWeek
    });
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return monthDates;
};

/**
 * Get month range string for display
 */
export const getMonthRangeString = (monthDates: CalendarDate[]): string => {
  if (monthDates.length === 0) return '';
  
  // Find the first date that's actually in the target month
  const targetMonth = monthDates.find(date => 
    date.date.getDate() >= 1 && date.date.getDate() <= 31
  );
  
  if (!targetMonth) return '';
  
  return `${targetMonth.monthName} ${targetMonth.date.getFullYear()}`;
};

/**
 * Get previous month dates
 */
export const getPreviousMonth = (currentMonth: Date): CalendarDate[] => {
  const prevMonth = new Date(currentMonth);
  prevMonth.setMonth(currentMonth.getMonth() - 1);
  return getCurrentMonthDates(prevMonth);
};

/**
 * Get next month dates
 */
export const getNextMonth = (currentMonth: Date): CalendarDate[] => {
  const nextMonth = new Date(currentMonth);
  nextMonth.setMonth(currentMonth.getMonth() + 1);
  return getCurrentMonthDates(nextMonth);
};