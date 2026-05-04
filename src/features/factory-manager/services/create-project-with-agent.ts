'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { CreateProjectCommandPayload } from '../types';

export interface CreateProjectWithAgentInput {
  name: string;
  description?: string;
  businessBrief?: Record<string, string>;
  skillsToApply?: string[];
  isPrivate?: boolean;
}

export interface CreateProjectWithAgentResult {
  ok: boolean;
  projectId?: string;
  commandId?: string;
  error?: string;
}

const CORE_SKILLS = ['bitacora', 'project-plan'];

export async function createProjectWithAgent(
  input: CreateProjectWithAgentInput,
): Promise<CreateProjectWithAgentResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };

  const name = input.name.trim();
  if (!name) return { ok: false, error: 'El nombre es obligatorio' };

  const skillsToApply = Array.from(
    new Set([...(input.skillsToApply ?? []), ...CORE_SKILLS]),
  );

  const { data: project, error: insertProjectError } = await supabase
    .from('projects')
    .insert({
      name,
      description: input.description?.trim() || null,
      design_system: 'fluya',
      status: 'active',
      path: name,
      user_id: user.id,
      business_brief: input.businessBrief ?? {},
      agent_status: 'pending',
      skills_to_apply: skillsToApply,
    })
    .select('id')
    .single();

  if (insertProjectError || !project) {
    if (insertProjectError?.code === '23505') {
      return { ok: false, error: 'Ya existe un proyecto con ese nombre' };
    }
    return { ok: false, error: insertProjectError?.message ?? 'Insert fallo' };
  }

  const projectId = project.id as string;

  const payload: CreateProjectCommandPayload = {
    project_id: projectId,
    name,
    brief: input.businessBrief ?? {},
    skills_to_apply: skillsToApply,
    is_private: input.isPrivate ?? true,
  };

  const { data: command, error: insertCommandError } = await supabase
    .from('agent_commands')
    .insert({
      user_id: user.id,
      instance_id: null,
      command: 'create-project',
      payload: payload as unknown as Record<string, unknown>,
      status: 'pending',
    })
    .select('id')
    .single();

  if (insertCommandError || !command) {
    await supabase
      .from('projects')
      .update({
        agent_status: 'failed',
        agent_error: insertCommandError?.message ?? 'No se pudo crear el comando',
      })
      .eq('id', projectId);
    return { ok: false, error: insertCommandError?.message ?? 'Command insert fallo' };
  }

  const commandId = command.id as string;

  await supabase
    .from('projects')
    .update({ created_by_command_id: commandId })
    .eq('id', projectId);

  revalidatePath('/factory');
  revalidatePath('/dashboard');

  return { ok: true, projectId, commandId };
}

export async function retryCreateProject(projectId: string): Promise<CreateProjectWithAgentResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };

  const { data: project, error: fetchError } = await supabase
    .from('projects')
    .select('id, name, business_brief, skills_to_apply, agent_status')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !project) return { ok: false, error: 'Proyecto no encontrado' };

  if (project.agent_status === 'created') {
    return { ok: false, error: 'El proyecto ya esta creado' };
  }

  const payload: CreateProjectCommandPayload = {
    project_id: projectId,
    name: project.name as string,
    brief: (project.business_brief as Record<string, string>) ?? {},
    skills_to_apply: (project.skills_to_apply as string[]) ?? [],
    is_private: true,
  };

  const { data: command, error: insertCommandError } = await supabase
    .from('agent_commands')
    .insert({
      user_id: user.id,
      instance_id: null,
      command: 'create-project',
      payload: payload as unknown as Record<string, unknown>,
      status: 'pending',
    })
    .select('id')
    .single();

  if (insertCommandError || !command) {
    return { ok: false, error: insertCommandError?.message ?? 'Command insert fallo' };
  }

  const commandId = command.id as string;

  await supabase
    .from('projects')
    .update({
      agent_status: 'pending',
      agent_error: null,
      created_by_command_id: commandId,
    })
    .eq('id', projectId);

  revalidatePath('/factory');

  return { ok: true, projectId, commandId };
}
