export type Role = "店長" | "AM" | "BM";

export interface User {
  UserID: string;
  Name: string;
  Role: Role;
  Area: string;
}

export interface Task {
  TaskID: string;
  Assignees: string[];
  Deadline: string;
  IsAllDay: boolean;
  Time?: string;
  Content: string;
  Status: string;
}

export interface Milestone {
  id: string;
  title: string;
  date: string;
  completed: boolean;
}

export interface Project {
  ProjectID: string;
  Assignees: string[];
  WithWhom: string[];
  StartDate: string;
  EndDate: string;
  What: string;
  Purpose: string;
  Extent: string;
  Status: string;
  Milestones?: Milestone[];
}

export interface Member {
  id: string;
  name: string;
  role: string;
  area: string;
}

export type ViewType = "Team" | "Calendar" | "Weekly" | "Board";

export type AppState = "loading" | "login" | "dashboard" | "weekly_form" | "decade_form" | "am_status_form" | "report_feed" | "task_management" | "project_management" | "settings" | "version_info";
