# ISOTOPES Recovery Ledger

This file is the durable handoff record for ongoing SIH26044 recovery work. Update it whenever code, configuration, tests, or implementation status changes so work can resume safely after an interrupted agent session.

## Authoritative Objective

Build ISOTOPES as one connected, database-driven user journey:

`register/login -> persistent profile -> career goal and skills -> relevant assessment -> backend scoring -> persistent results -> skill analysis -> personalized next steps`

The backend and MongoDB are the source of truth. Do not use hardcoded user IDs, expose correct answers, invent scores, infer skills from a degree, or use browser storage as the primary database.

## Verified Baseline — 2026-08-30

- Git branch: `main`, synchronized with `origin/main` at `26806ea` when recovery began.
- Worktree: clean before recovery documentation was added.
- Stack: Node.js/Express/Mongoose backend and HTML/CSS/vanilla JavaScript frontend.
- Existing authentication uses bcrypt password hashing, JWTs, and role authorization.
- Existing newer student profile persistence and application ownership tests pass.
- Full backend suite result before recovery: **47 passed, 81 failed, 128 total; 5 suites passed, 6 failed**.
- Failures include stale test/API contracts, invalid opportunity fixtures missing `companyId`, an assessment named-export mismatch, and cascading workflow failures.
- Existing documentation conflicts: some files claim completion while others describe unfinished integration. `CURRENT_TASK.md` also ends inside an incomplete planning block.

## Recovery Rules

1. Inspect and stabilize database/backend behavior before visual frontend work.
2. Reuse compatible existing models and routes; avoid unnecessary duplicate collections or endpoints.
3. Every implementation change must be recorded below with files and tests.
4. Never mark a requirement complete solely because documentation claims it is complete.
5. Preserve unrelated user changes and never commit secrets or `.env` files.

## Active Task

**Real Company Requirement & Target Company Engine — Phase 1 proof completed**

One genuine structured job source now works end-to-end through normalization, MongoDB persistence, deduplication, source-attributed APIs, and explainable student comparison. The next phase is employer-opportunity integration, target-company persistence, requirement aggregation, activity tracking, and frontend delivery.

## Requirement Checklist

- [x] Initial repository and documentation audit
- [x] Baseline full test run captured
- [x] Database model/API contract audit completed
- [ ] Profile, education, career goal, and skills persistence verified
- [x] Curated database-backed MCQ question bank implemented
- [x] Assessment sessions implemented with ownership and status
- [x] Questions returned without correct answers
- [x] Backend scoring and per-skill/topic results implemented
- [x] Assessment history and result persistence implemented
- [x] Skill evidence, analysis, and personalized recommendations implemented
- [ ] Frontend assessment flow connected to new APIs
- [ ] Dashboard uses persisted results and recommendations
- [ ] User A/B/C isolation and empty-state journeys verified
- [ ] Full test suite reconciled and passing
- [ ] Conflicting project documentation corrected

## Change Log

### 2026-08-30 — Sprint 1 Career Roadmap foundation

- Added one `CareerRoadmap` model keyed uniquely to Student, with target context and persisted task states `NOT_STARTED`, `IN_PROGRESS`, and `COMPLETED`.
- Added a deterministic builder using the selected CareerRole, saved skill evidence, optional target company, and genuine stored company postings.
- Tasks retain their source and supporting evidence text; no generic AI roadmap or fake target-company requirement is generated.
- Routes, tests, and UI remain pending.
- Added authenticated roadmap generation/reload, target-date settings, and owned task-progress endpoints.
- Regeneration merges statuses by stable task key, preserving student-controlled completion rather than resetting progress.
- Added gap-derived generation, progress reload, Student A/B isolation, empty-goal, and target-date validation tests. Execution and UI remain pending.
- Initial run passed 17/18; the single failure was a test typo expecting singular `rest api` while the deterministic normalized key correctly retained `rest apis`. The test expectation was corrected without changing application behavior.
- Final verification passed: **18 tests passed, 0 failed** across roadmap, profile, assessment, and Skill Passport suites.
- Added the protected Career Roadmap page with loading/empty/error/success states, optional target-date persistence, source/evidence explanations, and live task-status controls.
- Added navigation only after the workflow and persistence tests passed. Static and live verification remain pending.
- Static inspection found the authentication list included the page but the shell-rendering list initially did not; corrected the shell list before live testing.

