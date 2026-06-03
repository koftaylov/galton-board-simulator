const ballsInput = document.getElementById('balls');
const levelsInput = document.getElementById('levels');
const runsInput = document.getElementById('runs');
const speedInput = document.getElementById('speed');
const biasInput = document.getElementById('bias');
const biasValueInput = document.getElementById('biasValue');
const generateButton = document.getElementById('generate');
const pauseButton = document.getElementById('pause');
const stopButton = document.getElementById('stop');
const appShell = document.querySelector('.app-shell');
const settingsPaneToggle = document.getElementById('settingsPaneToggle');
const soundModeInputs = Array.from(document.querySelectorAll('input[name="soundMode"]'));
const pathToggle = document.getElementById('pathToggle');
const turnColorToggle = document.getElementById('turnColorToggle');
const ghostToggle = document.getElementById('ghostToggle');
const saveStatsToggle = document.getElementById('saveStatsToggle');
const lineStatsToggle = document.getElementById('lineStatsToggle');
const barToggle = document.getElementById('barToggle');
const backgroundToggle = document.getElementById('backgroundToggle');
const wildcardTypeInputs = Array.from(document.querySelectorAll('input[name="wildcardType"]'));
const labelStatModeInputs = Array.from(document.querySelectorAll('input[name="labelStatMode"]'));
const currentLabelModeInputs = Array.from(document.querySelectorAll('input[name="currentLabelMode"]'));

const factorials = [1];
const getFactorial = (n) => {
  if (n < 0) return 0;
  if (factorials[n]) return factorials[n];
  for (let i = factorials.length; i <= n; i++) {
    factorials[i] = factorials[i - 1] * i;
  }
  return factorials[n];
};

const getCombinations = (n, k) => {
  if (k < 0 || k > n) return 0;
  // Use a more numerically stable version if levels were high, but 1-20 is fine for direct factorial
  return getFactorial(n) / (getFactorial(k) * getFactorial(n - k));
};

const getBinomialProb = (n, k, p) => {
  return getCombinations(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k);
};
const launchModeInputs = Array.from(document.querySelectorAll('input[name="launchMode"]'));
const launchCounter = document.getElementById('launchCounter');
const boardCanvas = document.getElementById('boardCanvas');
const boardStatus = document.getElementById('boardStatus');
const ctx = boardCanvas.getContext('2d');
const labelsContainer = document.getElementById('labels');

const devicePixelRatio = window.devicePixelRatio || 1;
let currentAnimation = null;
let currentLayout = null;
let currentBins = [];
let cancelFlag = false;
let isPaused = false;
let rafId = null;
let timeoutIds = [];
let savedTrails = [];
let historicalStats = [];
let isPathSavingEnabled = false;
let runsRemaining = 0;
let totalRuns = 1;
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
const getSelectedCurrentLabelModes = () => currentLabelModeInputs
  .filter(input => input.checked && input.value !== 'off')
  .map(input => input.value);
const getSelectedLabelStatModes = () => labelStatModeInputs
  .filter(input => input.checked && input.value !== 'off')
  .map(input => input.value);
const isStatsHistoryEnabled = () => !!saveStatsToggle?.checked || !!lineStatsToggle?.checked || getSelectedLabelStatModes().length > 0;
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
  if (!isPathSavingEnabled || !path || path.length < 2) return;
  savedTrails.push({ trail: path.map(point => ({ ...point })), color });
  repaintSavedPaths();
};

const applyRandomWildcards = () => {
  if (!currentLayout) return;
  const selectedWildcards = getSelectedWildcardTypes();
  
  for (const row of currentLayout.rows) {
    for (const peg of row) {
      if (!peg.manual) {
        peg.type = 'normal';
        if (selectedWildcards.length > 0 && Math.random() < 0.15) {
          let chosen = selectedWildcards[Math.floor(Math.random() * selectedWildcards.length)];
          if (chosen === 'wildcard') {
            const others = selectedWildcards.filter(t => t !== 'wildcard');
            const pool = others.length > 0 ? others : ['mirror', 'magnet', 'repeller', 'teleporter', 'chaos', 'splitter', 'sticky'];
            chosen = pool[Math.floor(Math.random() * pool.length)];
          }
          peg.type = chosen;
        }
      }
    }
  }
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
  
  for (let row = 0; row < levels; row += 1) {
    const items = row + 1;
    const y = top + row * rowSpacing;
    const rowPositions = [];
    for (let col = 0; col < items; col += 1) {
      const x = center + (col - row / 2) * pegSpacing;
      // Start all pegs as 'normal' by default for the manual editor
      rowPositions.push({ x, y, type: 'normal', manual: false });
    }
    rows.push(rowPositions);
  }

  return { width, height, top, bottom, rowSpacing, pegSpacing, center, rows };
};

