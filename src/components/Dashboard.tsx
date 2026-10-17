import React, { useState } from 'react';
import {
  Award,
  TrendingUp,
  AlertCircle,
  RotateCcw,
  Sparkles,
  Users,
  Star,
  CheckCircle2,
  ShieldAlert,
  Edit3,
} from 'lucide-react';
import { KidProfile, PhonemeStat } from '../types';
import { LEVEL_DESCRIPTIONS } from '../profileManager';

interface DashboardProps {
  profile: KidProfile;
  onResetProfile: () => void;
  onOpenProfileManager?: () => void;
  onEditProfile?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  profile,
  onResetProfile,
  onOpenProfileManager,
  onEditProfile,
}) => {
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const phonemeList = (Object.values(profile.phonemeMastery || {}) as PhonemeStat[]).sort(
    (a, b) => b.attempts - a.attempts
  );

  const levelInfo = LEVEL_DESCRIPTIONS[profile.difficultyLevel] || {
    title: `Level ${profile.difficultyLevel}`,
    subtitle: 'Adaptive grade-level spelling',
    grade: 'Grade-level',
  };

  const consecutive = profile.consecutiveHighScores || 0;
  const progressPct = Math.min(Math.round((consecutive / 3) * 100), 100);

  return (
    <div className="space-y-6">
      {/* Active Speller Profile Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border-2 border-sky-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-50 text-3xl shadow-inner border border-sky-100">
            {profile.avatarEmoji || '🦊'}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-slate-800">{profile.name}'s Dashboard</h2>
              <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-bold text-sky-700">
                Age {profile.age}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              {levelInfo.title} • {profile.roundsCompleted} total rounds completed
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onEditProfile && (
            <button
              onClick={onEditProfile}
              className="flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-2 text-xs font-bold text-sky-800 transition hover:bg-sky-100"
            >
              <Edit3 className="h-4 w-4 text-sky-600" />
              Edit Profile
            </button>
          )}

          {onOpenProfileManager && (
            <button
              onClick={onOpenProfileManager}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
            >
              <Users className="h-4 w-4 text-slate-600" />
              Switch Speller
            </button>
          )}

          <button
            onClick={() => setShowResetConfirm(true)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 transition hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200"
          >
            <RotateCcw className="h-4 w-4" />
            Reset Progress
          </button>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-amber-900 shadow-md">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="h-5 w-5 text-amber-600" />
            <h3 className="font-bold">Reset progress for {profile.name}?</h3>
          </div>
          <p className="mt-1 text-xs text-amber-800">
            This will reset completed rounds, recent scores, phoneme progress bars, and level confidence back to Level 1.
            The child's name and avatar will remain intact.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => {
                setShowResetConfirm(false);
                onResetProfile();
              }}
              className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700"
            >
              Yes, Reset Progress
            </button>
            <button
              onClick={() => setShowResetConfirm(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Level Mastery Confidence Card */}
      <div className="rounded-3xl border-2 border-indigo-200 bg-gradient-to-r from-indigo-50/80 via-purple-50/50 to-sky-50/80 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
                Confidence-Based Advancement
              </span>
              <span className="text-xs font-semibold text-slate-500">
                {levelInfo.grade}
              </span>
            </div>
            <h3 className="mt-1.5 text-xl font-bold text-slate-800">
              {levelInfo.title}
            </h3>
            <p className="mt-0.5 text-xs text-slate-600">
              {levelInfo.subtitle}
            </p>
          </div>

          <div className="text-right">
            <div className="text-xs font-bold uppercase tracking-wider text-indigo-700">
              Mastery Confidence
            </div>
            <div className="text-2xl font-black text-indigo-950">
              {consecutive} / 3 Rounds Mastered
            </div>
          </div>
        </div>

        {/* 3 Milestone Stars Indicator */}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[1, 2, 3].map((step) => {
            const isAchieved = consecutive >= step;
            const isNext = consecutive === step - 1;

            return (
              <div
                key={step}
                className={`flex items-center gap-3 rounded-2xl border-2 p-3.5 transition ${
                  isAchieved
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-900 shadow-sm'
                    : isNext
                    ? 'border-indigo-300 bg-white text-indigo-900 shadow-sm'
                    : 'border-slate-200 bg-white/60 text-slate-400'
                }`}
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    isAchieved
                      ? 'bg-emerald-500 text-white'
                      : isNext
                      ? 'bg-indigo-500 text-white'
                      : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  {isAchieved ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <Star className="h-5 w-5" />
                  )}
                </div>
                <div className="text-xs">
                  <div className="font-bold">
                    {step === 3 ? 'Level Up Promotion!' : `Mastered Round #${step}`}
                  </div>
                  <div className="text-[11px] opacity-80">
                    {isAchieved
                      ? 'Completed (Score 9+)'
                      : step === 3
                      ? profile.difficultyLevel >= 5
                        ? 'Max Level Reached!'
                        : `Unlocks Level ${profile.difficultyLevel + 1}`
                      : 'Requires Score 9+'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs font-semibold text-slate-500">
            <span>Promotion Progress</span>
            <span>{progressPct}% Confidence</span>
          </div>
          <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full bg-indigo-500 transition-all duration-700"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            SpellBuddy AI ensures solid mastery by requiring <strong>3 consecutive high-scoring rounds (9/10 or 10/10)</strong> before moving up to the next grade level.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-5 shadow-sm">
          <div className="flex items-center gap-3 text-amber-700">
            <Award className="h-7 w-7 text-amber-500" />
            <span className="text-sm font-semibold uppercase tracking-wider">
              Current Grade Level
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-900">
            Level {profile.difficultyLevel}
          </p>
          <p className="mt-1 text-xs text-amber-700">
            {levelInfo.grade}
          </p>
        </div>

        <div className="rounded-2xl border-2 border-sky-200 bg-sky-50 p-5 shadow-sm">
          <div className="flex items-center gap-3 text-sky-700">
            <TrendingUp className="h-7 w-7 text-sky-500" />
            <span className="text-sm font-semibold uppercase tracking-wider">
              Rounds Completed
            </span>
          </div>
          <p className="mt-2 text-3xl font-bold text-sky-900">
            {profile.roundsCompleted}
          </p>
          <p className="mt-1 text-xs text-sky-700">
            Recent scores:{' '}
            {profile.recentScores.length > 0
              ? profile.recentScores.map((s) => `${s}/10`).join(', ')
              : 'No rounds graded yet'}
          </p>
        </div>

        <div className="rounded-2xl border-2 border-rose-200 bg-rose-50 p-5 shadow-sm">
          <div className="flex items-center gap-3 text-rose-700">
            <AlertCircle className="h-7 w-7 text-rose-500" />
            <span className="text-sm font-semibold uppercase tracking-wider">
              Words in Practice Bank
            </span>
          </div>
          <p className="mt-2 text-3xl font-bold text-rose-900">
            {profile.struggledWords.length}
          </p>
          <p className="mt-1 text-xs text-rose-700">
            Repeated randomly in upcoming rounds until mastered
          </p>
        </div>
      </div>

      {/* Struggled Words Queue */}
      <div className="rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800">
          <Sparkles className="h-5 w-5 text-amber-500" />
          Words Queued for Review Next Round
        </h3>
        {profile.struggledWords.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            No tricky words right now! Any word missed on paper or revealed during a round will show up here.
          </p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {profile.struggledWords.map((word) => (
              <span
                key={word}
                className="rounded-full border border-rose-200 bg-rose-50 px-4 py-1.5 text-sm font-semibold text-rose-700"
              >
                {word}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Phoneme Mastery Progress */}
      <div className="rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h3 className="text-lg font-bold text-slate-800">
            Phoneme & Sound Pattern Mastery
          </h3>
          <p className="text-sm text-slate-500">
            Tracks how well {profile.name} spells specific vowel teams, blends, and sound patterns over time
          </p>
        </div>

        {phonemeList.length === 0 ? (
          <div className="mt-6 rounded-xl bg-slate-50 p-8 text-center text-slate-500">
            Complete and grade your first 10-word round to see phoneme mastery bars here!
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {phonemeList.map((stat) => {
              const pct =
                stat.attempts > 0
                  ? Math.round((stat.correct / stat.attempts) * 100)
                  : 0;
              const barColor =
                pct >= 80
                  ? 'bg-emerald-500'
                  : pct >= 50
                  ? 'bg-amber-500'
                  : 'bg-rose-500';

              return (
                <div
                  key={stat.phoneme}
                  className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                >
                  <div className="flex items-center justify-between text-sm font-bold text-slate-700">
                    <span className="rounded bg-white px-2 py-0.5 font-mono text-sky-700 shadow-sm">
                      /{stat.phoneme}/
                    </span>
                    <span>
                      {pct}% ({stat.correct}/{stat.attempts})
                    </span>
                  </div>
                  <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full transition-all duration-500 ${barColor}`}
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
  );
};
