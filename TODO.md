# TODO: Todoist Drag & Drop Calendar

This document outlines the tasks needed to transform the proof of concept into a functional prototype.

## High Priority - Core Functionality

### 🏗️ Project Structure & Setup
- [x] Set up proper project structure with src/ directories as per CLAUDE.md
- [x] Create package.json with build scripts and dependencies
- [x] Add build process with linting and type checking
- [x] **Configure build to output single .html file with no external dependencies (inline all CSS/JS)**

### 🔌 API Integration
- [x] Implement Todoist API integration with authentication service
- [x] Replace mock task data with real Todoist API calls
- [x] Implement proper error handling for API failures

### 📅 Calendar Features
- [x] **Replace generic weekdays with actual dates (Mon Jan 6, Tue Jan 7, etc.)**
- [x] **Add current week/month display in calendar header**
- [x] **Implement date-based calendar logic (current week, proper date calculations)**
- [x] Add calendar navigation (arrows for week/month)
- [x] Implement multiple calendar view modes (week/month)
- [x] Add task editing functionality (replace placeholder alert)
- [x] **Update calendar data structure to use actual dates instead of generic day names**

### 🎯 **CRITICAL - Task Date Updates**
- [x] Implement API call to update task due dates when dropped on calendar
- [x] Add date/time utilities to convert calendar slots to proper due dates
- [x] Handle scheduled task persistence across app reloads
- [x] Add error handling for failed task updates
- [x] Implement optimistic updates with rollback on API failure
- [x] Load existing scheduled tasks from Todoist on app initialization

## Medium Priority - Enhanced Functionality

### 💻 Code Architecture
- [x] Add TypeScript support and create type definitions
- [x] Refactor monolithic HTML/JS into modular components
- [ ] Add state management (Context/Zustand) for task data
- [ ] Implement optimistic updates for better UX

## Low Priority - Polish & Robustness

### ♿ Accessibility
- [ ] Implement proper keyboard accessibility (arrow keys, space/enter)
- [ ] Add ARIA labels and screen reader support

### 🧪 Testing & Quality
- [ ] Add comprehensive test suite (unit, component, integration, E2E)

### 📱 User Experience
- [ ] Implement localStorage caching for offline support
- [ ] Enhance mobile responsiveness and touch interactions

## Notes

- The current proof of concept has excellent UI/UX foundation with drag-and-drop, modal interactions, and responsive design
- Main focus should be on integrating real Todoist data and organizing code into maintainable structure
- Follow the project structure and technical requirements outlined in CLAUDE.md