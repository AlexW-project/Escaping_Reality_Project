import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.159.0/build/three.module.js";

// -------------------- SETUP --------------------
const scene    = new THREE.Scene();
const camera   = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// -------------------- LIGHTING --------------------
const ambient = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(50, 100, -50);
sun.castShadow = true;
scene.add(sun);

// -------------------- STATE --------------------
let gameWon   = false;
let roomIndex = 0;
const rooms   = [];

// -------------------- STALKER STATE --------------------
let stalker       = null;
let stalkerLight  = null;
let stalkerActive = false;
let stalkerSpeed  = 0.012;
let stalkerWarned = false;
let heartbeatTime = 0;

// HUD overlays injected into the page
const _heartbeatEl = (() => {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;inset:0;pointer-events:none;background:radial-gradient(ellipse at center,rgba(180,0,0,0) 30%,rgba(180,0,0,0.4) 100%);z-index:11;opacity:0;transition:opacity 0.08s;';
  document.body.appendChild(el); return el;
})();
const _stalkerMsgEl = (() => {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;bottom:40px;left:50%;transform:translateX(-50%);color:#ff3333;font-family:monospace;font-size:13px;letter-spacing:4px;text-transform:uppercase;pointer-events:none;opacity:0;text-shadow:0 0 12px #ff0000;transition:opacity 1.2s;z-index:20;';
  document.body.appendChild(el); return el;
})();

// -------------------- INPUT --------------------
const keys  = { w: false, s: false, a: false, d: false };
const speed = 0.08;
document.addEventListener("keydown", e => { if (e.key in keys) keys[e.key] = true;  });
document.addEventListener("keyup",   e => { if (e.key in keys) keys[e.key] = false; });

// -------------------- RAYCASTER --------------------
const raycaster   = new THREE.Raycaster();
const mouse       = new THREE.Vector2();
const interactive = [];

window.addEventListener("click", e => {
  if (gameWon) return;
  mouse.x =  (e.clientX / innerWidth)  * 2 - 1;
  mouse.y = -(e.clientY / innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(interactive);
  if (hits.length) hits[0].object.userData.onClick();
});

// -------------------- ROOM SYSTEM --------------------
function clearRoom() {
  scene.fog = null;
  while (scene.children.length) scene.remove(scene.children[0]);
  scene.add(ambient, sun);
  interactive.length = 0;
  stalker = null; stalkerLight = null;
  stalkerActive = false; stalkerWarned = false;
  stalkerSpeed = 0.012;
  _heartbeatEl.style.opacity  = '0';
  _stalkerMsgEl.style.opacity = '0';
}

function nextRoom() {
  roomIndex++;
  clearRoom();
  if (roomIndex >= rooms.length) return; // Room 3 is the end — do nothing
  camera.position.set(0, 1.6, 12);
  rooms[roomIndex]();
}

//-----------------------ROOM THREE LOGIC-----------------------
function createWallButtons({
  count,
  startX,
  startY,
  z,
  axis = "x",
  spacing = 2,
  rotationY = 0,
  correctIndex = 0
}) {
  const buttons = [];

  for (let i = 0; i < count; i++) {
    const x = axis === "x" ? startX + i * spacing : startX;
    const y = startY - Math.floor(i / 3) * spacing;
    const zPos = z;

    const button = createButton(
      x,
      y,
      zPos,
      0xff0000,
      i === correctIndex
    );

    button.rotation.y = rotationY;
    buttons.push(button);
  }

  return buttons;
}

function addControlBoard({
  x = 0,
  y = 4,
  z = -9.4,
  rotationY = 0
} = {}) {
  const board = new THREE.Group();

  // Main panel
  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(10, 10, 0.15),
    new THREE.MeshStandardMaterial({
      color: 0x111111,
      metalness: 0.6,
      roughness: 0.4
    })
  );
  board.add(panel);

  // Button colors
  const colors = [
    0xff4444, // red
    0x44ff44, // green
    0x4444ff, // blue
    0xffff44, // yellow
    0xff44ff, // magenta
    0x44ffff  // cyan
  ];

  const buttonGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.05, 16);

  let index = 0;
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const button = new THREE.Mesh(
        buttonGeo,
        new THREE.MeshStandardMaterial({
          color: colors[index % colors.length],
          emissive: colors[index % colors.length],
          emissiveIntensity: 0.6
        })
      );

      button.rotation.x = Math.PI / 2;
      button.position.set(
        -3 + col * 0.8,
        3 - row * 0.8,
        0.1
      );

      board.add(button);
      index++;
    }
  }

  board.position.set(x, y, z);
  board.rotation.y = rotationY;
  scene.add(board);
}

