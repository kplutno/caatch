'use client';

import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { RELATION_NAMES } from './constants';

export default function NetworkExplorer({
  entities,
  focusEntityId,
  setFocusEntityId,
  depth,
  setDepth,
  focusNetwork
}) {
  const svgRef = useRef(null);

  // Keep track of positions of nodes. Key: node.id, Value: {x, y}
  const [positions, setPositions] = useState({});
  // Keep track of which node is currently being dragged
  const [draggedNodeId, setDraggedNodeId] = useState(null);

  // Recalculate initial layout only when the focus entity or network nodes change
  useEffect(() => {
    if (!focusEntityId || !focusNetwork.nodes || focusNetwork.nodes.length === 0) {
      setPositions({});
      return;
    }

    const newPositions = {};
    const width = 500;
    
    // Count neighbors (connections/children) for each node inside focusNetwork
    const getConnectionCount = (nodeId) => {
      return focusNetwork.edges.filter(
        edge => edge.source_id === nodeId || edge.target_id === nodeId
      ).length;
    };

    // Categorize nodes
    const places = [];
    const organizations = [];
    const others = []; // persons, events, others

    focusNetwork.nodes.forEach(node => {
      const nodeWithCount = { ...node, degree: getConnectionCount(node.id) };
      if (node.type === 'place') {
        places.push(nodeWithCount);
      } else if (node.type === 'organization') {
        organizations.push(nodeWithCount);
      } else {
        others.push(nodeWithCount);
      }
    });

    // Sort rows: nodes with higher degrees come first (higher precedence/order)
    places.sort((a, b) => b.degree - a.degree);
    organizations.sort((a, b) => b.degree - a.degree);
    others.sort((a, b) => b.degree - a.degree);

    // Helper to distribute nodes horizontally across a row
    const layRow = (rowNodes, yCoordinate) => {
      if (rowNodes.length === 0) return;
      if (rowNodes.length === 1) {
        newPositions[rowNodes[0].id] = { x: width / 2, y: yCoordinate };
      } else {
        const step = (width - 100) / (rowNodes.length - 1);
        rowNodes.forEach((node, idx) => {
          newPositions[node.id] = {
            x: 50 + idx * step,
            // Add a small upward vertical shift (up to -20px) based on node rank/degree
            y: yCoordinate - Math.min(20, node.degree * 4)
          };
        });
      }
    };

    // Layer 1 (Top): Places (y = 100)
    layRow(places, 100);

    // Layer 2 (Middle): Organizations (y = 250)
    layRow(organizations, 250);

    // Layer 3 (Bottom): Persons, Events, Others (y = 400)
    layRow(others, 400);

    setPositions(newPositions);
  }, [focusEntityId, focusNetwork.nodes, focusNetwork.edges]);

  // Handle Drag Events
  const handleMouseDown = (e, nodeId) => {
    e.preventDefault();
    setDraggedNodeId(nodeId);
  };

  const handleMouseMove = useCallback((e) => {
    if (!draggedNodeId || !svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();

    // Convert client coordinates to SVG viewbox coordinates (500x500 scaling)
    const clientX = e.clientX || (e.touches && e.touches[0]?.clientX);
    const clientY = e.clientY || (e.touches && e.touches[0]?.clientY);

    if (clientX === undefined || clientY === undefined) return;

    const svgX = ((clientX - rect.left) / rect.width) * 500;
    const svgY = ((clientY - rect.top) / rect.height) * 500;

    // Keep nodes inside bounds [20, 480] to prevent disappearing off-screen
    const boundedX = Math.max(20, Math.min(480, svgX));
    const boundedY = Math.max(20, Math.min(480, svgY));

    setPositions(prev => ({
      ...prev,
      [draggedNodeId]: { x: boundedX, y: boundedY }
    }));
  }, [draggedNodeId]);

  const handleMouseUp = useCallback(() => {
    setDraggedNodeId(null);
  }, []);

  // Add global mouse listeners to make dragging smooth outside of the node bounds
  useEffect(() => {
    if (draggedNodeId) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleMouseMove);
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [draggedNodeId, handleMouseMove, handleMouseUp]);

  // Form coordinates for nodes and links
  const visualNetwork = useMemo(() => {
    if (!focusEntityId || focusNetwork.nodes.length === 0) return { nodes: [], edges: [] };

    const nodes = focusNetwork.nodes.map(node => {
      const pos = positions[node.id] || { x: 250, y: 250 };
      return {
        ...node,
        x: pos.x,
        y: pos.y,
        isCenter: node.id === focusEntityId
      };
    });

    const edges = [];
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
  }, [focusEntityId, focusNetwork, positions]);

  return (
    <div className="flex-1 flex flex-col space-y-2">
      {/* Explorer Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-2 rounded-md border border-slate-200">
        <div className="flex items-center gap-3">
          <label className="text-xs text-slate-500">Select Focus Entity:</label>
          <select
            value={focusEntityId || ''}
            onChange={(e) => setFocusEntityId(e.target.value || null)}
            className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none"
          >
            <option value="">-- No Focus Selected --</option>
            {entities.map(e => (
              <option key={e.id} value={e.id}>{e.name} ({e.type})</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500">Scan Depth:</label>
          <select
            value={depth}
            onChange={(e) => setDepth(Number(e.target.value))}
            className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none"
          >
            <option value={1}>1 Degree (Direct)</option>
            <option value={2}>2 Degrees (Standard)</option>
            <option value={3}>3 Degrees (Distant)</option>
          </select>
        </div>
      </div>

      {/* Ego Graph Display */}
      <div className="flex-1 min-h-[480px] bg-white border border-slate-200 rounded-md relative flex items-center justify-center p-2">
        {focusEntityId && visualNetwork.nodes.length > 0 ? (
          <div className="relative w-full max-w-[500px] h-[500px] select-none">
            <svg
              ref={svgRef}
              viewBox="0 0 500 500"
              className="w-full h-full"
            >
              {/* Connection Lines */}
              {visualNetwork.edges.map((edge, idx) => (
                <g key={idx}>
                  <line
                    x1={edge.x1}
                    y1={edge.y1}
                    x2={edge.x2}
                    y2={edge.y2}
                    stroke="rgba(148, 163, 184, 0.4)"
                    strokeWidth="1.5"
                  />
                  {/* Label on link */}
                  <foreignObject
                    x={(edge.x1 + edge.x2) / 2 - 40}
                    y={(edge.y1 + edge.y2) / 2 - 10}
                    width="80"
                    height="20"
                  >
                    <div className="bg-slate-50 border border-slate-200 rounded text-[9px] font-semibold text-slate-500 py-0.5 px-1 text-center truncate leading-none">
                      {RELATION_NAMES[edge.label] || edge.label}
                    </div>
                  </foreignObject>
                </g>
              ))}

              {/* Nodes */}
              {visualNetwork.nodes.map((node, idx) => {
                return (
                  <g
                    key={idx}
                    className="cursor-grab active:cursor-grabbing group"
                    onMouseDown={(e) => handleMouseDown(e, node.id)}
                    onTouchStart={(e) => handleMouseDown(e, node.id)}
                  >
                    {/* Circle Node (simplified flat style) */}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={node.isCenter ? 14 : 10}
                      fill={node.isCenter ? '#0d9488' : '#e2e8f0'}
                      stroke={node.isCenter ? '#0f766e' : '#cbd5e1'}
                      strokeWidth="1.5"
                    />
                    
                    {/* Simplified Node Label Display (aligned closer to node) */}
                    <foreignObject
                      x={node.x - 60}
                      y={node.y + (node.isCenter ? 18 : 14)}
                      width="120"
                      height="28"
                    >
                      <div className="text-center">
                        <p className={`text-[10px] font-semibold truncate ${node.isCenter ? 'text-teal-800 font-bold' : 'text-slate-700'}`}>
                          {node.name}
                        </p>
                        <p className="text-[8px] text-slate-400 uppercase tracking-wider">
                          {node.type}
                        </p>
                      </div>
                    </foreignObject>
                    
                    {/* Double-Click action to focus node */}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={24}
                      fill="transparent"
                      className="cursor-pointer"
                      onDoubleClick={() => setFocusEntityId(node.id)}
                    />
                  </g>
                );
              })}
            </svg>

          </div>
        ) : (
          <div className="text-center space-y-3">
            <p className="text-slate-500 text-sm">Select an entity to explore its relationship network.</p>
            {entities.length > 0 && (
              <button
                onClick={() => setFocusEntityId(entities[0].id)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs hover:bg-slate-50 text-teal-600 font-bold transition-all"
              >
                Start Explorer with {entities[0].name}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
