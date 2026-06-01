# Standard Distribution Visualization

A high-performance desktop application that visualizes the Galton board (bean machine) - a classic demonstration of the normal distribution using balls dropping through obstacle levels.

## Features

- **12 Obstacle Levels** and **13 Baskets** arranged in a triangular plinko-style board
- **3 Launch Modes**: 
  - One-by-one: Next ball spawns after previous lands
  - Next Level: Next ball spawns when previous reaches next level
  - All Together: Launch all balls simultaneously
- **Ball Counts**: 1, 10, 100, 1K, 10K, 100K, 1M, and unlimited
- **Adaptive Histogram**: Real-time bar chart showing ball distribution across baskets
- **Sound Effects**: Toggle bounce sounds with multiple sound options
- **Customization**: Color pickers for balls and histogram bars
- **High Performance**: GPU-accelerated rendering handles up to 1,000,000 balls

## Technology Stack

- **Language**: Rust
- **Rendering**: wgpu (cross-platform GPU acceleration)
- **UI**: egui (immediate-mode GUI)
- **Audio**: rodio (sound playback)
- **Build**: Cargo

### Alternative Python Web Version

A lightweight Python + FastAPI version is also included.
- `app.py` serves a browser-based histogram UI
- `static/` contains HTML, CSS, and JavaScript UI assets
- `requirements.txt` lists `fastapi` and `uvicorn`

## Project Structure

```
standard_distribution_vis/
├── Cargo.toml                 # Project manifest and dependencies
├── src/
│   ├── main.rs               # Application entry point
│   ├── app.rs                # UI controls and layout (egui)
│   ├── simulation.rs         # Ball physics and launch logic
│   ├── render.rs             # GPU rendering pipeline (wgpu)
│   ├── audio.rs              # Sound playback and management
│   └── types.rs              # Shared data structures
└── assets/
    └── sounds/
        ├── bounce1.wav       # Primary bounce sound
        ├── bounce2.wav       # Alternative bounce sound
        └── metronome.wav     # Metronome tick sound
```

## Getting Started

### Prerequisites

- Rust 1.70+ ([Install from rustup.rs](https://rustup.rs/))
- A GPU supporting modern graphics APIs (DirectX 12, Metal, or Vulkan)

### Installation & Build

1. Clone or download this project
2. Navigate to the project directory:
   ```bash
   cd standard_distribution_vis
   ```
3. Build the project:
   ```bash
   cargo build --release
   ```
4. Run the application:
   ```bash
   cargo run --release
   ```

### Python + FastAPI version

If you prefer a browser-based Python alternative, install dependencies and run the FastAPI server:

```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app:app --reload
```

Then open http://127.0.0.1:8000 in your browser.

## Usage

1. **Launch Mode**: Select how balls should spawn
   - One by One: Smooth, sequential visualization
   - Next Level: Medium-speed pipelining
   - All Together: Fast bulk simulation

2. **Ball Count**: Choose the number of balls to drop
   - Small counts (1-100) for detailed observation
   - Large counts (100K-1M) for statistical distribution

3. **Sound**: Toggle bounce sounds on/off; select sound type

4. **Colors**: Use color pickers to customize:
   - Ball color: Main visualization color
   - Bar color: Histogram bar fill color

5. **Controls**:
   - **Start**: Begin the simulation with selected settings
   - **Pause**: Temporarily stop animation
   - **Reset**: Clear all balls and restart

## Simulation Details

### The Galton Board

Each ball bounces randomly left or right at each obstacle level:
- 12 levels of pegs (rows 0-11)
- Each row has one more peg than the previous
- At each peg, a ball goes either left or right with equal probability
- Results in a 13-bin distribution at the bottom

The resulting distribution approaches a normal (Gaussian) curve as the number of balls increases, demonstrating the Central Limit Theorem.

### Performance Optimization

For large ball counts (100K+):
- Visible balls are animated for visual feedback
- Remaining ball outcomes are batch-simulated for performance
- GPU instancing renders thousands of balls efficiently
- Histogram updates remain responsive

## Development

### Build Debug Version

```bash
cargo build
cargo run
```

### Run with Logging

```bash
RUST_LOG=debug cargo run --release
```

### Benchmark Large Counts

Test with 1,000,000 balls to verify performance:
1. Launch the app
2. Set ball count to 1,000,000
3. Select "All Together" launch mode
4. Click Start and monitor responsiveness

## Future Enhancements

- [ ] Export histogram data to CSV
- [ ] Replay and animation controls
- [ ] Multiple color schemes and themes
- [ ] Statistical analysis overlay
- [ ] Save/load simulation states
- [ ] Cross-platform binary builds

## License

This project is provided as-is for educational and visualization purposes.

## References

- [Galton Board (Wikipedia)](https://en.wikipedia.org/wiki/Galton_board)
- [Central Limit Theorem](https://en.wikipedia.org/wiki/Central_limit_theorem)
- [wgpu Documentation](https://docs.rs/wgpu/)
- [egui Documentation](https://docs.rs/egui/)
