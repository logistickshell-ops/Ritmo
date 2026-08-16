/**
 * Ритмо 2.0 — «тёплая кинетическая бумага».
 * Один ясный следующий шаг, внешняя нить памяти и бережный возврат без давления.
 */
import {
  Accessibility,
  ArrowDownToLine,
  Award,
  BatteryLow,
  CalendarDays,
  Check,
  ChevronRight,
  CircleCheck,
  Clock3,
  Coffee,
  Copy,
  Download,
  Eye,
  FileText,
  Flag,
  Heart,
  Info,
  Leaf,
  ListChecks,
  MessageCircle,
  Minus,
  Moon,
  MoreHorizontal,
  Music2,
  Pause,
  PenLine,
  Play,
  Plus,
  Repeat2,
  RotateCcw,
  Send,
  Settings2,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sun,
  TimerReset,
  Upload,
  Users,
  Volume2,
  Wand2,
  Waves,
  X,
  Zap,
} from "lucide-react";
import { ChangeEvent, FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";

type Energy = "низкая" | "средняя" | "высокая";
type Category = "дом" | "дело" | "я";
type Repeat = "один раз" | "ежедневно" | "по будням";
type Mode = "школа" | "учёба" | "работа" | "жизнь";
type DriftKind = "мысль" | "слишком много" | "унесло" | "тяжело" | "пусто";
type ReflectionAnswer = "да" | "чуть" | "нет";
type AudioScene = "лоу-фай" | "эмбиент" | "пианино" | "ночной джаз" | "дождь" | "белый шум";
type SectionId = "today" | "rituals" | "focus" | "rhythm";

type Ritual = {
  id: string;
  title: string;
  note?: string;
  duration: number;
  energy: Energy;
  done: boolean;
  category: Category;
  firstStep?: string;
  repeat: Repeat;
};

type FocusThread = {
  ritualId: string;
  ritualTitle: string;
  artifact: string;
  pausedAt: string;
  returnWith: string;
  updatedAt: string;
};

type DriftEvent = {
  id: string;
  kind: DriftKind;
  action: string;
  createdAt: string;
};

type SomedayItem = { id: string; title: string; note?: string; createdAt: string };

type Reflection = {
  returnCount: number;
  careActs: number;
  answers: ReflectionAnswer[];
  helpfulNotes: string[];
  driftEvents: DriftEvent[];
};

type Settings = {
  visualMode: "full" | "quiet" | "contrast";
  audioScene: AudioScene;
  customFocusLength: number;
  onboardingDone: boolean;
};

type SaveData = {
  version: 2;
  rituals: Ritual[];
  selectedId: string;
  energy: number;
  mode: Mode;
  points: number;
  focusSessions: number;
  checkin: boolean;
  sessionsToday: number;
  parkedThoughts: string[];
  someday: SomedayItem[];
  focusThread: FocusThread | null;
  reflection: Reflection;
  tomorrowSeed: string;
  settings: Settings;
};

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const STORAGE_KEY = "ritmo-local-v2";
const LEGACY_STORAGE_KEY = "ritmo-local-v1";

const audioScenes: Record<AudioScene, { label: string; cue: string; notes: number[]; interval: number; peak: number; filter: number; decay: number; tone: OscillatorType; shimmer: OscillatorType; shimmerRatio: number; detune: number; texture?: "rain" | "noise" }> = {
  "лоу-фай": { label: "лоу-фай", cue: "тёплые клавиши и мягкий пульс", notes: [146.83, 196, 220, 196, 174.61], interval: 2600, peak: 0.026, filter: 540, decay: 2.2, tone: "sine", shimmer: "sine", shimmerRatio: 2, detune: -4 },
  эмбиент: { label: "эмбиент", cue: "воздух, пад и много пространства", notes: [130.81, 164.81, 196, 246.94], interval: 4800, peak: 0.019, filter: 760, decay: 4.1, tone: "sine", shimmer: "triangle", shimmerRatio: 1.5, detune: 5 },
  пианино: { label: "мягкое пианино", cue: "редкие клавиши без спешки", notes: [261.63, 329.63, 392, 440, 329.63], interval: 2350, peak: 0.022, filter: 920, decay: 1.8, tone: "triangle", shimmer: "sine", shimmerRatio: 2.01, detune: -2 },
  "ночной джаз": { label: "ночной джаз", cue: "вельветовые аккорды и медленный грув", notes: [146.83, 174.61, 220, 261.63, 220], interval: 3050, peak: 0.022, filter: 650, decay: 2.7, tone: "sine", shimmer: "triangle", shimmerRatio: 1.25, detune: -7 },
  дождь: { label: "дождь", cue: "мелкий дождь и далёкие колокольчики", notes: [174.61, 196, 220, 246.94], interval: 1900, peak: 0.014, filter: 760, decay: 1.45, tone: "sine", shimmer: "triangle", shimmerRatio: 1.5, detune: 3, texture: "rain" },
  "белый шум": { label: "белый шум", cue: "ровный шорох без мелодии", notes: [98, 110, 123.47], interval: 3300, peak: 0.008, filter: 360, decay: 2.8, tone: "sine", shimmer: "sine", shimmerRatio: 1.01, detune: 0, texture: "noise" },
};

const defaults: Ritual[] = [
  {
    id: "ritual-1",
    title: "Открыть проект и выбрать один кусочек",
    note: "Не делать всё. Только посмотреть, что первое.",
    duration: 12,
    energy: "средняя",
    done: false,
    category: "дело",
    firstStep: "Открыть проект и назвать один файл, с которым я рядом.",
    repeat: "один раз",
  },
  {
    id: "ritual-2",
    title: "Вода, окно, три спокойных вдоха",
    note: "Возвращение в тело перед стартом.",
    duration: 3,
    energy: "низкая",
    done: true,
    category: "я",
    firstStep: "Налить воду и встать у окна.",
    repeat: "ежедневно",
  },
  {
    id: "ritual-3",
    title: "Собрать одну поверхность",
    note: "Стол, полка или один угол — достаточно.",
    duration: 8,
    energy: "низкая",
    done: false,
    category: "дом",
    firstStep: "Положить на место три предмета.",
    repeat: "один раз",
  },
  {
    id: "ritual-4",
    title: "Ответить на одно важное сообщение",
    note: "Черновик тоже считается.",
    duration: 5,
    energy: "средняя",
    done: false,
    category: "дело",
    firstStep: "Открыть чат и написать первую строку.",
    repeat: "один раз",
  },
];

const modeOptions: Array<[Mode, string]> = [
  ["школа", "Уроки, перемены, сборы"],
  ["учёба", "Пары, дедлайны, сессия"],
  ["работа", "Проекты, встречи, почта"],
  ["жизнь", "Дом, здоровье, личный ритм"],
];

const navigationItems: Array<{ id: SectionId; label: string; Icon: typeof Sun }> = [
  { id: "today", label: "Сегодня", Icon: Sun },
  { id: "rituals", label: "Ритуалы", Icon: ListChecks },
  { id: "focus", label: "Фокус", Icon: Clock3 },
  { id: "rhythm", label: "Мой ритм", Icon: Waves },
];

const templateRituals: Record<Mode, Array<Omit<Ritual, "id" | "done">>> = {
  школа: [
    { title: "Открыть тетрадь и написать дату", note: "Достаточно включиться в урок.", duration: 3, energy: "низкая", category: "дело", firstStep: "Положить тетрадь перед собой.", repeat: "по будням" },
    { title: "Собрать рюкзак на завтра", note: "Только учебники по одному предмету.", duration: 7, energy: "низкая", category: "дом", firstStep: "Положить в рюкзак первый учебник.", repeat: "по будням" },
  ],
  учёба: [
    { title: "Открыть конспект и выделить один тезис", note: "Не учить всё сразу.", duration: 8, energy: "низкая", category: "дело", firstStep: "Открыть нужную страницу.", repeat: "один раз" },
    { title: "Написать план на три строки", note: "Набросок — это уже начало.", duration: 6, energy: "средняя", category: "дело", firstStep: "Написать заголовок.", repeat: "один раз" },
  ],
  работа: [
    { title: "Открыть один рабочий документ", note: "Выбрать один экран вместо десяти.", duration: 5, energy: "низкая", category: "дело", firstStep: "Открыть документ без почты рядом.", repeat: "один раз" },
    { title: "Сделать черновик ответа", note: "Не отправлять сразу — просто написать.", duration: 7, energy: "средняя", category: "дело", firstStep: "Открыть письмо и написать обращение.", repeat: "один раз" },
  ],
  жизнь: [
    { title: "Поставить воду и сделать паузу", note: "Забота — тоже дело.", duration: 3, energy: "низкая", category: "я", firstStep: "Налить полный стакан воды.", repeat: "ежедневно" },
    { title: "Разобрать один квадрат дома", note: "Один ящик, стол или подоконник.", duration: 10, energy: "средняя", category: "дом", firstStep: "Выбрать поверхность размером с ладонь.", repeat: "один раз" },
  ],
};

const driftCopy: Record<DriftKind, { label: string; reply: string; action: string }> = {
  мысль: { label: "Вспомнил(а) другое", reply: "Сохрани её и вернись к своей нити.", action: "припарковать мысль" },
  "слишком много": { label: "Стало слишком много", reply: "Уменьшим задачу до одного движения.", action: "сделать шаг меньше" },
  унесло: { label: "Меня унесло", reply: "Это случается. Вернёмся через короткий жест.", action: "открыть нужную поверхность" },
  тяжело: { label: "Стало тяжело", reply: "Можно выбрать более безопасный способ быть рядом.", action: "сохранить нить и снизить нагрузку" },
  пусто: { label: "Ресурс закончился", reply: "Отдых не надо заслуживать.", action: "перейти в восстановление" },
};

function timeText(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function safeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function isMode(value: unknown): value is Mode {
  return value === "школа" || value === "учёба" || value === "работа" || value === "жизнь";
}

function isEnergy(value: unknown): value is Energy {
  return value === "низкая" || value === "средняя" || value === "высокая";
}

function isCategory(value: unknown): value is Category {
  return value === "дом" || value === "дело" || value === "я";
}

function isRepeat(value: unknown): value is Repeat {
  return value === "один раз" || value === "ежедневно" || value === "по будням";
}

function isAudioScene(value: unknown): value is AudioScene {
  return typeof value === "string" && value in audioScenes;
}

function ritualFrom(value: unknown): Ritual | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<Ritual>;
  if (typeof raw.title !== "string" || !raw.title.trim()) return null;
  return {
    id: typeof raw.id === "string" ? raw.id : safeId("ritual"),
    title: raw.title.trim().slice(0, 120),
    note: typeof raw.note === "string" ? raw.note.slice(0, 180) : undefined,
    duration: clamp(typeof raw.duration === "number" ? raw.duration : 8, 2, 90),
    energy: isEnergy(raw.energy) ? raw.energy : "средняя",
    done: Boolean(raw.done),
    category: isCategory(raw.category) ? raw.category : "дело",
    firstStep: typeof raw.firstStep === "string" ? raw.firstStep.slice(0, 160) : undefined,
    repeat: isRepeat(raw.repeat) ? raw.repeat : "один раз",
  };
}

function newRitual(input: Omit<Ritual, "id" | "done">): Ritual {
  return { ...input, id: safeId("ritual"), done: false };
}

function defaultReflection(): Reflection {
  return { returnCount: 0, careActs: 0, answers: [], helpfulNotes: [], driftEvents: [] };
}

function defaultSettings(): Settings {
  return { visualMode: "full", audioScene: "лоу-фай", customFocusLength: 18, onboardingDone: false };
}

function Dialog({ children, onClose, className = "" }: { children: ReactNode; onClose: () => void; className?: string }) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}><section className={`ritmo-dialog ${className}`} role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>{children}</section></div>;
}

