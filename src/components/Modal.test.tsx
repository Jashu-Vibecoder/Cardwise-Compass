import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Modal } from './Modal';

describe('Modal accessibility', () => {
  it('uses a unique title id and traps keyboard focus', () => {
    const onClose = vi.fn();
    const view = render(<><button>Opener</button><Modal title="Edit item" onClose={onClose}><button>First action</button><button>Last action</button></Modal><Modal title="Another dialog" onClose={onClose}><span>Another dialog content</span></Modal></>);
    const dialogs = screen.getAllByRole('dialog');
    expect(dialogs[0].getAttribute('aria-labelledby')).not.toBe(dialogs[1].getAttribute('aria-labelledby'));
    view.unmount();
    render(<Modal title="Edit item" onClose={onClose}><button>First action</button><button>Last action</button></Modal>);
    const first = screen.getByRole('button', { name: 'First action' });
    const last = screen.getByRole('button', { name: 'Last action' });
    last.focus();
    fireEvent.keyDown(last, { key: 'Tab' });
    expect(screen.getByRole('button', { name: 'Close dialog' })).toHaveFocus();
    expect(first).not.toHaveFocus();
  });

  it('asks before discarding edits when Escape is pressed', () => {
    const onClose = vi.fn();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<Modal title="Edit item" onClose={onClose}><input aria-label="Name" defaultValue="Initial" /></Modal>);
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Changed' } });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(confirm).toHaveBeenCalledWith('Discard your unsaved changes?');
    expect(onClose).not.toHaveBeenCalled();
    confirm.mockRestore();
  });
});