function createButton(x, y, z, color, isCorrect) {
  const material = new THREE.MeshStandardMaterial({
    color,
    transparent: true,
    opacity: 1
  });

  const button = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.4, 0.2, 32),
    material
  );

  button.rotation.x = Math.PI / 2; // face outward by default
  button.position.set(x, y, z);

  button.userData = {
    isButton: true,
    isCorrect: isCorrect
  };

  button.userData = {
    isCorrect,
    fading: false,
    flashing: false,
    flashTimer: 0,
    onClick: () => {
      if (isCorrect) {
        nextRoom();
      } else {
        // choose any animation you like
        button.userData.flashing = true;
      }
    }
  };


  scene.add(button);
  interactive.push(button);
  return button;
}

function updateButtons(delta) {
  interactive.forEach(button => {
    const data = button.userData;

    // Fade out
    if (data.fading) {
      button.material.opacity -= delta;
      if (button.material.opacity <= 0) {
        scene.remove(button);
        data.fading = false;
      }
    }

    // Flash animation
    if (data.flashing) {
      data.flashTimer += delta * 10;
      const flash = Math.sin(data.flashTimer) > 0;
      button.material.color.set(flash ? 0xffff00 : 0xff0000);

      if (data.flashTimer > Math.PI * 2) {
        data.flashing = false;
        data.flashTimer = 0;
        button.material.color.set(0xff0000);
      }
    }
  });
}




// -------------------- HELPERS --------------------
function mulberry32(seed) {
  return () => {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function attachLogic(group, isCorrect) {
  const logic = {
    fading: false,
    onClick: () => { if (isCorrect) nextRoom(); else logic.fading = true; }
  };
  group.traverse(child => {
    if (child.isMesh) { child.userData = logic; interactive.push(child); }
  });
}

// -------------------- PIG --------------------
function createPig(x, z, isCorrect) {
  const g        = new THREE.Group();
  const pink     = new THREE.MeshStandardMaterial({ color: 0xffb6c1, roughness: 0.7 });
  const darkPink = new THREE.MeshStandardMaterial({ color: 0xff8fa3 });
  const black    = new THREE.MeshStandardMaterial({ color: 0x222222 });

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32), pink);
  body.scale.set(1.3, 1, 1);
  body.castShadow = true;
  g.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 32, 32), pink);
  head.position.set(0, 0.25, 0.65);
  body.add(head);

  const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.18, 20), darkPink);
  snout.rotation.x = Math.PI / 2;
  snout.position.set(0, 0, 0.35);
  head.add(snout);

  [-0.05, 0.05].forEach(nx => {
    const n = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), black);
    n.position.set(nx, 0, 0.46);
    head.add(n);
  });

  [-0.1, 0.1].forEach(ex => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 12), black);
    eye.position.set(ex, 0.1, 0.45);
    head.add(eye);
  });

  [[-0.25, Math.PI / 6], [0.25, -Math.PI / 6]].forEach(([ex, rz]) => {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), pink);
    ear.scale.set(1, 0.6, 0.2);
    ear.position.set(ex, 0.25, 0.05);
    ear.rotation.z = rz;
    ear.rotation.x = -Math.PI / 10;
    head.add(ear);
  });

  const legGeo = new THREE.CylinderGeometry(0.07, 0.09, 0.3, 12);
  [[-0.3, 0.25], [0.3, 0.25], [-0.3, -0.25], [0.3, -0.25]].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(legGeo, pink);
    leg.position.set(lx, -0.35, lz);
    body.add(leg);
  });

  const tail = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.02, 8, 16, Math.PI * 1.5), pink);
  tail.position.set(0, 0.15, -0.55);
  tail.rotation.x = Math.PI / 2;
  body.add(tail);

  g.position.set(x, 0.5, z);
  attachLogic(g, isCorrect);
  scene.add(g);
}

