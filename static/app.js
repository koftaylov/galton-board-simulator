const ballsInput = document.getElementById('balls');
const levelsInput = document.getElementById('levels');
const speedInput = document.getElementById('speed');
const biasInput = document.getElementById('bias');
const biasValueInput = document.getElementById('biasValue');
const generateButton = document.getElementById('generate');
const stopButton = document.getElementById('stop');
const soundModeInputs = Array.from(document.querySelectorAll('input[name="soundMode"]'));
const pathToggle = document.getElementById('pathToggle');
const turnColorToggle = document.getElementById('turnColorToggle');
const wildcardTypeInputs = Array.from(document.querySelectorAll('input[name="wildcardType"]'));
const launchModeInputs = Array.from(document.querySelectorAll('input[name="launchMode"]'));
const launchCounter = document.getElementById('launchCounter');
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
let savedTrails = [];
const pathCanvas = document.createElement('canvas');
const pathCtx = pathCanvas.getContext('2d');

const PEG_R = 6;
const BALL_R = 8;
const START_COLOR = { r: 56, g: 189, b: 248 };
const LEFT_TURN_COLOR = { r: 249, g: 115, b: 22 };
const RIGHT_TURN_COLOR = { r: 168, g: 85, b: 247 };
const HISTOGRAM_RESERVED_HEIGHT = 144;
const BASE_CANVAS_HEIGHT = 568;
const BASE_LEVELS = 12;
const BASE_TOP = 48;
const BASE_ROW_SPACING = (BASE_CANVAS_HEIGHT - HISTOGRAM_RESERVED_HEIGHT - BASE_TOP) / (BASE_LEVELS + 1);

const WILDCARD_COLORS = {
  mirror: '#06b6d4',      // cyan-400
  magnet: '#ef4444',      // red-500
  repeller: '#3b82f6',    // blue-500
  teleporter: '#a855f7',  // purple-500
  splitter: '#10b981',    // emerald-500
  sticky: '#f59e0b',      // amber-500
  chaos: '#ec4899',       // pink-500
  wildcard: '#ffffff',    // white
};

const getSoundMode = () => soundModeInputs.find(input => input.checked)?.value || 'off';
const getSelectedWildcardTypes = () => wildcardTypeInputs
  .filter(input => input.checked)
  .map(input => input.value);
const playClickIfEnabled = () => {
  if (getSoundMode() === 'off') return;
  try {
    if (!window._clickPlayer) window._clickPlayer = createClickPlayer();
    window._clickPlayer.play(0.8);
  } catch (e) {
    // ignore
  }
};
const playTurnSoundIfEnabled = (direction, levelIndex = 0) => {
  const soundMode = getSoundMode();
  if (soundMode === 'off') return;
  try {
    if (!window._clickPlayer) window._clickPlayer = createClickPlayer();
    if (soundMode === 'sonification') {
      window._clickPlayer.playTurn(direction, 0.65);
    } else if (soundMode === 'levels') {
      window._clickPlayer.playLevel(levelIndex, 0.62);
    } else {
      window._clickPlayer.play(0.55);
    }
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

  const playTurn = (direction, volume = 1) => {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    const now = ac.currentTime;
    osc.type = 'sine';
    osc.frequency.value = direction === 'right' ? 660 : 392;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, 0.035 * volume), now + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
    osc.connect(g);
    g.connect(ac.destination);
    osc.start(now);
    osc.stop(now + 0.11);
  };

  const playLevel = (levelIndex, volume = 1) => {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    const now = ac.currentTime;
    osc.type = 'triangle';
    osc.frequency.value = 220 * Math.pow(2, Math.min(levelIndex, 18) / 12);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, 0.032 * volume), now + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.085);
    osc.connect(g);
    g.connect(ac.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  };

  return { play, playTurn, playLevel };
};

const resizeCanvas = () => {
  const rect = boardCanvas.getBoundingClientRect();
  boardCanvas.width = Math.floor(rect.width * devicePixelRatio);
  boardCanvas.height = Math.floor(rect.height * devicePixelRatio);
  pathCanvas.width = boardCanvas.width;
  pathCanvas.height = boardCanvas.height;
  pathCtx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  if (currentLayout) drawBoard(currentLayout, currentAnimation?.active || null);
};

