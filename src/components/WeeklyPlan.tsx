import React from 'react';
import { Sword, Target, Clock, Flag } from 'lucide-react';
import { Task, Project, Milestone } from '../types';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';

interface WeeklyPlanProps {
  tasks: Task[];
  projects: Project[];
}

const WeeklyPlan: React.FC<WeeklyPlanProps> = ({ tasks, projects }) => {
  const startDate = startOfWeek(new Date(), { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));
  const hours = Array.from({ length: 14 }, (_, i) => i + 8); // 8:00 to 21:00

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
              <div key={day.toISOString()} className="p-4 text-center border-r border-white/10 relative">
                <div className="font-display text-[10px] uppercase tracking-widest text-gray-500">
                  {format(day, 'EEE')}
                </div>
                <div className={`text-sm font-bold ${isSameDay(day, new Date()) ? 'neon-text-blue' : ''}`}>
                  {format(day, 'MM/dd')}
                </div>
                {/* Milestones in header */}
                <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-1">
                  {projects.flatMap(p => (p.Milestones || []).filter(m => m.date === format(day, 'yyyy-MM-dd'))).map(m => (
                    <div key={m.id} title={m.title} className="w-2 h-2 bg-neon-orange rounded-full shadow-[0_0_5px_rgba(255,157,0,0.8)]" />
                  ))}
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
                        {hourProjects.map(p => {
                          const color = getProjectColor(p.ProjectID);
                          return (
                            <div key={p.ProjectID} className="relative z-10">
                              <div className={`hp-gauge w-full ${color.bg}`}>
                                <div className={`${color.solid} w-full h-full opacity-50`} />
                              </div>
                              <div className="flex items-center gap-1 mt-0.5">
                                <Target className={`w-2.5 h-2.5 ${color.neon}`} />
                                <span className={`text-[8px] ${color.text} truncate font-bold uppercase tracking-tighter`}>{p.What}</span>
                              </div>
                            </div>
                          );
                        })}
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