const simulateBallPath = (levels, rightBias, startRow = 0, startIndex = 0, startColor = null) => {
  let index = startIndex;
  let color = startColor ? { ...startColor } : { ...START_COLOR };
  const path = [];

  // Start point (no row/col metadata)
  if (startRow === 0) {
    path.push({ x: currentLayout.center, y: currentLayout.top - (BALL_R + 6) });
  } else {
    // Starting mid-board (e.g. after a split)
    const prevPeg = currentLayout.rows[startRow - 1][startIndex];
    path.push({ x: prevPeg.x, y: prevPeg.y - (PEG_R + BALL_R - 1) });
  }

  for (let row = startRow; row < levels; row += 1) {
    let peg = currentLayout.rows[row][index];
    let decisionIndex = index;
    const touchY = peg.y - (PEG_R + BALL_R - 1);

    if (peg.type === 'teleporter') {
      path.push({
        x: peg.x,
        y: touchY,
        row,
        col: decisionIndex,
        isTeleport: true,
      });

      decisionIndex = Math.floor(Math.random() * (row + 1));
      peg = currentLayout.rows[row][decisionIndex];
    }
    
    let moveRight = Math.random() < rightBias;

    // Apply effect if it's a special peg
    const isEffectEnabled = peg.type !== 'normal';

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
    }

    // Push the contact point with metadata
    path.push({ 
      x: peg.x, 
      y: peg.y - (PEG_R + BALL_R - 1),
      row, 
      col: decisionIndex,
      turn: moveRight ? 'right' : 'left' 
    });

    color = blendColors(color, moveRight ? RIGHT_TURN_COLOR : LEFT_TURN_COLOR, 0.18);
    index = decisionIndex;
    if (moveRight) index += 1;
  }

  const finalX = currentLayout.center + (index - levels / 2) * currentLayout.pegSpacing;
  const finalBounceY = currentLayout.bottom - Math.min(26, currentLayout.rowSpacing * 0.45);
  path.push({ x: finalX, y: finalBounceY });
  path.push({ x: finalX, y: currentLayout.height - BALL_R - 8, arc: 0, speedScale: 1.35 });

  return { path, bin: index, color };
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
  const currentRunIndex = totalRuns - runsRemaining + 1;
  launchCounter.innerHTML = `
    <span class="counter-label">Run</span>
    <span class="counter-value">${currentRunIndex}</span>
    <span class="counter-separator">/</span>
    <span class="counter-value">${totalRuns}</span>
    <span class="counter-label">Launched</span>
    <span class="counter-value">${launched}</span>
    <span class="counter-separator">/</span>
    <span class="counter-value">${total}</span>
  `;
};
const syncBiasInputs = (source) => {
  const value = clamp(parseInt(source.value, 10) || 0, 0, 100);
  biasInput.value = value;
  biasValueInput.value = value;
};

const drawBoard = (layout, activeBall = null) => {
  ctx.save();
  ctx.clearRect(0, 0, layout.width, layout.height);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, layout.width, layout.height);

  // Strictly follow the initial session setting AND current toggle
  if (isPathSavingEnabled && pathToggle?.checked) {
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
      const isSpecial = peg.type && peg.type !== 'normal';
      
      if (isSpecial) {
        ctx.fillStyle = WILDCARD_COLORS[peg.type] || '#94a3b8';
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      } else {
        ctx.fillStyle = '#94a3b8';
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      }

      ctx.arc(peg.x, peg.y, PEG_R, 0, Math.PI * 2);
      ctx.fill();
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

  // ALWAYS redraw bins and ghost curve if they exist
  if (currentBins && currentBins.length > 0) {
    drawBinsOnCanvas(layout, currentBins);
  }
  ctx.restore();
};

