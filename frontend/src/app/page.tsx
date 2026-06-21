'use client';

import { useState, useEffect } from 'react';
import {
  RectangleStackIcon,
  LinkIcon,
  GlobeAltIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { API_URL } from './components/constants';
import NetworkExplorer from './components/NetworkExplorer';
import EntitiesList from './components/EntitiesList';
import ConnectionsLedger from './components/ConnectionsLedger';
import { Entity, EntityCreate, ConnectionCreate, Network } from './types';

interface TabItem {
  id: string;
  label: string;
  Icon: React.ComponentType<React.ComponentProps<'svg'>>;
}

export default function Home() {
  // Navigation tabs: 'entities' | 'connections' | 'graph'
  const [activeTab, setActiveTab] = useState<string>('entities');

  // Core data states
  const [entities, setEntities] = useState<Entity[]>([]);
  const [focusEntityId, setFocusEntityId] = useState<string | null>(null);
  const [focusNetwork, setFocusNetwork] = useState<Network>({ nodes: [], edges: [] });
  const [depth, setDepth] = useState<number>(2);
  // Bumped on every mutation so paginated child components know to refetch
  const [refreshKey, setRefreshKey] = useState<number>(0);

  // Loading and Error states
  const [_isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [backendBuildTag, setBackendBuildTag] = useState<string>('fetching...');
  const [connectionRules, setConnectionRules] = useState<Record<string, Record<string, string[]>>>({});

  // Fetch all entities and connections on mount
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch ego network whenever focusEntityId or depth changes
  useEffect(() => {
    if (focusEntityId) {
      fetchEgoNetwork(focusEntityId, depth);
    } else {
      setFocusNetwork({ nodes: [], edges: [] });
    }
  }, [focusEntityId, depth]);

  const fetchData = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const [entitiesRes, rulesRes, healthRes] = await Promise.all([
        fetch(`${API_URL}/api/entities?page=1&page_size=200`),
        fetch(`${API_URL}/api/connections/rules`),
        fetch(`${API_URL}/api/health`).catch(() => null)
      ]);

      if (!entitiesRes.ok || !rulesRes.ok) {
        throw new Error('Failed to fetch initial data from backend');
      }

      if (healthRes && healthRes.ok) {
        const healthData = await healthRes.json();
        setBackendBuildTag(healthData.build_tag || 'local-dev');
      } else {
        setBackendBuildTag('unreachable');
      }

      const entitiesData = await entitiesRes.json();
      const rulesData = await rulesRes.json();

      setEntities(entitiesData.items);
      setConnectionRules(rulesData);
      setRefreshKey(k => k + 1);

      // Auto-focus first entity if available and none selected
      if (entitiesData.items.length > 0 && !focusEntityId) {
        setFocusEntityId(entitiesData.items[0].id);
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEgoNetwork = async (entityId: string, currentDepth: number) => {
    try {
      const res = await fetch(`${API_URL}/api/entities/${entityId}/network?depth=${currentDepth}`);
      if (!res.ok) throw new Error('Failed to load ego network');
      const data = await res.json();
      setFocusNetwork(data);
    } catch (err: any) {
      console.error(err.message);
    }
  };

  const handleCreateEntity = async (entityData: EntityCreate): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/api/entities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entityData)
      });

      if (!res.ok) throw new Error(await res.text());
      const created = await res.json();

      // Refresh list and focus the new entity
      await fetchData();
      setFocusEntityId(created.id);
      return true;
    } catch (err: any) {
      alert('Error creating entity: ' + err.message);
      return false;
    }
  };

  const handleCreateConnection = async (connectionData: ConnectionCreate): Promise<boolean> => {
    const { source_id, target_id } = connectionData;
    try {
      const res = await fetch(`${API_URL}/api/connections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(connectionData)
      });

      if (!res.ok) throw new Error(await res.text());

      await fetchData();
      // Refresh network view if focused node is part of connection
      if (focusEntityId === source_id || focusEntityId === target_id) {
        fetchEgoNetwork(focusEntityId, depth);
      }
      return true;
    } catch (err: any) {
      alert('Error creating connection: ' + err.message);
      return false;
    }
  };

  const handleDeleteEntity = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entity? All associated connections will be removed.')) return;
    try {
      const res = await fetch(`${API_URL}/api/entities/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error(await res.text());

      if (focusEntityId === id) {
        setFocusEntityId(null);
      }
      await fetchData();
    } catch (err: any) {
      alert('Error deleting entity: ' + err.message);
    }
  };

  const handleDeleteConnection = async (id: string) => {
    if (!confirm('Are you sure you want to delete this connection?')) return;
    try {
      const res = await fetch(`${API_URL}/api/connections/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error(await res.text());

      await fetchData();
      if (focusEntityId) {
        fetchEgoNetwork(focusEntityId, depth);
      }
    } catch (err: any) {
      alert('Error deleting connection: ' + err.message);
    }
  };

  const TABS: TabItem[] = [
    { id: 'entities', label: 'Entities', Icon: RectangleStackIcon },
    { id: 'connections', label: 'Connections', Icon: LinkIcon },
    { id: 'graph', label: 'Network Explorer', Icon: GlobeAltIcon },
  ];

  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col font-sans relative selection:bg-sky-500/20 overflow-x-hidden">
      {/* Header */}
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-30 px-6 py-4 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Caatch Graph
              </h1>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 font-medium mt-0.5">
                <span>Political Event &amp; Relation Monitor</span>
                <span className="hidden sm:inline text-slate-300">|</span>
                <span className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 text-[10px] px-2 py-0.5 rounded-md text-slate-600 font-mono">
                  Frontend: {process.env.NEXT_PUBLIC_IMAGE_TAG || 'local-dev'}
                </span>
                <span className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 text-[10px] px-2 py-0.5 rounded-md text-slate-600 font-mono">
                  Backend: {backendBuildTag}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex bg-slate-100/80 p-1 border border-slate-200/60 rounded-xl backdrop-blur-sm">
            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                  activeTab === id
                    ? 'bg-white text-sky-600 border border-slate-200 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/40 border border-transparent'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-4 relative z-10">

        {/* Error Notification */}
        {errorMessage && (
          <div className="p-3 rounded-lg border border-rose-250 bg-rose-50 text-rose-800 text-xs flex items-center justify-between shadow-xs">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage('')} className="text-rose-600 hover:text-rose-950 transition-all cursor-pointer">
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* TAB 1: Entities (default) */}
        {activeTab === 'entities' && (
          <EntitiesList
            setFocusEntityId={setFocusEntityId}
            setActiveTab={setActiveTab}
            onDeleteEntity={handleDeleteEntity}
            onCreateEntity={handleCreateEntity}
            refreshKey={refreshKey}
          />
        )}

        {/* TAB 2: Connections */}
        {activeTab === 'connections' && (
          <ConnectionsLedger
            entities={entities}
            connectionRules={connectionRules}
            onDeleteConnection={handleDeleteConnection}
            onCreateConnection={handleCreateConnection}
            refreshKey={refreshKey}
          />
        )}

        {/* TAB 3: Network Explorer */}
        {activeTab === 'graph' && (
          <NetworkExplorer
            entities={entities}
            focusEntityId={focusEntityId}
            setFocusEntityId={setFocusEntityId}
            depth={depth}
            setDepth={setDepth}
            focusNetwork={focusNetwork}
          />
        )}

      </div>
    </main>
  );
}
