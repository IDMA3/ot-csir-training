# Database Schema Documentation

## Overview

This document describes the database schema for the SCL OT CSIR Training application. The database is powered by Lovable Cloud (Supabase) and uses PostgreSQL with Row-Level Security (RLS) policies.

---

## Tables

### 1. `organizations`

Stores organization/company information for multi-tenancy.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `name` | text | No | - | Organization name |
| `description` | text | Yes | - | Description |
| `logo_url` | text | Yes | - | Logo image URL |
| `primary_color` | text | Yes | `'#3b82f6'` | Brand color |
| `max_users` | integer | Yes | - | User limit |
| `domain` | text | Yes | - | Email domain for auto-assignment (e.g., "idma3.com") |
| `active` | boolean | No | `true` | Active status |
| `settings` | jsonb | Yes | `'{}'` | Custom settings |
| `created_at` | timestamptz | No | `now()` | Creation timestamp |
| `updated_at` | timestamptz | No | `now()` | Last update |

**RLS Policies:**
- `Authenticated users can view active organizations` (SELECT): `active = true`
- `Super admins can manage organizations` (ALL): `is_super_admin(auth.uid())`

---

### 2. `course`

Stores course metadata.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `title` | text | No | - | Course title |
| `description` | text | Yes | - | Course description |
| `version` | text | No | - | Course version string |
| `duration_minutes` | integer | No | - | Estimated duration |
| `category` | text | Yes | - | Course category |
| `organization` | text | Yes | - | Legacy organization field |
| `creator_organization_id` | uuid | Yes | - | FK to organizations |
| `created_by` | uuid | Yes | - | User who created course |
| `active` | boolean | No | `true` | Whether course is active |
| `created_at` | timestamptz | No | `now()` | Creation timestamp |

**RLS Policies:**
- `Users can view accessible active courses` (SELECT): `active = true AND can_view_course(auth.uid(), id)`
- `Admins can manage courses` (ALL): `has_role(auth.uid(), 'admin')`

---

### 3. `modules`

Stores course modules/sections.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `course_id` | uuid | No | - | FK to course |
| `title` | text | No | - | Module title |
| `body_html` | text | No | - | HTML content |
| `type` | module_type | No | - | 'module' or 'exam' |
| `sequence` | integer | No | - | Display order |
| `estimated_minutes` | integer | No | `2` | Estimated time |
| `created_at` | timestamptz | No | `now()` | Creation timestamp |

**RLS Policies:**
- `Anyone authenticated can view modules` (SELECT): `true`
- `Admins can manage modules` (ALL): `has_role(auth.uid(), 'admin')`

---

### 4. `questions`

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

### 5. `profiles`

Stores user profile information.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | - | PK, references auth.users |
| `first_name` | text | No | - | User's first name |
| `last_name` | text | No | - | User's last name |
| `organization` | text | Yes | - | Legacy organization name |
| `organization_id` | uuid | Yes | - | FK to organizations |
| `job_role` | text | Yes | - | User's job role |
| `created_at` | timestamptz | No | `now()` | Registration date |

**RLS Policies:**
- `Users can view their own profile` (SELECT): `auth.uid() = id`
- `Users can insert their own profile` (INSERT): `auth.uid() = id`
- `Users can update their own profile` (UPDATE): `auth.uid() = id`
- `Admins can view all profiles` (SELECT): `has_role(auth.uid(), 'admin')`
- `Super admins can update any profile organization` (UPDATE): `is_super_admin(auth.uid())`

---

### 6. `user_roles`

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

### 7. `admin_permissions`

Granular admin permission management.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `user_id` | uuid | No | - | FK to auth.users |
| `is_super_admin` | boolean | No | `false` | Full system access |
| `can_view_users` | boolean | No | `false` | View user data |
| `can_manage_users` | boolean | No | `false` | Manage users |
| `can_view_courses` | boolean | No | `false` | View courses |
| `can_manage_courses` | boolean | No | `false` | Manage courses |
| `organization_scope` | text | Yes | - | Limit to specific org |
| `created_at` | timestamptz | No | `now()` | Creation timestamp |
| `updated_at` | timestamptz | No | `now()` | Last update |

