import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import ExpenseForm from '../components/ExpenseForm';

const fmt = (n) => `$${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (d) => new Date(d).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });

const mvIcon = {
  expense_approved: '✅', expense_denied: '❌', member_joined: '👤',
  member_denied: '🚫', member_removed: '🗑️', member_promoted: '⭐',
  cash_settled: '💸', balance_reset: '🔄', reimbursement_settled: '💰', settings_updated: '⚙️',
};

function ZoomableImage({ src, alt, onClose }) {
  const [scale, setScale] = useState(1);
  const containerRef = useRef();
  const lastDistRef = useRef(null);
  const scaleRef = useRef(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const getDist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const onTS = (e) => { if (e.touches.length === 2) lastDistRef.current = getDist(e.touches); };
    const onTM = (e) => {
      if (e.touches.length === 2 && lastDistRef.current !== null) {
        e.preventDefault();
        const d = getDist(e.touches);
        scaleRef.current = Math.max(1, Math.min(6, scaleRef.current * d / lastDistRef.current));
        lastDistRef.current = d;
        setScale(scaleRef.current);
      }
    };
    const onTE = (e) => { if (e.touches.length < 2) lastDistRef.current = null; };
    el.addEventListener('touchstart', onTS, { passive: true });
    el.addEventListener('touchmove', onTM, { passive: false });
    el.addEventListener('touchend', onTE, { passive: true });
    return () => { el.removeEventListener('touchstart', onTS); el.removeEventListener('touchmove', onTM); el.removeEventListener('touchend', onTE); };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/90 z-50" onClick={onClose}>
      <div ref={containerRef} className="w-full h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
        <img src={src} alt={alt} draggable={false} style={{ transform: `scale(${scale})`, transformOrigin: 'center', userSelect: 'none' }} className="max-w-full max-h-full rounded-2xl" onDoubleClick={() => { const ns = scale > 1 ? 1 : 2.5; scaleRef.current = ns; setScale(ns); }} />
      </div>
      <button onClick={onClose} className="absolute top-6 right-5 text-white bg-black/50 rounded-full w-10 h-10 flex items-center justify-center text-lg font-bold z-10">✕</button>
    </div>
  );
}

function ExpenseCard({ expense, isAdmin, onEdit, onCancel }) {
  const [imgOpen, setImgOpen] = useState(false);
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
      {expense.photo_path && (
        <button onClick={() => setImgOpen(true)} className="w-full">
          <img src={`/uploads/${expense.photo_path}`} alt="Recibo" className="w-full h-40 object-cover" />
        </button>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-800 text-sm">{expense.description}</p>
            {isAdmin && <p className="text-xs text-slate-500 mt-0.5">{expense.display_name}</p>}
            <p className="text-xs text-slate-400 mt-0.5">{fmtDate(expense.submitted_at)}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="font-bold text-slate-800">{fmt(expense.amount)}</p>
            <div className="mt-1"><StatusBadge status={expense.status} /></div>
          </div>
        </div>
        {expense.status === 'pending' && !isAdmin && (
          <div className="flex gap-2 mt-3">
            <button onClick={() => onEdit(expense)} className="flex-1 bg-slate-100 text-slate-600 rounded-xl py-2 text-xs font-semibold">Editar</button>
            <button onClick={() => onCancel(expense)} className="flex-1 bg-red-50 text-red-500 rounded-xl py-2 text-xs font-semibold">Cancelar</button>
          </div>
        )}
      </div>
      {imgOpen && <ZoomableImage src={`/uploads/${expense.photo_path}`} alt="Recibo" onClose={() => setImgOpen(false)} />}
    </div>
  );
}

function PendingExpenseCard({ expense, onAction }) {
  const [loading, setLoading] = useState(false);
  const [imgOpen, setImgOpen] = useState(false);
  async function act(action) { setLoading(true); try { await onAction(expense.id, action); } finally { setLoading(false); } }
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
      {expense.photo_path && (
        <button onClick={() => setImgOpen(true)} className="w-full">
          <img src={`/uploads/${expense.photo_path}`} alt="Recibo" className="w-full h-52 object-cover" />
        </button>
      )}
      <div className="p-4">
        <div className="flex justify-between items-start gap-2">
          <div>
            <p className="font-semibold text-slate-800">{expense.description}</p>
            <p className="text-xs text-slate-500 mt-0.5">{expense.display_name} · {fmtDate(expense.submitted_at)}</p>
          </div>
          <p className="text-xl font-bold text-slate-800 flex-shrink-0">{fmt(expense.amount)}</p>
        </div>
        <div className="flex gap-3 mt-4">
          <button onClick={() => act('deny')} disabled={loading} className="flex-1 bg-red-50 text-red-600 rounded-xl py-3 text-sm font-semibold disabled:opacity-50">Denegar</button>
          <button onClick={() => act('approve')} disabled={loading} className="flex-1 bg-emerald-500 text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-50">Aprobar</button>
        </div>
      </div>
      {imgOpen && <ZoomableImage src={`/uploads/${expense.photo_path}`} alt="Recibo" onClose={() => setImgOpen(false)} />}
    </div>
  );
}

function BottomTab({ icon, label, active, onClick, badge }) {
  return (
    <button onClick={onClick} className={`flex-1 flex flex-col items-center py-2 relative transition ${active ? 'text-emerald-600' : 'text-slate-400'}`}>
      <span className="text-xl">{icon}</span>
      <span className="text-[10px] font-medium mt-0.5">{label}</span>
      {badge > 0 && <span className="absolute top-1 right-1/4 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{badge}</span>}
    </button>
  );
}

export default function OrgPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [org, setOrg] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [members, setMembers] = useState([]);
  const [pendingMembers, setPendingMembers] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('gastos');
  const [solicitudTab, setSolicitudTab] = useState('gastos');

  const [expenseModal, setExpenseModal] = useState(null);
  const [settleModal, setSettleModal] = useState(false);
  const [editDisplayNameModal, setEditDisplayNameModal] = useState(null);
  const [memberConfigModal, setMemberConfigModal] = useState(null);
  const [settleForm, setSettleForm] = useState({ type: 'complete', amount: '' });
  const [settleReimburseModal, setSettleReimburseModal] = useState(null);
  const [settleReimburseForm, setSettleReimburseForm] = useState({ type: 'complete', amount: '' });
  const [editOrgModal, setEditOrgModal] = useState(false);
  const [editForm, setEditForm] = useState({});

  const isAdmin = org?.role === 'admin';

  const loadAll = useCallback(async () => {
    try {
      const [orgData, expData] = await Promise.all([api.orgs.get(id), api.expenses.list(id)]);
      setOrg(orgData);
      setExpenses(expData);
      if (orgData.role === 'admin') {
        const [mem, pend, mvs] = await Promise.all([api.members.list(id), api.members.pending(id), api.members.movements(id)]);
        setMembers(mem);
        setPendingMembers(pend);
        setMovements(mvs);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function handleExpenseSaved(saved) {
    setExpenses(prev => { const idx = prev.findIndex(e => e.id === saved.id); if (idx >= 0) { const n = [...prev]; n[idx] = saved; return n; } return [saved, ...prev]; });
    setExpenseModal(null);
    const updated = await api.orgs.get(id);
    setOrg(updated);
  }

  async function handleCancelExpense(expense) {
    const fd = new FormData();
    fd.append('action', 'cancel');
    const saved = await api.expenses.update(id, expense.id, fd);
    setExpenses(prev => prev.map(e => e.id === saved.id ? saved : e));
  }

  async function handleExpenseAction(expId, action) {
    const fd = new FormData();
    fd.append('action', action);
    await api.expenses.update(id, expId, fd);
    await loadAll();
  }

  async function handleMemberAction(userId, action, amount) {
    try { await api.members.action(id, userId, action, amount); await loadAll(); }
    catch (e) { alert(e.message); }
  }

  async function handleSettle(e) {
    e.preventDefault();
    try {
      const res = await api.orgs.settle(id, settleForm);
      setOrg(prev => ({ ...prev, current_balance: res.current_balance }));
      setSettleModal(false);
      await loadAll();
    } catch (e) { alert(e.message); }
  }

  async function handleSettleReimburse(e) {
    e.preventDefault();
    const amount = settleReimburseForm.type === 'complete' ? undefined : settleReimburseForm.amount;
    try { await handleMemberAction(settleReimburseModal.id, 'settle_reimbursement', amount); setSettleReimburseModal(null); }
    catch (e) { alert(e.message); }
  }

  async function handleEditDisplayName(e) {
    e.preventDefault();
    const dn = e.target.displayName.value.trim();
    if (!dn) return;
    try {
      await api.members.action(id, editDisplayNameModal.id, 'set_display_name', undefined, dn);
      setMembers(prev => prev.map(m => m.id === editDisplayNameModal.id ? { ...m, display_name: dn } : m));
      setEditDisplayNameModal(null);
    } catch (e) { alert(e.message); }
  }

  async function handleEditOrg(e) {
    e.preventDefault();
    try { const updated = await api.orgs.update(id, editForm); setOrg(prev => ({ ...prev, ...updated })); setEditOrgModal(false); }
    catch (e) { alert(e.message); }
  }

  function openEditOrg() {
    setEditForm({ name: org.name, initialAmount: org.initial_amount ?? '', isUnlimited: !!org.is_unlimited, frequencyDays: org.frequency_days, showBalanceToUsers: !!org.show_balance_to_users });
    setEditOrgModal(true);
  }

  const pendingExpenses = expenses.filter(e => e.status === 'pending');
  const nonPendingExpenses = expenses.filter(e => e.status !== 'pending');
  const pendingCount = pendingExpenses.length + pendingMembers.length;

  if (loading) return <div className="min-h-screen bg-slate-100 flex items-center justify-center text-slate-400 text-sm">Cargando...</div>;
  if (!org) return <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center gap-3"><p className="text-slate-500">Organización no encontrada</p><button onClick={() => navigate('/')} className="text-emerald-600 text-sm font-semibold">Volver</button></div>;

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col pb-24">
        <div className="bg-emerald-600 px-5 pt-10 pb-5">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => navigate('/')} className="text-emerald-200 text-2xl leading-none">‹</button>
            <div className="flex-1">
              <p className="text-white font-bold text-lg leading-tight">{org.name}</p>
              <span className="text-xs text-emerald-200">Usuario</span>
            </div>
          </div>
          <div className="bg-emerald-700/50 rounded-2xl p-4 space-y-1">
            {org.show_balance_to_users && (<div className="flex justify-between items-center"><p className="text-emerald-200 text-xs">Saldo de la caja</p><p className="text-white font-bold">{fmt(org.current_balance)}</p></div>)}
            {org.reimbursement_balance > 0 && (<div className="flex justify-between items-center"><p className="text-emerald-200 text-xs">Te deben</p><p className="text-blue-300 font-bold">{fmt(org.reimbursement_balance)}</p></div>)}
            {!org.show_balance_to_users && org.reimbursement_balance === 0 && (<p className="text-emerald-300 text-xs text-center">Sin saldo pendiente</p>)}
          </div>
        </div>
        <div className="flex-1 px-4 py-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-1">Mis gastos</p>
          {expenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-4xl shadow-sm mb-4">📋</div>
              <p className="text-slate-600 font-semibold">Sin gastos todavía</p>
              <p className="text-slate-400 text-sm mt-1">Tocá <strong>+</strong> para enviar uno</p>
            </div>
          ) : (
            <div className="space-y-3">
              {expenses.map(exp => <ExpenseCard key={exp.id} expense={exp} isAdmin={false} onEdit={exp => setExpenseModal({ expense: exp })} onCancel={handleCancelExpense} />)}
            </div>
          )}
        </div>
        <button onClick={() => setExpenseModal({})} className="fixed bottom-6 right-5 w-14 h-14 bg-emerald-500 text-white rounded-full shadow-lg flex items-center justify-center active:bg-emerald-600 transition active:scale-95"><span className="text-3xl leading-none mb-0.5">+</span></button>
        {expenseModal !== null && (
          <Modal title={expenseModal.expense ? 'Editar gasto' : 'Nuevo gasto'} onClose={() => setExpenseModal(null)}>
            <ExpenseForm orgId={id} expense={expenseModal.expense} onSave={handleExpenseSaved} onCancel={() => setExpenseModal(null)} />
          </Modal>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col pb-20">
      <div className="bg-emerald-600 px-5 pt-10 pb-5">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate('/')} className="text-emerald-200 text-2xl leading-none">‹</button>
          <div className="flex-1">
            <p className="text-white font-bold text-lg leading-tight">{org.name}</p>
            <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full font-medium">Admin</span>
          </div>
          <div className="text-right">
            <p className="text-emerald-300 text-xs">Código</p>
            <p className="text-white font-mono font-bold tracking-widest text-base">{org.code}</p>
          </div>
        </div>
        <div className="bg-white/15 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-emerald-200 text-xs uppercase tracking-wide">Saldo disponible</p>
            <p className="text-white text-3xl font-bold mt-1">{fmt(org.current_balance)}</p>
            {!org.is_unlimited && org.next_reset_at && (<p className="text-emerald-300 text-xs mt-1">Recarga: {new Date(org.next_reset_at).toLocaleDateString('es-AR')}</p>)}
          </div>
          <button onClick={() => setSettleModal(true)} className="bg-white/20 border border-white/30 text-white rounded-xl px-4 py-2.5 text-sm font-semibold">💸 Saldar</button>
        </div>
      </div>

      <div className="flex-1 px-4 py-5 overflow-y-auto">
        {tab === 'gastos' && (
          <>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-1">Todos los gastos</p>
            {nonPendingExpenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center"><div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-4xl shadow-sm mb-4">📋</div><p className="text-slate-600 font-semibold">Sin gastos registrados</p></div>
            ) : (
              <div className="space-y-3">{nonPendingExpenses.map(exp => <ExpenseCard key={exp.id} expense={exp} isAdmin={true} />)}</div>
            )}
            <button onClick={() => setExpenseModal({})} className="fixed bottom-24 right-5 w-14 h-14 bg-emerald-500 text-white rounded-full shadow-lg text-3xl flex items-center justify-center active:bg-emerald-600 transition active:scale-95">+</button>
          </>
        )}

        {tab === 'solicitudes' && (
          <>
            <div className="flex gap-2 mb-4">
              <button onClick={() => setSolicitudTab('gastos')} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${solicitudTab === 'gastos' ? 'bg-emerald-500 text-white' : 'bg-white text-slate-600'}`}>Gastos {pendingExpenses.length > 0 && `(${pendingExpenses.length})`}</button>
              <button onClick={() => setSolicitudTab('miembros')} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${solicitudTab === 'miembros' ? 'bg-emerald-500 text-white' : 'bg-white text-slate-600'}`}>Miembros {pendingMembers.length > 0 && `(${pendingMembers.length})`}</button>
            </div>
            {solicitudTab === 'gastos' && (
              pendingExpenses.length === 0 ? (<div className="flex flex-col items-center justify-center py-16 text-center"><div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-4xl shadow-sm mb-4">✅</div><p className="text-slate-600 font-semibold">Sin gastos pendientes</p></div>) :
              (<div className="space-y-4">{pendingExpenses.map(exp => <PendingExpenseCard key={exp.id} expense={exp} onAction={handleExpenseAction} />)}</div>)
            )}
            {solicitudTab === 'miembros' && (
              pendingMembers.length === 0 ? (<div className="flex flex-col items-center justify-center py-16 text-center"><div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-4xl shadow-sm mb-4">✅</div><p className="text-slate-600 font-semibold">Sin solicitudes pendientes</p></div>) : (
                <div className="space-y-3">
                  {pendingMembers.map(m => (
                    <div key={m.id} className="bg-white rounded-2xl p-4 shadow-sm">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-600 text-sm">{(m.display_name || '?').slice(0,2).toUpperCase()}</div>
                        <div><p className="font-semibold text-slate-800">{m.display_name || '(Sin nombre)'}</p><p className="text-xs text-slate-400">{fmtDate(m.requested_at)}</p></div>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => handleMemberAction(m.id, 'deny')} className="flex-1 bg-red-50 text-red-600 rounded-xl py-2.5 text-sm font-semibold">Denegar</button>
                        <button onClick={() => handleMemberAction(m.id, 'approve')} className="flex-1 bg-emerald-500 text-white rounded-xl py-2.5 text-sm font-semibold">Aprobar</button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </>
        )}

        {tab === 'movimientos' && (
          <>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-1">Historial</p>
            {movements.length === 0 ? (<div className="flex flex-col items-center justify-center py-16 text-center"><div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-4xl shadow-sm mb-4">📊</div><p className="text-slate-600 font-semibold">Sin movimientos todavía</p></div>) : (
              <div className="space-y-2">
                {movements.map(mv => (
                  <div key={mv.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-start gap-3">
                    <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center text-lg flex-shrink-0">{mvIcon[mv.type] || '📌'}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-800 font-medium leading-snug">{mv.description}</p>
                      <div className="flex flex-wrap gap-x-2 mt-1">
                        {mv.affected_display_name && <p className="text-xs text-slate-400"><span className="text-slate-600">{mv.affected_display_name}</span></p>}
                        {mv.amount != null && <p className="text-xs text-slate-400">· <span className="font-medium text-slate-600">{fmt(mv.amount)}</span></p>}
                      </div>
                      <p className="text-xs text-slate-300 mt-1">{fmtDate(mv.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'ajustes' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-slate-800">Organización</p>
                <button onClick={openEditOrg} className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-3 py-1.5 rounded-lg">Editar</button>
              </div>
              <div className="space-y-2.5">
                {[
                  ['Nombre', org.name],
                  ['Monto', org.is_unlimited ? 'Sin límite' : fmt(org.initial_amount)],
                  ...(!org.is_unlimited ? [['Frecuencia', `Cada ${org.frequency_days} días`]] : []),
                  ['Saldo visible', org.show_balance_to_users ? 'Sí' : 'No'],
                  ['Código', org.code],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between items-center">
                    <p className="text-sm text-slate-500">{label}</p>
                    <p className={`text-sm font-semibold text-slate-800 ${label === 'Código' ? 'font-mono tracking-widest' : ''}`}>{value}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="font-semibold text-slate-800 mb-3">Miembros ({members.length})</p>
              <div className="space-y-3">
                {members.map(m => (
                  <div key={m.id}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center font-bold text-emerald-700 text-xs flex-shrink-0">{(m.display_name || '?').slice(0,2).toUpperCase()}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-slate-800 text-sm truncate">{m.display_name || '(Sin nombre)'}</p>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${m.role === 'admin' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{m.role === 'admin' ? 'Admin' : 'Usuario'}{m.is_creator ? ' ★' : ''}</span>
                        </div>
                        {m.reimbursement_balance > 0 && <p className="text-xs text-blue-500 font-medium">Reintegro: {fmt(m.reimbursement_balance)}</p>}
                      </div>
                      {m.id !== user?.id && (
                        <div className="flex gap-1.5 flex-shrink-0">
                          {m.reimbursement_balance > 0 && <button onClick={() => { setSettleReimburseModal(m); setSettleReimburseForm({ type: 'complete', amount: '' }); }} className="text-xs bg-blue-50 text-blue-600 rounded-lg px-2.5 py-1.5 font-semibold">Saldar</button>}
                          <button onClick={() => setMemberConfigModal(m)} className="text-xs bg-slate-50 text-slate-600 rounded-lg px-2.5 py-1.5 font-semibold border border-slate-200">⚙️</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 flex safe-area-bottom shadow-lg">
        <BottomTab icon="📋" label="Gastos" active={tab === 'gastos'} onClick={() => setTab('gastos')} />
        <BottomTab icon="📥" label="Solicitudes" active={tab === 'solicitudes'} onClick={() => setTab('solicitudes')} badge={pendingCount} />
        <BottomTab icon="📊" label="Movimientos" active={tab === 'movimientos'} onClick={() => setTab('movimientos')} />
        <BottomTab icon="⚙️" label="Ajustes" active={tab === 'ajustes'} onClick={() => setTab('ajustes')} />
      </div>

      {tab === 'solicitudes' && (
        <button onClick={() => setExpenseModal({})} className="fixed bottom-24 right-5 w-14 h-14 bg-emerald-500 text-white rounded-full shadow-lg text-3xl flex items-center justify-center active:bg-emerald-600 transition active:scale-95">+</button>
      )}

      {expenseModal !== null && (<Modal title={expenseModal.expense ? 'Editar gasto' : 'Nuevo gasto'} onClose={() => setExpenseModal(null)}><ExpenseForm orgId={id} expense={expenseModal.expense} onSave={handleExpenseSaved} onCancel={() => setExpenseModal(null)} /></Modal>)}

      {settleModal && (
        <Modal title="Saldar caja" onClose={() => setSettleModal(false)}>
          <form onSubmit={handleSettle} className="space-y-3">
            {[{val:'complete', label:'Saldar completamente', sub:'El saldo vuelve al monto inicial'},{val:'custom', label:'Monto personalizado', sub:'Ingresá el monto a saldar'}].map(opt => (
              <label key={opt.val} className={`flex items-center gap-3 p-4 rounded-2xl cursor-pointer border-2 transition ${settleForm.type === opt.val ? 'border-emerald-400 bg-emerald-50' : 'border-slate-100 bg-slate-50'}`}>
                <input type="radio" name="type" checked={settleForm.type === opt.val} onChange={() => setSettleForm({ type: opt.val, amount: '' })} className="w-4 h-4 text-emerald-500" />
                <div><p className="font-semibold text-slate-800 text-sm">{opt.label}</p><p className="text-xs text-slate-500">{opt.sub}</p></div>
              </label>
            ))}
            {settleForm.type === 'custom' && (
              <div className="relative"><span className="absolute left-4 top-3.5 text-slate-400 text-sm">$</span><input type="number" step="0.01" min="0.01" value={settleForm.amount} onChange={e => setSettleForm(p => ({ ...p, amount: e.target.value }))} className="w-full bg-slate-100 rounded-xl pl-8 pr-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" placeholder="0.00" required /></div>
            )}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setSettleModal(false)} className="flex-1 bg-slate-100 text-slate-600 rounded-xl py-3.5 text-sm font-semibold">Cancelar</button>
              <button type="submit" className="flex-1 bg-emerald-500 text-white rounded-xl py-3.5 text-sm font-semibold">Confirmar</button>
            </div>
          </form>
        </Modal>
      )}

      {settleReimburseModal && (
        <Modal title="Saldar reintegro" onClose={() => setSettleReimburseModal(null)}>
          <p className="text-sm text-slate-600 mb-4">Reintegro pendiente de <span className="font-bold">{settleReimburseModal.display_name || 'este miembro'}</span>: <span className="font-bold text-blue-600">{fmt(settleReimburseModal.reimbursement_balance)}</span></p>
          <form onSubmit={handleSettleReimburse} className="space-y-3">
            {[{val:'complete', label:'Saldar completamente'},{val:'custom', label:'Monto personalizado'}].map(opt => (
              <label key={opt.val} className={`flex items-center gap-3 p-4 rounded-2xl cursor-pointer border-2 transition ${settleReimburseForm.type === opt.val ? 'border-blue-400 bg-blue-50' : 'border-slate-100 bg-slate-50'}`}>
                <input type="radio" name="reimType" checked={settleReimburseForm.type === opt.val} onChange={() => setSettleReimburseForm(p => ({ ...p, type: opt.val }))} className="w-4 h-4 text-blue-500" />
                <p className="font-semibold text-slate-800 text-sm">{opt.label}</p>
              </label>
            ))}
            {settleReimburseForm.type === 'custom' && (
              <div className="relative"><span className="absolute left-4 top-3.5 text-slate-400 text-sm">$</span><input type="number" step="0.01" min="0.01" value={settleReimburseForm.amount} onChange={e => setSettleReimburseForm(p => ({ ...p, amount: e.target.value }))} className="w-full bg-slate-100 rounded-xl pl-8 pr-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" placeholder="0.00" required /></div>
            )}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setSettleReimburseModal(null)} className="flex-1 bg-slate-100 text-slate-600 rounded-xl py-3.5 text-sm font-semibold">Cancelar</button>
              <button type="submit" className="flex-1 bg-blue-500 text-white rounded-xl py-3.5 text-sm font-semibold">Confirmar pago</button>
            </div>
          </form>
        </Modal>
      )}

      {memberConfigModal && (
        <Modal title={memberConfigModal.display_name || 'Miembro'} onClose={() => setMemberConfigModal(null)}>
          <div className="space-y-3 pt-1">
            <button onClick={() => { setEditDisplayNameModal(memberConfigModal); setMemberConfigModal(null); }} className="w-full bg-slate-50 text-slate-700 rounded-2xl py-4 text-sm font-semibold text-left px-5 active:bg-slate-100 transition border border-slate-200">✏️ Editar nombre</button>
            {memberConfigModal.role !== 'admin' && (
              <button onClick={() => { if (confirm(`¿Promover a ${memberConfigModal.display_name || 'este miembro'} a administrador?`)) { handleMemberAction(memberConfigModal.id, 'promote'); setMemberConfigModal(null); } }} className="w-full bg-emerald-50 text-emerald-700 rounded-2xl py-4 text-sm font-semibold text-left px-5 active:bg-emerald-100 transition">⭐ Promover a administrador</button>
            )}
            {!memberConfigModal.is_creator && (
              <button onClick={() => { if (confirm(`¿Remover a ${memberConfigModal.display_name || 'este miembro'} de la organización?`)) { handleMemberAction(memberConfigModal.id, 'remove'); setMemberConfigModal(null); } }} className="w-full bg-red-50 text-red-600 rounded-2xl py-4 text-sm font-semibold text-left px-5 active:bg-red-100 transition">🗑️ Remover de la organización</button>
            )}
            <button onClick={() => setMemberConfigModal(null)} className="w-full bg-slate-100 text-slate-600 rounded-2xl py-4 text-sm font-semibold active:bg-slate-200 transition">Cancelar</button>
          </div>
        </Modal>
      )}

      {editDisplayNameModal && (
        <Modal title={`Editar nombre — ${editDisplayNameModal.display_name || 'Miembro'}`} onClose={() => setEditDisplayNameModal(null)}>
          <form onSubmit={handleEditDisplayName} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Nombre a mostrar</label>
              <input name="displayName" type="text" defaultValue={editDisplayNameModal.display_name || ''} className="w-full bg-slate-100 rounded-xl px-4 py-3.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm" placeholder="Nombre visible" autoFocus maxLength={50} />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setEditDisplayNameModal(null)} className="flex-1 bg-slate-100 text-slate-600 rounded-xl py-3.5 text-sm font-semibold">Cancelar</button>
              <button type="submit" className="flex-1 bg-emerald-500 text-white rounded-xl py-3.5 text-sm font-semibold">Guardar</button>
            </div>
          </form>
        </Modal>
      )}

      {editOrgModal && (
        <Modal title="Editar organización" onClose={() => setEditOrgModal(false)}>
          <form onSubmit={handleEditOrg} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1.5">Nombre</label>
              <input type="text" value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} className="w-full bg-slate-100 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" required />
            </div>
            <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer">
              <input type="checkbox" checked={editForm.isUnlimited} onChange={e => setEditForm(p => ({ ...p, isUnlimited: e.target.checked }))} className="w-5 h-5 text-emerald-500 rounded-lg" />
              <span className="text-sm font-medium text-slate-700">Sin monto límite</span>
            </label>
            {!editForm.isUnlimited && (
              <>
                <div><label className="block text-sm font-medium text-slate-600 mb-1.5">Monto inicial</label><div className="relative"><span className="absolute left-4 top-3.5 text-slate-400 text-sm">$</span><input type="number" value={editForm.initialAmount} onChange={e => setEditForm(p => ({ ...p, initialAmount: e.target.value }))} className="w-full bg-slate-100 rounded-xl pl-8 pr-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" step="0.01" min="0.01" required /></div></div>
                <div><label className="block text-sm font-medium text-slate-600 mb-1.5">Frecuencia (días)</label><input type="number" value={editForm.frequencyDays} onChange={e => setEditForm(p => ({ ...p, frequencyDays: e.target.value }))} className="w-full bg-slate-100 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" min="1" /></div>
              </>
            )}
            <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer">
              <input type="checkbox" checked={editForm.showBalanceToUsers} onChange={e => setEditForm(p => ({ ...p, showBalanceToUsers: e.target.checked }))} className="w-5 h-5 text-emerald-500 rounded-lg" />
              <span className="text-sm font-medium text-slate-700">Usuarios pueden ver el saldo</span>
            </label>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setEditOrgModal(false)} className="flex-1 bg-slate-100 text-slate-600 rounded-xl py-3.5 text-sm font-semibold">Cancelar</button>
              <button type="submit" className="flex-1 bg-emerald-500 text-white rounded-xl py-3.5 text-sm font-semibold">Guardar</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