// -------------------- COW --------------------
function createCow(x, z, isCorrect) {
  const g     = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 });
  const black = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.7 });
  const pink  = new THREE.MeshStandardMaterial({ color: 0xffb6c1 });

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32), white);
  body.scale.set(1.4, 1, 1);
  body.castShadow = true;
  g.add(body);

  [[-0.2, 0.1, 0.35], [0.3, -0.1, -0.2]].forEach(([sx, sy, sz]) => {
    const spot = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), black);
    spot.scale.set(1.2, 0.6, 0.2);
    spot.position.set(sx, sy, sz);
    body.add(spot);
  });

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 32, 32), white);
  head.position.set(0, 0.25, 0.7);
  body.add(head);

  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.2), pink);
  snout.position.set(0, -0.05, 0.35);
  head.add(snout);

  [-0.08, 0.08].forEach(nx => {
    const n = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), black);
    n.position.set(nx, -0.05, 0.45);
    head.add(n);
  });

  [-0.12, 0.12].forEach(ex => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 12), black);
    eye.position.set(ex, 0.1, 0.4);
    head.add(eye);
  });

  [[-0.3, Math.PI / 6], [0.3, -Math.PI / 6]].forEach(([ex, rz]) => {
    const ear = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.05), white);
    ear.position.set(ex, 0.15, 0.1);
    ear.rotation.z = rz;
    head.add(ear);
  });

  const hornGeo = new THREE.ConeGeometry(0.05, 0.15, 12);
  [[-0.15, -Math.PI / 8], [0.15, Math.PI / 8]].forEach(([hx, rz]) => {
    const horn = new THREE.Mesh(hornGeo, white);
    horn.position.set(hx, 0.3, 0.1);
    horn.rotation.z = rz;
    head.add(horn);
  });

  const legGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.35, 12);
  [[-0.35, 0.3], [0.35, 0.3], [-0.35, -0.3], [0.35, -0.3]].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(legGeo, white);
    leg.position.set(lx, -0.4, lz);
    body.add(leg);
  });

  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 8), black);
  tail.position.set(0, 0.1, -0.6);
  tail.rotation.x = Math.PI / 4;
  body.add(tail);

  g.position.set(x, 0.55, z);
  attachLogic(g, isCorrect);
  scene.add(g);
}