export default function Home() {
  const [rituals, setRituals] = useState<Ritual[]>(defaults);
  const [selectedId, setSelectedId] = useState("ritual-1");
  const [energy, setEnergy] = useState(3);
  const [mode, setMode] = useState<Mode>("учёба");
  const [points, setPoints] = useState(24);
  const [focusSessions, setFocusSessions] = useState(1);
  const [sessionsToday, setSessionsToday] = useState(1);
  const [checkedIn, setCheckedIn] = useState(false);
  const [parkedThoughts, setParkedThoughts] = useState<string[]>([]);
  const [someday, setSomeday] = useState<SomedayItem[]>([]);
  const [focusThread, setFocusThread] = useState<FocusThread | null>(null);
  const [reflection, setReflection] = useState<Reflection>(defaultReflection);
  const [tomorrowSeed, setTomorrowSeed] = useState("");
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [hydrated, setHydrated] = useState(false);

  const [notice, setNotice] = useState("Никаких догонялок. Сегодня достаточно одного следующего шага.");
  const [focusLength, setFocusLength] = useState(12);
  const [remaining, setRemaining] = useState(12 * 60);
  const [isFocusRunning, setIsFocusRunning] = useState(false);
  const [lofiOn, setLofiOn] = useState(false);
  const [soundPreference, setSoundPreference] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryRemaining, setRecoveryRemaining] = useState(60);
  const [isRecoveryRunning, setIsRecoveryRunning] = useState(false);
  const [showParking, setShowParking] = useState(false);
  const [parkingInput, setParkingInput] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newDuration, setNewDuration] = useState(8);
  const [newRepeat, setNewRepeat] = useState<Repeat>("один раз");
  const [newFirstStep, setNewFirstStep] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showBridge, setShowBridge] = useState(false);
  const [bridgeStep, setBridgeStep] = useState("");
  const [showDrift, setShowDrift] = useState(false);
  const [showThread, setShowThread] = useState(false);
  const [threadPausedAt, setThreadPausedAt] = useState("");
  const [threadReturn, setThreadReturn] = useState("");
  const [showFinish, setShowFinish] = useState(false);
  const [finishNote, setFinishNote] = useState("");
  const [showLowEnergy, setShowLowEnergy] = useState(false);
  const [showTogether, setShowTogether] = useState(false);
  const [showTelegram, setShowTelegram] = useState(false);
  const [showAi, setShowAi] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiSteps, setAiSteps] = useState<string[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [deferredInstall, setDeferredInstall] = useState<BeforeInstallPromptEvent | null>(null);
  const [activeSection, setActiveSection] = useState<SectionId>("today");

  const uploadRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioIntervalRef = useRef<number | null>(null);
  const audioMasterRef = useRef<GainNode | null>(null);
  const audioFadeTimeoutRef = useRef<number | null>(null);
  const focusNavigationPinnedRef = useRef(false);

  const selected = rituals.find((item) => item.id === selectedId) ?? rituals.find((item) => !item.done) ?? rituals[0];
  const completedCount = rituals.filter((item) => item.done).length;
  const lowEnergyRituals = rituals.filter((item) => !item.done && item.energy === "низкая").slice(0, 3);
  const focusProgress = Math.round(((focusLength * 60 - remaining) / (focusLength * 60)) * 100);
  const level = Math.floor(points / 30) + 1;
  const levelProgress = points % 30;
  const returnEase = reflection.answers.length ? reflection.answers.filter((answer) => answer !== "нет").length : 0;
  const weeklyMessage = reflection.returnCount > 0 ? `Ты вернулся(ась) к нити ${reflection.returnCount} раз(а). Это и есть навык.` : "Пока просто замечай, что помогает вернуться.";

  const achievements = useMemo(
    () => [
      { title: "Первый шаг", text: "Отметить один ритуал", active: completedCount >= 1, icon: CircleCheck },
      { title: "Тёплый старт", text: "Сделать чекер", active: checkedIn, icon: Sun },
      { title: "Тихий фокус", text: "Закончить сессию", active: focusSessions >= 1, icon: Waves },
      { title: "Нить рядом", text: "Вернуться после паузы", active: reflection.returnCount >= 1, icon: Repeat2 },
      { title: "Бережный день", text: "Выбрать low-energy шаг", active: reflection.careActs >= 1, icon: Heart },
    ],
    [checkedIn, completedCount, focusSessions, reflection.careActs, reflection.returnCount],
  );

  function getSaveData(): SaveData {
    return { version: 2, rituals, selectedId, energy, mode, points, focusSessions, checkin: checkedIn, sessionsToday, parkedThoughts, someday, focusThread, reflection, tomorrowSeed, settings };
  }

  function hydrateData(value: unknown) {
    if (!value || typeof value !== "object") return;
    const raw = value as Partial<SaveData>;
    const savedRituals = Array.isArray(raw.rituals) ? raw.rituals.map(ritualFrom).filter((item): item is Ritual => Boolean(item)) : [];
    if (savedRituals.length) setRituals(savedRituals);
    if (typeof raw.selectedId === "string") setSelectedId(raw.selectedId);
    if (typeof raw.energy === "number") setEnergy(clamp(raw.energy, 1, 5));
    if (isMode(raw.mode)) setMode(raw.mode);
    if (typeof raw.points === "number") setPoints(Math.max(0, raw.points));
    if (typeof raw.focusSessions === "number") setFocusSessions(Math.max(0, raw.focusSessions));
    if (typeof raw.sessionsToday === "number") setSessionsToday(Math.max(0, raw.sessionsToday));
    if (typeof raw.checkin === "boolean") setCheckedIn(raw.checkin);
    if (Array.isArray(raw.parkedThoughts)) setParkedThoughts(raw.parkedThoughts.filter((item): item is string => typeof item === "string").slice(0, 12));
    if (Array.isArray(raw.someday)) setSomeday(raw.someday.filter((item): item is SomedayItem => Boolean(item && typeof item.title === "string" && typeof item.id === "string")).slice(0, 30));
    if (raw.focusThread && typeof raw.focusThread.ritualId === "string" && typeof raw.focusThread.returnWith === "string") setFocusThread(raw.focusThread as FocusThread);
    if (raw.reflection && typeof raw.reflection === "object") {
      const nextReflection = raw.reflection as Partial<Reflection>;
      setReflection({
        returnCount: typeof nextReflection.returnCount === "number" ? nextReflection.returnCount : 0,
        careActs: typeof nextReflection.careActs === "number" ? nextReflection.careActs : 0,
        answers: Array.isArray(nextReflection.answers) ? nextReflection.answers.filter((item): item is ReflectionAnswer => item === "да" || item === "чуть" || item === "нет").slice(-20) : [],
        helpfulNotes: Array.isArray(nextReflection.helpfulNotes) ? nextReflection.helpfulNotes.filter((item): item is string => typeof item === "string").slice(-12) : [],
        driftEvents: Array.isArray(nextReflection.driftEvents) ? nextReflection.driftEvents.filter((item): item is DriftEvent => Boolean(item && typeof item.kind === "string" && typeof item.action === "string")).slice(-30) : [],
      });
    }
    if (typeof raw.tomorrowSeed === "string") setTomorrowSeed(raw.tomorrowSeed.slice(0, 140));
    if (raw.settings && typeof raw.settings === "object") {
      const savedSettings = raw.settings as Partial<Settings>;
      setSettings({
        visualMode: savedSettings.visualMode === "quiet" || savedSettings.visualMode === "contrast" ? savedSettings.visualMode : "full",
        audioScene: isAudioScene(savedSettings.audioScene) ? savedSettings.audioScene : "лоу-фай",
        customFocusLength: clamp(typeof savedSettings.customFocusLength === "number" ? savedSettings.customFocusLength : 18, 2, 90),
        onboardingDone: Boolean(savedSettings.onboardingDone),
      });
      setShowOnboarding(!savedSettings.onboardingDone);
    } else {
      setShowOnboarding(true);
    }
  }

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_STORAGE_KEY);
      if (raw) hydrateData(JSON.parse(raw));
      else setShowOnboarding(true);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
      setNotice("Локальные данные не удалось прочитать. Мы начали с чистого листа.");
      setShowOnboarding(true);
    } finally {
      setHydrated(true);
    }

    const params = new URLSearchParams(window.location.search);
    const shared = params.get("ritual");
    if (shared) {
      try {
        const ritual = ritualFrom(JSON.parse(shared));
        if (ritual) {
          ritual.id = safeId("shared");
          ritual.done = false;
          setRituals((items) => items.some((item) => item.title === ritual.title) ? items : [ritual, ...items]);
          setSelectedId(ritual.id);
          setNotice("Пришёл ритуал от человека рядом. Оставь его, если он подходит твоему темпу.");
        }
      } catch {
        setNotice("Ссылка на ритуал выглядит неполной. Можно продолжить со своим днём.");
      }
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(getSaveData()));
  }, [hydrated, rituals, selectedId, energy, mode, points, focusSessions, checkedIn, sessionsToday, parkedThoughts, someday, focusThread, reflection, tomorrowSeed, settings]);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setDeferredInstall(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    if (!isFocusRunning) return;
    const timer = window.setInterval(() => {
      setRemaining((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          setIsFocusRunning(false);
          void stopLofi();
          setFocusSessions((count) => count + 1);
          setSessionsToday((count) => count + 1);
          setPoints((score) => score + 15);
          setShowRecovery(true);
          setRecoveryRemaining(60);
          setShowFinish(true);
          setNotice("Сессия завершена. Давай сохраним нить, чтобы не потерять место.");
          return focusLength * 60;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [focusLength, isFocusRunning]);

  useEffect(() => {
    if (!isRecoveryRunning) return;
    const timer = window.setInterval(() => {
      setRecoveryRemaining((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          setIsRecoveryRunning(false);
          setNotice("Пауза закончилась. Можно выбрать ещё один мягкий шаг или настоящий отдых.");
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isRecoveryRunning]);

  useEffect(() => {
    if (isFocusRunning && soundPreference) void startLofi();
    else void stopLofi();
  }, [isFocusRunning, soundPreference]);

  useEffect(() => {
    if (!isFocusRunning || !soundPreference) return;
    void stopLofi().then(() => window.setTimeout(() => void startLofi(), 180));
  }, [settings.audioScene]);

  useEffect(() => () => {
    if (audioIntervalRef.current) window.clearInterval(audioIntervalRef.current);
    if (audioFadeTimeoutRef.current) window.clearTimeout(audioFadeTimeoutRef.current);
    void audioContextRef.current?.close();
  }, []);

  useEffect(() => {
    const sectionIds: SectionId[] = ["today", "rituals", "rhythm"];
    if (window.matchMedia("(max-width: 730px)").matches) sectionIds.splice(2, 0, "focus");
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((first, second) => Math.abs(first.boundingClientRect.top - window.innerHeight * 0.26) - Math.abs(second.boundingClientRect.top - window.innerHeight * 0.26));
      const next = visible[0]?.target.id as SectionId | undefined;
      if (!next) return;
      if (focusNavigationPinnedRef.current && next === "today") return;
      if (next !== "today") focusNavigationPinnedRef.current = false;
      setActiveSection(next);
    }, { rootMargin: "-18% 0px -64% 0px", threshold: [0.08, 0.28, 0.6] });
    sectionIds.forEach((id) => {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    });
    return () => observer.disconnect();
  }, []);

  function updateRitual(id: string, patch: Partial<Ritual>) {
    setRituals((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  }

  function navigateToSection(event: React.MouseEvent<HTMLAnchorElement>, section: SectionId) {
    event.preventDefault();
    focusNavigationPinnedRef.current = section === "focus";
    setActiveSection(section);
    document.getElementById(section)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function selectFocusLength(length: number) {
    const next = clamp(length, 2, 90);
    setFocusLength(next);
    setRemaining(next * 60);
    setIsFocusRunning(false);
    void stopLofi();
  }

  function beginFocus() {
    if (!selected) return;
    const knownStep = selected.firstStep?.trim();
    if (!knownStep) {
      setBridgeStep("");
      setShowBridge(true);
      return;
    }
    const thread = focusThread?.ritualId === selected.id ? focusThread : {
      ritualId: selected.id,
      ritualTitle: selected.title,
      artifact: knownStep,
      pausedAt: "",
      returnWith: knownStep,
      updatedAt: new Date().toISOString(),
    };
    setFocusThread(thread);
    setIsFocusRunning(true);
    setShowRecovery(false);
    setNotice(`Сейчас только: «${thread.returnWith}». Остальное может подождать.`);
  }

  function pauseFocus() {
    setIsFocusRunning(false);
    void stopLofi();
    const currentThread = focusThread ?? (selected ? {
      ritualId: selected.id,
      ritualTitle: selected.title,
      artifact: selected.firstStep || selected.title,
      pausedAt: "",
      returnWith: selected.firstStep || selected.title,
      updatedAt: new Date().toISOString(),
    } : null);
    if (currentThread) {
      setFocusThread(currentThread);
      setThreadPausedAt(currentThread.pausedAt || "");
      setThreadReturn(currentThread.returnWith || currentThread.artifact);
      setShowThread(true);
    }
    setNotice("Таймер и звук на паузе. Сохраним одну нить, чтобы не начинать заново.");
  }

  function toggleFocus() {
    if (isFocusRunning) pauseFocus();
    else beginFocus();
  }

  function saveBridge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const firstStep = bridgeStep.trim() || `Открыть «${selected.title}».`;
    updateRitual(selected.id, { firstStep });
    setFocusThread({ ritualId: selected.id, ritualTitle: selected.title, artifact: firstStep, pausedAt: "", returnWith: firstStep, updatedAt: new Date().toISOString() });
    setShowBridge(false);
    setIsFocusRunning(true);
    setShowRecovery(false);
    setNotice(`Мост построен: «${firstStep}». Этого достаточно, чтобы начать.`);
  }

  function saveThread(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!focusThread) return;
    const nextThread: FocusThread = {
      ...focusThread,
      pausedAt: threadPausedAt.trim() || focusThread.pausedAt || "середина спокойной сессии",
      returnWith: threadReturn.trim() || focusThread.returnWith || focusThread.artifact,
      updatedAt: new Date().toISOString(),
    };
    setFocusThread(nextThread);
    setShowThread(false);
    setNotice(`Нить сохранена. Вернёшься с: «${nextThread.returnWith}».`);
  }

  function returnToThread() {
    if (!focusThread) return;
    const ritual = rituals.find((item) => item.id === focusThread.ritualId);
    if (ritual) setSelectedId(ritual.id);
    setReflection((current) => ({ ...current, returnCount: current.returnCount + 1 }));
    setPoints((score) => score + 4);
    setShowRecovery(false);
    setNotice(`Возвращаемся не в начало, а к нити: «${focusThread.returnWith}».`);
    document.getElementById("focus")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function saveFinish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const note = finishNote.trim() || focusThread?.returnWith || selected?.firstStep || "выбрать один следующий кусочек";
    if (focusThread) setFocusThread({ ...focusThread, pausedAt: "сессия завершена", returnWith: note, updatedAt: new Date().toISOString() });
    setFinishNote("");
    setShowFinish(false);
    setNotice(`Точка возврата сохранена: «${note}». Можно не держать её в голове.`);
  }

  function applyDrift(kind: DriftKind) {
    const item = driftCopy[kind];
    const event: DriftEvent = { id: safeId("drift"), kind, action: item.action, createdAt: new Date().toISOString() };
    setReflection((current) => ({ ...current, driftEvents: [...current.driftEvents, event].slice(-30) }));
    setShowDrift(false);
    if (kind === "мысль") setShowParking(true);
    if (kind === "слишком много") {
      selectFocusLength(Math.min(5, focusLength));
      setShowBridge(true);
      setBridgeStep("");
    }
    if (kind === "тяжело" || kind === "пусто") {
      pauseFocus();
      setShowRecovery(true);
      setReflection((current) => ({ ...current, careActs: current.careActs + 1 }));
    }
    if (kind === "унесло") setIsFocusRunning(false);
    setNotice(item.reply);
  }

  function toggleDone(id: string) {
    const current = rituals.find((item) => item.id === id);
    if (!current) return;
    const willComplete = !current.done;
    updateRitual(id, { done: willComplete });
    if (willComplete) {
      setPoints((score) => score + 5);
      setNotice("Готово. Не идеально — достаточно по-настоящему.");
    } else {
      setPoints((score) => Math.max(0, score - 5));
      setNotice("Вернул(а) в ритм. Можно продолжить в своём темпе.");
    }
  }

  function addRitual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    const item = newRitual({ title, duration: clamp(newDuration, 2, 90), energy: "средняя", category: "дело", firstStep: newFirstStep.trim() || undefined, repeat: newRepeat });
    setRituals((items) => [item, ...items]);
    setSelectedId(item.id);
    setNewTitle("");
    setNewDuration(8);
    setNewRepeat("один раз");
    setNewFirstStep("");
    setShowAdd(false);
    setNotice("Новый ритуал добавлен. Можно начать с малого.");
  }

  function addTemplate(template: Omit<Ritual, "id" | "done">) {
    const item = newRitual(template);
    setRituals((items) => [item, ...items]);
    setSelectedId(item.id);
    setNotice("Шаблон добавлен. Подстрой его под свой день.");
  }

  function deferRitual(ritual: Ritual) {
    setRituals((items) => items.filter((item) => item.id !== ritual.id));
    setSomeday((items) => [{ id: safeId("later"), title: ritual.title, note: ritual.note, createdAt: new Date().toISOString() }, ...items].slice(0, 30));
    if (selectedId === ritual.id) setSelectedId(rituals.find((item) => item.id !== ritual.id)?.id ?? "");
    setNotice("Ритуал ушёл на полку «не сейчас». Он не пропал и не стал долгом.");
  }

  function restoreSomeday(item: SomedayItem) {
    const ritual = newRitual({ title: item.title, note: item.note, duration: 5, energy: "низкая", category: "дело", repeat: "один раз", firstStep: `Открыть «${item.title}».` });
    setRituals((items) => [ritual, ...items]);
    setSomeday((items) => items.filter((entry) => entry.id !== item.id));
    setSelectedId(ritual.id);
    setNotice("Вернули ритуал в день. Никакой спешки.");
  }

  function addParkedThought(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const thought = parkingInput.trim();
    if (!thought) return;
    setParkedThoughts((items) => [thought, ...items].slice(0, 12));
    setParkingInput("");
    setNotice("Мысль припаркована. Можно вернуться к своему шагу.");
  }

  function removeParkedThought(index: number) {
    setParkedThoughts((items) => items.filter((_, itemIndex) => itemIndex !== index));
  }

  function answerReflection(answer: ReflectionAnswer) {
    setReflection((current) => ({ ...current, answers: [...current.answers, answer].slice(-20) }));
    setNotice(answer === "да" ? "Хорошо. Запомним это как мягкую опору." : answer === "чуть" ? "Чуть-чуть — уже наблюдение, из которого вырастает свой ритм." : "Спасибо за честность. Ничего не нужно исправлять прямо сейчас.");
  }

  function addHelpfulNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const target = event.currentTarget.elements.namedItem("helpful") as HTMLInputElement | null;
    const note = target?.value.trim();
    if (!note || !target) return;
    setReflection((current) => ({ ...current, helpfulNotes: [...current.helpfulNotes, note].slice(-12) }));
    target.value = "";
    setNotice("Сохранили как твою личную подсказку.");
  }

  function encodeRitual(ritual: Ritual) {
    const payload = JSON.stringify({ ...ritual, done: false });
    const url = new URL(window.location.href);
    url.search = "";
    url.searchParams.set("ritual", payload);
    return url.toString();
  }

  async function copyText(text: string, message: string) {
    try {
      await navigator.clipboard.writeText(text);
      setNotice(message);
    } catch {
      setNotice("Не получилось скопировать автоматически. Выдели текст вручную.");
    }
  }

  async function shareSelected() {
    if (!selected) return;
    const url = encodeRitual(selected);
    const text = `Ритуал из Ритмо: ${selected.title} — ${selected.duration} мин. Можно взять себе, если подходит.`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Ритмо — ритуал", text, url });
        setNotice("Ритуал отправлен. Вместе проще начинать.");
        return;
      }
      await copyText(`${text}\n${url}`, "Ссылка на ритуал скопирована.");
    } catch {
      setNotice("Отправка отменена. Ритуал остаётся здесь.");
    }
  }

  function shareToTelegram() {
    if (!selected) return;
    const url = encodeRitual(selected);
    const text = `Ритуал из Ритмо: ${selected.title} — ${selected.duration} мин. Можно взять себе, если подходит.`;
    window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    setNotice("Открыли Telegram с готовым текстом и ссылкой на ритуал.");
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(getSaveData(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ritmo-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setNotice("Резервная копия сохранена на устройстве.");
  }

  function importData(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || file.size > 1_000_000) {
      setNotice("Выбери небольшую резервную копию Ритмо в формате JSON.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result)) as Partial<SaveData>;
        if (!Array.isArray(data.rituals)) throw new Error("invalid");
        hydrateData(data);
        setNotice("Копия восстановлена. Ритмо снова рядом.");
      } catch {
        setNotice("Не удалось прочитать файл. Выбери экспорт Ритмо в формате JSON.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  function resetDay() {
    setRituals((items) => items.map((item) => ({ ...item, done: false })));
    setCheckedIn(false);
    setSessionsToday(0);
    setNotice("День обновлён. Ничего не нужно наверстывать.");
  }

  function playNote(ctx: AudioContext, frequency: number, at: number) {
    const scene = audioScenes[settings.audioScene];
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const tone = ctx.createOscillator();
    const shimmer = ctx.createOscillator();
    tone.type = scene.tone;
    shimmer.type = scene.shimmer;
    tone.frequency.setValueAtTime(frequency, at);
    shimmer.frequency.setValueAtTime(frequency * scene.shimmerRatio, at);
    shimmer.detune.setValueAtTime(scene.texture === "rain" ? Math.random() * 18 - 9 : scene.detune, at);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(scene.filter, at);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(scene.peak, at + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + scene.decay);
    tone.connect(filter);
    shimmer.connect(filter);
    filter.connect(gain);
    gain.connect(audioMasterRef.current ?? ctx.destination);
    tone.start(at);
    shimmer.start(at);
    tone.stop(at + scene.decay + 0.1);
    shimmer.stop(at + scene.decay + 0.1);
  }

  function playTexture(ctx: AudioContext, texture: "rain" | "noise", at: number) {
    const duration = texture === "rain" ? 1.5 : 2.8;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
    const samples = buffer.getChannelData(0);
    let last = 0;
    for (let index = 0; index < samples.length; index += 1) {
      const white = Math.random() * 2 - 1;
      last = texture === "rain" ? last * 0.86 + white * 0.14 : white;
      samples[index] = texture === "rain" ? (Math.random() > 0.993 ? white * 1.8 : last) : white;
    }
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    filter.type = texture === "rain" ? "highpass" : "lowpass";
    filter.frequency.setValueAtTime(texture === "rain" ? 1250 : 480, at);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(texture === "rain" ? 0.008 : 0.006, at + 0.16);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    source.buffer = buffer;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(audioMasterRef.current ?? ctx.destination);
    source.start(at);
  }

  async function stopLofi() {
    if (audioIntervalRef.current) window.clearInterval(audioIntervalRef.current);
    if (audioFadeTimeoutRef.current) window.clearTimeout(audioFadeTimeoutRef.current);
    audioIntervalRef.current = null;
    const ctx = audioContextRef.current;
    const master = audioMasterRef.current;
    if (ctx?.state === "running" && master) {
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), now);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
      audioFadeTimeoutRef.current = window.setTimeout(() => void ctx.suspend(), 160);
    }
    setLofiOn(false);
  }

  async function startLofi() {
    if (!isFocusRunning || !soundPreference || audioIntervalRef.current) return;
    const AudioContextClass = window.AudioContext;
    if (!AudioContextClass) {
      setNotice("Этот браузер не поддерживает мягкий аудио-ритм.");
      setSoundPreference(false);
      return;
    }
    const ctx = audioContextRef.current ?? new AudioContextClass();
    audioContextRef.current = ctx;
    if (!audioMasterRef.current) {
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, ctx.currentTime);
      master.connect(ctx.destination);
      audioMasterRef.current = master;
    }
    if (audioFadeTimeoutRef.current) window.clearTimeout(audioFadeTimeoutRef.current);
    await ctx.resume();
    const master = audioMasterRef.current;
    if (!master) return;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(0.0001, ctx.currentTime);
    master.gain.exponentialRampToValueAtTime(0.42, ctx.currentTime + 0.5);
    const scene = audioScenes[settings.audioScene];
    const notes = scene.notes;
    let noteIndex = 0;
    const pulse = () => {
      playNote(ctx, notes[noteIndex % notes.length], ctx.currentTime);
      if (scene.texture) playTexture(ctx, scene.texture, ctx.currentTime);
      noteIndex += 1;
    };
    pulse();
    audioIntervalRef.current = window.setInterval(pulse, scene.interval);
    setLofiOn(true);
  }

  function toggleLofi() {
    if (soundPreference || lofiOn) {
      setSoundPreference(false);
      void stopLofi();
      return;
    }
    setSoundPreference(true);
    if (!isFocusRunning) setNotice("Выбранный фон начнётся вместе с таймером.");
  }

  function chooseLowEnergy(ritual: Ritual) {
    setSelectedId(ritual.id);
    setShowLowEnergy(false);
    setReflection((current) => ({ ...current, careActs: current.careActs + 1 }));
    setNotice(`Выбрали «${ritual.title}». Меньше — не значит хуже.`);
    document.getElementById("today")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function createAiDraft() {
    const task = aiInput.trim() || selected?.title || "эта задача";
    const concise = task.replace(/[.!?]+$/, "");
    setAiSteps([
      `Открыть или положить перед собой то, что относится к «${concise}».`,
      "Сделать один видимый след: заголовок, черновик, список или выбор предмета.",
      "Поставить мягкие 5 минут и решить после них: продолжить, уменьшить или отдохнуть.",
    ]);
  }

  async function installApp() {
    if (!deferredInstall) {
      setNotice("Браузер пока не предложил установку. После публикации открой меню браузера и выбери «Установить приложение».");
      return;
    }
    await deferredInstall.prompt();
    const choice = await deferredInstall.userChoice;
    setDeferredInstall(null);
    setNotice(choice.outcome === "accepted" ? "Ритмо устанавливается на устройство." : "Установка отменена. Ритмо остаётся в браузере.");
  }

  return (
    <main className={`ritmo-shell visual-${settings.visualMode}`}>
      <aside className="side-rail" aria-label="Основная навигация">
        <button className="brand" onClick={() => { focusNavigationPinnedRef.current = false; setActiveSection("today"); window.scrollTo({ top: 0, behavior: "smooth" }); }} aria-label="Ритмо: к началу">
          <img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663889521944/kOXwbzRdNUJizwJs.png" alt="" className="brand-mark" />
          <span className="brand-wordmark">рит<span>м</span>о<svg viewBox="0 0 55 12" fill="none" aria-hidden="true"><path d="M1 8C9 1 17 11 27 6C37 1 43 10 54 3" /></svg></span>
        </button>
        <nav className="side-nav">
          {navigationItems.map(({ id, label, Icon }) => <a className={activeSection === id ? "nav-link is-current" : "nav-link"} data-section={id} href={`#${id}`} onClick={(event) => navigateToSection(event, id)} aria-current={activeSection === id ? "page" : undefined} key={id}><Icon size={19} /> {label}</a>)}
        </nav>
        <section className="rail-card energy-card">
          <div className="eyebrow"><Heart size={14} /> Я здесь</div>
          <p>Сколько сил сейчас?</p>
          <div className="energy-dots" aria-label={`Энергия: ${energy} из 5`}>
            {[1, 2, 3, 4, 5].map((dot) => <button key={dot} onClick={() => setEnergy(dot)} className={dot <= energy ? "energy-dot active" : "energy-dot"} aria-label={`Энергия ${dot} из 5`} />)}
          </div>
          <span>{energy <= 2 ? "можно выбрать очень маленький шаг" : energy <= 3 ? "можно выбрать один шаг" : "есть запас на движение"}</span>
          {energy <= 2 && <button className="low-energy-link" onClick={() => setShowLowEnergy(true)}><BatteryLow size={14} /> маршрут низкой энергии</button>}
        </section>
        <div className="rail-bottom">
          <button className="quiet-button" onClick={() => setShowSettings(true)}><Settings2 size={18} /> Данные и режим</button>
          <div className="local-pill"><Leaf size={14} /> Только на этом устройстве</div>
        </div>
      </aside>

      <section className="content-column">
        <svg className="rhythm-thread" viewBox="0 0 64 1290" fill="none" aria-hidden="true"><path d="M38 4C5 82 60 120 29 190C-2 260 58 312 30 392C0 476 58 516 30 595C1 676 58 721 32 800C4 881 57 928 25 1094C9 1160 55 1210 30 1288" /><circle cx="38" cy="4" r="4" /><circle cx="30" cy="392" r="3" /><circle cx="32" cy="800" r="3" /></svg>
        <header className="topbar">
          <div><p className="date-label">СЕГОДНЯ · ТВОЙ ТЕМП</p><h1>Привет. Начнём <em>без рывка.</em></h1></div>
          <button className="profile-chip" onClick={() => setShowSettings(true)} aria-label="Открыть настройки контекста"><span className="avatar-orbit"><Sparkles size={15} /></span><div><small>контекст</small><strong>{mode}</strong></div></button>
        </header>
        <section className="notice-strip" role="status"><Waves size={17} /><span>{notice}</span></section>

        <section className="today-block" id="today">
          <div className="section-topline"><div><span className="section-index">01</span><h2>Сейчас</h2></div><span className="progress-caption">{completedCount} из {rituals.length} уже в движении</span></div>
          {selected ? <article className="now-card"><div className="now-content"><div className="paper-tag tag-coral"><Zap size={14} /> следующий шаг</div><h3>{selected.title}</h3><p>{selected.firstStep ? `Мост входа: ${selected.firstStep}` : selected.note || "Пусть это будет достаточно маленькая и реальная вещь."}</p><div className="now-actions"><button className="primary-action" onClick={() => document.getElementById("focus")?.scrollIntoView({ behavior: "smooth" })}><Play size={17} fill="currentColor" /> Начать рядом</button><button className="icon-action" onClick={shareSelected} aria-label="Поделиться ритуалом"><Share2 size={18} /></button><span className="time-chip"><Clock3 size={15} /> {selected.duration} мин</span></div></div><div className="now-visual" aria-hidden="true"><img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663889521944/RZCjrTSmKMuxGFOT.png" alt="" /><span className="visual-badge"><span /> в своём темпе</span></div></article> : <article className="now-card empty-now"><CircleCheck size={32} /><h3>На сегодня достаточно.</h3><p>Можно оставить место для отдыха или добавить новый ритуал.</p></article>}
          {focusThread && <button className="thread-ribbon" onClick={returnToThread}><Repeat2 size={16} /><span><small>нить ждёт</small><strong>{focusThread.returnWith}</strong></span><ChevronRight size={17} /></button>}
        </section>

        <section className="checkin-row"><div><div className="eyebrow"><Heart size={14} /> чекер дня</div><h3>{checkedIn ? "Ты уже отметил(а) себя сегодня." : "Перед делом — коротко сверимся?"}</h3><p>{checkedIn ? "Эта маленькая пауза уже стала частью дня." : "Не нужно оценивать себя. Только заметить, где ты сейчас."}</p></div><button className={checkedIn ? "checkin-button checked" : "checkin-button"} onClick={() => { setCheckedIn((value) => !value); setPoints((score) => checkedIn ? Math.max(0, score - 3) : score + 3); setNotice(checkedIn ? "Чекер можно сделать снова, когда захочется." : "Принято. Мы начинаем там, где ты есть."); }}>{checkedIn ? <Check size={18} /> : <Heart size={18} />}{checkedIn ? "я здесь" : "отметиться"}</button></section>

        <section className="tomorrow-card"><CalendarDays size={17} /><div><strong>Подготовить одну нить на завтра</strong><span>Не план дня. Только место, в которое будет легче войти.</span></div><input value={tomorrowSeed} onChange={(event) => setTomorrowSeed(event.target.value)} maxLength={140} placeholder="Например: открыть конспект к первой паре" aria-label="Первый шаг на завтра" /></section>

        <section className="rituals-block" id="rituals">
          <div className="section-topline"><div><span className="section-index">02</span><h2>Ритуалы</h2></div><button className="text-action" onClick={() => setShowAdd(true)}><Plus size={17} /> добавить свой</button></div>
          <p className="section-intro">Не «список обязанностей». Небольшие последовательности, за которые можно зацепиться.</p>
          <div className="ritual-stack">{rituals.map((ritual, index) => <article className={`ritual-item ${ritual.done ? "is-done" : ""} ${ritual.id === selectedId ? "is-selected" : ""}`} key={ritual.id} style={{ "--tilt": `${index % 2 === 0 ? -0.18 : 0.18}deg` } as React.CSSProperties}><button className="check-button" onClick={() => toggleDone(ritual.id)} aria-label={ritual.done ? `Вернуть «${ritual.title}» в список` : `Отметить «${ritual.title}» выполненным`}>{ritual.done && <Check size={15} />}</button><button className="ritual-main" onClick={() => setSelectedId(ritual.id)}><span className={`category-mark ${ritual.category}`}>{ritual.category === "дом" ? <Coffee size={15} /> : ritual.category === "я" ? <Heart size={15} /> : <Zap size={15} />}</span><span><strong>{ritual.title}</strong><small>{ritual.firstStep ? `начать: ${ritual.firstStep}` : ritual.note || "Маленькая понятная последовательность."}</small></span></button><div className="ritual-meta"><span>{ritual.duration} мин</span><span className={`energy-label ${ritual.energy}`}>{ritual.energy}</span>{ritual.repeat !== "один раз" && <span className="repeat-label"><Repeat2 size={10} />{ritual.repeat === "ежедневно" ? "каждый день" : "будни"}</span>}<button onClick={() => deferRitual(ritual)} aria-label={`Отложить «${ritual.title}» в не сейчас`}><Minus size={16} /></button><button onClick={() => setSelectedId(ritual.id)} aria-label="Выбрать как следующий шаг"><ChevronRight size={19} /></button></div></article>)}</div>
          <div className="template-row"><span>Под твой контекст:</span>{templateRituals[mode].map((template) => <button key={template.title} onClick={() => addTemplate(template)}>{template.title}</button>)}</div>
          {someday.length > 0 && <section className="someday-card"><div><div className="eyebrow"><Moon size={14} /> не сейчас</div><p>Эти вещи не исчезли — они просто не требуют тебя сегодня.</p></div><div className="someday-list">{someday.slice(0, 4).map((item) => <button key={item.id} onClick={() => restoreSomeday(item)}><span>{item.title}</span><Plus size={14} /></button>)}</div></section>}
        </section>
      </section>

      <aside className="focus-column" id="focus">
        <div className="focus-title-row"><span className="section-index">03</span><span>ПРОСТРАНСТВО ФОКУСА</span><button onClick={() => setShowSettings(true)} aria-label="Настройки фокуса"><MoreHorizontal size={18} /></button></div>
        <section className="focus-card">
          <div className="focus-card-top"><div className="paper-tag tag-blue"><TimerReset size={14} /> {selected ? "рядом с ритуалом" : "мягкая сессия"}</div><button className={soundPreference ? "sound-button is-armed" : "sound-button"} onClick={toggleLofi} aria-label={soundPreference ? "Выключить мягкий звук" : "Включить мягкий звук вместе с таймером"}>{lofiOn ? <Volume2 size={17} /> : <Music2 size={17} />}</button></div>
          <svg className="focus-rhythm-line" viewBox="0 0 220 44" fill="none" aria-hidden="true"><path d="M1 25C25 3 44 40 70 20C95 1 111 40 140 18C163 2 183 31 219 8" /></svg>
          <div className="focus-context"><span>{selected?.title || "один тихий шаг"}</span><small>{focusThread ? `нить: ${focusThread.returnWith}` : selected?.firstStep || "назови, что будет видно через 90 секунд"}</small></div>
          <div className="timer-ring" style={{ "--timer-progress": `${focusProgress}%` } as React.CSSProperties}><div className="timer-inner"><small>{isFocusRunning ? "ты в процессе" : "можно начать"}</small><strong>{timeText(remaining)}</strong><span>{lofiOn ? `${audioScenes[settings.audioScene].label} звучит мягко` : soundPreference ? "звук начнётся с таймером" : "без шума и спешки"}</span></div></div>
          <div className="timer-presets" aria-label="Длительность фокус-сессии">{[5, 12, 25, 45].map((minutes) => <button className={focusLength === minutes ? "active" : ""} key={minutes} onClick={() => selectFocusLength(minutes)}>{minutes} м</button>)}<button className={focusLength === settings.customFocusLength ? "active custom" : "custom"} onClick={() => selectFocusLength(settings.customFocusLength)}>{settings.customFocusLength} м</button></div>
          <div className="scene-switcher" aria-label="Выбрать фоновую музыкальную сцену">{(Object.keys(audioScenes) as AudioScene[]).map((scene) => <button key={scene} className={settings.audioScene === scene ? "active" : ""} onClick={() => setSettings((current) => ({ ...current, audioScene: scene }))}>{audioScenes[scene].label}</button>)}</div>
          <button className="focus-start" onClick={toggleFocus}>{isFocusRunning ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}{isFocusRunning ? "сохранить нить и паузу" : focusThread ? "вернуться к нити" : "быть рядом"}</button>
          <div className="focus-secondary-actions"><button onClick={() => setShowDrift(true)}><Flag size={14} /> мне мешает</button><button onClick={() => { setIsFocusRunning(false); setRemaining(focusLength * 60); void stopLofi(); setNotice("Таймер и мелодия остановлены. Начать можно с чистого листа."); }}><RotateCcw size={14} /> вернуть таймер</button></div>
        </section>

        {showRecovery && <section className="recovery-card"><div><div className="eyebrow"><Heart size={14} /> после фокуса</div><strong>{isRecoveryRunning ? timeText(recoveryRemaining) : recoveryRemaining === 0 ? "Пауза завершена" : "Минутка восстановления"}</strong><span>{isRecoveryRunning ? "Посмотри вдаль, сделай глоток воды или просто ничего не решай." : "Не переключайся мгновенно. Дай мозгу мягко сменить режим."}</span></div><div className="recovery-actions"><button onClick={() => { if (recoveryRemaining === 0) setRecoveryRemaining(60); setIsRecoveryRunning((value) => !value); }}>{isRecoveryRunning ? <Pause size={15} /> : <Play size={15} fill="currentColor" />}{isRecoveryRunning ? "пауза" : recoveryRemaining === 0 ? "ещё 60 сек" : "60 сек"}</button><button className="dismiss-recovery" onClick={() => { setShowRecovery(false); setIsRecoveryRunning(false); }} aria-label="Закрыть восстановление"><X size={15} /></button></div></section>}

        <section className="air-card"><img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663889521944/CRQmgkqEfuxseZAq.png" alt="Тёплая спокойная рабочая поверхность для фокуса" /><div className="air-overlay"><div className="eyebrow"><Music2 size={14} /> эфир фокуса</div><strong>{lofiOn ? `Звучит «${audioScenes[settings.audioScene].label}»` : "Тихо. Тебе не нужно себя подгонять."}</strong><span>{lofiOn ? audioScenes[settings.audioScene].cue : "Выбери сцену в настройках или в палитре над кнопкой старта."}</span></div></section>

        <section className={showParking ? "parking-card open" : "parking-card"}><button className="parking-toggle" onClick={() => setShowParking((value) => !value)}><ArrowDownToLine size={17} /><span>Парковка мыслей</span><small>{parkedThoughts.length}</small><ChevronRight size={16} /></button>{showParking && <div className="parking-body"><p>Пойманную мысль не нужно держать в голове — оставь её здесь и вернись к своей нити.</p><form onSubmit={addParkedThought}><input value={parkingInput} onChange={(event) => setParkingInput(event.target.value)} placeholder="Например: ответить Диме" maxLength={120} /><button type="submit" aria-label="Припарковать мысль"><Plus size={15} /></button></form>{parkedThoughts.length > 0 && <div className="parked-list">{parkedThoughts.slice(0, 4).map((thought, index) => <div key={`${thought}-${index}`}><span>{thought}</span><button onClick={() => removeParkedThought(index)} aria-label={`Удалить мысль: ${thought}`}><X size={13} /></button></div>)}</div>}</div>}</section>

        <section className="micro-support-card"><div><div className="eyebrow"><Wand2 size={14} /> когда трудно</div><strong>Не получается начать?</strong><span>Локальный черновик поможет сделать задачу меньше. Текст не уходит в сеть.</span></div><button onClick={() => { setAiInput(selected?.title || ""); setAiSteps([]); setShowAi(true); }}>сделать меньше</button></section>

        <section className="rewards-card" id="rewards"><div className="rewards-heading"><div><div className="eyebrow"><Award size={14} /> коллекция ритма</div><h3>Твои тихие победы</h3></div><div className="level-orb"><span>{level}</span><small>ур.</small></div></div><div className="level-bar"><span style={{ width: `${Math.max(8, (levelProgress / 30) * 100)}%` }} /></div><p>{points} ритм-поинтов · {30 - levelProgress || 30} до следующего уровня</p><div className="achievement-list">{achievements.map((item) => { const Icon = item.icon; return <div className={item.active ? "achievement active" : "achievement"} key={item.title}><span><Icon size={16} /></span><div><strong>{item.title}</strong><small>{item.text}</small></div>{item.active && <Check size={16} />}</div>; })}</div></section>

        <section className="share-card"><Users size={18} /><div><strong>Позвать человека рядом?</strong><span>Отправь ритуал или спокойную ссылку без лишних объяснений.</span></div><button onClick={() => setShowTogether(true)}>сессия рядом</button><button className="telegram-small" onClick={() => setShowTelegram(true)}><MessageCircle size={14} /> Telegram</button></section>
      </aside>

      <section className="rhythm-section" id="rhythm"><div className="section-topline"><div><span className="section-index">04</span><h2>Мой ритм</h2></div><span className="progress-caption">только локальные наблюдения</span></div><div className="rhythm-grid"><article className="rhythm-note"><Repeat2 size={18} /><strong>{reflection.returnCount}</strong><span>возвратов к нити</span><p>{weeklyMessage}</p></article><article className="rhythm-note"><Heart size={18} /><strong>{reflection.careActs}</strong><span>бережных выборов</span><p>Сюда входят low-energy шаги и честные паузы.</p></article><article className="rhythm-note"><Eye size={18} /><strong>{returnEase}/{reflection.answers.length || 0}</strong><span>сессий стало легче закрыть</span><div className="reflection-actions"><span>Стало ли проще вернуться?</span><div><button onClick={() => answerReflection("да")}>да</button><button onClick={() => answerReflection("чуть")}>чуть</button><button onClick={() => answerReflection("нет")}>нет</button></div></div></article></div><section className="helpful-card"><div><div className="eyebrow"><PenLine size={14} /> что мне помогает</div><p>Собери свои рабочие опоры. Это не рекомендации извне — это твой собственный опыт.</p></div><form onSubmit={addHelpfulNote}><input name="helpful" placeholder="Например: начинать с воды и открытого окна" maxLength={140} /><button type="submit"><Plus size={15} /> сохранить</button></form>{reflection.helpfulNotes.length > 0 && <div className="helpful-list">{reflection.helpfulNotes.slice(-3).reverse().map((note, index) => <span key={`${note}-${index}`}>{note}</span>)}</div>}</section></section>

      <nav className="mobile-nav" aria-label="Навигация на телефоне">{navigationItems.map(({ id, label, Icon }) => <a href={`#${id}`} className={activeSection === id ? "is-current" : ""} onClick={(event) => navigateToSection(event, id)} aria-current={activeSection === id ? "page" : undefined} key={id}><Icon size={18} />{id === "rhythm" ? "Ритм" : label}</a>)}</nav>

      {showOnboarding && <Dialog onClose={() => { setSettings((current) => ({ ...current, onboardingDone: true })); setShowOnboarding(false); }} className="onboarding-dialog"><button className="close-modal" onClick={() => { setSettings((current) => ({ ...current, onboardingDone: true })); setShowOnboarding(false); }} aria-label="Закрыть"><X size={19} /></button><div className="paper-tag tag-coral"><Sparkles size={14} /> Ритмо рядом</div><h2>Не нужно строить идеальную систему.</h2><p>Здесь есть только ритуал, один видимый шаг и нить, к которой можно вернуться после любого отвлечения.</p><div className="onboarding-steps"><span><b>1</b> Выбери крошечный ритуал.</span><span><b>2</b> Назови, что станет видно через 90 секунд.</span><span><b>3</b> Если унесёт — сохрани нить и вернись позже.</span></div><button className="primary-action" onClick={() => { setSettings((current) => ({ ...current, onboardingDone: true })); setShowOnboarding(false); setNotice("Достаточно одного следующего шага. Остальное подождёт."); }}>выбрать первый шаг <ChevronRight size={17} /></button></Dialog>}

      {showAdd && <Dialog onClose={() => setShowAdd(false)} className="add-modal"><button type="button" className="close-modal" onClick={() => setShowAdd(false)} aria-label="Закрыть"><X size={19} /></button><form onSubmit={addRitual}><div className="paper-tag tag-coral"><Plus size={14} /> новый ритуал</div><h2>Сделаем его меньше.</h2><p>Назови именно первый кусочек, который можно начать сегодня.</p><label>Что будет этим кусочком?<input autoFocus value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder="Например, открыть конспект" maxLength={100} /></label><label>Что станет видно через 90 секунд?<input value={newFirstStep} onChange={(event) => setNewFirstStep(event.target.value)} placeholder="Например, файл открыт" maxLength={160} /></label><label>Сколько в нём минут?<div className="duration-control"><button type="button" onClick={() => setNewDuration((value) => Math.max(2, value - 1))}>−</button><strong>{newDuration} мин</strong><button type="button" onClick={() => setNewDuration((value) => Math.min(90, value + 1))}>+</button></div></label><label>Повторение<select value={newRepeat} onChange={(event) => setNewRepeat(event.target.value as Repeat)}><option value="один раз">один раз</option><option value="ежедневно">каждый день</option><option value="по будням">по будням</option></select></label><button className="primary-action submit-ritual" type="submit"><Plus size={17} /> добавить в ритм</button></form></Dialog>}

      {showBridge && <Dialog onClose={() => setShowBridge(false)} className="bridge-dialog"><button className="close-modal" onClick={() => setShowBridge(false)} aria-label="Закрыть"><X size={19} /></button><form onSubmit={saveBridge}><div className="paper-tag tag-blue"><Zap size={14} /> мост в 90 секунд</div><h2>Что будет физически видно через полторы минуты?</h2><p>Не «поработаю». Например: «файл открыт», «заголовок написан», «на столе лежит нужная вещь».</p><input autoFocus value={bridgeStep} onChange={(event) => setBridgeStep(event.target.value)} placeholder="Например, открыт нужный документ" maxLength={160} /><button className="primary-action" type="submit"><Play size={17} fill="currentColor" /> построить мост и начать</button></form></Dialog>}

      {showDrift && <Dialog onClose={() => setShowDrift(false)} className="drift-dialog"><button className="close-modal" onClick={() => setShowDrift(false)} aria-label="Закрыть"><X size={19} /></button><div className="paper-tag tag-coral"><Flag size={14} /> момент расфокуса</div><h2>Что сейчас произошло?</h2><p>Не диагноз и не отчёт. Просто выбери следующий бережный ответ.</p><div className="drift-options">{(Object.keys(driftCopy) as DriftKind[]).map((kind) => <button key={kind} onClick={() => applyDrift(kind)}><strong>{driftCopy[kind].label}</strong><span>{driftCopy[kind].reply}</span><ChevronRight size={17} /></button>)}</div></Dialog>}

      {showThread && <Dialog onClose={() => setShowThread(false)} className="thread-dialog"><button className="close-modal" onClick={() => setShowThread(false)} aria-label="Закрыть"><X size={19} /></button><form onSubmit={saveThread}><div className="paper-tag tag-blue"><Repeat2 size={14} /> сохранить нить</div><h2>Ты не обязан(а) держать это в голове.</h2><p>Оставь две короткие подсказки будущему себе.</p><label>Я остановился(ась) на…<input value={threadPausedAt} onChange={(event) => setThreadPausedAt(event.target.value)} placeholder="Например, выбрал(а) второй абзац" maxLength={160} /></label><label>Если вернусь, начну с…<input value={threadReturn} onChange={(event) => setThreadReturn(event.target.value)} placeholder="Например, прочитаю одну строку" maxLength={160} /></label><button className="primary-action" type="submit"><ShieldCheck size={17} /> сохранить и выдохнуть</button></form></Dialog>}

      {showFinish && <Dialog onClose={() => setShowFinish(false)} className="finish-dialog"><button className="close-modal" onClick={() => setShowFinish(false)} aria-label="Закрыть"><X size={19} /></button><form onSubmit={saveFinish}><div className="paper-tag tag-coral"><CircleCheck size={14} /> сессия завершена</div><h2>Где будет легче подхватить нить потом?</h2><p>Один ориентир снимет с памяти лишнюю работу.</p><input autoFocus value={finishNote} onChange={(event) => setFinishNote(event.target.value)} placeholder="Например, открыть список с третьего пункта" maxLength={160} /><button className="primary-action" type="submit"><Check size={17} /> сохранить точку возврата</button></form></Dialog>}

      {showLowEnergy && <Dialog onClose={() => setShowLowEnergy(false)} className="low-energy-dialog"><button className="close-modal" onClick={() => setShowLowEnergy(false)} aria-label="Закрыть"><X size={19} /></button><div className="paper-tag tag-blue"><BatteryLow size={14} /> низкая энергия</div><h2>Сегодня можно меньше.</h2><p>Не пытайся догнать обычный день. Выбери один короткий ритуал — или официально закончи на сегодня.</p><div className="low-energy-options">{(lowEnergyRituals.length ? lowEnergyRituals : templateRituals[mode].filter((item) => item.energy === "низкая").map((item) => newRitual(item))).map((ritual) => <button key={ritual.id} onClick={() => chooseLowEnergy(ritual)}><span><Clock3 size={15} /> {ritual.duration} мин</span><strong>{ritual.title}</strong><ChevronRight size={17} /></button>)}</div><button className="quiet-finish" onClick={() => { setShowLowEnergy(false); setReflection((current) => ({ ...current, careActs: current.careActs + 1 })); setNotice("Сегодня достаточно. Ничего не нужно компенсировать."); }}>сегодня достаточно</button></Dialog>}

      {showTogether && <Dialog onClose={() => setShowTogether(false)} className="together-dialog"><button className="close-modal" onClick={() => setShowTogether(false)} aria-label="Закрыть"><X size={19} /></button><div className="paper-tag tag-blue"><Users size={14} /> сессия рядом</div><h2>Позови конкретного человека.</h2><p>Ссылка передаст ритуал и длительность. Получатель откроет тот же спокойный контекст, а не публичную ленту.</p><div className="together-preview"><Users size={20} /><span>{selected?.title || "один ритуал"}</span><small>{focusLength} минут · без камеры и рейтинга</small></div><button className="primary-action" onClick={() => selected && copyText(`${encodeRitual(selected)}&join=${safeId("nearby")}`, "Ссылка для сессии рядом скопирована.")}><Copy size={17} /> скопировать ссылку</button><button className="secondary-dialog-action" onClick={shareSelected}><Share2 size={16} /> отправить через системное меню</button><div className="integration-note"><Info size={15} /> Общий живой статус появится после подключения серверной синхронизации. Сейчас ссылка безопасно передаёт только контекст.</div></Dialog>}

      {showTelegram && <Dialog onClose={() => setShowTelegram(false)} className="telegram-dialog"><button className="close-modal" onClick={() => setShowTelegram(false)} aria-label="Закрыть"><X size={19} /></button><div className="paper-tag tag-blue"><MessageCircle size={14} /> Telegram-ready</div><h2>Ритуал уже можно отправить в чат.</h2><p>Для полноценного Mini App нужен зарегистрированный бот, публичный HTTPS-домен и его токен. В статической версии доступны безопасный deep link и готовый текст.</p><div className="telegram-actions"><button className="primary-action" onClick={shareToTelegram}><Send size={17} /> отправить этот ритуал</button><button className="secondary-dialog-action" onClick={() => selected && copyText(`/start ritual_${selected.id}`, "Сценарий команды для будущего бота скопирован.")}><Copy size={16} /> скопировать сценарий бота</button></div><div className="integration-note"><ShieldCheck size={15} /> Токен бота не хранится и не нужен в статическом фронтенде.</div></Dialog>}

      {showAi && <Dialog onClose={() => setShowAi(false)} className="ai-dialog"><button className="close-modal" onClick={() => setShowAi(false)} aria-label="Закрыть"><X size={19} /></button><div className="paper-tag tag-coral"><Wand2 size={14} /> сделать меньше</div><h2>Сначала — локальный черновик.</h2><p>Эта версия не отправляет текст в AI. Она создаёт безопасную структуру входа; подключение модели будет отдельной опциональной настройкой.</p><textarea value={aiInput} onChange={(event) => setAiInput(event.target.value)} placeholder="Большая задача, от которой трудно начать" maxLength={240} /><button className="primary-action" onClick={createAiDraft}><Wand2 size={17} /> разложить на три движения</button>{aiSteps.length > 0 && <div className="ai-steps">{aiSteps.map((step, index) => <button key={step} onClick={() => { const ritual = newRitual({ title: step, duration: index === 2 ? 5 : 3, energy: "низкая", category: "дело", firstStep: step, repeat: "один раз" }); setRituals((items) => [ritual, ...items]); setSelectedId(ritual.id); setShowAi(false); setNotice("Первый кусочек добавлен в ритм."); }}><b>{index + 1}</b><span>{step}</span><Plus size={16} /></button>)}</div>}</Dialog>}

      {showSettings && <Dialog onClose={() => setShowSettings(false)} className="settings-modal"><button className="close-modal" onClick={() => setShowSettings(false)} aria-label="Закрыть"><X size={19} /></button><div className="paper-tag tag-blue"><Settings2 size={14} /> твой контекст</div><h2>Настроить Ритмо под жизнь.</h2><p>Эти выборы хранятся только в браузере и не оценивают тебя.</p><div className="mode-options">{modeOptions.map(([value, description]) => <button className={mode === value ? "active" : ""} key={value} onClick={() => setMode(value)}><strong>{value}</strong><span>{description}</span>{mode === value && <Check size={17} />}</button>)}</div><section className="settings-section"><div className="eyebrow"><Accessibility size={14} /> вид и доступность</div><div className="segmented-control">{(["full", "quiet", "contrast"] as const).map((view) => <button className={settings.visualMode === view ? "active" : ""} onClick={() => setSettings((current) => ({ ...current, visualMode: view }))} key={view}>{view === "full" ? "полный" : view === "quiet" ? "меньше шума" : "контраст"}</button>)}</div></section><section className="settings-section"><div className="eyebrow"><Music2 size={14} /> аудиопалитра</div><p className="audio-caption">Все стили запускаются только вместе с таймером и мягко гаснут на паузе.</p><div className="audio-scene-grid">{(Object.keys(audioScenes) as AudioScene[]).map((scene) => <button className={settings.audioScene === scene ? "active" : ""} onClick={() => setSettings((current) => ({ ...current, audioScene: scene }))} key={scene}><strong>{audioScenes[scene].label}</strong><span>{audioScenes[scene].cue}</span>{settings.audioScene === scene && <Check size={15} />}</button>)}</div></section><section className="settings-section custom-length"><label><SlidersHorizontal size={14} /> свой мягкий таймер<input type="number" min="2" max="90" value={settings.customFocusLength} onChange={(event) => setSettings((current) => ({ ...current, customFocusLength: clamp(Number(event.target.value) || 2, 2, 90) }))} /></label><span>от 2 до 90 минут</span></section><section className="install-card"><div><FileText size={16} /><span><strong>Установить Ритмо</strong><small>Откроется как отдельное приложение и сохранит локальные данные.</small></span></div><button onClick={installApp}>установить</button></section><div className="data-actions"><button onClick={exportData}><Download size={17} /> экспорт</button><button onClick={() => uploadRef.current?.click()}><Upload size={17} /> импорт</button><button className="warning" onClick={resetDay}><RotateCcw size={17} /> новый день</button></div><input ref={uploadRef} className="hidden-input" type="file" accept="application/json" onChange={importData} /><p className="privacy-stamp"><ShieldCheck size={14} /> Данные остаются в этом браузере, пока ты сам(а) не экспортируешь их.</p></Dialog>}
    </main>
  );
}
