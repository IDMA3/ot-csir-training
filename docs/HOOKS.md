# Custom Hooks Reference

This document describes all custom React hooks in the application.

---

## Authentication Hooks

### useAuth

Primary authentication hook providing user state and auth methods.

**Location:** `src/hooks/useAuth.tsx`

**Returns:**
```typescript
interface AuthContextType {
  user: User | null;           // Supabase user object
  session: Session | null;     // Current session
  profile: Profile | null;     // User profile data
  isAdmin: boolean;            // Has admin role
  isLoading: boolean;          // Auth state loading
  signUp: (email, password, metadata) => Promise<AuthResponse>;
  signIn: (email, password) => Promise<AuthResponse>;
  signOut: () => Promise<void>;
  resetPassword: (email) => Promise<void>;
}
```

**Usage:**
```typescript
const { user, profile, isAdmin, signOut } = useAuth();

if (!user) {
  return <LoginPage />;
}
```

---

### useAdminPermissions

Fetches and provides granular admin permissions.

**Location:** `src/hooks/useAdminPermissions.tsx`

**Returns:**
```typescript
{
  permissions: AdminPermissions | null;
  isLoading: boolean;
  isSuperAdmin: boolean;
  canViewUsers: boolean;
  canManageUsers: boolean;
  canViewCourses: boolean;
  canManageCourses: boolean;
  organizationScope: string | null;
  hasAdminAccess: boolean;
  canAccessLearnerReports: boolean;
  canAccessAnalytics: boolean;
  canAccessCourses: boolean;
  canAccessAdminManagement: boolean;
  canDeleteUsers: boolean;
}
```

**Usage:**
```typescript
const { isSuperAdmin, canManageUsers, organizationScope } = useAdminPermissions();

if (!canManageUsers) {
  return <AccessDenied />;
}
```

---

## Course Hooks

### useCourses

Fetches all active courses with module counts and user progress.

**Location:** `src/hooks/useCourse.tsx`

**Returns:** `UseQueryResult<Course[]>`

**Usage:**
```typescript
const { data: courses, isLoading } = useCourses();
```

---

### useCourse

Fetches a single course by ID.

**Location:** `src/hooks/useCourse.tsx`

**Parameters:**
- `courseId?: string` - Course UUID

**Returns:** `UseQueryResult<Course>`

**Usage:**
```typescript
const { data: course } = useCourse(courseId);
```

---

### useModules

Fetches modules for a specific course.

**Location:** `src/hooks/useCourse.tsx`

**Parameters:**
- `courseId: string | undefined`

**Returns:** `UseQueryResult<Module[]>`

**Usage:**
```typescript
const { data: modules } = useModules(courseId);
```

---

### useQuestions

Fetches questions for a specific module.

**Location:** `src/hooks/useCourse.tsx`

**Parameters:**
- `moduleId: string | undefined`

**Returns:** `UseQueryResult<Question[]>`

**Usage:**
```typescript
const { data: questions } = useQuestions(moduleId);
```

---

### useEnrollments

Fetches current user's course enrollments.

**Location:** `src/hooks/useCourse.tsx`

**Returns:** `UseQueryResult<Enrollment[]>`

---

### useEnrollInCourse

Mutation hook to enroll user in a course.

**Location:** `src/hooks/useCourse.tsx`

**Returns:** `UseMutationResult`

**Usage:**
```typescript
const enrollMutation = useEnrollInCourse();
enrollMutation.mutate(courseId);
```

---

## Progress Hooks

### useProgress

Fetches user progress, optionally filtered by course.

**Location:** `src/hooks/useCourse.tsx`

**Parameters:**
- `courseId?: string`

**Returns:** `UseQueryResult<Progress[]>`

---

### useUpdateProgress

Mutation hook to update module completion status.

**Location:** `src/hooks/useCourse.tsx`

**Returns:** `UseMutationResult`

**Usage:**
```typescript
const updateProgress = useUpdateProgress();
updateProgress.mutate({ moduleId, completed: true });
```

---

### useAttempts

Fetches quiz/exam attempts, optionally filtered by module.

**Location:** `src/hooks/useCourse.tsx`

**Parameters:**
- `moduleId?: string`

**Returns:** `UseQueryResult<Attempt[]>`

---

### useSubmitAttempt

Mutation hook to submit quiz/exam attempt.

**Location:** `src/hooks/useCourse.tsx`

**Returns:** `UseMutationResult`

**Usage:**
```typescript
const submitAttempt = useSubmitAttempt();
submitAttempt.mutate({
  moduleId,
  answers: { questionId: 'A' },
  score: 85,
  passed: true
});
```