// -------------------- MUSHROOM --------------------
function createMushroom(x, z, isTeleport = false) {
  const group = new THREE.Group();

  const stemMat = new THREE.MeshStandardMaterial({
    color: 0xd4c49a,
    emissive: isTeleport ? 0x44ff22 : 0x223311,
    emissiveIntensity: isTeleport ? 0.5 : 0.12, roughness: 0.9
  });
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 1.5, 12), stemMat);
  stem.position.y = 0.75;
  group.add(stem);

  // Gill ring under cap
  const gills = new THREE.Mesh(
    new THREE.CylinderGeometry(0.85, 0.25, 0.1, 20),
    new THREE.MeshStandardMaterial({ color: 0xffe0c8, roughness: 1 })
  );
  gills.position.y = 1.48;
  group.add(gills);

  const capColor    = isTeleport ? 0x00ff88 : 0xcc2200;
  const capEmissive = isTeleport ? 0x00bb44 : 0x440800;
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.9, 24, 24, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: capColor, emissive: capEmissive, emissiveIntensity: 0.4, roughness: 0.5 })
  );
  cap.position.y = 1.5;
  group.add(cap);

  const dotCount = isTeleport ? 7 : 5;
  for (let i = 0; i < dotCount; i++) {
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.4 })
    );
    const angle = (i / dotCount) * Math.PI * 2, radius = 0.45;
    dot.position.set(Math.cos(angle) * radius, 1.75, Math.sin(angle) * radius);
    group.add(dot);
  }

  // Point light from each mushroom
  const mLight = new THREE.PointLight(
    isTeleport ? 0x00ff88 : 0xff4400,
    isTeleport ? 1.5 : 0.7,
    isTeleport ? 8 : 4.5
  );
  mLight.position.set(0, 1.8, 0);
  group.add(mLight);

  if (isTeleport) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.5, 0.06, 8, 24),
      new THREE.MeshStandardMaterial({ color: 0x00ffaa, emissive: 0x00ff88, emissiveIntensity: 1 })
    );
    ring.position.y = 0.1;
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    const outerRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.1, 0.04, 8, 32),
      new THREE.MeshStandardMaterial({ color: 0x00ffaa, emissive: 0x00ff88, emissiveIntensity: 0.5 })
    );
    outerRing.position.y = 0.05;
    outerRing.rotation.x = Math.PI / 2;
    group.add(outerRing);

    cap.userData = { onClick: () => nextRoom() };
    interactive.push(cap);
  }

  group.position.set(x, 0, z);
  scene.add(group);
  return group;
}

