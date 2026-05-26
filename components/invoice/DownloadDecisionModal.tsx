'use client'

import { useEffect } from 'react'

export interface DownloadDecisionModalProps {
  isOpen: boolean
  invoiceNumber: string
  milestoneCount: number
  onChooseShareAndDownload: () => void
  onChooseDownloadOffline: () => void
  onCancel: () => void
}

const INK = '#111118'
const LIME = '#BEFF00'
const CREAM = '#FFFBE6'
const CORAL = '#FF5C00'

export function DownloadDecisionModal(props: DownloadDecisionModalProps) {
  const {
    isOpen,
    invoiceNumber,
    milestoneCount,
    onChooseShareAndDownload,
    onChooseDownloadOffline,
    onCancel,
  } = props

  useEffect(() => {
    if (!isOpen) return
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  const hasMultipleMilestones = milestoneCount >= 2

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="download-decision-title"
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
      onClick={onCancel}
    >
      <div
        className="relative w-full max-w-xl bg-white"
        style={{ border: `4px solid ${INK}`, boxShadow: `8px 8px 0 ${INK}` }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className="border-b-4 px-6 py-5"
          style={{ borderColor: INK, backgroundColor: CREAM }}
        >
          <div
            className="text-[11px] font-black uppercase tracking-wider"
            style={{ color: INK, opacity: 0.6 }}
          >
            Invoice {invoiceNumber}
          </div>
          <h2
            id="download-decision-title"
            className="mt-1 text-2xl font-black uppercase tracking-tight"
            style={{ color: INK }}
          >
            Downloading this invoice?
          </h2>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-sm leading-relaxed" style={{ color: INK }}>
            Lance can only track invoices shared digitally. Once downloaded, you&apos;ll handle
            this one yourself — including MSA acceptance, payment confirmation, and milestone
            progression.
          </p>

          {hasMultipleMilestones && (
            <div
              className="px-4 py-3"
              style={{ border: `2px solid ${INK}`, backgroundColor: CREAM }}
            >
              <div
                className="text-[11px] font-black uppercase tracking-wider mb-1"
                style={{ color: CORAL }}
              >
                Milestone warning
              </div>
              <p className="text-sm leading-snug" style={{ color: INK }}>
                {`This invoice has ${milestoneCount} milestones. Downloading disables `}
                auto-progression — you&apos;ll need to mark each one settled manually.
              </p>
            </div>
          )}
        </div>

        <div className="px-6 pb-6 space-y-3">
          <button
            type="button"
            onClick={onChooseShareAndDownload}
            className="w-full px-5 py-4 text-left transition-transform active:translate-x-[2px] active:translate-y-[2px] hover:-translate-x-[1px] hover:-translate-y-[1px]"
            style={{
              backgroundColor: LIME,
              color: INK,
              border: `2px solid ${INK}`,
              boxShadow: `4px 4px 0 ${INK}`,
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-black uppercase tracking-wider">
                Share Digitally + Download PDF
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider opacity-70">
                Recommended
              </span>
            </div>
            <div className="mt-1 text-[11px] font-bold opacity-80">
              Keep tracking, MSA enforcement, and milestone automation. PDF still downloads.
            </div>
          </button>

          <button
            type="button"
            onClick={onChooseDownloadOffline}
            className="w-full px-5 py-4 text-left transition-transform active:translate-x-[2px] active:translate-y-[2px] hover:-translate-x-[1px] hover:-translate-y-[1px]"
            style={{
              backgroundColor: '#ffffff',
              color: INK,
              border: `2px solid ${INK}`,
              boxShadow: `4px 4px 0 ${INK}`,
            }}
          >
            <div className="text-sm font-black uppercase tracking-wider">
              Download &amp; Manage Offline
            </div>
            <div className="mt-1 text-[11px] font-bold opacity-70">
              Tracking disabled. Hidden from master list and dashboard metrics.
            </div>
          </button>

          <div className="pt-1 text-center">
            <button
              type="button"
              onClick={onCancel}
              className="text-[12px] font-black uppercase tracking-wider underline-offset-4 hover:underline"
              style={{ color: INK, opacity: 0.6 }}
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
