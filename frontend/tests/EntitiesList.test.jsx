import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EntitiesList from '../src/app/components/EntitiesList';

const mockEntities = {
  items: [
    { id: '1-uuid', name: 'Alice', type: 'person', description: 'A political figure.', properties: { Party: 'Democrat' } },
    { id: '2-uuid', name: 'Geneva', type: 'place', description: 'A diplomatic hub.', properties: { Country: 'Switzerland', coordinates: { lat: 52.23, lng: 21.01 } } },
  ],
  total: 2,
  total_pages: 1,
};

describe('EntitiesList', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockEntities),
    }));
  });

  it('renders the list of entities fetched from the API', async () => {
    render(
      <EntitiesList
        setFocusEntityId={vi.fn()}
        setActiveTab={vi.fn()}
        onDeleteEntity={vi.fn()}
        onCreateEntity={vi.fn()}
        refreshKey={0}
      />
    );

    // Should render the header
    expect(screen.getByText('Registered Entities')).toBeInTheDocument();

    // Wait for the mock entities to be loaded and rendered
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Geneva')).toBeInTheDocument();
    });

    // Check descriptions and properties
    expect(screen.getByText('A political figure.')).toBeInTheDocument();
    expect(screen.getByText('Party: Democrat')).toBeInTheDocument();
    expect(screen.getByText('Country: Switzerland')).toBeInTheDocument();
    expect(screen.getByText('coordinates: {"lat":52.23,"lng":21.01}')).toBeInTheDocument();
  });

  it('filters entities by type when a filter chip is clicked', async () => {
    const user = userEvent.setup();
    render(
      <EntitiesList
        setFocusEntityId={vi.fn()}
        setActiveTab={vi.fn()}
        onDeleteEntity={vi.fn()}
        onCreateEntity={vi.fn()}
        refreshKey={0}
      />
    );

    // Wait for initial fetch
    await screen.findByText('Alice');

    // Click on the "Place" filter chip
    const placeChip = screen.getByRole('button', { name: /Place/i });
    await user.click(placeChip);

    // Check that fetch was called with the type parameter set to 'place'
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('type=place')
    );
  });

  it('searches entities by name when query is typed', async () => {
    const user = userEvent.setup();
    render(
      <EntitiesList
        setFocusEntityId={vi.fn()}
        setActiveTab={vi.fn()}
        onDeleteEntity={vi.fn()}
        onCreateEntity={vi.fn()}
        refreshKey={0}
      />
    );

    await screen.findByText('Alice');

    const searchInput = screen.getByPlaceholderText(/search entities by name/i);
    await user.type(searchInput, 'Geneva');

    // Check that fetch was called with search=Geneva
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('search=Geneva')
      );
    });
  });

  it('calls setFocusEntityId and setActiveTab when Explore Network is clicked', async () => {
    const user = userEvent.setup();
    const setFocusEntityId = vi.fn();
    const setActiveTab = vi.fn();

    render(
      <EntitiesList
        setFocusEntityId={setFocusEntityId}
        setActiveTab={setActiveTab}
        onDeleteEntity={vi.fn()}
        onCreateEntity={vi.fn()}
        refreshKey={0}
      />
    );

    await screen.findByText('Alice');

    // Find "Explore Network" buttons (there will be one per entity card)
    const exploreButtons = screen.getAllByRole('button', { name: /Explore Network/i });
    await user.click(exploreButtons[1]); // Explore Network for Geneva (index 1)

    expect(setFocusEntityId).toHaveBeenCalledWith('2-uuid');
    expect(setActiveTab).toHaveBeenCalledWith('graph');
  });

  it('calls onDeleteEntity when Delete button is clicked', async () => {
    const user = userEvent.setup();
    const onDeleteEntity = vi.fn();

    render(
      <EntitiesList
        setFocusEntityId={vi.fn()}
        setActiveTab={vi.fn()}
        onDeleteEntity={onDeleteEntity}
        onCreateEntity={vi.fn()}
        refreshKey={0}
      />
    );

    await screen.findByText('Alice');

    const deleteButtons = screen.getAllByRole('button', { name: /Delete/i });
    await user.click(deleteButtons[0]); // Delete Alice

    expect(onDeleteEntity).toHaveBeenCalledWith('1-uuid');
  });

  it('opens the Add Entity modal when Add Entity is clicked', async () => {
    const user = userEvent.setup();
    render(
      <EntitiesList
        setFocusEntityId={vi.fn()}
        setActiveTab={vi.fn()}
        onDeleteEntity={vi.fn()}
        onCreateEntity={vi.fn()}
        refreshKey={0}
      />
    );

    await screen.findByText('Alice');

    const addEntityButton = screen.getByRole('button', { name: /Add Entity/i });
    await user.click(addEntityButton);

    // Modal heading should appear
    expect(screen.getByText('Add New Entity')).toBeInTheDocument();
  });
});
