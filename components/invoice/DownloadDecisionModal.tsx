'use client'

import { useModalA11y } from '@/lib/use-modal-a11y'
import { useScrollLock } from '@/lib/use-scroll-lock'

export interface DownloadDecisionModalProps {
  isOpen: boolean
  invoiceNumber: string
  milestoneCount: number
  onChooseShareAndDownload: () => void
  onChooseDownloadOffline: () => void
  onCancel: () => void
}

export function DownloadDecisionModal(props: DownloadDecisionModalProps) {
  const {
    isOpen,
    invoiceNumber,
    milestoneCount,
    onChooseShareAndDownload,
    onChooseDownloadOffline,
    onCancel,
  } = props

  const overlayRef = useModalA11y<HTMLDivElement>(isOpen, onCancel)
  useScrollLock(isOpen)

  if (!isOpen) return null

  const hasMultipleMilestones = milestoneCount >= 2

  return (
    <div
      ref={overlayRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="download-decision-title"
      className="fixed inset-0 z-[120] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(33,28,22,0.55)' }}
      onClick={onCancel}
    >
      <div
        className="relative w-full max-w-xl overflow-hidden rounded-[var(--radius-soft)] border border-soft bg-paper-2 shadow-[var(--brutal-shadow-lg)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-soft bg-acc-soft px-6 py-5">
          <div className="type-label font-bold uppercase tracking-wider text-[color:var(--color-ink-3)]">
            Invoice {invoiceNumber}
          </div>
          <h2
            id="download-decision-title"
            className="mt-1 font-syne type-heading font-bold tracking-tight text-[color:var(--color-ink)]"
          >
            Downloading this invoice?
          </h2>
        </div>

        <div className="space-y-4 px-6 py-5">
          <p className="type-body leading-relaxed text-[color:var(--color-ink-2)]">
            Lance can only track invoices shared digitally. Once downloaded, you&apos;ll handle
            this one yourself — including MSA acceptance, payment confirmation, and milestone
            progression.
          </p>

          {hasMultipleMilestones && (
            <div className="rounded-[var(--radius-field)] border border-[#ecd9b0] bg-[#f6ecd6] px-4 py-3">
              <div className="mb-1 type-label font-bold uppercase tracking-wider text-[color:var(--color-ochre-deep)]">
                Milestone warning
              </div>
              <p className="type-body leading-snug text-[color:var(--color-ink-2)]">
                {`This invoice has ${milestoneCount} milestones. Downloading disables `}
                auto-progression — you&apos;ll need to mark each one settled manually.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-3 px-6 pb-6">
          <button
            type="button"
            onClick={onChooseShareAndDownload}
            className="w-full rounded-[var(--radius-box)] border border-acid bg-acid px-5 py-4 text-left text-[color:var(--color-acc-ink)] shadow-[var(--brutal-shadow-md)] transition-colors hover:bg-acid-2"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-syne type-body font-bold">
                Share digitally + download PDF
              </span>
              <span className="type-label font-bold uppercase tracking-wider opacity-70">
                Recommended
              </span>
            </div>
            <div className="mt-1 type-label font-medium opacity-80">
              Keep tracking, MSA enforcement, and milestone automation. PDF still downloads.
            </div>
          </button>

          <button
            type="button"
            onClick={onChooseDownloadOffline}
            className="w-full rounded-[var(--radius-box)] border border-soft bg-paper-2 px-5 py-4 text-left text-[color:var(--color-ink)] transition-colors hover:bg-[color:var(--color-paper)]"
          >
            <div className="font-syne type-body font-bold">
              Download &amp; manage offline
            </div>
            <div className="mt-1 type-label text-[color:var(--color-ink-3)]">
              Tracking disabled. Hidden from master list and dashboard metrics.
            </div>
          </button>

          <div className="pt-1 text-center">
            <button
              type="button"
              onClick={onCancel}
              className="type-body font-semibold text-[color:var(--color-ink-3)] underline-offset-4 hover:underline"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DownloadDecisionModal
