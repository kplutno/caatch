import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LinkEntitiesForm from '../src/app/components/LinkEntitiesForm';

const ENTITIES = [
  { id: '1', name: 'Alice', type: 'person' },
  { id: '2', name: 'UN HQ', type: 'place' },
  { id: '3', name: 'NATO', type: 'organization' },
];

const CONNECTION_RULES = {
  person: {
    KNOWS: ['person'],
    LIVES_IN: ['place'],
    MEMBER_OF: ['organization'],
  },
  place: {},
  organization: {},
};

describe('LinkEntitiesForm', () => {
  it('renders the form heading and source select', () => {
    render(
      <LinkEntitiesForm
        entities={ENTITIES}
        connectionRules={CONNECTION_RULES}
        onCreateConnection={vi.fn()}
      />
    );
    expect(screen.getByText('Link Entities')).toBeInTheDocument();
    expect(screen.getByText('-- Choose Origin --')).toBeInTheDocument();
  });

  it('renders all entities as source options', () => {
    render(
      <LinkEntitiesForm
        entities={ENTITIES}
        connectionRules={CONNECTION_RULES}
        onCreateConnection={vi.fn()}
      />
    );
    expect(screen.getByText('Alice (person)')).toBeInTheDocument();
    expect(screen.getByText('UN HQ (place)')).toBeInTheDocument();
    expect(screen.getByText('NATO (organization)')).toBeInTheDocument();
  });

  it('populates allowed relation labels after selecting a source entity', async () => {
    const user = userEvent.setup();
    render(
      <LinkEntitiesForm
        entities={ENTITIES}
        connectionRules={CONNECTION_RULES}
        onCreateConnection={vi.fn()}
      />
    );

    const [sourceSelect] = screen.getAllByRole('combobox');
    await user.selectOptions(sourceSelect, '1'); // Alice (person)

    // All three person labels should appear in the relation select
    expect(screen.getByText('Knows')).toBeInTheDocument();
    expect(screen.getByText('Lives In')).toBeInTheDocument();
    expect(screen.getByText('Member Of')).toBeInTheDocument();
  });

  it('filters target options to only entities compatible with the chosen label', async () => {
    const user = userEvent.setup();
    render(
      <LinkEntitiesForm
        entities={ENTITIES}
        connectionRules={CONNECTION_RULES}
        onCreateConnection={vi.fn()}
      />
    );

    const [sourceSelect, relationSelect, targetSelect] = screen.getAllByRole('combobox');
    await user.selectOptions(sourceSelect, '1'); // Alice (person)
    await user.selectOptions(relationSelect, 'LIVES_IN');

    // Only place entities should be available as targets
    const targetWithin = within(targetSelect);
    expect(targetWithin.getByText('UN HQ (place)')).toBeInTheDocument();
    expect(targetWithin.queryByText('NATO (organization)')).not.toBeInTheDocument();
  });

  it('excludes the source entity from target options', async () => {
    const user = userEvent.setup();
    render(
      <LinkEntitiesForm
        entities={ENTITIES}
        connectionRules={CONNECTION_RULES}
        onCreateConnection={vi.fn()}
      />
    );

    const [sourceSelect, relationSelect] = screen.getAllByRole('combobox');
    await user.selectOptions(sourceSelect, '1'); // Alice (person)
    await user.selectOptions(relationSelect, 'KNOWS');

    // Alice should not appear as a target option for herself
    const targetSelect = screen.getAllByRole('combobox')[2];
    const targetOptions = Array.from(targetSelect.options).map((o) => o.value);
    expect(targetOptions).not.toContain('1');
  });

  it('calls onCreateConnection with the correct payload on valid submit', async () => {
    const user = userEvent.setup();
    const onCreateConnection = vi.fn().mockResolvedValue(true);
    render(
      <LinkEntitiesForm
        entities={ENTITIES}
        connectionRules={CONNECTION_RULES}
        onCreateConnection={onCreateConnection}
      />
    );

    const [sourceSelect, relationSelect] = screen.getAllByRole('combobox');
    await user.selectOptions(sourceSelect, '1');       // Alice (person)
    await user.selectOptions(relationSelect, 'MEMBER_OF');
    const targetSelect = screen.getAllByRole('combobox')[2];
    await user.selectOptions(targetSelect, '3');       // NATO (organization)

    await user.click(screen.getByRole('button', { name: /establish link/i }));

    expect(onCreateConnection).toHaveBeenCalledOnce();
    expect(onCreateConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        source_id: '1',
        target_id: '3',
        label: 'MEMBER_OF',
      })
    );
  });
});
