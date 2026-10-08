import React, { useState } from 'react';
import { Calendar, Clock, MapPin, Plus, Trash2, Bell, BellOff, Sparkles, BookOpen, Check } from 'lucide-react';
import type { Exam } from '../types';
import {
  addDaysToToday,
  formatCountdownLabel,
  formatTime12h,
  getDaysRemaining,
} from '../utils/academicUtils';
import {
  createExamEntry,
  deleteExamEntry,
  updateExamEntry,
} from '../services/firestoreService';

interface ExamsViewProps {
  uid: string;
  exams: Exam[];
  onNavigateStudyPlanner: (examId: string) => void;
}

export const ExamsView: React.FC<ExamsViewProps> = ({
  uid,
  exams,
  onNavigateStudyPlanner,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [examName, setExamName] = useState('');
  const [subject, setSubject] = useState('');
  const [examDate, setExamDate] = useState(addDaysToToday(7));
  const [examTime, setExamTime] = useState('09:30');
  const [location, setLocation] = useState('');
  const [syllabus, setSyllabus] = useState('');
  const [notes, setNotes] = useState('');
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [remind7Days, setRemind7Days] = useState(true);
  const [remind3Days, setRemind3Days] = useState(true);
  const [remind1Day, setRemind1Day] = useState(true);
  const [remindExamDay, setRemindExamDay] = useState(true);

  const sortedExams = [...exams].sort(
    (a, b) => getDaysRemaining(a.examDate) - getDaysRemaining(b.examDate)
  );

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examName.trim() || !subject.trim() || !examDate) return;
    setSubmitting(true);
    try {
      await createExamEntry(uid, {
        examName,
        subject,
        examDate,
        examTime,
        location,
        syllabus,
        notes,
        remindersEnabled,
        remind7Days,
        remind3Days,
        remind1Day,
        remindExamDay,
      });
      setExamName('');
      setSubject('');
      setExamDate(addDaysToToday(7));
      setExamTime('09:30');
      setLocation('');
      setSyllabus('');
      setNotes('');
      setShowForm(false);
    } finally {
      setSubmitting(false);
    }
  };

  const getAutomaticReminderPreview = (exam: Exam, days: number): string => {
    if (!exam.remindersEnabled) return 'Automatic reminders disabled for this exam.';
    if (days < 0) return 'Exam date has passed.';
    if (days === 0 && exam.remindExamDay) {
      return `"Your ${exam.subject} exam is today."`;
    }
    if (days === 1 && exam.remind1Day) {
      return `"Your ${exam.subject} exam is tomorrow. Complete your final revision."`;
    }
    if (days <= 3 && days > 1 && exam.remind3Days) {
      return `"Your ${exam.subject} exam is in ${days} days. Make sure you are on track."`;
    }
    if (days <= 7 && days > 3 && exam.remind7Days) {
      return `"Your ${exam.subject} exam is next week. Start preparing."`;
    }
    return `Automatic alerts scheduled for ${[
      exam.remind7Days ? '7 days before' : null,
      exam.remind3Days ? '3 days before' : null,
      exam.remind1Day ? '1 day before' : null,
      exam.remindExamDay ? 'Exam day' : null,
    ]
      .filter(Boolean)
      .join(', ')}.`;
  };

  return (
    <div className="space-y-8">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-3xl font-normal tracking-tight text-slate-900">
            Exam Management & Countdown System
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Track examination dates, syllabi, and automated 7-day, 3-day, 1-day, and exam-day readiness reminders.
          </p>
        </div>
        <button
          onClick={() => setShowForm((prev) => !prev)}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{showForm ? 'Close Exam Form' : 'Add Exam'}</span>
        </button>
      </div>

      {/* Add Exam Form */}
      {showForm && (
        <form
          onSubmit={handleCreateExam}
          className="bg-white border border-slate-200 rounded-xl p-6 space-y-5"
        >
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-semibold text-slate-900">
              Schedule New Examination
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter your exam details below. Remaining days and milestone reminders are calculated automatically.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Exam Name *
              </label>
              <input
                type="text"
                required
                maxLength={140}
                placeholder="e.g., Midterm Assessment I"
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Subject *
              </label>
              <input
                type="text"
                required
                maxLength={100}
                placeholder="e.g., Physics, Mathematics, AI"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Exam Location (Optional)
              </label>
              <input
                type="text"
                maxLength={140}
                placeholder="e.g., Main Block Hall 204"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Exam Date *
              </label>
              <input
                type="date"
                required
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Exam Time *
              </label>
              <input
                type="time"
                required
                value={examTime}
                onChange={(e) => setExamTime(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
              />
            </div>

            <div className="flex items-end">
              <div className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
                Calculated Countdown:{' '}
                <span className="font-mono font-semibold text-slate-900">
                  {formatCountdownLabel(getDaysRemaining(examDate))}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Syllabus / Topics (Comma or line separated)
              </label>
              <textarea
                rows={3}
                maxLength={2000}
                placeholder="e.g., Chapter 1: Wave Optics, Chapter 2: Electromagnetism, Chapter 3: Quantum Mechanics"
                value={syllabus}
                onChange={(e) => setSyllabus(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Preparation Notes (Optional)
              </label>
              <textarea
                rows={3}
                maxLength={2000}
                placeholder="e.g., Focus on previous year derivations and numerical problem sets."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
              />
            </div>
          </div>

          {/* Automatic Milestone Reminder Preferences */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <span className="text-xs font-semibold text-slate-800">
                Automatic Exam Reminder Schedule
              </span>
              <button
                type="button"
                onClick={() => setRemindersEnabled((prev) => !prev)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-slate-900"
              >
                {remindersEnabled ? (
                  <>
                    <Bell className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Reminders Enabled</span>
                  </>
                ) : (
                  <>
                    <BellOff className="w-3.5 h-3.5 text-slate-400" />
                    <span>Reminders Disabled</span>
                  </>
                )}
              </button>
            </div>

            {remindersEnabled && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  {
                    label: '7 Days Before ("Start preparing")',
                    checked: remind7Days,
                    setter: setRemind7Days,
                  },
                  {
                    label: '3 Days Before ("Stay on track")',
                    checked: remind3Days,
                    setter: setRemind3Days,
                  },
                  {
                    label: '1 Day Before ("Final revision")',
                    checked: remind1Day,
                    setter: setRemind1Day,
                  },
                  {
                    label: 'Exam Day ("Exam is today")',
                    checked: remindExamDay,
                    setter: setRemindExamDay,
                  },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => item.setter(!item.checked)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left text-xs transition-colors ${
                      item.checked
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:text-slate-900'
                    }`}
                  >
                    <Check className={`w-3.5 h-3.5 shrink-0 ${item.checked ? 'opacity-100' : 'opacity-30'}`} />
                    <span className="truncate">{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50"
            >
              {submitting ? 'Saving Exam...' : 'Save Exam & Activate Countdown'}
            </button>
          </div>
        </form>
      )}

      {/* Exams List */}
      {sortedExams.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <Calendar className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900">
            No Examinations Scheduled Yet
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-5">
            Add your upcoming exams to activate live day countdowns and automatic 7-day, 3-day, 1-day, and exam-day preparation alerts.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800"
          >
            <Plus className="w-4 h-4" />
            <span>Add First Exam</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedExams.map((exam) => {
            const days = getDaysRemaining(exam.examDate);
            const isUrgent = days >= 0 && days <= 3;
            const isSoon = days > 3 && days <= 7;

            return (
              <div
                key={exam.id}
                className="bg-white border border-slate-200 rounded-xl p-6 transition-colors hover:border-slate-300"
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    {/* Unboxed Metadata Kicker */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-semibold text-slate-800">{exam.subject}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{exam.examDate}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{formatTime12h(exam.examTime)}</span>
                      {exam.location && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {exam.location}
                          </span>
                        </>
                      )}
                    </div>

                    <h3 className="text-lg font-semibold text-slate-900">
                      {exam.examName}
                    </h3>

                    {/* Countdown Headline */}
                    <div className="flex items-center gap-2 text-sm">
                      <Clock
                        className={`w-4 h-4 ${
                          isUrgent
                            ? 'text-red-600'
                            : isSoon
                            ? 'text-amber-600'
                            : 'text-emerald-600'
                        }`}
                      />
                      <span
                        className={`font-mono tabular-nums font-semibold ${
                          isUrgent
                            ? 'text-red-600'
                            : isSoon
                            ? 'text-amber-600'
                            : 'text-slate-900'
                        }`}
                      >
                        {exam.subject} Exam — {formatCountdownLabel(days)}
                      </span>
                    </div>

                    {/* Automatic Milestone Reminder Banner */}
                    <p className="text-xs text-slate-600 pt-1">
                      <span className="font-medium text-slate-800">Active Reminder Status:</span>{' '}
                      {getAutomaticReminderPreview(exam, days)}
                    </p>

                    {exam.syllabus && (
                      <div className="pt-2 text-xs text-slate-600">
                        <span className="font-semibold text-slate-800">Syllabus & Topics: </span>
                        {exam.syllabus}
                      </div>
                    )}

                    {exam.notes && (
                      <div className="text-xs text-slate-500">
                        <span className="font-medium text-slate-700">Notes: </span>
                        {exam.notes}
                      </div>
                    )}
                  </div>

                  {/* Action Controls */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 lg:pt-0">
                    <button
                      onClick={() => onNavigateStudyPlanner(exam.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-900 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-700" />
                      <span>Plan Study Schedule</span>
                    </button>

                    <button
                      onClick={() =>
                        updateExamEntry(exam.id, {
                          remindersEnabled: !exam.remindersEnabled,
                        })
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:text-slate-900 transition-colors whitespace-nowrap"
                      title="Toggle automatic reminders"
                    >
                      {exam.remindersEnabled ? (
                        <>
                          <Bell className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Alerts On</span>
                        </>
                      ) : (
                        <>
                          <BellOff className="w-3.5 h-3.5 text-slate-400" />
                          <span>Alerts Off</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => deleteExamEntry(exam.id)}
                      className="p-2 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                      title="Delete exam"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
