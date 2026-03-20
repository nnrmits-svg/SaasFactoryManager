'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  createProject,
  updateProject,
  deleteProject,
  getProjects,
  type UpdateProjectInput,
} from '../services/project-crud-action';
import { ProjectWizard, type BusinessBrief } from './project-wizard';

interface ProjectRow {
  id: string;
  name: string;
  path: string;
  sfVersion: string | null;
  designSystem: string;
  status: 'active' | 'archived' | 'paused';
  description: string | null;
  repoUrl: string | null;
  createdAt: string;
  updatedAt: string;
  commitCount: number;
  totalWorkMinutes: number;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    paused: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    archived: 'bg-white/5 text-gray-400 border-white/10',
  };

  const labels: Record<string, string> = {
    active: 'Activo',
    paused: 'Pausado',
    archived: 'Archivado',
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-lg border ${styles[status] || styles.archived}`}>
      {labels[status] || status}
    </span>
  );
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export function FactoryDashboard() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectRow | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Edit form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formRepoUrl, setFormRepoUrl] = useState('');
  const [formSfVersion, setFormSfVersion] = useState('');
  const [formStatus, setFormStatus] = useState<'active' | 'archived' | 'paused'>('active');

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    setLoading(true);
    const data = await getProjects();
    setProjects(data);
    setLoading(false);
  }

  function resetEditForm() {
    setFormName('');
    setFormDescription('');
    setFormRepoUrl('');
    setFormSfVersion('');
    setFormStatus('active');
    setEditingProject(null);
    setShowEditForm(false);
  }

  function openEditForm(project: ProjectRow) {
    setFormName(project.name);
    setFormDescription(project.description || '');
    setFormRepoUrl(project.repoUrl || '');
    setFormSfVersion(project.sfVersion || '');
    setFormStatus(project.status);
    setEditingProject(project);
    setShowEditForm(true);
  }

  async function handleWizardComplete(data: { name: string; description: string; brief: BusinessBrief }) {
    setSaving(true);
    setMessage(null);

    const result = await createProject({
      name: data.name,
      description: data.description,
      sfVersion: 'V4',
      businessBrief: data.brief as unknown as Record<string, string>,
    });

    if (result.success) {
      setMessage({ type: 'success', text: `"${data.name}" creado con brief de negocio` });
      setShowWizard(false);
      await loadProjects();
    } else {
      setMessage({ type: 'error', text: result.error || 'Error al crear' });
    }

    setSaving(false);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingProject) return;

    setSaving(true);
    setMessage(null);

    const input: UpdateProjectInput = {
      id: editingProject.id,
      name: formName,
      description: formDescription,
      repoUrl: formRepoUrl,
      sfVersion: formSfVersion,
      status: formStatus,
    };

    const result = await updateProject(input);
    if (result.success) {
      setMessage({ type: 'success', text: `"${formName}" actualizado` });
      resetEditForm();
      await loadProjects();
    } else {
      setMessage({ type: 'error', text: result.error || 'Error al actualizar' });
    }

    setSaving(false);
  }

  async function handleDelete(project: ProjectRow) {
    setDeleting(project.id);
    setMessage(null);

    const result = await deleteProject(project.id);
    if (result.success) {
      setMessage({ type: 'success', text: `"${project.name}" eliminado` });
      await loadProjects();
    } else {
      setMessage({ type: 'error', text: result.error || 'Error al eliminar' });
    }

    setDeleting(null);
  }

  return (
    <div className="max-w-4xl mx-auto px-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Factory</h1>
          <p className="text-gray-400">Crea y gestiona tus proyectos SaaS.</p>
        </div>
        {!showWizard && !showEditForm && (
          <button
            type="button"
            onClick={() => setShowWizard(true)}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white rounded-xl font-medium transition-all duration-300 shadow-lg shadow-purple-500/20"
          >
            + Nuevo Proyecto
          </button>
        )}
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-6 p-4 rounded-xl border text-sm ${
          message.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      {/* Create Wizard */}
      {showWizard && (
        <div className="mb-8">
          <ProjectWizard
            onComplete={handleWizardComplete}
            onCancel={() => setShowWizard(false)}
            saving={saving}
          />
        </div>
      )}

      {/* Edit Form */}
      {showEditForm && editingProject && (
        <form onSubmit={handleEditSubmit} className="mb-8 p-6 bg-white/5 border border-white/10 rounded-2xl">
          <h2 className="text-lg font-semibold text-white mb-4">
            Editar: {editingProject.name}
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Nombre</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-black/30 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Descripcion</label>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={2}
                className="w-full px-4 py-2.5 bg-black/30 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-colors resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Repo URL</label>
                <input
                  type="url"
                  value={formRepoUrl}
                  onChange={(e) => setFormRepoUrl(e.target.value)}
                  placeholder="https://github.com/user/repo"
                  className="w-full px-4 py-2.5 bg-black/30 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Version SF</label>
                <input
                  type="text"
                  value={formSfVersion}
                  onChange={(e) => setFormSfVersion(e.target.value)}
                  className="w-full px-4 py-2.5 bg-black/30 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Estado</label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as 'active' | 'archived' | 'paused')}
                className="w-full px-4 py-2.5 bg-black/30 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50 transition-colors"
              >
                <option value="active">Activo</option>
                <option value="paused">Pausado</option>
                <option value="archived">Archivado</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="submit"
              disabled={saving || !formName.trim()}
              className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white rounded-xl font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-purple-500/20"
            >
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
            <button
              type="button"
              onClick={resetEditForm}
              className="px-6 py-2.5 bg-white/5 text-gray-300 border border-white/10 rounded-xl hover:bg-white/10 transition-all duration-300"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-12 text-gray-500">Cargando proyectos...</div>
      )}

      {/* Projects List */}
      {!loading && projects.length > 0 && (
        <div className="space-y-3">
          {projects.map((project) => (
            <div
              key={project.id}
              className="p-5 bg-white/5 border border-white/10 rounded-2xl hover:border-purple-500/30 transition-all duration-300 group"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <Link
                      href={`/project/${encodeURIComponent(project.name)}`}
                      className="text-white font-semibold hover:text-purple-400 transition-colors"
                    >
                      {project.name}
                    </Link>
                    <StatusBadge status={project.status} />
                    {project.sfVersion && (
                      <span className="px-2 py-0.5 text-xs bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-lg">
                        {project.sfVersion}
                      </span>
                    )}
                  </div>

                  {project.description && (
                    <p className="text-sm text-gray-400 mb-2">{project.description}</p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    {project.repoUrl && (
                      <a
                        href={project.repoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-purple-400 transition-colors"
                      >
                        {project.repoUrl.replace('https://github.com/', '')}
                      </a>
                    )}
                    <span>{project.commitCount} commits</span>
                    <span>{formatMinutes(project.totalWorkMinutes)} trabajados</span>
                    <span>Creado: {new Date(project.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                  <button
                    type="button"
                    onClick={() => openEditForm(project)}
                    className="px-3 py-1.5 text-xs bg-white/5 text-gray-300 border border-white/10 rounded-lg hover:bg-white/10 transition-all"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    disabled={deleting === project.id}
                    onClick={() => {
                      if (confirm(`Eliminar "${project.name}"? Se borran commits y sesiones asociadas.`)) {
                        handleDelete(project);
                      }
                    }}
                    className="px-3 py-1.5 text-xs bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 disabled:opacity-40 transition-all"
                  >
                    {deleting === project.id ? '...' : 'Eliminar'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && projects.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-purple-500/10 flex items-center justify-center">
            <span className="text-3xl">🏭</span>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Sin proyectos aun</h3>
          <p className="text-gray-400 mb-6">Crea tu primer proyecto SaaS para empezar.</p>
          <button
            type="button"
            onClick={() => setShowWizard(true)}
            className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white rounded-xl font-medium transition-all duration-300 shadow-lg shadow-purple-500/20"
          >
            + Crear Primer Proyecto
          </button>
        </div>
      )}
    </div>
  );
}
