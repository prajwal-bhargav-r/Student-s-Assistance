import React, { useEffect, useState } from 'react';
import {
  collection,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import {
  Users,
  Plus,
  Pin,
  Trash2,
  FileText,
  Upload,
  BookmarkPlus,
  Megaphone,
  BookOpen,
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import type {
  GroupPost,
  GroupPostType,
  Note,
  StudentGroup,
} from '../types';
import {
  createGroupPostEntry,
  createNoteEntry,
  createStudentGroupEntry,
  deleteGroupPostEntry,
  deleteStudentGroupEntry,
  toggleGroupPostPin,
  updateGroupPinnedAnnouncement,
} from '../services/firestoreService';
import studyGroupBannerImg from '../assets/images/study_group_banner_1791463395365.jpg';

interface GroupsViewProps {
  uid: string;
  displayName: string;
  defaultSemester: string;
  groups: StudentGroup[];
  personalNotes: Note[];
}

const POST_TYPES: GroupPostType[] = [
  'Note',
  'Study Material',
  'Important Question',
  'Announcement',
  'Discussion',
];

export const GroupsView: React.FC<GroupsViewProps> = ({
  uid,
  displayName,
  defaultSemester,
  groups,
  personalNotes,
}) => {
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(
    groups[0]?.id || null
  );
  const [posts, setPosts] = useState<GroupPost[]>([]);
  const [postFilter, setPostFilter] = useState<GroupPostType | 'All' | 'Pinned'>('All');
  const [bannerFailed, setBannerFailed] = useState(false);

  // Create group state
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupSubject, setGroupSubject] = useState('');
  const [groupSemester, setGroupSemester] = useState(defaultSemester || 'Semester 1');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupPinnedAnnouncement, setGroupPinnedAnnouncement] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);

  // Create post state
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [postType, setPostType] = useState<GroupPostType>('Note');
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [attachmentDataUrl, setAttachmentDataUrl] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [creatingPost, setCreatingPost] = useState(false);

  // Edit group announcement state (for group creator)
  const [editingAnnouncement, setEditingAnnouncement] = useState(false);
  const [announcementDraft, setAnnouncementDraft] = useState('');

  const activeGroup =
    groups.find((g) => g.id === selectedGroupId) || groups[0] || null;

  useEffect(() => {
    if (!activeGroup) {
      setPosts([]);
      return;
    }
    const path = `groups/${activeGroup.id}/posts`;
    const q = query(
      collection(db, 'groups', activeGroup.id, 'posts'),
      where('groupId', '==', activeGroup.id)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: GroupPost[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<GroupPost, 'id'>),
        }));
        list.sort((a, b) => {
          if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
          const tA = a.createdAt?.toMillis?.() || 0;
          const tB = b.createdAt?.toMillis?.() || 0;
          return tB - tA;
        });
        setPosts(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
    return () => unsub();
  }, [activeGroup?.id]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim() || !groupSubject.trim() || !groupDescription.trim()) return;
    setCreatingGroup(true);
    try {
      const newId = await createStudentGroupEntry(uid, displayName, {
        name: groupName,
        subject: groupSubject,
        semester: groupSemester,
        description: groupDescription,
        pinnedAnnouncement: groupPinnedAnnouncement,
      });
      setSelectedGroupId(newId);
      setGroupName('');
      setGroupSubject('');
      setGroupDescription('');
      setGroupPinnedAnnouncement('');
      setShowCreateGroup(false);
    } finally {
      setCreatingGroup(false);
    }
  };

  const handlePostFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 240 * 1024) {
      setAttachmentName(`${file.name} (Reference)`);
      setAttachmentDataUrl('');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAttachmentName(file.name);
      setAttachmentDataUrl(String(reader.result || ''));
    };
    reader.readAsDataURL(file);
  };

  const handleImportPersonalNoteToPost = (noteId: string) => {
    const found = personalNotes.find((n) => n.id === noteId);
    if (!found) return;
    setPostType('Note');
    setPostTitle(found.title);
    setPostContent(found.content);
    setAttachmentName(found.attachmentName || '');
    setAttachmentDataUrl(found.attachmentDataUrl || '');
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGroup || !postTitle.trim() || !postContent.trim()) return;
    setCreatingPost(true);
    try {
      await createGroupPostEntry(activeGroup.id, uid, displayName, {
        postType,
        title: postTitle,
        content: postContent,
        attachmentName,
        attachmentDataUrl,
        isPinned,
      });
      setPostTitle('');
      setPostContent('');
      setAttachmentName('');
      setAttachmentDataUrl('');
      setIsPinned(false);
      setShowCreatePost(false);
    } finally {
      setCreatingPost(false);
    }
  };

  const handleSavePostToMyNotes = async (post: GroupPost) => {
    if (!activeGroup) return;
    await createNoteEntry(uid, {
      title: `${post.title} (Shared in ${activeGroup.name})`,
      semester: activeGroup.semester,
      subject: activeGroup.subject,
      topic: post.postType,
      content: post.content,
      attachmentName: post.attachmentName,
      attachmentType: '',
      attachmentDataUrl: post.attachmentDataUrl,
    });
  };

  const visiblePosts = posts.filter((p) => {
    if (postFilter === 'All') return true;
    if (postFilter === 'Pinned') return p.isPinned;
    return p.postType === postFilter;
  });

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="relative h-40 w-full bg-slate-900">
          {!bannerFailed ? (
            <img
              src={studyGroupBannerImg}
              alt="University collaborative study lounge"
              referrerPolicy="no-referrer"
              onError={() => setBannerFailed(true)}
              className="w-full h-full object-cover opacity-65"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-end p-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between w-full gap-4">
              <div>
                <h1 className="text-3xl font-normal tracking-tight text-white">
                  Student Academic Groups
                </h1>
                <p className="text-xs text-slate-200 mt-1">
                  Share lecture notes, PDFs, important exam questions, and subject announcements with peers.
                </p>
              </div>
              <button
                onClick={() => setShowCreateGroup((prev) => !prev)}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-900 bg-white rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>{showCreateGroup ? 'Close Form' : 'Create Study Group'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Create Group Form */}
      {showCreateGroup && (
        <form
          onSubmit={handleCreateGroup}
          className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
        >
          <h2 className="text-base font-semibold text-slate-900">
            Create New Academic Study Group
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Group Name *
              </label>
              <input
                type="text"
                required
                maxLength={140}
                placeholder='e.g., "AIML 1st Year Section A" or "Python Study Group"'
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Subject / Department *
              </label>
              <input
                type="text"
                required
                maxLength={100}
                placeholder="e.g., Engineering Mathematics, Python"
                value={groupSubject}
                onChange={(e) => setGroupSubject(e.target.value)}
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
                value={groupSemester}
                onChange={(e) => setGroupSemester(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Group Purpose & Academic Scope *
              </label>
              <textarea
                rows={2}
                required
                maxLength={1000}
                placeholder="Describe what notes, problem sets, or exam preparations are shared here..."
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Pinned Group Announcement (Optional)
              </label>
              <textarea
                rows={2}
                maxLength={1000}
                placeholder="e.g., Lab assessment on Friday at 10:00 AM — check shared study questions!"
                value={groupPinnedAnnouncement}
                onChange={(e) => setGroupPinnedAnnouncement(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowCreateGroup(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creatingGroup}
              className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50"
            >
              {creatingGroup ? 'Creating Group...' : 'Create Academic Group'}
            </button>
          </div>
        </form>
      )}

      {/* Groups Workspace */}
      {groups.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <Users className="w-8 h-8 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900">
            No Student Study Groups Yet
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-5">
            Create a group such as "AIML 1st Year Section A" or "Engineering Mathematics Group" to share notes and important questions.
          </p>
          <button
            onClick={() => setShowCreateGroup(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Group</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Directory: Study Groups */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl divide-y divide-slate-200 self-start">
            <div className="p-4 bg-slate-50/70">
              <span className="text-xs font-semibold text-slate-700">
                Campus Study Groups ({groups.length})
              </span>
            </div>
            {groups.map((grp) => {
              const isSelected = activeGroup?.id === grp.id;
              return (
                <button
                  key={grp.id}
                  onClick={() => setSelectedGroupId(grp.id)}
                  className={`w-full text-left p-4 transition-colors ${
                    isSelected ? 'bg-slate-100/80' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <span className="font-medium text-slate-800">{grp.subject}</span>
                    <span aria-hidden="true">·</span>
                    <span>{grp.semester}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900 mt-1">
                    {grp.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                    {grp.description}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Right Workspace: Selected Group Feed & Shared Resources */}
          {activeGroup && (
            <div className="lg:col-span-8 space-y-6">
              {/* Group Info Header */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-semibold text-slate-800">
                        {activeGroup.subject}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{activeGroup.semester}</span>
                      <span aria-hidden="true">·</span>
                      <span>Created by {activeGroup.creatorName}</span>
                    </div>
                    <h2 className="text-xl font-semibold text-slate-900 mt-1">
                      {activeGroup.name}
                    </h2>
                    <p className="text-xs text-slate-600 mt-1">
                      {activeGroup.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setShowCreatePost((prev) => !prev)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 whitespace-nowrap"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Share Note / Question</span>
                    </button>

                    {activeGroup.ownerId === uid && (
                      <button
                        onClick={() => deleteStudentGroupEntry(activeGroup.id)}
                        className="p-2 text-slate-400 hover:text-red-600 rounded-lg"
                        title="Delete group (Creator control)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Pinned Group Announcement Banner */}
                {(activeGroup.pinnedAnnouncement || activeGroup.ownerId === uid) && (
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-900 inline-flex items-center gap-1.5">
                        <Megaphone className="w-3.5 h-3.5 text-indigo-700" />
                        Pinned Group Announcement
                      </span>
                      {activeGroup.ownerId === uid && (
                        <button
                          onClick={() => {
                            setAnnouncementDraft(activeGroup.pinnedAnnouncement);
                            setEditingAnnouncement((prev) => !prev);
                          }}
                          className="text-xs font-medium text-indigo-700 hover:underline"
                        >
                          {editingAnnouncement ? 'Cancel' : 'Edit Announcement'}
                        </button>
                      )}
                    </div>

                    {editingAnnouncement ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          maxLength={1000}
                          value={announcementDraft}
                          onChange={(e) => setAnnouncementDraft(e.target.value)}
                          placeholder="Enter group announcement..."
                          className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                        />
                        <button
                          onClick={async () => {
                            await updateGroupPinnedAnnouncement(
                              activeGroup,
                              announcementDraft
                            );
                            setEditingAnnouncement(false);
                          }}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg"
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-700">
                        {activeGroup.pinnedAnnouncement ||
                          'No pinned announcement yet. Group creator can post important syllabus or exam updates here.'}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Share Note / Study Material / Question Form */}
              {showCreatePost && (
                <form
                  onSubmit={handleCreatePost}
                  className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <h3 className="text-base font-semibold text-slate-900">
                      Share Resource in {activeGroup.name}
                    </h3>
                    {personalNotes.length > 0 && (
                      <select
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) handleImportPersonalNoteToPost(e.target.value);
                        }}
                        className="px-2.5 py-1.5 text-xs bg-slate-100 border border-slate-200 rounded-lg text-slate-700"
                      >
                        <option value="">Import from My Saved Notes...</option>
                        {personalNotes.map((n) => (
                          <option key={n.id} value={n.id}>
                            {n.title} ({n.subject})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Resource Type
                      </label>
                      <select
                        value={postType}
                        onChange={(e) => setPostType(e.target.value as GroupPostType)}
                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg"
                      >
                        {POST_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Title *
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={160}
                        placeholder="e.g., Unit 2 Important Derivations & Solved Problems"
                        value={postTitle}
                        onChange={(e) => setPostTitle(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Content / Notes / Questions *
                    </label>
                    <textarea
                      rows={5}
                      required
                      maxLength={15000}
                      placeholder="Write or paste study notes, important exam questions, or academic discussion points..."
                      value={postContent}
                      onChange={(e) => setPostContent(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 cursor-pointer">
                        <Upload className="w-3.5 h-3.5" />
                        <span>
                          {attachmentName
                            ? `Attached: ${attachmentName}`
                            : 'Attach PDF / Study File'}
                        </span>
                        <input
                          type="file"
                          accept=".pdf,.txt,.md,image/*"
                          onChange={handlePostFileUpload}
                          className="hidden"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => setIsPinned((prev) => !prev)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border ${
                          isPinned
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        <Pin className="w-3.5 h-3.5" />
                        <span>{isPinned ? 'Pinned Resource' : 'Pin Resource'}</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowCreatePost(false)}
                        className="px-4 py-2 text-xs font-medium text-slate-600"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={creatingPost}
                        className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50"
                      >
                        {creatingPost ? 'Sharing...' : 'Post to Group'}
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Post Category Filter Tabs */}
              <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
                {(['All', 'Pinned', ...POST_TYPES] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setPostFilter(type)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                      postFilter === type
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {/* Group Posts Feed */}
              {visiblePosts.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
                  <BookOpen className="w-7 h-7 text-slate-400 mx-auto mb-2" />
                  <h4 className="text-sm font-semibold text-slate-900">
                    No Shared Resources in This Filter
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Share lecture notes, PDFs, or important exam questions to help your classmates.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {visiblePosts.map((post) => (
                    <div
                      key={post.id}
                      className="bg-white border border-slate-200 rounded-xl p-5 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            {post.isPinned && (
                              <>
                                <span className="font-semibold text-indigo-700 inline-flex items-center gap-1">
                                  <Pin className="w-3 h-3" />
                                  Pinned
                                </span>
                                <span aria-hidden="true">·</span>
                              </>
                            )}
                            <span className="font-semibold text-slate-800">
                              {post.postType}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>Shared by {post.authorName}</span>
                          </div>
                          <h3 className="text-base font-semibold text-slate-900 mt-1">
                            {post.title}
                          </h3>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleSavePostToMyNotes(post)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 whitespace-nowrap"
                            title="Save to my personal Notes"
                          >
                            <BookmarkPlus className="w-3.5 h-3.5" />
                            <span>Save to My Notes</span>
                          </button>

                          {post.ownerId === uid && (
                            <button
                              onClick={() =>
                                toggleGroupPostPin(
                                  activeGroup.id,
                                  post.id,
                                  !post.isPinned
                                )
                              }
                              className="p-1.5 text-slate-400 hover:text-slate-900 rounded-lg"
                              title="Toggle pin"
                            >
                              <Pin className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {(post.ownerId === uid || activeGroup.ownerId === uid) && (
                            <button
                              onClick={() =>
                                deleteGroupPostEntry(activeGroup.id, post.id)
                              }
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"
                              title="Delete post"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {post.content}
                      </div>

                      {post.attachmentName && (
                        <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                          <span className="inline-flex items-center gap-1.5 text-slate-700">
                            <FileText className="w-3.5 h-3.5 text-slate-500" />
                            {post.attachmentName}
                          </span>
                          {post.attachmentDataUrl && (
                            <a
                              href={post.attachmentDataUrl}
                              download={post.attachmentName}
                              className="font-semibold text-slate-900 hover:underline"
                            >
                              Download Attachment
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
