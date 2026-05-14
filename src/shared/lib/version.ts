// Versionado del Factory Manager.
//
// Convención confirmada por founder (2026-05-13): semver canónico MAJOR.MINOR.PATCH.
//   - PATCH (cambio menor): 1.2.0 → 1.2.1 → 1.2.2 → ... → 1.2.n
//     Bug fixes, polish, ajustes UX, cambios incrementales.
//   - MINOR (cambio mayor): 1.2.n → 1.3.0 → 1.4.0 → ...
//     Features nuevas significativas (PRPs cerrados, capas completas).
//   - MAJOR (breaking): 1.x.x → 2.0.0
//     Cambios de arquitectura o que rompen compatibilidad.
//
// REGLA: bumpear APP_VERSION con CADA cambio que llegue a prod. Sin wip silenciosos.
// Cada deploy queda reflejado en el changelog que ve el founder en /about.

export const APP_VERSION = '1.2.4';

export interface ChangelogEntry {
  version: string;
  date: string;        // YYYY-MM-DD
  highlights: string[];
}

// Cronológico inverso: lo último arriba.
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.2.4',
    date: '2026-05-14',
    highlights: [
      'Fix bug crítico de firma: el INSERT en signatures con .select() reventaba con "permission denied for table users" porque la policy clients_read_signatures tenía un subquery inline a auth.users. Solución: nueva función SECURITY DEFINER current_user_email() + policy reescrita',
    ],
  },
  {
    version: '1.2.3',
    date: '2026-05-13',
    highlights: [
      'Wizard create-project: modal de progreso ahora muestra template_version usado, failed_skills (skills pedidos pero no encontrados), y stage canónico de error en formato code. Soporta los nuevos stages del SF Agent 1.1.23: template-copy y record-skills',
    ],
  },
  {
    version: '1.2.2',
    date: '2026-05-13',
    highlights: [
      'Wizard de creación: el step "Skills iniciales" ahora lee dinámicamente de skills_catalog (25 skills disponibles vs los 8 hardcoded anteriores). Mantiene bitacora + project-plan como obligatorios. Metadata curado (label, description) para los destacados; fallback autoderivado para el resto',
    ],
  },
  {
    version: '1.2.1',
    date: '2026-05-13',
    highlights: [
      'Fix bug useTracking: short-circuit cuando projectPath está vacío; /api/tracking GET retorna estado neutral en vez de importar AutoCommitService (servicio FS incompatible con Vercel Lambdas). Elimina los 500 en logs de cada page load de /project/[name]',
    ],
  },
  {
    version: '1.2.0',
    date: '2026-05-13',
    highlights: [
      'PRP-005 Fase 1 — schema completo de contratos (clients, quotes, line_items, sows, ndas, amendments, signatures + numeración SF/SOW/NDA/AMP + bucket Storage contracts/)',
      'PRP-005 Fase 2 — estimador AI por complejidad + brief + calibración con histórico; pricing idempotente; server actions create/approve/reject quote',
      'PRP-005 Fase 3 — step "Presupuesto" en wizard (11 steps): AI tokens, Labor, Gastos fijos, Estructura, Utilidad, con indicadores en línea',
      'PRP-005 Fase 4 — PDFs Quote/SOW/NDA con React-PDF + cláusula Ley 25.506 ARG embedded',
      'PRP-005 Fase 5 — firma tri-modal: canvas local con SHA-256 + IP + timestamp, upload de PDF firmado externo, DocuSign placeholder',
      'PRP-005 Fase 6 — tab "Contratos" en /project/[name]: aprobar quotes, generar PDFs, firmar, crear SOW/NDA, ampliaciones con recotización versionada',
      'Selector de SF Agent en wizard (auto-selecciona online, warning si nadie pulsea, soporte targeted por instance_id)',
      'Auto-fix invite operador: status pending→active al primer login',
      'Skill cross-repo-access en .claude/skills-catalog/ (detectado por SF Agent para distribuir entre proyectos)',
      'Logo del Factory Manager (SFManager.png) como PWA icon',
    ],
  },
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
