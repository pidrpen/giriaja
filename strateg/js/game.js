(() => {
  "use strict";
  if (globalThis.__STRATEG_STARTED) return;
  globalThis.__STRATEG_STARTED = true;

  const TILE = 16;
  const MAP_W = 72;
  const MAP_H = 72;
  const HALL_W = 5;
  const HALL_H = 4;
  const WORKER_COST = 50;
  const WORKER_TIME = 5;
  const WORKER_CAP = 30;
  const START_GOLD = 250;
  const START_WOOD = 80;
  const HARVEST_TIME = 1.2;
  const WOOD_PAY = 8;
  const GOLD_PAY = 10;
  const SPEED = 52;
  const UNIT_R = 6;
  const CELL = 24;
  const UNIT_SPEC = {
    worker: { gold: 50, wood: 0, time: 5, speed: 52, name: "Рабочий", sheet: "worker" },
    militia: { gold: 40, wood: 25, time: 7, speed: 46, name: "Ополченец", sheet: "militia" },
    archer: { gold: 45, wood: 35, time: 8, speed: 48, name: "Лучник", sheet: "archer" },
  };
  const BAR_W = 5;
  const BAR_H = 3;
  const BAR_GOLD = 100;
  const BAR_WOOD = 50;
  const BAR_TIME = 12;
  const BAR_MAX = 4;
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
    wrapWorker: document.getElementById("wrap-worker"),
    wrapBarracks: document.getElementById("wrap-barracks"),
    wrapMilitia: document.getElementById("wrap-militia"),
    wrapArcher: document.getElementById("wrap-archer"),
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
  let hall, units, props, nodes, selected, rally, buildings;
  let placeMode = null;
  let box = null;
  let panning = false;
  let pan0 = null;
  let pings = [];
  let lastT = 0;
  let hover = null;
  let audioCtx = null;
  let trainedOnce = false;
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
    return b.kind === "barracks" ? imgs.barracks : imgs.hall;
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

  function isUnit(s) {
    return !!(s && UNIT_SPEC[s.kind]);
  }

  function queuedCount() {
    let n = 0;
    for (const b of buildings) n += (b.queue || []).length;
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
    for (let y = 0; y < th; y++) {
      for (let x = 0; x < tw; x++) {
        if (isBlocked(tx + x, ty + y)) return false;
      }
    }
    for (const p of props) {
      const px = (p.x / TILE) | 0;
      const py = (p.y / TILE) | 0;
      if (px >= tx && px < tx + tw && py >= ty && py < ty + th) return false;
    }
    return true;
  }

  function tryPlaceBarracks(wx, wy) {
    if (buildings.filter((b) => b.kind === "barracks").length >= BAR_MAX) {
      toast("Лимит казарм", true);
      return;
    }
    if (gold < BAR_GOLD || wood < BAR_WOOD) {
      toast("Недостаточно ресурсов", true);
      beep(90, 0.12, "sawtooth");
      return;
    }
    const tx = clamp((wx / TILE) | 0, 0, MAP_W - BAR_W);
    const ty = clamp((wy / TILE) | 0, 0, MAP_H - BAR_H);
    if (!canPlaceAt(tx, ty, BAR_W, BAR_H)) {
      toast("Здесь не построить", true);
      return;
    }
    gold -= BAR_GOLD;
    wood -= BAR_WOOD;
    const b = {
      kind: "barracks",
      tx,
      ty,
      tw: BAR_W,
      th: BAR_H,
      queue: [],
      done: false,
      progress: 0,
    };
    b.x = b.tx * TILE + (BAR_W * TILE) / 2;
    b.y = b.ty * TILE + BAR_H * TILE;
    const d = bldgDoor(b);
    b.rally = { x: d.x, y: d.y + 28 };
    occupyBldg(b, true);
    buildings.push(b);
    const workers = selected.filter((s) => s.kind === "worker");
    workers.forEach((u) => {
      u.job = { type: "build", building: b, phase: "go" };
      orderMove(u, d.x, d.y + 8);
    });
    placeMode = null;
    canvas.style.cursor = "crosshair";
    selected = [b];
    toast(workers.length ? "Строим казармы" : "Казармы заложены — пришлите рабочих");
    beep(320, 0.06);
    syncUi();
  }

  function enterPlaceBarracks() {
    const workers = selected.filter((s) => s.kind === "worker");
    if (!workers.length && !selected.includes(hall)) {
      toast("Выберите рабочих", true);
      return;
    }
    if (gold < BAR_GOLD || wood < BAR_WOOD) {
      toast("Нужно 100 золота и 50 дерева", true);
      beep(90, 0.12, "sawtooth");
      return;
    }
    placeMode = "barracks";
    toast("ЛКМ — поставить казармы · ПКМ — отмена");
    syncUi();
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
      [36 + hash(1, 2) * 8, 12 + hash(3, 4) * 6, 11, 0.72],
      [56 + hash(5, 6) * 6, 24 + hash(7, 8) * 8, 13, 0.85],
      [18 + hash(9, 1) * 6, 46 + hash(2, 8) * 8, 12, 0.7],
      [50 + hash(4, 5) * 8, 52 + hash(6, 7) * 6, 10, 0.64],
      [8 + hash(8, 3) * 5, 28 + hash(1, 9) * 8, 9, 0.55],
      [42 + hash(2, 6) * 6, 34 + hash(9, 4) * 6, 8, 0.4],
    ];
    for (const [cx, cy, r, a] of hills) stampBump(cx, cy, r, a);
    stampBump(28 + hash(3, 7) * 6, 22, 9, -0.38);
    stampBump(62, 8 + hash(4, 1) * 5, 7, -0.28);
    stampBump(12, 58, 8, -0.22);

    hall = {
      kind: "hall",
      tx: 14,
      ty: 13,
      tw: HALL_W,
      th: HALL_H,
      queue: [],
      done: true,
    };
    hall.x = hall.tx * TILE + (HALL_W * TILE) / 2;
    hall.y = hall.ty * TILE + HALL_H * TILE;
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
    for (let y = hall.ty - 2; y < hall.ty + HALL_H + 4; y++) {
      for (let x = hall.tx - 2; x < hall.tx + HALL_W + 2; x++) {
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

    for (let y = hall.ty + HALL_H; y < hall.ty + HALL_H + 2; y++) {
      for (let x = hall.tx + 1; x < hall.tx + HALL_W - 1; x++) {
        if (y >= 0 && y < MAP_H && x >= 0 && x < MAP_W) yard[y][x] = true;
      }
    }

    const d0 = doorPos();
    rally = { x: d0.x, y: d0.y + 36 };

    props = [];
    nodes = [];
    placeProps();
    placeNodes();
    prerenderTerrain();
  }

  function nearHall(tx, ty) {
    return (
      tx >= hall.tx - 1 &&
      tx < hall.tx + HALL_W + 1 &&
      ty >= hall.ty - 1 &&
      ty < hall.ty + HALL_H + 4
    );
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

  function occupyNode(tx, ty, kind, hp, img) {
    blocked[ty][tx] = true;
    const n = {
      kind,
      tx,
      ty,
      x: tx * TILE + TILE / 2,
      y: ty * TILE + TILE - 1,
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

  function placeNodes() {
    const goldVeins = [
      { tx: hall.tx + 16, ty: hall.ty + 8, n: 5 },
      { tx: 52, ty: 16, n: 6 },
      { tx: 10, ty: 50, n: 5 },
      { tx: 56, ty: 50, n: 4 },
    ];
    for (const v of goldVeins) {
      const spots = scatterTiles(v.tx, v.ty, 2.4, v.n, (tx, ty) => {
        if (!tileFree(tx, ty)) return false;
        if (elev[ty][tx] >= 4) return false;
        if (Math.hypot(tx - hall.tx, ty - hall.ty) < 10) return false;
        return blockedAround(tx, ty) < 5;
      });
      for (const [tx, ty] of spots) {
        const hp = 14 + ((hash(tx, ty) * 8) | 0);
        occupyNode(tx, ty, "gold", hp, imgs.goldNode);
      }
    }

    const groves = [
      { tx: hall.tx + 9, ty: hall.ty + 7, n: 12, r: 3.2 },
      { tx: hall.tx - 4, ty: hall.ty + 10, n: 9, r: 2.8 },
      { tx: 34, ty: 10, n: 16, r: 4.2 },
      { tx: 58, ty: 22, n: 14, r: 3.8 },
      { tx: 8, ty: 36, n: 15, r: 4 },
      { tx: 24, ty: 54, n: 18, r: 4.5 },
      { tx: 48, ty: 46, n: 16, r: 4 },
      { tx: 62, ty: 58, n: 12, r: 3.4 },
      { tx: 40, ty: 28, n: 11, r: 3.2 },
    ];
    for (const g of groves) {
      const spots = scatterTiles(g.tx, g.ty, g.r, g.n, (tx, ty) => {
        if (!tileFree(tx, ty)) return false;
        if (elev[ty][tx] >= 4) return false;
        if (blockedAround(tx, ty) >= 5) return false;
        for (const n of nodes) {
          if (n.kind === "gold" && Math.abs(n.tx - tx) <= 1 && Math.abs(n.ty - ty) <= 1) return false;
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
    const dirs = [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ];
    const spots = [];
    for (const [dx, dy] of dirs) {
      const tx = node.tx + dx;
      const ty = node.ty + dy;
      if (!isBlocked(tx, ty)) {
        spots.push({ tx, ty, x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 });
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

  function pathToHall(u) {
    const d = doorPos();
    orderMove(u, d.x, d.y);
  }

  function nearNode(u, node) {
    const utx = clamp((u.x / TILE) | 0, 0, MAP_W - 1);
    const uty = clamp((u.y / TILE) | 0, 0, MAP_H - 1);
    if (Math.abs(utx - node.tx) <= 1 && Math.abs(uty - node.ty) <= 1) return true;
    return Math.hypot(u.x - node.x, u.y - node.y) < TILE + 8;
  }

  function nearHallDoor(u) {
    const d = doorPos();
    if (Math.hypot(u.x - d.x, u.y - d.y) < 16) return true;
    const f = hallFoot();
    return (
      u.y >= f.y + f.h - 4 &&
      u.y <= f.y + f.h + 22 &&
      u.x >= f.x - 6 &&
      u.x <= f.x + f.w + 6
    );
  }

  function depleteNode(n) {
    n.hp = 0;
    if (n.ty >= 0 && n.ty < MAP_H && n.tx >= 0 && n.tx < MAP_W) blocked[n.ty][n.tx] = false;
    if (n.kind === "tree") {
      n.kind = "stump";
      n.img = imgs.treeStump;
    } else if (n.kind === "gold") {
      const i = nodes.indexOf(n);
      if (i >= 0) nodes.splice(i, 1);
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
          wood += WOOD_PAY;
          beep(420, 0.05);
        } else if (got === "gold") {
          gold += GOLD_PAY;
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
      r = lerp(58, 86, t);
      g = lerp(72, 108, t);
      b = lerp(28, 42, t);
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
      d[i] = 12;
      d[i + 1] = 8;
      d[i + 2] = 6;
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
        const es = ty + 1 < MAP_H ? elev[ty + 1][tx] : 0;
        if (e > es) {
          const faceH = (e - es) * LIFT_STEP;
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

  function spawnUnit(kind, slot, fromBldg) {
    const spec = UNIT_SPEC[kind] || UNIT_SPEC.worker;
    if (units.length >= WORKER_CAP) {
      toast("Лимит населения", true);
      return null;
    }
    const src = fromBldg || hall;
    const d = bldgDoor(src);
    const rallyPt = src.kind === "hall" ? rally : src.rally || { x: d.x, y: d.y + 28 };
    const col = slot % 5;
    const row = (slot / 5) | 0;
    const target = {
      x: rallyPt.x + (col - 2) * 14,
      y: rallyPt.y + row * 14,
    };
    const u = {
      kind,
      x: d.x + (hash(slot, units.length) - 0.5) * 8,
      y: d.y,
      dir: 0,
      moving: false,
      path: [],
      walkT: 0,
      speed: spec.speed,
      job: null,
      carry: null,
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
    if (units.length + queuedCount() >= WORKER_CAP) {
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
    if (b.progress >= BAR_TIME) {
      b.done = true;
      toast("Казармы готовы");
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
      if (b.kind === "barracks" && !b.done && (b.progress || 0) >= BAR_TIME) {
        b.done = true;
        toast("Казармы готовы");
        beep(520, 0.08);
        for (const o of units) {
          if (o.job && o.job.type === "build" && o.job.building === b) o.job = null;
        }
      }
      if (b.kind !== "barracks" || !b.done || !b.queue.length) continue;
      const q = b.queue[0];
      q.t += dt;
      if (q.t >= q.dur) {
        const kind = q.kind || "militia";
        b.queue.shift();
        spawnUnit(kind, units.length, b);
        toast((UNIT_SPEC[kind] || UNIT_SPEC.militia).name + " вышел из казарм");
        beep(520, 0.07);
      }
    }
  }

  function pickAt(wx, wy) {
    for (let i = units.length - 1; i >= 0; i--) {
      const u = units[i];
      if (wx >= u.x - 10 && wx <= u.x + 10 && wy >= u.y - 22 && wy <= u.y + 4) return u;
    }
    for (let i = buildings.length - 1; i >= 0; i--) {
      const b = buildings[i];
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
    const hit = units.filter((u) => u.x >= xa && u.x <= xb && u.y >= ya && u.y <= yb);
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
    const troops = selected.filter((s) => isUnit(s));
    const node = pickNodeAt(wx, wy);
    const bldgHit = pickAt(wx, wy);
    if (workers.length && bldgHit && bldgHit.kind === "barracks" && !bldgHit.done) {
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

  function drawWorker(u) {
    const lift = visLift(u.x, u.y);
    const sx = (u.x - cam.x) | 0;
    const sy = (u.y - lift - cam.y) | 0;
    if (selected.includes(u)) drawRing(sx, sy + 2, 8, 3, "#7dff6a");
    drawShadow(sx, sy + 2, 6, 2);
    const frame = u.moving ? ((u.walkT * 6) | 0) % 4 : 0;
    const sheet = imgs[u.kind] || imgs.worker;
    ctx.drawImage(sheet, frame * CELL, u.dir * CELL, CELL, CELL, sx - 12, sy - 16, CELL, CELL);
    drawCarry(u, sx, sy);
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

  function drawBldg(b) {
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
      ctx.globalAlpha = b.done === false ? 0.45 + Math.min(0.5, (b.progress || 0) / BAR_TIME) : 1;
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
      ctx.fillRect(bx, by, (((b.progress || 0) / BAR_TIME) * bw) | 0, 4);
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
    for (const p of props) drawables.push({ y: p.y, fn: () => drawProp(p) });
    for (const n of nodes) drawables.push({ y: n.y, fn: () => drawNode(n) });
    for (const b of buildings) drawables.push({ y: b.y, fn: () => drawBldg(b) });
    for (const u of units) drawables.push({ y: u.y, fn: () => drawWorker(u) });
    drawables.sort((a, b) => a.y - b.y);
    for (const d of drawables) d.fn();

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

    if (placeMode === "barracks" && imgs.barracks) {
      const tx = clamp((mouse.wx / TILE) | 0, 0, MAP_W - BAR_W);
      const ty = clamp((mouse.wy / TILE) | 0, 0, MAP_H - BAR_H);
      const ok = canPlaceAt(tx, ty, BAR_W, BAR_H);
      const fake = { kind: "barracks", tx, ty, tw: BAR_W, th: BAR_H, x: tx * TILE + (BAR_W * TILE) / 2, y: ty * TILE + BAR_H * TILE, done: false };
      const r = bldgSpriteRect(fake);
      const f = bldgFoot(fake);
      const lift = visLift(fake.x, fake.y);
      ctx.globalAlpha = 0.55;
      ctx.drawImage(imgs.barracks, (r.x - cam.x) | 0, (r.y - lift - cam.y) | 0);
      ctx.globalAlpha = 1;
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

  function drawMinimap() {
    mctx.imageSmoothingEnabled = false;
    mctx.drawImage(miniTerrain, 0, 0, mini.width, mini.height);
    const sx = mini.width / (MAP_W * TILE);
    const sy = mini.height / (MAP_H * TILE);
    mctx.fillStyle = "#c47848";
    const f = hallFoot();
    mctx.fillRect(f.x * sx, f.y * sy, f.w * sx, f.h * sy);
    for (const b of buildings) {
      if (b.kind !== "barracks") continue;
      const bf = bldgFoot(b);
      mctx.fillStyle = b.done ? "#8b2a2a" : "#5a3820";
      mctx.fillRect(bf.x * sx, bf.y * sy, bf.w * sx, bf.h * sy);
    }
    for (const n of nodes) {
      if (n.kind === "tree") {
        mctx.fillStyle = "#163818";
        mctx.fillRect((n.x * sx) | 0, (n.y * sy) | 0, 2, 2);
      } else if (n.kind === "gold") {
        mctx.fillStyle = "#e8c44a";
        mctx.fillRect((n.x * sx) | 0, (n.y * sy) | 0, 3, 3);
      }
    }
    mctx.fillStyle = "#ffe46a";
    for (const u of units) mctx.fillRect((u.x * sx) | 0, (u.y * sy) | 0, 2, 2);
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
    ui.pop.textContent = units.length + " / " + WORKER_CAP;
    const queued = queuedCount();
    const popFull = units.length + queued >= WORKER_CAP;
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
    if (ui.btnBarracks) {
      ui.btnBarracks.disabled =
        gold < BAR_GOLD ||
        wood < BAR_WOOD ||
        buildings.filter((b) => b.kind === "barracks").length >= BAR_MAX;
    }
    ui.btn.classList.toggle("pulse", selected.includes(hall) && !trainedOnce);
    if (ui.btnBarracks) ui.btnBarracks.classList.toggle("pulse", placeMode === "barracks");

    const troops = selected.filter((s) => isUnit(s));
    const workers = troops.filter((s) => s.kind === "worker");
    const hallSel = selected.includes(hall);
    const barSel = !!bar;
    showWrap(ui.wrapWorker, hallSel);
    showWrap(ui.wrapBarracks, hallSel || (workers.length > 0 && workers.length === troops.length));
    showWrap(ui.wrapMilitia, barSel && bar.done);
    showWrap(ui.wrapArcher, barSel && bar.done);

    if (hallSel) {
      ui.title.textContent = "Городской совет";
      ui.sub.textContent = "1 — рабочий (50з). B — казармы (100з 50д). ПКМ — точка сбора.";
      ui.portrait.src = "assets/buildings/townhall.png";
      ui.portrait.style.display = "block";
    } else if (barSel && !bar.done) {
      ui.title.textContent = "Казармы (стройка)";
      ui.sub.textContent =
        "Готово на " + Math.min(100, (((bar.progress || 0) / BAR_TIME) * 100) | 0) + "%. Пришлите рабочих ПКМ.";
      ui.portrait.src = "assets/buildings/barracks.png";
      ui.portrait.style.display = "block";
    } else if (barSel) {
      ui.title.textContent = "Казармы";
      ui.sub.textContent = "2 — ополченец (40з 25д). 3 — лучник (45з 35д). ПКМ — точка сбора.";
      ui.portrait.src = "assets/buildings/barracks.png";
      ui.portrait.style.display = "block";
    } else if (workers.length && workers.length === troops.length) {
      ui.title.textContent = workers.length > 1 ? "Рабочие × " + workers.length : "Рабочий";
      ui.sub.textContent = "ПКМ по дереву/золоту — собирать. B — казармы. ПКМ по стройке — строить.";
      ui.portrait.src = "assets/ui/btn_worker.png";
      ui.portrait.style.display = "block";
    } else if (troops.length) {
      const k = troops[0].kind;
      const spec = UNIT_SPEC[k];
      ui.title.textContent = troops.length > 1 ? "Отряд × " + troops.length : spec ? spec.name : k;
      ui.sub.textContent = "ПКМ по земле — идти.";
      ui.portrait.src = k === "archer" ? "assets/ui/btn_archer.png" : "assets/ui/btn_militia.png";
      ui.portrait.style.display = "block";
    } else {
      ui.title.textContent = "Ничего не выбрано";
      ui.sub.textContent = "Совет нанимает рабочих. Казармы — ополченцев и лучников.";
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
    if (placeMode === "barracks") {
      tryPlaceBarracks(w.x, w.y);
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
    hover = pickAt(w.x, w.y) || pickNodeAt(w.x, w.y);
    canvas.style.cursor = placeMode ? (canPlaceAt(clamp((w.x / TILE) | 0, 0, MAP_W - BAR_W), clamp((w.y / TILE) | 0, 0, MAP_H - BAR_H), BAR_W, BAR_H) ? "copy" : "not-allowed") : hover ? "pointer" : "crosshair";

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
    updateHall(dt);
    updateUnits(dt);
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
    if (ui.btnBarracks) {
      ui.btnBarracks.addEventListener("click", () => {
        ensureAudio();
        if (placeMode === "barracks") {
          placeMode = null;
          canvas.style.cursor = "crosshair";
          syncUi();
        } else {
          enterPlaceBarracks();
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
        enterPlaceBarracks();
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
      imgs.worker = workerIm;
      imgs.militia = (await loadImgOpt("assets/units/militia.png")) || workerIm;
      imgs.archer = (await loadImgOpt("assets/units/archer.png")) || workerIm;
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
          if (b.kind === "barracks" && !b.done) {
            b.progress = BAR_TIME;
            b.done = true;
          }
        }
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
