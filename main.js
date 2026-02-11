import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.159.0/build/three.module.js";

// -------------------- BASIC SETUP --------------------
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1000);
camera.position.set(0, 1.6, 5);

const textureLoader = new THREE.TextureLoader();
const mushroomCapTexture = textureLoader.load("textures/mush.png");


const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

// -------------------- LIGHTING --------------------
let ambient = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambient);

let sun = new THREE.DirectionalLight(0xffffff, 1);
sun.position.set(10, 20, 10);
scene.add(sun);

// -------------------- MOVEMENT (W / S ONLY) --------------------
const keys = { w: false, s: false };
let gameWon = false;

document.addEventListener("keydown", e => {
  if (e.key === "w" || e.key === "s") {
    keys[e.key] = true;
  }
});

document.addEventListener("keyup", e => {
  if (e.key === "w" || e.key === "s") {
    keys[e.key] = false;
  }
});

const speed = 0.08;

// -------------------- INTERACTION --------------------
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const interactive = [];

window.addEventListener("click", e => {
  if (gameWon) return;

  mouse.x = (e.clientX / innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(interactive);

  if (hits.length) {
    hits[0].object.userData.onClick(hits[0].object);
  }
});

// -------------------- ROOM SYSTEM --------------------
let roomIndex = 0;
const rooms = [];

function clearRoom() {
  while (scene.children.length > 0) {
    scene.remove(scene.children[0]);
  }
  scene.add(ambient, sun);
  interactive.length = 0;
}

// -------------------- BUTTON FACTORY --------------------
function createButton(x, z, color, isCorrect) {
  const material = new THREE.MeshStandardMaterial({
    color,
    transparent: true,
    opacity: 1
  });

  const button = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.4, 0.2, 32),
    material
  );

  button.position.set(x, 0.2, z);
  button.userData = {
    isCorrect,
    fading: false,
    onClick: () => {
      if (isCorrect) {
        nextRoom();
      } else {
        button.userData.fading = true;
      }
    }
  };

  scene.add(button);
  interactive.push(button);
}
function createPigButton(x, z, isCorrect) {
  const pigGroup = new THREE.Group();

  const pigMaterial = new THREE.MeshStandardMaterial({
    color: 0xffb6c1,
    roughness: 0.7
  });

  const darkPink = new THREE.MeshStandardMaterial({ color: 0xff8fa3 });
  const blackMat = new THREE.MeshStandardMaterial({ color: 0x222222 });

  // 🐷 Body
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 32, 32),
    pigMaterial
  );
  body.scale.set(1.3, 1, 1);
  body.castShadow = true;
  pigGroup.add(body);

  // 🐷 Head (parented to body)
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 32, 32),
    pigMaterial
  );
  head.position.set(0, 0.25, 0.65);
  head.castShadow = true;
  body.add(head);

  // 🐽 Snout
  const snout = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.14, 0.18, 20),
    darkPink
  );
  snout.rotation.x = Math.PI / 2;
  snout.position.set(0, 0, 0.35);
  head.add(snout);

  // 👃 Nostrils
  const nostrilGeo = new THREE.SphereGeometry(0.03, 8, 8);

  const leftNostril = new THREE.Mesh(nostrilGeo, blackMat);
  leftNostril.position.set(-0.05, 0, 0.46);

  const rightNostril = leftNostril.clone();
  rightNostril.position.x = 0.05;

  head.add(leftNostril, rightNostril);

  // 👀 Eyes (outside the head)
  const eyeGeo = new THREE.SphereGeometry(0.05, 12, 12);

  const leftEye = new THREE.Mesh(eyeGeo, blackMat);
  leftEye.position.set(-0.1, 0.1, 0.45);

  const rightEye = leftEye.clone();
  rightEye.position.x = 0.1;

  head.add(leftEye, rightEye);

  // 🐽 Ears
const earGeo = new THREE.SphereGeometry(0.18, 16, 16);
earGeo.scale(1, 0.6, 0.2); // flatten into ear shape

