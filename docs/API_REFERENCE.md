# API Reference

## Overview

This document provides a reference for all database operations and API patterns used in the SCL OT CSIR Training application.

---

## Authentication API

### Sign Up
```typescript
const { data, error } = await supabase.auth.signUp({
  email: string,
  password: string,
  options: {
    data: {
      first_name: string,
      last_name: string,
      organization?: string,
      job_role?: string
    }
  }
});
```

### Sign In
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: string,
  password: string
});
```

### Sign Out
```typescript
const { error } = await supabase.auth.signOut();
```

### Password Reset
```typescript
const { error } = await supabase.auth.resetPasswordForEmail(email);
```

### Get Session
```typescript
const { data: { session } } = await supabase.auth.getSession();
```

### Auth State Listener
```typescript
supabase.auth.onAuthStateChange((event, session) => {
  // Handle auth state changes
});
```

---

## Course API

### Fetch Active Course
```typescript
const { data: course } = await supabase
  .from('course')
  .select('*')
  .eq('active', true)
  .single();
```

**Response:**
```typescript
{
  id: string;
  title: string;
  version: string;
  duration_minutes: number;
  active: boolean;
  created_at: string;
}
```

---

## Modules API

### Fetch Course Modules
```typescript
const { data: modules } = await supabase
  .from('modules')
  .select('*')
  .eq('course_id', courseId)
  .order('sequence', { ascending: true });
```

**Response:**
```typescript
{
  id: string;
  course_id: string;
  title: string;
  body_html: string;
  type: 'lesson' | 'exam';
  sequence: number;
  estimated_minutes: number;
  created_at: string;
}[]
```

---

## Questions API

### Fetch Module Questions
```typescript
const { data: questions } = await supabase
  .from('questions')
  .select('*')
  .eq('module_id', moduleId)
  .order('sequence', { ascending: true });
```

**Response:**
```typescript
{
  id: string;
  module_id: string;
  prompt: string;
  choices: Record<string, string>; // e.g., { A: "text", B: "text", C: "text", D: "text" }
  correct_choice: string;
  rationale: string | null;
  sequence: number;
  created_at: string;
}[]
```

### Create Question (Admin)
```typescript
const { error } = await supabase.from('questions').insert({
  module_id: moduleId,
  prompt: string,
  choices: { A: string, B: string, C: string, D: string },
  correct_choice: string,
  rationale: string | null,
  sequence: number
});
```

### Update Question (Admin)
```typescript
const { error } = await supabase
  .from('questions')
  .update({
    prompt: string,
    choices: Record<string, string>,
    correct_choice: string,
    rationale: string | null
  })
  .eq('id', questionId);
```

### Delete Question (Admin)
```typescript
const { error } = await supabase
  .from('questions')
  .delete()
  .eq('id', questionId);
```

### Bulk Delete Questions (Admin)
```typescript
const { error } = await supabase
  .from('questions')
  .delete()
  .in('id', questionIds);
```

### Reorder Questions (Admin)
```typescript
// Update sequence for each question
const updates = reorderedQuestions.map((q, index) => 
  supabase
    .from('questions')
    .update({ sequence: index + 1 })
    .eq('id', q.id)
);
await Promise.all(updates);
```

---

## Progress API

### Fetch User Progress
```typescript
const { data: progress } = await supabase
  .from('progress')
  .select('*')
  .eq('user_id', userId);
```

**Response:**
```typescript
{
  id: string;
  user_id: string;
  module_id: string;
  completed: boolean;
  completed_at: string | null;
  last_viewed_at: string | null;
}[]
```

### Upsert Progress
```typescript
const { error } = await supabase
  .from('progress')
  .upsert({
    user_id: userId,
    module_id: moduleId,
    completed: boolean,
    completed_at: timestamp,
    last_viewed_at: timestamp
  }, {
    onConflict: 'user_id,module_id'
  });
```

---

## Attempts API

### Fetch User Attempts
```typescript
const { data: attempts } = await supabase
  .from('attempts')
  .select('*')
  .eq('user_id', userId)
  .eq('module_id', moduleId)
  .order('submitted_at', { ascending: false });
```

**Response:**
```typescript
{
  id: string;
  user_id: string;
  module_id: string;
  score: number;
  passed: boolean;
  answers: Record<string, string>;
  submitted_at: string;
}[]
```

### Submit Attempt
```typescript
const { data, error } = await supabase
  .from('attempts')
  .insert({
    user_id: userId,
    module_id: moduleId,
    score: number,
    passed: boolean,
    answers: Record<string, string>
  })
  .select()
  .single();
```

---

## Certificates API

### Fetch User Certificate
```typescript
const { data: certificate } = await supabase
  .from('certificates')
  .select('*')
  .eq('user_id', userId)
  .maybeSingle();
```

**Response:**
```typescript
{
  id: string;
  user_id: string;
  course_id: string;
  certificate_id: string;
  course_version: string;
  issued_at: string;
  pdf_url: string | null;
} | null
```

### Issue Certificate
```typescript
const { data, error } = await supabase
  .from('certificates')
  .insert({
    user_id: userId,
    course_id: courseId,
    certificate_id: generatedId,
    course_version: version,
    issued_at: new Date().toISOString()
  })
  .select()
  .single();
