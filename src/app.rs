use eframe::egui;
use crate::simulation::{Simulation, LaunchMode};
use crate::types::{SimSettings, Color};

pub struct App {
    simulation: Simulation,
    settings: SimSettings,
    ui_state: UIState,
}

struct UIState {
    is_running: bool,
    sound_enabled: bool,
    selected_sound: SoundChoice,
    ball_color: Color,
    bar_color: Color,
}

#[derive(Clone, Copy, PartialEq)]
enum SoundChoice {
    Bounce1,
    Bounce2,
    Metronome,
}

impl Default for UIState {
    fn default() -> Self {
        Self {
            is_running: false,
            sound_enabled: true,
            selected_sound: SoundChoice::Bounce1,
            ball_color: Color::new(0.8, 0.2, 0.2),
            bar_color: Color::new(0.0, 0.5, 1.0),
        }
    }
}

impl App {
    pub fn new(_cc: &eframe::CreationContext<'_>) -> Self {
        Self {
            simulation: Simulation::new(),
            settings: SimSettings::default(),
            ui_state: UIState::default(),
        }
    }
}

impl eframe::App for App {
    fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        egui::TopBottomPanel::top("controls").show(ctx, |ui| {
            ui.horizontal(|ui| {
                ui.label("Launch Mode:");
                egui::ComboBox::from_label("")
                    .selected_text(format!("{:?}", self.settings.launch_mode))
                    .show_ui(ui, |ui| {
                        ui.selectable_value(&mut self.settings.launch_mode, LaunchMode::OneByOne, "One by One");
                        ui.selectable_value(&mut self.settings.launch_mode, LaunchMode::NextLevel, "Next Level");
                        if self.settings.launch_mode != LaunchMode::AllTogether {
                            ui.selectable_value(&mut self.settings.launch_mode, LaunchMode::AllTogether, "All Together");
                        }
                    });

                ui.separator();

                ui.label("Ball Count:");
                egui::ComboBox::from_label("")
                    .selected_text(format!("{}", self.settings.ball_count))
                    .show_ui(ui, |ui| {
                        ui.selectable_value(&mut self.settings.ball_count, 1, "1");
                        ui.selectable_value(&mut self.settings.ball_count, 10, "10");
                        ui.selectable_value(&mut self.settings.ball_count, 100, "100");
                        ui.selectable_value(&mut self.settings.ball_count, 1_000, "1,000");
                        ui.selectable_value(&mut self.settings.ball_count, 10_000, "10,000");
                        ui.selectable_value(&mut self.settings.ball_count, 100_000, "100,000");
                        ui.selectable_value(&mut self.settings.ball_count, 1_000_000, "1,000,000");
                    });

                ui.separator();

                if ui.button("Start") {
                    self.ui_state.is_running = true;
                    self.simulation = Simulation::new_with_settings(self.settings.clone());
                }

                if ui.button("Pause") {
                    self.ui_state.is_running = false;
                }

                if ui.button("Reset") {
                    self.ui_state.is_running = false;
                    self.simulation = Simulation::new();
                }

                ui.separator();

                if ui.checkbox(&mut self.ui_state.sound_enabled, "Sound On") {
                    // Toggle sound
                }

                ui.label("Sound:");
                egui::ComboBox::from_label("")
                    .selected_text(format!("{:?}", self.ui_state.selected_sound))
                    .show_ui(ui, |ui| {
                        ui.selectable_value(&mut self.ui_state.selected_sound, SoundChoice::Bounce1, "Bounce 1");
                        ui.selectable_value(&mut self.ui_state.selected_sound, SoundChoice::Bounce2, "Bounce 2");
                        ui.selectable_value(&mut self.ui_state.selected_sound, SoundChoice::Metronome, "Metronome");
                    });

                ui.separator();

                ui.label("Ball Color:");
                color_picker(ui, &mut self.ui_state.ball_color);

                ui.label("Bar Color:");
                color_picker(ui, &mut self.ui_state.bar_color);
            });
        });

        egui::CentralPanel::default().show(ctx, |ui| {
            ui.heading("Standard Distribution Visualization");
            ui.label(format!("Total Balls: {}", self.simulation.total_count()));
            ui.label(format!("Active Balls: {}", self.simulation.active_count()));
            
            // Render board and histogram here
            ui.label("[Visualization area - to be rendered]");
        });

        egui::BottomPanel::bottom("histogram").show(ctx, |ui| {
            ui.heading("Histogram (13 Baskets)");
            ui.horizontal_wrapped(|ui| {
                for (i, &count) in self.simulation.bucket_counts().iter().enumerate() {
                    ui.label(format!("Basket {}: {}", i, count));
                }
            });
        });

        if self.ui_state.is_running {
            self.simulation.update();
            ctx.request_repaint();
        }
    }
}

fn color_picker(ui: &mut egui::Ui, color: &mut Color) {
    let mut [r, g, b] = [color.r, color.g, color.b];
    ui.horizontal(|ui| {
        ui.add(egui::Slider::new(&mut r, 0.0..=1.0).text("R"));
        ui.add(egui::Slider::new(&mut g, 0.0..=1.0).text("G"));
        ui.add(egui::Slider::new(&mut b, 0.0..=1.0).text("B"));
    });
    *color = Color::new(r, g, b);
}