// Draw buckets and histogram bars on the canvas so they align perfectly
const drawBinsOnCanvas = (layout, bins) => {
  if (!bins) return;
  ctx.save();
  const areaTop = layout.bottom + 8;
  const areaBottom = layout.height - 8;
  const areaHeight = Math.max(48, areaBottom - areaTop);

  const getTotal = (values) => values.reduce((sum, value) => sum + value, 0);
  const getRate = (values, index) => {
    const total = getTotal(values);
    return total > 0 ? values[index] / total : 0;
  };

  // Scale by bucket percentage so 10, 200, and 10K ball runs use the same visual scale.
  let maxRate = 0.01;
  const currentTotal = getTotal(bins);
  if (currentTotal > 0) {
    maxRate = Math.max(maxRate, ...bins.map(value => value / currentTotal));
  }
  if (isStatsHistoryEnabled()) {
    for (const histBins of historicalStats) {
      const histTotal = getTotal(histBins);
      if (histTotal > 0) {
        maxRate = Math.max(maxRate, ...histBins.map(value => value / histTotal));
      }
    }
  }

  const binCount = bins.length;

  // Draw historical stats FIRST so they appear behind the current run
  if (saveStatsToggle?.checked || lineStatsToggle?.checked) {
    for (let hIdx = 0; hIdx < historicalStats.length; hIdx++) {
      const histBins = historicalStats[hIdx];
      if (!histBins || histBins.length !== binCount) continue; // Skip mismatched levels
      
      const strokeColor = `rgba(255, 255, 255, ${0.15 + (0.1 * (hIdx % 3))})`;
      ctx.strokeStyle = strokeColor;

      if (saveStatsToggle?.checked) {
        ctx.lineWidth = 1;
        for (let i = 0; i < binCount; i++) {
          const xCenter = layout.center + (i - (binCount - 1) / 2) * layout.pegSpacing;
          const w = Math.floor(layout.pegSpacing * 0.8); // slightly wider for outline
          const left = xCenter - w / 2;
          const rate = getRate(histBins, i);
          const h = Math.round((rate / maxRate) * (areaHeight - 8));
          if (rate > 0) {
            ctx.strokeRect(left, areaBottom - h, w, h);
          }
        }
      }

      if (lineStatsToggle?.checked) {
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < binCount; i++) {
          const xCenter = layout.center + (i - (binCount - 1) / 2) * layout.pegSpacing;
          const rate = getRate(histBins, i);
          const h = Math.round((rate / maxRate) * (areaHeight - 8));
          const y = areaBottom - h;
          if (i === 0) ctx.moveTo(xCenter, y);
          else ctx.lineTo(xCenter, y);
        }
        ctx.stroke();
      }
    }
  }

  // draw bars
  if (barToggle?.checked) {
    for (let i = 0; i < binCount; i++) {
      const xCenter = layout.center + (i - (binCount - 1) / 2) * layout.pegSpacing;
      const w = Math.floor(layout.pegSpacing * 0.6);
      const left = xCenter - w / 2;
      const rate = getRate(bins, i);
      const h = Math.round((rate / maxRate) * (areaHeight - 8));
      if (rate > 0) {
        ctx.fillStyle = 'rgba(96,165,250,0.95)';
        ctx.fillRect(left, areaBottom - h, w, h);
      }
    }
  }

  // render labels in DOM so they are never clipped by canvas
  renderLabels(bins, layout);

  // Draw Ghost Overlay (Binomial Distribution Curve)
  if (ghostToggle?.checked) {
    const levels = binCount - 1;
    const p = getRightBias();
    
    // Calculate theoretical probabilities
    const theoreticalProbs = [];
    let theoreticalMaxProb = 0;
    for (let i = 0; i <= levels; i++) {
      const prob = getBinomialProb(levels, i, p);
      theoreticalProbs.push(prob);
      theoreticalMaxProb = Math.max(theoreticalMaxProb, prob);
    }
    
    ctx.beginPath();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.setLineDash([5, 5]);

    for (let i = 0; i <= levels; i++) {
      const xCenter = layout.center + (i - levels / 2) * layout.pegSpacing;
      // Scale curve height relative to the histogram's max height
      const prob = theoreticalProbs[i];
      const h = (prob / theoreticalMaxProb) * (areaHeight - 8);
      const y = areaBottom - h;
      
      if (i === 0) ctx.moveTo(xCenter, y);
      else {
        ctx.lineTo(xCenter, y);
      }
    }
    ctx.stroke();
  }
  ctx.restore();
};

