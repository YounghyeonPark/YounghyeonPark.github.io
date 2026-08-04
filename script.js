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
  // 5. Photon Runner Embedded Mini-Game Engine
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

    const groundY = 120;
    const player = {
      x: 60,
      y: groundY - 12,
      radius: 9,
      vy: 0,
      gravity: 0.55,
      jumpPower: -9.5,
      isGrounded: true,
      trail: []
    };

    let obstacles = [];
    let frameCount = 0;
    let gameSpeed = 4;

    function resetGame() {
      gameRunning = true;
      gameOver = false;
      score = 0;
      gameSpeed = 4;
      frameCount = 0;
      obstacles = [];
      player.y = groundY - player.radius;
      player.vy = 0;
      player.isGrounded = true;
      player.trail = [];
      overlay.classList.add('hidden');
    }

    function jump() {
      if (!gameRunning) {
        resetGame();
        loop();
        return;
      }
      if (gameOver) {
        resetGame();
        loop();
        return;
      }
      if (player.isGrounded) {
        player.vy = player.jumpPower;
        player.isGrounded = false;
      }
    }

    // Input Handlers
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        const gameContainer = document.getElementById('game-container');
        if (gameContainer && gameContainer.getBoundingClientRect().top < window.innerHeight) {
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
      loop();
    });

    function spawnObstacle() {
      const types = ['lens', 'prism', 'noise'];
      const type = types[Math.floor(Math.random() * types.length)];
      let height = 24 + Math.random() * 16;
      let width = 14 + Math.random() * 10;

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
      score++;
      if (score > highScore) {
        highScore = score;
        localStorage.setItem('photon_high_score', highScore);
      }

      // Increase speed gradually
      if (frameCount % 300 === 0 && gameSpeed < 8.5) {
        gameSpeed += 0.5;
      }

      // Player physics
      player.vy += player.gravity;
      player.y += player.vy;

      if (player.y >= groundY - player.radius) {
        player.y = groundY - player.radius;
        player.vy = 0;
        player.isGrounded = true;
      }

      // Trail effect
      player.trail.push({ x: player.x, y: player.y, alpha: 1 });
      if (player.trail.length > 10) player.trail.shift();
      player.trail.forEach(t => t.alpha -= 0.08);

      // Obstacles
      if (frameCount % Math.max(50, Math.floor(1000 / (gameSpeed * 10))) === 0) {
        if (Math.random() > 0.3) {
          spawnObstacle();
        }
      }

      for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.x -= gameSpeed;

        // Collision Check (AABB vs Circle)
        const closestX = Math.max(obs.x, Math.min(player.x, obs.x + obs.width));
        const closestY = Math.max(obs.y, Math.min(player.y, obs.y + obs.height));
        const distX = player.x - closestX;
        const distY = player.y - closestY;
        const distance = Math.sqrt(distX * distX + distY * distY);

        if (distance < player.radius - 1) {
          endGame();
        }

        if (obs.x + obs.width < -20) {
          obstacles.splice(i, 1);
        }
      }
    }

    function endGame() {
      gameRunning = false;
      gameOver = true;
      cancelAnimationFrame(animationFrameId);

      statusTitle.textContent = 'Game Over 🔬';
      statusSub.innerHTML = `Distance: <strong>${score} µm</strong> | High Score: <strong>${highScore} µm</strong>`;
      startBtn.innerHTML = '<i class="fas fa-redo"></i> Play Again';
      overlay.classList.remove('hidden');
    }

    function draw() {
      // Background & Grid
      ctx.fillStyle = '#070a12';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Ground Laser Line
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(canvas.width, groundY);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#38bdf8';
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Draw Trail
      player.trail.forEach(t => {
        if (t.alpha > 0) {
          ctx.beginPath();
          ctx.arc(t.x, t.y, player.radius * 0.7, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(56, 189, 248, ${t.alpha * 0.4})`;
          ctx.fill();
        }
      });

      // Draw Player Photon
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#38bdf8';
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw Obstacles (Optical Lenses & Sensors)
      obstacles.forEach(obs => {
        ctx.fillStyle = '#14b8a6';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;

        if (obs.type === 'lens') {
          // Biconvex Lens shape
          ctx.beginPath();
          ctx.roundRect(obs.x, obs.y, obs.width, obs.height, 6);
          ctx.fillStyle = 'rgba(20, 184, 166, 0.4)';
          ctx.fill();
          ctx.stroke();
        } else if (obs.type === 'prism') {
          // Prism shape
          ctx.beginPath();
          ctx.moveTo(obs.x + obs.width / 2, obs.y);
          ctx.lineTo(obs.x + obs.width, obs.y + obs.height);
          ctx.lineTo(obs.x, obs.y + obs.height);
          ctx.closePath();
          ctx.fillStyle = 'rgba(168, 85, 247, 0.4)';
          ctx.strokeStyle = '#a855f7';
          ctx.fill();
          ctx.stroke();
        } else {
          // Sensor Noise spike
          ctx.beginPath();
          ctx.rect(obs.x, obs.y, obs.width, obs.height);
          ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
          ctx.strokeStyle = '#ef4444';
          ctx.fill();
          ctx.stroke();
        }
      });

      // Score Display
      ctx.font = '12px "Fira Code", monospace';
      ctx.fillStyle = '#9ca3af';
      ctx.fillText(`Distance: ${score} µm`, 12, 20);
      ctx.fillText(`High: ${highScore} µm`, canvas.width - 110, 20);
    }

    function loop() {
      if (!gameRunning) return;
      update();
      draw();
      animationFrameId = requestAnimationFrame(loop);
    }

    // Initial Static Draw
    draw();
  }
});
