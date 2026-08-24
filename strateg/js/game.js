(() => {
  "use strict";

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
  let height, blocked, yard, terrain, miniTerrain;
  let hall, units, props, nodes, selected, rally;
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

  function hallFoot() {
    return {
      x: hall.tx * TILE,
      y: hall.ty * TILE,
      w: HALL_W * TILE,
      h: HALL_H * TILE,
    };
  }

  function hallSpriteRect() {
    const f = hallFoot();
    const sw = imgs.hall.width;
    const sh = imgs.hall.height;
    return {
      x: f.x + f.w / 2 - sw / 2,
      y: f.y + f.h - sh,
      w: sw,
      h: sh,
    };
  }

  function doorPos() {
    const f = hallFoot();
    return { x: f.x + f.w / 2, y: f.y + f.h + 6 };
  }

  function visLift(wx, wy) {
    const tx = clamp((wx / TILE) | 0, 0, MAP_W - 1);
    const ty = clamp((wy / TILE) | 0, 0, MAP_H - 1);
    return height[ty][tx] * 8;
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
    blocked = [];
    yard = [];
    for (let y = 0; y < MAP_H; y++) {
      height[y] = [];
      blocked[y] = [];
      yard[y] = [];
      for (let x = 0; x < MAP_W; x++) {
        let n = fbm(x * 0.07, y * 0.07);
        n = 0.42 + (n - 0.5) * 0.72;
        height[y][x] = clamp(n, 0.08, 0.92);
        blocked[y][x] = false;
        yard[y][x] = false;
      }
    }

    hall = {
      kind: "hall",
      tx: 14,
      ty: 13,
      queue: [],
    };
    hall.x = hall.tx * TILE + (HALL_W * TILE) / 2;
    hall.y = hall.ty * TILE + HALL_H * TILE;

    const cx = hall.tx + HALL_W / 2;
    const cy = hall.ty + HALL_H / 2;
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const d = Math.hypot(x - cx, y - cy);
        if (d < 4.5) {
          const t = (1 - d / 4.5) ** 1.4;
          height[y][x] = lerp(height[y][x], 0.42, t * 0.75);
        }
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
        const r = hash(x + 3, y + 9);
        if ((h > 0.55 && localMax(x, y) && r > 0.42) || (h > 0.5 && r > 0.988)) {
          props.push({
            kind: "prop",
            img: imgs.hillock,
            x: x * TILE + 8,
            y: y * TILE + 12,
          });
        } else if (r > 0.968) {
          const i = (hash(x, y + 4) * 3) | 0;
          props.push({
            kind: "prop",
            img: imgs["rock" + i],
            x: x * TILE + 8,
            y: y * TILE + 10,
          });
        } else if (h < 0.48 && r > 0.94 && r <= 0.972) {
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

  function placeNodes() {
    const goldTargets = [
      { tx: 48, ty: 18 },
      { tx: 10, ty: 46 },
      { tx: 54, ty: 50 },
    ];
    const goldCount = 2 + (hash(7, 9) > 0.4 ? 1 : 0);
    for (let i = 0; i < goldCount; i++) {
      const t = goldTargets[i];
      let placed = false;
      for (let r = 0; r < 14 && !placed; r++) {
        for (let oy = -r; oy <= r && !placed; oy++) {
          for (let ox = -r; ox <= r && !placed; ox++) {
            const tx = t.tx + ox;
            const ty = t.ty + oy;
            if (!tileFree(tx, ty)) continue;
            if (Math.hypot(tx - hall.tx, ty - hall.ty) < 16) continue;
            if (blockedAround(tx, ty) >= 5) continue;
            const hp = 12 + ((hash(tx, ty) * 7) | 0);
            occupyNode(tx, ty, "gold", hp, imgs.goldNode);
            placed = true;
          }
        }
      }
    }

    const treeTarget = 45 + (seed % 26);
    let trees = 0;
    let guard = 0;
    let i = 0;
    while (trees < treeTarget && guard++ < 24000) {
      i++;
      const tx = 2 + ((hash(i * 3 + 11, 17) * (MAP_W - 4)) | 0);
      const ty = 2 + ((hash(i * 5 + 19, 29) * (MAP_H - 4)) | 0);
      if (!tileFree(tx, ty)) continue;
      if (blockedAround(tx, ty) >= 5) continue;
      let nearGold = false;
      for (const n of nodes) {
        if (n.kind === "gold" && Math.abs(n.tx - tx) <= 1 && Math.abs(n.ty - ty) <= 1) {
          nearGold = true;
          break;
        }
      }
      if (nearGold) continue;
      const variant = hash(tx, ty + 2) > 0.55 ? 1 : 0;
      const hp = 3 + ((hash(tx + 2, ty + 8) * 3) | 0);
      occupyNode(tx, ty, "tree", hp, variant ? imgs.tree1 : imgs.tree0);
      trees++;
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
    return u.job && u.job.type === "gather" && u.job.phase === "harvest";
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
        if (job.node.hp > 0) {
          job.node.hp--;
          const res = job.node.kind === "gold" ? "gold" : "wood";
          job.carry = res;
          u.carry = res;
          if (job.node.hp <= 0) depleteNode(job.node);
          beep(res === "gold" ? 240 : 180, 0.05, "square");
        }
        job.phase = "toHall";
        pathToHall(u);
      }
      return;
    }
    if (job.phase === "toHall") {
      if (nearHallDoor(u)) {
        u.path = [];
        if (job.carry === "wood" || u.carry === "wood") {
          wood += WOOD_PAY;
          beep(420, 0.05);
        } else if (job.carry === "gold" || u.carry === "gold") {
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
    if (h < 0.34) {
      const t = h / 0.34;
      r = lerp(70, 92, t);
      g = lerp(78, 118, t);
      b = lerp(32, 46, t);
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

    const lit = 1 + slope * 0.85 + (h - 0.45) * 0.35 + (n - 0.5) * 0.18;
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
    const h = MAP_H * TILE;
    terrain = document.createElement("canvas");
    terrain.width = w;
    terrain.height = h;
    const g = terrain.getContext("2d");
    const img = g.createImageData(w, h);
    const d = img.data;
    const miniData = mctx.createImageData(MAP_W, MAP_H);

    for (let ty = 0; ty < MAP_H; ty++) {
      for (let tx = 0; tx < MAP_W; tx++) {
        let ar = 0, ag = 0, ab = 0;
        for (let ly = 0; ly < TILE; ly++) {
          const py = ty * TILE + ly;
          for (let lx = 0; lx < TILE; lx++) {
            const px = tx * TILE + lx;
            const [r, gv, b] = colorAt(px, py, tx, ty);
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
        const n = TILE * TILE;
        const mi = (ty * MAP_W + tx) * 4;
        miniData.data[mi] = (ar / n) | 0;
        miniData.data[mi + 1] = (ag / n) | 0;
        miniData.data[mi + 2] = (ab / n) | 0;
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

  function spawnUnit(kind, slot) {
    const spec = UNIT_SPEC[kind] || UNIT_SPEC.worker;
    if (units.length >= WORKER_CAP) {
      toast("Лимит населения", true);
      return null;
    }
    const d = doorPos();
    const col = slot % 5;
    const row = (slot / 5) | 0;
    const target = {
      x: rally.x + (col - 2) * 14,
      y: rally.y + row * 14,
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
    if (gold < spec.gold || wood < spec.wood) {
      toast("Недостаточно ресурсов", true);
      beep(90, 0.12, "sawtooth");
      return;
    }
    if (units.length + hall.queue.length >= WORKER_CAP) {
      toast("Лимит населения", true);
      return;
    }
    if (hall.queue.length >= 5) {
      toast("Очередь заполнена", true);
      return;
    }
    gold -= spec.gold;
    wood -= spec.wood;
    hall.queue.push({ t: 0, dur: spec.time, kind });
    selected = [hall];
    trainedOnce = true;
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

    for (const u of units) {
      if (u.job && u.job.type === "gather") updateGatherJob(u, dt);
    }
  }

  function updateHall(dt) {
    if (!hall.queue.length) return;
    const q = hall.queue[0];
    q.t += dt;
    if (q.t >= q.dur) {
      const kind = q.kind || "worker";
      hall.queue.shift();
      spawnUnit(kind, units.length);
      toast((UNIT_SPEC[kind] || UNIT_SPEC.worker).name + " вышел из совета");
      beep(520, 0.07);
    }
  }

  function pickAt(wx, wy) {
    for (let i = units.length - 1; i >= 0; i--) {
      const u = units[i];
      if (wx >= u.x - 10 && wx <= u.x + 10 && wy >= u.y - 22 && wy <= u.y + 4) return u;
    }
    const r = hallSpriteRect();
    if (wx >= r.x && wx <= r.x + r.w && wy >= r.y && wy <= r.y + r.h) return hall;
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
    const r = hallSpriteRect();
    const hx = r.x + r.w / 2;
    const hy = r.y + r.h * 0.7;
    if (hx >= xa && hx <= xb && hy >= ya && hy <= yb) selected = [hall];
    else selected = [];
  }

  function issueRightClick(wx, wy) {
    const workers = selected.filter((s) => s.kind === "worker");
    if (workers.length) {
      const node = pickNodeAt(wx, wy);
      if (node && nodeLive(node)) {
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
      } else {
        const cols = Math.min(workers.length, 5);
        workers.forEach((u, i) => {
          u.job = null;
          const col = i % 5;
          const row = (i / 5) | 0;
          orderMove(u, wx + (col - (cols - 1) / 2) * 14, wy + row * 12);
        });
        pings.push({ x: wx, y: wy, t: 0.45, color: "#7dff6a" });
        beep(640, 0.04);
      }
    } else if (selected.filter((s) => s.kind && s.kind !== "hall").length) {
      const troops = selected.filter((s) => s.kind && s.kind !== "hall");
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
    const r = hallSpriteRect();
    const f = hallFoot();
    const lift = visLift(hall.x, hall.y);
    const sx = (r.x - cam.x) | 0;
    const sy = (r.y - lift - cam.y) | 0;
    drawBuildingShadow((f.x - cam.x) | 0, (f.y + f.h - lift - cam.y) | 0, f.w);
    if (selected.includes(hall)) {
      drawRing(
        (f.x + f.w / 2 - cam.x) | 0,
        (f.y + f.h - lift - cam.y) | 0,
        26,
        7,
        "#7dff6a"
      );
    }
    ctx.drawImage(imgs.hall, sx, sy);
    if (hall.queue.length) {
      const q = hall.queue[0];
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
    ctx.drawImage(terrain, -cam.x | 0, -cam.y | 0);

    const drawables = [];
    for (const p of props) drawables.push({ y: p.y, fn: () => drawProp(p) });
    for (const n of nodes) drawables.push({ y: n.y, fn: () => drawNode(n) });
    drawables.push({ y: hall.y, fn: drawHall });
    for (const u of units) drawables.push({ y: u.y, fn: () => drawWorker(u) });
    drawables.sort((a, b) => a.y - b.y);
    for (const d of drawables) d.fn();

    if (selected.includes(hall) && imgs.flag) {
      const lift = visLift(rally.x, rally.y);
      ctx.drawImage(
        imgs.flag,
        (rally.x - 2 - cam.x) | 0,
        (rally.y - imgs.flag.height - lift - cam.y) | 0
      );
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
    for (const n of nodes) {
      if (n.kind === "tree") mctx.fillStyle = "#163818";
      else if (n.kind === "gold") mctx.fillStyle = "#e8c44a";
      else continue;
      mctx.fillRect((n.x * sx) | 0, (n.y * sy) | 0, 2, 2);
    }
    mctx.fillStyle = "#ffe46a";
    for (const u of units) mctx.fillRect((u.x * sx) | 0, (u.y * sy) | 0, 2, 2);
    mctx.strokeStyle = "#f4f0d8";
    mctx.lineWidth = 1;
    mctx.strokeRect(cam.x * sx, cam.y * sy, canvas.width * sx, canvas.height * sy);
  }

  function syncUi() {
    ui.gold.textContent = gold | 0;
    if (ui.wood) ui.wood.textContent = wood | 0;
    ui.pop.textContent = units.length + " / " + WORKER_CAP;
    const queued = hall.queue.length;
    const popFull = units.length + queued >= WORKER_CAP;
    const queueFull = queued >= 5;
    function setBtn(el, spec) {
      if (!el) return;
      el.disabled = popFull || queueFull || gold < spec.gold || wood < spec.wood;
    }
    setBtn(ui.btn, UNIT_SPEC.worker);
    setBtn(ui.btnMilitia, UNIT_SPEC.militia);
    setBtn(ui.btnArcher, UNIT_SPEC.archer);
    ui.btn.classList.toggle("pulse", selected.includes(hall) && !trainedOnce);

    const troops = selected.filter((s) => s.kind && s.kind !== "hall");
    const workers = troops.filter((s) => s.kind === "worker");
    if (selected.includes(hall)) {
      ui.title.textContent = "Городской совет";
      ui.sub.textContent =
        "1 — рабочий (50з). 2 — ополченец (40з 25д). 3 — лучник (45з 35д). ПКМ — точка сбора.";
      ui.portrait.src = "assets/buildings/townhall.png";
      ui.portrait.style.display = "block";
    } else if (workers.length && workers.length === troops.length) {
      ui.title.textContent = workers.length > 1 ? "Рабочие × " + workers.length : "Рабочий";
      ui.sub.textContent = "ПКМ по дереву/золоту — собирать. ПКМ по земле — идти.";
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
      ui.sub.textContent = "Выберите городской совет. Рабочие рубят деревья и копают золото.";
      ui.portrait.style.display = "none";
    }

    ui.queue.innerHTML = "";
    if (selected.includes(hall)) {
      hall.queue.forEach((q, i) => {
        const pip = document.createElement("div");
        pip.className = "q-pip";
        const bar = document.createElement("i");
        bar.style.width = i === 0 ? ((q.t / q.dur) * 100).toFixed(0) + "%" : "0%";
        pip.appendChild(bar);
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
    canvas.style.cursor = hover ? "pointer" : "crosshair";

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
        selected = [hall];
        trainUnit(kind);
      });
    }
    bindTrain(ui.btn, "worker");
    bindTrain(ui.btnMilitia, "militia");
    bindTrain(ui.btnArcher, "archer");

    window.addEventListener("keydown", (e) => {
      keys[e.code] = true;
      if (e.code === "Space") {
        keys[" "] = true;
        e.preventDefault();
      }
      if (e.code === "Escape") {
        selected = [];
        syncUi();
      }
      if (e.code === "KeyH") centerOn(hall.x, hall.y);
      if (e.repeat) return;
      if (e.code === "Digit1" || e.code === "KeyR") {
        selected = [hall];
        trainUnit("worker");
      }
      if (e.code === "Digit2") {
        selected = [hall];
        trainUnit("militia");
      }
      if (e.code === "Digit3") {
        selected = [hall];
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
        if (hall.queue.length) hall.queue[0].t = hall.queue[0].dur;
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
