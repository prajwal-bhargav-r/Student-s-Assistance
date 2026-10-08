import React from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  Sparkles,
  BookOpen,
  Users,
  Plus,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import type {
  AcademicTask,
  Exam,
  NavSection,
  Note,
  SmartReminder,
  TimetableSlot,
  UserProfile,
} from '../types';
import {
  formatCountdownLabel,
  formatTime12h,
  getCurrentDayName,
  getDaysRemaining,
  getTaskTemporalStatus,
} from '../utils/academicUtils';
import { toggleTaskCompletion } from '../services/firestoreService';

interface DashboardViewProps {
  profile: UserProfile | null;
  exams: Exam[];
  tasks: AcademicTask[];
  notes: Note[];
  timetable: TimetableSlot[];
  smartReminders: SmartReminder[];
  onNavigate: (section: NavSection) => void;
  onSeedSampleData: () => Promise<void>;
  seeding: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  profile,
  exams,
  tasks,
  notes,
  timetable,
  smartReminders,
  onNavigate,
  onSeedSampleData,
  seeding,
}) => {
  const todayDay = getCurrentDayName();
  const todayClasses = timetable
    .filter((s) => s.day === todayDay)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const upcomingExams = exams
    .filter((e) => getDaysRemaining(e.examDate) >= 0)
    .sort((a, b) => getDaysRemaining(a.examDate) - getDaysRemaining(b.examDate));

  const activeTasks = [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return getDaysRemaining(a.dueDate) - getDaysRemaining(b.dueDate);
  });

  const isWorkspaceEmpty =
    exams.length === 0 &&
    tasks.length === 0 &&
    notes.length === 0 &&
    timetable.length === 0;

  return (
    <div className="space-y-8">
      {/* Welcome & Quick Actions Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>{todayDay}</span>
            <span aria-hidden="true">·</span>
            <span>{profile?.semester || 'Semester 1'}</span>
            <span aria-hidden="true">·</span>
            <span>{profile?.department || 'Academic Companion'}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-normal tracking-tight text-slate-900 mt-1">
            Welcome back, {profile?.displayName || 'Student'}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Here is your schedule for today, upcoming examination countdowns, and priority academic tasks.
          </p>
        </div>

        {/* Quick Actions Bar (Section 2) */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('exams')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Exam</span>
          </button>
          <button
            onClick={() => onNavigate('tasks')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Assignment</span>
          </button>
          <button
            onClick={() => onNavigate('notes')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Add Note</span>
          </button>
          <button
            onClick={() => onNavigate('timetable')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>View Timetable</span>
          </button>
          <button
            onClick={() => onNavigate('ai-assistant')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-indigo-700 bg-indigo-50/70 border border-indigo-200 rounded-lg hover:bg-indigo-100/70 transition-colors whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ask AI</span>
          </button>
          <button
            onClick={() => onNavigate('groups')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Open Groups</span>
          </button>
        </div>
      </div>

      {/* Empty Workspace Quick-Start Prompt */}
      {isWorkspaceEmpty && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-slate-900">
              Get Started with Your Academic Workspace
            </h2>
            <p className="text-xs text-slate-600 max-w-2xl">
              Your dashboard is ready. Add your own classes, exams, and notes using the Quick Actions above, or load a sample college semester (with today's timetable, exam countdowns, assignments, and study notes) in one click.
            </p>
          </div>
          <button
            onClick={onSeedSampleData}
            disabled={seeding}
            className="px-4 py-2.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            {seeding ? 'Loading Sample Semester...' : 'Load Sample Academic Schedule'}
          </button>
        </div>
      )}

      {/* Smart Priority Reminders Strip (Sections 2 & 12) */}
      {smartReminders.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Important Academic Reminders & Priority Queue
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Automatically prioritized based on your upcoming exam dates and assignment deadlines.
              </p>
            </div>
            <button
              onClick={() => onNavigate('notifications')}
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 inline-flex items-center gap-1"
            >
              <span>All Notifications</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-200 border-t border-slate-100">
            {smartReminders.slice(0, 4).map((rem, idx) => (
              <div
                key={rem.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="flex items-start gap-3">
                  <span className="font-mono tabular-nums text-xs font-semibold text-slate-400 mt-0.5">
                    0{idx + 1}.
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span
                        className={`font-semibold ${
                          rem.urgency === 'critical'
                            ? 'text-red-600'
                            : rem.urgency === 'warning'
                            ? 'text-amber-600'
                            : 'text-slate-900'
                        }`}
                      >
                        {rem.title}
                      </span>
                      <span aria-hidden="true" className="text-slate-300">
                        ·
                      </span>
                      <span className="text-slate-500">{rem.subject}</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">{rem.message}</p>
                  </div>
                </div>
                <span className="font-mono tabular-nums text-xs text-slate-500 shrink-0">
                  {rem.dateStr}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main 2-Column Academic Grid: Today's Timetable (Left) + Upcoming Exams (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Today's Timetable (Section 2) */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Today's Timetable — {todayDay}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {todayClasses.length > 0
                  ? `Your timetable contains ${todayClasses.length} scheduled periods today.`
                  : 'No classes scheduled for today.'}
              </p>
            </div>
            <button
              onClick={() => onNavigate('timetable')}
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 inline-flex items-center gap-1"
            >
              <span>Manage</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {todayClasses.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <Clock className="w-6 h-6 text-slate-400 mx-auto" />
              <p className="text-xs text-slate-500">
                No classes added for {todayDay} yet.
              </p>
              <button
                onClick={() => onNavigate('timetable')}
                className="text-xs font-semibold text-slate-900 hover:underline"
              >
                + Add classes to your timetable
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {todayClasses.map((slot) => (
                <div
                  key={slot.id}
                  className="py-3 flex items-center justify-between gap-4"
                >
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono tabular-nums text-xs font-semibold text-slate-900 w-20 shrink-0">
                      {formatTime12h(slot.startTime)}
                    </span>
                    <span className="text-slate-300">—</span>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        {slot.subject}
                      </div>
                      <div className="text-xs text-slate-500">
                        {slot.teacher || 'Academic Period'}
                        {slot.classroom ? ` · ${slot.classroom}` : ''}
                      </div>
                    </div>
                  </div>
                  <span className="font-mono tabular-nums text-xs text-slate-400 shrink-0">
                    until {formatTime12h(slot.endTime)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Exams Countdown (Section 2 & 3) */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Upcoming Examinations & Countdowns
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Live countdowns with automatic 7-day, 3-day, and 1-day alerts.
              </p>
            </div>
            <button
              onClick={() => onNavigate('exams')}
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 inline-flex items-center gap-1"
            >
              <span>All Exams</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {upcomingExams.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <Calendar className="w-6 h-6 text-slate-400 mx-auto" />
              <p className="text-xs text-slate-500">
                No upcoming exams scheduled.
              </p>
              <button
                onClick={() => onNavigate('exams')}
                className="text-xs font-semibold text-slate-900 hover:underline"
              >
                + Add your first examination
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {upcomingExams.slice(0, 5).map((exam) => {
                const days = getDaysRemaining(exam.examDate);
                const isUrgent = days <= 3;
                const isSoon = days > 3 && days <= 7;

                return (
                  <div
                    key={exam.id}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        {exam.subject} Exam —{' '}
                        <span
                          className={`font-mono tabular-nums ${
                            isUrgent
                              ? 'text-red-600'
                              : isSoon
                              ? 'text-amber-600'
                              : 'text-emerald-600'
                          }`}
                        >
                          {formatCountdownLabel(days)}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {exam.examName} ·{' '}
                        <span className="font-mono tabular-nums">
                          {exam.examDate} at {formatTime12h(exam.examTime)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => onNavigate('study-planner')}
                      className="text-xs font-medium text-indigo-700 hover:underline shrink-0 self-start sm:self-center"
                    >
                      Study Plan →
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Assignments, Homework & Deadlines Overview (Section 4) */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Assignments, Homework & Submissions
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Track Pending, Upcoming, Overdue, and Completed academic tasks.
            </p>
          </div>
          <button
            onClick={() => onNavigate('tasks')}
            className="text-xs font-semibold text-slate-700 hover:text-slate-900 inline-flex items-center gap-1"
          >
            <span>Manage All Tasks</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {activeTasks.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500">
            No academic tasks recorded yet. Click "Add Assignment" above to create one.
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {activeTasks.slice(0, 6).map((task) => {
              const status = getTaskTemporalStatus(task);
              return (
                <div
                  key={task.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleTaskCompletion(task.id, !task.completed)}
                      className="mt-0.5 text-slate-400 hover:text-slate-900 shrink-0"
                    >
                      {task.completed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Circle className="w-4 h-4" />
                      )}
                    </button>
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span
                          className={`font-semibold ${
                            status === 'Completed'
                              ? 'text-emerald-600'
                              : status === 'Overdue'
                              ? 'text-red-600'
                              : status === 'Pending'
                              ? 'text-amber-600'
                              : 'text-slate-700'
                          }`}
                        >
                          {status}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-medium text-slate-800">
                          {task.subject}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{task.category}</span>
                      </div>
                      <div
                        className={`text-sm font-semibold mt-0.5 ${
                          task.completed
                            ? 'line-through text-slate-400'
                            : 'text-slate-900'
                        }`}
                      >
                        {task.title}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-mono tabular-nums text-slate-500 self-end sm:self-center">
                    {status === 'Overdue' && (
                      <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                    )}
                    <span>
                      Due {task.dueDate} · {formatTime12h(task.dueTime)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