// -------------------- ROOM ONE --------------------
function roomOne() {
  scene.background = new THREE.Color(0x87ceeb);

  ambient.color.set(0xffffff);
  ambient.intensity = 0.4;

  const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
  sunLight.position.set(50, 100, -50);
  sunLight.castShadow = true;
  scene.add(sunLight);

  const sunMesh = new THREE.Mesh(
    new THREE.SphereGeometry(10, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0xfff4cc })
  );
  sunMesh.position.copy(sunLight.position);
  scene.add(sunMesh);

  // Clouds — plain white puffs
  const rngC     = mulberry32(42);
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (let i = 0; i < 18; i++) {
    const cloud = new THREE.Group();
    for (let j = 0; j < 4; j++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(3 + rngC() * 3, 7, 7), cloudMat);
      puff.position.set((rngC() - 0.5) * 10, (rngC() - 0.5) * 2, 0);
      cloud.add(puff);
    }
    cloud.position.set((rngC() - 0.5) * 180, 55 + rngC() * 20, -20 - rngC() * 100);
    scene.add(cloud);
  }

  // Floor
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 30, 32, 32),
    new THREE.MeshStandardMaterial({ color: 0x3fa34d, roughness: 1, metalness: 0 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Grass blades
  const bladeGeo = new THREE.PlaneGeometry(0.1, 0.6);
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0x2d8b3a, side: THREE.DoubleSide });
  const rngG     = mulberry32(7);
  for (let i = 0; i < 600; i++) {
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.set((rngG() - 0.5) * 28, 0.3, (rngG() - 0.5) * 28);
    blade.rotation.y = rngG() * Math.PI;
    const s = 0.6 + rngG() * 0.8;
    blade.scale.set(s, s, s);
    scene.add(blade);
  }

  // Barn
  const barn    = new THREE.Group();
  barn.position.set(0, 0, -8);
  const barnRed = new THREE.MeshStandardMaterial({ color: 0xb22222, roughness: 0.8 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x8b0000, roughness: 0.9 });
  const whtMat  = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x7a4a2e });
  const winMat  = new THREE.MeshStandardMaterial({ color: 0xffffcc });

  const barnBody = new THREE.Mesh(new THREE.BoxGeometry(4.5, 3.5, 5), barnRed);
  barnBody.position.y = 1.75;
  barnBody.castShadow = true;
  barnBody.receiveShadow = true;
  barn.add(barnBody);

  const roofShape = new THREE.Shape();
  roofShape.moveTo(-2.5, 0); roofShape.lineTo(0, 1.8);
  roofShape.lineTo(2.5, 0);  roofShape.lineTo(-2.5, 0);
  const roof = new THREE.Mesh(
    new THREE.ExtrudeGeometry(roofShape, { depth: 5.4, bevelEnabled: false }), roofMat
  );
  roof.rotation.y = Math.PI / 2;
  roof.position.set(-2.7, 3.5, -2.7);
  roof.castShadow = true;
  barn.add(roof);

  const trim = new THREE.Mesh(new THREE.BoxGeometry(4.7, 0.1, 5.05), whtMat);
  trim.position.y = 3.5;
  barn.add(trim);

  [[-0.6, 1, 2.51], [0.6, 1, 2.51]].forEach(([dx, dy, dz]) => {
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2, 0.1), doorMat);
    door.position.set(dx, dy, dz);
    [Math.PI / 4, -Math.PI / 4].forEach(rz => {
      const brace = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.05, 0.05), whtMat);
      brace.rotation.z = rz;
      door.add(brace);
    });
    barn.add(door);
  });

  const loftWin = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.1), winMat);
  loftWin.position.set(0, 2.8, 2.51);
  barn.add(loftWin);

  [-2.26, 2.26].forEach(wx => {
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.1), winMat);
    win.position.set(wx, 2, 0);
    win.rotation.y = Math.PI / 2;
    barn.add(win);
  });

  scene.add(barn);

  // Fences
  const fenceMat = new THREE.MeshStandardMaterial({ color: 0xc2a679 });
  const postH = 1.2, spacing = 2, bound = 15, gapHalf = 2;

  function post(x, z) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.2, postH, 0.2), fenceMat);
    p.position.set(x, postH / 2, z);
    scene.add(p);
    return p;
  }
  function hRail(x1, x2, z) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(x2 - x1, 0.1, 0.1), fenceMat);
    r.position.set((x1 + x2) / 2, postH * 0.7, z);
    scene.add(r);
  }
  function vRail(x, z1, z2) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, z2 - z1), fenceMat);
    r.position.set(x, postH * 0.7, (z1 + z2) / 2);
    scene.add(r);
  }

  for (let x = -bound; x <= bound; x += spacing) {
    post(x, -bound);
    if (x + spacing <= bound) hRail(x, x + spacing, -bound);
  }
  for (let x = -bound; x <= bound; x += spacing) {
    if (x > -gapHalf && x < gapHalf) continue;
    post(x, bound);
    const nx = x + spacing;
    if (nx <= bound && !(nx > -gapHalf && nx < gapHalf)) hRail(x, nx, bound);
  }
  for (let z = -bound + spacing; z <= bound - spacing; z += spacing) {
    post(-bound, z); post(bound, z);
    if (z + spacing <= bound - spacing) {
      vRail(-bound, z, z + spacing);
      vRail(bound,  z, z + spacing);
    }
  }

  createCow(-4, -2, false);
  createCow( 4, -2, false);
  createPig(-5,  5, true);

  camera.position.set(0, 1.6, 12);
}