```

### Verify Certificate (Public)
```typescript
const { data: certificate } = await supabase
  .from('certificates')
  .select('*, profiles!inner(first_name, last_name)')
  .eq('certificate_id', certId)
  .maybeSingle();
```

---

## Profiles API

### Fetch User Profile
```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .single();
```

**Response:**
```typescript
{
  id: string;
  first_name: string;
  last_name: string;
  organization: string | null;
  organization_id: string | null;
  job_role: string | null;
  created_at: string;
}
```

---

## Organizations API

### Fetch All Organizations (Admin)
```typescript
const { data: organizations } = await supabase
  .from('organizations')
  .select('id, name, description, domain, max_users, active, primary_color, logo_url');
```

**Response:**
```typescript
{
  id: string;
  name: string;
  description: string | null;
  domain: string | null;  // Email domain for auto-assignment
  max_users: number | null;
  active: boolean;
  primary_color: string | null;
  logo_url: string | null;
}[]
```

---

## User Roles API

### Fetch User Role
```typescript
const { data: role } = await supabase
  .from('user_roles')
  .select('role')
  .eq('user_id', userId)
  .single();
```

### Update User Role (Admin Only)
```typescript
const { error } = await supabase
  .from('user_roles')
  .update({ role: 'admin' | 'learner' })
  .eq('user_id', userId);
```

---

## Enrollments API

### Fetch User Enrollments
```typescript
const { data: enrollments } = await supabase
  .from('enrollments')
  .select('*')
  .eq('user_id', userId);
```

**Response:**
```typescript
{
  id: string;
  user_id: string;
  course_id: string;
  enrolled_at: string;
}[]
```

### Fetch All Enrollments (Admin)
```typescript
const { data: enrollments } = await supabase
  .from('enrollments')
  .select('user_id, course_id');
```

### Create Enrollment (Admin)
```typescript
const { error } = await supabase
  .from('enrollments')
  .insert({
    user_id: userId,
    course_id: courseId
  });
```

### Bulk Create Enrollments (Admin)
```typescript
const { error } = await supabase
  .from('enrollments')
  .insert(
    userIds.map(user_id => ({ user_id, course_id: courseId }))
  );
```

### Delete Enrollment (Admin)
```typescript
const { error } = await supabase
  .from('enrollments')
  .delete()
  .eq('user_id', userId)
  .eq('course_id', courseId);
```

---

## Admin Queries

### Fetch All Learners with Progress (Course-Filtered)
```typescript
// Fetch profiles
const { data: profiles } = await supabase
  .from('profiles')
  .select('*');

// Fetch enrollments
const { data: enrollments } = await supabase
  .from('enrollments')
  .select('user_id, course_id');

// Fetch modules (optionally filter by course)
let modulesQuery = supabase.from('modules').select('id, course_id, type');
if (courseFilter !== 'all') {
  modulesQuery = modulesQuery.eq('course_id', courseFilter);
}
const { data: modules } = await modulesQuery;

// Fetch all progress
const { data: progress } = await supabase
  .from('progress')
  .select('*');

// Fetch all attempts
const { data: attempts } = await supabase
  .from('attempts')
  .select('*');

// Fetch certificates (optionally filter by course)
let certificatesQuery = supabase.from('certificates').select('*');
if (courseFilter !== 'all') {
  certificatesQuery = certificatesQuery.eq('course_id', courseFilter);
}
const { data: certificates } = await certificatesQuery;

// Filter and combine in application code
```

### Fetch All Users with Roles
```typescript
const { data: profiles } = await supabase
  .from('profiles')
  .select('*');

const { data: roles } = await supabase
  .from('user_roles')
  .select('*');

// Join in application code
```

---

## Error Handling Pattern

```typescript
try {
  const { data, error } = await supabase.from('table').select('*');
  
  if (error) {
    console.error('Database error:', error.message);
    throw error;
  }
  
  return data;
} catch (err) {
  toast({
    title: "Error",
    description: "Failed to fetch data",
    variant: "destructive"
  });
}
```

---

## React Query Integration

### Query Pattern
```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['key', param],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('table')
      .select('*');
    if (error) throw error;
    return data;
  },
  enabled: !!param // Conditional fetching
});
```

### Mutation Pattern
```typescript
const mutation = useMutation({
  mutationFn: async (payload) => {
    const { data, error } = await supabase
      .from('table')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['key'] });
    toast({ title: "Success" });
  },
  onError: (error) => {
    toast({ title: "Error", variant: "destructive" });
  }
});
```

---

## Database Functions

### has_role
Check if user has a specific role:
```sql
SELECT has_role(auth.uid(), 'admin'); -- Returns boolean
```

Used in RLS policies:
```sql
CREATE POLICY "Admins can view all"
ON table_name FOR SELECT
USING (has_role(auth.uid(), 'admin'));
```
