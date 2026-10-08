import React, { useState } from 'react';
import {
  Sparkles,
  Send,
  Calendar,
  TrendingUp,
  Trash2,
  BookmarkCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';
import type {
  AcademicTask,
  Exam,
  Note,
  StudyPlan,
  TimetableSlot,
} from '../types';
import {
  getDaysRemaining,
  getTaskTemporalStatus,
} from '../utils/academicUtils';
import {
  createStudyPlanEntry,
  deleteStudyPlanEntry,
} from '../services/firestoreService';

interface AiAssistantViewProps {
  uid: string;
  initialTab?: 'doubt-solver' | 'study-planner';
  initialFocusExamId?: string;
  exams: Exam[];
  tasks: AcademicTask[];
  timetable: TimetableSlot[];
  notes: Note[];
  studyPlans: StudyPlan[];
  dailyStudyHours: number;
}

const ACADEMIC_SUBJECTS = [
  'General Academics',
  'Programming',
  'Mathematics',
  'Physics',
  'Chemistry',
  'Electronics',
  'Artificial Intelligence',
  'Machine Learning',
  'Computer Science',
];

const STARTER_QUESTIONS = [
  'What is polymorphism in object-oriented programming?',
  "Explain Newton's three laws of motion with engineering examples.",
  'How does backpropagation in a neural network work step by step?',
  'What is the difference between supervised and unsupervised learning?',
  'Explain eigenvalues and eigenvectors intuitively.',
];

export const AiAssistantView: React.FC<AiAssistantViewProps> = ({
  uid,
  initialTab = 'doubt-solver',
  initialFocusExamId = '',
  exams,
  tasks,
  timetable,
  notes,
  studyPlans,
  dailyStudyHours,
}) => {
  const [activeTab, setActiveTab] = useState<'doubt-solver' | 'study-planner'>(
    initialTab
  );

  // AI Doubt Assistant state
  const [selectedSubject, setSelectedSubject] = useState('General Academics');
  const [includeNotesContext, setIncludeNotesContext] = useState(true);
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [chatHistory, setChatHistory] = useState<
    Array<{ role: 'user' | 'assistant'; subject: string; text: string }>
  >([]);

  // AI Study Planner state
  const [focusExamId, setFocusExamId] = useState(initialFocusExamId);
  const [customDailyHours, setCustomDailyHours] = useState(dailyStudyHours || 3);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<{
    planTitle: string;
    targetSubject: string;
    targetDate: string;
    smartAlert: string;
    prioritizedDeadlines: Array<{
      rank: number;
      itemTitle: string;
      timeframe: string;
      recommendation: string;
    }>;
    dailySchedule: Array<{
      dayLabel: string;
      focusTopic: string;
      activities: string;
      durationHours: number;
    }>;
  } | null>(null);
  const [planError, setPlanError] = useState('');
  const [savingPlan, setSavingPlan] = useState(false);

  const handleAskDoubt = async (qText?: string) => {
    const queryToUse = (qText ?? question).trim();
    if (!queryToUse || asking) return;
    setQuestion('');
    const updatedHistory = [
      ...chatHistory,
      { role: 'user' as const, subject: selectedSubject, text: queryToUse },
    ];
    setChatHistory(updatedHistory);
    setAsking(true);

    try {
      const relevantNotes = includeNotesContext
        ? notes
            .map((n) => `[${n.subject} - ${n.title}]: ${n.content.slice(0, 1500)}`)
            .join('\n\n')
        : '';

      const response = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: queryToUse,
          subject: selectedSubject,
          contextNotes: relevantNotes,
          history: updatedHistory,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get AI response.');
      }
      setChatHistory((prev) => [
        ...prev,
        {
          role: 'assistant',
          subject: selectedSubject,
          text: data.answer || 'No response received.',
        },
      ]);
    } catch (err) {
      setChatHistory((prev) => [
        ...prev,
        {
          role: 'assistant',
          subject: selectedSubject,
          text: `Error: ${err instanceof Error ? err.message : 'Unable to reach AI Assistant.'}`,
        },
      ]);
    } finally {
      setAsking(false);
    }
  };

  const handleGenerateStudyPlan = async () => {
    setGeneratingPlan(true);
    setPlanError('');
    try {
      const response = await fetch('/api/ai/study-planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dailyStudyHours: customDailyHours,
          focusExamId,
          exams: exams.map((e) => ({
            id: e.id,
            examName: e.examName,
            subject: e.subject,
            examDate: e.examDate,
            examTime: e.examTime,
            syllabus: e.syllabus,
            daysRemaining: getDaysRemaining(e.examDate),
          })),
          tasks: tasks.map((t) => ({
            title: t.title,
            subject: t.subject,
            category: t.category,
            dueDate: t.dueDate,
            priority: t.priority,
            completed: t.completed,
          })),
          timetable: timetable.map((s) => ({
            day: s.day,
            startTime: s.startTime,
            endTime: s.endTime,
            subject: s.subject,
          })),
          notesSummary: notes.map((n) => `${n.subject}: ${n.title} (${n.topic})`).join('; '),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate study plan.');
      }
      setGeneratedPlan(data);
    } catch (err) {
      setPlanError(
        err instanceof Error ? err.message : 'Failed to generate study plan.'
      );
    } finally {
      setGeneratingPlan(false);
    }
  };

  const handleSaveGeneratedPlan = async () => {
    if (!generatedPlan) return;
    setSavingPlan(true);
    try {
      const formattedSchedule = [
        `Smart Alert: ${generatedPlan.smartAlert}`,
        '',
        'Prioritized Deadlines:',
        ...generatedPlan.prioritizedDeadlines.map(
          (p) => `${p.rank}. ${p.itemTitle} (${p.timeframe}) — ${p.recommendation}`
        ),
        '',
        'Day-by-Day Study Schedule:',
        ...generatedPlan.dailySchedule.map(
          (d) =>
            `${d.dayLabel} — ${d.focusTopic} (${d.durationHours}h): ${d.activities}`
        ),
      ].join('\n');

      await createStudyPlanEntry(uid, {
        title: generatedPlan.planTitle,
        subject: generatedPlan.targetSubject,
        targetDate: generatedPlan.targetDate,
        planContent: formattedSchedule,
      });
    } finally {
      setSavingPlan(false);
    }
  };

  // Academic Progress Metrics (Section 13)
  const completedTasks = tasks.filter((t) => t.completed).length;
  const pendingTasks = tasks.filter((t) => !t.completed).length;
  const overdueTasks = tasks.filter(
    (t) => getTaskTemporalStatus(t) === 'Overdue'
  ).length;
  const completionRate =
    tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  // Subject-wise breakdown
  const allSubjects = Array.from(
    new Set([
      ...exams.map((e) => e.subject),
      ...tasks.map((t) => t.subject),
      ...notes.map((n) => n.subject),
    ])
  ).filter(Boolean);

  return (
    <div className="space-y-8">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-3xl font-normal tracking-tight text-slate-900">
            AI Academic Assistant, Study Planner & Progress
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Resolve subject doubts, generate adaptive day-by-day exam study plans, and track your semester progress.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0">
          <button
            onClick={() => setActiveTab('doubt-solver')}
            className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'doubt-solver'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            AI Doubt Assistant
          </button>
          <button
            onClick={() => setActiveTab('study-planner')}
            className={`px-3.5 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'study-planner'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            AI Study Planner & Progress
          </button>
        </div>
      </div>

      {activeTab === 'doubt-solver' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Configuration & Starter Prompts */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-semibold text-slate-900">
                Academic Subject Focus
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {ACADEMIC_SUBJECTS.map((sub) => (
                  <button
                    key={sub}
                    onClick={() => setSelectedSubject(sub)}
                    className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                      selectedSubject === sub
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:text-slate-900'
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-700">
                  Reference My Saved Notes ({notes.length})
                </span>
                <button
                  type="button"
                  onClick={() => setIncludeNotesContext((prev) => !prev)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md ${
                    includeNotesContext
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {includeNotesContext ? 'Active' : 'Off'}
                </button>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
              <h3 className="text-xs font-semibold text-slate-800">
                Example Academic Questions
              </h3>
              <div className="space-y-2">
                {STARTER_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleAskDoubt(q)}
                    disabled={asking}
                    className="w-full text-left p-2.5 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:border-slate-400 transition-colors"
                  >
                    "{q}"
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Conversation Canvas */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl flex flex-col min-h-[540px]">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-700" />
                <span className="text-sm font-semibold text-slate-900">
                  Personal Academic Tutor — {selectedSubject}
                </span>
              </div>
              {chatHistory.length > 0 && (
                <button
                  onClick={() => setChatHistory([])}
                  className="text-xs text-slate-500 hover:text-slate-900"
                >
                  Clear Session
                </button>
              )}
            </div>

            <div className="flex-1 p-6 space-y-5 overflow-y-auto max-h-[520px]">
              {chatHistory.length === 0 ? (
                <div className="text-center py-16 space-y-2">
                  <Sparkles className="w-8 h-8 text-slate-300 mx-auto" />
                  <h3 className="text-base font-semibold text-slate-900">
                    Ask Any Academic Doubt
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Get step-by-step explanations for Programming code, Mathematics proofs, Physics laws, Electronics circuits, or AI & Machine Learning algorithms.
                  </p>
                </div>
              ) : (
                chatHistory.map((msg, i) => (
                  <div
                    key={i}
                    className={`space-y-1.5 ${
                      msg.role === 'user' ? 'pl-8' : 'pr-4'
                    }`}
                  >
                    <div className="text-xs text-slate-400">
                      {msg.role === 'user'
                        ? `You · ${msg.subject}`
                        : `AI Academic Assistant · ${msg.subject}`}
                    </div>
                    <div
                      className={`p-4 rounded-xl text-sm whitespace-pre-wrap leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-50 border border-slate-200 text-slate-800'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))
              )}
              {asking && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
                  Synthesizing step-by-step academic explanation...
                </div>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAskDoubt();
              }}
              className="p-4 border-t border-slate-200 flex gap-2"
            >
              <input
                type="text"
                placeholder={`Ask a question in ${selectedSubject}...`}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                disabled={asking}
                className="flex-1 px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
              />
              <button
                type="submit"
                disabled={asking || !question.trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Ask AI</span>
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Student Progress Overview (Section 13) */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span>Student Academic Progress & Workload Overview</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real-time completion rate across assignments, upcoming exams, and subject study coverage.
                </p>
              </div>
              <div className="text-xs font-mono tabular-nums text-slate-700">
                Overall Task Completion Rate:{' '}
                <span className="font-semibold text-slate-900">{completionRate}%</span>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="space-y-2">
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600 transition-all"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-xs text-slate-500 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Completed Tasks
                  </div>
                  <div className="text-xl font-mono tabular-nums font-semibold text-slate-900 mt-1">
                    {completedTasks}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-xs text-slate-500 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    Pending Tasks
                  </div>
                  <div className="text-xl font-mono tabular-nums font-semibold text-slate-900 mt-1">
                    {pendingTasks}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-xs text-slate-500 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                    Overdue Tasks
                  </div>
                  <div className="text-xl font-mono tabular-nums font-semibold text-red-600 mt-1">
                    {overdueTasks}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-xs text-slate-500 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-700" />
                    Upcoming Exams
                  </div>
                  <div className="text-xl font-mono tabular-nums font-semibold text-slate-900 mt-1">
                    {exams.filter((e) => getDaysRemaining(e.examDate) >= 0).length}
                  </div>
                </div>
              </div>
            </div>

            {/* Subject Progress Breakdown */}
            {allSubjects.length > 0 && (
              <div className="pt-2">
                <h3 className="text-xs font-semibold text-slate-800 mb-3">
                  Subject-by-Subject Readiness
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {allSubjects.map((sub) => {
                    const subTasks = tasks.filter((t) => t.subject === sub);
                    const subDone = subTasks.filter((t) => t.completed).length;
                    const subNotes = notes.filter((n) => n.subject === sub).length;
                    const subExams = exams.filter((e) => e.subject === sub);
                    const pct =
                      subTasks.length > 0
                        ? Math.round((subDone / subTasks.length) * 100)
                        : 100;

                    return (
                      <div
                        key={sub}
                        className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-900">{sub}</span>
                          <span className="font-mono tabular-nums text-slate-600">
                            {subDone}/{subTasks.length} tasks · {subNotes} notes
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-slate-900"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        {subExams[0] && (
                          <div className="text-xs text-slate-500 font-mono">
                            Next Exam: {subExams[0].examDate} (
                            {getDaysRemaining(subExams[0].examDate)}d left)
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* AI Study Planner Generator (Sections 11 & 12) */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-700" />
                  <span>AI Study Planner & Smart Deadline Prioritizer</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Synthesizes your exam dates, syllabus topics, timetable, tasks, and available daily study hours into a structured day-by-day plan.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={focusExamId}
                  onChange={(e) => setFocusExamId(e.target.value)}
                  className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="">All Upcoming Exams</option>
                  {exams.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.subject} — {ex.examName} ({getDaysRemaining(ex.examDate)}d)
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-1.5 text-xs text-slate-700">
                  <span>Study hrs/day:</span>
                  <input
                    type="number"
                    min={1}
                    max={14}
                    value={customDailyHours}
                    onChange={(e) => setCustomDailyHours(Number(e.target.value))}
                    className="w-14 px-2 py-1.5 font-mono text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>

                <button
                  onClick={handleGenerateStudyPlan}
                  disabled={generatingPlan}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {generatingPlan ? 'Building Study Plan...' : 'Generate AI Study Plan'}
                  </span>
                </button>
              </div>
            </div>

            {planError && (
              <p className="text-xs text-red-600">{planError}</p>
            )}

            {generatedPlan && (
              <div className="space-y-6 pt-2">
                {/* Smart Alert Banner */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-indigo-700">
                      Smart Academic Recommendation
                    </div>
                    <p className="text-sm font-medium text-slate-900 mt-0.5">
                      "{generatedPlan.smartAlert}"
                    </p>
                  </div>
                  <button
                    onClick={handleSaveGeneratedPlan}
                    disabled={savingPlan}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 whitespace-nowrap shrink-0"
                  >
                    <BookmarkCheck className="w-3.5 h-3.5" />
                    <span>{savingPlan ? 'Saving...' : 'Save Plan to Account'}</span>
                  </button>
                </div>

                {/* Smart Prioritized Deadlines */}
                <div>
                  <h3 className="text-xs font-semibold text-slate-800 mb-2.5">
                    Smart Priority Order (Upcoming Deadlines & Exams)
                  </h3>
                  <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl">
                    {generatedPlan.prioritizedDeadlines.map((item) => (
                      <div
                        key={item.rank}
                        className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono font-semibold text-slate-900">
                            {item.rank}.
                          </span>
                          <span className="font-semibold text-slate-900">
                            {item.itemTitle}
                          </span>
                          <span className="text-slate-400">—</span>
                          <span className="font-mono text-amber-700 font-medium">
                            {item.timeframe}
                          </span>
                        </div>
                        <span className="text-slate-600">{item.recommendation}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Day-by-Day Study Schedule */}
                <div>
                  <h3 className="text-xs font-semibold text-slate-800 mb-2.5">
                    Day-by-Day Preparation Schedule — {generatedPlan.planTitle}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {generatedPlan.dailySchedule.map((dayItem, idx) => (
                      <div
                        key={idx}
                        className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono font-semibold text-slate-900">
                            {dayItem.dayLabel} — {dayItem.focusTopic}
                          </span>
                          <span className="font-mono text-slate-500">
                            {dayItem.durationHours}h
                          </span>
                        </div>
                        <p className="text-xs text-slate-600">{dayItem.activities}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Saved Study Plans List */}
          {studyPlans.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-slate-900">
                Saved Study Plans ({studyPlans.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {studyPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className="bg-white border border-slate-200 rounded-xl p-5 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-xs text-slate-500">
                          {plan.subject} · Target: {plan.targetDate}
                        </div>
                        <h3 className="text-sm font-semibold text-slate-900 mt-0.5">
                          {plan.title}
                        </h3>
                      </div>
                      <button
                        onClick={() => deleteStudyPlanEntry(plan.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"
                        title="Delete study plan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed bg-slate-50 p-3.5 rounded-lg border border-slate-200 max-h-60 overflow-y-auto">
                      {plan.planContent}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
