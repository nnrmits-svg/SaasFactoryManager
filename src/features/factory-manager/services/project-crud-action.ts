'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface CreateProjectInput {
  name: string;
  description?: string;
  repoUrl?: string;
  sfVersion?: string;
  designSystem?: string;
  status?: 'active' | 'archived' | 'paused';
  businessBrief?: Record<string, string>;
}

export interface UpdateProjectInput {
  id: string;
  name?: string;
  description?: string;
  repoUrl?: string;
  sfVersion?: string;
  designSystem?: string;
  status?: 'active' | 'archived' | 'paused';
}

export interface ProjectActionResult {
  success: boolean;
  error?: string;
  projectId?: string;
}

export async function createProject(input: CreateProjectInput): Promise<ProjectActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'No autenticado' };
  }

  if (!input.name.trim()) {
    return { success: false, error: 'El nombre es obligatorio' };
  }

  const { data, error } = await supabase
    .from('projects')
    .insert({
      name: input.name.trim(),
      description: input.description?.trim() || null,
      repo_url: input.repoUrl?.trim() || null,
      sf_version: input.sfVersion?.trim() || null,
      design_system: input.designSystem || 'fluya',
      status: input.status || 'active',
      path: input.repoUrl?.trim() || input.name.trim(),
      user_id: user.id,
      business_brief: input.businessBrief || {},
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Ya existe un proyecto con ese nombre' };
    }
    return { success: false, error: error.message };
  }

  revalidatePath('/factory');
  revalidatePath('/dashboard');
  return { success: true, projectId: data.id };
}

export async function updateProject(input: UpdateProjectInput): Promise<ProjectActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'No autenticado' };
  }

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (input.name !== undefined) updateData.name = input.name.trim();
  if (input.description !== undefined) updateData.description = input.description.trim() || null;
  if (input.repoUrl !== undefined) updateData.repo_url = input.repoUrl.trim() || null;
  if (input.sfVersion !== undefined) updateData.sf_version = input.sfVersion.trim() || null;
  if (input.designSystem !== undefined) updateData.design_system = input.designSystem;
  if (input.status !== undefined) updateData.status = input.status;

  const { error } = await supabase
    .from('projects')
    .update(updateData)
    .eq('id', input.id);

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Ya existe un proyecto con ese nombre' };
    }
    return { success: false, error: error.message };
  }

  revalidatePath('/factory');
  revalidatePath('/dashboard');
  return { success: true, projectId: input.id };
}

export async function deleteProject(projectId: string): Promise<ProjectActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'No autenticado' };
  }

  // Delete related data first (cascading). `tracking_sessions` queda fuera —
  // el ciclo de vida de tracking es responsabilidad del SF Agent, el Manager
  // no debe tocar esa tabla.
  await supabase.from('work_sessions').delete().eq('project_id', projectId);
  await supabase.from('commits').delete().eq('project_id', projectId);

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/factory');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function getProjects() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('projects')
    .select(`
      id, name, path, sf_version, design_system, status, description, repo_url,
      created_at, updated_at,
      commits(id),
      work_sessions(duration_minutes)
    `)
    .order('updated_at', { ascending: false });

  if (error) {
    return [];
  }

  return (data || []).map((p) => ({
    id: p.id,
    name: p.name,
    path: p.path,
    sfVersion: p.sf_version,
    designSystem: p.design_system,
    status: p.status as 'active' | 'archived' | 'paused',
    description: p.description as string | null,
    repoUrl: p.repo_url as string | null,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    commitCount: Array.isArray(p.commits) ? p.commits.length : 0,
    totalWorkMinutes: Array.isArray(p.work_sessions)
      ? p.work_sessions.reduce((sum: number, s: { duration_minutes: number }) => sum + (s.duration_minutes || 0), 0)
      : 0,
  }));
}
