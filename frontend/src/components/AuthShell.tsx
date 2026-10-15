import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Logo } from './Logo'

type AuthShellProps = {
  title: string
  description: string
  children: ReactNode
  footer?: ReactNode
}

// The frame for logged-out pages (login, sign up, invite): the logo, then one centered card.
export function AuthShell({ title, description, children, footer }: AuthShellProps) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/40 p-4">
      <Link to="/welcome" aria-label="Habit Tracker, home">
        <Logo />
      </Link>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
      {footer && <p className="text-sm text-muted-foreground">{footer}</p>}
    </main>
  )
}
