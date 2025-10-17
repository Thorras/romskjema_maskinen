# Implementation Plan

## Current Status

The core foundation of the interactive planview application has been implemented:

- ✅ Project structure and dependencies
- ✅ Data models, types, and utilities (SVG parsing, spatial indexing, coordinate transformations)
- ✅ Zustand stores for state management (viewer, measurement, configuration)
- ✅ Core rendering engine with SVG renderer and D3.js integration
- ✅ Pan/zoom functionality with touch gesture support
- ✅ Layer control panel with search, filtering, and visibility management
- ✅ Dynamic styling system with real-time updates and persistence
- ✅ Element selection infrastructure (click detection, spatial indexing)
- ✅ Comprehensive test coverage for implemented features

## Next Priority Tasks

The following tasks represent the remaining work to complete the interactive planview application:

1. **Element Information Display** - Create popup component for element details
2. **Measurement Tools** - Implement distance and area measurement functionality
3. **Export Functionality** - Add PNG, SVG, and PDF export capabilities
4. **Configuration Management UI** - Build preset save/load interface
5. **Main Application Integration** - Create complete PlanviewViewer component and replace demo App

## Tasks Deferred (Optional/Advanced Features)

- Multi-storey navigation and comparison (tasks 13.x)
- Search and navigation features (tasks 14.x)
- Advanced responsive design optimizations (tasks 12.x)

---

- [x] 1. Set up project structure and core dependencies

  - Create React + TypeScript + Vite project with Tailwind CSS
  - Install core dependencies: D3.js, Zustand, React Router
  - Set up development tools: ESLint, Prettier, Vitest
  - Configure build pipeline and development server
  - Add Kiro hooks system for observability and monitoring
  - _Requirements: PV-R1.1, PV-R8.1_

- [x] 2. Implement core data models and types

  - [x] 2.1 Create TypeScript interfaces for IFC elements and viewer state

    - Define IFCElement, ViewerState, ViewerConfig interfaces
    - Create types for SVG geometry, styling, and measurements
    - Implement coordinate transformation utilities
    - _Requirements: PV-R1.1, PV-R2.1, PV-R3.1_

  - [x] 2.2 Implement SVG data parsing and processing

    - Create SVG parser to extract elements and metadata
    - Build spatial indexing system for efficient hit testing
    - Implement IFC class extraction from SVG attributes
    - _Requirements: PV-R1.1, PV-R4.1_

  - [x] 2.3 Write unit tests for data models and parsing

    - Test SVG parsing with various input formats
    - Test coordinate transformations and spatial indexing
    - Test IFC class extraction and metadata handling
    - _Requirements: PV-R1.1, PV-R2.1_

- [x] 3. Create Zustand store for state management

  - [x] 3.1 Implement viewer state store

    - Create Zustand store for ViewerState management
    - Add actions for transform, layer visibility, and element selection
    - Implement state persistence for user preferences
    - _Requirements: PV-R1.1, PV-R2.1, PV-R3.4, PV-R7.1_

  - [x] 3.2 Add measurement and configuration stores

    - Create measurement store for managing distance/area measurements
    - Implement configuration preset store with save/load functionality
    - Add error handling and validation for state updates
    - _Requirements: PV-R5.1, PV-R5.4, PV-R7.1, PV-R7.2_

- [x] 4. Create basic rendering engine

  - [x] 4.1 Implement SVG renderer component

    - Create React component for SVG display using D3.js
    - Implement basic element rendering with styling
    - Add viewport management and coordinate system setup
    - Integrate with spatial index for efficient rendering
    - _Requirements: PV-R1.1, PV-R3.2_

  - [x] 4.2 Add layer visibility management

    - Implement show/hide functionality for IFC classes
    - Create efficient DOM manipulation for large datasets
    - Add batch operations for multiple layer changes
    - Connect to Zustand store for state management
    - _Requirements: PV-R2.1, PV-R2.2, PV-R2.4_

  - [x] 4.3 Write tests for rendering engine

    - Test SVG element creation and styling
    - Test layer visibility operations
    - Test viewport and coordinate transformations
    - _Requirements: PV-R1.1, PV-R2.1_

