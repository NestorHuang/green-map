<!--
SYNC IMPACT REPORT
==================
Version Change: Template → 1.0.1
Type: MINOR (Added documentation language policy)
Rationale: Formalized language requirements for Green Map South documentation

Modified Principles:
- NEW: Community-First Development
- NEW: Security by Default
- NEW: Mobile-First Design
- NEW: Data Integrity & Trust
- NEW: User Story-Driven Development

Added Sections:
- Core Principles (5 principles)
- Technical Standards
- Development Workflow
- Governance
- Documentation Language Policy (v1.0.1)

Templates Requiring Updates:
✅ plan-template.md - No changes needed (remains English for reference)
✅ spec-template.md - No changes needed (remains English for reference)
✅ tasks-template.md - No changes needed (remains English for reference)
ℹ️ Future generated documents will use Traditional Chinese

Follow-up TODOs:
- Ensure /speckit.* commands generate Traditional Chinese documents
- Keep existing English templates as reference

Date: 2025-12-02
-->

# Green Map South Constitution

## Core Principles

### I. Community-First Development

**Rules:**
- Features MUST serve community needs (Partners, Wilderness Partners, Admins), not arbitrary technical goals
- Community feedback MUST drive product evolution
- Partners MUST be valued as collaborators, not just users
- Wilderness Society members MUST be honored with special recognition (group name + nature name)

**Rationale:**
The platform's success depends on active community participation. By putting community needs first, we ensure sustainable growth and data quality through intrinsic motivation rather than external incentives.

### II. Security by Default

**Rules:**
- All data access MUST be protected by Firestore Security Rules
- All sensitive operations MUST require authentication
- Role-based access control MUST use Firebase Custom Claims
- API keys and secrets MUST NEVER be committed to version control
- Environment variables MUST be used for all sensitive configuration

**Rationale:**
Security is non-negotiable. A single breach can destroy user trust and violate data protection laws. Defense-in-depth with multiple security layers ensures platform integrity.

### III. Mobile-First Design

**Rules:**
- All features MUST be designed for mobile screens first (320px - 768px)
- Desktop layouts MUST be progressive enhancements
- Touch targets MUST be minimum 44x44px
- Core functionality MUST work on 4G networks
- Page load time MUST be under 3 seconds on mobile

**Rationale:**
Users discover green locations while on-the-go. Mobile-first design ensures the platform serves its primary use case effectively and reaches the widest audience.

### IV. Data Integrity & Trust

**Rules:**
- All contributed data MUST undergo admin review before publication
- Error reporting mechanisms MUST be available to authenticated users
- Admin actions MUST be logged and auditable
- Data retention policies MUST comply with privacy regulations

**Rationale:**
Inaccurate data destroys user trust and platform value. Manual review, while not scaling infinitely, ensures quality during growth phase and establishes quality standards.

### V. User Story-Driven Development

**Rules:**
- Every feature MUST start with prioritized user stories (P1, P2, P3...)
- Each user story MUST be independently testable and deliverable
- User stories MUST follow Given-When-Then format for acceptance criteria
- P1 stories MUST be implemented and validated before P2/P3 work begins
- Tasks MUST be organized by user story to enable incremental delivery

**Rationale:**
User story-driven development ensures we build what users actually need, in priority order. Independent testability enables true MVP delivery and reduces risk of building the wrong thing.

## Technical Standards

### Technology Stack (NON-NEGOTIABLE)

**Frontend:**
- React 19 (latest stable)
- Vite 7 (build tool)
- Tailwind CSS 3 (styling)
- Traditional Chinese (zh-TW) as primary language

**Backend:**
- Firebase 12 (serverless platform)
  - Firestore (database)
  - Authentication (OAuth)
  - Storage (file storage)
  - Cloud Functions (serverless compute)

**APIs:**
- Google Maps JavaScript API (map display)
- Google Places API (address autocomplete)
- Google Geocoding API (address → coordinates)

**Rationale:**
Modern, stable technologies with large community support. Serverless architecture minimizes operational overhead and enables focus on feature development.

### Code Quality Standards

**Naming Conventions:**
- PascalCase for React components
- camelCase for functions and variables
- SCREAMING_SNAKE_CASE for constants
- Descriptive names over abbreviations

**File Organization:**
- `/src/components` - Reusable UI components
- `/src/pages` - Route-level components
- `/src/contexts` - Global state management
- `/src/hooks` - Custom React hooks
- `/src/utils` - Pure utility functions

**ESLint Compliance:**
- Zero ESLint errors allowed in commits
- Warnings should be addressed or justified
- Use `eslint-disable` sparingly with comments

### Performance Requirements

**Load Time:**
- First Contentful Paint (FCP) < 1.5s
- Largest Contentful Paint (LCP) < 2.5s
- Time to Interactive (TTI) < 3s
- Lighthouse Performance Score > 90

**Runtime:**
- Button click response < 100ms
- Map operations (zoom, pan) at 60 FPS
- Filter operations < 500ms
- Database queries < 1s

### Security Requirements

**Firestore Security Rules:**
- Deny by default, allow explicitly
- Validate all write data structure and content
- Check user authentication for sensitive operations
- Verify Custom Claims for admin operations