### 2026-08-30 — Sprint 1 structured explanations

- Added a shared explanation reason builder with controlled sources and `{ source, evidence, effect }` output.
- Job comparisons, target-company/role boosts, hackathon recommendations, and skill-analysis recommendations now expose structured reasons without changing scores or removing legacy explanation fields.
- Added reusable “Why am I seeing this?” disclosures to Jobs for Me and Hackathons using the structured reason data.
- Preserved the legacy job `reasons` string array and added `structuredReasons` alongside it for backward compatibility.
- Verification passed: **22 tests passed, 0 failed** across jobs, hackathons, assessments, Skill Passport, and hackathon matcher suites. Backend/frontend syntax and patch-integrity checks passed.
- Restarted the live backend. Verified legacy Goodlord job reason remains a string while its structured counterpart reports `TARGET_COMPANY`; job comparison reports `PROFILE`, and hackathon reasoning reports `HACKATHON_SOURCE`.
- Verified `jobs-for-me.html` and `hackathons.html` return HTTP 200 with the new disclosure markup.
- Structured explanation slice is complete. Next: implement a persisted Career Roadmap derived from actual target-role/company gaps with user-controlled task progress.

### 2026-08-30 — Sprint 1 Skill Passport backend

- Added authenticated `GET /api/students/me/skill-passport`, reusing Student, projects, certifications, skill evidence, and AssessmentResult without introducing a duplicate skill model.
- The passport separates self-declared level, assessment attempts/latest/best score, confirmed project tags, exact-name certification evidence, internship evidence, and last evidence date.
- External-platform and employer-challenge evidence explicitly return zero/unavailable; sharing remains disabled until a consent-safe workflow exists.
- Added Student A/B isolation, empty-student, explicit-evidence, and reload-persistence tests. Execution and UI integration remain pending.
- Verification passed: **15 tests passed, 0 failed** across Skill Passport, assessment-session, and profile-persistence suites.
- Extended the existing Skill Twin page into the Skill Passport UI using the new endpoint while preserving all existing element IDs. It shows self-declared level, latest assessment score/attempts, explicit project/certification/internship counts, last evidence date, and unavailable external/challenge evidence without fake verification claims.
- Static JavaScript and patch-integrity checks passed. Restarted the live backend with the passport endpoint.
- Live persistence journey passed: registered a student, saved Java/Intermediate, loaded the authenticated passport, confirmed sharing is disabled, reloaded the passport with the same saved skill, and verified `skill-display.html` returns HTTP 200.
- Skill Passport Sprint 1 slice is complete. Next: consolidate job, hackathon, and skill recommendations into a shared structured explanation format without changing matching algorithms.

### 2026-08-30 — UI/UX redesign audit and shared shell

- Completed the mandatory read-only audit of 13 frontend pages, shared CSS/JavaScript, API hooks, forms, dynamic containers, Bootstrap components, navigation, responsive behavior, and JavaScript-dependent selectors.
- Added a restrained professional design-token system and a reusable authenticated sidebar/top-header shell generated by shared JavaScript.
- The shell uses only existing destinations, marks the current page, collapses off-canvas below 992px, preserves every page-specific ID/form/modal/API hook, and leaves public landing/login pages unchanged.
- Page-by-page redesign and functional verification remain pending.

### 2026-08-30 — Company engine Phase 2 persistence

