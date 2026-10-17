import React, { useState, useEffect } from 'react';
import {
  X,
  UserPlus,
  RotateCcw,
  Trash2,
  CheckCircle2,
  Sparkles,
  Users,
  ShieldAlert,
  Edit3,
  ArrowLeft,
  Save,
  Share2,
  Mail,
  Loader2,
  UserCheck,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { KidProfile } from '../types';
import {
  AVATAR_OPTIONS,
  LEVEL_DESCRIPTIONS,
  createNewProfile,
  updateProfile,
  resetProfileProgress,
  deleteProfile,
  setActiveProfileId,
} from '../profileManager';
import {
  shareSpellerProfileWithEmail,
  unshareSpellerProfileWithEmail,
} from '../services/firebase';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: KidProfile[];
  activeProfile: KidProfile;
  currentUser?: User | null;
  onProfileChanged: (profile: KidProfile, allProfiles: KidProfile[]) => void;
  initialMode?: 'switch' | 'create' | 'edit' | 'share';
  initialShareProfileId?: string;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  profiles,
  activeProfile,
  currentUser,
  onProfileChanged,
  initialMode = 'switch',
  initialShareProfileId,
}) => {
  const [tab, setTab] = useState<'switch' | 'create' | 'edit' | 'share'>(initialMode);

  // Create form state
  const [newName, setNewName] = useState('');
  const [newAge, setNewAge] = useState(8);
  const [newAvatar, setNewAvatar] = useState('🦊');
  const [newLevel, setNewLevel] = useState(2);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit form state
  const [editingProfileId, setEditingProfileId] = useState<string>(activeProfile.id);
  const [editName, setEditName] = useState(activeProfile.name);
  const [editAge, setEditAge] = useState(activeProfile.age);
  const [editAvatar, setEditAvatar] = useState(activeProfile.avatarEmoji || '🦊');
  const [editLevel, setEditLevel] = useState(activeProfile.difficultyLevel || 2);
  const [editError, setEditError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sharing state
  const [sharingProfileId, setSharingProfileId] = useState<string>(
    initialShareProfileId || activeProfile.id
  );
  const [shareEmailInput, setShareEmailInput] = useState('');
  const [shareLoading, setShareLoading] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareSuccess, setShareSuccess] = useState<string | null>(null);

  // Reset / Delete confirmation state
  const [confirmResetId, setConfirmResetId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTab(initialMode);
      setEditingProfileId(activeProfile.id);
      setSharingProfileId(initialShareProfileId || activeProfile.id);
      setEditName(activeProfile.name);
      setEditAge(activeProfile.age);
      setEditAvatar(activeProfile.avatarEmoji || '🦊');
      setEditLevel(activeProfile.difficultyLevel || 2);
      setEditError(null);
      setCreateError(null);
      setShareError(null);
      setShareSuccess(null);
      setShareEmailInput('');
      setSaveSuccess(false);
      setConfirmResetId(null);
      setConfirmDeleteId(null);
    }
  }, [isOpen, initialMode, activeProfile, initialShareProfileId]);

  if (!isOpen) return null;

  const handleSelectProfile = (profile: KidProfile) => {
    setActiveProfileId(profile.id);
    onProfileChanged(profile, profiles);
    onClose();
  };

  const startEditing = (p: KidProfile) => {
    setEditingProfileId(p.id);
    setEditName(p.name);
    setEditAge(p.age);
    setEditAvatar(p.avatarEmoji || '🦊');
    setEditLevel(p.difficultyLevel || 2);
    setEditError(null);
    setSaveSuccess(false);
    setTab('edit');
  };

  const startSharing = (p: KidProfile) => {
    setSharingProfileId(p.id);
    setShareEmailInput('');
    setShareError(null);
    setShareSuccess(null);
    setTab('share');
  };

  const handleShareSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = shareEmailInput.toLowerCase().trim();
    if (!cleanEmail) return;
    setShareLoading(true);
    setShareError(null);
    setShareSuccess(null);
    try {
      const targetProfile = profiles.find((p) => p.id === sharingProfileId) || activeProfile;
      const userObj = currentUser || {
        uid: targetProfile.ownerId || 'user',
        email: targetProfile.ownerEmail,
      };
      const updated = await shareSpellerProfileWithEmail(userObj, targetProfile, cleanEmail);
      const updatedList = profiles.map((p) => (p.id === sharingProfileId ? updated : p));
      onProfileChanged(activeProfile.id === sharingProfileId ? updated : activeProfile, updatedList);
      setShareSuccess(`Shared with ${cleanEmail}! Progress will automatically sync.`);
      setShareEmailInput('');
      setTimeout(() => setShareSuccess(null), 4000);
    } catch (err: unknown) {
      setShareError(err instanceof Error ? err.message : 'Failed to share profile.');
    } finally {
      setShareLoading(false);
    }
  };

  const handleRevokeShare = async (emailToRemove: string) => {
    setShareLoading(true);
    setShareError(null);
    setShareSuccess(null);
    try {
      const targetProfile = profiles.find((p) => p.id === sharingProfileId) || activeProfile;
      const userObj = currentUser || {
        uid: targetProfile.ownerId || 'user',
        email: targetProfile.ownerEmail,
      };
      const updated = await unshareSpellerProfileWithEmail(userObj, targetProfile, emailToRemove);
      const updatedList = profiles.map((p) => (p.id === sharingProfileId ? updated : p));
      onProfileChanged(activeProfile.id === sharingProfileId ? updated : activeProfile, updatedList);
      setShareSuccess(`Revoked access for ${emailToRemove}.`);
      setTimeout(() => setShareSuccess(null), 3000);
    } catch (err: unknown) {
      setShareError(err instanceof Error ? err.message : 'Failed to revoke access.');
    } finally {
      setShareLoading(false);
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setCreateError('Please enter a name for the speller.');
      return;
    }
    setCreateError(null);
    const userEmail = currentUser?.email?.toLowerCase().trim();
    const created = createNewProfile(newName, newAge, newLevel, newAvatar, currentUser?.uid);
    const enriched: KidProfile = {
      ...created,
      ownerId: currentUser?.uid,
      ownerEmail: userEmail,
      collaboratorEmails: userEmail ? [userEmail] : [],
      sharedWithEmails: [],
    };
    const updatedProfiles = [...profiles, enriched];
    onProfileChanged(enriched, updatedProfiles);
    setNewName('');
    setTab('switch');
    onClose();
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      setEditError('Please enter a name for the speller.');
      return;
    }
    setEditError(null);

    const existing = profiles.find((p) => p.id === editingProfileId);
    const updated = updateProfile(editingProfileId, {
      name: editName,
      age: editAge,
      difficultyLevel: editLevel,
      avatarEmoji: editAvatar,
    });
    const enriched: KidProfile = {
      ...updated,
      ownerId: existing?.ownerId || updated.ownerId,
      ownerEmail: existing?.ownerEmail || updated.ownerEmail,
      collaboratorEmails: existing?.collaboratorEmails || updated.collaboratorEmails,
      sharedWithEmails: existing?.sharedWithEmails || updated.sharedWithEmails,
    };

    const updatedList = profiles.map((p) => (p.id === editingProfileId ? enriched : p));
    const nextActive = activeProfile.id === editingProfileId ? enriched : activeProfile;

    onProfileChanged(nextActive, updatedList);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setTab('switch');
    }, 1200);
  };

  const handleReset = (profileId: string) => {
    const updated = resetProfileProgress(profileId);
    const updatedList = profiles.map((p) => (p.id === profileId ? updated : p));
    if (activeProfile.id === profileId) {
      onProfileChanged(updated, updatedList);
    } else {
      onProfileChanged(activeProfile, updatedList);
    }
    setConfirmResetId(null);
  };

  const handleDelete = (profileId: string) => {
    const { remaining, nextActive } = deleteProfile(profileId);
    onProfileChanged(nextActive, remaining);
    setConfirmDeleteId(null);
  };

  const sharingProfile = profiles.find((p) => p.id === sharingProfileId) || activeProfile;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-600">
              {tab === 'share' ? <Share2 className="h-5 w-5" /> : <Users className="h-5 w-5" />}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                {tab === 'edit'
                  ? 'Edit Speller Profile'
                  : tab === 'share'
                  ? 'Share & Sync Profile'
                  : 'Speller Profiles'}
              </h2>
              <p className="text-xs text-slate-500">
                {tab === 'edit'
                  ? 'Update child name, age, avatar, or difficulty level'
                  : tab === 'share'
                  ? `Sync ${sharingProfile.name}'s progress in real-time with another Gmail account`
                  : 'Manage kid profiles, switch spellers, or reset progress'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab selection */}
        {tab === 'edit' ? (
          <div className="mt-5 flex items-center justify-between">
            <button
              onClick={() => setTab('switch')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Profiles
            </button>
            <span className="text-xs font-semibold text-slate-500">
              Editing: <strong className="text-slate-800">{editName}</strong>
            </span>
          </div>
        ) : tab === 'share' ? (
          <div className="mt-5 flex items-center justify-between">
            <button
              onClick={() => setTab('switch')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Profiles
            </button>
            <span className="text-xs font-semibold text-slate-500">
              Sharing: <strong className="text-slate-800">{sharingProfile.name}</strong>
            </span>
          </div>
        ) : (
          <div className="mt-5 flex gap-2 rounded-2xl bg-slate-100 p-1.5">
            <button
              onClick={() => setTab('switch')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold transition ${
                tab === 'switch' ? 'bg-white text-sky-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="h-4 w-4" />
              Profiles ({profiles.length})
            </button>
            <button
              onClick={() => setTab('create')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-xs font-bold transition ${
                tab === 'create' ? 'bg-white text-sky-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserPlus className="h-4 w-4" />
              Create New Profile
            </button>
          </div>
        )}

        {/* TAB 1: PROFILES LIST */}
        {tab === 'switch' && (
          <div className="mt-5 space-y-3">
            {profiles.map((p) => {
              const isActive = p.id === activeProfile.id;
              const isResetting = confirmResetId === p.id;
              const isDeleting = confirmDeleteId === p.id;

              return (
                <div
                  key={p.id}
                  className={`rounded-2xl border-2 p-4 transition ${
                    isActive
                      ? 'border-sky-400 bg-sky-50/60 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => handleSelectProfile(p)}
                      className="flex flex-1 items-center gap-3 text-left"
                    >
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm border border-slate-100">
                        {p.avatarEmoji || '🦊'}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">{p.name}</span>
                          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                            Age {p.age}
                          </span>
                          {isActive && (
                            <span className="rounded-full bg-sky-500 px-2 py-0.5 text-[10px] font-bold text-white">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {LEVEL_DESCRIPTIONS[p.difficultyLevel]?.title || `Level ${p.difficultyLevel}`} •{' '}
                          {p.roundsCompleted} rounds completed
                        </p>
                        {p.ownerEmail && (
                          <div className="mt-1 flex items-center gap-1.5 text-[10px]">
                            {currentUser?.email && p.ownerEmail.toLowerCase() === currentUser.email.toLowerCase() ? (
                              <span className="inline-flex items-center gap-1 text-slate-500">
                                <Users className="h-3 w-3 text-sky-500" />
                                {p.sharedWithEmails && p.sharedWithEmails.length > 0
                                  ? `Shared with ${p.sharedWithEmails.length} account${p.sharedWithEmails.length > 1 ? 's' : ''}`
                                  : 'Not shared yet'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                                <UserCheck className="h-3 w-3 text-emerald-600" />
                                Shared by {p.ownerEmail}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </button>

                    <div className="flex items-center gap-1.5">
                      {/* Share & Sync button */}
                      <button
                        onClick={() => startSharing(p)}
                        title={`Share & sync ${p.name}'s progress with another Gmail account`}
                        className={`flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs font-bold transition shadow-xs ${
                          p.sharedWithEmails && p.sharedWithEmails.length > 0
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <Share2 className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Share</span>
                        {p.sharedWithEmails && p.sharedWithEmails.length > 0 && (
                          <span className="ml-0.5 rounded-full bg-emerald-200 px-1.5 py-0.2 text-[10px] font-extrabold text-emerald-800">
                            {p.sharedWithEmails.length}
                          </span>
                        )}
                      </button>

                      {/* Prominent Edit Profile button */}
                      <button
                        onClick={() => startEditing(p)}
                        title={`Edit ${p.name}'s profile details`}
                        className="flex items-center gap-1 rounded-xl border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-xs font-bold text-sky-700 hover:bg-sky-100 transition shadow-xs"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        <span>Edit</span>
                      </button>

                      {/* Reset Progress button */}
                      <button
                        onClick={() => {
                          setConfirmResetId(isResetting ? null : p.id);
                          setConfirmDeleteId(null);
                        }}
                        title="Reset progress for this profile"
                        className="rounded-xl border border-slate-200 p-1.5 text-slate-500 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200 transition"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>

                      {/* Delete profile button */}
                      {profiles.length > 1 && (
                        <button
                          onClick={() => {
                            setConfirmDeleteId(isDeleting ? null : p.id);
                            setConfirmResetId(null);
                          }}
                          title="Delete profile"
                          className="rounded-xl p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Reset Confirmation Banner */}
                  {isResetting && (
                    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600" />
                        <span className="font-semibold">Reset progress for {p.name}?</span>
                      </div>
                      <p className="mt-1 text-[11px] text-amber-700">
                        This resets all rounds, review words, and level confidence back to Level 1. The name and avatar will be kept.
                      </p>
                      <div className="mt-2.5 flex items-center gap-2">
                        <button
                          onClick={() => handleReset(p.id)}
                          className="rounded-lg bg-amber-600 px-3 py-1 font-bold text-white hover:bg-amber-700"
                        >
                          Yes, Reset Progress
                        </button>
                        <button
                          onClick={() => setConfirmResetId(null)}
                          className="rounded-lg bg-white px-3 py-1 font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Delete Confirmation Banner */}
                  {isDeleting && (
                    <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600" />
                        <span className="font-semibold">Permanently delete {p.name}?</span>
                      </div>
                      <p className="mt-1 text-[11px] text-rose-700">
                        All saved rounds and phoneme history for this child will be removed.
                      </p>
                      <div className="mt-2.5 flex items-center gap-2">
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="rounded-lg bg-rose-600 px-3 py-1 font-bold text-white hover:bg-rose-700"
                        >
                          Yes, Delete Profile
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="rounded-lg bg-white px-3 py-1 font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 2: CREATE PROFILE */}
        {tab === 'create' && (
          <form onSubmit={handleCreate} className="mt-5 space-y-4">
            {createError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                {createError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700">Child's Name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., Maya, Leo, Jordan"
                maxLength={20}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:border-sky-500 focus:outline-none"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700">Age</label>
                <select
                  value={newAge}
                  onChange={(e) => setNewAge(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 focus:border-sky-500 focus:outline-none"
                >
                  {[5, 6, 7, 8, 9, 10, 11, 12].map((a) => (
                    <option key={a} value={a}>
                      {a} years old
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Starting Level</label>
                <select
                  value={newLevel}
                  onChange={(e) => setNewLevel(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 focus:border-sky-500 focus:outline-none"
                >
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <option key={lvl} value={lvl}>
                      Level {lvl} ({LEVEL_DESCRIPTIONS[lvl]?.grade})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700">Choose Avatar</label>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {AVATAR_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setNewAvatar(emoji)}
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl text-xl transition ${
                      newAvatar === emoji
                        ? 'border-2 border-sky-500 bg-sky-100 shadow-sm scale-110'
                        : 'border border-slate-200 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-3 text-xs text-sky-900">
              <div className="flex items-center gap-1.5 font-bold">
                <Sparkles className="h-4 w-4 text-sky-500" />
                Adaptive Learning
              </div>
              <p className="mt-0.5 text-[11px] text-sky-700">
                SpellBuddy AI will track {newName || 'this child'}'s phonemes and difficulty level independently.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full rounded-xl bg-sky-500 py-3 text-sm font-bold text-white shadow-md transition hover:bg-sky-600"
              >
                Create Profile & Start Spelling
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: EDIT PROFILE */}
        {tab === 'edit' && (
          <form onSubmit={handleUpdate} className="mt-5 space-y-4">
            {editError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                {editError}
              </div>
            )}

            {saveSuccess && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Profile updated successfully!</span>
                </div>
              </div>
            )}

            {profiles.length > 1 && (
              <div>
                <label className="block text-xs font-bold text-slate-700">Select Speller to Edit</label>
                <select
                  value={editingProfileId}
                  onChange={(e) => {
                    const found = profiles.find((p) => p.id === e.target.value);
                    if (found) startEditing(found);
                  }}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm font-semibold text-slate-800 focus:border-sky-500 focus:outline-none"
                >
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.avatarEmoji || '🦊'} {p.name} (Age {p.age}, Level {p.difficultyLevel}) {p.id === activeProfile.id ? '• Active' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700">Child's Name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Child's Name"
                maxLength={20}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:border-sky-500 focus:outline-none"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700">Age</label>
                <select
                  value={editAge}
                  onChange={(e) => setEditAge(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 focus:border-sky-500 focus:outline-none"
                >
                  {[5, 6, 7, 8, 9, 10, 11, 12].map((a) => (
                    <option key={a} value={a}>
                      {a} years old
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Spelling Difficulty Level</label>
                <select
                  value={editLevel}
                  onChange={(e) => setEditLevel(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 focus:border-sky-500 focus:outline-none"
                >
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <option key={lvl} value={lvl}>
                      Level {lvl} ({LEVEL_DESCRIPTIONS[lvl]?.grade})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700">Choose Avatar</label>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {AVATAR_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setEditAvatar(emoji)}
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl text-xl transition ${
                      editAvatar === emoji
                        ? 'border-2 border-sky-500 bg-sky-100 shadow-sm scale-110'
                        : 'border border-slate-200 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              <span className="font-bold text-slate-800">Note on Difficulty Level:</span>{' '}
              {LEVEL_DESCRIPTIONS[editLevel]?.subtitle || ''}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setTab('switch')}
                className="flex-1 rounded-xl border border-slate-200 bg-white py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-sky-500 py-3 text-sm font-bold text-white shadow-md transition hover:bg-sky-600"
              >
                <Save className="h-4 w-4" />
                Save Changes
              </button>
            </div>
          </form>
        )}

        {/* TAB 4: SHARE & SYNC */}
        {tab === 'share' && (
          <div className="mt-5 space-y-5">
            {/* Target Profile Card */}
            <div className="flex items-center gap-3.5 rounded-2xl border border-sky-100 bg-sky-50/70 p-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm border border-slate-100 shrink-0">
                {sharingProfile.avatarEmoji || '🦊'}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-800 text-base">{sharingProfile.name}</span>
                  <span className="rounded-full bg-sky-200/80 px-2 py-0.5 text-[10px] font-bold text-sky-800">
                    Age {sharingProfile.age}
                  </span>
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                    {LEVEL_DESCRIPTIONS[sharingProfile.difficultyLevel]?.title || `Level ${sharingProfile.difficultyLevel}`}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500 truncate">
                  {sharingProfile.ownerEmail
                    ? currentUser?.email && sharingProfile.ownerEmail.toLowerCase() === currentUser.email.toLowerCase()
                      ? 'You are the primary owner of this profile'
                      : `Shared with you by ${sharingProfile.ownerEmail}`
                    : 'Created locally • Share to sync across devices'}
                </p>
              </div>
            </div>

            {/* Sync Information Banner */}
            <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/60 to-sky-50/60 p-4">
              <div className="flex items-start gap-2.5">
                <Sparkles className="h-5 w-5 shrink-0 text-indigo-600 mt-0.5" />
                <div className="text-xs text-slate-600 space-y-1">
                  <p className="font-bold text-slate-800">Real-Time Sync Across Devices & Accounts</p>
                  <p>
                    Share <strong>{sharingProfile.name}</strong> with a spouse, co-parent, tutor, or teacher’s Gmail.
                    When they sign in, this speller will automatically appear in their profile list.
                  </p>
                  <p className="text-[11px] text-slate-500">
                    ✓ Rounds & test scores sync live • ✓ Mastered & struggle words update • ✓ Speech settings preserved
                  </p>
                </div>
              </div>
            </div>

            {/* Invite by Email Form */}
            <form onSubmit={handleShareSubmit} className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                Add Gmail Account to Share & Sync
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    value={shareEmailInput}
                    onChange={(e) => setShareEmailInput(e.target.value)}
                    placeholder="Enter Gmail (e.g. parent@gmail.com)"
                    disabled={shareLoading}
                    className="w-full rounded-xl border border-slate-200 pl-10 pr-3.5 py-2.5 text-sm font-semibold text-slate-800 placeholder-slate-400 focus:border-sky-500 focus:outline-none disabled:bg-slate-50"
                  />
                </div>
                <button
                  type="submit"
                  disabled={shareLoading || !shareEmailInput.trim()}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-sky-500 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-sky-600 disabled:bg-slate-300 disabled:cursor-not-allowed shrink-0"
                >
                  {shareLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="h-4 w-4" />
                      <span>Share & Sync</span>
                    </>
                  )}
                </button>
              </div>

              {/* Status alerts */}
              {shareSuccess && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span className="font-semibold">{shareSuccess}</span>
                </div>
              )}

              {shareError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{shareError}</span>
                </div>
              )}

              {!currentUser?.email && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 flex items-start gap-2">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <span className="font-bold">Recommendation:</span> Sign in with your Google account in the top right so the other parent can recognize your email as the sender.
                  </div>
                </div>
              )}
            </form>

            {/* List of Accounts with Access */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Accounts with Access</span>
                <span className="text-[11px] text-slate-400">
                  {1 + (sharingProfile.sharedWithEmails?.length || 0)} account{((sharingProfile.sharedWithEmails?.length || 0) + 1) > 1 ? 's' : ''}
                </span>
              </div>

              <div className="rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden bg-white">
                {/* Primary Owner Row */}
                <div className="flex items-center justify-between p-3 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100 text-sky-700 font-bold shrink-0">
                      <UserCheck className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 truncate">
                        {sharingProfile.ownerEmail || currentUser?.email || 'You (Local Creator)'}
                      </p>
                      <p className="text-[10px] text-slate-400">Primary Account</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700 shrink-0">
                    Owner
                  </span>
                </div>

                {/* Shared Collaborators */}
                {sharingProfile.sharedWithEmails && sharingProfile.sharedWithEmails.length > 0 ? (
                  sharingProfile.sharedWithEmails.map((email) => (
                    <div key={email} className="flex items-center justify-between p-3 text-xs hover:bg-slate-50 transition">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 font-bold shrink-0">
                          <Mail className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 truncate">{email}</p>
                          <p className="text-[10px] text-emerald-600 font-medium">Full Real-Time Sync</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleRevokeShare(email)}
                          disabled={shareLoading}
                          title={`Revoke access for ${email}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 transition disabled:opacity-50"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-slate-400">
                    Not shared with any other Gmail accounts yet.
                  </div>
                )}
              </div>
            </div>

            {/* Back Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setTab('switch')}
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                Back to Profiles
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
