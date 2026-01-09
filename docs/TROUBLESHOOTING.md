# Troubleshooting Guide

This guide covers common issues and their solutions.

---

## Table of Contents

- [Authentication Issues](#authentication-issues)
- [Database Issues](#database-issues)
- [Deployment Issues](#deployment-issues)
- [Edge Function Issues](#edge-function-issues)
- [UI/UX Issues](#uiux-issues)
- [Performance Issues](#performance-issues)

---

## Authentication Issues

### "Invalid login credentials"

**Cause:** Email or password is incorrect.

**Solutions:**
1. Verify email is typed correctly
2. Use password reset if forgotten
3. Check if account exists

---

### "Email not confirmed"

**Cause:** Email verification required but not completed.

**Solutions:**
1. Check email inbox (including spam) for verification link
2. Request new verification email
3. For development: Enable auto-confirm in Supabase Auth settings

---

### Session Not Persisting

**Cause:** Session not being stored or restored properly.

**Solutions:**
1. Check browser allows cookies/local storage
2. Verify Supabase URL is correct
3. Check for JavaScript errors in console
4. Try clearing browser cache

---

### Redirect Loop After Login

**Cause:** Protected route configuration issue.

**Solutions:**
1. Check `ProtectedRoute` component logic
2. Verify `useAuth` hook is returning correct state
3. Check for race conditions in auth state loading

---

### "User already registered"

**Cause:** Email already has an account.

**Solutions:**
1. Use sign in instead of sign up
2. Use password reset if credentials forgotten
3. Check for duplicate invitation handling

---

## Database Issues

### "Permission denied for table"

**Cause:** RLS policy blocking access.

**Solutions:**
1. Verify user is authenticated
2. Check RLS policies on the table
3. Verify user has correct role/permissions
4. Check organization scope matches

**Debug Query:**
```sql
-- Check current user's permissions
SELECT * FROM admin_permissions 
WHERE user_id = auth.uid();

-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

---

### "relation does not exist"

**Cause:** Table doesn't exist or wrong schema.

**Solutions:**
1. Run pending migrations
2. Check table name spelling
3. Verify using `public` schema
4. Check Supabase types are up to date

---

### Data Not Appearing

**Cause:** Various - RLS, query issues, or data not existing.

**Solutions:**
1. Check RLS policies aren't too restrictive
2. Verify query filters are correct
3. Check data exists in database
4. Look for console errors
5. Check React Query is fetching

**Note:** Supabase has a 1000 row default limit. If missing data, check if you're hitting this limit.

---

### Foreign Key Violation

**Cause:** Trying to reference non-existent record.

**Solutions:**
1. Ensure parent record exists first
2. Check UUID is correct
3. Verify cascade delete settings

---

## Deployment Issues

### GitHub Pages 404 on Routes

**Cause:** SPA routing not configured for static hosting.

**Solutions:**
1. Ensure `404.html` exists in `public/`
2. Verify `vite.config.ts` has correct `base` path
3. Check router uses `basename` prop
4. Confirm GitHub Pages source is set correctly

---

### Assets Not Loading on GitHub Pages

**Cause:** Incorrect base path for assets.

**Solutions:**
1. Check `vite.config.ts` base path: `base: '/ot-csir-training/'`
2. Use relative imports for assets
3. Verify assets are in correct directories

---

### Environment Variables Not Working

**Cause:** Variables not set or wrong prefix.

**Solutions:**
1. Frontend vars must start with `VITE_`
2. Set vars in GitHub Secrets for Actions
3. Rebuild after changing vars
4. Check `.env` file is not committed

---

### Build Failing

**Cause:** TypeScript or build errors.

**Solutions:**
1. Run `npm run build` locally first
2. Check TypeScript errors: `npx tsc --noEmit`
3. Verify all imports exist
4. Check for circular dependencies

---

## Edge Function Issues

### "FunctionsFetchError"

**Cause:** Network or CORS issue.

**Solutions:**
1. Verify function is deployed
2. Check CORS headers in function
3. Verify Supabase URL is correct
4. Check function name matches

---

### Function Returns 500

**Cause:** Runtime error in function.

**Solutions:**
1. Check function logs in backend
2. Verify required secrets are set
3. Check request body format
4. Look for syntax errors

**Logging:**
```typescript
console.log('Debug:', JSON.stringify(data));
```

---

### CORS Errors

**Cause:** Missing or incorrect CORS headers.

**Solutions:**
Ensure function has:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

if (req.method === 'OPTIONS') {
  return new Response(null, { headers: corsHeaders });
}

// Include in response
return new Response(JSON.stringify(data), {
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});
```

---

### "Missing secret"

**Cause:** Required environment variable not set.

**Solutions:**
1. Add secret in Lovable Cloud / Supabase dashboard
2. Verify secret name matches code
3. Redeploy function after adding secret

---

## UI/UX Issues

### Components Not Rendering

**Cause:** Various React/rendering issues.

**Solutions:**
1. Check console for errors
2. Verify component is imported correctly
3. Check conditional rendering logic
4. Verify data is loaded before render

---

### Styling Issues

**Cause:** Tailwind or CSS conflicts.

**Solutions:**
1. Check class names are correct
2. Verify Tailwind config includes all paths
3. Check for conflicting styles
4. Inspect element in DevTools

---

### Dark Mode Not Working

**Cause:** Theme not applying correctly.

**Solutions:**
1. Verify `ThemeProvider` wraps app
2. Check CSS variables are defined
3. Verify dark mode classes exist
4. Check system preference detection

---

### Toast Notifications Not Showing

**Cause:** Toaster not mounted or wrong hook.

**Solutions:**
1. Ensure `<Toaster />` is in root layout
2. Use `useToast` hook correctly
3. Check toast is being called

---

## Performance Issues

### Slow Initial Load

**Cause:** Large bundle size or slow data fetch.

**Solutions:**
1. Implement code splitting
2. Add loading skeletons
3. Optimize images
4. Check network requests in DevTools

---

### Frequent Re-renders

**Cause:** Inefficient React patterns.

**Solutions:**
1. Use React DevTools Profiler
2. Memoize expensive computations
3. Use `useCallback` for callbacks
4. Check dependency arrays

---

### Slow Queries

**Cause:** Unoptimized database queries.

**Solutions:**
1. Add database indexes
2. Limit query results
3. Use select to fetch only needed columns
4. Check for N+1 queries

---

## Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "Network request failed" | No internet or CORS | Check connectivity and CORS |
| "JWT expired" | Token needs refresh | Re-authenticate user |
| "undefined is not an object" | Null reference | Add null checks |
| "Maximum update depth" | Infinite re-render loop | Check useEffect dependencies |
| "Hydration mismatch" | SSR/client mismatch | N/A (CSR only app) |

---

## Getting More Help

### Collecting Debug Information

When reporting issues, include:
1. Browser console errors (screenshot or copy)
2. Network tab failures
3. Steps to reproduce
4. Expected vs actual behavior
5. Browser and OS version

### Useful Browser DevTools

- **Console**: JavaScript errors
- **Network**: API requests and responses
- **Application**: Storage, cookies, cache
- **React DevTools**: Component tree and state
- **Performance**: Rendering and load times

### Log Locations

- Frontend: Browser console
- Edge Functions: Lovable Cloud backend / Supabase dashboard
- Database: Supabase logs (postgres_logs)
