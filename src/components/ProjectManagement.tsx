import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { User } from "../App";
import { ChevronLeft, Plus, Trash2, CheckCircle, Circle, Calendar as CalendarIcon, User as UserIcon, Users, Target, FileText } from "lucide-react";

interface Project {
  ProjectID: string;
  Assignee: string;
  WithWhom: string;
  StartDate: string;
  EndDate: string;
  What: string;
  Purpose: string;
  Extent: string;
  Status: string;
}

interface ProjectManagementProps {
  user: User;
  onBack: () => void;
}

export function ProjectManagement({ user, onBack }: ProjectManagementProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [newProject, setNewProject] = useState({
    Assignee: user.Name,
    WithWhom: "",
    StartDate: "",
    EndDate: "",
    What: "",
    Purpose: "",
    Extent: ""
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      if (data && data.error) {
        console.error("GAS error for getProjects:", data.error);
        setProjects([]);
      } else {
        setProjects(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Failed to fetch projects", error);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.What || !newProject.StartDate || !newProject.EndDate || !newProject.Assignee) return;

    try {
      await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignee: newProject.Assignee,
          withWhom: newProject.WithWhom,
          startDate: newProject.StartDate,
          endDate: newProject.EndDate,
          what: newProject.What,
          purpose: newProject.Purpose,
          extent: newProject.Extent,
          status: "pending"
        })
      });
      setNewProject({
        Assignee: user.Name,
        WithWhom: "",
        StartDate: "",
        EndDate: "",
        What: "",
        Purpose: "",
        Extent: ""
      });
      fetchProjects();
    } catch (error) {
      console.error("Failed to add project", error);
    }
  };

  const toggleProjectStatus = async (project: Project) => {
    const newStatus = project.Status === "completed" ? "pending" : "completed";
    try {
      await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.ProjectID,
          status: newStatus
        })
      });
      fetchProjects();
    } catch (error) {
      console.error("Failed to update project", error);
    }
  };

  const deleteProject = async (projectId: string) => {
    if (!confirm("このプロジェクトを削除しますか？")) return;
    try {
      await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
      fetchProjects();
    } catch (error) {
      console.error("Failed to delete project", error);
    }
  };

  return (
    <div className="container mx-auto px-4 pt-8 pb-24 max-w-2xl">
      <header className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-2 glass-card rounded-full hover:text-neon-orange transition-colors">
          <ChevronLeft size={24} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-neon-orange font-display tracking-tight">プロジェクト管理</h1>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-digital">Project Management</p>
        </div>
      </header>

      {/* Add Project Form */}
      <form onSubmit={handleAddProject} className="glass-card p-6 rounded-2xl mb-8 border-l-4 border-neon-orange">
        <h3 className="text-sm font-bold text-neon-orange mb-4">新規プロジェクト追加</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">誰が (Assignee)</label>
              <div className="relative">
                <UserIcon size={16} className="absolute left-3 top-3 text-gray-500" />
                <input
                  type="text"
                  value={newProject.Assignee}
                  onChange={(e) => setNewProject({ ...newProject, Assignee: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:border-neon-orange outline-none transition-all"
                  placeholder="担当者名"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">誰と (With Whom)</label>
              <div className="relative">
                <Users size={16} className="absolute left-3 top-3 text-gray-500" />
                <input
                  type="text"
                  value={newProject.WithWhom}
                  onChange={(e) => setNewProject({ ...newProject, WithWhom: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:border-neon-orange outline-none transition-all"
                  placeholder="協力者名"
                />
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">いつから (Start Date)</label>
              <div className="relative">
                <CalendarIcon size={16} className="absolute left-3 top-3 text-gray-500" />
                <input
                  type="date"
                  value={newProject.StartDate}
                  onChange={(e) => setNewProject({ ...newProject, StartDate: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:border-neon-orange outline-none transition-all"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">いつまで (End Date)</label>
              <div className="relative">
                <CalendarIcon size={16} className="absolute left-3 top-3 text-gray-500" />
                <input
                  type="date"
                  value={newProject.EndDate}
                  onChange={(e) => setNewProject({ ...newProject, EndDate: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:border-neon-orange outline-none transition-all"
                  required
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">何を (What)</label>
            <div className="relative">
              <FileText size={16} className="absolute left-3 top-3 text-gray-500" />
              <input
                type="text"
                value={newProject.What}
                onChange={(e) => setNewProject({ ...newProject, What: e.target.value })}
                className="w-full bg-black/40 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:border-neon-orange outline-none transition-all"
                placeholder="プロジェクトの内容"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">何のために (Purpose)</label>
            <div className="relative">
              <Target size={16} className="absolute left-3 top-3 text-gray-500" />
              <input
                type="text"
                value={newProject.Purpose}
                onChange={(e) => setNewProject({ ...newProject, Purpose: e.target.value })}
                className="w-full bg-black/40 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:border-neon-orange outline-none transition-all"
                placeholder="プロジェクトの目的"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">どこまで (Extent)</label>
            <input
              type="text"
              value={newProject.Extent}
              onChange={(e) => setNewProject({ ...newProject, Extent: e.target.value })}
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-neon-orange outline-none transition-all"
              placeholder="達成基準・範囲"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-neon-orange/20 text-neon-orange border border-neon-orange/50 rounded-xl font-bold hover:bg-neon-orange hover:text-black transition-all flex items-center justify-center gap-2"
          >
            <Plus size={18} /> 追加する
          </button>
        </div>
      </form>

      {/* Project List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center text-gray-500 text-sm py-8">読み込み中...</div>
        ) : projects.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-8">プロジェクトはありません</div>
        ) : (
          projects.map((project) => (
            <motion.div
              key={project.ProjectID}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`glass-card p-4 rounded-xl flex items-start gap-4 transition-all ${
                project.Status === "completed" ? "opacity-50" : ""
              }`}
            >
              <button
                onClick={() => toggleProjectStatus(project)}
                className={`mt-1 shrink-0 ${project.Status === "completed" ? "text-neon-orange" : "text-gray-500 hover:text-neon-orange"}`}
              >
                {project.Status === "completed" ? <CheckCircle size={20} /> : <Circle size={20} />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold text-gray-200 ${project.Status === "completed" ? "line-through text-gray-500" : ""}`}>
                  {project.What}
                </p>
                <div className="grid grid-cols-2 gap-2 mt-3 text-[10px] text-gray-400 font-digital uppercase">
                  <span className="flex items-center gap-1"><UserIcon size={10} /> {project.Assignee}</span>
                  <span className="flex items-center gap-1"><Users size={10} /> {project.WithWhom || "なし"}</span>
                  <span className={`flex items-center gap-1 ${project.Status !== "completed" ? "text-neon-orange" : ""}`}>
                    <CalendarIcon size={10} /> {project.StartDate} ~ {project.EndDate}
                  </span>
                </div>
                {(project.Purpose || project.Extent) && (
                  <div className="mt-3 pt-3 border-t border-white/10 text-xs text-gray-400 space-y-1">
                    {project.Purpose && <p><span className="text-gray-500">目的:</span> {project.Purpose}</p>}
                    {project.Extent && <p><span className="text-gray-500">範囲:</span> {project.Extent}</p>}
                  </div>
                )}
              </div>
              <button
                onClick={() => deleteProject(project.ProjectID)}
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