- Added persistent student target-company goals with normalized company name and target role.
- Added ownership-isolated `JobActivity` records for saved/viewed and explicitly self-reported application outcomes.
- Added an employer-opportunity adapter that mirrors authenticated ISOTOPES opportunities into the normalized job analytics layer while retaining `opportunityId` provenance and stronger `employer-provided` source classification.
- API wiring and tests remain pending.
- Employer opportunity create/update/close now synchronizes the corresponding normalized job record and active state.
- Added authenticated target-company goal GET/PUT/DELETE routes, explainable personalized job recommendations, traceable company/role requirement aggregation, and ownership-isolated activity updates.
- Focused tests and frontend remain pending.
- Added focused coverage for target-company persistence and user isolation, target-aware recommendations, employer opportunity provenance, cited company aggregation, and private self-reported job activity.
- Test execution and frontend remain pending.
- New Phase 2 backend tests pass **7/7** and profile persistence tests pass **8/8**. The separately run legacy opportunity suite still fails in setup because its fixtures omit the already-required `companyId`; this pre-existing drift is unchanged.
- Added protected `Jobs for Me` and `Company Insights` pages with real recommendations, explicit-skill comparison, source attribution/verification links, saved activity, persistent target-company goals, cited posting evidence, and truthful empty states.
- Added dashboard navigation and protected-page registration. Static checks and live restart/browser verification remain pending.
- Final focused verification passed: `npm.cmd test -- --runInBand __tests__/api/jobs.api.test.js __tests__/api/profilePersistence.api.test.js` — **15 passed, 0 failed; 2 suites passed**. Frontend/backend JavaScript syntax checks and `git diff --check` passed.
- The first sandboxed rerun could not access the MongoDB memory-server binary; the identical permitted rerun passed and no code change was made in response to the environment-only failure.
- Restarted the backend with Phase 2 loaded. Live HTTP journey passed: saved `Goodlord / Service Improvement Executive` as a target goal, loaded 50 recommendations, ranked the matching real Goodlord posting, persisted `saved` activity, and returned one identifiable company/role posting with two cited requirements.
- `jobs-for-me.html` and `company-insights.html` both returned HTTP 200 from the running frontend.
- Visual in-app browser verification could not run because no in-app or browser-extension session was available; no alternate browser automation surface was substituted. HTTP, syntax, API, and regression verification all passed.

### 2026-08-30 — Real company requirement engine proof foundation

- Added normalized `JobPosting` and `JobSyncRun` models without changing the existing employer `Opportunity` contract.
- Added a source-isolated Arbeitnow provider using its documented public JSON API, a conservative normalizer/extractor, deduplicating upsert service, and deterministic student-to-job comparison.
- Every extracted skill retains the source sentence or provider tag that supports it; raw source text and source/application URLs are preserved.
- India coverage is not claimed from Arbeitnow. The provider is the external proof source; employer-provided ISOTOPES opportunities and a future credentialed India-capable provider remain separate follow-up work.
- Added public paginated/filterable job listing and detail routes, authenticated student comparison, and protected institution synchronization.
- Added focused API tests for normalization, source traceability, repeat-sync deduplication, profile comparison, evidence reporting, and safe provider failure.
- Initial focused run correctly showed that client profile writes cannot manufacture skill evidence; the comparison test now creates trusted persisted evidence directly, without weakening that security boundary.
- Focused verification passed: `npm.cmd test -- --runInBand __tests__/api/jobs.api.test.js __tests__/api/profilePersistence.api.test.js` — **12 passed, 0 failed; 2 suites passed**. JavaScript syntax and `git diff --check` also passed.
- Live provider contract verification passed: Arbeitnow returned **175 records**. The first normalized record was `(Senior) Key Account Manager (m/w/d)` at `everdrop GmbH`, located in München, with a source posting timestamp and traceable Arbeitnow URL; its observed provider tag was retained as a requirement.
- Added `npm run sync:jobs` as a resumable operator command.
- First live sync: **175 fetched, 175 inserted, 0 updated, 0 skipped, 0 errors**.
- Mandatory repeat sync: **175 fetched, 0 inserted, 175 updated, 0 skipped, 0 errors**, proving idempotent updates rather than duplication.
- Restarted the backend and verified `/api/health` and `/api/jobs`; the public jobs API reported 175 active database records.
- Live authenticated comparison passed using the real `Service Improvement Executive` posting from `Goodlord`, attributed to Arbeitnow with its traceable source URL. A newly persisted B.Tech/CSE student profile matched both observed source skills; the API returned 2 matched, 0 missing, 100%, and `not-specified-by-source` eligibility because that posting did not explicitly state education/experience requirements.
- Phase 1 proof is complete. No company dashboard or target-company claim was created from static `CareerRole` seed data.