- [x] 5. Implement pan and zoom functionality

  - [x] 5.1 Create interaction controller for mouse events

    - Implement pan functionality with mouse drag using D3.js
    - Add zoom functionality with mouse wheel
    - Create fit-to-view and reset view operations
    - Integrate with coordinate transformation utilities
    - _Requirements: PV-R1.2, PV-R1.3_

  - [x] 5.2 Add touch gesture support for mobile devices

    - Implement pinch-to-zoom for touch devices
    - Add pan support with touch gestures
    - Handle multi-touch interactions properly
    - _Requirements: PV-R8.2, PV-R8.4_

  - [x] 5.3 Write tests for interaction handling

    - Test mouse pan and zoom operations
    - Test touch gesture recognition and handling
    - Test viewport boundary constraints
    - _Requirements: PV-R1.2, PV-R8.2_

- [x] 6. Build layer control panel UI

  - [x] 6.1 Create layer control component

    - Build checkbox list for IFC classes using existing IFC utilities
    - Implement show all/hide all functionality
    - Add layer search and filtering capabilities
    - Connect to Zustand store for state management
    - _Requirements: PV-R2.1, PV-R2.2, PV-R2.3, PV-R2.4_

  - [x] 6.2 Integrate layer controls with rendering engine

    - Connect UI controls to layer visibility state
    - Implement real-time updates without page reload
    - Add visual feedback for layer operations
    - _Requirements: PV-R2.2, PV-R2.4_

  - [x] 6.3 Write tests for layer control functionality

    - Test checkbox interactions and state management
    - Test search and filtering operations
    - Test integration with rendering engine
    - Fixed test assertion issue for multiple elements with same text content
    - All 16 LayerControlPanel tests now passing
    - _Requirements: PV-R2.1, PV-R2.2_

- [x] 7. Implement dynamic styling system

  - [x] 7.1 Create styling panel component

    - Build color picker and line width controls
    - Implement per-class styling configuration using existing IFC utilities
    - Add style reset and preset functionality
    - Connect to Zustand store for style management
    - _Requirements: PV-R3.1, PV-R3.3, PV-R3.4_

  - [x] 7.2 Add real-time style application

    - Implement immediate visual updates on style changes

    - Create efficient style override system using D3.js
    - Add local storage for style preferences
    - _Requirements: PV-R3.2, PV-R3.4_

  - [x] 7.3 Write tests for styling system

    - Test color and line width modifications
    - Test style persistence and loading
    - Test real-time update performance
    - Added comprehensive test suite for useStylePersistence hook (5 tests)
    - Added test coverage for useRealTimeStyles hook (12 tests)
    - Added StyleManager test coverage for efficient style application
    - _Requirements: PV-R3.1, PV-R3.2_

- [x] 8. Add element selection and information display

  - [x] 8.1 Implement element click detection

    - Create hit testing system using existing spatial index
    - Add visual feedback for hoverable elements
    - Implement element selection state management with Zustand
    - SVGRenderer has onElementClick handlers and spatial index integration
    - Selection state management implemented in viewerStore
    - _Requirements: PV-R4.1, PV-R4.4_

  - [x] 8.2 Create information popup component

    - Build popup component for element details
    - Display IFC class, GUID, and properties
    - Add popup positioning and auto-hide functionality
    - _Requirements: PV-R4.2, PV-R4.3_

  - [x] 8.3 Write tests for selection and popup system

    - Test hit testing accuracy and performance
    - Test popup content and positioning
    - Test selection state management

    - _Requirements: PV-R4.1, PV-R4.2_

- [x] 9. Implement measurement tools

  - [x] 9.1 Create measurement mode controller

    - Add measurement mode toggle functionality
    - Implement point-to-point distance measurement using coordinate utilities
    - Create visual feedback for measurement mode
    - Connect to measurement store in Zustand
    - _Requirements: PV-R5.1, PV-R5.2_

  - [x] 9.2 Add area measurement and measurement management

    - Implement polygon area measurement using coordinate utilities
    - Create measurement overlay rendering system with D3.js
    - Add measurement deletion and management
    - _Requirements: PV-R5.3, PV-R5.4_

  - [x] 9.3 Write tests for measurement functionality

    - Test distance and area calculation accuracy
    - Test measurement overlay rendering
    - Test measurement management operations
    - _Requirements: PV-R5.2, PV-R5.3_

