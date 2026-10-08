import React, { useState } from 'react';
import { CheckCircle2, Circle, Plus, Trash2, AlertCircle, Clock, CheckCheck } from 'lucide-react';
import type { AcademicTask, TaskCategory, TaskPriority } from '../types';
import {
  addDaysToToday,
  formatCountdownLabel,
  formatTime12h,
  getDaysRemaining,
  getTaskTemporalStatus,
} from '../utils/academicUtils';
import {
  createTaskEntry,
  deleteTaskEntry,
  toggleTaskCompletion,
} from '../services/firestoreService';

interface TasksViewProps {
  uid: string;
  tasks: AcademicTask[];
}

const CATEGORIES: TaskCategory[] = [
  'Assignment',
  'Homework',
  'Lab Record',
  'Project',
  'Submission',
  'Study Task',
];

const PRIORITIES: TaskPriority[] = ['High', 'Medium', 'Low'];

export const TasksView: React.FC<TasksViewProps> = ({ uid, tasks }) => {
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState<
    'All' | 'Pending' | 'Upcoming' | 'Overdue' | 'Completed'
  >('All');
  const [searchQuery, setSearchQuery] = useState('');

  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<TaskCategory>('Assignment');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(addDaysToToday(2));
  const [dueTime, setDueTime] = useState('17:00');
  const [priority, setPriority] = useState<TaskPriority>('Medium');

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !subject.trim() || !dueDate) return;
    setSubmitting(true);
    try {
      await createTaskEntry(uid, {
        title,
        subject,
        category,
        description,
        dueDate,
        dueTime,
        priority,
        completed: false,
      });
      setTitle('');
      setSubject('');
      setDescription('');
      setDueDate(addDaysToToday(2));
      setShowForm(false);
    } finally {
      setSubmitting(false);
    }
  };

  const counts = {
    All: tasks.length,
    Pending: tasks.filter((t) => getTaskTemporalStatus(t) === 'Pending').length,
    Upcoming: tasks.filter((t) => getTaskTemporalStatus(t) === 'Upcoming').length,
    Overdue: tasks.filter((t) => getTaskTemporalStatus(t) === 'Overdue').length,
    Completed: tasks.filter((t) => getTaskTemporalStatus(t) === 'Completed').length,
  };

  const filteredTasks = tasks
    .filter((t) => {
      const status = getTaskTemporalStatus(t);
      if (filterStatus !== 'All' && status !== filterStatus) return false;
      if (
        searchQuery.trim() &&
        !`${t.title} ${t.subject} ${t.category} ${t.description}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return getDaysRemaining(a.dueDate) - getDaysRemaining(b.dueDate);
    });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-3xl font-normal tracking-tight text-slate-900">
            Assignments, Homework & Deadlines
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Organize homework, lab records, projects, and submissions with automatic deadline tracking.
          </p>
        </div>
        <button
          onClick={() => setShowForm((prev) => !prev)}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{showForm ? 'Close Task Form' : 'Add Academic Task'}</span>
        </button>
      </div>

      {/* Summary Metric Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-white border border-slate-200 rounded-xl p-5">
        <div className="border-r border-slate-100 pr-4">
          <div className="text-xs text-slate-500">Pending (Due Soon)</div>
          <div className="text-2xl font-mono tabular-nums font-semibold text-amber-600 mt-1">
            {counts.Pending}
          </div>
        </div>
        <div className="sm:border-r border-slate-100 sm:pr-4">
          <div className="text-xs text-slate-500">Overdue Tasks</div>
          <div className="text-2xl font-mono tabular-nums font-semibold text-red-600 mt-1">
            {counts.Overdue}
          </div>
        </div>
        <div className="border-r border-slate-100 pr-4">
          <div className="text-xs text-slate-500">Upcoming</div>
          <div className="text-2xl font-mono tabular-nums font-semibold text-slate-900 mt-1">
            {counts.Upcoming}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Completed</div>
          <div className="text-2xl font-mono tabular-nums font-semibold text-emerald-600 mt-1">
            {counts.Completed}
          </div>
        </div>
      </div>

      {/* Add Task Form */}
      {showForm && (
        <form
          onSubmit={handleCreateTask}
          className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
        >
          <h2 className="text-base font-semibold text-slate-900">
            Create Academic Task or Assignment
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Task Title *
              </label>
              <input
                type="text"
                required
                maxLength={160}
                placeholder="e.g., DBMS Assignment 2 — BCNF Normalization"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
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
                placeholder="e.g., DBMS, Programming, Physics"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TaskCategory)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Due Date *
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Due Time *
              </label>
              <input
                type="time"
                required
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Description & Submission Instructions
              </label>
              <textarea
                rows={2}
                maxLength={2000}
                placeholder="Optional details, required format, or portal submission notes..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Priority Level
              </label>
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                {PRIORITIES.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                      priority === p
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
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
              {submitting ? 'Adding Task...' : 'Save Task'}
            </button>
          </div>
        </form>
      )}

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
          {(['All', 'Pending', 'Overdue', 'Upcoming', 'Completed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                filterStatus === status
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {status} ({counts[status]})
            </button>
          ))}
        </div>

        <input
          type="search"
          placeholder="Filter by title or subject..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 sm:w-64"
        />
      </div>

      {/* Tasks List */}
      {filteredTasks.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <CheckCheck className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900">
            No Matching Academic Tasks
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
            Add homework, assignments, lab records, or project submissions to receive timely deadline reminders.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
          {filteredTasks.map((task) => {
            const status = getTaskTemporalStatus(task);
            const days = getDaysRemaining(task.dueDate);

            return (
              <div
                key={task.id}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-start gap-3.5">
                  <button
                    onClick={() => toggleTaskCompletion(task.id, !task.completed)}
                    className="mt-0.5 text-slate-400 hover:text-slate-900 transition-colors shrink-0"
                    title={task.completed ? 'Mark as pending' : 'Mark as completed'}
                  >
                    {task.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </button>

                  <div className="space-y-1">
                    {/* Unboxed Metadata */}
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
                      <span className="font-medium text-slate-800">{task.subject}</span>
                      <span aria-hidden="true">·</span>
                      <span>{task.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>{task.priority} Priority</span>
                    </div>

                    <h3
                      className={`text-base font-semibold ${
                        task.completed ? 'line-through text-slate-400' : 'text-slate-900'
                      }`}
                    >
                      {task.title}
                    </h3>

                    {task.description && (
                      <p className="text-xs text-slate-600 max-w-2xl">
                        {task.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 pt-1">
                      {status === 'Overdue' ? (
                        <span className="inline-flex items-center gap-1 text-red-600 font-medium">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Overdue by {Math.abs(days)} day(s) — Due {task.dueDate} at{' '}
                          {formatTime12h(task.dueTime)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          Due {task.dueDate} at {formatTime12h(task.dueTime)} (
                          {task.completed ? 'Completed' : formatCountdownLabel(days)})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    onClick={() => toggleTaskCompletion(task.id, !task.completed)}
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap"
                  >
                    {task.completed ? 'Reopen Task' : 'Mark Completed'}
                  </button>
                  <button
                    onClick={() => deleteTaskEntry(task.id)}
                    className="p-2 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                    title="Delete task"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
