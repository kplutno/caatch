'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  MagnifyingGlassIcon,
  UserIcon,
  CalendarDaysIcon,
  MapPinIcon,
  BuildingOffice2Icon,
  SparklesIcon,
  PlusIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { getTypeColor, API_URL } from './constants';
import AddEntityForm from './AddEntityForm';
import { Entity, EntityCreate } from '../types';

const PAGE_SIZE = 12;

interface EntityTypeItem {
  value: string;
  label: string;
  Icon: React.ComponentType<any>;
}

const ENTITY_TYPES: EntityTypeItem[] = [
  { value: 'person', label: 'Person', Icon: UserIcon },
  { value: 'event', label: 'Event', Icon: CalendarDaysIcon },
  { value: 'place', label: 'Place', Icon: MapPinIcon },
  { value: 'organization', label: 'Organization', Icon: BuildingOffice2Icon },
];

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
    <div className="flex items-center justify-center gap-1 pt-2">
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

interface EntitiesListProps {
  setFocusEntityId: (id: string | null) => void;
  setActiveTab: (tab: string) => void;
  onDeleteEntity: (id: string) => Promise<void>;
  onCreateEntity: (entityData: EntityCreate) => Promise<boolean>;
  refreshKey: number;
}

interface EntitiesDataState {
  items: Entity[];
  total: number;
  total_pages: number;
}

export default function EntitiesList({
  setFocusEntityId,
  setActiveTab,
  onDeleteEntity,
  onCreateEntity,
  refreshKey,
}: EntitiesListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [data, setData] = useState<EntitiesDataState>({ items: [], total: 0, total_pages: 1 });
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('person');
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchPage = useCallback(async (page: number, search: string, type: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(PAGE_SIZE),
      });
      if (search.trim()) params.set('search', search.trim());
      
      const typePlurals: Record<string, string> = {
        person: 'persons',
        event: 'events',
        place: 'places',
        organization: 'organizations'
      };
      const plural = typePlurals[type] || 'persons';
      const res = await fetch(`${API_URL}/api/${plural}?${params}`);
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

  const handleDelete = async (id: string) => {
    await onDeleteEntity(id);
    const remainingOnPage = data.items.length - 1;
    if (remainingOnPage === 0 && currentPage > 1) {
      setCurrentPage(p => p - 1);
    } else {
      fetchPage(currentPage, searchQuery, selectedType);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, data.total_pages)));
  };

  const handleCreateEntity = async (entityData: EntityCreate) => {
    const success = await onCreateEntity(entityData);
    if (success) {
      setShowAddModal(false);
      fetchPage(currentPage, searchQuery, selectedType);
    }
    return success;
  };

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-slate-800 tracking-wide">Registered Entities</h2>
          <span className="text-xs bg-slate-100 border border-slate-200 text-slate-600 px-2.5 py-1 rounded-md font-semibold">
            {data.total} Total
          </span>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
        >
          <PlusIcon className="w-4 h-4" /> Add Entity
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col xl:flex-row gap-4">
        {/* Search input */}
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search entities by name…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500/20 focus:border-sky-500/50 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Type filter chips */}
        <div className="flex flex-wrap gap-2">
          {ENTITY_TYPES.map(({ value, label, Icon }) => (
            <button
              key={value}
              onClick={() => setSelectedType(value)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all border cursor-pointer ${
                selectedType === value
                  ? 'bg-sky-50 text-sky-600 border-sky-300 shadow-sm'
                  : 'bg-white text-slate-650 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Entity Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-3 p-12 text-center text-slate-400 text-sm animate-pulse">Loading…</div>
        ) : data.items.length === 0 ? (
          <div className="col-span-3 p-12 text-center bg-white border border-slate-200/85 rounded-2xl text-slate-500 text-sm">
            {searchQuery || selectedType
              ? 'No entities match your search or filter. Try adjusting the criteria.'
              : 'No entities found. Add your first entity using the button above!'}
          </div>
        ) : (
          data.items.map(e => {
            const style = getTypeColor(e.type);
            return (
              <div key={e.id} className="glass-card p-5 rounded-2xl flex flex-col justify-between relative overflow-hidden group">
                {/* Visual accent background */}
                <div className={`absolute inset-0 ${style.bgAccent} opacity-40 pointer-events-none`} />

                <div className="space-y-3 relative z-10">
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-0.5 rounded-full text-[8px] font-extrabold uppercase border ${style.bg}`}>
                      {e.type}
                    </span>
                    <span className="text-[9px] text-slate-450 font-mono">ID: {e.id.slice(0, 8)}...</span>
                  </div>
                  <h3 className="font-bold text-slate-800 text-lg group-hover:text-slate-900 transition-colors">{e.name}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 min-h-[32px]">{e.description || 'No description provided.'}</p>


                </div>

                <div className="flex gap-2.5 pt-4 mt-4 border-t border-slate-100 relative z-10">
                  <button
                    onClick={() => { setFocusEntityId(e.id); setActiveTab('graph'); }}
                    className="flex-1 py-2 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 font-bold text-xs rounded-xl transition-all cursor-pointer text-center"
                  >
                    Explore Network
                  </button>
                  <button
                    onClick={() => handleDelete(e.id)}
                    className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs transition-all cursor-pointer text-center"
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
        <div className="flex flex-col items-center gap-2 pt-4">
          <p className="text-[10px] text-slate-500">
            Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, data.total)} of {data.total} entities
          </p>
          <Pagination currentPage={currentPage} totalPages={data.total_pages} onPageChange={handlePageChange} />
        </div>
      )}

      {/* Add Entity Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 animate-fade-in"
          onClick={e => { if (e.target === e.currentTarget) setShowAddModal(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-md relative overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <PlusIcon className="w-4 h-4 text-sky-500" />
                Add New Entity
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 max-h-[80vh] overflow-y-auto">
              <AddEntityForm onCreateEntity={handleCreateEntity} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
