mod app;
mod simulation;
mod render;
mod audio;
mod types;

use eframe::egui;

fn main() -> Result<(), eframe::Error> {
    env_logger::init();

    let options = eframe::NativeOptions {
        initial_window_size: Some(egui::vec2(1200.0, 900.0)),
        ..Default::default()
    };

    eframe::run_native(
        "Standard Distribution Visualization",
        options,
        Box::new(|cc| {
            Ok(Box::new(app::App::new(cc)))
        }),
    )
}
