import { Link, Navigate } from 'react-router'
import { ArrowRight, CalendarCheck, Check, Flame, Users } from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import { HabitIcon } from '../components/HabitIcon'
import { Logo } from '../components/Logo'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

const FEATURES = [
  {
    icon: CalendarCheck,
    title: 'One tap a day',
    text: 'Pick the days that matter, then check in with a single tap.',
  },
  {
    icon: Flame,
    title: 'Streaks that are fair',
    text: "Rest days don't break your streak, and today isn't missed until it's over.",
  },
  {
    icon: Users,
    title: 'Better together',
    text: "Invite a friend with a link. See each other's progress and build a joint streak.",
  },
]

// /welcome – what a logged-out visitor sees first.
export function LandingPage() {
  const { status } = useAuth()

  if (status === 'authenticated') return <Navigate to="/" replace />

  return (
    <div className="min-h-svh bg-background">
      <header className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4">
        <Logo />
        <div className="flex items-center gap-1">
          <Button variant="ghost" asChild>
            <Link to="/login">Log in</Link>
          </Button>
          <Button asChild>
            <Link to="/register">Sign up</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-20">
        <section className="grid items-center gap-12 pt-12 md:grid-cols-2 md:pt-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
              Free · built for two
            </p>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              Build habits together.
            </h1>
            <p className="mt-4 max-w-md text-lg text-pretty text-muted-foreground">
              Track your daily habits, keep your streaks alive, and share them with a friend, so you keep each other going.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" className="h-11 px-5" asChild>
                <Link to="/register">
                  Get started
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-11 px-5" asChild>
                <Link to="/login">I already have an account</Link>
              </Button>
            </div>
          </div>

          {/* A static preview of the app, built from the real components' look. aria-hidden:
              it's decoration, the text on the left already says what the app does. */}
          <div aria-hidden="true" className="relative isolate">
            <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-linear-to-br from-orange-100 via-sky-50 to-violet-100 blur-2xl" />
            <div className="flex flex-col gap-3">
              <PreviewCard icon="footprints" color="#ea580c" name="Morning run" schedule="Mon, Wed, Fri" streak={6} done partner />
              <PreviewCard icon="book-open" color="#2563eb" name="Read 20 pages" schedule="Every day" streak={13} done />
              <PreviewCard icon="droplet" color="#0d9488" name="Drink 2 L of water" schedule="Every day" streak={7} partner />
            </div>
          </div>
        </section>

        <section aria-labelledby="features" className="mt-24">
          <h2 id="features" className="sr-only">
            Features
          </h2>
          <ul className="grid gap-6 sm:grid-cols-3">
            {FEATURES.map((feature) => (
              <li key={feature.title}>
                <span className="flex size-10 items-center justify-center rounded-xl bg-muted">
                  <feature.icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 font-semibold">{feature.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{feature.text}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  )
}

type PreviewCardProps = {
  icon: string
  color: string
  name: string
  schedule: string
  streak: number
  done?: boolean
  partner?: boolean
}

function PreviewCard({ icon, color, name, schedule, streak, done = false, partner = false }: PreviewCardProps) {
  return (
    <Card size="sm" className="flex-row items-center gap-3 px-4 shadow-sm">
      <HabitIcon icon={icon} color={color} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{name}</p>
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          {schedule}
          <span className="flex items-center gap-0.5 font-semibold text-orange-600">
            <Flame className="size-3" />
            {streak}
          </span>
          {partner && (
            <span className="flex items-center gap-0.5">
              <Users className="size-3" /> with Sam
            </span>
          )}
        </p>
      </div>
      <span
        style={done ? { backgroundColor: color, borderColor: color } : { borderColor: `${color}66` }}
        className={`flex size-9 items-center justify-center rounded-full border-2 ${done ? 'text-white' : 'text-muted-foreground/40'}`}
      >
        <Check className="size-4" strokeWidth={3} />
      </span>
    </Card>
  )
}
