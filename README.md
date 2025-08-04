# Todoist Drag & Drop Calendar

A React-based task management interface that integrates with the Todoist API to provide an intuitive drag-and-drop experience for scheduling tasks.

## Current Status

This project is currently in active development. The core infrastructure is in place with a functional drag-and-drop interface and Todoist API integration. See [TODO.md](./TODO.md) for current development priorities.

## Overview

This application provides a modern interface for managing your Todoist tasks with two main components:

1. **Unscheduled Tasks List** - A comprehensive list of tasks that haven't been scheduled yet
2. **Calendar View** - A visual calendar where tasks can be scheduled by dragging and dropping

## Tech Stack

- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite
- **Testing**: Vitest with React Testing Library
- **API Integration**: Direct integration with Todoist REST API v2
- **Styling**: CSS modules with modern CSS features

## Key Features

### ✅ Implemented
- **Drag & Drop Interface** - Smooth drag interactions between task list and calendar
- **Todoist API Integration** - Authentication and task fetching from Todoist
- **React Component Architecture** - Modular, maintainable component structure
- **TypeScript Support** - Full type safety and development experience
- **Modern Build Pipeline** - Vite-powered development and build process

### 🚧 In Development
- **Real Date Integration** - Currently uses generic weekdays, needs actual date calculations
- **Task Date Updates** - API calls to update task due dates when dropped on calendar
- **Calendar Navigation** - Week/month navigation controls
- **Task Editing** - Direct task modification capabilities

### 📋 Planned
- **Multiple Calendar Views** - Week and month view modes
- **Offline Support** - localStorage caching for offline functionality
- **Enhanced Accessibility** - Keyboard navigation and screen reader support
- **Comprehensive Testing** - Unit, integration, and E2E test coverage

## Project Structure

```
src/
├── components/          # React components
│   ├── Calendar/       # Calendar view component
│   ├── TaskList/       # Unscheduled tasks list
│   ├── TaskModal/      # Task detail modal
│   └── DragDrop/       # Drag and drop utilities
├── services/           # API integration
│   ├── todoist-api.ts  # Todoist API client
│   └── auth.ts         # Authentication service
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
└── constants/          # Application constants
```

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Todoist account and API token

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd todoist-drag-and-drop-calendar
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to `http://localhost:5173`

### Development Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run test` - Run test suite
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking

## API Configuration

This application requires a Todoist API token. The authentication system is in place in `src/services/auth.ts`.

## Browser Compatibility

Supports modern browsers with:
- ES2020+ JavaScript support
- HTML5 Drag and Drop API
- Local Storage
- Fetch API

## Contributing

This project follows the development workflow outlined in [CLAUDE.md](./CLAUDE.md). Please refer to [TODO.md](./TODO.md) for current development priorities and tasks.