### 2026-08-30 — Hackathon participation tracker backend

- Added a dedicated `HackathonParticipation` model, separate from discovery bookmarks and self-reported registration activity.
- Fields: authenticated student owner, optional discovered-hackathon reference, hackathon name, participation date, role, project name, normalized technology list, outcome/achievement, and timestamps.
- Added authenticated `GET`, `POST`, `PUT`, and `DELETE /api/hackathon-participations` routes with ownership isolation, input length limits, required-field validation, duplicate technology removal, and future-date rejection.
- Registered the new API in `backend/server.js`.
- Tests and frontend integration remain pending.

### 2026-08-30 — Participation tracker API tests added

- Added API regression coverage for create/list/count, technology deduplication, Student A/B isolation, owned update/delete, missing fields, future dates, and unauthenticated writes.
- Test execution remains pending.

### 2026-08-30 — Reactive participation tracker frontend

- Added frontend API clients to fetch, create, update, and delete authenticated hackathon participation records.
- Extended `frontend/hackathons.html` with a tracker summary card, dynamic `Total Hackathons Attended` count, collapsible Add Hackathon form, and participation timeline/grid.
- Added modular `frontend/js/hackathon-tracker.js`. After a successful database save, it prepends the new record and recalculates the counter immediately without a page reload; delete updates both list and counter the same way.
- Added loading, empty, error, saving, success, validation, and confirmation states.
- Added minimal participation-card styling consistent with the existing design.
- Static verification and live backend restart remain pending.

### 2026-08-30 — Participation tracker verified live

- Static JavaScript checks and `git diff --check` passed.
- Corrected regression run from the backend directory: `npm.cmd test -- --runInBand __tests__/api/hackathonParticipations.api.test.js __tests__/api/hackathons.api.test.js __tests__/api/profilePersistence.api.test.js` — **16 passed, 0 failed; 3 suites passed**.
- Restarted the active backend with the participation API registered.
- Live verification passed: registered a new student, created a Full-Stack Developer participation with Node.js/MongoDB/Bootstrap and Finalist outcome, fetched the authenticated list, and received `count: 1` with the saved fields intact.
- Verified `http://localhost:8000/hackathons.html` returns HTTP 200 and contains the live tracker counter markup.
- Tracker implementation is complete; the broader pre-existing legacy-suite reconciliation remains a separate recorded task.

### 2026-08-30 — Hackathon Discovery approved and initialized

- Completed the required read-only inspection of Student/User models, skills/career-role architecture, authentication, server routes, opportunity matching, frontend navigation/API helpers, and test infrastructure.
- Selected Hackalendar's documented public structured API as the first proposed provider; no Devpost/Unstop/MLH scraping will be attempted.
- Planned new models: `Hackathon`, `HackathonActivity`, and `HackathonSyncRun`.
- Planned services: provider adapter, normalizer, URL validator, conservative deduplicator/upsert, aggregator, and deterministic matcher.
- Exact next step: perform a real provider request and record the current response contract before implementing persistence.

### 2026-08-30 — Hackalendar contract verified and persistence foundation added

- Performed a real HTTPS request to `https://hackalendar.com/api/events?limit=3`; received HTTP 200 JSON with stable IDs, URLs, names, descriptions, dates, modes, themes, registration URLs, organizer, free flag, and verification timestamp. Null deadlines/prizes were observed and remain null.
- Added `Hackathon`, `HackathonActivity`, and `HackathonSyncRun` models with ownership/deduplication constraints and focused indexes.
- Added safe HTTP(S) URL validation, text sanitization, observed-field normalization, deterministic status calculation, and conservative canonical keys.
- Added a provider interface and a Hackalendar structured-API provider with explicit user agent and 12-second timeout.
- Aggregation/upsert, matcher, routes, and tests remain pending.