const leftEar = new THREE.Mesh(earGeo, pigMaterial);
leftEar.position.set(-0.25, 0.25, 0.05);
leftEar.rotation.z = Math.PI / 6;
leftEar.rotation.x = -Math.PI / 10;

const rightEar = leftEar.clone();
rightEar.position.x = 0.25;
rightEar.rotation.z = -Math.PI / 6;

head.add(leftEar, rightEar);


  // 🦵 Legs (on the ground)
  const legGeo = new THREE.CylinderGeometry(0.07, 0.09, 0.3, 12);
  const legY = -0.35;

  const legPositions = [
    [-0.3, legY,  0.25],
    [ 0.3, legY,  0.25],
    [-0.3, legY, -0.25],
    [ 0.3, legY, -0.25]
  ];

  legPositions.forEach(([x, y, z]) => {
    const leg = new THREE.Mesh(legGeo, pigMaterial);
    leg.position.set(x, y, z);
    leg.castShadow = true;
    body.add(leg);
  });

  // 🌀 Tail
  const tail = new THREE.Mesh(
    new THREE.TorusGeometry(0.07, 0.02, 8, 16, Math.PI * 1.5),
    pigMaterial
  );
  tail.position.set(0, 0.15, -0.55);
  tail.rotation.x = Math.PI / 2;
  tail.castShadow = true;
  body.add(tail);

  // 📍 Position pig so feet touch ground
  pigGroup.position.set(x, 0.5, z);

  // 🖱️ Click logic
  const buttonLogic = {
    fading: false,
    onClick: () => {
      if (isCorrect) {
        nextRoom();
      } else {
        buttonLogic.fading = true;
      }
    }
  };

  pigGroup.traverse(child => {
    if (child.isMesh) {
      child.userData = buttonLogic;
      interactive.push(child);
    }
  });

  scene.add(pigGroup);
  return pigGroup;
}


// -------------------- ROOMS --------------------
function roomOne() {

scene.background = new THREE.Color(0x87ceeb); // sky blue

// Ambient light (soft fill)
const ambient = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambient);

// Sun light (directional)
const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
sunLight.position.set(50, 100, -50);
sunLight.castShadow = true;
scene.add(sunLight);

const sunGeometry = new THREE.SphereGeometry(10, 32, 32);
const sunMaterial = new THREE.MeshBasicMaterial({
  color: 0xfff4cc
});

const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
sunMesh.position.copy(sunLight.position);
scene.add(sunMesh);

const cloudTexture = new THREE.TextureLoader().load('textures/cloud.png');
cloudTexture.wrapS = cloudTexture.wrapT = THREE.RepeatWrapping;

function createClouds({
  count = 20,
  area = 200,
  height = 50,
  seed = 1
} = {}) {
  const clouds = new THREE.Group();
  const rng = mulberry32(seed);

  for (let i = 0; i < count; i++) {
    const material = new THREE.SpriteMaterial({
      map: cloudTexture,
      transparent: true,
      opacity: 0.8,
      depthWrite: false
    });

    const cloud = new THREE.Sprite(material);

    const scale = 20 + rng() * 30;
    cloud.scale.set(scale, scale * 0.6, 1);

    cloud.position.set(
      (rng() - 0.5) * area,
      height + rng() * 30,
      (rng() - 0.5) * area
    );

    cloud.rotation.z = rng() * Math.PI;
    clouds.add(cloud);
  }

  return clouds;
}