const renderLabels = (bins, layout) => {
  if (!labelsContainer || !layout) return;
  const columnWidth = Math.floor(layout.pegSpacing);
  labelsContainer.style.width = `${bins.length * columnWidth}px`;
  labelsContainer.innerHTML = '';
  const total = bins.reduce((s, v) => s + v, 0) || 0;
  const currentLabelModes = getSelectedCurrentLabelModes();
  const showRatio = currentLabelModes.includes('ratio');
  const showBalls = currentLabelModes.includes('balls');
  const summaryModes = getSelectedLabelStatModes();
  const statsRuns = historicalStats.filter(values => values && values.length === bins.length);
  const summaryLabels = {
    min: 'min',
    max: 'max',
    avg: 'avg',
    avgPct: 'avg %',
  };
  const formatSummary = (mode, index) => {
    if (statsRuns.length === 0) return '';
    if (mode === 'avgPct') {
      const avgRate = statsRuns.reduce((sum, values) => {
        const runTotal = values.reduce((totalSum, value) => totalSum + value, 0);
        return sum + (runTotal > 0 ? values[index] / runTotal : 0);
      }, 0) / statsRuns.length;
      return `${Math.round(avgRate * 100)}%`;
    }

    const values = statsRuns.map(run => run[index]);
    if (mode === 'min') return `${Math.min(...values)}`;
    if (mode === 'max') return `${Math.max(...values)}`;
    const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
    return `${Number.isInteger(avg) ? avg : avg.toFixed(1)}`;
  };

  if (summaryModes.length > 0) {
    const headings = document.createElement('div');
    headings.className = 'label-summary-headings';
    headings.innerHTML = `${showRatio ? '<div class="pct"></div>' : ''}${showBalls ? '<div class="cnt"></div>' : ''}${summaryModes
      .map(mode => `<div class="summary">${summaryLabels[mode]}</div>`)
      .join('')}`;
    labelsContainer.appendChild(headings);
  }

  for (let i = 0; i < bins.length; i++) {
    const value = bins[i];
    const pct = total > 0 ? Math.round((value / total) * 100) : 0;
    const summaries = summaryModes.map(mode => `<div class="summary">${formatSummary(mode, i)}</div>`).join('');
    const el = document.createElement('div');
    el.className = 'label';
    el.style.width = `${columnWidth}px`;
    el.innerHTML = `${showRatio ? `<div class="pct">${pct}%</div>` : ''}${showBalls ? `<div class="cnt">${value}</div>` : ''}${summaries}`;
    labelsContainer.appendChild(el);
  }
};

