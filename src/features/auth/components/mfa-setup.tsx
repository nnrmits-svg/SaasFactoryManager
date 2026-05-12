'use client';

// 2FA setup con TOTP (Time-based One-Time Password). Supabase soporta nativo.
// Requisito: MFA habilitado en Supabase dashboard → Authentication → MFA → TOTP.

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';

type Status = 'idle' | 'loading' | 'enrolling' | 'verifying' | 'done' | 'error';

export function MfaSetup() {
  const [status, setStatus] = useState<Status>('loading');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [hasFactor, setHasFactor] = useState(false);

  useEffect(() => {
    checkExisting();
  }, []);

  async function checkExisting() {
    const supabase = createClient();
    const { data } = await supabase.auth.mfa.listFactors();
    const verified = data?.totp?.find((f) => f.status === 'verified');
    setHasFactor(!!verified);
    setStatus('idle');
  }

  async function startEnrollment() {
    setError(null);
    setStatus('enrolling');
    const supabase = createClient();
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: `Factory Manager - ${new Date().toLocaleDateString()}`,
    });
    if (error) {
      setError(error.message);
      setStatus('idle');
      return;
    }
    if (data) {
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setFactorId(data.id);
    }
  }

  async function verify() {
    if (!factorId || code.length !== 6) return;
    setError(null);
    setStatus('verifying');
    const supabase = createClient();

    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError || !challenge) {
      setError(challengeError?.message ?? 'Error creando challenge');
      setStatus('enrolling');
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code,
    });

    if (verifyError) {
      setError('Código incorrecto. Intentá de nuevo.');
      setStatus('enrolling');
      return;
    }

    setStatus('done');
    setHasFactor(true);
  }

  async function unenroll() {
    if (!confirm('¿Desactivar 2FA? Tu cuenta queda más expuesta.')) return;
    const supabase = createClient();
    const { data } = await supabase.auth.mfa.listFactors();
    const totp = data?.totp?.[0];
    if (!totp) return;
    await supabase.auth.mfa.unenroll({ factorId: totp.id });
    setHasFactor(false);
    setStatus('idle');
    setQrCode(null);
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-white mb-1">Autenticación de Dos Factores (2FA)</h2>
        <p className="text-sm text-gray-400">
          Agrega una capa extra de seguridad. Usá una app como Google Authenticator, Authy o 1Password.
        </p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
        {status === 'loading' && <p className="text-sm text-gray-500">Cargando estado...</p>}

        {status !== 'loading' && hasFactor && status !== 'enrolling' && status !== 'verifying' && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-fluya-green">
              ✅ 2FA activado en esta cuenta
            </p>
            <button
              onClick={unenroll}
              className="text-sm text-red-400 hover:text-red-300 transition-colors"
            >
              Desactivar
            </button>
          </div>
        )}

        {status === 'idle' && !hasFactor && (
          <button
            onClick={startEnrollment}
            className="px-4 py-2 bg-gradient-to-r from-fluya-purple to-fluya-blue text-white rounded-xl text-sm font-medium transition-all"
          >
            Activar 2FA
          </button>
        )}

        {qrCode && (status === 'enrolling' || status === 'verifying') && (
          <div className="space-y-4">
            <p className="text-sm text-gray-300">
              1. Escaneá este QR con tu app de autenticación:
            </p>
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrCode} alt="QR Code 2FA" className="w-44 h-44 rounded-lg bg-white p-2" />
              {secret && (
                <div className="space-y-1">
                  <p className="text-xs text-gray-500">O ingresá manualmente este código:</p>
                  <code className="text-xs text-gray-300 font-mono bg-white/5 px-2 py-1 rounded break-all">
                    {secret}
                  </code>
                </div>
              )}
            </div>
            <p className="text-sm text-gray-300">2. Ingresá el código de 6 dígitos que muestra la app:</p>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-center text-xl tracking-[0.3em] w-32 focus:outline-none focus:border-fluya-purple"
                autoFocus
              />
              <button
                onClick={verify}
                disabled={code.length !== 6 || status === 'verifying'}
                className="px-4 py-2 bg-fluya-green/10 text-fluya-green border border-fluya-green/30 rounded-xl text-sm font-medium disabled:opacity-40 transition-all"
              >
                {status === 'verifying' ? 'Verificando...' : 'Verificar'}
              </button>
            </div>
          </div>
        )}

        {status === 'done' && (
          <p className="text-fluya-green text-sm">
            ✅ 2FA configurado correctamente. La próxima vez que entres te va a pedir el código.
          </p>
        )}

        {error && (
          <p className="text-red-400 text-sm">{error}</p>
        )}
      </div>
    </section>
  );
}