function mulberry32(seed) {
  return function () {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const clouds = createClouds({
  count: 25,
  area: 300,
  height: 60,
  seed: 42
});

scene.add(clouds);

  // -------------------- GRASS FLOOR --------------------
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(30, 30, 32, 32),
  new THREE.MeshStandardMaterial({
    color: 0x3fa34d,
    roughness: 1,
    metalness: 0
  })
);

floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const grassTexture = new THREE.TextureLoader().load('textures/grass-blade.png');
grassTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

const grassMaterial = new THREE.MeshStandardMaterial({
  map: grassTexture,
  transparent: true,
  side: THREE.DoubleSide,
  roughness: 1
});

function createGrass({
  count = 800,
  area = 30,
  seed = 123
} = {}) {
  const grass = new THREE.Group();
  const rng = mulberry32(seed);

  const bladeGeo = new THREE.PlaneGeometry(0.1, 1);

  for (let i = 0; i < count; i++) {
    const blade = new THREE.Mesh(bladeGeo, grassMaterial);

    blade.position.set(
      (rng() - 0.5) * area,
      0.5,
      (rng() - 0.5) * area
    );

    blade.rotation.y = rng() * Math.PI;
    blade.rotation.z = (rng() - 0.5) * 0.2;

    const scale = 0.5 + rng();
    blade.scale.set(scale, scale, scale);

    blade.castShadow = true;
    grass.add(blade);
  }

  return grass;
}

const grass = createGrass({
  count: 1000,
  area: 28,
  seed: 42
});

scene.add(grass);



// BARN

const barn = new THREE.Group();
barn.position.set(0, 0, -8);


// Materials
const barnRed = new THREE.MeshStandardMaterial({ color: 0xb22222, roughness: 0.8 });
const roofRed = new THREE.MeshStandardMaterial({ color: 0x8b0000, roughness: 0.9 });
const trimWhite = new THREE.MeshStandardMaterial({ color: 0xffffff });
const doorBrown = new THREE.MeshStandardMaterial({ color: 0x7a4a2e });
const windowYellow = new THREE.MeshStandardMaterial({ color: 0xffffcc });

// Main body
const barnBody = new THREE.Mesh(
  new THREE.BoxGeometry(4.5, 3.5, 5),
  barnRed
);
barnBody.position.y = 1.75;
barnBody.castShadow = true;
barnBody.receiveShadow = true;
barn.add(barnBody);

// Roof
const roofShape = new THREE.Shape();
roofShape.moveTo(-2.5, 0);
roofShape.lineTo(0, 1.8);
roofShape.lineTo(2.5, 0);
roofShape.lineTo(-2.5, 0);

const roof = new THREE.Mesh(
  new THREE.ExtrudeGeometry(roofShape, {
    depth: 5.4,
    bevelEnabled: false
  }),
  roofRed
);
roof.rotation.y = Math.PI / 2;
roof.position.set(-2.7, 3.5, -2.7);
roof.castShadow = true;
barn.add(roof);

// White trim under roof
const trim = new THREE.Mesh(
  new THREE.BoxGeometry(4.7, 0.1, 5.05),
  trimWhite
);
trim.position.y = 3.5;
barn.add(trim);

// Double doors
const doorLeft = new THREE.Mesh(
  new THREE.BoxGeometry(1.2, 2, 0.1),
  doorBrown
);
doorLeft.position.set(-0.6, 1, 2.51);

const doorRight = doorLeft.clone();
doorRight.position.x = 0.6;

barn.add(doorLeft, doorRight);

// X braces on doors
function addXBrace(parent) {
  const brace1 = new THREE.Mesh(
    new THREE.BoxGeometry(1.3, 0.05, 0.05),
    trimWhite
  );
  brace1.rotation.z = Math.PI / 4;

  const brace2 = brace1.clone();
  brace2.rotation.z = -Math.PI / 4;

  parent.add(brace1, brace2);
}

addXBrace(doorLeft);
addXBrace(doorRight);

// Loft window
const loftWindow = new THREE.Mesh(
  new THREE.BoxGeometry(0.8, 0.8, 0.1),
  windowYellow
);
loftWindow.position.set(0, 2.8, 2.51);
barn.add(loftWindow);

// Optional side windows
const sideWindow = new THREE.Mesh(
  new THREE.BoxGeometry(0.6, 0.6, 0.1),
  windowYellow
);
sideWindow.position.set(-2.26, 2, 0);
sideWindow.rotation.y = Math.PI / 2;

const sideWindow2 = sideWindow.clone();
sideWindow2.position.x = 2.26;

barn.add(sideWindow, sideWindow2);

scene.add(barn);

  // -------------------- FENCES --------------------
  const fenceColor = 0xc2a679;
  const postHeight = 1.2;
  const postSpacing = 2;

  const minX = -15, maxX = 15;
  const minZ = -15, maxZ = 15;
  const openingWidth = 4; // opening at front

  function createPost(x, z) {
    const post = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, postHeight, 0.2),
      new THREE.MeshStandardMaterial({ color: fenceColor })
    );
    post.position.set(x, postHeight / 2, z);
    scene.add(post);
    return post;
  }

  // Back fence
  let backPosts = [];
  for (let x = minX; x <= maxX; x += postSpacing) backPosts.push(createPost(x, minZ));
  for (let i = 0; i < backPosts.length - 1; i++) {
    const a = backPosts[i];
    const b = backPosts[i + 1];
    const log = new THREE.Mesh(
      new THREE.BoxGeometry(b.position.x - a.position.x, 0.1, 0.1),
      new THREE.MeshStandardMaterial({ color: fenceColor })
    );
    log.position.set((a.position.x + b.position.x)/2, postHeight*0.7, a.position.z);
    scene.add(log);
  }

  // Front fence (with opening)
  let frontPosts = [];
  for (let x = minX; x <= maxX; x += postSpacing) {
    if (x > -openingWidth/2 && x < openingWidth/2) continue;
    frontPosts.push(createPost(x, maxZ));
  }
  for (let i = 0; i < frontPosts.length - 1; i++) {
    const a = frontPosts[i];
    const b = frontPosts[i + 1];
    const log = new THREE.Mesh(
      new THREE.BoxGeometry(b.position.x - a.position.x, 0.1, 0.1),
      new THREE.MeshStandardMaterial({ color: fenceColor })
    );
    log.position.set((a.position.x + b.position.x)/2, postHeight*0.7, a.position.z);
    scene.add(log);
  }

  // Left fence
  let leftPosts = [];
  for (let z = minZ + postSpacing; z <= maxZ - postSpacing; z += postSpacing) leftPosts.push(createPost(minX, z));
  for (let i = 0; i < leftPosts.length - 1; i++) {
    const a = leftPosts[i];
    const b = leftPosts[i + 1];
    const log = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.1, b.position.z - a.position.z),
      new THREE.MeshStandardMaterial({ color: fenceColor })
    );
    log.position.set(a.position.x, postHeight*0.7, (a.position.z + b.position.z)/2);
    scene.add(log);
  }

  // Right fence
  let rightPosts = [];
  for (let z = minZ + postSpacing; z <= maxZ - postSpacing; z += postSpacing) rightPosts.push(createPost(maxX, z));
  for (let i = 0; i < rightPosts.length - 1; i++) {
    const a = rightPosts[i];
    const b = rightPosts[i + 1];
    const log = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.1, b.position.z - a.position.z),
      new THREE.MeshStandardMaterial({ color: fenceColor })
    );
    log.position.set(a.position.x, postHeight*0.7, (a.position.z + b.position.z)/2);
    scene.add(log);
  }

  // -------------------- BUTTONS --------------------
  createButton(-4, -2, 0xff4444, false); // fake button
  createButton(4, -2, 0x4444ff, false);  // fake button
  createPigButton(-5, 5, true);         // hidden pig button

  // -------------------- CAMERA --------------------
  camera.position.set(0, 1.6, 12); 
}