**Input Validation:**
- Client-side validation for immediate feedback
- Server-side validation (Firestore Rules) for security
- Sanitize user inputs to prevent XSS
- Use parameterized queries to prevent injection (N/A with Firestore)

## Development Workflow

### Specification Process

1. **User Request → Spec Creation**
   - Use `/speckit.specify` to create initial spec
   - Define user stories with priorities (P1, P2, P3...)
   - Write acceptance criteria in Given-When-Then format
   - Identify functional requirements (FR-XXX)
   - Define success criteria (SC-XXX)

2. **Spec Review**
   - Verify user stories are independently testable
   - Confirm priorities align with project goals
   - Ensure acceptance criteria are measurable
   - Check for missing edge cases

3. **Planning**
   - Use `/speckit.plan` to create implementation plan
   - Verify constitution compliance
   - Define technical approach
   - Identify dependencies and risks

4. **Task Breakdown**
   - Use `/speckit.tasks` to generate task list
   - Organize tasks by user story
   - Mark parallel-executable tasks with [P]
   - Define foundational phase (blocking prerequisites)

### Implementation Process

1. **Foundation First**
   - Complete all foundational tasks before any user story work
   - Foundational tasks: auth, database schema, base models, error handling

2. **Incremental User Story Delivery**
   - Implement user stories in priority order (P1 → P2 → P3)
   - Each user story must be independently completable
   - Validate story completion before moving to next priority
   - Deploy P1 as MVP before continuing to P2

3. **Testing Strategy**
   - Write tests first for critical paths (if TDD requested)
   - Ensure tests fail before implementation
   - Manual testing for each user story completion
   - Cross-browser testing before deployment

4. **Code Review Standards**
   - Review for constitution compliance
   - Check security rules coverage
   - Verify mobile responsiveness
   - Confirm error handling
   - Validate accessibility basics

### Admin Review SLA

**Pending Location Review:**
- Target: Within 48 hours of submission
- Process: Verify accuracy, check photos, validate tags
- Decision: Approve (→ locations) or Reject (delete)

**Error Report Handling:**
- Target: Within 7 days of submission
- Process: Investigate issue, update location data
- Resolution: Mark as resolved with timestamp

### Deployment Process

**Pre-Deployment Checklist:**
- [ ] ESLint passes with zero errors
- [ ] Build succeeds without warnings
- [ ] Manual testing completed
- [ ] Firestore Security Rules validated
- [ ] Environment variables configured

**Deployment Steps:**
1. Build production bundle: `npm run build`
2. Deploy to Firebase Hosting: `firebase deploy`
3. Smoke test production URL
4. Monitor Firebase Console for errors
5. Communicate changes to admin team (if user-facing)

## Governance

### Constitution Authority

This constitution is the authoritative reference for all development decisions in the Green Map South project. In case of conflict between this constitution and other documentation, this constitution takes precedence.

### Compliance Verification

**Developer Responsibilities:**
- Review constitution before starting new features
- Verify compliance during implementation
- Justify any deviations in code comments or PRs

**Code Review Responsibilities:**
- Check constitution compliance
- Question unjustified complexity
- Ensure security standards are met

### Amendment Process

**Proposing Amendments:**
1. Submit proposal via GitHub Issue or PR
2. Include rationale and impact analysis
3. Tag with "constitution-amendment"
4. Allow minimum 7 days for community discussion

**Approval:**
- Super Admin final approval required
- Document decision rationale
- Update version number following semantic versioning

**Version Numbering:**
- MAJOR: Backward incompatible principle removals or redefinitions
- MINOR: New principles or materially expanded guidance
- PATCH: Clarifications, wording fixes, non-semantic refinements

**Emergency Amendments:**
For critical security or legal issues, Super Admin can approve immediately with retroactive community notification.

### Complexity Justification

Any deviation from the following simplicity guidelines MUST be justified in code comments or documentation:

- Adding new external dependencies
- Introducing new architectural patterns
- Creating abstractions with <3 use cases
- Implementing features not driven by user stories

Use the Complexity Tracking table in implementation plans to document justified deviations.

### Runtime Development Guidance

For detailed implementation guidance during active development, refer to:
- `.github/prompts/speckit.*.prompt.md` - Slash command workflows
- `.specify/templates/*.md` - Document templates (English - for reference only)
- `documents/CONSTITUTION.md` - Detailed project philosophy and values (Traditional Chinese)

### Documentation Language Policy

**Constitution:** English (this file remains in English for universal accessibility)

**All Other Documentation:**
- New documents MUST be created in Traditional Chinese (zh-TW)
- Existing documents remain unchanged unless explicitly updated
- Specifications (`/specs/**/*.md`) MUST use Traditional Chinese
- User-facing documentation MUST use Traditional Chinese
- Code comments MAY use English for technical clarity

**Rationale:**
The primary development team and user base are Traditional Chinese speakers. Using zh-TW for project documentation improves comprehension and reduces cognitive load while maintaining the constitution in English for broader technical accessibility.

**Version**: 1.0.1 | **Ratified**: 2025-12-02 | **Last Amended**: 2025-12-02
