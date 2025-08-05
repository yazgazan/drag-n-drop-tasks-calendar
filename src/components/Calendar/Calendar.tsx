import React, { useState, useEffect } from 'react';
import { ScheduledTasks, ScheduledTask as ScheduledTaskType } from '../../types/task';
import { timeSlots } from '../../constants/calendar';
import ScheduledTask from './ScheduledTask';
import { getCurrentWeekDates, getWeekRangeString, formatCalendarHeaderDate, getPreviousWeek, getNextWeek, CalendarDate } from '../../utils/dateUtils';

interface CalendarProps {
  scheduledTasks: ScheduledTasks;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnter: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onTaskClick: (task: ScheduledTaskType) => void;
}

const Calendar: React.FC<CalendarProps> = ({
  scheduledTasks,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
  onTaskClick
}) => {
  const [currentWeekDates, setCurrentWeekDates] = useState<CalendarDate[]>([]);

  useEffect(() => {
    setCurrentWeekDates(getCurrentWeekDates());
  }, []);

  const getScheduledTask = (date: CalendarDate, time: string): ScheduledTaskType | undefined => {
    // Support both new date-based keys and legacy day-based keys
    const dateKey = `${date.date.toISOString().split('T')[0]}-${time}`;
    const legacyKey = `${date.dayName.toLowerCase()}-${time}`;
    return scheduledTasks[dateKey] || scheduledTasks[legacyKey];
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    if (currentWeekDates.length === 0) return;
    
    const currentStart = currentWeekDates[0].date;
    const newWeekDates = direction === 'prev' 
      ? getPreviousWeek(currentStart)
      : getNextWeek(currentStart);
    
    setCurrentWeekDates(newWeekDates);
  };

  if (currentWeekDates.length === 0) {
    return <div>Loading calendar...</div>;
  }

  return (
    <div className="calendar-container">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <button 
          onClick={() => navigateWeek('prev')}
          className="calendar-nav-button"
        >
          ← Previous
        </button>
        
        <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>
          📅 {getWeekRangeString(currentWeekDates)}
        </h2>
        
        <button 
          onClick={() => navigateWeek('next')}
          className="calendar-nav-button"
        >
          Next →
        </button>
      </div>
      
      <div className="calendar-header">
        <div className="time-label"></div>
        {currentWeekDates.map((date) => (
          <div key={date.date.toISOString()} style={{ fontWeight: date.isToday ? 'bold' : 'normal' }}>
            {formatCalendarHeaderDate(date)}
          </div>
        ))}
      </div>

      <div className="calendar-grid" id="calendar-grid">
        {timeSlots.map((time) => (
          <React.Fragment key={time}>
            <div className="time-slot time-label">{time}</div>
            {currentWeekDates.map((date) => {
              const scheduledTask = getScheduledTask(date, time);
              return (
                <div
                  key={`${date.date.toISOString()}-${time}`}
                  className={`time-slot ${date.isToday ? 'today' : ''}`}
                  data-date={date.date.toISOString().split('T')[0]}
                  data-time={time}
                  onDragOver={onDragOver}
                  onDragEnter={onDragEnter}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                >
                  {scheduledTask && (
                    <ScheduledTask
                      task={scheduledTask}
                      onClick={onTaskClick}
                    />
                  )}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default Calendar;