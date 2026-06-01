use serde::{Deserialize, Serialize};
use rand::Rng;
use crate::types::SimSettings;

/// Ball launch modes
#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum LaunchMode {
    OneByOne,
    NextLevel,
    AllTogether,
}

/// Represents a single ball in the simulation
#[derive(Clone, Copy, Debug)]
pub struct Ball {
    pub level: usize,        // Current level (0-12)
    pub x_index: usize,      // Horizontal position at this level
    pub active: bool,        // Is the ball still bouncing?
    pub basket_index: Option<usize>, // Which basket did it end up in (0-12)?
}

/// Main simulation engine
pub struct Simulation {
    balls: Vec<Ball>,
    basket_counts: [usize; 13],
    total_count: usize,
    active_count: usize,
    launch_mode: LaunchMode,
    balls_to_spawn: usize,
    balls_spawned: usize,
    spawn_timer: f32,
    update_count: u32,
}

const NUM_LEVELS: usize = 12;
const NUM_BASKETS: usize = 13;
const SPAWN_INTERVAL: f32 = 0.05; // Time between spawning balls in one-by-one mode

impl Simulation {
    pub fn new() -> Self {
        Self {
            balls: Vec::new(),
            basket_counts: [0; NUM_BASKETS],
            total_count: 0,
            active_count: 0,
            launch_mode: LaunchMode::OneByOne,
            balls_to_spawn: 0,
            balls_spawned: 0,
            spawn_timer: 0.0,
            update_count: 0,
        }
    }

    pub fn new_with_settings(settings: SimSettings) -> Self {
        let mut sim = Self::new();
        sim.launch_mode = settings.launch_mode;
        sim.balls_to_spawn = settings.ball_count;
        sim.basket_counts = [0; NUM_BASKETS];
        sim
    }

    /// Update the simulation by one frame
    pub fn update(&mut self) {
        self.update_count += 1;

        // Spawn new balls based on launch mode
        self.spawn_balls();

        // Update active balls
        self.update_balls();
    }

    fn spawn_balls(&mut self) {
        match self.launch_mode {
            LaunchMode::OneByOne => {
                self.spawn_timer += SPAWN_INTERVAL;
                if self.spawn_timer >= 1.0 && self.balls_spawned < self.balls_to_spawn {
                    let ball = Ball {
                        level: 0,
                        x_index: 0,
                        active: true,
                        basket_index: None,
                    };
                    self.balls.push(ball);
                    self.balls_spawned += 1;
                    self.active_count += 1;
                    self.spawn_timer = 0.0;
                }
            }
            LaunchMode::NextLevel => {
                // Spawn next ball when previous reaches level 1
                // Simplified: spawn in waves matching level transitions
                if self.balls_spawned < self.balls_to_spawn {
                    let balls_at_level_0 = self.balls.iter().filter(|b| b.level == 0 && b.active).count();
                    if balls_at_level_0 < 2 {
                        let ball = Ball {
                            level: 0,
                            x_index: 0,
                            active: true,
                            basket_index: None,
                        };
                        self.balls.push(ball);
                        self.balls_spawned += 1;
                        self.active_count += 1;
                    }
                }
            }
            LaunchMode::AllTogether => {
                // Spawn all balls at once, but in batches to avoid overwhelming
                if self.balls_spawned < self.balls_to_spawn {
                    let batch_size = (self.balls_to_spawn / 10).max(1).min(100);
                    let to_spawn = (batch_size).min(self.balls_to_spawn - self.balls_spawned);
                    
                    for _ in 0..to_spawn {
                        let ball = Ball {
                            level: 0,
                            x_index: 0,
                            active: true,
                            basket_index: None,
                        };
                        self.balls.push(ball);
                        self.balls_spawned += 1;
                        self.active_count += 1;
                    }
                }
            }
        }
    }

    fn update_balls(&mut self) {
        let mut rng = rand::thread_rng();

        for ball in &mut self.balls {
            if !ball.active {
                continue;
            }

            // Move ball to next level with random left/right decision
            if ball.level < NUM_LEVELS {
                ball.level += 1;
                // At each level, randomly choose left (0) or right (1)
                let direction = rng.gen_range(0..=1);
                ball.x_index = (ball.x_index + direction) % (ball.level + 2);
            } else {
                // Ball reached the bottom, assign to basket
                ball.basket_index = Some(ball.x_index % NUM_BASKETS);
                ball.active = false;
                self.active_count -= 1;
            }
        }

        // Update basket counts and total
        let mut new_total = 0;
        for ball in &self.balls {
            if !ball.active {
                if let Some(basket) = ball.basket_index {
                    self.basket_counts[basket] += 1;
                    new_total += 1;
                }
            }
        }
        self.total_count = new_total;

        // Clean up fallen balls periodically
        if self.update_count % 60 == 0 {
            self.balls.retain(|b| b.active);
        }
    }

    pub fn total_count(&self) -> usize {
        self.total_count
    }

    pub fn active_count(&self) -> usize {
        self.active_count
    }

    pub fn bucket_counts(&self) -> &[usize; NUM_BASKETS] {
        &self.basket_counts
    }
}
