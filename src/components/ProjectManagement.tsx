import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { User, Member, Project, Milestone } from "../types";
import { ChevronLeft, Plus, Trash2, CheckCircle, Circle, Calendar as CalendarIcon, User as UserIcon, Users, Target, FileText, RefreshCw, Flag } from "lucide-react";
import { format, parseISO } from "date-fns";
import { db } from "../firebase";
import { collection, query, getDocs, addDoc, deleteDoc, doc, updateDoc, orderBy, serverTimestamp } from "firebase/firestore";
import { handleFirestoreError, OperationType } from "../lib/firebase-utils";

interface ProjectManagementProps {
  user: User;
  onBack: () => void;
}

export function ProjectManagement({ user, onBack }: ProjectManagementProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [newProject, setNewProject] = useState({
    Assignees: [user.Name],
    WithWhom: [] as string[],
    StartDate: "",
    EndDate: "",
    What: "",
    Purpose: "",
    Extent: "",
    Milestones: [] as Milestone[]
  });
  const [newMilestone, setNewMilestone] = useState({ title: "", date: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const q = query(collection(db, "users"));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().Name,
        role: doc.data().Role,
        area: doc.data().Area
      }));
      setMembers(data as any);
    } catch (error: any) {
      console.error("Failed to fetch members", error);
      handleFirestoreError(error, OperationType.LIST, "users");
    }
  };

  const fetchProjects = async (refresh = false) => {
    setLoading(true);
    try {
      const q = query(collection(db, "projects"), orderBy("EndDate", "asc"));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        ProjectID: doc.id,
        Assignees: doc.data().Assignees || [],
        WithWhom: doc.data().WithWhom || [],
        Milestones: doc.data().Milestones || []
      })) as Project[];
      setProjects(data);
    } catch (error: any) {
      console.error("Failed to fetch projects", error);
      handleFirestoreError(error, OperationType.LIST, "projects");
      setProjects([]);
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

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.What || !newProject.StartDate || !newProject.EndDate || newProject.Assignees.length === 0) return;

    try {
      const projectData = {
        Assignees: newProject.Assignees,
        WithWhom: newProject.WithWhom,
        StartDate: newProject.StartDate,
        EndDate: newProject.EndDate,
        What: newProject.What,
        Purpose: newProject.Purpose,
        Extent: newProject.Extent,
        Status: "pending",
        Milestones: newProject.Milestones,
        CreatedAt: serverTimestamp(),
        CreatedBy: user.UserID
      };

      const docRef = await addDoc(collection(db, "projects"), projectData)
        .catch(e => handleFirestoreError(e, OperationType.CREATE, "projects"));

      if (docRef) {
        // Trigger notifications for all assignees and collaborators
        const allTargetNames = [...new Set([...newProject.Assignees, ...newProject.WithWhom])];
        const targetIds = allTargetNames.map(name => members.find(m => m.name === name)?.id).filter(Boolean);
        
        for (const id of targetIds) {
          if (!id) continue;
          // Main project notification
          await addDoc(collection(db, "notifications"), {
            UserID: id,
            Title: "新規プロジェクト承認",
            Body: `新しいプロジェクト「${newProject.What}」が承認されました。`,
            Url: "/dashboard",
            Read: false,
            CreatedAt: new Date().toISOString(),
            Type: "info"
          }).catch(e => handleFirestoreError(e, OperationType.CREATE, "notifications"));

          // Milestone notifications
          for (const m of newProject.Milestones) {
            await addDoc(collection(db, "notifications"), {
              UserID: id,
              Title: "中間期日設定",
              Body: `プロジェクト「${newProject.What}」に中間期日「${m.title}」(${m.date})が設定されました。`,
              Url: "/dashboard",
              Read: false,
              CreatedAt: new Date().toISOString(),
              Type: "warning"
            }).catch(e => handleFirestoreError(e, OperationType.CREATE, "notifications"));
          }
        }
      }

      setNewProject({
        Assignees: [user.Name],
        WithWhom: [] as string[],
        StartDate: "",
        EndDate: "",
        What: "",
        Purpose: "",
        Extent: "",
        Milestones: []
      });
      fetchProjects();
    } catch (error) {
      console.error("Failed to add project", error);
    }
  };

  const toggleAssignee = (name: string) => {
    setNewProject(prev => {
      const isSelected = prev.Assignees.includes(name);
      if (isSelected) {
        return { ...prev, Assignees: prev.Assignees.filter(a => a !== name) };
      } else {
        return { ...prev, Assignees: [...prev.Assignees, name] };
      }
    });
  };

  const toggleWithWhom = (name: string) => {
    setNewProject(prev => {
      const isSelected = prev.WithWhom.includes(name);
      if (isSelected) {
        return { ...prev, WithWhom: prev.WithWhom.filter(w => w !== name) };
      } else {
        return { ...prev, WithWhom: [...prev.WithWhom, name] };
      }
    });
  };

  const addMilestone = () => {
    if (!newMilestone.title || !newMilestone.date) return;
    const milestone: Milestone = {
      id: Date.now().toString(),
      title: newMilestone.title,
      date: newMilestone.date,
      completed: false
    };
    setNewProject(prev => ({
      ...prev,
      Milestones: [...prev.Milestones, milestone]
    }));
    setNewMilestone({ title: "", date: "" });
  };

  const removeMilestone = (id: string) => {
    setNewProject(prev => ({
      ...prev,
      Milestones: prev.Milestones.filter(m => m.id !== id)
    }));
  };

  const toggleProjectStatus = async (project: Project) => {
    const newStatus = project.Status === "completed" ? "pending" : "completed";
    try {
      await updateDoc(doc(db, "projects", project.ProjectID), {
        Status: newStatus
      }).catch(e => handleFirestoreError(e, OperationType.UPDATE, `projects/${project.ProjectID}`));
      fetchProjects();
    } catch (error) {
      console.error("Failed to update project", error);
    }
  };

  const deleteProject = async (projectId: string) => {
    if (!confirm("このプロジェクトを削除しますか？")) return;
    try {
      await deleteDoc(doc(db, "projects", projectId))
        .catch(e => handleFirestoreError(e, OperationType.DELETE, `projects/${projectId}`));
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
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-neon-orange font-display tracking-tight">プロジェクト管理</h1>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-digital">Project Management</p>
        </div>
        <button 
          onClick={() => {
            fetchProjects(true);
            fetchMembers();
          }}
          disabled={loading}
          className={`p-2 glass-card rounded-xl text-gray-500 hover:text-neon-orange transition-all active:scale-90 ${loading ? "animate-spin text-neon-orange" : ""}`}
          title="最新の情報に更新"
        >
          <RefreshCw size={20} />
        </button>
      </header>

      {/* Add Project Form */}
      <form onSubmit={handleAddProject} className="glass-card p-6 rounded-2xl mb-8 border-l-4 border-neon-orange">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-4 h-4 neon-text-orange" />
          <h3 className="text-sm font-bold text-neon-orange uppercase tracking-widest font-display">New Main Scenario</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-2 font-display">Assignees (Party Members)</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {newProject.Assignees.map(name => (
                <span key={name} className="flex items-center gap-1 px-2 py-1 bg-neon-orange/20 border border-neon-orange rounded-lg text-[10px] neon-text-orange font-bold">
                  {name}
                  <button type="button" onClick={() => toggleAssignee(name)} className="hover:text-white">×</button>
                </span>
              ))}
              {newProject.Assignees.length === 0 && <span className="text-[10px] text-gray-600 italic">No members selected</span>}
            </div>
            
            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <UserIcon size={16} className="absolute left-3 top-3 text-gray-500" />
                <input
                  id="project-assignee-input"
                  list="assignee-list"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const val = (e.target as HTMLInputElement).value.trim();
                      if (val && !newProject.Assignees.includes(val)) {
                        setNewProject({ ...newProject, Assignees: [...newProject.Assignees, val] });
                        (e.target as HTMLInputElement).value = '';
                      }
                    }
                  }}
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:border-neon-orange outline-none transition-all"
                  placeholder="担当者を入力..."
                />
                <datalist id="assignee-list">
                  {members.filter(m => m.role === 'AM' || m.role === 'BM').map(m => (
                    <option key={m.id} value={m.name}>{m.role}</option>
                  ))}
                </datalist>
              </div>
              <button
                type="button"
                onClick={() => {
                  const input = document.getElementById('project-assignee-input') as HTMLInputElement;
                  const val = input.value.trim();
                  if (val && !newProject.Assignees.includes(val)) {
                    setNewProject({ ...newProject, Assignees: [...newProject.Assignees, val] });
                    input.value = '';
                  }
                }}
                className="px-4 py-2 bg-neon-orange/20 border border-neon-orange rounded-xl neon-text-orange text-xs font-bold hover:bg-neon-orange/40 transition-all"
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
                      newProject.Assignees.includes(member.name)
                        ? "bg-neon-orange/20 border-neon-orange neon-text-orange"
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

          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1 font-display">With Whom (External Collaborators)</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {newProject.WithWhom.map(name => (
                <span key={name} className="flex items-center gap-1 px-2 py-1 bg-white/10 border border-white/20 rounded-lg text-[10px] text-gray-300 font-bold">
                  {name}
                  <button type="button" onClick={() => toggleWithWhom(name)} className="hover:text-white">×</button>
                </span>
              ))}
              {newProject.WithWhom.length === 0 && <span className="text-[10px] text-gray-600 italic">No external collaborators</span>}
            </div>
            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <Users size={16} className="absolute left-3 top-3 text-gray-500" />
                <input
                  id="project-withwhom-input"
                  list="member-list"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const val = (e.target as HTMLInputElement).value.trim();
                      if (val && !newProject.WithWhom.includes(val)) {
                        setNewProject({ ...newProject, WithWhom: [...newProject.WithWhom, val] });
                        (e.target as HTMLInputElement).value = '';
                      }
                    }
                  }}
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:border-neon-orange outline-none transition-all"
                  placeholder="協力者を入力..."
                />
                <datalist id="member-list">
                  {members.filter(m => m.role === 'AM' || m.role === 'BM').map(m => (
                    <option key={m.id} value={m.name}>{m.role}</option>
                  ))}
                </datalist>
              </div>
              <button
                type="button"
                onClick={() => {
                  const input = document.getElementById('project-withwhom-input') as HTMLInputElement;
                  const val = input.value.trim();
                  if (val && !newProject.WithWhom.includes(val)) {
                    setNewProject({ ...newProject, WithWhom: [...newProject.WithWhom, val] });
                    input.value = '';
                  }
                }}
                className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-gray-300 text-xs font-bold hover:bg-white/20 transition-all"
              >
                追加
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 bg-black/40 border border-white/10 rounded-xl">
              {members.filter(m => m.role === 'AM' || m.role === 'BM').map(member => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => toggleWithWhom(member.name)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-left ${
                    newProject.WithWhom.includes(member.name)
                      ? "bg-white/20 border-white/40 text-white"
                      : "bg-white/5 border-white/10 text-gray-400 hover:border-white/30"
                  }`}
                >
                  <Users size={12} />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold">{member.name}</span>
                    <span className="text-[8px] opacity-60">{member.role}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Milestones Section */}
          <div className="pt-4 border-t border-white/10">
            <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-2 font-display">Intermediate Deadlines (Milestones)</label>
            <div className="space-y-2 mb-3">
              {newProject.Milestones.map(m => (
                <div key={m.id} className="flex items-center justify-between p-2 bg-white/5 border border-white/10 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Flag size={12} className="text-neon-orange" />
                    <span className="text-xs text-white">{m.title}</span>
                    <span className="text-[10px] text-gray-500 font-digital">{m.date}</span>
                  </div>
                  <button type="button" onClick={() => removeMilestone(m.id)} className="text-gray-500 hover:text-neon-red">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {newProject.Milestones.length === 0 && <p className="text-[10px] text-gray-600 italic">No milestones set</p>}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newMilestone.title}
                onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
                placeholder="期日名 (例: 中間報告)"
                className="flex-1 bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-neon-orange"
              />
              <input
                type="date"
                value={newMilestone.date}
                onChange={(e) => setNewMilestone({ ...newMilestone, date: e.target.value })}
                className="bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-neon-orange"
              />
              <button
                type="button"
                onClick={addMilestone}
                className="p-2 bg-neon-orange/20 border border-neon-orange rounded-xl neon-text-orange hover:bg-neon-orange/40"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1 font-display">Start Date</label>
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
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1 font-display">End Date</label>
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
            <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1 font-display">Objective</label>
            <div className="relative">
              <FileText size={16} className="absolute left-3 top-3 text-gray-500" />
              <input
                type="text"
                value={newProject.What}
                onChange={(e) => setNewProject({ ...newProject, What: e.target.value })}
                className="w-full bg-black/40 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:border-neon-orange outline-none transition-all"
                placeholder="シナリオの内容を入力..."
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1 font-display">Purpose</label>
            <div className="relative">
              <Target size={16} className="absolute left-3 top-3 text-gray-500" />
              <input
                type="text"
                value={newProject.Purpose}
                onChange={(e) => setNewProject({ ...newProject, Purpose: e.target.value })}
                className="w-full bg-black/40 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:border-neon-orange outline-none transition-all"
                placeholder="目的を入力..."
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1 font-display">Success Criteria</label>
            <input
              type="text"
              value={newProject.Extent}
              onChange={(e) => setNewProject({ ...newProject, Extent: e.target.value })}
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-neon-orange outline-none transition-all"
              placeholder="達成基準を入力..."
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-neon-orange/20 text-neon-orange border border-neon-orange/50 rounded-xl font-bold hover:bg-neon-orange hover:text-black transition-all flex items-center justify-center gap-2 font-display uppercase tracking-widest"
          >
            <Plus size={18} /> Accept Scenario
          </button>
        </div>
      </form>

      {/* Project List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center text-gray-500 text-sm py-8 font-display animate-pulse">Scanning Scenario Log...</div>
        ) : projects.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-8 font-display">No Scenarios Available</div>
        ) : (
          projects.map((project) => (
            <motion.div
              key={project.ProjectID}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`quest-card quest-card-project flex items-start gap-4 ${
                project.Status === "completed" ? "opacity-40 grayscale" : ""
              }`}
            >
              <button
                onClick={() => toggleProjectStatus(project)}
                className={`mt-1 shrink-0 ${project.Status === "completed" ? "text-neon-orange" : "text-gray-500 hover:text-neon-orange"}`}
              >
                {project.Status === "completed" ? <CheckCircle size={20} /> : <Circle size={20} />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Target className={`w-3 h-3 ${project.Status === "completed" ? "text-gray-500" : "neon-text-orange"}`} />
                  <p className={`text-sm font-bold text-gray-200 ${project.Status === "completed" ? "line-through text-gray-500" : ""}`}>
                    {project.What}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3 text-[10px] text-gray-400 font-digital uppercase tracking-wider">
                  <span className="flex items-center gap-1 col-span-2"><UserIcon size={10} /> {project.Assignees?.join(", ") || "なし"}</span>
                  <span className="flex items-center gap-1"><Users size={10} /> {project.WithWhom?.join(", ") || "なし"}</span>
                  <span className={`flex items-center gap-1 col-span-2 ${project.Status !== "completed" ? "text-neon-orange" : ""}`}>
                    <CalendarIcon size={10} /> {formatDate(project.StartDate)} ~ {formatDate(project.EndDate)}
                  </span>
                </div>
                {(project.Purpose || project.Extent || (project.Milestones && project.Milestones.length > 0)) && (
                  <div className="mt-3 pt-3 border-t border-white/10 text-[10px] text-gray-400 space-y-1 uppercase tracking-widest">
                    {project.Purpose && <p><span className="text-gray-500">Purpose:</span> {project.Purpose}</p>}
                    {project.Extent && <p><span className="text-gray-500">Criteria:</span> {project.Extent}</p>}
                    {project.Milestones && project.Milestones.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <p className="text-neon-orange font-bold">Milestones:</p>
                        {project.Milestones.map(m => (
                          <div key={m.id} className="flex items-center gap-2 ml-2">
                            <Flag size={8} className={m.completed ? "text-green-400" : "text-neon-orange"} />
                            <span className={m.completed ? "line-through opacity-50" : ""}>{m.title} ({formatDate(m.date)})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <div className="mt-3 w-full">
                  <div className="hp-gauge">
                    <div className={`hp-gauge-orange ${project.Status === "completed" ? "w-full" : "w-1/2"}`} />
                  </div>
                </div>
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
