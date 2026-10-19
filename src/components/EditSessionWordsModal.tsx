import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  X,
  Search,
  Check,
  RotateCcw,
  Shuffle,
  BookOpen,
  SlidersHorizontal,
  Play,
  CheckCircle2,
} from 'lucide-react';
import { WordItem } from '../types';
import { getAllLibraryWords, LibraryWordItem, EXPANSIVE_WORDS_BY_LEVEL } from '../wordBank';

interface EditSessionWordsModalProps {
  isOpen: boolean;
  onClose: () => void;
  words: WordItem[];
  onSaveWords: (newWords: WordItem[], startImmediately?: boolean) => void;
  currentLevel: number;
  profileName: string;
  onResetToAdaptive?: () => void;
}

export const EditSessionWordsModal: React.FC<EditSessionWordsModalProps> = ({
  isOpen,
  onClose,
  words,
  onSaveWords,
  currentLevel,
  profileName,
  onResetToAdaptive,
}) => {
  // All 600 words across levels 1-5 from the app library
  const allLibraryWords = useMemo<LibraryWordItem[]>(() => getAllLibraryWords(), []);

  // Quick lookup map by lowercase word
  const libraryMap = useMemo(() => {
    const map = new Map<string, LibraryWordItem>();
    allLibraryWords.forEach((item) => {
      map.set(item.word.toLowerCase(), item);
    });
    return map;
  }, [allLibraryWords]);

  // Working copy of 10 words for the session
  const [editedWords, setEditedWords] = useState<WordItem[]>([]);
  // Search text for each slot index (0..9)
  const [searchQueries, setSearchQueries] = useState<Record<number, string>>({});
  // Which slot's search dropdown is currently open
  const [activeDropdownIndex, setActiveDropdownIndex] = useState<number | null>(null);
  // Level filter for search dropdown (0 means all levels)
  const [levelFilter, setLevelFilter] = useState<number>(0);
  // Feedback toast message
  const [toastNote, setToastNote] = useState<string | null>(null);

  const dropdownContainerRef = useRef<HTMLDivElement | null>(null);

  // Sync editedWords with incoming words whenever modal opens
  useEffect(() => {
    if (isOpen) {
      if (words && words.length >= 10) {
        setEditedWords(words.slice(0, 10));
      } else if (words && words.length > 0) {
        // Pad to 10 if needed
        const padded = [...words];
        const lvlWords = EXPANSIVE_WORDS_BY_LEVEL[currentLevel] || EXPANSIVE_WORDS_BY_LEVEL[1] || [];
        let i = 0;
        while (padded.length < 10 && i < lvlWords.length) {
          if (!padded.some((w) => w.word.toLowerCase() === lvlWords[i].word.toLowerCase())) {
            padded.push(lvlWords[i]);
          }
          i++;
        }
        setEditedWords(padded);
      }
      setSearchQueries({});
      setActiveDropdownIndex(null);
      setLevelFilter(0);
      setToastNote(null);
    }
  }, [isOpen, words, currentLevel]);

  // Handle clicking outside the active search dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownContainerRef.current &&
        !dropdownContainerRef.current.contains(event.target as Node)
      ) {
        setActiveDropdownIndex(null);
      }
    }
    if (activeDropdownIndex !== null) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeDropdownIndex]);

  const showToast = (msg: string) => {
    setToastNote(msg);
    setTimeout(() => setToastNote(null), 3000);
  };

  // Select a word from library for slot `index`
  const handleSelectWord = (slotIndex: number, item: LibraryWordItem) => {
    setEditedWords((prev) => {
      const next = [...prev];
      next[slotIndex] = {
        word: item.word,
        phoneticBreakdown: item.phoneticBreakdown,
        phoneticSpeechCue: item.phoneticSpeechCue,
        phonemes: item.phonemes,
        exampleSentence: item.exampleSentence,
      };
      return next;
    });
    setSearchQueries((prev) => ({ ...prev, [slotIndex]: '' }));
    setActiveDropdownIndex(null);
  };

  // Randomize a single slot from current level or entire library
  const handleRandomizeSlot = (slotIndex: number) => {
    const existingWords = new Set(editedWords.map((w) => w.word.toLowerCase()));
    const pool = (EXPANSIVE_WORDS_BY_LEVEL[currentLevel] || allLibraryWords).filter(
      (w) => !existingWords.has(w.word.toLowerCase())
    );
    if (pool.length > 0) {
      const randomItem = pool[Math.floor(Math.random() * pool.length)];
      handleSelectWord(slotIndex, { ...randomItem, level: currentLevel });
      showToast(`Swapped Word #${slotIndex + 1} with "${randomItem.word}"`);
    }
  };

  // Shuffle all 10 slots with fresh words from current level
  const handleShuffleAll = () => {
    const pool = [...(EXPANSIVE_WORDS_BY_LEVEL[currentLevel] || allLibraryWords)];
    // Fisher-Yates shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const nextWords = pool.slice(0, 10).map((item) => ({
      word: item.word,
      phoneticBreakdown: item.phoneticBreakdown,
      phoneticSpeechCue: item.phoneticSpeechCue,
      phonemes: item.phonemes,
      exampleSentence: item.exampleSentence,
    }));
    setEditedWords(nextWords);
    setSearchQueries({});
    setActiveDropdownIndex(null);
    showToast(`Shuffled 10 fresh Level ${currentLevel} words!`);
  };

  // Reset to automated adaptive word selection
  const handleReset = () => {
    if (onResetToAdaptive) {
      onResetToAdaptive();
      onClose();
    } else {
      handleShuffleAll();
    }
  };

  const handleSave = (startImmediately: boolean = false) => {
    if (editedWords.length !== 10) {
      alert('Please configure all 10 words for the session.');
      return;
    }
    onSaveWords(editedWords, startImmediately);
    onClose();
  };

  // Filter library words for the currently active slot
  const currentQuery =
    activeDropdownIndex !== null ? (searchQueries[activeDropdownIndex] || '').trim().toLowerCase() : '';

  const filteredLibraryWords = useMemo(() => {
    if (activeDropdownIndex === null) return [];

    let pool = allLibraryWords;
    if (levelFilter > 0) {
      pool = pool.filter((w) => w.level === levelFilter);
    }

    if (!currentQuery) {
      // When input is empty, prioritize words from the child's current difficulty level
      return pool
        .filter((w) => (levelFilter > 0 ? true : w.level === currentLevel))
        .slice(0, 25);
    }

    const prefixMatches: LibraryWordItem[] = [];
    const substringMatches: LibraryWordItem[] = [];

    pool.forEach((item) => {
      const lower = item.word.toLowerCase();
      if (lower.startsWith(currentQuery)) {
        prefixMatches.push(item);
      } else if (lower.includes(currentQuery)) {
        substringMatches.push(item);
      }
    });

    prefixMatches.sort((a, b) => a.word.localeCompare(b.word));
    substringMatches.sort((a, b) => a.word.localeCompare(b.word));

    return [...prefixMatches, ...substringMatches].slice(0, 30);
  }, [allLibraryWords, activeDropdownIndex, currentQuery, levelFilter, currentLevel]);

  // Determine duplicate words in current selection
  const duplicateMap = useMemo(() => {
    const map = new Map<string, number[]>();
    editedWords.forEach((item, idx) => {
      const lower = item.word.toLowerCase();
      const list = map.get(lower) || [];
      list.push(idx);
      map.set(lower, list);
    });
    return map;
  }, [editedWords]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-6 backdrop-blur-sm overflow-y-auto">
      <div
        ref={dropdownContainerRef}
        className="relative flex flex-col w-full max-w-4xl max-h-[92vh] rounded-3xl border-2 border-sky-200 bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header Ribbon */}
        <div className="flex items-center justify-between border-b border-sky-100 bg-gradient-to-r from-sky-50 via-white to-indigo-50/50 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500 text-white shadow-md">
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900">
                Edit Session Words
              </h2>
              <p className="text-xs text-slate-500">
                Choose the 10 words for {profileName}&apos;s spelling round strictly from the 600-word SpellBuddy library.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            title="Close editor"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Global Toolbar & Level Filters */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-5 py-2.5 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-slate-600 mr-1 flex items-center gap-1">
              <BookOpen className="h-3.5 w-3.5 text-sky-600" />
              Library Filter:
            </span>
            <button
              type="button"
              onClick={() => setLevelFilter(0)}
              className={`rounded-lg px-2.5 py-1 font-bold transition ${
                levelFilter === 0
                  ? 'bg-sky-500 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              All Levels (600)
            </button>
            {[1, 2, 3, 4, 5].map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setLevelFilter(lvl)}
                className={`rounded-lg px-2.5 py-1 font-bold transition ${
                  levelFilter === lvl
                    ? 'bg-sky-500 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Lvl {lvl} {lvl === currentLevel && '★'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShuffleAll}
              className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 font-bold text-amber-800 hover:bg-amber-100 transition"
              title="Shuffle all 10 words with new words from Level {currentLevel}"
            >
              <Shuffle className="h-3 w-3 text-amber-600" />
              <span>Shuffle All</span>
            </button>

            {onResetToAdaptive && (
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-bold text-slate-700 hover:bg-slate-100 transition"
                title="Restore automatic adaptive word selection based on speller progress"
              >
                <RotateCcw className="h-3 w-3 text-slate-500" />
                <span>Auto-Adaptive</span>
              </button>
            )}
          </div>
        </div>

        {/* Toast Notification */}
        {toastNote && (
          <div className="mx-5 mt-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-800 shadow-sm animate-fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{toastNote}</span>
          </div>
        )}

        {/* Scrollable Word Slots Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {editedWords.map((item, index) => {
              const wordNum = index + 1;
              const isEven = wordNum % 2 === 0;
              const isDropdownOpen = activeDropdownIndex === index;
              const searchQuery = searchQueries[index] || '';
              const libraryMatch = libraryMap.get(item.word.toLowerCase());
              const wordLevel = libraryMatch ? libraryMatch.level : currentLevel;
              const duplicates = duplicateMap.get(item.word.toLowerCase()) || [];
              const isDuplicate = duplicates.length > 1;

              return (
                <div
                  key={index}
                  className={`relative rounded-2xl border-2 transition-all duration-150 p-3.5 shadow-sm ${
                    isDropdownOpen
                      ? 'border-sky-400 bg-sky-50/40 ring-2 ring-sky-200 z-30'
                      : 'border-slate-200 bg-white hover:border-sky-300'
                  }`}
                >
                  {/* Slot Header */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-xl text-xs font-black text-white shadow-xs ${
                          isEven ? 'bg-purple-600' : 'bg-sky-500'
                        }`}
                      >
                        #{wordNum}
                      </span>
                      <span className="text-xs font-bold text-slate-700">
                        Word #{wordNum}
                      </span>
                      <span className="rounded-md bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                        Lvl {wordLevel}
                      </span>
                      {isDuplicate && (
                        <span
                          className="rounded-md bg-amber-100 border border-amber-300 px-1.5 py-0.5 text-[10px] font-bold text-amber-800"
                          title="This word appears multiple times in this round"
                        >
                          Duplicate
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRandomizeSlot(index)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-100 transition"
                      title={`Swap Word #${wordNum} with another random word`}
                    >
                      <Shuffle className="h-3 w-3 text-slate-500" />
                      <span>Random</span>
                    </button>
                  </div>

                  {/* Selected Word Display Card */}
                  <div className="mb-2.5 rounded-xl border border-slate-100 bg-slate-50/70 p-2.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="text-base sm:text-lg font-black tracking-wide text-slate-900 capitalize">
                        {item.word}
                      </div>
                      <div className="text-[11px] font-mono text-sky-700 font-semibold truncate">
                        {item.phoneticBreakdown}
                      </div>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-600 italic line-clamp-2">
                      &ldquo;{item.exampleSentence}&rdquo;
                    </p>
                  </div>

                  {/* Autocomplete Search Field */}
                  <div className="relative">
                    <div className="relative flex items-center">
                      <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        value={searchQuery}
                        onFocus={() => {
                          setActiveDropdownIndex(index);
                        }}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSearchQueries((prev) => ({ ...prev, [index]: val }));
                          setActiveDropdownIndex(index);
                        }}
                        placeholder={`Search library to replace "${item.word}"...`}
                        className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-8 pr-7 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200 transition"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQueries((prev) => ({ ...prev, [index]: '' }));
                          }}
                          className="absolute right-2 text-slate-400 hover:text-slate-600"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Dropdown Options Menu */}
                    {isDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1 max-h-56 overflow-y-auto rounded-2xl border-2 border-sky-300 bg-white p-1.5 shadow-2xl z-50 animate-in fade-in zoom-in-95">
                        <div className="px-2 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 flex items-center justify-between">
                          <span>
                            {searchQuery ? `Library Matches for "${searchQuery}"` : `Suggested Level ${levelFilter || currentLevel} Words`}
                          </span>
                          <span className="text-[9px] text-sky-600 font-bold lowercase">
                            {filteredLibraryWords.length} available
                          </span>
                        </div>

                        {filteredLibraryWords.length === 0 ? (
                          <div className="p-3 text-center text-xs text-slate-500">
                            <p className="font-semibold text-rose-600">No matching library word</p>
                            <p className="mt-0.5 text-[11px] text-slate-400">
                              Options are strictly limited to the 600 words in SpellBuddy&apos;s verified educational bank.
                            </p>
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-100">
                            {filteredLibraryWords.map((libWord) => {
                              const isCurrentSlot = item.word.toLowerCase() === libWord.word.toLowerCase();
                              const otherSlotIndex = editedWords.findIndex(
                                (w, i) => i !== index && w.word.toLowerCase() === libWord.word.toLowerCase()
                              );

                              return (
                                <button
                                  key={`${libWord.level}-${libWord.word}`}
                                  type="button"
                                  onClick={() => handleSelectWord(index, libWord)}
                                  className={`w-full text-left p-2 rounded-xl transition flex items-center justify-between gap-2 ${
                                    isCurrentSlot
                                      ? 'bg-sky-50 text-sky-950 font-bold'
                                      : 'hover:bg-slate-50 text-slate-800'
                                  }`}
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-black text-sm capitalize">
                                        {libWord.word}
                                      </span>
                                      <span className="rounded-md bg-slate-100 px-1 py-0.2 text-[9px] font-bold text-slate-600">
                                        Lvl {libWord.level}
                                      </span>
                                      {otherSlotIndex !== -1 && (
                                        <span className="rounded-md bg-amber-50 text-amber-700 px-1 py-0.2 text-[9px] font-semibold">
                                          in #{otherSlotIndex + 1}
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-slate-500 truncate italic">
                                      {libWord.exampleSentence}
                                    </p>
                                  </div>
                                  {isCurrentSlot ? (
                                    <Check className="h-4 w-4 text-sky-600 shrink-0" />
                                  ) : (
                                    <span className="text-[10px] font-bold text-sky-600 hover:underline shrink-0">
                                      Select
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-3.5">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span className="font-bold text-slate-700">10 of 10 Words Configured</span>
            <span className="hidden sm:inline text-slate-400">• Ready for round</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSave(false)}
              className="rounded-xl border border-sky-300 bg-sky-50 px-4 py-2 text-xs font-bold text-sky-800 hover:bg-sky-100 transition shadow-xs"
            >
              Save Words
            </button>
            <button
              type="button"
              onClick={() => handleSave(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-sky-500 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-sky-600 hover:scale-[1.02] active:scale-[0.98] transition"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Save &amp; Start Round</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
