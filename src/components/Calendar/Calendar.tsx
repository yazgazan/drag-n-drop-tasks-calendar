import React, { useState, useEffect } from 'react';
import { ScheduledTasks, ScheduledTask as ScheduledTaskType } from '../../types/task';
import { timeSlots } from '../../constants/calendar';
import ScheduledTask from './ScheduledTask';
import { 
  getCurrentWeekDates, 
  getWeekRangeString, 
  formatCalendarHeaderDate, 
  getPreviousWeek, 
  getNextWeek, 
  getCurrentMonthDates,
  getMonthRangeString,
  getPreviousMonth,
  getNextMonth,
  getDateKey,
  CalendarDate 
} from '../../utils/dateUtils';

export type CalendarViewMode = 'week' | 'month';

interface CalendarProps {
  scheduledTasks: ScheduledTasks;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnter: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onTaskClick: (task: ScheduledTaskType) => void;
  onScheduledTaskDragStart?: (e: React.DragEvent<HTMLDivElement>, task: ScheduledTaskType) => void;
  onScheduledTaskDragEnd?: (e: React.DragEvent<HTMLDivElement>) => void;
  viewMode?: CalendarViewMode;
  onViewModeChange?: (mode: CalendarViewMode) => void;
}

const Calendar: React.FC<CalendarProps> = ({
  scheduledTasks,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
  onTaskClick,
  onScheduledTaskDragStart,
  onScheduledTaskDragEnd,
  viewMode = 'week',
  onViewModeChange
}) => {
  const [currentDates, setCurrentDates] = useState<CalendarDate[]>([]);

  useEffect(() => {
    if (viewMode === 'week') {
      setCurrentDates(getCurrentWeekDates());
    } else {
      setCurrentDates(getCurrentMonthDates());
    }
  }, [viewMode]);

  const getScheduledTask = (date: CalendarDate, time: string): ScheduledTaskType | undefined => {
    // Use consistent date key to avoid timezone issues
    const dateKey = `${getDateKey(date.date)}-${time}`;
    const legacyKey = `${date.dayName.toLowerCase()}-${time}`;
    return scheduledTasks[dateKey] || scheduledTasks[legacyKey];
  };

  const navigate = (direction: 'prev' | 'next') => {
    if (currentDates.length === 0) return;
    
    let newDates: CalendarDate[];
    
    if (viewMode === 'week') {
      const currentStart = currentDates[0].date;
      newDates = direction === 'prev' 
        ? getPreviousWeek(currentStart)
        : getNextWeek(currentStart);
    } else {
      // For month view, use the middle date to ensure we're working with the main month
      const middleIndex = Math.floor(currentDates.length / 2);
      const currentMonthDate = currentDates[middleIndex].date;
      newDates = direction === 'prev' 
        ? getPreviousMonth(currentMonthDate)
        : getNextMonth(currentMonthDate);
    }
    
    setCurrentDates(newDates);
  };

  const goToToday = () => {
    if (viewMode === 'week') {
      setCurrentDates(getCurrentWeekDates());
    } else {
      setCurrentDates(getCurrentMonthDates());
    }
  };

  const getRangeString = () => {
    if (viewMode === 'week') {
      return getWeekRangeString(currentDates);
    } else {
      return getMonthRangeString(currentDates);
    }
  };

  if (currentDates.length === 0) {
    return <div>Loading calendar...</div>;
  }

  const renderWeekView = () => (
    <div className="calendar-grid" id="calendar-grid">
      {timeSlots.map((time) => (
        <React.Fragment key={time}>
          <div className="time-slot time-label">{time}</div>
          {currentDates.map((date) => {
            const scheduledTask = getScheduledTask(date, time);
            return (
              <div
                key={`${date.date.toISOString()}-${time}`}
                className={`time-slot ${date.isToday ? 'today' : ''}`}
                data-date={getDateKey(date.date)}
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
                    onDragStart={onScheduledTaskDragStart}
                    onDragEnd={onScheduledTaskDragEnd}
                  />
                )}
              </div>
            );
          })}
        </React.Fragment>
      ))}
    </div>
  );

  const renderMonthView = () => {
    const weeks: CalendarDate[][] = [];
    for (let i = 0; i < currentDates.length; i += 7) {
      weeks.push(currentDates.slice(i, i + 7));
    }

    return (
      <div className="month-view">
        <div className="month-header">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
            <div key={day} className="month-day-header">{day}</div>
          ))}
        </div>
        <div className="month-grid">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="month-week">
              {week.map((date) => {
                const dayTasks = timeSlots
                  .map(time => getScheduledTask(date, time))
                  .filter(Boolean);
                
                return (
                  <div
                    key={date.date.toISOString()}
                    className={`month-day ${date.isToday ? 'today' : ''} ${!date.isCurrentMonth ? 'other-month' : ''}`}
                    data-date={getDateKey(date.date)}
                    data-time="9:00 AM"
                    onDragOver={onDragOver}
                    onDragEnter={onDragEnter}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                  >
                    <div className="month-day-number">{date.dayNumber}</div>
                    <div className="month-day-tasks">
                      {dayTasks.slice(0, 3).map((task) => (
                        <div
                          key={task!.id}
                          className="month-task"
                          draggable={true}
                          onClick={() => onTaskClick(task!)}
                          onDragStart={(e) => onScheduledTaskDragStart?.(e, task!)}
                          onDragEnd={onScheduledTaskDragEnd}
                          style={{ backgroundColor: task!.priority === 'p1' ? '#ff6b6b' : task!.priority === 'p2' ? '#ffa500' : '#4ecdc4' }}
                        >
                          {task!.title.length > 20 ? task!.title.substring(0, 20) + '...' : task!.title}
                        </div>
                      ))}
                      {dayTasks.length > 3 && (
                        <div className="month-task-more">+{dayTasks.length - 3} more</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={`calendar-container calendar-${viewMode}-view`}>
      <div className="calendar-nav-header">
        <button 
          onClick={() => navigate('prev')}
          className="calendar-nav-button"
        >
          ← Previous
        </button>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>
            📅 {getRangeString()}
          </h2>
          
          <button 
            onClick={goToToday}
            className="calendar-nav-button today-button"
            style={{ fontSize: '14px', padding: '6px 12px' }}
          >
            Today
          </button>
          
          {onViewModeChange && (
            <div className="view-mode-toggle">
              <button
                onClick={() => onViewModeChange('week')}
                className={`view-mode-button ${viewMode === 'week' ? 'active' : ''}`}
              >
                Week
              </button>
              <button
                onClick={() => onViewModeChange('month')}
                className={`view-mode-button ${viewMode === 'month' ? 'active' : ''}`}
              >
                Month
              </button>
            </div>
          )}
        </div>
        
        <button 
          onClick={() => navigate('next')}
          className="calendar-nav-button"
        >
          Next →
        </button>
      </div>
      
      {viewMode === 'week' && (
        <div className="calendar-header">
          <div className="time-label"></div>
          {currentDates.map((date) => (
            <div key={date.date.toISOString()} style={{ fontWeight: date.isToday ? 'bold' : 'normal' }}>
              {formatCalendarHeaderDate(date)}
            </div>
          ))}
        </div>
      )}

      {viewMode === 'week' ? renderWeekView() : renderMonthView()}
    </div>
  );
};

export default Calendar;