// -------------------- ROOM TWO --------------------
function roomTwo() {
  scene.background = new THREE.Color(0x0d0818);
  ambient.color.set(0x8866aa);
  ambient.intensity = 0.6;
  sun.intensity = 0.15;

  // Fog — visible ~10-12 units ahead
  scene.fog = new THREE.FogExp2(0x0d0818, 0.1);

  // Dark mossy ground
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60, 30, 30),
    new THREE.MeshStandardMaterial({ color: 0x0b1208, roughness: 1, metalness: 0 })
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  // Reflective puddles
  const rngP = mulberry32(99);
  for (let i = 0; i < 22; i++) {
    const puddle = new THREE.Mesh(
      new THREE.CircleGeometry(0.3 + rngP() * 0.9, 14),
      new THREE.MeshStandardMaterial({ color: 0x112233, roughness: 0.05, metalness: 0.95 })
    );
    puddle.rotation.x = -Math.PI / 2;
    puddle.position.set((rngP() - 0.5) * 32, 0.01, (rngP() - 0.5) * 32);
    scene.add(puddle);
  }

  // Dead twisted trees
  const rngT = mulberry32(55);
  const barkMat = new THREE.MeshStandardMaterial({ color: 0x120c05, roughness: 1 });
  for (let i = 0; i < 18; i++) {
    const tx = (rngT() - 0.5) * 30, tz = (rngT() - 0.5) * 30;
    if (Math.abs(tx) < 2.5 && Math.abs(tz) < 2.5) continue;
    const treeH = 3.5 + rngT() * 5;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.2, treeH, 7), barkMat);
    trunk.position.set(tx, treeH / 2, tz);
    trunk.rotation.z = (rngT() - 0.5) * 0.25;
    scene.add(trunk);
    for (let b = 0; b < 4; b++) {
      const brLen = 0.7 + rngT() * 1.4;
      const br = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.07, brLen, 5), barkMat);
      br.position.set(tx + (rngT() - 0.5) * 0.8, treeH * 0.55 + b * 0.8, tz + (rngT() - 0.5) * 0.8);
      br.rotation.set((rngT() - 0.5) * 1.4, rngT() * Math.PI * 2, (rngT() - 0.5) * 1.6);
      scene.add(br);
    }
  }

  // Scattered rocks
  const rngR = mulberry32(77);
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.95 });
  for (let i = 0; i < 25; i++) {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12 + rngR() * 0.38, 0), rockMat);
    rock.position.set((rngR() - 0.5) * 30, 0.1, (rngR() - 0.5) * 30);
    rock.rotation.set(rngR() * Math.PI, rngR() * Math.PI, rngR() * Math.PI);
    scene.add(rock);
  }

  // Mushrooms — scattered wider, more atmospheric
  createMushroom(-6, -4);
  createMushroom( 4, -5);
  createMushroom( 7,  3);
  createMushroom(-3,  6);
  createMushroom( 2,  4);
  createMushroom(-9, -7);
  createMushroom( 8,  8);
  createMushroom(-5, 10);
  createMushroom( 7, -9);
  createMushroom( 0,  0, true); // teleport mushroom

  // Floating wisps drifting through fog
  const wispColors = [0x5500bb, 0x003366, 0x001a00, 0x330044, 0x002200];
  const rngW = mulberry32(33);
  for (let i = 0; i < 12; i++) {
    const col  = wispColors[Math.floor(rngW() * wispColors.length)];
    const wisp = new THREE.PointLight(col, 0.7 + rngW() * 0.6, 5);
    wisp.position.set((rngW() - 0.5) * 22, 0.4 + rngW() * 1.8, (rngW() - 0.5) * 22);
    wisp.userData = {
      baseY: wisp.position.y,
      baseX: wisp.position.x,
      phase: rngW() * Math.PI * 2,
      speed: 0.3 + rngW() * 0.35
    };
    scene.add(wisp);
    // Tiny visible orb
    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 8, 8),
      new THREE.MeshBasicMaterial({ color: col })
    );
    wisp.add(orb);
  }

  // Spawn the stalker
  stalker = createStalker();
  stalkerActive = true;

  // Start further back so player has to search for the green mushroom
  camera.position.set(0, 1.6, 25);
}

