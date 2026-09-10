/**
 * =========================================================================
 * MAHAKAM FPS DEFENDER - 3D FIRST PERSON SHOOTER
 * =========================================================================
 * Pure Three.js + Web Audio API 3D Shooter Game
 * Responsif di Desktop & Mobile dengan kontrol sentuh virtual
 * Credit by Jefri (https://jefri-orcin.vercel.app/)
 * =========================================================================
 */

(function () {
  "use strict";

  // --- AUDIO SYNTHESIZER (Web Audio API) ---
  const AudioEngine = {
    ctx: null,
    init: function () {
      if (!this.ctx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) this.ctx = new AudioContext();
      }
      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume();
      }
    },
    playShoot: function () {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.exponentialRampToValueAtTime(110, t + 0.12);

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.13);
    },
    playHit: function () {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(350, t);
      osc.frequency.exponentialRampToValueAtTime(600, t + 0.08);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.linearRampToValueAtTime(0.01, t + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.09);
    },
    playExplosion: function () {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      // White noise buffer for explosion
      const bufferSize = this.ctx.sampleRate * 0.3;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(800, t);
      filter.frequency.exponentialRampToValueAtTime(50, t + 0.3);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      whiteNoise.start(t);
    },
    playReload: function () {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(300, t);
      osc.frequency.setValueAtTime(500, t + 0.15);

      gain.gain.setValueAtTime(0.15, t);
      gain.gain.linearRampToValueAtTime(0.01, t + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.26);
    }
  };

  // --- GAME STATE ---
  const state = {
    running: false,
    score: 0,
    kills: 0,
    wave: 1,
    hp: 100,
    ammo: 30,
    maxAmmo: 30,
    isReloading: false,
    canShoot: true,
    lastTime: 0,
    drones: [],
    particles: [],
    dronesRemainingInWave: 5
  };

  // --- THREE.JS SETUP ---
  const container = document.getElementById("game-canvas-container");
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050811);
  scene.fog = new THREE.FogExp2(0x050811, 0.025);

  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 1.7, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  // --- LIGHTING ---
  const ambientLight = new THREE.AmbientLight(0x1e293b, 1.2);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0x38bdf8, 1.5);
  dirLight.position.set(20, 40, 20);
  scene.add(dirLight);

  const riverGlow = new THREE.PointLight(0x0284c7, 2, 80);
  riverGlow.position.set(0, 5, -40);
  scene.add(riverGlow);

  // --- 3D ENVIRONMENT (Arena Tepian Mahakam) ---
  // Platform Lantai Pertahanan
  const floorGeo = new THREE.PlaneGeometry(60, 60);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.8,
    metalness: 0.2
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  // Garis Grid Neon Lantai
  const gridHelper = new THREE.GridHelper(60, 30, 0x38bdf8, 0x1e2942);
  gridHelper.position.y = 0.01;
  scene.add(gridHelper);

  // Sungai Mahakam di Latar Belakang
  const riverGeo = new THREE.PlaneGeometry(200, 100);
  const riverMat = new THREE.MeshBasicMaterial({ color: 0x0369a1, transparent: true, opacity: 0.6 });
  const river = new THREE.Mesh(riverGeo, riverMat);
  river.rotation.x = -Math.PI / 2;
  river.position.set(0, -0.2, -60);
  scene.add(river);

  // Dinding Pembatas & Pilar Neon
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
  const pillarGeo = new THREE.CylinderGeometry(0.8, 0.8, 6, 16);
  const neonMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

  const pillarPositions = [
    [-28, 3, -28], [28, 3, -28], [-28, 3, 28], [28, 3, 28],
    [0, 3, -28], [-28, 3, 0], [28, 3, 0], [0, 3, 28]
  ];

  pillarPositions.forEach(([x, y, z]) => {
    const pillar = new THREE.Mesh(pillarGeo, wallMat);
    pillar.position.set(x, y, z);
    scene.add(pillar);

    // Neon Ring
    const ringGeo = new THREE.TorusGeometry(0.85, 0.08, 8, 24);
    const ring = new THREE.Mesh(ringGeo, neonMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(x, 4.5, z);
    scene.add(ring);
  });

  // --- 3D GUN WEAPON MODEL (Attached to Camera) ---
  const gunGroup = new THREE.Group();
  const gunBodyGeo = new THREE.BoxGeometry(0.12, 0.16, 0.6);
  const gunMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3, metalness: 0.8 });
  const gunBody = new THREE.Mesh(gunBodyGeo, gunMat);

  const gunBarrelGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.4, 16);
  const gunBarrelMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.9, roughness: 0.2 });
  const gunBarrel = new THREE.Mesh(gunBarrelGeo, gunBarrelMat);
  gunBarrel.rotation.x = Math.PI / 2;
  gunBarrel.position.set(0, 0.04, -0.35);

  const gunSightGeo = new THREE.BoxGeometry(0.02, 0.04, 0.08);
  const gunSightMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  const gunSight = new THREE.Mesh(gunSightGeo, gunSightMat);
  gunSight.position.set(0, 0.1, -0.2);

  // Muzzle Flash Light
  const muzzleLight = new THREE.PointLight(0x38bdf8, 0, 10);
  muzzleLight.position.set(0, 0.04, -0.6);

  gunGroup.add(gunBody);
  gunGroup.add(gunBarrel);
  gunGroup.add(gunSight);
  gunGroup.add(muzzleLight);

  gunGroup.position.set(0.3, -0.25, -0.6);
  camera.add(gunGroup);
  scene.add(camera);

  // --- DRONE CREATION HELPER ---
  function createDrone() {
    const drone = new THREE.Group();

    // Badan Utama Drone
    const bodyGeo = new THREE.SphereGeometry(0.65, 16, 16);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.6 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    drone.add(body);

    // Mata Merah Cyber
    const eyeGeo = new THREE.SphereGeometry(0.2, 12, 12);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(0, 0, 0.55);
    drone.add(eye);

    // Baling-baling Rotors
    const rotorGeo = new THREE.BoxGeometry(1.6, 0.04, 0.15);
    const rotorMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8 });
    const rotor1 = new THREE.Mesh(rotorGeo, rotorMat);
    rotor1.position.y = 0.55;
    drone.add(rotor1);

    // Tentukan posisi spawn acak di sekeliling luar arena
    const angle = Math.random() * Math.PI * 2;
    const distance = 35 + Math.random() * 15;
    drone.position.x = Math.cos(angle) * distance;
    drone.position.z = Math.sin(angle) * distance;
    drone.position.y = 1.5 + Math.random() * 3.5;

    drone.userData = {
      rotor: rotor1,
      hp: 1 + Math.floor(state.wave * 0.4),
      speed: (3.5 + state.wave * 0.4) * (0.85 + Math.random() * 0.3),
      bobOffset: Math.random() * Math.PI * 2
    };

    scene.add(drone);
    state.drones.push(drone);
  }

  // --- PARTICLE EXPLOSION ---
  function spawnExplosion(pos) {
    const count = 18;
    for (let i = 0; i < count; i++) {
      const pGeo = new THREE.SphereGeometry(0.12, 6, 6);
      const pMat = new THREE.MeshBasicMaterial({
        color: Math.random() > 0.4 ? 0xf59e0b : 0xef4444
      });
      const p = new THREE.Mesh(pGeo, pMat);
      p.position.copy(pos);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 8,
        Math.random() * 6 + 1,
        (Math.random() - 0.5) * 8
      );

      scene.add(p);
      state.particles.push({ mesh: p, vel: vel, life: 0.5 });
    }
  }

  // --- SHOOTING & RAYCASTING ---
  const raycaster = new THREE.Raycaster();
  const hitmarkerEl = document.getElementById("hitmarker");

  function fireWeapon() {
    if (!state.running || state.isReloading || state.ammo <= 0 || !state.canShoot) {
      if (state.ammo <= 0 && !state.isReloading) reloadWeapon();
      return;
    }

    state.ammo--;
    updateHUD();
    AudioEngine.playShoot();

    // Animasi Recoil Senjata
    gunGroup.position.z = -0.45;
    gunGroup.rotation.x = 0.2;
    muzzleLight.intensity = 4;
    setTimeout(() => {
      gunGroup.position.z = -0.6;
      gunGroup.rotation.x = 0;
      muzzleLight.intensity = 0;
    }, 90);

    // Raycast tepat di tengah layar kamera
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const droneMeshes = [];
    state.drones.forEach((d) => {
      d.traverse((child) => {
        if (child.isMesh) {
          child.userData.parentDrone = d;
          droneMeshes.push(child);
        }
      });
    });

    const intersects = raycaster.intersectObjects(droneMeshes);
    if (intersects.length > 0) {
      const hitMesh = intersects[0].object;
      const targetDrone = hitMesh.userData.parentDrone;
      if (targetDrone) {
        targetDrone.userData.hp--;
        AudioEngine.playHit();

        // Hitmarker Flash
        hitmarkerEl.classList.add("hit");
        setTimeout(() => hitmarkerEl.classList.remove("hit"), 120);

        if (targetDrone.userData.hp <= 0) {
          AudioEngine.playExplosion();
          spawnExplosion(targetDrone.position);
          scene.remove(targetDrone);
          state.drones = state.drones.filter((d) => d !== targetDrone);
          state.score += 100;
          state.kills++;
          updateHUD();
        }
      }
    }
  }

  function reloadWeapon() {
    if (state.isReloading || state.ammo === state.maxAmmo) return;
    state.isReloading = true;
    AudioEngine.playReload();

    gunGroup.position.y = -0.5;
    setTimeout(() => {
      state.ammo = state.maxAmmo;
      state.isReloading = false;
      gunGroup.position.y = -0.25;
      updateHUD();
    }, 1200);
  }

  // --- HUD UPDATES ---
  const scoreValEl = document.getElementById("score-val");
  const waveValEl = document.getElementById("wave-val");
  const hpBarFill = document.getElementById("hp-bar-fill");
  const hpValEl = document.getElementById("hp-val");
  const ammoValEl = document.getElementById("ammo-val");

  function updateHUD() {
    scoreValEl.textContent = state.score.toLocaleString("id-ID");
    waveValEl.textContent = state.wave;
    ammoValEl.textContent = state.isReloading ? "RELOAD..." : state.ammo;

    const hpPercent = Math.max(0, state.hp);
    hpBarFill.style.width = `${hpPercent}%`;
    hpValEl.textContent = `${hpPercent}%`;

    if (hpPercent < 30) {
      hpBarFill.style.background = "#ef4444";
      hpValEl.style.color = "#ef4444";
    } else if (hpPercent < 60) {
      hpBarFill.style.background = "#f59e0b";
      hpValEl.style.color = "#f59e0b";
    } else {
      hpBarFill.style.background = "linear-gradient(90deg, #10b981, #34d399)";
      hpValEl.style.color = "#34d399";
    }
  }

  function damagePlayer(amount) {
    state.hp -= amount;
    updateHUD();
    AudioEngine.playExplosion();

    // Flash merah di viewport
    renderer.domElement.style.filter = "sepia(1) saturate(5) hue-rotate(-50deg)";
    setTimeout(() => (renderer.domElement.style.filter = "none"), 120);

    if (state.hp <= 0) {
      state.hp = 0;
      gameOver();
    }
  }

  function gameOver() {
    state.running = false;
    document.exitPointerLock?.();

    document.getElementById("final-score").textContent = state.score.toLocaleString("id-ID");
    document.getElementById("final-kills").textContent = state.kills;
    document.getElementById("final-wave").textContent = state.wave;

    document.getElementById("game-over-overlay").classList.add("active");
  }

  function startGame() {
    AudioEngine.init();
    state.running = true;
    state.score = 0;
    state.kills = 0;
    state.wave = 1;
    state.hp = 100;
    state.ammo = state.maxAmmo;
    state.isReloading = false;

    // Bersihkan drone lama
    state.drones.forEach((d) => scene.remove(d));
    state.drones = [];
    state.particles.forEach((p) => scene.remove(p.mesh));
    state.particles = [];

    camera.position.set(0, 1.7, 0);
    camera.rotation.set(0, 0, 0);

    document.getElementById("start-overlay").classList.remove("active");
    document.getElementById("game-over-overlay").classList.remove("active");

    updateHUD();
    startWave(1);
  }

  function startWave(waveNumber) {
    state.wave = waveNumber;
    state.dronesRemainingInWave = 4 + waveNumber * 2;
    updateHUD();

    let spawned = 0;
    const interval = setInterval(() => {
      if (!state.running) {
        clearInterval(interval);
        return;
      }
      createDrone();
      spawned++;
      if (spawned >= state.dronesRemainingInWave) {
        clearInterval(interval);
      }
    }, 1500);
  }

  // --- INPUT CONTROLS: DESKTOP ---
  const keys = { w: false, a: false, s: false, d: false };
  let isPointerLocked = false;
  let pitch = 0;
  let yaw = 0;

  window.addEventListener("keydown", (e) => {
    AudioEngine.init();
    if (e.key === "w" || e.key === "W" || e.key === "ArrowUp") keys.w = true;
    if (e.key === "a" || e.key === "A" || e.key === "ArrowLeft") keys.a = true;
    if (e.key === "s" || e.key === "S" || e.key === "ArrowDown") keys.s = true;
    if (e.key === "d" || e.key === "D" || e.key === "ArrowRight") keys.d = true;
    if (e.key === "r" || e.key === "R") reloadWeapon();
    if (e.key === " " && state.running) fireWeapon();
  });

  window.addEventListener("keyup", (e) => {
    if (e.key === "w" || e.key === "W" || e.key === "ArrowUp") keys.w = false;
    if (e.key === "a" || e.key === "A" || e.key === "ArrowLeft") keys.a = false;
    if (e.key === "s" || e.key === "S" || e.key === "ArrowDown") keys.s = false;
    if (e.key === "d" || e.key === "D" || e.key === "ArrowRight") keys.d = false;
  });

  container.addEventListener("click", () => {
    AudioEngine.init();
    if (state.running && !isPointerLocked && window.innerWidth > 768) {
      container.requestPointerLock?.();
    }
  });

  document.addEventListener("pointerlockchange", () => {
    isPointerLocked = document.pointerLockElement === container;
  });

  window.addEventListener("mousemove", (e) => {
    if (!state.running || !isPointerLocked) return;
    const sensitivity = 0.0022;
    yaw -= e.movementX * sensitivity;
    pitch -= e.movementY * sensitivity;
    pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, pitch));

    camera.rotation.order = "YXZ";
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;
  });

  window.addEventListener("mousedown", (e) => {
    AudioEngine.init();
    if (state.running && isPointerLocked && e.button === 0) {
      fireWeapon();
    }
  });

  // --- INPUT CONTROLS: MOBILE TOUCH ---
  let touchMoveData = { x: 0, y: 0 };
  const joystickZone = document.getElementById("joystick-zone");
  const joystickThumb = document.getElementById("joystick-thumb");
  let joystickTouchId = null;
  let joystickCenter = { x: 0, y: 0 };

  joystickZone.addEventListener("touchstart", (e) => {
    AudioEngine.init();
    e.preventDefault();
    const touch = e.changedTouches[0];
    joystickTouchId = touch.identifier;
    const rect = joystickZone.getBoundingClientRect();
    joystickCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }, { passive: false });

  joystickZone.addEventListener("touchmove", (e) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === joystickTouchId) {
        const dx = touch.clientX - joystickCenter.x;
        const dy = touch.clientY - joystickCenter.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = 45;

        const clampedDist = Math.min(dist, maxDist);
        const angle = Math.atan2(dy, dx);
        const tx = Math.cos(angle) * clampedDist;
        const ty = Math.sin(angle) * clampedDist;

        joystickThumb.style.transform = `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px))`;
        touchMoveData.x = tx / maxDist;
        touchMoveData.y = ty / maxDist;
      }
    }
  }, { passive: false });

  const resetJoystick = () => {
    joystickTouchId = null;
    touchMoveData = { x: 0, y: 0 };
    joystickThumb.style.transform = "translate(-50%, -50%)";
  };

  joystickZone.addEventListener("touchend", resetJoystick);
  joystickZone.addEventListener("touchcancel", resetJoystick);

  // Right Screen Touch Look
  const touchLookZone = document.getElementById("touch-look-zone");
  let lookTouchId = null;
  let lastTouchLookPos = { x: 0, y: 0 };

  touchLookZone.addEventListener("touchstart", (e) => {
    AudioEngine.init();
    e.preventDefault();
    const touch = e.changedTouches[0];
    lookTouchId = touch.identifier;
    lastTouchLookPos = { x: touch.clientX, y: touch.clientY };
  }, { passive: false });

  touchLookZone.addEventListener("touchmove", (e) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === lookTouchId) {
        const dx = touch.clientX - lastTouchLookPos.x;
        const dy = touch.clientY - lastTouchLookPos.y;
        lastTouchLookPos = { x: touch.clientX, y: touch.clientY };

        const touchSens = 0.005;
        yaw -= dx * touchSens;
        pitch -= dy * touchSens;
        pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, pitch));

        camera.rotation.order = "YXZ";
        camera.rotation.y = yaw;
        camera.rotation.x = pitch;
      }
    }
  }, { passive: false });

  touchLookZone.addEventListener("touchend", () => (lookTouchId = null));
  touchLookZone.addEventListener("touchcancel", () => (lookTouchId = null));

  // Mobile Buttons
  document.getElementById("btn-mobile-fire").addEventListener("touchstart", (e) => {
    e.preventDefault();
    AudioEngine.init();
    fireWeapon();
  }, { passive: false });

  document.getElementById("btn-mobile-reload").addEventListener("touchstart", (e) => {
    e.preventDefault();
    AudioEngine.init();
    reloadWeapon();
  }, { passive: false });

  // Buttons UI
  document.getElementById("btn-start-game").addEventListener("click", startGame);
  document.getElementById("btn-restart").addEventListener("click", startGame);

  document.getElementById("btn-open-lb").addEventListener("click", () => {
    if (window.ArcadeLeaderboard) {
      window.ArcadeLeaderboard.openModal({
        gameId: "51-fps-shooter",
        gameName: "Mahakam FPS Defender",
        score: state.score
      });
    }
  });

  document.getElementById("btn-submit-score").addEventListener("click", () => {
    if (window.ArcadeLeaderboard) {
      window.ArcadeLeaderboard.openModal({
        gameId: "51-fps-shooter",
        gameName: "Mahakam FPS Defender",
        score: state.score
      });
    }
  });

  // --- MAIN GAME LOOP ---
  function animate(timestamp) {
    requestAnimationFrame(animate);

    const delta = Math.min((timestamp - state.lastTime) / 1000, 0.1) || 0.016;
    state.lastTime = timestamp;

    if (state.running) {
      // Pergerakan Pemain
      const moveSpeed = 9 * delta;
      const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);

      // Keyboard WASD
      if (keys.w) camera.position.addScaledVector(forward, moveSpeed);
      if (keys.s) camera.position.addScaledVector(forward, -moveSpeed);
      if (keys.d) camera.position.addScaledVector(right, moveSpeed);
      if (keys.a) camera.position.addScaledVector(right, -moveSpeed);

      // Touch Virtual Joystick
      if (touchMoveData.y !== 0) camera.position.addScaledVector(forward, -touchMoveData.y * moveSpeed);
      if (touchMoveData.x !== 0) camera.position.addScaledVector(right, touchMoveData.x * moveSpeed);

      // Batasi pemain tetap di dalam platform arena (radius 26m)
      camera.position.x = Math.max(-26, Math.min(26, camera.position.x));
      camera.position.z = Math.max(-26, Math.min(26, camera.position.z));
      camera.position.y = 1.7;

      // Update Drones
      const playerPos = camera.position;
      for (let i = state.drones.length - 1; i >= 0; i--) {
        const drone = state.drones[i];
        if (drone.userData.rotor) {
          drone.userData.rotor.rotation.y += 18 * delta;
        }

        // Bobbing hover effect
        drone.position.y += Math.sin(timestamp * 0.003 + drone.userData.bobOffset) * 0.015;

        // Gerak menuju pemain
        const dir = new THREE.Vector3().subVectors(playerPos, drone.position).normalize();
        drone.position.addScaledVector(dir, drone.userData.speed * delta);
        drone.lookAt(playerPos.x, drone.position.y, playerPos.z);

        // Jika drone menyentuh pemain
        const dist = drone.position.distanceTo(playerPos);
        if (dist < 1.8) {
          damagePlayer(15);
          spawnExplosion(drone.position);
          scene.remove(drone);
          state.drones.splice(i, 1);
        }
      }

      // Jika semua drone gelombang ini habis, lanjut ke gelombang berikutnya
      if (state.drones.length === 0 && state.dronesRemainingInWave > 0) {
        startWave(state.wave + 1);
      }

      // Update Partikel Ledakan
      for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        p.mesh.position.addScaledVector(p.vel, delta);
        p.life -= delta;
        p.mesh.scale.multiplyScalar(0.95);
        if (p.life <= 0) {
          scene.remove(p.mesh);
          state.particles.splice(i, 1);
        }
      }
    }

    renderer.render(scene, camera);
  }

  // --- WINDOW RESIZE ---
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  requestAnimationFrame((ts) => {
    state.lastTime = ts;
    animate(ts);
  });
})();
