import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

const fmt = (n) => `$${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function CreateOrgForm({ onSuccess, onCancel }) {
  const [form, setForm] = useState({ name: '', initialAmount: '', isUnlimited: false, showBalanceToUsers: false });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) return setError('El nombre es requerido');
    if (!form.isUnlimited && (!form.initialAmount || parseFloat(form.initialAmount) <= 0)) return setError('Ingresá un monto inicial válido');
    setLoading(true);
    try { const org = await api.orgs.create(form); onSuccess(org); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-600 mb-1.5">Nombre de la organización</label>
        <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="w-full bg-slate-100 rounded-xl px-4 py-3.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm" placeholder="Ej: Empresa XYZ" autoFocus required />
      </div>

      <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer">
        <input type="checkbox" checked={form.isUnlimited} onChange={e => setForm(p => ({ ...p, isUnlimited: e.target.checked }))} className="w-5 h-5 text-emerald-500 rounded-lg" />
        <span className="text-sm font-medium text-slate-700">Sin monto límite</span>
      </label>

      {!form.isUnlimited && (
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1.5">Monto inicial</label>
          <div className="relative">
            <span className="absolute left-4 top-3.5 text-slate-400 text-sm font-medium">$</span>
            <input type="number" value={form.initialAmount} onChange={e => setForm(p => ({ ...p, initialAmount: e.target.value }))} className="w-full bg-slate-100 rounded-xl pl-8 pr-4 py-3.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm" placeholder="0.00" step="0.01" min="0.01" required />
          </div>
        </div>
      )}

      <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer">
        <input type="checkbox" checked={form.showBalanceToUsers} onChange={e => setForm(p => ({ ...p, showBalanceToUsers: e.target.checked }))} className="w-5 h-5 text-emerald-500 rounded-lg" />
        <span className="text-sm font-medium text-slate-700">Usuarios pueden ver el saldo</span>
      </label>

      {error && <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3"><p className="text-red-600 text-sm">{error}</p></div>}

      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onCancel} className="flex-1 bg-slate-100 text-slate-600 rounded-xl py-3.5 text-sm font-semibold">Cancelar</button>
        <button type="submit" disabled={loading} className="flex-1 bg-emerald-500 text-white rounded-xl py-3.5 text-sm font-semibold disabled:opacity-50">{loading ? 'Creando...' : 'Crear'}</button>
      </div>
    </form>
  );
}

function JoinOrgForm({ onSuccess, onCancel }) {
  const [code, setCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (code.trim().length !== 5) return setError('El código debe tener exactamente 5 dígitos');
    if (!displayName.trim()) return setError('Tu nombre es requerido');
    setLoading(true);
    try { const res = await api.orgs.join(code.trim(), displayName.trim()); setSuccess(res.message); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  if (success) return (
    <div className="text-center py-6">
      <div className="text-5xl mb-4">✅</div>
      <p className="text-slate-700 font-semibold">{success}</p>
      <p className="text-slate-500 text-sm mt-2">Te avisarán cuando seas aceptado</p>
      <button onClick={onSuccess} className="mt-6 w-full bg-emerald-500 text-white rounded-xl py-3.5 text-sm font-semibold">Entendido</button>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-600 mb-1.5">Código de organización</label>
        <input
          type="text" inputMode="numeric" value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
          className="w-full bg-slate-100 rounded-xl px-4 py-4 text-slate-800 text-center text-3xl tracking-[0.4em] font-bold focus:outline-none focus:ring-2 focus:ring-emerald-400"
          placeholder="00000" maxLength={5} autoFocus required
        />
        <p className="text-xs text-slate-400 mt-2 text-center">Pedile el código al administrador</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-600 mb-1.5">Tu nombre en esta organización</label>
        <input
          type="text" value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          className="w-full bg-slate-100 rounded-xl px-4 py-3.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm"
          placeholder="¿Cómo te van a ver?" required
        />
      </div>
      {error && <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3"><p className="text-red-600 text-sm">{error}</p></div>}
      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onCancel} className="flex-1 bg-slate-100 text-slate-600 rounded-xl py-3.5 text-sm font-semibold">Cancelar</button>
        <button type="submit" disabled={loading} className="flex-1 bg-emerald-500 text-white rounded-xl py-3.5 text-sm font-semibold disabled:opacity-50">{loading ? 'Enviando...' : 'Enviar solicitud'}</button>
      </div>
    </form>
  );
}

export default function Home() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  useEffect(() => {
    api.orgs.list().then(setOrgs).catch(console.error).finally(() => setLoading(false));
  }, []);

  function handleOrgCreated(org) {
    setOrgs(prev => [...prev, org]);
    setModal(null);
    navigate(`/org/${org.id}`);
  }

  const displayName = user?.full_name || user?.username || '';
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-emerald-900 flex flex-col">
      {/* Header — full viewport width, text against edges */}
      <div className="px-5 pt-12 pb-6 flex items-center justify-between">
        {/* Greeting — floating card bleeding from left edge */}
        <div className="-ml-5 pl-5 pr-8 py-3 bg-gradient-to-r from-emerald-500/20 via-emerald-500/8 to-transparent rounded-r-2xl border-r border-t border-b border-emerald-400/15">
          <p className="text-emerald-400 text-sm">Bienvenido,</p>
          <p className="text-white text-xl font-bold mt-0.5">{displayName}</p>
        </div>
        <button className="w-10 h-10 bg-white/15 rounded-full flex items-center justify-center text-white font-bold text-sm border border-white/20 flex-shrink-0">
          {initials}
        </button>
      </div>

      {/* Body — centered column */}
      <div className="flex-1 max-w-lg w-full mx-auto px-4 py-2 pb-24">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-1">Mis organizaciones</p>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-500 text-sm">Cargando...</div>
        ) : orgs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center text-4xl mb-4 border border-white/20">🏢</div>
            <p className="text-slate-300 font-semibold">Sin organizaciones</p>
            <p className="text-slate-500 text-sm mt-1">Tocá <strong className="text-slate-400">+</strong> para crear o unirte a una</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orgs.map(org => (
              <button key={org.id} onClick={() => navigate(`/org/${org.id}`)} className="w-full bg-white rounded-2xl p-5 shadow-xl text-left active:scale-95 transition">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-base truncate">{org.name}</p>
                    <p className="text-2xl font-bold text-emerald-600 mt-2">{fmt(org.current_balance)}</p>
                    <p className="text-xs text-slate-400 mt-0.5">saldo disponible</p>
                    {org.reimbursement_balance > 0 && (
                      <p className="text-sm font-semibold text-blue-500 mt-2">Te deben {fmt(org.reimbursement_balance)}</p>
                    )}
                  </div>
                  <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ml-3 flex-shrink-0 ${org.role === 'admin' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {org.role === 'admin' ? 'Admin' : 'Usuario'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Logout */}
      <div className="pb-8 pt-2 text-center">
        <button onClick={logout} className="text-xs text-slate-600">Cerrar sesión</button>
      </div>

      {/* FAB */}
      <button
        onClick={() => setModal('choose')}
        className="fixed bottom-6 right-5 w-14 h-14 bg-emerald-500 text-white rounded-full shadow-lg shadow-emerald-900/50 flex items-center justify-center active:bg-emerald-600 transition active:scale-95"
      >
        <span className="text-3xl leading-none mb-0.5">+</span>
      </button>

      {modal === 'choose' && (
        <Modal title="¿Qué querés hacer?" onClose={() => setModal(null)}>
          <div className="space-y-3">
            {[
              { key: 'create', icon: '🏢', iconBg: 'bg-emerald-100', label: 'Nueva organización', sub: 'Vas a ser el administrador' },
              { key: 'join', icon: '🔑', iconBg: 'bg-blue-100', label: 'Organización existente', sub: 'Usá un código de 5 dígitos' },
            ].map(opt => (
              <button key={opt.key} onClick={() => setModal(opt.key)} className="w-full flex items-center gap-4 p-4 bg-slate-50 rounded-2xl active:bg-slate-100 transition text-left">
                <div className={`w-12 h-12 ${opt.iconBg} rounded-2xl flex items-center justify-center text-2xl flex-shrink-0`}>{opt.icon}</div>
                <div><p className="font-semibold text-slate-800">{opt.label}</p><p className="text-xs text-slate-500 mt-0.5">{opt.sub}</p></div>
                <span className="ml-auto text-slate-300 text-lg">›</span>
              </button>
            ))}
          </div>
        </Modal>
      )}

      {modal === 'create' && (
        <Modal title="Nueva organización" onClose={() => setModal(null)}>
          <CreateOrgForm onSuccess={handleOrgCreated} onCancel={() => setModal('choose')} />
        </Modal>
      )}

      {modal === 'join' && (
        <Modal title="Unirse a organización" onClose={() => setModal(null)}>
          <JoinOrgForm onSuccess={() => setModal(null)} onCancel={() => setModal('choose')} />
        </Modal>
      )}
    </div>
  );
}
