'use client';

import { useState, useEffect, useMemo } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function Home() {
  // Navigation tabs: 'graph' | 'entities' | 'connections'
  const [activeTab, setActiveTab] = useState('graph');

  // Core data states
  const [entities, setEntities] = useState([]);
  const [connections, setConnections] = useState([]);
  const [focusEntityId, setFocusEntityId] = useState(null);
  const [focusNetwork, setFocusNetwork] = useState({ nodes: [], edges: [] });
  const [depth, setDepth] = useState(2);

  // Loading and Error states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Form states for creating Entity
  const [newEntity, setNewEntity] = useState({
    name: '',
    type: 'person',
    description: '',
    propKey: '',
    propValue: '',
    properties: {}
  });

  // Form states for creating Connection
  const [newConnection, setNewConnection] = useState({
    source_id: '',
    target_id: '',
    label: 'KNOWS',
    description: ''
  });

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
      const [entitiesRes, connectionsRes] = await Promise.all([
        fetch(`${API_URL}/api/entities`),
        fetch(`${API_URL}/api/connections`)
      ]);

      if (!entitiesRes.ok || !connectionsRes.ok) {
        throw new Error('Failed to fetch initial data from backend');
      }

      const entitiesData = await entitiesRes.json();
      const connectionsData = await connectionsRes.json();

      setEntities(entitiesData);
      setConnections(connectionsData);

      // Auto-focus first entity if available and none selected
      if (entitiesData.length > 0 && !focusEntityId) {
        setFocusEntityId(entitiesData[0].id);
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

  // Add key-value property helper
  const addProperty = () => {
    if (!newEntity.propKey.trim()) return;
    setNewEntity(prev => ({
      ...prev,
      properties: {
        ...prev.properties,
        [prev.propKey.trim()]: prev.propValue.trim()
      },
      propKey: '',
      propValue: ''
    }));
  };

  // Remove property helper
  const removeProperty = (key) => {
    setNewEntity(prev => {
      const updatedProps = { ...prev.properties };
      delete updatedProps[key];
      return { ...prev, properties: updatedProps };
    });
  };

  const handleCreateEntity = async (e) => {
    e.preventDefault();
    if (!newEntity.name.trim()) return;

    try {
      const res = await fetch(`${API_URL}/api/entities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newEntity.name,
          type: newEntity.type,
          description: newEntity.description || null,
          properties: newEntity.properties
        })
      });

      if (!res.ok) throw new Error(await res.text());
      const created = await res.json();

      setNewEntity({
        name: '',
        type: 'person',
        description: '',
        propKey: '',
        propValue: '',
        properties: {}
      });

      // Refresh list and focus the new entity
      await fetchData();
      setFocusEntityId(created.id);
      setActiveTab('graph');
    } catch (err) {
      alert('Error creating entity: ' + err.message);
    }
  };

  const handleCreateConnection = async (e) => {
    e.preventDefault();
    const { source_id, target_id, label, description } = newConnection;
    if (!source_id || !target_id) {
      alert('Please select both source and target entities.');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/connections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_id,
          target_id,
          label,
          description: description || null,
          properties: {}
        })
      });

      if (!res.ok) throw new Error(await res.text());

      setNewConnection({
        source_id: '',
        target_id: '',
        label: 'KNOWS',
        description: ''
      });

      await fetchData();
      // Refresh network view if focused node is part of connection
      if (focusEntityId === source_id || focusEntityId === target_id) {
        fetchEgoNetwork(focusEntityId, depth);
      }
    } catch (err) {
      alert('Error creating connection: ' + err.message);
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

  // Find targeted entity info helper
  const focusEntity = useMemo(() => {
    return entities.find(e => e.id === focusEntityId) || null;
  }, [entities, focusEntityId]);

  // Network Visual Layout calculation: circular layout
  // Center is at (250, 250) in a 500x500 box.
  const visualNetwork = useMemo(() => {
    if (!focusEntityId || focusNetwork.nodes.length === 0) return { nodes: [], edges: [] };

    const nodes = [];
    const edges = [];
    const centerX = 250;
    const centerY = 250;

    // Focus Node
    nodes.push({
      ...focusNetwork.nodes.find(n => n.id === focusEntityId),
      x: centerX,
      y: centerY,
      isCenter: true
    });

    // Neighbor Nodes
    const neighbors = focusNetwork.nodes.filter(n => n.id !== focusEntityId);
    const radius = 160;

    neighbors.forEach((node, i) => {
      const angle = (i * 2 * Math.PI) / neighbors.length;
      nodes.push({
        ...node,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        isCenter: false
      });
    });

    // Build edges with positions
    focusNetwork.edges.forEach(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source_id);
      const targetNode = nodes.find(n => n.id === edge.target_id);
      if (sourceNode && targetNode) {
        edges.push({
          ...edge,
          x1: sourceNode.x,
          y1: sourceNode.y,
          x2: targetNode.x,
          y2: targetNode.y
        });
      }
    });

    return { nodes, edges };
  }, [focusEntityId, focusNetwork]);

  // Color helper based on node types
  const getTypeColor = (type) => {
    switch (type) {
      case 'person': return { bg: 'bg-teal-500/10 border-teal-500/30 text-teal-400', fill: '#14b8a6', glow: 'rgba(20, 184, 166, 0.4)' };
      case 'event': return { bg: 'bg-rose-500/10 border-rose-500/30 text-rose-400', fill: '#f43f5e', glow: 'rgba(244, 63, 94, 0.4)' };
      case 'place': return { bg: 'bg-sky-500/10 border-sky-500/30 text-sky-400', fill: '#0ea5e9', glow: 'rgba(14, 165, 233, 0.4)' };
      case 'organization': return { bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400', fill: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)' };
      default: return { bg: 'bg-purple-500/10 border-purple-500/30 text-purple-400', fill: '#a855f7', glow: 'rgba(168, 85, 247, 0.4)' };
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-teal-500/30">
      {/* Decorative Blur Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-[30%] -left-[10%] w-[60%] h-[60%] rounded-full bg-teal-500/10 blur-[130px]" />
        <div className="absolute top-[50%] -right-[10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px]" />
      </div>

      {/* Header */}
      <header className="border-b border-white/5 bg-slate-900/60 backdrop-blur-xl sticky top-0 z-30 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <span className="font-black text-xl text-white">C</span>
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
                Caatch Graph
              </h1>
              <p className="text-xs text-slate-400 font-medium">Political Event & Relation Monitor</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex bg-slate-950 p-1.5 rounded-xl border border-white/5">
            {[
              { id: 'graph', label: 'Network Explorer' },
              { id: 'entities', label: 'Entities' },
              { id: 'connections', label: 'Connections' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-300 ${activeTab === tab.id
                  ? 'bg-slate-800 text-teal-400 shadow-inner border border-white/5'
                  : 'text-slate-400 hover:text-slate-200'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Error Notification */}
        {errorMessage && (
          <div className="col-span-12 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center justify-between">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage('')} className="hover:text-white font-bold">&times;</button>
          </div>
        )}

        {/* Left Control Panel / Inputs (4 cols) */}
        <aside className="lg:col-span-4 space-y-6">

          {/* Quick Entity Creation */}
          <section className="bg-slate-900/40 backdrop-blur-xl border border-white/5 p-6 rounded-2xl space-y-4">
            <h2 className="text-sm font-semibold text-slate-300 tracking-wider uppercase">Add Entity</h2>
            <form onSubmit={handleCreateEntity} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Entity Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senator Jane Doe, Geneva Summit"
                  value={newEntity.name}
                  onChange={(e) => setNewEntity(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Type</label>
                <select
                  value={newEntity.type}
                  onChange={(e) => setNewEntity(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  <option value="person">👤 Person</option>
                  <option value="event">📅 Event</option>
                  <option value="place">📍 Place</option>
                  <option value="organization">🏢 Organization</option>
                  <option value="other">🧬 Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Description</label>
                <textarea
                  placeholder="Brief context or notes"
                  rows={2}
                  value={newEntity.description}
                  onChange={(e) => setNewEntity(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              {/* Dynamic properties */}
              <div className="space-y-2">
                <label className="block text-xs text-slate-400">Custom Attributes (Optional)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Key (e.g. Party)"
                    value={newEntity.propKey}
                    onChange={(e) => setNewEntity(prev => ({ ...prev, propKey: e.target.value }))}
                    className="flex-1 bg-slate-950/60 border border-white/10 rounded-xl px-2 py-1.5 text-xs text-slate-200 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Value (e.g. Democrat)"
                    value={newEntity.propValue}
                    onChange={(e) => setNewEntity(prev => ({ ...prev, propValue: e.target.value }))}
                    className="flex-1 bg-slate-950/60 border border-white/10 rounded-xl px-2 py-1.5 text-xs text-slate-200 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={addProperty}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold"
                  >
                    +
                  </button>
                </div>

                {Object.keys(newEntity.properties).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {Object.entries(newEntity.properties).map(([k, v]) => (
                      <span key={k} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-slate-300">
                        <strong>{k}:</strong> {v}
                        <button type="button" onClick={() => removeProperty(k)} className="text-slate-500 hover:text-slate-300">&times;</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white font-semibold text-xs rounded-xl shadow-lg transition-all"
              >
                Create Entity
              </button>
            </form>
          </section>

          {/* Quick Connection Creation */}
          <section className="bg-slate-900/40 backdrop-blur-xl border border-white/5 p-6 rounded-2xl space-y-4">
            <h2 className="text-sm font-semibold text-slate-300 tracking-wider uppercase">Link Entities</h2>
            <form onSubmit={handleCreateConnection} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Source Entity</label>
                <select
                  required
                  value={newConnection.source_id}
                  onChange={(e) => setNewConnection(prev => ({ ...prev, source_id: e.target.value }))}
                  className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none"
                >
                  <option value="">-- Choose Origin --</option>
                  {entities.map(e => (
                    <option key={e.id} value={e.id}>{e.name} ({e.type})</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-center">
                <span className="text-slate-600 font-extrabold text-sm">⬇ Connected To ⬇</span>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Target Entity</label>
                <select
                  required
                  value={newConnection.target_id}
                  onChange={(e) => setNewConnection(prev => ({ ...prev, target_id: e.target.value }))}
                  className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none"
                >
                  <option value="">-- Choose Destination --</option>
                  {entities.map(e => (
                    <option key={e.id} value={e.id}>{e.name} ({e.type})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Relation Label</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MEMBER_OF, ATTENDED, FUNDED"
                  value={newConnection.label}
                  onChange={(e) => setNewConnection(prev => ({ ...prev, label: e.target.value.toUpperCase() }))}
                  className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Description / Proof</label>
                <input
                  type="text"
                  placeholder="e.g. Signed treaty in 2024"
                  value={newConnection.description}
                  onChange={(e) => setNewConnection(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-slate-950/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-400 hover:to-blue-500 text-white font-semibold text-xs rounded-xl shadow-lg transition-all"
              >
                Establish Link
              </button>
            </form>
          </section>
        </aside>

        {/* Right Action Canvas (8 cols) */}
        <section className="lg:col-span-8 flex flex-col">

          {/* TAB 1: Network Explorer */}
          {activeTab === 'graph' && (
            <div className="flex-1 flex flex-col space-y-6">

              {/* Explorer Controls */}
              <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/40 p-4 rounded-2xl border border-white/5">
                <div className="flex items-center gap-3">
                  <label className="text-xs text-slate-400">Select Focus Entity:</label>
                  <select
                    value={focusEntityId || ''}
                    onChange={(e) => setFocusEntityId(e.target.value || null)}
                    className="bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="">-- No Focus Selected --</option>
                    {entities.map(e => (
                      <option key={e.id} value={e.id}>{e.name} ({e.type})</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-400">Scan Depth:</label>
                  <select
                    value={depth}
                    onChange={(e) => setDepth(Number(e.target.value))}
                    className="bg-slate-950 border border-white/10 rounded-lg px-2 py-1 text-xs text-slate-200"
                  >
                    <option value={1}>1 Degree (Direct)</option>
                    <option value={2}>2 Degrees (Standard)</option>
                    <option value={3}>3 Degrees (Distant)</option>
                  </select>
                </div>
              </div>

              {/* Ego Graph Display */}
              <div className="flex-1 min-h-[480px] bg-slate-950/40 border border-white/5 rounded-3xl relative flex items-center justify-center p-6 shadow-2xl">

                {focusEntityId && visualNetwork.nodes.length > 0 ? (
                  <div className="relative w-full max-w-[500px] h-[500px]">
                    <svg viewBox="0 0 500 500" className="w-full h-full">
                      {/* Connection Lines */}
                      {visualNetwork.edges.map((edge, idx) => (
                        <g key={idx}>
                          <line
                            x1={edge.x1}
                            y1={edge.y1}
                            x2={edge.x2}
                            y2={edge.y2}
                            stroke="rgba(255, 255, 255, 0.15)"
                            strokeWidth="2"
                            strokeDasharray="4 4"
                          />
                          {/* Label on link */}
                          <foreignObject
                            x={(edge.x1 + edge.x2) / 2 - 45}
                            y={(edge.y1 + edge.y2) / 2 - 8}
                            width="90"
                            height="18"
                          >
                            <div className="bg-slate-900/90 border border-white/10 rounded text-[9px] font-extrabold text-teal-400 py-0.5 text-center truncate shadow">
                              {edge.label}
                            </div>
                          </foreignObject>
                        </g>
                      ))}

                      {/* Nodes */}
                      {visualNetwork.nodes.map((node, idx) => {
                        const style = getTypeColor(node.type);
                        return (
                          <g
                            key={idx}
                            className="cursor-pointer group"
                            onClick={() => setFocusEntityId(node.id)}
                          >
                            {/* Outer Glow Ring on Hover */}
                            <circle
                              cx={node.x}
                              cy={node.y}
                              r={node.isCenter ? 32 : 24}
                              fill="transparent"
                              className="group-hover:fill-white/5 transition-all"
                              stroke={style.fill}
                              strokeWidth={node.isCenter ? 3 : 1}
                              style={{
                                filter: `drop-shadow(0 0 8px ${style.glow})`
                              }}
                            />
                            {/* Inner Node Circle */}
                            <circle
                              cx={node.x}
                              cy={node.y}
                              r={node.isCenter ? 26 : 18}
                              fill="#0f172a"
                            />
                            {/* Node Label Display */}
                            <foreignObject
                              x={node.x - 70}
                              y={node.y + (node.isCenter ? 36 : 28)}
                              width="140"
                              height="40"
                            >
                              <div className="text-center">
                                <p className={`text-[11px] font-bold truncate ${node.isCenter ? 'text-white' : 'text-slate-300'}`}>
                                  {node.name}
                                </p>
                                <p className="text-[9px] text-slate-500 uppercase tracking-widest">
                                  {node.type}
                                </p>
                              </div>
                            </foreignObject>
                          </g>
                        );
                      })}
                    </svg>

                    {/* Interactive Legend / Focus details overlay */}
                    {focusEntity && (
                      <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-md border border-white/10 p-4 rounded-2xl max-w-[220px] shadow-lg">
                        <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-extrabold uppercase mb-2 ${getTypeColor(focusEntity.type).bg}`}>
                          {focusEntity.type}
                        </span>
                        <h3 className="text-sm font-bold text-slate-100">{focusEntity.name}</h3>
                        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed line-clamp-3">
                          {focusEntity.description || 'No description provided.'}
                        </p>

                        {Object.keys(focusEntity.properties || {}).length > 0 && (
                          <div className="mt-3 pt-2.5 border-t border-white/5 space-y-1 max-h-24 overflow-y-auto">
                            {Object.entries(focusEntity.properties).map(([k, v]) => (
                              <div key={k} className="flex justify-between text-[9px] font-medium text-slate-500">
                                <span>{k}:</span>
                                <span className="text-slate-300 text-right font-semibold">{v}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center space-y-3">
                    <p className="text-slate-500 text-sm">Select an entity to explore its relationship network.</p>
                    {entities.length > 0 && (
                      <button
                        onClick={() => setFocusEntityId(entities[0].id)}
                        className="px-4 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs hover:bg-slate-800 text-teal-400 font-bold transition-all"
                      >
                        Start Explorer with {entities[0].name}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Entities list */}
          {activeTab === 'entities' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-200">Registered Entities</h2>
                <span className="text-xs bg-slate-900 border border-white/5 text-slate-400 px-2 py-1 rounded">
                  {entities.length} Total
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {entities.length === 0 ? (
                  <div className="col-span-2 p-12 text-center bg-slate-900/20 border border-white/5 rounded-2xl text-slate-500 text-sm">
                    No entities found. Create entities using the side panel!
                  </div>
                ) : (
                  entities.map(e => {
                    const style = getTypeColor(e.type);
                    return (
                      <div key={e.id} className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 space-y-3 flex flex-col justify-between hover:border-white/10 transition-all">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${style.bg}`}>
                              {e.type}
                            </span>
                            <span className="text-[10px] text-slate-600 font-mono">ID: {e.id.slice(0, 8)}...</span>
                          </div>
                          <h3 className="font-bold text-slate-200 text-base">{e.name}</h3>
                          <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">{e.description || 'No description provided.'}</p>

                          {Object.keys(e.properties || {}).length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1.5">
                              {Object.entries(e.properties).map(([k, v]) => (
                                <span key={k} className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400 border border-white/5">
                                  {k}: {v}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 pt-3 border-t border-white/5">
                          <button
                            onClick={() => { setFocusEntityId(e.id); setActiveTab('graph'); }}
                            className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-[10px] font-bold text-teal-400 transition-all"
                          >
                            Explore Network
                          </button>
                          <button
                            onClick={() => handleDeleteEntity(e.id)}
                            className="px-2.5 py-1.5 bg-rose-950/30 hover:bg-rose-900/30 border border-rose-500/20 hover:border-rose-500/40 rounded-lg text-[10px] font-bold text-rose-400 transition-all text-center"
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
          )}

          {/* TAB 3: Connections Ledger */}
          {activeTab === 'connections' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-200">Established Relations</h2>
                <span className="text-xs bg-slate-900 border border-white/5 text-slate-400 px-2 py-1 rounded">
                  {connections.length} Total
                </span>
              </div>

              <div className="bg-slate-900/30 border border-white/5 rounded-2xl overflow-hidden shadow-xl">
                {connections.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 text-sm">
                    No connections established yet. Create connections using the side panel!
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-950/60 border-b border-white/5 text-slate-400">
                          <th className="p-4 font-semibold uppercase tracking-wider">Source Entity</th>
                          <th className="p-4 font-semibold uppercase tracking-wider text-center">Relationship</th>
                          <th className="p-4 font-semibold uppercase tracking-wider">Target Entity</th>
                          <th className="p-4 font-semibold uppercase tracking-wider">Description</th>
                          <th className="p-4 font-semibold uppercase tracking-wider text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {connections.map((c, i) => {
                          const src = entities.find(e => e.id === c.source_id);
                          const trg = entities.find(e => e.id === c.target_id);
                          return (
                            <tr key={i} className="hover:bg-white/5 transition-colors">
                              <td className="p-4">
                                <span className="font-bold text-slate-200">{src ? src.name : 'Unknown Node'}</span>
                                <span className="block text-[10px] text-slate-500 uppercase">{src ? src.type : ''}</span>
                              </td>
                              <td className="p-4 text-center">
                                <span className="px-2 py-1 bg-teal-500/10 border border-teal-500/20 rounded-md text-[10px] font-extrabold text-teal-400 tracking-wider">
                                  {c.label}
                                </span>
                              </td>
                              <td className="p-4">
                                <span className="font-bold text-slate-200">{trg ? trg.name : 'Unknown Node'}</span>
                                <span className="block text-[10px] text-slate-500 uppercase">{trg ? trg.type : ''}</span>
                              </td>
                              <td className="p-4 text-slate-400 italic">
                                {c.description || '--'}
                              </td>
                              <td className="p-4 text-right">
                                <button
                                  onClick={() => handleDeleteConnection(c.id)}
                                  className="text-xs font-semibold text-rose-400 hover:text-rose-300 hover:underline"
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
          )}

        </section>
      </div>
    </main>
  );
}
