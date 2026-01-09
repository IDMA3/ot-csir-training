# Testing Guide

This document outlines testing strategies and practices for the SCL OT CSIR Training Platform.

---

## Testing Strategy

### Testing Pyramid

```
        ┌─────────┐
        │   E2E   │  Few, critical paths
        ├─────────┤
        │ Integr. │  Component + API integration
        ├─────────┤
        │  Unit   │  Many, fast, isolated
        └─────────┘
```

| Level | Focus | Tools |
|-------|-------|-------|
| Unit | Functions, hooks, utilities | Vitest, React Testing Library |
| Integration | Component interactions | React Testing Library, MSW |
| E2E | User flows | Playwright (future) |

---

## Current Testing Setup

### Available Commands

```bash
# Run linting
npm run lint

# Type checking
npx tsc --noEmit

# Build (catches compile errors)
npm run build
```

### Recommended Test Setup

To add testing, install:

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom @testing-library/user-event msw
```

Add to `vite.config.ts`:

```typescript
/// <reference types="vitest" />
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});
```

---

## Unit Testing

### Testing Utility Functions

**Example: Testing CSV export**

```typescript
// src/lib/csv-export.test.ts
import { describe, it, expect } from 'vitest';
import { formatDataForCSV } from './csv-export';

describe('formatDataForCSV', () => {
  it('should format learner data correctly', () => {
    const data = [
      { name: 'John Doe', email: 'john@example.com', progress: 75 }
    ];
    
    const result = formatDataForCSV(data);
    
    expect(result).toContain('name,email,progress');
    expect(result).toContain('John Doe,john@example.com,75');
  });

  it('should handle empty data', () => {
    const result = formatDataForCSV([]);
    expect(result).toBe('');
  });

  it('should escape commas in values', () => {
    const data = [{ name: 'Doe, John', email: 'john@example.com' }];
    const result = formatDataForCSV(data);
    expect(result).toContain('"Doe, John"');
  });
});
```

### Testing Custom Hooks

**Example: Testing useDebounce**

```typescript
// src/hooks/useDebounce.test.ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useDebounce } from './useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('test', 500));
    expect(result.current).toBe('test');
  });

  it('should debounce value changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: 'initial' } }
    );

    rerender({ value: 'updated' });
    expect(result.current).toBe('initial');

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current).toBe('updated');
  });
});
```

---

## Component Testing

### Testing UI Components

**Example: Testing CourseCard**

```typescript
// src/components/CourseCard.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { CourseCard } from './CourseCard';
import { BrowserRouter } from 'react-router-dom';

const mockCourse = {
  id: '1',
  title: 'Test Course',
  description: 'A test course description',
  progress: 50,
  duration_minutes: 60,
};

