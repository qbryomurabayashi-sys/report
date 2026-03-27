import React from 'react';
import { Sword, Target, MoreVertical, Calendar, User as UserIcon } from 'lucide-react';
import { Task, Project } from '../types';
import { format, parseISO } from 'date-fns';

interface QuestBoardProps {
  tasks: Task[];
  projects: Project[];
}

const QuestBoard: React.FC<QuestBoardProps> = ({ tasks, projects }) => {
  const columns = [
    { id: 'pending', label: '進行中のクエスト' },
    { id: 'completed', label: '完了済み' },
  ];

  const getItemsByStatus = (status: string) => {
    const sTasks = tasks.filter(t => t.Status === status);
    const sProjects = projects.filter(p => p.Status === status);
    return [...sTasks.map(t => ({ ...t, type: 'task' as const })), ...sProjects.map(p => ({ ...p, type: 'project' as const }))];
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'yyyy/MM/dd');
    } catch (e) {
      return dateStr;
    }
  };

  const allItems = [...tasks, ...projects];

  return (
    <div className="flex gap-6 overflow-x-auto pb-6 min-h-[calc(100vh-200px)]">
      {allItems.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-600 py-20">
          <Sword className="w-12 h-12 mb-4 opacity-20" />
          <p className="font-display uppercase tracking-widest text-xs">No Quests or Scenarios Found</p>
          <p className="text-[10px] mt-2">Google Sheetsとの連携を確認してください</p>
        </div>
      ) : (
        columns.map(column => {
          const items = getItemsByStatus(column.id);
          return (
            <div key={column.id} className="flex-shrink-0 w-80 flex flex-col gap-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="font-display text-xs uppercase tracking-widest text-gray-500 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-neon-blue" />
                  {column.label}
                  <span className="ml-2 px-1.5 py-0.5 rounded bg-white/5 text-[10px]">{items.length}</span>
                </h3>
                <MoreVertical className="w-4 h-4 text-gray-600" />
              </div>

              <div className="flex flex-col gap-3">
                {items.map(item => (
                  <div
                    key={item.type === 'task' ? (item as Task).TaskID : (item as Project).ProjectID}
                    className={`quest-card ${item.type === 'task' ? 'quest-card-task' : 'quest-card-project'}`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        {item.type === 'task' ? (
                          <Sword className="w-4 h-4 neon-text-blue" />
                        ) : (
                          <Target className="w-4 h-4 neon-text-orange" />
                        )}
                        <span className={`text-[10px] font-display uppercase tracking-widest ${
                          item.type === 'task' ? 'neon-text-blue' : 'neon-text-orange'
                        }`}>
                          {item.type}
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-500 flex flex-col items-end gap-0.5">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {item.type === 'task' ? formatDate((item as Task).Deadline) : `${formatDate((item as Project).StartDate)} ~ ${formatDate((item as Project).EndDate)}`}
                        </div>
                        {item.type === 'task' && (item as Task).IsAllDay && (
                          <span className="text-[8px] uppercase tracking-widest text-gray-600">All Day</span>
                        )}
                      </div>
                    </div>

                    <h4 className="text-sm font-bold mb-3 line-clamp-2">
                      {item.type === 'task' ? (item as Task).Content : (item as Project).What}
                    </h4>

                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                          <UserIcon className="w-3 h-3 text-gray-400" />
                        </div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                          {item.type === 'task' ? (item as Task).Assignees?.join(", ") : (item as Project).Assignees?.join(", ")}
                        </span>
                      </div>
                      {item.type === 'task' && !(item as Task).IsAllDay && (item as Task).Time && (
                        <span className="text-[10px] text-gray-500 font-digital">{(item as Task).Time}</span>
                      )}
                      <div className="w-24">
                        <div className="hp-gauge">
                          <div className={`${item.type === 'task' ? 'hp-gauge-blue' : 'hp-gauge-orange'} w-3/4`} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default QuestBoard;
