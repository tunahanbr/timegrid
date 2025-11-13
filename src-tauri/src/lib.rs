use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent, TrayIconId},
    Manager, WindowEvent, PhysicalPosition, Position, Size,
};

// Command to update the tray title with timer info
#[tauri::command]
fn update_tray_title(
    app: tauri::AppHandle,
    elapsed: String,
    project: String,
) -> Result<(), String> {
    println!("update_tray_title called with elapsed='{}', project='{}'", elapsed, project);
    
    if let Some(tray) = app.tray_by_id(&TrayIconId::new("main-tray")) {
        let title = if !elapsed.is_empty() && !project.is_empty() {
            format!("⏱ {} • {}", elapsed, project)
        } else if !elapsed.is_empty() {
            format!("⏱ {}", elapsed)
        } else {
            "TimeGrid".to_string()
        };
        
        tray.set_title(Some(&title))
            .map_err(|e| e.to_string())?;
        println!("Tray title updated successfully");
    } else {
        println!("WARNING: Tray icon not found!");
    }
    Ok(())
}

// Helper function to position widget window below tray icon
fn position_widget_window(app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {    
    if let Some(widget) = app.get_webview_window("timer-widget") {
        if let Some(tray) = app.tray_by_id(&TrayIconId::new("main-tray")) {
            // Get tray icon position
            if let Ok(Some(tray_rect)) = tray.rect() {
                let window_width = 320.0;
                
                // Extract physical positions from Tauri Position/Size enums
                let (tray_x, tray_y) = match tray_rect.position {
                    Position::Physical(pos) => (pos.x as f64, pos.y as f64),
                    Position::Logical(pos) => (pos.x, pos.y),
                };
                
                let (tray_width, tray_height) = match tray_rect.size {
                    Size::Physical(size) => (size.width as f64, size.height as f64),
                    Size::Logical(size) => (size.width, size.height),
                };
                
                // Position window below the tray icon, centered horizontally
                let x = tray_x + (tray_width / 2.0) - (window_width / 2.0);
                let y = tray_y + tray_height + 8.0; // 8px gap below tray
                
                widget.set_position(PhysicalPosition::new(x as i32, y as i32))?;
            }
        }
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Create native application menu (macOS standard menus)
            let app_name = "TimeGrid";
            
            // App Menu (macOS standard first menu)
            let about = PredefinedMenuItem::about(app, Some(app_name), None)?;
            let settings = MenuItem::with_id(app, "settings", "Settings...", true, Some("Cmd+,"))?;
            let hide = PredefinedMenuItem::hide(app, Some("Hide TimeGrid"))?;
            let hide_others = PredefinedMenuItem::hide_others(app, Some("Hide Others"))?;
            let show_all = PredefinedMenuItem::show_all(app, Some("Show All"))?;
            let quit = PredefinedMenuItem::quit(app, Some("Quit TimeGrid"))?;
            
            let app_menu = Submenu::with_items(
                app,
                app_name,
                true,
                &[
                    &about,
                    &settings,
                    &hide,
                    &hide_others,
                    &show_all,
                    &quit,
                ],
            )?;

            // File Menu
            let new_entry = MenuItem::with_id(app, "new_entry", "New Time Entry", true, Some("Cmd+N"))?;
            let close_window = PredefinedMenuItem::close_window(app, Some("Close Window"))?;
            
            let file_menu = Submenu::with_items(
                app,
                "File",
                true,
                &[
                    &new_entry,
                    &close_window,
                ],
            )?;

            // Edit Menu (standard macOS edit operations)
            let undo = PredefinedMenuItem::undo(app, Some("Undo"))?;
            let redo = PredefinedMenuItem::redo(app, Some("Redo"))?;
            let cut = PredefinedMenuItem::cut(app, Some("Cut"))?;
            let copy = PredefinedMenuItem::copy(app, Some("Copy"))?;
            let paste = PredefinedMenuItem::paste(app, Some("Paste"))?;
            let select_all = PredefinedMenuItem::select_all(app, Some("Select All"))?;
            
            let edit_menu = Submenu::with_items(
                app,
                "Edit",
                true,
                &[
                    &undo,
                    &redo,
                    &cut,
                    &copy,
                    &paste,
                    &select_all,
                ],
            )?;

            // View Menu
            let toggle_timer = MenuItem::with_id(app, "toggle_timer", "Quick Timer", true, Some("Cmd+T"))?;
            let toggle_fullscreen = PredefinedMenuItem::fullscreen(app, Some("Enter Full Screen"))?;
            
            let view_menu = Submenu::with_items(
                app,
                "View",
                true,
                &[
                    &toggle_timer,
                    &toggle_fullscreen,
                ],
            )?;

            // Window Menu (standard macOS window management)
            let minimize = PredefinedMenuItem::minimize(app, Some("Minimize"))?;
            let zoom = PredefinedMenuItem::maximize(app, Some("Zoom"))?;
            
            let window_menu = Submenu::with_items(
                app,
                "Window",
                true,
                &[
                    &minimize,
                    &zoom,
                ],
            )?;

            // Build the native menu bar
            let menu = Menu::with_items(
                app,
                &[
                    &app_menu,
                    &file_menu,
                    &edit_menu,
                    &view_menu,
                    &window_menu,
                ],
            )?;

            // Set the application menu
            app.set_menu(menu.clone())?;

            // Handle menu events
            app.on_menu_event(|app, event| match event.id.as_ref() {
                "settings" => {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                        // Navigate to settings page
                        let _ = window.eval("window.location.hash = '#/settings'");
                    }
                }
                "new_entry" => {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                        // Navigate to timer page
                        let _ = window.eval("window.location.hash = '#/timer'");
                    }
                }
                "toggle_timer" => {
                    // Show timer widget
                    if let Some(widget) = app.get_webview_window("timer-widget") {
                        if widget.is_visible().unwrap_or(false) {
                            let _ = widget.hide();
                        } else {
                            let _ = position_widget_window(&app);
                            let _ = widget.show();
                            let _ = widget.set_focus();
                        }
                    }
                }
                _ => {}
            });

            // Create system tray menu (simplified)
            let timer_item = MenuItem::with_id(app, "tray_timer", "Quick Timer", true, None::<&str>)?;
            let show_item = MenuItem::with_id(app, "tray_show", "Show Main Window", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "tray_quit", "Quit", true, None::<&str>)?;

            let tray_menu = Menu::with_items(app, &[&timer_item, &show_item, &quit_item])?;

            // Build system tray
            let tray_id = TrayIconId::new("main-tray");
            let _tray = TrayIconBuilder::with_id(tray_id)
                .menu(&tray_menu)
                .show_menu_on_left_click(false)
                .title("TimeGrid")
                .on_tray_icon_event(|tray, event| {
                    match event {
                        TrayIconEvent::Click {
                            button: MouseButton::Left,
                            button_state: MouseButtonState::Up,
                            ..
                        } => {
                            let app = tray.app_handle();
                            if let Some(widget) = app.get_webview_window("timer-widget") {
                                if widget.is_visible().unwrap_or(false) {
                                    let _ = widget.hide();
                                } else {
                                    let _ = position_widget_window(&app);
                                    let _ = widget.show();
                                    let _ = widget.set_focus();
                                }
                            }
                        }
                        _ => {}
                    }
                })
                .on_menu_event(move |app, event| match event.id.as_ref() {
                    "tray_timer" => {
                        // Show timer widget
                        if let Some(widget) = app.get_webview_window("timer-widget") {
                            if widget.is_visible().unwrap_or(false) {
                                let _ = widget.hide();
                            } else {
                                let _ = position_widget_window(&app);
                                let _ = widget.show();
                                let _ = widget.set_focus();
                            }
                        }
                    }
                    "tray_show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "tray_quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .build(app)?;

            // Handle window events for the timer widget
            if let Some(widget) = app.get_webview_window("timer-widget") {
                let widget_clone = widget.clone();
                widget.on_window_event(move |event| {
                    match event {
                        WindowEvent::Focused(false) => {
                            // Hide widget when it loses focus (user clicks outside)
                            let _ = widget_clone.hide();
                        }
                        _ => {}
                    }
                });
            }

                        // Handle window close for main window - minimize to tray instead of quitting
            if let Some(window) = app.get_webview_window("main") {
                let window_clone = window.clone();
                window.on_window_event(move |event| {
                    if let WindowEvent::CloseRequested { api, .. } = event {
                        // Prevent default close and hide instead
                        window_clone.hide().unwrap();
                        api.prevent_close();
                    }
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![update_tray_title])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