**RLS Policies:**
- `Users can view their own permissions` (SELECT): `auth.uid() = user_id`
- `Super admins can view all permissions` (SELECT): `is_super_admin(auth.uid())`
- `Super admins can insert permissions` (INSERT): `is_super_admin(auth.uid())`
- `Super admins can update permissions` (UPDATE): `is_super_admin(auth.uid())`
- `Super admins can delete permissions` (DELETE): `is_super_admin(auth.uid())`

---

### 8. `enrollments`

Tracks user course enrollments.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `user_id` | uuid | No | - | FK to auth.users |
| `course_id` | uuid | No | - | FK to course |
| `enrolled_at` | timestamptz | No | `now()` | Enrollment timestamp |

**RLS Policies:**
- `Users can view their own enrollments` (SELECT): `auth.uid() = user_id`
- `Users can enroll themselves` (INSERT): `auth.uid() = user_id`
- `Admins can view all enrollments` (SELECT): `has_role(auth.uid(), 'admin')`
- `Admins can manage all enrollments` (ALL): `has_role(auth.uid(), 'admin')`

---

### 9. `organization_courses`

Maps courses available to each organization.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `organization_id` | uuid | No | - | FK to organizations |
| `course_id` | uuid | No | - | FK to course |
| `created_at` | timestamptz | No | `now()` | Creation timestamp |

**RLS Policies:**
- `Users can view their organization courses` (SELECT): User's org matches
- `Org admins can manage their org course assignments` (ALL): Admin with course permissions
- `Super admins can manage organization courses` (ALL): `is_super_admin(auth.uid())`

---

### 10. `progress`

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

### 11. `attempts`

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

### 12. `certificates`

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

### 13. `recertification_schedules`

Configures recertification requirements per organization/course.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `organization_id` | uuid | No | - | FK to organizations |
| `course_id` | uuid | No | - | FK to course |
| `schedule_type` | text | No | - | 'annual', 'biannual', 'custom' |
| `custom_days` | integer | Yes | - | Days for custom schedule |
| `enabled` | boolean | No | `true` | Active status |
| `created_at` | timestamptz | No | `now()` | Creation timestamp |
| `updated_at` | timestamptz | No | `now()` | Last update |

**RLS Policies:**
- `Org admins can view their org recertification schedules` (SELECT): Admin with view permissions
- `Org admins can manage their org recertification schedules` (ALL): Admin with course permissions
- `Super admins can manage all recertification schedules` (ALL): `is_super_admin(auth.uid())`

---

### 14. `user_invitations`

Manages user invitation workflow.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | `gen_random_uuid()` | Primary key |
| `email` | text | No | - | Invitee email |
| `first_name` | text | Yes | - | Invitee first name |
| `last_name` | text | Yes | - | Invitee last name |
| `job_role` | text | Yes | - | Assigned job role |
| `organization_id` | uuid | Yes | - | FK to organizations |
| `invited_role` | text | No | `'learner'` | Role to assign |
| `admin_permissions` | jsonb | Yes | - | Admin permissions if role=admin |
| `course_ids` | uuid[] | Yes | `'{}'` | Courses to enroll |
| `token` | text | No | `gen_random_uuid()` | Unique invite token |
| `status` | text | No | `'pending'` | 'pending', 'accepted', 'expired' |
| `invited_by` | uuid | Yes | - | FK to auth.users |
| `expires_at` | timestamptz | No | `now() + 7 days` | Expiration time |
| `accepted_at` | timestamptz | Yes | - | Acceptance timestamp |
| `created_at` | timestamptz | No | `now()` | Creation timestamp |

**RLS Policies:**
- `Anyone can view invitation by token` (SELECT): `true`
- `Org admins can view their org invitations` (SELECT): Admin with view permissions
- `Super admins can manage invitations` (ALL): `is_super_admin(auth.uid())`

---

## Enums

### `app_role`
- `learner` - Standard user role
- `admin` - Administrative access

### `module_type`
- `module` - Educational content module
- `exam` - Assessment module

