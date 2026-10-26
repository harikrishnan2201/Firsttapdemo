import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MousePointerClick } from 'lucide-react';
import { LanguageCode, Step, Lesson } from './types';
import { voiceManager } from './voice';

export interface DemoRunnerOverlayProps {
  language: LanguageCode;
  lesson: Lesson;
  containerRef: React.RefObject<HTMLDivElement | null>;
  isActive: boolean;
  onDemoComplete: () => void;
  onStopLetMeTry: () => void;
  onSkip?: () => void;
  isExternalPaused?: boolean;
  onStepProgress?: (stepIndex: number, step: Step, caption: string) => void;
  /** Controlled from parent – rendered in the demo bar ABOVE the phone */
  isPaused: boolean;
  speedMode: 'slow' | 'normal';
}

export const DemoRunnerOverlay: React.FC<DemoRunnerOverlayProps> = ({
  language,
  lesson,
  containerRef,
  isActive,
  onDemoComplete,
  onStopLetMeTry,
  onSkip,
  isExternalPaused = false,
  onStepProgress,
  isPaused,
  speedMode,
}) => {
  const [pointerPos, setPointerPos] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [isRippling, setIsRippling] = useState<boolean>(false);

  const abortControllerRef = useRef<boolean>(false);
  const isPausedRef = useRef<boolean>(false);
  const isExternalPausedRef = useRef<boolean>(false);
  const speedRef = useRef<'slow' | 'normal'>('slow');
  const lessonRef = useRef(lesson);
  lessonRef.current = lesson;
  const onDemoCompleteRef = useRef(onDemoComplete);
  onDemoCompleteRef.current = onDemoComplete;
  const languageRef = useRef(language);
  languageRef.current = language;
  const lastSpokenKeyRef = useRef<string>('');

  // Sync controlled props into refs (read every render by the async demo loop)
  isPausedRef.current = isPaused;
  isExternalPausedRef.current = isExternalPaused;
  speedRef.current = speedMode;

  // Stop voice when externally paused
  useEffect(() => {
    if (isPaused) voiceManager.stop();
  }, [isPaused]);

  // Sleep utility with cancellation and pause handling
  const sleep = useCallback(async (ms: number): Promise<void> => {
    const adjustedMs = speedRef.current === 'normal' ? ms * 0.65 : ms;
    const interval = 50;
    let elapsed = 0;

    while (elapsed < adjustedMs) {
      if (abortControllerRef.current) return;
      if (!isPausedRef.current && !isExternalPausedRef.current) {
        elapsed += interval;
      }
      await new Promise((r) => setTimeout(r, interval));
    }
  }, []);

  // Poll every 50 ms for an element with data-demo-id and non-zero dimensions
  const waitFor = useCallback(
    async (id: string, timeout = 3500): Promise<HTMLElement | null> => {
      const startTime = Date.now();
      while (Date.now() - startTime < timeout) {
        if (abortControllerRef.current) return null;
        if (!isPausedRef.current && !isExternalPausedRef.current) {
          const el = document.querySelector(`[data-demo-id="${id}"]`) as HTMLElement;
          if (el) {
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) return el;
          }
        }
        await new Promise((r) => setTimeout(r, 50));
      }
      return null;
    },
    []
  );

  // Move the floating pointer to an element's centre (as % of containerRef)
  const movePointerTo = useCallback(
    async (el: HTMLElement): Promise<void> => {
      if (!containerRef.current || abortControllerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();

      const x = ((elRect.left + elRect.width / 2 - containerRect.left) / containerRect.width) * 100;
      const y = ((elRect.top + elRect.height / 2 - containerRect.top) / containerRect.height) * 100;

      setPointerPos({ x: Math.min(95, Math.max(5, x)), y: Math.min(95, Math.max(5, y)) });
      await sleep(speedRef.current === 'normal' ? 350 : 500);
    },
    [containerRef, sleep]
  );

  const triggerRipple = useCallback(async (): Promise<void> => {
    if (abortControllerRef.current) return;
    setIsRippling(true);
    await sleep(150);
    setIsRippling(false);
  }, [sleep]);

  const demoTap = useCallback(
    async (id: string): Promise<void> => {
      if (abortControllerRef.current) return;
      const el = await waitFor(id);
      if (!el) {
        console.warn(`[demo] missing target: ${id}`);
        return;
      }
      console.log(`[demo] tap ${id}`);
      await movePointerTo(el);
      await triggerRipple();

      while ((isPausedRef.current || isExternalPausedRef.current) && !abortControllerRef.current) {
        await new Promise((r) => setTimeout(r, 100));
      }
      if (abortControllerRef.current) return;
      el.click();
      await sleep(450);
    },
    [waitFor, movePointerTo, triggerRipple, sleep]
  );

  const demoType = useCallback(
    async (text: string): Promise<void> => {
      console.log(`[demo] type ${text}`);
      for (const char of text.split('')) {
        if (abortControllerRef.current) return;
        await demoTap(`key-${char}`);
        while ((isPausedRef.current || isExternalPausedRef.current) && !abortControllerRef.current) {
          await new Promise((r) => setTimeout(r, 100));
        }
        await sleep(350);
      }
    },
    [demoTap, sleep]
  );

  const speakStep = useCallback(
    async (step: Step, stepIndex: number, currentLessonId: string): Promise<void> => {
      const currentLang = languageRef.current;
      const line = step.say[currentLang] || step.say.en;
      const stepKey = `${currentLessonId}_${stepIndex}`;
      if (lastSpokenKeyRef.current !== stepKey) {
        lastSpokenKeyRef.current = stepKey;
        const isLastStep = stepIndex === lessonRef.current.steps.length - 1;
        await voiceManager.speakAsync(line, currentLang, { fallbackTimeoutMs: isLastStep ? 6000 : 15000 });
      }
      await sleep(1000);
    },
    [sleep]
  );

  // Main demo runner loop
  useEffect(() => {
    if (!isActive) return;

    abortControllerRef.current = false;
    lastSpokenKeyRef.current = '';
    let isSubscribed = true;

    const runDemo = async () => {
      const activeLesson = lessonRef.current;
      console.log(`[demo] Starting ${activeLesson.id}`);
      await sleep(400);

      for (let i = 0; i < activeLesson.steps.length; i++) {
        if (abortControllerRef.current || !isSubscribed) return;

        const step = activeLesson.steps[i];
        const line = step.say[languageRef.current] || step.say.en;
        onStepProgress?.(i, step, line);

        while ((isPausedRef.current || isExternalPausedRef.current) && !abortControllerRef.current) {
          await new Promise((r) => setTimeout(r, 100));
        }

        await speakStep(step, i, activeLesson.id);
        if (abortControllerRef.current || !isSubscribed) return;

        while ((isPausedRef.current || isExternalPausedRef.current) && !abortControllerRef.current) {
          await new Promise((r) => setTimeout(r, 100));
        }

        if (step.do === 'point') {
          if (step.target) {
            const el = await waitFor(step.target);
            if (el) await movePointerTo(el);
          }
          await sleep(step.duration ? step.duration * 0.7 : 1800);
        } else if (step.do === 'tap') {
          if (step.target) await demoTap(step.target);
        } else if (step.do === 'type') {
          if (step.text) await demoType(step.text);
        } else if (step.do === 'hold') {
          if (step.target) {
            const el = await waitFor(step.target);
            if (el) {
              await movePointerTo(el);
              setIsRippling(true);
              el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
              await sleep(step.duration || 3000);
              el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true }));
              setIsRippling(false);
            }
          }
        }

        if (abortControllerRef.current || !isSubscribed) return;

        while ((isPausedRef.current || isExternalPausedRef.current) && !abortControllerRef.current) {
          await new Promise((r) => setTimeout(r, 100));
        }
        await sleep(600);
      }

      if (isSubscribed && !abortControllerRef.current) {
        console.log(`[demo] Completed ${activeLesson.id}`);
        await sleep(2000);
        onDemoCompleteRef.current();
      }
    };

    runDemo();

    return () => {
      isSubscribed = false;
      abortControllerRef.current = true;
      voiceManager.stop();
    };
  }, [isActive, lesson.id, speakStep, demoTap, demoType, movePointerTo, waitFor, sleep]);

  if (!isActive) return null;

  return (
    <div className="absolute inset-0 z-40 pointer-events-none overflow-hidden select-none">
      {/* Semi-transparent dim — prevents taps on the simulator during DEMO */}
      <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-[0.5px] pointer-events-auto" />

      {/* Animated Selvi finger pointer – positioned as % of containerRef */}
      <div
        className="absolute transition-all duration-500 ease-out z-70 pointer-events-none"
        style={{
          left: `${pointerPos.x}%`,
          top: `${pointerPos.y}%`,
          transform: 'translate(-50%, -50%)',
        }}
      >
        {isRippling && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="w-16 h-16 rounded-full bg-amber-400/60 animate-ping" />
            <span className="w-8 h-8 rounded-full bg-teal-400/80 animate-pulse" />
          </div>
        )}

        <div className={`flex flex-col items-center transition-transform duration-150 ${isRippling ? 'scale-90 translate-y-1' : 'scale-100'}`}>
          <div className="w-12 h-12 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-2xl border-2 border-white ring-4 ring-teal-500/40">
            <MousePointerClick className="w-6 h-6 fill-slate-950 text-white" />
          </div>
          <div className="mt-1 px-2.5 py-0.5 rounded-full bg-slate-950/90 text-amber-300 text-[10px] font-bold shadow-lg border border-amber-400/40 whitespace-nowrap">
            {isRippling
              ? language === 'ta' ? 'தட்டவும்!' : language === 'hi' ? 'टैप करें!' : 'Tap here!'
              : language === 'ta' ? 'செல்வி' : language === 'hi' ? 'सेल्वी' : 'Selvi'}
          </div>
        </div>
      </div>
    </div>
  );
};
