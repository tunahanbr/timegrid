# Native macOS Features - TimeGrid

## Overview
TimeGrid now feels like a true native macOS application with proper menu bars, keyboard shortcuts, and native window behaviors.

## Native Features Implemented

### 1. **Native Menu Bar**
Complete macOS-style application menu with:

#### TimeGrid Menu
- About TimeGrid
- Settings... (`Cmd+,`)
- Hide TimeGrid (`Cmd+H`)
- Hide Others (`Cmd+Option+H`)
- Show All
- Quit TimeGrid (`Cmd+Q`)

#### File Menu
- New Time Entry (`Cmd+N`)
- Close Window (`Cmd+W`)

#### Edit Menu (Standard macOS operations)
- Undo (`Cmd+Z`)
- Redo (`Cmd+Shift+Z`)
- Cut (`Cmd+X`)
- Copy (`Cmd+C`)
- Paste (`Cmd+V`)
- Select All (`Cmd+A`)

#### View Menu
- Quick Timer (`Cmd+T`) - Toggle timer widget popup
- Enter Full Screen (`Cmd+Control+F`)

#### Window Menu
- Minimize (`Cmd+M`)
- Zoom (Maximize window)

### 2. **Keyboard Shortcuts**
Application-specific shortcuts:
- `Cmd+,` - Open Settings page
- `Cmd+N` - New Time Entry (opens Timer page)
- `Cmd+T` - Toggle Quick Timer widget
- `Cmd+P` - Go to Projects
- `Cmd+E` - Go to Entries
- `Cmd+H` - Go to Timer (Home)
- `Shift+?` - Show keyboard shortcuts dialog

Plus all standard macOS shortcuts (Cmd+C, Cmd+V, Cmd+Q, etc.)

### 3. **Native Window Styling**

#### Overlay Title Bar
- Modern macOS appearance with transparent title bar
- Content extends into title bar area
- Drag region enabled in header for window dragging

#### Window Features
- **hiddenTitle**: No redundant title text in title bar
- **titleBarStyle: Overlay**: Modern translucent title bar
- **theme: Dark**: Proper dark mode integration
- **acceptFirstMouse**: Click-through without activation delay
- Native macOS focus rings on form elements

### 4. **Native Scrollbars**
- macOS-style overlay scrollbars (11px width)
- Auto-hiding behavior
- Proper hover states with transparency
- Border radius matching macOS design

### 5. **Window Management**

#### Main Window
- Closes to tray instead of quitting (Cmd+W hides window)
- Proper minimize/maximize behavior
- Window position remembered (native Tauri behavior)
- Resizable with minimum size constraints (1024×768)

#### Timer Widget
- Always-on-top floating window
- Transparent background with shadow
- Positioned automatically below tray icon
- Hides when clicking outside (focus loss)
- Left-click tray icon toggles visibility

### 6. **System Tray Integration**
- Native menu bar icon with tooltip ("TimeGrid")
- Left-click: Toggle quick timer widget
- Right-click: Show tray menu
  - Quick Timer
  - Show Main Window
  - Quit

### 7. **Native Drag Regions**
Application header is draggable:
- `data-tauri-drag-region` attribute enables window dragging
- Buttons and interactive elements remain clickable within drag region

### 8. **Visual Polish**
- Native focus ring styling (2px with ring color)
- Proper anti-aliasing on text
- System font stack (Inter for UI, JetBrains Mono for timer)
- Smooth animations matching macOS timing curves

## Technical Implementation

### Rust Backend (`src-tauri/src/lib.rs`)
- Complete native menu bar using Tauri's `Menu`, `Submenu`, and `PredefinedMenuItem` APIs
- Menu event handlers for all custom actions
- Window event handlers (close prevention, focus loss detection)
- Tray icon with click handlers (left-click toggle, right-click menu)

### Frontend Styling (`src/index.css`)
- Custom webkit scrollbar styles
- Native focus ring definitions
- Drag region CSS (`-webkit-app-region`, `app-region`)
- Interactive element exceptions within drag regions

### React Components (`src/App.tsx`)
- Header with `data-tauri-drag-region` attribute
- Keyboard shortcuts integration via hooks
- Window navigation from menu events via URL hash routing

### Configuration (`src-tauri/tauri.conf.json`)
- `macOSPrivateApi: true` - Enables advanced macOS features
- `hiddenTitle: true` - Removes redundant title bar text
- `titleBarStyle: "Overlay"` - Modern translucent title bar
- `theme: "Dark"` - Proper dark mode integration
- `acceptFirstMouse: true` - Click-through behavior

## User Experience Benefits

1. **Feels Native**: Application behaves exactly like other macOS apps
2. **Keyboard-First**: Power users can navigate entirely with shortcuts
3. **Menu Bar Widget**: Quick access to timer without opening main window
4. **System Integration**: Proper tray icon, window management, and focus behavior
5. **Visual Consistency**: Matches macOS design language (Big Sur/Monterey style)
6. **Efficient Workflow**: Close window hides to tray, doesn't quit entire app

## Development Notes

### Running the App
```bash
export PATH="$HOME/.cargo/bin:$PATH" && npm run tauri:dev
```

### Building for Production
```bash
npm run tauri:build
```

### Debugging Menu Events
Menu event IDs are logged in Rust console. Check Terminal output for:
- `settings` - Settings menu item clicked
- `new_entry` - New Time Entry clicked
- `toggle_timer` - Quick Timer toggled

### Adding New Shortcuts
1. Add to Rust menu in `lib.rs` with keyboard shortcut string
2. Add event handler in `app.on_menu_event()` closure
3. Update keyboard shortcuts dialog in React app

## Browser Compatibility Notes
The native features are Tauri-specific and won't affect the web version:
- Drag regions are no-ops in browsers
- Scrollbar styles fall back to browser defaults
- Menu bar doesn't exist in web version (handled by browser/React Router)

## Future Enhancements
- [ ] Custom tray icon with timer display (requires icon generation)
- [ ] Native notifications with time entry summaries
- [ ] Touch Bar support for MacBook Pro (Tauri 2.x feature)
- [ ] Window vibrancy/translucency effects (requires additional Tauri plugins)
- [ ] Menu separators (API updated in newer Tauri versions)
- [ ] "Bring All to Front" window menu item (API updated in newer Tauri versions)
