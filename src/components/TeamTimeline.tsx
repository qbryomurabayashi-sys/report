import React from 'react';
import { Sword, Target, User as UserIcon } from 'lucide-react';
import { Task, Project, Member } from '../types';
import { format, startOfWeek, addDays, isWithinInterval, parseISO } from 'date-fns';

interface TeamTimelineProps {
  tasks: Task[];
  projects: Project[];
  members: Member[];
}

const TeamTimeline: React.FC<TeamTimelineProps> = ({ tasks, projects, members }) => {
  const startDate = startOfWeek(new Date(), { weekStartsOn: 1 });
  const days = Array.from({ length: 14 }, (_, i) => addDays(startDate, i));

  const getMemberItems = (memberName: string) => {
    const memberTasks = tasks.filter(t => t.Assignees && t.Assignees.includes(memberName));
    const memberProjects = projects.filter(p => 
      (p.Assignees && p.Assignees.includes(memberName)) || 
      p.WithWhom?.includes(memberName)
    );
    return { tasks: memberTasks, projects: memberProjects };
  };

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-white/10">
              <th className="sticky left-0 z-20 bg-dark-bg p-4 text-left min-w-[200px] border-r border-white/10">
                <span className="font-display text-xs uppercase tracking-widest text-gray-500">Party Members</span>
              </th>
              {days.map(day => (
                <th key={day.toISOString()} className="p-4 min-w-[100px] text-center border-r border-white/10">
                  <div className="font-display text-[10px] uppercase tracking-tighter text-gray-500">
                    {format(day, 'EEE')}
                  </div>
                  <div className={`text-sm font-bold ${format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') ? 'neon-text-blue' : ''}`}>
                    {format(day, 'MM/dd')}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map(member => {
              const { tasks: mTasks, projects: mProjects } = getMemberItems(member.name);
              return (
                <tr key={member.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="sticky left-0 z-20 bg-dark-bg p-4 border-r border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-neon-blue/20 flex items-center justify-center border border-neon-blue/30">
                        <UserIcon className="w-5 h-5 neon-text-blue" />
                      </div>
                      <div>
                        <div className="font-bold text-sm">{member.name}</div>
                        <div className="text-[10px] uppercase tracking-widest text-gray-500 flex items-center gap-1">
                          <span className="px-1 bg-neon-orange/20 text-neon-orange rounded border border-neon-orange/30">
                            {member.role}
                          </span>
                          <span>{member.area}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  {days.map(day => {
                    const dayStr = format(day, 'yyyy-MM-dd');
                    const dayTasks = mTasks.filter(t => t.Deadline.startsWith(dayStr));
                    const dayProjects = mProjects.filter(p => {
                      try {
                        const start = parseISO(p.StartDate);
                        const end = parseISO(p.EndDate);
                        return isWithinInterval(day, { start, end });
                      } catch (e) {
                        return false;
                      }
                    });

                    return (
                      <td key={day.toISOString()} className="p-2 border-r border-white/5 relative h-24">
                        <div className="flex flex-col gap-1">
                          {dayProjects.map(p => (
                            <div key={p.ProjectID} className="group relative">
                              <div className="hp-gauge w-full">
                                <div className="hp-gauge-orange w-full" />
                              </div>
                              <div className="absolute -top-1 left-0 flex items-center gap-1 scale-75 origin-left opacity-0 group-hover:opacity-100 transition-opacity bg-dark-bg px-1 rounded border border-neon-orange/30 z-30">
                                <Target className="w-3 h-3 neon-text-orange" />
                                <span className="text-[8px] text-neon-orange whitespace-nowrap">{p.What}</span>
                              </div>
                            </div>
                          ))}
                          {dayTasks.map(t => (
                            <div key={t.TaskID} className="group relative">
                              <div className="hp-gauge w-full">
                                <div className="hp-gauge-blue w-full" />
                              </div>
                              <div className="absolute -top-1 left-0 flex flex-col scale-75 origin-left opacity-0 group-hover:opacity-100 transition-opacity bg-dark-bg px-1 rounded border border-neon-blue/30 z-30">
                                <div className="flex items-center gap-1">
                                  <Sword className="w-3 h-3 neon-text-blue" />
                                  <span className="text-[8px] text-neon-blue whitespace-nowrap">{t.Content}</span>
                                </div>
                                {!t.IsAllDay && t.Time && (
                                  <span className="text-[7px] text-gray-500 ml-4">{t.Time}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TeamTimeline;
