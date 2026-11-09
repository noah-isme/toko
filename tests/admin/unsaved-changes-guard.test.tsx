import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { UnsavedChangesDialog } from '@/components/admin/unsaved-changes-dialog';
import {
  confirmLeaveUnsaved,
  isFormDirty,
  useUnsavedChangesGuard,
} from '@/hooks/use-unsaved-changes-guard';

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
    const formState = { __NA: true, tree: 'form' };
    const listState = { __NA: true, tree: 'list' };
    window.history.pushState(formState, '', '/admin/products/p1/edit?tab=media');
    const formUrl = window.location.href;
    cleanups.push(() => window.history.replaceState(null, '', '/'));
    render(<Harness />);
    await user.type(screen.getByLabelText('Field'), 'x');

    // The browser has already moved to the popped entry when popstate fires.
    const goBack = async () => {
      window.history.replaceState(listState, '', '/admin/products');
      await act(async () => {
        window.dispatchEvent(new PopStateEvent('popstate', { state: listState }));
      });
    };
    const pushState = vi.spyOn(window.history, 'pushState');
    cleanups.push(() => pushState.mockRestore());

    await goBack();
    expect(routerPopState).not.toHaveBeenCalled();
    await screen.findByRole('alertdialog');

    // Staying restores the form's own history entry: its state and its URL.
    await user.click(screen.getByRole('button', { name: 'Lanjut mengedit' }));
    expect(pushState).toHaveBeenCalledTimes(1);
    expect(pushState).toHaveBeenCalledWith(formState, '', formUrl);
    expect(window.location.href).toBe(formUrl);
    expect(window.history.state).toEqual(formState);
    expect(routerPopState).not.toHaveBeenCalled();

    await goBack();
    await user.click(await screen.findByRole('button', { name: 'Buang perubahan' }));
    // Leaving replays the traversal for the router.
    expect(routerPopState).toHaveBeenCalledTimes(1);
    expect(routerPopState.mock.calls[0][0].state).toEqual(listState);
  });

  it('lets hash-only history entries of the form page through', async () => {
    const user = userEvent.setup();
    const routerPopState = vi.fn();
    window.addEventListener('popstate', routerPopState);
    cleanups.push(() => window.removeEventListener('popstate', routerPopState));
    window.history.pushState(null, '', '/admin/settings');
    cleanups.push(() => window.history.replaceState(null, '', '/'));
    render(<Harness />);
    await user.type(screen.getByLabelText('Field'), 'x');

    window.history.replaceState(null, '', '/admin/settings#billing');
    await act(async () => {
      window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
    });
    expect(routerPopState).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('re-arms when the form is still mounted and dirty after a discarded navigation', async () => {
    const user = userEvent.setup();
    // The router ignores this navigation, so the form stays on screen.
    render(<Harness onProgrammatic={() => {}} />);
    await user.type(screen.getByLabelText('Field'), 'x');
    await user.click(screen.getByRole('button', { name: 'programmatic' }));
    await user.click(await screen.findByRole('button', { name: 'Buang perubahan' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    await user.click(screen.getByRole('link', { name: 'Orders' }));
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
  });

  it('does not prompt on unload after Discard until the form is clean again', async () => {
    const user = userEvent.setup();
    // Client navigation is async and may fall back to a full page load.
    render(<Harness onProgrammatic={() => {}} />);
    await user.type(screen.getByLabelText('Field'), 'x');
    await user.click(screen.getByRole('button', { name: 'programmatic' }));
    await user.click(await screen.findByRole('button', { name: 'Buang perubahan' }));

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
    expect(fireBeforeUnload().defaultPrevented).toBe(false);

    // Saving makes the form clean; the next edit arms tab close again.
    await user.click(screen.getByRole('button', { name: 'save' }));
    await user.type(screen.getByLabelText('Field'), 'y');
    expect(fireBeforeUnload().defaultPrevented).toBe(true);
  });

  it('asks every dirty form before navigating from outside', async () => {
    const user = userEvent.setup();
    const signOut = vi.fn();
    render(
      <>
        <div data-testid="first">
          <Harness />
        </div>
        <div data-testid="second">
          <Harness />
        </div>
        <button type="button" onClick={() => confirmLeaveUnsaved(signOut)}>
          sign out
        </button>
      </>,
    );
    // Both harnesses share an input id, so find each input inside its own wrapper.
    const first = within(screen.getByTestId('first')).getByRole('textbox');
    const second = within(screen.getByTestId('second')).getByRole('textbox');
    await user.type(first, 'x');
    await user.type(second, 'y');

    await user.click(screen.getByRole('button', { name: 'sign out' }));
    await user.click(await screen.findByRole('button', { name: 'Buang perubahan' }));
    expect(signOut).not.toHaveBeenCalled();
    // The second form asks too.
    await user.click(await screen.findByRole('button', { name: 'Buang perubahan' }));
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('lets navigation from outside the form ask first via confirmLeaveUnsaved', async () => {
    const user = userEvent.setup();
    const signOut = vi.fn();
    render(
      <>
        <Harness />
        {/* Lives outside the form, like the admin shell's sign-out button. */}
        <button type="button" onClick={() => confirmLeaveUnsaved(signOut)}>
          sign out
        </button>
      </>,
    );
    const clickSignOut = () => user.click(screen.getByRole('button', { name: 'sign out' }));

    await clickSignOut();
    expect(signOut).toHaveBeenCalledTimes(1);

    await user.type(screen.getByLabelText('Field'), 'x');
    await clickSignOut();
    expect(signOut).toHaveBeenCalledTimes(1);
    await user.click(await screen.findByRole('button', { name: 'Lanjut mengedit' }));
    expect(signOut).toHaveBeenCalledTimes(1);

    await clickSignOut();
    await user.click(await screen.findByRole('button', { name: 'Buang perubahan' }));
    expect(signOut).toHaveBeenCalledTimes(2);
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
