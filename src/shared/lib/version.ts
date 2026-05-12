// Versionado del Factory Manager.
//
// Convención:
//   - MAJOR.MINOR.PATCH (semver)
//   - PATCH: bug fixes, polish
//   - MINOR: features nuevas
//   - MAJOR: cambios de arquitectura / breaking
//
// Incrementar APP_VERSION manualmente antes de cada deploy con cambios visibles.
// Al final del desarrollo se resetea con la version final.

export const APP_VERSION = '1.1.0';

export interface ChangelogEntry {
  version: string;
  date: string;        // YYYY-MM-DD
  highlights: string[];
}

// Cronológico inverso: lo último arriba.
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.1.0',
    date: '2026-05-12',
    highlights: [
      'Sprint A — chatbot AI Fluya con knowledge base, tools y memoria persistente',
      'Sprint B — sistema de roles founder/operator/client + RLS + audit logs + 2FA + sessions + rate limit',
      'Sprint B.3 — página /me con perfil/seguridad/2FA/sesiones por rol',
      'Sprint B.4 — ABM completo de usuarios (invitar, suspender, reset, borrar)',
      'Sprint D — costos de labor por operador en /reports (AI + Labor + Total)',
      'Brand Fluya aplicado en login y signup',
    ],
  },
];