// -------------------- STALKER --------------------
function createStalker() {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x110022, emissiveIntensity: 1, roughness: 1 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0x050005, emissive: 0x220033, emissiveIntensity: 0.8, roughness: 1 });

  // Torso
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 1.4, 8), bodyMat);
  torso.position.y = 1.6;
  g.add(torso);

  // Featureless elongated head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 12), headMat);
  head.scale.set(0.85, 1.2, 0.85);
  head.position.y = 2.55;
  g.add(head);

  // Red glowing eyes
  [-0.1, 0.1].forEach(ex => {
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );
    eye.position.set(ex, 2.62, 0.22);
    g.add(eye);
    const eyeGlow = new THREE.PointLight(0xff0000, 0.4, 1.5);
    eyeGlow.position.set(ex, 2.62, 0.22);
    g.add(eyeGlow);
  });

  // Long hanging arms
  const armGeo = new THREE.CylinderGeometry(0.07, 0.05, 1.2, 8);
  [-0.42, 0.42].forEach((ax, i) => {
    const arm = new THREE.Mesh(armGeo, bodyMat);
    arm.position.set(ax, 1.3, 0);
    arm.rotation.z = i === 0 ? 0.25 : -0.25;
    g.add(arm);
  });

  // Legs
  const legGeo = new THREE.CylinderGeometry(0.1, 0.08, 0.9, 8);
  [-0.18, 0.18].forEach(lx => {
    const leg = new THREE.Mesh(legGeo, bodyMat);
    leg.position.set(lx, 0.5, 0);
    g.add(leg);
  });

  // Purple aura
  stalkerLight = new THREE.PointLight(0x6600aa, 1.2, 7);
  stalkerLight.position.y = 2;
  g.add(stalkerLight);

  g.position.set(6, 0, 10); // starts to the right of the player
  scene.add(g);
  return g;
}

// -------------------- ROOM THREE (FINAL) --------------------
function roomThree() {
  scene.background = new THREE.Color(0x000022);
  ambient.color.set(0x00ffff);
  sun.intensity = 1;

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.MeshStandardMaterial({ color: 0xffffff })
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });

  const wall1 = new THREE.Mesh(new THREE.BoxGeometry(20, 10, 0.5), wallMaterial);
  wall1.position.set(0, 4, -10);
  scene.add(wall1);

  const wall2 = wall1.clone();
  wall2.rotation.y = Math.PI / 2;
  wall2.position.set(-10, 4, 0);
  scene.add(wall2);

  const wall3 = wall2.clone();
  wall3.position.set(10, 4, 0);
  scene.add(wall3);
  
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(20, 1, 20), wallMaterial);
    roof.position.set(0, 9, 0);
  scene.add(roof);


  // BACK WALL BUTTONS
  createWallButtons({
    count: 6,
    startX: -4,
    startY: 5,
    z: -9.6,
    spacing: 2,
    rotationY: 0,
    correctIndex: 2
  });

  // LEFT WALL BUTTONS
  createWallButtons({
    count: 4,
    startX: -8,
    startY: 3,
    z: -9.6,
    spacing: 2,
    rotationY: 3*Math.PI / 2,
    correctIndex: 1
  });

  // RIGHT WALL BUTTONS
  createWallButtons({
    count: 4,
    startX: 2,
    startY: 7,
    z: -9.6,
    spacing: 2,
    rotationY: 5,
    correctIndex: 3
  });

    addControlBoard({
    x: -9.4,
    y: 4,
    z: 0,
    rotationY: Math.PI / 2
  });

    addControlBoard({
    x: 9.4,
    y: 4,
    z: 0,
    rotationY: -Math.PI / 2
  });
}
// -------------------- ROOMS LIST --------------------
rooms.push(roomOne, roomTwo, roomThree);

// -------------------- START --------------------
roomOne();