---

## Database Functions

### `has_role(user_id uuid, role app_role) → boolean`
Checks if a user has a specific role. Used in RLS policies.

### `is_super_admin(check_user_id uuid) → boolean`
Checks if a user is a super admin with full system access.

### `has_admin_access(check_user_id uuid) → boolean`
Checks if a user has any admin permissions.

### `can_view_course(user_uuid uuid, course_uuid uuid) → boolean`
Determines if a user can view a specific course based on organization access.

### `user_can_access_course(user_uuid uuid, course_uuid uuid) → boolean`
Checks course access based on organization course restrictions.

### `can_view_org_users(check_user_id uuid, check_org text) → boolean`
Checks if admin can view users for a specific organization.

### `can_manage_org_courses(check_user_id uuid, check_org text) → boolean`
Checks if admin can manage courses for a specific organization.

### `handle_new_user() → trigger`
Automatically creates profile and assigns 'learner' role on user signup. Also **auto-assigns organization** based on:
1. Exact organization name match (case-insensitive) from user metadata
2. Email domain match against `organizations.domain` (if no name match found)

### `assign_admin_for_email() → trigger`
Auto-assigns admin role for specific email addresses.

### `update_admin_permissions_updated_at() → trigger`
Updates the `updated_at` timestamp on admin_permissions changes.

### `update_recertification_schedules_updated_at() → trigger`
Updates the `updated_at` timestamp on recertification_schedules changes.

---

## Storage Buckets

| Bucket | Public | Purpose |
|--------|--------|---------|
| `module-images` | Yes | Images embedded in module content |
| `organization-logos` | Yes | Organization logo images |

---

## Entity Relationship Diagram

```
┌─────────────────┐
│  organizations  │
└────────┬────────┘
         │
    ┌────┴────┬──────────────────┬────────────────────┐
    │         │                  │                    │
    ▼         ▼                  ▼                    ▼
┌────────┐ ┌──────────────┐ ┌─────────────────┐ ┌────────────────────┐
│profiles│ │org_courses   │ │recert_schedules │ │user_invitations    │
└───┬────┘ └──────┬───────┘ └────────┬────────┘ └────────────────────┘
    │             │                  │
    │         ┌───┴───┐              │
    │         ▼       │              │
    │    ┌─────────┐  │              │
    │    │ course  │◄─┴──────────────┘
    │    └────┬────┘
    │         │
    │    ┌────┴────┐
    │    ▼         │
    │ ┌────────┐   │
    │ │modules │   │
    │ └───┬────┘   │
    │     │        │
    │ ┌───┴───┐    │
    │ ▼       │    │
┌───┴────┐    │    │
│progress│    │    │
└────────┘    │    │
              ▼    │
         ┌─────────┴──┐
         │ questions  │
         └────────────┘

┌─────────────┐     ┌─────────────┐
│ auth.users  │────►│  profiles   │
└──────┬──────┘     └─────────────┘
       │
  ┌────┼────┬────────────┬──────────────┐
  │    │    │            │              │
  ▼    ▼    ▼            ▼              ▼
┌────┐┌────┐┌──────┐┌─────────┐┌──────────────────┐
│role││perm││enroll││attempts ││  certificates    │
└────┘└────┘└──────┘└─────────┘└──────────────────┘
```

---

## Security Model

1. **Row-Level Security (RLS)** is enabled on all tables
2. **RESTRICTIVE policies** - Users only access their own data by default
3. **Admin permissions** - Granular admin access via `admin_permissions` table
4. **Super admin override** - Super admins have full system access
5. **Organization scoping** - Org admins limited to their organization
6. **Public verification** - Certificates can be verified by anyone
7. **No DELETE permissions** on critical tables - Data is append-only for audit trails

---

## Multi-Tenancy Model

The application supports multi-tenancy through:

1. **Organizations table** - Stores tenant information
2. **Organization courses** - Maps available courses per organization
3. **Profile organization_id** - Links users to their organization
4. **Admin organization_scope** - Limits admin access to specific organizations
5. **Course visibility** - `can_view_course()` function enforces org-based access
