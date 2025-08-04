import React from 'react';
import { ScheduledTasks, ScheduledTask as ScheduledTaskType } from '../../types/task';
import { timeSlots, daysOfWeek } from '../../constants/calendar';
import ScheduledTask from './ScheduledTask';

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
  const getScheduledTask = (day: string, time: string): ScheduledTaskType | undefined => {
    const slotKey = `${day}-${time}`;
    return scheduledTasks[slotKey];
  };

  return (
    <div className="calendar-container">
      <h2 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: 600 }}>
        📅 This Week
      </h2>
      
      <div className="calendar-header">
        <div className="time-label"></div>
        <div>Monday</div>
        <div>Tuesday</div>
        <div>Wednesday</div>
        <div>Thursday</div>
        <div>Friday</div>
        <div>Saturday</div>
        <div>Sunday</div>
      </div>

      <div className="calendar-grid" id="calendar-grid">
        {timeSlots.map((time) => (
          <React.Fragment key={time}>
            <div className="time-slot time-label">{time}</div>
            {daysOfWeek.map((day) => {
              const scheduledTask = getScheduledTask(day, time);
              return (
                <div
                  key={`${day}-${time}`}
                  className="time-slot"
                  data-day={day}
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