import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddEntityForm from '../src/app/components/AddEntityForm';

describe('AddEntityForm', () => {
  it('renders the form with all expected fields', () => {
    render(<AddEntityForm onCreateEntity={vi.fn()} />);

    expect(screen.getByText('Add Entity')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/senator jane doe/i)).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create entity/i })).toBeInTheDocument();
  });

  it('defaults the type select to "person"', () => {
    render(<AddEntityForm onCreateEntity={vi.fn()} />);
    expect(screen.getByRole('combobox')).toHaveValue('person');
  });

  it('renders all 4 entity type options', () => {
    render(<AddEntityForm onCreateEntity={vi.fn()} />);
    const select = screen.getByRole('combobox');
    const options = Array.from(select.options).map((o) => o.value);
    expect(options).toEqual(['person', 'event', 'place', 'organization']);
  });

  it('does not call onCreateEntity when name is empty and form is submitted', async () => {
    const onCreateEntity = vi.fn();
    render(<AddEntityForm onCreateEntity={onCreateEntity} />);
    fireEvent.submit(screen.getByRole('button', { name: /create entity/i }).closest('form'));
    expect(onCreateEntity).not.toHaveBeenCalled();
  });

  it('calls onCreateEntity with correct payload on valid submit', async () => {
    const user = userEvent.setup();
    const onCreateEntity = vi.fn().mockResolvedValue(true);
    render(<AddEntityForm onCreateEntity={onCreateEntity} />);

    await user.type(screen.getByPlaceholderText(/senator jane doe/i), 'Alice');
    await user.selectOptions(screen.getByRole('combobox'), 'organization');
    await user.click(screen.getByRole('button', { name: /create entity/i }));

    expect(onCreateEntity).toHaveBeenCalledOnce();
    expect(onCreateEntity).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Alice', type: 'organization' })
    );
  });

  it('resets the form after a successful submission', async () => {
    const user = userEvent.setup();
    const onCreateEntity = vi.fn().mockResolvedValue(true);
    render(<AddEntityForm onCreateEntity={onCreateEntity} />);

    const nameInput = screen.getByPlaceholderText(/senator jane doe/i);
    await user.type(nameInput, 'Alice');
    await user.click(screen.getByRole('button', { name: /create entity/i }));

    expect(nameInput).toHaveValue('');
  });

  it('does not reset the form after a failed submission', async () => {
    const user = userEvent.setup();
    const onCreateEntity = vi.fn().mockResolvedValue(false);
    render(<AddEntityForm onCreateEntity={onCreateEntity} />);

    const nameInput = screen.getByPlaceholderText(/senator jane doe/i);
    await user.type(nameInput, 'Alice');
    await user.click(screen.getByRole('button', { name: /create entity/i }));

    expect(nameInput).toHaveValue('Alice');
  });
});