const renderWithRouter = (component: React.ReactNode) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('CourseCard', () => {
  it('should render course title', () => {
    renderWithRouter(<CourseCard {...mockCourse} />);
    expect(screen.getByText('Test Course')).toBeInTheDocument();
  });

  it('should display progress percentage', () => {
    renderWithRouter(<CourseCard {...mockCourse} />);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('should show duration', () => {
    renderWithRouter(<CourseCard {...mockCourse} />);
    expect(screen.getByText(/60 min/)).toBeInTheDocument();
  });

  it('should handle click navigation', async () => {
    const user = userEvent.setup();
    renderWithRouter(<CourseCard {...mockCourse} />);
    
    const card = screen.getByRole('link');
    expect(card).toHaveAttribute('href', '/courses/1');
  });
});
```

### Testing with Context Providers

```typescript
// src/test/utils.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

export function TestProviders({ children }: { children: React.ReactNode }) {
  const queryClient = createTestQueryClient();
  
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          {children}
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export function renderWithProviders(ui: React.ReactElement) {
  return render(ui, { wrapper: TestProviders });
}
```

---

## Integration Testing

### Mocking Supabase with MSW

```typescript
// src/test/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export const handlers = [
  // Mock courses query
  http.get(`${SUPABASE_URL}/rest/v1/course`, () => {
    return HttpResponse.json([
      {
        id: '1',
        title: 'Test Course',
        description: 'Description',
        active: true,
        duration_minutes: 60,
        version: '1.0',
      },
    ]);
  }),

  // Mock profile query
  http.get(`${SUPABASE_URL}/rest/v1/profiles`, () => {
    return HttpResponse.json([
      {
        id: 'user-1',
        first_name: 'Test',
        last_name: 'User',
        organization: 'Test Org',
      },
    ]);
  }),
];
```

```typescript
// src/test/setup.ts
import { setupServer } from 'msw/node';
import { handlers } from './mocks/handlers';
import '@testing-library/jest-dom';

export const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

---

## Manual Testing Checklists

### Authentication Flow

- [ ] Sign up with new email
- [ ] Sign in with existing account
- [ ] Sign out
- [ ] Password reset flow
- [ ] Invalid credentials handling
- [ ] Session persistence on refresh

### Learner Flow

- [ ] View dashboard
- [ ] Access enrolled course
- [ ] Navigate modules sequentially
- [ ] Complete module content
- [ ] Take and pass quiz
- [ ] Take and fail quiz (retry)
- [ ] Complete final exam
- [ ] View certificate
- [ ] Verify certificate

### Admin Flow

- [ ] Access admin panel
- [ ] View learner reports
- [ ] Filter learners
- [ ] Export CSV
- [ ] Invite single user
- [ ] Bulk import users
- [ ] Resend invitation
- [ ] Cancel invitation
- [ ] View analytics

### Super Admin Flow

- [ ] Create organization
- [ ] Edit organization
- [ ] Assign courses to org
- [ ] Create course
- [ ] Add modules
- [ ] Add questions
- [ ] Grant admin permissions
- [ ] Delete user

---

## Test Data Management

### Creating Test Users

For local development, create users with different roles:

```sql
-- Create test learner
INSERT INTO profiles (id, first_name, last_name, organization)
VALUES ('learner-uuid', 'Test', 'Learner', 'Test Org');

INSERT INTO user_roles (user_id, role)
VALUES ('learner-uuid', 'learner');

-- Create test admin
INSERT INTO profiles (id, first_name, last_name, organization)
VALUES ('admin-uuid', 'Test', 'Admin', 'Test Org');

INSERT INTO user_roles (user_id, role)
VALUES ('admin-uuid', 'admin');

INSERT INTO admin_permissions (user_id, is_super_admin, can_view_users, can_manage_users)
VALUES ('admin-uuid', false, true, true);
```

### Seeding Test Courses

```sql
-- Create test course
INSERT INTO course (id, title, description, duration_minutes, version, active)
VALUES ('course-uuid', 'Test Course', 'A test course', 60, '1.0', true);

-- Create test modules
INSERT INTO modules (id, course_id, title, sequence, type, body_html, estimated_minutes)
VALUES 
  ('mod-1', 'course-uuid', 'Module 1', 1, 'module', '<p>Content</p>', 10),
  ('mod-2', 'course-uuid', 'Final Exam', 2, 'exam', '<p>Exam</p>', 20);
```

---

## Accessibility Testing

### Manual Checks

- [ ] Keyboard navigation works
- [ ] Focus indicators visible
- [ ] Screen reader compatible
- [ ] Color contrast sufficient
- [ ] Text resizable
- [ ] Forms have labels

### Tools

- [axe DevTools](https://www.deque.com/axe/) - Browser extension
- [Lighthouse](https://developers.google.com/web/tools/lighthouse) - Built into Chrome DevTools
- [WAVE](https://wave.webaim.org/) - Web accessibility evaluation

---

## Performance Testing

### Metrics to Monitor

- Time to First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Cumulative Layout Shift (CLS)
- Time to Interactive (TTI)

### Tools

- Chrome DevTools Performance tab
- Lighthouse performance audit
- React DevTools Profiler

---

## CI/CD Integration

### GitHub Actions Example

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run build
      # - run: npm test  # When tests are added
```
