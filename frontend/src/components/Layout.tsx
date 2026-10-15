import { Link, Outlet } from 'react-router'
import { LogOut } from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { initials } from '@/utils/initials'
import { Logo } from './Logo'

// The frame around every logged-in page: a header, then the page itself (<Outlet />).
export function Layout() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-svh bg-muted/40">
      {/* sticky + backdrop-blur: the header stays on top while scrolling, with the page faintly behind it. */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-4 px-4">
          <Link to="/" aria-label="Habit Tracker, home">
            <Logo />
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-9 gap-2 px-1.5" aria-label="Account menu">
                <Avatar size="sm">
                  <AvatarFallback className="bg-primary text-[10px] font-medium text-primary-foreground">
                    {user ? initials(user.displayName) : '?'}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden max-w-40 truncate text-sm sm:inline">{user?.displayName}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="flex flex-col">
                <span className="truncate font-medium text-foreground">{user?.displayName}</span>
                <span className="truncate text-xs font-normal text-muted-foreground">{user?.email}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={logout}>
                <LogOut />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
