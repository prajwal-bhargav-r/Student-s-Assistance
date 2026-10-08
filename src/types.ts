import type { Timestamp } from 'firebase/firestore';

export type NavSection =
  | 'dashboard'
  | 'exams'
  | 'tasks'
  | 'notes'
  | 'timetable'
  | 'groups'
  | 'ai-assistant'
  | 'study-planner'
  | 'notifications'
  | 'settings';

export interface UserProfile {
  ownerId: string;
  displayName: string;
  institution: string;
  department: string;
  semester: string;
  targetStudyHoursPerDay: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Exam {
  id: string;
  ownerId: string;
  examName: string;
  subject: string;
  examDate: string; // YYYY-MM-DD
  examTime: string; // HH:MM
  location: string;
  syllabus: string;
  notes: string;
  remindersEnabled: boolean;
  remind7Days: boolean;
  remind3Days: boolean;
  remind1Day: boolean;
  remindExamDay: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export type TaskCategory =
  | 'Assignment'
  | 'Homework'
  | 'Lab Record'
  | 'Project'
  | 'Submission'
  | 'Study Task';

export type TaskPriority = 'High' | 'Medium' | 'Low';

export interface AcademicTask {
  id: string;
  ownerId: string;
  title: string;
  subject: string;
  category: TaskCategory;
  description: string;
  dueDate: string; // YYYY-MM-DD
  dueTime: string; // HH:MM
  priority: TaskPriority;
  completed: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Note {
  id: string;
  ownerId: string;
  title: string;
  semester: string;
  subject: string;
  topic: string;
  content: string;
  attachmentName: string;
  attachmentType: string;
  attachmentDataUrl: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export type DayOfWeek =
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday'
  | 'Sunday';

export interface TimetableSlot {
  id: string;
  ownerId: string;
  day: DayOfWeek;
  periodNumber: number;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  subject: string;
  teacher: string;
  classroom: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface StudyPlan {
  id: string;
  ownerId: string;
  title: string;
  subject: string;
  targetDate: string;
  planContent: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface NotificationItem {
  id: string;
  ownerId: string;
  title: string;
  message: string;
  category: 'Exam' | 'Assignment' | 'Homework' | 'Group' | 'Study' | 'System';
  read: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface StudentGroup {
  id: string;
  ownerId: string;
  creatorName: string;
  name: string;
  subject: string;
  semester: string;
  description: string;
  pinnedAnnouncement: string;
  visibility: 'campus';
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export type GroupPostType =
  | 'Note'
  | 'Study Material'
  | 'Important Question'
  | 'Announcement'
  | 'Discussion';

export interface GroupPost {
  id: string;
  groupId: string;
  ownerId: string;
  authorName: string;
  postType: GroupPostType;
  title: string;
  content: string;
  attachmentName: string;
  attachmentDataUrl: string;
  isPinned: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface SmartReminder {
  id: string;
  type: 'exam-today' | 'exam-1d' | 'exam-3d' | 'exam-7d' | 'exam-upcoming' | 'task-overdue' | 'task-tomorrow' | 'task-upcoming';
  urgency: 'critical' | 'warning' | 'normal';
  title: string;
  message: string;
  subject: string;
  dateStr: string;
  daysDiff: number;
}
