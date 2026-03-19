/** localStorage keys for persisted settings */
export const CONFIG_KEYS = {
  PROJECTS_ROOT_DIR: 'factory-projects-root-dir',
  FACTORY_SOURCE_DIR: 'factory-source-dir',
  NEW_APP_PARENT_DIR: 'factory-new-app-parent-dir',
} as const;

export const DEFAULT_VALUES = {
  PROJECTS_ROOT_DIR: '/Users/ricardomarchetti/ProyectosIA/AplicacionesSaas',
  FACTORY_SOURCE_DIR: '',
  NEW_APP_PARENT_DIR: '/Users/ricardomarchetti/ProyectosIA/AplicacionesSaas',
} as const;

export function getConfig(key: keyof typeof CONFIG_KEYS): string {
  if (typeof window === 'undefined') return DEFAULT_VALUES[key];
  return localStorage.getItem(CONFIG_KEYS[key]) || DEFAULT_VALUES[key];
}

export function setConfig(key: keyof typeof CONFIG_KEYS, value: string): void {
  localStorage.setItem(CONFIG_KEYS[key], value);
}