const runAnimation = (totalBalls, levels, layout) => {
  let nextIndex = 0;
  let landedCount = 0;
  let frameCount = 0;
  let launchedCount = 0;
  let noVisIndex = 0;
  let lastAnimationTimestamp = null;
  let catchUpRemainderMs = 0;
  const activeBalls = [];
  currentBins = Array(levels + 1).fill(0);
  const FRAME_MS = 1000 / 60;
  const MAX_CATCH_UP_STEPS = 900;

  const clearAllTimeouts = () => { timeoutIds.forEach(id => clearTimeout(id)); timeoutIds = []; };
  const scheduleTimeout = (callback, delay) => {
    const timeoutId = setTimeout(() => {
      timeoutIds = timeoutIds.filter(id => id !== timeoutId);
      callback();
    }, delay);
    timeoutIds.push(timeoutId);
    return timeoutId;
  };
  const getFramesForSegment = (from, to, speedMult = 1) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.sqrt((dx * dx) + (dy * dy));
    const normalDistance = Math.sqrt(Math.pow(layout.pegSpacing / 2, 2) + Math.pow(layout.rowSpacing, 2));
    const distanceRatio = normalDistance > 0 ? distance / normalDistance : 1;
    const speedScale = to.speedScale || 1;
    return Math.max(1, (getFramesPerStep() * speedMult * distanceRatio) / speedScale);
  };
  const getLandingThresholdY = (bin) => {
    const areaBottom = layout.height - 8;
    if (!barToggle?.checked || !currentBins[bin]) return areaBottom - BALL_R;

    const areaTop = layout.bottom + 8;
    const areaHeight = Math.max(48, areaBottom - areaTop);
    const getTotal = (values) => values.reduce((sum, value) => sum + value, 0);
    let maxRate = 0.01;
    const currentTotal = getTotal(currentBins);
    if (currentTotal > 0) {
      maxRate = Math.max(maxRate, ...currentBins.map(value => value / currentTotal));
    }
    if (isStatsHistoryEnabled()) {
      for (const histBins of historicalStats) {
        const histTotal = getTotal(histBins);
        if (histTotal > 0) {
          maxRate = Math.max(maxRate, ...histBins.map(value => value / histTotal));
        }
      }
    }

    const rate = currentTotal > 0 ? currentBins[bin] / currentTotal : 0;
    const barHeight = Math.round((rate / maxRate) * (areaHeight - 8));
    return barHeight > 0 ? areaBottom - barHeight : areaBottom - BALL_R;
  };

  const makeActiveBall = (index, result, startRow = 0) => {
    return {
      index,
      startRow,
      path: result.path,
      bin: result.bin,
      color: result.color,
      step: 0,
      progress: 0,
      x: result.path[0].x,
      y: result.path[0].y,
      amplitude: 18,
      spawnedNext: false,
      stickySteps: 0,
      trail: [{ x: result.path[0].x, y: result.path[0].y }],
    };
  };

  const startNextBall = () => {
    if (nextIndex >= totalBalls) return null;
    const active = makeActiveBall(nextIndex, simulateBallPath(levels, getRightBias()), 0);
    activeBalls.push(active);
    nextIndex += 1;
    launchedCount += 1;
    updateLaunchCounter(launchedCount, totalBalls);
    return active;
  };

  const completeAnimation = () => {
    boardStatus.textContent = 'Simulation complete';
    currentAnimation = { active: null };
    
    // Save current bins to history if either toggle is on
    if (isStatsHistoryEnabled()) {
      historicalStats.push([...currentBins]);
    }

    // Redraw one last time to clear active balls but keep bins
    if (currentLayout) {
      drawBoard(currentLayout, null);
    }
    
    runsRemaining -= 1;
    if (runsRemaining > 0 && !cancelFlag) {
      scheduleTimeout(() => startSimulation(true), 150); // slight delay before next run
    } else {
      generateButton.disabled = false;
    }
  };

  const runNoVisBatch = () => {
    if (cancelFlag) {
      boardStatus.textContent = 'Stopped';
      generateButton.disabled = false;
      clearAllTimeouts();
      return;
    }

    const batchSize = Math.min(5000, totalBalls - noVisIndex);
    const batchEnd = noVisIndex + batchSize;
    for (; noVisIndex < batchEnd; noVisIndex += 1) {
      const result = simulateBallPath(levels, getRightBias());
      currentBins[result.bin] += 1;
      if (isPathSavingEnabled) {
        savePathTrail(result.path, result.color);
      }
    }

    launchedCount = noVisIndex;
    updateLaunchCounter(launchedCount, totalBalls);
    drawBoard(layout, null);

    if (noVisIndex < totalBalls) {
      scheduleTimeout(runNoVisBatch, 0);
      return;
    }

    completeAnimation();
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

    const launchMode = getLaunchMode();

    if (launchMode === 'no-vis') {
      // Batched calculation keeps Stop responsive during large or repeated runs.
      boardStatus.textContent = `Calculating ${totalBalls} balls...`;
      currentAnimation = { active: [] };
      runNoVisBatch();
      return;
    }

    if (launchMode === 'all') {
      while (nextIndex < totalBalls) startNextBall();
    } else {
      startNextBall();
    }

    boardStatus.textContent = `Animating ${totalBalls} ball${totalBalls === 1 ? '' : 's'}`;
    currentAnimation = { active: activeBalls };
    rafId = requestAnimationFrame(animateFrame);
  };

  const advanceAnimationStep = (allowAudio = true) => {
    if (cancelFlag) {
      if (rafId) cancelAnimationFrame(rafId);
      boardStatus.textContent = 'Stopped';
      generateButton.disabled = false;
      return true;
    }

    if (activeBalls.length === 0) {
      if (nextIndex >= totalBalls) completeAnimation();
      return true;
    }

    if (isPaused) {
      return false;
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
      
      // Sticky effect: slow down if the ball is currently stuck
      const speedMult = active.stickySteps > 0 ? 2.5 : 1;
      const framesPerStep = getFramesForSegment(from, to, speedMult);
      
      active.progress += 1 / framesPerStep;
      const t = Math.min(active.progress, 1);
      const segmentAmplitude = to.arc ?? active.amplitude;
      const arc = Math.sin(Math.PI * t) * segmentAmplitude;
      active.x = from.x + (to.x - from.x) * t;
      active.y = from.y + (to.y - from.y) * t - arc;
      const lastTrailPoint = active.trail[active.trail.length - 1];
      const dx = active.x - lastTrailPoint.x;
      const dy = active.y - lastTrailPoint.y;
      if ((dx * dx) + (dy * dy) >= 16) {
        active.trail.push({ x: active.x, y: active.y });
      }

      const isFinalDrop = to.arc === 0 && active.step >= active.path.length - 2;
      const reachedLandingSurface = isFinalDrop && active.y >= getLandingThresholdY(active.bin);

      if (t >= 1 || reachedLandingSurface) {
        active.step += 1;
        active.progress = 0;
        
        // Decrement sticky steps
        if (active.stickySteps > 0) active.stickySteps -= 1;

        const currentPoint = active.path[active.step];

        if (currentPoint && currentPoint.turn) {
          if (allowAudio) playTurnSoundIfEnabled(currentPoint.turn, currentPoint.row);
        }

        // Check for Splitter and Sticky wildcards upon peg contact
        // Metadata is present on contact points (non-jumps)
        if (currentPoint && currentPoint.row !== undefined && active.step < active.path.length - 1) {
          const rowIdx = currentPoint.row;
          const colIdx = currentPoint.col;
          const peg = currentLayout.rows[rowIdx][colIdx];
          
          const isEffectEnabled = peg && peg.type !== 'normal';

          if (isEffectEnabled) {
            if (peg.type === 'sticky') {
              active.stickySteps = 2; // slow for next 2 rows
            } else if (peg.type === 'splitter') {
              const sibling = makeActiveBall(
                -1, // -1 ensures siblings don't hijack the main launch sequence index
                simulateBallPath(levels, getRightBias(), rowIdx + 1, colIdx, active.color),
                rowIdx + 1
              );
              if (sibling) {
                activeBalls.push(sibling);
                launchedCount += 1;
                updateLaunchCounter(launchedCount, totalBalls);
              }
            }
          }
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
          currentBins[active.bin] += 1;
          active.trail.push({ x: active.x, y: active.y });
          savePathTrail(active.trail, active.color);
          landedCount += 1;
          shouldPlayLanding = true;
          activeBalls.splice(i, 1);

          if (launchMode === 'finish' && active.index === nextIndex - 1) startNextBall();
        }
      }
    }

    if (shouldPlayLanding && allowAudio) playClickIfEnabled();

    currentAnimation = { active: activeBalls };
    boardStatus.textContent = `Animating ball ${Math.min(nextIndex, totalBalls)} of ${totalBalls}`;

    if (activeBalls.length === 0 && nextIndex >= totalBalls) {
      completeAnimation();
      return true;
    }

    return false;
  };

  const animateFrame = (timestamp = performance.now()) => {
    if (isPaused) {
      lastAnimationTimestamp = timestamp;
      rafId = requestAnimationFrame(animateFrame);
      return;
    }

    if (lastAnimationTimestamp === null) {
      lastAnimationTimestamp = timestamp;
    }

    let stepsToRun = 1;
    if (backgroundToggle?.checked) {
      const elapsedMs = Math.max(0, timestamp - lastAnimationTimestamp) + catchUpRemainderMs;
      stepsToRun = Math.min(MAX_CATCH_UP_STEPS, Math.floor(elapsedMs / FRAME_MS));
      catchUpRemainderMs = Math.max(0, elapsedMs - (stepsToRun * FRAME_MS));
    } else {
      catchUpRemainderMs = 0;
    }
    lastAnimationTimestamp = timestamp;

    if (stepsToRun === 0) {
      drawBoard(layout, activeBalls);
      rafId = requestAnimationFrame(animateFrame);
      return;
    }

    let isComplete = false;
    for (let step = 0; step < stepsToRun; step += 1) {
      isComplete = advanceAnimationStep(step === stepsToRun - 1);
      if (isComplete) break;
    }

    if (!isComplete) {
      drawBoard(layout, activeBalls);
    }

    if (cancelFlag || (activeBalls.length === 0 && nextIndex >= totalBalls)) {
      return;
    }

    rafId = requestAnimationFrame(animateFrame);
  };

  startAnimation();
};

