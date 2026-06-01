/// Audio playback module
/// 
/// Handles loading and playing bounce sounds using the rodio library

use rodio::{Decoder, OutputStream, Source};
use std::io::Cursor;

pub struct AudioManager {
    _stream: Option<OutputStream>,
    sound_enabled: bool,
}

impl AudioManager {
    pub fn new() -> Self {
        let stream = OutputStream::try_default().ok();
        Self {
            _stream: stream,
            sound_enabled: true,
        }
    }

    /// Play a bounce sound when a ball hits a peg
    pub fn play_bounce(&self, sound_choice: SoundChoice) {
        if !self.sound_enabled {
            return;
        }

        match sound_choice {
            SoundChoice::Bounce1 => self.play_sound("bounce1.wav"),
            SoundChoice::Bounce2 => self.play_sound("bounce2.wav"),
            SoundChoice::Metronome => self.play_sound("metronome.wav"),
        }
    }

    fn play_sound(&self, _filename: &str) {
        // Load and play the sound file
        // For now, this is a placeholder
    }

    pub fn set_enabled(&mut self, enabled: bool) {
        self.sound_enabled = enabled;
    }
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub enum SoundChoice {
    Bounce1,
    Bounce2,
    Metronome,
}
