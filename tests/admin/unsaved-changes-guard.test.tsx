import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { UnsavedChangesDialog } from '@/components/admin/unsaved-changes-dialog';
import { isFormDirty, useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes-guard';

function Harness({ onProgrammatic }: { onProgrammatic?: () => void }) {
  const [value, setValue] = useState('');
  const [baseline, setBaseline] = useState('');
  const guard = useUnsavedChangesGuard(isFormDirty(value, baseline));
  return (
    <div>
      <label htmlFor="field">Field</label>
      <input id="field" value={value} onChange={(event) => setValue(event.target.value)} />
      <button type="button" onClick={() => setBaseline(value)}>
        save
      </button>
      <button type="button" onClick={() => guard.confirmNavigation(() => onProgrammatic?.())}>
        programmatic
      </button>
      <a href="/admin/orders">Orders</a>
      <a href="/admin/orders" target="_blank">
        Orders new tab
      </a>
      <a href="https://example.com/docs">External</a>
      <a href="#section">Hash</a>
      <UnsavedChangesDialog guard={guard} />
    </div>
  );
}

function fireBeforeUnload() {
  const event = new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent;
  window.dispatchEvent(event);
  return event;
}

/** Stands in for Next.js' <Link> / app-router handlers, which run after capture listeners. */
function trackNavigation() {
  const linkHandler = vi.fn();
  const listener = (event: MouseEvent) => {
    if (!(event.target instanceof Element) || !event.target.closest('a')) return;
    event.preventDefault();
    linkHandler(event);
  };
  document.addEventListener('click', listener);
  return { linkHandler, stop: () => document.removeEventListener('click', listener) };
}

describe('useUnsavedChangesGuard', () => {
  const cleanups: Array<() => void> = [];
  afterEach(() => {
    while (cleanups.length) cleanups.pop()?.();
  });

  it('compares form values structurally, ignoring key order', () => {
    expect(isFormDirty({ a: 1, b: [1, { c: 'x' }] }, { b: [1, { c: 'x' }], a: 1 })).toBe(false);
    expect(isFormDirty({ a: 1, b: [1] }, { a: 1, b: [1, 2] })).toBe(true);
    expect(isFormDirty({ a: '' }, { a: 0 })).toBe(true);
  });

  it('only blocks tab close while the form is dirty', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    expect(fireBeforeUnload().defaultPrevented).toBe(false);

    await user.type(screen.getByLabelText('Field'), 'x');
    expect(fireBeforeUnload().defaultPrevented).toBe(true);

    await user.click(screen.getByRole('button', { name: 'save' }));
    expect(fireBeforeUnload().defaultPrevented).toBe(false);
  });

  it('holds back internal link clicks and asks for confirmation', async () => {
    const user = userEvent.setup();
    const { linkHandler, stop } = trackNavigation();
    cleanups.push(stop);
    render(<Harness />);

    await user.type(screen.getByLabelText('Field'), 'x');
    await user.click(screen.getByRole('link', { name: 'Orders' }));

    expect(linkHandler).not.toHaveBeenCalled();
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent('Buang perubahan yang belum disimpan?');
    // The safe choice receives focus.
    expect(screen.getByRole('button', { name: 'Lanjut mengedit' })).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Lanjut mengedit' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(linkHandler).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Field')).toHaveValue('x');

    await user.click(screen.getByRole('link', { name: 'Orders' }));
    await user.click(await screen.findByRole('button', { name: 'Buang perubahan' }));
    // Leaving re-clicks the link so the router performs the navigation.
    expect(linkHandler).toHaveBeenCalledTimes(1);
  });

  it('closes the dialog with Escape and keeps the edits', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(screen.getByLabelText('Field'), 'x');
    await user.click(screen.getByRole('link', { name: 'Orders' }));
    await screen.findByRole('alertdialog');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Field')).toHaveValue('x');
  });

  it('ignores clean forms, new-tab, modifier, external and hash links', async () => {
    const user = userEvent.setup();
    const { linkHandler, stop } = trackNavigation();
    cleanups.push(stop);
    render(<Harness />);

    await user.click(screen.getByRole('link', { name: 'Orders' }));
    expect(linkHandler).toHaveBeenCalledTimes(1);

    await user.type(screen.getByLabelText('Field'), 'x');
    await user.click(screen.getByRole('link', { name: 'Orders new tab' }));
    fireEvent.click(screen.getByRole('link', { name: 'Orders' }), { ctrlKey: true });
    await user.click(screen.getByRole('link', { name: 'External' }));
    await user.click(screen.getByRole('link', { name: 'Hash' }));
    expect(linkHandler).toHaveBeenCalledTimes(5);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('holds back browser back/forward until the user decides', async () => {
    const user = userEvent.setup();
    const routerPopState = vi.fn();
    // Registered first, like the app router's listener.
    window.addEventListener('popstate', routerPopState);
    cleanups.push(() => window.removeEventListener('popstate', routerPopState));
    const pushState = vi.spyOn(window.history, 'pushState');
    cleanups.push(() => pushState.mockRestore());
    render(<Harness />);

    await user.type(screen.getByLabelText('Field'), 'x');
    await act(async () => {
      window.dispatchEvent(new PopStateEvent('popstate', { state: { __NA: true } }));
    });
    expect(routerPopState).not.toHaveBeenCalled();
    await screen.findByRole('alertdialog');

    // Staying restores the form's history entry.
    await user.click(screen.getByRole('button', { name: 'Lanjut mengedit' }));
    expect(pushState).toHaveBeenCalledTimes(1);
    expect(routerPopState).not.toHaveBeenCalled();

    await act(async () => {
      window.dispatchEvent(new PopStateEvent('popstate', { state: { __NA: true } }));
    });
    await user.click(await screen.findByRole('button', { name: 'Buang perubahan' }));
    // Leaving replays the traversal for the router.
    expect(routerPopState).toHaveBeenCalledTimes(1);
    expect(routerPopState.mock.calls[0][0].state).toEqual({ __NA: true });
  });

  it('confirms programmatic navigation only when dirty', async () => {
    const user = userEvent.setup();
    const navigate = vi.fn();
    render(<Harness onProgrammatic={navigate} />);

    await user.click(screen.getByRole('button', { name: 'programmatic' }));
    expect(navigate).toHaveBeenCalledTimes(1);

    await user.type(screen.getByLabelText('Field'), 'x');
    await user.click(screen.getByRole('button', { name: 'programmatic' }));
    expect(navigate).toHaveBeenCalledTimes(1);
    await user.click(await screen.findByRole('button', { name: 'Buang perubahan' }));
    expect(navigate).toHaveBeenCalledTimes(2);
  });

  it('stays quiet after a successful save and re-arms on the next edit', async () => {
    const user = userEvent.setup();
    const { linkHandler, stop } = trackNavigation();
    cleanups.push(stop);
    render(<Harness />);
    await user.type(screen.getByLabelText('Field'), 'x');
    await user.click(screen.getByRole('button', { name: 'save' }));
    await user.click(screen.getByRole('link', { name: 'Orders' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(linkHandler).toHaveBeenCalledTimes(1);

    await user.type(screen.getByLabelText('Field'), 'y');
    await user.click(screen.getByRole('link', { name: 'Orders' }));
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
  });
});
