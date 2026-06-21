'use client';

import { useState, useEffect } from 'react';
import {
  RectangleStackIcon,
  LinkIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';
import { API_URL } from './components/constants';
import NetworkExplorer from './components/NetworkExplorer';
import EntitiesList from './components/EntitiesList';
import ConnectionsLedger from './components/ConnectionsLedger';

export default function Home() {
  // Navigation tabs: 'entities' | 'connections' | 'graph'
  const [activeTab, setActiveTab] = useState('entities');

  // Core data states
  const [entities, setEntities] = useState([]);
  const [focusEntityId, setFocusEntityId] = useState(null);
  const [focusNetwork, setFocusNetwork] = useState({ nodes: [], edges: [] });
  const [depth, setDepth] = useState(2);
  // Bumped on every mutation so paginated child components know to refetch
  const [refreshKey, setRefreshKey] = useState(0);

  // Loading and Error states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [backendBuildTag, setBackendBuildTag] = useState('fetching...');
  const [connectionRules, setConnectionRules] = useState({});

  // Fetch all entities and connections on mount
  useEffect(() => {
    fetchData();
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
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEgoNetwork = async (entityId, currentDepth) => {
    try {
      const res = await fetch(`${API_URL}/api/entities/${entityId}/network?depth=${currentDepth}`);
      if (!res.ok) throw new Error('Failed to load ego network');
      const data = await res.json();
      setFocusNetwork(data);
    } catch (err) {
      console.error(err.message);
    }
  };

  const handleCreateEntity = async (entityData) => {
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
    } catch (err) {
      alert('Error creating entity: ' + err.message);
      return false;
    }
  };

  const handleCreateConnection = async (connectionData) => {
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
    } catch (err) {
      alert('Error creating connection: ' + err.message);
      return false;
    }
  };

  const handleDeleteEntity = async (id) => {
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
    } catch (err) {
      alert('Error deleting entity: ' + err.message);
    }
  };

  const handleDeleteConnection = async (id) => {
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
    } catch (err) {
      alert('Error deleting connection: ' + err.message);
    }
  };

  const TABS = [
    { id: 'entities', label: 'Entities', Icon: RectangleStackIcon },
    { id: 'connections', label: 'Connections', Icon: LinkIcon },
    { id: 'graph', label: 'Network Explorer', Icon: GlobeAltIcon },
  ];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-teal-500/20">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-30 px-4 py-2">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
                Caatch Graph
              </h1>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-500 font-medium">
                <span>Political Event &amp; Relation Monitor</span>
                <span className="hidden sm:inline text-slate-300">|</span>
                <span className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 text-[9px] px-1.5 py-0.2 rounded text-slate-600 font-mono">
                  Frontend: {process.env.NEXT_PUBLIC_IMAGE_TAG || 'local-dev'}
                </span>
                <span className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 text-[9px] px-1.5 py-0.2 rounded text-slate-600 font-mono">
                  Backend: {backendBuildTag}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex bg-slate-100 p-0.5 rounded border border-slate-200">
            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded transition-all duration-300 ${
                  activeTab === id
                    ? 'bg-white text-teal-600 border border-slate-200 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 space-y-2">

        {/* Error Notification */}
        {errorMessage && (
          <div className="p-2 rounded border border-rose-200 bg-rose-50 text-rose-700 text-xs flex items-center justify-between shadow-sm">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage('')} className="hover:text-rose-900 font-bold">&times;</button>
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
