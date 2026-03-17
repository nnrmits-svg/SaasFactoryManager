/** Represents a scanned project that contains a .claude/ directory */
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
