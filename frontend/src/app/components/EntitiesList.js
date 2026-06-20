'use client';

import { getTypeColor } from './constants';

export default function EntitiesList({
  entities,
  setFocusEntityId,
  setActiveTab,
  onDeleteEntity
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800">Registered Entities</h2>
        <span className="text-xs bg-white border border-slate-200 text-slate-500 px-2 py-1 rounded">
          {entities.length} Total
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {entities.length === 0 ? (
          <div className="col-span-2 p-12 text-center bg-white border border-slate-200 rounded-2xl text-slate-450 text-sm">
            No entities found. Create entities using the side panel!
          </div>
        ) : (
          entities.map(e => {
            const style = getTypeColor(e.type);
            return (
              <div key={e.id} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 flex flex-col justify-between hover:border-slate-300 transition-all">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${style.bg}`}>
                      {e.type}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">ID: {e.id.slice(0, 8)}...</span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">{e.name}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">{e.description || 'No description provided.'}</p>

                  {Object.keys(e.properties || {}).length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1.5">
                      {Object.entries(e.properties).map(([k, v]) => (
                        <span key={k} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-50 text-slate-500 border border-slate-100">
                          {k}: {v}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => { setFocusEntityId(e.id); setActiveTab('graph'); }}
                    className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-[10px] font-bold text-teal-600 transition-all"
                  >
                    Explore Network
                  </button>
                  <button
                    onClick={() => onDeleteEntity(e.id)}
                    className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg text-[10px] font-bold text-rose-600 transition-all text-center"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
