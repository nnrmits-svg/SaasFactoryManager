'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signupWithEmail, loginWithGoogle } from '../services/auth-service';

export function SignupForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    setSuccess(null);
    const result = await signupWithEmail(formData);
    if (result?.error) {
      setError(result.error);
    } else if (result?.success) {
      setSuccess(result.success);
    }
    setLoading(false);
  }

  async function handleGoogle() {
    setLoading(true);
    const result = await loginWithGoogle();
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-xl mx-auto flex items-center justify-center bg-gradient-to-br from-pink-500 via-purple-500 to-purple-700 shadow-lg shadow-purple-500/30">
          <span className="text-white font-black text-xl leading-none">F</span>
        </div>
        <h1 className="text-2xl font-bold text-white">Crear cuenta</h1>
        <p className="text-white/50 text-sm">Empieza a gestionar tu fabrica</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-3 text-green-400 text-sm">
          {success}
        </div>
      )}

      <form action={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="full_name" className="text-sm text-white/70 block">Nombre</label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            required
            placeholder="Tu nombre"
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="text-sm text-white/70 block">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="tu@email.com"
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm text-white/70 block">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            placeholder="Minimo 6 caracteres"
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-medium rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40"
        >
          {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
        </button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/10" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-fluya-bg px-3 text-white/40">o continua con</span>
        </div>
      </div>

      <button
        onClick={handleGoogle}
        disabled={loading}
        className="w-full py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-medium rounded-lg transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        Google
      </button>

      <p className="text-center text-sm text-white/40">
        Ya tienes cuenta?{' '}
        <Link href="/login" className="text-purple-400 hover:text-purple-300 transition">
          Iniciar sesion
        </Link>
      </p>
    </div>
  );
}
