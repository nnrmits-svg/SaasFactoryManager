/** How the project was detected */
export type ProjectType = 'sf-managed' | 'nextjs' | 'manual';

/** Represents a scanned project */
export interface ScannedProject {
  /** Absolute path to the project directory */
  path: string;
  /** Directory name (last segment of the path) */
  name: string;
  /** Version extracted from CLAUDE.md (e.g., "V3"), null if not found */
  version: string | null;
  /** Whether a CLAUDE.md file exists in the project root */
  hasClaudeMd: boolean;
  /** Whether a .claude/ directory exists */
  hasClaudeDir: boolean;
  /** How this project was detected */
  projectType: ProjectType;
}

/** Result of a full scan operation */
export interface ScanResult {
  /** Root directory that was scanned */
  rootDir: string;
  /** All projects found with .claude/ directories */
  projects: ScannedProject[];
  /** Total directories scanned */
  totalScanned: number;
  /** Timestamp of the scan */
  scannedAt: Date;
}

/** Configuration for the scanner */
export interface ScannerConfig {
  /** Root directory to scan */
  rootDir: string;
  /** Maximum depth to scan (default: 1, only immediate children) */
  maxDepth?: number;
  /** Directory names to ignore during scan */
  ignoreDirs?: string[];
}

/** Project status based on version comparison */
export type ProjectStatus = 'OK' | 'Desactualizada' | 'Desconocida';

/** Project stored in Supabase with git metadata */
export interface Project {
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
  // Computed from relations
  totalWorkMinutes?: number;
  lastCommit?: CommitInfo | null;
  commitCount?: number;
}

/** A single git commit */
export interface CommitInfo {
  id: string;
  projectId: string;
  hash: string;
  message: string;
  author: string;
  committedAt: string;
}

/** A calculated work session (gap > 2h = new session) */
export interface WorkSession {
  id: string;
  projectId: string;
  startedAt: string;
  endedAt: string;
  durationMinutes: number;
  commitCount: number;
}

/** Raw git log entry parsed from filesystem */
export interface RawGitCommit {
  hash: string;
  message: string;
  author: string;
  date: string;
}

/** Auto-commit tracking session */
export interface TrackingSession {
  id: string;
  projectId: string;
  startedAt: string;
  endedAt: string | null;
  status: 'active' | 'stopped';
  pid: number | null;
  autoCommits: number;
}

/** Status response for tracking API */
export interface TrackingStatus {
  projectPath: string;
  projectName: string;
  isTracking: boolean;
  sessionId: string | null;
  autoCommits: number;
  startedAt: string | null;
}

/** Desktop agent instance registered in Supabase */
export interface AgentInstance {
  id: string;
  userId: string;
  machineName: string;
  machineId: string;
  osType: string;
  agentVersion: string;
  status: 'active' | 'offline';
  lastHeartbeat: string;
}

/** Command sent from web to agent */
export type AgentCommandType = 'scan' | 'sync' | 'apply-skill' | 'remove-skill' | 'push-projects';

export interface AgentCommand {
  id: string;
  userId: string;
  instanceId: string | null;
  command: AgentCommandType;
  payload: Record<string, unknown>;
  status: 'pending' | 'running' | 'done' | 'error';
  result: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}
