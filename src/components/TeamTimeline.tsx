import React from 'react';
import { Sword, Target, User as UserIcon, Flag } from 'lucide-react';
import { Task, Project, Member, Milestone } from '../types';
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

  const filteredMembers = members.filter(m => m.role !== "店長");

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
            {filteredMembers.map(member => {
              const { tasks: mTasks, projects: mProjects } = getMemberItems(member.name);
              return (
                <tr key={member.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="sticky left-0 z-20 bg-dark-bg p-4 border-r border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                        <UserIcon className="w-5 h-5 text-gray-400" />
                      </div>
                      <div>
                        <div className="font-bold text-sm">{member.name}</div>
                        <div className="text-[10px] uppercase tracking-widest text-gray-500 flex items-center gap-1">
                          <span className="px-1 bg-white/10 text-gray-400 rounded border border-white/20">
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

                    const dayMilestones = mProjects.flatMap(p => 
                      (p.Milestones || []).filter(m => m.date === dayStr).map(m => ({ ...m, projectWhat: p.What, projectId: p.ProjectID }))
                    );

                    return (
                      <td key={day.toISOString()} className="p-2 border-r border-white/5 relative h-24">
                        <div className="flex flex-col gap-1">
                          {dayProjects.map(p => {
                            const color = getProjectColor(p.ProjectID);
                            return (
                              <div key={p.ProjectID} className="group relative">
                                <div className={`hp-gauge w-full ${color.bg}`}>
                                  <div className={`${color.solid} w-full h-full opacity-50`} />
                                </div>
                                <div className={`absolute -top-1 left-0 flex items-center gap-1 scale-75 origin-left opacity-0 group-hover:opacity-100 transition-opacity bg-dark-bg px-1 rounded border ${color.border} z-30`}>
                                  <Target className={`w-3 h-3 ${color.neon}`} />
                                  <span className={`text-[8px] ${color.text} whitespace-nowrap`}>{p.What}</span>
                                </div>
                              </div>
                            );
                          })}
                          {dayMilestones.map(m => {
                            const color = getProjectColor(m.projectId);
                            return (
                              <div key={m.id} className={`flex items-center gap-1 ${color.bg} border ${color.border} rounded px-1 py-0.5 shadow-[0_0_8px_rgba(255,255,255,0.2)]`}>
                                <Flag size={10} className={color.neon} />
                                <span className={`text-[8px] ${color.text} font-bold truncate max-w-[60px]`}>{m.title}</span>
                              </div>
                            );
                          })}
                          {dayTasks.map(t => (
                            <div key={t.TaskID} className="group relative">
                              <div className="hp-gauge w-full bg-neon-blue/10">
                                <div className="bg-neon-blue w-full h-full opacity-50" />
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
