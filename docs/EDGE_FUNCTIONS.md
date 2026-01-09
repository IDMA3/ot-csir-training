# Edge Functions API Reference

This document describes the Supabase Edge Functions that provide backend functionality for the platform.

## Overview

| Function | Purpose | Authentication |
|----------|---------|----------------|
| `send-invitation` | Sends email invitations to users | Required (Admin) |
| `accept-invitation` | Processes invitation acceptance | Public (Token-based) |
| `delete-user` | Deletes a user and all related data | Required (Admin) |

---

## send-invitation

Sends email invitations to new users via the Resend API.

### Endpoint

```
POST /functions/v1/send-invitation
```

### Authentication

Requires authenticated admin user with invitation permissions.

### Request Body

```typescript
interface InvitationRequest {
  invitationIds: string[];  // Array of invitation UUIDs to send
  appUrl: string;           // Base URL for signup links
}
```

### Example Request

```typescript
const { data, error } = await supabase.functions.invoke('send-invitation', {
  body: {
    invitationIds: ['uuid-1', 'uuid-2'],
    appUrl: 'https://your-app.com'
  }
});
```

### Response

```typescript
// Success
{
  success: true,
  sent: 2,
  failed: 0,
  results: [
    { invitationId: 'uuid-1', success: true },
    { invitationId: 'uuid-2', success: true }
  ]
}

// Partial failure
{
  success: false,
  sent: 1,
  failed: 1,
  results: [
    { invitationId: 'uuid-1', success: true },
    { invitationId: 'uuid-2', success: false, error: 'Invalid email' }
  ]
}
```

### Email Content

The invitation email includes:
- Recipient's name (if provided)
- Organization name
- Signup link with invitation token
- Expiration date (7 days from creation)
- Invited role information

### Error Codes

| Code | Description |
|------|-------------|
| 400 | Invalid request body |
| 401 | Unauthorized |
| 404 | Invitation not found |
| 500 | Email service error |

### Required Secrets

- `RESEND_API_KEY` - Resend API key for email delivery

---

## accept-invitation

Processes the acceptance of a user invitation, setting up profile, organization, enrollments, and permissions.

### Endpoint

```
POST /functions/v1/accept-invitation
```

### Authentication

Public endpoint - uses invitation token for validation.

### Request Body

```typescript
interface AcceptInvitationRequest {
  token: string;   // Invitation token from email link
  userId: string;  // ID of the newly registered user
}
```

### Example Request

```typescript
const { data, error } = await supabase.functions.invoke('accept-invitation', {
  body: {
    token: 'invitation-token-from-url',
    userId: 'authenticated-user-uuid'
  }
});
```

### Response

```typescript
// Success
{
  success: true,
  message: 'Invitation accepted successfully',
  organizationId: 'org-uuid',
  enrolledCourses: ['course-uuid-1', 'course-uuid-2'],
  isAdmin: false
}

// Admin invitation
{
  success: true,
  message: 'Invitation accepted successfully',
  organizationId: 'org-uuid',
  enrolledCourses: [],
  isAdmin: true,
  permissions: {
    can_view_users: true,
    can_manage_users: true
  }
}
```

### Processing Steps

1. **Validate Token**: Verify invitation exists and is valid
2. **Check Expiration**: Ensure invitation hasn't expired
3. **Check Status**: Verify invitation is still pending
4. **Update Invitation**: Mark as accepted with timestamp
5. **Update Profile**: Set organization_id and organization name
6. **Create Enrollments**: Enroll user in specified courses
7. **Grant Permissions**: If admin role, create admin_permissions record
8. **Update Role**: If admin role, update user_roles table

### Error Codes

| Code | Description |
|------|-------------|
| 400 | Missing token or userId |
| 404 | Invitation not found |
| 410 | Invitation expired |
| 409 | Invitation already accepted or cancelled |
| 500 | Processing error |

---

## delete-user

Securely deletes a user and all associated data with permission checks.

### Endpoint

```
POST /functions/v1/delete-user
```

### Authentication

Requires authenticated admin user with delete permissions.

### Request Body

```typescript
interface DeleteUserRequest {
  userId: string;  // UUID of user to delete
}
```

### Example Request

```typescript
const { data, error } = await supabase.functions.invoke('delete-user', {
  body: {
    userId: 'user-uuid-to-delete'
  }
});
```

### Response

```typescript
// Success
{
  success: true,
  message: 'User deleted successfully',
  deletedCounts: {
    certificates: 2,
    attempts: 5,
    progress: 10,
    enrollments: 2,
    adminPermissions: 0,
    userRoles: 1,
    profiles: 1
  }
}
```

### Permission Rules

| Requestor | Can Delete |
|-----------|------------|
| Super Admin | Any non-super-admin user |
| Org Admin (can_manage_users) | Users in their organization only |
| Regular User | None |

### Restrictions

- **Self-deletion blocked**: Admins cannot delete themselves
- **Super Admin protection**: Super Admins cannot delete other Super Admins
- **Organization scope**: Org Admins can only delete users in their organization
- **Admin protection**: Org Admins cannot delete other admins

### Deletion Order (Cascading)

1. `certificates` - User's certificates
2. `attempts` - Quiz/exam attempts
3. `progress` - Module progress records
4. `enrollments` - Course enrollments
5. `admin_permissions` - Admin permission records
6. `user_roles` - Role assignments
7. `profiles` - User profile
8. `user_invitations` - Clear `invited_by` references
9. `auth.users` - Supabase auth user (final)

### Error Codes

| Code | Description |
|------|-------------|
| 400 | Missing userId |
| 401 | Unauthorized or invalid token |
| 403 | Insufficient permissions |
| 403 | Cannot delete self |
| 403 | Cannot delete super admin |
| 403 | Cannot delete user outside organization |
| 404 | User not found |
| 500 | Deletion error |

---

## Common Patterns

### CORS Headers

All functions include CORS headers:

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

### Preflight Handling

```typescript
if (req.method === 'OPTIONS') {
  return new Response(null, { headers: corsHeaders });
}
```

### Error Response Format

```typescript
{
  error: 'Error message description'
}
```

### Service Role Client

Functions use the service role key for elevated permissions:

```typescript
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);
```

---

## Debugging

### Viewing Logs

Edge function logs are available in the Lovable Cloud backend view or via the Supabase dashboard.

### Common Issues

1. **CORS Errors**: Ensure preflight handling is implemented
2. **Auth Errors**: Verify Authorization header is passed
3. **Permission Denied**: Check RLS policies and admin permissions
4. **Timeout**: Functions have a 60-second timeout limit

### Testing Locally

Edge functions can be tested using the Supabase CLI:

```bash
supabase functions serve function-name --env-file .env.local
```
