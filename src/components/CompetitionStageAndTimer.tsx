import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Music,
  Pause,
  Play,
  RotateCcw,
  Square,
  Upload,
  Volume2,
  AlertTriangle,
} from 'lucide-react';
import { ClassCode, ParticipantRecord } from '../types.ts';

// Exact 4 Stage Performance Categories in the order specified:
// 1. Qirat (shuru me), 2. Naat, 3. Speech (Speaker), 4. Table Topic (last me)
// Excludes Marshal, Evolution, Aah Counter, Grammarian, and Class Officers.
export const STAGE_PROGRAM_ORDER = [
  'Qirat',
  'Naat',
  'Speech',
  'Table Topic',
] as const;

export function getProgramRoleLabel(categoryName: string): string {
  switch (categoryName) {
    case 'Qirat':
      return '• Qirat • Reciter';
    case 'Naat':
      return '• Naat • Naat Khawan';
    case 'Speech':
      return '• Speech • Speaker';
    case 'Table Topic':
      return '• Table Topic • Speaker';
    case 'Evolution':
      return '• Evolution • Evaluator';
    case 'Aah Counter':
      return '• Aah Counter';
    case 'Marshal':
      return '• Marshal';
    case 'Grammarian':
      return '• Grammarian';
    default:
      return categoryName;
  }
}

interface CompetitionStageAndTimerProps {
  participants: ParticipantRecord[];
  lockedClass?: ClassCode | null;
  defaultClassFilter?: 'ALL' | ClassCode;
  activeClassFilter?: 'ALL' | ClassCode;
  allowClassSwitch?: boolean;
  titlePrefix?: string;
  title?: string;
}

const VALID_CLASSES: ClassCode[] = ['U1', 'U2', 'U3', 'U4', 'U5', 'U6'];

const TIMER_PRESETS: Array<{
  label: string;
  totalMin: number;
  warnMin: number;
}> = [
  { label: 'Qirat', totalMin: 3, warnMin: 2 },
  { label: 'Speech', totalMin: 5, warnMin: 3 },
  { label: 'Naat', totalMin: 5, warnMin: 3 },
  { label: 'Table Topic', totalMin: 2, warnMin: 1 },
  { label: 'Evolution', totalMin: 3, warnMin: 2 },
];

export const CompetitionStageAndTimer: React.FC<
  CompetitionStageAndTimerProps
