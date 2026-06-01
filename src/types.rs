use serde::{Deserialize, Serialize};
use crate::simulation::LaunchMode;

/// Application settings
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct SimSettings {
    pub launch_mode: LaunchMode,
    pub ball_count: usize,
    pub sound_enabled: bool,
}

impl Default for SimSettings {
    fn default() -> Self {
        Self {
            launch_mode: LaunchMode::OneByOne,
            ball_count: 100,
            sound_enabled: true,
        }
    }
}

/// Color representation
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub struct Color {
    pub r: f32,
    pub g: f32,
    pub b: f32,
}

impl Color {
    pub fn new(r: f32, g: f32, b: f32) -> Self {
        Self { r, g, b }
    }
}
