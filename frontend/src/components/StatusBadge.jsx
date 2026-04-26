const config = {
  pending:   { label: 'Pendiente',  cls: 'bg-amber-100 text-amber-700' },
  approved:  { label: 'Aprobado',   cls: 'bg-emerald-100 text-emerald-700' },
  denied:    { label: 'Denegado',   cls: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Cancelado',  cls: 'bg-slate-100 text-slate-500' },
};

export default function StatusBadge({ status }) {
  const { label, cls } = config[status] || config.pending;
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>{label}</span>
  );
}