> = ({
  participants,
  lockedClass = null,
  defaultClassFilter = 'ALL',
  activeClassFilter,
  allowClassSwitch,
  titlePrefix,
  title,
}) => {
  const effectiveLockedClass =
    allowClassSwitch === false && activeClassFilter && activeClassFilter !== 'ALL'
      ? activeClassFilter
      : lockedClass;

  const [selectedClass, setSelectedClass] = useState<'ALL' | ClassCode>(
    effectiveLockedClass || activeClassFilter || defaultClassFilter
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timerCollapsed, setTimerCollapsed] = useState(false);

  // Sync if lockedClass or activeClassFilter changes
  useEffect(() => {
    if (effectiveLockedClass) {
      setSelectedClass(effectiveLockedClass);
    } else if (activeClassFilter) {
      setSelectedClass(activeClassFilter);
    }
  }, [effectiveLockedClass, activeClassFilter]);

  // Filter participants to ONLY the 4 stage performance categories (Qirat -> Naat -> Speech -> Table Topic)
  // and sort strictly in that order
  const stagePerformers = useMemo(() => {
    const filtered = participants.filter((p) => {
      if (selectedClass !== 'ALL' && p.classCode !== selectedClass) {
        return false;
      }
      return STAGE_PROGRAM_ORDER.includes(
        p.categoryName as (typeof STAGE_PROGRAM_ORDER)[number]
      );
    });

    return [...filtered].sort((a, b) => {
      const orderA = STAGE_PROGRAM_ORDER.indexOf(
        a.categoryName as (typeof STAGE_PROGRAM_ORDER)[number]
      );
      const orderB = STAGE_PROGRAM_ORDER.indexOf(
        b.categoryName as (typeof STAGE_PROGRAM_ORDER)[number]
      );
      if (orderA !== orderB) return orderA - orderB;
      if (a.classCode !== b.classCode)
        return a.classCode.localeCompare(b.classCode);
      return a.id - b.id;
    });
  }, [participants, selectedClass]);

  // Reset slide index when filter changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [selectedClass, stagePerformers.length]);

  const activePerformer =
    stagePerformers.length > 0
      ? stagePerformers[currentIndex % stagePerformers.length]
      : null;

  const handleNextPerformer = () => {
    if (stagePerformers.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % stagePerformers.length);
  };

  const handlePrevPerformer = () => {
    if (stagePerformers.length === 0) return;
    setCurrentIndex(
      (prev) => (prev - 1 + stagePerformers.length) % stagePerformers.length
    );
  };

  // =========================================================================
  // COMPETITION TIMER & ALARM STATE
  // =========================================================================
  const [totalMinInput, setTotalMinInput] = useState<number>(5);
  const [warnMinInput, setWarnMinInput] = useState<number>(3);
  const [activePresetLabel, setActivePresetLabel] = useState<string>('Speech');
  const [remainingSeconds, setRemainingSeconds] = useState<number>(5 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [warningTriggered, setWarningTriggered] = useState<boolean>(false);
  const [alarmRinging, setAlarmRinging] = useState<boolean>(false);
  const [isTestingAudio, setIsTestingAudio] = useState<boolean>(false);

  // Custom uploaded Naat / Alarm audio
  const [customAudioUrl, setCustomAudioUrl] = useState<string | null>(null);
  const [customAudioName, setCustomAudioName] = useState<string>(
    'Built-in naat tune'
  );

  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const synthIntervalRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const totalSecondsConfigured = Math.max(10, Math.round(totalMinInput * 60));
  const elapsedSeconds = Math.max(
    0,
    totalSecondsConfigured - remainingSeconds
  );
  const warningThresholdSeconds = Math.max(0, Math.round(warnMinInput * 60));

  // Web Audio API synthesizer for Built-in Naat / Spiritual Chime Tune
  const stopAllAudio = () => {
    if (synthIntervalRef.current) {
      window.clearInterval(synthIntervalRef.current);
      synthIntervalRef.current = null;
    }
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.currentTime = 0;
    }
    setIsTestingAudio(false);
  };

  const playMelodyOnce = (isWarningBeep = false) => {
    try {
      const AudioCtx =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const notes = isWarningBeep
        ? [523.25, 659.25, 783.99] // C5 - E5 - G5 gentle warning chime
        : [440, 493.88, 523.25, 587.33, 659.25, 587.33, 523.25, 440]; // Melodic Hijaz/spiritual cadence

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.24);

        gain.gain.setValueAtTime(0.001, ctx.currentTime + idx * 0.24);
        gain.gain.exponentialRampToValueAtTime(
          0.22,
          ctx.currentTime + idx * 0.24 + 0.05
        );
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          ctx.currentTime + idx * 0.24 + 0.22
        );

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + idx * 0.24);
        osc.stop(ctx.currentTime + idx * 0.24 + 0.23);
      });
    } catch {
      // Ignore audio context autoplay restrictions if any
    }
  };

  const triggerAlarmAudio = (loop = true) => {
    stopAllAudio();
    if (customAudioUrl && audioElRef.current) {
      audioElRef.current.loop = loop;
      audioElRef.current.play().catch(() => {
        playMelodyOnce(false);
      });
      return;
    }
    playMelodyOnce(false);
    if (loop) {
      synthIntervalRef.current = window.setInterval(() => {
        playMelodyOnce(false);
      }, 2100);
    }
  };

  useEffect(() => {
    return () => {
      stopAllAudio();
    };
  }, []);

  // Countdown tick effect
  useEffect(() => {
    if (!isRunning) return;

    const timer = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          setAlarmRinging(true);
          triggerAlarmAudio(true);
          return 0;
        }
        const nextRemaining = prev - 1;
        const nextElapsed = totalSecondsConfigured - nextRemaining;

        // Check if warning minute is reached (either elapsed == warnMin OR remaining == warnMin)
        if (
          !warningTriggered &&
          warningThresholdSeconds > 0 &&
          (nextElapsed === warningThresholdSeconds ||
            nextRemaining === warningThresholdSeconds)
        ) {
          setWarningTriggered(true);
          playMelodyOnce(true);
        }
        return nextRemaining;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [
    isRunning,
    totalSecondsConfigured,
    warningThresholdSeconds,
    warningTriggered,
  ]);

  const handleStartPause = () => {
    if (alarmRinging) {
      setAlarmRinging(false);
      stopAllAudio();
    }
    if (remainingSeconds === 0) {
      setRemainingSeconds(Math.max(10, Math.round(totalMinInput * 60)));
      setWarningTriggered(false);
    }
    setIsRunning((prev) => !prev);
  };

  const handleResetTimer = () => {
    setIsRunning(false);
    setAlarmRinging(false);
    setWarningTriggered(false);
    stopAllAudio();
    setRemainingSeconds(Math.max(10, Math.round(totalMinInput * 60)));
  };

  const handleStopTimer = () => {
    setIsRunning(false);
    setAlarmRinging(false);
    setWarningTriggered(false);
    stopAllAudio();
    setRemainingSeconds(Math.max(10, Math.round(totalMinInput * 60)));
  };

  const handleSelectPreset = (preset: {
    label: string;
    totalMin: number;
    warnMin: number;
  }) => {
    setIsRunning(false);
    setAlarmRinging(false);
    setWarningTriggered(false);
    stopAllAudio();
    setActivePresetLabel(preset.label);
    setTotalMinInput(preset.totalMin);
    setWarnMinInput(preset.warnMin);
    setRemainingSeconds(preset.totalMin * 60);
  };

  const handleTotalMinChange = (val: number) => {
    const safeMin = Math.max(1, Math.min(120, val || 1));
    setTotalMinInput(safeMin);
    if (!isRunning) {
      setRemainingSeconds(safeMin * 60);
      setWarningTriggered(false);
    }
  };

  const handleWarnMinChange = (val: number) => {
    const safeWarn = Math.max(0, Math.min(totalMinInput, val || 0));
    setWarnMinInput(safeWarn);
    setWarningTriggered(false);
  };

  const handleTestAudio = () => {
    if (isTestingAudio || alarmRinging) {
      stopAllAudio();
      setAlarmRinging(false);
      return;
    }
    setIsTestingAudio(true);
    if (customAudioUrl && audioElRef.current) {
      audioElRef.current.loop = false;
      audioElRef.current.play().catch(() => {});
      setTimeout(() => setIsTestingAudio(false), 4500);
    } else {
      playMelodyOnce(false);
      setTimeout(() => setIsTestingAudio(false), 2100);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const isInWarningZone =
    warningTriggered ||
    (warningThresholdSeconds > 0 &&
      remainingSeconds > 0 &&
      remainingSeconds <=
        Math.min(
          warningThresholdSeconds,
          totalSecondsConfigured - warningThresholdSeconds
        ));

  return (
    <div className="space-y-3">
      {/* Hidden audio element for custom uploaded Naat / Alarm */}
      {customAudioUrl && <audio ref={audioElRef} src={customAudioUrl} />}

      {/* Top Bar: Class Selector for Stage Showcase + Program Order Pill */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-[#F3D068]">
            {title ||
              titlePrefix ||
              (effectiveLockedClass
                ? `Class ${effectiveLockedClass} Live Stage & Alarm`
                : 'ILM Live Competition Stage & Timer')}
          </span>
          <span className="hidden sm:inline text-xs text-neutral-400">
            • Order: 1. Qirat • 2. Naat • 3. Speech • 4. Table Topic
          </span>
        </div>

        {!effectiveLockedClass && (
          <div className="flex flex-wrap items-center gap-1 bg-[#0E1118] p-1 rounded-xl border border-neutral-800">
            <button
              type="button"
              onClick={() => setSelectedClass('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedClass === 'ALL'
                  ? 'bg-[#EAB308] text-neutral-950'
                  : 'text-neutral-300 hover:text-white'
              }`}
            >
              All
            </button>
            {VALID_CLASSES.map((cls) => (
              <button
                key={cls}
                type="button"
                onClick={() => setSelectedClass(cls)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedClass === cls
                    ? 'bg-[#EAB308] text-neutral-950'
                    : 'text-neutral-300 hover:text-white'
                }`}
              >
                {cls}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Stage Container matching Screenshot */}
      <div className="relative w-full min-h-[480px] sm:min-h-[540px] lg:min-h-[580px] rounded-2xl overflow-hidden border border-neutral-800/90 bg-[#0B0D13] shadow-2xl flex flex-col justify-end">
        {/* Background Candidate Full-Stage Portrait */}
        {activePerformer ? (
          <>
            <img
              src={activePerformer.photoUrl}
              alt={activePerformer.fullName}
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-cover object-top transition-all duration-500"
            />
            {/* Cinematic Bottom & Side Gradients so text and timer pop cleanly */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#07080C] via-[#07080C]/25 to-transparent" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#07080C]/65 via-transparent to-[#07080C]/75" />
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-gradient-to-b from-[#0E1118] to-[#07080C]">
            <p className="font-display text-2xl font-bold text-[#F3D068]">
              No Stage Performers Registered Yet
            </p>
            <p className="text-sm text-neutral-400 mt-2 max-w-md">
              Add candidates in Qirat, Naat, Speech, or Table Topic to display their photo and program on this class stage.
            </p>
          </div>
        )}

        {/* FLOATING / SIDE-DOCKED COMPETITION TIMER & ALARM WIDGET */}
        {timerCollapsed ? (
          <button
            type="button"
            onClick={() => setTimerCollapsed(false)}
            title="Click to open full Competition Timer controls"
            className={`z-20 m-4 sm:m-0 sm:absolute sm:top-4 sm:right-4 self-end inline-flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-[#0F1117]/95 backdrop-blur-xl border transition-all duration-300 cursor-pointer group ${
              alarmRinging
                ? 'border-red-500 bg-red-950/90 shadow-[0_0_30px_rgba(239,68,68,0.55)] animate-pulse'
                : isInWarningZone
                ? 'border-amber-400 bg-amber-950/90 shadow-[0_0_20px_rgba(245,158,11,0.35)]'
                : 'border-[#EAB308]/50 hover:border-[#EAB308] shadow-2xl'
            }`}
          >
            <ChevronLeft className="w-4 h-4 text-neutral-400 group-hover:text-white transition-colors" />
            <Clock
              className={`w-4 h-4 ${
                alarmRinging
                  ? 'text-red-300'
                  : isInWarningZone
                  ? 'text-amber-300'
                  : 'text-[#FACC15]'
              }`}
            />
            <span
              className={`font-mono-tabular text-2xl sm:text-3xl font-extrabold tracking-tight ${
                alarmRinging
                  ? 'text-red-300'
                  : isInWarningZone
                  ? 'text-amber-300'
                  : 'text-[#FACC15]'
              }`}
            >
              {formatTime(remainingSeconds)}
            </span>
          </button>
        ) : (
          <div
            className={`z-20 m-4 sm:m-6 sm:absolute sm:top-4 sm:right-4 transition-all duration-300 w-full max-w-[310px] sm:w-[305px] rounded-2xl bg-[#0F1117]/95 backdrop-blur-xl border ${
              alarmRinging
                ? 'border-red-500 shadow-[0_0_35px_rgba(239,68,68,0.45)]'
                : isInWarningZone
                ? 'border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.3)]'
                : 'border-neutral-800/90 shadow-2xl'
            } p-4 text-white self-end`}
          >
            {/* Timer Header */}
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#EAB308]" />
                <span className="font-semibold text-sm text-white tracking-tight">
                  Competition Timer
                </span>
              </div>
              <button
                type="button"
                onClick={() => setTimerCollapsed(true)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white text-[11px] border border-neutral-800 transition-colors cursor-pointer"
                title="Move timer to side (Show time only)"
              >
                <span>Side</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Digital Countdown Screen */}
            <div
              className={`rounded-xl p-4 text-center transition-colors border ${
                alarmRinging
                  ? 'bg-red-950/80 border-red-500/70 animate-pulse'
                  : isInWarningZone
                  ? 'bg-amber-950/70 border-amber-500/60'
                  : 'bg-[#262114]/90 border-[#EAB308]/20'
              }`}
            >
              <div
                className={`font-mono-tabular text-4xl sm:text-5xl font-extrabold tracking-tight ${
                  alarmRinging
                    ? 'text-red-300'
                    : isInWarningZone
                    ? 'text-amber-300'
                    : 'text-[#FACC15]'
                }`}
              >
                {formatTime(remainingSeconds)}
              </div>
              <div className="text-xs font-medium text-[#EAB308] mt-1">
                {alarmRinging ? (
                  <span className="text-red-300 font-bold uppercase tracking-wider">
                    🔔 Time Up! Alarm Ringing
                  </span>
                ) : isInWarningZone ? (
                  <span className="text-amber-300 font-semibold flex items-center justify-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Warning Reached ({warnMinInput} min)
                  </span>
                ) : (
                  <span>Warning at {warnMinInput} min</span>
                )}
              </div>

              {/* Elapsed Time & Remaining Time Bar */}
              <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-neutral-300 font-mono-tabular">
                <span>Elapsed: {formatTime(elapsedSeconds)}</span>
                <span>Left: {formatTime(remainingSeconds)}</span>
              </div>
            </div>

            {/* Start / Reset / Stop Controls */}
            <div className="flex items-center gap-2 mt-3.5">
              <button
                type="button"
                onClick={handleStartPause}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-[#EAB308] hover:bg-[#FACC15] text-neutral-950 font-bold text-xs shadow transition-all cursor-pointer"
              >
                {isRunning ? (
                  <>
                    <Pause className="w-3.5 h-3.5 fill-current" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Start</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleResetTimer}
                className="p-2.5 rounded-xl bg-[#181B24] hover:bg-[#222734] text-neutral-200 border border-neutral-700/80 transition-colors cursor-pointer"
                title="Reset Timer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleStopTimer}
                className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3.5 rounded-xl bg-[#4C1D24] hover:bg-[#63242D] text-red-200 border border-red-800/60 font-semibold text-xs transition-colors cursor-pointer"
              >
                <Square className="w-3 h-3 fill-current" />
                <span>Stop</span>
              </button>
            </div>

            {/* Category Preset Pills */}
            <div className="flex flex-wrap items-center gap-1.5 mt-3.5">
              {TIMER_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer border ${
                    activePresetLabel === preset.label
                      ? 'bg-[#1F2433] text-[#FACC15] border-[#EAB308]/60'
                      : 'bg-[#151821] text-neutral-300 border-neutral-800 hover:text-white'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Total (min) & Warning at (min) Inputs */}
            <div className="grid grid-cols-2 gap-2.5 mt-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-300 mb-1">
                  Total (min)
                </label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={totalMinInput}
                  onChange={(e) =>
                    handleTotalMinChange(Number(e.target.value))
                  }
                  className="w-full px-3 py-2 rounded-xl bg-[#141720] border border-neutral-800 text-xs font-mono-tabular text-white focus:border-[#EAB308] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-neutral-300 mb-1">
                  Warning at (min)
                </label>
                <input
                  type="number"
                  min={0}
                  max={totalMinInput}
                  value={warnMinInput}
                  onChange={(e) =>
                    handleWarnMinChange(Number(e.target.value))
                  }
                  className="w-full px-3 py-2 rounded-xl bg-[#141720] border border-neutral-800 text-xs font-mono-tabular text-white focus:border-[#EAB308] focus:outline-none"
                />
              </div>
            </div>

            {/* Built-in Naat Tune / Test / Upload Naat Footer */}
            <div className="mt-3.5 pt-3 border-t border-neutral-800/90 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-neutral-400 min-w-0">
                <Music className="w-3.5 h-3.5 text-[#EAB308] shrink-0" />
                <span className="truncate text-[11px]" title={customAudioName}>
                  {customAudioName}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleTestAudio}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                    isTestingAudio || alarmRinging
                      ? 'bg-[#EAB308] text-neutral-950'
                      : 'bg-transparent hover:bg-neutral-800 text-neutral-200'
                  }`}
                >
                  {isTestingAudio || alarmRinging ? (
                    <span className="inline-flex items-center gap-1">
                      <Volume2 className="w-3 h-3" /> Stop
                    </span>
                  ) : (
                    'Test'
                  )}
                </button>
                <label className="px-2.5 py-1 rounded-lg bg-[#161923] hover:bg-[#1F2432] text-neutral-200 border border-neutral-700/80 text-[11px] font-semibold cursor-pointer inline-flex items-center gap-1">
                  <Upload className="w-3 h-3 text-[#EAB308]" />
                  <span>Upload naat</span>
                  <input
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const url = URL.createObjectURL(file);
                        setCustomAudioUrl(url);
                        setCustomAudioName(file.name);
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {/* BOTTOM OVERLAY: CANDIDATE CLASS PILL, PROGRAM BADGE, NAME & ARROWS */}
        {activePerformer && (
          <div className="relative z-10 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2.5">
                {/* Yellow Class Pill (e.g., U6) */}
                <span className="px-3 py-1 rounded-full bg-[#EAB308] text-neutral-950 font-extrabold text-xs tracking-wide shadow">
                  {activePerformer.classCode}
                </span>
                {/* Program / Category Pill */}
                <span className="px-3.5 py-1 rounded-full bg-white/15 backdrop-blur-md text-white font-semibold text-xs border border-white/20">
                  {getProgramRoleLabel(activePerformer.categoryName)}
                </span>
                {activePerformer.admissionNo && (
                  <span className="px-2.5 py-0.5 rounded-full bg-black/50 backdrop-blur-md text-neutral-300 font-mono-tabular text-[11px] border border-white/10">
                    ID: {activePerformer.admissionNo}
                  </span>
                )}
              </div>

              {/* Candidate Name */}
              <h2 className="font-display text-3xl sm:text-5xl font-bold text-white tracking-tight drop-shadow-lg">
                {activePerformer.fullName}
              </h2>

              {(activePerformer.ownTopic ||
                activePerformer.shortDescription) && (
                <p className="text-xs sm:text-sm text-neutral-200 mt-1.5 max-w-xl drop-shadow">
                  {activePerformer.ownTopic
                    ? `Topic: "${activePerformer.ownTopic}"`
                    : activePerformer.shortDescription}
                </p>
              )}

              {/* Carousel Indicator Dots */}
              <div className="flex items-center gap-1.5 mt-4 flex-wrap">
                {stagePerformers.map((perf, idx) => {
                  const isCurrent =
                    idx === currentIndex % stagePerformers.length;
                  return (
                    <button
                      key={perf.id}
                      type="button"
                      onClick={() => setCurrentIndex(idx)}
                      aria-label={`Show ${perf.fullName} (${perf.categoryName})`}
                      title={`${perf.fullName} • ${perf.categoryName} (${perf.classCode})`}
                      className={`h-1.5 rounded-full transition-all cursor-pointer ${
                        isCurrent
                          ? 'w-7 bg-[#EAB308]'
                          : 'w-1.5 bg-white/35 hover:bg-white/60'
                      }`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Bottom-Right Prev / Next Navigation Buttons */}
            <div className="flex items-center gap-2.5 self-end">
              <span className="text-xs font-mono-tabular text-neutral-300 mr-1 bg-black/50 px-2.5 py-1 rounded-lg border border-white/10">
                {(currentIndex % stagePerformers.length) + 1} /{' '}
                {stagePerformers.length}
              </span>
              <button
                type="button"
                onClick={handlePrevPerformer}
                aria-label="Previous performer"
                className="w-10 h-10 rounded-full bg-black/65 hover:bg-black/85 text-white border border-white/15 flex items-center justify-center transition-all cursor-pointer shadow-lg"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={handleNextPerformer}
                aria-label="Next performer"
                className="w-10 h-10 rounded-full bg-black/65 hover:bg-black/85 text-white border border-white/15 flex items-center justify-center transition-all cursor-pointer shadow-lg"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
