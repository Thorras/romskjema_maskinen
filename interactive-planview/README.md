# Interactive Planview Application

A web-based interactive 2D planview application for IFC (Industry Foundation Classes) files built with React, TypeScript, and D3.js. This application provides comprehensive tools for viewing, analyzing, and interacting with building floor plans and architectural drawings.

## Features

### Core Functionality
- **Interactive 2D Rendering**: SVG-based planview rendering with D3.js manipulation
- **Navigation Controls**: Pan, zoom, fit-to-view, and multi-storey navigation
- **Layer Management**: Toggle visibility of IFC classes (walls, doors, windows, etc.)
- **Element Interaction**: Click selection, hover effects, and detailed information display
- **Real-time Styling**: Dynamic color and line width customization per IFC class

### Advanced Tools
- **Measurement Tools**: Distance and area measurement with visual overlays
- **Export Functionality**: PNG, SVG, and PDF export with configurable options
- **Search & Navigation**: Element search with autocomplete and zoom-to-element
- **Configuration Management**: Save/load presets with local storage persistence
- **Split-View Comparison**: Side-by-side storey comparison with synchronized navigation

### User Experience
- **Responsive Design**: Mobile-friendly interface with touch gesture support
- **Accessibility**: Keyboard navigation and screen reader compatibility
- **Performance**: Optimized for large planview files with spatial indexing

## Tech Stack

- **Frontend**: React 19+ with TypeScript 5.9+
- **Build Tool**: Vite 7+ with ES Modules
- **Rendering**: SVG with D3.js for interactive manipulation
- **State Management**: Zustand (lightweight, modern state management)
- **Styling**: Tailwind CSS 4+ with PostCSS
- **Routing**: React Router DOM 7+
- **Testing**: Vitest with Testing Library and jsdom
- **Code Quality**: ESLint 9+ with TypeScript ESLint + Prettier 3+

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Testing

```bash
npm run test          # Run tests once
npm run test:watch    # Run tests in watch mode
npm run test:ui       # Run tests with UI
```

### Code Quality

```bash
npm run lint          # Check linting
npm run lint:fix      # Fix linting issues
npm run format        # Format code with Prettier
npm run format:check  # Check code formatting
```

## Project Structure

```
src/
├── components/       # React components
├── hooks/           # Custom React hooks
├── store/           # Zustand state management
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
└── test/            # Test setup and utilities
```

## Requirements

This application implements the requirements defined in `.kiro/specs/interactive-planview/requirements.md`.