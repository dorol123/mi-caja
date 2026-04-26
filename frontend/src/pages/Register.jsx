import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';

export default function Register() {
  const [form, setForm] = useState({ username: '', password: '', confirm: '' });
  const [fullName, setFullName] = useState('');
  const [step, setStep] = useState(1);
  const [pendingAuth, setPendingAuth] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleRegister(e) {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) return setError('Las contraseñas no coinciden');
    setLoading(true);
    try {
      const res = await api.auth.register({ username: form.username, password: form.password });
      localStorage.setItem('token', res.token);
      setPendingAuth(res);
      setStep(2);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleName(e) {
    e.preventDefault();
    setError('');
    if (!fullName.trim()) return setError('Tu nombre es requerido');
    setLoading(true);
    try {
      await api.auth.updateMe({ full_name: fullName.trim() });
      login({ ...pendingAuth.user, full_name: fullName.trim() }, pendingAuth.token);
      navigate('/');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const wrapper = (children) => (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-emerald-950 flex items-center justify-center px-4 relative overflow-hidden">
      <div className="w-full max-w-sm flex flex-col relative z-10">{children}</div>
    </div>
  );

  const brandSection = (subtitle) => (
    <div className="flex flex-col items-center justify-center px-8 pb-6 pt-10">
      <div className="rounded-[30px] shadow-2xl shadow-emerald-900/60 mb-7">
        <Logo size={90} />
      </div>
      <h1 className="text-[2.6rem] font-bold text-white tracking-tight leading-none">Mi Caja</h1>
      <p className="text-emerald-400/60 text-xs mt-2.5 tracking-[0.2em] uppercase font-semibold">
        {subtitle}
      </p>
    </div>
  );

  if (step === 2) return wrapper(
    <>
      {brandSection('¡Cuenta creada!')}
      <div className="pb-10">
        <div className="bg-white rounded-3xl px-6 pt-7 pb-8 shadow-2xl">
          <h2 className="text-[1.35rem] font-bold text-slate-900 mb-1">¿Cómo te llamás?</h2>
          <p className="text-sm text-slate-400 mb-6">Este nombre aparecerá en tu inicio.</p>
          <form onSubmit={handleName} className="space-y-4">
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-[14px] text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent text-[15px]"
              placeholder="Ej: Facundo"
              autoFocus required
            />
            {error && (
              <div className="flex items-center gap-2.5 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
                <span className="text-red-400 text-sm flex-shrink-0">⚠</span>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}
            <button type="submit" disabled={loading} className="w-full bg-emerald-500 text-white rounded-2xl py-4 font-bold text-[15px] shadow-lg shadow-emerald-500/25 active:scale-[0.98] transition-transform disabled:opacity-50">
              {loading ? 'Guardando…' : 'Continuar'}
            </button>
          </form>
        </div>
      </div>
    </>
  );

  return wrapper(
    <>
      {brandSection('Creá tu cuenta para empezar')}
      <div className="pb-10">
        <div className="bg-white rounded-3xl px-6 pt-7 pb-8 shadow-2xl">
          <h2 className="text-[1.35rem] font-bold text-slate-900 mb-6">Crear cuenta</h2>
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-2">Usuario</label>
              <input type="text" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-[14px] text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent text-[15px]" placeholder="mínimo 3 caracteres" autoFocus required />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-2">Contraseña</label>
              <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-[14px] text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent text-[15px]" placeholder="mínimo 6 caracteres" required />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-2">Confirmar contraseña</label>
              <input type="password" value={form.confirm} onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-[14px] text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent text-[15px]" placeholder="repetí la contraseña" required />
            </div>
            {error && (
              <div className="flex items-center gap-2.5 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
                <span className="text-red-400 text-sm flex-shrink-0">⚠</span>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}
            <button type="submit" disabled={loading} className="w-full bg-emerald-500 text-white rounded-2xl py-4 font-bold text-[15px] shadow-lg shadow-emerald-500/25 active:scale-[0.98] transition-transform disabled:opacity-50 mt-1">
              {loading ? 'Creando cuenta…' : 'Crear cuenta'}
            </button>
          </form>
          <p className="text-center text-sm text-slate-400 mt-6">
            ¿Ya tenés cuenta?{' '}
            <Link to="/login" className="text-emerald-600 font-bold">Iniciar sesión</Link>
          </p>
        </div>
      </div>
    </>
  );
}
