import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const MODEL_NAME = 'gemini-3.8-flash';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '15mb' }));

  // 1. AI Academic Doubt Assistant (Section 10)
  app.post('/api/ai/assistant', async (req: Request, res: Response) => {
    try {
      const { question, subject, contextNotes, history } = req.body as {
        question?: string;
        subject?: string;
        contextNotes?: string;
        history?: Array<{ role: string; text: string }>;
      };

      if (!question || !question.trim()) {
        res.status(400).json({ error: 'Please provide an academic question.' });
        return;
      }

      const conversationContext = Array.isArray(history) && history.length > 0
        ? '\nRecent Conversation:\n' +
          history
            .slice(-6)
            .map((h) => `${h.role === 'user' ? 'Student' : 'Assistant'}: ${h.text}`)
            .join('\n')
        : '';

      const notesSnippet = contextNotes
        ? `\nRelevant Student Notes Context:\n${contextNotes.slice(0, 12000)}\n`
        : '';

      const prompt = `Subject Area: ${subject || 'General Academics'}${notesSnippet}${conversationContext}

Student Question:
${question}

Provide a clear, structured, student-friendly explanation. Include:
1. Direct Concept Summary (1-2 clear sentences)
2. Step-by-Step Explanation or Code/Formula Walkthrough (with concrete examples)
3. Key Exam Takeaways (bullet points to remember)
4. Quick Self-Check Question (1 short question for the student to test understanding)`;

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
          systemInstruction:
            'You are the AI Student Assistant inside Student Academic Assistant. You help college and university students understand concepts in Programming, Mathematics, Physics, Chemistry, Electronics, Artificial Intelligence, Machine Learning, Computer Science, and general academics. Write clearly with structured markdown headings, clean code blocks where relevant, and accurate mathematical/scientific reasoning.',
        },
      });

      res.json({ answer: response.text || 'Unable to generate an answer at this moment.' });
    } catch (error) {
      console.error('AI Assistant error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to process AI Assistant request.',
      });
    }
  });

  // 2. AI Notes Assistant (Section 6)
  app.post('/api/ai/notes-assistant', async (req: Request, res: Response) => {
    try {
      const { mode, customPrompt, notes, attachmentDataUrl, attachmentType } = req.body as {
        mode?: 'explain' | 'important_points' | 'summarize' | 'create_questions' | 'custom';
        customPrompt?: string;
        notes?: Array<{
          title: string;
          semester: string;
          subject: string;
          topic: string;
          content: string;
        }>;
        attachmentDataUrl?: string;
        attachmentType?: string;
      };

      if (!notes || notes.length === 0) {
        res.status(400).json({ error: 'Please select at least one saved note for the AI to analyze.' });
        return;
      }

      const formattedNotes = notes
        .map(
          (n, idx) =>
            `--- Note ${idx + 1}: ${n.title} (${n.semester} · ${n.subject} · Topic: ${n.topic}) ---\n${n.content}`
        )
        .join('\n\n');

      let taskInstruction = '';
      switch (mode) {
        case 'explain':
          taskInstruction =
            'Explain the core topics and concepts from these student notes clearly, breaking down complex definitions and formulas with intuitive examples.';
          break;
        case 'important_points':
          taskInstruction =
            'Extract the high-yield important points, definitions, formulas, and key exam takeaways from these notes.';
          break;
        case 'summarize':
          taskInstruction =
            'Create a structured, concise revision summary of these notes suitable for quick pre-exam review.';
          break;
        case 'create_questions':
          taskInstruction =
            'Create a practice quiz from these notes containing: 5 Conceptual Short-Answer Questions and 3 Exam-Style Problem/Application Questions, followed by an Answer Key with brief explanations.';
          break;
        default:
          taskInstruction = customPrompt || 'Analyze and explain the selected notes.';
          break;
      }

      const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

      if (
        attachmentDataUrl &&
        attachmentDataUrl.startsWith('data:') &&
        attachmentType &&
        (attachmentType.startsWith('image/') || attachmentType === 'application/pdf')
      ) {
        const base64Match = attachmentDataUrl.split(',')[1];
        if (base64Match) {
          parts.push({
            inlineData: {
              mimeType: attachmentType,
              data: base64Match,
            },
          });
        }
      }

      parts.push({
        text: `Student's Saved Academic Notes:\n\n${formattedNotes.slice(0, 35000)}\n\nTask Request:\n${taskInstruction}`,
      });

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: { parts },
        config: {
          systemInstruction:
            'You are the AI Notes Assistant. Always prioritize and ground your answers in the student\'s saved academic notes and uploaded study material. Highlight specific terms and concepts directly from their notes while filling in helpful clarifying context when needed.',
        },
      });

      res.json({ result: response.text || 'No analysis generated.' });
    } catch (error) {
      console.error('AI Notes Assistant error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to analyze notes with AI.',
      });
    }
  });

  // 3. AI Timetable Analysis & Multimodal Extraction (Sections 8 & 9)
  app.post('/api/ai/timetable-analysis', async (req: Request, res: Response) => {
    try {
      const { slots, currentDay } = req.body as {
        slots?: Array<{
          day: string;
          periodNumber: number;
          startTime: string;
          endTime: string;
          subject: string;
          teacher: string;
          classroom: string;
        }>;
        currentDay?: string;
      };

      if (!slots || slots.length === 0) {
        res.status(400).json({ error: 'No timetable entries found to analyze.' });
        return;
      }

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: `Current Day: ${currentDay || 'Monday'}
Student Timetable Slots:
${JSON.stringify(slots, null, 2)}

Analyze this student's timetable and return a JSON object with:
- todaySummary: A concise 1-sentence headline for today (e.g., "Your timetable contains 5 classes today.")
- highlights: Array of 4-6 specific observations (e.g., "You have Mathematics at 8:30 AM.", "You have a free period from 1:00 PM to 2:00 PM.", "You have 3 consecutive classes in the morning.")
- studyWindows: Array of 2-3 recommended self-study blocks based on free periods and lighter days
- busiestDay: Name of the busiest day of the week and class count`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              todaySummary: { type: Type.STRING },
              highlights: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              studyWindows: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              busiestDay: { type: Type.STRING },
            },
            required: ['todaySummary', 'highlights', 'studyWindows', 'busiestDay'],
          },
        },
      });

      const parsed = JSON.parse((response.text || '{}').trim());
      res.json(parsed);
    } catch (error) {
      console.error('AI Timetable Analysis error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to analyze timetable.',
      });
    }
  });

  // 4. AI Timetable Image/PDF Upload Extractor (Section 8)
  app.post('/api/ai/timetable-extract', async (req: Request, res: Response) => {
    try {
      const { fileDataUrl, mimeType, rawText } = req.body as {
        fileDataUrl?: string;
        mimeType?: string;
        rawText?: string;
      };

      const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

      if (fileDataUrl && fileDataUrl.startsWith('data:') && mimeType) {
        const base64Data = fileDataUrl.split(',')[1];
        if (base64Data) {
          parts.push({
            inlineData: {
              mimeType,
              data: base64Data,
            },
          });
        }
      }

      parts.push({
        text: `Extract the academic class schedule / timetable slots from the provided timetable ${
          rawText ? `text:\n${rawText}\n` : 'image or document.'
        }
Valid days are strictly: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday.
Format startTime and endTime in 24-hour HH:MM format (e.g., "08:30", "09:30", "11:00", "14:00").`,
      });

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: { parts },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                day: { type: Type.STRING },
                periodNumber: { type: Type.INTEGER },
                startTime: { type: Type.STRING },
                endTime: { type: Type.STRING },
                subject: { type: Type.STRING },
                teacher: { type: Type.STRING },
                classroom: { type: Type.STRING },
              },
              required: ['day', 'periodNumber', 'startTime', 'endTime', 'subject', 'teacher', 'classroom'],
            },
          },
        },
      });

      const extracted = JSON.parse((response.text || '[]').trim());
      res.json({ slots: extracted });
    } catch (error) {
      console.error('AI Timetable Extract error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to extract timetable from uploaded file.',
      });
    }
  });

  // 5. AI Study Planner & Smart Prioritization (Sections 11, 12, 19)
  app.post('/api/ai/study-planner', async (req: Request, res: Response) => {
    try {
      const { exams, tasks, timetable, notesSummary, dailyStudyHours, focusExamId } = req.body as {
        exams?: Array<{
          id: string;
          examName: string;
          subject: string;
          examDate: string;
          examTime: string;
          syllabus: string;
          daysRemaining: number;
        }>;
        tasks?: Array<{
          title: string;
          subject: string;
          category: string;
          dueDate: string;
          priority: string;
          completed: boolean;
        }>;
        timetable?: Array<{
          day: string;
          startTime: string;
          endTime: string;
          subject: string;
        }>;
        notesSummary?: string;
        dailyStudyHours?: number;
        focusExamId?: string;
      };

      const targetExam =
        focusExamId && exams ? exams.find((e) => e.id === focusExamId) : exams?.[0];

      const prompt = `Create a personalized, actionable AI Study Plan and Smart Priority Queue for this student.

Target Daily Study Time: ${dailyStudyHours || 3} hours/day
Focus Exam: ${targetExam ? JSON.stringify(targetExam) : 'All Upcoming Exams'}
All Upcoming Exams: ${JSON.stringify(exams || [])}
Pending Academic Tasks: ${JSON.stringify((tasks || []).filter((t) => !t.completed))}
Weekly Timetable Summary: ${JSON.stringify((timetable || []).slice(0, 25))}
Saved Notes Topics: ${notesSummary || 'None recorded yet'}

Provide:
1. planTitle: Clear title for the study plan
2. targetSubject: Primary subject
3. targetDate: Exam or target completion date (YYYY-MM-DD)
4. smartAlert: An intelligent, context-aware reminder sentence (e.g., "Your Physics exam is in 7 days and you have 4 syllabus units to cover. Start with Mechanics today.")
5. prioritizedDeadlines: Ranked list of top 3-5 immediate priorities across exams and assignments with reason
6. dailySchedule: Array of day-by-day plan items (e.g., Day 1 — Chapter 1, Day 2 — Chapter 2, ..., Practice questions, Final revision) with specific topics and duration`;

      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              planTitle: { type: Type.STRING },
              targetSubject: { type: Type.STRING },
              targetDate: { type: Type.STRING },
              smartAlert: { type: Type.STRING },
              prioritizedDeadlines: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    rank: { type: Type.INTEGER },
                    itemTitle: { type: Type.STRING },
                    timeframe: { type: Type.STRING },
                    recommendation: { type: Type.STRING },
                  },
                  required: ['rank', 'itemTitle', 'timeframe', 'recommendation'],
                },
              },
              dailySchedule: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    dayLabel: { type: Type.STRING },
                    focusTopic: { type: Type.STRING },
                    activities: { type: Type.STRING },
                    durationHours: { type: Type.NUMBER },
                  },
                  required: ['dayLabel', 'focusTopic', 'activities', 'durationHours'],
                },
              },
            },
            required: [
              'planTitle',
              'targetSubject',
              'targetDate',
              'smartAlert',
              'prioritizedDeadlines',
              'dailySchedule',
            ],
          },
        },
      });

      const planData = JSON.parse((response.text || '{}').trim());
      res.json(planData);
    } catch (error) {
      console.error('AI Study Planner error:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to generate AI study plan.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Student Academic Assistant server running on http://localhost:${PORT}`);
  });
}

startServer();