window.addEventListener('resize', resizeCanvas);

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const getRightBias = () => clamp(parseInt(biasInput?.value, 10) || 0, 0, 100) / 100;
const blendColors = (base, next, amount) => ({
  r: Math.round(base.r + (next.r - base.r) * amount),
  g: Math.round(base.g + (next.g - base.g) * amount),
  b: Math.round(base.b + (next.b - base.b) * amount),
});
const colorToRgb = (color) => `rgb(${color.r}, ${color.g}, ${color.b})`;
const colorToRgba = (color, alpha) => `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
const getBallColor = (ball) => turnColorToggle?.checked ? ball.color : START_COLOR;
const getTrailColor = (ball) => turnColorToggle?.checked ? ball.color : { r: 74, g: 222, b: 128 };

const updateCanvasHeight = (levels) => {
  const height = Math.ceil(BASE_TOP + HISTOGRAM_RESERVED_HEIGHT + BASE_ROW_SPACING * (levels + 1));
  boardCanvas.style.height = `${Math.max(BASE_CANVAS_HEIGHT, height)}px`;
};

const clearSavedPaths = () => {
  savedTrails = [];
  const width = pathCanvas.width / devicePixelRatio;
  const height = pathCanvas.height / devicePixelRatio;
  pathCtx.clearRect(0, 0, width, height);
};

const repaintSavedPaths = () => {
  const width = pathCanvas.width / devicePixelRatio;
  const height = pathCanvas.height / devicePixelRatio;
  pathCtx.clearRect(0, 0, width, height);
  for (const saved of savedTrails) {
    drawSoftTrail(pathCtx, saved.trail, 0.85, turnColorToggle?.checked ? saved.color : { r: 74, g: 222, b: 128 });
  }
};

const drawSoftTrail = (targetCtx, trail, opacity = 1, color = { r: 74, g: 222, b: 128 }) => {
  if (!trail || trail.length < 2) return;
  targetCtx.save();
  targetCtx.lineCap = 'round';
  targetCtx.lineJoin = 'round';
  targetCtx.shadowColor = colorToRgba(color, 0.22 * opacity);
  targetCtx.shadowBlur = 12;
  targetCtx.strokeStyle = colorToRgba(color, 0.16 * opacity);
  targetCtx.lineWidth = 10;
  targetCtx.beginPath();
  targetCtx.moveTo(trail[0].x, trail[0].y);
  for (let i = 1; i < trail.length; i += 1) {
    const prev = trail[i - 1];
    const point = trail[i];
    const midX = (prev.x + point.x) / 2;
    const midY = (prev.y + point.y) / 2;
    targetCtx.quadraticCurveTo(prev.x, prev.y, midX, midY);
  }
  const last = trail[trail.length - 1];
  targetCtx.lineTo(last.x, last.y);
  targetCtx.stroke();

  targetCtx.shadowBlur = 0;
  targetCtx.strokeStyle = colorToRgba(color, 0.18 * opacity);
  targetCtx.lineWidth = 3;
  targetCtx.stroke();
  targetCtx.restore();
};

const savePathTrail = (path, color) => {
  if (!path || path.length < 2) return;
  savedTrails.push({ trail: path.map(point => ({ ...point })), color });
  repaintSavedPaths();
};

const buildLayout = (levels) => {
  const width = boardCanvas.width / devicePixelRatio;
  const height = boardCanvas.height / devicePixelRatio;
  const top = 48;
  const bottom = height - HISTOGRAM_RESERVED_HEIGHT;
  const rowSpacing = (bottom - top) / (levels + 1);
  const pegSpacing = Math.min(54, width / (levels + 4));
  const center = width / 2;
  const rows = [];
  
  // All possible types for random assignment
  const wildcardPool = ['mirror', 'magnet', 'repeller', 'teleporter', 'chaos'];

  for (let row = 0; row < levels; row += 1) {
    const items = row + 1;
    const y = top + row * rowSpacing;
    const rowPositions = [];
    for (let col = 0; col < items; col += 1) {
      const x = center + (col - row / 2) * pegSpacing;
      let type = 'normal';
      
      // Assign wildcard type with ~15% probability
      if (Math.random() < 0.15) {
        type = wildcardPool[Math.floor(Math.random() * wildcardPool.length)];
      }
      rowPositions.push({ x, y, type });
    }
    rows.push(rowPositions);
  }

  return { width, height, top, bottom, rowSpacing, pegSpacing, center, rows };
};

const simulateBallPath = (levels, rightBias) => {
  let index = 0;
  let color = { ...START_COLOR };
  const path = [{ x: currentLayout.center, y: currentLayout.top - (BALL_R + 6) }];
  const turns = [];
  const selectedWildcards = getSelectedWildcardTypes();
  const wildcardActive = selectedWildcards.includes('wildcard');

  for (let row = 0; row < levels; row += 1) {
    const peg = currentLayout.rows[row][index];
    // target just touching the peg so ball appears to contact it
    const touchY = peg.y - (PEG_R + BALL_R - 1);
    path.push({ x: peg.x, y: touchY });
    
    let moveRight = Math.random() < rightBias;

    // Apply effect if specific type is selected OR if the generic 'Wildcard' randomizer is selected
    const isEffectEnabled = peg.type !== 'normal' && (selectedWildcards.includes(peg.type) || wildcardActive);

    if (isEffectEnabled) {
      // Wildcard: Mirror
      if (peg.type === 'mirror') {
        moveRight = !moveRight;
      }
      // Wildcard: Magnet (pull toward center)
      else if (peg.type === 'magnet') {
        if (index < row / 2) moveRight = true;
        else if (index > row / 2) moveRight = false;
      }
      // Wildcard: Repeller (push away from center)
      else if (peg.type === 'repeller') {
        if (index < row / 2) moveRight = false;
        else if (index > row / 2) moveRight = true;
        else moveRight = Math.random() < 0.5; // at center, push randomly
      }
      // Wildcard: Chaos (ignore bias)
      else if (peg.type === 'chaos') {
        moveRight = Math.random() < 0.5;
      }
      // Wildcard: Teleporter (jump to another valid peg position at same level)
      else if (peg.type === 'teleporter') {
        index = Math.floor(Math.random() * (row + 1));
        const targetPeg = currentLayout.rows[row][index];
        path.push({ x: targetPeg.x, y: targetPeg.y - (PEG_R + BALL_R - 1), jump: true });
      }
    }

    turns.push(moveRight ? 'right' : 'left');
    color = blendColors(color, moveRight ? RIGHT_TURN_COLOR : LEFT_TURN_COLOR, 0.18);
    if (moveRight) index += 1;
  }

  const finalX = currentLayout.center + (index - levels / 2) * currentLayout.pegSpacing;
  path.push({ x: finalX, y: currentLayout.bottom + 18 });

  return { path, bin: index, color, turns };
};

// renderStats removed - stats cards removed from UI per user request
const renderStats = (balls, levels, bins) => {};

const getLaunchMode = () => launchModeInputs.find(input => input.checked)?.value || 'finish';
const isAvalancheMode = (launchMode) => launchMode === 'avalanche' || launchMode === 'machineGun';
const getLaunchLevel = (launchMode) => {
  if (launchMode === 'level2') return 2;
  if (launchMode === 'level5') return 5;
  return null;
};
const getFramesPerStep = () => {
  const speed = speedInput?.value || 'normal';
  if (speed === 'slow') return 42;
  if (speed === 'fast') return 4;
  return 14;
};
const getAvalancheLaunchGapFrames = () => {
  const speed = speedInput?.value || 'normal';
  if (speed === 'slow') return 10;
  if (speed === 'fast') return 1;
  return 4;
};
const updateLaunchCounter = (launched, total) => {
  if (!launchCounter) return;
  launchCounter.textContent = `Launched ${launched} / ${total}`;
};
const syncBiasInputs = (source) => {
  const value = clamp(parseInt(source.value, 10) || 0, 0, 100);
  biasInput.value = value;
  biasValueInput.value = value;
};

const drawBoard = (layout, activeBall = null) => {
  ctx.clearRect(0, 0, layout.width, layout.height);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, layout.width, layout.height);

  if (pathToggle?.checked) {
    ctx.drawImage(pathCanvas, 0, 0, layout.width, layout.height);
    const activeBalls = Array.isArray(activeBall) ? activeBall : activeBall ? [activeBall] : [];
    for (const ball of activeBalls) {
      drawSoftTrail(ctx, ball.trail, 1, getTrailColor(ball));
    }
  }

  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
  // baseline and tick marks removed to keep canvas minimal per user request

  const selectedWildcards = getSelectedWildcardTypes();
  const wildcardActive = selectedWildcards.includes('wildcard');

  for (const row of layout.rows) {
    for (const peg of row) {
      ctx.beginPath();
      // Only show color if the specific wildcard type is enabled OR if the random 'Wildcard' toggle is on
      const isEnabled = peg.type && peg.type !== 'normal' && (selectedWildcards.includes(peg.type) || wildcardActive);
      ctx.fillStyle = (isEnabled && WILDCARD_COLORS[peg.type]) ? WILDCARD_COLORS[peg.type] : '#94a3b8';
      ctx.arc(peg.x, peg.y, PEG_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = isEnabled ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)';
      ctx.stroke();
    }
  }

  const activeBalls = Array.isArray(activeBall) ? activeBall : activeBall ? [activeBall] : [];
  for (const ball of activeBalls) {
    const ballColor = getBallColor(ball);
    ctx.beginPath();
    ctx.fillStyle = colorToRgb(ballColor);
    ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = colorToRgba(ballColor, 0.65);
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

const runAnimation = (totalBalls, levels, layout) => {
  let nextIndex = 0;
  let landedCount = 0;
  let frameCount = 0;
  let launchedCount = 0;
  const activeBalls = [];
  const animationBins = Array(levels + 1).fill(0);

  const clearAllTimeouts = () => { timeoutIds.forEach(id => clearTimeout(id)); timeoutIds = []; };

  const makeActiveBall = (index, result) => {
    return {
      index,
      path: result.path,
      bin: result.bin,
      color: result.color,
      turns: result.turns,
      step: 0,
      progress: 0,
      x: result.path[0].x,
      y: result.path[0].y,
      amplitude: 18,
      spawnedNext: false,
      trail: [{ x: result.path[0].x, y: result.path[0].y }],
    };
  };

  const startNextBall = () => {
    if (nextIndex >= totalBalls) return null;
    const active = makeActiveBall(nextIndex, simulateBallPath(levels, getRightBias()));
    activeBalls.push(active);
    nextIndex += 1;
    launchedCount += 1;
    updateLaunchCounter(launchedCount, totalBalls);
    return active;
  };

  const completeAnimation = () => {
    boardStatus.textContent = 'Simulation complete';
    currentAnimation = { active: null };
    drawBoard(layout, null);
    drawBinsOnCanvas(layout, animationBins);
    generateButton.disabled = false;
  };

  const startAnimation = () => {
    if (cancelFlag) {
      boardStatus.textContent = 'Stopped';
      generateButton.disabled = false;
      clearAllTimeouts();
      return;
    }

    if (totalBalls === 0) {
      completeAnimation();
      return;
    }

    if (getLaunchMode() === 'all') {
      while (nextIndex < totalBalls) startNextBall();
    } else {
      startNextBall();
    }

    boardStatus.textContent = `Animating ${totalBalls} ball${totalBalls === 1 ? '' : 's'}`;
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
      if (nextIndex >= totalBalls) completeAnimation();
      return;
    }

    const launchMode = getLaunchMode();
    frameCount += 1;
    if (nextIndex < totalBalls) {
      if (launchMode === 'all') {
        while (nextIndex < totalBalls) startNextBall();
      } else if (isAvalancheMode(launchMode) && frameCount % getAvalancheLaunchGapFrames() === 0) {
        startNextBall();
      }
    }

    let shouldPlayLanding = false;

    for (let i = activeBalls.length - 1; i >= 0; i -= 1) {
      const active = activeBalls[i];
      const from = active.path[active.step];
      const to = active.path[active.step + 1];
      const framesPerStep = getFramesPerStep();
      active.progress += 1 / framesPerStep;
      const t = Math.min(active.progress, 1);
      const arc = Math.sin(Math.PI * t) * active.amplitude;
      active.x = from.x + (to.x - from.x) * t;
      active.y = from.y + (to.y - from.y) * t - arc;
      const lastTrailPoint = active.trail[active.trail.length - 1];
      const dx = active.x - lastTrailPoint.x;
      const dy = active.y - lastTrailPoint.y;
      if ((dx * dx) + (dy * dy) >= 16) {
        active.trail.push({ x: active.x, y: active.y });
      }

      if (t >= 1) {
        active.step += 1;
        active.progress = 0;
        const turnDirection = active.turns[active.step - 1];
        if (turnDirection) {
          playTurnSoundIfEnabled(turnDirection, active.step - 1);
        }
        const launchLevel = getLaunchLevel(launchMode);

        if (
          launchLevel &&
          !active.spawnedNext &&
          active.index === nextIndex - 1 &&
          active.step >= Math.min(launchLevel, active.path.length - 1)
        ) {
          active.spawnedNext = true;
          startNextBall();
        }

        if (active.step >= active.path.length - 1) {
          animationBins[active.bin] += 1;
          active.trail.push({ x: active.x, y: active.y });
          savePathTrail(active.trail, active.color);
          landedCount += 1;
          shouldPlayLanding = true;
          activeBalls.splice(i, 1);

          if (launchMode === 'finish' && active.index === nextIndex - 1) startNextBall();
        }
      }
    }

    if (shouldPlayLanding) playClickIfEnabled();

    currentAnimation = { active: activeBalls };
    boardStatus.textContent = `Animating ball ${Math.min(nextIndex, totalBalls)} of ${totalBalls}`;
    drawBoard(layout, activeBalls);
    // draw current animated bin counts under the board
    drawBinsOnCanvas(layout, animationBins);

    if (landedCount >= totalBalls) {
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
  boardStatus.textContent = 'Stopped';
  if (currentAnimation) currentAnimation.active = [];
};

const startSimulation = () => {
  // Stop existing simulation if any
  stopSimulation();

  // Reset for new simulation
  cancelFlag = false;
  timeoutIds = [];
  const balls = clamp(parseInt(ballsInput.value, 10) || 200, 1, 1000000);
  const levels = clamp(parseInt(levelsInput.value, 10) || 12, 1, 20);
  updateLaunchCounter(0, balls);
  updateCanvasHeight(levels);

  boardStatus.textContent = 'Simulating...';

  currentLayout = null;
  resizeCanvas();
  clearSavedPaths();
  currentLayout = buildLayout(levels);

  renderStats(balls, levels, Array(levels + 1).fill(0));
  // show empty canvas histogram initially (no bars until balls land)

  currentAnimation = { active: null };
  drawBoard(currentLayout, null);
  drawBinsOnCanvas(currentLayout, Array(levels + 1).fill(0));
  runAnimation(balls, levels, currentLayout);
};

generateButton.addEventListener('click', startSimulation);
stopButton.addEventListener('click', stopSimulation);
pathToggle.addEventListener('change', () => {
  if (currentLayout) drawBoard(currentLayout, currentAnimation?.active || null);
});
turnColorToggle.addEventListener('change', () => {
  repaintSavedPaths();
  if (currentLayout) drawBoard(currentLayout, currentAnimation?.active || null);
});
wildcardTypeInputs.forEach(input => {
  input.addEventListener('change', () => {
    // If not animating, we can refresh the layout to show new peg types immediately
    if (!currentAnimation || !currentAnimation.active || currentAnimation.active.length === 0) {
      const levels = clamp(parseInt(levelsInput.value, 10) || 12, 1, 20);
      currentLayout = buildLayout(levels);
      drawBoard(currentLayout, null);
      drawBinsOnCanvas(currentLayout, Array(levels + 1).fill(0));
    } else {
      // If animating, just redraw to update peg colors visually
      drawBoard(currentLayout, currentAnimation.active);
    }
  });
});
levelsInput.addEventListener('change', () => {
  const levels = clamp(parseInt(levelsInput.value, 10) || 12, 1, 20);
  updateCanvasHeight(levels);
  resizeCanvas();
  clearSavedPaths();
  if (!currentAnimation || !currentAnimation.active || currentAnimation.active.length === 0) {
    currentLayout = buildLayout(levels);
    drawBoard(currentLayout, null);
    drawBinsOnCanvas(currentLayout, Array(levels + 1).fill(0));
  }
});
biasInput.addEventListener('input', () => {
  syncBiasInputs(biasInput);
  if (!currentAnimation || !currentAnimation.active || currentAnimation.active.length === 0) {
    if (currentLayout) drawBoard(currentLayout, null);
  }
});
biasValueInput.addEventListener('input', () => {
  syncBiasInputs(biasValueInput);
  if (!currentAnimation || !currentAnimation.active || currentAnimation.active.length === 0) {
    if (currentLayout) drawBoard(currentLayout, null);
  }
});
window.addEventListener('DOMContentLoaded', () => {
  syncBiasInputs(biasInput);
  updateCanvasHeight(clamp(parseInt(levelsInput.value, 10) || 12, 1, 20));
  resizeCanvas();
  startSimulation();
});
