import React, { useState } from 'react';
import {
  Bell,
  Check,
  Trash2,
  UserCheck,
  AlertCircle,
  Clock,
  Calendar,
} from 'lucide-react';
import type {
  NotificationItem,
  SmartReminder,
  UserProfile,
} from '../types';
import {
  deleteNotificationEntry,
  markNotificationRead,
  saveUserProfile,
} from '../services/firestoreService';

interface NotificationsViewProps {
  smartReminders: SmartReminder[];
  storedNotifications: NotificationItem[];
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  smartReminders,
  storedNotifications,
}) => {
  const [filter, setFilter] = useState<'All' | 'Smart Alerts' | 'Saved Notifications'>('All');

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-3xl font-normal tracking-tight text-slate-900">
            Academic Notification Center
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Automated exam milestone alerts (7d, 3d, 1d, Exam Day), assignment deadline warnings, and system notifications.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          {(['All', 'Smart Alerts', 'Saved Notifications'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                filter === tab
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Automatic Smart Exam & Deadline Reminders */}
      {(filter === 'All' || filter === 'Smart Alerts') && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-slate-900">
            Live Smart Academic Reminders ({smartReminders.length})
          </h2>

          {smartReminders.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-500">
              No immediate exam or deadline alerts right now. You are all caught up!
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
              {smartReminders.map((rem) => (
                <div
                  key={rem.id}
                  className="p-5 flex items-start justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    {rem.urgency === 'critical' ? (
                      <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    ) : rem.urgency === 'warning' ? (
                      <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    ) : (
                      <Calendar className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span
                          className={`font-semibold ${
                            rem.urgency === 'critical'
                              ? 'text-red-600'
                              : rem.urgency === 'warning'
                              ? 'text-amber-600'
                              : 'text-slate-700'
                          }`}
                        >
                          {rem.urgency === 'critical'
                            ? 'Immediate Priority'
                            : rem.urgency === 'warning'
                            ? 'Upcoming Milestone'
                            : 'Scheduled'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{rem.subject}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">{rem.dateStr}</span>
                      </div>
                      <h3 className="text-sm font-semibold text-slate-900">
                        {rem.title}
                      </h3>
                      <p className="text-xs text-slate-600">{rem.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stored Notifications */}
      {(filter === 'All' || filter === 'Saved Notifications') && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-slate-900">
            Account Notifications ({storedNotifications.length})
          </h2>

          {storedNotifications.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-500">
              No account notifications stored.
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
              {storedNotifications.map((item) => (
                <div
                  key={item.id}
                  className="p-5 flex items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-semibold text-slate-800">
                        {item.category}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{item.read ? 'Read' : 'Unread'}</span>
                    </div>
                    <h3
                      className={`text-sm font-semibold ${
                        item.read ? 'text-slate-500' : 'text-slate-900'
                      }`}
                    >
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-600">{item.message}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => markNotificationRead(item.id, !item.read)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{item.read ? 'Mark Unread' : 'Mark Read'}</span>
                    </button>
                    <button
                      onClick={() => deleteNotificationEntry(item.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"
                      title="Delete notification"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface SettingsViewProps {
  uid: string;
  userEmail: string | null | undefined;
  profile: UserProfile | null;
  onSeedSampleData: () => Promise<void>;
  seeding: boolean;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  uid,
  userEmail,
  profile,
  onSeedSampleData,
  seeding,
}) => {
  const [displayName, setDisplayName] = useState(
    profile?.displayName || 'Student'
  );
  const [institution, setInstitution] = useState(
    profile?.institution || 'University of Engineering & Science'
  );
  const [department, setDepartment] = useState(
    profile?.department || 'Artificial Intelligence & Machine Learning'
  );
  const [semester, setSemester] = useState(profile?.semester || 'Semester 1');
  const [targetStudyHoursPerDay, setTargetStudyHoursPerDay] = useState(
    profile?.targetStudyHoursPerDay ?? 3
  );
  const [saving, setSaving] = useState(false);
  const [savedBanner, setSavedBanner] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedBanner(false);
    try {
      await saveUserProfile(
        uid,
        {
          displayName,
          institution,
          department,
          semester,
          targetStudyHoursPerDay,
        },
        Boolean(profile)
      );
      setSavedBanner(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-3xl font-normal tracking-tight text-slate-900">
          Student Profile & Academic Settings
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Manage your academic profile, current semester, and daily study preferences.
        </p>
      </div>

      <form
        onSubmit={handleSave}
        className="bg-white border border-slate-200 rounded-xl p-6 space-y-5"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <UserCheck className="w-5 h-5 text-slate-700" />
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Academic Identity
              </h2>
              <p className="text-xs text-slate-500">
                Signed in as {userEmail || 'Verified Student Account'}
              </p>
            </div>
          </div>
          {savedBanner && (
            <span className="text-xs font-semibold text-emerald-600">
              Profile saved successfully
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              maxLength={100}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Current Semester *
            </label>
            <input
              type="text"
              required
              maxLength={60}
              placeholder="e.g., Semester 1"
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              College / University *
            </label>
            <input
              type="text"
              required
              maxLength={160}
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Department / Major *
            </label>
            <input
              type="text"
              required
              maxLength={120}
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Target Self-Study Hours Per Day
            </label>
            <input
              type="number"
              min={1}
              max={16}
              value={targetStudyHoursPerDay}
              onChange={(e) => setTargetStudyHoursPerDay(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? 'Saving Profile...' : 'Save Academic Profile'}
          </button>
        </div>
      </form>

      {/* Sample Academic Workspace Seeder */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Populate Sample Semester Data
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Adds sample classes for today's timetable, upcoming exams (3d, 7d, 14d), assignments, Semester 1 notes, and a study group to your account.
          </p>
        </div>
        <button
          onClick={onSeedSampleData}
          disabled={seeding}
          className="px-4 py-2 text-xs font-semibold text-slate-900 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 whitespace-nowrap shrink-0"
        >
          {seeding ? 'Populating Data...' : 'Load Sample Academic Data'}
        </button>
      </div>
    </div>
  );
};
