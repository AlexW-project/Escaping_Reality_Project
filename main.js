import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.159.0/build/three.module.js";

// -------------------- BASIC SETUP --------------------
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1000);
camera.position.set(0, 1.6, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

// -------------------- LIGHTING --------------------
let ambient = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambient);

let sun = new THREE.DirectionalLight(0xffffff, 1);
sun.position.set(10, 20, 10);
scene.add(sun);

// -------------------- MOVEMENT (WASD) --------------------
const keys = {};
let gameWon = false;

document.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
document.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

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

  const pigMaterial = new THREE.MeshStandardMaterial({ color: 0xffb6c1 });

  // Body
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 32, 32),
    pigMaterial
  );
  body.scale.set(1.2, 1, 1);
  pigGroup.add(body);

  // Head
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 32, 32),
    pigMaterial
  );
  head.position.set(0, 0.2, 0.6);
  pigGroup.add(head);

  // Snout
  const snout = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 0.15, 16),
    new THREE.MeshStandardMaterial({ color: 0xff9aa2 })
  );
  snout.rotation.x = Math.PI / 2;
  snout.position.set(0, 0.15, 0.9);
  pigGroup.add(snout);

  pigGroup.position.set(x, 0.5, z);

  // Shared click logic
  const buttonLogic = {
    fading: false,
    onClick: () => {
      if (isCorrect) {
        nextRoom(); // ✅ THIS NOW FIRES
      } else {
        buttonLogic.fading = true;
      }
    }
  };

  // ✅ THIS IS THE IMPORTANT PART
  pigGroup.traverse(child => {
    if (child.isMesh) {
      child.userData = buttonLogic;
      interactive.push(child); // raycaster sees these
    }
  });

  scene.add(pigGroup);
}


// -------------------- ROOMS --------------------
function roomOne() {
  // -------------------- SKY AND LIGHT --------------------
  scene.background = new THREE.Color(0x87ceeb); // light blue sky
  ambient.color.set(0xffffff);
  ambient.intensity = 0.5;
  sun.intensity = 1;
  sun.position.set(10, 20, 10);

  // -------------------- GRASS FLOOR --------------------
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 30),
    new THREE.MeshStandardMaterial({ color: 0x3fa34d })
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  // -------------------- BARN --------------------
  // Main barn body
  const barnBody = new THREE.Mesh(
    new THREE.BoxGeometry(4, 3, 4),
    new THREE.MeshStandardMaterial({ color: 0xb22222 }) // red
  );
  barnBody.position.set(0, 1.5, -8);
  scene.add(barnBody);

  // Roof (triangular prism)
  const roofShape = new THREE.Shape();
  roofShape.moveTo(-2, 0);
  roofShape.lineTo(0, 1.5);
  roofShape.lineTo(2, 0);
  roofShape.lineTo(-2, 0);

  const extrudeSettings = { depth: 4, bevelEnabled: false };
  const roofGeometry = new THREE.ExtrudeGeometry(roofShape, extrudeSettings);
  const roof = new THREE.Mesh(
    roofGeometry,
    new THREE.MeshStandardMaterial({ color: 0x8b0000 }) // dark red
  );
  roof.rotation.x = Math.PI;
  roof.position.set(0, 3, -10);
  scene.add(roof);

  // Door
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1.5, 0.1),
    new THREE.MeshStandardMaterial({ color: 0x654321 }) // brown
  );
  door.position.set(0, 0.75, -6);
  scene.add(door);

  // Windows
  const leftWindow = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.5, 0.1),
    new THREE.MeshStandardMaterial({ color: 0xffffaa }) // yellow
  );
  leftWindow.position.set(-1, 2, -6);
  scene.add(leftWindow);

  const rightWindow = leftWindow.clone();
  rightWindow.position.set(1, 2, -6);
  scene.add(rightWindow);

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
  createPigButton(0, 0, true);           // hidden pig button

  // -------------------- CAMERA --------------------
  camera.position.set(0, 1.6, 12); // start inside front opening
}

function roomTwo() {
  scene.background = new THREE.Color(0x111111);
  ambient.color.set(0xff00ff);
  sun.intensity = 0.3;

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.MeshStandardMaterial({ color: 0x333333 })
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const rotatingCube = new THREE.Mesh(
    new THREE.BoxGeometry(),
    new THREE.MeshStandardMaterial({ color: 0xff8800 })
  );
  rotatingCube.position.y = 1;
  rotatingCube.userData.rotate = true;
  scene.add(rotatingCube);

  createButton(-4, 0, 0xffff00, false);
  createButton(0, 0, 0xff00ff, true);
  createButton(4, 0, 0x00ffff, false);
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
