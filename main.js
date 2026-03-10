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

  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.3, 1.5, 12),
    new THREE.MeshStandardMaterial({ color: 0xf5deb3 })
  );
  stem.position.y = 0.75;
  group.add(stem);

  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.9, 24, 24, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0xcc2200, roughness: 0.6 })
  );
  cap.position.y = 1.5;
  group.add(cap);

  for (let i = 0; i < 5; i++) {
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xffffff })
    );
    const angle  = (i / 5) * Math.PI * 2;
    const radius = 0.45;
    dot.position.set(Math.cos(angle) * radius, 1.75, Math.sin(angle) * radius);
    group.add(dot);
  }

  if (isTeleport) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.5, 0.06, 8, 24),
      new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0xffaa00 })
    );
    ring.position.y = 0.1;
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    cap.userData = { onClick: () => nextRoom() };
    interactive.push(cap);
  }

  group.position.set(x, 0, z);
  scene.add(group);
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

// -------------------- ROOM TWO (ORIGINAL) --------------------
function roomTwo() {
  scene.background = new THREE.Color(0x1b0f1f);
  ambient.color.set(0x884488);
  sun.intensity = 0.2;

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 30),
    new THREE.MeshStandardMaterial({ color: 0x2b2b1f })
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  scene.fog = new THREE.Fog(0x1b0f1f, 6, 25);

  createMushroom(-6, -4);
  createMushroom(4, -5);
  createMushroom(7, 3);
  createMushroom(-3, 6);
  createMushroom(2, 4);
  createMushroom(0, 0, true);
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
function animate() {
  requestAnimationFrame(animate);

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
  });

  renderer.render(scene, camera);
}
const clock = new THREE.Clock();

animate();

// -------------------- RESIZE --------------------
window.addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});