---

## Certificate Hooks

### useCertificate

Fetches user's certificate for a course.

**Location:** `src/hooks/useCourse.tsx`

**Parameters:**
- `courseId?: string`

**Returns:** `UseQueryResult<Certificate>`

---

### useIssueCertificate

Mutation hook to issue a certificate.

**Location:** `src/hooks/useCourse.tsx`

**Returns:** `UseMutationResult`

**Usage:**
```typescript
const issueCert = useIssueCertificate();
issueCert.mutate({ courseId, courseVersion: '1.0' });
```

---

## Admin Hooks

### useAdminLearnerData

Fetches learner data for admin reporting.

**Location:** `src/hooks/useAdminLearnerData.tsx`

**Returns:**
```typescript
{
  learners: LearnerData[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}
```

---

### useAdminFilters

Manages filter state for learner reports.

**Location:** `src/hooks/useAdminFilters.tsx`

**Parameters:**
- `learners: LearnerData[]`

**Returns:**
```typescript
{
  nameFilter: string;
  setNameFilter: (value: string) => void;
  organizationFilter: string;
  setOrganizationFilter: (value: string) => void;
  courseFilter: string;
  setCourseFilter: (value: string) => void;
  startDate: Date | undefined;
  setStartDate: (date: Date | undefined) => void;
  endDate: Date | undefined;
  setEndDate: (date: Date | undefined) => void;
  organizations: string[];
  filteredLearners: LearnerData[];
  hasActiveFilters: boolean;
  clearFilters: () => void;
}
```

---

### usePlatformStats

Fetches platform-wide statistics for admin dashboard.

**Location:** `src/hooks/usePlatformStats.tsx`

**Returns:**
```typescript
{
  stats: {
    totalUsers: number;
    totalCourses: number;
    totalOrganizations: number;
    totalCertificates: number;
  };
  isLoading: boolean;
}
```

---

## Organization Hooks

### useOrganizationCourses

Fetches courses accessible to user's organization.

**Location:** `src/hooks/useOrganizationCourses.tsx`

**Returns:** `UseQueryResult<OrganizationCourse[]>`

---

### useCanAccessCourse

Checks if user can access a specific course.

**Location:** `src/hooks/useOrganizationCourses.tsx`

**Parameters:**
- `courseId: string`

**Returns:**
```typescript
{
  canAccess: boolean;
  isLoading: boolean;
}
```

---

### useHasOrganization

Checks if user has an organization.

**Location:** `src/hooks/useOrganizationCourses.tsx`

**Returns:**
```typescript
{
  hasOrganization: boolean;
  isLoading: boolean;
}
```

---

## Recertification Hooks

### useRecertification

Manages recertification schedule settings.

**Location:** `src/hooks/useRecertification.tsx`

**Returns:**
```typescript
{
  schedules: RecertificationSchedule[];
  isLoading: boolean;
  updateSchedule: (data) => Promise<void>;
}
```

---

## Utility Hooks

### useDebounce

Debounces a value for optimized input handling.

**Location:** `src/hooks/useDebounce.tsx`

**Parameters:**
- `value: T` - Value to debounce
- `delay: number` - Delay in milliseconds

**Returns:** `T` - Debounced value

**Usage:**
```typescript
const [search, setSearch] = useState('');
const debouncedSearch = useDebounce(search, 300);

// Use debouncedSearch in queries
```

---

### useMobile

Detects mobile viewport.

**Location:** `src/hooks/use-mobile.tsx`

**Returns:** `boolean` - True if mobile viewport

**Usage:**
```typescript
const isMobile = useMobile();

return isMobile ? <MobileNav /> : <DesktopNav />;
```

---

### useToast

Toast notification system.

**Location:** `src/hooks/use-toast.ts`

**Returns:**
```typescript
{
  toast: (options: ToastOptions) => void;
  toasts: Toast[];
  dismiss: (id: string) => void;
}
```

**Usage:**
```typescript
const { toast } = useToast();

toast({
  title: 'Success',
  description: 'Operation completed',
});
```

---

## Helper Functions

### isModuleUnlocked

Checks if a module is unlocked based on progress.

**Location:** `src/hooks/useCourse.tsx`

**Parameters:**
- `module: Module`
- `modules: Module[]`
- `progress: Progress[]`

**Returns:** `boolean`

---

### calculateProgressPercentage

Calculates course completion percentage.

**Location:** `src/hooks/useCourse.tsx`

**Parameters:**
- `modules: Module[]`
- `progress: Progress[]`

**Returns:** `number` (0-100)
