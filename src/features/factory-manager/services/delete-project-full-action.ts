// Borrado completo coordinado de un proyecto.
// Hace 3 cosas:
//   1. Borra PDFs del bucket Storage `contracts/<project_id>/` (Manager-side).
//   2. Dispara `agent_command: delete-project` para que el SF Agent borre
//      folder local + repo en GitHub (Agent-side, con safety checks).
//   3. Después del OK del Agent, DELETE FROM projects WHERE id=...
//      (CASCADE limpia commits, sessions, project_skills, quotes, sows,
//      ndas, signatures, amendments, project_local_paths).
//
// Versión v1.2.5+. El Agent debe estar en versión >= 1.1.24 para procesar
// 'delete-project'. Si no, el comando queda pending y el founder ve un timeout.

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

const BUCKET = 'contracts';

export interface DeleteProjectInput {
  project_id: string;
  /** Borrar el folder en el disco del Agent. */
  delete_local_folder: boolean;
  /** Borrar el repo en GitHub vía `gh repo delete`. */
  delete_github_repo: boolean;
  /** Borrar los PDFs del bucket contracts/<project_id>/. */
  delete_storage_files: boolean;
  /** instance_id del Agent que tiene el folder. Si null, usa el primero online. */
  agent_instance_id?: string | null;
}

export interface DeleteProjectResult {
  ok: boolean;
  error?: string;
  /** ID del agent_command insertado (si se disparó). */
  command_id?: string;
  /** True si el folder no requería acción del Agent (puro DB delete). */
  skipped_agent?: boolean;
}

export async function deleteProjectFullyAction(
  input: DeleteProjectInput,
): Promise<DeleteProjectResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };

  // 1. Cargar info del proyecto (local_path, github_repo_url)
  const { data: project, error: pErr } = await supabase
    .from('projects')
    .select('id, name, local_path, path, github_repo_url, github_owner')
    .eq('id', input.project_id)
    .maybeSingle();
  if (pErr) return { ok: false, error: pErr.message };
  if (!project) return { ok: false, error: 'Proyecto no encontrado' };

  // 2. Borrar PDFs del bucket (Manager-side, antes que el resto)
  if (input.delete_storage_files) {
    const folderPrefix = `${input.project_id}/`;
    const { data: list, error: listErr } = await supabase.storage
      .from(BUCKET)
      .list(folderPrefix, { limit: 1000 });
    if (!listErr && list && list.length > 0) {
      const paths = list.map((f) => `${folderPrefix}${f.name}`);
      await supabase.storage.from(BUCKET).remove(paths);
      // No fallar si el bucket cleanup parcial: el principal es el DB delete.
    }
  }

  // 3. Decidir si necesitamos disparar al Agent
  const needsAgent = input.delete_local_folder || input.delete_github_repo;
  let commandId: string | undefined;
  let skippedAgent = false;

  if (needsAgent) {
    const local_path = project.local_path ?? project.path ?? null;
    const github_repo_name = extractRepoName(
      (project.github_repo_url as string | null) ?? null,
    );

    // Resolver instance_id si no vino del UI: buscar en project_local_paths
    // qué máquina tiene el folder. Si solo una máquina lo tiene, targeted;
    // si hay >1 o ninguna, NULL = FCFS (cualquier Agent del user lo toma).
    let resolvedInstanceId = input.agent_instance_id ?? null;
    if (!resolvedInstanceId) {
      const { data: paths } = await supabase
        .from('project_local_paths')
        .select('machine_id')
        .eq('project_id', input.project_id)
        .order('last_seen_at', { ascending: false });
      if (paths && paths.length === 1) {
        const { data: instance } = await supabase
          .from('agent_instances')
          .select('id')
          .eq('machine_id', paths[0].machine_id as string)
          .eq('user_id', user.id)
          .maybeSingle();
        if (instance) resolvedInstanceId = instance.id as string;
      }
    }

    if (input.delete_local_folder && !local_path) {
      return {
        ok: false,
        error: 'No se conoce el local_path del proyecto. ¿Marcaste "borrar folder" pero el proyecto nunca fue creado por wizard?',
      };
    }
    if (input.delete_github_repo && (!project.github_owner || !github_repo_name)) {
      return {
        ok: false,
        error: 'No se conoce el github_owner / repo_name. ¿Marcaste "borrar repo" pero el proyecto no tiene github_repo_url?',
      };
    }

    const payload = {
      project_id: input.project_id,
      local_path,
      github_owner: project.github_owner,
      github_repo_name,
      options: {
        delete_local_folder: input.delete_local_folder,
        delete_github_repo: input.delete_github_repo,
      },
    };

    const { data: command, error: cmdErr } = await supabase
      .from('agent_commands')
      .insert({
        user_id: user.id,
        instance_id: resolvedInstanceId,
        command: 'delete-project',
        payload: payload as unknown as Record<string, unknown>,
        status: 'pending',
      })
      .select('id')
      .single();

    if (cmdErr || !command) {
      return { ok: false, error: cmdErr?.message ?? 'No se pudo crear el comando' };
    }
    commandId = command.id as string;
  } else {
    skippedAgent = true;
  }

  // 4. NO borrar el row de `projects` todavía si necesitamos al Agent.
  //    El polling del lado UI espera el `result.success` del comando y recién
  //    ahí dispara una segunda action `finalizeDeleteAction(project_id)` que
  //    hace el DELETE FROM projects (CASCADE).
  //
  //    Si no necesitamos al Agent (solo DB), borrar acá mismo.
  if (skippedAgent) {
    const { error: delErr } = await supabase
      .from('projects')
      .delete()
      .eq('id', input.project_id);
    if (delErr) return { ok: false, error: delErr.message };
  }

  revalidatePath('/factory');
  revalidatePath('/dashboard');

  return { ok: true, command_id: commandId, skipped_agent: skippedAgent };
}

/**
 * Finaliza el delete: corre DELETE FROM projects después de que el Agent
 * confirmó haber borrado folder/repo. CASCADE limpia commits, sessions,
 * project_skills, quotes, sows, ndas, signatures, amendments, project_local_paths.
 */
export async function finalizeDeleteProjectAction(
  project_id: string,
): Promise<DeleteProjectResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', project_id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/factory');
  revalidatePath('/dashboard');
  return { ok: true };
}

// "https://github.com/owner/repo" → "repo"
function extractRepoName(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(/github\.com[/:]([^/]+)\/([^/.]+)(?:\.git)?$/);
  return match ? match[2] : null;
}
