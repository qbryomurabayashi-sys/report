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

export interface Project {
  ProjectID: string;
  Assignees: string[];
  WithWhom: string;
  StartDate: string;
  EndDate: string;
  What: string;
  Purpose: string;
  Extent: string;
  Status: string;
}

export interface Member {
  id: string;
  name: string;
  role: string;
  area: string;
}

export type ViewType = "Team" | "Calendar" | "Weekly" | "Board";

export type AppState = "loading" | "login" | "dashboard" | "weekly_form" | "decade_form" | "report_feed" | "task_management" | "project_management";
