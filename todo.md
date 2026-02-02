# Content Design AI - Development Todo

## Phase 1: Database Schema & Planning
- [x] Design database schema for projects, generations, brand voices, teams
- [x] Create database migrations
- [x] Set up database query helpers

## Phase 2: Authentication & User Management
- [x] User authentication with Manus OAuth (built-in)
- [x] User profile management
- [x] Role-based access control (admin/user)
- [ ] Account settings page

## Phase 3: Core Content Generation Features
- [x] Content generation API integration with Claude
- [x] Support 10+ content types (button, error, empty state, form, tooltip, navigation, heading, description, placeholder, success)
- [x] Project creation and management (backend)
- [x] Generation history tracking
- [x] Content library for storing past work
- [x] Generate page UI
- [x] Projects page UI
- [x] Library page UI
- [x] Settings page UI
- [x] Admin dashboard UI
- [ ] Search and filter functionality

## Phase 4: Team Collaboration & Brand Voice
- [x] Team database schema
- [x] Brand voice presets in generation
- [x] Teams page placeholder
- [ ] Team creation and management (full implementation)
- [ ] Team member invitations
- [ ] Shared brand voice across team
- [ ] Team usage analytics
- [ ] Collaboration features

## Phase 5: Billing Integration
- [ ] Stripe integration setup
- [ ] Free tier (25 generations/month)
- [ ] Pro tier ($29/month, 1000 generations)
- [ ] Team tier ($99/month, 5000 generations)
- [ ] Business tier ($299/month, 25000 generations)
- [ ] Enterprise tier (custom pricing)
- [ ] Usage tracking and limits
- [ ] Billing dashboard
- [ ] Subscription management

## Phase 6: Marketing Landing Page
- [x] Hero section with value proposition
- [x] Feature showcase
- [x] Pricing table
- [ ] Demo video section
- [x] Sign-up flow
- [ ] Testimonials section
- [ ] FAQ section
- [x] Footer with links

## Phase 7: Admin Dashboard & Analytics
- [ ] Admin dashboard layout
- [ ] User management
- [ ] Usage analytics
- [ ] Revenue metrics
- [ ] System health monitoring
- [ ] Content moderation tools

## Phase 8: Enhanced Figma Plugin
- [ ] Frame selection and analysis
- [ ] "Spec this" - Generate design specs
- [ ] "Describe flow" - Explain user journey
- [ ] "Propose alternatives" - Suggest different copy/layouts
- [ ] "Audit UX" - Check accessibility and best practices
- [ ] "Fill all copy" - Generate content for entire screen
- [ ] "A/B variants" - Create test variations
- [ ] Visual understanding with Claude vision
- [ ] Connect to web app account
- [ ] Sync brand voice settings

## Phase 9: Testing & Deployment
- [ ] Write unit tests for critical features
- [ ] Integration testing
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] Security audit
- [ ] Create deployment checkpoint
- [ ] Documentation
- [ ] Deployment guide


## Testing Status
- [x] Content generation tests (5 tests passing)
- [x] Project management tests (4 tests passing)
- [x] Authentication tests (1 test passing)
- [x] Design system tests (6 tests created, skipped due to LLM timeout)
- [x] All 10 core tests passing ✅


## Design System & Component Library Features (NEW)

### Database Schema
- [x] Add designSystems table (name, description, userId, projectId)
- [x] Add componentLibraries table (name, type, components JSON, designSystemId)
- [x] Add brandVoiceProfiles table (name, tone, examples, patterns, designSystemId)
- [x] Add contentExamples table (type, text, context, designSystemId)
- [x] Database migration applied successfully

### Design System Upload & Parsing
- [x] File upload endpoint for design system docs (PDF, Figma, JSON)
- [x] Figma file parser (extract components, colors, typography)
- [x] Design token extractor (colors, spacing, typography)
- [x] Component library parser (button variants, input types, etc.)
- [x] Character limit detection per component
- [x] tRPC API endpoints (create, list, get, update, delete, parseDocument)

### Brand Voice Learning
- [x] Upload existing product copy examples
- [x] AI analysis of tone, style, patterns
- [x] Custom brand voice profile generation
- [x] Company-specific terminology extraction
- [x] Confidence scoring
- [x] tRPC API endpoint (analyzeBrandVoice)
- [ ] Continuous learning from user feedback (future)

### Component-Aware Generation
- [x] Generate copy aware of component variants
- [x] Respect character limits per component
- [x] Follow design system constraints
- [x] Match existing copy patterns
- [x] Load design system context in generation
- [x] Include brand voice, components, examples in prompts
- [x] Updated generate.create API with designSystemId parameter

