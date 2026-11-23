/**
 * One semantic vocabulary for app icons and the static gallery export.
 * Lucide supplies geometry except the single official GitHub brand mark; components choose a meaning.
 * Related surfaces share a key, while each registered glyph has exactly one meaning.
 */
import {
  Activity, ArrowRightLeft, BadgeCheck, BadgeDollarSign, Ban, BookOpen, BookText, Bot, Camera, Flag,
  CalendarDays, Check, ChevronDown, ChevronRight, Circle, CircleCheck, CircleX, ClipboardList,
  Clock3, Cog, Copy, Download, Eraser, ExternalLink, Eye, EyeOff, FilePenLine, Headset, Hourglass,
  Info, KeyRound, Languages, LayoutList, LifeBuoy, ListOrdered, ListVideo, Lock, Mail, MapPin, MessagesSquare, MonitorPlay,
  MessageSquareMore, Package, PackageSearch, Pause, Play, RefreshCcw, RotateCcw,
  RotateCw, Route, ScanEye, ScrollText, SendHorizontal, Settings, Shield, SkipBack, SkipForward,
  ShieldAlert, Sparkles, ThumbsDown, ThumbsUp, Ticket, Trash2, TriangleAlert, Undo2,
  Upload, User, UserCheck, UserRoundSearch, Wrench, X, type LucideIcon,
} from "lucide-react";
import { GitHubMark } from "./github-mark";

export const ICONS = {
  agent: Bot, consultant: Headset, howItWorks: Route,
  takeOver: UserCheck, handBack: Undo2, send: SendHorizontal,
  ticket: Ticket, automaticStep: Cog, aiAssistant: Sparkles,
  guardrail: ShieldAlert, security: Shield, approval: Hourglass, refund: BadgeDollarSign,
  tool: Wrench, handoff: ArrowRightLeft, knowledge: BookOpen, error: TriangleAlert,
  address: MapPin, guest: UserRoundSearch, dataCollection: ClipboardList,
  language: Languages, scenario: ListVideo, play: Play, pause: Pause, replay: RotateCcw,
  reset: RefreshCcw, clear: Trash2, close: X, confirm: Check, cancel: Ban,
  passed: CircleCheck, failed: CircleX, idle: Circle, waiting: Clock3, active: Activity,
  order: PackageSearch, product: Package, context: BookText, runLog: MessageSquareMore,
  audit: ScrollText, conversation: MessagesSquare, widget: LayoutList,
  contextUpdate: FilePenLine, secureForm: Lock, photo: Camera, settings: Settings,
  expand: ChevronRight, collapse: ChevronDown, external: ExternalLink,
  like: ThumbsUp, dislike: ThumbsDown, inputCleanup: Eraser, info: Info,
  retry: RotateCw, upload: Upload, download: Download, show: Eye, hide: EyeOff,
  copy: Copy, customer: User, claim: BadgeCheck, escalation: LifeBuoy,
  previousStep: SkipBack, nextStep: SkipForward, github: GitHubMark,
  bookCall: CalendarDays, contact: Mail, apiKey: KeyRound,
  shows: ScanEye,
  steps: ListOrdered, liveDemo: MonitorPlay, flag: Flag,
} satisfies Record<string, LucideIcon>;

export type IconKey = keyof typeof ICONS;
