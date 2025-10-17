# Technology Stack

## Core Technologies

- **Frontend Framework**: React 19+ with TypeScript
- **Build Tool**: Vite 7+ (fast development and optimized builds)
- **Rendering**: SVG with D3.js for interactive manipulation
- **State Management**: Zustand (lightweight, modern state management)
- **Styling**: Tailwind CSS 4+ with PostCSS
- **Routing**: React Router DOM 7+

## Development Tools

- **Testing**: Vitest with Testing Library and jsdom
- **Code Quality**: ESLint 9+ with TypeScript ESLint
- **Formatting**: Prettier 3+
- **Type Checking**: TypeScript 5.9+

## Build Configuration

- **Module System**: ES Modules (`"type": "module"`)
- **Path Aliases**: `@/` maps to `./src/`
- **Development Server**: Port 3000 with auto-open
- **Build Output**: `dist/` directory with source maps enabled

## Common Commands

### Development
```bash
npm run dev          # Start development server (port 3000)
npm run preview      # Preview production build
```

### Building
```bash
npm run build        # TypeScript compilation + Vite build
```

### Testing
```bash
npm run test         # Run tests once
npm run test:watch   # Run tests in watch mode
npm run test:ui      # Run tests with Vitest UI
```

### Code Quality
```bash
npm run lint         # Check linting issues
npm run lint:fix     # Auto-fix linting issues
npm run format       # Format code with Prettier
npm run format:check # Check code formatting
```

## Key Dependencies

- **d3**: Interactive SVG manipulation and data visualization
- **react-router-dom**: Client-side routing
- **zustand**: State management
- **@types/d3**: TypeScript definitions for D3.js