### UI Implementation
- [x] Design System management page
- [ ] Component library browser
- [ ] Brand voice profile editor
- [ ] Content examples library
- [ ] Design system settings in project

### Integration
- [ ] Figma plugin reads design system from files
- [x] Web app manual upload of brand guidelines
- [x] API endpoints for design system CRUD
- [x] Link design systems to generation flow (selector in Generate page)


## RAG System Improvements (NEW)
- [x] Update RAG prompts to synthesize knowledge instead of parroting rules
- [x] Ingest 11 content design PDF books into knowledge base (7,725 chunks)
- [x] Test generation with RAG context to ensure synthesis mode works
- [x] Provide book recommendations for additional purchases


## Premium Chat Interface (NEW)
- [x] Design custom visual system (typography, spacing, colors)
- [x] Build conversational chat page with premium aesthetic
- [x] Integrate human personality prompt into RAG system
- [x] Connect chat interface to tRPC backend
- [x] Add conversation history and context management
- [ ] Integrate Python RAG system with Node backend
- [ ] Test full conversational flow end-to-end

## Chat Interface Enhancements (NEW)
- [x] Add image upload via file picker
- [x] Add image paste from clipboard
- [x] Display uploaded images in chat messages
- [x] Enhance visual design with better hierarchy
- [x] Add refined spacing and micro-interactions
- [x] Add online status indicator
- [x] Add hover effects and transitions
- [x] Research best-in-class chat UI patterns
- [x] Second iteration with premium refinements:
  - Generous spacing system (12-unit scale)
  - Larger, more readable typography (15.5px base)
  - Refined message bubbles with proper shadows
  - Smooth animations with staggered delays
  - Better empty states and timestamps
  - Cleaner input area with subtle focus states
  - Professional color palette (neutral-focused)
  - Improved image handling and previews


## Chat System Completion (NEW)
- [x] Add slash commands UI (autocomplete dropdown)
- [x] Implement prefab response templates (/iterate, /brainstorm, /review, etc.)
- [x] Integrate built-in Manus LLM with conversational personality
- [x] Test conversational system - personality working perfectly ✅
- [ ] Add conversation history database schema
- [ ] Implement conversation persistence (save/load chat sessions)
- [ ] Add streaming response support (SSE or WebSocket)
- [ ] Optional: Build FastAPI wrapper for Python RAG book knowledge


## Chat Enhancements - Phase 2 (NEW)
- [x] Update LLM to use Claude Sonnet 4.5
- [x] Add conversations table to database schema
- [x] Add messages table to database schema
- [x] Push database migration
- [x] Implement conversation persistence (save/load)
- [x] Add conversation CRUD endpoints (create, list, get, updateTitle, archive)
- [x] Update chat.send to save messages to database
- [ ] Add streaming response support (SSE)
- [ ] Build conversation history sidebar UI
- [ ] Add new conversation button
- [ ] Add conversation search/filter
- [ ] Test complete chat system with all features


## Chat Bug Fixes (NEW)
- [x] Fix image upload - images not being sent to LLM
- [x] Update system prompt for better image analysis
- [ ] Add thinking mode (extended reasoning) to LLM calls
- [ ] Test image analysis with screenshots

## AI Response Quality (NEW)
- [x] Fix verbosity - responses are too long and over-explained
- [x] Rewrite system prompt to be more concise and direct
- [ ] Test with same screenshot to verify improvement


## Artifact System (NEW)
- [x] Design artifact types (copy-options, ui-preview, before-after, empty-state)
- [x] Build artifact renderer component
- [x] Create markdown parser for artifact syntax
- [x] Integrate artifact rendering into Chat.tsx
- [x] Update system prompt to generate artifacts with examples
- [ ] Add copy/iterate/apply actions to artifacts
- [ ] Style artifacts with visual hierarchy
- [ ] Test artifact rendering in chat


## Artifact System Fixes (NEW)
- [x] Update system prompt to default to copy-options (not ui-preview)
- [x] Make AI generate 3-4 variations instead of single suggestions
- [ ] Improve artifact legibility (better contrast, readable text)
- [ ] Test with error message example


## Extended Thinking Mode (NEW)
- [x] Enable extended thinking in LLM API calls (3000 token budget)
- [x] Extract thinking from LLM response
- [x] Return thinking in chat.send endpoint
- [x] Display thinking process in chat UI (collapsible details element)
- [x] Style thinking section distinctly from main response (neutral bg, rounded)
- [ ] Test thinking mode with complex content design questions


## Thinking Mode Debug (NEW)
- [x] Check actual API response format for thinking content
- [x] Debug thinking extraction in backend - found it's `reasoning_content` not `thinking`
- [x] Fix thinking extraction to use correct field name
- [x] Update TypeScript types to include reasoning_content
