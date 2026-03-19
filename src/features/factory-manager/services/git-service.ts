import { execSync } from 'node:child_process';
import type { RawGitCommit, WorkSession } from '../types';

const MAX_COMMITS = 500;
const SESSION_GAP_MS = 2 * 60 * 60 * 1000; // 2 hours for manual commits
const AUTO_SESSION_GAP_MS = 5 * 60 * 1000; // 5 minutes for auto-commits
const MINUTES_PER_COMMIT = 30; // estimated work time per manual commit
const AUTO_COMMIT_PREFIX = '[auto]';

/**
 * Checks if a directory is a git repository.
 */
function isGitRepo(dirPath: string): boolean {
  try {
    execSync('git rev-parse --is-inside-work-tree', {
      cwd: dirPath,
      stdio: 'pipe',
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Reads git log from a project directory and returns parsed commits.
 * Uses a delimiter-based format to avoid issues with multiline messages.
 */
function readCommits(dirPath: string, limit = MAX_COMMITS): RawGitCommit[] {
  if (!isGitRepo(dirPath)) return [];

  try {
    const DELIM = '---COMMIT_SEP---';
    const format = `${DELIM}%n%H%n%an%n%aI%n%s`;

    const output = execSync(
      `git log --format="${format}" -n ${limit}`,
      { cwd: dirPath, stdio: 'pipe', maxBuffer: 1024 * 1024 },
    ).toString();

    const blocks = output.split(DELIM).filter((b) => b.trim());

    return blocks.map((block) => {
      const lines = block.trim().split('\n');
      return {
        hash: lines[0] ?? '',
        author: lines[1] ?? '',
        date: lines[2] ?? '',
        message: lines[3] ?? '',
      };
    });
  } catch {
    return [];
  }
}

/**
 * Calculates work sessions from a list of commits.
 * Uses two gap thresholds:
 * - Auto-commits ([auto] prefix): 5 min gap = new session, duration = real time span
 * - Manual commits: 2h gap = new session, duration = span + 30min per commit (estimated)
 */
function calculateSessions(
  projectId: string,
  commits: Array<{ committedAt: string; message?: string }>,
): Omit<WorkSession, 'id'>[] {
  if (commits.length === 0) return [];

  // Sort chronologically (oldest first) for session calculation
  const sorted = [...commits].sort(
    (a, b) => new Date(a.committedAt).getTime() - new Date(b.committedAt).getTime(),
  );

  const isAuto = (msg?: string) => msg?.startsWith(AUTO_COMMIT_PREFIX) ?? false;

  const sessions: Omit<WorkSession, 'id'>[] = [];
  let sessionStart = new Date(sorted[0].committedAt);
  let sessionEnd = sessionStart;
  let commitCount = 1;
  let hasAutoCommits = isAuto(sorted[0].message);

  for (let i = 1; i < sorted.length; i++) {
    const current = new Date(sorted[i].committedAt);
    const gap = current.getTime() - sessionEnd.getTime();
    const currentIsAuto = isAuto(sorted[i].message);

    // Use shorter gap threshold if either commit is auto
    const gapThreshold = (hasAutoCommits || currentIsAuto) ? AUTO_SESSION_GAP_MS : SESSION_GAP_MS;

    if (gap > gapThreshold) {
      // Close current session
      const spanMinutes = Math.round((sessionEnd.getTime() - sessionStart.getTime()) / 60000);
      const durationMinutes = hasAutoCommits
        ? Math.max(1, spanMinutes) // Auto: real time (at least 1 min)
        : spanMinutes + (commitCount * MINUTES_PER_COMMIT); // Manual: span + estimated padding

      sessions.push({
        projectId,
        startedAt: sessionStart.toISOString(),
        endedAt: sessionEnd.toISOString(),
        durationMinutes,
        commitCount,
      });

      sessionStart = current;
      sessionEnd = current;
      commitCount = 1;
      hasAutoCommits = currentIsAuto;
    } else {
      sessionEnd = current;
      commitCount++;
      if (currentIsAuto) hasAutoCommits = true;
    }
  }

  // Close last session
  const spanMinutes = Math.round((sessionEnd.getTime() - sessionStart.getTime()) / 60000);
  const durationMinutes = hasAutoCommits
    ? Math.max(1, spanMinutes)
    : spanMinutes + (commitCount * MINUTES_PER_COMMIT);

  sessions.push({
    projectId,
    startedAt: sessionStart.toISOString(),
    endedAt: sessionEnd.toISOString(),
    durationMinutes,
    commitCount,
  });

  return sessions;
}

export const GitService = {
  isGitRepo,
  readCommits,
  calculateSessions,
};
