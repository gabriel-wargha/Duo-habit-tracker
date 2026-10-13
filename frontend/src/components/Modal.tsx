import { useEffect, useRef, type ReactNode } from 'react'

type ModalProps = {
  title: string
  onClose: () => void
  children: ReactNode
}

// A reusable modal built on the browser's native <dialog> element.
// showModal() gives us for free: the dark backdrop, Esc to close, and keyboard focus kept inside.
// The parent decides when it's shown by rendering it or not: {open && <Modal ... />}.
export function Modal({ title, onClose, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])

  return (
    <dialog
      ref={dialogRef}
      // Esc fires "cancel": let the parent close it, so React state stays the source of truth.
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      // A click directly on the <dialog> (not its content) means the backdrop was clicked.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      aria-labelledby="modal-title"
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl p-0 shadow-xl backdrop:bg-slate-900/40"
    >
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="modal-title" className="text-lg font-semibold text-slate-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </dialog>
  )
}