### 2026-08-30 — Hackathon sync, matching, and API layer

- Added source-isolated aggregation that records sync runs, continues after record/provider failures, normalizes/upserts by conservative canonical key, and marks records stale after 72 hours.
- Added deterministic recommendation logic separating relevance, eligibility, missing requirements, and learning opportunities.
- Added paginated/filterable public listing/detail APIs and authenticated recommendation, save/remove, self-reported status, and My Hackathons APIs.
- Added protected institution-only sync; an optional server-side `HACKATHON_SYNC_SECRET` adds a second gate.
- Registered `/api/hackathons` without changing existing opportunity routes.
- Unit/API verification remains pending; no frontend files changed in this step.

### 2026-08-30 — Hackathon backend tests added

- Added unit coverage for safe URL handling, sanitization, null preservation, status derivation, eligibility, relevance, explanations, and learning opportunities.
- Added API/service coverage for provider-shaped synchronization, repeat-sync deduplication/update, filtering/pagination, Student A/B recommendation differences, saved activity, self-reported registration, and user isolation.
- Test execution remains pending.

### 2026-08-30 — Hackathon backend verified and frontend client prepared

- Focused verification passed: **16 tests passed, 0 failed** across hackathon unit/API tests and existing profile persistence tests; syntax and diff checks passed.
- Renamed the sync audit error array to `syncErrors` to avoid a Mongoose reserved-path warning.
- Added `npm run sync:hackathons` for controlled development/operator synchronization outside the student UI.
- Added authenticated frontend clients for recommendations, detail, save/remove, status updates, and My Hackathons.
- Added `hackathons.html` to the protected-page list; page implementation remains pending.

### 2026-08-30 — Hackathon Discovery frontend added

- Added `frontend/hackathons.html` in the existing Bootstrap visual style with loading/empty/error states, search, mode/status/domain/free/eligibility filters, backend pagination, explainable recommendations, genuine source attribution, last-checked timestamps, details modal, and My Hackathons.
- Added `frontend/js/hackathons-page.js` with escaped text rendering and independent HTTP(S) verification for official links.
- Opening an official registration page does not alter activity state; `I Registered` is a separate explicit `Self Reported` action.
- Missing source fields display `Not specified by source` rather than fabricated values.
- Static verification, navigation updates, real synchronization, and live restart remain pending.

### 2026-08-30 — Hackathons navigation added

- Added the Hackathons link to the student dashboard, profile, assessment, opportunities, and applications navigation bars.
- No existing page or navigation target was removed.
- Static verification and live synchronization remain pending.

### 2026-08-30 — Real Hackalendar synchronization and live verification

- First real sync: **20 fetched, 20 inserted, 0 updated, 0 skipped, 0 errors**.
- Mandatory repeat sync: **20 fetched, 0 inserted, 20 updated, 0 skipped, 0 errors**, confirming events update instead of duplicating.
- Restarted the live backend with Hackathon routes enabled.
- Verified HTTP 200 for the backend health endpoint and `frontend/hackathons.html`.
- Verified the live listing contains 20 MongoDB records with `Hackalendar` source names and traceable source URLs.
- Registered a live student with B.Tech/CSE/year 2, AI/ML and Web Development interests, and Java/SQL skills; the recommendation API returned real stored events with an explanation including `Matches your AI/ML interest`.
- Registration links are rendered only after independent HTTP(S) validation, use `target="_blank" rel="noopener noreferrer"`, and never change activity status. Self-reported registration remains a separate explicit action.
- Focused tests remain **16 passed, 0 failed**. The pre-existing unrelated legacy-suite failures remain tracked separately.

### 2026-08-30 — Recovery initialized

- Added `RECOVERY_LEDGER.md` as the canonical resumable task record.
- No application code or configuration changed.
- Verification baseline: `npm.cmd test -- --runInBand` — 47 passed, 81 failed.

