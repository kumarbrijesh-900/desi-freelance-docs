import { useEffect } from "react";

/**
 * Locks page scrolling while a modal is open.
 *
 * Deliberately separate from `useModalA11y`: keyboard behaviour is per-dialog,
 * but scrolling is a property of the page, so the two have different scopes and
 * different lifetimes. Call both at a modal that needs both.
 *
 * The lock is COUNTED, not flagged. Two modals can be open at once - a signed
 * out user taking "share then download" on the preview page gets ShareLinkModal
 * and ConversionModal together, because `handleConfirmShareThenDownload` opens
 * the share modal unconditionally while the un-awaited download path bounces a
 * guest into the conversion modal. A boolean would release the page when the
 * first of the two closed, with the second still covering it.
 *
 * @param isLocked whether this caller currently wants the page held still
 */

let lockCount = 0;
let restore: { overflow: string; paddingRight: string } | null = null;

export function useScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked) return;

    const body = document.body;

    if (lockCount === 0) {
      // Hiding the scrollbar gives its width back to the content, which shifts
      // the whole page sideways. Measure the gap while it is still there and
      // hold the layout still with matching padding. Zero on overlay-scrollbar
      // platforms and on pages that do not scroll, where this is a no-op.
      const gap = window.innerWidth - document.documentElement.clientWidth;

      // Whatever was on the element, not an assumed empty string - the next
      // release has to put back what it actually found.
      restore = {
        overflow: body.style.overflow,
        paddingRight: body.style.paddingRight,
      };

      body.style.overflow = "hidden";
      if (gap > 0) {
        const existing =
          parseFloat(window.getComputedStyle(body).paddingRight) || 0;
        body.style.paddingRight = `${existing + gap}px`;
      }
    }

    lockCount += 1;

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0 && restore) {
        body.style.overflow = restore.overflow;
        body.style.paddingRight = restore.paddingRight;
        restore = null;
      }
    };
  }, [isLocked]);
}
