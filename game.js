const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

let map = 1;

const player = { x: 40, y: 40, s: 18, v: 3 };
const button = { x: 740, y: 450, r: 10 };
const keys = {};

onkeydown = e => keys[e.key] = true;
onkeyup   = e => keys[e.key] = false;

canvas.onclick = e => {
  const r = canvas.getBoundingClientRect();
  const mx = e.clientX - r.left;
  const my = e.clientY - r.top;

  const dx = mx - button.x;
  const dy = my - button.y;

  if (dx*dx + dy*dy < button.r*button.r) {
    map = map === 1 ? 2 : 1;
    player.x = 40;
    player.y = 40;
  }
};

function movePlayer() {
  if (keys.a || keys.ArrowLeft)  player.x -= player.v;
  if (keys.d || keys.ArrowRight) player.x += player.v;
  if (keys.w || keys.ArrowUp)    player.y -= player.v;
  if (keys.s || keys.ArrowDown)  player.y += player.v;

  player.x = Math.max(0, Math.min(880, player.x));
  player.y = Math.max(0, Math.min(580, player.y));
}

/* ---------- PROCEDURAL DRAWING ---------- */

function drawGrass() {
  ctx.fillStyle = "#4CAF50";
  ctx.fillRect(0,0,900,600);

  ctx.fillStyle = "rgba(0,0,0,0.06)";
  for (let i = 0; i < 1000; i++) {
    ctx.fillRect(
      Math.random()*900,
      Math.random()*600,
      2,2
    );
  }
}

function drawBarn(x, y) {
  // main body
  ctx.fillStyle = "#8B0000";
  ctx.fillRect(x, y, 260, 180);

  // wood planks (loop = detail)
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  for (let i = 0; i < 260; i += 14) {
    ctx.fillRect(x + i, y, 2, 180);
  }

  // roof
  ctx.fillStyle = "#5A0000";
  ctx.beginPath();
  ctx.moveTo(x - 20, y);
  ctx.lineTo(x + 130, y - 90);
  ctx.lineTo(x + 280, y);
  ctx.fill();

  // door
  ctx.fillStyle = "#3E2723";
  ctx.fillRect(x + 95, y + 80, 70, 100);

  ctx.strokeStyle = "#CFA";
  ctx.beginPath();
  ctx.moveTo(x + 95, y + 80);
  ctx.lineTo(x + 165, y + 180);
  ctx.moveTo(x + 165, y + 80);
  ctx.lineTo(x + 95, y + 180);
  ctx.stroke();
}

function drawFence(y) {
  ctx.strokeStyle = "#DEB887";
  ctx.lineWidth = 4;

  for (let x = 140; x < 760; x += 35) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + 40);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.moveTo(140, y + 15);
  ctx.lineTo(760, y + 15);
  ctx.moveTo(140, y + 30);
  ctx.lineTo(760, y + 30);
  ctx.stroke();
}

function drawButton() {
  ctx.fillStyle = "gold";
  ctx.beginPath();
  ctx.arc(button.x, button.y, button.r, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlayer() {
  ctx.fillStyle = "blue";
  ctx.fillRect(player.x, player.y, player.s, player.s);
}

/* ---------- MAPS ---------- */

function mapFarm() {
  drawGrass();
  drawBarn(320, 210);
  drawFence(420);
  drawButton();
}

function mapMeadow() {
  ctx.fillStyle = "#87CEEB";
  ctx.fillRect(0,0,900,600);

  ctx.fillStyle = "#3CB371";
  ctx.fillRect(0,350,900,250);

  ctx.fillStyle = "white";
  ctx.font = "28px sans-serif";
  ctx.fillText("New area!", 380, 200);

  drawButton();
}

/* ---------- GAME LOOP ---------- */

function loop() {
  movePlayer();
  ctx.clearRect(0,0,900,600);

  map === 1 ? mapFarm() : mapMeadow();
  drawPlayer();

  requestAnimationFrame(loop);
}

loop();
