# SCL OT CSIR Training Platform

A web-based micro-training platform for cybersecurity incident response training, built with React, TypeScript, and Supabase.

## Overview

This platform delivers the Seattle City Light Operational Technology Cyber Security Incident Response Plan training through structured modules, assessments, and certifications. It supports multi-tenant organizations with role-based access control.

## Features

- **Course Delivery**: Sequential learning modules with rich HTML content
- **Assessments**: Knowledge check quizzes and final examinations
- **Certificates**: Automatic generation with unique verification codes
- **Multi-Tenancy**: Organization-based user management and course access
- **Admin Dashboard**: Comprehensive reporting and user management
- **Recertification**: Configurable recertification schedules per organization

## Technology Stack

| Category | Technologies |
|----------|-------------|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, shadcn/ui |
| State | TanStack React Query |
| Routing | React Router v6 |
| Backend | Supabase (Auth, Database, Edge Functions) |
| Email | Resend API |

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Git

### Local Development

```bash
# Clone the repository
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:8080`.

### Environment Variables

Create a `.env` file with:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
```

## Documentation

| Document | Description |
|----------|-------------|
| [Documentation Index](docs/INDEX.md) | Navigation hub for all docs |
| [Architecture](docs/ARCHITECTURE.md) | System design and components |
| [Database Schema](docs/DATABASE.md) | Tables, relationships, and RLS |
| [API Reference](docs/API_REFERENCE.md) | Supabase client usage |
| [Edge Functions](docs/EDGE_FUNCTIONS.md) | Backend function documentation |
| [Security](docs/SECURITY.md) | Security model and practices |
| [Deployment](docs/DEPLOYMENT.md) | Deployment guides |
| [User Guide](docs/USER_GUIDE.md) | End-user documentation |
| [Contributing](docs/CONTRIBUTING.md) | Developer guide |
| [Hooks Reference](docs/HOOKS.md) | Custom React hooks |
| [Testing](docs/TESTING.md) | Testing strategies |
| [Troubleshooting](docs/TROUBLESHOOTING.md) | Common issues and solutions |

## Project Structure

```
src/
├── components/         # React components
│   ├── admin/         # Admin dashboard components
│   ├── landing/       # Role-based landing pages
│   └── ui/            # shadcn/ui components
├── hooks/             # Custom React hooks
├── integrations/      # Supabase client and types
├── lib/               # Utility functions
└── pages/             # Route page components

supabase/
└── functions/         # Edge functions
    ├── accept-invitation/
    ├── delete-user/
    └── send-invitation/

docs/                  # Documentation
```

## User Roles

| Role | Description |
|------|-------------|
| **Learner** | Takes courses, completes assessments, earns certificates |
| **Org Admin** | Manages users and reports within their organization |
| **Super Admin** | Full platform access, manages organizations and courses |

## Deployment

### Lovable.dev (Recommended)

Click **Share → Publish** in the Lovable editor.

### GitHub Pages

See [Deployment Guide](docs/DEPLOYMENT.md) for detailed instructions.

## License

Proprietary - Seattle City Light

## Support

For issues and feature requests, please use the project's issue tracker.
