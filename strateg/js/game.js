(() => {
  "use strict";
  if (globalThis.__STRATEG_STARTED) return;
  globalThis.__STRATEG_STARTED = true;

  const TILE = 16;
  const MAP_W = 96;
  const MAP_H = 96;
  const HALL_W = 5;
  const HALL_H = 4;
  const WORKER_COST = 50;
  const WORKER_TIME = 5;
  const WORKER_CAP = 50;
  const POP_HALL = 6;
  const POP_HOUSE = 5;
  const START_GOLD = 280;
  const START_WOOD = 140;
  const HARVEST_TIME = 1.2;
  const WOOD_PAY = 8;
  const GOLD_PAY = 10;
  const SPEED = 52;
  const UNIT_R = 6;
  const CELL = 24;
  const UNIT_SPEC = {
    worker: { gold: 50, wood: 0, time: 5, speed: 52, name: "Рабочий", sheet: "worker", hp: 30, dmg: 4, range: 16, cd: 1.15, sight: 6 },
    militia: { gold: 40, wood: 25, time: 7, speed: 46, name: "Ополченец", sheet: "militia", hp: 62, dmg: 9, range: 18, cd: 0.95, sight: 7 },
    archer: { gold: 45, wood: 35, time: 8, speed: 48, name: "Лучник", sheet: "archer", hp: 42, dmg: 8, range: 88, cd: 1.22, sight: 9 },
    rider: { gold: 80, wood: 40, time: 10, speed: 70, name: "Всадник", sheet: "rider", hp: 95, dmg: 13, range: 20, cd: 1.05, sight: 8 },
    grunt: { gold: 0, wood: 0, time: 8, speed: 44, name: "Орк", sheet: "grunt", hp: 58, dmg: 9, range: 18, cd: 1.0, sight: 6 },
    peon: { gold: 0, wood: 0, time: 5, speed: 50, name: "Батрак", sheet: "peon", hp: 28, dmg: 3, range: 16, cd: 1.2, sight: 6 },
  };
  const BAR_W = 5;
  const BAR_H = 3;
  const BAR_GOLD = 100;
  const BAR_WOOD = 50;
  const BAR_TIME = 12;
  const BAR_MAX = 4;
  const HOUSE_MAX = 10;
  const MINE_W = 3;
  const MINE_H = 3;
  const BUILD_SPEC = {
    house: {
      gold: 30,
      wood: 50,
      tw: 2,
      th: 2,
      time: 8,
      max: 10,
      name: "Хижина",
      img: "house",
    },
    barracks: {
      gold: 100,
      wood: 50,
      tw: 5,
      th: 3,
      time: 12,
      max: 4,
      name: "Казармы",
      img: "barracks",
    },
    tower: {
      gold: 70,
      wood: 80,
      tw: 2,
      th: 2,
      time: 10,
      max: 6,
      name: "Башня",
      img: "tower",
    },
  };
  const LIFT_STEP = 8;
  const LIFT_LEVELS = 4;
  const TERRAIN_PAD = LIFT_STEP * LIFT_LEVELS;

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const mini = document.getElementById("minimap");
  const mctx = mini.getContext("2d");

  const ui = {
    gold: document.getElementById("gold"),
    wood: document.getElementById("wood"),
    pop: document.getElementById("pop"),
    title: document.getElementById("info-title"),
    sub: document.getElementById("info-sub"),
    portrait: document.getElementById("portrait"),
    queue: document.getElementById("queue"),
    btn: document.getElementById("btn-worker"),
    btnMilitia: document.getElementById("btn-militia"),
    btnArcher: document.getElementById("btn-archer"),
    btnBarracks: document.getElementById("btn-barracks"),
    btnHouse: document.getElementById("btn-house"),
    btnTower: document.getElementById("btn-tower"),
    btnRider: document.getElementById("btn-rider"),
    wrapWorker: document.getElementById("wrap-worker"),
    wrapHouse: document.getElementById("wrap-house"),
    wrapBarracks: document.getElementById("wrap-barracks"),
    wrapTower: document.getElementById("wrap-tower"),
    wrapMilitia: document.getElementById("wrap-militia"),
    wrapArcher: document.getElementById("wrap-archer"),
    wrapRider: document.getElementById("wrap-rider"),
    toasts: document.getElementById("toasts"),
    boot: document.getElementById("boot"),
    bootMsg: document.getElementById("boot-msg"),
    seed: document.getElementById("seed-label"),
  };

  const imgs = {};
  const keys = Object.create(null);
  const mouse = { x: 0, y: 0, wx: 0, wy: 0, left: false, overHud: false };

  let zoom = 3;
  let cam = { x: 0, y: 0 };
  let gold = START_GOLD;
  let wood = START_WOOD;
  let height, elev, blocked, yard, terrain, miniTerrain;
  let hall, enemyHall, units, props, nodes, selected, rally, buildings;
  let placeMode = null;
  let box = null;
  let panning = false;
  let pan0 = null;
  let pings = [];
  let shots = [];
  let lastT = 0;
  let hover = null;
  let audioCtx = null;
  let trainedOnce = false;
  let gameOver = null;
  let raidT = 0;
  let enemyGold = 80;
  let fog, seen;
  const seed = (Math.random() * 1e9) | 0;

  function loadImg(src) {
    return new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => reject(new Error(src));
      im.src = src;
    });
  }

  function loadImgOpt(src) {
    return new Promise((resolve) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => resolve(null);
      im.src = src;
    });
  }

  function fillCanvas(w, h, fn) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    fn(c.getContext("2d"));
    return c;
  }

  function ensureGatherSprites() {
    if (!imgs.tree0) {
      imgs.tree0 = fillCanvas(20, 36, (g) => {
        g.fillStyle = "#4a2e16";
        g.fillRect(8, 20, 4, 16);
        g.fillStyle = "#245820";
        g.beginPath();
        g.ellipse(10, 14, 9, 12, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = "#3d7a34";
        g.beginPath();
        g.ellipse(8, 11, 5, 6, 0, 0, Math.PI * 2);
        g.fill();
      });
    }
    if (!imgs.tree1) {
      imgs.tree1 = fillCanvas(18, 38, (g) => {
        g.fillStyle = "#4a2e16";
        g.fillRect(7, 26, 4, 12);
        g.fillStyle = "#1e4a28";
        g.beginPath();
        g.moveTo(9, 1);
        g.lineTo(1, 16);
        g.lineTo(17, 16);
        g.closePath();
        g.fill();
        g.fillStyle = "#2a6a34";
        g.beginPath();
        g.moveTo(9, 8);
        g.lineTo(0, 24);
        g.lineTo(18, 24);
        g.closePath();
        g.fill();
        g.fillStyle = "#327838";
        g.beginPath();
        g.moveTo(9, 16);
        g.lineTo(2, 30);
        g.lineTo(16, 30);
        g.closePath();
        g.fill();
      });
    }
    if (!imgs.treeStump) {
      imgs.treeStump = fillCanvas(12, 10, (g) => {
        g.fillStyle = "#5a3a20";
        g.fillRect(3, 4, 6, 6);
        g.fillStyle = "#8a6238";
        g.fillRect(3, 3, 6, 3);
      });
    }
    if (!imgs.goldNode) {
      imgs.goldNode = fillCanvas(20, 16, (g) => {
        g.fillStyle = "#6a4a28";
        g.beginPath();
        g.ellipse(10, 12, 8, 4, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = "#e4c45c";
        g.fillRect(4, 6, 6, 5);
        g.fillRect(9, 4, 7, 6);
        g.fillRect(7, 8, 5, 5);
        g.fillStyle = "#f8e090";
        g.fillRect(5, 6, 2, 2);
        g.fillRect(11, 5, 2, 2);
      });
    }
  }

  function hash(x, y) {
    let n = (x | 0) * 374761393 + (y | 0) * 668265263 + seed;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return (n >>> 0) / 4294967296;
  }

  function noise2(x, y) {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi);
    const b = hash(xi + 1, yi);
    const c = hash(xi, yi + 1);
    const d = hash(xi + 1, yi + 1);
    return a + (b - a) * u + (c + (d - c) * u - (a + (b - a) * u)) * v;
  }

  function fbm(x, y) {
    let v = 0;
    let a = 0.5;
    let f = 1;
    for (let i = 0; i < 5; i++) {
      v += a * noise2(x * f, y * f);
      a *= 0.5;
      f *= 2.03;
    }
    return v;
  }

  function clamp(v, a, b) {
    return v < a ? a : v > b ? b : v;
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function toast(text, bad) {
    const el = document.createElement("div");
    el.className = "toast" + (bad ? " bad" : "");
    el.textContent = text;
    ui.toasts.appendChild(el);
    setTimeout(() => el.remove(), 2200);
  }

  function beep(freq, dur, type) {
    try {
      if (!audioCtx) return;
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = type || "square";
      o.frequency.value = freq;
      g.gain.value = 0.035;
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
      o.connect(g);
      g.connect(audioCtx.destination);
      o.start();
      o.stop(audioCtx.currentTime + dur);
    } catch (_) {}
  }

  function ensureAudio() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
  }

  function bldgFoot(b) {
    return {
      x: b.tx * TILE,
      y: b.ty * TILE,
      w: (b.tw || HALL_W) * TILE,
      h: (b.th || HALL_H) * TILE,
    };
  }

  function bldgImg(b) {
    if (b.kind === "barracks") return imgs.barracks;
    if (b.kind === "house") return imgs.house;
    if (b.kind === "tower") return imgs.tower;
    if (b.kind === "orc_hall") return imgs.orcHall;
    if (b.kind === "orc_barracks") return imgs.orcBarracks;
    return imgs.hall;
  }

  function bldgSpriteRect(b) {
    const f = bldgFoot(b);
    const im = bldgImg(b);
    const sw = im && im.width ? im.width : f.w;
    const sh = im && im.height ? im.height : f.h;
    return {
      x: f.x + f.w / 2 - sw / 2,
      y: f.y + f.h - sh,
      w: sw,
      h: sh,
    };
  }

  function bldgDoor(b) {
    const f = bldgFoot(b);
    return { x: f.x + f.w / 2, y: f.y + f.h + 6 };
  }

  function hallFoot() {
    return bldgFoot(hall);
  }

  function hallSpriteRect() {
    return bldgSpriteRect(hall);
  }

  function doorPos() {
    return bldgDoor(hall);
  }

  function popCap() {
    let cap = POP_HALL;
    for (const b of buildings) {
      if (b.kind === "house" && b.done && (b.team || 0) === 0) cap += POP_HOUSE;
    }
    return Math.min(WORKER_CAP, cap);
  }

  function playerCount() {
    return units.filter((u) => (u.team || 0) === 0).length;
  }

  function isPlayerUnit(s) {
    return isUnit(s) && (s.team || 0) === 0;
  }

  function bldgHpFor(kind) {
    if (kind === "house") return 90;
    if (kind === "barracks" || kind === "orc_barracks") return 240;
    if (kind === "tower") return 200;
    return 450;
  }

  function bldgSight(b) {
    if (b.kind === "tower") return 13;
    if (b.kind === "hall") return 10;
    if (b.kind === "barracks") return 7;
    if (b.kind === "house") return 5;
    return 6;
  }

  function armBldg(b, team) {
    const hp = bldgHpFor(b.kind);
    b.hp = hp;
    b.maxHp = hp;
    b.team = team || 0;
    return b;
  }

  function isUnit(s) {
    return !!(s && UNIT_SPEC[s.kind]);
  }

  function queuedCount() {
    let n = 0;
    for (const b of buildings) {
      if ((b.team || 0) !== 0) continue;
      n += (b.queue || []).length;
    }
    return n;
  }

  function readyBarracks() {
    const sel = selected && selected.find((s) => s.kind === "barracks" && s.done);
    if (sel) return sel;
    return buildings.find((b) => b.kind === "barracks" && b.done) || null;
  }

  function occupyBldg(b, on) {
    for (let y = 0; y < b.th; y++) {
      for (let x = 0; x < b.tw; x++) {
        const tx = b.tx + x;
        const ty = b.ty + y;
        if (ty >= 0 && ty < MAP_H && tx >= 0 && tx < MAP_W) blocked[ty][tx] = on;
      }
    }
  }

  function canPlaceAt(tx, ty, tw, th) {
    if (tx < 2 || ty < 2 || tx + tw >= MAP_W - 2 || ty + th >= MAP_H - 3) return false;
    let e0 = -1;
    for (let y = 0; y < th; y++) {
      for (let x = 0; x < tw; x++) {
        if (isBlocked(tx + x, ty + y)) return false;
        const e = elev[ty + y][tx + x];
        if (e0 < 0) e0 = e;
        if (Math.abs(e - e0) > 1) return false;
      }
    }
    for (const p of props) {
      const px = (p.x / TILE) | 0;
      const py = (p.y / TILE) | 0;
      if (px >= tx && px < tx + tw && py >= ty && py < ty + th) return false;
    }
    return true;
  }

  function assignBuilders(b) {
    const d = bldgDoor(b);
    selected.filter((s) => s.kind === "worker").forEach((u) => {
      u.job = { type: "build", building: b, phase: "go" };
      orderMove(u, d.x, d.y + 8);
    });
  }

  function tryPlaceBuilding(kind, wx, wy) {
    const spec = BUILD_SPEC[kind];
    if (!spec) return;
    if (buildings.filter((b) => b.kind === kind).length >= spec.max) {
      toast("Лимит: " + spec.name, true);
      return;
    }
    if (gold < spec.gold || wood < spec.wood) {
      toast("Недостаточно ресурсов", true);
      beep(90, 0.12, "sawtooth");
      return;
    }
    const tx = clamp((wx / TILE) | 0, 0, MAP_W - spec.tw);
    const ty = clamp((wy / TILE) | 0, 0, MAP_H - spec.th);
    if (!canPlaceAt(tx, ty, spec.tw, spec.th)) {
      toast("Здесь не построить", true);
      return;
    }
    gold -= spec.gold;
    wood -= spec.wood;
    const b = {
      kind,
      tx,
      ty,
      tw: spec.tw,
      th: spec.th,
      queue: [],
      done: false,
      progress: 0,
      buildTime: spec.time,
    };
    b.x = b.tx * TILE + (spec.tw * TILE) / 2;
    b.y = b.ty * TILE + spec.th * TILE;
    if (kind === "barracks") {
      const d = bldgDoor(b);
      b.rally = { x: d.x, y: d.y + 28 };
    }
    occupyBldg(b, true);
    armBldg(b, 0);
    buildings.push(b);
    const workers = selected.filter((s) => s.kind === "worker");
    assignBuilders(b);
    placeMode = null;
    canvas.style.cursor = "crosshair";
    selected = [b];
    toast(workers.length ? "Строим: " + spec.name : spec.name + " заложены — пришлите рабочих");
    beep(320, 0.06);
    syncUi();
  }

  function enterPlace(kind) {
    const spec = BUILD_SPEC[kind];
    if (!spec) return;
    const workers = selected.filter((s) => s.kind === "worker");
    if (!workers.length && !selected.includes(hall)) {
      toast("Выберите рабочих", true);
      return;
    }
    if (gold < spec.gold || wood < spec.wood) {
      toast("Нужно " + spec.gold + " золота и " + spec.wood + " дерева", true);
      beep(90, 0.12, "sawtooth");
      return;
    }
    if (buildings.filter((b) => b.kind === kind).length >= spec.max) {
      toast("Лимит: " + spec.name, true);
      return;
    }
    placeMode = kind;
    toast("ЛКМ — " + spec.name + " · ПКМ — отмена");
    syncUi();
  }

  function tryPlaceBarracks(wx, wy) {
    tryPlaceBuilding("barracks", wx, wy);
  }

  function enterPlaceBarracks() {
    enterPlace("barracks");
  }

  function visLift(wx, wy) {
    const tx = clamp((wx / TILE) | 0, 0, MAP_W - 1);
    const ty = clamp((wy / TILE) | 0, 0, MAP_H - 1);
    return (elev[ty][tx] || 0) * LIFT_STEP;
  }

  function inHud(clientY) {
    return clientY < 40 || clientY > window.innerHeight - 126;
  }

  function screenToWorld(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    const sx = ((clientX - r.left) / r.width) * canvas.width;
    const sy = ((clientY - r.top) / r.height) * canvas.height;
    return { x: cam.x + sx, y: cam.y + sy, sx, sy };
  }

  function resize() {
    const z = zoom;
    canvas.width = Math.max(1, Math.floor(window.innerWidth / z));
    canvas.height = Math.max(1, Math.floor(window.innerHeight / z));
    ctx.imageSmoothingEnabled = false;
    clampCam();
  }

  function clampCam() {
    const maxX = MAP_W * TILE - canvas.width;
    const maxY = MAP_H * TILE - canvas.height;
    cam.x = clamp(cam.x, 0, Math.max(0, maxX));
    cam.y = clamp(cam.y, 0, Math.max(0, maxY));
  }

  function centerOn(x, y) {
    cam.x = x - canvas.width / 2;
    cam.y = y - canvas.height / 2;
    clampCam();
  }

  function generateWorld() {
    height = [];
    elev = [];
    blocked = [];
    yard = [];
    for (let y = 0; y < MAP_H; y++) {
      height[y] = [];
      elev[y] = [];
      blocked[y] = [];
      yard[y] = [];
      for (let x = 0; x < MAP_W; x++) {
        let n = fbm(x * 0.045, y * 0.045);
        n = 0.32 + (n - 0.5) * 0.38;
        height[y][x] = n;
        blocked[y][x] = false;
        yard[y][x] = false;
      }
    }

    function stampBump(cx, cy, radius, amount) {
      for (let y = 0; y < MAP_H; y++) {
        for (let x = 0; x < MAP_W; x++) {
          const d = Math.hypot(x - cx, y - cy) / radius;
          if (d >= 1) continue;
          const w = (1 - d) * (1 - d * d);
          height[y][x] += amount * w;
        }
      }
    }

    const hills = [
      [48, 18, 12, 0.72],
      [78, 34, 14, 0.85],
      [22, 62, 12, 0.7],
      [70, 82, 11, 0.64],
      [10, 38, 9, 0.55],
      [52, 50, 9, 0.4],
      [88, 14, 8, 0.5],
      [40, 88, 10, 0.6],
    ];
    for (const [cx, cy, r, a] of hills) stampBump(cx, cy, r, a);
    stampBump(28 + hash(3, 7) * 6, 22, 9, -0.38);
    stampBump(62, 8 + hash(4, 1) * 5, 7, -0.28);
    stampBump(12, 58, 8, -0.22);

    hall = {
      kind: "hall",
      tx: 16,
      ty: 16,
      tw: HALL_W,
      th: HALL_H,
      queue: [],
      done: true,
    };
    hall.x = hall.tx * TILE + (HALL_W * TILE) / 2;
    hall.y = hall.ty * TILE + HALL_H * TILE;
    armBldg(hall, 0);
    buildings = [hall];

    const cx = hall.tx + HALL_W / 2;
    const cy = hall.ty + HALL_H / 2;
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const d = Math.hypot(x - cx, y - cy);
        if (d < 7) {
          const t = (1 - d / 7) ** 1.2;
          height[y][x] = lerp(height[y][x], 0.28, t);
        }
        height[y][x] = clamp(height[y][x], 0, 1);
        elev[y][x] = clamp(Math.round(height[y][x] * LIFT_LEVELS), 0, LIFT_LEVELS);
        height[y][x] = elev[y][x] / LIFT_LEVELS;
      }
    }
    for (let y = hall.ty - 2; y < hall.ty + HALL_H + 10; y++) {
      for (let x = hall.tx - 2; x < hall.tx + HALL_W + 9; x++) {
        if (y < 0 || x < 0 || y >= MAP_H || x >= MAP_W) continue;
        elev[y][x] = 1;
        height[y][x] = 1 / LIFT_LEVELS;
      }
    }

    for (let y = 0; y < HALL_H; y++) {
      for (let x = 0; x < HALL_W; x++) {
        blocked[hall.ty + y][hall.tx + x] = true;
      }
    }

    for (let y = hall.ty + HALL_H; y < hall.ty + HALL_H + 6; y++) {
      for (let x = hall.tx - 1; x < hall.tx + HALL_W + 7; x++) {
        if (y >= 0 && y < MAP_H && x >= 0 && x < MAP_W) yard[y][x] = true;
      }
    }

    enemyHall = {
      kind: "orc_hall",
      tx: 74,
      ty: 70,
      tw: HALL_W,
      th: HALL_H,
      queue: [],
      done: true,
    };
    enemyHall.x = enemyHall.tx * TILE + (HALL_W * TILE) / 2;
    enemyHall.y = enemyHall.ty * TILE + HALL_H * TILE;
    armBldg(enemyHall, 1);
    occupyBldg(enemyHall, true);
    buildings.push(enemyHall);
    const ed = bldgDoor(enemyHall);
    enemyHall.rally = { x: ed.x, y: ed.y + 28 };
    for (let y = enemyHall.ty - 2; y < enemyHall.ty + HALL_H + 8; y++) {
      for (let x = enemyHall.tx - 2; x < enemyHall.tx + HALL_W + 6; x++) {
        if (y < 0 || x < 0 || y >= MAP_H || x >= MAP_W) continue;
        elev[y][x] = 1;
        height[y][x] = 1 / LIFT_LEVELS;
      }
    }

    const orcBar = {
      kind: "orc_barracks",
      tx: enemyHall.tx,
      ty: enemyHall.ty + HALL_H + 2,
      tw: 5,
      th: 3,
      queue: [],
      done: true,
    };
    orcBar.x = orcBar.tx * TILE + (5 * TILE) / 2;
    orcBar.y = orcBar.ty * TILE + 3 * TILE;
    armBldg(orcBar, 1);
    occupyBldg(orcBar, true);
    const obd = bldgDoor(orcBar);
    orcBar.rally = { x: obd.x, y: obd.y + 24 };
    buildings.push(orcBar);

    const d0 = doorPos();
    rally = { x: d0.x, y: d0.y + 36 };

    props = [];
    nodes = [];
    placeProps();
    placeNodes();
    initFog();
    prerenderTerrain();
  }

  function inBasePad(tx, ty) {
    return (
      tx >= hall.tx - 1 &&
      tx < hall.tx + HALL_W + 8 &&
      ty >= hall.ty - 1 &&
      ty < hall.ty + HALL_H + 9
    );
  }

  function nearHall(tx, ty) {
    return inBasePad(tx, ty);
  }

  function localMax(x, y) {
    const h = height[y][x];
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        const nx = x + ox;
        const ny = y + oy;
        if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue;
        if (height[ny][nx] > h) return false;
      }
    }
    return true;
  }

  function placeProps() {
    for (let y = 2; y < MAP_H - 2; y++) {
      for (let x = 2; x < MAP_W - 2; x++) {
        if (nearHall(x, y)) continue;
        const h = height[y][x];
        const e = elev[y][x];
        const r = hash(x + 3, y + 9);
        if (e >= 3 && localMax(x, y) && r > 0.35) {
          props.push({
            kind: "prop",
            img: imgs.hillock,
            x: x * TILE + 8,
            y: y * TILE + 12,
          });
        } else if (e >= 2 && r > 0.96) {
          const i = (hash(x, y + 4) * 3) | 0;
          props.push({
            kind: "prop",
            img: imgs["rock" + i],
            x: x * TILE + 8,
            y: y * TILE + 10,
          });
        } else if (e <= 1 && h < 0.35 && r > 0.93 && r <= 0.975) {
          const i = hash(x + 1, y) > 0.5 ? 1 : 0;
          props.push({
            kind: "prop",
            img: imgs["bush" + i],
            x: x * TILE + 8,
            y: y * TILE + 10,
          });
        }
      }
    }
  }

  function tileFree(tx, ty) {
    if (tx < 2 || ty < 2 || tx >= MAP_W - 2 || ty >= MAP_H - 2) return false;
    if (nearHall(tx, ty)) return false;
    if (enemyHall &&
      tx >= enemyHall.tx - 1 &&
      tx < enemyHall.tx + HALL_W + 2 &&
      ty >= enemyHall.ty - 1 &&
      ty < enemyHall.ty + HALL_H + 4
    )
      return false;
    if (yard[ty][tx]) return false;
    if (blocked[ty][tx]) return false;
    for (const p of props) {
      if (((p.x / TILE) | 0) === tx && ((p.y / TILE) | 0) === ty) return false;
    }
    return true;
  }

  function blockedAround(tx, ty) {
    let n = 0;
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        if (!ox && !oy) continue;
        if (isBlocked(tx + ox, ty + oy)) n++;
      }
    }
    return n;
  }

  function occupyNode(tx, ty, kind, hp, img, tw, th) {
    tw = tw || 1;
    th = th || 1;
    for (let y = 0; y < th; y++) {
      for (let x = 0; x < tw; x++) {
        const nx = tx + x;
        const ny = ty + y;
        if (ny >= 0 && ny < MAP_H && nx >= 0 && nx < MAP_W) blocked[ny][nx] = true;
      }
    }
    const n = {
      kind,
      tx,
      ty,
      tw,
      th,
      x: tx * TILE + (tw * TILE) / 2,
      y: ty * TILE + th * TILE - 1,
      hp,
      img,
    };
    nodes.push(n);
    return n;
  }

  function scatterTiles(cx, cy, radius, max, ok) {
    const out = [];
    if (ok(cx, cy)) out.push([cx, cy]);
    let i = 0;
    while (out.length < max && i++ < max * 14) {
      const ang = hash(cx + i * 3, cy + 11) * Math.PI * 2;
      const rad = Math.sqrt(hash(i + 5, cy + 19)) * radius;
      const tx = (cx + Math.cos(ang) * rad + 0.5) | 0;
      const ty = (cy + Math.sin(ang) * rad + 0.5) | 0;
      if (out.some(([x, y]) => x === tx && y === ty)) continue;
      if (ok(tx, ty)) out.push([tx, ty]);
    }
    return out;
  }

  function placeGoldMine(gx, gy, hp) {
    for (let r = 0; r < 14; r++) {
      for (let oy = -r; oy <= r; oy++) {
        for (let ox = -r; ox <= r; ox++) {
          const tx = gx + ox;
          const ty = gy + oy;
          if (tx < 3 || ty < 3 || tx + MINE_W >= MAP_W - 3 || ty + MINE_H >= MAP_H - 3) continue;
          let ok = true;
          for (let y = 0; y < MINE_H && ok; y++) {
            for (let x = 0; x < MINE_W && ok; x++) {
              if (inBasePad(tx + x, ty + y) || blocked[ty + y][tx + x]) ok = false;
            }
          }
          if (!ok) continue;
          for (let y = 0; y < MINE_H; y++) {
            for (let x = 0; x < MINE_W; x++) {
              elev[ty + y][tx + x] = 1;
              height[ty + y][tx + x] = 1 / LIFT_LEVELS;
            }
          }
          occupyNode(tx, ty, "gold", hp, imgs.goldMine || imgs.goldNode, MINE_W, MINE_H);
          return true;
        }
      }
    }
    return false;
  }

  function placeNodes() {
    placeGoldMine(hall.tx + HALL_W + 9, hall.ty + 2, 90);
    placeGoldMine(hall.tx + 28, hall.ty + 22, 110);
    placeGoldMine(48, 48, 120);
    placeGoldMine(12, 70, 100);
    placeGoldMine(enemyHall.tx - 9, enemyHall.ty + 1, 90);
    placeGoldMine(enemyHall.tx - 6, enemyHall.ty + 16, 100);
    placeGoldMine(84, 22, 90);

    const groves = [
      { tx: hall.tx + 2, ty: hall.ty + HALL_H + 11, n: 16, r: 3.6 },
      { tx: hall.tx - 6, ty: hall.ty + 5, n: 10, r: 2.8 },
      { tx: 42, ty: 14, n: 16, r: 4.2 },
      { tx: 70, ty: 28, n: 14, r: 3.8 },
      { tx: 10, ty: 44, n: 15, r: 4 },
      { tx: 30, ty: 72, n: 18, r: 4.5 },
      { tx: 58, ty: 58, n: 16, r: 4 },
      { tx: 86, ty: 80, n: 12, r: 3.4 },
      { tx: 50, ty: 36, n: 11, r: 3.2 },
      { tx: 78, ty: 50, n: 14, r: 3.6 },
      { tx: enemyHall.tx + 6, ty: enemyHall.ty + HALL_H + 8, n: 14, r: 3.4 },
    ];
    for (const g of groves) {
      const spots = scatterTiles(g.tx, g.ty, g.r, g.n, (tx, ty) => {
        if (!tileFree(tx, ty)) return false;
        if (elev[ty][tx] >= 4) return false;
        if (blockedAround(tx, ty) >= 5) return false;
        for (const n of nodes) {
          if (n.kind === "gold") {
            const tw = n.tw || 1;
            const th = n.th || 1;
            if (tx >= n.tx - 1 && tx < n.tx + tw + 1 && ty >= n.ty - 1 && ty < n.ty + th + 1) return false;
          }
        }
        return true;
      });
      for (const [tx, ty] of spots) {
        const variant = hash(tx, ty + 2) > 0.55 ? 1 : 0;
        const hp = 3 + ((hash(tx + 2, ty + 8) * 3) | 0);
        occupyNode(tx, ty, "tree", hp, variant ? imgs.tree1 : imgs.tree0);
      }
    }
  }

  function nodeLive(n) {
    return n && n.hp > 0 && (n.kind === "tree" || n.kind === "gold");
  }

  function visAt(wx, wy) {
    const tx = clamp((wx / TILE) | 0, 0, MAP_W - 1);
    const ty = clamp((wy / TILE) | 0, 0, MAP_H - 1);
    return fog && fog[ty] ? fog[ty][tx] : 2;
  }

  function revealDisk(wx, wy, rTiles) {
    const cx = (wx / TILE) | 0;
    const cy = (wy / TILE) | 0;
    const r2 = rTiles * rTiles;
    for (let ty = cy - rTiles; ty <= cy + rTiles; ty++) {
      if (ty < 0 || ty >= MAP_H) continue;
      for (let tx = cx - rTiles; tx <= cx + rTiles; tx++) {
        if (tx < 0 || tx >= MAP_W) continue;
        const dx = tx - cx;
        const dy = ty - cy;
        if (dx * dx + dy * dy <= r2) {
          fog[ty][tx] = 2;
          seen[ty][tx] = 1;
        }
      }
    }
  }

  function initFog() {
    fog = [];
    seen = [];
    for (let y = 0; y < MAP_H; y++) {
      fog[y] = [];
      seen[y] = [];
      for (let x = 0; x < MAP_W; x++) {
        fog[y][x] = 0;
        seen[y][x] = 0;
      }
    }
    updateFog();
  }

  function updateFog() {
    if (!fog) return;
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) fog[y][x] = seen[y][x] ? 1 : 0;
    }
    for (const u of units) {
      if ((u.team || 0) !== 0) continue;
      const spec = UNIT_SPEC[u.kind];
      revealDisk(u.x, u.y, (spec && spec.sight) || 6);
    }
    for (const b of buildings) {
      if ((b.team || 0) !== 0 || !b.done) continue;
      revealDisk(b.x, b.y, bldgSight(b));
    }
  }

  function nodeSpriteSize(n) {
    const im = n.img;
    if (im && im.width) return { w: im.width, h: im.height };
    if (n.kind === "gold") return { w: 20, h: 16 };
    if (n.kind === "stump") return { w: 12, h: 8 };
    return { w: 20, h: 36 };
  }

  function nodeRect(n) {
    const s = nodeSpriteSize(n);
    return { x: n.x - s.w / 2, y: n.y - s.h, w: s.w, h: s.h };
  }

  function pickNodeAt(wx, wy) {
    let hit = null;
    for (const n of nodes) {
      if (!nodeLive(n)) continue;
      const r = nodeRect(n);
      if (wx >= r.x && wx <= r.x + r.w && wy >= r.y && wy <= n.y + 3) {
        if (!hit || n.y >= hit.y) hit = n;
      }
    }
    return hit;
  }

  function spotsAround(node) {
    const tw = node.tw || 1;
    const th = node.th || 1;
    const spots = [];
    for (let ty = node.ty - 1; ty <= node.ty + th; ty++) {
      for (let tx = node.tx - 1; tx <= node.tx + tw; tx++) {
        const onEdge = tx === node.tx - 1 || tx === node.tx + tw || ty === node.ty - 1 || ty === node.ty + th;
        if (!onEdge) continue;
        if (!isBlocked(tx, ty)) {
          spots.push({ tx, ty, x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 });
        }
      }
    }
    return spots;
  }

  function pathToNode(u, node, slot) {
    const spots = spotsAround(node);
    if (!spots.length) {
      orderMove(u, node.x, node.y + TILE);
      return;
    }
    let best = spots[(slot || 0) % spots.length];
    let bestScore = Infinity;
    for (let i = 0; i < spots.length; i++) {
      const s = spots[(i + (slot || 0)) % spots.length];
      let used = 0;
      for (const o of units) {
        if (o === u || !o.job || o.job.node !== node || !o.path.length) continue;
        const last = o.path[o.path.length - 1];
        if (Math.hypot(last.x - s.x, last.y - s.y) < 5) used++;
      }
      const score = Math.hypot(s.x - u.x, s.y - u.y) + used * 18;
      if (score < bestScore) {
        bestScore = score;
        best = s;
      }
    }
    orderMove(u, best.x, best.y);
  }

  function homeHall(u) {
    return (u.team || 0) === 1 ? enemyHall : hall;
  }

  function pathToHall(u) {
    const h = homeHall(u);
    if (!h) return;
    const d = bldgDoor(h);
    orderMove(u, d.x, d.y);
  }

  function nearNode(u, node) {
    const tw = node.tw || 1;
    const th = node.th || 1;
    const utx = clamp((u.x / TILE) | 0, 0, MAP_W - 1);
    const uty = clamp((u.y / TILE) | 0, 0, MAP_H - 1);
    if (utx >= node.tx - 1 && utx <= node.tx + tw && uty >= node.ty - 1 && uty <= node.ty + th) return true;
    return Math.hypot(u.x - node.x, u.y - node.y) < TILE * Math.max(tw, th) + 8;
  }

  function nearHallDoor(u) {
    const h = homeHall(u);
    if (!h) return false;
    const d = bldgDoor(h);
    if (Math.hypot(u.x - d.x, u.y - d.y) < 16) return true;
    const f = bldgFoot(h);
    return (
      u.y >= f.y + f.h - 4 &&
      u.y <= f.y + f.h + 22 &&
      u.x >= f.x - 6 &&
      u.x <= f.x + f.w + 6
    );
  }

  function depleteNode(n) {
    n.hp = 0;
    const tw = n.tw || 1;
    const th = n.th || 1;
    for (let y = 0; y < th; y++) {
      for (let x = 0; x < tw; x++) {
        const tx = n.tx + x;
        const ty = n.ty + y;
        if (ty >= 0 && ty < MAP_H && tx >= 0 && tx < MAP_W) blocked[ty][tx] = false;
      }
    }
    if (n.kind === "tree") {
      n.kind = "stump";
      n.img = imgs.treeStump;
    } else if (n.kind === "gold") {
      n.kind = "empty";
      toast("Шахта иссякла");
    }
  }

  function harvesting(u) {
    return (
      (u.job && u.job.type === "gather" && u.job.phase === "harvest") ||
      (u.job && u.job.type === "build" && u.job.phase === "work")
    );
  }

  function updateGatherJob(u, dt) {
    const job = u.job;
    if (!job || job.type !== "gather") return;
    if (job.phase === "toNode") {
      if (!nodeLive(job.node)) {
        if (job.carry || u.carry) {
          job.phase = "toHall";
          pathToHall(u);
        } else {
          u.job = null;
        }
        return;
      }
      if (nearNode(u, job.node)) {
        u.path = [];
        u.moving = false;
        u.dir = dirFrom(job.node.x - u.x, job.node.y - u.y);
        job.phase = "harvest";
        job.t = 0;
        return;
      }
      if (!u.path.length) pathToNode(u, job.node, 0);
      return;
    }
    if (job.phase === "harvest") {
      u.path = [];
      u.moving = false;
      if (!nodeLive(job.node)) {
        if (job.carry || u.carry) {
          job.phase = "toHall";
          pathToHall(u);
        } else {
          u.job = null;
        }
        return;
      }
      u.dir = dirFrom(job.node.x - u.x, job.node.y - u.y);
      job.t = (job.t || 0) + dt;
      if (job.t >= HARVEST_TIME) {
        job.t = 0;
        if (nodeLive(job.node) && job.node.hp > 0) {
          const res = job.node.kind === "gold" ? "gold" : "wood";
          job.node.hp--;
          job.carry = res;
          u.carry = res;
          if (job.node.hp <= 0) depleteNode(job.node);
          beep(res === "gold" ? 240 : 180, 0.05, "square");
          job.phase = "toHall";
          pathToHall(u);
        } else if (job.carry || u.carry) {
          job.phase = "toHall";
          pathToHall(u);
        } else {
          u.job = null;
        }
      }
      return;
    }
    if (job.phase === "toHall") {
      if (nearHallDoor(u)) {
        u.path = [];
        const got = job.carry || u.carry;
        if (got === "wood") {
          if ((u.team || 0) === 1) enemyGold += WOOD_PAY;
          else wood += WOOD_PAY;
          beep(420, 0.05);
        } else if (got === "gold") {
          if ((u.team || 0) === 1) enemyGold += GOLD_PAY;
          else gold += GOLD_PAY;
          beep(560, 0.05);
        }
        job.carry = null;
        u.carry = null;
        if (nodeLive(job.node)) {
          job.phase = "toNode";
          pathToNode(u, job.node, 0);
        } else {
          u.job = null;
        }
        return;
      }
      if (!u.path.length) pathToHall(u);
    }
  }

  function colorAt(px, py, tx, ty) {
    const h = height[ty][tx];
    const hn = height[ty > 0 ? ty - 1 : ty][tx];
    const hs = height[ty < MAP_H - 1 ? ty + 1 : ty][tx];
    const hw = height[ty][tx > 0 ? tx - 1 : tx];
    const he = height[ty][tx < MAP_W - 1 ? tx + 1 : tx];
    const n = hash(px, py);
    const n2 = hash(px * 3, py + 17);
    const ly = py - ty * TILE;

    const southDrop = h - hs;
    const slope = (hn - hs) * 0.85 + (hw - he) * 0.35;

    if (yard[ty][tx]) {
      let r = 118 + n * 22;
      let g = 92 + n2 * 16;
      let b = 52 + n * 10;
      if (n2 > 0.78) {
        r = 128 + n * 16;
        g = 114 + n * 12;
        b = 92 + n * 8;
      }
      if (n > 0.88) {
        r = 86;
        g = 108;
        b = 48;
      }
      return [r, g, b];
    }

    if (southDrop > 0.1 && ly > TILE - 3) {
      const d = 92 + n * 18;
      return [d, d * 0.72, d * 0.42];
    }
    if (h - hw > 0.12 && px - tx * TILE < 2) {
      return [86, 64, 38];
    }

    let g, r, b;
    if (h < 0.26) {
      const t = h / 0.26;
      r = lerp(76, 98, t);
      g = lerp(102, 124, t);
      b = lerp(36, 50, t);
      if (n2 > 0.58) {
        r = 108;
        g = 80;
        b = 46;
      }
    } else if (h > 0.58) {
      const t = (h - 0.58) / 0.42;
      r = lerp(118, 168, t);
      g = lerp(136, 176, t);
      b = lerp(52, 78, t);
    } else {
      const t = (h - 0.34) / 0.24;
      r = lerp(88, 118, t);
      g = lerp(118, 146, t);
      b = lerp(40, 56, t);
    }

    const lit = 1 + slope * 1.15 + (h - 0.35) * 0.55 + (n - 0.5) * 0.16;
    r = clamp(r * lit, 20, 210);
    g = clamp(g * lit, 24, 220);
    b = clamp(b * lit, 16, 140);

    if (n2 > 0.93) {
      g = clamp(g + 18, 0, 230);
      r = clamp(r + 8, 0, 230);
    }
    return [r, g, b];
  }

  function prerenderTerrain() {
    const w = MAP_W * TILE;
    const h = MAP_H * TILE + TERRAIN_PAD;
    terrain = document.createElement("canvas");
    terrain.width = w;
    terrain.height = h;
    const g = terrain.getContext("2d");
    const img = g.createImageData(w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = 62;
      d[i + 1] = 78;
      d[i + 2] = 32;
      d[i + 3] = 255;
    }
    const miniData = mctx.createImageData(MAP_W, MAP_H);

    for (let ty = 0; ty < MAP_H; ty++) {
      for (let tx = 0; tx < MAP_W; tx++) {
        const e = elev[ty][tx];
        const destY = ty * TILE - e * LIFT_STEP + TERRAIN_PAD;
        let ar = 0, ag = 0, ab = 0;
        for (let ly = 0; ly < TILE; ly++) {
          const py = destY + ly;
          if (py < 0 || py >= h) continue;
          for (let lx = 0; lx < TILE; lx++) {
            const px = tx * TILE + lx;
            const [r, gv, b] = colorAt(px, ty * TILE + ly, tx, ty);
            const i = (py * w + px) * 4;
            d[i] = r;
            d[i + 1] = gv;
            d[i + 2] = b;
            d[i + 3] = 255;
            ar += r;
            ag += gv;
            ab += b;
          }
        }
        if (e > 0) {
          const faceH = e * LIFT_STEP;
          for (let fy = 0; fy < faceH; fy++) {
            const py = destY + TILE + fy;
            if (py < 0 || py >= h) continue;
            const t = fy / Math.max(1, faceH - 1);
            for (let lx = 0; lx < TILE; lx++) {
              const px = tx * TILE + lx;
              const n = hash(tx * 17 + lx, ty * 13 + fy);
              let r, gv, b;
              if (e >= 3) {
                r = 122 + n * 36;
                gv = 108 + n * 24;
                b = 86 + n * 14;
              } else {
                r = 102 + n * 26;
                gv = 70 + n * 16;
                b = 40 + n * 10;
              }
              let shade = 1.12 - t * 0.5;
              if (lx === 0 || lx === TILE - 1) shade -= 0.18;
              if (fy === 0) shade += 0.18;
              r = clamp(r * shade, 24, 210);
              gv = clamp(gv * shade, 20, 190);
              b = clamp(b * shade, 14, 150);
              const i = (py * w + px) * 4;
              d[i] = r;
              d[i + 1] = gv;
              d[i + 2] = b;
              d[i + 3] = 255;
            }
          }
        }
        const n = TILE * TILE;
        const mi = (ty * MAP_W + tx) * 4;
        const lit = 0.72 + e * 0.1;
        miniData.data[mi] = clamp((ar / n) * lit, 0, 255) | 0;
        miniData.data[mi + 1] = clamp((ag / n) * lit, 0, 255) | 0;
        miniData.data[mi + 2] = clamp((ab / n) * lit, 0, 255) | 0;
        miniData.data[mi + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    miniTerrain = document.createElement("canvas");
    miniTerrain.width = MAP_W;
    miniTerrain.height = MAP_H;
    miniTerrain.getContext("2d").putImageData(miniData, 0, 0);
  }

  function isBlocked(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return true;
    return blocked[ty][tx];
  }

  function astar(sx, sy, gx, gy) {
    if (isBlocked(gx, gy)) {
      let found = null;
      let best = 99;
      for (let r = 1; r <= 6 && !found; r++) {
        for (let oy = -r; oy <= r; oy++) {
          for (let ox = -r; ox <= r; ox++) {
            const nx = gx + ox;
            const ny = gy + oy;
            if (!isBlocked(nx, ny)) {
              const d = Math.hypot(ox, oy);
              if (d < best) {
                best = d;
                found = [nx, ny];
              }
            }
          }
        }
      }
      if (!found) return null;
      gx = found[0];
      gy = found[1];
    }
    if (isBlocked(sx, sy)) {
      for (let oy = -2; oy <= 2; oy++) {
        for (let ox = -2; ox <= 2; ox++) {
          if (!isBlocked(sx + ox, sy + oy)) {
            sx += ox;
            sy += oy;
            ox = 3;
            oy = 3;
          }
        }
      }
    }

    const key = (x, y) => x + y * MAP_W;
    const gScore = new Map();
    const came = new Map();
    const open = [];
    const inOpen = new Set();
    const startK = key(sx, sy);
    gScore.set(startK, 0);
    open.push({ x: sx, y: sy, f: Math.hypot(gx - sx, gy - sy) });
    inOpen.add(startK);
    const dirs = [
      [1, 0, 1],
      [-1, 0, 1],
      [0, 1, 1],
      [0, -1, 1],
      [1, 1, 1.414],
      [1, -1, 1.414],
      [-1, 1, 1.414],
      [-1, -1, 1.414],
    ];
    let steps = 0;
    while (open.length && steps++ < 5000) {
      let bi = 0;
      for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
      const cur = open.splice(bi, 1)[0];
      inOpen.delete(key(cur.x, cur.y));
      if (cur.x === gx && cur.y === gy) {
        const path = [];
        let x = cur.x;
        let y = cur.y;
        while (came.has(key(x, y))) {
          path.push([x, y]);
          const p = came.get(key(x, y));
          x = p[0];
          y = p[1];
        }
        path.reverse();
        return path;
      }
      for (const [dx, dy, c] of dirs) {
        const nx = cur.x + dx;
        const ny = cur.y + dy;
        if (isBlocked(nx, ny)) continue;
        if (Math.abs((elev[ny][nx] || 0) - (elev[cur.y][cur.x] || 0)) > 1) continue;
        if (dx && dy && (isBlocked(cur.x + dx, cur.y) || isBlocked(cur.x, cur.y + dy))) continue;
        const nk = key(nx, ny);
        const ng = (gScore.get(key(cur.x, cur.y)) || 0) + c;
        if (ng < (gScore.get(nk) ?? Infinity)) {
          gScore.set(nk, ng);
          came.set(nk, [cur.x, cur.y]);
          const f = ng + Math.hypot(gx - nx, gy - ny);
          if (!inOpen.has(nk)) {
            open.push({ x: nx, y: ny, f });
            inOpen.add(nk);
          }
        }
      }
    }
    return null;
  }

  function orderMove(unit, x, y) {
    const sx = clamp((unit.x / TILE) | 0, 0, MAP_W - 1);
    const sy = clamp((unit.y / TILE) | 0, 0, MAP_H - 1);
    const gx = clamp((x / TILE) | 0, 0, MAP_W - 1);
    const gy = clamp((y / TILE) | 0, 0, MAP_H - 1);
    const path = astar(sx, sy, gx, gy);
    if (!path || !path.length) {
      unit.path = [{ x, y }];
      return;
    }
    unit.path = path.map(([tx, ty]) => ({
      x: tx * TILE + TILE / 2,
      y: ty * TILE + TILE / 2,
    }));
    const last = unit.path[unit.path.length - 1];
    last.x = x;
    last.y = y;
  }

  function spawnUnit(kind, slot, fromBldg, team) {
    const spec = UNIT_SPEC[kind] || UNIT_SPEC.worker;
    team = team || (fromBldg && fromBldg.team) || 0;
    if (team === 0 && playerCount() >= popCap()) {
      toast("Лимит населения", true);
      return null;
    }
    const src = fromBldg || (team === 1 ? enemyHall : hall);
    const d = bldgDoor(src);
    const rallyPt =
      src.kind === "hall" ? rally : src.rally || { x: d.x, y: d.y + 28 };
    const col = slot % 5;
    const row = (slot / 5) | 0;
    const target = {
      x: rallyPt.x + (col - 2) * 14,
      y: rallyPt.y + row * 14,
    };
    const u = {
      kind,
      team,
      x: d.x + (hash(slot, units.length) - 0.5) * 8,
      y: d.y,
      dir: 0,
      moving: false,
      path: [],
      walkT: 0,
      speed: spec.speed,
      job: null,
      carry: null,
      hp: spec.hp,
      maxHp: spec.hp,
      atkCd: 0,
      hitT: 0,
    };
    orderMove(u, target.x, target.y);
    units.push(u);
    return u;
  }

  function spawnWorker(slot) {
    return spawnUnit("worker", slot);
  }

  function trainUnit(kind) {
    const spec = UNIT_SPEC[kind];
    if (!spec) return;
    let dest = null;
    if (kind === "worker") dest = hall;
    else {
      dest = readyBarracks();
      if (!dest) {
        toast("Сначала постройте казармы", true);
        beep(90, 0.12, "sawtooth");
        return;
      }
    }
    if (gold < spec.gold || wood < spec.wood) {
      toast("Недостаточно ресурсов", true);
      beep(90, 0.12, "sawtooth");
      return;
    }
    if (playerCount() + queuedCount() >= popCap()) {
      toast("Лимит населения", true);
      return;
    }
    if (dest.queue.length >= 5) {
      toast("Очередь заполнена", true);
      return;
    }
    gold -= spec.gold;
    wood -= spec.wood;
    dest.queue.push({ t: 0, dur: spec.time, kind });
    selected = [dest];
    if (kind === "worker") trainedOnce = true;
    beep(320, 0.06);
    beep(480, 0.08);
    syncUi();
  }

  function trainWorker() {
    trainUnit("worker");
  }

  function dirFrom(dx, dy) {
    if (Math.abs(dx) > Math.abs(dy)) return dx >= 0 ? 1 : 3;
    return dy >= 0 ? 0 : 2;
  }

  function targetPos(t) {
    if (!t) return null;
    return { x: t.x, y: t.y };
  }

  function pickFoeAt(wx, wy) {
    for (let i = units.length - 1; i >= 0; i--) {
      const u = units[i];
      if ((u.team || 0) === 0 || u.hp <= 0 || visAt(u.x, u.y) < 2) continue;
      if (wx >= u.x - 10 && wx <= u.x + 10 && wy >= u.y - 22 && wy <= u.y + 4) return u;
    }
    for (let i = buildings.length - 1; i >= 0; i--) {
      const b = buildings[i];
      if ((b.team || 0) === 0 || b.hp <= 0) continue;
      const r = bldgSpriteRect(b);
      if (wx >= r.x && wx <= r.x + r.w && wy >= r.y && wy <= r.y + r.h) return b;
    }
    return null;
  }

  function attackTarget(u, target) {
    u.job = { type: "attack", target };
  }

  function nearestFoe(u, maxR) {
    let best = null;
    let bestD = maxR;
    for (const o of units) {
      if ((o.team || 0) === (u.team || 0) || o.hp <= 0) continue;
      const d = Math.hypot(o.x - u.x, o.y - u.y);
      if (d < bestD) {
        bestD = d;
        best = o;
      }
    }
    for (const b of buildings) {
      if ((b.team || 0) === (u.team || 0) || !b.done || b.hp <= 0) continue;
      const d = Math.hypot(b.x - u.x, b.y - u.y);
      if (d < bestD) {
        bestD = d;
        best = b;
      }
    }
    return best;
  }

  function endGame(win) {
    if (gameOver) return;
    gameOver = win ? "win" : "lose";
    const el = document.getElementById("end-screen");
    if (el) {
      el.classList.remove("hidden");
      const t = el.querySelector(".end-title");
      const s = el.querySelector(".end-sub");
      if (t) t.textContent = win ? "ПОБЕДА" : "ПОРАЖЕНИЕ";
      if (s) s.textContent = win ? "Орочий лагерь пал." : "Городской совет разрушен.";
    }
    toast(win ? "Победа!" : "Поражение…");
    beep(win ? 520 : 90, 0.2, win ? "square" : "sawtooth");
  }

  function killEnt(ent) {
    if (!ent) return;
    ent.hp = 0;
    if (UNIT_SPEC[ent.kind]) {
      selected = selected.filter((s) => s !== ent);
      const i = units.indexOf(ent);
      if (i >= 0) units.splice(i, 1);
      return;
    }
    if (ent.kind === "hall") {
      endGame(false);
      return;
    }
    if (ent.kind === "orc_hall") {
      endGame(true);
      return;
    }
    occupyBldg(ent, false);
    buildings = buildings.filter((b) => b !== ent);
    selected = selected.filter((s) => s !== ent);
    const spec = BUILD_SPEC[ent.kind];
    toast((spec ? spec.name : "Здание") + " разрушено");
  }

  function dealDamage(from, to, dmg) {
    if (!to || to.hp <= 0) return;
    to.hp -= dmg;
    to.hitT = 0.14;
    pings.push({ x: to.x, y: to.y - 6, t: 0.28, color: "#c44c3a" });
    beep(150, 0.04, "sawtooth");
    if (to.hp <= 0) killEnt(to);
  }

  function updateCombat(dt) {
    if (gameOver) return;
    for (const u of units.slice()) {
      if (u.hitT) u.hitT = Math.max(0, u.hitT - dt);
      if (u.atkCd) u.atkCd = Math.max(0, u.atkCd - dt);
      const spec = UNIT_SPEC[u.kind];
      if (!spec || !spec.dmg) continue;
      const job = u.job;
      if (job && job.type === "attack") {
        const t = job.target;
        if (!t || t.hp <= 0) {
          u.job = null;
          const nxt = nearestFoe(u, spec.range + 56);
          if (nxt) attackTarget(u, nxt);
          continue;
        }
        const p = targetPos(t);
        const dist = Math.hypot(u.x - p.x, u.y - p.y);
        if (dist > spec.range) {
          const last = u.path.length ? u.path[u.path.length - 1] : null;
          if (!last || Math.hypot(last.x - p.x, last.y - p.y) > 18) orderMove(u, p.x, p.y);
          continue;
        }
        u.path = [];
        u.moving = false;
        u.dir = dirFrom(p.x - u.x, p.y - u.y);
        if (u.atkCd <= 0) {
          u.atkCd = spec.cd;
          if (spec.range > 40) {
            shots.push({
              x: u.x,
              y: u.y - 10,
              tx: p.x,
              ty: p.y - 12,
              from: u,
              target: t,
              dmg: spec.dmg,
              spd: 190,
            });
          } else {
            dealDamage(u, t, spec.dmg);
          }
        }
      } else if (!job || (job.type !== "gather" && job.type !== "build")) {
        if (u.kind === "worker" || u.kind === "peon") continue;
        const foe = nearestFoe(u, 70);
        if (foe) attackTarget(u, foe);
      }
    }
    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i];
      const dx = s.tx - s.x;
      const dy = s.ty - s.y;
      const d = Math.hypot(dx, dy) || 1;
      const step = s.spd * dt;
      if (d <= step) {
        if (s.target && s.target.hp > 0) dealDamage(s.from, s.target, s.dmg);
        shots.splice(i, 1);
      } else {
        s.x += (dx / d) * step;
        s.y += (dy / d) * step;
      }
    }
  }

  function nearestMine(u) {
    let best = null;
    let bestD = 1e9;
    for (const n of nodes) {
      if (!nodeLive(n) || n.kind !== "gold") continue;
      const d = Math.hypot(n.x - u.x, n.y - u.y);
      if (d < bestD) {
        bestD = d;
        best = n;
      }
    }
    return best;
  }

  function updateTowers(dt) {
    if (gameOver) return;
    for (const b of buildings) {
      if (b.kind !== "tower" || !b.done || b.hp <= 0) continue;
      b.atkCd = (b.atkCd || 0) - dt;
      const fake = { x: b.x, y: b.y - 18, team: b.team || 0, kind: "tower" };
      const foe = nearestFoe(fake, 102);
      if (!foe) continue;
      if ((b.team || 0) === 0 && visAt(foe.x, foe.y) < 2) continue;
      if (b.atkCd <= 0) {
        b.atkCd = 1.05;
        shots.push({
          x: b.x,
          y: b.y - 42,
          tx: foe.x,
          ty: foe.y - 10,
          from: fake,
          target: foe,
          dmg: 11,
          spd: 220,
        });
      }
    }
  }

  function updateEnemy(dt) {
    if (gameOver || !enemyHall || enemyHall.hp <= 0) return;
    raidT += dt;
    for (const u of units) {
      if ((u.team || 0) !== 1) continue;
      if (u.kind === "peon") {
        if (!u.job) {
          const mine = nearestMine(u);
          if (mine) {
            u.job = { type: "gather", node: mine, phase: "toNode", carry: null, t: 0 };
            pathToNode(u, mine, 0);
          }
        }
        continue;
      }
      if (u.job && u.job.type === "attack") continue;
      const close = nearestFoe(u, 70);
      if (close) attackTarget(u, close);
    }
    const nGrunt = units.filter((u) => u.kind === "grunt").length;
    const bar = buildings.find((b) => b.kind === "orc_barracks" && b.done && b.hp > 0);
    if (bar && nGrunt + (bar.queue ? bar.queue.length : 0) < 12 && enemyGold >= 40 && bar.queue.length < 3) {
      enemyGold -= 40;
      bar.queue.push({ t: 0, dur: 8, kind: "grunt" });
    }
    if (raidT > 42 && ((raidT / 24) | 0) !== (((raidT - dt) / 24) | 0)) {
      let sent = 0;
      for (const u of units) {
        if (u.kind !== "grunt") continue;
        if (nearestFoe(u, 56)) continue;
        attackTarget(u, hall);
        sent++;
        if (sent >= 4) break;
      }
      if (sent) toast("Орки идут в набег!");
    }
  }

  function updateUnits(dt) {
    for (const u of units) {
      if (harvesting(u)) {
        u.moving = false;
        u.path = [];
      } else if (!u.path.length) {
        u.moving = false;
      } else {
        const p = u.path[0];
        const dx = p.x - u.x;
        const dy = p.y - u.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 2.2) {
          u.path.shift();
        } else {
          const step = Math.min(u.speed * dt, dist);
          u.x += (dx / dist) * step;
          u.y += (dy / dist) * step;
          u.dir = dirFrom(dx, dy);
          u.moving = true;
          u.walkT += dt;
          u.x = clamp(u.x, UNIT_R, MAP_W * TILE - UNIT_R);
          u.y = clamp(u.y, UNIT_R, MAP_H * TILE - UNIT_R);
        }
      }
    }

    for (let i = 0; i < units.length; i++) {
      for (let j = i + 1; j < units.length; j++) {
        const a = units[i];
        const b = units[j];
        const ah = harvesting(a);
        const bh = harvesting(b);
        if (ah && bh) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 0.001;
        const min = UNIT_R * 2.1;
        if (d < min) {
          const push = ((min - d) / 2) * 0.6;
          const nx = dx / d;
          const ny = dy / d;
          if (ah) {
            b.x += nx * push * 2;
            b.y += ny * push * 2;
          } else if (bh) {
            a.x -= nx * push * 2;
            a.y -= ny * push * 2;
          } else {
            a.x -= nx * push;
            a.y -= ny * push;
            b.x += nx * push;
            b.y += ny * push;
          }
        }
      }
    }

    const f = hallFoot();
    for (const u of units) {
      if (u.x > f.x && u.x < f.x + f.w && u.y > f.y && u.y < f.y + f.h) {
        u.y = f.y + f.h + UNIT_R;
      }
    }

    for (const b of buildings) {
      if (b === hall) continue;
      const bf = bldgFoot(b);
      for (const u of units) {
        if (u.x > bf.x && u.x < bf.x + bf.w && u.y > bf.y && u.y < bf.y + bf.h) {
          u.y = bf.y + bf.h + UNIT_R;
        }
      }
    }

    for (const u of units) {
      if (u.job && u.job.type === "gather") updateGatherJob(u, dt);
      if (u.job && u.job.type === "build") updateBuildJob(u, dt);
    }
  }

  function updateBuildJob(u, dt) {
    const job = u.job;
    if (!job || job.type !== "build") return;
    const b = job.building;
    if (!b || b.done) {
      u.job = null;
      return;
    }
    const d = bldgDoor(b);
    if (job.phase === "go") {
      if (Math.hypot(u.x - d.x, u.y - d.y) < 18) {
        u.path = [];
        u.moving = false;
        job.phase = "work";
        return;
      }
      if (!u.path.length) orderMove(u, d.x, d.y + 8);
      return;
    }
    u.path = [];
    u.moving = false;
    b.progress = (b.progress || 0) + dt;
    const need = b.buildTime || BAR_TIME;
    if (b.progress >= need) {
      b.done = true;
      const spec = BUILD_SPEC[b.kind];
      toast((spec && spec.name ? spec.name : "Здание") + " готовы");
      beep(520, 0.08);
      for (const o of units) {
        if (o.job && o.job.type === "build" && o.job.building === b) o.job = null;
      }
    }
  }

  function updateHall(dt) {
    if (hall.queue.length) {
      const q = hall.queue[0];
      q.t += dt;
      if (q.t >= q.dur) {
        const kind = q.kind || "worker";
        hall.queue.shift();
        spawnUnit(kind, units.length, hall);
        toast((UNIT_SPEC[kind] || UNIT_SPEC.worker).name + " вышел из совета");
        beep(520, 0.07);
      }
    }
    for (const b of buildings) {
      if (b.kind !== "hall" && !b.done && (b.progress || 0) >= (b.buildTime || BAR_TIME)) {
        b.done = true;
        const spec = BUILD_SPEC[b.kind];
        toast((spec ? spec.name : "Здание") + " готовы");
        beep(520, 0.08);
        for (const o of units) {
          if (o.job && o.job.type === "build" && o.job.building === b) o.job = null;
        }
      }
      if ((b.kind !== "barracks" && b.kind !== "orc_barracks") || !b.done || !b.queue.length) continue;
      const q = b.queue[0];
      q.t += dt;
      if (q.t >= q.dur) {
        const kind = q.kind || "militia";
        b.queue.shift();
        spawnUnit(kind, units.length, b);
        if ((b.team || 0) === 0) {
          toast((UNIT_SPEC[kind] || UNIT_SPEC.militia).name + " вышел из казарм");
          beep(520, 0.07);
        }
      }
    }
  }

  function pickAt(wx, wy) {
    for (let i = units.length - 1; i >= 0; i--) {
      const u = units[i];
      if ((u.team || 0) !== 0) continue;
      if (wx >= u.x - 10 && wx <= u.x + 10 && wy >= u.y - 22 && wy <= u.y + 4) return u;
    }
    for (let i = buildings.length - 1; i >= 0; i--) {
      const b = buildings[i];
      if ((b.team || 0) !== 0) continue;
      const r = bldgSpriteRect(b);
      if (wx >= r.x && wx <= r.x + r.w && wy >= r.y && wy <= r.y + r.h) return b;
    }
    return null;
  }

  function selectBox(x0, y0, x1, y1) {
    const xa = Math.min(x0, x1);
    const xb = Math.max(x0, x1);
    const ya = Math.min(y0, y1);
    const yb = Math.max(y0, y1);
    const hit = units.filter(
      (u) => (u.team || 0) === 0 && u.x >= xa && u.x <= xb && u.y >= ya && u.y <= yb
    );
    if (hit.length) {
      selected = hit;
      return;
    }
    for (const b of buildings) {
      const r = bldgSpriteRect(b);
      const hx = r.x + r.w / 2;
      const hy = r.y + r.h * 0.7;
      if (hx >= xa && hx <= xb && hy >= ya && hy <= yb) {
        selected = [b];
        return;
      }
    }
    selected = [];
  }

  function issueRightClick(wx, wy) {
    if (placeMode) {
      placeMode = null;
      canvas.style.cursor = "crosshair";
      syncUi();
      return;
    }
    const workers = selected.filter((s) => s.kind === "worker");
    const troops = selected.filter((s) => isPlayerUnit(s));
    const node = pickNodeAt(wx, wy);
    const bldgHit = pickAt(wx, wy);
    const foe = pickFoeAt(wx, wy);
    if (troops.length && foe) {
      troops.forEach((u) => attackTarget(u, foe));
      pings.push({ x: foe.x, y: foe.y, t: 0.5, color: "#c44c3a" });
      toast("В атаку!");
      beep(280, 0.06);
      return;
    }
    if (workers.length && bldgHit && bldgHit.kind !== "hall" && !bldgHit.done) {
      const d = bldgDoor(bldgHit);
      workers.forEach((u) => {
        u.job = { type: "build", building: bldgHit, phase: "go" };
        orderMove(u, d.x, d.y + 8);
      });
      pings.push({ x: bldgHit.x, y: bldgHit.y, t: 0.45, color: "#e4c45c" });
      toast("Рабочие строят");
      beep(400, 0.05);
      return;
    }
    if (workers.length && node && nodeLive(node)) {
      workers.forEach((u, i) => {
        u.job = {
          type: "gather",
          node,
          phase: "toNode",
          carry: u.carry || null,
          t: 0,
        };
        pathToNode(u, node, i);
      });
      pings.push({
        x: node.x,
        y: node.y,
        t: 0.45,
        color: node.kind === "gold" ? "#ffe46a" : "#7dff6a",
      });
      beep(node.kind === "gold" ? 520 : 640, 0.04);
    } else if (troops.length) {
      const cols = Math.min(troops.length, 5);
      troops.forEach((u, i) => {
        u.job = null;
        const col = i % 5;
        const row = (i / 5) | 0;
        orderMove(u, wx + (col - (cols - 1) / 2) * 14, wy + row * 12);
      });
      pings.push({ x: wx, y: wy, t: 0.45, color: "#7dff6a" });
      beep(640, 0.04);
    } else if (selected.includes(hall)) {
      rally.x = wx;
      rally.y = wy;
      pings.push({ x: wx, y: wy, t: 0.5, color: "#ffd25a" });
      toast("Точка сбора");
      beep(400, 0.05);
    } else {
      const bar = selected.find((s) => s.kind === "barracks");
      if (bar) {
        bar.rally = { x: wx, y: wy };
        pings.push({ x: wx, y: wy, t: 0.5, color: "#ffd25a" });
        toast("Точка сбора");
        beep(400, 0.05);
      }
    }
  }

  function drawRing(x, y, rw, rh, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(x | 0, y | 0, rw, rh, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawShadow(x, y, rw, rh) {
    ctx.fillStyle = "rgba(20, 12, 8, 0.32)";
    ctx.beginPath();
    ctx.ellipse(x | 0, y | 0, rw, rh, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawBuildingShadow(x, y, w) {
    const bx = (x + 3) | 0;
    const by = (y - 3) | 0;
    ctx.fillStyle = "rgba(16, 10, 6, 0.45)";
    ctx.fillRect(bx + 2, by, w - 4, 4);
    ctx.fillStyle = "rgba(16, 10, 6, 0.22)";
    ctx.fillRect(bx + 8, by + 4, w - 16, 2);
  }

  function drawCarry(u, sx, sy) {
    const carry = u.carry || (u.job && u.job.carry);
    if (!carry) return;
    const im = carry === "gold" ? imgs.carryGold : imgs.carryWood;
    if (im) {
      ctx.drawImage(im, (sx - (im.width >> 1) + 5) | 0, (sy - 7) | 0);
    } else {
      ctx.fillStyle = carry === "gold" ? "#e4c45c" : "#8a5a32";
      ctx.fillRect(sx + 2, sy - 6, 3, 3);
    }
  }

  function drawHpBar(sx, sy, hp, max, w) {
    const bw = w || 12;
    const bx = (sx - bw / 2) | 0;
    const by = (sy - 20) | 0;
    ctx.fillStyle = "#1a100c";
    ctx.fillRect(bx, by, bw, 3);
    ctx.fillStyle = hp / max > 0.45 ? "#7dff6a" : "#c44c3a";
    ctx.fillRect(bx, by, Math.max(0, ((hp / Math.max(1, max)) * bw) | 0), 3);
  }

  function drawWorker(u) {
    const lift = visLift(u.x, u.y);
    const sx = (u.x - cam.x) | 0;
    const sy = (u.y - lift - cam.y) | 0;
    if (selected.includes(u)) drawRing(sx, sy + 2, 8, 3, "#7dff6a");
    else if ((u.team || 0) === 1) drawRing(sx, sy + 2, 7, 3, "#c44c3a");
    drawShadow(sx, sy + 2, 6, 2);
    const frame = u.moving ? ((u.walkT * 6) | 0) % 4 : 0;
    const sheet = imgs[u.kind] || imgs.worker;
    if (u.hitT > 0) ctx.globalAlpha = 0.55;
    if (sheet) ctx.drawImage(sheet, frame * CELL, u.dir * CELL, CELL, CELL, sx - 12, sy - 16, CELL, CELL);
    ctx.globalAlpha = 1;
    drawCarry(u, sx, sy);
    if (u.hp < u.maxHp || selected.includes(u) || (u.team || 0) === 1)
      drawHpBar(sx, sy, u.hp, u.maxHp, 12);
  }

  function drawNode(n) {
    const lift = visLift(n.x, n.y);
    const im = n.img;
    if (im) {
      const sx = (n.x - im.width / 2 - cam.x) | 0;
      const sy = (n.y - im.height - lift - cam.y) | 0;
      ctx.drawImage(im, sx, sy);
      return;
    }
    const sx = (n.x - cam.x) | 0;
    const sy = (n.y - lift - cam.y) | 0;
    if (n.kind === "gold") {
      ctx.fillStyle = "#6a4a28";
      ctx.fillRect(sx - 8, sy - 6, 16, 6);
      ctx.fillStyle = "#e4c45c";
      ctx.fillRect(sx - 5, sy - 10, 10, 7);
    } else if (n.kind === "stump") {
      ctx.fillStyle = "#6a4224";
      ctx.fillRect(sx - 3, sy - 5, 6, 5);
    } else {
      ctx.fillStyle = "#4a2e16";
      ctx.fillRect(sx - 2, sy - 12, 4, 12);
      ctx.fillStyle = "#2d6a2a";
      ctx.beginPath();
      ctx.ellipse(sx, sy - 20, 8, 11, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawHall() {
    drawBldg(hall);
  }

  function drawBldg(b, vis) {
    const r = bldgSpriteRect(b);
    const f = bldgFoot(b);
    const lift = visLift(b.x, b.y);
    const sx = (r.x - cam.x) | 0;
    const sy = (r.y - lift - cam.y) | 0;
    drawBuildingShadow((f.x - cam.x) | 0, (f.y + f.h - lift - cam.y) | 0, f.w);
    if (selected.includes(b)) {
      drawRing(
        (f.x + f.w / 2 - cam.x) | 0,
        (f.y + f.h - lift - cam.y) | 0,
        b.kind === "hall" ? 26 : 22,
        7,
        "#7dff6a"
      );
    }
    const im = bldgImg(b);
    if (im) {
      ctx.globalAlpha = b.done === false ? 0.45 + Math.min(0.5, (b.progress || 0) / (b.buildTime || BAR_TIME)) : vis === 1 ? 0.45 : 1;
      ctx.drawImage(im, sx, sy);
      ctx.globalAlpha = 1;
    }
    if (b.done === false) {
      const bw = 40;
      const bx = sx + r.w / 2 - bw / 2;
      const by = sy + 4;
      ctx.fillStyle = "#1a100c";
      ctx.fillRect(bx, by, bw, 4);
      ctx.fillStyle = "#7dff6a";
      ctx.fillRect(bx, by, (((b.progress || 0) / (b.buildTime || BAR_TIME)) * bw) | 0, 4);
      ctx.strokeStyle = "#100808";
      ctx.strokeRect(bx, by, bw, 4);
    } else if (b.queue && b.queue.length) {
      const q = b.queue[0];
      const bw = 40;
      const bx = sx + r.w / 2 - bw / 2;
      const by = sy + 4;
      ctx.fillStyle = "#1a100c";
      ctx.fillRect(bx, by, bw, 4);
      ctx.fillStyle = "#e4c45c";
      ctx.fillRect(bx, by, ((q.t / q.dur) * bw) | 0, 4);
      ctx.strokeStyle = "#100808";
      ctx.strokeRect(bx, by, bw, 4);
    }
    if (b.hp < b.maxHp || selected.includes(b) || (b.team || 0) === 1) {
      const lift = visLift(b.x, b.y);
      drawHpBar(
        (f.x + f.w / 2 - cam.x) | 0,
        (r.y - lift - cam.y + 18) | 0,
        b.hp,
        b.maxHp,
        28
      );
    }
  }

  function drawProp(p) {
    const lift = visLift(p.x, p.y);
    const im = p.img;
    const sx = (p.x - im.width / 2 - cam.x) | 0;
    const sy = (p.y - im.height - lift - cam.y) | 0;
    ctx.drawImage(im, sx, sy);
  }

  function drawWorld() {
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#0c0806";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(terrain, -cam.x | 0, (-cam.y - TERRAIN_PAD) | 0);

    const drawables = [];
    for (const p of props) {
      if (visAt(p.x, p.y) === 0) continue;
      drawables.push({ y: p.y, fn: () => drawProp(p) });
    }
    for (const n of nodes) {
      if (visAt(n.x, n.y) === 0) continue;
      drawables.push({ y: n.y, fn: () => drawNode(n) });
    }
    for (const b of buildings) {
      const v = visAt(b.x, b.y);
      if ((b.team || 0) === 1 && v === 0) continue;
      drawables.push({ y: b.y, fn: () => drawBldg(b, v) });
    }
    for (const u of units) {
      if ((u.team || 0) === 1 && visAt(u.x, u.y) < 2) continue;
      drawables.push({ y: u.y, fn: () => drawWorker(u) });
    }
    drawables.sort((a, b) => a.y - b.y);
    for (const d of drawables) d.fn();
    drawFog();

    for (const s of shots) {
      const lift = visLift(s.x, s.y);
      ctx.fillStyle = "#f4e0a0";
      ctx.fillRect((s.x - cam.x) | 0, (s.y - lift - cam.y) | 0, 2, 2);
    }

    const rallyBldg = selected.find((s) => s.kind === "hall" || s.kind === "barracks");
    if (rallyBldg && imgs.flag) {
      const rp = rallyBldg.kind === "hall" ? rally : rallyBldg.rally;
      if (rp) {
        const lift = visLift(rp.x, rp.y);
        ctx.drawImage(
          imgs.flag,
          (rp.x - 2 - cam.x) | 0,
          (rp.y - imgs.flag.height - lift - cam.y) | 0
        );
      }
    }

    if (placeMode && BUILD_SPEC[placeMode]) {
      const spec = BUILD_SPEC[placeMode];
      const im = imgs[spec.img];
      const tx = clamp((mouse.wx / TILE) | 0, 0, MAP_W - spec.tw);
      const ty = clamp((mouse.wy / TILE) | 0, 0, MAP_H - spec.th);
      const ok = canPlaceAt(tx, ty, spec.tw, spec.th);
      const fake = {
        kind: placeMode,
        tx,
        ty,
        tw: spec.tw,
        th: spec.th,
        x: tx * TILE + (spec.tw * TILE) / 2,
        y: ty * TILE + spec.th * TILE,
        done: false,
      };
      const r = bldgSpriteRect(fake);
      const f = bldgFoot(fake);
      const lift = visLift(fake.x, fake.y);
      if (im) {
        ctx.globalAlpha = 0.55;
        ctx.drawImage(im, (r.x - cam.x) | 0, (r.y - lift - cam.y) | 0);
        ctx.globalAlpha = 1;
      }
      ctx.strokeStyle = ok ? "#7dff6a" : "#c44c3a";
      ctx.lineWidth = 1;
      ctx.strokeRect((f.x - cam.x) | 0, (f.y - lift - cam.y) | 0, f.w, f.h);
    }

    for (const p of pings) {
      const a = p.t / 0.5;
      ctx.strokeStyle = p.color;
      ctx.globalAlpha = clamp(a, 0, 1);
      ctx.lineWidth = 1;
      const lift = visLift(p.x, p.y);
      ctx.beginPath();
      ctx.ellipse((p.x - cam.x) | 0, (p.y - lift - cam.y) | 0, 6 + (1 - a) * 8, 3 + (1 - a) * 3, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    if (box) {
      const x = Math.min(box.x0, box.x1) - cam.x;
      const y = Math.min(box.y0, box.y1) - cam.y;
      const w = Math.abs(box.x1 - box.x0);
      const h = Math.abs(box.y1 - box.y0);
      ctx.strokeStyle = "#d4f0a0";
      ctx.lineWidth = 1;
      ctx.strokeRect(x | 0, y | 0, w | 0, h | 0);
      ctx.fillStyle = "rgba(180, 220, 80, 0.08)";
      ctx.fillRect(x | 0, y | 0, w | 0, h | 0);
    }

    if (!trainedOnce) {
      const f = hallFoot();
      const lift = visLift(hall.x, hall.y);
      const t = performance.now() / 380;
      ctx.globalAlpha = 0.45 + Math.sin(t) * 0.3;
      drawRing(
        (f.x + f.w / 2 - cam.x) | 0,
        (f.y + f.h - lift - cam.y) | 0,
        30 + Math.sin(t) * 2,
        5,
        "#e4c45c"
      );
      ctx.globalAlpha = 1;
    }
  }

  function drawFog() {
    if (!fog) return;
    const x0 = clamp((cam.x / TILE) | 0, 0, MAP_W - 1);
    const y0 = clamp((cam.y / TILE) | 0, 0, MAP_H - 1);
    const x1 = clamp((((cam.x + canvas.width) / TILE) | 0) + 2, 0, MAP_W);
    const y1 = clamp((((cam.y + canvas.height) / TILE) | 0) + 2, 0, MAP_H);
    for (let ty = y0; ty < y1; ty++) {
      for (let tx = x0; tx < x1; tx++) {
        const v = fog[ty][tx];
        if (v === 2) continue;
        const sx = (tx * TILE - cam.x) | 0;
        const sy = (ty * TILE - cam.y) | 0;
        ctx.fillStyle = v === 0 ? "#0c0806" : "rgba(10,6,4,0.52)";
        ctx.fillRect(sx, sy, TILE + 1, TILE + 1);
      }
    }
  }
  function drawMinimap() {
    mctx.imageSmoothingEnabled = false;
    mctx.drawImage(miniTerrain, 0, 0, mini.width, mini.height);
    const sx = mini.width / (MAP_W * TILE);
    const sy = mini.height / (MAP_H * TILE);
    mctx.fillStyle = "#c47848";
    const f = hallFoot();
    mctx.fillRect(f.x * sx, f.y * sy, f.w * sx, f.h * sy);
    if (enemyHall && enemyHall.hp > 0 && visAt(enemyHall.x, enemyHall.y) >= 1) {
      const ef = bldgFoot(enemyHall);
      mctx.fillStyle = "#3a5a28";
      mctx.fillRect(ef.x * sx, ef.y * sy, ef.w * sx, ef.h * sy);
    }
    for (const b of buildings) {
      if (b.kind === "hall" || b.kind === "orc_hall") continue;
      if ((b.team || 0) === 1 && visAt(b.x, b.y) < 1) continue;
      const bf = bldgFoot(b);
      if (b.kind === "barracks" || b.kind === "orc_barracks") mctx.fillStyle = b.done ? "#8b2a2a" : "#5a3820";
      else if (b.kind === "house") mctx.fillStyle = b.done ? "#c4a06a" : "#6a5230";
      else if (b.kind === "tower") mctx.fillStyle = b.done ? "#8a7a68" : "#5a5040";
      else continue;
      mctx.fillRect(bf.x * sx, bf.y * sy, Math.max(2, bf.w * sx), Math.max(2, bf.h * sy));
    }
    for (const n of nodes) {
      if (visAt(n.x, n.y) === 0) continue;
      if (n.kind === "tree") {
        mctx.fillStyle = "#163818";
        mctx.fillRect((n.x * sx) | 0, (n.y * sy) | 0, 2, 2);
      } else if (n.kind === "gold") {
        mctx.fillStyle = "#e8c44a";
        const tw = (n.tw || 1) * TILE * sx;
        const th = (n.th || 1) * TILE * sy;
        mctx.fillRect((n.tx * TILE * sx) | 0, (n.ty * TILE * sy) | 0, Math.max(3, tw), Math.max(3, th));
      }
    }
    for (const u of units) {
      if ((u.team || 0) === 1 && visAt(u.x, u.y) < 2) continue;
      mctx.fillStyle = (u.team || 0) === 1 ? "#c44c3a" : "#ffe46a";
      mctx.fillRect((u.x * sx) | 0, (u.y * sy) | 0, 2, 2);
    }
    if (fog) {
      const tw = Math.max(1, (TILE * sx) | 0);
      for (let ty = 0; ty < MAP_H; ty++) {
        for (let tx = 0; tx < MAP_W; tx++) {
          const v = fog[ty][tx];
          if (v === 2) continue;
          mctx.fillStyle = v === 0 ? "#0c0806" : "rgba(8,4,2,0.55)";
          mctx.fillRect((tx * TILE * sx) | 0, (ty * TILE * sy) | 0, tw + 1, tw + 1);
        }
      }
    }
    mctx.strokeStyle = "#f4f0d8";
    mctx.lineWidth = 1;
    mctx.strokeRect(cam.x * sx, cam.y * sy, canvas.width * sx, canvas.height * sy);
  }

  function showWrap(el, on) {
    if (!el) return;
    el.classList.toggle("is-hidden", !on);
  }

  function syncUi() {
    ui.gold.textContent = gold | 0;
    if (ui.wood) ui.wood.textContent = wood | 0;
    ui.pop.textContent = playerCount() + " / " + popCap();
    const queued = queuedCount();
    const cap = popCap();
    const popFull = playerCount() + queued >= cap;
    const hallFull = hall.queue.length >= 5;
    const bar = selected.find((s) => s.kind === "barracks");
    const barReady = bar && bar.done;
    const barFull = barReady && bar.queue.length >= 5;
    if (ui.btn) ui.btn.disabled = popFull || hallFull || gold < UNIT_SPEC.worker.gold;
    if (ui.btnMilitia) {
      ui.btnMilitia.disabled =
        !barReady || popFull || barFull || gold < UNIT_SPEC.militia.gold || wood < UNIT_SPEC.militia.wood;
    }
    if (ui.btnArcher) {
      ui.btnArcher.disabled =
        !barReady || popFull || barFull || gold < UNIT_SPEC.archer.gold || wood < UNIT_SPEC.archer.wood;
    }
    if (ui.btnRider) {
      ui.btnRider.disabled =
        !barReady || popFull || barFull || gold < UNIT_SPEC.rider.gold || wood < UNIT_SPEC.rider.wood;
    }
    if (ui.btnTower) {
      ui.btnTower.disabled =
        gold < BUILD_SPEC.tower.gold ||
        wood < BUILD_SPEC.tower.wood ||
        buildings.filter((b) => b.kind === "tower").length >= BUILD_SPEC.tower.max;
    }
    if (ui.btnBarracks) {
      ui.btnBarracks.disabled =
        gold < BUILD_SPEC.barracks.gold ||
        wood < BUILD_SPEC.barracks.wood ||
        buildings.filter((b) => b.kind === "barracks").length >= BUILD_SPEC.barracks.max;
    }
    if (ui.btnHouse) {
      ui.btnHouse.disabled =
        gold < BUILD_SPEC.house.gold ||
        wood < BUILD_SPEC.house.wood ||
        buildings.filter((b) => b.kind === "house").length >= BUILD_SPEC.house.max;
    }
    ui.btn.classList.toggle("pulse", selected.includes(hall) && !trainedOnce);
    if (ui.btnBarracks) ui.btnBarracks.classList.toggle("pulse", placeMode === "barracks");
    if (ui.btnHouse) ui.btnHouse.classList.toggle("pulse", placeMode === "house");
    if (ui.btnTower) ui.btnTower.classList.toggle("pulse", placeMode === "tower");

    const troops = selected.filter((s) => isUnit(s));
    const workers = troops.filter((s) => s.kind === "worker");
    const hallSel = selected.includes(hall);
    const barSel = !!bar;
    const houseSel = selected.find((s) => s.kind === "house");
    const towerSel = selected.find((s) => s.kind === "tower");
    const workerSel = workers.length > 0 && workers.length === troops.length;
    showWrap(ui.wrapWorker, hallSel);
    showWrap(ui.wrapHouse, hallSel || workerSel);
    showWrap(ui.wrapBarracks, hallSel || workerSel);
    showWrap(ui.wrapTower, hallSel || workerSel);
    showWrap(ui.wrapMilitia, barSel && bar.done);
    showWrap(ui.wrapArcher, barSel && bar.done);
    showWrap(ui.wrapRider, barSel && bar.done);

    if (hallSel) {
      ui.title.textContent = "Городской совет";
      ui.sub.textContent = "1 — рабочий. F — хижина. B — казармы. T — башня. ПКМ — точка сбора.";
      ui.portrait.src = "assets/buildings/townhall.png";
      ui.portrait.style.display = "block";
    } else if (houseSel && !houseSel.done) {
      ui.title.textContent = "Хижина (стройка)";
      ui.sub.textContent =
        "Готово на " +
        Math.min(100, (((houseSel.progress || 0) / (houseSel.buildTime || 8)) * 100) | 0) +
        "%. Пришлите рабочих ПКМ.";
      ui.portrait.src = "assets/buildings/house.png";
      ui.portrait.style.display = "block";
    } else if (houseSel) {
      ui.title.textContent = "Хижина";
      ui.sub.textContent = "Даёт +5 к населению.";
      ui.portrait.src = "assets/buildings/house.png";
      ui.portrait.style.display = "block";
    } else if (towerSel && !towerSel.done) {
      ui.title.textContent = "Башня (стройка)";
      ui.sub.textContent =
        "Готово на " +
        Math.min(100, (((towerSel.progress || 0) / (towerSel.buildTime || 10)) * 100) | 0) +
        "%. Пришлите рабочих ПКМ.";
      ui.portrait.src = "assets/buildings/tower.png";
      ui.portrait.style.display = "block";
    } else if (towerSel) {
      ui.title.textContent = "Башня";
      ui.sub.textContent = "Сама стреляет по оркам. Даёт обзор.";
      ui.portrait.src = "assets/buildings/tower.png";
      ui.portrait.style.display = "block";
    } else if (barSel && !bar.done) {
      ui.title.textContent = "Казармы (стройка)";
      ui.sub.textContent =
        "Готово на " + Math.min(100, (((bar.progress || 0) / (bar.buildTime || BAR_TIME)) * 100) | 0) + "%. Пришлите рабочих ПКМ.";
      ui.portrait.src = "assets/buildings/barracks.png";
      ui.portrait.style.display = "block";
    } else if (barSel) {
      ui.title.textContent = "Казармы";
      ui.sub.textContent = "2 — ополченец. 3 — лучник. 4 — всадник. ПКМ — точка сбора.";
      ui.portrait.src = "assets/buildings/barracks.png";
      ui.portrait.style.display = "block";
    } else if (workerSel) {
      ui.title.textContent = workers.length > 1 ? "Рабочие × " + workers.length : "Рабочий";
      ui.sub.textContent = "ПКМ по лесу/шахте — собирать. F — хижина. B — казармы. T — башня.";
      ui.portrait.src = "assets/ui/btn_worker.png";
      ui.portrait.style.display = "block";
    } else if (troops.length) {
      const k = troops[0].kind;
      const spec = UNIT_SPEC[k];
      ui.title.textContent = troops.length > 1 ? "Отряд × " + troops.length : spec ? spec.name : k;
      ui.sub.textContent = "ПКМ по земле — идти.";
      ui.portrait.src =
        k === "archer" ? "assets/ui/btn_archer.png" : k === "rider" ? "assets/ui/btn_rider.png" : "assets/ui/btn_militia.png";
      ui.portrait.style.display = "block";
    } else {
      ui.title.textContent = "Ничего не выбрано";
      ui.sub.textContent = "Туман войны. Найдите орочий лагерь на юго-востоке и снесите зал.";
      ui.portrait.style.display = "none";
    }

    ui.queue.innerHTML = "";
    const qSrc = hallSel ? hall : barSel ? bar : null;
    if (qSrc && qSrc.queue) {
      qSrc.queue.forEach((q, i) => {
        const pip = document.createElement("div");
        pip.className = "q-pip";
        const barEl = document.createElement("i");
        barEl.style.width = i === 0 ? ((q.t / q.dur) * 100).toFixed(0) + "%" : "0%";
        pip.appendChild(barEl);
        ui.queue.appendChild(pip);
      });
    }
  }

  function jumpMinimap(ev) {
    const r = mini.getBoundingClientRect();
    const x = ((ev.clientX - r.left) / r.width) * MAP_W * TILE;
    const y = ((ev.clientY - r.top) / r.height) * MAP_H * TILE;
    centerOn(x, y);
  }

  function onPointerDown(e) {
    ensureAudio();
    if (inHud(e.clientY) && e.target !== canvas) return;
    const w = screenToWorld(e.clientX, e.clientY);
    mouse.wx = w.x;
    mouse.wy = w.y;

    if (e.button === 1 || (e.button === 0 && keys[" "])) {
      panning = true;
      pan0 = { mx: e.clientX, my: e.clientY, cx: cam.x, cy: cam.y };
      e.preventDefault();
      return;
    }
    if (e.button === 2) {
      e.preventDefault();
      issueRightClick(w.x, w.y);
      return;
    }
    if (e.button !== 0) return;
    if (placeMode && BUILD_SPEC[placeMode]) {
      tryPlaceBuilding(placeMode, w.x, w.y);
      e.preventDefault();
      return;
    }
    mouse.left = true;
    box = { x0: w.x, y0: w.y, x1: w.x, y1: w.y, shifted: e.shiftKey };
  }

  function onPointerMove(e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    const w = screenToWorld(e.clientX, e.clientY);
    mouse.wx = w.x;
    mouse.wy = w.y;
    hover = pickAt(w.x, w.y) || pickFoeAt(w.x, w.y) || pickNodeAt(w.x, w.y);
    if (placeMode && BUILD_SPEC[placeMode]) {
      const spec = BUILD_SPEC[placeMode];
      const ok = canPlaceAt(
        clamp((w.x / TILE) | 0, 0, MAP_W - spec.tw),
        clamp((w.y / TILE) | 0, 0, MAP_H - spec.th),
        spec.tw,
        spec.th
      );
      canvas.style.cursor = ok ? "copy" : "not-allowed";
    } else {
      canvas.style.cursor = hover ? "pointer" : "crosshair";
    }

    if (panning && pan0) {
      cam.x = pan0.cx - (e.clientX - pan0.mx) / zoom;
      cam.y = pan0.cy - (e.clientY - pan0.my) / zoom;
      clampCam();
      return;
    }
    if (box && mouse.left) {
      box.x1 = w.x;
      box.y1 = w.y;
    }
  }

  function onPointerUp(e) {
    if (panning && (e.button === 1 || e.button === 0)) {
      panning = false;
      pan0 = null;
      return;
    }
    if (e.button !== 0 || !box) {
      if (e.button === 0) mouse.left = false;
      return;
    }
    const w = Math.abs(box.x1 - box.x0);
    const h = Math.abs(box.y1 - box.y0);
    if (w > 6 || h > 6) {
      const prev = box.shifted ? selected.slice() : [];
      selectBox(box.x0, box.y0, box.x1, box.y1);
      if (box.shifted) {
        const set = new Set(prev);
        for (const s of selected) set.add(s);
        selected = [...set];
      }
    } else {
      const hit = pickAt(box.x0, box.y0);
      if (e.shiftKey && hit) {
        if (selected.includes(hit)) selected = selected.filter((s) => s !== hit);
        else selected = selected.concat(hit);
      } else {
        selected = hit ? [hit] : [];
      }
      if (hit) beep(700, 0.03);
    }
    box = null;
    mouse.left = false;
    syncUi();
  }

  function onWheel(e) {
    e.preventDefault();
    const old = zoom;
    const next = clamp(old + (e.deltaY > 0 ? -1 : 1), 2, 5);
    if (next === old) return;
    const before = screenToWorld(e.clientX, e.clientY);
    zoom = next;
    resize();
    const after = screenToWorld(e.clientX, e.clientY);
    cam.x += before.x - after.x;
    cam.y += before.y - after.y;
    clampCam();
  }

  function updateCamera(dt) {
    let vx = 0;
    let vy = 0;
    if (keys.KeyW || keys.ArrowUp) vy -= 1;
    if (keys.KeyS || keys.ArrowDown) vy += 1;
    if (keys.KeyA || keys.ArrowLeft) vx -= 1;
    if (keys.KeyD || keys.ArrowRight) vx += 1;
    const sp = 220 * dt;
    if (vx || vy) {
      const n = Math.hypot(vx, vy) || 1;
      cam.x += (vx / n) * sp;
      cam.y += (vy / n) * sp;
    }
    if (!panning && document.hasFocus() && mouse.x + mouse.y > 0) {
      const edge = 10;
      if (mouse.x < edge) cam.x -= sp;
      if (mouse.x > window.innerWidth - edge) cam.x += sp;
      if (mouse.y < edge) cam.y -= sp;
      if (mouse.y > window.innerHeight - edge) cam.y += sp;
    }
    clampCam();
  }

  function loop(ts) {
    const dt = Math.min(0.05, (ts - lastT) / 1000 || 0.016);
    lastT = ts;
    updateCamera(dt);
    if (!gameOver) {
      updateHall(dt);
      updateUnits(dt);
      updateCombat(dt);
      updateTowers(dt);
      updateEnemy(dt);
      updateFog();
    }
    for (const p of pings) p.t -= dt;
    pings = pings.filter((p) => p.t > 0);
    drawWorld();
    drawMinimap();
    if ((ts / 100) | 0 !== ((ts - dt * 1000) / 100) | 0) syncUi();
    requestAnimationFrame(loop);
  }

  function bind() {
    window.addEventListener("resize", resize);
    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    canvas.addEventListener("wheel", onWheel, { passive: false });
    mini.addEventListener("pointerdown", (e) => {
      jumpMinimap(e);
      mini.setPointerCapture(e.pointerId);
    });
    mini.addEventListener("pointermove", (e) => {
      if (e.buttons) jumpMinimap(e);
    });
    function bindTrain(el, kind) {
      if (!el) return;
      el.addEventListener("click", () => {
        ensureAudio();
        trainUnit(kind);
      });
    }
    bindTrain(ui.btn, "worker");
    bindTrain(ui.btnMilitia, "militia");
    bindTrain(ui.btnArcher, "archer");
    bindTrain(ui.btnRider, "rider");
    if (ui.btnBarracks) {
      ui.btnBarracks.addEventListener("click", () => {
        ensureAudio();
        if (placeMode === "barracks") {
          placeMode = null;
          canvas.style.cursor = "crosshair";
          syncUi();
        } else {
          enterPlace("barracks");
        }
      });
    }
    if (ui.btnHouse) {
      ui.btnHouse.addEventListener("click", () => {
        ensureAudio();
        if (placeMode === "house") {
          placeMode = null;
          canvas.style.cursor = "crosshair";
          syncUi();
        } else {
          enterPlace("house");
        }
      });
    }
    if (ui.btnTower) {
      ui.btnTower.addEventListener("click", () => {
        ensureAudio();
        if (placeMode === "tower") {
          placeMode = null;
          canvas.style.cursor = "crosshair";
          syncUi();
        } else {
          enterPlace("tower");
        }
      });
    }

    window.addEventListener("keydown", (e) => {
      keys[e.code] = true;
      if (e.code === "Space") {
        keys[" "] = true;
        e.preventDefault();
      }
      if (e.code === "Escape") {
        if (placeMode) {
          placeMode = null;
          canvas.style.cursor = "crosshair";
        } else {
          selected = [];
        }
        syncUi();
      }
      if (e.code === "KeyH") centerOn(hall.x, hall.y);
      if (e.code === "KeyE" && enemyHall) centerOn(enemyHall.x, enemyHall.y);
      if (e.code === "KeyG") {
        const b = readyBarracks() || buildings.find((x) => x.kind === "barracks");
        if (b) {
          centerOn(b.x, b.y);
          selected = [b];
          syncUi();
        }
      }
      if (e.repeat) return;
      if (e.code === "KeyB") {
        enterPlace("barracks");
      }
      if (e.code === "KeyF") {
        enterPlace("house");
      }
      if (e.code === "KeyT") {
        enterPlace("tower");
      }
      if (e.code === "Digit4") {
        trainUnit("rider");
      }
      if (e.code === "Digit1" || e.code === "KeyR") {
        trainUnit("worker");
      }
      if (e.code === "Digit2") {
        trainUnit("militia");
      }
      if (e.code === "Digit3") {
        trainUnit("archer");
      }
    });
    window.addEventListener("keyup", (e) => {
      keys[e.code] = false;
      if (e.code === "Space") keys[" "] = false;
    });
  }

  async function main() {
    ui.bootMsg.textContent = "Рисуем землю…";
    ui.seed.textContent = "карта #" + (seed % 100000);
    try {
      const [
        hallIm,
        barracksIm,
        houseIm,
        goldMineIm,
        orcHallIm,
        orcBarIm,
        towerIm,
        workerIm,
        hillock,
        rock0,
        rock1,
        rock2,
        bush0,
        bush1,
        flag,
      ] = await Promise.all([
        loadImg("assets/buildings/townhall.png"),
        loadImgOpt("assets/buildings/barracks.png"),
        loadImgOpt("assets/buildings/house.png"),
        loadImgOpt("assets/buildings/goldmine.png"),
        loadImgOpt("assets/buildings/orc_hall.png"),
        loadImgOpt("assets/buildings/orc_barracks.png"),
        loadImgOpt("assets/buildings/tower.png"),
        loadImg("assets/units/worker.png"),
        loadImg("assets/props/hillock.png"),
        loadImg("assets/props/rock_0.png"),
        loadImg("assets/props/rock_1.png"),
        loadImg("assets/props/rock_2.png"),
        loadImg("assets/props/bush_0.png"),
        loadImg("assets/props/bush_1.png"),
        loadImg("assets/props/flag.png"),
      ]);
      imgs.hall = hallIm;
      imgs.barracks = barracksIm;
      imgs.house = houseIm;
      imgs.goldMine = goldMineIm;
      imgs.orcHall = orcHallIm;
      imgs.orcBarracks = orcBarIm;
      imgs.tower = towerIm;
      imgs.worker = workerIm;
      imgs.militia = (await loadImgOpt("assets/units/militia.png")) || workerIm;
      imgs.archer = (await loadImgOpt("assets/units/archer.png")) || workerIm;
      imgs.grunt = (await loadImgOpt("assets/units/grunt.png")) || imgs.militia;
      imgs.rider = (await loadImgOpt("assets/units/rider.png")) || imgs.militia;
      imgs.peon = (await loadImgOpt("assets/units/peon.png")) || imgs.worker;
      imgs.hillock = hillock;
      imgs.rock0 = rock0;
      imgs.rock1 = rock1;
      imgs.rock2 = rock2;
      imgs.bush0 = bush0;
      imgs.bush1 = bush1;
      imgs.flag = flag;
    } catch (err) {
      ui.bootMsg.textContent = "Не удалось загрузить ассеты: " + err.message;
      return;
    }

    const [tree0, tree1, stump, goldNode, carryWood, carryGold] = await Promise.all([
      loadImgOpt("assets/props/tree_0.png"),
      loadImgOpt("assets/props/tree_1.png"),
      loadImgOpt("assets/props/tree_stump.png"),
      loadImgOpt("assets/props/gold_node.png"),
      loadImgOpt("assets/ui/carry_wood.png"),
      loadImgOpt("assets/ui/carry_gold.png"),
    ]);
    imgs.tree0 = tree0;
    imgs.tree1 = tree1;
    imgs.treeStump = stump;
    imgs.goldNode = goldNode;
    imgs.carryWood = carryWood;
    imgs.carryGold = carryGold;
    ensureGatherSprites();

    units = [];
    selected = [];
    generateWorld();
    for (let i = 0; i < 3; i++) spawnUnit("grunt", i, enemyHall, 1);
    for (let i = 0; i < 4; i++) spawnUnit("peon", i, enemyHall, 1);
    resize();
    centerOn(hall.x, hall.y - 20);
    bind();
    window.RTS = {
      train: trainWorker,
      selectHall() {
        selected = [hall];
        syncUi();
      },
      get gold() {
        return gold;
      },
      get wood() {
        return wood;
      },
      get workers() {
        return units.length;
      },
      get queue() {
        return hall.queue.length;
      },
      clickWorld(x, y) {
        const hit = pickAt(x, y);
        selected = hit ? [hit] : [];
        syncUi();
        return hit ? hit.kind : null;
      },
      moveSelected(x, y) {
        issueRightClick(x, y);
      },
      finishTrain() {
        for (const b of buildings) {
          if (b.queue && b.queue.length) {
            b.queue[0].t = b.queue[0].dur;
            return;
          }
        }
      },
      finishBuild() {
        for (const b of buildings) {
          if (b.kind !== "hall" && !b.done) {
            b.progress = b.buildTime || BAR_TIME;
            b.done = true;
          }
        }
      },
      placeHouse(x, y) {
        tryPlaceBuilding("house", x, y);
      },
      placeBarracks(x, y) {
        tryPlaceBarracks(x, y);
      },
      barracksPos() {
        const b = buildings.find((x) => x.kind === "barracks");
        return b ? { x: b.x, y: b.y, done: b.done } : null;
      },
      hallPos() {
        return { x: hall.x, y: hall.y };
      },
      enemyPos() {
        return enemyHall ? { x: enemyHall.x, y: enemyHall.y, hp: enemyHall.hp } : null;
      },
      revealAll() {
        if (!fog) return;
        for (let y = 0; y < MAP_H; y++) {
          for (let x = 0; x < MAP_W; x++) {
            fog[y][x] = 2;
            seen[y][x] = 1;
          }
        }
      },
      forceRaid() {
        raidT = 40;
        const g = spawnUnit("grunt", 9, enemyHall, 1);
        if (g) attackTarget(g, hall);
      },
      selectWorkers() {
        selected = units.slice();
        syncUi();
      },
      unitsPos() {
        return units.map((u) => ({ x: u.x, y: u.y, moving: u.moving }));
      },
    };
    syncUi();
    ui.boot.classList.add("hidden");
    lastT = performance.now();
    requestAnimationFrame(loop);
  }

  main();
})();
