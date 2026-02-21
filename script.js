let isRunning = false;      // game paused until Space
let showStartScreen = true; // show instructions
let gameMode = "1p";        // "1p" or "2p"
let p2Control = "arrows"; // "arrows" or "mouse"

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// --- Paddle settings ---
const paddleWidth = 14;
const paddleHeight = 100;

const player = {
  x: 20,
  y: (canvas.height - paddleHeight) / 2,
  width: paddleWidth,
  height: paddleHeight,
  speed: 7,
};

const ai = {
  x: canvas.width - 20 - paddleWidth,
  y: (canvas.height - paddleHeight) / 2,
  width: paddleWidth,
  height: paddleHeight,
  speed: 5,
};

const WIN_SCORE = 7;

let gameOver = false;
let winnerText = ""; // e.g. "Player 1 Wins!" / "Player 2 Wins!"
const fireworks = []; // particle list

// --- Ball settings ---
const ball = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  r: 10,
  dx: 5,
  dy: 3,
};

let playerScore = 0;
let aiScore = 0;

const keys = { w: false, s: false };
const keys2 = { arrowup: false, arrowdown: false };

// --- Drawing helpers ---
function drawBackground() {
  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawCenterLine() {
  ctx.strokeStyle = "white";
  ctx.setLineDash([10, 10]);
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 0);
  ctx.lineTo(canvas.width / 2, canvas.height);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawPaddle(p) {
  ctx.fillStyle = "white";
  ctx.fillRect(p.x, p.y, p.width, p.height);
}

function drawBall() {
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fill();
}

function drawScore() {
  ctx.fillStyle = "white";
  ctx.font = "30px Arial";
  ctx.fillText(playerScore, canvas.width / 4, 50);
  ctx.fillText(aiScore, (3 * canvas.width) / 4, 50);
}

// --- Game logic helpers ---
function resetBall(scoredByPlayer) {
  ball.x = canvas.width / 2;
  ball.y = canvas.height / 2;

  const direction = scoredByPlayer ? 1 : -1;
  ball.dx = 5 * direction;
  ball.dy = (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 3);
}

function ballHitsPaddle(p) {
  return (
    ball.x - ball.r < p.x + p.width &&
    ball.x + ball.r > p.x &&
    ball.y - ball.r < p.y + p.height &&
    ball.y + ball.r > p.y
  );
}
function spawnFirework() {
  // spawn a burst somewhere in the top ~70% of the canvas
  const x = Math.random() * canvas.width;
  const y = Math.random() * canvas.height * 0.7;

  const count = 50 + Math.floor(Math.random() * 40);

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 4;

    fireworks.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 60 + Math.floor(Math.random() * 30), // frames
      maxLife: 90,
      size: 2 + Math.random() * 2,
    });
  }
}

function updateFireworks() {
  // occasionally spawn new bursts
  if (Math.random() < 0.08) spawnFirework();

  for (let i = fireworks.length - 1; i >= 0; i--) {
    const p = fireworks[i];

    // gravity + drag
    p.vy += 0.03;
    p.vx *= 0.99;
    p.vy *= 0.99;

    p.x += p.vx;
    p.y += p.vy;

    p.life--;

    if (p.life <= 0) fireworks.splice(i, 1);
  }
}

function drawFireworks() {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  for (const p of fireworks) {
    const t = Math.max(0, p.life) / p.maxLife; // fades out
    ctx.globalAlpha = Math.min(1, t);

    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
  ctx.globalAlpha = 1;
}
// --- Input (IMPORTANT: only ONE set of listeners) ---
document.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();

  if (e.code === "Space" || k === "arrowup" || k === "arrowdown") e.preventDefault();

  if (k in keys) keys[k] = true;
  if (k in keys2) keys2[k] = true;

  // ✅ Restart should work anytime gameOver is true
  if (k === "r" && gameOver) {
    gameOver = false;
    showStartScreen = true;
    isRunning = false;
    playerScore = 0;
    aiScore = 0;

    player.y = (canvas.height - player.height) / 2;
    ai.y = (canvas.height - ai.height) / 2;

    fireworks.length = 0;
    resetBall(Math.random() > 0.5);
    return;
  }

  // Title screen selection + start
  if (showStartScreen) {
    if (k === "1") gameMode = "1p";
    if (k === "2") gameMode = "2p";

    if (k === "m") p2Control = "mouse";
    if (k === "a") p2Control = "arrows";

    if (e.code === "Space") {
      isRunning = true;
      showStartScreen = false;
      playerScore = 0;
      aiScore = 0;
      resetBall(Math.random() > 0.5);
    }
  }
});

document.addEventListener("keyup", (e) => {
  const k = e.key.toLowerCase();
  if (k in keys) keys[k] = false;
  if (k in keys2) keys2[k] = false;
});

canvas.addEventListener("mousemove", (e) => {
  if (!isRunning) return;
  if (gameMode !== "2p") return;
  if (p2Control !== "mouse") return;

  const rect = canvas.getBoundingClientRect();
  const mouseY = e.clientY - rect.top;

  ai.y = mouseY - ai.height / 2;

  if (ai.y < 0) ai.y = 0;
  if (ai.y + ai.height > canvas.height) ai.y = canvas.height - ai.height;
});

