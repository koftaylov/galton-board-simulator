const ballsInput = document.getElementById('balls');
const levelsInput = document.getElementById('levels');
const runsInput = document.getElementById('runs');
const speedInput = document.getElementById('speed');
const feelPresetInput = document.getElementById('feelPreset');
const biasInput = document.getElementById('bias');
const biasValueInput = document.getElementById('biasValue');
const generateButton = document.getElementById('generate');
const pauseButton = document.getElementById('pause');
const stopButton = document.getElementById('stop');
const appShell = document.querySelector('.app-shell');
const settingsPaneToggle = document.getElementById('settingsPaneToggle');
const helpToggle = document.getElementById('helpToggle');
const helpDialog = document.getElementById('helpDialog');
const helpClose = document.getElementById('helpClose');
const soundModeInputs = Array.from(document.querySelectorAll('input[name="soundMode"]'));
const physicsModeInputs = Array.from(document.querySelectorAll('input[name="physicsMode"]'));
const pathToggle = document.getElementById('pathToggle');
const turnColorToggle = document.getElementById('turnColorToggle');
const ghostToggle = document.getElementById('ghostToggle');
const saveStatsToggle = document.getElementById('saveStatsToggle');
const lineStatsToggle = document.getElementById('lineStatsToggle');
const histogramModeInputs = Array.from(document.querySelectorAll('input[name="histogramMode"]'));
const backgroundToggle = document.getElementById('backgroundToggle');
const wildcardTypeInputs = Array.from(document.querySelectorAll('input[name="wildcardType"]'));
const wildcardOperationInputs = Array.from(document.querySelectorAll('input[name="wildcardOperation"]'));
const clearWildcardStatesButton = document.getElementById('clearWildcardStates');
const wildcardAudioToggle = document.getElementById('wildcardAudioToggle');
const wildcardVideoToggle = document.getElementById('wildcardVideoToggle');
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
let wildcardFlashes = [];
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
const BASE_CANVAS_HEIGHT = 608;
const BASE_LEVELS = 12;
const BASE_TOP = 88;
const BASE_ROW_SPACING = (BASE_CANVAS_HEIGHT - HISTOGRAM_RESERVED_HEIGHT - BASE_TOP) / (BASE_LEVELS + 1);
const TELEPORT_DEADLOCK_LIMIT = 10;
const TELEPORT_SPEED_SCALE = 2;
const TELEPORT_VANISH_FRAMES = 7;

const WILDCARD_COLORS = {
  mirror: '#06b6d4',      // cyan-400
  magnet: '#ef4444',      // red-500
  repeller: '#3b82f6',    // blue-500
  bumper: '#a855f7',      // purple-500
  teleport: '#22d3ee',    // cyan-300
  splitter: '#10b981',    // emerald-500
  sticky: '#f59e0b',      // amber-500
  chaos: '#ec4899',       // pink-500
  wildcard: '#ffffff',    // white
  firework: '#facc15',     // yellow-400
  teleportBurst: '#f8fafc', // slate-50
};

const FEEL_PRESETS = {
  floaty: { frameScale: 1.75, arcScale: 2.1, verticalPower: 1.28, landingSpeed: 1 },
  heavy: { frameScale: 0.82, arcScale: 0.78, verticalPower: 2.25, landingSpeed: 1.85 },
  pinball: { frameScale: 0.58, arcScale: 2.45, verticalPower: 1.18, landingSpeed: 2.1 },
  marble: { frameScale: 0.96, arcScale: 1.45, verticalPower: 1.55, landingSpeed: 1.45 },
};

const getSoundMode = () => soundModeInputs.find(input => input.checked)?.value || 'off';
const getPhysicsMode = () => physicsModeInputs.find(input => input.checked)?.value || 'simple';
const getFeelPreset = () => FEEL_PRESETS[feelPresetInput?.value] ? feelPresetInput.value : 'marble';
const getFeelSettings = () => {
  if (getPhysicsMode() !== 'gravity') {
    return { frameScale: 1, arcScale: 1, verticalPower: 1, landingSpeed: 1 };
  }
  return FEEL_PRESETS[getFeelPreset()];
};
const getHistogramMode = () => histogramModeInputs.find(input => input.checked)?.value || 'bars';
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
const getWildcardOperation = () => wildcardOperationInputs.find(input => input.checked)?.value || 'add';
const getEditablePegCount = () => currentLayout
  ? currentLayout.rows.reduce((sum, row) => sum + row.length, 0)
  : 0;