// -------------------- ANIMATE --------------------
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta   = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  if (!gameWon) {
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    dir.y = 0;
    dir.normalize();

    if (keys.w) camera.position.addScaledVector(dir,  speed);
    if (keys.s) camera.position.addScaledVector(dir, -speed);

    // A/D only allowed outside room 1
    if (roomIndex > 0) {
      const right = new THREE.Vector3().crossVectors(camera.up, dir).normalize();
      if (keys.a) camera.position.addScaledVector(right,  speed);
      if (keys.d) camera.position.addScaledVector(right, -speed);
    }
  }

  interactive.forEach(mesh => {
    if (mesh.userData.fading) {
      mesh.material.transparent = true;
      mesh.material.opacity = Math.max(0, (mesh.material.opacity ?? 1) - 0.02);
    }
    if (mesh.userData.flashing) {
      mesh.userData.flashTimer = (mesh.userData.flashTimer || 0) + delta * 10;
      const flash = Math.sin(mesh.userData.flashTimer) > 0;
      if (mesh.material?.color) mesh.material.color.set(flash ? 0xffff00 : 0xff0000);
      if (mesh.userData.flashTimer > Math.PI * 2) {
        mesh.userData.flashing = false;
        mesh.userData.flashTimer = 0;
        if (mesh.material?.color) mesh.material.color.set(0xff0000);
      }
    }
  });

  // Animate floating wisps in room two
  if (roomIndex === 1) {
    scene.children.forEach(obj => {
      if (obj.isPointLight && obj.userData.phase !== undefined) {
        const d = obj.userData;
        obj.position.y = d.baseY + Math.sin(elapsed * d.speed + d.phase) * 0.5;
        obj.position.x = d.baseX + Math.cos(elapsed * d.speed * 0.6 + d.phase) * 0.35;
      }
    });
  }

  // Stalker AI
  if (stalkerActive && stalker && roomIndex === 1) {
    const sp   = new THREE.Vector3(stalker.position.x, 0, stalker.position.z);
    const cp   = new THREE.Vector3(camera.position.x,  0, camera.position.z);
    const dist = sp.distanceTo(cp);

    // Move toward player
    const toPlayer = cp.clone().sub(sp).normalize();
    stalker.position.x += toPlayer.x * stalkerSpeed;
    stalker.position.z += toPlayer.z * stalkerSpeed;

    // Face player
    stalker.lookAt(camera.position.x, stalker.position.y, camera.position.z);

    // Subtle bob
    stalker.position.y = Math.sin(elapsed * 5) * 0.05;

    // Slowly accelerate over time
    stalkerSpeed = Math.min(0.032, stalkerSpeed + delta * 0.00035);

    const proximity = Math.max(0, 1 - dist / 18);

    // First warning message
    if (dist < 14 && !stalkerWarned) {
      stalkerWarned = true;
      _stalkerMsgEl.textContent = 'something is following you';
      _stalkerMsgEl.style.opacity = '1';
      setTimeout(() => { _stalkerMsgEl.style.opacity = '0'; }, 3500);
    }

    // Red heartbeat vignette pulsing with proximity
    if (dist < 14) {
      heartbeatTime += delta * (2.5 + proximity * 9);
      const pulse = Math.max(0, Math.sin(heartbeatTime) * proximity * 0.75);
      _heartbeatEl.style.opacity = pulse.toFixed(3);
    } else {
      _heartbeatEl.style.opacity = '0';
    }

    // Stalker aura flicker
    if (stalkerLight) {
      stalkerLight.intensity = 0.9 + Math.sin(elapsed * 14) * 0.35 * Math.max(0.2, proximity);
      stalkerLight.color.setHSL(0.78, 1, 0.25 + proximity * 0.22);
    }

    // Caught — reset player position
    if (dist < 1.2) {
      camera.position.set(0, 1.6, 12);
      stalker.position.set((Math.random() - 0.5) * 4, 0, 20);
      stalkerSpeed = 0.012;
      _heartbeatEl.style.opacity = '0';
      _stalkerMsgEl.textContent = 'it found you';
      _stalkerMsgEl.style.opacity = '1';
      setTimeout(() => { _stalkerMsgEl.style.opacity = '0'; }, 3000);
    }
  } else if (roomIndex !== 1) {
    _heartbeatEl.style.opacity = '0';
  }

  renderer.render(scene, camera);
}

animate();

// -------------------- RESIZE --------------------
window.addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});