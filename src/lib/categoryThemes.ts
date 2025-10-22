import type { CategoryTheme, CategoryType } from "@/types/news";

export const CATEGORY_THEMES: Record<CategoryType, CategoryTheme> = {
  all: {
    gradient: "from-purple-600 via-pink-600 to-blue-600",
    bg: "bg-gradient-to-br from-purple-900/30 via-pink-900/30 to-blue-900/30",
    accent: "from-purple-500 via-pink-500 to-blue-500",
    text: "text-purple-300",
    glow: "shadow-purple-500/50",
    ring: "ring-purple-500/40",
  },
  bangladesh: {
    gradient: "from-green-500 via-red-500 to-green-600",
    bg: "bg-gradient-to-br from-green-900/30 via-red-900/30 to-green-900/30",
    accent: "from-green-500 via-red-500 to-green-500",
    text: "text-green-300",
    glow: "shadow-green-500/50",
    ring: "ring-emerald-500/40",
  },
  trending: {
    gradient: "from-orange-500 via-red-500 to-pink-600",
    bg: "bg-gradient-to-br from-orange-900/30 via-red-900/30 to-pink-900/30",
    accent: "from-orange-500 via-red-500 to-pink-500",
    text: "text-orange-300",
    glow: "shadow-orange-500/50",
    ring: "ring-orange-500/40",
  },
  business: {
    gradient: "from-emerald-500 via-teal-500 to-cyan-600",
    bg: "bg-gradient-to-br from-emerald-900/30 via-teal-900/30 to-cyan-900/30",
    accent: "from-emerald-500 via-teal-500 to-cyan-500",
    text: "text-emerald-300",
    glow: "shadow-emerald-500/50",
    ring: "ring-emerald-400/40",
  },
  technology: {
    gradient: "from-blue-500 via-indigo-500 to-purple-600",
    bg: "bg-gradient-to-br from-blue-900/30 via-indigo-900/30 to-purple-900/30",
    accent: "from-blue-500 via-indigo-500 to-purple-500",
    text: "text-blue-300",
    glow: "shadow-blue-500/50",
    ring: "ring-blue-500/40",
  },
  health: {
    gradient: "from-green-500 via-emerald-500 to-teal-600",
    bg: "bg-gradient-to-br from-green-900/30 via-emerald-900/30 to-teal-900/30",
    accent: "from-green-500 via-emerald-500 to-teal-500",
    text: "text-green-300",
    glow: "shadow-green-500/50",
    ring: "ring-emerald-500/40",
  },
  sports: {
    gradient: "from-yellow-500 via-amber-500 to-orange-600",
    bg: "bg-gradient-to-br from-yellow-900/30 via-amber-900/30 to-orange-900/30",
    accent: "from-yellow-500 via-amber-500 to-orange-500",
    text: "text-yellow-300",
    glow: "shadow-amber-500/50",
    ring: "ring-amber-500/40",
  },
  entertainment: {
    gradient: "from-fuchsia-500 via-purple-500 to-pink-600",
    bg: "bg-gradient-to-br from-fuchsia-900/30 via-purple-900/30 to-pink-900/30",
    accent: "from-fuchsia-500 via-purple-500 to-pink-500",
    text: "text-fuchsia-300",
    glow: "shadow-fuchsia-500/50",
    ring: "ring-fuchsia-500/40",
  },
  world: {
    gradient: "from-cyan-500 via-sky-500 to-blue-600",
    bg: "bg-gradient-to-br from-cyan-900/30 via-sky-900/30 to-blue-900/30",
    accent: "from-cyan-500 via-sky-500 to-blue-500",
    text: "text-cyan-300",
    glow: "shadow-cyan-500/50",
    ring: "ring-cyan-500/40",
  },
};

export const getCategoryTheme = (
  category: CategoryType | string,
): CategoryTheme => CATEGORY_THEMES[category as CategoryType] ?? CATEGORY_THEMES.all;