const getWildcardBatchSize = () => {
  const editablePegCount = getEditablePegCount();
  if (editablePegCount <= 0) return 0;
  const minBatch = Math.max(1, Math.floor(editablePegCount * 0.02));
  const maxBatch = Math.max(minBatch, Math.ceil(editablePegCount * 0.05));
  return Math.floor(minBatch + Math.random() * ((maxBatch - minBatch) + 1));
};
const resolveWildcardType = (selectedWildcards) => {
  let chosen = selectedWildcards[Math.floor(Math.random() * selectedWildcards.length)];
  if (chosen === 'wildcard') {
    const others = selectedWildcards.filter(t => t !== 'wildcard');
    const pool = others.length > 0 ? others : ['mirror', 'magnet', 'repeller', 'bumper', 'teleport', 'chaos', 'splitter', 'sticky'];
    chosen = pool[Math.floor(Math.random() * pool.length)];
  }
  return chosen;
};
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

  const playTone = (freq, type, delay, duration, volume, targetFreq = null) => {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    const start = ac.currentTime + delay;
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (targetFreq) {
      osc.frequency.linearRampToValueAtTime(targetFreq, start + duration);
    }
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), start + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(g);
    g.connect(ac.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  };

  const playWildcard = (type) => {
    if (type === 'mirror') {
      playTone(760, 'sine', 0, 0.075, 0.028, 520);
      playTone(520, 'sine', 0.04, 0.075, 0.024, 760);
    } else if (type === 'magnet') {
      playTone(210, 'sawtooth', 0, 0.13, 0.026, 120);
    } else if (type === 'repeller') {
      playTone(180, 'square', 0, 0.09, 0.022, 620);
    } else if (type === 'bumper') {
      playTone(980, 'triangle', 0, 0.045, 0.026);
      playTone(1420, 'triangle', 0.055, 0.055, 0.024);
    } else if (type === 'teleport') {
      playTone(440, 'sine', 0, 0.08, 0.02, 1320);
      playTone(1760, 'triangle', 0.03, 0.06, 0.022, 660);
    } else if (type === 'splitter') {
      playTone(430, 'triangle', 0, 0.09, 0.022, 620);
      playTone(430, 'triangle', 0, 0.09, 0.022, 280);
    } else if (type === 'sticky') {
      playTone(150, 'sine', 0, 0.16, 0.028, 95);
    } else if (type === 'chaos') {
      playTone(300 + Math.random() * 500, 'square', 0, 0.045, 0.018);
      playTone(300 + Math.random() * 500, 'sawtooth', 0.04, 0.045, 0.016);
      playTone(300 + Math.random() * 500, 'triangle', 0.08, 0.045, 0.016);
    } else if (type === 'firework') {
      playTone(1320, 'square', 0, 0.035, 0.034, 360);
      playTone(180, 'sawtooth', 0, 0.055, 0.026, 90);
      playTone(720, 'triangle', 0.028, 0.045, 0.018, 1120);
    } else if (type === 'teleportBurst') {
      playTone(1320, 'sine', 0, 0.12, 0.032, 2200);
      playTone(880, 'triangle', 0.035, 0.16, 0.026, 1760);
      playTone(240, 'sine', 0.04, 0.18, 0.018, 80);
    } else {
      playTone(620, 'sine', 0, 0.08, 0.02);
    }
  };

  return { play, playTurn, playLevel, playWildcard };
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
const hexToRgba = (hex, alpha) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
const getBallColor = (ball) => turnColorToggle?.checked ? ball.color : START_COLOR;
const getTrailColor = (ball) => turnColorToggle?.checked ? ball.color : { r: 74, g: 222, b: 128 };
const getHistogramArea = (layout) => {
  const top = layout.bottom + 8;
  const bottom = layout.height - 8;
  return {
    top,
    bottom,
    height: Math.max(48, bottom - top),
  };
};
const getBucketMetrics = (layout, bins, bin) => {
  const area = getHistogramArea(layout);
  const radius = Math.max(6, Math.min(BALL_R * 1.02, layout.pegSpacing * 0.2));
  const bucketWidth = Math.floor(layout.pegSpacing * 0.76);
  const xCenter = layout.center + (bin - (bins.length - 1) / 2) * layout.pegSpacing;
  const left = xCenter - bucketWidth / 2;
  const innerTop = area.top + 8;
  const innerBottom = area.bottom - radius;
  const usableHeight = Math.max(radius * 2, innerBottom - innerTop);
  const rowGap = radius * 1.28;
  const colGap = radius * 1.46;
  const columns = Math.max(1, Math.floor((bucketWidth - radius) / colGap));
  const maxCount = Math.max(1, ...bins);
  const binCount = bins[bin] || 0;
  const rowCount = Math.max(0, Math.ceil(binCount / columns));
  const maxRowsAtFullScale = Math.max(1, Math.floor(usableHeight / rowGap) + 1);
  const requiredMaxRows = Math.max(maxRowsAtFullScale, Math.ceil(maxCount / columns));
  const effectiveRowGap = requiredMaxRows > maxRowsAtFullScale
    ? usableHeight / Math.max(1, requiredMaxRows - 1)
    : rowGap;
  const topCenterY = binCount > 0
    ? innerBottom - Math.min(usableHeight, (rowCount - 1) * effectiveRowGap)
    : area.bottom - BALL_R;

  return {
    ...area,
    xCenter,
    left,
    width: bucketWidth,
    radius,
    innerTop,
    innerBottom,
    usableHeight,
    colGap,
    columns,
    effectiveRowGap,
    topCenterY,
  };
};

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
  const strokeTrail = () => {
    targetCtx.beginPath();
    targetCtx.moveTo(trail[0].x, trail[0].y);
    for (let i = 1; i < trail.length; i += 1) {
      const prev = trail[i - 1];
      const point = trail[i];
      if (point.teleportArrival || point.teleportBreak) {
        targetCtx.stroke();
        targetCtx.beginPath();
        targetCtx.moveTo(point.x, point.y);
        continue;
      }
      const midX = (prev.x + point.x) / 2;
      const midY = (prev.y + point.y) / 2;
      targetCtx.quadraticCurveTo(prev.x, prev.y, midX, midY);
    }
    const last = trail[trail.length - 1];
    targetCtx.lineTo(last.x, last.y);
    targetCtx.stroke();
  };

  targetCtx.save();
  targetCtx.lineCap = 'round';
  targetCtx.lineJoin = 'round';
  targetCtx.shadowColor = colorToRgba(color, 0.22 * opacity);
  targetCtx.shadowBlur = 12;
  targetCtx.strokeStyle = colorToRgba(color, 0.16 * opacity);
  targetCtx.lineWidth = 10;
  strokeTrail();

  targetCtx.shadowBlur = 0;
  targetCtx.strokeStyle = colorToRgba(color, 0.18 * opacity);
  targetCtx.lineWidth = 3;
  strokeTrail();
  targetCtx.restore();
};

