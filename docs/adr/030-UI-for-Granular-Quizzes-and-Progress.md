# 030. UI for Granular Quizzes and Progress

- **Status:** Accepted
- **Date:** 2024-12-27

## Context

The current quiz system exists as a standalone HTML renderer (`quiz_renderer.html`) that lacks integration with the main dashboard architecture. While functional, it doesn't provide the cohesive user experience needed for granular progress tracking and seamless integration with the tabbed dashboard structure established in ADR-018 and ADR-019.

Students need a unified interface that allows them to:
- Navigate between curriculum units and individual quiz questions
- Track their progress granularly at the question level
- Submit MCQ answers with cryptographic verification (hash generation)
- Work with FRQ questions and export prompts to external AI tools (Grok) for assistance
- Maintain offline-first functionality with local state management

The existing system lacks:
- **Integrated Progress Tracking:** No connection between quiz completion and overall dashboard progress
- **Granular Quiz Interface:** No way to navigate individual questions within the dashboard
- **Cryptographic Verification:** MCQ submissions need hash generation for blockchain integration
- **FRQ Workflow:** No support for the copy-to-Grok workflow that students need for FRQ assistance
- **Offline-First Design:** Quiz state should persist locally before blockchain synchronization

## Decision

We will implement a comprehensive granular quiz UI system within the existing dashboard architecture, extending the tabbed interface to include curriculum and progress management capabilities.

### Key Components Implementation:

#### 1. Dashboard Tab Integration
- **Curriculum Tab:** New tab in the dashboard for browsing units, lessons, and individual questions
- **Progress Tab:** Enhanced progress tracking showing completion status at question granularity
- **Consistent UX:** Following the "Mission Control" design philosophy from ADR-019 with gradient backgrounds, clear visual hierarchy, and gamified elements

#### 2. QuizViewer Component (`apps/ui/src/components/QuizViewer.tsx`)
- **Reusable Quiz Interface:** Single component handling both MCQ and FRQ question types
- **Schema-Driven Rendering:** Uses TypeScript schemas from `@apstat-chain/data` package for type safety
- **Responsive Design:** Consistent with existing dashboard styling using Tailwind CSS and shadcn/ui components

#### 3. MCQ Implementation Features
- **Option Selection:** Radio button interface for answer selection
- **Auto-Hash Generation:** Automatic SHA-256 hash generation on answer selection for blockchain verification
- **Visual Feedback:** Clear indication of selected answers with gradient styling
- **Submit Workflow:** Hash-based submission ready for blockchain integration

#### 4. FRQ Implementation Features
- **Prompt Display:** Clear rendering of FRQ prompts with proper formatting
- **Textarea Input:** Large text input area for student responses
- **Copy-to-Grok Button:** One-click copying of formatted prompt + student context to clipboard
- **JSON Context Export:** Includes question context, student progress, and curriculum metadata for AI assistance

#### 5. Local State Management (MVP)
- **useState Hook:** Simple local state management for quiz progress and answers
- **Offline-First:** All quiz state maintained locally before network synchronization
- **Progress Persistence:** Question completion status saved to local storage
- **Lean Implementation:** No blockchain synchronization in initial MVP - purely local state

#### 6. Testing Implementation (`apps/ui/tests/quiz.test.tsx`)
- **MCQ Rendering Tests:** Verify proper question display and option selection
- **Hash Generation Tests:** Ensure correct SHA-256 hash generation for MCQ answers
- **FRQ Prompt Tests:** Test prompt display and copy-to-clipboard functionality
- **Progress Update Tests:** Verify local state updates for quiz completion
- **Vitest Integration:** Using existing Vitest setup with React Testing Library

### Technical Architecture:

```typescript
// QuizViewer component structure
interface QuizViewerProps {
  question: MCQQuestion | FRQQuestion;
  onProgress: (questionId: string, completed: boolean) => void;
  initialAnswer?: string;
}

// Local state management
interface QuizState {
  currentAnswer: string;
  isCompleted: boolean;
  answerHash?: string; // For MCQ
  grokPrompt?: string; // For FRQ
}
```

### Design System Integration:
- **Gradient Backgrounds:** Consistent with Mission Control theme
- **Clear Visual Hierarchy:** Question prompts, options, and actions clearly distinguished
- **Responsive Layout:** Mobile-first design with desktop enhancements
- **Accessibility:** Proper ARIA labels and keyboard navigation
- **Dark Mode Support:** Full support for existing dark mode implementation

## Consequences

### Positive

- **Enhanced Learning Experience:** Students can navigate curriculum granularly and track progress at the question level
- **Blockchain Integration Ready:** Hash-based MCQ submissions prepare for future blockchain synchronization
- **Improved FRQ Workflow:** Copy-to-Grok functionality streamlines the student workflow for getting AI assistance
- **Offline-First Design:** Students can work without internet connectivity, with state synchronized later
- **Consistent UX:** Maintains the polished Mission Control aesthetic established in ADR-019
- **Type Safety:** Full TypeScript integration prevents runtime errors and improves maintainability
- **Scalable Architecture:** Component-based design allows easy extension for new question types

### Negative

- **Implementation Complexity:** Multiple question types and workflows require careful state management
- **MVP Limitations:** Initial local-only state management means no cross-device synchronization
- **Testing Overhead:** Comprehensive testing required for hash generation and clipboard functionality
- **Dependency on External Tools:** Copy-to-Grok workflow relies on students having access to Grok

### Neutral

- **Development Effort:** Significant implementation work required but provides foundation for future features
- **State Management Evolution:** Local state will need to evolve to blockchain synchronization in future iterations
- **UI Consistency Maintenance:** Must maintain design system consistency as new features are added

This implementation establishes a solid foundation for granular quiz interaction while maintaining the high-quality user experience established in previous ADRs. The offline-first approach ensures students can work effectively regardless of network connectivity, while the blockchain-ready architecture prepares for future decentralized features. 