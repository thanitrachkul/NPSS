

export enum StreamType {
  SCI_MATH = 'วิทย์-คณิต',
  ARTS_MATH = 'ศิลป์-คำนวณ',
  ARTS_LANG = 'ศิลป์-ภาษา',
  ARTS_SOC = 'ศิลป์-สังคม',
  SPECIAL = 'ห้องเรียนพิเศษ (คอม/กีฬา)',
}

export interface StudyPlan {
  id: string;
  name: string;
  quota: number;
}

export interface ExamSubject {
  id: string; // matches keys in Scores
  name: string;
  maxScore: number;
}

export interface Scores {
  math: number;
  science: number;
  thai: number;
  english: number;
  social: number;
  [key: string]: number; // Allow dynamic access
}

export interface Student {
  id: string;
  title: string;
  firstName: string;
  lastName: string;
  preferredStreams: string[]; // Changed to Array for Priority Ranking (1st, 2nd, 3rd...)
  scores: Scores;
}

export interface RankedStudent extends Student {
  totalScore: number;
  rank: number; // Global rank
  qualifiedStream?: string | null; // The stream they actually got based on rank & quota
}

export type WorkStatus = 'COMPLETED' | 'IN_PROGRESS' | 'NOT_STARTED';

export interface Classroom {
  id: string;
  academicYear: string;
  level: 'M.1' | 'M.4';
  name: string;
  studentCount: number;
  planCount: number;
  code: string;
  theme: string;
  status: WorkStatus;
  updatedAt?: string;
  deletedAt?: string;
}

// New Types for System Administration
export interface AdminUser {
  id: string;
  username: string;
  password?: string; // Optional in listing, required in check
  name: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'STAFF' | 'VIEWER';
  lastLogin?: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface SystemConfig {
  scriptUrl: string;
  sheetId: string;
  driveId: string;
}

export type ViewState = 'LANDING' | 'LOGIN' | 'CLASSROOMS' | 'DASHBOARD' | 'SYSTEM_ADMIN';
export type DashboardTab = 'LIST' | 'ANALYSIS' | 'SETTINGS';

export const MAX_SCORE_PER_SUBJECT = 100;
export const TOTAL_SUBJECTS = 5;
export const MAX_TOTAL_SCORE = MAX_SCORE_PER_SUBJECT * TOTAL_SUBJECTS;
