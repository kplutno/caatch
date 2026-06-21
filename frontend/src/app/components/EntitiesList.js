'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  MagnifyingGlassIcon,
  UserIcon,
  CalendarDaysIcon,
  MapPinIcon,
  BuildingOffice2Icon,
  SparklesIcon,
  Squares2X2Icon,
  PlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { getTypeColor, API_URL } from './constants';
import AddEntityForm from './AddEntityForm';

const PAGE_SIZE = 12;

const ENTITY_TYPES = [
  { value: '', label: 'All Types', Icon: Squares2X2Icon },
  { value: 'person', label: 'Person', Icon: UserIcon },
  { value: 'event', label: 'Event', Icon: CalendarDaysIcon },
  { value: 'place', label: 'Place', Icon: MapPinIcon },
  { value: 'organization', label: 'Organization', Icon: BuildingOffice2Icon },
  { value: 'other', label: 'Other', Icon: SparklesIcon },
];

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
  onCreateEntity,
  refreshKey,
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0, total_pages: 1 });
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchPage = useCallback(async (page, search, type) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(PAGE_SIZE),
      });
      if (search.trim()) params.set('search', search.trim());
      if (type) params.set('type', type);
      const res = await fetch(`${API_URL}/api/entities?${params}`);
      if (!res.ok) throw new Error('Failed to fetch entities');
      setData(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Re-fetch whenever page, filters, or parent signals a data change
  useEffect(() => {
    fetchPage(currentPage, searchQuery, selectedType);
  }, [currentPage, refreshKey, fetchPage]); // eslint-disable-line react-hooks/exhaustive-deps

  // When search or type filter changes, reset to page 1 and re-fetch
  useEffect(() => {
    setCurrentPage(1);
    fetchPage(1, searchQuery, selectedType);
  }, [searchQuery, selectedType]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (id) => {
    await onDeleteEntity(id);
    const remainingOnPage = data.items.length - 1;
    if (remainingOnPage === 0 && currentPage > 1) {
      setCurrentPage(p => p - 1);
    } else {
      fetchPage(currentPage, searchQuery, selectedType);
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, data.total_pages)));
  };

  const handleCreateEntity = async (entityData) => {
    const success = await onCreateEntity(entityData);
    if (success) {
      setShowAddModal(false);
      fetchPage(currentPage, searchQuery, selectedType);
    }
    return success;
  };

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-slate-800">Registered Entities</h2>
          <span className="text-xs bg-white border border-slate-200 text-slate-500 px-2 py-1 rounded">
            {data.total} Total
          </span>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-md transition-all shadow-sm"
        >
          <PlusIcon className="w-3.5 h-3.5" /> Add Entity
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Search input */}
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search entities by name…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-md pl-8 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-400 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <XMarkIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Type filter chips */}
        <div className="flex flex-wrap gap-1.5">
          {ENTITY_TYPES.map(({ value, label, Icon }) => (
            <button
              key={value}
              onClick={() => setSelectedType(value)}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-all border ${
                selectedType === value
                  ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-3 h-3" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Entity Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {isLoading ? (
          <div className="col-span-3 p-12 text-center text-slate-400 text-sm animate-pulse">Loading…</div>
        ) : data.items.length === 0 ? (
          <div className="col-span-3 p-8 text-center bg-white border border-slate-200 rounded-md text-slate-450 text-sm">
            {searchQuery || selectedType
              ? 'No entities match your search or filter. Try adjusting the criteria.'
              : 'No entities found. Add your first entity using the button above!'}
          </div>
        ) : (
          data.items.map(e => {
            const style = getTypeColor(e.type);
            return (
              <div key={e.id} className="bg-white border border-slate-200 rounded-md p-3.5 space-y-2 flex flex-col justify-between hover:border-slate-300 hover:shadow-sm transition-all">
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

      {/* Add Entity Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowAddModal(false); }}
        >
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md relative">
            <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">Add New Entity</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 transition-colors"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4">
              <AddEntityForm onCreateEntity={handleCreateEntity} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
