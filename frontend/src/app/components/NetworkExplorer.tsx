'use client';

import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { RELATION_NAMES, getTypeColor } from './constants';
import { Entity, Network, NetworkNode, NetworkEdge } from '../types';
import { GlobeAltIcon } from '@heroicons/react/24/outline';

interface NetworkExplorerProps {
  entities: Entity[];
  focusEntityId: string | null;
  setFocusEntityId: (id: string | null) => void;
  depth: number;
  setDepth: (depth: number) => void;
  focusNetwork: Network;
}

export default function NetworkExplorer({
  entities,
  focusEntityId,
  setFocusEntityId,
  depth,
  setDepth,
  focusNetwork
}: NetworkExplorerProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Keep track of positions of nodes. Key: node.id, Value: {x, y}
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  // Keep track of which node is currently being dragged
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  // Keep track of hovered node for information display overlay
  const [hoveredNode, setHoveredNode] = useState<NetworkNode | null>(null);

  // Recalculate initial layout only when the focus entity or network nodes change
  useEffect(() => {
    if (!focusEntityId || !focusNetwork.nodes || focusNetwork.nodes.length === 0) {
      setPositions({});
      return;
    }

    const newPositions: Record<string, { x: number; y: number }> = {};
    const width = 1000;
    
    // Count neighbors (connections/children) for each node inside focusNetwork
    const getConnectionCount = (nodeId: string) => {
      return focusNetwork.edges.filter(
        edge => edge.source_id === nodeId || edge.target_id === nodeId
      ).length;
    };

    // Categorize nodes
    const places: (NetworkNode & { degree: number })[] = [];
    const organizations: (NetworkNode & { degree: number })[] = [];
    const others: (NetworkNode & { degree: number })[] = []; // persons, events, others

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
    const layRow = (rowNodes: (NetworkNode & { degree: number })[], yCoordinate: number) => {
      if (rowNodes.length === 0) return;
      if (rowNodes.length === 1) {
        newPositions[rowNodes[0].id] = { x: width / 2, y: yCoordinate };
      } else {
        const step = (width - 160) / (rowNodes.length - 1);
        rowNodes.forEach((node, idx) => {
          newPositions[node.id] = {
            x: 80 + idx * step,
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
  const handleMouseDown = (e: React.MouseEvent<SVGElement> | React.TouchEvent<SVGElement>, nodeId: string) => {
    e.preventDefault();
    setDraggedNodeId(nodeId);
  };

  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!draggedNodeId || !svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();

    // Convert client coordinates to SVG viewbox coordinates (500x500 scaling)
    let clientX: number | undefined;
    let clientY: number | undefined;

    if (e instanceof MouseEvent) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else if (typeof TouchEvent !== 'undefined' && e instanceof TouchEvent) {
      clientX = e.touches[0]?.clientX;
      clientY = e.touches[0]?.clientY;
    }

    if (clientX === undefined || clientY === undefined) return;

    const svgX = ((clientX - rect.left) / rect.width) * 1000;
    const svgY = ((clientY - rect.top) / rect.height) * 500;

    // Keep nodes inside bounds [20, 980] and [20, 480] to prevent disappearing off-screen
    const boundedX = Math.max(20, Math.min(980, svgX));
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

    const nodes: (NetworkNode & { x: number; y: number; isCenter: boolean })[] = focusNetwork.nodes.map(node => {
      const pos = positions[node.id] || { x: 500, y: 250 };
      return {
        ...node,
        x: pos.x,
        y: pos.y,
        isCenter: node.id === focusEntityId,
        degree: focusNetwork.edges.filter(edge => edge.source_id === node.id || edge.target_id === node.id).length
      };
    });

    const edges: (NetworkEdge & { x1: number; y1: number; x2: number; y2: number })[] = [];
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
    <div className="flex-1 flex flex-col space-y-4">
      {/* Explorer Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <GlobeAltIcon className="w-5 h-5 text-sky-500" />
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Select Focus Entity:</label>
          <select
            value={focusEntityId || ''}
            onChange={(e) => setFocusEntityId(e.target.value || null)}
            className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-sky-500/50"
          >
            <option value="">-- No Focus Selected --</option>
            {entities.map(e => (
              <option key={e.id} value={e.id}>{e.name} ({e.type})</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Scan Depth</label>
          <select
            value={depth}
            onChange={(e) => setDepth(Number(e.target.value))}
            className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-sky-500/50"
          >
            <option value={1}>1 Degree (Direct)</option>
            <option value={2}>2 Degrees (Standard)</option>
            <option value={3}>3 Degrees (Distant)</option>
          </select>
        </div>
      </div>

      {/* Ego Graph Display */}
      <div className="flex-1 min-h-[500px] bg-slate-50/50 border border-slate-200 rounded-2xl relative flex items-center justify-center p-4 overflow-hidden shadow-inner">
        {focusEntityId && visualNetwork.nodes.length > 0 ? (
          <div className="relative w-full h-[500px] select-none bg-white rounded-xl border border-slate-100 p-2 shadow-xs">
            <svg
              ref={svgRef}
              viewBox="0 0 1000 500"
              className="w-full h-full"
            >
              {/* Connection Lines (Simple Straight Lines) */}
              {visualNetwork.edges.map((edge, idx) => {
                const midX = ((edge.x1 ?? 0) + (edge.x2 ?? 0)) / 2;
                const midY = ((edge.y1 ?? 0) + (edge.y2 ?? 0)) / 2;
                return (
                  <g key={idx}>
                    <line
                      x1={edge.x1}
                      y1={edge.y1}
                      x2={edge.x2}
                      y2={edge.y2}
                      stroke="rgba(203, 213, 225, 0.7)"
                      strokeWidth="1"
                    />
                    {/* Clean and simple text label without a box container */}
                    <text
                      x={midX}
                      y={midY - 4}
                      textAnchor="middle"
                      className="text-[8px] fill-slate-400 font-semibold select-none pointer-events-none"
                    >
                      {RELATION_NAMES[edge.label] || edge.label}
                      {(edge.start_time || edge.end_time) && ` (${edge.start_time ? new Date(edge.start_time).toLocaleDateString() : '?'} – ${edge.end_time ? new Date(edge.end_time).toLocaleDateString() : 'Present'})`}
                    </text>
                  </g>
                );
              })}

              {/* Nodes */}
              {visualNetwork.nodes.map((node, idx) => {
                const colors = getTypeColor(node.type);
                const displayName = node.name.length > 16 ? node.name.slice(0, 14) + '..' : node.name;

                return (
                  <g
                    key={idx}
                    className="cursor-grab active:cursor-grabbing group/node"
                    onMouseDown={(e) => handleMouseDown(e, node.id)}
                    onTouchStart={(e) => handleMouseDown(e, node.id)}
                    onMouseEnter={() => setHoveredNode(node)}
                    onMouseLeave={() => setHoveredNode(null)}
                  >
                    {/* Simple Static Accent Ring for Focus Entity */}
                    {node.isCenter && (
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={14}
                        fill="none"
                        stroke={colors.fill}
                        strokeWidth="1.5"
                        opacity="0.4"
                      />
                    )}

                    {/* Node Circle */}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={node.isCenter ? 9 : 6.5}
                      fill={colors.fill}
                      stroke={colors.border}
                      strokeWidth="1"
                    />
                    
                    {/* Node Text Label (aligned closer to node) */}
                    <text
                      x={node.x}
                      y={node.y + (node.isCenter ? 18 : 14)}
                      textAnchor="middle"
                      className={`text-[9px] select-none pointer-events-none ${
                        node.isCenter ? 'fill-slate-900 font-bold' : 'fill-slate-600 group-hover/node:fill-slate-800 font-medium'
                      }`}
                    >
                      {displayName}
                    </text>
                    
                    {/* Double-Click action to focus node */}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={20}
                      fill="transparent"
                      className="cursor-pointer"
                      onDoubleClick={() => setFocusEntityId(node.id)}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Hover Node Details Floating Light Card Panel */}
            {hoveredNode && (
              <div className="absolute top-4 right-4 w-60 bg-white/95 border border-slate-200 p-4 rounded-xl shadow-lg pointer-events-none space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-800 truncate max-w-[70%]">{hoveredNode.name}</span>
                  <span className={`text-[8px] font-extrabold uppercase px-2 py-0.5 rounded border ${getTypeColor(hoveredNode.type).bg}`}>
                    {hoveredNode.type}
                  </span>
                </div>
                {hoveredNode.description && (
                  <p className="text-[10px] text-slate-500 italic leading-relaxed">&quot;{hoveredNode.description}&quot;</p>
                )}
                <div className="flex justify-between items-center text-[9px] text-slate-400 pt-1">
                  <span>Connections Count:</span>
                  <span className="font-bold text-sky-600">{hoveredNode.degree ?? 0}</span>
                </div>
              </div>
            )}

          </div>
        ) : (
          <div className="text-center space-y-4">
            <p className="text-slate-500 text-sm">Select an entity to explore its relationship network.</p>
            {entities.length > 0 && (
              <button
                onClick={() => setFocusEntityId(entities[0].id)}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white font-extrabold text-xs rounded-xl shadow-sm cursor-pointer"
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
