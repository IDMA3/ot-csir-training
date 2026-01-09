# Documentation Index

Welcome to the SCL OT CSIR Training Platform documentation. This index provides navigation to all available documentation.

## Quick Links

- [Quick Start Guide](#quick-start)
- [For Developers](#developer-documentation)
- [For Administrators](#administrator-documentation)
- [For End Users](#end-user-documentation)

---

## Quick Start

New to the project? Start here:

1. **[README](../README.md)** - Project overview and setup
2. **[Contributing Guide](CONTRIBUTING.md)** - Local development setup
3. **[Architecture Overview](ARCHITECTURE.md)** - System design

---

## Developer Documentation

Technical documentation for developers working on the platform.

### Core Documentation

| Document | Description |
|----------|-------------|
| [Architecture](ARCHITECTURE.md) | Component architecture, data flow, state management |
| [Database Schema](DATABASE.md) | Complete database schema with RLS policies |
| [API Reference](API_REFERENCE.md) | Supabase client API usage patterns |
| [Edge Functions](EDGE_FUNCTIONS.md) | Backend function endpoints and schemas |
| [Hooks Reference](HOOKS.md) | Custom React hooks documentation |

### Development Guides

| Document | Description |
|----------|-------------|
| [Contributing](CONTRIBUTING.md) | Development setup, coding standards, PR process |
| [Testing](TESTING.md) | Testing strategies and patterns |
| [Troubleshooting](TROUBLESHOOTING.md) | Common issues and solutions |

### Operations

| Document | Description |
|----------|-------------|
| [Deployment](DEPLOYMENT.md) | Deployment guides for Lovable and GitHub Pages |
| [Security](SECURITY.md) | Security model, RLS, and best practices |
| [PID](PID.md) | Project Information Document |

---

## Administrator Documentation

Documentation for platform administrators.

| Document | Description |
|----------|-------------|
| [User Guide - Admin Section](USER_GUIDE.md#organization-administrators) | Org admin features |
| [User Guide - Super Admin Section](USER_GUIDE.md#super-administrators) | Super admin features |
| [Security](SECURITY.md) | Understanding permissions and access control |

---

## End User Documentation

| Document | Description |
|----------|-------------|
| [User Guide](USER_GUIDE.md) | Complete end-user documentation |
| [User Guide - Learners](USER_GUIDE.md#learners) | Taking courses and earning certificates |

---

## Document Descriptions

### [ARCHITECTURE.md](ARCHITECTURE.md)
Comprehensive technical architecture including:
- Directory structure
- Component hierarchy
- Data flow patterns
- State management
- Routing configuration
- Design system tokens

### [DATABASE.md](DATABASE.md)
Complete database documentation:
- All 14 tables with column definitions
- Foreign key relationships
- Row-Level Security policies
- Database functions and triggers
- Entity relationship diagram
- Multi-tenancy model

### [API_REFERENCE.md](API_REFERENCE.md)
Supabase client usage patterns:
- Authentication methods
- Data querying
- Mutations
- Error handling

### [EDGE_FUNCTIONS.md](EDGE_FUNCTIONS.md)
Backend edge functions:
- `send-invitation` - Email invitation delivery
- `accept-invitation` - Invitation processing
- `delete-user` - User deletion with cascading

### [HOOKS.md](HOOKS.md)
Custom React hooks reference:
- Authentication hooks
- Data fetching hooks
- Admin permission hooks
- Utility hooks

### [SECURITY.md](SECURITY.md)
Security model documentation:
- Authentication flow
- Role-based authorization
- Row-Level Security overview
- Multi-tenancy isolation
- Data protection

### [USER_GUIDE.md](USER_GUIDE.md)
End-user documentation for:
- Learners
- Organization Administrators
- Super Administrators

### [DEPLOYMENT.md](DEPLOYMENT.md)
Deployment guides:
- Lovable.dev deployment
- GitHub Pages configuration
- Environment setup
- Troubleshooting

### [CONTRIBUTING.md](CONTRIBUTING.md)
Developer onboarding:
- Local setup
- Code standards
- PR process
- Testing requirements

### [TESTING.md](TESTING.md)
Testing documentation:
- Testing strategy
- Unit testing
- Component testing
- E2E testing

### [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
Problem-solving guide:
- Common errors
- Debugging tips
- Known issues

### [PID.md](PID.md)
Project Information Document:
- Project scope
- Requirements
- Technical specifications

---

## Changelog

See [CHANGELOG.md](../CHANGELOG.md) for version history and release notes.

---

## Contributing to Documentation

When updating documentation:

1. Keep language clear and concise
2. Use tables for structured data
3. Include code examples where helpful
4. Update this index when adding new documents
5. Maintain consistent formatting
