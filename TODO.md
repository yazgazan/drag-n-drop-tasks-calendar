# TODO: Todoist Drag & Drop Calendar

This document outlines the tasks needed to transform the proof of concept into a functional prototype.

## High Priority - Core Functionality

### 🏗️ Project Structure & Setup
- [x] Set up proper project structure with src/ directories as per CLAUDE.md
- [x] Create package.json with build scripts and dependencies
- [x] Add build process with linting and type checking

### 🔌 API Integration
- [x] Implement Todoist API integration with authentication service
- [x] Replace mock task data with real Todoist API calls
- [x] Implement proper error handling for API failures

## Medium Priority - Enhanced Functionality

### 💻 Code Architecture
- [x] Add TypeScript support and create type definitions
- [x] Refactor monolithic HTML/JS into modular components
- [ ] Add state management (Context/Zustand) for task data
- [ ] Implement optimistic updates for better UX

### 📅 Calendar Features
- [ ] Add calendar navigation (arrows for week/month)
- [ ] Implement multiple calendar view modes (week/month)
- [ ] Add task editing functionality (replace placeholder alert)

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