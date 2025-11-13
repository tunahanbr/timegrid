# Upgrading to Filesystem Storage

Currently, offline data is stored in localStorage as a temporary solution. To enable unlimited filesystem storage in your Tauri app:

## 1. Install the Tauri Filesystem Plugin

```bash
npm install @tauri-apps/plugin-fs
```

## 2. Add Plugin to Tauri Config

Edit `src-tauri/tauri.conf.json` and add the fs plugin:

```json
{
  "plugins": {
    "fs": {
      "scope": ["**"]
    }
  }
}
```

## 3. Add Plugin to Cargo.toml

Edit `src-tauri/Cargo.toml` and add:

```toml
[dependencies]
tauri-plugin-fs = "2.0"
```

## 4. Register Plugin in main.rs

Edit `src-tauri/src/main.rs`:

```rust
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())  // Add this line
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

## 5. Uncomment Filesystem Code

In `src/lib/offline-storage.ts`, uncomment the filesystem code blocks in `readFile()` and `writeFile()` methods, and remove the temporary localStorage implementation.

## Benefits

- **No Size Limits**: Store as much offline data as needed
- **Better Performance**: Faster reads/writes for large datasets
- **Native Storage**: Data stored in app data directory
  - macOS: `~/Library/Application Support/your-app-name/offline_data/`
  - Windows: `%APPDATA%\your-app-name\offline_data\`
  - Linux: `~/.local/share/your-app-name/offline_data/`

## Current Behavior

Without the plugin installed:
- Uses localStorage (5-10MB limit depending on browser)
- Works in both browser and Tauri app
- Sufficient for most offline usage scenarios
- Automatic fallback if filesystem plugin fails
