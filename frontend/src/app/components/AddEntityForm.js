'use client';

import { useState } from 'react';

export default function AddEntityForm({ onCreateEntity }) {
  const [newEntity, setNewEntity] = useState({
    name: '',
    type: 'person',
    description: '',
    propKey: '',
    propValue: '',
    properties: {}
  });

  const addProperty = () => {
    if (!newEntity.propKey.trim()) return;
    setNewEntity(prev => ({
      ...prev,
      properties: {
        ...prev.properties,
        [prev.propKey.trim()]: prev.propValue.trim()
      },
      propKey: '',
      propValue: ''
    }));
  };

  const removeProperty = (key) => {
    setNewEntity(prev => {
      const updatedProps = { ...prev.properties };
      delete updatedProps[key];
      return { ...prev, properties: updatedProps };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newEntity.name.trim()) return;
    
    const success = await onCreateEntity({
      name: newEntity.name,
      type: newEntity.type,
      description: newEntity.description || null,
      properties: newEntity.properties
    });

    if (success) {
      setNewEntity({
        name: '',
        type: 'person',
        description: '',
        propKey: '',
        propValue: '',
        properties: {}
      });
    }
  };

  return (
    <section className="bg-white border border-slate-200 p-3 rounded-md space-y-2">
      <h2 className="text-xs font-semibold text-slate-600 tracking-wider uppercase">Add Entity</h2>
      <form onSubmit={handleSubmit} className="space-y-2">
        <div>
          <label className="block text-[10px] text-slate-500 mb-0.5">Entity Name</label>
          <input
            type="text"
            required
            placeholder="e.g. Senator Jane Doe, Geneva Summit"
            value={newEntity.name}
            onChange={(e) => setNewEntity(prev => ({ ...prev, name: e.target.value }))}
            className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-[10px] text-slate-500 mb-0.5">Type</label>
          <select
            value={newEntity.type}
            onChange={(e) => setNewEntity(prev => ({ ...prev, type: e.target.value }))}
            className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
          >
            <option value="person">👤 Person</option>
            <option value="event">📅 Event</option>
            <option value="place">📍 Place</option>
            <option value="organization">🏢 Organization</option>
            <option value="other">🧬 Other</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] text-slate-500 mb-0.5">Description</label>
          <textarea
            placeholder="Brief context or notes"
            rows={2}
            value={newEntity.description}
            onChange={(e) => setNewEntity(prev => ({ ...prev, description: e.target.value }))}
            className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none resize-none"
          />
        </div>

        {/* Dynamic properties */}
        <div className="space-y-1.5">
          <label className="block text-[10px] text-slate-500">Custom Attributes (Optional)</label>
          <div className="flex gap-1.5">
            <input
              type="text"
              placeholder="Key (e.g. Party)"
              value={newEntity.propKey}
              onChange={(e) => setNewEntity(prev => ({ ...prev, propKey: e.target.value }))}
              className="flex-1 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[11px] text-slate-800 placeholder-slate-400 focus:outline-none"
            />
            <input
              type="text"
              placeholder="Value (e.g. Democrat)"
              value={newEntity.propValue}
              onChange={(e) => setNewEntity(prev => ({ ...prev, propValue: e.target.value }))}
              className="flex-1 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[11px] text-slate-800 placeholder-slate-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={addProperty}
              className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-xs font-bold transition-colors"
            >
              +
            </button>
          </div>

          {Object.keys(newEntity.properties).length > 0 && (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {Object.entries(newEntity.properties).map(([k, v]) => (
                <span key={k} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[9px] text-slate-600">
                  <strong>{k}:</strong> {v}
                  <button type="button" onClick={() => removeProperty(k)} className="text-slate-400 hover:text-slate-650">&times;</button>
                </span>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          className="w-full py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded transition-all"
        >
          Create Entity
        </button>
      </form>
    </section>
  );
}
