'use client';

import { useState, useEffect } from 'react';
import { RELATION_NAMES } from './constants';

export default function LinkEntitiesForm({ entities, connectionRules, onCreateConnection }) {
  const [newConnection, setNewConnection] = useState({
    source_id: '',
    target_id: '',
    label: '',
    description: ''
  });

  // Get selected source entity details
  const sourceEntity = entities.find(e => e.id === newConnection.source_id);

  // Determine allowed labels based on source entity type
  const allowedLabels = sourceEntity && connectionRules
    ? Object.keys(connectionRules[sourceEntity.type] || {})
    : [];

  // Reset target and label if source changes and current values are no longer valid
  useEffect(() => {
    setNewConnection(prev => {
      // Find default label or keep if valid
      const nextLabel = allowedLabels.includes(prev.label) ? prev.label : (allowedLabels[0] || '');
      return {
        ...prev,
        label: nextLabel,
        target_id: ''
      };
    });
  }, [newConnection.source_id, connectionRules]);

  // Determine allowed target types based on selected label
  const allowedTargetTypes = sourceEntity && newConnection.label && connectionRules
    ? connectionRules[sourceEntity.type]?.[newConnection.label] || []
    : [];

  // Filter target entities based on allowed target types
  const filteredTargets = entities.filter(e => {
    // Cannot connect to itself
    if (e.id === newConnection.source_id) return false;
    return allowedTargetTypes.includes(e.type);
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { source_id, target_id, label, description } = newConnection;
    if (!source_id || !target_id || !label) {
      alert('Please select source, relation, and target entities.');
      return;
    }

    const success = await onCreateConnection({
      source_id,
      target_id,
      label,
      description: description || null,
      properties: {}
    });

    if (success) {
      setNewConnection({
        source_id: '',
        target_id: '',
        label: '',
        description: ''
      });
    }
  };

  return (
    <section className="bg-white border border-slate-200 p-3 rounded-md space-y-2">
      <h2 className="text-xs font-semibold text-slate-600 tracking-wider uppercase">Link Entities</h2>
      <form onSubmit={handleSubmit} className="space-y-2">
        <div>
          <label className="block text-[10px] text-slate-500 mb-0.5">Source Entity</label>
          <select
            required
            value={newConnection.source_id}
            onChange={(e) => setNewConnection(prev => ({ ...prev, source_id: e.target.value }))}
            className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
          >
            <option value="">-- Choose Origin --</option>
            {entities.map(e => (
              <option key={e.id} value={e.id}>{e.name} ({e.type})</option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-center">
          <span className="text-slate-400 font-extrabold text-[9px] tracking-wider">⬇ Connected To ⬇</span>
        </div>

        <div>
          <label className="block text-[10px] text-slate-500 mb-0.5">Relation Label</label>
          <select
            required
            disabled={!newConnection.source_id}
            value={newConnection.label}
            onChange={(e) => setNewConnection(prev => ({ ...prev, label: e.target.value, target_id: '' }))}
            className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none disabled:opacity-50"
          >
            {!newConnection.source_id && <option value="">-- Choose Source First --</option>}
            {allowedLabels.map(lbl => (
              <option key={lbl} value={lbl}>
                {RELATION_NAMES[lbl] || lbl}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] text-slate-500 mb-0.5">Target Entity</label>
          <select
            required
            disabled={!newConnection.label}
            value={newConnection.target_id}
            onChange={(e) => setNewConnection(prev => ({ ...prev, target_id: e.target.value }))}
            className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none disabled:opacity-50"
          >
            <option value="">-- Choose Destination --</option>
            {filteredTargets.map(e => (
              <option key={e.id} value={e.id}>{e.name} ({e.type})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] text-slate-500 mb-0.5">Description / Proof</label>
          <input
            type="text"
            placeholder="e.g. Signed treaty in 2024"
            value={newConnection.description}
            onChange={(e) => setNewConnection(prev => ({ ...prev, description: e.target.value }))}
            className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded transition-all"
        >
          Establish Link
        </button>
      </form>
    </section>
  );
}
