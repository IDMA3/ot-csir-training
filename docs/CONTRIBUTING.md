# Contributing Guide

This guide helps developers get started with the SCL OT CSIR Training Platform codebase.

## Prerequisites

- **Node.js** 18.x or higher
- **npm** 9.x or higher (or Bun)
- **Git**
- **Code Editor** (VS Code recommended)

### Recommended VS Code Extensions

- ESLint
- Tailwind CSS IntelliSense
- TypeScript Vue Plugin (Volar)
- Prettier - Code formatter

---

## Getting Started

### 1. Clone the Repository

```bash
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
```

### 2. Install Dependencies

```bash
npm install
# or
bun install
```

### 3. Environment Setup

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
```

### 4. Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:8080`.

---

## Project Structure

```
├── docs/                 # Documentation
├── public/               # Static assets
├── src/
│   ├── components/       # React components
│   │   ├── admin/       # Admin dashboard components
│   │   ├── landing/     # Role-based landing pages
│   │   └── ui/          # shadcn/ui components
│   ├── hooks/           # Custom React hooks
│   ├── integrations/    # Supabase client
│   ├── lib/             # Utility functions
│   └── pages/           # Route page components
├── supabase/
│   ├── functions/       # Edge functions
│   └── config.toml      # Supabase configuration
└── package.json
```

### Key Directories

| Directory | Purpose |
|-----------|---------|
| `src/components/admin/` | Admin dashboard components |
| `src/components/ui/` | shadcn/ui base components |
| `src/hooks/` | Custom hooks for auth, data, etc. |
| `src/pages/` | Top-level route components |
| `supabase/functions/` | Backend Edge Functions |

---

## Coding Standards

### TypeScript

- Use TypeScript for all new files
- Define interfaces for props and data structures
- Avoid `any` type - use `unknown` if needed
- Use strict mode settings

```typescript
// Good
interface CourseCardProps {
  title: string;
  description: string | null;
  progress: number;
}

// Avoid
const handleData = (data: any) => { ... }
```

### React Components

- Use functional components with hooks
- Use named exports for components
- Keep components focused and small
- Extract logic into custom hooks

```typescript
// Good - Named export, clear props
export function CourseCard({ title, description, progress }: CourseCardProps) {
  return (
    // ...
  );
}
```

### Styling

- Use Tailwind CSS classes
- Use semantic tokens from design system
- Never use inline styles
- Keep responsive design in mind

```tsx
// Good - Using semantic tokens
<div className="bg-background text-foreground">

// Avoid - Hardcoded colors
<div className="bg-white text-black">
```

### File Naming

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `CourseCard.tsx` |
| Hooks | camelCase with `use` prefix | `useCourse.tsx` |
| Utils | camelCase | `csv-export.ts` |
| Pages | PascalCase | `Dashboard.tsx` |

---

## Working with Supabase

### Client Usage

```typescript
import { supabase } from '@/integrations/supabase/client';

// Query data
const { data, error } = await supabase
  .from('courses')
  .select('*')
  .eq('active', true);
```

### React Query Integration

```typescript
import { useQuery } from '@tanstack/react-query';

export function useCourses() {
  return useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course')
        .select('*');
      if (error) throw error;
      return data;
    },
  });
}
```

### Edge Functions

Edge Functions are in `supabase/functions/`. Each function:
- Has its own directory
- Contains an `index.ts` file
- Handles CORS preflight requests
- Returns JSON responses

---

## Git Workflow

### Branch Naming

```
feature/add-user-export
bugfix/fix-login-redirect
docs/update-readme
```

### Commit Messages

Follow conventional commits:

```
feat: add user export functionality
fix: resolve login redirect issue
docs: update API documentation
refactor: simplify course query logic
```

### Pull Request Process

1. Create a feature branch from `main`
2. Make your changes
3. Ensure code passes linting: `npm run lint`
4. Test your changes locally
5. Create a pull request with:
   - Clear title describing the change
   - Description of what was changed and why
   - Screenshots for UI changes

---

## Adding New Features

### Adding a New Component

1. Create file in appropriate directory
2. Define TypeScript interface for props
3. Implement component with Tailwind styling
4. Export component (named export)
5. Add to parent component or page

### Adding a New Hook

1. Create file in `src/hooks/`
2. Name with `use` prefix
3. Use React Query for data fetching
4. Return typed data and loading states
5. Document in `docs/HOOKS.md`

### Adding a New Page

1. Create file in `src/pages/`
2. Add route in `App.tsx`
3. Wrap with `ProtectedRoute` if needed
4. Document in architecture docs

### Adding an Edge Function

1. Create directory in `supabase/functions/`
2. Create `index.ts` with handler
3. Add CORS handling
4. Add to `supabase/config.toml`
5. Document in `docs/EDGE_FUNCTIONS.md`

---

## Testing

### Manual Testing Checklist

Before submitting a PR:

- [ ] Feature works as expected
- [ ] No console errors
- [ ] Responsive on mobile
- [ ] Works when logged in and out
- [ ] Edge cases handled

### Test Accounts

For local testing, create test accounts with different roles:
- Learner account
- Org Admin account
- Super Admin account

---

## Common Issues

### "Module not found" Error

```bash
# Clear node_modules and reinstall
rm -rf node_modules
npm install
```

### TypeScript Errors

```bash
# Restart TypeScript server in VS Code
Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"
```

### Supabase Types Out of Sync

The `src/integrations/supabase/types.ts` file is auto-generated. If it seems outdated, the Lovable platform will regenerate it after database migrations.

---

## Resources

- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [TanStack Query Docs](https://tanstack.com/query/latest)
- [Supabase Docs](https://supabase.com/docs)
