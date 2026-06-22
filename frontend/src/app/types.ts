export interface Entity {
  id: string;
  name: string;
  type: string;
  description?: string | null;
}

export interface EntityCreate {
  name: string;
  type: string;
  description?: string | null;
}

export interface Connection {
  id: string;
  source_id: string;
  target_id: string;
  label: string;
  description?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  properties: Record<string, any>;
}

export interface ConnectionCreate {
  source_id: string;
  target_id: string;
  label: string;
  description?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  properties: Record<string, any>;
}

export interface NetworkNode {
  id: string;
  name: string;
  type: string;
  description?: string | null;
  degree?: number;
  x?: number;
  y?: number;
  isCenter?: boolean;
}

export interface NetworkEdge {
  id: string;
  source_id: string;
  target_id: string;
  label: string;
  start_time?: string | null;
  end_time?: string | null;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
}

export interface Network {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
}
