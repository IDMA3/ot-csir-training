# Security Documentation

This document describes the security model, practices, and configurations for the SCL OT CSIR Training Platform.

## Overview

The platform implements defense-in-depth security with multiple layers:

1. **Authentication** - Supabase Auth with email/password
2. **Authorization** - Role-based access control (RBAC)
3. **Row-Level Security** - Database-level access control
4. **Multi-Tenancy** - Organization-based data isolation
5. **Input Sanitization** - XSS protection with DOMPurify
6. **Audit Trail** - Append-only records for compliance

---

## Authentication

### Authentication Flow

```
User → Login Form → Supabase Auth → JWT Token → Protected Routes
                                        ↓
                                  Profile Fetch
                                        ↓
                                  Role Assignment
```

### Session Management

- JWT tokens stored in browser memory (not localStorage)
- Automatic token refresh
- Session persistence across page reloads
- Secure logout clears all session data

### Password Requirements

- Minimum 6 characters (Supabase default)
- Password strength indicator during signup
- Secure password reset via email

### Email Confirmation

- Auto-confirm enabled for non-production environments
- Production should enable email verification

---

## Authorization Model

### Roles

| Role | Level | Description |
|------|-------|-------------|
| `learner` | Base | Default role for all users |
| `admin` | Elevated | Users with administrative access |

### Admin Permissions

Fine-grained permissions stored in `admin_permissions` table:

| Permission | Description |
|------------|-------------|
| `is_super_admin` | Full platform access |
| `can_view_users` | View user data in scope |
| `can_manage_users` | Create, update, delete users |
| `can_view_courses` | View course data |
| `can_manage_courses` | Create, update, delete courses |
| `organization_scope` | Limit access to specific organization |

### Permission Hierarchy

```
Super Admin (is_super_admin = true)
    ↓ Can do everything
    ↓ Can manage other admins
    ↓ Can access all organizations

Organization Admin (admin role + org scope)
    ↓ Limited to their organization
    ↓ Cannot modify other admins
    ↓ Cannot access other organizations

Learner
    ↓ View assigned courses only
    ↓ Track own progress
    ↓ View own certificates
```

---

## Row-Level Security (RLS)

All tables have RLS enabled with restrictive policies.

### Policy Patterns

#### User-Owned Data
```sql
-- Users can only see their own records
CREATE POLICY "Users view own data"
ON table_name FOR SELECT
USING (auth.uid() = user_id);
```

#### Organization-Scoped Data
```sql
-- Users can see data from their organization
CREATE POLICY "Org users view org data"
ON table_name FOR SELECT
USING (
  organization_id = (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
);
```

#### Admin Access
```sql
-- Super admins can see all
CREATE POLICY "Super admin full access"
ON table_name FOR ALL
USING (is_super_admin(auth.uid()));
```

### Database Functions for RLS

| Function | Purpose |
|----------|---------|
| `is_super_admin(uuid)` | Check if user is super admin |
| `has_admin_access(uuid)` | Check if user has any admin permission |
| `can_view_org_users(uuid, text)` | Check org user view permission |
| `can_manage_org_courses(uuid, text)` | Check org course manage permission |
| `can_view_course(uuid, uuid)` | Check if user can access specific course |

---

## Multi-Tenancy

### Organization Isolation

- Users belong to one organization via `profiles.organization_id`
- Data is filtered by organization in queries
- RLS policies enforce organization boundaries
- Org admins cannot see data from other organizations

### Course Access Control

```
Organization
    ↓
organization_courses (whitelist)
    ↓
Allowed Courses
```

If no whitelist exists, all global courses are accessible.

### Cross-Organization Protection

- Org admins cannot modify users in other organizations
- Org admins cannot delete admins from any organization
- Course creators cannot modify courses from other organizations

---

## Data Protection

### Sensitive Data Handling

| Data Type | Protection |
|-----------|------------|
| Passwords | Hashed by Supabase Auth (bcrypt) |
| Email | Stored in auth.users (not public schema) |
| API Keys | Stored in Supabase Secrets |
| JWT Tokens | In-memory only, not persisted |

### No Direct Auth Access

The application never directly queries `auth.users`. User data is accessed through:
- `profiles` table for profile information
- `user_roles` table for role information
- Supabase Auth methods for authentication

### Audit Trail

Critical operations are tracked:
- `created_at` timestamps on all records
- `updated_at` timestamps where applicable
- Certificate issuance tracked with `issued_at`
- Attempt submissions tracked with `submitted_at`

---

## Input Validation & Sanitization

### XSS Protection

All HTML content is sanitized using DOMPurify:

```typescript
import DOMPurify from 'dompurify';

const sanitizedHtml = DOMPurify.sanitize(untrustedHtml);
```

### Where Sanitization is Applied

- Module body HTML content
- Rich text editor output
- Any user-generated HTML

### Form Validation

- Zod schemas for type-safe validation
- React Hook Form for form state
- Server-side validation in Edge Functions

---

## API Security

### Edge Function Authentication

Protected endpoints verify JWT tokens:

```typescript
const authHeader = req.headers.get('Authorization');
const { data: { user }, error } = await supabase.auth.getUser(
  authHeader?.replace('Bearer ', '')
);
```

### Service Role Key Usage

Service role key is only used in Edge Functions for:
- User deletion from auth.users
- Cross-table operations requiring elevated permissions
- Admin operations that bypass RLS

### CORS Configuration

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

---

## Secrets Management

### Environment Variables

| Variable | Purpose | Exposure |
|----------|---------|----------|
| `VITE_SUPABASE_URL` | Supabase project URL | Client-side (safe) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Anon key | Client-side (safe) |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin key | Server-side only |
| `RESEND_API_KEY` | Email service | Server-side only |

### Secret Storage

- Production secrets stored in Supabase Secrets
- Never committed to version control
- Edge Functions access via `Deno.env.get()`

---

## Security Checklist

### Development

- [ ] RLS enabled on all tables
- [ ] No direct auth.users access
- [ ] Service role key only in Edge Functions
- [ ] HTML content sanitized with DOMPurify
- [ ] Form inputs validated

### Deployment

- [ ] Environment variables configured
- [ ] Email confirmation enabled (production)
- [ ] HTTPS enforced
- [ ] Redirect URLs configured

### Monitoring

- [ ] Edge Function logs reviewed
- [ ] Failed authentication attempts monitored
- [ ] Database query patterns analyzed

---

## Known Limitations

1. **No MFA**: Multi-factor authentication not implemented
2. **No IP Blocking**: No automatic IP-based blocking
3. **No Rate Limiting**: Edge Functions don't have rate limiting
4. **Session Duration**: Default Supabase session duration

---

## Security Contact

For security vulnerabilities, please contact the project maintainers directly rather than creating public issues.
