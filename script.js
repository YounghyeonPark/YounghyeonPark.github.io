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
    // GAME 2: Pseudo-3D Slot Roads Engine (SkyRoads Style)
    // ------------------------------------------------------------------------
    let roadsRunning = false;
    let roadsOver = false;
    let roadsScore = 0;
    let roadsHighScore = parseInt(localStorage.getItem('slotroads_high_score') || '0', 10);
    let roadsAnimId = null;

    let playerLane = 0; // -1: Left, 0: Center, 1: Right
    let targetLane = 0;
    let playerX3D = 0;
    let playerY3D = 0;
    let playerVY3D = 0;
    let isRoadsGrounded = true;

    let roadSpeed = 11.0;
    let roadZOffset = 0;
    let roadTrack = [];

    function initRoadTrack() {
      roadTrack = [];
      // Generate 100 track segments
      for (let i = 0; i < 120; i++) {
        if (i < 10) {
          // Safe starting zone
          roadTrack.push({ left: true, center: true, right: true, obstacle: null });
        } else {
          // Random slots (gaps and obstacles)
          const left = Math.random() > 0.25;
          const center = Math.random() > 0.25;
          const right = Math.random() > 0.25;
          // Ensure at least 1 lane is open
          const hasOpen = left || center || right;
          let obstacle = null;
          if (hasOpen && Math.random() < 0.3) {
            obstacle = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
          }

          roadTrack.push({
            left: hasOpen ? left : true,
            center: hasOpen ? center : true,
            right: hasOpen ? right : true,
            obstacle: obstacle
          });
        }
      }
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
      roadSpeed = 11.0;
      roadZOffset = 0;
      playerLane = 0;
      targetLane = 0;
      playerX3D = 0;
      playerY3D = 0;
      playerVY3D = 0;
      isRoadsGrounded = true;
      initRoadTrack();
      overlay.classList.add('hidden');
    }

    function startRoadsGame() {
      resetRoads();
      if (roadsAnimId) cancelAnimationFrame(roadsAnimId);
      roadsAnimId = requestAnimationFrame(loopRoads);
    }

    function jumpRoads() {
      if (!roadsRunning || roadsOver) {
        startRoadsGame();
        return;
      }
      if (isRoadsGrounded) {
        playerVY3D = -13;
        isRoadsGrounded = false;
      }
    }

    function moveLaneLeft() {
      if (targetLane > -1) targetLane--;
    }

    function moveLaneRight() {
      if (targetLane < 1) targetLane++;
    }

    function updateRoads() {
      roadsScore += 3;
      if (roadsScore > roadsHighScore) {
        roadsHighScore = roadsScore;
        localStorage.setItem('slotroads_high_score', roadsHighScore);
      }

      // Smooth lane transition
      playerX3D += (targetLane * 140 - playerX3D) * 0.25;

      // Jump & Gravity
      playerVY3D += 0.8;
      playerY3D += playerVY3D;

      if (playerY3D >= 0) {
        playerY3D = 0;
        playerVY3D = 0;
        isRoadsGrounded = true;
      }

      // Speed progression
      roadZOffset += roadSpeed;
      const segmentLength = 120;
      const currentSegmentIndex = Math.floor(roadZOffset / segmentLength);

      if (currentSegmentIndex >= roadTrack.length - 15) {
        // Extend track infinitely
        for (let i = 0; i < 30; i++) {
          const left = Math.random() > 0.25;
          const center = Math.random() > 0.25;
          const right = Math.random() > 0.25;
          const hasOpen = left || center || right;
          roadTrack.push({
            left: hasOpen ? left : true,
            center: hasOpen ? center : true,
            right: hasOpen ? right : true,
            obstacle: (hasOpen && Math.random() < 0.3) ? Math.floor(Math.random() * 3) - 1 : null
          });
        }
      }

      // Check collision with track gaps and obstacles
      const currentSeg = roadTrack[currentSegmentIndex];
      if (currentSeg && isRoadsGrounded) {
        let currentLaneKey = targetLane === -1 ? 'left' : targetLane === 0 ? 'center' : 'right';
        if (!currentSeg[currentLaneKey]) {
          // Fell into gap!
          endRoads('Fell Into Deep Space 🌌');
          return;
        }

        if (currentSeg.obstacle === targetLane) {
          // Hit barrier!
          endRoads('Crashed into Laser Barrier ⚡');
          return;
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

      statusTitle.textContent = 'Slot Roads Over 🚀';
      statusSub.innerHTML = `${reason}<br>Score: <strong>${roadsScore} ly</strong> | High: <strong>${roadsHighScore} ly</strong>`;
      startBtn.innerHTML = '<i class="fas fa-redo"></i> Launch Again';

      const submitBox = document.getElementById('score-submit-box');
      if (submitBox && roadsScore > 50) submitBox.style.display = 'flex';
      overlay.classList.remove('hidden');
    }

    function drawRoads() {
      // Background Synthwave Space
      ctx.fillStyle = '#050714';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const fov = 280;
      const horizonY = canvas.height * 0.28;
      const cx = canvas.width / 2;
      const cameraHeight = 55;
      const segmentLength = 120;

      // Draw Starfield Background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      for (let i = 0; i < 20; i++) {
        let sx = (Math.sin(i * 99 + roadZOffset * 0.001) * 0.5 + 0.5) * canvas.width;
        let sy = (Math.cos(i * 33) * 0.5 + 0.5) * horizonY;
        ctx.fillRect(sx, sy, 1.5, 1.5);
      }

      // Draw 3D Track Slots
      const visibleSegments = 25;
      const startIdx = Math.floor(roadZOffset / segmentLength);

      for (let i = visibleSegments; i >= 0; i--) {
        const segIdx = startIdx + i;
        const seg = roadTrack[segIdx];
        if (!seg) continue;

        const z1 = (segIdx * segmentLength) - roadZOffset + 80;
        const z2 = z1 + segmentLength;

        if (z1 <= 10) continue;

        const scale1 = fov / z1;
        const scale2 = fov / z2;

        const y1 = horizonY + cameraHeight * scale1;
        const y2 = horizonY + cameraHeight * scale2;

        const lanes = [
          { key: 'left', xOffset: -140 },
          { key: 'center', xOffset: 0 },
          { key: 'right', xOffset: 140 }
        ];

        lanes.forEach((lane, laneIdx) => {
          if (!seg[lane.key]) return; // Gap / Hole

          const x1a = cx + (lane.xOffset - 60) * scale1;
          const x1b = cx + (lane.xOffset + 60) * scale1;
          const x2a = cx + (lane.xOffset - 60) * scale2;
          const x2b = cx + (lane.xOffset + 60) * scale2;

          ctx.beginPath();
          ctx.moveTo(x1a, y1);
          ctx.lineTo(x1b, y1);
          ctx.lineTo(x2b, y2);
          ctx.lineTo(x2a, y2);
          ctx.closePath();

          ctx.fillStyle = (segIdx % 2 === 0) ? 'rgba(56, 189, 248, 0.15)' : 'rgba(20, 184, 166, 0.15)';
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1;
          ctx.fill();
          ctx.stroke();

          // Obstacle on track
          if (seg.obstacle === (laneIdx - 1)) {
            const obsY1 = y1 - 40 * scale1;
            const obsY2 = y2 - 40 * scale2;

            ctx.beginPath();
            ctx.moveTo(x1a, obsY1);
            ctx.lineTo(x1b, obsY1);
            ctx.lineTo(x2b, obsY2);
            ctx.lineTo(x2a, obsY2);
            ctx.closePath();

            ctx.fillStyle = 'rgba(239, 68, 68, 0.5)';
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 1.5;
            ctx.fill();
            ctx.stroke();
          }
        });
      }

      // Draw 3D Player Spaceship/Probe (Aligned 100% with 3D track slots)
      const playerZ = 120;
      const playerScale = fov / playerZ;
      const px = cx + (playerX3D * playerScale);
      const py = (horizonY + cameraHeight * playerScale) + (playerY3D * playerScale);

      // Spaceship Body (Drawn with glow & exact lane alignment)
      ctx.beginPath();
      ctx.moveTo(px, py - 18 * playerScale);
      ctx.lineTo(px + 16 * playerScale, py + 10 * playerScale);
      ctx.lineTo(px, py + 4 * playerScale);
      ctx.lineTo(px - 16 * playerScale, py + 10 * playerScale);
      ctx.closePath();

      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#38bdf8';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // HUD Text (Safe Padding)
      ctx.font = '12px "Fira Code", monospace';
      ctx.fillStyle = '#9ca3af';
      ctx.fillText(`Distance: ${roadsScore} ly`, 16, 26);
      ctx.fillText(`High: ${roadsHighScore} ly`, canvas.width - 130, 26);
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
        if (tabRunner && tabSkyroads) {
          tabSkyroads.classList.add('active');
          tabRunner.classList.remove('active');
        }
        activeGameMode = 'skyroads';
        gameHintText.innerHTML = 'Controls: <strong>←/→</strong> or <strong>Swipe</strong> to Switch Lane | <strong>Space</strong> to Jump';
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

    // Touch Swipe Router for Mobile
    let touchStartX = 0;
    let touchStartY = 0;

    canvas.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }, { passive: true });

    canvas.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;

      if (activeGameMode === 'runner') {
        jumpRunner();
      } else {
        if (Math.abs(dx) > 30) {
          if (dx > 0) moveLaneRight();
          else moveLaneLeft();
        } else {
          jumpRoads();
        }
      }
    });

    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') {
        e.preventDefault();
        if (activeGameMode === 'runner') jumpRunner();
        else jumpRoads();
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
