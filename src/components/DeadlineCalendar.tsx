import React from 'react';
import { Sword, Target, ChevronLeft, ChevronRight } from 'lucide-react';
import { Task, Project } from '../types';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO, isWithinInterval } from 'date-fns';

interface DeadlineCalendarProps {
  tasks: Task[];
  projects: Project[];
}

const DeadlineCalendar: React.FC<DeadlineCalendarProps> = ({ tasks, projects }) => {
  const [currentMonth, setCurrentMonth] = React.useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const getDayItems = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const dayTasks = tasks.filter(t => t.Deadline.startsWith(dayStr));
    const dayProjects = projects.filter(p => {
      try {
        const start = parseISO(p.StartDate);
        const end = parseISO(p.EndDate);
        return isWithinInterval(day, { start, end });
      } catch (e) {
        return p.EndDate.startsWith(dayStr);
      }
    });
    return { tasks: dayTasks, projects: dayProjects };
  };

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="p-6 border-b border-white/10 flex items-center justify-between">
        <h2 className="font-display text-xl uppercase tracking-widest neon-text-blue">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 glass-card rounded-lg hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 glass-card rounded-lg hover:bg-white/10 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-white/10">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
          <div key={day} className="p-4 text-center font-display text-[10px] uppercase tracking-widest text-gray-500">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {calendarDays.map((day, idx) => {
          const { tasks: dTasks, projects: dProjects } = getDayItems(day);
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={day.toISOString()}
              className={`min-h-[120px] p-2 border-r border-b border-white/5 transition-colors hover:bg-white/5 ${
                !isCurrentMonth ? 'opacity-20' : ''
              } ${isToday ? 'bg-neon-blue/5' : ''}`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className={`text-xs font-bold ${isToday ? 'neon-text-blue' : 'text-gray-500'}`}>
                  {format(day, 'd')}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                {dProjects.map(p => (
                  <div key={p.ProjectID} className="flex items-center gap-1 px-1 py-0.5 rounded bg-neon-orange/10 border border-neon-orange/20">
                    <Target className="w-2.5 h-2.5 neon-text-orange flex-shrink-0" />
                    <span className="text-[9px] text-neon-orange truncate font-bold uppercase tracking-tighter">{p.What}</span>
                  </div>
                ))}
                {dTasks.map(t => (
                  <div key={t.TaskID} className="flex flex-col gap-0.5 px-1 py-0.5 rounded bg-neon-blue/10 border border-neon-blue/20">
                    <div className="flex items-center gap-1">
                      <Sword className="w-2.5 h-2.5 neon-text-blue flex-shrink-0" />
                      <span className="text-[9px] text-neon-blue truncate font-bold uppercase tracking-tighter">{t.Content}</span>
                    </div>
                    {!t.IsAllDay && t.Time && (
                      <span className="text-[8px] text-gray-500 ml-3.5">{t.Time}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DeadlineCalendar;
