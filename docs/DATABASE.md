# Database Schema Documentation

## Overview

This document describes the database schema for the SCL OT CSIR Training application. The database is powered by Lovable Cloud (Supabase) and uses PostgreSQL with Row-Level Security (RLS) policies.

---

## Tables

### 1. `course`

Stores course metadata.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `title` | text | No | - | Course title |
| `version` | text | No | - | Course version string |
| `duration_minutes` | integer | No | - | Estimated duration |
| `active` | boolean | No | `true` | Whether course is active |
| `created_at` | timestamptz | No | `now()` | Creation timestamp |

**RLS Policies:**
- `Anyone authenticated can view active courses` (SELECT): `active = true`
- `Admins can manage courses` (ALL): `has_role(auth.uid(), 'admin')`

---

### 2. `modules`

Stores course modules/sections.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `course_id` | uuid | No | - | FK to course |
| `title` | text | No | - | Module title |
| `body_html` | text | No | - | HTML content |
| `type` | module_type | No | - | 'lesson' or 'exam' |
| `sequence` | integer | No | - | Display order |
| `estimated_minutes` | integer | No | `2` | Estimated time |
| `created_at` | timestamptz | No | `now()` | Creation timestamp |

**RLS Policies:**
- `Anyone authenticated can view modules` (SELECT): `true`
- `Admins can manage modules` (ALL): `has_role(auth.uid(), 'admin')`

---

### 3. `questions`

Stores quiz/exam questions for each module.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `module_id` | uuid | No | - | FK to modules |
| `prompt` | text | No | - | Question text |
| `choices` | jsonb | No | - | Object of choice options (e.g., `{A: "text", B: "text"}`) |
| `correct_choice` | text | No | - | Correct answer key (A, B, C, etc.) |
| `rationale` | text | Yes | - | Explanation for answer |
| `sequence` | integer | No | `1` | Display order within module |
| `created_at` | timestamptz | No | `now()` | Creation timestamp |

**RLS Policies:**
- `Anyone authenticated can view questions` (SELECT): `true`
- `Admins can manage questions` (ALL): `has_role(auth.uid(), 'admin')`

---

### 4. `profiles`

Stores user profile information.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | - | PK, references auth.users |
| `first_name` | text | No | - | User's first name |
| `last_name` | text | No | - | User's last name |
| `organization` | text | Yes | - | User's organization |
| `job_role` | text | Yes | - | User's job role |
| `created_at` | timestamptz | No | `now()` | Registration date |

**RLS Policies:**
- `Users can view their own profile` (SELECT): `auth.uid() = id`
- `Users can insert their own profile` (INSERT): `auth.uid() = id`
- `Users can update their own profile` (UPDATE): `auth.uid() = id`
- `Admins can view all profiles` (SELECT): `has_role(auth.uid(), 'admin')`

---

### 5. `user_roles`

Manages user role assignments.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `user_id` | uuid | No | - | FK to auth.users |
| `role` | app_role | No | `'learner'` | 'learner' or 'admin' |

**RLS Policies:**
- `Users can view their own role` (SELECT): `auth.uid() = user_id`
- `Admins can view all roles` (SELECT): `has_role(auth.uid(), 'admin')`
- `Admins can update user roles` (UPDATE): `has_role(auth.uid(), 'admin')`

---

### 6. `progress`

Tracks user progress through modules.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `user_id` | uuid | No | - | FK to auth.users |
| `module_id` | uuid | No | - | FK to modules |
| `completed` | boolean | No | `false` | Completion status |
| `completed_at` | timestamptz | Yes | - | Completion timestamp |
| `last_viewed_at` | timestamptz | Yes | - | Last access time |

**RLS Policies:**
- `Users can view their own progress` (SELECT): `auth.uid() = user_id`
- `Users can insert their own progress` (INSERT): `auth.uid() = user_id`
- `Users can update their own progress` (UPDATE): `auth.uid() = user_id`
- `Admins can view all progress` (SELECT): `has_role(auth.uid(), 'admin')`

---

### 7. `attempts`

Stores quiz/exam attempt records.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `user_id` | uuid | No | - | FK to auth.users |
| `module_id` | uuid | No | - | FK to modules |
| `score` | numeric | No | - | Percentage score |
| `passed` | boolean | No | - | Pass/fail status |
| `answers` | jsonb | No | - | User's answer selections |
| `submitted_at` | timestamptz | No | `now()` | Submission timestamp |

**RLS Policies:**
- `Users can view their own attempts` (SELECT): `auth.uid() = user_id`
- `Users can insert their own attempts` (INSERT): `auth.uid() = user_id`
- `Admins can view all attempts` (SELECT): `has_role(auth.uid(), 'admin')`

---

### 8. `certificates`

Stores issued completion certificates.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `user_id` | uuid | No | - | FK to auth.users |
| `course_id` | uuid | No | - | FK to course |
| `certificate_id` | text | No | - | Public verification ID |
| `course_version` | text | No | - | Course version at issue |
| `issued_at` | timestamptz | No | - | Issue timestamp |
| `pdf_url` | text | Yes | - | PDF download URL |

**RLS Policies:**
- `Users can view their own certificates` (SELECT): `auth.uid() = user_id`
- `Users can insert their own certificates` (INSERT): `auth.uid() = user_id`
- `Admins can view all certificates` (SELECT): `has_role(auth.uid(), 'admin')`
- `Anyone can verify certificates` (SELECT): `true`

---

## Enums

### `app_role`
- `learner` - Standard user role
- `admin` - Administrative access

### `module_type`
- `lesson` - Educational content module
- `exam` - Assessment module

---

## Database Functions

### `has_role(user_id uuid, role app_role) → boolean`
Checks if a user has a specific role. Used in RLS policies.

```sql
SELECT EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_id = _user_id AND role = _role
)
```

### `handle_new_user() → trigger`
Automatically creates profile and assigns 'learner' role on user signup.

### `assign_admin_for_email() → trigger`
Auto-assigns admin role for specific email addresses.

---

## Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐
│   course    │───────│   modules   │
└─────────────┘       └─────────────┘
                            │
                            ├──────────────┐
                            │              │
                      ┌─────────────┐ ┌─────────────┐
                      │  questions  │ │  progress   │
                      └─────────────┘ └─────────────┘
                                            │
┌─────────────┐       ┌─────────────┐       │
│  profiles   │───────│ auth.users  │───────┤
└─────────────┘       └─────────────┘       │
                            │               │
                      ┌─────────────┐ ┌─────────────┐
                      │ user_roles  │ │  attempts   │
                      └─────────────┘ └─────────────┘
                                            │
                                      ┌─────────────┐
                                      │certificates │
                                      └─────────────┘
```

---

## Security Model

1. **Row-Level Security (RLS)** is enabled on all tables
2. **RESTRICTIVE policies** - Users only access their own data
3. **Admin override** - Admins can view all data via `has_role()` function
4. **Public verification** - Certificates can be verified by anyone
5. **No DELETE permissions** - Data is append-only for audit trails
