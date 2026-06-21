'use client';

import { useState, useEffect, useCallback } from 'react';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { RELATION_NAMES, API_URL } from './constants';
import LinkEntitiesForm from './LinkEntitiesForm';

const PAGE_SIZE = 15;

function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const pages = [];
  const delta = 2;
  const left = Math.max(1, currentPage - delta);
  const right = Math.min(totalPages, currentPage + delta);

  if (left > 1) {
    pages.push(1);
    if (left > 2) pages.push('...');
  }
  for (let i = left; i <= right; i++) pages.push(i);
  if (right < totalPages) {
    if (right < totalPages - 1) pages.push('...');
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-center gap-1 px-3 py-2 border-t border-slate-100">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >
        ← Prev
      </button>

      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`ellipsis-${i}`} className="px-2 text-slate-400 text-[11px] select-none">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`w-8 h-8 rounded-lg text-[11px] font-semibold transition-all ${
              p === currentPage
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >
        Next →
      </button>
    </div>
  );
}

export default function ConnectionsLedger({
  entities,
  connectionRules,
  onDeleteConnection,
  onCreateConnection,
  refreshKey,
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0, total_pages: 1 });
  const [isLoading, setIsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchPage = useCallback(async (page) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/connections?page=${page}&page_size=${PAGE_SIZE}`);
      if (!res.ok) throw new Error('Failed to fetch connections');
      setData(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPage(currentPage);
  }, [currentPage, refreshKey, fetchPage]);

  const handleDelete = async (id) => {
    await onDeleteConnection(id);
    const remainingOnPage = data.items.length - 1;
    if (remainingOnPage === 0 && currentPage > 1) {
      setCurrentPage(p => p - 1);
    } else {
      fetchPage(currentPage);
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, data.total_pages)));
  };

  const handleCreateConnection = async (connectionData) => {
    const success = await onCreateConnection(connectionData);
    if (success) {
      setShowAddForm(false);
      fetchPage(currentPage);
    }
    return success;
  };

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-slate-800">Established Relations</h2>
          <span className="text-xs bg-white border border-slate-200 text-slate-500 px-2 py-1 rounded">
            {data.total} Total
          </span>
        </div>
        <button
          onClick={() => setShowAddForm(v => !v)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 font-semibold text-xs rounded-md transition-all shadow-sm ${
            showAddForm
              ? 'bg-slate-200 hover:bg-slate-300 text-slate-700'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          }`}
        >
          {showAddForm
            ? <><XMarkIcon className="w-3.5 h-3.5" /> Cancel</>
            : <><PlusIcon className="w-3.5 h-3.5" /> Add Connection</>}
        </button>
      </div>

      {/* Inline Add Connection Form */}
      {showAddForm && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm">
          <LinkEntitiesForm
            entities={entities}
            connectionRules={connectionRules}
            onCreateConnection={handleCreateConnection}
          />
        </div>
      )}

      {/* Connections Table */}
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-sm animate-pulse">Loading…</div>
        ) : data.items.length === 0 ? (
          <div className="p-8 text-center text-slate-550 text-sm">
            No connections established yet.{' '}
            <button
              onClick={() => setShowAddForm(true)}
              className="text-indigo-600 font-semibold hover:underline"
            >
              Add one now →
            </button>
          </div>
        ) : (
          <>
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
                  {data.items.map((c, i) => {
                    const src = entities.find(e => e.id === c.source_id);
                    const trg = entities.find(e => e.id === c.target_id);
                    return (
                      <tr key={c.id ?? i} className="hover:bg-slate-50 transition-colors">
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
                            onClick={() => handleDelete(c.id)}
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

            <div className="flex flex-col items-center gap-0.5">
              <p className="text-[10px] text-slate-400 pt-2">
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, data.total)} of {data.total} connections
              </p>
              <Pagination currentPage={currentPage} totalPages={data.total_pages} onPageChange={handlePageChange} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
