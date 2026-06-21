'use client';

import { useState, useEffect, useMemo } from 'react';
import { RELATION_NAMES, getTypeColor } from './constants';
import { Entity, ConnectionCreate } from '../types';
import { SparklesIcon, LinkIcon, ArrowsRightLeftIcon } from '@heroicons/react/24/outline';

interface LinkEntitiesFormProps {
  entities: Entity[];
  connectionRules: Record<string, Record<string, string[]>>;
  onCreateConnection: (connection: ConnectionCreate) => Promise<boolean>;
}

interface ConnectionState {
  source_id: string;
  target_id: string;
  label: string;
  description: string;
}

export default function LinkEntitiesForm({
  entities,
  connectionRules,
  onCreateConnection
}: LinkEntitiesFormProps) {
  const [newConnection, setNewConnection] = useState<ConnectionState>({
    source_id: '',
    target_id: '',
    label: '',
    description: ''
  });

  // Get selected source entity details
  const sourceEntity = entities.find(e => e.id === newConnection.source_id);
  const targetEntity = entities.find(e => e.id === newConnection.target_id);

  // Determine allowed labels based on source entity type
  const allowedLabels = useMemo(
    () => (sourceEntity && connectionRules ? Object.keys(connectionRules[sourceEntity.type] || {}) : []),
    [sourceEntity, connectionRules]
  );

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
  }, [newConnection.source_id, connectionRules, allowedLabels]);

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

  const handleSubmit = async (e: React.FormEvent) => {
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

  const sourceColors = sourceEntity ? getTypeColor(sourceEntity.type) : null;
  const targetColors = targetEntity ? getTypeColor(targetEntity.type) : null;

  return (
    <section className="glass-panel p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
      <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-sm font-bold text-slate-800 tracking-wider uppercase flex items-center gap-2">
            <LinkIcon className="w-4 h-4 text-sky-500" />
            Link Entities
          </h2>
          <p className="text-[10px] text-slate-500 mt-0.5">Connect entities together to build your knowledge network</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Interactive connection cards flow */}
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-4 items-center">
          
          {/* Card 1: Source Entity */}
          <div className="lg:col-span-3 bg-slate-50/50 p-4 rounded-xl border border-slate-200/80 space-y-3 min-h-[150px] flex flex-col justify-between transition-all hover:border-slate-300/80">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Source Entity
              </label>
              <select
                required
                value={newConnection.source_id}
                onChange={(e) => setNewConnection(prev => ({ ...prev, source_id: e.target.value }))}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20 transition-all"
              >
                <option value="">-- Choose Origin --</option>
                {entities.map(e => (
                  <option key={e.id} value={e.id}>{e.name} ({e.type})</option>
                ))}
              </select>
            </div>

            {sourceEntity ? (
              <div className="mt-2 p-2 rounded-lg bg-white border border-slate-150 space-y-1 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 truncate max-w-[70%]">{sourceEntity.name}</span>
                  <span className={`text-[8px] px-2 py-0.5 rounded-full font-extrabold uppercase border ${sourceColors?.bg}`}>
                    {sourceEntity.type}
                  </span>
                </div>
                {sourceEntity.description && (
                  <p className="text-[9px] text-slate-500 line-clamp-1 italic">&quot;{sourceEntity.description}&quot;</p>
                )}
              </div>
            ) : (
              <div className="mt-2 flex items-center justify-center h-12 rounded-lg border border-dashed border-slate-200 bg-slate-100/50">
                <span className="text-[9px] text-slate-400">No source entity selected</span>
              </div>
            )}
          </div>

          {/* Connection Bridge (Arrow and Relation) */}
          <div className="lg:col-span-1 flex flex-col items-center justify-center space-y-3 py-2 lg:py-0">
            <div className="w-full">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center mb-1.5">
                Relation Label
              </label>
              <select
                required
                disabled={!newConnection.source_id}
                value={newConnection.label}
                onChange={(e) => setNewConnection(prev => ({ ...prev, label: e.target.value, target_id: '' }))}
                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-sky-500/50 transition-all disabled:opacity-40"
              >
                {!newConnection.source_id && <option value="">-- Choose Source First --</option>}
                {allowedLabels.map(lbl => (
                  <option key={lbl} value={lbl}>
                    {RELATION_NAMES[lbl] || lbl}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full flex items-center justify-center py-1">
              <div className="h-0.5 w-full bg-slate-200 hidden lg:block" />
              <div className="flex items-center justify-center min-w-8 h-8 rounded-full bg-white border border-slate-200 shadow-xs">
                <ArrowsRightLeftIcon className="w-4 h-4 text-slate-400" />
              </div>
              <div className="h-0.5 w-full bg-slate-200 hidden lg:block" />
            </div>
          </div>

          {/* Card 2: Target Entity */}
          <div className="lg:col-span-3 bg-slate-50/50 p-4 rounded-xl border border-slate-200/80 space-y-3 min-h-[150px] flex flex-col justify-between transition-all hover:border-slate-300/80">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Target Entity
              </label>
              <select
                required
                disabled={!newConnection.label}
                value={newConnection.target_id}
                onChange={(e) => setNewConnection(prev => ({ ...prev, target_id: e.target.value }))}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <option value="">-- Choose Destination --</option>
                {filteredTargets.map(e => (
                  <option key={e.id} value={e.id}>{e.name} ({e.type})</option>
                ))}
              </select>
            </div>

            {targetEntity ? (
              <div className="mt-2 p-2 rounded-lg bg-white border border-slate-150 space-y-1 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 truncate max-w-[70%]">{targetEntity.name}</span>
                  <span className={`text-[8px] px-2 py-0.5 rounded-full font-extrabold uppercase border ${targetColors?.bg}`}>
                    {targetEntity.type}
                  </span>
                </div>
                {targetEntity.description && (
                  <p className="text-[9px] text-slate-500 line-clamp-1 italic">&quot;{targetEntity.description}&quot;</p>
                )}
              </div>
            ) : (
              <div className="mt-2 flex items-center justify-center h-12 rounded-lg border border-dashed border-slate-200 bg-slate-100/50">
                <span className="text-[9px] text-slate-400">
                  {!newConnection.label ? 'Choose relation label first' : 'No target selected'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Inputs row for Description */}
        <div className="w-full pt-1">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            Description / Proof
          </label>
          <input
            type="text"
            placeholder="e.g. Signed treaty in 2024"
            value={newConnection.description}
            onChange={(e) => setNewConnection(prev => ({ ...prev, description: e.target.value }))}
            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/20 transition-all"
          />
        </div>

        <button
          type="submit"
          className="w-full py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-xs transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <SparklesIcon className="w-4 h-4" />
          Establish Link
        </button>
      </form>
    </section>
  );
}
