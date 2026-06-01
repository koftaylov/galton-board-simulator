const ballsInput = document.getElementById('balls');
const levelsInput = document.getElementById('levels');
const generateButton = document.getElementById('generate');
const stopButton = document.getElementById('stop');
const soundToggle = document.getElementById('soundToggle');
const launchModeInputs = Array.from(document.querySelectorAll('input[name="launchMode"]'));
const boardCanvas = document.getElementById('boardCanvas');
const boardStatus = document.getElementById('boardStatus');
const ctx = boardCanvas.getContext('2d');
const labelsContainer = document.getElementById('labels');

const devicePixelRatio = window.devicePixelRatio || 1;
let currentAnimation = null;
let currentLayout = null;
let cancelFlag = false;
let rafId = null;
let timeoutIds = [];

const PEG_R = 6;
const BALL_R = 8;

const playClickIfEnabled = () => {
  if (!soundToggle.checked) return;
  try {
    if (!window._clickPlayer) window._clickPlayer = createClickPlayer();
    window._clickPlayer.play(0.8);
  } catch (e) {
    // ignore
  }
};
// Create a percussive noise-based click player (short burst + lowpass)
const createClickPlayer = () => {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const ac = new AudioCtx();

  const play = (volume = 1) => {
    const dur = 0.06;
    const sr = ac.sampleRate;
    const len = Math.floor(sr * dur);
    const buffer = ac.createBuffer(1, len, sr);
    const data = buffer.getChannelData(0);
    // short noise burst with exponential decay
    for (let i = 0; i < len; i++) {
      const t = i / len;
      const env = Math.exp(-12 * t);
      // white noise attenuated and windowed
      data[i] = (Math.random() * 2 - 1) * env * 0.8;
    }

    const src = ac.createBufferSource();
    src.buffer = buffer;
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1800;

    const g = ac.createGain();
    g.gain.value = 0.0001;
    // quick ramp
    const now = ac.currentTime;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, 0.1 * volume), now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    src.connect(lp);
    lp.connect(g);
    g.connect(ac.destination);
    src.start();
    src.stop(now + dur + 0.01);
  };

  return { play };
};

const resizeCanvas = () => {
  const rect = boardCanvas.getBoundingClientRect();
  boardCanvas.width = Math.floor(rect.width * devicePixelRatio);
  boardCanvas.height = Math.floor(rect.height * devicePixelRatio);
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  if (currentLayout) drawBoard(currentLayout, currentAnimation?.active || null);
};

window.addEventListener('resize', resizeCanvas);

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const buildLayout = (levels) => {
  const width = boardCanvas.width / devicePixelRatio;
  const height = boardCanvas.height / devicePixelRatio;
  const top = 48;
  const bottom = height - 96;
  const rowSpacing = (bottom - top) / (levels + 1);
  const pegSpacing = Math.min(54, width / (levels + 4));
  const center = width / 2;
  const rows = [];

  for (let row = 0; row < levels; row += 1) {
    const items = row + 1;
    const y = top + row * rowSpacing;
    const rowPositions = [];
    for (let col = 0; col < items; col += 1) {
      const x = center + (col - row / 2) * pegSpacing;
      rowPositions.push({ x, y });
    }
    rows.push(rowPositions);
  }

  return { width, height, top, bottom, rowSpacing, pegSpacing, center, rows };
};

const simulateBoard = (balls, levels) => {
  const bins = Array(levels + 1).fill(0);
  const paths = [];
  const maxAnimated = Math.min(240, balls);

  for (let i = 0; i < balls; i += 1) {
    let index = 0;
    const path = [{ x: currentLayout.center, y: currentLayout.top - (BALL_R + 6) }];

    for (let row = 0; row < levels; row += 1) {
      const peg = currentLayout.rows[row][index];
      // target just touching the peg so ball appears to contact it
      const touchY = peg.y - (PEG_R + BALL_R - 1);
      path.push({ x: peg.x, y: touchY });
      const moveRight = Math.random() < 0.5;
      if (moveRight) index += 1;
    }

    const finalX = currentLayout.center + (index - levels / 2) * currentLayout.pegSpacing;
    path.push({ x: finalX, y: currentLayout.bottom + 18 });
    bins[index] += 1;
    if (paths.length < maxAnimated) paths.push({ path, bin: index });
  }

  return { bins, paths };
};

