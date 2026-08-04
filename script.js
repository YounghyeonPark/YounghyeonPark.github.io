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
  // 5. Photon Runner Embedded Mini-Game Engine (Robust Cross-Browser)
  // ==========================================================================
  const canvas = document.getElementById('hero-game-canvas');
  const overlay = document.getElementById('game-overlay');
  const startBtn = document.getElementById('game-start-btn');
  const statusTitle = document.getElementById('game-status-title');
  const statusSub = document.getElementById('game-status-sub');

  if (canvas && overlay && startBtn) {
    const ctx = canvas.getContext('2d');

    let gameRunning = false;
    let gameOver = false;
    let score = 0;
    let highScore = parseInt(localStorage.getItem('photon_high_score') || '0', 10);
    let animationFrameId = null;

    let groundY = 130;
    const player = {
      x: 80,
      y: 0,
      radius: 10,
      vy: 0,
      gravity: 0.85,
      jumpPower: -12.5,
      isGrounded: true,
      trail: []
    };

    let obstacles = [];
    let frameCount = 0;
    let gameSpeed = 12.0;

    function resizeCanvas() {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0) {
        canvas.width = rect.width;
        canvas.height = rect.height || 160;
        groundY = canvas.height - 30;
        if (!gameRunning) {
          player.y = groundY - player.radius;
          drawStatic();
        }
      }
    }

    // Helper for cross-browser rounded rectangles
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

    function resetGame() {
      resizeCanvas();
      gameRunning = true;
      gameOver = false;
      score = 0;
      gameSpeed = 12.0;
      frameCount = 0;
      obstacles = [];
      player.y = groundY - player.radius;
      player.vy = 0;
      player.isGrounded = true;
      player.trail = [];
      overlay.classList.add('hidden');
    }

    function jump() {
      if (!gameRunning || gameOver) {
        resetGame();
        if (!animationFrameId) loop();
        return;
      }
      if (player.isGrounded) {
        player.vy = player.jumpPower;
        player.isGrounded = false;
      }
    }

    // Event Listeners
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        const rect = canvas.getBoundingClientRect();
        if (rect.top > -100 && rect.bottom < window.innerHeight + 100) {
          e.preventDefault();
          jump();
        }
      }
    });

    canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      jump();
    });

    startBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      resetGame();
      if (!animationFrameId) loop();
    });

    window.addEventListener('resize', resizeCanvas);

    function spawnObstacle() {
      const types = ['lens', 'prism', 'noise'];
      const type = types[Math.floor(Math.random() * types.length)];
      let height = 26 + Math.random() * 20;
      let width = 16 + Math.random() * 12;

      obstacles.push({
        x: canvas.width + 20,
        y: groundY - height,
        width: width,
        height: height,
        type: type
      });
    }

    function update() {
      frameCount++;
      score += 2;
      if (score > highScore) {
        highScore = score;
        localStorage.setItem('photon_high_score', highScore);
      }

      if (frameCount % 200 === 0 && gameSpeed < 18.0) {
        gameSpeed += 0.5;
      }

      // Player Movement
      player.vy += player.gravity;
      player.y += player.vy;

      if (player.y >= groundY - player.radius) {
        player.y = groundY - player.radius;
        player.vy = 0;
        player.isGrounded = true;
      }

      // Trail
      player.trail.push({ x: player.x, y: player.y, alpha: 1 });
      if (player.trail.length > 12) player.trail.shift();
      player.trail.forEach(t => t.alpha -= 0.07);

      // Obstacles
      if (frameCount % Math.max(20, Math.floor(100 / (gameSpeed * 0.15))) === 0) {
        if (Math.random() > 0.2) {
          spawnObstacle();
        }
      }

      for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.x -= gameSpeed;

        // Collision Check
        const closestX = Math.max(obs.x, Math.min(player.x, obs.x + obs.width));
        const closestY = Math.max(obs.y, Math.min(player.y, obs.y + obs.height));
        const distX = player.x - closestX;
        const distY = player.y - closestY;
        const distance = Math.sqrt(distX * distX + distY * distY);

        if (distance < player.radius - 2) {
          endGame();
        }

        if (obs.x + obs.width < -30) {
          obstacles.splice(i, 1);
        }
      }
    }

    function endGame() {
      gameRunning = false;
      gameOver = true;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }

      statusTitle.textContent = 'Game Over 🔬';
      statusSub.innerHTML = `Distance: <strong>${score} µm</strong> | High Score: <strong>${highScore} µm</strong>`;
      startBtn.innerHTML = '<i class="fas fa-redo"></i> Play Again';
      
      // Show Nickname submission box if score > 0
      const submitBox = document.getElementById('score-submit-box');
      if (submitBox && score > 50) {
        submitBox.style.display = 'flex';
      }

      overlay.classList.remove('hidden');
    }

    // ==========================================================================
    // Online Leaderboard System (KVDB REST API + LocalStorage Fallback)
    // ==========================================================================
    const KVDB_ENDPOINT = 'https://kvdb.io/8x83fM5uNnK5vK3Y2aZ4b1/photon_leaderboard';
    const leaderboardOverlay = document.getElementById('leaderboard-overlay');
    const leaderboardToggleBtn = document.getElementById('leaderboard-toggle-btn');
    const leaderboardCloseBtn = document.getElementById('leaderboard-close-btn');
    const leaderboardList = document.getElementById('leaderboard-list');
    const submitScoreBtn = document.getElementById('submit-score-btn');
    const nicknameInput = document.getElementById('nickname-input');

    let globalScores = [
      { name: 'Dr. Park (Host)', score: 1250, date: '2026-08-04' },
      { name: 'Optics Master', score: 840, date: '2026-08-04' },
      { name: 'Photon Speed', score: 620, date: '2026-08-04' }
    ];

    async function fetchLeaderboard() {
      try {
        const response = await fetch(KVDB_ENDPOINT);
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            globalScores = data;
          }
        }
      } catch (err) {
        console.log('Using local/cached leaderboard:', err);
        const cached = localStorage.getItem('photon_cached_leaderboard');
        if (cached) {
          try { globalScores = JSON.parse(cached); } catch (e) {}
        }
      }
      renderLeaderboardUI();
    }

    async function saveLeaderboard() {
      localStorage.setItem('photon_cached_leaderboard', JSON.stringify(globalScores));
      try {
        await fetch(KVDB_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(globalScores)
        });
      } catch (err) {
        console.log('Saved to local cache:', err);
      }
    }

    function renderLeaderboardUI() {
      if (!leaderboardList) return;
      leaderboardList.innerHTML = '';

      if (globalScores.length === 0) {
        leaderboardList.innerHTML = '<div class="leaderboard-item">No scores yet. Be the first!</div>';
        return;
      }

      globalScores.sort((a, b) => b.score - a.score);
      const topScores = globalScores.slice(0, 10);

      topScores.forEach((item, index) => {
        const rank = index + 1;
        const rankBadge = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
        const div = document.createElement('div');
        div.className = `leaderboard-item rank-${rank}`;
        div.innerHTML = `
          <div class="leaderboard-player">
            <span class="leaderboard-rank-badge">${rankBadge}</span>
            <span class="leaderboard-name">${escapeHtml(item.name)}</span>
          </div>
          <span class="leaderboard-score">${item.score} µm</span>
        `;
        leaderboardList.appendChild(div);
      });
    }

    function escapeHtml(str) {
      return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    function closeLeaderboard() {
      if (leaderboardOverlay) {
        leaderboardOverlay.classList.add('hidden');
      }
    }

    if (leaderboardToggleBtn && leaderboardOverlay) {
      leaderboardToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        fetchLeaderboard();
        leaderboardOverlay.classList.remove('hidden');
      });
    }

    if (leaderboardCloseBtn) {
      leaderboardCloseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeLeaderboard();
      });
    }

    const leaderboardCloseBtnBottom = document.getElementById('leaderboard-close-btn-bottom');
    if (leaderboardCloseBtnBottom) {
      leaderboardCloseBtnBottom.addEventListener('click', (e) => {
        e.stopPropagation();
        closeLeaderboard();
      });
    }

    if (leaderboardOverlay) {
      leaderboardOverlay.addEventListener('click', (e) => {
        if (e.target === leaderboardOverlay) {
          closeLeaderboard();
        }
      });
    }

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && leaderboardOverlay && !leaderboardOverlay.classList.contains('hidden')) {
        closeLeaderboard();
      }
    });

    if (submitScoreBtn && nicknameInput) {
      submitScoreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const name = nicknameInput.value.trim() || 'Anonymous';
        globalScores.push({
          name: name,
          score: score,
          date: new Date().toISOString().slice(0, 10)
        });

        saveLeaderboard();
        document.getElementById('score-submit-box').style.display = 'none';
        leaderboardOverlay.classList.remove('hidden');
        renderLeaderboardUI();
      });
    }

    // Initial Leaderboard Fetch
    fetchLeaderboard();

    function draw() {
      // Clear Background
      ctx.fillStyle = '#050811';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Ground Line
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(canvas.width, groundY);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw Trail
      player.trail.forEach(t => {
        if (t.alpha > 0) {
          ctx.beginPath();
          ctx.arc(t.x, t.y, player.radius * 0.6, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(56, 189, 248, ${t.alpha * 0.45})`;
          ctx.fill();
        }
      });

      // Draw Player Photon
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#38bdf8';
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw Obstacles
      obstacles.forEach(obs => {
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

      // HUD Text
      ctx.font = '12px "Fira Code", monospace';
      ctx.fillStyle = '#9ca3af';
      ctx.fillText(`Distance: ${score} µm`, 16, 22);
      ctx.fillText(`High: ${highScore} µm`, canvas.width - 120, 22);
    }

    function drawStatic() {
      draw();
    }

    function loop() {
      if (!gameRunning) return;
      update();
      draw();
      animationFrameId = requestAnimationFrame(loop);
    }

    // Initialize Canvas Dimensions & Static Render
    setTimeout(() => {
      resizeCanvas();
    }, 100);
  }
});
