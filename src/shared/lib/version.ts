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

export const APP_VERSION = '1.2.10';

export interface ChangelogEntry {
  version: string;
  date: string;        // YYYY-MM-DD
  highlights: string[];
}

// Cronológico inverso: lo último arriba.
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.2.10',
    date: '2026-06-04',
    highlights: [
      'Fix Factory: el indicador "Trabajando ahora" pintaba sesiones viejas en verde. El punto salía del enum status (synced/editing), que no se cierra al apagar el Agent, así que una sesión de hace 2 días se veía viva. Ahora el color se decide por is_live (calculado server-side: última actividad < 180s). Sin agentes corriendo: todo gris + "visto hace Xd" (conserva quién trabajó por última vez); con un Agent latiendo: esa fila se pone 🟢. Cosmético: machine_name que es una IP (filas legacy v1.2.0) se muestra como "máquina sin nombre" con la IP en tooltip, y se limpia el sufijo .local. La causa de fondo (sesiones que no cierran al apagar el Agent) es lifecycle del Agent → Sprint D',
    ],
  },
  {
    version: '1.2.9',
    date: '2026-06-04',
    highlights: [
      'Polish post-Sprint A. (1) Settings "Agentes Conectados": el cálculo online ahora usa el más reciente de last_heartbeat/last_seen_at — antes leía solo last_heartbeat (columna legacy v1, congelada) y mostraba todos los Agents Offline aunque estuvieran corriendo vía el heartbeat nuevo (last_seen_at, cada 30s). Umbral online 60s. (2) Factory nuevo (/leader/proyectos) ahora muestra las métricas que solo tenía el viejo: commits, horas trabajadas, versión SF y fecha de creación (columnas compactas Versión + Actividad). (3) /factory redirige a /leader/proyectos. Housekeeping: js-yaml runtime declarado + package-lock.json versionado para builds reproducibles',
    ],
  },
  {
    version: '1.2.8',
    date: '2026-05-14',
    highlights: [
      'Hoja membretada corporativa unificada para PDFs: nuevo wrapper CorporateDocument con portada estructurada (EMPRESA, RESPONSABLE, FECHA, NRO, Ejecutivo, Director, DATOS EMPRESA, Versión) inspirado en formato Grupo ITS + accent purple Fluya en headers. Aplicado a Propuesta (con tablas BOM por categoría AI/Labor/Fijos/Overhead), SOW, NDA. Provider config via env vars (COMPANY_NAME, COMPANY_TAX_ID, COMPANY_LOGO_URL, etc) para switch fácil Fluya↔ITS sin tocar código',
    ],
  },
  {
    version: '1.2.7',
    date: '2026-05-14',
    highlights: [
      'Delete-project: resolveInstanceId en cascada (project_local_paths → created_by_command_id → FCFS) — antes caía a FCFS si project_local_paths estaba vacío y el comando llegaba a la máquina equivocada. Modal ahora muestra el resolution_source con warnings claros: FCFS amarillo (riesgo de ruteo) o created_by_command_id celeste (info). Detección del error "Path no existe" del Agent 1.1.25 con sugerencia de retry. Compatible con Agent 1.1.25 (poblado de project_local_paths post-create + validate honesto)',
    ],
  },
  {
    version: '1.2.6',
    date: '2026-05-14',
    highlights: [
      'Fix bug en modal Eliminar: el checkbox "Borrar folder local" aparecía deshabilitado aunque la BD tuviera local_path. Causa: getProjects() no traía local_path ni github_repo_url, y ProjectRow no exponía esos campos. Ahora el modal recibe los valores reales y el founder puede marcar el checkbox cuando corresponde',
    ],
  },
  {
    version: '1.2.5',
    date: '2026-05-14',
    highlights: [
      'Eliminar proyecto coordinado: modal con confirmación tipo GitHub (tipear nombre) + 3 checkboxes (folder local · repo GitHub · PDFs del bucket contracts/). Manager dispara agent_command:delete-project con safety checks de path, polling del result del Agent, y DELETE FROM projects con CASCADE solo si el Agent confirma. Requiere SF Agent v1.1.24+ para los stages delete-local / delete-github',
    ],
  },
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
