'use client';

import { useState, useEffect } from 'react';
import { API_URL } from './components/constants';
import AddEntityForm from './components/AddEntityForm';
import LinkEntitiesForm from './components/LinkEntitiesForm';
import NetworkExplorer from './components/NetworkExplorer';
import EntitiesList from './components/EntitiesList';
import ConnectionsLedger from './components/ConnectionsLedger';

export default function Home() {
  // Navigation tabs: 'graph' | 'entities' | 'connections'
  const [activeTab, setActiveTab] = useState('graph');

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
      setActiveTab('graph');
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

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-teal-500/20">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-30 px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
                Caatch Graph
              </h1>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-500 font-medium">
                <span>Political Event & Relation Monitor</span>
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
          <nav className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            {[
              { id: 'graph', label: 'Network Explorer' },
              { id: 'entities', label: 'Entities' },
              { id: 'connections', label: 'Connections' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 text-[11px] font-semibold rounded-md transition-all duration-300 ${activeTab === tab.id
                  ? 'bg-white text-teal-600 border border-slate-200'
                  : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-2 md:p-3 grid grid-cols-1 lg:grid-cols-12 gap-3">

        {/* Error Notification */}
        {errorMessage && (
          <div className="col-span-12 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between shadow-sm">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage('')} className="hover:text-rose-900 font-bold">&times;</button>
          </div>
        )}

        {/* Left Control Panel / Inputs (4 cols) */}
        <aside className="lg:col-span-4 space-y-4">
          <AddEntityForm onCreateEntity={handleCreateEntity} />
          <LinkEntitiesForm
            entities={entities}
            connectionRules={connectionRules}
            onCreateConnection={handleCreateConnection}
          />
        </aside>

        {/* Right Action Canvas (8 cols) */}
        <section className="lg:col-span-8 flex flex-col">

          {/* TAB 1: Network Explorer */}
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

          {/* TAB 2: Entities list */}
          {activeTab === 'entities' && (
            <EntitiesList
              setFocusEntityId={setFocusEntityId}
              setActiveTab={setActiveTab}
              onDeleteEntity={handleDeleteEntity}
              refreshKey={refreshKey}
            />
          )}

          {/* TAB 3: Connections Ledger */}
          {activeTab === 'connections' && (
            <ConnectionsLedger
              entities={entities}
              onDeleteConnection={handleDeleteConnection}
              refreshKey={refreshKey}
            />
          )}

        </section>
      </div>
    </main>
  );
}
