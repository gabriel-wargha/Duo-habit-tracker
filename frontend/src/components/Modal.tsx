import type { ReactNode } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type ModalProps = {
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
}

// Our modal, now on top of shadcn's Dialog (Radix). Radix handles what we used to get from
// <dialog>: Esc to close, focus kept inside, the backdrop, plus open/close animations.
// The parent still decides when it's shown by rendering it or not: {open && <Modal ... />}.
export function Modal({ title, description, onClose, children }: ModalProps) {
  return (
    // Always open while rendered; any attempt to close (Esc, backdrop, ✕) calls onClose.
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {/* Radix warns when a dialog has no description, so screen readers get an empty one. */}
          <DialogDescription className={description ? undefined : 'sr-only'}>{description ?? title}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}
