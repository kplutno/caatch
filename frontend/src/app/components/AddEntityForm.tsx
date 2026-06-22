'use client';

import { useState } from 'react';
import { EntityCreate } from '../types';

interface AddEntityFormProps {
  onCreateEntity: (entity: EntityCreate) => Promise<boolean>;
}

interface NewEntityState {
  name: string;
  type: string;
  description: string;
}

export default function AddEntityForm({ onCreateEntity }: AddEntityFormProps) {
  const [newEntity, setNewEntity] = useState<NewEntityState>({
    name: '',
    type: 'person',
    description: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntity.name.trim()) return;
    
    const success = await onCreateEntity({
      name: newEntity.name,
      type: newEntity.type,
      description: newEntity.description || null
    });

    if (success) {
      setNewEntity({
        name: '',
        type: 'person',
        description: ''
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
            <option value="person">Person</option>
            <option value="event">Event</option>
            <option value="place">Place</option>
            <option value="organization">Organization</option>
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
