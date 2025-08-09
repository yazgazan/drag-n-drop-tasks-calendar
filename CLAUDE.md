# Claude Development Context

This file contains technical details and development context for the Todoist Drag & Drop Calendar project.

## Project Structure

```
todoist-drag-and-drop-calendar/
├── src/
│   ├── components/          # React/Vue components
│   │   ├── TaskList/       # Unscheduled tasks list component
│   │   ├── Calendar/       # Calendar view component
│   │   └── DragDrop/       # Drag and drop utilities
│   ├── services/           # API integration services
│   │   ├── todoist-api.js  # Todoist API client
│   │   └── auth.js         # OAuth authentication
│   ├── utils/              # Utility functions
│   ├── styles/             # CSS/SCSS styles
│   └── types/              # TypeScript type definitions
├── public/                 # Static assets
├── tests/                  # Test files
└── docs/                   # Additional documentation
```

## Technical Implementation Details

### API Integration
- **Todoist REST API v2**: https://developer.todoist.com/rest/v2/
- **Authentication**: User's personal API token
- **Error Handling**: Comprehensive error handling for network failures and API errors

### Key Todoist API Endpoints
- `GET /rest/v2/tasks` - Fetch all tasks
- `POST /rest/v2/tasks` - Create new task
- `POST /rest/v2/tasks/{id}` - Update existing task
- `GET /rest/v2/projects` - Fetch projects
- `GET /rest/v2/labels` - Fetch labels

### Task Data Structure
```typescript
interface TodoistTask {
  id: string;
  content: string;
  description: string;
  project_id: string;
  labels: string[];
  priority: 1 | 2 | 3 | 4;
  due?: {
    date: string;
    datetime?: string;
    timezone?: string;
  };
  parent_id?: string;
  order: number;
  url: string;
  created_at: string;
}
```

### Drag & Drop Implementation
- Use HTML5 Drag and Drop API
- Implement custom drag preview with task information
- Handle drop zones for calendar dates
- Provide visual feedback during drag operations
- Support keyboard accessibility (arrow keys, space/enter)

### State Management
- Consider using React Context, Zustand, or similar for state management
- Cache task data locally to reduce API calls
- Implement optimistic updates for better UX
- Handle offline scenarios gracefully

### Calendar Component Requirements
- Support multiple view modes (month, week)
- Arrows to navigate weeks and months
- Time slot granularity (15-minute intervals recommended)
- Visual task representation with truncated content
- Responsive design for mobile devices

### Development Commands
- `npm run build` - Build for production
- `npm run test` - Run test suite
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking

### Testing Strategy
- Unit tests for utility functions and API services
- Component tests for React/Vue components
- Integration tests for drag & drop functionality
- E2E tests for critical user flows

### Security & Privacy
- Store API tokens in localStorage
- Never log sensitive user data

### Browser Support
- Modern browsers (Chrome 88+, Firefox 85+, Safari 14+, Edge 88+)
- Progressive enhancement for older browsers
- Polyfills for missing features if necessary

### Accessibility
- ARIA labels for drag and drop operations
- Keyboard navigation support
- Screen reader compatibility
- High contrast mode support
- Focus management during interactions

## Development Workflow Instructions

### Working with the Project Todo List
- **Primary Todo List**: All project tasks are tracked in `TODO.md` in the root directory
- **Task Management**: Always read TODO.md first to understand current priorities and pending work
- **Progress Tracking**: Mark items as completed by adding `[x]` or similar completion markers as you finish them
- **Task Updates**: Update TODO.md in real-time as you work through tasks - don't batch updates
- **New Tasks**: Add newly discovered tasks to TODO.md as they arise during development
- **Context**: Always reference the todo list when planning work to ensure alignment with project goals