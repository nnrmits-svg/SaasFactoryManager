// Tipos + constantes para el cheat sheet.
// IMPORTANTE: este archivo NO tiene 'use server' — puede importarse libremente
// desde componentes cliente. Los archivos 'use server' solo pueden exportar
// async functions, no objetos ni constantes.

export type CheatSheetItemType = 'skill' | 'agent';

export type CheatSheetCategory =
  | 'discovery'
  | 'scaffold'
  | 'modificacion'
  | 'audit'
  | 'tests'
  | 'visualizacion'
  | 'mantenimiento'
  | 'consultor'
  | 'implementador'
  | 'engineer'
  | 'review'
  | 'utility';

export interface CheatSheetItem {
  name: string;
  type: CheatSheetItemType;
  description: string;
  category: CheatSheetCategory;
  invocation: string;
  path: string;
  rawUrl: string;
}

export interface CheatSheetResult {
  items: CheatSheetItem[];
  /** Error amigable para mostrar al usuario */
  error: string | null;
  /** Indica si la data viene de GitHub vivo o fallback */
  source: 'github' | 'fallback' | 'partial';
}

export const CATEGORY_LABELS: Record<CheatSheetCategory, string> = {
  discovery: '🎯 Discovery / Lead',
  scaffold: '🆕 Apps nuevas',
  modificacion: '🔧 Modificar apps',
  audit: '🔍 Audit y mejoras',
  tests: '🧪 Tests',
  visualizacion: '📊 Diagramas',
  mantenimiento: '🧰 Mantenimiento',
  consultor: '🎓 Consultor estratégico',
  implementador: '🛠️ Implementador técnico',
  engineer: '🔬 Quality Engineer',
  review: '👀 Review',
  utility: '⚙️ Utility',
};

export const CATEGORY_ORDER: CheatSheetCategory[] = [
  'consultor',
  'implementador',
  'engineer',
  'review',
  'discovery',
  'scaffold',
  'modificacion',
  'audit',
  'tests',
  'visualizacion',
  'mantenimiento',
  'utility',
];
