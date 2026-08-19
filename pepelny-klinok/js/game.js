"use strict";

(() => {
  const VW = 384;
  const VH = 216;
  const T = 16;
  const MW = 120;
  const MH = 68;
  const WORLD_W = MW * T;
  const WORLD_H = MH * T;

  const TILE = { GRASS: 0, DIRT: 1, COBBLE: 2, WALL: 3 };

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  const hud = document.getElementById("hud");
  const hpFill = document.getElementById("hpFill");
  const hpText = document.getElementById("hpText");
  const stamFill = document.getElementById("stamFill");
  const flaskCount = document.getElementById("flaskCount");
  const relicIcon = document.getElementById("relicIcon");
  const killHud = document.getElementById("killHud");
  const comboHud = document.getElementById("comboHud");
  const questTitle = document.getElementById("questTitle");
  const questBody = document.getElementById("questBody");
  const promptEl = document.getElementById("prompt");
  const titleScreen = document.getElementById("titleScreen");
  const dialogEl = document.getElementById("dialog");
  const dlgName = document.getElementById("dlgName");
  const dlgText = document.getElementById("dlgText");
  const dlgChoices = document.getElementById("dlgChoices");
  const pauseScreen = document.getElementById("pauseScreen");
  const deadScreen = document.getElementById("deadScreen");
  const endScreen = document.getElementById("endScreen");
  const endText = document.getElementById("endText");
  const toastEl = document.getElementById("toast");
  const app = document.getElementById("app");

  const keys = new Set();
  const just = new Set();


  const img = {};
  const heroWalk = [];
  const heroAtk = [];
  const skelWalk = [];
  const ghoulWalk = [];

  let mode = "title";
  let last = 0;


  const cam = { x: 0, y: 0, shake: 0 };
  let hitstop = 0;
  let toastT = 0;

  let map;
  const entities = [];
  const particles = [];
  const floaters = [];

  let player;
  let interactable = null;
  let dialog = null;

  const quest = {
    bones: "idle",
    woods: "idle",
    relic: "idle",
    lord: "idle",
    skelKills: 0,
    ghoulKills: 0,
  };

  const flags = {
    villageChest: false,
    woodsChest: false,
    graveChest: false,
    relicTaken: false,
    wraithAwake: false,
    ending: false,
    woodsWave: false,
    graveWave: false,
    chapelWave: false,
    villageRaid: false,
    bossAdds: false,
  };

  const combat = {
    kills: 0,
    combo: 0,
    comboT: 0,
    furyT: 0,
  };

  let restX = 0;
  let restY = 0;
  let audioCtx = null;
  let muted = false;
  let lightCanvas;
  let lightCtx;

  function mulberry(seed) {
    let a = seed >>> 0;
    return () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clamp(v, a, b) {
    return v < a ? a : v > b ? b : v;
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function dist(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.hypot(dx, dy);
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error(src));
      i.src = src;
    });
  }

  async function loadAll() {
    const stills = [
      "hero_idle_front",
      "hero_idle_side",
      "hero_idle_back",
      "skel_idle",
      "ghoul_idle",
      "wraith_idle",
      "npc_elder",
      "prop_tree",
      "prop_grave",
      "prop_house",
      "prop_chapel",
      "prop_chest",
      "prop_campfire",
      "item_flask",
      "item_relic",
      "tile_dirt",
      "tile_grass",
      "tile_cobble",
      "tile_wall",
    ];
    const jobs = stills.map(async (name) => {
      img[name] = await loadImage(`assets/game/${name}.png`);
    });
    for (let i = 0; i < 8; i++) {
      jobs.push(
        loadImage(`assets/game/hero_walk_${i}.png`).then((im) => (heroWalk[i] = im))
      );
      jobs.push(
        loadImage(`assets/game/hero_atk_${i}.png`).then((im) => (heroAtk[i] = im))
      );
      jobs.push(
        loadImage(`assets/game/skel_walk_${i}.png`).then((im) => (skelWalk[i] = im))
      );
      jobs.push(
        loadImage(`assets/game/ghoul_walk_${i}.png`).then((im) => (ghoulWalk[i] = im))
      );
    }
    await Promise.all(jobs);
  }

  function ensureAudio() {
    if (audioCtx || muted) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    audioCtx = new AC();
  }

  function beep(freq, dur, type, vol, slide) {
    if (!audioCtx || muted) return;
    const t0 = audioCtx.currentTime;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type || "square";
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
    g.gain.setValueAtTime(vol || 0.04, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  function noiseBurst(dur, vol) {
    if (!audioCtx || muted) return;
    const n = audioCtx.sampleRate * dur;
    const buf = audioCtx.createBuffer(1, n, audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = audioCtx.createBufferSource();
    const g = audioCtx.createGain();
    const f = audioCtx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = 900;
    src.buffer = buf;
    g.gain.value = vol || 0.08;
    src.connect(f);
    f.connect(g);
    g.connect(audioCtx.destination);
    src.start();
  }

  function sfx(name) {
    ensureAudio();
    if (name === "slash") {
      noiseBurst(0.08, 0.07);
      beep(220, 0.12, "sawtooth", 0.03, 90);
    } else if (name === "hit") {
      beep(90, 0.1, "square", 0.05, 40);
      noiseBurst(0.06, 0.1);
    } else if (name === "hurt") {
      beep(140, 0.16, "square", 0.05, 50);
    } else if (name === "death") {
      beep(80, 0.4, "sawtooth", 0.05, 30);
    } else if (name === "pickup") {
      beep(520, 0.08, "square", 0.04);
      beep(780, 0.12, "square", 0.03);
    } else if (name === "ui") {
      beep(260, 0.05, "square", 0.03);
    } else if (name === "quest") {
      beep(392, 0.1, "square", 0.04);
      beep(523, 0.16, "square", 0.04);
    } else if (name === "heal") {
      beep(330, 0.12, "sine", 0.04, 660);
    } else if (name === "roar") {
      beep(60, 0.5, "sawtooth", 0.06, 40);
      noiseBurst(0.3, 0.12);
    } else if (name === "combo") {
      beep(440, 0.06, "square", 0.035);
      beep(660, 0.08, "square", 0.03);
    } else if (name === "fury") {
      beep(110, 0.2, "sawtooth", 0.05, 220);
    }
  }

  function toast(msg, t) {
    toastEl.textContent = msg;
    toastEl.classList.remove("hidden");
    toastT = t || 2.2;
  }

  function tileAt(px, py) {
    const tx = Math.floor(px / T);
    const ty = Math.floor(py / T);
    if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) return TILE.WALL;
    return map[ty][tx];
  }

  function blockedTile(px, py) {
    return tileAt(px, py) === TILE.WALL;
  }

  function bodyHits(x, y, hw, hh) {
    const pts = [
      [x - hw, y - hh],
      [x + hw, y - hh],
      [x - hw, y + hh * 0.2],
      [x + hw, y + hh * 0.2],
      [x, y],
    ];
    for (const [px, py] of pts) {
      if (blockedTile(px, py)) return true;
    }
    for (const e of entities) {
      if (!e.solid || e.dead) continue;
      if (Math.abs(x - e.x) < hw + e.hw && Math.abs(y - e.y) < hh + e.hh) return true;
    }
    return false;
  }

  function moveEnt(e, dx, dy) {
    if (dx) {
      e.x += dx;
      if (bodyHits(e.x, e.y, e.hw, e.hh)) e.x -= dx;
    }
    if (dy) {
      e.y += dy;
      if (bodyHits(e.x, e.y, e.hw, e.hh)) e.y -= dy;
    }
  }

  function addEnt(e) {
    entities.push(e);
    return e;
  }

  function prop(kind, x, y, extra) {
    const sizes = {
      tree: { img: "prop_tree", scale: 0.7, hw: 6, hh: 5, solid: true },
      grave: { img: "prop_grave", scale: 0.85, hw: 7, hh: 4, solid: true },
      house: { img: "prop_house", scale: 0.72, hw: 22, hh: 10, solid: true },
      chapel: { img: "prop_chapel", scale: 0.78, hw: 24, hh: 10, solid: true },
      chest: { img: "prop_chest", scale: 0.7, hw: 8, hh: 5, solid: true },
      fire: { img: "prop_campfire", scale: 0.7, hw: 6, hh: 4, solid: false },
    };
    const s = sizes[kind];
    return addEnt(
      Object.assign(
        {
          kind: "prop",
          prop: kind,
          x,
          y,
          z: 0,
          imgKey: s.img,
          scale: s.scale,
          hw: s.hw,
          hh: s.hh,
          solid: s.solid,
          dead: false,
        },
        extra || {}
      )
    );
  }

  function makeEnemy(type, x, y, extra) {
    const table = {
      skel: {
        hp: 26,
        maxHp: 26,
        dmg: 9,
        speed: 36,
        aggro: 110,
        range: 17,
        scale: 0.62,
        hw: 7,
        hh: 5,
        walk: skelWalk,
        idle: "skel_idle",
        quest: "skel",
      },
      ghoul: {
        hp: 16,
        maxHp: 16,
        dmg: 7,
        speed: 52,
        aggro: 120,
        range: 15,
        scale: 0.62,
        hw: 8,
        hh: 5,
        walk: ghoulWalk,
        idle: "ghoul_idle",
        quest: "ghoul",
      },
      brute: {
        hp: 80,
        maxHp: 80,
        dmg: 14,
        speed: 34,
        aggro: 130,
        range: 20,
        scale: 0.88,
        hw: 10,
        hh: 7,
        walk: ghoulWalk,
        idle: "ghoul_idle",
        quest: "ghoul",
      },
      wraith: {
        hp: 220,
        maxHp: 220,
        dmg: 15,
        speed: 30,
        aggro: 150,
        range: 24,
        scale: 0.72,
        hw: 12,
        hh: 8,
        walk: null,
        idle: "wraith_idle",
        quest: "lord",
        boss: true,
      },
    };
    const t = table[type];
    return addEnt(Object.assign({
      kind: "enemy",
      type,
      x,
      y,
      vx: 0,
      vy: 0,
      hp: t.hp,
      maxHp: t.maxHp,
      dmg: t.dmg,
      speed: t.speed,
      aggro: t.aggro,
      range: t.range,
      scale: t.scale,
      hw: t.hw,
      hh: t.hh,
      walk: t.walk,
      idle: t.idle,
      questTag: t.quest,
      boss: !!t.boss,
      ai: "idle",
      wind: 0,
      rec: 0,
      stun: 0,
      flash: 0,
      face: 1,
      anim: 0,
      dead: false,
      solid: false,
      asleep: type === "wraith",
      homeX: x,
      homeY: y,
      summoned: false,
    }, extra || {}));
  }

  function liveEnemies() {
    let n = 0;
    for (const e of entities) if (e.kind === "enemy" && !e.dead) n++;
    return n;
  }

  function spawnHorde(type, cx, cy, n, spread, extra) {
    const cap = 42;
    let made = 0;
    for (let i = 0; i < n; i++) {
      if (liveEnemies() >= cap) break;
      const a = Math.random() * Math.PI * 2;
      const r = 12 + Math.random() * spread;
      const x = clamp(cx + Math.cos(a) * r, T * 6, WORLD_W - T * 6);
      const y = clamp(cy + Math.sin(a) * r, T * 6, WORLD_H - T * 6);
      if (blockedTile(x, y)) continue;
      const e = makeEnemy(type, x, y, extra);
      e.ai = "chase";
      e.asleep = false;
      made++;
    }
    return made;
  }

  function spawnDrop(x, y) {
    addEnt({
      kind: "drop",
      x,
      y,
      hw: 6,
      hh: 4,
      scale: 0.7,
      imgKey: "item_flask",
      solid: false,
      dead: false,
      bob: Math.random() * 6,
    });
  }

  function burst(x, y, color, n, spd) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = Math.random() * spd;
      particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 8,
        life: 0.3 + Math.random() * 0.4,
        max: 0.7,
        color,
        size: 1 + (Math.random() * 2) | 0,
      });
    }
  }

  function floater(x, y, text, color) {
    floaters.push({ x, y, text, color, life: 0.8 });
  }

  function buildMap() {
    const rng = mulberry(0xA5E1);
    map = [];
    for (let y = 0; y < MH; y++) {
      const row = new Array(MW);
      for (let x = 0; x < MW; x++) {
        let t = TILE.GRASS;
        if (x < 4 || y < 3 || x >= MW - 4 || y >= MH - 3) t = TILE.WALL;
        else if (x >= 84 && x < 114 && y >= 16 && y < 52) t = TILE.COBBLE;
        else if (x >= 56 && x < 86 && y >= 16 && y < 54) t = TILE.DIRT;
        else if (x >= 6 && x < 30 && y >= 20 && y < 48) t = TILE.COBBLE;
        if (y >= 31 && y <= 35 && x >= 22 && x < 102) t = TILE.DIRT;
        if (x >= 6 && x < 30 && y >= 20 && y < 48 && rng() > 0.82) t = TILE.DIRT;
        row[x] = t;
      }
      map.push(row);
    }

    entities.length = 0;

    const tree = (x, y) => prop("tree", x, y);
    for (let i = 0; i < 70; i++) {
      const tx = 30 + ((rng() * 26) | 0);
      const ty = 8 + ((rng() * 52) | 0);
      if (ty >= 30 && ty <= 36) continue;
      if (map[ty][tx] === TILE.WALL) continue;
      tree(tx * T + 8, ty * T + 12);
    }
    for (let i = 0; i < 18; i++) {
      const tx = 8 + ((rng() * 18) | 0);
      const ty = 8 + ((rng() * 12) | 0);
      if (map[ty] && map[ty][tx] !== TILE.WALL) tree(tx * T + 8, ty * T + 12);
    }

    for (let i = 0; i < 22; i++) {
      const tx = 58 + ((rng() * 24) | 0);
      const ty = 18 + ((rng() * 32) | 0);
      if (ty >= 30 && ty <= 36) continue;
      prop("grave", tx * T + 8, ty * T + 10);
    }

    prop("house", 14 * T, 26 * T);
    prop("house", 24 * T, 28 * T);
    prop("house", 11 * T, 42 * T);
    prop("chapel", 100 * T, 41 * T);
    prop("fire", 18 * T, 36 * T, { rest: true });

    addEnt({
      kind: "npc",
      name: "Моран",
      x: 17 * T,
      y: 33 * T,
      hw: 8,
      hh: 6,
      scale: 0.62,
      imgKey: "npc_elder",
      solid: true,
      dead: false,
      npc: "elder",
    });

    prop("chest", 22 * T, 34 * T, { chest: "village" });
    prop("chest", 42 * T, 22 * T, { chest: "woods" });
    prop("chest", 72 * T, 28 * T, { chest: "grave" });
    prop("chest", 94 * T, 44 * T, { chest: "relic" });
    prop("fire", 70 * T, 34 * T, { rest: true });

    const ghoulSpots = [
      [32, 22], [34, 28], [36, 24], [38, 42], [40, 40], [42, 18],
      [44, 32], [46, 28], [48, 18], [48, 44], [50, 36], [52, 22],
      [34, 46], [38, 16], [50, 48], [44, 40],
    ];
    for (const [tx, ty] of ghoulSpots) makeEnemy("ghoul", tx * T, ty * T);
    makeEnemy("brute", 46 * T, 34 * T);

    const skelSpots = [
      [58, 22], [60, 28], [62, 24], [64, 20], [66, 32],
      [68, 22], [70, 40], [72, 26], [74, 26], [76, 20],
      [78, 44], [80, 24], [80, 48], [82, 38], [84, 30],
      [64, 42], [66, 46], [70, 46], [74, 48], [78, 36],
      [88, 22], [90, 26], [108, 34], [106, 28],
    ];
    for (const [tx, ty] of skelSpots) makeEnemy("skel", tx * T, ty * T);

    makeEnemy("wraith", 102 * T, 46 * T);

    player = {
      kind: "player",
      x: 15 * T,
      y: 33 * T,
      hw: 6,
      hh: 4,
      hp: 110,
      maxHp: 110,
      stam: 100,
      flasks: 3,
      maxFlasks: 6,
      dmg: 18,
      speed: 82,
      face: "down",
      state: "idle",
      anim: 0,
      atkT: 0,
      dodgeT: 0,
      dodgeCd: 0,
      invuln: 0,
      flash: 0,
      flaskCd: 0,
      hitList: null,
      dead: false,
      solid: false,
      scale: 0.62,
    };
    restX = 18 * T;
    restY = 36 * T;
    cam.x = player.x - VW / 2;
    cam.y = player.y - VH / 2;
  }

  function resetRun() {
    quest.bones = "idle";
    quest.woods = "idle";
    quest.relic = "idle";
    quest.lord = "idle";
    quest.skelKills = 0;
    quest.ghoulKills = 0;
    flags.villageChest = false;
    flags.woodsChest = false;
    flags.graveChest = false;
    flags.relicTaken = false;
    flags.wraithAwake = false;
    flags.ending = false;
    flags.woodsWave = false;
    flags.graveWave = false;
    flags.chapelWave = false;
    flags.villageRaid = false;
    flags.bossAdds = false;
    combat.kills = 0;
    combat.combo = 0;
    combat.comboT = 0;
    combat.furyT = 0;
    particles.length = 0;
    floaters.length = 0;
    buildMap();
    updateQuestHud();
  }

  function updateQuestHud() {
    if (quest.lord === "done") {
      questTitle.textContent = "Долина успокоена";
      questBody.textContent = "Вернись к Морану.";
    } else if (quest.lord === "active") {
      questTitle.textContent = "Владыка Праха";
      questBody.textContent = "Срежь босса. Он зовёт орду.";
    } else if (quest.relic === "active") {
      questTitle.textContent = "Реликварий";
      questBody.textContent = "Медальон в часовне. Там будет мясорубка.";
    } else if (quest.bones === "ready" && quest.woods === "ready") {
      questTitle.textContent = "Жатва окончена";
      questBody.textContent = "Вернись к Морану.";
    } else if (quest.bones === "active" || quest.woods === "active") {
      const lines = [];
      if (quest.woods === "active") lines.push(`Гули леса: ${quest.ghoulKills}/12`);
      else if (quest.woods === "ready") lines.push("Лес зачищен.");
      if (quest.bones === "active") lines.push(`Жнецы: ${quest.skelKills}/12`);
      else if (quest.bones === "ready") lines.push("Кладбище зачищено.");
      questTitle.textContent = "Мясорубка долины";
      questBody.textContent = lines.join(" ");
    } else {
      questTitle.textContent = "Пепельный клинок";
      questBody.textContent = "Поговори со старейшиной Мораном.";
    }
    relicIcon.classList.toggle("hidden", !flags.relicTaken);
  }

  function openDialog(name, pages, choices) {
    dialog = { name, pages, i: 0, choices: choices || null };
    dlgName.textContent = name;
    dlgText.textContent = pages[0];
    dlgChoices.innerHTML = "";
    dialogEl.classList.remove("hidden");
    promptEl.classList.add("hidden");
    if (choices && pages.length === 1) renderChoices(choices);
    sfx("ui");
  }

  function renderChoices(choices) {
    dlgChoices.innerHTML = "";
    choices.forEach((c) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = c.label;
      b.addEventListener("click", (ev) => {
        ev.stopPropagation();
        closeDialog();
        c.fn();
      });
      dlgChoices.appendChild(b);
    });
  }

  function closeDialog() {
    dialog = null;
    dialogEl.classList.add("hidden");
    dlgChoices.innerHTML = "";
  }

  function advanceDialog() {
    if (!dialog) return;
    if (dialog.choices && dialog.i >= dialog.pages.length - 1) {
      const pick = dialog.choices[0];
      closeDialog();
      if (pick) pick.fn();
      return;
    }
    dialog.i++;
    if (dialog.i >= dialog.pages.length) {
      closeDialog();
      return;
    }
    dlgText.textContent = dialog.pages[dialog.i];
    if (dialog.choices && dialog.i === dialog.pages.length - 1) {
      renderChoices(dialog.choices);
    }
    sfx("ui");
  }

  function talkElder() {
    if (quest.lord === "done") {
      openDialog("Моран", [
        "Мясорубка остановилась. Лес, кладбище, часовня — всё легло под твой клинок.",
        "Рассвет не вернётся. Но ночь больше не стучит в двери. Иди. Долина запомнит запах железа.",
      ]);
      flags.ending = true;
      setTimeout(() => showEnding(), 900);
      return;
    }
    if (flags.relicTaken && quest.lord !== "done") {
      openDialog("Моран", [
        "Ты разбудил Владыку — и всю его орду. Часовня теперь бойня.",
        "Срежь его. Пока он стоит, кости будут вставать снова.",
      ]);
      if (quest.lord === "idle") {
        quest.lord = "active";
        updateQuestHud();
      }
      return;
    }
    if (quest.relic === "active") {
      openDialog("Моран", [
        "Часовня на востоке. Медальон в ларце. Как только возьмёшь — поле вокруг станет мясорубкой. Будь сыт флягами.",
      ]);
      return;
    }
    if (quest.bones === "ready" && quest.woods === "ready") {
      openDialog(
        "Моран",
        [
          "Пахнешь гулями и костной пылью. Лес и кладбище выжжены. Этого мало.",
          "Корень в часовне: Пепельный реликварий. Возьми — и Владыка выйдет сам, со всей стаей.",
        ],
        [
          {
            label: "Иду в часовню",
            fn: () => {
              quest.bones = "done";
              quest.woods = "done";
              quest.relic = "active";
              player.flasks = Math.min(player.maxFlasks, player.flasks + 2);
              player.dmg += 3;
              sfx("quest");
              toast("Клинок заточен. Новое задание: Реликварий");
              updateQuestHud();
            },
          },
        ]
      );
      return;
    }
    if (quest.bones === "active" || quest.woods === "active") {
      const parts = [];
      if (quest.woods === "active") parts.push(`гулей ${quest.ghoulKills}/12`);
      if (quest.bones === "active") parts.push(`жнецов ${quest.skelKills}/12`);
      openDialog("Моран", [
        `Ещё мало крови. Нужно: ${parts.join(" и ")}. Лес — сразу за деревней, кладбище дальше по дороге на восток.`,
      ]);
      return;
    }
    openDialog(
      "Моран",
      [
        "Мечник. Долина стала мясорубкой. Лес жрёт живых, кладбище встаёт волнами, часовня зовёт тьму.",
        "Срежь двенадцать гулей в лесу и двенадцать жнецов на костях. Потом я скажу, где корень.",
      ],
      [
        {
          label: "Клинок голоден",
          fn: () => {
            quest.bones = "active";
            quest.woods = "active";
            sfx("quest");
            toast("Мясорубка долины: лес и кладбище");
            updateQuestHud();
          },
        },
        {
          label: "Позже",
          fn: () => {},
        },
      ]
    );
  }

  function openChest(e) {
    if (e.chest === "village") {
      if (flags.villageChest) {
        toast("Пусто.");
        return;
      }
      flags.villageChest = true;
      player.flasks = Math.min(player.maxFlasks, player.flasks + 2);
      sfx("pickup");
      toast("Фляги с кровью: +2");
      return;
    }
    if (e.chest === "woods") {
      if (flags.woodsChest) {
        toast("Пусто.");
        return;
      }
      flags.woodsChest = true;
      player.flasks = Math.min(player.maxFlasks, player.flasks + 1);
      sfx("pickup");
      toast("Фляга с кровью: +1");
      return;
    }
    if (e.chest === "grave") {
      if (flags.graveChest) {
        toast("Пусто.");
        return;
      }
      flags.graveChest = true;
      player.flasks = Math.min(player.maxFlasks, player.flasks + 2);
      player.maxHp += 15;
      player.hp = Math.min(player.maxHp, player.hp + 15);
      sfx("pickup");
      toast("Костяной эликсир: +2 фляги, крепче тело");
      return;
    }
    if (e.chest === "relic") {
      if (flags.relicTaken) {
        toast("Ларце пуст.");
        return;
      }
      if (quest.relic !== "active" && quest.bones !== "done") {
        openDialog("Ларце", ["Железо не поддаётся. Словно ждёт чужого слова."]);
        return;
      }
      flags.relicTaken = true;
      quest.relic = "done";
      quest.lord = "active";
      sfx("quest");
      toast("Пепельный реликварий взят");
      updateQuestHud();
      awakeWraith();
    }
  }

  function awakeWraith() {
    flags.wraithAwake = true;
    for (const e of entities) {
      if (e.type === "wraith") {
        e.asleep = false;
        e.ai = "chase";
      }
    }
    cam.shake = 10;
    sfx("roar");
    toast("Владыка Праха пробудился");
    if (!flags.chapelWave) {
      flags.chapelWave = true;
      spawnHorde("skel", 102 * T, 44 * T, 8, 70, { summoned: true });
      spawnHorde("ghoul", 100 * T, 48 * T, 6, 80, { summoned: true });
      toast("Орда ринулась из склепа");
    }
  }

  function restAtFire() {
    player.hp = player.maxHp;
    player.stam = 100;
    restX = player.x;
    restY = player.y;
    sfx("heal");
    toast("Костер принял тебя. Раны закрылись.");
  }

  function tryInteract() {
    if (!interactable) return;
    const e = interactable;
    if (e.npc === "elder") talkElder();
    else if (e.chest) openChest(e);
    else if (e.rest) restAtFire();
  }

  function findInteractable() {
    let best = null;
    let bestD = 34;
    for (const e of entities) {
      if (e.dead) continue;
      if (!(e.npc || e.chest || e.rest)) continue;
      const d = dist(player, e);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    interactable = best;
    if (best && !dialog && mode === "play") {
      promptEl.classList.remove("hidden");
      promptEl.textContent = best.npc
        ? "E — говорить"
        : best.chest
        ? "E — открыть"
        : "E — отдохнуть";
    } else {
      promptEl.classList.add("hidden");
    }
  }

  function useFlask() {
    if (player.flaskCd > 0 || player.state === "dead") return;
    if (player.flasks <= 0) {
      toast("Фляги пусты");
      return;
    }
    if (player.hp >= player.maxHp) {
      toast("Раны уже закрыты");
      return;
    }
    player.flasks--;
    player.hp = Math.min(player.maxHp, player.hp + 42);
    player.flaskCd = 0.8;
    sfx("heal");
    burst(player.x, player.y - 16, "#c45c58", 10, 30);
  }

  function startAttack() {
    if (player.state === "attack" || player.state === "dodge" || player.state === "dead") return;
    player.state = "attack";
    player.atkT = 0;
    player.hitList = new Set();
    sfx("slash");
  }

  function startDodge(ax, ay) {
    if (player.dodgeCd > 0 || player.state === "attack" || player.state === "dead") return;
    if (player.stam < 28) return;
    let dx = ax;
    let dy = ay;
    if (!dx && !dy) {
      if (player.face === "left") dx = -1;
      else if (player.face === "right") dx = 1;
      else if (player.face === "up") dy = -1;
      else dy = 1;
    }
    const len = Math.hypot(dx, dy) || 1;
    player.dodgeDx = dx / len;
    player.dodgeDy = dy / len;
    player.state = "dodge";
    player.dodgeT = 0.2;
    player.dodgeCd = 0.7;
    player.invuln = 0.22;
    player.stam -= 28;
    sfx("ui");
  }

  function facingVec() {
    if (player.face === "left") return [-1, 0];
    if (player.face === "right") return [1, 0];
    if (player.face === "up") return [0, -1];
    return [0, 1];
  }

  function attackHitbox() {
    const [fx, fy] = facingVec();
    const wide = combat.combo >= 4 || combat.furyT > 0;
    return {
      x: player.x + fx * (wide ? 22 : 18),
      y: player.y + fy * 10 - 8,
      w: fy === 0 ? (wide ? 42 : 32) : wide ? 24 : 18,
      h: fy === 0 ? (wide ? 24 : 20) : wide ? 30 : 24,
    };
  }

  function aabbHit(ax, ay, aw, ah, bx, by, bw, bh) {
    return Math.abs(ax - bx) < (aw + bw) / 2 && Math.abs(ay - by) < (ah + bh) / 2;
  }

  function hurtEnemy(e, dmg, kb) {
    if (e.dead || e.asleep) return;
    if (combat.furyT > 0) dmg = (dmg * 1.4) | 0;
    else if (combat.combo >= 6) dmg = (dmg * 1.2) | 0;
    e.hp -= dmg;
    e.flash = 0.1;
    e.stun = 0.12;
    e.ai = "chase";
    const [fx, fy] = facingVec();
    moveEnt(e, fx * kb * 0.55, fy * kb * 0.55);
    burst(e.x, e.y - 12, "#8a1a22", 10, 48);
    floater(e.x, e.y - 28, String(dmg), combat.furyT > 0 ? "#e8a040" : "#e8d0c0");
    sfx("hit");
    cam.shake = combat.combo >= 5 ? 5 : 3;
    hitstop = combat.combo >= 8 ? 0.03 : 0.038;
    combat.combo += 1;
    combat.comboT = 1.35;
    if (combat.combo === 5 || combat.combo === 10 || combat.combo === 15) sfx("combo");
    if (e.hp <= 0) killEnemy(e);
  }

  function killEnemy(e) {
    e.dead = true;
    e.hp = 0;
    burst(e.x, e.y - 10, e.boss ? "#4ad0e8" : "#8a1a22", 22, 58);
    sfx("death");
    combat.kills++;
    if (combat.furyT > 0) {
      player.hp = Math.min(player.maxHp, player.hp + 4);
    }
    if (combat.kills > 0 && combat.kills % 10 === 0) {
      combat.furyT = 6.5;
      sfx("fury");
      toast("Ярость клинка");
    }
    if (e.questTag === "skel" && quest.bones === "active") {
      quest.skelKills++;
      if (quest.skelKills >= 12) {
        quest.bones = "ready";
        toast("Кладбище замолкло.");
        sfx("quest");
      } else if (quest.skelKills === 6 && !flags.graveWave) {
        flags.graveWave = true;
        spawnHorde("skel", player.x + 40, player.y, 8, 90, { summoned: true });
        toast("Могилы вскрылись. Ещё жнецы!");
        sfx("roar");
      }
      updateQuestHud();
    }
    if (e.questTag === "ghoul" && quest.woods === "active") {
      quest.ghoulKills++;
      if (quest.ghoulKills >= 12) {
        quest.woods = "ready";
        toast("Лес выжжен.");
        sfx("quest");
      }
      updateQuestHud();
    }
    if (e.questTag === "lord") {
      quest.lord = "done";
      toast("Владыка Праха пал.");
      sfx("quest");
      updateQuestHud();
    }
    if (!e.boss && player.flasks < player.maxFlasks && Math.random() < 0.12) {
      spawnDrop(e.x, e.y);
    }
  }

  function hurtPlayer(dmg, from) {
    if (player.invuln > 0 || player.state === "dead") return;
    player.hp -= dmg;
    player.flash = 0.15;
    player.invuln = 0.45;
    cam.shake = 5;
    sfx("hurt");
    burst(player.x, player.y - 12, "#7a1f2b", 8, 36);
    if (from) {
      const dx = player.x - from.x;
      const dy = player.y - from.y;
      const l = Math.hypot(dx, dy) || 1;
      moveEnt(player, (dx / l) * 10, (dy / l) * 10);
    }
    if (player.hp <= 0) {
      player.hp = 0;
      player.state = "dead";
      mode = "dead";
      deadScreen.classList.remove("hidden");
      sfx("death");
    }
  }

  function revive() {
    player.hp = player.maxHp;
    player.stam = 100;
    player.state = "idle";
    player.invuln = 1.2;
    player.x = restX;
    player.y = restY;
    deadScreen.classList.add("hidden");
    mode = "play";
    toast("Пепел вернул тебя к костру.");
  }

  function showEnding() {
    mode = "end";
    endText.textContent =
      "Лес, кладбище и часовня лежат грудой. Владыка Праха рассеян. Клинок сыт — мясорубка долины замолчала. Ночь больше не стучит в двери Тлена.";
    endScreen.classList.remove("hidden");
  }

  function updatePlayer(dt) {
    if (player.state === "dead") return;
    player.flaskCd = Math.max(0, player.flaskCd - dt);
    player.dodgeCd = Math.max(0, player.dodgeCd - dt);
    player.invuln = Math.max(0, player.invuln - dt);
    player.flash = Math.max(0, player.flash - dt);
    player.stam = Math.min(100, player.stam + 26 * dt);
    combat.comboT = Math.max(0, combat.comboT - dt);
    if (combat.comboT <= 0 && combat.combo > 0) combat.combo = 0;
    combat.furyT = Math.max(0, combat.furyT - dt);

    if (just.has("KeyQ") || just.has("Digit1")) useFlask();

    let ax = 0;
    let ay = 0;
    if (keys.has("KeyA") || keys.has("ArrowLeft")) ax -= 1;
    if (keys.has("KeyD") || keys.has("ArrowRight")) ax += 1;
    if (keys.has("KeyW") || keys.has("ArrowUp")) ay -= 1;
    if (keys.has("KeyS") || keys.has("ArrowDown")) ay += 1;

    if (player.state === "dodge") {
      player.dodgeT -= dt;
      moveEnt(player, player.dodgeDx * 210 * dt, player.dodgeDy * 210 * dt);
      if (player.dodgeT <= 0) player.state = "idle";
      return;
    }

    if (
      player.state !== "attack" &&
      (just.has("ShiftLeft") || just.has("ShiftRight") || just.has("KeyK"))
    ) {
      startDodge(ax, ay);
      if (player.state === "dodge") return;
    }

    if (
      keys.has("Space") ||
      keys.has("KeyJ") ||
      keys.has("Mouse") ||
      just.has("Space") ||
      just.has("KeyJ") ||
      just.has("Mouse")
    ) {
      startAttack();
    }

    if (player.state === "attack") {
      player.atkT += dt;
      const atkSpd = combat.furyT > 0 ? 20 : combat.combo >= 6 ? 18 : 16;
      const frame = Math.min(7, (player.atkT * atkSpd) | 0);
      if (frame >= 2 && frame <= 5) {
        const hb = attackHitbox();
        for (const e of entities) {
          if (e.kind !== "enemy" || e.dead || e.asleep) continue;
          if (player.hitList.has(e)) continue;
          if (aabbHit(hb.x, hb.y, hb.w, hb.h, e.x, e.y - 8, e.hw * 2 + 4, e.hh * 2 + 12)) {
            player.hitList.add(e);
            const dmg = player.dmg + ((Math.random() * 6) | 0);
            hurtEnemy(e, dmg, 7);
          }
        }
      }
      if (player.atkT >= 8 / atkSpd) player.state = "idle";
      return;
    }

    const len = Math.hypot(ax, ay);
    if (len) {
      const nx = ax / len;
      const ny = ay / len;
      const spd = player.speed * (combat.furyT > 0 ? 1.18 : 1);
      moveEnt(player, nx * spd * dt, ny * spd * dt);
      if (Math.abs(ax) > Math.abs(ay)) player.face = ax < 0 ? "left" : "right";
      else player.face = ay < 0 ? "up" : "down";
      player.state = "walk";
      player.anim += dt * 10;
    } else {
      player.state = "idle";
    }

    player.x = clamp(player.x, T * 2, WORLD_W - T * 2);
    player.y = clamp(player.y, T * 2, WORLD_H - T * 2);
    updateWaves();
  }

  function updateWaves() {
    const tx = player.x / T;
    if (quest.woods === "active" && !flags.woodsWave && tx > 30 && tx < 56) {
      flags.woodsWave = true;
      spawnHorde("ghoul", player.x + 50, player.y, 7, 85, { summoned: true });
      toast("Лес сомкнулся. Орда гулей!");
      sfx("roar");
    }
    if (
      quest.woods === "ready" &&
      quest.bones === "ready" &&
      !flags.villageRaid &&
      tx < 28
    ) {
      flags.villageRaid = true;
      spawnHorde("ghoul", 20 * T, 36 * T, 6, 50, { summoned: true });
      spawnHorde("skel", 24 * T, 32 * T, 4, 45, { summoned: true });
      toast("Деревня под ударом!");
      sfx("roar");
    }
    if (flags.wraithAwake && !flags.bossAdds) {
      const w = entities.find((e) => e.type === "wraith" && !e.dead);
      if (w && w.hp < w.maxHp * 0.45) {
        flags.bossAdds = true;
        spawnHorde("skel", w.x, w.y, 6, 70, { summoned: true });
        spawnHorde("ghoul", w.x, w.y, 4, 60, { summoned: true });
        toast("Владыка зовёт кость и плоть!");
        sfx("roar");
      }
    }
  }

  function updateEnemies(dt) {
    for (const e of entities) {
      if (e.kind !== "enemy" || e.dead) continue;
      e.flash = Math.max(0, e.flash - dt);
      e.stun = Math.max(0, e.stun - dt);
      e.rec = Math.max(0, e.rec - dt);
      e.anim += dt * 8;
      if (e.asleep) continue;
      if (e.stun > 0) continue;
      const d = dist(e, player);
      if (player.state === "dead") {
        e.ai = "idle";
        continue;
      }
      if (e.boss && d > 210) {
        const hx = e.homeX - e.x;
        const hy = e.homeY - e.y;
        const hl = Math.hypot(hx, hy);
        if (hl > 8) {
          moveEnt(e, (hx / hl) * e.speed * 0.7 * dt, (hy / hl) * e.speed * 0.7 * dt);
          e.ai = "idle";
        }
        continue;
      }
      if (d < e.aggro) e.ai = d < e.range + 4 && e.rec <= 0 ? "attack" : "chase";
      else if (e.ai === "chase" && d > e.aggro + 30) e.ai = "idle";

      if (e.ai === "chase") {
        const dx = player.x - e.x;
        const dy = player.y - e.y;
        const l = Math.hypot(dx, dy) || 1;
        moveEnt(e, (dx / l) * e.speed * dt, (dy / l) * e.speed * dt);
        e.face = dx < 0 ? -1 : 1;
      } else if (e.ai === "attack") {
        e.wind += dt;
        const need = e.boss ? 0.62 : 0.34;
        if (e.wind >= need) {
          e.wind = 0;
          e.rec = e.boss ? 0.9 : 0.52;
          e.ai = "idle";
          if (dist(e, player) < e.range + 10) {
            hurtPlayer(e.dmg, e);
            if (e.boss) {
              cam.shake = 8;
              burst(player.x, player.y - 8, "#4ad0e8", 12, 40);
            }
          }
        }
      } else {
        e.wind = 0;
      }
    }
  }

  function updateDrops(dt) {
    for (const e of entities) {
      if (e.kind !== "drop" || e.dead) continue;
      e.bob += dt * 3;
      if (dist(e, player) < 14) {
        e.dead = true;
        player.flasks = Math.min(player.maxFlasks, player.flasks + 1);
        sfx("pickup");
        toast("Фляга с кровью");
      }
    }
  }

  function updateFx(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 40 * dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
    for (let i = floaters.length - 1; i >= 0; i--) {
      const f = floaters[i];
      f.life -= dt;
      f.y -= 18 * dt;
      if (f.life <= 0) floaters.splice(i, 1);
    }
    if (toastT > 0) {
      toastT -= dt;
      if (toastT <= 0) toastEl.classList.add("hidden");
    }
  }

  function updateCam(dt) {
    const tx = player.x - VW / 2;
    const ty = player.y - VH / 2 - 8;
    const k = 1 - Math.pow(0.0008, dt);
    cam.x = lerp(cam.x, tx, k);
    cam.y = lerp(cam.y, ty, k);
    cam.x = clamp(cam.x, 0, WORLD_W - VW);
    cam.y = clamp(cam.y, 0, WORLD_H - VH);
    cam.shake = Math.max(0, cam.shake - dt * 18);
  }

  function drawTile(t, x, y) {
    const key =
      t === TILE.DIRT
        ? "tile_dirt"
        : t === TILE.COBBLE
        ? "tile_cobble"
        : t === TILE.WALL
        ? "tile_wall"
        : "tile_grass";
    const tx = ((x + cam.x) / T) | 0;
    const ty = ((y + cam.y) / T) | 0;
    const v = t === TILE.GRASS ? (tx + ty * 3) & 3 : 0;
    if (v) {
      ctx.save();
      ctx.translate(x + T / 2, y + T / 2);
      if (v === 1) ctx.scale(-1, 1);
      else if (v === 2) ctx.scale(1, -1);
      else ctx.scale(-1, -1);
      ctx.drawImage(img[key], -T / 2, -T / 2, T, T);
      ctx.restore();
      return;
    }
    ctx.drawImage(img[key], x, y, T, T);
  }

  function spriteForPlayer() {
    if (player.state === "attack") {
      const f = Math.min(7, (player.atkT * 14) | 0);
      return { im: heroAtk[f], flip: player.face === "left" };
    }
    if (player.face === "up") {
      return { im: img.hero_idle_back, flip: false };
    }
    if (player.face === "down") {
      return { im: img.hero_idle_front, flip: false };
    }
    if (player.state === "walk") {
      const f = heroWalk[((player.anim | 0) % 8 + 8) % 8];
      return { im: f, flip: player.face === "left" };
    }
    return { im: img.hero_idle_side, flip: player.face === "left" };
  }

  function drawSprite(im, x, y, scale, flip, flash, bob) {
    if (!im) return;
    const w = im.width * scale;
    const h = im.height * scale;
    const dx = Math.round(x - cam.x);
    const dy = Math.round(y - cam.y + (bob || 0));
    ctx.save();
    ctx.translate(dx, dy);
    if (flip) ctx.scale(-1, 1);
    if (flash > 0) {
      ctx.filter = "brightness(2.6) saturate(0.4)";
    }
    ctx.drawImage(im, -w / 2, -h, w, h);
    ctx.restore();
  }

  function drawHpPip(e) {
    if (e.hp >= e.maxHp) return;
    const x = Math.round(e.x - cam.x);
    const y = Math.round(e.y - cam.y - e.scale * (e.boss ? 62 : 42));
    const w = e.boss ? 28 : 16;
    ctx.fillStyle = "#1a1014";
    ctx.fillRect(x - w / 2, y, w, 3);
    ctx.fillStyle = e.boss ? "#4ad0e8" : "#a03038";
    ctx.fillRect(x - w / 2, y, w * clamp(e.hp / e.maxHp, 0, 1), 3);
  }

  function drawWorld() {
    let sx = 0;
    let sy = 0;
    if (cam.shake > 0) {
      sx = (Math.random() - 0.5) * cam.shake;
      sy = (Math.random() - 0.5) * cam.shake;
    }
    ctx.setTransform(1, 0, 0, 1, sx, sy);
    ctx.clearRect(-8, -8, VW + 16, VH + 16);

    const x0 = clamp((cam.x / T) | 0, 0, MW - 1);
    const y0 = clamp((cam.y / T) | 0, 0, MH - 1);
    const x1 = clamp(((cam.x + VW) / T + 1) | 0, 0, MW);
    const y1 = clamp(((cam.y + VH) / T + 1) | 0, 0, MH);
    for (let ty = y0; ty < y1; ty++) {
      for (let tx = x0; tx < x1; tx++) {
        drawTile(map[ty][tx], Math.round(tx * T - cam.x), Math.round(ty * T - cam.y));
      }
    }

    const drawList = [];
    for (const e of entities) {
      if (e.dead) continue;
      drawList.push(e);
    }
    drawList.push(player);
    drawList.sort((a, b) => a.y - b.y);

    for (const e of drawList) {
      if (e.kind === "player") {
        const sp = spriteForPlayer();
        const bob = e.state === "walk" && (e.face === "up" || e.face === "down")
          ? Math.sin(e.anim * 1.6) * 1.2
          : 0;
        drawSprite(sp.im, e.x, e.y, e.scale, sp.flip, e.flash, bob);
        if (e.state === "attack") {
          const atkSpd = combat.furyT > 0 ? 20 : combat.combo >= 6 ? 18 : 16;
      const f = Math.min(7, (e.atkT * atkSpd) | 0);
          if (f >= 3 && f <= 5) {
            const [fx, fy] = facingVec();
            ctx.save();
            ctx.globalAlpha = 0.45;
            ctx.strokeStyle = "#f0e0c8";
            ctx.lineWidth = 2;
            ctx.beginPath();
            const ax = e.x - cam.x + fx * 8;
            const ay = e.y - cam.y - 14;
            ctx.arc(ax, ay, 16, fy === 0 ? (fx > 0 ? -0.8 : Math.PI - 0.4) : -0.2, fy === 0 ? (fx > 0 ? 0.6 : Math.PI + 0.8) : 1.2);
            ctx.stroke();
            ctx.restore();
          }
        }
        continue;
      }
      if (e.kind === "enemy") {
        let im = img[e.idle];
        let flip = e.face < 0;
        if (e.walk && e.ai === "chase") {
          im = e.walk[((e.anim | 0) % 8 + 8) % 8];
        }
        const bob = e.boss ? Math.sin(performance.now() / 400) * 1.5 : 0;
        const sc = e.scale * (e.ai === "attack" ? 1.04 : 1);
        if (e.ai === "attack") {
          ctx.save();
          ctx.globalAlpha = 0.45;
          ctx.strokeStyle = e.boss ? "#4ad0e8" : "#c45c58";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(
            Math.round(e.x - cam.x),
            Math.round(e.y - cam.y - 8),
            8 + e.wind * 22,
            0,
            Math.PI * 2
          );
          ctx.stroke();
          ctx.restore();
        }
        drawSprite(im, e.x, e.y, sc, flip, e.flash, bob);
        drawHpPip(e);
        continue;
      }
      if (e.kind === "drop") {
        drawSprite(img[e.imgKey], e.x, e.y, e.scale, false, 0, Math.sin(e.bob) * 2);
        continue;
      }
      drawSprite(img[e.imgKey], e.x, e.y, e.scale, false, 0, 0);
    }

    for (const p of particles) {
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
      ctx.fillStyle = p.color;
      ctx.fillRect((p.x - cam.x) | 0, (p.y - cam.y) | 0, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    for (const f of floaters) {
      ctx.globalAlpha = clamp(f.life / 0.8, 0, 1);
      ctx.fillStyle = f.color;
      ctx.font = "7px 'Press Start 2P', monospace";
      ctx.fillText(f.text, (f.x - cam.x - 4) | 0, (f.y - cam.y) | 0);
    }
    ctx.globalAlpha = 1;

    drawDarkness();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  function drawDarkness() {
    if (!lightCanvas) {
      lightCanvas = document.createElement("canvas");
      lightCanvas.width = VW;
      lightCanvas.height = VH;
      lightCtx = lightCanvas.getContext("2d");
    }
    const lx = lightCtx;
    lx.clearRect(0, 0, VW, VH);
    lx.fillStyle = combat.furyT > 0 ? "rgba(40, 8, 10, 0.42)" : "rgba(6, 4, 10, 0.5)";
    lx.fillRect(0, 0, VW, VH);
    const g = lx.createRadialGradient(
      player.x - cam.x,
      player.y - cam.y - 10,
      12,
      player.x - cam.x,
      player.y - cam.y - 10,
      132
    );
    g.addColorStop(0, "rgba(0,0,0,1)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    lx.globalCompositeOperation = "destination-out";
    lx.fillStyle = g;
    lx.fillRect(0, 0, VW, VH);

    for (const e of entities) {
      if (e.dead) continue;
      if (e.rest || e.prop === "chapel" || e.boss) {
        const r = e.boss ? 90 : e.rest ? 50 : 40;
        const gg = lx.createRadialGradient(
          e.x - cam.x,
          e.y - cam.y - 8,
          4,
          e.x - cam.x,
          e.y - cam.y - 8,
          r
        );
        gg.addColorStop(0, "rgba(0,0,0,0.85)");
        gg.addColorStop(1, "rgba(0,0,0,0)");
        lx.fillStyle = gg;
        lx.beginPath();
        lx.arc(e.x - cam.x, e.y - cam.y - 8, r, 0, Math.PI * 2);
        lx.fill();
      }
    }
    lx.globalCompositeOperation = "source-over";
    ctx.drawImage(lightCanvas, 0, 0);
  }

  function updateHud() {
    const hp = clamp(player.hp / player.maxHp, 0, 1);
    hpFill.style.transform = `scaleX(${hp})`;
    hpText.textContent = String(Math.max(0, player.hp | 0));
    stamFill.style.transform = `scaleX(${clamp(player.stam / 100, 0, 1)})`;
    flaskCount.textContent = String(player.flasks);
    if (killHud) killHud.textContent = String(combat.kills);
    if (comboHud) {
      if (combat.combo >= 2) {
        comboHud.classList.remove("hidden");
        comboHud.textContent = combat.furyT > 0 ? "ЯРОСТЬ x" + combat.combo : "x" + combat.combo;
      } else {
        comboHud.classList.add("hidden");
      }
    }
  }

  function tick(dt) {
    if (mode !== "play" || dialog) {
      promptEl.classList.add("hidden");
      if (mode === "play") drawWorld();
      return;
    }
    if (hitstop > 0) {
      hitstop -= dt;
      drawWorld();
      return;
    }
    updatePlayer(dt);
    updateEnemies(dt);
    updateDrops(dt);
    updateFx(dt);
    updateCam(dt);
    findInteractable();
    updateHud();
    drawWorld();
  }

  function frame(t) {
    const now = t * 0.001;
    let dt = now - last;
    last = now;
    if (dt > 0.05) dt = 0.05;
    if (mode === "play") tick(dt);
    just.clear();
    requestAnimationFrame(frame);
  }

  function layout() {
    const s = Math.max(1, Math.floor(Math.min(window.innerWidth / VW, window.innerHeight / VH)));
    app.style.width = VW * s + "px";
    app.style.height = VH * s + "px";
    app.style.marginTop = Math.floor((window.innerHeight - VH * s) / 2) + "px";
  }

  function bind() {
    window.addEventListener("keydown", (e) => {
      if (e.repeat) return;
      keys.add(e.code);
      just.add(e.code);
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
        e.preventDefault();
      }
      if (e.code === "Enter" || e.code === "KeyE") {
        if (dialog) advanceDialog();
        else if (mode === "play") tryInteract();
        else if (mode === "title") startGame();
        else if (mode === "dead") revive();
        else if (mode === "pause") unpause();
      }
      if (e.code === "Escape") {
        if (dialog) closeDialog();
        else if (mode === "play") pause();
        else if (mode === "pause") unpause();
      }
    });
    window.addEventListener("keyup", (e) => keys.delete(e.code));
    canvas.addEventListener("mousedown", () => {
      keys.add("Mouse");
      just.add("Mouse");
      if (mode === "play" && !dialog) startAttack();
    });
    window.addEventListener("mouseup", () => {
      keys.delete("Mouse");
    });
    document.getElementById("btnStart").addEventListener("click", startGame);
    document.getElementById("btnResume").addEventListener("click", unpause);
    document.getElementById("btnRevive").addEventListener("click", revive);
    document.getElementById("btnAgain").addEventListener("click", () => {
      endScreen.classList.add("hidden");
      resetRun();
      startGame();
    });
    window.addEventListener("resize", layout);
    window.addEventListener("blur", () => keys.clear());
  }

  function pause() {
    if (mode !== "play") return;
    mode = "pause";
    pauseScreen.classList.remove("hidden");
  }

  function unpause() {
    if (mode !== "pause") return;
    mode = "play";
    pauseScreen.classList.add("hidden");
  }

  function startGame() {
    ensureAudio();
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
    titleScreen.classList.add("hidden");
    pauseScreen.classList.add("hidden");
    deadScreen.classList.add("hidden");
    endScreen.classList.add("hidden");
    hud.classList.remove("hidden");
    if (!player) resetRun();
    mode = "play";
    last = performance.now() * 0.001;
    sfx("ui");
  }

  async function boot() {
    layout();
    bind();
    try {
      await loadAll();
    } catch (err) {
      titleScreen.querySelector(".tagline").textContent = "Не удалось загрузить ассеты";
      console.error(err);
      return;
    }
    resetRun();
    requestAnimationFrame(frame);
  }

  window.__G = () => ({ player, quest, flags, mode, entities, combat });

  boot();
})();
