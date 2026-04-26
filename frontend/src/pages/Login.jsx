import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';

export default function Login() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { user, token } = await api.auth.login(form);
      login(user, token);
      navigate('/');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-emerald-950 flex items-center justify-center px-4 relative overflow-hidden">
    <div className="w-full max-w-sm flex flex-col relative z-10">

      {/* Brand */}
      <div className="flex flex-col items-center justify-center px-8 pb-6 pt-10">
        <div className="rounded-[30px] shadow-2xl shadow-emerald-900/60 mb-7">
          <Logo size={90} />
        </div>
        <h1 className="text-[2.6rem] font-bold text-white tracking-tight leading-none">Mi Caja</h1>
        <p className="text-emerald-400/60 text-xs mt-2.5 tracking-[0.2em] uppercase font-semibold">
          Gestión de caja chica
        </p>
      </div>

      {/* Form card */}
      <div className="px-0 pb-10">
        <div className="bg-white rounded-3xl px-6 pt-7 pb-8 shadow-2xl">
          <h2 className="text-[1.35rem] font-bold text-slate-900 mb-6">Iniciar sesión</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-2">
                Usuario
              </label>
              <input
                type="text"
                value={form.username}
                onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-[14px] text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent text-[15px]"
                placeholder="tu usuario"
                autoFocus required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-2">
                Contraseña
              </label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-[14px] text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent text-[15px]"
                placeholder="••••••"
                required
              />
            </div>

            {error && (
              <div className="flex items-center gap-2.5 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
                <span className="text-red-400 text-sm flex-shrink-0">⚠</span>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 text-white rounded-2xl py-4 font-bold text-[15px] shadow-lg shadow-emerald-500/25 active:scale-[0.98] transition-transform disabled:opacity-50 mt-1"
            >
              {loading ? 'Ingresando…' : 'Ingresar'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-400 mt-6">
            ¿No tenés cuenta?{' '}
            <Link to="/register" className="text-emerald-600 font-bold">Registrarse</Link>
          </p>
        </div>
      </div>
    </div>
    </div>
  );
}
