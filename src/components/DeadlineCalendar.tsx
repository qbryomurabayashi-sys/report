import React from 'react';
import { Sword, Target, ChevronLeft, ChevronRight, Flag } from 'lucide-react';
import { Task, Project, Milestone } from '../types';
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
    }).sort((a, b) => a.ProjectID.localeCompare(b.ProjectID));
    return { tasks: dayTasks, projects: dayProjects };
  };

  const getProjectColor = (id: string) => {
    const colors = [
      { bg: 'bg-neon-orange/20', border: 'border-neon-orange/30', text: 'text-neon-orange', neon: 'neon-text-orange', solid: 'bg-neon-orange' },
      { bg: 'bg-neon-blue/20', border: 'border-neon-blue/30', text: 'text-neon-blue', neon: 'neon-text-blue', solid: 'bg-neon-blue' },
      { bg: 'bg-green-400/20', border: 'border-green-400/30', text: 'text-green-400', neon: 'text-green-400', solid: 'bg-green-400' },
      { bg: 'bg-purple-400/20', border: 'border-purple-400/30', text: 'text-purple-400', neon: 'text-purple-400', solid: 'bg-purple-400' },
      { bg: 'bg-pink-400/20', border: 'border-pink-400/30', text: 'text-pink-400', neon: 'text-pink-400', solid: 'bg-pink-400' },
      { bg: 'bg-yellow-400/20', border: 'border-yellow-400/30', text: 'text-yellow-400', neon: 'text-yellow-400', solid: 'bg-yellow-400' },
    ];
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
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
                {dProjects.map(p => {
                  let isStart = false;
                  let isEnd = false;
                  try {
                    isStart = isSameDay(day, parseISO(p.StartDate));
                    isEnd = isSameDay(day, parseISO(p.EndDate));
                  } catch (e) {
                    const dayStr = format(day, 'yyyy-MM-dd');
                    isStart = p.StartDate.startsWith(dayStr);
                    isEnd = p.EndDate.startsWith(dayStr);
                  }
                  
                  const isMonday = format(day, 'EEE') === 'Mon';
                  const isSunday = format(day, 'EEE') === 'Sun';
                  const showLabel = isStart || isMonday;
                  
                  const dayStr = format(day, 'yyyy-MM-dd');
                  const dayMilestones = p.Milestones?.filter(m => m.date === dayStr) || [];
                  const color = getProjectColor(p.ProjectID);

                  return (
                    <div 
                      key={p.ProjectID} 
                      className={`
                        flex items-center gap-1 px-1 py-0.5 text-[9px] font-bold uppercase tracking-tighter
                        ${color.bg} border-y ${color.border}
                        ${isStart || isMonday ? 'rounded-l border-l ml-0' : '-ml-2 border-l-0'}
                        ${isEnd || isSunday ? 'rounded-r border-r mr-0' : '-mr-2 border-r-0'}
                        z-10 relative h-5
                      `}
                    >
                      {showLabel && (
                        <>
                          <Target className={`w-2.5 h-2.5 ${color.neon} flex-shrink-0`} />
                          <span className={`${color.text} truncate`}>{p.What}</span>
                        </>
                      )}
                      {dayMilestones.length > 0 && (
                        <div className={`absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 ${color.solid} px-1 rounded-sm shadow-[0_0_8px_rgba(255,255,255,0.4)] z-20`}>
                          <Flag size={8} className="text-black" />
                          <span className="text-[7px] text-black font-bold whitespace-nowrap">{dayMilestones[0].title}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
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
