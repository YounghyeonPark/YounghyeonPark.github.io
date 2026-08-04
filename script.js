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
      runnerBaseSpeed = 12.0;
      runnerFrameCount = 0;
      runnerObstacles = [];
      runnerPlayer.y = runnerGroundY - runnerPlayer.radius;
      runnerPlayer.vy = 0;
      runnerPlayer.isGrounded = true;
      runnerPlayer.trail = [];
      overlay.classList.add('hidden');
    }

    function startRunnerGame() {
      resetRunner();
      if (runnerAnimId) cancelAnimationFrame(runnerAnimId);
      runnerAnimId = requestAnimationFrame(loopRunner);
    }

    function jumpRunner() {
      if (!runnerRunning || runnerOver) {
        startRunnerGame();
        return;
      }
      if (runnerPlayer.isGrounded) {
        runnerPlayer.vy = runnerPlayer.jumpPower;
        runnerPlayer.isGrounded = false;
      }
    }

    function spawnRunnerObstacle() {
      const types = ['lens', 'prism', 'noise'];
      const type = types[Math.floor(Math.random() * types.length)];
      let height = 26 + Math.random() * 20;
      let width = 16 + Math.random() * 12;

      runnerObstacles.push({
        x: canvas.width + 20,
        y: runnerGroundY - height,
        width: width,
        height: height,
        type: type
      });
    }

    function updateRunner() {
      runnerFrameCount++;
      runnerScore += 2;
      if (runnerScore > runnerHighScore) {
        runnerHighScore = runnerScore;
        localStorage.setItem('photon_high_score', runnerHighScore);
      }

      if (runnerFrameCount % 200 === 0 && runnerBaseSpeed < 18.0) {
        runnerBaseSpeed += 0.5;
        const widthScale = Math.min(1.2, Math.max(0.42, canvas.width / 900));
        runnerSpeed = runnerBaseSpeed * widthScale;
      }

      runnerPlayer.vy += runnerPlayer.gravity;
      runnerPlayer.y += runnerPlayer.vy;

      if (runnerPlayer.y >= runnerGroundY - runnerPlayer.radius) {
        runnerPlayer.y = runnerGroundY - runnerPlayer.radius;
        runnerPlayer.vy = 0;
        runnerPlayer.isGrounded = true;
      }

      runnerPlayer.trail.push({ x: runnerPlayer.x, y: runnerPlayer.y, alpha: 1 });
      if (runnerPlayer.trail.length > 12) runnerPlayer.trail.shift();
      runnerPlayer.trail.forEach(t => t.alpha -= 0.07);

      if (runnerFrameCount % Math.max(20, Math.floor(100 / (runnerSpeed * 0.15))) === 0) {
        if (Math.random() > 0.2) {
          spawnRunnerObstacle();
        }
      }

      for (let i = runnerObstacles.length - 1; i >= 0; i--) {
        const obs = runnerObstacles[i];
        obs.x -= runnerSpeed;

        const closestX = Math.max(obs.x, Math.min(runnerPlayer.x, obs.x + obs.width));
        const closestY = Math.max(obs.y, Math.min(runnerPlayer.y, obs.y + obs.height));
        const distX = runnerPlayer.x - closestX;
        const distY = runnerPlayer.y - closestY;
        const distance = Math.sqrt(distX * distX + distY * distY);

        if (distance < runnerPlayer.radius - 2) {
          endRunner();
        }

        if (obs.x + obs.width < -30) {
          runnerObstacles.splice(i, 1);
        }
      }
    }

    function endRunner() {
      runnerRunning = false;
      runnerOver = true;
      if (runnerAnimId) {
        cancelAnimationFrame(runnerAnimId);
        runnerAnimId = null;
      }

      statusTitle.textContent = 'Photon Runner Over 🔬';
      statusSub.innerHTML = `Distance: <strong>${runnerScore} µm</strong> | High Score: <strong>${runnerHighScore} µm</strong>`;
      startBtn.innerHTML = '<i class="fas fa-redo"></i> Play Again';
      
      const submitBox = document.getElementById('score-submit-box');
      if (submitBox && runnerScore > 50) submitBox.style.display = 'flex';
      overlay.classList.remove('hidden');
    }

    function drawRunner() {
      ctx.fillStyle = '#050811';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.beginPath();
      ctx.moveTo(0, runnerGroundY);
      ctx.lineTo(canvas.width, runnerGroundY);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.stroke();

      runnerPlayer.trail.forEach(t => {
        if (t.alpha > 0) {
          ctx.beginPath();
          ctx.arc(t.x, t.y, runnerPlayer.radius * 0.6, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(56, 189, 248, ${t.alpha * 0.45})`;
          ctx.fill();
        }
      });

      ctx.beginPath();
      ctx.arc(runnerPlayer.x, runnerPlayer.y, runnerPlayer.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#38bdf8';
      ctx.fill();
      ctx.shadowBlur = 0;

      runnerObstacles.forEach(obs => {
        if (obs.type === 'lens') {
          drawRoundedRect(ctx, obs.x, obs.y, obs.width, obs.height, 5);
          ctx.fillStyle = 'rgba(20, 184, 166, 0.4)';
          ctx.strokeStyle = '#14b8a6';
          ctx.lineWidth = 1.5;
          ctx.fill();
          ctx.stroke();
        } else if (obs.type === 'prism') {
          ctx.beginPath();
          ctx.moveTo(obs.x + obs.width / 2, obs.y);
          ctx.lineTo(obs.x + obs.width, obs.y + obs.height);
          ctx.lineTo(obs.x, obs.y + obs.height);
          ctx.closePath();
          ctx.fillStyle = 'rgba(168, 85, 247, 0.4)';
          ctx.strokeStyle = '#a855f7';
          ctx.lineWidth = 1.5;
          ctx.fill();
          ctx.stroke();
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
    // GAME 2: Slot Gate 3D Engine (3D Wall Pass-Through - Single & Double Slots)
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
      gateSpeed = 6.5;
      targetLane = 0;
      playerX3D = 0;
      gates = [];
      gateSpawnTimer = 0;
      // Initial gate
      spawnGate();
      overlay.classList.add('hidden');
    }

    function startRoadsGame() {
      resetRoads();
      if (roadsAnimId) cancelAnimationFrame(roadsAnimId);
      roadsAnimId = requestAnimationFrame(loopRoads);
    }

    function moveLaneLeft() {
      if (!roadsRunning || roadsOver) {
        startRoadsGame();
        return;
      }
      if (targetLane > -1) targetLane--;
    }

    function moveLaneRight() {
      if (!roadsRunning || roadsOver) {
        startRoadsGame();
        return;
      }
      if (targetLane < 1) targetLane++;
    }

    function updateRoads() {
      // Speed & Score Progression (Gentle curve)
      gateSpeed = 6.5 + Math.min(6.0, roadsScore / 1000);

      // Dynamic responsive slot spacing for mobile vs desktop
      const playerZ = 120;
      const fov = 280;
      const playerScale = fov / playerZ; // 2.333
      const baseSlotSpacing = (canvas.width * 0.30) / playerScale;

      // Smooth 3D Lane Transition
      playerX3D += (targetLane * baseSlotSpacing - playerX3D) * 0.38;

      // Spawn new gates with generous distance (Interval > 550)
      gateSpawnTimer += gateSpeed;
      if (gateSpawnTimer > 550) {
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
            // Hit Solid Wall!
            endRoads('Crashed Into 3D Wall Gate ⚡');
            return;
          } else {
            // Successfully Passed Slot Gate!
            gate.cleared = true;
            roadsScore += 100;
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
      if (roadsAnimId) {
        cancelAnimationFrame(roadsAnimId);
        roadsAnimId = null;
      }

      statusTitle.textContent = 'Slot Gate 3D Over 🚀';
      statusSub.innerHTML = `${reason}<br>Score: <strong>${roadsScore}</strong> | High: <strong>${roadsHighScore}</strong>`;
      startBtn.innerHTML = '<i class="fas fa-redo"></i> Launch Again';

      const submitBox = document.getElementById('score-submit-box');
      if (submitBox && roadsScore > 50) submitBox.style.display = 'flex';
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

      // HUD Text
      ctx.font = '12px "Fira Code", monospace';
      ctx.fillStyle = '#9ca3af';
      ctx.fillText(`Gates Cleared: ${Math.floor(roadsScore / 100)}`, 16, 26);
      ctx.fillText(`High: ${roadsHighScore}`, canvas.width - 130, 26);
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
          jumpRunner();
        }
      } else {
        if (e.code === 'Space' || e.code === 'ArrowUp') {
          e.preventDefault();
          jumpRoads();
        } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
          e.preventDefault();
          moveLaneLeft();
        } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
          e.preventDefault();
          moveLaneRight();
        }
      }
    });

    // Touch & Mouse Input Router for 2D Jump & 3D Lane Switching
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

    startBtn.addEventListener('click', (e) => {
      e.stopPropagation();
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
