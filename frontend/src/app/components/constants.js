// Common UI constants
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const RELATION_NAMES = {
  KNOWS: 'Knows',
  MEMBER_OF: 'Member Of',
  LOCATED_IN: 'Located In',
  LIVES_IN: 'Lives In',
  ATTENDED: 'Attended',
  PARTICIPATED_IN: 'Participated In',
  WORKS_WITH: 'Works With',
  OTHER: 'Other'
};

// Color helper based on node types (adjusted for light mode)
export const getTypeColor = (type) => {
  switch (type) {
    case 'person': return { bg: 'bg-teal-50 border-teal-200 text-teal-700', fill: '#0d9488', glow: 'rgba(13, 148, 136, 0.2)' };
    case 'event': return { bg: 'bg-rose-5 border-rose-200 text-rose-700', fill: '#e11d48', glow: 'rgba(225, 29, 72, 0.2)' };
    case 'place': return { bg: 'bg-sky-5 border-sky-200 text-sky-700', fill: '#0284c7', glow: 'rgba(2, 132, 199, 0.2)' };
    case 'organization': return { bg: 'bg-amber-5 border-amber-200 text-amber-700', fill: '#d97706', glow: 'rgba(217, 119, 6, 0.2)' };
    default: return { bg: 'bg-purple-5 border-purple-200 text-purple-700', fill: '#9333ea', glow: 'rgba(147, 51, 234, 0.2)' };
  }
};
