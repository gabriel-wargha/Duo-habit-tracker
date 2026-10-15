import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

type StatusScreenProps = {
  icon: LucideIcon
  title: string
  children: ReactNode // the explanation
  action?: ReactNode // usually a button
}

// A full-page message with an icon: used for "can't reach the server" and "something went wrong".
export function StatusScreen({ icon: Icon, title, children, action }: StatusScreenProps) {
  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <div role="alert" className="flex max-w-sm flex-col items-center text-center">
        <span className="flex size-12 items-center justify-center rounded-xl bg-background text-muted-foreground ring-1 ring-foreground/10">
          <Icon className="size-6" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-lg font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{children}</p>
        {action && <div className="mt-5">{action}</div>}
      </div>
    </main>
  )
}