const drawWildcardFlashes = () => {
  for (let i = wildcardFlashes.length - 1; i >= 0; i -= 1) {
    const flash = wildcardFlashes[i];
    const progress = 1 - (flash.age / flash.maxAge);
    const color = WILDCARD_COLORS[flash.type] || '#ffffff';
    const isBurst = flash.type === 'teleportBurst';
    const radius = PEG_R + (isBurst ? 18 : 8) + (progress * (isBurst ? 42 : 24));
    const alpha = Math.max(0, flash.age / flash.maxAge);

    ctx.save();
    ctx.strokeStyle = hexToRgba(color, (isBurst ? 0.95 : 0.72) * alpha);
    ctx.fillStyle = hexToRgba(color, (isBurst ? 0.28 : 0.12) * alpha);
    ctx.lineWidth = isBurst ? 3 : 2;
    ctx.shadowColor = hexToRgba(color, (isBurst ? 0.85 : 0.35) * alpha);
    ctx.shadowBlur = isBurst ? 28 : 14;
    ctx.beginPath();
    ctx.arc(flash.x, flash.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    flash.age -= 1;
    if (flash.age <= 0) {
      wildcardFlashes.splice(i, 1);
    }
  }
};

const clearWildcardFlashes = () => {
  wildcardFlashes = [];
};

const savePathTrail = (path, color) => {
  if (!isPathSavingEnabled || !path || path.length < 2) return;
  savedTrails.push({ trail: path.map(point => ({ ...point })), color });
  repaintSavedPaths();
};

const playWildcardSoundIfEnabled = (type) => {
  if (!wildcardAudioToggle?.checked) return;
  try {
    if (!window._clickPlayer) window._clickPlayer = createClickPlayer();
    window._clickPlayer.playWildcard(type);
  } catch (e) {
    // ignore
  }
};

const triggerWildcardFeedback = (type, point, allowAudio = true) => {
  if (!type || type === 'normal' || !point) return;
  if (wildcardVideoToggle?.checked) {
    wildcardFlashes.push({
      x: point.x,
      y: point.y + (PEG_R + BALL_R - 1),
      type,
      age: type === 'teleportBurst' ? 24 : 18,
      maxAge: type === 'teleportBurst' ? 24 : 18,
    });
  }
  if (allowAudio) playWildcardSoundIfEnabled(type);
};

const applyRandomWildcards = () => {
  if (!currentLayout) return;
  const selectedWildcards = getSelectedWildcardTypes();
  if (selectedWildcards.length === 0) {
    for (const row of currentLayout.rows) {
      for (const peg of row) {
        if (!peg.manual) peg.type = 'normal';
      }
    }
    refreshActiveBallPaths();
    return;
  }

  const candidates = getAutoWildcardAddCandidates(selectedWildcards);
  const selectedPegs = candidates.slice(0, getWildcardBatchSize());

  for (const peg of selectedPegs) {
    const rowIndex = currentLayout.rows.findIndex(row => row.includes(peg));
    const type = resolveAutoWildcardTypeForPeg(selectedWildcards, rowIndex);
    if (type) peg.type = type;
  }
  refreshActiveBallPaths();
};

const getAutoWildcardAddCandidates = (selectedTypes = []) => {
  if (!currentLayout) return [];
  const candidates = [];
  const skipsLastRow = selectedTypes.includes('sticky');

  for (let rowIndex = 1; rowIndex < currentLayout.rows.length; rowIndex += 1) {
    if (skipsLastRow && rowIndex === currentLayout.rows.length - 1) continue;
    const row = currentLayout.rows[rowIndex];
    for (const peg of row) {
      if (!peg.manual && peg.type === 'normal' && canAutoPlaceWildcardType(rowIndex, selectedTypes[0])) {
        candidates.push(peg);
      }
    }
  }

  return candidates.sort(() => Math.random() - 0.5);
};

const getMaxAutoBumpersForRow = (rowLength) => {
  if (rowLength <= 3) return Math.max(0, rowLength - 1);
  if (rowLength <= 6) return Math.max(0, rowLength - 2);
  return Math.floor(rowLength * 0.7);
};

const canAutoPlaceWildcardType = (rowIndex, type) => {
  if (type !== 'bumper') return true;
  if (!currentLayout?.rows[rowIndex]) return false;
  const row = currentLayout.rows[rowIndex];
  const bumperCount = row.filter(peg => peg.type === 'bumper').length;
  return bumperCount < getMaxAutoBumpersForRow(row.length);
};

const resolveAutoWildcardTypeForPeg = (selectedWildcards, rowIndex) => {
  const blockedTypes = [];
  if (!canAutoPlaceWildcardType(rowIndex, 'bumper')) {
    blockedTypes.push('bumper');
  }

  const available = selectedWildcards.filter(type => !blockedTypes.includes(type));
  if (available.length === 0) return null;

  const resolved = resolveWildcardType(available);
  if (blockedTypes.includes(resolved)) {
    const fallback = ['mirror', 'magnet', 'repeller', 'teleport', 'splitter', 'sticky', 'chaos']
      .find(type => available.includes(type) || selectedWildcards.includes('wildcard'));
    return fallback || null;
  }
  return resolved;
};

const getWildcardRemoveCandidates = (type) => {
  if (!currentLayout) return [];
  const candidates = [];

  for (let rowIndex = 0; rowIndex < currentLayout.rows.length; rowIndex += 1) {
    for (const peg of currentLayout.rows[rowIndex]) {
      if (peg.type !== 'normal' && (type === 'wildcard' || peg.type === type)) {
        candidates.push(peg);
      }
    }
  }

  return candidates.sort(() => Math.random() - 0.5).slice(0, getWildcardBatchSize());
};

const resetWildcardButtons = () => {
  wildcardTypeInputs.forEach(input => {
    input.checked = false;
  });
};

const clearAllPegStates = () => {
  if (!currentLayout) return;
  for (const row of currentLayout.rows) {
    for (const peg of row) {
      peg.type = 'normal';
      peg.manual = false;
    }
  }
  resetWildcardButtons();
  refreshActiveBallPaths();
  drawBoard(currentLayout, currentAnimation?.active || null);
};

const applyWildcardCommand = (type) => {
  if (!currentLayout) return;

  const operation = getWildcardOperation();
  const pegs = operation === 'remove'
    ? getWildcardRemoveCandidates(type)
    : getAutoWildcardAddCandidates([type]).slice(0, getWildcardBatchSize());

  for (const peg of pegs) {
    if (operation === 'remove') {
      peg.type = 'normal';
      peg.manual = false;
    } else {
      const rowIndex = currentLayout.rows.findIndex(row => row.includes(peg));
      const resolvedType = resolveAutoWildcardTypeForPeg([type], rowIndex);
      if (resolvedType) {
        peg.type = resolvedType;
        peg.manual = false;
      }
    }
  }

  resetWildcardButtons();
  refreshActiveBallPaths();
  drawBoard(currentLayout, currentAnimation?.active || null);
};

const getRandomPegTarget = (excludeRow = null, excludeCol = null) => {
  if (!currentLayout) return null;
  const targets = [];
  for (let row = 0; row < currentLayout.rows.length; row += 1) {
    for (let col = 0; col < currentLayout.rows[row].length; col += 1) {
      if (row !== excludeRow || col !== excludeCol) {
        targets.push({ row, col, peg: currentLayout.rows[row][col] });
      }
    }
  }
  return targets[Math.floor(Math.random() * targets.length)] || null;
};

const buildLayout = (levels) => {
  const width = boardCanvas.width / devicePixelRatio;
  const height = boardCanvas.height / devicePixelRatio;
  const top = BASE_TOP;
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
  let escapePoint = null;

  // Start point (no row/col metadata)
  if (startRow === 0) {
    path.push({ x: currentLayout.center, y: currentLayout.top - Math.max(currentLayout.rowSpacing * 0.7, BALL_R * 4) });
  } else {
    // Starting mid-board (e.g. after a split)
    const prevPeg = currentLayout.rows[startRow - 1][startIndex];
    path.push({ x: prevPeg.x, y: prevPeg.y - (PEG_R + BALL_R - 1) });
  }

  let row = startRow;
  let arrivedFromJump = false;
  let jumpCount = 0;
  let teleportCount = 0;

  while (row < levels) {
    let peg = currentLayout.rows[row][index];
    let decisionIndex = index;
    let touchY = peg.y - (PEG_R + BALL_R - 1);

    while (peg.type === 'bumper' || peg.type === 'teleport') {
      const isBumper = peg.type === 'bumper';
      const willBumperDeadlock = isBumper && jumpCount + 1 >= TELEPORT_DEADLOCK_LIMIT;
      const willTeleportVanish = !isBumper && teleportCount + 1 >= TELEPORT_DEADLOCK_LIMIT;
      path.push({
        x: peg.x,
        y: touchY,
        row,
        col: decisionIndex,
        speedScale: arrivedFromJump ? TELEPORT_SPEED_SCALE : undefined,
        arc: arrivedFromJump ? 0 : undefined,
        teleportArrival: arrivedFromJump && !isBumper,
        deadlockFirework: willBumperDeadlock,
        teleportVanish: willTeleportVanish,
        isBumper,
        isTeleport: !isBumper,
      });

      arrivedFromJump = false;
      if (isBumper) jumpCount += 1;
      else teleportCount += 1;

      if (willTeleportVanish) {
        escapePoint = { disappeared: true };
        break;
      }

      if (willBumperDeadlock) {
        const angle = Math.random() * Math.PI * 2;
        const throwDistance = currentLayout.pegSpacing * (levels + 1.5);
        const throwX = peg.x + Math.cos(angle) * throwDistance;
        const throwY = peg.y + Math.sin(angle) * throwDistance;
        path.push({
          x: throwX,
          y: throwY,
          row,
          col: decisionIndex,
          arc: currentLayout.rowSpacing * 0.9,
          speedScale: 6,
        });
        escapePoint = { x: throwX, y: throwY };
        break;
      }

      if (isBumper) {
        decisionIndex = Math.floor(Math.random() * (row + 1));
        if (row > 0 && decisionIndex === index) {
          decisionIndex = (decisionIndex + 1 + Math.floor(Math.random() * row)) % (row + 1);
        }
      } else {
        const target = getRandomPegTarget(row, decisionIndex);
        if (!target) break;
        row = target.row;
        decisionIndex = target.col;
      }

      peg = currentLayout.rows[row][decisionIndex];
      index = decisionIndex;
      touchY = peg.y - (PEG_R + BALL_R - 1);
      arrivedFromJump = true;
    }

    if (escapePoint) {
      break;
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
      speedScale: arrivedFromJump ? TELEPORT_SPEED_SCALE : undefined,
      arc: arrivedFromJump ? 0 : undefined,
      teleportArrival: arrivedFromJump,
      turn: moveRight ? 'right' : 'left' 
    });
    arrivedFromJump = false;
    jumpCount = 0;
    teleportCount = 0;

    color = blendColors(color, moveRight ? RIGHT_TURN_COLOR : LEFT_TURN_COLOR, 0.18);
    index = decisionIndex;
    if (moveRight) index += 1;
    row += 1;
  }

  const finalX = escapePoint ? escapePoint.x : currentLayout.center + (index - levels / 2) * currentLayout.pegSpacing;
  const finalBounceY = currentLayout.bottom - Math.min(34, currentLayout.rowSpacing * 0.72);
  if (!escapePoint) {
    path.push({ x: finalX, y: finalBounceY, arc: Math.max(24, currentLayout.rowSpacing * 0.95), finalPegBounce: true });
    path.push({ x: finalX, y: currentLayout.height - BALL_R - 8, arc: 0, speedScale: 1 });
  }

  return { path, bin: escapePoint ? null : index, color, escaped: !!escapePoint };
};

