import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
  Edit3,
  BookOpen,
  Download,
} from 'lucide-react';
import type { Note } from '../types';
import {
  createNoteEntry,
  deleteNoteEntry,
  updateNoteEntry,
} from '../services/firestoreService';

interface NotesViewProps {
  uid: string;
  defaultSemester: string;
  notes: Note[];
}

export const NotesView: React.FC<NotesViewProps> = ({
  uid,
  defaultSemester,
  notes,
}) => {
  const [selectedSemester, setSelectedSemester] = useState<string>('All');
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeNoteId, setActiveNoteId] = useState<string | null>(
    notes[0]?.id || null
  );

  // Create / Edit form state
  const [isEditing, setIsEditing] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [semester, setSemester] = useState(defaultSemester || 'Semester 1');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [content, setContent] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [attachmentType, setAttachmentType] = useState('');
  const [attachmentDataUrl, setAttachmentDataUrl] = useState('');
  const [uploadNotice, setUploadNotice] = useState('');
  const [saving, setSaving] = useState(false);

  // AI Notes Assistant state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState('');
  const [aiError, setAiError] = useState('');
  const [customAiPrompt, setCustomAiPrompt] = useState('');

  const semesters: string[] = [
    'All',
    ...Array.from(new Set<string>(notes.map((n) => n.semester))),
  ];
  const subjects: string[] = [
    'All',
    ...Array.from(
      new Set<string>(
        notes
          .filter((n) => selectedSemester === 'All' || n.semester === selectedSemester)
          .map((n) => n.subject)
      )
    ),
  ];

  const filteredNotes = notes.filter((n) => {
    if (selectedSemester !== 'All' && n.semester !== selectedSemester) return false;
    if (selectedSubject !== 'All' && n.subject !== selectedSubject) return false;
    if (
      searchQuery.trim() &&
      !`${n.title} ${n.subject} ${n.topic} ${n.content}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const activeNote =
    notes.find((n) => n.id === activeNoteId) || filteredNotes[0] || null;

  const openNewNoteForm = () => {
    setEditingNoteId(null);
    setTitle('');
    setSemester(defaultSemester || 'Semester 1');
    setSubject('');
    setTopic('');
    setContent('');
    setAttachmentName('');
    setAttachmentType('');
    setAttachmentDataUrl('');
    setUploadNotice('');
    setIsEditing(true);
  };

  const openEditNoteForm = (note: Note) => {
    setEditingNoteId(note.id);
    setTitle(note.title);
    setSemester(note.semester);
    setSubject(note.subject);
    setTopic(note.topic);
    setContent(note.content);
    setAttachmentName(note.attachmentName);
    setAttachmentType(note.attachmentType);
    setAttachmentDataUrl(note.attachmentDataUrl);
    setUploadNotice('');
    setIsEditing(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadNotice('');

    if (file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result || '');
        setContent((prev) => (prev ? `${prev}\n\n${text}` : text));
        setAttachmentName(file.name);
        setAttachmentType(file.type || 'text/plain');
        setUploadNotice(`Imported text content from ${file.name}`);
      };
      reader.readAsText(file);
      return;
    }

    if (file.size > 240 * 1024) {
      setUploadNotice(
        'File exceeds 240KB direct attachment limit. Filename recorded; paste key text excerpts below for AI analysis.'
      );
      setAttachmentName(file.name);
      setAttachmentType(file.type || 'application/octet-stream');
      setAttachmentDataUrl('');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      setAttachmentName(file.name);
      setAttachmentType(file.type || 'application/pdf');
      setAttachmentDataUrl(dataUrl);
      if (!content.trim()) {
        setContent(`Attached study document: ${file.name}`);
      }
      setUploadNotice(`Attached ${file.name} (${Math.round(file.size / 1024)} KB)`);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !subject.trim() || !topic.trim() || !content.trim()) return;
    setSaving(true);
    try {
      if (editingNoteId) {
        await updateNoteEntry(editingNoteId, {
          title,
          semester,
          subject,
          topic,
          content,
          attachmentName,
          attachmentType,
          attachmentDataUrl,
        });
      } else {
        await createNoteEntry(uid, {
          title,
          semester,
          subject,
          topic,
          content,
          attachmentName,
          attachmentType,
          attachmentDataUrl,
        });
      }
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const runAiNotesAssistant = async (
    mode: 'explain' | 'important_points' | 'summarize' | 'create_questions' | 'custom'
  ) => {
    if (!activeNote) return;
    setAiLoading(true);
    setAiError('');
    try {
      const response = await fetch('/api/ai/notes-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          customPrompt: customAiPrompt,
          notes: [
            {
              title: activeNote.title,
              semester: activeNote.semester,
              subject: activeNote.subject,
              topic: activeNote.topic,
              content: activeNote.content,
            },
          ],
          attachmentDataUrl: activeNote.attachmentDataUrl,
          attachmentType: activeNote.attachmentType,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze notes.');
      }
      setAiResult(data.result || '');
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Error running AI Notes Assistant.');
    } finally {
      setAiLoading(false);
    }
  };

  const saveAiResultAsNote = async () => {
    if (!activeNote || !aiResult.trim()) return;
    await createNoteEntry(uid, {
      title: `AI Revision Guide: ${activeNote.title}`,
      semester: activeNote.semester,
      subject: activeNote.subject,
      topic: `${activeNote.topic} (AI Summary)`,
      content: aiResult,
      attachmentName: '',
      attachmentType: '',
      attachmentDataUrl: '',
    });
    setAiResult('');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-3xl font-normal tracking-tight text-slate-900">
            Academic Notes & AI Study Companion
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Organize lecture material by Semester, Subject, and Topic, upload study documents, and query your notes with AI.
          </p>
        </div>
        <button
          onClick={openNewNoteForm}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Academic Note</span>
        </button>
      </div>

      {/* Create / Edit Note Modal Form */}
      {isEditing && (
        <form
          onSubmit={handleSaveNote}
          className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-semibold text-slate-900">
              {editingNoteId ? 'Edit Academic Note' : 'Create Academic Note'}
            </h2>
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>Upload PDF / Image / Text</span>
              <input
                type="file"
                accept=".pdf,.txt,.md,image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {uploadNotice && (
            <p className="text-xs text-indigo-700 font-medium">{uploadNotice}</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Note Title *
              </label>
              <input
                type="text"
                required
                maxLength={160}
                placeholder="e.g., Neural Networks & Backpropagation"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Semester *
              </label>
              <input
                type="text"
                required
                maxLength={60}
                placeholder="e.g., Semester 1"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
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
                placeholder="e.g., Artificial Intelligence"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Chapter / Topic *
            </label>
            <input
              type="text"
              required
              maxLength={140}
              placeholder="e.g., Unit 3: Multi-Layer Perceptrons"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Note Content & Study Material *
            </label>
            <textarea
              rows={8}
              required
              maxLength={50000}
              placeholder="Write your lecture notes, formulas, code snippets, or key definitions here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
            />
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? 'Saving Note...' : 'Save Note'}
            </button>
          </div>
        </form>
      )}

      {/* Semester & Subject Hierarchy Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {semesters.map((sem) => (
              <button
                key={sem}
                onClick={() => {
                  setSelectedSemester(sem);
                  setSelectedSubject('All');
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  selectedSemester === sem
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {sem}
              </button>
            ))}
          </div>

          {subjects.length > 1 && (
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              {subjects.map((sub) => (
                <button
                  key={sub}
                  onClick={() => setSelectedSubject(sub)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    selectedSubject === sub
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            placeholder="Search notes by topic or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
          />
        </div>
      </div>

      {/* Main Split Workspace: Notes List (Left) + Active Note & AI Notes Assistant (Right) */}
      {filteredNotes.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <BookOpen className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900">
            No Academic Notes Found
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-5">
            Create notes organized by Semester, Subject, and Topic or upload study documents to unlock the AI Notes Assistant.
          </p>
          <button
            onClick={openNewNoteForm}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Note</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Notes Directory */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl divide-y divide-slate-200 self-start">
            {filteredNotes.map((note) => {
              const isSelected = activeNote?.id === note.id;
              return (
                <button
                  key={note.id}
                  onClick={() => {
                    setActiveNoteId(note.id);
                    setAiResult('');
                    setAiError('');
                  }}
                  className={`w-full text-left p-4 transition-colors ${
                    isSelected ? 'bg-slate-100/80' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <span className="font-medium text-slate-700">{note.semester}</span>
                    <span aria-hidden="true">·</span>
                    <span>{note.subject}</span>
                  </div>
                  <h4 className="text-sm font-semibold text-slate-900 mt-1 line-clamp-1">
                    {note.title}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                    Topic: {note.topic}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Right Column: Note Reader + AI Notes Assistant */}
          {activeNote && (
            <div className="lg:col-span-8 space-y-6">
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-semibold text-slate-800">
                        {activeNote.semester}
                      </span>
                      <span aria-hidden="true">→</span>
                      <span className="font-semibold text-slate-800">
                        {activeNote.subject}
                      </span>
                      <span aria-hidden="true">→</span>
                      <span>{activeNote.topic}</span>
                    </div>
                    <h2 className="text-xl font-semibold text-slate-900 mt-1">
                      {activeNote.title}
                    </h2>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => openEditNoteForm(activeNote)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => deleteNoteEntry(activeNote.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"
                      title="Delete note"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {activeNote.attachmentName && (
                  <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                    <div className="flex items-center gap-2 text-slate-700">
                      <FileText className="w-4 h-4 text-slate-500" />
                      <span>Attached Document: {activeNote.attachmentName}</span>
                    </div>
                    {activeNote.attachmentDataUrl && (
                      <a
                        href={activeNote.attachmentDataUrl}
                        download={activeNote.attachmentName}
                        className="inline-flex items-center gap-1 font-semibold text-slate-900 hover:underline"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download</span>
                      </a>
                    )}
                  </div>
                )}

                <div className="prose prose-slate max-w-none text-sm text-slate-800 whitespace-pre-wrap leading-relaxed font-sans">
                  {activeNote.content}
                </div>
              </div>

              {/* AI Notes Assistant */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-700" />
                      <span>AI Notes Assistant</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Grounded strictly in "{activeNote.title}" ({activeNote.subject}).
                    </p>
                  </div>
                </div>

                {/* Preset Actions */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => runAiNotesAssistant('explain')}
                    disabled={aiLoading}
                    className="px-3 py-1.5 text-xs font-medium text-slate-800 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 whitespace-nowrap"
                  >
                    Explain this topic from my notes
                  </button>
                  <button
                    onClick={() => runAiNotesAssistant('important_points')}
                    disabled={aiLoading}
                    className="px-3 py-1.5 text-xs font-medium text-slate-800 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 whitespace-nowrap"
                  >
                    What are the important points?
                  </button>
                  <button
                    onClick={() => runAiNotesAssistant('summarize')}
                    disabled={aiLoading}
                    className="px-3 py-1.5 text-xs font-medium text-slate-800 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 whitespace-nowrap"
                  >
                    Summarize this topic
                  </button>
                  <button
                    onClick={() => runAiNotesAssistant('create_questions')}
                    disabled={aiLoading}
                    className="px-3 py-1.5 text-xs font-medium text-slate-800 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 whitespace-nowrap"
                  >
                    Create practice questions
                  </button>
                </div>

                {/* Custom Question on Note */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ask a specific question about these notes..."
                    value={customAiPrompt}
                    onChange={(e) => setCustomAiPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && customAiPrompt.trim()) {
                        e.preventDefault();
                        runAiNotesAssistant('custom');
                      }
                    }}
                    className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
                  />
                  <button
                    onClick={() => runAiNotesAssistant('custom')}
                    disabled={aiLoading || !customAiPrompt.trim()}
                    className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap"
                  >
                    {aiLoading ? 'Analyzing...' : 'Ask Notes AI'}
                  </button>
                </div>

                {aiError && (
                  <p className="text-xs text-red-600">{aiError}</p>
                )}

                {aiResult && (
                  <div className="pt-4 border-t border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-900">
                        AI Notes Response
                      </span>
                      <button
                        onClick={saveAiResultAsNote}
                        className="text-xs font-semibold text-indigo-700 hover:underline"
                      >
                        + Save Response as New Note
                      </button>
                    </div>
                    <div className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-200">
                      {aiResult}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