const stopSimulation = () => {
  cancelFlag = true;
  isPaused = false;
  if (pauseButton) pauseButton.textContent = 'Pause';
  if (rafId) cancelAnimationFrame(rafId);
  timeoutIds.forEach(id => clearTimeout(id));
  timeoutIds = [];
  boardStatus.textContent = 'Stopped';
  if (currentAnimation) currentAnimation.active = [];
  if (currentLayout) {
    drawBoard(currentLayout, null);
  }
};

const togglePause = () => {
  if (!currentAnimation || !currentAnimation.active) return;
  if (currentAnimation.active.length === 0 && nextIndex >= totalBalls) return;
  isPaused = !isPaused;
  if (pauseButton) pauseButton.textContent = isPaused ? 'Resume' : 'Pause';
};

const startSimulation = (eOrAuto) => {
  const isAutoRestart = eOrAuto === true;

  // Stop existing simulation if any
  stopSimulation();

  // Reset for new simulation
  cancelFlag = false;
  isPaused = false;
  isPathSavingEnabled = !!pathToggle?.checked;
  if (pauseButton) pauseButton.textContent = 'Pause';
  timeoutIds = [];
  const balls = clamp(parseInt(ballsInput.value, 10) || 200, 1, 1000000);
  const levels = clamp(parseInt(levelsInput.value, 10) || 12, 1, 20);
  
  if (!isAutoRestart) {
    totalRuns = clamp(parseInt(runsInput?.value, 10) || 1, 1, 10000);
    runsRemaining = totalRuns;
  }

  updateLaunchCounter(0, balls);
  updateCanvasHeight(levels);

  boardStatus.textContent = 'Simulating...';

  // Preserve layout to keep manual peg edits
  if (!currentLayout) {
    resizeCanvas();
    currentLayout = buildLayout(levels);
  } else {
    // If levels changed but layout wasn't nullified (safety check)
    const currentLevels = currentLayout.rows.length;
    if (currentLevels !== levels) {
      resizeCanvas();
      currentLayout = buildLayout(levels);
    } else {
      // Just clear paths from canvas but keep pegs
      const width = pathCanvas.width / devicePixelRatio;
      const height = pathCanvas.height / devicePixelRatio;
      pathCtx.clearRect(0, 0, width, height);
    }
  }

  clearSavedPaths();
  currentBins = Array(levels + 1).fill(0);

  renderStats(balls, levels, currentBins);
  // show empty canvas histogram initially (no bars until balls land)

  currentAnimation = { active: null };
  drawBoard(currentLayout, null);
  runAnimation(balls, levels, currentLayout);
};

