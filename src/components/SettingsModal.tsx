import React, { useState, useEffect } from 'react';
import {
  X,
  Key,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Eye,
  EyeOff,
  Trash2,
  Loader2,
  Sparkles,
  BarChart3,
  FileSpreadsheet,
  Download,
  User as UserIcon,
  Shield,
  Plus,
  Trash,
  LogOut,
  RotateCcw,
  Check,
  Star,
  Award,
  TrendingUp,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  getCustomApiKey,
  setCustomApiKey,
  prewarmRoundAudio,
  getVoiceEnginePreference,
  setVoiceEnginePreference,
  VoiceEngineMode,
  clearIdbAudio,
} from '../services/geminiService';
import { KidProfile, WordHistoryRecord, ApprovedUser, PhonemeStat } from '../types';
import { LEVEL_DESCRIPTIONS } from '../profileManager';
import { EXPANSIVE_WORDS_BY_LEVEL } from '../wordBank';
import {
  loadWordHistoryFromFirestore,
  loadApprovedUsersList,
  addApprovedUserEmail,
  removeApprovedUserEmail,
  seedWordBankLevelToFirestore,
  MASTER_ADMIN_EMAIL,
} from '../services/firebase';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeyChange?: (hasKey: boolean) => void;
  profile: KidProfile;
  profiles: KidProfile[];
  currentUser: User | null;
  isAdmin: boolean;
  onResetProfile: () => void;
  onSignOut: () => void;
  initialTab?: 'phonemes' | 'history' | 'account' | 'api';
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onKeyChange,
  profile,
  profiles,
  currentUser,
  isAdmin,
  onResetProfile,
  onSignOut,
  initialTab = 'phonemes',
}) => {
  const [activeTab, setActiveTab] = useState<'phonemes' | 'history' | 'account' | 'api'>(initialTab);

  // API Key state
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Word History state
  const [historyRecords, setHistoryRecords] = useState<WordHistoryRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyFilterSpeller, setHistoryFilterSpeller] = useState<string>('all');

  // Approved users whitelist state (Admin)
  const [approvedUsers, setApprovedUsers] = useState<ApprovedUser[]>([]);
  const [loadingApproved, setLoadingApproved] = useState(false);
  const [newEmailInput, setNewEmailInput] = useState('');
  const [newRoleInput, setNewRoleInput] = useState<'speller_parent' | 'admin'>('speller_parent');
  const [whitelistMsg, setWhitelistMsg] = useState<string | null>(null);

  // Phoneme Dashboard reset confirm
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [cachingAudio, setCachingAudio] = useState(false);
  const [voiceEngine, setVoiceEngine] = useState<VoiceEngineMode>(getVoiceEnginePreference());

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setApiKey(getCustomApiKey());
      setVoiceEngine(getVoiceEnginePreference());
      setTestResult(null);
      setSaveSuccess(false);

      if (currentUser?.uid) {
        fetchHistory();
        if (isAdmin) {
          fetchApprovedUsers();
        }
      }
    }
  }, [isOpen, initialTab, currentUser, isAdmin]);

  const fetchHistory = async () => {
    if (!currentUser?.uid) return;
    setLoadingHistory(true);
    try {
      const records = await loadWordHistoryFromFirestore(currentUser.uid);
      setHistoryRecords(records);
    } catch (err) {
      console.warn('Could not load history from Firestore:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchApprovedUsers = async () => {
    setLoadingApproved(true);
    try {
      const list = await loadApprovedUsersList();
      setApprovedUsers(list);
    } catch (err) {
      console.warn('Could not load approved users:', err);
    } finally {
      setLoadingApproved(false);
    }
  };

  const handleAddApprovedUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newEmailInput.toLowerCase().trim();
    if (!clean || !clean.includes('@')) {
      setWhitelistMsg('Please enter a valid email address.');
      return;
    }

    try {
      await addApprovedUserEmail(clean, newRoleInput, currentUser?.email || 'Admin');
      setNewEmailInput('');
      setWhitelistMsg(`Successfully added ${clean} to approved users!`);
      await fetchApprovedUsers();
      setTimeout(() => setWhitelistMsg(null), 3000);
    } catch {
      setWhitelistMsg('Failed to add user. Ensure you have admin permissions.');
    }
  };

  const handleRemoveApprovedUser = async (email: string) => {
    if (email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase()) {
      alert('The master administrator email cannot be removed.');
      return;
    }
    if (!window.confirm(`Remove access for ${email}?`)) return;

    try {
      await removeApprovedUserEmail(email);
      await fetchApprovedUsers();
    } catch {
      alert('Could not remove user from whitelist.');
    }
  };

  const handleDownloadCSV = () => {
    const filtered =
      historyFilterSpeller === 'all'
        ? historyRecords
        : historyRecords.filter((r) => r.spellerId === historyFilterSpeller);

    if (filtered.length === 0) {
      alert('No spelling word records found to export for the selected speller.');
      return;
    }

    const headers = [
      'Date & Time',
      'Speller Name',
      'Spelling Word',
      'Status',
      'Difficulty Level',
      'Child Handwritten Attempt',
      'Hint/Spelling Revealed',
      'Phoneme Patterns',
    ];

    const rows = filtered.map((r) => [
      `"${new Date(r.timestamp).toLocaleString()}"`,
      `"${r.spellerName.replace(/"/g, '""')}"`,
      `"${r.word.replace(/"/g, '""')}"`,
      `"${r.status === 'correct' ? 'Correct' : 'Needs Practice'}"`,
      `"Level ${r.level}"`,
      `"${(r.childAttempt || '').replace(/"/g, '""')}"`,
      `"${r.wasRevealed ? 'Yes' : 'No'}"`,
      `"${(r.phonemes || []).join(', ')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    const spellerLabel =
      historyFilterSpeller === 'all'
        ? 'all_spellers'
        : profiles.find((p) => p.id === historyFilterSpeller)?.name || 'speller';
    link.setAttribute('download', `spellbuddy_${spellerLabel}_word_history_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSaveKey = () => {
    const trimmed = apiKey.trim();
    setCustomApiKey(trimmed);
    setSaveSuccess(true);
    onKeyChange?.(Boolean(trimmed));
    setTimeout(() => {
      setSaveSuccess(false);
    }, 2500);
  };

  const handleClearKey = () => {
    setApiKey('');
    setCustomApiKey('');
    setTestResult(null);
    setSaveSuccess(true);
    onKeyChange?.(false);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 2500);
  };

  const handleTestKey = async () => {
    const keyToTest = apiKey.trim();
    if (!keyToTest) {
      setTestResult({
        success: false,
        message: 'Please paste an API key first to test it.',
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/spelling/test-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-api-key': keyToTest,
        },
        body: JSON.stringify({ apiKey: keyToTest }),
      });

      const data = await res.json();
      if (res.ok && data.valid) {
        setTestResult({
          success: true,
          message: 'Success! Your Gemini API key is valid and connected to Gemini Flash.',
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Failed to validate API key. Please check the key.',
        });
      }
    } catch {
      setTestResult({
        success: false,
        message: 'Could not connect to test server. Please check your network.',
      });
    } finally {
      setTesting(false);
    }
  };

  if (!isOpen) return null;

  const levelInfo = LEVEL_DESCRIPTIONS[profile.difficultyLevel] || {
    title: `Level ${profile.difficultyLevel}`,
    subtitle: 'Adaptive grade-level spelling',
    grade: 'Grade-level',
  };

  const phonemeList = (Object.values(profile.phonemeMastery || {}) as PhonemeStat[]).sort(
    (a, b) => b.attempts - a.attempts
  );

  const consecutive = profile.consecutiveHighScores || 0;
  const progressPct = Math.min(Math.round((consecutive / 3) * 100), 100);

  // History filtering calculations
  const filteredHistory =
    historyFilterSpeller === 'all'
      ? historyRecords
      : historyRecords.filter((r) => r.spellerId === historyFilterSpeller);
  const totalCorrect = filteredHistory.filter((r) => r.status === 'correct').length;
  const totalWrong = filteredHistory.filter((r) => r.status === 'wrong').length;
  const accuracyRate =
    filteredHistory.length > 0 ? Math.round((totalCorrect / filteredHistory.length) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative my-6 w-full max-w-3xl rounded-3xl border-2 border-sky-200 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500 text-white shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">SpellBuddy Settings & Tools</h3>
              <p className="text-xs text-slate-500">
                Phoneme analytics, word logs, Google account & API preferences
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Strip */}
        <div className="flex border-b border-slate-200 bg-white px-6 overflow-x-auto gap-2">
          <button
            onClick={() => setActiveTab('phonemes')}
            className={`flex items-center gap-2 border-b-2 py-3 px-3 text-xs sm:text-sm font-bold whitespace-nowrap transition ${
              activeTab === 'phonemes'
                ? 'border-sky-500 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Phoneme Dashboard
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 border-b-2 py-3 px-3 text-xs sm:text-sm font-bold whitespace-nowrap transition ${
              activeTab === 'history'
                ? 'border-sky-500 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileSpreadsheet className="h-4 w-4" />
            Word History & CSV
          </button>
          <button
            onClick={() => setActiveTab('account')}
            className={`flex items-center gap-2 border-b-2 py-3 px-3 text-xs sm:text-sm font-bold whitespace-nowrap transition ${
              activeTab === 'account'
                ? 'border-sky-500 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserIcon className="h-4 w-4" />
            Account & Access
          </button>
          <button
            onClick={() => setActiveTab('api')}
            className={`flex items-center gap-2 border-b-2 py-3 px-3 text-xs sm:text-sm font-bold whitespace-nowrap transition ${
              activeTab === 'api'
                ? 'border-sky-500 text-sky-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Key className="h-4 w-4" />
            Gemini API Key
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* TAB 1: Phoneme Dashboard */}
          {activeTab === 'phonemes' && (
            <div className="space-y-6">
              {/* Speller Overview Card */}
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border-2 border-sky-100 bg-sky-50/60 p-5">
                <div className="flex items-center gap-4">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-3xl shadow-sm border border-sky-200">
                    {profile.avatarEmoji || '🦊'}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xl font-bold text-slate-800">{profile.name}'s Phoneme Mastery</h4>
                      <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-700">
                        Age {profile.age}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {levelInfo.title} • {profile.roundsCompleted} rounds completed
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset Child Progress
                </button>
              </div>

              {/* Reset Confirm */}
              {showResetConfirm && (
                <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-amber-900 shadow-sm">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                    <h4 className="font-bold">Reset progress for {profile.name}?</h4>
                  </div>
                  <p className="mt-1 text-xs text-amber-800">
                    This will clear completed rounds, scores, phoneme bars, and confidence back to Level 1.
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => {
                        setShowResetConfirm(false);
                        onResetProfile();
                      }}
                      className="rounded-xl bg-amber-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-amber-700"
                    >
                      Yes, Reset
                    </button>
                    <button
                      onClick={() => setShowResetConfirm(false)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Level Confidence Card */}
              <div className="rounded-2xl border-2 border-indigo-200 bg-gradient-to-r from-indigo-50/80 to-purple-50/60 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-700">
                      Level Advancement Confidence
                    </span>
                    <h5 className="mt-1 text-base font-bold text-slate-800">{levelInfo.title}</h5>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold uppercase text-indigo-700">High Scores</span>
                    <div className="text-lg font-black text-indigo-950">{consecutive} / 3 Mastered</div>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full bg-indigo-500 transition-all duration-500"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-500">
                    Earn <strong>3 consecutive rounds with score ≥ 9</strong> to unlock Level {Math.min(profile.difficultyLevel + 1, 5)}.
                  </p>
                </div>
              </div>

              {/* Mastered vs Struggled Words Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Mastered Words ({profile.masteredWords?.length || 0})
                  </div>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    Spelled correctly without hints. Never repeated again!
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                    {profile.masteredWords && profile.masteredWords.length > 0 ? (
                      profile.masteredWords.map((w, idx) => (
                        <span
                          key={idx}
                          className="rounded-lg bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800"
                        >
                          {w}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs italic text-slate-400">No mastered words yet. Complete a round to start!</span>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4">
                  <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                    <AlertCircle className="h-4 w-4 text-rose-600" />
                    Review Words Queued ({profile.struggledWords.length})
                  </div>
                  <p className="text-[11px] text-rose-700 mt-0.5">
                    Missed or revealed. Will repeat until mastered!
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                    {profile.struggledWords.length > 0 ? (
                      profile.struggledWords.map((w, idx) => (
                        <span
                          key={idx}
                          className="rounded-lg bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-800"
                        >
                          {w}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs italic text-slate-400">Zero struggled words queued! Great job!</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Phoneme Mastery Progress Bars */}
              <div>
                <h5 className="text-sm font-bold text-slate-800 mb-2">Phoneme Pattern Breakdown</h5>
                {phonemeList.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">
                    Complete your first 10-word round to start tracking phonetic patterns!
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {phonemeList.slice(0, 8).map((stat) => {
                      const pct = Math.round((stat.correct / stat.attempts) * 100);
                      return (
                        <div key={stat.phoneme} className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                          <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                            <span className="capitalize">{stat.phoneme.replace(/-/g, ' ')}</span>
                            <span>{stat.correct}/{stat.attempts} ({pct}%)</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                            <div
                              className={`h-full ${pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Word History & CSV */}
          {activeTab === 'history' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h4 className="text-base font-bold text-slate-800">Spelling Attempt History</h4>
                  <p className="text-xs text-slate-500">
                    Comprehensive log of all words tested, results, and transcription accuracy
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={historyFilterSpeller}
                    onChange={(e) => setHistoryFilterSpeller(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none"
                  >
                    <option value="all">All Spellers ({profiles.length})</option>
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.avatarEmoji} {p.name}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={handleDownloadCSV}
                    disabled={filteredHistory.length === 0}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-emerald-700 disabled:opacity-50 transition"
                  >
                    <Download className="h-4 w-4" />
                    Download CSV
                  </button>
                </div>
              </div>

              {/* Stats Ribbon */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase">Words Attempted</div>
                  <div className="text-xl font-bold text-slate-800">{filteredHistory.length}</div>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3 text-center">
                  <div className="text-[11px] font-semibold text-emerald-700 uppercase">Spelled Correctly</div>
                  <div className="text-xl font-bold text-emerald-900">{totalCorrect}</div>
                </div>
                <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-3 text-center">
                  <div className="text-[11px] font-semibold text-rose-700 uppercase">Needs Practice</div>
                  <div className="text-xl font-bold text-rose-900">{totalWrong}</div>
                </div>
              </div>

              {/* History Table */}
              {loadingHistory ? (
                <div className="py-12 text-center text-slate-400">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-sky-500" />
                  <p className="mt-2 text-xs">Loading word history records...</p>
                </div>
              ) : filteredHistory.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-slate-200 py-10 text-center text-slate-400">
                  <FileSpreadsheet className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-2 text-sm font-semibold text-slate-600">No spelling history found yet</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Complete handwritten spelling rounds to populate the history table and export CSV reports.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2.5">Date</th>
                        <th className="px-3 py-2.5">Speller</th>
                        <th className="px-3 py-2.5">Target Word</th>
                        <th className="px-3 py-2.5">Written Attempt</th>
                        <th className="px-3 py-2.5">Level</th>
                        <th className="px-3 py-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredHistory.slice(0, 50).map((rec) => (
                        <tr key={rec.id} className="hover:bg-slate-50/60">
                          <td className="px-3 py-2 text-slate-500 whitespace-nowrap">
                            {new Date(rec.timestamp).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="px-3 py-2 font-semibold text-slate-800">{rec.spellerName}</td>
                          <td className="px-3 py-2 font-bold text-slate-900">{rec.word}</td>
                          <td className="px-3 py-2 font-mono text-slate-600">
                            {rec.childAttempt || '—'}
                          </td>
                          <td className="px-3 py-2">
                            <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-sky-800">
                              Lvl {rec.level}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            {rec.status === 'correct' ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                                <Check className="h-3 w-3" /> Correct
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-800">
                                <X className="h-3 w-3" /> Review
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Account & Whitelist */}
          {activeTab === 'account' && (
            <div className="space-y-6">
              {/* Current User Card */}
              <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {currentUser?.photoURL ? (
                      <img
                        src={currentUser.photoURL}
                        alt="Profile"
                        className="h-12 w-12 rounded-full border border-sky-300"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-200 text-sky-800 font-bold">
                        {currentUser?.email?.[0]?.toUpperCase() || 'U'}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-800">
                          {currentUser?.displayName || 'Google Account'}
                        </h4>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                            isAdmin
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isAdmin ? 'Master Administrator' : 'Approved Speller Account'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">{currentUser?.email}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      onSignOut();
                      onClose();
                    }}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign Out
                  </button>
                </div>
              </div>

              {/* Admin Whitelist Management */}
              {isAdmin ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-base font-bold text-slate-800 flex items-center gap-2">
                        <Shield className="h-4 w-4 text-purple-600" />
                        Approved Email Allowlist (Admin Tool)
                      </h4>
                      <p className="text-xs text-slate-500">
                        Only Google email addresses listed below are allowed to access SpellBuddy.
                      </p>
                    </div>
                  </div>

                  {/* Add email form */}
                  <form onSubmit={handleAddApprovedUser} className="flex gap-2">
                    <input
                      type="email"
                      value={newEmailInput}
                      onChange={(e) => setNewEmailInput(e.target.value)}
                      placeholder="parent-or-student@gmail.com"
                      className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:border-sky-500 focus:bg-white focus:outline-none"
                    />
                    <select
                      value={newRoleInput}
                      onChange={(e) => setNewRoleInput(e.target.value as any)}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none"
                    >
                      <option value="speller_parent">Parent / Speller</option>
                      <option value="admin">Administrator</option>
                    </select>
                    <button
                      type="submit"
                      className="flex items-center gap-1 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-700 transition"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Email
                    </button>
                  </form>

                  {whitelistMsg && (
                    <div className="rounded-xl bg-purple-50 border border-purple-200 p-2 text-xs text-purple-800">
                      {whitelistMsg}
                    </div>
                  )}

                  {/* Whitelist list */}
                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
                    {/* Master Admin Entry */}
                    <div className="flex items-center justify-between p-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-800">{MASTER_ADMIN_EMAIL}</span>
                          <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-800">
                            Primary Admin
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400">Built-in Root Administrator</span>
                      </div>
                      <span className="text-xs text-slate-400 italic">Protected</span>
                    </div>

                    {loadingApproved ? (
                      <div className="p-4 text-center text-xs text-slate-400">Loading approved emails...</div>
                    ) : (
                      approvedUsers
                        .filter((u) => u.email.toLowerCase() !== MASTER_ADMIN_EMAIL.toLowerCase())
                        .map((u) => (
                          <div key={u.email} className="flex items-center justify-between p-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-slate-800">{u.email}</span>
                                <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-800">
                                  {u.role}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400">
                                Added by {u.addedBy || 'Admin'}
                              </span>
                            </div>
                            <button
                              onClick={() => handleRemoveApprovedUser(u.email)}
                              className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                              title="Revoke access"
                            >
                              <Trash className="h-4 w-4" />
                            </button>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
                  <p className="font-semibold text-slate-700">Access Management Notice:</p>
                  <p className="mt-1">
                    Your account is approved to use SpellBuddy AI. To add another parent or child account to the allowlist, please contact the administrator (<strong>{MASTER_ADMIN_EMAIL}</strong>).
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: API Key */}
          {activeTab === 'api' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4 text-xs text-sky-900">
                <div className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 shrink-0 text-sky-600" />
                  <div>
                    <p className="font-semibold">Avoid Shared Quota Limits:</p>
                    <p className="mt-1 text-slate-600">
                      SpellBuddy provides free speech and grading out-of-the-box. You can also paste your own personal free Gemini key below for unlimited requests!
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Your Gemini API Key (AIza...)
                </label>
                <div className="relative mt-2">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3 pr-12 font-mono text-sm text-slate-800 focus:border-sky-500 focus:bg-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:text-slate-600"
                    title={showKey ? 'Hide Key' : 'Show Key'}
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                  <span>
                    Status:{' '}
                    {Boolean(getCustomApiKey()) ? (
                      <strong className="text-emerald-600">Custom Key Active</strong>
                    ) : (
                      <strong className="text-slate-600">Using Default Server Key</strong>
                    )}
                  </span>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 font-semibold text-sky-600 hover:text-sky-800"
                  >
                    Get Free Key on Google AI Studio
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>

              {testResult && (
                <div
                  className={`rounded-2xl border p-3 text-xs font-medium ${
                    testResult.success
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-rose-200 bg-rose-50 text-rose-800'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {testResult.success ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                    )}
                    <span>{testResult.message}</span>
                  </div>
                </div>
              )}

              {saveSuccess && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-800">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Settings saved successfully in your browser!</span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                {Boolean(apiKey || getCustomApiKey()) && (
                  <button
                    type="button"
                    onClick={handleClearKey}
                    className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:underline"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Clear Key
                  </button>
                )}
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={handleTestKey}
                    disabled={testing || !apiKey.trim()}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                  >
                    {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Test Key'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveKey}
                    className="rounded-xl bg-sky-500 px-4 py-2 text-xs font-bold text-white shadow hover:bg-sky-600"
                  >
                    Save Key
                  </button>
                </div>
              </div>

              {/* Voice Engine & Natural Speech Settings */}
              <div className="mt-6 rounded-2xl border-2 border-indigo-100 bg-indigo-50/50 p-4 text-xs text-slate-700">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-indigo-600 shrink-0" />
                    <span className="font-bold text-indigo-950">Spelling Spoken Voice Engine</span>
                  </div>
                  <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-bold text-indigo-800">
                    {voiceEngine === 'server_cached' ? 'Edge AvaNeural (0 Tokens)' : voiceEngine === 'device_natural' ? 'Device Neural Voice' : 'Gemini AI Voice'}
                  </span>
                </div>
                <p className="mt-1.5 text-slate-600 leading-relaxed">
                  Choose how words and example sentences are spoken during spelling rounds:
                </p>

                <div className="mt-3 space-y-2">
                  <label
                    onClick={() => {
                      setVoiceEngine('server_cached');
                      setVoiceEnginePreference('server_cached');
                    }}
                    className={`flex items-start gap-2.5 rounded-xl border p-2.5 cursor-pointer transition ${
                      voiceEngine === 'server_cached'
                        ? 'border-indigo-500 bg-white shadow-sm ring-1 ring-indigo-500/20'
                        : 'border-slate-200/80 bg-white/60 hover:bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="voiceEngine"
                      checked={voiceEngine === 'server_cached'}
                      onChange={() => {
                        setVoiceEngine('server_cached');
                        setVoiceEnginePreference('server_cached');
                      }}
                      className="mt-0.5 h-3.5 w-3.5 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <div className="font-bold text-slate-800 flex items-center gap-1.5">
                        <span>🎙️ Microsoft Edge Neural Voice (`AvaNeural` — Recommended)</span>
                        <span className="rounded bg-emerald-100 px-1.5 py-0.2 text-[9px] font-bold text-emerald-800">
                          0 AI Tokens • Pre-Cached Studio MP3
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-slate-500 leading-relaxed">
                        Plays all 600 pre-created <strong>Microsoft Edge Neural (`en-US-AvaNeural`)</strong> studio teacher recordings from bundled MP3s, Firestore (<code className="text-[10px]">/tts_cache</code>), and IndexedDB. Identical warm human voice on iPhone, iPad, Mac, and Windows.
                      </p>
                    </div>
                  </label>

                  <label
                    onClick={() => {
                      setVoiceEngine('device_natural');
                      setVoiceEnginePreference('device_natural');
                    }}
                    className={`flex items-start gap-2.5 rounded-xl border p-2.5 cursor-pointer transition ${
                      voiceEngine === 'device_natural'
                        ? 'border-indigo-500 bg-white shadow-sm ring-1 ring-indigo-500/20'
                        : 'border-slate-200/80 bg-white/60 hover:bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="voiceEngine"
                      checked={voiceEngine === 'device_natural'}
                      onChange={() => {
                        setVoiceEngine('device_natural');
                        setVoiceEnginePreference('device_natural');
                      }}
                      className="mt-0.5 h-3.5 w-3.5 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <div className="font-bold text-slate-800">🌟 Device Built-In Neural Voice</div>
                      <p className="mt-0.5 text-[11px] text-slate-500 leading-relaxed">
                        Uses your device's built-in OS speech synthesis (<strong>Ava</strong>, <strong>Samantha</strong>, <strong>Siri</strong> on iOS/Mac; <strong>Jenny</strong> on Windows; <strong>Google US</strong> on Android).
                      </p>
                    </div>
                  </label>

                  <label
                    onClick={() => {
                      setVoiceEngine('gemini_studio');
                      setVoiceEnginePreference('gemini_studio');
                    }}
                    className={`flex items-start gap-2.5 rounded-xl border p-2.5 cursor-pointer transition ${
                      voiceEngine === 'gemini_studio'
                        ? 'border-indigo-500 bg-white shadow-sm ring-1 ring-indigo-500/20'
                        : 'border-slate-200/80 bg-white/60 hover:bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="voiceEngine"
                      checked={voiceEngine === 'gemini_studio'}
                      onChange={() => {
                        setVoiceEngine('gemini_studio');
                        setVoiceEnginePreference('gemini_studio');
                      }}
                      className="mt-0.5 h-3.5 w-3.5 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <div className="font-bold text-slate-800">🤖 Gemini 2.5 Studio AI Voice</div>
                      <p className="mt-0.5 text-[11px] text-slate-500 leading-relaxed">
                        Generates high-definition audio on-demand via Gemini API using native teacher pacing (requires your Gemini API Key entered above).
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Zero-Token Word Bank & Pre-Created Neural TTS Cache Status */}
              <div className="mt-6 rounded-2xl border-2 border-emerald-100 bg-emerald-50/50 p-4 text-xs text-slate-700">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="font-bold text-emerald-950">
                      Zero-Token Word Bank &amp; Neural TTS Cache (`AvaNeural`)
                    </span>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                    600 Words Ready
                  </span>
                </div>
                <p className="mt-1.5 text-slate-600 leading-relaxed">
                  Rounds are served instantly from the built-in <strong>600-word phonics database</strong> (Levels 1–5) using <strong>0 AI tokens</strong>. All 600 words are pre-rendered with <strong>Microsoft Edge Neural TTS (`en-US-AvaNeural`)</strong> studio MP3s and cached in browser IndexedDB using <strong>0 Firestore write units</strong> to prevent quota limits.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={cachingAudio}
                    onClick={async () => {
                      setCachingAudio(true);
                      try {
                        const allWords = [
                          ...(EXPANSIVE_WORDS_BY_LEVEL[1] || []),
                          ...(EXPANSIVE_WORDS_BY_LEVEL[2] || []),
                          ...(EXPANSIVE_WORDS_BY_LEVEL[3] || []),
                          ...(EXPANSIVE_WORDS_BY_LEVEL[4] || []),
                          ...(EXPANSIVE_WORDS_BY_LEVEL[5] || []),
                        ];
                        let done = 0;
                        setTestResult({
                          success: true,
                          message: `Starting pre-cache: 0 / ${allWords.length} cached in IndexedDB...`,
                        });
                        for (let i = 0; i < allWords.length; i += 20) {
                          const batch = allWords.slice(i, i + 20);
                          const count = await prewarmRoundAudio(batch, 'Kore', 20);
                          done += count;
                          setTestResult({
                            success: true,
                            message: `Pre-caching neural audio: ${done} / ${allWords.length} cached in IndexedDB...`,
                          });
                        }
                        setTestResult({
                          success: true,
                          message: `Done! ${done} / ${allWords.length} words pre-cached in IndexedDB! Zero tokens, zero Firestore writes consumed.`,
                        });
                      } catch (err) {
                        setTestResult({
                          success: false,
                          message: `Pre-caching encountered an error: ${err instanceof Error ? err.message : String(err)}`,
                        });
                      } finally {
                        setCachingAudio(false);
                      }
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold text-white shadow-sm transition ${
                      cachingAudio
                        ? 'bg-slate-400 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    {cachingAudio ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    {cachingAudio ? 'Pre-Caching Words Audio...' : 'Pre-Cache All 600 Words into Local Storage'}
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      await clearIdbAudio();
                      setTestResult({
                        success: true,
                        message: 'Cleared local audio cache! SpellBuddy is now using your device\'s expressive Natural Neural Voice.',
                      });
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-slate-500" />
                    Clear Local Audio Cache
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-3 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 px-5 py-2 text-xs font-bold text-white hover:bg-slate-900 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
