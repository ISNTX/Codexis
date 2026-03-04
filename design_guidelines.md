# Multi-AI Collaboration Platform - Design Guidelines

## Design Approach

**Design System**: Modern productivity-focused system inspired by Linear's clean interface combined with ChatGPT's familiar chat patterns and Notion's organizational clarity.

**Core Principles**:
- Clarity over decoration - every element serves a functional purpose
- Consistent spatial relationships for cognitive ease
- Progressive disclosure - show complexity only when needed
- Model-agnostic visual language with subtle attribution cues

---

## Typography System

**Font Stack**: 
- Primary: Inter (UI elements, labels, navigation)
- Secondary: SF Mono or JetBrains Mono (code blocks, technical content)
- Load via Google Fonts CDN

**Hierarchy**:
- Page Titles: text-2xl font-semibold (24px)
- Section Headers: text-lg font-medium (18px)
- Body Text: text-base font-normal (16px)
- Labels/Meta: text-sm font-medium (14px)
- Captions: text-xs font-normal (12px)
- AI Model Names: text-sm font-semibold with uppercase tracking

---

## Layout System

**Spacing Primitives**: Use Tailwind units of **2, 4, 6, 8, 12, 16** for consistent rhythm
- Component padding: p-4, p-6, p-8
- Section spacing: gap-4, gap-6, gap-8
- Margins: m-2, m-4, m-6

**Grid Structure**:
- Main container: max-w-7xl mx-auto
- Two-column chat comparison: grid-cols-1 lg:grid-cols-2 gap-6
- Three-column orchestration: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4
- Sidebar navigation: 240px fixed width on desktop, collapsible on mobile

---

## Component Library

### Navigation & Header
- **Top Navigation Bar**: Full-width header with h-16, flex justify-between
  - Left: Logo + app name (text-xl font-bold)
  - Center: Mode switcher tabs (Chat / Compare / Orchestrate)
  - Right: Conversation history icon + export button + user menu
- Sticky positioning (sticky top-0) with subtle bottom border

### Chat Interface Components

**Message Container**:
- User messages: Align right, max-w-3xl, rounded-2xl, p-4
- AI responses: Align left, max-w-4xl, rounded-2xl, p-6
- Model attribution badge: Inline at top-right of AI messages (text-xs, px-3 py-1, rounded-full)
- Timestamp: text-xs below messages, subtle styling
- Code blocks: Syntax-highlighted with copy button (absolute top-right)

**Input Area**:
- Bottom-fixed container with backdrop blur
- Textarea: Auto-expanding, max-h-40, rounded-xl, p-4
- Submit button: Icon button (send arrow), absolute right-3
- Model selector dropdown: Above input when needed, multiselect for compare mode

**Conversation History Sidebar**:
- 280px width, overflow-y-auto
- Each conversation: Card with p-3, rounded-lg, truncated title
- Active state: Distinct visual treatment
- Group by date with sticky headers (Today, Yesterday, This Week)

### Comparison Mode
**Split View Layout**:
- Header bar showing selected models (GPT / Claude / Grok badges)
- Synchronized scrolling chat columns
- Shared input at bottom spanning full width
- Divider lines between columns (border-r)

### Orchestration Workflows
**Workflow Cards**:
- Template selection grid: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Card structure: Rounded-xl, p-6, border, hover:shadow-md transition
  - Icon (from Heroicons): w-10 h-10 at top
  - Title: text-lg font-semibold, mt-4
  - Description: text-sm, mt-2, line-clamp-3
  - Models involved: Flex row of small badges, mt-4
  - Start button: w-full, mt-6

**Active Workflow View**:
- Vertical timeline/stepper showing process stages
- Each stage card: p-6, rounded-lg, border-l-4 (progress indicator)
- Stage status: Icons for pending/active/complete
- Collapsible stage content with smooth transitions

### Supporting Components

**Model Badge System**:
- Small badges for model attribution: px-2 py-1, text-xs, rounded-md
- Icon from Heroicons + model name
- Consistent sizing across all instances

**Export Modal**:
- Centered overlay with backdrop blur
- Modal card: max-w-lg, p-8, rounded-2xl
- Format options: Radio buttons for TXT/JSON/Markdown
- Include metadata checkbox
- Export button + cancel button (flex justify-end gap-3)

**Empty States**:
- Centered container with max-w-md
- Icon: w-16 h-16, mx-auto
- Heading: text-xl font-semibold, mt-6
- Description: text-sm, mt-2
- CTA button: mt-8

**Loading States**:
- Typing indicator: Three animated dots (animate-pulse)
- Skeleton loaders for conversation history (h-20, rounded-lg, animate-pulse)

---

## Icons & Assets

**Icon Library**: Heroicons (outline style for navigation, solid for actions)
- Chat: ChatBubbleLeftRightIcon
- Compare: ArrowsRightLeftIcon
- Orchestrate: CubeTransparentIcon
- Export: ArrowDownTrayIcon
- History: ClockIcon
- Menu: Bars3Icon
- Send: PaperAirplaneIcon
- Copy: ClipboardDocumentIcon
- Model-specific: SparklesIcon variants

**No hero image needed** - This is a functional dashboard application. Hero sections are not applicable.

---

## Animations

**Minimal & Purposeful**:
- Message appearance: Fade in with slide-up (transition-all duration-200)
- Typing indicator: Pulse animation on dots
- Modal/drawer entry: Scale + fade (transition-transform duration-300)
- Hover states: Scale slightly (hover:scale-105 transition-transform)
- No scroll-triggered animations
- No parallax effects

---

## Responsive Behavior

**Mobile (< 768px)**:
- Hide sidebar by default, show via hamburger menu
- Single column for all chat views
- Comparison mode: Tabbed interface instead of side-by-side
- Bottom nav bar for mode switching
- Input area: Fixed bottom with safe-area-inset

**Tablet (768px - 1024px)**:
- Two-column max for comparisons
- Collapsible sidebar
- Maintain desktop layout principles

**Desktop (> 1024px)**:
- Full multi-column layouts
- Persistent sidebar
- Optimized for 1440px+ viewports

---

## Special Considerations

**Code Syntax Highlighting**: Use Prism.js or Highlight.js via CDN for AI-generated code
**Markdown Rendering**: Marked.js for formatting AI responses
**Scroll Management**: Smooth scroll-behavior for chat auto-scroll, scroll-snap for comparison views
**Accessibility**: Focus visible on all interactive elements, aria-labels for icon buttons, keyboard navigation for chat history