import { NextResponse } from 'next/server';
import { AutoCommitService } from '@/features/factory-manager/services/auto-commit-service';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/tracking — Returns all active tracking sessions + status for a specific project
 * Query: ?projectPath=/path/to/project (optional, returns all if omitted)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectPath = searchParams.get('projectPath');

  if (projectPath) {
    const status = AutoCommitService.getStatus(projectPath);
    return NextResponse.json(status);
  }

  const active = AutoCommitService.getAllActive();
  return NextResponse.json({ active });
}

/**
 * POST /api/tracking — Start or stop tracking
 * Body: { action: 'start' | 'stop', projectPath: string, projectId: string }
 */
export async function POST(request: Request) {
  const body = await request.json();
  const { action, projectPath, projectId } = body;

  if (!action || !projectPath) {
    return NextResponse.json({ error: 'Missing action or projectPath' }, { status: 400 });
  }

  if (action === 'start') {
    // Check if already tracking
    const current = AutoCommitService.getStatus(projectPath);
    if (current.isTracking) {
      return NextResponse.json({ error: 'Already tracking this project', sessionId: current.sessionId }, { status: 409 });
    }

    // Create session in Supabase
    const supabase = await createClient();
    const { data: session, error } = await supabase
      .from('tracking_sessions')
      .insert({ project_id: projectId, status: 'active', auto_commits: 0 })
      .select('id')
      .single();

    if (error || !session) {
      return NextResponse.json({ error: 'Failed to create tracking session' }, { status: 500 });
    }

    // Start file watcher
    AutoCommitService.startWatcher(projectPath, session.id);

    return NextResponse.json({ success: true, sessionId: session.id });
  }

  if (action === 'stop') {
    const status = AutoCommitService.getStatus(projectPath);
    if (!status.isTracking) {
      return NextResponse.json({ error: 'Not tracking this project' }, { status: 404 });
    }

    // Stop watcher
    const result = AutoCommitService.stopWatcher(projectPath);

    // Update session in Supabase
    if (status.sessionId) {
      const supabase = await createClient();
      await supabase
        .from('tracking_sessions')
        .update({
          status: 'stopped',
          ended_at: new Date().toISOString(),
          auto_commits: result.commitCount,
        })
        .eq('id', status.sessionId);
    }

    return NextResponse.json({ success: true, commitCount: result.commitCount });
  }

  return NextResponse.json({ error: 'Invalid action. Use start or stop.' }, { status: 400 });
}
