// Common UI constants
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const RELATION_NAMES: Record<string, string> = {
  KNOWS: 'Knows',
  MEMBER_OF: 'Member Of',
  LOCATED_IN: 'Located In',
  LIVES_IN: 'Lives In',
  ATTENDED: 'Attended',
  PARTICIPATED_IN: 'Participated In',
  WORKS_WITH: 'Works With',
  OTHER: 'Other'
};

export interface TypeColor {
  bg: string;
  fill: string;
  border: string;
  glow: string;
  gradient: string;
  text: string;
  iconColor: string;
}

// Color helper based on node types (adjusted for clean, lighter light mode design)
export const getTypeColor = (type: string): TypeColor => {
  switch (type) {
    case 'person': return {
      bg: 'bg-teal-50 border-teal-200 text-teal-700',
      fill: '#99f6e4',
      border: '#0d9488',
      glow: 'rgba(153, 246, 228, 0.15)',
      gradient: 'from-teal-50/30 to-transparent',
      text: 'text-teal-700',
      iconColor: 'text-teal-600'
    };
    case 'event': return {
      bg: 'bg-rose-50 border-rose-200 text-rose-700',
      fill: '#fecdd3',
      border: '#e11d48',
      glow: 'rgba(254, 205, 211, 0.15)',
      gradient: 'from-rose-50/30 to-transparent',
      text: 'text-rose-700',
      iconColor: 'text-rose-600'
    };
    case 'place': return {
      bg: 'bg-sky-50 border-sky-200 text-sky-700',
      fill: '#bae6fd',
      border: '#0284c7',
      glow: 'rgba(186, 230, 253, 0.15)',
      gradient: 'from-sky-50/30 to-transparent',
      text: 'text-sky-700',
      iconColor: 'text-sky-600'
    };
    case 'organization': return {
      bg: 'bg-amber-50 border-amber-200 text-amber-700',
      fill: '#fde68a',
      border: '#d97706',
      glow: 'rgba(253, 230, 138, 0.15)',
      gradient: 'from-amber-50/30 to-transparent',
      text: 'text-amber-700',
      iconColor: 'text-amber-600'
    };
    default: return {
      bg: 'bg-purple-50 border-purple-200 text-purple-700',
      fill: '#e9d5ff',
      border: '#9333ea',
      glow: 'rgba(233, 213, 255, 0.15)',
      gradient: 'from-purple-50/30 to-transparent',
      text: 'text-purple-700',
      iconColor: 'text-purple-600'
    };
  }
};

