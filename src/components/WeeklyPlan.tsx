import React from 'react';
import { Sword, Target, Clock } from 'lucide-react';
import { Task, Project } from '../types';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';

interface WeeklyPlanProps {
  tasks: Task[];
  projects: Project[];
}

const WeeklyPlan: React.FC<WeeklyPlanProps> = ({ tasks, projects }) => {
  const startDate = startOfWeek(new Date(), { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));
  const hours = Array.from({ length: 14 }, (_, i) => i + 8); // 8:00 to 21:00

  const getDayItems = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const dayTasks = tasks.filter(t => t.Deadline.startsWith(dayStr));
    const dayProjects = projects.filter(p => p.EndDate.startsWith(dayStr));
    return { tasks: dayTasks, projects: dayProjects };
  };

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="p-6 border-b border-white/10">
        <h2 className="font-display text-xl uppercase tracking-widest neon-text-blue">
          Weekly Quest Planner
        </h2>
        <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">
          {format(days[0], 'MMM dd')} - {format(days[6], 'MMM dd, yyyy')}
        </p>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-white/10">
            <div className="p-4 border-r border-white/10" />
            {days.map(day => (
              <div key={day.toISOString()} className="p-4 text-center border-r border-white/10">
                <div className="font-display text-[10px] uppercase tracking-widest text-gray-500">
                  {format(day, 'EEE')}
                </div>
                <div className={`text-sm font-bold ${isSameDay(day, new Date()) ? 'neon-text-blue' : ''}`}>
                  {format(day, 'MM/dd')}
                </div>
              </div>
            ))}
          </div>

          <div className="relative">
            {hours.map(hour => (
              <div key={hour} className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-white/5 h-20">
                <div className="p-2 border-r border-white/10 flex items-center justify-center text-[10px] font-display text-gray-500">
                  {hour}:00
                </div>
                {days.map(day => {
                  const { tasks: dTasks, projects: dProjects } = getDayItems(day);
                  // For simplicity, we'll just show items in the hour they are due or end
                  const hourTasks = dTasks.filter(t => {
                    try {
                      return parseISO(t.Deadline).getHours() === hour;
                    } catch (e) {
                      return false;
                    }
                  });
                  const hourProjects = dProjects.filter(p => {
                    try {
                      return parseISO(p.EndDate).getHours() === hour;
                    } catch (e) {
                      return false;
                    }
                  });

                  return (
                    <div key={day.toISOString()} className="p-1 border-r border-white/5 relative group hover:bg-white/5 transition-colors">
                      <div className="flex flex-col gap-1">
                        {hourProjects.map(p => (
                          <div key={p.ProjectID} className="relative z-10">
                            <div className="hp-gauge w-full">
                              <div className="hp-gauge-orange w-full" />
                            </div>
                            <div className="flex items-center gap-1 mt-0.5">
                              <Target className="w-2.5 h-2.5 neon-text-orange" />
                              <span className="text-[8px] text-neon-orange truncate font-bold uppercase tracking-tighter">{p.What}</span>
                            </div>
                          </div>
                        ))}
                        {hourTasks.map(t => (
                          <div key={t.TaskID} className="relative z-10">
                            <div className="hp-gauge w-full">
                              <div className="hp-gauge-blue w-full" />
                            </div>
                            <div className="flex items-center gap-1 mt-0.5">
                              <Sword className="w-2.5 h-2.5 neon-text-blue" />
                              <span className="text-[8px] text-neon-blue truncate font-bold uppercase tracking-tighter">{t.Content}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeeklyPlan;
