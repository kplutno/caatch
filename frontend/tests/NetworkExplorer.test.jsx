import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import NetworkExplorer from '../src/app/components/NetworkExplorer';

const ENTITIES = [
  { id: '1', name: 'Alice', type: 'person' },
  { id: '2', name: 'Geneva', type: 'place' },
  { id: '3', name: 'NATO', type: 'organization' },
];

const FOCUS_NETWORK = {
  nodes: [
    { id: '1', name: 'Alice', type: 'person' },
    { id: '2', name: 'Geneva', type: 'place' },
    { id: '3', name: 'NATO', type: 'organization' },
  ],
  edges: [
    { id: 'e1', source_id: '1', target_id: '2', label: 'LIVES_IN' },
    { id: 'e2', source_id: '1', target_id: '3', label: 'MEMBER_OF' },
  ],
};

describe('NetworkExplorer', () => {
  it('renders the component and lists entities in network', () => {
    render(
      <NetworkExplorer
        entities={ENTITIES}
        focusEntityId="1"
        setFocusEntityId={vi.fn()}
        depth={2}
        setDepth={vi.fn()}
        focusNetwork={FOCUS_NETWORK}
      />
    );

    expect(screen.getByText(/Select Focus Entity:/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Geneva/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/NATO/i).length).toBeGreaterThanOrEqual(1);
  });

  it('renders correctly even when focusNetwork has no nodes', () => {
    render(
      <NetworkExplorer
        entities={ENTITIES}
        focusEntityId="1"
        setFocusEntityId={vi.fn()}
        depth={2}
        setDepth={vi.fn()}
        focusNetwork={{ nodes: [], edges: [] }}
      />
    );

    expect(screen.getByText(/select an entity to explore/i)).toBeInTheDocument();
  });
});
