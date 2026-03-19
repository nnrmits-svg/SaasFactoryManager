'use client';

import { useState, useEffect, useCallback } from 'react';

interface TrackingState {
  isTracking: boolean;
  isLoading: boolean;
  sessionId: string | null;
  commitCount: number;
  startedAt: string | null;
  error: string | null;
}

export function useTracking(projectPath: string, projectId: string) {
  const [state, setState] = useState<TrackingState>({
    isTracking: false,
    isLoading: true,
    sessionId: null,
    commitCount: 0,
    startedAt: null,
    error: null,
  });

  // Check current status on mount
  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch(`/api/tracking?projectPath=${encodeURIComponent(projectPath)}`);
        const data = await res.json();
        setState((prev) => ({
          ...prev,
          isTracking: data.isTracking ?? false,
          sessionId: data.sessionId ?? null,
          commitCount: data.commitCount ?? 0,
          isLoading: false,
        }));
      } catch {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    }
    checkStatus();
  }, [projectPath]);

  // Poll for commit count updates while tracking
  useEffect(() => {
    if (!state.isTracking) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/tracking?projectPath=${encodeURIComponent(projectPath)}`);
        const data = await res.json();
        setState((prev) => ({
          ...prev,
          commitCount: data.commitCount ?? prev.commitCount,
        }));
      } catch {
        // Silently ignore poll errors
      }
    }, 10_000); // Poll every 10 seconds

    return () => clearInterval(interval);
  }, [state.isTracking, projectPath]);

  const startTracking = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const res = await fetch('/api/tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', projectPath, projectId }),
      });
      const data = await res.json();

      if (!res.ok) {
        setState((prev) => ({ ...prev, isLoading: false, error: data.error }));
        return;
      }

      setState((prev) => ({
        ...prev,
        isTracking: true,
        sessionId: data.sessionId,
        commitCount: 0,
        startedAt: new Date().toISOString(),
        isLoading: false,
      }));
    } catch {
      setState((prev) => ({ ...prev, isLoading: false, error: 'Error al iniciar tracking' }));
    }
  }, [projectPath, projectId]);

  const stopTracking = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const res = await fetch('/api/tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop', projectPath }),
      });
      const data = await res.json();

      if (!res.ok) {
        setState((prev) => ({ ...prev, isLoading: false, error: data.error }));
        return;
      }

      setState((prev) => ({
        ...prev,
        isTracking: false,
        sessionId: null,
        commitCount: data.commitCount ?? prev.commitCount,
        startedAt: null,
        isLoading: false,
      }));
    } catch {
      setState((prev) => ({ ...prev, isLoading: false, error: 'Error al detener tracking' }));
    }
  }, [projectPath]);

  return { ...state, startTracking, stopTracking };
}
