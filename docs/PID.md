# Project Information Document (PID)

## Project Overview

| Field | Value |
|-------|-------|
| **Project Name** | SCL OT CSIR Training |
| **Type** | Web-based Micro-Training Application |
| **Duration** | ~15 minutes |
| **Framework** | React + TypeScript + Vite |
| **Backend** | Lovable Cloud (Supabase) |
| **Styling** | Tailwind CSS + shadcn/ui |

---

## Purpose

The SCL OT CSIR Training application is a self-directed micro-training platform based on the **Seattle City Light Operational Technology Cyber Security Incident Response Plan**. It educates users on:

- Roles and responsibilities during cyber incidents
- Process phases of incident response
- Key definitions and terminology
- Reporting timelines and procedures
- Evidence handling protocols
- Communication principles

> **Security Note:** The application strictly avoids exposing internal-sensitive contact details or confidential procedures.

---

## Target Audience

- Seattle City Light employees
- OT (Operational Technology) personnel
- Cyber security team members
- Anyone requiring CSIR training certification

---

## Key Features

### 1. User Authentication
- Email/password authentication
- Auto-confirm email signups
- Role-based access (Learner/Admin)
- Protected routes

### 2. Course Delivery
- Sequential module progression
- HTML-based lesson content
- Multiple-choice questions with rationale
- Progress tracking and persistence

### 3. Assessment System
- Module-level knowledge checks (100% required)
- Final exam (80% pass threshold)
- Attempt history tracking
- Immediate feedback with explanations

### 4. Certificate System
- Automatic certificate generation
- Unique certificate IDs
- Public verification page
- Completion date tracking

### 5. Admin Dashboard
- Learner progress reports
- Filtering by name/organization/date
- CSV export functionality
- User role management
- Detailed learner views

---

## Business Rules

### Progression Model
1. Modules unlock sequentially (Module N requires N-1 completion)
2. Non-exam modules: Must answer all questions correctly
3. Exam module: Requires ≥80% score to pass
4. Certificate issued upon course completion

### User Roles
| Role | Permissions |
|------|-------------|
| Learner | Access course, view own progress, earn certificate |
| Admin | All learner permissions + view all users, manage roles, export data |

---

## Technical Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React 18 | UI framework |
| TypeScript | Type safety |
| Vite | Build tool & dev server |
| Tailwind CSS | Utility-first styling |
| shadcn/ui | Component library |
| React Query | Server state management |
| React Router | Client-side routing |
| Lucide React | Icon library |
| DOMPurify | XSS protection |

### Backend (Lovable Cloud)
| Service | Purpose |
|---------|---------|
| PostgreSQL | Database |
| Row-Level Security | Data access control |
| Auth | User authentication |
| Realtime | Live updates (available) |

---

## Application Routes

| Route | Component | Access | Description |
|-------|-----------|--------|-------------|
| `/` | Index | Public | Landing page |
| `/auth` | Auth | Public | Login/Signup |
| `/dashboard` | Dashboard | Protected | Course content |
| `/certificate` | Certificate | Protected | View certificate |
| `/verify` | Verify | Public | Certificate verification |
| `/admin` | Admin | Admin Only | Admin dashboard |
| `*` | NotFound | Public | 404 page |

---

## Environment Configuration

### Required Variables
```env
VITE_SUPABASE_URL=<auto-configured>
VITE_SUPABASE_PUBLISHABLE_KEY=<auto-configured>
VITE_SUPABASE_PROJECT_ID=<auto-configured>
```

### Deployment Environments

| Platform | Configuration | Notes |
|----------|--------------|-------|
| **Lovable.dev** | Auto-configured | Click Publish to deploy |
| **GitHub Pages** | GitHub Secrets required | See [DEPLOYMENT.md](./DEPLOYMENT.md) |
| **Self-hosted** | Manual `.env` file | Standard Vite deployment |

### GitHub Pages Setup

The application is pre-configured for GitHub Pages deployment at `/ot-csir-training/`:

1. **Secrets Required**: `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` as repository secrets
2. **Pages Source**: Must be set to "GitHub Actions" (not branch-based)
3. **Auth URLs**: Add `https://[username].github.io/ot-csir-training/` to Supabase redirect URLs

Key configuration files:
- `.github/workflows/deploy.yml` - GitHub Actions workflow
- `vite.config.ts` - Base path set for subdirectory hosting
- `public/404.html` - SPA routing fallback
- `index.html` - Relative script paths for asset loading

For detailed instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

---

## Security Considerations

1. **XSS Protection**: All HTML content sanitized with DOMPurify
2. **RLS Policies**: Database-level access control
3. **Role Verification**: Server-side role checks
4. **No Sensitive Data**: Internal contacts excluded from content
5. **Audit Trail**: No DELETE permissions, append-only data

---

## Performance Targets

| Metric | Target |
|--------|--------|
| Initial Load | < 3 seconds |
| Page Navigation | < 500ms |
| Quiz Submission | < 1 second |
| Certificate Generation | < 2 seconds |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | Initial | Core training modules |

---

## Stakeholders

| Role | Responsibility |
|------|----------------|
| Product Owner | Training content, requirements |
| Developer | Implementation, maintenance |
| Administrators | User management, reporting |
| Learners | Course completion |

---

## Future Considerations

- PDF certificate generation
- Email notifications
- Multi-course support
- SCORM compliance
- Analytics dashboard
- Mobile app version