// ----------------------
// Mushroom Helper Function
// ----------------------
function createMushroom(x, z, isTeleportMushroom = false) {
  const mushroom = new THREE.Group();

  // Stem
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.3, 1.5, 12),
    new THREE.MeshStandardMaterial({ color: 0xf5deb3 })
  );
  stem.position.y = 0.75;
  mushroom.add(stem);

  // Cap
  const cap = new THREE.Mesh(
  new THREE.SphereGeometry(0.9, 24, 24, 0, Math.PI * 2, 0, Math.PI / 2),
  new THREE.MeshStandardMaterial({
  map: mushroomCapTexture,
  roughness: 0.6,
  metalness: 0
})

);


  cap.position.y = 1.5;
  mushroom.add(cap);

  // ⭐ TELEPORT BUTTON
  if (isTeleportMushroom) {
    const button = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.25, 0.12, 24),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 1
      })
    );

    button.position.set(0, 0.9, 0); // sits on cap
    cap.add(button);

    button.userData = {
      fading: false,
      onClick: () => nextRoom()
    };

    interactive.push(button);
  }

  mushroom.position.set(x, 0, z);
  scene.add(mushroom);
}


// ----------------------
// Mushroom-Themed Map 2
// ----------------------
function roomTwo() {
  // Dark, moody mushroom vibe
  scene.background = new THREE.Color(0x1b0f1f);
  ambient.color.set(0x884488);
  sun.intensity = 0.2;

  // Ground
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 30),
    new THREE.MeshStandardMaterial({ color: 0x2b2b1f })
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  // Optional fog for atmosphere
  scene.fog = new THREE.Fog(0x1b0f1f, 6, 25);

  // Decorative mushrooms
  createMushroom(-6, -4);
  createMushroom(4, -5);
  createMushroom(7, 3);
  createMushroom(-3, 6);
  createMushroom(2, 4);

  // ONE mushroom hides the teleport spot
  createMushroom(0, 0, true);
}

