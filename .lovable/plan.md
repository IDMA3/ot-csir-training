# Fix build error + password update

## Build fix
`src/components/ErrorBoundary.tsx` line 54 uses `process.env.NODE_ENV`, which doesn't exist in the browser/Vite type environment and breaks the TypeScript build.

Change it to Vite's built-in equivalent:

```ts
{import.meta.env.DEV && this.state.error && (
```

Same behavior (error details shown only in development), no Node type dependency.

## Password update
The password for `michael.macri@idma3.com` was already set to `#2Pencil` earlier in this session and verified by a successful test sign-in. No further change is needed unless you want it re-applied.