- [x] 10. Build export functionality

  - [x] 10.1 Implement view export system

    - Create PNG export using Canvas API
    - Add SVG export with current view state
    - Implement PDF export functionality
    - Integrate with Kiro hooks for export tracking
    - _Requirements: PV-R6.1, PV-R6.2_

  - [x] 10.2 Add export options and metadata

    - Include scale bar and north arrow in exports
    - Respect current zoom and visible layers
    - Add error handling for export failures
    - _Requirements: PV-R6.2, PV-R6.3, PV-R6.4_

  - [x] 10.3 Write tests for export functionality

    - Test various export formats and options
    - Test export with different view states
    - Test error handling for export failures
    - _Requirements: PV-R6.1, PV-R6.4_

- [x] 11. Implement configuration management

  - [x] 11.1 Create preset save and load system

    - Implement configuration serialization using existing configuration store
    - Add local storage for saved presets
    - Create preset management UI
    - _Requirements: PV-R7.1, PV-R7.2_

  - [x] 11.2 Add preset administration features

    - Implement preset deletion and renaming
    - Add preset import/export functionality
    - Create default configuration restoration
    - _Requirements: PV-R7.3, PV-R7.4_

  - [x] 11.3 Write tests for configuration management

    - Test preset saving and loading
    - Test configuration serialization accuracy
    - Test preset management operations
    - _Requirements: PV-R7.1, PV-R7.2_

- [ ] 12. Add responsive design and mobile optimization

  - [ ] 12.1 Implement responsive layout system

    - Create mobile-friendly control panels using Tailwind CSS
    - Add collapsible UI elements for small screens
    - Implement orientation change handling
    - _Requirements: PV-R8.1, PV-R8.3, PV-R8.4_

  - [ ] 12.2 Optimize touch interactions for mobile

    - Fine-tune touch gesture sensitivity
    - Add mobile-specific UI feedback
    - Implement context menus for touch devices
    - _Requirements: PV-R8.2, PV-R8.3_

  - [ ] 12.3 Write tests for responsive functionality
    - Test layout adaptation to different screen sizes
    - Test touch interaction accuracy on mobile
    - Test orientation change handling
    - _Requirements: PV-R8.1, PV-R8.4_

- [ ] 13. Implement multi-storey and comparison features

  - [ ] 13.1 Add storey navigation system

    - Create storey selection dropdown using existing storey extraction utilities
    - Implement storey switching with state preservation
    - Add keyboard shortcuts for storey navigation
    - _Requirements: PV-R1.4, PV-R9.4_

  - [ ] 13.2 Create split-view comparison mode

    - Implement side-by-side storey comparison
    - Add synchronized pan and zoom between views
    - Allow independent layer settings per view
    - _Requirements: PV-R9.1, PV-R9.2, PV-R9.3_

  - [ ] 13.3 Write tests for multi-storey functionality
    - Test storey switching and state management
    - Test split-view synchronization
    - Test independent view configurations
    - _Requirements: PV-R9.1, PV-R9.2_

- [ ] 14. Add search and navigation features

  - [ ] 14.1 Implement element search functionality

    - Create search input with autocomplete
    - Add element ID and name search capabilities using spatial index
    - Implement search result highlighting
    - _Requirements: PV-R10.1, PV-R10.2_

  - [ ] 14.2 Add search result navigation

    - Implement automatic zoom-to-element functionality using coordinate utilities
    - Add navigation between multiple search results
    - Create search history and recent searches
    - _Requirements: PV-R10.2, PV-R10.3, PV-R10.4_

  - [ ] 14.3 Write tests for search functionality
    - Test search accuracy and performance
    - Test zoom-to-element navigation
    - Test search result management
    - _Requirements: PV-R10.1, PV-R10.2_

- [ ] 15. Create main interactive planview application

  - [ ] 15.1 Create main PlanviewViewer component

    - Build main PlanviewViewer component that orchestrates all features
    - Integrate SVGRenderer, LayerControlPanel, StylingPanel, and ViewportControls
    - Add file loading and SVG parsing integration
    - Connect all components to Zustand stores
    - _Requirements: PV-R1.1, PV-R2.1, PV-R3.1_

  - [ ] 15.2 Replace demo App.tsx with full application

    - Replace current demo App.tsx with complete interactive planview application
    - Add proper layout with responsive design
    - Integrate all implemented features into cohesive interface
    - Add application-level error boundaries and loading states
    - _Requirements: All requirements_

  - [ ] 15.3 Write integration tests for main application
    - Test complete user workflows from load to styling
    - Test component integration and state management
    - Test error handling and recovery scenarios
    - _Requirements: All requirements_
