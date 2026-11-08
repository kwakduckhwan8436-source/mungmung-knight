/* =========================================================
   멍멍기사 디펜스 — 아트 엔진 v0.2
   - 치비(2등신) 캐릭터: 그라데이션 음영 + 스티커식 외곽선 + 표정
   - 프레임 미리 그려서 캐시(성능), 테마별 다층 패럴랙스 배경, 성/둥지, UI 패널
   - 외부 이미지 0개: 전부 코드로 그림
   ========================================================= */
'use strict';
window.ART = (function () {
  const SS = 2.0;           // 스프라이트: 디자인 1단위당 픽셀
  const PAD = 6;
  const OUT = '#3a2212';
  const TAU = Math.PI * 2;
  function mk(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }

  /* ---------- 색 ---------- */
  function parse(c) {
    if (c[0] === '#') { let h = c.slice(1); if (h.length === 3) h = h.split('').map(x => x + x).join(''); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
    const m = c.match(/[\d.]+/g); return [+m[0], +m[1], +m[2]];
  }
  function mix(a, b, t) { const x = parse(a), y = parse(b); return `rgb(${Math.round(x[0] + (y[0] - x[0]) * t)},${Math.round(x[1] + (y[1] - x[1]) * t)},${Math.round(x[2] + (y[2] - x[2]) * t)})`; }
  const LI = (c, t) => mix(c, '#ffffff', t), DK = (c, t) => mix(c, '#000000', t);
  function rgba(c, a) { const x = parse(c); return `rgba(${x[0]},${x[1]},${x[2]},${a})`; }

  /* ---------- 경로 도우미 ---------- */
  function E(g, x, y, rx, ry, rot) { g.beginPath(); g.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot || 0, 0, TAU); }
  function RR(g, x, y, w, h, r) { r = Math.max(0, Math.min(r, w / 2, h / 2)); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function rg(g, col, x, y, r, hl, sh) {
    const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.45, r * 0.05, x, y, r * 1.15);
    gr.addColorStop(0, LI(col, hl == null ? 0.32 : hl)); gr.addColorStop(0.55, col); gr.addColorStop(1, DK(col, sh == null ? 0.22 : sh)); return gr;
  }
  function lgr(g, c1, c2, x0, y0, x1, y1) { const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, c1); gr.addColorStop(1, c2); return gr; }
  function fe(g, x, y, rx, ry, col, rot, hl, sh) { E(g, x, y, rx, ry, rot); g.fillStyle = rg(g, col, x, y, Math.max(rx, ry), hl, sh); g.fill(); }
  function st(g, w, col) { g.lineWidth = w; g.strokeStyle = col || OUT; g.lineCap = 'round'; g.lineJoin = 'round'; }
  function star(g, x, y, r, col, ir) { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * (ir || 0.45) : r; g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } g.closePath(); g.fillStyle = col; g.fill(); }
  function paw(g, x, y, s, col) { g.fillStyle = col; E(g, x, y + 2.5 * s, 4.6 * s, 3.8 * s); g.fill(); [[-4.6, -2.6], [-1.6, -5.4], [1.8, -5.4], [4.8, -2.6]].forEach(([a, b]) => { E(g, x + a * s, y + b * s, 1.9 * s, 2.2 * s); g.fill(); }); }
  function bone(g, x, y, w, col, rot) {
    g.save(); g.translate(x, y); g.rotate(rot || 0); const h = w * 0.28, r = w * 0.2;
    g.fillStyle = col; RR(g, -w / 2 + r * 0.6, -h / 2, w - r * 1.2, h, h / 2); g.fill();
    [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([a, b]) => { E(g, a * (w / 2 - r * 0.5), b * h * 0.55, r, r); g.fill(); });
    g.restore();
  }
  const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const lerp = (a, b, t) => a + (b - a) * t;
  function swing(atk) {
    if (atk < 0) return 1.15;
    if (atk < 0.35) return lerp(1.15, -1.6, ease(atk / 0.35));
    if (atk < 0.6) return lerp(-1.6, 1.9, ease((atk - 0.35) / 0.25));
    return lerp(1.9, 1.15, ease((atk - 0.6) / 0.4));
  }

  /* =========================================================
     캐릭터 정의 (v0.4 — 완전 측면 프로필, 진행 방향을 바라봄)
     ========================================================= */
  const LOOKS = {
    hero:  { c1: '#f7c46c', c2: '#fff4dc', c3: '#d98f3c', ear: 'flop', tail: 'wag', helmet: true, plume: '#ff4d4d', cape: '#2f6fe0', sword: true, shield: true, collar: '#e23b3b', tag: 'bone', blade: '#eef6ff', armor: null, seed: 3 },
    u0:    { c1: '#f08a3c', c2: '#fff3e2', c3: '#d4702a', ear: 'up', es: 0.95, tail: 'curl', mark: 'urajiro', bandana: '#e53935', spear: true, bx: 0.94, by: 0.96, hs: 1.06, mz: 0.88, seed: 5 },
    u1:    { c1: '#e6d2b5', c2: '#fffaf0', c3: '#b0896a', ear: 'flop', es: 0.62, tail: 'stub', mark: 'wrinkle', ironcap: true, bigShield: true, teeth: true, jowl: true, bx: 1.22, by: 0.9, leg: 0.72, legW: 9.5, hs: 1.08, mz: 0.55, spots: 'rgba(160,110,70,.45)', seed: 7 },
    u2:    { c1: '#fff8ef', c2: '#ffffff', c3: '#a8642e', ear: 'flop', earLong: true, es: 1.18, tail: 'wag', head: '#c97a3a', saddle: '#3b2a24', mark: 'blaze', archer: '#3f9a4a', bow: true, quiver: true, mz: 1.08, leg: 0.92, sock: '#ffffff', seed: 9 },
    u3:    { c1: '#6f8296', c2: '#f4f7fa', c3: '#4c5d6e', ear: 'up', es: 1.12, tail: 'plume', mark: 'mask', iris: '#4fb6ff', wizard: '#7e57c2', staff: true, bx: 1.06, by: 1.06, cheekFluff: true, seed: 11 },
    u4:    { c1: '#fbf7ee', c2: '#ffffff', c3: '#e8dcc6', ear: 'up', es: 1.05, tail: 'curl', mark: 'urajiro', headband: '#d32f2f', katana: true, brow: true, sash: '#2b3a67', bx: 0.96, by: 1.08, leg: 1.12, mz: 1.05, seed: 13 },
    u5:    { c1: '#f2a24a', c2: '#ffffff', c3: '#d9822e', ear: 'up', es: 1.35, tail: 'stub', mark: 'urajiro', bx: 1.24, by: 0.92, leg: 0.5, legW: 8.2, hs: 1.04, bandana: '#2f8cff', goggles: true, tongue: true, cannon: true, seed: 27 },
    u6:    { c1: '#fbe7ef', c2: '#ffffff', c3: '#f2c4d6', ear: 'flop', es: 1.05, earLong: true, tail: 'pom', curly: true, collar: '#ff7ab6', tag: 'bone', healStaff: true, nurseCap: true, mz: 0.92, leg: 1.1, iris: '#d16aa0', seed: 29 },
    u7:    { c1: '#8a4a24', c2: '#d9a066', c3: '#5e2f14', ear: 'flop', earLong: true, es: 1.1, tail: 'wag', bx: 1.42, by: 0.86, leg: 0.48, legW: 6.6, mz: 1.22, hs: 0.98, lance: true, ironcap: true, collar: '#ffd34d', seed: 31 },
    u8:    { c1: '#c9772f', c2: '#ffffff', c3: '#8a4a1c', ear: 'flop', es: 1.0, tail: 'plume', mark: 'blaze', bx: 1.2, by: 1.18, legW: 10, mz: 0.92, jowl: true, barrel: true, towerShield: true, ironcap: true, cheekFluff: true, tongue: true, seed: 33 },
    u9:    { c1: '#efcf9e', c2: '#fff6e6', c3: '#e0a868', ear: 'up', es: 1.7, tail: 'curl', bx: 0.82, by: 0.84, leg: 1.0, legW: 6, hs: 1.28, mz: 0.72, dagger: true, scarf: '#9c27b0', hood: '#5a3a8a', iris: '#5a3a1a', seed: 35 },
    wolf:  { c1: '#5d6070', c2: '#a9adb8', c3: '#3c3e4a', ear: 'up', tail: 'wag', evil: true, iris: '#ff3b30', scar: true, spikes: true, axe: true, brow: true, seed: 15 },
    sknight: { c1: '#4b4a5e', c2: '#8d8aa6', c3: '#2c2b3a', ear: 'up', tail: 'wag', evil: true, iris: '#c56bff', helm: true, darkArmor: true, sword: true, blade: '#9c6bff', shield: true, shieldC: '#3a2a52', seed: 17 },
    granny:{ c1: '#eee8f4', c2: '#ffffff', c3: '#cdc3dc', ear: 'flop', earLong: true, tail: 'wag', glasses: true, collar: '#8e7cc3', seed: 19 },
    noxgood:{ c1: '#c9ced9', c2: '#ffffff', c3: '#98a0b4', ear: 'up', tail: 'wag', iris: '#ffb300', scar: true, cape: '#2f6fe0', sword: true, blade: '#eef6ff', brow: true, collar: '#e23b3b', tag: 'bone', seed: 21 },
    fenrir:{ c1: '#2a3a6a', c2: '#8fb4ff', c3: '#1a2244', ear: 'up', es: 1.2, tail: 'plume', evil: true, iris: '#7affe6', flameEye: true, darkArmor: true, cape: '#1a1e5a', capeTorn: true, crown: true, great: true, blade: '#7ad7ff', bladeGlow: true, brow: true, cheekFluff: true, bx: 1.12, by: 1.08, seed: 37 },
    sbori: { c1: '#5c4a6e', c2: '#9a8ab0', c3: '#3a2c4a', ear: 'flop', tail: 'wag', evil: true, iris: '#ff4fd8', helmet: true, plume: '#9c6bff', cape: '#2a1240', capeTorn: true, great: true, blade: '#c56bff', bladeGlow: true, shield: true, shieldC: '#2a1a3a', darkArmor: true, brow: true, seed: 25 },
    nox:   { c1: '#6b6f86', c2: '#b8bdd0', c3: '#3d3f55', ear: 'up', tail: 'wag', evil: true, iris: '#ffb300', flameEye: true, scar: true, darkArmor: true, cape: '#5b2a86', capeTorn: true, crown: true, sword: true, blade: '#9c6bff', bladeGlow: true, brow: true, seed: 23 },
  };

  /* ---------- 질감 도우미: 털 뭉치·잔털·림라이트 ---------- */
  function tuft(g, x, y, ang, len, w, col) {
    const px = Math.cos(ang + 1.57), py = Math.sin(ang + 1.57);
    g.fillStyle = col; g.beginPath(); g.moveTo(x + px * w, y + py * w);
    g.quadraticCurveTo(x + Math.cos(ang) * len * 0.55 + px * w * 0.5, y + Math.sin(ang) * len * 0.55 + py * w * 0.5, x + Math.cos(ang) * len, y + Math.sin(ang) * len);
    g.lineTo(x - px * w, y - py * w); g.closePath(); g.fill();
  }
  function fluff(g, cx, cy, rx, ry, a0, a1, n, len, col) { for (let i = 0; i < n; i++) { const a = a0 + (a1 - a0) * (i + 0.5) / n; tuft(g, cx + Math.cos(a) * rx * 0.9, cy + Math.sin(a) * ry * 0.9, a, len, len * 0.42, col); } }
  function rim(g, cx, cy, rx, ry, a0, a1, col, w) { g.save(); g.strokeStyle = col; g.lineWidth = w || 1.3; g.lineCap = 'round'; g.beginPath(); g.ellipse(cx, cy, rx * 0.88, ry * 0.88, 0, a0, a1); g.stroke(); g.restore(); }
  function hairs(g, cx, cy, rx, ry, n, col, seed) {
    let s = seed || 3; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    g.save(); g.strokeStyle = col; g.lineWidth = 0.6; g.lineCap = 'round';
    for (let i = 0; i < n; i++) { const a = r() * TAU, d = Math.sqrt(r()) * 0.82, x = cx + Math.cos(a) * rx * d, y = cy + Math.sin(a) * ry * d; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x - 1, y + 1.1, x - 2.3, y + 1.3); g.stroke(); }
    g.restore();
  }
  const RIM = 'rgba(255,255,255,.55)';

  /* =========================================================
     공통 눈 (측면): 아군 = 검은 광택 + 갈색 홍채 + 앞쪽 하이라이트 / 악당 = 빛나는 홍채·세로 동공·성난 눈꺼풀
     ========================================================= */
  function eyeKit(g, x, y, rx, ry, o) {
    o = o || {};
    const ex = o.expr;
    if (o.blink || ex === 'happy' || ex === 'wink') { st(g, 1.9); g.beginPath(); g.arc(x, y + 2, rx * 0.95, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); return; }
    if (o.hurt || ex === 'dizzy') { st(g, 1.8); g.beginPath(); g.moveTo(x - rx * 0.7, y - ry * 0.6); g.lineTo(x + rx * 0.7, y); g.lineTo(x - rx * 0.7, y + ry * 0.6); g.stroke(); return; }
    if (ex === 'sleepy') { st(g, 1.9); g.beginPath(); g.moveTo(x - rx, y + 1); g.quadraticCurveTo(x, y + ry * 0.55, x + rx, y + 1); g.stroke(); return; }
    if (ex === 'love') {
      const s = rx * 1.05; g.beginPath(); g.moveTo(x, y + s * 1.1); g.bezierCurveTo(x - s * 2, y - s * 0.2, x - s * 0.9, y - s * 1.6, x, y - s * 0.55); g.bezierCurveTo(x + s * 0.9, y - s * 1.6, x + s * 2, y - s * 0.2, x, y + s * 1.1);
      g.fillStyle = lgr(g, '#ff8fa8', '#e8174a', 0, y - s, 0, y + s); g.fill(); E(g, x + s * 0.3, y - s * 0.45, s * 0.35, s * 0.25); g.fillStyle = 'rgba(255,255,255,.85)'; g.fill(); return;
    }
    const k = ex === 'surprise' ? 0.82 : 1; rx *= k; ry *= k;
    if (o.glow) { const gl = g.createRadialGradient(x, y, 0, x, y, ry * 2.3); gl.addColorStop(0, rgba(o.glow, 0.6)); gl.addColorStop(1, rgba(o.glow, 0)); g.fillStyle = gl; E(g, x, y, ry * 2.3, ry * 2.3); g.fill(); }
    E(g, x, y, rx, ry, 0.08); g.fillStyle = lgr(g, '#3b2416', '#0d0704', 0, y - ry, 0, y + ry); g.fill();
    g.save(); E(g, x, y, rx, ry, 0.08); g.clip();
    if (o.glow) {
      const ig = g.createRadialGradient(x + rx * 0.15, y + ry * 0.1, 0, x + rx * 0.15, y + ry * 0.1, ry * 1.05); ig.addColorStop(0, LI(o.glow, 0.6)); ig.addColorStop(0.55, o.glow); ig.addColorStop(1, DK(o.glow, 0.55));
      g.fillStyle = ig; g.fillRect(x - rx, y - ry, rx * 2, ry * 2);
      E(g, x + rx * 0.25, y + ry * 0.08, rx * 0.2, ry * 0.68); g.fillStyle = '#140606'; g.fill();
    } else {
      E(g, x + rx * 0.18, y + ry * 0.32, rx * 0.95, ry * 0.72); g.fillStyle = o.iris || 'rgba(120,64,26,.75)'; g.fill();
      E(g, x + rx * 0.28, y + ry * 0.12, rx * 0.5, ry * 0.55); g.fillStyle = '#0a0503'; g.fill();
    }
    g.restore();
    E(g, x + rx * 0.22, y - ry * 0.36, rx * 0.46, ry * 0.36); g.fillStyle = '#fff'; g.fill();
    E(g, x - rx * 0.3, y + ry * 0.42, rx * 0.2, rx * 0.2); g.fillStyle = 'rgba(255,255,255,.85)'; g.fill();
    if (o.sparkle) {
      g.fillStyle = '#fff'; const sx = x - rx * 0.42, sy = y - ry * 0.2, sr = rx * 0.26;
      g.beginPath(); g.moveTo(sx, sy - sr); g.quadraticCurveTo(sx, sy, sx + sr, sy); g.quadraticCurveTo(sx, sy, sx, sy + sr); g.quadraticCurveTo(sx, sy, sx - sr, sy); g.quadraticCurveTo(sx, sy, sx, sy - sr); g.fill();
      E(g, x + rx * 0.45, y + ry * 0.5, rx * 0.12, rx * 0.12); g.fillStyle = 'rgba(190,230,255,.9)'; g.fill();
      st(g, 0.9, rgba(OUT, 0.9)); g.beginPath(); g.moveTo(x + rx * 0.55, y - ry * 0.85); g.quadraticCurveTo(x + rx * 1.2, y - ry * 1.05, x + rx * 1.35, y - ry * 0.7); g.stroke();
    }
    if (o.lid) {
      const yi = y - ry * 0.02, yo = y - ry * 0.66;
      g.save(); E(g, x, y, rx * 1.15, ry * 1.15); g.clip();
      g.beginPath(); g.moveTo(x - rx * 1.4, y - ry * 1.5); g.lineTo(x + rx * 1.4, y - ry * 1.5); g.lineTo(x + rx * 1.4, yi); g.lineTo(x - rx * 1.4, yo); g.closePath();
      g.fillStyle = o.lid; g.fill(); g.restore();
      st(g, 1.8); g.beginPath(); g.moveTo(x - rx * 1.2, yo - 0.3); g.lineTo(x + rx * 1.25, yi - 0.3); g.stroke();
    }
  }
  function shadowMark(g, x, y, s) {
    const gl = g.createRadialGradient(x, y, 0, x, y, 7 * s); gl.addColorStop(0, 'rgba(206,120,255,.75)'); gl.addColorStop(1, 'rgba(160,60,230,0)');
    g.fillStyle = gl; E(g, x, y, 7 * s, 7 * s); g.fill();
    st(g, 1.3 * s, '#e3a8ff'); g.beginPath(); g.arc(x, y, 3.2 * s, 0.3, Math.PI * 1.7); g.stroke();
    g.beginPath(); g.arc(x + 0.8 * s, y - 0.3 * s, 1.4 * s, Math.PI, Math.PI * 2.6); g.stroke();
  }
  // v1.0: 몬스터 눈을 더 크고 반짝이게 + 볼터치 → 무섭기보다 귀여운 악당
  const VEYE = (g, x, y, rx, ry, glow, lid, P) => {
    rx *= 1.22; ry *= 1.22;
    if (P && P.calm) eyeKit(g, x, y, rx, ry, { expr: P.expr === 'happy' ? 'happy' : null, sparkle: true });
    else eyeKit(g, x, y, rx, ry, { glow, lid, sparkle: true, blink: P && P.blink, hurt: P && P.hurt });
    if (!(P && P.hurt)) { E(g, x + rx * 0.3, y + ry * 1.45, rx * 0.95, ry * 0.42); g.fillStyle = 'rgba(255,120,160,.38)'; g.fill(); }
  };

  /* ---------- 강아지 (측면) ---------- */
  function paintDog(g, K, P) {
    const walk = P.walk || 0, mv = !!P.moving, ph = walk * TAU, a = Math.sin(ph);
    const br = Math.sin((P.breathe || 0) * TAU);
    const bob = mv ? -Math.abs(Math.sin(ph)) * 2.4 : br * 0.8;
    const atk = P.atk == null ? -1 : P.atk, strike = atk >= 0.35 && atk < 0.7, sw = swing(atk);
    const ex = P.expr, tailA = mv ? a * 0.55 : br * 0.4;
    const HC = K.head || K.c1, furD = rgba(DK(K.c1, 0.4), 0.32), seed = K.seed || 3;
    const BX = K.bx || 1, BY = K.by || 1, LS = (1 - (K.leg || 1)) * 11.5, HS = K.hs || 1, MZ = K.mz || 1, ES = K.es || 1;
    g.save(); g.scale(BX, BY); g.translate(0, LS);
    // 꼬리
    g.save(); g.translate(-13, -18 + bob);
    if (K.tail === 'stub') {
      g.rotate(-0.6 + tailA * 0.6); fe(g, 0, -3, 3.4, 4.2, K.c1); fluff(g, 0, -3, 3.4, 4.2, -2.4, -0.6, 3, 2, K.c1);
    } else if (K.tail === 'plume') {
      g.rotate(-0.5 + tailA * 0.5);
      g.beginPath(); g.moveTo(-3, 0); g.quadraticCurveTo(-12, -10, -4, -22); g.quadraticCurveTo(4, -26, 8, -18); g.quadraticCurveTo(2, -16, 3, -6); g.closePath(); g.fillStyle = rg(g, K.c1, -2, -12, 14, 0.3, 0.2); g.fill();
      fluff(g, -2, -14, 7, 10, Math.PI * 0.6, Math.PI * 1.6, 6, 3.6, K.c1); fe(g, 3, -20, 4, 4, K.c2); fluff(g, 3, -20, 4, 4, -1.8, 0.2, 3, 2.6, K.c2);
    } else if (K.tail === 'pom') {
      g.rotate(-0.4 + tailA * 0.5); st(g, 2.6, K.c1); g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -10); g.stroke();
      for (let k = 0; k < 7; k++) { const a2 = k / 7 * TAU; fe(g, Math.cos(a2) * 3.4, -13 + Math.sin(a2) * 3.4, 3.2, 3.2, LI(K.c1, 0.05)); } fe(g, 0, -13, 4, 4, LI(K.c1, 0.12));
    } else if (K.tail === 'curl') {
      g.rotate(-0.2 + tailA * 0.25);
      st(g, 7, K.c1); g.beginPath(); g.arc(-1, -8, 6.5, 0.5, Math.PI * 1.75); g.stroke();
      st(g, 3, LI(K.c1, 0.35)); g.beginPath(); g.arc(-1, -8, 6.5, 2.2, 3.6); g.stroke();
      fe(g, 4.2, -13.5, 3.4, 3.4, K.c2); fluff(g, 4.2, -13.5, 3.4, 3.4, -1.6, 0.4, 3, 2.6, K.c2);
    } else {
      g.rotate(-0.95 + tailA);
      fe(g, 0, -8, 4, 9.8, K.c1); fe(g, 0, -15.5, 2.8, 3.4, K.c2); tuft(g, 0, -17, -1.57, 4, 1.8, K.c2);
    }
    g.restore();
    // 망토
    if (K.cape) {
      const wv = mv ? a * 3 : br * 1.2;
      g.beginPath(); g.moveTo(9, -27 + bob);
      g.quadraticCurveTo(-6, -31 + bob, -21 + wv * 0.3, -15 + bob);
      g.quadraticCurveTo(-28 - wv, -3, -19 - wv, 1.5);
      if (K.capeTorn) { g.lineTo(-15 - wv, -4); g.lineTo(-12 - wv * 0.7, 1); g.lineTo(-8 - wv * 0.5, -5 + bob); g.lineTo(-4, -2 + bob); g.lineTo(3, -10 + bob); }
      else g.quadraticCurveTo(-8, -3 + bob, 3, -10 + bob);
      g.closePath();
      g.fillStyle = lgr(g, LI(K.cape, 0.2), DK(K.cape, 0.32), 0, -30, -10, 2); g.fill();
      st(g, 0.8, rgba(DK(K.cape, 0.5), 0.6)); g.beginPath(); g.moveTo(-4, -26 + bob); g.quadraticCurveTo(-14, -16, -15 - wv, -2); g.moveTo(2, -24 + bob); g.quadraticCurveTo(-6, -14, -8 - wv * 0.5, -4); g.stroke();
      if (!K.capeTorn) { st(g, 1.8, '#ffd34d'); g.beginPath(); g.moveTo(-19 - wv, 1.5); g.quadraticCurveTo(-8, -3 + bob, 3, -10 + bob); g.stroke(); paw(g, -12 - wv * 0.4, -11 + bob, 0.55, 'rgba(255,215,90,.9)'); }
    }
    // 다리
    const leg = (x, p, near) => {
      if (K.seated) return;
      const sx = mv ? Math.sin(ph + p * TAU) * 4.2 : 0, ly = mv ? Math.min(0, -Math.cos(ph + p * TAU) * 2.4) : 0;
      const col = near ? K.c1 : DK(K.c1, 0.18);
      g.save(); g.translate(x + sx * 0.6, -11.5 + bob * 0.4 + ly);
      const lh = Math.max(3, 11.6 - ly * 0.4 - LS), lw = K.legW || 7.6;
      RR(g, -lw / 2, 0, lw, lh, Math.min(3.6, lh / 2)); g.fillStyle = lgr(g, LI(col, 0.14), DK(col, 0.12), -3, 0, 4, 11); g.fill();
      if (K.curly) { fe(g, 0, lh * 0.4, lw * 0.75, lh * 0.32, LI(col, 0.06)); }
      E(g, 1, lh - 1, 4.8 * (lw / 7.6), 2.7); g.fillStyle = near ? (K.sock || K.c2) : DK(K.sock || K.c2, 0.14); g.fill();
      if (near) { st(g, 0.8, rgba(OUT, 0.5)); g.beginPath(); g.moveTo(0.2, lh - 2.2); g.lineTo(0.2, lh); g.moveTo(2.6, lh - 2.2); g.lineTo(2.6, lh); g.stroke(); st(g, 1, RIM); g.beginPath(); g.moveTo(-2.4, 1.5); g.lineTo(-2.4, 7); g.stroke(); }
      g.restore();
    };
    leg(-9, 0.5, false); leg(9, 0, false);
    // 몸통
    fe(g, 0, -14 + bob, 16, 11.5, K.c1, 0, 0.32, 0.26);
    hairs(g, -1, -15 + bob, 13, 9, 16, furD, seed);
    if (K.saddle) { E(g, -4, -19 + bob, 11, 7); g.fillStyle = rg(g, K.saddle, -4, -19 + bob, 11, 0.25); g.fill(); hairs(g, -4, -19 + bob, 9, 5, 8, 'rgba(255,255,255,.18)', seed + 1); }
    fluff(g, 0, -14 + bob, 16, 11.5, Math.PI * 0.55, Math.PI * 0.95, 4, 3, K.c1);
    fe(g, 9, -12.5 + bob, 8.6, 8.2, K.c2, 0, 0.42, 0.12);
    fluff(g, 9, -12.5 + bob, 8.6, 8.2, -0.2, 1.9, 5, 3.4, K.c2);
    rim(g, 0, -14 + bob, 16, 11.5, Math.PI * 1.12, Math.PI * 1.72, RIM);
    if (K.curly) { for (let k = 0; k < 9; k++) { const cx = -12 + (k % 5) * 6 + (k > 4 ? 3 : 0), cy = -19 + (k > 4 ? 6 : 0) + bob; fe(g, cx, cy, 4.2, 4.2, LI(K.c1, 0.04), 0, 0.35, 0.2); st(g, 0.6, rgba(DK(K.c1, 0.3), 0.5)); g.beginPath(); g.arc(cx + 0.6, cy + 0.3, 2.2, 0.4, 3.6); g.stroke(); } }
    if (K.spots) { g.fillStyle = K.spots; [[-8, -18], [-2, -11], [4, -20], [-11, -11]].forEach(([x, y]) => { E(g, x, y + bob, 2.6, 2.1); g.fill(); }); }
    leg(-6, 0, true); leg(11, 0.5, true);
    if (K.sash) { g.save(); E(g, 0, -14 + bob, 16, 11.5); g.clip(); g.fillStyle = lgr(g, LI(K.sash, 0.25), K.sash, 0, -20, 0, -5); g.beginPath(); g.moveTo(-14, -6 + bob); g.lineTo(10, -26 + bob); g.lineTo(15, -20 + bob); g.lineTo(-8, 0 + bob); g.closePath(); g.fill(); g.restore(); }
    if (K.armor) {
      RR(g, -4, -25 + bob, 18, 14, 5); g.fillStyle = lgr(g, LI(K.armor, 0.4), DK(K.armor, 0.22), 0, -25, 0, -11); g.fill();
      st(g, 0.9, rgba(DK(K.armor, 0.5), 0.7)); g.beginPath(); g.moveTo(-2, -18 + bob); g.lineTo(12, -18 + bob); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.55)'; RR(g, -2, -24 + bob, 14, 3, 1.5); g.fill();
      g.fillStyle = '#ffe28a'; [[-1, -14], [11, -14], [-1, -22], [11, -22]].forEach(([x, y]) => { E(g, x, y + bob, 1.1, 1.1); g.fill(); });
    }
    if (K.darkArmor) {
      RR(g, -7, -27 + bob, 23, 17, 6); g.fillStyle = lgr(g, '#55526e', '#1c1a28', 0, -27, 0, -10); g.fill();
      st(g, 1.4, '#a46bff'); RR(g, -5, -25 + bob, 19, 13, 5); g.stroke();
      fe(g, 1, -27 + bob, 7.5, 6, '#2f2d40'); st(g, 1.2, '#a46bff'); E(g, 1, -27 + bob, 7.5, 6); g.stroke();
      g.fillStyle = '#c9ccd6'; [[-4, -31], [1, -33.5], [6, -31]].forEach(([x, y]) => { g.beginPath(); g.moveTo(x - 1.8, y + 2 + bob); g.lineTo(x, y - 3 + bob); g.lineTo(x + 1.8, y + 2 + bob); g.fill(); });
      shadowMark(g, 7, -18 + bob, 0.7);
    }
    if (K.spikes) { g.fillStyle = '#2a2a33'; RR(g, 1, -28 + bob, 16, 4.5, 2); g.fill(); g.fillStyle = '#c9ccd6'; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(3 + i * 4, -27 + bob); g.lineTo(4.5 + i * 4, -32 + bob); g.lineTo(6 + i * 4, -27 + bob); g.fill(); } }
    if (K.collar) {
      g.save(); g.translate(8, -25 + bob); g.rotate(-1.15);
      RR(g, -8, -2.4, 16, 4.8, 2.4); g.fillStyle = lgr(g, LI(K.collar, 0.3), DK(K.collar, 0.22), 0, -2, 0, 2); g.fill(); g.restore();
      if (K.tag === 'bone') { bone(g, 12, -19 + bob, 9, '#ffd34d', 0.15); bone(g, 12, -19.6 + bob, 6, '#fff3b0', 0.15); }
      if (K.tag === 'star') star(g, 12, -19 + bob, 5.5, '#ffe14a', 0.45);
    }
    if (K.bandana) {
      g.beginPath(); g.moveTo(3, -29 + bob); g.lineTo(15, -25 + bob); g.lineTo(11, -14 + bob); g.closePath();
      g.fillStyle = lgr(g, LI(K.bandana, 0.22), DK(K.bandana, 0.18), 0, -28, 0, -15); g.fill();
      g.fillStyle = 'rgba(255,255,255,.85)'; [[8, -25], [12, -22], [10, -18]].forEach(([x, y]) => { E(g, x, y + bob, 1.1, 1.1); g.fill(); });
    }
    if (K.staff) drawStaff(g, K, atk, bob);

    // ---- 머리 (측면) ----
    const hx = 7 + (strike ? 2 : 0), hy = -40 + bob + (P.hurt ? 1.5 : 0);
    g.save(); g.translate(hx, hy); if (strike) g.rotate(0.07); if (P.hurt) g.rotate(-0.08);
    if (!K.evil && !K.noCute) { g.translate(-2, -1.5); g.scale(1.26, 1.26); }
    g.scale(HS / BX, HS / BY);
    const earUp = (x, y, rot, s, far) => {
      s *= ES; g.save(); g.translate(x, y); g.rotate(rot);
      g.beginPath(); g.moveTo(-6.5 * s, 3); g.quadraticCurveTo(-4 * s, -14 * s, 0.5 * s, -18 * s); g.quadraticCurveTo(5.5 * s, -12 * s, 7.5 * s, 3); g.closePath();
      g.fillStyle = rg(g, far ? DK(K.c3, 0.18) : K.c3, 0, -6, 11); g.fill();
      g.beginPath(); g.moveTo(-3.5 * s, 1); g.quadraticCurveTo(-1.5 * s, -10 * s, 0.6 * s, -13 * s); g.quadraticCurveTo(3.4 * s, -8 * s, 4.4 * s, 1); g.closePath();
      g.fillStyle = K.evil ? '#6d4a58' : (far ? '#d9848e' : lgr(g, '#ffc4c9', '#ee8f9a', 0, -12, 0, 1)); g.fill();
      if (!far) { fluff(g, 0, -2, 4, 4, Math.PI * 0.9, Math.PI * 1.6, 3, 2.4, K.c2); }
      g.restore();
    };
    if (K.ear === 'up' && !K.helm) earUp(2, -13, 0.32, 0.9, true);
    // 머리통
    E(g, -2, -1, 17, 16); g.fillStyle = rg(g, HC, -2, -1, 17, 0.32, 0.24); g.fill();
    fluff(g, -2, -1, 17, 16, Math.PI * 0.5, Math.PI * 0.98, 5, 3.6, HC);
    if (K.curly && !K.helmet) { for (let k = 0; k < 8; k++) { const a2 = Math.PI * (1.05 + k * 0.12); fe(g, -2 + Math.cos(a2) * 15, -4 + Math.sin(a2) * 13, 5, 5, LI(HC, 0.06), 0, 0.35, 0.2); } fe(g, -3, -15, 8, 7, LI(HC, 0.1), 0, 0.35, 0.2); }
    if (K.cheekFluff) { fluff(g, -2, 4, 15, 10, Math.PI * 0.2, Math.PI * 0.75, 6, 4.2, K.c2); }
    // 주둥이
    const mzT = () => { g.translate(5, 0); g.scale(MZ, MZ < 1 ? 1.08 : 1); g.translate(-5, 0); };
    const muzzle = () => { g.save(); mzT(); g.beginPath(); g.moveTo(5, -7); g.quadraticCurveTo(21, -8.5, 26.5, 0); g.quadraticCurveTo(28, 8.5, 20, 11); g.quadraticCurveTo(10, 13.5, 3, 8.5); g.closePath(); g.restore(); };
    muzzle(); g.fillStyle = rg(g, HC, 16, 1, 15, 0.35, 0.18); g.fill();
    // 무늬
    g.save(); E(g, -2, -1, 17, 16); muzzle(); g.clip();
    if (K.mark === 'urajiro') { fe(g, 14, 7, 15, 6.5, K.c2, 0, 0.3, 0.06); fe(g, 4, -9, 2.4, 1.7, K.c2); fe(g, -3, 8, 8, 5, K.c2); }
    if (K.mark === 'mask') { fe(g, 14, 6, 16, 7.5, K.c2, 0, 0.3, 0.06); g.beginPath(); g.moveTo(-4, -17); g.quadraticCurveTo(3, -9, 6, -5); g.quadraticCurveTo(4, -12, 6, -18); g.closePath(); g.fillStyle = K.c2; g.fill(); fe(g, 2, -10, 2.4, 1.6, K.c2); fe(g, -4, 8, 8, 5, K.c2); }
    if (K.mark === 'blaze') { g.beginPath(); g.moveTo(-6, -17); g.quadraticCurveTo(8, -12, 26, -2); g.lineTo(27, 3); g.quadraticCurveTo(10, -6, -8, -12); g.closePath(); g.fillStyle = K.c2; g.fill(); fe(g, 16, 8, 13, 5, K.c2); }
    if (!K.mark) { fe(g, 15, 8.5, 12, 4.4, K.c2, 0, 0.35, 0.08); }
    g.restore();
    hairs(g, -4, -3, 13, 12, 12, rgba(DK(HC, 0.4), 0.3), seed + 2);
    rim(g, -2, -1, 17, 16, Math.PI * 1.08, Math.PI * 1.62, RIM, 1.4);
    g.save(); mzT();
    st(g, 1, RIM); g.beginPath(); g.moveTo(8, -7.5); g.quadraticCurveTo(18, -8.5, 24, -3); g.stroke();
    if (K.mark === 'wrinkle') { st(g, 1.1, rgba(OUT, 0.45)); g.beginPath(); g.moveTo(8, -5); g.quadraticCurveTo(10, -1, 8, 3); g.moveTo(11, -6); g.quadraticCurveTo(13.5, -2, 11.5, 2); g.moveTo(-1, -12); g.quadraticCurveTo(4, -14, 8, -12); g.stroke(); }
    if (K.jowl) { g.beginPath(); g.moveTo(12, 6); g.quadraticCurveTo(22, 6, 25, 10); g.quadraticCurveTo(22, 16, 13, 14); g.closePath(); g.fillStyle = rg(g, K.c2, 18, 10, 9, 0.3, 0.15); g.fill(); }
    // 코
    E(g, 26.2, 0.2, 3.9, 3.3, -0.2); g.fillStyle = lgr(g, '#5a3a2c', '#140b07', 0, -3, 0, 3.5); g.fill();
    E(g, 25.4, -1.2, 1.5, 0.9); g.fillStyle = 'rgba(255,255,255,.75)'; g.fill();
    E(g, 28.4, 1.2, 0.8, 0.6); g.fillStyle = '#000'; g.fill();
    // 입
    const open = strike || P.happy || ex === 'happy' || ex === 'love' || ex === 'wink';
    if (open) {
      g.beginPath(); g.moveTo(26, 5); g.quadraticCurveTo(19, 16.5, 11, 8.5); g.quadraticCurveTo(19, 9.5, 26, 5); g.closePath(); g.fillStyle = '#6b1f24'; g.fill();
      E(g, 18, 11.5, 3.6, 2.2, 0.2); g.fillStyle = '#ff7f8f'; g.fill();
      if (K.evil) { g.fillStyle = '#fff'; [[22.5, 6.6], [16, 8.4]].forEach(([x, y]) => { g.beginPath(); g.moveTo(x - 1.3, y); g.lineTo(x + 1.3, y); g.lineTo(x, y + 3); g.fill(); }); }
    } else if (ex === 'surprise') { E(g, 21, 9, 2.2, 2.8); g.fillStyle = '#6b1f24'; g.fill(); }
    else if (ex === 'sad' || ex === 'sleepy') { st(g, 1.4); g.beginPath(); g.moveTo(25, 7); g.quadraticCurveTo(19, 6.5, 13.5, 9.5); g.stroke(); }
    else {
      st(g, 1.4); g.beginPath(); g.moveTo(26, 4.5); g.quadraticCurveTo(21, 9.5, 13.5, 7.2); g.quadraticCurveTo(12, 6.6, 11.6, 5.2); g.stroke();
      if (K.evil) { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(21, 6.8); g.lineTo(23.4, 6.2); g.lineTo(22.4, 9.6); g.fill(); }
    }
    if (K.teeth) { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(21, 8.5); g.lineTo(23.6, 8.2); g.lineTo(22.6, 4.6); g.closePath(); g.fill(); }
    if (K.tongue && !open) { E(g, 21, 10, 2.6, 3.4); g.fillStyle = '#ff7f8f'; g.fill(); st(g, 0.6, '#d9506a'); g.beginPath(); g.moveTo(21, 8); g.lineTo(21, 12); g.stroke(); }
    g.restore();
    // 눈 (하나)
    if (!K.helm) {
      const vo = K.evil ? { glow: K.iris, lid: HC, blink: P.blink, hurt: P.hurt } : { iris: K.iris, blink: P.blink, hurt: P.hurt, expr: ex };
      if (K.evil) eyeKit(g, 6.5, -3.5, 4.7, 5.9, vo); else eyeKit(g, 6.4, -3.2, 6.1, 7.5, Object.assign(vo, { sparkle: true }));
      if (K.flameEye) { g.save(); g.globalCompositeOperation = 'lighter'; [[5, -12, 2.4, 5.4], [8, -13.5, 1.6, 4], [3, -12.5, 1.5, 3.6]].forEach(([x, y, rx, ry]) => { E(g, x, y, rx, ry); g.fillStyle = 'rgba(200,110,255,.85)'; g.fill(); }); g.restore(); }
      if (K.glasses) { st(g, 1.3, '#c9a24a'); E(g, 6, -4, 6.6, 6.8); g.stroke(); g.beginPath(); g.moveTo(-0.6, -5); g.lineTo(-10, -6); g.stroke(); E(g, 6, -4, 6.6, 6.8); g.fillStyle = 'rgba(200,230,255,.18)'; g.fill(); }
      const browOn = K.brow || ex === 'angry' || ex === 'sad';
      if (browOn) {
        st(g, 2, DK(HC, 0.6)); g.beginPath();
        if (K.evil || ex === 'angry') { g.moveTo(1, -12.5); g.lineTo(10.5, -9.5); }
        else if (ex === 'sad') { g.moveTo(1.5, -10); g.lineTo(10, -12.5); }
        else { g.moveTo(1, -11.8); g.lineTo(10, -11); }
        g.stroke();
      }
      if (K.scar) { st(g, 1.4, '#e3a9a9'); g.beginPath(); g.moveTo(1, -14); g.lineTo(10.5, 2); g.stroke(); }
      if (!K.evil) { const bl = g.createRadialGradient(7, 5.4, 0, 7, 5.4, 5.2); bl.addColorStop(0, ex === 'love' ? 'rgba(255,80,120,.75)' : 'rgba(255,110,140,.68)'); bl.addColorStop(1, 'rgba(255,110,140,0)'); g.fillStyle = bl; E(g, 7, 5.4, 5.2, 3.2); g.fill(); g.fillStyle = 'rgba(255,255,255,.7)'; E(g, 5.2, 4.4, 0.8, 0.5); g.fill(); E(g, 8.4, 4.8, 0.6, 0.4); g.fill(); }
      if (ex === 'sad') { g.beginPath(); g.moveTo(9.5, 1); g.quadraticCurveTo(7, 6.5, 9.5, 8); g.quadraticCurveTo(12, 6.5, 9.5, 1); g.fillStyle = '#7fd0ff'; g.fill(); }
    }
    // 앞 귀 (서는 귀)
    if (K.ear === 'up' && !K.helm) earUp(-6, -12, -0.22, 1, false);
    drawHats(g, K, mv, a, br);
    // 앞 귀 (처진 귀) — 모자 아래로 늘어짐
    if (K.ear !== 'up') {
      g.save(); g.translate(-6, -8 + (K.helmet ? 1 : 0)); g.rotate(0.28 + (mv ? a * 0.16 : br * 0.05) + (P.hurt ? 0.3 : 0));
      const Lx = K.earLong ? 1.25 : 1; g.scale(ES, ES);
      g.beginPath(); g.moveTo(-4, -4); g.quadraticCurveTo(-11, 7 * Lx, -7.5, 17 * Lx); g.quadraticCurveTo(-2, 22.5 * Lx, 4.5, 15.5 * Lx); g.quadraticCurveTo(6.5, 3, 3.5, -5); g.closePath();
      g.fillStyle = rg(g, K.c3, -2, 6 * Lx, 13 * Lx, 0.3, 0.28); g.fill();
      hairs(g, -1.5, 7 * Lx, 4, 8 * Lx, 7, rgba(DK(K.c3, 0.45), 0.4), seed + 4);
      st(g, 0.9, RIM); g.beginPath(); g.moveTo(-6, 2); g.quadraticCurveTo(-9, 9 * Lx, -6.5, 15 * Lx); g.stroke();
      fluff(g, -1.5, 9 * Lx, 6, 9 * Lx, Math.PI * 0.35, Math.PI * 0.75, 3, 2.6, K.c3);
      g.restore();
    }
    g.restore();

    drawWeapons(g, K, P, atk, sw, bob, mv, a, br);
    g.restore();
  }
  // v1.2: 모자·무기를 함수로 분리 (옛 측면 강아지 + 새 봉제인형 강아지가 함께 사용)
  function drawHats(g, K, mv, a, br) {
    // 모자류
    g.save(); g.translate(0, (K.helmet || K.ironcap || K.archer || K.headband) ? -4 : 0);
    if (K.helmet) {
      g.beginPath(); g.ellipse(-2, -7, 18.6, 16, 0, Math.PI * 1.0, Math.PI * 2.0); g.lineTo(14, -6); g.lineTo(-20.6, -6); g.closePath();
      g.fillStyle = lgr(g, '#ffffff', '#8c9dac', -12, -22, 10, -5); g.fill();
      st(g, 1.1, 'rgba(255,255,255,.95)'); g.beginPath(); g.ellipse(-3, -8, 13, 11, 0, Math.PI * 1.15, Math.PI * 1.55); g.stroke();
      st(g, 0.9, 'rgba(70,90,110,.5)'); g.beginPath(); g.moveTo(-2, -23); g.quadraticCurveTo(-3, -14, -2, -7); g.stroke();
      RR(g, -21, -9.5, 37, 5, 2.5); g.fillStyle = lgr(g, '#fff0a0', '#d79a1c', 0, -9.5, 0, -4.5); g.fill();
      g.beginPath(); g.moveTo(12, -9.5); g.quadraticCurveTo(20, -9, 21, -5); g.lineTo(13, -4.5); g.closePath(); g.fillStyle = lgr(g, '#e8eef3', '#93a4b3', 0, -9, 0, -4); g.fill();
      g.fillStyle = '#b8770f'; [-16, -8, 0, 8].forEach(x => { E(g, x, -7, 1.1, 1.1); g.fill(); });
      g.beginPath(); g.moveTo(-4, -22); g.bezierCurveTo(-8, -38, -26, -40, -33, -28); g.bezierCurveTo(-24, -33, -14, -29, -10, -19); g.closePath();
      g.fillStyle = lgr(g, LI(K.plume, 0.3), DK(K.plume, 0.25), -24, -38, -6, -20); g.fill();
      st(g, 0.8, 'rgba(255,255,255,.65)'); g.beginPath(); g.moveTo(-7, -24); g.bezierCurveTo(-11, -33, -20, -36, -28, -31); g.moveTo(-9, -22); g.quadraticCurveTo(-15, -27, -22, -27); g.stroke();
      fe(g, -5, -21.5, 3, 2.4, '#ffd34d');
      if (K.visor) {
        g.beginPath(); g.moveTo(-11, -19); g.quadraticCurveTo(4, -25, 16, -16); g.lineTo(17, -9); g.quadraticCurveTo(3, -12, -11, -10); g.closePath(); g.fillStyle = lgr(g, '#f6f9fb', '#8396a8', 0, -24, 0, -9); g.fill(); st(g, 1, 'rgba(50,60,70,.85)'); g.stroke();
        g.fillStyle = '#2a2f36'; for (let k = 0; k < 6; k++) { RR(g, -7 + k * 3.9, -19.5 + Math.abs(k - 2.5) * 0.5, 1.7, 7.5, 0.8); g.fill(); }
        E(g, -12, -13.5, 2.4, 2.4); g.fillStyle = '#c9d2da'; g.fill(); st(g, 0.8, 'rgba(50,60,70,.85)'); g.stroke();
      }
    }
    if (K.helm) {
      g.beginPath(); g.moveTo(-19, 6); g.quadraticCurveTo(-21, -20, 0, -20); g.quadraticCurveTo(20, -20, 24, -4); g.lineTo(27, 6); g.quadraticCurveTo(10, 12, -19, 6); g.closePath();
      g.fillStyle = lgr(g, '#6d6a86', '#25233a', 0, -20, 0, 8); g.fill();
      st(g, 1, 'rgba(255,255,255,.35)'); g.beginPath(); g.moveTo(-16, -6); g.quadraticCurveTo(-12, -17, 2, -18); g.stroke();
      RR(g, 2, -6, 22, 3.6, 1.8); g.fillStyle = '#0d0a14'; g.fill();
      g.save(); g.globalCompositeOperation = 'lighter'; const eg = g.createRadialGradient(10, -4.2, 0, 10, -4.2, 9); eg.addColorStop(0, rgba(K.iris, 0.95)); eg.addColorStop(1, rgba(K.iris, 0)); g.fillStyle = eg; E(g, 10, -4.2, 9, 5); g.fill(); g.restore();
      E(g, 10, -4.2, 2.6, 1.3); g.fillStyle = LI(K.iris, 0.5); g.fill();
      g.fillStyle = '#7b2a9e'; g.beginPath(); g.moveTo(-6, -20); g.quadraticCurveTo(-18, -34, -28, -26); g.quadraticCurveTo(-18, -26, -10, -17); g.fill();
      g.fillStyle = '#c9ccd6'; [[-2, -20], [6, -19]].forEach(([x, y]) => { g.beginPath(); g.moveTo(x - 2, y + 1); g.lineTo(x, y - 6); g.lineTo(x + 2, y + 1); g.fill(); });
    }
    if (K.ironcap) {
      g.beginPath(); g.ellipse(-2, -9, 17.5, 14, 0, Math.PI, TAU); g.closePath(); g.fillStyle = lgr(g, '#a7b0b8', '#4f5861', -8, -23, 6, -9); g.fill();
      RR(g, -20, -11, 36, 4, 2); g.fillStyle = '#5d4a3a'; g.fill(); g.fillStyle = '#d6dbe0'; [-14, -4, 6].forEach(x => { E(g, x, -9, 1.2, 1.2); g.fill(); });
      st(g, 1, 'rgba(255,255,255,.6)'); g.beginPath(); g.ellipse(-4, -10, 12, 9, 0, Math.PI * 1.2, Math.PI * 1.55); g.stroke();
    }
    if (K.nurseCap) {
      RR(g, -10, -24, 20, 10, 3); g.fillStyle = lgr(g, '#ffffff', '#f0e6ec', 0, -24, 0, -14); g.fill(); st(g, 1, OUT); g.stroke();
      g.fillStyle = '#ff4f8f'; g.fillRect(-1.6, -23, 3.2, 8); g.fillRect(-4.5, -20.6, 9, 3.2);
      if (K.promo) [[-10, -1], [10, 1]].forEach(([x, d]) => { g.beginPath(); g.moveTo(x, -20); g.quadraticCurveTo(x + d * 10, -32, x + d * 16, -26); g.quadraticCurveTo(x + d * 12, -24, x + d * 13, -20); g.quadraticCurveTo(x + d * 8, -20, x + d * 9, -16); g.quadraticCurveTo(x + d * 4, -17, x, -16); g.closePath(); g.fillStyle = '#ffffff'; g.fill(); st(g, 1, OUT); g.stroke(); });
    }
    if (K.hood) {
      // 치치: 이마만 살짝 덮는 닌자 두건 + 뒤로 날리는 매듭
      g.beginPath(); g.moveTo(-17, -6); g.quadraticCurveTo(-16, -21, -2, -21); g.quadraticCurveTo(10, -21, 13, -13); g.quadraticCurveTo(0, -15, -17, -6); g.closePath(); g.fillStyle = lgr(g, LI(K.hood, 0.25), DK(K.hood, 0.15), 0, -21, 0, -8); g.fill(); st(g, 1, OUT); g.stroke();
      st(g, 1.2, 'rgba(255,255,255,.4)'); g.beginPath(); g.moveTo(-12, -13); g.quadraticCurveTo(-2, -18, 8, -15); g.stroke();
      g.fillStyle = DK(K.hood, 0.1); g.beginPath(); g.moveTo(-16, -9); g.quadraticCurveTo(-26, -12, -30, -6); g.lineTo(-24, -6); g.quadraticCurveTo(-28, -1, -32, 2); g.quadraticCurveTo(-22, 0, -15, -5); g.closePath(); g.fill();
    }
    if (K.goggles) { st(g, 2.2, '#5a3a22'); g.beginPath(); g.moveTo(-14, -12); g.lineTo(14, -13); g.stroke(); E(g, 4, -14, 5, 4); g.fillStyle = '#ffd34d'; g.fill(); st(g, 1.2, OUT); g.stroke(); E(g, 4, -14, 3.2, 2.4); g.fillStyle = 'rgba(140,220,255,.85)'; g.fill(); E(g, 3, -15, 1, 0.8); g.fillStyle = '#fff'; g.fill(); }
    if (K.wizard) {
      E(g, -1, -13, 23, 5.5, -0.12); g.fillStyle = rg(g, K.wizard, -1, -13, 23, 0.25); g.fill();
      g.beginPath(); g.moveTo(-14, -15); g.quadraticCurveTo(-10, -32, -26, -46); g.quadraticCurveTo(-2, -38, 12, -17); g.closePath();
      g.fillStyle = lgr(g, LI(K.wizard, 0.28), DK(K.wizard, 0.28), -14, -46, 8, -16); g.fill();
      RR(g, -13, -19.5, 25, 5, 2.5); g.fillStyle = lgr(g, '#fff0a0', '#d79a1c', 0, -19.5, 0, -14.5); g.fill();
      star(g, -6, -29, 4, '#fff3a0'); star(g, -16, -38, 2.4, '#fff3a0'); E(g, -26, -46, 2.8, 2.8); g.fillStyle = '#fff3a0'; g.fill();
    }
    if (K.archer) {
      g.beginPath(); g.ellipse(-2, -8, 18.5, 15, 0, Math.PI * 1.02, Math.PI * 1.98); g.closePath(); g.fillStyle = lgr(g, LI(K.archer, 0.28), DK(K.archer, 0.22), -8, -23, 6, -8); g.fill();
      g.beginPath(); g.moveTo(10, -10); g.quadraticCurveTo(24, -11, 28, -5); g.lineTo(12, -6); g.closePath(); g.fillStyle = DK(K.archer, 0.18); g.fill();
      g.beginPath(); g.moveTo(-14, -14); g.quadraticCurveTo(-30, -30, -36, -21); g.quadraticCurveTo(-28, -19, -15, -10); g.closePath(); g.fillStyle = lgr(g, '#ffffff', '#e05a4f', -36, -22, -14, -12); g.fill();
      st(g, 0.7, 'rgba(120,30,20,.5)'); g.beginPath(); g.moveTo(-15, -12); g.quadraticCurveTo(-26, -20, -34, -21); g.stroke();
    }
    if (K.headband) {
      g.save(); g.rotate(-0.08); RR(g, -19, -12, 33, 5.2, 2.5); g.fillStyle = lgr(g, LI(K.headband, 0.22), DK(K.headband, 0.15), 0, -12, 0, -7); g.fill(); g.restore();
      const fl = mv ? a * 2 : br;
      g.fillStyle = DK(K.headband, 0.05);
      g.beginPath(); g.moveTo(-18, -10); g.quadraticCurveTo(-28, -13 + fl, -35, -7 + fl); g.lineTo(-32, -4 + fl); g.quadraticCurveTo(-26, -8, -18, -6); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(-18, -8); g.quadraticCurveTo(-26, -3 - fl, -31, 2 - fl); g.lineTo(-28, 4 - fl); g.quadraticCurveTo(-23, -1, -18, -5); g.closePath(); g.fill();
    }
    if (K.crown) {
      g.fillStyle = lgr(g, '#5a4a7a', '#1c1428', 0, -40, 0, -16);
      [[-12, -15, 11], [-5, -17, 16], [3, -17, 13], [10, -15, 9]].forEach(([x, y, h]) => { g.beginPath(); g.moveTo(x - 3.2, y); g.lineTo(x, y - h); g.lineTo(x + 3.2, y); g.closePath(); g.fill(); });
      RR(g, -15, -18, 29, 4.5, 2); g.fill(); E(g, -1, -16, 1.8, 1.8); g.fillStyle = '#e3a8ff'; g.fill();
    }
    g.restore();
  }
  function drawWeapons(g, K, P, atk, sw, bob, mv, a, br) {
    // ---- 무기 ----
    const hand = (x, y) => { fe(g, x, y, 3.9, 3.4, K.c2); st(g, 0.7, rgba(OUT, 0.4)); g.beginPath(); g.moveTo(x + 1, y - 2); g.lineTo(x + 1, y + 1.5); g.stroke(); };
    if (K.shield) {
      const sx = atk >= 0 && atk < 0.35 ? -2 : 0;
      g.save(); g.translate(1 + sx, -12 + bob + (K.plush ? 4 : 0));
      E(g, 0, 0, 9.8, 10.8); g.fillStyle = lgr(g, '#fff0a0', '#b8770f', -6, -10, 6, 10); g.fill();
      E(g, 0, 0, 7.8, 8.8); g.fillStyle = rg(g, K.shieldC || '#3d8bff', 0, 0, 9, 0.4, 0.3); g.fill();
      g.fillStyle = '#ffe28a'; [[0, -9.8], [9, 0], [0, 9.8], [-9, 0]].forEach(([x, y]) => { E(g, x * 0.92, y * 0.92, 1.1, 1.1); g.fill(); });
      paw(g, 0, 0.5, 0.95, K.shieldC === '#3a2a52' ? '#c56bff' : '#fff7d6');
      st(g, 1.1, 'rgba(255,255,255,.7)'); g.beginPath(); g.ellipse(0, 0, 6.2, 7.2, 0, Math.PI * 1.1, Math.PI * 1.45); g.stroke();
      g.restore();
    }
    if (K.sword || K.katana || K.axe || K.hammer || K.great) {
      g.save(); g.translate(19, -11 + bob); g.rotate(K.plush ? Math.max(0.7, Math.min(1.9, sw)) : sw);
      const wcol = K.blade || '#eef6ff', wgem = K.wgem;
      if (K.hammer) {
        RR(g, -1.6, -24, 3.2, 34, 1.3); g.fillStyle = lgr(g, '#8a5a35', '#4e3020', -2, 0, 2, 0); g.fill(); st(g, 0.6, 'rgba(255,220,150,.6)'); for (let y = 0; y < 9; y += 2.2) { g.beginPath(); g.moveTo(-1.6, y); g.lineTo(1.6, y + 1); g.stroke(); }
        RR(g, -9, -36, 18, 13, 3); g.fillStyle = lgr(g, '#ffffff', wcol === '#eef6ff' ? '#8d99a6' : DK(wcol, 0.2), -9, -36, 9, -23); g.fill(); st(g, 1, OUT); g.stroke();
        RR(g, -10, -31, 20, 3, 1.4); g.fillStyle = '#ffd34d'; g.fill(); paw(g, 0, -29.5, 0.42, 'rgba(255,255,255,.75)');
        st(g, 0.9, 'rgba(255,255,255,.85)'); g.beginPath(); g.moveTo(-7, -34.5); g.lineTo(5, -34.5); g.stroke();
        if (wgem) { E(g, 0, -29.5, 2.3, 2.3); g.fillStyle = wgem; g.fill(); }
      } else if (K.great) {
        RR(g, -2, 0, 4, 11, 1.4); g.fillStyle = '#4a2f5a'; g.fill(); st(g, 0.6, '#ffd34d'); for (let y = 1; y < 10; y += 2.4) { g.beginPath(); g.moveTo(-2, y); g.lineTo(2, y + 1); g.stroke(); }
        RR(g, -8, -3.5, 16, 4, 2); g.fillStyle = lgr(g, '#fff0a0', '#c08a18', 0, -3.5, 0, 0.5); g.fill(); st(g, 0.8, OUT); g.stroke();
        g.beginPath(); g.moveTo(-4.4, -3.5); g.lineTo(-4, -40); g.lineTo(0, -48); g.lineTo(4, -40); g.lineTo(4.4, -3.5); g.closePath(); g.fillStyle = lgr(g, '#ffffff', wcol === '#eef6ff' ? '#9db4c6' : wcol, -4, 0, 4, 0); g.fill(); st(g, 0.9, OUT); g.stroke();
        st(g, 1, 'rgba(255,255,255,.95)'); g.beginPath(); g.moveTo(-1.2, -6); g.lineTo(-1.2, -40); g.stroke();
        if (wgem) { E(g, 0, -1.5, 2.4, 2.4); g.fillStyle = wgem; g.fill(); st(g, 0.6, OUT); g.stroke(); }
        if (K.bladeGlow) { g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = rgba(wcol, 0.45); g.fillRect(-7, -48, 14, 46); g.restore(); }
        fe(g, 0, 12, 2.6, 2.6, '#ffd34d');
      } else if (K.axe) {
        RR(g, -1.4, -26, 2.8, 34, 1.2); g.fillStyle = '#5b4030'; g.fill();
        g.beginPath(); g.moveTo(1, -27); g.quadraticCurveTo(14, -27, 13, -13); g.quadraticCurveTo(6, -17, 1, -15); g.closePath(); g.fillStyle = lgr(g, '#eef1f5', wcol === '#eef6ff' ? '#6c7380' : DK(wcol, 0.1), 0, -27, 0, -13); g.fill();
        if (K.hero) { g.beginPath(); g.moveTo(-1, -27); g.quadraticCurveTo(-9, -24, -8, -16); g.quadraticCurveTo(-4, -18, -1, -16); g.closePath(); g.fillStyle = lgr(g, '#eef1f5', '#6c7380', 0, -27, 0, -16); g.fill(); if (wgem) { E(g, 0, -21, 2, 2); g.fillStyle = wgem; g.fill(); } }
        st(g, 0.9, 'rgba(255,255,255,.8)'); g.beginPath(); g.moveTo(12, -24); g.quadraticCurveTo(13, -19, 12.4, -15); g.stroke();
      } else if (K.katana) {
        RR(g, -1.6, -1, 3.2, 9, 1.2); g.fillStyle = '#b71c1c'; g.fill(); st(g, 0.6, '#ffd34d'); for (let y = 0; y < 8; y += 2.4) { g.beginPath(); g.moveTo(-1.6, y); g.lineTo(1.6, y + 1.2); g.stroke(); }
        E(g, 0, -1.5, 4.2, 1.6); g.fillStyle = '#ffd34d'; g.fill();
        g.beginPath(); g.moveTo(-1.8, -2.5); g.quadraticCurveTo(-3.5, -20, -1, -37); g.lineTo(1.6, -33); g.quadraticCurveTo(0.5, -18, 1.8, -2.5); g.closePath(); g.fillStyle = lgr(g, '#ffffff', '#a9bccb', -2, 0, 2, 0); g.fill();
        st(g, 0.6, 'rgba(255,255,255,.95)'); g.beginPath(); g.moveTo(0.6, -4); g.quadraticCurveTo(-0.6, -18, 0.4, -32); g.stroke();
      } else {
        const blade = K.blade || '#eef6ff';
        RR(g, -1.7, -1, 3.4, 9, 1.4); g.fillStyle = '#7a4a2a'; g.fill(); st(g, 0.6, 'rgba(255,220,150,.6)'); for (let y = 0.5; y < 8; y += 2.2) { g.beginPath(); g.moveTo(-1.7, y); g.lineTo(1.7, y + 1); g.stroke(); }
        bone(g, 0, -1.5, 13, '#ffd34d', 0); bone(g, 0, -1.9, 9, '#fff1a6', 0);
        g.beginPath(); g.moveTo(-2.8, -3); g.lineTo(-2.4, -33); g.lineTo(0, -39); g.lineTo(2.4, -33); g.lineTo(2.8, -3); g.closePath();
        g.fillStyle = lgr(g, '#ffffff', blade === '#eef6ff' ? '#9db4c6' : blade, -3, 0, 3, 0); g.fill();
        st(g, 0.8, 'rgba(255,255,255,.95)'); g.beginPath(); g.moveTo(-0.6, -5); g.lineTo(-0.6, -33); g.stroke();
        st(g, 0.5, rgba(DK(blade, 0.4), 0.5)); g.beginPath(); g.moveTo(1.2, -6); g.lineTo(1, -31); g.stroke();
        if (blade !== '#eef6ff') { g.globalAlpha = 0.35; g.fillStyle = blade; g.beginPath(); g.moveTo(-4, -3); g.lineTo(-3.5, -34); g.lineTo(0, -41); g.lineTo(3.5, -34); g.lineTo(4, -3); g.closePath(); g.fill(); g.globalAlpha = 1; }
        fe(g, 0, 9, 2.3, 2.3, '#ffd34d');
        if (K.bladeGlow) { g.save(); g.globalCompositeOperation = 'lighter'; const bg2 = g.createLinearGradient(-6, 0, 6, 0); bg2.addColorStop(0, 'rgba(180,90,255,0)'); bg2.addColorStop(0.5, 'rgba(200,120,255,.55)'); bg2.addColorStop(1, 'rgba(180,90,255,0)'); g.fillStyle = bg2; g.fillRect(-6, -42, 12, 40); g.restore(); }
      }
      g.restore(); hand(19, -11 + bob);
    }
    if (K.spear) {
      const th = atk >= 0.35 && atk < 0.7 ? 7 : atk >= 0 && atk < 0.35 ? -3 : 0;
      g.save(); g.translate(13 + th, -14 + bob); g.rotate(1.25);
      RR(g, -1.3, -30, 2.6, 40, 1.2); g.fillStyle = lgr(g, '#a1785a', '#6b4a33', -1, 0, 1, 0); g.fill();
      g.beginPath(); g.moveTo(-3.8, -29); g.lineTo(0, -40); g.lineTo(3.8, -29); g.lineTo(0, -31); g.closePath(); g.fillStyle = lgr(g, '#ffffff', '#9fb2c0', -3, 0, 3, 0); g.fill();
      g.fillStyle = '#e53935'; g.beginPath(); g.moveTo(-1.3, -28); g.lineTo(-5.5, -23); g.lineTo(1.3, -26); g.fill(); g.beginPath(); g.moveTo(1.3, -28); g.lineTo(5, -24); g.lineTo(-1, -26); g.fill();
      g.restore(); hand(13 + th, -14 + bob);
    }
    if (K.bow) {
      const pull = atk >= 0 && atk < 0.35 ? atk / 0.35 * 6 : atk >= 0.35 && atk < 0.45 ? 6 : 0;
      g.save(); g.translate(21 + (K.plush ? 3 : 0), -18 + bob + (K.plush ? 10 : 0));
      st(g, 2.8, '#8a5a35'); g.beginPath(); g.arc(-4, 0, 13, -1.15, 1.15); g.stroke();
      st(g, 0.8, '#d9a066'); g.beginPath(); g.arc(-4, 0, 13, -0.6, 0.6); g.stroke();
      st(g, 0.9, '#f4f4f4'); g.beginPath(); g.moveTo(-4 + Math.cos(-1.15) * 13, Math.sin(-1.15) * 13); g.lineTo(-pull - 2, 0); g.lineTo(-4 + Math.cos(1.15) * 13, Math.sin(1.15) * 13); g.stroke();
      if (atk >= 0 && atk < 0.45) { st(g, 1.2, '#6b4a33'); g.beginPath(); g.moveTo(-pull - 2, 0); g.lineTo(14, 0); g.stroke(); g.fillStyle = '#cfd8dc'; g.beginPath(); g.moveTo(14, -2); g.lineTo(18, 0); g.lineTo(14, 2); g.fill(); }
      g.restore(); hand(19, -18 + bob);
    }
    if (K.bigShield) {
      const bash = atk >= 0.35 && atk < 0.7 ? 5 : 0;
      g.save(); g.translate(22 + bash, -16 + bob);
      RR(g, -7, -15, 15, 30, 6); g.fillStyle = lgr(g, '#d09660', '#7c5030', -7, 0, 8, 0); g.fill();
      st(g, 2.4, '#9aa4ad'); RR(g, -7, -15, 15, 30, 6); g.stroke();
      st(g, 0.8, rgba(OUT, 0.35)); g.beginPath(); g.moveTo(-2, -14); g.lineTo(-2, 14); g.moveTo(3, -14); g.lineTo(3, 14); g.stroke();
      g.fillStyle = '#d6dbe0'; [[-5, -12], [6, -12], [-5, 12], [6, 12]].forEach(([x, y]) => { E(g, x, y, 1.1, 1.1); g.fill(); });
      fe(g, 0.5, 0, 5.2, 5.2, '#d7dce1'); paw(g, 0.5, 0.3, 0.55, '#6b7680');
      g.restore();
    }
    if (K.cannon) {
      const rec = atk >= 0.35 && atk < 0.6 ? -3 : 0;
      g.save(); g.translate(-16 + rec, -22 + bob); g.rotate(-0.28); g.scale(0.82, 0.82);
      RR(g, -4, -5, 24, 10, 5); g.fillStyle = lgr(g, '#8fa3b5', '#3d4d5c', 0, -5, 0, 5); g.fill(); st(g, 1.2, OUT); g.stroke();
      RR(g, 16, -6.5, 5, 13, 2); g.fillStyle = '#ffd34d'; g.fill(); st(g, 1, OUT); g.stroke();
      st(g, 1, 'rgba(255,255,255,.7)'); g.beginPath(); g.moveTo(-1, -3); g.lineTo(15, -3); g.stroke();
      paw(g, 5, 0.5, 0.5, '#ffd34d');
      if (atk >= 0.35 && atk < 0.6) { g.save(); g.globalCompositeOperation = 'lighter'; g.drawImage(softDot('#ffcf6b'), 18, -12, 24, 24); g.restore(); }
      g.restore();
      st(g, 2, '#6b4a33'); g.beginPath(); g.moveTo(-10, -18 + bob); g.lineTo(6, -24 + bob); g.stroke();
    }
    if (K.healStaff) {
      const up2 = atk >= 0 && atk < 0.6 ? Math.sin(atk / 0.6 * Math.PI) : 0;
      g.save(); g.translate(26, -8 + bob - up2 * 4); g.rotate(0.35 - up2 * 0.4); g.scale(0.85, 0.85);
      RR(g, -1.3, -26, 2.6, 30, 1.2); g.fillStyle = lgr(g, '#ffffff', '#f2c4d6', -1, 0, 1, 0); g.fill(); st(g, 0.8, OUT); g.stroke();
      const hy2 = -31; g.beginPath(); g.moveTo(0, hy2 + 6); g.bezierCurveTo(-9, hy2 - 1, -4, hy2 - 9, 0, hy2 - 4); g.bezierCurveTo(4, hy2 - 9, 9, hy2 - 1, 0, hy2 + 6); g.fillStyle = lgr(g, '#ffb3cf', '#ff4f8f', 0, hy2 - 8, 0, hy2 + 6); g.fill(); st(g, 1, OUT); g.stroke();
      E(g, -2, hy2 - 3, 1.4, 1); g.fillStyle = '#fff'; g.fill();
      if (up2 > 0.2) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = up2; g.drawImage(softDot('#ff9ec7'), -16, hy2 - 16, 32, 32); g.restore(); }
      g.restore(); hand(18, -14 + bob);
    }
    if (K.lance) {
      const th = atk >= 0.35 && atk < 0.7 ? 9 : atk >= 0 && atk < 0.35 ? -3 : 0;
      g.save(); g.translate(8 + th, -19 + bob); g.rotate(1.5);
      RR(g, -1.4, -34, 2.8, 40, 1.2); g.fillStyle = lgr(g, '#c9a06a', '#7a5230', -1, 0, 1, 0); g.fill();
      g.beginPath(); g.moveTo(-3.4, -33); g.lineTo(0, -48); g.lineTo(3.4, -33); g.closePath(); g.fillStyle = lgr(g, '#ffffff', '#9fb2c0', -3, 0, 3, 0); g.fill(); st(g, 0.8, OUT); g.stroke();
      g.beginPath(); g.moveTo(-4.5, -10); g.lineTo(0, -16); g.lineTo(4.5, -10); g.lineTo(3, 2); g.lineTo(-3, 2); g.closePath(); g.fillStyle = lgr(g, '#ffe28a', '#c98b2a', 0, -16, 0, 2); g.fill(); st(g, 0.8, OUT); g.stroke();
      g.fillStyle = '#2f8cff'; g.beginPath(); g.moveTo(1.4, -30); g.lineTo(8, -27); g.lineTo(1.4, -24); g.fill();
      g.restore(); hand(13 + th, -18 + bob);
    }
    if (K.towerShield) {
      // 태산: 몸을 다 가리는 거대 탑 방패 (금 테두리 · 발바닥 문장 · 리벳)
      const bash = atk >= 0.35 && atk < 0.7 ? 7 : 0, tilt = atk >= 0.35 && atk < 0.7 ? -0.08 : 0;
      g.save(); g.translate(21 + bash, -11 + bob + (K.plush ? 10 : 0)); g.rotate(tilt); g.scale(K.plush ? 0.66 : 0.74, K.plush ? 0.66 : 0.74);
      g.beginPath(); g.moveTo(-11, -24); g.quadraticCurveTo(0, -30, 11, -24); g.lineTo(11, 12); g.quadraticCurveTo(0, 26, -11, 12); g.closePath();
      g.fillStyle = K.promo ? lgr(g, '#fff0a0', '#c8901a', -11, 0, 11, 0) : lgr(g, '#6fa0e8', '#24508e', -11, 0, 11, 0); g.fill(); st(g, 3.2, K.promo ? '#ffffff' : '#ffd34d'); g.stroke(); st(g, 1.2, OUT); g.stroke();
      g.beginPath(); g.moveTo(-7, -20); g.quadraticCurveTo(0, -24, 7, -20); g.lineTo(7, 10); g.quadraticCurveTo(0, 20, -7, 10); g.closePath(); st(g, 1, 'rgba(255,255,255,.35)'); g.stroke();
      fe(g, 0, -3, 7.5, 7.5, '#ffe28a'); paw(g, 0, -2.6, 0.75, '#8a5a12');
      g.fillStyle = '#e8edf2'; [[-8, -20], [8, -20], [-8, 8], [8, 8], [0, 16]].forEach(([x, y]) => { E(g, x, y, 1.3, 1.3); g.fill(); });
      st(g, 1.2, 'rgba(255,255,255,.55)'); g.beginPath(); g.moveTo(-8, -18); g.lineTo(-8, 4); g.stroke();
      g.restore();
    }
    if (K.quiver) { g.save(); g.translate(-15, -17 + bob); g.rotate(-0.7); g.scale(0.85, 0.85); RR(g, -3.5, -8, 7, 16, 2.5); g.fillStyle = lgr(g, '#a0683a', '#6e4320', -3, 0, 3, 0); g.fill(); st(g, 0.9, OUT); g.stroke(); g.fillStyle = '#e53935'; [-2, 0.5, 3].forEach(x => { g.beginPath(); g.moveTo(x - 1.4, -8); g.lineTo(x, -13); g.lineTo(x + 1.4, -8); g.fill(); }); g.restore(); }
    if (K.barrel && !K.plush) {
      g.save(); g.translate(14, -22 + bob);
      RR(g, -5, -1, 10, 9, 3); g.fillStyle = lgr(g, '#b8783f', '#6e4320', 0, -1, 0, 8); g.fill(); st(g, 1, OUT); g.stroke();
      g.fillStyle = '#ffd34d'; g.fillRect(-5, 1.5, 10, 1.4); g.fillRect(-5, 5, 10, 1.4);
      g.fillStyle = '#e53935'; g.fillRect(-1, 2.6, 2, 2.6); g.fillRect(-2.3, 3.2, 4.6, 1.4);
      g.restore();
      const bash = atk >= 0.35 && atk < 0.7 ? 6 : 0;
      g.save(); g.translate(22 + bash, -10 + bob); fe(g, 0, 0, 6, 5, K.c2); fluff(g, 0, 0, 6, 5, -1, 1, 4, 2.6, K.c2); g.restore();
    }
    if (K.dagger) {
      g.save(); g.translate(17, -9 + bob); g.rotate(sw * 0.9 + 0.3);
      RR(g, -1.2, -1, 2.4, 6, 1); g.fillStyle = '#5a3a2a'; g.fill(); RR(g, -3.4, -2, 6.8, 2, 1); g.fillStyle = '#ffd34d'; g.fill();
      g.beginPath(); g.moveTo(-1.6, -2); g.lineTo(0, -14); g.lineTo(1.6, -2); g.closePath(); g.fillStyle = lgr(g, '#ffffff', '#b48cff', -2, 0, 2, 0); g.fill(); st(g, 0.6, OUT); g.stroke();
      g.restore(); hand(17, -9 + bob);
    }
    if (K.scarf && !K.plush) {
      g.beginPath(); g.moveTo(2, -27 + bob); g.quadraticCurveTo(9, -22 + bob, 15, -25 + bob); g.lineTo(14, -20 + bob); g.quadraticCurveTo(8, -17 + bob, 2, -21 + bob); g.closePath(); g.fillStyle = lgr(g, LI(K.scarf, 0.25), K.scarf, 0, -27, 0, -18); g.fill();
      const fl = mv ? a * 3 : br; g.beginPath(); g.moveTo(3, -25 + bob); g.quadraticCurveTo(-6, -24 + fl, -12, -20 + fl); g.lineTo(-10, -17 + fl); g.quadraticCurveTo(-4, -21, 3, -21 + bob); g.closePath(); g.fill();
    }
  }
  /* =========================================================
     v1.2 봉제인형(3D 인형극) 스타일 강아지 — 두 발로 선 2.5등신, 옷·벨트·부츠·망토, 입체 조명
     빛: 왼쪽 위 / 바닥 반사광: 따뜻한 주황 / 가장자리: 털 보풀
     좌표: 발바닥 y=0, 오른쪽을 바라봄 (3/4 시점)
     ========================================================= */
  const PLUSH = {
    hero: { tunic: '#f3e6c6', boot: '#7a4a26', belt: '#6b3f1f', trim: '#c9a24a', eyes: 'sparkle', mouth: 'grin' },
    u0: { tunic: '#e8553a', boot: '#6b3f22', belt: '#5a3418', trim: '#ffd34d', eyes: 'sparkle', mouth: 'grin', fx: ['cowlick'] },
    u1: { tunic: '#6d8aa8', boot: '#4a3a2e', belt: '#3e2c1e', trim: '#d6dbe0', chunky: 1.18, eyes: 'brave', mouth: 'grin', fx: ['bandaid'] },
    u2: { tunic: '#3f9a4a', boot: '#6b4424', belt: '#5a3418', trim: '#e8d39a', eyes: 'big', mouth: 'tongue', fx: ['freckles'] },
    u3: { tunic: '#7e57c2', boot: '#4a3a6a', belt: '#c9a24a', trim: '#ffe28a', robe: true, eyes: 'cool', mouth: 'smirk', fx: ['sparkles'] },
    u4: { tunic: '#2b3a67', boot: '#2a2230', belt: '#d32f2f', trim: '#e8e2d0', eyes: 'brave', mouth: 'smile' },
    u5: { tunic: '#2f8cff', boot: '#6b4424', belt: '#5a3418', trim: '#ffd34d', chunky: 1.12, eyes: 'happy', mouth: 'tongue', fx: ['soot'] },
    u6: { tunic: '#ffd6e6', boot: '#f2a6c6', belt: '#ff7ab6', trim: '#ffffff', robe: true, eyes: 'happy', mouth: 'smile', fx: ['flower', 'heartblush'] },
    u7: { tunic: '#2e8f8a', boot: '#5a3418', belt: '#4a2a14', trim: '#ffd34d', eyes: 'sparkle', mouth: 'grin', long: 1.22 },
    u8: { tunic: '#4f7a3c', boot: '#5a3418', belt: '#4a2a14', trim: '#ffd34d', chunky: 1.22, eyes: 'content', mouth: 'smile', big: 1.12 },
    wolfp: { tunic: '#7a5a3a', boot: '#3a2a1e', belt: '#2a1e14', trim: '#c8a070' },
    sknp: { tunic: '#3a3458', boot: '#2a2438', belt: '#1e1a2e', trim: '#b48cff' },
    nox: { tunic: '#3a3a52', boot: '#2a2438', belt: '#5b2a86', trim: '#ffb300' },
    sbori: { tunic: '#2a1a3a', boot: '#1e1428', belt: '#5b2a86', trim: '#c56bff' },
    fenrir: { tunic: '#1a1e4a', boot: '#141430', belt: '#3a6ab0', trim: '#7ad7ff' },
    noxgood: { tunic: '#e8e8f0', boot: '#6a6a80', belt: '#2f6fe0', trim: '#ffd34d' },
    firstk: { tunic: '#fffaf0', boot: '#c8a050', belt: '#c8901a', trim: '#ffd34d' },
    shadow: { tunic: '#3a2a5a', boot: '#2a1e38', belt: '#1e142e', trim: '#c56bff' },
    u9: { tunic: '#3e2a5a', boot: '#2a1e38', belt: '#9c27b0', trim: '#c9a0ff', small: 0.86, eyes: 'wink', mouth: 'smirk', eyeK: 1.18 },
  };
  // 입체 공: 왼쪽 위 하이라이트 → 중간색 → 오른쪽 아래 그림자 + 바닥 반사광
  function ball(g, x, y, rx, ry, col, rot) {
    E(g, x, y, rx, ry, rot);
    const r = Math.max(rx, ry), gr = g.createRadialGradient(x - rx * 0.38, y - ry * 0.45, r * 0.05, x + rx * 0.05, y + ry * 0.05, r * 1.08);
    gr.addColorStop(0, LI(col, 0.42)); gr.addColorStop(0.35, LI(col, 0.1)); gr.addColorStop(0.72, col); gr.addColorStop(1, DK(col, 0.34));
    g.fillStyle = gr; g.fill();
    g.save(); E(g, x, y, rx, ry, rot); g.clip();
    const bo = g.createRadialGradient(x + rx * 0.1, y + ry * 1.05, 0, x + rx * 0.1, y + ry * 1.05, ry * 0.9); bo.addColorStop(0, 'rgba(255,170,110,.22)'); bo.addColorStop(1, 'rgba(255,170,110,0)');
    g.fillStyle = bo; g.fillRect(x - rx, y - ry, rx * 2, ry * 2);
    g.restore();
  }
  // 털 보풀: 가장자리에 짧은 털, 안쪽에 결
  function fuzz(g, x, y, rx, ry, col, n, seed, a0, a1) {
    let s = seed || 7; const R = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    a0 = a0 == null ? 0 : a0; a1 = a1 == null ? TAU : a1;
    g.save(); g.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const a = a0 + (a1 - a0) * R(), px = x + Math.cos(a) * rx * 0.97, py = y + Math.sin(a) * ry * 0.97, l = 1.4 + R() * 1.6;
      g.strokeStyle = R() < 0.6 ? LI(col, 0.16) : col; g.lineWidth = 0.8 + R() * 0.4;
      g.beginPath(); g.moveTo(px - Math.cos(a) * 0.8, py - Math.sin(a) * 0.8); g.lineTo(px + Math.cos(a + 0.3) * l, py + Math.sin(a + 0.3) * l); g.stroke();
    }
    g.globalAlpha = 0.22;
    for (let i = 0; i < n * 0.8; i++) {
      const a = R() * TAU, d = Math.sqrt(R()) * 0.8, px = x + Math.cos(a) * rx * d, py = y + Math.sin(a) * ry * d;
      g.strokeStyle = R() < 0.5 ? LI(col, 0.35) : DK(col, 0.3); g.lineWidth = 0.6;
      g.beginPath(); g.moveTo(px, py); g.quadraticCurveTo(px - 0.8, py + 1, px - 1.8, py + 1.4); g.stroke();
    }
    g.restore();
  }
  // v1.3 동글동글 아기 부츠 (발가락 쪽이 통통하게 둥근 털장화)
  function plushBoot(g, x, y, col, near) {
    g.save(); g.translate(x, y);
    const c = near ? col : DK(col, 0.18);
    g.beginPath(); g.moveTo(-5, -9); g.lineTo(-5.4, -2.5); g.quadraticCurveTo(-5.6, 0.6, -2, 0.6); g.lineTo(5.5, 0.6); g.quadraticCurveTo(10, 0.4, 9.6, -3.2); g.quadraticCurveTo(9, -6.6, 4.4, -6.6); g.lineTo(4.6, -9); g.closePath();
    const gr = g.createLinearGradient(0, -9, 0, 0.6); gr.addColorStop(0, LI(c, 0.22)); gr.addColorStop(0.6, c); gr.addColorStop(1, DK(c, 0.3)); g.fillStyle = gr; g.fill();
    // 털 장식 단
    for (let k = 0; k < 5; k++) { E(g, -4.4 + k * 2.2, -9, 1.9, 1.7); g.fillStyle = near ? '#fff8ee' : '#e8dccc'; g.fill(); }
    if (near) { E(g, 6.2, -3.6, 2, 1.1, -0.3); g.fillStyle = 'rgba(255,255,255,.45)'; g.fill(); }
    g.restore();
  }
  const PKC = new WeakMap(); function PK(K) { let o = PKC.get(K); if (!o) { o = Object.assign({}, K, { plush: true }); PKC.set(K, o); } return o; }
  // 바느질 땀 (봉제인형 느낌)
  function stitch(g, fn, col) { g.save(); g.setLineDash([1.6, 1.6]); g.lineCap = 'round'; st(g, 0.8, col || 'rgba(90,50,30,.45)'); g.beginPath(); fn(); g.stroke(); g.restore(); }
  /* =========================================================
     v1.3 아기 봉제인형 강아지 — 머리가 키의 절반 이상, 정면에 가까운 동그란 얼굴,
     크고 촉촉한 눈 · 작은 단추코 · ω 입 · 짧고 통통한 팔다리 · 털장화
     ========================================================= */
  // v2.3 옷장 장신구 (머리 좌표: 가운데 0,0 · 반지름 24, 얼굴은 오른쪽)
  function drawAcc(g, k, c, w) {
    g.save();
    if (k === 'ribbon') { g.translate(-11, -21); g.rotate(-0.35 + w * 0.05); g.fillStyle = c; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-10, -9, -11, 1); g.quadraticCurveTo(-8, 6, 0, 0); g.quadraticCurveTo(10, -9, 11, 1); g.quadraticCurveTo(8, 6, 0, 0); g.fill(); st(g, 1, DK(c, 0.35)); g.stroke(); E(g, 0, 0, 2.6, 2.6); g.fillStyle = LI(c, 0.3); g.fill(); g.stroke(); g.fillStyle = 'rgba(255,255,255,.55)'; E(g, -6, -3, 2, 1.2); g.fill(); }
    else if (k === 'flower') { g.translate(-14, -15); for (let q = 0; q < 5; q++) { const an = q / 5 * TAU; E(g, Math.cos(an) * 3.6, Math.sin(an) * 3.6, 3.2, 3.2); g.fillStyle = c; g.fill(); } E(g, 0, 0, 2.4, 2.4); g.fillStyle = '#ffd34d'; g.fill(); }
    else if (k === 'starpin') { g.translate(-9, -20); g.rotate(0.3); star(g, 0, 0, 6, c); star(g, 7, 4, 3, '#ffffff'); }
    else if (k === 'bell') { g.translate(4, 23); st(g, 2.2, c); g.beginPath(); g.arc(0, -6, 9, 0.25 * Math.PI, 0.75 * Math.PI); g.stroke(); E(g, 0, 4, 3.6, 3.6); g.fillStyle = '#ffd34d'; g.fill(); st(g, 0.8, '#a8781a'); g.stroke(); }
    else if (k === 'leaf') { g.translate(-6, -24); g.rotate(-0.5 + w * 0.08); g.fillStyle = c; g.beginPath(); g.moveTo(0, 2); g.quadraticCurveTo(-7, -6, 0, -14); g.quadraticCurveTo(7, -6, 0, 2); g.fill(); st(g, 0.8, DK(c, 0.4)); g.beginPath(); g.moveTo(0, 2); g.lineTo(0, -12); g.stroke(); }
    else if (k === 'heart') { g.translate(-12, -18); g.rotate(-0.25); g.fillStyle = c; g.beginPath(); g.moveTo(0, 5); g.bezierCurveTo(-8, -1, -4, -8, 0, -3); g.bezierCurveTo(4, -8, 8, -1, 0, 5); g.fill(); st(g, 0.9, DK(c, 0.4)); g.stroke(); }
    g.restore();
  }
  function wearType(id, acc, col) { const nid = id + '@' + acc + (col || ''); if (!TYPES[nid] && TYPES[id] && TYPES[id].K) { defPlush(nid, Object.assign({}, TYPES[id].K, { acc, accC: col })); } return TYPES[nid] ? nid : id; }
  function paintPlush(g, K, P) {
    const PL0 = PLUSH[K.pid] || PLUSH.hero, PL = K.third ? Object.assign({}, PL0, { trim: '#ffe08a', belt: '#d89a20' }) : PL0;
    const walk = P.walk || 0, mv = !!P.moving, ph = walk * TAU, a = Math.sin(ph), br = Math.sin((P.breathe || 0) * TAU);
    const bob = mv ? -Math.abs(Math.sin(ph)) * 2.4 : br * 0.8;
    const atk = P.atk == null ? -1 : P.atk, strike = atk >= 0.35 && atk < 0.7, sw = swing(atk), ex = P.expr;
    const HC = K.head || K.c1, seed = K.seed || 3, CH = Math.min(1.12, PL.chunky || 1), SM = PL.small || 1;
    const lean = strike ? 0.07 : atk >= 0 && atk < 0.35 ? -0.04 : mv ? 0.03 : 0;
    const MUZ = K.c2 || '#fff8ee';
    g.save(); g.scale(SM * (PL.big || 1) * (PL.long || 1) ** 0.15, SM * (PL.big || 1));
    if (K.seated) g.translate(-2, 10);
    g.rotate(lean);
    // --- 꼬리 (작고 동그란 털뭉치)
    g.save(); g.translate(-11 * CH, -15 + bob); g.rotate(-0.6 + (mv ? a * 0.5 : br * 0.4));
    if (K.tail === 'stub' || K.tail === 'pom' || K.tail === 'curl') { ball(g, -2, -3, 5, 5, K.tail === 'pom' ? LI(K.c1, 0.08) : K.c1); fuzz(g, -2, -3, 5, 5, K.c1, 8, seed); }
    else { E(g, -3, -6, 4, 7.5, -0.4); g.fillStyle = lgr(g, LI(K.c1, 0.2), DK(K.c1, 0.15), -6, -12, 0, 0); g.fill(); ball(g, -5, -11, 3.4, 3.4, K.c3 || K.c1); }
    g.restore();
    // --- 망토 (작고 둥근 망토)
    if (K.cape) {
      const wv = mv ? a * 2.6 : br * 1.1;
      g.beginPath(); g.moveTo(8, -31 + bob); g.quadraticCurveTo(-4, -34 + bob, -12, -26 + bob);
      g.quadraticCurveTo(-18 - wv, -14, -15 - wv, -3); g.quadraticCurveTo(-7, 0 - wv * 0.3, 0, -5 + bob); g.lineTo(4, -27 + bob); g.closePath();
      const cg = g.createLinearGradient(-16, -32, 4, -2); cg.addColorStop(0, LI(K.cape, 0.25)); cg.addColorStop(0.55, K.cape); cg.addColorStop(1, DK(K.cape, 0.32)); g.fillStyle = cg; g.fill();
      stitch(g, () => { g.moveTo(-14 - wv, -4); g.quadraticCurveTo(-7, -1, 0, -6 + bob); });
    }
    // --- 뒷팔 (짧은 소매 + 벙어리장갑 손)
    g.save(); g.translate(-7 * CH, -25 + bob); g.rotate(0.3 + (mv ? -a * 0.35 : br * 0.05));
    RR(g, -3.4, 0, 6.8, 8, 3.4); g.fillStyle = lgr(g, DK(PL.tunic, 0.12), DK(PL.tunic, 0.28), 0, 0, 0, 8); g.fill();
    ball(g, 0, 9.5, 3.9, 3.7, DK(MUZ, 0.1)); g.restore();
    // --- 다리 + 털장화 (아주 짧게)
    const legOf = (x, p, near) => {
      const s = mv ? Math.sin(ph + p * TAU) * 3.6 : 0, lift = mv ? Math.max(0, -Math.cos(ph + p * TAU)) * 2.2 : 0;
      const col = near ? K.c1 : DK(K.c1, 0.16);
      RR(g, x - 3.6 + s * 0.4, -12 + bob * 0.3, 7.2, 5, 2.6); g.fillStyle = col; g.fill();
      plushBoot(g, x + s, -lift, PL.boot, near);
    };
    if (!K.seated) legOf(-4 * CH, 0.5, false);
    // --- 몸통 (동글동글 콩 모양) + 옷
    const TY = -19 + bob, TRX = 12 * CH * (PL.long || 1), TRY = 12;
    ball(g, 0, TY, TRX, TRY, K.c1);
    g.save(); E(g, 0, TY, TRX, TRY); g.clip();
    const tg = g.createLinearGradient(-TRX, TY - 10, TRX, TY + TRY); tg.addColorStop(0, LI(PL.tunic, 0.3)); tg.addColorStop(0.5, PL.tunic); tg.addColorStop(1, DK(PL.tunic, 0.3));
    g.fillStyle = tg; g.fillRect(-TRX - 2, TY - 9, TRX * 2 + 4, TRY * 2 + 4);
    // 동그란 칼라 + 가슴 털
    E(g, 4, TY - 9, 8, 5); g.fillStyle = MUZ; g.fill(); fuzz(g, 4, TY - 9, 8, 5, MUZ, 8, seed + 2, 0.1, Math.PI - 0.1);
    stitch(g, () => { g.moveTo(-TRX, TY - 4); g.quadraticCurveTo(0, TY - 7, TRX, TY - 4); }, rgba(PL.trim, 0.95));
    // 벨트 + 하트 버클
    const by2 = TY + 4; RR(g, -TRX - 2, by2, TRX * 2 + 4, 4, 1.6); g.fillStyle = lgr(g, LI(PL.belt, 0.2), DK(PL.belt, 0.3), 0, by2, 0, by2 + 4); g.fill();
    g.beginPath(); const hbx = 5, hby = by2 + 1; g.moveTo(hbx, hby + 4.2); g.bezierCurveTo(hbx - 4.4, hby + 1.4, hbx - 2.6, hby - 2.2, hbx, hby); g.bezierCurveTo(hbx + 2.6, hby - 2.2, hbx + 4.4, hby + 1.4, hbx, hby + 4.2); g.fillStyle = '#ffd34d'; g.fill();
    if (K.sash) { g.fillStyle = K.sash; g.beginPath(); g.moveTo(-TRX, TY + 4); g.lineTo(6, TY - 12); g.lineTo(11, TY - 9); g.lineTo(-TRX + 4, TY + 8); g.closePath(); g.fill(); }
    if (K.armor) { RR(g, -8, TY - 7, 18, 10, 5); g.fillStyle = lgr(g, LI(K.armor, 0.45), DK(K.armor, 0.2), 0, TY - 7, 0, TY + 3); g.fill(); }
    g.restore();
    if (PL.robe) { g.beginPath(); g.moveTo(-TRX + 0.5, TY + 3); g.quadraticCurveTo(-TRX - 2, TY + 12, -TRX + 1, -6.5); g.quadraticCurveTo(0, -4.5, TRX - 1, -6.5); g.quadraticCurveTo(TRX + 2, TY + 12, TRX - 0.5, TY + 3); g.closePath(); g.fillStyle = lgr(g, PL.tunic, DK(PL.tunic, 0.28), 0, TY, 0, -5); g.fill(); stitch(g, () => { g.moveTo(-TRX + 1, -7.4); g.quadraticCurveTo(0, -5.2, TRX - 1, -7.4); }, PL.trim); }
    if (!K.seated) legOf(5 * CH, 0, true);
    else { // 안장에 앉은 짧은 다리
      g.save(); g.translate(3, -9 + bob * 0.3);
      RR(g, -3, -3.4, 12, 7, 3.4); g.fillStyle = lgr(g, LI(PL.tunic, 0.12), DK(PL.tunic, 0.2), 0, -3.4, 0, 4); g.fill();
      g.translate(9, 1); g.rotate(mv ? a * 0.1 : 0);
      RR(g, -3.2, -1, 6.4, 6, 3); g.fillStyle = K.c1; g.fill(); plushBoot(g, 0, 13, PL.boot, true);
      g.restore();
    }
    // --- 머리 (아주 큰 동그란 머리, 정면에 가까운 얼굴)
    const hx = 4 + (strike ? 1.2 : 0), hy = -51 + bob + (P.hurt ? 1.5 : 0), HR = 24; // (머리는 아래 scale로 1.05배)
    g.save(); g.translate(hx, hy); g.scale(1.06, 1.06); if (P.hurt) g.rotate(-0.1); else if (strike) g.rotate(0.05); else g.rotate(mv ? a * 0.03 : br * 0.025);
    const up = K.ear === 'up' && !K.helm, es = Math.min(1.25, K.es || 1);
    // 뒤 귀
    if (up) { g.save(); g.translate(12, -17); g.rotate(0.45); g.beginPath(); g.moveTo(-6.5 * es, 3); g.quadraticCurveTo(-5 * es, -12 * es, 0, -15 * es); g.quadraticCurveTo(5 * es, -12 * es, 6.5 * es, 3); g.closePath(); g.fillStyle = DK(K.c3, 0.2); g.fill(); g.restore(); }
    else if (K.ear !== 'up') { g.save(); g.translate(19, -8); g.rotate(-0.35 + (mv ? a * 0.1 : 0)); g.beginPath(); g.moveTo(-3, -4); g.quadraticCurveTo(9, -3, 8, 10); g.quadraticCurveTo(5, 17, -1, 12); g.closePath(); g.fillStyle = DK(K.c3, 0.22); g.fill(); g.restore(); }
    // 머리통 (살짝 납작한 찹쌀떡)
    ball(g, 0, 0, HR * 1.05, HR * 0.95, HC);
    fuzz(g, 0, 0, HR * 1.05, HR * 0.95, HC, 22, seed + 3, Math.PI * 1.05, Math.PI * 1.95);
    // 정수리 털 한 가닥 (쪼르르)
    if (!K.helmet && !K.ironcap && !K.wizard && !K.hood && !K.archer && !K.nurseCap) { g.fillStyle = lgr(g, LI(HC, 0.3), HC, 0, -30, 0, -20); g.beginPath(); g.moveTo(-3, -HR * 0.9); g.quadraticCurveTo(-2, -HR - 9, 4, -HR - 7); g.quadraticCurveTo(0, -HR - 4, 3, -HR * 0.88); g.closePath(); g.fill(); }
    // 얼굴 무늬 (이마 하얀 줄 + 아래쪽 하얀 볼)
    g.save(); E(g, 0, 0, HR * 1.05, HR * 0.95); g.clip();
    if (K.mark === 'mask') { E(g, 4, 10, 20, 13); g.fillStyle = MUZ; g.fill(); g.beginPath(); g.moveTo(1, -24); g.quadraticCurveTo(7, -10, 3, 0); g.lineTo(7, 0); g.quadraticCurveTo(10, -10, 6, -24); g.closePath(); g.fill(); }
    else { g.beginPath(); g.moveTo(2.5, -24); g.quadraticCurveTo(6, -12, 3, -3); g.lineTo(8, -3); g.quadraticCurveTo(9, -12, 6.5, -24); g.closePath(); g.fillStyle = rgba(MUZ, 0.9); g.fill(); }
    g.restore();
    // 주둥이 (작고 동그란 하얀 볼록)
    ball(g, 5, 9, 9.5, 6.6, MUZ);
    stitch(g, () => { g.moveTo(-3.8, 11); g.quadraticCurveTo(5, 17.6, 13.8, 11); }, 'rgba(120,80,60,.3)');
    // 코 (작은 단추코)
    E(g, 5.5, 5.4, 3.6, 2.7); g.fillStyle = lgr(g, '#6a4434', '#1a0e08', 0, 3, 0, 8); g.fill();
    E(g, 4.6, 4.4, 1.4, 0.8, -0.2); g.fillStyle = 'rgba(255,255,255,.9)'; g.fill();
    // 입
    const happy = strike || P.happy || ex === 'happy' || ex === 'love' || ex === 'wink';
    st(g, 1.1, '#4a2a1a');
    if (ex === 'surprise') { E(g, 5.5, 12, 2, 2.6); g.fillStyle = '#5a1a20'; g.fill(); }
    else if (ex === 'sad' || P.hurt) { g.beginPath(); g.moveTo(2, 12.6); g.quadraticCurveTo(5.5, 10, 9, 12.6); g.stroke(); }
    else if (happy || (!ex && PL.mouth === 'grin')) { g.beginPath(); g.moveTo(1.2, 8.4); g.quadraticCurveTo(5.5, 16.5, 9.8, 8.4); g.closePath(); g.fillStyle = '#7a2a30'; g.fill(); E(g, 5.5, 12.6, 2.8, 1.9); g.fillStyle = '#ff8fa0'; g.fill(); }
    else if (!ex && PL.mouth === 'tongue') { g.beginPath(); g.moveTo(5.5, 8.1); g.lineTo(5.5, 9.4); g.moveTo(1.6, 9); g.quadraticCurveTo(3.5, 11.6, 5.5, 9.4); g.quadraticCurveTo(7.5, 11.6, 9.4, 9); g.stroke(); g.beginPath(); g.moveTo(5, 10); g.quadraticCurveTo(4.6, 15, 7, 15); g.quadraticCurveTo(9.2, 14.6, 8.2, 10); g.closePath(); g.fillStyle = '#ff8fa0'; g.fill(); st(g, 0.6, '#d9506a'); g.beginPath(); g.moveTo(6.6, 11); g.lineTo(6.6, 13.6); g.stroke(); }
    else if (!ex && PL.mouth === 'smirk') { g.beginPath(); g.moveTo(2.2, 10); g.quadraticCurveTo(6.5, 12.2, 9.8, 8.2); g.stroke(); }
    else { g.beginPath(); g.moveTo(5.5, 8.1); g.lineTo(5.5, 9.4); g.moveTo(1.6, 9); g.quadraticCurveTo(3.5, 11.6, 5.5, 9.4); g.quadraticCurveTo(7.5, 11.6, 9.4, 9); g.stroke(); if (K.tongue) { E(g, 6.4, 11.4, 1.6, 2); g.fillStyle = '#ff8fa0'; g.fill(); } }
    // 눈 (크고 촉촉한 두 눈, 거의 정면)
    if (!K.helm) {
      const eo = K.evil ? { glow: K.iris, blink: P.blink, hurt: P.hurt, sparkle: true } : { iris: K.iris || 'rgba(110,60,24,.85)', blink: P.blink, hurt: P.hurt, expr: ex, sparkle: true };
      const EK = (PL.eyeK || 1) * 1.12, pe = (!ex && !P.blink && !P.hurt && !K.evil) ? PL.eyes : null;
      const ex2 = (pe === 'happy') ? Object.assign({}, eo, { expr: 'happy' }) : eo;
      if (pe === 'wink') { st(g, 1.9, '#3a2214'); g.beginPath(); g.arc(-5.6, -1.4, 4.4 * EK, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); }
      else eyeKit(g, -5.6, -2.4, 5 * EK * (pe === 'big' ? 1.12 : 1), 6.4 * EK * (pe === 'big' ? 1.12 : 1), ex2);
      eyeKit(g, 15, -2.4, 4.6 * EK * (pe === 'big' ? 1.12 : 1), 6.1 * EK * (pe === 'big' ? 1.12 : 1), ex2);
      if (pe === 'content') { g.fillStyle = HC; [[-5.6, 5.4], [15, 5]].forEach(([x, r]) => { E(g, x, -2.4, r * 1.3, 7.6); g.fill(); st(g, 1.8, '#3a2214'); g.beginPath(); g.arc(x, -4.6, r * 0.85, Math.PI * 0.15, Math.PI * 0.85); g.stroke(); }); }
      if (pe === 'cool') { st(g, 1.2, '#2a1a12'); [[-5.6, -1], [15, 1]].forEach(([x, sd]) => { g.beginPath(); g.moveTo(x - 4.4, -8); g.lineTo(x - 6.4, -10); g.moveTo(x + 4, -8.4); g.lineTo(x + 5.8, -10.6); g.stroke(); }); }
      if (pe === 'sparkle' || pe === 'big' || pe === 'cool') { E(g, -7, -5.6, 1.6, 1.6); g.fillStyle = '#fff'; g.fill(); E(g, 13.6, -5.6, 1.5, 1.5); g.fill(); if (pe === 'sparkle') { star(g, -3.8, -4.6, 1.3, '#fff'); star(g, 16.8, -4.6, 1.2, '#fff'); } }
      if (pe === 'brave') { g.fillStyle = DK(HC, 0.4); [[-5.6, 0.25], [15, -0.25]].forEach(([x, r]) => { g.save(); g.translate(x, -11.4); g.rotate(r); E(g, 0, 0, 3.6, 1.4); g.fill(); g.restore(); }); }
      // 개성 소품
      const fxl = PL.fx || [];
      if (fxl.includes('freckles')) { g.fillStyle = 'rgba(150,90,50,.6)'; [[-10, 3], [-8, 5], [-12, 5.5], [19, 3], [21, 5], [17.5, 5.5]].forEach(([x, y]) => { E(g, x, y, 0.8, 0.8); g.fill(); }); }
      if (fxl.includes('bandaid')) { g.save(); g.translate(18, 4); g.rotate(-0.4); RR(g, -4, -1.6, 8, 3.2, 1.4); g.fillStyle = '#ffd8b0'; g.fill(); st(g, 0.5, '#c89a70'); g.stroke(); E(g, 0, 0, 1.2, 1.2); g.fillStyle = '#e8b890'; g.fill(); g.restore(); }
      if (fxl.includes('soot')) { g.fillStyle = 'rgba(60,40,30,.35)'; E(g, 19, 3, 2.6, 1.6); g.fill(); E(g, -10, 6, 1.8, 1.2); g.fill(); }
      if (fxl.includes('flower')) { g.save(); g.translate(-15, -15); for (let q = 0; q < 5; q++) { const an = q / 5 * TAU; E(g, Math.cos(an) * 2.6, Math.sin(an) * 2.6, 2.2, 1.6, an); g.fillStyle = '#ffb3d0'; g.fill(); } E(g, 0, 0, 1.4, 1.4); g.fillStyle = '#ffe060'; g.fill(); g.restore(); }
      if (fxl.includes('sparkles')) { star(g, -22, -16, 2, '#fff6c0'); star(g, 25, -12, 1.6, '#c8e8ff'); }
      // 눈썹 (작은 털뭉치)
      g.fillStyle = DK(HC, 0.35);
      if (K.evil || ex === 'angry' || K.brow) { g.save(); g.translate(-5.6, -11.8); g.rotate(0.3); E(g, 0, 0, 3.4, 1.3); g.fill(); g.restore(); g.save(); g.translate(15, -11.8); g.rotate(-0.3); E(g, 0, 0, 3.2, 1.3); g.fill(); g.restore(); }
      else { E(g, -5.6, -12.4, 2.8, 1.2); g.fill(); E(g, 15, -12.2, 2.6, 1.2); g.fill(); }
      // 볼터치 (크고 동그랗게)
      [[-11, 6], [21, 6]].forEach(([bx, by]) => { const bl = g.createRadialGradient(bx, by, 0, bx, by, 7.6); bl.addColorStop(0, ex === 'love' || (PL.fx || []).includes('heartblush') ? 'rgba(255,80,120,.8)' : 'rgba(255,110,145,.72)'); bl.addColorStop(1, 'rgba(255,120,150,0)'); g.fillStyle = bl; E(g, bx, by, 7.6, 5.4); g.fill(); E(g, bx - 1.6, by - 1.2, 1.1, 0.8); g.fillStyle = 'rgba(255,255,255,.7)'; g.fill(); });
      if (ex === 'sad') { g.beginPath(); g.moveTo(-3, 3); g.quadraticCurveTo(-5, 8, -3, 9.5); g.quadraticCurveTo(-1, 8, -3, 3); g.fillStyle = '#7fd0ff'; g.fill(); }
      if (K.glasses) { st(g, 1.2, '#c9a24a'); E(g, -5.6, -2.4, 7, 7.6); g.stroke(); E(g, 15, -2.4, 6.4, 7.2); g.stroke(); }
    }
    // 앞 귀
    if (up) {
      g.save(); g.translate(-13, -16); g.rotate(-0.42);
      g.beginPath(); g.moveTo(-7 * es, 4); g.quadraticCurveTo(-5.4 * es, -13 * es, 0, -16.5 * es); g.quadraticCurveTo(5.4 * es, -13 * es, 7 * es, 4); g.closePath(); g.fillStyle = lgr(g, LI(K.c3, 0.15), DK(K.c3, 0.15), -5, -16, 5, 4); g.fill();
      g.beginPath(); g.moveTo(-3.8 * es, 2); g.quadraticCurveTo(-2.6 * es, -8 * es, 0, -11 * es); g.quadraticCurveTo(2.6 * es, -8 * es, 3.8 * es, 2); g.closePath(); g.fillStyle = lgr(g, '#ffd6dc', '#f2a0ac', 0, -11, 0, 2); g.fill();
      g.restore();
    }
    // 모자류 (옛 머리 좌표계를 새 머리에 맞춤)
    g.save(); g.translate(-1, -2); g.scale(1.36, 1.36); g.translate(2, 1); drawHats(g, K, mv, a, br); g.restore();
    if (K.acc) drawAcc(g, K.acc, K.accC || '#ff7ab6', mv ? a : br); // v2.3 강아지 옷장 장신구
    // 처진 귀 (앞, 얼굴 옆으로 동그랗게)
    if (K.ear !== 'up') {
      const Lx = K.earLong ? 1.15 : 1;
      g.save(); g.translate(-19, -8 + (K.helmet ? 2 : 0)); g.rotate(0.28 + (mv ? a * 0.12 : br * 0.05) + (P.hurt ? 0.25 : 0));
      g.beginPath(); g.moveTo(-1, -6); g.quadraticCurveTo(-11, 4 * Lx, -8, 16 * Lx); g.quadraticCurveTo(-3, 22 * Lx, 4, 15 * Lx); g.quadraticCurveTo(7, 3, 4, -6); g.closePath();
      const eg = g.createLinearGradient(-10, -6, 6, 20 * Lx); eg.addColorStop(0, LI(K.c3, 0.22)); eg.addColorStop(0.6, K.c3); eg.addColorStop(1, DK(K.c3, 0.28)); g.fillStyle = eg; g.fill();
      fuzz(g, -2, 9 * Lx, 6, 10 * Lx, K.c3, 8, seed + 11, Math.PI * 0.3, Math.PI * 1.1);
      g.restore();
    }
    if (K.third) {
      g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.6; g.drawImage(softDot('#fff3a0'), -26, -HR - 28, 52, 28); g.restore();
      st(g, 2.6, '#ffd34d'); E(g, 0, -HR - 12, 13, 3.8); g.stroke(); star(g, -17, -HR - 4, 2.4, '#fff6c8'); star(g, 19, -HR - 8, 2, '#fff6c8');
    }
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.2; g.drawImage(softDot('#fff6e0'), -20, -24, 24, 20); g.restore();
    g.restore();
    // --- 앞팔 + 무기
    g.save(); g.translate(5 * CH, -26 + bob); g.rotate(-0.95 + (strike ? -0.3 : 0) + (mv ? a * 0.2 : 0));
    RR(g, -3.6, 0, 7.2, 9, 3.6); g.fillStyle = lgr(g, LI(PL.tunic, 0.2), DK(PL.tunic, 0.2), -4, 0, 4, 9); g.fill();
    RR(g, -3.8, 7, 7.6, 2.4, 1.2); g.fillStyle = PL.trim; g.fill();
    g.restore();
    g.save(); g.translate(-4, -8);
    if (K.staff) drawStaff(g, K, atk, bob);
    drawWeapons(g, PK(K), P, atk, sw, bob, mv, a, br);
    g.restore();
    g.restore();
  }
  /* =========================================================
     v1.3 봉제인형 졸병 — 펠트 천 · 바느질 땀 · 단추 눈 · 동글동글 (무섭지 않은 장난꾸러기 악당)
     ========================================================= */
  function btnEye(g, x, y, r, col, P) {
    if (P && (P.blink)) { st(g, 1.4, '#2a1a12'); g.beginPath(); g.arc(x, y + 1, r * 0.8, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); return; }
    if (P && P.hurt) { st(g, 1.4, '#2a1a12'); g.beginPath(); g.moveTo(x - r * 0.7, y - r * 0.7); g.lineTo(x + r * 0.7, y + r * 0.7); g.moveTo(x + r * 0.7, y - r * 0.7); g.lineTo(x - r * 0.7, y + r * 0.7); g.stroke(); return; }
    E(g, x, y, r, r); g.fillStyle = lgr(g, LI(col || '#3a2a4a', 0.15), DK(col || '#3a2a4a', 0.45), 0, y - r, 0, y + r); g.fill();
    st(g, 0.7, rgba(LI(col || '#3a2a4a', 0.4), 0.8)); E(g, x, y, r * 0.72, r * 0.72); g.stroke();
    g.fillStyle = 'rgba(20,10,10,.55)'; [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]].forEach(([a, b]) => { E(g, x + a * r, y + b * r, r * 0.11, r * 0.11); g.fill(); });
    E(g, x - r * 0.35, y - r * 0.4, r * 0.32, r * 0.24); g.fillStyle = 'rgba(255,255,255,.9)'; g.fill();
  }
  const blush = (g, x, y, r) => { const bl = g.createRadialGradient(x, y, 0, x, y, r); bl.addColorStop(0, 'rgba(255,120,150,.55)'); bl.addColorStop(1, 'rgba(255,120,150,0)'); g.fillStyle = bl; E(g, x, y, r, r * 0.7); g.fill(); };
  function mobPose(P) { const ph = (P.moving ? P.walk : P.breathe || 0) * TAU, atk = P.atk == null ? -1 : P.atk; return { ph, atk, lunge: atk >= 0.35 && atk < 0.7, bob: P.moving ? -Math.abs(Math.sin(ph)) * 2.4 : Math.sin(ph) * 0.8 }; }
  function feltSlime(g, P, col, sc, king) {
    const M = mobPose(P), sq = 1 + Math.sin(M.ph) * 0.09 - (M.lunge ? 0.1 : 0);
    g.save(); g.scale(sc, sc); g.translate(M.lunge ? 3 : 0, 0); g.scale(1 / sq, sq);
    g.beginPath(); g.moveTo(-18, 0); g.bezierCurveTo(-20, -18, -10, -30, 0, -30); g.bezierCurveTo(12, -30, 21, -18, 19, 0); g.closePath();
    const gr = g.createRadialGradient(-6, -20, 2, 0, -12, 26); gr.addColorStop(0, LI(col, 0.45)); gr.addColorStop(0.6, col); gr.addColorStop(1, DK(col, 0.25)); g.fillStyle = gr; g.fill();
    stitch(g, () => { g.moveTo(-15, -2); g.bezierCurveTo(-16, -16, -8, -26, 0, -26); }, 'rgba(255,255,255,.55)');
    E(g, -6, -21, 4, 2.6, -0.5); g.fillStyle = 'rgba(255,255,255,.6)'; g.fill();
    btnEye(g, -1, -14, 3.6, '#2a3a1a', P); btnEye(g, 9, -14, 3.4, '#2a3a1a', P);
    blush(g, -5, -8, 3.6); blush(g, 13, -8, 3.4);
    st(g, 1.1, '#2a3a1a'); g.beginPath(); if (M.lunge) { E(g, 4, -7, 2.2, 2.4); g.fillStyle = '#5a1a20'; g.fill(); } else { g.moveTo(1.5, -8); g.quadraticCurveTo(4, -5.5, 6.5, -8); g.stroke(); }
    if (king) { g.fillStyle = lgr(g, '#fff0a0', '#c8901a', 0, -42, 0, -28); g.beginPath(); g.moveTo(-9, -28); g.lineTo(-10, -38); g.lineTo(-5, -33); g.lineTo(0, -41); g.lineTo(5, -33); g.lineTo(10, -38); g.lineTo(9, -28); g.closePath(); g.fill(); E(g, 0, -33, 1.6, 1.6); g.fillStyle = '#ff5a8a'; g.fill(); }
    g.restore();
  }
  // v2.1 땅굴 두더지 꼬마 (성을 노리는 몬스터: 동료 앞에서 땅속으로 파고들어 성 앞에 튀어나옴)
  function feltDigger(g, P) { const M = mobPose(P); g.save(); g.translate(M.lunge ? 3 : 0, M.bob * 0.6);
    E(g, -9, -1, 5, 3); g.fillStyle = '#5a3a28'; g.fill(); E(g, 7, -1, 5, 3); g.fill();
    ball(g, 0, -12, 14, 12, '#7a5a48'); fuzz(g, 0, -12, 14, 12, '#8a6a58', 10, 7, Math.PI * 1.05, Math.PI * 1.95);
    E(g, 2, -8, 8, 6); g.fillStyle = '#c8a890'; g.fill();
    // 삽 같은 앞발
    const sw = M.lunge ? -0.6 : Math.sin(M.ph * 2) * 0.3; g.save(); g.translate(12, -9); g.rotate(sw); E(g, 3, 0, 5, 3.4); g.fillStyle = '#f0c8b8'; g.fill(); st(g, 0.8, '#c89888'); for (let q = -1; q <= 1; q++) { g.beginPath(); g.moveTo(5, q * 1.6); g.lineTo(8.5, q * 1.9); g.stroke(); } g.restore();
    ball(g, 9, -18, 6, 5.5, '#7a5a48'); E(g, 15, -17, 2.6, 2.2); g.fillStyle = '#ff8fa8'; g.fill(); E(g, 14.4, -17.8, 0.8, 0.6); g.fillStyle = '#fff'; g.fill();
    st(g, 1.2, '#2a1a12'); g.beginPath(); g.arc(8, -20, 1.6, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); blush(g, 9, -15, 1.8);
    // 광부 헬멧 + 램프
    g.beginPath(); g.ellipse(4, -24, 9, 6, 0, Math.PI, Math.PI * 2); g.fillStyle = '#f2c84a'; g.fill(); RR(g, -5, -24.5, 18, 2.4, 1); g.fillStyle = '#d8a830'; g.fill();
    E(g, 9, -28, 2.6, 2.6); g.fillStyle = '#fff6c0'; g.fill(); g.save(); g.globalCompositeOperation = 'lighter'; g.drawImage(softDot('#fff2a0'), 3, -34, 14, 14); g.restore();
    g.restore(); }
  function feltRat(g, P) {
    const M = mobPose(P);
    g.save(); g.translate(M.lunge ? 4 : 0, M.bob);
    st(g, 2.4, '#d8a0a8'); g.beginPath(); g.moveTo(-14, -6); g.quadraticCurveTo(-26, -8, -30, -18); g.stroke();
    ball(g, -2, -11, 14, 10, '#b8b0c8'); fuzz(g, -2, -11, 14, 10, '#b8b0c8', 12, 21, Math.PI, TAU);
    stitch(g, () => { g.moveTo(-12, -6); g.quadraticCurveTo(-2, -2, 8, -6); });
    [[-8, 0], [5, 0]].forEach(([x, y]) => { E(g, x + (P.moving ? Math.sin(M.ph + x) * 2 : 0), y - 1, 3.6, 2.4); g.fillStyle = '#e8b8c0'; g.fill(); });
    ball(g, 12, -16, 9, 8.4, '#c8c0d8');
    E(g, 6, -26, 5.6, 5.6); g.fillStyle = '#c8c0d8'; g.fill(); E(g, 6, -26, 3.4, 3.4); g.fillStyle = '#ffc0cc'; g.fill();
    E(g, 15, -26, 5, 5); g.fillStyle = '#c8c0d8'; g.fill(); E(g, 15, -26, 3, 3); g.fillStyle = '#ffc0cc'; g.fill();
    btnEye(g, 10, -17, 2.6, '#3a2a4a', P); btnEye(g, 17, -17, 2.4, '#3a2a4a', P);
    E(g, 21, -13, 2, 1.7); g.fillStyle = '#ff8fa8'; g.fill(); blush(g, 9, -11, 3); st(g, 0.6, 'rgba(90,70,90,.6)'); g.beginPath(); g.moveTo(21, -12); g.lineTo(27, -14); g.moveTo(21, -11); g.lineTo(27, -10); g.stroke();
    g.restore();
  }
  function feltToad(g, P) {
    const M = mobPose(P), hop = P.moving ? -Math.max(0, Math.sin(M.ph)) * 6 : 0;
    g.save(); g.translate(M.lunge ? 3 : 0, hop);
    [[-12, -2], [10, -2]].forEach(([x, y]) => { E(g, x, y, 7, 3.4); g.fillStyle = '#5aa04a'; g.fill(); });
    ball(g, 0, -13, 17, 12, '#7cc35a');
    E(g, 2, -8, 11, 6); g.fillStyle = '#e8f0b0'; g.fill(); stitch(g, () => { E(g, 2, -8, 11, 6); });
    ball(g, -7, -26, 6, 6, '#86cc62'); ball(g, 8, -26, 6, 6, '#86cc62');
    btnEye(g, -7, -26, 3.4, '#1a2a12', P); btnEye(g, 8, -26, 3.4, '#1a2a12', P);
    blush(g, -9, -16, 3.4); blush(g, 12, -16, 3.4);
    st(g, 1.2, '#2a4a1a'); g.beginPath(); g.moveTo(-6, -17); g.quadraticCurveTo(1, M.lunge ? -10 : -13, 8, -17); g.stroke();
    if (M.lunge) { st(g, 3, '#ff8fa8'); g.beginPath(); g.moveTo(1, -15); g.quadraticCurveTo(14, -18, 24, -14); g.stroke(); }
    g.restore();
  }
  function feltBat(g, P) {
    const ph = ((P.walk || 0) + (P.breathe || 0)) * TAU, fl = Math.sin(ph * 2) * 0.5, atk = P.atk == null ? -1 : P.atk;
    g.save(); g.translate(atk >= 0.35 && atk < 0.7 ? 4 : 0, -64 + Math.sin(ph) * 3);
    [-1, 1].forEach(sd => { g.save(); g.scale(sd, 1); g.rotate(fl * 0.6 - 0.1); g.beginPath(); g.moveTo(4, -2); g.quadraticCurveTo(14, -16, 26, -10); g.quadraticCurveTo(22, -4, 24, 2); g.quadraticCurveTo(18, -1, 16, 5); g.quadraticCurveTo(11, 0, 4, 4); g.closePath(); g.fillStyle = lgr(g, '#8a6ab0', '#5a3a80', 0, -16, 0, 6); g.fill(); stitch(g, () => { g.moveTo(6, 0); g.quadraticCurveTo(14, -10, 24, -8); }, 'rgba(255,255,255,.45)'); g.restore(); });
    ball(g, 0, 0, 10, 9.4, '#7a5aa8');
    [[-6, -9], [6, -9]].forEach(([x, y], k) => { g.beginPath(); g.moveTo(x - 3.4, y + 2); g.lineTo(x + (k ? 1.5 : -1.5), y - 6); g.lineTo(x + 3.4, y + 2); g.closePath(); g.fillStyle = '#7a5aa8'; g.fill(); });
    btnEye(g, -3.4, -1, 2.8, '#2a1a3a', P); btnEye(g, 4.4, -1, 2.8, '#2a1a3a', P);
    blush(g, -6, 4, 2.8); blush(g, 7, 4, 2.8);
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(-1, 4); g.lineTo(0, 7); g.lineTo(1, 4); g.closePath(); g.fill();
    g.restore();
  }
  function feltCrab(g, P) {
    const M = mobPose(P), sn = M.lunge ? 0.5 : Math.sin(M.ph * 2) * 0.15;
    g.save(); g.translate(M.lunge ? 4 : 0, M.bob);
    for (let k = 0; k < 3; k++) [-1, 1].forEach(sd => { st(g, 2.4, '#d0503a'); g.beginPath(); g.moveTo(sd * (6 + k * 3), -6); g.lineTo(sd * (12 + k * 4), -2 + (P.moving ? Math.sin(M.ph + k) * 2 : 0)); g.lineTo(sd * (13 + k * 4), 1); g.stroke(); });
    [[-1, -12], [1, 12]].forEach(([sd, x]) => { g.save(); g.translate(x + sd * 4, -16); g.rotate(sd * (0.3 + sn)); ball(g, sd * 4, -6, 6, 5, '#ff7a5a'); g.fillStyle = '#ff9a7a'; g.beginPath(); g.moveTo(sd * 4, -6); g.lineTo(sd * 11, -12); g.lineTo(sd * 9, -4); g.closePath(); g.fill(); g.restore(); });
    ball(g, 0, -11, 14, 9, '#ff6a4a'); stitch(g, () => { g.moveTo(-11, -9); g.quadraticCurveTo(0, -4, 11, -9); }, 'rgba(255,255,255,.55)');
    [[-5, -22], [5, -22]].forEach(([x, y]) => { st(g, 1.6, '#d0503a'); g.beginPath(); g.moveTo(x, -16); g.lineTo(x, y + 3); g.stroke(); btnEye(g, x, y, 3.2, '#2a1a12', P); });
    blush(g, -8, -9, 3); blush(g, 8, -9, 3);
    st(g, 1.1, '#5a1a10'); g.beginPath(); g.moveTo(-3, -9); g.quadraticCurveTo(0, -6.5, 3, -9); g.stroke();
    g.restore();
  }
  function feltGolem(g, P) {
    const M = mobPose(P);
    g.save(); g.translate(M.lunge ? 5 : 0, M.bob);
    [[-9, 0], [9, 0]].forEach(([x], k) => { RR(g, x - 6 + (P.moving ? Math.sin(M.ph + k * 3) * 3 : 0), -16, 12, 16, 5); g.fillStyle = '#9a9488'; g.fill(); });
    RR(g, -20, -58, 40, 44, 16); g.fillStyle = lgr(g, '#c8c0b0', '#8a8478', 0, -58, 0, -14); g.fill();
    [[-10, -48, 4], [12, -26, 3], [-6, -24, 2.4]].forEach(([x, y, r]) => { E(g, x, y, r, r * 0.8); g.fillStyle = 'rgba(120,110,100,.5)'; g.fill(); });
    stitch(g, () => { RR(g, -17, -55, 34, 38, 13); }, 'rgba(255,255,255,.4)');
    [[-1, -26], [1, 26]].forEach(([sd, x]) => { RR(g, x - 6, -50 + (M.lunge && sd > 0 ? -8 : 0), 12, 26, 6); g.fillStyle = '#b0a898'; g.fill(); });
    btnEye(g, -6, -42, 4, '#2a3a4a', P); btnEye(g, 8, -42, 4, '#2a3a4a', P); blush(g, -10, -34, 4); blush(g, 12, -34, 4);
    st(g, 1.4, '#4a4038'); g.beginPath(); g.moveTo(-3, -32); g.quadraticCurveTo(1, -29, 5, -32); g.stroke();
    g.strokeStyle = '#4a8a3a'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(2, -58); g.quadraticCurveTo(0, -66, 4, -70); g.stroke(); E(g, 8, -69, 4, 2.4, -0.4); g.fillStyle = '#7ac860'; g.fill(); E(g, 0, -70, 3.4, 2, 0.5); g.fill();
    g.restore();
  }
  const WOLF_P = { pid: 'wolfp', c1: '#8a8ea0', c2: '#e8e8f0', c3: '#6a6e80', ear: 'up', es: 1.1, tail: 'wag', evil: true, iris: '#ff6a6a', axe: true, brow: true, seed: 15 };
  const SKN_P = { pid: 'sknp', c1: '#6a6888', c2: '#c8c4e0', c3: '#4a4868', ear: 'up', tail: 'wag', evil: true, iris: '#c56bff', helmet: true, plume: '#9c6bff', sword: true, blade: '#b48cff', shield: true, shieldC: '#3a2a52', seed: 17 };
  /* v1.4 시즌 7 보스 (봉제인형 · 펠트 스타일) */
  // 21장: 방울 장군 미요 (야옹 공화국의 고양이 장군)
  function paintCatGen(g, P) {
    const M = mobPose(P); g.save(); g.scale(2.3, 2.3); g.translate(M.lunge ? 4 : 0, M.bob);
    // 꼬리
    st(g, 5, '#f0a050'); g.beginPath(); g.moveTo(-12, -14); g.quadraticCurveTo(-30, -20, -26, -42 + Math.sin(M.ph) * 3); g.stroke(); st(g, 5, '#fff3e0'); g.beginPath(); g.moveTo(-27, -36); g.lineTo(-26, -42 + Math.sin(M.ph) * 3); g.stroke();
    // 다리·부츠
    [[-6, 0.5], [7, 0]].forEach(([x, p], k) => plushBoot(g, x + (P.moving ? Math.sin(M.ph + p * TAU) * 3 : 0), 0, '#5a3a8a', k === 1));
    // 몸 + 장군 옷
    ball(g, 0, -18, 13, 12, '#f0a050'); g.save(); E(g, 0, -18, 13, 12); g.clip(); g.fillStyle = lgr(g, '#d84a4a', '#8a2020', 0, -28, 0, -6); g.fillRect(-14, -26, 28, 22); g.restore();
    [[-6, -22], [6, -22]].forEach(([x, y]) => { E(g, x, y, 1.6, 1.6); g.fillStyle = '#ffd34d'; g.fill(); });
    // 방울 목걸이
    E(g, 4, -29, 4, 4); g.fillStyle = lgr(g, '#fff0a0', '#c8901a', 0, -33, 0, -25); g.fill(); st(g, 0.8, '#7a5410'); g.beginPath(); g.moveTo(1, -29); g.lineTo(7, -29); g.stroke();
    // 머리
    ball(g, 3, -46, 20, 17, '#f0a050'); fuzz(g, 3, -46, 20, 17, '#f0a050', 18, 71, Math.PI, TAU);
    [[-10, -60, -1], [16, -60, 1]].forEach(([x, y, sd]) => { g.beginPath(); g.moveTo(x - 7, y + 8); g.lineTo(x + sd * 2, y - 8); g.lineTo(x + 7, y + 8); g.closePath(); g.fillStyle = '#f0a050'; g.fill(); g.beginPath(); g.moveTo(x - 3.5, y + 6); g.lineTo(x + sd, y - 3); g.lineTo(x + 3.5, y + 6); g.closePath(); g.fillStyle = '#ffc0c8'; g.fill(); });
    [[-10, -50], [-4, -52], [10, -52], [16, -50]].forEach(([x, y]) => { st(g, 2, '#d8803a'); g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - 6); g.stroke(); });
    ball(g, 4, -38, 9, 6, '#fff3e0');
    btnEye(g, -4, -46, 4, '#3a6a3a', P); btnEye(g, 12, -46, 4, '#3a6a3a', P);
    E(g, 4, -41, 2.2, 1.6); g.fillStyle = '#ff7a9a'; g.fill(); st(g, 1, '#5a2a1a'); g.beginPath(); g.moveTo(0, -37); g.quadraticCurveTo(2, -35, 4, -37.5); g.quadraticCurveTo(6, -35, 8, -37); g.stroke();
    st(g, 0.8, 'rgba(80,40,20,.7)'); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sd, k]) => { g.beginPath(); g.moveTo(4 + sd * 8, -39 + k); g.lineTo(4 + sd * 18, -41 + k * 3); g.stroke(); });
    blush(g, -8, -38, 4); blush(g, 16, -38, 4);
    // 장군 모자
    g.fillStyle = lgr(g, '#3a3a8a', '#1a1a5a', 0, -66, 0, -56); g.beginPath(); g.moveTo(-14, -58); g.quadraticCurveTo(3, -76, 20, -58); g.closePath(); g.fill(); st(g, 1.6, '#ffd34d'); g.beginPath(); g.moveTo(-14, -58); g.lineTo(20, -58); g.stroke(); star(g, 3, -64, 3.4, '#ffd34d');
    // 앞발 (펀치)
    ball(g, M.lunge ? 22 : 14, -20, 5, 5, '#fff3e0');
    g.restore();
  }
  // 22장: 폭풍 깃털 왕 로크 (깃털 군도의 거대한 새)
  function paintRoc(g, P) {
    const ph = ((P.walk || 0) + (P.breathe || 0)) * TAU, fl = Math.sin(ph * 2) * 0.35, atk = P.atk == null ? -1 : P.atk;
    g.save(); g.scale(2.2, 2.2); g.translate(atk >= 0.35 && atk < 0.7 ? 4 : 0, Math.sin(ph) * 1.5);
    plushBoot(g, -6, 0, '#e0a040', false); plushBoot(g, 6, 0, '#e0a040', true);
    g.save(); g.translate(-6, -30); g.rotate(-0.6 - fl); g.fillStyle = lgr(g, '#6ac0f0', '#2a70b0', 0, -40, 0, 0); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-30, -20, -40, -50); g.quadraticCurveTo(-20, -40, -10, -42); g.quadraticCurveTo(-4, -26, 6, -14); g.closePath(); g.fill(); stitch(g, () => { g.moveTo(-4, -6); g.quadraticCurveTo(-24, -22, -34, -44); }, 'rgba(255,255,255,.6)'); g.restore();
    ball(g, 0, -26, 18, 20, '#5ab0e8'); g.save(); E(g, 0, -26, 18, 20); g.clip(); E(g, 6, -18, 11, 13); g.fillStyle = '#fff6e0'; g.fill(); g.restore();
    fuzz(g, 0, -26, 18, 20, '#5ab0e8', 18, 81, Math.PI, TAU);
    ball(g, 6, -50, 13, 12, '#6ac0f0');
    [[-2, -1], [4, 0], [10, 1]].forEach(([x, r]) => { g.save(); g.translate(x, -60); g.rotate(r * 0.3); g.fillStyle = ['#ff7a5a', '#ffd34d', '#ff7a5a'][r + 1]; g.beginPath(); g.ellipse(0, -10, 3.2, 11, 0, 0, TAU); g.fill(); g.restore(); });
    btnEye(g, 2, -52, 3.6, '#1a2a4a', P); btnEye(g, 12, -52, 3.4, '#1a2a4a', P); blush(g, 0, -45, 3.4); blush(g, 15, -45, 3.2);
    g.fillStyle = lgr(g, '#ffd060', '#e09020', 0, -50, 0, -40); g.beginPath(); g.moveTo(14, -48); g.quadraticCurveTo(26, -46, 24, -41); g.quadraticCurveTo(18, -40, 14, -43); g.closePath(); g.fill();
    g.save(); g.translate(14, -30); g.rotate(0.5 + fl); g.fillStyle = lgr(g, '#8ad0ff', '#3a80c0', 0, -20, 0, 10); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(22, -16, 30, -36); g.quadraticCurveTo(16, -30, 10, -30); g.quadraticCurveTo(6, -16, -4, -8); g.closePath(); g.fill(); g.restore();
    E(g, 6, -64, 9, 2.4); g.fillStyle = '#ffd34d'; g.fill();
    g.restore();
  }
  // 23장: 북치는 오소리 대장 둥둥 (굴굴 연방)
  function paintBadger(g, P) {
    const M = mobPose(P), hit = M.lunge; g.save(); g.scale(2.3, 2.3); g.translate(0, M.bob);
    [[-7, 0.5], [7, 0]].forEach(([x, p], k) => plushBoot(g, x + (P.moving ? Math.sin(M.ph + p * TAU) * 3 : 0), 0, '#6a4a2a', k === 1));
    ball(g, 0, -20, 15, 14, '#7a7a84'); g.save(); E(g, 0, -20, 15, 14); g.clip(); E(g, 2, -14, 10, 10); g.fillStyle = '#d8d8e0'; g.fill(); g.restore();
    // 큰 북
    g.save(); g.translate(14, -16); E(g, 0, 0, 11, 11); g.fillStyle = lgr(g, '#d8604a', '#8a2a1a', 0, -11, 0, 11); g.fill(); E(g, 0, 0, 8, 8); g.fillStyle = '#fff3d8'; g.fill(); st(g, 1, '#ffd34d'); for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; g.beginPath(); g.moveTo(Math.cos(a) * 8, Math.sin(a) * 8); g.lineTo(Math.cos(a + 0.5) * 11, Math.sin(a + 0.5) * 11); g.stroke(); } g.restore();
    st(g, 2.2, '#c8a060'); g.beginPath(); g.moveTo(6, -24); g.lineTo(hit ? 14 : 18, hit ? -18 : -34); g.stroke(); E(g, hit ? 14 : 18, hit ? -18 : -34, 2.4, 2.4); g.fillStyle = '#ff6a4a'; g.fill();
    ball(g, 2, -44, 16, 14, '#8a8a94');
    g.save(); E(g, 2, -44, 16, 14); g.clip(); g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(-1, -60); g.quadraticCurveTo(2, -46, 0, -32); g.lineTo(6, -32); g.quadraticCurveTo(4, -46, 5, -60); g.closePath(); g.fill(); g.fillStyle = '#3a3a44'; E(g, -6, -44, 5, 7); g.fill(); E(g, 11, -44, 5, 7); g.fill(); g.restore();
    [[-10, -56], [14, -56]].forEach(([x, y]) => { E(g, x, y, 4, 4); g.fillStyle = '#6a6a74'; g.fill(); });
    btnEye(g, -6, -45, 3.2, '#1a1a22', P); btnEye(g, 11, -45, 3.2, '#1a1a22', P);
    E(g, 2.6, -37, 2.6, 2); g.fillStyle = '#2a1a1a'; g.fill(); blush(g, -9, -37, 3.4); blush(g, 14, -37, 3.4);
    st(g, 1, '#2a1a1a'); g.beginPath(); g.moveTo(-1, -33.5); g.quadraticCurveTo(2.6, hit ? -29 : -31.5, 6, -33.5); g.stroke();
    // 광부 헬멧 + 등불
    g.fillStyle = lgr(g, '#ffd060', '#c88a20', 0, -62, 0, -52); g.beginPath(); g.ellipse(2, -55, 15, 8, 0, Math.PI, TAU); g.fill(); E(g, 2, -61, 3, 3); g.fillStyle = '#fff6c0'; g.fill();
    g.restore();
  }
  // 24장: 이름을 잃은 바다 정령 무명 (이름 없는 바다)
  function paintSeaSpirit(g, P) {
    const ph = ((P.walk || 0) + (P.breathe || 0)) * TAU, atk = P.atk == null ? -1 : P.atk, lun = atk >= 0.35 && atk < 0.7;
    g.save(); g.scale(2.4, 2.4); g.translate(lun ? 4 : 0, Math.sin(ph) * 2);
    // 물결 꼬리
    for (let k = 0; k < 4; k++) { E(g, -18 - k * 7, -6 - Math.sin(ph + k) * 3, 9 - k * 1.6, 6 - k); g.fillStyle = rgba('#5ac8ff', 0.5 - k * 0.1); g.fill(); }
    // 몸 (반투명 물방울)
    g.beginPath(); g.moveTo(-18, 0); g.bezierCurveTo(-24, -30, -8, -56, 6, -56); g.bezierCurveTo(22, -56, 30, -30, 22, 0); g.quadraticCurveTo(14, -4, 8, 0); g.quadraticCurveTo(0, -4, -6, 0); g.quadraticCurveTo(-12, -4, -18, 0); g.closePath();
    const gr = g.createRadialGradient(0, -36, 2, 4, -26, 34); gr.addColorStop(0, 'rgba(220,250,255,.95)'); gr.addColorStop(0.5, 'rgba(90,190,240,.85)'); gr.addColorStop(1, 'rgba(30,90,170,.85)'); g.fillStyle = gr; g.fill();
    stitch(g, () => { g.moveTo(-14, -6); g.bezierCurveTo(-18, -30, -6, -50, 6, -50); }, 'rgba(255,255,255,.6)');
    for (let k = 0; k < 6; k++) { st(g, 0.8, 'rgba(255,255,255,.5)'); g.beginPath(); g.arc(-8 + k * 5, -20 - (k % 3) * 8 + Math.sin(ph + k) * 2, 1.4, 0, TAU); g.stroke(); }
    // 조개 왕관 (이름표가 지워짐)
    [[-6, -1], [6, 0], [16, 1]].forEach(([x, r]) => { g.save(); g.translate(x, -56); g.rotate(r * 0.3); g.fillStyle = '#ffd6e0'; g.beginPath(); g.moveTo(-4, 2); g.quadraticCurveTo(0, -10, 4, 2); g.closePath(); g.fill(); st(g, 0.6, '#d08aa0'); g.beginPath(); g.moveTo(0, 2); g.lineTo(0, -6); g.stroke(); g.restore(); });
    RR(g, -4, -46, 18, 6, 2); g.fillStyle = 'rgba(255,255,255,.75)'; g.fill(); st(g, 0.8, 'rgba(120,120,140,.8)'); g.beginPath(); g.moveTo(-2, -43); g.lineTo(12, -43); g.stroke();
    // 별 눈
    if (P.blink) { st(g, 1.3, '#1a3a6a'); g.beginPath(); g.arc(0, -28, 3, Math.PI * 1.1, Math.PI * 1.9); g.moveTo(12, -28); g.arc(14, -28, 3, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
    else { star(g, 0, -29, 4.4, '#fff6c0'); star(g, 14, -29, 4.2, '#fff6c0'); E(g, 0, -29, 1.4, 1.4); g.fillStyle = '#1a3a6a'; g.fill(); E(g, 14, -29, 1.4, 1.4); g.fill(); }
    blush(g, -4, -21, 3.4); blush(g, 18, -21, 3.4);
    st(g, 1.1, '#1a3a6a'); g.beginPath(); if (lun) { E(g, 7, -19, 3, 3.4); g.fillStyle = '#1a3a6a'; g.fill(); } else { g.moveTo(4, -20); g.quadraticCurveTo(7, -17.5, 10, -20); g.stroke(); }
    g.restore();
  }
  /* v1.3 친구 펫 (펠트 인형) */
  function paintPetChick(g, P) { const ph = ((P.walk || 0) + (P.breathe || 0)) * TAU, hop = P.moving ? -Math.abs(Math.sin(ph * 2)) * 3 : 0; g.save(); g.translate(0, hop);
    [[-3], [3]].forEach(([x]) => { st(g, 1.4, '#ff9a3a'); g.beginPath(); g.moveTo(x, -2); g.lineTo(x, 0); g.lineTo(x + 2, 0); g.stroke(); });
    ball(g, 0, -10, 10, 9, '#ffe060'); fuzz(g, 0, -10, 10, 9, '#ffe060', 10, 91, Math.PI, TAU);
    g.save(); g.translate(-7, -10); g.rotate(-0.4 + Math.sin(ph * 3) * 0.3); E(g, 0, 0, 4, 2.6); g.fillStyle = '#ffd040'; g.fill(); g.restore();
    btnEye(g, 2, -12, 1.9, '#2a1a12', P); btnEye(g, 7, -12, 1.8, '#2a1a12', P); blush(g, 0, -8, 2.2); blush(g, 9, -8, 2);
    g.fillStyle = '#ff9a3a'; g.beginPath(); g.moveTo(9, -10); g.lineTo(13, -9); g.lineTo(9, -7.5); g.closePath(); g.fill();
    g.fillStyle = '#ffd040'; g.beginPath(); g.moveTo(-1, -19); g.quadraticCurveTo(1, -24, 3, -19); g.fill(); g.restore(); }
  function paintPetHamster(g, P) { const ph = ((P.walk || 0) + (P.breathe || 0)) * TAU, hop = P.moving ? -Math.abs(Math.sin(ph * 2)) * 2 : 0; g.save(); g.translate(0, hop);
    ball(g, 0, -9, 12, 9, '#f0a860'); g.save(); E(g, 0, -9, 12, 9); g.clip(); E(g, 3, -5, 8, 6); g.fillStyle = '#fff6e8'; g.fill(); g.restore();
    [[-4, -17], [6, -17]].forEach(([x, y]) => { E(g, x, y, 3.4, 3.4); g.fillStyle = '#f0a860'; g.fill(); E(g, x, y, 2, 2); g.fillStyle = '#ffc0c8'; g.fill(); });
    btnEye(g, 0, -10, 1.9, '#2a1a12', P); btnEye(g, 7, -10, 1.8, '#2a1a12', P); E(g, 4, -7, 1.2, 0.9); g.fillStyle = '#ff8fa0'; g.fill();
    ball(g, -2, -6, 3.6, 3, '#fff6e8'); ball(g, 9, -6, 3.4, 2.8, '#fff6e8'); blush(g, -3, -6, 2.6); blush(g, 10, -6, 2.4);
    E(g, 0, 0, 3, 1.4); g.fillStyle = '#ffc0c8'; g.fill(); E(g, 6, 0, 3, 1.4); g.fill(); g.restore(); }
  function paintPetTurtle(g, P) { const ph = ((P.walk || 0) + (P.breathe || 0)) * TAU; g.save();
    [[-7], [7]].forEach(([x], k) => { E(g, x + (P.moving ? Math.sin(ph * 2 + k * 3) * 1.5 : 0), -1, 3, 2); g.fillStyle = '#8ad070'; g.fill(); });
    E(g, 12, -6 + Math.sin(ph) * 0.6, 4.4, 4); g.fillStyle = '#9ad880'; g.fill(); btnEye(g, 13.6, -7, 1.5, '#2a1a12', P); blush(g, 13, -4, 1.8);
    g.beginPath(); g.moveTo(-12, -3); g.quadraticCurveTo(-11, -17, 0, -17); g.quadraticCurveTo(11, -17, 12, -3); g.closePath(); g.fillStyle = lgr(g, '#7ac860', '#3a8a3a', 0, -17, 0, -3); g.fill();
    stitch(g, () => { g.moveTo(-6, -4); g.lineTo(-4, -13); g.lineTo(4, -13); g.lineTo(6, -4); }, 'rgba(255,255,255,.6)'); RR(g, -12, -4, 24, 2.6, 1.2); g.fillStyle = '#c8e8a0'; g.fill(); g.restore(); }
  // v1.8 계절 한정 펫 4종
  function paintPetRabbit(g, P) { const ph = ((P.walk || 0) + (P.breathe || 0)) * TAU, hop = P.moving ? -Math.abs(Math.sin(ph * 2)) * 4 : 0; g.save(); g.translate(0, hop);
    [[-3, -0.15], [4, 0.15]].forEach(([x, r]) => { g.save(); g.translate(x, -20); g.rotate(r); E(g, 0, -8, 3.2, 8); g.fillStyle = '#fff8f0'; g.fill(); E(g, 0, -8, 1.6, 6); g.fillStyle = '#ffc8d0'; g.fill(); g.restore(); });
    ball(g, 0, -9, 11, 9, '#e8403a'); stitch(g, () => { g.moveTo(-9, -7); g.quadraticCurveTo(0, -3, 9, -7); }, 'rgba(255,230,140,.8)'); RR(g, -11, -6, 22, 2.6, 1.2); g.fillStyle = '#f2b830'; g.fill();
    ball(g, 1, -18, 8, 7, '#fff8f0'); btnEye(g, -1, -19, 1.7, '#2a1a12', P); btnEye(g, 5, -19, 1.6, '#2a1a12', P); blush(g, -3, -15.5, 2); blush(g, 6, -15.5, 1.9); E(g, 2.5, -16, 1, 0.8); g.fillStyle = '#ff8fa0'; g.fill();
    E(g, -5, 0, 3, 1.4); g.fillStyle = '#fff8f0'; g.fill(); E(g, 5, 0, 3, 1.4); g.fill(); g.restore(); }
  function paintPetSquirrel(g, P) { const ph = ((P.walk || 0) + (P.breathe || 0)) * TAU, hop = P.moving ? -Math.abs(Math.sin(ph * 2)) * 3 : 0; g.save(); g.translate(0, hop);
    g.save(); g.translate(-9, -10); g.rotate(-0.3 + Math.sin(ph) * 0.1); E(g, 0, -6, 6, 11); g.fillStyle = '#c87840'; g.fill(); E(g, 1, -6, 3, 8); g.fillStyle = '#f0c090'; g.fill(); g.restore();
    ball(g, 2, -8, 8.5, 8, '#d08848'); E(g, 4, -6, 5, 5); g.fillStyle = '#fff0d8'; g.fill();
    ball(g, 4, -18, 7, 6.5, '#d08848'); [[0, -24], [8, -24]].forEach(([x, y]) => { E(g, x, y, 2.4, 3); g.fillStyle = '#d08848'; g.fill(); });
    btnEye(g, 2, -19, 1.6, '#2a1a12', P); btnEye(g, 8, -19, 1.5, '#2a1a12', P); blush(g, 1, -15.5, 1.8); blush(g, 9, -15.5, 1.7);
    // 송편
    g.beginPath(); g.arc(8, -8, 4, Math.PI * 0.1, Math.PI * 1.1); g.closePath(); g.fillStyle = '#f2a8c0'; g.fill(); g.restore(); }
  function paintPetPumpkinBat(g, P) { const ph = ((P.walk || 0) + (P.breathe || 0)) * TAU, fl = Math.sin(ph * 3) * 0.4; g.save(); g.translate(0, -10 + Math.sin(ph) * 2);
    [[-1], [1]].forEach(([d]) => { g.save(); g.translate(d * 7, -6); g.rotate(d * (0.3 + fl)); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(d * 10, -8, d * 15, -2); g.quadraticCurveTo(d * 11, 0, d * 12, 3); g.quadraticCurveTo(d * 7, 1, 0, 3); g.closePath(); g.fillStyle = '#6a4a8a'; g.fill(); g.restore(); });
    ball(g, 0, -5, 10, 8.5, '#ff8a2a'); st(g, 0.9, 'rgba(160,70,0,.6)'); g.beginPath(); g.moveTo(-3.5, -13); g.quadraticCurveTo(-5, -5, -3.5, 3); g.moveTo(3.5, -13); g.quadraticCurveTo(5, -5, 3.5, 3); g.stroke();
    g.fillStyle = '#4a7a2a'; RR(g, -1.2, -16, 2.4, 4, 1); g.fill(); btnEye(g, -3, -6, 1.7, '#3a1a00', P); btnEye(g, 3.5, -6, 1.7, '#3a1a00', P); blush(g, -6, -2.5, 1.9); blush(g, 6.5, -2.5, 1.9); pmouth(g, 0, -1.5, 1.4, false, '#5a2a00');
    g.restore(); E(g, 0, 2, 6, 1.6); g.fillStyle = 'rgba(30,15,0,.12)'; g.fill(); }
  function paintPetDeer(g, P) { const ph = ((P.walk || 0) + (P.breathe || 0)) * TAU, hop = P.moving ? -Math.abs(Math.sin(ph * 2)) * 2.5 : 0; g.save(); g.translate(0, hop);
    [[-6], [-2], [3], [7]].forEach(([x], k) => { RR(g, x - 1.3, -6, 2.6, 7 + (P.moving ? Math.sin(ph * 2 + k * 1.6) : 0), 1.2); g.fillStyle = '#a06a3a'; g.fill(); });
    ball(g, 0, -10, 10, 7, '#c08048'); stitch(g, () => { g.moveTo(-7, -9); g.quadraticCurveTo(0, -5, 7, -9); }, 'rgba(255,255,255,.5)');
    RR(g, -8, -9, 16, 2.6, 1.2); g.fillStyle = '#d83a3a'; g.fill(); ball(g, 0, -6, 2, 2, '#ffd34d');
    ball(g, 8, -18, 6.5, 6, '#c08048'); st(g, 1.4, '#7a4a20'); g.beginPath(); g.moveTo(6, -23); g.lineTo(4, -29); g.lineTo(1, -31); g.moveTo(4, -29); g.lineTo(6, -32); g.moveTo(10, -23); g.lineTo(12, -29); g.lineTo(15, -31); g.moveTo(12, -29); g.lineTo(11, -32); g.stroke();
    btnEye(g, 7, -19, 1.5, '#2a1a12', P); btnEye(g, 11.5, -19, 1.4, '#2a1a12', P); ball(g, 14, -16, 2.2, 2, '#ff4040'); blush(g, 6, -15.5, 1.7);
    g.restore(); }
  /* =========================================================
     v1.4 아기 용 미르 — 가로로 긴 용 대신, 기사보다 살짝 큰 동글동글 봉제인형 아기 용
     커다란 둥근 머리 · 통통한 몸 · 짧은 다리 · 작은 날개 · 말린 꼬리 · 큰 눈 · 볼터치
     성장 3단계: 아기(1~40) → 소년(41~90, 뿔·날개 커짐) → 어른(91~, 금빛 굴레·큰 날개)
     ========================================================= */
  const DRAGON_STAGE = [
    { sc: 1.0, wing: 0.75, horn: 0.6, crown: 0 },
    { sc: 1.1, wing: 1.0, horn: 1.0, crown: 0 },
    { sc: 1.22, wing: 1.3, horn: 1.35, crown: 1 },
  ];
  const DHX = 26, DHY = -42, DHR = 16;
  function dragonMouth(stg) { const D = DRAGON_STAGE[stg || 0]; return [(DHX + DHR + 2) * D.sc, (DHY + 7) * D.sc]; }
  function dragonSeat(stg) { const D = DRAGON_STAGE[stg || 0]; return { x: -13 * D.sc, y: -40 * D.sc, sc: D.sc }; }
  let curPat = 0;
  function paintDragonMount(g, P, col, front, stg, evil) {
    stg = stg == null ? 1 : stg; const D = DRAGON_STAGE[stg];
    const walk = P.walk || 0, mv = !!P.moving, ph = walk * TAU, br = Math.sin((P.breathe || 0) * TAU);
    const atk = P.atk == null ? -1 : P.atk, open = atk >= 0.25 && atk < 0.8;
    const bob = mv ? -Math.abs(Math.sin(ph)) * 2.2 : br * 0.8;
    const li = LI(col, 0.28), dk = DK(col, 0.25), belly = evil ? '#c8b0e8' : '#fff1c8', spike = evil ? '#8a3ad0' : '#ffb04a';
    const flap = mv ? Math.sin(ph * 2) * 0.25 : br * 0.12;
    const wing = (near) => {
      g.save(); g.translate(near ? -4 : 2, -40 + bob); g.rotate(-0.5 - flap * (near ? 1 : 0.7)); g.scale(D.wing * (near ? 1 : 0.85), D.wing * (near ? 1 : 0.85));
      g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-6, -20, -14, -26); g.quadraticCurveTo(-16, -16, -24, -14); g.quadraticCurveTo(-18, -8, -22, -2); g.quadraticCurveTo(-10, -2, 0, 0); g.closePath();
      g.fillStyle = near ? lgr(g, li, dk, 0, -26, 0, 0) : lgr(g, dk, DK(col, 0.4), 0, -26, 0, 0); g.fill();
      if (curPat && !evil) { g.save(); g.clip();
        if (curPat === 1) { st(g, 2.4, 'rgba(176,80,255,.8)'); for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(-4 - k * 6, -1); g.quadraticCurveTo(-10 - k * 6, -12, -8 - k * 5, -22); g.stroke(); } }
        else if (curPat === 2) { g.fillStyle = 'rgba(30,30,90,.35)'; g.fillRect(-30, -30, 32, 32); [[-8, -12], [-14, -6], [-16, -18], [-6, -20]].forEach(([x, y], k) => star(g, x, y, k % 2 ? 1.6 : 2.4, '#fff6c8')); }
        else if (curPat === 3) { st(g, 1.3, '#ffd34d'); g.beginPath(); g.moveTo(-2, -2); g.quadraticCurveTo(-10, -12, -14, -24); g.moveTo(-2, -2); g.quadraticCurveTo(-14, -8, -22, -14); g.stroke(); }
        g.restore(); }
      stitch(g, () => { g.moveTo(-3, -3); g.quadraticCurveTo(-8, -16, -13, -23); g.moveTo(-3, -3); g.quadraticCurveTo(-12, -8, -21, -13); }, 'rgba(255,255,255,.45)');
      g.restore();
    };
    const leg = (x, p, near) => {
      const s = mv ? Math.sin(ph + p * TAU) * 3.2 : 0, lift = mv ? Math.max(0, -Math.cos(ph + p * TAU)) * 2.2 : 0, c = near ? col : dk;
      RR(g, x - 5 + s * 0.5, -14 + bob * 0.4, 10, 12 - lift, 5); g.fillStyle = lgr(g, LI(c, 0.15), DK(c, 0.15), 0, -14, 0, 0); g.fill();
      E(g, x + s + 1, -1.6 - lift, 6.4, 3.4); g.fillStyle = near ? LI(c, 0.2) : c; g.fill();
      g.fillStyle = '#fff6e0'; [[-3], [0.5], [4]].forEach(([dx]) => { E(g, x + s + 1 + dx, -1.2 - lift, 1.3, 1.1); g.fill(); });
    };
    if (!front) {
      // 말린 꼬리 (하트 끝)
      g.save(); g.translate(-20, -20 + bob); g.rotate(mv ? Math.sin(ph) * 0.2 : br * 0.1);
      g.beginPath(); g.moveTo(2, -6); g.quadraticCurveTo(-14, -6, -18, 4); g.quadraticCurveTo(-20, 10, -14, 10); g.quadraticCurveTo(-10, 4, -2, 6); g.closePath(); g.fillStyle = lgr(g, li, dk, 0, -6, 0, 10); g.fill();
      g.save(); g.translate(-17, 8); g.rotate(0.6); g.beginPath(); g.moveTo(0, 5); g.bezierCurveTo(-6, 1, -4, -5, 0, -2); g.bezierCurveTo(4, -5, 6, 1, 0, 5); g.fillStyle = spike; g.fill(); g.restore();
      g.restore();
      wing(false);
      leg(-12, 0.5, false); leg(10, 0, false);
      // 통통한 몸
      ball(g, 0, -24 + bob, 22, 17, col);
      g.save(); E(g, 0, -24 + bob, 22, 17); g.clip();
      E(g, 8, -16 + bob, 14, 12); g.fillStyle = belly; g.fill();
      st(g, 1, rgba(DK(belly, 0.25), 0.8)); for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(-2 + k * 1, -24 + k * 5 + bob); g.quadraticCurveTo(8, -21 + k * 5 + bob, 19, -24 + k * 5 + bob); g.stroke(); }
      g.restore();
      fuzz(g, 0, -24 + bob, 22, 17, col, 14, 61, Math.PI * 1.05, Math.PI * 1.9);
      // 등 가시 (말랑한 동그라미 가시)
      [[-16, -34], [-9, -39], [-2, -41.5]].forEach(([x, y]) => { E(g, x, y + bob, 3.4, 4.2); g.fillStyle = spike; g.fill(); });
      wing(true);
      // 안장 (작은 담요)
      if (!evil) { RR(g, -18, -42 + bob, 22, 9, 4); g.fillStyle = lgr(g, '#e84a4a', '#a82020', 0, -42, 0, -33); g.fill(); g.fillStyle = '#ffd34d'; [[-15], [-8], [-1]].forEach(([x]) => { E(g, x, -33 + bob, 1.6, 1.6); g.fill(); }); }
      return;
    }
    // ---- 앞쪽: 앞다리 + 커다란 머리 ----
    leg(-6, 0, true); leg(14, 0.5, true);
    const hx = DHX + (open ? 1.5 : 0), hy = DHY + bob;
    g.save(); g.translate(hx, hy); g.rotate(open ? -0.08 : mv ? Math.sin(ph) * 0.03 : br * 0.02);
    // 목 (짧고 통통)
    E(g, -12, 12, 10, 9); g.fillStyle = col; g.fill();
    // 뿔 + 귀 지느러미
    const hn = D.horn;
    [[-6, -1], [5, 1]].forEach(([x, sd]) => { g.save(); g.translate(x, -DHR + 2); g.rotate(-0.35 + sd * 0.1); g.beginPath(); g.moveTo(-2.6, 2); g.quadraticCurveTo(-1, -9 * hn, 1.6, -10 * hn); g.quadraticCurveTo(1, -4, 2.6, 2); g.closePath(); g.fillStyle = evil ? '#5a3a7a' : '#fff0c8'; g.fill(); g.restore(); });
    g.save(); g.translate(-13, -4); g.rotate(-0.6); g.beginPath(); g.moveTo(0, 0); g.lineTo(-9, -6); g.lineTo(-7, 0); g.lineTo(-10, 4); g.closePath(); g.fillStyle = spike; g.fill(); g.restore();
    // 머리
    ball(g, 0, 0, DHR * 1.05, DHR * 0.95, col);
    fuzz(g, 0, 0, DHR * 1.05, DHR * 0.95, col, 14, 63, Math.PI, Math.PI * 1.9);
    // 주둥이 (둥근 볼록)
    ball(g, DHR * 0.75, 5, 9.5, 7, LI(col, 0.12));
    E(g, DHR * 0.75 + 5, 2.4, 1.2, 0.9); g.fillStyle = DK(col, 0.5); g.fill(); E(g, DHR * 0.75 + 1.5, 2.6, 1.1, 0.8); g.fill();
    // 입
    if (open) { g.beginPath(); g.moveTo(DHR * 0.3, 8); g.quadraticCurveTo(DHR * 0.8, 17, DHR * 1.3, 8); g.closePath(); g.fillStyle = '#7a2a30'; g.fill(); E(g, DHR * 0.82, 12.5, 3, 1.8); g.fillStyle = '#ff8fa0'; g.fill(); }
    else { st(g, 1.2, DK(col, 0.55)); g.beginPath(); g.moveTo(DHR * 0.35, 9.5); g.quadraticCurveTo(DHR * 0.8, 13, DHR * 1.2, 9); g.stroke(); }
    // 큰 눈
    if (evil) { eyeKit(g, -2, -3, 4.4, 5.6, { glow: '#ff3b5a', sparkle: true, blink: P.blink }); eyeKit(g, 9, -3, 4, 5.2, { glow: '#ff3b5a', sparkle: true, blink: P.blink }); }
    else { eyeKit(g, -2, -3, 4.6, 5.8, { sparkle: true, blink: P.blink, iris: 'rgba(60,40,20,.9)' }); eyeKit(g, 9.5, -3, 4.2, 5.4, { sparkle: true, blink: P.blink, iris: 'rgba(60,40,20,.9)' }); if (!P.blink) { E(g, -3.2, -6, 1.4, 1.4); g.fillStyle = '#fff'; g.fill(); E(g, 8.4, -6, 1.3, 1.3); g.fill(); } }
    [[-7, 5], [15, 4]].forEach(([bx, by]) => { const bl = g.createRadialGradient(bx, by, 0, bx, by, 4.6); bl.addColorStop(0, 'rgba(255,120,150,.6)'); bl.addColorStop(1, 'rgba(255,120,150,0)'); g.fillStyle = bl; E(g, bx, by, 4.6, 3.4); g.fill(); });
    // 어른 용: 금빛 굴레
    if (D.crown && !evil) { st(g, 2, '#ffd34d'); g.beginPath(); g.moveTo(-8, 6); g.quadraticCurveTo(4, 12, 18, 5); g.stroke(); E(g, 4, 10, 2.2, 2.2); g.fillStyle = '#4fb6ff'; g.fill(); }
    // 고삐
    if (!evil) { st(g, 1, '#6b3f1f'); g.beginPath(); g.moveTo(DHR * 0.5, 9); g.quadraticCurveTo(-14, 18, -32, 14); g.stroke(); }
    g.restore();
  }
  /* =========================================================
     v1.5 보스 14종 봉제인형화 — 펠트 천 · 바느질 땀 · 단추 눈 · 볼터치 (무섭지 않은 인형 악당)
     ========================================================= */
  const pmouth = (g, x, y, w, open, col) => { st(g, 1.3, col || '#3a2214'); g.beginPath(); if (open) { g.moveTo(x - w, y); g.quadraticCurveTo(x, y + w * 1.6, x + w, y); g.closePath(); g.fillStyle = '#7a2a30'; g.fill(); } else { g.moveTo(x - w, y); g.quadraticCurveTo(x - w / 2, y + w * 0.7, x, y); g.quadraticCurveTo(x + w / 2, y + w * 0.7, x + w, y); g.stroke(); } };
  const crown = (g, x, y, w, col) => { g.fillStyle = lgr(g, '#fff0a0', col || '#c8901a', 0, y - w, 0, y); g.beginPath(); g.moveTo(x - w, y); g.lineTo(x - w, y - w * 0.8); g.lineTo(x - w * 0.5, y - w * 0.4); g.lineTo(x, y - w * 1.05); g.lineTo(x + w * 0.5, y - w * 0.4); g.lineTo(x + w, y - w * 0.8); g.lineTo(x + w, y); g.closePath(); g.fill(); E(g, x, y - w * 0.45, w * 0.18, w * 0.18); g.fillStyle = '#ff5a8a'; g.fill(); };
  // 2장 늪 대왕 그롬: 통통한 초록 트롤 인형 + 버섯 + 나무 숟가락 몽둥이
  function pbTroll(g, P) { const M = mobPose(P); g.save(); g.scale(2.6, 2.6); g.translate(M.lunge ? 4 : 0, M.bob);
    plushBoot(g, -8, 0, '#6a4a2a', false); plushBoot(g, 8, 0, '#6a4a2a', true);
    ball(g, 0, -24, 20, 18, '#6ab060'); g.save(); E(g, 0, -24, 20, 18); g.clip(); E(g, 4, -18, 13, 12); g.fillStyle = '#d8e8a0'; g.fill(); RR(g, -22, -16, 44, 5, 2); g.fillStyle = '#8a5a2a'; g.fill(); g.restore();
    ball(g, 4, -52, 17, 15, '#78c068'); fuzz(g, 4, -52, 17, 15, '#78c068', 14, 101, Math.PI, TAU);
    E(g, -14, -52, 5, 7); g.fillStyle = '#78c068'; g.fill(); E(g, 22, -52, 5, 7); g.fill();
    btnEye(g, -1, -54, 3.6, '#2a3a1a', P); btnEye(g, 11, -54, 3.4, '#2a3a1a', P); blush(g, -6, -46, 3.6); blush(g, 16, -46, 3.4);
    pmouth(g, 5, -45, 4, M.lunge); g.fillStyle = '#fff8e8'; [[0, -45], [10, -45]].forEach(([x, y]) => { g.beginPath(); g.moveTo(x - 1.4, y); g.lineTo(x, y - 3.4); g.lineTo(x + 1.4, y); g.fill(); });
    E(g, -4, -68, 9, 5); g.fillStyle = '#e84a4a'; g.fill(); [[-8, -69], [-2, -71], [1, -67]].forEach(([x, y]) => { E(g, x, y, 1.4, 1.4); g.fillStyle = '#fff'; g.fill(); }); RR(g, -6, -66, 4, 4, 1); g.fillStyle = '#fff3d8'; g.fill();
    g.save(); g.translate(18, -28); g.rotate(M.lunge ? 0.9 : -0.3); RR(g, -2.4, -30, 4.8, 32, 2); g.fillStyle = '#a0683a'; g.fill(); E(g, 0, -32, 7, 9); g.fillStyle = '#c08850'; g.fill(); stitch(g, () => { E(g, 0, -32, 5, 7); }, 'rgba(255,255,255,.4)'); g.restore();
    g.restore(); }
  // 3장 스콜피: 모래빛 전갈 인형 + 큰 집게 + 별 꼬리
  function pbScorp(g, P) { const M = mobPose(P); g.save(); g.scale(2.2, 2.2); g.translate(M.lunge ? 4 : 0, M.bob);
    for (let k = 0; k < 3; k++) [-1, 1].forEach(sd => { st(g, 2.6, '#c8902a'); g.beginPath(); g.moveTo(sd * 4 + k * 6 - 6, -6); g.lineTo(sd * 8 + k * 6 - 6, 0); g.stroke(); });
    st(g, 8, '#e8b850'); g.beginPath(); g.moveTo(-12, -12); g.quadraticCurveTo(-30, -20, -24, -42); g.quadraticCurveTo(-18, -54, -6, -48); g.stroke(); stitch(g, () => { g.moveTo(-14, -14); g.quadraticCurveTo(-28, -22, -23, -40); });
    star(g, -4, -48, 6, M.lunge ? '#ff7a5a' : '#ffd34d');
    ball(g, 0, -12, 18, 11, '#e8b850');
    [[16, -16, 1], [14, -6, -1]].forEach(([x, y, sd], k) => { g.save(); g.translate(x + (M.lunge ? 6 : 0), y); g.rotate(sd * 0.2); ball(g, 6, 0, 7, 5.6, '#f0c060'); g.fillStyle = '#f0c060'; g.beginPath(); g.moveTo(10, -2); g.lineTo(18, -6); g.lineTo(14, 0); g.lineTo(18, 5); g.lineTo(10, 3); g.closePath(); g.fill(); g.restore(); });
    btnEye(g, 6, -18, 3, '#3a2212', P); btnEye(g, 13, -18, 2.8, '#3a2212', P); blush(g, 3, -12, 3); blush(g, 15, -12, 3); pmouth(g, 10, -13, 2.4, M.lunge);
    crown(g, 8, -24, 6);
    g.restore(); }
  // 4장 프로스트: 눈사람 같은 얼음 골렘 인형 + 목도리 + 고드름 왕관
  function pbFrost(g, P) { const M = mobPose(P); g.save(); g.scale(2.5, 2.5); g.translate(M.lunge ? 4 : 0, M.bob);
    plushBoot(g, -8, 0, '#5a8ab8', false); plushBoot(g, 8, 0, '#5a8ab8', true);
    ball(g, 0, -22, 19, 17, '#d8f0ff'); [[0, -28], [0, -20], [0, -12]].forEach(([x, y]) => { star(g, x + 6, y, 2.4, '#7ac8ff'); });
    ball(g, 3, -52, 16, 15, '#e8f8ff'); fuzz(g, 3, -52, 16, 15, '#e8f8ff', 14, 103, Math.PI, TAU);
    RR(g, -12, -40, 30, 6, 3); g.fillStyle = '#ff6a8a'; g.fill(); RR(g, -12, -40, 6, 16, 3); g.fill(); stitch(g, () => { g.moveTo(-10, -37); g.lineTo(16, -37); }, 'rgba(255,255,255,.6)');
    btnEye(g, -2, -54, 3.4, '#2a4a6a', P); btnEye(g, 9, -54, 3.2, '#2a4a6a', P); blush(g, -6, -47, 3.4); blush(g, 13, -47, 3.2);
    g.fillStyle = '#ffa04a'; g.beginPath(); g.moveTo(3, -50); g.lineTo(11, -48); g.lineTo(3, -46.6); g.closePath(); g.fill(); pmouth(g, 3, -44, 3, M.lunge);
    g.fillStyle = '#9ad8ff'; [[-8, 6], [-2, 10], [4, 12], [10, 9], [16, 6]].forEach(([x, h]) => { g.beginPath(); g.moveTo(x - 3, -64); g.lineTo(x, -64 - h); g.lineTo(x + 3, -64); g.closePath(); g.fill(); });
    E(g, M.lunge ? 26 : 20, -24, 6, 6); g.fillStyle = '#d8f0ff'; g.fill();
    g.restore(); }
  // 6장 크라케나: 분홍 문어 여왕 인형 + 진주 목걸이 + 작은 삼지창
  function pbKraken(g, P) { const M = mobPose(P); g.save(); g.scale(2.4, 2.4); g.translate(M.lunge ? 4 : 0, M.bob * 0.5);
    for (let k = 0; k < 6; k++) { const x = -16 + k * 6.4, w = Math.sin(M.ph + k) * 3; st(g, 6, k % 2 ? '#ff8ac0' : '#ff9ccc'); g.beginPath(); g.moveTo(x, -16); g.quadraticCurveTo(x + w, -6, x + 4 + w, -1); g.stroke(); E(g, x + 5 + w, -1, 3, 2.2); g.fillStyle = '#ffd0e4'; g.fill(); }
    ball(g, 0, -36, 20, 22, '#ff8ac0'); fuzz(g, 0, -36, 20, 22, '#ff8ac0', 14, 105, Math.PI, TAU);
    [[-10, -48], [8, -54], [-2, -58]].forEach(([x, y]) => { E(g, x, y, 2.6, 2.6); g.fillStyle = 'rgba(255,255,255,.4)'; g.fill(); });
    btnEye(g, -3, -34, 4, '#4a1a3a', P); btnEye(g, 10, -34, 3.8, '#4a1a3a', P); blush(g, -9, -26, 4); blush(g, 15, -26, 3.8); pmouth(g, 4, -25, 3, M.lunge);
    for (let k = 0; k < 7; k++) { E(g, -10 + k * 3.6, -18 + Math.abs(k - 3) * 0.6, 1.6, 1.6); g.fillStyle = '#fffaf0'; g.fill(); }
    crown(g, 2, -56, 7, '#ff8ac0');
    g.save(); g.translate(22, -30); g.rotate(M.lunge ? 0.6 : 0.1); st(g, 2, '#ffd34d'); g.beginPath(); g.moveTo(0, 10); g.lineTo(0, -20); g.moveTo(-5, -14); g.lineTo(-5, -20); g.moveTo(5, -14); g.lineTo(5, -20); g.moveTo(-5, -14); g.lineTo(5, -14); g.stroke(); g.restore();
    g.restore(); }
  // 7장 스톰윙: 해적 부엉이 인형 + 해적 모자 + 하트 안대 + 작은 칼
  function pbOwl(g, P) { const M = mobPose(P); g.save(); g.scale(2.3, 2.3); g.translate(M.lunge ? 4 : 0, M.bob);
    [[-5], [5]].forEach(([x]) => { st(g, 2, '#e8a040'); g.beginPath(); g.moveTo(x - 3, 0); g.lineTo(x, -4); g.lineTo(x + 3, 0); g.stroke(); });
    ball(g, 0, -28, 18, 24, '#a87850'); g.save(); E(g, 0, -28, 18, 24); g.clip(); E(g, 2, -20, 12, 15); g.fillStyle = '#f0dcb8'; g.fill(); for (let k = 0; k < 4; k++) { st(g, 1, 'rgba(160,110,70,.6)'); g.beginPath(); g.arc(2 + (k % 2) * 4 - 2, -26 + k * 5, 3, 0.2, Math.PI - 0.2); g.stroke(); } g.restore();
    g.save(); g.translate(-15, -30); g.rotate(-0.3); E(g, 0, 0, 6, 14); g.fillStyle = '#8a5a3a'; g.fill(); g.restore();
    [[-5, -40], [9, -40]].forEach(([x, y]) => { E(g, x, y, 7, 7); g.fillStyle = '#fff6e8'; g.fill(); });
    btnEye(g, 9, -40, 3.6, '#3a2212', P); g.beginPath(); const hx = -5, hy = -40; g.moveTo(hx, hy + 4); g.bezierCurveTo(hx - 5, hy, hx - 3, hy - 4, hx, hy - 1.6); g.bezierCurveTo(hx + 3, hy - 4, hx + 5, hy, hx, hy + 4); g.fillStyle = '#2a1a1a'; g.fill(); st(g, 1, '#2a1a1a'); g.beginPath(); g.moveTo(-12, -44); g.lineTo(16, -46); g.stroke();
    g.fillStyle = '#ffb040'; g.beginPath(); g.moveTo(0, -36); g.lineTo(4, -36); g.lineTo(2, -32); g.closePath(); g.fill(); blush(g, -9, -33, 3); blush(g, 14, -33, 3);
    g.fillStyle = '#2a2230'; g.beginPath(); g.moveTo(-18, -48); g.quadraticCurveTo(2, -66, 22, -48); g.quadraticCurveTo(2, -54, -18, -48); g.fill(); E(g, 2, -55, 3.4, 3); g.fillStyle = '#fff'; g.fill(); st(g, 1, '#2a2230'); g.beginPath(); g.moveTo(0, -53); g.lineTo(4, -57); g.moveTo(4, -53); g.lineTo(0, -57); g.stroke();
    g.save(); g.translate(16, -24); g.rotate(M.lunge ? 1.2 : 0.3); RR(g, -1.6, -2, 3.2, 6, 1.2); g.fillStyle = '#6a4a2a'; g.fill(); g.beginPath(); g.moveTo(-2, -2); g.quadraticCurveTo(-3, -16, 2, -22); g.lineTo(2, -2); g.closePath(); g.fillStyle = '#e8eef4'; g.fill(); g.restore();
    g.restore(); }
  // 8장 프리즘: 보석 조각 펠트 골렘 인형
  function pbCGolem(g, P) { const M = mobPose(P); g.save(); g.scale(2.8, 2.8); g.translate(M.lunge ? 4 : 0, M.bob);
    plushBoot(g, -9, 0, '#8a6ac8', false); plushBoot(g, 9, 0, '#8a6ac8', true);
    RR(g, -20, -48, 40, 40, 14); g.fillStyle = lgr(g, '#c8b0ff', '#7ac8e8', -20, -48, 20, -8); g.fill();
    [[-12, -40, '#e0d0ff'], [4, -36, '#b0f0ff'], [-6, -20, '#ffd0f0'], [10, -18, '#d0ffe8']].forEach(([x, y, c]) => { g.beginPath(); g.moveTo(x, y - 6); g.lineTo(x + 6, y); g.lineTo(x, y + 6); g.lineTo(x - 6, y); g.closePath(); g.fillStyle = c; g.fill(); stitch(g, () => { g.moveTo(x, y - 6); g.lineTo(x + 6, y); g.lineTo(x, y + 6); g.lineTo(x - 6, y); g.closePath(); }, 'rgba(255,255,255,.7)'); });
    ball(g, 2, -60, 14, 13, '#d8c8ff'); [[-6, -74, 7], [2, -76, 10], [10, -74, 7]].forEach(([x, y, h]) => { g.beginPath(); g.moveTo(x - 3, y + 4); g.lineTo(x, y - h + 4); g.lineTo(x + 3, y + 4); g.closePath(); g.fillStyle = '#b0f0ff'; g.fill(); });
    btnEye(g, -3, -61, 3.2, '#3a2a6a', P); btnEye(g, 8, -61, 3, '#3a2a6a', P); blush(g, -7, -55, 3); blush(g, 12, -55, 3); pmouth(g, 2.5, -55, 2.6, M.lunge);
    [[-1, -24], [1, 24]].forEach(([sd, x]) => { ball(g, x, -30 + (M.lunge && sd > 0 ? -6 : 0), 6, 9, '#b8a0f0'); });
    g.restore(); }
  // 10장 보이드: 별이 박힌 두건 쓴 그림자 유령 인형
  function pbVoid(g, P) { const ph = ((P.walk || 0) + (P.breathe || 0)) * TAU, atk = P.atk == null ? -1 : P.atk, lun = atk >= 0.35 && atk < 0.7; g.save(); g.scale(2.9, 2.9); g.translate(lun ? 4 : 0, Math.sin(ph) * 2);
    g.beginPath(); g.moveTo(-20, 0); g.bezierCurveTo(-26, -40, -16, -72, 2, -72); g.bezierCurveTo(20, -72, 28, -40, 22, 0); g.quadraticCurveTo(16, -6, 11, 0); g.quadraticCurveTo(6, -6, 1, 0); g.quadraticCurveTo(-4, -6, -9, 0); g.quadraticCurveTo(-14, -6, -20, 0); g.closePath();
    g.fillStyle = lgr(g, '#5a4a8a', '#2a1a4a', 0, -72, 0, 0); g.fill(); stitch(g, () => { g.moveTo(-16, -4); g.bezierCurveTo(-20, -38, -12, -66, 2, -66); }, 'rgba(220,200,255,.5)');
    for (let k = 0; k < 9; k++) star(g, -14 + (k * 7) % 30, -10 - (k * 13) % 50, 1.6, '#fff6c8');
    E(g, 3, -46, 14, 13); g.fillStyle = '#1a1030'; g.fill();
    btnEye(g, -2, -47, 3.6, '#c8a0ff', P); btnEye(g, 9, -47, 3.4, '#c8a0ff', P); blush(g, -6, -40, 3); blush(g, 13, -40, 3); pmouth(g, 3.5, -40, 2.4, lun, '#c8a0ff');
    E(g, -16, -24, 4, 4); g.fillStyle = '#4a3a7a'; g.fill(); E(g, lun ? 26 : 20, -26, 4.4, 4.4); g.fill();
    g.restore(); }
  // 11장 오르카: 별을 품은 남색 고래 인형 + 작은 왕관
  function pbWhale(g, P) { const ph = ((P.walk || 0) + (P.breathe || 0)) * TAU, atk = P.atk == null ? -1 : P.atk, lun = atk >= 0.35 && atk < 0.7; g.save(); g.scale(2.6, 2.6); g.translate(lun ? 4 : 0, Math.sin(ph) * 1.5);
    g.save(); g.translate(-34, -22); g.rotate(Math.sin(ph) * 0.2); g.beginPath(); g.moveTo(6, 0); g.quadraticCurveTo(-8, -14, -14, -10); g.quadraticCurveTo(-6, -2, -14, 8); g.quadraticCurveTo(-6, 6, 6, 0); g.fillStyle = '#3a5aa0'; g.fill(); g.restore();
    ball(g, 0, -24, 36, 22, '#4a6ab8'); g.save(); E(g, 0, -24, 36, 22); g.clip(); E(g, 8, -8, 30, 12); g.fillStyle = '#d8e8ff'; g.fill(); for (let k = 0; k < 5; k++) { st(g, 1, 'rgba(140,170,220,.7)'); g.beginPath(); g.moveTo(-14 + k * 7, -2); g.lineTo(-12 + k * 7, -14); g.stroke(); } g.restore();
    for (let k = 0; k < 7; k++) star(g, -24 + k * 7, -36 - (k % 3) * 4, 1.8, '#fff6c8');
    btnEye(g, 20, -26, 3.6, '#1a2a4a', P); blush(g, 22, -18, 4); pmouth(g, 28, -17, 3, lun);
    g.save(); g.translate(4, -6); g.rotate(0.4 + Math.sin(ph) * 0.15); E(g, 0, 6, 5, 9); g.fillStyle = '#3a5aa0'; g.fill(); g.restore();
    crown(g, 6, -46, 7); st(g, 2, 'rgba(200,240,255,.8)'); g.beginPath(); g.moveTo(-6, -46); g.quadraticCurveTo(-8, -56, -4, -60); g.moveTo(-6, -46); g.quadraticCurveTo(-2, -56, 2, -58); g.stroke();
    g.restore(); }
  // 13장 드릴로: 광부 두더지 인형 + 드릴 헬멧
  function pbMole(g, P) { const M = mobPose(P); g.save(); g.scale(2.5, 2.5); g.translate(M.lunge ? 5 : 0, M.bob);
    [[-10], [10]].forEach(([x], k) => { E(g, x, -2, 8, 4); g.fillStyle = '#ffb0b8'; g.fill(); });
    ball(g, 0, -22, 22, 20, '#6a5a6a'); fuzz(g, 0, -22, 22, 20, '#6a5a6a', 18, 107, Math.PI, TAU);
    g.save(); E(g, 0, -22, 22, 20); g.clip(); E(g, 6, -14, 13, 11); g.fillStyle = '#a89aa8'; g.fill(); RR(g, -24, -12, 48, 5, 2); g.fillStyle = '#8a5a2a'; g.fill(); g.restore();
    ball(g, 18, -28, 7, 6, '#ffb0c0'); btnEye(g, 6, -32, 2.6, '#1a1a22', P); btnEye(g, 13, -33, 2.4, '#1a1a22', P); blush(g, 2, -26, 3.4); blush(g, 16, -24, 3);
    g.fillStyle = lgr(g, '#ffd060', '#c88a20', 0, -48, 0, -38); g.beginPath(); g.ellipse(2, -38, 18, 10, 0, Math.PI, TAU); g.fill(); E(g, 2, -44, 3.6, 3.6); g.fillStyle = '#fff6c0'; g.fill();
    g.save(); g.translate(20, -20); g.rotate(M.lunge ? 0 : -0.2); g.fillStyle = lgr(g, '#e8eef4', '#8a96a4', 0, -6, 0, 6); g.beginPath(); g.moveTo(0, -7); g.lineTo(24, 0); g.lineTo(0, 7); g.closePath(); g.fill(); st(g, 1, '#6a7480'); for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(4 + k * 5, -6 + k * 1.4); g.lineTo(6 + k * 5, 6 - k * 1.4); g.stroke(); } RR(g, -6, -6, 8, 12, 3); g.fillStyle = '#ffb04a'; g.fill(); g.restore();
    g.restore(); }
  // 14장 오스테아: 뼈 무늬 펠트 아기 용 (흰 크림색)
  function pbBonedra(g, P) { g.save(); g.scale(2.4, 2.4); paintDragonMount(g, P, '#e8dcc0', false, 2, true); paintDragonMount(g, P, '#e8dcc0', true, 2, true); g.restore(); }
  // 15장 틱톡: 실크햇 · 외눈 안경 부엉이 박사 인형 + 시계 배
  function pbCogowl(g, P) { const M = mobPose(P); g.save(); g.scale(2.6, 2.6); g.translate(M.lunge ? 4 : 0, M.bob);
    [[-5], [5]].forEach(([x]) => { st(g, 2, '#e8a040'); g.beginPath(); g.moveTo(x - 3, 0); g.lineTo(x, -4); g.lineTo(x + 3, 0); g.stroke(); });
    ball(g, 0, -28, 18, 24, '#9a7050'); E(g, 2, -22, 11, 11); g.fillStyle = '#fff6e0'; g.fill(); st(g, 1.6, '#c8901a'); E(g, 2, -22, 11, 11); g.stroke();
    st(g, 1.4, '#3a2a1a'); g.beginPath(); g.moveTo(2, -22); g.lineTo(2, -29); g.moveTo(2, -22); g.lineTo(7, -20); g.stroke(); for (let k = 0; k < 12; k++) { const an = k / 12 * TAU; E(g, 2 + Math.cos(an) * 8.4, -22 + Math.sin(an) * 8.4, 0.7, 0.7); g.fillStyle = '#5a3a1a'; g.fill(); }
    [[-5, -42], [9, -42]].forEach(([x, y]) => { E(g, x, y, 7, 7); g.fillStyle = '#fff6e8'; g.fill(); });
    btnEye(g, -5, -42, 3.4, '#3a2a5a', P); btnEye(g, 9, -42, 3.4, '#3a2a5a', P); st(g, 1.4, '#c8901a'); E(g, 9, -42, 6, 6); g.stroke(); g.beginPath(); g.moveTo(14, -40); g.quadraticCurveTo(18, -34, 16, -28); g.stroke();
    g.fillStyle = '#ffb040'; g.beginPath(); g.moveTo(1, -38); g.lineTo(5, -38); g.lineTo(3, -34); g.closePath(); g.fill(); blush(g, -10, -35, 3); blush(g, 15, -35, 3);
    RR(g, -10, -70, 22, 18, 3); g.fillStyle = '#3a2a3a'; g.fill(); RR(g, -15, -54, 32, 4, 2); g.fill(); RR(g, -10, -59, 22, 3, 1); g.fillStyle = '#c8901a'; g.fill();
    g.save(); g.translate(-14, -30); g.rotate(-0.2); E(g, 0, 0, 6, 13); g.fillStyle = '#7a5038'; g.fill(); g.restore();
    g.restore(); }
  // 16장 크로노: 배에 시계가 있는 까만 고양이 인형 + 모래시계 꼬리
  function pbTcat(g, P) { const M = mobPose(P); g.save(); g.scale(2.6, 2.6); g.translate(M.lunge ? 5 : 0, M.bob);
    st(g, 5, '#2a2a3a'); g.beginPath(); g.moveTo(-18, -14); g.quadraticCurveTo(-36, -18, -32, -44); g.stroke(); g.save(); g.translate(-32, -48); g.fillStyle = '#ffd34d'; g.beginPath(); g.moveTo(-5, -6); g.lineTo(5, -6); g.lineTo(0, 0); g.lineTo(5, 6); g.lineTo(-5, 6); g.lineTo(0, 0); g.closePath(); g.fill(); g.restore();
    [[-10, 0.5], [12, 0]].forEach(([x, p], k) => plushBoot(g, x + (P.moving ? Math.sin(M.ph + p * TAU) * 3 : 0), 0, '#4a3a6a', k === 1));
    ball(g, 0, -20, 22, 16, '#3a3a4a'); E(g, 4, -18, 10, 10); g.fillStyle = '#fff6e0'; g.fill(); st(g, 1.4, '#c8901a'); E(g, 4, -18, 10, 10); g.stroke(); st(g, 1.2, '#2a1a1a'); g.beginPath(); g.moveTo(4, -18); g.lineTo(4, -25); g.moveTo(4, -18); g.lineTo(9, -16); g.stroke();
    ball(g, 14, -42, 16, 14, '#3a3a4a'); fuzz(g, 14, -42, 16, 14, '#3a3a4a', 12, 109, Math.PI, TAU);
    [[4, -55, -1], [24, -55, 1]].forEach(([x, y, sd]) => { g.beginPath(); g.moveTo(x - 6, y + 6); g.lineTo(x + sd * 2, y - 8); g.lineTo(x + 6, y + 6); g.closePath(); g.fillStyle = '#3a3a4a'; g.fill(); g.beginPath(); g.moveTo(x - 3, y + 5); g.lineTo(x + sd, y - 3); g.lineTo(x + 3, y + 5); g.closePath(); g.fillStyle = '#ffb0c0'; g.fill(); });
    btnEye(g, 8, -43, 3.6, '#c8a020', P); btnEye(g, 20, -43, 3.4, '#c8a020', P); E(g, 14, -37, 1.8, 1.3); g.fillStyle = '#ff8fa8'; g.fill(); blush(g, 4, -36, 3.4); blush(g, 24, -36, 3.2);
    st(g, 1, '#c8c8d8'); g.beginPath(); g.moveTo(14, -35.6); g.quadraticCurveTo(12, -33, 10, -34.4); g.moveTo(14, -35.6); g.quadraticCurveTo(16, -33, 18, -34.4); g.stroke(); [[-1, 0], [1, 0]].forEach(([sd]) => { g.beginPath(); g.moveTo(14 + sd * 6, -37); g.lineTo(14 + sd * 16, -39); g.stroke(); });
    E(g, 12, -27.6, 3, 3); g.fillStyle = '#ffd34d'; g.fill();
    g.restore(); }
  // 17장 몽글라: 수면 모자 쓴 해파리 여왕 인형
  function pbJelly(g, P) { const ph = ((P.walk || 0) + (P.breathe || 0)) * TAU, atk = P.atk == null ? -1 : P.atk, lun = atk >= 0.35 && atk < 0.7; g.save(); g.scale(2.6, 2.6); g.translate(lun ? 4 : 0, Math.sin(ph) * 2);
    for (let k = 0; k < 6; k++) { const x = -14 + k * 5.6, w = Math.sin(ph + k) * 3; st(g, 3, k % 2 ? '#ffb3e0' : '#c8b0ff'); g.beginPath(); g.moveTo(x, -26); g.quadraticCurveTo(x + w, -14, x - w, 0); g.stroke(); }
    g.beginPath(); g.moveTo(-22, -26); g.bezierCurveTo(-24, -56, 22, -56, 22, -26); g.quadraticCurveTo(0, -20, -22, -26); g.closePath(); g.fillStyle = lgr(g, '#e8d8ff', '#b8a0f0', 0, -56, 0, -24); g.fill();
    stitch(g, () => { g.moveTo(-19, -27); g.quadraticCurveTo(0, -22, 19, -27); }, 'rgba(255,255,255,.7)');
    st(g, 1.6, '#4a2a6a'); g.beginPath(); g.arc(-6, -36, 3.4, Math.PI * 0.15, Math.PI * 0.85); g.moveTo(9.4, -35); g.arc(6, -36, 3.4, Math.PI * 0.15, Math.PI * 0.85); g.stroke();
    blush(g, -11, -31, 3.6); blush(g, 11, -31, 3.6); pmouth(g, 0, -29, 2.4, lun, '#4a2a6a');
    g.fillStyle = '#6a8ad0'; g.beginPath(); g.moveTo(-18, -46); g.quadraticCurveTo(0, -64, 16, -52); g.quadraticCurveTo(26, -48, 26, -40); g.quadraticCurveTo(10, -48, -18, -46); g.fill(); [[-6, -52], [4, -56], [12, -50]].forEach(([x, y]) => star(g, x, y, 1.8, '#fff6c8')); E(g, 26, -38, 3.4, 3.4); g.fillStyle = '#fff'; g.fill();
    g.restore(); }
  // 25장 무지개 다리 문지기 칠색 거북 무지
  function pbRainTurtle(g, P) { const M = mobPose(P); g.save(); g.scale(2.6, 2.6); g.translate(M.lunge ? 4 : 0, M.bob * 0.6);
    [[-14], [12]].forEach(([x], k) => { E(g, x + (P.moving ? Math.sin(M.ph + k * 3) * 2 : 0), -3, 7, 4); g.fillStyle = '#9ad880'; g.fill(); });
    g.beginPath(); g.moveTo(-26, -6); g.quadraticCurveTo(-24, -40, 0, -40); g.quadraticCurveTo(24, -40, 26, -6); g.closePath(); g.save(); g.clip();
    ['#ff7a8a', '#ffb06a', '#ffe06a', '#8ae08a', '#6ac0ff', '#8a8aff', '#c88aff'].forEach((c, k) => { g.fillStyle = c; g.fillRect(-28, -42 + k * 5.4, 56, 5.6); }); g.restore();
    stitch(g, () => { g.moveTo(-22, -8); g.quadraticCurveTo(-20, -36, 0, -36); g.quadraticCurveTo(20, -36, 22, -8); }, 'rgba(255,255,255,.8)');
    RR(g, -27, -8, 54, 5, 2.4); g.fillStyle = '#f0f0d0'; g.fill();
    ball(g, 30, -18, 11, 10, '#a8e090'); btnEye(g, 27, -20, 2.8, '#1a2a12', P); btnEye(g, 35, -20, 2.6, '#1a2a12', P); blush(g, 25, -14, 2.8); blush(g, 37, -14, 2.6); pmouth(g, 31, -13, 2.4, M.lunge);
    g.fillStyle = '#ffd34d'; RR(g, 22, -32, 16, 4, 2); g.fill(); star(g, 30, -36, 3.4, '#fff3a0');
    g.restore(); }
  // v1.6 27장 산 거인 묵묵이 (목소리가 남을 다치게 할까 봐 입을 꿰매 버린 포근한 돌 거인)
  function pbMtGiant(g, P) { const M = mobPose(P); g.save(); g.scale(2.7, 2.7); g.translate(M.lunge ? 5 : 0, M.bob * 0.5);
    plushBoot(g, -10, 0, '#6a7480', false); plushBoot(g, 10, 0, '#6a7480', true);
    ball(g, 0, -26, 25, 24, '#9aa8b8'); fuzz(g, 0, -26, 25, 24, '#b8c4d0', 14, 3, Math.PI * 1.05, Math.PI * 1.95);
    E(g, 0, -20, 15, 14); g.fillStyle = 'rgba(255,255,255,.35)'; g.fill();
    [[-14, -38, 5], [12, -14, 4], [-18, -12, 3.4]].forEach(([x, y, r]) => { E(g, x, y, r, r * 0.8); g.fillStyle = '#7fbf6a'; g.fill(); });
    stitch(g, () => { g.moveTo(-20, -30); g.quadraticCurveTo(0, -22, 20, -30); }, 'rgba(255,255,255,.55)');
    // 벙어리장갑 손 (공격 땐 땅 짚기)
    const up = M.lunge ? 10 : 0; ball(g, -26, -18 + up * 0.4, 9, 8, '#8a98a8'); ball(g, 26 + up * 0.3, -18 + up, 9, 8, '#8a98a8');
    // 머리: 눈 모자 + 새 둥지
    ball(g, 0, -58, 18, 16, '#a8b6c4'); g.beginPath(); g.moveTo(-18, -62); g.quadraticCurveTo(-14, -78, 0, -78); g.quadraticCurveTo(14, -78, 18, -62); g.quadraticCurveTo(0, -68, -18, -62); g.fillStyle = '#ffffff'; g.fill();
    E(g, 8, -78, 7, 3); g.fillStyle = '#b08850'; g.fill(); ball(g, 9, -82, 3, 3, '#ffd36a'); E(g, 11, -82, 1, 0.8); g.fillStyle = '#e07a2a'; g.fill();
    btnEye(g, -6, -58, 3, '#24303a', P); btnEye(g, 7, -58, 3, '#24303a', P); blush(g, -11, -51, 3); blush(g, 12, -51, 3);
    // 꿰맨 입 (X 바느질)
    st(g, 1.3, '#5a3a4a'); g.beginPath(); g.moveTo(-4, -49); g.lineTo(4, -49); [-2.5, 0, 2.5].forEach(x => { g.moveTo(x - 1.2, -50.6); g.lineTo(x + 1.2, -47.4); }); g.stroke();
    g.restore(); }
  // v1.6 28장 메아리 요정 되울이 (남의 말만 따라 하는 수정 동굴의 요정)
  function pbEchoFairy(g, P) { const ph = ((P.walk || 0) + (P.breathe || 0)) * TAU, atk = P.atk == null ? -1 : P.atk, lun = atk >= 0.35 && atk < 0.7; g.save(); g.scale(2.6, 2.6); g.translate(lun ? 4 : 0, -8 + Math.sin(ph) * 2.4);
    E(g, 0, 8 - Math.sin(ph) * 2.4, 14, 3); g.fillStyle = 'rgba(40,20,60,.18)'; g.fill();
    // 메아리 고리
    for (let k = 0; k < 3; k++) { st(g, 1, `rgba(190,170,255,${0.5 - k * 0.14})`); g.beginPath(); g.ellipse(0, -30, 30 + k * 7 + Math.sin(ph + k) * 2, 22 + k * 5, 0, 0, TAU); g.stroke(); }
    // 귀 날개 (둥근 박쥐 귀 모양, 안에 동심원)
    [[-1], [1]].forEach(([d]) => { g.save(); g.translate(d * 14, -40); g.rotate(d * (0.5 + Math.sin(ph * 2) * 0.12));
      g.beginPath(); g.ellipse(d * 10, -6, 12, 16, 0, 0, TAU); g.fillStyle = lgr(g, '#e8dcff', '#a890e0', 0, -22, 0, 10); g.fill();
      [9, 6, 3].forEach((r, q) => { st(g, 0.9, q % 2 ? 'rgba(255,255,255,.8)' : 'rgba(150,120,220,.8)'); g.beginPath(); g.arc(d * 10, -6, r, 0, TAU); g.stroke(); });
      stitch(g, () => { g.ellipse(d * 10, -6, 11, 15, 0, 0, TAU); }, 'rgba(255,255,255,.6)'); g.restore(); });
    ball(g, 0, -26, 15, 17, '#c8b8f0'); E(g, 0, -20, 9, 10); g.fillStyle = 'rgba(255,255,255,.45)'; g.fill();
    // 더듬이 수정
    st(g, 1.2, '#8a70c8'); g.beginPath(); g.moveTo(0, -42); g.quadraticCurveTo(-2, -50, 2, -54); g.stroke();
    g.beginPath(); g.moveTo(2, -60); g.lineTo(5, -55); g.lineTo(2, -50); g.lineTo(-1, -55); g.closePath(); g.fillStyle = lgr(g, '#ffffff', '#9ae0ff', 0, -60, 0, -50); g.fill();
    g.save(); g.globalCompositeOperation = 'lighter'; g.drawImage(softDot('#bfe8ff'), -8, -66, 20, 20); g.restore();
    if (P.blink) { st(g, 1.4, '#3a2a5a'); g.beginPath(); g.arc(-5, -30, 3, Math.PI * 1.1, Math.PI * 1.9); g.moveTo(9.5, -30); g.arc(6.5, -30, 3, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
    else { eyeKit(g, -5, -30, 3.4, 4.2, { sparkle: true, iris: 'rgba(110,80,200,.9)' }); eyeKit(g, 6.5, -30, 3.2, 4, { sparkle: true, iris: 'rgba(110,80,200,.9)' }); }
    blush(g, -9, -24, 2.8); blush(g, 10, -24, 2.8); pmouth(g, 1, -22, 2.2, lun, '#3a2a5a');
    // 작은 발 (둥실)
    ball(g, -5, -9, 4, 3, '#b0a0e0'); ball(g, 6, -9, 4, 3, '#b0a0e0');
    g.restore(); }
  // v1.8 29장 태엽 낙타 터벅이 (고장 나면 버려질까 봐 무서운 상인 여우의 낡은 짐꾼 로봇)
  function pbCamelBot(g, P) { const M = mobPose(P); g.save(); g.scale(2.6, 2.6); g.translate(M.lunge ? 6 : 0, M.bob * 0.5);
    [[-16], [-8], [8], [16]].forEach(([x], k) => { const sw = P.moving ? Math.sin(M.ph + k * 1.6) * 3 : 0; RR(g, x - 2.4 + sw, -14, 4.8, 14, 2); g.fillStyle = '#b08850'; g.fill(); ball(g, x + sw, 0, 3.6, 2.2, '#7a5a30'); });
    ball(g, 0, -22, 22, 11, '#d8a868'); stitch(g, () => { g.moveTo(-19, -20); g.quadraticCurveTo(0, -14, 19, -20); }, 'rgba(255,255,255,.55)');
    // 혹 두 개 = 짐 보따리 + 태엽
    ball(g, -9, -34, 8, 7, '#c89858'); ball(g, 6, -34, 8, 7, '#c89858'); RR(g, -14, -40, 10, 7, 2); g.fillStyle = '#5a8ad0'; g.fill(); RR(g, 2, -40, 10, 7, 2); g.fillStyle = '#d05a8a'; g.fill();
    st(g, 2, '#c8a040'); g.beginPath(); g.moveTo(-1, -40); g.lineTo(-1, -48); g.stroke(); g.beginPath(); g.ellipse(-5, -50, 4, 2.4, 0, 0, TAU); g.ellipse(3, -50, 4, 2.4, 0, 0, TAU); g.stroke();
    // 목과 머리
    g.beginPath(); g.moveTo(16, -26); g.quadraticCurveTo(24, -34, 24, -46); g.lineTo(31, -46); g.quadraticCurveTo(31, -30, 21, -20); g.closePath(); g.fillStyle = '#d8a868'; g.fill();
    ball(g, 30, -50, 9, 7, '#e0b070'); E(g, 37, -48, 4, 3.4); g.fillStyle = '#c89050'; g.fill(); [[26, -57], [31, -58]].forEach(([x, y]) => { E(g, x, y, 2, 3); g.fillStyle = '#c89050'; g.fill(); });
    btnEye(g, 29, -52, 2.2, '#2a1a12', P); btnEye(g, 34, -52, 2, '#2a1a12', P); blush(g, 27, -47, 2.2); blush(g, 36, -46.5, 2);
    // 반창고 (고장 난 곳)
    g.save(); g.translate(-12, -22); g.rotate(-0.4); RR(g, -5, -2, 10, 4, 1.5); g.fillStyle = '#f8e0c0'; g.fill(); st(g, 0.6, '#c8a080'); g.beginPath(); g.moveTo(-1, -2); g.lineTo(-1, 2); g.moveTo(1, -2); g.lineTo(1, 2); g.stroke(); g.restore();
    g.restore(); }
  // v1.8 30장 상인 여우 짤랑이 (가진 걸 잃을까 봐 별을 몽땅 사들이는 사막 별시장의 주인)
  function pbStarFox(g, P) { const M = mobPose(P); g.save(); g.scale(2.7, 2.7); g.translate(M.lunge ? 4 : 0, M.bob * 0.6);
    // 꼬리
    g.save(); g.translate(-12, -14); g.rotate(-0.5 + Math.sin(M.ph) * 0.12); E(g, -6, -6, 8, 13); g.fillStyle = '#ff9a3a'; g.fill(); E(g, -8, -15, 4, 5); g.fillStyle = '#fff6e8'; g.fill(); g.restore();
    plushBoot(g, -5, 0, '#7a3a8a', false); plushBoot(g, 6, 0, '#7a3a8a', true);
    // 상인 망토
    g.beginPath(); g.moveTo(-13, -4); g.quadraticCurveTo(-16, -28, 0, -32); g.quadraticCurveTo(16, -28, 13, -4); g.closePath(); g.fillStyle = lgr(g, '#8a4ab0', '#5a2a7a', 0, -32, 0, -4); g.fill();
    for (let k = 0; k < 5; k++) star(g, -8 + k * 4, -10 - (k % 2) * 8, 1.6, '#ffe27a');
    // 별 주머니
    ball(g, 12, -10, 6, 6.5, '#c8a050'); st(g, 1, '#7a5a20'); g.beginPath(); g.moveTo(9, -16); g.lineTo(15, -16); g.stroke(); star(g, 12, -9, 2.6, '#fff6a0');
    // 얼굴
    ball(g, 1, -44, 13, 11, '#ff9a3a'); [[-8, -55, -0.3], [9, -55, 0.3]].forEach(([x, y, r]) => { g.save(); g.translate(x, y); g.rotate(r); g.beginPath(); g.moveTo(-5, 4); g.lineTo(0, -8); g.lineTo(5, 4); g.closePath(); g.fillStyle = '#ff9a3a'; g.fill(); g.beginPath(); g.moveTo(-2.4, 3); g.lineTo(0, -4); g.lineTo(2.4, 3); g.fillStyle = '#ffd8c0'; g.fill(); g.restore(); });
    E(g, 4, -39, 8, 5.5); g.fillStyle = '#fff6e8'; g.fill(); E(g, 9, -41, 2, 1.6); g.fillStyle = '#3a2010'; g.fill();
    btnEye(g, -3, -46, 2.6, '#2a1a12', P); btnEye(g, 6, -46, 2.4, '#2a1a12', P); blush(g, -7, -41, 2.4); blush(g, 10, -40, 2.2); pmouth(g, 4, -36.5, 1.8, M.lunge, '#5a2a10');
    // 터번 + 별
    g.beginPath(); g.ellipse(1, -55, 12, 5, 0, Math.PI, TAU); g.fillStyle = '#ffe27a'; g.fill(); ball(g, 1, -57, 9, 5, '#f2c84a'); star(g, 1, -60, 3, '#ffffff');
    g.restore(); }
  // v2.0 31장 이끼 곰 쿨쿨 (숲이 깨어나면 사슴이 늙어 떠날까 봐 자장가로 모두 재우는 숲지기)
  function pbMossBear(g, P) { const M = mobPose(P); g.save(); g.scale(2.6, 2.6); g.translate(M.lunge ? 5 : 0, M.bob * 0.4 + Math.sin(M.ph * 0.5) * 0.6);
    plushBoot(g, -10, 0, '#4a6a3a', false); plushBoot(g, 11, 0, '#4a6a3a', true);
    ball(g, 0, -26, 24, 23, '#6a9a5a'); fuzz(g, 0, -26, 24, 23, '#8ac070', 16, 5, Math.PI * 1.05, Math.PI * 1.95);
    E(g, 0, -22, 15, 14); g.fillStyle = '#c8e0a8'; g.fill();
    // 배 시계
    E(g, 0, -22, 9, 9); g.fillStyle = '#fff8e0'; g.fill(); st(g, 1.2, '#7a5a30'); g.beginPath(); g.arc(0, -22, 9, 0, TAU); g.stroke();
    st(g, 1.2, '#4a3a20'); g.beginPath(); g.moveTo(0, -22); g.lineTo(0, -28); g.moveTo(0, -22); g.lineTo(4, -20); g.stroke();
    [[-14, -38, '#ff9ec4'], [12, -10, '#ffe27a'], [-18, -12, '#c8a0ff']].forEach(([x, y, c]) => { for (let q = 0; q < 5; q++) { E(g, x + Math.cos(q * 1.26) * 2.4, y + Math.sin(q * 1.26) * 2.4, 1.8, 1.8); g.fillStyle = c; g.fill(); } });
    const up = M.lunge ? 6 : 0; ball(g, -24, -24 + up, 8, 9, '#5a8a4a'); ball(g, 24, -24 - up, 8, 9, '#5a8a4a');
    ball(g, 0, -56, 17, 15, '#6a9a5a'); [[-13, -68], [13, -68]].forEach(([x, y]) => { ball(g, x, y, 5.5, 5.5, '#5a8a4a'); E(g, x, y, 2.6, 2.6); g.fillStyle = '#c8e0a8'; g.fill(); });
    E(g, 0, -51, 7.5, 5.5); g.fillStyle = '#c8e0a8'; g.fill(); E(g, 0, -54, 2.6, 2); g.fillStyle = '#3a2a1a'; g.fill();
    // 졸린 눈 (반달)
    st(g, 1.6, '#2a3a1a'); g.beginPath(); g.arc(-6, -59, 3, Math.PI * 0.1, Math.PI * 0.9); g.moveTo(9, -59); g.arc(6, -59, 3, Math.PI * 0.1, Math.PI * 0.9); g.stroke();
    blush(g, -10, -53, 2.8); blush(g, 10, -53, 2.8); pmouth(g, 0, -48, 1.6, M.lunge, '#2a3a1a');
    // 머리 위 버섯
    E(g, 6, -70, 6, 3.4); g.fillStyle = '#e8584a'; g.fill(); RR(g, 4.6, -70, 3, 5, 1.2); g.fillStyle = '#fff6e0'; g.fill(); [[4, -71], [8, -70.5]].forEach(([x, y]) => { E(g, x, y, 0.9, 0.9); g.fillStyle = '#fff'; g.fill(); });
    g.restore(); }
  // v2.0 32장 큰 뿔 사슴 새벽 (늙는 게, 변하는 게 무서워 숲의 모든 시계를 멈춘 사슴)
  function pbDawnDeer(g, P) { const M = mobPose(P); g.save(); g.scale(2.5, 2.5); g.translate(M.lunge ? 4 : 0, M.bob * 0.5);
    [[-14], [-7], [8], [15]].forEach(([x], k) => { const sw = P.moving ? Math.sin(M.ph + k * 1.6) * 2.6 : 0; RR(g, x - 2 + sw, -16, 4, 16, 1.8); g.fillStyle = '#c8b8e0'; g.fill(); ball(g, x + sw, 0, 2.6, 1.8, '#7a6a9a'); });
    ball(g, 0, -24, 20, 11, '#e0d4f0'); E(g, 2, -20, 12, 6); g.fillStyle = '#f8f2ff'; g.fill();
    for (let q = 0; q < 6; q++) { E(g, -10 + q * 4, -28 + (q % 2) * 4, 1.4, 1.4); g.fillStyle = '#ffffff'; g.fill(); }
    E(g, -19, -28, 4, 3); g.fillStyle = '#fff'; g.fill();
    g.beginPath(); g.moveTo(14, -30); g.quadraticCurveTo(20, -40, 20, -50); g.lineTo(27, -50); g.quadraticCurveTo(27, -36, 20, -26); g.closePath(); g.fillStyle = '#e0d4f0'; g.fill();
    ball(g, 25, -55, 8, 7, '#ece2f8'); E(g, 32, -52, 3.4, 2.8); g.fillStyle = '#d8c8e8'; g.fill(); E(g, 34, -53, 1.2, 1); g.fillStyle = '#5a4a7a'; g.fill();
    [[20, -61, -0.6], [28, -62, 0.6]].forEach(([x, y, r]) => { g.save(); g.translate(x, y); g.rotate(r); E(g, 0, 0, 2.2, 4); g.fillStyle = '#e0d4f0'; g.fill(); g.restore(); });
    // 큰 뿔 + 작은 시계들
    st(g, 2.2, '#c8a870'); g.lineCap = 'round'; g.beginPath(); g.moveTo(23, -62); g.quadraticCurveTo(14, -78, 8, -92); g.moveTo(17, -76); g.lineTo(6, -80); g.moveTo(12, -86); g.lineTo(18, -96); g.moveTo(28, -62); g.quadraticCurveTo(36, -78, 44, -90); g.moveTo(34, -74); g.lineTo(44, -76); g.moveTo(40, -84); g.lineTo(34, -96); g.stroke();
    [[6, -80], [18, -96], [44, -76], [34, -96], [8, -92]].forEach(([x, y], k) => { st(g, 0.8, '#c8a870'); g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 4); g.stroke(); E(g, x, y + 7, 3.2, 3.2); g.fillStyle = '#fff8e0'; g.fill(); st(g, 0.6, '#8a6a30'); g.beginPath(); g.arc(x, y + 7, 3.2, 0, TAU); g.moveTo(x, y + 7); g.lineTo(x, y + 5); g.moveTo(x, y + 7); g.lineTo(x + 1.6, y + 7); g.stroke(); });
    g.save(); g.globalCompositeOperation = 'lighter'; g.drawImage(softDot('#d8e8ff'), 0, -110, 56, 56); g.restore();
    btnEye(g, 24, -57, 2, '#3a2a5a', P); btnEye(g, 29, -57, 1.8, '#3a2a5a', P); blush(g, 22, -52, 2); blush(g, 31, -51, 1.8);
    g.restore(); }
  // v2.3 37장 녹슨 방울 기사 딸랑 (잊힌 방울 소리로 움직이는 빈 고양이 기사 갑옷 — 슬픈 날을 아무도 다시 안 보게 기억의 문을 지킴)
  function pbBellKnight(g, P) { const M = mobPose(P), sw = Math.sin(M.ph * 2) * 0.08; g.save(); g.scale(2.5, 2.5); g.translate(M.lunge ? 6 : 0, -2); g.rotate(sw * 0.4);
    E(g, -8, -2, 7, 3.5); g.fillStyle = '#7a6a5a'; g.fill(); E(g, 9, -2, 7, 3.5); g.fill();
    ball(g, 0, -22, 17, 19, '#a89a8a'); st(g, 1, 'rgba(255,255,255,.35)'); g.beginPath(); g.moveTo(-12, -30); g.lineTo(12, -30); g.moveTo(-14, -20); g.lineTo(14, -20); g.stroke();
    [[-6, -12], [8, -26], [-10, -28]].forEach(([x, y]) => { E(g, x, y, 3, 2); g.fillStyle = 'rgba(190,110,60,.55)'; g.fill(); }); // 녹
    // 고양이 투구 (귀 두 개)
    ball(g, 0, -46, 14, 12, '#b8aa98'); g.fillStyle = '#b8aa98'; g.beginPath(); g.moveTo(-12, -52); g.lineTo(-10, -66); g.lineTo(-2, -56); g.closePath(); g.fill(); g.beginPath(); g.moveTo(12, -52); g.lineTo(10, -66); g.lineTo(2, -56); g.closePath(); g.fill();
    g.fillStyle = '#2a2420'; RR(g, -9, -49, 18, 6, 3); g.fill(); // 투구 틈
    const gl = 0.6 + Math.sin(M.ph * 3) * 0.3; E(g, -4, -46, 2, 1.6); g.fillStyle = `rgba(255,220,120,${gl})`; g.fill(); E(g, 4, -46, 2, 1.6); g.fill();
    blush(g, -8, -40, 2.2); blush(g, 8, -40, 2.2);
    // 큰 방울 + 망토 조각
    E(g, 0, -34, 6, 6); g.fillStyle = '#ffd34d'; g.fill(); st(g, 1, '#a8781a'); g.beginPath(); g.moveTo(-5, -34); g.lineTo(5, -34); g.stroke(); E(g, 0, -31, 1.2, 1.2); g.fillStyle = '#5a3a10'; g.fill();
    g.save(); g.translate(18, -30); g.rotate(-0.3 + sw); g.fillStyle = '#d8d0c0'; g.fillRect(-1.5, -24, 3, 34); g.fillStyle = '#8a6a3a'; g.fillRect(-5, 6, 10, 3); g.restore();
    if (M.lunge) { g.save(); g.globalCompositeOperation = 'lighter'; g.drawImage(softDot('#ffe8a0'), -30, -70, 60, 60); g.restore(); }
    g.restore(); }
  // v2.3 38장 바둑이의 그림자 (친구를 끝까지 못 지킨 후회 — 얼룩 진돗개 기사 모양의 어두운 그림자)
  function pbBadukShadow(g, P) { const M = mobPose(P), fl = Math.sin(M.ph) * 2; g.save(); g.scale(2.6, 2.6); g.translate(M.lunge ? 5 : 0, -4 + fl * 0.4);
    g.save(); g.globalAlpha = 0.5; for (let q = 0; q < 5; q++) { E(g, -10 + q * 5, -2 - q * 0.6, 8 - q, 3); g.fillStyle = '#2a2440'; g.fill(); } g.restore();
    ball(g, 0, -24, 16, 18, '#3a3450'); E(g, 6, -18, 6, 5); g.fillStyle = '#5a5470'; g.fill(); E(g, -6, -28, 5, 4); g.fill(); // 얼룩
    // 머리 (진돗개 + 낡은 투구)
    ball(g, 2, -50, 13, 12, '#4a4460'); g.fillStyle = '#4a4460'; g.beginPath(); g.moveTo(-8, -58); g.lineTo(-6, -70); g.lineTo(1, -60); g.closePath(); g.fill(); g.beginPath(); g.moveTo(12, -58); g.lineTo(11, -70); g.lineTo(4, -60); g.closePath(); g.fill();
    g.fillStyle = '#6a6278'; g.beginPath(); g.arc(2, -54, 13, Math.PI * 1.05, Math.PI * 1.95); g.closePath(); g.fill(); g.fillStyle = '#c8b8ff'; g.fillRect(0, -70, 3, 8);
    E(g, 6, -45, 6, 4.4); g.fillStyle = '#5a5470'; g.fill(); E(g, 11, -46, 1.6, 1.2); g.fillStyle = '#1a1424'; g.fill();
    // 슬픈 눈 (보라 빛) + 눈물
    E(g, -2, -51, 2.4, 2.4); g.fillStyle = '#d8c8ff'; g.fill(); E(g, 5, -51, 2.2, 2.2); g.fill(); E(g, -2, -52, 0.8, 0.8); g.fillStyle = '#ffffff'; g.fill();
    g.fillStyle = 'rgba(180,200,255,.85)'; E(g, -3, -46 + Math.abs(Math.sin(M.ph)) * 3, 1, 1.8); g.fill(); blush(g, -6, -46, 2); blush(g, 9, -45.5, 1.8);
    // 금 간 검과 방패
    g.save(); g.translate(16, -28); g.rotate(-0.5); g.fillStyle = '#9a90b8'; g.fillRect(-1.6, -26, 3.2, 26); st(g, 0.8, '#2a2440'); g.beginPath(); g.moveTo(-1.6, -14); g.lineTo(1.6, -11); g.stroke(); g.restore();
    E(g, -14, -24, 7, 9); g.fillStyle = '#5a5470'; g.fill(); paw(g, -14, -24, 0.4, 'rgba(200,190,255,.7)');
    if (M.lunge) { g.save(); g.globalCompositeOperation = 'lighter'; g.drawImage(softDot('#b8a8ff'), -34, -80, 70, 70); g.restore(); }
    g.restore(); }
  // v2.2 35장 얼음 펭귄 선장 꽁꽁 (배가 꿈 안개 바다로 떠나 길을 잃을까 봐 항구를 꽁꽁 얼린 선장)
  function pbIcePenguin(g, P) { const M = mobPose(P), wd = Math.sin(M.ph * 2) * 0.12; g.save(); g.scale(2.5, 2.5); g.translate(M.lunge ? 5 : 0, -2); g.rotate(wd * 0.5);
    E(g, -6, -2, 7, 3); g.fillStyle = '#ffa63a'; g.fill(); E(g, 8, -2, 7, 3); g.fill();
    ball(g, 0, -24, 18, 24, '#2a3a5a'); E(g, 3, -20, 12, 18); g.fillStyle = '#f8fbff'; g.fill(); fuzz(g, 3, -20, 12, 18, '#ffffff', 10, 6, Math.PI * 0.2, Math.PI * 0.8);
    [[-1], [1]].forEach(([d]) => { g.save(); g.translate(d * 16, -28); g.rotate(d * (0.4 + wd)); E(g, 0, 8, 5, 12); g.fillStyle = '#22304a'; g.fill(); g.restore(); });
    // 선장 모자 + 단추 코트 깃
    g.fillStyle = '#1a2440'; g.beginPath(); g.moveTo(-16, -46); g.lineTo(18, -46); g.lineTo(14, -56); g.quadraticCurveTo(0, -64, -12, -56); g.closePath(); g.fill(); E(g, 1, -46, 19, 3); g.fillStyle = '#2a3a60'; g.fill();
    star(g, 1, -53, 3.2, '#ffd34d'); E(g, 3, -14, 1.6, 1.6); g.fillStyle = '#ffd34d'; g.fill(); E(g, 3, -6, 1.6, 1.6); g.fill();
    // 목도리
    g.fillStyle = "#e85a5a"; g.fillRect(-14, -34, 30, 6); g.fillRect(8, -32, 5, 12);
    btnEye(g, -3, -40, 2.5, '#1a1a2a', P); btnEye(g, 8, -40, 2.4, '#1a1a2a', P); blush(g, -7, -35, 2.4); blush(g, 12, -34.5, 2.2);
    g.beginPath(); g.moveTo(1, -38); g.lineTo(10, -36); g.lineTo(1, -33); g.closePath(); g.fillStyle = '#ffa63a'; g.fill();
    if (M.lunge) { g.save(); g.globalCompositeOperation = 'lighter'; g.drawImage(softDot('#cfefff'), -30, -60, 60, 60); g.restore(); }
    g.restore(); }
  // v2.2 36장 꿈꾸는 노래 고래 나루 (노래가 아이들을 꿈 따라 떠나게 할까 봐 노래를 멈춘 할머니 고래)
  function pbSongWhale(g, P) { const M = mobPose(P); g.save(); g.scale(2.6, 2.6); g.translate(M.lunge ? 4 : 0, -18 + Math.sin(M.ph) * 2.5);
    // 꼬리
    g.save(); g.translate(-38, -14); g.rotate(Math.sin(M.ph * 1.5) * 0.25); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-10, -4, -20, -16); g.quadraticCurveTo(-14, -2, -22, 8); g.quadraticCurveTo(-8, 4, 0, 6); g.closePath(); g.fillStyle = '#6a7ac8'; g.fill(); g.restore();
    ball(g, 0, -16, 40, 22, '#7a8ad8'); E(g, 4, -6, 32, 11); g.fillStyle = '#e8ecff'; g.fill();
    st(g, 1.2, 'rgba(160,170,230,.9)'); for (let q = 0; q < 5; q++) { g.beginPath(); g.moveTo(-14 + q * 8, -2); g.lineTo(-12 + q * 8, 4); g.stroke(); }
    // 나이트캡 + 별
    g.fillStyle = '#b8a8f0'; g.beginPath(); g.moveTo(8, -34); g.quadraticCurveTo(22, -52, 40, -44); g.quadraticCurveTo(28, -40, 30, -30); g.closePath(); g.fill(); E(g, 40, -44, 3.4, 3.4); g.fillStyle = '#ffffff'; g.fill();
    star(g, -12, -26, 2.6, '#fff6a0'); star(g, -22, -18, 1.8, '#fff6a0');
    // 물 뿜기 (음표)
    g.fillStyle = 'rgba(200,230,255,.85)'; E(g, 2, -42 - Math.abs(Math.sin(M.ph)) * 4, 3, 5); g.fill();
    // 졸린 눈 (반달) + 볼터치 + 지느러미
    st(g, 1.6, '#2a2a5a'); g.beginPath(); g.arc(18, -18, 3, Math.PI * 0.1, Math.PI * 0.9); g.stroke(); g.beginPath(); g.arc(28, -17, 2.6, Math.PI * 0.1, Math.PI * 0.9); g.stroke();
    blush(g, 15, -12, 2.6); blush(g, 31, -11.5, 2.2); g.beginPath(); g.arc(24, -8, 2.4, 0.1, Math.PI - 0.1); st(g, 1.2, '#4a3a6a'); g.stroke();
    g.save(); g.translate(2, -2); g.rotate(0.5 + Math.sin(M.ph * 2) * 0.2); E(g, 0, 8, 5, 11); g.fillStyle = '#5a6ab8'; g.fill(); g.restore();
    g.restore(); }
  // v2.1 33장 천둥새 우레 (아이들이 땅으로 날아가 돌아오지 않을까 봐 둥지 하늘을 천둥으로 막는 문지기)
  function pbThunderbird(g, P) { const M = mobPose(P), fl = Math.sin(M.ph * 2) * 0.35; g.save(); g.scale(2.5, 2.5); g.translate(M.lunge ? 5 : 0, -6 + Math.sin(M.ph) * 2);
    [[-1], [1]].forEach(([d]) => { g.save(); g.translate(d * 4, -30); g.rotate(d * (0.5 + fl)); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(d * 22, -26, d * 40, -18); g.quadraticCurveTo(d * 34, -10, d * 38, -4); g.quadraticCurveTo(d * 28, -2, d * 30, 4); g.quadraticCurveTo(d * 16, 2, 0, 8); g.closePath(); g.fillStyle = lgr(g, '#ffe88a', '#e0a830', 0, -26, 0, 8); g.fill(); stitch(g, () => { g.moveTo(d * 6, 0); g.quadraticCurveTo(d * 20, -14, d * 34, -12); }, 'rgba(255,255,255,.6)'); g.restore(); });
    ball(g, 0, -26, 18, 16, '#ffd84a'); fuzz(g, 0, -26, 18, 16, '#fff0a0', 14, 9, Math.PI * 1.05, Math.PI * 1.95); E(g, 2, -20, 11, 9); g.fillStyle = '#fff6d0'; g.fill();
    // 번개 볏
    g.fillStyle = '#5ab0ff'; g.beginPath(); g.moveTo(-2, -42); g.lineTo(4, -54); g.lineTo(3, -46); g.lineTo(10, -50); g.lineTo(5, -40); g.closePath(); g.fill();
    btnEye(g, -3, -30, 2.6, '#2a1a12', P); btnEye(g, 7, -30, 2.4, '#2a1a12', P); blush(g, -7, -25, 2.4); blush(g, 11, -24.5, 2.2);
    g.beginPath(); g.moveTo(2, -27); g.lineTo(9, -24); g.lineTo(2, -21); g.closePath(); g.fillStyle = '#ff9a3a'; g.fill();
    E(g, -5, -6, 3, 2); g.fillStyle = '#e8a030'; g.fill(); E(g, 6, -6, 3, 2); g.fill();
    if (M.lunge) { g.save(); g.globalCompositeOperation = 'lighter'; g.drawImage(softDot('#bfe6ff'), -30, -60, 60, 60); g.restore(); }
    g.restore(); }
  // v2.1 34장 바람 장로 용 하늬 (땅으로 내려간 일족은 모두 사라졌다고 믿는 미르의 할아버지)
  function pbWindElder(g, P) { const M = mobPose(P); g.save(); g.scale(2.6, 2.6); g.translate(M.lunge ? 4 : 0, -4 + Math.sin(M.ph) * 1.5);
    // 구름 꼬리
    for (let q = 0; q < 4; q++) { ball(g, -22 - q * 7, -10 + Math.sin(M.ph + q) * 2, 7 - q, 6 - q * 0.8, '#c8e0f0'); }
    // 날개
    g.save(); g.translate(-4, -30); g.rotate(-0.3 + Math.sin(M.ph * 2) * 0.12); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-12, -28, -30, -30); g.quadraticCurveTo(-24, -18, -28, -10); g.quadraticCurveTo(-14, -8, 0, 6); g.closePath(); g.fillStyle = lgr(g, '#e8f4ff', '#9ac8e8', 0, -30, 0, 6); g.fill(); stitch(g, () => { g.moveTo(-4, 0); g.quadraticCurveTo(-14, -18, -26, -26); }, 'rgba(255,255,255,.7)'); g.restore();
    ball(g, 0, -20, 20, 15, '#b8d8f0'); E(g, 4, -14, 12, 8); g.fillStyle = '#eaf4ff'; g.fill();
    [[-10], [-2], [8], [14]].forEach(([x]) => { ball(g, x, -3, 3.4, 3, '#a0c4e0'); });
    // 목과 머리
    g.beginPath(); g.moveTo(10, -28); g.quadraticCurveTo(18, -40, 18, -50); g.lineTo(26, -50); g.quadraticCurveTo(26, -36, 18, -24); g.closePath(); g.fillStyle = '#b8d8f0'; g.fill();
    ball(g, 24, -56, 11, 9, '#c8e4f8'); E(g, 33, -53, 5, 4); g.fillStyle = '#dceeff'; g.fill(); E(g, 35, -54, 1, 0.8); g.fillStyle = '#4a6a8a'; g.fill();
    // 뿔과 긴 수염 (할아버지)
    st(g, 2, '#e8d8a8'); g.lineCap = 'round'; g.beginPath(); g.moveTo(18, -63); g.quadraticCurveTo(12, -72, 14, -78); g.moveTo(24, -64); g.quadraticCurveTo(22, -74, 26, -80); g.stroke();
    st(g, 1.6, '#ffffff'); g.beginPath(); g.moveTo(34, -51); g.quadraticCurveTo(42, -46, 40, -34 + Math.sin(M.ph) * 2); g.moveTo(32, -50); g.quadraticCurveTo(36, -40, 32, -30 + Math.sin(M.ph + 1) * 2); g.stroke();
    // 하얀 눈썹 + 단추 눈
    E(g, 22, -62, 4.4, 1.6); g.fillStyle = '#ffffff'; g.fill(); E(g, 29, -61.5, 3.6, 1.4); g.fill();
    btnEye(g, 22, -58, 2.2, '#2a3a5a', P); btnEye(g, 29, -58, 2, '#2a3a5a', P); blush(g, 20, -53, 2.2); blush(g, 31, -52.5, 2);
    g.restore(); }
  // 26장 그림자 아이 노을 (무지개를 처음 본 회색 나라의 아이)
  function pbShadowChild(g, P) { const ph = ((P.walk || 0) + (P.breathe || 0)) * TAU, atk = P.atk == null ? -1 : P.atk, lun = atk >= 0.35 && atk < 0.7; g.save(); g.scale(2.7, 2.7); g.translate(lun ? 4 : 0, Math.sin(ph) * 1.4);
    plushBoot(g, -5, 0, '#6a6070', false); plushBoot(g, 6, 0, '#6a6070', true);
    g.beginPath(); g.moveTo(-14, -6); g.quadraticCurveTo(-18, -30, 0, -34); g.quadraticCurveTo(18, -30, 14, -6); g.closePath(); g.fillStyle = lgr(g, '#7a7088', '#4a4058', 0, -34, 0, -6); g.fill();
    stitch(g, () => { g.moveTo(-11, -8); g.quadraticCurveTo(0, -4, 11, -8); }, 'rgba(255,255,255,.5)');
    ball(g, 1, -46, 15, 14, '#8a8098'); g.beginPath(); g.moveTo(-14, -46); g.quadraticCurveTo(-16, -66, 1, -66); g.quadraticCurveTo(18, -66, 16, -46); g.quadraticCurveTo(12, -58, 1, -58); g.quadraticCurveTo(-10, -58, -14, -46); g.fillStyle = '#5a5068'; g.fill();
    E(g, 1, -45, 10, 9); g.fillStyle = '#e8e0f0'; g.fill();
    if (P.blink) { st(g, 1.4, '#3a3048'); g.beginPath(); g.arc(-3, -46, 2.6, Math.PI * 1.1, Math.PI * 1.9); g.moveTo(7.6, -46); g.arc(5, -46, 2.6, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
    else { eyeKit(g, -3, -46, 3, 3.8, { sparkle: true, iris: 'rgba(80,70,110,.9)' }); eyeKit(g, 5, -46, 2.8, 3.6, { sparkle: true, iris: 'rgba(80,70,110,.9)' }); }
    blush(g, -6, -41, 2.6); blush(g, 8, -41, 2.6); pmouth(g, 1, -40, 2, lun, '#3a3048');
    // 무지개 한 조각을 꼭 쥔 손
    g.save(); g.translate(14, -22); ['#ff7a8a', '#ffe06a', '#6ac0ff'].forEach((c, k) => { g.strokeStyle = c; g.lineWidth = 2; g.beginPath(); g.arc(4, 4, 8 - k * 2.2, Math.PI, TAU); g.stroke(); }); ball(g, 0, 4, 3.4, 3.4, '#8a8098'); g.restore();
    g.restore(); }
  function drawStaff(g, K, atk, bob) {
    const up = atk >= 0 && atk < 0.6 ? Math.sin(atk / 0.6 * Math.PI) : 0;
    g.save(); g.translate(20, -11 + bob - up * 3); g.rotate(0.95 - up * 0.5);
    RR(g, -1.4, -30, 2.8, 40, 1.2); g.fillStyle = lgr(g, '#9b6b45', '#5e3d26', -1, 0, 1, 0); g.fill();
    st(g, 0.8, '#ffd34d'); g.beginPath(); g.moveTo(-1.6, -24); g.lineTo(1.6, -22); g.moveTo(-1.6, -20); g.lineTo(1.6, -18); g.stroke();
    const gl = g.createRadialGradient(0, -34, 0, 0, -34, 11 + up * 5); gl.addColorStop(0, 'rgba(200,170,255,.95)'); gl.addColorStop(1, 'rgba(160,120,255,0)');
    g.fillStyle = gl; E(g, 0, -34, 11 + up * 5, 11 + up * 5); g.fill();
    g.beginPath(); g.moveTo(0, -42); g.lineTo(4.4, -34); g.lineTo(0, -27.5); g.lineTo(-4.4, -34); g.closePath(); g.fillStyle = lgr(g, '#f3e5ff', '#8a55ff', -3, -41, 3, -28); g.fill();
    st(g, 0.6, 'rgba(255,255,255,.9)'); g.beginPath(); g.moveTo(0, -41); g.lineTo(-2.4, -34); g.lineTo(0, -29); g.stroke();
    g.restore(); fe(g, 20, -11 + bob - up * 3, 3.9, 3.4, K.c2);
  }

  /* ---------- 졸병 (측면) ---------- */
  function slimeBody(g, P, col, sc, king) {
    const ph = (P.moving ? P.walk : P.breathe || 0) * TAU, atk = P.atk == null ? -1 : P.atk;
    const lunge = atk >= 0.35 && atk < 0.7 ? 1 : 0, sq = 1 + Math.sin(ph) * 0.1 - lunge * 0.12;
    g.save(); g.scale(sc, sc); g.scale(1 / sq + lunge * 0.15, sq);
    g.beginPath(); g.moveTo(-21, 0); g.bezierCurveTo(-25, -22, -12, -35, 0, -35); g.bezierCurveTo(16, -35, 26, -22, 22, 0);
    g.quadraticCurveTo(15, 4, 10, 0); g.quadraticCurveTo(3, 5, -3, 0); g.quadraticCurveTo(-12, 4, -21, 0); g.closePath();
    const gr = g.createLinearGradient(-10, -35, 6, 4); gr.addColorStop(0, LI(col, 0.5)); gr.addColorStop(0.5, col); gr.addColorStop(1, '#4a2470'); g.fillStyle = gr; g.fill();
    const core = g.createRadialGradient(-4, -12, 0, -4, -12, 10); core.addColorStop(0, 'rgba(220,140,255,.75)'); core.addColorStop(1, 'rgba(160,60,230,0)'); g.fillStyle = core; E(g, -4, -12, 10, 9); g.fill();
    g.globalAlpha = 0.35; g.fillStyle = '#ffffff'; [[-13, -9, 2.4], [-8, -4, 1.4], [14, -6, 1.6], [-16, -18, 1.2]].forEach(([a, b, r]) => { E(g, a, b, r, r); g.fill(); }); g.globalAlpha = 1;
    E(g, -9, -25, 7, 3.8, -0.5); g.fillStyle = 'rgba(255,255,255,.75)'; g.fill(); E(g, -15, -17, 1.8, 1.8); g.fill();
    st(g, 1.2, 'rgba(255,255,255,.5)'); g.beginPath(); g.ellipse(0, -16, 19, 17, 0, Math.PI * 1.15, Math.PI * 1.5); g.stroke();
    if (king) {
      g.fillStyle = lgr(g, '#fff0a0', '#d9a21b', 0, -50, 0, -34);
      g.beginPath(); g.moveTo(-12, -33); g.lineTo(-13, -46); g.lineTo(-6, -40); g.lineTo(-1, -50); g.lineTo(4, -40); g.lineTo(11, -46); g.lineTo(10, -33); g.closePath(); g.fill();
      st(g, 1, 'rgba(120,70,0,.6)'); g.stroke(); E(g, -1, -38, 2.4, 2.4); g.fillStyle = '#c56bff'; g.fill();
      [[-13, -46], [-1, -50], [11, -46]].forEach(([x, y]) => { E(g, x, y, 1.6, 1.6); g.fillStyle = '#ff5252'; g.fill(); });
    }
    VEYE(g, 3, -19, 4.6, 5.6, '#ffd23f', null, P); VEYE(g, 14, -18, 4.2, 5.2, '#ffd23f', null, P);
    g.beginPath(); g.moveTo(5, -9); g.quadraticCurveTo(10, -3 - lunge * 4, 16, -9); g.quadraticCurveTo(10, -6, 5, -9); g.closePath(); g.fillStyle = '#2a0e2e'; g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(12, -8.4); g.lineTo(14.4, -8.6); g.lineTo(13.2, -5.6); g.fill();
    E(g, 9, -27, 3, 2); g.fillStyle = 'rgba(255,255,255,.8)'; g.fill();
    shadowMark(g, -2, -26, 0.8);
    g.fillStyle = '#5a2a80'; E(g, -14, 3, 2, 3.6); g.fill(); E(g, 15, 2.5, 1.6, 3); g.fill();
    g.restore();
  }
  function paintSlime(g, P) { slimeBody(g, P, '#7fbf3a', 1, false); }
  function paintKkuruk(g, P) { feltSlime(g, P, '#5fd3b0', 2.9, true); }
  function paintRat(g, P) {
    const ph = (P.moving ? P.walk : 0) * TAU, b = P.moving ? Math.sin(ph * 2) * 1.2 : 0, atk = P.atk == null ? -1 : P.atk;
    const lunge = atk >= 0.35 && atk < 0.7 ? 5 : atk >= 0 && atk < 0.35 ? -2 : 0;
    st(g, 2.6, '#c98aa6'); g.beginPath(); g.moveTo(-12, -8); g.bezierCurveTo(-28, -4 + b, -34, -24, -24, -30); g.stroke();
    st(g, 0.8, 'rgba(120,50,80,.6)'); for (let i = 0; i < 5; i++) { const t = i / 5; g.beginPath(); g.moveTo(-14 - t * 16, -8 - t * 14 + b * 0.5); g.lineTo(-13 - t * 16, -10 - t * 14 + b * 0.5); g.stroke(); }
    for (const [x, p] of [[-8, 0], [6, 0.5]]) { const sx = P.moving ? Math.sin(ph + p * TAU) * 3 : 0; RR(g, x + sx, -6, 4.5, 7, 2); g.fillStyle = '#3e3846'; g.fill(); E(g, x + sx + 3, 1, 3.4, 1.6); g.fillStyle = '#e8a6b8'; g.fill(); }
    fe(g, -1, -11 + b, 15, 9.5, '#6f6878', 0, 0.3, 0.3);
    hairs(g, -2, -12 + b, 12, 7, 14, 'rgba(40,30,50,.4)', 31);
    fluff(g, -1, -11 + b, 15, 9.5, Math.PI * 1.1, Math.PI * 1.7, 5, 3, '#6f6878');
    g.beginPath(); g.moveTo(-15, -17 + b); g.quadraticCurveTo(-2, -26 + b, 9, -19 + b); g.lineTo(7, -6 + b); g.lineTo(3, -9 + b); g.lineTo(-1, -4 + b); g.lineTo(-5, -8 + b); g.lineTo(-9, -3 + b); g.lineTo(-13, -8 + b); g.closePath();
    g.fillStyle = lgr(g, '#7b4fa0', '#2d1840', 0, -26, 0, -3); g.fill(); shadowMark(g, -3, -15 + b, 0.7);
    st(g, 0.8, 'rgba(230,180,255,.35)'); g.beginPath(); g.moveTo(-8, -20 + b); g.lineTo(-6, -8 + b); g.moveTo(1, -21 + b); g.lineTo(2, -9 + b); g.stroke();
    g.save(); g.translate(11 + lunge, -10 + b); g.rotate(atk >= 0.35 && atk < 0.7 ? 1.3 : 0.4);
    RR(g, -1, -2, 4, 5, 1.5); g.fillStyle = '#5b3a22'; g.fill();
    g.beginPath(); g.moveTo(0, -2); g.lineTo(3, -2); g.lineTo(2, -15); g.closePath(); g.fillStyle = lgr(g, '#e8dcc4', '#7a5a30', 0, -15, 3, -2); g.fill();
    g.fillStyle = 'rgba(150,60,20,.5)'; E(g, 1.8, -8, 0.9, 1.6); g.fill();
    g.restore();
    g.save(); g.translate(12 + lunge * 0.6, -16 + b); g.scale(1.25, 1.25);
    fe(g, -5, -8, 4, 5, '#7d7586'); fe(g, -5, -8, 2.2, 3, '#d08f9b');
    fe(g, 0, 0, 9, 8, '#7d7586', 0, 0.28, 0.25);
    g.beginPath(); g.moveTo(4, -5); g.quadraticCurveTo(16, -3, 19, 2); g.quadraticCurveTo(15, 6, 5, 5); g.closePath(); g.fillStyle = rg(g, '#8a8293', 11, 1, 9, 0.3, 0.2); g.fill();
    E(g, 19, 1.5, 1.8, 1.5); g.fillStyle = '#e88aa0'; g.fill();
    g.beginPath(); g.moveTo(-6, -6); g.quadraticCurveTo(4, -11, 12, -4); g.lineTo(12, 2); g.quadraticCurveTo(7, 5, 3, 2); g.quadraticCurveTo(-3, 4, -6, -1); g.closePath();
    g.fillStyle = lgr(g, '#fffaf0', '#cfc5b0', 0, -10, 0, 3); g.fill();
    st(g, 0.8, rgba(OUT, 0.55)); g.beginPath(); g.moveTo(0, -8); g.lineTo(2, -5); g.lineTo(1, -2); g.moveTo(9, -6); g.lineTo(8, -3); g.stroke();
    E(g, 5.5, -2.5, 3.4, 3.6); g.fillStyle = '#1a0f12'; g.fill();
    VEYE(g, 5.8, -2.4, 2.8, 3.1, '#ff3b30', null, P);
    g.fillStyle = '#fff'; RR(g, 15, 4.5, 2, 3.2, 0.6); g.fill();
    st(g, 0.6, 'rgba(255,255,255,.65)'); g.beginPath(); g.moveTo(17, 2); g.lineTo(25, 0); g.moveTo(17, 3.5); g.lineTo(25, 5); g.stroke();
    g.restore();
  }
  function paintToad(g, P) {
    const atk = P.atk == null ? -1 : P.atk, puff = atk >= 0 && atk < 0.5 ? Math.sin(atk / 0.5 * Math.PI) : 0;
    const hop = P.moving ? Math.max(0, Math.sin(P.walk * TAU)) * -4 : 0;
    g.save(); g.translate(0, hop);
    g.beginPath(); g.moveTo(-18, -2); g.quadraticCurveTo(-24, -8, -14, -10); g.lineTo(-6, -3); g.closePath(); g.fillStyle = '#3c5a26'; g.fill();
    fe(g, 12, -2, 6, 4, '#40602a');
    g.beginPath(); g.moveTo(-18, -4); g.bezierCurveTo(-20, -24, -2, -30, 12, -24); g.bezierCurveTo(22, -20, 24, -6, 18, -1); g.quadraticCurveTo(0, 2, -18, -4); g.closePath();
    g.fillStyle = rg(g, '#5c8a35', -2, -16, 22, 0.3, 0.32); g.fill();
    g.beginPath(); g.moveTo(-4, -4); g.quadraticCurveTo(10, 2, 19, -3); g.quadraticCurveTo(16, -10, 2, -9); g.closePath(); g.fillStyle = rg(g, '#d4df98', 8, -5, 12, 0.3, 0.1); g.fill();
    if (puff) fe(g, 16, -5, 6 + puff * 5, 5.5 + puff * 4, '#e0b2ee');
    g.fillStyle = '#8a4fb0'; [[-10, -20, 3.4], [-14, -11, 2.4], [-3, -24, 2], [-6, -13, 1.8], [4, -21, 1.6]].forEach(([x, y, r]) => { E(g, x, y, r, r); g.fill(); g.fillStyle = 'rgba(255,220,255,.5)'; E(g, x - r * 0.3, y - r * 0.3, r * 0.35, r * 0.3); g.fill(); g.fillStyle = '#8a4fb0'; });
    st(g, 1.2, '#efe6d0'); g.beginPath(); g.arc(6, -12, 11, 0.7, 2.1); g.stroke();
    [[2, -2.4], [10, -2.6]].forEach(([x, y]) => bone(g, x, y, 5, '#f4ecd8', 1.2));
    [['#7e57c2', -12, -36, -0.6], ['#43a047', -7, -38, -0.3], ['#7e57c2', -2, -37, 0.05]].forEach(([c, x, y, r]) => { g.save(); g.translate(x, y + 10); g.rotate(r); E(g, 0, -6, 2.6, 8.5); g.fillStyle = lgr(g, LI(c, 0.3), DK(c, 0.2), 0, -14, 0, 2); g.fill(); st(g, 0.5, 'rgba(255,255,255,.5)'); g.beginPath(); g.moveTo(0, 1); g.lineTo(0, -13); g.stroke(); g.restore(); });
    shadowMark(g, -8, -26, 0.7);
    fe(g, 8, -25, 7.5, 7.5, '#5c8a35', 0, 0.35, 0.3);
    VEYE(g, 9, -25.5, 5, 5.4, '#ffb300', null, P);
    st(g, 1.8); g.beginPath(); g.moveTo(1, -10); g.quadraticCurveTo(14, -8 - puff * 3, 22, -13); g.stroke();
    g.beginPath(); g.moveTo(17, -11.5); g.lineTo(18.6, -11.8); g.lineTo(17.8, -9.2); g.fillStyle = '#fff'; g.fill();
    E(g, 21.5, -9.5, 1.5, 2.4); g.fillStyle = '#9ccc65'; g.fill();
    E(g, 20, -16, 1, 0.8); g.fillStyle = '#20301f'; g.fill();
    g.restore();
  }
  function paintBat(g, P) {
    const ph = (P.walk || 0) * TAU, fl = Math.sin(ph * 2), yy = -62 + Math.sin(ph) * 3, atk = P.atk == null ? -1 : P.atk;
    const dive = atk >= 0.35 && atk < 0.7 ? 6 : 0;
    g.save(); g.translate(dive, yy + dive * 0.6);
    const wing = (far) => {
      g.save(); if (far) g.translate(-4, -2);
      const f = far ? -fl : fl;
      g.beginPath(); g.moveTo(-2, -3); g.quadraticCurveTo(-12, -20 * f - 10, -30, -14 * f - 6); g.lineTo(-27, -4 * f + 1); g.quadraticCurveTo(-23, 1, -19, 4); g.quadraticCurveTo(-15, -1, -11, 5); g.quadraticCurveTo(-6, 0, -2, 4); g.closePath();
      g.fillStyle = far ? lgr(g, '#4d3070', '#1c1030', 0, -16, 0, 6) : lgr(g, '#8a58b8', '#2a1840', 0, -16, 0, 6); g.fill();
      st(g, 1, far ? 'rgba(200,150,255,.25)' : 'rgba(230,180,255,.5)'); g.beginPath(); g.moveTo(-3, -1); g.lineTo(-28, -10 * f - 3); g.moveTo(-6, 0); g.lineTo(-19, 4); g.moveTo(-6, 0); g.lineTo(-11, 5); g.stroke();
      g.restore();
    };
    wing(true);
    g.beginPath(); g.moveTo(0, -7); g.lineTo(-1, -21); g.lineTo(5, -9); g.closePath(); g.fillStyle = '#2e1f45'; g.fill();
    g.beginPath(); g.moveTo(3, -8); g.lineTo(5, -22); g.lineTo(9, -7); g.closePath(); g.fillStyle = '#3a2652'; g.fill();
    g.fillStyle = '#c47ab0'; g.beginPath(); g.moveTo(4.5, -9); g.lineTo(5.5, -17); g.lineTo(7.6, -8.5); g.fill();
    fe(g, 0, 1, 11.5, 10.5, '#3d2c55', 0, 0.35, 0.3);
    fluff(g, 0, 1, 11.5, 10.5, Math.PI * 0.3, Math.PI * 0.9, 5, 3, '#3d2c55');
    g.beginPath(); g.moveTo(7, -4); g.quadraticCurveTo(15, -2, 14, 3); g.quadraticCurveTo(10, 6, 6, 4); g.closePath(); g.fillStyle = '#4b3666'; g.fill();
    E(g, 14, 0.5, 1.4, 1.2); g.fillStyle = '#1a0f22'; g.fill();
    fe(g, -1, 7, 6, 4, '#5b4478'); shadowMark(g, -1, 7, 0.55);
    VEYE(g, 6, -2.5, 3.8, 4.2, '#ff3b30', null, P);
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(9.5, 4.2); g.lineTo(11.5, 4.4); g.lineTo(10.6, 8); g.fill();
    wing(false);
    g.restore();
  }
  function paintCrab(g, P) {
    const ph = (P.moving ? P.walk : 0) * TAU, atk = P.atk == null ? -1 : P.atk, snap = atk >= 0.35 && atk < 0.7 ? 1 : 0;
    const b = P.moving ? Math.abs(Math.sin(ph * 2)) * -1.5 : 0;
    for (let i = 0; i < 3; i++) { const lx = -10 + i * 7, s = P.moving ? Math.sin(ph + i * 2) * 3 : 0; st(g, 2.4, '#b8452f'); g.beginPath(); g.moveTo(lx, -9); g.lineTo(lx - 4 + s, -13); g.lineTo(lx - 6 + s, 0); g.stroke(); }
    g.beginPath(); g.moveTo(-17, -6 + b); g.quadraticCurveTo(-16, -26 + b, 2, -26 + b); g.quadraticCurveTo(18, -25 + b, 17, -7 + b); g.quadraticCurveTo(0, -1 + b, -17, -6 + b); g.closePath();
    g.fillStyle = rg(g, '#e86a4a', -2, -16 + b, 20, 0.35, 0.3); g.fill();
    g.fillStyle = '#ffd9c4'; [[-10, -22], [-2, -25], [6, -24], [12, -19]].forEach(([x, y]) => { g.beginPath(); g.moveTo(x - 2.4, y + 2 + b); g.lineTo(x, y - 5 + b); g.lineTo(x + 2.4, y + 2 + b); g.fill(); });
    st(g, 1, 'rgba(255,255,255,.5)'); g.beginPath(); g.ellipse(-2, -15 + b, 13, 8, 0, Math.PI * 1.1, Math.PI * 1.6); g.stroke();
    shadowMark(g, -4, -14 + b, 0.7);
    st(g, 2, '#b8452f'); g.beginPath(); g.moveTo(9, -22 + b); g.lineTo(11, -32 + b); g.stroke();
    st(g, 2, '#b8452f'); g.beginPath(); g.moveTo(2, -24 + b); g.lineTo(2, -33 + b); g.stroke();
    fe(g, 2, -34 + b, 4, 4, '#e86a4a'); VEYE(g, 2.6, -34.4 + b, 2.8, 3.2, '#ffd23f', null, P);
    fe(g, 11, -33 + b, 4.2, 4.2, '#e86a4a'); VEYE(g, 11.6, -33.4 + b, 3, 3.4, '#ffd23f', null, P);
    g.save(); g.translate(17, -12 + b); g.rotate(-0.3);
    st(g, 3.4, '#c9563c'); g.beginPath(); g.moveTo(0, 0); g.lineTo(6, -4); g.stroke();
    g.translate(8, -5); fe(g, 3, 0, 7, 5.5, '#e86a4a', 0, 0.35, 0.3);
    const op = snap ? 0.05 : 0.5;
    g.save(); g.rotate(-op); g.beginPath(); g.moveTo(7, -2); g.quadraticCurveTo(15, -6, 17, -1); g.quadraticCurveTo(12, -2, 8, 1); g.closePath(); g.fillStyle = '#e86a4a'; g.fill(); g.restore();
    g.save(); g.rotate(op); g.beginPath(); g.moveTo(7, 2); g.quadraticCurveTo(15, 6, 17, 1); g.quadraticCurveTo(12, 2, 8, -1); g.closePath(); g.fillStyle = '#c9563c'; g.fill(); g.restore();
    g.restore();
  }
  function paintGolemBase(g, P, pal) {
    const ph = (P.moving ? P.walk : 0) * TAU, b = P.moving ? Math.sin(ph * 2) * 1.5 : Math.sin((P.breathe || 0) * TAU) * 0.6, atk = P.atk == null ? -1 : P.atk;
    const punch = atk >= 0.35 && atk < 0.7 ? 1 : atk >= 0 && atk < 0.35 ? -0.4 : 0;
    const stone = (x, y, w, h, r, c) => {
      RR(g, x, y, w, h, r); g.fillStyle = lgr(g, LI(c, pal.ice ? 0.45 : 0.22), DK(c, 0.3), x, y, x + w * 0.4, y + h); g.fill();
      g.save(); RR(g, x, y, w, h, r); g.clip();
      if (pal.ice) { g.fillStyle = 'rgba(255,255,255,.38)'; g.beginPath(); g.moveTo(x, y + h * 0.3); g.lineTo(x + w * 0.5, y); g.lineTo(x + w * 0.7, y); g.lineTo(x, y + h * 0.6); g.fill(); }
      else { g.fillStyle = 'rgba(0,0,0,.12)'; for (let i = 0; i < 4; i++) { E(g, x + w * ((i * 37) % 100) / 100, y + h * ((i * 61) % 100) / 100, 1.6, 1.2); g.fill(); } }
      g.restore();
      st(g, 1, 'rgba(255,255,255,.35)'); g.beginPath(); g.moveTo(x + r, y + 1); g.lineTo(x + w - r, y + 1); g.stroke();
    };
    g.save(); g.translate(-12, -52 + b); g.rotate(-0.15 - punch * 0.3); stone(-6, 0, 12, 26, 5, DK(pal.c1, 0.12)); stone(-8, 22, 16, 13, 6, DK(pal.c2, 0.12)); g.restore();
    for (const [x, p] of [[-15, 0], [5, 0.5]]) { const lift = P.moving ? Math.max(0, Math.sin(ph + p * TAU)) * -3 : 0; stone(x, -20 + lift, 12, 20, 4, pal.c2); }
    stone(-23, -62 + b, 46, 46, 12, pal.c1);
    if (pal.moss) { fe(g, -6, -61 + b, 14, 4.5, '#5f8f45'); fe(g, 12, -60 + b, 6, 3, '#6fa04f'); g.fillStyle = '#e5533d'; E(g, -10, -64 + b, 2.4, 1.6); g.fill(); }
    const rc = pal.rune;
    g.save(); g.globalCompositeOperation = 'lighter'; st(g, 2.4, rgba(rc, 0.95)); g.beginPath(); g.moveTo(-14, -46 + b); g.lineTo(-6, -40 + b); g.lineTo(-9, -30 + b); g.moveTo(10, -54 + b); g.lineTo(14, -44 + b); g.lineTo(9, -36 + b); g.moveTo(-2, -26 + b); g.lineTo(3, -22 + b); g.stroke(); g.restore();
    shadowMark(g, 1, -40 + b, 1.2);
    stone(-12, -84 + b, 32, 24, 9, LI(pal.c1, 0.08));
    if (pal.crown) { g.fillStyle = lgr(g, '#ffffff', '#8fd3ff', 0, -102, 0, -84); [[-8, -84], [0, -84], [8, -84], [15, -84]].forEach(([x, y], i) => { g.beginPath(); g.moveTo(x - 3.6, y + b); g.lineTo(x - 1, y - (i % 2 ? 10 : 15) + b); g.lineTo(x + 3.6, y + b); g.fill(); }); }
    g.fillStyle = '#120a1a'; RR(g, 6, -76 + b, 13, 6, 2.5); g.fill();
    VEYE(g, 13, -73 + b, 4.2, 4, pal.eye, null, P);
    if (pal.moss) { st(g, 1.6, '#4a8a3a'); g.beginPath(); g.moveTo(2, -84 + b); g.quadraticCurveTo(1, -92 + b, 4, -96 + b); g.stroke(); fe(g, 0, -95 + b, 4, 2.4, '#7ad06a', -0.5); fe(g, 8, -96 + b, 4, 2.4, '#6fc35a', 0.5); [[-8, -62, '#ffd34d'], [16, -61, '#ff9ec4']].forEach(([x, y, c]) => { for (let q = 0; q < 5; q++) { const a = q / 5 * TAU; E(g, x + Math.cos(a) * 2, y + b + Math.sin(a) * 2, 1.5, 1.5); g.fillStyle = c; g.fill(); } E(g, x, y + b, 1, 1); g.fillStyle = '#fff'; g.fill(); }); }
    g.fillStyle = '#1a1020'; RR(g, 8, -66 + b, 11, 3.2, 1.5); g.fill();
    g.save(); g.translate(16 + punch * 10, -50 + b); g.rotate(0.25 - punch * 1.25); stone(-6, 0, 12, 26, 5, pal.c1); stone(-8, 22, 16, 13, 6, pal.c2); g.restore();
    if (pal.ice && atk >= 0) { g.save(); g.globalCompositeOperation = 'lighter'; const fb = g.createRadialGradient(28, -66 + b, 0, 28, -66 + b, 14); fb.addColorStop(0, 'rgba(220,245,255,.8)'); fb.addColorStop(1, 'rgba(220,245,255,0)'); g.fillStyle = fb; E(g, 28, -66 + b, 14, 8); g.fill(); g.restore(); }
  }
  const GOLEM = { c1: '#80878c', c2: '#62686d', rune: '#c56bff', eye: '#c56bff', moss: true };
  const FROST = { c1: '#9fd4f2', c2: '#6aa7d6', rune: '#e0f7ff', eye: '#4fc3ff', ice: true, crown: true };
  function paintGolem(g, P) { paintGolemBase(g, P, GOLEM); }
  function paintFrost(g, P) { g.save(); g.scale(1.8, 1.8); paintGolemBase(g, P, FROST); g.restore(); }
  function paintWhale(g, P) {
    const b = Math.sin((P.breathe || 0) * TAU) * 1.5, atk = P.atk == null ? -1 : P.atk, open = atk >= 0.3 && atk < 0.7, calm = P.calm, ph = (P.walk || 0) * TAU;
    g.save(); g.scale(2.6, 2.6); g.translate(0, -30 + b);
    const tw = Math.sin(ph * 2 + (P.breathe || 0) * TAU) * 0.25;
    g.save(); g.translate(-40, -4); g.rotate(tw); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-12, -6, -22, -20); g.quadraticCurveTo(-14, -6, -26, 4); g.quadraticCurveTo(-12, 2, 0, 6); g.closePath(); g.fillStyle = lgr(g, '#3a4aa8', '#1a2060', -26, 0, 0, 0); g.fill(); st(g, 1.4); g.stroke(); g.restore();
    g.beginPath(); g.moveTo(-42, 0); g.quadraticCurveTo(-30, -26, 0, -28); g.quadraticCurveTo(34, -28, 42, -6); g.quadraticCurveTo(44, 10, 30, 16); g.quadraticCurveTo(0, 22, -30, 12); g.quadraticCurveTo(-42, 8, -42, 0); g.closePath();
    g.fillStyle = lgr(g, calm ? '#6a8aff' : '#4a5ac8', calm ? '#2a3a8a' : '#1a1e5a', 0, -28, 0, 20); g.fill(); st(g, 1.6); g.stroke();
    g.save(); g.clip(); g.beginPath(); g.moveTo(-40, 6); g.quadraticCurveTo(0, 26, 44, 4); g.lineTo(44, 30); g.lineTo(-40, 30); g.fillStyle = '#cfd8ff'; g.fill();
    st(g, 0.8, 'rgba(80,100,180,.5)'); for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(-20 + k * 9, 12 + k * 0.6); g.lineTo(-16 + k * 9, 22); g.stroke(); }
    for (let k = 0; k < 14; k++) star(g, -34 + (k * 23) % 70, -22 + (k * 17) % 26, 1.2 + (k % 3) * 0.6, 'rgba(255,255,255,.85)');
    g.restore();
    g.save(); g.translate(4, 10); g.rotate(0.6 + Math.sin(ph * 2) * 0.2); g.beginPath(); g.ellipse(0, 6, 4, 11, 0, 0, TAU); g.fillStyle = '#2a3480'; g.fill(); st(g, 1.2); g.stroke(); g.restore();
    if (!calm) shadowMark(g, -10, -14, 1.6);
    if (open) { g.beginPath(); g.moveTo(42, -2); g.quadraticCurveTo(30, 8, 18, 4); g.quadraticCurveTo(32, 14, 44, 6); g.fillStyle = '#3a0a2a'; g.fill(); }
    else { st(g, 1.2); g.beginPath(); g.moveTo(43, 0); g.quadraticCurveTo(32, 6, 20, 3); g.stroke(); }
    VEYE(g, 28, -10, 3.6, 3.8, '#ff5ad8', '#3a4aa8', P);
    if (!calm) { g.fillStyle = lgr(g, '#ffe27a', '#c08a18', 0, -40, 0, -28); [[-6, -28], [2, -30], [10, -29]].forEach(([x, y], i) => { g.beginPath(); g.moveTo(x - 3, y); g.lineTo(x, y - (i === 1 ? 12 : 8)); g.lineTo(x + 3, y); g.fill(); }); }
    g.save(); g.globalCompositeOperation = 'lighter'; for (let k = 0; k < 3; k++) { const yy = -36 - ((P.breathe || 0) * 20 + k * 8) % 24; E(g, 18 + k * 2, yy, 2.4, 2.4); g.fillStyle = 'rgba(160,220,255,.7)'; g.fill(); } g.restore();
    g.restore();
  }
  function paintMole(g, P) {
    const b = Math.sin((P.breathe || 0) * TAU) * 1, atk = P.atk == null ? -1 : P.atk, calm = P.calm, ph = (P.walk || 0) * TAU, spin = (P.walk || 0) * 40 + (atk >= 0 ? atk * 30 : 0);
    g.save(); g.scale(2.2, 2.2);
    for (const [x, p] of [[-14, 0], [10, 0.5]]) { const lift = P.moving ? Math.max(0, Math.sin(ph + p * TAU)) * -3 : 0; RR(g, x - 6, -14 + lift, 12, 14, 5); g.fillStyle = '#5a4a5a'; g.fill(); st(g, 1.2); g.stroke(); E(g, x + 2, -1 + lift, 7, 3); g.fillStyle = '#ffb3c1'; g.fill(); }
    g.beginPath(); g.ellipse(0, -36 + b, 30, 26, 0, 0, TAU); g.fillStyle = lgr(g, calm ? '#8a7a9a' : '#6a5a7a', calm ? '#4a3a5a' : '#2a1e3a', 0, -62, 0, -10); g.fill(); st(g, 1.6); g.stroke();
    hairs(g, 0, -36 + b, 24, 20, 24, 'rgba(255,255,255,.12)', 41);
    E(g, 6, -26 + b, 18, 14); g.fillStyle = 'rgba(255,220,200,.25)'; g.fill();
    if (!calm) shadowMark(g, -10, -32 + b, 1.3);
    // 헬멧+랜턴
    g.beginPath(); g.ellipse(4, -58 + b, 22, 12, 0, Math.PI, 0); g.fillStyle = lgr(g, '#ffe27a', '#c08a18', 0, -70, 0, -58); g.fill(); st(g, 1.4); g.stroke(); RR(g, -20, -60 + b, 46, 4, 2); g.fillStyle = '#c08a18'; g.fill();
    RR(g, 18, -70 + b, 8, 8, 2); g.fillStyle = '#5a5a62'; g.fill(); E(g, 26, -66 + b, 3.4, 3.4); g.fillStyle = '#fff6b0'; g.fill();
    g.save(); g.globalCompositeOperation = 'lighter'; const lg = g.createLinearGradient(26, -66, 90, -50); lg.addColorStop(0, 'rgba(255,240,170,.6)'); lg.addColorStop(1, 'rgba(255,240,170,0)'); g.fillStyle = lg; g.beginPath(); g.moveTo(26, -66 + b); g.lineTo(90, -80 + b); g.lineTo(90, -30 + b); g.closePath(); g.fill(); g.restore();
    // 코·얼굴
    g.beginPath(); g.moveTo(22, -46 + b); g.quadraticCurveTo(40, -44 + b, 42, -36 + b); g.quadraticCurveTo(38, -30 + b, 24, -32 + b); g.closePath(); g.fillStyle = '#c8a8b8'; g.fill(); st(g, 1.2); g.stroke(); E(g, 42, -38 + b, 4, 3.6); g.fillStyle = '#ff7aa0'; g.fill();
    VEYE(g, 20, -48 + b, 2.6, 2.6, '#ffb030', '#6a5a7a', P);
    st(g, 1.2); g.beginPath(); g.moveTo(26, -30 + b); g.quadraticCurveTo(32, -26 + b, 38, -30 + b); g.stroke(); g.fillStyle = '#fff'; g.fillRect(29, -30 + b, 3, 4);
    // 드릴 팔
    const ext = atk >= 0.3 && atk < 0.7 ? 10 : 0;
    g.save(); g.translate(26 + ext, -22 + b); RR(g, -10, -5, 14, 10, 4); g.fillStyle = '#5a4a5a'; g.fill(); st(g, 1.2); g.stroke();
    g.beginPath(); g.moveTo(2, -9); g.lineTo(34, 0); g.lineTo(2, 9); g.closePath(); g.fillStyle = lgr(g, '#ffffff', '#7a8a9a', 0, -9, 0, 9); g.fill(); st(g, 1.4); g.stroke();
    st(g, 1.2, 'rgba(60,70,80,.8)'); for (let k = 0; k < 4; k++) { const xx = 6 + ((k * 8 + spin) % 28); const hh = 9 * (1 - xx / 34); g.beginPath(); g.moveTo(xx, -hh); g.lineTo(xx + 4, hh); g.stroke(); }
    g.restore();
    g.restore();
  }
  /* v0.9 시즌 4 보스: 태엽 부엉이 박사 틱톡 · 시간을 먹는 고양이 크로노 */
  function paintCogowl(g, P) {
    const b = Math.sin((P.breathe || 0) * TAU) * 1, atk = P.atk == null ? -1 : P.atk, calm = P.calm, ph = (P.walk || 0) * TAU, spin = (P.breathe || 0) * TAU + (P.walk || 0) * 3;
    g.save(); g.scale(2.1, 2.1);
    for (const [x, p] of [[-8, 0], [8, 0.5]]) { const lift = P.moving ? Math.max(0, Math.sin(ph + p * TAU)) * -3 : 0; st(g, 3, '#b8862e'); g.beginPath(); g.moveTo(x, -16); g.lineTo(x, -3 + lift); g.stroke(); g.fillStyle = '#d9a830'; for (const dx of [-4, 0, 4]) { g.beginPath(); g.moveTo(x, -3 + lift); g.lineTo(x + dx * 1.4, 1 + lift); g.lineTo(x + dx * 0.6, -1 + lift); g.fill(); } }
    // 등 태엽 열쇠
    g.save(); g.translate(-22, -44 + b); g.rotate(spin); st(g, 3, '#b8862e'); g.beginPath(); g.moveTo(0, 0); g.lineTo(-10, 0); g.stroke(); E(g, -14, -5, 5, 4); g.fillStyle = '#ffd34d'; g.fill(); st(g, 1); g.stroke(); E(g, -14, 5, 5, 4); g.fill(); g.stroke(); g.restore();
    // 날개(톱니 판)
    const wf = atk >= 0 ? -0.6 * Math.sin(atk * Math.PI) : Math.sin(ph) * 0.08;
    g.save(); g.translate(-10, -48 + b); g.rotate(0.3 + wf); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-26, 4, -30, 26); g.lineTo(-18, 22); g.lineTo(-20, 34); g.lineTo(-8, 26); g.lineTo(-4, 34); g.quadraticCurveTo(6, 18, 0, 0); g.fillStyle = lgr(g, calm ? '#c9a07a' : '#9a6a3a', calm ? '#8a6a4a' : '#5a3a1a', 0, 0, 0, 34); g.fill(); st(g, 1.4); g.stroke();
    g.fillStyle = '#d9a830'; for (let k = 0; k < 4; k++) { E(g, -8 - k * 5, 8 + k * 5, 1.4, 1.4); g.fill(); } g.restore();
    // 몸
    E(g, 0, -42 + b, 22, 28); g.fillStyle = lgr(g, calm ? '#c9a07a' : '#a87444', calm ? '#7a5a3a' : '#5a3418', 0, -70, 0, -14); g.fill(); st(g, 1.6); g.stroke();
    E(g, 4, -36 + b, 14, 20); g.fillStyle = lgr(g, '#fff4dc', '#e8d0a0', 0, -56, 0, -16); g.fill();
    st(g, 0.9, 'rgba(160,120,70,.6)'); for (let r = 0; r < 4; r++) for (let k = -1; k <= 1; k++) { g.beginPath(); g.arc(4 + k * 7, -48 + b + r * 8, 3.4, 0.2, Math.PI - 0.2); g.stroke(); }
    // 가슴 톱니
    gearShape(g, 4, -34 + b, 7, 9, '#d9a830', spin * 2); E(g, 4, -34 + b, 2.4, 2.4); g.fillStyle = calm ? '#7ad4ff' : '#c04aff'; g.fill();
    // 머리
    const hy = -76 + b;
    E(g, 2, hy, 21, 19); g.fillStyle = lgr(g, calm ? '#d9b08a' : '#b8844c', calm ? '#9a7a5a' : '#6a4420', 0, hy - 19, 0, hy + 19); g.fill(); st(g, 1.6); g.stroke();
    [[-12, -1], [14, 1]].forEach(([x, s2]) => { g.beginPath(); g.moveTo(x - 4, hy - 14); g.lineTo(x + s2 * 4 - 2, hy - 30); g.lineTo(x + 5, hy - 14); g.closePath(); g.fillStyle = '#7a4a22'; g.fill(); st(g, 1.1); g.stroke(); });
    E(g, 4, hy + 2, 16, 12); g.fillStyle = 'rgba(255,240,215,.85)'; g.fill();
    eyeKit(g, -3, hy, 5.4, 6, { sparkle: true, glow: calm ? null : '#c04aff', blink: P.blink, expr: P.expr });
    eyeKit(g, 11, hy, 5.4, 6, { sparkle: true, glow: calm ? null : '#c04aff', blink: P.blink, expr: P.expr });
    g.beginPath(); g.arc(11, hy, 8, 0, TAU); st(g, 2, '#ffd34d'); g.stroke(); st(g, 0.8, '#d9a830'); g.beginPath(); g.moveTo(19, hy); g.quadraticCurveTo(22, hy + 14, 16, hy + 22); g.stroke();
    if (!calm) { st(g, 2); g.beginPath(); g.moveTo(-9, hy - 8); g.lineTo(1, hy - 5); g.moveTo(17, hy - 8); g.lineTo(7, hy - 5); g.stroke(); }
    g.beginPath(); g.moveTo(2, hy + 5); g.lineTo(8, hy + 5); g.lineTo(5, hy + 12); g.closePath(); g.fillStyle = '#f29a3e'; g.fill(); st(g, 1); g.stroke();
    // 작은 실크햇 + 톱니
    RR(g, -10, hy - 34, 20, 16, 2); g.fillStyle = '#3a2a3a'; g.fill(); st(g, 1); g.stroke(); RR(g, -14, hy - 20, 28, 4, 2); g.fill(); g.stroke(); g.fillStyle = '#d9a830'; g.fillRect(-10, hy - 24, 20, 3); gearShape(g, 8, hy - 30, 4, 8, '#ffd34d', spin);
    // 회중시계 지팡이
    const sw = atk >= 0 ? Math.sin(atk * Math.PI) * 0.9 : 0;
    g.save(); g.translate(18, -44 + b); g.rotate(-0.2 - sw); st(g, 3, '#6e4320'); g.beginPath(); g.moveTo(0, 0); g.lineTo(26, -10); g.stroke();
    E(g, 32, -13, 9, 9); g.fillStyle = '#ffd34d'; g.fill(); st(g, 1.2); g.stroke(); E(g, 32, -13, 6.5, 6.5); g.fillStyle = '#fffaf0'; g.fill(); st(g, 1.2, '#3a2a20'); g.beginPath(); g.moveTo(32, -13); g.lineTo(32 + Math.cos(spin * 3) * 5, -13 + Math.sin(spin * 3) * 5); g.moveTo(32, -13); g.lineTo(32, -17); g.stroke();
    if (atk >= 0.3 && atk < 0.7) { g.globalCompositeOperation = 'lighter'; g.drawImage(softDot('#d9a0ff'), 16, -30, 34, 34); }
    g.restore();
    g.restore();
  }
  function paintTcat(g, P) {
    const b = Math.sin((P.breathe || 0) * TAU) * 1.2, atk = P.atk == null ? -1 : P.atk, calm = P.calm, ph = (P.walk || 0) * TAU, t = (P.breathe || 0) * TAU;
    const c1 = calm ? '#8a7ab8' : '#4a3a7a', c2 = calm ? '#5a4a8a' : '#1e1640';
    g.save(); g.scale(2.2, 2.2);
    // 망토
    g.beginPath(); g.moveTo(-12, -54 + b); g.quadraticCurveTo(-46, -30, -44, -6); g.lineTo(-36, -10); g.lineTo(-32, -2); g.lineTo(-24, -8); g.lineTo(-16, -2); g.quadraticCurveTo(-10, -30, -12, -54 + b); g.fillStyle = lgr(g, '#2a1e4a', '#120c24', 0, -54, 0, 0); g.fill(); st(g, 1.3); g.stroke();
    g.fillStyle = 'rgba(255,240,180,.8)'; for (let k = 0; k < 6; k++) { const x = -40 + (k * 37) % 26, y = -36 + (k * 13) % 30; g.fillRect(x, y, 1.4, 1.4); }
    // 꼬리 + 모래시계
    const tw = Math.sin(t) * 0.25;
    g.save(); g.translate(-28, -26 + b); g.rotate(tw); g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(-16, -6, -12, -34, -26, -46); st(g, 7, c2); g.stroke(); st(g, 5, c1); g.stroke();
    g.translate(-27, -50); g.beginPath(); g.moveTo(-5, -7); g.lineTo(5, -7); g.lineTo(0, 0); g.lineTo(5, 7); g.lineTo(-5, 7); g.lineTo(0, 0); g.closePath(); g.fillStyle = 'rgba(220,240,255,.75)'; g.fill(); st(g, 1, '#d9a830'); g.stroke(); g.fillStyle = '#ffd27a'; g.beginPath(); g.moveTo(-3, 6); g.lineTo(3, 6); g.lineTo(0, 2); g.fill(); g.fillStyle = '#d9a830'; g.fillRect(-6, -9, 12, 2.4); g.fillRect(-6, 6.6, 12, 2.4);
    g.restore();
    // 다리
    for (const [x, p, d] of [[-18, 0.5, true], [12, 0, true], [-10, 0, false], [20, 0.5, false]]) { const lift = P.moving ? Math.max(0, Math.sin(ph + p * TAU)) * -3 : 0; RR(g, x - 5, -18 + lift, 10, 18, 5); g.fillStyle = d ? c2 : c1; g.fill(); st(g, 1.2); g.stroke(); E(g, x + 1, -1 + lift, 6, 3); g.fillStyle = d ? c1 : '#b8a8e0'; g.fill(); st(g, 1); g.stroke(); }
    // 몸 + 시계 배
    E(g, 0, -32 + b, 30, 20); g.fillStyle = lgr(g, c1, c2, 0, -52, 0, -12); g.fill(); st(g, 1.6); g.stroke();
    E(g, 6, -28 + b, 12, 12); g.fillStyle = '#fff3d6'; g.fill(); st(g, 1.4, '#d9a830'); g.stroke();
    for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; g.fillStyle = '#5a4a3a'; E(g, 6 + Math.cos(a) * 9.5, -28 + b + Math.sin(a) * 9.5, 0.9, 0.9); g.fill(); }
    st(g, 1.6, '#3a2a40'); g.beginPath(); g.moveTo(6, -28 + b); g.lineTo(6 + Math.cos(-t * 2) * 8, -28 + b + Math.sin(-t * 2) * 8); g.moveTo(6, -28 + b); g.lineTo(6 + Math.cos(-t / 3) * 5, -28 + b + Math.sin(-t / 3) * 5); g.stroke();
    // 머리
    const hx = 26, hy = -58 + b;
    [[-10, -1], [10, 1]].forEach(([x, s2]) => { g.beginPath(); g.moveTo(hx + x - 8, hy - 10); g.lineTo(hx + x + s2 * 2, hy - 30); g.lineTo(hx + x + 8, hy - 10); g.closePath(); g.fillStyle = c1; g.fill(); st(g, 1.3); g.stroke(); g.beginPath(); g.moveTo(hx + x - 4, hy - 12); g.lineTo(hx + x + s2 * 1.5, hy - 24); g.lineTo(hx + x + 4, hy - 12); g.fillStyle = '#ff9ec4'; g.fill(); });
    E(g, hx, hy, 22, 19); g.fillStyle = lgr(g, c1, c2, 0, hy - 19, 0, hy + 19); g.fill(); st(g, 1.6); g.stroke();
    E(g, hx + 6, hy + 6, 11, 7); g.fillStyle = calm ? '#e8e0ff' : '#8a7ab8'; g.fill();
    if (calm) { eyeKit(g, hx - 4, hy - 2, 5, 6, { sparkle: true, blink: P.blink }); eyeKit(g, hx + 12, hy - 2, 5, 6, { sparkle: true, blink: P.blink }); }
    else { [[hx - 4, hy - 2], [hx + 12, hy - 2]].forEach(([x, y]) => { E(g, x, y, 5.5, 6); g.fillStyle = '#ffe14a'; g.fill(); st(g, 1); g.stroke(); E(g, x + 0.5, y, 1.2, 5); g.fillStyle = '#1a1020'; g.fill(); E(g, x - 1.5, y - 2.5, 1.4, 1.4); g.fillStyle = '#fff'; g.fill(); g.globalCompositeOperation = 'lighter'; g.drawImage(softDot('#ffe14a'), x - 10, y - 10, 20, 20); g.globalCompositeOperation = 'source-over'; }); st(g, 2); g.beginPath(); g.moveTo(hx - 10, hy - 10); g.lineTo(hx, hy - 7); g.moveTo(hx + 18, hy - 10); g.lineTo(hx + 8, hy - 7); g.stroke(); }
    E(g, hx + 7, hy + 4, 2.2, 1.6); g.fillStyle = '#ff7aa8'; g.fill();
    const mo = atk >= 0.3 && atk < 0.7 ? 4 : 0;
    st(g, 1.3); g.beginPath(); g.moveTo(hx + 2, hy + 8); g.quadraticCurveTo(hx + 4.5, hy + 11 + mo, hx + 7, hy + 7); g.quadraticCurveTo(hx + 9.5, hy + 11 + mo, hx + 12, hy + 8); g.stroke();
    if (!calm) { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(hx + 4, hy + 9); g.lineTo(hx + 5, hy + 13); g.lineTo(hx + 6, hy + 9); g.fill(); }
    st(g, 0.8, 'rgba(255,255,255,.7)'); [[-1, 1], [1, 1], [0, 1]].forEach(([d], k) => { g.beginPath(); g.moveTo(hx + 14, hy + 5 + k * 2); g.lineTo(hx + 28, hy + 2 + k * 4); g.stroke(); });
    // 왕관(시곗바늘)
    g.fillStyle = '#ffd34d'; for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(hx - 8 + k * 8, hy - 16); g.lineTo(hx - 6 + k * 8, hy - 26 - (k === 1 ? 6 : 0)); g.lineTo(hx - 4 + k * 8, hy - 16); g.fill(); st(g, 0.8); g.stroke(); }
    // 방울 목걸이
    st(g, 2.4, '#c04a6a'); g.beginPath(); g.arc(hx, hy + 6, 18, 0.5, 2.0); g.stroke(); E(g, hx + 2, hy + 24, 4, 4); g.fillStyle = '#ffd34d'; g.fill(); st(g, 1); g.stroke();
    if (atk >= 0.3 && atk < 0.7) { g.globalCompositeOperation = 'lighter'; g.drawImage(softDot('#b48cff'), hx + 10, hy - 14, 40, 40); g.globalCompositeOperation = 'source-over'; }
    g.restore();
  }
  /* v1.1 시즌 5 보스: 잠꾸러기 해파리 여왕 몽글라 · 악몽의 거울 미르 */
  function paintJelly(g, P) {
    const b = Math.sin((P.breathe || 0) * TAU) * 2, t = (P.breathe || 0) * TAU + (P.walk || 0) * 4, atk = P.atk == null ? -1 : P.atk, calm = P.calm;
    g.save(); g.scale(2.2, 2.2);
    // 촉수 (물결)
    for (let k = 0; k < 8; k++) { const x0 = -20 + k * 5.6; g.beginPath(); g.moveTo(x0, -34 + b); for (let q = 1; q <= 8; q++) g.lineTo(x0 + Math.sin(t * 2 + k + q * 0.8) * (2 + q * 0.5), -34 + b + q * 4.2); st(g, 3.2, k % 2 ? '#ff9ec7' : '#c79cff'); g.stroke(); st(g, 1.2, 'rgba(255,255,255,.6)'); g.stroke(); }
    // 갓 (반투명 종)
    g.beginPath(); g.moveTo(-26, -34 + b); g.bezierCurveTo(-28, -74 + b, 28, -74 + b, 26, -34 + b); g.quadraticCurveTo(20, -30 + b, 13, -34 + b); g.quadraticCurveTo(6, -30 + b, 0, -34 + b); g.quadraticCurveTo(-6, -30 + b, -13, -34 + b); g.quadraticCurveTo(-20, -30 + b, -26, -34 + b); g.closePath();
    g.fillStyle = lgr(g, 'rgba(255,210,235,.95)', 'rgba(200,150,255,.9)', 0, -74, 0, -30); g.fill(); st(g, 1.6); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.45)'; E(g, -10, -60 + b, 8, 5, -0.4); g.fill(); E(g, 12, -48 + b, 3, 2); g.fill();
    for (let k = 0; k < 5; k++) { E(g, -14 + k * 7, -38 + b, 2.2, 2.2); g.fillStyle = '#fff6fb'; g.fill(); st(g, 0.6, 'rgba(120,60,100,.5)'); g.stroke(); }
    // 얼굴 (졸린 눈)
    if (calm) { eyeKit(g, -6, -50 + b, 4, 4.6, { expr: 'happy' }); eyeKit(g, 8, -50 + b, 4, 4.6, { expr: 'happy' }); }
    else { [[-6, -50], [8, -50]].forEach(([x, y]) => { E(g, x, y + b, 4.4, 4.8); g.fillStyle = '#fff'; g.fill(); st(g, 1); g.stroke(); E(g, x + 0.6, y + 1 + b, 2.6, 3); g.fillStyle = '#5a2a6a'; g.fill(); g.fillStyle = lgr(g, '#e8a8e0', '#b878c8', 0, y - 5, 0, y + 1); g.beginPath(); g.ellipse(x, y + b, 4.8, 5.2, 0, Math.PI, TAU); g.fill(); st(g, 1); g.stroke(); }); }
    E(g, -9, -44 + b, 3.4, 1.8); g.fillStyle = 'rgba(255,120,160,.5)'; g.fill(); E(g, 11, -44 + b, 3.4, 1.8); g.fill();
    st(g, 1.2); g.beginPath(); if (atk >= 0.3 && atk < 0.7) { E(g, 1, -42 + b, 3, 3.6); g.fillStyle = '#7a2a5a'; g.fill(); } else { g.moveTo(-2, -42 + b); g.quadraticCurveTo(1, -40 + b, 4, -42 + b); g.stroke(); }
    // 잠꼬대 모자
    g.beginPath(); g.moveTo(-16, -66 + b); g.quadraticCurveTo(4, -76 + b, 18, -66 + b); g.quadraticCurveTo(28, -78 + b, 34, -66 + b + Math.sin(t) * 2); g.lineTo(26, -64 + b); g.quadraticCurveTo(6, -62 + b, -16, -66 + b); g.closePath(); g.fillStyle = lgr(g, '#8ec8ff', '#5a8ae0', 0, -78, 0, -62); g.fill(); st(g, 1.2); g.stroke();
    g.fillStyle = '#fff'; for (let k = 0; k < 4; k++) { E(g, -8 + k * 8, -67 + b, 1.4, 1.4); g.fill(); } E(g, 34, -66 + b + Math.sin(t) * 2, 4, 4); g.fill(); st(g, 1); g.stroke();
    // Zzz
    if (!calm) { g.font = 'bold 9px sans-serif'; g.fillStyle = 'rgba(255,255,255,.85)'; g.fillText('Z', 26, -84 + b - Math.sin(t) * 3); g.font = 'bold 6px sans-serif'; g.fillText('z', 33, -92 + b - Math.sin(t + 1) * 3); }
    g.restore();
  }
  // v1.2 시즌 6 보스: 별을 엮는 거미 여왕 아라냐 (둥근 별무늬 몸 · 왕관 · 별실)
  function paintSpiderQ(g, P) {
    const walk = P.walk || 0, mv = !!P.moving, ph = walk * TAU, br = Math.sin((P.breathe || 0) * TAU), atk = P.atk == null ? -1 : P.atk, strike = atk >= 0.35 && atk < 0.7;
    g.save(); g.scale(2.1, 2.1); const bob = mv ? -Math.abs(Math.sin(ph * 2)) * 2 : br;
    // 별실 (위로 올라감)
    st(g, 0.8, 'rgba(255,240,200,.75)'); g.beginPath(); g.moveTo(0, -46 + bob); g.lineTo(0, -110); g.stroke(); star(g, 0, -60, 2.5, '#fff6c8');
    // 다리 8개
    for (let i = 0; i < 4; i++) for (const sd of [-1, 1]) {
      const sw2 = mv ? Math.sin(ph + i * 1.3 + (sd > 0 ? 0 : Math.PI)) * 0.25 : br * 0.05, a0 = sd > 0 ? -0.5 + i * 0.32 : Math.PI + 0.5 - i * 0.32;
      g.save(); g.translate(sd * 6, -22 + bob); g.rotate(a0 + sw2 * sd);
      st(g, 4.2, '#3a2a6a'); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(14, -16, 26, -6); g.stroke(); st(g, 3.4, '#5a4a9a'); g.beginPath(); g.moveTo(26, -6); g.lineTo(32, 18); g.stroke(); E(g, 32, 19, 2.4, 2.4); g.fillStyle = '#ffd34d'; g.fill();
      g.restore();
    }
    // 배 (뒤쪽 큰 공) + 별 무늬
    ball(g, -16, -28 + bob, 20, 17, '#4a3a8a'); g.save(); E(g, -16, -28 + bob, 20, 17); g.clip();
    for (let k = 0; k < 9; k++) star(g, -30 + (k % 3) * 13, -38 + Math.floor(k / 3) * 9 + bob, 2.6, k % 2 ? '#fff6c8' : '#ffb3e6');
    st(g, 1, 'rgba(255,240,200,.5)'); g.beginPath(); g.moveTo(-32, -36 + bob); g.lineTo(-17, -33 + bob); g.lineTo(-4, -38 + bob); g.lineTo(-10, -22 + bob); g.stroke(); g.restore();
    // 머리·몸
    ball(g, 8, -24 + bob, 16, 15, '#6a5ab0');
    fuzz(g, 8, -24 + bob, 16, 15, '#6a5ab0', 20, 41, Math.PI * 1, Math.PI * 2);
    // 눈 (크고 반짝이는 두 눈 + 작은 별 눈 4개)
    eyeKit(g, 6, -27 + bob, 4.6, 5.6, { glow: '#ff7ad0', sparkle: true, blink: P.blink, hurt: P.hurt });
    eyeKit(g, 16, -27 + bob, 4.2, 5.4, { glow: '#ff7ad0', sparkle: true, blink: P.blink, hurt: P.hurt });
    [[2, -35], [8, -37], [14, -37], [20, -35]].forEach(([x, y]) => { E(g, x, y + bob, 1.4, 1.4); g.fillStyle = '#ffe08a'; g.fill(); });
    E(g, 11, -18 + bob, 3, strike ? 2.6 : 1.2); g.fillStyle = '#3a0f30'; g.fill();
    [[3, -19], [19, -19]].forEach(([x, y]) => { const bl = g.createRadialGradient(x, y + bob, 0, x, y + bob, 4); bl.addColorStop(0, 'rgba(255,130,190,.6)'); bl.addColorStop(1, 'rgba(255,130,190,0)'); g.fillStyle = bl; E(g, x, y + bob, 4, 3); g.fill(); });
    // 왕관
    g.fillStyle = lgr(g, '#fff0a0', '#c8901a', 0, -50, 0, -38); [[2, -38, 7], [8, -39, 10], [14, -38, 7]].forEach(([x, y, h]) => { g.beginPath(); g.moveTo(x - 3, y + bob); g.lineTo(x, y - h + bob); g.lineTo(x + 3, y + bob); g.closePath(); g.fill(); }); RR(g, -2, -40 + bob, 20, 3.2, 1.4); g.fill();
    star(g, 8, -45 + bob, 2.2, '#ffffff');
    if (strike) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.35; g.drawImage(softDot('#ffb3e6'), -6, -46 + bob, 30, 30); g.restore(); }
    g.restore();
  }
  // 첫 번째 기사의 그림자 (보리와 같은 기사 모습, 보랏빛 그림자)
  const SHADOWK = { pid: 'shadow', c1: '#4a3a6a', c2: '#8a7ab0', c3: '#2a1e44', ear: 'flop', tail: 'wag', evil: true, iris: '#ff4fd8', helmet: true, plume: '#b48cff', cape: '#2a1240', capeTorn: true, sword: true, blade: '#c56bff', bladeGlow: true, shield: true, shieldC: '#2a1a3a', armor: '#5a4a7a', brow: true, seed: 55 };
  function paintShadowK(g, P) { g.save(); g.scale(1.9, 1.9); paintPlush(g, SHADOWK, P); g.restore(); g.save(); g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(80,30,140,.18)'; g.fillRect(-120, -260, 260, 280); g.restore(); }
  function paintDmir(g, P) { g.save(); g.scale(2.6, 2.6); paintDragonMount(g, P, '#4a3a7a', false, 2, true); paintDragonMount(g, P, '#4a3a7a', true, 2, true); g.restore(); }
  function paintBonedra(g, P) {
    const b = Math.sin((P.breathe || 0) * TAU) * 1.4, atk = P.atk == null ? -1 : P.atk, open = atk >= 0.3 && atk < 0.7, calm = P.calm, ph = (P.walk || 0) * TAU;
    const BN = calm ? '#f4ecd8' : '#e8dcbc', DKB = '#8a7a5a';
    g.save(); g.scale(2.3, 2.3);
    const boneSeg = (x1, y1, x2, y2, w) => { st(g, w + 2, OUT); g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); st(g, w, BN); g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); [[x1, y1], [x2, y2]].forEach(([a, c]) => { E(g, a, c, w * 0.7, w * 0.7); g.fillStyle = BN; g.fill(); st(g, 1, OUT); g.stroke(); }); };
    // 꼬리
    let tx = -30, ty = -30 + b; for (let k = 0; k < 6; k++) { const nx = tx - 7, ny = ty + 3 + Math.sin(ph + k) * 2; boneSeg(tx, ty, nx, ny, 4 - k * 0.5); tx = nx; ty = ny; }
    // 다리
    for (const [x, p] of [[-18, 0], [14, 0.5]]) { const lift = P.moving ? Math.max(0, Math.sin(ph + p * TAU)) * -4 : 0; boneSeg(x, -30 + b, x - 4, -14 + lift, 4); boneSeg(x - 4, -14 + lift, x + 2, 0 + lift, 3.4); }
    // 척추·갈비
    boneSeg(-30, -32 + b, 22, -40 + b, 5);
    for (let k = 0; k < 6; k++) { const x = -22 + k * 8; st(g, 4, OUT); g.beginPath(); g.arc(x, -24 + b, 12 - k * 0.5, Math.PI * 1.1, Math.PI * 1.9, false); g.stroke(); st(g, 2.6, BN); g.beginPath(); g.arc(x, -24 + b, 12 - k * 0.5, Math.PI * 1.1, Math.PI * 1.9, false); g.stroke(); }
    if (!calm) { g.save(); g.globalCompositeOperation = 'lighter'; g.drawImage(softDot('#9b6bff'), -30, -50 + b, 50, 40); g.restore(); shadowMark(g, -8, -30 + b, 1.2); }
    // 날개뼈
    const wf = Math.sin((P.breathe || 0) * TAU * 2) * 0.15; g.save(); g.translate(-4, -40 + b); g.rotate(-0.6 + wf); boneSeg(0, 0, -14, -26, 3); boneSeg(-14, -26, -34, -30, 2.4); for (let k = 0; k < 3; k++) boneSeg(-14 - k * 6, -26 - k, -10 - k * 9, -6, 1.4); g.globalAlpha = 0.25; g.beginPath(); g.moveTo(0, 0); g.lineTo(-14, -26); g.lineTo(-34, -30); g.lineTo(-28, -4); g.closePath(); g.fillStyle = calm ? '#bfffe0' : '#7a4aa8'; g.fill(); g.restore();
    // 목·두개골
    boneSeg(22, -40 + b, 30, -52 + b, 4);
    g.save(); g.translate(32, -56 + b);
    g.beginPath(); g.moveTo(-8, -6); g.quadraticCurveTo(2, -14, 16, -8); g.lineTo(28, -4); g.quadraticCurveTo(30, 2, 24, 3); g.lineTo(4, 4); g.quadraticCurveTo(-8, 4, -8, -6); g.closePath(); g.fillStyle = lgr(g, '#ffffff', BN, 0, -14, 0, 4); g.fill(); st(g, 1.4); g.stroke();
    g.beginPath(); g.moveTo(2, 4); g.lineTo(26, 4); g.lineTo(22, open ? 14 : 8); g.lineTo(4, open ? 12 : 7); g.closePath(); g.fillStyle = BN; g.fill(); st(g, 1.2); g.stroke();
    g.fillStyle = '#fff'; for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(8 + k * 4, 3); g.lineTo(10 + k * 4, 7); g.lineTo(12 + k * 4, 3); g.fill(); }
    g.beginPath(); g.moveTo(-4, -8); g.lineTo(-10, -20); g.lineTo(0, -12); g.closePath(); g.fillStyle = DKB; g.fill(); g.beginPath(); g.moveTo(4, -10); g.lineTo(2, -22); g.lineTo(8, -12); g.closePath(); g.fill();
    E(g, 6, -4, 4, 3.4); g.fillStyle = '#1a1020'; g.fill();
    if (!calm) { g.save(); g.globalCompositeOperation = 'lighter'; g.drawImage(softDot('#c56bff'), -4, -14, 20, 20); g.restore(); E(g, 6, -4, 1.8, 1.8); g.fillStyle = '#ff6bf0'; g.fill(); } else { E(g, 6, -4, 1.8, 1.8); g.fillStyle = '#9fffd8'; g.fill(); }
    if (open && !calm) { g.save(); g.globalCompositeOperation = 'lighter'; g.drawImage(softDot('#b48cff'), 18, -2, 40, 24); g.restore(); }
    g.restore();
    g.restore();
  }
  const CRYS = { c1: '#9fb8ff', c2: '#6a74d6', rune: '#7affe6', eye: '#ff6bd6', ice: true, crown: true };
  function paintCGolem(g, P) {
    g.save(); g.scale(1.95, 1.95);
    const b = Math.sin((P.breathe || 0) * TAU) * 0.6;
    [[-20, -70, 26, 6, '#6fd8ff'], [-10, -80, 30, 6.5, '#b48cff'], [2, -76, 22, 5, '#7affd0'], [-26, -58, 18, 4.5, '#ff9be8']].forEach(([x, y, h, w, c]) => { g.save(); g.translate(x, y + b); g.rotate(-0.35); g.beginPath(); g.moveTo(-w, 0); g.lineTo(0, -h); g.lineTo(w, 0); g.closePath(); g.fillStyle = lgr(g, LI(c, 0.6), DK(c, 0.3), -w, 0, w, 0); g.fill(); st(g, 0.8, rgba(DK(c, 0.6), 0.8)); g.stroke(); g.fillStyle = 'rgba(255,255,255,.4)'; g.beginPath(); g.moveTo(-w * 0.6, 0); g.lineTo(0, -h); g.lineTo(-w * 0.1, 0); g.fill(); g.restore(); });
    paintGolemBase(g, P, CRYS); g.restore();
  }

  /* ---------- 보스: 늪 대왕 그롬 (측면) ---------- */
  function paintTroll(g, P) {
    const ph = (P.moving ? P.walk : 0) * TAU, b = P.moving ? Math.sin(ph * 2) * 2 : Math.sin((P.breathe || 0) * TAU) * 1.2, atk = P.atk == null ? -1 : P.atk;
    const sw = swing(atk), calm = P.calm;
    g.save(); g.scale(1.95, 1.95);
    g.save(); g.translate(-14, -42 + b); g.rotate(0.25); RR(g, -5, 0, 10, 24, 5); g.fillStyle = lgr(g, '#4c8256', '#2b5233', 0, 0, 0, 24); g.fill(); fe(g, 0, 25, 6.5, 5, '#3f6b47'); g.restore();
    for (const [x, p] of [[-16, 0], [4, 0.5]]) { const lift = P.moving ? Math.max(0, Math.sin(ph + p * TAU)) * -3 : 0; RR(g, x, -21 + lift, 13, 21, 5); g.fillStyle = lgr(g, '#4c8256', '#2b5233', 0, -20, 0, 0); g.fill(); fe(g, x + 8, -1 + lift, 9, 3.6, '#3a6844'); g.fillStyle = '#efe6c8'; [x + 8, x + 12, x + 16].forEach(cx => { g.beginPath(); g.moveTo(cx - 1.4, -2 + lift); g.lineTo(cx + 1, -5 + lift); g.lineTo(cx + 1.4, -2 + lift); g.fill(); }); }
    fe(g, -2, -37 + b, 23, 21, '#5f9a66', 0, 0.25, 0.32);
    hairs(g, -4, -40 + b, 18, 15, 18, 'rgba(30,60,30,.35)', 41);
    fe(g, 6, -30 + b, 13, 12, '#b2d39a', 0, 0.3, 0.1);
    st(g, 1, rgba(OUT, 0.3)); for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(-1, -33 + b + k * 4); g.quadraticCurveTo(7, -31 + b + k * 4, 15, -33 + b + k * 4); g.stroke(); }
    fe(g, -12, -53 + b, 13, 8, '#3f6b38'); fluff(g, -12, -53 + b, 13, 8, Math.PI, Math.PI * 2, 6, 3, '#3f6b38');
    [[-18, -60, '#e5533d'], [-9, -61, '#ffb74d'], [-3, -58, '#e5533d']].forEach(([x, y, c]) => { RR(g, x - 1, y + b, 2, 4, 1); g.fillStyle = '#f3e6cc'; g.fill(); E(g, x, y + b, 3.4, 2.2); g.fillStyle = c; g.fill(); g.fillStyle = '#fff'; E(g, x - 1, y - 0.6 + b, 0.7, 0.6); g.fill(); });
    RR(g, -25, -25 + b, 46, 8, 3); g.fillStyle = lgr(g, '#8d6a46', '#4f371f', 0, -25, 0, -17); g.fill();
    [-19, -11, 11, 17].forEach(x => { E(g, x, -21 + b, 3, 2.6); g.fillStyle = '#b07a3e'; g.fill(); });
    E(g, 1, -21 + b, 5.5, 5); g.fillStyle = '#f3eee2'; g.fill(); E(g, 2.5, -22 + b, 1.6, 1.8); g.fillStyle = '#2b1d2e'; g.fill(); if (!calm) shadowMark(g, 1, -21 + b, 0.5);
    g.save(); g.translate(10, -57 + b);
    g.save(); g.translate(-11, -4); g.rotate(-0.7); E(g, 0, 0, 3.2, 9); g.fillStyle = '#4c8256'; g.fill(); E(g, 0, 1, 1.6, 6); g.fillStyle = '#7fae7f'; g.fill(); g.restore();
    fe(g, -1, 0, 14, 13, '#5f9a66', 0, 0.28, 0.28);
    g.beginPath(); g.moveTo(4, -6); g.quadraticCurveTo(14, -4, 17, 3); g.quadraticCurveTo(14, 7, 6, 5); g.closePath(); g.fillStyle = rg(g, '#6aa671', 11, 0, 9, 0.3, 0.25); g.fill();
    E(g, 15.5, 2, 1.4, 1.1); g.fillStyle = '#20301f'; g.fill();
    g.fillStyle = '#4c8256'; E(g, 3, -7, 10, 3.6, -0.15); g.fill();
    g.fillStyle = '#7fb27f'; [[-6, 3], [1, 8], [-3, -4]].forEach(([x, y]) => { E(g, x, y, 1.4, 1.4); g.fill(); });
    VEYE(g, 5, -2, 3.4, 3.6, '#ffb300', '#4c8256', P);
    g.beginPath(); g.moveTo(-2, 8); g.quadraticCurveTo(8, 13, 16, 8); g.lineTo(15, 11); g.quadraticCurveTo(7, 16, -1, 10.5); g.closePath(); g.fillStyle = '#3a1f1f'; g.fill();
    g.fillStyle = lgr(g, '#fffbea', '#d9cfa8', 0, 0, 0, 11); g.beginPath(); g.moveTo(11, 10.5); g.quadraticCurveTo(10, 2, 13.5, 0); g.quadraticCurveTo(14.5, 5, 14, 10); g.fill();
    if (!calm) {
      g.fillStyle = lgr(g, '#8a4fc0', '#2d1240', 0, -24, 0, -9);
      for (let i = 0; i < 6; i++) { const x = -11 + i * 4.4; g.beginPath(); g.moveTo(x - 2.4, -10); g.quadraticCurveTo(x - 1, -17, x + (i % 2 ? 1 : -1), -22 - (i % 3) * 2); g.quadraticCurveTo(x + 1.6, -15, x + 2.4, -10); g.fill(); }
      RR(g, -13, -12, 26, 4, 2); g.fill();
      const gl = g.createRadialGradient(0, -13, 0, 0, -13, 7); gl.addColorStop(0, 'rgba(230,150,255,.9)'); gl.addColorStop(1, 'rgba(200,100,255,0)'); g.fillStyle = gl; E(g, 0, -13, 7, 7); g.fill();
      E(g, 0, -13, 2.2, 2.6); g.fillStyle = '#f0c2ff'; g.fill();
    } else { g.fillStyle = '#ffb74d'; E(g, -2, -12, 4, 2.4); g.fill(); g.fillStyle = '#e5533d'; E(g, 3, -12.5, 3, 2); g.fill(); }
    g.restore();
    g.save(); g.translate(16, -42 + b); g.rotate(sw);
    RR(g, -2.8, -36, 5.6, 42, 2.5); g.fillStyle = lgr(g, '#9b7148', '#5e4128', -2, 0, 2, 0); g.fill();
    fe(g, 0, -38, 9.5, 12, '#6d4a2d', 0, 0.22, 0.3);
    st(g, 0.9, 'rgba(40,20,10,.45)'); g.beginPath(); g.moveTo(-5, -44); g.quadraticCurveTo(-1, -38, -4, -30); g.moveTo(4, -46); g.quadraticCurveTo(2, -40, 5, -32); g.stroke();
    [[-7, -42], [7, -40], [0, -49], [-6, -32], [7, -31]].forEach(([x, y]) => { g.beginPath(); g.moveTo(x - 2, y); g.lineTo(x + (x < 0 ? -5 : 5), y - 2.4); g.lineTo(x, y + 2); g.fillStyle = '#d0c4e0'; g.fill(); });
    if (!calm) { g.save(); g.globalCompositeOperation = 'lighter'; const cg = g.createRadialGradient(0, -38, 0, 0, -38, 16); cg.addColorStop(0, 'rgba(190,90,255,.4)'); cg.addColorStop(1, 'rgba(190,90,255,0)'); g.fillStyle = cg; E(g, 0, -38, 16, 16); g.fill(); g.restore(); }
    g.restore();
    fe(g, 16, -42 + b, 6.4, 5.8, '#5f9a66');
    g.restore();
  }

  /* ---------- 보스: 모래 전갈왕 스콜피 ---------- */
  function paintScorp(g, P) {
    const ph = (P.moving ? P.walk : 0) * TAU, b = Math.sin((P.breathe || 0) * TAU) * 1, atk = P.atk == null ? -1 : P.atk;
    const snap = atk >= 0.35 && atk < 0.7 ? 1 : 0, wind = atk >= 0 && atk < 0.35 ? atk / 0.35 : 0;
    const A1 = '#e8b85c', A2 = '#8a5a1e';
    g.save(); g.scale(1.6, 1.6);
    for (let i = 0; i < 3; i++) for (const side of [0, 1]) {
      const lx = -12 + i * 9, sw2 = P.moving ? Math.sin(ph + i * 2 + side * Math.PI) * 3 : 0;
      st(g, 2.8, side ? DK(A2, 0.25) : A2); g.beginPath(); g.moveTo(lx, -12); g.lineTo(lx - 5 + sw2, -18 + (side ? 2 : 0)); g.lineTo(lx - 8 + sw2, 0); g.stroke();
    }
    const tSw = Math.sin((P.breathe || 0) * TAU) * 0.08 + wind * -0.3 + snap * 0.5;
    let tx = -18, ty = -16, ang = -2.2 + tSw; const segs = [];
    for (let i = 0; i < 6; i++) { segs.push([tx, ty, 7.6 - i * 0.6]); tx += Math.cos(ang) * 8; ty += Math.sin(ang) * 8; ang += 0.42 + tSw * 0.3; }
    segs.forEach(([x, y, r]) => { fe(g, x, y, r, r * 0.9, A1, 0, 0.4, 0.32); st(g, 0.9, rgba(OUT, 0.35)); E(g, x, y, r, r * 0.9); g.stroke(); st(g, 0.8, 'rgba(255,255,255,.5)'); g.beginPath(); g.arc(x, y, r * 0.75, Math.PI * 1.1, Math.PI * 1.5); g.stroke(); });
    g.save(); g.translate(tx, ty); g.rotate(ang + 0.3);
    fe(g, 0, 0, 6.5, 5.5, '#c9862f'); g.beginPath(); g.moveTo(4, -3); g.quadraticCurveTo(13, 0, 6, 7); g.lineTo(3, 3); g.closePath(); g.fillStyle = lgr(g, '#3a1f12', '#7a3fa8', 4, -3, 6, 7); g.fill();
    g.restore();
    const sx = tx - 2, sy = ty - 2, sg = g.createRadialGradient(sx, sy, 0, sx, sy, 13); sg.addColorStop(0, 'rgba(255,240,160,.95)'); sg.addColorStop(1, 'rgba(255,200,40,0)'); g.fillStyle = sg; E(g, sx, sy, 13, 13); g.fill();
    bone(g, sx, sy, 9, '#fff3b0', 0.5);
    for (let i = 0; i < 4; i++) { const x = -14 + i * 9; fe(g, x, -13 + b * 0.5, 9, 7.5, i % 2 ? A1 : LI(A1, 0.08), 0, 0.42, 0.32); st(g, 1, rgba(OUT, 0.4)); g.beginPath(); g.arc(x, -13 + b * 0.5, 8.5, -2.4, -0.7); g.stroke(); }
    shadowMark(g, -5, -15 + b * 0.5, 0.8);
    const claw = (y, far) => {
      g.save(); g.translate(18, y + b * 0.5);
      const c = far ? DK(A1, 0.18) : A1;
      st(g, 4, c); g.beginPath(); g.moveTo(0, 0); g.lineTo(9 + snap * 4, -6); g.stroke();
      g.translate(11 + snap * 4, -7);
      fe(g, 4, 0, 7.5, 5.5, c, 0, 0.4, 0.3);
      const op = snap ? 0.05 : 0.45 + wind * 0.3;
      g.save(); g.rotate(-op); g.beginPath(); g.moveTo(8, -2); g.quadraticCurveTo(17, -6, 19, -1); g.quadraticCurveTo(14, -2, 9, 1); g.closePath(); g.fillStyle = c; g.fill(); g.restore();
      g.save(); g.rotate(op); g.beginPath(); g.moveTo(8, 2); g.quadraticCurveTo(17, 6, 19, 1); g.quadraticCurveTo(14, 2, 9, -1); g.closePath(); g.fillStyle = DK(c, 0.1); g.fill(); g.restore();
      g.restore();
    };
    claw(-15, true);
    g.save(); g.translate(18, -16 + b * 0.5); g.scale(1.45, 1.45);
    fe(g, 0, 0, 9, 7.5, A1, 0, 0.4, 0.3);
    g.beginPath(); g.moveTo(-8, -3); g.lineTo(-10, 8); g.lineTo(-4, 4); g.lineTo(0, -6); g.closePath(); g.fillStyle = '#2f5fb3'; g.fill();
    st(g, 0.7, '#ffd34d'); g.beginPath(); g.moveTo(-8.6, 0); g.lineTo(-3, -3); g.moveTo(-9.2, 4); g.lineTo(-3.5, 1); g.stroke();
    g.beginPath(); g.moveTo(-7, -5); g.quadraticCurveTo(0, -14, 8, -5); g.lineTo(6, -3); g.quadraticCurveTo(0, -9, -5, -3); g.closePath(); g.fillStyle = lgr(g, '#fff0a0', '#d9a21b', 0, -13, 0, -3); g.fill();
    [[-4, -8], [0, -11], [4, -8]].forEach(([x, y]) => { g.beginPath(); g.moveTo(x - 1.8, y + 1); g.lineTo(x, y - 5); g.lineTo(x + 1.8, y + 1); g.fillStyle = '#ffd34d'; g.fill(); });
    E(g, 0, -10.5, 1.6, 1.8); g.fillStyle = '#e53935'; g.fill();
    VEYE(g, 4.5, -1, 2.9, 3.2, '#ff3b30', A1, P);
    E(g, 7.5, 3.5, 0.9, 0.9); g.fillStyle = '#ff5a4a'; g.fill();
    st(g, 1.6, A2); g.beginPath(); g.moveTo(7, 5); g.lineTo(11, 7 + snap); g.moveTo(5, 6); g.lineTo(8, 9 + snap); g.stroke();
    g.restore();
    claw(-6, false);
    g.restore();
  }

  /* ---------- 보스: 심해 여왕 크라케나 (문어) ---------- */
  function paintKraken(g, P) {
    const t = (P.moving ? P.walk : P.breathe || 0) * TAU, atk = P.atk == null ? -1 : P.atk, lash = atk >= 0.35 && atk < 0.7 ? 1 : 0;
    g.save(); g.scale(1.7, 1.7);
    for (let i = 0; i < 6; i++) {
      const far = i < 3, x0 = -14 + i * 6, sw = Math.sin(t + i) * 4 + (lash && i === 5 ? 10 : 0);
      const c = far ? '#8a2f70' : '#c2459a';
      g.beginPath(); g.moveTo(x0 - 3, -18); g.bezierCurveTo(x0 - 2 + sw * 0.4, -6, x0 + 6 + sw, -2, x0 + 10 + sw * 1.4, -4 - (i === 5 ? lash * 14 : 0));
      g.quadraticCurveTo(x0 + 4 + sw * 0.6, -4, x0 + 3, -18); g.closePath(); g.fillStyle = lgr(g, LI(c, 0.15), DK(c, 0.2), x0, -18, x0 + 10, -2); g.fill();
      if (!far) { g.fillStyle = '#ffd1ec'; for (let k = 1; k < 4; k++) { E(g, x0 + 1 + k * 2.4 + sw * 0.3 * k / 3, -12 + k * 2.8, 1.1, 1.1); g.fill(); } }
    }
    g.beginPath(); g.moveTo(-20, -18); g.bezierCurveTo(-30, -44, -10, -70, 6, -62); g.bezierCurveTo(22, -54, 20, -26, 14, -16); g.quadraticCurveTo(-4, -10, -20, -18); g.closePath();
    g.fillStyle = rg(g, '#c2459a', -2, -40, 32, 0.35, 0.32); g.fill();
    g.fillStyle = 'rgba(255,200,240,.35)'; [[-10, -48, 2.6], [-14, -36, 2], [0, -56, 1.8], [-4, -30, 1.6]].forEach(([x, y, r]) => { E(g, x, y, r, r); g.fill(); });
    st(g, 1.3, 'rgba(255,255,255,.5)'); g.beginPath(); g.ellipse(-4, -42, 16, 22, -0.3, Math.PI * 1.05, Math.PI * 1.45); g.stroke();
    shadowMark(g, -8, -40, 1);
    g.fillStyle = '#ffffff'; for (let i = 0; i < 7; i++) { E(g, -14 + i * 4.4, -17 + Math.sin(i) * 0.8, 1.9, 1.9); g.fill(); }
    g.fillStyle = lgr(g, '#ffd6e0', '#ff7a9a', 0, -76, 0, -60);
    [[-4, -62, 8], [1, -64, 12], [6, -62, 9]].forEach(([x, y, h]) => { g.beginPath(); g.moveTo(x - 3, y); g.quadraticCurveTo(x - 1, y - h * 0.6, x, y - h); g.quadraticCurveTo(x + 1, y - h * 0.6, x + 3, y); g.fill(); });
    E(g, 1, -64, 2.4, 2.4); g.fillStyle = '#ffffff'; g.fill();
    VEYE(g, 10, -36, 5.4, 6.4, '#ffd23f', '#c2459a', P);
    g.beginPath(); g.moveTo(14, -24); g.quadraticCurveTo(18, -22, 16, -18); g.lineTo(13, -20); g.closePath(); g.fillStyle = '#6a1f50'; g.fill();
    g.save(); g.translate(18, -30); g.rotate(-0.2 + lash * 0.6);
    RR(g, -1.2, -30, 2.4, 40, 1); g.fillStyle = lgr(g, '#fff0a0', '#c98a12', -1, 0, 1, 0); g.fill();
    g.fillStyle = lgr(g, '#fff6c2', '#e0a52a', 0, -42, 0, -28); [[-5, -30], [0, -34], [5, -30]].forEach(([x, y]) => { g.beginPath(); g.moveTo(x - 1.6, y + 3); g.lineTo(x, y - 8); g.lineTo(x + 1.6, y + 3); g.fill(); }); RR(g, -6, -30, 12, 3, 1.5); g.fill();
    g.restore();
    g.restore();
  }

  /* ---------- 보스: 폭풍 해적 부엉이 스톰윙 ---------- */
  function paintOwl(g, P) {
    const t = (P.breathe || 0) * TAU, mv = P.moving, ph = (P.walk || 0) * TAU, atk = P.atk == null ? -1 : P.atk, sw = swing(atk);
    const b = mv ? -Math.abs(Math.sin(ph)) * 2 : Math.sin(t) * 1;
    g.save(); g.scale(1.75, 1.75);
    for (const [x, p] of [[-6, 0], [4, 0.5]]) { const s = mv ? Math.sin(ph + p * TAU) * 3 : 0; st(g, 2.4, '#d99a2b'); g.beginPath(); g.moveTo(x, -8); g.lineTo(x + s, 0); g.stroke(); g.fillStyle = '#d99a2b'; [-2, 1, 4].forEach(dx => { g.beginPath(); g.moveTo(x + s, 0); g.lineTo(x + s + dx + 1, 1.2); g.lineTo(x + s + dx, 0); g.fill(); }); }
    g.beginPath(); g.moveTo(-14, -10 + b); g.quadraticCurveTo(-24, -30 + b, -10, -40 + b); g.lineTo(-22, -2 + b); g.closePath(); g.fillStyle = '#5a3a2a'; g.fill();
    E(g, -1, -24 + b, 15, 18); g.fillStyle = rg(g, '#8a6648', -1, -24 + b, 18, 0.3, 0.3); g.fill();
    g.beginPath(); g.moveTo(-6, -36 + b); g.lineTo(-14, -6 + b); g.lineTo(2, -10 + b); g.lineTo(12, -30 + b); g.closePath(); g.fillStyle = lgr(g, '#c62828', '#7a1414', 0, -36, 0, -8); g.fill();
    st(g, 1, '#ffd34d'); g.beginPath(); g.moveTo(-6, -36 + b); g.lineTo(-14, -6 + b); g.stroke();
    g.fillStyle = '#ffd34d'; [[4, -26], [2, -20], [0, -14]].forEach(([x, y]) => { E(g, x, y + b, 1.2, 1.2); g.fill(); });
    fe(g, 6, -18 + b, 7, 9, '#efe0c6'); for (let k = 0; k < 4; k++) { st(g, 0.8, 'rgba(120,80,50,.6)'); g.beginPath(); g.moveTo(3, -22 + k * 3 + b); g.quadraticCurveTo(6, -20 + k * 3 + b, 9, -22 + k * 3 + b); g.stroke(); }
    g.save(); g.translate(2, -44 + b);
    fe(g, 0, 0, 13, 12, '#8a6648', 0, 0.3, 0.3);
    fluff(g, 0, 0, 13, 12, Math.PI * 0.5, Math.PI * 1.0, 4, 3, '#8a6648');
    g.fillStyle = '#6b4a34'; g.beginPath(); g.moveTo(-6, -10); g.lineTo(-11, -20); g.lineTo(-1, -12); g.fill();
    E(g, 6, -1, 8, 8.5); g.fillStyle = rg(g, '#f2e3c8', 6, -1, 9, 0.3, 0.12); g.fill();
    VEYE(g, 7, -2, 4.6, 5.2, '#ff8f00', '#f2e3c8', P);
    g.beginPath(); g.moveTo(11, 2); g.quadraticCurveTo(18, 3, 15, 9); g.quadraticCurveTo(13, 6, 10, 5); g.closePath(); g.fillStyle = lgr(g, '#ffd34d', '#b8770f', 10, 2, 15, 9); g.fill();
    g.beginPath(); g.moveTo(-15, -8); g.quadraticCurveTo(0, -24, 16, -8); g.quadraticCurveTo(8, -12, 0, -11); g.quadraticCurveTo(-8, -12, -15, -8); g.closePath(); g.fillStyle = lgr(g, '#3a2a3a', '#120a12', 0, -22, 0, -8); g.fill();
    g.beginPath(); g.moveTo(-14, -9); g.quadraticCurveTo(-20, -14, -18, -18); g.quadraticCurveTo(-12, -12, -8, -11); g.fill();
    st(g, 1, '#ffd34d'); g.beginPath(); g.moveTo(-15, -8); g.quadraticCurveTo(0, -24, 16, -8); g.stroke();
    bone(g, 0, -15, 7, '#ffffff', 0.5); bone(g, 0, -15, 7, '#ffffff', -0.5); E(g, 0, -16.5, 2, 1.8); g.fillStyle = '#ffffff'; g.fill();
    g.restore();
    g.save(); g.translate(12, -24 + b); g.rotate(sw);
    RR(g, -1.6, -1, 3.2, 7, 1.2); g.fillStyle = '#5b3a22'; g.fill(); E(g, 0, -1.6, 5, 2); g.fillStyle = '#ffd34d'; g.fill();
    g.beginPath(); g.moveTo(-2, -3); g.quadraticCurveTo(-6, -18, 0, -34); g.quadraticCurveTo(3, -18, 2.4, -3); g.closePath(); g.fillStyle = lgr(g, '#ffffff', '#93a4b3', -3, 0, 3, 0); g.fill();
    g.restore();
    E(g, 12, -24 + b, 3.6, 3); g.fillStyle = '#8a6648'; g.fill();
    if (atk >= 0) { g.save(); g.globalCompositeOperation = 'lighter'; st(g, 1.5, 'rgba(180,220,255,.8)'); g.beginPath(); g.moveTo(-18, -48); g.lineTo(-12, -40); g.lineTo(-16, -36); g.lineTo(-10, -28); g.stroke(); g.restore(); }
    g.restore();
  }

  /* ---------- 최종 보스: 침묵의 군주 보이드 ---------- */
  function paintVoid(g, P) {
    const t = (P.breathe || 0) * TAU + (P.walk || 0) * TAU, atk = P.atk == null ? -1 : P.atk, reach = atk >= 0.35 && atk < 0.7 ? 1 : 0;
    const fy = -20 + Math.sin(t) * 3;
    g.save(); g.scale(1.9, 1.9); g.translate(0, fy);
    const aura = g.createRadialGradient(0, -34, 4, 0, -34, 46); aura.addColorStop(0, 'rgba(150,60,230,.45)'); aura.addColorStop(1, 'rgba(90,20,160,0)'); g.fillStyle = aura; E(g, 0, -30, 46, 46); g.fill();
    g.beginPath(); g.moveTo(-6, -64); g.bezierCurveTo(-24, -60, -28, -20, -24, 8); g.lineTo(-18, 2); g.lineTo(-14, 12); g.lineTo(-8, 4); g.lineTo(-3, 14); g.lineTo(2, 4); g.lineTo(8, 11); g.lineTo(12, 2); g.bezierCurveTo(18, -16, 22, -46, 6, -64); g.closePath();
    g.fillStyle = lgr(g, '#3a2458', '#0c0614', 0, -64, 0, 12); g.fill();
    st(g, 1, 'rgba(200,140,255,.35)'); g.beginPath(); g.moveTo(-14, -40); g.quadraticCurveTo(-18, -14, -16, 4); g.moveTo(-4, -44); g.quadraticCurveTo(-6, -16, -4, 10); g.stroke();
    g.beginPath(); g.moveTo(-10, -66); g.quadraticCurveTo(10, -78, 22, -56); g.quadraticCurveTo(26, -40, 14, -32); g.quadraticCurveTo(0, -30, -4, -40); g.quadraticCurveTo(-14, -52, -10, -66); g.closePath();
    g.fillStyle = lgr(g, '#4a2e70', '#160a24', 0, -76, 0, -32); g.fill();
    E(g, 10, -46, 9.5, 11); g.fillStyle = '#050208'; g.fill();
    VEYE(g, 12, -46, 5.6, 6.6, '#d07cff', '#050208', P);
    g.fillStyle = lgr(g, '#6a3fa0', '#1a0a2a', 0, -96, 0, -70);
    [[-6, -70, 12], [0, -73, 20], [7, -72, 15], [14, -66, 10]].forEach(([x, y, h]) => { g.beginPath(); g.moveTo(x - 3.4, y); g.lineTo(x + 1, y - h); g.lineTo(x + 3.4, y); g.closePath(); g.fill(); });
    E(g, 2, -72, 2.2, 2.2); g.fillStyle = '#ff5ad8'; g.fill();
    const hand = (x, y, s) => { g.save(); g.translate(x, y); g.scale(s, s); fe(g, 0, 0, 5, 4.2, '#2a1440'); g.fillStyle = '#1a0a2a'; [[4, -3], [6, 0], [4, 3]].forEach(([a, b2]) => { g.beginPath(); g.moveTo(a - 1, b2 - 1); g.lineTo(a + 6, b2); g.lineTo(a - 1, b2 + 1); g.fill(); }); g.restore(); };
    hand(-8, -22, 1); hand(16 + reach * 12, -28 - reach * 2, 1.2);
    st(g, 1.2, 'rgba(160,160,190,.7)'); g.setLineDash([2, 1.5]); g.beginPath(); g.moveTo(-14, -30); g.quadraticCurveTo(-4, -16, 10, -26); g.stroke(); g.setLineDash([]);
    shadowMark(g, -6, -28, 1.2);
    g.restore();
  }

  /* =========================================================
     스프라이트 캐시
     ========================================================= */
  const TYPES = {};
  function defType(id, paint, b) { TYPES[id] = { paint, b: b || { x0: -40, y0: -96, x1: 60, y1: 8 } }; }
  defType('granny', (g, P) => paintDog(g, LOOKS.granny, P));
  // v1.2: 기사단은 봉제인형(두 발로 선 3D 인형) 스타일
  const PB = { x0: -46, y0: -124, x1: 72, y1: 8 };
  function defPlush(id, K) { defType(id, (g, P) => paintPlush(g, K, P), PB); TYPES[id].soft = true; TYPES[id].K = K; }
  ['u0', 'u1', 'u2', 'u3', 'u4', 'u5', 'u6', 'u7', 'u8', 'u9'].forEach(k => defPlush(k, Object.assign({}, LOOKS[k], { pid: k })));
  // v1.1 2차 직업(승급) 모습: 금빛 장식 + 금 망토 + 직업별 업그레이드 (태산 금빛 탑 방패, 몽실 날개 간호 모자 등)
  ['u0', 'u1', 'u2', 'u3', 'u4', 'u5', 'u6', 'u7', 'u8', 'u9'].forEach(k => { const K = Object.assign({}, LOOKS[k], { promo: true }); if (!K.cape) K.cape = '#e8b02a'; K.collar = '#ffd34d'; K.tag = 'star'; K.pid = k; defPlush(k + 'p', K); });
  // v1.2 3차 직업 모습: 흰·금 망토 + 빛의 고리 + 금 장식
  ['u0', 'u1', 'u2', 'u3', 'u4', 'u5', 'u6', 'u7', 'u8', 'u9'].forEach(k => { const K = Object.assign({}, LOOKS[k], { promo: true, third: true, pid: k, cape: '#fff3d0', collar: '#ffd34d', tag: 'star' }); defPlush(k + 't', K); });
  defType('slime', (g, P) => feltSlime(g, P, '#8ed05a', 1, false), { x0: -28, y0: -44, x1: 30, y1: 8 });
  defPlush('wolf', WOLF_P); defPlush('sknight', SKN_P);
  defType('kkuruk', paintKkuruk, { x0: -74, y0: -150, x1: 82, y1: 16 });
  defType('rat', feltRat, { x0: -36, y0: -38, x1: 40, y1: 6 });
  defType('digger', feltDigger, { x0: -22, y0: -40, x1: 26, y1: 6 });
  defType('toad', feltToad, { x0: -32, y0: -44, x1: 32, y1: 6 });
  defType('bat', feltBat, { x0: -40, y0: -98, x1: 40, y1: -36 });
  defType('crab', feltCrab, { x0: -32, y0: -42, x1: 46, y1: 6 });
  defType('golem', (g, P) => { g.save(); g.scale(1.15, 1.15); feltGolem(g, P); g.restore(); }, { x0: -40, y0: -104, x1: 48, y1: 6 });
  defType('troll', pbTroll, { x0: -66, y0: -200, x1: 140, y1: 10 });
  defType('scorp', pbScorp, { x0: -56, y0: -122, x1: 104, y1: 8 });
  defType('frost', pbFrost, { x0: -66, y0: -196, x1: 84, y1: 12 });
  defType('kraken', pbKraken, { x0: -60, y0: -146, x1: 80, y1: 8 });
  defType('owl', pbOwl, { x0: -50, y0: -130, x1: 82, y1: 8 });
  defType('void', pbVoid, { x0: -72, y0: -236, x1: 104, y1: 16 });
  defType('noxgood', (g, P) => { g.save(); g.scale(1.3, 1.3); paintPlush(g, Object.assign({}, LOOKS.noxgood, { pid: 'noxgood' }), P); g.restore(); }, { x0: -64, y0: -170, x1: 96, y1: 12 }); TYPES.noxgood.soft = true;
  const NOXP = Object.assign({}, LOOKS.nox, { pid: 'nox' }); defType('nox', (g, P) => { g.save(); g.scale(1.65, 1.65); paintPlush(g, NOXP, P); g.restore(); }, { x0: -80, y0: -210, x1: 120, y1: 14 }); TYPES.nox.soft = true;
  [0, 1, 2].forEach(k => { defType(k === 1 ? 'mir' : 'mir' + k, (g, P) => { g.save(); g.scale(DRAGON_STAGE[k].sc * 1.3, DRAGON_STAGE[k].sc * 1.3); paintDragonMount(g, P, '#5fae7a', false, k); paintDragonMount(g, P, '#5fae7a', true, k); g.restore(); }, { x0: -70, y0: -110, x1: 110, y1: 10 }); TYPES[k === 1 ? 'mir' : 'mir' + k].soft = true; });
  defType('jelly', pbJelly, { x0: -80, y0: -230, x1: 100, y1: 14 });
  defType('dmir', paintDmir, { x0: -240, y0: -230, x1: 260, y1: 16 });
  defType('firstk', (g, P) => paintPlush(g, { pid: 'firstk', c1: '#fff6e8', c2: '#ffffff', c3: '#f0dcc0', ear: 'flop', tail: 'wag', helmet: true, plume: '#ffd34d', cape: '#fff3c0', sword: true, blade: '#fff6c8', bladeGlow: true, shield: true, shieldC: '#ffd34d', iris: '#4fb6ff', seed: 61 }, P), { x0: -46, y0: -124, x1: 72, y1: 8 }); TYPES.firstk.soft = true;
  defType('pet_chick', paintPetChick, { x0: -18, y0: -30, x1: 18, y1: 4 });
  defType('pet_hamster', paintPetHamster, { x0: -18, y0: -26, x1: 18, y1: 4 });
  defType('pet_turtle', paintPetTurtle, { x0: -18, y0: -24, x1: 20, y1: 4 });
  defType('pet_bokrabbit', paintPetRabbit, { x0: -16, y0: -38, x1: 16, y1: 4 });
  defType('pet_songsquirrel', paintPetSquirrel, { x0: -20, y0: -30, x1: 16, y1: 4 });
  defType('pet_pumpkinbat', paintPetPumpkinBat, { x0: -24, y0: -32, x1: 24, y1: 6 });
  defType('pet_babydeer', paintPetDeer, { x0: -12, y0: -36, x1: 20, y1: 4 });
  defType('rainturtle', pbRainTurtle, { x0: -90, y0: -130, x1: 140, y1: 14 });
  defType('shadowchild', pbShadowChild, { x0: -70, y0: -200, x1: 90, y1: 14 });
  defType('mtgiant', pbMtGiant, { x0: -110, y0: -230, x1: 120, y1: 14 });
  defType('echofairy', pbEchoFairy, { x0: -130, y0: -200, x1: 130, y1: 14 });
  defType('camelbot', pbCamelBot, { x0: -90, y0: -170, x1: 120, y1: 14 });
  defType('starfox', pbStarFox, { x0: -90, y0: -180, x1: 70, y1: 14 });
  defType('mossbear', pbMossBear, { x0: -100, y0: -200, x1: 100, y1: 14 });
  defType('dawndeer', pbDawnDeer, { x0: -70, y0: -280, x1: 130, y1: 14 });
  defType('bellknight', pbBellKnight, { x0: -100, y0: -190, x1: 100, y1: 14 });
  defType('badukshadow', pbBadukShadow, { x0: -100, y0: -200, x1: 100, y1: 14 });
  defType('icepenguin', pbIcePenguin, { x0: -100, y0: -180, x1: 100, y1: 14 });
  defType('songwhale', pbSongWhale, { x0: -170, y0: -200, x1: 130, y1: 14 });
  defType('thunderbird', pbThunderbird, { x0: -120, y0: -180, x1: 120, y1: 14 });
  defType('windelder', pbWindElder, { x0: -130, y0: -230, x1: 120, y1: 14 });
  defType('catgen', paintCatGen, { x0: -90, y0: -200, x1: 90, y1: 14 });
  defType('roc', paintRoc, { x0: -120, y0: -220, x1: 110, y1: 14 });
  defType('badger', paintBadger, { x0: -60, y0: -190, x1: 90, y1: 14 });
  defType('seaspirit', paintSeaSpirit, { x0: -130, y0: -190, x1: 100, y1: 14 });
  defType('spiderq', paintSpiderQ, { x0: -120, y0: -240, x1: 120, y1: 16 });
  defType('shadowk', paintShadowK, { x0: -100, y0: -250, x1: 150, y1: 16 }); TYPES.shadowk.soft = true;
  defType('cogowl', pbCogowl, { x0: -90, y0: -230, x1: 130, y1: 14 });
  defType('tcat', pbTcat, { x0: -200, y0: -230, x1: 140, y1: 14 });
  defType('mole', pbMole, { x0: -90, y0: -180, x1: 210, y1: 14 });
  defType('bonedra', pbBonedra, { x0: -140, y0: -200, x1: 160, y1: 14 });
  defType('whale', pbWhale, { x0: -200, y0: -190, x1: 190, y1: 30 });
  const FENP = Object.assign({}, LOOKS.fenrir, { pid: 'fenrir' }); defType('fenrir', (g, P) => { g.save(); g.scale(2.0, 2.0); paintPlush(g, FENP, P); g.restore(); }, { x0: -100, y0: -250, x1: 150, y1: 18 }); TYPES.fenrir.soft = true;
  defType('cgolem', pbCGolem, { x0: -80, y0: -230, x1: 90, y1: 12 });
  const SBP = Object.assign({}, LOOKS.sbori, { pid: 'sbori' }); defType('sbori', (g, P) => { g.save(); g.scale(1.6, 1.6); paintPlush(g, SBP, P); g.restore(); }, { x0: -80, y0: -210, x1: 120, y1: 14 }); TYPES.sbori.soft = true;

  const cache = new Map();
  let tmp = null;
  function outline(c, col, r) {
    if (!tmp || tmp.width < c.width || tmp.height < c.height) tmp = mk(Math.max(c.width, tmp ? tmp.width : 0), Math.max(c.height, tmp ? tmp.height : 0));
    const t = tmp.getContext('2d'); t.setTransform(1, 0, 0, 1, 0, 0); t.globalCompositeOperation = 'source-over'; t.clearRect(0, 0, tmp.width, tmp.height);
    t.drawImage(c, 0, 0); t.globalCompositeOperation = 'source-in'; t.fillStyle = col; t.fillRect(0, 0, c.width, c.height); t.globalCompositeOperation = 'source-over';
    const o = mk(c.width, c.height), og = o.getContext('2d');
    const n = 12; for (let i = 0; i < n; i++) { const a = i / n * TAU; og.drawImage(tmp, 0, 0, c.width, c.height, Math.cos(a) * r, Math.sin(a) * r, c.width, c.height); }
    og.drawImage(c, 0, 0); return o;
  }
  function poseOf(key) {
    const t = key[0], n = +key.slice(1) || 0;
    if (t === 'w') return { moving: true, walk: n / 10 };
    if (t === 'a') return { atk: n / 8 + 0.06 };
    if (key === 'ib') return { blink: true };
    if (key === 'hh') return { hurt: true };
    if (key === 'hp') return { happy: true, breathe: 0.25 };
    if (t === 'e') return { expr: key.slice(2), breathe: 0.25 };
    if (t === 'c') return { expr: key.slice(2), calm: true, breathe: 0.25 };
    return { breathe: n / 6 };
  }
  // v1.4 부드러운 전투: 걷기 10장 · 공격 8장 · 숨쉬기 6장
  const FRAMES = ['w0', 'w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7', 'w8', 'w9', 'a0', 'a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'i0', 'i1', 'i2', 'i3', 'i4', 'i5', 'ib'];
  const WKINDS = ['sword', 'axe', 'spear', 'hammer', 'great', 'katana', 'claw'];
  const HERO_BREEDS = [
    { n: '골든 리트리버', c1: '#f7c46c', c2: '#fff4dc', c3: '#d98f3c', ear: 'flop', tail: 'wag' },
    { n: '웰시코기', c1: '#f2a24a', c2: '#ffffff', c3: '#d9822e', ear: 'up', es: 1.3, tail: 'stub', mark: 'urajiro', leg: 0.6, bx: 1.15, tongue: true },
    { n: '시바견', c1: '#f08a3c', c2: '#fff3e2', c3: '#d4702a', ear: 'up', tail: 'curl', mark: 'urajiro', mz: 0.9 },
    { n: '비숑', c1: '#fffaf4', c2: '#ffffff', c3: '#f2e6da', ear: 'flop', tail: 'pom', curly: true, mz: 0.82 },
    { n: '진돗개', c1: '#fbf7ee', c2: '#ffffff', c3: '#e8dcc6', ear: 'up', tail: 'curl', mark: 'urajiro', leg: 1.08 },
    { n: '비글', c1: '#fff8ef', c2: '#ffffff', c3: '#a8642e', ear: 'flop', earLong: true, tail: 'wag', head: '#c97a3a', saddle: '#3b2a24', mark: 'blaze' },
    { n: '보더콜리', c1: '#2a2a33', c2: '#ffffff', c3: '#1a1a22', ear: 'up', es: 0.9, tail: 'plume', mark: 'blaze', cheekFluff: true },
  ];
  const HERO_FUR = [null, '#c98a4a', '#8a5a35', '#e8d0a8', '#5a5a64', '#2a2a33'];
  const HERO_HELM = ['knight', 'visor', 'none'];
  const HERO_PLUME = ['#ff4d4d', '#ff7ab6', '#4fb6ff', '#ffd34d', '#7ad97a', '#b48cff'];
  const HERO_CAPE = ['#2f6fe0', '#e53935', '#43a047', '#8e24aa', '#ff8f00', '#37474f'];
  const DRAGON_COL = ['#5fae7a', '#e0604a', '#4a8ae0', '#9a6ae0', '#e0b040'];
  function heroId(eq, cu) {
    const r = k => (eq && eq[k]) ? eq[k].r : -1, wk = eq && eq.weapon ? (eq.weapon.kind || 'sword') : 'sword', ak = eq && eq.armor ? (eq.armor.kind || 'vest') : 'vest';
    const c = cu || {}, cs = [c.breed | 0, c.fur | 0, c.helm | 0, c.plume | 0, c.cape | 0, c.mount === false ? 0 : 1, c.dragon | 0, c.grow == null ? 1 : c.grow | 0, c.pat | 0].join('.');
    return `hero_${r('weapon')}-${wk}_${r('armor')}-${ak}_${r('charm')}_${cs}`;
  }
  function ensureHeroType(id) {
    if (TYPES[id]) return;
    const p = id.split('_'), sp2 = x => { const m = /^(-?\d+)-(.*)$/.exec(x) || [0, '-1', '']; return [m[1], m[2]]; }, [wr, wk] = sp2(p[1]), [ar, ak] = sp2(p[2]), cr = +p[3], cs = (p[4] || '0.0.0.0.0.1.0.1').split('.').map(Number);
    const BR = HERO_BREEDS[cs[0]] || HERO_BREEDS[0], K = Object.assign({}, LOOKS.hero, { ear: 'flop', tail: 'wag', mark: null, head: null, saddle: null, curly: false, earLong: false }, BR, { hero: true });
    delete K.n; if (HERO_FUR[cs[1]]) { K.c1 = HERO_FUR[cs[1]]; K.c3 = DK(HERO_FUR[cs[1]], 0.15); if (K.head) K.head = DK(HERO_FUR[cs[1]], 0.05); }
    const hm = HERO_HELM[cs[2]] || 'knight'; K.helmet = hm !== 'none'; K.visor = hm === 'visor'; K.plume = HERO_PLUME[cs[3]] || '#ff4d4d'; K.cape = HERO_CAPE[cs[4]] || '#2f6fe0';
    const mount = cs[5] !== 0, dcol = DRAGON_COL[cs[6]] || DRAGON_COL[0];
    const w = +wr, a = +ar;
    if (w >= 0) { K.blade = ['#eef6ff', '#eef6ff', '#8fd3ff', '#ffd54f', '#ff9ef0'][w]; K.wgem = [null, null, '#2f8cff', '#ff7a1a', '#c040ff'][w]; if (w >= 3) K.bladeGlow = true; }
    if (wk && wk !== 'sword') { K.sword = false; K[wk === 'claw' ? 'dagger' : wk] = true; }
    if (a >= 0) K.armor = ['#b08968', '#9fb0bf', '#5aa9f5', '#ffcf3f', '#b07cff'][a];
    if (ak === 'robe' && a >= 0) K.cape = ['#7a5a3a', '#4a6a8a', '#2f5fb8', '#c62828', '#3b1a7a'][a];
    if (cr >= 0) K.shieldC = ['#3d8bff', '#43c56b', '#3d8bff', '#ff9f1c', '#c040ff'][cr];
    if (cr >= 2 && ak !== 'robe' && cs[4] === 0) K.cape = cr === 4 ? '#3b1a7a' : cr === 3 ? '#c62828' : '#6a3fd1';
    K.pid = 'hero';
    if (!mount) { defPlush(id, K); return; }
    const KR = Object.assign({}, K, { leg: 1, seated: true });
    const stg = Math.max(0, Math.min(2, cs[7] == null ? 1 : cs[7])), seat = dragonSeat(stg), DS = DRAGON_STAGE[stg], pat = cs[8] | 0;
    defType(id, (g, P) => {
      const bb = P.moving ? -Math.abs(Math.sin((P.walk || 0) * TAU)) * 2.2 * DS.sc : Math.sin((P.breathe || 0) * TAU) * 0.9 * DS.sc;
      curPat = pat; g.save(); g.scale(DS.sc, DS.sc); paintDragonMount(g, P, dcol, false, stg); g.restore();
      g.save(); g.scale(DS.sc, DS.sc); paintDragonMount(g, P, dcol, true, stg); g.restore(); curPat = 0;
      g.save(); g.translate(seat.x, seat.y + bb + 9); g.scale(0.8, 0.8); if (SPIMG.hero) paintSprite(g, SPIMG.hero, Object.assign({}, P, { moving: false }), 70, 'hero'); else paintPlush(g, KR, Object.assign({}, P, { moving: false }));
      g.restore();
    }, { x0: -46 * DS.sc, y0: -130 * DS.sc, x1: 76 * DS.sc, y1: 10 }); TYPES[id].soft = true; TYPES[id].mount = true;
  }
  // v1.2 그림 팩 스프라이트: art/sprite/<id>.png 를 넣으면 코드 그림 대신 사용 (오른쪽을 보는 투명 PNG, 발바닥이 그림 아래쪽)
  const SPIMG = {};
  function setSpriteImage(id, im) { SPIMG[id] = im; for (const k of [...cache.keys()]) if (k.startsWith(id + '|') || (id === 'hero' && k.startsWith('hero_')) || (/^u\d$/.test(id) && k.startsWith(id + 'p|'))) cache.delete(k); }
  function spriteFor(type) {
    if (SPIMG[type]) return SPIMG[type];
    if (type.startsWith('hero_') && SPIMG.hero) return SPIMG.hero;
    if (/^u\dp$/.test(type) && SPIMG[type.slice(0, 2)]) return SPIMG[type.slice(0, 2)];
    return null;
  }
  function paintSprite(g, im, P, Hh, type) {
    const walk = P.walk || 0, mv = !!P.moving, atk = P.atk == null ? -1 : P.atk, br = Math.sin((P.breathe || 0) * TAU);
    const bob = mv ? -Math.abs(Math.sin(walk * TAU)) * 3 : br * 0.8, strike = atk >= 0.35 && atk < 0.7;
    const h = Hh, w = im.width / im.height * h;
    g.save(); g.translate(strike ? 4 : atk >= 0 && atk < 0.35 ? -2 : 0, bob);
    g.rotate(P.hurt ? -0.12 : strike ? 0.1 : mv ? Math.sin(walk * TAU) * 0.04 : 0);
    g.scale(strike ? 1.06 : 1, mv ? 1 + Math.sin(walk * TAU * 2) * 0.02 : 1 + br * 0.012);
    g.drawImage(im, -w / 2, -h, w, h);
    if (/^u\dp$/.test(type) && !SPIMG[type]) { g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(255,210,80,.18)'; g.fillRect(-w / 2, -h, w, h); }
    g.restore();
  }
  // v1.3 펠트 천 결 (모든 몬스터·용·보스에 입히는 보송보송 질감)
  let feltC = null;
  function feltPat(g) {
    if (!feltC) { feltC = mk(96, 96); const f = feltC.getContext('2d'); let sd = 7; const R = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
      for (let k = 0; k < 900; k++) { const x = R() * 96, y = R() * 96, a = R() * TAU, l = 1 + R() * 2.4; f.strokeStyle = R() < 0.5 ? 'rgba(255,255,255,.10)' : 'rgba(60,30,20,.08)'; f.lineWidth = 0.8; f.beginPath(); f.moveTo(x, y); f.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); f.stroke(); } }
    return g.createPattern(feltC, 'repeat');
  }
  function frame(type, key) {
    const ck = type + '|' + key; let f = cache.get(ck); if (f) return f;
    if (type.startsWith('hero_')) ensureHeroType(type);
    const spi = spriteFor(type), T0 = TYPES[type];
    if (spi && !(T0 && T0.mount)) {
      const b = T0 ? T0.b : { x0: -46, y0: -124, x1: 72, y1: 8 }, Hh = (window.ARTPACK && ARTPACK.spriteH && ARTPACK.spriteH[type]) || (T0 && T0.soft ? 84 : (b.y1 - b.y0) * 0.86);
      const w = (b.x1 - b.x0) * SS + PAD * 2, h = (b.y1 - b.y0) * SS + PAD * 2, c = mk(w, h), g = c.getContext('2d'), ox = PAD - b.x0 * SS, oy = PAD - b.y0 * SS;
      g.translate(ox, oy); g.scale(SS, SS); paintSprite(g, spi, poseOf(key), Hh, type);
      f = { c, ox, oy, w: null }; cache.set(ck, f); return f;
    }
    const T = TYPES[type], b = T.b, w = (b.x1 - b.x0) * SS + PAD * 2, h = (b.y1 - b.y0) * SS + PAD * 2;
    const c = mk(w, h), g = c.getContext('2d');
    const ox = PAD - b.x0 * SS, oy = PAD - b.y0 * SS;
    g.translate(ox, oy); g.scale(SS, SS);
    T.paint(g, poseOf(key));
    { g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-atop'; const lg = g.createLinearGradient(0, 0, w * 0.4, h); lg.addColorStop(0, 'rgba(255,250,235,.16)'); lg.addColorStop(0.45, 'rgba(255,250,235,0)'); lg.addColorStop(0.8, 'rgba(60,20,0,0)'); lg.addColorStop(1, 'rgba(60,20,0,.2)'); g.fillStyle = lg; g.fillRect(0, 0, w, h); g.globalCompositeOperation = 'source-over'; }
    if (!T.soft) { g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = feltPat(g); g.fillRect(0, 0, w, h); g.globalCompositeOperation = 'source-over'; }
    f = { c: T.soft ? outline(c, '#7a5236', 1.3) : outline(c, '#5a3424', 2.0), ox, oy, w: null };
    cache.set(ck, f); return f;
  }
  // v1.4 칸 맞춤: 실제로 그려진 부분(투명 아닌 픽셀)의 범위를 재서, 정해진 칸 안에 꼭 맞게 그림
  const tightC = new Map();
  function tight(type, key) {
    const ck = type + '|' + key; let t = tightC.get(ck); if (t) return t;
    const f = frame(type, key), c = f.c, w = c.width, h = c.height, d = c.getContext('2d').getImageData(0, 0, w, h).data;
    let x0 = w, y0 = h, x1 = 0, y1 = 0;
    for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) if (d[(y * w + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 <= x0) { x0 = 0; y0 = 0; x1 = w; y1 = h; }
    t = { x0: (x0 - f.ox) / SS, x1: (x1 - f.ox) / SS, y0: (y0 - f.oy) / SS, y1: (y1 - f.oy) / SS }; tightC.set(ck, t); return t;
  }
  function drawFit(ctx, type, key, cx, cy, bw, bh, o) {
    o = o || {}; const t = tight(type, key); let { x0, x1, y0, y1 } = t;
    if (o.face) y1 = y0 + (y1 - y0) * o.face;
    const s = Math.min(bw / Math.max(1, x1 - x0), bh / Math.max(1, y1 - y0)) * (o.pad || 0.94) * (o.zoom || 1), mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    draw(ctx, type, key, o.flip ? cx + mx * s : cx - mx * s, cy - my * s + (o.dy || 0), s, !!o.flip, o.flash || 0);
  }
  function white(f) {
    if (f.w) return f.w;
    const c = mk(f.c.width, f.c.height), g = c.getContext('2d');
    g.drawImage(f.c, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
    return (f.w = c);
  }
  function draw(ctx, type, key, x, y, s, flip, flash) {
    const f = frame(type, key);
    ctx.save(); ctx.translate(x, y); ctx.scale((flip ? -s : s) / SS, s / SS);
    ctx.drawImage(f.c, -f.ox, -f.oy);
    if (flash > 0) { ctx.globalAlpha = Math.min(1, flash); ctx.drawImage(white(f), -f.ox, -f.oy); }
    ctx.restore();
  }
  function warm(types, budgetMs) {
    const t0 = performance.now();
    for (const ty of types) for (const k of FRAMES) { if (performance.now() - t0 > (budgetMs || 1e9)) return false; frame(ty, k); }
    return true;
  }
  function clearHeroCache(keep) { for (const k of cache.keys()) if (k.startsWith('hero_') && !k.startsWith(keep + '|')) cache.delete(k); }

  /* =========================================================
     배경 (테마별 다층)
     ========================================================= */
  function seeded(s) { return function () { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const THEMES = [
    { name: '햇살 들판', sky: ['#5cb8f2', '#a9defc', '#fff2cf'], sun: '#fff7c2', far: '#8fbcdc', farTop: '#b6d6ea', mid: '#78c860', mid2: '#4e9e45', near: '#3f8a39', g1: '#a77b4a', g2: '#6f4b2c', top: '#69c247', path: '#c99a62', kind: 'meadow', amb: 'petal' },
    { name: '도토리 숲', sky: ['#4f9fb0', '#a8d8c9', '#f1f5d6'], sun: '#fffbd1', far: '#5f8f8a', farTop: '#7fa9a0', mid: '#3c8a50', mid2: '#2a6a3c', near: '#235c33', g1: '#7a5a38', g2: '#4d3622', top: '#4c9a45', path: '#a07a4c', kind: 'forest', amb: 'leaf' },
    { name: '모래 언덕', sky: ['#f7a35c', '#ffd49a', '#fff4dc'], sun: '#fff4c4', far: '#d9a26a', farTop: '#e9bd88', mid: '#e8b56a', mid2: '#c9914b', near: '#b07a3b', g1: '#d3a061', g2: '#a8723c', top: '#e7c27d', path: '#e9c98f', kind: 'desert', amb: 'sand' },
    { name: '눈꽃 설원', sky: ['#7fa6d9', '#c3d8f2', '#f4f8ff'], sun: '#ffffff', far: '#a3b7d4', farTop: '#dfe8f5', mid: '#e7eef8', mid2: '#c3d2e8', near: '#9fb3cf', g1: '#c9d6e8', g2: '#8fa3bf', top: '#f7fbff', path: '#dde6f2', kind: 'snow', amb: 'snow' },
    { name: '불꽃 화산', sky: ['#2b1530', '#7a2f3a', '#f08a4b'], sun: '#ffb070', far: '#4a2a35', farTop: '#6a3a45', mid: '#4a3036', mid2: '#33222a', near: '#2a1b20', g1: '#4a3530', g2: '#24181a', top: '#6e3a2c', path: '#5e4038', kind: 'volcano', amb: 'ember' },
    { name: '별빛 해안', sky: ['#2f86d6', '#9fd8f5', '#fff1d6'], sun: '#fff3c0', far: '#4f9ec4', farTop: '#7fc0dc', mid: '#f0d9a0', mid2: '#d9b97a', near: '#5fa35a', g1: '#ecd49c', g2: '#c9a46a', top: '#f6e6b8', path: '#fbf0d0', kind: 'coast', amb: 'bubble' },
    { name: '구름 왕국', sky: ['#7fa8ff', '#cfe0ff', '#fff2ff'], sun: '#ffffff', far: '#e2e9ff', farTop: '#ffffff', mid: '#e3ebff', mid2: '#b9c8f0', near: '#ffffff', g1: '#eef2fd', g2: '#b7c3e6', top: '#ffffff', path: '#ffe7a3', kind: 'sky', amb: 'feather' },
    { name: '수정 동굴', sky: ['#0d1430', '#1f2a5c', '#3a3f7a'], sun: '#9fe8ff', far: '#1a2048', farTop: '#2c3570', mid: '#2a2f55', mid2: '#171a35', near: '#3a3570', g1: '#2e2f50', g2: '#141528', top: '#4a4f80', path: '#3f4470', kind: 'crystal', amb: 'sparkle' },
    { name: '그림자 늪', sky: ['#120820', '#33194a', '#5e3260'], sun: '#d08cff', far: '#26162f', farTop: '#3a2148', mid: '#2b2a22', mid2: '#18170f', near: '#1f2a1a', g1: '#302a24', g2: '#120e0a', top: '#384a28', path: '#3a3030', kind: 'swamp', amb: 'wisp' },
    { name: '별의 성', sky: ['#05061a', '#1a1450', '#4a2a78'], sun: '#fff6d8', far: '#211a4a', farTop: '#3a2c70', mid: '#2a2050', mid2: '#150f30', near: '#5a4a9a', g1: '#3a3260', g2: '#1a1530', top: '#bfb3ff', path: '#6a5aa8', kind: 'castle', amb: 'star' },
    { name: '별의 바다', sky: ['#020a2a', '#0b2a6a', '#2a5aa8'], sun: '#cfe8ff', far: '#0d2350', farTop: '#1e3c7a', mid: '#163a78', mid2: '#0a1c40', near: '#2a64b0', g1: '#1c3f7a', g2: '#0b1a38', top: '#7fc8ff', path: '#3e7ac8', kind: 'starsea', amb: 'star' },
    { name: '오로라 신전', sky: ['#0a1830', '#1c4a5a', '#7fd8c0'], sun: '#ffffff', far: '#2a4a5a', farTop: '#4a7a8a', mid: '#e8f0f4', mid2: '#a8c0cc', near: '#d8e8f0', g1: '#e0e8ee', g2: '#90a8b8', top: '#ffffff', path: '#f0e0b0', kind: 'aurora', amb: 'sparkle' },
    { name: '두더지 광산 도시', sky: ['#120a06', '#2e1a10', '#5a3a22'], sun: '#ffc070', far: '#3a2416', farTop: '#5a3a24', mid: '#4a3020', mid2: '#2a1a10', near: '#6a4a2a', g1: '#5a4030', g2: '#2a1a10', top: '#8a6a40', path: '#7a5a3a', kind: 'mine', amb: 'dust' },
    { name: '화석 정원', sky: ['#04161a', '#0c3a3a', '#2a6a5a'], sun: '#bfffe0', far: '#0e2e2e', farTop: '#1e4a46', mid: '#1c4a3a', mid2: '#0e2a22', near: '#2a6a4a', g1: '#c9b48a', g2: '#7a6a4a', top: '#4a8a5a', path: '#d9c8a0', kind: 'fossil', amb: 'spore' },
    { name: '태엽 마을', sky: ['#e8a86a', '#f4cc94', '#fde6c0'], sun: '#ffe2a0', far: '#a8744e', farTop: '#c9925f', mid: '#8a5a3a', mid2: '#5a3a22', near: '#6e8a4a', g1: '#a88a64', g2: '#5a4030', top: '#c8a070', path: '#b8946a', kind: 'clock', amb: 'cog' },
    { name: '시간의 탑', sky: ['#14103a', '#3a2a6a', '#9a6aa8'], sun: '#ffd9a0', far: '#2a2050', farTop: '#4a3a7a', mid: '#3a2a5a', mid2: '#1e1638', near: '#4a3a6a', g1: '#5a4a7a', g2: '#2a2040', top: '#9a8ac0', path: '#7a6aa0', kind: 'tower', amb: 'sand' },
    { name: '구름사탕 해변', sky: ['#f7b8d8', '#fbd3e6', '#d8f4f0'], sun: '#fff3b0', far: '#f2a8c8', farTop: '#ffd0e4', mid: '#a8e0d8', mid2: '#78c0b8', near: '#ffb0d0', g1: '#ffe6c8', g2: '#e8b890', top: '#fff0dc', path: '#ffd8b0', kind: 'candy', amb: 'sparkle' },
    { name: '거꾸로 바다', sky: ['#0a2a40', '#14506a', '#2a7a8a'], sun: '#9ff0ff', far: '#123848', farTop: '#1e5068', mid: '#1a4458', mid2: '#0c2434', near: '#2a6a6a', g1: '#2a4a5a', g2: '#0e2230', top: '#5a9aa8', path: '#3a6a7a', kind: 'upside', amb: 'bubble' },
    { name: '별빛 정원', sky: ['#120a3a', '#2e1e6e', '#7a5ab8'], sun: '#e8e0ff', far: '#2a1e5a', farTop: '#4a3a8a', mid: '#3a2a7a', mid2: '#22164a', near: '#5a4aa0', g1: '#4a3a80', g2: '#221848', top: '#9a8ae0', path: '#8a7ac8', kind: 'stargarden', amb: 'sparkle' },
    { name: '첫 번째 기사의 성', sky: ['#2a1a4a', '#8a5a8a', '#f4c890'], sun: '#fff0c0', far: '#5a3a6a', farTop: '#8a6a9a', mid: '#6a4a6a', mid2: '#3a2440', near: '#7a6a8a', g1: '#e8dcc8', g2: '#a89880', top: '#fff6e0', path: '#f0e0c0', kind: 'firstcastle', amb: 'sparkle' },
    { name: '야옹 공화국', sky: ['#ff9a7a', '#ffc8a0', '#fff0d8'], sun: '#fff0c0', far: '#c87a6a', farTop: '#e8a08a', mid: '#a85a4a', mid2: '#7a3a30', near: '#5a8a4a', g1: '#d8b890', g2: '#9a7a58', top: '#e8d0a8', path: '#e0c090', kind: 'catrep', amb: 'petal' },
    { name: '깃털 군도', sky: ['#4ab0f0', '#9adcff', '#f0faff'], sun: '#ffffff', far: '#8ac0e0', farTop: '#b0d8f0', mid: '#5aa070', mid2: '#3a7a50', near: '#4a9a5a', g1: '#c8b090', g2: '#8a7058', top: '#7ac860', path: '#d8c8a0', kind: 'feather', amb: 'feather' },
    { name: '굴굴 연방', sky: ['#2a1a10', '#5a3a20', '#a8703a'], sun: '#ffc860', far: '#3a2618', farTop: '#5a3a24', mid: '#4a3020', mid2: '#2a1a10', near: '#6a4a2a', g1: '#8a6a44', g2: '#4a3220', top: '#a8844a', path: '#c09a60', kind: 'burrow', amb: 'ember' },
    { name: '이름 없는 바다', sky: ['#0a1030', '#1a3060', '#3a6a9a'], sun: '#c8f0ff', far: '#14244a', farTop: '#24406a', mid: '#1a3a5a', mid2: '#0e2238', near: '#2a5a7a', g1: '#3a5a6a', g2: '#1a2a3a', top: '#6aa0b0', path: '#4a7a8a', kind: 'namesea', amb: 'bubble' },
    { name: '무지개 다리', sky: ['#8ad0ff', '#d8c8ff', '#fff0e8'], sun: '#ffffff', far: '#b8b0e8', farTop: '#d8d0ff', mid: '#ffc8e0', mid2: '#e8a0c8', near: '#a8e0c8', g1: '#f0e8ff', g2: '#c8b8e8', top: '#ffffff', path: '#ffe8f0', kind: 'rainbow', amb: 'sparkle' },
    { name: '그림자 아이의 마을', sky: ['#2a2048', '#6a4a7a', '#d89a8a'], sun: '#ffd8b0', far: '#3a2a50', farTop: '#5a4a6a', mid: '#4a3a5a', mid2: '#2a1e38', near: '#5a5a6a', g1: '#8a8090', g2: '#4a4050', top: '#a8a0b0', path: '#9a90a0', kind: 'shadowvil', amb: 'wisp' },
    { name: '소리 없는 산', sky: ['#9ab8d8', '#c8d8ea', '#f0f4f8'], sun: '#fffbe8', far: '#a8b8cc', farTop: '#e8f0f8', mid: '#8a9cb0', mid2: '#6a7c92', near: '#9ab0a0', g1: '#e8eef4', g2: '#a8b8c4', top: '#ffffff', path: '#d0d8e0', kind: 'silentmt', amb: 'snow' },
    { name: '메아리 동굴', sky: ['#140e2a', '#2a1e4a', '#4a3a7a'], sun: '#bfe8ff', far: '#1e163a', farTop: '#3a2e60', mid: '#2e2450', mid2: '#1a1434', near: '#4a3a70', g1: '#5a4a80', g2: '#2a2048', top: '#8a7ac0', path: '#6a5aa0', kind: 'echocave', amb: 'sparkle' },
    { name: '사막의 별시장', sky: ['#1a1440', '#3a2a6a', '#c87a5a'], sun: '#ffe8b0', far: '#4a3060', farTop: '#7a5080', mid: '#6a4a5a', mid2: '#3a2a3a', near: '#c89060', g1: '#e8c088', g2: '#b08050', top: '#f0d8a0', path: '#e0b878', kind: 'starmarket', amb: 'sparkle' },
    { name: '모래시계 궁전', sky: ['#f0a860', '#f8d090', '#fff0d0'], sun: '#fff6d0', far: '#d8a070', farTop: '#f0c890', mid: '#e8b878', mid2: '#c08850', near: '#d8a868', g1: '#f0d098', g2: '#c89858', top: '#fff0c0', path: '#f0d8a8', kind: 'hourglass', amb: 'sand' },
    { name: '잠든 시계 숲', sky: ['#14243a', '#24465a', '#4a7a80'], sun: '#d8f0ff', far: '#1e3a40', farTop: '#2e5050', mid: '#28483e', mid2: '#18302a', near: '#3a5a48', g1: '#4a6a50', g2: '#2a4030', top: '#7aa080', path: '#5a8068', kind: 'clockforest', amb: 'wisp' },
    { name: '첫 아침의 정원', sky: ['#38386a', '#8a6a9a', '#f0b0a0'], sun: '#fff0d0', far: '#6a5a8a', farTop: '#9a80b0', mid: '#a080a8', mid2: '#7a5a88', near: '#b0d0a0', g1: '#d0e0b8', g2: '#90a880', top: '#f0f8e0', path: '#e0e8c8', kind: 'dawngarden', amb: 'sparkle' },
    { name: '바람의 일족 둥지', sky: ['#7ab8e8', '#b8dcf4', '#f0f8ff'], sun: '#ffffff', far: '#c8e0f0', farTop: '#ffffff', mid: '#a8c8e0', mid2: '#88a8c8', near: '#d8e8f0', g1: '#f0f8ff', g2: '#c0d8e8', top: '#ffffff', path: '#e0eef8', kind: 'windnest', amb: 'snow' },
    { name: '폭풍 왕관', sky: ['#2a2a4a', '#4a4a7a', '#7a7aa8'], sun: '#e0e8ff', far: '#3a3a5a', farTop: '#5a5a80', mid: '#4a4a6a', mid2: '#2a2a40', near: '#6a6a8a', g1: '#8a8aa8', g2: '#4a4a68', top: '#b0b0d0', path: '#9090b0', kind: 'stormcrown', amb: 'wisp' },
    { name: '얼음 바다 항구', sky: ['#8ac8f0', '#c8e8fa', '#f4fbff'], sun: '#ffffff', far: '#d8ecf8', farTop: '#ffffff', mid: '#b8d8ec', mid2: '#90b8d4', near: '#e0f0fa', g1: '#f4faff', g2: '#c8e0f0', top: '#ffffff', path: '#e4f2fc', kind: 'icehaven', amb: 'snow' },
    { name: '고래 노래 동굴', sky: ['#1a1a4a', '#2a2a6a', '#4a3a8a'], sun: '#d8c8ff', far: '#2a2a5a', farTop: '#4a4a8a', mid: '#3a3a70', mid2: '#24244a', near: '#4a4a80', g1: '#6a6aa8', g2: '#3a3a68', top: '#9a9ad8', path: '#7a7ab8', kind: 'whalecave', amb: 'wisp' },
    { name: '백 년 전 야옹 공화국', sky: ['#c8a878', '#e8d0a8', '#f8ecd4'], sun: '#fff4d8', far: '#c8b090', farTop: '#e8d4b0', mid: '#b09878', mid2: '#988060', near: '#d8c4a0', g1: '#e8d8b8', g2: '#c0a880', top: '#f4e8d0', path: '#e0ccaa', kind: 'oldcatrep', amb: 'petal' },
    { name: '바둑이의 마지막 성문', sky: ['#4a3a5a', '#8a5a6a', '#e8a07a'], sun: '#ffd8a0', far: '#5a4a6a', farTop: '#7a6a8a', mid: '#5a4a5a', mid2: '#3a2e40', near: '#7a6070', g1: '#a08890', g2: '#6a5468', top: '#c8b0b8', path: '#b09aa8', kind: 'lastgate', amb: 'ember' },
  ];
  const TW = 1440, BGS = 1.5;
  const bgCache = {};
  function periodic(x, seeds) { let v = 0; for (const [k, amp, p] of seeds) v += Math.sin(x / TW * TAU * k + p) * amp; return v; }
  function tree(g, x, y, s, kind, rnd, col, col2) {
    if (kind === 'pine' || kind === 'snowpine') {
      RR(g, x - 2 * s, y - 8 * s, 4 * s, 9 * s, 1); g.fillStyle = '#5b3d27'; g.fill();
      for (let i = 0; i < 3; i++) {
        const w = (16 - i * 4) * s, ty = y - 6 * s - i * 9 * s;
        g.beginPath(); g.moveTo(x - w, ty); g.lineTo(x, ty - 16 * s); g.lineTo(x + w, ty); g.closePath(); g.fillStyle = lgr(g, LI(col, 0.12), DK(col, 0.2), x - w, 0, x + w, 0); g.fill();
        if (kind === 'snowpine') { g.beginPath(); g.moveTo(x - w * 0.55, ty - 7 * s); g.lineTo(x, ty - 16 * s); g.lineTo(x + w * 0.55, ty - 7 * s); g.quadraticCurveTo(x, ty - 9 * s, x - w * 0.55, ty - 7 * s); g.fillStyle = '#fbfdff'; g.fill(); }
      }
      return;
    }
    if (kind === 'palm') {
      st(g, 4 * s, '#8a6236'); g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 8 * s, y - 24 * s, x + 4 * s, y - 46 * s); g.stroke();
      for (let k = 0; k < 6; k++) { const a = -Math.PI / 2 + (k - 2.5) * 0.55; g.save(); g.translate(x + 4 * s, y - 46 * s); g.rotate(a + Math.PI / 2); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(8 * s, -6 * s, 22 * s, 4 * s); g.quadraticCurveTo(9 * s, 1 * s, 0, 2 * s); g.fillStyle = lgr(g, '#5fb74e', '#2f7a3a', 0, -6, 0, 6); g.fill(); g.restore(); }
      E(g, x + 4 * s, y - 44 * s, 3 * s, 3 * s); g.fillStyle = '#6b4a2a'; g.fill(); return;
    }
    if (kind === 'island') {
      g.beginPath(); g.moveTo(x - 40 * s, y); g.quadraticCurveTo(x, y + 40 * s, x + 40 * s, y); g.closePath(); g.fillStyle = lgr(g, '#a98a6a', '#6b5038', 0, y, 0, y + 30 * s); g.fill();
      E(g, x, y, 42 * s, 8 * s); g.fillStyle = '#9fd47a'; g.fill();
      RR(g, x - 10 * s, y - 30 * s, 20 * s, 30 * s, 2); g.fillStyle = lgr(g, '#ffffff', '#d6def5', 0, y - 30 * s, 0, y); g.fill();
      g.beginPath(); g.moveTo(x - 13 * s, y - 30 * s); g.lineTo(x, y - 44 * s); g.lineTo(x + 13 * s, y - 30 * s); g.closePath(); g.fillStyle = '#6a8fe8'; g.fill();
      E(g, x, y - 18 * s, 3 * s, 4 * s); g.fillStyle = '#ffd67a'; g.fill(); return;
    }
    if (kind === 'swamptree') {
      st(g, 5 * s, col); g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x - 6 * s, y - 20 * s, x + 2 * s, y - 40 * s); g.stroke();
      st(g, 2.4 * s, col); g.beginPath(); g.moveTo(x + 1 * s, y - 28 * s); g.quadraticCurveTo(x + 14 * s, y - 34 * s, x + 18 * s, y - 46 * s); g.moveTo(x, y - 34 * s); g.quadraticCurveTo(x - 12 * s, y - 40 * s, x - 16 * s, y - 52 * s); g.moveTo(x + 2 * s, y - 40 * s); g.lineTo(x + 6 * s, y - 52 * s); g.stroke();
      st(g, 1 * s, 'rgba(90,120,70,.6)'); for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(x - 10 * s + k * 7 * s, y - 40 * s); g.lineTo(x - 10 * s + k * 7 * s, y - 26 * s); g.stroke(); }
      return;
    }
    if (kind === 'cactus') {
      g.fillStyle = lgr(g, '#7fb357', '#4f7f34', x - 5 * s, 0, x + 5 * s, 0);
      RR(g, x - 4 * s, y - 34 * s, 8 * s, 34 * s, 4 * s); g.fill(); RR(g, x - 13 * s, y - 24 * s, 6 * s, 12 * s, 3 * s); g.fill(); RR(g, x - 13 * s, y - 15 * s, 10 * s, 5 * s, 2.5 * s); g.fill();
      RR(g, x + 7 * s, y - 28 * s, 6 * s, 13 * s, 3 * s); g.fill(); RR(g, x + 3 * s, y - 18 * s, 10 * s, 5 * s, 2.5 * s); g.fill();
      return;
    }
    if (kind === 'dead') {
      st(g, 3 * s, '#2a1a1a'); g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - 30 * s); g.moveTo(x, y - 18 * s); g.lineTo(x - 10 * s, y - 28 * s); g.moveTo(x, y - 22 * s); g.lineTo(x + 9 * s, y - 34 * s); g.stroke(); return;
    }
    RR(g, x - 2.5 * s, y - 14 * s, 5 * s, 15 * s, 2); g.fillStyle = lgr(g, '#8a5a35', '#5b3a22', x - 3, 0, x + 3, 0); g.fill();
    const blobs = [[0, -26, 13], [-9, -19, 9], [9, -19, 9.5], [0, -36, 9]];
    for (const [bx, by, r] of blobs) { E(g, x + bx * s, y + by * s, r * s, r * s); g.fillStyle = rg(g, col, x + bx * s, y + by * s, r * s, 0.25, 0.2); g.fill(); }
    if (rnd() < 0.5 && kind === 'round') for (let i = 0; i < 3; i++) { E(g, x + (rnd() - 0.5) * 16 * s, y - (20 + rnd() * 16) * s, 1.8 * s, 1.8 * s); g.fillStyle = rnd() < 0.5 ? '#ff6b6b' : '#ffd34d'; g.fill(); }
  }
  function crystalShard(g, x, y, h, w, col, glow) {
    if (glow) { const gl = g.createRadialGradient(x, y - h * 0.5, 0, x, y - h * 0.5, h); gl.addColorStop(0, rgba(col, 0.35)); gl.addColorStop(1, rgba(col, 0)); g.fillStyle = gl; g.fillRect(x - h, y - h * 1.5, h * 2, h * 2); }
    g.beginPath(); g.moveTo(x - w, y); g.lineTo(x - w * 0.8, y - h * 0.75); g.lineTo(x, y - h); g.lineTo(x + w * 0.8, y - h * 0.75); g.lineTo(x + w, y); g.closePath();
    g.fillStyle = lgr(g, LI(col, 0.55), DK(col, 0.35), x - w, 0, x + w, 0); g.fill(); st(g, 1, rgba(DK(col, 0.6), 0.8)); g.stroke();
    g.beginPath(); g.moveTo(x - w * 0.8, y - h * 0.75); g.lineTo(x, y - h); g.lineTo(x - w * 0.1, y); g.lineTo(x - w, y); g.closePath(); g.fillStyle = 'rgba(255,255,255,.28)'; g.fill();
  }
  function gearShape(g, x, y, r, teeth, col, rot) {
    g.save(); g.translate(x, y); g.rotate(rot || 0); g.beginPath();
    for (let k = 0; k < teeth * 2; k++) { const a0 = k / (teeth * 2) * TAU, a1 = (k + 1) / (teeth * 2) * TAU, rr = k % 2 ? r : r * 1.16; g.arc(0, 0, rr, a0, a1); }
    g.closePath(); g.arc(0, 0, r * 0.38, 0, TAU, true); g.fillStyle = col; g.fill('evenodd'); g.restore();
  }
  function castleSil(g, x, base, s) {
    g.save(); g.translate(x, 0); g.scale(s, 1);
    const body = lgr(g, '#4a3a90', '#1a1340', 0, base - 260, 0, base);
    const tw = (cx, w, h) => { g.fillStyle = body; g.fillRect(cx - w / 2, base - h, w, h); g.fillStyle = '#5a3aa0'; g.beginPath(); g.moveTo(cx - w / 2 - 6, base - h); g.lineTo(cx, base - h - w * 1.3); g.lineTo(cx + w / 2 + 6, base - h); g.fill(); g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(cx - w / 2, base - h, w * 0.3, h); E(g, cx, base - h - w * 1.3 - 4, 3, 3); g.fillStyle = '#ffe27a'; g.fill(); };
    g.fillStyle = body; g.fillRect(-140, base - 90, 280, 90);
    g.fillStyle = '#1a1340'; for (let bx = -140; bx < 140; bx += 16) g.fillRect(bx, base - 98, 9, 8);
    g.fillStyle = 'rgba(0,0,0,.35)'; RR(g, -22, base - 50, 44, 50, 20); g.fill(); tw(-150, 36, 150); tw(150, 36, 150); tw(-70, 30, 190); tw(70, 30, 190); tw(0, 46, 250);
    g.fillStyle = 'rgba(255,220,130,.9)'; for (const [wx, wy] of [[-150, 110], [150, 110], [-70, 150], [70, 150], [0, 200], [0, 160], [-110, 60], [110, 60], [-30, 60], [30, 60]]) { RR(g, wx - 4, base - wy, 8, 12, 4); g.fill(); }
    g.restore();
  }
  function buildTheme(i, GY, W, H) {
    const T = THEMES[i], R = seeded(1000 + i * 77);
    // 하늘
    const sky = mk(W, H), sg = sky.getContext('2d');
    let gr = sg.createLinearGradient(0, 0, 0, GY); gr.addColorStop(0, T.sky[0]); gr.addColorStop(0.6, T.sky[1]); gr.addColorStop(1, T.sky[2]);
    sg.fillStyle = gr; sg.fillRect(0, 0, W, H);
    const sunX = 740, sunY = T.kind === 'volcano' ? 230 : 110;
    gr = sg.createRadialGradient(sunX, sunY, 10, sunX, sunY, 260); gr.addColorStop(0, rgba(T.sun, 0.75)); gr.addColorStop(0.25, rgba(T.sun, 0.25)); gr.addColorStop(1, rgba(T.sun, 0));
    sg.fillStyle = gr; sg.fillRect(0, 0, W, H);
    if (T.kind === 'candy') {
      for (let k = 0; k < 7; k++) { const x = R() * W, y = 30 + R() * 140; [[0, 0, 34], [26, 6, 26], [-24, 8, 24], [8, -16, 22]].forEach(([dx, dy, r]) => { E(sg, x + dx, y + dy, r, r * 0.85); sg.fillStyle = k % 2 ? 'rgba(255,200,230,.75)' : 'rgba(210,240,255,.7)'; sg.fill(); }); }
      sg.save(); sg.globalAlpha = 0.5; ['#ff9ec4', '#ffd36a', '#9ee6a0', '#8ec8ff', '#c8a0ff'].forEach((c, k) => { sg.strokeStyle = c; sg.lineWidth = 9; sg.beginPath(); sg.arc(W * 0.7, GY + 40, 300 - k * 10, Math.PI * 1.1, Math.PI * 1.9); sg.stroke(); }); sg.restore();
    }
    if (T.kind === 'rainbow') { ['#ff7a8a', '#ffb06a', '#ffe06a', '#8ae08a', '#6ac0ff', '#8a8aff', '#c88aff'].forEach((c, k) => { sg.strokeStyle = rgba(c, 0.55); sg.lineWidth = 14; sg.beginPath(); sg.arc(W * 0.45, GY + 120, 420 - k * 14, Math.PI * 1.05, Math.PI * 1.95); sg.stroke(); }); for (let k = 0; k < 10; k++) { const x = R() * W, y = 30 + R() * 160; [[0, 0, 30], [24, 6, 22], [-22, 8, 20]].forEach(([dx, dy, r]) => { E(sg, x + dx, y + dy, r, r * 0.8); sg.fillStyle = 'rgba(255,255,255,.75)'; sg.fill(); }); } }
    if (T.kind === 'oldcatrep') { sg.fillStyle = 'rgba(120,80,40,.10)'; sg.fillRect(0, 0, W, GY); for (let k = 0; k < 12; k++) { sg.fillStyle = 'rgba(255,240,210,.35)'; E(sg, R() * W, R() * GY * 0.7, 30 + R() * 30, 8); sg.fill(); } }
    if (T.kind === 'lastgate') { for (let k = 0; k < 5; k++) { const x = R() * W, y = 30 + R() * 120; sg.fillStyle = 'rgba(90,60,90,.45)'; E(sg, x, y, 70, 18); sg.fill(); } }
    if (T.kind === 'icehaven') { sg.save(); sg.globalAlpha = 0.5; for (let k = 0; k < 4; k++) { const y = 40 + k * 18; sg.strokeStyle = ['#9affd8', '#8ac8ff', '#c8a8ff', '#ffb0d8'][k]; sg.lineWidth = 8; sg.beginPath(); sg.moveTo(0, y + 30); for (let x = 0; x <= W; x += 40) sg.lineTo(x, y + Math.sin(x * 0.01 + k) * 16); sg.stroke(); } sg.restore(); }
    if (T.kind === 'whalecave') { for (let k = 0; k < 60; k++) { const x = R() * W, y = R() * GY * 0.9; sg.fillStyle = `rgba(${200 + R() * 55 | 0},${200 + R() * 55 | 0},255,${0.4 + R() * 0.5})`; E(sg, x, y, 1.6, 1.6); sg.fill(); } for (let k = 0; k < 6; k++) { const x = R() * W; sg.fillStyle = 'rgba(30,20,60,.7)'; sg.beginPath(); sg.moveTo(x - 30, 0); sg.lineTo(x, 50 + R() * 60); sg.lineTo(x + 30, 0); sg.closePath(); sg.fill(); } }
    if (T.kind === 'windnest') { for (let k = 0; k < 7; k++) { const x = R() * W, y = 40 + R() * 200; [[0, 0, 40], [34, 8, 28], [-30, 10, 26]].forEach(([dx, dy, r]) => { E(sg, x + dx, y + dy, r, r * 0.65); sg.fillStyle = 'rgba(255,255,255,.75)'; sg.fill(); }); } for (let k = 0; k < 10; k++) { const x = R() * W, y = R() * GY * 0.8; sg.save(); sg.translate(x, y); sg.rotate(R() * 6); sg.fillStyle = 'rgba(255,255,255,.7)'; E(sg, 0, 0, 7, 2.2); sg.fill(); sg.restore(); } }
    if (T.kind === 'stormcrown') { for (let k = 0; k < 6; k++) { const x = R() * W, y = 30 + R() * 140; [[0, 0, 60], [50, 10, 44], [-46, 12, 40]].forEach(([dx, dy, r]) => { E(sg, x + dx, y + dy, r, r * 0.6); sg.fillStyle = 'rgba(40,40,70,.55)'; sg.fill(); }); } sg.strokeStyle = 'rgba(200,220,255,.7)'; sg.lineWidth = 2.5; for (let k = 0; k < 3; k++) { let x = 150 + R() * (W - 300), y = 60; sg.beginPath(); sg.moveTo(x, y); for (let q = 0; q < 5; q++) { x += (R() - 0.5) * 40; y += 30; sg.lineTo(x, y); } sg.stroke(); } }
    if (T.kind === 'clockforest') { for (let k = 0; k < 80; k++) { sg.fillStyle = `rgba(220,255,200,${0.2 + R() * 0.5})`; E(sg, R() * W, R() * GY * 0.8, 1.4, 1.4); sg.fill(); } for (let k = 0; k < 5; k++) { sg.fillStyle = 'rgba(200,230,230,.12)'; E(sg, R() * W, GY - 40 - R() * 120, 160, 22); sg.fill(); } }
    if (T.kind === 'dawngarden') { const gr3 = sg.createRadialGradient(W * 0.5, GY + 30, 10, W * 0.5, GY + 30, 360); gr3.addColorStop(0, 'rgba(255,220,170,.55)'); gr3.addColorStop(1, 'rgba(255,220,170,0)'); sg.fillStyle = gr3; sg.fillRect(0, 0, W, H); for (let k = 0; k < 60; k++) { sg.fillStyle = `rgba(255,255,255,${R() * 0.5})`; E(sg, R() * W, R() * GY * 0.5, 1.1, 1.1); sg.fill(); } }
    if (T.kind === 'starmarket') { for (let k = 0; k < 160; k++) { sg.fillStyle = `rgba(255,250,220,${0.3 + R() * 0.6})`; E(sg, R() * W, R() * GY * 0.7, R() < 0.1 ? 1.8 : 1, R() < 0.1 ? 1.8 : 1); sg.fill(); } for (let k = 0; k < 4; k++) { const x = 100 + R() * (W - 200), y = 40 + R() * 100; sg.strokeStyle = 'rgba(255,240,200,.5)'; sg.lineWidth = 1.5; sg.beginPath(); sg.moveTo(x, y); sg.lineTo(x - 50, y + 22); sg.stroke(); } }
    if (T.kind === 'hourglass') { for (let k = 0; k < 6; k++) { const x = R() * W, y = 40 + R() * 160; sg.fillStyle = 'rgba(255,240,210,.35)'; E(sg, x, y, 60 + R() * 60, 10 + R() * 8); sg.fill(); } }
    if (T.kind === 'silentmt') { for (let k = 0; k < 5; k++) { const x = 60 + k * 210, y = 70 + (k % 2) * 40; [[0, 0, 26], [22, 5, 18], [-20, 6, 17]].forEach(([dx, dy, r]) => { E(sg, x + dx, y + dy, r, r * 0.7); sg.fillStyle = 'rgba(255,255,255,.7)'; sg.fill(); }); } for (let k = 0; k < 90; k++) { sg.fillStyle = 'rgba(255,255,255,.75)'; E(sg, R() * W, R() * GY, 1.4, 1.4); sg.fill(); } }
    if (T.kind === 'echocave') { for (let k = 0; k < 14; k++) { const x = R() * W, y = R() * 70; sg.fillStyle = 'rgba(30,20,60,.9)'; sg.beginPath(); sg.moveTo(x - 18, 0); sg.lineTo(x, y + 60); sg.lineTo(x + 18, 0); sg.closePath(); sg.fill(); } for (let k = 0; k < 6; k++) { const x = 80 + R() * (W - 160), y = 120 + R() * 160; for (let q = 0; q < 4; q++) { sg.strokeStyle = `rgba(170,150,255,${0.35 - q * 0.08})`; sg.lineWidth = 2; sg.beginPath(); sg.ellipse(x, y, 20 + q * 22, 10 + q * 11, 0, 0, Math.PI * 2); sg.stroke(); } } }
    if (T.kind === 'shadowvil') { for (let k = 0; k < 120; k++) { sg.fillStyle = `rgba(255,255,255,${R() * 0.6})`; sg.fillRect(R() * W, R() * GY * 0.5, 1.2, 1.2); } const gr2 = sg.createRadialGradient(W * 0.7, GY - 40, 10, W * 0.7, GY - 40, 260); gr2.addColorStop(0, 'rgba(255,190,140,.5)'); gr2.addColorStop(1, 'rgba(255,190,140,0)'); sg.fillStyle = gr2; sg.fillRect(0, 0, W, H); }
    if (T.kind === 'catrep') { for (let k = 0; k < 6; k++) { const x = 80 + k * 160, y = 60 + (k % 2) * 30; st(sg, 1, 'rgba(120,60,40,.5)'); sg.beginPath(); sg.moveTo(x - 80, y - 10); sg.quadraticCurveTo(x, y + 20, x + 80, y - 10); sg.stroke(); for (let q = 0; q < 4; q++) { const lx = x - 54 + q * 36, ly = y + 6 - Math.abs(q - 1.5) * 4; E(sg, lx, ly + 8, 7, 9); sg.fillStyle = q % 2 ? '#ff6a4a' : '#ffb04a'; sg.fill(); } } }
    if (T.kind === 'feather') { for (let k = 0; k < 9; k++) { const x = R() * W, y = 40 + R() * 160; sg.save(); sg.translate(x, y); sg.rotate(R() * 3); sg.fillStyle = 'rgba(255,255,255,.55)'; sg.beginPath(); sg.ellipse(0, 0, 22, 6, 0, 0, TAU); sg.fill(); st(sg, 1, 'rgba(180,210,240,.8)'); sg.beginPath(); sg.moveTo(-24, 0); sg.lineTo(22, 0); sg.stroke(); sg.restore(); } }
    if (T.kind === 'burrow') { for (let k = 0; k < 40; k++) { const x = R() * W, y = R() * 120; st(sg, 2 + R() * 3, 'rgba(90,60,30,.6)'); sg.beginPath(); sg.moveTo(x, 0); sg.quadraticCurveTo(x + (R() - 0.5) * 40, y * 0.5, x + (R() - 0.5) * 30, y); sg.stroke(); } for (let k = 0; k < 10; k++) { const x = R() * W, y = 80 + R() * 160; sg.fillStyle = 'rgba(255,200,100,.25)'; E(sg, x, y, 3, 3); sg.fill(); } }
    if (T.kind === 'namesea') { for (let k = 0; k < 200; k++) { sg.fillStyle = `rgba(255,255,255,${R() * 0.8})`; sg.fillRect(R() * W, R() * GY * 0.6, 1.4, 1.4); } for (let k = 0; k < 3; k++) { sg.strokeStyle = ['rgba(120,255,200,.22)', 'rgba(140,180,255,.22)', 'rgba(220,140,255,.18)'][k]; sg.lineWidth = 30; sg.beginPath(); for (let x = 0; x <= W; x += 20) sg.lineTo(x, 80 + k * 30 + Math.sin(x * 0.01 + k) * 30); sg.stroke(); } }
    if (T.kind === 'stargarden' || T.kind === 'firstcastle') {
      const sg2 = T.kind === 'stargarden';
      for (let k = 0; k < 260; k++) { const r = R() < 0.08 ? 1.8 : 0.9; sg.fillStyle = `rgba(255,255,255,${0.3 + R() * 0.7})`; sg.beginPath(); sg.arc(R() * W, R() * GY * (sg2 ? 0.95 : 0.55), r, 0, TAU); sg.fill(); }
      for (let k = 0; k < 4; k++) { const x = R() * W, y = 40 + R() * 160, r = 120 + R() * 120, ng = sg.createRadialGradient(x, y, 0, x, y, r); const c = ['#ff7ad0', '#7ab4ff', '#b48cff', '#7affe0'][k]; ng.addColorStop(0, rgba(c, sg2 ? 0.22 : 0.12)); ng.addColorStop(1, rgba(c, 0)); sg.fillStyle = ng; sg.fillRect(0, 0, W, H); }
      if (sg2) { st(sg, 1.2, 'rgba(255,240,200,.55)'); const pts = [[180, 70], [230, 50], [280, 80], [260, 130], [210, 140], [300, 180]]; sg.beginPath(); pts.forEach(([x, y], i) => i ? sg.lineTo(x, y) : sg.moveTo(x, y)); sg.stroke(); pts.forEach(([x, y]) => star(sg, x, y, 4, '#fff6c8')); }
      else { // 거대한 달 + 기사 별자리
        E(sg, 700, 120, 86, 86); const mg = sg.createRadialGradient(680, 100, 10, 700, 120, 90); mg.addColorStop(0, '#fffbe8'); mg.addColorStop(1, '#f0d8a8'); sg.fillStyle = mg; sg.fill();
        sg.globalAlpha = 0.25; [[680, 100, 14], [728, 140, 10], [700, 160, 7]].forEach(([x, y, r]) => { E(sg, x, y, r, r); sg.fillStyle = '#c8a878'; sg.fill(); }); sg.globalAlpha = 1;
        st(sg, 1.2, 'rgba(255,240,200,.6)'); const K2 = [[160, 60], [180, 90], [170, 130], [150, 170], [195, 170], [140, 100], [225, 75], [250, 40]]; sg.beginPath(); [[0, 1], [1, 2], [2, 3], [2, 4], [1, 5], [1, 6], [6, 7]].forEach(([i, j]) => { sg.moveTo(K2[i][0], K2[i][1]); sg.lineTo(K2[j][0], K2[j][1]); }); sg.stroke(); K2.forEach(([x, y]) => star(sg, x, y, 3.6, '#fff6c8'));
      }
    }
    if (T.kind === 'upside') {
      // 거꾸로 바다: 하늘이 물이고, 위쪽에 거꾸로 매달린 물결과 물고기 그림자
      for (let k = 0; k < 5; k++) { const y = 20 + k * 26; sg.strokeStyle = `rgba(160,240,255,${0.18 - k * 0.025})`; sg.lineWidth = 3; sg.beginPath(); for (let x = 0; x <= W; x += 12) sg.lineTo(x, y + Math.sin(x * 0.03 + k) * 6); sg.stroke(); }
      for (let k = 0; k < 18; k++) { const x = R() * W, y = 60 + R() * 200, s2 = 6 + R() * 10; sg.fillStyle = 'rgba(10,30,50,.35)'; E(sg, x, y, s2, s2 * 0.45); sg.fill(); sg.beginPath(); sg.moveTo(x - s2, y); sg.lineTo(x - s2 * 1.6, y - s2 * 0.4); sg.lineTo(x - s2 * 1.6, y + s2 * 0.4); sg.fill(); }
      for (let k = 0; k < 60; k++) { sg.strokeStyle = 'rgba(200,250,255,.25)'; sg.lineWidth = 1; sg.beginPath(); sg.arc(R() * W, R() * GY, 1 + R() * 3, 0, TAU); sg.stroke(); }
    }
    if (T.kind === 'clock' || T.kind === 'tower') {
      if (T.kind === 'tower') { for (let k = 0; k < 160; k++) { sg.fillStyle = `rgba(255,255,255,${R() * 0.8})`; sg.fillRect(R() * W, R() * GY * 0.8, 1.5, 1.5); } }
      for (let k = 0; k < 5; k++) { const x = R() * W, y = 40 + R() * 160, r = 30 + R() * 50; gearShape(sg, x, y, r, 10 + (k % 3) * 2, T.kind === 'clock' ? 'rgba(160,100,50,.10)' : 'rgba(200,170,255,.10)'); }
      const cx = sunX, cy = sunY + 10, cr = T.kind === 'tower' ? 92 : 60;
      E(sg, cx, cy, cr, cr); sg.fillStyle = T.kind === 'tower' ? 'rgba(255,240,210,.85)' : 'rgba(255,248,225,.7)'; sg.fill(); st(sg, 5, T.kind === 'tower' ? 'rgba(220,180,90,.9)' : 'rgba(190,130,70,.6)'); sg.stroke();
      for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; st(sg, k % 3 ? 2 : 4, 'rgba(90,60,40,.6)'); sg.beginPath(); sg.moveTo(cx + Math.cos(a) * cr * 0.78, cy + Math.sin(a) * cr * 0.78); sg.lineTo(cx + Math.cos(a) * cr * 0.92, cy + Math.sin(a) * cr * 0.92); sg.stroke(); }
      st(sg, 5, 'rgba(70,40,30,.7)'); sg.beginPath(); sg.moveTo(cx, cy); sg.lineTo(cx + cr * 0.45, cy - cr * 0.3); sg.moveTo(cx, cy); sg.lineTo(cx - cr * 0.1, cy - cr * 0.7); sg.stroke();
    }
    if (T.kind !== 'volcano' && T.kind !== 'crystal' && T.kind !== 'starsea' && T.kind !== 'mine' && T.kind !== 'fossil' && T.kind !== 'clock' && T.kind !== 'tower' && T.kind !== 'upside') { E(sg, sunX, sunY, 40, 40); sg.fillStyle = rgba(T.sun, 0.95); sg.fill(); }
    if (T.kind === 'castle') {
      for (let k = 0; k < 5; k++) { const nx = R() * W, ny = R() * GY * 0.5, nr = 120 + R() * 160; const ng = sg.createRadialGradient(nx, ny, 0, nx, ny, nr); ng.addColorStop(0, ['rgba(180,110,255,.28)', 'rgba(90,160,255,.22)', 'rgba(255,140,200,.2)'][k % 3]); ng.addColorStop(1, 'rgba(0,0,0,0)'); sg.fillStyle = ng; sg.fillRect(0, 0, W, H); }
      E(sg, sunX, sunY, 46, 46); sg.fillStyle = '#fff6d8'; sg.fill(); E(sg, sunX - 12, sunY - 6, 10, 8); sg.fillStyle = 'rgba(220,200,160,.5)'; sg.fill(); E(sg, sunX + 14, sunY + 12, 7, 6); sg.fill();
      for (let k = 0; k < 4; k++) { const x0 = R() * W, y0 = R() * 160; st(sg, 1.5, 'rgba(255,255,255,.6)'); sg.beginPath(); sg.moveTo(x0, y0); sg.lineTo(x0 - 60, y0 + 30); sg.stroke(); }
    }
    if (T.kind === 'mine' || T.kind === 'fossil') {
      for (let k = 0; k < 10; k++) { const x = R() * W, y = R() * GY * 0.7, r = 60 + R() * 90; const ng = sg.createRadialGradient(x, y, 0, x, y, r); ng.addColorStop(0, T.kind === 'mine' ? 'rgba(255,170,80,.16)' : 'rgba(120,255,200,.14)'); ng.addColorStop(1, 'rgba(0,0,0,0)'); sg.fillStyle = ng; sg.fillRect(0, 0, W, H); }
      for (let x = -10; x < W; x += 22 + R() * 34) { const h = 30 + R() * 100, w = 16 + R() * 22; sg.beginPath(); sg.moveTo(x, 0); sg.quadraticCurveTo(x + w * 0.3, h * 0.6, x + w / 2, h); sg.quadraticCurveTo(x + w * 0.7, h * 0.6, x + w, 0); sg.fillStyle = lgr(sg, T.kind === 'mine' ? '#1a0e08' : '#04161a', T.kind === 'mine' ? '#4a3020' : '#1e4a46', 0, 0, 0, h); sg.fill(); }
      if (T.kind === 'mine') { st(sg, 1, 'rgba(60,40,20,.8)'); for (let k = 0; k < 3; k++) { const y0 = 70 + k * 50; sg.beginPath(); sg.moveTo(0, y0); for (let x = 0; x <= W; x += 60) sg.quadraticCurveTo(x + 30, y0 + 18, x + 60, y0); sg.stroke(); for (let x = 30; x < W; x += 60) { const gl = sg.createRadialGradient(x, y0 + 12, 0, x, y0 + 12, 16); gl.addColorStop(0, 'rgba(255,210,120,.9)'); gl.addColorStop(1, 'rgba(255,170,80,0)'); sg.fillStyle = gl; sg.fillRect(x - 16, y0 - 4, 32, 32); E(sg, x, y0 + 12, 3, 4); sg.fillStyle = '#ffe9a0'; sg.fill(); } } }
      else for (let k = 0; k < 80; k++) { E(sg, R() * W, R() * GY, R() * 1.6 + 0.4, R() * 1.6 + 0.4); sg.fillStyle = `rgba(160,255,210,${R() * 0.6 + 0.2})`; sg.fill(); }
    }
    if (T.kind === 'starsea') {
      for (let k = 0; k < 6; k++) { const nx = R() * W, ny = R() * GY * 0.6, nr = 140 + R() * 180; const ng = sg.createRadialGradient(nx, ny, 0, nx, ny, nr); ng.addColorStop(0, ['rgba(90,170,255,.25)', 'rgba(170,110,255,.22)', 'rgba(255,140,220,.16)'][k % 3]); ng.addColorStop(1, 'rgba(0,0,0,0)'); sg.fillStyle = ng; sg.fillRect(0, 0, W, H); }
      for (let k = 0; k < 320; k++) { E(sg, R() * W, R() * GY, R() * 1.4 + 0.3, R() * 1.4 + 0.3); sg.fillStyle = `rgba(255,255,255,${R() * 0.6 + 0.2})`; sg.fill(); }
      st(sg, 1, 'rgba(255,255,255,.12)'); sg.beginPath(); for (let x = 0; x <= W; x += 8) sg.lineTo(x, 120 + Math.sin(x * 0.006) * 40); sg.stroke();
      E(sg, 200, 90, 30, 30); sg.fillStyle = lgr(sg, '#ffd8a0', '#c46a3a', 170, 60, 230, 120); sg.fill(); st(sg, 2, 'rgba(255,220,180,.5)'); sg.beginPath(); sg.ellipse(200, 90, 52, 12, -0.3, 0, TAU); sg.stroke();
    }
    if (T.kind === 'aurora') {
      for (let k = 0; k < 4; k++) { sg.save(); sg.globalCompositeOperation = 'lighter'; const yb = 60 + k * 40; for (let x = 0; x < W; x += 3) { const h = 80 + Math.sin(x * 0.01 + k) * 40 + Math.sin(x * 0.033 + k * 2) * 20, y0 = yb + Math.sin(x * 0.008 + k * 1.3) * 30; const gr2 = sg.createLinearGradient(0, y0, 0, y0 + h); gr2.addColorStop(0, 'rgba(120,255,200,0)'); gr2.addColorStop(0.4, k % 2 ? 'rgba(120,255,200,.12)' : 'rgba(160,120,255,.1)'); gr2.addColorStop(1, 'rgba(120,255,200,0)'); sg.fillStyle = gr2; sg.fillRect(x, y0, 3, h); } sg.restore(); }
      for (let k = 0; k < 120; k++) { E(sg, R() * W, R() * GY * 0.5, R() * 1.2 + 0.3, R() * 1.2 + 0.3); sg.fillStyle = `rgba(255,255,255,${R() * 0.5 + 0.2})`; sg.fill(); }
    }
    if (T.kind === 'crystal') {
      for (let k = 0; k < 12; k++) { const x = R() * W, y = R() * GY * 0.7, r = 40 + R() * 70; const ng = sg.createRadialGradient(x, y, 0, x, y, r); ng.addColorStop(0, R() < 0.5 ? 'rgba(120,220,255,.25)' : 'rgba(200,130,255,.22)'); ng.addColorStop(1, 'rgba(0,0,0,0)'); sg.fillStyle = ng; sg.fillRect(0, 0, W, H); }
      for (let x = -10; x < W; x += 26 + R() * 30) { const h = 30 + R() * 90, w = 14 + R() * 18; sg.beginPath(); sg.moveTo(x, 0); sg.lineTo(x + w / 2, h); sg.lineTo(x + w, 0); sg.fillStyle = lgr(sg, '#0a0e22', '#232a58', 0, 0, 0, h); sg.fill(); if (R() < 0.35) { sg.beginPath(); sg.moveTo(x + w * 0.3, 0); sg.lineTo(x + w / 2, h * 0.8); sg.lineTo(x + w * 0.6, 0); sg.fillStyle = 'rgba(140,230,255,.45)'; sg.fill(); } }
    }
    if (T.kind === 'swamp') { E(sg, sunX, sunY, 46, 46); sg.fillStyle = 'rgba(225,180,255,.9)'; sg.fill(); E(sg, sunX + 14, sunY - 8, 40, 40); sg.fillStyle = rgba(T.sky[1], 0.85); sg.fill(); }
    if (T.kind === 'volcano' || T.kind === 'snow' || T.kind === 'swamp' || T.kind === 'sky' || T.kind === 'castle') for (let k = 0; k < (T.kind === 'castle' ? 260 : 70); k++) { E(sg, R() * W, R() * GY * 0.55, R() * 1.3 + 0.3, R() * 1.3 + 0.3); sg.fillStyle = `rgba(255,255,255,${R() * 0.5 + 0.2})`; sg.fill(); }
    // 레이어 공통
    const layer = (y0, h, fn) => { const c = mk(TW * BGS, h * BGS), g = c.getContext('2d'); g.scale(BGS, BGS); g.translate(0, -y0); fn(g); return { c, y0, h }; };
    const far = layer(40, GY - 40, g => {
      const pts = []; const seeds = [[2, 40, R() * 6], [5, 22, R() * 6], [11, 9, R() * 6], [23, 4, R() * 6]];
      const base = GY - 120;
      g.beginPath(); g.moveTo(0, GY);
      for (let x = 0; x <= TW; x += 6) {
        let y = base - 60 - periodic(x, seeds);
        if (T.kind === 'desert') y = Math.round(y / 22) * 22;
        pts.push([x, y]); g.lineTo(x, y);
      }
      g.lineTo(TW, GY); g.closePath(); g.fillStyle = lgr(g, T.farTop, T.far, 0, base - 120, 0, GY); g.fill();
      if (T.kind === 'meadow' || T.kind === 'snow' || T.kind === 'forest') {
        g.save(); g.clip();
        const th = base - 88;
        g.beginPath(); g.moveTo(0, 0); g.lineTo(0, th);
        for (let x = 0; x <= TW; x += 8) g.lineTo(x, th + Math.sin(x * 0.09) * 5 + Math.sin(x * 0.023) * 7);
        g.lineTo(TW, 0); g.closePath(); g.fillStyle = lgr(g, '#ffffff', 'rgba(235,244,255,.92)', 0, th - 60, 0, th + 10); g.fill();
        g.restore();
      }
      if (T.kind === 'candy') {
        for (let k = 0; k < 6; k++) { const x = 100 + k * 250; for (const dx of [0, -TW, TW]) { const X = x + dx, h = 90 + (k % 3) * 30; g.beginPath(); g.moveTo(X - 90, GY); g.quadraticCurveTo(X - 60, base - h, X, base - h - 10); g.quadraticCurveTo(X + 60, base - h, X + 90, GY); g.closePath(); g.fillStyle = lgr(g, ['#ffc8e0', '#d0f0ff', '#fff0b0'][k % 3], ['#f29ac0', '#9ad0f0', '#f0d080'][k % 3], 0, base - h, 0, GY); g.fill(); g.fillStyle = 'rgba(255,255,255,.5)'; for (let q = 0; q < 8; q++) { E(g, X - 50 + q * 13, base - h * 0.5 + Math.sin(q) * 10, 2, 5, q); g.fill(); } } }
      }
      if (T.kind === 'rainbow') { for (let k = 0; k < 4; k++) { const x = 180 + k * 360; for (const dx of [0, -TW, TW]) { const X = x + dx, y = base - 60; ['#ff7a8a', '#ffd36a', '#8ae08a', '#6ac0ff', '#c88aff'].forEach((c, q) => { g.strokeStyle = c; g.lineWidth = 6; g.beginPath(); g.arc(X, y + 70, 120 - q * 6, Math.PI, TAU); g.stroke(); }); [[-120, 70], [120, 70]].forEach(([ox, oy]) => { E(g, X + ox, y + oy, 40, 18); g.fillStyle = '#ffffff'; g.fill(); }); } } }
      if (T.kind === 'oldcatrep') { for (let k = 0; k < 7; k++) { const x = 110 + k * 230; for (const dx of [0, -TW, TW]) { const X = x + dx, h = 70 + (k % 3) * 24; g.fillStyle = lgr(g, '#e8d4b0', '#b89a70', 0, base - h, 0, base + 30); RR(g, X - 34, base - h, 68, h + 30, 4); g.fill(); g.fillStyle = '#a0603a'; g.beginPath(); g.moveTo(X - 42, base - h + 2); g.lineTo(X, base - h - 26); g.lineTo(X + 42, base - h + 2); g.closePath(); g.fill(); g.fillStyle = '#a0603a'; g.beginPath(); g.moveTo(X - 30, base - h - 8); g.lineTo(X - 24, base - h - 22); g.lineTo(X - 18, base - h - 12); g.closePath(); g.fill(); g.beginPath(); g.moveTo(X + 30, base - h - 8); g.lineTo(X + 24, base - h - 22); g.lineTo(X + 18, base - h - 12); g.closePath(); g.fill(); g.fillStyle = '#fff0c0'; RR(g, X - 10, base - h + 18, 20, 16, 8); g.fill(); } } }
      if (T.kind === 'lastgate') { for (let k = 0; k < 4; k++) { const x = 180 + k * 400; for (const dx of [0, -TW, TW]) { const X = x + dx, h = 150 + (k % 2) * 30; g.fillStyle = lgr(g, '#7a6878', '#3e3040', 0, base - h, 0, GY); g.fillRect(X - 90, base - h, 40, h + 60); g.fillRect(X + 50, base - h, 40, h + 60); g.beginPath(); g.moveTo(X - 50, base - h + 30); g.quadraticCurveTo(X, base - h - 20, X + 50, base - h + 30); g.lineTo(X + 50, base - h + 50); g.quadraticCurveTo(X, base - h, X - 50, base - h + 50); g.closePath(); g.fill(); for (let q = 0; q < 4; q++) { g.fillRect(X - 92 + q * 12, base - h - 10, 8, 10); g.fillRect(X + 48 + q * 12, base - h - 10, 8, 10); } } } }
      if (T.kind === 'icehaven') { for (let k = 0; k < 6; k++) { const x = 120 + k * 260; for (const dx of [0, -TW, TW]) { const X = x + dx, h = 50 + (k % 3) * 26; g.fillStyle = lgr(g, '#ffffff', '#b8dcf0', 0, base - h, 0, base + 30); g.beginPath(); g.moveTo(X - 70, base + 30); g.lineTo(X - 40, base - h); g.lineTo(X + 10, base - h - 14); g.lineTo(X + 60, base - h + 6); g.lineTo(X + 80, base + 30); g.closePath(); g.fill(); if (k % 2 === 0) { g.fillStyle = '#c87a4a'; g.fillRect(X - 30, base - h - 4, 60, 14); g.fillStyle = '#8a5030'; g.fillRect(X - 2, base - h - 50, 4, 46); g.fillStyle = '#f8f8ff'; g.beginPath(); g.moveTo(X + 2, base - h - 48); g.lineTo(X + 26, base - h - 22); g.lineTo(X + 2, base - h - 18); g.closePath(); g.fill(); } } } }
      if (T.kind === 'whalecave') { for (let k = 0; k < 6; k++) { const x = 130 + k * 260; for (const dx of [0, -TW, TW]) { const X = x + dx, h = 90 + (k % 3) * 30; g.fillStyle = lgr(g, '#5a5aa0', '#2a2a5a', 0, base - h, 0, GY); g.beginPath(); g.moveTo(X - 40, GY); g.quadraticCurveTo(X - 30, base - h, X, base - h - 10); g.quadraticCurveTo(X + 30, base - h, X + 40, GY); g.closePath(); g.fill(); g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.7; g.drawImage(softDot(['#9ad8ff', '#c8a8ff', '#ffb0e0'][k % 3]), X - 24, base - h - 24, 48, 48); g.restore(); } } }
      if (T.kind === 'windnest') { for (let k = 0; k < 5; k++) { const x = 150 + k * 300; for (const dx of [0, -TW, TW]) { const X = x + dx, h = 70 + (k % 3) * 30; g.fillStyle = lgr(g, '#c8b098', '#8a7058', 0, base - h, 0, base + 40); g.beginPath(); g.moveTo(X - 80, base + 40); g.lineTo(X - 60, base - h); g.lineTo(X + 60, base - h); g.lineTo(X + 80, base + 40); g.closePath(); g.fill(); g.fillStyle = '#ffffff'; E(g, X, base - h, 66, 12); g.fill(); g.fillStyle = '#b08a5a'; E(g, X, base - h - 6, 42, 12); g.fill(); g.fillStyle = '#d8b880'; E(g, X, base - h - 10, 34, 8); g.fill(); [[-10], [10]].forEach(([ox]) => { E(g, X + ox, base - h - 12, 7, 8); g.fillStyle = '#f8f0e0'; g.fill(); }); } } }
      if (T.kind === 'stormcrown') { for (let k = 0; k < 4; k++) { const x = 200 + k * 380; for (const dx of [0, -TW, TW]) { const X = x + dx, h = 160 + (k % 2) * 50; g.fillStyle = lgr(g, '#6a6a90', '#3a3a58', 0, base - h, 0, GY); g.beginPath(); g.moveTo(X - 130, GY); g.lineTo(X - 50, base - h + 30); g.lineTo(X - 30, base - h); g.lineTo(X - 10, base - h + 24); g.lineTo(X + 10, base - h - 10); g.lineTo(X + 30, base - h + 24); g.lineTo(X + 50, base - h); g.lineTo(X + 70, base - h + 30); g.lineTo(X + 130, GY); g.closePath(); g.fill(); g.save(); g.globalCompositeOperation = 'lighter'; g.drawImage(softDot('#bfd8ff'), X - 40, base - h - 40, 80, 60); g.restore(); } } }
      if (T.kind === 'clockforest') { for (let k = 0; k < 7; k++) { const x = 90 + k * 200; for (const dx of [0, -TW, TW]) { const X = x + dx, h = 150 + (k % 3) * 40; g.fillStyle = '#2a3a2a'; RR(g, X - 9, base - h + 30, 18, GY - base + h, 6); g.fill(); g.fillStyle = ['#2e5a40', '#386a48', '#2a4a38'][k % 3]; E(g, X, base - h + 20, 56, 48); g.fill(); E(g, X - 30, base - h + 46, 34, 28); g.fill(); E(g, X + 30, base - h + 44, 34, 28); g.fill(); const cy = base - h + 70; st(g, 1, '#c8a870'); g.beginPath(); g.moveTo(X + 22, cy - 18); g.lineTo(X + 22, cy - 8); g.stroke(); E(g, X + 22, cy, 8, 8); g.fillStyle = '#f0e8c8'; g.fill(); st(g, 1.2, '#6a4a20'); g.beginPath(); g.arc(X + 22, cy, 8, 0, Math.PI * 2); g.moveTo(X + 22, cy); g.lineTo(X + 22, cy - 6); g.moveTo(X + 22, cy); g.lineTo(X + 26, cy + 2); g.stroke(); } } }
      if (T.kind === 'dawngarden') { for (let k = 0; k < 5; k++) { const x = 160 + k * 300; for (const dx of [0, -TW, TW]) { const X = x + dx; g.fillStyle = '#d8d0c0'; g.beginPath(); g.ellipse(X, base + 40, 70, 16, 0, 0, Math.PI * 2); g.fill(); st(g, 3, '#a89870'); g.beginPath(); g.moveTo(X, base + 36); g.lineTo(X + 34, base - 10); g.stroke(); for (let q = 0; q < 12; q++) { const a = q / 12 * Math.PI * 2; E(g, X + Math.cos(a) * 58, base + 40 + Math.sin(a) * 12, 1.6, 1.6); g.fillStyle = '#8a7a5a'; g.fill(); } [[-60, '#e8a0c8'], [60, '#a0c8e8'], [-20, '#f0d080']].forEach(([ox, c]) => { st(g, 1.6, '#5a8a4a'); g.beginPath(); g.moveTo(X + ox, base + 30); g.lineTo(X + ox, base - 10); g.stroke(); E(g, X + ox, base - 14, 6, 8); g.fillStyle = c; g.fill(); }); } } }
      if (T.kind === 'starmarket') { for (let k = 0; k < 6; k++) { const x = 120 + k * 250; for (const dx of [0, -TW, TW]) { const X = x + dx, h = 50 + (k % 3) * 18, b0 = base + 30; g.beginPath(); g.moveTo(X - 46, b0); g.quadraticCurveTo(X - 40, b0 - h * 0.6, X, b0 - h); g.quadraticCurveTo(X + 40, b0 - h * 0.6, X + 46, b0); g.closePath(); g.fillStyle = ['#8a4ab0', '#c8504a', '#4a7ac8'][k % 3]; g.fill(); g.fillStyle = 'rgba(255,255,255,.35)'; for (let q = 0; q < 3; q++) { g.beginPath(); g.moveTo(X, b0 - h); g.lineTo(X - 30 + q * 30, b0); g.lineTo(X - 24 + q * 30, b0); g.closePath(); g.fill(); } g.fillStyle = '#ffe27a'; RR(g, X - 8, b0 - 22, 16, 22, 3); g.fill(); g.save(); g.globalCompositeOperation = 'lighter'; g.drawImage(softDot('#ffd870'), X - 30, b0 - 46, 60, 60); g.restore(); } } }
      if (T.kind === 'hourglass') { for (let k = 0; k < 4; k++) { const x = 200 + k * 380; for (const dx of [0, -TW, TW]) { const X = x + dx, h = 140 + (k % 2) * 40; g.fillStyle = lgr(g, '#f8d8a0', '#c89058', 0, base - h, 0, GY); g.fillRect(X - 50, base - h + 50, 100, GY - base + h); g.beginPath(); g.arc(X, base - h + 50, 50, Math.PI, TAU); g.fill(); g.fillStyle = '#5ab0d0'; g.beginPath(); g.arc(X, base - h + 50, 36, Math.PI, TAU); g.fill(); g.fillStyle = '#ffe27a'; star(g, X, base - h - 10, 7, '#ffe27a'); g.fillStyle = 'rgba(90,50,20,.45)'; for (let q = 0; q < 3; q++) { RR(g, X - 30 + q * 22, base - h + 74, 12, 20, 6); g.fill(); } } } }
      if (T.kind === 'silentmt') { for (let k = 0; k < 5; k++) { const x = 140 + k * 300; for (const dx of [0, -TW, TW]) { const X = x + dx, h = 150 + (k % 3) * 50; g.beginPath(); g.moveTo(X - 170, GY); g.lineTo(X - 20, base - h); g.quadraticCurveTo(X, base - h - 14, X + 20, base - h); g.lineTo(X + 170, GY); g.closePath(); g.fillStyle = lgr(g, '#b8c8da', '#7a8ca2', 0, base - h, 0, GY); g.fill(); g.beginPath(); g.moveTo(X - 52, base - h + 46); g.lineTo(X - 20, base - h); g.quadraticCurveTo(X, base - h - 14, X + 20, base - h); g.lineTo(X + 52, base - h + 46); g.quadraticCurveTo(X + 30, base - h + 36, X + 14, base - h + 48); g.quadraticCurveTo(X - 6, base - h + 34, X - 22, base - h + 50); g.closePath(); g.fillStyle = '#ffffff'; g.fill(); } } }
      if (T.kind === 'echocave') { for (let k = 0; k < 8; k++) { const x = 90 + k * 180; for (const dx of [0, -TW, TW]) { const X = x + dx, h = 80 + (k % 3) * 40; g.beginPath(); g.moveTo(X - 22, GY); g.lineTo(X - 8, base - h); g.lineTo(X + 4, base - h - 18); g.lineTo(X + 14, base - h + 6); g.lineTo(X + 24, GY); g.closePath(); g.fillStyle = lgr(g, ['#9ad8ff', '#c8a8ff', '#ffb8e8'][k % 3], '#3a2e60', 0, base - h - 18, 0, GY); g.fill(); g.save(); g.globalCompositeOperation = 'lighter'; g.drawImage(softDot(['#9ad8ff', '#c8a8ff', '#ffb8e8'][k % 3]), X - 40, base - h - 50, 80, 80); g.restore(); } } }
      if (T.kind === 'shadowvil') { for (let k = 0; k < 7; k++) { const x = 100 + k * 200; for (const dx of [0, -TW, TW]) { const X = x + dx, h = 70 + (k % 3) * 25, b0 = base - 10; g.fillStyle = '#3a2e4a'; g.fillRect(X - 26, b0 - h, 52, GY - b0 + h); g.beginPath(); g.moveTo(X - 34, b0 - h); g.lineTo(X, b0 - h - 34); g.lineTo(X + 34, b0 - h); g.closePath(); g.fill(); g.fillStyle = 'rgba(255,200,120,.75)'; RR(g, X - 8, b0 - h + 16, 16, 18, 8); g.fill(); } } }
      if (T.kind === 'catrep') { for (let k = 0; k < 6; k++) { const x = 120 + k * 240; for (const dx of [0, -TW, TW]) { const X = x + dx, h = 90 + (k % 3) * 40, b0 = base - 10; g.fillStyle = lgr(g, '#e8b8a0', '#a86a5a', 0, b0 - h, 0, GY); g.fillRect(X - 30, b0 - h, 60, GY - b0 + h); for (let q = 0; q < 3; q++) { const ry = b0 - h + q * 34; g.fillStyle = '#7a3a30'; g.beginPath(); g.moveTo(X - 42, ry + 6); g.quadraticCurveTo(X, ry - 14, X + 42, ry + 6); g.lineTo(X + 34, ry + 10); g.lineTo(X - 34, ry + 10); g.closePath(); g.fill(); } [[-12, -1], [12, 1]].forEach(([ox]) => { g.fillStyle = '#7a3a30'; g.beginPath(); g.moveTo(X + ox - 6, b0 - h - 6); g.lineTo(X + ox, b0 - h - 18); g.lineTo(X + ox + 6, b0 - h - 6); g.fill(); }); } } }
      if (T.kind === 'feather') { for (let k = 0; k < 5; k++) { const x = 140 + k * 290; for (const dx of [0, -TW, TW]) { const X = x + dx, y = base - 100 - (k % 2) * 50; g.fillStyle = '#7ab0c8'; g.beginPath(); g.moveTo(X - 80, y); g.quadraticCurveTo(X, y - 30, X + 80, y); g.lineTo(X + 40, y + 50); g.lineTo(X - 40, y + 50); g.closePath(); g.fill(); g.save(); g.translate(X + 20, y - 20); g.rotate(-0.4); g.fillStyle = 'rgba(255,255,255,.8)'; g.beginPath(); g.ellipse(0, -40, 10, 42, 0, 0, TAU); g.fill(); g.restore(); } } }
      if (T.kind === 'burrow') { for (let k = 0; k < 7; k++) { const x = 100 + k * 200; for (const dx of [0, -TW, TW]) { const X = x + dx, y = base - 40; g.fillStyle = '#2a1a10'; E(g, X, y, 46, 54); g.fill(); g.fillStyle = 'rgba(255,190,90,.6)'; E(g, X, y + 8, 30, 38); g.fill(); g.fillStyle = '#8a5a2a'; g.fillRect(X - 30, y + 30, 60, 6); } } }
      if (T.kind === 'namesea') { g.fillStyle = lgr(g, '#1a3a6a', '#0a1a30', 0, base - 80, 0, GY); g.fillRect(0, base - 60, TW, GY - base + 60); st(g, 1.4, 'rgba(160,220,255,.4)'); for (let k = 0; k < 40; k++) { const x = R() * TW, y = base - 50 + R() * 100; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 14 + R() * 20, y); g.stroke(); } for (const dx of [0, -TW, TW]) { const X = 900 + dx; g.fillStyle = 'rgba(30,40,70,.85)'; g.beginPath(); g.moveTo(X - 60, base - 40); g.lineTo(X + 60, base - 40); g.lineTo(X + 44, base - 16); g.lineTo(X - 44, base - 16); g.closePath(); g.fill(); g.fillRect(X - 3, base - 140, 6, 100); g.beginPath(); g.moveTo(X + 3, base - 136); g.lineTo(X + 46, base - 60); g.lineTo(X + 3, base - 60); g.fill(); } }
      if (T.kind === 'stargarden') {
        for (let k = 0; k < 5; k++) { const x = 150 + k * 290; for (const dx of [0, -TW, TW]) { const X = x + dx, y = base - 120 - (k % 2) * 40; g.beginPath(); g.moveTo(X - 70, y); g.quadraticCurveTo(X, y - 30, X + 70, y); g.quadraticCurveTo(X + 20, y + 40, X, y + 70); g.quadraticCurveTo(X - 20, y + 40, X - 70, y); g.closePath(); g.fillStyle = 'rgba(70,50,140,.85)'; g.fill(); const gl = g.createRadialGradient(X, y + 20, 0, X, y + 20, 70); gl.addColorStop(0, 'rgba(255,220,255,.35)'); gl.addColorStop(1, 'rgba(255,220,255,0)'); g.fillStyle = gl; g.fillRect(X - 70, y - 50, 140, 140); star(g, X, y - 22, 6, '#fff3c0'); } }
      }
      if (T.kind === 'firstcastle') {
        for (const dx of [0, -TW, TW]) { const X = 720 + dx, b0 = base - 30; g.fillStyle = lgr(g, '#a888b8', '#5a3a6a', 0, b0 - 220, 0, GY);
          [[-160, 120, 40], [-90, 180, 46], [0, 230, 60], [90, 180, 46], [160, 120, 40]].forEach(([ox, h, w]) => { g.fillRect(X + ox - w / 2, b0 - h, w, GY - b0 + h); g.beginPath(); g.moveTo(X + ox - w / 2 - 6, b0 - h); g.lineTo(X + ox, b0 - h - w * 1.1); g.lineTo(X + ox + w / 2 + 6, b0 - h); g.closePath(); g.fill(); });
          g.fillStyle = 'rgba(255,230,150,.85)'; for (let q = 0; q < 14; q++) { const ox = [-160, -90, 0, 90, 160][q % 5], wy = b0 - 40 - Math.floor(q / 5) * 40; RR(g, X + ox - 4, wy, 8, 12, 4); g.fill(); }
          star(g, X, b0 - 300, 9, '#fff3c0'); }
      }
      if (T.kind === 'upside') {
        for (let k = 0; k < 5; k++) { const x = 140 + k * 300; for (const dx of [0, -TW, TW]) { const X = x + dx; g.save(); g.translate(X, 30); g.scale(1, -1); g.fillStyle = 'rgba(20,60,80,.75)'; g.beginPath(); g.moveTo(-70, 0); g.lineTo(-60, -40); g.lineTo(-30, -44); g.lineTo(-30, -90); g.lineTo(-14, -110); g.lineTo(2, -90); g.lineTo(2, -50); g.lineTo(30, -60); g.lineTo(40, -30); g.lineTo(70, 0); g.closePath(); g.fill(); g.fillStyle = 'rgba(160,240,255,.5)'; for (let q = 0; q < 4; q++) g.fillRect(-24 + q * 12, -80 + (q % 2) * 20, 5, 7); g.restore(); } }
      }
      if (T.kind === 'clock') {
        for (let k = 0; k < 4; k++) { const x = 160 + k * 360; for (const dx of [0, -TW, TW]) { const X = x + dx, b0 = base - 40, h = 140 + (k % 2) * 40; g.fillStyle = lgr(g, '#b8805a', '#7a4e32', 0, b0 - h, 0, GY); g.fillRect(X - 22, b0 - h, 44, GY - b0 + h); g.beginPath(); g.moveTo(X - 30, b0 - h); g.lineTo(X, b0 - h - 50); g.lineTo(X + 30, b0 - h); g.closePath(); g.fillStyle = '#6a3a2a'; g.fill(); E(g, X, b0 - h + 26, 16, 16); g.fillStyle = '#fff3d6'; g.fill(); st(g, 2.5, '#6a3a2a'); g.stroke(); g.beginPath(); g.moveTo(X, b0 - h + 26); g.lineTo(X + 8, b0 - h + 20); g.moveTo(X, b0 - h + 26); g.lineTo(X, b0 - h + 14); g.stroke(); } }
        for (let k = 0; k < 6; k++) gearShape(g, R() * TW, base - 20 + R() * 40, 26 + R() * 30, 9, 'rgba(110,70,40,.35)', R());
      }
      if (T.kind === 'tower') {
        for (const dx of [0, -TW, TW]) { const X = 720 + dx; g.fillStyle = lgr(g, '#5a4a8a', '#2a2050', 0, 0, 0, GY); g.beginPath(); g.moveTo(X - 70, GY); g.lineTo(X - 46, 40); g.lineTo(X + 46, 40); g.lineTo(X + 70, GY); g.closePath(); g.fill(); g.beginPath(); g.moveTo(X - 56, 40); g.lineTo(X, -30); g.lineTo(X + 56, 40); g.closePath(); g.fillStyle = '#3a2a6a'; g.fill(); E(g, X, 90, 34, 34); g.fillStyle = '#ffeec8'; g.fill(); st(g, 4, '#d9a830'); g.stroke(); st(g, 3, '#3a2a40'); g.beginPath(); g.moveTo(X, 90); g.lineTo(X + 18, 80); g.moveTo(X, 90); g.lineTo(X - 4, 64); g.stroke(); for (let k = 0; k < 6; k++) { E(g, X - 30 + (k % 2) * 60, 150 + k * 34, 6, 10); g.fillStyle = 'rgba(255,220,140,.8)'; g.fill(); } }
        for (let k = 0; k < 10; k++) { const x = R() * TW, y = base - 40 - R() * 120; gearShape(g, x, y, 10 + R() * 18, 8, 'rgba(220,190,255,.28)', R()); }
      }
      if (T.kind === 'volcano') {
        const vx = 520, vh = Math.min(150, base - 130); g.beginPath(); g.moveTo(vx - 170, GY); g.lineTo(vx - 40, base - vh); g.lineTo(vx + 40, base - vh); g.lineTo(vx + 170, GY); g.closePath(); g.fillStyle = lgr(g, '#5a3040', '#3a2030', 0, base - vh, 0, GY); g.fill();
        const gR = Math.max(30, Math.min(90, base - vh - 42)); gr = g.createRadialGradient(vx, base - vh, 4, vx, base - vh, gR); gr.addColorStop(0, 'rgba(255,170,60,.9)'); gr.addColorStop(1, 'rgba(255,90,40,0)'); g.fillStyle = gr; g.beginPath(); g.arc(vx, base - vh, gR, 0, Math.PI * 2); g.fill();
        st(g, 3, 'rgba(255,120,40,.8)'); g.beginPath(); g.moveTo(vx - 10, base - vh + 2); g.quadraticCurveTo(vx - 30, base - 90, vx - 60, GY - 40); g.stroke();
      }
      if (T.kind === 'coast') {
        gr = g.createLinearGradient(0, GY - 120, 0, GY); gr.addColorStop(0, '#5fb3e0'); gr.addColorStop(1, '#2f7fb8'); g.fillStyle = gr; g.fillRect(0, GY - 120, TW, 120);
        st(g, 1.2, 'rgba(255,255,255,.55)'); for (let k = 0; k < 60; k++) { const x = R() * TW, y = GY - 115 + R() * 110; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 8 + R() * 18, y); g.stroke(); }
        for (let k = 0; k < 3; k++) { const x = 200 + k * 480; g.beginPath(); g.moveTo(x - 60, GY - 118); g.quadraticCurveTo(x, GY - 160, x + 70, GY - 118); g.closePath(); g.fillStyle = '#5a8f9e'; g.fill(); }
      }
      if (T.kind === 'sky') { for (let k = 0; k < 26; k++) { const x = R() * TW, y = GY - 60 - R() * 140, r = 30 + R() * 50; for (const dx of [0, -TW, TW]) { E(g, x + dx, y, r, r * 0.6); g.fillStyle = rg(g, '#ffffff', x + dx, y, r, 0.05, 0.08); g.fill(); } } }
      if (T.kind === 'swamp') { for (let k = 0; k < 18; k++) { const x = R() * TW, y = base - 30 - periodic(x, seeds) * 0.3; for (const dx of [0, -TW, TW]) tree(g, x + dx, y + 60, 1.2 + R(), 'swamptree', R, '#1c1226'); } }
      if (T.kind === 'crystal') { for (let k = 0; k < 22; k++) { const x = R() * TW, y = base - periodic(x, seeds) * 0.5 + 50, h = 50 + R() * 110; const col = ['#6fd8ff', '#b48cff', '#7affd0'][k % 3]; for (const dx of [0, -TW, TW]) crystalShard(g, x + dx, y, h, h * 0.18, col, true); } }
      if (T.kind === 'mine') {
        for (let k = 0; k < 12; k++) { const x = R() * TW, y = base - periodic(x, seeds) * 0.4 + 10, w = 26 + R() * 20, h = 22 + R() * 18; for (const dx of [0, -TW, TW]) { const X = x + dx; g.fillStyle = lgr(g, '#7a5a3a', '#4a3020', 0, y - h, 0, y); g.fillRect(X - w / 2, y - h, w, h); g.beginPath(); g.moveTo(X - w / 2 - 4, y - h); g.lineTo(X, y - h - w * 0.45); g.lineTo(X + w / 2 + 4, y - h); g.fillStyle = '#3a2416'; g.fill(); g.fillStyle = 'rgba(255,200,110,.95)'; g.fillRect(X - 5, y - h + 6, 6, 6); g.fillRect(X + 4, y - h + 6, 5, 6); st(g, 1.2, '#2a1a10'); g.beginPath(); g.moveTo(X - w / 2, y); g.lineTo(X - w / 2 - 6, y + 30); g.moveTo(X + w / 2, y); g.lineTo(X + w / 2 + 6, y + 30); g.stroke(); } }
      }
      if (T.kind === 'candy') {
        for (let k = 0; k < 9; k++) { const x = 60 + k * 170 + R() * 40, y = base - periodic(x, seeds) * 0.3 + 44, h = 60 + R() * 50; for (const dx of [0, -TW, TW]) { const X = x + dx; RR(g, X - 3, y - h, 6, h, 3); g.fillStyle = '#fff6ee'; g.fill(); st(g, 1.2, 'rgba(120,60,80,.5)'); g.stroke(); const r = 20 + (k % 3) * 5; E(g, X, y - h, r, r); g.fillStyle = ['#ff8ec0', '#8ed0ff', '#ffd36a', '#a8e8a0'][k % 4]; g.fill(); g.stroke(); st(g, 4, 'rgba(255,255,255,.7)'); g.beginPath(); for (let a = 0; a < 9; a += 0.3) { const rr = a * r / 9; g.lineTo(X + Math.cos(a) * rr, y - h + Math.sin(a) * rr); } g.stroke(); } }
        for (let k = 0; k < 6; k++) { const x = R() * TW, y = base + 20; for (const dx of [0, -TW, TW]) { g.beginPath(); g.moveTo(x + dx - 22, y + 20); g.quadraticCurveTo(x + dx - 18, y - 16, x + dx, y - 18); g.quadraticCurveTo(x + dx + 18, y - 16, x + dx + 22, y + 20); g.closePath(); g.fillStyle = ['#ff9ec4', '#9ee6c8', '#c8a0ff'][k % 3]; g.fill(); st(g, 1.5, 'rgba(90,40,60,.5)'); g.stroke(); E(g, x + dx - 6, y - 8, 4, 2.5); g.fillStyle = 'rgba(255,255,255,.7)'; g.fill(); } }
      }
      if (T.kind === 'rainbow') { for (let k = 0; k < 9; k++) { const x = R() * TW, y = base - periodic(x, seeds) * 0.3 + 40; for (const dx of [0, -TW, TW]) { const X = x + dx; st(g, 2, '#c8a0d8'); g.beginPath(); g.moveTo(X, y + 20); g.lineTo(X, y - 30); g.stroke(); E(g, X, y - 38, 9, 11); g.fillStyle = ['#ffd0e0', '#d0f0ff', '#fff0b0', '#e0d0ff'][k % 4]; g.fill(); g.save(); g.globalCompositeOperation = 'lighter'; g.drawImage(softDot('#fff6d0'), X - 22, y - 60, 44, 44); g.restore(); } } }
      if (T.kind === 'oldcatrep') { for (let k = 0; k < 9; k++) { const x = R() * TW, y = base - periodic(x, seeds) * 0.3 + 44; for (const dx of [0, -TW, TW]) { const X = x + dx; g.fillStyle = '#8a6a4a'; g.fillRect(X - 1.5, y - 30, 3, 30); g.fillStyle = ['#ff9a8a', '#ffd38a', '#a8d8ff'][k % 3]; g.beginPath(); g.moveTo(X + 1.5, y - 30); g.lineTo(X + 16, y - 25); g.lineTo(X + 1.5, y - 20); g.closePath(); g.fill(); } } g.fillStyle = 'rgba(140,100,50,.08)'; g.fillRect(0, 0, TW, GY); }
      if (T.kind === 'lastgate') { for (let k = 0; k < 8; k++) { const x = R() * TW, y = base - periodic(x, seeds) * 0.3 + 46; for (const dx of [0, -TW, TW]) { const X = x + dx; g.fillStyle = '#5a4a58'; g.save(); g.translate(X, y); g.rotate((R() - 0.5) * 0.6); g.fillRect(-2, -28, 4, 28); g.fillRect(-9, -20, 18, 3); g.restore(); } } }
      if (T.kind === 'icehaven') { for (let k = 0; k < 8; k++) { const x = R() * TW, y = base - periodic(x, seeds) * 0.3 + 46; for (const dx of [0, -TW, TW]) { const X = x + dx; g.fillStyle = 'rgba(220,240,255,.95)'; g.beginPath(); g.moveTo(X - 16, y + 10); g.lineTo(X - 6, y - 16); g.lineTo(X + 4, y - 6); g.lineTo(X + 16, y + 10); g.closePath(); g.fill(); g.strokeStyle = 'rgba(160,200,230,.8)'; g.lineWidth = 1.2; g.stroke(); } } }
      if (T.kind === 'whalecave') { for (let k = 0; k < 10; k++) { const x = R() * TW, y = base - periodic(x, seeds) * 0.3 + 48; for (const dx of [0, -TW, TW]) { const X = x + dx; g.fillStyle = ['#8ad8ff', '#c8a8ff', '#ff9ed8'][k % 3]; g.beginPath(); g.moveTo(X, y - 18); g.lineTo(X + 6, y); g.lineTo(X - 6, y); g.closePath(); g.fill(); } } g.fillStyle = 'rgba(20,10,50,.12)'; g.fillRect(0, 0, TW, GY); }
      if (T.kind === 'windnest') { for (let k = 0; k < 9; k++) { const x = R() * TW, y = base - periodic(x, seeds) * 0.3 + 44; for (const dx of [0, -TW, TW]) { const X = x + dx; [[0, 0, 22], [18, 4, 16], [-16, 5, 14]].forEach(([ox, oy, r]) => { E(g, X + ox, y + oy, r, r * 0.6); g.fillStyle = 'rgba(255,255,255,.9)'; g.fill(); }); g.save(); g.translate(X + 6, y - 14); g.rotate(k); g.fillStyle = ['#ffb0c8', '#a8d8ff', '#ffe08a'][k % 3]; E(g, 0, 0, 8, 2.4); g.fill(); g.restore(); } } }
      if (T.kind === 'stormcrown') { for (let k = 0; k < 8; k++) { const x = R() * TW, y = base - periodic(x, seeds) * 0.3 + 46; for (const dx of [0, -TW, TW]) { const X = x + dx; g.fillStyle = '#4a4a66'; g.beginPath(); g.moveTo(X - 14, y + 10); g.lineTo(X - 4, y - 26); g.lineTo(X + 6, y - 12); g.lineTo(X + 14, y + 10); g.closePath(); g.fill(); } } g.fillStyle = 'rgba(20,20,50,.15)'; g.fillRect(0, 0, TW, GY); }
      if (T.kind === 'clockforest') { for (let k = 0; k < 10; k++) { const x = R() * TW, y = base - periodic(x, seeds) * 0.3 + 44; for (const dx of [0, -TW, TW]) { const X = x + dx; E(g, X, y, 16, 10); g.fillStyle = '#2a4a32'; g.fill(); E(g, X - 6, y - 6, 8, 5); g.fill(); g.save(); g.globalCompositeOperation = 'lighter'; g.drawImage(softDot('#c8ffb0'), X - 14 + (k % 3) * 8, y - 40, 22, 22); g.restore(); } } g.fillStyle = 'rgba(10,30,40,.18)'; g.fillRect(0, 0, TW, GY); }
      if (T.kind === 'dawngarden') { for (let k = 0; k < 12; k++) { const x = R() * TW, y = base - periodic(x, seeds) * 0.3 + 46; for (const dx of [0, -TW, TW]) { const X = x + dx; st(g, 1.4, '#5a8a4a'); g.beginPath(); g.moveTo(X, y + 8); g.lineTo(X, y - 18); g.stroke(); const c = ['#f0a0c8', '#f8e080', '#a8d0f8', '#ffffff'][k % 4]; E(g, X, y - 22, 4, 6); g.fillStyle = c; g.fill(); } } }
      if (T.kind === 'starmarket') { for (let k = 0; k < 9; k++) { const x = R() * TW, y = base - periodic(x, seeds) * 0.3 + 44; for (const dx of [0, -TW, TW]) { const X = x + dx; st(g, 1.2, '#7a5a30'); g.beginPath(); g.moveTo(X, y + 10); g.lineTo(X, y - 30); g.stroke(); star(g, X, y - 36, 6, ['#ffe27a', '#ffb0d0', '#a8e0ff'][k % 3]); g.save(); g.globalCompositeOperation = 'lighter'; g.drawImage(softDot('#ffe8a0'), X - 20, y - 56, 40, 40); g.restore(); } } }
      if (T.kind === 'hourglass') { for (let k = 0; k < 7; k++) { const x = R() * TW, y = base - periodic(x, seeds) * 0.3 + 46; for (const dx of [0, -TW, TW]) { const X = x + dx; g.fillStyle = '#c8a050'; RR(g, X - 12, y - 42, 24, 4, 2); g.fill(); RR(g, X - 12, y + 2, 24, 4, 2); g.fill(); g.fillStyle = 'rgba(200,240,255,.7)'; g.beginPath(); g.moveTo(X - 10, y - 38); g.lineTo(X + 10, y - 38); g.lineTo(X + 2, y - 18); g.lineTo(X + 10, y + 2); g.lineTo(X - 10, y + 2); g.lineTo(X - 2, y - 18); g.closePath(); g.fill(); g.fillStyle = '#f0c870'; g.beginPath(); g.moveTo(X - 7, y + 2); g.lineTo(X + 7, y + 2); g.lineTo(X, y - 8); g.closePath(); g.fill(); } } }
      if (T.kind === 'silentmt') { for (let k = 0; k < 8; k++) { const x = R() * TW, y = base - periodic(x, seeds) * 0.3 + 44; for (const dx of [0, -TW, TW]) { const X = x + dx; g.fillStyle = '#5a7a6a'; g.beginPath(); g.moveTo(X - 18, y + 10); g.lineTo(X, y - 46); g.lineTo(X + 18, y + 10); g.closePath(); g.fill(); g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(X - 9, y - 18); g.lineTo(X, y - 46); g.lineTo(X + 9, y - 18); g.quadraticCurveTo(X, y - 24, X - 9, y - 18); g.fill(); if (k % 3 === 0) { g.fillStyle = '#c8a050'; E(g, X + 26, y - 4, 6, 7); g.fill(); g.fillStyle = '#8a6a30'; g.fillRect(X + 24, y - 14, 4, 4); } } } }
      if (T.kind === 'echocave') { for (let k = 0; k < 10; k++) { const x = R() * TW, y = base - periodic(x, seeds) * 0.3 + 46; for (const dx of [0, -TW, TW]) { const X = x + dx; [[-8, 18], [0, 30], [9, 22]].forEach(([ox, h], q) => { g.fillStyle = ['#bfe8ff', '#d8c0ff', '#ffc8ec'][(k + q) % 3]; g.beginPath(); g.moveTo(X + ox - 5, y + 6); g.lineTo(X + ox, y + 6 - h); g.lineTo(X + ox + 5, y + 6); g.closePath(); g.fill(); }); g.save(); g.globalCompositeOperation = 'lighter'; g.drawImage(softDot('#c8b8ff'), X - 24, y - 34, 48, 48); g.restore(); } } g.fillStyle = 'rgba(20,10,40,.18)'; g.fillRect(0, 0, TW, GY); }
      if (T.kind === 'shadowvil') { for (let k = 0; k < 9; k++) { const x = R() * TW, y = base - periodic(x, seeds) * 0.3 + 46; for (const dx of [0, -TW, TW]) { const X = x + dx; g.fillStyle = '#2a2236'; E(g, X, y - 40, 26, 34); g.fill(); g.fillRect(X - 3, y - 10, 6, 30); for (let q = 0; q < 3; q++) { E(g, X - 14 + q * 14, y - 50 + q * 8, 2, 2); g.fillStyle = 'rgba(255,230,140,.9)'; g.fill(); g.fillStyle = '#2a2236'; } } } g.fillStyle = 'rgba(30,20,50,.2)'; g.fillRect(0, 0, TW, GY); }
      if (T.kind === 'catrep') { for (let k = 0; k < 10; k++) { const x = 70 + k * 150, y = base - periodic(x, seeds) * 0.3 + 40; for (const dx of [0, -TW, TW]) { const X = x + dx; g.fillStyle = '#c8604a'; RR(g, X - 3, y - 70, 6, 70, 2); g.fill(); g.fillStyle = k % 2 ? '#3a8ad0' : '#ff8a4a'; g.beginPath(); g.moveTo(X + 3, y - 68); g.quadraticCurveTo(X + 30, y - 72, X + 36, y - 60); g.lineTo(X + 28, y - 54); g.lineTo(X + 36, y - 48); g.quadraticCurveTo(X + 20, y - 46, X + 3, y - 50); g.closePath(); g.fill(); g.fillStyle = '#fff'; E(g, X + 26, y - 60, 2, 2); g.fill(); } } }
      if (T.kind === 'feather') { for (let k = 0; k < 10; k++) { const x = R() * TW, y = base - periodic(x, seeds) * 0.3 + 50; for (const dx of [0, -TW, TW]) { const X = x + dx; g.save(); g.translate(X, y); g.rotate(-0.2 + (k % 3) * 0.2); g.fillStyle = ['#ff9a6a', '#ffd36a', '#8ad0ff', '#c8a0ff'][k % 4]; g.beginPath(); g.ellipse(0, -36, 9, 36, 0, 0, TAU); g.fill(); st(g, 1.4, 'rgba(255,255,255,.8)'); g.beginPath(); g.moveTo(0, 2); g.lineTo(0, -70); g.stroke(); g.restore(); } } }
      if (T.kind === 'burrow') { for (let k = 0; k < 12; k++) { const x = R() * TW, y = base - periodic(x, seeds) * 0.3 + 46, h = 20 + R() * 30; for (const dx of [0, -TW, TW]) { const X = x + dx; g.fillStyle = '#e8d8b8'; g.fillRect(X - 3, y - h, 6, h); E(g, X, y - h, 14, 8); g.fillStyle = ['#ff8a4a', '#c8604a', '#ffb84a'][k % 3]; g.fill(); g.save(); g.globalCompositeOperation = 'lighter'; g.drawImage(softDot('#ffc860'), X - 20, y - h - 20, 40, 40); g.restore(); } } g.fillStyle = 'rgba(40,20,0,.2)'; g.fillRect(0, 0, TW, GY); }
      if (T.kind === 'namesea') { for (let k = 0; k < 8; k++) { const x = R() * TW, y = base + 30; for (const dx of [0, -TW, TW]) { g.fillStyle = 'rgba(120,200,255,.25)'; E(g, x + dx, y, 60, 12); g.fill(); } } g.fillStyle = 'rgba(10,20,50,.2)'; g.fillRect(0, 0, TW, GY); }
      if (T.kind === 'stargarden') {
        for (let k = 0; k < 11; k++) { const x = R() * TW, y = base - periodic(x, seeds) * 0.3 + 40, h = 50 + R() * 70, c = ['#ff9ee0', '#9ec8ff', '#ffe08a', '#c8a0ff'][k % 4]; for (const dx of [0, -TW, TW]) { const X = x + dx; st(g, 3, '#3a7a5a'); g.beginPath(); g.moveTo(X, y + 30); g.quadraticCurveTo(X - 8, y - h * 0.5, X, y - h); g.stroke(); for (let q = 0; q < 6; q++) { const an = q / 6 * TAU; E(g, X + Math.cos(an) * 9, y - h + Math.sin(an) * 9, 8, 5, an); g.fillStyle = c; g.fill(); } star(g, X, y - h, 6, '#fffbe0'); const gl = g.createRadialGradient(X, y - h, 0, X, y - h, 30); gl.addColorStop(0, rgba(c, 0.45)); gl.addColorStop(1, rgba(c, 0)); g.fillStyle = gl; g.fillRect(X - 30, y - h - 30, 60, 60); } }
        for (let k = 0; k < 3; k++) { const x = 240 + k * 480; for (const dx of [0, -TW, TW]) { st(g, 7, 'rgba(200,230,255,.55)'); g.beginPath(); g.arc(x + dx, base + 60, 80, Math.PI * 1.05, Math.PI * 1.95); g.stroke(); } }
      }
      if (T.kind === 'firstcastle') {
        for (let k = 0; k < 8; k++) { const x = 90 + k * 180; for (const dx of [0, -TW, TW]) { const X = x + dx, h = 150; g.fillStyle = lgr(g, '#fff6e0', '#c8b898', 0, base - h, 0, GY); g.fillRect(X - 12, base - h + 40, 24, GY - base + h); RR(g, X - 17, base - h + 30, 34, 12, 3); g.fill(); g.fillStyle = k % 2 ? '#3a5ac8' : '#c83a4a'; g.beginPath(); g.moveTo(X - 10, base - h + 44); g.lineTo(X + 10, base - h + 44); g.lineTo(X + 10, base - h + 100); g.lineTo(X, base - h + 90); g.lineTo(X - 10, base - h + 100); g.closePath(); g.fill(); bone(g, X, base - h + 66, 12, '#ffd34d', 0); } }
      }
      if (T.kind === 'upside') {
        for (let k = 0; k < 12; k++) { const x = R() * TW, y = base - periodic(x, seeds) * 0.3 + 40, h = 40 + R() * 70; for (const dx of [0, -TW, TW]) { const X = x + dx; st(g, 5, k % 2 ? '#1e6a5a' : '#2a7a6a'); g.beginPath(); g.moveTo(X, y + 30); for (let q = 0; q <= 6; q++) g.lineTo(X + Math.sin(q * 1.2 + k) * 8, y + 30 - q * h / 6); g.stroke(); } }
        for (let k = 0; k < 6; k++) { const x = R() * TW, y = base + 24; for (const dx of [0, -TW, TW]) { g.fillStyle = ['#ff7a8a', '#ffb06a', '#c88aff'][k % 3]; for (let q = 0; q < 5; q++) { g.beginPath(); g.moveTo(x + dx, y + 24); g.lineTo(x + dx - 12 + q * 6, y - 4 - (q % 2) * 10); g.lineTo(x + dx - 9 + q * 6, y + 24); g.fill(); } } }
        g.fillStyle = 'rgba(5,20,40,.25)'; g.fillRect(0, 0, TW, GY);
      }
      if (T.kind === 'clock') {
        for (let k = 0; k < 9; k++) { const x = 80 + k * 170 + R() * 40, w = 50 + R() * 30, h = 50 + R() * 40, y = base - periodic(x, seeds) * 0.3 + 40; for (const dx of [0, -TW, TW]) { const X = x + dx; g.fillStyle = ['#e8c89a', '#d9a878', '#f0d8b0'][k % 3]; g.fillRect(X - w / 2, y - h, w, h); st(g, 1.5, '#5a3a22'); g.strokeRect(X - w / 2, y - h, w, h); g.beginPath(); g.moveTo(X - w / 2 - 8, y - h); g.lineTo(X, y - h - 34); g.lineTo(X + w / 2 + 8, y - h); g.closePath(); g.fillStyle = ['#b04a3a', '#3a6a9a', '#6a8a3a'][k % 3]; g.fill(); g.stroke(); E(g, X, y - h - 10, 7, 7); g.fillStyle = '#fff8e0'; g.fill(); g.stroke(); RR(g, X - 7, y - 22, 14, 22, 3); g.fillStyle = '#6e4320'; g.fill(); g.fillStyle = 'rgba(255,220,140,.9)'; g.fillRect(X - w / 2 + 6, y - h + 12, 10, 10); g.fillRect(X + w / 2 - 16, y - h + 12, 10, 10); } }
        for (let k = 0; k < 5; k++) { const x = R() * TW; for (const dx of [0, -TW, TW]) gearShape(g, x + dx, base + 10, 30 + R() * 16, 10, 'rgba(120,80,40,.45)', R()); }
      }
      if (T.kind === 'tower') {
        for (let k = 0; k < 10; k++) { const x = R() * TW, y = base - periodic(x, seeds) * 0.3 + 30, h = 40 + R() * 80; for (const dx of [0, -TW, TW]) { const X = x + dx; g.fillStyle = lgr(g, '#7a6aa8', '#3a2a5a', 0, y - h, 0, y); g.fillRect(X - 9, y - h, 18, h + 30); g.fillStyle = '#d9a830'; g.fillRect(X - 12, y - h - 4, 24, 6); } }
        for (let k = 0; k < 8; k++) { const x = R() * TW, y = base - 80 - R() * 60; for (const dx of [0, -TW, TW]) { RR(g, x + dx - 20, y, 40, 8, 3); g.fillStyle = '#6a5a9a'; g.fill(); } }
        g.fillStyle = 'rgba(30,20,60,.25)'; g.fillRect(0, 0, TW, GY);
      }
      if (T.kind === 'fossil') {
        for (let k = 0; k < 4; k++) { const x = 200 + k * 360; for (const dx of [0, -TW, TW]) { const X = x + dx; st(g, 10, '#d9c8a0'); for (let r = 0; r < 6; r++) { g.beginPath(); g.arc(X + r * 26, base + 30, 70 - r * 6, Math.PI * 1.05, Math.PI * 1.95); g.stroke(); } st(g, 12, '#e8dcbc'); g.beginPath(); g.moveTo(X - 60, base - 30); g.quadraticCurveTo(X + 60, base - 60, X + 190, base - 20); g.stroke(); } }
        g.fillStyle = 'rgba(14,46,46,.35)'; g.fillRect(0, 0, TW, GY);
      }
      if (T.kind === 'starsea') {
        gr = g.createLinearGradient(0, GY - 130, 0, GY); gr.addColorStop(0, '#1b4a9a'); gr.addColorStop(1, '#0a1c48'); g.fillStyle = gr; g.fillRect(0, GY - 130, TW, 130);
        for (let k = 0; k < 140; k++) { const x = R() * TW, y = GY - 128 + R() * 125; g.fillStyle = `rgba(200,230,255,${R() * 0.6})`; g.fillRect(x, y, 1 + R() * 10, 1); }
        for (let k = 0; k < 5; k++) { const x = 140 + k * 300; for (const dx of [0, -TW, TW]) { g.beginPath(); g.moveTo(x + dx - 50, GY - 126); g.quadraticCurveTo(x + dx, GY - 170 - R() * 40, x + dx + 60, GY - 126); g.closePath(); g.fillStyle = '#2a3f7a'; g.fill(); E(g, x + dx + 4, GY - 150, 4, 4); g.fillStyle = 'rgba(255,240,180,.8)'; g.fill(); } }
      }
      if (T.kind === 'aurora') { for (let k = 0; k < 9; k++) { const x = R() * TW, h = 70 + R() * 90; for (const dx of [0, -TW, TW]) { g.fillStyle = lgr(g, '#ffffff', '#b8ccd8', x + dx - 8, 0, x + dx + 8, 0); g.fillRect(x + dx - 7, base - h + 40, 14, h); g.fillStyle = '#eef4f8'; g.fillRect(x + dx - 11, base - h + 34, 22, 7); } } }
      if (T.kind === 'castle') { for (const dx of [0, -TW, TW]) castleSil(g, 720 + dx, base - 10, 1.1); const gl = g.createRadialGradient(720, base - 160, 10, 720, base - 160, 260); gl.addColorStop(0, 'rgba(255,220,140,.35)'); gl.addColorStop(1, 'rgba(255,220,140,0)'); g.fillStyle = gl; g.fillRect(400, base - 420, 640, 420); }
      g.fillStyle = rgba(T.sky[2], 0.35); g.fillRect(0, GY - 70, TW, 70);
    });
    const mid = layer(170, GY - 160, g => {
      const seeds = [[3, 26, R() * 6], [7, 12, R() * 6], [13, 5, R() * 6]];
      const base = GY - 55;
      g.beginPath(); g.moveTo(0, GY + 10); for (let x = 0; x <= TW; x += 6) g.lineTo(x, base - periodic(x, seeds)); g.lineTo(TW, GY + 10); g.closePath();
      g.fillStyle = lgr(g, T.mid, T.mid2, 0, base - 40, 0, GY); g.fill();
      if (T.kind === 'desert') { st(g, 1.4, 'rgba(255,240,200,.45)'); for (let k = 0; k < 30; k++) { const x = R() * TW, y = base - periodic(x, seeds) + 8 + R() * 30; g.beginPath(); g.moveTo(x - 20, y); g.quadraticCurveTo(x, y - 5, x + 20, y); g.stroke(); } }
      const kind = { meadow: 'round', forest: 'pine', desert: 'cactus', snow: 'snowpine', volcano: 'dead', coast: 'palm', sky: 'island', swamp: 'swamptree', crystal: null, castle: null, starsea: null, aurora: 'snowpine', mine: null, fossil: null, clock: null, tower: null, candy: null, upside: null, stargarden: null, firstcastle: null, catrep: null, feather: null, burrow: null, namesea: null, rainbow: null, shadowvil: null, silentmt: 'snowpine', echocave: null, starmarket: 'cactus', hourglass: 'palm', clockforest: 'pine', dawngarden: 'round', windnest: null, stormcrown: null, icehaven: null, whalecave: null, oldcatrep: 'round', lastgate: null }[T.kind];
      const cnt = T.kind === 'forest' ? 46 : T.kind === 'desert' ? 9 : T.kind === 'sky' ? 6 : T.kind === 'coast' ? 12 : 22;
      if (T.kind === 'crystal') for (let k = 0; k < 26; k++) { const x = R() * TW, y = base - periodic(x, seeds) + 8, h = 24 + R() * 50; const col = ['#6fd8ff', '#b48cff', '#7affd0', '#ff9be8'][k % 4]; for (const dx of [0, -TW, TW]) { crystalShard(g, x + dx, y, h, h * 0.2, col, true); crystalShard(g, x + dx + h * 0.25, y, h * 0.6, h * 0.14, col, false); } }
      if (T.kind === 'fossil') for (let k = 0; k < 26; k++) { const x = R() * TW, y = base - periodic(x, seeds) + 6, s2 = 0.7 + R() * 0.7; for (const dx of [0, -TW, TW]) { const X = x + dx; st(g, 2, '#2a6a4a'); for (let q = 0; q < 6; q++) { const a = -Math.PI / 2 + (q - 2.5) * 0.35; g.beginPath(); g.moveTo(X, y); g.quadraticCurveTo(X + Math.cos(a) * 14 * s2, y + Math.sin(a) * 18 * s2, X + Math.cos(a) * 26 * s2, y + Math.sin(a) * 30 * s2); g.stroke(); } g.save(); g.globalCompositeOperation = 'lighter'; g.drawImage(softDot('#7affc8'), X - 10, y - 30 * s2 - 10, 20, 20); g.restore(); } }
      if (T.kind === 'mine') for (let k = 0; k < 16; k++) { const x = R() * TW, y = base - periodic(x, seeds) + 8; for (const dx of [0, -TW, TW]) { const X = x + dx; E(g, X, y, 16, 10); g.fillStyle = rg(g, '#5a4030', X, y, 16, 0.3, 0.2); g.fill(); if (R() < 0.6) { crystalShard(g, X + 4, y - 4, 12, 3, ['#ffd27a', '#7ad7ff', '#ff8a6a'][k % 3], true); } } }
      if (T.kind === 'starsea') for (let k = 0; k < 18; k++) { const x = R() * TW, y = base - periodic(x, seeds) + 6, h = 20 + R() * 40; for (const dx of [0, -TW, TW]) { g.save(); g.globalCompositeOperation = 'lighter'; g.drawImage(softDot(['#7ad7ff', '#c9a0ff', '#ffb3e6'][k % 3]), x + dx - h, y - h * 1.6, h * 2, h * 2); g.restore(); crystalShard(g, x + dx, y, h, h * 0.16, ['#7ad7ff', '#c9a0ff', '#ffb3e6'][k % 3], false); } }
      if (T.kind === 'castle') for (let k = 0; k < 14; k++) { const x = R() * TW, y = base - periodic(x, seeds) + 6; for (const dx of [0, -TW, TW]) { const X = x + dx; g.fillStyle = '#2a2050'; g.fillRect(X - 2, y - 46, 4, 46); RR(g, X - 8, y - 60, 16, 16, 4); g.fill(); const gl = g.createRadialGradient(X, y - 52, 0, X, y - 52, 26); gl.addColorStop(0, 'rgba(255,230,150,.9)'); gl.addColorStop(1, 'rgba(255,230,150,0)'); g.fillStyle = gl; g.fillRect(X - 26, y - 78, 52, 52); } }
      for (let k = 0; kind && k < cnt; k++) {
        const x = R() * TW, y = base - periodic(x, seeds) + 4, s = 0.7 + R() * 0.6;
        const kk = T.kind === 'forest' && R() < 0.35 ? 'round' : kind;
        for (const dx of [0, -TW, TW]) tree(g, x + dx, y - (kk === 'island' ? 60 : 0), s, kk, R, kk === 'round' ? (T.kind === 'forest' ? '#3f8f4f' : '#5fb74e') : T.kind === 'snow' ? '#2f6a57' : T.kind === 'swamp' ? '#24182c' : '#2f6b3f');
      }
      if (T.kind === 'swamp') for (let k = 0; k < 30; k++) { const x = R() * TW, y = base - periodic(x, seeds) + 10 + R() * 30; const gl = g.createRadialGradient(x, y, 0, x, y, 8); gl.addColorStop(0, 'rgba(120,255,200,.8)'); gl.addColorStop(1, 'rgba(120,255,200,0)'); g.fillStyle = gl; E(g, x, y, 8, 8); g.fill(); }
      if (T.kind === 'volcano') for (let k = 0; k < 14; k++) { const x = R() * TW, y = base - periodic(x, seeds) + 10; st(g, 1.6, 'rgba(255,110,40,.7)'); g.beginPath(); g.moveTo(x, y); g.lineTo(x + 8, y + 10); g.lineTo(x + 2, y + 22); g.stroke(); }
    });
    const near = layer(GY - 80, 92, g => {
      for (let k = 0; k < 40; k++) {
        const x = R() * TW, y = GY - 4, s = 0.6 + R() * 0.8;
        for (const dx of [0, -TW, TW]) {
          const X = x + dx;
          if (T.kind === 'meadow' || T.kind === 'forest') {
            for (const [bx, by, r] of [[0, -10, 12], [-11, -5, 9], [11, -6, 9.5]]) { E(g, X + bx * s, y + by * s, r * s, r * s); g.fillStyle = rg(g, T.near, X + bx * s, y + by * s, r * s, 0.3, 0.2); g.fill(); }
            if (T.kind === 'meadow' && R() < 0.6) for (let f = 0; f < 3; f++) { const fx = X + (R() - 0.5) * 24 * s, fy = y - (8 + R() * 10) * s; for (let p = 0; p < 5; p++) { const an = p / 5 * TAU; E(g, fx + Math.cos(an) * 2.4, fy + Math.sin(an) * 2.4, 1.9, 1.9); g.fillStyle = ['#ff8fb1', '#fff', '#ffd34d', '#c59bff'][f % 4]; g.fill(); } E(g, fx, fy, 1.4, 1.4); g.fillStyle = '#ffb300'; g.fill(); }
            if (T.kind === 'forest' && R() < 0.4) { RR(g, X - 2, y - 9, 4, 9, 1.5); g.fillStyle = '#f2e6d0'; g.fill(); E(g, X, y - 9, 7, 4.5); g.fillStyle = rg(g, '#e53935', X, y - 9, 7); g.fill(); g.fillStyle = '#fff'; E(g, X - 2.5, y - 10.5, 1.2, 1); g.fill(); E(g, X + 2.5, y - 9.5, 1, 0.9); g.fill(); }
          } else if (T.kind === 'desert') { E(g, X, y - 3, 12 * s, 6 * s); g.fillStyle = rg(g, '#b98a55', X, y - 3, 12 * s); g.fill(); if (R() < 0.3) bone(g, X + 10, y - 3, 14, '#f3ead6', R()); }
          else if (T.kind === 'snow') { E(g, X, y - 4, 16 * s, 8 * s); g.fillStyle = rg(g, '#ffffff', X, y - 4, 16 * s, 0.1, 0.12); g.fill(); }
          else if (T.kind === 'coast') { if (R() < 0.5) { st(g, 1.6, '#7fb85a'); for (let q = -2; q <= 2; q++) { g.beginPath(); g.moveTo(X + q * 3, y); g.quadraticCurveTo(X + q * 5, y - 10 * s, X + q * 8, y - 16 * s); g.stroke(); } } else { g.save(); g.translate(X, y - 3); g.fillStyle = R() < 0.5 ? '#ffb3c1' : '#fff3d6'; g.beginPath(); g.moveTo(-6, 0); g.quadraticCurveTo(0, -10, 6, 0); g.closePath(); g.fill(); st(g, 0.6, 'rgba(150,90,60,.6)'); for (let q = -2; q <= 2; q++) { g.beginPath(); g.moveTo(0, -1); g.lineTo(q * 2.4, -7); g.stroke(); } g.restore(); } }
          else if (T.kind === 'sky') { for (const [bx, by, r] of [[0, -8, 14], [-12, -3, 10], [12, -4, 11]]) { E(g, X + bx * s, y + by * s, r * s, r * s * 0.8); g.fillStyle = rg(g, '#ffffff', X + bx * s, y + by * s, r * s, 0.05, 0.1); g.fill(); } }
          else if (T.kind === 'swamp') { st(g, 1.4, '#3a4a2a'); for (let q = 0; q < 4; q++) { g.beginPath(); g.moveTo(X + q * 3, y); g.quadraticCurveTo(X + q * 3 + 2, y - 12 * s, X + q * 3 - 1, y - 22 * s); g.stroke(); } if (R() < 0.4) { RR(g, X + 8, y - 8, 3, 8, 1); g.fillStyle = '#d8cde8'; g.fill(); E(g, X + 9.5, y - 9, 6, 3.6); g.fillStyle = rg(g, '#9b6bff', X + 9.5, y - 9, 6, 0.4); g.fill(); } }
          else if (T.kind === 'crystal') { E(g, X, y - 3, 12 * s, 6 * s); g.fillStyle = rg(g, '#3a3a66', X, y - 3, 12 * s); g.fill(); if (R() < 0.6) crystalShard(g, X + 4, y - 2, 16 * s, 3.4 * s, ['#6fd8ff', '#b48cff', '#7affd0'][k % 3], true); }
          else if (T.kind === 'mine') { E(g, X, y - 4, 10 * s, 6 * s); g.fillStyle = rg(g, '#6a4a2a', X, y - 4, 10 * s); g.fill(); if (R() < 0.3) { st(g, 1.2, '#3a2416'); g.beginPath(); g.moveTo(X - 6, y); g.lineTo(X + 8, y - 14); g.stroke(); E(g, X + 9, y - 15, 3, 2); g.fillStyle = '#9aa4ad'; g.fill(); } }
          else if (T.kind === 'fossil') { if (R() < 0.5) bone(g, X, y - 3, 16 * s, '#e8dcbc', R() * 3); else { st(g, 1.4, '#3a8a5a'); for (let q = 0; q < 3; q++) { g.beginPath(); g.moveTo(X + q * 3, y); g.quadraticCurveTo(X + q * 4, y - 10 * s, X + q * 3 + 4, y - 16 * s); g.stroke(); } E(g, X + 10, y - 16 * s, 2.6, 2.6); g.fillStyle = '#9fffd8'; g.fill(); } }
          else if (T.kind === 'starsea') { if (R() < 0.6) { st(g, 1.4, '#5aa8ff'); for (let q = 0; q < 3; q++) { g.beginPath(); g.moveTo(X + q * 3, y); g.quadraticCurveTo(X + q * 4, y - 10 * s, X + q * 3 - 2, y - 18 * s); g.stroke(); } E(g, X + 4, y - 18 * s, 2.4, 2.4); g.fillStyle = '#bfe6ff'; g.fill(); } else { star(g, X, y - 6, 5 * s, '#ffe27a'); } }
          else if (T.kind === 'aurora') { E(g, X, y - 4, 14 * s, 7 * s); g.fillStyle = rg(g, '#ffffff', X, y - 4, 14 * s, 0.1, 0.12); g.fill(); if (R() < 0.4) crystalShard(g, X + 8, y - 2, 14 * s, 3 * s, '#9feaff', true); }
          else if (T.kind === 'castle') { if (R() < 0.6) { st(g, 1.2, '#7a6ac0'); g.beginPath(); g.moveTo(X, y); g.lineTo(X, y - 12 * s); g.stroke(); star(g, X, y - 14 * s, 5 * s, ['#ffe27a', '#bfe6ff', '#ffb3e6'][k % 3]); } else { E(g, X, y - 3, 10 * s, 5 * s); g.fillStyle = rg(g, '#4a3c88', X, y - 3, 10 * s); g.fill(); } }
          else { E(g, X, y - 4, 12 * s, 7 * s); g.fillStyle = rg(g, '#3a2a2a', X, y - 4, 12 * s); g.fill(); E(g, X + 3, y - 5, 2, 1.4); g.fillStyle = '#ff7043'; g.fill(); }
        }
      }
    });
    // 땅 타일
    const GT = 512, gh = H - GY + 14;
    const ground = mk(GT * BGS, gh * BGS), gg = ground.getContext('2d'); gg.scale(BGS, BGS); gg.translate(0, -(GY - 14));
    gr = gg.createLinearGradient(0, GY - 6, 0, H); gr.addColorStop(0, T.g1); gr.addColorStop(1, T.g2); gg.fillStyle = gr; gg.fillRect(0, GY - 6, GT, H - GY + 6);
    gg.fillStyle = rgba(T.path, 0.55); gg.fillRect(0, GY + 2, GT, 32);
    gr = gg.createLinearGradient(0, GY + 30, 0, GY + 40); gr.addColorStop(0, rgba(T.path, 0.4)); gr.addColorStop(1, rgba(T.path, 0)); gg.fillStyle = gr; gg.fillRect(0, GY + 30, GT, 10);
    for (let k = 0; k < 70; k++) { const x = R() * GT, y = GY + 4 + R() * (H - GY), r = 1 + R() * 3.5; for (const dx of [0, -GT, GT]) { E(gg, x + dx, y, r * 1.4, r); gg.fillStyle = rgba(DK(T.g1, 0.25), 0.55); gg.fill(); E(gg, x + dx - r * 0.3, y - r * 0.3, r * 0.6, r * 0.4); gg.fillStyle = rgba(LI(T.g1, 0.4), 0.5); gg.fill(); } }
    gg.fillStyle = T.top; gg.fillRect(0, GY - 12, GT, 9);
    for (let x = 0; x < GT; x += 3) {
      const h2 = 4 + R() * 7;
      if (T.kind === 'meadow' || T.kind === 'forest') { gg.fillStyle = R() < 0.5 ? LI(T.top, 0.15) : DK(T.top, 0.12); gg.beginPath(); gg.moveTo(x, GY - 4); gg.lineTo(x + 1.5, GY - 4 - h2); gg.lineTo(x + 3, GY - 4); gg.fill(); }
      else if (T.kind === 'snow' || T.kind === 'sky' || T.kind === 'aurora') { E(gg, x, GY - 7, 4, 3 + R() * 2); gg.fillStyle = '#ffffff'; gg.fill(); }
      else if (T.kind === 'swamp') { gg.fillStyle = R() < 0.5 ? '#4a5a30' : '#2a3a1a'; gg.beginPath(); gg.moveTo(x, GY - 4); gg.lineTo(x + 1.5, GY - 4 - h2 * 0.7); gg.lineTo(x + 3, GY - 4); gg.fill(); }
    }
    gg.fillStyle = 'rgba(0,0,0,.12)'; gg.fillRect(0, GY - 4, GT, 3);
    if (T.kind === 'coast') { gr = gg.createLinearGradient(0, GY - 14, 0, GY - 2); gr.addColorStop(0, 'rgba(120,200,230,.0)'); gr.addColorStop(1, 'rgba(255,255,255,.0)'); for (let k = 0; k < 20; k++) { const x = R() * GT; E(gg, x, GY + 50 + R() * 100, 3, 2); gg.fillStyle = '#fff3d6'; gg.fill(); } }
    if (T.kind === 'swamp') for (let k = 0; k < 7; k++) { const x = R() * GT, y = GY + 50 + R() * 90; E(gg, x, y, 26, 8); gg.fillStyle = 'rgba(120,60,160,.55)'; gg.fill(); E(gg, x - 6, y - 2, 10, 2.5); gg.fillStyle = 'rgba(220,170,255,.35)'; gg.fill(); }
    if (T.kind === 'crystal') for (let k = 0; k < 9; k++) { const x = R() * GT, y = GY + 40 + R() * 90; st(gg, 2, 'rgba(120,230,255,.7)'); gg.beginPath(); gg.moveTo(x, y); gg.lineTo(x + 12, y - 5); gg.lineTo(x + 26, y + 3); gg.lineTo(x + 34, y - 2); gg.stroke(); E(gg, x + 34, y - 2, 3, 3); gg.fillStyle = '#bff4ff'; gg.fill(); }
    if (T.kind === 'mine') { st(gg, 3, '#5a5a62'); gg.beginPath(); gg.moveTo(0, GY + 22); gg.lineTo(GT, GY + 22); gg.moveTo(0, GY + 34); gg.lineTo(GT, GY + 34); gg.stroke(); for (let x = 0; x < GT; x += 18) { gg.fillStyle = '#4a3020'; gg.fillRect(x, GY + 18, 8, 20); } }
    if (T.kind === 'candy') { for (let k = 0; k < 120; k++) { gg.fillStyle = ['#ff8ec0', '#8ed0ff', '#ffd36a', '#a8e8a0', '#ffffff'][k % 5]; gg.save(); gg.translate(R() * GT, GY + 10 + R() * (H - GY - 14)); gg.rotate(R() * 3); gg.fillRect(-3, -1, 6, 2); gg.restore(); } }
    if (T.kind === 'upside') { for (let k = 0; k < 40; k++) { gg.strokeStyle = 'rgba(160,240,255,.3)'; gg.lineWidth = 1; gg.beginPath(); gg.arc(R() * GT, GY + 10 + R() * (H - GY), 1 + R() * 3, 0, TAU); gg.stroke(); } for (let k = 0; k < 8; k++) { gg.fillStyle = 'rgba(255,200,220,.5)'; const x = R() * GT, y = GY + 30 + R() * 80; for (let q = 0; q < 5; q++) { const a = q / 5 * TAU; E(gg, x + Math.cos(a) * 4, y + Math.sin(a) * 4, 3, 1.5, a); gg.fill(); } } }
    if (T.kind === 'clock') { for (let y = GY + 6; y < H; y += 14) for (let x = (y / 14 % 2) * 12; x < GT; x += 24) { RR(gg, x, y, 22, 12, 4); gg.fillStyle = rgba(R() < 0.5 ? '#c8a070' : '#a88050', 0.55); gg.fill(); } for (let k = 0; k < 6; k++) gearShape(gg, R() * GT, GY + 40 + R() * 90, 10 + R() * 8, 8, 'rgba(150,100,50,.5)', R()); }
    if (T.kind === 'tower') { for (let y = GY + 6; y < H; y += 26) for (let x = 0; x < GT; x += 26) { gg.fillStyle = ((x + y) / 26) % 2 < 1 ? 'rgba(120,100,170,.45)' : 'rgba(60,50,100,.45)'; gg.fillRect(x, y, 26, 26); } st(gg, 1.5, 'rgba(230,190,90,.5)'); for (let x = 0; x < GT; x += 104) { gg.beginPath(); gg.moveTo(x, GY + 6); gg.lineTo(x, H); gg.stroke(); } }
    if (T.kind === 'rainbow') { ['#ffd0e0', '#fff0c0', '#d0f0d8', '#d0e8ff', '#e8d8ff'].forEach((c, k) => { gg.fillStyle = rgba(c, 0.6); gg.fillRect(0, GY + 6 + k * 12, GT, 6); }); }
    if (T.kind === 'oldcatrep') { for (let k = 0; k < 24; k++) { gg.fillStyle = 'rgba(160,120,70,.25)'; E(gg, R() * GT, GY + 20 + R() * 110, 6 + R() * 8, 2.4); gg.fill(); } }
    if (T.kind === 'lastgate') { for (let k = 0; k < 22; k++) { gg.fillStyle = 'rgba(80,60,80,.3)'; E(gg, R() * GT, GY + 20 + R() * 110, 10, 3); gg.fill(); } }
    if (T.kind === 'icehaven') { for (let k = 0; k < 20; k++) { gg.fillStyle = 'rgba(200,230,255,.6)'; E(gg, R() * GT, GY + 20 + R() * 110, 16 + R() * 18, 3); gg.fill(); } }
    if (T.kind === 'whalecave') { for (let k = 0; k < 26; k++) { gg.fillStyle = 'rgba(200,180,255,.35)'; E(gg, R() * GT, GY + 20 + R() * 110, 2, 2); gg.fill(); } }
    if (T.kind === 'windnest') { for (let k = 0; k < 24; k++) { gg.fillStyle = 'rgba(255,255,255,.7)'; E(gg, R() * GT, GY + 20 + R() * 110, 12 + R() * 14, 4); gg.fill(); } }
    if (T.kind === 'stormcrown') { for (let k = 0; k < 20; k++) { gg.fillStyle = 'rgba(180,200,255,.35)'; E(gg, R() * GT, GY + 20 + R() * 110, 2, 2); gg.fill(); } }
    if (T.kind === 'clockforest') { for (let k = 0; k < 30; k++) { gg.fillStyle = 'rgba(120,180,120,.35)'; E(gg, R() * GT, GY + 20 + R() * 110, 6 + R() * 8, 2.4); gg.fill(); } }
    if (T.kind === 'dawngarden') { for (let k = 0; k < 30; k++) { gg.fillStyle = ['rgba(255,200,220,.5)', 'rgba(255,240,180,.5)'][k % 2]; E(gg, R() * GT, GY + 20 + R() * 110, 2, 2); gg.fill(); } }
    if (T.kind === 'starmarket' || T.kind === 'hourglass') { for (let k = 0; k < 26; k++) { gg.strokeStyle = 'rgba(160,110,60,.35)'; gg.lineWidth = 1.4; const x = R() * GT, y = GY + 20 + R() * 120; gg.beginPath(); gg.moveTo(x, y); gg.quadraticCurveTo(x + 14, y - 4, x + 28, y); gg.stroke(); } }
    if (T.kind === 'silentmt') { for (let k = 0; k < 30; k++) { gg.fillStyle = 'rgba(255,255,255,.7)'; E(gg, R() * GT, GY + 16 + R() * 120, 8 + R() * 12, 2 + R() * 3); gg.fill(); } }
    if (T.kind === 'echocave') { for (let k = 0; k < 24; k++) { gg.fillStyle = ['rgba(190,230,255,.5)', 'rgba(220,190,255,.5)'][k % 2]; E(gg, R() * GT, GY + 20 + R() * 110, 2, 2); gg.fill(); } }
    if (T.kind === 'shadowvil') { for (let k = 0; k < 20; k++) { gg.fillStyle = 'rgba(255,220,140,.5)'; E(gg, R() * GT, GY + 30 + R() * 110, 1.6, 1.6); gg.fill(); } }
    if (T.kind === 'catrep') { for (let y = GY + 6; y < H; y += 20) for (let x = (y / 20 % 2) * 20; x < GT; x += 40) { gg.fillStyle = 'rgba(255,255,255,.15)'; RR(gg, x, y, 36, 16, 6); gg.fill(); } for (let k = 0; k < 8; k++) paw(gg, R() * GT, GY + 40 + R() * 90, 1.2, 'rgba(120,70,50,.3)'); }
    if (T.kind === 'feather') for (let k = 0; k < 16; k++) { gg.save(); gg.translate(R() * GT, GY + 30 + R() * 100); gg.rotate(R() * 3); gg.fillStyle = 'rgba(255,255,255,.6)'; gg.beginPath(); gg.ellipse(0, 0, 9, 3, 0, 0, TAU); gg.fill(); gg.restore(); }
    if (T.kind === 'burrow') { st(gg, 3, 'rgba(60,40,20,.5)'); for (let k = 0; k < 10; k++) { const x = R() * GT, y = GY + 30 + R() * 100; gg.beginPath(); gg.moveTo(x, y); gg.quadraticCurveTo(x + 20, y - 10, x + 40, y + 4); gg.stroke(); } }
    if (T.kind === 'namesea') for (let k = 0; k < 30; k++) { gg.strokeStyle = 'rgba(160,230,255,.35)'; gg.lineWidth = 1; gg.beginPath(); gg.arc(R() * GT, GY + 20 + R() * 120, 2 + R() * 3, 0, TAU); gg.stroke(); }
    if (T.kind === 'stargarden') for (let k = 0; k < 30; k++) { const x = R() * GT, y = GY + 20 + R() * (H - GY - 20); star(gg, x, y, 1.5 + R() * 2.5, ['rgba(255,240,180,.8)', 'rgba(200,220,255,.8)', 'rgba(255,190,240,.7)'][k % 3]); }
    if (T.kind === 'firstcastle') { for (let y = GY + 6; y < H; y += 24) for (let x = (y / 24 % 2) * 24; x < GT; x += 48) { gg.fillStyle = 'rgba(255,255,255,.18)'; gg.fillRect(x, y, 46, 22); } st(gg, 1.2, 'rgba(220,180,90,.55)'); gg.beginPath(); gg.moveTo(0, GY + 8); gg.lineTo(GT, GY + 8); gg.stroke(); }
    if (T.kind === 'fossil') for (let k = 0; k < 10; k++) bone(gg, R() * GT, GY + 50 + R() * 90, 12, '#efe4c8', R() * 3);
    if (T.kind === 'starsea') for (let k = 0; k < 20; k++) { const x = R() * GT, y = GY + 40 + R() * 100; star(gg, x, y, 1.5 + R() * 2.5, 'rgba(180,230,255,.7)'); }
    if (T.kind === 'aurora') { for (let x = 0; x < GT; x += 48) { st(gg, 1, 'rgba(120,150,170,.3)'); gg.beginPath(); gg.moveTo(x, GY + 2); gg.lineTo(x, H); gg.stroke(); } }
    if (T.kind === 'castle') { for (let x = 0; x < GT; x += 64) { st(gg, 1.2, 'rgba(200,190,255,.25)'); gg.beginPath(); gg.moveTo(x, GY + 2); gg.lineTo(x - 30, H); gg.stroke(); } for (let k = 0; k < 18; k++) { const x = R() * GT, y = GY + 40 + R() * 100; star(gg, x, y, 2 + R() * 2, 'rgba(255,240,180,.8)'); } }
    if (T.kind === 'volcano') for (let k = 0; k < 8; k++) { const x = R() * GT, y = GY + 40 + R() * 90; st(gg, 2, 'rgba(255,120,40,.75)'); gg.beginPath(); gg.moveTo(x, y); gg.lineTo(x + 14, y + 6); gg.lineTo(x + 22, y + 2); gg.stroke(); }
    // 구름
    const clouds = [0, 1, 2].map(k => { const c = mk(200, 80), g = c.getContext('2d'); const col = T.kind === 'volcano' || T.kind === 'swamp' || T.kind === 'crystal' || T.kind === 'castle' || T.kind === 'starsea' || T.kind === 'stargarden' ? '#4a3058' : T.kind === 'mine' ? '#5a4030' : T.kind === 'fossil' ? '#1e4a46' : T.kind === 'tower' ? '#6a5a9a' : T.kind === 'clock' ? '#fff3e0' : T.kind === 'candy' ? '#ffe0f0' : T.kind === 'upside' ? '#3a7a8a' : '#ffffff'; const R2 = seeded(k + 9);
      for (let j = 0; j < 7; j++) { const x = 40 + R2() * 120, y = 44 + (R2() - 0.5) * 16, r = 16 + R2() * 20; E(g, x, y, r, r * 0.8); g.fillStyle = rg(g, col, x, y, r, 0.1, T.kind === 'volcano' ? 0.2 : 0.12); g.fill(); } return c; });
    return { T, sky, far, mid, near, ground, gh, clouds, GT };
  }
  const bgOrder = [];
  /* v1.1 그림책 품질 후처리: 먼 산은 공기 원근(흐림·옅게), 중간은 살짝 흐림, 하늘엔 수채 번짐 + 종이 결, 화면 전체 빛 그레이딩 */
  function softLayer(L, px, filt) {
    if (!L || !L.c) return L;
    try {
      const tw = L.c.width, h = L.c.height, pad = 24, t = mk(tw + pad * 2, h), g = t.getContext('2d');
      g.filter = filt; for (const dx of [-tw, 0, tw]) g.drawImage(L.c, pad + dx, 0);
      const o = mk(tw, h), og = o.getContext('2d'); og.drawImage(t, pad, 0, tw, h, 0, 0, tw, h);
      return Object.assign({}, L, { c: o });
    } catch (e) { return L; }
  }
  let paperTex = null;
  function paper(W, H) {
    if (paperTex) return paperTex;
    paperTex = mk(W, H); const g = paperTex.getContext('2d'); let sd = 9; const R = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
    for (let k = 0; k < 900; k++) { g.fillStyle = R() < 0.5 ? 'rgba(90,60,30,.05)' : 'rgba(255,255,255,.06)'; g.fillRect(R() * W, R() * H, 1 + R() * 4, 1); }
    for (let k = 0; k < 40; k++) { const x = R() * W, y = R() * H, r = 30 + R() * 90, gr = g.createRadialGradient(x, y, 2, x, y, r); gr.addColorStop(0, R() < 0.5 ? 'rgba(255,240,210,.07)' : 'rgba(120,80,40,.045)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
    return paperTex;
  }
  function polishTheme(B, T, GY, W, H) {
    const night = ['swamp', 'castle', 'crystal', 'volcano', 'starsea', 'mine', 'fossil', 'tower', 'upside'].includes(T.kind);
    B.far = softLayer(B.far, 2.2, `blur(2.2px) saturate(0.82) brightness(${night ? 0.95 : 1.06})`);
    B.mid = softLayer(B.mid, 0.7, 'blur(0.7px) saturate(0.95)');
    // 하늘: 수채 번짐 + 빛 내림
    try {
      const sk = mk(W, H), g = sk.getContext('2d'); g.drawImage(B.sky, 0, 0); let sd = T.name.length * 97 + 3; const R = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
      for (let k = 0; k < 26; k++) { const x = R() * W, y = R() * GY * 0.85, r = 40 + R() * 120, gr = g.createRadialGradient(x, y, 2, x, y, r); gr.addColorStop(0, night ? 'rgba(180,160,255,.07)' : 'rgba(255,255,255,.12)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
      if (!night) { g.save(); g.globalCompositeOperation = 'lighter'; for (let k = 0; k < 6; k++) { const x = W * 0.62 + (k - 3) * 70; const gr = g.createLinearGradient(x, 0, x - 140, GY); gr.addColorStop(0, 'rgba(255,245,200,.10)'); gr.addColorStop(1, 'rgba(255,245,200,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(x - 16, 0); g.lineTo(x + 16, 0); g.lineTo(x - 120, GY); g.lineTo(x - 190, GY); g.closePath(); g.fill(); } g.restore(); }
      g.globalAlpha = 0.8; g.drawImage(paper(W, H), 0, 0); B.sky = sk;
    } catch (e) {}
    // 빛 그레이딩 (화면 전체에 마지막으로 덧칠)
    const gd = mk(W, H), g2 = gd.getContext('2d');
    const top = g2.createLinearGradient(0, 0, 0, GY); top.addColorStop(0, night ? 'rgba(60,40,120,.10)' : 'rgba(255,236,190,.10)'); top.addColorStop(1, 'rgba(255,236,190,0)'); g2.fillStyle = top; g2.fillRect(0, 0, W, GY);
    const bot = g2.createLinearGradient(0, GY - 30, 0, H); bot.addColorStop(0, 'rgba(0,0,0,0)'); bot.addColorStop(1, night ? 'rgba(10,5,30,.22)' : 'rgba(60,30,0,.14)'); g2.fillStyle = bot; g2.fillRect(0, GY - 30, W, H - GY + 30);
    g2.globalAlpha = 0.6; g2.drawImage(paper(W, H), 0, 0);
    B.grade = gd;
    return B;
  }
  function theme(i, GY, W, H) {
    const key = i + '_' + GY;
    if (!bgCache[key]) { bgCache[key] = polishTheme(buildTheme(i, GY, W, H), THEMES[i], GY, W, H); bgOrder.push(key); while (bgOrder.length > 2) delete bgCache[bgOrder.shift()]; }
    return bgCache[key];
  }
  function drawGrade(ctx, i, GY, W, H) { const B = bgCache[i + '_' + GY]; if (B && B.grade) ctx.drawImage(B.grade, 0, 0); }
  function drawLayer(ctx, L, off, W) {
    const tw = TW, x0 = -((off % tw) + tw) % tw;
    for (let x = x0; x < W; x += tw) ctx.drawImage(L.c, x, L.y0, tw, L.h);
  }
  const BGIMG = {};
  function setBgImage(i, img) { BGIMG[i] = img; }
  function drawBg(ctx, i, camX, time, GY, W, H) {
    const B = theme(i, GY, W, H);
    const im = BGIMG[i];
    if (im && im.complete && im.naturalWidth) {
      const sc = (GY + 20) / im.naturalHeight, w = im.naturalWidth * sc; let x = -(((camX * 0.15) % w) + w) % w;
      for (; x < W; x += w) ctx.drawImage(im, x, 0, w + 1, GY + 20);
      drawLayer(ctx, B.near, camX * 0.7, W);
      const gt = B.GT, x0 = -((camX % gt) + gt) % gt;
      for (let x2 = x0; x2 < W; x2 += gt) ctx.drawImage(B.ground, x2, GY - 14, gt, B.gh);
      return;
    }
    ctx.drawImage(B.sky, 0, 0, W, H);
    B.clouds.forEach((c, k) => { const sp = 6 + k * 4, x = ((k * 420 - camX * 0.06 + time * sp) % (W + 300) + W + 300) % (W + 300) - 220; ctx.globalAlpha = 0.9; ctx.drawImage(c, x, 40 + k * 46, 200 - k * 30, 80 - k * 12); });
    ctx.globalAlpha = 1;
    drawLayer(ctx, B.far, camX * 0.12, W);
    drawLayer(ctx, B.mid, camX * 0.35, W);
    drawLayer(ctx, B.near, camX * 0.7, W);
    const gt = B.GT, x0 = -((camX % gt) + gt) % gt;
    for (let x = x0; x < W; x += gt) ctx.drawImage(B.ground, x, GY - 14, gt, B.gh);
    if (B.grade) ctx.drawImage(B.grade, 0, 0, W, H);
  }
  // v1.2 화면 고급화: 전경(흐린 풀·꽃, 피사계 심도) + 빛 번짐(블룸) + 떠다니는 빛 망울(보케)
  const foreC = {};
  function drawFore(ctx, i, camX, time, GY, W, H) {
    const T = THEMES[i] || THEMES[0], night = ['swamp', 'castle', 'volcano', 'crystal', 'mine', 'fossil', 'tower', 'upside', 'starsea', 'aurora', 'stargarden', 'firstcastle', 'echocave', 'starmarket', 'clockforest', 'stormcrown', 'whalecave'].includes(T.kind);
    let F = foreC[i];
    if (!F) {
      const fw = 1280, fh = 90, c = mk(fw, fh), g = c.getContext('2d'); let sd = 97 + i * 13; const R = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
      for (let k = 0; k < 70; k++) {
        const x = R() * fw, h = 26 + R() * 50, col = R() < 0.5 ? T.near : T.mid2 || T.near;
        g.fillStyle = col; g.beginPath(); g.moveTo(x - 5, fh); g.quadraticCurveTo(x - 2 + (R() - 0.5) * 16, fh - h * 0.6, x + (R() - 0.5) * 20, fh - h); g.quadraticCurveTo(x + 2, fh - h * 0.5, x + 5, fh); g.closePath(); g.fill();
      }
      for (let k = 0; k < 16; k++) { const x = R() * fw, y = fh - 20 - R() * 40, r = 5 + R() * 6, c2 = [T.top, '#ffd6e8', '#fff3a0', '#ffffff'][k % 4]; g.fillStyle = c2; for (let q = 0; q < 5; q++) { const an = q / 5 * TAU; E(g, x + Math.cos(an) * r * 0.6, y + Math.sin(an) * r * 0.6, r * 0.45, r * 0.3, an); g.fill(); } }
      const b = mk(fw, fh), bg2 = b.getContext('2d'); bg2.filter = 'blur(4px)'; bg2.drawImage(c, 0, 0);
      const bl = mk(W, H), lg = bl.getContext('2d');
      if (!night) { const gr = lg.createRadialGradient(W * 0.18, -40, 10, W * 0.18, -40, W * 0.75); gr.addColorStop(0, rgba(T.sun || '#fff6d0', 0.42)); gr.addColorStop(0.4, rgba(T.sun || '#fff6d0', 0.12)); gr.addColorStop(1, rgba(T.sun || '#fff6d0', 0)); lg.fillStyle = gr; lg.fillRect(0, 0, W, H); }
      else { const gr = lg.createRadialGradient(W * 0.75, 40, 10, W * 0.75, 40, W * 0.6); gr.addColorStop(0, 'rgba(180,200,255,.18)'); gr.addColorStop(1, 'rgba(180,200,255,0)'); lg.fillStyle = gr; lg.fillRect(0, 0, W, H); }
      F = foreC[i] = { strip: b, fw, fh, bloom: bl, night };
    }
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.drawImage(F.bloom, 0, 0, W, H); ctx.restore();
    // 보케
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 9; k++) { const x = ((k * 173 - camX * (0.9 + k * 0.05) + time * (6 + k)) % (W + 120) + W + 120) % (W + 120) - 60, y = 60 + ((k * 97) % 260) + Math.sin(time * 0.6 + k) * 10, r = 10 + (k % 4) * 7; ctx.globalAlpha = 0.07 + (k % 3) * 0.03; ctx.drawImage(softDot(F.night ? '#bcd0ff' : '#fff2c0'), x - r, y - r, r * 2, r * 2); }
    ctx.restore();
    // 흐린 전경 풀 (카메라보다 빠르게 → 깊이감)
    // 화면 양 끝에만 흐린 전경 풀 (가운데 전투는 가리지 않음)
    const x0 = -((camX * 1.25 % F.fw) + F.fw) % F.fw;
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 120, H); ctx.rect(W - 120, 0, 120, H); ctx.clip(); ctx.globalAlpha = 0.85;
    for (let x = x0; x < W; x += F.fw) ctx.drawImage(F.strip, x, GY + 24 - F.fh, F.fw, F.fh);
    ctx.restore();
  }
  let vig = null;
  function vignette(ctx, W, H) {
    if (!vig || vig.width !== W) { vig = mk(W, H); const g = vig.getContext('2d'); const gr = g.createRadialGradient(W / 2, H * 0.45, H * 0.35, W / 2, H / 2, W * 0.62); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(20,8,0,.38)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
    ctx.drawImage(vig, 0, 0);
  }

  /* =========================================================
     건물: 멍멍성 / 몬스터 둥지
     ========================================================= */
  let castleC = null, nestC = null;
  const CS = 2;
  function stones(g, x, y, w, h, base) {
    RR(g, x, y, w, h, 6); g.fillStyle = lgr(g, LI(base, 0.1), DK(base, 0.2), 0, y, 0, y + h); g.fill();
    g.save(); RR(g, x, y, w, h, 6); g.clip();
    const R = seeded(Math.round(x * 13 + y)); const rh = 13;
    for (let r = 0; r * rh < h; r++) for (let cx = x - (r % 2) * 11; cx < x + w; cx += 22) {
      const sw = 20, sh = rh - 2, c = mix(base, R() < 0.5 ? '#ffffff' : '#000000', R() * 0.12);
      RR(g, cx + 1, y + r * rh + 1, sw, sh, 3); g.fillStyle = lgr(g, LI(c, 0.15), DK(c, 0.12), 0, y + r * rh, 0, y + r * rh + sh); g.fill();
    }
    g.restore();
  }
  function castle() {
    if (castleC) return castleC;
    const w = 260, h = 300, c = mk(w * CS, h * CS), g = c.getContext('2d'); g.scale(CS, CS); g.translate(140, 290);
    // 왼쪽 탑
    stones(g, -132, -200, 52, 200, '#a79f97');
    g.beginPath(); g.moveTo(-142, -196); g.lineTo(-106, -258); g.lineTo(-70, -196); g.closePath(); g.fillStyle = lgr(g, '#ff6b5a', '#b3261e', -140, 0, -70, 0); g.fill();
    for (let i = 0; i < 4; i++) { RR(g, -134 + i * 14, -212, 10, 14, 2); g.fillStyle = '#bdb5ad'; g.fill(); }
    E(g, -106, -150, 7, 10); g.fillStyle = '#ffd67a'; g.fill(); E(g, -106, -150, 4, 7); g.fillStyle = '#ffeeb0'; g.fill();
    // 성벽
    stones(g, -120, -78, 210, 78, '#b2aaa1');
    for (let x = -120; x < 90; x += 21) { RR(g, x, -92, 14, 16, 3); g.fillStyle = lgr(g, '#c9c2ba', '#97908a', 0, -92, 0, -76); g.fill(); }
    // 본관 (개집)
    RR(g, -58, -168, 116, 92, 6); g.fillStyle = lgr(g, '#f3d29e', '#c99a5e', 0, -168, 0, -76); g.fill();
    st(g, 1.2, 'rgba(110,70,30,.35)'); for (let y = -156; y < -78; y += 13) { g.beginPath(); g.moveTo(-56, y); g.lineTo(56, y); g.stroke(); }
    // 개 귀 모양 지붕 장식
    for (const s of [-1, 1]) { g.save(); g.translate(s * 50, -200); g.rotate(s * 0.45); g.beginPath(); g.moveTo(-10, -6); g.quadraticCurveTo(-16, 30, 0, 42); g.quadraticCurveTo(16, 30, 10, -6); g.closePath(); g.fillStyle = lgr(g, '#c27a3a', '#7a4520', 0, -6, 0, 42); g.fill(); g.restore(); }
    // 지붕
    g.beginPath(); g.moveTo(-74, -160); g.quadraticCurveTo(-30, -190, 0, -232); g.quadraticCurveTo(30, -190, 74, -160); g.quadraticCurveTo(0, -170, -74, -160); g.closePath();
    g.fillStyle = lgr(g, '#ff7a5c', '#c0392b', 0, -232, 0, -160); g.fill();
    st(g, 1.4, 'rgba(120,20,10,.35)'); for (let k = 1; k < 5; k++) { g.beginPath(); g.moveTo(-74 + k * 9, -162 - k * 3); g.quadraticCurveTo(0, -172 - k * 8, 74 - k * 9, -162 - k * 3); g.stroke(); }
    E(g, 0, -190, 17, 17); g.fillStyle = lgr(g, '#fff0a0', '#d9a21b', 0, -207, 0, -173); g.fill(); paw(g, 0, -190, 1.9, '#b56d10');
    // 눈 창문
    for (const s of [-1, 1]) { E(g, s * 26, -130, 12, 14); g.fillStyle = '#5a3a22'; g.fill(); E(g, s * 26, -129, 9, 11); g.fillStyle = lgr(g, '#fff6c8', '#ffb84d', 0, -140, 0, -118); g.fill(); E(g, s * 26 - 3, -134, 3, 3.5); g.fillStyle = '#fff'; g.fill(); }
    // 간판
    RR(g, -34, -110, 68, 22, 7); g.fillStyle = lgr(g, '#fff8e6', '#f0d6a8', 0, -110, 0, -88); g.fill(); st(g, 2, '#8a5a2b'); RR(g, -34, -110, 68, 22, 7); g.stroke();
    g.fillStyle = '#7a4520'; g.font = `bold 14px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('멍멍성', 0, -98.5);
    // 성문
    g.beginPath(); g.moveTo(-26, 0); g.lineTo(-26, -40); g.arc(0, -40, 26, Math.PI, 0); g.lineTo(26, 0); g.closePath(); g.fillStyle = '#5a3a22'; g.fill();
    g.beginPath(); g.moveTo(-21, 0); g.lineTo(-21, -40); g.arc(0, -40, 21, Math.PI, 0); g.lineTo(21, 0); g.closePath(); g.fillStyle = lgr(g, '#a86c3c', '#6b4122', 0, -60, 0, 0); g.fill();
    st(g, 1.5, 'rgba(50,25,10,.5)'); for (let x = -14; x <= 14; x += 7) { g.beginPath(); g.moveTo(x, -58 + Math.abs(x) * 0.3); g.lineTo(x, 0); g.stroke(); }
    g.fillStyle = '#d9a21b'; E(g, 8, -24, 2.4, 2.4); g.fill();
    // 뼈다귀 장식
    bone(g, -88, -60, 22, '#fff8e6', -0.2); bone(g, 66, -58, 22, '#fff8e6', 0.2);
    castleC = { c, ox: 140, oy: 290, w, h };
    return castleC;
  }
  function nest() {
    if (nestC) return nestC;
    const w = 240, h = 290, c = mk(w * CS, h * CS), g = c.getContext('2d'); g.scale(CS, CS); g.translate(110, 280);
    const R = seeded(42);
    g.beginPath(); g.moveTo(-100, 0); g.lineTo(-86, -70); g.lineTo(-60, -120); g.lineTo(-40, -110); g.lineTo(-18, -190); g.lineTo(6, -150); g.lineTo(22, -230); g.lineTo(44, -150); g.lineTo(70, -170); g.lineTo(84, -90); g.lineTo(110, 0); g.closePath();
    g.fillStyle = lgr(g, '#5d4478', '#241833', 0, -230, 0, 0); g.fill();
    st(g, 2, 'rgba(160,120,210,.35)'); g.beginPath(); g.moveTo(-60, -120); g.lineTo(-48, -60); g.moveTo(22, -230); g.lineTo(18, -150); g.moveTo(70, -170); g.lineTo(60, -100); g.stroke();
    // 수정
    for (const [x, y, s, col] of [[-70, -40, 1.1, '#e040fb'], [80, -60, 1.3, '#7c4dff'], [-30, -150, 0.8, '#e040fb'], [50, -130, 0.9, '#18ffff'], [-88, -10, 0.9, '#7c4dff']]) {
      const gl = g.createRadialGradient(x, y, 2, x, y, 30 * s); gl.addColorStop(0, rgba(col, 0.55)); gl.addColorStop(1, rgba(col, 0)); g.fillStyle = gl; g.fillRect(x - 32 * s, y - 32 * s, 64 * s, 64 * s);
      g.beginPath(); g.moveTo(x, y - 22 * s); g.lineTo(x + 7 * s, y - 4 * s); g.lineTo(x, y + 6 * s); g.lineTo(x - 7 * s, y - 4 * s); g.closePath(); g.fillStyle = lgr(g, '#ffffff', col, x - 6, y - 20, x + 6, y + 6); g.fill();
    }
    // 가시 덩굴
    st(g, 3, '#1d2b1a'); for (let k = 0; k < 5; k++) { const x = -90 + k * 45, y = -10 - R() * 40; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 10, y, x + 30, y - 30, x + 20, y - 60); g.stroke(); for (let t = 0; t < 4; t++) { const tx = x + 8 + t * 4, ty = y - t * 12; g.beginPath(); g.moveTo(tx, ty); g.lineTo(tx + 6, ty - 3); g.stroke(); } }
    // 해골바위 얼굴
    E(g, -2, -150, 26, 22); g.fillStyle = lgr(g, '#6e5590', '#3a2a50', 0, -172, 0, -128); g.fill();
    // 포털 테두리
    E(g, -4, -62, 40, 56); g.fillStyle = '#1a1024'; g.fill();
    E(g, -4, -62, 36, 52); g.fillStyle = '#2d1a42'; g.fill();
    nestC = { c, ox: 110, oy: 280, w, h };
    return nestC;
  }

  /* =========================================================
     UI 패널·버튼·아이콘 (캐시)
     ========================================================= */
  const FONT = "'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR','Noto Sans CJK KR',sans-serif";
  const uiCache = new Map(); const US = 2;
  function cached(key, w, h, fn) {
    let c = uiCache.get(key); if (c) return c;
    c = mk(w * US, h * US); const g = c.getContext('2d'); g.scale(US, US); fn(g); uiCache.set(key, c);
    if (uiCache.size > 400) uiCache.delete(uiCache.keys().next().value);
    return c;
  }
  function panel(ctx, x, y, w, h, kind) {
    const k = kind || 'cream', P = 8;
    const c = cached(`p2|${k}|${w}|${h}`, w + P * 2, h + P * 2, g => {
      g.translate(P, P);
      RR(g, 0, 5, w, h, 18); g.fillStyle = 'rgba(30,12,0,.32)'; g.fill();
      if (k === 'dark') {
        RR(g, 0, 0, w, h, 16); g.fillStyle = lgr(g, 'rgba(70,40,20,.88)', 'rgba(38,20,10,.9)', 0, 0, 0, h); g.fill();
        st(g, 2, 'rgba(255,214,110,.8)'); RR(g, 2, 2, w - 4, h - 4, 14); g.stroke();
        if (h > 30) { st(g, 0.8, 'rgba(255,214,110,.35)'); RR(g, 5, 5, w - 10, h - 10, 11); g.stroke(); }
        RR(g, 6, 5, w - 12, Math.min(16, h * 0.3), 10); g.fillStyle = 'rgba(255,255,255,.08)'; g.fill();
        if (h > 30 && w > 60) [[8, h / 2], [w - 8, h / 2]].forEach(([a, b]) => { g.beginPath(); g.moveTo(a, b - 4); g.lineTo(a + 3, b); g.lineTo(a, b + 4); g.lineTo(a - 3, b); g.closePath(); g.fillStyle = '#ffd56e'; g.fill(); });
        return;
      }
      if (k === 'wood') {
        RR(g, 0, 0, w, h, 18); g.fillStyle = lgr(g, '#9a6234', '#5c351a', 0, 0, 0, h); g.fill();
        g.save(); RR(g, 0, 0, w, h, 18); g.clip(); st(g, 1.5, 'rgba(40,20,5,.35)'); for (let y = 22; y < h; y += 24) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
        for (let k2 = 0; k2 < 30; k2++) { g.beginPath(); const yy = (k2 * 37) % h, xx = (k2 * 113) % w; g.moveTo(xx, yy); g.quadraticCurveTo(xx + 20, yy + 3, xx + 40, yy); g.strokeStyle = 'rgba(255,220,170,.08)'; g.stroke(); }
        g.restore();
        st(g, 3, '#ffcf5a'); RR(g, 3, 3, w - 6, h - 6, 15); g.stroke();
        st(g, 1.5, 'rgba(60,30,10,.7)'); RR(g, 0.75, 0.75, w - 1.5, h - 1.5, 18); g.stroke();
        return;
      }
      RR(g, 0, 0, w, h, 18); g.fillStyle = '#5a3216'; g.fill();
      RR(g, 2.5, 2.5, w - 5, h - 5, 16); const gold = g.createLinearGradient(0, 0, 0, h); gold.addColorStop(0, '#fff3b0'); gold.addColorStop(0.18, '#ffd24a'); gold.addColorStop(0.5, '#c98b2a'); gold.addColorStop(0.82, '#ffd24a'); gold.addColorStop(1, '#a8681a'); g.fillStyle = gold; g.fill();
      RR(g, 6, 6, w - 12, h - 12, 13); g.fillStyle = '#7a4a20'; g.fill();
      RR(g, 7.5, 7.5, w - 15, h - 15, 12); g.fillStyle = lgr(g, '#fffdf6', '#f3dcb3', 0, 0, 0, h); g.fill();
      g.save(); RR(g, 7.5, 7.5, w - 15, h - 15, 12); g.clip();
      for (let k2 = 0; k2 < w * h / 600; k2++) paw(g, (k2 * 97) % w, (k2 * 61) % h, 1.2, 'rgba(170,110,40,.045)');
      const ish = g.createLinearGradient(0, 7, 0, 22); ish.addColorStop(0, 'rgba(120,70,20,.18)'); ish.addColorStop(1, 'rgba(120,70,20,0)'); g.fillStyle = ish; g.fillRect(0, 7, w, 15);
      const shine = g.createLinearGradient(0, 0, w, h); shine.addColorStop(0, 'rgba(255,255,255,.35)'); shine.addColorStop(0.3, 'rgba(255,255,255,0)'); g.fillStyle = shine; g.fillRect(0, 0, w, h);
      g.restore();
      st(g, 1, 'rgba(255,255,255,.75)'); g.beginPath(); g.moveTo(18, 3.5); g.lineTo(w - 18, 3.5); g.stroke();
      const orn = (a, b, sx, sy) => { g.save(); g.translate(a, b); g.scale(sx, sy);
        g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(14, -2, 20, 4); g.quadraticCurveTo(12, 2, 4, 6); g.quadraticCurveTo(2, 12, 4, 20); g.quadraticCurveTo(-2, 14, 0, 0); g.closePath();
        g.fillStyle = lgr(g, '#fff0a0', '#b8770f', 0, 0, 0, 20); g.fill(); st(g, 0.8, '#6b3e1e'); g.stroke();
        E(g, 3.5, 3.5, 3.4, 3.4); g.fillStyle = lgr(g, '#ff9ab0', '#c2185b', 0, 0, 0, 7); g.fill(); st(g, 0.7, '#6b3e1e'); g.stroke(); E(g, 2.6, 2.4, 1.1, 0.8); g.fillStyle = 'rgba(255,255,255,.85)'; g.fill();
        g.restore(); };
      if (w > 80 && h > 60) { orn(4, 4, 1, 1); orn(w - 4, 4, -1, 1); orn(4, h - 4, 1, -1); orn(w - 4, h - 4, -1, -1); }
      else [[12, 12], [w - 12, 12], [12, h - 12], [w - 12, h - 12]].forEach(([a, b]) => { E(g, a, b, 3, 3); g.fillStyle = lgr(g, '#fff0a0', '#b8770f', a, b - 3, a, b + 3); g.fill(); });
      if (w > 200 && h > 60) { const cx = w / 2; g.beginPath(); g.moveTo(cx - 26, 2.5); g.quadraticCurveTo(cx, -6, cx + 26, 2.5); g.quadraticCurveTo(cx, 6, cx - 26, 2.5); g.fillStyle = lgr(g, '#fff0a0', '#c98b2a', 0, -6, 0, 6); g.fill(); st(g, 0.8, '#6b3e1e'); g.stroke(); paw(g, cx, 0.5, 0.42, '#7a4a20'); }
    });
    ctx.drawImage(c, x - P, y - P, w + P * 2, h + P * 2);
  }
  function button(ctx, x, y, w, h, col, pressed, r) {
    const R2 = r == null ? 14 : r, P = 6;
    const c = cached(`b|${col}|${w}|${h}|${R2}|${pressed ? 1 : 0}`, w + P * 2, h + P * 2 + 6, g => {
      g.translate(P, P);
      const dy = pressed ? 4 : 0;
      RR(g, 0, 6, w, h, R2); g.fillStyle = 'rgba(30,12,0,.35)'; g.fill();
      RR(g, 0, 4, w, h, R2); g.fillStyle = DK(col, 0.42); g.fill();
      RR(g, 0, dy, w, h - (pressed ? 0 : 0), R2); g.fillStyle = lgr(g, LI(col, 0.3), DK(col, 0.08), 0, dy, 0, dy + h); g.fill();
      RR(g, 5, dy + 4, w - 10, Math.min(h * 0.4, 16), Math.min(R2, 10)); g.fillStyle = 'rgba(255,255,255,.38)'; g.fill();
      st(g, 2.5, '#4a2a14'); RR(g, 1.25, dy + 1.25, w - 2.5, h - 2.5, R2); g.stroke();
    });
    ctx.drawImage(c, x - P, y - P, w + P * 2, h + P * 2 + 6);
  }
  function icon(ctx, name, x, y, s) {
    const S2 = 32;
    const c = cached('i|' + name, S2, S2, g => {
      g.translate(16, 16);
      if (name === 'coin') { E(g, 0, 1.5, 12, 12); g.fillStyle = '#b06f00'; g.fill(); E(g, 0, 0, 12, 12); g.fillStyle = lgr(g, '#fff0a0', '#f5a800', 0, -12, 0, 12); g.fill(); E(g, 0, 0, 8.5, 8.5); st(g, 1.6, 'rgba(176,111,0,.55)'); g.stroke(); paw(g, 0, 0.5, 0.9, 'rgba(176,111,0,.6)'); E(g, -5, -5, 3, 2); g.fillStyle = 'rgba(255,255,255,.8)'; g.fill(); }
      if (name === 'bone') { bone(g, 0, 1.5, 26, '#8a5a2b', -0.35); bone(g, 0, 0, 26, '#fffaf0', -0.35); bone(g, -1, -1, 18, '#ffffff', -0.35); }
      if (name === 'star') { star(g, 0, 1.5, 13, '#a86a00'); star(g, 0, 0, 13, '#ffd34d'); star(g, -1.5, -1.5, 6, '#fff6c2'); }
      if (name === 'starOff') { star(g, 0, 1.5, 13, 'rgba(0,0,0,.25)'); star(g, 0, 0, 13, '#d8c8b0'); }
      if (name === 'mana') { star(g, 0, 0, 13, '#2f7be0'); star(g, 0, 0, 8, '#8fd3ff'); E(g, -3, -4, 2, 2); g.fillStyle = '#fff'; g.fill(); }
      if (name === 'heart') { g.beginPath(); g.moveTo(0, 11); g.bezierCurveTo(-16, 0, -10, -14, 0, -6); g.bezierCurveTo(10, -14, 16, 0, 0, 11); g.fillStyle = lgr(g, '#ff8a80', '#d32f2f', 0, -12, 0, 11); g.fill(); E(g, -5, -4, 3, 2); g.fillStyle = 'rgba(255,255,255,.7)'; g.fill(); }
      if (name === 'sword') { g.rotate(0.75); RR(g, -2.5, -14, 5, 20, 2); g.fillStyle = lgr(g, '#ffffff', '#9db4c6', -2, 0, 2, 0); g.fill(); bone(g, 0, 6, 14, '#ffd34d'); RR(g, -1.6, 7, 3.2, 7, 1); g.fillStyle = '#7a4a2a'; g.fill(); }
      if (name === 'potion') { RR(g, -4, -13, 8, 6, 2); g.fillStyle = '#8d6e63'; g.fill(); E(g, 0, 3, 10, 10); g.fillStyle = lgr(g, '#ff9a9a', '#d32f2f', 0, -7, 0, 13); g.fill(); E(g, -4, -1, 3, 4); g.fillStyle = 'rgba(255,255,255,.7)'; g.fill(); }
      if (name === 'lock') { st(g, 3.5, '#8a8f96'); g.beginPath(); g.arc(0, -3, 6.5, Math.PI, 0); g.stroke(); RR(g, -9, -3, 18, 14, 3); g.fillStyle = lgr(g, '#ffe082', '#c98b2a', 0, -3, 0, 11); g.fill(); E(g, 0, 3, 2, 2); g.fillStyle = '#6b3e1e'; g.fill(); }
      if (name === 'castle') { RR(g, -11, -4, 22, 14, 2); g.fillStyle = '#f3d29e'; g.fill(); g.beginPath(); g.moveTo(-14, -3); g.lineTo(0, -14); g.lineTo(14, -3); g.closePath(); g.fillStyle = '#e04a3a'; g.fill(); }
      if (name === 'nest') { g.beginPath(); g.moveTo(-13, 11); g.lineTo(-6, -8); g.lineTo(0, -2); g.lineTo(4, -13); g.lineTo(13, 11); g.closePath(); g.fillStyle = '#5d4478'; g.fill(); E(g, 0, 4, 5, 6); g.fillStyle = '#e040fb'; g.fill(); }
      if (name === 'skull') { E(g, 0, -2, 10, 9); g.fillStyle = '#f3eee2'; g.fill(); RR(g, -6, 4, 12, 7, 2); g.fill(); E(g, -4, -2, 3, 3.2); g.fillStyle = '#2b1d2e'; g.fill(); E(g, 4, -2, 3, 3.2); g.fill(); }
    });
    ctx.drawImage(c, x - s / 2, y - s / 2, s, s);
  }
  function gem(g, x, y, r, col) {
    g.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 - Math.PI / 2; g[k ? 'lineTo' : 'moveTo'](x + Math.cos(a) * r, y + Math.sin(a) * r); } g.closePath();
    g.fillStyle = lgr(g, LI(col, 0.6), DK(col, 0.3), x - r, y - r, x + r, y + r); g.fill(); st(g, 1.1, OUT); g.stroke();
    g.beginPath(); g.moveTo(x - r * 0.5, y - r * 0.2); g.lineTo(x, y - r * 0.7); g.lineTo(x + r * 0.2, y - r * 0.2); g.fillStyle = 'rgba(255,255,255,.75)'; g.fill();
  }
  function sparkle(g, x, y, r, a) { g.save(); g.globalAlpha = a == null ? 1 : a; g.fillStyle = '#fff'; g.beginPath(); g.moveTo(x, y - r); g.quadraticCurveTo(x, y, x + r, y); g.quadraticCurveTo(x, y, x, y + r); g.quadraticCurveTo(x, y, x - r, y); g.quadraticCurveTo(x, y, x, y - r); g.fill(); g.restore(); }
  function itemIcon(ctx, it, x, y, sz) {
    const S2 = 96, RC = ['#cfd8dc', '#66bb6a', '#42a5f5', '#ffb300', '#ff4fd8'], GEM = ['#90a4ae', '#43c56b', '#2f8cff', '#ff7a1a', '#c040ff'];
    const kind = it.kind || ({ weapon: 'sword', armor: 'vest', charm: 'necklace' })[it.slot];
    const c = cached(`it3|${kind}|${it.r}`, S2, S2, g => {
      g.scale(1.5, 1.5);
      const col = RC[it.r], r = it.r;
      // 카드 바탕
      RR(g, 2, 2, 60, 60, 13);
      if (r === 4) { const gr = g.createLinearGradient(0, 0, 64, 64); ['#ff9be8', '#b48cff', '#7ad7ff', '#ffe27a'].forEach((c2, k) => gr.addColorStop(k / 3, c2)); g.fillStyle = gr; }
      else g.fillStyle = lgr(g, LI(col, 0.78), LI(col, 0.2), 0, 0, 0, 64);
      g.fill();
      g.save(); RR(g, 2, 2, 60, 60, 13); g.clip();
      if (r >= 2) { g.save(); g.translate(32, 34); for (let k = 0; k < 12; k++) { g.rotate(Math.PI / 6); g.beginPath(); g.moveTo(0, 0); g.lineTo(-4, -46); g.lineTo(4, -46); g.closePath(); g.fillStyle = `rgba(255,255,255,${r >= 3 ? 0.22 : 0.14})`; g.fill(); } g.restore(); }
      const gl = g.createRadialGradient(32, 34, 2, 32, 34, 30); gl.addColorStop(0, r >= 3 ? 'rgba(255,250,200,.95)' : 'rgba(255,255,255,.55)'); gl.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gl; g.fillRect(0, 0, 64, 64);
      g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.moveTo(2, 2); g.lineTo(62, 2); g.lineTo(62, 14); g.quadraticCurveTo(32, 24, 2, 18); g.fill();
      g.restore();
      st(g, 3.5, r === 4 ? '#6a1b9a' : DK(col, 0.3)); RR(g, 2, 2, 60, 60, 13); g.stroke();
      st(g, 1.2, 'rgba(255,255,255,.7)'); RR(g, 5, 5, 54, 54, 10); g.stroke();
      g.save(); g.translate(32, 34);
      const bl = ['#c9a37a', '#dfe9f2', '#8fd3ff', '#ffd54f', '#ff9ef0'][r], gd = ['#8a6040', '#b0bec5', '#5aa9f5', '#ffd34d', '#ffd34d'][r];
      const metal = (x0, x1) => lgr(g, '#ffffff', r === 0 ? '#8a6040' : DK(bl, 0.15), x0, 0, x1, 0);
      const handle = (y0, len) => { RR(g, -2.2, y0, 4.4, len, 1.5); g.fillStyle = lgr(g, '#8a5a35', '#4e3020', -2, 0, 2, 0); g.fill(); st(g, 1, OUT); g.stroke(); st(g, 0.6, 'rgba(255,220,150,.6)'); for (let y = y0 + 1; y < y0 + len - 1; y += 2.4) { g.beginPath(); g.moveTo(-2.2, y); g.lineTo(2.2, y + 1.1); g.stroke(); } };
      if (it.slot === 'weapon') {
        g.rotate(0.78);
        if (r >= 3) { g.save(); g.globalCompositeOperation = 'lighter'; g.shadowColor = bl; g.shadowBlur = 12; g.fillStyle = rgba(bl, 0.45); E(g, 0, -8, 9, 22); g.fill(); g.restore(); }
        if (kind === 'axe') {
          handle(-22, 44);
          g.beginPath(); g.moveTo(1, -22); g.quadraticCurveTo(19, -24, 17, -4); g.quadraticCurveTo(9, -10, 1, -8); g.closePath(); g.fillStyle = metal(0, 18); g.fill(); st(g, 1.4, OUT); g.stroke();
          if (r >= 2) { g.beginPath(); g.moveTo(-1, -22); g.quadraticCurveTo(-13, -20, -12, -8); g.quadraticCurveTo(-6, -11, -1, -9); g.closePath(); g.fillStyle = metal(-12, 0); g.fill(); st(g, 1.2, OUT); g.stroke(); }
          st(g, 1, 'rgba(255,255,255,.9)'); g.beginPath(); g.moveTo(16, -20); g.quadraticCurveTo(17, -13, 15.5, -6); g.stroke();
          if (r >= 2) gem(g, 0, -15, 3, GEM[r]);
        } else if (kind === 'spear') {
          handle(-10, 36);
          g.beginPath(); g.moveTo(-5, -10); g.lineTo(0, -28); g.lineTo(5, -10); g.lineTo(0, -13); g.closePath(); g.fillStyle = metal(-5, 5); g.fill(); st(g, 1.3, OUT); g.stroke();
          g.fillStyle = r >= 3 ? '#ffd34d' : '#e53935'; g.beginPath(); g.moveTo(-2, -9); g.lineTo(-8, -2); g.lineTo(1, -6); g.fill(); g.beginPath(); g.moveTo(2, -9); g.lineTo(7, -3); g.lineTo(-1, -6); g.fill();
          RR(g, -3.5, -11, 7, 3, 1.4); g.fillStyle = gd; g.fill(); st(g, 0.8, OUT); g.stroke();
          if (r >= 2) gem(g, 0, -18, 2.4, GEM[r]);
        } else if (kind === 'hammer') {
          handle(-8, 32);
          RR(g, -12, -24, 24, 17, 4); g.fillStyle = lgr(g, '#ffffff', r === 0 ? '#9a7a5a' : DK(bl, 0.2), -12, -24, 12, -7); g.fill(); st(g, 1.5, OUT); g.stroke();
          RR(g, -13, -18, 26, 4, 2); g.fillStyle = gd; g.fill(); st(g, 0.8, OUT); g.stroke();
          st(g, 1, 'rgba(255,255,255,.9)'); g.beginPath(); g.moveTo(-9, -22); g.lineTo(7, -22); g.stroke();
          if (r >= 2) gem(g, 0, -16, 3.2, GEM[r]); else paw(g, 0, -15.5, 0.5, 'rgba(255,255,255,.7)');
        } else if (kind === 'katana') {
          g.beginPath(); g.moveTo(-2.4, 6); g.quadraticCurveTo(-4.5, -12, -1, -28); g.lineTo(2.2, -24); g.quadraticCurveTo(0.6, -10, 2.4, 6); g.closePath(); g.fillStyle = metal(-3, 3); g.fill(); st(g, 1.3, OUT); g.stroke();
          st(g, 0.8, 'rgba(255,255,255,.95)'); g.beginPath(); g.moveTo(1, 3); g.quadraticCurveTo(-0.8, -10, 0.6, -22); g.stroke();
          E(g, 0, 7.5, 5.6, 2.2); g.fillStyle = gd; g.fill(); st(g, 1, OUT); g.stroke();
          RR(g, -2.2, 9, 4.4, 14, 1.5); g.fillStyle = r >= 3 ? '#4a148c' : '#b71c1c'; g.fill(); st(g, 1, OUT); g.stroke(); st(g, 0.7, '#ffd34d'); for (let y = 10; y < 22; y += 3) { g.beginPath(); g.moveTo(-2.2, y); g.lineTo(2.2, y + 1.5); g.stroke(); }
          if (r >= 2) { g.fillStyle = 'rgba(255,190,220,.9)'; for (let k = 0; k < 3; k++) { E(g, 6 + k * 3, -18 + k * 7, 1.6, 1.2); g.fill(); } }
        } else if (kind === 'claw') {
          g.rotate(-0.78);
          RR(g, -11, 2, 22, 13, 6); g.fillStyle = lgr(g, '#8a5a35', '#4e3020', 0, 2, 0, 15); g.fill(); st(g, 1.3, OUT); g.stroke();
          for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(k * 7 - 2.4, 3); g.quadraticCurveTo(k * 8 - 1, -12, k * 9 + 2, -20); g.quadraticCurveTo(k * 7 + 1.6, -8, k * 7 + 2.4, 3); g.closePath(); g.fillStyle = metal(k * 7 - 3, k * 7 + 3); g.fill(); st(g, 1.1, OUT); g.stroke(); }
          paw(g, 0, 9, 0.6, '#ffd34d'); if (r >= 2) gem(g, 0, 9, 2.6, GEM[r]);
        } else if (kind === 'great') {
          const L = 30, Wd = 6.2;
          g.beginPath(); g.moveTo(-Wd, 6); g.lineTo(-Wd + 0.6, -L + 7); g.lineTo(0, -L); g.lineTo(Wd - 0.6, -L + 7); g.lineTo(Wd, 6); g.closePath(); g.fillStyle = metal(-Wd, Wd); g.fill(); st(g, 1.5, OUT); g.stroke();
          g.beginPath(); g.moveTo(0, 4); g.lineTo(0, -L + 6); st(g, 1.2, 'rgba(255,255,255,.85)'); g.stroke();
          RR(g, -13, 6, 26, 6, 3); g.fillStyle = lgr(g, LI(gd, 0.4), DK(gd, 0.2), 0, 6, 0, 12); g.fill(); st(g, 1.2, OUT); g.stroke();
          RR(g, -2.6, 12, 5.2, 11, 1.5); g.fillStyle = '#4a2f5a'; g.fill(); st(g, 1, OUT); g.stroke();
          E(g, 0, 24.5, 3.4, 3.4); g.fillStyle = gd; g.fill(); st(g, 1, OUT); g.stroke();
          if (r >= 2) gem(g, 0, 9, 3, GEM[r]);
        } else {
          const L = 22 + r * 1.5, Wd = 4 + (r >= 3 ? 1.6 : 0);
          g.beginPath(); g.moveTo(-Wd, 7); g.lineTo(-Wd + 0.4, -L + 6); g.lineTo(0, -L); g.lineTo(Wd - 0.4, -L + 6); g.lineTo(Wd, 7); g.closePath();
          g.fillStyle = metal(-Wd, Wd); g.fill(); st(g, 1.5, OUT); g.stroke();
          g.beginPath(); g.moveTo(0, 5); g.lineTo(0, -L + 5); st(g, 1, 'rgba(255,255,255,.8)'); g.stroke();
          if (r >= 1) { RR(g, -11, 7, 22, 5, 2.5); g.fillStyle = lgr(g, LI(gd, 0.4), DK(gd, 0.2), 0, 7, 0, 12); g.fill(); st(g, 1.3, OUT); g.stroke(); }
          else bone(g, 0, 9, 18, '#f5e6c8');
          RR(g, -2.2, 12, 4.4, 10, 1.5); g.fillStyle = '#7a4a2a'; g.fill(); st(g, 1, OUT); g.stroke();
          if (r >= 2) gem(g, 0, 9.5, 2.8, GEM[r]);
          E(g, 0, 23.5, 3.2, 3.2); g.fillStyle = gd; g.fill(); st(g, 1, OUT); g.stroke();
        }
      } else if (it.slot === 'armor') {
        const ac = ['#b08968', '#9fb0bf', '#5aa9f5', '#ffcf3f', '#b07cff'][r];
        if (kind === 'scale') {
          g.beginPath(); g.moveTo(-16, -14); g.quadraticCurveTo(0, -20, 16, -14); g.lineTo(14, 17); g.quadraticCurveTo(0, 22, -14, 17); g.closePath(); g.fillStyle = lgr(g, LI(ac, 0.3), DK(ac, 0.35), -12, -16, 12, 18); g.fill(); st(g, 1.6, OUT); g.stroke();
          g.save(); g.clip(); for (let yy = -14; yy < 20; yy += 5) for (let xx = -16 + ((yy / 5) % 2 ? 3 : 0); xx < 17; xx += 6) { g.beginPath(); g.arc(xx, yy, 3.2, 0, Math.PI); g.fillStyle = 'rgba(255,255,255,.18)'; g.fill(); st(g, 0.7, rgba(DK(ac, 0.5), 0.7)); g.stroke(); } g.restore();
          if (r >= 2) gem(g, 0, 0, 4.2, GEM[r]);
        } else if (kind === 'robe') {
          g.beginPath(); g.moveTo(-10, -18); g.quadraticCurveTo(0, -22, 10, -18); g.lineTo(19, 20); g.quadraticCurveTo(0, 25, -19, 20); g.closePath();
          g.fillStyle = lgr(g, LI(ac, 0.3), DK(ac, 0.35), -14, -18, 14, 22); g.fill(); st(g, 1.6, OUT); g.stroke();
          g.beginPath(); g.moveTo(0, -18); g.lineTo(0, 22); st(g, 1.2, rgba(DK(ac, 0.5), 0.7)); g.stroke();
          RR(g, -14, 2, 28, 4, 2); g.fillStyle = '#ffd34d'; g.fill(); st(g, 0.8, OUT); g.stroke();
          g.beginPath(); g.moveTo(-8, -18); g.lineTo(0, -8); g.lineTo(8, -18); st(g, 2, '#fff3c4'); g.stroke();
          for (let k = 0; k < 4; k++) star(g, -10 + k * 7, 14, 1.8, 'rgba(255,255,255,.75)');
          if (r >= 2) gem(g, 0, 4, 3.4, GEM[r]);
        } else {
          if (r >= 3) { g.beginPath(); g.moveTo(-15, -12); g.quadraticCurveTo(-24, 6, -18, 22); g.lineTo(18, 22); g.quadraticCurveTo(24, 6, 15, -12); g.fillStyle = r === 4 ? '#3b1a7a' : '#c62828'; g.fill(); st(g, 1.3, OUT); g.stroke(); }
          g.beginPath(); g.moveTo(-17, -14); g.quadraticCurveTo(-8, -19, -5, -12); g.quadraticCurveTo(0, -8, 5, -12); g.quadraticCurveTo(8, -19, 17, -14); g.lineTo(14, 16); g.quadraticCurveTo(0, 22, -14, 16); g.closePath();
          g.fillStyle = lgr(g, LI(ac, 0.45), DK(ac, 0.28), -10, -16, 10, 18); g.fill(); st(g, 1.6, OUT); g.stroke();
          if (kind === 'plate') { [[-20, -14], [20, -14]].forEach(([px, py]) => { E(g, px * 0.85, py + 1, 8, 6); g.fillStyle = lgr(g, LI(ac, 0.5), DK(ac, 0.2), 0, py - 5, 0, py + 5); g.fill(); st(g, 1.3, OUT); g.stroke(); }); for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(-12, -2 + k * 6); g.quadraticCurveTo(0, 1 + k * 6, 12, -2 + k * 6); st(g, 1, rgba(DK(ac, 0.5), 0.6)); g.stroke(); } [[-9, -6], [9, -6], [-9, 12], [9, 12]].forEach(([x, y]) => { E(g, x, y, 1.3, 1.3); g.fillStyle = '#fff'; g.fill(); }); }
          else { [-6, 6].forEach(sx => { for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(sx - 2, -4 + k * 5); g.lineTo(sx + 2, -2 + k * 5); st(g, 1, r ? DK(ac, 0.5) : '#6b4526'); g.stroke(); } }); }
          g.beginPath(); g.moveTo(0, -8); g.lineTo(0, 18); st(g, 1, 'rgba(0,0,0,.18)'); g.stroke();
          if (r >= 2) gem(g, 0, 2, 4.5, GEM[r]); else paw(g, 0, 3, 1, 'rgba(255,255,255,.65)');
          g.fillStyle = 'rgba(255,255,255,.45)'; E(g, -8, -6, 3, 7); g.fill();
        }
      } else {
        const gc = GEM[r];
        if (kind === 'bell') {
          st(g, 2, '#e53935'); g.beginPath(); g.arc(0, -8, 12, 0.3, Math.PI - 0.3); g.stroke();
          g.beginPath(); g.moveTo(-12, 14); g.quadraticCurveTo(-12, -6, 0, -8); g.quadraticCurveTo(12, -6, 12, 14); g.closePath(); g.fillStyle = lgr(g, '#fff6c8', r >= 3 ? '#e0a020' : r === 0 ? '#b98a55' : '#c9d2da', -10, -6, 10, 14); g.fill(); st(g, 1.4, OUT); g.stroke();
          g.beginPath(); g.moveTo(-12, 9); g.lineTo(12, 9); st(g, 1.2, OUT); g.stroke(); E(g, 0, 15, 3, 3); g.fillStyle = OUT; g.fill(); E(g, -5, 0, 2, 4); g.fillStyle = 'rgba(255,255,255,.7)'; g.fill();
          if (r >= 2) gem(g, 0, 3, 3, gc);
        } else if (kind === 'badge') {
          g.fillStyle = '#c62828'; g.beginPath(); g.moveTo(-8, -20); g.lineTo(-2, -2); g.lineTo(-10, -2); g.closePath(); g.fill(); g.fillStyle = '#1565c0'; g.beginPath(); g.moveTo(8, -20); g.lineTo(2, -2); g.lineTo(10, -2); g.closePath(); g.fill();
          star(g, 0, 8, 14, lgr(g, '#fff6c8', r >= 3 ? '#e0a020' : r === 0 ? '#c98b5a' : '#b0bec5', 0, -6, 0, 22)); g.beginPath(); for (let k = 0; k < 10; k++) { const a2 = -Math.PI / 2 + k * Math.PI / 5, q = k % 2 ? 6.3 : 14; g.lineTo(Math.cos(a2) * q, 8 + Math.sin(a2) * q); } g.closePath(); st(g, 1.3, OUT); g.stroke();
          if (r >= 2) gem(g, 0, 8, 3.4, gc); else paw(g, 0, 9, 0.5, 'rgba(120,70,20,.7)');
        } else if (kind === 'ring') {
          E(g, 0, 6, 15, 13); E(g, 0, 6, 10.5, 9, 0); st(g, 5, r >= 3 ? '#e0b030' : r === 0 ? '#b87333' : '#c8d2da'); g.beginPath(); g.ellipse(0, 6, 12.5, 11, 0, 0, TAU); g.stroke(); st(g, 1.2, OUT); g.beginPath(); g.ellipse(0, 6, 15, 13.5, 0, 0, TAU); g.stroke(); g.beginPath(); g.ellipse(0, 6, 10, 8.5, 0, 0, TAU); g.stroke();
          st(g, 1.2, 'rgba(255,255,255,.8)'); g.beginPath(); g.ellipse(0, 6, 12.5, 11, 0, Math.PI * 1.1, Math.PI * 1.5); g.stroke();
          gem(g, 0, -7, 6 + r * 0.5, gc);
        } else if (kind === 'talisman') {
          g.save(); g.rotate(-0.12); RR(g, -11, -20, 22, 38, 3); g.fillStyle = lgr(g, '#fff6d8', '#f0d48a', 0, -20, 0, 18); g.fill(); st(g, 1.4, OUT); g.stroke();
          st(g, 1.6, r >= 3 ? '#c62828' : '#d84315'); g.beginPath(); g.moveTo(-6, -12); g.lineTo(6, -12); g.moveTo(0, -16); g.lineTo(0, 12); g.moveTo(-6, -2); g.quadraticCurveTo(0, 4, 6, -2); g.moveTo(-5, 8); g.lineTo(5, 8); g.stroke();
          paw(g, 0, -5, 0.55, rgba(gc, 0.85));
          E(g, 0, -22, 3, 3); g.fillStyle = gc; g.fill(); st(g, 1, OUT); g.stroke(); st(g, 1, '#c62828'); g.beginPath(); g.moveTo(0, 18); g.lineTo(-3, 26); g.moveTo(0, 18); g.lineTo(3, 26); g.stroke();
          g.restore();
        } else {
          st(g, 2.4, r >= 3 ? '#e0b030' : '#c9a24a'); g.beginPath(); g.arc(0, -8, 15, 0.2, Math.PI - 0.2); g.stroke();
          for (let k = 0; k < 7; k++) { const a = 0.35 + k * 0.4; E(g, Math.cos(a) * 15, -8 + Math.sin(a) * 15, 1.6, 1.6); g.fillStyle = '#ffe28a'; g.fill(); }
          if (r === 0) { E(g, 0, 10, 8, 8); g.fillStyle = lgr(g, '#fff6c8', '#d8a630', 0, 2, 0, 18); g.fill(); st(g, 1.4, OUT); g.stroke(); g.beginPath(); g.moveTo(-6, 11); g.lineTo(6, 11); g.stroke(); E(g, 0, 14, 1.5, 1.5); g.fillStyle = OUT; g.fill(); }
          else if (r === 1) { star(g, 0, 11, 11, '#ffd34d'); }
          else if (r === 2) { g.beginPath(); g.moveTo(0, 0); g.lineTo(9, 9); g.lineTo(0, 23); g.lineTo(-9, 9); g.closePath(); g.fillStyle = lgr(g, '#ffffff', gc, -6, 4, 6, 20); g.fill(); st(g, 1.4, OUT); g.stroke(); }
          else { RR(g, -12, 1, 24, 18, 6); g.fillStyle = lgr(g, '#fff3b0', '#e0a020', 0, 1, 0, 19); g.fill(); st(g, 1.4, OUT); g.stroke(); bone(g, 0, 10, 15, r === 4 ? '#f6e0ff' : '#fff8e0'); if (r === 4) gem(g, 0, -1, 3.5, gc); }
        }
      }
      g.restore();
      if (r >= 2) { sparkle(g, 50, 13, 5); sparkle(g, 13, 50, 3.4, 0.8); }
      if (r === 4) { sparkle(g, 12, 14, 3.6); sparkle(g, 52, 50, 4); }
      // 등급 리본
      if (r >= 1) { RR(g, 4, 50, 24, 10, 4); g.fillStyle = r === 4 ? '#8e24aa' : DK(col, 0.25); g.fill(); g.font = `bold 7px ${FONT}`; g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(['', '고급', '희귀', '전설', '신화'][r], 16, 55.5); }
    });
    ctx.drawImage(c, x, y, sz, sz);
  }
  /* 로고 */
  let logoC = null;
  function logo() {
    if (logoC) return logoC;
    const w = 780, h = 300, c = mk(w * US, h * US), g = c.getContext('2d'); g.scale(US, US);
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    const T = '멍멍기사', fs = 118;
    g.font = `900 ${fs}px ${FONT}`;
    g.save(); g.translate(390, 118);
    g.fillStyle = 'rgba(40,15,0,.45)'; g.fillText(T, 4, 10);
    g.lineWidth = 26; g.strokeStyle = '#4a2511'; g.strokeText(T, 0, 0);
    g.lineWidth = 12; g.strokeStyle = '#ffffff'; g.strokeText(T, 0, 0);
    const gr = g.createLinearGradient(0, -fs / 2, 0, fs / 2); gr.addColorStop(0, '#fff6b0'); gr.addColorStop(0.45, '#ffcf3a'); gr.addColorStop(1, '#f0801c');
    g.fillStyle = gr; g.fillText(T, 0, 0);
    g.save(); g.beginPath(); g.rect(-400, -fs / 2, 800, fs * 0.42); g.clip(); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillText(T, 0, 0); g.restore();
    g.restore();
    // 투구 장식 (첫 글자 위)
    g.save(); g.translate(170, 54); g.rotate(-0.2);
    g.beginPath(); g.ellipse(0, 0, 40, 34, 0, Math.PI, TAU); g.closePath(); g.fillStyle = lgr(g, '#ffffff', '#93a4b3', 0, -34, 0, 0); g.fill(); st(g, 5, '#4a2511'); g.stroke();
    RR(g, -42, -4, 84, 10, 5); g.fillStyle = lgr(g, '#fff0a0', '#d79a1c', 0, -4, 0, 6); g.fill(); st(g, 4, '#4a2511'); g.stroke();
    g.beginPath(); g.moveTo(-6, -32); g.bezierCurveTo(-10, -62, -40, -66, -56, -48); g.bezierCurveTo(-40, -52, -22, -44, -14, -28); g.closePath(); g.fillStyle = lgr(g, '#ff8a80', '#d32f2f', -50, -60, -10, -30); g.fill(); st(g, 4, '#4a2511'); g.stroke();
    g.restore();
    // 리본
    g.save(); g.translate(390, 228);
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 150, -18); g.lineTo(s * 210, -14); g.lineTo(s * 192, 4); g.lineTo(s * 212, 22); g.lineTo(s * 150, 18); g.closePath(); g.fillStyle = '#a5281e'; g.fill(); st(g, 4, '#4a2511'); g.stroke(); }
    g.beginPath(); g.moveTo(-165, -24); g.quadraticCurveTo(0, -38, 165, -24); g.lineTo(165, 22); g.quadraticCurveTo(0, 8, -165, 22); g.closePath();
    g.fillStyle = lgr(g, '#ff6b52', '#c62828', 0, -30, 0, 20); g.fill(); st(g, 4.5, '#4a2511'); g.stroke();
    g.font = `900 34px ${FONT}`; g.fillStyle = '#4a2511'; g.fillText('D E F E N S E', 0, -6 + 2);
    g.fillStyle = '#fff4d0'; g.fillText('D E F E N S E', 0, -6);
    bone(g, -128, -7, 30, '#fff4d0', -0.1); bone(g, 128, -7, 30, '#fff4d0', 0.1);
    g.restore();
    logoC = c; return c;
  }
  /* 부드러운 원 (파티클용) */
  const dotC = {};
  function softDot(col) {
    if (dotC[col]) return dotC[col];
    const c = mk(32, 32), g = c.getContext('2d'); const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    gr.addColorStop(0, rgba(col, 1)); gr.addColorStop(0.4, rgba(col, 0.7)); gr.addColorStop(1, rgba(col, 0)); g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
    return (dotC[col] = c);
  }
  return { wearType, BUILD: '2.3.0', _theme: theme, drawFit, tight, setSpriteImage, drawFore, drawGrade, paper, gearShape, DRAGON_STAGE, dragonMouth, setBgImage, HERO_BREEDS, HERO_FUR, HERO_HELM, HERO_PLUME, HERO_CAPE, DRAGON_COL, crystalShard, WKINDS, SS, eyeKit, shadowMark, LOOKS, THEMES, FONT, frame, draw, warm, heroId, clearHeroCache, FRAMES, drawBg, vignette, castle, nest, panel, button, icon, itemIcon, logo, softDot, mix, LI, DK, rgba, E, RR, lgr, rg, paw, bone, star, mk, paintDog };
})();
