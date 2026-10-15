/// <reference types="vite/client" />

// The environment variables our app reads (all VITE_ variables are public: they end up in the JS bundle).
interface ImportMetaEnv {
  // The API's base URL in production, e.g. https://habit-api.azurewebsites.net. Unset in development.
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
