import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Keyboard a11y for modals: Escape-to-close, focus the modal on open,
 * trap Tab focus within it, and restore focus to the trigger on close.
 *
 * Attach the returned ref to the modal's overlay root element, and give
 * that root `tabIndex={-1}` so it can receive focus as a fallback.
 *
 * @param isOpen  whether the modal is currently mounted/visible
 * @param onClose called on Escape (omit to disable Escape-to-close)
 */
export function useModalA11y<T extends HTMLElement = HTMLDivElement>(
  isOpen: boolean,
  onClose?: () => void
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
    const getFocusable = () =>
      Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => el.offsetParent !== null
      );

    (getFocusable()[0] ?? node).focus();

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
      previouslyFocused?.focus?.();
    };
  }, [isOpen]);

  return ref;
}
