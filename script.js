/* ==========================================================================
   Younghyeon Park, Ph.D. - Interactive Scripts
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Theme Toggle Functionality
  const themeToggleBtn = document.getElementById('theme-toggle');
  const currentTheme = localStorage.getItem('theme') || 'dark';

  if (currentTheme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    updateThemeIcon('light');
  }

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      let theme = document.documentElement.getAttribute('data-theme');
      if (theme === 'light') {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'dark');
        updateThemeIcon('dark');
      } else {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
        updateThemeIcon('light');
      }
    });
  }

  function updateThemeIcon(theme) {
    if (!themeToggleBtn) return;
    const icon = themeToggleBtn.querySelector('i');
    if (icon) {
      icon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
    }
  }

  // 2. Navigation Active State on Scroll
  const sections = document.querySelectorAll('section');
  const navLinks = document.querySelectorAll('.nav-link');

  window.addEventListener('scroll', () => {
    let current = '';
    const scrollPosition = window.scrollY + 200;

    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.offsetHeight;
      if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
        current = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${current}`) {
        link.classList.add('active');
      }
    });
  });

  // 3. Publications & Patents Filtering & Search
  const filterBtns = document.querySelectorAll('.tab-btn');
  const searchInput = document.getElementById('pub-search');
  const pubCards = document.querySelectorAll('.pub-card');

  let activeCategory = 'all';
  let searchQuery = '';

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.getAttribute('data-filter');
      filterPublications();
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      filterPublications();
    });
  }

  function filterPublications() {
    pubCards.forEach(card => {
      const category = card.getAttribute('data-category');
      const text = card.textContent.toLowerCase();

      const matchesCategory = (activeCategory === 'all' || category === activeCategory);
      const matchesSearch = (searchQuery === '' || text.includes(searchQuery));

      if (matchesCategory && matchesSearch) {
        card.style.display = 'grid';
      } else {
        card.style.display = 'none';
      }
    });
  }

  // 4. Citation Copy to Clipboard
  window.copyCitation = function(text) {
    navigator.clipboard.writeText(text).then(() => {
      alert('Citation copied to clipboard!\n\n' + text);
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  };

  // ==========================================================================
  // 5. Dual Game Arcade Hub: Photon Runner (2D) & Slot Roads (3D)
  // ==========================================================================
  const canvas = document.getElementById('hero-game-canvas');
  const overlay = document.getElementById('game-overlay');
  const startBtn = document.getElementById('game-start-btn');
  const statusTitle = document.getElementById('game-status-title');
  const statusSub = document.getElementById('game-status-sub');
  const tabRunner = document.getElementById('tab-runner');
  const tabSkyroads = document.getElementById('tab-skyroads');
  const gameHintText = document.getElementById('game-hint-text');

  let activeGameMode = 'runner'; // 'runner' or 'skyroads'

  if (canvas && overlay && startBtn) {
    const ctx = canvas.getContext('2d');

    // ------------------------------------------------------------------------
    // GAME 1: 2D Photon Runner Engine
    // ------------------------------------------------------------------------
    let runnerRunning = false;
    let runnerOver = false;
    let runnerScore = 0;
    let runnerHighScore = parseInt(localStorage.getItem('photon_high_score') || '0', 10);
    let runnerAnimId = null;

    let runnerGroundY = 205;
    let runnerBaseSpeed = 9.0;
    let runnerSpeed = 9.0;

    const runnerPlayer = {
      x: 80,
      y: 0,
      radius: 10,
      vy: 0,
      gravity: 0.8,
      jumpPower: -13.5,
      isGrounded: true,
      trail: []
    };

    let runnerObstacles = [];
    let runnerFrameCount = 0;

    function resizeRunnerCanvas() {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0) {
        canvas.width = rect.width;
        canvas.height = rect.height || 240;
        runnerGroundY = canvas.height - 35;
        runnerPlayer.x = Math.max(45, canvas.width * 0.1);
        const widthScale = Math.min(1.2, Math.max(0.42, canvas.width / 900));
        runnerSpeed = runnerBaseSpeed * widthScale;

        if (!runnerRunning && activeGameMode === 'runner') {
          runnerPlayer.y = runnerGroundY - runnerPlayer.radius;
          drawRunnerStatic();
        }
      }
    }

    function drawRoundedRect(ctx, x, y, w, h, r) {
      if (w < 2 * r) r = w / 2;
      if (h < 2 * r) r = h / 2;
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }

    function resetRunner() {
      if (runnerAnimId) {
        cancelAnimationFrame(runnerAnimId);
        runnerAnimId = null;
      }
      resizeRunnerCanvas();
      runnerRunning = true;
      runnerOver = false;
      runnerScore = 0;
      runnerBaseSpeed = 8.5;
      runnerFrameCount = 0;
      runnerObstacles = [];
      tunnelingCharges = 0;
      nextTunnelingScore = 10000;
      tunnelingNotifyTimer = 0;
      tunnelingEffectTimer = 0;
      runnerPlayer.y = runnerGroundY - runnerPlayer.radius;
      runnerPlayer.vy = 0;
      runnerPlayer.isGrounded = true;
      runnerPlayer.trail = [];
      overlay.classList.add('hidden');
    }

    function resizeRunnerCanvas() {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0) {
        canvas.width = rect.width;
        canvas.height = rect.height || 240;
        runnerGroundY = canvas.height - 35;
        runnerPlayer.x = Math.max(45, canvas.width * 0.1);
      }
    }

    function startRunnerGame() {
      resetRunner();
      if (runnerAnimId) cancelAnimationFrame(runnerAnimId);
      runnerAnimId = requestAnimationFrame(loopRunner);
    }

    function jumpRunner() {
      if (runnerRunning && !runnerOver && runnerPlayer.isGrounded) {
        runnerPlayer.vy = runnerPlayer.jumpPower;
        runnerPlayer.isGrounded = false;
      }
    }

    let nextRunnerSpawnFrame = 0;

    function spawnRunnerObstacle() {
      const widthScale = Math.min(1.0, canvas.width / 900);
      const types = ['lens', 'noise', 'aperture', 'grating'];
      const chosenType = types[Math.floor(Math.random() * types.length)];

      // Random dynamic height & width for obstacle variety
      let randomH = (22 + Math.random() * 24) * widthScale;
      let randomW = (14 + Math.random() * 18) * widthScale;

      if (chosenType === 'lens') {
        randomH = (30 + Math.random() * 16) * widthScale;
        randomW = (20 + Math.random() * 10) * widthScale;
      } else if (chosenType === 'noise') {
        randomH = (24 + Math.random() * 20) * widthScale;
        randomW = (12 + Math.random() * 12) * widthScale;
      }

      runnerObstacles.push({
        x: canvas.width + 20,
        y: runnerGroundY - randomH,
        width: randomW,
        height: randomH,
        type: chosenType,
        passed: false,
        tunneled: false
      });

      // Schedule NEXT spawn at a MORE FREQUENT random interval
      const baseInterval = Math.max(22, Math.floor(45 / (widthScale || 1)));
      const randomExtra = Math.floor(Math.random() * 35);
      nextRunnerSpawnFrame = runnerFrameCount + baseInterval + randomExtra;
    }

    function updateRunner() {
      runnerFrameCount++;
      const widthScale = Math.min(1.0, canvas.width / 900);
      // Smoother, more comfortable speed progression curve
      runnerSpeed = (runnerBaseSpeed + (runnerScore / 1000)) * widthScale;

      // Realistic distance score accumulation rate
      runnerScore += Math.max(1, Math.floor(runnerSpeed / 6));
      if (runnerScore > runnerHighScore) {
        runnerHighScore = runnerScore;
        localStorage.setItem('photon_high_score', runnerHighScore);
      }

      // Check Quantum Tunneling Bonus Threshold (Every 10,000 Score)
      if (runnerScore >= nextTunnelingScore) {
        tunnelingCharges++;
        nextTunnelingScore += 10000;
        tunnelingNotifyTimer = 110; // ~1.8 seconds notification
      }

      // Gravity & Player Physics
      runnerPlayer.vy += runnerPlayer.gravity;
      runnerPlayer.y += runnerPlayer.vy;

      if (runnerPlayer.y >= runnerGroundY - runnerPlayer.radius) {
        runnerPlayer.y = runnerGroundY - runnerPlayer.radius;
        runnerPlayer.vy = 0;
        runnerPlayer.isGrounded = true;
      }

      // Trail FX
      runnerPlayer.trail.push({ x: runnerPlayer.x, y: runnerPlayer.y });
      if (runnerPlayer.trail.length > 10) runnerPlayer.trail.shift();

      // Spawn Obstacles with dynamic random intervals
      if (runnerFrameCount >= nextRunnerSpawnFrame) {
        spawnRunnerObstacle();
      }

      // Move & Check Obstacles
      for (let i = runnerObstacles.length - 1; i >= 0; i--) {
        const obs = runnerObstacles[i];
        obs.x -= runnerSpeed;

        // Collision Check (Circle vs AABB)
        const closestX = Math.max(obs.x, Math.min(runnerPlayer.x, obs.x + obs.width));
        const closestY = Math.max(obs.y, Math.min(runnerPlayer.y, obs.y + obs.height));

        const distanceX = runnerPlayer.x - closestX;
        const distanceY = runnerPlayer.y - closestY;
        const distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);

        if (distanceSquared < (runnerPlayer.radius * runnerPlayer.radius) && !obs.tunneled) {
          if (tunnelingCharges > 0) {
            // --- QUANTUM TUNNELING EFFECT ACTIVATED! ---
            tunnelingCharges--;
            obs.tunneled = true; // Mark as tunneled so it won't trigger again
            tunnelingEffectTimer = 40;
            tunnelingEffectPos = { x: runnerPlayer.x, y: runnerPlayer.y };
          } else {
            // Collision & Game Over
            endRunner();
            return;
          }
        }

        if (obs.x + obs.width < 0) {
          runnerObstacles.splice(i, 1);
        }
      }
    }

    function endRunner() {
      runnerRunning = false;
      runnerOver = true;
      triggerGameOverCooldown();
      if (runnerAnimId) {
        cancelAnimationFrame(runnerAnimId);
        runnerAnimId = null;
      }

      statusTitle.textContent = 'Photon Runner Over 🔬';
      statusSub.innerHTML = `Detector Noise Spike Hit!<br>Score: <strong>${runnerScore} ly</strong> | High: <strong>${runnerHighScore} ly</strong>`;
      startBtn.innerHTML = '<i class="fas fa-redo"></i> Play Again';

      const submitBox = document.getElementById('score-submit-box');
      if (submitBox) submitBox.style.display = 'flex';
      
      resizeRunnerCanvas();
      overlay.classList.remove('hidden');
    }

    function drawRunner() {
      // Clear Background
      ctx.fillStyle = '#0b0f19';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Ground Line
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, runnerGroundY);
      ctx.lineTo(canvas.width, runnerGroundY);
      ctx.stroke();

      // Draw Trail
      for (let i = 0; i < runnerPlayer.trail.length; i++) {
        const p = runnerPlayer.trail[i];
        const alpha = (i / runnerPlayer.trail.length) * 0.4;
        ctx.fillStyle = tunnelingCharges > 0 ? `rgba(168, 85, 247, ${alpha})` : `rgba(56, 189, 248, ${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, runnerPlayer.radius * (i / runnerPlayer.trail.length), 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw Player Photon (With Quantum Tunneling Aura if active)
      if (tunnelingCharges > 0) {
        // Quantum Superposition Wave Aura
        ctx.beginPath();
        ctx.arc(runnerPlayer.x, runnerPlayer.y, runnerPlayer.radius + 6 + Math.sin(runnerFrameCount * 0.2) * 3, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.8)';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#c084fc';
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      ctx.beginPath();
      ctx.arc(runnerPlayer.x, runnerPlayer.y, runnerPlayer.radius, 0, Math.PI * 2);
      ctx.fillStyle = tunnelingCharges > 0 ? '#c084fc' : '#ffffff';
      ctx.shadowBlur = 15;
      ctx.shadowColor = tunnelingCharges > 0 ? '#a855f7' : '#38bdf8';
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw Obstacles
      runnerObstacles.forEach(obs => {
        if (obs.type === 'lens') {
          ctx.fillStyle = obs.tunneled ? 'rgba(56, 189, 248, 0.3)' : 'rgba(56, 189, 248, 0.85)';
          ctx.strokeStyle = '#0284c7';
          ctx.lineWidth = 1.5;
          drawRoundedRect(ctx, obs.x, obs.y, obs.width, obs.height, 4);
          ctx.fill();
          ctx.stroke();
        } else if (obs.type === 'noise') {
          ctx.fillStyle = obs.tunneled ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.85)';
          ctx.beginPath();
          ctx.moveTo(obs.x, obs.y + obs.height);
          ctx.lineTo(obs.x + obs.width / 2, obs.y);
          ctx.lineTo(obs.x + obs.width, obs.y + obs.height);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.rect(obs.x, obs.y, obs.width, obs.height);
          ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 1.5;
          ctx.fill();
          ctx.stroke();
        }
      });

      ctx.font = '12px "Fira Code", monospace';
      ctx.fillStyle = '#9ca3af';
      ctx.fillText(`Distance: ${runnerScore} µm`, 16, 22);
      ctx.fillText(`High: ${runnerHighScore} µm`, canvas.width - 120, 22);
    }

    function drawRunnerStatic() { drawRunner(); }

    function loopRunner() {
      if (!runnerRunning || activeGameMode !== 'runner') return;
      updateRunner();
      drawRunner();
      runnerAnimId = requestAnimationFrame(loopRunner);
    }

    // ------------------------------------------------------------------------
    // GAME 2: Slot Gate 3D Engine (3D Wall Pass-Through & Superposition Wave)
    // ------------------------------------------------------------------------
    let roadsRunning = false;
    let roadsOver = false;
    let roadsScore = 0;
    let roadsHighScore = parseInt(localStorage.getItem('slotgate_high_score') || '0', 10);
    let roadsAnimId = null;

    let targetLane = 0; // -1: Left, 0: Center, 1: Right
    let playerX3D = 0;

    let gateSpeed = 6.5;
    let gates = []; // Active 3D Wall Gates
    let gateSpawnTimer = 0;

    // Quantum Superposition Wave Bonus State
    let superpositionCharges = 0;
    let clearedGateCount = 0;
    let lastBonusGateCount = 0;
    let waveNotifyTimer = 0;
    let waveExplosionTimer = 0;

    // Gate Generator (Single-Slot or Double-Slot Openings)
    function spawnGate() {
      // Choose opening type: 60% Single-Slot Open, 40% Double-Slot Open
      const isDoubleSlot = Math.random() < 0.45;
      let slots = [true, true, true]; // true = solid wall, false = open pass-through slot

      if (isDoubleSlot) {
        // 2 slots open, 1 wall
        const wallIdx = Math.floor(Math.random() * 3);
        slots[0] = (wallIdx === 0);
        slots[1] = (wallIdx === 1);
        slots[2] = (wallIdx === 2);
      } else {
        // 1 slot open, 2 walls
        const openIdx = Math.floor(Math.random() * 3);
        slots[0] = (openIdx !== 0);
        slots[1] = (openIdx !== 1);
        slots[2] = (openIdx !== 2);
      }

      gates.push({
        z: 1100, // Spawn far away near horizon for generous reaction time
        slots: slots,
        isDouble: isDoubleSlot,
        cleared: false
      });
    }

    function resetRoads() {
      if (roadsAnimId) {
        cancelAnimationFrame(roadsAnimId);
        roadsAnimId = null;
      }
      resizeRunnerCanvas();
      roadsRunning = true;
      roadsOver = false;
      roadsScore = 0;
      clearedGateCount = 0;
      lastBonusGateCount = 0;
      gateSpeed = 7.0;
      targetLane = 0;
      playerX3D = 0;
      gates = [];
      gateSpawnTimer = 0;
      superpositionCharges = 0;
      waveNotifyTimer = 0;
      waveExplosionTimer = 0;
      // Initial gate
      spawnGate();
      overlay.classList.add('hidden');
    }

    function startRoadsGame() {
      resetRoads();
      if (roadsAnimId) cancelAnimationFrame(roadsAnimId);
      roadsAnimId = requestAnimationFrame(loopRoads);
    }

    let canRestart = true;
    let restartCooldownTimer = null;

    function moveLaneLeft() {
      if (roadsRunning && !roadsOver) {
        if (targetLane > -1) targetLane--;
      }
    }

    function moveLaneRight() {
      if (roadsRunning && !roadsOver) {
        if (targetLane < 1) targetLane++;
      }
    }

    function triggerGameOverCooldown() {
      canRestart = false;
      if (restartCooldownTimer) clearTimeout(restartCooldownTimer);
      restartCooldownTimer = setTimeout(() => {
        canRestart = true;
      }, 450);
    }

    function updateRoads() {
      // 3x Faster Speed Acceleration Progression
      gateSpeed = 7.0 + Math.min(15.0, (clearedGateCount * 0.45));

      // Dynamic responsive slot spacing for mobile vs desktop
      const playerZ = 120;
      const fov = 280;
      const playerScale = fov / playerZ; // 2.333
      const baseSlotSpacing = (canvas.width * 0.30) / playerScale;

      // Smooth 3D Lane Transition
      playerX3D += (targetLane * baseSlotSpacing - playerX3D) * 0.38;

      // Spawn new gates with dynamic random distance intervals (420 - 740 Z)
      gateSpawnTimer += gateSpeed;
      const randomGateInterval = 420 + Math.floor(Math.random() * 320);
      if (gateSpawnTimer > randomGateInterval) {
        gateSpawnTimer = 0;
        spawnGate();
      }

      // Move gates towards player (Z: 1100 -> 120)
      for (let i = gates.length - 1; i >= 0; i--) {
        const gate = gates[i];
        gate.z -= gateSpeed;

        // Check Collision when gate reaches player Z plane
        if (!gate.cleared && gate.z <= playerZ + 25 && gate.z >= playerZ - 25) {
          const playerSlotIndex = targetLane + 1; // 0, 1, or 2
          if (gate.slots[playerSlotIndex]) {
            if (superpositionCharges > 0) {
              // --- QUANTUM SUPERPOSITION WAVE DESTROY ACTIVATED! ---
              superpositionCharges--;
              gate.cleared = true;
              waveExplosionTimer = 45;

              // Vaporize all solid walls in nearby range!
              gates.forEach(g => {
                if (Math.abs(g.z - playerZ) < 400) {
                  g.slots = [false, false, false];
                  g.cleared = true;
                }
              });

              clearedGateCount++;
              roadsScore = clearedGateCount * 100;

              // Grant 1 Superposition Wave Bonus every 100 cleared gates
              if (clearedGateCount - lastBonusGateCount >= 100) {
                superpositionCharges++;
                lastBonusGateCount = clearedGateCount;
                waveNotifyTimer = 90;
              }

              if (roadsScore > roadsHighScore) {
                roadsHighScore = roadsScore;
                localStorage.setItem('slotgate_high_score', roadsHighScore);
              }
            } else {
              // Hit Solid Wall & Game Over
              endRoads('Crashed Into 3D Wall Gate ⚡');
              return;
            }
          } else {
            // Successfully Passed Slot Gate!
            gate.cleared = true;
            clearedGateCount++;
            roadsScore = clearedGateCount * 100;

            // Grant 1 Superposition Wave Bonus every 100 cleared gates
            if (clearedGateCount - lastBonusGateCount >= 100) {
              superpositionCharges++;
              lastBonusGateCount = clearedGateCount;
              waveNotifyTimer = 90;
            }

            if (roadsScore > roadsHighScore) {
              roadsHighScore = roadsScore;
              localStorage.setItem('slotgate_high_score', roadsHighScore);
            }
          }
        }

        // Remove gates past player
        if (gate.z < 60) {
          gates.splice(i, 1);
        }
      }
    }

    function endRoads(reason) {
      roadsRunning = false;
      roadsOver = true;
      triggerGameOverCooldown();
      if (roadsAnimId) {
        cancelAnimationFrame(roadsAnimId);
        roadsAnimId = null;
      }

      statusTitle.textContent = 'Slot Gate 3D Over 🚀';
      statusSub.innerHTML = `${reason}<br>Gates Cleared: <strong>${clearedGateCount}</strong> (${roadsScore} pts) | High: <strong>${roadsHighScore} pts</strong>`;
      startBtn.innerHTML = '<i class="fas fa-redo"></i> Launch Again';

      const submitBox = document.getElementById('score-submit-box');
      if (submitBox && roadsScore > 50) submitBox.style.display = 'flex';
      if (gameModeCards) gameModeCards.style.display = 'flex';
      
      resizeRunnerCanvas();
      overlay.classList.remove('hidden');
    }

    function drawRoads() {
      // Background Synthwave Deep Space (No ground road track lines)
      ctx.fillStyle = '#060814';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const fov = 280;
      const horizonY = canvas.height * 0.42;
      const cx = canvas.width / 2;

      // Draw Starfield Background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      for (let i = 0; i < 45; i++) {
        const sx = (Math.sin(i * 99 + roadsScore * 0.01) * 0.5 + 0.5) * canvas.width;
        const sy = (Math.cos(i * 33 + roadsScore * 0.01) * 0.5 + 0.5) * horizonY;
        ctx.fillRect(sx, sy, 1.5, 1.5);
      }

      // Draw Distant Horizon Glow Line
      ctx.beginPath();
      ctx.moveTo(0, horizonY);
      ctx.lineTo(canvas.width, horizonY);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Sort and Draw 3D Wall Gates from Far to Near
      const sortedGates = [...gates].sort((a, b) => b.z - a.z);

      const playerZ = 120;
      const playerScale = fov / playerZ; // 2.333
      const baseSlotSpacing = (canvas.width * 0.30) / playerScale;
      const slotOffsets = [-baseSlotSpacing, 0, baseSlotSpacing];
      const slotWidth = (canvas.width * 0.26) / playerScale;
      const wallHeight3D = 170;

      sortedGates.forEach(gate => {
        const scale = fov / Math.max(30, gate.z);
        const yTop = horizonY - (wallHeight3D * 0.5) * scale;
        const yBot = horizonY + (wallHeight3D * 0.5) * scale;

        // Draw the 3D Wall Gate across the 3 slots
        for (let s = 0; s < 3; s++) {
          const slotXOffset = slotOffsets[s];
          const xLeft = cx + (slotXOffset - slotWidth / 2) * scale;
          const xRight = cx + (slotXOffset + slotWidth / 2) * scale;
          const isSolid = gate.slots[s];

          if (isSolid) {
            // --- Solid Cyber Wall Panel ---
            ctx.beginPath();
            ctx.moveTo(xLeft, yBot);
            ctx.lineTo(xRight, yBot);
            ctx.lineTo(xRight, yTop);
            ctx.lineTo(xLeft, yTop);
            ctx.closePath();

            // Wall Panel Fill & Glow
            const wallGrad = ctx.createLinearGradient(xLeft, yTop, xRight, yBot);
            wallGrad.addColorStop(0, 'rgba(147, 51, 234, 0.85)');
            wallGrad.addColorStop(0.5, 'rgba(79, 70, 229, 0.90)');
            wallGrad.addColorStop(1, 'rgba(30, 27, 75, 0.95)');

            ctx.fillStyle = wallGrad;
            ctx.strokeStyle = '#a855f7';
            ctx.lineWidth = Math.max(1, 2 * scale);
            ctx.shadowBlur = Math.min(15, 8 * scale);
            ctx.shadowColor = '#c084fc';
            ctx.fill();
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Grid Wireframe Detail Lines on Wall
            ctx.beginPath();
            ctx.moveTo((xLeft + xRight) / 2, yTop);
            ctx.lineTo((xLeft + xRight) / 2, yBot);
            ctx.moveTo(xLeft, (yTop + yBot) / 2);
            ctx.lineTo(xRight, (yTop + yBot) / 2);
            ctx.strokeStyle = 'rgba(216, 180, 254, 0.4)';
            ctx.lineWidth = 1;
            ctx.stroke();
          } else {
            // --- Open Pass-Through Slot Gate Portal Frame ---
            ctx.beginPath();
            ctx.moveTo(xLeft, yBot);
            ctx.lineTo(xRight, yBot);
            ctx.lineTo(xRight, yTop);
            ctx.lineTo(xLeft, yTop);
            ctx.closePath();

            // Clear Green/Cyan Portal Frame Glow
            ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = Math.max(1.5, 3 * scale);
            ctx.shadowBlur = Math.min(18, 10 * scale);
            ctx.shadowColor = '#34d399';
            ctx.fill();
            ctx.stroke();
            ctx.shadowBlur = 0;
          }
        }
      });

      // Draw Player 3D Volumetric Photon Sphere (Always visible on mobile & desktop!)
      const px = cx + (playerX3D * playerScale);
      const py = horizonY + (wallHeight3D * 0.25) * playerScale;
      const photonRadius = Math.max(10, (canvas.width * 0.035) * (playerScale / 2.33));

      // Quantum Superposition Wave Shockwave Aura (When active)
      if (superpositionCharges > 0) {
        ctx.beginPath();
        ctx.arc(px, py, photonRadius * 2.8 + Math.sin(roadsScore * 0.15) * 4, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 18;
        ctx.shadowColor = '#38bdf8';
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Outer Volumetric Photon Glow Aura
      const outerGlow = ctx.createRadialGradient(px, py, Math.max(1, photonRadius * 0.2), px, py, Math.max(2, photonRadius * 2.4));
      outerGlow.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      outerGlow.addColorStop(0.3, 'rgba(56, 189, 248, 0.85)');
      outerGlow.addColorStop(0.7, 'rgba(20, 184, 166, 0.35)');
      outerGlow.addColorStop(1, 'rgba(56, 189, 248, 0)');

      ctx.beginPath();
      ctx.arc(px, py, photonRadius * 2.4, 0, Math.PI * 2);
      ctx.fillStyle = outerGlow;
      ctx.fill();

      // 3D Orbital Wavefront Rings
      ctx.beginPath();
      ctx.ellipse(px, py + 2, Math.max(2, photonRadius * 1.8), Math.max(1, photonRadius * 0.65), Math.PI / 6, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(px, py - 2, Math.max(2, photonRadius * 1.8), Math.max(1, photonRadius * 0.65), -Math.PI / 6, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.75)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Core 3D White Hot Photon Sphere
      const coreGrad = ctx.createRadialGradient(Math.max(0, px - photonRadius * 0.3), Math.max(0, py - photonRadius * 0.3), 1, px, py, Math.max(2, photonRadius));
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(0.5, '#38bdf8');
      coreGrad.addColorStop(1, '#0284c7');

      ctx.beginPath();
      ctx.arc(px, py, photonRadius, 0, Math.PI * 2);
      ctx.fillStyle = coreGrad;
      ctx.shadowBlur = 18;
      ctx.shadowColor = '#38bdf8';
      ctx.fill();
      ctx.shadowBlur = 0;

      // Quantum Wave Vaporizer Explosion FX
      if (waveExplosionTimer > 0) {
        waveExplosionTimer--;
        ctx.beginPath();
        ctx.arc(px, py, (45 - waveExplosionTimer) * 7.5, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(56, 189, 248, ${waveExplosionTimer / 45})`;
        ctx.lineWidth = 4;
        ctx.shadowBlur = 22;
        ctx.shadowColor = '#38bdf8';
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.font = 'bold 13px var(--font-heading)';
        ctx.fillStyle = '#38bdf8';
        ctx.fillText('🌊 WALL VAPORIZED BY QUANTUM WAVE!', px - 110, py - 35);
      }

      // HUD Text
      ctx.font = '12px "Fira Code", monospace';
      ctx.fillStyle = '#9ca3af';
      ctx.fillText(`Gates Cleared: ${clearedGateCount} (${roadsScore} pts)`, 16, 26);
      ctx.fillText(`High: ${roadsHighScore} pts`, canvas.width - 145, 26);

      // Superposition Wave Badge HUD
      if (superpositionCharges > 0) {
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 11px "Fira Code", monospace';
        ctx.fillText(`Superposition Wave: ${'🌊'.repeat(superpositionCharges)} (${superpositionCharges})`, 16, 44);
      }

      // Notification Banner
      if (waveNotifyTimer > 0) {
        waveNotifyTimer--;
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 13px var(--font-heading)';
        ctx.textAlign = 'center';
        ctx.fillText('🌊 QUANTUM SUPERPOSITION WAVE UNLOCKED! (+1 Wall Vaporizer)', canvas.width / 2, 40);
        ctx.textAlign = 'left';
      }
    }

    function drawRoadsStatic() { drawRoads(); }

    function loopRoads() {
      if (!roadsRunning || activeGameMode !== 'skyroads') return;
      updateRoads();
      drawRoads();
      roadsAnimId = requestAnimationFrame(loopRoads);
    }

    // ------------------------------------------------------------------------
    // Game Mode Switcher & Input Router
    // ------------------------------------------------------------------------
    // Center Big Game Selection Cards Handlers
    const selectRunnerBtn = document.getElementById('select-game-runner');
    const selectSkyroadsBtn = document.getElementById('select-game-skyroads');
    const gameModeCards = document.getElementById('game-mode-selector-cards');

    if (selectRunnerBtn && selectSkyroadsBtn) {
      selectRunnerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (tabRunner && tabSkyroads) {
          tabRunner.classList.add('active');
          tabSkyroads.classList.remove('active');
        }
        activeGameMode = 'runner';
        gameHintText.innerHTML = 'Controls: Press <strong>Space</strong> or <strong>Tap</strong> to Jump';
        startRunnerGame();
      });

      selectSkyroadsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        activeGameMode = 'skyroads';
        gameHintText.innerHTML = 'Controls: Press <strong>← / →</strong> or <strong>Touch Left/Right</strong> to Pass Wall Slots';
        startRoadsGame();
      });
    }

    if (tabRunner && tabSkyroads) {
      tabRunner.addEventListener('click', () => {
        tabRunner.classList.add('active');
        tabSkyroads.classList.remove('active');
        activeGameMode = 'runner';
        gameHintText.innerHTML = 'Controls: Press <strong>Space</strong> or <strong>Tap</strong> to Jump';
        statusTitle.textContent = 'Photon Runner 🔬';
        statusSub.innerHTML = 'Jump over optical lenses & sensor noise spikes!';
        if (gameModeCards) gameModeCards.style.display = 'flex';
        resizeRunnerCanvas();
        overlay.classList.remove('hidden');
      });

      tabSkyroads.addEventListener('click', () => {
        tabSkyroads.classList.add('active');
        tabRunner.classList.remove('active');
        activeGameMode = 'skyroads';
        gameHintText.innerHTML = 'Controls: <strong>←/→</strong> or <strong>Swipe</strong> to Switch Lane | <strong>Space</strong> to Jump';
        statusTitle.textContent = 'Slot Roads (3D) 🚀';
        statusSub.innerHTML = '3D SkyRoads-style space track runner! Jump gaps & dodge lasers!';
        if (gameModeCards) gameModeCards.style.display = 'flex';
        resizeRunnerCanvas();
        overlay.classList.remove('hidden');
      });
    }

    // Unified Keyboard Listeners
    window.addEventListener('keydown', (e) => {
      const rect = canvas.getBoundingClientRect();
      const inView = (rect.top > -100 && rect.bottom < window.innerHeight + 100);

      if (!inView) return;

      if (activeGameMode === 'runner') {
        if (e.code === 'Space' || e.code === 'ArrowUp') {
          e.preventDefault();
          if (runnerRunning && !runnerOver) {
            jumpRunner();
          } else if (runnerOver && canRestart) {
            startRunnerGame();
          }
        }
      } else {
        if (e.code === 'Space' || e.code === 'ArrowUp') {
          e.preventDefault();
          if (roadsOver && canRestart) {
            startRoadsGame();
          }
        } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
          e.preventDefault();
          moveLaneLeft();
        } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
          e.preventDefault();
          moveLaneRight();
        }
      }
    });

    // ------------------------------------------------------------------------
    // Touch & Mouse Input Router for 2D Jump & 3D Lane Switching
    // ------------------------------------------------------------------------
    let touchStartX = 0;

    canvas.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
    }, { passive: true });

    canvas.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - touchStartX;

      if (activeGameMode === 'runner') {
        jumpRunner();
      } else {
        if (Math.abs(dx) > 25) {
          if (dx > 0) moveLaneRight();
          else moveLaneLeft();
        } else {
          const touchX = e.changedTouches[0].clientX;
          const rect = canvas.getBoundingClientRect();
          const midX = rect.left + rect.width / 2;
          if (touchX < midX) moveLaneLeft();
          else moveLaneRight();
        }
      }
    });

    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') {
        e.preventDefault();
        if (activeGameMode === 'runner') {
          jumpRunner();
        } else {
          const rect = canvas.getBoundingClientRect();
          const midX = e.clientX - rect.left;
          if (midX < rect.width / 2) moveLaneLeft();
          else moveLaneRight();
        }
      }
    });

    // ------------------------------------------------------------------------
    // Global Online Leaderboard System (Fresh Reset Data & Storage)
    // ------------------------------------------------------------------------
    const KVDB_ENDPOINT = 'https://kvdb.io/8x83fM5uNnK5vK3Y2aZ4b1/yp_leaderboard_v2';

    const leaderboardBtn = document.getElementById('leaderboard-toggle-btn');
    const leaderboardModal = document.getElementById('leaderboard-modal');
    const leaderboardCloseBtn = document.getElementById('close-leaderboard');
    const leaderboardBottomCloseBtn = document.getElementById('close-leaderboard-bottom-btn');
    const leaderboardBody = document.getElementById('leaderboard-body');
    const nicknameInput = document.getElementById('nickname-input');
    const submitScoreBtn = document.getElementById('submit-score-btn');

    // Wipe old cached key if present
    localStorage.removeItem('yp_cached_leaderboard');

    let cachedLeaderboard = JSON.parse(localStorage.getItem('yp_leaderboard_v2') || '[]');

    if (cachedLeaderboard.length === 0) {
      cachedLeaderboard = [
        { name: 'Dr. Park 🔬', score: 300, game: 'Photon Runner' },
        { name: 'OpticsLab 🚀', score: 200, game: 'Slot Gate 3D' }
      ];
    }

    function renderLeaderboardTable(data) {
      if (!leaderboardBody) return;
      leaderboardBody.innerHTML = '';

      if (!data || data.length === 0) {
        leaderboardBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-secondary);">No scores registered yet. Be the first!</td></tr>`;
        return;
      }

      data.sort((a, b) => b.score - a.score);
      const top10 = data.slice(0, 10);

      top10.forEach((item, index) => {
        const tr = document.createElement('tr');
        let rankBadge = `${index + 1}`;
        if (index === 0) rankBadge = '🥇 1st';
        else if (index === 1) rankBadge = '🥈 2nd';
        else if (index === 2) rankBadge = '🥉 3rd';

        tr.innerHTML = `
          <td style="font-weight: 700;">${rankBadge}</td>
          <td style="font-weight: 600; color: var(--text-primary);">${item.name}</td>
          <td><span class="card-badge" style="font-size: 0.65rem; padding: 0.1rem 0.4rem;">${item.game || 'Arcade'}</span></td>
          <td style="font-weight: 700; color: var(--accent-cyan); font-family: monospace;">${item.score.toLocaleString()}</td>
        `;
        leaderboardBody.appendChild(tr);
      });
    }

    async function fetchOnlineLeaderboard() {
      renderLeaderboardTable(cachedLeaderboard);
      try {
        const res = await fetch(KVDB_ENDPOINT);
        if (res.ok) {
          const remoteData = await res.json();
          if (Array.isArray(remoteData) && remoteData.length > 0) {
            cachedLeaderboard = remoteData;
            localStorage.setItem('yp_cached_leaderboard', JSON.stringify(cachedLeaderboard));
            renderLeaderboardTable(cachedLeaderboard);
          }
        }
      } catch (err) {
        console.log('Leaderboard offline fallback in use');
      }
    }

    async function submitScoreToLeaderboard(nickname, score, gameName) {
      if (!nickname || nickname.trim() === '') nickname = 'Anonymous';
      nickname = nickname.trim().substring(0, 12);

      cachedLeaderboard.push({
        name: nickname,
        score: score,
        game: gameName,
        date: new Date().toISOString().split('T')[0]
      });

      cachedLeaderboard.sort((a, b) => b.score - a.score);
      cachedLeaderboard = cachedLeaderboard.slice(0, 15);
      localStorage.setItem('yp_leaderboard_v2', JSON.stringify(cachedLeaderboard));

      try {
        await fetch(KVDB_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cachedLeaderboard)
        });
      } catch (err) {
        console.log('Online submit failed, cached locally');
      }

      fetchOnlineLeaderboard();
      openLeaderboardModal();
    }

    function openLeaderboardModal() {
      if (leaderboardModal) {
        leaderboardModal.classList.remove('hidden');
        fetchOnlineLeaderboard();
      }
    }

    function closeLeaderboardModal() {
      if (leaderboardModal) {
        leaderboardModal.classList.add('hidden');
      }
    }

    // Leaderboard Event Listeners
    if (leaderboardBtn) {
      leaderboardBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openLeaderboardModal();
      });
    }

    if (leaderboardCloseBtn) {
      leaderboardCloseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeLeaderboardModal();
      });
    }

    if (leaderboardBottomCloseBtn) {
      leaderboardBottomCloseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeLeaderboardModal();
      });
    }

    if (leaderboardModal) {
      leaderboardModal.addEventListener('click', (e) => {
        if (e.target === leaderboardModal) {
          closeLeaderboardModal();
        }
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && leaderboardModal && !leaderboardModal.classList.contains('hidden')) {
        closeLeaderboardModal();
      }
    });

    if (submitScoreBtn && nicknameInput) {
      submitScoreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const nickname = nicknameInput.value;
        const currentScore = activeGameMode === 'runner' ? runnerScore : roadsScore;
        const gameName = activeGameMode === 'runner' ? 'Photon Runner' : 'Slot Gate 3D';
        submitScoreToLeaderboard(nickname, currentScore, gameName);
      });
    }

    startBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!canRestart) return;
      if (activeGameMode === 'runner') {
        resetRunner();
        if (!runnerAnimId) loopRunner();
      } else {
        resetRoads();
        if (!roadsAnimId) loopRoads();
      }
    });

    // Initial setup
    setTimeout(() => {
      resizeRunnerCanvas();
    }, 100);
  }
});
