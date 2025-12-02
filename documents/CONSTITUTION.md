# Green Map South - Project Constitution

**Version:** 1.0
**Last Updated:** December 2, 2025
**Status:** Active

---

## Table of Contents

1. [Preamble](#preamble)
2. [Project Vision & Mission](#project-vision--mission)
3. [Core Values](#core-values)
4. [Design Principles](#design-principles)
5. [Technical Philosophy](#technical-philosophy)
6. [Architecture Tenets](#architecture-tenets)
7. [Community Guidelines](#community-guidelines)
8. [Roles & Responsibilities](#roles--responsibilities)
9. [Decision Making Process](#decision-making-process)
10. [Success Criteria](#success-criteria)
11. [Amendment Process](#amendment-process)

---

## Preamble

This Constitution establishes the foundational principles, values, and guidelines for the **Green Map South** project. It serves as the authoritative reference for all development decisions, architectural choices, and community interactions.

The Green Map South platform is a community-driven, map-oriented green lifestyle information sharing platform. We believe that sustainable living should be accessible, visible, and community-powered. This document codifies our commitment to these principles.

---

## Project Vision & Mission

### Vision
**"To make green living in Taiwan visible, accessible, and thriving through community collaboration."**

We envision a future where:
- Every sustainable business and location is discoverable within 30 seconds
- Community members ("Partners") actively contribute to keeping information current
- Green lifestyle choices become the norm, not the exception
- Technology serves as an enabler for environmental stewardship

### Mission
**To build and maintain a comprehensive, community-curated map of green lifestyle locations across Taiwan, starting with the Southern region.**

Our mission is executed through:
1. **Rapid Discovery**: Enable users to find green locations in under 30 seconds
2. **Effortless Contribution**: Allow Partners to submit new locations in under 1 minute
3. **Community Activation**: Foster a self-sustaining data ecosystem through clear contribution mechanisms
4. **Quality Assurance**: Maintain data accuracy through structured review processes

---

## Core Values

### 1. Community First
**Principle**: The community is the heart of our platform.
- **Partners** (contributors) are valued collaborators, not just users
- Features serve community needs, not arbitrary technical goals
- Community feedback drives product evolution
- Wilderness Society members are honored with special recognition

**Implementation**:
- Wilderness Partner System with group names and nature names
- Contributor attribution on all submitted locations
- Simple, mobile-friendly contribution workflows
- Transparent moderation and feedback processes

### 2. Accessibility & Inclusivity
**Principle**: Green lifestyle information should be free and accessible to all.
- No paywalls or premium features for basic functionality
- Mobile-first design for on-the-go discovery
- Traditional Chinese (zh-TW) as primary language
- Simple, intuitive user interfaces requiring minimal instructions

**Implementation**:
- Progressive Web App (PWA) architecture
- GPS-first location detection
- Read-only access without authentication
- Responsive design for all device sizes

### 3. Data Integrity & Trust
**Principle**: Accuracy and reliability are non-negotiable.
- All contributed data undergoes admin review before publication
- Clear error reporting mechanisms for outdated information
- Transparent moderation processes
- Data retention and privacy protection

**Implementation**:
- Pending locations review workflow
- Community error reporting system
- Firestore Security Rules enforcement
- Admin action audit trails

### 4. Openness & Transparency
**Principle**: Development decisions and processes are open and documented.
- Open documentation for all features
- Clear role definitions and permissions
- Transparent admin actions
- Public roadmap and feature discussions

**Implementation**:
- Comprehensive documentation (visitor, partner, admin guides)
- Clear spec-kit documentation for developers
- Admin activity visibility
- Open issue tracking and feature requests

### 5. Sustainability & Long-term Thinking
**Principle**: Build for the long term, not quick wins.
- Scalable architecture supporting future growth
- Maintainable, well-documented codebase
- Cost-effective infrastructure choices
- Environmental consciousness in technical decisions

**Implementation**:
- Firebase serverless architecture (minimal carbon footprint)
- Efficient database queries with proper indexing
- Image optimization and CDN usage
- Code quality standards (ESLint, best practices)

---

## Design Principles

### User Experience Principles

#### 1. Simplicity Over Complexity
- Every feature should be usable without a manual
- Forms should request only essential information
- Navigation should be intuitive and predictable
- Visual hierarchy should guide user attention

#### 2. Mobile-First, Responsive Design
- Design for mobile screens first
- Scale up to desktop, not down to mobile
- Touch-friendly interactive elements
- Fast load times on mobile networks

#### 3. Immediate Feedback
- Loading states for all async operations
- Success/error messages for all actions
- Visual confirmation of state changes
- Progressive disclosure of complex information

#### 4. Graceful Degradation
- Core features work without authentication
- Fallback options when GPS is unavailable
- Clear error messages when operations fail
- Offline-friendly where possible

### Content Principles

#### 1. Precision Over Ambiguity
- Specific tags (e.g., "Fully Vegan" vs "Offers Vegan Options")
- Required photo evidence for submissions
- Clear categorization of locations
- Verified information over unverified listings

#### 2. Freshness Over Completeness
- Recent, accurate data beats exhaustive but outdated data
- Community reporting keeps information current
- Admin review ensures quality
- Regular data validation processes

#### 3. Attribution & Recognition
- Contributors are visible and celebrated
- Wilderness Partners receive special recognition
- Submission history is preserved
- Community impact is measurable

---

## Technical Philosophy

### Code Philosophy

#### 1. Readability & Maintainability
**"Code is read 10x more than it is written."**

- Clear, descriptive naming (PascalCase for components, camelCase for functions)
- Self-documenting code with minimal comments
- Consistent code style enforced by ESLint
- Single Responsibility Principle for components and functions

#### 2. Composition Over Inheritance
- Functional components over class components
- Custom Hooks for logic reuse
- Component composition for UI reuse
- Context API for state sharing

#### 3. Declarative Over Imperative
- React's declarative rendering
- Firebase's declarative security rules
- Tailwind's declarative styling
- Clear data flow from state to UI

#### 4. Convention Over Configuration
- Established folder structure
- Predictable file naming
- Consistent import ordering
- Standard patterns for common tasks

### Technology Choices

#### 1. Modern, Stable Technologies
- React 19 (latest stable)
- Firebase 12 (proven serverless platform)
- Vite 7 (fast, modern build tool)
- Tailwind CSS 3 (utility-first styling)

**Rationale**:
- Large community support
- Extensive documentation
- Long-term viability
- Performance and developer experience

#### 2. Serverless & Managed Services
- Firebase Authentication (managed auth)
- Firestore (managed database)
- Firebase Storage (managed file storage)
- Cloud Functions (serverless compute)

**Rationale**:
- No server maintenance overhead
- Automatic scaling
- Pay-per-use pricing
- Built-in security features

#### 3. Progressive Enhancement
- Core functionality works without JavaScript
- Service Worker for offline capabilities (future)
- PWA features for mobile app-like experience
- Graceful degradation for older browsers

---

## Architecture Tenets

### 1. Security by Default
**"Security is not a feature, it's a requirement."**

- Firestore Security Rules for all data access
- Custom Claims for role-based access control
- Input validation on client and server
- Environment variables for sensitive data
- No sensitive data in version control

### 2. Separation of Concerns
**"Each layer has a single, well-defined purpose."**

- `/components` - Reusable UI components
- `/pages` - Route-level components
- `/contexts` - Global state management
- `/hooks` - Reusable business logic
- `/utils` - Pure utility functions

### 3. Unidirectional Data Flow
**"Data flows down, events flow up."**

- Props for parent-to-child communication
- Callbacks for child-to-parent communication
- Context for cross-cutting concerns
- No circular dependencies

### 4. Fail-Safe Defaults
**"Deny by default, allow explicitly."**

- Firestore rules deny all access by default
- Route guards protect sensitive pages
- Form validation prevents invalid data
- Error boundaries catch runtime errors

### 5. Atomic Operations
**"Operations should succeed completely or fail completely."**

- Firestore batch writes for multi-step operations
- Transaction guarantees for critical updates
- Rollback on partial failures
- Idempotent operations where possible

### 6. Explicit Over Implicit
**"Magic is for wizards, not codebases."**

- Explicit imports (no wildcard imports)
- Explicit return types in functions
- Clear dependency arrays in useEffect
- Obvious naming for side-effectful functions

---

## Community Guidelines

### For All Participants

#### 1. Respectful Communication
- Constructive criticism over personal attacks
- Assume good intent
- Welcome diverse perspectives
- Respond to ideas, not individuals

#### 2. Collaborative Spirit
- Help newcomers learn
- Share knowledge freely
- Credit others' contributions
- Celebrate collective success

#### 3. Quality Over Quantity
- Submit accurate location data
- Review carefully before approving
- Report errors when discovered
- Take time to do things right

### For Partners (Contributors)

#### 1. Submission Guidelines
- Verify location information before submitting
- Upload clear, relevant photos (min 1, max 10)
- Use accurate addresses and GPS coordinates
- Apply appropriate tags honestly

#### 2. Error Reporting
- Report outdated or incorrect information
- Provide specific details in reports
- Suggest corrections when possible
- Be patient with admin response times

### For Administrators

#### 1. Review Standards
- Review pending submissions within 48 hours
- Verify information accuracy
- Apply consistent approval criteria
- Provide feedback for rejections

#### 2. Community Engagement
- Respond to error reports promptly
- Maintain data quality standards
- Update outdated information
- Foster community trust

#### 3. Power & Responsibility
- Admin privileges are a trust, not a right
- Actions should serve the community
- Transparency in decision-making
- Accountability for mistakes

### For Developers

#### 1. Code Quality
- Follow established conventions
- Write self-documenting code
- Test changes before committing
- Review others' code constructively

#### 2. Documentation
- Update docs when changing features
- Comment non-obvious logic
- Maintain README files
- Keep spec-kit current

#### 3. Security Awareness
- Never commit secrets or API keys
- Validate all user inputs
- Follow OWASP best practices
- Report security issues privately

---

## Roles & Responsibilities

### Visitor (Public User)
**Purpose**: Discover green lifestyle locations

**Capabilities**:
- Browse interactive map
- Search locations by address
- Filter by green lifestyle tags
- View location details
- No authentication required

**Responsibilities**:
- Use information respectfully
- Report bugs or issues

### Partner (Authenticated User)
**Purpose**: Contribute to the community map

**Capabilities**:
- All Visitor capabilities
- Submit new locations (subject to admin review)
- Upload photos (max 10 per location)
- Report errors on existing locations
- Manage personal profile

**Responsibilities**:
- Submit accurate information
- Upload relevant photos
- Report errors constructively
- Maintain updated profile

**Special Recognition**: Wilderness Partners
- Optional identification as Wilderness Society member
- Display group name and nature name
- Special contributor attribution

### Administrator (Admin Role)
**Purpose**: Maintain data quality and platform integrity

**Capabilities**:
- All Partner capabilities
- Review and approve/reject pending submissions
- Manage locations (create, edit, delete)
- Manage tags (create, edit, delete)
- Process error reports
- Access admin dashboard

**Responsibilities**:
- Review submissions within 48 hours
- Maintain consistent approval standards
- Keep data accurate and current
- Respond to error reports
- Foster community trust

**Access**: Requires Custom Claim `{role: 'admin'}`

### Super Administrator (Super Admin Role)
**Purpose**: System administration and governance

**Capabilities**:
- All Administrator capabilities
- Manage admin accounts (add, remove)
- Sync Custom Claims
- Access system configuration
- Cannot be deleted

**Responsibilities**:
- Grant admin access responsibly
- Monitor admin activity
- Maintain system security
- Handle escalated issues
- Ensure platform stability

**Access**: Requires Custom Claim `{role: 'superAdmin'}`

---

## Decision Making Process

### Technical Decisions

#### Minor Changes (e.g., bug fixes, style tweaks)
- Developer makes decision
- Review by one other developer (if available)
- Deploy after testing

#### Major Changes (e.g., new features, architecture changes)
1. Document proposal (spec-kit or issue)
2. Review by project maintainers
3. Community feedback period (if user-facing)
4. Consensus or super admin final decision
5. Implementation and testing
6. Deployment with documentation

#### Breaking Changes (e.g., data model changes, API changes)
1. Detailed proposal with migration plan
2. Impact assessment
3. Community notification
4. Phased rollout with rollback plan
5. Post-deployment monitoring

### Content Decisions

#### Tag Management
- Admins can create, edit, delete tags
- Tag deletions require usage check
- Significant tag changes require community discussion

#### Location Approval
- Admins approve/reject based on:
  - Information accuracy
  - Photo relevance
  - Tag appropriateness
  - Duplicate checking
- Consistent criteria applied to all submissions

---

## Success Criteria

### Product Metrics

#### Discovery Performance
- **Target**: Users find relevant locations in under 30 seconds
- **Measure**: Time from map load to location detail view
- **Method**: User analytics and feedback

#### Contribution Performance
- **Target**: Partners submit locations in under 1 minute
- **Measure**: Time from form start to successful submission
- **Method**: Form analytics

#### Data Quality
- **Target**: 95%+ location accuracy
- **Measure**: Error reports per location, admin corrections
- **Method**: Error report tracking

#### Community Engagement
- **Target**: Monthly active Partners contribute regularly
- **Measure**: Submission frequency, Partner retention
- **Method**: User activity analytics

### Technical Metrics

#### Performance
- **Target**: Page load under 3 seconds on 4G
- **Measure**: Lighthouse performance score >90
- **Method**: Automated testing

#### Availability
- **Target**: 99.9% uptime
- **Measure**: Firebase Hosting uptime
- **Method**: Firebase monitoring

#### Security
- **Target**: Zero data breaches
- **Measure**: Security audit results
- **Method**: Regular security reviews

### Community Metrics

#### Contributor Satisfaction
- **Target**: 80%+ Partner satisfaction
- **Measure**: Surveys, retention rate
- **Method**: Periodic surveys

#### Admin Efficiency
- **Target**: Submissions reviewed within 48 hours
- **Measure**: Average review time
- **Method**: Admin dashboard tracking

---

## Amendment Process

### Proposing Amendments

1. **Proposal Submission**
   - Submit issue or PR with proposed changes
   - Include rationale and impact analysis
   - Tag with "constitution-amendment"

2. **Discussion Period**
   - Minimum 7 days for community feedback
   - Address questions and concerns
   - Revise proposal as needed

3. **Approval**
   - Super Admin final approval required
   - Document decision rationale
   - Update version number

4. **Implementation**
   - Update documentation
   - Communicate changes to community
   - Update training materials if needed

### Emergency Amendments

For critical security or legal issues:
- Super Admin can approve immediately
- Retroactive community notification
- Ratification in next regular process

---

## Conclusion

This Constitution is a living document that evolves with the Green Map South project. It reflects our commitment to community-driven development, technical excellence, and environmental stewardship.

All contributors, from casual users to core developers, are stewards of these principles. By adhering to this Constitution, we ensure the platform remains true to its mission: making green living visible, accessible, and thriving.

**Signed**: Green Map South Development Team
**Date**: December 2, 2025

---

## Appendix: Key Terms

- **Partner**: Authenticated user who contributes locations
- **Wilderness Partner**: Partner affiliated with Wilderness Society
- **Admin**: User with moderation and management privileges
- **Super Admin**: User with system administration privileges
- **Custom Claims**: Firebase Authentication metadata for roles
- **Green Lifestyle Tags**: Categorization system for locations (vegan, eco-friendly, etc.)
- **Pending Locations**: Submissions awaiting admin review
- **spec-kit**: Development specification documentation

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-02 | Development Team | Initial constitution |

---

**End of Constitution**
