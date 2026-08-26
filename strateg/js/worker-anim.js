(() => {
  "use strict";
  const CELL = 24;
  const orig = CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage = function (img) {
    const src = (img && img.src) || "";
    const labor = /\/units\/(worker|peon)\.png/.test(src);
    if (!labor || arguments.length < 9) return orig.apply(this, arguments);

    const sx0 = arguments[1];
    const sy = arguments[2];
    const sw = arguments[3];
    const sh = arguments[4];
    const dx = arguments[5];
    let dy = arguments[6];
    const dw = arguments[7];
    const dh = arguments[8];
    const t = performance.now() / 1000;
    const phase = dx * 0.31 + dy * 0.17;
    const walking = sx0 !== 0;
    let frame;
    let bob;
    if (walking) {
      frame = ((t * 12 + phase) | 0) % 4;
      bob = Math.abs(Math.sin(t * 16 + phase)) * 2.1;
    } else {
      const fidget = (t * 0.35 + phase) % 4.6;
      frame = fidget > 3.9 ? 1 + (((t * 7 + phase) | 0) % 3) : fidget > 3.2 ? 1 : 0;
      bob = Math.sin(t * 3.3 + phase) * 0.6;
    }
    return orig.call(this, img, frame * CELL, sy, sw, sh, dx, dy + bob, dw, dh);
  };
})();
