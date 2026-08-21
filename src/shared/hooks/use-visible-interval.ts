'use client';

import { useEffect, useRef } from 'react';

/**
 * Corre `callback` cada `delayMs`, pero SOLO mientras la pestaña esta visible.
 * La primera ejecucion siempre ocurre al montar (para que la UI tenga datos);
 * el intervalo se pausa al pasar la pestaña a segundo plano y se reanuda —
 * con un refresh inmediato — al volver a ella.
 *
 * Motivo (2026-08-20): una pestaña olvidada de /mission-control seguia pegandole
 * a Supabase cada 20s (4 requests por vuelta, ~17k/dia) aunque nadie la mirara.
 * Ese goteo constante agoto el Disk IO Budget del proyecto y tumbo Auth: login
 * colgado, middleware con 504 y timeouts de 300s en /login. Ver Bitacora.md.
 */
export function useVisibleInterval(callback: () => void, delayMs: number) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null;

    const tick = () => savedCallback.current();
    const start = () => {
      if (id === null) id = setInterval(tick, delayMs);
    };
    const stop = () => {
      if (id !== null) {
        clearInterval(id);
        id = null;
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        tick();
        start();
      } else {
        stop();
      }
    };

    tick();
    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [delayMs]);
}