### 2026-08-30 — Assessment persistence model foundation

- Compatibility decision: retained legacy `Assessment` documents/routes while introducing a reusable question bank and per-user session lifecycle.
- Added `backend/models/AssessmentQuestion.js` with skill/topic/difficulty/source/verification metadata and a private-by-default `correctAnswer`.
- Added `backend/models/AssessmentSession.js` with student ownership, explicit mode, selected skills/questions, responses, lifecycle status, and result reference.
- Extended `AssessmentResult` with optional session, mode, assessed skills, and topic scores while keeping legacy assessment results valid.
- Extended student skills with an explicit `wantToImprove` flag and persisted it through profile and individual-skill writes.
- Tests not yet run for this change; session APIs are the next implementation step.

### 2026-08-30 — Secure assessment-session API

- Added authenticated `POST /api/assessments/session` supporting explicit `profile-skills`, `target-role`, and `custom` modes.
- Added level-aware difficulty selection, recent-question avoidance, verified/active question filtering, and per-skill selection.
- Added ownership-scoped `GET /api/assessments/session/:id` and sanitized question responses that exclude correct answers and explanations.
- Added ownership-scoped `POST /api/assessments/session/:id/submit` with backend answer validation, scoring, per-skill/topic results, persistence, and assessment skill evidence.
- Added `GET /api/assessments/history` scoped to the authenticated student.
- Legacy assessment routes remain available for frontend compatibility during migration.
- Focused API tests and test execution remain pending.

### 2026-08-30 — Deterministic skill analysis

- Added authenticated `GET /api/students/me/skill-analysis`.
- Analysis uses only the signed-in student's latest assessment evidence, declared skills, improvement choices, and populated target-role requirements.
- Response separates strong, weak, missing, and priority skills and produces evidence-specific recommendations instead of generic scores.
- Focused API tests and verification remain pending.

### 2026-08-30 — Assessment journey tests added

- Added `backend/__tests__/api/assessmentSessions.api.test.js` covering User A profile-skill selection, answer sanitization, backend scoring, persistence/history, deterministic analysis, User A/B isolation, skill-specific questions, and User C empty-profile behavior.
- Focused verification: `npm.cmd test -- --runInBand __tests__/api/assessmentSessions.api.test.js __tests__/api/profilePersistence.api.test.js __tests__/api/auth.api.test.js` — **22 passed, 0 failed; 3 suites passed**.
- Removed obsolete MongoDB driver connection options from `backend/testSetup.js`; behavior is unchanged and warning noise is eliminated.
- Complete-suite checkpoint after the new work: `npm.cmd test -- --runInBand` — **50 passed, 81 failed, 131 total; 6 suites passed, 6 failed**. The three new journey tests pass; remaining failures are legacy fixture/response-contract drift and cascading workflow failures.

### 2026-08-30 — Database-derived skill catalog and question seeding

- Added `GET /api/skills`, derived from verified active database questions and career-role skill requirements rather than a hardcoded frontend list.
- Registered the skills route in `backend/server.js`.
- Extended `backend/seed.js` to rebuild the reusable verified question bank from the existing curated assessment data while retaining legacy assessment seeding.
- Added focused coverage proving the catalog combines database question and career-role skills without duplicates.
- Verification: `npm.cmd test -- --runInBand __tests__/api/assessmentSessions.api.test.js` — **4 passed, 0 failed**. `node --check` passed for the seed and skills route, and `git diff --check` found no patch errors.

### 2026-08-30 — Frontend session API client

- Added frontend API functions for the database skill catalog, assessment-session creation/submission, assessment history, and authenticated skill analysis.
- Legacy assessment client functions remain temporarily for compatibility with any pages not yet migrated.
- Assessment page migration and browser verification are pending.

### 2026-08-30 — Assessment page migrated to sessions

