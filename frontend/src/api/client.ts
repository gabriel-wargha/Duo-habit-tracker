import type { AuthResponse, LoginRequest, ProblemDetails, RegisterRequest, User } from './types'

// ----- Token storage -----
// We keep the JWT in localStorage so a page refresh doesn't log you out.
// Trade-off: any JavaScript on the page can read it, so an XSS bug could steal it.
// An httpOnly cookie is safer against that, but needs CSRF protection and more server setup.
const TOKEN_KEY = 'habit-tracker.token'

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

// ----- Errors -----
// Every failed request throws an ApiError, so pages can show `error.message`
// and per-field messages without parsing responses themselves.
export class ApiError extends Error {
  readonly status: number
  // Field name (camelCase, matching our form fields) → first error message.
  readonly fieldErrors: Record<string, string>

  constructor(status: number, problem: ProblemDetails | null) {
    super(problem?.title ?? problem?.detail ?? messageForStatus(status))
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = {}
    for (const [field, messages] of Object.entries(problem?.errors ?? {})) {
      // The API names fields in PascalCase ("Email"); our forms use camelCase ("email").
      const key = field.charAt(0).toLowerCase() + field.slice(1)
      if (messages[0]) this.fieldErrors[key] = messages[0]
    }
  }
}

function messageForStatus(status: number): string {
  if (status === 429) return 'Too many attempts. Please wait a minute and try again.'
  if (status >= 500) return 'Something went wrong on our side. Please try again.'
  return `Request failed (${status}).`
}

// ----- 401 handling -----
// The AuthContext registers a callback here, so any 401 on a logged-in request
// (expired or invalid token) logs the user out, no matter which page made the call.
let onUnauthorized: (() => void) | null = null

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler
}

// ----- Where the API lives -----
// Usually unset, so this is "" and requests go to /api on the same origin: Vite's proxy locally,
// and in production the API itself, which also serves this website. Set VITE_API_URL only if the
// frontend is ever hosted somewhere else than the API, e.g. https://habit-api.azurewebsites.net.
// VITE_ variables are baked into the JavaScript at build time (npm run build), so this is public
// information, never a secret.
const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '') // drop a trailing slash

// ----- The one function every request goes through -----
// Exported so feature files (like api/habits.ts) can define their own typed endpoints.
export async function request<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = tokenStorage.get()
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  let response: Response
  try {
    // In development API_BASE is "", so this is the relative URL /api/..., which Vite's proxy forwards.
    response = await fetch(`${API_BASE}/api${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })
  } catch {
    // fetch only throws when there is no response at all (API down, no network).
    throw new ApiError(0, { title: "Can't reach the server. Check your connection and try again." })
  }

  if (!response.ok) {
    // Only a 401 on a request that *sent* a token means "your session is over".
    // A 401 from /login with a wrong password is just a normal error.
    if (response.status === 401 && token) onUnauthorized?.()
    throw new ApiError(response.status, await readProblem(response))
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

async function readProblem(response: Response): Promise<ProblemDetails | null> {
  try {
    return (await response.json()) as ProblemDetails
  } catch {
    return null // empty or non-JSON body
  }
}

// ----- Typed endpoints -----
export const authApi = {
  login: (body: LoginRequest) => request<AuthResponse>('/auth/login', { method: 'POST', body }),
  register: (body: RegisterRequest) => request<AuthResponse>('/auth/register', { method: 'POST', body }),
  me: () => request<User>('/auth/me'),
}
