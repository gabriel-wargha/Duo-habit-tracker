import {
  Apple,
  Bed,
  Beef,
  Bike,
  BookHeart,
  BookOpen,
  Brain,
  CircleCheck,
  Code,
  Coffee,
  Dog,
  Droplet,
  Dumbbell,
  Footprints,
  GraduationCap,
  Guitar,
  HeartPulse,
  Languages,
  Leaf,
  Moon,
  Palette,
  PenLine,
  PiggyBank,
  Pill,
  Puzzle,
  Salad,
  Sparkles,
  Sun,
  Target,
  type LucideIcon,
} from 'lucide-react'

// Every icon a habit can have. The key ("book-open") is what the API stores (Habit.Icon);
// the component is what we draw. Adding an icon = one line here, no database change.
export const HABIT_ICONS = {
  'circle-check': { icon: CircleCheck, label: 'Check' },
  'footprints': { icon: Footprints, label: 'Run / walk' },
  'dumbbell': { icon: Dumbbell, label: 'Workout' },
  'bike': { icon: Bike, label: 'Cycling' },
  'heart-pulse': { icon: HeartPulse, label: 'Cardio' },
  'book-open': { icon: BookOpen, label: 'Reading' },
  'book-heart': { icon: BookHeart, label: 'Study / scripture' },
  'graduation-cap': { icon: GraduationCap, label: 'Learning' },
  'languages': { icon: Languages, label: 'Languages' },
  'code': { icon: Code, label: 'Coding' },
  'puzzle': { icon: Puzzle, label: 'Puzzles' },
  'pen-line': { icon: PenLine, label: 'Writing' },
  'brain': { icon: Brain, label: 'Meditation' },
  'droplet': { icon: Droplet, label: 'Water' },
  'salad': { icon: Salad, label: 'Healthy food' },
  'apple': { icon: Apple, label: 'Fruit' },
  'beef': { icon: Beef, label: 'Protein' },
  'pill': { icon: Pill, label: 'Medicine' },
  'coffee': { icon: Coffee, label: 'Less coffee' },
  'bed': { icon: Bed, label: 'Sleep' },
  'sun': { icon: Sun, label: 'Morning routine' },
  'moon': { icon: Moon, label: 'Evening routine' },
  'guitar': { icon: Guitar, label: 'Music' },
  'palette': { icon: Palette, label: 'Art' },
  'piggy-bank': { icon: PiggyBank, label: 'Saving' },
  'sparkles': { icon: Sparkles, label: 'Cleaning' },
  'leaf': { icon: Leaf, label: 'Nature' },
  'dog': { icon: Dog, label: 'Pet care' },
  'target': { icon: Target, label: 'Goal' },
} satisfies Record<string, { icon: LucideIcon; label: string }>

export type HabitIconKey = keyof typeof HABIT_ICONS

export const DEFAULT_HABIT_ICON: HabitIconKey = 'circle-check'

// The API sends a plain string. If it's not one we know (an old value, a typo), fall back
// to the default instead of crashing: the server is the source of truth, but the UI must never break.
export function habitIcon(key: string): LucideIcon {
  return key in HABIT_ICONS ? HABIT_ICONS[key as HabitIconKey].icon : HABIT_ICONS[DEFAULT_HABIT_ICON].icon
}
