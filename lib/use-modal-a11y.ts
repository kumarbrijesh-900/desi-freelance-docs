import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE_SELECTOR =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Keyboard a11y for modals: Escape-to-close, focus the modal on open,
 * trap Tab focus within it, and restore focus to the trigger on close.
 *
 * Attach the returned ref to the modal's overlay root element, and give
 * that root `tabIndex={-1}` so it can receive focus as a fallback.
 *
 * On open, focus goes to the element marked `data-modal-initial-focus` if the
 * modal has one, otherwise to its first focusable element. Mark one wherever
 * the first control is destructive, fires something, or closes the dialog - a
 * confirm's Cancel, a form's first field - so a reflexive Enter is harmless.
 *
 * @param isOpen  whether the modal is currently mounted/visible
 * @param onClose called on Escape (omit to disable Escape-to-close)
 * @param restoreFocusTo where to send focus when the trigger no longer exists
 *        on close - the case for a confirm whose action deletes the very row
 *        the trigger lived in. Nominate something that outlives the action,
 *        such as the section heading, and give it `tabIndex={-1}`.
 */
export function useModalA11y<T extends HTMLElement = HTMLDivElement>(
  isOpen: boolean,
  onClose?: () => void,
  restoreFocusTo?: RefObject<HTMLElement | null>
) {
  const ref = useRef<T>(null);
  // Held in a ref so an inline onClose - the normal case at a call site - does
  // not retrigger the effect on every parent render, which would re-run the
  // focus-on-open step and pull focus back while someone is typing.
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const node = ref.current;
    if (!node) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    // Read on open rather than in the cleanup: the nominated fallback is an
    // element that outlives the action, so the node is the same either way,
    // and reading a ref during cleanup is what react-hooks warns about.
    const fallbackTarget = restoreFocusTo?.current ?? null;
    const getFocusable = () =>
      Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => el.offsetParent !== null
      );

    // A nominated target, when the modal marks one; the first focusable
    // otherwise, which is the old behaviour and still right for most dialogs.
    // Carried on the element rather than in the signature so the consumers
    // that are already correct need no change at all.
    const nominated = node.querySelector<HTMLElement>(
      "[data-modal-initial-focus]"
    );
    const initial =
      nominated && nominated.offsetParent !== null ? nominated : null;

    (initial ?? getFocusable()[0] ?? node).focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onCloseRef.current) {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key === "Tab") {
        const items = getFocusable();
        if (items.length === 0) {
          e.preventDefault();
          return;
        }
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      // A confirm whose action removes its own trigger leaves previouslyFocused
      // detached. .focus() on a node that is no longer in the document is a
      // no-op, so activeElement falls back to <body> and a keyboard user is
      // dumped at the top of the page. Only restore a trigger that survived.
      if (previouslyFocused?.isConnected) {
        previouslyFocused.focus();
      } else {
        fallbackTarget?.focus?.();
      }
    };
  }, [isOpen, restoreFocusTo]);

  return ref;
}