// --- Update ---
function update() {
  if (gameOver) {
    updateFireworks();
    return;
  }

  // Player movement
  if (keys.w) player.y -= player.speed;
  if (keys.s) player.y += player.speed;

  // Clamp player paddle
  if (player.y < 0) player.y = 0;
  if (player.y + player.height > canvas.height) player.y = canvas.height - player.height;

  // Let you move paddle on title screen, but no gameplay yet
  if (!isRunning) return;

  // Right paddle control
  if (gameMode === "1p") {
    const aiCenter = ai.y + ai.height / 2;
    if (aiCenter < ball.y - 10) ai.y += ai.speed;
    else if (aiCenter > ball.y + 10) ai.y -= ai.speed;
  } else {
    if (p2Control === "arrows") {
      if (keys2.arrowup) ai.y -= ai.speed + 2;
      if (keys2.arrowdown) ai.y += ai.speed + 2;
    }
    // mouse mode handled by mousemove listener
  }

  // Clamp right paddle
  if (ai.y < 0) ai.y = 0;
  if (ai.y + ai.height > canvas.height) ai.y = canvas.height - ai.height;

  // Move ball
  ball.x += ball.dx;
  ball.y += ball.dy;

  // Bounce off top/bottom walls
  if (ball.y - ball.r < 0) {
    ball.y = ball.r;
    ball.dy *= -1;
  } else if (ball.y + ball.r > canvas.height) {
    ball.y = canvas.height - ball.r;
    ball.dy *= -1;
  }

  // Paddle collisions
  if (ball.dx < 0 && ballHitsPaddle(player)) {
    ball.x = player.x + player.width + ball.r;
    ball.dx *= -1;

    const hitPos = (ball.y - (player.y + player.height / 2)) / (player.height / 2);
    ball.dy += hitPos * 2;
  }

  if (ball.dx > 0 && ballHitsPaddle(ai)) {
    ball.x = ai.x - ball.r;
    ball.dx *= -1;

    const hitPos = (ball.y - (ai.y + ai.height / 2)) / (ai.height / 2);
    ball.dy += hitPos * 2;
  }

  // Scoring
  if (ball.x + ball.r < 0) {
    aiScore++;
    if (aiScore >= WIN_SCORE) {
      endGame();
      return;
    }
    resetBall(false);
  } else if (ball.x - ball.r > canvas.width) {
    playerScore++;
    if (playerScore >= WIN_SCORE) {
      endGame();
      return;
    }
    resetBall(true);
  }
}
function endGame() {
  isRunning = false;
  gameOver = true;

  if (gameMode === "1p") {
    winnerText = playerScore >= WIN_SCORE ? "You Win!" : "AI Wins!";
  } else {
    winnerText = playerScore >= WIN_SCORE ? "Player 1 Wins!" : "Player 2 Wins!";
  }

  fireworks.length = 0;
  for (let i = 0; i < 4; i++) spawnFirework();
}


// --- Title overlay ---
function drawStartOverlay() {
  if (!showStartScreen) return;

  // Dim background
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Panel (optional but makes it look cleaner)
  const panelW = Math.min(520, canvas.width - 80);
  const panelH = 260;
  const panelX = (canvas.width - panelW) / 2;
  const panelY = (canvas.height - panelH) / 2;

  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(panelX, panelY, panelW, panelH);

  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.strokeRect(panelX, panelY, panelW, panelH);

  // Text defaults
  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Title
  ctx.font = "48px Arial";
  ctx.fillText("PONG", canvas.width / 2, panelY + 55);

  // Helper to draw stacked lines
  const startY = panelY + 115;
  const lineH = 26;
  let i = 0;

  ctx.font = "20px Arial";
  ctx.fillText("Choose mode:", canvas.width / 2, startY + lineH * i++);

  ctx.font = "18px Arial";
  ctx.fillText(`1 — 1 Player (vs AI) ${gameMode === "1p" ? "✓" : ""}`, canvas.width / 2, startY + lineH * i++);
  ctx.fillText(`2 — 2 Player (W/S + ↑/↓) ${gameMode === "2p" ? "✓" : ""}`, canvas.width / 2, startY + lineH * i++);

  // Only show P2 control options if 2P is selected (less clutter)
  if (gameMode === "2p") {
    i++; // small spacer line
    ctx.fillText(`A — P2 Arrow Keys ${p2Control === "arrows" ? "✓" : ""}`, canvas.width / 2, startY + lineH * i++);
    ctx.fillText(`M — P2 Mouse ${p2Control === "mouse" ? "✓" : ""}`, canvas.width / 2, startY + lineH * i++);
  }

  // Start prompt
  i++;
  ctx.font = "20px Arial";
  ctx.fillText("Press SPACE to start", canvas.width / 2, startY + lineH * i++);

  // Restore defaults (optional)
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}
function drawGameOverOverlay() {
  if (!gameOver) return;

  // dim background
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // fireworks behind the text
  drawFireworks();

  // big message
  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.font = "48px Arial";
  ctx.fillText("CONGRATULATIONS!", canvas.width / 2, canvas.height / 2 - 60);

  ctx.font = "32px Arial";
  ctx.fillText(winnerText, canvas.width / 2, canvas.height / 2 - 10);

  ctx.font = "20px Arial";
  ctx.fillText("Game Over", canvas.width / 2, canvas.height / 2 + 40);
  ctx.fillText("Press R to restart", canvas.width / 2, canvas.height / 2 + 75);

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}
// --- Draw ---
function draw() {
  drawBackground();
  drawCenterLine();
  drawPaddle(player);
  drawPaddle(ai);
  drawBall();
  drawScore();
  drawStartOverlay();
    drawGameOverOverlay();
}

// --- Loop ---
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

// Start
resetBall(Math.random() > 0.5);
loop();