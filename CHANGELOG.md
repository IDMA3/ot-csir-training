# Changelog

All notable changes to the SCL OT CSIR Training Platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Email domain field (`domain`) for organizations enabling automatic user assignment on signup
- Domain column displayed in Organizations management table for quick reference
- Domain included in Organization Reports tables and CSV exports
- Automatic organization assignment on signup via organization name or email domain matching
- Comprehensive documentation suite
  - INDEX.md - Documentation navigation hub
  - EDGE_FUNCTIONS.md - Backend function documentation
  - SECURITY.md - Security model documentation
  - CONTRIBUTING.md - Developer guide
  - USER_GUIDE.md - End-user documentation
  - HOOKS.md - Custom hooks reference
  - TESTING.md - Testing strategies
  - TROUBLESHOOTING.md - Common issues guide
  - CHANGELOG.md - Version history

### Changed
- Updated `handle_new_user` database function to support organization auto-assignment by email domain
- Organization Reports now fetch and display the domain field in all tables
- CSV exports include organization domain information
- Updated README.md with project-specific information
- Updated DATABASE.md with complete schema documentation
- Updated DEPLOYMENT.md with GitHub Pages configuration

---

## [1.0.0] - 2025-01-09

### Added
- Initial release of SCL OT CSIR Training Platform
- Multi-tenant organization support
- Role-based access control (Learner, Org Admin, Super Admin)
- Course delivery with sequential modules
- Quiz and exam assessment system
- Certificate generation with verification
- Admin dashboard with reporting
- User invitation system (single and bulk)
- Recertification scheduling
- Edge functions for user management

### Security
- Row-Level Security (RLS) on all tables
- XSS protection with DOMPurify
- Secure user deletion with cascading
- Organization-scoped data isolation

---

## Version History Template

When adding new versions, use this format:

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- New features

### Changed
- Changes to existing functionality

### Deprecated
- Features that will be removed

### Removed
- Features that were removed

### Fixed
- Bug fixes

### Security
- Security improvements
```

---

## Versioning Guidelines

- **MAJOR** (X.0.0): Breaking changes, major redesigns
- **MINOR** (0.X.0): New features, backward compatible
- **PATCH** (0.0.X): Bug fixes, minor improvements
