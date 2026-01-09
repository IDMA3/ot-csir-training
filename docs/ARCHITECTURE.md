# Module & Architecture Design

## Directory Structure

```
src/
├── components/
│   ├── admin/                 # Admin-specific components
│   │   ├── AdminDashboardOverview.tsx
│   │   ├── AdminPermissionManager.tsx
│   │   ├── AdminUserManagement.tsx
│   │   ├── AnalyticsDashboard.tsx
│   │   ├── BulkActionsBar.tsx
│   │   ├── BulkUserImport.tsx
│   │   ├── CourseAssignment.tsx
│   │   ├── CourseManagement.tsx
│   │   ├── LearnerDetailView.tsx
│   │   ├── LearnerReportTable.tsx
│   │   ├── ModuleEditor.tsx
│   │   ├── OnboardingCenter.tsx
│   │   ├── OrgCourseAccessManager.tsx
│   │   ├── OrganizationManagement.tsx
│   │   ├── OrganizationReports.tsx
│   │   ├── PeopleManagement.tsx
│   │   ├── QuestionEditor.tsx
│   │   ├── RecertificationSettings.tsx
│   │   ├── RichTextEditor.tsx
│   │   ├── SingleUserInvite.tsx
│   │   ├── UserInvitations.tsx
│   │   └── UserOrganizationManager.tsx
│   ├── landing/               # Role-based landing pages
│   │   ├── OrgAdminLanding.tsx
│   │   ├── SuperAdminLanding.tsx
│   │   └── UserLanding.tsx
│   ├── ui/                    # shadcn/ui components (50+)
│   ├── CourseCard.tsx
│   ├── EmptyState.tsx
│   ├── ErrorBoundary.tsx
│   ├── Header.tsx
│   ├── LoadingSkeleton.tsx
│   ├── MobileModuleDrawer.tsx
│   ├── ModuleContent.tsx
│   ├── ModuleSidebar.tsx
│   ├── NavLink.tsx
│   ├── PasswordStrengthIndicator.tsx
│   ├── ProtectedRoute.tsx
│   └── SkipLink.tsx
├── hooks/
│   ├── useAdminFilters.tsx
│   ├── useAdminLearnerData.tsx
│   ├── useAdminPermissions.tsx
│   ├── useAuth.tsx
│   ├── useCourse.tsx
│   ├── useDebounce.tsx
│   ├── use-mobile.tsx
│   ├── useOrganizationCourses.tsx
│   ├── usePlatformStats.tsx
│   ├── useRecertification.tsx
│   └── use-toast.ts
├── integrations/supabase/
│   ├── client.ts              # Supabase client (auto-generated)
│   └── types.ts               # Database types (auto-generated)
├── lib/
│   ├── csv-export.ts
│   └── utils.ts
├── pages/
│   ├── Admin.tsx
│   ├── Auth.tsx
│   ├── Certificate.tsx
│   ├── CoursePreview.tsx
│   ├── Courses.tsx
│   ├── Dashboard.tsx
│   ├── Index.tsx
│   ├── NotFound.tsx
│   └── Verify.tsx
├── App.tsx
├── App.css
├── index.css
└── main.tsx

supabase/
├── functions/
│   ├── accept-invitation/     # Process invitation acceptance
│   ├── delete-user/           # Cascade user deletion
│   └── send-invitation/       # Email invitations via Resend
└── config.toml
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

#### `CourseAssignment.tsx`
Course assignment to users:
- View all users with search/filter
- Select multiple users for bulk assignment
- Assign courses to selected users
- View and manage existing enrollments
- Remove users from courses

#### `CourseManagement.tsx`
Course administration:
- Create, edit, delete courses
- Manage course metadata (title, description, duration, version)
- Activate/deactivate courses
- Module management integration

#### `ModuleEditor.tsx`
Module administration:
- Create, edit, delete modules
- Rich text content editing
- Module type selection (lesson/exam)
- Sequence ordering with drag-and-drop
- Question editor integration

#### `QuestionEditor.tsx`
Question administration:
- Create, edit, delete questions
- Multiple choice options (A-F)
- Correct answer selection
- Rationale/explanation field
- Drag-and-drop reordering
- Bulk selection and deletion
- Import from JSON/CSV files
- Export to JSON/CSV files
- Template downloads for import format

#### `RichTextEditor.tsx`
Content editing:
- Tiptap-based rich text editor
- Text formatting (bold, italic, underline, headings)
- Lists (ordered, unordered)
- Link insertion
- Image upload and embedding
- Drag-and-drop image support

#### `LearnerReportTable.tsx`
Data table showing:
- Learner names and emails
- Organization
- Progress percentage (course-filtered when applicable)
- Exam scores
- Certificate status
- Detail view trigger
- Supports filtering by course

#### `LearnerDetailView.tsx`
Detailed learner information:
- Profile summary (email, organization, job role, registration date)
- Enrolled courses list with accordion
- Course-grouped module progress with status indicators
- Exam attempts per course with scores
- Certificate details per course

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