- Updated `frontend/skill-assessment.html` with explicit Profile Skills, Target Role, and Custom modes plus a real result panel.
- Added `frontend/js/assessment-page.js`; the old inline page script is retained but disabled during migration.
- Custom options come from the database skill catalog; profile and target-role modes use authenticated persisted data.
- MCQs submit question IDs and selected option values to secure backend scoring; correct answers are never received by the page.
- Added per-skill/topic results, persistent history, saving/scoring states, and the required empty-profile message.
- Static verification: `node --check` passed for `frontend/js/app.js`, `frontend/js/assessment-page.js`, and all changed backend JavaScript; `git diff --check` reports no patch errors.
- Browser/runtime verification remains pending until the local MongoDB-backed application is started with seeded data.

### 2026-08-30 — Local development database launcher

- The machine has Node.js and Python but no installed `mongod` executable or database service.
- Added `backend/scripts/startMemoryDatabase.js` and `npm run dev:memory-db` to run the already-installed MongoDB memory runtime on port 27017 for local demonstrations.
- This database is intentionally temporary and resets when stopped; MongoDB or Atlas remains required for durable deployment data.
- Service startup and health verification pending.

### 2026-08-30 — Local website started

- Started temporary development MongoDB on `127.0.0.1:27017` and successfully seeded assessments, verified questions, and career roles.
- Replaced a stale ISOTOPES Node process occupying port 5000 with the current backend.
- Started the backend at `http://127.0.0.1:5000` and frontend at `http://127.0.0.1:8000`.
- Verified HTTP 200 for `/api/health`, `/api/skills`, `/`, and `/skill-assessment.html`.
- Added `.runtime/` to `.gitignore`; local process logs are not project deliverables.
- Runtime note: the development database is temporary and its contents disappear when its process stops.

### 2026-08-30 — Profile persistence bug diagnosis and fix

- Root cause: Basic Information, Skills, and Career Goal controls had `id` attributes but no `name` attributes, so browser `FormData` omitted their values and submitted an effectively empty profile.
- Added correct form names for full name, contact email, phone, location, degree, institution, branch, years, skills, target role, headline, and bio.
- Clarified the primary action as `Save Profile` and documented that retained skills preserve evidence.
- Hardened certification creation with required trimmed name/provider values, schema validation, and a missing-profile response.
- Skill evidence-preserving frontend serialization, regression tests, and live service restart remain pending.

### 2026-08-30 — Profile data preservation and regression coverage

- Updated the profile save service to merge retained skills by case-insensitive name, preserving backend-verified level, evidence, endorsements, and improvement preference.
- Added regression tests for saving/reloading all Basic Information fields, persisting skill level and improvement preference, preserving assessment evidence, and persisting/reloading certifications.
- Verification: `npm.cmd test -- --runInBand __tests__/api/profilePersistence.api.test.js __tests__/api/assessmentSessions.api.test.js` — **12 passed, 0 failed**; JavaScript syntax and diff checks passed.
- Restarted the live backend with the fix.
- Live API journey passed: registered a new student, saved name/contact/degree/branch/years/headline/bio plus Java and SQL skills, added a certification, reloaded `/api/students/me`, and confirmed all values persisted.
- The website remains available at `http://localhost:8000`; reload the profile page to receive the corrected form markup.

## Known Issues / Risks

- Assessment model exports `{ Assessment, AssessmentResult }`; multiple older tests expect the module itself to be an `Assessment` constructor.
- Current assessment structure groups questions inside an assessment document and does not yet model the required secure, reusable question bank and per-user session lifecycle.
- Several legacy tests and newer endpoints disagree about response shapes.
- Opportunity fixtures in older tests do not meet the current required ownership schema.
- Markdown files contain mojibake/encoding damage and stale completion claims.

## Exact Next Resumable Step

Phase 2 is implemented. Next: connect a browser session for visual/interactive QA; expose the full activity history/filter UI; add a credentialed India-capable provider such as Adzuna only after credentials are supplied; optionally persist scheduled company requirement snapshots; repair legacy opportunity fixtures that omit required `companyId`; then run the complete suite. Preserve the explicit distinction between employer-provided, externally observed, and general `CareerRole` guidance.
