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
} from 'lucide-react';
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

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: KidProfile[];
  activeProfile: KidProfile;
  onProfileChanged: (profile: KidProfile, allProfiles: KidProfile[]) => void;
  initialMode?: 'switch' | 'create' | 'edit';
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  profiles,
  activeProfile,
  onProfileChanged,
  initialMode = 'switch',
}) => {
  const [tab, setTab] = useState<'switch' | 'create' | 'edit'>(initialMode);

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

  // Reset / Delete confirmation state
  const [confirmResetId, setConfirmResetId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTab(initialMode);
      setEditingProfileId(activeProfile.id);
      setEditName(activeProfile.name);
      setEditAge(activeProfile.age);
      setEditAvatar(activeProfile.avatarEmoji || '🦊');
      setEditLevel(activeProfile.difficultyLevel || 2);
      setEditError(null);
      setCreateError(null);
      setSaveSuccess(false);
      setConfirmResetId(null);
      setConfirmDeleteId(null);
    }
  }, [isOpen, initialMode, activeProfile]);

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

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setCreateError('Please enter a name for the speller.');
      return;
    }
    setCreateError(null);
    const created = createNewProfile(newName, newAge, newLevel, newAvatar);
    const updatedProfiles = [...profiles, created];
    onProfileChanged(created, updatedProfiles);
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

    const updated = updateProfile(editingProfileId, {
      name: editName,
      age: editAge,
      difficultyLevel: editLevel,
      avatarEmoji: editAvatar,
    });

    const updatedList = profiles.map((p) => (p.id === editingProfileId ? updated : p));
    const nextActive = activeProfile.id === editingProfileId ? updated : activeProfile;

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-600">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                {tab === 'edit' ? 'Edit Speller Profile' : 'Speller Profiles'}
              </h2>
              <p className="text-xs text-slate-500">
                {tab === 'edit'
                  ? 'Update child name, age, avatar, or difficulty level'
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
                      </div>
                    </button>

                    <div className="flex items-center gap-1.5">
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
      </div>
    </div>
  );
};