// renderStats removed - stats cards removed from UI per user request
const renderStats = (balls, levels, bins) => {};

const getLaunchMode = () => launchModeInputs.find(input => input.checked)?.value || 'finish';
const isAvalancheMode = (launchMode) => launchMode === 'avalanche' || launchMode === 'machineGun';

const drawBoard = (layout, activeBall = null) => {
  ctx.clearRect(0, 0, layout.width, layout.height);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, layout.width, layout.height);

  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
  // baseline and tick marks removed to keep canvas minimal per user request

  for (const row of layout.rows) {
    for (const peg of row) {
      ctx.beginPath();
      ctx.fillStyle = '#94a3b8';
      ctx.arc(peg.x, peg.y, PEG_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.stroke();
    }
  }

  const activeBalls = Array.isArray(activeBall) ? activeBall : activeBall ? [activeBall] : [];
  for (const ball of activeBalls) {
    ctx.beginPath();
    ctx.fillStyle = '#38bdf8';
    ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#7dd3fc';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
};

// Draw buckets and histogram bars on the canvas so they align perfectly
const drawBinsOnCanvas = (layout, bins) => {
  if (!bins) return;
  const areaTop = layout.bottom + 8;
  const areaBottom = layout.height - 8;
  const areaHeight = Math.max(48, areaBottom - areaTop);

  const max = Math.max(...bins, 1);
  const binCount = bins.length;
  const total = bins.reduce((s, v) => s + v, 0) || 0;

  // draw bars
  for (let i = 0; i < binCount; i++) {
    const xCenter = layout.center + (i - (binCount - 1) / 2) * layout.pegSpacing;
    const w = Math.floor(layout.pegSpacing * 0.6);
    const left = xCenter - w / 2;
    const value = bins[i];
    const h = Math.round((value / max) * (areaHeight - 8));
    if (value > 0) {
      ctx.fillStyle = 'rgba(96,165,250,0.95)';
      ctx.fillRect(left, areaBottom - h, w, h);
    }
  }

  // render labels in DOM so they are never clipped by canvas
  renderLabels(bins, layout);
};

const renderLabels = (bins, layout) => {
  if (!labelsContainer || !layout) return;
  const columnWidth = Math.floor(layout.pegSpacing);
  labelsContainer.style.width = `${bins.length * columnWidth}px`;
  labelsContainer.innerHTML = '';
  const total = bins.reduce((s, v) => s + v, 0) || 0;
  for (let i = 0; i < bins.length; i++) {
    const value = bins[i];
    const pct = total > 0 ? Math.round((value / total) * 100) : 0;
    const el = document.createElement('div');
    el.className = 'label';
    el.style.width = `${columnWidth}px`;
    el.innerHTML = `<div class="pct">${pct}%</div><div class="cnt">${value}</div>`;
    labelsContainer.appendChild(el);
  }
};

const runAnimation = (paths, layout, bins, launchMode) => {
  let nextIndex = 0;
  let landedCount = 0;
  let frameCount = 0;
  const activeBalls = [];
  const framesPerStep = 14;
  const avalancheLaunchGapFrames = 4;
  const animationBins = Array(bins.length).fill(0);

  const clearAllTimeouts = () => { timeoutIds.forEach(id => clearTimeout(id)); timeoutIds = []; };

  const makeActiveBall = (index) => {
    const path = paths[index].path;
    const triggerStep = Math.min(5, path.length - 1);
    return {
      index,
      path,
      triggerStep,
      step: 0,
      progress: 0,
      x: path[0].x,
      y: path[0].y,
      amplitude: 18,
      spawnedNext: false,
    };
  };

  const startNextBall = () => {
    if (nextIndex >= paths.length) return null;
    const active = makeActiveBall(nextIndex);
    activeBalls.push(active);
    nextIndex += 1;
    return active;
  };

  const completeAnimation = () => {
    boardStatus.textContent = 'Simulation complete';
    currentAnimation = { active: null };
    drawBoard(layout, null);
    drawBinsOnCanvas(layout, bins);
    generateButton.disabled = false;
  };

  const startAnimation = () => {
    if (cancelFlag) {
      boardStatus.textContent = 'Stopped';
      generateButton.disabled = false;
      clearAllTimeouts();
      return;
    }

    if (paths.length === 0) {
      completeAnimation();
      return;
    }

    if (launchMode === 'all') {
      while (nextIndex < paths.length) startNextBall();
    } else {
      startNextBall();
    }

    boardStatus.textContent = `Animating ${paths.length} ball${paths.length === 1 ? '' : 's'}`;
    currentAnimation = { active: activeBalls };
    rafId = requestAnimationFrame(animateFrame);
  };

  const animateFrame = () => {
    if (cancelFlag) {
      if (rafId) cancelAnimationFrame(rafId);
      boardStatus.textContent = 'Stopped';
      generateButton.disabled = false;
      return;
    }

    if (activeBalls.length === 0) {
      if (nextIndex >= paths.length) completeAnimation();
      return;
    }

    frameCount += 1;
    if (
      isAvalancheMode(launchMode) &&
      nextIndex < paths.length &&
      frameCount % avalancheLaunchGapFrames === 0
    ) {
      startNextBall();
    }

    let shouldPlayImpact = false;

    for (let i = activeBalls.length - 1; i >= 0; i -= 1) {
      const active = activeBalls[i];
      const from = active.path[active.step];
      const to = active.path[active.step + 1];
      active.progress += 1 / framesPerStep;
      const t = Math.min(active.progress, 1);
      const arc = Math.sin(Math.PI * t) * active.amplitude;
      active.x = from.x + (to.x - from.x) * t;
      active.y = from.y + (to.y - from.y) * t - arc;

      if (t >= 1) {
        active.step += 1;
        active.progress = 0;
        shouldPlayImpact = true;

        if (
          launchMode === 'level5' &&
          !active.spawnedNext &&
          active.step >= active.triggerStep
        ) {
          active.spawnedNext = true;
          startNextBall();
        }

        if (active.step >= active.path.length - 1) {
          const bin = paths[active.index].bin;
          animationBins[bin] += 1;
          landedCount += 1;
          activeBalls.splice(i, 1);

          if (launchMode === 'finish') startNextBall();
        }
      }
    }

    if (shouldPlayImpact) playClickIfEnabled();

    currentAnimation = { active: activeBalls };
    boardStatus.textContent = `Animating ball ${Math.min(nextIndex, paths.length)} of ${paths.length}`;
    drawBoard(layout, activeBalls);
    // draw current animated bin counts under the board
    drawBinsOnCanvas(layout, animationBins);

    if (landedCount >= paths.length) {
      completeAnimation();
      return;
    }

    rafId = requestAnimationFrame(animateFrame);
  };

  startAnimation();
};

const stopSimulation = () => {
  cancelFlag = true;
  if (rafId) cancelAnimationFrame(rafId);
  timeoutIds.forEach(id => clearTimeout(id));
  timeoutIds = [];
  boardStatus.textContent = 'Stopping...';
  generateButton.disabled = false;
};

const startSimulation = () => {
  cancelFlag = false;
  timeoutIds = [];
  const balls = clamp(parseInt(ballsInput.value, 10) || 200, 1, 1000000);
  const levels = clamp(parseInt(levelsInput.value, 10) || 12, 1, 20);

  boardStatus.textContent = 'Simulating...';
  generateButton.disabled = true;

  currentLayout = buildLayout(levels);
  resizeCanvas();

  const { bins, paths } = simulateBoard(balls, levels);
  renderStats(balls, levels, bins);
  // show empty canvas histogram initially (no bars until balls land)

  currentAnimation = { active: null };
  drawBoard(currentLayout, null);
  drawBinsOnCanvas(currentLayout, Array(levels + 1).fill(0));
  runAnimation(paths, currentLayout, bins, getLaunchMode());
};

generateButton.addEventListener('click', startSimulation);
stopButton.addEventListener('click', stopSimulation);
window.addEventListener('DOMContentLoaded', () => { resizeCanvas(); startSimulation(); });