const hexToRgb = (hex) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
};

boardCanvas.addEventListener('click', (e) => {
  if (!currentLayout) return;
  
  const rect = boardCanvas.getBoundingClientRect();
  const mouseX = (e.clientX - rect.left) * (boardCanvas.width / rect.width) / devicePixelRatio;
  const mouseY = (e.clientY - rect.top) * (boardCanvas.height / rect.height) / devicePixelRatio;

  const types = ['normal', 'mirror', 'magnet', 'repeller', 'teleporter', 'splitter', 'sticky', 'chaos'];
  
  for (const row of currentLayout.rows) {
    for (const peg of row) {
      const dx = mouseX - peg.x;
      const dy = mouseY - peg.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist <= PEG_R + 10) { // generous hit area
        const currentIdx = types.indexOf(peg.type || 'normal');
        const nextIdx = (currentIdx + 1) % types.length;
        peg.type = types[nextIdx];
        peg.manual = true; // Protect from random sprinkling
        
        drawBoard(currentLayout, currentAnimation?.active || null);
        return;
      }
    }
  }
});

boardCanvas.addEventListener('mousemove', (e) => {
  if (!currentLayout) return;
  const rect = boardCanvas.getBoundingClientRect();
  const mouseX = (e.clientX - rect.left) * (boardCanvas.width / rect.width) / devicePixelRatio;
  const mouseY = (e.clientY - rect.top) * (boardCanvas.height / rect.height) / devicePixelRatio;

  let overPeg = false;
  for (const row of currentLayout.rows) {
    for (const peg of row) {
      const dx = mouseX - peg.x;
      const dy = mouseY - peg.y;
      if (Math.sqrt(dx * dx + dy * dy) <= PEG_R + 10) {
        overPeg = true;
        break;
      }
    }
    if (overPeg) break;
  }
  boardCanvas.style.cursor = overPeg ? 'pointer' : 'default';
});

