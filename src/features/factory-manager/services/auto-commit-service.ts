import { watch, type FSWatcher } from 'chokidar';
import { execSync } from 'node:child_process';
import path from 'node:path';

const DEBOUNCE_MS = 30_000; // 30 seconds
const COMMIT_PREFIX = '[auto]';

const IGNORE_PATTERNS = [
  '**/node_modules/**',
  '**/.next/**',
  '**/.git/**',
  '**/dist/**',
  '**/.env*',
  '**/package-lock.json',
  '**/*.lock',
  '**/.DS_Store',
  '**/tsconfig.tsbuildinfo',
];

interface ActiveWatcher {
  watcher: FSWatcher;
  projectPath: string;
  projectName: string;
  timer: ReturnType<typeof setTimeout> | null;
  commitCount: number;
  sessionId: string;
}

/** In-memory map of active watchers (persists across requests in dev server) */
const activeWatchers = new Map<string, ActiveWatcher>();

function hasPendingChanges(projectPath: string): boolean {
  try {
    const status = execSync('git status --porcelain', {
      cwd: projectPath,
      stdio: 'pipe',
    }).toString().trim();
    return status.length > 0;
  } catch {
    return false;
  }
}

function autoCommit(projectPath: string): boolean {
  if (!hasPendingChanges(projectPath)) return false;

  try {
    const now = new Date();
    const timestamp = now.toISOString().replace('T', ' ').substring(0, 16);
    const message = `${COMMIT_PREFIX} dev-session ${timestamp}`;

    execSync('git add -A', { cwd: projectPath, stdio: 'pipe' });
    execSync(`git commit -m "${message}"`, { cwd: projectPath, stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function startWatcher(projectPath: string, sessionId: string): ActiveWatcher {
  const projectName = path.basename(projectPath);

  const entry: ActiveWatcher = {
    watcher: null as unknown as FSWatcher,
    projectPath,
    projectName,
    timer: null,
    commitCount: 0,
    sessionId,
  };

  const watcher = watch(projectPath, {
    ignored: IGNORE_PATTERNS,
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 },
  });

  const scheduleCommit = () => {
    if (entry.timer) clearTimeout(entry.timer);
    entry.timer = setTimeout(() => {
      const committed = autoCommit(projectPath);
      if (committed) {
        entry.commitCount++;
      }
      entry.timer = null;
    }, DEBOUNCE_MS);
  };

  watcher.on('change', scheduleCommit);
  watcher.on('add', scheduleCommit);
  watcher.on('unlink', scheduleCommit);

  entry.watcher = watcher;
  activeWatchers.set(projectPath, entry);

  return entry;
}

function stopWatcher(projectPath: string): { commitCount: number } {
  const entry = activeWatchers.get(projectPath);
  if (!entry) return { commitCount: 0 };

  // Clear pending timer and do a final commit
  if (entry.timer) {
    clearTimeout(entry.timer);
    entry.timer = null;
  }

  const committed = autoCommit(projectPath);
  if (committed) entry.commitCount++;

  entry.watcher.close();
  const commitCount = entry.commitCount;
  activeWatchers.delete(projectPath);

  return { commitCount };
}

function getStatus(projectPath: string): { isTracking: boolean; commitCount: number; sessionId: string | null } {
  const entry = activeWatchers.get(projectPath);
  if (!entry) return { isTracking: false, commitCount: 0, sessionId: null };
  return { isTracking: true, commitCount: entry.commitCount, sessionId: entry.sessionId };
}

function getAllActive(): Array<{ projectPath: string; projectName: string; commitCount: number; sessionId: string }> {
  return Array.from(activeWatchers.values()).map((e) => ({
    projectPath: e.projectPath,
    projectName: e.projectName,
    commitCount: e.commitCount,
    sessionId: e.sessionId,
  }));
}

export const AutoCommitService = {
  startWatcher,
  stopWatcher,
  getStatus,
  getAllActive,
};
