# Todoist Drag & Drop Calendar

A client-side task management interface that integrates with the Todoist API to provide an intuitive drag-and-drop experience for scheduling tasks.

## Overview

This application provides a modern interface for managing your Todoist tasks with two main components:

1. **Unscheduled Tasks List** - A comprehensive list of tasks that haven't been scheduled yet
2. **Calendar View** - A visual calendar where tasks can be scheduled by dragging and dropping

## Key Features

- **Drag & Drop Scheduling** - Move tasks from the unscheduled list to specific dates on the calendar
- **Full Todoist Integration** - Supports all Todoist task attributes including:
  - Priority levels (P1, P2, P3, P4)
  - Labels and tags
  - Due dates and times
  - Project organization
  - Task descriptions and comments
- **Client-Side Only** - No backend required, runs entirely in the browser
- **Real-time Sync** - Changes are immediately synchronized with your Todoist account

## Architecture

- **Frontend Framework**: Modern JavaScript/TypeScript with a reactive UI framework
- **API Integration**: Direct integration with Todoist REST API v2

## Core Functionality

### Unscheduled Tasks Panel
- Display all tasks without specific due dates
- Visual indicators for priority, labels, and project

### Calendar Interface
- Monthly and weekly views
- Visual task representation with color coding
- Time-based scheduling for precise task placement

### Drag & Drop System
- Smooth drag interactions with visual feedback
- Automatic date assignment when dropping on calendar
- Undo/redo functionality for accidental moves

## Getting Started

1. Clone the repository
4. Install dependencies and run the development server

## API Requirements

This application requires:
- Todoist API access token

## Browser Compatibility

Supports modern browsers with:
- ES6+ JavaScript support
- Drag and Drop API
- Local Storage
- Fetch API