const clearBoardPegs = () => {
  if (!currentLayout) return;
  for (const row of currentLayout.rows) {
    for (const peg of row) {
      peg.type = 'normal';
      peg.manual = false;
    }
  }
  historicalStats = []; // Clear history on board clear
  // Uncheck all toggles to reset the 'brush'
  wildcardTypeInputs.forEach(input => input.checked = false);
  drawBoard(currentLayout, currentAnimation?.active || null);
};

const clearPegsButton = document.getElementById('clearPegs');
if (clearPegsButton) clearPegsButton.addEventListener('click', clearBoardPegs);

if (settingsPaneToggle && appShell) {
  settingsPaneToggle.addEventListener('click', () => {
    const isCollapsed = appShell.classList.toggle('settings-collapsed');
    settingsPaneToggle.textContent = isCollapsed ? 'Show settings' : 'Hide settings';
    settingsPaneToggle.setAttribute('aria-expanded', `${!isCollapsed}`);
    requestAnimationFrame(resizeCanvas);
  });
}

generateButton.addEventListener('click', startSimulation);
if (pauseButton) pauseButton.addEventListener('click', togglePause);
stopButton.addEventListener('click', stopSimulation);
pathToggle.addEventListener('change', () => {
  if (currentLayout) drawBoard(currentLayout, currentAnimation?.active || null);
});
turnColorToggle.addEventListener('change', () => {
  repaintSavedPaths();
  if (currentLayout) drawBoard(currentLayout, currentAnimation?.active || null);
});
ghostToggle.addEventListener('change', () => {
  if (currentLayout) drawBoard(currentLayout, currentAnimation?.active || null);
});
saveStatsToggle.addEventListener('change', () => {
  if (!isStatsHistoryEnabled()) {
    historicalStats = [];
  }
  if (currentLayout) drawBoard(currentLayout, currentAnimation?.active || null);
});
lineStatsToggle.addEventListener('change', () => {
  if (!isStatsHistoryEnabled()) {
    historicalStats = [];
  }
  if (currentLayout) drawBoard(currentLayout, currentAnimation?.active || null);
});
labelStatModeInputs.forEach(input => {
  input.addEventListener('change', () => {
    const offInput = labelStatModeInputs.find(option => option.value === 'off');
    const valueInputs = labelStatModeInputs.filter(option => option.value !== 'off');

    if (input.value === 'off' && input.checked) {
      valueInputs.forEach(option => {
        option.checked = false;
      });
    } else if (input.checked) {
      offInput.checked = false;
    }

    if (!valueInputs.some(option => option.checked)) {
      offInput.checked = true;
    }

    if (!isStatsHistoryEnabled()) {
      historicalStats = [];
    }
    if (currentLayout) drawBoard(currentLayout, currentAnimation?.active || null);
  });
});
currentLabelModeInputs.forEach(input => {
  input.addEventListener('change', () => {
    const offInput = currentLabelModeInputs.find(option => option.value === 'off');
    const valueInputs = currentLabelModeInputs.filter(option => option.value !== 'off');

    if (input.value === 'off' && input.checked) {
      valueInputs.forEach(option => {
        option.checked = false;
      });
    } else if (input.checked) {
      offInput.checked = false;
    }

    if (!valueInputs.some(option => option.checked)) {
      offInput.checked = true;
    }

    if (currentLayout) drawBoard(currentLayout, currentAnimation?.active || null);
  });
});
wildcardTypeInputs.forEach(input => {
  input.addEventListener('change', () => {
    applyRandomWildcards();
    if (currentLayout) {
      drawBoard(currentLayout, currentAnimation?.active || null);
    }
  });
});
levelsInput.addEventListener('change', () => {
  const levels = clamp(parseInt(levelsInput.value, 10) || 12, 1, 20);
  updateCanvasHeight(levels);
  resizeCanvas();
  
  // If not animating, we can generate a preview of the new layout
  if (!currentAnimation || !currentAnimation.active || currentAnimation.active.length === 0) {
    clearSavedPaths();
    currentLayout = buildLayout(levels);
    applyRandomWildcards(); // Re-apply toggles to new layout
    currentBins = Array(levels + 1).fill(0);
    drawBoard(currentLayout, null);
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
  const levels = clamp(parseInt(levelsInput.value, 10) || 12, 1, 20);
  updateCanvasHeight(levels);
  resizeCanvas();
  
  // Initialize idle state
  currentLayout = buildLayout(levels);
  applyRandomWildcards();
  currentBins = Array(levels + 1).fill(0);
  drawBoard(currentLayout, null);
});
