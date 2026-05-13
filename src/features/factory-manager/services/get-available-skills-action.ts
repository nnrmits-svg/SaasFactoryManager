// Lista los skills disponibles para aplicar al crear un proyecto.
// Lee de `skills_catalog` (populated por el SF Agent al escanear .claude/skills/ del template).
// Enriquece con metadata humano para los skills "destacados".

'use server';

import { createClient } from '@/lib/supabase/server';

export interface SkillCatalogOption {
  id: string;             // skill_name canónico (ej: 'add-login')
  label: string;          // legible para humano (ej: 'Login + Auth')
  description: string;    // descripción concisa
  required: boolean;      // true → no se puede deseleccionar
  defaultChecked: boolean;
}

// Metadata curado para los skills "destacados". Los que no estén acá usan
// label autoderivado y la description del catalog (o un fallback genérico).
const CURATED: Record<string, Partial<Omit<SkillCatalogOption, 'id'>>> = {
  bitacora: {
    label: 'Bitácora',
    description: 'Registro cronológico de sesiones por proyecto (obligatorio)',
    required: true,
    defaultChecked: true,
  },
  'project-plan': {
    label: 'Project Plan',
    description: 'Plan vivo del proyecto: visión, estado, decisiones (obligatorio)',
    required: true,
    defaultChecked: true,
  },
  'add-login': {
    label: 'Login + Auth',
    description: 'Autenticación completa: signup, login, password reset, OAuth Google',
  },
  'add-payments': {
    label: 'Pagos (Polar)',
    description: 'Checkout + webhooks + suscripciones con Polar (Merchant of Record)',
  },
  'add-emails': {
    label: 'Emails (Resend)',
    description: 'Emails transaccionales: welcome, magic link, batch sending',
  },
  'add-mobile': {
    label: 'PWA + Push',
    description: 'PWA instalable + push notifications (iOS compatible)',
  },
  'add-security': {
    label: 'Seguridad enterprise',
    description: 'Roles + RLS, 2FA/MFA, rate limiting, audit logs',
  },
  'fluya-brand': {
    label: 'Branding Fluya',
    description: 'Logo, header, footer, paleta dark, gradientes, manifest PWA',
  },
  'fluya-ai-agent': {
    label: 'Asistente IA Fluya',
    description: 'Chatbot AI integrado con knowledge base y tools',
  },
  ai: {
    label: 'AI Templates',
    description: 'Capacidades de IA: chat, RAG, vision, tools, web search',
  },
  supabase: {
    label: 'Supabase tooling',
    description: 'Helpers para BD: crear tablas, RLS, migraciones, queries',
  },
  'playwright-cli': {
    label: 'Testing E2E (Playwright)',
    description: 'Testing automatizado con browser real',
  },
  primer: {
    label: 'Primer (contexto)',
    description: 'Carga contexto completo del proyecto al inicio de cada sesión',
  },
  'memory-manager': {
    label: 'Memoria persistente',
    description: 'Sistema de memoria por proyecto versionado en git',
  },
  'new-app': {
    label: 'Entrevista nueva app',
    description: 'Genera PROJECT_BRIEF.md + BUSINESS_LOGIC.md desde cero',
  },
  prp: {
    label: 'PRP (planificación)',
    description: 'Planificar features complejas antes de implementar',
  },
  'bucle-agentico': {
    label: 'Bucle Agéntico',
    description: 'Ejecutar features complejas por fases con mapeo de contexto',
  },
  'image-generation': {
    label: 'Generación de imágenes',
    description: 'Generar y editar imágenes con OpenRouter + Gemini',
  },
  'website-3d': {
    label: 'Landing 3D / scroll',
    description: 'Landing cinemática Apple-style: scroll-driven video',
  },
  autoresearch: {
    label: 'Auto-research',
    description: 'Loop autónomo de mejora de skills (patrón Karpathy)',
  },
  'agent-performance': {
    label: 'Agent performance',
    description: 'Métricas de rendimiento del agente: velocidad, calidad, costo',
  },
  'skill-creator': {
    label: 'Skill creator',
    description: 'Crear nuevos skills personalizados para extender la fábrica',
  },
  'setup-workstation': {
    label: 'Setup workstation',
    description: 'Configurar entorno pro: terminal, editor, Claude Code',
  },
  'update-sf': {
    label: 'Update SF',
    description: 'Actualizar SaaS Factory a la última versión',
  },
  'eject-sf': {
    label: 'Eject SF',
    description: 'Remover SaaS Factory del proyecto (destructivo)',
  },
};

// Fallback si el catalog está vacío — los 2 obligatorios mínimos.
const FALLBACK_CORE: SkillCatalogOption[] = [
  {
    id: 'bitacora',
    label: 'Bitácora',
    description: 'Registro cronológico de sesiones por proyecto (obligatorio)',
    required: true,
    defaultChecked: true,
  },
  {
    id: 'project-plan',
    label: 'Project Plan',
    description: 'Plan vivo del proyecto: visión, estado, decisiones (obligatorio)',
    required: true,
    defaultChecked: true,
  },
];

export async function getAvailableSkillsAction(): Promise<SkillCatalogOption[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return FALLBACK_CORE;

  const { data, error } = await supabase
    .from('skills_catalog')
    .select('skill_name, description')
    .order('skill_name', { ascending: true });

  if (error || !data || data.length === 0) {
    return FALLBACK_CORE;
  }

  // Dedup por skill_name (la tabla tiene rows duplicados con source distinto).
  const seen = new Set<string>();
  const unique = data.filter((row) => {
    const key = row.skill_name as string;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return unique.map((row) => {
    const id = row.skill_name as string;
    const curated = CURATED[id] ?? {};
    return {
      id,
      label: curated.label ?? humanize(id),
      description:
        curated.description ??
        ((row.description as string | null) ?? `Skill: ${id}`),
      required: curated.required ?? false,
      defaultChecked: curated.defaultChecked ?? false,
    };
  });
}

// "add-login" → "Add Login", "fluya-brand" → "Fluya Brand"
function humanize(slug: string): string {
  return slug
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}