function roomThree() {
  scene.background = new THREE.Color(0x000022);
  ambient.color.set(0x00ffff);
  sun.intensity = 1;

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.MeshStandardMaterial({ color: 0x000000 })
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  createButton(0, -3, 0xffffff, true);
}

rooms.push(roomOne, roomTwo, roomThree);

// -------------------- WIN ROOM --------------------
function winRoom() {
  gameWon = true;
  clearRoom();

  scene.background = new THREE.Color(0x0a0a23);
  ambient.color.set(0x5555ff);
  ambient.intensity = 0.6;
  sun.intensity = 0.2;

  // Ground
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(50, 50),
    new THREE.MeshStandardMaterial({ color: 0x111111 })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // Buildings
  for (let i = 0; i < 25; i++) {
    const h = Math.random() * 8 + 4;
    const building = new THREE.Mesh(
      new THREE.BoxGeometry(2, h, 2),
      new THREE.MeshStandardMaterial({
        color: 0x222222,
        emissive: 0x111155
      })
    );

    building.position.set(
      (Math.random() - 0.5) * 30,
      h / 2,
      (Math.random() - 0.5) * 30
    );
    scene.add(building);
  }

  // YOU WIN sign
  const winSign = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 3),
    new THREE.MeshBasicMaterial({ color: 0x00ffff })
  );
  winSign.position.set(0, 4, -10);
  scene.add(winSign);

  camera.position.set(0, 3, 10);
}

// -------------------- ROOM TRANSITION --------------------
function nextRoom() {
  clearRoom();
  roomIndex++;

  if (roomIndex >= rooms.length) {
    winRoom();
    return;
  }

  camera.position.set(0, 1.6, 5);
  rooms[roomIndex]();
}

// -------------------- ANIMATION LOOP --------------------
function animate() {
  requestAnimationFrame(animate);

  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  dir.y = 0;
  dir.normalize();

  const right = new THREE.Vector3().crossVectors(camera.up, dir).normalize();

  if (!gameWon) {
    if (keys["w"]) camera.position.addScaledVector(dir, speed);
    if (keys["s"]) camera.position.addScaledVector(dir, -speed);
    if (keys["a"]) camera.position.addScaledVector(right, speed);
    if (keys["d"]) camera.position.addScaledVector(right, -speed);
  }

  scene.traverse(obj => {
    if (obj.userData.rotate) {
      obj.rotation.y += 0.01;
    }
    if (obj.userData.fading) {
      obj.material.opacity -= 0.02;
      if (obj.material.opacity <= 0) {
        scene.remove(obj);
      }
    }
  });

  renderer.render(scene, camera);
}

// -------------------- START --------------------
rooms[0]();
animate();

// -------------------- RESIZE --------------------
window.addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
