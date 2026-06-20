'use client';

import { useState, useEffect, useCallback } from 'react';
import { getTypeColor } from './constants';
import { API_URL } from './constants';

const PAGE_SIZE = 10;

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
    <div className="flex items-center justify-center gap-1 pt-2">
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

export default function EntitiesList({
  setFocusEntityId,
  setActiveTab,
  onDeleteEntity,
  refreshKey,
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0, total_pages: 1 });
  const [isLoading, setIsLoading] = useState(false);

  const fetchPage = useCallback(async (page) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/entities?page=${page}&page_size=${PAGE_SIZE}`);
      if (!res.ok) throw new Error('Failed to fetch entities');
      setData(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Re-fetch whenever the page changes or the parent signals a data change
  useEffect(() => {
    fetchPage(currentPage);
  }, [currentPage, refreshKey, fetchPage]);

  const handleDelete = async (id) => {
    await onDeleteEntity(id);
    // After deletion the current page may become empty; stay on page if items remain
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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800">Registered Entities</h2>
        <span className="text-xs bg-white border border-slate-200 text-slate-500 px-2 py-1 rounded">
          {data.total} Total
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {isLoading ? (
          <div className="col-span-2 p-12 text-center text-slate-400 text-sm animate-pulse">Loading…</div>
        ) : data.items.length === 0 ? (
          <div className="col-span-2 p-8 text-center bg-white border border-slate-200 rounded-md text-slate-450 text-sm">
            No entities found. Create entities using the side panel!
          </div>
        ) : (
          data.items.map(e => {
            const style = getTypeColor(e.type);
            return (
              <div key={e.id} className="bg-white border border-slate-200 rounded-md p-3.5 space-y-2 flex flex-col justify-between hover:border-slate-300 transition-all">
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

                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => { setFocusEntityId(e.id); setActiveTab('graph'); }}
                    className="flex-1 py-1 bg-slate-100 hover:bg-slate-200 rounded text-[10px] font-bold text-teal-600 transition-all"
                  >
                    Explore Network
                  </button>
                  <button
                    onClick={() => handleDelete(e.id)}
                    className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded text-[10px] font-bold text-rose-600 transition-all text-center"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {data.total > 0 && (
        <div className="flex flex-col items-center gap-1">
          <p className="text-[10px] text-slate-400">
            Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, data.total)} of {data.total} entities
          </p>
          <Pagination currentPage={currentPage} totalPages={data.total_pages} onPageChange={handlePageChange} />
        </div>
      )}
    </div>
  );
}
