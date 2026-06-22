import { useState, useEffect, useCallback } from 'react';
import { PlusIcon, XMarkIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { RELATION_NAMES, API_URL } from './constants';
import LinkEntitiesForm from './LinkEntitiesForm';
import { Entity, Connection, ConnectionCreate } from '../types';

const PAGE_SIZE = 15;

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages: (number | string)[] = [];
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
        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >
        <ChevronLeftIcon className="w-3 h-3" />
        <span>Prev</span>
      </button>

      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`ellipsis-${i}`} className="px-2 text-slate-400 text-[11px] select-none">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(Number(p))}
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
        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >
        <span>Next</span>
        <ChevronRightIcon className="w-3 h-3" />
      </button>
    </div>
  );
}

interface ConnectionsLedgerProps {
  entities: Entity[];
  connectionRules: Record<string, any>;
  onDeleteConnection: (id: string) => Promise<void>;
  onCreateConnection: (connectionData: ConnectionCreate) => Promise<boolean>;
  refreshKey: number;
}

interface ConnectionsDataState {
  items: Connection[];
  total: number;
  total_pages: number;
}

export default function ConnectionsLedger({
  entities,
  connectionRules,
  onDeleteConnection,
  onCreateConnection,
  refreshKey,
}: ConnectionsLedgerProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [data, setData] = useState<ConnectionsDataState>({ items: [], total: 0, total_pages: 1 });
  const [isLoading, setIsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchPage = useCallback(async (page: number) => {
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

  const handleDelete = async (id: string) => {
    await onDeleteConnection(id);
    const remainingOnPage = data.items.length - 1;
    if (remainingOnPage === 0 && currentPage > 1) {
      setCurrentPage(p => p - 1);
    } else {
      fetchPage(currentPage);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, data.total_pages)));
  };

  const handleCreateConnection = async (connectionData: ConnectionCreate) => {
    const success = await onCreateConnection(connectionData);
    if (success) {
      setShowAddForm(false);
      fetchPage(currentPage);
    }
    return success;
  };

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-slate-800 tracking-wide">Established Relations</h2>
          <span className="text-xs bg-slate-100 border border-slate-200 text-slate-600 px-2.5 py-1 rounded-md font-semibold">
            {data.total} Total
          </span>
        </div>
        <button
          onClick={() => setShowAddForm(v => !v)}
          className={`inline-flex items-center gap-1.5 px-4 py-2 font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0 ${
            showAddForm
              ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-300'
              : 'bg-sky-500 hover:bg-sky-600 text-white'
          }`}
        >
          {showAddForm
            ? <><XMarkIcon className="w-4 h-4" /> Cancel</>
            : <><PlusIcon className="w-4 h-4" /> Add Connection</>}
        </button>
      </div>

      {/* Inline Add Connection Form */}
      {showAddForm && (
        <div className="p-0.5 animate-fade-in">
          <LinkEntitiesForm
            entities={entities}
            connectionRules={connectionRules}
            onCreateConnection={handleCreateConnection}
          />
        </div>
      )}

      {/* Connections Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-sm animate-pulse">Loading…</div>
        ) : data.items.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No connections established yet.{' '}
            <button
              onClick={() => setShowAddForm(true)}
              className="text-sky-600 font-bold hover:underline cursor-pointer"
            >
              Add one now →
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/85 text-slate-600">
                    <th className="p-4 font-bold uppercase tracking-wider">Source Entity</th>
                    <th className="p-4 font-bold uppercase tracking-wider text-center">Relationship</th>
                    <th className="p-4 font-bold uppercase tracking-wider">Target Entity</th>
                    <th className="p-4 font-bold uppercase tracking-wider">Description</th>
                    <th className="p-4 font-bold uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.items.map((c, i) => {
                    const src = entities.find(e => e.id === c.source_id);
                    const trg = entities.find(e => e.id === c.target_id);
                    return (
                      <tr key={c.id ?? i} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4">
                          <span className="font-bold text-slate-800">{src ? src.name : 'Unknown Node'}</span>
                          <span className="block text-[9px] text-slate-500 uppercase tracking-wide mt-0.5">{src ? src.type : ''}</span>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className="px-3 py-1 bg-teal-50 border border-teal-200 rounded-full text-[9px] font-bold text-teal-700 tracking-wide">
                              {RELATION_NAMES[c.label] || c.label}
                            </span>
                            {(c.start_time || c.end_time) && (
                              <span className="text-[9px] text-slate-500 font-medium whitespace-nowrap">
                                {c.start_time ? new Date(c.start_time).toLocaleDateString() : '?'} – {c.end_time ? new Date(c.end_time).toLocaleDateString() : 'Present'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="font-bold text-slate-800">{trg ? trg.name : 'Unknown Node'}</span>
                          <span className="block text-[9px] text-slate-500 uppercase tracking-wide mt-0.5">{trg ? trg.type : ''}</span>
                        </td>
                        <td className="p-4 text-slate-500 italic">
                          {c.description || '--'}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="text-xs font-bold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer"
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

            <div className="flex flex-col items-center gap-1 border-t border-slate-200/80 py-4 bg-slate-50/40">
              <p className="text-[10px] text-slate-500">
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