const refreshActiveBallPaths = () => {
  const activeBalls = currentAnimation?.active;
  if (!currentLayout || !Array.isArray(activeBalls) || activeBalls.length === 0) return;
  const levels = currentLayout.rows.length;

  for (const active of activeBalls) {
    const nextContact = active.path
      .slice(active.step + 1)
      .find(point => point.row !== undefined && point.col !== undefined);

    if (!nextContact || nextContact.row >= levels) continue;

    const startRow = nextContact.row;
    const startIndex = clamp(nextContact.col, 0, startRow);
    const result = simulateBallPath(levels, getRightBias(), startRow, startIndex, active.color);
    active.path = [
      { x: active.x, y: active.y },
      ...result.path.slice(1),
    ];
    active.bin = result.bin;
    active.color = result.color;
    active.step = 0;
    active.progress = 0;
    active.hidden = false;
    active.stickyEffect = null;
  }
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
  const runDigits = `${Math.max(currentRunIndex, totalRuns)}`.length;
  const ballDigits = `${Math.max(launched, total)}`.length;
  launchCounter.style.setProperty('--run-digits', runDigits);
  launchCounter.style.setProperty('--ball-digits', ballDigits);
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

      if (peg.type === 'teleport') {
        ctx.save();
        ctx.strokeStyle = 'rgba(224, 242, 254, 0.9)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(peg.x, peg.y, PEG_R + 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(peg.x - 4, peg.y + 3);
        ctx.lineTo(peg.x + 4, peg.y - 3);
        ctx.moveTo(peg.x - 1, peg.y - 4);
        ctx.lineTo(peg.x + 4, peg.y - 4);
        ctx.lineTo(peg.x + 4, peg.y + 1);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  drawWildcardFlashes();

  const activeBalls = Array.isArray(activeBall) ? activeBall : activeBall ? [activeBall] : [];
  for (const ball of activeBalls) {
    if (ball.hidden) continue;
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

  // Current bars and historical stats have separate scales so saved stats do not move during a run.
  let currentMaxRate = 0.01;
  let historyMaxRate = 0.01;
  const currentTotal = getTotal(bins);
  if (currentTotal > 0) {
    currentMaxRate = Math.max(currentMaxRate, ...bins.map(value => value / currentTotal));
  }
  if (isStatsHistoryEnabled()) {
    for (const histBins of historicalStats) {
      const histTotal = getTotal(histBins);
      if (histTotal > 0) {
        historyMaxRate = Math.max(historyMaxRate, ...histBins.map(value => value / histTotal));
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
          const h = Math.round((rate / historyMaxRate) * (areaHeight - 8));
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
          const h = Math.round((rate / historyMaxRate) * (areaHeight - 8));
          const y = areaBottom - h;
          if (i === 0) ctx.moveTo(xCenter, y);
          else ctx.lineTo(xCenter, y);
        }
        ctx.stroke();
      }
    }
  }

  const histogramMode = getHistogramMode();

  if (histogramMode === 'buckets') {
    for (let i = 0; i < binCount; i++) {
      const bucket = getBucketMetrics(layout, bins, i);
      ctx.strokeStyle = 'rgba(125, 211, 252, 0.72)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bucket.left, bucket.innerTop);
      ctx.lineTo(bucket.left, bucket.bottom);
      ctx.lineTo(bucket.left + bucket.width, bucket.bottom);
      ctx.lineTo(bucket.left + bucket.width, bucket.innerTop);
      ctx.stroke();

      const count = bins[i];
      if (count > 0) {
        ctx.fillStyle = 'rgba(96, 165, 250, 0.84)';
        ctx.strokeStyle = 'rgba(191, 219, 254, 0.55)';
        const visibleCount = Math.min(count, 260);
        for (let b = 0; b < visibleCount; b++) {
          const actualIndex = visibleCount === count
            ? b
            : Math.floor((b / Math.max(1, visibleCount - 1)) * (count - 1));
          const rowStart = Math.floor(actualIndex / bucket.columns) * bucket.columns;
          const rowEnd = Math.min(count, rowStart + bucket.columns);
          const rowSize = rowEnd - rowStart;
          const col = actualIndex - rowStart;
          const row = Math.floor(actualIndex / bucket.columns);
          const x = bucket.xCenter + (col - (rowSize - 1) / 2) * bucket.colGap;
          const y = bucket.innerBottom - Math.min(bucket.usableHeight, row * bucket.effectiveRowGap);
          ctx.beginPath();
          ctx.arc(x, y, bucket.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }
    }
  }

  // draw bars
  if (histogramMode === 'bars') {
    for (let i = 0; i < binCount; i++) {
      const xCenter = layout.center + (i - (binCount - 1) / 2) * layout.pegSpacing;
      const w = Math.floor(layout.pegSpacing * 0.6);
      const left = xCenter - w / 2;
      const rate = getRate(bins, i);
      const h = Math.round((rate / currentMaxRate) * (areaHeight - 8));
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
    const feel = getFeelSettings();
    const landingScale = to.arc === 0 ? feel.landingSpeed : 1;
    const segmentDistanceRatio = to.arc === 0 ? 1 : distanceRatio;
    return Math.max(1, (getFramesPerStep() * speedMult * segmentDistanceRatio * feel.frameScale) / (speedScale * landingScale));
  };
  const getLandingThresholdY = (bin) => {
    const areaBottom = layout.height - 8;
    const histogramMode = getHistogramMode();
    if (histogramMode === 'off') return layout.bottom + 8;
    if (histogramMode === 'buckets') {
      return getBucketMetrics(layout, currentBins, bin).topCenterY;
    }
    if (!currentBins[bin]) return areaBottom - BALL_R;

    const areaTop = layout.bottom + 8;
    const areaHeight = Math.max(48, areaBottom - areaTop);
    const getTotal = (values) => values.reduce((sum, value) => sum + value, 0);
    let maxRate = 0.01;
    const currentTotal = getTotal(currentBins);
    if (currentTotal > 0) {
      maxRate = Math.max(maxRate, ...currentBins.map(value => value / currentTotal));
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
      stickyEffect: null,
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

  const finishRemainingWithoutVisuals = () => {
    if (nextIndex >= totalBalls) return;

    for (; nextIndex < totalBalls; nextIndex += 1) {
      const result = simulateBallPath(levels, getRightBias());
      currentBins[result.bin] += 1;
      launchedCount += 1;
      if (isPathSavingEnabled) {
        savePathTrail(result.path, result.color);
      }
    }

    updateLaunchCounter(launchedCount, totalBalls);
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
      currentAnimation = { active: [], mode: getLaunchMode() };
      const startNextRunWhenReady = () => {
        if (cancelFlag) return;
        if (isPaused) {
          boardStatus.textContent = 'Paused';
          scheduleTimeout(startNextRunWhenReady, 100);
          return;
        }
        startSimulation(true);
      };
      scheduleTimeout(startNextRunWhenReady, 150); // slight delay before next run
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

    if (isPaused) {
      boardStatus.textContent = 'Paused';
      scheduleTimeout(runNoVisBatch, 100);
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
      currentAnimation = { active: [], mode: 'no-vis' };
      runNoVisBatch();
      return;
    }

    if (launchMode === 'all') {
      while (nextIndex < totalBalls) startNextBall();
    } else {
      startNextBall();
    }

    boardStatus.textContent = `Animating ${totalBalls} ball${totalBalls === 1 ? '' : 's'}`;
    currentAnimation = { active: activeBalls, mode: launchMode };
    rafId = requestAnimationFrame(animateFrame);
  };

  const advanceAnimationStep = (allowAudio = true) => {
    if (cancelFlag) {
      if (rafId) cancelAnimationFrame(rafId);
      boardStatus.textContent = 'Stopped';
      generateButton.disabled = false;
      return true;
    }

    const launchMode = getLaunchMode();
    if (launchMode === 'no-vis' && nextIndex < totalBalls) {
      finishRemainingWithoutVisuals();
    }

    if (activeBalls.length === 0) {
      if (nextIndex >= totalBalls) completeAnimation();
      return true;
    }

    if (isPaused) {
      return false;
    }

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

      // Sticky effect: the next hop after contact is slower and less springy.
      const isInstantTeleportSegment = from?.isTeleport && to?.teleportArrival;
      const speedMult = active.stickyEffect ? active.stickyEffect.speedMult : 1;
      const framesPerStep = isInstantTeleportSegment ? TELEPORT_VANISH_FRAMES : getFramesForSegment(from, to, speedMult);
      
      active.progress += 1 / framesPerStep;
      const t = Math.min(active.progress, 1);
      active.hidden = isInstantTeleportSegment && t < 1;
      const feel = getFeelSettings();
      const motionT = feel.verticalPower === 1 ? t : Math.pow(t, feel.verticalPower);
      const stickyArcScale = active.stickyEffect ? active.stickyEffect.arcScale : 1;
      const segmentAmplitude = isInstantTeleportSegment ? 0 : (to.arc ?? active.amplitude) * feel.arcScale * stickyArcScale;
      const arc = Math.sin(Math.PI * t) * segmentAmplitude;
      active.x = from.x + (to.x - from.x) * t;
      active.y = from.y + (to.y - from.y) * motionT - arc;
      const lastTrailPoint = active.trail[active.trail.length - 1];
      const dx = active.x - lastTrailPoint.x;
      const dy = active.y - lastTrailPoint.y;
      if ((dx * dx) + (dy * dy) >= 16) {
        active.trail.push({ x: active.x, y: active.y, teleportBreak: isInstantTeleportSegment });
      }

      const isFinalDrop = to.arc === 0 && active.step >= active.path.length - 2;
      const reachedLandingSurface = isFinalDrop && active.y >= getLandingThresholdY(active.bin);

      if (t >= 1 || reachedLandingSurface) {
        active.step += 1;
        active.progress = 0;
        
        active.stickyEffect = null;

        const currentPoint = active.path[active.step];

        if (currentPoint?.deadlockFirework) {
          triggerWildcardFeedback('firework', currentPoint, allowAudio);
        }

        if (currentPoint?.teleportVanish) {
          active.hidden = true;
          triggerWildcardFeedback('teleportBurst', currentPoint, allowAudio);
        }

        if (currentPoint?.teleportArrival) {
          triggerWildcardFeedback('teleport', currentPoint, false);
        }

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

          if (isEffectEnabled && !currentPoint.deadlockFirework) {
            triggerWildcardFeedback(peg.type, currentPoint, allowAudio);
          }

          if (isEffectEnabled && rowIdx < levels - 1) {
            if (peg.type === 'sticky') {
              active.stickyEffect = { speedMult: 1.1, arcScale: 0.45 };
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
          if (active.bin !== null && active.bin !== undefined) {
            currentBins[active.bin] += 1;
          }
          active.trail.push({ x: active.x, y: active.y });
          savePathTrail(active.trail, active.color);
          landedCount += 1;
          shouldPlayLanding = !currentPoint?.teleportVanish;
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
  clearWildcardFlashes();
  if (currentLayout) {
    drawBoard(currentLayout, null);
  }
};

const togglePause = () => {
  if (!currentAnimation) return;
  const canPauseActiveList = Array.isArray(currentAnimation.active);
  const canPauseQueuedRun = runsRemaining > 0 && generateButton.disabled;
  if (!canPauseActiveList && !canPauseQueuedRun) return;
  isPaused = !isPaused;
  if (pauseButton) pauseButton.textContent = isPaused ? 'Resume' : 'Pause';
  boardStatus.textContent = isPaused ? 'Paused' : 'Resuming';
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
  clearWildcardFlashes();
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

  const types = ['normal', 'mirror', 'magnet', 'repeller', 'bumper', 'teleport', 'splitter', 'sticky', 'chaos'];
  
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
        
        refreshActiveBallPaths();
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
  refreshActiveBallPaths();
  drawBoard(currentLayout, currentAnimation?.active || null);
};

const clearPegsButton = document.getElementById('clearPegs');
if (clearPegsButton) clearPegsButton.addEventListener('click', clearBoardPegs);
if (clearWildcardStatesButton) clearWildcardStatesButton.addEventListener('click', clearAllPegStates);

if (settingsPaneToggle && appShell) {
  settingsPaneToggle.addEventListener('click', () => {
    const isCollapsed = appShell.classList.toggle('settings-collapsed');
    settingsPaneToggle.textContent = isCollapsed ? 'Show settings' : 'Hide settings';
    settingsPaneToggle.setAttribute('aria-expanded', `${!isCollapsed}`);
    requestAnimationFrame(resizeCanvas);
  });
}

const openHelpDialog = () => {
  if (!helpDialog) return;
  helpDialog.hidden = false;
  helpClose?.focus();
};

const closeHelpDialog = () => {
  if (!helpDialog) return;
  helpDialog.hidden = true;
  helpToggle?.focus();
};

if (helpToggle && helpDialog) {
  helpToggle.addEventListener('click', openHelpDialog);
  helpClose?.addEventListener('click', closeHelpDialog);
  helpDialog.addEventListener('click', (event) => {
    if (event.target === helpDialog) closeHelpDialog();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !helpDialog.hidden) closeHelpDialog();
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
    if (!input.checked) return;
    applyWildcardCommand(input.value);
  });
});
histogramModeInputs.forEach(input => {
  input.addEventListener('change', () => {
    if (currentLayout) drawBoard(currentLayout, currentAnimation?.active || null);
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
