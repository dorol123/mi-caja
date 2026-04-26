import { useState, useRef } from 'react';
import { api } from '../api';

export default function ExpenseForm({ orgId, expense, onSave, onCancel }) {
  const isEdit = !!expense;
  const [description, setDescription] = useState(expense?.description || '');
  const [amount, setAmount] = useState(expense?.amount?.toString() || '');
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(expense?.photo_path ? `/uploads/${expense.photo_path}` : null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const galleryRef = useRef();
  const cameraRef = useRef();

  function handlePhoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!description.trim()) return setError('La descripción es requerida');
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) return setError('Importe inválido');

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('description', description.trim());
      fd.append('amount', amount);
      if (photo) fd.append('photo', photo);

      let saved;
      if (isEdit) {
        saved = await api.expenses.update(orgId, expense.id, fd);
      } else {
        saved = await api.expenses.create(orgId, fd);
      }
      onSave(saved);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Descripción *</label>
        <input
          type="text"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Ej: Materiales de oficina"
          className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Importe *</label>
        <div className="relative">
          <span className="absolute left-3 top-2 text-slate-400 text-sm">$</span>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            step="0.01"
            min="0.01"
            className="w-full border border-slate-200 rounded-lg pl-7 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Foto del recibo</label>
        <input ref={galleryRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="hidden" />
        {preview ? (
          <div className="relative">
            <img src={preview} alt="Recibo" className="w-full h-48 object-cover rounded-lg border border-slate-200" />
            <button
              type="button"
              onClick={() => { setPhoto(null); setPreview(null); if (galleryRef.current) galleryRef.current.value = ''; if (cameraRef.current) cameraRef.current.value = ''; }}
              className="absolute top-2 right-2 bg-white rounded-full p-1 shadow text-slate-500 hover:text-red-500 text-xs font-bold"
            >✕</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => galleryRef.current?.click()}
              className="border-2 border-dashed border-slate-200 rounded-lg py-5 text-slate-400 hover:border-emerald-400 hover:text-emerald-500 transition text-sm flex flex-col items-center gap-1"
            >
              <span className="text-xl">🖼️</span>
              <span>Galería</span>
            </button>
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              className="border-2 border-dashed border-slate-200 rounded-lg py-5 text-slate-400 hover:border-emerald-400 hover:text-emerald-500 transition text-sm flex flex-col items-center gap-1"
            >
              <span className="text-xl">📷</span>
              <span>Cámara</span>
            </button>
          </div>
        )}
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 border border-slate-200 text-slate-600 rounded-lg py-2.5 text-sm font-medium hover:bg-slate-50 transition"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-emerald-500 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-emerald-600 transition disabled:opacity-50"
        >
          {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Enviar solicitud'}
        </button>
      </div>
    </form>
  );
}
