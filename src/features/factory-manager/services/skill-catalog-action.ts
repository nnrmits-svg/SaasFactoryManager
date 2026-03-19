'use server';

import fs from 'node:fs/promises';
import path from 'node:path';

/** Skills that can be applied to a project (inject code/config) */
const APPLICABLE_SKILLS = [
  { name: 'apply-design-system', label: 'Design System Fluya', description: 'Dark theme, navbar, footer, colores Fluya', category: 'ui' },
  { name: 'add-login', label: 'Autenticacion', description: 'Login, signup, password reset, profiles, Google OAuth', category: 'auth' },
  { name: 'add-payments', label: 'Pagos (Polar)', description: 'Checkout, webhooks, suscripciones, acceso', category: 'backend' },
  { name: 'add-emails', label: 'Emails (Resend)', description: 'Correos transaccionales, templates, batch', category: 'backend' },
  { name: 'add-mobile', label: 'PWA + Push', description: 'App instalable, notificaciones push, iOS', category: 'frontend' },
  { name: 'add-subscriptions', label: 'CRUD Suscripciones', description: 'CRUD con status tracking, filtros, formularios', category: 'feature' },
  { name: 'add-alerts', label: 'Alertas', description: 'Alertas por vencimiento + email + cron', category: 'feature' },
  { name: 'add-admin', label: 'Panel Admin', description: 'Metricas, KPIs, graficos, gestion usuarios', category: 'feature' },
  { name: 'ai', label: 'IA (Chat/RAG/Vision)', description: 'Vercel AI SDK + OpenRouter, streaming', category: 'ai' },
  { name: 'website-3d', label: 'Landing Cinematica', description: 'Scroll-driven animation estilo Apple', category: 'ui' },
] as const;

export interface SkillInfo {
  name: string;
  label: string;
  description: string;
  category: string;
  hasSkillFile: boolean;
}

export async function getApplicableSkills(): Promise<SkillInfo[]> {
  const skillsDir = path.join(process.cwd(), '.claude', 'skills');
  const results: SkillInfo[] = [];

  for (const skill of APPLICABLE_SKILLS) {
    const skillFile = path.join(skillsDir, skill.name, 'SKILL.md');
    let hasSkillFile = false;
    try {
      await fs.access(skillFile);
      hasSkillFile = true;
    } catch {
      // Skill file not found
    }
    results.push({ ...skill, hasSkillFile });
  }

  return results;
}

export async function getSkillContent(skillName: string): Promise<string | null> {
  const skillFile = path.join(process.cwd(), '.claude', 'skills', skillName, 'SKILL.md');
  try {
    return await fs.readFile(skillFile, 'utf-8');
  } catch {
    return null;
  }
}
