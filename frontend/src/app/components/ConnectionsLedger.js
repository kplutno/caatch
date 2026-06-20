'use client';

import { RELATION_NAMES } from './constants';

export default function ConnectionsLedger({
  connections,
  entities,
  onDeleteConnection
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800">Established Relations</h2>
        <span className="text-xs bg-white border border-slate-200 text-slate-500 px-2 py-1 rounded">
          {connections.length} Total
        </span>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        {connections.length === 0 ? (
          <div className="p-12 text-center text-slate-550 text-sm">
            No connections established yet. Create connections using the side panel!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <th className="p-4 font-semibold uppercase tracking-wider">Source Entity</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-center">Relationship</th>
                  <th className="p-4 font-semibold uppercase tracking-wider">Target Entity</th>
                  <th className="p-4 font-semibold uppercase tracking-wider">Description</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {connections.map((c, i) => {
                  const src = entities.find(e => e.id === c.source_id);
                  const trg = entities.find(e => e.id === c.target_id);
                  return (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <span className="font-bold text-slate-800">{src ? src.name : 'Unknown Node'}</span>
                        <span className="block text-[10px] text-slate-500 uppercase">{src ? src.type : ''}</span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="px-2.5 py-1 bg-teal-50 border border-teal-200 rounded-md text-[10px] font-semibold text-teal-700 tracking-wide">
                          {RELATION_NAMES[c.label] || c.label}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="font-bold text-slate-800">{trg ? trg.name : 'Unknown Node'}</span>
                        <span className="block text-[10px] text-slate-500 uppercase">{trg ? trg.type : ''}</span>
                      </td>
                      <td className="p-4 text-slate-600 italic">
                        {c.description || '--'}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => onDeleteConnection(c.id)}
                          className="text-xs font-semibold text-rose-600 hover:text-rose-500 hover:underline"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
