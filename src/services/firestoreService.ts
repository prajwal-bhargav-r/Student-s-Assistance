import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import {
  db,
  OperationType,
  handleFirestoreError,
  sanitizeString,
} from '../firebase';
import type {
  AcademicTask,
  DayOfWeek,
  Exam,
  GroupPostType,
  Note,
  NotificationItem,
  StudentGroup,
  StudyPlan,
  TaskCategory,
  TaskPriority,
  TimetableSlot,
  UserProfile,
} from '../types';
import { addDaysToToday, getCurrentDayName } from '../utils/academicUtils';

function generateCleanId(prefix: string): string {
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `${prefix}_${Date.now()}_${randomPart}`;
}

export async function saveUserProfile(
  uid: string,
  profile: Omit<UserProfile, 'ownerId' | 'createdAt' | 'updatedAt'>,
  isExisting: boolean
): Promise<void> {
  const path = `users/${uid}`;
  const payload = {
    ownerId: uid,
    displayName: sanitizeString(profile.displayName, 100, 'Student'),
    institution: sanitizeString(profile.institution, 160, 'University Campus'),
    department: sanitizeString(profile.department, 120, 'Computer Science & AIML'),
    semester: sanitizeString(profile.semester, 60, 'Semester 1'),
    targetStudyHoursPerDay: Math.min(24, Math.max(0, Number(profile.targetStudyHoursPerDay) || 3)),
    updatedAt: serverTimestamp(),
  };

  try {
    if (isExisting) {
      await updateDoc(doc(db, 'users', uid), payload);
    } else {
      await setDoc(doc(db, 'users', uid), {
        ...payload,
        createdAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, isExisting ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function createExamEntry(
  uid: string,
  data: Omit<Exam, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>
): Promise<void> {
  const id = generateCleanId('exam');
  const path = `exams/${id}`;
  try {
    await setDoc(doc(db, 'exams', id), {
      ownerId: uid,
      examName: sanitizeString(data.examName, 140, 'Midterm Examination'),
      subject: sanitizeString(data.subject, 100, 'General Subject'),
      examDate: sanitizeString(data.examDate, 20, addDaysToToday(7)),
      examTime: sanitizeString(data.examTime, 20, '09:30'),
      location: sanitizeString(data.location, 140, ''),
      syllabus: sanitizeString(data.syllabus, 2000, ''),
      notes: sanitizeString(data.notes, 2000, ''),
      remindersEnabled: Boolean(data.remindersEnabled),
      remind7Days: Boolean(data.remind7Days),
      remind3Days: Boolean(data.remind3Days),
      remind1Day: Boolean(data.remind1Day),
      remindExamDay: Boolean(data.remindExamDay),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateExamEntry(
  examId: string,
  data: Partial<Omit<Exam, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  const path = `exams/${examId}`;
  const cleanUpdates: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };
  if (data.examName !== undefined) cleanUpdates.examName = sanitizeString(data.examName, 140, 'Exam');
  if (data.subject !== undefined) cleanUpdates.subject = sanitizeString(data.subject, 100, 'Subject');
  if (data.examDate !== undefined) cleanUpdates.examDate = sanitizeString(data.examDate, 20, addDaysToToday(7));
  if (data.examTime !== undefined) cleanUpdates.examTime = sanitizeString(data.examTime, 20, '09:30');
  if (data.location !== undefined) cleanUpdates.location = sanitizeString(data.location, 140, '');
  if (data.syllabus !== undefined) cleanUpdates.syllabus = sanitizeString(data.syllabus, 2000, '');
  if (data.notes !== undefined) cleanUpdates.notes = sanitizeString(data.notes, 2000, '');
  if (data.remindersEnabled !== undefined) cleanUpdates.remindersEnabled = Boolean(data.remindersEnabled);
  if (data.remind7Days !== undefined) cleanUpdates.remind7Days = Boolean(data.remind7Days);
  if (data.remind3Days !== undefined) cleanUpdates.remind3Days = Boolean(data.remind3Days);
  if (data.remind1Day !== undefined) cleanUpdates.remind1Day = Boolean(data.remind1Day);
  if (data.remindExamDay !== undefined) cleanUpdates.remindExamDay = Boolean(data.remindExamDay);

  try {
    await updateDoc(doc(db, 'exams', examId), cleanUpdates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteExamEntry(examId: string): Promise<void> {
  const path = `exams/${examId}`;
  try {
    await deleteDoc(doc(db, 'exams', examId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function createTaskEntry(
  uid: string,
  data: Omit<AcademicTask, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>
): Promise<void> {
  const id = generateCleanId('task');
  const path = `tasks/${id}`;
  const validCategories: TaskCategory[] = [
    'Assignment',
    'Homework',
    'Lab Record',
    'Project',
    'Submission',
    'Study Task',
  ];
  const validPriorities: TaskPriority[] = ['High', 'Medium', 'Low'];

  try {
    await setDoc(doc(db, 'tasks', id), {
      ownerId: uid,
      title: sanitizeString(data.title, 160, 'Academic Task'),
      subject: sanitizeString(data.subject, 100, 'General'),
      category: validCategories.includes(data.category) ? data.category : 'Assignment',
      description: sanitizeString(data.description, 2000, ''),
      dueDate: sanitizeString(data.dueDate, 20, addDaysToToday(2)),
      dueTime: sanitizeString(data.dueTime, 20, '23:59'),
      priority: validPriorities.includes(data.priority) ? data.priority : 'Medium',
      completed: Boolean(data.completed),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function toggleTaskCompletion(taskId: string, completed: boolean): Promise<void> {
  const path = `tasks/${taskId}`;
  try {
    await updateDoc(doc(db, 'tasks', taskId), {
      completed: Boolean(completed),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteTaskEntry(taskId: string): Promise<void> {
  const path = `tasks/${taskId}`;
  try {
    await deleteDoc(doc(db, 'tasks', taskId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function createNoteEntry(
  uid: string,
  data: Omit<Note, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>
): Promise<void> {
  const id = generateCleanId('note');
  const path = `notes/${id}`;
  try {
    await setDoc(doc(db, 'notes', id), {
      ownerId: uid,
      title: sanitizeString(data.title, 160, 'Untitled Note'),
      semester: sanitizeString(data.semester, 60, 'Semester 1'),
      subject: sanitizeString(data.subject, 100, 'General'),
      topic: sanitizeString(data.topic, 140, 'Core Concept'),
      content: sanitizeString(data.content, 50000, 'Note content'),
      attachmentName: sanitizeString(data.attachmentName, 200, ''),
      attachmentType: sanitizeString(data.attachmentType, 80, ''),
      attachmentDataUrl: sanitizeString(data.attachmentDataUrl, 350000, ''),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateNoteEntry(
  noteId: string,
  data: Omit<Note, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>
): Promise<void> {
  const path = `notes/${noteId}`;
  try {
    await updateDoc(doc(db, 'notes', noteId), {
      title: sanitizeString(data.title, 160, 'Untitled Note'),
      semester: sanitizeString(data.semester, 60, 'Semester 1'),
      subject: sanitizeString(data.subject, 100, 'General'),
      topic: sanitizeString(data.topic, 140, 'Core Concept'),
      content: sanitizeString(data.content, 50000, 'Note content'),
      attachmentName: sanitizeString(data.attachmentName, 200, ''),
      attachmentType: sanitizeString(data.attachmentType, 80, ''),
      attachmentDataUrl: sanitizeString(data.attachmentDataUrl, 350000, ''),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteNoteEntry(noteId: string): Promise<void> {
  const path = `notes/${noteId}`;
  try {
    await deleteDoc(doc(db, 'notes', noteId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function createTimetableSlotEntry(
  uid: string,
  data: Omit<TimetableSlot, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>
): Promise<void> {
  const id = generateCleanId('slot');
  const path = `timetable/${id}`;
  const validDays: DayOfWeek[] = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];

  try {
    await setDoc(doc(db, 'timetable', id), {
      ownerId: uid,
      day: validDays.includes(data.day) ? data.day : 'Monday',
      periodNumber: Math.min(20, Math.max(1, Math.round(Number(data.periodNumber) || 1))),
      startTime: sanitizeString(data.startTime, 20, '08:30'),
      endTime: sanitizeString(data.endTime, 20, '09:30'),
      subject: sanitizeString(data.subject, 100, 'Lecture'),
      teacher: sanitizeString(data.teacher, 100, ''),
      classroom: sanitizeString(data.classroom, 80, ''),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteTimetableSlotEntry(slotId: string): Promise<void> {
  const path = `timetable/${slotId}`;
  try {
    await deleteDoc(doc(db, 'timetable', slotId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function createStudyPlanEntry(
  uid: string,
  data: Omit<StudyPlan, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>
): Promise<void> {
  const id = generateCleanId('plan');
  const path = `studyPlans/${id}`;
  try {
    await setDoc(doc(db, 'studyPlans', id), {
      ownerId: uid,
      title: sanitizeString(data.title, 160, 'Study Plan'),
      subject: sanitizeString(data.subject, 100, 'General'),
      targetDate: sanitizeString(data.targetDate, 20, addDaysToToday(7)),
      planContent: sanitizeString(data.planContent, 25000, 'Daily study plan'),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteStudyPlanEntry(planId: string): Promise<void> {
  const path = `studyPlans/${planId}`;
  try {
    await deleteDoc(doc(db, 'studyPlans', planId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function createNotificationEntry(
  uid: string,
  data: Omit<NotificationItem, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>
): Promise<void> {
  const id = generateCleanId('notif');
  const path = `notifications/${id}`;
  const validCategories: NotificationItem['category'][] = [
    'Exam',
    'Assignment',
    'Homework',
    'Group',
    'Study',
    'System',
  ];
  try {
    await setDoc(doc(db, 'notifications', id), {
      ownerId: uid,
      title: sanitizeString(data.title, 160, 'Academic Notification'),
      message: sanitizeString(data.message, 1000, 'Reminder'),
      category: validCategories.includes(data.category) ? data.category : 'System',
      read: Boolean(data.read),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function markNotificationRead(notificationId: string, read: boolean): Promise<void> {
  const path = `notifications/${notificationId}`;
  try {
    await updateDoc(doc(db, 'notifications', notificationId), {
      read: Boolean(read),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteNotificationEntry(notificationId: string): Promise<void> {
  const path = `notifications/${notificationId}`;
  try {
    await deleteDoc(doc(db, 'notifications', notificationId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function createStudentGroupEntry(
  uid: string,
  creatorName: string,
  data: {
    name: string;
    subject: string;
    semester: string;
    description: string;
    pinnedAnnouncement: string;
  }
): Promise<string> {
  const id = generateCleanId('group');
  const path = `groups/${id}`;
  try {
    await setDoc(doc(db, 'groups', id), {
      ownerId: uid,
      creatorName: sanitizeString(creatorName, 100, 'Student'),
      name: sanitizeString(data.name, 140, 'Academic Study Group'),
      subject: sanitizeString(data.subject, 100, 'General'),
      semester: sanitizeString(data.semester, 60, 'Semester 1'),
      description: sanitizeString(data.description, 1000, 'Collaborative academic space.'),
      pinnedAnnouncement: sanitizeString(data.pinnedAnnouncement, 1000, ''),
      visibility: 'campus',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateGroupPinnedAnnouncement(
  group: StudentGroup,
  pinnedAnnouncement: string
): Promise<void> {
  const path = `groups/${group.id}`;
  try {
    await updateDoc(doc(db, 'groups', group.id), {
      name: sanitizeString(group.name, 140, 'Academic Study Group'),
      subject: sanitizeString(group.subject, 100, 'General'),
      semester: sanitizeString(group.semester, 60, 'Semester 1'),
      description: sanitizeString(group.description, 1000, 'Collaborative academic space.'),
      pinnedAnnouncement: sanitizeString(pinnedAnnouncement, 1000, ''),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteStudentGroupEntry(groupId: string): Promise<void> {
  const path = `groups/${groupId}`;
  try {
    await deleteDoc(doc(db, 'groups', groupId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function createGroupPostEntry(
  groupId: string,
  uid: string,
  authorName: string,
  data: {
    postType: GroupPostType;
    title: string;
    content: string;
    attachmentName: string;
    attachmentDataUrl: string;
    isPinned: boolean;
  }
): Promise<void> {
  const postId = generateCleanId('post');
  const path = `groups/${groupId}/posts/${postId}`;
  const validTypes: GroupPostType[] = [
    'Note',
    'Study Material',
    'Important Question',
    'Announcement',
    'Discussion',
  ];

  try {
    await setDoc(doc(collection(db, 'groups', groupId, 'posts'), postId), {
      groupId,
      ownerId: uid,
      authorName: sanitizeString(authorName, 100, 'Student'),
      postType: validTypes.includes(data.postType) ? data.postType : 'Discussion',
      title: sanitizeString(data.title, 160, 'Shared Academic Resource'),
      content: sanitizeString(data.content, 15000, ''),
      attachmentName: sanitizeString(data.attachmentName, 200, ''),
      attachmentDataUrl: sanitizeString(data.attachmentDataUrl, 350000, ''),
      isPinned: Boolean(data.isPinned),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function toggleGroupPostPin(
  groupId: string,
  postId: string,
  isPinned: boolean
): Promise<void> {
  const path = `groups/${groupId}/posts/${postId}`;
  try {
    await updateDoc(doc(db, 'groups', groupId, 'posts', postId), {
      isPinned: Boolean(isPinned),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteGroupPostEntry(groupId: string, postId: string): Promise<void> {
  const path = `groups/${groupId}/posts/${postId}`;
  try {
    await deleteDoc(doc(db, 'groups', groupId, 'posts', postId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Seed realistic academic data for immediate exploration
export async function seedSampleAcademicWorkspace(uid: string, displayName: string): Promise<void> {
  const todayDay = getCurrentDayName();

  // 1. Today's Timetable + Weekly classes
  const sampleSlots: Array<Omit<TimetableSlot, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>> = [
    {
      day: todayDay,
      periodNumber: 1,
      startTime: '08:30',
      endTime: '09:30',
      subject: 'Mathematics',
      teacher: 'Dr. A. Ramanujan',
      classroom: 'Hall B-102',
    },
    {
      day: todayDay,
      periodNumber: 2,
      startTime: '09:30',
      endTime: '10:30',
      subject: 'Programming',
      teacher: 'Prof. S. Lovelace',
      classroom: 'CS Lab 204',
    },
    {
      day: todayDay,
      periodNumber: 3,
      startTime: '10:30',
      endTime: '11:00',
      subject: 'Break',
      teacher: 'Self-Study & Refreshment',
      classroom: 'Campus Courtyard',
    },
    {
      day: todayDay,
      periodNumber: 4,
      startTime: '11:00',
      endTime: '12:00',
      subject: 'Artificial Intelligence',
      teacher: 'Dr. J. McCarthy',
      classroom: 'AI Studio 301',
    },
    {
      day: todayDay,
      periodNumber: 5,
      startTime: '12:00',
      endTime: '13:00',
      subject: 'Electronics',
      teacher: 'Prof. M. Faraday',
      classroom: 'ECE Block 105',
    },
  ];

  for (const slot of sampleSlots) {
    await createTimetableSlotEntry(uid, slot);
  }

  // 2. Upcoming Exams (7 days, 3 days, 14 days)
  await createExamEntry(uid, {
    examName: 'Engineering Mathematics I Midterm',
    subject: 'Mathematics',
    examDate: addDaysToToday(7),
    examTime: '09:30',
    location: 'Main Examination Hall A',
    syllabus: 'Linear Algebra, Eigenvalues & Eigenvectors, Multivariable Calculus, Partial Derivatives, Jacobian Matrix',
    notes: 'Bring non-programmable scientific calculator and university ID card.',
    remindersEnabled: true,
    remind7Days: true,
    remind3Days: true,
    remind1Day: true,
    remindExamDay: true,
  });

  await createExamEntry(uid, {
    examName: 'Physics Electromagnetism & Optics Quiz',
    subject: 'Physics',
    examDate: addDaysToToday(3),
    examTime: '14:00',
    location: 'Science Block Auditorium',
    syllabus: 'Maxwell Equations, Wave Optics, Interference, Diffraction Grating, Laser Fundamentals',
    notes: 'Focus on numerical derivations from Chapter 2 and Chapter 3.',
    remindersEnabled: true,
    remind7Days: true,
    remind3Days: true,
    remind1Day: true,
    remindExamDay: true,
  });

  await createExamEntry(uid, {
    examName: 'Artificial Intelligence Foundations Assessment',
    subject: 'Artificial Intelligence',
    examDate: addDaysToToday(14),
    examTime: '10:00',
    location: 'AI Lab 301',
    syllabus: 'Uninformed & Informed Search (BFS, DFS, A*), Heuristic Admissibility, Minimax & Alpha-Beta Pruning, Neural Network Perceptrons',
    notes: 'Includes both theoretical proofs and Python implementation trace questions.',
    remindersEnabled: true,
    remind7Days: true,
    remind3Days: true,
    remind1Day: true,
    remindExamDay: true,
  });

  // 3. Academic Tasks (Due Tomorrow, Upcoming, Completed, Overdue)
  await createTaskEntry(uid, {
    title: 'DBMS Normalization & SQL Joins Assignment',
    subject: 'Programming',
    category: 'Assignment',
    description: 'Normalize the university registrar schema up to BCNF and write 6 analytical SQL queries.',
    dueDate: addDaysToToday(1),
    dueTime: '17:00',
    priority: 'High',
    completed: false,
  });

  await createTaskEntry(uid, {
    title: 'Physics Laser Diffraction Lab Record',
    subject: 'Physics',
    category: 'Lab Record',
    description: 'Plot wavelength estimation graphs and error analysis tables in the observation book.',
    dueDate: addDaysToToday(-1),
    dueTime: '16:00',
    priority: 'High',
    completed: false,
  });

  await createTaskEntry(uid, {
    title: 'A* Heuristic Search Implementation in Python',
    subject: 'Artificial Intelligence',
    category: 'Project',
    description: 'Implement 8-puzzle solver comparing Manhattan vs Misplaced Tiles heuristics.',
    dueDate: addDaysToToday(5),
    dueTime: '23:59',
    priority: 'Medium',
    completed: false,
  });

  await createTaskEntry(uid, {
    title: 'Eigenvalue & Diagonalization Problem Set 3',
    subject: 'Mathematics',
    category: 'Homework',
    description: 'Solve exercises 4.1 to 4.12 on characteristic polynomials and Cayley-Hamilton theorem.',
    dueDate: addDaysToToday(-2),
    dueTime: '18:00',
    priority: 'Medium',
    completed: true,
  });

  // 4. Semester Notes
  await createNoteEntry(uid, {
    title: 'A* Search Algorithm & Heuristic Admissibility',
    semester: 'Semester 1',
    subject: 'Artificial Intelligence',
    topic: 'Informed Search Strategies',
    content: `# A* Search & Heuristic Design

## 1. Evaluation Function
A* evaluates nodes by combining the exact path cost from the start node and the estimated cost to the goal:
f(n) = g(n) + h(n)
- g(n): Actual cost to reach node n from the initial state.
- h(n): Estimated cost of the cheapest path from n to the goal state.

## 2. Admissibility Condition
A heuristic h(n) is **admissible** if for every node n, h(n) <= h*(n), where h*(n) is the true minimal cost to reach the goal.
- An admissible heuristic never overestimates the cost to reach the goal.
- Example (8-Puzzle):
  - h1 (Misplaced tiles): Admissible because every tile out of place must move at least once.
  - h2 (Manhattan distance): Sum of horizontal and vertical distances of tiles from their goal positions. Dominates h1 (h2 >= h1) while remaining admissible.

## 3. Consistency (Monotonicity)
A heuristic is consistent if for every node n and every successor n' generated by action a:
h(n) <= c(n, a, n') + h(n')
This is the triangle inequality. Every consistent heuristic is also admissible.`,
    attachmentName: '',
    attachmentType: '',
    attachmentDataUrl: '',
  });

  await createNoteEntry(uid, {
    title: 'Eigenvalues, Eigenvectors & Cayley-Hamilton Theorem',
    semester: 'Semester 1',
    subject: 'Mathematics',
    topic: 'Linear Algebra',
    content: `# Eigenvalues and Eigenvectors

## 1. Fundamental Equation
For a square matrix A of order n x n, a non-zero vector v is an eigenvector if:
A v = λ v
where λ is a scalar known as the eigenvalue.

## 2. Characteristic Equation
To find eigenvalues, solve:
det(A - λI) = 0
- Trace(A) = Sum of all eigenvalues (λ1 + λ2 + ... + λn)
- Determinant(A) = Product of all eigenvalues (λ1 * λ2 * ... * λn)

## 3. Cayley-Hamilton Theorem
Every square matrix satisfies its own characteristic equation.
Application: Used to compute A^(-1) and higher powers of A (such as A^3, A^4) in terms of I, A, A^2.`,
    attachmentName: '',
    attachmentType: '',
    attachmentDataUrl: '',
  });

  // 5. Student Collaboration Groups
  const groupId = await createStudentGroupEntry(uid, displayName || 'Student', {
    name: 'AIML 1st Year Section A',
    subject: 'Artificial Intelligence',
    semester: 'Semester 1',
    description: 'Official collaborative peer group for AIML Section A — share lecture notes, important exam questions, and lab resources.',
    pinnedAnnouncement: 'Midterm syllabus for AI and Engineering Mathematics is finalized. Check pinned important questions below!',
  });

  if (groupId) {
    await createGroupPostEntry(groupId, uid, displayName || 'Student', {
      postType: 'Important Question',
      title: 'Top 5 Expected Questions for AI Unit 1 & 2',
      content: `1. Prove that A* search is optimal when the heuristic h(n) is admissible and consistent.\n2. Compare Breadth-First Search, Uniform Cost Search, and Iterative Deepening DFS in terms of time and space complexity.\n3. Trace Minimax with Alpha-Beta pruning on a 3-ply game tree.\n4. Explain the Perceptron learning rule and why XOR is not linearly separable.\n5. Differentiate between Supervised, Unsupervised, and Reinforcement Learning with real-world examples.`,
      attachmentName: '',
      attachmentDataUrl: '',
      isPinned: true,
    });
  }

  // 6. Welcome Notification
  await createNotificationEntry(uid, {
    title: 'Academic Workspace Initialized',
    message: 'Your timetable, exam countdowns, smart reminders, and Semester 1 notes are ready.',
    category: 'System',
    read: false,
  });
}
