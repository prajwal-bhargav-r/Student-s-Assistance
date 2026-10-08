import React, { useState } from 'react';
import {
  Clock,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  CalendarDays,
  Check,
} from 'lucide-react';
import type { DayOfWeek, TimetableSlot } from '../types';
import {
  DAYS_OF_WEEK,
  formatTime12h,
  getCurrentDayName,
} from '../utils/academicUtils';
import {
  createTimetableSlotEntry,
  deleteTimetableSlotEntry,
} from '../services/firestoreService';

interface TimetableViewProps {
  uid: string;
  timetable: TimetableSlot[];
}

interface ExtractedSlot {
  day: DayOfWeek;
  periodNumber: number;
  startTime: string;
  endTime: string;
  subject: string;
  teacher: string;
  classroom: string;
}

export const TimetableView: React.FC<TimetableViewProps> = ({
  uid,
  timetable,
}) => {
  const todayDay = getCurrentDayName();
  const [selectedDay, setSelectedDay] = useState<DayOfWeek | 'All'>(todayDay);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Manual slot form
  const [day, setDay] = useState<DayOfWeek>(todayDay);
  const [periodNumber, setPeriodNumber] = useState(1);
  const [startTime, setStartTime] = useState('08:30');
  const [endTime, setEndTime] = useState('09:30');
  const [subject, setSubject] = useState('');
  const [teacher, setTeacher] = useState('');
  const [classroom, setClassroom] = useState('');

  // AI Timetable Analysis state
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{
    todaySummary: string;
    highlights: string[];
    studyWindows: string[];
    busiestDay: string;
  } | null>(null);
  const [analysisError, setAnalysisError] = useState('');

  // Upload Timetable Image / PDF Extractor state
  const [extracting, setExtracting] = useState(false);
  const [extractedSlots, setExtractedSlots] = useState<ExtractedSlot[]>([]);
  const [extractError, setExtractError] = useState('');
  const [importingExtracted, setImportingExtracted] = useState(false);

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) return;
    setSubmitting(true);
    try {
      await createTimetableSlotEntry(uid, {
        day,
        periodNumber,
        startTime,
        endTime,
        subject,
        teacher,
        classroom,
      });
      setSubject('');
      setTeacher('');
      setClassroom('');
      setPeriodNumber((prev) => Math.min(20, prev + 1));
      setShowAddForm(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAnalyzeTimetable = async () => {
    if (timetable.length === 0) return;
    setAnalyzing(true);
    setAnalysisError('');
    try {
      const response = await fetch('/api/ai/timetable-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentDay: todayDay,
          slots: timetable.map((s) => ({
            day: s.day,
            periodNumber: s.periodNumber,
            startTime: s.startTime,
            endTime: s.endTime,
            subject: s.subject,
            teacher: s.teacher,
            classroom: s.classroom,
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze timetable.');
      }
      setAnalysisResult(data);
    } catch (err) {
      setAnalysisError(
        err instanceof Error ? err.message : 'Unable to analyze timetable.'
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const handleTimetableFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExtracting(true);
    setExtractError('');
    setExtractedSlots([]);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const fileDataUrl = String(reader.result || '');
        const response = await fetch('/api/ai/timetable-extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileDataUrl,
            mimeType: file.type || 'image/png',
          }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to extract timetable.');
        }
        setExtractedSlots(Array.isArray(data.slots) ? data.slots : []);
      } catch (err) {
        setExtractError(
          err instanceof Error
            ? err.message
            : 'Could not extract schedule from file.'
        );
      } finally {
        setExtracting(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleImportExtractedSlots = async () => {
    if (extractedSlots.length === 0) return;
    setImportingExtracted(true);
    try {
      for (const slot of extractedSlots) {
        await createTimetableSlotEntry(uid, {
          day: DAYS_OF_WEEK.includes(slot.day) ? slot.day : todayDay,
          periodNumber: Number(slot.periodNumber) || 1,
          startTime: slot.startTime || '08:30',
          endTime: slot.endTime || '09:30',
          subject: slot.subject || 'Class',
          teacher: slot.teacher || '',
          classroom: slot.classroom || '',
        });
      }
      setExtractedSlots([]);
    } finally {
      setImportingExtracted(false);
    }
  };

  const visibleSlots = timetable
    .filter((s) => selectedDay === 'All' || s.day === selectedDay)
    .sort((a, b) => {
      if (a.day !== b.day) {
        return DAYS_OF_WEEK.indexOf(a.day) - DAYS_OF_WEEK.indexOf(b.day);
      }
      return a.startTime.localeCompare(b.startTime);
    });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-3xl font-normal tracking-tight text-slate-900">
            Timetable Management & AI Schedule Analysis
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Manage daily classes, upload a timetable image/PDF for automatic extraction, and run AI workload analysis.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <label className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap">
            <Upload className="w-3.5 h-3.5" />
            <span>{extracting ? 'Extracting Schedule...' : 'Upload Timetable Image/PDF'}</span>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={handleTimetableFileUpload}
              disabled={extracting}
              className="hidden"
            />
          </label>

          <button
            onClick={handleAnalyzeTimetable}
            disabled={analyzing || timetable.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-900 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-700" />
            <span>{analyzing ? 'Analyzing Timetable...' : 'AI Timetable Summary'}</span>
          </button>

          <button
            onClick={() => setShowAddForm((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>{showAddForm ? 'Close Form' : 'Add Class Period'}</span>
          </button>
        </div>
      </div>

      {extractError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
          {extractError}
        </div>
      )}

      {/* Extracted Timetable Preview */}
      {extractedSlots.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                AI Extracted {extractedSlots.length} Class Periods from Uploaded Timetable
              </h3>
              <p className="text-xs text-slate-500">
                Review the extracted slots below and save them to your account.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setExtractedSlots([])}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                Discard
              </button>
              <button
                onClick={handleImportExtractedSlots}
                disabled={importingExtracted}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>
                  {importingExtracted
                    ? 'Saving to Account...'
                    : `Save All ${extractedSlots.length} Classes`}
                </span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {extractedSlots.map((slot, idx) => (
              <div
                key={idx}
                className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1"
              >
                <div className="font-mono text-slate-500">
                  {slot.day} · Period {slot.periodNumber} · {slot.startTime}–{slot.endTime}
                </div>
                <div className="font-semibold text-slate-900">{slot.subject}</div>
                <div className="text-slate-600">
                  {slot.teacher || 'Instructor TBA'} · {slot.classroom || 'Room TBA'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Timetable Analysis Panel */}
      {analysisError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
          {analysisError}
        </div>
      )}

      {analysisResult && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-700" />
              <h2 className="text-base font-semibold text-slate-900">
                AI Timetable Summary — {analysisResult.todaySummary}
              </h2>
            </div>
            <span className="text-xs text-slate-500">
              Busiest Day: {analysisResult.busiestDay}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-xs font-semibold text-slate-800 mb-2">
                Key Schedule Observations
              </h3>
              <ul className="space-y-1.5 text-xs text-slate-700">
                {analysisResult.highlights.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-slate-400 font-mono">0{i + 1}.</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-slate-800 mb-2">
                Recommended Free-Period & Self-Study Windows
              </h3>
              <ul className="space-y-1.5 text-xs text-slate-700">
                {analysisResult.studyWindows.map((win, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-indigo-700 font-mono">→</span>
                    <span>{win}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Manual Class Entry Form */}
      {showAddForm && (
        <form
          onSubmit={handleAddSlot}
          className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
        >
          <h2 className="text-base font-semibold text-slate-900">
            Add Class / Period to Timetable
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Day of Week *
              </label>
              <select
                value={day}
                onChange={(e) => setDay(e.target.value as DayOfWeek)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
              >
                {DAYS_OF_WEEK.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Period Number *
              </label>
              <input
                type="number"
                min={1}
                max={20}
                required
                value={periodNumber}
                onChange={(e) => setPeriodNumber(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Start Time *
              </label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                End Time *
              </label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Subject / Break Name *
              </label>
              <input
                type="text"
                required
                maxLength={100}
                placeholder="e.g., Mathematics, Programming, Break"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Teacher / Instructor
              </label>
              <input
                type="text"
                maxLength={100}
                placeholder="e.g., Dr. A. Ramanujan"
                value={teacher}
                onChange={(e) => setTeacher(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Classroom / Lab
              </label>
              <input
                type="text"
                maxLength={80}
                placeholder="e.g., CS Lab 204"
                value={classroom}
                onChange={(e) => setClassroom(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50"
            >
              {submitting ? 'Saving Period...' : 'Save Period'}
            </button>
          </div>
        </form>
      )}

      {/* Day Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
        {DAYS_OF_WEEK.map((d) => (
          <button
            key={d}
            onClick={() => setSelectedDay(d)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              selectedDay === d
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {d === todayDay ? `${d} (Today)` : d}
          </button>
        ))}
        <button
          onClick={() => setSelectedDay('All')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
            selectedDay === 'All'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Full Week ({timetable.length})
        </button>
      </div>

      {/* High-Density Timetable Table */}
      {visibleSlots.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <CalendarDays className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900">
            No Classes Scheduled for {selectedDay === 'All' ? 'This Week' : selectedDay}
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-5">
            Add classes manually or upload a timetable image/PDF to populate your schedule.
          </p>
          <button
            onClick={() => {
              if (selectedDay !== 'All') setDay(selectedDay);
              setShowAddForm(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800"
          >
            <Plus className="w-4 h-4" />
            <span>Add Class Period</span>
          </button>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4">Day</th>
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4">Time Slot</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Teacher / Instructor</th>
                  <th className="py-3 px-4">Classroom</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {visibleSlots.map((slot) => (
                  <tr
                    key={slot.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-3 px-4 text-xs font-medium text-slate-700 whitespace-nowrap">
                      {slot.day}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-xs text-slate-500">
                      #{slot.periodNumber}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-xs font-semibold text-slate-900 whitespace-nowrap">
                      {formatTime12h(slot.startTime)} — {formatTime12h(slot.endTime)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {slot.subject}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">
                      {slot.teacher || '—'}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-slate-600">
                      {slot.classroom || '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => deleteTimetableSlotEntry(slot.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                        title="Remove slot"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
