# Module & Architecture Design

## Directory Structure

```
src/
├── components/
│   ├── admin/                 # Admin-specific components
│   │   ├── AdminUserManagement.tsx
│   │   ├── LearnerDetailView.tsx
│   │   └── LearnerReportTable.tsx
│   ├── ui/                    # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   └── ... (50+ components)
│   ├── Header.tsx             # Global navigation header
│   ├── MobileModuleDrawer.tsx # Mobile module navigation
│   ├── ModuleContent.tsx      # Lesson/quiz content renderer
│   ├── ModuleSidebar.tsx      # Desktop module navigation
│   ├── NavLink.tsx            # Navigation link component
│   └── ProtectedRoute.tsx     # Auth route guard
├── hooks/
│   ├── useAuth.tsx            # Authentication state & methods
│   ├── useCourse.tsx          # Course data & mutations
│   ├── use-mobile.tsx         # Mobile detection
│   └── use-toast.ts           # Toast notifications
├── integrations/
│   └── supabase/
│       ├── client.ts          # Supabase client (auto-generated)
│       └── types.ts           # Database types (auto-generated)
├── lib/
│   └── utils.ts               # Utility functions (cn, etc.)
├── pages/
│   ├── Admin.tsx              # Admin dashboard
│   ├── Auth.tsx               # Login/signup page
│   ├── Certificate.tsx        # Certificate display
│   ├── Dashboard.tsx          # Main course view
│   ├── Index.tsx              # Landing page
│   ├── NotFound.tsx           # 404 page
│   └── Verify.tsx             # Certificate verification
├── App.tsx                    # Root component & routing
├── App.css                    # Global styles
├── index.css                  # Tailwind & design tokens
└── main.tsx                   # Application entry point
```

---

## Component Architecture

### Core Components

#### `App.tsx`
- Root component
- React Query provider setup
- React Router configuration
- Toast provider

#### `ProtectedRoute.tsx`
- Route guard for authenticated pages
- Redirects unauthenticated users to `/auth`
- Admin role verification for admin routes

#### `Header.tsx`
- Global navigation bar
- User menu with sign-out
- Admin link (conditional)
- Responsive design

---

### Course Components

#### `ModuleSidebar.tsx`
Desktop sidebar showing:
- Module list with lock/unlock status
- Progress indicators
- Current module highlighting
- Completion checkmarks

#### `MobileModuleDrawer.tsx`
Mobile drawer containing:
- Same functionality as sidebar
- Slide-out navigation
- Touch-friendly interface

#### `ModuleContent.tsx`
Main content area displaying:
- Module title and metadata
- HTML body content (sanitized)
- Question/quiz interface
- Navigation buttons
- Submission handling

---

### Admin Components

#### `LearnerReportTable.tsx`
Data table showing:
- Learner names and emails
- Organization
- Progress percentage
- Exam scores
- Certificate status
- Detail view trigger

#### `LearnerDetailView.tsx`
Detailed learner information:
- Profile summary
- Module-by-module progress
- Attempt history with scores
- Certificate details

#### `AdminUserManagement.tsx`
User administration:
- User listing with search
- Role display and management
- Grant/revoke admin actions
- Confirmation dialogs

---

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     React App                           │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   useAuth    │  │  useCourse   │  │ React Query  │  │
│  │   Context    │  │    Hooks     │  │    Cache     │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                 │                 │          │
│         └─────────────────┼─────────────────┘          │
│                           │                            │
│                    ┌──────▼───────┐                    │
│                    │   Supabase   │                    │
│                    │    Client    │                    │
│                    └──────┬───────┘                    │
└───────────────────────────┼─────────────────────────────┘
                            │
                    ┌───────▼───────┐
                    │ Lovable Cloud │
                    │  (Supabase)   │
                    ├───────────────┤
                    │  PostgreSQL   │
                    │  + RLS        │
                    │  + Auth       │
                    └───────────────┘
```

---

## Hook Design

### `useAuth.tsx`

**Purpose:** Centralized authentication state management

**Exports:**
```typescript
interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  isLoading: boolean;
  signUp: (email, password, metadata) => Promise<AuthResponse>;
  signIn: (email, password) => Promise<AuthResponse>;
  signOut: () => Promise<void>;
  resetPassword: (email) => Promise<void>;
}
```

**Key Features:**
- Session persistence
- Auto profile fetching
- Role detection
- Auth state listener

---

### `useCourse.tsx`

**Purpose:** Course data fetching and mutations

**Query Hooks:**
```typescript
useCourse()           // Fetch active course
useModules(courseId)  // Fetch course modules
useQuestions(moduleId)// Fetch module questions
useProgress()         // Fetch user progress
useAttempts(moduleId) // Fetch attempt history
useCertificate()      // Fetch user certificate
```

**Mutation Hooks:**
```typescript
useUpdateProgress()   // Mark module progress
useSubmitAttempt()    // Submit quiz answers
useIssueCertificate() // Generate certificate
```

**Helper Functions:**
```typescript
isModuleUnlocked(module, modules, progress) // Check unlock status
calculateProgressPercentage(modules, progress) // Overall progress
```

---

## State Management

### Server State (React Query)
- Course data
- Module content
- User progress
- Attempt history
- Certificate status

### Client State (React useState/Context)
- Current module selection
- Quiz answer selections
- Form inputs
- UI states (loading, errors)

### Auth State (Context)
- User session
- Profile data
- Admin status

---

## Routing Structure

```typescript
<Routes>
  <Route path="/" element={<Index />} />
  <Route path="/auth" element={<Auth />} />
  <Route path="/verify" element={<Verify />} />
  
  {/* Protected Routes */}
  <Route element={<ProtectedRoute />}>
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/certificate" element={<Certificate />} />
  </Route>
  
  {/* Admin Routes */}
  <Route element={<ProtectedRoute requireAdmin />}>
    <Route path="/admin" element={<Admin />} />
  </Route>
  
  <Route path="*" element={<NotFound />} />
</Routes>
```

---

## Design System

### Color Tokens (index.css)
```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --secondary: 210 40% 96.1%;
  --muted: 210 40% 96.1%;
  --accent: 210 40% 96.1%;
  --destructive: 0 84.2% 60.2%;
  /* ... */
}
```

### Component Variants
Using `class-variance-authority` for consistent variants:
```typescript
const buttonVariants = cva("base-classes", {
  variants: {
    variant: { default, destructive, outline, ... },
    size: { default, sm, lg, icon }
  }
});
```

---

## Security Implementation

### XSS Protection
```typescript
// ModuleContent.tsx
import DOMPurify from 'dompurify';
dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(bodyHtml) }}
```

### Route Protection
```typescript
// ProtectedRoute.tsx
if (!user) return <Navigate to="/auth" />;
if (requireAdmin && !isAdmin) return <Navigate to="/dashboard" />;
```

### RLS Integration
All database queries automatically filtered by RLS policies based on `auth.uid()`.

---

## Performance Optimizations

1. **React Query Caching**: Reduces redundant API calls
2. **Code Splitting**: Lazy loading for routes (available)
3. **Optimistic Updates**: Instant UI feedback
4. **Memoization**: `useMemo` for expensive computations
5. **Conditional Rendering**: Only render visible content

---

## Testing Considerations

### Unit Testing
- Hook logic with React Testing Library
- Component rendering
- Utility functions

### Integration Testing
- Auth flows
- Quiz submission
- Progress tracking

### E2E Testing
- Full user journey
- Admin workflows
- Certificate generation
