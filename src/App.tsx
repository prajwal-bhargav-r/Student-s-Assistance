import React, { useEffect, useMemo, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import {
  LayoutDashboard,
  Calendar,
  FileText,
  Clock,
  CheckSquare,
  Users,
  Sparkles,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  TrendingUp,
  GraduationCap,
} from 'lucide-react';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from './firebase';
import type {
  AcademicTask,
  Exam,
  NavSection,
  Note,
  NotificationItem,
  StudentGroup,
  StudyPlan,
  TimetableSlot,
  UserProfile,
} from './types';
import { computeSmartReminders } from './utils/academicUtils';
import {
  saveUserProfile,
  seedSampleAcademicWorkspace,
} from './services/firestoreService';
import { DashboardView } from './components/DashboardView';
import { ExamsView } from './components/ExamsView';
import { TasksView } from './components/TasksView';
import { NotesView } from './components/NotesView';
import { TimetableView } from './components/TimetableView';
import { GroupsView } from './components/GroupsView';
import { AiAssistantView } from './components/AiAssistantView';
import {
  NotificationsView,
  SettingsView,
} from './components/NotificationsAndSettingsView';
import heroWorkspaceImg from './assets/images/academic_workspace_hero_1791463361462.jpg';
import defaultStudentAvatar from './assets/images/student_avatar_default_1791463378324.jpg';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState('');
  const [signingIn, setSigningIn] = useState(false);

  // Navigation state
  const [activeSection, setActiveSection] = useState<NavSection>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [studyPlannerFocusExamId, setStudyPlannerFocusExamId] = useState('');

  // Image fallback states
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [avatarImgFailed, setAvatarImgFailed] = useState(false);

  // Firestore synchronized state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [tasks, setTasks] = useState<AcademicTask[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [timetable, setTimetable] = useState<TimetableSlot[]>([]);
  const [studyPlans, setStudyPlans] = useState<StudyPlan[]>([]);
  const [storedNotifications, setStoredNotifications] = useState<NotificationItem[]>([]);
  const [groups, setGroups] = useState<StudentGroup[]>([]);
  const [seeding, setSeeding] = useState(false);

  // 1. Track Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // 2. Attach real-time Firestore listeners once authenticated
  useEffect(() => {
    if (!authReady || !currentUser) {
      setProfile(null);
      setExams([]);
      setTasks([]);
      setNotes([]);
      setTimetable([]);
      setStudyPlans([]);
      setStoredNotifications([]);
      setGroups([]);
      return;
    }

    const uid = currentUser.uid;

    // User Profile listener
    const unsubProfile = onSnapshot(
      doc(db, 'users', uid),
      (snap) => {
        if (snap.exists()) {
          setProfile(snap.data() as UserProfile);
        } else {
          // Initialize default profile for new student
          const defaultName = currentUser.displayName || 'Student';
          saveUserProfile(
            uid,
            {
              displayName: defaultName,
              institution: 'University of Technology & Science',
              department: 'Computer Science & AIML',
              semester: 'Semester 1',
              targetStudyHoursPerDay: 3,
            },
            false
          ).catch((err) => console.error('Initial profile creation error:', err));
        }
      },
      (error) => handleFirestoreError(error, OperationType.GET, `users/${uid}`)
    );

    // Exams listener
    const unsubExams = onSnapshot(
      query(collection(db, 'exams'), where('ownerId', '==', uid)),
      (snap) => {
        setExams(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<Exam, 'id'>),
          }))
        );
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'exams')
    );

    // Tasks listener
    const unsubTasks = onSnapshot(
      query(collection(db, 'tasks'), where('ownerId', '==', uid)),
      (snap) => {
        setTasks(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<AcademicTask, 'id'>),
          }))
        );
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'tasks')
    );

    // Notes listener
    const unsubNotes = onSnapshot(
      query(collection(db, 'notes'), where('ownerId', '==', uid)),
      (snap) => {
        setNotes(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<Note, 'id'>),
          }))
        );
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'notes')
    );

    // Timetable listener
    const unsubTimetable = onSnapshot(
      query(collection(db, 'timetable'), where('ownerId', '==', uid)),
      (snap) => {
        setTimetable(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<TimetableSlot, 'id'>),
          }))
        );
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'timetable')
    );

    // Study Plans listener
    const unsubPlans = onSnapshot(
      query(collection(db, 'studyPlans'), where('ownerId', '==', uid)),
      (snap) => {
        setStudyPlans(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<StudyPlan, 'id'>),
          }))
        );
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'studyPlans')
    );

    // Notifications listener
    const unsubNotifications = onSnapshot(
      query(collection(db, 'notifications'), where('ownerId', '==', uid)),
      (snap) => {
        setStoredNotifications(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<NotificationItem, 'id'>),
          }))
        );
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'notifications')
    );

    // Campus Groups listener
    const unsubGroups = onSnapshot(
      query(collection(db, 'groups'), where('visibility', '==', 'campus')),
      (snap) => {
        setGroups(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<StudentGroup, 'id'>),
          }))
        );
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'groups')
    );

    return () => {
      unsubProfile();
      unsubExams();
      unsubTasks();
      unsubNotes();
      unsubTimetable();
      unsubPlans();
      unsubNotifications();
      unsubGroups();
    };
  }, [authReady, currentUser]);

  const smartReminders = useMemo(
    () => computeSmartReminders(exams, tasks, notes),
    [exams, tasks, notes]
  );

  const unreadNotificationCount =
    smartReminders.filter((r) => r.urgency === 'critical' || r.urgency === 'warning')
      .length + storedNotifications.filter((n) => !n.read).length;

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    setAuthError('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : 'Unable to sign in with Google.'
      );
    } finally {
      setSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setActiveSection('dashboard');
  };

  const handleSeedSampleData = async () => {
    if (!currentUser || seeding) return;
    setSeeding(true);
    try {
      await seedSampleAcademicWorkspace(
        currentUser.uid,
        profile?.displayName || currentUser.displayName || 'Student'
      );
    } finally {
      setSeeding(false);
    }
  };

  const navigateToSection = (section: NavSection) => {
    setActiveSection(section);
    setMobileMenuOpen(false);
  };

  // Loading state
  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <div className="text-xl font-display text-slate-900">
            Student Academic Assistant
          </div>
          <p className="text-xs text-slate-500">
            Initializing your academic workspace...
          </p>
        </div>
      </div>
    );
  }

  // Unauthenticated Welcome & Sign-In Screen
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {/* Top Bar Contract: 3 Zones */}
        <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
          <a
            href="#top"
            className="text-xl font-display tracking-tight text-slate-900"
          >
            Student Academic Assistant
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-slate-900 transition-colors">
              Dashboard
            </a>
            <a href="#features" className="hover:text-slate-900 transition-colors">
              Exam Reminders
            </a>
            <a href="#features" className="hover:text-slate-900 transition-colors">
              Notes & AI
            </a>
            <a href="#features" className="hover:text-slate-900 transition-colors">
              Timetable
            </a>
            <a href="#features" className="hover:text-slate-900 transition-colors">
              Study Groups
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={handleGoogleSignIn}
              disabled={signingIn}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              {signingIn ? 'Signing In...' : 'Student Sign In'}
            </button>
          </div>
        </header>

        {/* Main Hero & Academic Companion Overview */}
        <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-12 space-y-16">
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 space-y-6">
              <div className="text-xs font-medium text-slate-500">
                All-in-One Academic Companion · Exams · Timetable · Notes · AI Tutor
              </div>

              <h1 className="text-4xl sm:text-5xl font-normal tracking-tight text-slate-900 leading-[1.12]">
                One place for everything related to your academic life.
              </h1>

              <p className="text-base text-slate-600 leading-relaxed max-w-xl">
                Stop switching between separate apps for exam countdowns, class timetables, lecture notes, homework deadlines, peer study groups, and AI doubt resolution. Enter your academic schedule once and stay ahead all semester.
              </p>

              {authError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                  {authError}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  onClick={handleGoogleSignIn}
                  disabled={signingIn}
                  className="px-6 py-3 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap"
                >
                  {signingIn
                    ? 'Connecting Google Account...'
                    : 'Sign In with Google to Open Dashboard'}
                </button>
              </div>

              <div className="pt-4 border-t border-slate-200 grid grid-cols-3 gap-4 text-xs text-slate-600">
                <div>
                  <div className="font-mono font-semibold text-slate-900 text-base">
                    7d · 3d · 1d
                  </div>
                  <div>Automatic Exam Milestones</div>
                </div>
                <div>
                  <div className="font-mono font-semibold text-slate-900 text-base">
                    Semester → Topic
                  </div>
                  <div>Structured Note Hierarchy</div>
                </div>
                <div>
                  <div className="font-mono font-semibold text-slate-900 text-base">
                    AI Study Planner
                  </div>
                  <div>Day-by-Day Revision Plans</div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-900 aspect-video relative">
                {!heroImgFailed ? (
                  <img
                    src={heroWorkspaceImg}
                    alt="University student studying at sunlit library desk"
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImgFailed(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-8 text-white">
                    <GraduationCap className="w-12 h-12 opacity-60" />
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Feature Architecture Grid */}
          <section id="features" className="space-y-6 pt-4 border-t border-slate-200">
            <div>
              <h2 className="text-2xl font-normal text-slate-900">
                Designed Around the Complete Student Workflow
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                From daily morning classes to final exam week revision.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-2">
                <div className="text-xs font-mono text-slate-400">01. Schedule & Exams</div>
                <h3 className="text-base font-semibold text-slate-900">
                  Today's Timetable & Exam Countdowns
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Automatically highlights today's classes, free study periods, and upcoming exam countdowns with 7-day, 3-day, 1-day, and exam-day alerts.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-2">
                <div className="text-xs font-mono text-slate-400">02. Notes & Collaboration</div>
                <h3 className="text-base font-semibold text-slate-900">
                  Semester Notes & Student Study Groups
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Organize notes by Semester, Subject, and Topic, upload study documents, ask the AI Notes Assistant to summarize or quiz you, and share with peers.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-2">
                <div className="text-xs font-mono text-slate-400">03. AI Academic Companion</div>
                <h3 className="text-base font-semibold text-slate-900">
                  AI Doubt Solver & Adaptive Study Planner
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Get clear explanations across Programming, Math, Physics, Electronics, and AI, plus personalized day-by-day study schedules before exams.
                </p>
              </div>
            </div>
          </section>
        </main>
      </div>
    );
  }

  const sidebarItems: Array<{
    id: NavSection;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
  }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'exams', label: 'Exams', icon: Calendar, count: exams.length },
    { id: 'notes', label: 'Notes', icon: FileText, count: notes.length },
    { id: 'timetable', label: 'Timetable', icon: Clock },
    {
      id: 'tasks',
      label: 'Tasks',
      icon: CheckSquare,
      count: tasks.filter((t) => !t.completed).length,
    },
    { id: 'groups', label: 'Groups', icon: Users, count: groups.length },
    { id: 'ai-assistant', label: 'AI Assistant', icon: Sparkles },
    { id: 'study-planner', label: 'Study Planner & Progress', icon: TrendingUp },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      count: unreadNotificationCount,
    },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Bar Contract: Strictly 1 row, 3 zones */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-3.5 bg-white border-b border-slate-200">
        {/* Zone 1: Single text element Brand wordmark */}
        <a
          href="#dashboard"
          onClick={(e) => {
            e.preventDefault();
            navigateToSection('dashboard');
          }}
          className="text-xl font-display tracking-tight text-slate-900 whitespace-nowrap"
        >
          Student Academic Assistant
        </a>

        {/* Zone 2: 5 clean text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-600">
          {(
            [
              { id: 'dashboard', label: 'Dashboard' },
              { id: 'exams', label: 'Exams' },
              { id: 'timetable', label: 'Timetable' },
              { id: 'notes', label: 'Notes' },
              { id: 'groups', label: 'Groups' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => navigateToSection(item.id)}
              className={`py-1 transition-colors whitespace-nowrap ${
                activeSection === item.id
                  ? 'text-slate-900 font-semibold border-b-2 border-slate-900'
                  : 'hover:text-slate-900'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Zone 3: 2 primary actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigateToSection('ai-assistant')}
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ask AI</span>
          </button>

          <button
            onClick={handleSignOut}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:text-slate-900 transition-colors whitespace-nowrap"
            title="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Log Out</span>
          </button>

          <button
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Main Workspace Container: Sidebar (256px) + Content Viewport */}
      <div className="flex-1 flex">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 shrink-0 justify-between p-4">
          <div className="space-y-1">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => navigateToSection(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {item.count !== undefined && item.count > 0 && (
                    <span
                      className={`font-mono tabular-nums text-[11px] ${
                        isActive ? 'text-slate-300' : 'text-slate-400'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Student Profile Card Footer */}
          <div className="pt-4 border-t border-slate-200">
            <button
              onClick={() => navigateToSection('settings')}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 text-left transition-colors"
            >
              <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-200 shrink-0">
                {!avatarImgFailed ? (
                  <img
                    src={currentUser.photoURL || defaultStudentAvatar}
                    alt={profile?.displayName || 'Student'}
                    referrerPolicy="no-referrer"
                    onError={() => setAvatarImgFailed(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-700">
                    {(profile?.displayName || 'S').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-slate-900 truncate">
                  {profile?.displayName || currentUser.displayName || 'Student'}
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  {profile?.semester || 'Semester 1'} · {profile?.department || 'Student'}
                </div>
              </div>
            </button>
          </div>
        </aside>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 md:hidden bg-black/40 flex">
            <div className="w-64 bg-white h-full p-4 flex flex-col justify-between overflow-y-auto">
              <div className="space-y-1">
                {sidebarItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => navigateToSection(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium ${
                        isActive
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </span>
                      {item.count !== undefined && item.count > 0 && (
                        <span className="font-mono text-xs">{item.count}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            <div
              className="flex-1"
              onClick={() => setMobileMenuOpen(false)}
            />
          </div>
        )}

        {/* Main Content Viewport */}
        <main className="flex-1 min-w-0 p-6 lg:p-10 max-w-6xl mx-auto w-full">
          {activeSection === 'dashboard' && (
            <DashboardView
              profile={profile}
              exams={exams}
              tasks={tasks}
              notes={notes}
              timetable={timetable}
              smartReminders={smartReminders}
              onNavigate={navigateToSection}
              onSeedSampleData={handleSeedSampleData}
              seeding={seeding}
            />
          )}

          {activeSection === 'exams' && (
            <ExamsView
              uid={currentUser.uid}
              exams={exams}
              onNavigateStudyPlanner={(examId) => {
                setStudyPlannerFocusExamId(examId);
                setActiveSection('study-planner');
              }}
            />
          )}

          {activeSection === 'tasks' && (
            <TasksView uid={currentUser.uid} tasks={tasks} />
          )}

          {activeSection === 'notes' && (
            <NotesView
              uid={currentUser.uid}
              defaultSemester={profile?.semester || 'Semester 1'}
              notes={notes}
            />
          )}

          {activeSection === 'timetable' && (
            <TimetableView uid={currentUser.uid} timetable={timetable} />
          )}

          {activeSection === 'groups' && (
            <GroupsView
              uid={currentUser.uid}
              displayName={
                profile?.displayName || currentUser.displayName || 'Student'
              }
              defaultSemester={profile?.semester || 'Semester 1'}
              groups={groups}
              personalNotes={notes}
            />
          )}

          {activeSection === 'ai-assistant' && (
            <AiAssistantView
              uid={currentUser.uid}
              initialTab="doubt-solver"
              exams={exams}
              tasks={tasks}
              timetable={timetable}
              notes={notes}
              studyPlans={studyPlans}
              dailyStudyHours={profile?.targetStudyHoursPerDay || 3}
            />
          )}

          {activeSection === 'study-planner' && (
            <AiAssistantView
              uid={currentUser.uid}
              initialTab="study-planner"
              initialFocusExamId={studyPlannerFocusExamId}
              exams={exams}
              tasks={tasks}
              timetable={timetable}
              notes={notes}
              studyPlans={studyPlans}
              dailyStudyHours={profile?.targetStudyHoursPerDay || 3}
            />
          )}

          {activeSection === 'notifications' && (
            <NotificationsView
              smartReminders={smartReminders}
              storedNotifications={storedNotifications}
            />
          )}

          {activeSection === 'settings' && (
            <SettingsView
              uid={currentUser.uid}
              userEmail={currentUser.email}
              profile={profile}
              onSeedSampleData={handleSeedSampleData}
              seeding={seeding}
            />
          )}
        </main>
      </div>
    </div>
  );
}
