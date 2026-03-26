import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { User } from "../App";
import { ChevronLeft, Plus, Trash2, CheckCircle, Circle, Calendar as CalendarIcon, User as UserIcon } from "lucide-react";

interface Task {
  TaskID: string;
  Assignee: string;
  Deadline: string;
  Content: string;
  Status: string;
}

interface TaskManagementProps {
  user: User;
  onBack: () => void;
}

export function TaskManagement({ user, onBack }: TaskManagementProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState({ Assignee: user.Name, Deadline: "", Content: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      setTasks(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch tasks", error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.Content || !newTask.Deadline || !newTask.Assignee) return;

    try {
      await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignee: newTask.Assignee,
          deadline: newTask.Deadline,
          content: newTask.Content,
          status: "pending"
        })
      });
      setNewTask({ Assignee: user.Name, Deadline: "", Content: "" });
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
        <div>
          <h1 className="text-2xl font-bold neon-text-blue font-display tracking-tight">タスク管理</h1>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-digital">Task Management</p>
        </div>
      </header>

      {/* Add Task Form */}
      <form onSubmit={handleAddTask} className="glass-card p-6 rounded-2xl mb-8 border-l-4 border-neon-blue">
        <h3 className="text-sm font-bold text-neon-blue mb-4">新規タスク追加</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">誰が (Assignee)</label>
            <div className="relative">
              <UserIcon size={16} className="absolute left-3 top-3 text-gray-500" />
              <input
                type="text"
                value={newTask.Assignee}
                onChange={(e) => setNewTask({ ...newTask, Assignee: e.target.value })}
                className="w-full bg-black/40 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:border-neon-blue outline-none transition-all"
                placeholder="担当者名"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">いつまでに (Deadline)</label>
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
          <div>
            <label className="block text-xs text-gray-400 mb-1">何を (Content)</label>
            <input
              type="text"
              value={newTask.Content}
              onChange={(e) => setNewTask({ ...newTask, Content: e.target.value })}
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-neon-blue outline-none transition-all"
              placeholder="タスクの内容"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 bg-neon-blue/20 text-neon-blue border border-neon-blue/50 rounded-xl font-bold hover:bg-neon-blue hover:text-black transition-all flex items-center justify-center gap-2"
          >
            <Plus size={18} /> 追加する
          </button>
        </div>
      </form>

      {/* Task List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center text-gray-500 text-sm py-8">読み込み中...</div>
        ) : tasks.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-8">タスクはありません</div>
        ) : (
          tasks.map((task) => (
            <motion.div
              key={task.TaskID}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`glass-card p-4 rounded-xl flex items-start gap-4 transition-all ${
                task.Status === "completed" ? "opacity-50" : ""
              }`}
            >
              <button
                onClick={() => toggleTaskStatus(task)}
                className={`mt-1 shrink-0 ${task.Status === "completed" ? "text-neon-blue" : "text-gray-500 hover:text-neon-blue"}`}
              >
                {task.Status === "completed" ? <CheckCircle size={20} /> : <Circle size={20} />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold text-gray-200 ${task.Status === "completed" ? "line-through text-gray-500" : ""}`}>
                  {task.Content}
                </p>
                <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400 font-digital uppercase">
                  <span className="flex items-center gap-1"><UserIcon size={10} /> {task.Assignee}</span>
                  <span className={`flex items-center gap-1 ${task.Status !== "completed" ? "text-neon-orange" : ""}`}>
                    <CalendarIcon size={10} /> {task.Deadline}
                  </span>
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
