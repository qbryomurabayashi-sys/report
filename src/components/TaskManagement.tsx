import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { User, Member } from "../types";
import { ChevronLeft, Plus, Trash2, CheckCircle, Circle, Calendar as CalendarIcon, User as UserIcon, RefreshCw, Sword } from "lucide-react";
import { format, parseISO } from "date-fns";

interface Task {
  TaskID: string;
  Assignee: string;
  Deadline: string;
  IsAllDay: boolean;
  Time?: string;
  Content: string;
  Status: string;
}

interface TaskManagementProps {
  user: User;
  onBack: () => void;
}

export function TaskManagement({ user, onBack }: TaskManagementProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [newTask, setNewTask] = useState({ 
    Assignees: [user.Name], 
    Deadline: "", 
    IsAllDay: true,
    Time: "12:00",
    Content: "" 
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const res = await fetch("/api/members");
      const data = await res.json();
      setMembers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch members", error);
    }
  };

  const toggleAssignee = (name: string) => {
    setNewTask(prev => ({
      ...prev,
      Assignees: prev.Assignees.includes(name)
        ? prev.Assignees.filter(a => a !== name)
        : [...prev.Assignees, name]
    }));
  };

  const fetchTasks = async (refresh = false) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks${refresh ? "?refresh=true" : ""}`, {
        headers: { 'Cache-Control': 'no-cache' }
      });
      const data = await res.json();
      if (data && data.error) {
        console.error("GAS error for getTasks:", data.error);
        setTasks([]);
      } else {
        setTasks(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Failed to fetch tasks", error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "yyyy/MM/dd");
    } catch (e) {
      return dateStr;
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.Content || !newTask.Deadline || newTask.Assignees.length === 0) return;

    try {
      await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignees: newTask.Assignees,
          deadline: newTask.Deadline,
          isAllDay: newTask.IsAllDay,
          time: newTask.IsAllDay ? "" : newTask.Time,
          content: newTask.Content,
          status: "pending"
        })
      });
      setNewTask({ 
        Assignees: [user.Name], 
        Deadline: "", 
        IsAllDay: true,
        Time: "12:00",
        Content: "" 
      });
      fetchTasks();
    } catch (error) {
      console.error("Failed to add task", error);
    }
  };

  const toggleTaskStatus = async (task: Task) => {
    const newStatus = task.Status === "completed" ? "pending" : "completed";
    try {
      await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: task.TaskID,
          status: newStatus
        })
      });
      fetchTasks();
    } catch (error) {
      console.error("Failed to update task", error);
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!confirm("このタスクを削除しますか？")) return;
    try {
      await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      fetchTasks();
    } catch (error) {
      console.error("Failed to delete task", error);
    }
  };

  return (
    <div className="container mx-auto px-4 pt-8 pb-24 max-w-2xl">
      <header className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-2 glass-card rounded-full hover:text-neon-blue transition-colors">
          <ChevronLeft size={24} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold neon-text-blue font-display tracking-tight">タスク管理</h1>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-digital">Task Management</p>
        </div>
        <button 
          onClick={() => {
            fetchTasks(true);
            fetchMembers();
          }}
          disabled={loading}
          className={`p-2 glass-card rounded-xl text-gray-500 hover:text-neon-blue transition-all active:scale-90 ${loading ? "animate-spin text-neon-blue" : ""}`}
          title="最新の情報に更新"
        >
          <RefreshCw size={20} />
        </button>
      </header>

      {/* Add Task Form */}
      <form onSubmit={handleAddTask} className="glass-card p-6 rounded-2xl mb-8 border-l-4 border-neon-blue">
        <div className="flex items-center gap-2 mb-4">
          <Sword className="w-4 h-4 neon-text-blue" />
          <h3 className="text-sm font-bold text-neon-blue uppercase tracking-widest font-display">New Quest</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-2 font-display">Assignees (Party Members)</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {newTask.Assignees.map(name => (
                <span key={name} className="flex items-center gap-1 px-2 py-1 bg-neon-blue/20 border border-neon-blue rounded-lg text-[10px] neon-text-blue font-bold">
                  {name}
                  <button type="button" onClick={() => toggleAssignee(name)} className="hover:text-white">×</button>
                </span>
              ))}
              {newTask.Assignees.length === 0 && <span className="text-[10px] text-gray-600 italic">No members selected</span>}
            </div>
            
            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <UserIcon size={16} className="absolute left-3 top-3 text-gray-500" />
                <input
                  id="task-assignee-input"
                  list="task-assignee-list"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const val = (e.target as HTMLInputElement).value.trim();
                      if (val && !newTask.Assignees.includes(val)) {
                        setNewTask({ ...newTask, Assignees: [...newTask.Assignees, val] });
                        (e.target as HTMLInputElement).value = '';
                      }
                    }
                  }}
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:border-neon-blue outline-none transition-all"
                  placeholder="担当者を入力..."
                />
                <datalist id="task-assignee-list">
                  {members.filter(m => m.role === 'AM' || m.role === 'BM').map(m => (
                    <option key={m.id} value={m.name}>{m.role}</option>
                  ))}
                </datalist>
              </div>
              <button
                type="button"
                onClick={() => {
                  const input = document.getElementById('task-assignee-input') as HTMLInputElement;
                  const val = input.value.trim();
                  if (val && !newTask.Assignees.includes(val)) {
                    setNewTask({ ...newTask, Assignees: [...newTask.Assignees, val] });
                    input.value = '';
                  }
                }}
                className="px-4 py-2 bg-neon-blue/20 border border-neon-blue rounded-xl neon-text-blue text-xs font-bold hover:bg-neon-blue/40 transition-all"
              >
                追加
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 bg-black/40 border border-white/10 rounded-xl">
              {members.filter(m => m.role === 'AM' || m.role === 'BM').length === 0 ? (
                <div className="col-span-2 py-4 text-center text-[10px] text-gray-600 italic">
                  No AM/BM members found in spreadsheet. Use the input above to add custom names.
                </div>
              ) : (
                members.filter(m => m.role === 'AM' || m.role === 'BM').map(member => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => toggleAssignee(member.name)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-left ${
                      newTask.Assignees.includes(member.name)
                        ? "bg-neon-blue/20 border-neon-blue neon-text-blue"
                        : "bg-white/5 border-white/10 text-gray-400 hover:border-white/30"
                    }`}
                  >
                    <UserIcon size={12} />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold">{member.name}</span>
                      <span className="text-[8px] opacity-60">{member.role}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1 font-display">Deadline</label>
              <div className="relative">
                <CalendarIcon size={16} className="absolute left-3 top-3 text-gray-500" />
                <input
                  type="date"
                  value={newTask.Deadline}
                  onChange={(e) => setNewTask({ ...newTask, Deadline: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:border-neon-blue outline-none transition-all"
                  required
                />
              </div>
            </div>
            <div className="flex flex-col justify-end">
              <div className="flex items-center gap-4 mb-1">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div 
                    onClick={() => setNewTask({ ...newTask, IsAllDay: !newTask.IsAllDay })}
                    className={`w-10 h-5 rounded-full transition-all relative ${newTask.IsAllDay ? 'bg-neon-blue' : 'bg-white/10'}`}
                  >
                    <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${newTask.IsAllDay ? 'left-6' : 'left-1'}`} />
                  </div>
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest font-display">All Day</span>
                </label>
                {!newTask.IsAllDay && (
                  <input
                    type="time"
                    value={newTask.Time}
                    onChange={(e) => setNewTask({ ...newTask, Time: e.target.value })}
                    className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:border-neon-blue outline-none transition-all"
                  />
                )}
              </div>
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1 font-display">Objective</label>
            <input
              type="text"
              value={newTask.Content}
              onChange={(e) => setNewTask({ ...newTask, Content: e.target.value })}
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-neon-blue outline-none transition-all"
              placeholder="討伐内容を入力..."
              required
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 bg-neon-blue/20 text-neon-blue border border-neon-blue/50 rounded-xl font-bold hover:bg-neon-blue hover:text-black transition-all flex items-center justify-center gap-2 font-display uppercase tracking-widest"
          >
            <Plus size={18} /> Accept Quest
          </button>
        </div>
      </form>

      {/* Task List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center text-gray-500 text-sm py-8 font-display animate-pulse">Scanning Quest Log...</div>
        ) : tasks.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-8 font-display">No Quests Available</div>
        ) : (
          tasks.map((task) => (
            <motion.div
              key={task.TaskID}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`quest-card quest-card-task flex items-start gap-4 ${
                task.Status === "completed" ? "opacity-40 grayscale" : ""
              }`}
            >
              <button
                onClick={() => toggleTaskStatus(task)}
                className={`mt-1 shrink-0 ${task.Status === "completed" ? "text-neon-blue" : "text-gray-500 hover:text-neon-blue"}`}
              >
                {task.Status === "completed" ? <CheckCircle size={20} /> : <Circle size={20} />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Sword className={`w-3 h-3 ${task.Status === "completed" ? "text-gray-500" : "neon-text-blue"}`} />
                  <p className={`text-sm font-bold text-gray-200 ${task.Status === "completed" ? "line-through text-gray-500" : ""}`}>
                    {task.Content}
                  </p>
                </div>
                <div className="flex items-center gap-3 mt-3 text-[10px] text-gray-400 font-digital uppercase tracking-wider">
                  <span className="flex items-center gap-1"><UserIcon size={10} /> {task.Assignees?.join(", ") || "なし"}</span>
                  <span className={`flex items-center gap-1 ${task.Status !== "completed" ? "text-neon-orange" : ""}`}>
                    <CalendarIcon size={10} /> {formatDate(task.Deadline)} {task.IsAllDay ? "(終日)" : task.Time}
                  </span>
                </div>
                <div className="mt-3 w-full">
                  <div className="hp-gauge">
                    <div className={`hp-gauge-blue ${task.Status === "completed" ? "w-full" : "w-1/4"}`} />
                  </div>
                </div>
              </div>
              <button
                onClick={() => deleteTask(task.TaskID)}
                className="p-2 text-gray-500 hover:text-neon-red transition-colors rounded-lg hover:bg-white/5"
              >
                <Trash2 size={16} />
              </button>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
