# Project Structure

## Root Directory Layout

```
interactive-planview/
├── src/                 # Source code
├── public/              # Static assets
├── dist/                # Build output
├── node_modules/        # Dependencies
├── .vscode/             # VS Code settings
├── package.json         # Project configuration
├── vite.config.ts       # Vite build configuration
├── tailwind.config.js   # Tailwind CSS configuration
├── tsconfig.json        # TypeScript configuration
├── eslint.config.js     # ESLint configuration
└── README.md            # Project documentation
```

## Source Code Organization (`src/`)

```
src/
├── components/          # React components
├── hooks/              # Custom React hooks
├── store/              # Zustand state management
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
├── assets/             # Static assets (images, icons)
├── test/               # Test setup and utilities
├── App.tsx             # Main application component
├── main.tsx            # Application entry point
└── index.css           # Global styles
```

## Kiro Integration Structure

```
.kiro/
├── steering/           # AI assistant guidance documents
├── specs/              # Feature specifications
└── hooks/              # Agent hooks for automation
    ├── core/           # Core hook system
    ├── plugins/        # Hook plugins (logger, metrics, ui-notify)
    ├── config/         # Hook configuration
    └── examples/       # Example hook implementations
```

## Naming Conventions

- **Components**: PascalCase (e.g., `PlanviewLoader.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useKiroHooks.ts`)
- **Types**: PascalCase interfaces/types (e.g., `PlanviewData`)
- **Utilities**: camelCase functions (e.g., `formatDistance`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `DEFAULT_ZOOM_LEVEL`)

## File Organization Patterns

- **Components**: One component per file, co-locate related types
- **Hooks**: Custom hooks in dedicated files with clear naming
- **Store**: Zustand stores organized by feature/domain
- **Types**: Shared types in `types/` directory, component-specific types inline
- **Tests**: Co-located with source files using `.test.tsx` suffix

## Import Conventions

- Use `@/` alias for src imports: `import { Component } from '@/components/Component'`
- Group imports: external libraries, internal modules, relative imports
- Prefer named exports over default exports for better tree-shaking