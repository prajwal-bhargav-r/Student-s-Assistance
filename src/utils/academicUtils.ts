import type { AcademicTask, DayOfWeek, Exam, Note, SmartReminder } from '../types';

export const DAYS_OF_WEEK: DayOfWeek[] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export function getCurrentDayName(): DayOfWeek {
  const idx = new Date().getDay();
  // JS getDay(): 0 = Sunday, 1 = Monday, ...
  const map: DayOfWeek[] = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];
  return map[idx] || 'Monday';
}

export function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDaysToToday(daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getDaysRemaining(targetDateStr: string): number {
  const todayStr = getTodayDateString();
  const [ty, tm, td] = todayStr.split('-').map(Number);
  const [ey, em, ed] = targetDateStr.split('-').map(Number);
  if (!ey || !em || !ed) return 0;
  const todayMidnight = new Date(ty, tm - 1, td).getTime();
  const targetMidnight = new Date(ey, em - 1, ed).getTime();
  return Math.round((targetMidnight - todayMidnight) / (1000 * 60 * 60 * 24));
}

export function formatTime12h(time24: string): string {
  if (!time24 || !time24.includes(':')) return time24;
  const [hStr, mStr] = time24.split(':');
  const h = parseInt(hStr, 10);
  if (isNaN(h)) return time24;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mStr} ${suffix}`;
}

export function formatCountdownLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)}d ago`;
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow (1 day remaining)';
  return `${days} days remaining`;
}

export function getTaskTemporalStatus(
  task: AcademicTask
): 'Completed' | 'Overdue' | 'Pending' | 'Upcoming' {
  if (task.completed) return 'Completed';
  const days = getDaysRemaining(task.dueDate);
  if (days < 0) return 'Overdue';
  if (days <= 2) return 'Pending';
  return 'Upcoming';
}

export function computeSmartReminders(
  exams: Exam[],
  tasks: AcademicTask[],
  notes: Note[]
): SmartReminder[] {
  const reminders: SmartReminder[] = [];

  for (const exam of exams) {
    if (!exam.remindersEnabled) continue;
    const days = getDaysRemaining(exam.examDate);
    if (days < 0) continue;

    const syllabusTopics = exam.syllabus
      ? exam.syllabus
          .split(/[,;\n]/)
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    const matchingNotesCount = notes.filter(
      (n) => n.subject.toLowerCase() === exam.subject.toLowerCase()
    ).length;

    const topicInsight =
      syllabusTopics.length > 0
        ? ` You have ${syllabusTopics.length} syllabus topics listed and ${matchingNotesCount} saved note(s) for ${exam.subject}.`
        : '';

    if (days === 0 && exam.remindExamDay) {
      reminders.push({
        id: `exam-today-${exam.id}`,
        type: 'exam-today',
        urgency: 'critical',
        title: `${exam.subject} Exam Today`,
        message: `Your ${exam.subject} exam (${exam.examName}) is today at ${formatTime12h(exam.examTime)}.`,
        subject: exam.subject,
        dateStr: exam.examDate,
        daysDiff: 0,
      });
    } else if (days === 1 && exam.remind1Day) {
      reminders.push({
        id: `exam-1d-${exam.id}`,
        type: 'exam-1d',
        urgency: 'critical',
        title: `${exam.subject} Exam Tomorrow`,
        message: `Your ${exam.subject} exam is tomorrow. Complete your final revision.${topicInsight}`,
        subject: exam.subject,
        dateStr: exam.examDate,
        daysDiff: 1,
      });
    } else if (days > 1 && days <= 3 && exam.remind3Days) {
      reminders.push({
        id: `exam-3d-${exam.id}`,
        type: 'exam-3d',
        urgency: 'warning',
        title: `${exam.subject} Exam in ${days} Days`,
        message: `Your ${exam.subject} exam is in ${days} days. Make sure you are on track.${topicInsight}`,
        subject: exam.subject,
        dateStr: exam.examDate,
        daysDiff: days,
      });
    } else if (days > 3 && days <= 7 && exam.remind7Days) {
      reminders.push({
        id: `exam-7d-${exam.id}`,
        type: 'exam-7d',
        urgency: 'warning',
        title: `${exam.subject} Exam Next Week`,
        message: `Your ${exam.subject} exam is in ${days} days. Start preparing.${topicInsight}`,
        subject: exam.subject,
        dateStr: exam.examDate,
        daysDiff: days,
      });
    } else if (days > 7 && days <= 14) {
      reminders.push({
        id: `exam-upcoming-${exam.id}`,
        type: 'exam-upcoming',
        urgency: 'normal',
        title: `${exam.subject} Exam — ${days} days remaining`,
        message: `Scheduled for ${exam.examDate} at ${formatTime12h(exam.examTime)}.${topicInsight}`,
        subject: exam.subject,
        dateStr: exam.examDate,
        daysDiff: days,
      });
    }
  }

  for (const task of tasks) {
    if (task.completed) continue;
    const days = getDaysRemaining(task.dueDate);

    if (days < 0) {
      reminders.push({
        id: `task-overdue-${task.id}`,
        type: 'task-overdue',
        urgency: 'critical',
        title: `Overdue: ${task.title}`,
        message: `${task.title} (${task.subject}) was due ${Math.abs(days)} day(s) ago. Prioritize completion immediately.`,
        subject: task.subject,
        dateStr: task.dueDate,
        daysDiff: days,
      });
    } else if (days === 0) {
      reminders.push({
        id: `task-today-${task.id}`,
        type: 'task-tomorrow',
        urgency: 'critical',
        title: `Due Today: ${task.title}`,
        message: `${task.title} (${task.subject}) is due today by ${formatTime12h(task.dueTime)}.`,
        subject: task.subject,
        dateStr: task.dueDate,
        daysDiff: 0,
      });
    } else if (days === 1) {
      reminders.push({
        id: `task-tomorrow-${task.id}`,
        type: 'task-tomorrow',
        urgency: 'warning',
        title: `Due Tomorrow: ${task.title}`,
        message: `${task.title} is due tomorrow at ${formatTime12h(task.dueTime)}.`,
        subject: task.subject,
        dateStr: task.dueDate,
        daysDiff: 1,
      });
    } else if (days <= 5) {
      reminders.push({
        id: `task-upcoming-${task.id}`,
        type: 'task-upcoming',
        urgency: 'normal',
        title: `${task.title} — ${days} days away`,
        message: `${task.category} for ${task.subject} due on ${task.dueDate}.`,
        subject: task.subject,
        dateStr: task.dueDate,
        daysDiff: days,
      });
    }
  }

  return reminders.sort((a, b) => a.daysDiff - b.daysDiff);
}
