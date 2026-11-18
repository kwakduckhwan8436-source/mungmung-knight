/* =========================================================
   멍멍기사 디펜스 (MungMung Knight Defense) v0.2.0
   - 가로형 모바일 횡스크롤 디펜스 / HTML5 Canvas
   - 그림: art.js / 음악·효과음: audio.js (모두 코드 생성, 외부 에셋 0개)
   ========================================================= */
'use strict';
(function () {
const VERSION = '5.2.0';
if (window.ART && ART.BUILD !== VERSION && window.mmkFail) mmkFail('파일 버전이 섞였어요 (art ' + (ART.BUILD || '옛 버전') + ' / game ' + VERSION + '). 새로 고침을 눌러 주세요.');
const W = 960, H = 540, GY = 380;
const FONT = ART.FONT;
const cvs = document.getElementById('game');
let ctx = cvs.getContext('2d');
let dpr = 1, scl = 1;
// v1.7 화면 꽉 채우기: 설계 화면 960×540은 가운데 그대로 두고, 폰이 더 길면 양옆(OX)까지 배경·전장·지도를 넓혀 그림
let OX = 0, VW = W;
function resize() {
  const iw = window.innerWidth, ih = window.innerHeight;
  dpr = Math.min(window.devicePixelRatio || 1, 3); if (iw * ih * dpr * dpr > 7.5e6) dpr = Math.max(1, Math.sqrt(7.5e6 / (iw * ih))); /* v4.8 핸드폰 화면 선명하게 (2배 → 최대 3배, 큰 화면은 줄임) */
  VW = Math.round(clampN(H * iw / ih, W, 1400)); OX = (VW - W) / 2;
  scl = Math.min(iw / VW, ih / H);
  cvs.style.width = Math.floor(VW * scl) + 'px'; cvs.style.height = Math.floor(H * scl) + 'px';
  cvs.width = Math.floor(VW * scl * dpr); cvs.height = Math.floor(H * scl * dpr);
  if (typeof readSafe === 'function') readSafe();
}
function bgFull(i, camX, t, gy, w, h) { ctx.save(); ctx.translate(-OX, 0); ART.drawBg(ctx, i, camX - OX, t, gy, VW, h); ctx.restore(); }
function vigFull() { ctx.save(); ctx.translate(-OX, 0); ART.vignette(ctx, VW, H); ctx.restore(); }
function foreFull(i, camX) { ctx.save(); ctx.translate(-OX, 0); ART.drawFore(ctx, i, camX - OX, G.time, GY, VW, H); ctx.restore(); }
// 960 폭 그림을 가운데 두고, 양옆은 가장자리 줄을 늘여 이어 붙임 (타이틀처럼 미리 그린 그림용)
function drawExt(img) { ctx.drawImage(img, 0, 0, W, H); if (OX > 0) { ctx.drawImage(img, 0, 0, 6, img.height, -OX, 0, OX + 1, H); ctx.drawImage(img, img.width - 6, 0, 6, img.height, W - 1, 0, OX + 1, H); } }
// v1.8 화면 끝 붙이기: 넓은 화면에서 왼쪽/오른쪽 버튼 묶음을 화면 끝(노치 안전 영역 안쪽)으로 옮김
let UIDX = 0, SAFE_L = 0, SAFE_R = 0; const EDG = [];
function uiPush(b) { b.x += UIDX; ui.push(b); return b; }
function EX(side) { if (S && S.edgeUI === false) return 0; return Math.max(0, OX - (side < 0 ? SAFE_L : SAFE_R)); }
function edgeOn(side) { const d = side * EX(side); ctx.save(); ctx.translate(d, 0); UIDX += d; EDG.push(d); }
function edgeOff() { UIDX -= EDG.pop() || 0; ctx.restore(); }
function readSafe() { try { let el = document.getElementById('safeProbe'); if (!el) { el = document.createElement('div'); el.id = 'safeProbe'; el.style.cssText = 'position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;padding-left:env(safe-area-inset-left);padding-right:env(safe-area-inset-right)'; document.body.appendChild(el); } const cs = getComputedStyle(el); SAFE_L = (parseFloat(cs.paddingLeft) || 0) / (scl || 1); SAFE_R = (parseFloat(cs.paddingRight) || 0) / (scl || 1); } catch (e) {} }
function clampN(v, a, b) { return v < a ? a : v > b ? b : v; }
window.addEventListener('resize', resize); resize();
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const pick = a => a[Math.floor(Math.random() * a.length)];
const TAU = Math.PI * 2;

/* ---------------- 저장 ---------------- */
const SAVE_KEY = 'mmk_defense_save_v1';
function defSave() {
  return { v: 2, cleared: 0, stars: {}, coins: 120, lv: 1, xp: 0, potions: 2,
    up: { hp: 0, atk: 0, food: 0, mana: 0, u0: 0, u1: 0, u2: 0, u3: 0, u4: 0, u5: 0, u6: 0, u7: 0, u8: 0, u9: 0 }, deck: [0, 1, 2, 3, 4], lore: {},
    inv: [], eq: { weapon: null, armor: null, charm: null }, sound: true, music: true, uid: 1, tut: false, seen: {}, custom: null, chRew: {}, grow: 0, third: {}, mir: { pat: 0, flame: 0 }, autoSell: 0, pets: {}, pet: null };
}
function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) { const o = JSON.parse(raw), d = defSave(); const r = Object.assign(d, o, { up: Object.assign(d.up, o.up || {}), eq: Object.assign(d.eq, o.eq || {}) }); if (r.music === undefined) r.music = true; if (!r.seen) r.seen = {}; if (!r.chRew) r.chRew = {}; if (r.grow == null) r.grow = 0; if (!Array.isArray(r.deck) || !r.deck.length) r.deck = [0, 1, 2, 3, 4]; r.v = 3; return r; }
  } catch (e) {}
  return defSave();
}
let S = loadSave();
if (S.perm && S.perm.r4) { S.pets = S.pets || {}; S.pets.unicorn = 1; } /* v4.8 4배 영구 = 유니콘 펫 선물 */
if (S.mirFire && !S.mirRainbow) S.mirRainbow = 1; /* v4.8 미르의 불꽃을 산 사람은 무지개 색도 */
try { if (S.items && S.items.x2ticket) { S.gems = (S.gems || 0) + 5 * S.items.x2ticket; S.x2refund = S.items.x2ticket; delete S.items.x2ticket; } if (S.bag) S.bag = S.bag.map(b => b === 'x2ticket' ? null : b); } catch (e) {} /* v4.6 2배 티켓 없앰 → 가지고 있던 티켓은 보석으로 돌려줌 */
try { (S.inv || []).forEach(fixItem); ['weapon', 'armor', 'charm'].forEach(k => fixItem(S.eq[k])); } catch (e) {}
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {} }
const SFX = new Proxy({}, { get: (_, k) => () => { try { AUD.SFX[k] && AUD.SFX[k](); } catch (e) {} } });
function applyAudioPrefs() { AUD.setMusic(!!S.music); AUD.setSfx(!!S.sound); }

/* ---------------- 데이터 ---------------- */
const UNITS = [
  { id: 'u0', nick: '콩이', breed: '시바견', name: '꼬마 시바', cost: 15, cd: 2.5, hp: 60, atk: 8, range: 26, spd: 72, rate: 0.8, type: 'melee', unlock: 1, s: 0.8, role: '돌격', col: '#ff9f43' },
  { id: 'u1', nick: '뭉치', breed: '불독', name: '불독 방패병', cost: 35, cd: 6, hp: 230, atk: 6, range: 24, spd: 44, rate: 1.1, type: 'tank', unlock: 1, s: 0.86, role: '방어', col: '#4f8ef7' },
  { id: 'u2', nick: '초코', breed: '비글', name: '비글 궁수', cost: 30, cd: 4, hp: 55, atk: 11, range: 190, spd: 56, rate: 1.3, type: 'ranged', unlock: 2, s: 0.82, role: '원거리', col: '#43b05c' },
  { id: 'u3', nick: '설이', breed: '허스키', name: '허스키 마법사', cost: 60, cd: 8, hp: 85, atk: 20, range: 165, spd: 48, rate: 2.0, type: 'magic', splash: 60, unlock: 4, s: 0.84, role: '마법', col: '#9b6bff' },
  { id: 'u4', nick: '백구', breed: '진돗개', name: '진돗개 무사', cost: 95, cd: 12, hp: 330, atk: 30, range: 34, spd: 62, rate: 0.9, type: 'elite', unlock: 12, s: 0.92, role: '정예', col: '#ef5350' },
  { id: 'u5', nick: '망고', breed: '웰시코기', name: '코기 포격병', cost: 45, cd: 7, hp: 90, atk: 17, range: 215, spd: 50, rate: 2.4, type: 'mortar', splash: 72, unlock: 23, s: 0.84, role: '포격', col: '#ff8a3d', desc: '뼈다귀 폭탄을 포물선으로 쏴 여러 적을 맞힘' },
  { id: 'u6', nick: '몽실', breed: '푸들', name: '푸들 치유사', cost: 50, cd: 9, hp: 85, atk: 5, range: 175, spd: 50, rate: 1.7, type: 'healer', heal: 30, unlock: 33, s: 0.84, role: '치유', col: '#ff7ab6', desc: '다친 동료와 기사를 하트 마법으로 치료' },
  { id: 'u7', nick: '쭈니', breed: '닥스훈트', name: '닥스훈트 창기병', cost: 40, cd: 5, hp: 125, atk: 14, range: 48, spd: 82, rate: 0.9, type: 'lancer', pierce: 2, unlock: 44, s: 0.86, role: '돌파', col: '#c0703a', desc: '긴 창으로 앞의 적 둘을 한꺼번에 찌름' },
  { id: 'u8', nick: '태산', breed: '세인트버나드', name: '세인트버나드 수호자', cost: 120, cd: 16, hp: 950, atk: 24, range: 30, spd: 34, rate: 1.4, type: 'giant', unlock: 56, s: 1.0, role: '거대 방패', col: '#8d5a2b', desc: '엄청난 체력, 몸통 박치기로 적을 밀어냄' },
  { id: 'u9', nick: '치치', breed: '치와와', name: '치와와 암살자', cost: 35, cd: 4, hp: 52, atk: 18, range: 22, spd: 112, rate: 0.6, type: 'assassin', crit: 40, unlock: 16, s: 0.78, role: '암살', col: '#9c27b0', desc: '아주 빠르고 치명타 40%' },
];
const ENEMIES = {
  slime: { name: '늪 슬라임', hp: 40, atk: 6, range: 22, spd: 40, rate: 1.0, xp: 4, coin: 2, h: 36, s: 1.06 },
  rat:   { name: '해골쥐', hp: 30, atk: 7, range: 20, spd: 78, rate: 0.7, xp: 4, coin: 2, h: 32, s: 1.01 },
  digger: { name: '땅굴 두더지 꼬마', hp: 38, atk: 10, range: 22, spd: 66, rate: 0.95, xp: 6, coin: 4, h: 34, s: 1.0, dig: true },
  toad:  { name: '독두꺼비', hp: 50, atk: 9, range: 170, spd: 38, rate: 1.6, xp: 6, coin: 3, h: 40, s: 1.06, ranged: true },
  bat:   { name: '그림자 박쥐', hp: 34, atk: 8, range: 22, spd: 98, rate: 0.8, xp: 5, coin: 3, h: 96, s: 1.01, fly: true },
  wolf:  { name: '늑대 산적', hp: 125, atk: 15, range: 28, spd: 62, rate: 1.0, xp: 12, coin: 6, h: 64, s: 1.03 },
  golem: { name: '돌 골렘', hp: 390, atk: 20, range: 30, spd: 28, rate: 1.6, xp: 25, coin: 12, h: 84, s: 1.06 },
  troll: { name: '늪 대왕 그롬', hp: 1500, atk: 42, range: 46, spd: 24, rate: 1.8, xp: 160, coin: 90, h: 170, s: 0.82, boss: true },
  scorp: { name: '모래 전갈왕 스콜피', hp: 2100, atk: 46, range: 64, spd: 30, rate: 1.5, xp: 220, coin: 120, h: 175, s: 1.3, boss: true },
  frost: { name: '서리 거인 프로스트', hp: 2600, atk: 52, range: 50, spd: 20, rate: 1.9, xp: 280, coin: 150, h: 170, s: 0.85, boss: true },
  nox:   { name: '그림자 늑대왕 녹스', hp: 3200, atk: 58, range: 54, spd: 36, rate: 1.2, xp: 400, coin: 250, h: 160, s: 0.95, boss: true },
  crab:  { name: '가시 게', hp: 70, atk: 10, range: 24, spd: 46, rate: 1.0, xp: 7, coin: 4, h: 46, s: 1.06 },
  sknight: { name: '그림자 기사', hp: 180, atk: 20, range: 30, spd: 55, rate: 1.0, xp: 16, coin: 8, h: 68, s: 1.06 },
  kkuruk: { name: '꾸룩 대왕', hp: 900, atk: 26, range: 46, spd: 26, rate: 1.6, xp: 110, coin: 70, h: 125, s: 0.85, boss: true },
  kraken: { name: '심해 여왕 크라케나', hp: 3600, atk: 64, range: 72, spd: 24, rate: 1.6, xp: 520, coin: 300, h: 150, s: 1.05, boss: true },
  owl:   { name: '폭풍 해적 스톰윙', hp: 4200, atk: 70, range: 58, spd: 40, rate: 1.2, xp: 620, coin: 360, h: 140, s: 1.05, boss: true },
  void:  { name: '침묵의 군주 보이드', hp: 7600, atk: 96, range: 74, spd: 22, rate: 1.5, xp: 1400, coin: 900, h: 190, s: 0.82, boss: true },
  cgolem: { name: '수정 골렘왕 프리즘', hp: 6000, atk: 84, range: 56, spd: 20, rate: 1.8, xp: 1000, coin: 620, h: 200, s: 0.8, boss: true },
  whale: { name: '은하 고래 오르카', hp: 9000, atk: 104, range: 90, spd: 18, rate: 1.9, xp: 1700, coin: 1100, h: 160, s: 0.62, boss: true },
  fenrir: { name: '별을 삼키는 늑대 펜릴', hp: 11000, atk: 118, range: 70, spd: 38, rate: 1.1, xp: 2200, coin: 1500, h: 175, s: 0.72, boss: true },
  mole:  { name: '두더지 왕 드릴로', hp: 12500, atk: 126, range: 66, spd: 30, rate: 1.3, xp: 2600, coin: 1700, h: 165, s: 0.7, boss: true },
  jelly: { name: '잠꾸러기 해파리 여왕 몽글라', hp: 15600, atk: 138, range: 120, spd: 24, rate: 1.4, xp: 4200, coin: 2900, h: 190, s: 0.64, boss: true, fly: false },
  rainturtle: { name: '무지개 문지기 칠색 거북 무지', hp: 18500, atk: 150, range: 120, spd: 20, rate: 1.5, xp: 8800, coin: 5800, h: 140, s: 0.62, boss: true },
  shadowchild: { name: '회색 나라의 아이 노을', hp: 19500, atk: 154, range: 110, spd: 36, rate: 1.1, xp: 9600, coin: 6400, h: 190, s: 0.6, boss: true },
  mtgiant: { name: '소리 없는 산의 거인 묵묵이', hp: 21000, atk: 160, range: 130, spd: 18, rate: 1.7, xp: 10400, coin: 7000, h: 220, s: 0.6, boss: true },
  camelbot: { name: '태엽 낙타 터벅이', hp: 20000, atk: 160, range: 130, spd: 24, rate: 1.6, xp: 12000, coin: 8200, h: 200, s: 0.6, boss: true },
  starfox: { name: '별시장의 상인 여우 짤랑이', hp: 17000, atk: 150, range: 150, spd: 34, rate: 1.2, xp: 12800, coin: 9000, h: 190, s: 0.6, boss: true },
  mossbear: { name: '잠든 숲의 이끼 곰 쿨쿨', hp: 14500, atk: 160, range: 140, spd: 18, rate: 1.8, xp: 13600, coin: 9600, h: 210, s: 0.6, boss: true },
  dawndeer: { name: '첫 아침의 큰 뿔 사슴 새벽', hp: 14500, atk: 158, range: 150, spd: 30, rate: 1.3, xp: 14400, coin: 10400, h: 240, s: 0.6, boss: true },
  drumgiant: { name: '축제 북 거인 둥둥', hp: 15800, atk: 176, range: 160, spd: 26, rate: 1.4, xp: 20000, coin: 15800, h: 230, s: 0.6, boss: true },
  toyking: { name: '외톨이 장난감 왕 태엽', hp: 16400, atk: 180, range: 150, spd: 32, rate: 1.3, xp: 21000, coin: 16600, h: 200, s: 0.6, boss: true },
  bellknight: { name: '녹슨 방울 기사 딸랑', hp: 15000, atk: 170, range: 150, spd: 30, rate: 1.3, xp: 18400, coin: 14200, h: 200, s: 0.6, boss: true },
  badukshadow: { name: '바둑이의 그림자', hp: 15600, atk: 174, range: 160, spd: 34, rate: 1.25, xp: 19200, coin: 15000, h: 210, s: 0.6, boss: true },
  icepenguin: { name: '얼음 항구의 선장 꽁꽁', hp: 14800, atk: 166, range: 150, spd: 30, rate: 1.3, xp: 16800, coin: 12600, h: 190, s: 0.6, boss: true },
  songwhale: { name: '꿈꾸는 노래 고래 나루', hp: 15200, atk: 168, range: 170, spd: 22, rate: 1.4, xp: 17600, coin: 13400, h: 220, s: 0.6, boss: true },
  thunderbird: { name: '둥지의 문지기 천둥새 우레', hp: 14000, atk: 162, range: 150, spd: 34, rate: 1.3, xp: 15200, coin: 11200, h: 200, s: 0.6, boss: true, fly: false },
  windelder: { name: '바람 장로 용 하늬', hp: 14500, atk: 164, range: 160, spd: 26, rate: 1.4, xp: 16000, coin: 12000, h: 230, s: 0.6, boss: true },
  echofairy: { name: '메아리 동굴의 요정 되울이', hp: 18500, atk: 148, range: 140, spd: 32, rate: 1.2, xp: 11200, coin: 7600, h: 180, s: 0.6, boss: true },
  catgen: { name: '방울 장군 미요', hp: 17200, atk: 140, range: 90, spd: 38, rate: 1.0, xp: 6400, coin: 4400, h: 170, s: 0.62, boss: true },
  roc: { name: '폭풍 깃털 왕 로크', hp: 17800, atk: 142, range: 140, spd: 30, rate: 1.3, xp: 6800, coin: 4600, h: 200, s: 0.6, boss: true },
  badger: { name: '북치는 오소리 대장 둥둥', hp: 18800, atk: 144, range: 100, spd: 26, rate: 1.4, xp: 7200, coin: 4800, h: 180, s: 0.62, boss: true },
  seaspirit: { name: '이름을 잃은 바다 정령 무명', hp: 19800, atk: 148, range: 150, spd: 28, rate: 1.3, xp: 8000, coin: 5400, h: 190, s: 0.6, boss: true },
  spiderq: { name: '별을 엮는 거미 여왕 아라냐', hp: 16800, atk: 138, range: 130, spd: 26, rate: 1.35, xp: 5200, coin: 3600, h: 200, s: 0.62, boss: true },
  shadowk: { name: '첫 번째 기사의 그림자', hp: 16000, atk: 136, range: 110, spd: 34, rate: 1.1, xp: 6000, coin: 4200, h: 190, s: 0.6, boss: true },
  dmir: { name: '악몽의 거울 미르', hp: 15000, atk: 132, range: 100, spd: 30, rate: 1.3, xp: 4800, coin: 3300, h: 170, s: 0.62, boss: true },
  cogowl: { name: '태엽 부엉이 박사 틱톡', hp: 13200, atk: 126, range: 110, spd: 26, rate: 1.5, xp: 3300, coin: 2200, h: 190, s: 0.66, boss: true },
  tcat: { name: '시간을 먹는 고양이 크로노', hp: 14800, atk: 132, range: 80, spd: 34, rate: 1.2, xp: 3800, coin: 2600, h: 175, s: 0.66, boss: true },
  bonedra: { name: '뼈의 용 오스테아', hp: 14500, atk: 134, range: 92, spd: 22, rate: 1.6, xp: 3000, coin: 2000, h: 185, s: 0.64, boss: true },
  sbori: { name: '그림자 기사 섀도', hp: 6600, atk: 90, range: 60, spd: 46, rate: 0.95, xp: 1200, coin: 760, h: 160, s: 0.9, boss: true },
};
const SKILLS = [
  { name: '멍멍 강타', mp: 25, cd: 4, lv: 1, col: '#ff7a45' },
  { name: '용기의 짖음', mp: 45, cd: 12, lv: 3, col: '#29b6f6' },
  { name: '뼈다귀 폭풍', mp: 80, cd: 22, lv: 6, col: '#ffc107' },
  { name: '미르의 불꽃', mp: 50, cd: 14, lv: 4, col: '#ff5a36', mir: true },
];
const MAXST = 400, CHN = 40, CHL = 10;
const CH_POOLS = [['slime', 'rat'], ['slime', 'rat', 'toad', 'wolf'], ['rat', 'toad', 'bat', 'golem'], ['bat', 'wolf', 'golem', 'toad'], ['wolf', 'golem', 'sknight', 'bat'],
  ['crab', 'slime', 'toad', 'bat'], ['bat', 'sknight', 'wolf', 'crab'], ['golem', 'bat', 'crab', 'sknight'], ['sknight', 'toad', 'wolf', 'bat', 'slime'], ['sknight', 'golem', 'wolf', 'bat', 'crab', 'toad'], ['crab', 'bat', 'sknight', 'slime', 'golem'], ['sknight', 'wolf', 'golem', 'bat', 'crab', 'toad'],
  ['rat', 'golem', 'bat', 'sknight', 'crab'], ['bat', 'golem', 'sknight', 'wolf', 'toad', 'slime'],
  ['golem', 'rat', 'bat', 'wolf', 'crab'], ['sknight', 'golem', 'bat', 'wolf', 'crab', 'toad'],
  ['slime', 'crab', 'bat', 'toad', 'rat'], ['sknight', 'crab', 'bat', 'wolf', 'rat', 'toad'],
  ['bat', 'slime', 'toad', 'wolf', 'crab'], ['sknight', 'wolf', 'toad', 'bat', 'rat', 'crab'],
  ['rat', 'wolf', 'slime', 'bat', 'crab'], ['bat', 'toad', 'crab', 'wolf', 'slime'], ['golem', 'rat', 'toad', 'wolf', 'sknight'], ['crab', 'slime', 'bat', 'sknight', 'wolf', 'toad'],
  ['slime', 'bat', 'toad', 'rat', 'crab', 'wolf'], ['sknight', 'bat', 'wolf', 'rat', 'golem', 'toad'],
  ['golem', 'wolf', 'rat', 'bat', 'toad', 'slime'], ['bat', 'golem', 'sknight', 'crab', 'slime', 'toad'],
  ['rat', 'crab', 'bat', 'golem', 'wolf', 'toad'], ['golem', 'sknight', 'bat', 'crab', 'rat', 'slime'],
  ['bat', 'wolf', 'golem', 'toad', 'slime', 'rat'], ['crab', 'sknight', 'bat', 'golem', 'wolf', 'toad'],
  ['bat', 'wolf', 'rat', 'golem', 'slime', 'crab'], ['sknight', 'bat', 'golem', 'wolf', 'toad', 'crab'],
  ['crab', 'slime', 'wolf', 'golem', 'rat', 'bat'], ['bat', 'sknight', 'crab', 'golem', 'toad', 'wolf'],
  ['rat', 'wolf', 'slime', 'sknight', 'golem', 'bat'], ['sknight', 'golem', 'wolf', 'bat', 'crab', 'toad'],
  ['slime', 'rat', 'toad', 'wolf', 'bat', 'crab'], ['golem', 'sknight', 'bat', 'wolf', 'toad', 'crab']];
const BOSSES = ['kkuruk', 'troll', 'scorp', 'frost', 'nox', 'kraken', 'owl', 'cgolem', 'sbori', 'void', 'whale', 'fenrir', 'mole', 'bonedra', 'cogowl', 'tcat', 'jelly', 'dmir', 'spiderq', 'shadowk', 'catgen', 'roc', 'badger', 'seaspirit', 'rainturtle', 'shadowchild', 'mtgiant', 'echofairy', 'camelbot', 'starfox', 'mossbear', 'dawndeer', 'thunderbird', 'windelder', 'icepenguin', 'songwhale', 'bellknight', 'badukshadow', 'drumgiant', 'toyking'];
const MIDS = ['slime', 'wolf', 'golem', 'golem', 'sknight', 'crab', 'sknight', 'golem', 'wolf', 'sknight', 'crab', 'wolf', 'golem', 'sknight', 'golem', 'sknight', 'crab', 'sknight', 'wolf', 'sknight', 'wolf', 'crab', 'golem', 'sknight', 'crab', 'sknight', 'golem', 'sknight', 'wolf', 'golem', 'golem', 'sknight', 'wolf', 'sknight', 'golem', 'sknight', 'sknight', 'golem', 'wolf', 'golem'];
const CH_NAMES = ['1장 · 햇살 들판', '2장 · 도토리 숲', '3장 · 모래 언덕', '4장 · 눈꽃 설원', '5장 · 불꽃 화산', '6장 · 별빛 해안', '7장 · 구름 왕국', '8장 · 수정 동굴', '9장 · 그림자 늪', '10장 · 별의 성', '11장 · 별의 바다', '12장 · 오로라 신전', '13장 · 두더지 광산 도시', '14장 · 화석 정원', '15장 · 태엽 마을', '16장 · 시간의 탑', '17장 · 구름사탕 해변', '18장 · 거꾸로 바다', '19장 · 별빛 정원', '20장 · 첫 번째 기사의 성', '21장 · 야옹 공화국', '22장 · 깃털 군도', '23장 · 굴굴 연방', '24장 · 이름 없는 바다', '25장 · 무지개 다리', '26장 · 그림자 아이의 마을', '27장 · 소리 없는 산', '28장 · 메아리 동굴', '29장 · 사막의 별시장', '30장 · 모래시계 궁전', '31장 · 잠든 시계 숲', '32장 · 첫 아침의 정원', '33장 · 바람의 일족 둥지', '34장 · 폭풍 왕관', '35장 · 얼음 바다 항구', '36장 · 고래 노래 동굴', '37장 · 백 년 전 야옹 공화국', '38장 · 바둑이의 마지막 성문', '39장 · 다섯 나라 축제 경기장', '40장 · 장난감 왕국의 불꽃 무대'];
const STAGE_NAMES = [
  ['멍멍성 성문', '풍차 마을 길', '꽃밭 소동', '다리 아래', '들판의 문지기', '풍차 광장', '해바라기 언덕', '갈대밭', '해 질 녘 연못가', '꾸룩 연못'],
  ['도토리 숲 입구', '버섯 감옥', '그림자 순찰로', '버섯 마을', '산적의 길목', '나무 위 마을', '모닥불 야영지', '뿌리 문', '숲의 심장', '도토리 성'],
  ['대상단 습격', '뜨거운 모래길', '신기루 언덕', '묻힌 깃발', '오아시스 본 성문', '벽화의 도시', '움직이는 함정 방', '피라미드 꼭대기', '폭풍의 눈', '전갈왕의 왕좌'],
  ['얼어붙은 썰매길', '허스키 마을', '그림자 실 동굴', '눈사람 광장', '빙하 다리', '오로라 언덕', '눈꽃 축제장', '크레바스 다리', '꺼진 등대 앞', '얼음 등대'],
  ['용암 협곡', '무너진 초소', '비밀 통로', '용암 강', '성채 수문장', '금 간 방패의 방', '노래가 끊긴 문', '제단의 계단', '공명하는 별뼈', '희생의 제단'],
  ['조용한 해변', '소리 없는 갈매기', '등대 마을 부두', '젖은 일기장', '썰물 바위', '어부의 마을', '노랫방울 동굴', '바스락의 노래', '소용돌이', '심해 여왕의 바다'],
  ['물기둥 위로', '할미의 고향', '바람 병 항구', '구름 양 목장', '구름 다리 끝', '번개 구름 지대', '편지의 우체국', '바람 동굴', '해적선 잠입', '폭풍 해적선 갑판'],
  ['동굴 입구', '메아리 회랑', '기억의 수정', '초코의 기억', '빛의 갈림길', '얼음 수정 방', '거울 회랑', '대장간의 기억', '프리즘의 왕좌 앞', '수정 왕좌'],
  ['늪의 입구', '반딧불 길', '그림자 기사단 진지', '투구 속 목소리', '썩은 나무 다리', '안개 속 속삭임', '흩어진 기사단', '콩이의 용기', '녹스의 가르침', '늪의 왕좌'],
  ['별의 성 성문', '별의 계단', '고요의 정원', '창문 너머 응원', '마지막 수문장', '바스락의 결심', '노래 없는 도서관', '할미의 비밀', '왕좌의 문', '침묵의 왕좌'],
  ['별빛 항해', '유성 암초', '떠도는 등대섬', '은하 해류', '별 게 대장', '난파선 무덤', '별고래의 노래', '은하 소용돌이', '고래의 숨', '은하 고래의 바다'],
  ['오로라 계단', '얼음꽃 회랑', '첫 번째 기사의 무덤', '별 지도의 방', '신전 수호자', '세 갈래 오로라', '오래된 맹세', '별을 먹은 하늘', '마지막 제단 앞', '펜릴의 옥좌'],
  ['광산 승강기', '갱도 시장', '두더지 우체국', '수레 선로', '광부 반장', '땅울림 갱도', '반짝 광맥', '무너진 터널', '드릴 공장', '두더지 왕의 굴'],
  ['화석 정원 입구', '고사리 숲', '뼈 다리', '잠든 알 둥지', '정원지기', '호박 속 기억', '뼈의 미로', '심장 소리', '고대 제단', '뼈의 심장'],
  ['태엽 마을 입구', '뻐꾸기 시계 거리', '태엽 장난감 가게', '멈춘 분수', '시계공 골렘', '거꾸로 도는 광장', '오르골 극장', '톱니 다리', '부엉이 연구소', '틱톡 박사의 시계탑'],
  ['시간의 탑 1층', '모래시계 복도', '어제의 방', '내일의 계단', '시간 파수꾼', '멈춘 순간의 정원', '거울 시계 회랑', '자정의 종', '고양이 발자국', '시간의 꼭대기'],
  ['꿈의 나루터', '솜사탕 모래사장', '젤리 파도', '사탕 등대', '잠꾸러기 경비대', '베개 섬', '자장가 동굴', '거품 정원', '몽글라의 침실 입구', '해파리 여왕의 꿈'],
  ['뒤집힌 수면', '거꾸로 비 내리는 길', '가라앉은 하늘', '거울 산호초', '악몽 파수꾼', '울음 우물', '그림자 등대', '기억의 해구', '거울 문', '악몽 미르의 둥지'],
  ['별똥별 착륙지', '별꽃 오솔길', '반짝 나비 들판', '은하수 연못', '별실 숲', '달빛 온실', '별자리 미로', '거미줄 다리', '여왕의 실타래', '별을 엮는 둥지'],
  ['구름 성문', '기사의 회랑', '천 년의 정원', '방패의 방', '첫 노래의 탑', '별뼈 보관소', '그림자 계단', '왕좌의 문', '거울 기사단', '첫 번째 기사의 왕좌'],
  ['방울 항구', '생선 시장 골목', '고양이 등불 거리', '낮잠 광장', '털실 공장', '야옹 의회당', '고등어 다리', '방울탑 계단', '장군의 정원', '방울 장군의 성문'],
  ['바람의 선착장', '깃털 다리', '둥지 마을', '구름 등대', '무지개 깃털 숲', '날개 학교', '폭풍의 눈', '거꾸로 폭포', '왕의 둥지 절벽', '폭풍 깃털 왕좌'],
  ['굴굴 입구', '버섯 등불 굴', '두더지 기차역', '뿌리 도서관', '북소리 광장', '땅속 온천', '보석 지하수로', '울림 동굴', '대장의 북 공방', '땅울림 대연회장'],
  ['이름 없는 부두', '안개 바다', '잊힌 배의 무덤', '빛나는 해파리 길', '조개 기록관', '고요한 소용돌이', '별 그림자 암초', '마지막 등대', '이름의 파도', '무명의 바다 한가운데'],
  ['빨강 계단', '주황 구름 정거장', '노랑 별 광장', '초록 바람 숲길', '파랑 거울 호수', '남색 밤 터널', '보라 꿈 다리', '일곱 빛 전망대', '무지개 끝 안개', '문지기 무지의 다리'],
  ['회색 들판', '빛 없는 우물', '말 없는 시장', '잿빛 학교', '혼자 노는 놀이터', '그림자 등불 골목', '닫힌 창문 거리', '첫 색깔의 언덕', '노을의 다락방', '노을이 지는 광장'],
  ['갈림길 첫 계단', '눈 덮인 산길', '얼어붙은 종', '쉿 표지판 고개', '조용한 산마을', '눈사태 자국', '북소리 바위', '구름 위 능선', '거인의 무릎', '거인의 침묵 봉우리'],
  ['동굴 입구 고드름', '따라쟁이 회랑', '수정 종유석 숲', '거꾸로 말하는 샘', '빛나는 박쥐 둥지', '되울림 다리', '잃어버린 목소리 방', '수정 오르간', '메아리 연못', '되울이의 둥지'],
  ['두 번째 갈림길', '모래 언덕 별똥 자리', '천막 골목', '별 경매장', '반짝 가로등 거리', '빈 별자리 하늘', '짐꾼 낙타 정거장', '고장 난 수레 무덤', '여우의 금고 앞', '터벅이의 차고'],
  ['궁전 모래 계단', '바람 정원', '거꾸로 흐르는 분수', '천 개의 창문 복도', '별 저울 방', '잃어버린 대상단 벽화', '모래시계 탑', '여우의 어린 시절 방', '별 금고 꼭대기', '짤랑이의 왕좌'],
  ['멈춘 시계 길', '반딧불 얼음길', '졸린 버섯 마을', '자장가 오솔길', '시곗바늘 다리', '꿈꾸는 나무 굴', '이끼 언덕', '종소리 없는 탑', '곰의 동굴 앞', '쿨쿨의 자장가 숲'],
  ['새벽 정원 문', '닫힌 꽃 길', '해시계 광장', '이슬 연못', '첫 햇살 자리', '시계 뿔 오솔길', '멈춘 분수', '별이 지는 언덕', '마지막 밤의 정원', '새벽의 제단'],
  ['구름 위 첫 발판', '깃털 바람길', '아기 용 둥지', '바람개비 절벽', '구름 목장', '떨어진 알 껍질', '옛 일족의 벽화', '천둥 구름 문', '번개 둥지 앞', '우레의 둥지'],
  ['폭풍 계단', '회오리 다리', '젖은 깃털 길', '장로의 정원', '닫힌 하늘 창', '오스테아의 방', '바람 도서관', '왕관의 틈', '폭풍의 눈', '하늬의 왕관'],
  ['얼어붙은 부두', '고드름 등대길', '썰매 짐수레', '얼음 그물 창고', '펭귄 선원 마을', '멈춘 돛단배', '오로라 망루', '꽁꽁 얼음 벽', '선장실 앞', '꽁꽁의 항구'],
  ['물방울 입구', '빛나는 조개길', '꿈 안개 다리', '잠든 노래 방', '아기 고래 웅덩이', '별 산호 숲', '옛 자장가 벽화', '메아리 소용돌이', '노래 고래의 문', '나루의 동굴'],
  ['빛바랜 기억 골목', '방울 시장', '어린 미요의 집', '야옹 기사 훈련장', '깃발 광장', '고양이 시계탑', '옛 우정의 다리', '방울 성벽', '기억의 문 앞', '딸랑의 문'],
  ['노을 성벽길', '부서진 방패 언덕', '약속의 우물', '바둑이의 막사', '마지막 봉화', '그림자 회랑', '두 친구의 나무', '닫힌 성문 앞', '노을 망루', '바둑이의 성문'],
  ['축제 정문', '풍선 거리', '무지개 간식 골목', '꼬리 이어달리기장', '숨바꼭질 천막', '다섯 나라 깃발 광장', '응원석 계단', '큰북 무대 뒤', '북소리 경기장 앞', '둥둥의 큰북 무대'],
  ['무대 밑 비밀 계단', '블록 성벽길', '태엽 병정 행진로', '빈 편지함 거리', '장난감 기차역', '다락방 창고', '광대 기사의 방', '불꽃 대포 언덕', '왕의 태엽 탑', '태엽 왕의 불꽃 무대'],
];
const MISSIONS = [
  { k: 'normal', n: '전진', d: '둥지를 부수고 길을 연다' },
  { k: 'treasure', n: '보물 사냥', d: '코인 1.6배 · 보물상자가 더 자주 나온다' },
  { k: 'swarm', n: '대군 습격', d: '몬스터가 더 많이 몰려온다 · 경험치 1.3배' },
  { k: 'night', n: '밤의 행군', d: '어두운 밤 · 몬스터 공격력 +15% · 코인 1.3배' },
  { k: 'elite', n: '정예 출현', d: '금빛 정예 몬스터를 쓰러뜨려 보물상자를 얻자' },
  { k: 'totem', n: '그림자 토템 파괴', d: '토템 2개가 둥지를 지킨다 · 토템부터 부숴라' },
  { k: 'raid', n: '강습', d: '강한 몬스터가 섞여 나온다 · 코인 1.4배' },
  { k: 'storm', n: '폭풍 속 전투', d: '거센 날씨 · 몬스터 이동 속도 +15%' },
  { k: 'vigil', n: '결전 전야', d: '토템 1개 · 밤 · 결전을 앞둔 마지막 관문' },
  { k: 'boss', n: '보스전', d: '장의 주인과 결전 · 쓰러뜨리면 별뼈 획득' },
];
// v2.0 난이도: 기본(보통)을 예전보다 어렵게. 처음 몇 판은 천천히 올라가도록 ramp
// v2.4 대상 초1~성인: 쉬움 = 초등 저학년, 보통 = 초등 고학년~어른, 어려움 = 게임 잘하는 어른
// v2.5 바닥(쉬움)을 크게 올림 · 보통/어려움은 그보다 확실히 위
/* v2.6 사용자 요청으로 한 단계 더 올림 */
/* v2.7 사용자 요청: 크게 상향 */
const DIFFS = [{ n: '쉬움', hp: 1.35, atk: 1.6, int: 0.85, coin: 0.9 }, { n: '보통', hp: 1.75, atk: 2.2, int: 0.74, coin: 1.1 }, { n: '어려움', hp: 2.0, atk: 2.8, int: 0.65, coin: 1.4 } /* v4.9 어려움 몬스터 체력 2.3→2.0 · 공격 3.3→2.8 · 나오는 간격 0.6→0.65 (필드 장비를 낮춘 뒤 진 판 39) */]; /* v3.9 현장 의견 「난이도를 한 단계 낮춰 줘」: 보통 = 예전 쉬움, 어려움 = 예전 보통, 쉬움은 더 쉽게 (코인 배율은 그대로) */ /* v3.8 어려움: 체력 3.0→2.8 · 공격 4.6→4.4 · 나오는 간격 0.5→0.53 (봇: 11~30판 들판에서 밀고 당기기, 평균 219초) */
// v2.4 전투 박자: 비슷한 게임(팔라독류)처럼 전체를 조금 느리게. 1 = 예전 속도
const TEMPO0 = 0.78, TEMPO_OPT = [0.85, 1, 1.15]; let TEMPO = TEMPO0; /* v3.5 설정 「전투 빠르기」 느리게/보통/빠르게 (보통 = 지금과 같음) */
function diffOf() { return DIFFS[(S && S.diff != null) ? S.diff : 1] || DIFFS[1]; }
function stageInfoB(n) {
  const si = stageInfo0(n), D = diffOf(), r = Math.max(0, Math.min(1, 0.2 + 0.8 * (n - 1) / 24)), late = n > 30 ? 1 + Math.min(0.8, (n - 30) * 0.004) : 1;
  si.m *= (1 + (D.hp - 1) * r) * late; si.am *= (1 + (D.atk - 1) * r) * late; si.interval *= 1 + (D.int - 1) * r;
  if (n > 10) { const q = Math.min(1, (n - 10) / 10); si.m *= 1 - 0.1 * q; si.am *= 1 + 0.12 * q; si.nestHp = Math.round(si.nestHp * (1 - 0.35 * q)); } if (n >= 14 && n <= 20) { si.m *= 0.9; si.nestHp = Math.round(si.nestHp * 0.9); } /* v3.7 늑대가 섞이는 14~20판만 몬스터 체력·둥지 -10% (봇: 이 구간만 평균 4분 가까이) */ /* v3.5 11판부터: 몬스터 체력 -10%·공격 +12%·둥지 -35% → 오래 끄는 판을 줄이고 지는 위험은 조금 올림 (봇: 11~30판 평균 4~6분이었음) */
  /* v3.0 난이도 곡선: 1판은 난이도 배율 20%만 → 25판에 100% (처음엔 쉽게). 31판부터 판마다 +0.4%씩 더 세짐(최대 +80%) → 뒤로 갈수록 아이템이 필요 */
  if (n > 250) { const b = stageInfoB(250); si.m = b.m + (si.m - b.m) * 0.2; si.am = b.am + (si.am - b.am) * 0.2; si.nestHp = Math.round(b.nestHp + (si.nestHp - b.nestHp) * 0.35); if (si.totems) { si.m *= 0.88; si.nestHp = Math.round(si.nestHp * 0.9); } } /* v4.2 251판부터 토템 판은 몬스터 체력 0.88배 · 둥지 0.9배 */ /* v4.1 250판 뒤로는 몬스터가 천천히 세짐 (봇: 레벨 99·강화가 250판쯤 끝나는데 몬스터는 계속 세져 어려움 331~400판이 4~9분) */
  return si;
}
function stageInfo(n) { const si = stageInfoB(n);
  if (n > 30 && !si.special) { const RK = window.__rampK != null ? window.__rampK : RAMP_K, ex = RK * Math.min(1, (n - 30) / 370) * (S.diff === 0 ? 0.5 : S.diff === 2 ? 0.8 : 1); /* 어려움은 이미 세서 0.8 */ si.m *= 1 + ex; si.am *= 1 + ex * (window.__rampA != null ? window.__rampA : RAMP_A); si.ramp = ex; } /* v5.1 시나리오 계단: 31판부터 400판까지 몬스터가 점점 더 세짐 (아이템 없이는 어렵게 · 쉬움은 절반) */
  return si; }
const CHEER_N = 5;
const RAMP_K = 1.0, RAMP_A = 0.3; /* v5.1 계단: 체력은 크게 · 공격은 조금 (오래 걸려 성이 닳음 → 아이템이 판을 짧게) */
function stageInfo0(n) {
  const ch = Math.min(CHN - 1, Math.floor((n - 1) / CHL)), k = (n - 1) % CHL, th = ART.THEMES[ch];
  let pool = CH_POOLS[ch].slice(); if (n === 1) pool = ['slime']; else if (n === 2) pool = ['slime', 'rat'];
  if (k < 3 && pool.length > 2) pool = pool.slice(0, pool.length - 1);
  // v2.1 성을 노리는 몬스터: 20판부터 박쥐(동료 벽을 날아 넘음), 15판부터 땅굴 두더지(땅속으로 성 앞까지)
  if (n >= 20 && !pool.includes('bat')) pool.push('bat');
  if (n >= 15 && [2, 4, 7, 9].includes(n % 10) && !window.NODIG) pool.push('digger'); // 두더지는 10판 중 4판에만
  return { n, ch, ti: ch, th, sub: k + 1, m: (1 + (n - 1) * 0.075) * (n > 3 ? (n > 100 ? 1.09 : 1.15) : 1), am: (1 + (n - 1) * 0.058) * (n > 3 ? (n > 100 ? 1.1 : 1.18) : 1.05), pool,
    nestHp: Math.round((800 + n * 120) * (n <= 20 ? 1.35 - n * 0.0175 : 1)), /* v3.0 초반 둥지 덜 튼튼하게 (빨리 끝나게) */ interval: Math.max(n > 100 ? 1.44 : 1.38, (n > 3 ? 2.75 : 3.0) - n * 0.017), boss: k === CHL - 1, bossKey: k === CHL - 1 ? BOSSES[ch] : null,
    mid: k === 4, midKey: k === 4 ? MIDS[ch] : null, world: 2500 + Math.min(n, 40) * 22 + (k === 5 || k === 8 ? 300 : 0),
    name: STAGE_NAMES[ch][k], mis: MISSIONS[k], totems: k === 5 ? 2 : k === 8 || k === 9 ? 1 : 0,
    night: k === 3 || k === 8, dusk: k === 6 || k === 7, weather: k === 7 ? 'storm' : k === 2 && (ch === 1 || ch === 5 || ch === 8) ? 'rain' : null,
    lanes: false, /* v3.0 일반 판에서는 두 갈래 길 없음 (주간 도전 「두 갈래 길」에만) */ dark: k === 5 && n >= 16, /* v2.8 장마다 6번째 판 = 밤 손전등 */ /* v2.7 두 갈래 길: 장마다 3·8번째 판 */ coinM: k === 1 ? 1.6 : k === 3 ? 1.3 : k === 6 ? 1.4 : 1, xpM: k === 2 ? 1.3 : 1, swarm: k === 2 ? 1.6 : 1, atkM: k === 3 ? 1.15 : 1, spdM: k === 7 ? 1.15 : 1, raid: k === 6 };
}
const RAR = ['일반', '고급', '희귀', '전설', '신화'];
const RARC = ['#cfd8dc', '#66bb6a', '#42a5f5', '#ffb300', '#ff4fd8'];
const RART = ['#8d8d8d', '#2e9b44', '#1e7fd6', '#e08a00', '#c2189e'];
const SLOTN = { weapon: '무기', armor: '갑옷', charm: '장신구' };
const KINDS = { weapon: ['sword', 'axe', 'spear', 'hammer', 'great', 'katana', 'claw'], armor: ['vest', 'plate', 'robe', 'scale'], charm: ['necklace', 'ring', 'talisman', 'bell', 'badge'] };
const KINDN = { katana: '도', claw: '발톱 단검', scale: '비늘 갑옷', bell: '방울', badge: '훈장', sword: '한손검', axe: '도끼', spear: '창', hammer: '망치', great: '대검', vest: '조끼', plate: '판금', robe: '로브', necklace: '목걸이', ring: '반지', talisman: '부적' };
const EQN = {
  sword: ['나무 뼈칼', '강철 뼈칼', '달빛 검', '태양 검', '별뼈 성검'], axe: ['장작 도끼', '강철 도끼', '서리 도끼', '화염 전투도끼', '은하 파괴도끼'],
  spear: ['대나무 창', '강철 창', '바람의 창', '번개 창', '유성 창'], hammer: ['나무 망치', '쇠 망치', '바위 해머', '천둥 해머', '별의 망치'],
  great: ['낡은 대검', '기사 대검', '수호 대검', '용사의 대검', '황금뼈 대검'],
  katana: ['연습용 목도', '진돗개 도', '벚꽃 도', '달그림자 도', '별하늘 명도'], claw: ['고양이 장난감 발톱', '강철 발톱', '바람 발톱', '번개 발톱', '은하 발톱'],
  scale: ['물고기 비늘 조끼', '용비늘 조끼', '심해 비늘 갑옷', '황금 용린갑', '별빛 용린갑'],
  bell: ['나무 방울', '구리 방울', '은방울', '황금 방울', '별뼈 방울'], badge: ['종이 훈장', '동 훈장', '은 훈장', '금 훈장', '별빛 기사 훈장'],
  vest: ['가죽 조끼', '누빈 조끼', '숲지기 조끼', '영웅의 조끼', '별빛 조끼'], plate: ['녹슨 판금', '철갑 판금', '수호 판금', '황금 판금', '은하 수호갑'], robe: ['천 로브', '마법 로브', '달빛 로브', '불사조 로브', '별의 로브'],
  necklace: ['방울 목걸이', '별 목걸이', '수정 목걸이', '황금 이름표', '별뼈 메달'], ring: ['구리 반지', '은 반지', '사파이어 반지', '황금 반지', '별뼈 반지'], talisman: ['종이 부적', '행운 부적', '수호 부적', '용의 부적', '별의 부적'],
};
const WSTAT = { katana: { k: 1.05, rate: 0.46, range: 60, crit: 8, d: '빠른 베기 · 치명타 +8%' }, claw: { k: 0.72, rate: 0.3, range: 46, d: '아주 빠른 연속 할퀴기' }, sword: { k: 1, rate: 0.55, range: 58, d: '균형 · 빠른 연속 베기' }, axe: { k: 1.2, rate: 0.62, range: 56, cleave: 2, d: '두 마리까지 함께 벰' }, spear: { k: 0.95, rate: 0.58, range: 86, pierce: 3, d: '긴 사거리 · 꿰뚫기' }, hammer: { k: 1.5, rate: 0.82, range: 54, stun: true, d: '강타 · 넉백과 기절' }, great: { k: 1.32, rate: 0.68, range: 66, cleave: 3, d: '넓게 휘두르기' } };
const AFFIX = [
  { k: 'crit', n: '치명타 확률', u: '%', v: r => 3 + r * 2 }, { k: 'steal', n: '흡혈', u: '%', v: r => 2 + r }, { k: 'aspd', n: '공격 속도', u: '%', v: r => 4 + r * 2 },
  { k: 'gold', n: '코인 획득', u: '%', v: r => 5 + r * 3 }, { k: 'speed', n: '이동 속도', u: '%', v: r => 4 + r * 2 }, { k: 'ally', n: '동료 공격력', u: '%', v: r => 3 + r * 2 },
  { k: 'xp', n: '경험치', u: '%', v: r => 5 + r * 3 }, { k: 'regen', n: '체력 재생', u: '/초', v: r => 2 + r * 2 }, { k: 'def', n: '받는 피해 감소', u: '%', v: r => 3 + r }, { k: 'cdr', n: '스킬 재사용', u: '%', v: r => 4 + r * 2 }, { k: 'mana', n: '마나 회복', u: '/초', v: r => 0.3 + r * 0.2 },
];
const PREFIX = { crit: '날카로운', steal: '흡혈의', aspd: '질풍의', gold: '황금빛', speed: '날쌘', ally: '지휘관의', xp: '현자의', regen: '재생의', def: '단단한', cdr: '마력의', mana: '샘물의' };
/* v4.5 장비 상자 확률 (게임산업법 확률형 아이템 정보 공개: 백분율 · 소수점 둘째 자리) — 신화(✦ 상점 전용)는 상자에서만, 전투·보상에서는 전설까지만 */
const BOX_RATES = { box1: [[0, 40], [1, 30], [2, 20], [3, 8], [4, 2]], box2: [[2, 70], [3, 25], [4, 5]] };
function rollBox(id) { const T = BOX_RATES[id]; let x = Math.random() * 100; for (const [r, p] of T) { if (x < p) return r; x -= p; } return T[T.length - 1][0]; }
function makeItem(stage, minR, box) {
  const x = Math.random(), rw = box === 'reward'; if (rw) box = null; let r; if (box) r = rollBox(box); else { r = x < 0.0001 ? 3 : x < 0.01 ? 2 : x < 0.1 ? 1 : 0; r = Math.min(3, Math.max(r, Math.min(minR || 0, rw ? 3 : 1))); } /* v4.8 필드: 일반 90% · 고급 9% · 희귀 0.99% · 전설 0.01% · 신화 없음 (보스 상자도 고급까지만 보장) */
  const slot = pick(['weapon', 'armor', 'charm']), kind = pick(KINDS[slot]), k = 1 + r * 0.6 + (r === 4 ? 0.4 : 0);
  let val;
  if (slot === 'weapon') val = Math.round((3 + stage * 1.1) * k * WSTAT[kind].k);
  else if (slot === 'armor') val = Math.round((20 + stage * 8) * k * (kind === 'plate' ? 1.3 : kind === 'robe' ? 0.8 : kind === 'scale' ? 1.1 : 1));
  else val = kind === 'necklace' ? Math.round((0.6 + stage * 0.09) * k * 10) / 10 : kind === 'ring' ? Math.round(3 + r * 2 + stage * 0.06) : kind === 'bell' ? Math.round((0.8 + stage * 0.08) * k * 10) / 10 : kind === 'badge' ? Math.round(6 + r * 4 + stage * 0.1) : Math.round(4 + r * 3 + stage * 0.08);
  const aff = []; const pool = AFFIX.slice().sort(() => Math.random() - 0.5);
  for (let i = 0; i < Math.max(0, r - 1); i++) aff.push({ k: pool[i].k, v: pool[i].v(r) });
  if (r === 4 && box) { val = typeof val === 'number' && val >= 20 ? Math.round(val * 1.12) : Math.round(val * 1.12 * 10) / 10; } /* 상점 전용 신화: 능력 +12% */
  return { id: S.uid++, slot, kind, r, ex: r === 4 && box ? 1 : 0, name: (r === 4 && box ? '✦ ' : '') + (aff.length ? PREFIX[aff[0].k] + ' ' : '') + EQN[kind][r], val, st: stage, aff };
}
function fixItem(it) { if (!it) return it; if (!it.kind) it.kind = KINDS[it.slot][0]; if (!it.aff) it.aff = []; if (!EQN[it.kind][it.r]) it.r = Math.min(it.r, 4); it.name = (it.ex ? '✦ ' : '') + (it.aff.length && PREFIX[it.aff[0].k] ? PREFIX[it.aff[0].k] + ' ' : '') + EQN[it.kind][it.r] + (it.up ? ' +' + it.up : ''); return it; }
// v1.3 장비 강화 (+1~+10, 실패 없음, +5·+10에 추가 능력)
function enhCost(it) { return Math.round((vilOn(6) ? 1 - vilV(6) / 100 : 1) * (50 + (it.st || 1) * 5) * (1 + it.r * 0.6) * Math.pow((it.up || 0) + 1, 1.35)); }
function enhVal(it, up) { const b = it.base != null ? it.base : it.val, v = b * (1 + 0.1 * up); return b < 20 ? Math.round(v * 10) / 10 : Math.round(v); }
function enhance(it) {
  if (!it || (it.up || 0) >= 10) return false; const c = enhCost(it); if (S.coins < c) return false;
  if (it.base == null) it.base = it.val; S.coins -= c; it.up = (it.up || 0) + 1; it.val = enhVal(it, it.up);
  if (it.up === 5 || it.up === 10) { const have = (it.aff || []).map(a => a.k), cand = AFFIX.filter(a => !have.includes(a.k)); if (cand.length) { const d = pick(cand); it.aff.push({ k: d.k, v: d.v(Math.max(2, it.r)) }); } }
  fixItem(it); ART.clearHeroCache(heroType()); save(); SFX.rare(); return true;
}
function itemDesc(it) {
  const k = it.kind;
  if (it.slot === 'weapon') return `공격력 +${it.val} · ${WSTAT[k].d}`;
  if (it.slot === 'armor') return `체력 +${it.val}` + (k === 'plate' ? ' · 이동 -8%' : k === 'robe' ? ' · 마나 회복 +1.5/초' : k === 'scale' ? ' · 받는 피해 -8%' : ' · 이동 +5%');
  return k === 'necklace' ? `마나·뼈다귀 +${it.val}/초` : k === 'ring' ? `치명타 확률 +${it.val}%` : k === 'bell' ? `뼈다귀 생산 +${it.val}/초` : k === 'badge' ? `경험치 +${it.val}%` : `동료 체력·공격 +${it.val}%`;
}
function affText(a) { const d = AFFIX.find(x => x.k === a.k); return d ? `${d.n} +${a.v}${d.u}` : ''; }
function sellPrice(it) { return Math.round((8 + it.st * 2) * (it.r + 1)); }
const LV_MAX = 99; /* v2.8 레벨 상한 */
function xpNeed(lv) { return Math.floor(55 * Math.pow(lv, 1.8)); } /* v2.8 레벨이 천천히 오르게 (예전 30·lv^1.5) */
function heroStats() {
  const e = S.eq;
  let atk = 14 + S.lv * 3 + S.up.atk * 4, hp = 160 + S.lv * 24 + S.up.hp * 35, mpR = 4 + S.up.mana * 0.8, fdR = 8.5 + S.up.food * 1.3;
  const A = { crit: 5, steal: 0, aspd: 0, gold: 0, speed: 0, ally: 0, xp: 0, regen: 0, def: 0, cdr: 0, mana: 0 };
  ['weapon', 'armor', 'charm'].forEach(sl => { const it = e[sl]; if (it) { fixItem(it); (it.aff || []).forEach(a => { A[a.k] = (A[a.k] || 0) + a.v; }); } });
  const wk = e.weapon ? e.weapon.kind : 'sword', WS = WSTAT[wk];
  if (e.weapon) atk += e.weapon.val; if (e.armor) { hp += e.armor.val; if (e.armor.kind === 'plate') A.speed -= 8; else if (e.armor.kind === 'robe') mpR += 1.5; else if (e.armor.kind === 'scale') A.def += 8; else A.speed += 5; }
  if (e.charm) { const c = e.charm; if (c.kind === 'ring') A.crit += c.val; else if (c.kind === 'talisman') A.ally += c.val; else if (c.kind === 'bell') fdR += c.val; else if (c.kind === 'badge') A.xp += c.val; else { mpR += c.val; fdR += c.val; } }
  if (WSTAT[e.weapon ? e.weapon.kind : 'sword'].crit) A.crit += WSTAT[e.weapon.kind].crit; mpR += A.mana;
  return { atk, hp, mpR, fdR, mpMax: 100, fdMax: 100 + S.up.food * 15, wk, range: WS.range, rate: WS.rate / (1 + A.aspd / 100), cleave: WS.cleave || 1, pierce: WS.pierce || 0, stun: !!WS.stun, crit: A.crit, steal: A.steal, gold: A.gold, spd: 128 * (1 + A.speed / 100) /* v2.8 보리 이동 165 → 128 */, ally: A.ally, xp: A.xp, regen: A.regen, def: Math.min(50, A.def), cdr: Math.min(40, A.cdr) };
}
const UPS = [
  { k: 'hp', name: '기사 체력', desc: '기사 체력 +35 · 성 체력 +80', ic: 'heart' },
  { k: 'atk', name: '기사 공격력', desc: '기사 공격력 +4', ic: 'sword' },
  { k: 'food', name: '뼈다귀 창고', desc: '+1.3/초 · 최대 +15', ic: 'bone' },
  { k: 'mana', name: '마나 샘', desc: '마나 회복 +0.8/초', ic: 'mana' },
  { k: 'u0', name: '콩이 훈련', desc: '꼬마 시바 체력·공격력 +15%', unit: 0 },
  { k: 'u1', name: '뭉치 훈련', desc: '불독 방패병 체력·공격력 +15%', unit: 1 },
  { k: 'u2', name: '초코 훈련', desc: '비글 궁수 체력·공격력 +15%', unit: 2 },
  { k: 'u3', name: '설이 훈련', desc: '허스키 마법사 체력·공격력 +15%', unit: 3 },
  { k: 'u4', name: '백구 훈련', desc: '진돗개 무사 체력·공격력 +15%', unit: 4 },
  { k: 'u5', name: '망고 훈련', desc: '코기 포격병 체력·공격력 +15%', unit: 5 },
  { k: 'u6', name: '몽실 훈련', desc: '푸들 치유사 체력·치유량 +15%', unit: 6 },
  { k: 'u7', name: '쭈니 훈련', desc: '닥스훈트 창기병 체력·공격력 +15%', unit: 7 },
  { k: 'u8', name: '태산 훈련', desc: '세인트버나드 체력·공격력 +15%', unit: 8 },
  { k: 'u9', name: '치치 훈련', desc: '치와와 암살자 체력·공격력 +15%', unit: 9 },
];
const UPMAX = 10, HCAP = 20; // 동료 훈련은 Lv10(2차 직업), 기사 능력치는 Lv20까지
const capOf = u => u.unit !== undefined ? UPMAX : HCAP;
function upCost(u) { return Math.round((u.unit !== undefined ? 50 : 60) * Math.pow(1.55, S.up[u.k])); }
const TRAITS = {
  u0: { v: ['멍!', '가자!'], e: ['!', 'huff', 'star'], q: '꼬리를 말아 올리고 앞만 보고 달림', fx: 'wag' },
  u1: { v: ['…멍.', '끄응'], e: ['zz', 'drool', 'heart'], q: '틈만 나면 꾸벅꾸벅, 침도 살짝', fx: 'snore' },
  u2: { v: ['킁킁!', '왈!'], e: ['sniff', '?', 'note'], q: '코를 땅에 대고 킁킁 냄새 추적', fx: 'sniff' },
  u3: { v: ['아우~', '흥!'], e: ['howl', 'note', 'huff'], q: '하늘 보고 아우~ 하울링', fx: 'howl' },
  u4: { v: ['……멍.', '지킨다.'], e: ['dots', 'star', 'heart'], q: '말없이 우뚝, 충성심 만점', fx: 'calm' },
  u5: { v: ['왈왈!', '헥헥!'], e: ['heart', 'note', 'star'], q: '짧은 다리로 엉덩이 실룩실룩', fx: 'wiggle' },
  u6: { v: ['괜찮아~', '뿅!'], e: ['sparkle', 'heart', 'note'], q: '곱슬털을 출렁이며 통통 점프', fx: 'bounce' },
  u7: { v: ['쭈욱~', '멍!'], e: ['!', 'sweat', 'star'], q: '긴 몸으로 바닥에 붙어 쌩쌩', fx: 'stretch' },
  u8: { v: ['허허.', '우웡!'], e: ['heart', 'zz', 'note'], q: '느긋한 큰 형님, 침 한 방울', fx: 'calm' },
  u9: { v: ['왈왈왈!', '끼잉!'], e: ['!', 'sweat', 'huff'], q: '덜덜 떨지만 제일 먼저 돌격', fx: 'shiver' },
};
// v2.2 견종별 귀여움: 좋아하는 간식 · 쓰다듬으면 하는 반응 · 혼자 있을 때 하는 버릇 (TRAITS와 짝)
const BREED = {
  u0: { snack: '고구마 말랭이', pet: '흥! …조금만 더.', pq: '쓰다듬으면 고개를 홱 돌리지만 꼬리는 돌돌 신나게', bark: 'woof', em: 'huff', em2: 'heart' , wear: [{ k: 'ribbon', c: '#e8423a', n: '빨간 리본' }, { k: 'leaf', c: '#e8742a', n: '단풍잎 핀' }] },
  u1: { snack: '소고기 육포', pet: '푸흥… 배도…', pq: '쓰다듬으면 벌러덩 누워 배를 보여 줌', bark: 'big', em: 'zz', em2: 'heart' , wear: [{ k: 'bell', c: '#4f8ef7', n: '파란 방울 목걸이' }, { k: 'starpin', c: '#ffd34d', n: '금별 핀' }] },
  u2: { snack: '사과 조각 (사실 뭐든지)', pet: '킁킁… 간식 냄새!', pq: '손 냄새부터 킁킁 맡고 「아우!」', bark: 'woof', em: 'sniff', em2: 'note' , wear: [{ k: 'leaf', c: '#5cc96b', n: '새싹 잎' }, { k: 'flower', c: '#ffd34d', n: '민들레 꽃' }] },
  u3: { snack: '얼린 연어 큐브', pet: '아우우~ 우우!', pq: '쓰다듬으면 말대꾸하듯 길게 아우~', bark: 'woof', em: 'howl', em2: 'note' , wear: [{ k: 'starpin', c: '#9ad8ff', n: '눈송이 핀' }, { k: 'ribbon', c: '#b8a8ff', n: '보라 리본' }] },
  u4: { snack: '닭가슴살', pet: '……(살랑)', pq: '말없이 머리를 손에 꾹 기대고 꼬리만 살랑', bark: 'woof', em: 'dots', em2: 'heart' , wear: [{ k: 'flower', c: '#ffffff', n: '하얀 꽃' }, { k: 'bell', c: '#e8423a', n: '빨간 방울 목걸이' }] },
  u5: { snack: '당근 스틱', pet: '헥헥! 또또!', pq: '엉덩이가 미친 듯이 실룩실룩', bark: 'yap', em: 'heart', em2: 'heart' , wear: [{ k: 'flower', c: '#ff9a3a', n: '주황 꽃' }, { k: 'ribbon', c: '#ffd34d', n: '노란 리본' }] },
  u6: { snack: '딸기 요거트볼', pet: '뿅! 고마워~', pq: '제자리에서 빙그르르 돌고 반짝', bark: 'yap', em: 'sparkle', em2: 'heart' , wear: [{ k: 'heart', c: '#ff5a8a', n: '하트 핀' }, { k: 'ribbon', c: '#ff9ed8', n: '분홍 리본' }] },
  u7: { snack: '치즈 스틱', pet: '쭈우욱~', pq: '긴 몸으로 데구루루 한 바퀴', bark: 'woof', em: 'yawn', em2: 'star' , wear: [{ k: 'starpin', c: '#ffcf3a', n: '금별 핀' }, { k: 'bell', c: '#5cc96b', n: '초록 방울 목걸이' }] },
  u8: { snack: '따뜻한 우유죽', pet: '허허, 좋구나.', pq: '천천히 기대며 침 한 방울 똑', bark: 'big', em: 'drool', em2: 'heart' , wear: [{ k: 'bell', c: '#ffcf3a', n: '금빛 구조 방울' }, { k: 'leaf', c: '#8ac850', n: '네잎클로버' }] },
  u9: { snack: '블루베리 딱 한 알', pet: '왈!! (덜덜)', pq: '덜덜 떨다가 몸보다 큰 목소리로 왈!!', bark: 'yap', em: 'sweat', em2: '!' , wear: [{ k: 'ribbon', c: '#ff9ed8', n: '큰 분홍 리본' }, { k: 'heart', c: '#ff3b5a', n: '빨간 하트 핀' }] },
};
// 동작 모양: act = yawn/wag/doze/quirk/pet, p = 0~1 진행. 발밑 기준 이동·회전·늘이기
function cuteXf(id, act, p) {
  const s1 = Math.sin(p * Math.PI), X = { dx: 0, dy: 0, rot: 0, sx: 1, sy: 1 };
  if (act === 'yawn') { X.sy = 1 + 0.07 * s1; X.rot = -0.08 * s1; return X; }
  if (act === 'doze') { X.sy = 0.93 + Math.sin(p * 12) * 0.015; X.rot = 0.06; return X; }
  if (act === 'eat') { X.rot = 0.16 + Math.abs(Math.sin(p * Math.PI * 9)) * 0.08; X.dy = 1; return X; }
  if (act === 'wag') { X.dy = -Math.abs(Math.sin(p * Math.PI * 6)) * 4; X.rot = Math.sin(p * Math.PI * 6) * 0.04; return X; }
  const big = act === 'pet';
  switch (id) {
    case 'u0': X.sx = p > 0.15 && p < 0.65 ? -1 : 1; X.dy = -Math.abs(Math.sin(p * 20)) * (big ? 3 : 2); break; // 시바: 새침하게 홱
    case 'u1': if (big) { X.rot = -Math.min(1, s1 * 1.6) * 1.35; X.dy = -s1 * 6; } else { X.sy = 1 - 0.07 * s1; X.sx = 1 + 0.05 * s1; } break; // 불독: 벌러덩
    case 'u2': X.rot = 0.3 * s1; X.dx = Math.sin(p * 40) * 1.5 * s1; if (big && p > 0.6) X.rot = -0.3 * Math.sin((p - 0.6) / 0.4 * Math.PI); break; // 비글: 킁킁
    case 'u3': X.rot = -0.32 * s1; X.dy = -4 * s1; X.sy = 1 + 0.05 * s1; break; // 허스키: 아우~
    case 'u4': X.sy = 1 + 0.07 * s1; X.rot = big ? 0.12 * s1 : 0; break; // 진돗개: 꼿꼿 / 기대기
    case 'u5': X.rot = Math.sin(p * Math.PI * (big ? 14 : 10)) * 0.13 * s1; X.dy = -Math.abs(Math.sin(p * 18)) * 2; break; // 코기: 실룩실룩
    case 'u6': X.sx = Math.cos(p * Math.PI * (big ? 4 : 2)); if (Math.abs(X.sx) < 0.15) X.sx = X.sx < 0 ? -0.15 : 0.15; X.dy = -10 * s1; break; // 푸들: 빙그르르
    case 'u7': if (big) { X.rot = p * Math.PI * 2; X.dy = -12 * s1; } else { X.sx = 1 + 0.28 * s1; X.sy = 1 - 0.14 * s1; } break; // 닥스: 기지개 / 데구루루
    case 'u8': X.rot = Math.sin(p * Math.PI * 3) * 0.07; X.dx = big ? 4 * s1 : 0; break; // 세인트버나드: 느긋
    case 'u9': if (p < 0.6) X.dx = Math.sin(p * 90) * 2; else { const q = (p - 0.6) / 0.4; X.dy = -14 * Math.sin(q * Math.PI); X.sx = X.sy = 1 + 0.15 * Math.sin(q * Math.PI); } break; // 치와와: 덜덜 → 왈!!
  }
  return X;
}
// 화면 밖(지도·편성·도감)에서 쓰는 대기 동작 상태: 하품 · 꼬리 · 졸기 · 견종 버릇 · 쓰다듬기
const CUTE = {};
function cuteTick(key, id) {
  const dt = G.dt || 0.016; let c = CUTE[key]; if (!c) c = CUTE[key] = { act: null, t: 0, T: 1, wait: 1 + Math.random() * 5, em: null };
  if (c.em) { c.em.t -= dt; if (c.em.t <= 0) c.em = null; }
  if (c.act) { c.t += dt; if (c.t >= c.T) { c.act = null; c.wait = 3 + Math.random() * 6; } }
  else if ((c.wait -= dt) <= 0) { const a = pick(['yawn', 'wag', 'doze', 'quirk', 'quirk']), b = BREED[id] || {}; c.act = a; c.t = 0; c.T = a === 'doze' ? 3 : a === 'quirk' ? 1.6 : 1.4; c.em = { k: a === 'yawn' ? 'yawn' : a === 'doze' ? 'zz' : a === 'wag' ? 'heart' : (b.em || 'note'), t: c.T, T: c.T }; }
  return c;
}
function petLeft() { const today = todayKey(), got = S.petDay && S.petDay.d === today ? Object.keys(S.petDay.got).length : 0; return UNITS.filter((u, i) => unitUnlocked(i)).length - got; }
function floatCrumb(x, y) { if (!PCRUMB) PCRUMB = []; PCRUMB.push({ x, y, vx: rnd(-30, 30), vy: rnd(-60, -20), t: 0.6 }); }
let PCRUMB = null;
function drawCrumbs() { if (!PCRUMB) return; const dt = G.dt || 0.016; for (const c of PCRUMB) { c.t -= dt; c.x += c.vx * dt; c.y += c.vy * dt; c.vy += 300 * dt; ctx.fillStyle = '#e8a860'; ART.E(ctx, c.x, c.y, 2, 2); ctx.fill(); } PCRUMB = PCRUMB.filter(c => c.t > 0); }
function cutePet(key, id, x, y) {
  const c = CUTE[key] || cuteTick(key, id), b = BREED[id] || {}; c.act = 'pet'; c.t = 0; c.T = 1.8; c.em = { k: b.em2 || 'heart', t: 1.8, T: 1.8 }; c.wait = 4;
  SFX.pet && SFX.pet(b.bark); S.petN = (S.petN || 0) + 1;
  const today = todayKey(); if (!S.petDay || S.petDay.d !== today) S.petDay = { d: today, got: {} };
  let rew = ''; if (!S.petDay.got[id]) { S.petDay.got[id] = 1; S.coins += 100; rew = ' +100'; SFX.coin(); }
  floatMsg = { s: (b.pet || '멍!') + (rew ? '  (오늘 첫 쓰다듬기' + rew + ' 코인)' : ''), x, y, t: 1.8 }; save();
}
let floatMsg = null;
// v2.3 옷장: 첫 옷 = 그 강아지에게 간식 3번, 두 번째 옷 = 주간 도전 2번 깨기
const weeklyClears = () => Object.keys(S.stickers || {}).filter(k => k[0] === 'w').length;
function wearOpen(id, n) { if (S.wearBuy && S.wearBuy[id + '_' + n]) return true; return n === 0 ? ((S.snackN || {})[id] || 0) >= 3 : weeklyClears() >= 2; }
function wearLock(id, n) { return n === 0 ? `간식 ${Math.min(3, (S.snackN || {})[id] || 0)}/3번` : `주간 도전 ${Math.min(2, weeklyClears())}/2번`; }
// v2.3 간식 주기: 하루 한 번(전체) → 먹는 동작 + 그날 첫 전투에서 그 기사 체력·공격 +15%
function feedSnack(i) {
  const d = UNITS[i], b = BREED[d.id], today = todayKey();
  if (S.snackDay && S.snackDay.d === today) { formMsg = { s: `오늘 간식은 ${UNITS.find(u => u.id === S.snackDay.id).nick}에게 줬어요 · 내일 또!`, t: 1.8 }; SFX.click(); return; }
  S.snackDay = { d: today, id: d.id, used: 0 }; S.snackN = S.snackN || {}; S.snackN[d.id] = (S.snackN[d.id] || 0) + 1;
  const c = CUTE['fp' + i] || cuteTick('fp' + i, d.id); c.act = 'eat'; c.t = 0; c.T = 2.4; c.em = { k: 'heart', t: 2.4, T: 2.4 }; c.wait = 4; SFX.pet && SFX.pet(b.bark);
  const open = S.snackN[d.id] === 3 ? `  · 새 옷 「${b.wear[0].n}」 열림!` : '';
  formMsg = { s: `${d.nick}가 ${b.snack}을(를) 냠냠! 오늘 첫 전투에서 ${d.nick} 힘 +15%${open}`, t: 2.6 }; save();
}
function drawFloatMsg(late) { if (!floatMsg) return; if (late) { if (floatMsg._tm === G.time) return; } else if (floatMsg._tm === G.time) return; floatMsg._tm = G.time; /* v3.8 창(팝업) 위에도 보이게: 창 다음에 한 번 더 부르되 한 프레임에 한 번만 */ const f = floatMsg; f.t -= G.dt || 0.016; if (f.t <= 0) { floatMsg = null; return; } ctx.save(); ctx.globalAlpha = Math.min(1, f.t * 3); drawBubbleAt(f.x, f.y - (1.8 - f.t) * 12, f.s); ctx.restore(); }
function drawBubbleAt(x, y, s) { ctx.font = `bold 14px ${FONT}`; const w = ctx.measureText(s).width + 24, h = 30, bx = clamp(x - w / 2, 8, W - w - 8); RR(bx, y - h, w, h, 13); ctx.fillStyle = '#fffdf6'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#4a2a14'; ctx.stroke(); txt(s, bx + w / 2, y - h / 2, 14, '#4a2a14', 'center', false); }
// 발밑(x,y) 기준으로 귀여운 동작을 입혀 그리기. fit=[w,h]이면 drawFit(가운데 기준)
function drawCuteDog(key, id, spr, x, y, sc, opt) {
  opt = opt || {}; const c = cuteTick(key, id), X = c.act ? cuteXf(id, c.act, c.t / c.T) : { dx: 0, dy: 0, rot: 0, sx: 1, sy: 1 }, lean = opt.lean || 0;
  const fr = c.act === 'doze' ? 'i0' : 'i' + (Math.floor(G.time * 2.4 + (opt.ph || 0)) % 3);
  ctx.save(); ctx.translate(x + X.dx + lean, y + X.dy); ctx.rotate(X.rot + lean * 0.012); ctx.scale(X.sx, X.sy);
  if (opt.fit) ART.drawFit(ctx, spr, fr, 0, -opt.fit[1] / 2, opt.fit[0], opt.fit[1]); else ART.draw(ctx, spr, fr, 0, 0, sc, !!opt.flip, 0);
  ctx.restore();
  if (c.em && opt.em !== false) drawEmote(c.em, x + (opt.emx || 8), y - (opt.emy || 70 * sc) - 10);
  return c;
}
function unitUnlocked(i) { return S.cleared + 1 >= UNITS[i].unlock; }
function deck() { if (TRIAL != null) return [TRIAL]; const d = (S.deck || []).filter(i => UNITS[i] && unitUnlocked(i)); return d.length ? d.slice(0, 5) : [0, 1]; }
const GROW_N = ['아기 용', '소년 용', '어른 용'];
function dragonStage() { return S.cleared >= 90 ? 2 : S.cleared >= 40 ? 1 : 0; }
const heroType = () => ART.heroId(S.eq, Object.assign({}, S.custom || {}, { grow: dragonStage() }));
const heroFace = () => ART.heroId(S.eq, Object.assign({}, S.custom || {}, { mount: false }));
const mounted = () => !S.custom || S.custom.mount !== false;
const mountK = () => [0.84, 0.74, 0.66][dragonStage()];
const heroScale = () => mounted() ? mountK() : 1.08;
function heroName() { return (S.custom && S.custom.name) || '보리'; }
function hasBatchim(w) { const c = w.charCodeAt(w.length - 1); return c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 !== 0; }
function nameSub(t) {
  const n = heroName(); if (!t || n === '보리') return t;
  const bat = hasBatchim(n), M = bat ? { 야: '아', 가: '이', 는: '은', 를: '을', 와: '과', 랑: '이랑', 여: '이여' } : {};
  return t.replace(/보리(야|가|는|를|와|랑|여)?/g, (m, p) => n + (p ? (M[p] || p) : ''));
}
/* ---------------- 그림 팩 (선택: www/art/ 의 그림 파일이 있으면 코드 그림 대신 사용) ---------------- */
const AP = {};
function apLoad(key, src, cb) { try { const im = new Image(); im.onload = () => { AP[key] = im; if (cb) cb(im); }; im.onerror = () => {}; im.src = src; } catch (e) {} }
if (window.ARTPACK) {
  const P = window.ARTPACK;
  if (P.title) apLoad('title', P.title);
  for (const k in (P.bg || {})) apLoad('bg' + k, P.bg[k], im => ART.setBgImage(+k, im));
  for (const k in (P.portrait || {})) apLoad('pt_' + k, P.portrait[k]);
  for (const k in (P.sprite || {})) apLoad('sp_' + k, P.sprite[k], im => ART.setSpriteImage(k, im));
}
const LINES = { start: ['가자, 멍!', '멍멍성은 내가 지킨다!', '뼈다귀를 걸고 승리!'], lvl: ['힘이 솟는다 멍!', '더 강해졌어!'], boss: ['물러서지 않아!', '다 같이 막자!'], respawn: ['다시 간다 멍!'], bark: ['모두 힘내!'] };

/* ---------------- 입력 ---------------- */
const inp = { left: false, right: false };
let ui = [], sceneTap = null, dragH = null;
const holds = new Map(), pressT = {};
function toLogical(e) { const r = cvs.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * VW - OX, y: (e.clientY - r.top) / r.height * H }; }
function hitUI(p) { for (let i = ui.length - 1; i >= 0; i--) { const b = ui[i]; if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) return b; } return null; }
const keyHeld = { left: false, right: false };
function refreshHolds() { inp.left = keyHeld.left; inp.right = keyHeld.right; holds.forEach(k => { inp[k] = true; }); }
let fsTried = false;
function tryFullscreen() {
  if (fsTried) return; fsTried = true;
  try {
    const coarse = window.matchMedia && window.matchMedia('(pointer:coarse)').matches, el = document.documentElement;
    if (!coarse || document.fullscreenElement || !el.requestFullscreen) return;
    el.requestFullscreen().then(() => { try { screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {}); } catch (e) {} }).catch(() => {});
  } catch (e) {}
}
function audioStart() { const was = AUD.ready; AUD.init(); applyAudioPrefs(); if (!was && AUD.ready) musicFor(); }
cvs.addEventListener('pointerdown', e => {
  { const ne = document.getElementById('mmkName'); if (ne) ne.blur(); }
  e.preventDefault(); audioStart(); tryFullscreen();
  try { window.focus(); cvs.focus({ preventScroll: true }); } catch (er) {}
  if (trans) return;
  const p = toLogical(e), b = hitUI(p);
  if (b) {
    if (b.hold) { holds.set(e.pointerId, b.hold); refreshHolds(); }
    else if (b.tap && !b.disabled) { pressT[b.key || (b.x + ',' + b.y)] = 0.14; SFX.click(); b.tap(p); }
    return;
  }
  if (dragH) { dragH.down(p, e.pointerId); return; }
  if (sceneTap) sceneTap(p);
});
cvs.addEventListener('pointermove', e => { if (dragH && dragH.id === e.pointerId) dragH.move(toLogical(e)); if (!holds.has(e.pointerId)) return; const b = hitUI(toLogical(e)); if (b && b.hold && b.hold !== holds.get(e.pointerId)) { holds.set(e.pointerId, b.hold); refreshHolds(); } });
const endPtr = e => { if (dragH && dragH.id === e.pointerId) dragH.up(toLogical(e), e.type === 'pointerup'); if (holds.delete(e.pointerId)) refreshHolds(); };
cvs.addEventListener('wheel', e => { if (scene === 'map' && mapTab === 0 && !popup) { mapTX = clampMap(mapTX + (e.deltaY || e.deltaX)); e.preventDefault(); } }, { passive: false });
['pointerup', 'pointercancel', 'pointerleave'].forEach(n => cvs.addEventListener(n, endPtr));
cvs.addEventListener('contextmenu', e => e.preventDefault());
window.addEventListener('blur', () => { holds.clear(); keyHeld.left = keyHeld.right = false; refreshHolds(); if (scene === 'battle' && B && !B.over) B.paused = true; });
document.addEventListener('visibilitychange', () => { if (document.hidden && scene === 'battle' && B && !B.over) B.paused = true; });
// v0.9: PC 방향키 — 웹 액자(iframe) 안에서도 클릭 후 키 입력이 들어오도록 캔버스에 포커스, 한글 입력기 상태에서도 동작하도록 e.code 사용
cvs.tabIndex = 0; cvs.style.outline = 'none';
function keyDir(e) { const c = e.code || '', k = (e.key || '').toLowerCase(); if (c === 'ArrowLeft' || c === 'KeyA' || k === 'arrowleft' || k === 'a' || k === 'ㅁ') return 'left'; if (c === 'ArrowRight' || c === 'KeyD' || k === 'arrowright' || k === 'd' || k === 'ㅇ') return 'right'; return null; }
const KEYMAP = { Digit1: '1', Digit2: '2', Digit3: '3', Digit4: '4', Digit5: '5', KeyQ: 'q', KeyW: 'w', KeyE: 'e', KeyF: 'f', KeyR: 'r', KeyP: 'p', Escape: 'escape', Space: ' ' };
window.addEventListener('keydown', e => {
  if (e.target && e.target.id === 'mmkName') return;
  audioStart();
  const dir = keyDir(e);
  if (dir) { keyHeld[dir] = true; refreshHolds(); e.preventDefault(); }
  if (e.code === 'ArrowUp' || e.code === 'ArrowDown' || e.code === 'Space') e.preventDefault();
  const k = KEYMAP[e.code] || (e.key || '').toLowerCase();
  if (e.repeat) return;
  if (scene === 'battle' && B && !B.over) {
    if (k >= '1' && k <= '5') { const dk = deck(); if (dk[+k - 1] != null) tapCard(dk[+k - 1]); }
    if (k === 'q') useSkill(0); if (k === 'w') useSkill(1); if (k === 'e') useSkill(2); if (k === 'f' || k === ' ') useSkill(3); if (k === 'r') usePotion();
    if (k === 'p' || k === 'escape') B.paused = !B.paused;
  } else if (scene === 'map' && mapTab === 0 && !popup && (e.code === 'ArrowLeft' || e.code === 'ArrowRight')) { mapTX = clampMap(mapTX + (e.code === 'ArrowLeft' ? -260 : 260)); }
});
window.addEventListener('keyup', e => { const dir = keyDir(e); if (dir) { keyHeld[dir] = false; refreshHolds(); } });

/* ---------------- 장면 전환 ---------------- */
let codexSel = null, codexCat = 0, codexPage = 0;
let scene = 'title', B = null, mapTab = 0, mapSel = null, resetArm = 0, popup = 0, titleReady = false;
const G = { time: 0 };
let trans = null;
function go(fn) { if (trans) return; trans = { t: 0, dur: 0.5, fn, done: false }; }
// v1.2: 20장 모두 고유 전투곡 + 시즌별 보스곡
// v2.6 일반 판은 장 노래와 신나는 곡 8곡을 번갈아 (짝수 판 = 신나는 곡)
const FUN_SONGS = ['fiesta', 'picnic', 'pupparade', 'jumpjam', 'sunnyrun', 'tailwag', 'bonebeat', 'starhop'], STORY_SONGS = ['storywarm', 'storyhope', 'storyfun', 'mapp'];
function battleSong() { const n = B.n || 1; if (B.tower != null) return FUN_SONGS[(B.tower + 3) % 8]; if (B.weekly) return FUN_SONGS[weekNo() % 8]; if (!B.si.boss && n % 2 === 0) return FUN_SONGS[Math.floor(n / 2) % 8]; return BGM_CH[B.si.ch] || 'battlem'; }
const BGM_CH = { 38: 'fiesta2', 39: 'toyparade', 36: 'oldcatrep', 37: 'lastgate', 34: 'icehaven', 35: 'whalesong', 32: 'windhome', 33: 'stormcrown', 30: 'clocklull', 31: 'firstdawn', 28: 'starbazaar', 29: 'sandpalace', 26: 'quietpeak', 27: 'echocave', 24: 'rainbowsong', 25: 'graytown', 20: 'catcity', 21: 'feathers', 22: 'burrowsong', 23: 'namesea', 0: 'meadow', 1: 'forest', 2: 'arabian', 3: 'snow', 4: 'volcano', 5: 'hawaiian', 6: 'sky', 7: 'crystal', 8: 'swamp', 9: 'castle', 10: 'orchestra', 11: 'aurora', 12: 'cave', 13: 'fossil', 14: 'musicbox', 15: 'orchestra', 16: 'dream', 17: 'crystal', 18: 'starlight', 19: 'finale' };
const BOSS_BGM = ch => 'boss_c' + ch; /* v2.7 보스마다 다른 곡 */
function musicFor() {
  if (!AUD.ready) return;
  if (scene === 'title' || scene === 'create') AUD.play('puppy');
  else if (scene === 'map') { const hr = new Date().getHours(); AUD.play(hr >= 19 || hr < 6 ? 'mapnight' : S.cleared >= 100 ? 'mapday' : 'mapp'); } /* v2.7 지도 낮/밤 곡 */
  else if (scene === 'battle' && B && !B.over) AUD.play(B.bossDone && B.enemies.some(e => e.def.boss) ? BOSS_BGM(B.si.ch) : battleSong());
  else if (scene === 'story' && ST) AUD.play(ST.sc.boss ? 'bossm' : ST.sc.ending ? 'puppy' : STORY_SONGS[[...String(ST.key || "")].reduce((a, c) => a + c.charCodeAt(0), 0) % STORY_SONGS.length]);
}
function setScene(s) { scene = s; if (s === 'map') mapX = null; holds.clear(); refreshHolds(); musicFor(); }

/* ---------------- 스토리 컷신 ---------------- */
let ST = null;
const TYPE_SPD = 34;
function hasStory(k) { return !!(window.STORY && STORY.SCENES[k] && !(S.seen && S.seen[k])); }
function enterStage(n, direct) { const f = () => { if (hasStory('pre' + n)) playStory('pre' + n, () => startBattle(n)); else startBattle(n); }; if (direct) f(); else go(f); }
function afterResult(fn) { const k = 'post' + B.n; if (B.over && B.over.win && !B.special && hasStory(k)) go(() => playStory(k, fn)); else go(fn); }
function replayStory(key) { playStory(key, () => { setScene('map'); mapTab = 4; codexCat = 8; }); if (ST) ST.replay = true; }
function playStory(key, then) {
  const sc0 = STORY.SCENES[key]; if (!sc0) { if (then) then(); return; }
  const sc = Object.assign({}, sc0, { title: nameSub(sc0.title), lines: sc0.lines.map(l => [l[0], l[1], nameSub(l[2])]) });
  const n = Math.max(1, +key.replace(/\D/g, '') || 1);
  ST = { key, sc, i: 0, t: 0, then, ti: stageInfo(Math.min(MAXST, n)).ti, left: null, right: null, titleT: sc.title ? 2.6 : 0, done: false };
  storyEnter(); setScene('story');
}
function storyLine() { return ST.sc.lines[ST.i]; }
function storyEnter() {
  const who = storyLine()[0], sp = STORY.SPEAKERS[who];
  if (sp) { if (sp.side === 'L') ST.left = who; else ST.right = who; }
  ST.t = 0; ST.autoT = 0;
  if (sp && sp.side === 'L' && Math.random() < 0.35) SFX.woof();
}
function storyNext() {
  if (!ST || trans || ST.done) return;
  if (ST.titleT > 0) { ST.titleT = 0; return; }
  if (ST.t * TYPE_SPD < [...storyLine()[2]].length) { ST.t = 999; return; }
  ST.i++;
  if (ST.i >= ST.sc.lines.length) { ST.i--; return storyEnd(); }
  storyEnter();
}
function storyEnd() {
  if (!ST || ST.done) return; ST.done = true;
  S.seen[ST.key] = true; save();
  const f = ST.then;
  go(() => { ST = null; if (f) f(); else setScene('map'); });
}
function wrapLines(s, maxW, size) {
  ctx.font = `bold ${size}px ${FONT}`; const out = []; let line = '';
  for (const ch of s) {
    if (line && ctx.measureText(line + ch).width > maxW) { const sp = line.lastIndexOf(' '); if (sp > 8) { out.push(line.slice(0, sp)); line = line.slice(sp + 1) + ch; } else { out.push(line); line = ch; } }
    else line += ch;
  }
  if (line) out.push(line); return out;
}
function storyPortrait(who, x, active, flip) {
  const sp = STORY.SPEAKERS[who]; if (!sp) return;
  const L = storyLine(), expr = L[0] === who ? L[1] : null;
  const type = sp.type === 'hero' ? heroFace() : sp.type, villain = sp.side === 'R' && !sp.friendly;
  let key = 'i' + (Math.floor(G.time * 2.4) % 3);
  if (expr) key = villain ? (expr === 'happy' || expr === 'sad' ? 'c_' + expr : expr === 'angry' ? 'a1' : 'i0') : 'e_' + expr;
  const sc = { troll: 0.95, scorp: 1.35, frost: 1.0, nox: 1.25, noxgood: 1.5, bat: 2.4, kkuruk: 1.15, kraken: 1.3, owl: 1.4, void: 1.45, cgolem: 1.05, sbori: 1.65, whale: 0.75, fenrir: 0.95, mole: 0.95, bonedra: 0.85, cogowl: 0.95, tcat: 0.9, jelly: 0.95, dmir: 0.62, spiderq: 0.8, shadowk: 0.9, catgen: 0.85, roc: 0.8, badger: 0.85, seaspirit: 0.8, rainturtle: 0.8, shadowchild: 0.85, mtgiant: 0.8, echofairy: 0.85, camelbot: 0.8, starfox: 0.85, mossbear: 0.8, dawndeer: 0.7, thunderbird: 0.8, windelder: 0.75, icepenguin: 0.8, songwhale: 0.7, bellknight: 0.8, badukshadow: 0.8, drumgiant: 0.72, toyking: 0.8, mir: 1.45 }[sp.type] || 2.7;
  const typing = active && ST.t * TYPE_SPD < [...L[2]].length;
  const bob = typing ? -Math.abs(Math.sin(ST.t * 10)) * 5 : 0, y0 = sp.type === 'bat' ? 520 : sp.type === 'void' ? 470 : 386;
  // v2.6 등장 미끄러짐 · 말하는 쪽 조명 · 숨쉬기 · 말 안 하는 쪽은 어둡게
  ST.enter = ST.enter || {}; if (ST.enter[who] == null) ST.enter[who] = G.time; const ein = Math.max(0, 1 - (G.time - ST.enter[who]) / 0.4), slide = ein * ein * 140 * (flip ? 1 : -1);
  const col = villain ? '#ff7a8a' : sp.side === 'L' ? '#ffd27a' : '#9ad8ff', breathe = 1 + Math.sin(G.time * 2.2 + x) * 0.012, kk = (active ? 1.12 : 1.02) * breathe;
  if (active) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.55 + Math.sin(G.time * 3) * 0.08; ctx.drawImage(ART.softDot(col), x + slide - 170, 120, 340, 300); ctx.restore();
    ctx.save(); ctx.globalAlpha = 0.18; const sg = ctx.createLinearGradient(x, -20, x, 390); sg.addColorStop(0, '#fff8e0'); sg.addColorStop(1, 'rgba(255,248,224,0)'); ctx.fillStyle = sg; ctx.beginPath(); ctx.moveTo(x + slide - 40, -20); ctx.lineTo(x + slide + 40, -20); ctx.lineTo(x + slide + 150, 392); ctx.lineTo(x + slide - 150, 392); ctx.closePath(); ctx.fill(); ctx.restore(); }
  ctx.save(); ctx.globalAlpha = (1 - ein) * (active ? 1 : 0.92); if (!active) ctx.filter = 'brightness(0.55) saturate(0.7)';
  ctx.fillStyle = 'rgba(20,8,0,.35)'; ART.E(ctx, x + slide, 390, 80 * kk, 13); ctx.fill();
  ctx.translate(x + slide, y0 + bob); ctx.scale(kk, kk); ctx.translate(-(x + slide), -(y0 + bob));
  const pim = AP['pt_' + who];
  if (pim) { const ph = 330, pw = ph * pim.naturalWidth / pim.naturalHeight; ctx.save(); ctx.translate(x + slide, 0); if (flip) ctx.scale(-1, 1); ctx.drawImage(pim, -pw / 2, 392 - ph + bob, pw, ph); ctx.restore(); }
  else ART.draw(ctx, type, key, x + slide, y0 + bob, sc, flip, 0);
  ctx.restore(); ctx.filter = 'none';
  if (active && expr) storyEmote(expr, x + slide + (flip ? -70 : 70), 150, villain);
}
// v2.6 표정 효과 (웃음 = 반짝·하트, 슬픔 = 눈물방울, 화남 = 화남 표시, 놀람 = 느낌표)
function storyEmote(expr, x, y, vil) {
  const t = ST.t, a = Math.min(1, t * 4);
  ctx.save(); ctx.globalAlpha = a;
  if (expr === 'happy') { for (let k = 0; k < 3; k++) { const q = (t * 0.8 + k / 3) % 1; ctx.globalAlpha = a * (1 - q); ART.star(ctx, x + Math.sin(k * 2 + t * 3) * 22, y + 40 - q * 60, 7 + k * 2, ['#ffe27a', '#ff9ec8', '#fff'][k]); } }
  else if (expr === 'sad') { for (let k = 0; k < 2; k++) { const q = (t * 0.9 + k * 0.5) % 1; ctx.globalAlpha = a * (1 - q); ctx.fillStyle = '#8ac8ff'; ctx.beginPath(); const dx = x + (k ? 14 : -10), dy = y + 40 + q * 50; ctx.moveTo(dx, dy - 8); ctx.quadraticCurveTo(dx + 6, dy, dx, dy + 5); ctx.quadraticCurveTo(dx - 6, dy, dx, dy - 8); ctx.fill(); } }
  else if (expr === 'angry') { const s2 = 1 + Math.abs(Math.sin(t * 8)) * 0.18; ctx.translate(x, y + 20); ctx.scale(s2, s2); ctx.strokeStyle = vil ? '#ff3b3b' : '#ff6a3a'; ctx.lineWidth = 4; ctx.lineCap = 'round'; for (let k = 0; k < 4; k++) { ctx.save(); ctx.rotate(k * Math.PI / 2); ctx.beginPath(); ctx.moveTo(4, -12); ctx.quadraticCurveTo(4, -4, 12, -4); ctx.stroke(); ctx.restore(); } }
  else if (expr === 'love') { for (let k = 0; k < 3; k++) { const q = (t * 0.7 + k / 3) % 1, hx = x + Math.sin(k * 2.3 + t * 2) * 20, hy = y + 40 - q * 70, r = 7 + k * 2; ctx.globalAlpha = a * (1 - q); ctx.fillStyle = '#ff5a8a'; ctx.beginPath(); ctx.moveTo(hx, hy + r * 0.8); ctx.bezierCurveTo(hx - r * 1.3, hy - r * 0.2, hx - r * 0.6, hy - r * 1.3, hx, hy - r * 0.5); ctx.bezierCurveTo(hx + r * 0.6, hy - r * 1.3, hx + r * 1.3, hy - r * 0.2, hx, hy + r * 0.8); ctx.fill(); } }
  else if (expr === 'sleepy') { for (let k = 0; k < 3; k++) { const q = (t * 0.5 + k / 3) % 1; ctx.globalAlpha = a * (1 - q); txt('z', x + q * 26 + k * 4, y + 30 - q * 50, 14 + k * 5, '#d8e8ff', 'center', 'rgba(0,0,0,.4)'); } }
  else if (expr === 'wink') { ART.star(ctx, x, y + 30, 9 + Math.sin(t * 6) * 2, '#ffe27a'); }
  else if (expr === 'surprise' || expr === 'surprised' || expr === 'shock') { const s2 = 1 + Math.max(0, 0.4 - t) * 1.5; bigText('!', x, y + 20, 40 * s2, '#ffffff', '#ff6a3a'); }
  ctx.restore();
}
// v2.6 이야기 화면 분위기: 둥둥 떠다니는 빛 · 위쪽 햇살 · 영화 띠 · 보스 장면 붉은 맥박
function drawStoryAtmo() {
  const night = ST.sc.night, boss = ST.sc.boss, t = G.time;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  if (!night) for (let k = 0; k < 3; k++) { ctx.save(); ctx.globalAlpha = 0.07 + Math.sin(t * 0.6 + k) * 0.03; ctx.translate(160 + k * 300, -40); ctx.rotate(0.35 - k * 0.05); const g = ctx.createLinearGradient(0, 0, 0, 520); g.addColorStop(0, '#fff6d8'); g.addColorStop(1, 'rgba(255,246,216,0)'); ctx.fillStyle = g; ctx.fillRect(-40, 0, 80, 560); ctx.restore(); }
  for (let k = 0; k < 26; k++) { const px = ((k * 137.5 + t * (8 + k % 5 * 3)) % (VW + 40)) - OX - 20, py = 380 - ((t * (10 + k % 7 * 4) + k * 53) % 400), r = 2 + (k % 4); ctx.globalAlpha = 0.25 + 0.25 * Math.sin(t * 2 + k); ctx.drawImage(ART.softDot(night ? '#b8a8ff' : boss ? '#ffb08a' : '#fff2b0'), px - r * 3, py - r * 3, r * 6, r * 6); }
  ctx.restore();
  if (boss) { ctx.save(); ctx.globalAlpha = 0.18 + Math.sin(t * 3) * 0.08; const vg = ctx.createRadialGradient(W / 2, H / 2, 200, W / 2, H / 2, 620); vg.addColorStop(0, 'rgba(180,0,0,0)'); vg.addColorStop(1, 'rgba(180,20,30,1)'); ctx.fillStyle = vg; ctx.fillRect(-OX, 0, VW, H); ctx.restore(); }
  const lb = ctx.createLinearGradient(0, 0, 0, 34); lb.addColorStop(0, 'rgba(0,0,0,.75)'); lb.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = lb; ctx.fillRect(-OX, 0, VW, 34);
}
// v1.8 대사 기록: 지금까지 나온 대사를 다시 읽기 (빈 곳을 누르면 닫힘)
function drawStoryLog() {
  ctx.save(); ctx.fillStyle = 'rgba(15,6,20,.86)'; ctx.fillRect(-OX, 0, VW, H); ctx.restore();
  ART.panel(ctx, 70, 62, W - 140, 446, 'cream'); bigText('대사 기록', W / 2, 96, 26, '#fff3c4', '#ffb300');
  const rows = []; for (let k = 0; k <= ST.i; k++) { const l = ST.sc.lines[k], sp = STORY.SPEAKERS[l[0]]; for (const [j, t] of wrapLines(l[2], 610, 15).entries()) rows.push([j ? '' : (l[0] === 'narr' ? '이야기' : nameSub(sp ? sp.name : l[0])), t, l[0] === 'narr', sp && sp.side === 'R' && !sp.friendly]); }
  const view = rows.slice(-15); view.forEach(([n, t, narr, vil], i) => { const y = 128 + i * 24; if (n) txt(n, 100, y, 14, narr ? '#8a6aa0' : vil ? '#c0504a' : '#a0652a', 'left', false, null, 150); txt(t, 250, y, 15, narr ? '#5a4a6a' : '#4a2a14', 'left', false, null, 610); });
  txt('아무 곳이나 누르면 닫혀요', W / 2, 494, 12, '#8a6142', 'center', false);
}
function drawStory() {
  bgFull(ST.ti, 300 + G.time * 10, G.time, GY, W, H);
  if (ST.sc.night) {
    ctx.fillStyle = 'rgba(16,14,60,.62)'; ctx.fillRect(-OX, 0, VW, H);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.7; ctx.drawImage(ART.softDot('#b9a8ff'), 600, -40, 260, 260); ctx.restore();
    if (!['swamp', 'castle', 'crystal', 'volcano', 'starsea', 'aurora', 'mine', 'fossil', 'clock', 'tower', 'candy', 'upside', 'stargarden', 'burrow', 'namesea', 'shadowvil', 'echocave', 'starmarket', 'clockforest', 'stormcrown', 'whalecave', 'lastgate', 'toyland'].includes(ART.THEMES[ST.ti].kind)) { ctx.fillStyle = '#f4ecff'; circ(730, 90, 34); ctx.fillStyle = 'rgba(16,14,60,.9)'; circ(746, 80, 30); }
    for (let k = 0; k < 40; k++) { const sx = (k * 197) % W, sy = (k * 83) % 260; ctx.globalAlpha = 0.4 + Math.sin(G.time * 2 + k) * 0.35; ctx.fillStyle = '#fff'; circ(sx, sy, k % 5 ? 1.2 : 2); } ctx.globalAlpha = 1;
  }
  const dg = ctx.createLinearGradient(0, 0, 0, H); dg.addColorStop(0, 'rgba(20,8,0,.25)'); dg.addColorStop(1, 'rgba(20,8,0,.7)'); ctx.fillStyle = dg; ctx.fillRect(-OX, 0, VW, H);
  drawStoryAtmo();
  const L = storyLine(), who = L[0], narr = who === 'narr', sp = STORY.SPEAKERS[who];
  if (ST.left && !(who === ST.left)) storyPortrait(ST.left, 230, false, false);
  if (ST.right && !(who === ST.right)) storyPortrait(ST.right, 730, false, true);
  if (ST.left && who === ST.left) storyPortrait(ST.left, 230, !narr, false);
  if (ST.right && who === ST.right) storyPortrait(ST.right, 730, !narr, true);
  vigFull();
  const full = L[2], lines = wrapLines(full, narr ? 760 : 836, narr ? 21 : 22);
  let left = Math.floor(ST.t * TYPE_SPD); const done = left >= [...full].length;
  if (narr) {
    ART.panel(ctx, 30, 392, 900, 136, 'dark'); ART.gem(ctx, W / 2, 392, 6, '#b07cff'); /* v2.6 해설 상자도 벨벳 금테 */
    lines.forEach((ln, i) => { const part = [...ln].slice(0, Math.max(0, left)).join(''); left -= [...ln].length; txt(part, W / 2 - ctx.measureText(ln).width / 2, 455 - (lines.length - 1) * 16 + i * 32, 21, '#f3e9ff', 'left', 'rgba(0,0,0,.6)'); });
  } else {
    ART.panel(ctx, 30, 400, 900, 128, 'cream');
    const spn = nameSub(sp.name); ctx.font = `bold 18px ${FONT}`; const nw = ctx.measureText(spn).width + 44;
    ART.panel(ctx, 56, 376, nw + 18, 38, 'dark'); ART.gem(ctx, 72, 395, 5, sp.side === 'L' || sp.friendly ? '#ffcf3a' : '#ff4a6a'); txt(spn, 66 + nw / 2 + 6, 396, 18, sp.side === 'L' || sp.friendly ? '#ffe082' : '#ff9e9e', 'center');
    lines.forEach((ln, i) => { const part = [...ln].slice(0, Math.max(0, left)).join(''); left -= [...ln].length; txt(part, 70, 448 + i * 32, 22, '#4a2a14', 'left', false); });
  }
  if (done && Math.floor(G.time * 2.5) % 2 === 0) txt('▼', 900, 506, 18, narr ? '#ffcf5a' : '#a0652a', 'center', false);
  txt(`${ST.i + 1} / ${ST.sc.lines.length}`, 40, 24, 12, 'rgba(255,255,255,.75)', 'left');
  if (ST.titleT > 0) {
    const a = Math.min(1, ST.titleT * 1.5, (2.6 - ST.titleT) * 3);
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = 'rgba(15,6,20,.75)'; ctx.fillRect(-OX, 150, VW, 120);
    bigText(ST.sc.title, W / 2, 210, 42, ST.sc.boss ? '#ffb3b3' : '#fff6b0', ST.sc.boss ? '#e53935' : '#ffb300');
    ctx.restore();
  }
  btn(W - 168, 10, 156, 40, ST.replay ? '닫기 ✕' : '건너뛰기 ▶▶', () => storyEnd(), { bg: '#a99a8a', size: 15, key: 'skip' });
  { const au = S.autoSt || 0; btn(W - 300, 10, 124, 40, ['자동 넘김 끔', '자동 ▶', '자동 ▶▶ 빠르게'][au], () => { S.autoSt = (au + 1) % 3; save(); }, { bg: au ? '#5cc96b' : '#c9a983', size: au === 2 ? 12 : 14, key: 'auto' }); }
  btn(W - 432, 10, 124, 40, '대사 기록', () => { ST.log = !ST.log; }, { bg: ST.log ? '#ffc93c' : '#c9a983', size: 14, key: 'slog' });
  if (ST.log) { drawStoryLog(); sceneTap = () => { ST.log = false; }; return; }
  sceneTap = () => storyNext();
}

/* ---------------- 전투 ---------------- */
function startBattle(n) {
  const si = stageInfo(n), hs = heroStats(), cheer = (S.loseN || {})[n] >= CHEER_N; if (cheer) { si.m *= 0.9; si.am *= 0.9; } /* v5.2 패배 도우미: 같은 판 5번 지면 그 판만 몬스터 −10% */
  const types = [heroType(), ...deck().map(i => UNITS[i].id), ...si.pool, ...(si.bossKey ? [si.bossKey] : [])];
  ART.warm(types);
  B = {
    n, si, cheer, world: si.world, camX: 0, t: 0, food: 70, mana: 30,
    allies: [], enemies: [], proj: [], drops: [], parts: [], texts: [], rings: [], fx: [], fly: [], amb: [],
    base: { x: 110, hp: 1200 + S.up.hp * 80, max: 0, isStruct: true, side: 'a', hit: 0 },
    nest: { x: si.world - 110, hp: si.nestHp, max: si.nestHp, isStruct: true, side: 'e', hit: 0 },
    hero: { x: 230, y: 8, hp: hs.hp, max: hs.hp, atk: hs.atk, range: hs.range, rate: hs.rate, cd: 0, face: 1, dead: false, resp: 0, anim: 0, moving: false, hit: 0, atkAnim: 0, side: 'a', isHero: true, spd: hs.spd, dust: 0 },
    hs, ucd: UNITS.map(() => 0), scd: [0, 0, 0, 0], later: [], spawnT: 4, over: null, speed: 1, paused: false,
    kills: 0, coins: 0, coinShown: 0, coinPulse: 0, xp: 0, loot: [], bossDone: false, rush: false, buff: 0, shake: 0, msg: null,
    towers: Array.from({ length: si.totems }, (_, k) => ({ x: si.world * (si.totems === 2 ? (k ? 0.68 : 0.46) : 0.6), hp: si.nestHp * (n > 250 ? 0.18 : 0.3), max: si.nestHp * (n > 250 ? 0.18 : 0.3), isStruct: true, isTotem: true, /* v3.9 토템 체력 45% → 30% (보스 판 20·30판이 토템 앞에서 1분 넘게 멈춤) · v4.1 251판부터 18% (토템 2개 판 336·376이 5분 넘음) */ side: 'e', hit: 0, dead: false })),
    warns: [], silence: 0, evT: rnd(16, 30), evN: 0, ev: null, bossSk: null, tut: !S.tut ? 9 : 0, lvStart: S.lv, banner: 3.0, bubble: { s: pick(LINES.start), t: 2.6 },
  };
  if (cheer) B.msg = { t: 4, s: '📣 응원 버프! 5번 졌던 판이라 이번엔 몬스터가 10% 약해요' }; /* v5.2 */
  if (si.boss && n >= 110) { B.nest.hp = B.nest.max = Math.round(B.nest.max * (S.diff === 2 ? 0.8 : 0.75)); } /* v4.7 어려움 보스 판도 둥지 0.8배 */ /* v4.6 보통·쉬움 121판부터 보스 판만: 둥지 0.75배 · 보스 체력 0.55배 · 보스 공격 0.5배 · 보스가 있을 때 졸개 1/5 · 30초 뒤 지침 2.6배 (봇: 보스 판 평균 300초 → 4분 안쪽) */
  { const cb = castleBuff(); B.cbuf = cb; B.base.hp = Math.round(B.base.hp * (1 + cb.hp)); B.cdr = cb.dr; B.creg = cb.regen; B.food += cb.food; if (cb.set) floatMsg = { s: `🏰 ${cb.set} 효과!`, x: W / 2, y: 150, t: 2.4 }; } /* v4.6 멍멍성 · 세트 효과 */
  { const pd = B.special || NOPET ? null : petEff(); B.petAtk = pd && pd.atk || 0; if (pd && pd.chp) B.base.hp = Math.round(B.base.hp * (1 + pd.chp)); if (pd && pd.xp) B.xpK = (B.xpK || 1) * (1 + pd.xp); } /* v4.8 펫 능력 (대전·특수 판 제외) */
  B.base.max = B.base.hp;
  B.lanes = !!si.lanes; B.selLane = 1; B.laneN = 0;
  B.rw = weatherNow(); if (B.rw.k === 'rain') B.hs = Object.assign({}, B.hs, { mpR: B.hs.mpR * 1.2 }); if (B.rw.k === 'sun') B.hs = Object.assign({}, B.hs, { fdR: B.hs.fdR * 1.1 }); if (B.rw.k === 'snow') B.xpK = 1.15; /* v2.8 날씨 효과 */
  B.dark2 = !!si.dark; /* v2.8 밤 손전등 판 */
  { S.items = S.items || {}; B.coinK = 1; B.xpK = B.xpK || 1; for (const id of bag()) { const it = id && ITEM(id); if (!it || it.kind !== 'start' || invN(id) <= 0) continue; S.items[id]--; S.itemLog = S.itemLog || {}; S.itemLog[id] = (S.itemLog[id] || 0) + 1; if (id === 'lunch') B.food += 40; if (id === 'clover') B.coinK = 1.3; if (id === 'scroll') B.xpK *= 1.4; if (id === 'starpouch') B.starPouch = 1; B.startItems = (B.startItems || []).concat(it.n); } } /* v2.8 시작 아이템 */
  vilBattleFx(); /* v2.9 마을 건물 효과 */
  if (S.snackDay && S.snackDay.d === todayKey() && !S.snackDay.used) { B.snack = S.snackDay.id; S.snackDay.used = 1; save(); }
  for (let i = 0; i < 36; i++) B.amb.push(newAmb(true));
  holds.clear(); refreshHolds();
  setScene('battle');
  SFX.start();
}
function newAmb(init) {
  const k = B ? B.si.th.amb : 'petal';
  const up = k === 'ember' || k === 'bubble' || k === 'wisp' || k === 'sparkle' || k === 'spore';
  return { x: rnd(0, W), y: init ? rnd(0, H) : (up ? H + 10 : -10), vx: k === 'sand' ? rnd(40, 90) : rnd(-15, 15), vy: up ? rnd(-40, -16) : k === 'snow' ? rnd(20, 45) : k === 'feather' ? rnd(10, 22) : rnd(12, 30), r: k === 'snow' ? rnd(1.5, 3.5) : k === 'wisp' ? rnd(3, 6) : rnd(2, 4), ph: rnd(0, 6), k };
}
function say(s, t) { if (B) B.bubble = { s, t: t || 2.2 }; }
function addText(x, y, s, col, size, crit) { if (B.texts.length > 70) B.texts.shift(); B.texts.push({ x, y, s, col: col || '#fff', life: 0.95, max: 0.95, size: size || 16, crit }); }
function burst(x, y, col, n, spd, glow) {
  for (let i = 0; i < n; i++) { if (B.parts.length > 320) break; const a = rnd(0, TAU), v = rnd(40, spd || 160);
    B.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, life: rnd(0.35, 0.75), max: 0.75, col, size: rnd(3, 7), g: 380, glow }); }
}
function poof(x, y, col, n) { for (let i = 0; i < n; i++) B.parts.push({ x: x + rnd(-14, 14), y: y + rnd(-10, 6), vx: rnd(-30, 30), vy: rnd(-50, -10), life: rnd(0.4, 0.8), max: 0.8, col, size: rnd(10, 18), g: -20, soft: true }); }
function ring(x, y, col, max) { B.rings.push({ x, y, r: 6, max: max || 120, col, life: 0.45 }); }
function fx(type, o) { B.fx.push(Object.assign({ type, t: 0 }, o)); }

function tapCard(i) {
  if (!B || B.over || B.paused) return;
  const d = UNITS[i];
  if (B.noCards) { B.cardMsg = { i, s: '혼자 용사 주간!', t: 1.2 }; return; }
  if (!unitUnlocked(i)) { B.cardMsg = { i, s: `스테이지 ${d.unlock - 1} 클리어 필요`, t: 1.2 }; return; }
  if (spawnAlly(i)) { if (B.queue === i) B.queue = null; B.cardPop = { i, t: 0.25 }; return; }
  if (B.allies.length >= 30) { B.cardMsg = { i, s: '동료가 가득해요 (30)', t: 1.2 }; return; }
  if (B.queue === i) { B.queue = null; B.cardMsg = { i, s: '예약 취소', t: 0.9 }; return; }
  B.queue = i; B.cardShake = { i, t: 0.3 };
  B.cardMsg = { i, s: B.ucd[i] > 0 ? '쿨타임 · 자동 예약!' : '뼈다귀 모으는 중 · 예약!', t: 1.3 };
}
/* v1.1 2차 직업: 강화 10 달성 시 자동 승급 (외형 + 능력 1개) */
const PROMO = [
  { n: '돌격대장 콩이', d: '공격 +30% · 이동 속도 +20%', atk: 1.3, spd: 1.2 },
  { n: '철벽 뭉치', d: '체력 +40% · 받는 피해 -20%', hp: 1.4, dr: 0.2 },
  { n: '명궁 초코', d: '사거리 +60 · 공격 +20%', atk: 1.2, range: 60 },
  { n: '대마법사 설이', d: '공격 +30% · 공격 속도 +15%', atk: 1.3, rate: 0.87 },
  { n: '검성 백구', d: '30% 확률 치명타(2배)', crit: 0.3 },
  { n: '포병대장 망고', d: '공격 +35%', atk: 1.35 },
  { n: '대치유사 몽실', d: '치유량 +50% · 날개 간호 모자', heal: 1.5 },
  { n: '창기병 쭈니', d: '공격 +25% · 체력 +20%', atk: 1.25, hp: 1.2 },
  { n: '성벽 수호자 태산', d: '체력 +50% · 받는 피해 -25% · 금빛 탑 방패', hp: 1.5, dr: 0.25 },
  { n: '그림자 닌자 치치', d: '35% 확률 치명타(2배) · 이동 속도 +20%', crit: 0.35, spd: 1.2 },
];
const COIN_RATE = 0.1; /* v4.8 코인 1/10 (예전 1/8) */ /* v4.5 한 판에서 얻는 코인을 예전의 1/8로 (사용자 요청) */
const permMult = () => { const P = S.perm || {}; return P.r4 ? 4 : P.r2 ? 2 : 1; };
const HERO_STRUCT = 0.5, SKILL_STRUCT = 0.4, ALLY_K = 1.3; /* v4.7 기술(강타·미르 불꽃·뼈다귀 폭풍)이 성·둥지·토템에 주는 피해 0.7 → 0.4 (몬스터에게는 그대로) */
const HERO_RESP = 20, POTION_C = 500; /* v4.8 부활 20초 */ /* v4.7 기사 부활 30초 · 회복 물약 코인 500 */ /* v4.3 기술(쿵 내려찍기·미르 불꽃·별똥별)이 둥지·토템에 주는 피해 0.7배 — 악당 아지트가 기술 한두 번에 금방 부서졌음. 대신 평소 공격이 아지트에 주는 피해는 1.15배 (판 길이는 비슷하게, 동료와 함께 부수는 느낌) */ // v1.4 밸런스: 기사가 둥지·토템에 주는 피해 35%, 동료 체력·공격 ×1.3
const promoted = i => (S.up['u' + i] || 0) >= UPMAX;
const unitSprite0 = i => UNITS[i].id + (third(i) ? 't' : promoted(i) ? 'p' : '');
const unitSprite = i => { const b = unitSprite0(i), id = UNITS[i].id, w = S && S.wear && S.wear[id]; if (w == null || !BREED[id] || !BREED[id].wear[w] || !wearOpen(id, w)) return b; const it = BREED[id].wear[w]; return ART.wearType(b, it.k, it.c); };
function spawnAlly(i) {
  if (!B || B.over || B.paused) return false;
  const d = UNITS[i];
  if (!unitUnlocked(i) || B.food < d.cost || B.ucd[i] > 0 || B.allies.length >= 30) return false;
  B.food -= d.cost; B.ucd[i] = d.cd; if (B.pvp) { B.pvpUse = B.pvpUse || {}; B.pvpUse[i] = (B.pvpUse[i] || 0) + 1; } /* v4.6 대전 기록: 많이 쓴 기사 */
  const k = (1 + 0.15 * (S.up['u' + i] || 0)) * (1 + (B.hs.ally || 0) / 100) * ALLY_K;
  const PR = promoted(i) ? PROMO[i] : {}, T3 = (third(i) ? 1.25 : 1) * (1 + 0.12 * awk(i));
  B.allies.push({ heal: (d.heal || 0) * k * (PR.heal || 1), side: 'a', def: d, kind: unitSprite(i), promo: !!PR.n, pcrit: PR.crit || 0, dr: PR.dr || 0, x: B.base.x + 40, y: B.lanes ? (B.selLane ? rnd(10, 24) : rnd(-60, -50)) : rnd(0, 24), lane: B.lanes ? B.selLane : null, hp: d.hp * k * (PR.hp || 1) * T3 * (joyOf(i) >= 5 ? 1.02 : 1), max: d.hp * k * (PR.hp || 1) * T3 * (joyOf(i) >= 5 ? 1.02 : 1) /* v3.6 행복도 하트 5개 이상: 체력 +2% */, atk: d.atk * k * (PR.atk || 1) * T3, third: third(i), awk: awk(i), tcd: 4, range: d.range + (PR.range || 0), spd: d.spd * rnd(0.95, 1.05) * (PR.spd || 1), rate: d.rate * (PR.rate || 1), cd: rnd(0, 0.3), anim: rnd(0, 6), hit: 0, atkAnim: 0, dead: false, kb: 0, moving: true });
  burst(B.base.x + 40, GY - 20, '#fff59d', 10, 160, true); fx('spark', { x: B.base.x + 40, y: GY - 24, dur: 0.35, col: '#fff59d', r: 26 });
  { const tr = TRAITS[d.id]; addText(B.base.x + 44, GY - 70, tr ? pick(tr.v) : '멍!', '#fff3c4', 15); const na = B.allies[B.allies.length - 1]; if (na && B.snack === d.id) { na.hp *= 1.15; na.max *= 1.15; na.atk *= 1.15; na.heal *= 1.15; addText(B.base.x + 44, GY - 96, '간식 힘 +15%!', '#ffd8a8', 13); } if (na) { na.hop = 0.5; emoteAt(na, 'heart', 1.4); na.emT = rnd(4, 8); } }
  SFX.summon();
  return true;
}
function spawnEnemy(key, off, elite) {
  if (B.enemies.length >= 42 && !ENEMIES[key].boss && !elite) return;
  const d = ENEMIES[key], si = B.si;
  const hm = (d.boss ? (1 + (si.m - 1) * 0.6) * (B.n > 250 ? 0.75 : 1) * (B.n >= 110 && !B.special ? (S.diff === 2 ? 0.2 : 0.35) : 1) : si.m) * (elite ? 9 : 1), /* v4.2 251판부터 보스 체력 0.8배 (보통 보스 판 4분 넘음) · v4.6 121판부터 보스 체력 보통 0.55배 · 어려움 0.75배 (봇: 보통 보스 판 보스 싸움만 200초 넘음 · 270판 341~397초) */ bsc = d.boss ? 1.32 : 1; /* v3.9 보스 공격 0.7배 (봇 1초 기록: 보스가 나오면 동료가 성 앞까지 밀려 2~3명만 남음) */
  const fromT = !d.boss && !elite && B.towers && B.towers.find(t => !t.dead && Math.random() < 0.45), sx = fromT ? fromT.x - 20 : B.nest.x - 30;
  B.enemies.push({ elite: !!elite, sc: elite ? 1.45 : bsc, side: 'e', def: d, kind: key, x: sx + (off || 0), ...(B.lanes && !d.boss ? (q => ({ lane: q, y: q ? rnd(10, 24) : rnd(-60, -50) }))(B.forceLane != null ? B.forceLane : (B.laneN = (B.laneN || 0) + 1) % 2) : { y: rnd(0, 24) }), hp: d.hp * hm, max: d.hp * hm, atk: d.atk * si.am * si.atkM * (elite ? 1.8 : 1) * (d.boss ? (B.n > 250 ? 0.56 : 0.7) * (B.n >= 110 && !B.special ? 0.5 : 1) : 1), /* v4.2 251판부터 보스 공격 0.7→0.56 (보통 보스 판에서 보스가 동료를 성 앞까지 밀어 4~6분) */ range: d.range * (elite ? 1.15 : 1), spd: d.spd * si.spdM * rnd(0.9, 1.1), rate: d.rate, cd: 0.6, anim: rnd(0, 6), hit: 0, atkAnim: 0, dead: false, kb: 0, moving: true, shield: 1.4 }); /* v2.7 갓 나온 몬스터 1.4초 보호막 */
  if (d.fly && !d.boss && !S.flyTip && B.n >= 3) { S.flyTip = 1; B.msg = { t: 3.2, s: '박쥐는 동료를 넘어 성으로 날아가요! 기사·초코·설이로 막아요' }; }
  { const e = B.enemies[B.enemies.length - 1]; if (e && e.def === d && B.rw) { if (B.rw.k === 'rain' && ['crab', 'toad', 'slime'].includes(key)) { e.hp *= 1.25; e.max *= 1.25; } if (B.rw.k === 'snow') e.spd *= 0.9; if (B.rw.night && key === 'bat') e.atk *= 1.2; } }
  if (B.weekly === 'giant' && !d.boss) { const e = B.enemies[B.enemies.length - 1]; if (e && e.def === d) e.sc *= 1.35; }
  fx('spark', { x: sx + 22, y: GY - 52, dur: 0.4, col: '#e040fb', r: 40 });
}
function findTarget(u) {
  const dir = u.side === 'a' ? 1 : -1; let best = null, bd = 1e9;
  const check = o => { if (o.dead || o.hide > 0) return; if (B.lanes && u.lane != null && o.lane != null && o.lane !== u.lane) return; const d = (o.x - u.x) * dir; if (d > -14 && d <= u.range && d < bd) { bd = d; best = o; } };
  if (u.side === 'a') { for (const o of B.enemies) check(o); } else { if (!(u.def.fly && !u.def.boss)) for (const o of B.allies) check(o); if (!B.hero.dead) check(B.hero); } // v2.0 날아다니는 몬스터는 동료 벽을 넘어 성으로 (기사·원거리 동료로 막기)
  if (best) return best;
  if (u.side === 'a') { for (const tw of B.towers) if (!tw.dead && tw.x - 30 - u.x <= u.range && tw.x - u.x > -30) return tw; if (B.nest.x - 40 - u.x <= u.range) return B.nest; } else if (u.x - (B.base.x + 40) <= u.range) return B.base;
  return null;
}
function targetY(t) { return t.isStruct ? GY - 70 : GY + (t.y || 0) - (t.def && t.def.fly ? 62 : 28); }
let gRanged = false; // v2.3 그림자 방패: 원거리·마법 공격만 제대로 들어감
function dealDmg(t, dmg, fromSide, crit) {
  if (t.dead || (t.isStruct && t.hp <= 0) || t.hide > 0) return;
  if (t.inv > 0 && fromSide === 'e') return;
  if (fromSide === 'a' && B.si.night && !t.isStruct) dmg *= 1.12; /* v3.4 밤 판: 반딧불이 길을 밝혀 줘서 우리 편 공격 +12% */
  if (t.shield > 0 && fromSide === 'a') dmg *= 0.25;
  if (fromSide === 'a' && B.petAtk) dmg *= 1 + B.petAtk; /* v4.8 펫 공격 */
  if (B.drumT > 0 && fromSide === 'a') dmg *= 1.5 + (B.si.ramp || 0) * 0.5; /* v5.1 북 +50% (높은 판일수록 더 셈) */ if (B.alloutT > 0 && fromSide === 'a') dmg *= 2; if (B.tstopT > 0 && fromSide === 'a' && t.stun > 0) dmg *= 1.5; /* v4.8 강력 아이템 강화 */ if (t.isHero && fromSide === 'e' && B.heroShield > 0) return; /* v4.5 강력 아이템 */
  if (t === B.base && B.charmT > 0) return;
  if (t.guard > 0 && fromSide === 'a' && !gRanged) { dmg *= 0.15; if (Math.random() < 0.15) addText(t.x - 30, GY - 90, '막힘!', '#c8b8ff', 13); }
  if (t.def && t.def.boss && fromSide === 'a') { if (t.born == null) t.born = B.t; if (B.t - t.born > (B.rematch != null ? 30 : B.n >= 110 && !B.special ? 15 : 45)) { dmg *= B.n >= 110 && !B.special ? 2.6 : 2; /* v4.6 121판부터 보스는 30초 뒤 지치고 2.6배 (봇: 보통 보스 판 보스 싸움 200초) */ /* v3.9 60초 → 45초 */ if (!t.tired) { t.tired = 1; addText(t.x, GY - (t.def.h || 150) - 30, '헥헥… 지쳤다!', '#ffe082', 18, true); } } } // v2.2 보스전이 너무 길어지지 않게: 60초 뒤엔 지쳐서 더 아파함
  if (t === B.nest && fromSide === 'a' && B.bossDone && !B.enemies.some(e => !e.dead && e.def.boss)) dmg *= B.n >= 110 && !B.special ? 4.5 : 2.2; /* v4.6→v4.7 121판부터 보스 뒤 마무리 4.5배 (기술→성 0.4배라서) */ /* v4.3 1.6→2.2: 기술이 아지트에 덜 아파진 만큼 보스를 이긴 뒤 마무리는 빠르게 */ // v2.3 보스를 쓰러뜨리면 둥지가 약해짐 (끝판 끌림 방지)
  if ((t === B.nest || t.isTotem) && fromSide === 'a') dmg *= 1.15; /* v4.3 */
  if ((t === B.nest || t.isTotem) && fromSide === 'a' && B.n > 10) dmg *= 1 + 0.5 * Math.min(1, (B.n - 10) / 10); if (t !== B.nest && fromSide === 'a' && B.t > 90 && (!B.special || B.rematch != null)) { dmg *= 1 + (B.n > 250 ? 0.7 : 0.45) * Math.min(1, (B.t - 90) / 120); /* v4.1 251판부터 용기 +70% */ if (!B.braveMsg) { B.braveMsg = 1; B.later = B.later || []; B.later.push({ t: 2.6, fn: () => { B.msg = { t: 2.2, s: '함께 버틴 용기! 동료들이 점점 세져요' }; } }); } } /* v3.8 함께 버틴 용기: 90초부터 동료가 몬스터에게 주는 피해가 점점 커짐(210초에 +45%) — 어려움에서 들판 밀고 당기기가 길었음 */ if (t === B.nest && fromSide === 'a' && B.t > 80 && !B.special) { dmg *= 1 + 1.5 * Math.min(1, (B.t - 80) / 120); if (!B.tiredMsg) { B.tiredMsg = 1; B.msg = { t: 2.2, s: '둥지가 지쳐 가요! 이제 더 잘 부서져요' }; } } /* v3.7 지친 둥지: 80초가 지나면 둥지가 점점 약해짐(200초에 피해 2.5배) — 봇 1초 기록: 15~20판은 둥지 40~70%에서 밀고 당기기가 2분 넘게 이어졌음 */ /* v3.5 11판부터 둥지에 주는 피해 최대 +50% (봇: 둥지 앞까지 가도 둥지가 안 깨져 밀고 당기기가 길었음) */
  if (t === B.nest && fromSide === 'a' && B.pvp && B.t > 75) dmg *= 1.4; /* v4.6 대전 후반 상대 성 1.4배 */
  if (B.pvp && B.t > 120 && (t === B.nest || t === B.base)) dmg *= 1 + (B.t - 120) / 30; /* v4.7 대전 2분부터 두 성 모두 점점 약해짐 (3분에 3배) */
  if (t === B.nest && fromSide === 'a' && B.t > 180) { dmg *= 1 + Math.min(3, (B.t - 180) / 80); /* v5.0 최대 4배 · v3.3 3분부터 (봇: 22~33판 4분 넘는 판이 많았음) */ if (!B.nestTired) { B.nestTired = 1; B.msg = { t: 2.4, s: '둥지가 지쳐서 흔들려요! 지금 밀어붙여요!' }; } } /* v2.9 밀고 당기기가 4분 넘게 이어지면 둥지가 점점 약해짐 (최대 2.5배) */
  if (t === B.base && fromSide === 'e' && B.cdr) dmg *= 1 - B.cdr; /* v4.6 수정성 · 세트 */
  if (t === B.base && fromSide === 'e' && B.hero.dead) dmg *= 0.7; /* v4.7 부활이 30초로 길어져서: 기사가 쓰러져 있는 동안 성이 받는 피해 0.7배 */
  if (t === B.base && fromSide === 'e') dmg = Math.min(dmg, B.base.max * (B.hero.dead ? 0.035 : 0.06)); /* v4.7 기사가 쓰러져 있으면 한 대에 3.5%까지 */ /* v2.7 3% → 6% */ // v2.1 성은 한 대에 최대 3%만: 뒤로 새는 몬스터가 위협이 되되, 후반에도 한 번에 무너지지 않게
  if (t.isHero && fromSide === 'e') dmg *= 1.2; // v1.4 기사 혼자 돌파 방지: 기사가 받는 피해 +20%
  if (t.isHero && B.hs.def) dmg *= 1 - B.hs.def / 100;
  if (t.dr) dmg *= 1 - t.dr;
  if (t.reflect > 0 && fromSide === 'a') { dmg *= 0.3; const r = B.allies.concat(B.hero.dead ? [] : [B.hero]).filter(o => !o.dead && Math.abs(o.x - t.x) < 220); if (r.length && Math.random() < 0.5) { const o = pick(r); B.reflectQ = (B.reflectQ || []); B.reflectQ.push([o, dmg * 0.8]); } if (Math.random() < 0.2) addText(t.x, GY - 190, '반사!', '#bff4ff', 15); }
  if (t === B.nest && B.towers.some(tw => !tw.dead)) { dmg *= 0.08; if (Math.random() < 0.15) addText(t.x, GY - 150, '토템 방어막!', '#e1a8ff', 14); }
  dmg = Math.max(1, Math.round(dmg * rnd(0.9, 1.1)));
  t.hp -= dmg; t.hit = 0.18; if (fromSide === 'a' && !t.isStruct) { B.dmgA = (B.dmgA || 0) + Math.max(0, dmg); if (gPetHit) B.petDmg = (B.petDmg || 0) + Math.max(0, dmg); } /* v5.1 피해 몫 세기 */
  const ty = targetY(t) - 14;
  addText(t.x + rnd(-8, 8), ty, '' + dmg, crit ? '#ffd54f' : fromSide === 'a' ? '#ffffff' : '#ff8a80', crit ? 22 : t.isStruct ? 18 : 16, crit);
  fx('hit', { x: t.x + rnd(-6, 6), y: ty + 14, dur: 0.22, col: fromSide === 'a' ? '#fff3b0' : '#ff8a80', r: crit ? 26 : 16 });
  SFX.hit();
  if (t.isStruct) { t.hp = Math.max(0, t.hp); if (t === B.nest && B.si.boss && !B.bossDone && !B.special && t.hp < t.max * (bossAt() - 0.05)) t.hp = t.max * (bossAt() - 0.05); /* v4.6 보스 판에서 보스가 나오기 전에 둥지가 한 번에 부서지지 않게 */ return; }
  if (t.hp <= 0) {
    t.hp = 0;
    if (t.isHero) heroDie();
    else { t.dead = true; if (B.pvp) { if (t.side === 'a' && !t.isHero) B.allyLost = (B.allyLost || 0) + 1; if (t.oppHero) B.oppHeroK = (B.oppHeroK || 0) + 1; } /* v4.7 대전 기록 */ if (t.side === 'e') { onEnemyDie(t); if (!(t.def && t.def.boss)) { B.ghosts = B.ghosts || []; if (B.ghosts.length < 14) B.ghosts.push({ k: t.kind, x: t.x, y: GY + (t.y || 0), s: t.def.s * (t.sc || 1), t: 0, vx: rnd(60, 140), rot: rnd(0.6, 1.4) }); } } else poof(t.x, GY - 20, '#ffffff', 6); }
  }
}
function onEnemyDie(e) {
  { const near = B.allies.filter(a => !a.dead && Math.abs(a.x - e.x) < 170); if (near.length && Math.random() < (e.def.boss || e.elite ? 1 : 0.3)) { for (const a of (e.def.boss || e.elite ? near : [pick(near)])) { if (!(e.def.boss || e.elite) && (a.atkAnim > 0 || (a.hopCd || 0) > B.t)) continue; a.hopCd = B.t + 5; a.hop = 0.5; a.hopA = 7; emoteAt(a, e.def.boss ? 'heart' : pick(['star', 'note', '!']), 1.5); } } }
  B.kills++; dailyAdd('k', 1);
  if (e.def.boss) { B.slowmo = 0.6; B.punch = 0.4; B.shake = 0.6; fx('flash', { dur: 0.25, col: '#ffffff' }); }
  if (e.def.boss && (!B.special || B.rematch != null)) { /* v3.9 보스가 「함께」에 마음을 열면 겁먹은 졸개 절반이 집으로 돌아가고 15초 동안 새로 나오지 않음 (봇: 보스를 쓰러뜨린 뒤 둥지까지 다시 가는 데 1분 넘게 걸렸음) */
    const rest = B.enemies.filter(q => !q.dead && q !== e && !q.def.boss && !q.isStruct).sort((p, q) => p.x - q.x); rest.filter((q, k) => k % 2 === 0).forEach(q => { q.dead = true; q.hp = 0; poof(q.x, GY - 20, '#ffd6e8', 6); });
    B.spawnT = Math.max(B.spawnT, 15); B.surgeT = Math.max(B.surgeT || 0, 25); B.later.push({ t: 1.2, fn: () => { B.msg = { t: 2.4, s: '보스가 웃었어요! 겁먹은 꼬마 몬스터들이 집으로 돌아가요' }; } }); }
  const d = e.def;
  const DE = dayEv();
  gainXp(Math.round(d.xp * (1 + (B.n - 1) * 0.1) * (B.si.xpM || 1) * (1 + (B.hs.xp || 0) / 100) * (DE.xp || 1)));
  const c = Math.round(COIN_RATE * d.coin * (1 + (B.n - 1) * 0.08) * (e.elite ? 6 : 1) * (1 + (B.hs.gold || 0) / 100) * (B.si.coinM || 1) * (DE.coin || 1) * diffOf().coin * (e.treasure > 0 ? 12 : 1)), y0 = GY + e.y - (d.fly ? 62 : 24);
  const nCoin = Math.min(5, Math.max(1, Math.round(c / 3))); if (c <= 0) { /* v4.5 코인 1/8: 아주 작은 몬스터는 코인 없음 */ }
  for (let i = 0; i < nCoin; i++) B.drops.push({ type: 'coin', x: e.x, y: y0, vx: rnd(-70, 70), vy: rnd(-280, -180), t: 0, val: i === 0 ? c - (nCoin - 1) * Math.floor(c / nCoin) : Math.floor(c / nCoin), life: 30, ground: false, gy: GY + e.y + rnd(-4, 4) });
  const r = Math.random(); let it = null;
  if (d.boss || (e.elite && Math.random() < 0.5)) it = 'box'; else if (r < (B.si.mis.k === 'treasure' ? 0.05 : 0.015)) it = 'box'; /* v4.8 장비 상자가 덜 나옴 (3% → 1.5%, 정예 절반) */ else if (r < 0.03) it = 'bone'; else if (r < 0.13) it = 'bone'; else if (r < 0.21) it = 'meat'; else if (r < 0.29) it = 'star';
  if (e.elite && Math.random() < 0.25) { addDust(1, e.x, GY - 130); B.dustGot = (B.dustGot || 0) + 1; }
  if (e.treasure > 0) { it = 'box'; addText(e.x, GY - 110, '보물 슬라임 잡았다!', '#7fe0ff', 20, true); burst(e.x, GY - 40, '#7fe0ff', 30, 260, true); }
  if (it) B.drops.push({ type: it, x: e.x, y: y0, vx: rnd(-70, 70), vy: -260, t: 0, life: 22, ground: false, gy: GY + e.y, minR: d.boss ? 2 : e.elite ? 1 : 0 });
  if (d.boss) for (let i = 0; i < 1; i++) B.drops.push({ type: 'box', x: e.x + rnd(-30, 30), y: y0, vx: rnd(-90, 90), vy: -300, t: 0, life: 22, ground: false, gy: GY + e.y, minR: 1 });
  poof(e.x, y0 + 8, d.boss ? '#ffe082' : '#b39ddb', d.boss ? 30 : 7);
  for (let i = 0; i < (d.boss ? 14 : e.elite ? 8 : 3); i++) B.parts.push({ x: e.x + rnd(-12, 12), y: y0 + rnd(-10, 10), vx: rnd(-15, 15), vy: rnd(-90, -50), life: rnd(0.7, 1.2), max: 1.2, col: '#c79bff', size: rnd(6, 11), g: -40, soft: true, wisp: true });
  if (e.elite) { B.shake = 0.35; addText(e.x, y0 - 30, '정예 처치!', '#ffd54f', 22, true); }
  burst(e.x, y0, d.boss ? '#ffd54f' : '#e1bee7', d.boss ? 40 : 8, d.boss ? 280 : 160, true);
  if (d.boss) { B.shake = 0.6; musicFor(); }
  SFX.die();
}
function gainXp(x) {
  x = Math.round(x * (B.xpK || 1)); B.xp += x; S.xp += x; let up = false;
  while (S.lv < LV_MAX && S.xp >= xpNeed(S.lv)) { S.xp -= xpNeed(S.lv); S.lv++; up = true; } if (S.lv >= LV_MAX) { S.lv = LV_MAX; S.xp = 0; }
  if (up) {
    const h = B.hero, hs = heroStats(); B.hs = hs; h.max = hs.hp; h.atk = hs.atk; if (!h.dead) h.hp = h.max;
    addText(h.x, GY - 120, `LEVEL UP!  Lv.${S.lv}`, '#ffe082', 26, true);
    fx('pillar', { x: h.x, y: GY + 8, dur: 1.0 }); ring(h.x, GY + 4, '#ffe082', 110); burst(h.x, GY - 50, '#ffd54f', 30, 240, true);
    SFX.lvl(); say(pick(LINES.lvl));
    const sk = SKILLS.find(s => s.lv === S.lv); if (sk) B.msg = { t: 2.8, s: `새 스킬 해금: ${sk.name}!` };
    save();
  }
}
function heroDie() { const h = B.hero; B.heroDied = true; h.dead = true; h.hp = 0; h.resp = HERO_RESP; poof(h.x, GY - 30, '#ffffff', 14); burst(h.x, GY - 30, '#fff', 16); B.msg = { t: 2.4, s: `멍멍기사가 쓰러졌어요! ${HERO_RESP}초 후 성에서 부활 (부활 깃털이면 바로)` }; SFX.lose(); }
function pickup(d) {
  d.got = true; const h = B.hero;
  if (d.type === 'bone') { B.food = Math.min(B.hs.fdMax, B.food + 20); addText(d.x, d.y - 24, d.gold ? '+20 황금 뼈다귀!' : '+20 뼈다귀', d.gold ? '#ffe27a' : '#fff8e1'); if (d.gold) { B.coins += 8 + B.n; B.coinPulse = 0.25; } SFX.pick(); }
  else if (d.type === 'meat') { const v = Math.round(h.max * 0.3); h.hp = Math.min(h.max, h.hp + v); addText(d.x, d.y - 24, '+' + v + ' 체력', '#a5d6a7'); SFX.pick(); }
  else if (d.type === 'star') { B.mana = Math.min(B.hs.mpMax, B.mana + 25); addText(d.x, d.y - 24, '+25 마나', '#90caf9'); SFX.pick(); }
  else if (d.type === 'box') { const it = makeItem(B.n, d.minR || 0); B.loot.push(it); addText(d.x, d.y - 30, `${RAR[it.r]} ${it.name}!`, RARC[it.r], 19, it.r >= 2); fx('pillar', { x: d.x, y: d.y + 6, dur: 0.8, col: RARC[it.r] }); burst(d.x, d.y - 10, RARC[it.r], 20, 220, true); SFX.rare(); }
  fx('spark', { x: d.x, y: d.y - 8, dur: 0.3, col: '#ffffff', r: 22 });
}
let gPetHit = false;
function useSkill(i) { const m0 = B ? B.mana : 0, c0 = B && B.scd ? B.scd[i] : 0; gRanged = true; try { return useSkill0(i); } finally { gRanged = false; if (B && (B.mana < m0 || (B.scd && B.scd[i] > c0))) B.lastSkT = B.t; } } /* v5.1 기사 기술 쓴 때 (합동 공격) */
function useSkill0(i) {
  if (!B || B.over || B.paused) return;
  const s = SKILLS[i], h = B.hero;
  if (B.noSkill) { B.msg = { t: 1.4, s: '맨손 주간! 이번 판은 기사 스킬을 못 써요' }; return; }
  if (s.mir && !S.mirFire) { B.msg = { t: 2, s: '미르의 불꽃은 상점 「꾸미기」에서 보석으로 열 수 있어요' }; return; } /* v4.4 미르의 불꽃은 보석으로 사야 씀 */
  if (h.dead || B.mana < s.mp || B.scd[i] > 0 || S.lv < s.lv) return;
  if (s.mir && !mounted()) { B.msg = { t: 1.4, s: '미르를 타야 쓸 수 있어요 (설정 → 기사·용 꾸미기)' }; return; }
  if (B.silence > 0) { B.msg = { t: 1.4, s: '침묵의 장막! 잠시 스킬을 쓸 수 없어요' }; return; }
  B.mana -= s.mp; B.scd[i] = s.cd * (1 - (B.hs.cdr || 0) / 100) * (B.mirFast && s.mir ? 0.5 : 1); dailyAdd('s', 1);
  B.skillCut = { i, t: 0.9 };
  if (i === 0) {
    fx('pawstamp', { x: h.x + h.face * 70, y: GY + 6, dur: 0.55 }); B.freeze = 0.07; B.punch = 0.3;
    h.atkAnim = 0.3;
    for (const e of B.enemies) { const d = (e.x - h.x) * h.face; if (d > -30 && d < 150) { dealDmg(e, h.atk * 3, 'a', true); if (!e.def.boss) e.kb = h.face * 70; } }
    if (Math.abs(B.nest.x - 40 - h.x) < 150) dealDmg(B.nest, h.atk * 3 * HERO_STRUCT * SKILL_STRUCT, 'a', true);
    B.shake = 0.45; ring(h.x + h.face * 60, GY + 6, '#ffcc80', 150); ring(h.x + h.face * 60, GY + 6, '#ffffff', 220); fx('slash', { x: h.x + h.face * 20, y: GY - 36, face: h.face, dur: 0.28, big: true });
    burst(h.x + h.face * 60, GY - 6, '#ffcc80', 24, 260, true); poof(h.x + h.face * 60, GY, '#d7b48a', 8); SFX.slam();
  } else if (i === 1) {
    B.buff = 8;
    for (const a of B.allies) { a.hp = Math.min(a.max, a.hp + a.max * 0.3); burst(a.x, GY - 30, '#80d8ff', 3, 80, true); }
    h.hp = Math.min(h.max, h.hp + h.max * 0.25);
    ring(h.x, GY - 30, '#80d8ff', 260); ring(h.x, GY - 30, '#ffffff', 180); fx('wave', { x: h.x, y: GY - 40, dur: 0.6 }); fx('barkwave', { x: h.x + h.face * 20, y: GY - 60, face: h.face, dur: 0.9 }); fx('flash', { dur: 0.25, col: '#b3ecff' }); B.punch = 0.2;
    for (const a of B.allies) { a.hop = 0.5; } for (let k = 0; k < 10; k++) B.parts.push({ x: h.x + rnd(-80, 80), y: GY - rnd(40, 100), vx: rnd(-30, 30), vy: rnd(-90, -40), life: 1.2, max: 1.2, col: '#ffffff', size: 10, g: -20, note: true });
    addText(h.x, GY - 110, '용기의 짖음! 공격·속도 UP', '#80d8ff', 18); say(pick(LINES.bark)); SFX.bark();
  } else if (i === 3) {
    const gs = dragonStage(), len = [340, 430, 540][gs], mult = [1, 1.35, 1.8][gs], f0 = h.face, x0 = h.x + f0 * 40 * heroScale();
    fx('breath', { x: x0, y: GY - [62, 80, 96][gs] * heroScale() / 0.8, face: f0, len, dur: 1.15, gs }); h.atkAnim = 0.45; B.shake = 0.35; B.punch = 0.15; SFX.storm();
    for (let k = 0; k < 4; k++) B.later.push({ t: 0.18 + k * 0.24, fn: () => {
      const hx0 = B.hero.x + f0 * 30;
      for (const e of B.enemies) { const d = (e.x - hx0) * f0; if (d > -20 && d < len && !(e.hide > 0)) { dealDmg(e, B.hero.atk * 0.95 * mult, 'a', k === 3); if (!e.def.boss && k === 3) e.kb = f0 * 40; if (Math.random() < 0.5) burst(e.x, GY - 30, '#ffb04a', 4, 120, true); } }
      for (const tw of B.towers) if (!tw.dead && (tw.x - hx0) * f0 > -20 && (tw.x - hx0) * f0 < len) dealDmg(tw, B.hero.atk * 0.95 * mult * SKILL_STRUCT, 'a');
      if ((B.nest.x - 40 - hx0) * f0 > 0 && (B.nest.x - 40 - hx0) * f0 < len) dealDmg(B.nest, B.hero.atk * 0.95 * mult * HERO_STRUCT * SKILL_STRUCT, 'a');
    } });
    addText(h.x, GY - 150, '미르, 불꽃이야!', '#ffab91', 18);
  } else {
    const tg = B.enemies.filter(e => !e.dead && e.x > B.camX - 30 && e.x < B.camX + W + 30);
    tg.forEach((e, k) => fx('meteor', { x: e.x + rnd(-10, 10), y: GY + e.y, dur: 0.55, delay: 0.25 + k * 0.06, target: e, dmg: h.atk * 4.5 }));
    for (let k = 0; k < 8; k++) fx('meteor', { x: B.camX + rnd(60, W - 60), y: GY + rnd(0, 20), dur: 0.55, delay: 0.2 + k * 0.1 });
    if (B.nest.x > B.camX && B.nest.x < B.camX + W + 60) fx('meteor', { x: B.nest.x - 20, y: GY, dur: 0.55, delay: 0.5, target: B.nest, dmg: h.atk * 4.5 * SKILL_STRUCT });
    for (const tw of B.towers) if (!tw.dead && tw.x > B.camX && tw.x < B.camX + W + 40) fx('meteor', { x: tw.x, y: GY, dur: 0.55, delay: 0.45, target: tw, dmg: h.atk * 4.5 * SKILL_STRUCT });
    B.dark = 1.6; fx('flash', { dur: 0.35, col: '#fff3c4' }); B.shake = 0.8; SFX.storm();
  }
}
function usePotion() {
  if (!B || B.over || B.paused) return;
  const h = B.hero; if (S.potions <= 0 || h.dead || h.hp >= h.max) return;
  S.potions--; save(); const v = Math.round(h.max * 0.6); h.hp = Math.min(h.max, h.hp + v);
  addText(h.x, GY - 96, '+' + v + ' 회복', '#a5d6a7', 20); burst(h.x, GY - 40, '#a5d6a7', 18, 160, true); fx('pillar', { x: h.x, y: GY + 8, dur: 0.6, col: '#a5d6a7' }); SFX.pick();
}
function updHero(dt) {
  if (B.sleepy > 0) dt *= 0.7;
  { const h0 = B.hero; h0.emT = (h0.emT == null ? rnd(3, 6) : h0.emT) - dt; if (h0.em) { h0.em.t -= dt; if (h0.em.t <= 0) h0.em = null; } if (h0.emT <= 0) { h0.emT = rnd(7, 12); if (!h0.dead) emoteAt(h0, h0.hp < h0.max * 0.3 ? 'sweat' : pick(['note', 'heart', 'star', '!'])); } }
  const h = B.hero;
  h.anim += dt; if (h.hit > 0) h.hit -= dt; if (h.atkAnim > 0) h.atkAnim -= dt;
  if (h.dead) {
    h.resp -= dt;
    if (h.resp <= 0) { h.dead = false; h.hp = h.max; h.x = B.base.x + 80; fx('pillar', { x: h.x, y: GY + 8, dur: 0.8, col: '#fff59d' }); ring(h.x, GY + 4, '#fff59d', 80); say(pick(LINES.respawn)); }
    return;
  }
  if (h.stun > 0) { h.stun -= dt; h.moving = false; if (Math.random() < 0.1) addText(h.x, GY - 130, '꽁꽁!', '#bfe6ff', 13); return; }
  if (h.root > 0) h.root -= dt;
  if (h.inv > 0) h.inv -= dt;
  const mv = h.root > 0 ? 0 : (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
  h.moving = mv !== 0;
  if (mv) { h.face = mv; h.x += mv * h.spd * dt; h.dust -= dt; if (h.dust <= 0) { h.dust = 0.18; B.parts.push({ x: h.x - mv * 10, y: GY + h.y + 2, vx: -mv * 30, vy: -20, life: 0.4, max: 0.4, col: '#e8d5b5', size: 7, g: 0, soft: true }); } }
  h.x = clamp(h.x, B.base.x + 20, B.nest.x - 50);
  h.hp = Math.min(h.max, h.hp + (h.max * 0.006 + (B.hs.regen || 0)) * dt);
  h.cd -= dt * (B.buff > 0 ? 1.25 : 1);
  let best = null, bd = 1e9;
  for (const e of B.enemies) { if (e.dead || e.hide > 0) continue; const d = Math.abs(e.x - h.x); if (d <= h.range && d < bd) { bd = d; best = e; } }
  if (!best) for (const tw of B.towers) if (!tw.dead && Math.abs(tw.x - 30 - h.x) <= h.range) best = tw;
  if (!best && Math.abs(B.nest.x - 40 - h.x) <= h.range) best = B.nest;
  if (best && h.cd <= 0) {
    const hs = B.hs; h.cd = h.rate; if (!h.moving) h.face = best.x >= h.x ? 1 : -1;
    h.atkAnim = 0.3;
    const targets = [best];
    const extra = Math.max(hs.cleave, hs.pierce) - 1;
    if (extra > 0 && !best.isStruct) { const near = B.enemies.filter(e => !e.dead && e !== best && (e.x - h.x) * h.face > -10 && Math.abs(e.x - h.x) <= h.range + (hs.pierce ? 50 : 14)).sort((a, b) => Math.abs(a.x - h.x) - Math.abs(b.x - h.x)); targets.push(...near.slice(0, extra)); }
    let dealt = 0;
    targets.forEach((t, i) => {
      const crit = Math.random() * 100 < hs.crit, dmg = h.atk * (B.buff > 0 ? 1.3 : 1) * (crit ? 2.2 : 1) * (i ? 0.7 : 1) * (t.isStruct ? HERO_STRUCT : 1);
      const before = t.hp; dealDmg(t, dmg, 'a', crit); dealt += Math.max(0, before - Math.max(0, t.hp));
      if (crit) { B.freeze = 0.045; fx('crit', { x: t.x, y: targetY(t) - 10, dur: 0.45 }); }
      if (hs.stun && !t.isStruct && !t.dead) { t.kb = (t.def && t.def.boss ? 4 : 18) * h.face; if (!(t.def && t.def.boss)) t.stun = 0.6; }
    });
    if (hs.steal && dealt) { const heal = dealt * hs.steal / 100; h.hp = Math.min(h.max, h.hp + heal); if (heal >= 3) addText(h.x - 10, GY - 96, '+' + Math.round(heal), '#7dff9a', 13); }
    const WFX = { sword: 0, axe: 1, spear: 2, hammer: 3, great: 4 }[hs.wk] || 0, wr = S.eq.weapon ? S.eq.weapon.r : 0;
    fx('slash', { x: h.x + h.face * 16, y: GY - 34, face: h.face, dur: 0.22, wk: hs.wk, col: ['#ffffff', '#c8ffd0', '#9fd8ff', '#ffd76a', '#ff9ef0'][wr], big: WFX === 4 });
    if (hs.wk === 'hammer') { fx('quake', { x: best.x, y: GY + 6, dur: 0.4 }); B.shake = Math.max(B.shake || 0, 0.12); }
    if (hs.wk === 'spear') fx('thrust', { x: h.x + h.face * 20, y: GY - 30, face: h.face, dur: 0.18, len: h.range });
    SFX.slash();
  }
  for (const d of B.drops) if (d.type !== 'coin' && !d.got && d.ground && Math.abs(d.x - h.x) < 56) pickup(d);
}
function updUnit(u, dt) {
  if (B.sleepy > 0 && u.side === 'a') dt *= 0.6; // v2.2 나루의 잠의 노래
  u.anim += dt; if (u.hit > 0) u.hit -= dt; if (u.atkAnim > 0) u.atkAnim -= dt;
  if (u.kb) { u.x += u.kb * dt * 6; u.kb *= Math.pow(0.02, dt); if (Math.abs(u.kb) < 1) u.kb = 0; }
  const dir = u.side === 'a' ? 1 : -1, buff = u.side === 'a' && B.buff > 0, aura = u.side === 'a' && !B.hero.dead && Math.abs(u.x - B.hero.x) < 170;
  if (u.side === 'a') { u.emT = (u.emT == null ? rnd(2, 7) : u.emT) - dt; if (u.em) { u.em.t -= dt; if (u.em.t <= 0) u.em = null; } if (u.emT <= 0) { const tr = TRAITS[u.kind]; u.emT = rnd(4, 8); if (u.hp < u.max * 0.3) emoteAt(u, 'sweat'); else if (tr) emoteAt(u, pick(tr.e)); }
    if (u.qk) { u.qk.t += dt; if (u.qk.t >= u.qk.T) u.qk = null; } else if (!u.moving && u.atkAnim <= 0 && !findTargetNear(u) && (u.qkT = (u.qkT == null ? rnd(4, 10) : u.qkT) - dt) <= 0) { u.qkT = rnd(9, 16); u.qk = { t: 0, T: 1.5 }; const bb = BREED[u.def.id]; if (bb) emoteAt(u, bb.em, 1.5); } }
  if (u.inv > 0) u.inv -= dt;
  if (u.stun > 0) { u.stun -= dt; u.moving = false; return; }
  if (u.third && u.side === 'a') { u.tcd -= dt; if (u.tcd <= 0) { u.tcd = (u.awk >= 3 ? 7 : 10); thirdSkill(u); } }
  if (u.side === 'a' && u.def.type === 'healer') {
    u.cd -= dt * (buff ? 1.3 : 1);
    let pt = null, pr = 0.92; const cands = B.allies.concat(B.hero.dead ? [] : [B.hero]);
    for (const o of cands) if (!o.dead && o !== u && Math.abs(o.x - u.x) <= u.range && o.hp / o.max < pr) { pr = o.hp / o.max; pt = o; }
    if (pt) { u.moving = false; if (u.cd <= 0) { u.cd = u.rate; u.atkAnim = 0.3; B.proj.push({ x: u.x + 14, y: GY + u.y - 40, t: pt, dmg: 0, heal: u.heal, side: 'a', kind: 'heart', spd: 300, a: 0, lx: pt.x, ly: targetY(pt), trail: [] }); } return; }
    let front = B.base.x + 60; for (const a of B.allies) if (a !== u && a.def.type !== 'healer') front = Math.max(front, a.x);
    if (u.x > front - 60 && !findTarget(u)) { u.moving = false; return; }
  }
  const t = findTarget(u); u.cd -= dt * (buff ? 1.3 : 1);
  if (t) { u.moving = false; if (u.cd <= 0) { u.cd = u.rate; attack(u, t, u.atk * (buff ? 1.4 : 1) * (aura ? 1.2 : 1)); } }
  else if (u.root > 0) { u.moving = false; }
  else { u.moving = true; u.x += dir * u.spd * (buff ? 1.3 : 1) * (B.rallyT > 0 && u.side === 'a' ? 3 : 1) * dt; } /* v4.9 보스를 이기면 20초 돌격 (우리 편 2.5배 빠르게) */
  if (u.root > 0) u.root -= dt;
  if (u.side === 'a') { let lim = B.nest.x - 40; for (const tw of B.towers) if (!tw.dead && tw.x > u.x - 30) lim = Math.min(lim, tw.x - 30); u.x = Math.min(u.x, lim); } else u.x = Math.max(u.x, B.base.x + 40);
}
function attack(u, t, dmg) {
  u.atkAnim = 0.3;
  if (u.pcrit && Math.random() < u.pcrit) { dmg *= 2; fx('crit', { x: t.x, y: targetY(t) - 10, dur: 0.4 }); }
  const ty = u.def.type, ranged = ty === 'ranged' || ty === 'magic' || u.def.ranged;
  const dt2 = u.def.type;
  if (dt2 === 'mortar') { const dir = 1; B.proj.push({ x: u.x + 14, y: GY + u.y - 40, t, dmg, side: u.side, splash: u.def.splash, kind: 'bomb', spd: 260, a: 0, lx: t.x, ly: targetY(t), trail: [], arc: 1, sx: u.x + 14, sy: GY + u.y - 40, prog: 0, dist: Math.max(40, Math.abs(t.x - u.x)) }); fx('spark', { x: u.x + 22, y: GY + u.y - 44, dur: 0.25, col: '#ffcf6b', r: 18 }); return; }
  if (dt2 === 'lancer' && u.side === 'a') { const hits = B.enemies.filter(e => !e.dead && e.x - u.x > -10 && e.x - u.x <= u.range + 30).sort((a, b) => a.x - b.x).slice(0, u.def.pierce || 2); if (!hits.length) hits.push(t); hits.forEach(h => dealDmg(h, dmg, 'a')); fx('thrust', { x: u.x + 12, y: GY + u.y - 22, face: 1, dur: 0.16, len: u.range + 30 }); return; }
  if (dt2 === 'assassin' && u.side === 'a') { const crit = Math.random() * 100 < (u.def.crit || 0); dealDmg(t, dmg * (crit ? 2.5 : 1), 'a', crit); if (crit) fx('crit', { x: t.x, y: targetY(t) - 6, dur: 0.4 }); fx('slash', { x: u.x + 12, y: GY + u.y - 20, face: 1, dur: 0.14, small: true, col: '#e1a8ff' }); return; }
  if (dt2 === 'giant' && u.side === 'a') { dealDmg(t, dmg, 'a'); if (!t.isStruct && !t.dead && !(t.def && t.def.boss)) { t.kb = 22; t.stun = 0.35; } fx('quake', { x: t.x, y: GY + 6, dur: 0.35 }); return; }
  if (ranged) {
    const dir = u.side === 'a' ? 1 : -1;
    B.proj.push({ x: u.x + dir * 18, y: GY + u.y - 30, t, dmg, side: u.side, splash: u.def.splash || 0, kind: ty === 'magic' ? 'orb' : u.side === 'e' ? 'spit' : 'arrow', spd: ty === 'magic' ? 380 : 480, a: 0, lx: t.x, ly: targetY(t), trail: [] });
  } else { dealDmg(t, dmg, u.side); if (u.side === 'a' && (ty === 'elite' || ty === 'melee')) fx('slash', { x: u.x + 14, y: GY + u.y - 26, face: 1, dur: 0.16, small: true }); }
}
function updProj(dt) {
  gRanged = true; try {
  for (const p of B.proj) {
    const t = p.t; let tx, ty;
    if (t.dead) { tx = p.lx; ty = p.ly; } else { tx = t.x; ty = targetY(t); p.lx = tx; p.ly = ty; }
    if (p.arc) {
      p.prog = Math.min(1, p.prog + p.spd * dt / p.dist); const q = p.prog;
      const nx = p.sx + (tx - p.sx) * q, ny = p.sy + (ty - p.sy) * q - Math.sin(q * Math.PI) * (60 + p.dist * 0.25);
      p.a += dt * 12; p.trail.push([p.x, p.y]); if (p.trail.length > 6) p.trail.shift(); p.x = nx; p.y = ny;
      if (q >= 1) { p.done = true; const list = B.enemies; for (const o of list) if (!o.dead && Math.abs(o.x - tx) < p.splash) dealDmg(o, o === t ? p.dmg : p.dmg * 0.75, 'a'); if (!t.dead && t.isStruct) dealDmg(t, p.dmg, 'a'); fx('boom', { x: tx, y: GY + 4, dur: 0.5, r: p.splash }); B.shake = Math.max(B.shake || 0, 0.08); }
      continue;
    }
    const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy), stp = p.spd * dt;
    p.a = Math.atan2(dy, dx); p.trail.push([p.x, p.y]); if (p.trail.length > 6) p.trail.shift();
    if (d <= stp + 6) {
      p.done = true;
      if (p.kind === 'heart') { if (!t.dead) { t.hp = Math.min(t.max, t.hp + p.heal); addText(t.x, targetY(t) - 20, '+' + Math.round(p.heal), '#7dff9a', 15); burst(t.x, targetY(t), '#ff9ec7', 8, 90, true); } continue; }
      if (!t.dead) dealDmg(t, p.dmg, p.side);
      if (p.splash) { const list = p.side === 'a' ? B.enemies : B.allies; for (const o of list) if (o !== t && !o.dead && Math.abs(o.x - tx) < p.splash) dealDmg(o, p.dmg * 0.6, p.side); ring(tx, ty + 20, '#b388ff', p.splash); burst(tx, ty, '#d1b3ff', 10, 140, true); }
    } else { p.x += dx / d * stp; p.y += dy / d * stp; }
  }
  B.proj = B.proj.filter(p => !p.done);
} finally { gRanged = false; }
}
function updDrops(dt) {
  for (const d of B.drops) {
    d.t += dt;
    if (!d.ground) { d.vy += 900 * dt; d.x += d.vx * dt; d.y += d.vy * dt; if (d.y >= d.gy) { if (d.vy > 150) { d.y = d.gy; d.vy *= -0.35; d.vx *= 0.6; } else { d.y = d.gy; d.ground = true; d.vx = 0; d.vy = 0; } } }
    if (d.type === 'coin' && d.t > 0.75 && !d.got) { d.got = true; B.fly.push({ x: d.x - B.camX, y: d.y - 8, sx: d.x - B.camX, sy: d.y - 8, t: 0, val: d.val }); }
    d.life -= dt;
  }
  B.drops = B.drops.filter(d => !d.got && d.life > 0);
  for (const f of B.fly) { f.t += dt / 0.55; if (f.t >= 1 && !f.done) { f.done = true; B.coins += Math.round(f.val * (B.pvp || B.special ? 1 : (petEff() || {}).coin || 1)); B.coinPulse = 0.25; SFX.coin(); } }
  B.fly = B.fly.filter(f => !f.done);
}
function updFx(dt) {
  if (B.punch > 0) B.punch = Math.max(0, B.punch - dt * 1.2); if (B.dark > 0) B.dark -= dt; if (B.skillCut) { B.skillCut.t -= dt; if (B.skillCut.t <= 0) B.skillCut = null; }
  for (const a of B.allies) if (a.hop > 0) a.hop -= dt; if (B.sleepy > 0) B.sleepy -= dt;
  for (const f of B.fx) if (f.type === 'meteor') { if (f.delay > 0) { f.delay -= dt; f.t = 0; } else if (!f.hit && f.t >= f.dur * 0.8) { f.hit = true; if (f.target && !(f.target.dead) && f.target.hp > 0) dealDmg(f.target, f.dmg, 'a', true); fx('boom', { x: f.x, y: f.y + 4, dur: 0.45, r: 46 }); B.shake = Math.max(B.shake || 0, 0.15); } }
  for (const p of B.parts) { p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; if (p.rot !== undefined) p.rot += dt * 8; }
  B.parts = B.parts.filter(p => p.life > 0);
  for (const t of B.texts) { if (t.vx == null) t.vx = rnd(-26, 26); const age = t.max - t.life; t.x += t.vx * dt * (age < 0.4 ? 1 : 0.2); t.y -= (age < 0.25 ? 110 : 26) * dt; t.life -= dt; } B.texts = B.texts.filter(t => t.life > 0);
  for (const r of B.rings) { r.life -= dt; r.r += (r.max - r.r) * Math.min(1, dt * 10); } B.rings = B.rings.filter(r => r.life > 0);
  for (const f of B.fx) f.t += dt; B.fx = B.fx.filter(f => f.t < f.dur);
  for (const a of B.amb) { a.ph += dt; a.x += (a.vx + Math.sin(a.ph * 1.5) * 12) * dt; a.y += a.vy * dt; if (a.y > H + 20 || a.y < -30 || a.x > W + 20 || a.x < -20) Object.assign(a, newAmb(false), a.k === 'sand' ? { x: -10, y: rnd(150, GY) } : {}); }
  if (B.msg) { B.msg.t -= dt; if (B.msg.t <= 0) B.msg = null; }
  if (B.cut) { B.cut.t -= dt; if (B.cut.t <= 0) B.cut = null; }
  if (B.bubble) { B.bubble.t -= dt; if (B.bubble.t <= 0) B.bubble = null; }
  if (B.banner > 0) B.banner -= dt;
  if (B.cardMsg) { B.cardMsg.t -= dt; if (B.cardMsg.t <= 0) B.cardMsg = null; }
  if (B.cardShake) { B.cardShake.t -= dt; if (B.cardShake.t <= 0) B.cardShake = null; }
  if (B.cardPop) { B.cardPop.t -= dt; if (B.cardPop.t <= 0) B.cardPop = null; }
  if (B.shake > 0) B.shake -= dt; if (B.coinPulse > 0) B.coinPulse -= dt;
  if (B.base.hit > 0) B.base.hit -= dt; if (B.nest.hit > 0) B.nest.hit -= dt;
  for (const tw of B.towers) { if (tw.hit > 0) tw.hit -= dt; if (!tw.dead && tw.hp <= 0) { tw.dead = true; B.shake = 0.5; burst(tw.x, GY - 60, '#e1a8ff', 40, 260, true); poof(tw.x, GY - 30, '#7e57c2', 14); fx('boom', { x: tw.x, y: GY + 4, dur: 0.6, r: 90 }); const left = B.towers.filter(t => !t.dead).length; B.msg = { t: 2.4, s: left ? `그림자 토템 파괴! (남은 토템 ${left})` : '모든 토템 파괴! 둥지 방어막이 사라졌다!' }; B.coins += Math.round((30 + B.n * 4) * COIN_RATE); SFX.slam(); for (const e of B.enemies) if (!e.dead && !(e.def && e.def.boss) && Math.abs(e.x - tw.x) < 280) { e.stun = Math.max(e.stun || 0, 1.8); e.kb = 26; emoteAt(e, '!', 1.6); } addText(tw.x, GY - 120, '토템이 무너졌다! 몬스터들이 깜짝!', '#ffe08a', 15); } } /* v4.2 토템이 부서지면 근처 몬스터가 1.8초 겁먹고 뒤로 밀림 (토템 2개 판이 늦은 판에서 4분 넘음) */
}
/* v1.1 보스전 시작 연출: 카메라가 보스로 → 포효 → 기사에게 돌아와 미르가 날개를 펼침 (2.4초) */
function updIntro(dt) {
  const I = B.intro; I.t += dt; updFx(dt); B.t += 0;
  const bx = I.b ? I.b.x : B.nest.x - 120, toBoss = clamp(bx - W * 0.62, 0, B.world - W), toHero = clamp(B.hero.x - W * 0.42, 0, B.world - W);
  if (I.t < 0.9) B.camX += (toBoss - B.camX) * Math.min(1, dt * 5);
  else if (I.t < 1.55) { if (!I.roar) { I.roar = true; SFX.growl(); SFX.boss(); B.shake = 0.7; if (I.b) { I.b.atkAnim = 0.5; addText(I.b.x, GY - 230, '크아아앙!', '#ff8a80', 30, true); } fx('wave', { x: bx, y: GY - 60, dur: 0.7 }); } }
  else { B.camX += (toHero - B.camX) * Math.min(1, dt * 6); if (!I.wing && I.t > 1.75) { I.wing = true; B.hero.atkAnim = 0.45; ring(B.hero.x, GY - 60, '#ffe082', 140); addText(B.hero.x, GY - 170, mounted() ? '미르, 날개를 펴!' : '멍멍기사 출격!', '#fff3c4', 22, true); burst(B.hero.x, GY - 70, '#ffe082', 22, 260, true); SFX.storm(); } }
  if (B.hero.atkAnim > 0) B.hero.atkAnim -= dt; if (I.b && I.b.atkAnim > 0) I.b.atkAnim -= dt;
  for (const t of B.texts) { t.y -= 30 * dt; t.life -= dt; } B.texts = B.texts.filter(t => t.life > 0);
  if (B.shake > 0) B.shake -= dt;
  if (I.t >= I.T) { B.intro = null; B.cut = { k: I.k, t: 2.4 }; say(pick(LINES.boss)); }
}
function drawIntroBars() {
  const I = B.intro; if (!I) return; const a = Math.min(1, I.t * 4, (I.T - I.t) * 4), h = 46 * a;
  ctx.fillStyle = '#0a0604'; ctx.fillRect(-OX, 0, VW, h); ctx.fillRect(-OX, H - h, VW, h);
  if (I.t > 0.5 && I.t < 1.7) { ctx.save(); ctx.globalAlpha = Math.min(1, (I.t - 0.5) * 4, (1.7 - I.t) * 4); bigText(ENEMIES[I.k].name, W / 2, H - 24, 24, '#ffcdd2', '#c62828'); ctx.restore(); }
  ctx.save(); ctx.globalAlpha = 0.6 * a; txt('▶▶ 화면을 누르면 건너뛰기', W - 120, h / 2, 11, '#fff3c4', 'center', false); ctx.restore();
}
function updBattle(dt) {
  if (B.paused) return;
  updFx(dt);
  if (B.over) { updDrops(dt); return; }
  updPet(dt);
  // v1.4 동료 없이 기사 혼자 둥지에 붙어 있으면 둥지가 조금씩 회복 (동료와 함께 싸우도록)
  if (!B.hero.dead && B.hero.x > B.nest.x - 320 && !B.allies.some(a => !a.dead && a.x > B.nest.x - 320) && B.nest.hp > 0 && !(B.bossDone && !B.enemies.some(e => !e.dead && e.def.boss))) B.nest.hp = Math.min(B.nest.max, B.nest.hp + B.nest.max * 0.0015 * dt); // v2.3 둥지 회복 절반 · 보스를 쓰러뜨린 뒤엔 회복 없음
  if (B.pvp && B.t > 120 && !B.over) { let pa = B.hero.dead ? 0 : B.hero.hp, pe = 0; for (const a of B.allies) if (!a.dead) pa += a.hp; for (const e of B.enemies) if (!e.dead) pe += e.hp; const sum = Math.max(1, pa + pe), k = 0.006 * dt * Math.min(3, (B.t - 120) / 20);
    B.base.hp = Math.max(1, B.base.hp - B.base.max * k * 2 * pe / sum); B.nest.hp = Math.max(1, B.nest.hp - B.nest.max * k * 2 * pa / sum); } /* v4.8 대전 2분부터: 남은 군대(체력 합)가 적은 쪽 성이 더 빨리 무너짐 → 3분 비김이 줄고 힘 센 쪽이 이김 */
  if (B.pvp && B.pvpHero && !B.pvpHero.dead && !B.over) { const e = B.pvpHero; e.skT = (e.skT == null ? 6 : e.skT) - dt; if (e.skT <= 0 && !(e.stun > 0)) { const sk = e.oppSk || 0, rg = sk === 1 ? 200 : 150, tg = B.allies.concat(B.hero.dead ? [] : [B.hero]).filter(a => !a.dead && a.x < e.x + 20 && a.x > e.x - rg); if (tg.length) { e.skT = 9; e.atkAnim = 0.45;
      if (sk === 0) { ring(e.x - 50, GY - 10, '#ff6a5a', 120); burst(e.x - 60, GY - 20, '#ffb3a0', 14, 160, true); addText(e.x, GY - 150, '상대 기사 · 멍멍 강타!', '#ffd0c0', 17, true); for (const a of tg) { dealDmg(a, e.atk * 2.2, 'e'); a.kb = -30; } }
      else if (sk === 1) { ring(e.x - 20, GY - 40, '#ffe27a', 200); addText(e.x, GY - 150, '상대 기사 · 우렁찬 짖기!', '#fff3a0', 17, true); SFX.bark && SFX.bark(); for (const a of tg) { dealDmg(a, e.atk * 1.2, 'e'); if (!a.isHero) a.stun = Math.max(a.stun || 0, 1.4); } }
      else { const x0 = e.x; e.x = Math.max(B.base.x + 120, e.x - 120); burst(x0 - 40, GY - 20, '#c8e0ff', 16, 200, true); addText(e.x, GY - 150, '상대 기사 · 돌진!', '#d0e8ff', 17, true); for (const a of tg) if (a.x >= e.x - 30) { dealDmg(a, e.atk * 1.8, 'e'); a.kb = -45; } } } else e.skT = 1; } } /* v4.8 견종마다 기술: 강타 · 짖기(1.4초 기절) · 돌진 */ /* v4.7 상대 기사 기술: 9초마다 앞쪽 150 안에 강타 + 살짝 밀기 */
  if (B.pvp && B.pvpHero && B.pvpHero.dead && !B.over) { B.pvpHeroT += dt; if (B.pvpHeroT >= 20) { pvpHeroSpawn(); B.msg = { t: 2, s: '상대 기사가 다시 나왔어요!' }; } }
  if (B.rallyT > 0) B.rallyT -= dt;
  B.t += dt; const hs = B.hs; if (B.creg && B.base.hp > 0) B.base.hp = Math.min(B.base.max, B.base.hp + B.base.max * B.creg * dt); /* v4.6 무지개 동화성: 성 회복 */
  if (B.tut > 0) B.tut -= dt;
  if (B.goldT > 0) B.goldT -= dt; B.food = Math.min(hs.fdMax, B.food + hs.fdR * dt * (B.fdK || 1) * (B.goldT > 0 ? 2 : 1) * (1 + (((B.pvp || B.special) ? null : petEff()) || {}).food || 1)); /* v4.4 황금 뼈다귀 · v4.8 펫 */ B.mana = Math.min(hs.mpMax, B.mana + hs.mpR * dt * (1 + ((((B.pvp || B.special) ? null : petEff()) || {}).mana || 0)));
  for (let i = 0; i < B.ucd.length; i++) if (B.ucd[i] > 0) B.ucd[i] -= dt;
  if (B.queue != null && spawnAlly(B.queue)) { B.cardPop = { i: B.queue, t: 0.25 }; B.queue = null; }
  for (let i = 0; i < B.scd.length; i++) if (B.scd[i] > 0) B.scd[i] -= dt;
  if (B.buff > 0) B.buff -= dt;
  if (B.ccd) for (let i = 0; i < B.ccd.length; i++) if (B.ccd[i] > 0) B.ccd[i] -= dt;
  updHero(dt);
  const si = B.si, ratio = B.nest.hp / B.nest.max;
  B.spawnT -= dt;
  /* v3.4 성 지킴이 짖기: 성 가까이(170) 온 적을 1.5초마다 짖어 혼내 줌 — 땅굴 두더지가 성 앞에 쌓여 성이 지던 문제(17·27·37·34·39판) 해결 */
  B.gdT = (B.gdT || 0) - dt; if (B.gdT <= 0) { const tg = B.enemies.filter(e => !e.dead && !(e.hide > 0) && e.x - B.base.x < 170).sort((p, q) => p.x - q.x)[0]; if (tg) { const lowB = B.base.hp / B.base.max < 0.6; B.gdT = (lowB ? 1.2 : 2.0) * (B.hero.dead ? 0.5 : 1); /* v4.7 기사가 쓰러져 있으면 성 지킴이가 2배 자주 짖음 */ dealDmg(tg, tg.def.boss ? tg.max * 0.01 : Math.max(tg.max * (lowB ? 0.2 : 0.14), 15), 'a'); /* v3.8 성 체력 60% 아래면 더 자주·세게 (어려움 39판: 성이 100초 만에 무너짐) */ /* v3.5 너무 쉬워져서 24% → 14%, 1.5초 → 2초 */ ring(B.base.x + 40, GY - 50, '#ffe08a', 60); addText(tg.x, GY - 60, '성 지킴이 멍!', '#ffe08a', 13); } else B.gdT = 0.3; }
  if (B.raidWarn) { B.raidWarn.t -= dt; if (B.raidWarn.t <= 0) { spawnEnemy(B.raidWarn.k); const ne = B.enemies[B.enemies.length - 1]; if (ne) ne.raid = 1; B.raidWarn = null; B.spawnT += B.si.interval * 1.2; } /* 강한 몬스터가 나오면 다음 보통 몬스터는 조금 늦게 */ }
  if (B.spawnT <= 0 && B.enemies.length >= 22) B.spawnT = 0.5;
  if (B.spawnT <= 0) {
    B.spawnT = si.interval * rnd(0.6, 1.3) * (ratio < 0.5 ? 0.9 : 1) * (si.boss && B.enemies.some(e => !e.dead && e.def.boss) ? (B.n >= 110 && !B.special ? 5 : 1.6) : 1) * (B.pvp && B.t > 75 ? 1.7 : 1) * (B.bossCrack ? (S.diff === 2 ? 4 : 2.5) : 1) * (B.t > 240 && !B.pvp && !B.special ? 1 + (B.t - 240) / 60 : 1) /* v5.0 4분이 넘으면 졸개가 점점 느리게 (어려움 333판: 10분 넘게 비김) */ /* v4.7 보스를 이긴 뒤엔 졸개가 2.5배 느리게 (어려움: 보스 뒤 졸개 줄에 막혀 10분 넘게 못 끝냄) */ /* v4.6 대전 75초부터 상대 출전 느리게 (봇: 서로 한 대도 못 치고 3분 끝나는 판이 많았음) */ * (si.totems && B.n > 250 ? 1.2 : 1) / si.swarm /* v4.2 251판부터 토템 판 소환 1.2배 느리게 */ /* v3.9 보스와 싸우는 동안 졸개는 천천히 */ * (B.t > 100 && !B.special ? 1 + Math.min(1, (B.t - 100) / 120) : 1); /* v3.7 100초부터(전엔 3분) · v3.0 4분 넘으면 몬스터도 천천히 나옴(최대 2배 간격) → 밀고 당기기 끝내기 */
    if (si.raid && B.t > 25 && !B.raidWarn && Math.random() < 0.2 && B.enemies.filter(e => e.raid).length < 2) { const strong = ['wolf', 'golem', 'sknight'].filter(k => B.n > 10 || k === 'wolf'); B.raidWarn = { t: 2.2, k: pick(strong) }; SFX.growl(); } /* v3.4 강습: 2초 전에 예고 화살표 · 강한 몬스터는 한 번에 2마리까지 · 처음 25초는 없음 */
    /* v3.6 원거리 몬스터(독두꺼비 등)와 돌골렘은 한 번에 4마리까지 — 봇 1초 기록: 4분 넘는 판에서 두꺼비 평균 6.7마리(13~21판), 골렘 5~8마리(25~30판)가 쌓여 전진이 막혔음 */
    const heavy = q => ENEMIES[q] && (ENEMIES[q].ranged || q === 'golem'); /* 원거리 · 돌골렘(튼튼함)은 4마리까지 · v3.7 땅굴 두더지는 3마리까지 (어려움 39판: 두더지 5~6마리가 성을 무너뜨림) */ const pickE = k => { if ((heavy(k) && B.enemies.filter(e => e.kind === k).length >= 4) || (k === 'digger' && B.enemies.filter(e => e.kind === k).length >= 3)) { const alt = si.pool.filter(q => !heavy(q)); return alt.length ? pick(alt) : k; } return k; };
    spawnEnemy(pickE(si.pool[Math.floor(Math.pow(Math.random(), 1.3) * si.pool.length)]));
    if (Math.random() < Math.min(0.45, 0.15 + B.n * 0.015)) spawnEnemy(pickE(pick(si.pool)), 20);
  }
  // v2.7 둥지 반격: 둥지 가까이(300) 버티는 동료를 1.8초마다 3명까지 때림 (둥지 앞에서 몬스터를 바로 잡아 버리는 「입구 막기」 방지)
  for (const e of B.enemies) if (e.shield > 0) e.shield -= dt; if (B.drumT > 0) B.drumT -= dt; if (B.charmT > 0) B.charmT -= dt; if (B.alloutT > 0) B.alloutT -= dt; if (B.heroShield > 0) B.heroShield -= dt; if (B.tstopT > 0) B.tstopT -= dt;
  if (B.nest.hp > 0) { B.nestT = (B.nestT == null ? 2 : B.nestT) - dt; if (B.nestT <= 0) { B.nestT = 1.8; const near = B.allies.filter(a => !a.dead && a.x > B.nest.x - 300).sort((a, b) => b.x - a.x).slice(0, 3); if (!B.hero.dead && B.hero.x > B.nest.x - 300) near.push(B.hero);
    for (const a of near) { dealDmg(a, 9 * B.si.am * (B.special ? 1.2 : 1), 'e'); B.parts.push({ x: B.nest.x - 20, y: GY - 120, vx: (a.x - B.nest.x) * 3, vy: -60, g: 200, life: 0.3, max: 0.3, col: '#c88aff', size: 5, glow: true }); ring(a.x, GY - 30, '#c88aff', 30); }
    if (near.length && !B.nestTip) { B.nestTip = 1; addText(B.nest.x - 80, GY - 170, '둥지 반격! 둥지 앞에서 오래 버티면 아파요', '#e0c8ff', 14, true); } } }
  // v2.4 몬스터 떼 (팔라독류처럼 가끔 한꺼번에 밀려와 앞줄을 밀어붙임): 4판부터, 35~50초마다
  if ((B.n >= 4 || B.special) && B.trial == null) { if (B.surgeT == null) B.surgeT = 30 + rnd(0, 8); const bossOn = B.si.boss && B.enemies.some(e => !e.dead && e.def.boss); B.surgeT -= bossOn ? 0 : dt; /* v3.9 보스가 있는 동안은 몰려오기 멈춤 */
    if (B.surgeT <= 0) { const D = S.diff != null ? S.diff : 1, cnt = Math.min(10, Math.round((3 + B.n / 12) * [0.6, 1, 1.35][D])); B.surgeT = rnd(35, 50); B.warnSurge = 2.2;
      B.surgeBanner = 2.4; SFX.growl && SFX.growl();
      const ln = B.lanes ? (Math.random() < 0.5 ? 0 : 1) : null; B.surgeLane = ln; for (let q = 0; q < cnt; q++) B.later.push({ t: 2 + q * 0.35, fn: () => { B.forceLane = ln; spawnEnemy(si.pool[Math.floor(Math.random() * si.pool.length)], rnd(0, 30)); B.forceLane = null; } }); } }
  if (B.surgeBanner > 0) B.surgeBanner -= dt;
  if (si.mid && !B.midDone && ratio < 0.6) { B.midDone = true; spawnEnemy(si.midKey, 0, true); B.cut = { k: si.midKey, t: 2.2, T: 2.2, elite: true }; SFX.growl(); B.shake = 0.4; }
  if (si.boss && B.bossDone && !B.bossCrack && B.n >= 110 && !B.special && !B.enemies.some(e => !e.dead && e.def.boss)) { B.bossCrack = 1; B.rallyT = 30; for (const e of B.enemies) if (!e.dead && !e.def.boss) { e.dead = true; e.fled = 1; burst(e.x, GY - 30, '#ffffff', 6, 90); } /* v5.0 보스가 쓰러지면 남은 졸개들은 도망 (보스 뒤 끝이 1~2분 걸렸음) */ B.nest.hp = Math.min(B.nest.hp, B.nest.max * (S.diff === 2 ? 0.05 : 0.2)); B.shake = 0.6; B.msg = { t: 2.4, s: '보스가 쓰러지자 졸개들이 도망가요! 모두 돌격!' }; } /* v4.6 121판부터: 보스를 이기면 둥지 체력이 40% 아래로 (보스 뒤 마무리가 길었음) */
  if (si.boss && !B.bossDone && (ratio < bossAt() || (bossAt() > 0.6 && B.t > 60))) { /* v4.6 보통 121판부터는 90초가 지나도 보스 등장 */
    B.bossDone = true; spawnEnemy(si.bossKey);
    for (const a of B.allies) emoteAt(a, '!', 2.2); emoteAt(B.hero, '!', 2.2);
    const bb = B.enemies.find(e => e.def.boss); B.intro = { t: 0, T: 2.4, k: si.bossKey, b: bb, cam0: B.camX, roar: false, wing: false }; musicFor();
  }
  if (!B.rush && !B.bossCrack && ratio < 0.3 && !(si.boss && B.enemies.some(e => !e.dead && e.def.boss))) { B.rush = true; for (let i = 0; i < (si.boss ? (B.n >= 110 && !B.special ? 6 : 2 + Math.floor(B.n / 6)) : 4 + Math.floor(B.n / 3)); i++) /* v4.6 121판부터 보스 판 마지막 돌격은 6마리 (예전 22~68마리 → 보스 뒤 끝이 안 남) */ /* v3.9 보스 판: 보스가 있는 동안은 러시 없음 · 러시 수 절반 */ spawnEnemy(pick(si.pool), i * 18); B.msg = { t: 2.4, s: '둥지가 화났어요! 몬스터 러시!' }; }
  updEvents(dt);
  if (B.slow > 0) B.slow -= dt;
  for (const a of B.allies) updUnit(a, B.slow > 0 ? dt * 0.5 : dt);
  if (B.gears && B.gears.length) { for (const gq of B.gears) { gq.x += gq.v * dt; gq.rot = (gq.rot || 0) + dt * 9; for (const t of foesIn(gq.x - gq.r, gq.x + gq.r)) if (!gq.hit.has(t)) { gq.hit.add(t); dealDmg(t, gq.A, 'e'); if (!t.isHero && !t.dead) t.stun = Math.max(t.stun || 0, 0.3); } if (Math.random() < 0.4) B.parts.push({ x: gq.x, y: GY + 4, vx: rnd(20, 80), vy: rnd(-80, -20), life: 0.4, max: 0.4, col: '#ffd34d', size: 3, g: 300 }); } B.gears = B.gears.filter(gq => gq.x > B.base.x && gq.x0 - gq.x < 460); }
  for (const e of B.enemies) {
    if (e.def.dig && !e.dug && !e.dead && !(e.stun > 0)) { let fr = B.hero.dead ? -1e9 : B.hero.x; for (const a of B.allies) if (!a.dead && a.x > fr) fr = a.x; if (fr > B.base.x + 200 && e.x - fr < 150 && B.enemies.filter(o => o.dug && !o.dead).length < 1) { e.dug = true; e.hide = 2.6; e.hideTo = B.base.x + 70 + rnd(0, 40); poof(e.x, GY - 10, '#8a5a35', 10); addText(e.x, GY - 70, '파바박!', '#e8c8a0', 14); if (!S.digTip) { S.digTip = 1; B.msg = { t: 3.4, s: '땅굴 두더지가 성 앞까지 파고들어요! 성 근처에 동료를 남겨 두세요' }; } } }
    if ((e.def.boss || e.hide > 0) && bossSkill(e, dt)) continue; updUnit(e, dt); }
  if (B.later.length) { for (const L of B.later) { L.t -= dt; if (L.t <= 0 && !L.done) { L.done = true; L.fn(); } } B.later = B.later.filter(L => !L.done); }
  if (B.silence > 0) B.silence -= dt; if (B.bossSk) { B.bossSk.t -= dt; if (B.bossSk.t <= 0) B.bossSk = null; }
  for (const w of B.warns) { w.t -= dt; if (w.t <= 0 && !w.done) { w.done = true; if (w.fn && !(w.src && w.src.dead)) w.fn(); } }
  B.warns = B.warns.filter(w => !w.done);
  if (B.reflectQ && B.reflectQ.length) { const q = B.reflectQ; B.reflectQ = []; for (const [o, d] of q) { dealDmg(o, d, 'e'); fx('spark', { x: o.x, y: GY - 40, dur: 0.3, col: '#9feaff', r: 22 }); } }
  updProj(dt); updDrops(dt);
  B.allies = B.allies.filter(u => !u.dead); B.enemies = B.enemies.filter(u => !u.dead);
  if (!B.hero.dead) { B.look = (B.look || 0) + ((B.hero.moving ? B.hero.face * 70 : 0) - (B.look || 0)) * Math.min(1, dt * 2.5); const tx = clamp(B.hero.x - W * 0.42 + B.look, 0, B.world - W); B.camX += (tx - B.camX) * Math.min(1, dt * 4.5); }
  else B.camX += (0 - B.camX) * Math.min(1, dt * 2);
  if (B.nest.hp <= 0) endBattle(true); else if (B.base.hp <= 0) endBattle(false); else if (B.pvp && B.t >= 180 && !B.over) { B.pvpTime = 1; endBattle(pvpJudge()); } /* v4.5 1:1 대전은 3분 · 시간이 다 되면 성 체력이 더 많이 남은 쪽이 이김 */
}
/* ---------------- v0.8 보스 고유 기술 ---------------- */
// v2.3 새 수집물: 옛 기사의 메달 7개 (시즌 14부터, 무지개 다리 다음 여정)
const MEDALS = [
  { n: '약속', at: 380, by: '바둑이', c: '#ffd34d' }, { n: '웃음', at: 400, by: '광대 기사 방실', c: '#ff9ac8' }, { n: '???', at: 999, by: '시즌 16~', c: '#c8c8d8' }, { n: '???', at: 999, by: '???', c: '#c8c8d8' },
  { n: '???', at: 999, by: '???', c: '#c8c8d8' }, { n: '???', at: 999, by: '???', c: '#c8c8d8' }, { n: '???', at: 999, by: '???', c: '#c8c8d8' },
];
const medalsOwned = () => MEDALS.filter(q => S.cleared >= q.at).length;
const BOSS_SK = {
  kkuruk: { n: '꾸룩 분열', cd: 9 }, troll: { n: '대지 내려찍기', cd: 8 }, scorp: { n: '맹독 꼬리침', cd: 7 }, frost: { n: '얼음 감옥', cd: 9 },
  nox: { n: '그림자 돌진', cd: 8 }, kraken: { n: '촉수 끌어당기기', cd: 8 }, owl: { n: '폭풍 번개', cd: 8 }, cgolem: { n: '프리즘 반사막', cd: 12 },
  sbori: { n: '거울 멍멍 강타', cd: 7 }, void: { n: '침묵의 장막', cd: 12 }, whale: { n: '은하 물기둥', cd: 9 }, fenrir: { n: '별 삼키기', cd: 12 },
  mole: { n: '드릴 잠행', cd: 9 }, bonedra: { n: '뼈의 숨결', cd: 9 },
  cogowl: { n: '톱니 굴리기', cd: 9.5 }, tcat: { n: '시간 먹기', cd: 12 },
  jelly: { n: '졸음 거품', cd: 10 }, dmir: { n: '악몽 불꽃', cd: 10.5 },
  rainturtle: { n: '일곱 빛 줄다리', cd: 10 }, shadowchild: { n: '숨바꼭질', cd: 9 },
  mtgiant: { n: '쉿! 눈사태', cd: 10.5 }, echofairy: { n: '따라쟁이 메아리', cd: 9.5 },
  camelbot: { n: '모래 돌진', cd: 9.5 }, mossbear: { n: '자장 포옹', cd: 10 }, thunderbird: { n: '천둥 날개', cd: 10 }, icepenguin: { n: '꽁꽁 닻', cd: 10 }, bellknight: { n: '잊음의 종소리', cd: 10 }, drumgiant: { n: '쿵쾅 겁주기', cd: 10 }, toyking: { n: '멈춤 태엽 행진', cd: 11 }, badukshadow: { n: '후회의 성문', cd: 11 }, songwhale: { n: '잠의 물결', cd: 11 }, windelder: { n: '폭풍 왕관', cd: 11 }, dawndeer: { n: '멈춘 시간', cd: 10.5 }, starfox: { n: '별 흥정', cd: 11 },
  catgen: { n: '냥냥 연속 펀치', cd: 9 }, roc: { n: '깃털 폭풍', cd: 10 }, badger: { n: '땅울림 북', cd: 10 }, seaspirit: { n: '이름 삼키는 파도', cd: 11 },
  spiderq: { n: '별실 그물', cd: 10 }, shadowk: { n: '거울 기술', cd: 9 },
};
function foesIn(x0, x1) { const a = B.allies.filter(u => !u.dead && u.x >= x0 && u.x <= x1); if (!B.hero.dead && B.hero.x >= x0 && B.hero.x <= x1) a.push(B.hero); return a; }
function zoneHit(x0, x1, dmg, o) { o = o || {}; for (const t of foesIn(x0, x1)) { dealDmg(t, dmg, 'e'); if (t.dead) continue; if (o.stun) t.stun = Math.max(t.stun || 0, o.stun); if (o.root) t.root = Math.max(t.root || 0, o.root); if (o.kb && !t.isHero) t.kb = o.kb; if (o.kb && t.isHero) t.x = clamp(t.x + o.kb * 0.8, B.base.x + 20, B.nest.x - 50); } }
function warnZone(src, x0, x1, T, col, fn) { B.warns.push({ src, x0: Math.max(B.base.x + 30, x0), x1: Math.min(B.nest.x, x1), t: T, T, col, fn }); }
function frontX() { let f = B.hero.dead ? B.base.x + 80 : B.hero.x; for (const a of B.allies) if (!a.dead) f = Math.max(f, a.x); return f; }
/* ---------------- v1.7 전투 이벤트 · 요일 이벤트 ---------------- */
const BEV = {
  gold:     { n: '황금 뼈다귀 비!', d: '황금 뼈다귀를 주우면 뼈다귀 +20 · 코인 보너스', c: '#ffd34d', w: 3 },
  treasure: { n: '보물 슬라임 등장!', d: '12초 안에 잡으면 코인 왕창 + 장비 상자', c: '#7fe0ff', w: 3 },
  meteor:   { n: '별똥별 소나기!', d: '별똥별이 몬스터에게 쏟아져요', c: '#c8b0ff', w: 2 },
  cheer:    { n: '구름 할미의 응원가!', d: '10초 동안 기사단 공격력 · 공격 속도 UP', c: '#ff9ec4', w: 2 },
  nap:      { n: '몬스터 낮잠 시간', d: '몬스터들이 4초 동안 꾸벅꾸벅 졸아요', c: '#b0c8ff', w: 2 },
  snack:    { n: '미르 간식 배달!', d: '마나 가득 + 뼈다귀 +40', c: '#8fe08a', w: 2 },
  wind:     { n: '순풍이 불어요!', d: '몬스터들이 둥지 쪽으로 밀려나요', c: '#c8f0ff', w: 2 },
  // v1.9: 떠돌이 고양이 상인 이벤트는 전투를 방해해서 뺐어요 (상인 코드는 남겨 두되 이벤트 목록에서 제외)
};
const EV_FIRST = 300; // 처음 본 이벤트 보상 코인
// v1.8 계절 이벤트: 날짜로 자동 켜짐 (설날·추석은 음력 → 양력 날짜표, 앞뒤 사흘)
const SEASONS = {
  seollal:   { n: '설날 축제', d: '복주머니가 걸린 왕국 · 한 판 이기면 한정 펫 「세배 토끼 복실」', pet: 'bokrabbit', c: '#ff6a5a', days: ['2026-02-17', '2027-02-07', '2028-01-27', '2029-02-13', '2030-02-03', '2031-01-23'] },
  chuseok:   { n: '추석 한가위', d: '둥근 보름달과 송편 · 한 판 이기면 한정 펫 「송편 다람쥐 송이」', pet: 'songsquirrel', c: '#ffd36a', days: ['2026-09-25', '2027-09-15', '2028-10-03', '2029-09-22', '2030-09-12', '2031-10-01'] },
  halloween: { n: '할로윈 호박 축제', d: '호박 등불과 꼬마 유령 · 한 판 이기면 한정 펫 「호박 박쥐 뽀삐」', pet: 'pumpkinbat', c: '#ff9a3a', range: [[10, 24], [10, 31]] },
  christmas: { n: '크리스마스', d: '반짝이 전구와 눈 · 한 판 이기면 한정 펫 「아기 순록 루루」', pet: 'babydeer', c: '#5ad07a', range: [[12, 18], [12, 26]] },
};
function seasonNow() {
  if (S && S.forceSeason) return S.forceSeason === 'none' ? null : S.forceSeason;
  const d = new Date(), y = d.getFullYear(), md = (d.getMonth() + 1) * 100 + d.getDate(), t = Date.UTC(y, d.getMonth(), d.getDate());
  for (const k in SEASONS) { const Z = SEASONS[k];
    if (Z.days) for (const ds of Z.days) { const [yy, mm, dd] = ds.split('-').map(Number), c = Date.UTC(yy, mm - 1, dd); if (t >= c - 3 * 864e5 && t <= c + 3 * 864e5) return k; }
    if (Z.range) { const a = Z.range[0][0] * 100 + Z.range[0][1], b = Z.range[1][0] * 100 + Z.range[1][1]; if (md >= a && md <= b) return k; } }
  return null;
}
const DAYEV = [
  { n: '주말 축제', d: '코인 +30% · 이벤트 자주', coin: 1.3, evP: 0.9 },
  { n: '월요 응원', d: '경험치 +30%', xp: 1.3 },
  { n: '보물 슬라임 데이', d: '보물 슬라임이 자주 나와요', w: { treasure: 6 } },
  { n: '꾸벅꾸벅 데이', d: '몬스터 낮잠 · 응원가 자주', w: { nap: 5, cheer: 4 } },
  { n: '황금 뼈다귀 데이', d: '황금 뼈다귀 비가 자주', w: { gold: 6 } },
  { n: '별똥별 데이', d: '별똥별 소나기가 자주', w: { meteor: 6 } },
  { n: '주말 축제', d: '코인 +30% · 이벤트 자주', coin: 1.3, evP: 0.9 },
];
function dayEv() { return DAYEV[window.__dayK != null ? window.__dayK : new Date().getDay()]; } /* v5.1 검사용 __dayK */
function updEvents(dt) {
  if (B.ev) { B.ev.t -= dt; if (B.ev.t <= 0) B.ev = null; }
  // 보물 슬라임 도망 타이머
  for (const e of B.enemies) if (e.treasure > 0) { e.treasure -= dt; if (e.treasure <= 0 && e.hp > 0) { e.gone = true; poof(e.x, GY - 30, '#7fe0ff', 18); addText(e.x, GY - 90, '보물 슬라임이 도망쳤다!', '#bfefff', 17, true); } }
  if (B.enemies.some(e => e.gone)) B.enemies = B.enemies.filter(e => !e.gone);
  if (B.shop) { B.shop.t -= dt; if (B.shop.t <= 0) { addText(B.shop.x, GY - 110, '또 만나자냥~', '#ffd8b0', 16, true); poof(B.shop.x, GY - 30, '#ffb070', 14); B.shop = null; } }
  if (B.rushBoss && B.rushBoss.length && B.nest.hp / B.nest.max < B.rushBoss[0]) { B.rushBoss.shift(); const pool = BOSSES.slice(0, Math.max(1, B.si.ch)); const bk = pick(pool); spawnEnemy(bk); B.msg = { t: 2.2, s: `보스 등장! ${ENEMIES[bk].name}`, boss: true }; SFX.growl && SFX.growl(); B.shake = 0.4; }
  if (B.n < 3 || B.tut > 0 || B.intro || B.over || B.evN >= (B.evMax || 2)) return;
  B.evT -= dt; if (B.evT > 0) return;
  B.evT = B.evMax ? rnd(14, 22) : rnd(35, 55); const de = dayEv();
  if (!B.evMax && Math.random() > (B.evN === 0 ? (de.evP || 0.65) : 0.45)) return;
  const pool = []; for (const k in BEV) { const w = BEV[k].w * ((de.w && de.w[k]) || 1); for (let i = 0; i < w; i++) pool.push(k); }
  startEvent(pick(pool));
}
function startEvent(k) {
  const E = BEV[k]; B.evN++; B.ev = { k, t: 3.2 };
  S.evSeen = S.evSeen || {}; if (!S.evSeen[k]) { S.evSeen[k] = 1; S.coins += EV_FIRST; save(); B.later.push({ t: 3.3, fn: () => { B.msg = { t: 2.4, s: `새 이벤트 발견! 도감에 기록 · 코인 +${EV_FIRST}` }; } }); } SFX.start && SFX.start(); fx('flash', { dur: 0.18, col: E.c });
  const h = B.hero, foes = B.enemies.filter(e => !e.dead && e.hp > 0 && !(e.hide > 0));
  if (k === 'gold') {
    for (let i = 0; i < 8; i++) B.drops.push({ type: 'bone', gold: true, x: clamp(B.camX + rnd(60, W - 60), B.base.x + 40, B.nest.x - 40), y: -30 - i * 40, vx: 0, vy: rnd(0, 60), t: 0, life: 16, ground: false, gy: GY + rnd(0, 20) });
    for (let i = 0; i < 6; i++) B.drops.push({ type: 'coin', x: B.camX + rnd(80, W - 80), y: -20 - i * 30, vx: 0, vy: 0, t: 0, val: Math.max(1, Math.round((6 + B.n) * COIN_RATE)), life: 20, ground: false, gy: GY + rnd(0, 20) });
  } else if (k === 'treasure') {
    spawnAt('slime', clamp(B.camX + W * 0.72, B.base.x + 260, B.nest.x - 60)); const e = B.enemies[B.enemies.length - 1];
    if (e && e.kind === 'slime') { e.treasure = 13; e.hp = e.max = e.max * 4; e.atk *= 0.2; e.sc = 1.3; e.spd *= 1.4; ring(e.x, GY - 30, '#7fe0ff', 90); }
  } else if (k === 'meteor') {
    foes.sort(() => Math.random() - 0.5).slice(0, 7).forEach((t, i) => fx('meteor', { x: t.x, y: GY, dur: 0.55, delay: 0.2 + i * 0.2, target: t, dmg: h.atk * (t.def.boss ? 1.2 : 2.6) }));
  } else if (k === 'cheer') {
    B.buff = Math.max(B.buff, 10); for (const a of B.allies) if (!a.dead) ring(a.x, GY - 30, '#ff9ec4', 50); addText(h.x, GY - 120, '♪ 힘내라 멍멍기사 ♪', '#ffd0e4', 18, true);
  } else if (k === 'nap') {
    let n = 0; for (const e of foes) if (!e.def.boss) { e.stun = Math.max(e.stun || 0, 4); if (n++ < 6) addText(e.x, GY - 70, 'Zzz', '#d8e4ff', 16); }
  } else if (k === 'snack') {
    B.mana = B.hs.mpMax; B.food = Math.min(B.hs.fdMax, B.food + 40); addText(h.x, GY - 120, '뀨! 간식 왔어요', '#c8f5c0', 18, true); burst(h.x, GY - 60, '#8fe08a', 18);
  } else if (k === 'merchant') {
    B.shop = { x: clamp(h.x + 110, B.base.x + 160, B.nest.x - 200), t: 15, bought: 0 }; addText(B.shop.x, GY - 120, '냥! 좋은 물건 있다냥~', '#ffd8b0', 17, true);
  } else if (k === 'wind') {
    for (const e of foes) if (!e.def.boss) { e.x = Math.min(B.nest.x - 40, e.x + 110); } for (let q = 0; q < 24; q++) B.parts.push({ x: B.camX + rnd(0, W), y: rnd(150, GY), vx: rnd(300, 500), vy: rnd(-20, 20), g: 0, life: 0.7, max: 0.7, col: '#ffffff', size: rnd(2, 4), glow: true });
  }
}
// 떠돌이 고양이 상인: 전장에 노점 + 화면 위에 살 수 있는 물건 3개 (가방 코인 사용)
function shopItems() { const n = B.n; return [
  { n: '물약 1개', p: 120 + n * 4, ok: () => true, fn: () => { S.potions++; } },
  { n: '뼈다귀 +60', p: 60 + n * 2, ok: () => B.food < B.hs.fdMax, fn: () => { B.food = Math.min(B.hs.fdMax, B.food + 60); } },
  { n: '마나 가득', p: 80 + n * 3, ok: () => B.mana < B.hs.mpMax, fn: () => { B.mana = B.hs.mpMax; } }]; }
function drawShopWorld() { const sh = B.shop; if (!sh) return; const x = sh.x, y = GY + 10;
  ctx.fillStyle = 'rgba(30,15,0,.2)'; ART.E(ctx, x, y + 2, 46, 8); ctx.fill();
  RR(x - 40, y - 46, 80, 40, 6); ctx.fillStyle = '#b8794a'; ctx.fill(); ctx.strokeStyle = '#6a4020'; ctx.lineWidth = 2; ctx.stroke();
  for (let k = 0; k < 5; k++) { ctx.fillStyle = k % 2 ? '#fff3e0' : '#ff8a5a'; ctx.beginPath(); ctx.moveTo(x - 46 + k * 18.4, y - 70); ctx.lineTo(x - 46 + (k + 1) * 18.4, y - 70); ctx.lineTo(x - 46 + (k + 1) * 18.4, y - 58); ctx.quadraticCurveTo(x - 46 + (k + 0.5) * 18.4, y - 52, x - 46 + k * 18.4, y - 58); ctx.closePath(); ctx.fill(); }
  ctx.fillStyle = '#6a4020'; ctx.fillRect(x - 44, y - 70, 3, 64); ctx.fillRect(x + 41, y - 70, 3, 64);
  ART.icon(ctx, 'potion', x - 20, y - 30, 18); ART.icon(ctx, 'bone', x + 2, y - 28, 18); ART.icon(ctx, 'mana', x + 22, y - 30, 16);
  ART.drawFit(ctx, 'catgen', 'c_happy', x + 66, y - 36, 64, 78, { flip: true }); }
function drawShopHud() { const sh = B.shop; if (!sh || B.paused) return; const sx = clamp(sh.x - B.camX, 170, W - 170), its = shopItems();
  ART.panel(ctx, sx - 165, 204, 330, 128, 'cream'); txt(`냥냥이 노점 · ${Math.ceil(sh.t)}초`, sx, 220, 14, '#a0652a', 'center', false); ART.icon(ctx, 'coin', sx + 92, 220, 16); txt('' + S.coins, sx + 104, 221, 13, '#8a5a1a', 'left', false);
  its.forEach((it, i) => { const can = S.coins >= it.p && it.ok(); btn(sx - 155 + i * 105, 236, 100, 84, `${it.n}\n${it.p}코인`, () => { if (S.coins < it.p || !it.ok()) { SFX.click(); return; } S.coins -= it.p; it.fn(); sh.bought++; save(); SFX.pick(); addText(sh.x, GY - 120, '고맙다냥!', '#ffd8b0', 16, true); }, { bg: can ? ['#8fd28a', '#ffc070', '#7ab8ff'][i] : '#b5a99b', size: 14, key: 'shop' + i }); }); }
// 계절 장식: 위쪽 줄 장식(지도·타이틀) + 성 장식 + 눈(크리스마스)
function drawSeasonGarland(y) { const sk = seasonNow(); if (!sk) return; const x0 = -OX, x1 = W + OX;
  ctx.save(); ctx.strokeStyle = 'rgba(90,50,20,.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); for (let x = x0; x <= x1; x += 8) { const yy = y + 6 + Math.sin((x - x0) / 120 * Math.PI) * 7; x === x0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy); } ctx.stroke();
  for (let k = 0, x = x0 + 20; x < x1; x += 46, k++) { const yy = y + 8 + Math.sin((x - x0) / 120 * Math.PI) * 7, bob = Math.sin(G.time * 2 + k) * 1.5;
    if (sk === 'seollal') { ctx.fillStyle = k % 2 ? '#e8403a' : '#f2b830'; ART.E(ctx, x, yy + 8 + bob, 7, 8); ctx.fill(); ctx.fillStyle = '#7a2a10'; ctx.fillRect(x - 4, yy + bob, 8, 2.5); }
    else if (sk === 'chuseok') { ctx.fillStyle = ['#f7f0e0', '#f2a8c0', '#a8d890', '#f8e070'][k % 4]; ctx.beginPath(); ctx.arc(x, yy + 6 + bob, 6, 0, Math.PI); ctx.closePath(); ctx.fill(); }
    else if (sk === 'halloween') { ctx.fillStyle = '#ff8a2a'; ART.E(ctx, x, yy + 9 + bob, 7.5, 6.5); ctx.fill(); ctx.fillStyle = '#4a7a2a'; ctx.fillRect(x - 1, yy + 1 + bob, 2, 3); ctx.fillStyle = '#5a2a00'; ctx.fillRect(x - 3, yy + 8 + bob, 2, 2); ctx.fillRect(x + 1, yy + 8 + bob, 2, 2); }
    else { const c = ['#ff5a5a', '#ffd34d', '#5ad07a', '#5ab0ff'][k % 4]; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 + Math.sin(G.time * 4 + k) * 0.4; ctx.drawImage(ART.softDot(c), x - 10, yy - 2 + bob, 20, 20); ctx.restore(); ctx.fillStyle = c; ART.E(ctx, x, yy + 8 + bob, 3.5, 5); ctx.fill(); } }
  ctx.restore(); }
function drawSeasonCastle() { const sk = seasonNow(); if (!sk) return; const x = B.base.x, y = GY;
  if (sk === 'seollal') { for (const dx of [-40, 40]) { ctx.strokeStyle = '#6a3a20'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + dx, y - 150); ctx.lineTo(x + dx, y - 134); ctx.stroke(); ctx.fillStyle = '#e8403a'; ART.E(ctx, x + dx, y - 122, 13, 15); ctx.fill(); ctx.fillStyle = '#f2b830'; ctx.fillRect(x + dx - 9, y - 137, 18, 4); txt('복', x + dx, y - 120, 12, '#ffe08a', 'center', false); } }
  else if (sk === 'chuseok') { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.6; ctx.drawImage(ART.softDot('#fff2c0'), x + 30, y - 330, 120, 120); ctx.restore(); ctx.fillStyle = '#fff6d8'; ART.E(ctx, x + 90, y - 270, 26, 26); ctx.fill(); }
  else if (sk === 'halloween') { for (const dx of [-56, 52]) { ctx.fillStyle = '#ff8a2a'; ART.E(ctx, x + dx, y - 6, 15, 12); ctx.fill(); ctx.fillStyle = '#ffe070'; ctx.beginPath(); ctx.moveTo(x + dx - 7, y - 9); ctx.lineTo(x + dx - 3, y - 12); ctx.lineTo(x + dx - 3, y - 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(x + dx + 7, y - 9); ctx.lineTo(x + dx + 3, y - 12); ctx.lineTo(x + dx + 3, y - 7); ctx.fill(); ctx.fillRect(x + dx - 5, y - 3, 10, 2); ctx.fillStyle = '#4a7a2a'; ctx.fillRect(x + dx - 1.5, y - 22, 3, 5); } }
  else { ctx.fillStyle = '#2e8a4a'; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(x + 70, y - 90 + k * 22); ctx.lineTo(x + 50 - k * 6, y - 60 + k * 22); ctx.lineTo(x + 90 + k * 6, y - 60 + k * 22); ctx.closePath(); ctx.fill(); } ctx.fillStyle = '#7a4a20'; ctx.fillRect(x + 66, y - 16, 8, 16); ART.star(ctx, x + 70, y - 94, 7, '#ffd34d'); for (let k = 0; k < 6; k++) { ctx.fillStyle = ['#ff5a5a', '#ffd34d', '#5ab0ff'][k % 3]; ART.E(ctx, x + 58 + (k * 7) % 26, y - 66 + k * 9, 2.4, 2.4); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,.85)'; for (let k = 0; k < 40; k++) { const fx2 = B.camX - OX + ((k * 137 + G.time * (20 + k % 5 * 6)) % (VW + 40)), fy = (k * 61 + G.time * (30 + k % 7 * 5)) % (GY + 20); ART.E(ctx, fx2, fy, 1.8, 1.8); ctx.fill(); } } }
function drawEventBanner() {
  const ev = B.ev; if (!ev) return; const E = BEV[ev.k], a = Math.min(1, (3.2 - ev.t) * 4, ev.t * 2);
  ctx.save(); ctx.globalAlpha = a; const y = 160, sl = (1 - Math.min(1, (3.2 - ev.t) * 4)) * -60;
  ART.panel(ctx, W / 2 - 230 + sl, y - 30, 460, 62, 'dark');
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * 0.5; ctx.drawImage(ART.softDot(E.c), W / 2 - 260, y - 70, 520, 140); ctx.restore();
  ART.star(ctx, W / 2 - 200 + sl, y - 8, 9, E.c); ART.star(ctx, W / 2 + 200 + sl, y - 8, 9, E.c);
  txt(E.n, W / 2 + sl, y - 9, 22, E.c, 'center', true); txt(E.d, W / 2 + sl, y + 17, 13, '#fff3d6', 'center', false, null, 420);
  ctx.restore();
}
function spawnAt(k, x) { const n0 = B.enemies.length; spawnEnemy(k); const n = B.enemies[B.enemies.length - 1]; if (B.enemies.length > n0 && n) { n.x = x; n.y = rnd(0, 24); } }
function bossSkill(e, dt) {
  if (e.reflect > 0) e.reflect -= dt; if (e.guard > 0) e.guard -= dt;
  if (e.hide > 0) {
    e.hide -= dt; e.x += (e.hideTo - e.x) * Math.min(1, dt * 2.2); e.moving = true; e.anim += dt;
    if (Math.random() < 0.5) B.parts.push({ x: e.x + rnd(-20, 20), y: GY + 4, vx: rnd(-40, 40), vy: rnd(-160, -60), life: 0.5, max: 0.5, col: '#8a5a35', size: rnd(3, 6), g: 600 });
    if (e.hide <= 0 && e.def.dig) { e.hp -= e.max * 0.5; e.stun = 1.4; addText(e.x, GY - 70, '멍멍성 덫!', '#ffd34d', 15, true); poof(e.x, GY - 10, '#ffd34d', 8); if (e.hp <= 0) e.hp = 1; } // v2.1 성 앞 덫: 튀어나오면 반쯤 다치고 잠깐 어지러움
    return true;
  }
  const sk = BOSS_SK[e.kind]; if (!sk || e.stun > 0 || window.NOBSK) return false;
  if (e.skT == null) e.skT = 3.2;
  e.skT -= dt; if (e.skT > 0) return false;
  const enr = e.hp / e.max < 0.4; e.skT = sk.cd * rnd(0.9, 1.15) * (enr ? 0.72 : 1) * (B.n >= 110 && !B.special ? (S.diff === 2 ? 2.0 : 1.5) : 1); /* v4.6 보통 121판부터 보스 기술 간격 1.5배 (밀어내기 기술에 동료가 못 다가감) */
  B.bossSk = { s: sk.n, t: 1.8, k: e.kind }; addText(e.x, GY - 210, sk.n + '!', '#ffab91', 24, true); e.atkAnim = 0.5; SFX.growl();
  const A = e.atk * 0.6, fx0 = frontX(), hx = B.hero.dead ? fx0 : B.hero.x;
  const near = Math.abs(hx - e.x) < 560 ? hx : fx0;
  switch (e.kind) {
    case 'kkuruk':
      for (let k = 0; k < 3; k++) spawnAt('slime', e.x + rnd(-50, 20)); poof(e.x, GY - 30, '#9ccc65', 12);
      warnZone(e, e.x - 160, e.x - 20, 1.0, '#9ccc65', () => { zoneHit(e.x - 160, e.x - 20, A * 1.2, { stun: 0.4 }); fx('quake', { x: e.x - 90, y: GY + 6, dur: 0.4 }); B.shake = 0.3; });
      break;
    case 'troll':
      warnZone(e, e.x - 200, e.x - 20, 1.1, '#c08a4a', () => { zoneHit(e.x - 200, e.x - 20, A * 1.7, { stun: 0.9 }); fx('quake', { x: e.x - 110, y: GY + 6, dur: 0.5 }); fx('boom', { x: e.x - 110, y: GY, dur: 0.5, r: 80 }); poof(e.x - 110, GY - 6, '#a07850', 10); B.shake = 0.5; SFX.slam(); });
      break;
    case 'scorp': { const tx = near;
      warnZone(e, tx - 60, tx + 60, 0.9, '#8be04a', () => { zoneHit(tx - 60, tx + 60, A * 1.6); fx('boom', { x: tx, y: GY, dur: 0.45, r: 60 }); burst(tx, GY - 20, '#8be04a', 18, 200, true); }); break; }
    case 'frost': { const tx = fx0;
      warnZone(e, tx - 120, tx + 60, 1.2, '#9fe0ff', () => { zoneHit(tx - 120, tx + 60, A * 0.9, { stun: 1.6 }); fx('pillar', { x: tx - 30, y: GY + 8, dur: 0.8, col: '#bfe6ff' }); burst(tx - 30, GY - 30, '#e1f5fe', 26, 240, true); fx('flash', { dur: 0.25, col: '#e1f5fe' }); }); break; }
    case 'nox':
      warnZone(e, e.x - 330, e.x - 20, 0.9, '#9a6ad0', () => { zoneHit(e.x - 330, e.x - 20, A * 1.6, { kb: -40 }); for (let k = 0; k < 6; k++) poof(e.x - k * 50, GY - 30, '#4a2a6a', 2); e.x = Math.max(B.base.x + 140, e.x - 260); B.dark = 0.8; B.shake = 0.35; });
      break;
    case 'kraken': { const cands = B.allies.filter(u => !u.dead && u.x > e.x - 650).sort((a, b) => a.x - b.x); const t = cands[0] || (!B.hero.dead ? B.hero : null); if (!t) break; const tx = t.x;
      warnZone(e, tx - 45, tx + 45, 0.8, '#4ac8d8', () => { if (t.dead) return; t.x = Math.min(B.nest.x - 60, e.x - 70); dealDmg(t, A * 1.1, 'e'); if (!t.dead) t.stun = 0.9; fx('wave', { x: t.x, y: GY - 30, dur: 0.6 }); }); break; }
    case 'owl':
      for (let k = 0; k < 3; k++) { const tx = rnd(Math.max(B.base.x + 80, fx0 - 160), Math.max(fx0, e.x - 60)); warnZone(e, tx - 40, tx + 40, 0.8 + k * 0.3, '#fff59d', () => { zoneHit(tx - 40, tx + 40, A * 1.4); fx('pillar', { x: tx, y: GY + 8, dur: 0.45, col: '#fff59d' }); fx('flash', { dur: 0.12, col: '#ffffff' }); SFX.slam(); }); }
      break;
    case 'cgolem': e.reflect = 4.5; ring(e.x, GY - 60, '#9feaff', 130); B.msg = { t: 2, s: '프리즘 반사막! 공격하면 빛이 튕겨 나와요' }; break;
    case 'sbori':
      warnZone(e, e.x - 180, e.x - 10, 0.8, '#7a5ad0', () => { zoneHit(e.x - 180, e.x - 10, A * 1.8, { kb: -70 }); fx('pawstamp', { x: e.x - 80, y: GY + 6, dur: 0.55 }); B.shake = 0.4; SFX.slam(); });
      break;
    case 'void': { const tx = fx0;
      warnZone(e, tx - 180, tx + 90, 1.2, '#5a4a8a', () => { zoneHit(tx - 180, tx + 90, A * 0.6, { stun: 1.8 }); B.silence = 4; B.mana = Math.max(0, B.mana - 30); B.dark = 1.2; B.msg = { t: 2.2, s: '침묵의 장막! 4초 동안 스킬 봉인' }; }); break; }
    case 'whale':
      for (let k = 0; k < 4; k++) { const tx = e.x - 90 - k * 115; warnZone(e, tx - 45, tx + 45, 0.9 + k * 0.25, '#7fd8ff', () => { zoneHit(tx - 45, tx + 45, A * 1.3); fx('pillar', { x: tx, y: GY + 8, dur: 0.6, col: '#7fd8ff' }); burst(tx, GY - 40, '#e1f5fe', 14, 220, true); }); }
      break;
    case 'fenrir': {
      const st = Math.round(B.mana * 0.2); B.mana -= st; addText(e.x, GY - 180, `별 ${st}개 꿀꺽!`, '#ffe27a', 18);
      warnZone(e, e.x - 270, e.x - 10, 1.0, '#ffe27a', () => { zoneHit(e.x - 270, e.x - 10, A * 1.2); fx('wave', { x: e.x - 60, y: GY - 40, dur: 0.6 }); B.shake = 0.3; }); break; }
    case 'mole': {
      const tx = clamp(near + 20, B.base.x + 140, B.nest.x - 120); e.hide = 1.4; e.hideTo = tx; poof(e.x, GY - 10, '#8a5a35', 12);
      warnZone(e, tx - 75, tx + 75, 1.4, '#c08a4a', () => { e.hide = 0; e.x = tx; zoneHit(tx - 75, tx + 75, A * 1.7, { stun: 0.6 }); fx('quake', { x: tx, y: GY + 6, dur: 0.5 }); fx('boom', { x: tx, y: GY, dur: 0.5, r: 70 }); poof(tx, GY - 10, '#8a5a35', 16); B.shake = 0.5; SFX.slam(); }); break; }
    case 'rainturtle': { // 일곱 빛 줄다리: 일곱 줄 중 짝수 줄이 먼저, 홀수 줄이 나중에 (빈 줄로 옮겨 피하기)
      const x0 = B.base.x + 80, x1 = e.x - 30, sw = (x1 - x0) / 7, COLS = ['#ff7a8a', '#ffb06a', '#ffe06a', '#8ae08a', '#6ac0ff', '#8a8aff', '#c88aff'];
      for (let k = 0; k < 7; k++) { const a0 = x0 + k * sw; warnZone(e, a0, a0 + sw * 0.9, k % 2 ? 1.9 : 1.1, COLS[k], () => { zoneHit(a0, a0 + sw * 0.9, A * 0.7); fx('pillar', { x: a0 + sw / 2, y: GY + 4, dur: 0.6, col: COLS[k] }); }); }
      addText(e.x, GY - 150, '무지개 반짝!', '#fff3c0', 20, true); break; }
    case 'shadowchild': { // 숨바꼭질: 그림자 속으로 숨었다가 보리 곁에 경고 원과 함께 나타남 + 작은 그림자 친구 소환
      const tx = clamp(B.hero.dead ? frontX() : B.hero.x + 40, B.base.x + 140, B.nest.x - 60); e.hide = 1.6; e.hideTo = tx; addText(tx, GY - 150, '어디 있게~?', '#e8e0f0', 18, true);
      warnZone(e, tx - 80, tx + 80, 1.6, '#8a8098', () => { zoneHit(tx - 80, tx + 80, A * 1.1, { stun: 0.5 }); poof(tx, GY - 30, '#8a8098', 14); addText(tx, GY - 175, '찾았다!', '#e8e0f0', 20, true); });
      spawnAt('bat', e.x - 20); break; }
    case 'mtgiant': { // 쉿! 눈사태: 거인이 입 대신 발을 구르면 눈덩이가 앞에서부터 차례로 굴러옴(4곳, 밀려남) + 끝나면 「쉿」 2초 스킬 봉인
      const x1 = e.x - 40, x0 = B.base.x + 100, sw = (x1 - x0) / 4;
      for (let k = 0; k < 4; k++) { const a1 = x1 - k * sw, a0 = a1 - sw * 0.75; warnZone(e, a0, a1, 0.9 + k * 0.45, '#e8f4ff', () => { zoneHit(a0, a1, A * 0.95, { kb: -55 }); fx('boom', { x: (a0 + a1) / 2, y: GY, dur: 0.45, r: 60 }); burst((a0 + a1) / 2, GY - 30, '#ffffff', 16, 240, true); B.shake = 0.3; SFX.slam(); }); }
      B.later.push({ t: 2.6, fn: () => { B.silence = Math.max(B.silence, 2); addText(e.x, GY - 200, '쉿…!', '#e8f4ff', 22, true); B.msg = { t: 1.8, s: '쉿! 2초 동안 스킬 봉인 — 눈사태 다음엔 잠깐 기다리기' }; } });
      fx('quake', { x: e.x, y: GY + 6, dur: 0.6 }); break; }
    case 'echofairy': { // 따라쟁이 메아리: 보리가 서 있던 곳에 경고 → 같은 자리에 메아리가 두 번 울림 (첫 번째를 피했어도 제자리로 돌아가면 두 번째에 맞음)
      const tx = clamp(B.hero.dead ? frontX() : B.hero.x, B.base.x + 120, e.x - 40), tx2 = clamp(frontX() + 30, B.base.x + 120, e.x - 40);
      [[tx, 1.1], [tx, 2.0], [tx2, 1.5]].forEach(([x, d], k) => warnZone(e, x - 70, x + 70, d, '#c8b8ff', () => { zoneHit(x - 70, x + 70, A * (k === 1 ? 0.8 : 1.0), { stun: k === 1 ? 0.4 : 0 }); ring(x, GY - 40, '#c8b8ff', 110); addText(x, GY - 140, k === 1 ? '…멍!' : '멍!', '#e8deff', 18, true); }));
      addText(e.x, GY - 170, '따라 해 볼까?', '#e8deff', 18, true); break; }
    case 'camelbot': { // 모래 돌진: 앞쪽 긴 줄 경고 → 앞으로 돌진하며 밀쳐냄
      const x1 = e.x - 20, x0 = Math.max(B.base.x + 80, e.x - 430);
      warnZone(e, x0, x1, 1.3, '#e8c088', () => { zoneHit(x0, x1, A * 1.2, { kb: -80 }); const nx = Math.max(B.base.x + 220, e.x - 220); for (let q = 0; q < 10; q++) poof(nx + (e.x - nx) * q / 10, GY - 10, '#e8c088', 3); e.x = nx; B.shake = 0.45; SFX.slam(); fx('quake', { x: nx, y: GY + 6, dur: 0.5 }); });
      addText(e.x, GY - 180, '터벅터벅—!', '#ffe8c0', 20, true); break; }
    case 'starfox': { // 별 흥정: 별 주머니 세 개가 차례로 + 「떨이!」로 마나·뼈다귀를 조금 가져감
      const tx = clamp(B.hero.dead ? frontX() : B.hero.x, B.base.x + 120, e.x - 40), fx1 = clamp(frontX() + 20, B.base.x + 120, e.x - 40), tx3 = clamp(tx + 130, B.base.x + 120, e.x - 40);
      [[tx, 0.9], [fx1, 1.4], [tx3, 1.9]].forEach(([x, d]) => warnZone(e, x - 60, x + 60, d, '#ffe27a', () => { zoneHit(x - 60, x + 60, A * 0.9); burst(x, GY - 30, '#ffe27a', 14, 220, true); addText(x, GY - 110, '짤랑!', '#fff3a0', 16, true); }));
      B.later.push({ t: 2.2, fn: () => { const m0 = Math.round(B.mana * 0.15), f0 = Math.round(B.food * 0.1); B.mana -= m0; B.food -= f0; addText(e.x, GY - 200, `떨이! 마나 ${m0} · 뼈다귀 ${f0} 가져감`, '#ffd0a0', 16, true); } });
      break; }
    case 'mossbear': { // 자장 포옹: 보리 둘레 큰 원 → 닫힐 때 안에 있으면 잠듦 + 곰이 조금 회복
      const tx = clamp(B.hero.dead ? frontX() : B.hero.x, B.base.x + 140, e.x - 40);
      warnZone(e, tx - 120, tx + 120, 1.5, '#9ad0a0', () => { zoneHit(tx - 120, tx + 120, A * 0.6, { stun: 1.6 }); for (let q = 0; q < 4; q++) addText(tx - 60 + q * 40, GY - 80 - q * 8, 'Zzz', '#d8f0c8', 15); e.hp = Math.min(e.max, e.hp + e.max * 0.02); });
      addText(e.x, GY - 200, '♪ 자장 자장…', '#d8f0c8', 18, true); break; }
    case 'dawndeer': { // 멈춘 시간: 파란 시계 원 3개가 차례로 닫힘(안에 있으면 2초 멈춤) → 뿔 종소리
      const tx = clamp(B.hero.dead ? frontX() : B.hero.x, B.base.x + 120, e.x - 40), f1 = clamp(frontX() + 20, B.base.x + 120, e.x - 40), m1 = clamp((tx + e.x) / 2, B.base.x + 120, e.x - 40);
      [[tx, 1.2], [f1, 1.6], [m1, 2.0]].forEach(([x, d]) => warnZone(e, x - 70, x + 70, d, '#8ac8ff', () => { zoneHit(x - 70, x + 70, A * 0.7, { stun: 2 }); ring(x, GY - 40, '#bfe6ff', 100); addText(x, GY - 120, '똑… 딱… 멈춤!', '#d8eeff', 15, true); }));
      B.later.push({ t: 2.4, fn: () => { zoneHit(e.x - 260, e.x - 20, A * 0.8); ring(e.x - 120, GY - 60, '#fff2c0', 160); addText(e.x, GY - 230, '딩—', '#fff6d0', 22, true); } }); break; }
    case 'drumgiant': { // 쿵쾅 겁주기: 북소리 물결 3번 (보스에서 점점 멀리) → 밀기
      for (let q = 0; q < 3; q++) { const x = clamp(e.x - 150 - q * 150, B.base.x + 120, e.x - 40); warnZone(e, x - 60, x + 60, 0.9 + q * 0.5, '#ffb04a', () => { zoneHit(x - 60, x + 60, A * 0.85, { kb: 50 }); ring(x, GY - 50, '#ffd38a', 80); addText(x, GY - 130, '쿵!', '#ffe0a0', 24, true); B.shake = Math.max(B.shake || 0, 6); SFX.slam(); }); }
      addText(e.x, GY - 240, '저리 가! 웃지 마!', '#ffd0c0', 17, true); break; }
    case 'toyking': { // 멈춤 태엽 행진: 양철 병정 3 + 멈춤 불꽃 2곳
      for (let q = 0; q < 3; q++) B.later.push({ t: 0.4 + q * 0.5, fn: () => { if (!e.dead) { spawnEnemy('sknight', 0); const s2 = B.enemies[B.enemies.length - 1]; if (s2 && !s2.def.boss) { s2.x = e.x - 40 - q * 12; s2.hp *= 0.6; s2.max *= 0.6; } } } });
      for (let q = 0; q < 2; q++) { const x = clamp((B.hero.dead ? frontX() : B.hero.x) - 30 + q * 160, B.base.x + 120, e.x - 40); warnZone(e, x - 50, x + 50, 1.5 + q * 0.4, '#ffe27a', () => { zoneHit(x - 50, x + 50, A * 0.7, { stun: 0.9 }); for (let r = 0; r < 10; r++) B.parts.push({ x: x + rnd(-40, 40), y: GY - 60, vx: rnd(-120, 120), vy: -rnd(120, 260), g: 400, life: 0.8, max: 0.8, col: ['#ff7a8a', '#ffd34d', '#7ac8ff'][r % 3], size: 4, glow: true }); SFX.slam(); }); }
      addText(e.x, GY - 220, '끼릭 끼릭 끼릭!', '#fff2a8', 17, true); break; }
    case 'bellknight': { // 잊음의 종소리: 노란 원 3번 (마지막은 넓게) → 어지러움
      const cx0 = clamp(B.hero.dead ? frontX() : B.hero.x, B.base.x + 120, e.x - 40);
      [[cx0, 60, 0.9], [clamp(frontX(), B.base.x + 120, e.x - 40), 60, 1.4], [clamp(cx0 - 120, B.base.x + 120, e.x - 40), 150, 2.0]].forEach(([x, w, d], q) => warnZone(e, x - w, x + w, d, '#ffe27a', () => { zoneHit(x - w, x + w, A * (q === 2 ? 0.8 : 0.6), { stun: q === 2 ? 1.0 : 0.6 }); ring(x, GY - 40, '#fff2a8', w + 10); addText(x, GY - 120, '띵!', '#fff2a8', 22, true); SFX.slam(); }));
      addText(e.x, GY - 210, '딸랑… 아무도 들어오면 안 돼', '#fff2c0', 16, true); break; }
    case 'badukshadow': { // 후회의 성문: 앞쪽 공격 막는 방패(원거리로 깨기) → 그림자 칼 2곳
      e.guard = 4.5; addText(e.x, GY - 220, '이번엔… 놓치지 않아', '#d8c8ff', 17, true); ring(e.x - 30, GY - 60, '#b8a8ff', 80);
      for (let q = 0; q < 2; q++) { const x = clamp((B.hero.dead ? frontX() : B.hero.x) - 40 + q * 170, B.base.x + 120, e.x - 40); warnZone(e, x - 55, x + 55, 1.6 + q * 0.4, '#a890ff', () => { zoneHit(x - 55, x + 55, A * 1.0, { stun: 0.3 }); fx('pillar', { x, y: GY + 8, dur: 0.4, col: '#c8b8ff' }); SFX.slam(); }); }
      break; }
    case 'icepenguin': { // 꽁꽁 닻: 얼음 원 2개(들어 있으면 얼어붙음) → 앞줄에 닻 내리치기
      for (let q = 0; q < 2; q++) { const x = clamp((B.hero.dead ? frontX() : B.hero.x) - 80 + q * 200, B.base.x + 120, e.x - 40); warnZone(e, x - 55, x + 55, 1.0 + q * 0.3, '#bfefff', () => { for (const a of B.allies) if (!a.dead && a.x > x - 55 && a.x < x + 55) a.stun = Math.max(a.stun || 0, 1.1); if (!B.hero.dead && B.hero.x > x - 55 && B.hero.x < x + 55) B.hero.stun = Math.max(B.hero.stun || 0, 0.8); zoneHit(x - 55, x + 55, A * 0.6); ring(x, GY - 30, '#e0f6ff', 60); SFX.slam(); }); }
      { const fx2 = clamp(frontX() + 20, B.base.x + 120, e.x - 40); warnZone(e, fx2 - 70, fx2 + 70, 2.0, '#6ab0ff', () => { zoneHit(fx2 - 70, fx2 + 70, A * 1.3, { kb: 40 }); fx('pillar', { x: fx2, y: GY + 8, dur: 0.4, col: '#cfefff' }); B.shake = Math.max(B.shake || 0, 8); SFX.slam(); }); }
      addText(e.x, GY - 200, '아무도 못 떠나!', '#cfefff', 18, true); break; }
    case 'songwhale': { // 잠의 노래: 모두 졸림(느려짐) → 큰 물결 3곳
      B.sleepy = 3.2; for (const a of B.allies) if (!a.dead) emoteAt(a, 'zz', 1.6); emoteAt(B.hero, 'zz', 1.6);
      for (let q = 0; q < 3; q++) { const x = clamp(e.x - 140 - q * 170, B.base.x + 120, e.x - 40); warnZone(e, x - 50, x + 50, 1.2 + q * 0.45, '#c8a8ff', () => { zoneHit(x - 50, x + 50, A * 0.95, { kb: 30 }); for (let r = 0; r < 8; r++) B.parts.push({ x: x + rnd(-50, 50), y: GY - rnd(0, 30), vx: rnd(-40, 40), vy: -rnd(120, 260), g: 500, life: 0.7, max: 0.7, col: '#bfe6ff', size: 4, glow: true }); }); }
      addText(e.x, GY - 230, '자장… 자장…', '#e0d0ff', 18, true); break; }
    case 'thunderbird': { // 천둥 날개: 번개 3곳 차례로 → 날갯바람(조금 밀기)
      const tx = clamp(B.hero.dead ? frontX() : B.hero.x, B.base.x + 120, e.x - 40), f1 = clamp(frontX() + 30, B.base.x + 120, e.x - 40), m1 = clamp(tx - 140, B.base.x + 120, e.x - 40);
      [[tx, 0.9], [f1, 1.3], [m1, 1.7]].forEach(([x, d]) => warnZone(e, x - 55, x + 55, d, '#ffe86a', () => { zoneHit(x - 55, x + 55, A * 1.1, { stun: 0.3 }); fx('pillar', { x, y: GY + 8, dur: 0.45, col: '#fff59d' }); fx('flash', { dur: 0.1, col: '#ffffff' }); SFX.slam(); }));
      B.later.push({ t: 2.1, fn: () => { for (const a of B.allies) if (!a.dead && a.x < e.x) a.x = Math.max(B.base.x + 40, a.x - 50); if (!B.hero.dead) B.hero.x = Math.max(B.base.x + 40, B.hero.x - 50); addText(e.x, GY - 200, '푸드득!', '#fff6c0', 20, true); } }); break; }
    case 'windelder': { // 폭풍 왕관: 큰 바람으로 밀기 → 회오리 원 2개 (머무는 동안 피해)
      warnZone(e, B.base.x + 80, e.x - 30, 1.1, '#bfe6ff', () => { for (const a of B.allies) if (!a.dead && a.x < e.x) a.x = Math.max(B.base.x + 40, a.x - 60); if (!B.hero.dead) B.hero.x = Math.max(B.base.x + 40, B.hero.x - 60); zoneHit(B.base.x + 80, e.x - 30, A * 0.3); for (let q = 0; q < 16; q++) B.parts.push({ x: e.x - rnd(0, 600), y: rnd(150, GY), vx: -rnd(300, 500), vy: 0, g: 0, life: 0.6, max: 0.6, col: '#ffffff', size: 3, glow: true }); });
      for (let q = 0; q < 2; q++) { const x = clamp((B.hero.dead ? frontX() : B.hero.x) - 60 + q * 180, B.base.x + 120, e.x - 40); B.later.push({ t: 1.3, fn: () => { for (let r = 0; r < 4; r++) warnZone(e, x - 60, x + 60, 0.6 + r * 0.5, '#9ad8ff', () => { zoneHit(x - 60, x + 60, A * 0.45); ring(x, GY - 40, '#bfe6ff', 70); }); } }); }
      addText(e.x, GY - 220, '하늘이 닫힌다…', '#d8eeff', 18, true); break; }
    case 'catgen': // 냥냥 연속 펀치: 보리 위치를 따라가는 경고 원 3개가 차례로
      for (let k = 0; k < 3; k++) B.later.push({ t: k * 0.55, fn: () => { const tx = clamp(B.hero.dead ? frontX() : B.hero.x, B.base.x + 90, e.x - 30); warnZone(e, tx - 55, tx + 55, 0.75, '#ffb04a', () => { zoneHit(tx - 55, tx + 55, A * 0.8, { stun: 0.3 }); fx('pawstamp', { x: tx, y: GY + 6, dur: 0.45 }); addText(tx, GY - 90, '냥!', '#ffb04a', 20, true); }); } });
      break;
    case 'roc': { // 깃털 폭풍: 넓은 바람으로 모두 뒤로 밀고, 깃털 비 경고 2곳
      warnZone(e, B.base.x + 80, e.x - 30, 1.2, '#bfe6ff', () => { for (const a of B.allies) if (!a.dead && a.x < e.x) a.x = Math.max(B.base.x + 40, a.x - 70); if (!B.hero.dead) B.hero.x = Math.max(B.base.x + 40, B.hero.x - 70); zoneHit(B.base.x + 80, e.x - 30, A * 0.25); for (let q = 0; q < 14; q++) B.parts.push({ x: e.x - rnd(0, 600), y: GY - rnd(20, 160), vx: -rnd(200, 400), vy: rnd(-20, 20), life: 0.8, max: 0.8, col: '#ffffff', size: rnd(4, 7), g: 0 }); addText(e.x - 200, GY - 140, '휘이잉!', '#bfe6ff', 20, true); });
      for (let k = 0; k < 2; k++) { const tx = clamp(near - 60 + k * 160, B.base.x + 90, e.x - 40); warnZone(e, tx - 60, tx + 60, 1.7 + k * 0.3, '#ffd36a', () => zoneHit(tx - 60, tx + 60, A * 0.9)); }
      break; }
    case 'badger': // 땅울림 북: 왼쪽부터 오른쪽으로 세 줄 땅울림 (빈 줄로 피하기)
      { const x0 = B.base.x + 80, span = (e.x - 40 - x0) / 3; for (let k = 0; k < 3; k++) { const a0 = x0 + k * span; warnZone(e, a0, a0 + span * 0.8, 1.0 + k * 0.5, '#c8904a', () => { zoneHit(a0, a0 + span * 0.8, A * 0.8, { stun: 0.8 }); fx('quake', { x: a0 + span * 0.4, y: GY + 6, dur: 0.45 }); B.shake = 0.3; }); } addText(e.x, GY - 180, '둥! 둥! 둥!', '#ffcf80', 20, true); }
      break;
    case 'seaspirit': // 이름 삼키는 파도: 긴 파도 경고 + 게 두 마리
      warnZone(e, e.x - 520, e.x - 20, 1.3, '#7ad0ff', () => { zoneHit(e.x - 520, e.x - 20, A * 0.9, { kb: -40 }); fx('wave', { x: e.x - 200, y: GY - 30, dur: 0.7 }); B.shake = 0.35; addText(e.x - 260, GY - 150, '쏴아아!', '#bfefff', 22, true); });
      for (let k = 0; k < 2; k++) spawnAt('crab', e.x + rnd(-30, 10));
      break;
    case 'spiderq': // 별실 그물: 경고된 두 곳에 그물이 떨어져 그 안의 기사·동료가 3초 동안 움직이지 못함 (공격은 가능)
      for (let k = 0; k < 2; k++) { const tx = clamp(near - 40 + k * 140 + rnd(-30, 30), B.base.x + 90, e.x - 40); warnZone(e, tx - 70, tx + 70, 1.1 + k * 0.35, '#fff3c0', () => { zoneHit(tx - 70, tx + 70, A * 0.5, { root: 3 }); fx('web', { x: tx, y: GY - 6, dur: 3, r: 70 }); addText(tx, GY - 100, '별실 그물!', '#fff3c0', 16); }); }
      break;
    case 'shadowk': { // 거울 기술: 보리의 기술을 거울처럼 — 불꽃 → 돌진 베기 → 그림자 동료 소환 순서로
      e.mk = ((e.mk || 0) + 1) % 3;
      if (e.mk === 1) { const len = 320; warnZone(e, e.x - len - 60, e.x - 20, 1.1, '#c04aff', () => { fx('ebreath', { x: e.x - 60, y: GY - 70, face: -1, len, dur: 0.9 }); for (let q = 0; q < 3; q++) B.later.push({ t: q * 0.25, fn: () => zoneHit(e.x - len - 60, e.x - 20, A * 0.24) }); addText(e.x - 100, GY - 160, '거울 불꽃!', '#e0b0ff', 18, true); }); }
      else if (e.mk === 2) { const tx = clamp(near, B.base.x + 120, e.x - 60); warnZone(e, tx - 90, e.x, 1.0, '#b48cff', () => { e.x = clamp(tx + 40, B.base.x + 140, B.nest.x - 60); zoneHit(tx - 90, tx + 90, A * 1.3, { kb: -60 }); fx('slash', { x: tx, y: GY - 50, dur: 0.35 }); fx('boom', { x: tx, y: GY, dur: 0.4, r: 70 }); B.shake = 0.4; addText(tx, GY - 150, '거울 돌진 베기!', '#e0b0ff', 18, true); }); }
      else { spawnAt('sknight', e.x + rnd(-40, 20)); poof(e.x, GY - 30, '#7a5ad0', 14); addText(e.x, GY - 170, '그림자 기사단 소환!', '#e0b0ff', 18, true); }
      break; }
    case 'jelly':
      for (let k = 0; k < 3; k++) { const tx = clamp(fx0 - 60 + k * 80 + rnd(-30, 30), B.base.x + 80, e.x - 40); warnZone(e, tx - 50, tx + 50, 1.0 + k * 0.3, '#ffb3e0', () => { zoneHit(tx - 50, tx + 50, A * 0.7, { stun: 1.4 }); for (let q = 0; q < 8; q++) B.parts.push({ x: tx + rnd(-40, 40), y: GY - rnd(10, 60), vx: rnd(-20, 20), vy: rnd(-90, -40), life: 1, max: 1, col: pick(['#ffd0f0', '#d0e8ff', '#ffffff']), size: rnd(4, 9), g: -20 }); addText(tx, GY - 90, 'Zzz…', '#ffd0f0', 16); }); }
      break;
    case 'dmir': {
      const len = 300; warnZone(e, e.x - len - 110, e.x - 30, 1.1, '#c04aff', () => { fx('ebreath', { x: e.x - 140, y: GY - 78, face: -1, len, dur: 1.0 }); for (let q = 0; q < 3; q++) B.later.push({ t: q * 0.25, fn: () => zoneHit(e.x - len - 110, e.x - 30, A * 0.24) }); B.shake = 0.4; }); break; }
    case 'cogowl':
      for (let k = 0; k < 2; k++) { const x1 = e.x - 40 - k * 20; warnZone(e, x1 - 420, x1, 1.0 + k * 0.45, '#d9a830', () => { B.gears = (B.gears || []); B.gears.push({ x: x1, x0: x1, v: -520, A: A * 0.5, r: 26 + k * 4, hit: new Set() }); SFX.slam(); }); }
      break;
    case 'tcat': {
      B.slow = 3; for (let i = 0; i < B.scd.length; i++) B.scd[i] += 2; fx('flash', { dur: 0.3, col: '#b48cff' }); B.msg = { t: 2.2, s: '시간 먹기! 3초 동안 동료가 느려지고 스킬 대기 +2초' };
      const tx = near; warnZone(e, tx - 80, tx + 80, 1.1, '#b48cff', () => { e.x = clamp(tx + 60, B.base.x + 140, B.nest.x - 60); zoneHit(tx - 80, tx + 80, A * 1.5, { stun: 0.5 }); fx('boom', { x: tx, y: GY, dur: 0.45, r: 70 }); poof(tx, GY - 10, '#6a5a9a', 12); B.shake = 0.4; }); break; }
    case 'bonedra':
      for (let k = 0; k < 3; k++) warnZone(e, e.x - 380, e.x - 30, 1.0 + k * 0.4, '#e8e0c8', () => { zoneHit(e.x - 380, e.x - 30, A * 0.55); for (let q = 0; q < 4; q++) fx('boom', { x: e.x - 60 - rnd(0, 300), y: GY - rnd(0, 30), dur: 0.4, r: 40 }); burst(e.x - 120, GY - 40, '#fff3d6', 10, 200, true); });
      break;
  }
  return false;
}
function drawWarns() {
  if (B.gears) for (const gq of B.gears) { ART.gearShape(ctx, gq.x, GY - gq.r + 6, gq.r, 10, '#d9a830', gq.rot); ctx.fillStyle = '#5a3a22'; circ(gq.x, GY - gq.r + 6, gq.r * 0.25); }
  if (B.slow > 0) { ctx.save(); ctx.globalAlpha = 0.15 + Math.sin(G.time * 4) * 0.05; ctx.fillStyle = '#7a5ad0'; ctx.fillRect(B.camX - OX, 0, VW, H); ctx.restore(); }
  for (const w of B.warns) {
    const p = 1 - w.t / w.T, mid = (w.x0 + w.x1) / 2, rx = Math.max(10, (w.x1 - w.x0) / 2);
    ctx.save(); ctx.fillStyle = ART.rgba(w.col, 0.18 + 0.12 * Math.sin(G.time * 18)); ctx.beginPath(); ctx.ellipse(mid, GY + 10, rx, 18, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,70,50,.9)'; ctx.lineWidth = 3; ctx.setLineDash([10, 6]); ctx.lineDashOffset = -G.time * 30; ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = ART.rgba(w.col, 0.5); ctx.beginPath(); ctx.ellipse(mid, GY + 10, rx * p, 18 * p, 0, 0, TAU); ctx.fill();
    if (Math.floor(G.time * 8) % 2) txt('!', mid, GY - 22, 28, '#ff5252', 'center');
    if (w.src && w.src.kind === 'bellknight') { /* v4.3 딸랑 종소리 원: 굵은 금빛 테두리 + 「피해요!」 (봇·사람 모두 잘 안 보여서 많이 맞았음) */ ctx.strokeStyle = '#ffcc00'; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(mid, GY + 10, rx + 3, 21, 0, 0, TAU); ctx.stroke(); ctx.strokeStyle = 'rgba(120,70,0,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(mid, GY + 10, rx + 7, 25, 0, 0, TAU); ctx.stroke();
      ctx.font = `bold 16px ${FONT}`; const tw = ctx.measureText('피해요!').width + 22; RR(mid - tw / 2, GY - 158, tw, 26, 13); ctx.fillStyle = 'rgba(90,40,0,.85)'; ctx.fill(); txt('피해요!', mid, GY - 145, 16, '#ffe27a', 'center', false); ctx.fillStyle = 'rgba(90,40,0,.85)'; ctx.beginPath(); ctx.moveTo(mid - 7, GY - 132); ctx.lineTo(mid + 7, GY - 132); ctx.lineTo(mid, GY - 123); ctx.fill(); }
    ctx.restore();
  }
  for (const e of B.enemies) {
    if (e.hide > 0) { ctx.fillStyle = '#6b4426'; ART.E(ctx, e.x, GY + 8, 40, 12); ctx.fill(); ctx.fillStyle = '#8a5a35'; ART.E(ctx, e.x, GY + 2, 30, 10); ctx.fill(); }
    if (e.reflect > 0) { ctx.save(); ctx.globalAlpha = 0.35 + Math.sin(G.time * 6) * 0.15; ctx.strokeStyle = '#bff4ff'; ctx.lineWidth = 3; ctx.beginPath(); for (let k = 0; k <= 6; k++) { const a = k / 6 * TAU + G.time, r = 120; ctx.lineTo(e.x + Math.cos(a) * r * 0.8, GY - 90 + Math.sin(a) * r); } ctx.stroke(); ctx.fillStyle = 'rgba(160,240,255,.12)'; ctx.fill(); ctx.restore(); }
  }
}
function endBattle(win) {
  if (B.over) return;
  if (!B.special && !B.pvp) { S.loseN = S.loseN || {}; if (win) delete S.loseN[B.n]; else S.loseN[B.n] = (S.loseN[B.n] || 0) + 1; } /* v5.2 패배 도우미 세기 */
  if (win && S.pet && !B.pvp && !B.special && !NOPET) { S.petWins = S.petWins || {}; const was = petBuddy(S.pet); S.petWins[S.pet] = (S.petWins[S.pet] || 0) + 1; if (!was && petBuddy(S.pet)) B.buddyNew = 1; } /* v5.1 단짝 세기 */
  if (B.coinK && B.coinK !== 1) B.coins = Math.round(B.coins * B.coinK);
  for (const d of B.drops) { if (d.type === 'coin') B.coins += d.val; else if (d.type === 'box' && win) B.loot.push(makeItem(B.n, d.minR || 0)); }
  for (const f of B.fly) B.coins += f.val;
  B.drops = []; B.fly = [];
  const r = B.base.hp / B.base.max; let stars = 0, bonus = 0, unlockMsg = null;
  if (win) {
    stars = B.rematch != null ? 1 + (B.t <= 180 ? 1 : 0) + (B.heroDied ? 0 : 1) : r > 0.7 ? 3 : r > 0.35 ? 2 : 1; bonus = B.special ? 0 : Math.round((40 + B.n * 20) * COIN_RATE); dailyAdd('c', 1); /* v4.3 보스 도전관은 별 기준이 다름 */
    const g0 = dragonStage();
    if (!B.special && B.si.boss && B.n > S.cleared) S.coins += 300; /* v4.4 보석은 게임 안에서 안 나옴 → 보스 처음 깨기 코인 +300 */
    if (!B.special && B.si.boss) { const first = B.n > S.cleared; S.dust = (S.dust || 0) + (first ? 5 : 2); B.dustGot = (B.dustGot || 0) + (first ? 5 : 2); }
    if (!B.special && B.n > S.cleared) { S.cleared = B.n; const nu = UNITS.find(u => u.unlock === B.n + 1); if (nu) { unlockMsg = nu; const ni = UNITS.indexOf(nu); if (!S.deck.includes(ni) && S.deck.length < 5) S.deck.push(ni); } }
    if (!B.special) { S.stars[B.n] = Math.max(S.stars[B.n] || 0, stars); RANK_ONLINE.submit('stars', starTotal()); } /* v4.1 별 순위표도 올리기 (빠져 있었음) */
    { const sk = seasonNow(); if (sk) { const pid = SEASONS[sk].pet; S.pets = S.pets || {}; if (!S.pets[pid]) { S.pets[pid] = 1; S.petPop = pid; } } }
    if (B.starPouch) { S.dust = (S.dust || 0) + 3; B.dustGot = (B.dustGot || 0) + 3; } /* v4.4 별가루 주머니 */
    if (dragonStage() > g0 && mounted()) GROWN = { st: dragonStage(), t: 0 };
    if (!B.special && B.n % CHL === 0 && !S.chRew[B.si.ch]) grantChapterReward(B.si.ch);
    for (const a of B.allies) { a.hop = 0.5; emoteAt(a, pick(['heart', 'note', 'star']), 2.4); } emoteAt(B.hero, 'heart', 2.4); B.party = 1;
    for (const e of B.enemies) poof(e.x, GY - 20, '#b39ddb', 4);
    B.enemies = []; burst(B.nest.x, GY - 70, '#ce93d8', 70, 320, true); poof(B.nest.x, GY - 40, '#7e57c2', 24);
    AUD.stop(); SFX.win(); setTimeout(() => SFX.winSong && SFX.winSong(), 900);
  } else { AUD.stop(); SFX.lose(); setTimeout(() => SFX.loseSong && SFX.loseSong(), 1000); }
  if (B.special) specialEnd(win);
  let sold = 0, aSold = 0; const AS = S.autoSell || 0; for (const it of B.loot) { if (it.r < AS) aSold += sellPrice(it); else if (S.inv.length < 28) S.inv.push(it); else sold += sellPrice(it); } sold += aSold;
  B.permK = win ? permMult() : 1; S.coins += (B.coins + bonus) * B.permK + sold; S.tut = true; /* v4.5 영구 구매(보상 2배·4배)는 이긴 판 코인에 바로 곱함 */
  B.over = { win, stars, bonus, sold, aSold, t: 0, unlockMsg };
  holds.clear(); refreshHolds(); save();
}

/* ---------------- 그리기 도우미 ---------------- */
const { RR, E } = { RR: (x, y, w, h, r) => ART.RR(ctx, x, y, w, h, r), E: (x, y, rx, ry) => ART.E(ctx, x, y, rx, ry) };
function circ(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
let BASE_SC = 1;
function txt(s, x, y, size, col, align, stroke, weight, maxW) {
  if (size < 14.5) size += 1; if (size < 13.5) size = 13.5; { const k = Math.abs(ctx.getTransform().a) / BASE_SC; if (k > 0.2 && k < 0.98 && size * k < 12.5) size = Math.min(size * 1.6, 12.5 / k); } /* v4.8 11.5 → 12.5 · v4.9 → 13.5 (폰 가로 800×360에서 약 7.5px 이상) */ /* v3.8 작게 줄인 그림(도감 초상화 등) 안의 글씨도 화면에서 11.5 이상 */ /* v3.6 가장 작은 글씨도 11.5 (좁은 폰 가로 800에서도 9.5px 이상) */ const req0 = size; /* v2.7 가독성: 아주 작은 글씨 한 단계 키움 */
  ctx.font = `${weight || 'bold'} ${size}px ${FONT}`; ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle';
  const ls = size < 16 ? '0.4px' : '0px'; if ('letterSpacing' in ctx) ctx.letterSpacing = ls;
  // v0.9: 폰마다 글꼴 폭이 달라 겹치는 문제 → 최대 폭을 넘으면 글자 크기를 자동으로 줄임
  if (maxW) { const w0 = ctx.measureText(s).width; if (w0 > maxW) { size = Math.max(11, size * maxW / w0); ctx.font = `${weight || 'bold'} ${size}px ${FONT}`; } }
  if (stroke !== false) { ctx.lineWidth = Math.max(2, Math.min(4.5, size * 0.17)); ctx.strokeStyle = typeof stroke === 'string' ? stroke : 'rgba(35,16,6,.78)'; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); } /* v2.7 외곽선 얇게 */
  ctx.fillStyle = col || '#fff'; ctx.fillText(s, x, y); if (window.__TL) txtLog(s, x, y, size, req0, maxW);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
}
/* v3.5 글씨 전수검사용 기록 (테스트 때만 window.__TL 켜짐) */
function txtLog(s, x, y, size, req, maxW) { const w = ctx.measureText(s).width, a = ctx.textAlign, x0 = a === 'center' ? x - w / 2 : a === 'right' ? x - w : x, m = ctx.getTransform(), p0 = m.transformPoint(new DOMPoint(x0, y - size * 0.6)), p1 = m.transformPoint(new DOMPoint(x0 + w, y + size * 0.6)); window.__TL.push({ s: String(s), x0: Math.min(p0.x, p1.x), y0: Math.min(p0.y, p1.y), x1: Math.max(p0.x, p1.x), y1: Math.max(p0.y, p1.y), sz: size * Math.abs(m.a), req, sh: req ? size / req : 1, al: ctx.globalAlpha, mw: maxW || 0 }); }
/* v3.7 좁은 칸 글씨: 줄이지 않고 두 줄로 나눔 (띄어쓰기 기준, 가운데에 가까운 곳) */
function txtW(s, x, y, size, col, align, maxW, lh) {
  const sz = Math.max(13.5, size < 14.5 ? size + 1 : size); ctx.font = `bold ${sz}px ${FONT}`; if ('letterSpacing' in ctx) ctx.letterSpacing = sz < 16 ? '0.4px' : '0px'; const w0 = ctx.measureText(s).width; if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  if (w0 <= maxW || s.length < 4) return txt(s, x, y, size, col, align, false, null, maxW);
  const sp = []; for (let i = 1; i < s.length - 1; i++) if (s[i] === ' ') sp.push(i); const mid = s.length / 2, at = sp.length ? sp.sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid))[0] : Math.round(mid), L = lh || sz + 2;
  txt(s.slice(0, at).trim(), x, y - L / 2, size, col, align, false, null, maxW); txt(s.slice(at).trim(), x, y + L / 2, size, col, align, false, null, maxW);
}
function bigText(s, x, y, size, c1, c2, outline) {
  ctx.font = `900 ${size}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.fillStyle = 'rgba(40,15,0,.28)'; ctx.fillText(s, x + 1, y + 3);
  ctx.lineWidth = Math.max(3, size / 5.5); ctx.strokeStyle = outline || '#4a2511'; ctx.strokeText(s, x, y); /* v2.7 큰 제목 외곽선 얇게 */
  const g = ctx.createLinearGradient(0, y - size / 2, 0, y + size / 2); g.addColorStop(0, c1); g.addColorStop(1, c2); ctx.fillStyle = g; ctx.fillText(s, x, y); if (window.__TL) txtLog(s, x, y, size, size, 0);
}
function btn(x, y, w, h, label, tap, o) {
  o = o || {}; const key = o.key || (label + '@' + Math.round(x) + ',' + Math.round(y));
  const b = { x, y, w, h, tap, hold: o.hold, disabled: o.disabled, key }; uiPush(b);
  const pressed = (o.hold && inp[o.hold]) || pressT[key] > 0;
  ctx.save(); if (o.disabled) ctx.globalAlpha = 0.5;
  ART.button(ctx, x, y, w, h, o.bg || '#ffb84d', pressed, o.r); if (window.__TL) { const m = ctx.getTransform(), p0 = m.transformPoint(new DOMPoint(x + 3, y + 3)), p1 = m.transformPoint(new DOMPoint(x + w - 3, y + h - 3)); window.__TL.push({ btn: 1, s: '[단추]' + String(label || ''), x0: Math.min(p0.x, p1.x), y0: Math.min(p0.y, p1.y), x1: Math.max(p0.x, p1.x), y1: Math.max(p0.y, p1.y), al: ctx.globalAlpha }); } /* v4.3 검사용: 단추 자리 기록 (단추 밑에 깔린 글씨 찾기) */
  if (label) { const Ls = String(label).split('\n'), sz = o.size || 20; Ls.forEach((L, i) => txt(L, x + w / 2, y + h / 2 + (pressed ? 4 : 0) + (i - (Ls.length - 1) / 2) * sz * 1.25, i ? sz - 2 : sz, o.fg || '#ffffff', 'center', o.fg ? false : true, null, w - 12)); }
  ctx.restore(); return b;
}
function bar(x, y, w, h, v, col, bg) {
  RR(x, y, w, h, h / 2); ctx.fillStyle = bg || 'rgba(20,8,0,.55)'; ctx.fill();
  const vw = Math.max(0, Math.min(1, v)) * (w - 4);
  if (vw > 1) { RR(x + 2, y + 2, vw, h - 4, (h - 4) / 2); ctx.fillStyle = ART.lgr(ctx, ART.LI(col, 0.35), ART.DK(col, 0.12), 0, y, 0, y + h); ctx.fill(); RR(x + 4, y + 3, Math.max(0, vw - 4), Math.max(1, (h - 4) * 0.35), 2); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fill(); }
}
function star(x, y, r, col) { ART.star(ctx, x, y, r, col); }

/* ---------------- 이펙트 그리기 ---------------- */
function drawFx() {
  for (const f of B.fx) {
    const p = f.t / f.dur;
    if (f.type === 'slash') {
      ctx.save(); ctx.translate(f.x, f.y); ctx.scale(f.face, 1); const R = f.big ? 70 : f.small ? 24 : 42;
      ctx.globalAlpha = (1 - p) * 0.7; ctx.globalCompositeOperation = 'lighter';
      const a0 = -1.4 + p * 0.6, a1 = a0 + 2.2 * Math.min(1, p * 3 + 0.3);
      ctx.beginPath(); ctx.arc(0, 0, R, a0, a1); ctx.arc(0, 4, R * 0.72, a1, a0, true); ctx.closePath();
      const col = f.col || (f.big ? '#ffc878' : '#ffffff');
      const g = ctx.createLinearGradient(0, -R, R, R); g.addColorStop(0, ART.rgba(col, 0)); g.addColorStop(1, ART.rgba(col, 0.95)); ctx.fillStyle = g; ctx.fill();
      if (f.wk) { ctx.strokeStyle = ART.rgba('#ffffff', 0.9 * (1 - p)); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, R + 2, a0 + 0.2, a1); ctx.stroke(); for (let k = 0; k < 4; k++) { const a = a0 + (a1 - a0) * (k + 0.5) / 4; ART.star(ctx, Math.cos(a) * (R + 6), Math.sin(a) * (R + 6), 3 * (1 - p), ART.rgba(col, 1)); } }
      ctx.restore();
    } else if (f.type === 'crit') {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - p; ctx.translate(f.x, f.y);
      for (let k = 0; k < 10; k++) { const a = k / 10 * TAU + p; ctx.strokeStyle = k % 2 ? '#ffe082' : '#ffffff'; ctx.lineWidth = 3 * (1 - p); ctx.beginPath(); ctx.moveTo(Math.cos(a) * 10, Math.sin(a) * 10); ctx.lineTo(Math.cos(a) * (24 + p * 40), Math.sin(a) * (24 + p * 40)); ctx.stroke(); }
      ctx.drawImage(ART.softDot('#fff3b0'), -30, -30, 60, 60); ctx.restore();
      ctx.save(); ctx.globalAlpha = 1 - p * p; ctx.font = `900 ${18 + (1 - p) * 8}px ${FONT}`; ctx.textAlign = 'center'; ctx.lineWidth = 5; ctx.strokeStyle = '#7a2a00'; ctx.strokeText('CRITICAL!', f.x, f.y - 34 - p * 20); ctx.fillStyle = '#ffd54f'; ctx.fillText('CRITICAL!', f.x, f.y - 34 - p * 20); ctx.restore();
    } else if (f.type === 'pawstamp') {
      const q = Math.min(1, p / 0.35), land = p >= 0.35;
      ctx.save(); ctx.translate(f.x, f.y);
      if (!land) { ctx.globalAlpha = 0.9; ctx.translate(0, -(1 - q) * 220); const sc = 2.6 - q * 0.6; ctx.scale(sc, sc); ART.paw(ctx, 0, -18, 6, 'rgba(255,190,90,.95)'); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(ART.softDot('#ffd27a'), -40, -60, 80, 80); }
      else { const r = (p - 0.35) / 0.65; ctx.globalAlpha = 1 - r; ctx.scale(1, 0.3); ART.paw(ctx, 0, -10, 9 + r * 4, 'rgba(255,180,80,.6)'); }
      ctx.restore();
      if (land) { const r = (p - 0.35) / 0.65; ctx.save(); ctx.globalAlpha = 1 - r; ctx.strokeStyle = '#5a3a20'; ctx.lineWidth = 2.5; for (let k = 0; k < 7; k++) { const a = Math.PI + k / 6 * Math.PI; ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x + Math.cos(a) * (40 + r * 70), f.y - Math.sin(a) * (6 + r * 8)); ctx.stroke(); } ctx.restore(); }
    } else if (f.type === 'barkwave') {
      ctx.save(); ctx.translate(f.x, f.y); ctx.scale(f.face, 1);
      for (let k = 0; k < 3; k++) { const q = p * 1.4 - k * 0.2; if (q < 0 || q > 1) continue; ctx.globalAlpha = 1 - q; ctx.strokeStyle = '#b3ecff'; ctx.lineWidth = 6 * (1 - q) + 1; ctx.beginPath(); ctx.arc(0, 0, 20 + q * 220, -0.7, 0.7); ctx.stroke(); }
      ctx.globalAlpha = Math.max(0, 1 - p * 1.2); ctx.font = `900 ${34 + p * 30}px ${FONT}`; ctx.textAlign = 'center'; ctx.lineWidth = 6; ctx.strokeStyle = '#0d47a1'; ctx.strokeText('멍!!', 60 + p * 90, -10); ctx.fillStyle = '#e1f5fe'; ctx.fillText('멍!!', 60 + p * 90, -10);
      ctx.restore();
    } else if (f.type === 'meteor') {
      if (f.delay > 0) continue;
      const q = Math.min(1, p / 0.8);
      if (q < 1) { const mx = f.x - 140 * (1 - q), my = f.y - 420 * (1 - q) - 20; ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g2 = ctx.createLinearGradient(mx, my, mx - 70, my - 200); g2.addColorStop(0, 'rgba(255,220,120,.9)'); g2.addColorStop(1, 'rgba(255,150,40,0)'); ctx.strokeStyle = g2; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx - 50, my - 150); ctx.stroke(); ctx.drawImage(ART.softDot('#ffd27a'), mx - 22, my - 22, 44, 44); ctx.restore(); ART.bone(ctx, mx, my, 26, '#fff8e0', q * 10); }
    } else if (f.type === 'boom') {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (1 - p) * 0.5; /* v3.8 폭발 빛 절반 */ const r = f.r * (0.4 + p * 0.8);
      ctx.drawImage(ART.softDot('#ffb04a'), f.x - r, f.y - r * 0.9, r * 2, r * 1.4); ctx.drawImage(ART.softDot('#ffffff'), f.x - r * 0.35, f.y - r * 0.5, r * 0.7, r * 0.7);
      ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = 'rgba(255,240,200,' + (1 - p) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(f.x, f.y, r, r * 0.25, 0, 0, TAU); ctx.stroke();
      for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI; ART.bone(ctx, f.x + Math.cos(a) * r * 0.8, f.y - Math.sin(a) * r * 0.9 * (1 - p) - p * 10, 9, '#fff3d6', a + p * 6); }
      ctx.restore();
    } else if (f.type === 'quake') {
      ctx.save(); ctx.globalAlpha = (1 - p) * 0.8; ctx.strokeStyle = '#fff3d6'; ctx.lineWidth = 4 * (1 - p); ctx.beginPath(); ctx.ellipse(f.x, f.y, 20 + p * 90, 6 + p * 18, 0, 0, TAU); ctx.stroke();
      ctx.fillStyle = '#8a6a4a'; for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI; ctx.fillRect(f.x + Math.cos(a) * (20 + p * 50) - 2, f.y - Math.sin(a) * 30 * p - 4 + p * p * 40, 5, 5); } ctx.restore();
    } else if (f.type === 'thrust') {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - p; ctx.translate(f.x, f.y); ctx.scale(f.face, 1);
      const g = ctx.createLinearGradient(0, 0, f.len, 0); g.addColorStop(0, 'rgba(160,220,255,0)'); g.addColorStop(1, 'rgba(220,245,255,.95)'); ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(f.len * (0.6 + p * 0.4), 0); ctx.lineTo(0, 4); ctx.fill(); ctx.restore();
    } else if (f.type === 'hit' || f.type === 'spark') {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (1 - p) * 0.6; ctx.translate(f.x, f.y); ctx.rotate(p * 1.5);
      const r = f.r * (0.5 + p * 0.8); ctx.fillStyle = f.col;
      ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, q = i % 2 ? r * 0.22 : r; ctx.lineTo(Math.cos(a) * q, Math.sin(a) * q); } ctx.closePath(); ctx.fill();
      ctx.drawImage(ART.softDot('#ffffff'), -r * 0.6, -r * 0.6, r * 1.2, r * 1.2);
      ctx.restore();
    } else if (f.type === 'pillar') {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.sin(p * Math.PI) * 0.38; /* v3.8 빛기둥 0.85 → 0.38 */
      const col = f.col || '#ffe082', w = 34 * (1 - p * 0.4), g = ctx.createLinearGradient(f.x - w, 0, f.x + w, 0);
      g.addColorStop(0, ART.rgba(col, 0)); g.addColorStop(0.5, ART.rgba(col, 0.9)); g.addColorStop(1, ART.rgba(col, 0));
      ctx.fillStyle = g; ctx.fillRect(f.x - w, f.y - 260, w * 2, 260);
      ctx.restore();
    } else if (f.type === 'breath') {
      // v1.0 화려한 용의 불꽃: 흐르는 불꽃 혀 + 하얀 심지 + 열기 + 불티 + 연기
      const grow = Math.min(1, p * 5), fade = p > 0.78 ? (1 - p) / 0.22 : 1, L = f.len * grow, fc = f.face;
      const hs = heroScale(), m = ART.dragonMouth(dragonStage()), mx = (B.hero.dead ? f.x : B.hero.x) + fc * m[0] * hs, my = GY + m[1] * hs;
      ctx.save();
      // 연기 (어둡게, 끝부분)
      for (let k = 0; k < 7; k++) { const t = ((k / 7) + G.time * 0.6) % 1, x = mx + fc * L * (0.75 + t * 0.35), y = my - 18 - t * 40 + Math.sin(G.time * 3 + k) * 6, r = 16 + t * 26; ctx.globalAlpha = fade * (1 - t) * 0.28; ctx.fillStyle = '#5a4a4a'; ART.E(ctx, x, y, r, r * 0.8); ctx.fill(); }
      ctx.globalCompositeOperation = 'lighter';
      // 바깥 열기
      for (let k = 0; k < 10; k++) { const t = k / 9, x = mx + fc * L * t, r = 26 + t * 44; ctx.globalAlpha = fade * 0.16; ctx.drawImage(ART.softDot(FLAME_PAL[mirSkin().flame] ? FLAME_PAL[mirSkin().flame].h : '#ff5a1e'), x - r, my + t * 26 - r, r * 2, r * 2); }
      // 흐르는 불꽃 혀 (보통 합성 → 밝은 배경에서도 진한 주황·빨강이 살아 있음)
      ctx.globalCompositeOperation = 'source-over';
      for (let k = 0; k < 22; k++) {
        const t = ((k / 22) + G.time * 2.2) % 1, x = mx + fc * L * t, wob = Math.sin(G.time * 18 + k * 2.1) * (3 + t * 14), y = my + t * 26 + wob, len = 22 + t * 46, wid = 7 + t * 18;
        const FP = FLAME_PAL[mirSkin().flame], cols = FP ? (t < 0.35 ? [FP.a, FP.b, FP.c] : [FP.b, FP.c, ART.DK ? FP.c : FP.c]) : t < 0.3 ? ['#fff6c0', '#ffc030', '#ff7a1a'] : t < 0.7 ? ['#ffd040', '#ff7a1a', '#e0301a'] : ['#ffb030', '#f04a18', '#a0101a'];
        ctx.save(); ctx.translate(x, y); ctx.scale(fc, 1); ctx.rotate(Math.sin(G.time * 9 + k) * 0.18 - 0.12);
        const gr = ctx.createLinearGradient(-len * 0.5, 0, len * 0.6, 0); gr.addColorStop(0, ART.rgba(cols[0], 0.95 * fade)); gr.addColorStop(0.5, ART.rgba(cols[1], 0.9 * fade)); gr.addColorStop(1, ART.rgba(cols[2], 0.15 * fade));
        ctx.globalAlpha = 1 - t * 0.35; ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(-len * 0.45, 0); ctx.bezierCurveTo(-len * 0.3, -wid, len * 0.25, -wid * 0.9, len * 0.65, -wid * 0.15); ctx.quadraticCurveTo(len * 0.2, wid * 0.2, len * 0.55, wid * 0.6); ctx.bezierCurveTo(len * 0.1, wid * 1.0, -len * 0.3, wid * 0.8, -len * 0.45, 0); ctx.fill();
        ctx.restore();
      }
      // 하얀 심지
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = fade * 0.6; const cg = ctx.createLinearGradient(mx, 0, mx + fc * L * 0.45, 0); cg.addColorStop(0, 'rgba(255,255,255,.95)'); cg.addColorStop(1, 'rgba(255,240,160,0)'); ctx.fillStyle = cg;
      ctx.beginPath(); ctx.moveTo(mx, my - 5); ctx.quadraticCurveTo(mx + fc * L * 0.15, my - 7, mx + fc * L * 0.28, my + 6); ctx.quadraticCurveTo(mx + fc * L * 0.12, my + 6, mx, my + 5); ctx.closePath(); ctx.fill();
      ctx.drawImage(ART.softDot('#fff6c8'), mx - 22, my - 22, 44, 44);
      ctx.restore();
      for (let q = 0; q < 2; q++) if (Math.random() < 0.8) B.parts.push({ x: mx + fc * rnd(20, L), y: my + rnd(-6, 30), vx: fc * rnd(60, 200), vy: rnd(-160, -40), life: rnd(0.4, 0.8), max: 0.8, col: FLAME_PAL[mirSkin().flame] ? pick([FLAME_PAL[mirSkin().flame].a, FLAME_PAL[mirSkin().flame].b]) : pick(['#fff3a0', '#ffb030', '#ff5a1e']), size: rnd(2, 4.5), g: -30 });
    } else if (f.type === 'web') {
      ctx.save(); ctx.globalAlpha = Math.min(1, (1 - p) * 3) * 0.8; ctx.strokeStyle = '#fff3c0'; ctx.lineWidth = 1.4; ctx.translate(f.x, f.y);
      for (let k = 0; k < 10; k++) { const an = Math.PI + k / 9 * Math.PI; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(an) * f.r, Math.sin(an) * f.r * 0.9); ctx.stroke(); }
      for (let r = 14; r < f.r; r += 14) { ctx.beginPath(); ctx.arc(0, 0, r, Math.PI, TAU); ctx.stroke(); }
      for (let k = 0; k < 5; k++) ART.star(ctx, Math.cos(Math.PI + k * 0.7) * f.r * 0.7, Math.sin(Math.PI + k * 0.7) * f.r * 0.6, 3, '#fff6c8');
      ctx.restore();
    } else if (f.type === 'ebreath') {
      // v1.1 악몽 미르의 보랏빛 거꾸로 불꽃
      const grow = Math.min(1, p * 5), fade = p > 0.75 ? (1 - p) / 0.25 : 1, L = f.len * grow, fc = f.face, mx = f.x, my = f.y;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 9; k++) { const t = k / 8, x = mx + fc * L * t, r = 24 + t * 40; ctx.globalAlpha = fade * 0.38; ctx.drawImage(ART.softDot('#b050ff'), x - r, my + t * 50 - r, r * 2, r * 2); }
      ctx.globalCompositeOperation = 'source-over';
      for (let k = 0; k < 18; k++) {
        const t = ((k / 18) + G.time * 2.0) % 1, x = mx + fc * L * t, y = my + t * 56 + Math.sin(G.time * 16 + k * 2) * (3 + t * 12), len = 20 + t * 44, wid = 7 + t * 16;
        const cols = t < 0.35 ? ['#f6e0ff', '#c070ff', '#7a2ad0'] : ['#d080ff', '#7a2ad0', '#2a0850'];
        ctx.save(); ctx.translate(x, y); ctx.scale(fc, 1); ctx.rotate(Math.sin(G.time * 8 + k) * 0.2 + 0.2);
        const gr = ctx.createLinearGradient(-len * 0.5, 0, len * 0.6, 0); gr.addColorStop(0, ART.rgba(cols[0], 0.9 * fade)); gr.addColorStop(0.5, ART.rgba(cols[1], 0.85 * fade)); gr.addColorStop(1, ART.rgba(cols[2], 0.1 * fade));
        ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(-len * 0.45, 0); ctx.bezierCurveTo(-len * 0.3, -wid, len * 0.25, -wid * 0.9, len * 0.65, -wid * 0.15); ctx.quadraticCurveTo(len * 0.2, wid * 0.2, len * 0.55, wid * 0.6); ctx.bezierCurveTo(len * 0.1, wid, -len * 0.3, wid * 0.8, -len * 0.45, 0); ctx.fill(); ctx.restore();
      }
      ctx.restore();
      if (Math.random() < 0.7) B.parts.push({ x: mx + fc * rnd(20, L), y: my + rnd(0, 50), vx: fc * rnd(40, 160), vy: rnd(-120, -30), life: 0.6, max: 0.6, col: pick(['#f0c8ff', '#a040ff', '#ff4a8a']), size: rnd(2, 4), g: -30 });
    } else if (f.type === 'wave') {
      ctx.save(); ctx.globalAlpha = 1 - p; ctx.strokeStyle = '#e1f5fe'; ctx.lineWidth = 5;
      for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(f.x, f.y, 30 + p * 200 + k * 26, -0.6, 0.6); ctx.stroke(); ctx.beginPath(); ctx.arc(f.x, f.y, 30 + p * 200 + k * 26, Math.PI - 0.6, Math.PI + 0.6); ctx.stroke(); }
      ctx.restore();
    }
  }
}
function drawDrop(d) {
  if (d.life < 4 && Math.floor(d.life * 8) % 2 === 0) return;
  const bob = d.ground ? Math.sin(G.time * 5 + d.x) * 2.5 : 0, y = d.y - 10 + bob;
  ctx.fillStyle = 'rgba(0,0,0,.2)'; ART.E(ctx, d.x, d.gy + 2, 8, 2.5); ctx.fill();
  if (d.type === 'coin') { ctx.save(); ctx.translate(d.x, y); ctx.scale(Math.abs(Math.cos(G.time * 6 + d.x)) * 0.7 + 0.3, 1); ART.icon(ctx, 'coin', 0, 0, 16); ctx.restore(); return; }
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.45 + Math.sin(G.time * 6) * 0.15;
  ctx.drawImage(ART.softDot(d.gold ? '#ffd34d' : d.type === 'box' ? '#ffd740' : d.type === 'star' ? '#64b5f6' : '#ffffff'), d.x - 20, y - 22, 40, 40); ctx.restore();
  if (d.type === 'bone') ART.icon(ctx, 'bone', d.x, y, 24);
  else if (d.type === 'meat') ART.icon(ctx, 'heart', d.x, y, 22);
  else if (d.type === 'star') ART.icon(ctx, 'mana', d.x, y, 22);
  else if (d.type === 'box') {
    const gold = (d.minR || 0) >= 1, wood = gold ? ['#7a3fc0', '#3f1a72'] : ['#b8783f', '#6e4320'], trim = gold ? '#ffd34d' : '#c9cfd6';
    ctx.save(); ctx.translate(d.x, y);
    if (d.ground) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.rotate(G.time * 0.8); for (let k = 0; k < 8; k++) { ctx.rotate(Math.PI / 4); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-4, -30); ctx.lineTo(4, -30); ctx.closePath(); ctx.fillStyle = gold ? 'rgba(255,210,90,.22)' : 'rgba(255,240,180,.16)'; ctx.fill(); } ctx.restore(); }
    RR(-14, -8, 28, 18, 3); ctx.fillStyle = ART.lgr(ctx, wood[0], wood[1], 0, -8, 0, 10); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#3a2212'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-15, -7); ctx.lineTo(-15, -11); ctx.quadraticCurveTo(0, -22, 15, -11); ctx.lineTo(15, -7); ctx.closePath(); ctx.fillStyle = ART.lgr(ctx, ART.LI(wood[0], 0.2), wood[0], 0, -20, 0, -7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(-12, -15, 24, 2);
    ctx.fillStyle = trim; [[-15, -14], [11, -14]].forEach(([bx]) => { ctx.fillRect(bx, -14, 4, 24); }); ctx.fillRect(-15, -8, 30, 2.5);
    ctx.strokeStyle = '#3a2212'; ctx.lineWidth = 1; ctx.strokeRect(-15, -8, 30, 2.5);
    RR(-4.5, -9, 9, 9, 2); ctx.fillStyle = '#ffd34d'; ctx.fill(); ctx.lineWidth = 1.4; ctx.stroke(); ctx.fillStyle = '#3a2212'; circ(0, -5.5, 1.4); ctx.fillRect(-0.7, -5, 1.4, 3);
    const tw = Math.sin(G.time * 5 + d.x) * 0.5 + 0.5; ctx.globalAlpha = tw; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(10, -22); ctx.quadraticCurveTo(10, -18, 14, -18); ctx.quadraticCurveTo(10, -18, 10, -14); ctx.quadraticCurveTo(10, -18, 6, -18); ctx.quadraticCurveTo(10, -18, 10, -22); ctx.fill(); ctx.globalAlpha = 1;
    ctx.restore();
  }
}
function findTargetNear(u) { for (const e of B.enemies) if (!e.dead && Math.abs(e.x - u.x) < 120) return true; return false; }
function frameKey(u, spd) {
  if (u.atkAnim > 0) { const p = 1 - u.atkAnim / 0.3; return 'a' + Math.min(7, Math.max(0, Math.floor(p * 8))); }
  if (u.moving) u._mvT = G.time; /* v3.8 걷기↔서기 그림이 몇 프레임마다 바뀌며 떨려 보이던 문제: 멈춘 뒤 0.18초는 걷기 그림 유지 */
  if (u.moving || G.time - (u._mvT == null ? -9 : u._mvT) < 0.18) return 'w' + (Math.floor(u.anim * (spd || u.spd) / 34 * 10) % 10);
  const tt = (u.anim + (u.x % 3)) % 3.4; if (tt < 0.13) return 'ib';
  return 'i' + (Math.floor(u.anim * 4.8) % 6);
}
// v1.0 전투 연출: 공격 때 앞으로 쭉 내딛기, 맞을 때 찌그러짐·뒤로 밀림 (그림만 움직임 · 판정 위치는 그대로)
function motionOf(u, dir) {
  let lx = 0, sx = 1, sy = 1;
  if (u.atkAnim > 0) { const T = u.isHero ? 0.3 : 0.3, p = 1 - u.atkAnim / T, k = p < 0.45 ? -Math.sin(p / 0.45 * Math.PI * 0.5) * 0.35 : Math.sin((p - 0.45) / 0.55 * Math.PI); lx = dir * k * (u.def && u.def.boss ? 14 : 8); if (p > 0.45 && p < 0.75) { sx = 1.06; sy = 0.95; } }
  if (u.hit > 0) { const h = u.hit / 0.18, q = u.side === 'a' && !u.isHero ? 0.025 : 0.07; lx -= dir * h * (u.side === 'a' ? 2 : 4); sx *= 1 + h * q; sy *= 1 - h * q; } // v2.3 동료는 맞을 때 찌그러짐을 작게 (앞줄 뭉치가 계속 출렁이던 문제)
  return { lx, sx, sy };
}
function drawEntity(u) {
  if (u.x < B.camX - 110 - OX || u.x > B.camX + W + 110 + OX) return;
  const y = GY + u.y;
  if (!(u.def && u.def.fly)) { ctx.fillStyle = 'rgba(30,15,0,.22)'; ART.E(ctx, u.x, y + 2, u.def && u.def.boss ? 64 : u.isHero ? 22 : 17, u.def && u.def.boss ? 11 : 5); ctx.fill(); }
  else { ctx.fillStyle = 'rgba(30,15,0,.14)'; ART.E(ctx, u.x, y + 2, 14, 4); ctx.fill(); }
  const flash = u.hit > 0 ? u.hit / 0.18 * (u.side === 'a' || u.isHero ? 0.4 : 0.85) : 0; /* v3.8 우리 편은 맞을 때 하얗게 번쩍이는 정도를 절반 이하로 */
  let top;
  if (u.isHero) {
    if (B.buff > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25 + Math.sin(G.time * 8) * 0.1; ctx.drawImage(ART.softDot('#80d8ff'), u.x - 40, y - 70, 80, 80); ctx.restore(); }
    ctx.save(); ctx.globalAlpha = 0.5; ctx.strokeStyle = 'rgba(255,213,79,.7)'; ctx.lineWidth = 2; ctx.setLineDash([7, 7]); ctx.lineDashOffset = -G.time * 20; ctx.beginPath(); ctx.ellipse(u.x, y + 3, 170, 13, 0, 0, TAU); ctx.stroke(); ctx.restore();
    const wr = S.eq.weapon ? S.eq.weapon.r : -1;
    if (wr >= 3) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (let k = 0; k < 3; k++) { const a = G.time * 2 + k * 2.1, px = u.x + u.face * 18 + Math.cos(a) * 10, py = y - 44 + Math.sin(a * 1.3) * 16; ctx.globalAlpha = 0.6; ctx.drawImage(ART.softDot(wr === 4 ? '#ff7ae6' : '#ffd54f'), px - 6, py - 6, 12, 12); } ctx.restore(); }
    { const m = motionOf(u, u.face); ctx.save(); ctx.translate(u.x + m.lx, y); ctx.scale(m.sx, m.sy); ART.draw(ctx, heroType(), frameKey(u, 120), 0, 0, heroScale(), u.face < 0, flash); ctx.restore(); }
    top = y - 84;
    if (u.em) drawEmote(u.em, u.x + 10, top - 22);
  } else if (u.side === 'a') {
    const d = u.def, tr = TRAITS[d.id] || {}, idle = !u.moving && u.atkAnim <= 0;
    let hp2 = u.hop > 0 ? -Math.sin(u.hop / 0.5 * Math.PI) * (u.hopA || 12) : 0, jx = 0, sx2 = 1, sy2 = 1; if (u.hop <= 0) u.hopA = 0;
    if (tr.fx === 'bounce' && u.moving) hp2 -= Math.abs(Math.sin(G.time * 6 + u.x)) * 1.6; // v2.3 몽실 걸음 통통: 5 → 1.6 (전투 중 위아래 흔들림 줄임)
    if (tr.fx === 'wiggle') { const w = Math.sin(G.time * 14 + u.x); sx2 = 1 + w * 0.03; sy2 = 1 - w * 0.03; }
    if (tr.fx === 'shiver' && idle) jx = Math.sin(G.time * 60 + u.x) * 0.8;
    if (tr.fx === 'stretch' && u.moving) { sx2 = 1.06; sy2 = 0.95; }
    if (tr.fx === 'snore' && idle && !findTargetNear(u)) { sy2 = 1 + Math.sin(G.time * 2) * 0.015; }
    if (tr.fx === 'howl' && u.em && u.em.k === 'howl') { hp2 -= 3; }
    let qr = 0; if (u.qk && (u.moving || u.atkAnim > 0)) u.qk = null; if (u.qk) { const X = cuteXf(d.id, 'quirk', u.qk.t / u.qk.T); jx += X.dx; hp2 += Math.max(-4, X.dy * 0.4); qr = X.rot * 0.6; sx2 *= d.id === 'u6' ? 1 : X.sx; sy2 *= 1 + (X.sy - 1) * 0.5; } // v2.3 전투 중엔 버릇을 작게 (위아래 4px 이하, 푸들 회전 없음)
    const m = motionOf(u, 1); ctx.save(); ctx.translate(u.x + jx + m.lx, y + hp2); if (qr) ctx.rotate(qr); ctx.scale(sx2 * m.sx, sy2 * m.sy); /* v3.8 승급 동료 뒤 노란 빛 없앰 (전투 중 너무 번쩍여 캐릭터가 안 보였음) */ ART.draw(ctx, u.kind, frameKey(u), 0, 0, d.s, false, flash); ctx.restore();
    if (u.em) drawEmote(u.em, u.x + 6, y - 70 * d.s - 14);
    top = y - 70 * d.s;
    if (B.buff > 0) { ctx.fillStyle = '#80d8ff'; ART.star(ctx, u.x, top - 2 + Math.sin(G.time * 6 + u.x) * 2, 4.5, '#b3ecff'); }
  } else {
    if (u.elite) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.26 + Math.sin(G.time * 5) * 0.08; /* v3.8 정예 몬스터 빛 0.55 → 0.26 */ ctx.drawImage(ART.softDot('#ffb300'), u.x - 60, y - u.def.h * 1.5 - 20, 120, u.def.h * 1.5 + 40); ctx.restore(); }
    if (u.root > 0) { ctx.save(); ctx.strokeStyle = 'rgba(255,240,190,.85)'; ctx.lineWidth = 1.2; const cy2 = y - 20; for (let k = 0; k < 6; k++) { const an = k / 6 * TAU; ctx.beginPath(); ctx.moveTo(u.x, cy2); ctx.lineTo(u.x + Math.cos(an) * 22, cy2 + Math.sin(an) * 22); ctx.stroke(); } ctx.beginPath(); ctx.arc(u.x, cy2, 11, 0, TAU); ctx.arc(u.x, cy2, 19, 0, TAU); ctx.stroke(); ctx.restore(); }
    if (u.treasure > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.55 + Math.sin(G.time * 8) * 0.25; ctx.drawImage(ART.softDot('#7fe0ff'), u.x - 50, y - 90, 100, 100); ctx.restore(); ART.star(ctx, u.x + Math.sin(G.time * 5) * 18, y - 60, 5, '#fff6a0'); txt(Math.ceil(u.treasure) + '초', u.x, y - 78, 13, '#bfefff', 'center'); }
    if (u.guard > 0) { ctx.save(); ctx.globalAlpha = 0.45 + Math.sin(G.time * 6) * 0.15; ctx.strokeStyle = '#c8b8ff'; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(u.x - 60, y - 70, 26, 80, 0, Math.PI * 0.55, Math.PI * 1.45); ctx.stroke(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(ART.softDot('#b8a8ff'), u.x - 100, y - 160, 70, 180); ctx.restore(); }
    if (u.stun > 0) { for (let k = 0; k < 3; k++) { const a = G.time * 6 + k * 2.1; ART.star(ctx, u.x + Math.cos(a) * 14, y - u.def.h * (u.sc || 1) - 4 + Math.sin(a) * 4, 4, '#ffe082'); } }
    { const m = motionOf(u, -1); ctx.save(); ctx.translate(u.x + m.lx, y); ctx.scale(m.sx, m.sy); ART.draw(ctx, u.kind, frameKey(u), 0, 0, u.def.s * (u.sc || 1), true, flash); ctx.restore(); }
    top = y - u.def.h * (u.sc || 1);
    if (u.elite) { ART.icon(ctx, 'star', u.x, top - 18, 16); txt('정예', u.x, top - 30, 12, '#ffd54f', 'center'); }
    if (u.oppHero && B.pvp) { ctx.save(); ctx.translate(u.x, top - 18); RR(-26, -9, 52, 18, 9); ctx.fillStyle = 'rgba(120,20,30,.8)'; ctx.fill(); ctx.strokeStyle = '#ffcf5a'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore(); txt(`Lv.${B.pvp.l || S.lv}`, u.x, top - 17.5, 12, '#ffe082', 'center', false); } /* v4.6 상대 기사 */
  }
  if (u.hp < u.max && !u.isHero) { const bw = u.def && u.def.boss ? 96 : u.elite ? 64 : 34; bar(u.x - bw / 2, top - 6, bw, 7, u.hp / u.max, u.side === 'a' ? '#66bb6a' : '#ff5252'); }
  if (u.isHero) {
    ctx.save(); ctx.translate(u.x, top - 6); RR(-22, -9, 44, 18, 9); ctx.fillStyle = 'rgba(40,20,5,.75)'; ctx.fill(); ctx.strokeStyle = '#ffcf5a'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
    txt(`Lv.${S.lv}`, u.x, top - 5.5, 12, '#ffe082', 'center', false);
    if (B.bubble) drawBubble(u.x + 10, top - 22, B.bubble.s, Math.min(1, B.bubble.t * 3));
  }
}
// v2.1 감정 말풍선: 하얀 동그란 말풍선이 뿅 튀어나옴 (소환·처치·위기·승리 때도)
function emoteAt(u, k, t) { if (!u || u.dead) return; u.em = { k, t: t || 1.8, T: t || 1.8 }; }
function drawEmote(em, x, y) {
  if (S && S.emoteOff) return;
  const T = em.T || 1.6, el = T - em.t, a = Math.min(1, em.t * 3, el * 8), pop = el < 0.18 ? 0.4 + el / 0.18 * 0.85 : el < 0.3 ? 1.25 - (el - 0.18) / 0.12 * 0.25 : 1, bob = Math.sin(el * 6) * 2;
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x + 4, y - 10 + bob); ctx.scale(pop * 1.15, pop * 1.15);
  ctx.fillStyle = 'rgba(40,20,5,.18)'; ART.E(ctx, 1, 2, 15, 13); ctx.fill();
  ctx.fillStyle = '#fffdf6'; ART.E(ctx, 0, 0, 15, 13); ctx.fill(); ctx.beginPath(); ctx.moveTo(-6, 9); ctx.lineTo(-10, 18); ctx.lineTo(1, 11); ctx.closePath(); ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = '#6a4024'; ctx.beginPath(); ctx.ellipse(0, 0, 15, 13, 0, 0.35 * Math.PI, 2.45 * Math.PI); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-5.5, 11.8); ctx.lineTo(-10, 18); ctx.lineTo(0.5, 12.8); ctx.stroke();
  ctx.scale(0.8, 0.8);
  const k = em.k;
  if (k === 'heart') { ctx.fillStyle = '#ff5a8a'; ctx.beginPath(); ctx.moveTo(0, 6); ctx.bezierCurveTo(-9, -1, -4, -9, 0, -4); ctx.bezierCurveTo(4, -9, 9, -1, 0, 6); ctx.fill(); ctx.strokeStyle = '#7a1a3a'; ctx.lineWidth = 1.2; ctx.stroke(); }
  else if (k === 'zz') { txt('z', -5, 3, 14, '#cfe8ff', 'center', '#2a3a6a'); txt('Z', 6, -9, 17, '#cfe8ff', 'center', '#2a3a6a'); }
  else if (k === 'note') { txt('♪', 0, 0, 20, '#ffe082', 'center', '#7a4a00'); }
  else if (k === 'star' || k === 'sparkle') { ART.star(ctx, 0, 0, 8, '#ffe27a'); ART.star(ctx, 9, -8, 4, '#ffffff'); }
  else if (k === '!' || k === '?') { txt(k, 0, 0, 22, k === '!' ? '#ff7043' : '#64b5f6', 'center', '#3a1a00'); }
  else if (k === 'sweat') { ctx.fillStyle = '#7fd0ff'; ctx.beginPath(); ctx.moveTo(0, -8); ctx.quadraticCurveTo(7, 2, 0, 6); ctx.quadraticCurveTo(-7, 2, 0, -8); ctx.fill(); ctx.strokeStyle = '#2a6a9a'; ctx.lineWidth = 1; ctx.stroke(); }
  else if (k === 'drool') { ctx.fillStyle = 'rgba(200,235,255,.9)'; ctx.beginPath(); ctx.moveTo(12, 30); ctx.quadraticCurveTo(15, 38, 12, 42); ctx.quadraticCurveTo(9, 38, 12, 30); ctx.fill(); }
  else if (k === 'dots') { txt('……', 0, 0, 14, '#ffffff', 'center', '#333'); }
  else { const w = { huff: '흥!', sniff: '킁킁', howl: '아우~', yawn: '하암~', woof: '왈!' }[k] || k; txt(w, 0, 0, 19, '#fff8e1', 'center', '#4a2a14'); }
  ctx.restore();
}
function drawBubble(x, y, s, a) {
  ctx.save(); ctx.globalAlpha = a; ctx.font = `bold 15px ${FONT}`; const w = ctx.measureText(s).width + 26, h = 32;
  const bx = clamp(x - w / 2 + 20, B ? 8 + 0 : 8, W * 4) ;
  ctx.translate(0, 0);
  RR(bx, y - h, w, h, 14); ctx.fillStyle = '#fffdf6'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#4a2a14'; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - 4, y - 2); ctx.lineTo(x - 10, y + 10); ctx.lineTo(x + 8, y - 2); ctx.closePath(); ctx.fillStyle = '#fffdf6'; ctx.fill();
  ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.lineTo(x - 10, y + 10); ctx.lineTo(x + 8, y); ctx.strokeStyle = '#4a2a14'; ctx.stroke();
  txt(s, bx + w / 2, y - h / 2, 15, '#4a2a14', 'center', false);
  ctx.restore();
}
/* v4.5 화려한 멍멍성 꾸미기 (보석 · 능력치 없음): 황금 왕궁 · 무지개 동화성 · 별빛 수정성 */
const CASTLE_SKINS = [
  { k: 'gold', n: '황금 왕궁', gem: 700, tint: ['#ffe680', '#f0b030'], a: 1, d: '금빛 벽 · 왕관 지붕 · 반짝반짝', buf: { hp: 0.12 }, bt: '성 체력 +12%' },
  { k: 'rainbow', n: '무지개 동화성', gem: 700, tint: ['#ff9ad0', '#ffc0e0'], a: 1, d: '분홍빛 벽 · 무지개 · 풍선', buf: { hp: 0.06, regen: 0.0025 }, bt: '성 +6% · 천천히 회복' },
  { k: 'crystal', n: '별빛 수정성', gem: 700, tint: ['#9ad8ff', '#7ab0ff'], a: 1, d: '수정 벽 · 별빛 · 오로라', buf: { hp: 0.06, dr: 0.1 }, bt: '성 +6% · 받는 피해 -10%' }];
/* v4.6 성 + 장식 2개 = 세트 (장식을 성 자리에 두면 완성) */
const CASTLE_SETS = {
  base: { n: '기사단 세트', need: ['heroonly', 'mirfire'], buf: { hp: 0.05 }, bt: '성 체력 +5%' },
  gold: { n: '황금 왕실 세트', need: ['bossrush', 'bone2x'], buf: { hp: 0.08, food: 20 }, bt: '성 체력 +8% · 뼈다귀 +20' },
  rainbow: { n: '동화 나라 세트', need: ['eventfest', 'tiny'], buf: { regen: 0.0025 }, bt: '성 회복 2배' },
  crystal: { n: '별빛 수호 세트', need: ['night', 'noskill'], buf: { dr: 0.08 }, bt: '받는 피해 -8% 더' } };
function castleSetOf(k) { return CASTLE_SETS[k || 'base']; }
function castleSetOn(k) { const St = castleSetOf(k); if (!St) return false; const D = decorSlots(); return St.need.every(q => D.includes(q)); }
function castleBuff() { const k = S.castleSkin || null, Sk = CASTLE_SKINS.find(q => q.k === k), o = { hp: 0, dr: 0, regen: 0, food: 0, set: null };
  const add = b => { for (const q in b) o[q] += b[q]; }; if (Sk && Sk.buf) add(Sk.buf); if (castleSetOn(k)) { add(castleSetOf(k).buf); o.set = castleSetOf(k).n; } return o; }
const CSKIN_C = {};
function castleSkinImg(k) { const C = ART.castle(); if (!k) return C; if (CSKIN_C[k]) return CSKIN_C[k]; const Sk = CASTLE_SKINS.find(q => q.k === k); if (!Sk) return C;
  const c = document.createElement('canvas'); c.width = C.c.width; c.height = C.c.height; const g = c.getContext('2d'); g.drawImage(C.c, 0, 0); g.globalCompositeOperation = 'multiply'; const gr = g.createLinearGradient(0, 0, 0, c.height); gr.addColorStop(0, Sk.tint[0]); gr.addColorStop(1, Sk.tint[1]); g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height); g.globalCompositeOperation = 'destination-in'; g.drawImage(C.c, 0, 0); /* 색을 곱해서 진하게 물들이고 성 모양만 남김 */ if (Sk.lift) { g.globalCompositeOperation = 'screen'; g.globalAlpha = 0.32; g.fillStyle = Sk.lift; g.fillRect(0, 0, c.width, c.height); g.globalCompositeOperation = 'destination-in'; g.globalAlpha = 1; g.drawImage(C.c, 0, 0); }
  g.globalCompositeOperation = 'source-atop'; g.globalAlpha = 0.22; g.fillStyle = '#ffffff'; for (let i = 0; i < 50; i++) { g.beginPath(); g.arc(Math.random() * c.width, Math.random() * c.height, 2 + Math.random() * 4, 0, Math.PI * 2); g.fill(); }
  return (CSKIN_C[k] = Object.assign({}, C, { c })); }
function drawCastleSkinFx(k, x, sh) { const t = G.time; /* 성 위 장식 (뒤 그림 위·글씨 아래) */
  if (k === 'gold') { const cx = x + sh, cy = GY - 222; ctx.fillStyle = ART.lgr(ctx, '#fff6b0', '#d8901a', 0, cy - 22, 0, cy + 4); ctx.beginPath(); ctx.moveTo(cx - 22, cy + 4); ctx.lineTo(cx - 24, cy - 16); ctx.lineTo(cx - 11, cy - 6); ctx.lineTo(cx, cy - 24); ctx.lineTo(cx + 11, cy - 6); ctx.lineTo(cx + 24, cy - 16); ctx.lineTo(cx + 22, cy + 4); ctx.closePath(); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#7a4a0a'; ctx.stroke(); [['#ff4a6a', -12], ['#4ab0ff', 0], ['#4ad07a', 12]].forEach(([c2, dx]) => { ctx.fillStyle = c2; ctx.beginPath(); ctx.arc(cx + dx, cy - 3, 3, 0, TAU); ctx.fill(); });
    for (let q = 0; q < 6; q++) { const ph = (t * 0.5 + q / 6) % 1; ctx.globalAlpha = Math.sin(ph * Math.PI); ART.star(ctx, x - 90 + q * 34, GY - 40 - ((q * 53) % 170), 4 + ph * 3, '#fff3a0'); } ctx.globalAlpha = 1; }
  if (k === 'rainbow') { ctx.save(); ctx.globalAlpha = 0.55; ['#ff6b6b', '#ffb84d', '#ffe14a', '#6fd86a', '#5ab8ff', '#9b6bff'].forEach((c2, q) => { ctx.strokeStyle = c2; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(x + sh, GY - 40, 175 - q * 6, Math.PI * 1.12, Math.PI * 1.88); ctx.stroke(); }); ctx.restore();
    [['#ff8ab0', -70], ['#8fd0ff', 74], ['#ffe27a', 40]].forEach(([c2, dx], q) => { const bx = x + dx + sh, by = GY - 200 - q * 14 + Math.sin(t * 1.6 + q) * 5; ctx.strokeStyle = 'rgba(90,60,40,.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(bx, by + 12); ctx.lineTo(bx + 2, by + 40); ctx.stroke(); ctx.fillStyle = c2; ART.E(ctx, bx, by, 10, 12); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.6)'; ART.E(ctx, bx - 3, by - 4, 2.5, 4); ctx.fill(); }); }
  if (k === 'crystal') { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25 + Math.sin(t * 1.2) * 0.08; ctx.drawImage(ART.softDot('#8ad8ff'), x - 160, GY - 300, 320, 280); ctx.restore();
    [[-118, -248, 1], [0, -232, 1.3], [96, -170, 0.9]].forEach(([dx, dy, sc]) => { const cx = x + dx + sh, cy = GY + dy; ctx.fillStyle = ART.lgr(ctx, '#e8f8ff', '#7a8aff', cx - 8, 0, cx + 8, 0); ctx.beginPath(); ctx.moveTo(cx, cy - 18 * sc); ctx.lineTo(cx + 7 * sc, cy); ctx.lineTo(cx, cy + 8 * sc); ctx.lineTo(cx - 7 * sc, cy); ctx.closePath(); ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#3a3a8a'; ctx.stroke(); });
    for (let q = 0; q < 7; q++) { const ph = (t * 0.4 + q / 7) % 1; ctx.globalAlpha = Math.sin(ph * Math.PI) * 0.9; ART.star(ctx, x - 110 + q * 36, GY - 60 - ((q * 71) % 190), 3 + ph * 4, '#e8f0ff'); } ctx.globalAlpha = 1; } }
function drawCastle() {
  const b = B.base, C = castleSkinImg(S.castleSkin), sh = b.hit > 0 ? rnd(-2, 2) : 0, r = b.hp / b.max;
  ctx.drawImage(C.c, b.x - C.ox + sh, GY + 12 - C.oy, C.w, C.h); if (S.castleSkin) drawCastleSkinFx(S.castleSkin, b.x, sh);
  decorSlots().forEach((k, q) => { if (k) { const P = DSLOT[q]; drawDecor(b.x + P.x + sh, GY + P.y, k, P.s); } });
  const fx0 = b.x - 107 + sh, fy0 = GY + 12 - 268, wv = G.time * 6;
  ctx.fillStyle = '#5b3a22'; ctx.fillRect(fx0 - 1.5, fy0 - 34, 3, 36);
  ctx.beginPath(); ctx.moveTo(fx0, fy0 - 34); for (let i = 0; i <= 10; i++) ctx.lineTo(fx0 + i * 4, fy0 - 34 + Math.sin(wv + i * 0.6) * 2.5 * (i / 10)); for (let i = 10; i >= 0; i--) ctx.lineTo(fx0 + i * 4, fy0 - 14 + Math.sin(wv + i * 0.6) * 2.5 * (i / 10)); ctx.closePath();
  ctx.fillStyle = '#e53935'; ctx.fill(); ART.paw(ctx, fx0 + 20, fy0 - 24 + Math.sin(wv + 3) * 1.2, 0.75, '#fff');
  if (r < 0.66) { ctx.strokeStyle = 'rgba(40,20,10,.75)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(b.x - 40, GY - 60); ctx.lineTo(b.x - 28, GY - 40); ctx.lineTo(b.x - 36, GY - 22); ctx.stroke(); }
  if (r < 0.33) { ctx.beginPath(); ctx.moveTo(b.x + 30, GY - 130); ctx.lineTo(b.x + 20, GY - 105); ctx.lineTo(b.x + 34, GY - 90); ctx.stroke(); if (Math.random() < 0.15) B.parts.push({ x: b.x + rnd(-40, 40), y: GY - 150, vx: rnd(-10, 10), vy: -30, life: 1.2, max: 1.2, col: '#6d6d6d', size: 14, g: -10, soft: true }); }
}
function drawTotem(tw) {
  if (tw.x < B.camX - 100 - OX || tw.x > B.camX + W + 100 + OX) return;
  const x = tw.x + (tw.hit > 0 ? rnd(-2, 2) : 0), y = GY + 10;
  ctx.fillStyle = 'rgba(20,0,30,.3)'; ART.E(ctx, x, y + 2, 40, 9); ctx.fill();
  if (tw.dead) { ctx.fillStyle = '#2a1f35'; ctx.beginPath(); ctx.moveTo(x - 24, y); ctx.lineTo(x - 18, y - 30); ctx.lineTo(x - 4, y - 22); ctx.lineTo(x + 6, y - 38); ctx.lineTo(x + 20, y - 18); ctx.lineTo(x + 24, y); ctx.fill(); return; }
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 + Math.sin(G.time * 3) * 0.2; ctx.drawImage(ART.softDot('#b14cff'), x - 60, y - 190, 120, 200); ctx.restore();
  const g = ctx.createLinearGradient(x - 20, 0, x + 20, 0); g.addColorStop(0, '#1a1228'); g.addColorStop(0.5, '#4a3466'); g.addColorStop(1, '#1a1228');
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - 26, y); ctx.lineTo(x - 18, y - 120); ctx.lineTo(x, y - 150); ctx.lineTo(x + 18, y - 120); ctx.lineTo(x + 26, y); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#0d0815'; ctx.lineWidth = 2; ctx.stroke();
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(214,140,255,${0.6 + Math.sin(G.time * 4) * 0.3})`; ctx.lineWidth = 2.4;
  for (let k = 0; k < 3; k++) { const ry = y - 30 - k * 30; ctx.beginPath(); ctx.arc(x, ry, 7, 0.3, Math.PI * 1.7); ctx.stroke(); }
  ctx.restore();
  ART.E(ctx, x, y - 112, 8, 6); ctx.fillStyle = '#ff4fd8'; ctx.fill(); ART.E(ctx, x + 2, y - 112, 3, 4.5); ctx.fillStyle = '#20001a'; ctx.fill();
  for (const sx of [-1, 1]) { ctx.fillStyle = '#2a1f35'; ctx.beginPath(); ctx.moveTo(x + sx * 18, y - 90); ctx.lineTo(x + sx * 34, y - 112); ctx.lineTo(x + sx * 22, y - 80); ctx.fill(); }
  bar(x - 34, y - 166, 68, 7, tw.hp / tw.max, '#c56bff'); txt('그림자 토템', x, y - 176, 11, '#f0d0ff', 'center');
}
function drawNest() {
  if (B.pvp) { const n = B.nest, C = castleSkinImg('rainbow'), sh = n.hit > 0 ? rnd(-3, 3) : 0; ctx.save(); ctx.translate(n.x + sh, 0); ctx.scale(-1, 1); ctx.drawImage(C.c, -C.ox, GY + 12 - C.oy, C.w, C.h); ctx.restore(); RR(n.x - 40, GY - 105, 80, 26, 8); ctx.fillStyle = ART.lgr(ctx, '#fff0a8', '#d9a21b', 0, GY - 105, 0, GY - 79); ctx.fill(); RR(n.x - 36, GY - 102, 72, 20, 6); ctx.fillStyle = '#6a1a2a'; ctx.fill(); txt(B.pvp.n, n.x, GY - 91.5, 11, '#ffe9a0', 'center', false, null, 68); return; } /* v4.6 거울 그림이라 간판 글씨가 뒤집혀 보이던 것 → 상대 이름 간판으로 덮음 */ /* v4.5 1:1 대전: 상대 멍멍성 (거울) */
  const n = B.nest, C = ART.nest(), sh = n.hit > 0 ? rnd(-3, 3) : 0, cx = n.x - 4 + sh, cy = GY + 12 - 62;
  ctx.drawImage(C.c, n.x - C.ox + sh, GY + 12 - C.oy, C.w, C.h);
  ctx.save(); ctx.beginPath(); ctx.ellipse(cx, cy, 35, 51, 0, 0, TAU); ctx.clip();
  const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 55); g.addColorStop(0, '#ffb3ff'); g.addColorStop(0.3, '#c046e0'); g.addColorStop(1, '#2a0d3c'); ctx.fillStyle = g; ctx.fillRect(cx - 40, cy - 56, 80, 112);
  ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = 4;
  for (let k = 0; k < 5; k++) { ctx.strokeStyle = `rgba(234,128,252,${0.35 - k * 0.05})`; ctx.beginPath(); ctx.ellipse(cx, cy, 8 + k * 7, 12 + k * 10, 0, G.time * (1.5 + k * 0.3) + k, G.time * (1.5 + k * 0.3) + k + 3.6); ctx.stroke(); }
  ctx.restore();
  const eg = 0.6 + Math.sin(G.time * 3) * 0.4;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = eg;
  for (const dx of [-11, 7]) ctx.drawImage(ART.softDot('#ff3b30'), n.x - 2 + dx - 10 + sh, GY + 12 - 152 - 10, 20, 20);
  ctx.restore();
  ctx.fillStyle = '#ff5252'; for (const dx of [-11, 7]) { ART.E(ctx, n.x - 2 + dx + sh, GY + 12 - 152, 3.4, 2.6); ctx.fill(); }
  if (B.towers.some(t => !t.dead)) { ctx.save(); ctx.globalAlpha = 0.35 + Math.sin(G.time * 3) * 0.12; ctx.strokeStyle = '#e1a8ff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(n.x - 4, GY - 70, 78, 100, 0, 0, TAU); ctx.stroke(); ctx.fillStyle = 'rgba(190,120,255,.12)'; ctx.fill(); ctx.restore(); txt('방어막', n.x - 4, GY - 182, 12, '#f0d0ff', 'center'); }
}

/* ---------------- 전투 화면 ---------------- */
const MOVE_L = { x: 14, y: H - 112, w: 96, h: 100 }, MOVE_R = { x: 116, y: H - 112, w: 96, h: 100 };
function drawRealWeather(w, battle) {
  const t = G.time; ctx.save();
  if (w.night) { ctx.fillStyle = 'rgba(10,14,50,.32)'; ctx.fillRect(-OX, 0, VW, H); }
  if (w.k === 'rain') { ctx.strokeStyle = 'rgba(190,215,255,.45)'; ctx.lineWidth = 1.3; ctx.beginPath(); for (let k = 0; k < 70; k++) { const x = ((k * 97 + t * 260) % (VW + 60)) - OX - 30, y = ((k * 53 + t * 620) % (H + 40)) - 20; ctx.moveTo(x, y); ctx.lineTo(x - 5, y + 14); } ctx.stroke(); }
  if (w.k === 'snow') { ctx.fillStyle = 'rgba(255,255,255,.85)'; for (let k = 0; k < 60; k++) { const x = ((k * 97 + Math.sin(t + k) * 20 + t * 20) % (VW + 20)) - OX - 10, y = ((k * 61 + t * 40) % (H + 20)) - 10; ctx.beginPath(); ctx.arc(x, y, 1.5 + (k % 3), 0, TAU); ctx.fill(); } }
  if (w.k === 'cloud') { ctx.fillStyle = 'rgba(200,200,220,.10)'; ctx.fillRect(-OX, 0, VW, H); }
  ctx.restore();
}
let DARKC = null;
function drawDark2() { // 미르 불꽃·기사 주변만 밝게
  if (!DARKC) DARKC = document.createElement('canvas'); const cw = Math.ceil(VW), ch = H; if (DARKC.width !== cw) { DARKC.width = cw; DARKC.height = ch; } const g = DARKC.getContext('2d');
  g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, cw, ch); g.fillStyle = 'rgba(6,6,24,.9)'; g.fillRect(0, 0, cw, ch); g.globalCompositeOperation = 'destination-out';
  const hole = (x, y, r) => { const sx = x - B.camX + OX; if (sx < -r || sx > cw + r) return; const rg = g.createRadialGradient(sx, y, r * 0.35, sx, y, r); rg.addColorStop(0, 'rgba(0,0,0,1)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.beginPath(); g.arc(sx, y, r, 0, TAU); g.fill(); };
  const h = B.hero; if (!h.dead) hole(h.x, GY - 50, (mounted() ? 230 : 160) * (1 + Math.sin(G.time * 6) * 0.03));
  hole(B.base.x + 20, GY - 80, 170); for (const a of B.allies) if (!a.dead) hole(a.x, GY + a.y - 30, 70);
  for (const p of B.proj) hole(p.x, p.y, 40); for (const f of B.fx) if (f.x != null) hole(f.x, (f.y || GY) - 20, 90);
  ctx.drawImage(DARKC, -OX, 0);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; if (!h.dead) { ctx.globalAlpha = 0.35; ctx.drawImage(ART.softDot('#ffb060'), h.x - B.camX - 120, GY - 170, 240, 220); } ctx.restore();
  if (B.t < 5) bigText('밤 손전등 판! 기사 곁에만 빛이 있어요', W / 2, 170, 20, '#fff2c0', '#c87a2a');
}
function drawLanes() {
  const th = ART.THEMES[B.si.ti] || {}, pc = th.path || '#d8b880', top = GY - 82, bot = GY - 40, cx = B.camX;
  ctx.save();
  // 둑 그림자 + 흙 둑 옆면
  ctx.fillStyle = 'rgba(30,15,5,.28)'; ctx.fillRect(-OX, bot, VW, 14);
  ctx.fillStyle = ART.lgr(ctx, ART.DK(pc, 0.25), ART.DK(pc, 0.45), 0, bot - 6, 0, bot + 10); ctx.fillRect(-OX, bot - 4, VW, 12);
  // 길 윗면 (돌판)
  ctx.fillStyle = ART.lgr(ctx, ART.LI(pc, 0.15), pc, 0, top, 0, bot); ctx.fillRect(-OX, top, VW, bot - top);
  ctx.strokeStyle = 'rgba(90,60,30,.35)'; ctx.lineWidth = 1.2; const off = -(cx % 46);
  for (let x = -OX + off; x < VW; x += 46) { ctx.beginPath(); ctx.moveTo(x, top + 2); ctx.lineTo(x + 6, bot - 2); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(-OX, (top + bot) / 2); ctx.lineTo(VW, (top + bot) / 2); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(-OX, top, VW, 2.5);
  // 아래쪽 나무 울타리 (두 길 사이 칸막이)
  const fo = -(cx % 34); ctx.fillStyle = '#8a5a30'; ctx.strokeStyle = '#4a2a14'; ctx.lineWidth = 1;
  ctx.fillRect(-OX, bot + 10, VW, 3.5); ctx.fillRect(-OX, bot + 18, VW, 3.5);
  for (let x = -OX + fo; x < VW; x += 34) { ctx.fillRect(x, bot + 6, 5, 22); ctx.strokeRect(x, bot + 6, 5, 22); }
  ctx.restore();
  // 왼쪽 표지판
  [['위 길', top + 18, '#ffb070'], ['아래 길', GY - 4, '#7ac8ff']].forEach(([n, y, c]) => { const x = 18; RR(x, y - 11, 58, 22, 8); ctx.fillStyle = c; ctx.fill(); ctx.strokeStyle = 'rgba(60,30,10,.6)'; ctx.lineWidth = 1.5; ctx.stroke(); txt(n, x + 29, y, 12.5, '#3a1e0a', 'center', false); });
}
function drawBattle() {
  const sx = B.shake > 0 ? rnd(-7, 7) * Math.min(1, B.shake * 2) : 0, sy = B.shake > 0 ? rnd(-4, 4) * Math.min(1, B.shake * 2) : 0;
  ctx.save(); ctx.translate(sx, sy);
  if (B.punch > 0) { const z = 1 + B.punch * 0.12, fxp = clamp(B.hero.x - B.camX, 0, W); ctx.translate(fxp, GY - 40); ctx.scale(z, z); ctx.translate(-fxp, -(GY - 40)); }
  bgFull(B.si.ti, B.camX, G.time, GY, W, H);
  drawScenery();
  if (B.dark > 0) { ctx.fillStyle = `rgba(30,10,0,${Math.min(0.5, B.dark * 0.5)})`; ctx.fillRect(-OX, 0, VW, H); }
  drawRays(B.si.th.kind);
  if (B.si.dusk) { const g2 = ctx.createLinearGradient(0, 0, 0, GY); g2.addColorStop(0, 'rgba(255,110,60,.28)'); g2.addColorStop(1, 'rgba(255,170,90,.12)'); ctx.fillStyle = g2; ctx.fillRect(-OX, 0, VW, H); }
  if (B.si.night) { ctx.fillStyle = 'rgba(14,16,60,.3)'; ctx.fillRect(-OX, 0, VW, H); /* v3.4 밤을 덜 어둡게 (반딧불은 drawFireflies) */ for (let k = 0; k < 40; k++) { ctx.globalAlpha = 0.4 + Math.sin(G.time * 2 + k) * 0.35; ctx.fillStyle = '#fff'; circ((k * 197) % W, (k * 61) % 220, k % 6 ? 1.1 : 1.8); } ctx.globalAlpha = 1; }
  drawAmb(true);
  if (B.lanes) drawLanes(); /* v2.8 두 갈래 길: 어느 지도든 확실히 보이는 위 길(돌 둑길) + 울타리 */
  ctx.save(); ctx.translate(-B.camX, 0);
  drawCastle(); drawNest(); for (const tw of B.towers) drawTotem(tw);
  for (const d of B.drops) drawDrop(d);
  for (const r of B.rings) { ctx.strokeStyle = r.col; ctx.globalAlpha = Math.max(0, r.life / 0.45); ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(r.x, r.y, r.r, r.r * 0.3, 0, 0, TAU); ctx.stroke(); }
  ctx.globalAlpha = 1;
  drawWarns();
  if (B.ghosts && B.ghosts.length) { for (const gq of B.ghosts) { gq.t += G.dt || 0.016; const p = gq.t / 0.55; ctx.save(); ctx.globalAlpha = Math.max(0, 1 - p) * 0.7; ctx.translate(gq.x + gq.vx * gq.t, gq.y - 160 * gq.t + 320 * gq.t * gq.t); ctx.rotate(gq.rot * gq.t * 3); ctx.scale(1 - p * 0.3, 1 - p * 0.3); ART.draw(ctx, gq.k, 'ib', 0, 0, gq.s, true, 0.3); ctx.restore(); } /* v3.8 쓰러진 몬스터 하얀 잔상 옅게 */ B.ghosts = B.ghosts.filter(gq => gq.t < 0.55); }
  const list = B.allies.concat(B.enemies.filter(e => !(e.hide > 0))); if (!B.hero.dead) list.push(B.hero);
  list.sort((a, b) => a.y - b.y);
  drawPet();
  drawShopWorld();
  drawSeasonCastle();
  for (const u of list) drawEntity(u);
  for (const p of B.proj) {
    if (p.kind === 'bomb') { ctx.save(); ctx.globalAlpha = 0.35; p.trail.forEach((q, i) => { ctx.fillStyle = '#ffd9a0'; circ(q[0], q[1], 2 + i * 0.6); }); ctx.restore(); ART.bone(ctx, p.x, p.y, 20, '#fff3d6', p.a); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(ART.softDot('#ff9a3d'), p.x - 12, p.y - 12, 24, 24); ctx.restore(); }
    else if (p.kind === 'heart') { ctx.save(); ctx.translate(p.x, p.y); const sc = 1 + Math.sin(G.time * 16) * 0.12; ctx.scale(sc, sc); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(ART.softDot('#ff7ab6'), -14, -14, 28, 28); ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#ff4f8f'; ctx.beginPath(); ctx.moveTo(0, 6); ctx.bezierCurveTo(-9, -1, -4, -9, 0, -4); ctx.bezierCurveTo(4, -9, 9, -1, 0, 6); ctx.fill(); ctx.restore(); }
    else if (p.kind === 'arrow') { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = '#6d4c41'; ctx.fillRect(-12, -1.2, 20, 2.4); ctx.fillStyle = '#e0e6ea'; ctx.beginPath(); ctx.moveTo(8, -3.5); ctx.lineTo(15, 0); ctx.lineTo(8, 3.5); ctx.fill(); ctx.fillStyle = '#e53935'; ctx.beginPath(); ctx.moveTo(-12, -4); ctx.lineTo(-7, 0); ctx.lineTo(-12, 4); ctx.fill(); ctx.restore(); }
    else {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const col = p.kind === 'orb' ? '#b388ff' : '#9ccc65';
      p.trail.forEach((q, i) => { const s = 6 + i * 2; ctx.globalAlpha = i / p.trail.length * 0.5; ctx.drawImage(ART.softDot(col), q[0] - s, q[1] - s, s * 2, s * 2); });
      ctx.globalAlpha = 0.65; ctx.drawImage(ART.softDot(col), p.x - 14, p.y - 14, 28, 28); ctx.globalAlpha = 0.8; ctx.drawImage(ART.softDot('#ffffff'), p.x - 5, p.y - 5, 10, 10);
      ctx.restore();
    }
  }
  drawFx();
  for (const p of B.parts) {
    const a = Math.max(0, Math.min(1, p.life / p.max * 1.5));
    if (p.bone) { ctx.globalAlpha = a; ART.bone(ctx, p.x, p.y, 18, '#fffaf0', p.rot); }
    else if (p.note) { ctx.globalAlpha = a; txt('♪', p.x, p.y, 18, '#b3ecff', 'center', '#0d47a1'); }
    else if (p.soft) { ctx.globalAlpha = a * 0.7; const s = p.size * (1.6 - p.life / p.max * 0.6); ctx.drawImage(ART.softDot(p.col), p.x - s, p.y - s, s * 2, s * 2); }
    else if (p.glow) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * 0.6; /* v3.8 반짝 가루 빛 0.6배 */ ctx.drawImage(ART.softDot(p.col), p.x - p.size, p.y - p.size, p.size * 2, p.size * 2); ctx.restore(); }
    else { ctx.globalAlpha = a; ctx.fillStyle = p.col; circ(p.x, p.y, p.size * 0.5); }
  }
  ctx.globalAlpha = 1;
  for (const t of B.texts) {
    const age = t.max - t.life, pop = age < 0.12 ? 1 + (1 - age / 0.12) * 0.7 : 1;
    ctx.globalAlpha = Math.min(1, t.life / t.max * 2.2); txt(t.s, t.x, t.y, Math.round(t.size * pop), t.col, 'center', t.crit ? '#5a1a00' : true, '900');
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  foreFull(B.si.ti, B.camX);
  drawAmb(false);
  if (B.si.weather) { ctx.save(); ctx.strokeStyle = B.si.weather === 'storm' ? 'rgba(220,230,255,.45)' : 'rgba(190,215,255,.4)'; ctx.lineWidth = 1.2; ctx.beginPath(); const n2 = B.si.weather === 'storm' ? 90 : 60, sl = B.si.weather === 'storm' ? 10 : 4; for (let k = 0; k < n2; k++) { const rx = (k * 131 + G.time * 260 * (1 + (k % 3) * 0.2)) % (W + 40) - 20, ry = (k * 89 + G.time * 620) % (H + 40) - 20; ctx.moveTo(rx, ry); ctx.lineTo(rx - sl, ry + 16); } ctx.stroke(); ctx.restore(); if (B.si.weather === 'storm' && Math.sin(G.time * 0.9) > 0.995) { ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(-OX, 0, VW, H); } }
  if (B.rw) drawRealWeather(B.rw, true);
  if (B.dark2) drawDark2();
  vigFull();
  for (const f of B.fx) if (f.type === 'flash') { ctx.globalAlpha = (1 - f.t / f.dur) * 0.3; /* v3.8 화면 번쩍임 절반 */ ctx.fillStyle = f.col; ctx.fillRect(-OX, 0, VW, H); ctx.globalAlpha = 1; }
  ctx.restore();
  drawHUD();
  if (B.bossSk) { const a = Math.min(1, B.bossSk.t * 2); ctx.save(); ctx.globalAlpha = a; ART.panel(ctx, W / 2 - 150, 120, 300, 40, 'dark'); txt('⚠ ' + B.bossSk.s, W / 2, 140, 20, '#ffab91', 'center'); ctx.restore(); }
  if (B.silence > 0) txt('🔇 침묵 ' + B.silence.toFixed(1) + '초', W - 90, 168, 14, '#d1c4e9', 'center');
  if (B.skillCut) drawSkillCut(B.skillCut);
  if (B.banner > 0) drawBanner();
  if (B.paused && !B.over) drawPause();
  if (B.over) { drawResult(); drawAdPop(); }
}
const PROPSET = { meadow: ['house', 'flag', 'fence'], forest: ['mushhouse', 'lantern', 'log'], desert: ['tent', 'pillar', 'flag'], snow: ['igloo', 'lantern', 'snowman'], volcano: ['pillar', 'tornflag', 'brazier'],
  coast: ['hut', 'lantern', 'boat'], sky: ['balloon', 'flag', 'house'], crystal: ['lantern', 'pillar', 'cart'], swamp: ['pillar', 'lantern', 'shrine'], castle: ['pillar', 'tornflag', 'brazier'], starsea: ['lantern', 'boat', 'flag'], aurora: ['pillar', 'lantern', 'shrine'], mine: ['beam', 'cart', 'lantern', 'ore'], fossil: ['ribs', 'fern', 'lantern', 'egg'], clock: ['clockpost', 'gears', 'house', 'lantern'], tower: ['hourglass', 'pillar', 'clockpost', 'gears'], candy: ['lollipop', 'lantern', 'flag', 'boat'], upside: ['coral', 'lantern', 'boat', 'pillar'], stargarden: ['starflower', 'lantern', 'starflower', 'pillar'], firstcastle: ['banner', 'pillar', 'lantern', 'banner'], catrep: ['fishflag', 'lantern', 'house', 'fishflag'], feather: ['bigfeather', 'flag', 'bigfeather', 'lantern'], burrow: ['mushlamp', 'mushlamp', 'lantern', 'pillar'], namesea: ['boat', 'lantern', 'coral', 'boat'], rainbow: ['starflower', 'flag', 'lantern', 'starflower'], shadowvil: ['lantern', 'house', 'lantern', 'pillar'], silentmt: ['flag', 'pillar', 'house', 'lantern'], echocave: ['lantern', 'pillar', 'lantern', 'cart'], starmarket: ['lantern', 'cart', 'flag', 'lantern'], clockforest: ['lantern', 'pillar', 'lantern', 'house'], windnest: ['flag', 'balloon', 'house', 'flag'], icehaven: ['flag', 'lantern', 'house', 'flag'], oldcatrep: ['house', 'flag', 'lantern', 'house'], fieststad: ['balloon', 'flag', 'balloon', 'house'], toyland: ['lantern', 'balloon', 'pillar', 'lantern'], lastgate: ['tornflag', 'brazier', 'pillar', 'tornflag'], whalecave: ['lantern', 'pillar', 'lantern', 'pillar'], stormcrown: ['pillar', 'tornflag', 'brazier', 'pillar'], dawngarden: ['flag', 'pillar', 'house', 'flag'], hourglass: ['pillar', 'flag', 'cart', 'pillar'] };
const propCache = {};
function propCanvas(kind, th) {
  const key = kind + '|' + th.kind; if (propCache[key]) return propCache[key];
  const c = ART.mk(320, 320), g = c.getContext('2d'); g.scale(2, 2); g.translate(80, 150); g.lineJoin = 'round';
  const O = '#3a2212', R2 = (x, y, w, h, r, col) => { ART.RR(g, x, y, w, h, r); g.fillStyle = col; g.fill(); g.strokeStyle = O; g.lineWidth = 1.4; g.stroke(); };
  const roof = (x, y, w, col) => { g.beginPath(); g.moveTo(x - 6, y); g.lineTo(x + w / 2, y - w * 0.55); g.lineTo(x + w + 6, y); g.closePath(); g.fillStyle = col; g.fill(); g.strokeStyle = O; g.lineWidth = 1.4; g.stroke(); };
  const glow = (x, y, r, col) => { g.save(); g.globalCompositeOperation = 'lighter'; g.drawImage(ART.softDot(col), x - r, y - r, r * 2, r * 2); g.restore(); };
  if (kind === 'house' || kind === 'hut') { R2(-30, -40, 60, 40, 3, kind === 'hut' ? '#e8c890' : '#fff3d6'); roof(-30, -40, 60, kind === 'hut' ? '#c9a060' : '#d0503a'); R2(-8, -24, 16, 24, 6, '#7a4a2a'); R2(14, -32, 10, 10, 2, '#9fd8ff'); R2(-24, -32, 10, 10, 2, '#9fd8ff'); ART.paw(g, 0, -52, 0.6, '#fff3d6'); }
  else if (kind === 'mushhouse') { R2(-14, -34, 28, 34, 6, '#f2e6d0'); g.beginPath(); g.ellipse(0, -36, 34, 20, 0, Math.PI, 0); g.fillStyle = '#e53935'; g.fill(); g.strokeStyle = O; g.lineWidth = 1.4; g.stroke(); g.fillStyle = '#fff'; [[-18, -44], [6, -50], [20, -40]].forEach(([a, b]) => { ART.E(g, a, b, 4, 3); g.fill(); }); R2(-6, -18, 12, 18, 6, '#7a4a2a'); glow(0, -26, 16, '#ffd27a'); }
  else if (kind === 'flag' || kind === 'tornflag') { g.fillStyle = '#6b4426'; g.fillRect(-2, -90, 4, 90); g.beginPath(); g.moveTo(2, -88); g.quadraticCurveTo(22, -84, 40, -80); g.lineTo(kind === 'tornflag' ? 30 : 40, -70); g.lineTo(kind === 'tornflag' ? 38 : 40, -60); g.quadraticCurveTo(22, -64, 2, -62); g.closePath(); g.fillStyle = kind === 'tornflag' ? '#5b2a86' : '#e53935'; g.fill(); g.strokeStyle = O; g.lineWidth = 1.2; g.stroke(); ART.paw(g, 18, -74, 0.6, kind === 'tornflag' ? '#d8a8ff' : '#fff3d6'); ART.E(g, 0, -92, 4, 4); g.fillStyle = '#ffd34d'; g.fill(); }
  else if (kind === 'fence') { for (let k = 0; k < 4; k++) R2(-40 + k * 22, -26, 7, 26, 2, '#c9a06a'); R2(-44, -20, 78, 5, 2, '#b8884a'); R2(-44, -10, 78, 5, 2, '#b8884a'); }
  else if (kind === 'lantern') { g.fillStyle = '#3a3040'; g.fillRect(-2, -80, 4, 80); g.fillRect(-12, -82, 24, 3); R2(-7, -98, 14, 16, 3, '#ffe9a0'); glow(0, -90, 30, th.kind === 'swamp' || th.kind === 'crystal' ? '#9feaff' : '#ffd27a'); }
  else if (kind === 'log') { R2(-34, -14, 68, 14, 7, '#8a5a35'); ART.E(g, 34, -7, 6, 7); g.fillStyle = '#d9a066'; g.fill(); g.stroke(); ART.E(g, 34, -7, 3, 3.6); g.strokeStyle = '#8a5a35'; g.stroke(); ART.E(g, -10, -16, 6, 3); g.fillStyle = '#6fc35a'; g.fill(); }
  else if (kind === 'tent') { g.beginPath(); g.moveTo(-36, 0); g.lineTo(0, -46); g.lineTo(36, 0); g.closePath(); g.fillStyle = ART.lgr(g, '#fff0d0', '#d9a066', -36, 0, 36, 0); g.fill(); g.strokeStyle = O; g.lineWidth = 1.4; g.stroke(); g.beginPath(); g.moveTo(-6, 0); g.lineTo(0, -30); g.lineTo(6, 0); g.fillStyle = '#5a3412'; g.fill(); for (let k = 0; k < 3; k++) { g.fillStyle = '#e53935'; g.fillRect(-30 + k * 22, -8 + 0, 6, 3); } }
  else if (kind === 'pillar') { R2(-12, -96, 24, 96, 3, th.kind === 'volcano' ? '#5a3a40' : th.kind === 'aurora' || th.kind === 'castle' ? '#e8eef4' : '#d9c6a0'); R2(-16, -100, 32, 8, 2, th.kind === 'aurora' ? '#ffffff' : '#c9b080'); R2(-16, -8, 32, 8, 2, th.kind === 'aurora' ? '#ffffff' : '#c9b080'); g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 1; for (let k = -6; k <= 6; k += 6) { g.beginPath(); g.moveTo(k, -92); g.lineTo(k, -8); g.stroke(); } g.beginPath(); g.moveTo(-12, -60); g.lineTo(-4, -52); g.lineTo(-10, -40); g.strokeStyle = 'rgba(40,20,10,.5)'; g.stroke(); if (th.kind === 'castle' || th.kind === 'aurora') ART.star(g, 0, -108, 6, '#ffe27a'); }
  else if (kind === 'igloo') { g.beginPath(); g.ellipse(0, 0, 40, 34, 0, Math.PI, 0); g.fillStyle = ART.lgr(g, '#ffffff', '#cfe0f2', 0, -34, 0, 0); g.fill(); g.strokeStyle = '#6a8aaa'; g.lineWidth = 1.4; g.stroke(); for (let k = 1; k < 3; k++) { g.beginPath(); g.ellipse(0, 0, 40, 34 - k * 11, 0, Math.PI, 0); g.stroke(); } R2(-10, -18, 20, 18, 9, '#2a3a5a'); }
  else if (kind === 'snowman') { [[0, -12, 14], [0, -34, 10], [0, -50, 7]].forEach(([a, b, r]) => { ART.E(g, a, b, r, r); g.fillStyle = '#ffffff'; g.fill(); g.strokeStyle = '#8aa8c8'; g.lineWidth = 1.2; g.stroke(); }); g.beginPath(); g.moveTo(5, -50); g.lineTo(14, -48); g.lineTo(5, -46); g.fillStyle = '#ff8a3d'; g.fill(); R2(-8, -64, 16, 8, 2, '#2a2a33'); g.fillStyle = '#e53935'; g.fillRect(-9, -42, 18, 4); }
  else if (kind === 'brazier') { R2(-10, -30, 20, 30, 3, '#4a3530'); R2(-16, -36, 32, 8, 3, '#6a4a40'); g.save(); g.globalCompositeOperation = 'lighter'; for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(-10 + k * 7, -36); g.quadraticCurveTo(-8 + k * 7, -56, 0 + k * 3, -64); g.quadraticCurveTo(4 + k * 5, -50, 4 + k * 6, -36); g.fillStyle = ['#ff8a3d', '#ffd27a', '#ff5a2a'][k]; g.fill(); } g.restore(); glow(0, -48, 34, '#ff9a3d'); }
  else if (kind === 'boat') { g.beginPath(); g.moveTo(-40, -14); g.lineTo(40, -14); g.lineTo(28, 0); g.lineTo(-30, 0); g.closePath(); g.fillStyle = '#8a5a35'; g.fill(); g.strokeStyle = O; g.lineWidth = 1.4; g.stroke(); g.fillStyle = '#6b4426'; g.fillRect(-2, -70, 3, 56); g.beginPath(); g.moveTo(2, -68); g.quadraticCurveTo(26, -44, 2, -18); g.closePath(); g.fillStyle = '#fffaf0'; g.fill(); g.stroke(); ART.paw(g, 9, -42, 0.6, '#ff7a45'); }
  else if (kind === 'balloon') { ART.E(g, 0, -70, 26, 30); g.fillStyle = ART.lgr(g, '#ff9ab0', '#e5533d', -26, 0, 26, 0); g.fill(); g.strokeStyle = O; g.lineWidth = 1.4; g.stroke(); for (let k = -1; k <= 1; k++) { g.beginPath(); g.ellipse(k * 9, -70, 6, 30, 0, 0, TAU); g.strokeStyle = 'rgba(255,255,255,.4)'; g.stroke(); } g.strokeStyle = O; g.lineWidth = 1; g.beginPath(); g.moveTo(-14, -46); g.lineTo(-8, -22); g.moveTo(14, -46); g.lineTo(8, -22); g.stroke(); R2(-10, -22, 20, 14, 3, '#c9a06a'); }
  else if (kind === 'shrine') { R2(-26, -40, 52, 40, 3, th.kind === 'aurora' ? '#f0f4f8' : '#4a3a5a'); roof(-26, -40, 52, th.kind === 'aurora' ? '#8fd3ff' : '#2a1f35'); glow(0, -20, 20, th.kind === 'aurora' ? '#9feaff' : '#c56bff'); R2(-6, -22, 12, 22, 6, '#1a1020'); }
  else if (kind === 'cart') { R2(-26, -24, 52, 18, 3, '#7a5a3a'); [[-16, -4], [16, -4]].forEach(([a, b]) => { ART.E(g, a, b, 7, 7); g.fillStyle = '#4a3a2a'; g.fill(); g.strokeStyle = O; g.stroke(); }); [-14, 0, 12].forEach((a, k) => { g.beginPath(); g.moveTo(a - 5, -24); g.lineTo(a, -38 - k * 3); g.lineTo(a + 5, -24); g.fillStyle = ['#6fd8ff', '#b48cff', '#7affd0'][k]; g.fill(); }); }
  else if (kind === 'lollipop') { R2(-2.5, -86, 5, 86, 2, '#fff6ee'); E(g, 0, -96, 22, 22); g.fillStyle = '#ff8ec0'; g.fill(); g.strokeStyle = O; g.lineWidth = 1.5; g.stroke(); g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 5; g.beginPath(); for (let a = 0; a < 10; a += 0.25) { const r = a * 2; g.lineTo(Math.cos(a) * r, -96 + Math.sin(a) * r); } g.stroke(); g.fillStyle = '#ffd34d'; g.beginPath(); g.moveTo(-3, -74); g.lineTo(-14, -66); g.lineTo(-10, -78); g.closePath(); g.fill(); }
  else if (kind === 'fishflag') { R2(-2, -100, 4, 100, 2, '#c8604a'); g.fillStyle = '#3a8ad0'; g.beginPath(); g.moveTo(2, -96); g.quadraticCurveTo(30, -100, 38, -84); g.lineTo(28, -78); g.lineTo(38, -70); g.quadraticCurveTo(20, -66, 2, -72); g.closePath(); g.fill(); E(g, 28, -86, 2.4, 2.4); g.fillStyle = '#fff'; g.fill(); }
  else if (kind === 'bigfeather') { g.save(); g.rotate(-0.15); g.fillStyle = '#ffb06a'; g.beginPath(); g.ellipse(0, -50, 12, 50, 0, 0, TAU); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -98); g.stroke(); g.restore(); }
  else if (kind === 'mushlamp') { R2(-3, -40, 6, 40, 2, '#e8d8b8'); E(g, 0, -42, 22, 12); g.fillStyle = '#ff8a4a'; g.fill(); [[-8, -46], [6, -48], [12, -40]].forEach(([x, y]) => { E(g, x, y, 2.6, 2); g.fillStyle = '#fff3d8'; g.fill(); }); glow(0, -36, 34, '#ffc860'); }
  else if (kind === 'starflower') { g.strokeStyle = '#3a7a5a'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-6, -30, 0, -60); g.stroke(); for (let q = 0; q < 6; q++) { const an = q / 6 * TAU; E(g, Math.cos(an) * 10, -62 + Math.sin(an) * 10, 9, 5.5, an); g.fillStyle = q % 2 ? '#ffb3e6' : '#c8b0ff'; g.fill(); } ART.star(g, 0, -62, 7, '#fff6c8'); glow(0, -62, 34, '#ffd6ff'); }
  else if (kind === 'banner') { R2(-2, -110, 4, 110, 2, '#c8b898'); E(g, 0, -112, 5, 5); g.fillStyle = '#ffd34d'; g.fill(); g.beginPath(); g.moveTo(2, -104); g.lineTo(34, -100); g.lineTo(30, -84); g.lineTo(34, -68); g.lineTo(2, -72); g.closePath(); g.fillStyle = '#3a5ac8'; g.fill(); ART.bone(g, 17, -86, 14, '#ffd34d', 0); }
  else if (kind === 'coral') { g.lineCap = 'round'; [['#ff7a8a', 0], ['#ffb06a', 1], ['#c88aff', 2]].forEach(([c, k]) => { g.strokeStyle = c; g.lineWidth = 6 - k; g.beginPath(); g.moveTo(-14 + k * 14, 0); g.quadraticCurveTo(-16 + k * 14, -30, -24 + k * 18, -50 - k * 6); g.moveTo(-14 + k * 14, -24); g.quadraticCurveTo(-4 + k * 14, -36, -2 + k * 14, -46); g.stroke(); }); glow(0, -30, 30, '#9ff0ff'); }
  else if (kind === 'clockpost') { R2(-3, -96, 6, 96, 2, '#3a3040'); E(g, 0, -104, 18, 18); g.fillStyle = ART.lgr(g, '#ffd34d', '#b8862e', 0, -122, 0, -86); g.fill(); g.strokeStyle = O; g.lineWidth = 1.5; g.stroke(); E(g, 0, -104, 14, 14); g.fillStyle = '#fffaf0'; g.fill(); g.strokeStyle = '#3a2a20'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -104); g.lineTo(6, -110); g.moveTo(0, -104); g.lineTo(0, -114); g.stroke(); for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; g.fillStyle = '#5a4a3a'; g.fillRect(Math.cos(a) * 11 - 0.8, -104 + Math.sin(a) * 11 - 0.8, 1.6, 1.6); } glow(0, -104, 30, '#fff3c0'); }
  else if (kind === 'gears') { ART.gearShape(g, -14, -22, 18, 10, '#b8862e', 0.3); ART.gearShape(g, 16, -14, 12, 8, '#8a6a4a', 0.1); ART.gearShape(g, 2, -44, 10, 8, '#d9a830', 0.6); E(g, -14, -22, 4, 4); g.fillStyle = '#5a3a22'; g.fill(); }
  else if (kind === 'hourglass') { R2(-20, -10, 40, 8, 3, '#d9a830'); R2(-20, -80, 40, 8, 3, '#d9a830'); g.beginPath(); g.moveTo(-15, -72); g.lineTo(15, -72); g.lineTo(2, -42); g.lineTo(15, -10); g.lineTo(-15, -10); g.lineTo(-2, -42); g.closePath(); g.fillStyle = 'rgba(220,240,255,.55)'; g.fill(); g.strokeStyle = O; g.lineWidth = 1.2; g.stroke(); g.beginPath(); g.moveTo(-10, -12); g.lineTo(10, -12); g.lineTo(0, -26); g.closePath(); g.fillStyle = '#ffd27a'; g.fill(); g.beginPath(); g.moveTo(-8, -66); g.lineTo(8, -66); g.lineTo(1, -48); g.lineTo(-1, -48); g.closePath(); g.fill(); g.fillRect(-0.6, -44, 1.2, 18); glow(0, -42, 30, '#ffe9a0'); }
  else if (kind === 'beam') { R2(-34, -92, 9, 92, 2, '#8a5a35'); R2(25, -92, 9, 92, 2, '#8a5a35'); R2(-40, -100, 80, 12, 3, '#6e4320'); g.strokeStyle = '#4a2a14'; g.lineWidth = 1; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(-31, -80 + k * 20); g.lineTo(-27, -78 + k * 20); g.stroke(); } g.fillStyle = '#3a3040'; g.fillRect(-1, -88, 2, 18); R2(-6, -72, 12, 14, 3, '#ffe9a0'); glow(0, -64, 34, '#ffc66a'); }
  else if (kind === 'ore') { [[-18, -10, 22, 18, '#6a6070'], [10, -16, 26, 22, '#7a7080'], [-2, -4, 18, 10, '#5a5060']].forEach(([a, b, w, h, c]) => { ART.E(g, a, b, w / 2 + 4, h / 2 + 2); g.fillStyle = ART.lgr(g, ART.LI(c, 0.2), ART.DK(c, 0.2), 0, b - h, 0, b + h); g.fill(); g.strokeStyle = O; g.lineWidth = 1.2; g.stroke(); }); [[-14, -16, '#ffd34d'], [14, -24, '#7affd0'], [20, -12, '#ffd34d'], [-4, -8, '#ff9be8']].forEach(([a, b, c]) => { g.beginPath(); g.moveTo(a - 3, b); g.lineTo(a, b - 6); g.lineTo(a + 3, b); g.lineTo(a, b + 4); g.fillStyle = c; g.fill(); glow(a, b, 10, c); }); }
  else if (kind === 'ribs') { g.strokeStyle = '#4a3a2a'; g.lineCap = 'round'; for (let k = 0; k < 4; k++) { const x = -36 + k * 22, h = 60 + Math.sin(k * 1.3) * 14; g.lineWidth = 9; g.beginPath(); g.moveTo(x, 0); g.quadraticCurveTo(x + 4, -h, x + 22, -h - 8); g.stroke(); g.lineWidth = 6; g.strokeStyle = '#f2e8d2'; g.stroke(); g.strokeStyle = '#4a3a2a'; } R2(-44, -84, 100, 10, 5, '#efe4cc'); }
  else if (kind === 'fern') { g.strokeStyle = '#2f6a3a'; g.lineCap = 'round'; for (let k = -3; k <= 3; k++) { const a = k * 0.28; g.save(); g.rotate(a); g.lineWidth = 2.2; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(6, -40, 0, -74); g.stroke(); g.fillStyle = k % 2 ? '#5fae5a' : '#4a9a4a'; for (let q = 1; q < 9; q++) { const y = -q * 8; ART.E(g, -6, y, 6 - q * 0.4, 2.2); g.fill(); ART.E(g, 6, y, 6 - q * 0.4, 2.2); g.fill(); } g.restore(); } }
  else if (kind === 'egg') { R2(-34, -12, 68, 12, 6, '#8a6a4a'); [[-14, -26], [10, -30], [0, -20]].forEach(([a, b], k) => { ART.E(g, a, b, 11, 15); g.fillStyle = ART.lgr(g, '#fffaf0', ['#d9c8a8', '#c8d8b8', '#e0c8d8'][k], 0, b - 15, 0, b + 15); g.fill(); g.strokeStyle = O; g.lineWidth = 1.2; g.stroke(); g.fillStyle = 'rgba(120,90,60,.35)'; ART.E(g, a - 3, b - 4, 2.6, 2); g.fill(); ART.E(g, a + 4, b + 3, 2, 1.6); g.fill(); }); glow(0, -26, 30, '#fff3c0'); }
  propCache[key] = c; return c;
}
const lmCache = {};
function lmCanvas(kind) { if (lmCache[kind]) return lmCache[kind]; const c = ART.mk(480, 400), g = c.getContext('2d'); g.scale(2, 2); mapLandmark(g, kind, 120, 150); lmCache[kind] = c; return c; }
// v1.8 원경 랜드마크 안개: 네모로 덮지 않고 랜드마크 모양에만 하늘색을 살짝 입힘 (네모 경계 문제 수정)
const lmHazeC = {};
function lmHaze(kind, sky) { const k = kind + sky; if (lmHazeC[k]) return lmHazeC[k]; const src = lmCanvas(kind), c = ART.mk(src.width, src.height), g = c.getContext('2d'); g.drawImage(src, 0, 0); g.globalCompositeOperation = 'source-atop'; g.globalAlpha = 0.28; g.fillStyle = sky; g.fillRect(0, 0, c.width, c.height); return (lmHazeC[k] = c); }
function drawScenery() {
  const th = B.si.th, n = B.n, set = PROPSET[th.kind] || ['lantern'];
  const sky = th.sky[2];
  // 원경 랜드마크 (패럴랙스 0.35)
  const lx0 = 500 + (n * 397) % 900, px = lx0 - B.camX * 0.35;
  if (px > -300 && px < W + 300) { ctx.save(); ctx.globalAlpha = 0.9; ctx.drawImage(lmHaze(th.kind, sky), px - 150, GY - 252, 300, 250); ctx.restore(); }
  // 중경 소품 (패럴랙스 0.7)
  let seed = n * 7919; const R = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const cnt = 6 + Math.floor(R() * 3);
  for (let k = 0; k < cnt; k++) {
    const wx = 260 + k * (B.world * 0.7 / cnt) + R() * 120, x = wx - B.camX * 0.7, kind = set[Math.floor(R() * set.length)], sc = 0.7 + R() * 0.35;
    if (x < -120 || x > W + 120) continue;
    const c = propCanvas(kind, th); ctx.save(); ctx.globalAlpha = 0.95; ctx.drawImage(c, x - 80 * sc, GY - 4 - 150 * sc, 160 * sc, 160 * sc); ctx.globalAlpha = 0.18; ctx.restore();
  }
  // 안개 (원근감)
  const hz = ctx.createLinearGradient(0, GY - 120, 0, GY + 10); hz.addColorStop(0, ART.rgba(sky, 0)); hz.addColorStop(1, ART.rgba(sky, B.si.night ? 0.12 : 0.22)); ctx.fillStyle = hz; ctx.fillRect(-OX, GY - 120, VW, 130);
}
function drawRays(kind) {
  const night = kind === 'swamp' || kind === 'castle' || kind === 'volcano' || kind === 'crystal' || kind === 'mine' || kind === 'fossil' || kind === 'tower' || kind === 'upside' || kind === 'stargarden' || kind === 'burrow' || kind === 'namesea' || kind === 'shadowvil' || kind === 'echocave' || kind === 'starmarket' || kind === 'clockforest' || kind === 'stormcrown' || kind === 'whalecave' || kind === 'lastgate' || kind === 'toyland';
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const col = kind === 'crystal' ? '120,220,255' : kind === 'volcano' || kind === 'mine' ? '255,170,80' : kind === 'fossil' ? '200,255,170' : night ? '190,170,255' : '255,245,200';
  for (let k = 0; k < 5; k++) {
    const x = 520 + k * 120 - (B.camX * 0.05) % 120, a = (0.022 + 0.012 * Math.sin(G.time * 0.6 + k * 1.7)) * (night ? 0.8 : 1); /* v3.9 전투 빛줄기 절반 이하 (화면이 뿌옇게 보였음) */
    const g = ctx.createLinearGradient(x, 0, x - 260, GY); g.addColorStop(0, `rgba(${col},${a * 2})`); g.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - 20, -10); ctx.lineTo(x + 30 + k * 6, -10); ctx.lineTo(x - 230, GY + 10); ctx.lineTo(x - 330 - k * 8, GY + 10); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
function drawAmb(back) {
  for (let i = 0; i < B.amb.length; i++) {
    if ((i % 3 === 0) === back) continue;
    const a = B.amb[i];
    if (a.k === 'petal') { ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.ph * 2); ctx.fillStyle = i % 2 ? 'rgba(255,170,200,.85)' : 'rgba(255,255,255,.85)'; ART.E(ctx, 0, 0, a.r * 1.4, a.r * 0.8); ctx.fill(); ctx.restore(); }
    else if (a.k === 'leaf') { ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(Math.sin(a.ph * 2) * 1.2); ctx.fillStyle = i % 2 ? '#d8913a' : '#8bbf4a'; ART.E(ctx, 0, 0, a.r * 1.8, a.r); ctx.fill(); ctx.restore(); }
    else if (a.k === 'snow') { ctx.globalAlpha = 0.5; ctx.drawImage(ART.softDot('#ffffff'), a.x - a.r * 1.5, a.y - a.r * 1.5, a.r * 3, a.r * 3); /* v3.8 눈송이 빛 줄임 (캐릭터 앞 하얀 번짐) */ ctx.globalAlpha = 1; }
    else if (a.k === 'sand') { ctx.fillStyle = 'rgba(255,236,190,.5)'; ctx.fillRect(a.x, a.y, a.r * 4, 1.4); }
    else if (a.k === 'bubble') { ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(a.x, a.y, a.r * 1.4, 0, TAU); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.8)'; circ(a.x - a.r * 0.5, a.y - a.r * 0.5, a.r * 0.35); }
    else if (a.k === 'feather') { ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(Math.sin(a.ph * 1.6) * 0.9); ctx.fillStyle = 'rgba(255,255,255,.92)'; ART.E(ctx, 0, 0, a.r * 2.6, a.r * 0.9); ctx.fill(); ctx.strokeStyle = 'rgba(180,190,230,.8)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-a.r * 2.6, 0); ctx.lineTo(a.r * 2.6, 0); ctx.stroke(); ctx.restore(); }
    else if (a.k === 'wisp') { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.28 + Math.sin(a.ph * 3) * 0.18; ctx.drawImage(ART.softDot(i % 2 ? '#c56bff' : '#7affd0'), a.x - a.r * 2.5, a.y - a.r * 2.5, a.r * 5, a.r * 5); ctx.restore(); }
    else if (a.k === 'sparkle') { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.3 + Math.sin(a.ph * 5) * 0.22; const c = ['#7ae8ff', '#c9a0ff', '#8affd6'][i % 3]; ctx.drawImage(ART.softDot(c), a.x - a.r * 3, a.y - a.r * 3, a.r * 6, a.r * 6); ART.star(ctx, a.x, a.y, a.r * 1.1, '#ffffff', 0.3); ctx.restore(); }
    else if (a.k === 'star') { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.55 + Math.sin(a.ph * 4) * 0.35; ART.star(ctx, a.x, a.y, a.r * 1.5, i % 2 ? '#ffe27a' : '#bfe6ff', 0.4); ctx.restore(); }
    else if (a.k === 'cog') { ctx.save(); ctx.globalAlpha = 0.45; ART.gearShape(ctx, a.x, a.y, a.r * 1.4, 8, i % 2 ? '#b8862e' : '#8a6a4a', a.ph * 2); ctx.restore(); }
    else if (a.k === 'sand') { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 + Math.sin(a.ph * 5) * 0.3; ctx.drawImage(ART.softDot(i % 2 ? '#ffe9a0' : '#d9b0ff'), a.x - a.r * 2, a.y - a.r * 2, a.r * 4, a.r * 4); ctx.restore(); }
    else if (a.k === 'dust') { ctx.globalAlpha = 0.45 + Math.sin(a.ph * 3) * 0.2; ctx.fillStyle = i % 2 ? '#d8c09a' : '#a88a64'; circ(a.x, a.y, a.r * 0.7); if (i % 7 === 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(ART.softDot('#ffd27a'), a.x - 6, a.y - 6, 12, 12); ctx.restore(); } ctx.globalAlpha = 1; }
    else if (a.k === 'spore') { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.45 + Math.sin(a.ph * 4) * 0.3; ctx.drawImage(ART.softDot(i % 3 ? '#c8ff9a' : '#ffe9a0'), a.x - a.r * 2.4, a.y - a.r * 2.4, a.r * 4.8, a.r * 4.8); ctx.restore(); }
    else { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.6 + Math.sin(a.ph * 6) * 0.3; ctx.drawImage(ART.softDot('#ff8a3d'), a.x - a.r * 2, a.y - a.r * 2, a.r * 4, a.r * 4); ctx.restore(); }
  }
}
function drawSkillCut(c) {
  if (c.s) { const T = 1.1 - c.t, a = Math.min(1, T * 6, c.t * 4), e = 1 - Math.pow(1 - Math.min(1, T * 5), 3); ctx.save(); ctx.globalAlpha = a; ctx.translate(0, 120); ctx.transform(1, -0.06, 0, 1, 0, 0);
    const bw = (W + OX * 2) * e, g = ctx.createLinearGradient(-OX, 0, -OX + bw, 0); g.addColorStop(0, ART.rgba(c.col, 0.95)); g.addColorStop(1, ART.rgba(c.col, 0)); ctx.fillStyle = g; ctx.fillRect(-OX, -8, bw, 70); ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect(-OX, -10, bw, 2); ctx.fillRect(-OX, 62, bw, 2);
    bigText('합동기 · ' + c.s + '!', W / 2 + (1 - e) * 120, 28, 32, '#ffffff', ART.LI(c.col, 0.3)); ctx.restore(); return; }
  const sk = SKILLS[c.i], T = 0.9 - c.t, a = Math.min(1, T * 6, c.t * 4), e = 1 - Math.pow(1 - Math.min(1, T * 5), 3);
  ctx.save(); ctx.globalAlpha = a;
  ctx.translate(0, 120); ctx.transform(1, -0.06, 0, 1, 0, 0);
  const bw = W * e; const g = ctx.createLinearGradient(0, 0, bw, 0); g.addColorStop(0, ART.rgba(sk.col, 0.95)); g.addColorStop(1, ART.rgba(sk.col, 0)); ctx.fillStyle = g; ctx.fillRect(0, -8, bw, 70);
  ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect(0, -10, bw, 2); ctx.fillRect(0, 62, bw, 2);
  ctx.save(); ctx.beginPath(); ctx.rect(0, -8, 240, 70); ctx.clip(); if (c.i === 3) ART.draw(ctx, 'mir' + (dragonStage() === 1 ? '' : dragonStage()), 'a2', 110 - (1 - e) * 120, 112, 1.25, false, 0); else ART.draw(ctx, heroFace(), 'a2', 90 - (1 - e) * 120, 150, 2.1, false, 0); ctx.restore();
  ctx.globalAlpha = a; bigText(sk.name + '!', 360 + (1 - e) * 120, 28, 34, '#ffffff', ART.LI(sk.col, 0.3));
  ctx.restore();
}
function drawBanner() {
  const t = 3.0 - B.banner, a = t < 0.3 ? t / 0.3 : B.banner < 0.4 ? B.banner / 0.4 : 1, x = W / 2 + (t < 0.3 ? (1 - t / 0.3) * -200 : 0);
  ctx.save(); ctx.globalAlpha = a;
  const gb = ctx.createLinearGradient(0, 140, 0, 290); gb.addColorStop(0, 'rgba(30,12,0,0)'); gb.addColorStop(0.2, 'rgba(30,12,0,.6)'); gb.addColorStop(0.8, 'rgba(30,12,0,.6)'); gb.addColorStop(1, 'rgba(30,12,0,0)'); ctx.fillStyle = gb; ctx.fillRect(-OX, 140, VW, 150);
  ctx.fillStyle = 'rgba(255,207,90,.8)'; ctx.fillRect(x - 220, 160, 440, 2); ctx.fillRect(x - 220, 270, 440, 2);
  txt(`${CH_NAMES[B.si.ch]}  ·  ${B.si.sub}/${CHL}`, x, 176, 14, '#ffd98a', 'center');
  bigText(B.pvp ? `「${B.si.name}」` : `STAGE ${B.n}  「${B.si.name}」`, x, 210, 38, '#fff6b0', '#ffb300');
  txt('임무: ' + B.si.mis.n + '  —  ' + B.si.mis.d, x, 252, 15, '#ffffff', 'center');
  ctx.restore();
}
const BOSS_TIP = {
  kkuruk: '작은 슬라임으로 갈라져요. 작은 슬라임부터 정리하면 편해요.', troll: '앞쪽 땅을 크게 내려찍어요. 경고가 보이면 뒤로 물러나세요.',
  scorp: '독침이 앞쪽으로 길게 와요. 뭉치(방패)를 앞에 세우면 든든해요.', frost: '얼음 감옥에 갇히면 잠깐 못 움직여요. 경고 원 밖으로!',
  nox: '그림자 돌진으로 줄을 뚫고 들어와요. 성 앞에 동료를 모아 두세요.', kraken: '촉수로 기사를 끌어당겨요. 끌려가면 바로 뒤로 걸어 나오세요.',
  owl: '번개가 세 곳에 차례로 떨어져요. 노란 경고를 보고 옆으로!', cgolem: '반사막이 켜진 동안 때리면 빛이 튕겨 나와요. 막이 사라질 때까지 잠깐 쉬어요.',
  sbori: '거울 강타가 앞쪽을 크게 쳐요. 경고 범위 밖에서 기다렸다가 반격!', void: '침묵의 장막에 맞으면 4초 동안 스킬을 못 써요. 마나를 미리 써 두세요.',
  whale: '물기둥 네 개가 앞에서부터 차례로 솟아요. 리듬을 보고 지나가세요.', fenrir: '별(마나)을 삼키고 넓게 공격해요. 마나는 아끼지 말고 바로 쓰세요.',
  mole: '땅속으로 숨었다가 경고 자리에서 튀어나와요. 갈색 원을 피하세요.', bonedra: '뼈의 숨결이 앞쪽으로 길게 뿜어져요. 경고가 보이면 뒤로.',
  cogowl: '톱니가 굴러와요. 굴러오는 길에서 비켜서세요.', tcat: '시간 먹기: 3초 동안 동료가 느려지고 스킬 대기시간이 늘어요.',
  jelly: '졸음 거품에 닿으면 꾸벅꾸벅 졸아요. 거품을 먼저 터뜨리세요.', dmir: '악몽 불꽃이 앞쪽을 태워요. 미르의 불꽃으로 맞불을!',
  spiderq: '별실 그물에 걸리면 3초 동안 못 움직여요(공격은 가능).', shadowk: '거울 기술로 우리 기술을 따라 해요. 같은 자리에 오래 있지 마세요.',
  catgen: '경고 원 세 개가 보리를 따라와요. 계속 움직이면 피할 수 있어요.', roc: '바람에 모두 뒤로 밀린 다음 깃털 비가 내려요. 밀린 뒤 노란 원을 피하세요.',
  badger: '땅울림이 왼쪽부터 한 줄씩 와요. 이미 울린 줄로 옮겨 가세요.', seaspirit: '긴 파도가 넓게 밀려와요. 파도 뒤에 나오는 게도 조심!',
  rainturtle: '일곱 줄 중 짝수 줄이 먼저, 홀수 줄이 나중에 떨어져요. 먼저 떨어진 줄로 옮기세요.', shadowchild: '숨었다가 보리 곁에 나타나요. 「어디 있게~?」가 뜨면 그 자리를 벗어나세요.',
  mtgiant: '눈덩이가 앞에서부터 굴러오고, 끝나면 2초 동안 「쉿」(스킬 봉인).', echofairy: '보리가 서 있던 자리에 두 번 울려요. 피한 뒤 제자리로 돌아가지 마세요.',
  drumgiant: '북이 세 번 「쿵!」 울릴 때마다 동그란 북소리 물결이 퍼져요. 주황 표시 안에 있으면 뒤로 밀리고 다쳐요 — 물결 사이로 들어가세요.', toyking: '「끼릭」 소리 세 번에 양철 병정 셋이 줄지어 나와요. 병정을 먼저 잡고, 하늘에서 떨어지는 노란 멈춤 불꽃 표시는 피하세요(맞으면 잠깐 멈춤).',
  bellknight: '방울이 세 번 울리면 노란 원 안이 「띵!」 하고 어지러워져요. 세 번째 종소리는 성 쪽까지 퍼지니, 노란 표시를 보고 비켜서세요.', badukshadow: '그림자 방패가 생기면 앞에서 때리는 공격이 막혀요 — 뒤쪽 원거리·마법으로 깨세요. 방패가 깨지면 보라 표시 두 곳으로 그림자 칼이 내려와요.',
  icepenguin: '얼음 원 두 곳이 생겨요. 원 안에 있으면 얼어서 잠깐 못 움직여요. 마지막에 닻이 앞줄을 내리쳐요 — 파란 표시를 피하세요.', songwhale: '자장가가 퍼지면 모두 천천히 졸려요(공격·이동 느려짐). 보라 음표 표시 세 곳에 큰 물결이 덮쳐요 — 그 사이로 들어가세요.',
  thunderbird: '노란 번개 표시 세 곳에 차례로 번개가 쳐요. 마지막엔 날갯바람에 모두 조금 밀려나요.', windelder: '큰 바람에 모두 뒤로 밀린 뒤, 회오리 원 두 개가 생겨요. 원 안에 있으면 계속 다쳐요 — 빨리 빠져나오세요.',
  mossbear: '보리 둘레에 큰 초록 원이 생겨요. 원이 닫히기 전에 밖으로! 안에 있으면 잠깐 잠들어요.', dawndeer: '파란 시계 원 세 개가 차례로 닫혀요. 안에 있으면 2초 동안 멈춰요. 끝나면 뿔 종소리가 앞쪽을 울려요.',
  camelbot: '긴 줄 경고 뒤에 앞으로 돌진해요. 줄 밖으로 비켜서면 지나가요.', starfox: '별 주머니가 세 번 떨어지고, 「떨이!」로 마나·뼈다귀를 조금 가져가요.',
};
const BOSS_TAG = { drumgiant: '박자가 틀릴까 겁나는 북 거인', toyking: '한 번도 초대받지 못한 왕', bellknight: '기억의 문지기', badukshadow: '백 년 전 기사의 후회', icepenguin: '항구를 얼린 선장', songwhale: '노래를 멈춘 고래', thunderbird: '둥지의 하늘을 막는 문지기', windelder: '미르의 할아버지', mossbear: '자장가를 부르는 숲지기', dawndeer: '시계를 멈춘 숲의 주인', camelbot: '반창고 붙인 짐꾼 로봇', starfox: '별을 사들이는 상인', mtgiant: '입을 꿰맨 산의 거인', echofairy: '남의 말만 따라 하는 요정', rainturtle: '일곱 빛의 문지기', shadowchild: '처음 무지개를 본 아이', catgen: '야옹 공화국의 장군', roc: '깃털 군도의 바람', badger: '땅속 북소리', seaspirit: '이름을 잃은 바다', spiderq: '별실의 여왕', shadowk: '거울 속의 기사', jelly: '영원한 꿈의 여왕', dmir: '미르의 두려움', cogowl: '시간을 감는 박사', tcat: '시간을 먹는 자', mole: '땅속을 가르는 왕', bonedra: '뼈의 심장을 지키는 자', whale: '별빛을 삼킨 고래', fenrir: '별을 먹는 자', cgolem: '빛을 가두는 왕', sbori: '또 하나의 보리', kkuruk: '들판의 폭군', troll: '숲을 삼킨 거인', scorp: '모래 폭풍의 왕', frost: '얼어붙은 심장', nox: '달을 가린 그림자', kraken: '심해의 여왕', owl: '폭풍 해적 선장', void: '모든 소리를 삼킨 자' };
function drawBossCut(c) {
  const T = (c.T || 2.8) - c.t, inA = Math.min(1, T / 0.35), out = c.t < 0.4 ? c.t / 0.4 : 1, a = inA * out, e = 1 - Math.pow(1 - inA, 3);
  ctx.save(); ctx.globalAlpha = a * 0.55; ctx.fillStyle = '#12000a'; ctx.fillRect(-OX, 0, VW, H); ctx.restore();
  ctx.save(); ctx.globalAlpha = a;
  ctx.translate(W / 2, 250); ctx.rotate(-0.08);
  const bw = W * 1.4 * e; ctx.fillStyle = ART.lgr(ctx, '#3a0a1e', '#120008', 0, -70, 0, 70); ctx.fillRect(-bw / 2, -72, bw, 144);
  for (const sy of [-78, 72]) { ctx.save(); ctx.beginPath(); ctx.rect(-W, sy, W * 2, 8); ctx.clip(); ctx.fillStyle = '#ffcc00'; ctx.fillRect(-W, sy, W * 2, 8); ctx.fillStyle = '#1a0a00'; const off = (G.time * 80) % 28; for (let x = -W - 28; x < W; x += 28) { ctx.beginPath(); ctx.moveTo(x + off, sy + 8); ctx.lineTo(x + off + 10, sy); ctx.lineTo(x + off + 18, sy); ctx.lineTo(x + off + 8, sy + 8); ctx.fill(); } ctx.restore(); }
  ctx.save(); ctx.beginPath(); ctx.rect(-W, -72, W * 2, 144); ctx.clip();
  ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(ART.softDot('#ff3060'), -420, -150, 300, 300); ctx.globalCompositeOperation = 'source-over';
  const bx = -230 + (1 - e) * -300, bh = ENEMIES[c.k].h || 150, bs = c.elite ? Math.min(3.2, 150 / bh) : 1.9; ART.draw(ctx, c.k, 'i' + (Math.floor(T * 3) % 3), bx, 72 + bh * 0.9 * (c.elite ? bs / 1.9 : 1), bs * (ENEMIES[c.k].s || 1), true, 0);
  ctx.restore();
  ctx.font = `900 18px ${FONT}`; ctx.textAlign = 'left'; ctx.fillStyle = '#ff8a9a'; ctx.fillText('⚠ WARNING · 보스 출현', -60 + (1 - e) * 200, -38);
  bigText((c.elite ? '정예 ' : '') + ENEMIES[c.k].name, 120 + (1 - e) * 260, 6, 38, '#ffffff', c.elite ? '#ffb300' : '#ff5a7a');
  ctx.font = `bold 17px ${FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = '#ffd6de'; ctx.fillText('「' + (c.elite ? '중간 보스 · 쓰러뜨리면 보물상자!' : (BOSS_TAG[c.k] || '')) + '」', 120 + (1 - e) * 320, 48);
  ctx.restore();
}
function drawHUD() {
  if (B.lanes && !B.over) { // v2.7 소환할 길 고르기
    [[0, '▲ 위 길'], [1, '▼ 아래 길']].forEach(([q, n], i) => { const on = B.selLane === q; btn(12 + i * 100, 96, 94, 32, n, () => { B.selLane = q; SFX.click(); }, { bg: on ? '#ff9a3a' : '#8a7a9a', size: 15, key: 'lane' + q }); });
    const cu = B.enemies.filter(e => !e.dead && e.lane === 0).length, cd = B.enemies.filter(e => !e.dead && e.lane === 1).length; txt(`적: 위 ${cu} · 아래 ${cd}`, 214, 112, 13, '#fff3d6', 'left');
    if (B.t < 6) bigText('두 갈래 길! 카드를 누르기 전에 길을 고르세요', W / 2, 150, 20, '#fff6d0', '#ff9a3a'); }
  if (B.tower != null) { const f = B.tower, x = W / 2, y = 104, ng = Math.ceil(f / 10) * 10; ctx.save(); RR(x - 92, y - 15, 184, 32, 16); ctx.fillStyle = ART.lgr(ctx, '#4a2a8a', '#22124a', 0, y - 15, 0, y + 17); ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = pkGoldG(y - 15, y + 17); ctx.stroke(); pkGem(x - 76, y + 1, 5, '#b07cff'); pkGem(x + 76, y + 1, 5, '#b07cff'); txt(f % 10 === 0 ? `무한의 탑 ${f}층 · 수호자!` : `무한의 탑 ${f}층 · 수호자까지 ${ng - f}층`, x, y + 1.5, 13, '#fff3c4', 'center', false); ctx.restore(); }
  if (B.surgeBanner > 0) { const k = Math.min(1, B.surgeBanner * 2, (2.4 - B.surgeBanner) * 5); ctx.save(); ctx.globalAlpha = k; const y = 132; const g2 = ctx.createLinearGradient(-OX, 0, W + OX, 0); g2.addColorStop(0, 'rgba(120,20,20,0)'); g2.addColorStop(0.5, 'rgba(150,30,30,.78)'); g2.addColorStop(1, 'rgba(120,20,20,0)'); ctx.fillStyle = g2; ctx.fillRect(-OX, y - 22, VW, 44); bigText(B.lanes && B.surgeLane != null ? `⚠ 몬스터 떼가 ${B.surgeLane ? '아래' : '위'} 길로 몰려와요!` : '⚠ 몬스터 떼가 몰려와요! 앞줄을 지켜요!', W / 2, y, 22, '#fff1d6', '#c0392b'); ctx.restore(); }
  const h = B.hero, hs = B.hs;
  // 하단 독
  ART.panel(ctx, -20 - OX, H - 140, VW + 40, 170, 'wood');
  // 기사 정보
  edgeOn(-1);
  ART.panel(ctx, 8, 8, 300, 80, 'dark');
  ctx.save(); ctx.beginPath(); ctx.arc(46, 48, 30, 0, TAU); ctx.fillStyle = ART.lgr(ctx, '#fff8e6', '#ffd98a', 0, 18, 0, 78); ctx.fill(); ctx.clip();
  ART.drawFit(ctx, heroFace(), h.dead ? 'ib' : 'i0', 46, 50, 58, 58, { face: 0.62, pad: 1.0 }); ctx.restore();
  ctx.lineWidth = 3.5; ctx.strokeStyle = '#ffcf5a'; ctx.beginPath(); ctx.arc(46, 48, 30, 0, TAU); ctx.stroke();
  RR(22, 70, 48, 17, 8); ctx.fillStyle = ART.lgr(ctx, '#ffe58a', '#e09a1e', 0, 70, 0, 87); ctx.fill(); ctx.strokeStyle = '#4a2a14'; ctx.lineWidth = 1.5; ctx.stroke();
  txt('Lv.' + S.lv, 46, 79, 12, '#4a2a14', 'center', false);
  txt('멍멍기사 ' + heroName(), 86, 22, 15, '#ffe082');
  ART.icon(ctx, 'heart', 92, 41, 15); bar(102, 34, 196, 15, h.hp / h.max, '#5fd16a');
  txt(h.dead ? `부활까지 ${Math.ceil(h.resp)}초` : `${Math.ceil(h.hp)} / ${h.max}`, 200, 42, 11, '#fff', 'center');
  ART.icon(ctx, 'mana', 92, 59, 15); bar(102, 53, 196, 13, B.mana / hs.mpMax, '#3d9bff');
  txt(`${Math.floor(B.mana)}`, 200, 60, 10, '#fff', 'center');
  bar(86, 71, 212, 8, S.xp / xpNeed(S.lv), '#ffca28');
  edgeOff();
  // 진행도
  const mx = 340, mw = 280;
  ART.panel(ctx, mx - 10, 8, mw + 20, 64, 'dark');
  txt(B.pvp ? B.si.name : `STAGE ${B.n} · ${B.si.name}`, W / 2, 22, 14, '#fff3c4', 'center');
  const toM = x => mx + 18 + (x / B.world) * (mw - 36), my = 36;
  RR(mx + 14, my, mw - 28, 12, 6); ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.5; RR(toM(B.camX), my - 1, (W / B.world) * (mw - 36), 14, 4); ctx.stroke();
  for (const e of B.enemies) { ctx.fillStyle = e.def.boss ? '#ffeb3b' : '#ff5252'; ctx.fillRect(toM(e.x) - 1.5, my + 3, 3, 6); }
  ctx.fillStyle = '#64b5f6'; for (const a of B.allies) ctx.fillRect(toM(a.x) - 1.5, my + 3, 3, 6);
  if (!h.dead) { ART.icon(ctx, 'star', toM(h.x), my + 6, 13); }
  ART.icon(ctx, 'castle', mx + 10, my + 6, 20); ART.icon(ctx, 'nest', mx + mw - 10, my + 6, 20);
  bar(mx + 2, 54, 134, 12, B.base.hp / B.base.max, '#81c784'); txt('멍멍성', mx + 69, 60, 10, '#fff', 'center');
  bar(mx + 144, 54, 134, 12, B.nest.hp / B.nest.max, '#ba68c8'); txt(B.pvp ? '상대 성' : '몬스터 둥지', mx + 211, 60, 10, '#fff', 'center');
  // 코인 / 버튼
  edgeOn(1);
  const cp = B.coinPulse > 0 ? 1 + B.coinPulse * 1.2 : 1;
  ART.panel(ctx, W - 262, 12, 132, 38, 'dark');
  ART.icon(ctx, 'coin', W - 240, 31, 24 * cp); txt('' + B.coins, W - 222, 32, 18, '#ffe082');
  btn(W - 122, 10, 54, 42, B.speed === 1 ? 'x1' : 'x2', () => toggleSpeed(), { bg: B.speed === 2 ? '#ffc93c' : '#c9b9a6', size: 18 }); if (!(S.perm && S.perm.sp2)) { B.speed = 1; ART.icon(ctx, 'lock', W - 76, 16, 14); } /* v4.5 속도 2배는 영구 구매(9,900원)한 사람만 · 안 사면 늘 1배 */
  btn(W - 62, 10, 52, 42, 'II', () => { B.paused = true; }, { bg: '#c9b9a6', size: 18 });
  for (const f of B.fly) { const p = ease(f.t), x = f.sx + (W - 240 - f.sx) * p, y = f.sy + (31 - f.sy) * p - Math.sin(p * Math.PI) * 60; ART.icon(ctx, 'coin', x, y, 16); }
  edgeOff();
  // 이동 버튼
  edgeOn(-1);
  for (const [m, key, dir] of [[MOVE_L, 'left', -1], [MOVE_R, 'right', 1]]) {
    btn(m.x, m.y, m.w, m.h, '', null, { hold: key, bg: inp[key] ? '#ffd27a' : '#f3e2c4', r: 22 });
    const p = inp[key] ? 4 : 0, cx = m.x + m.w / 2, cy = m.y + m.h / 2 + p;
    ctx.fillStyle = '#7a4520'; ctx.beginPath(); ctx.moveTo(cx + dir * 22, cy); ctx.lineTo(cx - dir * 14, cy - 22); ctx.lineTo(cx - dir * 14, cy + 22); ctx.closePath(); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = '#4a2a14'; ctx.lineJoin = 'round'; ctx.stroke();
  }
  edgeOff();
  // 뼈다귀 게이지
  const cx0 = 226;
  bar(cx0, H - 133, 460, 17, B.food / hs.fdMax, '#ffe0a6');
  ART.icon(ctx, 'bone', cx0 + 4, H - 125, 26);
  txt(`뼈다귀 ${Math.floor(B.food)} / ${hs.fdMax}`, cx0 + 230, H - 124, 12, '#fff8e1', 'center');
  // 소환 카드
  const DK5 = deck();
  for (let si = 0; si < 5; si++) {
    const x = cx0 + si * 93, y = H - 110, w = 87, hh = 100;
    if (si >= DK5.length) { RR(x, y, w, hh, 14); ctx.fillStyle = 'rgba(40,20,5,.35)'; ctx.fill(); ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(255,230,180,.5)'; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]); txt('빈 칸', x + w / 2, y + hh / 2, 12, 'rgba(255,240,210,.6)', 'center', false); continue; }
    const i = DK5[si], d = UNITS[i];
    const unl = unitUnlocked(i), can = unl && B.food >= d.cost && B.ucd[i] <= 0;
    const shake = B.cardShake && B.cardShake.i === i ? Math.sin(B.cardShake.t * 60) * 4 : 0, pop = B.cardPop && B.cardPop.i === i ? B.cardPop.t * 0.3 : 0;
    ctx.save(); ctx.translate(x + w / 2 + shake, y + hh / 2); ctx.scale(1 + pop, 1 + pop); ctx.translate(-(x + w / 2), -(y + hh / 2));
    const b = btn(x, y, w, hh, '', () => tapCard(i), { bg: unl ? (can ? d.col : '#9b8f80') : '#6f6a64', r: 14, key: 'card' + si }); b.x -= 3; b.w += 6; b.y -= 12; b.h += 16;
    if (unl) {
      ctx.save(); RR(x + 6, y + 6, w - 12, 62, 9); ctx.clip();
      ctx.fillStyle = ART.lgr(ctx, can ? '#fffaf0' : '#d9cfc2', can ? ART.LI(d.col, 0.55) : '#b9ad9f', 0, y, 0, y + 68); ctx.fillRect(x, y, w, 70);
      ART.drawFit(ctx, unitSprite(i), can ? 'i' + (Math.floor(G.time * 2.4 + i) % 3) : 'i0', x + w / 2, y + 37, w - 14, 58);
      if (can) { const gx = ((G.time * 70 + i * 40) % (w + 80)) - 40; const gg = ctx.createLinearGradient(x + gx - 20, 0, x + gx + 20, 0); gg.addColorStop(0, 'rgba(255,255,255,0)'); gg.addColorStop(0.5, 'rgba(255,255,255,.45)'); gg.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = gg; ctx.fillRect(x, y, w, 70); }
      ctx.restore();
      txt(d.nick, x + w / 2, y + 76, 13, '#fff', 'center');
      RR(x + 10, y + 83, w - 20, 15, 7); ctx.fillStyle = 'rgba(40,20,5,.55)'; ctx.fill();
      ART.icon(ctx, 'bone', x + 22, y + 90, 16);
      txt('' + d.cost, x + 34, y + 90.5, 13, B.food >= d.cost ? '#fff3c4' : '#ff8a80', 'left', false);
      txt(`${si + 1}`, x + w - 14, y + 13, 10, 'rgba(60,30,10,.6)', 'center', false);
      if (B.ucd[i] > 0) {
        const r = B.ucd[i] / d.cd; ctx.save(); RR(x + 2, y + 2, w - 4, hh - 4, 13); ctx.clip();
        ctx.fillStyle = 'rgba(20,10,0,.55)'; ctx.beginPath(); ctx.moveTo(x + w / 2, y + hh / 2); ctx.arc(x + w / 2, y + hh / 2, 90, -Math.PI / 2, -Math.PI / 2 + TAU * r); ctx.closePath(); ctx.fill(); ctx.restore();
        txt(B.ucd[i].toFixed(1), x + w / 2, y + 38, 20, '#fff', 'center');
      }
    } else {
      ART.icon(ctx, 'lock', x + w / 2, y + 34, 30);
      txt(`스테이지 ${d.unlock - 1}`, x + w / 2, y + 64, 11, '#fff', 'center');
      txt('클리어 시', x + w / 2, y + 80, 11, '#fff', 'center');
    }
    if (B.queue === i) { ctx.strokeStyle = `rgba(255,214,64,${0.6 + Math.sin(G.time * 10) * 0.4})`; ctx.lineWidth = 4; RR(x - 2, y - 2, w + 4, hh + 4, 16); ctx.stroke(); RR(x + 14, y - 10, w - 28, 18, 9); ctx.fillStyle = '#ffc93c'; ctx.fill(); txt('예약', x + w / 2, y - 1, 12, '#4a2a14', 'center', false); }
    ctx.restore();
    if (B.cardMsg && B.cardMsg.i === i) { ctx.globalAlpha = Math.min(1, B.cardMsg.t * 3); ctx.font = `bold 13px ${FONT}`; const tw = ctx.measureText(B.cardMsg.s).width + 18, tx = clamp(x + w / 2 - tw / 2, 8, W - tw - 8); RR(tx, y - 40, tw, 24, 12); ctx.fillStyle = 'rgba(40,20,5,.85)'; ctx.fill(); txt(B.cardMsg.s, tx + tw / 2, y - 28, 13, '#ffe082', 'center', false); ctx.globalAlpha = 1; }
  }
  // 스킬
  edgeOn(1);
  const sks = [[744, H - 60], [820, H - 60], [896, H - 60], [820, H - 140]];
  for (let i = 0; i < 4; i++) {
    if (i === 3 && !mounted()) continue;
    const s = SKILLS[i], [x, y] = sks[i], r = i === 3 ? 29 : 33, unl = S.lv >= s.lv && !(s.mir && !S.mirFire), ok = unl && !h.dead && B.mana >= s.mp && B.scd[i] <= 0;
    uiPush({ x: x - r - 2, y: y - r - 8, w: r * 2 + 4, h: r * 2 + 14, tap: () => useSkill(i), key: 'sk' + i });
    const pr = pressT['sk' + i] > 0 ? 3 : 0;
    ctx.fillStyle = 'rgba(20,8,0,.45)'; circ(x, y + 5, r);
    ctx.fillStyle = ART.DK(unl ? s.col : '#777', 0.45); circ(x, y + 3, r);
    const base = !unl ? '#8d8d8d' : ok ? s.col : '#9c9188';
    ctx.fillStyle = ART.rg(ctx, base, x, y + pr, r, 0.45, 0.25); circ(x, y + pr, r);
    ctx.lineWidth = 3; ctx.strokeStyle = '#4a2a14'; ctx.beginPath(); ctx.arc(x, y + pr, r, 0, TAU); ctx.stroke();
    ctx.lineWidth = 2; ctx.strokeStyle = ok ? 'rgba(255,240,180,.9)' : 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.arc(x, y + pr, r - 4, 0, TAU); ctx.stroke();
    const yy = y + pr;
    if (i === 0) { ctx.save(); ctx.translate(x, yy - 3); ctx.rotate(-0.7); ctx.fillStyle = '#ffffff'; ctx.fillRect(-3.5, -18, 7, 28); ART.bone(ctx, 0, 10, 20, '#ffd34d'); ctx.restore(); }
    if (i === 1) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(x - 12, yy - 3, 8 + k * 7, -0.7, 0.7); ctx.stroke(); } ART.paw(ctx, x - 14, yy - 3, 0.8, '#fff'); }
    if (i === 3) { ctx.save(); ctx.beginPath(); ctx.arc(x, yy, r - 3, 0, TAU); ctx.clip(); ART.drawFit(ctx, 'mir' + (dragonStage() === 1 ? '' : dragonStage()), 'i0', x, yy + 2, (r - 3) * 1.8, (r - 3) * 1.8, { face: 0.75 }); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(ART.softDot('#ffb04a'), x + 4, yy - 16, 30, 24); ctx.restore(); }
    if (i === 2) { ART.bone(ctx, x - 8, yy - 10, 18, '#fff', 0.5); ART.bone(ctx, x + 8, yy - 2, 18, '#fff', -0.4); ART.bone(ctx, x - 4, yy + 7, 14, '#fff', 0.2); }
    if (!unl) { if (!(s.mir && !S.mirFire)) { ctx.fillStyle = 'rgba(0,0,0,.45)'; circ(x, yy, r); txt(`Lv.${s.lv}`, x, yy, 15, '#fff', 'center'); } }
    if (i === 3 && !S.mirFire) { ctx.save(); ctx.fillStyle = 'rgba(30,20,10,.55)'; circ(x, yy, r - 2); ART.icon(ctx, 'lock', x, yy - 2, 22); RR(x - 24, yy + 14, 48, 16, 8); ctx.fillStyle = '#2a8ac0'; ctx.fill(); txt('상점', x, yy + 22, 11.5, '#fff', 'center', false); ctx.restore(); } /* v4.4 잠김 */
    else {
      RR(x - 15, yy + 17, 30, 15, 7); ctx.fillStyle = 'rgba(20,40,90,.85)'; ctx.fill(); txt('' + s.mp, x, yy + 24.5, 11, '#bfe3ff', 'center', false);
      if (B.scd[i] > 0) { ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.beginPath(); ctx.moveTo(x, yy); ctx.arc(x, yy, r, -Math.PI / 2, -Math.PI / 2 + TAU * (B.scd[i] / s.cd)); ctx.closePath(); ctx.fill(); txt('' + Math.ceil(B.scd[i]), x, yy - 2, 19, '#fff', 'center'); }
    }
  }
  // 물약
  const px = 896, py = H - 140;
  uiPush({ x: px - 28, y: py - 26, w: 56, h: 50, tap: usePotion });
  ctx.fillStyle = 'rgba(20,8,0,.4)'; circ(px, py + 4, 23);
  ctx.fillStyle = ART.rg(ctx, S.potions > 0 ? '#c8f0cc' : '#9e9e9e', px, py, 23); circ(px, py, 23); ctx.lineWidth = 2.5; ctx.strokeStyle = '#4a2a14'; ctx.beginPath(); ctx.arc(px, py, 23, 0, TAU); ctx.stroke();
  ART.icon(ctx, 'potion', px, py, 30); txt('x' + S.potions, px + 18, py + 16, 13, '#fff', 'center');
  edgeOff();
  drawFireflies();
  if (!B.over) { edgeOn(1); drawItemBar(); edgeOff(); drawRival(); }
  // 메시지·튜토리얼
  if (B.cut) drawBossCut(B.cut);
  if (B.intro) { drawIntroBars(); ui = [{ x: 0, y: 0, w: W, h: H, key: 'skipIntro', tap: () => { if (B.intro) B.intro.t = B.intro.T; } }]; }
  if (!B.intro && !B.over) drawComboButtons();
  drawShopHud();
  drawEventBanner();
  if (B.msg) {
    ctx.globalAlpha = Math.min(1, B.msg.t * 2);
    ART.panel(ctx, W / 2 - 240, 96, 480, 46, 'dark');
    txt(B.msg.s, W / 2, 119, 20, B.msg.boss ? '#ff8a80' : '#ffe082', 'center', true, null, 450);
    ctx.globalAlpha = 1;
  }
  if (B.tut > 0 && B.banner <= 0) {
    ctx.globalAlpha = Math.min(1, B.tut);
    ART.panel(ctx, W / 2 - 310, 150, 620, 100, 'cream');
    txt('◀ ▶ 버튼을 누르고 있으면 멍멍기사가 움직여요', W / 2, 176, 16, '#5d3d22', 'center', false);
    txt('아래 카드를 누르면 강아지 동료를 소환! (뼈다귀 사용)', W / 2, 200, 16, '#5d3d22', 'center', false);
    txt('오른쪽 끝 몬스터 둥지를 부수면 승리 · 떨어진 아이템은 기사가 주워요', W / 2, 224, 15, '#5d3d22', 'center', false);
    ctx.globalAlpha = 1;
  }
}
function ease(t) { t = clamp(t, 0, 1); return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
function drawPause() {
  ui = [];
  ctx.fillStyle = 'rgba(20,8,0,.6)'; ctx.fillRect(-OX, 0, VW, H);
  const bk = B.si.bossKey || B.si.midKey, cx = bk ? W / 2 - 200 : W / 2;
  ART.panel(ctx, cx - 180, 100, 360, 340, 'cream');
  bigText('일시 정지', cx, 146, 34, '#fff3c4', '#ffb300');
  btn(cx - 125, 190, 250, 58, '계속하기', () => { B.paused = false; }, { bg: '#5cc96b' });
  btn(cx - 125, 262, 250, 58, '다시 시작', () => go(() => startBattle(B.n)), { bg: '#ffb84d' });
  btn(cx - 125, 334, 250, 58, '지도로 (포기)', () => go(() => { save(); setScene('map'); }), { bg: '#a99a8a' });
  if (bk) { // v1.8 이 판의 보스 기술 설명
    const x0 = W / 2 + 10, isB = !!B.si.bossKey, sk = BOSS_SK[bk], d = ENEMIES[bk];
    ART.panel(ctx, x0, 100, 360, 340, 'cream'); txt(isB ? '이 판의 보스' : '이 판의 강한 몬스터', x0 + 180, 128, 15, '#a0652a', 'center', false);
    ctx.save(); RR(x0 + 20, 142, 120, 120, 14); ctx.fillStyle = ART.lgr(ctx, '#fff8e6', '#f2d6a0', 0, 142, 0, 262); ctx.fill(); ctx.clip(); ART.drawFit(ctx, bk, 'i0', x0 + 80, 202, 112, 112, { flip: true }); ctx.restore();
    txt(d.name, x0 + 152, 160, 15, '#4e342e', 'left', false, null, 196);
    if (BOSS_TAG[bk]) txt('「' + BOSS_TAG[bk] + '」', x0 + 152, 184, 12, '#8a6142', 'left', false, null, 196);
    if (sk) { RR(x0 + 150, 200, 196, 30, 10); ctx.fillStyle = '#ffe0b0'; ctx.fill(); txt('기술 · ' + sk.n, x0 + 248, 215, 14, '#c0501a', 'center', false, null, 186); }
    wrapTxt(BOSS_TIP[bk] || '바닥에 경고가 보이면 그 자리를 피하세요. 동료와 함께 싸우면 훨씬 쉬워요.', x0 + 22, 286, 318, 13.5, '#5a3412', 21);
  }
}
function drawResult() {
  ui = [];
  const o = B.over, a = Math.min(1, o.t * 2);
  ctx.globalAlpha = a; ctx.fillStyle = 'rgba(20,8,0,.6)'; ctx.fillRect(-OX, 0, VW, H);
  if (o.win) { ctx.save(); ctx.translate(W / 2, 150); ctx.rotate(G.time * 0.3); ctx.globalCompositeOperation = 'lighter'; for (let k = 0; k < 12; k++) { ctx.rotate(TAU / 12); ctx.fillStyle = 'rgba(255,220,120,.10)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-40, -420); ctx.lineTo(40, -420); ctx.closePath(); ctx.fill(); } ctx.restore(); }
  const py = 46 + (1 - ease(Math.min(1, o.t * 2.5))) * 60;
  ART.panel(ctx, W / 2 - 270, py, 540, 450, 'cream');
  ART.draw(ctx, heroType(), o.win ? (Math.floor(G.time * 3) % 2 ? 'a2' : 'i0') : 'ib', W / 2 - 200, py + 128, mounted() ? mountK() * 0.95 : 1.5, false, 0);
  if (o.win) bigText('승리!', W / 2 + 20, py + 48, 50, '#fff6b0', '#ff9800'); else bigText('멍멍성이 무너졌어요', W / 2 + 20, py + 48, 32, '#e0e0e0', '#9e9e9e');
  for (let i = 0; i < 3; i++) {
    const on = i < o.stars && o.t > 0.45 + i * 0.25, sc = on ? 1 + Math.max(0, 1 - (o.t - 0.45 - i * 0.25) * 4) * 0.5 : 1;
    ART.icon(ctx, on ? 'star' : 'starOff', W / 2 - 40 + i * 62, py + 104, 46 * sc);
  }
  const lines = [['처치한 몬스터', `${B.kills}마리`], ['주운 코인', `${B.coins}`], ['클리어 보너스', `${o.bonus}`], ['얻은 경험치', `${B.xp} XP` + (S.lv > B.lvStart ? `  (Lv.${B.lvStart}→${S.lv})` : '')]];
  if (o.win && B.permK > 1) lines.push([`영구 보상 ×${B.permK}`, `+${(B.coins + o.bonus) * (B.permK - 1)} 코인`]);
  if (B.towerRew) lines.push(['탑 보상', `+${B.towerRew} 코인`]);
  if (B.petUse && !B.pvp && !B.petCombo && !PETS.some(q => (S.pets || {})[q.id] && petPaid(q))) lines.push(['💡 펫 안내', '보석 펫은 합동 공격을 해요']); /* v5.2 병아리만 가진 사람에게 */
  if (B.petUse && !B.pvp) { const P = petDef(); lines.push(["펫 활약", `${P ? P.n.split(" ").pop() + " " : ""}기술 ${B.petUse} · 처치 ${B.petKill || 0}${B.petCombo ? ` · 합동 ${B.petCombo}` : ""}${B.buddyNew ? " · 단짝!" : ""}`]); } /* v5.1 펫 활약 한 줄 */
  if (B.pvp) { const U = Object.entries(B.pvpUse || {}).sort((a, b) => b[1] - a[1])[0]; lines.push(['대전 기록', `상대 기사 처치 ${B.oppHeroK || 0}번 · 내가 많이 쓴 기사 ${U && UNITS[+U[0]] ? UNITS[+U[0]].nick + ' ' + U[1] + '번' : '없음'}`]); if (B.pvpWhy) lines.push(['3분 판정', B.pvpWhy]); } /* v4.7 */
  if (B.pvpRew) lines.push(['1:1 대전', `${B.pvpRew.win ? '이겼어요!' : '아쉬워요'} · 점수 ${B.pvpRew.old} → ${B.pvpRew.nw} (${B.pvpRew.d > 0 ? '+' : ''}${B.pvpRew.d})${B.pvpRew.win ? ' · +200 코인' : ''}`]);
  if (B.wbRew) lines.push(['주간 보스 대회', `${fmtT(B.wbRew.t)}${B.wbRew.nb ? ' · 이번 주 내 최고!' : ` (최고 ${fmtT(B.wbRew.best)})`} · +500 코인`]);
  if (B.bhRew) lines.push(['보스 도전관', `+${B.bhRew.coin} 코인${B.bhRew.nn ? ` · 새 별 ${B.bhRew.nn}개 (별가루 +${B.bhRew.nn * 3})` : ''}${B.bhRew.up ? ` · 강함 ${B.bhRew.up} 열림!` : ''}${B.bhRew.max ? ' · 모두 깸! 별가루 +15' : ''}`]);
  if (B.streakRew && o.win) lines.push(['4주 연속!', '별가루 +10']);
  if (B.weekRew && o.win) lines.push(['주간 도전', B.weekRew.first ? `스티커 · ${B.weekRew.deco} · +${B.weekRew.coin}코인` : `+${B.weekRew.coin}코인`]);
  if (B.rival && B.weekly && o.win && B.t < B.rival.t && !B.duelSaved) { B.duelSaved = 1; const wk = weekNo(); S.duel = S.duel || { w: {}, tot: 0 }; const L = S.duel.w[wk] = S.duel.w[wk] || []; if (!L.includes(B.rival.n)) L.push(B.rival.n); S.duel.tot++; save(); } /* v4.1 친구 대결 기록 */
  if (B.rival && B.weekly) lines.push([`🏁 ${B.rival.n} 기록`, o.win && B.t < B.rival.t ? `이겼어요! (${fmtT(B.rival.t)})` : `아깝다! (${fmtT(B.rival.t)})`]);
  if (B.weekBest && o.win) lines.push(['기록', `${fmtT(B.weekBest.t)}${B.weekBest.old ? ' · 이번 주 최고 기록!' : ' · 첫 기록'}`]);
  if (B.dustGot && o.win) lines.push(['별가루', `+${B.dustGot} (각성 강화 재료)`]);
  if (B.trial != null && o.win) lines.push(['전직 시험', `합격! 「${THIRD[B.trial].n}」`]);
  if (o.sold) lines.push([o.aSold === o.sold ? '자동 판매' : '자동 판매 · 가방 가득', `+${o.sold} 코인`]);
  const lx = W / 2 - 110, rx = W / 2 + 230;
  const LH = Math.max(16, Math.min(lines.length >= 5 || o.unlockMsg ? 23 : 27, (214 - (B.loot.length ? (lines.length > 8 ? 36 : 44) : 0) - (o.unlockMsg ? 30 : 0)) / (lines.length + 0.2))); // v1.2 겹침 방지 · v5.2 줄이 많으면 버튼 위까지 맞춰 좁힘
  const lfs = LH < 20 ? 14 : 15; lines.forEach((l, i) => { txt(l[0], lx, py + 146 + i * LH, lfs, '#7a5230', 'left', false); txt(l[1], rx, py + 146 + i * LH, lfs, '#3e2723', 'right', false, null, l[0] === '펫 활약' || l[0] === '💡 펫 안내' ? 236 : 210); });
  let yy = py + 146 + lines.length * LH + 4;
  if (B.loot.length) {
    txt('획득 장비', lx, yy + 12, 15, '#7a5230', 'left', false);
    const show = B.loot.slice(0, 6);
    const lsz = lines.length > 8 ? 32 : 40; /* v5.2 줄이 많으면 장비 그림 작게 */ show.forEach((it, i) => ART.itemIcon(ctx, it, lx + 80 + i * (lsz + 6), yy - 6 + (40 - lsz) / 2, lsz));
    if (B.loot.length > 6) txt(`+${B.loot.length - 6}`, lx + 80 + 6 * (lsz + 6) + 4, yy + 14, 14, '#7a5230', 'left', false);
    yy += lsz + 4;
  }
  if (o.unlockMsg) {
    ART.draw(ctx, o.unlockMsg.id, 'i' + (Math.floor(G.time * 2.4) % 3), W / 2 - 205, py + 320, 1.2, false, 0);
    RR(lx - 6, yy - 2, 346, 26, 13); ctx.fillStyle = 'rgba(46,125,50,.14)'; ctx.fill();
    txt(`새 동료 합류! ${o.unlockMsg.nick} · ${o.unlockMsg.name}`, lx + 167, yy + 11, 15, '#2e7d32', 'center', false, null, 332);
    yy += 30;
  }
  if (o.win && !o.unlockMsg && o.t > 0.6) { // v2.3 이긴 뒤 기사들 쓰다듬기
    const dk = S.deck.slice(0, 5); dk.forEach((ui2, k) => { const x = W / 2 - 245 + (k % 3) * 40 + (k >= 3 ? 20 : 0), y = py + 262 + (k >= 3 ? 62 : 0), id = UNITS[ui2].id; drawCuteDog('rs' + k, id, unitSprite(ui2), x, y, 0.42, { ph: k, emy: 34, emx: 4 }); uiPush({ x: x - 20, y: y - 46, w: 40, h: 50, key: 'rspet' + k, tap: () => cutePet('rs' + k, id, x, y - 40) }); });
    txt('👆 쓰다듬기', W / 2 - 200, py + 344, 10, '#a0652a', 'center', false);
  }
  if (o.win && !B.special && hasStory('post' + B.n) && yy + 10 <= py + 354) txt('▶ 이야기가 이어집니다', rx, Math.max(yy + 10, py + 352), 13, '#a0652a', 'right', false);
  ctx.globalAlpha = 1; drawCrumbs(); drawFloatMsg();
  if (B.buddyNew && o.t > 0.9 && !o.budSeen) { drawBuddyCel(o); return; } /* v5.2 단짝 축하 화면 (누르거나 4초 뒤 닫힘) */
  if (o.t < 0.9) return;
  /* v4.6 「보상 2배 티켓」 없앰 — 보상 2배·4배는 영구 구매(보석·영구 탭)로만 */
  const by = py + 372;
  btn(W / 2 - 245, by, 150, 56, '지도로', () => afterResult(() => { setScene('map'); mapTab = 0; }), { bg: '#a99a8a' });
  // v2.3 「다시 하기」는 언제나 가운데 (일반 · 주간 도전 · 전직 시험 · 탑 모두)
  { const again = B.pvp ? (o => () => startPvp(o))(B.pvp) : B.contest ? () => startContest() : B.rematch != null ? (z => () => startRematch(z))(B.rematch) : B.tower != null ? () => startTower() : B.trial != null ? (k => () => startTrial(k))(B.trial) : B.weekly ? () => startWeekly() : (k => () => startBattle(k))(B.n);
    btn(W / 2 - 78, by, 150, 56, '다시 하기', () => afterResult(again), { bg: '#ffb84d', key: 'again' }); }
  if (B.tower != null) { if (o.win) btn(W / 2 + 89, by, 156, 56, `${S.tower.cur}층 도전`, () => afterResult(() => startTower()), { bg: '#9c6bff', size: 17 }); else btn(W / 2 + 89, by, 156, 56, '강화하러 가기', () => go(() => { setScene('map'); mapTab = 1; }), { bg: '#5cc96b', size: 17 }); }
  else if (B.trial != null) btn(W / 2 + 89, by, 156, 56, o.win ? '강화 보기' : '강화하러 가기', () => afterResult(() => { setScene('map'); mapTab = 1; }), { bg: '#ff8a3d', size: 17 });
  else if (B.pvp) btn(W / 2 + 89, by, 156, 56, '대전 목록', () => afterResult(() => { setScene('map'); mapTab = 0; RANKP = { t: 0, tab: 3 }; }), { bg: '#c0392b', size: 17 });
  else if (B.rematch != null) btn(W / 2 + 89, by, 156, 56, '보스 도전관', () => afterResult(() => { setScene('map'); mapTab = 0; BHP = { t: 0, sel: B.rematch, pg: Math.floor(B.rematch / 10) }; }), { bg: '#c0392b', size: 17 });
  else if (B.weekly) btn(W / 2 + 89, by, 156, 56, '주간 도전 창', () => afterResult(() => { setScene('map'); mapTab = 0; WEEKP = { t: 0, tab: 3 }; }), { bg: '#8fb8ff', size: 17 });
  else if (o.win && B.n < MAXST) btn(W / 2 + 89, by, 156, 56, '다음 스테이지', () => { const k = B.n + 1; afterResult(() => enterStage(k, true)); }, { bg: '#5cc96b', size: 18 });
  else if (o.win && B.n === MAXST) btn(W / 2 + 89, by, 156, 56, '엔딩 보기', () => afterResult(() => { setScene('map'); mapTab = 0; }), { bg: '#5cc96b', size: 18 });
  else if (!o.win) btn(W / 2 + 89, by, 156, 56, '강화하러 가기', () => go(() => { setScene('map'); mapTab = 1; }), { bg: '#5cc96b', size: 17 });
}

/* ---------------- 타이틀 ---------------- */
let warmQ = null;
/* ---------------- v0.8 나만의 멍멍기사 만들기 ---------------- */
const NAME_PRESET = ['보리', '코코', '토리', '모카', '두부', '호두', '쿠키', '라떼', '뭉게', '하루'];
const FUR_N = ['기본', '캐러멜', '초콜릿', '크림', '회색', '검정'], HELM_N = ['기사 투구', '면갑 투구', '투구 없음'], DRAGON_N = ['초록 용', '빨강 용', '파랑 용', '보라 용', '황금 용'];
let CR = null, CHR = null, GROWN = null, PROMO_POP = null;
function defCustom() { return { breed: 0, fur: 0, helm: 1, plume: 0, cape: 0, mount: true, dragon: 0, name: '보리' }; }
function openCreator(then, first) { CR = { c: Object.assign(defCustom(), S.custom || (first ? { breed: 1 } : {})), then, first, t: 0 }; setScene('create'); }
function creatorDone() {
  if (!CR) return; const el = document.getElementById('mmkName'); if (el) el.blur();
  S.custom = Object.assign({}, CR.c); save(); const f = CR.then; SFX.rare();
  go(() => { CR = null; if (f) f(); else setScene('map'); });
}
function askName() {
  let el = document.getElementById('mmkName');
  if (!el) {
    el = document.createElement('input'); el.id = 'mmkName'; el.maxLength = 6; el.placeholder = '이름 (최대 6글자)'; el.autocomplete = 'off';
    Object.assign(el.style, { position: 'fixed', left: '50%', top: '14%', transform: 'translateX(-50%)', zIndex: 60, fontSize: '22px', padding: '10px 16px', borderRadius: '14px', border: '3px solid #c69355', background: '#fff8e6', color: '#4e342e', width: '260px', textAlign: 'center', fontWeight: 'bold', boxShadow: '0 6px 18px rgba(0,0,0,.35)' });
    document.body.appendChild(el);
    const done = () => { const v = el.value.replace(/[<>&"'`]/g, '').trim().slice(0, 6); if (v && CR) CR.c.name = v; el.remove(); };
    el.addEventListener('keydown', e => { if (e.key === 'Enter') el.blur(); }); el.addEventListener('blur', done);
    el.addEventListener('input', () => { const v = el.value.replace(/[<>&"'`]/g, '').trim().slice(0, 6); if (v && CR) CR.c.name = v; });
  }
  el.value = CR ? CR.c.name : ''; setTimeout(() => { try { el.focus(); el.select(); } catch (e) {} }, 30);
}
function drawCreate() {
  const c = CR.c, t = G.time; CR.t += 1 / 60;
  bgFull([0, 1, 2, 5, 10][c.dragon] || 0, t * 18, t, GY + 40, W, H);
  ctx.fillStyle = 'rgba(30,12,0,.25)'; ctx.fillRect(-OX, 0, VW, H);
  // 미리보기
  ART.panel(ctx, 18, 16, 430, 508, 'cream');
  ctx.save(); RR(32, 30, 402, 380, 16); ctx.clip(); ctx.fillStyle = ART.lgr(ctx, '#cfeaff', '#fff1d6', 0, 30, 0, 410); ctx.fillRect(32, 30, 402, 380);
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.6; ctx.drawImage(ART.softDot('#fff6c2'), 80, 40, 300, 300); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  ctx.fillStyle = '#9ad06a'; ctx.fillRect(32, 360, 402, 50); ctx.fillStyle = 'rgba(40,20,0,.2)'; ART.E(ctx, 228, 366, 120, 12); ctx.fill();
  const cyc = t % 6, key = cyc < 2 ? 'i' + (Math.floor(t * 2.4) % 3) : cyc < 4 ? 'w' + (Math.floor(t * 15) % 10) : 'a' + Math.min(7, Math.floor(((t % 1.2) / 0.4) * 8) % 8);
  const id = ART.heroId(S.eq, Object.assign({}, c, { grow: dragonStage() })); ART.warm([id], 99);
  ART.draw(ctx, id, key, 222, 364, c.mount ? mountK() * 1.55 : 2.5, false, 0);
  ctx.restore(); ctx.lineWidth = 3; ctx.strokeStyle = '#c69355'; RR(32, 30, 402, 380, 16); ctx.stroke();
  bigText('멍멍기사 ' + c.name, 233, 446, 30, '#fff3c4', '#ffb300');
  txt(`${ART.HERO_BREEDS[c.breed].n} · ${c.mount ? DRAGON_N[c.dragon] + ' (' + GROW_N[dragonStage()] + ')' : '도보 기사'}`, 233, 486, 15, '#7a5230', 'center', false);
  // 설정 패널
  ART.panel(ctx, 462, 16, 482, 508, 'cream');
  txt(CR.first ? '나만의 멍멍기사를 만들어 주세요!' : '기사 · 용 꾸미기', 703, 44, 20, '#5a3412', 'center', false);
  const row = (i, label, val, prev, next) => {
    const y = 64 + i * 42; txt(label, 482, y + 18, 15, '#8a6142', 'left', false);
    btn(574, y, 44, 36, '◀', prev, { bg: '#c9a983', size: 16, key: 'cp' + i }); RR(624, y, 230, 36, 10); ctx.fillStyle = 'rgba(141,90,43,.14)'; ctx.fill(); txt(val, 739, y + 18, 16, '#4e342e', 'center', false);
    btn(860, y, 44, 36, '▶', next, { bg: '#c9a983', size: 16, key: 'cn' + i });
  };
  const cyc2 = (k, n, d) => { c[k] = (c[k] + d + n) % n; };
  row(0, '견종', ART.HERO_BREEDS[c.breed].n, () => cyc2('breed', ART.HERO_BREEDS.length, -1), () => cyc2('breed', ART.HERO_BREEDS.length, 1));
  row(1, '털 색', FUR_N[c.fur], () => cyc2('fur', FUR_N.length, -1), () => cyc2('fur', FUR_N.length, 1));
  row(2, '투구', HELM_N[c.helm], () => cyc2('helm', 3, -1), () => cyc2('helm', 3, 1));
  const sw = (i, label, cols, k) => {
    const y = 64 + i * 42; txt(label, 482, y + 18, 15, '#8a6142', 'left', false);
    cols.forEach((col, j) => { const x = 590 + j * 50; uiPush({ x: x - 20, y: y - 2, w: 40, h: 40, tap: () => { c[k] = j; SFX.pick(); }, key: 'sw' + k + j }); ctx.fillStyle = col; circ(x, y + 18, 15); ctx.lineWidth = c[k] === j ? 4 : 2; ctx.strokeStyle = c[k] === j ? '#e65100' : 'rgba(60,30,10,.5)'; ctx.beginPath(); ctx.arc(x, y + 18, c[k] === j ? 18 : 15, 0, TAU); ctx.stroke(); });
  };
  sw(3, '깃털', ART.HERO_PLUME, 'plume');
  sw(4, '망토', ART.HERO_CAPE, 'cape');
  { const y = 64 + 5 * 42; txt('용 타기', 482, y + 18, 15, '#8a6142', 'left', false); btn(574, y, 330, 36, c.mount ? '🐉 용을 타고 싸워요' : '🐾 걸어서 싸워요', () => { c.mount = !c.mount; SFX.pick(); }, { bg: c.mount ? '#5cc96b' : '#a99a8a', size: 16, key: 'cmount' }); }
  if (c.mount) sw(6, '용 색', ART.DRAGON_COL, 'dragon'); else txt('용 없이 가볍게 달려요 (외형만 달라져요)', 703, 64 + 6 * 42 + 18, 13, '#a0805a', 'center', false);
  row(7, '이름', c.name, () => { const i = NAME_PRESET.indexOf(c.name); c.name = NAME_PRESET[(i < 0 ? 0 : i - 1 + NAME_PRESET.length) % NAME_PRESET.length]; }, () => { const i = NAME_PRESET.indexOf(c.name); c.name = NAME_PRESET[(i + 1) % NAME_PRESET.length]; });
  btn(574, 64 + 8 * 42, 160, 36, '✎ 직접 입력', () => askName(), { bg: '#ffb84d', size: 15, key: 'cname' });
  btn(744, 64 + 8 * 42, 160, 36, '🎲 무작위', () => { c.breed = Math.floor(Math.random() * ART.HERO_BREEDS.length); c.fur = Math.random() < 0.6 ? 0 : Math.floor(Math.random() * FUR_N.length); c.helm = Math.floor(Math.random() * 3); c.plume = Math.floor(Math.random() * 6); c.cape = Math.floor(Math.random() * 6); c.dragon = Math.floor(Math.random() * 5); SFX.pick(); }, { bg: '#9b6bff', size: 15, key: 'crand' });
  btn(560, 466, 360, 50, CR.first ? '이 기사로 모험 시작!' : '저장하고 돌아가기', () => creatorDone(), { bg: '#ff7a45', size: 21, key: 'cdone' });
  txt('언제든 설정 · 장비 화면에서 다시 바꿀 수 있어요', 703, 452, 11, '#a0805a', 'center', false);
}
let TCX = W / 2, titleBg = null;
const SEASON_N = ['시즌 1 · 열 개의 별뼈', '시즌 2 · 별의 바다', '시즌 3 · 뼈의 심장', '시즌 4 · 시간의 시계탑', '시즌 5 · 꿈꾸는 섬', '시즌 6 · 별 너머의 왕국', '시즌 7 · 네 개의 바람', '시즌 8 · 무지개 다리 너머', '시즌 9 · 갈라진 무지개', '시즌 10 · 사막의 별시장', '시즌 11 · 잠든 시계 숲', '시즌 12 · 하늘 일족의 귀향', '시즌 13 · 얼음 바다의 고래 노래', '시즌 14 · 백 년 전 기사 바둑이', '시즌 15 · 다섯 나라 대축제'];
/* v3.8 메인 화면 배경 새로 그림 (고급스럽게): 노을 하늘 · 빛나는 구름 · 눈 덮인 먼 산 3겹 · 큰 동화 성(벽돌·비늘 지붕·금 장식·빛나는 창·성문·깃발) · 언덕 마을 · 가로등 길 · 꽃밭
   넓은 화면까지 덮도록 가로 1300(왼쪽 170 여유)으로, 선명하게 2배 크기로 한 번만 그림 */
const TBG_X = 170, TBG_W = 1300;
function buildTitleBg() {
  const SC = 2, c = ART.mk(TBG_W * SC, H * SC), g = c.getContext('2d'); g.scale(SC, SC); g.translate(TBG_X, 0);
  let sd = 31; const R = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
  const L0 = -TBG_X, L1 = TBG_W - TBG_X, lg = (y0, y1, a, b) => ART.lgr(g, a, b, 0, y0, 0, y1);
  /* 하늘 */
  const sky = g.createLinearGradient(0, 0, 0, 420); [[0, '#18204f'], [0.22, '#33357a'], [0.42, '#6a4f9e'], [0.6, '#b36fa6'], [0.74, '#f19489'], [0.87, '#ffc58e'], [1, '#ffe7bf']].forEach(([p, col]) => sky.addColorStop(p, col)); g.fillStyle = sky; g.fillRect(L0, 0, TBG_W, H);
  { const gl = g.createRadialGradient(730, 250, 10, 730, 250, 420); gl.addColorStop(0, 'rgba(255,240,200,.75)'); gl.addColorStop(0.35, 'rgba(255,214,170,.35)'); gl.addColorStop(1, 'rgba(255,200,170,0)'); g.fillStyle = gl; g.fillRect(L0, 0, TBG_W, H); }
  /* 별 · 반짝이 */
  for (let k = 0; k < 170; k++) { const x = L0 + R() * TBG_W, y = R() * 190, a = 0.25 + R() * 0.7 * (1 - y / 230); g.fillStyle = `rgba(255,250,235,${a})`; g.beginPath(); g.arc(x, y, R() < 0.12 ? 1.5 : 0.8, 0, TAU); g.fill(); if (R() < 0.06) { g.strokeStyle = `rgba(255,250,235,${a * 0.7})`; g.lineWidth = 0.6; g.beginPath(); g.moveTo(x - 4, y); g.lineTo(x + 4, y); g.moveTo(x, y - 4); g.lineTo(x, y + 4); g.stroke(); } }
  /* 오로라 띠 */
  g.save(); g.globalCompositeOperation = 'screen'; [[0.13, '#9be8ff', 40], [0.09, '#ffb8e8', 70]].forEach(([al, col, dy]) => { const gr = g.createLinearGradient(0, 20 + dy, 0, 120 + dy); gr.addColorStop(0, ART.rgba(col, 0)); gr.addColorStop(0.5, ART.rgba(col, al)); gr.addColorStop(1, ART.rgba(col, 0)); g.fillStyle = gr; g.beginPath(); g.moveTo(L0, 70 + dy); g.bezierCurveTo(200, 10 + dy, 520, 130 + dy, L1, 30 + dy); g.lineTo(L1, 110 + dy); g.bezierCurveTo(520, 200 + dy, 200, 90 + dy, L0, 150 + dy); g.closePath(); g.fill(); }); g.restore();
  /* 구름: 위는 노을빛, 아래는 그늘 */
  const cloud = (x, y, s, al) => { const cw = Math.ceil(300 * s), ch = Math.ceil(110 * s), cv = ART.mk(cw * 2, ch * 2), q = cv.getContext('2d'); q.scale(2, 2); q.translate(cw / 2 - x, ch * 0.75 - y);
    const blobs = []; for (let k = 0; k < 9; k++) blobs.push([x + (k - 4) * 22 * s + (R() - 0.5) * 10 * s, y - Math.sin(k / 8 * Math.PI) * 26 * s + (R() - 0.5) * 6 * s, (18 + R() * 14) * s * (1 - Math.abs(k - 4) / 9)]);
    q.fillStyle = ART.lgr(q, '#fff1e2', '#d896ad', 0, y - 50 * s, 0, y + 20 * s); q.beginPath(); blobs.forEach(([bx, by2, r]) => { q.moveTo(bx + r, by2); q.arc(bx, by2, r, 0, TAU); }); q.fill();
    q.globalCompositeOperation = 'source-atop'; const rim = q.createLinearGradient(0, y - 50 * s, 0, y - 8 * s); rim.addColorStop(0, 'rgba(255,236,190,.95)'); rim.addColorStop(1, 'rgba(255,236,190,0)'); q.fillStyle = rim; q.fillRect(x - 150 * s, y - 80 * s, 300 * s, 80 * s);
    const bot = q.createLinearGradient(0, y - 6 * s, 0, y + 22 * s); bot.addColorStop(0, 'rgba(150,90,150,0)'); bot.addColorStop(1, 'rgba(150,90,150,.35)'); q.fillStyle = bot; q.fillRect(x - 150 * s, y - 6 * s, 300 * s, 40 * s);
    g.save(); g.globalAlpha = al; g.drawImage(cv, x - cw / 2, y - ch * 0.75, cw, ch); g.restore(); };
  [[40, 205, 1.2, 0.6], [300, 178, 0.9, 0.5], [980, 196, 1.3, 0.65], [1090, 232, 1, 0.55], [-90, 240, 1, 0.55], [560, 236, 0.8, 0.45]].forEach(a => cloud(...a));
  /* 먼 산 3겹 (눈 덮인 봉우리 · 아침 안개) */
  const ridge = (base, amp, f, ph) => { const P = []; for (let x = L0; x <= L1; x += 6) { const n = Math.abs(Math.sin(x * f + ph)) * amp + Math.sin(x * f * 2.7 + ph * 2) * amp * 0.22 + Math.sin(x * f * 6.1) * amp * 0.06; P.push([x, base - n]); } return P; };
  [[262, 70, 0.0105, 0.3, '#7d76b6', '#9b8cc4', true], [292, 50, 0.016, 1.7, '#9a82b6', '#b897bc', true], [322, 34, 0.024, 3.1, '#bb8fa8', '#d6a9b0', false]].forEach(([base, amp, f, ph, c1, c2, snow], li) => {
    const P = ridge(base, amp, f, ph); g.beginPath(); g.moveTo(L0, H); P.forEach(([x, y]) => g.lineTo(x, y)); g.lineTo(L1, H); g.closePath(); g.fillStyle = lg(base - amp, base + 80, c2, c1); g.fill();
    if (snow) { g.save(); g.clip(); for (let i = 2; i < P.length - 2; i++) { const [x, y] = P[i]; if (y < P[i - 1][1] && y < P[i + 1][1] && y < base - amp * 0.55) { g.fillStyle = 'rgba(255,248,255,.75)'; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 16, y + 14); g.quadraticCurveTo(x - 6, y + 9, x - 2, y + 15); g.quadraticCurveTo(x + 4, y + 9, x + 15, y + 13); g.closePath(); g.fill(); } } g.restore(); }
    const hz = g.createLinearGradient(0, base - 10, 0, base + 40); hz.addColorStop(0, 'rgba(255,214,200,0)'); hz.addColorStop(1, 'rgba(255,214,200,.55)'); g.fillStyle = hz; g.fillRect(L0, base - 10, TBG_W, 60); });
  /* 양옆 숲 언덕 */
  const tree = (x, y, s, col) => { g.fillStyle = ART.DK(col, 0.35); g.fillRect(x - 2 * s, y - 6 * s, 4 * s, 10 * s); g.fillStyle = col; [[0, -16, 11], [-7, -10, 8], [7, -10, 8]].forEach(([a, b, r]) => { g.beginPath(); g.arc(x + a * s, y + b * s, r * s, 0, TAU); g.fill(); }); g.fillStyle = ART.rgba('#fff2c8', 0.25); g.beginPath(); g.arc(x + 3 * s, y - 19 * s, 5 * s, 0, TAU); g.fill(); };
  const pine = (x, y, s, col) => { g.fillStyle = col; for (let q = 0; q < 3; q++) { g.beginPath(); g.moveTo(x, y - (34 - q * 9) * s); g.lineTo(x - (9 + q * 4) * s, y - (14 - q * 9) * s); g.lineTo(x + (9 + q * 4) * s, y - (14 - q * 9) * s); g.closePath(); g.fill(); } g.fillStyle = ART.DK(col, 0.4); g.fillRect(x - 1.5 * s, y - 6 * s, 3 * s, 7 * s); };
  /* v4.2 왼쪽 숲 언덕이 470에서 세로로 뚝 끊겨 보이던 것 → 성 언덕 아래로 부드럽게 내려가 이어지게 */
  g.beginPath(); g.moveTo(L0, H); g.lineTo(L0, 360); g.quadraticCurveTo(300, 300, 470, 372); g.quadraticCurveTo(540, 404, 640, 440); g.lineTo(640, H); g.closePath(); g.fillStyle = lg(300, 430, '#5f8a6a', '#3f6a55'); g.fill();
  [[880, 340, 1000, 335, L1, '#5f8a6a', '#3f6a55']].forEach(([x0, y0, mx, my, x1, a, b]) => { g.beginPath(); g.moveTo(x0 - 120, H); g.quadraticCurveTo(x0 - 60, y0 + 30, x0, y0); g.quadraticCurveTo(mx, my - 40, x1, y0 + 20); g.lineTo(x1, H); g.closePath(); g.fillStyle = lg(my - 40, 430, a, b); g.fill(); });
  for (let k = 0; k < 26; k++) { const x = L0 + 10 + R() * 480, y = 352 + R() * 26; (k % 3 ? tree : pine)(x, y, 0.8 + R() * 0.5, k % 2 ? '#4e7d5c' : '#5b8f63'); }
  for (let k = 0; k < 22; k++) { const x = 900 + R() * 390, y = 340 + R() * 30; (k % 3 ? pine : tree)(x, y, 0.8 + R() * 0.5, k % 2 ? '#4e7d5c' : '#5b8f63'); }
  /* 성이 있는 큰 언덕 (뒤에서 빛을 받아 윗부분이 금빛) */
  g.beginPath(); g.moveTo(380, H); g.bezierCurveTo(420, 372, 490, 304, 590, 301); g.lineTo(870, 299); g.bezierCurveTo(950, 300, 1000, 352, 1090, 404); g.lineTo(1090, H); g.closePath(); /* v4.2 성 아래 언덕 윗면을 넓혀 성 양끝·그림자가 하늘 위에 뜨지 않게 */ g.fillStyle = lg(296, 470, '#9fd47a', '#4a8e4a'); g.fill();
  g.save(); g.clip(); { const rim = g.createLinearGradient(0, 296, 0, 330); rim.addColorStop(0, 'rgba(255,236,170,.75)'); rim.addColorStop(1, 'rgba(255,236,170,0)'); g.fillStyle = rim; g.fillRect(380, 290, 710, 50); }
    for (let k = 0; k < 420; k++) { const x = 420 + R() * 660, y = 305 + R() * 230; g.strokeStyle = R() < 0.5 ? 'rgba(40,90,40,.18)' : 'rgba(220,255,180,.18)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (R() - 0.5) * 3, y - 4 - R() * 4); g.stroke(); } g.restore();
  /* 멍멍성 */
  const cx = 730, by = 312;
  const stone = (x, y, w, h, light) => { g.fillStyle = ART.lgr(g, light ? '#fffaf0' : '#f2e6d2', light ? '#e8d6b8' : '#cdb795', x, 0, x + w, 0); g.fillRect(x, y, w, h); g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.strokeStyle = 'rgba(150,120,90,.28)'; g.lineWidth = 0.8; for (let r = 0; r * 9 < h; r++) { g.beginPath(); g.moveTo(x, y + r * 9); g.lineTo(x + w, y + r * 9); g.stroke(); for (let q = (r % 2) * 9; q < w; q += 18) { g.beginPath(); g.moveTo(x + q, y + r * 9); g.lineTo(x + q, y + r * 9 + 9); g.stroke(); } } const sh = g.createLinearGradient(x, 0, x + w, 0); sh.addColorStop(0, 'rgba(255,255,255,.18)'); sh.addColorStop(0.6, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(90,60,90,.22)'); g.fillStyle = sh; g.fillRect(x, y, w, h); const ao = g.createLinearGradient(0, y + h - 18, 0, y + h); ao.addColorStop(0, 'rgba(80,60,40,0)'); ao.addColorStop(1, 'rgba(80,60,40,.25)'); g.fillStyle = ao; g.fillRect(x, y + h - 18, w, 18); g.restore(); g.strokeStyle = 'rgba(110,80,60,.75)'; g.lineWidth = 1.4; g.strokeRect(x, y, w, h); };
  const crenel = (x, y, w) => { for (let q = 0; q + 7 <= w; q += 11) { g.fillStyle = '#f4e8d4'; g.fillRect(x + q + 1, y - 8, 7, 8); g.strokeStyle = 'rgba(110,80,60,.7)'; g.lineWidth = 1; g.strokeRect(x + q + 1, y - 8, 7, 8); } };
  const win = (x, y, w, h) => { g.save(); g.shadowColor = 'rgba(255,200,90,.9)'; g.shadowBlur = 10; ART.RR(g, x - w / 2, y, w, h, w / 2); g.fillStyle = ART.lgr(g, '#fff4c0', '#ffb24a', 0, y, 0, y + h); g.fill(); g.restore(); g.strokeStyle = '#7a5232'; g.lineWidth = 1.3; ART.RR(g, x - w / 2, y, w, h, w / 2); g.stroke(); g.beginPath(); g.moveTo(x, y + 2); g.lineTo(x, y + h); g.moveTo(x - w / 2, y + h * 0.55); g.lineTo(x + w / 2, y + h * 0.55); g.strokeStyle = 'rgba(122,82,50,.7)'; g.stroke(); g.fillStyle = '#8a6a4a'; g.fillRect(x - w / 2 - 2, y + h, w + 4, 2.5); };
  const roof = (x, y, w, h, flag) => { const l = x - w / 2 - 6, r = x + w / 2 + 6, top = y - h; g.beginPath(); g.moveTo(l, y); g.quadraticCurveTo(x - w * 0.22, y - h * 0.45, x, top); g.quadraticCurveTo(x + w * 0.22, y - h * 0.45, r, y); g.closePath(); const rg2 = g.createLinearGradient(l, 0, r, 0); rg2.addColorStop(0, '#7cc0ff'); rg2.addColorStop(0.45, '#3f7fd8'); rg2.addColorStop(1, '#1f3f8a'); g.fillStyle = rg2; g.fill();
    g.save(); g.clip(); g.strokeStyle = 'rgba(20,40,100,.35)'; g.lineWidth = 0.8; for (let yy = y - 4; yy > top; yy -= 7) for (let xx = l; xx < r; xx += 8) { g.beginPath(); g.arc(xx + ((y - yy) / 7 % 2) * 4, yy, 4, 0, Math.PI); g.stroke(); } const sh = g.createLinearGradient(l, 0, r, 0); sh.addColorStop(0, 'rgba(255,255,255,.25)'); sh.addColorStop(0.35, 'rgba(255,255,255,0)'); g.fillStyle = sh; g.fillRect(l, top, r - l, h); g.restore();
    g.strokeStyle = '#1a2f6a'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(l, y); g.quadraticCurveTo(x - w * 0.22, y - h * 0.45, x, top); g.quadraticCurveTo(x + w * 0.22, y - h * 0.45, r, y); g.closePath(); g.stroke();
    g.fillStyle = ART.lgr(g, '#fff0a0', '#c8901a', 0, y - 4, 0, y + 3); g.fillRect(l - 1, y - 3, r - l + 2, 5); g.strokeStyle = '#8a5a10'; g.lineWidth = 0.8; g.strokeRect(l - 1, y - 3, r - l + 2, 5);
    g.fillStyle = ART.lgr(g, '#fff6c0', '#c8901a', 0, top - 10, 0, top); g.beginPath(); g.arc(x, top - 3, 3.2, 0, TAU); g.fill(); g.beginPath(); g.moveTo(x - 1.2, top - 5); g.lineTo(x, top - 15); g.lineTo(x + 1.2, top - 5); g.fill();
    if (flag) { g.strokeStyle = '#5a3a22'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x, top - 12); g.lineTo(x, top - 38); g.stroke(); g.beginPath(); g.moveTo(x, top - 38); g.bezierCurveTo(x + 10, top - 42, x + 18, top - 32, x + 30, top - 34); g.lineTo(x + 24, top - 27); g.lineTo(x + 30, top - 20); g.bezierCurveTo(x + 18, top - 19, x + 10, top - 28, x, top - 24); g.closePath(); g.fillStyle = ART.lgr(g, '#ff6a6a', '#c8283a', 0, top - 40, 0, top - 20); g.fill(); g.strokeStyle = '#7a1020'; g.lineWidth = 0.8; g.stroke(); ART.paw(g, x + 13, top - 31, 0.42, '#ffe08a'); } };
  const tower = (x, w, h, rh, flag, wins) => { stone(x - w / 2, by - h, w, h); crenel(x - w / 2 - 2, by - h, w + 4); g.fillStyle = '#e8d8bc'; g.fillRect(x - w / 2 - 3, by - h - 2, w + 6, 4); roof(x, by - h - 2, w, rh, flag); for (let k = 0; k < (wins || 2); k++) { const wy = by - h + 22 + k * 32; if (wy + 16 < by - 18) win(x, wy, Math.min(12, w * 0.3), 16); } };
  g.save(); g.translate(cx, by); g.scale(0.86, 0.86); g.translate(-cx, -by); /* 성 전체를 0.86배 (위 무지개 뼈다귀와 안 겹치게) */
  /* 성 그림자 */ g.fillStyle = 'rgba(40,60,30,.28)'; g.beginPath(); g.ellipse(cx + 20, by + 6, 200, 14, 0, 0, TAU); g.fill();
  tower(cx - 160, 36, 98, 50, true, 2); tower(cx + 160, 36, 98, 50, true, 2);
  stone(cx - 152, by - 58, 304, 58, true); crenel(cx - 154, by - 58, 308);
  tower(cx - 100, 40, 140, 62, true, 3); tower(cx + 100, 40, 140, 62, true, 3);
  tower(cx - 50, 34, 158, 56, false, 3); tower(cx + 50, 34, 158, 56, false, 3);
  /* 가운데 큰 탑 + 할미 발코니(할미는 730,210에 섬) */
  stone(cx - 34, by - 196, 68, 196, true); crenel(cx - 36, by - 196, 72); g.fillStyle = '#e8d8bc'; g.fillRect(cx - 38, by - 198, 76, 4); roof(cx, by - 198, 68, 84, true);
  { g.save(); g.shadowColor = 'rgba(255,200,100,.9)'; g.shadowBlur = 16; ART.RR(g, cx - 17, 158, 34, 52, 17); g.fillStyle = ART.lgr(g, '#fff6d0', '#ffc860', 0, 158, 0, 210); g.fill(); g.restore(); g.strokeStyle = '#7a5232'; g.lineWidth = 1.6; ART.RR(g, cx - 17, 158, 34, 52, 17); g.stroke();
    g.beginPath(); g.moveTo(cx - 30, 210); g.lineTo(cx + 30, 210); g.lineTo(cx + 24, 222); g.quadraticCurveTo(cx, 230, cx - 24, 222); g.closePath(); g.fillStyle = ART.lgr(g, '#f6ead6', '#c8b090', 0, 210, 0, 228); g.fill(); g.strokeStyle = 'rgba(110,80,60,.8)'; g.lineWidth = 1.2; g.stroke();
    g.fillStyle = ART.lgr(g, '#fff0a0', '#c8901a', 0, 207, 0, 211); g.fillRect(cx - 31, 207, 62, 4); for (let q = -24; q <= 24; q += 8) { g.fillStyle = '#efe2cc'; g.fillRect(cx + q - 1.6, 211, 3.2, 8); } }
  win(cx, by - 120, 14, 20); win(cx, by - 82, 14, 20);
  /* 성문 */
  { const gx = cx, gy = by; g.fillStyle = '#efe2cc'; g.beginPath(); g.arc(gx, gy - 26, 26, Math.PI, 0); g.lineTo(gx + 26, gy); g.lineTo(gx - 26, gy); g.closePath(); g.fill(); g.strokeStyle = 'rgba(110,80,60,.8)'; g.lineWidth = 1.2; g.stroke(); for (let k = 0; k <= 8; k++) { const a = Math.PI + k / 8 * Math.PI; g.beginPath(); g.moveTo(gx + Math.cos(a) * 20, gy - 26 + Math.sin(a) * 20); g.lineTo(gx + Math.cos(a) * 26, gy - 26 + Math.sin(a) * 26); g.stroke(); }
    g.beginPath(); g.arc(gx, gy - 26, 20, Math.PI, 0); g.lineTo(gx + 20, gy); g.lineTo(gx - 20, gy); g.closePath(); g.fillStyle = ART.lgr(g, '#9a6234', '#5e3418', 0, gy - 46, 0, gy); g.fill(); g.save(); g.clip(); g.strokeStyle = 'rgba(40,20,5,.45)'; g.lineWidth = 1; for (let q = -20; q < 20; q += 6) { g.beginPath(); g.moveTo(gx + q, gy - 48); g.lineTo(gx + q, gy); g.stroke(); } g.fillStyle = '#c8a040'; [[-14, -30], [14, -30], [-14, -10], [14, -10]].forEach(([a, b]) => { g.fillRect(gx + a - 4, gy + b, 8, 2.5); }); g.restore();
    ART.paw(g, gx, gy - 58, 0.8, '#ffd34d'); }
  /* 벽 깃발(현수막) */
  [cx - 76, cx + 76].forEach(x => { g.fillStyle = ART.lgr(g, '#e8323a', '#9a1828', 0, by - 52, 0, by - 14); g.beginPath(); g.moveTo(x - 9, by - 52); g.lineTo(x + 9, by - 52); g.lineTo(x + 9, by - 18); g.lineTo(x, by - 24); g.lineTo(x - 9, by - 18); g.closePath(); g.fill(); g.fillStyle = '#c8901a'; g.fillRect(x - 10, by - 54, 20, 3); ART.paw(g, x, by - 38, 0.45, '#ffe08a'); });
  /* 성 테두리 빛 (뒤에서 비추는 노을) */
  g.save(); g.globalCompositeOperation = 'screen'; { const gr = g.createRadialGradient(cx + 40, 120, 20, cx + 40, 160, 260); gr.addColorStop(0, 'rgba(255,220,170,.35)'); gr.addColorStop(1, 'rgba(255,220,170,0)'); g.fillStyle = gr; g.fillRect(cx - 260, 0, 520, by); } g.restore();
  g.restore();
  /* 성 아래 마을 · 가로등 길 */
  const house = (x, y, s, rc) => { g.fillStyle = 'rgba(30,50,20,.22)'; g.beginPath(); g.ellipse(x, y + 1, 16 * s, 3 * s, 0, 0, TAU); g.fill(); g.fillStyle = ART.lgr(g, '#fff6e6', '#dcc6a6', x - 12 * s, 0, x + 12 * s, 0); g.fillRect(x - 12 * s, y - 16 * s, 24 * s, 16 * s); g.strokeStyle = 'rgba(110,80,60,.7)'; g.lineWidth = 1; g.strokeRect(x - 12 * s, y - 16 * s, 24 * s, 16 * s); g.beginPath(); g.moveTo(x - 16 * s, y - 15 * s); g.lineTo(x, y - 30 * s); g.lineTo(x + 16 * s, y - 15 * s); g.closePath(); g.fillStyle = ART.lgr(g, ART.LI(rc, 0.25), ART.DK(rc, 0.2), x - 16 * s, 0, x + 16 * s, 0); g.fill(); g.stroke(); g.save(); g.shadowColor = 'rgba(255,200,90,.9)'; g.shadowBlur = 6; g.fillStyle = '#ffd47a'; g.fillRect(x - 7 * s, y - 11 * s, 5 * s, 5 * s); g.fillRect(x + 2 * s, y - 11 * s, 5 * s, 5 * s); g.restore(); g.fillStyle = '#8a5a32'; g.fillRect(x - 2.5 * s, y - 7 * s, 5 * s, 7 * s); };
  [[560, 360, 0.95, '#e8705a'], [600, 340, 0.8, '#5aa0e8'], [890, 352, 0.9, '#e8a03a'], [930, 372, 1, '#8a6ad8'], [520, 392, 1.1, '#5ac08a'], [980, 400, 1.05, '#e8705a']].forEach(a => house(...a));
  for (let k = 0; k < 14; k++) { const x = 470 + R() * 560, y = 330 + R() * 90; if (Math.abs(x - cx) < 190 && y < 360) continue; (k % 2 ? tree : pine)(x, y, 0.75 + R() * 0.35, k % 3 ? '#4f9a50' : '#3f8a48'); }
  g.beginPath(); g.moveTo(cx - 20, by + 2); g.bezierCurveTo(cx - 50, 360, 560, 380, 470, H); g.lineTo(580, H); g.bezierCurveTo(610, 404, cx - 6, 362, cx + 20, by + 2); g.closePath(); g.fillStyle = lg(by, H, '#f6e2b8', '#d8b884'); g.fill(); g.strokeStyle = 'rgba(160,120,70,.5)'; g.lineWidth = 1.2; g.stroke();
  g.save(); g.clip(); for (let k = 0; k < 70; k++) { const t2 = R(), x = (1 - t2) * cx + t2 * 525 + (R() - 0.5) * 40 * (0.3 + t2), y = by + t2 * (H - by); g.fillStyle = `rgba(150,110,70,${0.15 + R() * 0.2})`; g.beginPath(); g.ellipse(x, y, (2 + t2 * 6) * (0.6 + R() * 0.5), (1 + t2 * 3) * 0.7, 0, 0, TAU); g.fill(); } g.restore();
  [[0.2, -1], [0.42, 1], [0.66, -1]].forEach(([t2, side]) => { const x = (1 - t2) * cx + t2 * 525 + side * (14 + t2 * 40), y = by + t2 * (H - by) * 0.85, s = 0.7 + t2; g.strokeStyle = '#4a3a2a'; g.lineWidth = 2 * s; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - 30 * s); g.stroke(); g.save(); g.shadowColor = 'rgba(255,210,120,1)'; g.shadowBlur = 14; g.fillStyle = '#ffe8a0'; ART.RR(g, x - 4 * s, y - 38 * s, 8 * s, 9 * s, 2 * s); g.fill(); g.restore(); g.fillStyle = '#4a3a2a'; g.fillRect(x - 5 * s, y - 39 * s, 10 * s, 2 * s); });
  /* 앞 꽃밭 */
  g.beginPath(); g.moveTo(L0, 418); g.quadraticCurveTo(300, 386, 600, 404); g.quadraticCurveTo(820, 414, L1, 398); g.lineTo(L1, H); g.lineTo(L0, H); g.closePath(); g.fillStyle = lg(392, H, '#a8de80', '#4f9c48'); g.fill();
  g.save(); g.clip(); for (let k = 0; k < 900; k++) { const x = L0 + R() * TBG_W, y = 400 + R() * 140; g.strokeStyle = R() < 0.5 ? 'rgba(40,100,40,.25)' : 'rgba(230,255,190,.22)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 1, y - 4, x + (R() - 0.5) * 4, y - 6 - R() * 5); g.stroke(); }
    for (let k = 0; k < 260; k++) { const x = L0 + R() * TBG_W, y = 408 + R() * 130, r = 1.2 + R() * 2 * (y - 380) / 160; g.fillStyle = ['#ffffff', '#ffd34d', '#ff9ec4', '#bfe6ff', '#ffb070'][k % 5]; g.globalAlpha = 0.9; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,240,160,.9)'; g.beginPath(); g.arc(x, y, r * 0.35, 0, TAU); g.fill(); } g.globalAlpha = 1; g.restore();
  /* 글자 자리 은은한 크림 번짐 */
  { const lg2 = g.createLinearGradient(L0, 0, 480, 0); lg2.addColorStop(0, 'rgba(255,246,228,.5)'); lg2.addColorStop(0.75, 'rgba(255,246,228,.22)'); lg2.addColorStop(1, 'rgba(255,246,228,0)'); g.fillStyle = lg2; g.fillRect(L0, 0, 480 - L0, H); }
  /* 빛줄기 */
  g.save(); g.globalCompositeOperation = 'screen'; for (let k = 0; k < 7; k++) { const a = -0.6 + k * 0.18, gr = g.createLinearGradient(730, 0, 730 + Math.sin(a) * 600, 560); gr.addColorStop(0, 'rgba(255,240,200,.2)'); gr.addColorStop(1, 'rgba(255,240,200,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(730, -20); g.lineTo(730 + Math.sin(a - 0.04) * 900, 600); g.lineTo(730 + Math.sin(a + 0.04) * 900, 600); g.closePath(); g.fill(); } g.restore();
  /* 흐린 앞 꽃 (깊이감) */
  { const fl = ART.mk(TBG_W, H), f = fl.getContext('2d'); f.translate(TBG_X, 0); let s2 = 77; const Q = () => { s2 = (s2 * 16807) % 2147483647; return s2 / 2147483647; };
    for (let k = 0; k < 34; k++) { const side = k % 2, x = side ? L1 - Q() * 260 : L0 + Q() * 300, y = H - Q() * 70, r = 9 + Q() * 12, col = ['#ffb3c8', '#fff3a0', '#ffffff', '#c8b0ff'][k % 4];
      f.fillStyle = '#4a8a3a'; f.beginPath(); f.ellipse(x, y + r, r * 0.4, r * 1.4, side ? 0.4 : -0.4, 0, TAU); f.fill();
      for (let q = 0; q < 5; q++) { const a = q / 5 * TAU; f.fillStyle = col; f.beginPath(); f.ellipse(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6, r * 0.5, r * 0.32, a, 0, TAU); f.fill(); }
      f.fillStyle = '#ffcf40'; f.beginPath(); f.arc(x, y, r * 0.28, 0, TAU); f.fill(); }
    g.save(); g.filter = 'blur(3px)'; g.globalAlpha = 0.9; g.drawImage(fl, L0, 0, TBG_W, H); g.restore(); }
  /* 종이 결 · 비네트 */
  g.globalAlpha = 0.04; for (let k = 0; k < 400; k++) { g.fillStyle = k % 2 ? '#7a5230' : '#ffffff'; g.fillRect(L0 + R() * TBG_W, R() * H, 2 + R() * 5, 1); } g.globalAlpha = 1;
  { const v = g.createRadialGradient(W / 2, H * 0.45, H * 0.4, W / 2, H * 0.5, W * 0.72); v.addColorStop(0, 'rgba(30,15,50,0)'); v.addColorStop(1, 'rgba(30,15,50,.34)'); g.fillStyle = v; g.fillRect(L0, 0, TBG_W, H); }
  return c;
}
function drawStoryTitle(t) {
  TCX = 236;
  if (!titleBg) titleBg = buildTitleBg();
  ctx.drawImage(titleBg, -TBG_X, 0, TBG_W, H);
  // 무지개 뼈다귀 + 별뼈 별자리
  const bx = 730, byy = 40, got = Math.min(16, Math.floor(S.cleared / CHL));
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  ['#ff6b6b', '#ffb84d', '#ffe14a', '#6fd86a', '#5ab8ff', '#9b6bff'].forEach((c2, k) => { ctx.strokeStyle = ART.rgba(c2, 0.22); ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(bx, byy + 60, 70 - k * 6, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke(); });
  ctx.globalAlpha = 0.35 + Math.sin(t * 2) * 0.12; ctx.drawImage(ART.softDot('#fff3c0'), bx - 60, byy - 40, 120, 80); ctx.restore();
  ART.bone(ctx, bx, byy, 54, '#fffaf0', Math.sin(t * 0.8) * 0.08);
  for (let k = 0; k < 16; k++) { const a = -Math.PI + (k + 0.5) / 16 * Math.PI, x = bx + Math.cos(a) * 150, y = byy + 30 + Math.sin(a) * 74, on = k < got; ctx.globalAlpha = on ? 0.95 : 0.35; ART.bone(ctx, x, y, on ? 14 : 11, on ? '#ffe9a0' : '#c8c0e0', a + Math.PI / 2); if (on) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.4 + Math.sin(t * 3 + k) * 0.3; ctx.drawImage(ART.softDot('#ffe9a0'), x - 12, y - 12, 24, 24); ctx.restore(); } }
  ctx.globalAlpha = 1;
  // 할미가 발코니에서 손 흔들기
  ART.draw(ctx, 'granny', Math.floor(t * 2) % 2 ? 'c_happy' : 'i0', 730, 224, 0.37, true, 0); /* v3.8 새 성 발코니 위치 */
  // 깃발 반짝
  // 기사단 (해금된 동료만)
  /* v4.2 기사단 10마리 모두 (뒷줄 5 · 앞줄 5, 잠긴 동료도 「함께」 보여 줌) */
  const crew = [['u4', 462, 446], ['u1', 524, 440], ['u3', 588, 446], ['u7', 772, 444], ['u2', 836, 440], ['u8', 912, 446], ['u9', 486, 488], ['u0', 556, 482], ['u6', 790, 486], ['u5', 862, 490]];
  crew.forEach(([id, x, y], i) => { ctx.fillStyle = 'rgba(30,40,0,.22)'; ART.E(ctx, x, y + 2, 18, 4); ctx.fill(); ART.draw(ctx, id, (t + i * 0.7) % 3 < 0.5 ? 'c_happy' : 'i' + (Math.floor(t * 2.4 + i) % 3), x, y + Math.max(0, Math.sin(t * 4 + i)) * -3, 0.82, x > 700, 0); });
  // 주인공 + 미르
  const hk0 = (t % 3.4) < 0.4 ? 'a' + Math.min(7, Math.floor((t % 3.4) / 0.4 * 8)) : 'i' + (Math.floor(t * 2.4) % 3);
  ctx.fillStyle = 'rgba(30,40,0,.25)'; ART.E(ctx, 680, 502, 90, 10); ctx.fill();
  ART.draw(ctx, heroType(), hk0, 670, 500, mounted() ? mountK() * 1.25 : 1.8, false, 0);
  // 꽃잎
  ctx.save(); for (let k = 0; k < 16; k++) { const ph = (t * 0.08 + k * 0.137) % 1, x = (k * 131 + t * 30) % (W + 60) - 30, y = ph * H; ctx.globalAlpha = 0.7; ctx.fillStyle = k % 3 ? '#ffc2d8' : '#fff3b0'; ctx.save(); ctx.translate(x, y); ctx.rotate(t + k); ART.E(ctx, 0, 0, 4, 2.2); ctx.fill(); ctx.restore(); } ctx.restore();
  // 로고 + 시즌 리본 + 주제
  const L = ART.logo(), lw = 410, lh = lw * L.height / L.width, ly = 14 + Math.sin(t * 2) * 4;
  ctx.drawImage(L, TCX - lw / 2, ly, lw, lh);
  const sn = SEASON_N[S.cleared >= 380 ? 14 : S.cleared >= 360 ? 13 : S.cleared >= 340 ? 12 : S.cleared >= 320 ? 11 : S.cleared >= 300 ? 10 : S.cleared >= 280 ? 9 : S.cleared >= 260 ? 8 : S.cleared >= 240 ? 7 : S.cleared >= 200 ? 6 : S.cleared >= 180 ? 5 : S.cleared >= 160 ? 4 : S.cleared >= 140 ? 3 : S.cleared >= 120 ? 2 : S.cleared >= 100 ? 1 : 0];
  ctx.font = `bold 15px ${FONT}`; const sw2 = ctx.measureText(sn).width + 40;
  ART.RR(ctx, TCX - sw2 / 2, ly + lh + 2, sw2, 28, 14); ctx.fillStyle = ART.lgr(ctx, '#e0623a', '#b4401f', 0, ly + lh, 0, ly + lh + 30); ctx.fill(); ctx.strokeStyle = '#5a2410'; ctx.lineWidth = 2; ctx.stroke();
  txt(sn, TCX, ly + lh + 16, 15, '#fff3c4', 'center', false);
  { const sk = seasonNow(); if (sk) { const Z = SEASONS[sk]; ctx.font = `bold 14px ${FONT}`; const w3 = ctx.measureText(Z.n + ' 진행 중!').width + 44; ART.RR(ctx, TCX - w3 / 2, ly + lh + 72, w3, 26, 13); ctx.fillStyle = Z.c; ctx.fill(); txt('★ ' + Z.n + ' 진행 중!', TCX, ly + lh + 85, 14, '#fff', 'center'); } drawSeasonGarland(4); }
  { /* v3.8 주제 문구를 금테 두루마리 위에 */ const ty = ly + lh + 50, msg = '혼자 짖으면 소리, 함께 짖으면 노래!'; ctx.font = `bold 16px ${FONT}`; const tw = ctx.measureText(msg).width + 56, x0 = TCX - tw / 2;
    ctx.save(); ctx.shadowColor = 'rgba(60,30,10,.35)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3; ART.RR(ctx, x0, ty - 16, tw, 32, 8); ctx.fillStyle = ART.lgr(ctx, '#fffaf0', '#f2dcb4', 0, ty - 16, 0, ty + 16); ctx.fill(); ctx.restore();
    ART.RR(ctx, x0, ty - 16, tw, 32, 8); ctx.lineWidth = 2; ctx.strokeStyle = '#c8901a'; ctx.stroke(); ART.RR(ctx, x0 + 4, ty - 12, tw - 8, 24, 6); ctx.lineWidth = 0.8; ctx.strokeStyle = 'rgba(200,144,26,.6)'; ctx.stroke();
    [x0, x0 + tw].forEach((ex, k) => { const d = k ? 1 : -1; ctx.fillStyle = ART.lgr(ctx, '#f6e2bc', '#d8b884', 0, ty - 16, 0, ty + 16); ctx.beginPath(); ctx.ellipse(ex + d * 2, ty, 7, 16, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = '#c8901a'; ctx.lineWidth = 1.6; ctx.stroke(); ctx.beginPath(); ctx.ellipse(ex + d * 2, ty, 3, 9, 0, 0, TAU); ctx.strokeStyle = 'rgba(160,110,40,.6)'; ctx.lineWidth = 1; ctx.stroke(); });
    ART.paw(ctx, x0 + 16, ty, 0.5, '#e8a040'); ART.paw(ctx, x0 + tw - 16, ty, 0.5, '#e8a040'); txt(msg, TCX, ty + 0.5, 16, '#6a3a1a', 'center', false); }
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 6; k++) { const ph = (t * 0.7 + k * 0.37) % 1, x = TCX - 180 + ((k * 97) % 360), y = ly + 30 + ((k * 53) % 100); ctx.globalAlpha = Math.sin(ph * Math.PI) * 0.8; ART.star(ctx, x, y, 7 * Math.sin(ph * Math.PI), '#ffe9a0', 0.25); }
  ctx.restore();
  txt('v' + VERSION, 14, H - 12, 12, 'rgba(90,52,18,.7)', 'left', false);
}
function drawTitle() {
  const t = G.time, tim = AP.title;
  if (tim) {
    TCX = 222;
    const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#fdf8ee'); bg.addColorStop(1, '#efe0c2'); ctx.fillStyle = bg; ctx.fillRect(-OX, 0, VW, H);
    // 수채 번짐
    ctx.save(); ctx.globalAlpha = 0.5; [[90, 120, 180, '#bfe0f2'], [330, 420, 220, '#f6d8a8'], [180, 520, 200, '#cfe6c4'], [40, 330, 140, '#f3c9c9']].forEach(([x, y, r, c]) => { const gr = ctx.createRadialGradient(x, y, 4, x, y, r); gr.addColorStop(0, ART.rgba(c, 0.55)); gr.addColorStop(1, ART.rgba(c, 0)); ctx.fillStyle = gr; ctx.fillRect(x - r, y - r, r * 2, r * 2); }); ctx.restore();
    const sz = H + 24, ix = W - sz + 12, iy = -12 + Math.sin(t * 0.6) * 3;
    ctx.drawImage(tim, ix, iy, sz, sz);
    const fe = ctx.createLinearGradient(ix, 0, ix + 170, 0); fe.addColorStop(0, '#f8efdc'); fe.addColorStop(1, 'rgba(248,239,220,0)'); ctx.fillStyle = fe; ctx.fillRect(ix - 2, 0, 172, H);
    const fb = ctx.createLinearGradient(0, H - 70, 0, H); fb.addColorStop(0, 'rgba(239,224,194,0)'); fb.addColorStop(1, '#efe0c2'); ctx.fillStyle = fb; ctx.fillRect(ix, H - 70, sz, 70);
    // 종이 결
    ctx.save(); ctx.globalAlpha = 0.05; for (let k = 0; k < 140; k++) { ctx.fillStyle = k % 2 ? '#7a5230' : '#ffffff'; ctx.fillRect((k * 173) % W, (k * 97) % H, 3 + (k % 5), 1); } ctx.restore();
    const L = ART.logo(), lw = 420, lh = lw * L.height / L.width, ly = 18 + Math.sin(t * 2) * 4;
    ctx.drawImage(L, TCX - lw / 2, ly, lw, lh);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 6; k++) { const ph = (t * 0.7 + k * 0.37) % 1, x = TCX - 180 + ((k * 97) % 360), y = ly + 30 + ((k * 53) % 110); ctx.globalAlpha = Math.sin(ph * Math.PI) * 0.8; ART.star(ctx, x, y, 7 * Math.sin(ph * Math.PI), '#ffe9a0', 0.25); }
    ctx.restore();
    ctx.save(); ctx.globalAlpha = 0.9; [['u0', 70], ['u2', 140], ['u1', 300], ['u3', 372]].forEach(([id, x], i) => { if (i < 3 || S.cleared >= 3) { ctx.fillStyle = 'rgba(80,50,20,.18)'; ART.E(ctx, x, 392, 18, 4); ctx.fill(); ART.draw(ctx, id, 'w' + (Math.floor(t * 8 + i) % 6), x, 390, 0.95, i >= 2, 0); } }); ctx.restore();
    ctx.fillStyle = 'rgba(80,50,20,.2)'; ART.E(ctx, TCX, 394, 44, 7); ctx.fill();
    const hk0 = (t % 3) < 0.3 ? 'a' + Math.min(7, Math.floor((t % 3) / 0.3 * 8)) : 'i' + (Math.floor(t * 2.4) % 3);
    ART.draw(ctx, heroType(), hk0, TCX, 392, mounted() ? mountK() : 1.4, false, 0);
    txt('v' + VERSION, 14, H - 12, 12, 'rgba(90,52,18,.7)', 'left', false);
  } else {
  drawStoryTitle(t);
  }
  // 스프라이트 미리 굽기 (프레임당 조금씩)
  if (!warmQ) warmQ = [heroType(), 'u0', 'u1', 'u2', 'u3', 'u4', 'slime', 'rat', 'toad', 'bat', 'wolf', 'golem'];
  if (warmQ.length) { if (ART.warm([warmQ[0]], 6)) warmQ.shift(); }
  if (!titleReady) {
    if (Math.floor(t * 2) % 2 === 0) txt('화면을 터치하세요', TCX, 478, 26, '#fff8e1', 'center');
    sceneTap = () => { titleReady = true; };
    return;
  }
  /* v4.6 주제곡 가사 표시 없앰 */
  btn(TCX - 120, 474, 240, 56, '게임 시작', () => go(() => { if (!S.custom) openCreator(() => setScene('map'), true); else setScene('map'); }), { bg: '#5cc96b', size: 24 });
  btn(W - 132, 478, 118, 44, S.music ? '♪ 음악 ON' : '♪ 음악 OFF', () => { S.music = !S.music; applyAudioPrefs(); save(); }, { bg: S.music ? '#ffb84d' : '#a99a8a', size: 15 });
}
function drawLyrics(y, cx, pw) {
  cx = cx || W / 2; pw = pw || 600;
  const L = AUD.lyric();
  ctx.globalAlpha = 0.9; ART.panel(ctx, cx - pw / 2, y, pw, 62, 'dark'); ctx.globalAlpha = 1;
  txt('♪ 함께 짖으면 노래가 돼 (주제가)', cx - pw / 2 + 16, y + 13, 12, '#ffcf5a', 'left', false);
  if (!L) { txt(S.music ? '노래 준비 중...' : '음악이 꺼져 있어요', cx, y + 38, 18, '#fff', 'center', false); return; }
  if (L.intro) { txt('♪ ♪ ♪', cx, y + 38, 22, '#fff', 'center', false); return; }
  const s = L.text || AUD.LYRICS[L.line]; ctx.font = `bold ${pw < 500 ? 21 : 24}px ${FONT}`;
  const total = ctx.measureText(s).width; let x = cx - total / 2, sung = 0;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  for (const ch of s) {
    const isH = /[가-힣]/.test(ch); const w = ctx.measureText(ch).width;
    let col = '#ffffff';
    if (isH) { sung++; if (sung <= L.done) col = '#ffd54f'; }
    const pop = isH && sung === L.done ? L.pulse * 4 : 0;
    ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(40,15,0,.9)'; ctx.lineJoin = 'round'; ctx.strokeText(ch, x, y + 38 - pop); ctx.fillStyle = col; ctx.fillText(ch, x, y + 38 - pop);
    x += w;
  }
}

/* ---------------- 지도 (드래그 월드맵) ---------------- */
let mapBg = null, mapX = null, mapTX = 0;
// v1.6 색깔 조각 7개 (시즌 8~): at = 그 스테이지를 깨면 얻음 (아직 없는 시즌은 999)
const SHARDS = [
  { n: '빨강', m: '용기', c: '#ff6a7a', at: 250, by: '칠색 거북 무지' }, { n: '주황', m: '따뜻함', c: '#ffa04a', at: 260, by: '그림자 아이 노을' },
  { n: '노랑', m: '웃음', c: '#ffd83a', at: 280, by: '메아리 요정 되울이' }, { n: '초록', m: '자람', c: '#6ad06a', at: 300, by: '상인 여우 짤랑이' },
  { n: '파랑', m: '고요함', c: '#4ab0ff', at: 320, by: '큰 뿔 사슴 새벽' }, { n: '남색', m: '두려움', c: '#6a6aff', at: 340, by: '바람 장로 용 하늬' }, { n: '보라', m: '꿈', c: '#b86aff', at: 360, by: '꿈꾸는 노래 고래 나루' }];
const shardsOwned = () => SHARDS.filter(q => S.cleared >= q.at).length;
const BRW = 460;
const ZW = 600, MAPW = 24 + CHN * ZW + 20 + BRW, MS = 1.25, NODES = [];
// v1.0: 정돈된 지도 — 왕국 전체를 잇는 하나의 부드러운 물결 길 (스테이지 간격 일정, 장 사이도 끊김 없이 이어짐)
for (let n = 1; n <= MAXST; n++) {
  const k = n - 1, z = Math.floor(k / CHL), A = 88 + 16 * Math.sin(n * 0.13);
  NODES.push({ n, z, x: 24 + ZW / 20 + k * ZW / CHL, y: 326 + A * Math.sin(k * 0.82 + 0.4) });
}
const clampMap = v => clamp(v, 0, MAPW - W);
function mapLandmark(g, kind, x, y) {
  const E2 = (a, b, rx, ry) => ART.E(g, a, b, rx, ry), L = ART.lgr;
  g.save(); g.translate(x, y); g.lineJoin = 'round';
  const out = c => { g.strokeStyle = c || 'rgba(50,25,10,.7)'; g.lineWidth = 1.6; g.stroke(); };
  if (kind === 'meadow') { // 풍차
    g.beginPath(); g.moveTo(-16, 40); g.lineTo(-10, -20); g.lineTo(10, -20); g.lineTo(16, 40); g.closePath(); g.fillStyle = L(g, '#fff3d6', '#d9b48a', -16, 0, 16, 0); g.fill(); out();
    g.beginPath(); g.moveTo(-14, -20); g.lineTo(0, -38); g.lineTo(14, -20); g.closePath(); g.fillStyle = '#c0503a'; g.fill(); out();
    RR2(g, -5, 22, 10, 18, 4, '#7a4a2a'); E2(0, 2, 4, 4); g.fillStyle = '#8fd3ff'; g.fill(); out();
    g.save(); g.translate(0, -18); g.rotate(0.4); for (let k = 0; k < 4; k++) { g.rotate(Math.PI / 2); g.fillStyle = '#fffaf0'; g.fillRect(-3, -48, 6, 44); g.strokeStyle = '#8a6040'; g.lineWidth = 1; g.strokeRect(-3, -48, 6, 44); for (let q = 0; q < 4; q++) { g.beginPath(); g.moveTo(-3, -44 + q * 10); g.lineTo(3, -44 + q * 10); g.stroke(); } } g.restore();
    E2(0, -18, 3.5, 3.5); g.fillStyle = '#5a3a20'; g.fill();
  } else if (kind === 'forest') { // 천 년 참나무
    g.fillStyle = L(g, '#6b4426', '#3a2412', -14, 0, 14, 0); g.beginPath(); g.moveTo(-14, 44); g.quadraticCurveTo(-8, 0, -10, -20); g.lineTo(10, -20); g.quadraticCurveTo(8, 0, 16, 44); g.closePath(); g.fill(); out();
    [[0, -46, 40], [-30, -28, 26], [30, -26, 28], [-14, -64, 24], [18, -60, 22]].forEach(([a, b, r]) => { E2(a, b, r, r * 0.8); g.fillStyle = ART.rg(g, '#3f9a4a', a, b, r, 0.35, 0.2); g.fill(); out('rgba(20,60,20,.5)'); });
    for (let k = 0; k < 8; k++) { E2(-24 + (k * 13) % 50, -60 + (k * 17) % 50, 3, 3.6); g.fillStyle = '#8b5a2b'; g.fill(); }
    RR2(g, -6, 20, 12, 22, 6, '#2a1608');
  } else if (kind === 'desert') { // 피라미드
    g.beginPath(); g.moveTo(-60, 40); g.lineTo(0, -40); g.lineTo(60, 40); g.closePath(); g.fillStyle = L(g, '#f7d08a', '#c9914b', -60, 0, 60, 0); g.fill(); out();
    g.beginPath(); g.moveTo(0, -40); g.lineTo(60, 40); g.lineTo(10, 40); g.closePath(); g.fillStyle = 'rgba(120,70,20,.25)'; g.fill();
    for (let k = 1; k < 6; k++) { g.beginPath(); g.moveTo(-60 + k * 12, 40 - k * 16); g.lineTo(60 - k * 12, 40 - k * 16); g.strokeStyle = 'rgba(120,70,20,.35)'; g.lineWidth = 1; g.stroke(); }
    E2(0, -6, 6, 5); g.fillStyle = '#5a3412'; g.fill(); E2(0, -6, 2.5, 3); g.fillStyle = '#ffd34d'; g.fill();
    g.fillStyle = '#4f8a3a'; RR2(g, 48, 8, 6, 30, 3, '#4f8a3a'); RR2(g, 40, 14, 6, 10, 3, '#4f8a3a');
  } else if (kind === 'snow') { // 얼음 등대
    g.beginPath(); g.moveTo(-14, 44); g.lineTo(-9, -36); g.lineTo(9, -36); g.lineTo(14, 44); g.closePath(); g.fillStyle = L(g, '#ffffff', '#b8d4ee', -14, 0, 14, 0); g.fill(); out();
    for (let k = 0; k < 3; k++) { g.fillStyle = '#5aa9f5'; g.beginPath(); g.moveTo(-12 + k * 0.8, 30 - k * 24); g.lineTo(12 - k * 0.8, 30 - k * 24); g.lineTo(11 - k * 0.8, 22 - k * 24); g.lineTo(-11 + k * 0.8, 22 - k * 24); g.fill(); }
    RR2(g, -12, -50, 24, 14, 4, '#3a5a7a'); g.globalCompositeOperation = 'lighter'; g.drawImage(ART.softDot('#fff6b0'), -40, -80, 80, 60); g.globalCompositeOperation = 'source-over';
    E2(0, -43, 6, 5); g.fillStyle = '#fff6b0'; g.fill(); g.beginPath(); g.moveTo(-14, -50); g.lineTo(0, -62); g.lineTo(14, -50); g.closePath(); g.fillStyle = '#d0e4f7'; g.fill(); out();
  } else if (kind === 'volcano') { // 송곳니 성채
    g.beginPath(); g.moveTo(-50, 44); g.lineTo(-30, -10); g.lineTo(-18, -10); g.lineTo(-10, -40); g.lineTo(10, -40); g.lineTo(18, -10); g.lineTo(30, -10); g.lineTo(50, 44); g.closePath(); g.fillStyle = L(g, '#4a2a35', '#24141a', 0, -40, 0, 44); g.fill(); out('#120808');
    g.fillStyle = '#e8e2d6'; [[-30, -10], [-10, -40], [10, -40], [30, -10]].forEach(([a, b]) => { g.beginPath(); g.moveTo(a - 4, b); g.lineTo(a, b - 14); g.lineTo(a + 4, b); g.fill(); });
    g.globalCompositeOperation = 'lighter'; g.drawImage(ART.softDot('#ff6a2a'), -30, -10, 60, 50); g.globalCompositeOperation = 'source-over'; RR2(g, -6, 20, 12, 24, 6, '#ff8a3d');
  } else if (kind === 'coast') { // 등대와 배
    g.beginPath(); g.moveTo(-50, 40); g.quadraticCurveTo(0, 28, 50, 40); g.lineTo(50, 46); g.lineTo(-50, 46); g.closePath(); g.fillStyle = '#4fa3d6'; g.fill();
    g.beginPath(); g.moveTo(-30, 30); g.lineTo(10, 30); g.lineTo(4, 40); g.lineTo(-24, 40); g.closePath(); g.fillStyle = '#8a5a35'; g.fill(); out();
    g.fillStyle = '#7a4a2a'; g.fillRect(-11, -24, 2.5, 54); g.beginPath(); g.moveTo(-8, -22); g.quadraticCurveTo(14, -8, -8, 24); g.closePath(); g.fillStyle = '#fffaf0'; g.fill(); out(); ART.paw(g, -2, 0, 0.8, '#ff7a45');
    g.beginPath(); g.moveTo(26, 40); g.lineTo(30, -22); g.lineTo(42, -22); g.lineTo(46, 40); g.closePath(); g.fillStyle = L(g, '#ffffff', '#e0c8a0', 26, 0, 46, 0); g.fill(); out(); g.fillStyle = '#e53935'; g.fillRect(28.5, 0, 16, 7); g.fillRect(27.5, 20, 18, 7);
    E2(36, -28, 7, 6); g.fillStyle = '#fff6b0'; g.fill(); out();
  } else if (kind === 'sky') { // 떠 있는 섬과 성
    g.beginPath(); g.moveTo(-46, 6); g.quadraticCurveTo(0, -4, 46, 6); g.quadraticCurveTo(20, 50, 0, 56); g.quadraticCurveTo(-20, 50, -46, 6); g.fillStyle = L(g, '#8a6a4a', '#4e3a2a', 0, 0, 0, 56); g.fill(); out();
    E2(0, 4, 46, 10); g.fillStyle = '#7fd06a'; g.fill();
    [[-18, 22], [18, 22], [0, 38]].forEach(([a, h]) => { g.fillStyle = '#eef2fd'; g.fillRect(a - 6, 2 - h, 12, h); g.beginPath(); g.moveTo(a - 9, 2 - h); g.lineTo(a, 2 - h - 16); g.lineTo(a + 9, 2 - h); g.fillStyle = '#5a7ae0'; g.fill(); });
    for (const [a, b, r] of [[-56, -20, 14], [50, -30, 12], [-40, 30, 10]]) { E2(a, b, r * 1.4, r * 0.8); g.fillStyle = '#ffffff'; g.fill(); }
  } else if (kind === 'crystal') { // 거대 수정
    [[0, 40, 90, 14, '#6fd8ff'], [-26, 40, 60, 10, '#b48cff'], [26, 40, 66, 11, '#7affd0'], [-44, 40, 34, 7, '#ff9be8']].forEach(([a, b, h, w, c]) => { g.beginPath(); g.moveTo(a - w, b); g.lineTo(a - w * 0.8, b - h * 0.75); g.lineTo(a, b - h); g.lineTo(a + w * 0.8, b - h * 0.75); g.lineTo(a + w, b); g.closePath(); g.fillStyle = L(g, ART.LI(c, 0.6), ART.DK(c, 0.35), a - w, 0, a + w, 0); g.fill(); out(ART.DK(c, 0.6)); g.beginPath(); g.moveTo(a - w * 0.8, b - h * 0.75); g.lineTo(a, b - h); g.lineTo(a - w * 0.1, b); g.lineTo(a - w, b); g.closePath(); g.fillStyle = 'rgba(255,255,255,.28)'; g.fill(); });
    g.globalCompositeOperation = 'lighter'; g.drawImage(ART.softDot('#9feaff'), -60, -70, 120, 120); g.globalCompositeOperation = 'source-over';
  } else if (kind === 'swamp') { // 죽은 나무와 달
    E2(30, -50, 18, 18); g.fillStyle = '#e8d8ff'; g.fill(); E2(38, -56, 16, 16); g.fillStyle = '#4a2a5e'; g.fill();
    g.strokeStyle = '#1a1022'; g.lineCap = 'round'; g.lineWidth = 7; g.beginPath(); g.moveTo(-6, 44); g.quadraticCurveTo(-2, 0, -10, -30); g.stroke(); g.lineWidth = 4; g.beginPath(); g.moveTo(-6, 0); g.quadraticCurveTo(14, -10, 22, -28); g.moveTo(-8, -14); g.quadraticCurveTo(-26, -20, -34, -36); g.moveTo(-10, -30); g.lineTo(-4, -46); g.stroke();
    for (let k = 0; k < 6; k++) { g.globalCompositeOperation = 'lighter'; g.drawImage(ART.softDot(k % 2 ? '#7affd0' : '#c56bff'), -40 + k * 14, 10 + (k % 3) * 10, 12, 12); } g.globalCompositeOperation = 'source-over';
  } else if (kind === 'starsea') { // 별빛 범선과 고래
    g.beginPath(); g.moveTo(-70, 30); g.quadraticCurveTo(-40, 6, 0, 10); g.quadraticCurveTo(40, 4, 60, 24); g.quadraticCurveTo(30, 44, -20, 42); g.quadraticCurveTo(-60, 40, -70, 30); g.fillStyle = L(g, '#4a5ac8', '#1a1e5a', 0, 4, 0, 44); g.fill(); out('#0d1040');
    for (let k = 0; k < 8; k++) ART.star(g, -50 + k * 13, 18 + (k % 3) * 6, 1.8, '#ffffff'); E2(44, 22, 2.6, 2.6); g.fillStyle = '#ff9ad8'; g.fill();
    g.beginPath(); g.moveTo(-20, 2); g.lineTo(30, 2); g.lineTo(22, 12); g.lineTo(-14, 12); g.closePath(); g.fillStyle = '#8a5a35'; g.fill(); out();
    g.fillStyle = '#6b4426'; g.fillRect(3, -54, 3, 56); g.beginPath(); g.moveTo(7, -52); g.quadraticCurveTo(34, -26, 7, -2); g.closePath(); g.fillStyle = '#fffaf0'; g.fill(); out(); ART.paw(g, 15, -26, 0.7, '#5a7ae0');
    g.globalCompositeOperation = 'lighter'; g.drawImage(ART.softDot('#9fd0ff'), -60, -60, 120, 100); g.globalCompositeOperation = 'source-over';
  } else if (kind === 'aurora') { // 오로라 신전
    g.save(); g.globalCompositeOperation = 'lighter'; for (let k = 0; k < 3; k++) { g.fillStyle = k % 2 ? 'rgba(120,255,200,.18)' : 'rgba(170,120,255,.15)'; g.beginPath(); g.moveTo(-80, -40 - k * 12); g.quadraticCurveTo(0, -80 - k * 10, 80, -44 - k * 12); g.lineTo(80, -20 - k * 12); g.quadraticCurveTo(0, -56 - k * 10, -80, -16 - k * 12); g.fill(); } g.restore();
    g.beginPath(); g.moveTo(-50, -10); g.lineTo(0, -40); g.lineTo(50, -10); g.closePath(); g.fillStyle = L(g, '#ffffff', '#c8d8e4', 0, -40, 0, -10); g.fill(); out('#5a7a8a');
    for (let k = 0; k < 5; k++) { g.fillStyle = L(g, '#ffffff', '#b8ccd8', 0, -10, 0, 34); g.fillRect(-42 + k * 20, -10, 8, 44); }
    g.fillStyle = '#e8eef4'; g.fillRect(-56, 32, 112, 8); g.strokeStyle = '#5a7a8a'; g.lineWidth = 1.2; g.strokeRect(-56, 32, 112, 8);
    ART.star(g, 0, -28, 5, '#9feaff');
  } else if (kind === 'mine') { // 광산 승강탑과 바퀴
    g.beginPath(); g.moveTo(-70, 44); g.quadraticCurveTo(-40, 0, 0, 4); g.quadraticCurveTo(40, 0, 70, 44); g.closePath(); g.fillStyle = L(g, '#7a5a42', '#3a2818', 0, 0, 0, 44); g.fill(); out();
    g.beginPath(); g.arc(-6, 44, 22, Math.PI, 0); g.fillStyle = '#1a1008'; g.fill(); RR2(g, -30, 18, 48, 6, 2, '#8a5a35');
    g.strokeStyle = '#6e4320'; g.lineWidth = 4; g.beginPath(); g.moveTo(20, 30); g.lineTo(32, -44); g.lineTo(44, 30); g.moveTo(24, 6); g.lineTo(40, 6); g.moveTo(27, -18); g.lineTo(37, -18); g.stroke();
    g.beginPath(); g.arc(32, -46, 12, 0, TAU); g.strokeStyle = '#3a2818'; g.lineWidth = 3; g.stroke(); for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(32, -46); g.lineTo(32 + Math.cos(k) * 12, -46 + Math.sin(k) * 12); g.lineWidth = 1.5; g.stroke(); }
    g.globalCompositeOperation = 'lighter'; g.drawImage(ART.softDot('#ffc66a'), -34, 14, 56, 40); [-46, 50].forEach(a => g.drawImage(ART.softDot('#ffd27a'), a - 10, 10, 20, 20)); g.globalCompositeOperation = 'source-over';
    [[-40, 30], [-20, 34]].forEach(([a, b]) => { g.beginPath(); g.moveTo(a - 3, b); g.lineTo(a, b - 6); g.lineTo(a + 3, b); g.fillStyle = '#7affd0'; g.fill(); });
  } else if (kind === 'fossil') { // 거대 화석 두개골
    g.beginPath(); g.moveTo(-60, 40); g.quadraticCurveTo(-64, -10, -20, -30); g.quadraticCurveTo(30, -44, 60, -6); g.lineTo(66, 18); g.quadraticCurveTo(40, 22, 20, 18); g.lineTo(10, 40); g.closePath(); g.fillStyle = L(g, '#fff4dc', '#c9b48e', 0, -40, 0, 40); g.fill(); out('#5a4a32');
    E2(-10, -6, 12, 10); g.fillStyle = '#3a2a1a'; g.fill(); E2(38, -10, 6, 4); g.fill();
    g.fillStyle = '#fffaf0'; for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(22 + k * 9, 18); g.lineTo(26 + k * 9, 28); g.lineTo(30 + k * 9, 18); g.fill(); }
    g.strokeStyle = '#5a4a32'; g.lineWidth = 3; g.beginPath(); g.moveTo(-30, -26); g.quadraticCurveTo(-44, -60, -26, -70); g.stroke();
    g.fillStyle = '#4a9a4a'; for (let k = 0; k < 7; k++) { ART.E(g, -56 + k * 18, 40, 9, 5); g.fill(); }
    g.globalCompositeOperation = 'lighter'; g.drawImage(ART.softDot('#ffef9a'), -24, -20, 28, 28); g.globalCompositeOperation = 'source-over';
  } else if (kind === 'rainbow') { // 무지개 다리
    ['#ff7a8a', '#ffb06a', '#ffe06a', '#8ae08a', '#6ac0ff', '#c88aff'].forEach((c, k) => { g.strokeStyle = c; g.lineWidth = 6; g.beginPath(); g.arc(0, 30, 58 - k * 6, Math.PI, TAU); g.stroke(); });
    [[-58, 30], [58, 30]].forEach(([x, y]) => { E2(x, y, 22, 11); g.fillStyle = '#ffffff'; g.fill(); out(); });
  } else if (kind === 'fieststad') { // 축제 경기장 + 풍선
    g.fillStyle = L(g, '#f0e0c0', '#c8a878', 0, -20, 0, 40); g.beginPath(); g.moveTo(-50, 40); g.lineTo(-44, -6); g.quadraticCurveTo(0, -26, 44, -6); g.lineTo(50, 40); g.closePath(); g.fill(); out();
    ['#ff7a8a', '#7ac8ff', '#ffd34d'].forEach((c, q) => { g.fillStyle = c; g.fillRect(-40, 2 + q * 8, 80, 4); });
    [[-30, -40, '#ff7a8a'], [-8, -50, '#ffd34d'], [16, -44, '#7ac8ff'], [34, -36, '#9ae08a']].forEach(([x, y, c]) => { g.strokeStyle = 'rgba(80,60,40,.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y + 9); g.lineTo(x * 0.6, -14); g.stroke(); E2(x, y, 7, 9); g.fillStyle = c; g.fill(); out(); });
  } else if (kind === 'toyland') { // 블록 탑 + 태엽 열쇠
    ['#ff7a8a', '#ffd34d', '#7ac8ff', '#9ae08a'].forEach((c, q) => { const bw = 36 - q * 5; g.fillStyle = c; g.fillRect(-bw / 2, 30 - (q + 1) * 18, bw, 17); g.strokeStyle = '#3a2a50'; g.lineWidth = 1.5; g.strokeRect(-bw / 2, 30 - (q + 1) * 18, bw, 17); });
    g.save(); g.translate(0, -48); g.rotate(G.time * 1.5); g.fillStyle = '#ffd34d'; g.fillRect(-1.5, -1.5, 14, 3); E2(14, -5, 5, 4); g.fill(); E2(14, 5, 5, 4); g.fill(); g.restore();
  } else if (kind === 'oldcatrep') { // 고양이 시계탑 (빛바랜 기억)
    g.fillStyle = L(g, '#e8d4b0', '#b89a70', 0, -40, 0, 40); RR(g, -14, -30, 28, 70, 4); g.fill(); out();
    g.fillStyle = '#a0603a'; g.beginPath(); g.moveTo(-18, -30); g.lineTo(0, -52); g.lineTo(18, -30); g.closePath(); g.fill(); out();
    g.beginPath(); g.moveTo(-12, -38); g.lineTo(-8, -50); g.lineTo(-4, -42); g.closePath(); g.fill(); g.beginPath(); g.moveTo(12, -38); g.lineTo(8, -50); g.lineTo(4, -42); g.closePath(); g.fill();
    E2(0, -12, 9, 9); g.fillStyle = '#fff8e0'; g.fill(); out(); g.strokeStyle = '#5a3a1a'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(0, -12); g.lineTo(0, -18); g.moveTo(0, -12); g.lineTo(5, -12); g.stroke();
  } else if (kind === 'lastgate') { // 노을 성문
    g.fillStyle = L(g, '#7a6878', '#3e3040', 0, -40, 0, 40); g.fillRect(-40, -30, 22, 70); g.fillRect(18, -30, 22, 70); g.beginPath(); g.moveTo(-18, -10); g.quadraticCurveTo(0, -36, 18, -10); g.lineTo(18, 0); g.quadraticCurveTo(0, -24, -18, 0); g.closePath(); g.fill(); out();
    g.fillStyle = '#ffd8a0'; g.fillRect(-2, -60, 3, 30); g.fillStyle = '#e8a07a'; g.beginPath(); g.moveTo(1, -60); g.lineTo(18, -54); g.lineTo(1, -48); g.closePath(); g.fill();
  } else if (kind === 'icehaven') { // 얼음 등대
    g.fillStyle = L(g, '#ffffff', '#c0dcf0', 0, -40, 0, 40); g.beginPath(); g.moveTo(-14, 40); g.lineTo(-9, -24); g.lineTo(9, -24); g.lineTo(14, 40); g.closePath(); g.fill(); out();
    g.fillStyle = '#e85a5a'; g.fillRect(-11, 0, 22, 8); g.fillRect(-12, 20, 24, 8); E2(0, -30, 12, 8); g.fillStyle = '#fff6a0'; g.fill(); out();
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.5 + Math.sin(G.time * 3) * 0.2; g.drawImage(ART.softDot('#fff6c0'), -30, -54, 60, 48); g.restore();
  } else if (kind === 'whalecave') { // 동굴 입구 + 고래 꼬리
    g.beginPath(); g.moveTo(-46, 40); g.quadraticCurveTo(-44, -30, 0, -34); g.quadraticCurveTo(44, -30, 46, 40); g.closePath(); g.fillStyle = L(g, '#5a5aa0', '#2a2a5a', 0, -34, 0, 40); g.fill(); out();
    E2(0, 18, 26, 22); g.fillStyle = '#14143a'; g.fill();
    g.fillStyle = '#7a8ad8'; g.beginPath(); g.moveTo(0, 8); g.quadraticCurveTo(-14, -6, -20, -2); g.quadraticCurveTo(-8, 4, 0, 14); g.quadraticCurveTo(8, 4, 20, -2); g.quadraticCurveTo(14, -6, 0, 8); g.fill();
    txt('♪', 22, -40 + Math.sin(G.time * 2) * 3, 16, '#e0d0ff', 'center', false);
  } else if (kind === 'windnest') { // 구름 위 큰 둥지와 알
    [[-40, 30, 30], [30, 32, 26], [0, 22, 34]].forEach(([x, y, r]) => { E2(x, y, r, r * 0.55); g.fillStyle = '#ffffff'; g.fill(); });
    E2(0, 8, 40, 14); g.fillStyle = '#b08a5a'; g.fill(); out(); E2(0, 4, 32, 9); g.fillStyle = '#d8b880'; g.fill();
    [[-12, '#f8f0e0'], [6, '#e8f4ff'], [18, '#fff0d8']].forEach(([x, c]) => { E2(x, -4, 8, 10); g.fillStyle = c; g.fill(); out(); });
  } else if (kind === 'stormcrown') { // 번개 왕관 봉우리
    g.beginPath(); g.moveTo(-50, 40); g.lineTo(-30, -10); g.lineTo(-18, -30); g.lineTo(-6, -8); g.lineTo(0, -40); g.lineTo(6, -8); g.lineTo(18, -30); g.lineTo(30, -10); g.lineTo(50, 40); g.closePath(); g.fillStyle = L(g, '#7a7aa0', '#3a3a58', 0, -40, 0, 40); g.fill(); out();
    g.strokeStyle = '#fff59d'; g.lineWidth = 3; g.beginPath(); g.moveTo(24, -60); g.lineTo(16, -44); g.lineTo(24, -44); g.lineTo(14, -26); g.stroke();
  } else if (kind === 'clockforest') { // 시계가 걸린 큰 나무
    g.fillStyle = '#3a2a1a'; g.fillRect(-7, -10, 14, 50); g.fillStyle = '#2e5a40'; E2(0, -24, 46, 34); g.fill(); out(); E2(-26, -6, 22, 16); g.fill(); E2(26, -8, 22, 16); g.fill();
    E2(0, -18, 12, 12); g.fillStyle = '#f0e8c8'; g.fill(); out(); g.strokeStyle = '#4a3020'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -18); g.lineTo(0, -26); g.moveTo(0, -18); g.lineTo(6, -16); g.stroke();
    g.save(); g.globalCompositeOperation = 'lighter'; g.drawImage(ART.softDot('#c8ffb0'), -40, -60, 30, 30); g.drawImage(ART.softDot('#c8ffb0'), 18, -50, 26, 26); g.restore();
  } else if (kind === 'dawngarden') { // 해시계와 첫 햇살
    g.save(); g.globalCompositeOperation = 'lighter'; g.drawImage(ART.softDot('#ffe0b0'), -60, -70, 120, 100); g.restore();
    E2(0, 30, 52, 14); g.fillStyle = '#d8d0c0'; g.fill(); out(); g.strokeStyle = '#a89870'; g.lineWidth = 4; g.beginPath(); g.moveTo(0, 26); g.lineTo(28, -14); g.stroke();
    [['#f0a0c8', -40], ['#a8d0f8', 40], ['#f8e080', -20]].forEach(([c, x]) => { g.strokeStyle = '#5a8a4a'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, 34); g.lineTo(x, 6); g.stroke(); E2(x, 2, 6, 8); g.fillStyle = c; g.fill(); });
  } else if (kind === 'starmarket') { // 별시장: 줄무늬 천막과 별 등불
    g.beginPath(); g.moveTo(-56, 38); g.quadraticCurveTo(-48, -8, 0, -34); g.quadraticCurveTo(48, -8, 56, 38); g.closePath(); g.fillStyle = '#8a4ab0'; g.fill(); out();
    for (let q = 0; q < 3; q++) { g.fillStyle = 'rgba(255,255,255,.4)'; g.beginPath(); g.moveTo(0, -34); g.lineTo(-36 + q * 36, 38); g.lineTo(-28 + q * 36, 38); g.closePath(); g.fill(); }
    RR2(g, -12, 8, 24, 30, 4, '#ffe27a'); ART.star(g, 0, -44, 9, '#ffe27a'); g.save(); g.globalCompositeOperation = 'lighter'; g.drawImage(ART.softDot('#ffd870'), -40, -84, 80, 80); g.restore();
  } else if (kind === 'hourglass') { // 모래시계 궁전
    RR2(g, -50, -6, 100, 46, 4, '#e8c088'); g.fillStyle = '#d8a868'; g.beginPath(); g.arc(0, -6, 34, Math.PI, TAU); g.fill(); out();
    g.fillStyle = '#c8a050'; RR2(g, -14, -62, 28, 4, 2, '#c8a050'); RR2(g, -14, -28, 28, 4, 2, '#c8a050');
    g.fillStyle = 'rgba(200,240,255,.85)'; g.beginPath(); g.moveTo(-12, -58); g.lineTo(12, -58); g.lineTo(2, -44); g.lineTo(12, -28); g.lineTo(-12, -28); g.lineTo(-2, -44); g.closePath(); g.fill(); out();
    g.fillStyle = '#f0c870'; g.beginPath(); g.moveTo(-9, -28); g.lineTo(9, -28); g.lineTo(0, -38); g.closePath(); g.fill();
  } else if (kind === 'silentmt') { // 소리 없는 산: 눈 덮인 봉우리와 얼어붙은 종
    g.beginPath(); g.moveTo(-64, 40); g.lineTo(-10, -50); g.quadraticCurveTo(0, -60, 10, -50); g.lineTo(64, 40); g.closePath(); g.fillStyle = L(g, '#b8c8da', '#6a7c92', 0, -60, 0, 40); g.fill(); out();
    g.beginPath(); g.moveTo(-28, -10); g.lineTo(-10, -50); g.quadraticCurveTo(0, -60, 10, -50); g.lineTo(28, -10); g.quadraticCurveTo(12, -18, 4, -8); g.quadraticCurveTo(-8, -20, -28, -10); g.fillStyle = '#ffffff'; g.fill();
    g.fillStyle = '#d8b04a'; g.beginPath(); g.moveTo(-10, 30); g.quadraticCurveTo(-10, 10, 0, 8); g.quadraticCurveTo(10, 10, 10, 30); g.closePath(); g.fill(); out(); E2(0, 31, 3, 3); g.fillStyle = '#8a6a20'; g.fill();
    g.strokeStyle = 'rgba(150,200,255,.9)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-12, 12); g.lineTo(-14, 20); g.moveTo(12, 12); g.lineTo(14, 20); g.stroke();
  } else if (kind === 'echocave') { // 메아리 동굴: 수정 동굴 입구 + 메아리 고리
    E2(0, 22, 56, 34); g.fillStyle = '#3a2e60'; g.fill(); out(); E2(0, 30, 30, 22); g.fillStyle = '#140e2a'; g.fill();
    [['#9ad8ff', -34, 30], ['#c8a8ff', 34, 26], ['#ffb8e8', -12, 22]].forEach(([c, x, h]) => { g.fillStyle = c; g.beginPath(); g.moveTo(x - 7, 0); g.lineTo(x, -h); g.lineTo(x + 7, 0); g.closePath(); g.fill(); });
    for (let q = 0; q < 3; q++) { g.strokeStyle = `rgba(200,180,255,${0.8 - q * 0.22})`; g.lineWidth = 2; g.beginPath(); g.arc(0, 30, 14 + q * 9, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); }
  } else if (kind === 'shadowvil') { // 회색 마을과 노을
    g.save(); g.globalCompositeOperation = 'lighter'; g.drawImage(ART.softDot('#ffb88a'), -70, -70, 140, 120); g.restore();
    [[-26, 40], [0, 60], [24, 44]].forEach(([x, h]) => { g.fillStyle = '#4a4058'; g.fillRect(x - 12, 30 - h, 24, h); g.beginPath(); g.moveTo(x - 16, 30 - h); g.lineTo(x, 30 - h - 16); g.lineTo(x + 16, 30 - h); g.closePath(); g.fill(); out(); g.fillStyle = 'rgba(255,210,140,.9)'; g.fillRect(x - 4, 36 - h, 8, 9); });
  } else if (kind === 'catrep') { // 고양이 지붕 탑
    E2(0, 34, 58, 14); g.fillStyle = '#c8a070'; g.fill(); out();
    g.fillStyle = L(g, '#f0c8a8', '#c8806a', 0, -60, 0, 30); g.fillRect(-16, -40, 32, 70); out();
    [[-40, 0], [-20, -1]].forEach(() => {}); g.fillStyle = '#a03a30'; g.beginPath(); g.moveTo(-28, -38); g.quadraticCurveTo(0, -58, 28, -38); g.closePath(); g.fill(); out();
    [[-10, -1], [10, 1]].forEach(([x, sd]) => { g.beginPath(); g.moveTo(x - 6, -48); g.lineTo(x + sd * 2, -64); g.lineTo(x + 6, -48); g.closePath(); g.fillStyle = '#a03a30'; g.fill(); out(); });
    E2(0, -20, 6, 6); g.fillStyle = '#ffd34d'; g.fill(); out(); g.save(); g.globalCompositeOperation = 'lighter'; g.drawImage(ART.softDot('#ffe08a'), 0 - 30, -20 - 30, 30 * 2, 30 * 2); g.restore();
  } else if (kind === 'feather') { // 깃털 섬
    g.beginPath(); g.moveTo(-50, 20); g.quadraticCurveTo(0, -4, 50, 20); g.lineTo(26, 46); g.lineTo(-26, 46); g.closePath(); g.fillStyle = '#7ab0c8'; g.fill(); out();
    [[-18, -0.3, '#ff9a6a'], [0, 0, '#ffd36a'], [18, 0.3, '#8ad0ff']].forEach(([x, r, c]) => { g.save(); g.translate(x, 10); g.rotate(r); g.fillStyle = c; g.beginPath(); g.ellipse(0, -36, 9, 36, 0, 0, TAU); g.fill(); out(); g.restore(); });
    E2(0, 14, 20, 8); g.fillStyle = '#a07a50'; g.fill(); out(); [[-6, 10], [4, 9]].forEach(([x, y]) => { E2(x, y, 5, 6); g.fillStyle = '#fff6e0'; g.fill(); });
  } else if (kind === 'burrow') { // 땅속 북 굴
    E2(0, 20, 54, 36); g.fillStyle = '#5a3a20'; g.fill(); out(); E2(0, 26, 30, 26); g.fillStyle = '#ffc860'; g.fill(); g.save(); g.globalCompositeOperation = 'lighter'; g.drawImage(ART.softDot('#ffc860'), 0 - 50, 20 - 50, 50 * 2, 50 * 2); g.restore();
    E2(0, -14, 20, 12); g.fillStyle = '#d8604a'; g.fill(); out(); E2(0, -16, 15, 7); g.fillStyle = '#fff3d8'; g.fill();
  } else if (kind === 'namesea') { // 마지막 등대
    E2(0, 34, 50, 12); g.fillStyle = '#3a5a6a'; g.fill(); out();
    g.fillStyle = L(g, '#ffffff', '#a8c8d8', 0, -70, 0, 30); g.beginPath(); g.moveTo(-14, 30); g.lineTo(-9, -50); g.lineTo(9, -50); g.lineTo(14, 30); g.closePath(); g.fill(); out();
    for (let k = 0; k < 3; k++) { g.fillStyle = ['#ff7a8a', '#ffd36a', '#8ad0ff'][k]; g.fillRect(-12 + k * 0.8, 10 - k * 20, 24 - k * 1.6, 8); }
    E2(0, -56, 10, 8); g.fillStyle = '#fff6c0'; g.fill(); out(); g.save(); g.globalCompositeOperation = 'lighter'; g.drawImage(ART.softDot('#c8f0ff'), 0 - 60, -56 - 60, 60 * 2, 60 * 2); g.restore();
  } else if (kind === 'stargarden') { // 별꽃 정원 섬
    E2(0, 34, 62, 16); g.fillStyle = '#4a3a8a'; g.fill(); out();
    [[-30, 10, '#ffb3e6'], [0, -6, '#fff3a0'], [30, 12, '#c8b0ff']].forEach(([x, y, c]) => { g.strokeStyle = '#3a7a5a'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, 34); g.lineTo(x, y); g.stroke(); for (let q = 0; q < 6; q++) { const an = q / 6 * TAU; E2(x + Math.cos(an) * 8, y + Math.sin(an) * 8, 7, 4.5); g.fillStyle = c; g.fill(); } ART.star(g, x, y, 5, '#ffffff'); });
    g.globalCompositeOperation = 'lighter'; g.drawImage(ART.softDot('#e0c8ff'), -70, -60, 140, 110); g.globalCompositeOperation = 'source-over';
    g.strokeStyle = 'rgba(255,240,200,.7)'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, -6); g.lineTo(0, -70); g.stroke(); ART.star(g, 0, -72, 6, '#fff6c8');
  } else if (kind === 'firstcastle') { // 구름 위 첫 번째 기사의 성
    [[-44, 30, 22], [0, 32, 30], [44, 30, 22]].forEach(([x, y, r]) => { E2(x, y, r, r * 0.55); g.fillStyle = '#ffffff'; g.fill(); });
    g.fillStyle = L(g, '#fff6e0', '#c8b898', 0, -70, 0, 30); [[-30, 50, 16], [0, 80, 22], [30, 50, 16]].forEach(([x, h, w]) => { g.fillRect(x - w / 2, 26 - h, w, h); g.beginPath(); g.moveTo(x - w / 2 - 4, 26 - h); g.lineTo(x, 26 - h - w); g.lineTo(x + w / 2 + 4, 26 - h); g.closePath(); g.fill(); }); out();
    g.fillStyle = '#ffd34d'; [[-30, -2], [0, -24], [30, -2]].forEach(([x, y]) => { g.fillRect(x - 3, y, 6, 9); }); ART.star(g, 0, -86, 8, '#fff3a0');
    g.globalCompositeOperation = 'lighter'; g.drawImage(ART.softDot('#fff3c0'), -60, -120, 120, 100); g.globalCompositeOperation = 'source-over';
  } else if (kind === 'candy') { // 사탕 등대 섬
    g.beginPath(); g.moveTo(-60, 44); g.quadraticCurveTo(0, 18, 60, 44); g.closePath(); g.fillStyle = '#ffe0c0'; g.fill(); out();
    g.beginPath(); g.moveTo(-12, 30); g.lineTo(-8, -50); g.lineTo(8, -50); g.lineTo(12, 30); g.closePath(); g.fillStyle = '#fff6ee'; g.fill(); out();
    g.fillStyle = '#ff8ec0'; for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(-11 + k * 0.6, 22 - k * 20); g.lineTo(11 - k * 0.6, 14 - k * 20); g.lineTo(11 - k * 0.6, 6 - k * 20); g.lineTo(-11 + k * 0.6, 14 - k * 20); g.closePath(); g.fill(); }
    E2(0, -58, 12, 10); g.fillStyle = '#ffd36a'; g.fill(); out(); g.globalCompositeOperation = 'lighter'; g.drawImage(ART.softDot('#fff3b0'), -50, -100, 100, 90); g.globalCompositeOperation = 'source-over';
    [[-40, 10, '#8ed0ff'], [36, 14, '#a8e8a0']].forEach(([x, y, c]) => { E2(x, y, 14, 10); g.fillStyle = c; g.fill(); out(); });
  } else if (kind === 'upside') { // 거꾸로 매달린 성
    g.save(); g.scale(1, -1); g.translate(0, 20);
    g.fillStyle = L(g, '#2a6a8a', '#123848', 0, -60, 0, 40); g.beginPath(); g.moveTo(-40, 40); g.lineTo(-30, -20); g.lineTo(-18, -20); g.lineTo(-18, -50); g.lineTo(-6, -64); g.lineTo(6, -50); g.lineTo(6, -24); g.lineTo(22, -30); g.lineTo(30, 0); g.lineTo(40, 40); g.closePath(); g.fill(); out('#9ff0ff');
    g.restore(); g.globalCompositeOperation = 'lighter'; g.drawImage(ART.softDot('#9ff0ff'), -60, -60, 120, 120); g.globalCompositeOperation = 'source-over';
    for (let k = 0; k < 6; k++) { g.strokeStyle = 'rgba(200,250,255,.6)'; g.lineWidth = 1.2; g.beginPath(); g.arc(-30 + k * 12, 30 - k * 9, 2 + k % 3, 0, TAU); g.stroke(); }
  } else if (kind === 'clock') { // 뻐꾸기 시계탑 마을
    [[-46, 20, '#d9a878', '#b04a3a'], [44, 24, '#f0d8b0', '#3a6a9a']].forEach(([x, h, c1, c2]) => { RR2(g, x - 16, 44 - h - 10, 32, h + 10, 2, c1); g.beginPath(); g.moveTo(x - 20, 34 - h); g.lineTo(x, 14 - h); g.lineTo(x + 20, 34 - h); g.fillStyle = c2; g.fill(); out(); });
    RR2(g, -16, -40, 32, 84, 3, '#c98a5a'); g.beginPath(); g.moveTo(-22, -40); g.lineTo(0, -72); g.lineTo(22, -40); g.closePath(); g.fillStyle = '#7a3a2a'; g.fill(); out();
    E2(0, -20, 13, 13); g.fillStyle = '#fffaf0'; g.fill(); out(); g.strokeStyle = '#3a2a20'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -20); g.lineTo(7, -25); g.moveTo(0, -20); g.lineTo(0, -30); g.stroke();
    ART.gearShape(g, 30, -40, 12, 9, '#d9a830', 0.2); ART.gearShape(g, -32, -30, 9, 8, '#b8862e', 0.5);
  } else if (kind === 'tower') { // 시간의 탑
    g.beginPath(); g.moveTo(-34, 44); g.lineTo(-22, -60); g.lineTo(22, -60); g.lineTo(34, 44); g.closePath(); g.fillStyle = L(g, '#7a6aa8', '#3a2a5a', 0, -60, 0, 44); g.fill(); out();
    g.beginPath(); g.moveTo(-28, -60); g.lineTo(0, -96); g.lineTo(28, -60); g.closePath(); g.fillStyle = '#4a3a7a'; g.fill(); out();
    E2(0, -36, 16, 16); g.fillStyle = '#ffeec8'; g.fill(); out('#d9a830'); g.strokeStyle = '#3a2a40'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -36); g.lineTo(9, -42); g.moveTo(0, -36); g.lineTo(-2, -48); g.stroke();
    g.globalCompositeOperation = 'lighter'; g.drawImage(ART.softDot('#d9b0ff'), -60, -110, 120, 120); g.globalCompositeOperation = 'source-over';
    for (let k = 0; k < 5; k++) ART.star(g, -50 + k * 25, -80 + (k % 2) * 20, 3, '#fff3b0');
  } else { // 별의 성
    g.globalCompositeOperation = 'lighter'; g.drawImage(ART.softDot('#ffe27a'), -70, -90, 140, 140); g.globalCompositeOperation = 'source-over';
    [[0, 70, 20], [-26, 44, 14], [26, 44, 14], [-46, 26, 10], [46, 26, 10]].forEach(([a, h, w]) => { g.fillStyle = L(g, '#7a6ad0', '#2a1f5c', 0, 40 - h, 0, 40); g.fillRect(a - w / 2, 40 - h, w, h); g.beginPath(); g.moveTo(a - w / 2 - 4, 40 - h); g.lineTo(a, 40 - h - w * 1.4); g.lineTo(a + w / 2 + 4, 40 - h); g.fillStyle = '#5a3aa0'; g.fill(); ART.star(g, a, 40 - h - w * 1.4 - 4, 4, '#ffe27a'); });
    g.fillStyle = '#ffe27a'; for (const [a, b] of [[0, -6], [-26, 14], [26, 14], [0, 18]]) { RR2(g, a - 3, b, 6, 9, 3, '#ffe27a'); }
  }
  g.restore();
}
function RR2(g, x, y, w, h, r, col) { ART.RR(g, x, y, w, h, r); g.fillStyle = col; g.fill(); }
// v1.3: 지도가 24장으로 길어져 한 장짜리 큰 그림은 폰·브라우저 한계를 넘음 → 2048px 조각(타일)으로 나눠 그림
const MTW = 2048;
let MAP_SCENES = null;
// v1.5: 지도 그리기 3초 → 보이는 조각만, 한 프레임에 하나씩 그리기 (장별 풍경도 필요할 때만 그림)
let MV0 = -1e9, MV1 = 1e9, MAP_IDLE = 0;
const mapInV = i => 24 + i * ZW + ZW + 140 >= MV0 && 24 + i * ZW - 140 <= MV1;
function mapScene(i) {
  if (!MAP_SCENES) MAP_SCENES = [];
  if (MAP_SCENES[i] !== undefined) return MAP_SCENES[i];
  try {
    const th = ART.THEMES[i], tmp = ART.mk(W, H), tg = tmp.getContext('2d'), RW = ZW + 100, RH = H - 104, k = RH / (H - 30);
    ART.drawBg(tg, i, 300 + i * 173, 0, GY, W, H);
    const c = ART.mk(RW, RH), g = c.getContext('2d'), sw = RW / k; g.drawImage(tmp, (W - sw) / 2, 0, sw, H - 30, 0, 0, RW, RH);
    g.globalCompositeOperation = 'destination-in'; const m = g.createLinearGradient(0, 0, RW, 0); m.addColorStop(0, 'rgba(0,0,0,0)'); m.addColorStop(0.15, '#000'); m.addColorStop(0.85, '#000'); m.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = m; g.fillRect(0, 0, RW, RH);
    MAP_SCENES[i] = c; void th;
  } catch (e) { MAP_SCENES[i] = null; }
  return MAP_SCENES[i];
}
function buildMapTile(t) {
  const c = ART.mk(t.w, Math.ceil(H * MS)), g = c.getContext('2d'); g.translate(-t.x, 0); g.scale(MS, MS);
  MV0 = t.x / MS; MV1 = (t.x + t.w) / MS; paintMapBg(g); MV0 = -1e9; MV1 = 1e9; t.c = c;
  /* v3.9 지도 고급화: 그린 그림 위에 빛·그림자·재질을 덧칠 — 물체 위쪽 테두리 빛, 아래쪽 그늘, 종이·물감 결, 해 쪽(오른쪽 위)에서 오는 은은한 빛 */
  try { const w = c.width, h = c.height, q = c.getContext('2d'); q.setTransform(1, 0, 0, 1, 0, 0);
    const w2 = Math.ceil(w / 2), h2 = Math.ceil(h / 2), ed = ART.mk(w2, h2), e = ed.getContext('2d'); e.drawImage(c, 0, 0, w2, h2); const im = e.getImageData(0, 0, w2, h2), d = im.data, o = e.createImageData(w2, h2), od = o.data, L = (i) => d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11; /* 반 크기로 계산 (폰에서 빨리) */
    for (let y = 1; y < h2 - 1; y++) for (let x = 0; x < w2; x++) { const i = (y * w2 + x) * 4, up = ((y - 1) * w2 + x) * 4, dn = ((y + 1) * w2 + x) * 4, dl = L(i) - L(up), dd = L(i) - L(dn); if (dl > 26) { od[i] = 255; od[i + 1] = 246; od[i + 2] = 214; od[i + 3] = Math.min(90, dl * 1.4); } else if (dd > 30) { od[i] = 40; od[i + 1] = 24; od[i + 2] = 40; od[i + 3] = Math.min(70, dd); } }
    e.putImageData(o, 0, 0); q.drawImage(ed, 0, 0, w, h);
    q.save(); q.globalCompositeOperation = 'soft-light'; const gl = q.createRadialGradient(w * 0.8 - t.x * 0.0, -h * 0.2, 10, w * 0.8, -h * 0.2, h * 1.4); gl.addColorStop(0, 'rgba(255,240,200,.5)'); gl.addColorStop(1, 'rgba(60,40,90,.35)'); q.fillStyle = gl; q.fillRect(0, 0, w, h); q.restore();
    let sd = 977 + Math.round(t.x); const R = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; }; q.save(); for (let k = 0; k < w * h / 2400; k++) { q.fillStyle = R() < 0.5 ? 'rgba(255,255,255,.05)' : 'rgba(60,40,20,.05)'; q.fillRect(R() * w, R() * h, 2 + R() * 5, 1 + R()); } q.restore();
  } catch (er) {}
  if (mapBg.every(q => q.c)) MAP_SCENES = null;
}
function buildMapBg() {
  const tiles = [], total = Math.ceil(MAPW * MS);
  for (let tx = 0; tx < total; tx += MTW) tiles.push({ x: tx, w: Math.min(MTW, total - tx), c: null });
  mapBg = tiles;
}
function paintMapBg(g) {
  // 바다 + 양피지
  const sea = g.createLinearGradient(0, 56, 0, H); sea.addColorStop(0, '#9fd3ea'); sea.addColorStop(1, '#6fb6d8'); g.fillStyle = sea; g.fillRect(0, 0, MAPW, H);
  let s0 = 77; const R0 = () => { s0 = (s0 * 16807) % 2147483647; return s0 / 2147483647; };
  g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1.4; for (let k = 0; k < 260; k++) { const x = R0() * MAPW, y = 60 + R0() * H; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 6, y - 3, x + 12, y); g.stroke(); }
  // 대륙 윤곽 (해안선)
  const top = x => 104 + Math.sin(x * 0.011) * 5 + Math.sin(x * 0.037) * 3, bot = x => H - 12 - Math.sin(x * 0.013 + 1) * 6 - Math.sin(x * 0.041) * 3;
  const land = () => { g.beginPath(); g.moveTo(10, top(10)); for (let x = 10; x <= MAPW - 10; x += 10) g.lineTo(x, top(x)); for (let x = MAPW - 10; x >= 10; x -= 10) g.lineTo(x, bot(x)); g.closePath(); };
  g.save(); land(); g.shadowColor = 'rgba(20,60,90,.45)'; g.shadowBlur = 18; g.fillStyle = '#f3e3c0'; g.fill(); g.restore();
  land(); g.lineWidth = 8; g.strokeStyle = 'rgba(255,255,255,.55)'; g.stroke(); g.lineWidth = 2; g.strokeStyle = 'rgba(90,60,30,.6)'; g.stroke();
  g.save(); land(); g.clip();
  // v1.4 장별 지역 = 그 장의 전투 배경 그림(하늘·먼 산·마을·땅)을 그대로 축소해 그린 그림 지도
  ART.THEMES.forEach((th, i) => { if (!mapInV(i)) return; const sc = mapScene(i); if (sc) g.drawImage(sc, 24 + i * ZW - 50, 100, ZW + 100, H - 104); else { g.fillStyle = th.mid; g.fillRect(24 + i * ZW, 0, ZW, H); } });
  { const pg = g.createLinearGradient(0, 100, 0, H); pg.addColorStop(0, 'rgba(255,244,220,.10)'); pg.addColorStop(1, 'rgba(120,80,40,.12)'); g.fillStyle = pg; g.fillRect(0, 0, MAPW, H); }

  // 수채 번짐 + 언덕 그림자
  for (let k = 0; k < 120; k++) { const x = R0() * MAPW, y = 120 + R0() * (H - 130), r = 30 + R0() * 70, gr = g.createRadialGradient(x, y, 2, x, y, r); gr.addColorStop(0, R0() < 0.5 ? 'rgba(255,255,255,.12)' : 'rgba(40,20,0,.08)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
  ART.THEMES.forEach((th, i) => {
    if (!mapInV(i)) return;
    const x0 = 24 + i * ZW, w = ZW - 10, y0 = 112, hh = H - 122;
    let s = i * 999 + 7; const R = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    if (!mapScene(i)) { g.fillStyle = 'rgba(255,255,255,.16)'; g.beginPath(); g.moveTo(x0, y0 + 110); for (let k = 0; k <= 8; k++) g.lineTo(x0 + k * w / 8, y0 + 70 + R() * 40); g.lineTo(x0 + w, y0 + 140); g.lineTo(x0, y0 + 140); g.fill(); }
    for (let k = 0; k < (mapScene(i) ? 0 : 30); k++) {
      const x = x0 + R() * w, y = y0 + 40 + R() * (hh - 60), sc = 0.5 + R() * 0.45;
      if (th.kind === 'meadow') { g.fillStyle = '#5a3a22'; g.fillRect(x - 1.5, y, 3, 8); [[0, -6, 8], [-5, -2, 6], [5, -2, 6]].forEach(([a, b, r]) => { ART.E(g, x + a * sc, y + b * sc, r * sc + 2, r * sc + 2); g.fillStyle = ART.rg(g, '#6fc35a', x + a, y + b, 10); g.fill(); }); }
      else if (th.kind === 'forest') { g.beginPath(); g.moveTo(x - 9, y + 8); g.lineTo(x, y - 18); g.lineTo(x + 9, y + 8); g.fillStyle = R() < 0.5 ? '#2a6a3c' : '#357d48'; g.fill(); }
      else if (th.kind === 'desert') { g.strokeStyle = 'rgba(255,240,200,.55)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 20, y); g.quadraticCurveTo(x, y - 8, x + 20, y); g.stroke(); if (R() < 0.25) { g.fillStyle = '#4f8a3a'; ART.RR(g, x - 2, y - 16, 5, 16, 2); g.fill(); } }
      else if (th.kind === 'snow') { g.beginPath(); g.moveTo(x - 9, y + 8); g.lineTo(x, y - 18); g.lineTo(x + 9, y + 8); g.fillStyle = '#2f6a57'; g.fill(); g.beginPath(); g.moveTo(x - 5, y - 6); g.lineTo(x, y - 18); g.lineTo(x + 5, y - 6); g.fillStyle = '#fff'; g.fill(); }
      else if (th.kind === 'volcano') { ART.E(g, x, y, 10, 6); g.fillStyle = '#2a1b20'; g.fill(); g.strokeStyle = 'rgba(255,110,40,.75)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x - 6, y); g.lineTo(x + 2, y + 6); g.stroke(); }
      else if (th.kind === 'coast') { if (R() < 0.5) { g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 12, y); g.quadraticCurveTo(x - 6, y - 5, x, y); g.quadraticCurveTo(x + 6, y + 5, x + 12, y); g.stroke(); } else { g.strokeStyle = '#7a5230'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(x, y + 8); g.quadraticCurveTo(x + 3, y - 6, x + 1, y - 16); g.stroke(); g.fillStyle = '#3fae6a'; for (let a = 0; a < 5; a++) { g.save(); g.translate(x + 1, y - 16); g.rotate(a * 1.25); ART.E(g, 7, 0, 8, 2.6); g.fill(); g.restore(); } } }
      else if (th.kind === 'sky') { g.fillStyle = 'rgba(255,255,255,.9)'; [[0, 0, 12], [-10, 3, 8], [10, 3, 9]].forEach(([a, b, r]) => { ART.E(g, x + a * sc, y + b * sc, r * sc + 3, r * sc + 2); g.fill(); }); }
      else if (th.kind === 'crystal') { const col = ['#6fd8ff', '#b48cff', '#7affd0'][k % 3]; g.beginPath(); g.moveTo(x - 4, y + 6); g.lineTo(x, y - 14); g.lineTo(x + 4, y + 6); g.closePath(); g.fillStyle = col; g.fill(); }
      else if (th.kind === 'castle' || th.kind === 'starsea') { ART.star(g, x, y, 3 + R() * 3, ['#ffe27a', '#bfe6ff', '#ffb3e6'][k % 3]); }
      else if (th.kind === 'mine') { if (R() < 0.5) { g.fillStyle = '#4a3a2a'; ART.RR(g, x - 8, y - 4, 16, 8, 2); g.fill(); } else { g.beginPath(); g.moveTo(x - 3, y + 4); g.lineTo(x, y - 6); g.lineTo(x + 3, y + 4); g.fillStyle = ['#ffd34d', '#7affd0'][k % 2]; g.fill(); } }
      else if (th.kind === 'fossil') { if (R() < 0.5) { g.strokeStyle = '#f2e8d2'; g.lineWidth = 3; g.beginPath(); g.arc(x, y + 6, 8, Math.PI, 0); g.stroke(); } else { g.fillStyle = '#4a9a4a'; for (let a = -2; a <= 2; a++) { ART.E(g, x + a * 3, y - 4 - Math.abs(a) * -1, 2, 7); g.fill(); } } }
      else if (th.kind === 'rainbow') { E(g, x, y, 8, 4); g.fillStyle = ['#ffd0e0', '#d0f0ff', '#fff0b0'][k % 3]; g.fill(); }
      else if (th.kind === 'fieststad') { g.fillStyle = ['#ff7a8a', '#ffd34d', '#7ac8ff'][Math.floor(x + y) % 3]; g.fillRect(x - 1.5, y - 1, 3, 2); }
      else if (th.kind === 'toyland') { E(g, x, y, 1.6, 1.6); g.fillStyle = 'rgba(255,230,160,.7)'; g.fill(); }
      else if (th.kind === 'oldcatrep') { E(g, x, y, 3, 1.4); g.fillStyle = 'rgba(160,110,60,.6)'; g.fill(); }
      else if (th.kind === 'lastgate') { E(g, x, y, 2, 2); g.fillStyle = 'rgba(255,200,150,.6)'; g.fill(); }
      else if (th.kind === 'icehaven') { E(g, x, y, 6, 2.4); g.fillStyle = 'rgba(220,240,255,.9)'; g.fill(); }
      else if (th.kind === 'whalecave') { g.fillStyle = 'rgba(220,200,255,.8)'; E(g, x, y, 1.8, 1.8); g.fill(); }
      else if (th.kind === 'windnest') { E(g, x, y, 8, 3); g.fillStyle = 'rgba(255,255,255,.85)'; g.fill(); }
      else if (th.kind === 'stormcrown') { g.strokeStyle = 'rgba(255,245,160,.7)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x, y - 4); g.lineTo(x - 2, y); g.lineTo(x + 2, y); g.lineTo(x, y + 4); g.stroke(); }
      else if (th.kind === 'clockforest') { g.save(); g.globalCompositeOperation = 'lighter'; g.drawImage(ART.softDot('#c8ffb0'), x - 5, y - 5, 10, 10); g.restore(); }
      else if (th.kind === 'dawngarden') { E(g, x, y, 2.4, 3.2); g.fillStyle = ['#f0a0c8', '#f8e080', '#a8d0f8'][k % 3]; g.fill(); }
      else if (th.kind === 'starmarket') { ART.star(g, x, y, 2.6, ['#ffe27a', '#ffb0d0', '#a8e0ff'][k % 3]); }
      else if (th.kind === 'hourglass') { E(g, x, y, 7, 2.4); g.fillStyle = 'rgba(200,140,70,.5)'; g.fill(); }
      else if (th.kind === 'silentmt') { E(g, x, y, 6, 2.4); g.fillStyle = 'rgba(255,255,255,.85)'; g.fill(); }
      else if (th.kind === 'echocave') { g.strokeStyle = 'rgba(200,180,255,.6)'; g.lineWidth = 1.4; g.beginPath(); g.arc(x, y, 5, 0, TAU); g.stroke(); }
      else if (th.kind === 'shadowvil') { E(g, x, y, 1.8, 1.8); g.fillStyle = 'rgba(255,220,140,.8)'; g.fill(); }
      else if (th.kind === 'catrep') { ART.paw(g, x, y, 1, 'rgba(160,90,60,.5)'); }
      else if (th.kind === 'feather') { g.save(); g.translate(x, y); g.rotate(k); g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.ellipse(0, 0, 8, 2.6, 0, 0, TAU); g.fill(); g.restore(); }
      else if (th.kind === 'burrow') { E(g, x, y, 3, 3); g.fillStyle = 'rgba(255,200,100,.6)'; g.fill(); }
      else if (th.kind === 'namesea') { g.strokeStyle = 'rgba(200,240,255,.5)'; g.lineWidth = 1; g.beginPath(); g.arc(x, y, 2 + R() * 3, 0, TAU); g.stroke(); }
      else if (th.kind === 'stargarden') { ART.star(g, x, y, 2 + R() * 3, ['#fff6c8', '#ffd6ff', '#c8e0ff'][k % 3]); }
      else if (th.kind === 'firstcastle') { if (R() < 0.5) { E(g, x, y, 10, 5); g.fillStyle = 'rgba(255,255,255,.7)'; g.fill(); } else ART.star(g, x, y, 2.5, '#fff3a0'); }
      else if (th.kind === 'candy') { const c = ['#ff8ec0', '#8ed0ff', '#ffd36a', '#a8e8a0'][k % 4]; g.fillStyle = '#fff6ee'; g.fillRect(x - 1, y - 12, 2, 12); E(g, x, y - 14, 5, 5); g.fillStyle = c; g.fill(); }
      else if (th.kind === 'upside') { g.strokeStyle = 'rgba(200,250,255,.5)'; g.lineWidth = 1; g.beginPath(); g.arc(x, y, 2 + R() * 3, 0, TAU); g.stroke(); }
      else if (th.kind === 'clock') { if (R() < 0.5) ART.gearShape(g, x, y, 6 + R() * 5, 8, 'rgba(150,100,50,.6)', R()); else { g.fillStyle = '#e8c89a'; g.fillRect(x - 6, y - 8, 12, 10); g.beginPath(); g.moveTo(x - 8, y - 8); g.lineTo(x, y - 16); g.lineTo(x + 8, y - 8); g.fillStyle = '#b04a3a'; g.fill(); } }
      else if (th.kind === 'tower') { if (R() < 0.6) ART.star(g, x, y, 2 + R() * 3, '#e8d8ff'); else ART.gearShape(g, x, y, 5 + R() * 4, 8, 'rgba(220,190,255,.5)', R()); }
      else if (th.kind === 'aurora') { g.beginPath(); g.moveTo(x - 9, y + 8); g.lineTo(x, y - 18); g.lineTo(x + 9, y + 8); g.fillStyle = '#3a6a6a'; g.fill(); g.beginPath(); g.moveTo(x - 5, y - 6); g.lineTo(x, y - 18); g.lineTo(x + 5, y - 6); g.fillStyle = '#fff'; g.fill(); }
      else { g.fillStyle = '#2a1f35'; g.fillRect(x - 1.5, y - 14, 3, 22); g.strokeStyle = '#2a1f35'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y - 8); g.lineTo(x + 8, y - 16); g.moveTo(x, y - 4); g.lineTo(x - 7, y - 12); g.stroke(); if (R() < 0.5) { g.save(); g.globalCompositeOperation = 'lighter'; g.drawImage(ART.softDot('#9b6bff'), x + 4, y, 14, 14); g.restore(); } }
    }
    g.save(); g.globalAlpha = 0.92; mapLandmark(g, th.kind, x0 + w / 2 + 10, y0 + 128); g.restore();
    if (th.kind === 'volcano') { g.beginPath(); g.moveTo(x0 + 120, y0 + 100); g.lineTo(x0 + 152, y0 + 36); g.lineTo(x0 + 172, y0 + 36); g.lineTo(x0 + 210, y0 + 100); g.fillStyle = '#3a2030'; g.fill(); const gl = g.createRadialGradient(x0 + 162, y0 + 36, 2, x0 + 162, y0 + 36, 40); gl.addColorStop(0, 'rgba(255,160,60,.9)'); gl.addColorStop(1, 'rgba(255,90,40,0)'); g.fillStyle = gl; g.fillRect(x0 + 110, y0 - 10, 100, 100); }
    if (th.kind === 'coast') { g.fillStyle = 'rgba(60,150,210,.45)'; g.fillRect(x0, y0 + 60, w, 30); }
    if (th.kind === 'sky') { g.fillStyle = 'rgba(255,240,200,.8)'; g.beginPath(); g.arc(x0 + w - 40, y0 + 44, 16, 0, TAU); g.fill(); }
    if (th.kind === 'castle') { g.fillStyle = '#2a1f5c'; [[w * 0.5, 120, 26], [w * 0.36, 80, 18], [w * 0.64, 80, 18]].forEach(([cx, ht, tw]) => { g.fillRect(x0 + cx - tw / 2, y0 + 140 - ht, tw, ht); g.beginPath(); g.moveTo(x0 + cx - tw / 2 - 4, y0 + 140 - ht); g.lineTo(x0 + cx, y0 + 140 - ht - tw * 1.3); g.lineTo(x0 + cx + tw / 2 + 4, y0 + 140 - ht); g.fill(); }); }
    if (th.kind === 'swamp') { const gl = g.createRadialGradient(x0 + w / 2, y0 + hh, 10, x0 + w / 2, y0 + hh, 180); gl.addColorStop(0, 'rgba(160,90,255,.35)'); gl.addColorStop(1, 'rgba(160,90,255,0)'); g.fillStyle = gl; g.fillRect(x0, y0, w, hh); }
    // 지역 경계: 점선 + 발바닥 표석
    if (i > 0) { g.save(); g.setLineDash([6, 7]); g.lineWidth = 2; g.strokeStyle = 'rgba(80,50,20,.45)'; g.beginPath(); for (let y = 108; y < H - 10; y += 6) { const xx = x0 - 5 + Math.sin(y * 0.05 + i) * 6; if (y === 108) g.moveTo(xx, y); else g.lineTo(xx, y); } g.stroke(); g.restore(); ART.paw(g, x0 - 5, H - 40, 0.9, 'rgba(80,50,20,.45)'); }
    // 이름 두루마리
    const rw = Math.min(w - 70, 250), rx = x0 + (w - rw) / 2, ry = y0 - 2;
    g.fillStyle = '#8a3b1f'; [[rx - 14, 1], [rx + rw + 14, -1]].forEach(([ex, d]) => { g.beginPath(); g.moveTo(ex, ry + 6); g.lineTo(ex + d * 18, ry + 6); g.lineTo(ex + d * 18, ry + 30); g.lineTo(ex, ry + 30); g.lineTo(ex + d * 9, ry + 18); g.closePath(); g.fill(); });
    ART.RR(g, rx, ry, rw, 30, 9); g.fillStyle = ART.lgr(g, '#e8703f', '#b4401f', 0, ry, 0, ry + 30); g.fill(); g.lineWidth = 3; g.strokeStyle = ART.goldG(g, ry, ry + 30); g.stroke(); /* v2.6 금테 띠 */
    ART.RR(g, rx + 4, ry + 4, rw - 8, 22, 6); g.lineWidth = 1; g.strokeStyle = 'rgba(255,230,160,.7)'; g.stroke(); ART.gem(g, rx + 10, ry + 15, 3.6, '#ffcf3a'); ART.gem(g, rx + rw - 10, ry + 15, 3.6, '#ffcf3a');
    g.save(); g.globalAlpha = 0.35; g.fillStyle = '#fff'; ART.RR(g, rx + 6, ry + 3, rw - 12, 8, 4); g.fill(); g.restore();
    g.font = `bold 14px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff3c4'; g.fillText(CH_NAMES[i], rx + rw / 2, ry + 15.5);
  });
  // 나침반 장미 (첫 지역 바다 쪽)
  g.restore();
  // 길: 그림자 · 돌 테두리 · 모래 · 징검 점
  g.lineCap = 'round'; g.lineJoin = 'round';
  const path = () => mapPath(g, NODES.length);
  g.save(); g.translate(0, 4); path(); g.lineWidth = 18; g.strokeStyle = 'rgba(40,20,5,.25)'; g.stroke(); g.restore();
  path(); g.lineWidth = 15; g.strokeStyle = '#7a5230'; g.stroke();
  path(); g.lineWidth = 11; g.strokeStyle = '#f6e3b8'; g.stroke();
  path(); g.lineWidth = 3; g.setLineDash([1, 10]); g.strokeStyle = '#c9a06a'; g.stroke(); g.setLineDash([]);
}
function mapPath(ctx2, upto) { const N = Math.min(upto, NODES.length), P = k => NODES[Math.max(0, Math.min(NODES.length - 1, k))]; ctx2.beginPath(); ctx2.moveTo(NODES[0].x, NODES[0].y); for (let i = 0; i < N - 1; i++) { const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2); ctx2.bezierCurveTo(p1.x + (p2.x - p0.x) / 6, p1.y + (p2.y - p0.y) / 6, p2.x - (p3.x - p1.x) / 6, p2.y - (p3.y - p1.y) / 6, p2.x, p2.y); } }
/* v4.2 이벤트 「숨은 황금 뼈다귀」: 하루 3번(0~8시 · 8~16시 · 16~24시) 지도 어딘가(지금 판 근처)에 황금 뼈다귀가 숨어요. 눌러서 찾으면 코인 + 3번째마다 보석 1 · 10번째마다 별가루 3. 전투 밖에서만, 광고·결제 없음 */
function huntSpot() { if ((S.cleared || 0) < 3) return null; const d = new Date(), key = todayKey() + '#' + Math.floor(d.getHours() / 8); if (S.hunt === key) return null; let h = 7; for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) % 100003;
  const lo = Math.max(1, S.cleared - 6), n = Math.min(MAXST, lo + h % (S.cleared + 2 - lo)), N = NODES[n - 1], a = (h % 8) / 8 * TAU; return { x: N.x + Math.cos(a) * 46, y: Math.max(90, Math.min(H - 70, N.y + Math.sin(a) * 34)), key }; }
function huntClaim(h) { S.hunt = h.key; S.huntN = (S.huntN || 0) + 1; if (!S.huntDay || S.huntDay.k !== todayKey()) S.huntDay = { k: todayKey(), n: 0 }; S.huntDay.n++; const c = Math.min(1500, 150 + (S.cleared || 0) * 3); S.coins += c; let ex = ''; if (S.huntN % 3 === 0) { S.dust = (S.dust || 0) + 2; ex += ' · 별가루 +2'; } if (S.huntN % 10 === 0) { S.dust = (S.dust || 0) + 3; ex += ' · 별가루 +3'; }
  save(); SFX.rare(); mapToast = { s: `숨은 황금 뼈다귀 찾기 성공! 코인 +${c}${ex} (모두 ${S.huntN}번)`, t: 2.6 }; }
function drawHunt() { const h = huntSpot(); if (!h || h.x < mapX - 30 || h.x > mapX + W + 30) return; const t = G.time, wob = Math.sin(t * 5) * 0.25;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.45 + Math.sin(t * 3) * 0.25; ctx.drawImage(ART.softDot('#ffe08a'), h.x - 26, h.y - 26, 52, 52); ctx.restore();
  ART.bone(ctx, h.x, h.y + Math.sin(t * 2.4) * 2, 22, '#ffd34d', wob); for (let k = 0; k < 3; k++) { const ph = (t * 0.8 + k / 3) % 1; ctx.globalAlpha = Math.sin(ph * Math.PI); ART.star(ctx, h.x - 14 + k * 14, h.y - 14 - ph * 14, 4, '#fff8c0'); } ctx.globalAlpha = 1; }
let mapDragObj = null;
function mapDrag() {
  if (mapDragObj) { dragH = mapDragObj; return; }
  dragH = mapDragObj = { id: null, sx: 0, sm: 0, moved: 0,
    down(p, id) { if (popup || p.y < 56) return; this.id = id; this.sx = p.x; this.sm = mapTX; this.moved = 0; },
    move(p) { const d = p.x - this.sx; this.moved = Math.max(this.moved, Math.abs(d)); mapTX = clampMap(this.sm - d); mapX = mapTX; },
    up(p, ok) { const id = this.id; this.id = null; if (id == null || !ok || this.moved > 14 || popup || scene !== 'map' || mapTab !== 0) return; const wx = p.x + mapX;
      for (let z = 0; z < CHN; z++) { const cx = 24 + z * ZW + (ZW - 10) / 2 + 72, cy = 153; if (Math.hypot(wx - cx, p.y - cy) < 22 && S.cleared >= (z + 1) * CHL && !S.chRew[z]) { grantChapterReward(z); return; } }
      { const h = huntSpot(); if (h && Math.hypot(wx - h.x, p.y - h.y) < 28) { huntClaim(h); return; } } /* v4.2 숨은 황금 뼈다귀 */
      let best = null, bd = 34; for (const N of NODES) { const d = Math.hypot(wx - N.x, p.y - N.y); if (d < bd) { bd = d; best = N; } }
      if (best) { if (best.n <= S.cleared + 1) { popup = best.n; SFX.click(); } else { mapToast = { s: `${best.n - 1}스테이지를 먼저 클리어하세요`, t: 1.4 }; } } } };
}
let mapToast = null;
function drawMapTop() {
  if (mapTab === 0) { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#ffe7b8'); g.addColorStop(1, '#f2c487'); ctx.fillStyle = g; ctx.fillRect(-OX, 0, VW, H); }
  else {
    const ch = Math.min(7, Math.floor(Math.min(MAXST - 1, S.cleared) / 5));
    bgFull(ch, G.time * 14, G.time, 470, W, H);
    ctx.fillStyle = 'rgba(255,226,180,.38)'; ctx.fillRect(-OX, 0, VW, H);
    const vg = ctx.createRadialGradient(W / 2, H / 2, 160, W / 2, H / 2, 620); vg.addColorStop(0, 'rgba(60,25,0,0)'); vg.addColorStop(1, 'rgba(60,25,0,.45)'); ctx.fillStyle = vg; ctx.fillRect(-OX, 0, VW, H);
    for (let k = 0; k < 14; k++) { const px = (k * 137 + G.time * 18) % (W + 40) - 20, py = 80 + (k * 71) % 440 + Math.sin(G.time + k) * 8; ctx.globalAlpha = 0.35 + Math.sin(G.time * 2 + k) * 0.2; ART.paw(ctx, px, py, 0.9, 'rgba(255,250,230,.6)'); } ctx.globalAlpha = 1;
  }
  ART.panel(ctx, -20 - OX, -20, VW + 40, 76, 'wood');
  drawSeasonGarland(54);
  edgeOn(-1);
  const L = ART.logo(); ctx.drawImage(L, 10, 0, 156, 156 * L.height / L.width);
  ART.panel(ctx, 172, 10, 196, 38, 'dark');
  ctx.save(); ctx.beginPath(); ctx.arc(191, 29, 16, 0, TAU); ctx.fillStyle = '#fff3d6'; ctx.fill(); ctx.clip(); ART.drawFit(ctx, heroFace(), 'i0', 191, 30, 32, 32, { face: 0.62, pad: 1.0 }); ctx.restore();
  txt(`Lv.${S.lv} 멍멍기사`, 210, 22, 12, '#ffe082');
  bar(210, 31, 146, 11, S.xp / xpNeed(S.lv), '#ffca28'); txt(`${S.xp}/${xpNeed(S.lv)}`, 283, 37, 9, '#fff', 'center');
  edgeOff();
  edgeOn(1); ART.panel(ctx, W - 166, 10, 154, 38, 'dark'); ART.icon(ctx, 'coin', W - 146, 29, 24); txt('' + S.coins, W - 128, 30, 18, '#ffe082'); edgeOff();
  const tabs = ['지도', '강화', '장비', '편성', '도감', '설정'];
  tabs.forEach((n, i) => btn(378 + i * 69, 10, 64, 38, n, () => { mapTab = i; mapSel = null; resetArm = 0; popup = 0; codexSel = null; }, { bg: mapTab === i ? '#ff9a2a' : '#7a6a9a', size: 17, key: 'tab' + i })); /* v2.9 탭 글씨 크게 · 바탕 진하게(흰 글씨 대비) */
  if (awkReady() >= 0 && mapTab !== 1) { const rx = 378 + 69 + 60, ry = 14; ctx.fillStyle = '#ff3b3b'; ctx.beginPath(); ctx.arc(rx, ry, 6 + Math.sin(G.time * 5) * 0.8, 0, TAU); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6; ctx.stroke(); }
}
let BACKTOAST = 0;
/* v3.8 지도 보스 원 안에 얼굴이 오도록: 몸이 길거나 넓은 보스는 얼굴 위치 [x, y, 반지름] (그림 좌표) */
const BOSS_FACE = { scorp: [10, -45, 40], whale: [30, -72, 58], mole: [10, -80, 45], spiderq: [20, -62, 46], seaspirit: [5, -92, 55], thunderbird: [10, -80, 46], windelder: [58, -168, 46], songwhale: [55, -82, 58] };
/* v3.7 지도 글씨가 화면 고정 단추·안내판 밑에 깔리면 그리지 않음 (스크롤 가장자리 포함) */
function mapCov(x, y) { const sx = x - mapX, wy = seasonNow() ? 366 : 410; return sx < -OX + 18 || sx > W + OX - 18 || (sx > W - 64 && y > 250 && y < 382) || (sx < 292 && y > wy && y < 510); }
function drawMap() {
  drawMapTop();
  if (mapTab === 0) drawStages(); else if (mapTab === 1) drawUpgrades(); else if (mapTab === 2) drawEquip(); else if (mapTab === 3) drawFormation(); else if (mapTab === 4) drawCodex(); else drawSettings();
  if (!CHR && !GROWN && !PROMO_POP && !THIRD_POP && !MIRP && !PETP && !DAILY && !WEEKP && !AWK_POP) checkShardPop();
  if (S.petPop && !CHR && !SHARDP && !GROWN && !PETP) { PETP = { t: 0, got: PETS.find(q => q.id === S.petPop) }; S.petPop = null; save(); }
  { const sk = seasonNow(); if (sk) { S.seasonSeen = S.seasonSeen || {}; if (!S.seasonSeen[sk]) { S.seasonSeen[sk] = 1; save(); } } }
  drawCrumbs();
  if (CEL) drawCel400(); else if (VILP) drawVillage(); else if (SHOPP) drawShop(); else if (CHR) drawChapterReward(); else if (WARDP) drawWardrobe(); else if (AWKINFO) drawAwkInfo(); else if (COMBOP) drawComboCodex(); else if (AWK_POP) drawAwkPop(); else if (WEEKP) drawWeekly(); else if (RANKP) drawRank(); else if (BHP) drawBossHall(); else if (SHARDP) drawShardPop(); else if (GROWN) drawGrown(); else if (PROMO_POP) drawPromo(); else if (THIRD_POP) drawThirdPop(); else if (MIRP) drawMirPanel(); else if (PETP) drawPetPanel(); else if (DAILY) drawDaily();
  drawFloatMsg(true);
}
function grantChapterReward(ch) {
  if (S.chRew[ch] || S.cleared < (ch + 1) * CHL) return;
  const n = (ch + 1) * CHL, coins = 1000 + ch * 800, it = makeItem(n, 2, 'reward'); /* v4.8 장 보상은 희귀 보장 (예전 전설) · 신화는 상자에서만 */
  S.chRew[ch] = 1; S.coins += coins; S.potions = Math.min(9, S.potions + 2); if (S.inv.length < 28) S.inv.push(it); else S.coins += sellPrice(it);
  CHR = { ch, coins, it, pot: 2, t: 0 }; save();
}
function drawChapterReward() {
  const c = CHR; c.t += G.dt || 0.016; ui = []; dragH = null;
  const a = Math.min(1, c.t * 3), op = Math.min(1, Math.max(0, (c.t - 0.5) * 2));
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = 'rgba(15,6,0,.72)'; ctx.fillRect(-OX, 0, VW, H);
  ctx.save(); ctx.translate(W / 2, 200); ctx.rotate(G.time * 0.25); ctx.globalCompositeOperation = 'lighter'; for (let k = 0; k < 14; k++) { ctx.rotate(TAU / 14); ctx.fillStyle = 'rgba(255,215,110,.09)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-36, -460); ctx.lineTo(36, -460); ctx.closePath(); ctx.fill(); } ctx.restore();
  ART.panel(ctx, W / 2 - 300, 52, 600, 440, 'cream');
  bigText(`${CH_NAMES[c.ch]} 완전 정복!`, W / 2, 98, 30, '#fff6b0', '#ff9800');
  txt('장 클리어 보상', W / 2, 136, 16, '#8a6142', 'center', false);
  // 보물 상자
  const cx = W / 2, cy = 220, lid = Math.min(1, Math.max(0, (c.t - 0.25) * 2.5));
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = op; ctx.drawImage(ART.softDot('#ffe08a'), cx - 120, cy - 120, 240, 200); ctx.restore();
  RR(cx - 62, cy - 10, 124, 62, 10); ctx.fillStyle = ART.lgr(ctx, '#b06a2c', '#6e3a14', 0, cy - 10, 0, cy + 52); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#3e1f08'; ctx.stroke();
  ctx.fillStyle = '#ffd34d'; ctx.fillRect(cx - 62, cy + 6, 124, 8); ctx.fillRect(cx - 8, cy - 10, 16, 62); RR(cx - 10, cy + 2, 20, 18, 4); ctx.fill();
  ctx.save(); ctx.translate(cx, cy - 10); ctx.rotate(-lid * 0.5); RR(-64, -30, 128, 32, 14); ctx.fillStyle = ART.lgr(ctx, '#c98040', '#7a4218', 0, -30, 0, 2); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#3e1f08'; ctx.stroke(); ctx.fillStyle = '#ffd34d'; ctx.fillRect(-8, -30, 16, 32); ctx.restore();
  for (let k = 0; k < 8 && op > 0; k++) { const an = -Math.PI / 2 + (k - 3.5) * 0.28, r = 40 + op * 50; ART.star(ctx, cx + Math.cos(an) * r, cy - 20 + Math.sin(an) * r, 6 + (k % 3) * 2, '#fff3b0'); }
  ctx.globalAlpha = a * op;
  const rows = [['coin', `코인 +${c.coins}`], ['potion', `회복 물약 +${c.pot}`]];
  rows.forEach((r, i) => { const x = W / 2 - 230 + i * 160; RR(x, 296, 150, 54, 14); ctx.fillStyle = 'rgba(141,90,43,.14)'; ctx.fill(); ART.icon(ctx, r[0], x + 28, 323, 34); txt(r[1], x + 52, 323, 15, '#4e342e', 'left', false); });
  { const x = W / 2 + 90; RR(x, 296, 150, 54, 14); ctx.fillStyle = 'rgba(141,90,43,.14)'; ctx.fill(); ART.itemIcon(ctx, c.it, x + 6, 300, 46); ctx.font = `bold 13px ${FONT}`; txt(fitText(c.it.name, 86), x + 58, 314, 13, '#6a1b9a', 'left', false); txt(['일반', '고급', '희귀', '전설', '신화'][c.it.r] + ' 장비', x + 58, 334, 12, '#8a6142', 'left', false); }
  txt('장비는 가방에 들어갔어요 · 다음 장의 길이 열렸어요!', W / 2, 376, 14, '#7a5230', 'center', false);
  ctx.restore();
  if (c.t > 0.9) btn(W / 2 - 110, 410, 220, 54, '보상 받기!', () => { CHR = null; SFX.rare(); save(); }, { bg: '#5cc96b', size: 21, key: 'chr' });
}
function drawPromo() {
  const P = PROMO_POP; P.t += G.dt || 0.016; ui = []; dragH = null; const i = P.i, R = PROMO[i];
  ctx.save(); ctx.globalAlpha = Math.min(1, P.t * 3); ctx.fillStyle = 'rgba(15,6,0,.72)'; ctx.fillRect(-OX, 0, VW, H);
  ctx.save(); ctx.translate(W / 2, 250); ctx.rotate(G.time * 0.3); ctx.globalCompositeOperation = 'lighter'; for (let k = 0; k < 12; k++) { ctx.rotate(TAU / 12); ctx.fillStyle = 'rgba(255,215,110,.08)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-30, -380); ctx.lineTo(30, -380); ctx.closePath(); ctx.fill(); } ctx.restore();
  ART.panel(ctx, W / 2 - 260, 60, 520, 420, 'cream');
  bigText('2차 직업 승급!', W / 2, 104, 30, '#fff6b0', '#ff9800');
  ART.draw(ctx, UNITS[i].id, 'i0', W / 2 - 110, 330, 1.7, false, 0); txt('→', W / 2, 270, 36, '#e65100', 'center');
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(ART.softDot('#ffe082'), W / 2 + 30, 160, 160, 180); ctx.restore();
  ART.draw(ctx, unitSprite(i), 'c_happy', W / 2 + 110, 330, 1.85, false, 0);
  bigText(R.n, W / 2, 372, 24, '#fff3c4', '#e65100'); txt(R.d, W / 2, 404, 15, '#5a3412', 'center', false, null, 470);
  ctx.restore();
  if (P.t > 0.8) btn(W / 2 - 100, 420, 200, 48, '멋지다!', () => { PROMO_POP = null; }, { bg: '#5cc96b', size: 20, key: 'promo' });
}
function drawAwkPop() {
  const P = AWK_POP; P.t += G.dt || 0.016; ui = []; dragH = null; const i = P.i, a = awk(i), T = THIRD[i];
  ctx.save(); ctx.globalAlpha = Math.min(1, P.t * 3); ctx.fillStyle = 'rgba(20,6,30,.78)'; ctx.fillRect(-OX, 0, VW, H);
  ART.panel(ctx, W / 2 - 270, 70, 540, 400, 'cream'); bigText(`${UNITS[i].nick} 각성 ★${a}!`, W / 2, 114, 30, '#f6e0ff', '#9b4dff');
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.6 + Math.sin(G.time * 4) * 0.2; ctx.drawImage(ART.softDot('#d8b8ff'), W / 2 - 150, 130, 300, 240); ctx.restore();
  ART.draw(ctx, unitSprite(i), 'c_happy', W / 2, 330, 1.9, false, 0);
  for (let q = 0; q < 5; q++) ART.star(ctx, W / 2 - 60 + q * 30, 360, q < a ? 11 : 8, q < a ? '#b07cff' : 'rgba(160,140,180,.5)');
  txt(a >= 5 ? `고유 기술 「${T.sk}」 위력 1.5배!` : a >= 3 ? `고유 기술 「${T.sk}」 대기 시간 10초 → 7초!` : '체력 · 공격력 +12%!', W / 2, 394, 16, '#5a2a8a', 'center', false);
  txt('다음 각성: ' + (a >= 5 ? '최고 단계예요' : a === 2 ? '★3 — 고유 기술이 더 자주!' : a === 4 ? '★5 — 고유 기술 위력 1.5배!' : '체력·공격력 +12%'), W / 2, 418, 13, '#8a6142', 'center', false);
  ctx.restore();
  if (P.t > 0.8) btn(W / 2 - 100, 436, 200, 44, '좋아!', () => { AWK_POP = null; }, { bg: '#5cc96b', size: 18, key: 'awkok' });
}
function drawGrown() {
  const g = GROWN; g.t += G.dt || 0.016; ui = []; dragH = null;
  ctx.save(); ctx.globalAlpha = Math.min(1, g.t * 3); ctx.fillStyle = 'rgba(15,6,0,.7)'; ctx.fillRect(-OX, 0, VW, H);
  ART.panel(ctx, W / 2 - 260, 70, 520, 400, 'cream');
  bigText(`미르가 ${GROW_N[g.st]}으로 자랐어요!`, W / 2, 114, 28, '#fff6b0', '#ff9800');
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(ART.softDot('#fff3c0'), W / 2 - 160, 140, 320, 260); ctx.restore();
  ART.draw(ctx, heroType(), 'i' + (Math.floor(G.time * 2.4) % 3), W / 2 - 10, 360, 1.0, false, 0);
  txt(g.st === 1 ? '날개가 커지고 뿔이 자랐어요 · 미르의 불꽃 사거리·위력 UP' : '황금 굴레와 큰 날개! 미르의 불꽃이 가장 강해졌어요', W / 2, 392, 14, '#7a5230', 'center', false);
  ctx.restore();
  if (g.t > 0.8) btn(W / 2 - 100, 410, 200, 50, '좋아, 가자!', () => { GROWN = null; }, { bg: '#5cc96b', size: 20, key: 'grown' });
}
// v1.6 지도 끝 무지개 다리: 색깔 조각 수만큼 한 칸씩 자람
function drawShardBridge() {
  const LN = NODES[MAXST - 1], x0 = LN.x + 30, x1 = 24 + CHN * ZW + 20 + BRW - 40; if (x1 < mapX - 40 || x0 > mapX + W + 40) return;
  const c = shardsOwned(), y0 = LN.y, yE = 300, Y = t => y0 + (yE - y0) * t - Math.sin(t * Math.PI) * 120, X = t => x0 + (x1 - x0) * t;
  ctx.save(); ctx.lineCap = 'round';
  // 아직 안 생긴 칸: 점선 안내
  ctx.setLineDash([4, 10]); ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 3; ctx.beginPath(); for (let q = 0; q <= 40; q++) { const t = q / 40; q ? ctx.lineTo(X(t), Y(t)) : ctx.moveTo(X(t), Y(t)); } ctx.stroke(); ctx.setLineDash([]);
  // 생긴 칸: 일곱 줄 무지개 (얻은 조각 색만 밝게)
  const tEnd = c / 7;
  if (c > 0) { SHARDS.forEach((q, k) => { ctx.strokeStyle = k < c ? q.c : 'rgba(255,255,255,.45)'; ctx.lineWidth = 5; ctx.beginPath(); for (let i = 0; i <= 40; i++) { const t = tEnd * i / 40; const yy = Y(t) - 15 + k * 5; i ? ctx.lineTo(X(t), yy) : ctx.moveTo(X(t), yy); } ctx.stroke(); });
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.6 + Math.sin(G.time * 3) * 0.3; ctx.drawImage(ART.softDot('#fff6d0'), X(tEnd) - 40, Y(tEnd) - 50, 80, 80); ctx.restore(); }
  // 칸 표시 (7개)
  for (let k = 0; k < 7; k++) { const t = (k + 0.5) / 7, on = k < c; ctx.beginPath(); ctx.arc(X(t), Y(t) + 26, 11, 0, TAU); ctx.fillStyle = on ? SHARDS[k].c : 'rgba(255,255,255,.55)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = on ? '#fff' : 'rgba(120,90,60,.5)'; ctx.stroke(); if (!mapCov(X(t), Y(t) + 27)) txt(on ? '★' : '?', X(t), Y(t) + 27, 11, on ? '#fff' : '#8a6a4a', 'center', false); }
  ctx.restore();
  const mx = X(0.5); ART.panel(ctx, mx - 150, yE + 104, 300, 48, 'dark');
  if (c >= 7) { bigText('무지개 다리 완성!', mx, yE + 120, 18, '#ffffff', '#ff6ad5'); for (let k = 0; k < 7; k++) ART.star(ctx, mx - 90 + k * 30, yE + 96 + Math.sin(G.time * 4 + k) * 4, 5, SHARDS[k].c); } else txt(`무지개 다리 ${c} / 7칸`, mx, yE + 120, 16, '#ffe082', 'center'); txt('새 친구를 사귈 때마다 한 칸씩 자라요', mx, yE + 140, 11, '#fff3c4', 'center', false);
}
// v1.6 색깔 조각을 얻었을 때 연출 (지도에 돌아오면 한 번)
let SHARDP = null;
// v2.6 400판 축하 (한 번)
let CEL = null;
function drawCel400() {
  const P = CEL; P.t += G.dt || 0.016; ui = []; dragH = null;
  ctx.save(); ctx.globalAlpha = Math.min(1, P.t * 3); ctx.fillStyle = 'rgba(10,4,24,.82)'; ctx.fillRect(-OX, 0, VW, H); ctx.restore();
  for (let k = 0; k < 9; k++) { const q = ((P.t * 0.5 + k / 9) % 1), cx = 120 + (k * 97) % 720, cy = 260 - q * 160, c = ['#ff7a8a', '#ffd34d', '#7ac8ff', '#9ae08a', '#c8a0ff'][k % 5]; if (q > 0.55) { const r = (q - 0.55) * 260; ctx.save(); ctx.globalAlpha = 1 - (q - 0.55) / 0.45; for (let a = 0; a < 12; a++) { const an = a / 12 * TAU; ART.star(ctx, cx + Math.cos(an) * r, cy + Math.sin(an) * r, 4, c); } ctx.restore(); } else { ctx.fillStyle = c; ctx.fillRect(cx - 1.5, cy, 3, 10); } }
  pkFrame(W / 2 - 300, 120, 600, 330, 'royal', { gem: '#ff9ac8' }); pkRibbon(W / 2, 100, '400판 축하!', '#ff6ad5', 300);
  ['hero', 'u0', 'u9', 'u6', 'u3'].forEach((k, i) => { const x = W / 2 - 200 + i * 100, y = 300 - Math.abs(Math.sin(P.t * 5 + i)) * 18; ART.draw(ctx, k === 'hero' ? heroType() : k, 'i' + (Math.floor(G.time * 2.4 + i) % 3), x, y, k === 'hero' ? 0.6 : 0.8, false, 0); });
  bigText('다섯 나라 + 장난감 왕국 = 여섯 나라 축제!', W / 2, 340, 22, '#fff6d0', '#ff6ad5');
  txt('400판까지 함께 짖어 준 고마운 기사님께 · 코인 10000 · 별가루 10', W / 2, 374, 14, '#ffe9a8', 'center', false);
  if (P.t > 1) pkBtn(W / 2 - 110, 394, 220, 50, '축제 즐기기!', () => { S.cel400 = 1; S.coins += 10000; S.dust = (S.dust || 0) + 10; save(); SFX.coin(); CEL = null; }, { bg: '#ff6ad5', size: 20, key: 'cel', shine: true });
}
function checkShardPop() { if (S.cleared >= 400 && !S.cel400 && !CEL) CEL = { t: 0 }; const c = shardsOwned(); if (S.shardSeen == null) S.shardSeen = 0; if (c > S.shardSeen && !SHARDP) SHARDP = { t: 0, i: c - 1 }; }
function drawShardPop() {
  const P = SHARDP; P.t += G.dt || 0.016; ui = []; dragH = null; const q = SHARDS[P.i];
  ctx.save(); ctx.globalAlpha = Math.min(1, P.t * 3); ctx.fillStyle = 'rgba(15,6,20,.78)'; ctx.fillRect(-OX, 0, VW, H);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.7; ctx.drawImage(ART.softDot(q.c), W / 2 - 200, 40, 400, 340); ctx.restore();
  for (let k = 0; k < 12; k++) { const a = k / 12 * TAU + P.t * 0.6; ctx.strokeStyle = q.c; ctx.globalAlpha = 0.35; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(W / 2 + Math.cos(a) * 70, 200 + Math.sin(a) * 70); ctx.lineTo(W / 2 + Math.cos(a) * (130 + Math.sin(P.t * 4 + k) * 20), 200 + Math.sin(a) * (130 + Math.sin(P.t * 4 + k) * 20)); ctx.stroke(); }
  ctx.globalAlpha = Math.min(1, P.t * 3);
  const sc = Math.min(1, P.t * 2.2), r = 52 * sc, wob = Math.sin(P.t * 3) * 0.2; ctx.save(); ctx.translate(W / 2, 200); ctx.rotate(wob);
  ctx.beginPath(); ctx.moveTo(0, -r * 1.2); ctx.lineTo(r * 0.8, -r * 0.2); ctx.lineTo(r * 0.5, r); ctx.lineTo(-r * 0.5, r); ctx.lineTo(-r * 0.8, -r * 0.2); ctx.closePath(); ctx.fillStyle = ART.lgr(ctx, '#ffffff', q.c, 0, -r, 0, r); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#ffffff'; ctx.stroke(); ctx.restore();
  bigText(`${q.n} 색깔 조각 · 「${q.m}」`, W / 2, 316, 30, '#fff6d0', q.c);
  txt(`${q.by}에게서 받은 조각`, W / 2, 352, 15, '#fff3c4', 'center');
  SHARDS.forEach((z, k) => { const x = W / 2 - 150 + k * 50, on = k <= P.i, now = k === P.i; ctx.beginPath(); ctx.arc(x, 398, now ? 16 + Math.sin(P.t * 6) * 2 : 14, 0, TAU); ctx.fillStyle = on ? z.c : 'rgba(255,255,255,.18)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke(); });
  if (P.i === 6) { // v2.2 일곱 번째 조각: 무지개 다리 완성
    if (!S.bridgeDone) { S.bridgeDone = 1; S.coins += 7000; S.dust = (S.dust || 0) + 7; save(); SFX.rare(); }
    for (let k = 0; k < 7; k++) { const a = k / 7 * TAU + P.t * 0.9, rr = 150 + Math.sin(P.t * 3 + k) * 12; ART.star(ctx, W / 2 + Math.cos(a) * rr, 200 + Math.sin(a) * rr * 0.6, 9, SHARDS[k].c); }
    bigText('🌈 무지개 다리 완성!', W / 2, 70, 34, '#ffffff', '#ff6ad5');
    txt('일곱 빛이 모두 모였어요! 혼자 짖으면 소리, 함께 짖으면 노래 · 보상 코인 7000 · 별가루 7', W / 2, 434, 14, '#ffe082', 'center');
  } else txt(`색깔 조각 ${P.i + 1} / 7 · 무지개 다리가 자랐어요!`, W / 2, 434, 14, '#ffe082', 'center');
  ctx.restore();
  if (P.t > 0.9) btn(W / 2 - 100, 456, 200, 48, '다리 보러 가기', () => { S.shardSeen = shardsOwned(); save(); SHARDP = null; mapTab = 0; mapTX = clampMap(NODES[MAXST - 1].x + 160 - W / 2); }, { bg: '#5cc96b', size: 18, key: 'shardok' });
}
function fitText(s, w) { if (ctx.measureText(s).width <= w) return s; while (s.length > 1 && ctx.measureText(s + '…').width > w) s = s.slice(0, -1); return s + '…'; }
// v2.9 고급 구름: 여러 겹 솜뭉치 + 위는 밝고 아래는 푸른 그늘 + 가장자리 빛 (미리 그려 둠)
const CLOUDC = [];
function cloudSprite(v) { if (CLOUDC[v]) return CLOUDC[v]; const c = document.createElement('canvas'); c.width = 300; c.height = 160; const g = c.getContext('2d');
  let sd = 17 + v * 31; const R = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
  const puffs = []; const n = 7 + v * 2; for (let k = 0; k < n; k++) { const t = k / (n - 1), x = 50 + t * 200 + (R() - 0.5) * 20, r = 26 + Math.sin(t * Math.PI) * 30 + R() * 10, y = 100 - Math.sin(t * Math.PI) * 26 - R() * 10; puffs.push([x, y, r]); }
  for (let k = 0; k < 4; k++) puffs.push([90 + R() * 120, 60 + R() * 20, 22 + R() * 14]);
  // 그늘 층
  for (const [x, y, r] of puffs) { const rg = g.createRadialGradient(x, y + r * 0.4, r * 0.2, x, y + r * 0.3, r); rg.addColorStop(0, 'rgba(176,196,226,.95)'); rg.addColorStop(1, 'rgba(176,196,226,0)'); g.fillStyle = rg; g.beginPath(); g.arc(x, y + 6, r, 0, Math.PI * 2); g.fill(); }
  // 몸통 (흰색, 위쪽 밝게)
  for (const [x, y, r] of puffs) { const rg = g.createRadialGradient(x - r * 0.25, y - r * 0.35, r * 0.1, x, y, r); rg.addColorStop(0, '#ffffff'); rg.addColorStop(0.65, 'rgba(250,252,255,.98)'); rg.addColorStop(1, 'rgba(232,240,252,0)'); g.fillStyle = rg; g.beginPath(); g.arc(x, y, r * 0.96, 0, Math.PI * 2); g.fill(); }
  // 아래 평평한 그늘 띠
  const bg = g.createLinearGradient(0, 96, 0, 140); bg.addColorStop(0, 'rgba(190,206,232,0)'); bg.addColorStop(1, 'rgba(160,180,215,.55)'); g.globalCompositeOperation = 'source-atop'; g.fillStyle = bg; g.fillRect(0, 96, 300, 64);
  // 가장자리 햇빛
  const lg = g.createLinearGradient(0, 20, 0, 70); lg.addColorStop(0, 'rgba(255,248,220,.5)'); lg.addColorStop(1, 'rgba(255,248,220,0)'); g.fillStyle = lg; g.fillRect(0, 0, 300, 80); g.globalCompositeOperation = 'source-over';
  CLOUDC[v] = c; return c; }
function drawStages() {
  if (!mapBg) buildMapBg();
  const next = Math.min(MAXST, S.cleared + 1), NC = NODES[next - 1];
  if (mapX === null) { mapTX = clampMap(NC.x - W / 2); mapX = mapTX; }
  mapX += (mapTX - mapX) * Math.min(1, G.dt * 12 || 0.2);
  if (!popup) mapDrag();
  ctx.save(); ctx.beginPath(); ctx.rect(-OX, 56, VW, H - 56); ctx.clip(); ctx.fillStyle = '#8fc8e2'; ctx.fillRect(-OX, 56, VW, H - 56);
  let built = false; { const sx0 = (mapX - OX) * MS, sx1 = sx0 + VW * MS, k = 1 / MS; MAP_IDLE += G.dt || 0.016; for (const t of mapBg) { const a = Math.max(sx0, t.x), b = Math.min(sx1, t.x + t.w); if (b <= a) continue; if (!t.c && !built) { buildMapTile(t); built = true; } if (!t.c) { ctx.fillStyle = '#f3e3c0'; ctx.fillRect((a - sx0) * k - OX, 56, (b - a) * k, H - 56); continue; } ctx.drawImage(t.c, a - t.x, 0, b - a, H * MS, (a - sx0) * k - OX, 0, (b - a) * k, H); } }
  if (!built && MAP_IDLE > 0.6 && !(dragH && dragH.id != null) && Math.abs(mapTX - mapX) < 2) { const sx0 = (mapX - OX) * MS, sx1 = sx0 + VW * MS; const nb = mapBg.filter(t => !t.c && t.x + t.w > sx0 - MTW && t.x < sx1 + MTW).sort((a, b) => Math.abs(a.x - sx0) - Math.abs(b.x - sx0))[0]; if (nb) { buildMapTile(nb); MAP_IDLE = 0; } }
  ctx.translate(-mapX, 0);
  // 지나온 길: 황금빛 발자국 길
  if (S.cleared > 0) {
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    mapPath(ctx, next); ctx.lineWidth = 9; ctx.strokeStyle = 'rgba(255,200,60,.55)'; ctx.stroke();
    mapPath(ctx, next); ctx.lineWidth = 3; ctx.setLineDash([8, 10]); ctx.lineDashOffset = -G.time * 24; ctx.strokeStyle = '#fff6c0'; ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
  }
  for (const N of NODES) {
    if (N.x < mapX - 40 || N.x > mapX + W + 40) continue;
    const open = N.n <= S.cleared + 1, cur = N.n === next, boss = N.n % CHL === 0, mid = N.n % CHL === 5, r = boss ? 27 : mid ? 19 : 16, st = S.stars[N.n] || 0, done = st > 0;
    if (cur) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.6 + Math.sin(G.time * 4) * 0.3; ctx.drawImage(ART.softDot('#fff59d'), N.x - 42, N.y - 42, 84, 84); ctx.restore(); ctx.strokeStyle = `rgba(255,240,150,${0.5 + Math.sin(G.time * 4) * 0.4})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(N.x, N.y, r + 7 + Math.sin(G.time * 4) * 2, 0, TAU); ctx.stroke(); }
    ctx.fillStyle = 'rgba(40,20,5,.4)'; circ(N.x, N.y + 4, r + 3);
    // 테두리 링 (금 = 클리어 · 은 = 열림 · 돌 = 잠김)
    const ring = !open ? ['#bdb5ac', '#7d746b'] : done ? ['#fff0a0', '#b8770f'] : ['#ffffff', '#a9b4c0'];
    ctx.fillStyle = done ? ART.goldG(ctx, N.y - r - 4, N.y + r + 4) : ART.lgr(ctx, ring[0], ring[1], 0, N.y - r - 3, 0, N.y + r + 3); circ(N.x, N.y, r + (done ? 4 : 3)); /* v2.6 깬 판은 금테 */
    const face = !open ? '#9e9890' : boss ? '#ffe0d8' : mid ? '#ff9f43' : done ? '#ffcf3a' : '#fff3d6';
    ctx.fillStyle = ART.rg(ctx, face, N.x, N.y, r, 0.45, 0.25); circ(N.x, N.y, r - 1);
    ctx.lineWidth = 2; ctx.strokeStyle = '#4a2a14'; ctx.beginPath(); ctx.arc(N.x, N.y, r + 3, 0, TAU); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.45)'; ART.E(ctx, N.x - r * 0.3, N.y - r * 0.45, r * 0.42, r * 0.2); ctx.fill();
    if (boss) { const k = BOSSES[N.z]; ctx.save(); ctx.beginPath(); ctx.arc(N.x, N.y, r - 2, 0, TAU); ctx.clip(); ctx.fillStyle = done ? '#fff3c4' : open ? '#ffd6d0' : '#cfc6bd'; ctx.fillRect(N.x - r, N.y - r, r * 2, r * 2); if (!open) ctx.globalAlpha = 0.45; { const fr = done ? 'c_happy' : 'i' + (Math.floor(G.time * 2) % 3), bf = BOSS_FACE[k]; if (bf) { const sc = (r - 2) / bf[2] * 1.05; ART.draw(ctx, k, fr, N.x + bf[0] * sc, N.y - bf[1] * sc + 2, sc, true, 0); } else ART.drawFit(ctx, k, fr, N.x, N.y + 3, r * 2.3, r * 2.1, { flip: true, face: 0.66 }); } /* v3.8 보스마다 그림 크기가 달라 원 밑으로 빠져 안 보이던 문제 → 얼굴·윗몸이 원 안에 꽉 차게 */ ctx.restore();
      ctx.lineWidth = 3; ctx.strokeStyle = done ? '#d9a830' : open ? '#c0392b' : '#7a6a5a'; ctx.beginPath(); ctx.arc(N.x, N.y, r - 1, 0, TAU); ctx.stroke();
      RR(N.x - 17, N.y + r - 8, 34, 16, 8); ctx.fillStyle = open ? '#c0392b' : '#7a6a5a'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#4a1a0a'; ctx.stroke(); if (!mapCov(N.x, N.y + r)) txt('' + N.n, N.x, N.y + r, 11, '#fff', 'center', false); }
    else if (open) { if (!mapCov(N.x, N.y)) txt('' + N.n, N.x, N.y + 1, N.n >= 100 ? 11 : 13, mid ? '#fff' : '#5a3412', 'center', mid); } else ART.icon(ctx, 'lock', N.x, N.y, 18);
    if (boss && open) { ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.moveTo(N.x - 10, N.y - r - 1); ctx.lineTo(N.x - 10, N.y - r - 11); ctx.lineTo(N.x - 5, N.y - r - 5); ctx.lineTo(N.x, N.y - r - 13); ctx.lineTo(N.x + 5, N.y - r - 5); ctx.lineTo(N.x + 10, N.y - r - 11); ctx.lineTo(N.x + 10, N.y - r - 1); ctx.closePath(); ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#6a3a0a'; ctx.stroke(); }
    if (mid && open) ART.icon(ctx, 'star', N.x + r, N.y - r + 2, 13);
    if (boss && open) { [0, 1, 2, 3].forEach(q => { const a = q * Math.PI / 2 + Math.PI / 4; ART.gem(ctx, N.x + Math.cos(a) * (r + 3), N.y + Math.sin(a) * (r + 3), 3.4, done ? '#5ab0ff' : '#ff4a6a'); }); }
    if (done && !boss && st >= 3) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25 + Math.sin(G.time * 2 + N.n) * 0.15; ctx.drawImage(ART.softDot('#fff2a0'), N.x - r * 1.6, N.y - r * 1.6, r * 3.2, r * 3.2); ctx.restore(); }
    const sy = boss ? 10 : 0; if (st) { RR(N.x - 19, N.y + r + 2 + sy, 38, 13, 6.5); ctx.fillStyle = 'rgba(40,20,5,.7)'; ctx.fill(); for (let k = 0; k < 3; k++) ART.icon(ctx, k < st ? 'star' : 'starOff', N.x - 11 + k * 11, N.y + r + 8.5 + sy, 11); }
  }
  drawHunt(); /* v4.2 */
  // 주인공 표시 + 화살표
  const hb = Math.abs(Math.sin(G.time * 3)) * -5;
  ctx.fillStyle = 'rgba(40,20,5,.3)'; ART.E(ctx, NC.x, NC.y - 14, 26, 5); ctx.fill();
  for (let q = 0; q < 2; q++) { const ii = S.deck[q]; if (ii == null) continue; const dx = q ? 34 : -34; ctx.fillStyle = 'rgba(40,20,5,.25)'; ART.E(ctx, NC.x + dx, NC.y - 12, 13, 3); ctx.fill(); drawCuteDog('mp' + q, UNITS[ii].id, unitSprite(ii), NC.x + dx, NC.y - 12, 0.36, { flip: q === 1, ph: q, emy: 30, emx: 4 }); }
  ART.draw(ctx, heroType(), 'i' + (Math.floor(G.time * 2.4) % 3), NC.x, NC.y - 14 + hb, mounted() ? mountK() * 0.44 : 0.55, false, 0);
  // 장 머리말: 진행도 · 별뼈 · 보상 상자 (두루마리 아래, 겹치지 않게)
  const curZ = Math.floor((next - 1) / CHL);
  for (let z = 0; z < CHN; z++) {
    const x0 = 24 + z * ZW, w = ZW - 10; if (x0 > mapX + W || x0 + w < mapX) continue;
    const done = Math.max(0, Math.min(CHL, S.cleared - z * CHL)), bone = done >= CHL, cx = x0 + w / 2, cy = 152;
    if (z === curZ) { ctx.save(); ctx.globalAlpha = 0.35 + Math.sin(G.time * 3) * 0.2; ctx.fillStyle = '#fff59d'; ctx.fillRect(x0 - 2, 106, w + 4, 4); ctx.fillRect(x0 - 2, H - 16, w + 4, 4); ctx.restore(); }
    RR(cx - 82, cy - 11, 164, 22, 11); ctx.fillStyle = 'rgba(40,20,5,.62)'; ctx.fill();
    bar(cx - 76, cy - 6, 84, 12, done / CHL, bone ? '#ffd34d' : '#7ed957');
    txt(`${done}/${CHL}`, cx + 26, cy + 0.5, 11, '#fff3c4', 'center', false);
    ART.bone(ctx, cx + 52, cy, 16, bone ? '#ffe27a' : 'rgba(255,255,255,.35)', -0.4);
    const claimed = S.chRew && S.chRew[z]; if (bone && !claimed) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.6 + Math.sin(G.time * 6) * 0.35; ctx.drawImage(ART.softDot('#ffd34d'), cx + 52, cy - 20, 40, 40); ctx.restore(); if (Math.floor(G.time * 2) % 2) txt('받기!', cx + 72, cy + 20, 10, '#fff59d', 'center'); } ctx.save(); ctx.translate(cx + 72, cy + 1); ctx.fillStyle = claimed ? '#ffd34d' : bone ? '#c98040' : 'rgba(200,170,130,.55)'; RR(-7, -4, 14, 9, 2); ctx.fill(); ctx.fillStyle = claimed ? '#fff3b0' : 'rgba(120,70,30,.8)'; RR(-8, -8, 16, 5, 2); ctx.fill(); ctx.restore();
    if (bone) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 + Math.sin(G.time * 4 + z) * 0.3; ctx.drawImage(ART.softDot('#ffe27a'), cx + 36, cy - 16, 32, 32); ctx.restore(); }
  }
  // 떠다니는 구름·새·반짝이
  drawShardBridge();
  for (let k = 0; k < 7; k++) { const sc = 0.7 + (k % 3) * 0.25, cx = ((k * 977 + G.time * (8 + k * 3)) % (MAPW + 500)) - 250, cy = 120 + (k * 73) % 300; if (cx < mapX - 260 || cx > mapX + W + 260) continue; const c = cloudSprite(k % 4); ctx.save(); ctx.globalAlpha = 0.42; /* v3.8 지나가는 구름이 판 번호·보스를 가려 옅게 */ ctx.fillStyle = 'rgba(40,60,90,.10)'; ART.E(ctx, cx, cy + 70 * sc, 110 * sc, 14 * sc); ctx.fill(); ctx.drawImage(c, cx - c.width * sc / 2, cy - c.height * sc / 2, c.width * sc, c.height * sc); ctx.restore(); } /* v2.8.1 입체 구름 */
  for (let k = 0; k < 5; k++) { const bx = ((k * 613 + G.time * 60) % (MAPW + 200)) - 100, by = 140 + (k * 59) % 120 + Math.sin(G.time * 2 + k) * 8, f = Math.sin(G.time * 10 + k) * 4; if (bx < mapX - 40 || bx > mapX + W + 40) continue; ctx.strokeStyle = 'rgba(60,40,30,.7)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(bx - 7, by - f); ctx.quadraticCurveTo(bx - 3, by - 3, bx, by); ctx.quadraticCurveTo(bx + 3, by - 3, bx + 7, by - f); ctx.stroke(); }
  for (let k = 0; k < 24; k++) { const sx3 = (k * 271) % MAPW, sy3 = 130 + (k * 157) % 380; if (sx3 < mapX || sx3 > mapX + W) continue; ctx.globalAlpha = Math.max(0, Math.sin(G.time * 2.5 + k * 1.7)); ART.star(ctx, sx3, sy3, 3, '#fffbe0'); } ctx.globalAlpha = 1;
  ctx.restore();
  // 화면 고정 장식: 금박 액자 테두리
  ctx.save(); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(200,160,100,.8)'; ctx.strokeRect(3 - OX, 59, VW - 6, H - 62); /* v2.7 금테 완화 */ ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(90,50,10,.7)'; ctx.strokeRect(8 - OX, 64, VW - 16, H - 72);
  [[10 - OX, 66, 1, 1], [W - 10 + OX, 66, -1, 1], [10 - OX, H - 10, 1, -1], [W - 10 + OX, H - 10, -1, -1]].forEach(([x, y, dx, dy]) => { ctx.fillStyle = '#d9a830'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + dx * 26, y); ctx.quadraticCurveTo(x + dx * 10, y + dy * 10, x, y + dy * 26); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#6a3a0a'; ctx.lineWidth = 1; ctx.stroke(); ART.star(ctx, x + dx * 9, y + dy * 9, 4, '#fff6c0'); });
  ctx.restore();
  // 제목 카르투슈, 나침반
  ART.panel(ctx, W / 2 - 150, 62, 300, 40, 'wood'); ART.paw(ctx, W / 2 - 110, 82, 1.1, '#ffcf5a'); ART.paw(ctx, W / 2 + 110, 82, 1.1, '#ffcf5a'); txt('뼈다귀 왕국 전도', W / 2, 82, 17, '#fff3c4', 'center');
  edgeOn(-1);
  ctx.save(); ctx.translate(46, 84); ctx.scale(0.62, 0.62); ctx.rotate(Math.sin(G.time * 0.5) * 0.05); ctx.globalAlpha = 0.95; ART.E(ctx, 0, 0, 30, 30); ctx.fillStyle = 'rgba(255,248,230,.85)'; ctx.fill(); ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 2; ctx.stroke();
  for (let k = 0; k < 4; k++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(0, -26); ctx.lineTo(5, 0); ctx.lineTo(-5, 0); ctx.closePath(); ctx.fillStyle = k === 3 ? '#e53935' : '#8a5a2b'; ctx.fill(); }
  ctx.restore(); txt('N', 46, 66, 10, '#e53935', 'center');
  edgeOff();
  // 스크롤 바 & 화살표
  const tw = W - 240, tx = 120; RR(tx, H - 14, tw, 6, 3); ctx.fillStyle = 'rgba(60,30,10,.25)'; ctx.fill();
  const kw = tw * W / MAPW; RR(tx + (tw - kw) * (mapX / (MAPW - W)), H - 14, kw, 6, 3); ctx.fillStyle = '#c0782f'; ctx.fill();
  if (!popup) {
    edgeOn(-1);
    if (mapTX > 2) btn(8, 310, 44, 64, '◀', () => { mapTX = clampMap(mapTX - 420); }, { bg: '#c9a983', size: 20, key: 'mapL' });
    { const sk = seasonNow(); if (sk) { const Z = SEASONS[sk]; ART.panel(ctx, 14, 418, 270, 40, 'dark'); ART.star(ctx, 34, 438, 7, Z.c); txt(`계절 이벤트 · ${Z.n}`, 50, 430, 13, Z.c, 'left', false); txt(Z.d, 50, 448, 10.5, '#fff3d6', 'left', false, null, 226); } }
    { const w = weatherNow(), Wd = RW[w.k], sk2 = seasonNow(), wy = sk2 ? 374 : 418; ctx.save(); ctx.beginPath(); ctx.rect(-OX, 56, VW, H - 56); ctx.clip(); drawRealWeather(w, false); ctx.restore(); { const wd = Wd.d; ctx.font = `bold 13.5px ${FONT}`; if ('letterSpacing' in ctx) ctx.letterSpacing = '0.4px'; const two = ctx.measureText(wd).width > 244, py = two ? wy - 16 : wy; /* v5.0 길면 두 줄 (비 오는 날 설명이 6px까지 줄던 것) */
      ART.panel(ctx, 14, py, 270, two ? 56 : 40, 'dark'); txt(`${Wd.ic} 지금 날씨 · ${Wd.n}${w.night ? ' · 밤 (박쥐 +20%)' : ''}`, 30, py + 12, 13, Wd.c, 'left', false); if (two) fitWrap(wd, 30, py + 30, 250, 11, '#fff3d6', 14, 2); else txt(wd, 30, wy + 30, 11, '#fff3d6', 'left', false, null, 250); } }
    { const de = dayEv(); ART.panel(ctx, 14, 462, 270, 40, 'dark'); ART.star(ctx, 34, 482, 7, '#ffd34d'); txt(`오늘의 이벤트 · ${de.n}`, 50, 474, 13, '#ffe082', 'left', false); txt(de.d, 50, 492, 11, '#fff3d6', 'left', false, null, 226); }
    edgeOff(); edgeOn(1);
    if (mapTX < MAPW - W - 2) btn(W - 52 + 0, 310, 44, 64, '▶', () => { mapTX = clampMap(mapTX + 420); }, { bg: '#c9a983', size: 20, key: 'mapR' });
    btn(W - 136, 62, 128, 36, '현재 위치', () => { mapTX = clampMap(NC.x - W / 2); }, { bg: '#d88a1a', size: 16, key: 'mapNow' });
    { ensureDaily(); const D = S.daily, red = S.att.last !== todayKey() || MISSIONS_D.some((m, k) => D[m.f] >= m.goal && !D.got[k]);
      btn(W - 136, 222, 128, 36, '🏡 멍멍 마을', () => { VILP = { t: 0 }; }, { bg: '#3a9a4a', size: 16, key: 'mapVil' });
      btn(W - 136, 262, 128, 36, '🏆 랭킹', () => { RANKP = { t: 0, tab: 0 }; }, { bg: '#c8901a', size: 16, key: 'mapRank' }); /* v4.0 */
      btn(W - 136, 182, 128, 36, '🛒 상점', () => { SHOPP = { t: 0 }; }, { bg: '#e0762a', size: 16, key: 'mapShop' });
      { const bx = W - 204 - Math.abs(Math.sin(G.time * 3)) * 3; RR(bx, 190, 64, 20, 10); ctx.fillStyle = '#e8323a'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#fff'; ctx.stroke(); txt('오늘 할인', bx + 32, 200, 11.5, '#fff', 'center', false); ctx.beginPath(); ctx.moveTo(bx + 64, 195); ctx.lineTo(bx + 70, 200); ctx.lineTo(bx + 64, 205); ctx.fillStyle = '#e8323a'; ctx.fill(); } /* v3.0 상점 할인 표시 */
      if (vilHasGift()) { const by = 220 - Math.abs(Math.sin(G.time * 3 + 1)) * 3; ctx.beginPath(); ctx.arc(W - 14, by, 11, 0, TAU); ctx.fillStyle = '#ff5a3a'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke(); txt('!', W - 14, by + 1, 14, '#fff', 'center', false); } /* v3.0 마을에 받을 것 있음 */
      btn(W - 136, 102, 128, 36, '📅 할 일·도전', () => { DAILY = { t: 0 }; }, { bg: '#e0662a', size: 15, key: 'mapDaily' }); /* v4.4 오늘의 할 일 + 주간 도전 한 단추 */
      { const dn = S.stickers && S.stickers['w' + weekNo()]; btn(W - 136, 142, 128, 36, '⚔ 보스 도전', () => { if (S.cleared < CHL) { mapToast = { s: '10판을 깨면 열려요', t: 1.6 }; return; } BHP = { t: 0 }; S.bhDay = todayKey(); }, { bg: '#c0392b', size: 16, key: 'mapBH' }); if (S.cleared >= CHL && bhToday() >= 0 && S.bhDay !== todayKey()) { ctx.fillStyle = '#ff3b30'; circ(W - 16, 146, 7); txt('!', W - 16, 146, 11, '#fff', 'center', false); } if (!dn && S.cleared >= 10) S._wkRed = 1; else S._wkRed = 0; } /* v4.4 주간 도전은 「오늘의 할 일」 창 안으로 합치고 그 자리에 보스 도전 */
      if (red || S._wkRed) { ctx.fillStyle = '#ff3b30'; circ(W - 16, 106, 7); txt('!', W - 16, 106, 11, '#fff', 'center', false); } }
    edgeOff();
    ctx.globalAlpha = 0.85; ART.panel(ctx, W / 2 - 160, H - 46, 320, 26, 'dark'); ctx.globalAlpha = 1; txt('드래그 · ←→ 키로 이동 · 스테이지를 눌러 출전!', W / 2, H - 33, 12, '#fff3c4', 'center', false);
  }
  if (mapToast) { mapToast.t -= G.dt || 0.016; ctx.globalAlpha = Math.min(1, mapToast.t * 3); ART.panel(ctx, W / 2 - 170, 110, 340, 34, 'dark'); txt(mapToast.s, W / 2, 127, 14, '#ffcf6b', 'center', false); ctx.globalAlpha = 1; if (mapToast.t <= 0) mapToast = null; }
  if (popup) drawStagePopup(popup);
}
function drawStagePopup(n) {
  ui = ui.filter(b => b.key && b.key.startsWith('tab'));
  ctx.fillStyle = 'rgba(20,8,0,.55)'; ctx.fillRect(-OX, 56, VW, H);
  uiPush({ x: 0, y: 56, w: W, h: H, tap: () => { popup = 0; }, key: 'dim' });
  const si = stageInfo(n), x = W / 2 - 260, y = 84, w = 520, h = 380;
  ART.panel(ctx, x, y, w, h, 'cream');
  uiPush({ x, y, w, h, tap: () => {}, key: 'pbody' });
  bigText(`STAGE ${n}`, W / 2, y + 36, 34, '#fff6b0', '#ffb300');
  txt(`「${si.name}」`, W / 2, y + 68, 19, '#5a3412', 'center', false);
  txt(CH_NAMES[si.ch] + `  ${si.sub}/${CHL}`, W / 2, y + 90, 13, '#a0652a', 'center', false);
  const mc = si.boss ? '#e53935' : si.mid ? '#ff9f43' : si.totems ? '#9b6bff' : '#43b05c';
  RR(x + 30, y + 100, w - 60, 30, 15); ctx.fillStyle = ART.rgba(mc, 0.16); ctx.fill(); ctx.strokeStyle = mc; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.font = `bold 12px ${FONT}`; const pw = ctx.measureText('임무 · ' + si.mis.n).width + 22;
  RR(x + 34, y + 103, pw, 24, 12); ctx.fillStyle = mc; ctx.fill(); txt('임무 · ' + si.mis.n, x + 34 + pw / 2, y + 115.5, 12, '#fff', 'center', false);
  txt(si.mis.d, x + 44 + pw, y + 115.5, 11.5, '#5a3412', 'left', false, null, w - 84 - pw);
  ctx.save(); ctx.translate(0, 40);
  txt('등장 몬스터', x + 34, y + 112, 14, '#7a5230', 'left', false);
  const list = si.pool.concat(si.bossKey ? [si.bossKey] : si.midKey && !si.pool.includes(si.midKey) ? [si.midKey] : []).slice(0, 7);
  list.forEach((k, i) => { const cx = x + 64 + i * 64; ctx.fillStyle = 'rgba(141,90,43,.12)'; RR(cx - 30, y + 124, 60, 66, 10); ctx.fill(); ctx.save(); RR(cx - 30, y + 124, 60, 66, 10); ctx.clip(); ART.draw(ctx, k, 'i0', cx, y + (k === 'bat' ? 222 : 184), ENEMIES[k].boss ? 0.3 : 0.62, true, 0); ctx.restore(); txt(ENEMIES[k].name.split(' ').pop(), cx, y + 200, 10, '#5d3d22', 'center', false); });
  const st = S.stars[n] || 0;
  txt('최고 기록', x + 34, y + 232, 14, '#7a5230', 'left', false);
  for (let k = 0; k < 3; k++) ART.icon(ctx, k < st ? 'star' : 'starOff', x + 130 + k * 30, y + 232, 26);
  txt('클리어 보상', x + 300, y + 232, 14, '#7a5230', 'left', false); ART.icon(ctx, 'coin', x + 400, y + 232, 20); txt('' + (40 + n * 20), x + 414, y + 233, 16, '#3e2723', 'left', false);
  ctx.restore();
  btn(x + 40, y + 312, 150, 52, '닫기', () => { popup = 0; }, { bg: '#a99a8a', key: 'pclose' });
  btn(x + 210, y + 312, 270, 52, '출전!', () => { const k = n; popup = 0; enterStage(k); }, { bg: '#ff7a45', size: 24, key: 'pgo' });
}
function drawUpgrades() {
  const items = UPS.concat([{ k: 'potion', name: '회복 물약 구매', desc: '체력 60% 회복', ic: 'potion' }]);
  ART.panel(ctx, 14, 60, W - 28, 32, 'dark'); ART.star(ctx, 36, 76, 8, '#b07cff'); txt(`별가루 ${S.dust || 0}`, 50, 77, 15, '#e8d8ff', 'left');
  txt('보스 판 첫 클리어 5 · 다시 깨기 2 · 정예 몬스터 · 주간 도전 8', 170, 77, 11, '#d8c8b0', 'left', false, null, 480);
  btn(W - 186, 62, 166, 28, '각성 미리 보기', () => { AWKINFO = { t: 0 }; }, { bg: '#b07cff', size: 13, key: 'awkinfo' });
  items.forEach((u, i) => {
    const col = i % 3, row = Math.floor(i / 3), x = 14 + col * 312, y = 96 + row * 87, w = 304, h = 82;
    ART.panel(ctx, x, y, w, h, 'cream');
    let cost, can, lvTxt, locked = false;
    if (u.k === 'potion') { cost = POTION_C; lvTxt = `보유 ${S.potions}/9`; can = S.coins >= cost && S.potions < 9; } /* v4.7 물약은 코인으로 */
    else { const l = S.up[u.k], cap = capOf(u); cost = upCost(u); lvTxt = l >= cap ? 'MAX' : `Lv.${l}/${cap}`; can = l < cap && S.coins >= cost; if (u.unit !== undefined && !unitUnlocked(u.unit)) { locked = true; can = false; } }
    ctx.save(); RR(x + 12, y + 14, 56, 56, 12); ctx.fillStyle = ART.lgr(ctx, '#fff3d6', '#f2cf90', 0, y + 14, 0, y + 70); ctx.fill(); ctx.clip();
    if (u.unit !== undefined) ART.drawFit(ctx, unitSprite(u.unit), locked ? 'ib' : 'i0', x + 40, y + 42, 54, 54, { face: 0.8 });
    else ART.icon(ctx, u.ic, x + 40, y + 42, 36);
    ctx.restore(); ctx.lineWidth = 2; ctx.strokeStyle = '#c69355'; RR(x + 12, y + 14, 56, 56, 12); ctx.stroke();
    txt(u.name, x + 76, y + 22, 15, '#4e342e', 'left', false, null, w - 186);
    fitWrap(locked ? `스테이지 ${UNITS[u.unit].unlock - 1} 클리어 후 합류` : u.unit !== undefined ? (third(u.unit) ? `★★ 3차 직업: ${THIRD[u.unit].n}` : promoted(u.unit) ? `★ 2차 직업: ${PROMO[u.unit].n} · 전직 시험 가능` : `Lv.10 전직: ${PROMO[u.unit].n}`) : u.desc.replace(/ 체력·공격력/, ''), x + 76, y + 41, w - 190, 11.5, '#8a6142', 13, 2); /* v3.5 두 줄까지 (글씨가 8px까지 줄던 문제) */
    txt(lvTxt, x + 76, y + 69, 11, '#a0652a', 'left', false);
    if (u.k !== 'potion' && !locked) for (let k = 0, cap = capOf(u), sp = cap > 10 ? 4 : 6.5; k < cap; k++) { RR(x + 122 + k * sp, y + 66, sp - 1.5, 6, 2); ctx.fillStyle = k < S.up[u.k] ? '#ffb300' : 'rgba(141,90,43,.2)'; ctx.fill(); }
    const full = u.k !== 'potion' && S.up[u.k] >= capOf(u);
    btn(x + w - 100, y + 22, 88, 44, '', () => {
      if (u.k === 'potion') { if (S.coins >= POTION_C && S.potions < 9) { S.coins -= POTION_C; S.potions++; save(); SFX.coin(); } }
      else if (S.up[u.k] < capOf(u) && S.coins >= upCost(u)) { S.coins -= upCost(u); S.up[u.k]++; save(); SFX.lvl(); if (u.unit !== undefined && S.up[u.k] >= UPMAX) { PROMO_POP = { i: u.unit, t: 0 }; SFX.rare(); } }
    }, { bg: can ? '#5cc96b' : '#b5a99b', disabled: !can, key: 'up' + u.k });
    if (full && u.unit !== undefined && !third(u.unit)) { btn(x + w - 100, y + 22, 88, 44, '전직 시험', () => go(() => startTrial(u.unit)), { bg: '#ff8a3d', size: 14, key: 'trial' + u.unit }); }
    else if (full && u.unit !== undefined) { const a = awk(u.unit), c = awkCost(a + 1);
      if (a >= 5) { txt('각성 ★★★★★', x + w - 56, y + 44, 12, '#ffe27a', 'center'); }
      else { const ok = S.coins >= c.coin && (S.dust || 0) >= c.dust; btn(x + w - 100, y + 14, 88, 40, `각성 ★${a + 1}`, () => { if (!ok) { SFX.click(); return; } S.coins -= c.coin; S.dust -= c.dust; S.awk = S.awk || {}; S.awk[u.unit] = a + 1; save(); SFX.rare(); AWK_POP = { i: u.unit, t: 0 }; }, { bg: ok ? '#b07cff' : '#b5a99b', size: 14, key: 'awk' + u.unit }); txt(`${c.coin} · 가루 ${S.dust || 0}/${c.dust}`, x + w - 56, y + 64, 9.5, '#8a5a1a', 'center', false); }
      for (let q = 0; q < a; q++) ART.star(ctx, x + 18 + q * 11, y + 12, 5, '#b07cff'); }
    else if (full) txt('완료', x + w - 56, y + 44, 16, '#fff', 'center');
    else { ART.icon(ctx, 'coin', x + w - 84, y + 44, 18); txt('' + cost, x + w - 72, y + 45, cost >= 10000 ? 12 : 15, '#fff', 'left'); }
  });
}
function drawEquip() {
  const hs = heroStats();
  // 왼쪽: 기사 전시대
  pkFrame(12, 60, 308, 472, 'royal', { gem: '#ffb300' });
  ctx.save(); RR(26, 74, 280, 200, 14); ctx.clip(); ctx.fillStyle = ART.lgr(ctx, '#3a2a70', '#6a4a9a', 0, 74, 0, 274); ctx.fillRect(26, 74, 280, 200);
  for (let k = 0; k < 10; k++) { ctx.save(); ctx.translate(166, 250); ctx.rotate(-Math.PI / 2 + (k - 4.5) * 0.18 + Math.sin(G.time * 0.6) * 0.03); const g2 = ctx.createLinearGradient(0, 0, 0, -230); g2.addColorStop(0, 'rgba(255,236,170,.32)'); g2.addColorStop(1, 'rgba(255,236,170,0)'); ctx.fillStyle = g2; ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(-18, -230); ctx.lineTo(18, -230); ctx.lineTo(5, 0); ctx.fill(); ctx.restore(); }
  for (let k = 0; k < 18; k++) { const px = 40 + (k * 71) % 250, py = 90 + ((k * 37 + G.time * 18) % 170); ctx.globalAlpha = 0.5; ART.star(ctx, px, 274 - (py - 90), 2.2, '#fff3c0'); } ctx.globalAlpha = 1;
  ctx.restore(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,226,150,.7)'; RR(26, 74, 280, 200, 14); ctx.stroke();
  // 받침대
  ctx.fillStyle = ART.lgr(ctx, '#e8c88a', '#8a5a24', 0, 246, 0, 270); ART.E(ctx, 166, 258, 78, 13); ctx.fill(); ctx.fillStyle = ART.lgr(ctx, '#fff0c0', '#d8a050', 0, 240, 0, 256); ART.E(ctx, 166, 252, 70, 10); ctx.fill(); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 + Math.sin(G.time * 2) * 0.15; ctx.drawImage(ART.softDot('#ffe9a0'), 96, 222, 140, 50); ctx.restore();
  ART.draw(ctx, heroType(), (G.time % 3) < 0.3 ? 'a' + Math.min(7, Math.floor((G.time % 3) / 0.3 * 8)) : 'i' + (Math.floor(G.time * 2.4) % 3), mounted() ? 172 : 160, 254, mounted() ? mountK() * 0.95 : 2.2, false, 0);
  pkBtn(236, 80, 62, 30, '꾸미기', () => openCreator(() => setScene('map')), { bg: '#ff9a3d', size: 12, key: 'eqcus' });
  pkBtn(236, 114, 62, 30, '미르', () => { MIRP = { t: 0 }; }, { bg: '#8a5ae8', size: 12, key: 'eqmir' });
  pkBtn(236, 148, 62, 30, '펫', () => { PETP = { t: 0 }; }, { bg: '#ff7a5a', size: 12, key: 'eqpet' });
  // 이름판
  RR(66, 280, 200, 28, 14); ctx.fillStyle = ART.lgr(ctx, '#7a3a20', '#4a2010', 0, 280, 0, 308); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = pkGoldG(280, 308); ctx.stroke(); txt(`${heroName()}  Lv.${S.lv}`, 166, 294, 15, '#fff0c0', 'center', false); if (S.mtitle) pkTitleRibbon(122, 94, S.mtitle); /* v4.2 칭호 리본 (기사 그림 칸 왼쪽 위) */
  const stats = [['sword', `공격 ${hs.atk}`], ['heart', `체력 ${hs.hp}`], ['mana', `마나 ${hs.mpR.toFixed(1)}/초`], ['bone', `뼈 ${hs.fdR.toFixed(1)}/초`], ['star', `치명 ${hs.crit}%`], ['coin', `${KINDN[hs.wk]} · ${hs.range}`]];
  stats.forEach(([ic, s], i) => { const sx = 28 + (i % 2) * 140, sy = 316 + Math.floor(i / 2) * 25; RR(sx, sy, 134, 21, 10); ctx.fillStyle = 'rgba(255,248,230,.92)'; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = '#d8b070'; ctx.stroke(); ART.icon(ctx, ic, sx + 12, sy + 10.5, 15); txt(s, sx + 24, sy + 11, 12, '#5a3412', 'left', false, null, 106); });
  // 장착 칸 3개 (등급 빛)
  ['weapon', 'armor', 'charm'].forEach((sl, i) => {
    const x = 28 + i * 96, y = 398, it = S.eq[sl], sel = mapSel && mapSel.from === 'eq' && mapSel.slot === sl, rc = it ? RARC[it.r] : '#8a7a6a';
    uiPush({ x, y, w: 86, h: 120, tap: () => { if (it) mapSel = { from: 'eq', slot: sl }; }, key: 'eq' + sl });
    ctx.save(); if (it && it.r >= 2) { ctx.shadowColor = rc; ctx.shadowBlur = 10 + Math.sin(G.time * 3 + i) * 4; } RR(x, y, 86, 120, 12); ctx.fillStyle = ART.lgr(ctx, '#4a3a7a', '#241a44', 0, y, 0, y + 120); ctx.fill(); ctx.restore();
    ctx.lineWidth = sel ? 3.5 : 2.5; ctx.strokeStyle = sel ? '#ffd34d' : it ? rc : 'rgba(255,226,150,.45)'; RR(x + 1, y + 1, 84, 118, 11); ctx.stroke();
    RR(x + 6, y + 6, 74, 18, 9); ctx.fillStyle = 'rgba(255,233,168,.16)'; ctx.fill(); txt(SLOTN[sl], x + 43, y + 15, 11.5, '#ffe9a8', 'center', false);
    if (it) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35; ctx.drawImage(ART.softDot(rc), x + 8, y + 26, 70, 62); ctx.restore(); ART.itemIcon(ctx, it, x + 15, y + 28, 56); if (it.up) { RR(x + 58, y + 28, 24, 16, 8); ctx.fillStyle = '#8a4ae8'; ctx.fill(); txt('+' + it.up, x + 70, y + 36, 10, '#fff', 'center', false); } txt(it.name, x + 43, y + 102, 10.5, ART.LI(rc, 0.25), 'center', false, null, 80); pkGem(x + 43, y + 115, 3.4, rc); }
    else { ctx.globalAlpha = 0.3; ART.icon(ctx, sl === 'weapon' ? 'sword' : sl === 'armor' ? 'heart' : 'mana', x + 43, y + 60, 34); ctx.globalAlpha = 1; txt('비어 있음', x + 43, y + 102, 10.5, '#b8a8d8', 'center', false); }
  });
  // 오른쪽: 가방
  const gx = 330, gy = 60;
  pkFrame(gx, gy, 614, 346, 'royal', { gem: '#7ac8ff' });
  ART.icon(ctx, 'star', gx + 30, gy + 24, 16); txt(`가방 ${S.inv.length} / 28`, gx + 44, gy + 24, 15, '#ffe9a8', 'left', true);
  { const cnt = [0, 1, 2, 3, 4].map(r => S.inv.filter(x => x.r === r).length); let cx = gx + 600; for (let r = 4; r >= 0; r--) { if (!cnt[r]) continue; ctx.font = `bold 11px ${FONT}`; const s2 = `${RAR[r]} ${cnt[r]}`, w2 = ctx.measureText(s2).width + 16; cx -= w2 + 4; RR(cx, gy + 14, w2, 20, 10); ctx.fillStyle = RART[r]; ctx.fill(); txt(s2, cx + w2 / 2, gy + 24, 11, '#fff', 'center', false); } }
  const cs = 74;
  for (let i = 0; i < 28; i++) {
    const x = gx + 22 + (i % 7) * (cs + 9), y = gy + 42 + Math.floor(i / 7) * (cs - 1), it = S.inv[i], selI = it && mapSel && mapSel.from === 'inv' && mapSel.id === it.id, rc = it ? RARC[it.r] : null;
    ctx.save(); if (it && it.r >= 3) { ctx.shadowColor = rc; ctx.shadowBlur = 8 + Math.sin(G.time * 3 + i) * 3; }
    RR(x, y, cs, cs - 8, 10); ctx.fillStyle = it ? ART.lgr(ctx, ART.mix(rc, '#2a1e50', 0.72), '#1e1638', 0, y, 0, y + cs) : 'rgba(255,255,255,.06)'; ctx.fill(); ctx.restore();
    ctx.lineWidth = selI ? 3.5 : it ? 2 : 1; ctx.strokeStyle = selI ? '#ffd34d' : it ? rc : 'rgba(255,226,150,.25)'; RR(x + 0.5, y + 0.5, cs - 1, cs - 9, 10); ctx.stroke();
    if (it) {
      uiPush({ x, y, w: cs, h: cs - 8, tap: () => { mapSel = { from: 'inv', id: it.id }; }, key: 'inv' + it.id });
      ART.itemIcon(ctx, it, x + 9, y + 3, cs - 18);
      if (it.r >= 3) pkShine(x, y, cs, cs - 8, 10);
      if (it.up) { RR(x + cs - 26, y + 3, 22, 14, 7); ctx.fillStyle = '#8a4ae8'; ctx.fill(); txt('+' + it.up, x + cs - 15, y + 10, 9.5, '#fff', 'center', false); }
      const c = S.eq[it.slot]; if (c && c.kind === it.kind && it.val > c.val) { ctx.fillStyle = '#3fbf5a'; ctx.beginPath(); ctx.moveTo(x + 8, y + cs - 14); ctx.lineTo(x + 14, y + cs - 22); ctx.lineTo(x + 20, y + cs - 14); ctx.closePath(); ctx.fill(); }
    }
  }
  const dy = 414; pkFrame(gx, dy, 614, 118, 'royal', { gem: '#ffb300' }); RR(gx + 10, dy + 10, 594, 98, 10); ctx.fillStyle = ART.lgr(ctx, '#fffaf0', '#f1e0bf', 0, dy + 10, 0, dy + 108); ctx.fill();
  let sel = null;
  if (mapSel && mapSel.from === 'inv') sel = S.inv.find(x => x.id === mapSel.id);
  if (mapSel && mapSel.from === 'eq') sel = S.eq[mapSel.slot];
  if (!sel) {
    // v1.2 장비 판매 효율화: 등급별 일괄 판매 · 약한 장비 정리 · 자동 판매
    txt('아이템을 눌러 선택 · 아래 버튼으로 한 번에 정리', gx + 22, dy + 20, 13, '#8a6142', 'left', false);
    const weak = x => { const c = S.eq[x.slot]; return x.r < 3 && c && c.kind === x.kind && x.val <= c.val && !(x.aff || []).length; };
    const groups = [['일반', x => x.r === 0, '#c8b89a'], ['고급 이하', x => x.r <= 1, '#7cc4ff'], ['약한 장비', weak, '#ffb84d']];
    groups.forEach(([n, f, bg], i) => { const L = S.inv.filter(f), sum = L.reduce((a, x) => a + sellPrice(x), 0);
      btn(gx + 14 + i * 150, dy + 40, 142, 62, `${n} 판매\n${L.length}개 · ${sum}코인`, () => { S.inv = S.inv.filter(x => !f(x)); S.coins += sum; save(); SFX.coin(); }, { bg, size: 13, disabled: !L.length, key: 'bulk' + i }); });
    const AN = ['끔', '일반', '고급 이하'], as = S.autoSell || 0;
    RR(gx + 466, dy + 36, 136, 70, 12); ctx.fillStyle = 'rgba(141,90,43,.12)'; ctx.fill();
    txt('전투 후 자동 판매', gx + 534, dy + 50, 12, '#8a6142', 'center', false);
    btn(gx + 478, dy + 62, 112, 36, AN[as], () => { S.autoSell = (as + 1) % 3; save(); }, { bg: as ? '#5cc96b' : '#a99a8a', size: 15, key: 'autosell' });
    return;
  }
  fixItem(sel);
  { const up = sel.up || 0, full = up >= 10, c = full ? 0 : enhCost(sel);
    btn(gx + 350, dy + 74, 108, 36, full ? '강화 MAX' : `강화 +${up + 1}\n${c}코인`, () => enhance(sel), { bg: full ? '#b5a99b' : '#9c6bff', disabled: full || S.coins < c, size: 12, key: 'enh' });
    if (!full) txt(`강화 후 ${sel.slot === 'weapon' ? '공격' : sel.slot === 'armor' ? '체력' : '효과'} ${sel.val} → ${enhVal(sel, up + 1)}${up + 1 === 5 || up + 1 === 10 ? ' · 추가 능력!' : ''}`, gx + 350, dy + 64, 11, '#7a3ad0', 'left', false, null, 112); }
  ART.itemIcon(ctx, sel, gx + 14, dy + 16, 82);
  txt(`[${RAR[sel.r]}] ${sel.name}`, gx + 108, dy + 24, 18, RART[sel.r], 'left', false, null, 350);
  txt(`${SLOTN[sel.slot]} · ${KINDN[sel.kind]}`, gx + 108, dy + 45, 12, '#a0652a', 'left', false);
  const cur = S.eq[sel.slot];
  txt(itemDesc(sel), gx + 200, dy + 45, 13, '#5a3412', 'left', false, null, 258);
  (sel.aff || []).slice(0, 5).forEach((a, i) => { RR(gx + 466, dy + 6 + i * 21, 138, 19, 9); ctx.fillStyle = sel.r === 4 ? 'rgba(194,24,158,.14)' : 'rgba(30,127,214,.12)'; ctx.fill(); txt('✦ ' + affText(a), gx + 476, dy + 15.5 + i * 21, 11, sel.r === 4 ? '#a0177f' : '#1e6fbf', 'left', false, null, 124); });
  if (!(sel.aff || []).length) txt('추가 능력 없음 (희귀부터 붙어요)', gx + 535, dy + 22, 11, '#b49a80', 'center', false);
  if (mapSel.from === 'inv' && cur) { const up = sel.val - cur.val; txt(cur.kind === sel.kind ? `현재 장비보다 ${up >= 0 ? '+' : ''}${Math.round(up * 10) / 10}` : `현재: ${cur.name}`, gx + 108, dy + 64, 12, cur.kind === sel.kind ? (up >= 0 ? '#2e9b44' : '#d84315') : '#8a6142', 'left', false); }
  if (mapSel.from === 'inv') {
    btn(gx + 108, dy + 74, 110, 36, '장착하기', () => { const idx = S.inv.findIndex(x => x.id === sel.id); if (idx < 0) return; S.inv.splice(idx, 1); if (S.eq[sel.slot]) S.inv.push(S.eq[sel.slot]); S.eq[sel.slot] = sel; mapSel = null; ART.clearHeroCache(heroType()); save(); SFX.rare(); }, { bg: '#5cc96b', size: 16 });
    btn(gx + 224, dy + 74, 120, 36, `판매 ${sellPrice(sel)}`, () => { S.inv = S.inv.filter(x => x.id !== sel.id); S.coins += sellPrice(sel); mapSel = null; save(); SFX.coin(); }, { bg: '#ffb84d', size: 15 });
  } else btn(gx + 108, dy + 74, 150, 36, '장착 해제', () => { if (S.inv.length >= 28) return; S.inv.push(sel); S.eq[sel.slot] = null; mapSel = null; save(); }, { bg: '#a99a8a', size: 15, disabled: S.inv.length >= 28 });
}
function drawFormation() {
  ART.panel(ctx, 14, 62, W - 28, 330, 'cream');
  txt('멍멍 기사단 · 강아지를 눌러 출전 부대(최대 5마리)에 넣거나 빼세요', W / 2, 84, 14, '#7a5230', 'center', false);
  // v1.0: 합류한 순서대로 정렬 (기본 5마리 → 치치 → 망고 → 몽실 → 쭈니 → 태산)
  UNITS.map((d, i) => i).sort((a, b) => (UNITS[a].unlock - UNITS[b].unlock) || (a - b)).forEach((i, slot) => {
    const d = UNITS[i], col = slot % 5, row = Math.floor(slot / 5), x = 30 + col * 182, y = 100 + row * 142, w = 172, h = 134, unl = unitUnlocked(i), inD = S.deck.includes(i);
    RR(x, y, w, h, 14); ctx.fillStyle = inD ? ART.lgr(ctx, '#fff6c8', ART.LI(d.col, 0.55), 0, y, 0, y + h) : unl ? 'rgba(141,90,43,.1)' : 'rgba(80,60,40,.25)'; ctx.fill();
    ctx.lineWidth = inD ? 4 : 2; ctx.strokeStyle = inD ? '#e65100' : '#c69355'; RR(x, y, w, h, 14); ctx.stroke();
    ctx.save(); RR(x + 3, y + 3, 88, h - 6, 10); ctx.clip(); ctx.globalAlpha = unl ? 1 : 0.35; if (unl) drawCuteDog('fc' + i, d.id, unitSprite(i), x + 47, y + h - 5, 1, { fit: [84, h - 14], ph: i, em: false }); else ART.drawFit(ctx, unitSprite(i), 'ib', x + 47, y + h / 2 + 2, 84, h - 14); ctx.restore(); { const c = CUTE['fc' + i]; if (unl && c && c.em) drawEmote(c.em, x + 74, y + 22); } if (promoted(i)) { RR(x + 6, y + 6, 40, 16, 8); ctx.fillStyle = '#ffcf3a'; ctx.fill(); txt('2차', x + 26, y + 14.5, 11, '#5a3412', 'center', false); }
    txt(d.nick, x + 94, y + 20, 16, '#4e342e', 'left', false);
    txt(d.breed, x + 94, y + 39, 11, '#a0652a', 'left', false, null, 86);
    if (TRAITS[d.id] && formHover === i) {}
    RR(x + 94, y + 48, 70, 18, 9); ctx.fillStyle = d.col; ctx.fill(); txt(d.role, x + 129, y + 57.5, 11, '#fff', 'center', false, null, 64);
    if (unl) {
      const k = 1 + 0.15 * (S.up['u' + i] || 0);
      txt(`체력 ${Math.round(d.hp * k)}`, x + 94, y + 80, 11, '#5a3412', 'left', false);
      txt(d.type === 'healer' ? `치유 ${Math.round(d.heal * k)}` : `공격 ${Math.round(d.atk * k)}`, x + 94, y + 96, 11, '#5a3412', 'left', false);
      ART.icon(ctx, 'bone', x + 99, y + 114, 13); txt(`${d.cost}·${d.cd}초`, x + 107, y + 114.5, 11, '#5a3412', 'left', false, null, 76);
      if (inD) { RR(x + w - 40, y - 8, 46, 20, 10); ctx.fillStyle = '#e65100'; ctx.fill(); txt(`${S.deck.indexOf(i) + 1}번`, x + w - 17, y + 2, 11, '#fff', 'center', false); }
      uiPush({ x, y, w, h, key: 'form' + i, tap: () => { formHover = i;
        if (inD) { if (S.deck.length > 1) { S.deck = S.deck.filter(v => v !== i); SFX.click(); } else formMsg = { s: '최소 1마리는 출전해야 해요', t: 1.5 }; }
        else if (S.deck.length < 5) { S.deck.push(i); SFX.woof(); } else formMsg = { s: '부대가 가득 찼어요 · 먼저 한 마리를 빼 주세요', t: 1.6 };
        save(); } });
    } else { ART.icon(ctx, 'lock', x + 128, y + 92, 22); txt(`스테이지 ${d.unlock - 1} 클리어`, x + 94, y + 118, 10.5, '#8a6142', 'left', false, null, 74); }
  });
  ART.panel(ctx, 14, 400, W - 28, 130, 'dark');
  txt('출전 부대', 40, 420, 14, '#ffcf5a', 'left');
  btn(130, 405, 150, 28, `합동기 도감 ${COMBOS.filter(comboLearned).length}/${COMBOS.length}`, () => { COMBOP = { t: 0 }; }, { bg: '#b07cff', size: 12, key: 'comboCodex' });
  { const fi0 = formHover >= 0 ? formHover : S.deck[0], fed = S.snackDay && S.snackDay.d === todayKey(); btn(288, 405, 128, 28, fed ? '🍖 오늘 간식 끝' : `🍖 ${UNITS[fi0].nick}에게 간식`, () => feedSnack(fi0), { bg: fed ? '#b5a99b' : '#ff9a5a', size: 12, key: 'snack' }); btn(424, 405, 96, 28, '👕 옷장', () => { WARDP = { t: 0, i: fi0 }; }, { bg: '#5cb8e8', size: 12, key: 'ward' }); }
  for (let k = 0; k < 5; k++) { const i = S.deck[k], x = 40 + k * 112, y = 434; RR(x, y, 100, 84, 12); ctx.fillStyle = 'rgba(255,240,210,.12)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,207,90,.6)'; ctx.lineWidth = 1.5; ctx.stroke();
    if (i != null) { const bp = boopPair(), ln = bp === k ? 6 : bp === k - 1 ? -6 : 0; drawCuteDog('fd' + k, UNITS[i].id, unitSprite(i), x + 50, y + 68, 1, { fit: [70, 56], ph: k, em: false, lean: ln }); txt(UNITS[i].nick, x + 50, y + 78, 11, '#fff3c4', 'center'); if (bp === k && S.deck[k + 1] != null) { const hb = Math.sin(G.time * 6) * 2; ctx.fillStyle = '#ff5a8a'; ctx.beginPath(); const hx = x + 106, hy = y + 20 + hb; ctx.moveTo(hx, hy + 6); ctx.bezierCurveTo(hx - 9, hy - 1, hx - 4, hy - 9, hx, hy - 4); ctx.bezierCurveTo(hx + 4, hy - 9, hx + 9, hy - 1, hx, hy + 6); ctx.fill(); txt('콕!', hx, hy - 16, 11, '#ffd6e6', 'center'); } } else txt('비어 있음', x + 50, y + 44, 11, 'rgba(255,240,210,.5)', 'center', false); txt(`${k + 1}`, x + 10, y + 12, 11, '#ffcf5a', 'center', false); }
  const sel = UNITS[S.deck[S.deck.length - 1]];
  const fd = UNITS[formHover >= 0 ? formHover : S.deck[0]];
  if (fd) { const fi = UNITS.indexOf(fd); drawCuteDog('fp' + fi, fd.id, fd.id, 640, 512, 0.95, { emy: 70, emx: 14 }); uiPush({ x: 596, y: 430, w: 88, h: 90, key: 'petp', tap: () => cutePet('fp' + fi, fd.id, 640, 432) }); txt(`👆 쓰다듬기 · 코인 ${petLeft()}마리 남음`, 640, 524, 9.5, 'rgba(255,240,200,.8)', 'center', false); { const c = CUTE['fp' + fi]; if (c && c.act === 'eat') { const k2 = 1 - c.t / c.T; ctx.fillStyle = '#c8783a'; ART.E(ctx, 668, 505, 8 * k2 + 1, 5 * k2 + 1); ctx.fill(); if (Math.random() < 0.3) floatCrumb(668, 500); } } txt(`${fd.nick} · ${fd.breed}`, 690, 424, 14, '#ffcf5a', 'left'); txt('성격: ' + TRAITS[fd.id].q, 690, 448, 12, '#fff3d6', 'left', false); txt('좋아하는 간식: ' + BREED[fd.id].snack, 690, 512, 11.5, '#ffd8a8', 'left', false, null, 250); txt(fd.desc || ({ melee: '빠른 근접 돌격', tank: '튼튼하게 앞을 막음', ranged: '멀리서 화살 공격', magic: '범위 마법 공격', elite: '강력한 근접 검술' })[fd.type], 690, 470, 12, '#fff3d6', 'left', false); txt('말버릇: "' + TRAITS[fd.id].v.join('", "') + '"', 690, 492, 12, '#ffe0a6', 'left', false); }
  if (formMsg) { formMsg.t -= G.dt || 0.016; ctx.globalAlpha = Math.min(1, formMsg.t * 3); ART.panel(ctx, W / 2 - 180, 228, 360, 36, 'dark'); txt(formMsg.s, W / 2, 246, 14, '#ffcf6b', 'center', false); ctx.globalAlpha = 1; if (formMsg.t <= 0) formMsg = null; }
}
let formMsg = null, formHover = -1, WARDP = null;
function drawWardrobe() {
  const P = WARDP; P.t += G.dt || 0.016; ui = []; dragH = null; const i = P.i, d = UNITS[i], b = BREED[d.id]; S.wear = S.wear || {};
  ctx.save(); ctx.globalAlpha = Math.min(1, P.t * 4); ctx.fillStyle = 'rgba(15,6,0,.72)'; ctx.fillRect(-OX, 0, VW, H); ctx.restore();
  ART.panel(ctx, W / 2 - 330, 70, 660, 410, 'cream'); bigText(`${d.nick}의 옷장`, W / 2, 108, 28, '#fff6b0', '#5cb8e8');
  txt(`${d.breed} · 첫 옷은 간식 3번, 두 번째 옷은 주간 도전 2번이면 열려요`, W / 2, 140, 13, '#8a6142', 'center', false);
  const cur = S.wear[d.id]; [null, 0, 1].forEach((n, k) => { const x = W / 2 - 300 + k * 204, y = 160, open = n == null || wearOpen(d.id, n), on = (cur == null ? null : cur) === n, it = n == null ? null : b.wear[n];
    RR(x, y, 192, 230, 14); ctx.fillStyle = on ? 'rgba(255,201,60,.35)' : 'rgba(141,90,43,.1)'; ctx.fill(); if (on) { ctx.lineWidth = 3; ctx.strokeStyle = '#e65100'; RR(x, y, 192, 230, 14); ctx.stroke(); }
    const base = unitSprite0(i), spr = it && open ? ART.wearType(base, it.k, it.c) : base; ctx.save(); if (!open) ctx.globalAlpha = 0.4; drawCuteDog('wd' + k, d.id, spr, x + 96, y + 170, 1.25, { ph: k, em: false }); ctx.restore();
    txt(it ? it.n : '기본 (장신구 없음)', x + 96, y + 192, 14, '#4e342e', 'center', false, null, 180);
    if (open) btn(x + 36, y + 200, 120, 26, on ? '입는 중' : '입히기', () => { if (n == null) delete S.wear[d.id]; else S.wear[d.id] = n; save(); SFX.pet && SFX.pet(b.bark); const c = CUTE['wd' + k]; if (c) { c.act = 'pet'; c.t = 0; c.T = 1.6; } }, { bg: on ? '#ffc93c' : '#5cc96b', size: 13, key: 'wear' + k });
    else { ART.icon(ctx, 'lock', x + 96, y + 70, 30); txt(wearLock(d.id, n), x + 96, y + 214, 12, '#8a6142', 'center', false); } });
  btn(W / 2 - 80, 412, 160, 48, '닫기', () => { WARDP = null; }, { bg: '#a99a8a', size: 17, key: 'wdclose' });
}
// 출전 부대 이웃끼리 가끔 코 맞대기 (k와 k+1)
let BOOP = { k: -1, t: 0, wait: 3 };
function boopPair() { const dt = G.dt || 0.016; if (BOOP.k >= 0) { BOOP.t -= dt; if (BOOP.t <= 0) { BOOP.k = -1; BOOP.wait = 3 + Math.random() * 4; } } else if ((BOOP.wait -= dt) <= 0 && S.deck.length > 1) { BOOP.k = Math.floor(Math.random() * (S.deck.length - 1)); BOOP.t = 1.4; } return BOOP.k; }
function wrapTxt(s, x, y, maxW, size, col, lh) {
  const es = Math.max(13.5, size < 14.5 ? size + 1 : size); ctx.font = `bold ${es}px ${FONT}`; if ('letterSpacing' in ctx) ctx.letterSpacing = es < 16 ? '0.4px' : '0px'; let line = '', yy = y; /* v3.8 실제로 그리는 크기·굵기로 재서 줄바꿈 (전엔 작게 재서 칸 밖으로 넘쳤음) */
  for (const para of s.split('\n')) { line = ''; for (const ch of para) { if (ctx.measureText(line + ch).width > maxW) { txt(line, x, yy, size, col, 'left', false); ctx.font = `bold ${es}px ${FONT}`; if ('letterSpacing' in ctx) ctx.letterSpacing = es < 16 ? '0.4px' : '0px'; yy += lh; line = ch.trim() ? ch : ''; } else line += ch; } txt(line, x, yy, size, col, 'left', false); yy += lh * 1.25; }
}
let codexSnack = null;
function drawCodex() {
  const L = window.LORE || [], cats = ['세계', '지역', '기사단', '악당', '별뼈', '역사', '색깔조각', '이벤트', '컷신'];
  ART.panel(ctx, 14, 62, 300, 468, 'cream');
  cats.forEach((c, i) => btn(22 + (i % 5) * 56, 74 + Math.floor(i / 5) * 42, 52, 36, c.length > 3 ? c.slice(0, 2) + '\n' + c.slice(2) : c, () => { codexCat = i; codexSel = null; codexPage = 0; }, { bg: codexCat === i ? '#ffc93c' : i >= 6 ? '#d8b0e8' : '#c9a983', size: c.length > 3 ? 13 : c.length > 2 ? 12.5 : 14, key: 'cc' + i }));
  if (codexCat === 6) return drawCodexShards();
  if (codexCat === 7) return drawCodexEvents();
  if (codexCat === 8) return drawCodexReplay();
  const list = L.filter(e => e.cat === cats[codexCat]), got = L.filter(e => S.cleared >= (e.at || 0)).length;
  txt(`기록 ${got} / ${L.length}`, 164, 168, 12, '#a0652a', 'center', false);
  const PER = 10, pages = Math.max(1, Math.ceil(list.length / PER)); if (codexPage >= pages) codexPage = pages - 1;
  if (pages > 1) { btn(26, 488, 60, 32, '◀', () => { codexPage = (codexPage + pages - 1) % pages; }, { bg: '#c9a983', size: 15, key: 'cxp' }); btn(242, 488, 60, 32, '▶', () => { codexPage = (codexPage + 1) % pages; }, { bg: '#c9a983', size: 15, key: 'cxn' }); txt(`${codexPage + 1} / ${pages}`, 164, 504, 13, '#7a5230', 'center', false); }
  list.slice(codexPage * PER, codexPage * PER + PER).forEach((e, i) => {
    const y = 182 + i * 30, open = S.cleared >= (e.at || 0);
    cxRow(26, y, 276, 26, codexSel === e, !open);
    txt(open ? e.title : `??? (스테이지 ${e.at} 클리어)`, 44, y + 13.5, 13, open ? '#4e342e' : '#a89580', 'left', false, null, 252);
    if (open) uiPush({ x: 26, y, w: 276, h: 26, key: 'cx' + i, tap: () => { codexSel = e; } });
  });
  ART.panel(ctx, 326, 62, 620, 468, 'cream');
  const e = codexSel && S.cleared >= (codexSel.at || 0) ? codexSel : null;
  if (!e) {
    bigText('멍멍기사 세계 도감', 636, 120, 30, '#fff3c4', '#ffb300');
    wrapTxt('뼈다귀 왕국과 그림자 늪에 얽힌 모든 기록이 여기 모입니다.\n스테이지를 깰수록 새 기록이 열려요. 왼쪽 목록에서 읽고 싶은 기록을 눌러 보세요.', 360, 180, 550, 15, '#6b4426', 24);
    ['hero', 'u0', 'u1', 'u2', 'u3', 'u4', 'u5', 'u6', 'u7', 'u8', 'u9'].forEach((k, i) => { const x = 372 + i * 52; if (k === 'hero') { ART.draw(ctx, heroFace(), 'i' + (Math.floor(G.time * 2.4) % 3), x, 480, 0.72, false, 0); return; } const ui2 = +k.slice(1); if (!unitUnlocked(ui2)) { ART.draw(ctx, k, 'ib', x, 480, 0.72, false, 0); return; } drawCuteDog('cx' + k, k, k, x, 480, 0.72, { ph: i, emy: 54 }); uiPush({ x: x - 24, y: 420, w: 48, h: 64, key: 'cxpet' + k, tap: () => { cutePet('cx' + k, k, x, 412); codexSnack = k; } }); });
    txt(`강아지를 눌러 쓰다듬어 보세요 · 하루 첫 쓰다듬기는 강아지마다 코인 100 (오늘 ${petLeft()}마리 남음)`, 636, 508, 12, '#a0652a', 'center', false);
    if (codexSnack) { const u = UNITS.find(q => q.id === codexSnack), b = BREED[codexSnack]; RR(352, 300, 568, 84, 12); ctx.fillStyle = 'rgba(255,224,170,.45)'; ctx.fill(); txt(`${u.nick} · ${u.breed}`, 370, 320, 16, '#4e342e', 'left', false); txt('좋아하는 간식: ' + b.snack, 370, 344, 13.5, '#a0522d', 'left', false); txt('반응: ' + b.pq, 370, 366, 13, '#6b4426', 'left', false, null, 540); }
    return;
  }
  { const cc = CX_COL[e.cat] || '#c98b2a'; RR(352, 80, ctx.measureText(e.cat).width + 46, 22, 11); ctx.fillStyle = cc; ctx.fill(); ART.gem(ctx, 364, 91, 4, '#fff3c4'); txt(e.cat, 374, 91.5, 12.5, '#fff', 'left', false); }
  txt(e.title, 352, 122, 23, '#4e342e', 'left', false, null, e.art ? 400 : 560);
  { const lw = e.art ? 400 : 560; ctx.strokeStyle = ART.goldG(ctx, 134, 140); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(352, 138); ctx.lineTo(352 + lw, 138); ctx.stroke(); ART.gem(ctx, 352 + lw / 2, 138, 4.5, CX_COL[e.cat] || '#ff5a8a'); }
  if (!e.art) cxEmblem(e.cat, 850, 370);
  if (e.art) { ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 8; RR(766, 76, 168, 158, 16); ctx.fillStyle = ART.goldG(ctx, 76, 234); ctx.fill(); ctx.restore(); ctx.save(); RR(770, 80, 160, 150, 14); ctx.fillStyle = ART.lgr(ctx, '#fff8e6', '#f2d6a0', 0, 80, 0, 230); ctx.fill(); ctx.clip(); ART.drawFit(ctx, e.art === 'hero' ? heroFace() : e.art, 'i' + (Math.floor(G.time * 2.4) % 3), 850, 157, 150, 140, { flip: !!e.flip }); ctx.restore(); ctx.strokeStyle = '#c69355'; ctx.lineWidth = 2; RR(770, 80, 160, 150, 14); ctx.stroke(); }
  wrapTxt(nameSub(e.text), 352, 160, e.art ? 400 : 570, 14.5, '#5a3412', 23);
}
// v2.6 도감 공통: 목록 줄 · 분류 색 · 큰 문장
const CX_COL = { 세계: '#7a5ac8', 지역: '#3a9a6a', 기사단: '#e8742a', 악당: '#c0392b', 별뼈: '#c99a1a', 역사: '#6a5a8a', 이벤트: '#d05aa0', 색깔조각: '#ff6ad5', 컷신: '#4a7ac8' };
function cxRow(x, y, w, h, sel, dim, noGem) { RR(x, y, w, h, 8); ctx.fillStyle = sel ? ART.lgr(ctx, '#fff1b8', '#f0c860', 0, y, 0, y + h) : dim ? 'rgba(141,90,43,.08)' : ART.lgr(ctx, 'rgba(255,250,236,.95)', 'rgba(240,220,180,.9)', 0, y, 0, y + h); ctx.fill(); ctx.lineWidth = sel ? 2 : 1; ctx.strokeStyle = sel ? '#c8901f' : dim ? 'rgba(160,120,80,.25)' : 'rgba(200,150,80,.55)'; ctx.stroke(); if (sel) { RR(x + 2, y + 3, 4, h - 6, 2); ctx.fillStyle = '#e65100'; ctx.fill(); } if (!dim && !noGem) ART.gem(ctx, x + 13, y + h / 2, 3, sel ? '#ff5a8a' : '#d8b070'); }
function cxEmblem(cat, x, y) { const c = CX_COL[cat] || '#c98b2a'; ctx.save(); ctx.globalAlpha = 0.9; ctx.globalCompositeOperation = 'multiply'; ctx.beginPath(); ctx.arc(x, y, 62, 0, TAU); ctx.fillStyle = 'rgba(240,215,170,.5)'; ctx.fill(); ctx.restore(); ctx.beginPath(); ctx.arc(x, y, 56, 0, TAU); ctx.lineWidth = 5; ctx.strokeStyle = ART.goldG(ctx, y - 56, y + 56); ctx.stroke(); ctx.beginPath(); ctx.arc(x, y, 46, 0, TAU); ctx.fillStyle = ART.lgr(ctx, ART.LI(c, 0.35), ART.DK(c, 0.2), 0, y - 46, 0, y + 46); ctx.fill(); ART.icon(ctx, { 세계: 'star', 지역: 'bone', 별뼈: 'star', 역사: 'mana', 이벤트: 'coin' }[cat] || 'star', x, y, 48); ART.paw(ctx, x, y + 70, 0.55, 'rgba(160,100,30,.35)'); }
// v1.6 도감: 색깔 조각 7칸
// v1.8 이벤트 도감: 전투 이벤트 8종 + 계절 이벤트 4종 (본 것만 열림, 처음 보면 코인 보상)
/* v4.0 도감: 멍멍 마을 미니 놀이 기록 (계절 4 × 종류 2 · 다 끝낸 횟수) */
/* v4.1 미니 놀이 칭호: 같은 놀이 3번 → 칭호, 10번 → 금 칭호 · 모두 20번 → 「마을 놀이왕」 */
const MINI_TITLE = { spring0: '꽃잎 바람', spring1: '나비 친구', summer0: '오리 대장', summer1: '조개 수집가', autumn0: '수확 일꾼', autumn1: '도토리 부자', winter0: '눈사람 장인', winter1: '눈꽃 모으미' };
function miniTitles() { const K = S.vilMiniK || {}, out = []; for (const k in MINI_TITLE) { const c = K[k] || 0; if (c >= 3) out.push({ n: MINI_TITLE[k], gold: c >= 10, c }); } if ((S.vilMiniDone || 0) >= 20) out.push({ n: '마을 놀이왕', gold: true, c: S.vilMiniDone }); { const bs = bhStars(); if (bs >= 15) out.push({ n: '보스 사냥꾼', gold: bs >= 60, c: bs }); if (bs >= 120) out.push({ n: '보스들의 친구', gold: true, c: bs }); } return out; } /* v4.3 보스 별 칭호 */
function buddyPairs() { const T = S.tagN || {}, out = []; for (const k in T) { const [p, q] = k.split('-').map(Number); if (T[k] > 2 && buddyOf(p) === q && buddyOf(q) === p && UNITS[p] && UNITS[q]) out.push({ p, q, n: T[k] }); } return out.sort((a, b) => b.n - a.n); }
function pkTitleRibbon(x, y, n) { ctx.font = `bold 14.5px ${FONT}`; const w = Math.min(210, ctx.measureText(n).width + 36), x0 = x - w / 2; ctx.fillStyle = '#a8301e'; [[x0 - 8, 1], [x0 + w + 8, -1]].forEach(([ex, d]) => { ctx.beginPath(); ctx.moveTo(ex + d * 10, y - 9); ctx.lineTo(ex, y - 9); ctx.lineTo(ex + d * 5, y); ctx.lineTo(ex, y + 9); ctx.lineTo(ex + d * 10, y + 9); ctx.closePath(); ctx.fill(); });
  RR(x0, y - 10, w, 20, 4); ctx.fillStyle = ART.lgr(ctx, '#ff8a5a', '#d84a2a', 0, y - 10, 0, y + 10); ctx.fill(); ctx.strokeStyle = '#7a2a10'; ctx.lineWidth = 1.2; ctx.stroke(); ART.star(ctx, x0 + 10, y, 5, '#ffe08a'); txt(n, x + 5, y + 0.5, 12, '#fff8e0', 'center', false, null, w - 26); }
function heroCall(P, h) { /* v4.4 내 기사를 누르면 「같이 놀까?」 + 가장 친한 기사가 달려와 인사 */ P.heroTalk = 2.4; SFX.click(); const D = (P.acts || []).filter(a => a.k === 'dog' && !a.bk && !['act', 'hidden', 'hidego', 'fetch', 'bring', 'cele', 'duo'].includes(a.mode)); if (!D.length) return;
  const best = D.sort((p, q) => joyOf(q.i) - joyOf(p.i))[0]; best.mode = 'tag'; best.fo = h; best.t = 7; best.path = []; best.tgo = 0; emoteAt(best, 'heart', 2.4); floatMsg = { s: `${UNITS[best.i].nick}가 달려와요!`, x: W / 2, y: 110, t: 1.8 }; }
function vilBuddyWalk(P, b) { const A = (P.acts || []).filter(a => a.k === 'dog'), d1 = A.find(a => a.i === b.p), d2 = A.find(a => a.i === b.q); P.bud = false;
  const busy = m => !m || m.bk || ['act', 'hidden', 'hidego', 'fetch', 'bring', 'cele'].includes(m.mode); if (busy(d1) || busy(d2) || P.play || P.cele) { floatMsg = { s: '지금은 둘 중 하나가 바빠요!', x: W / 2, y: 120, t: 1.8 }; return; }
  const tx = d2.x > 480 ? Math.max(90, d2.x - 300) : Math.min(870, d2.x + 300); d2.mode = 'bwalk'; d2.path = [[tx, roadY(tx, d2.lane) + (d2.py || 0)]]; d2.fo = null;
  d1.mode = 'tag'; d1.fo = d2; d1.t = 14; d1.path = []; d1.tgo = 0; d1.bw = d2.bw = 1; emoteAt(d1, 'heart', 2); emoteAt(d2, 'heart', 2); floatMsg = { s: `${UNITS[b.p].nick}와 ${UNITS[b.q].nick}가 함께 산책해요 ♥`, x: W / 2, y: 120, t: 2.2 }; SFX.pick(); } /* v4.2 짝꿍 함께 걷기: 앞 친구는 길 따라 걷고, 짝꿍은 자기 걸음 빠르기로 따라감 */
function drawVilBud(P) { ctx.save(); ctx.fillStyle = 'rgba(20,10,0,.5)'; ctx.fillRect(-OX, 0, VW, H); ctx.restore(); uiPush({ x: -OX, y: 0, w: VW, h: H, key: 'vbblk', tap: () => { P.bud = false; } });
  pkCard(W / 2 - 330, 92, 660, 400, {}); txt('♥ 짝꿍과 칭호', W / 2, 116, 19, '#3a2210', 'center', false);
  const B2 = buddyPairs(); txt(`짝꿍 ${B2.length}쌍`, W / 2 - 316, 148, 15, '#c8407a', 'left', false);
  if (!B2.length) wrapTxt('하트 5개 이상 기사가 같은 친구를 3번 넘게 따라다니면 짝꿍이 돼요. 마을에서 같이 놀아 하트를 모아 보세요!', W / 2 - 316, 180, 290, 13, '#8a6142', 20);
  B2.slice(0, 4).forEach((b, k) => { const y = 168 + k * 72; RR(W / 2 - 320, y, 300, 64, 12); ctx.fillStyle = 'rgba(255,200,220,.35)'; ctx.fill(); [b.p, b.q].forEach((i, j) => drawCuteDog('vb' + k + j, UNITS[i].id, unitSprite(i), W / 2 - 284 + j * 64, y + 58, 0.42, { ph: k + j, em: false })); txt('♥', W / 2 - 252, y + 26, 18, '#ff5a8a', 'center', false); txt(`${UNITS[b.p].nick} · ${UNITS[b.q].nick}`, W / 2 - 180, y + 24, 14, '#3a2210', 'left', false, null, 100); txt(`같이 걸은 ${b.n}번`, W / 2 - 180, y + 44, 12, '#8a6142', 'left', false, null, 100);
    btn(W / 2 - 78, y + 18, 54, 28, '걷기', () => vilBuddyWalk(P, b), { bg: '#ff6a9a', size: 12.5, key: 'vbw' + k }); }); /* v4.2 짝꿍을 누르면 마을에서 둘이 함께 걷기 */
  const T2 = miniTitles(); txt(`칭호 ${T2.length}개`, W / 2 + 10, 148, 15, '#8a5a1a', 'left', false);
  if (!T2.length) wrapTxt('계절 미니 놀이를 같은 종류로 3번 끝내면 칭호가 생겨요 (10번이면 금 칭호).', W / 2 + 10, 180, 300, 13, '#8a6142', 20);
  T2.slice(0, 9).forEach((t, k) => { const x = W / 2 + 10 + (k % 2) * 154, y = 168 + Math.floor(k / 2) * 52; RR(x, y, 146, 44, 22); ctx.fillStyle = t.gold ? ART.lgr(ctx, '#fff3a0', '#e8b020', 0, y, 0, y + 44) : 'rgba(141,90,43,.15)'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = t.gold ? '#a87010' : '#c69355'; ctx.stroke(); ART.star(ctx, x + 20, y + 22, 8, t.gold ? '#ffffff' : '#e8b020'); txt(t.n, x + 36, y + 17, 13, '#3a2210', 'left', false, null, 104); const on = S.mtitle === t.n; txt(on ? `${t.c}번 · 달았어요` : `${t.c}번 · 달기`, x + 36, y + 33, 11.5, on ? '#c0501a' : '#8a6142', 'left', false, null, 104);
    if (on) { RR(x - 2, y - 2, 150, 48, 24); ctx.lineWidth = 3; ctx.strokeStyle = '#e0762a'; ctx.stroke(); } uiPush({ x, y, w: 146, h: 44, key: 'vbt' + k, tap: () => { S.mtitle = on ? null : t.n; save(); SFX.pick(); } }); }); /* v4.2 칭호 하나 골라 기사 이름 아래 리본으로 (꾸미기만) */
  btn(W / 2 + 196, 102, 124, 30, `📷 짝꿍 앨범 ${(S.album || []).length + (S.festPhoto ? 1 : 0)}`, () => { P.album = !P.album; }, { bg: '#ff8ab0', size: 13, key: 'vbalb' });
  btn(W / 2 - 70, 448, 140, 36, '닫기', () => { P.bud = false; P.album = false; }, { bg: '#a99a8a', size: 14, key: 'vbx' });
  if (P.album) { const A = (S.festPhoto ? [Object.assign({ fest: 1 }, S.festPhoto)] : []).concat(S.album || []); ctx.save(); ctx.fillStyle = 'rgba(20,10,0,.55)'; ctx.fillRect(-OX, 0, VW, H); ctx.restore(); uiPush({ x: -OX, y: 0, w: VW, h: H, key: 'albblk', tap: () => { P.album = false; } }); pkCard(W / 2 - 360, 70, 720, 420, {}); txt('📷 짝꿍 앨범 · 산책 끝에 꽃을 주고받으면 한 장씩 (최근 12장)', W / 2, 96, 15, '#3a2210', 'center', false, null, 680);
    if (!A.length) txt('아직 사진이 없어요 · 「♥ 짝꿍 · 칭호」에서 「걷기」를 눌러 보세요', W / 2, 260, 14, '#8a6142', 'center', false, null, 640);
    A.slice(0, 12).forEach((r, k) => { const x = W / 2 - 340 + (k % 6) * 114, y = 116 + Math.floor(k / 6) * 176, rot = ((k * 37) % 7 - 3) * 0.012; uiPush({ x, y, w: 104, h: 160, key: 'albp' + k, tap: () => { P.albSel = P.albSel === k ? null : k; SFX.click(); } }); if (P.albSel === k) { ctx.save(); ctx.translate(x + 52, y + 80); ctx.rotate(rot); ctx.lineWidth = 4; ctx.strokeStyle = '#ffb300'; ctx.strokeRect(-62, -88, 124, 176); ctx.restore(); } ctx.save(); ctx.translate(x + 52, y + 80); ctx.rotate(rot); if (P.albSel === k) P.albM = ctx.getTransform(); ctx.fillStyle = '#fffdf6'; ctx.shadowColor = 'rgba(40,20,0,.35)'; ctx.shadowBlur = 6; ctx.fillRect(-52, -78, 104, 156); ctx.shadowBlur = 0; if (r.fest) { const gg = ctx.createLinearGradient(-52, -78, 52, 78); gg.addColorStop(0, '#fff2a8'); gg.addColorStop(0.45, '#e0a020'); gg.addColorStop(0.55, '#ffe680'); gg.addColorStop(1, '#b07810'); ctx.strokeStyle = gg; ctx.lineWidth = 6; ctx.strokeRect(-49, -75, 98, 150); ctx.strokeStyle = '#8a5a08'; ctx.lineWidth = 1; ctx.strokeRect(-52, -78, 104, 156); [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([u, v]) => ART.star(ctx, u * 49, v * 75, 5, '#fff6c0')); } /* v5.2 잔치 사진 금테 */
      ctx.fillStyle = { spring: '#ffe0ec', summer: '#d8f0ff', autumn: '#ffe8c8', winter: '#eef4ff' }[r.sea] || '#f0e8d8'; ctx.fillRect(-46, -72, 92, 104); ctx.save(); ctx.beginPath(); ctx.rect(-46, -72, 92, 104); ctx.clip(); if (r.fest) { ['#ff6a8a', '#ffd34d', '#5ab8ff', '#7ad87a', '#c87aff', '#ff9a3a'].forEach((c, q) => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(-46 + q * 16, -58); ctx.lineTo(-38 + q * 16, -58); ctx.lineTo(-42 + q * 16, -48); ctx.closePath(); ctx.fill(); }); RR(-14, -12, 28, 18, 4); ctx.fillStyle = '#fff3e0'; ctx.fill(); ctx.fillStyle = '#ff8ab0'; ctx.fillRect(-14, -12, 28, 5); ctx.fillStyle = '#ffd34d'; ctx.fillRect(-1, -22, 2, 10); (S.deck || []).slice(0, 3).forEach((i, j) => { if (UNITS[i]) drawCuteDog('albf' + j, UNITS[i].id, unitSprite(i), -30 + j * 30, 30, 0.32, { flip: j === 2, ph: j, em: false }); }); } else [r.p, r.q].forEach((i, j) => { if (UNITS[i]) drawCuteDog('alb' + k + j, UNITS[i].id, unitSprite(i), -20 + j * 40, 26, 0.4, { flip: j === 1, ph: k + j, em: false }); }); ctx.restore(); /* v5.1 잔치 사진 */
      if (!r.fest) for (let q = 0; q < 5; q++) { const an = q / 5 * TAU; ctx.fillStyle = '#ff8ac0'; ctx.beginPath(); ctx.arc(Math.cos(an) * 3.6, -48 + Math.sin(an) * 3.6, 2.6, 0, TAU); ctx.fill(); } ctx.fillStyle = '#ffe27a'; ctx.beginPath(); ctx.arc(0, -48, 2.2, 0, TAU); ctx.fill();
      if (r.fest) { txt('손님 20명이', 0, 42, 12, '#6b4a08', 'center', false, null, 92); txt('축하해 줬어요', 0, 57, 12, '#6b4a08', 'center', false, null, 92); txt(`${r.m}월 ${r.d}일`, 0, 70, 11, '#8a6142', 'center', false); } else { txt(`${UNITS[r.p] ? UNITS[r.p].nick : ''} ♥ ${UNITS[r.q] ? UNITS[r.q].nick : ''}`, 0, 46, 12, '#3a2210', 'center', false, null, 96); txt(`${r.m}월 ${r.d}일`, 0, 64, 11.5, '#8a6142', 'center', false); } ctx.restore(); });
    if (P.albSel != null && A[P.albSel]) { btn(W / 2 + 160, 448, 170, 34, '💾 사진 저장·공유', () => albumSave(A[P.albSel], P.albM, P.albFr || A[P.albSel].sea || 'spring'), { bg: '#ff8ab0', size: 14, key: 'albsv' });
      const cur = P.albFr || A[P.albSel].sea || 'spring'; ALB_FR.forEach(([k, ic, col], q) => { const bx = W / 2 - 340 + q * 46; btn(bx, 448, 40, 34, ic, () => { P.albFr = k; SFX.click(); }, { bg: cur === k ? col : '#c8b8a8', size: 16, key: 'albf' + k }); }); txt('액자', W / 2 - 340 + 4 * 46 + 4, 465, 12.5, '#8a6142', 'left', false); } /* v4.7 계절 액자 4종 */ else if (A.length) txt('사진을 누르면 저장·공유할 수 있어요', W / 2 + 160, 465, 12, '#8a6142', 'center', false);
    btn(W / 2 - 60, 448, 120, 34, '닫기', () => { P.album = false; P.albSel = null; }, { bg: '#a99a8a', size: 14, key: 'albx' }); } }
/* v4.6 짝꿍 앨범 사진을 그림 파일로 — 화면에서 그 사진 부분만 잘라 예쁜 액자에 담아 저장/공유 */
const ALB_FR = [['spring', '🌸', '#ff8ab0'], ['summer', '🌊', '#5ab0e8'], ['autumn', '🍁', '#e8862a'], ['winter', '⛄', '#8aa8e0']];
function albumFrame(g, fr) { const C = { spring: ['#ffe0ec', '#fff3c4', '#ff8ab0'], summer: ['#d8f0ff', '#e8fff4', '#3a9ad8'], autumn: ['#ffe8c8', '#fff3c4', '#d8641a'], winter: ['#eef4ff', '#ffffff', '#7a9ad8'] }[fr] || ['#ffe0ec', '#fff3c4', '#ff8ab0'];
  const gr = g.createLinearGradient(0, 0, 0, 640); gr.addColorStop(0, C[0]); gr.addColorStop(1, C[1]); g.fillStyle = gr; g.fillRect(16, 16, 448, 608); g.lineWidth = 6; g.strokeStyle = C[2]; g.strokeRect(19, 19, 442, 602);
  const R = n => { let x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); };
  for (let k = 0; k < 26; k++) { const edge = k % 4, t = R(k + 1), x = edge === 0 ? 30 + t * 420 : edge === 1 ? 30 + t * 420 : edge === 2 ? 34 : 446, y = edge === 0 ? 34 : edge === 1 ? 560 : 40 + t * 520; g.save(); g.translate(x, y); g.rotate(R(k + 7) * 6);
    if (fr === 'spring') { g.fillStyle = '#ff9ac8'; for (let q = 0; q < 5; q++) { g.rotate(Math.PI * 2 / 5); g.beginPath(); g.ellipse(0, -6, 4, 6, 0, 0, Math.PI * 2); g.fill(); } g.fillStyle = '#ffe27a'; g.beginPath(); g.arc(0, 0, 2.5, 0, Math.PI * 2); g.fill(); }
    else if (fr === 'summer') { g.strokeStyle = '#3a9ad8'; g.lineWidth = 3; g.beginPath(); g.arc(-6, 0, 6, Math.PI, 0); g.arc(6, 0, 6, Math.PI, 0, true); g.stroke(); }
    else if (fr === 'autumn') { g.fillStyle = ['#e8622a', '#f0a02a', '#c83a1a'][k % 3]; g.beginPath(); g.moveTo(0, -10); for (let q = 0; q < 5; q++) { const a = -Math.PI / 2 + q * Math.PI * 2 / 5; g.lineTo(Math.cos(a) * 10, Math.sin(a) * 10); g.lineTo(Math.cos(a + 0.6) * 4, Math.sin(a + 0.6) * 4); } g.closePath(); g.fill(); }
    else { g.strokeStyle = '#7a9ad8'; g.lineWidth = 2; for (let q = 0; q < 3; q++) { g.rotate(Math.PI / 3); g.beginPath(); g.moveTo(-8, 0); g.lineTo(8, 0); g.stroke(); } }
    g.restore(); } }
function albumSave(r, M, fr) { try { const cv = document.querySelector('canvas'); if (!cv || !M) return; const c = document.createElement('canvas'); c.width = 480; c.height = 640; const g = c.getContext('2d');
  g.fillStyle = '#fff6e6'; g.fillRect(0, 0, 480, 640); albumFrame(g, fr || r.sea);
  const p0 = M.transformPoint ? M.transformPoint(new DOMPoint(-52, -78)) : { x: M.e - 52 * M.a, y: M.f - 78 * M.d }, sw = 104 * Math.hypot(M.a, M.b), sh = 156 * Math.hypot(M.c, M.d);
  g.save(); g.translate(240, 300); g.rotate(-0.03); g.shadowColor = 'rgba(60,30,0,.35)'; g.shadowBlur = 18; g.fillStyle = '#fff'; g.fillRect(-170, -250, 340, 500); g.shadowBlur = 0; g.drawImage(cv, p0.x, p0.y, sw, sh, -156, -234, 312, 468); g.restore();
  g.fillStyle = '#7a4520'; g.font = `bold 26px ${FONT}`; g.textAlign = 'center'; g.fillText('멍멍기사 짝꿍 앨범', 240, 596); g.font = `16px ${FONT}`; g.fillStyle = '#a0652a'; g.fillText(`${r.m}월 ${r.d}일`, 240, 620);
  const name = `멍멍기사_앨범_${r.m}월${r.d}일_${(UNITS[r.p] || {}).nick || ''}.png`, data = c.toDataURL('image/png'), CP = window.Capacitor && window.Capacitor.Plugins;
  if (CP && CP.Filesystem && CP.Share) { CP.Filesystem.writeFile({ path: name, data: data.split(',')[1], directory: 'CACHE' }).then(w => CP.Share.share({ title: '멍멍기사 짝꿍 사진', files: [w.uri] })).then(() => { floatMsg = { s: '사진을 보냈어요!', x: W / 2, y: 110, t: 2 }; }).catch(() => { floatMsg = { s: '사진 공유를 취소했어요', x: W / 2, y: 110, t: 2 }; }); return; }
  c.toBlob(b => { const f = b && typeof File !== 'undefined' ? new File([b], name, { type: 'image/png' }) : null;
    if (f && navigator.canShare && navigator.canShare({ files: [f] })) { navigator.share({ files: [f], title: '멍멍기사 짝꿍 사진' }).catch(() => {}); return; }
    const a = document.createElement('a'); a.href = data; a.download = name; document.body.appendChild(a); a.click(); a.remove(); floatMsg = { s: '사진을 저장했어요 (다운로드 폴더)', x: W / 2, y: 110, t: 2.2 }; }, 'image/png'); SFX.pick(); } catch (e) { floatMsg = { s: '이 기기에서는 사진 저장이 안 돼요', x: W / 2, y: 110, t: 2.2 }; } }
const MINI_LOG = [['spring', 0, '🌸 꽃잎'], ['spring', 1, '🦋 나비'], ['summer', 0, '🦆 오리'], ['summer', 1, '🐚 조개'], ['autumn', 0, '🍎 수확'], ['autumn', 1, '🌰 도토리'], ['winter', 0, '⛄ 눈사람'], ['winter', 1, '❄ 눈꽃']];
function drawMiniLog(x, y) { const K = S.vilMiniK || {}; txt(`멍멍 마을 미니 놀이 기록 · 모두 ${S.vilMiniDone || 0}번`, x + 290, y + 8, 14, '#6b4426', 'center', false);
  MINI_LOG.forEach(([sea, v, n], i) => { const bx = x + (i % 4) * 146, by = y + 22 + Math.floor(i / 4) * 48, c = K[sea + v] || 0; RR(bx, by, 138, 42, 10); ctx.fillStyle = c ? 'rgba(255,201,60,.32)' : 'rgba(141,90,43,.1)'; ctx.fill(); txt(n, bx + 10, by + 21, 13.5, c ? '#4e342e' : '#a89580', 'left', false, null, 84); txt(c ? `${c}번` : '아직', bx + 128, by + 21, 14, c ? '#2e7d32' : '#a89580', 'right', false); if (c >= 3) ART.star(ctx, bx + 6, by + 6, 6, c >= 10 ? '#ffd34d' : '#e8c890'); }); }
function drawCodexEvents() {
  S.evSeen = S.evSeen || {}; S.seasonSeen = S.seasonSeen || {};
  const list = [...Object.keys(BEV).map(k => ({ k, kind: 'ev', E: BEV[k], seen: !!S.evSeen[k] })), ...Object.keys(SEASONS).map(k => ({ k, kind: 'season', E: SEASONS[k], seen: !!S.seasonSeen[k] }))];
  txt(`발견한 이벤트 ${list.filter(x => x.seen).length} / ${list.length}`, 164, 168, 12, '#a0652a', 'center', false);
  list.forEach((it, i) => { const y = 180 + i * 27.5; cxRow(26, y, 276, 24, codexSel && codexSel.ev === it.k, !it.seen, true);
    ctx.beginPath(); ctx.arc(40, y + 12, 6, 0, TAU); ctx.fillStyle = it.seen ? it.E.c : 'rgba(160,140,120,.4)'; ctx.fill();
    txt(it.seen ? it.E.n : (it.kind === 'season' ? '??? (계절 이벤트)' : '??? (전투 중 깜짝 이벤트)'), 54, y + 12.5, 12.5, it.seen ? '#4e342e' : '#a89580', 'left', false, null, 240);
    uiPush({ x: 26, y, w: 276, h: 24, key: 'evc' + i, tap: () => { codexSel = { ev: it.k }; } }); });
  ART.panel(ctx, 326, 62, 620, 468, 'cream');
  const sel = codexSel && list.find(x => x.k === codexSel.ev);
  if (!sel) { bigText('이벤트 도감', 636, 120, 30, '#fff3c4', '#ffb300'); wrapTxt(`전투 중 깜짝 이벤트와 계절 이벤트를 모아요.\n처음 보는 이벤트는 자동으로 기록되고 코인 ${EV_FIRST}개를 받아요.\n계절 이벤트는 날짜가 되면 저절로 켜져요(설날·추석은 앞뒤 사흘, 할로윈 10/24~31, 크리스마스 12/18~26).`, 360, 170, 552, 15, '#6b4426', 26);
    const sn = seasonNow(); if (sn) { ART.panel(ctx, 400, 330, 470, 60, 'dark'); txt(`지금 진행 중 · ${SEASONS[sn].n}`, 635, 352, 17, SEASONS[sn].c, 'center'); txt(SEASONS[sn].d, 635, 374, 12, '#fff3d6', 'center', false, null, 450); } drawMiniLog(346, 404); return; }
  const E = sel.E;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5; ctx.drawImage(ART.softDot(sel.seen ? E.c : '#a89580'), 476, 70, 320, 120); ctx.restore();
  bigText(sel.seen ? E.n : '???', 636, 128, 28, '#fff6d0', sel.seen ? E.c : '#a89580');
  txt(sel.kind === 'season' ? '계절 이벤트' : '전투 중 깜짝 이벤트 (3판부터, 한 판에 최대 2번)', 636, 166, 13, '#a0652a', 'center', false);
  wrapTxt(sel.seen ? E.d : '아직 만나지 못한 이벤트예요. 전투를 계속하다 보면 만날 수 있어요!', 372, 206, 528, 16, '#5a3412', 26);
  if (sel.kind === 'season') { const P = PETS.find(q => q.id === E.pet); if (P) { ART.draw(ctx, 'pet_' + P.id, (S.pets || {})[P.id] ? 'i' + (Math.floor(G.time * 2.4) % 3) : 'ib', 636, 400, 3.0, false, 0); txt(`${P.n} ${(S.pets || {})[P.id] ? '· 함께하는 중' : '· 아직 못 만났어요'}`, 636, 428, 14, '#6b4426', 'center', false); } }
  else if (sel.seen) txt(`처음 발견 보상 · 코인 ${EV_FIRST}개 받음`, 636, 420, 13, '#8a6142', 'center', false);
}
function drawCodexShards() {
  const c = shardsOwned();
  txt(`색깔 조각 ${c} / 7`, 164, 168, 13, '#a0652a', 'center', false);
  SHARDS.forEach((q, k) => { const y = 182 + k * 42, on = S.cleared >= q.at; cxRow(26, y, 276, 36, false, !on, true);
    ctx.beginPath(); ctx.arc(48, y + 18, 12, 0, TAU); ctx.fillStyle = on ? q.c : 'rgba(160,140,120,.35)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = on ? '#fff' : 'rgba(120,90,60,.4)'; ctx.stroke();
    txt(on ? `${q.n} · 「${q.m}」` : `??? · 「${q.m}」`, 70, y + 12, 14, on ? '#4e342e' : '#a89580', 'left', false); txt(on ? q.by : (q.at < 999 ? `스테이지 ${q.at} 클리어` : q.by), 70, y + 27, 11, '#8a6142', 'left', false); });
  ART.panel(ctx, 326, 62, 620, 468, 'cream');
  bigText('무지개 다리 · 색깔 조각', 636, 108, 28, '#fff3c4', '#ffb300');
  // 큰 무지개: 얻은 색만 빛남
  const cx = 636, cy = 330; SHARDS.forEach((q, k) => { const on = k < c; ctx.strokeStyle = on ? q.c : 'rgba(160,140,120,.25)'; ctx.lineWidth = 14; ctx.beginPath(); ctx.arc(cx, cy, 190 - k * 15, Math.PI, TAU); ctx.stroke();
    if (on) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25 + Math.sin(G.time * 2 + k) * 0.15; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, cy, 190 - k * 15, Math.PI * 1.05, Math.PI * 1.25); ctx.stroke(); ctx.restore(); } });
  [[cx - 205, cy], [cx + 205, cy]].forEach(([x, y]) => { ART.E(ctx, x, y, 46, 20); ctx.fillStyle = '#ffffff'; ctx.fill(); });
  wrapTxt('색을 잃은 땅마다 하나씩 숨어 있는 일곱 빛 조각.\n조각을 찾을 때마다 무지개 다리가 한 칸씩 자라요. 지도 맨 끝에서 다리를 볼 수 있어요.', 360, 372, 552, 14.5, '#6b4426', 23);
  ART.draw(ctx, heroType(), 'i' + (Math.floor(G.time * 2.4) % 3), cx, cy + 6, 0.62, false, 0);
  // v2.3 옛 기사의 메달 줄
  const mc = medalsOwned(); RR(352, 452, 568, 66, 12); ctx.fillStyle = 'rgba(255,224,170,.4)'; ctx.fill(); txt(`옛 기사의 메달 ${mc} / 7`, 372, 470, 14, '#6b4426', 'left', false); txtW('백 년 전 일곱 기사의 메달을 찾는 새 여정 (시즌 14~)', 372, 498, 11.5, '#8a6142', 'left', 230, 14);
  MEDALS.forEach((q, k) => { const x = 620 + k * 42, y = 485, on = S.cleared >= q.at; ctx.beginPath(); ctx.arc(x, y, 15, 0, TAU); ctx.fillStyle = on ? q.c : 'rgba(160,140,120,.3)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = on ? '#a8781a' : 'rgba(120,90,60,.4)'; ctx.stroke(); if (on) { ART.star(ctx, x, y, 7, '#fff6c0'); } else txt('?', x, y, 13, 'rgba(120,90,60,.6)', 'center', false); });
}
// v1.6 도감: 본 컷신 다시 보기 (장 선택 → 장면 선택)
function drawCodexReplay() {
  const PER = 10, chs = Math.min(CHN, Math.floor(S.cleared / CHL) + 1), pages = Math.max(1, Math.ceil(chs / PER)); if (codexPage >= pages) codexPage = pages - 1;
  txt('본 컷신을 다시 볼 수 있어요', 164, 168, 12, '#a0652a', 'center', false);
  if (pages > 1) { btn(26, 488, 60, 32, '◀', () => { codexPage = (codexPage + pages - 1) % pages; }, { bg: '#c9a983', size: 15, key: 'rpp' }); btn(242, 488, 60, 32, '▶', () => { codexPage = (codexPage + 1) % pages; }, { bg: '#c9a983', size: 15, key: 'rpn' }); txt(`${codexPage + 1} / ${pages}`, 164, 504, 13, '#8a6142', 'center', false); }
  const sel = codexSel && codexSel.rep != null ? codexSel.rep : Math.min(chs - 1, Math.floor(S.cleared / CHL));
  for (let i = 0; i < PER; i++) { const z = codexPage * PER + i; if (z >= chs) break; const y = 182 + i * 30;
    RR(26, y, 276, 26, 8); ctx.fillStyle = sel === z ? '#ffe082' : 'rgba(141,90,43,.1)'; ctx.fill(); txt(CH_NAMES[z], 38, y + 13.5, 13, '#4e342e', 'left', false, null, 252);
    uiPush({ x: 26, y, w: 276, h: 26, key: 'rp' + i, tap: () => { codexSel = { rep: z }; } }); }
  ART.panel(ctx, 326, 62, 620, 468, 'cream');
  bigText(CH_NAMES[sel], 636, 100, 24, '#fff3c4', '#ffb300');
  const keys = []; for (let n = sel * CHL + 1; n <= sel * CHL + CHL; n++) for (const p of ['pre', 'post']) if (window.STORY && STORY.SCENES[p + n]) keys.push([p + n, n, p]);
  keys.forEach(([k, n, p], i) => { const col = i % 4, row = Math.floor(i / 4), x = 346 + col * 148, y = 128 + row * 64, seen = S.seen && S.seen[k], sc = STORY.SCENES[k];
    const lab = `${n}판 ${p === 'pre' ? '시작 전' : '승리 후'}`, sub = sc.title ? sc.title.replace(/^.*·\s*/, '') : `대사 ${sc.lines.length}줄`;
    if (seen) { btn(x, y, 140, 56, lab, () => replayStory(k), { bg: sc.boss ? '#ff9a8a' : p === 'pre' ? '#ffc93c' : '#8fd28a', size: 14, key: 'rk' + i }); txt(fitTxtS(sub, 128), x + 70, y + 46, 10, '#5a3412', 'center', false); }
    else { RR(x, y, 140, 56, 12); ctx.fillStyle = 'rgba(141,90,43,.12)'; ctx.fill(); txt(lab, x + 70, y + 22, 13, '#a89580', 'center', false); txt('아직 못 봤어요', x + 70, y + 40, 11, '#a89580', 'center', false); } });
  if (!keys.length) txt('이 장에는 컷신이 없어요', 636, 300, 16, '#8a6142', 'center', false);
}
function fitTxtS(s, w) { ctx.font = `bold 10px ${FONT}`; return fitText(s, w); }
function drawSettings() {
  ART.panel(ctx, 130, 70, 700, 456, 'cream');
  bigText('설정', W / 2, 108, 32, '#fff3c4', '#ffb300');
  btn(W / 2 - 290, 140, 280, 56, S.music ? '배경음악: 켜짐' : '배경음악: 꺼짐', () => { S.music = !S.music; applyAudioPrefs(); save(); }, { bg: S.music ? '#5cc96b' : '#a99a8a', size: 18 });
  btn(W / 2 + 10, 140, 280, 56, S.sound ? '효과음: 켜짐' : '효과음: 꺼짐', () => { S.sound = !S.sound; applyAudioPrefs(); save(); }, { bg: S.sound ? '#5cc96b' : '#a99a8a', size: 18 });
  btn(W / 2 - 290, 210, 280, 56, '♪ 주제가 「함께 짖으면 노래가 돼」', () => go(() => { titleReady = true; setScene('title'); }), { bg: '#ffb84d', size: 17 });
  btn(W / 2 + 10, 210, 280, 56, '스토리 다시 보기 (도감)', () => { mapTab = 4; codexCat = 8; codexSel = null; codexPage = 0; }, { bg: '#9b6bff', size: 17, key: 'replay' });
  btn(W / 2 - 290, 280, 280, 50, '🐉 기사 · 용 꾸미기', () => openCreator(() => setScene('map')), { bg: '#5cc96b', size: 17, key: 'custom' });
  btn(W / 2 + 10, 280, 280, 50, resetArm ? '정말 초기화? 한 번 더!' : '저장 데이터 초기화', () => { if (!resetArm) { resetArm = 1; return; } S = defSave(); save(); resetArm = 0; mapTab = 0; }, { bg: resetArm ? '#ef5350' : '#c9a983', size: resetArm ? 16 : 18 });
  const lines = [`멍멍기사 디펜스  v${VERSION}`, '모든 캐릭터·그림·음악·효과음은 이 게임을 위해 코드로 직접 만든 오리지널입니다.', '주제가 「함께 짖으면 노래가 돼」 작사·작곡: 멍멍기사 디펜스 제작팀 (오리지널)', '저장 데이터는 이 기기에만 보관되며 외부로 전송되지 않습니다.', '조작: ◀▶ 이동 · 카드 소환 · 스킬 버튼 · (PC: ←→ / 1~5 / Q W E · F 미르의 불꽃 / R / P)', '제작: 덕환사마'];
  btn(W / 2 - 94, 338, 188, 40, S.emoteOff ? '말풍선: 꺼짐' : '말풍선: 켜짐', () => { S.emoteOff = !S.emoteOff; save(); }, { bg: S.emoteOff ? '#a99a8a' : '#ffb0cc', size: 15, key: 'emote' });
  { const di = S.diff != null ? S.diff : 1; btn(W / 2 + 102, 338, 188, 40, `난이도: ${DIFFS[di].n}`, () => { S.diff = (di + 1) % 3; save(); }, { bg: ['#9ee6a0', '#ffc93c', '#ff8a8a'][di], size: 15, key: 'diff' }); }
  btn(W / 2 - 290, 338, 188, 40, S.edgeUI === false ? '버튼 위치: 가운데' : '버튼 위치: 화면 끝', () => { S.edgeUI = S.edgeUI === false; save(); }, { bg: '#8fc0e8', size: 15, key: 'edgeui' });
  btn(W / 2 - 336, 80, 150, 34, `⏩ 전투 빠르기: ${['느리게', '보통', '빠르게'][S.tempo == null ? 1 : S.tempo]}`, () => { S.tempo = ((S.tempo == null ? 1 : S.tempo) + 1) % 3; save(); }, { bg: '#8fc0e8', size: 13.5, key: 'tempo' });
  btn(W / 2 + 196, 80, 140, 34, '📒 아이템 기록', () => { ITEMLOG = !ITEMLOG; }, { bg: '#e8962a', size: 14, key: 'itemlog' });
  lines.forEach((s, i) => txt(s, W / 2, 394 + i * 21, i ? 13 : 16, i ? '#8a6142' : '#5a3412', 'center', false));
  ART.draw(ctx, 'u0', 'i' + (Math.floor(G.time * 2.4) % 3), 168, 506, 0.8, false, 0);
  ART.draw(ctx, 'u2', 'i' + (Math.floor(G.time * 2.4 + 1) % 3), 792, 506, 0.8, true, 0);
  if (ITEMLOG) { const L = S.itemLog || {}, tot = ITEMS.reduce((a, it) => a + (L[it.id] || 0), 0); ui = ui.filter(u => u.key === 'itemlog'); ctx.fillStyle = 'rgba(20,10,30,.55)'; ctx.fillRect(-OX, 0, VW, H); pkCard(150, 120, 660, 380, {}); bigText('아이템 사용 기록', W / 2, 150, 24, '#fff3c4', '#e8962a'); const top = ITEMS.slice().sort((a, b) => (L[b.id] || 0) - (L[a.id] || 0))[0]; txt(tot ? `지금까지 모두 ${tot}개 · 가장 많이 쓴 아이템: ${top.n} (${L[top.id]}번)` : '아직 쓴 아이템이 없어요', W / 2, 184, 14.5, '#5a3a1e', 'center', false);
    ITEMS.forEach((it, i) => { const x = 176 + (i % 3) * 212, y = 204 + Math.floor(i / 3) * 92, n = L[it.id] || 0; RR(x, y, 200, 84, 12); ctx.fillStyle = 'rgba(141,90,43,.1)'; ctx.fill(); if (tot && it === top) { ctx.lineWidth = 3; ctx.strokeStyle = '#ffb300'; RR(x, y, 200, 84, 12); ctx.stroke(); txt('👑', x + 186, y + 14, 15, '#fff', 'center', false); } itemArt(it.id, x + 40, y + 42, 64); txt(it.n, x + 80, y + 28, 14, '#3e2418', 'left', false, null, 116); txt(`${n}번 사용`, x + 80, y + 56, 16, n ? '#c0601a' : '#9a8a7a', 'left', false); });
    btn(W / 2 - 70, 478, 140, 36, '닫기', () => { ITEMLOG = false; }, { bg: '#8a7a9a', size: 15, key: 'itemlogx' }); }
}
let ITEMLOG = false;

/* ---------------- 루프 ---------------- */
function update(dt) {
  G.time += dt; G.dt = dt;
  for (const k in pressT) { pressT[k] -= dt; if (pressT[k] <= 0) delete pressT[k]; }
  if (scene === 'story' && ST) { const au = S.autoSt || 0; ST.t += dt * (au === 2 ? 1.7 : 1); if (ST.titleT > 0) ST.titleT -= dt;
    else if (au && !trans && !ST.done && ST.t * TYPE_SPD >= [...storyLine()[2]].length) { ST.autoT = (ST.autoT || 0) + dt; if (ST.autoT > (au === 2 ? 0.7 : 1.3) + [...storyLine()[2]].length * (au === 2 ? 0.02 : 0.035)) storyNext(); } }
  if (trans) { trans.t += dt; if (!trans.done && trans.t >= trans.dur / 2) { trans.done = true; trans.fn(); } if (trans.t >= trans.dur) trans = null; }
  TEMPO = TEMPO0 * TEMPO_OPT[S.tempo == null ? 1 : S.tempo];
  if (scene === 'battle' && B) { if (B.intro) updIntro(dt); else if (B.slowmo > 0 && !B.over) { B.slowmo -= dt; updBattle(dt * 0.3 * TEMPO); } else if (B.freeze > 0) { B.freeze -= dt; updFx(dt * 0.3); } else { const steps = B.paused ? 1 : B.speed; for (let i = 0; i < steps; i++) updBattle(dt * TEMPO); } if (B.over && B.party) { for (const a of B.allies) { if (a.dead) continue; if (a.hop > 0) a.hop -= dt; else if (Math.random() < dt * 1.2) { a.hop = 0.5; if (Math.random() < 0.35) emoteAt(a, pick(['heart', 'note', 'star']), 1.6); } if (a.em) { a.em.t -= dt; if (a.em.t <= 0) a.em = null; } } const hh = B.hero; if (hh.em) { hh.em.t -= dt; if (hh.em.t <= 0) hh.em = null; } } if (B.over) B.over.t += dt; }
}
function drawTrans() {
  if (!trans) return;
  const p = trans.t / trans.dur, k = p < 0.5 ? p * 2 : (1 - p) * 2, r = (1 - ease(k)) * 620;
  ctx.save(); ctx.fillStyle = '#2a1a10'; ctx.beginPath(); ctx.rect(-OX, 0, VW, H); ctx.arc(W / 2, H / 2, Math.max(0.1, r), 0, TAU, true); ctx.fill();
  if (k > 0.85) ART.paw(ctx, W / 2, H / 2, 4, 'rgba(255,207,90,.8)');
  ctx.restore();
}
function draw() {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#2a1a10'; ctx.fillRect(0, 0, cvs.width, cvs.height);
  ctx.setTransform(scl * dpr, 0, 0, scl * dpr, OX * scl * dpr, 0); BASE_SC = scl * dpr;
  UIDX = 0; EDG.length = 0;
  ui = []; sceneTap = null; dragH = null;
  if (scene === 'title') drawTitle(); else if (scene === 'create' && CR) drawCreate(); else if (scene === 'map') drawMap(); else if (scene === 'story' && ST) drawStory(); else if (B) drawBattle();
  drawTrans();
  if (BACKTOAST > 0) { BACKTOAST -= G.dt || 0.016; ctx.save(); ctx.globalAlpha = Math.min(1, BACKTOAST * 2); ART.panel(ctx, W / 2 - 170, H - 90, 340, 40, 'dark'); txt('한 번 더 누르면 게임이 꺼져요', W / 2, H - 70, 15, '#ffe082', 'center'); ctx.restore(); }
}
let last = performance.now();
function loop(now) { const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now; try { if (!window.__freeze) update(dt); draw(); } catch (err) { console.error(err); if (!window.__mmkErr) { window.__mmkErr = 1; window.mmkFail && window.mmkFail('게임 루프: ' + (err && err.stack || err)); } } requestAnimationFrame(loop); }
requestAnimationFrame(loop);

try {
  const CapApp = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
  if (CapApp) CapApp.addListener('backButton', () => {
    // v1.8 뒤로 가기: 열린 창 닫기 → 전투는 일시정지 → 지도 탭은 지도로 → 타이틀에서 두 번 누르면 종료
    if (scene === 'battle' && B && !B.over) B.paused = !B.paused;
    else if (scene === 'battle') go(() => setScene('map'));
    else if (scene === 'story' && ST) { if (ST.log) ST.log = false; else ST.log = true; }
    else if (scene === 'map') {
      if (VILP) VILP = null; else if (SHOPP) SHOPP = null; else if (WARDP) WARDP = null; else if (AWKINFO) AWKINFO = null; else if (COMBOP) COMBOP = null; else if (AWK_POP) AWK_POP = null; else if (WEEKP) WEEKP = null; else if (SHARDP) { S.shardSeen = shardsOwned(); save(); SHARDP = null; } else if (PETP) PETP = null; else if (MIRP) MIRP = null; else if (DAILY) DAILY = null; else if (GROWN) GROWN = null; else if (PROMO_POP) PROMO_POP = null; else if (THIRD_POP) THIRD_POP = null;
      else if (popup) popup = 0; else if (mapTab !== 0) mapTab = 0; else go(() => setScene('title')); }
    else if (scene === 'create') creatorDone();
    else { if (G.time - (window.__backT || -9) < 2) CapApp.exitApp(); else { window.__backT = G.time; BACKTOAST = 2; } }
  });
} catch (e) {}

/* =========================================================
   v1.2 3차 직업(전직 시험) · 오늘의 할 일(일일 미션 + 7일 출석) · 무한의 탑 · 미르 꾸미기
   ========================================================= */
const THIRD = [
  { n: '천둥 돌격왕 콩이', sk: '천둥 돌격', d: '10초마다 앞의 적들을 꿰뚫는 번개 돌격 (공격 ×3)', col: '#ffd34d' },
  { n: '불멸의 성벽 뭉치', sk: '불멸의 함성', d: '10초마다 주변 동료 체력 25% 회복 + 2초 무적', col: '#7cc4ff' },
  { n: '별빛 신궁 초코', sk: '별빛 화살비', d: '10초마다 넓은 범위에 화살비 (공격 ×2.4)', col: '#9ee6a0' },
  { n: '오로라 현자 설이', sk: '오로라 폭풍', d: '10초마다 큰 마법 폭발 + 적 1.2초 기절', col: '#c8a0ff' },
  { n: '천검 백구', sk: '천검 일섬', d: '10초마다 한 줄의 적에게 검기 (공격 ×4)', col: '#ff8a8a' },
  { n: '하늘포 대원수 망고', sk: '하늘 포격', d: '10초마다 폭탄 5발 연속 포격', col: '#ffb06a' },
  { n: '빛의 천사 몽실', sk: '천사의 날개', d: '10초마다 모든 동료와 기사 체력 30% 회복', col: '#ffb3e6' },
  { n: '질풍 창성 쭈니', sk: '질풍 관통', d: '10초마다 적을 꿰뚫고 돌진 (공격 ×3 · 최대 6명)', col: '#7affd0' },
  { n: '황금 요새 태산', sk: '황금 요새', d: '10초마다 주변 적을 밀쳐 내고 1초 기절', col: '#ffe08a' },
  { n: '달그림자 닌자왕 치치', sk: '달그림자 분신', d: '10초마다 분신 3번 연속 베기 (공격 ×2 · 치명타)', col: '#b48cff' },
];
const third = i => !!(S.third && S.third[i]);
// v2.0 각성 ★1~★5 (3차 직업 다음): 별가루 + 코인. 한 단계마다 동료 능력치 +12%, ★3 고유 기술 대기 10초→7초, ★5 고유 기술 위력 1.5배
const awk = i => (S.awk && S.awk[i]) || 0;
const awkCost = L => ({ coin: 3000 * L * L, dust: 3 * L });
// v2.2 각성할 수 있는 동료(3차 직업 + 코인·별가루 충분)가 있으면 그 번호, 없으면 -1 → 강화 탭 빨간 점
function awkReady() { for (let i = 0; i < UNITS.length; i++) { if (!third(i) || (S.up['u' + i] || 0) < UPMAX) continue; const a = awk(i); if (a >= 5) continue; const c = awkCost(a + 1); if (S.coins >= c.coin && (S.dust || 0) >= c.dust) return i; } return -1; }
let AWK_POP = null, AWKINFO = null;
function drawAwkInfo() {
  const P = AWKINFO; P.t += G.dt || 0.016; ui = []; dragH = null;
  ctx.save(); ctx.globalAlpha = Math.min(1, P.t * 4); ctx.fillStyle = 'rgba(20,6,30,.74)'; ctx.fillRect(-OX, 0, VW, H); ctx.restore();
  ART.panel(ctx, W / 2 - 330, 56, 660, 430, 'cream'); bigText('각성 단계 미리 보기', W / 2, 92, 26, '#f6e0ff', '#9b4dff');
  txt('3차 직업이 된 동료만 각성할 수 있어요 · 코인 + 별가루', W / 2, 120, 12, '#8a6142', 'center', false);
  const eff = ['체력·공격력 +12%', '체력·공격력 +24%', '+36% · 고유 기술 10초 → 7초마다', '+48% · 고유 기술 7초마다', '+60% · 고유 기술 위력 1.5배'];
  for (let L = 1; L <= 5; L++) { const y = 140 + (L - 1) * 58, c = awkCost(L); RR(W / 2 - 300, y, 600, 50, 12); ctx.fillStyle = L === 3 || L === 5 ? 'rgba(176,124,255,.18)' : 'rgba(141,90,43,.1)'; ctx.fill();
    for (let q = 0; q < L; q++) ART.star(ctx, W / 2 - 280 + q * 16, y + 25, 7, '#b07cff');
    txt(eff[L - 1], W / 2 - 180, y + 25, 15, '#4e342e', 'left', false, null, 300); ART.icon(ctx, 'coin', W / 2 + 150, y + 25, 18); txt('' + c.coin, W / 2 + 162, y + 26, 13, '#8a5a1a', 'left', false); ART.star(ctx, W / 2 + 240, y + 25, 7, '#b07cff'); txt('' + c.dust, W / 2 + 252, y + 26, 13, '#6a3a9a', 'left', false); }
  btn(W / 2 - 80, 434, 160, 40, '닫기', () => { AWKINFO = null; }, { bg: '#a99a8a', size: 16, key: 'awkinfoClose' });
}
function addDust(n, x, y) { S.dust = (S.dust || 0) + n; if (B && x != null) addText(x, y, `별가루 +${n}`, '#d8b8ff', 16, true); }
let TRIAL = null, TOWER = null, THIRD_POP = null, DAILY = null, MIRP = null;
function todayKey() { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
function weekKey() { return Math.floor((Date.now() / 86400000 + 3) / 7); }
function ensureDaily() {
  const k = todayKey();
  if (!S.daily || S.daily.d !== k) S.daily = { d: k, k: 0, s: 0, c: 0, got: [0, 0, 0] };
  if (!S.att) S.att = { last: '', n: 0 };
  const w = weekKey();
  if (!S.tower) S.tower = { w, cur: 1, best: 0, hist: [] };
  if (S.tower.w !== w) { if (S.tower.best > 0) S.tower.hist.push({ w: S.tower.w, best: S.tower.best }); S.tower.hist = S.tower.hist.slice(-12); S.tower = { w, cur: 1, best: 0, hist: S.tower.hist }; }
}
function dailyAdd(f, n) { try { ensureDaily(); S.daily[f] += n; } catch (e) {} }
const MISSIONS_D = [
  { n: '몬스터 150마리 처치', f: 'k', goal: 150, rew: () => ({ coins: 500 + S.cleared * 10 }) },
  { n: '스킬 12번 사용', f: 's', goal: 12, rew: () => ({ coins: 300 + S.cleared * 6, pot: 1 }) },
  { n: '전투 3번 승리', f: 'c', goal: 3, rew: () => ({ coins: 400, item: 2 }) },
];
const ATT_REW = [{ coins: 500 }, { pot: 1 }, { coins: 1000 }, { item: 1 }, { coins: 2000 }, { pot: 3 }, { item: 2, coins: 3000 }]; /* v4.8 출석 7일: 펫 빼고(펫은 상점에서만) · 장비는 고급/희귀 */
const rewText = r => [r.coins ? `${r.coins}코인` : '', r.pot ? `물약 ${r.pot}` : '', r.item ? `${RAR[r.item]} 장비` : '', r.pet ? '친구 펫' : ''].filter(Boolean).join(' + ');
function giveRew(r) {
  if (r.coins) S.coins += r.coins;
  if (r.pot) S.potions = Math.min(9, S.potions + r.pot);
  if (r.pet) { const pp = givePet(); if (pp) PETP = { t: 0, got: pp }; }
  if (r.item) { const it = makeItem(Math.max(10, S.cleared), r.item, 'reward'); if (S.inv.length < 28) S.inv.push(it); else S.coins += sellPrice(it); }
  save(); SFX.coin();
}
/* ---- 전직 시험 ---- */
function startTrial(i) {
  TRIAL = i; TOWER = null;
  const n = clamp(S.cleared - 8, 12, MAXST);
  startBattle(n); B.trial = i; B.special = true; B.food = 120; B.ucd = UNITS.map(() => 0);
  B.si = Object.assign({}, B.si, { name: `전직 시험 · ${UNITS[i].nick}`, m: B.si.m * 0.62, am: B.si.am * 0.7, boss: false, bossKey: null, mid: false, midKey: null });
  B.msg = { t: 3.2, s: `${UNITS[i].nick}만 출전할 수 있어요! 둥지를 부수면 3차 직업 「${THIRD[i].n}」` };
}
/* ---- 무한의 탑 ---- */
function towerStage(f) { return clamp(10 + f * 3, 10, MAXST); }
function startTower() {
  ensureDaily(); const f = S.tower.cur; TOWER = f; TRIAL = null;
  startBattle(towerStage(f)); B.tower = f; B.special = true;
  const boss = f % 10 === 0, ch = Math.min(CHN - 1, Math.floor(f / 10) % CHN);
  B.si = Object.assign({}, B.si, { name: `무한의 탑 ${f}층${boss ? ' · 수호자' : ''}`, m: B.si.m * 1.25 * (1 + f * 0.06), am: B.si.am * 1.3 * (1 + f * 0.045), interval: B.si.interval * 0.85, /* v2.5 탑은 일반 판보다 확실히 세게 */ boss, bossKey: boss ? BOSSES[ch] : null, mid: f % 5 === 0 && !boss, midKey: f % 5 === 0 && !boss ? MIDS[ch] : null });
  if (boss) ART.warm([BOSSES[ch]]);
}
/* ---- v2.0 주간 도전: 매주 월요일 규칙이 바뀌는 특별 판. 깨면 그 주 스티커 + 성 장식 + 별가루 ---- */
const WEEKLY = [
  { k: 'giant', n: '거대 몬스터 주간', d: '거대 몬스터만 나와요 (수는 적지만 아주 튼튼해요)', deco: '거대 리본', col: '#ff8a5a' },
  { k: 'bone2x', n: '뼈다귀 풍년 주간', d: '뼈다귀가 2배로 차요. 대신 멍멍성이 절반만 튼튼해요', deco: '황금 뼈 깃발', col: '#ffd34d' },
  { k: 'bossrush', n: '보스 3연속 주간', d: '둥지가 다칠 때마다 지난 보스가 3명 차례로 나와요', deco: '왕관 장식', col: '#ff5a7a' },
  { k: 'fast', n: '번개 주간', d: '몬스터가 아주 빨라요. 대신 뼈다귀도 빨리 차요', deco: '번개 깃발', col: '#ffe86a' },
  { k: 'noskill', n: '맨손 주간', d: '기사 스킬을 못 써요. 대신 동료 공격력 2배', deco: '방패 문장', col: '#8fb8ff' },
  { k: 'heroonly', n: '혼자 용사 주간', d: '동료를 못 불러요! 대신 기사 공격력 3배 · 체력 2배', deco: '용사 동상', col: '#ffb070' },
  { k: 'night', n: '깜깜한 밤 주간', d: '밤 전장 + 몬스터가 1.5배 많아요', deco: '달 등불', col: '#b0a0ff' },
  { k: 'eventfest', n: '이벤트 축제 주간', d: '깜짝 이벤트가 5번이나 일어나요', deco: '축제 풍선', col: '#ff9ed8' },
  { k: 'tiny', n: '꼬마 떼 주간', d: '몬스터가 2배로 많이 나와요. 대신 체력이 절반', deco: '꼬마 풍차', col: '#9ee6a0' },
  { k: 'twolane', n: '두 갈래 길 주간', d: '몬스터가 위·아래 두 길로 와요. 카드 누르기 전에 길을 고르세요', deco: '갈림길 표지판', col: '#ffb070' },
  { k: 'mirfire', n: '미르 불꽃 주간', d: '미르의 불꽃 대기 시간 절반 + 마나 회복 2배 (미르를 타고 있어야 해요)', deco: '용 깃발', col: '#ff8a5a' },
];
function weekNo() { return Math.floor((Date.now() / 864e5 + 3) / 7); } // 월요일마다 바뀜
function weekLabel(wk) { const d = new Date((wk * 7 - 3) * 864e5); return `${d.getUTCMonth() + 1}/${d.getUTCDate()}주`; }
function weekRule() { return WEEKLY[weekNo() % WEEKLY.length]; }
function weekDaysLeft() { const d = new Date().getDay(); return d === 0 ? 1 : 8 - d; }
let WEEKP = null;
function startWeekly() {
  const R = weekRule(), n = clamp(S.cleared, 10, MAXST); TRIAL = null; TOWER = null;
  startBattle(n); B.weekly = R.k; B.special = true; { const rv = S.rival, d0 = S.diff != null ? S.diff : 1; B.rival = rv && rv.w === weekNo() && rv.d === d0 ? rv : null; } /* v4.0 친구 기록 */ const si = Object.assign({}, B.si, { name: '주간 도전 · ' + R.n, boss: false, bossKey: null, mid: false, midKey: null, m: B.si.m * 1.3, am: B.si.am * 1.35, interval: B.si.interval * 0.85 }); /* v2.5 주간 도전은 내 최고 판보다 확실히 세게 */
  if (R.k === 'giant') { si.interval *= 1.8; si.m *= 2.1; }
  if (R.k === 'bone2x') { B.fdK = 2; B.base.hp = B.base.max = Math.round(B.base.max * 0.5); }
  if (R.k === 'bossrush') { B.rushBoss = [0.85, 0.6, 0.35]; si.m *= 0.9; }
  if (R.k === 'fast') { si.spdM = (si.spdM || 1) * 1.5; B.fdK = 1.3; }
  if (R.k === 'noskill') { B.noSkill = true; B.hs = Object.assign({}, B.hs, { ally: (B.hs.ally || 0) + 100 }); }
  if (R.k === 'heroonly') { B.noCards = true; B.hero.atk *= 3; B.hero.hp = B.hero.max = B.hero.max * 2; }
  if (R.k === 'night') { si.night = true; si.swarm = (si.swarm || 1) * 1.5; }
  if (R.k === 'eventfest') { B.evMax = 5; B.evT = 8; }
  if (R.k === 'tiny') { si.interval *= 0.5; si.m *= 0.5; }
  if (R.k === 'twolane') { B.lanes = true; B.selLane = 1; }
  if (R.k === 'mirfire') { B.mirFast = true; B.hs = Object.assign({}, B.hs, { mpR: B.hs.mpR * 2 }); }
  B.si = si;
}
function weeklyReward() {
  const R = weekRule(), wk = weekNo(); S.stickers = S.stickers || {}; S.decor = S.decor || {};
  const first = !S.stickers['w' + wk]; S.stickers['w' + wk] = R.k; S.decor[R.k] = 1;
  if (first) { S.weekStreak = S.weekLast === wk - 1 ? (S.weekStreak || 0) + 1 : 1; S.weekLast = wk; if (S.weekStreak >= 4 && S.weekStreak % 4 === 0) { S.dust = (S.dust || 0) + 10; B.dustGot = (B.dustGot || 0) + 10; B.streakRew = true; } } /* v3.8 미르 무지개 불꽃은 보석으로만 → 4주 연속 보상은 별가루 10 */
  const DR = weekRecs(S.diff != null ? S.diff : 1), bt = Math.round(B.t), old = DR[wk]; if (!old || bt < old.t) { DR[wk] = { t: bt, k: R.k }; B.weekBest = { t: bt, old: old && old.t }; RANK_ONLINE.submit('week' + (S.diff != null ? S.diff : 1), bt * 1000); }
  const coin = first ? 3000 : 600, dust = first ? 8 : 1; if (first) S.coins += 1500; S.coins += coin; S.dust = (S.dust || 0) + dust; B.dustGot = (B.dustGot || 0) + dust; B.weekRew = { first, coin, deco: R.deco };
}
// 업적 스티커 (스티커북)
const STK = [
  { k: 'boss1', n: '첫 보스 친구', t: () => S.cleared >= 10, c: '#ffb04a' }, { k: 'ch10', n: '열 개의 별뼈', t: () => S.cleared >= 100, c: '#ffd34d' },
  { k: 'st300', n: '별 300개', t: () => Object.values(S.stars || {}).reduce((a, b) => a + b, 0) >= 300, c: '#fff36a' }, { k: 'third1', n: '첫 3차 직업', t: () => Object.keys(S.third || {}).length >= 1, c: '#ff8a8a' },
  { k: 'awk5', n: '각성 ★5', t: () => Object.values(S.awk || {}).some(v => v >= 5), c: '#b07cff' }, { k: 'pet3', n: '펫 친구 3마리', t: () => Object.keys(S.pets || {}).length >= 3, c: '#9ee6a0' },
  { k: 'shard4', n: '색깔 조각 4개', t: () => S.cleared >= 300, c: '#6ad06a' }, { k: 'bridge7', n: '무지개 다리 완성', t: () => S.cleared >= 360, c: '#ff6ad5' }, { k: 'pet30', n: '쓰다듬기 30번', t: () => (S.petN || 0) >= 30, c: '#ffb0cc' }, { k: 'ev7', n: '이벤트 7종 발견', t: () => Object.keys(S.evSeen || {}).filter(k => BEV[k]).length >= 7, c: '#ff9ed8' },
  { k: 'week4', n: '주간 도전 4번', t: () => Object.keys(S.stickers || {}).filter(k => k[0] === 'w').length >= 4, c: '#8fb8ff' }, { k: 'lv50', n: '기사 Lv.50', t: () => S.lv >= 50, c: '#ffe0a0' },
];
function drawSticker(x, y, r, col, label, on) {
  ctx.save(); ctx.globalAlpha = on ? 1 : 0.35; ctx.fillStyle = '#ffffff'; ctx.beginPath(); for (let q = 0; q < 16; q++) { const a = q / 16 * TAU, rr = r + (q % 2 ? 3 : 0); q ? ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.closePath(); ctx.fill();
  ctx.fillStyle = on ? col : '#c9bfb2'; ART.E(ctx, x, y, r - 3, r - 3); ctx.fill(); ART.star(ctx, x, y - 3, r * 0.42, on ? '#ffffff' : '#e8e0d4');
  ctx.restore(); { const L = on ? label : '???'; ctx.font = `bold 11.5px ${FONT}`; const two = ctx.measureText(L).width > 76; txtW(L, x, y + r + (two ? 18 : 12), 10, on ? '#5a3412' : '#a89580', 'center', 76, 13); }
}
function drawWeekly() {
  const P = WEEKP; P.t += G.dt || 0.016; ui = []; dragH = null; const R = weekRule(), wk = weekNo(), done = S.stickers && S.stickers['w' + wk]; S.decor = S.decor || {};
  drawWeeklyHead(P, R, wk, done);
  const tab = P.tab || 0; ['스티커북', '성 장식', '자리 꾸미기', '기록판'].forEach((n, i) => { pkBtn(456 + i * 116, 58, 110, 42, n, () => { P.tab = i; }, { bg: tab === i ? '#ffb300' : '#6a5a90', size: 15, key: 'wktab' + i }); if (tab === i) { ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.moveTo(511 + i * 116 - 7, 101); ctx.lineTo(511 + i * 116 + 7, 101); ctx.lineTo(511 + i * 116, 109); ctx.closePath(); ctx.fill(); } });
  if (tab === 0) {
    txt('업적 스티커', 678, 122, 13, '#a0652a', 'center', false);
    STK.forEach((st, i) => drawSticker(500 + (i % 5) * 90, 150 + Math.floor(i / 5) * 66, 17, st.c, st.n, st.t())); /* v3.8 업적 3줄이 주간 스티커와 겹쳐 줄 간격·크기 줄이고 아래로 내림 */
    const ws = Object.entries(S.stickers || {}).filter(([k]) => k[0] === 'w').sort((a, b) => +a[0].slice(1) - +b[0].slice(1));
    txt(`주간 스티커 ${ws.length}개`, 678, 342, 13, '#a0652a', 'center', false);
    if (!ws.length) txt('아직 없어요. 이번 주 도전을 깨 보세요!', 678, 400, 13, '#8a6142', 'center', false);
    ws.slice(-10).forEach(([k, rk], i) => { const Wr = WEEKLY.find(q => q.k === rk) || WEEKLY[0]; drawSticker(500 + (i % 5) * 90, 378 + Math.floor(i / 5) * 72, 17, Wr.col, `${weekLabel(+k.slice(1))} · ${Wr.n.replace(' 주간', '')}`, true); });
  } else if (tab === 1) {
    txt('주간 도전을 깨면 모이는 성 장식 · 하나를 골라 멍멍성에 달아요', 678, 122, 12, '#a0652a', 'center', false);
    WEEKLY.forEach((Wr, i) => { const x = 452 + (i % 5) * 92, y = 140 + Math.floor(i / 5) * 170, own = !!S.decor[Wr.k], on = S.castleDecor === Wr.k;
      RR(x, y, 86, 160, 12); ctx.fillStyle = on ? 'rgba(255,201,60,.35)' : 'rgba(141,90,43,.1)'; ctx.fill(); ctx.save(); ctx.globalAlpha = own ? 1 : 0.3; drawDecor(x + 43, y + 80, Wr.k, 0.9); ctx.restore();
      txtW(own ? Wr.deco : '???', x + 43, y + 100, 11, '#4e342e', 'center', 82, 13);
      btn(x + 6, y + 114, 74, 34, !own ? '잠김' : on ? '다는 중' : '달기', () => { if (own) { if (on) { const D = decorSlots(); D[0] = null; S.castleDecor = null; save(); } else setDecor(0, Wr.k); } }, { bg: !own ? '#b5a99b' : on ? '#ffc93c' : '#5cc96b', disabled: !own, size: 13, key: 'deco' + i }); });
  } else if (tab === 2) { // v2.2 자리 꾸미기: 성 그림 위 4자리 중 하나 고르고 장식 놓기
    const D = decorSlots(), sel = P.slot || 0, C = castleSkinImg(S.castleSkin), cx = 610, gy = 330, k = 0.82; /* v4.6 지금 쓰는 멍멍성 모습으로 */
    RR(452, 112, 452, 250, 12); ctx.fillStyle = ART.lgr(ctx, '#cfe8ff', '#f4ecd8', 0, 112, 0, 362); ctx.fill(); ctx.fillStyle = '#a8c878'; ctx.fillRect(452, gy + 4, 452, 26);
    ctx.save(); ctx.translate(cx, gy); ctx.scale(k, k); ctx.drawImage(C.c, -C.ox, 12 - C.oy, C.w, C.h); if (S.castleSkin) { ctx.save(); ctx.translate(0, -GY); drawCastleSkinFx(S.castleSkin, 0, 0); ctx.restore(); } D.forEach((dk, q) => { if (dk) { const Q = DSLOT[q]; drawDecor(Q.x, Q.y, dk, Q.s); } }); ctx.restore();
    DSLOT.forEach((Q, q) => { const x = cx + Q.x * k, y = gy + (Q.y - 14) * k, on = q === sel; ctx.beginPath(); ctx.arc(x, y, on ? 15 + Math.sin(G.time * 6) * 2 : 12, 0, TAU); ctx.fillStyle = on ? 'rgba(255,201,60,.55)' : 'rgba(255,255,255,.45)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = on ? '#e65100' : '#8a6142'; ctx.stroke(); txt('' + (q + 1), x, y, 12, '#4e342e', 'center', false); uiPush({ x: x - 18, y: y - 18, w: 36, h: 36, key: 'dslot' + q, tap: () => { P.slot = q; SFX.click(); } }); });
    { const St = castleSetOf(S.castleSkin), on = castleSetOn(S.castleSkin), nm = k2 => (WEEKLY.find(q => q.k === k2) || {}).deco || k2; RR(456, 116, 444, 22, 11); ctx.fillStyle = on ? 'rgba(46,125,50,.85)' : 'rgba(60,40,90,.7)'; ctx.fill(); txt(`${on ? '✓ ' : ''}${St.n}: ${St.need.map(nm).join(' + ')} → ${St.bt}`, 678, 127, 11.5, on ? '#fff' : '#ffe9a8', 'center', false, null, 436); } /* v4.6 세트 안내 */
    txt(`${sel + 1}번 자리 · ${DSLOT[sel].n} 에 놓을 장식을 고르세요`, 678, 380, 13, '#a0652a', 'center', false);
    const own = WEEKLY.filter(Wr => S.decor[Wr.k]).concat(S.decor.pvptro ? [{ k: 'pvptro', deco: '대전 트로피' }] : []); /* v4.6 대전 시즌 보상 */
    btn(456, 396, 76, 52, '비우기', () => { D[sel] = null; S.castleDecor = D[0]; save(); }, { bg: '#c9a983', size: 13, key: 'dsclr' });
    own.slice(0, 12).forEach((Wr, i) => { const x = 538 + (i % 6) * 62, y = 396 + Math.floor(i / 6) * 58, on = D[sel] === Wr.k; RR(x, y, 58, 52, 10); ctx.fillStyle = on ? 'rgba(255,201,60,.45)' : 'rgba(141,90,43,.12)'; ctx.fill(); drawDecor(x + 29, y + 26, Wr.k, 0.34); txtW(Wr.deco, x + 29, y + 40, 9.5, '#4e342e', 'center', 56, 14.5); uiPush({ x, y, w: 58, h: 52, key: 'dsp' + i, tap: () => { setDecor(sel, Wr.k); SFX.click(); } }); });
    if (!own.length) txt('주간 도전을 깨면 장식이 생겨요', 700, 424, 13, '#8a6142', 'center', false);
  } else { // v2.2 기록판: 주마다 최고 기록
    const rd = P.rd != null ? P.rd : (S.diff != null ? S.diff : 1); DIFFS.forEach((D, q) => btn(470 + q * 140, 108, 130, 26, D.n + (q === (S.diff != null ? S.diff : 1) ? ' (지금)' : ''), () => { P.rd = q; }, { bg: rd === q ? ['#9ee6a0', '#ffc93c', '#ff8a8a'][q] : '#c9a983', size: 12, key: 'rd' + q }));
    const rows = Object.entries(weekRecs(rd)).sort((a, b) => +b[0] - +a[0]).slice(0, 8), best = rows.length ? Math.min(...rows.map(r => r[1].t)) : 0;
    if (!rows.length) txt('아직 기록이 없어요. 이번 주 도전을 깨 보세요!', 678, 260, 14, '#8a6142', 'center', false);
    rows.forEach(([wkk, r], i) => { const y = 142 + i * 44, Wr = WEEKLY.find(q => q.k === r.k) || WEEKLY[0], cur = +wkk === wk; RR(456, y, 444, 38, 10); ctx.fillStyle = cur ? 'rgba(255,201,60,.35)' : 'rgba(141,90,43,.1)'; ctx.fill(); drawSticker(478, y + 18, 13, Wr.col, '', true); txt(weekLabel(+wkk) + (cur ? ' (이번 주)' : ''), 500, y + 19, 13, '#4e342e', 'left', false); txt(Wr.n, 640, y + 19, 13, '#6b4426', 'left', false, null, 150); txt(fmtT(r.t), 880, y + 19, 16, r.t === best ? '#e65100' : '#4e342e', 'right', false); if (r.t === best) ART.star(ctx, 812, y + 19, 7, '#ffd34d'); });
  }
}
// v2.2 성 장식 자리 4곳 (성 x 기준 위치) — 자리마다 장식 하나
const DSLOT = [{ n: '앞마당', x: 74, y: 6, s: 0.9 }, { n: '앞마당 끝', x: 150, y: 6, s: 0.8 }, { n: '왼쪽 탑 꼭대기', x: -107, y: -212, s: 0.45 }, { n: '오른쪽 탑 앞', x: 90, y: -58, s: 0.45 }, /* v4.7 새 성 창문·장미창을 가리지 않게 */ { n: '성문 옆', x: -50, y: 2, s: 0.5 }]; /* v4.6 새 성은 성문 위에 금 간판이 있어 장식 자리를 성문 옆으로 */
function decorSlots() { if (!S.decorPos) { S.decorPos = [S.castleDecor || null, null, null, null]; } while (S.decorPos.length < DSLOT.length) S.decorPos.push(null); return S.decorPos; }
function setDecor(slot, k) { const D = decorSlots(); for (let q = 0; q < D.length; q++) if (D[q] === k) D[q] = null; D[slot] = k; S.castleDecor = D[0]; save(); }
// v2.3 기록판은 난이도별로 따로 (예전 기록은 보통으로)
function weekRecs(d) { if (!S.weekRecD) { S.weekRecD = { 0: {}, 1: Object.assign({}, S.weekRec || {}), 2: {} }; } return S.weekRecD[d] = S.weekRecD[d] || {}; }
function fmtT(t) { t = Math.round(t); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); }
// 성 장식 그림 (y = 바닥 기준)
function drawDecor(x, y, k, sc) { ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
  /* v4.6 고급 받침대: 대리석 + 금테 */ { const g0 = ART.lgr(ctx, '#fffaf0', '#cfc2aa', 0, -8, 0, 4); ctx.fillStyle = 'rgba(0,0,0,.18)'; ART.E(ctx, 0, 5, 26, 5); ctx.fill(); RR(-22, -6, 44, 10, 4); ctx.fillStyle = g0; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#d9a21b'; ctx.stroke(); RR(-16, -10, 32, 5, 2.5); ctx.fillStyle = ART.lgr(ctx, '#fff0a8', '#d9a21b', 0, -10, 0, -5); ctx.fill(); }
  ctx.translate(0, -8);
  if (k === 'giant') { ctx.fillStyle = '#ff6a5a'; ctx.beginPath(); ctx.moveTo(0, -40); ctx.quadraticCurveTo(-34, -66, -30, -38); ctx.quadraticCurveTo(-24, -24, 0, -40); ctx.quadraticCurveTo(24, -24, 30, -38); ctx.quadraticCurveTo(34, -66, 0, -40); ctx.fill(); ART.E(ctx, 0, -40, 7, 7); ctx.fill(); ctx.fillRect(-6, -40, 4, 30); ctx.fillRect(2, -40, 4, 26); }
  else if (k === 'bone2x') { ctx.fillStyle = '#8a5a2a'; ctx.fillRect(-2, -70, 4, 70); ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.moveTo(2, -70); ctx.lineTo(38, -60); ctx.lineTo(2, -48); ctx.fill(); ART.bone(ctx, 18, -60, 16, '#fff6c0', 0); }
  else if (k === 'bossrush') { ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.moveTo(-26, -20); ctx.lineTo(-30, -52); ctx.lineTo(-14, -36); ctx.lineTo(0, -60); ctx.lineTo(14, -36); ctx.lineTo(30, -52); ctx.lineTo(26, -20); ctx.closePath(); ctx.fill(); [-14, 0, 14].forEach(q => { ART.E(ctx, q, -28, 4, 4); ctx.fillStyle = '#ff5a7a'; ctx.fill(); ctx.fillStyle = '#ffd34d'; }); }
  else if (k === 'fast') { ctx.fillStyle = '#6a5a3a'; ctx.fillRect(-2, -70, 4, 70); ctx.fillStyle = '#ffe86a'; ctx.beginPath(); ctx.moveTo(2, -70); ctx.lineTo(36, -64); ctx.lineTo(2, -50); ctx.fill(); ctx.fillStyle = '#ff9a3a'; ctx.beginPath(); ctx.moveTo(18, -68); ctx.lineTo(12, -59); ctx.lineTo(18, -59); ctx.lineTo(13, -50); ctx.lineTo(24, -62); ctx.lineTo(18, -62); ctx.closePath(); ctx.fill(); }
  else if (k === 'noskill') { ctx.fillStyle = '#5a8ad0'; ctx.beginPath(); ctx.moveTo(-22, -56); ctx.lineTo(22, -56); ctx.lineTo(20, -24); ctx.quadraticCurveTo(0, -4, -20, -24); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#ffe27a'; ctx.lineWidth = 3; ctx.stroke(); ART.paw(ctx, 0, -34, 1.1, '#ffe27a'); }
  else if (k === 'heroonly') { ctx.fillStyle = '#b8a890'; RR(-20, -14, 40, 14, 3); ctx.fill(); ctx.save(); ctx.translate(0, -14); ctx.globalAlpha *= 0.9; ART.draw(ctx, heroFace(), 'i0', 0, 0, 0.55, false, 0); ctx.restore(); }
  else if (k === 'night') { ctx.strokeStyle = '#6a5a3a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -70); ctx.lineTo(0, -50); ctx.stroke(); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(ART.softDot('#fff2c0'), -30, -66, 60, 60); ctx.restore(); ctx.fillStyle = '#fff6d8'; ctx.beginPath(); ctx.arc(0, -36, 12, 0.6, TAU - 0.6); ctx.arc(6, -36, 9, TAU - 0.9, 0.9, true); ctx.fill(); }
  else if (k === 'tiny') { ctx.fillStyle = '#8a5a2a'; ctx.fillRect(-2, -56, 4, 56); ctx.save(); ctx.translate(0, -56); ctx.rotate(G.time * 2); ['#9ee6a0', '#ffe27a', '#8fe0ff', '#ff9ed8'].forEach((c, q) => { ctx.rotate(Math.PI / 2); ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(18, -6); ctx.lineTo(16, 6); ctx.closePath(); ctx.fill(); }); ctx.restore(); ART.E(ctx, 0, -56, 3, 3); ctx.fillStyle = '#fff'; ctx.fill(); }
  else if (k === 'twolane') { ctx.fillStyle = '#7a5030'; ctx.fillRect(-2.5, -66, 5, 66); [[-1, -58, '#ffb070'], [1, -40, '#7ac8ff']].forEach(([d, y, c]) => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(0, y - 8); ctx.lineTo(d * 30, y - 8); ctx.lineTo(d * 38, y); ctx.lineTo(d * 30, y + 8); ctx.lineTo(0, y + 8); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = 1.2; ctx.stroke(); }); }
  else if (k === 'pvptro') { ctx.fillStyle = ART.lgr(ctx, '#fff6b0', '#c8800a', 0, -66, 0, -20); ctx.beginPath(); ctx.moveTo(-18, -66); ctx.lineTo(18, -66); ctx.quadraticCurveTo(18, -36, 4, -30); ctx.lineTo(4, -18); ctx.lineTo(12, -12); ctx.lineTo(-12, -12); ctx.lineTo(-4, -18); ctx.lineTo(-4, -30); ctx.quadraticCurveTo(-18, -36, -18, -66); ctx.closePath(); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#7a4a0a'; ctx.stroke(); ctx.beginPath(); ctx.arc(-18, -54, 8, Math.PI * 0.5, Math.PI * 1.5); ctx.arc(18, -54, 8, -Math.PI * 0.5, Math.PI * 0.5); ctx.stroke(); ctx.fillStyle = '#e8404a'; RR(-14, -12, 28, 8, 3); ctx.fill(); ART.star(ctx, 0, -50, 7, '#fff'); }
  else if (k === 'mirfire') { ctx.fillStyle = '#6a3a2a'; ctx.fillRect(-2, -70, 4, 70); ctx.fillStyle = '#ff8a5a'; ctx.beginPath(); ctx.moveTo(2, -70); ctx.lineTo(40, -62); ctx.lineTo(2, -46); ctx.fill(); ctx.fillStyle = '#ffe27a'; ctx.beginPath(); ctx.moveTo(12, -66); ctx.quadraticCurveTo(26, -60, 16, -52); ctx.quadraticCurveTo(22, -58, 12, -62); ctx.fill(); }
  else { ['#ff8ac8', '#8fe0ff', '#ffe27a'].forEach((c, q) => { ctx.strokeStyle = 'rgba(90,60,30,.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(-16 + q * 16, -44); ctx.stroke(); ctx.fillStyle = ART.lgr(ctx, '#ffffff', c, -26 + q * 16, -66, -6 + q * 16, -44); ART.E(ctx, -16 + q * 16, -54 + (q % 2) * 6, 11, 13); ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(120,80,40,.4)'; ctx.stroke(); }); }
  { const ph = (G.time * 0.7 + (k || '').length * 0.37) % 1; ctx.globalAlpha *= Math.sin(ph * Math.PI) * 0.9; ART.star(ctx, 14, -58 + ph * 8, 3 + ph * 3, '#fff6c8'); } /* v4.6 반짝 */
  ctx.restore(); }
function specialEnd(win) {
  if (B.weekly && win) weeklyReward();
  if (B.trial != null) { if (win && !third(B.trial)) { S.third = S.third || {}; S.third[B.trial] = 1; THIRD_POP = { i: B.trial, t: 0 }; } }
  if (B.tower != null) {
    ensureDaily();
    if (win) { const f = B.tower; S.tower.best = Math.max(S.tower.best, f); RANK_ONLINE.submit('tower', S.tower.best); S.tower.cur = f + 1; B.towerRew = 200 + f * 70; S.coins += B.towerRew; if (f % 5 === 0) S.potions = Math.min(9, S.potions + 1); if (f % 10 === 0) S.dust = (S.dust || 0) + 2; }
  }
  if (B.rematch != null) bhEnd(win); /* v4.3 */
  if (B.pvp) pvpEnd(win); /* v4.5 */
  TRIAL = null; TOWER = null;
}
/* ---- v2.0 기사단 합동기: 정해진 세 기사가 모두 2차 직업 이상 + 전장에 함께 있으면 버튼이 켜짐 (30초) ---- */
const COMBOS = [
  { n: '삼총사 돌격', m: [0, 1, 4], col: '#ffb04a', d: '콩이·뭉치·백구 · 앞의 적 모두에게 큰 피해 + 밀쳐 내기' },
  { n: '별빛 합주', m: [2, 3, 6], col: '#8fe0ff', d: '초코·설이·몽실 · 화살비 + 얼음 기절 + 모두 체력 40% 회복' },
  { n: '대폭죽 축제', m: [5, 7, 8], col: '#ff8ac8', d: '망고·쭈니·태산 · 폭죽 8발 + 1.5초 기절' },
  { n: '그림자 질주', m: [9, 0, 7], col: '#b48cff', d: '치치·콩이·쭈니 · 화면 안 모든 적에게 치명타 3연속' },
  { n: '철벽 수호', m: [8, 1, 6], col: '#ffe08a', d: '태산·뭉치·몽실 · 모든 동료 3초 무적 + 체력 30% 회복 + 성 체력 10% 회복' },
  { n: '달빛 결계', m: [3, 9, 2], col: '#9ab8ff', d: '설이·치치·초코 · 화면 안 적 2초 기절 + 피해, 날아다니는 몬스터는 두 배 피해' },
];
const comboLearned = c => c.m.every(i => promoted(i) && unitUnlocked(i));
function comboReady(c) { return comboLearned(c) && c.m.every(i => B.allies.some(a => !a.dead && a.def === UNITS[i])); }
function useCombo(k) {
  const c = COMBOS[k]; B.ccd = B.ccd || [8, 8, 8, 8, 8, 8]; if (B.ccd[k] > 0 || !comboReady(c)) return;
  B.ccd[k] = 30; const mem = B.allies.filter(a => !a.dead && c.m.includes(UNITS.indexOf(a.def))); const A = mem.reduce((s, a) => s + a.atk, 0) * 1.4 + B.hero.atk;
  const foes = B.enemies.filter(e => !e.dead && !(e.hide > 0) && e.x > B.camX - OX - 40 && e.x < B.camX + W + OX + 40);
  B.skillCut = { t: 1.1, s: c.n, col: c.col }; fx('flash', { dur: 0.2, col: c.col }); B.shake = 0.4; SFX.rare && SFX.rare();
  for (const a of mem) { a.hop = 0.5; addText(a.x, GY - 100, '멍!', c.col, 18, true); }
  if (k === 0) { const fx0 = Math.min(...mem.map(a => a.x)); foes.filter(e => e.x - fx0 < 420).forEach(e => { dealDmg(e, A * 2.2, 'a', true); if (!e.def.boss) e.kb = 90; }); for (const a of mem) a.x = Math.min(a.x + 140, B.nest.x - 80); fx('slash', { x: fx0 + 200, y: GY - 40, dur: 0.4 }); }
  else if (k === 1) { foes.forEach(e => { dealDmg(e, A * 1.3, 'a'); if (!e.def.boss) e.stun = Math.max(e.stun || 0, 1.5); }); for (let q = 0; q < 18; q++) B.parts.push({ x: B.camX + rnd(0, W), y: GY - 260, vx: 0, vy: 700, life: 0.4, max: 0.4, col: '#bfefff', size: 4, g: 0, glow: true });
    B.allies.concat(B.hero.dead ? [] : [B.hero]).forEach(a => { if (!a.dead) a.hp = Math.min(a.max, a.hp + a.max * 0.4); }); }
  else if (k === 2) { for (let q = 0; q < 8; q++) B.later.push({ t: q * 0.14, fn: () => { const t = foes[q % Math.max(1, foes.length)]; if (!t) return; foes.filter(e => Math.abs(e.x - t.x) < 90).forEach(e => { dealDmg(e, A * 0.9, 'a'); if (!e.def.boss) e.stun = Math.max(e.stun || 0, 1.5); }); fx('boom', { x: t.x, y: GY - 20, dur: 0.45, r: 70 }); burst(t.x, GY - 60, ['#ff8ac8', '#ffe27a', '#8fe0ff'][q % 3], 18, 260, true); } }); }
  else if (k === 3) { for (let q = 0; q < 3; q++) B.later.push({ t: q * 0.2, fn: () => { foes.forEach(e => { if (!e.dead) { dealDmg(e, A * 0.8, 'a', true); fx('crit', { x: e.x, y: GY - 40, dur: 0.3 }); } }); } }); }
  else if (k === 4) { B.allies.concat(B.hero.dead ? [] : [B.hero]).forEach(a => { if (!a.dead) { a.inv = 3; a.hp = Math.min(a.max, a.hp + a.max * 0.3); ring(a.x, GY - 30, '#ffe08a', 46); } }); B.base.hp = Math.min(B.base.max, B.base.hp + B.base.max * 0.1); fx('pillar', { x: B.base.x, y: GY + 4, dur: 0.8, col: '#ffe08a' }); }
  else if (k === 5) { foes.forEach(e => { dealDmg(e, A * (e.def.fly ? 1.6 : 0.8), 'a'); if (!e.def.boss) e.stun = Math.max(e.stun || 0, 2); }); B.dark = 0.8; for (let q = 0; q < 16; q++) B.parts.push({ x: B.camX + rnd(0, W), y: rnd(60, GY), vx: 0, vy: -30, life: 1, max: 1, col: '#c8d8ff', size: 5, g: 0, glow: true }); }
  S.comboUse = S.comboUse || {}; S.comboUse[k] = (S.comboUse[k] || 0) + 1;
}
let COMBOP = null;
function drawComboCodex() {
  const P = COMBOP; P.t += G.dt || 0.016; ui = []; dragH = null; S.comboUse = S.comboUse || {};
  ctx.save(); ctx.globalAlpha = Math.min(1, P.t * 4); ctx.fillStyle = 'rgba(15,6,0,.74)'; ctx.fillRect(-OX, 0, VW, H); ctx.restore();
  ART.panel(ctx, 40, 50, W - 80, 444, 'cream'); bigText('합동기 도감', W / 2, 86, 28, '#fff6b0', '#b07cff');
  txt('세 기사가 모두 2차 직업(훈련 Lv10) 이상 + 같은 전장에 함께 있으면 전투 왼쪽 아래에 버튼이 켜져요 (30초마다)', W / 2, 114, 12, '#8a6142', 'center', false, null, 840);
  COMBOS.forEach((c, k) => { const x = 60 + (k % 3) * 284, y = 126 + Math.floor(k / 3) * 156, ok = comboLearned(c); /* v4.2 칸 높이 166→150: 아래 칸 설명이 「닫기」 단추에 가려졌음 */
    RR(x, y, 272, 150, 14); ctx.fillStyle = ok ? ART.lgr(ctx, '#fffaf0', ART.LI(c.col, 0.55), 0, y, 0, y + 150) : 'rgba(141,90,43,.1)'; ctx.fill(); ctx.lineWidth = ok ? 3 : 2; ctx.strokeStyle = ok ? c.col : '#c69355'; RR(x, y, 272, 150, 14); ctx.stroke();
    txt(c.n, x + 14, y + 20, 17, ok ? '#4e342e' : '#a89580', 'left', false, null, 140);
    c.m.forEach((i, q) => { ctx.save(); ctx.globalAlpha = promoted(i) ? 1 : 0.35; ART.drawFit(ctx, unitSprite(i), 'i' + (Math.floor(G.time * 2.4 + q) % 3), x + 60 + q * 76, y + 66, 58, 60); ctx.restore(); txt(UNITS[i].nick + (promoted(i) ? ' ✓' : ''), x + 60 + q * 76, y + 102, 11, promoted(i) ? '#2e9b44' : '#a89580', 'center', false); });
    wrapTxt(c.d.split(' · ')[1] || c.d, x + 14, y + 120, 244, 11, '#5a3412', 15);
    txt(ok ? `사용 ${S.comboUse[k] || 0}번` : '아직 못 배웠어요', x + 258, y + 20, 10.5, ok ? '#8a5a1a' : '#a89580', 'right', false); });
  btn(W / 2 - 80, 446, 160, 38, '닫기', () => { COMBOP = null; }, { bg: '#a99a8a', size: 16, key: 'comboClose' });
}
function drawComboButtons() {
  B.ccd = B.ccd || [8, 8, 8, 8, 8, 8]; const ready = COMBOS.map((c, k) => [c, k]).filter(([c]) => comboLearned(c) && comboReady(c)); if (!ready.length) return;
  edgeOn(-1);
  ready.slice(0, 3).forEach(([c, k], j) => { const cd = B.ccd[k], ok = cd <= 0, x = 14, y = 104 + j * 46; /* v3.8 합동기 단추를 땅(캐릭터 걷는 곳) 위에서 왼쪽 위 하늘로 옮김 — 캐릭터를 가렸음 */
    if (ok) { ctx.save(); ctx.globalAlpha = 0.22 + Math.sin(G.time * 2) * 0.08; RR(x - 3, y - 3, 162, 46, 14); ctx.fillStyle = c.col; ctx.fill(); ctx.restore(); } /* v4.5 눈이 아프던 번쩍임(밝게 더하기·빠른 깜빡임) 대신 단추 뒤 은은한 테두리만 천천히 */
    btn(x, y, 156, 40, ok ? `합동기 · ${c.n}` : `${c.n} ${Math.ceil(cd)}초`, () => useCombo(k), { bg: ok ? ART.DK(c.col, 0.28) : '#8a8070', size: 13, key: 'combo' + k });
    if (ok) { ctx.beginPath(); ctx.arc(x + 150, y + 4, 6, 0, TAU); ctx.fillStyle = '#ffe27a'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#5a3412'; ctx.stroke(); } });
  edgeOff();
}
/* ---- 3차 직업 고유 기술 (10초마다) ---- */
function thirdSkill(u) {
  const i = UNITS.indexOf(u.def), T = THIRD[i]; if (!T) return;
  const foes = B.enemies.filter(e => !e.dead && !(e.hide > 0) && e.x - u.x > -40 && e.x - u.x < Math.max(u.range, 120) + 160).sort((a, b) => a.x - b.x);
  const allies = B.allies.filter(a => !a.dead).concat(B.hero.dead ? [] : [B.hero]);
  const heal = p => allies.forEach(a => { if (Math.abs(a.x - u.x) < (p > 0.28 ? 9999 : 220)) { a.hp = Math.min(a.max, a.hp + a.max * p); burst(a.x, GY - 40, '#a5f5b0', 4, 80, true); } });
  if (i !== 1 && i !== 6 && !foes.length) { u.tcd = 1; return; }
  addText(u.x, GY - 110, T.sk + '!', T.col, 18, true); fx('pillar', { x: u.x, y: GY + 4, dur: 0.6, col: T.col }); u.atkAnim = 0.4;
  const A = u.atk * (u.awk >= 5 ? 1.5 : 1);
  if (i === 0 || i === 7) { const L = foes.slice(0, i === 7 ? 6 : 99).filter(e => e.x - u.x < 260); L.forEach(e => dealDmg(e, A * 3, 'a', true)); u.x = Math.min(u.x + 120, B.nest.x - 60); fx('slash', { x: u.x, y: GY - 40, dur: 0.35 }); }
  else if (i === 1) { heal(0.25); allies.forEach(a => { if (Math.abs(a.x - u.x) < 220) a.inv = 2; }); }
  else if (i === 2) { const tx = foes[0].x + 60; foes.filter(e => Math.abs(e.x - tx) < 120).forEach(e => dealDmg(e, A * 2.4, 'a')); for (let q = 0; q < 10; q++) B.parts.push({ x: tx + rnd(-110, 110), y: GY - 200, vx: 0, vy: 600, life: 0.4, max: 0.4, col: '#e8ffe0', size: 5, g: 0 }); }
  else if (i === 3) { const tx = foes[0].x; foes.filter(e => Math.abs(e.x - tx) < 110).forEach(e => { dealDmg(e, A * 2.5, 'a'); if (!e.def.boss) e.stun = Math.max(e.stun || 0, 1.2); }); fx('boom', { x: tx, y: GY - 10, dur: 0.5, r: 100 }); }
  else if (i === 4) { foes.filter(e => e.x - u.x < 320).forEach(e => dealDmg(e, A * 4, 'a', true)); fx('slash', { x: u.x + 120, y: GY - 40, dur: 0.4 }); B.shake = 0.3; }
  else if (i === 5) { for (let q = 0; q < 5; q++) B.later.push({ t: q * 0.18, fn: () => { const t = foes[q % foes.length]; if (t && !t.dead) { foes.filter(e => Math.abs(e.x - t.x) < 70).forEach(e => dealDmg(e, A * 1.6, 'a')); fx('boom', { x: t.x, y: GY, dur: 0.4, r: 60 }); } } }); }
  else if (i === 6) heal(0.3);
  else if (i === 8) { foes.filter(e => Math.abs(e.x - u.x) < 150).forEach(e => { dealDmg(e, A * 1.5, 'a'); if (!e.def.boss) { e.kb = 60; e.stun = Math.max(e.stun || 0, 1); } }); fx('quake', { x: u.x + 40, y: GY + 6, dur: 0.5 }); B.shake = 0.35; }
  else if (i === 9) { for (let q = 0; q < 3; q++) B.later.push({ t: q * 0.15, fn: () => { const t = foes[q % foes.length]; if (t && !t.dead) { dealDmg(t, A * 2 * (Math.random() < 0.5 ? 2 : 1), 'a', true); fx('crit', { x: t.x, y: GY - 40, dur: 0.3 }); } } }); }
}
/* ---- v1.3 친구 펫 ---- */
const PETS = [ /* v4.8 펫은 상점(🐾 펫 탭)에서만: 병아리만 코인 · 나머지는 보석 · 유니콘은 「광고 제거 + 보상 4배」 선물 · 계절 펫은 그 계절에만 보석으로 */
  { id: 'chick', n: '병아리 삐삐', d: '멀리 있는 아이템도 주워 와요', R: 340, spd: 300, coin: 1, food: 0.05, ab: '뼈다귀 생산 +5%', price: { c: 3000 } },
  { id: 'hamster', n: '햄스터 볼볼', d: '아이템 줍기 + 코인 15% 더', R: 220, spd: 240, coin: 1.15, ab: '코인 +15%', price: { g: 500 } },
  { id: 'turtle', n: '아기 거북 느릿', d: '천천히 줍기 + 기사 체력 회복', R: 180, spd: 150, heal: 0.004, chp: 0.05, ab: '기사 회복 · 성 체력 +5%', price: { g: 500 } },
  { id: 'kitten', n: '아기 고양이 냥냥', d: '날쌘 발로 줍기 + 우리 편이 더 세게', R: 300, spd: 320, atk: 0.06, ab: '우리 편 공격 +6%', price: { g: 500 } },
  { id: 'penguin', n: '펭귄 뒤뚱', d: '뒤뚱뒤뚱 줍기 + 마나가 빨리 차요', R: 220, spd: 200, mana: 0.2, ab: '마나 회복 +20%', price: { g: 500 } },
  { id: 'fox', n: '아기 여우 콩콩', d: '꾀 많은 여우 · 경험치를 더 받아요', R: 280, spd: 300, xp: 0.15, atk: 0.03, ab: '경험치 +15% · 공격 +3%', price: { g: 500 } },
  { id: 'panda', n: '아기 판다 뭉실', d: '든든한 판다 · 성이 튼튼해져요', R: 200, spd: 180, chp: 0.12, ab: '성 체력 +12%', price: { g: 500 } },
  { id: 'owl', n: '부엉이 부엉', d: '밤에도 잘 보여요 · 아주 멀리서 줍기', R: 460, spd: 340, food: 0.08, mana: 0.1, ab: '뼈다귀 +8% · 마나 +10%', price: { g: 500 } },
  { id: 'unicorn', n: '아기 유니콘 반짝', d: '「광고 제거 + 보상 4배」 선물 · 모든 능력이 조금씩', R: 380, spd: 340, coin: 1.2, atk: 0.06, chp: 0.08, heal: 0.002, ab: '코인 +20% 외 3가지', price: { perm: 'r4' } },
  { id: 'bokrabbit', n: '세배 토끼 복실', d: '설날 한정 · 줍기 + 코인 20% 더', R: 260, spd: 280, coin: 1.2, season: 'seollal', say: '복 받아라!', ab: '코인 +20%', price: { g: 500 } },
  { id: 'songsquirrel', n: '송편 다람쥐 송이', d: '추석 한정 · 줍기 + 체력 회복', R: 280, spd: 300, heal: 0.003, chp: 0.05, season: 'chuseok', say: '송편 하나!', ab: '기사 회복 · 성 +5%', price: { g: 500 } },
  { id: 'pumpkinbat', n: '호박 박쥐 뽀삐', d: '할로윈 한정 · 아주 멀리서도 주워 와요', R: 420, spd: 360, atk: 0.05, season: 'halloween', say: '뽀삐뽀삐!', ab: '공격 +5%', price: { g: 500 } },
  { id: 'babydeer', n: '아기 순록 루루', d: '크리스마스 한정 · 코인 10% + 체력 회복', R: 260, spd: 260, coin: 1.1, heal: 0.002, season: 'christmas', say: '딸랑!', ab: '코인 +10% · 회복', price: { g: 500 } },
];
const PET_SAY = { chick: '삐약!', hamster: '찍찍!', turtle: '느릿!', kitten: '냥!', penguin: '뒤뚱!', fox: '콩!', panda: '뭉실!', owl: '부엉!', unicorn: '반짝!' };
function petCanBuy(P) { return !P.season || seasonNow() === P.season; }
function P2tab(t) { if (SHOPP) { SHOPP.tab = t; SHOPP.sel = null; } }
function buyPet(P) { S.pets = S.pets || {}; if (S.pets[P.id]) return; const pr = P.price || {};
  if (pr.perm) { SHOPP.msg = { s: '「광고 제거 + 보상 4배」를 사면 함께 와요 (보석·영구 탭)', t: 2.2 }; return; }
  if (!petCanBuy(P)) { SHOPP.msg = { s: '계절 한정 펫은 그 계절에만 살 수 있어요', t: 2 }; return; }
  if (pr.c) { if (S.coins < pr.c) { SHOPP.msg = { s: '코인이 모자라요', t: 1.6 }; return; } S.coins -= pr.c; buyLog(P.n, false, pr.c); }
  else { if ((S.gems || 0) < pr.g) { SHOPP.msg = { s: '보석이 모자라요 (보석 탭에서 살 수 있어요)', t: 1.8 }; return; } S.gems -= pr.g; buyLog(P.n, true, pr.g); }
  S.pets[P.id] = 1; if (!S.pet) S.pet = P.id; save(); SFX.rare(); SHOPP.msg = { s: `새 친구 「${P.n}」! (펫 창에서 데려가기)`, t: 2.2 }; }
let PETP = null;
const petDef = () => PETS.find(p => p.id === S.pet);
function givePet() { S.pets = S.pets || {}; const nx = PETS.find(p => !p.season && !S.pets[p.id]); if (!nx) return null; S.pets[nx.id] = 1; if (!S.pet) S.pet = nx.id; save(); return nx; }
/* v4.9 펫 레벨 1~5 (간식 = 코인) · 레벨마다 능력 15%씩 더 */
let NOPET = false;
const PET_LV_C = [0, 2000, 5000, 10000, 20000]; /* Lv1→2 … Lv4→5 간식 값(코인) */
const petLv = id => Math.min(5, Math.max(1, ((S.petLv || {})[id]) || 1));
function petEff(P0) { const P = P0 || petDef(); if (!P) return null; const k = 1 + 0.15 * (petLv(P.id) - 1), o = Object.assign({}, P); if (P.coin) o.coin = 1 + (P.coin - 1) * k; for (const q of ['heal', 'atk', 'chp', 'xp', 'food', 'mana']) if (P[q]) o[q] = P[q] * k; o.lv = petLv(P.id); return o; }
function feedPet(id) { S.petLv = S.petLv || {}; const lv = petLv(id); if (lv >= 5) return false; const c = PET_LV_C[lv]; if (S.coins < c) { floatMsg = { s: `간식 값 코인 ${c.toLocaleString()}이 모자라요`, x: W / 2, y: 110, t: 1.8 }; return false; } S.coins -= c; S.petLv[id] = lv + 1; save(); SFX.rare(); floatMsg = { s: `냠냠! Lv.${lv + 1} · 능력이 조금 더 세졌어요`, x: W / 2, y: 110, t: 2 }; return true; }
/* v4.9 펫 전투 동작: 펫마다 8초에 1번 (대전·특수 판 제외) */
const PET_SKILL = { chick: ['콕콕 쪼기', 'peck'], hamster: ['씨앗 던지기', 'seed'], turtle: ['등껍질 막기', 'shield'], kitten: ['냥냥 할퀴기', 'claw'], penguin: ['뒤뚱 미끄럼', 'slide'], fox: ['여우불', 'fire'], panda: ['데굴 굴러 막기', 'roll'], owl: ['부엉 소리', 'hoot'], unicorn: ['무지개 빛', 'rainbow'], bokrabbit: ['복 주머니', 'seed'], songsquirrel: ['송편 던지기', 'seed'], pumpkinbat: ['박쥐 날개', 'claw'], babydeer: ['방울 소리', 'hoot'] };
function petFx(k, x, y, col) { (B.petFx = B.petFx || []).push({ k, x, y, col, t: 0 }); } /* v5.0 펫 기술 그림 효과 */
function drawBuddyCel(o) {
  const P = petDef(), k = Math.min(1, (o.t - 0.9) * 3), T = o.t - 0.9; if (T > 4.5) { o.budSeen = 1; return; }
  ctx.save(); ctx.globalAlpha = k; ctx.fillStyle = 'rgba(40,10,30,.55)'; ctx.fillRect(-OX, 0, VW, H);
  ctx.save(); ctx.translate(W / 2, 250); ctx.rotate(G.time * 0.4); for (let q = 0; q < 14; q++) { ctx.rotate(TAU / 14); ctx.fillStyle = q % 2 ? 'rgba(255,170,210,.22)' : 'rgba(255,240,160,.18)'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-30, -330); ctx.lineTo(30, -330); ctx.closePath(); ctx.fill(); } ctx.restore();
  ART.panel(ctx, W / 2 - 200, 120, 400, 290, 'cream');
  const bob = Math.sin(G.time * 5) * 4, sc = 1.8 * (0.8 + 0.2 * ease(Math.min(1, T * 2)));
  if (P) { ART.draw(ctx, 'pet_' + P.id, 'i0', W / 2, 300 + bob, sc, false, 0); drawPetCrown(W / 2, 300 + bob - (PET_TOP[P.id] || 30) * sc - 6, sc); drawPetRibbon(W / 2 + 14 * sc, 300 + bob - 14 * sc, sc); }
  for (let q = 0; q < 8; q++) { const an = q / 8 * TAU + G.time; txt('♥', W / 2 + Math.cos(an) * 130, 285 + Math.sin(an) * 55, 18, q % 2 ? '#ff5a8a' : '#ffb0cc', 'center', false); }
  bigText('단짝이 됐어요!', W / 2, 166, 34, '#fff0f6', '#e8509a');
  txt(`${P ? P.n : '펫'} · 기술이 8초 → 7초마다 나와요`, W / 2, 362, 15, '#6b4426', 'center', false, null, 370);
  txt('👆 눌러서 닫기', W / 2, 390, 13, '#a0652a', 'center', false);
  ctx.restore(); ui = []; uiPush({ x: -4000, y: -100, w: 9000, h: H + 200, tap: () => { o.budSeen = 1; }, key: 'budcel' });
}
function drawPetRibbon(x, y, sc) { ctx.save(); ctx.translate(x, y); ctx.scale(sc || 1, sc || 1); ctx.fillStyle = '#ff5a8a'; ctx.strokeStyle = '#8a1a40'; ctx.lineWidth = 1; [[-1, 1], [1, 1]].forEach(([d]) => { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(7 * d, -5); ctx.lineTo(7 * d, 5); ctx.closePath(); ctx.fill(); ctx.stroke(); }); ctx.beginPath(); ctx.arc(0, 0, 2.6, 0, TAU); ctx.fillStyle = '#ffd0e0'; ctx.fill(); ctx.stroke(); ctx.restore(); } /* v5.1 단짝 리본 */
function drawPetCrown(x, y, sc) { ctx.save(); ctx.translate(x, y); ctx.scale(sc || 1, sc || 1); ctx.beginPath(); ctx.moveTo(-7, 3); ctx.lineTo(-8, -5); ctx.lineTo(-3.5, -1); ctx.lineTo(0, -7); ctx.lineTo(3.5, -1); ctx.lineTo(8, -5); ctx.lineTo(7, 3); ctx.closePath(); ctx.fillStyle = ART.lgr(ctx, '#fff6b0', '#e0a020', 0, -7, 0, 3); ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = '#8a5a10'; ctx.stroke(); ctx.fillStyle = '#ff5a7a'; ART.E(ctx, 0, -1, 1.6, 1.6); ctx.fill(); ctx.restore(); } /* v5.0 Lv.5 펫 왕관 */
const PET_TOP = { chick: 26, hamster: 24, turtle: 22, kitten: 30, penguin: 28, fox: 30, panda: 30, owl: 32, unicorn: 38, bokrabbit: 34, songsquirrel: 32, pumpkinbat: 30, babydeer: 36 };
function petAbTxt(P, short) { const e = petEff(P) || P, L = [], pc = v => Math.round(v * 1000) / 10; if (e.coin && e.coin !== 1) L.push(`코인 +${pc(e.coin - 1)}%`); if (e.atk) L.push(`공격 +${pc(e.atk)}%`); if (e.chp) L.push(`성 +${pc(e.chp)}%`); if (e.mana) L.push(`마나 +${pc(e.mana)}%`); if (e.food) L.push(`뼈다귀 +${pc(e.food)}%`); if (e.xp) L.push(`경험 +${pc(e.xp)}%`); if (e.heal) L.push('회복'); return short ? L[0] || '' : L.join(' · '); }
function petAct(P, dt) { if (B.pvp || B.special || B.hero.dead) return; const pt = B.pet; if (!pt) return; pt.actT = (pt.actT == null ? 4 : pt.actT) - dt; if (pt.actT > 0) return;
  const A = PET_SKILL[P.id] || ['콕콕', 'peck'], lv = petLv(P.id), combo = petPaid(P) && B.lastSkT != null && B.t - B.lastSkT <= (window.__comboW || PET_COMBO_W), dm = B.hs.atk * (0.8 + 0.2 * lv) * (combo ? 1.2 : 1), h = B.hero; /* v5.1 합동 공격: 유료 펫만 · 기사 기술 2초 안 → 피해 +20% */
  const near = B.enemies.filter(e => !e.dead && Math.abs(e.x - pt.x) < 220).sort((a, b) => Math.abs(a.x - pt.x) - Math.abs(b.x - pt.x));
  if (A[1] !== 'shield' && A[1] !== 'rainbow' && !near.length) { pt.actT = 1; return; } pt.actT = petBuddy(P.id) ? 7 : 8; pt.hop = 0.4; gPetHit = true; /* v5.1 단짝이면 7초 */
  const k = A[1];
  if (k === 'peck' || k === 'claw' || k === 'seed' || k === 'fire') { const n = k === 'claw' ? 2 : 1; near.slice(0, n).forEach(e => { dealDmg(e, dm * (k === 'claw' ? 1.4 : k === 'fire' ? 1.8 : 1.2), 'a'); burst(e.x, GY - 30, k === 'fire' ? '#ff9a3a' : '#fff3a0', 8, 120); petFx(k, e.x, GY - 30 + (e.y || 0)); }); }
  else if (k === 'slide') { near.filter(e => Math.abs(e.x - pt.x) < 160).forEach(e => { dealDmg(e, dm, 'a'); e.stun = Math.max(e.stun || 0, 0.6); }); petFx('slide', pt.x, GY - 10); pt.x += 80 * (pt.face || 1); }
  else if (k === 'roll') { near.filter(e => Math.abs(e.x - pt.x) < 140 && !e.def.boss).forEach(e => { dealDmg(e, dm * 0.8, 'a'); e.kb = (e.kb || 0) + 40; }); petFx('roll', pt.x, GY + pt.y); }
  else if (k === 'hoot') { petFx('hoot', pt.x, GY - 20); ring(pt.x, GY - 20, '#c8a8ff', 140); near.filter(e => Math.abs(e.x - pt.x) < 160).forEach(e => { if (!e.def.boss) e.stun = Math.max(e.stun || 0, 1); dealDmg(e, dm * 0.5, 'a'); }); /* v5.1 부엉 소리도 조금 아픔 */ }
  else if (k === 'shield') { B.heroShield = Math.max(B.heroShield || 0, 1.5 + 0.3 * lv); ring(h.x, GY - 30, '#8ad070', 90); petFx('shield', h.x, GY - 30); B.enemies.filter(e => !e.dead && Math.abs(e.x - h.x) < 120).slice(0, 2).forEach(e => dealDmg(e, dm * 0.8, 'a')); } /* v5.1 등껍질 박치기 */
  else if (k === 'rainbow') { h.hp = Math.min(h.max, h.hp + h.max * (0.04 + 0.01 * lv)); if (near[0]) { dealDmg(near[0], dm * 1.5, 'a'); petFx('rainbow', (pt.x + near[0].x) / 2, GY - 30); petFx('rainbowTo', near[0].x, pt.x); } ring(pt.x, GY - 20, '#ff9ad0', 120); }
  gPetHit = false; near.forEach(e => { if (e.hp <= 0 && !e._pk) { e._pk = 1; B.petKill = (B.petKill || 0) + 1; } });
  addText(pt.x, GY - 70, `${A[0]}!`, '#fff3a0', 14); B.petUse = (B.petUse || 0) + 1; if (combo) { B.petCombo = (B.petCombo || 0) + 1; addText(pt.x, GY - 96, '합동 공격!', '#ff9ad0', 17, true); ring(pt.x, GY - 30, '#ff9ad0', 120); } }
const petPaid = P => !!P && !(P.price && P.price.c); /* 코인으로 사는 병아리만 아님 */
const PET_BUDDY_W = 30, PET_COMBO_W = 1.5; /* v5.2 사람 기준 1판 2~4번 (2초면 4~7번) */ const petBuddy = id => petLv(id) >= 5 && ((S.petWins || {})[id] || 0) >= PET_BUDDY_W; /* v5.1 단짝: Lv.5 + 그 펫과 30판 이김 */
function updPet(dt) {
  const P = petDef(); if (!P || !B || B.over) return; const h = B.hero;
  if (!B.pet) B.pet = { x: h.x - 40, y: 18, t: 0, moving: false, face: 1, tgt: null };
  const pt = B.pet; pt.t += dt;
  { const PE = petEff(); if (PE.heal && !h.dead && !B.pvp && !B.special) h.hp = Math.min(h.max, h.hp + h.max * PE.heal * dt); petAct(P, dt); }
  if (!pt.tgt || pt.tgt.got || pt.tgt.life <= 0) pt.tgt = B.drops.filter(d => d.type !== 'coin' && !d.got && d.ground && Math.abs(d.x - h.x) < P.R).sort((a, b) => Math.abs(a.x - pt.x) - Math.abs(b.x - pt.x))[0] || null;
  /* v3.8 떨림 고침: 영웅 뒤 자리(방향이 바뀌어도 0.6초 뒤에 옮김) · 멀어지면 출발(14px) · 가까우면 멈춤(3px) · 영웅이 걸으면 같이 걷는 그림 유지 */
  if ((h.face || 1) !== pt.hf) { pt.hfT = (pt.hfT || 0) + dt; if (pt.hfT > 0.6 || pt.hf == null) { pt.hf = h.face || 1; pt.hfT = 0; } } else pt.hfT = 0;
  const tx = pt.tgt ? pt.tgt.x : h.x - 38 * (pt.hf || 1), dx = tx - pt.x, adx = Math.abs(dx);
  if (!pt.go && adx > 14) pt.go = true; else if (pt.go && adx < 3) pt.go = false;
  if (pt.go) { const v = Math.min(P.spd, Math.max(adx * 5, 30)); pt.x += Math.sign(dx) * Math.min(adx, v * dt); if (adx > 8) pt.face = dx > 0 ? 1 : -1; }
  pt.moving = pt.go || (!pt.tgt && h.moving && adx < 24); if (pt.moving) pt.mvT = pt.t;
  if (pt.tgt && Math.abs(pt.tgt.x - pt.x) < 14) { pickup(pt.tgt); addText(pt.x, GY - 50, P.say || PET_SAY[P.id] || '!', '#fff3a0', 14); pt.tgt = null; }
}
function drawPet() {
  const P = petDef(); if (!P || !B || !B.pet) return; const pt = B.pet;
  ctx.fillStyle = 'rgba(30,15,0,.18)'; ART.E(ctx, pt.x, GY + pt.y + 2, 12, 3); ctx.fill();
  if (pt.hop > 0) pt.hop -= G.dt || 0.016; const hy = pt.hop > 0 ? -Math.sin((1 - pt.hop / 0.4) * Math.PI) * 12 : 0;
  ART.draw(ctx, 'pet_' + P.id, pt.moving || pt.t - (pt.mvT || -9) < 0.2 ? 'w' + (Math.floor(pt.t * 16) % 10) : 'i' + (Math.floor(pt.t * 2.4) % 3), pt.x, GY + pt.y + hy, 1, pt.face < 0, 0);
  if (petLv(P.id) >= 5) drawPetCrown(pt.x + (pt.face < 0 ? -2 : 2), GY + pt.y + hy - (PET_TOP[P.id] || 30) - 4, 1); if (petBuddy(P.id)) drawPetRibbon(pt.x + 10, GY + pt.y + hy - 14, 1);
  const dt = G.dt || 0.016; B.petFx = (B.petFx || []).filter(f => (f.t += dt) < 0.95); for (const f of B.petFx) { const a = Math.min(1, 1.6 * (1 - f.t / 0.95)); ctx.save(); ctx.globalAlpha = a; ctx.lineCap = 'round';
    if (f.k === 'claw') { const cl = (c, lw) => { ctx.strokeStyle = c; ctx.lineWidth = lw; for (let q = -1; q <= 1; q++) { ctx.beginPath(); ctx.moveTo(f.x - 20 + q * 12, f.y - 24); ctx.quadraticCurveTo(f.x - 2 + q * 12, f.y - 6, f.x + 12 + q * 12, f.y + 20); ctx.stroke(); } }; cl('#5a1a2a', 8); cl('#ffffff', 5.5); cl('#ff4a6a', 2.4); } /* v5.0 3차: 할퀴기 자국 크게 · 진한 테두리 */
    else if (f.k === 'slide') { const gr = ctx.createLinearGradient(f.x, 0, f.x + 90, 0); gr.addColorStop(0, 'rgba(160,220,255,0)'); gr.addColorStop(1, 'rgba(200,240,255,.9)'); ctx.fillStyle = gr; RR(f.x - 10, f.y - 8, 140, 14, 7); ctx.fill(); ctx.strokeStyle = 'rgba(40,110,170,.7)'; ctx.lineWidth = 2; ctx.stroke(); for (let q = 0; q < 6; q++) ART.star(ctx, f.x + 6 + q * 24, f.y - 14 - (q % 2) * 7, 4.5, q % 2 ? '#ffffff' : '#c8f0ff'); } /* v5.0 3차: 미끄럼 길 길고 진하게 */
    else if (f.k === 'fire') { for (let q = 0; q < 5; q++) { ctx.fillStyle = q % 2 ? '#ffd34d' : '#ff7a2a'; ART.E(ctx, f.x + Math.sin(q * 2 + f.t * 20) * 8, f.y - f.t * 40 - q * 5, 6 - q, 9 - q); ctx.fill(); } }
    else if (f.k === 'roll') { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; for (let q = 0; q < 3; q++) { ctx.beginPath(); ctx.arc(f.x + 30, f.y - 14, 14 + q * 8 + f.t * 30, -0.8, 0.8); ctx.stroke(); } }
    else if (f.k === 'hoot') { ctx.strokeStyle = '#c8a8ff'; ctx.lineWidth = 3; for (let q = 0; q < 3; q++) { ctx.beginPath(); ctx.arc(f.x, f.y, 20 + q * 22 + f.t * 60, 0, TAU); ctx.stroke(); } }
    else if (f.k === 'shield') { ctx.strokeStyle = '#8ad070'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(f.x, f.y, 34, 0, TAU); ctx.stroke(); ctx.globalAlpha = a * 0.25; ctx.fillStyle = '#c8ffb0'; ctx.fill(); }
    else if (f.k === 'rainbowTo') { const x0 = f.y, x1 = f.x; ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 26; ctx.beginPath(); ctx.moveTo(x0, GY - 24); ctx.quadraticCurveTo((x0 + x1) / 2, GY - 98, x1, GY - 30); ctx.stroke(); ['#ff6b6b', '#ffb84d', '#ffe14a', '#6fd86a', '#5ab8ff', '#9b6bff'].forEach((c, q) => { ctx.strokeStyle = c; ctx.lineWidth = 4.5; /* v5.0 3차: 무지개 띠 굵게 + 흰 바탕 */ ctx.beginPath(); ctx.moveTo(x0, GY - 24); ctx.quadraticCurveTo((x0 + x1) / 2, GY - 110 + q * 4, x1, GY - 30); ctx.stroke(); }); }
    else if (f.k === 'peck' || f.k === 'seed') { ctx.fillStyle = '#fff3a0'; for (let q = 0; q < 4; q++) ART.star(ctx, f.x + Math.cos(q * 1.6) * (8 + f.t * 30), f.y + Math.sin(q * 1.6) * (8 + f.t * 30), 3.5, '#fff3a0'); }
    ctx.restore(); }
}
function drawPetPanel() {
  const Pp = PETP; Pp.t += G.dt || 0.016; ui = []; dragH = null; S.pets = S.pets || {};
  ctx.save(); ctx.globalAlpha = Math.min(1, Pp.t * 4); ctx.fillStyle = 'rgba(15,6,0,.7)'; ctx.fillRect(-OX, 0, VW, H); ctx.restore();
  ART.panel(ctx, 80, 50, W - 160, 440, 'cream');
  bigText('친구 펫', W / 2, 88, 30, '#fff6b0', '#ff9800');
  txt('간식으로 Lv.5 · Lv.5로 30판 이기면 단짝(기술 7초) · 보석 펫은 기사 기술 뒤 2초 안에 「합동 공격」 +20%', W / 2, 118, 13, '#8a6142', 'center', false, null, 760);
  if (Pp.got) { ctx.save(); ctx.globalAlpha = 0.6 + Math.sin(G.time * 5) * 0.3; txt(`새 친구 「${Pp.got.n}」가 왔어요!`, W / 2, 140, 16, '#e65100', 'center', false); ctx.restore(); }
  PETS.forEach((P, k) => {
    const x = 94 + (k % 5) * 156, y = 134 + Math.floor(k / 5) * 104, own = !!S.pets[P.id], on = S.pet === P.id, lv = petLv(P.id);
    RR(x, y, 150, 100, 12); ctx.fillStyle = on ? 'rgba(255,201,60,.35)' : P.season ? 'rgba(200,120,220,.12)' : 'rgba(141,90,43,.1)'; ctx.fill(); ctx.lineWidth = on ? 4 : 2; ctx.strokeStyle = on ? '#e65100' : P.season ? '#b07cc0' : '#c69355'; RR(x, y, 150, 100, 12); ctx.stroke();
    ctx.save(); ctx.globalAlpha = own ? 1 : 0.35; ART.draw(ctx, 'pet_' + P.id, own ? 'i' + (Math.floor(G.time * 2.4 + k) % 3) : 'ib', x + 28, y + 80, 1.7, false, 0); ctx.restore(); if (own) txt(`Lv.${lv}`, x + 28, y + 92, 11.5, '#e65100', 'center', false); if (own && lv >= 5) drawPetCrown(x + 28, y + 80 - (PET_TOP[P.id] || 30) * 1.7 - 2, 1.4);
    txt(P.n.split(' ').pop(), x + 100, y + 16, 13, '#4e342e', 'center', false, null, 92); txt(petAbTxt(P, true), x + 100, y + 34, 10.5, '#2e7d32', 'center', false, null, 94); /* v5.0 레벨에 맞춘 숫자 (Lv.3 판다 = 성 +15.6%) */ /* v4.9 폰에서 작게 줄지 않게 짧게 */
    btn(x + 54, y + 44, 92, own ? 26 : 32, !own ? '상점에서' : on ? '데려가는 중' : '데려가기', () => { if (own) { S.pet = on ? null : P.id; save(); } else { PETP = null; SHOPP = { t: 0, tab: 8 }; } }, { bg: !own ? '#9a8ac0' : on ? '#ffc93c' : '#5cc96b', size: 12, key: 'pet' + k });
    if (own) btn(x + 54, y + 72, 92, 24, lv >= 5 ? (petBuddy(P.id) ? '🎀 단짝' : `단짝 ${(S.petWins || {})[P.id] || 0}/${PET_BUDDY_W}`) : `🍖 ${PET_LV_C[lv].toLocaleString()}`, () => feedPet(P.id), { bg: lv >= 5 ? (petBuddy(P.id) ? '#e8509a' : '#b5a99b') : '#e0762a', size: 11.5, key: 'pfd' + k, disabled: lv >= 5 }); /* v4.9 간식(코인)으로 레벨 */
  });
  btn(W / 2 - 90, 446, 180, 40, '완료', () => { PETP = null; }, { bg: '#5cc96b', size: 18, key: 'petdone' });
}
/* ---- 미르 꾸미기 ---- */
const MIR_PAT = ['무늬 없음', '보랏빛 무늬', '별빛 무늬', '황금 무늬'], MIR_FLAME = ['주황 불꽃', '보라 불꽃', '파랑 불꽃', '무지개 불꽃'];
const FLAME_PAL = [null, { a: '#f6e0ff', b: '#c070ff', c: '#7a2ad0', h: '#b050ff' }, { a: '#e0f6ff', b: '#40b0ff', c: '#1a50d0', h: '#40a0ff' }, { a: '#fff6ff', b: '#ff8ac8', c: '#6ab0ff', h: '#ffd34d' }];
function mirSkin() { return S.mir || { pat: 0, flame: 0 }; }
function drawMirPanel() {
  const P = MIRP; P.t += G.dt || 0.016; ui = []; dragH = null; const m = mirSkin();
  ctx.save(); ctx.globalAlpha = Math.min(1, P.t * 4); ctx.fillStyle = 'rgba(15,6,0,.7)'; ctx.fillRect(-OX, 0, VW, H); ctx.restore();
  ART.panel(ctx, 60, 40, W - 120, 460, 'cream');
  bigText('미르 꾸미기', W / 2, 78, 30, '#fff6b0', '#ff9800');
  ctx.save(); RR(84, 110, 380, 300, 18); ctx.fillStyle = ART.lgr(ctx, '#bfe6ff', '#fff3d6', 0, 110, 0, 410); ctx.fill(); ctx.clip();
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5; ctx.drawImage(ART.softDot('#fff6c2'), 120, 120, 300, 280); ctx.restore();
  if (!mounted()) txt('지금은 도보 기사예요 (설정 → 기사·용 꾸미기에서 용 타기)', 274, 396, 12, '#a0652a', 'center', false, null, 360);
  ART.draw(ctx, heroType(), (G.time % 2.4) < 0.35 ? 'a2' : 'i' + (Math.floor(G.time * 2.4) % 3), 270, 370, mounted() ? mountK() * 1.25 : 2.4, false, 0);
  txt('날개 무늬', 500, 128, 17, '#5a3412', 'left', false);
  MIR_PAT.forEach((n, k) => btn(500 + (k % 2) * 172, 144 + Math.floor(k / 2) * 52, 164, 44, n, () => { S.mir = Object.assign(mirSkin(), { pat: k }); S.custom = Object.assign({}, S.custom || {}, { pat: k }); ART.clearHeroCache(heroType()); save(); }, { bg: m.pat === k ? '#ffc93c' : '#c9a983', size: 15, key: 'mp' + k }));
  txt('불꽃 색', 500, 268, 17, '#5a3412', 'left', false);
  MIR_FLAME.forEach((n, k) => { const lock = k === 3 && !S.mirRainbow; btn(492 + k * 96, 284, 90, 44, lock ? '무지개\n보석 30' : n, () => { if (lock) { floatMsg = { s: '무지개 불꽃은 상점 「꾸미기」에서 보석으로만 살 수 있어요', x: W / 2, y: 120, t: 2.4 }; return; } S.mir = Object.assign(mirSkin(), { flame: k }); save(); }, { bg: lock ? '#b5a99b' : m.flame === k ? '#ffc93c' : k === 3 ? '#ff9ed8' : '#c9a983', size: lock ? 11 : 13, key: 'mf' + k }); });
  const fc = [['#fff6c0', '#ffc030', '#e0301a'], ['#f6e0ff', '#c070ff', '#7a2ad0'], ['#e0f6ff', '#40b0ff', '#1a50d0'], ['#fff6ff', '#ff8ac8', '#6ab0ff']][m.flame] || ['#fff6c0', '#ffc030', '#e0301a'];
  const gr = ctx.createLinearGradient(500, 0, 840, 0); gr.addColorStop(0, fc[0]); gr.addColorStop(0.5, fc[1]); gr.addColorStop(1, ART.rgba(fc[2], 0)); ctx.fillStyle = gr; RR(500, 344, 340, 22, 11); ctx.fill();
  txt('무늬는 시즌 5·6의 보랏빛 무늬 이야기에서 이어져요', 670, 386, 12, '#a0652a', 'center', false, null, 340);
  btn(W / 2 - 90, 432, 180, 50, '완료', () => { MIRP = null; }, { bg: '#5cc96b', size: 20, key: 'mirdone' });
}
/* ---- 3차 직업 축하 ---- */
function drawThirdPop() {
  const P = THIRD_POP; P.t += G.dt || 0.016; ui = []; dragH = null; const i = P.i, T = THIRD[i];
  ctx.save(); ctx.globalAlpha = Math.min(1, P.t * 3); ctx.fillStyle = 'rgba(15,6,0,.74)'; ctx.fillRect(-OX, 0, VW, H);
  ctx.save(); ctx.translate(W / 2, 250); ctx.rotate(G.time * 0.4); ctx.globalCompositeOperation = 'lighter'; for (let k = 0; k < 14; k++) { ctx.rotate(TAU / 14); ctx.fillStyle = ART.rgba(T.col, 0.09); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-30, -400); ctx.lineTo(30, -400); ctx.closePath(); ctx.fill(); } ctx.restore();
  ART.panel(ctx, W / 2 - 270, 50, 540, 440, 'cream');
  bigText('3차 직업 각성!', W / 2, 96, 32, '#fff6b0', '#ff6f00');
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(ART.softDot(T.col), W / 2 - 110, 120, 220, 230); ctx.restore();
  ART.draw(ctx, UNITS[i].id + 't', 'c_happy', W / 2, 340, 2.3, false, 0);
  bigText(T.n, W / 2, 376, 25, '#fff3c4', '#e65100'); txt(`고유 기술 「${T.sk}」 · ${T.d}`, W / 2, 410, 14, '#5a3412', 'center', false, null, 500);
  ctx.restore();
  if (P.t > 0.8) btn(W / 2 - 100, 430, 200, 48, '최고야!', () => { THIRD_POP = null; }, { bg: '#5cc96b', size: 20, key: 'thirdok' });
}
/* ================= v2.4 프리미엄 UI 키트 (오늘의 할 일 · 무한의 탑 · 주간 도전 · 장비) ================= */
const PKT = { royal: ['#2b2350', '#17112e', '#3a2a66'], night: ['#22184a', '#0e0a24', '#3b2a78'], warm: ['#5a2f1a', '#2a140a', '#7a4424'], sea: ['#163a5a', '#0a1a30', '#235a85'] };
function pkGoldG(y0, y1) { return ART.lgr(ctx, '#fff4c8', '#c88a2a', 0, y0, 0, y1); }
function pkFrame(x, y, w, h, th, o) {
  o = o || {}; const T = PKT[th] || PKT.royal;
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8; RR(x, y, w, h, 20); ctx.fillStyle = T[1]; ctx.fill(); ctx.restore();
  RR(x, y, w, h, 20); ctx.fillStyle = ART.lgr(ctx, T[0], T[1], 0, y, 0, y + h); ctx.fill();
  // 은은한 발바닥 무늬 + 위쪽 빛
  ctx.save(); RR(x, y, w, h, 20); ctx.clip(); ctx.globalAlpha = 0.06; for (let i = 0; i < Math.ceil(w / 70) * Math.ceil(h / 70); i++) { const px = x + (i % Math.ceil(w / 70)) * 70 + ((Math.floor(i / Math.ceil(w / 70)) % 2) * 35), py = y + Math.floor(i / Math.ceil(w / 70)) * 70; ART.paw(ctx, px + 20, py + 24, 0.55, '#ffffff'); }
  ctx.globalAlpha = 0.5; ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(ART.softDot(T[2]), x + w * 0.1, y - h * 0.35, w * 0.8, h * 0.8); ctx.restore();
  // 금테 두 줄
  ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(214,176,110,.7)'; RR(x + 1, y + 1, w - 2, h - 2, 19); ctx.stroke(); /* v2.7 금테 완화 */
  // v2.5 벨벳 결 + 모서리 금 덩굴 + 위쪽 문장
  ctx.save(); RR(x, y, w, h, 20); ctx.clip(); ctx.strokeStyle = 'rgba(255,255,255,.03)'; ctx.lineWidth = 1; for (let q = -h; q < w; q += 7) { ctx.beginPath(); ctx.moveTo(x + q, y); ctx.lineTo(x + q + h, y + h); ctx.stroke(); }
  const vg = ctx.createRadialGradient(x + w / 2, y + h / 2, Math.min(w, h) * 0.3, x + w / 2, y + h / 2, Math.max(w, h) * 0.7); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.35)'); ctx.fillStyle = vg; ctx.fillRect(x, y, w, h); ctx.restore();
  /* v2.7 모서리 덩굴·문장 뺌 */
}
function pkGem(x, y, r, col) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fillStyle = ART.lgr(ctx, ART.LI(col, 0.45), ART.DK(col, 0.25), 0, y - r, 0, y + r); ctx.fill(); ctx.lineWidth = 0.8; ctx.strokeStyle = 'rgba(60,20,0,.6)'; ctx.stroke(); ctx.beginPath(); ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.35, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fill(); }
function pkRibbon(cx, y, text, col, w) {
  w = w || Math.max(220, text.length * 30 + 80); const h = 46, x = cx - w / 2;
  [[-1], [1]].forEach(([d]) => { const ex = d < 0 ? x - 26 : x + w + 26, ix = d < 0 ? x + 10 : x + w - 10; ctx.beginPath(); ctx.moveTo(ix, y + 10); ctx.lineTo(ex, y + 12); ctx.lineTo(ex + d * -12, y + h / 2 + 8); ctx.lineTo(ex, y + h + 4); ctx.lineTo(ix, y + h + 2); ctx.closePath(); ctx.fillStyle = ART.DK(col, 0.35); ctx.fill(); ctx.strokeStyle = '#7a4a10'; ctx.lineWidth = 1.2; ctx.stroke(); });
  ctx.beginPath(); ctx.moveTo(x, y + 4); ctx.quadraticCurveTo(cx, y - 8, x + w, y + 4); ctx.lineTo(x + w, y + h - 2); ctx.quadraticCurveTo(cx, y + h - 14, x, y + h - 2); ctx.closePath();
  ctx.fillStyle = ART.lgr(ctx, ART.LI(col, 0.25), ART.DK(col, 0.15), 0, y, 0, y + h); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = ART.DK(col, 0.45); ctx.stroke();
  ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(x + 6, y + 8); ctx.quadraticCurveTo(cx, y - 2, x + w - 6, y + 8); ctx.lineTo(x + w - 6, y + 16); ctx.quadraticCurveTo(cx, y + 6, x + 6, y + 16); ctx.closePath(); ctx.fill(); ctx.restore();
  bigText(text, cx, y + h / 2 - 3, 25, '#fff6d0', ART.DK(col, 0.45));
}
function pkCard(x, y, w, h, o) {
  o = o || {}; const st = o.state || 'normal';
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3; RR(x, y, w, h, 12); ctx.fillStyle = '#f3e3c4'; ctx.fill(); ctx.restore();
  RR(x, y, w, h, 12); ctx.fillStyle = st === 'lock' ? ART.lgr(ctx, '#d8cfc2', '#b8ab98', 0, y, 0, y + h) : st === 'done' ? ART.lgr(ctx, '#effbe8', '#d4efc4', 0, y, 0, y + h) : ART.lgr(ctx, '#fffaf0', '#f1dfbd', 0, y, 0, y + h); ctx.fill();
  ctx.lineWidth = st === 'claim' ? 2.6 : 1.6; ctx.strokeStyle = st === 'claim' ? '#ffb300' : st === 'done' ? '#7cc46a' : '#c99a50'; RR(x + 1, y + 1, w - 2, h - 2, 11); ctx.stroke();
  if (st === 'claim') pkShine(x, y, w, h, 12);
  /* v2.7 금 꺾쇠 뺌 */
}
function pkShine(x, y, w, h, r) { ctx.save(); RR(x, y, w, h, r || 10); ctx.clip(); const t = (G.time * 0.6) % 1.6 - 0.3, sx = x + t * (w + 120) - 60; const g = ctx.createLinearGradient(sx - 40, 0, sx + 40, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.translate(sx, y); ctx.transform(1, 0, -0.4, 1, 0, 0); ctx.fillRect(-40, 0, 80, h); ctx.restore(); }
function pkBar(x, y, w, h, v, col) {
  v = Math.max(0, Math.min(1, v)); RR(x, y, w, h, h / 2); ctx.fillStyle = 'rgba(60,30,10,.35)'; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(120,70,20,.5)'; ctx.stroke();
  if (v > 0) { const vw = Math.max(h, (w - 2) * v); RR(x + 1, y + 1, vw, h - 2, (h - 2) / 2); ctx.fillStyle = ART.lgr(ctx, ART.LI(col, 0.35), ART.DK(col, 0.15), 0, y, 0, y + h); ctx.fill(); RR(x + 3, y + 2, Math.max(0, vw - 4), (h - 2) * 0.38, 3); ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fill(); if (v < 1) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(ART.softDot('#fff6c0'), x + vw - 9, y - 6, 18, h + 12); ctx.restore(); } }
}
function pkBtn(x, y, w, h, label, tap, o) { o = o || {}; const b = btn(x, y, w, h, label, tap, o); if (!o.disabled && o.shine) pkShine(x + 3, y + 3, w - 6, h - 8, Math.min(14, h / 2)); return b; }
function pkChip(x, y, icon, s, col) { ctx.font = `bold 12px ${FONT}`; const w = ctx.measureText(s).width + 32; RR(x, y, w, 22, 11); ctx.fillStyle = 'rgba(255,248,230,.95)'; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = '#d8b070'; ctx.stroke(); ART.icon(ctx, icon, x + 12, y + 11, 15); txt(s, x + 22, y + 11.5, 12, col || '#6b4426', 'left', false); return w; }
function pkStamp(x, y, s, col) { ctx.save(); ctx.translate(x, y); ctx.rotate(-0.22); ctx.globalAlpha = 0.85; ctx.lineWidth = 3; ctx.strokeStyle = col; RR(-34, -14, 68, 28, 8); ctx.stroke(); txt(s, 0, 1, 15, col, 'center', false); ctx.restore(); }
function pkCountdown() { const n = new Date(), m = 24 * 60 - (n.getHours() * 60 + n.getMinutes()); return `${Math.floor(m / 60)}시간 ${m % 60}분 남음`; }
/* ---- v2.4 오늘의 할 일 (프리미엄) ---- */
const DM_ICON = ['sword', 'mana', 'star'];
function hubTabs(cur) { /* v4.4 「오늘의 할 일」 ↔ 「주간 도전」 한 창처럼 오가기 */ [['오늘의 할 일', 0], ['주간 도전', 1]].forEach(([n, k], q) => { const on = cur === k; pkBtn(W - 332 + q * 126, 12, 120, 34, n, () => { if (on) return; if (k) { DAILY = null; WEEKP = { t: 1 }; } else { WEEKP = null; DAILY = { t: 1 }; } SFX.click(); }, { bg: on ? '#ff8a2a' : '#5a4a80', size: 14, key: 'hub' + k }); if (k && !on && S._wkRed) { ctx.fillStyle = '#ff3b30'; circ(W - 332 + q * 126 + 116, 16, 6); } }); }
function drawDaily() {
  ensureDaily(); const P = DAILY; P.t += G.dt || 0.016; ui = []; dragH = null; const D = S.daily, today = todayKey(), ap = Math.min(1, P.t * 4);
  ctx.save(); ctx.globalAlpha = ap; ctx.fillStyle = 'rgba(8,4,16,.78)'; ctx.fillRect(-OX, 0, VW, H); ctx.restore();
  ctx.save(); const sc = 0.94 + 0.06 * Math.min(1, P.t * 5); ctx.translate(W / 2, H / 2); ctx.scale(sc, sc); ctx.translate(-W / 2, -H / 2);
  pkFrame(18, 22, W - 36, 498, 'royal', { gem: '#ffb300' });
  pkRibbon(W / 2 - 6, 4, '오늘의 할 일', '#ff8a3d', 300);
  // 일일 미션
  ART.icon(ctx, 'star', 50, 74, 18); txt('일일 미션', 64, 74, 17, '#ffe9a8', 'left', true);
  txt('⏰ 새 미션까지 ' + pkCountdown(), 492, 74, 12, '#cbbcf0', 'right', false);
  MISSIONS_D.forEach((m, k) => {
    const y = 92 + k * 66, v = Math.min(m.goal, D[m.f]), done = v >= m.goal, got = D.got[k], r = m.rew();
    pkCard(38, y, 458, 58, { state: got ? 'done' : done ? 'claim' : 'normal' });
    // 메달 아이콘
    ctx.beginPath(); ctx.arc(66, y + 29, 20, 0, TAU); ctx.fillStyle = ART.lgr(ctx, '#ffe9a8', '#d29a3a', 0, y + 9, 0, y + 49); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#8a5a14'; ctx.stroke(); ART.icon(ctx, DM_ICON[k] || 'star', 66, y + 29, 22);
    txt(m.n, 96, y + 17, 15, '#4e342e', 'left', false);
    let cx = 96; if (r.coins) cx += pkChip(cx, y + 30, 'coin', `${r.coins}`) + 4; if (r.pot) cx += pkChip(cx, y + 30, 'potion', `물약 ${r.pot}`) + 4; if (r.item) cx += pkChip(cx, y + 30, 'star', `${RAR[r.item]} 장비`, RART[r.item]) + 4;
    pkBar(300, y + 12, 92, 12, v / m.goal, done ? '#5cc96b' : '#ffb300'); txt(`${v} / ${m.goal}`, 346, y + 38, 12, '#6b4426', 'center', false);
    if (got) pkStamp(446, y + 29, '완료!', '#3a9a4a');
    else pkBtn(404, y + 9, 84, 40, '받기', () => { if (done && !got) { D.got[k] = 1; giveRew(r); SFX.coin(); } }, { bg: done ? '#3fbf5a' : '#9a8a7a', disabled: !done, size: 16, key: 'dm' + k, shine: done });
  });
  // 7일 출석
  const canAtt = S.att.last !== today, day = S.att.n % 7;
  ART.icon(ctx, 'coin', 50, 300, 18); txt('7일 출석 보상', 64, 300, 17, '#ffe9a8', 'left', true); txt(`누적 ${S.att.n}일`, 492, 300, 12, '#cbbcf0', 'right', false);
  ATT_REW.forEach((r, k) => {
    const big = k === 6, x = 38 + k * 62 + (big ? 0 : 0), y = 316, w = big ? 82 : 56, h = 96, past = k < day, now = k === day && canAtt;
    ctx.save(); if (now) { ctx.shadowColor = '#ffd34d'; ctx.shadowBlur = 14 + Math.sin(G.time * 5) * 6; }
    RR(x, y, w, h, 12); ctx.fillStyle = big ? ART.lgr(ctx, '#fff1b8', '#e8a83a', 0, y, 0, y + h) : past ? ART.lgr(ctx, '#e3f6dc', '#b9e0a8', 0, y, 0, y + h) : ART.lgr(ctx, '#fffaf0', '#ecd6ae', 0, y, 0, y + h); ctx.fill(); ctx.restore();
    ctx.lineWidth = now ? 3 : 1.5; ctx.strokeStyle = now ? '#ffb300' : big ? '#b8761a' : '#c99a50'; RR(x + 1, y + 1, w - 2, h - 2, 11); ctx.stroke();
    RR(x + 4, y + 4, w - 8, 18, 8); ctx.fillStyle = big ? '#c0392b' : now ? '#ff8a3d' : 'rgba(120,80,40,.55)'; ctx.fill(); txt(big ? '7일 대박!' : `${k + 1}일`, x + w / 2, y + 13, 11, '#fff', 'center', false);
    if (big) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.6 + Math.sin(G.time * 3) * 0.2; ctx.drawImage(ART.softDot('#fff2a0'), x - 6, y + 14, w + 12, 60); ctx.restore(); }
    ART.icon(ctx, r.item ? 'star' : r.pot ? 'potion' : 'coin', x + w / 2, y + 48, big ? 34 : 28);
    txt(r.pet ? '펫+전설' : r.item ? RAR[r.item] : r.pot ? `물약 ${r.pot}` : `${r.coins}`, x + w / 2, y + 80, 11, '#5a3412', 'center', false, null, w - 6); /* v5.0 칸이 좁아 「장비」 뺌 */
    if (past) { ctx.save(); ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.arc(x + w / 2, y + 48, 18, 0, TAU); ctx.fillStyle = 'rgba(60,160,80,.25)'; ctx.fill(); txt('✔', x + w / 2, y + 48, 22, '#2e7d32', 'center', false); ctx.restore(); }
  });
  pkBtn(130, 424, 280, 52, canAtt ? `${day + 1}일째 출석하기` : '오늘 출석 완료 · 내일 또 만나요', () => { if (S.att.last !== todayKey()) { const r = ATT_REW[S.att.n % 7]; S.att.last = todayKey(); S.att.n++; giveRew(r); if (S.att.n % 7 === 0) S.dust = (S.dust || 0) + 10; SFX.coin(); } }, { bg: canAtt ? '#ff7a2a' : '#8a7a9a', disabled: !canAtt, size: canAtt ? 19 : 14, key: 'att', shine: canAtt });
  { const bd = S.bhDayN && S.bhDayN.k === todayKey() ? S.bhDayN.n : 0, hd = S.huntDay && S.huntDay.k === todayKey() ? S.huntDay.n : 0, gd = S.guestDay === todayKey(); /* v4.4 오늘 할 일 한 줄 더 */
    [[`⚔ 보스 도전관 ${Math.min(1, bd)}/1`, bd >= 1], [`🦴 숨은 뼈다귀 ${hd}/3`, hd >= 3], [`🐶 오늘의 손님 ${gd ? 1 : 0}/1`, gd]].forEach(([t2, ok], q) => { const x = 40 + q * 154; RR(x, 482, 148, 22, 11); ctx.fillStyle = ok ? 'rgba(92,201,107,.45)' : 'rgba(255,255,255,.12)'; ctx.fill(); txt((ok ? '✓ ' : '') + t2, x + 74, 493, 11.5, ok ? '#e8ffd8' : '#e8dcff', 'center', false, null, 140); }); }
  drawTowerCard(514, 60, 404, 446);
  btn(W - 74, 24, 50, 42, 'X', () => { DAILY = null; }, { bg: '#8a7a9a', size: 19, key: 'dclose' }); hubTabs(0); /* v2.8 탑 카드보다 나중에 그려서 가려지지 않게 */
  ctx.restore();
}
/* ---- v2.4 무한의 탑 카드: 별밤 + 돌탑 일러스트 + 수호자 층 + 기록 ---- */
function drawTowerCard(x, y, w, h) {
  const T = S.tower, locked = S.cleared < 10;
  ctx.save(); RR(x, y, w, h, 16); ctx.clip();
  ctx.fillStyle = ART.lgr(ctx, '#1a1446', '#3a2470', 0, y, 0, y + h); ctx.fillRect(x, y, w, h);
  for (let k = 0; k < 70; k++) { const sx = x + (k * 97.3) % w, sy = y + (k * 53.7) % (h * 0.75); ctx.globalAlpha = 0.25 + 0.5 * Math.abs(Math.sin(G.time * 1.5 + k)); ctx.fillStyle = '#fff'; ctx.fillRect(sx, sy, k % 7 ? 1.6 : 2.6, k % 7 ? 1.6 : 2.6); } ctx.globalAlpha = 1;
  // 달
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(ART.softDot('#fff2c0'), x + 6, y + 6, 80, 80); ctx.restore(); ctx.beginPath(); ctx.arc(x + 46, y + 46, 16, 0, TAU); ctx.fillStyle = '#fff6d8'; ctx.fill(); ctx.beginPath(); ctx.arc(x + 53, y + 41, 14.5, 0, TAU); ctx.fillStyle = '#2a1c5a'; ctx.fill();
  // 구름 바다 + 언덕
  ctx.fillStyle = 'rgba(160,140,230,.35)'; for (let k = 0; k < 6; k++) { ART.E(ctx, x + k * 80 + ((G.time * 6) % 80), y + h - 54, 60, 20); ctx.fill(); }
  ctx.fillStyle = ART.lgr(ctx, '#3c2c70', '#20163e', 0, y + h - 60, 0, y + h); ctx.beginPath(); ctx.moveTo(x, y + h); ctx.quadraticCurveTo(x + 120, y + h - 70, x + 250, y + h - 40); ctx.quadraticCurveTo(x + 330, y + h - 30, x + w, y + h - 50); ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.fill();
  // 돌탑 (층마다 창문, 현재 층 빛남, 10층마다 문장)
  const tx = x + 118, base = y + h - 46, FL = 8, fh = 36, cur = T.cur, start = Math.max(1, cur - 3);
  for (let k = 0; k < FL; k++) { const f = start + k, fy = base - (k + 1) * fh, tw = 132 - k * 5, lx = tx - tw / 2, guard = f % 10 === 0, clear = f < cur, now = f === cur;
    ctx.fillStyle = ART.lgr(ctx, guard ? '#8a6ac8' : '#6a5aa0', guard ? '#5a3a98' : '#463a78', 0, fy, 0, fy + fh); ctx.fillRect(lx, fy, tw, fh - 1);
    ctx.strokeStyle = 'rgba(20,10,40,.45)'; ctx.lineWidth = 1; for (let b = 0; b < 3; b++) { ctx.beginPath(); ctx.moveTo(lx, fy + b * 12); ctx.lineTo(lx + tw, fy + b * 12); ctx.stroke(); for (let c = 0; c < 5; c++) { const bx = lx + ((c + (b % 2) * 0.5) * tw / 4.5); ctx.beginPath(); ctx.moveTo(bx, fy + b * 12); ctx.lineTo(bx, fy + b * 12 + 12); ctx.stroke(); } }
    ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(lx, fy, 5, fh - 1);
    // 창문
    RR(tx - 10, fy + 8, 20, 20, 9); ctx.fillStyle = now ? '#ffe680' : clear ? '#ffcf7a' : '#2a2050'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#2a1a40'; ctx.stroke();
    if (now) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.7 + Math.sin(G.time * 4) * 0.25; ctx.drawImage(ART.softDot('#ffe27a'), tx - 50, fy - 20, 100, 76); ctx.restore(); }
    txt(`${f}`, lx + 14, fy + fh / 2, 11, now ? '#fff3a0' : '#d8c8ff', 'center', false);
    if (guard) { ctx.save(); ctx.translate(lx + tw - 14, fy + fh / 2); ctx.fillStyle = pkGoldG(-10, 10); ctx.beginPath(); ctx.moveTo(-9, -8); ctx.lineTo(9, -8); ctx.lineTo(9, 2); ctx.quadraticCurveTo(0, 12, -9, 2); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#6a3a10'; ctx.lineWidth = 1; ctx.stroke(); ART.star(ctx, 0, -1, 4.5, '#c0392b'); ctx.restore(); }
  }
  // 꼭대기 지붕 + 깃발
  const topY = base - FL * fh, rw = 132 - FL * 5 + 18; ctx.fillStyle = ART.lgr(ctx, '#c0507a', '#7a2050', 0, topY - 50, 0, topY); ctx.beginPath(); ctx.moveTo(tx - rw / 2, topY); ctx.lineTo(tx, topY - 50); ctx.lineTo(tx + rw / 2, topY); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#3a1028'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = '#d8c8a0'; ctx.fillRect(tx - 1, topY - 74, 2.5, 26); const wv = Math.sin(G.time * 4) * 3; ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.moveTo(tx + 1.5, topY - 74); ctx.quadraticCurveTo(tx + 14, topY - 70 + wv, tx + 24, topY - 66); ctx.lineTo(tx + 1.5, topY - 58); ctx.closePath(); ctx.fill(); ART.paw(ctx, tx + 10, topY - 66, 0.22, '#8a5a14');
  // 기사 아이콘 (현재 층 옆)
  const ky = base - (cur - start) * fh - fh / 2 - 2; ART.draw(ctx, heroType(), 'i' + (Math.floor(G.time * 2.4) % 3), tx - 92, ky + 22, 0.42, false, 0); txt('▶', tx - 74, ky + 4, 12, '#ffe27a', 'center', false);
  ctx.restore();
  ctx.lineWidth = 3; ctx.strokeStyle = pkGoldG(y, y + h); RR(x, y, w, h, 16); ctx.stroke();
  // 오른쪽 정보
  const ix = x + 300; bigText('무한의 탑', ix, y + 30, 26, '#fff3c4', '#8a5ad8');
  txt('월요일 1층 · 10층마다 수호자', ix, y + 56, 12.5, '#cbbcf0', 'center', false, null, 196);
  RR(ix - 92, y + 70, 184, 64, 12); ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,226,150,.5)'; ctx.stroke();
  txt('이번 주 도전', ix, y + 86, 12, '#d8c8ff', 'center', false); bigText(`${T.cur}층`, ix, y + 114, 28, '#ffffff', '#6a3ac8');
  const nextG = Math.ceil(T.cur / 10) * 10 || 10, bossK = BOSSES[Math.min(CHN - 1, Math.floor(nextG / 10) % CHN)];
  txt(`다음 수호자 ${nextG}층`, ix, y + 152, 13, '#ffe08a', 'center', false);
  ctx.save(); ctx.beginPath(); ctx.arc(ix, y + 196, 30, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#c8a0ff'; ctx.stroke(); ctx.clip(); try { ART.drawFit(ctx, bossK, 'i0', ix, y + 198, 56, 56); } catch (e) {} ctx.restore();
  txt(`최고 ${T.best}층`, ix, y + 240, 14, '#ffffff', 'center', false);
  const rank = T.hist.concat(T.best ? [{ w: T.w, best: T.best, now: true }] : []).sort((a, b) => b.best - a.best).slice(0, 3);
  ['#ffd34d', '#d8dce8', '#e0a070'].forEach((mc, k) => { const r = rank[k], yy = y + 266 + k * 26; ctx.beginPath(); ctx.arc(ix - 70, yy, 9, 0, TAU); ctx.fillStyle = r ? mc : 'rgba(255,255,255,.12)'; ctx.fill(); txt(`${k + 1}`, ix - 70, yy + 0.5, 10, '#3a2400', 'center', false); txt(r ? `${r.best}층${r.now ? ' · 이번 주' : ''}` : '—', ix - 54, yy, 12.5, r && r.now ? '#fff3a0' : '#e8e0ff', 'left', false); });
  txt(`이번 층 보상 ${200 + T.cur * 70}코인`, ix, y + 343, 12.5, '#e0d4ff', 'center', false, null, 220); txt('5층마다 물약 · 10층마다 별가루 2', ix, y + 360, 11.5, '#cbbcf0', 'center', false, null, 220); /* v3.5 두 줄로 (글씨가 너무 작아지던 문제) */
  pkBtn(ix - 92, y + 368, 184, 56, locked ? '스테이지 10 이후' : `${T.cur}층 도전!`, () => { if (locked) return; DAILY = null; go(() => startTower()); }, { bg: locked ? '#6a6080' : '#8a4ae8', disabled: locked, size: locked ? 15 : 20, key: 'tower', shine: !locked });
}
/* ---- v2.4 주간 도전 왼쪽 (프리미엄) ---- */
function drawWeeklyHead(P, R, wk, done) {
  ctx.save(); ctx.globalAlpha = Math.min(1, P.t * 4); ctx.fillStyle = 'rgba(8,4,16,.78)'; ctx.fillRect(-OX, 0, VW, H); ctx.restore();
  pkFrame(30, 40, 396, 484, 'royal', { gem: R.col });
  pkRibbon(228, 22, '주간 도전', R.col, 240);
  txt(`⏰ ${weekDaysLeft()}일 남음 · 월요일마다 새 규칙`, 228, 84, 12, '#cbbcf0', 'center', false);
  // 규칙 문장(엠블럼)
  const ex = 228, ey = 150; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.55 + Math.sin(G.time * 2) * 0.15; ctx.drawImage(ART.softDot(R.col), ex - 110, ey - 80, 220, 160); ctx.restore();
  for (let k = 0; k < 12; k++) { const a = k / 12 * TAU + G.time * 0.3; ctx.save(); ctx.translate(ex, ey); ctx.rotate(a); ctx.fillStyle = 'rgba(255,233,168,.18)'; ctx.beginPath(); ctx.moveTo(0, -46); ctx.lineTo(6, -82); ctx.lineTo(-6, -82); ctx.closePath(); ctx.fill(); ctx.restore(); }
  ctx.beginPath(); ctx.arc(ex, ey, 46, 0, TAU); ctx.fillStyle = ART.lgr(ctx, ART.LI(R.col, 0.3), ART.DK(R.col, 0.35), 0, ey - 46, 0, ey + 46); ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = pkGoldG(ey - 46, ey + 46); ctx.stroke();
  ctx.beginPath(); ctx.arc(ex, ey, 38, 0, TAU); ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.stroke(); drawDecor(ex, ey + 26, R.k, 0.62);
  if (done) pkStamp(ex + 54, ey + 34, '클리어!', '#ffd34d');
  bigText(R.n, ex, 218, 22, '#ffffff', ART.DK(R.col, 0.4));
  pkCard(54, 236, 348, 56, {}); wrapTxt(R.d, 68, 254, 320, 13.5, '#5a3412', 19);
  { const rc = weekRecs(S.diff != null ? S.diff : 1)[wk]; txt(`스테이지 ${clamp(S.cleared, 10, MAXST)} 수준 · 보스 없음 · 이번 주 최고 ${rc ? fmtT(rc.t) : '—'}`, ex, 306, 11.5, '#cbbcf0', 'center', false); }
  // 보상 줄
  pkCard(54, 318, 348, 74, { state: done ? 'done' : 'claim' });
  txt(done ? '받은 보상 · 다시 깨면 코인 600 · 별가루 1' : '처음 깨면 받는 보상', ex, 331, 12, done ? '#2e7d32' : '#a0652a', 'center', false);
  drawSticker(98, 356, 17, R.col, '스티커', true); ART.icon(ctx, 'coin', 172, 358, 24); txt('3000', 172, 382, 11, '#5a3412', 'center', false);
  ART.star(ctx, 238, 358, 12, '#b07cff'); txt('별가루 8', 238, 382, 11, '#5a3412', 'center', false); drawDecor(320, 374, R.k, 0.5); txtW(R.deco, 320, 382, 10.5, '#5a3412', 'center', 90, 13);
  pkBtn(80, 402, 296, 58, done ? '다시 도전하기' : '도전 시작!', () => { WEEKP = null; go(() => startWeekly()); }, { bg: R.col, size: 22, key: 'wkgo', shine: !done });
  // 연속 달성 4칸
  const stk = S.weekLast === wk || S.weekLast === wk - 1 ? (S.weekStreak || 0) : 0; txt('연속 달성', 76, 482, 12, '#ffe9a8', 'left', false);
  for (let q = 0; q < 4; q++) { const cx = 156 + q * 34, on = q < Math.min(4, stk); ctx.beginPath(); ctx.arc(cx, 482, 12, 0, TAU); ctx.fillStyle = on ? ART.lgr(ctx, '#ffe08a', '#ff7a3a', 0, 470, 0, 494) : 'rgba(255,255,255,.1)'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = on ? '#ffd34d' : 'rgba(255,226,150,.4)'; ctx.stroke(); txt(on ? '🔥' : `${q + 1}`, cx, 483, on ? 12 : 11, '#fff', 'center', false); }
  txtW('4주마다 → 별가루 10', 300, 482, 11, '#cbbcf0', 'left', 110, 13);
  txt(`별가루 ${S.dust || 0}`, 228, 506, 11, '#cbbcf0', 'center', false);
  btn(366, 48, 46, 36, 'X', () => { WEEKP = null; }, { bg: '#8a7a9a', size: 16, key: 'wkclose' }); hubTabs(1);
  // 오른쪽 틀
  pkFrame(440, 40, 490, 484, 'royal', { gem: '#7ac8ff' });
  RR(454, 112, 462, 400, 14); ctx.fillStyle = ART.lgr(ctx, '#fffaf0', '#f1e0bf', 0, 112, 0, 512); ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#c99a50'; ctx.stroke();
}

/* ================= v2.8 상점 · 아이템 (표 하나: ITEMS) =================
   - 화폐: 코인(게임에서 얻음) · 보석 💎(업적·주간 도전 처음 깨기·출석 7일째로 조금씩, 나중에 유료 판매 연결 자리)
   - 전투 아이템: 전투 전에 「전투 가방」 3칸에 넣어 가면, 전투 중 오른쪽 위 버튼으로 사용 (한 판에 같은 아이템 최대 2번)
   - 시작 아이템: 가방에 넣으면 전투 시작 때 자동으로 한 번 쓰임
   - 밸런스 기준(v2.9 봇 측정: 새 저장 1~10판 한 판 평균 ≈ 1,200코인, 11~20판 ≈ 3,000코인): 기본 전투 아이템 ≈ 1~10판 수입의 1/3, 장비 상자 ≈ 2.5판 수입 */
const ITEMS = [ /* v4.4 모든 상점 아이템은 보석(다이아)으로만 · pt = 이 아이템만의 매력 포인트 · tag = 꼬리표 */
  { id: 'bonebag', n: '뼈다귀 주머니', ic: 'bone', col: '#ffcf6b', kind: 'battle', gem: 3, c: 600, d: '뼈다귀 +60 바로 채우기', pt: '동료를 더 빨리 불러요', tag: '기본' },
  { id: 'manacandy', n: '마나 별사탕', ic: 'mana', col: '#7ac8ff', kind: 'battle', gem: 3, c: 600, d: '마나 +50 바로 채우기', pt: '기술을 한 번 더!', tag: '기본' },
  { id: 'drum', n: '용기의 북', ic: 'sword', col: '#ff8a5a', kind: 'battle', gem: 6, d: '20초 동안 모든 동료 공격 +50% (높은 판일수록 더 셈)', pt: '보스 직전에 쾅!', tag: '인기' },
  { id: 'charm', n: '수호 부적', ic: 'heart', col: '#9ae08a', kind: 'battle', gem: 8, d: '12초 동안 성이 안 다침 + 성 체력 25% 회복', pt: '위기 탈출 한 방', tag: '' },
  { id: 'bomb', n: '솜뭉치 폭탄', ic: 'star', col: '#c8a0ff', kind: 'battle', gem: 7, d: '화면 안 졸개 모두 퐁! (보스는 조금)', pt: '몰려오면 퐁!', tag: '인기' },
  { id: 'feather', n: '부활 깃털', ic: 'heart', col: '#ffe08a', kind: 'battle', gem: 10, d: '쓰러진 기사가 바로 일어나 체력 60%', pt: '기다림 없이 바로 부활', tag: '' },
  { id: 'goldbone', n: '황금 뼈다귀', ic: 'bone', col: '#ffd34d', kind: 'battle', gem: 9, d: '뼈다귀 가득 + 20초 동안 뼈다귀 2배로 빨리 참', pt: '기사단 총출동!', tag: 'NEW' },
  { id: 'rainbowcandy', n: '무지개 별사탕', ic: 'mana', col: '#ff8ac8', kind: 'battle', gem: 12, d: '마나·뼈다귀 가득 + 기술 기다림 바로 끝', pt: '기술 모두 한 번 더!', tag: 'NEW' },
  { id: 'lunch', n: '간식 도시락', ic: 'bone', col: '#ffb86b', kind: 'start', gem: 2, c: 400, d: '전투 시작 뼈다귀 +40', pt: '시작부터 동료 2마리', tag: '' },
  { id: 'clover', n: '행운 클로버', ic: 'coin', col: '#5cc96b', kind: 'start', gem: 5, c: 900, d: '이번 판 얻는 코인 +30%', pt: '강화 코인 모으기', tag: '' },
  { id: 'scroll', n: '경험 두루마리', ic: 'star', col: '#b07cff', kind: 'start', gem: 5, c: 900, d: '이번 판 얻는 경험치 +40%', pt: '레벨 쑥쑥', tag: '' },
  { id: 'starpouch', n: '별가루 주머니', ic: 'star', col: '#9a7aff', kind: 'start', gem: 6, c: 1500, d: '이번 판을 이기면 별가루 +3', pt: '각성 재료 모으기', tag: 'NEW' },
  { id: 'thunder', n: '천둥 번개', ic: 'star', col: '#ffe14a', kind: 'battle', gem: 15, power: 1, d: '모든 적 쓰러뜨림 (보스 40%) + 둥지 10% + 3초 기절', pt: '한 방에 판을 뒤집어요!', tag: '강력' },
  { id: 'allout', n: '기사단 총출동', ic: 'sword', col: '#ff6a3a', kind: 'battle', gem: 18, power: 1, d: '편성한 기사 5마리 × 2번 무료 출전 + 20초 동안 동료 공격 2배', pt: '뼈다귀 없이 다 같이!', tag: '강력' },
  { id: 'timestop', n: '시간 멈춤 시계', ic: 'mana', col: '#8ac8ff', kind: 'battle', gem: 16, power: 1, d: '10초 꽁꽁 (보스 6초) · 1.5배 아픔', pt: '그 사이 마음껏 공격!', tag: '강력' },
  { id: 'goldshield', n: '황금 방패', ic: 'heart', col: '#ffc83c', kind: 'battle', gem: 14, power: 1, d: '20초 무적 · 기사 체력 가득 · 성 30% 회복', pt: '보스 기술도 막아요', tag: '강력' },
];
const ITEM = id => ITEMS.find(q => q.id === id);
const BOXES = [
  { id: 'box1', n: '장비 상자', price: 3000, gem: 18, minR: 0, d: '일반~신화 장비 1개 · 신화는 상자에서만' },
  { id: 'box2', n: '고급 장비 상자', price: 10000, gem: 60, minR: 2, d: '희귀 이상 · 신화 5% (✦ 상점 전용)' },
];
const GEM_PACKS = [{ n: '보석 한 줌', g: 60 }, { n: '보석 주머니', g: 330 }, { n: '보석 상자', g: 700 }]; /* 나중에 유료 판매로 연결할 자리 (지금은 판매 안 함) */
function invN(id) { S.items = S.items || {}; return S.items[id] || 0; }
const bag4 = () => S.lv >= 30 || !!S.bag4; /* v3.1 가방 4번째 칸: 레벨 30 또는 보석 30 */
function bag() { if (!S.bag) S.bag = ['bonebag', 'drum', null]; if (bag4() && S.bag.length < 4) S.bag.push(null); return S.bag; }
let SHOPP = null;
/* v2.9 멍멍 마을 2차: 진짜 마을 풍경(산·언덕·돌길·가로등·울타리) + 건물 14채 각각 다른 모양 + 건물 효과 + 배치 바꾸기 + 펫 산책 */
const VILLAGE = [ /* v3.0: v = [1단계, 2단계, 3단계] 효과 값, 글의 {v} 자리에 들어감 */
  { n: '멍멍 집', ch: 0, c: '#ff9a7a', v: [60, 80, 100], fx: '우편함: 하루 한 번 (건물 수 × {v}) 코인', tap: 'mail', act: 'nap' },
  { n: '뼈다귀 우물', ch: 2, c: '#7ac8ff', v: [10, 15, 20], fx: '전투 시작 뼈다귀 +{v}', act: 'drink' },
  { n: '빵집', ch: 4, c: '#ffcf6b', v: [1, 1, 2], fx: '하루 한 번 「간식 도시락」 {v}개', tap: 'bread', act: 'eat' },
  { n: '놀이터', ch: 6, c: '#9ae08a', v: [50, 75, 100], fx: '마을 강아지 첫 쓰다듬기 코인 +{v}%', act: 'slide' },
  { n: '꽃밭', ch: 8, c: '#ff9ed8', v: [150, 220, 300], fx: '하루 한 번 꽃다발 → 코인 {v}', tap: 'flower', act: 'sniff' },
  { n: '도서관', ch: 11, c: '#b8a0e8', v: [5, 7, 10], fx: '전투 경험치 +{v}%', act: 'read' },
  { n: '대장간', ch: 14, c: '#c88a5a', v: [10, 13, 16], fx: '장비 강화 비용 {v}% 할인', act: 'hammer' },
  { n: '연못', ch: 17, c: '#5ab0e8', v: [120, 180, 240], fx: '하루 한 번 낚시 (별사탕 또는 코인 {v})', tap: 'fish', act: 'fish' },
  { n: '음악당', ch: 20, c: '#ffb070', v: [15, 20, 25], fx: '전투 시작 마나 +{v}', act: 'sing' },
  { n: '천문대', ch: 24, c: '#8a7ae8', v: [1, 1, 2], fx: '밤(19~6시)에 하루 한 번 별똥별 → 별가루 {v}', tap: 'star', act: 'look' },
  { n: '축제 무대', ch: 28, c: '#ff7aa8', v: [5, 7, 10], fx: '전투에서 얻는 코인 +{v}%', act: 'dance' },
  { n: '무지개 다리 탑', ch: 32, c: '#ffd34d', v: [5, 7, 10], fx: '전투 경험치 +{v}%', act: 'look' },
  { n: '용 둥지', ch: 36, c: '#ff8a5a', v: [1, 1, 2], fx: '하루 한 번 용알 줍기 → 코인 {v}×300', tap: 'egg', act: 'sniff' },
  { n: '기사의 성당', ch: 40, c: '#e8d8a8', v: [5, 7, 10], fx: '멍멍성 체력 +{v}%', act: 'sing' },
];
const VIL_UP = [0, 3000, 8000]; /* 2단계·3단계로 올리는 코인 (건물 순서마다 10%씩 비쌈) */
const vilLv = i => (S.vilLv && S.vilLv[i]) || 1;
const vilV = i => VILLAGE[i].v[vilLv(i) - 1];
const vilFx = (i, lv) => VILLAGE[i].fx.replace('{v}', VILLAGE[i].v[(lv || vilLv(i)) - 1]);
const vilUpCost = i => Math.round(VIL_UP[vilLv(i)] * (1 + i * 0.1) / 10) * 10;
function vilUpgrade(i) { const lv = vilLv(i); if (lv >= 3 || !vilOn(i)) return; const c = vilUpCost(i); if (S.coins < c) { floatMsg = { s: '코인이 모자라요', x: W / 2, y: 420, t: 1.6 }; return; } S.coins -= c; S.vilLv = S.vilLv || {}; S.vilLv[i] = lv + 1; SFX.rare(); floatMsg = { s: `「${VILLAGE[i].n}」 ${lv + 1}단계! ${vilFx(i)}`, x: W / 2, y: 420, t: 2.2 }; if (VILP) { VILP.bounce = { i, t: 0.6 }; VILP.cele = { i, t: 4 }; } save(); } /* v3.1 단계 올리면 축하 (반짝 + 강아지들 모여 박수) */
const ACTD = { eat: '빵을 냠냠 먹고 있어요', drink: '우물물을 마시고 있어요', slide: '미끄럼틀을 타고 있어요', sniff: '꽃 냄새를 맡고 있어요', read: '책을 읽고 있어요', hammer: '망치질을 돕고 있어요', fish: '낚시를 하고 있어요', sing: '노래를 부르고 있어요', dance: '신나게 춤추고 있어요', nap: '쿨쿨 낮잠을 자고 있어요', look: '하늘을 올려다보고 있어요' };
const jo = n => { const c = n.charCodeAt(n.length - 1) - 0xac00; return c >= 0 && c < 11172 && c % 28 ? '이' : '가'; }; /* 받침 있으면 '이', 없으면 '가' */
const PET_BLD = { chick: 4, hamster: 2, songsquirrel: 8, turtle: 7, pumpkinbat: 9, babydeer: 4, bokrabbit: 2 };
const vilSeason = () => { if (window.__sea) return window.__sea; const m = new Date().getMonth() + 1; return m >= 3 && m <= 5 ? 'spring' : m >= 6 && m <= 8 ? 'summer' : m >= 9 && m <= 11 ? 'autumn' : 'winter'; };
let VILP = null;
const chClearedN = () => Math.floor(S.cleared / CHL);
const vilOn = i => chClearedN() >= VILLAGE[i].ch;
/* 효과 적용 (전투 시작 때 한 번) */
function vilBattleFx() { if (!B) return; if (vilOn(1)) B.food += vilV(1); if (vilOn(8)) B.mana += vilV(8); if (vilOn(13)) { B.base.max = Math.round(B.base.max * (1 + vilV(13) / 100)); B.base.hp = B.base.max; } let xk = 1; if (vilOn(5)) xk += vilV(5) / 100; if (vilOn(11)) xk += vilV(11) / 100; B.xpK = (B.xpK || 1) * xk; if (vilOn(10)) B.coinK = (B.coinK || 1) * (1 + vilV(10) / 100); }
function vilHasGift() { if (!S || !VILLAGE) return false; if (S.vilEv !== todayKey()) return true; const night = weatherNow().night; return VILLAGE.some((b, i) => b.tap && vilOn(i) && !vilGot(i) && !(b.tap === 'star' && !night)); }
const VPLOT = [...Array.from({ length: 7 }, (_, k) => ({ x: 84 + k * 124, y: 252, s: 0.8 })), ...Array.from({ length: 7 }, (_, k) => ({ x: 140 + k * 124, y: 390, s: 1 }))];
function vilPos() { if (!S.vilPos || S.vilPos.length !== 14) S.vilPos = VILLAGE.map((b, i) => i % 2 ? (i - 1) / 2 : 7 + i / 2); return S.vilPos; } /* S.vilPos[건물] = 자리 번호 (0~6 뒷줄, 7~13 앞줄) */
const VILBG = {}, VILB = {};
/* v3.8 멍멍 마을 배경 새로 그림 (계절마다 훨씬 자세하게): 계절 하늘·빛나는 구름 · 눈 쌓인/꽃 핀 먼 산 · 계절 나무 숲(벚꽃·짙은 초록·단풍·눈 덮인 전나무) · 입체 언덕 집 · 돌 하나하나 그린 돌길 · 계절 땅(꽃잎·풀꽃·낙엽·눈더미) · 나무 울타리 · 햇빛
   선명하게 2배 크기로 한 번만 그려 둠 (계절·낮밤마다) */
const VSEA = {
  spring: { sky: ['#6fb8f0', '#bfe2ff', '#ffe8f2'], cl: ['#ffffff', '#d9c6e6'], mt: ['#b4c2e6', '#93a9d6', '#7e98c8'], snow: 0.5, gr: ['#b2e08a', '#74bc5e'], fo: ['#f7a9c9', '#ffd8e8', '#e283ae', '#8cc76a'], bush: ['#ff9ec4', '#ffffff', '#ffd1e3'], sun: 'rgba(255,248,220,' },
  summer: { sky: ['#2f8fe6', '#7cc8ff', '#dff4ff'], cl: ['#ffffff', '#bcd2ee'], mt: ['#8fb0dc', '#6f96cc', '#5880b8'], snow: 0.15, gr: ['#96dc6a', '#4aa242'], fo: ['#3f9c3e', '#6cc65a', '#2b7a32', '#4fb04a'], bush: ['#5aa0ff', '#c08aff', '#ffffff'], sun: 'rgba(255,250,210,' },
  autumn: { sky: ['#5a9ad8', '#f2d6a8', '#ffcf94'], cl: ['#fff3e0', '#e0b0a0'], mt: ['#b9a0c4', '#9d88b4', '#86749e'], snow: 0.35, gr: ['#cdc77a', '#9a9a4e'], fo: ['#e2582a', '#f6a632', '#c83a1a', '#f4cc48'], bush: ['#e8762a', '#c8401a', '#f6b040'], sun: 'rgba(255,226,170,' },
  winter: { sky: ['#7f9cc8', '#c2d4ec', '#eef4fb'], cl: ['#ffffff', '#c4d0e4'], mt: ['#dfe8f6', '#c4d2ea', '#a9bcdc'], snow: 1, gr: ['#f6f9fd', '#cfdcee'], fo: ['#3e6e5a', '#2f5a4a', '#4e8068', '#ffffff'], bush: ['#ffffff', '#e8f0fa', '#d03a3a'], sun: 'rgba(255,255,245,' },
};
function vilBg(night) { const sea = vilSeason(), key = (night ? 'n' : 'd') + sea; if (VILBG[key]) return VILBG[key];
  const Z = VSEA[sea], SC = 2, c = document.createElement('canvas'); c.width = VW * SC; c.height = H * SC; const g = c.getContext('2d'); g.scale(SC, SC); g.translate(OX, 0);
  const L0 = -OX, L1 = W + OX; let sd = 4242 + sea.length * 77; const R = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
  const lg = (y0, y1, a, b) => ART.lgr(g, a, b, 0, y0, 0, y1);
  /* 하늘 */
  { const sk = g.createLinearGradient(0, 0, 0, 250); sk.addColorStop(0, Z.sky[0]); sk.addColorStop(0.6, Z.sky[1]); sk.addColorStop(1, Z.sky[2]); g.fillStyle = sk; g.fillRect(L0, 0, VW, 300);
    const sg = g.createRadialGradient(820, 60, 6, 820, 60, 300); sg.addColorStop(0, Z.sun + '1)'); sg.addColorStop(0.12, Z.sun + '.75)'); sg.addColorStop(0.4, Z.sun + '.22)'); sg.addColorStop(1, Z.sun + '0)'); g.fillStyle = sg; g.fillRect(L0, 0, VW, 300); }
  /* 구름 (위는 햇빛, 아래는 그늘) */
  const cloud = (x, y, s, al) => { const cw = Math.ceil(300 * s), ch = Math.ceil(120 * s), cv = ART.mk(cw * 2, ch * 2), q = cv.getContext('2d'); q.scale(2, 2); q.translate(cw / 2 - x, ch * 0.75 - y);
    const n = sea === 'summer' ? 12 : 9, blobs = []; for (let k = 0; k < n; k++) blobs.push([x + (k - n / 2) * 20 * s + (R() - 0.5) * 10 * s, y - Math.sin(k / (n - 1) * Math.PI) * (sea === 'summer' ? 44 : 24) * s + (R() - 0.5) * 8 * s, (16 + R() * 16) * s * (1 - Math.abs(k - n / 2) / (n + 2))]);
    q.fillStyle = ART.lgr(q, Z.cl[0], Z.cl[1], 0, y - 60 * s, 0, y + 22 * s); q.beginPath(); blobs.forEach(([bx, b2, r]) => { q.moveTo(bx + r, b2); q.arc(bx, b2, r, 0, TAU); }); q.fill();
    q.globalCompositeOperation = 'source-atop'; const sh = q.createLinearGradient(0, y - 4 * s, 0, y + 24 * s); sh.addColorStop(0, 'rgba(120,130,170,0)'); sh.addColorStop(1, 'rgba(120,130,170,.32)'); q.fillStyle = sh; q.fillRect(x - 160 * s, y - 4 * s, 320 * s, 40 * s);
    const hl = q.createRadialGradient(x + 30 * s, y - 50 * s, 2, x + 30 * s, y - 50 * s, 80 * s); hl.addColorStop(0, 'rgba(255,255,255,.7)'); hl.addColorStop(1, 'rgba(255,255,255,0)'); q.fillStyle = hl; q.fillRect(x - 160 * s, y - 100 * s, 320 * s, 100 * s);
    g.save(); g.globalAlpha = al; g.drawImage(cv, x - cw / 2, y - ch * 0.75, cw, ch); g.restore(); };
  (sea === 'summer' ? [[120, 110, 1.3, 0.95], [520, 84, 1.1, 0.9], [-60, 150, 0.9, 0.85], [980, 120, 1.2, 0.9]] : sea === 'winter' ? [[60, 90, 1.4, 0.75], [400, 70, 1.6, 0.7], [800, 100, 1.3, 0.7], [1050, 80, 1.1, 0.7]] : [[90, 100, 1, 0.85], [470, 78, 0.9, 0.8], [700, 130, 0.7, 0.7], [-80, 140, 0.8, 0.75], [1000, 110, 1, 0.8]]).forEach(a => cloud(...a));
  /* 먼 산 3겹 + 눈 + 안개 */
  [[176, 92, 0.0062, 1, Z.mt[0]], [196, 62, 0.0105, 3, Z.mt[1]], [214, 40, 0.017, 5.5, Z.mt[2]]].forEach(([base, amp, f, ph, col], li) => { const P = []; for (let x = L0; x <= L1; x += 5) P.push([x, base - Math.abs(Math.sin(x * f + ph)) * amp - Math.sin(x * f * 2.6 + ph) * amp * 0.2 - Math.sin(x * f * 7) * amp * 0.05]);
    g.beginPath(); g.moveTo(L0, H); P.forEach(([x, y]) => g.lineTo(x, y)); g.lineTo(L1, H); g.closePath(); g.fillStyle = lg(base - amp, base + 60, ART.LI(col, 0.12), ART.DK(col, 0.08)); g.fill();
    g.save(); g.clip(); /* 햇빛 받는 쪽 */ for (let i = 1; i < P.length; i++) { const [x0, y0] = P[i - 1], [x1, y1] = P[i]; if (y1 < y0) { g.fillStyle = 'rgba(255,255,255,.07)'; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.lineTo(x1 + 20, y1 + 60); g.lineTo(x0 + 20, y0 + 60); g.closePath(); g.fill(); } }
      if ((li === 0 && sea !== 'summer') || sea === 'winter') { const sl = base - amp * (1 - Z.snow * 0.75); g.fillStyle = 'rgba(255,255,255,.88)'; g.beginPath(); g.moveTo(L0, sl); P.forEach(([x, y], i) => g.lineTo(x, Math.max(y, Math.min(sl + Math.sin(i * 1.7) * 5, y + 22)))); g.lineTo(L1, sl); g.lineTo(L1, -10); g.lineTo(L0, -10); g.closePath(); g.save(); g.clip(); g.beginPath(); P.forEach(([x, y]) => g.lineTo(x, y)); g.lineTo(L1, H); g.lineTo(L0, H); g.closePath(); g.fill(); g.restore(); }
    g.restore();
    const hz = g.createLinearGradient(0, base - 20, 0, base + 30); hz.addColorStop(0, ART.rgba(Z.sky[2], 0)); hz.addColorStop(1, ART.rgba(Z.sky[2], 0.32)); g.fillStyle = hz; g.fillRect(L0, base - 20, VW, 50); });
  /* 계절 나무 */
  const treeR = (x, y, s, cols) => { g.fillStyle = 'rgba(30,40,20,.18)'; g.beginPath(); g.ellipse(x + 3 * s, y, 14 * s, 3.5 * s, 0, 0, TAU); g.fill(); g.fillStyle = sea === 'winter' ? '#6a4a3a' : '#7a5232'; g.fillRect(x - 2.2 * s, y - 12 * s, 4.4 * s, 12 * s);
    const cl = [[0, -26, 12], [-9, -19, 9], [9, -19, 9], [-5, -31, 8], [6, -31, 8], [0, -18, 9]]; cl.forEach(([a, b, r], k) => { const gx = x + a * s, gy = y + b * s, rr = r * s; const gg = g.createRadialGradient(gx - rr * 0.4, gy - rr * 0.5, 1, gx, gy, rr); gg.addColorStop(0, cols[1]); gg.addColorStop(0.6, cols[0]); gg.addColorStop(1, cols[2]); g.fillStyle = gg; g.beginPath(); g.arc(gx, gy, rr, 0, TAU); g.fill(); });
    if (sea === 'spring') for (let k = 0; k < 9; k++) { g.fillStyle = k % 2 ? '#ffffff' : '#ffeaf3'; g.beginPath(); g.arc(x + (R() - 0.5) * 24 * s, y - (14 + R() * 22) * s, 1.1 * s, 0, TAU); g.fill(); }
    if (sea === 'autumn') for (let k = 0; k < 6; k++) { g.fillStyle = cols[3]; g.beginPath(); g.arc(x + (R() - 0.5) * 22 * s, y - (16 + R() * 20) * s, 1.6 * s, 0, TAU); g.fill(); } };
  const pine = (x, y, s, col, snow) => { g.fillStyle = 'rgba(30,40,20,.18)'; g.beginPath(); g.ellipse(x + 3 * s, y, 11 * s, 3 * s, 0, 0, TAU); g.fill(); g.fillStyle = '#6a4a32'; g.fillRect(x - 1.8 * s, y - 8 * s, 3.6 * s, 8 * s);
    for (let q = 0; q < 4; q++) { const ty = y - (40 - q * 9) * s, by2 = y - (20 - q * 8) * s, hw = (6 + q * 3.4) * s; g.beginPath(); g.moveTo(x, ty); g.lineTo(x - hw, by2); g.quadraticCurveTo(x, by2 + 3 * s, x + hw, by2); g.closePath(); g.fillStyle = ART.lgr(g, ART.LI(col, 0.18), ART.DK(col, 0.2), x - hw, 0, x + hw, 0); g.fill();
      if (snow) { g.fillStyle = 'rgba(255,255,255,.95)'; g.beginPath(); g.moveTo(x, ty + 1); g.lineTo(x - hw * 0.8, by2 - 1.5 * s); g.quadraticCurveTo(x - hw * 0.3, by2 - 4 * s, x, by2 - 2 * s); g.quadraticCurveTo(x + hw * 0.4, by2 - 4.5 * s, x + hw * 0.75, by2 - 2 * s); g.closePath(); g.fill(); } } };
  const ft = sea === 'winter' ? (x, y, s) => pine(x, y, s, Z.fo[R() < 0.5 ? 0 : 1], true) : (x, y, s) => { if (sea === 'summer' && R() < 0.3) return pine(x, y, s, '#2f7a3a', false); const k = Math.floor(R() * 3); const C = sea === 'autumn' ? [[Z.fo[0], '#ffb070', '#8a2a10', Z.fo[3]], [Z.fo[1], '#ffe08a', '#b86010', Z.fo[0]], [Z.fo[3], '#fff0a0', '#b88a10', Z.fo[1]]][k] : sea === 'spring' ? (k === 2 ? ['#8cc76a', '#c8f0a0', '#4a8a3a', '#fff'] : [Z.fo[0], Z.fo[1], Z.fo[2], '#fff']) : [[Z.fo[0], '#9ae07a', '#1f5a28', '#fff'], [Z.fo[1], '#b8f090', '#2a7a32', '#fff'], [Z.fo[3], '#a0e888', '#2a6a2a', '#fff']][k]; treeR(x, y, s, C); };
  /* 숲 줄 (지평선) */
  for (let k = 0; k < 46; k++) { const x = L0 + (k + R() * 0.6) / 46 * VW, y = 226 + R() * 8 - Math.abs(Math.sin(x * 0.006 + 5)) * 10; ft(x, y, 0.6 + R() * 0.3); }
  /* 언덕 위 집 (입체) */
  const house = (x, y, w, h, rc) => { g.fillStyle = 'rgba(30,40,20,.2)'; g.beginPath(); g.ellipse(x + 4, y + 1, w * 0.7, 3, 0, 0, TAU); g.fill(); const sw = w * 0.32;
    g.fillStyle = ART.lgr(g, '#fff6e6', '#ead8bc', x - w / 2, 0, x + w / 2, 0); g.fillRect(x - w / 2, y - h, w, h); g.fillStyle = '#cdb698'; g.fillRect(x + w / 2, y - h + 3, sw, h - 3); g.strokeStyle = 'rgba(110,80,60,.6)'; g.lineWidth = 0.8; g.strokeRect(x - w / 2, y - h, w, h);
    g.beginPath(); g.moveTo(x - w / 2 - 3, y - h); g.lineTo(x, y - h - 13); g.lineTo(x + w / 2 + sw, y - h - 10); g.lineTo(x + w / 2 + sw + 2, y - h + 3); g.lineTo(x + w / 2 + 3, y - h); g.closePath(); g.fillStyle = ART.lgr(g, ART.LI(rc, 0.2), ART.DK(rc, 0.25), x - w / 2, 0, x + w / 2 + sw, 0); g.fill(); g.stroke();
    if (sea === 'winter') { g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(x - w / 2 - 3, y - h); g.lineTo(x, y - h - 13); g.lineTo(x + w / 2 + sw, y - h - 10); g.lineTo(x + w / 2 + sw - 2, y - h - 6); g.lineTo(x, y - h - 9); g.lineTo(x - w / 2, y - h + 1); g.closePath(); g.fill(); }
    g.fillStyle = '#9a6a4a'; g.fillRect(x + w * 0.18, y - h - 16, 4, 8); g.fillStyle = '#8ac8f0'; g.fillRect(x - w / 2 + 3, y - h + 4, 5, 5); if (w > 28) g.fillRect(x + w / 2 - 8, y - h + 4, 5, 5); g.fillStyle = '#a8683a'; g.fillRect(x - 2.5, y - 8, 5, 8); };
  for (let k = 0; k < 13; k++) { const x = L0 + 40 + ((k * 151) % (VW - 60)), y = 238 - Math.abs(Math.sin(x * 0.006 + 5)) * 22 + (k % 2) * 4; house(x, y, 24 + (k % 3) * 6, 16 + (k % 2) * 5, ['#d8584a', '#4a7ac8', '#e89a3a', '#7a5ab0', '#4aa86a'][k % 5]); }
  /* 땅 */
  { g.beginPath(); g.moveTo(L0, 246); for (let x = L0; x <= L1; x += 10) g.lineTo(x, 242 + Math.sin(x * 0.01) * 4); g.lineTo(L1, H); g.lineTo(L0, H); g.closePath(); g.fillStyle = lg(240, H, Z.gr[0], Z.gr[1]); g.fill();
    g.save(); g.clip(); const sun2 = g.createRadialGradient(780, 260, 10, 780, 300, 420); sun2.addColorStop(0, 'rgba(255,250,220,.28)'); sun2.addColorStop(1, 'rgba(255,250,220,0)'); g.fillStyle = sun2; g.fillRect(L0, 240, VW, 300);
    if (sea === 'winter') { for (let k = 0; k < 60; k++) { const x = L0 + R() * VW, y = 260 + R() * 260, rw = 20 + R() * 50; g.fillStyle = 'rgba(160,185,220,.25)'; g.beginPath(); g.ellipse(x, y + 3, rw, rw * 0.18, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.ellipse(x, y, rw * 0.9, rw * 0.15, 0, 0, TAU); g.fill(); } for (let k = 0; k < 240; k++) { g.fillStyle = `rgba(255,255,255,${0.5 + R() * 0.5})`; g.beginPath(); g.arc(L0 + R() * VW, 250 + R() * 290, 0.6 + R() * 0.9, 0, TAU); g.fill(); } }
    else { for (let k = 0; k < 1100; k++) { const x = L0 + R() * VW, y = 250 + R() * 290, hh = (3 + R() * 5) * (0.6 + (y - 240) / 300); g.strokeStyle = R() < 0.5 ? 'rgba(40,90,30,.22)' : 'rgba(240,255,200,.2)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 1, y - hh * 0.6, x + (R() - 0.5) * 3, y - hh); g.stroke(); }
      const dots = sea === 'spring' ? ['#ffc0d8', '#ffffff', '#ff9ec4'] : sea === 'summer' ? ['#ffe14a', '#ffffff', '#ff8a5a', '#9ad0ff'] : ['#e2582a', '#f6a632', '#c83a1a', '#a86a2a'];
      for (let k = 0; k < 340; k++) { const x = L0 + R() * VW, y = 252 + R() * 286, r = (1 + R() * 1.6) * (0.6 + (y - 240) / 260); g.fillStyle = dots[k % dots.length]; g.globalAlpha = 0.85; if (sea === 'autumn' || sea === 'spring') { g.save(); g.translate(x, y); g.rotate(R() * TAU); g.beginPath(); g.ellipse(0, 0, r * 1.6, r * 0.8, 0, 0, TAU); g.fill(); g.restore(); } else { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); } } g.globalAlpha = 1; }
    g.restore(); }
  /* 돌길: 가운데 큰길 + 건물로 가는 작은 길 (돌 하나하나) */
  const P = t => { const u = 1 - t; return [u * u * u * L0 + 3 * u * u * t * 240 + 3 * u * t * t * 600 + t * t * t * L1, u * u * u * 452 + 3 * u * u * t * 420 + 3 * u * t * t * 476 + t * t * t * 438]; };
  const roadStroke = (w, col) => { g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(L0, 452); g.bezierCurveTo(240, 420, 600, 476, L1, 438); g.stroke(); };
  const stoneBase = sea === 'winter' ? ['#d8dce6', '#b8c0d0'] : sea === 'autumn' ? ['#e6cfa0', '#c8a878'] : ['#eadabc', '#c9ae86'];
  roadStroke(60, 'rgba(90,70,50,.35)'); roadStroke(54, stoneBase[1]); for (let k = 0; k < 7; k++) { const x = 140 + k * 124; g.strokeStyle = stoneBase[1]; g.lineWidth = 24; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, 410); g.lineTo(x, 442); g.stroke(); }
  const cob = (x, y, rx, ry) => { const base = ART.mix ? ART.mix(stoneBase[0], stoneBase[1], R() * 0.6) : stoneBase[0]; g.fillStyle = 'rgba(70,50,30,.28)'; g.beginPath(); g.ellipse(x + 0.8, y + 1.2, rx, ry, 0, 0, TAU); g.fill(); g.fillStyle = base; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.ellipse(x - rx * 0.25, y - ry * 0.35, rx * 0.5, ry * 0.35, 0, 0, TAU); g.fill(); };
  for (let t = 0; t <= 1.0001; t += 0.0065) { const [x, y] = P(t); for (let o = -20; o <= 20; o += 8) cob(x + (R() - 0.5) * 3, y + o * 0.9 + (R() - 0.5) * 2, 4.2 + R() * 1.6, 2.8 + R() * 0.8); }
  for (let k = 0; k < 7; k++) { const x = 140 + k * 124; for (let y = 412; y <= 440; y += 5.5) for (let o = -8; o <= 8; o += 8) cob(x + o + (R() - 0.5) * 2, y, 3.6 + R(), 2.4 + R() * 0.6); }
  if (sea === 'winter') { g.save(); g.globalAlpha = 0.5; roadStroke(14, '#ffffff'); g.restore(); }
  if (sea === 'autumn') for (let k = 0; k < 60; k++) { const [x, y] = P(R()); g.fillStyle = ['#e2582a', '#f6a632', '#c83a1a'][k % 3]; g.save(); g.translate(x + (R() - 0.5) * 10, y + (R() - 0.5) * 40); g.rotate(R() * TAU); g.beginPath(); g.ellipse(0, 0, 3.4, 1.7, 0, 0, TAU); g.fill(); g.restore(); }
  if (sea === 'spring') for (let k = 0; k < 70; k++) { const [x, y] = P(R()); g.fillStyle = k % 2 ? '#ffc0d8' : '#ffffff'; g.save(); g.translate(x + (R() - 0.5) * 10, y + (R() - 0.5) * 40); g.rotate(R() * TAU); g.beginPath(); g.ellipse(0, 0, 2.6, 1.4, 0, 0, TAU); g.fill(); g.restore(); }
  const bench = x => { const y = 430; g.fillStyle = night ? '#6a4a2a' : '#a8683a'; g.fillRect(x - 16, y - 10, 32, 4); g.fillRect(x - 16, y - 17, 32, 3); g.fillStyle = night ? '#3a3a44' : '#4a4a5a'; g.fillRect(x - 14, y - 10, 3, 10); g.fillRect(x + 11, y - 10, 3, 10); };
  const pot = (x, c) => { const y = 432; g.fillStyle = night ? '#7a4a30' : '#c8703a'; g.beginPath(); g.moveTo(x - 7, y - 10); g.lineTo(x + 7, y - 10); g.lineTo(x + 5, y); g.lineTo(x - 5, y); g.closePath(); g.fill(); g.fillStyle = night ? '#2e5a36' : '#4e9a3e'; g.beginPath(); g.arc(x, y - 14, 7, 0, Math.PI * 2); g.fill(); g.fillStyle = c; [[-3, -16], [3, -15], [0, -20]].forEach(([a, b]) => { g.beginPath(); g.arc(x + a, y + b, 2.4, 0, Math.PI * 2); g.fill(); }); };
  bench(202); pot(450, '#ff7aa0'); bench(574); pot(698, '#ffd34d'); pot(822, '#c8a0ff');
  { const x = 326, y = 432; g.fillStyle = night ? '#6a4a2a' : '#9a6a3a'; g.fillRect(x - 2, y - 40, 4, 40); g.fillStyle = night ? '#8a6a4a' : '#e8c890'; g.beginPath(); g.moveTo(x - 22, y - 38); g.lineTo(x + 18, y - 38); g.lineTo(x + 24, y - 32); g.lineTo(x + 18, y - 26); g.lineTo(x - 22, y - 26); g.closePath(); g.fill(); g.beginPath(); g.moveTo(x + 22, y - 22); g.lineTo(x - 18, y - 22); g.lineTo(x - 24, y - 16); g.lineTo(x - 18, y - 10); g.lineTo(x + 22, y - 10); g.closePath(); g.fill(); g.fillStyle = '#5a3a1a'; g.font = 'bold 8px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('무지개 다리 →', x, y - 32); g.fillText('← 멍멍성', x, y - 16); }
  /* 울타리 (그림자·나뭇결 · 겨울엔 눈) */
  g.fillStyle = 'rgba(60,40,20,.25)'; g.fillRect(L0, 513, VW, 4);
  for (let x = L0; x < L1; x += 26) { const y = 512; g.fillStyle = ART.lgr(g, '#e0b47a', '#a8703e', x, 0, x + 8, 0); g.fillRect(x, y - 22, 8, 28); g.beginPath(); g.moveTo(x, y - 22); g.lineTo(x + 4, y - 28); g.lineTo(x + 8, y - 22); g.fill(); g.strokeStyle = 'rgba(90,50,20,.35)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(x + 3, y - 18); g.lineTo(x + 3, y + 4); g.stroke(); if (sea === 'winter') { g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(x + 4, y - 27, 5.5, 2.6, 0, 0, TAU); g.fill(); } }
  g.fillStyle = lg(494, 499, '#d4a46a', '#9a6a3a'); g.fillRect(L0, 494, VW, 5); g.fillStyle = lg(504, 509, '#d4a46a', '#9a6a3a'); g.fillRect(L0, 504, VW, 5); if (sea === 'winter') { g.fillStyle = 'rgba(255,255,255,.95)'; g.fillRect(L0, 492.5, VW, 2.4); g.fillRect(L0, 502.5, VW, 2.4); }
  /* 계절 덤불 */
  for (let k = 0; k < 20; k++) { const x = L0 + 20 + (k * 211) % VW, y = 490 + (k % 3) * 4; const gc = sea === 'winter' ? ['#f4f8ff', '#ffffff', '#c8d6ea'] : sea === 'autumn' ? ['#c8702a', '#f0a040', '#8a3a10'] : ['#4aa048', '#7ccc62', '#2a6a2a'];
    [[0, 0, 14], [14, -4, 12], [-12, -2, 11], [6, -10, 10]].forEach(([a, b, r]) => { const gg = g.createRadialGradient(x + a - r * 0.4, y + b - r * 0.5, 1, x + a, y + b, r); gg.addColorStop(0, gc[1]); gg.addColorStop(0.7, gc[0]); gg.addColorStop(1, gc[2]); g.fillStyle = gg; g.beginPath(); g.arc(x + a, y + b, r, 0, TAU); g.fill(); });
    for (let q = 0; q < 6; q++) { g.fillStyle = Z.bush[q % Z.bush.length]; g.beginPath(); g.arc(x - 12 + R() * 28, y - 10 + R() * 12, sea === 'winter' ? 1.8 : 2.4, 0, TAU); g.fill(); } }
  /* 햇빛 · 가장자리 */
  if (!night) { g.save(); g.globalCompositeOperation = 'screen'; for (let k = 0; k < 6; k++) { const a = 0.35 + k * 0.14, gr2 = g.createLinearGradient(820, 40, 820 - Math.cos(a) * 700, 40 + Math.sin(a) * 700); gr2.addColorStop(0, Z.sun + '.18)'); gr2.addColorStop(1, Z.sun + '0)'); g.fillStyle = gr2; g.beginPath(); g.moveTo(820, 40); g.lineTo(820 - Math.cos(a - 0.03) * 900, 40 + Math.sin(a - 0.03) * 900); g.lineTo(820 - Math.cos(a + 0.03) * 900, 40 + Math.sin(a + 0.03) * 900); g.closePath(); g.fill(); } g.restore(); }
  { const v = g.createRadialGradient(W / 2, H * 0.55, H * 0.45, W / 2, H * 0.55, VW * 0.7); v.addColorStop(0, 'rgba(30,30,60,0)'); v.addColorStop(1, 'rgba(30,30,60,.22)'); g.fillStyle = v; g.fillRect(L0, 0, VW, H); }
  /* 밤: 푸른 그늘을 덮고 별·달·집 불빛 */
  if (night) { g.save(); g.globalCompositeOperation = 'multiply'; g.fillStyle = '#5a5e9e'; g.fillRect(L0, 0, VW, H); g.fillStyle = 'rgba(90,96,160,.6)'; g.fillRect(L0, 0, VW, H); g.restore();
    g.save(); g.beginPath(); g.rect(L0, 0, VW, 200); g.clip(); for (let k = 0; k < 120; k++) { g.fillStyle = `rgba(255,255,230,${0.3 + R() * 0.6})`; g.beginPath(); g.arc(L0 + R() * VW, R() * 170, 0.6 + R() * 1.1, 0, TAU); g.fill(); } g.restore();
    { const mg = g.createRadialGradient(800, 70, 4, 800, 70, 90); mg.addColorStop(0, 'rgba(255,250,220,.6)'); mg.addColorStop(1, 'rgba(255,250,220,0)'); g.fillStyle = mg; g.fillRect(700, -30, 200, 200); g.fillStyle = '#fff6d0'; g.beginPath(); g.arc(800, 70, 24, 0, TAU); g.fill(); g.fillStyle = 'rgba(220,210,170,.5)'; [[792, 64, 4], [806, 78, 3], [809, 62, 2.4]].forEach(([a, b, r]) => { g.beginPath(); g.arc(a, b, r, 0, TAU); g.fill(); }); }
    for (let k = 0; k < 13; k++) { const x = L0 + 40 + ((k * 151) % (VW - 60)), y = 238 - Math.abs(Math.sin(x * 0.006 + 5)) * 22 + (k % 2) * 4, w = 24 + (k % 3) * 6, h = 16 + (k % 2) * 5; g.save(); g.shadowColor = 'rgba(255,210,110,1)'; g.shadowBlur = 8; g.fillStyle = '#ffdf8a'; g.fillRect(x - w / 2 + 3, y - h + 4, 5, 5); if (w > 28) g.fillRect(x + w / 2 - 8, y - h + 4, 5, 5); g.restore(); } }
  VILBG[key] = c; return c; }
function vilBldSprite(i, night) { const key = i + (night ? 'n' : 'd'); if (VILB[key]) return VILB[key]; const c = document.createElement('canvas'); c.width = 180; c.height = 170; const g = c.getContext('2d'); g.translate(90, 150); const wins = [];
  const ol = (w) => { g.lineWidth = w || 2.5; g.strokeStyle = '#4a2a14'; g.lineJoin = 'round'; g.stroke(); };
  const lin = (a, b, y0, y1) => { const q = g.createLinearGradient(0, y0, 0, y1); q.addColorStop(0, a); q.addColorStop(1, b); return q; };
  const L = ART.LI, D = ART.DK, b = VILLAGE[i], col = b.c;
  const wall = (x, y, w, h, c1) => { g.beginPath(); g.rect(x, y, w, h); g.fillStyle = lin(c1 || '#fff4e0', D(c1 || '#fff4e0', 0.12), y, y + h); g.fill(); ol(); };
  const roof = (x, y, w, h, c1, over) => { over = over == null ? 10 : over; g.beginPath(); g.moveTo(x - over, y); g.lineTo(x + w / 2, y - h); g.lineTo(x + w + over, y); g.closePath(); g.fillStyle = lin(L(c1, 0.15), D(c1, 0.25), y - h, y); g.fill(); ol(); g.save(); g.clip(); g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 2; for (let yy = y - h + 8; yy < y; yy += 8) { g.beginPath(); g.moveTo(x - over, yy); g.lineTo(x + w + over, yy); g.stroke(); } g.restore(); };
  const win = (x, y, w, h, round) => { wins.push([x, y, w, h, round]); g.beginPath(); if (round) g.arc(x + w / 2, y + h / 2, w / 2, 0, Math.PI * 2); else g.rect(x, y, w, h); g.fillStyle = lin('#bfe6ff', '#6aaee8', y, y + h); g.fill(); ol(2); if (!round) { g.beginPath(); g.moveTo(x + w / 2, y); g.lineTo(x + w / 2, y + h); g.moveTo(x, y + h / 2); g.lineTo(x + w, y + h / 2); g.lineWidth = 1.5; g.strokeStyle = '#fff'; g.stroke(); } };
  const door = (x, y, w, h, c1) => { g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y + w / 2); g.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); g.lineTo(x + w, y + h); g.closePath(); g.fillStyle = lin(c1 || '#a8683a', D(c1 || '#a8683a', 0.3), y, y + h); g.fill(); ol(2); g.fillStyle = '#ffd34d'; g.beginPath(); g.arc(x + w - 5, y + h * 0.6, 2, 0, Math.PI * 2); g.fill(); };
  const chimney = (x, y) => { g.beginPath(); g.rect(x, y, 12, 22); g.fillStyle = '#b86a4a'; g.fill(); ol(2); };
  const tree = (x, s) => { g.fillStyle = '#8a5a2a'; g.fillRect(x - 3, -18 * s, 6, 18 * s); g.beginPath(); g.arc(x, -26 * s, 14 * s, 0, Math.PI * 2); g.arc(x - 9 * s, -18 * s, 10 * s, 0, Math.PI * 2); g.arc(x + 9 * s, -18 * s, 10 * s, 0, Math.PI * 2); g.fillStyle = lin('#8ade6a', '#3a9a3a', -40 * s, -8 * s); g.fill(); ol(2); };
  g.fillStyle = 'rgba(40,30,10,.25)'; g.beginPath(); g.ellipse(0, 2, 62, 10, 0, 0, Math.PI * 2); g.fill();
  if (i === 0) { chimney(18, -96); wall(-40, -62, 80, 62, '#fff0dc'); roof(-40, -62, 80, 44, '#e8584a'); win(-30, -48, 18, 16); win(12, -48, 18, 16); door(-10, -36, 20, 36, '#c8784a'); g.save(); g.translate(0, -84); g.fillStyle = '#fff8ea'; g.fillRect(-10, -3, 20, 6); [[-10, -3], [-10, 3], [10, -3], [10, 3]].forEach(([a, q]) => { g.beginPath(); g.arc(a, q, 4, 0, Math.PI * 2); g.fill(); }); g.restore(); g.fillStyle = '#e8423a'; g.fillRect(48, -40, 6, 40); g.beginPath(); g.rect(42, -52, 18, 14); g.fillStyle = '#e8423a'; g.fill(); ol(2); }
  else if (i === 1) { g.beginPath(); g.ellipse(0, -14, 40, 12, 0, 0, Math.PI * 2); g.rect(-40, -26, 80, 26); g.fillStyle = lin('#c8c0b8', '#8a8078', -30, 0); g.fill(); ol(); g.save(); g.strokeStyle = 'rgba(80,70,60,.45)'; g.lineWidth = 1.5; for (let k = -36; k < 40; k += 14) { g.strokeRect(k, -24, 14, 10); g.strokeRect(k + 7, -14, 14, 10); } g.restore(); g.beginPath(); g.ellipse(0, -26, 34, 8, 0, 0, Math.PI * 2); g.fillStyle = '#3a6aa8'; g.fill(); ol(2);
    g.fillStyle = '#8a5a2a'; g.fillRect(-36, -86, 7, 62); g.fillRect(29, -86, 7, 62); roof(-36, -80, 72, 30, b.c, 12); g.strokeStyle = '#6a4a2a'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -80); g.lineTo(0, -48); g.stroke(); g.beginPath(); g.rect(-8, -50, 16, 14); g.fillStyle = '#c8945a'; g.fill(); ol(2); }
  else if (i === 2) { chimney(-30, -100); wall(-46, -66, 92, 66, '#fff0dc'); roof(-46, -66, 92, 36, '#c8784a'); g.save(); for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(-50 + k * 16.6, -44); g.lineTo(-50 + (k + 1) * 16.6, -44); g.lineTo(-50 + (k + 1) * 16.6, -30); g.quadraticCurveTo(-50 + (k + 0.5) * 16.6, -24, -50 + k * 16.6, -30); g.closePath(); g.fillStyle = k % 2 ? '#fff' : '#ff6a6a'; g.fill(); ol(1.5); } g.restore(); win(-38, -22, 26, 18); door(14, -38, 22, 38, '#a8683a');
    g.save(); g.translate(0, -84); g.beginPath(); g.ellipse(0, 0, 22, 12, 0, 0, Math.PI * 2); g.fillStyle = lin('#ffd890', '#d8902a', -12, 12); g.fill(); ol(2); g.strokeStyle = '#a8601a'; g.lineWidth = 2; [-8, 0, 8].forEach(x => { g.beginPath(); g.moveTo(x - 3, -7); g.lineTo(x + 3, 7); g.stroke(); }); g.restore(); }
  else if (i === 3) { g.fillStyle = '#5ab0e8'; g.beginPath(); g.moveTo(-50, 0); g.lineTo(-20, -60); g.lineTo(-8, -60); g.lineTo(-30, 0); g.closePath(); g.fill(); ol(2); g.fillStyle = '#e8584a'; g.fillRect(-12, -64, 6, 64); g.fillRect(-2, -64, 6, 64); for (let y = -56; y < 0; y += 10) g.fillRect(-12, y, 16, 3);
    g.strokeStyle = '#8a5a2a'; g.lineWidth = 5; g.beginPath(); g.moveTo(14, 0); g.lineTo(28, -66); g.lineTo(42, 0); g.moveTo(42, 0); g.lineTo(56, -66); g.lineTo(70, 0); g.moveTo(26, -66); g.lineTo(58, -66); g.stroke(); g.strokeStyle = '#6a4a2a'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(36, -66); g.lineTo(36, -22); g.moveTo(48, -66); g.lineTo(48, -22); g.stroke(); g.beginPath(); g.rect(32, -24, 20, 5); g.fillStyle = '#ffd34d'; g.fill(); ol(1.5); g.beginPath(); g.ellipse(-50, -4, 16, 6, 0, 0, Math.PI * 2); g.fillStyle = '#f0d8a0'; g.fill(); }
  else if (i === 4) { g.beginPath(); g.moveTo(-34, 0); g.lineTo(-34, -50); g.arc(0, -50, 34, Math.PI, 0); g.lineTo(34, 0); g.lineWidth = 7; g.strokeStyle = '#fff'; g.stroke(); g.lineWidth = 3; g.strokeStyle = '#c89a62'; g.stroke(); for (let k = 0; k < 12; k++) { const a = Math.PI + k / 11 * Math.PI; g.fillStyle = ['#ff7a9a', '#ffd34d', '#ff9ed8', '#b89aff'][k % 4]; g.beginPath(); g.arc(Math.cos(a) * 34, -50 + Math.sin(a) * 34, 5, 0, Math.PI * 2); g.fill(); }
    for (let r = 0; r < 2; r++) for (let k = 0; k < 9; k++) { const x = -56 + k * 14, y = -8 + r * 8; g.fillStyle = '#4e9a3a'; g.beginPath(); g.arc(x, y, 7, 0, Math.PI * 2); g.fill(); g.fillStyle = ['#ff5a7a', '#ffd34d', '#ffffff', '#ff9ed8', '#b89aff'][(k + r * 2) % 5]; g.beginPath(); for (let q = 0; q < 5; q++) { const a = q / 5 * Math.PI * 2; g.arc(x + Math.cos(a) * 3, y - 6 + Math.sin(a) * 3, 2.6, 0, Math.PI * 2); } g.fill(); g.fillStyle = '#ffb030'; g.beginPath(); g.arc(x, y - 6, 1.8, 0, Math.PI * 2); g.fill(); } }
  else if (i === 5) { wall(-50, -70, 100, 70, '#f4ecff'); g.beginPath(); g.moveTo(-58, -70); g.lineTo(0, -102); g.lineTo(58, -70); g.closePath(); g.fillStyle = lin('#d8c8ff', '#8a6ad8', -102, -70); g.fill(); ol(); g.fillStyle = '#fff'; [-40, -18, 12, 34].forEach(x => { g.beginPath(); g.rect(x, -64, 8, 64); g.fill(); ol(1.5); }); win(-28, -58, 12, 20); win(18, -58, 12, 20); door(-8, -36, 16, 36, '#6a4ab0'); g.save(); g.translate(0, -84); g.beginPath(); g.moveTo(-14, -8); g.lineTo(0, -4); g.lineTo(14, -8); g.lineTo(14, 8); g.lineTo(0, 12); g.lineTo(-14, 8); g.closePath(); g.fillStyle = '#fff8ea'; g.fill(); ol(2); g.beginPath(); g.moveTo(0, -4); g.lineTo(0, 12); g.stroke(); g.restore(); }
  else if (i === 6) { chimney(22, -100); g.beginPath(); g.rect(-50, -64, 100, 64); g.fillStyle = lin('#b8b0a8', '#7a7068', -64, 0); g.fill(); ol(); g.save(); g.strokeStyle = 'rgba(60,50,40,.4)'; g.lineWidth = 1.5; for (let y = -60; y < 0; y += 12) for (let x = -50 + ((y / 12) % 2 ? 0 : 10); x < 50; x += 20) g.strokeRect(x, y, 20, 12); g.restore(); roof(-50, -64, 100, 30, '#6a5a5a');
    g.beginPath(); g.moveTo(-34, 0); g.lineTo(-34, -30); g.arc(-14, -30, 20, Math.PI, 0); g.lineTo(6, 0); g.closePath(); const fg = g.createRadialGradient(-14, -14, 2, -14, -14, 26); fg.addColorStop(0, '#fff2a0'); fg.addColorStop(0.5, '#ff8a2a'); fg.addColorStop(1, '#a8301a'); g.fillStyle = fg; g.fill(); ol(2);
    g.save(); g.translate(34, -8); g.beginPath(); g.moveTo(-14, -12); g.lineTo(16, -12); g.lineTo(10, -4); g.lineTo(4, -4); g.lineTo(6, 8); g.lineTo(-6, 8); g.lineTo(-4, -4); g.lineTo(-14, -6); g.closePath(); g.fillStyle = '#4a4a5a'; g.fill(); ol(2); g.restore(); }
  else if (i === 7) { g.beginPath(); g.ellipse(0, -14, 62, 22, 0, 0, Math.PI * 2); g.fillStyle = '#c8b8a0'; g.fill(); ol(2); g.beginPath(); g.ellipse(0, -14, 54, 17, 0, 0, Math.PI * 2); g.fillStyle = lin('#8ad0ff', '#3a8ad0', -30, 4); g.fill(); g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.ellipse(-16, -20, 14, 3, 0, 0, Math.PI * 2); g.fill();
    [[-26, -10], [20, -8], [6, -22]].forEach(([x, y]) => { g.fillStyle = '#5aa848'; g.beginPath(); g.arc(x, y, 7, 0.4, Math.PI * 2 - 0.2); g.lineTo(x, y); g.fill(); }); g.fillStyle = '#ff9ed8'; g.beginPath(); g.arc(20, -12, 3.5, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(-56, -4); g.quadraticCurveTo(-30, -40, -4, -4); g.lineWidth = 6; g.strokeStyle = '#c8784a'; g.stroke(); g.lineWidth = 2; g.strokeStyle = '#8a4a2a'; g.beginPath(); g.moveTo(-56, -14); g.quadraticCurveTo(-30, -48, -4, -14); g.stroke(); for (let k = 0; k < 4; k++) { const x = -50 + k * 14; g.beginPath(); g.moveTo(x, -10 - Math.sin((k + 0.5) / 4 * Math.PI) * 24); g.lineTo(x, -4 - Math.sin((k + 0.5) / 4 * Math.PI) * 18); g.stroke(); } tree(48, 1.1); }
  else if (i === 8) { g.beginPath(); g.ellipse(0, -6, 54, 10, 0, 0, Math.PI * 2); g.fillStyle = '#e8d8c0'; g.fill(); ol(2); g.fillStyle = '#fff'; [-44, -20, 20, 44].forEach(x => { g.beginPath(); g.rect(x - 3, -66, 6, 60); g.fill(); ol(1.5); }); g.beginPath(); g.moveTo(-56, -66); g.quadraticCurveTo(0, -120, 56, -66); g.closePath(); g.fillStyle = lin('#ffd090', '#e8842a', -110, -66); g.fill(); ol(); g.fillStyle = '#ffd34d'; g.beginPath(); g.arc(0, -98, 6, 0, Math.PI * 2); g.fill(); ol(2);
    g.save(); g.strokeStyle = '#4a2a14'; g.fillStyle = '#4a2a14'; g.lineWidth = 2.5; [[-14, -36], [10, -44]].forEach(([x, y]) => { g.beginPath(); g.ellipse(x, y, 5, 4, -0.4, 0, Math.PI * 2); g.fill(); g.beginPath(); g.moveTo(x + 4, y); g.lineTo(x + 4, y - 16); g.lineTo(x + 10, y - 12); g.stroke(); }); g.restore(); }
  else if (i === 9) { wall(-30, -78, 60, 78, '#e8e4f4'); g.beginPath(); g.arc(0, -78, 34, Math.PI, 0); g.closePath(); g.fillStyle = lin('#b8b0f0', '#5a4ab0', -112, -78); g.fill(); ol(); g.save(); g.translate(8, -96); g.rotate(-0.6); g.beginPath(); g.rect(-6, -26, 12, 34); g.fillStyle = '#4a4a6a'; g.fill(); ol(2); g.restore(); g.fillStyle = '#ffe08a'; [[-20, -100], [22, -88], [-6, -112]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 2, 0, Math.PI * 2); g.fill(); }); win(-10, -62, 20, 20, true); door(-8, -32, 16, 32, '#5a4ab0'); }
  else if (i === 10) { g.beginPath(); g.rect(-58, -22, 116, 22); g.fillStyle = lin('#c8945a', '#8a5a2a', -22, 0); g.fill(); ol(); g.fillStyle = '#8a5a2a'; g.fillRect(-56, -96, 8, 76); g.fillRect(48, -96, 8, 76); g.beginPath(); g.rect(-58, -104, 116, 14); g.fillStyle = '#e8423a'; g.fill(); ol(2);
    g.beginPath(); g.moveTo(-48, -90); g.quadraticCurveTo(-30, -60, -40, -22); g.lineTo(-48, -22); g.closePath(); g.moveTo(48, -90); g.quadraticCurveTo(30, -60, 40, -22); g.lineTo(48, -22); g.closePath(); g.fillStyle = '#c8284a'; g.fill(); ol(1.5);
    for (let k = 0; k < 8; k++) { const x = -52 + k * 14; g.beginPath(); g.moveTo(x, -90); g.lineTo(x + 14, -90); g.lineTo(x + 7, -78); g.closePath(); g.fillStyle = ['#ffd34d', '#5ab0e8', '#9ae08a', '#ff9ed8'][k % 4]; g.fill(); } g.fillStyle = '#ffd34d'; g.beginPath(); for (let q = 0; q < 10; q++) { const a = q * Math.PI / 5 - Math.PI / 2, r = q % 2 ? 6 : 13; g.lineTo(Math.cos(a) * r, -52 + Math.sin(a) * r); } g.closePath(); g.fill(); ol(2); }
  else if (i === 11) { g.beginPath(); g.rect(-20, -112, 40, 112); g.fillStyle = lin('#fff8e0', '#e8d0a0', -112, 0); g.fill(); ol(); roof(-20, -112, 40, 26, '#ffd34d', 6); win(-8, -96, 16, 18); win(-8, -60, 16, 18); door(-8, -28, 16, 28);
    ['#ff5a5a', '#ffa03a', '#ffe03a', '#5ad06a', '#3ab0ff', '#8a6aff'].forEach((rc, k) => { g.beginPath(); g.arc(-48, 0, 62 - k * 5, Math.PI * 1.02, Math.PI * 1.5); g.lineWidth = 5; g.strokeStyle = rc; g.stroke(); g.beginPath(); g.arc(48, 0, 62 - k * 5, Math.PI * 1.5, Math.PI * 1.98); g.stroke(); }); }
  else if (i === 12) { g.beginPath(); g.moveTo(-60, 0); g.quadraticCurveTo(-56, -44, -20, -50); g.quadraticCurveTo(0, -74, 24, -50); g.quadraticCurveTo(60, -44, 60, 0); g.closePath(); g.fillStyle = lin('#b8a088', '#6a5848', -70, 0); g.fill(); ol(); g.beginPath(); g.ellipse(0, -30, 38, 14, 0, 0, Math.PI * 2); g.fillStyle = '#c89a5a'; g.fill(); ol(2); g.save(); g.strokeStyle = '#8a6a3a'; g.lineWidth = 2; for (let k = 0; k < 9; k++) { g.beginPath(); g.moveTo(-36 + k * 9, -36); g.lineTo(-30 + k * 9, -24); g.stroke(); } g.restore();
    g.beginPath(); g.ellipse(0, -46, 15, 19, 0, 0, Math.PI * 2); g.fillStyle = lin('#fff0c8', '#ff9a5a', -64, -28); g.fill(); ol(2); g.fillStyle = '#e8584a'; [[-6, -54], [6, -44], [-4, -36]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 3, 0, Math.PI * 2); g.fill(); }); }
  else if (i === 13) { wall(-44, -76, 88, 76, '#fffaf0'); g.beginPath(); g.moveTo(-52, -76); g.lineTo(0, -104); g.lineTo(52, -76); g.closePath(); g.fillStyle = lin('#8ab0e8', '#3a5aa8', -104, -76); g.fill(); ol(); g.beginPath(); g.rect(-12, -136, 24, 40); g.fillStyle = '#fffaf0'; g.fill(); ol(2); g.beginPath(); g.moveTo(-16, -136); g.lineTo(0, -160); g.lineTo(16, -136); g.closePath(); g.fillStyle = '#3a5aa8'; g.fill(); ol(2);
    g.strokeStyle = '#ffd34d'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, -168); g.lineTo(0, -156); g.moveTo(-5, -164); g.lineTo(5, -164); g.stroke(); win(-12, -70, 24, 24, true); g.save(); g.translate(0, -58); ['#ff7a7a', '#ffd34d', '#7ac8ff', '#9ae08a'].forEach((rc, k) => { g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 11, k * Math.PI / 2, (k + 1) * Math.PI / 2); g.fillStyle = rc; g.globalAlpha = 0.7; g.fill(); }); g.restore(); door(-10, -36, 20, 36, '#8a5a2a'); win(-36, -50, 12, 22); win(24, -50, 12, 22); }
  if (night) { g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(20,24,70,.38)'; g.fillRect(-90, -150, 180, 170); g.globalCompositeOperation = 'source-over'; for (const [x, y, w, h, r] of wins) { const gl = g.createRadialGradient(x + w / 2, y + h / 2, 1, x + w / 2, y + h / 2, w * 1.4); gl.addColorStop(0, 'rgba(255,220,120,.6)'); gl.addColorStop(1, 'rgba(255,220,120,0)'); g.fillStyle = gl; g.fillRect(x - w, y - h, w * 3, h * 3); g.beginPath(); if (r) g.arc(x + w / 2, y + h / 2, w / 2, 0, Math.PI * 2); else g.rect(x, y, w, h); g.fillStyle = '#ffe27a'; g.fill(); } }
  VILB[key] = c; return c; }
function vilTap(i) {
  const b = VILLAGE[i], P = VILP; if (P.move) { if (P.move.from == null) { P.move.from = i; SFX.click(); } else { const pos = vilPos(), a = P.move.from; [pos[a], pos[i]] = [pos[i], pos[a]]; P.move.from = null; save(); SFX.pick(); } return; }
  P.sel = i; SFX.click(); const c = VILP.bounce = { i, t: 0.4 };
}
function vilDaily(i) {
  const b = VILLAGE[i], today = todayKey(); if (!S.vilDay || S.vilDay.d !== today) S.vilDay = { d: today, got: {} }; if (S.vilDay.got[i]) return;
  const fm = (s) => { floatMsg = { s, x: W / 2, y: 420, t: 2 }; };
  if (b.tap === 'mail') { const amt = VILLAGE.filter((q, k) => vilOn(k)).length * vilV(0); S.coins += amt; SFX.coin(); fm(`마을 우편함에서 코인 ${amt}!`); S.vilMail = today; }
  else if (b.tap === 'bread') { S.items = S.items || {}; S.items.lunch = Math.min(20, invN('lunch') + vilV(2)); SFX.pick(); fm(`갓 구운 「간식 도시락」 ${vilV(2)}개! (상점 가방에서 챙기기)`); }
  else if (b.tap === 'flower') { S.coins += vilV(4); SFX.coin(); fm(`예쁜 꽃다발을 팔았어요! 코인 ${vilV(4)}`); }
  else if (b.tap === 'fish') { if (Math.random() < 0.5) { S.items = S.items || {}; S.items.manacandy = Math.min(20, invN('manacandy') + 1); fm('낚싯대에 「마나 별사탕」이 걸렸어요!'); SFX.pick(); } else { S.coins += vilV(7); SFX.coin(); fm(`반짝이는 물고기 → 코인 ${vilV(7)}!`); } }
  else if (b.tap === 'star') { if (!weatherNow().night) { fm('별똥별은 밤(19~6시)에만 떨어져요'); return; } S.dust = (S.dust || 0) + vilV(9); SFX.rare(); fm(`별똥별을 주웠어요! 별가루 +${vilV(9)}`); }
  else if (b.tap === 'egg') { S.coins += vilV(12) * 300; SFX.rare(); fm(`따끈한 용알 껍질에서 코인 +${vilV(12) * 300}!`); }
  S.vilDay.got[i] = 1; save();
}
const vilGot = i => S.vilDay && S.vilDay.d === todayKey() && S.vilDay.got[i] || (i === 0 && S.vilMail === todayKey());
const roadY = (x, lane) => 462 + lane * 11 - (x - 70) / 820 * 8;
const PET_ACT = { 2: '냠', 4: '♥', 7: '첨벙', 8: '♪', 9: '✦' };
function vilActUpd(P, pos, dt, night) {
  if (!P.acts) { P.acts = []; UNITS.forEach((u, i) => { if (unitUnlocked(i)) { const x = 80 + Math.random() * 800, lane = P.acts.length % 3; P.acts.push({ k: 'dog', i, x, y: roadY(x, lane), lane, path: [], mode: 'idle', t: Math.random() * 3, sp: 24 + Math.random() * 8, flip: Math.random() < 0.5, key: 'vl' + i }); } });
    Object.keys(S.pets || {}).forEach((id, n) => { if (!PETS.find(p => p.id === id)) return; const x = 100 + Math.random() * 760; P.acts.push({ k: 'pet', id, x, y: roadY(x, 2) + 14, lane: 2, py: 14, path: [], mode: 'idle', t: Math.random() * 3, sp: 18 + Math.random() * 6, flip: false, key: 'vp' + n }); });  P.acts.push({ k: 'hero', x: 470, y: roadY(470, 1) + 8, lane: 1, py: 8, path: [], mode: 'idle', t: 1.5, sp: 20, flip: false, key: 'vhero' }); /* v4.3 내 기사도 마을을 산책 (칭호 리본을 머리 위에) */ }
  const built = VILLAGE.map((q, b) => b).filter(b => vilOn(b));
  const dogsA = P.acts.filter(a => a.k === 'dog');
  /* v3.3 기사끼리 만나면 인사 (멈춰서 마주 보고 꼬리 흔들기 + 하트) */
  for (let p = 0; p < dogsA.length; p++) for (let q = p + 1; q < dogsA.length; q++) { const a = dogsA[p], b = dogsA[q]; if (P.cele || a.mode === 'act' || b.mode === 'act' || a.mode === 'greet' || b.mode === 'greet' || a.mode === 'tag' || b.mode === 'tag' || a.mode === 'wag' || b.mode === 'wag' || a.mode === 'ffly' || b.mode === 'ffly' || a.mode === 'duo' || b.mode === 'duo' || (a.gcd || 0) > 0 || (b.gcd || 0) > 0 || a.bk || b.bk) continue; if (Math.abs(a.x - b.x) < 30 && Math.abs(a.y - b.y) < 16) { for (const [m, o] of [[a, b], [b, a]]) { m.gpath = m.path; m.gmode = m.mode; m.path = []; m.mode = 'greet'; m.t = 2.2; m.flip = o.x < m.x; m.gcd = 14 + Math.random() * 8; } } }
  for (const a of P.acts) {
    const ry = x => roadY(x, a.lane) + (a.py || 0); if (a.gcd > 0) a.gcd -= dt;
    if (a.mode === 'greet') { a.t -= dt; a.moving = false; if (a.t <= 0) { a.mode = a.gmode === 'act' ? 'idle' : a.gmode || 'idle'; a.path = a.gpath || []; a.t = 0.5; } continue; }
    /* v3.7 하트 5개 이상 기사: 제자리 꼬리 흔들기(wag) · 다른 기사 졸졸 따라다니기(tag) — 따라갈 때도 자기 걸음 빠르기 그대로 */
    if (a.mode === 'wag') { a.t -= dt; a.moving = false; if (a.t <= 0) { a.mode = 'idle'; a.t = 0.6; } continue; }
    /* v3.8 밤: 하트 기사가 반딧불을 졸졸 (반딧불은 천천히 날고, 기사는 자기 걸음 빠르기로 따라감) */
    if (a.mode === 'ffly') { const f = a.ff; a.t -= dt; f.ph += dt; f.x += f.dir * 14 * dt; if (f.x < 60 || f.x > 900) f.dir *= -1; if (a.t <= 0 || !night || P.play || P.cele) { a.mode = 'idle'; a.t = 1; a.ff = null; a.path = [[a.x, ry(a.x)]]; continue; } const tx = f.x - f.dir * 18, ty = ry(tx), dx = tx - a.x, dy = ty - a.y, dd = Math.hypot(dx, dy), sp = Math.min(dd, a.sp * dt); if (!a.tgo && dd > 14) a.tgo = 1; else if (a.tgo && dd < 3) a.tgo = 0; if (a.tgo) { a.x += dx / dd * sp; a.y += dy / dd * sp; if (Math.abs(dx) > 1) a.flip = dx < 0; a.moving = true; } else { a.moving = false; a.flip = f.dir < 0; } continue; }
    if (a.mode === 'tag') { const d0 = a.fo; a.t -= dt; if (!d0 || a.t <= 0 || d0.bk || d0.mode === 'hidden' || d0.mode === 'hidego' || P.cele || P.play) { a.mode = 'idle'; a.t = 1; a.fo = null; a.path = [[a.x, ry(a.x)]]; continue; } const tx = d0.x + (d0.flip ? 40 : -40), ty = d0.y + 2, dx = tx - a.x, dy = ty - a.y, dd = Math.hypot(dx, dy), sp = Math.min(dd, a.sp * dt); if (!a.tgo && dd > 14) a.tgo = 1; else if (a.tgo && dd < 3) a.tgo = 0; /* v4.0 떨림: 출발 14px · 멈춤 3px */ if (a.tgo) { a.x += dx / dd * sp; a.y += dy / dd * sp; if (Math.abs(dx) > 1) a.flip = dx < 0; a.moving = true; } else { a.moving = false; a.flip = d0.flip; if (a.bw && d0.bw && !d0.moving && !d0.path.length) { a.bw = d0.bw = 0; { const d = new Date(); S.album = S.album || []; S.album.unshift({ p: a.i, q: d0.i, m: d.getMonth() + 1, d: d.getDate(), sea: vilSeason() }); S.album.length = Math.min(12, S.album.length); save(); } /* v4.4 짝꿍 앨범에 사진 한 장 */ [a, d0].forEach((m, q) => { m.mode = 'duo'; m.duo = 'flower'; m.t = 3.6; m.path = []; m.fo = q ? a : d0; m.dq = q; }); continue; } if (d0.k === 'dog' && buddyOf(a.i) === d0.i && !d0.moving && (d0.mode === 'idle' || d0.mode === 'wag' || d0.mode === 'act') && Math.random() < 1.2 * dt) { const ty = Math.random() < 0.5 ? 'sit' : 'bark'; [a, d0].forEach((m, q) => { m.mode = 'duo'; m.duo = ty; m.t = 3.4; m.path = []; m.fo = q ? a : d0; m.dq = q; }); } } continue; }
    /* v3.9 짝꿍끼리: 나란히 앉기(sit) · 번갈아 「멍!」 짖기(bark) — 제자리에서만 */
    if (a.mode === 'duo') { a.t -= dt; a.moving = false; if (a.fo) a.flip = a.fo.x < a.x; if (a.t <= 0 || P.cele || P.play) { a.mode = 'idle'; a.t = 0.8; a.duo = null; a.fo = null; } continue; }
    /* v3.3 펫이 기사 옆에 붙어 함께 걷기 (같은 속도 · 순간이동 없음) */
    if (a.k === 'pet' && a.mode === 'follow') { const d0 = dogsA[a.fi]; a.t -= dt; if (!d0 || a.t <= 0 || d0.bk) { a.mode = 'idle'; a.t = 1; a.path = [[a.x, ry(a.x)]]; continue; } const tx = d0.x + (d0.flip ? 22 : -22), ty = d0.y + 10, dx = tx - a.x, dy = ty - a.y, dd = Math.hypot(dx, dy), sp = Math.min(dd, 34 * dt); if (dd > 2) { a.x += dx / dd * sp; a.y += dy / dd * sp; a.flip = dx < 0; a.moving = true; } else { a.moving = d0.moving; a.flip = d0.flip; } continue; }
    if (a.k === 'pet' && !a.path.length && a.mode === 'idle' && !(a.greetT > 0) && !(a.playT > 0) && Math.random() < 0.05 * dt) { const ot = P.acts.filter(o => o !== a && o.k === 'pet' && !(o.playT > 0) && !o.path.length); if (ot.length) { const o = ot[Math.floor(Math.random() * ot.length)], tx = Math.max(40, Math.min(920, o.x + (a.x < o.x ? -26 : 26))); a.mode = 'walk'; a.path = [[tx, ry(tx)]]; a.playGo = o; } } /* v5.0 펫끼리 놀기 */
    if (a.k === 'pet' && a.playGo && !a.path.length) { const o = a.playGo; a.playGo = null; a.playT = o.playT = 2.8; a.mate = o; o.mate = null; /* v5.1 공 주고받기 */ a.flip = o.x < a.x; o.flip = !a.flip; o.mode = 'idle'; o.path = []; }
    if (a.k === 'pet' && a.playT > 0) a.playT -= dt;
    if (a.k === 'pet' && P.gpos && guestToday() && !a.path.length && (a.mode === 'idle' || a.mode === 'walk') && !(a.greetT > 0) && Math.random() < 0.08 * dt) { const g0 = P.gpos, tx = Math.max(40, Math.min(920, g0.x + (a.x < g0.x ? -34 : 34))); a.mode = 'walk'; a.path = [[tx, ry(tx)]]; a.greet = 1; } /* v4.9 펫이 손님에게 가서 인사 */
    if (a.k === 'pet' && a.greet && !a.path.length && P.gpos) { a.greet = 0; a.greetT = 2.6; a.flip = P.gpos.x < a.x; }
    if (a.k === 'pet' && a.greetT > 0) { a.greetT -= dt; if (a.greetT <= 0) a.greetT = -30; }
    if (a.k === 'pet' && a.greetT < 0) a.greetT = Math.min(0, a.greetT + dt);
    if (a.k === 'pet' && !a.path.length && (a.mode === 'idle' || a.mode === 'walk') && dogsA.length && Math.random() < 0.25 * dt) { a.mode = 'follow'; a.fi = Math.floor(Math.random() * dogsA.length); a.t = 12 + Math.random() * 10; continue; }
    if (P.cele && a.k === 'dog' && a.mode !== 'cele') { const n = P.acts.indexOf(a), ang = (n % 8) / 8 * Math.PI; if (P.cele.i == null) { const tx = P.cele.x + Math.cos(ang) * 120, ty = ry(tx) + 6 - Math.sin(ang) * 10; a.path = [[tx, ty]]; a.bi = null; } else { const pl = VPLOT[pos[P.cele.i]]; a.path = [[pl.x + Math.cos(ang) * 64, pl.y + 30 + Math.sin(ang) * 14]]; if (pl.y < 300) a.path.unshift([a.x, ry(a.x)], [pl.x + Math.cos(ang) * 64, ry(pl.x)]); a.bi = P.cele.i; } a.mode = 'cele'; a.fo = null; } /* v3.8 미니 놀이를 다 하면 행사 앞에 모여 박수 (P.cele.i 없음) */
    if (!P.cele && a.mode === 'cele') { a.mode = 'back'; a.path = [[a.x, ry(a.x)]]; }
    if (a.path.length) { const [tx, ty] = a.path[0], dx = tx - a.x, dy = ty - a.y, d = Math.hypot(dx, dy), sp = a.sp * (a.mode === 'cele' ? 1.6 : a.mode === 'fetch' || a.mode === 'bring' || a.mode === 'hidego' ? 1.35 : 1) * dt; /* 놀이 중엔 늘 같은 빠르기로 조금 빠르게 */ /* 한 걸음씩: 늘 같은 속도 */
      if (Math.abs(dx) > 0.5) a.flip = dx < 0; if (d <= sp) { a.x = tx; a.y = ty; a.path.shift(); } else { a.x += dx / d * sp; a.y += dy / d * sp; } a.moving = true; continue; }
    a.moving = false; if (a.mode === 'back' || a.mode === 'walk' || a.mode === 'idle') a.bk = false;
    if (a.mode === 'hidego') { a.mode = 'hidden'; if (VILP.play) VILP.play.stage = 'seek'; floatMsg = { s: '꼭꼭 숨었어요! 어디 숨었을까? 찾아보세요', x: W / 2, y: 110, t: 2.4 }; continue; }
    if (a.mode === 'hidden') continue;
    if (a.mode === 'fetch') { a.mode = 'bring'; P.play.ball = 'carry'; a.path = [[P.play.hx, P.play.hy]]; SFX.pick(); continue; }
    if (a.mode === 'bring') { a.mode = 'idle'; a.t = 2; vilPlayDone(a); continue; }
    if (a.mode === 'wait') continue;
    if (a.mode === 'go') { a.mode = 'act'; a.t = 6 + Math.random() * 5; const pl = VPLOT[pos[a.bi]]; a.flip = pl.x < a.x; continue; }
    if (a.mode === 'cele') { const pl = a.bi != null ? VPLOT[pos[a.bi]] : (P.cele || { x: W / 2 }); a.flip = pl.x < a.x; continue; }
    if (a.mode === 'act') { a.t -= dt; if (a.t <= 0) { const pl = VPLOT[pos[a.bi]]; a.mode = 'back'; a.path = pl.y < 300 ? [[pl.x, pl.y + 40], [pl.x, 404], [pl.x, ry(pl.x)]] : [[a.x, ry(a.x)]]; } continue; }
    if (a.mode === 'bwalk') { a.mode = 'idle'; a.t = 6; continue; } /* v4.3 짝꿍 산책 앞 친구: 다 걸으면 잠깐 서서 기다림 */
    if (a.mode === 'idle') { a.t -= dt; if (a.t > 0) continue; }
    /* 다음 할 일 고르기: 건물 찾아가기(45%) · 길 따라 걷기 · 잠깐 쉬기 */
    if (a.k === 'dog' && joyOf(a.i) >= 5 && !P.play && !P.cele) { const rr = Math.random(); if (night && rr < 0.3) { a.mode = 'ffly'; a.t = 9 + Math.random() * 5; const fx0 = Math.max(60, Math.min(900, a.x + (Math.random() < 0.5 ? -1 : 1) * 60)); a.ff = { x: fx0, ph: Math.random() * 6, dir: Math.random() < 0.5 ? -1 : 1 }; continue; } if (rr < 0.2) { a.mode = 'wag'; a.t = 2.4; continue; } if (rr < 0.38) { const oth = dogsA.filter(o => o !== a && !o.bk && o.mode !== 'tag' && o.mode !== 'hidden'); if (oth.length) { const bd = buddyOf(a.i), pb = oth.find(o => o.i === bd); a.mode = 'tag'; a.fo = pb && Math.random() < 0.6 ? pb : oth[Math.floor(Math.random() * oth.length)]; a.t = 10 + Math.random() * 6; S.tagN = S.tagN || {}; const kk = Math.min(a.i, a.fo.i) + '-' + Math.max(a.i, a.fo.i); S.tagN[kk] = (S.tagN[kk] || 0) + 1; if (S.tagN[kk] === 3 && buddyOf(a.i) === a.fo.i && !(S.buddyCele || {})[kk] && !P.cele) { S.buddyCele = S.buddyCele || {}; S.buddyCele[kk] = 1; P.cele = { x: a.x, y: a.y + 40, t: 5, lab: `${UNITS[a.i].nick} ♥ ${UNITS[a.fo.i].nick} 짝꿍 탄생!` }; SFX.rare && SFX.rare(); save(); } /* v4.0 짝꿍이 생기면 한 번 축하 */ continue; } } }
    if (a.k === 'hero') { if (Math.random() < 0.7) { const tx = Math.max(60, Math.min(900, a.x + (Math.random() - 0.5) * 420)); a.mode = 'walk'; a.path = [[tx, ry(tx)]]; } else { a.mode = 'idle'; a.t = 1.5 + Math.random() * 2.5; } continue; } /* v4.3 내 기사는 길만 따라 걷기 */
    const r = Math.random(), pref = a.k === 'pet' ? PET_BLD[a.id] : null;
    if (built.length && r < 0.45) { const bi = pref != null && vilOn(pref) && Math.random() < 0.7 ? pref : built[Math.floor(Math.random() * built.length)], pl = VPLOT[pos[bi]], side = Math.random() < 0.5 ? -1 : 1, bx = pl.x + side * (a.k === 'pet' ? 22 : 34);
      a.bi = bi; a.mode = 'go'; a.bk = pl.y < 300; a.path = a.bk ? [[pl.x, ry(pl.x)], [pl.x, 404], [pl.x, pl.y + 40], [pl.x + side * 22, pl.y + 36]] : [[bx, ry(bx)], [bx, pl.y + 38]]; } /* 뒷줄 건물: 앞줄 건물 사이 틈으로 뒤로 돌아감 */
    else if (r < 0.8) { const tx = Math.max(60, Math.min(900, a.x + (Math.random() - 0.5) * 500)); a.mode = 'walk'; a.path = [[tx, ry(tx)]]; }
    else { a.mode = 'idle'; a.t = 1 + Math.random() * 2.5; }
  }
}
/* v3.6 계절 행사 (마을 아래 가운데 · 하루 한 번 누르면 선물): 봄 꽃놀이 · 여름 물놀이 · 가을 수확 · 겨울 눈사람 */
const VIL_EV = { spring: { n: '봄 꽃놀이', d: '돗자리에서 꽃구경!', r: '코인 120' }, summer: { n: '여름 물놀이', d: '첨벙첨벙 물놀이!', r: '마나 별사탕 1' }, autumn: { n: '가을 수확', d: '호박·사과 수확!', r: '간식 도시락 1' }, winter: { n: '겨울 눈사람', d: '다 같이 만든 눈사람!', r: '별가루 1' } };
function vilEvent(P) { const sea = vilSeason(), E0 = VIL_EV[sea], x = W / 2, y = 500, got = S.vilEv === todayKey(), t = G.time;
  ctx.save(); ctx.fillStyle = 'rgba(30,15,0,.18)'; ART.E(ctx, x, y + 4, 70, 9); ctx.fill();
  if (sea === 'spring') { ctx.save(); ctx.translate(x, y - 6); ctx.fillStyle = '#ff9ab8'; ctx.fillRect(-56, -10, 112, 18); ctx.fillStyle = '#fff'; for (let q = -56; q < 56; q += 14) ctx.fillRect(q, -10, 7, 18); ctx.restore(); ctx.fillStyle = '#8a5a2a'; ctx.fillRect(x + 50, y - 64, 6, 54); ctx.fillStyle = '#ffc0d8'; [[0, -76, 22], [-16, -66, 16], [16, -64, 17], [4, -90, 14]].forEach(([a, b, r]) => { ctx.beginPath(); ctx.arc(x + 53 + a, y + b, r, 0, TAU); ctx.fill(); }); ctx.fillStyle = '#e8a040'; ART.E(ctx, x - 20, y - 14, 12, 7); ctx.fill(); }
  else if (sea === 'summer') { ART.E(ctx, x, y - 8, 60, 16); ctx.fillStyle = '#ff7a9a'; ctx.fill(); ART.E(ctx, x, y - 10, 52, 12); ctx.fillStyle = '#7ad0ff'; ctx.fill(); for (let q = 0; q < 3; q++) { const ph = (t * 1.2 + q / 3) % 1; ctx.save(); ctx.globalAlpha = 1 - ph; ART.E(ctx, x - 20 + q * 20, y - 10, 6 + ph * 14, 2 + ph * 4); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore(); } ctx.fillStyle = '#ffd34d'; ART.E(ctx, x + 28, y - 14 + Math.sin(t * 2) * 2, 8, 5); ctx.fill(); }
  else if (sea === 'autumn') { [[-40, '#ff8a2a', 12], [-14, '#f4a030', 15], [36, '#ff8a2a', 11]].forEach(([dx, c, r]) => { ART.E(ctx, x + dx, y - r, r * 1.2, r); ctx.fillStyle = c; ctx.fill(); ctx.strokeStyle = 'rgba(160,70,10,.6)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x + dx, y - r * 2); ctx.lineTo(x + dx, y); ctx.stroke(); ctx.fillStyle = '#4e8a2a'; ctx.fillRect(x + dx - 1.5, y - r * 2 - 5, 3, 6); }); RR(x + 6, y - 22, 26, 20, 4); ctx.fillStyle = '#b07a3a'; ctx.fill(); ctx.fillStyle = '#e8323a'; [[12, -26], [20, -28], [27, -25]].forEach(([a, b]) => { ctx.beginPath(); ctx.arc(x + a, y + b, 4.5, 0, TAU); ctx.fill(); }); }
  else { ctx.fillStyle = '#ffffff'; [[0, -16, 18], [0, -44, 13]].forEach(([a, b, r]) => { ctx.beginPath(); ctx.arc(x + a, y + b, r, 0, TAU); ctx.fill(); ctx.strokeStyle = '#c8d8ec'; ctx.lineWidth = 1.5; ctx.stroke(); }); ctx.fillStyle = '#2a2a3a'; [[-4, -47], [4, -47], [0, -20], [0, -12]].forEach(([a, b]) => { ctx.beginPath(); ctx.arc(x + a, y + b, 1.8, 0, TAU); ctx.fill(); }); ctx.fillStyle = '#ff8a2a'; ctx.beginPath(); ctx.moveTo(x, y - 43); ctx.lineTo(x + 10, y - 41); ctx.lineTo(x, y - 39); ctx.fill(); ctx.fillStyle = '#e8323a'; ctx.fillRect(x - 12, y - 34, 24, 5); ctx.fillRect(x + 6, y - 34, 5, 12); ctx.fillStyle = '#4a4a5a'; ctx.fillRect(x - 9, y - 62, 18, 6); ctx.fillRect(x - 6, y - 74, 12, 12); }
  ctx.restore(); RR(x - 70, y + 2, 140, 22, 11); ctx.fillStyle = 'rgba(255,250,236,.94)'; ctx.fill(); txt(`🎉 ${E0.n}`, x, y + 13, 13, '#3a2210', 'center', false, null, 130);
  if (!got) { const by = y + 6 - Math.abs(Math.sin(t * 3)) * 3; ctx.beginPath(); ctx.arc(x + 66, by, 10, 0, TAU); ctx.fillStyle = '#ff5a3a'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke(); txt('!', x + 66, by + 1, 13, '#fff', 'center', false); }
  uiPush({ x: x - 70, y: y - 90, w: 140, h: 116, key: 'vev', tap: () => { if (!P.play && !P.move) vilMiniOpen(); } }); } /* v3.7 누르면 계절 미니 놀이 → 다 하면 선물 */
function vilEvGift() { const sea = vilSeason(), E0 = VIL_EV[sea]; if (S.vilEv === todayKey()) return false; S.vilEv = todayKey(); S.items = S.items || {};
  if (sea === 'spring') S.coins += 120; else if (sea === 'summer') S.items.manacandy = Math.min(20, invN('manacandy') + 1); else if (sea === 'autumn') S.items.lunch = Math.min(20, invN('lunch') + 1); else S.dust = (S.dust || 0) + 1;
  SFX.coin(); floatMsg = { s: `🎉 ${E0.n} — ${E0.d} ${E0.r}!`, x: W / 2, y: 110, t: 2.6 }; save(); return true; }
/* v3.7 계절 미니 놀이: 화면의 물건을 하나씩 누르기만 하면 됨 (움직이는 과녁·시간 제한·박자 없음) */
const VIL_MINI = { spring: { t: '벚꽃 송이를 모두 눌러 꽃잎을 날려요', n: 6, bg: '#fde6ee' }, summer: { t: '물 위 고무 오리를 모두 눌러 양동이에 모아요', n: 5, bg: '#dff3ff' }, autumn: { t: '사과와 호박을 모두 눌러 바구니에 담아요', n: 6, bg: '#fbe9cf' }, winter: { t: '눈덩이를 모두 눌러 눈사람을 완성해요', n: 5, bg: '#eef5ff' } };
const MINI_POS = { spring: [[-150, -40], [-80, -78], [0, -60], [80, -82], [150, -36], [40, -20]], summer: [[-150, 30], [-70, 50], [10, 28], [-110, 74], [-20, 82]], autumn: [[-180, 64], [-110, 40], [-40, 70], [30, 44], [-150, -40], [-60, -56]], winter: [[-190, 70], [-120, 40], [-40, 74], [-170, 0], [-70, 4]] };
/* v3.9 미니 놀이 2번째 종류 (열 때마다 번갈아): 봄 나비 · 여름 조개 · 가을 도토리 · 겨울 눈꽃 — 모두 유리병에 모으기, 탭만 */
const VIL_MINI2 = { spring: { t: '꽃 위에 앉은 나비를 모두 눌러 유리병에 모아요', n: 5 }, summer: { t: '모래 위 조개껍데기를 모두 주워 병에 담아요', n: 6 }, autumn: { t: '떨어진 도토리를 모두 주워 병에 담아요', n: 6 }, winter: { t: '반짝이는 눈꽃을 모두 모아 병에 담아요', n: 6 } };
const MINI_POS2 = [[-210, 70], [-130, 40], [-50, 80], [30, 50], [-170, -20], [-70, -10]];
function vilMiniOpen() { const sea = vilSeason(); S.vilMiniN = (S.vilMiniN || 0) + 1; const v = S.vilMiniN % 2 === 0 ? 1 : 0, M = v ? VIL_MINI2[sea] : VIL_MINI[sea], POS = v ? MINI_POS2 : MINI_POS[sea]; VILP.pdog = null; VILP.sel = null; VILP.mini = { sea, v, its: POS.slice(0, M.n).map(([dx, dy], k) => ({ dx, dy, got: 0, f: 0, k })), done: 0, end: 0 }; SFX.click(); }
/* v3.8 미니 놀이 소품·물건 (그라데이션·빛·그림자로 더 실감 나게) */
function miniProps(sea, cx, t) { const c = ctx;
  const blob = (x, y, r, a, b, d) => { const q = c.createRadialGradient(x - r * 0.4, y - r * 0.45, 1, x, y, r); q.addColorStop(0, a); q.addColorStop(0.65, b); q.addColorStop(1, d); c.fillStyle = q; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); };
  const trunk = (x, y0, y1, w) => { c.fillStyle = ART.lgr(c, '#a8784a', '#5e3a1e', x - w / 2, 0, x + w / 2, 0); c.beginPath(); c.moveTo(x - w / 2, y1); c.lineTo(x - w * 0.32, y0); c.lineTo(x + w * 0.32, y0); c.lineTo(x + w / 2, y1); c.closePath(); c.fill(); c.strokeStyle = 'rgba(60,30,10,.35)'; c.lineWidth = 1; for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(x - w * 0.2 + k * w * 0.13, y0 + 10); c.lineTo(x - w * 0.24 + k * w * 0.14, y1 - 6); c.stroke(); } };
  if (sea === 'spring') { c.fillStyle = 'rgba(40,60,20,.25)'; ART.E(c, cx + 10, 384, 150, 14); c.fill(); trunk(cx, 250, 386, 26);
    for (let k = 0; k < 22; k++) { const an = k * 2.399, rr = Math.sqrt((k + 0.5) / 22), x = cx + Math.cos(an) * rr * 110, y = 236 + Math.sin(an) * rr * 54 - (k < 4 ? 8 : 0), r = 30 - rr * 8; blob(x, y, r, '#fff4f8', k % 3 ? '#ffb8d4' : '#ffc8de', '#d8709e'); }
    for (let k = 0; k < 40; k++) { const a = k * 2.4, rr = 30 + (k * 37) % 90; c.fillStyle = k % 3 ? '#ffffff' : '#ffd6e6'; c.beginPath(); c.arc(cx + Math.cos(a) * rr, 250 + Math.sin(a) * rr * 0.45, 2, 0, TAU); c.fill(); }
    c.save(); c.translate(cx - 140, 398); c.rotate(-0.04); ART.RR(c, -70, -10, 140, 22, 4); c.fillStyle = '#ff9ab8'; c.fill(); c.fillStyle = '#ffffff'; for (let q = -70; q < 70; q += 14) c.fillRect(q, -10, 7, 22); c.restore(); }
  else if (sea === 'summer') { c.fillStyle = 'rgba(30,60,90,.25)'; ART.E(c, cx - 56, 372, 196, 54); c.fill(); const ring = c.createLinearGradient(0, 300, 0, 420); ring.addColorStop(0, '#ffb0c6'); ring.addColorStop(1, '#e85a86'); ART.E(c, cx - 60, 360, 190, 56); c.fillStyle = ring; c.fill();
    const w = c.createRadialGradient(cx - 80, 340, 10, cx - 60, 356, 180); w.addColorStop(0, '#c8f0ff'); w.addColorStop(0.6, '#62c2f2'); w.addColorStop(1, '#2a8ad0'); ART.E(c, cx - 60, 356, 174, 44); c.fillStyle = w; c.fill();
    c.save(); ART.E(c, cx - 60, 356, 174, 44); c.clip(); c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 1.5; for (let k = 0; k < 14; k++) { const x = cx - 220 + k * 26, y = 330 + (k * 17) % 50; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 8, y - 4 + Math.sin(t * 2 + k) * 2, x + 16, y); c.stroke(); } c.restore();
    c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 3; c.beginPath(); c.ellipse(cx - 60, 352, 186, 52, 0, Math.PI * 1.1, Math.PI * 1.5); c.stroke();
    c.fillStyle = 'rgba(30,60,90,.25)'; ART.E(c, cx + 188, 386, 40, 7); c.fill(); c.fillStyle = ART.lgr(c, '#8ad0ff', '#2a7ad0', cx + 150, 0, cx + 220, 0); c.beginPath(); c.moveTo(cx + 150, 322); c.lineTo(cx + 220, 322); c.lineTo(cx + 212, 384); c.lineTo(cx + 158, 384); c.closePath(); c.fill(); c.fillStyle = '#1e5aa0'; ART.E(c, cx + 185, 322, 35, 7); c.fill(); c.strokeStyle = '#1e4a80'; c.lineWidth = 3; c.beginPath(); c.arc(cx + 185, 322, 32, Math.PI, 0); c.stroke(); c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(cx + 160, 330, 6, 46); }
  else if (sea === 'autumn') { c.fillStyle = 'rgba(60,40,10,.25)'; ART.E(c, cx - 90, 382, 110, 12); c.fill(); trunk(cx - 98, 250, 380, 22);
    for (let k = 0; k < 20; k++) { const an = k * 2.399, rr = Math.sqrt((k + 0.5) / 20), x = cx - 98 + Math.cos(an) * rr * 92, y = 236 + Math.sin(an) * rr * 48, r = 27 - rr * 7, q = k % 4; blob(x, y, r, ['#ffe08a', '#ffc070', '#ffd060', '#ffb060'][q], ['#f6a632', '#e2582a', '#f4cc48', '#e86a2a'][q], ['#a84a10', '#8a2a10', '#a87810', '#8a3010'][q]); }
    c.fillStyle = 'rgba(60,40,10,.3)'; ART.E(c, cx + 176, 392, 64, 9); c.fill(); const bk = c.createLinearGradient(0, 330, 0, 392); bk.addColorStop(0, '#d8a060'); bk.addColorStop(1, '#8a5a2a'); c.fillStyle = bk; c.beginPath(); c.moveTo(cx + 116, 336); c.lineTo(cx + 236, 336); c.lineTo(cx + 224, 390); c.lineTo(cx + 128, 390); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(90,50,20,.55)'; c.lineWidth = 2; for (let q = 0; q < 5; q++) { c.beginPath(); c.moveTo(cx + 118 + q * 2.4, 346 + q * 10); c.lineTo(cx + 234 - q * 2.4, 346 + q * 10); c.stroke(); } for (let q = 0; q < 9; q++) { c.beginPath(); c.moveTo(cx + 128 + q * 12, 336); c.lineTo(cx + 132 + q * 11, 390); c.stroke(); } c.fillStyle = '#a8703a'; ART.RR(c, cx + 112, 330, 128, 8, 4); c.fill(); }
  else { [[cx - 230, 380, 1.1], [cx - 190, 392, 0.8], [cx + 240, 384, 1]].forEach(([x, y, s]) => { for (let q = 0; q < 4; q++) { const ty = y - (70 - q * 16) * s, by = y - (34 - q * 14) * s, hw = (12 + q * 7) * s; c.beginPath(); c.moveTo(x, ty); c.lineTo(x - hw, by); c.lineTo(x + hw, by); c.closePath(); c.fillStyle = ART.lgr(c, '#4e8068', '#2a5a48', x - hw, 0, x + hw, 0); c.fill(); c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(x, ty + 1); c.lineTo(x - hw * 0.8, by - 3); c.quadraticCurveTo(x, by - 8, x + hw * 0.8, by - 3); c.closePath(); c.fill(); } }); }
}
function miniJar(x, y, m) { const c = ctx; c.fillStyle = 'rgba(40,30,20,.25)'; ART.E(c, x + 4, y + 50, 42, 7); c.fill();
  const jg = c.createLinearGradient(x - 36, 0, x + 36, 0); jg.addColorStop(0, 'rgba(200,235,255,.55)'); jg.addColorStop(0.5, 'rgba(255,255,255,.25)'); jg.addColorStop(1, 'rgba(160,200,230,.5)'); RR(x - 36, y - 40, 72, 90, 18); c.fillStyle = jg; c.fill(); c.strokeStyle = 'rgba(90,130,170,.8)'; c.lineWidth = 2; c.stroke();
  RR(x - 28, y - 52, 56, 14, 5); c.fillStyle = ART.lgr(c, '#d8a060', '#8a5a2a', 0, y - 52, 0, y - 38); c.fill(); c.fillStyle = 'rgba(255,255,255,.55)'; c.fillRect(x - 26, y - 32, 6, 70);
  for (let k = 0; k < m.done; k++) { c.save(); c.translate(x - 18 + (k % 3) * 18, y + 34 - Math.floor(k / 3) * 20); c.scale(0.55, 0.55); miniItem2(m.sea, { k, got: 0 }); c.restore(); } }
function miniItem2(sea, it) { const c = ctx, t = G.time;
  if (sea === 'spring') { const fl = Math.abs(Math.sin(t * 3 + it.k)) * 0.6 + 0.4; c.fillStyle = '#7ac860'; c.fillRect(-1, 6, 2, 14); for (let q = 0; q < 5; q++) { const an = q / 5 * TAU; c.fillStyle = '#fff3a0'; ART.E(c, Math.cos(an) * 6, 12 + Math.sin(an) * 3, 4, 2.4); c.fill(); }
    [-1, 1].forEach(d => { c.save(); c.scale(d * fl, 1); const wg = c.createRadialGradient(6, -4, 1, 8, -2, 12); wg.addColorStop(0, '#fff0f8'); wg.addColorStop(1, ['#ff8ab4', '#8ac8ff', '#ffb04a', '#b48aff'][it.k % 4]); c.fillStyle = wg; c.beginPath(); c.ellipse(8, -6, 9, 7, -0.4, 0, TAU); c.fill(); c.beginPath(); c.ellipse(6, 4, 6, 5, 0.4, 0, TAU); c.fill(); c.restore(); }); c.fillStyle = '#4a3a2a'; ART.E(c, 0, -1, 2, 8); c.fill(); }
  else if (sea === 'summer') { c.fillStyle = 'rgba(80,60,30,.22)'; ART.E(c, 2, 10, 16, 4); c.fill(); const sg = c.createRadialGradient(-4, -6, 1, 0, 0, 16); sg.addColorStop(0, '#fff6f0'); sg.addColorStop(1, ['#ffb8a0', '#f6d0e0', '#ffe0a8'][it.k % 3]); c.fillStyle = sg; c.beginPath(); c.moveTo(0, 10); for (let q = 0; q <= 8; q++) { const an = Math.PI + q / 8 * Math.PI; c.lineTo(Math.cos(an) * 15, 6 + Math.sin(an) * 16); } c.closePath(); c.fill(); c.strokeStyle = 'rgba(180,110,90,.6)'; c.lineWidth = 1; for (let q = 1; q < 8; q++) { const an = Math.PI + q / 8 * Math.PI; c.beginPath(); c.moveTo(0, 10); c.lineTo(Math.cos(an) * 14, 6 + Math.sin(an) * 15); c.stroke(); } }
  else if (sea === 'autumn') { c.fillStyle = 'rgba(60,40,10,.25)'; ART.E(c, 1, 12, 11, 3); c.fill(); const ag = c.createRadialGradient(-3, 0, 1, 0, 2, 11); ag.addColorStop(0, '#e8a860'); ag.addColorStop(1, '#8a5020'); c.fillStyle = ag; c.beginPath(); c.ellipse(0, 3, 9, 10, 0, 0, TAU); c.fill(); const cg = c.createLinearGradient(0, -10, 0, -2); cg.addColorStop(0, '#a87848'); cg.addColorStop(1, '#6a4422'); c.fillStyle = cg; c.beginPath(); c.ellipse(0, -4, 11, 6, 0, Math.PI, 0); c.fill(); c.strokeStyle = 'rgba(60,30,10,.5)'; c.lineWidth = 0.8; for (let q = -8; q <= 8; q += 4) { c.beginPath(); c.moveTo(q, -4); c.lineTo(q * 0.6, -9); c.stroke(); } c.fillStyle = '#5a3a1a'; c.fillRect(-1, -13, 2, 4); c.fillStyle = 'rgba(255,255,255,.35)'; ART.E(c, -3, 2, 2.4, 3.4); c.fill(); }
  else { const tw = 0.85 + Math.sin(t * 4 + it.k) * 0.15; c.save(); c.scale(tw, tw); c.lineCap = 'round'; c.strokeStyle = '#5a8ac8'; c.lineWidth = 5; for (let q = 0; q < 6; q++) { const an = q / 6 * TAU; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(an) * 15, Math.sin(an) * 15); c.stroke(); } c.strokeStyle = '#ffffff'; c.lineWidth = 3; for (let q = 0; q < 6; q++) { const an = q / 6 * TAU; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(an) * 15, Math.sin(an) * 15); c.moveTo(Math.cos(an) * 9, Math.sin(an) * 9); c.lineTo(Math.cos(an + 0.5) * 13, Math.sin(an + 0.5) * 13); c.moveTo(Math.cos(an) * 9, Math.sin(an) * 9); c.lineTo(Math.cos(an - 0.5) * 13, Math.sin(an - 0.5) * 13); c.stroke(); } c.strokeStyle = '#8ab8e8'; c.lineWidth = 1.2; for (let q = 0; q < 6; q++) { const an = q / 6 * TAU; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(an) * 15, Math.sin(an) * 15); c.stroke(); } c.restore(); }
}
function miniItem(sea, it) { const c = ctx;
  if (sea === 'spring') { for (let q = 0; q < 5; q++) { const an = q / 5 * TAU - Math.PI / 2; c.save(); c.translate(Math.cos(an) * 9, Math.sin(an) * 9); c.rotate(an + Math.PI / 2); const pg = c.createRadialGradient(0, 4, 1, 0, 0, 11); pg.addColorStop(0, '#ff8ab4'); pg.addColorStop(1, '#ffe6f0'); c.fillStyle = pg; c.beginPath(); c.moveTo(0, 6); c.bezierCurveTo(-10, 0, -8, -11, -2, -10); c.lineTo(0, -7); c.lineTo(2, -10); c.bezierCurveTo(8, -11, 10, 0, 0, 6); c.fill(); c.restore(); }
    c.fillStyle = '#ffd34d'; c.beginPath(); c.arc(0, 0, 4.6, 0, TAU); c.fill(); c.fillStyle = '#e8902a'; for (let q = 0; q < 6; q++) { const an = q / 6 * TAU; c.beginPath(); c.arc(Math.cos(an) * 2.6, Math.sin(an) * 2.6, 0.9, 0, TAU); c.fill(); }
    if (it.got) { c.fillStyle = '#ffc0d8'; for (let q = 0; q < 6; q++) { const an = q / 6 * TAU + it.k; ART.E(c, Math.cos(an) * it.f * 50, Math.sin(an) * it.f * 50 + it.f * 20, 4, 2.4); c.fill(); } } }
  else if (sea === 'summer') { c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 1.2; c.beginPath(); c.ellipse(0, 12, 22, 5, 0, 0, TAU); c.stroke(); const bd = c.createRadialGradient(-6, -2, 2, 0, 4, 20); bd.addColorStop(0, '#fff6b0'); bd.addColorStop(0.6, '#ffd34d'); bd.addColorStop(1, '#e8a020'); c.fillStyle = bd; ART.E(c, 0, 4, 18, 11); c.fill(); c.fillStyle = '#f4c030'; ART.E(c, -3, 3, 8, 5); c.fill();
    const hd = c.createRadialGradient(7, -12, 1, 10, -8, 10); hd.addColorStop(0, '#fff6b0'); hd.addColorStop(1, '#f0b020'); c.fillStyle = hd; c.beginPath(); c.arc(10, -8, 9, 0, TAU); c.fill(); c.fillStyle = ART.lgr(c, '#ffb060', '#e8602a', 0, -10, 0, -4); ART.E(c, 20, -7, 6, 3.2); c.fill(); c.fillStyle = '#2a2a3a'; c.beginPath(); c.arc(12, -10, 1.9, 0, TAU); c.fill(); c.fillStyle = '#ffffff'; c.beginPath(); c.arc(12.6, -10.6, 0.7, 0, TAU); c.fill(); }
  else if (sea === 'autumn') { c.fillStyle = 'rgba(60,40,10,.25)'; ART.E(c, 0, 14, 16, 4); c.fill();
    if (it.k % 2) { [[-11, '#e8762a'], [11, '#e8762a'], [-5, '#f49040'], [5, '#f49040'], [0, '#ff9a48']].forEach(([dx, col]) => { const pg = c.createRadialGradient(dx - 3, -5, 1, dx, 0, 12); pg.addColorStop(0, '#ffc080'); pg.addColorStop(1, col); c.fillStyle = pg; ART.E(c, dx, 0, 9, 14); c.fill(); }); c.strokeStyle = 'rgba(150,60,10,.45)'; c.lineWidth = 1; [-8, -3, 3, 8].forEach(dx => { c.beginPath(); c.moveTo(dx, -12); c.quadraticCurveTo(dx * 1.3, 0, dx, 12); c.stroke(); }); c.fillStyle = ART.lgr(c, '#6a8a2a', '#3a5a1a', 0, -22, 0, -12); c.fillRect(-2, -21, 4, 9); }
    else { const ag = c.createRadialGradient(-4, -5, 1, 0, 0, 14); ag.addColorStop(0, '#ff8a8a'); ag.addColorStop(0.5, '#e8323a'); ag.addColorStop(1, '#9a1020'); c.fillStyle = ag; c.beginPath(); c.moveTo(0, -9); c.bezierCurveTo(10, -16, 18, -2, 9, 10); c.quadraticCurveTo(0, 15, -9, 10); c.bezierCurveTo(-18, -2, -10, -16, 0, -9); c.fill(); c.fillStyle = 'rgba(255,255,255,.55)'; ART.E(c, -5, -4, 3.2, 2); c.fill(); c.strokeStyle = '#5a3a1a'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(0, -9); c.lineTo(1, -16); c.stroke(); c.fillStyle = ART.lgr(c, '#8ad06a', '#3a8a2a', 0, -18, 0, -12); c.beginPath(); c.ellipse(6, -15, 6, 2.8, -0.4, 0, TAU); c.fill(); } }
  else { c.fillStyle = 'rgba(120,150,200,.35)'; ART.E(c, 2, 15, 16, 4); c.fill(); const sg = c.createRadialGradient(-6, -6, 1, 0, 0, 18); sg.addColorStop(0, '#ffffff'); sg.addColorStop(0.7, '#eef4fc'); sg.addColorStop(1, '#bccde6'); c.fillStyle = sg; c.beginPath(); c.arc(0, 0, 17, 0, TAU); c.fill(); c.strokeStyle = '#8aa4c8'; c.lineWidth = 1.6; c.stroke(); c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.arc(-6, -6, 3, 0, TAU); c.fill(); }
}
function vilMini(P) { const m = P.mini; if (!m) return; const v2 = m.v === 1, M = v2 ? VIL_MINI2[m.sea] : VIL_MINI[m.sea], E0 = VIL_EV[m.sea], cx = W / 2, cy = 300, t = G.time, dt0 = G.dt || 0.016, gift = S.vilEv !== todayKey();
  ctx.save(); ctx.fillStyle = 'rgba(20,10,0,.55)'; ctx.fillRect(-OX, 0, VW, H); ctx.restore(); uiPush({ x: -OX, y: 0, w: VW, h: H, key: 'vmblk', tap: () => {} });
  pkCard(cx - 290, 112, 580, 384, {}); txt(`🎉 ${E0.n}`, cx, 136, 20, '#3a2210', 'center', false); txt(M.t, cx, 162, 14, '#7a5230', 'center', false, null, 520);
  RR(cx - 270, 178, 540, 252, 16); ctx.fillStyle = M.bg; ctx.fill(); ctx.save(); RR(cx - 270, 178, 540, 252, 16); ctx.clip();
  { const bgc = vilBg(false); ctx.drawImage(bgc, (OX + 250) * 2, 40 * 2, 620 * 2, 330 * 2, cx - 270, 178, 540, 288); ctx.fillStyle = 'rgba(255,250,240,.12)'; ctx.fillRect(cx - 270, 178, 540, 252); } /* v3.8 마을 배경을 그대로 잘라 써서 그림 품질을 맞춤 */
  if (v2) miniJar(cx + 190, 352, m); else miniProps(m.sea, cx, t);
  /* 모으는 곳: 여름 양동이 · 가을 바구니 · 겨울 눈사람 (모은 만큼 커짐) */ const gx = v2 ? cx + 190 : m.sea === 'summer' ? cx + 185 : m.sea === 'autumn' ? cx + 175 : cx + 160, gy = v2 ? 332 : m.sea === 'summer' ? 330 : m.sea === 'autumn' ? 340 : 330;
  if (m.sea === 'winter' && !v2) { const d = m.done; ctx.fillStyle = 'rgba(120,150,200,.3)'; ART.E(ctx, gx + 6, 410, 48, 8); ctx.fill(); const snowG = (yy, r) => { const q = ctx.createRadialGradient(gx - r * 0.35, yy - r * 0.4, 2, gx, yy, r); q.addColorStop(0, '#ffffff'); q.addColorStop(0.7, '#eef4fc'); q.addColorStop(1, '#c4d4ea'); return q; }; ctx.strokeStyle = '#b8cce4'; ctx.lineWidth = 1.5; ctx.fillStyle = '#ffffff'; if (d >= 1) { ctx.fillStyle = snowG(372, 38); ctx.beginPath(); ctx.arc(gx, 372, 38, 0, TAU); ctx.fill(); ctx.stroke(); } if (d >= 2) { ctx.fillStyle = snowG(312, 28); ctx.beginPath(); ctx.arc(gx, 312, 28, 0, TAU); ctx.fill(); ctx.stroke(); [300, 316].forEach(yy => { ctx.fillStyle = '#3a3040'; ctx.beginPath(); ctx.arc(gx, yy, 2.6, 0, TAU); ctx.fill(); }); } if (d >= 3) { ctx.fillStyle = snowG(266, 21); ctx.beginPath(); ctx.arc(gx, 266, 21, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#2a2a3a'; [[-7, -4], [7, -4]].forEach(([a, b]) => { ctx.beginPath(); ctx.arc(gx + a, 266 + b, 2.6, 0, TAU); ctx.fill(); }); ctx.fillStyle = '#ff8a2a'; ctx.beginPath(); ctx.moveTo(gx, 268); ctx.lineTo(gx + 16, 271); ctx.lineTo(gx, 274); ctx.fill(); } if (d >= 4) { ctx.fillStyle = '#e8323a'; ctx.fillRect(gx - 22, 284, 44, 8); ctx.fillRect(gx + 10, 284, 8, 22); } if (d >= 5) { ctx.fillStyle = '#4a4a5a'; ctx.fillRect(gx - 20, 244, 40, 7); ctx.fillRect(gx - 13, 222, 26, 23); } if (!d) { ctx.setLineDash([6, 6]); ctx.strokeStyle = 'rgba(120,150,190,.7)'; ctx.beginPath(); ctx.arc(gx, 372, 38, 0, TAU); ctx.stroke(); ctx.setLineDash([]); } }
  m.its.forEach(it => { const x0 = cx + it.dx, y0 = cy + it.dy + (m.sea === 'summer' ? Math.sin(t * 2 + it.k) * 2 : 0); let x = x0, y = y0, a = 1, sc = 1; if (it.got) { it.f = Math.min(1, it.f + dt0 * 1.8); const q = it.f; if (m.sea === 'spring' && !v2) { a = 1 - q; sc = 1 + q * 0.4; } else { x = x0 + (gx - x0) * q; y = y0 + (gy - y0) * q - Math.sin(q * Math.PI) * 50; sc = 1 - q * 0.4; a = q >= 1 ? 0 : 1; } }
    if (a <= 0) return; ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.scale(sc, sc);
    if (v2) { ctx.scale(1.6, 1.6); miniItem2(m.sea, it); } else miniItem(m.sea, it);
    ctx.restore(); if (!it.got) { ctx.save(); ctx.globalAlpha = 0.4 + Math.sin(t * 4 + it.k) * 0.25; ART.star(ctx, x0 + 18, y0 - 18, 5, '#ffffff'); ctx.restore(); uiPush({ x: x0 - 30, y: y0 - 30, w: 60, h: 60, key: 'vmi' + it.k, tap: () => { if (it.got) return; it.got = 1; m.done++; SFX.pick(); if (m.done >= m.its.length) { m.end = 1; S.vilMiniDone = (S.vilMiniDone || 0) + 1; S.vilMiniK = S.vilMiniK || {}; S.vilMiniK[m.sea + (m.v || 0)] = (S.vilMiniK[m.sea + (m.v || 0)] || 0) + 1; save(); if (vilEvGift()) m.rew = E0.r; SFX.rare && SFX.rare(); } } }); } });
  ctx.restore();
  txt(`${m.done} / ${m.its.length}`, cx - 250, 196, 15, '#5a3412', 'left', false); txt(gift ? `선물: ${E0.r}` : '오늘 선물은 받았어요 · 그냥 놀아도 좋아요', cx + 250, 196, 13, gift ? '#2e7d32' : '#8a6142', 'right', false, null, 300);
  if (m.end) { for (let q = 0; q < 10; q++) { const an = q / 10 * TAU + t; ART.star(ctx, cx + Math.cos(an) * 120, 300 + Math.sin(an) * 60, 6, ['#ffd34d', '#ff9ed8', '#7ad0ff'][q % 3]); } bigText('완성!', cx, 290, 40, '#fff6d0', '#e8762a'); RR(cx - 150, 318, 300, 32, 16); ctx.fillStyle = 'rgba(255,250,236,.95)'; ctx.fill(); txt(m.rew ? `선물 ${m.rew} 받았어요!` : '선물은 내일 또 받을 수 있어요', cx, 334, 15, m.rew ? '#2e7d32' : '#7a5230', 'center', false, null, 280); }
  btn(cx - 80, 440, 160, 46, m.end ? '다 했어요!' : '그만하기', () => { if (m.end) { P.cele = { x: W / 2, y: 452, t: 5 }; SFX.rare && SFX.rare(); } P.mini = null; }, { bg: m.end ? '#5cb84a' : '#a99a8a', size: 16, key: 'vmclose' }); }
function vilDrawActs(P, back) {
  if (!P.acts) return; const tt0 = G.time * 4, wk = weatherNow().k, wet = wk === 'rain' || wk === 'snow' || P.forceWet;
  P.acts.filter(a => (a.y < 330 || (a.bk && a.y < 420)) === back).sort((p, q) => p.y - q.y).forEach((a, n) => {
    const sc = a.y < 330 ? 0.82 : a.y < 420 ? 0.9 : 1, tt = tt0 + n, act = a.mode === 'act' ? (a.k === 'dog' ? VILLAGE[a.bi].act : 'pet') : a.mode === 'cele' && !a.moving ? 'clap' : P.fest ? 'dance' : null;
    let x = a.x, y = a.y, dy = a.moving ? -Math.abs(Math.sin(G.time * 9 + n)) * 1.6 : 0, rot = 0;
    if (act === 'clap') dy = -Math.abs(Math.sin(tt * 2.2)) * 5; else if (act === 'eat' || act === 'drink') dy = -Math.abs(Math.sin(tt * 1.5)) * 2; else if (act === 'dance') { dy = -Math.abs(Math.sin(tt * 1.6)) * 3; rot = Math.sin(tt) * 0.12; } else if (act === 'slide') { const sl = (G.time * 0.6 + n * 0.3) % 1; x += (sl - 0.5) * 24; dy = (sl - 0.5) * 10 - 4; rot = 0.3; } else if (act === 'hammer') dy = -Math.abs(Math.sin(tt * 2)) * 1.5;
    if (a.mode === 'hidden') return;
    if (a.mode === 'greet') { dy = -Math.abs(Math.sin(G.time * 7 + n)) * 2.5; rot = Math.sin(G.time * 10 + n) * 0.05; }
    if (a.mode === 'wag') { dy = -Math.abs(Math.sin(G.time * 6 + n)) * 2; rot = Math.sin(G.time * 14 + n) * 0.07; }
    let sq = 0; if (a.mode === 'duo') { if (a.duo === 'sit') { sq = 0.88; dy = 2; } else { const ph = (G.time * 2.2 + (a.dq ? 0.5 : 0)) % 1; dy = ph < 0.25 ? -Math.sin(ph / 0.25 * Math.PI) * 3 : 0; } }
    if (a.k === 'dog') { ctx.save(); ctx.translate(x, y + dy); ctx.rotate(rot); if (sq) ctx.scale(1, sq); drawCuteDog(a.key, UNITS[a.i].id, unitSprite(a.i), 0, 0, 0.55 * sc, { flip: a.flip, ph: n, em: false }); ctx.restore();
      if (a.mode === 'wag') { const tx0 = x + (a.flip ? 20 : -20) * sc, ty0 = y - 24 * sc + dy; ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2; ctx.lineCap = 'round'; for (let q = 0; q < 2; q++) { const ph = Math.sin(G.time * 14 + q * 3) * 0.3; ctx.beginPath(); ctx.arc(tx0, ty0, 8 + q * 6, (a.flip ? -0.6 : Math.PI - 0.6) + ph, (a.flip ? 0.6 : Math.PI + 0.6) + ph); ctx.stroke(); } ctx.restore(); } /* 살랑살랑 꼬리 흔들기 선 */
      if (a.mode === 'tag' && a.fo && a.fo.k === 'dog' && buddyOf(a.i) === a.fo.i) { const mx = (x + a.fo.x) / 2, my = Math.min(y, a.fo.y) - 62 * sc + Math.sin(G.time * 3) * 2; { ctx.save(); ctx.globalAlpha *= 0.62; txt('♥', mx - 5, my, 13, '#ff6a9a', 'center'); ctx.restore(); } { ctx.save(); ctx.globalAlpha *= 0.62; txt('♥', mx + 5, my - 3, 11, '#ff9ec4', 'center'); ctx.restore(); } } else if (a.mode === 'tag' && Math.sin(G.time * 2 + n) > 0.6) txt('♪', x + (a.flip ? -10 : 10), y - 58 * sc, 12, '#ffd34d', 'center');
      if (a.mode === 'duo') { if (a.duo === 'sit' && !a.dq && a.fo) { ctx.save(); ctx.globalAlpha *= 0.62; txt('♥', (x + a.fo.x) / 2, Math.min(y, a.fo.y) - 50 * sc + Math.sin(G.time * 2) * 2, 13, '#ff6a9a', 'center'); ctx.restore(); } else if (a.duo === 'bark') { const ph = (G.time * 2.2 + (a.dq ? 0.5 : 0)) % 1; if (ph < 0.35) txt('멍!', x + (a.flip ? -8 : 8), y - 58 * sc, 12, '#fff', 'center'); } else if (a.duo === 'flower' && !a.dq && a.fo) { const ph = (Math.sin(G.time * 2.4) + 1) / 2, fx2 = x + (a.fo.x - x) * ph, fy2 = Math.min(y, a.fo.y) - 30 * sc - Math.sin(ph * Math.PI) * 10; ctx.strokeStyle = '#3a8a3a'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(fx2, fy2); ctx.lineTo(fx2, fy2 + 12); ctx.stroke(); for (let q = 0; q < 5; q++) { const an = q / 5 * TAU + G.time; ctx.fillStyle = '#ff8ac0'; ctx.beginPath(); ctx.arc(fx2 + Math.cos(an) * 3.6, fy2 + Math.sin(an) * 3.6, 2.6, 0, TAU); ctx.fill(); } ctx.fillStyle = '#ffe27a'; ctx.beginPath(); ctx.arc(fx2, fy2, 2.2, 0, TAU); ctx.fill(); txt('♥', (x + a.fo.x) / 2, Math.min(y, a.fo.y) - 56 * sc, 12, '#ff6a9a', 'center'); } } /* v4.3 짝꿍 산책 끝: 꽃 주고받기 */
      if (a.mode === 'ffly' && a.ff) { const f = a.ff, fx = f.x + Math.sin(f.ph * 2.3) * 8, fy = roadY(f.x, a.lane) - 44 + Math.sin(f.ph * 1.7) * 9, fl = 0.55 + Math.sin(f.ph * 9) * 0.35; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = fl; ctx.drawImage(ART.softDot('#d8ff7a'), fx - 14, fy - 14, 28, 28); ctx.restore(); ctx.fillStyle = '#f4ffb0'; ctx.beginPath(); ctx.arc(fx, fy, 2.2, 0, TAU); ctx.fill(); }
      if (joyOf(a.i) >= 5 && a.mode !== 'greet' && !wet) { ctx.save(); ctx.globalAlpha *= 0.62; txt('♥', x + (a.flip ? -12 : 12) * sc, y - 46 * sc + Math.sin(G.time * 3 + n) * 1.5, 10, '#ff6a9a', 'center'); ctx.restore(); }
      if (VILP.joyFx && VILP.joyFx.a === a) { const f = VILP.joyFx; f.t -= (G.dt || 0.016) / 2; for (let q = 0; q < 3; q++) { ctx.save(); ctx.globalAlpha = Math.max(0, f.t / 1.6); txt('♥', x - 12 + q * 12, y - 50 - (1.6 - f.t) * 30 - q * 5, 14, '#ff5a8a', 'center'); ctx.restore(); } if (f.t <= 0) VILP.joyFx = null; }
      if (a.mode === 'greet') { const hy = y - 52 * sc - (2.2 - a.t) * 8; ctx.save(); ctx.globalAlpha = Math.min(0.62, a.t); txt('♥', x + (a.flip ? -20 : 20) * Math.max(0.8, sc), hy, 14, '#ff6a9a', 'center'); ctx.globalAlpha = Math.min(1, a.t); if (a.t > 1.4) txt('멍!', x, y - 64 * sc, 11, '#fff', 'center'); ctx.restore(); }
      if (wet) { const uy = y - 58 * sc + dy, uc = ['#ff6a6a', '#5ab0ff', '#ffd34d', '#7ad87a', '#c87aff', '#ff9a3a'][a.i % 6]; ctx.save(); ctx.strokeStyle = '#5a4030'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + (a.flip ? 6 : -6), y - 26 * sc + dy); ctx.lineTo(x + (a.flip ? 6 : -6), uy); ctx.stroke(); ctx.beginPath(); ctx.arc(x + (a.flip ? 6 : -6), uy + 2, 22 * sc, Math.PI, 0); for (let q = 4; q >= 0; q--) { const ux = x + (a.flip ? 6 : -6) - 22 * sc + q * 11 * sc; ctx.quadraticCurveTo(ux + 5.5 * sc, uy - 2, ux, uy + 2); } ctx.closePath(); ctx.fillStyle = uc; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(60,30,10,.7)'; ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(x + (a.flip ? 6 : -6) - 7 * sc, uy - 6 * sc, 6 * sc, Math.PI, 0); ctx.fill(); ctx.restore(); } } /* v3.3 비·눈 오는 날엔 우산 */
    else if (a.k === 'hero') { if (!VILP.play && !VILP.mini) uiPush({ x: x - 22, y: y - 54, w: 44, h: 56, key: 'vhero', tap: () => heroCall(VILP, a) }); if (VILP.heroTalk > 0) { VILP.heroTalk -= (G.dt || 0.016) / 2; drawBubbleAt(x, y - 92 * sc, '같이 놀까?'); }
      ctx.fillStyle = 'rgba(30,15,0,.2)'; ART.E(ctx, x, y + 2, 16 * sc, 4); ctx.fill(); ART.draw(ctx, heroFace(), a.moving ? 'w' + (Math.floor(G.time * 10) % 10) : 'i' + (Math.floor(G.time * 2.4) % 3), x, y + dy, 0.5 * sc, a.flip, 0);
      if (S.mtitle) VILP.heroRib = [x, y - 90 * sc]; else { ctx.font = `bold 11.5px ${FONT}`; const nw = ctx.measureText(heroName()).width + 14; RR(x - nw / 2, y - 80 * sc, nw, 17, 8.5); ctx.fillStyle = 'rgba(255,248,230,.9)'; ctx.fill(); txt(heroName(), x, y - 80 * sc + 8.5, 11.5, '#5a3412', 'center', false); } } /* v4.3 내 기사 + 칭호 리본(작게) */
    else { if (!VILP.play) uiPush({ x: x - 18, y: y - 30, w: 36, h: 34, key: 'vpp' + a.id, tap: () => { VILP.pdog = a; VILP.sel = null; floatMsg = { s: `${actName(a)}${jo(actName(a))} 같이 놀자고 폴짝!`, x: W / 2, y: 110, t: 1.8 }; } }); ctx.fillStyle = 'rgba(30,15,0,.18)'; ART.E(ctx, x, y + 2, 12 * sc, 3); ctx.fill(); ART.draw(ctx, 'pet_' + a.id, a.moving ? 'w' + (Math.floor(G.time * 10 + n) % 10) : 'i0', x, y + dy, sc, a.flip, 0); if (petLv(a.id) >= 5) drawPetCrown(x, y + dy - (PET_TOP[a.id] || 30) * sc - 4, sc); if (petBuddy(a.id)) drawPetRibbon(x + 10 * sc, y + dy - 14 * sc, sc); /* v5.1 마을에서도 왕관 · 단짝 리본 */ if (act === 'pet' && Math.sin(tt) > 0.2) txt(PET_ACT[a.bi] || '♪', x, y - 26 * sc, 11, a.bi === 4 ? '#ff6a9a' : '#fff', 'center'); }
    if (act && a.k === 'dog') { const ax = x + (a.flip ? -16 : 16) * sc, ay = y - 30 * sc; ctx.save();
      if (act === 'eat') { ART.E(ctx, ax, ay + 14, 8, 5); ctx.fillStyle = '#e8a040'; ctx.fill(); if (Math.sin(tt * 1.5) > 0.6) txt('냠', x, y - 48 * sc, 12, '#fff', 'center'); }
      else if (act === 'drink') { ctx.fillStyle = '#7ac8ff'; ART.E(ctx, ax, ay + 18, 7, 3); ctx.fill(); }
      else if (act === 'read') { ctx.fillStyle = '#8a6ad8'; ctx.fillRect(ax - 7, ay + 4, 14, 10); ctx.fillStyle = '#fff'; ctx.fillRect(ax - 6, ay + 5, 5.5, 8); ctx.fillRect(ax + 0.5, ay + 5, 5.5, 8); }
      else if (act === 'fish') { ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ax - 4, ay + 10); ctx.lineTo(ax + (a.flip ? -18 : 18), ay - 12); ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ax + (a.flip ? -18 : 18), ay - 12); ctx.lineTo(ax + (a.flip ? -22 : 22), ay + 20 + Math.sin(tt) * 2); ctx.stroke(); }
      else if (act === 'sniff') { if (Math.sin(tt) > 0) { ctx.save(); ctx.globalAlpha *= 0.62; txt('♥', x + 6, y - 48 * sc, 12, '#ff6a9a', 'center'); ctx.restore(); } }
      else if (act === 'sing' || act === 'dance') txt('♪', x + Math.sin(tt) * 6, y - 50 * sc, 14, '#ffd34d', 'center');
      else if (act === 'hammer') { if (Math.sin(tt * 2) > 0.7) txt('땅!', ax + 6, ay - 4, 11, '#fff', 'center'); }
      else if (act === 'nap') txt('z', x + 10, y - 46 * sc, 13, '#c8d8ff', 'center');
      else if (act === 'look') txt('✦', x + 10, y - 50 * sc, 12, '#fff3a0', 'center');
      else if (act === 'clap') { if (Math.sin(tt * 2.2) > 0.3) txt('짝!', x, y - 50 * sc, 12, '#fff', 'center'); }
      ctx.restore(); }
    if (a.k === 'dog') uiPush({ x: x - 22, y: y - 50, w: 44, h: 52, key: 'vlp' + a.i, tap: () => { if (P.play) return; P.pdog = a; P.sel = null; const c0 = S.coins; cutePet(a.key, UNITS[a.i].id, x, y - 50); if (vilOn(3) && S.coins > c0) S.coins += Math.round((S.coins - c0) * vilV(3) / 100); const nk = UNITS[a.i].nick; floatMsg = { s: a.mode === 'duo' && a.fo ? `${nk}${jo(nk)} 짝꿍 ${UNITS[a.fo.i].nick}${'랑'} ${a.duo === 'sit' ? '나란히 앉아 쉬어요 ♥' : '같이 멍멍 짖어요!'}` : a.mode === 'ffly' ? `${nk}${jo(nk)} 반딧불을 졸졸 따라가요 ✨` : a.mode === 'tag' && a.fo && a.fo.k === 'dog' && buddyOf(a.i) === a.fo.i ? `${nk}${jo(nk)} 짝꿍 ${UNITS[a.fo.i].nick}${'랑'} 함께 걸어요 ♥♥` : a.mode === 'tag' && a.fo && a.fo.k === 'dog' ? `${nk}${jo(nk)} 좋아서 ${UNITS[a.fo.i].nick} 뒤를 졸졸 따라다녀요 ♥` : a.mode === 'wag' ? `${nk}${jo(nk)} 기분이 좋아 꼬리를 살랑살랑 흔들어요 ♥` : a.mode === 'act' && ACTD[VILLAGE[a.bi].act] ? `${nk}${jo(nk)} ${VILLAGE[a.bi].n}에서 ${ACTD[VILLAGE[a.bi].act]}` : a.mode === 'go' ? `${nk}${jo(nk)} ${VILLAGE[a.bi].n}에 가는 중이에요` : `${nk}${jo(nk)} 마을을 산책하고 있어요`, x: W / 2, y: 110, t: 2.2 }; } });
  });
}
/* v3.2 마을 잔치: 지어진 건물(5채 이상)이 모두 3단계면 하루 한 번 */
const vilFestOk = () => { const b = VILLAGE.map((q, i) => i).filter(i => vilOn(i)); return b.length >= 5 && b.every(i => vilLv(i) >= 3); };
function vilFest() { if (!vilFestOk() || S.vilFest === todayKey()) return; S.vilFest = todayKey(); S.coins += 1000; S.dust = (S.dust || 0) + 2; S.items = S.items || {}; S.items.lunch = Math.min(20, invN('lunch') + 1); SFX.rare(); VILP.fest = { t: 12 }; try { AUD.play('villfest'); } catch (e) {} floatMsg = { s: '🎉 마을 잔치! 코인 1000 · 별가루 2 · 간식 도시락 1', x: W / 2, y: 120, t: 3 }; save(); }
/* v3.4 같이 놀기: 기사를 누르고 「같이 놀기」 → 길 위 아무 데나 눌러 공 던지기 → 기사가 공을 물어 옴 → 작은 보상 (하루 3번) */
const joyOf = i => (S.joy && S.joy[i]) || 0;
/* v3.8 짝꿍: 가장 자주 따라다닌 친구 (3번 이상) */
function buddyOf(i) { const T = S.tagN || {}; let best = null, bn = 2; for (const k in T) { const [p, q] = k.split('-').map(Number); if ((p === i || q === i) && T[k] > bn) { bn = T[k]; best = p === i ? q : p; } } return best; } /* v3.6 기사 행복도 하트 (같이 놀 때마다 +1, 최대 10) */
const vilPlayLeft = () => 3 - (S.vilPlay && S.vilPlay.d === todayKey() ? S.vilPlay.n : 0);
const actName = a => a.k === 'pet' ? (PETS.find(p => p.id === a.id) || { n: '펫' }).n.split(' ').pop() : UNITS[a.i].nick;
/* v3.5 같이 놀기 3가지 (하루 3번 같이 씀): 🎾 공 던지기 · 🥏 원반 던지기 · 🙈 숨바꼭질 — 기사도 펫도 */
function vilPlayStart(a, kind) { if (vilPlayLeft() <= 0) { floatMsg = { s: '오늘은 충분히 놀았어요! 내일 또 놀아요', x: W / 2, y: 110, t: 2 }; return; } a.path = []; a.mode = 'wait'; a.bk = false; VILP.pdog = null;
  if (kind === 'hide') { const pos = vilPos(), spots = VILLAGE.map((q, b) => b).filter(b => vilOn(b)).map(b => ({ b, x: VPLOT[pos[b]].x, y: VPLOT[pos[b]].y })); if (spots.length < 4) [[96, 512], [864, 512]].forEach(([x, y], k) => spots.push({ b: -1 - k, x, y, tree: 1 })); /* 건물 뒤 + (건물이 적으면) 큰 덤불 */
    const pick3 = spots.sort(() => Math.random() - 0.5).slice(0, Math.min(4, spots.length)), sp = pick3[0]; a.mode = 'hidego'; a.path = (sp.y < 300 ? [[a.x, roadY(a.x, a.lane)], [sp.x, roadY(sp.x, a.lane)], [sp.x, 404], [sp.x + 20, sp.y + 30]] : [[a.x, roadY(a.x, a.lane)], [sp.x + (sp.tree ? 0 : 26), sp.tree ? sp.y - 4 : sp.y + 24]]); VILP.play = { a, kind, stage: 'hide', spot: sp, cands: pick3.sort((p, q) => p.x - q.x), tries: 0 }; floatMsg = { s: `${actName(a)}${jo(actName(a))} 숨으러 가요! 눈 감고 기다려요…`, x: W / 2, y: 110, t: 2.4 }; return; }
  VILP.play = { a, kind, stage: 'aim' }; }
function vilPlayThrow(tx, ty) { const P = VILP, pl = P.play, a = pl.a; pl.stage = 'fly'; pl.hx = a.x; pl.hy = a.y; pl.tx = Math.max(60, Math.min(900, tx)); pl.ty = Math.max(420, Math.min(505, ty)); pl.ft = 0; SFX.click(); }
function vilSeek(c) { const P = VILP, pl = P.play; if (!pl || pl.stage !== 'seek') return; pl.tries++; if (c === pl.spot) { pl.a.mode = 'idle'; pl.a.t = 1.2; pl.a.x = c.tree ? c.x + 20 : c.x + 30; pl.a.y = c.tree ? c.y : c.y + 28; pl.a.path = [[pl.a.x, roadY(pl.a.x, pl.a.lane)]]; pl.a.mode = 'walk'; vilPlayDone(pl.a, pl.tries === 1 ? '한 번에 찾았어요! ' : ''); return; }
  pl.wrong = { c, t: 1 }; SFX.click(); if (pl.tries >= 3) { floatMsg = { s: `여기 있었지롱! ${actName(pl.a)}${jo(actName(pl.a))} 깡충 나왔어요`, x: W / 2, y: 110, t: 2.2 }; pl.a.mode = 'walk'; pl.a.x = pl.spot.tree ? pl.spot.x + 20 : pl.spot.x + 30; pl.a.y = pl.spot.tree ? pl.spot.y : pl.spot.y + 28; pl.a.path = [[pl.a.x, roadY(pl.a.x, pl.a.lane)]]; vilPlayDone(pl.a, '', 0.5); } }
function vilPlayDone(a, pre, mul) { const P = VILP; if (a.k === 'dog') { S.joy = S.joy || {}; const was = joyOf(a.i); S.joy[a.i] = Math.min(10, was + 1); if (was < 5 && S.joy[a.i] >= 5) setTimeout(() => { floatMsg = { s: `${actName(a)}${jo(actName(a))} 아주 행복해요! 전투 시작 체력 +2%`, x: W / 2, y: 140, t: 2.6 }; }, 2700); P.joyFx = { a, t: 1.6 }; } S.vilPlay = S.vilPlay && S.vilPlay.d === todayKey() ? S.vilPlay : { d: todayKey(), n: 0 }; S.vilPlay.n++; const r = Math.random(), nk = actName(a), kind = P.play && P.play.kind; let msg;
  const bonus = kind === 'disc' ? 20 : kind === 'hide' ? 30 : 0;
  if (r < 0.15) { S.items = S.items || {}; S.items.bonebag = Math.min(20, invN('bonebag') + 1); msg = `${pre || ''}${nk}${jo(nk)} 「뼈다귀 주머니」를 선물했어요!`; } else { const c = Math.round((40 + Math.floor(Math.random() * 3) * 20 + bonus) * (mul || 1)); S.coins += c; msg = `${pre || ''}${kind === 'hide' ? `${nk}${jo(nk)} 신나서 꼬리를 흔들어요!` : `${nk}${jo(nk)} ${kind === 'disc' ? '원반을' : '공을'} 물어 왔어요!`} 코인 ${c}`; }
  SFX.coin(); floatMsg = { s: msg, x: W / 2, y: 110, t: 2.6 }; P.play = null; save(); }
function drawVillage() {
  const P = VILP; P.t += G.dt || 0.016; ui = []; dragH = null; if (!P.mus) { P.mus = 1; if (weatherNow().k === 'rain' || P.forceWet) try { AUD.play('vilrain'); } catch (e) {} } /* v3.4 비 오는 날 마을 곡 */ const n = chClearedN(), night = weatherNow().night, pos = vilPos(), dt = G.dt || 0.016;
  ctx.drawImage(vilBg(night), -OX, 0, VW, H);
  for (let k = 0; k < 4; k++) { const sc = 0.45 + (k % 2) * 0.2, cx = ((k * 331 + G.time * (6 + k * 2)) % (VW + 300)) - OX - 150, cy = 40 + k * 34, c = cloudSprite(k); ctx.save(); ctx.globalAlpha = night ? 0.35 : 0.85; ctx.drawImage(c, cx - c.width * sc / 2, cy - c.height * sc / 2, c.width * sc, c.height * sc); ctx.restore(); }
  // 건물 (뒷줄 먼저)
  const order = VILLAGE.map((b, i) => i).sort((a, b) => VPLOT[pos[a]].y - VPLOT[pos[b]].y);
  let backDone = false; if (!P.acts) vilActUpd(P, pos, 0, night);
  [40, 330, 620, 900].forEach((x, k) => { const y = 470 - (x > 300 && x < 700 ? -6 : 0), lt = P.t - 0.6 - k * 0.55, lit = night && lt > 0 ? (lt < 0.35 ? (Math.sin(lt * 60) > 0 ? 1 : 0.2) : 1) : 0; /* v3.2 밤에 가로등이 하나씩 깜빡이며 켜짐 */ ctx.fillStyle = '#4a4a5a'; ctx.fillRect(x - 2, y - 60, 4, 60); RR(x - 8, y - 74, 16, 16, 4); ctx.fillStyle = lit ? '#ffe27a' : night ? '#6a6a7a' : '#e8f0f8'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#4a4a5a'; ctx.stroke(); if (lit) { if (lt > 0 && lt < 0.5) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (0.5 - lt) * 1.6; ctx.drawImage(ART.softDot('#fff3c0'), x - 40, y - 106, 80, 80); ctx.restore(); } ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 * lit; ctx.drawImage(ART.softDot('#ffd060'), x - 50, y - 116, 100, 100); ctx.restore(); } }); /* v3.6 가로등을 건물보다 먼저 그려 이름판을 가리지 않게 */
  const LBL = []; /* v4.2 건물 이름표는 기사·펫을 다 그린 뒤 맨 위에 — 기사가 이름표 위를 지나면 이름표를 반투명하게 (글씨가 머리에 반쯤 가려지던 것) */
  for (const i of order) { const pl = VPLOT[pos[i]], on = vilOn(i), b = VILLAGE[i], x = pl.x, y = pl.y, s = pl.s, sel = P.sel === i || (P.move && P.move.from === i);
    if (!backDone && y > 300) { backDone = true; vilDrawActs(P, true); } /* 뒷줄 건물 앞에 있는 기사·펫은 앞줄 건물보다 먼저(뒤에) 그림 */
    if (on) { const bo = P.bounce && P.bounce.i === i ? 1 + Math.sin(P.bounce.t * 20) * 0.04 : 1, spr = vilBldSprite(i, night); ctx.save(); ctx.translate(x, y); ctx.scale(s * bo, s / bo); if (sel) { ctx.shadowColor = '#fff3a0'; ctx.shadowBlur = 18; } ctx.drawImage(spr, -90, -150); ctx.restore();
      if (vilSeason() === 'winter') { ctx.save(); ctx.fillStyle = 'rgba(255,255,255,.92)'; ART.E(ctx, x, y - 2, 56 * s, 7 * s); ctx.fill(); ctx.restore(); }
      const lv = vilLv(i); if (lv >= 2) { const fx = x + 44 * s, fy = y - 20 * s; ctx.fillStyle = '#8a5a2a'; ctx.fillRect(fx - 1.5, fy - 34, 3, 34); ctx.beginPath(); ctx.moveTo(fx + 1.5, fy - 34); ctx.lineTo(fx + 20 + Math.sin(G.time * 4 + i) * 2, fy - 28); ctx.lineTo(fx + 1.5, fy - 21); ctx.closePath(); ctx.fillStyle = lv === 3 ? '#ffd34d' : '#ff7a5a'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#4a2a14'; ctx.stroke(); if (lv === 3) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.4 + Math.sin(G.time * 3 + i) * 0.2; ctx.drawImage(ART.softDot('#ffe08a'), fx - 20, fy - 50, 40, 40); ctx.restore(); } } /* v3.0 건물 단계 깃발 (2단계 빨강 · 3단계 금색) */
      if ((i === 2 || i === 6 || i === 0) && !night) for (let q = 0; q < 3; q++) { const t = (G.time * 0.5 + q / 3) % 1, sx = x + (i === 2 ? -24 : i === 6 ? 28 : 24) * s + Math.sin(t * 6 + q) * 6, sy = y - (i === 2 ? 102 : i === 6 ? 102 : 98) * s - t * 40; ctx.save(); ctx.globalAlpha = (1 - t) * 0.5; ctx.fillStyle = '#f4f4f4'; ctx.beginPath(); ctx.arc(sx, sy, 5 + t * 8, 0, TAU); ctx.fill(); ctx.restore(); }
      if (i === 6) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.3 + Math.sin(G.time * 8) * 0.15; ctx.drawImage(ART.softDot('#ff8a2a'), x - 14 * s - 26, y - 18 * s - 26, 52, 52); ctx.restore(); }
      if (b.tap && !vilGot(i) && !(b.tap === 'star' && !night)) { const by = y - 2 - Math.abs(Math.sin(G.time * 3 + i)) * 4; ctx.beginPath(); ctx.arc(x + 46, by, 10, 0, TAU); ctx.fillStyle = '#ff5a3a'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke(); txt('!', x + 46, by + 1, 13, '#fff', 'center', false); }
      LBL.push([x, y > 300 ? y - 12 : y, sel, b.c, b.n + (vilLv(i) > 1 ? ' ' + '★'.repeat(vilLv(i) - 1) : '')]); } /* v4.4 앞줄 이름표를 12px 올려 길 위 기사와 덜 겹치게 */
    else { /* v3.5 빈 터는 작은 텃밭 + 공사 표지판 (빈 마을처럼 안 보이게) */ ctx.save(); ctx.fillStyle = night ? '#5a4030' : '#a8784a'; RR(x - 44 * s, y - 26 * s, 88 * s, 28 * s, 6); ctx.fill(); ctx.strokeStyle = night ? '#4a3020' : '#8a5a30'; ctx.lineWidth = 2; for (let r = 0; r < 3; r++) { ctx.beginPath(); ctx.moveTo(x - 38 * s, y - (20 - r * 8) * s); ctx.lineTo(x + 38 * s, y - (20 - r * 8) * s); ctx.stroke(); for (let c = 0; c < 6; c++) { const sx = x - 32 * s + c * 13 * s, sy = y - (22 - r * 8) * s; ctx.fillStyle = (c + r + i) % 4 === 0 ? '#ff8a5a' : '#6ac04a'; ctx.beginPath(); ctx.ellipse(sx - 2, sy, 2.6 * s, 1.6 * s, -0.6, 0, TAU); ctx.ellipse(sx + 2, sy, 2.6 * s, 1.6 * s, 0.6, 0, TAU); ctx.fill(); } } ctx.restore(); ctx.fillStyle = '#a87a4a'; ctx.fillRect(x - 3, y - 40 * s, 6, 40 * s); RR(x - 34, y - 52 * s - 12, 68, 26, 6); ctx.fillStyle = '#d8b07a'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#6a4a2a'; ctx.stroke(); txt(`${b.ch}장 깨면`, x, y - 52 * s + 1, 12, '#4a2a10', 'center', false, null, 62); RR(x - 52, y + 7, 104, 20, 10); ctx.fillStyle = 'rgba(240,230,210,.85)'; ctx.fill(); txt(b.n, x, y + 17, 12, 'rgba(60,40,20,.8)', 'center', false, null, 100); } /* v3.6 빈 터 이름판에도 바탕 (가로등에 안 가려지게) */
    uiPush({ x: x - 56 * s, y: y - 120 * s, w: 112 * s, h: 120 * s + 28, key: 'vb' + i, tap: () => vilTap(i) }); }
  if (P.bounce) { P.bounce.t -= dt; if (P.bounce.t <= 0) P.bounce = null; }
  // 가로등
  // 돌아다니는 기사들 + 펫
  vilActUpd(P, pos, dt, night); /* v3.2 기사·펫은 일정한 속도로 천천히 걸음 */
  if (P.cele) { const ce = P.cele, pl = ce.i != null ? VPLOT[pos[ce.i]] : { x: ce.x, y: ce.y - 40 }; ce.t -= dt; for (let q = 0; q < 12; q++) { const a = q / 12 * TAU + G.time, r = 40 + (4 - ce.t) * 20; ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(1, ce.t)); txt('✦', pl.x + Math.cos(a) * r, pl.y - 60 + Math.sin(a) * r * 0.6, 14 + (q % 3) * 3, ['#ffe08a', '#ffffff', '#ff9ed8'][q % 3], 'center', false); ctx.restore(); } ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.max(0, ce.t / 4) * 0.7; ctx.drawImage(ART.softDot('#fff3a0'), pl.x - 90, pl.y - 150, 180, 160); ctx.restore(); bigText(ce.i != null ? `${vilLv(ce.i)}단계 축하해요!` : ce.lab || '다 같이 짝짝짝!', pl.x, ce.i != null ? pl.y - 140 : 130, 20, '#fff6b0', '#e8962a'); if (ce.t <= 0) P.cele = null; }
  { const wk = P.forceWet ? 'rain' : weatherNow().k; if (wk === 'rain') { ctx.save(); ctx.strokeStyle = 'rgba(110,140,200,.6)'; ctx.lineWidth = 1.5; for (let q = 0; q < 70; q++) { const rx = ((q * 113 + G.time * 90) % (VW + 40)) - OX - 20, ryy = (q * 71 + G.time * 520) % (H + 30) - 20; ctx.beginPath(); ctx.moveTo(rx, ryy); ctx.lineTo(rx - 4, ryy + 12); ctx.stroke(); } ctx.restore(); } else if (wk === 'snow' && vilSeason() !== 'winter') { ctx.save(); ctx.fillStyle = 'rgba(255,255,255,.9)'; for (let q = 0; q < 40; q++) { ctx.beginPath(); ctx.arc(((q * 131 + G.time * 16) % VW) - OX + Math.sin(G.time + q) * 10, (q * 83 + G.time * 40) % H, 2 + q % 2, 0, TAU); ctx.fill(); } ctx.restore(); } } /* v3.3 비 오는 마을 */
  /* v3.0 계절 꾸밈: 봄 꽃잎 · 여름 반딧불/나비 · 가을 낙엽 · 겨울 눈 */
  { const sea = vilSeason(); ctx.save(); for (let q = 0; q < 26; q++) { const t = G.time, px = ((q * 137 + t * (sea === 'winter' ? 14 : 30)) % (VW + 40)) - OX - 20 + Math.sin(t + q) * 14, py = ((q * 89 + t * (sea === 'summer' ? 6 : 34)) % (H + 20)) - 10;
      if (sea === 'spring') { ctx.fillStyle = 'rgba(255,190,215,.85)'; ctx.save(); ctx.translate(px, py); ctx.rotate(t + q); ART.E(ctx, 0, 0, 4, 2.4); ctx.fill(); ctx.restore(); }
      else if (sea === 'autumn') { ctx.fillStyle = ['#e8582a', '#f4a030', '#c8401a'][q % 3]; ctx.save(); ctx.translate(px, py); ctx.rotate(t * 2 + q); ART.E(ctx, 0, 0, 5, 2.6); ctx.fill(); ctx.restore(); }
      else if (sea === 'winter') { ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(px, py, 1.6 + (q % 3), 0, TAU); ctx.fill(); }
      else if (night) { ctx.globalAlpha = 0.5 + Math.sin(t * 3 + q) * 0.4; ctx.fillStyle = '#e8ff7a'; ctx.beginPath(); ctx.arc(px, 260 + (q * 31) % 220, 2, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
      else if (q < 6) { const bx = px, byy = 300 + (q * 41) % 160 + Math.sin(t * 2 + q) * 10, wf = Math.abs(Math.sin(t * 10 + q)); ctx.fillStyle = ['#ffd34d', '#ffffff', '#ff9ed8'][q % 3]; ART.E(ctx, bx - 3, byy, 4 * wf + 1, 3); ctx.fill(); ART.E(ctx, bx + 3, byy, 4 * wf + 1, 3); ctx.fill(); } }
    ctx.restore(); }
  for (let q = 0; q < 2; q++) { const x0 = q ? W / 2 + 10 : -OX - 10, x1 = q ? W + OX + 10 : W / 2 - 10, y0 = 104, y1 = 104, my = 132; ctx.strokeStyle = 'rgba(90,60,30,.6)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo((x0 + x1) / 2, my, x1, y1); ctx.stroke();
    for (let f = 1; f < 16; f++) { const t = f / 16, bx = (1 - t) * (1 - t) * x0 + 2 * t * (1 - t) * (x0 + x1) / 2 + t * t * x1, by = (1 - t) * (1 - t) * y0 + 2 * t * (1 - t) * my + t * t * y1, sw = Math.sin(G.time * 3 + f + q) * 1.5; ctx.fillStyle = ['#ff6a6a', '#ffd34d', '#5ab0ff', '#7ae08a', '#ff9ed8'][(f + q) % 5]; ctx.beginPath(); ctx.moveTo(bx - 7, by); ctx.lineTo(bx + 7, by); ctx.lineTo(bx + sw, by + 14); ctx.closePath(); ctx.fill(); } } /* v3.5 마을 하늘에 줄 깃발 */
  vilEvent(P);
  vilDrawActs(P, false); /* 앞쪽(길 위) 마을 사람들 */
  for (const [x, y, sel, c, n] of LBL) { const hit = (P.acts || []).some(a => Math.abs(a.x - x) < 80 && a.y > y + 8 && a.y < y + (a.k === 'hero' ? 104 : 96)); ctx.save(); ctx.globalAlpha = hit && !sel ? 0.6 : 1; /* 기사 머리·하트·리본이 이름표 글씨와 겹칠 때만 살짝 흐리게 */ RR(x - 56, y + 6, 112, 22, 11); ctx.fillStyle = sel ? '#ffe08a' : 'rgba(255,250,236,.94)'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = ART.DK(c, 0.3); ctx.stroke(); txt(n, x, y + 17, 13, '#3a2210', 'center', false, null, 104); ctx.restore(); }
  if (P.heroRib && S.mtitle) { ctx.save(); ctx.translate(P.heroRib[0], P.heroRib[1]); pkTitleRibbon(0, 0, S.mtitle); ctx.restore(); P.heroRib = null; } /* v4.3 내 기사 칭호 리본은 이름표보다 위에 */
  drawCrumbs(); drawFloatMsg();
  // 위쪽: 제목 · 건물 수 · 우편함 (맨 위) · 배치 바꾸기 · 닫기
  pkRibbon(W / 2, 6, '멍멍 마을', '#4aa85a', 240);
  RR(16, 12, 196, 40, 20); ctx.fillStyle = 'rgba(40,30,20,.6)'; ctx.fill(); txt(`🏠 건물 ${VILLAGE.filter((q, k) => vilOn(k)).length} / ${VILLAGE.length}`, 114, 32, 16, '#fff3c4', 'center', false);
  const mailGot = vilGot(0), amt = VILLAGE.filter((q, k) => vilOn(k)).length * vilV(0);
  pkBtn(W - 316, 10, 176, 44, mailGot ? '📬 우편함: 내일 또!' : `📬 우편함 +${amt}`, () => vilDaily(0), { bg: mailGot ? '#9a8a7a' : '#ff8a2a', size: 15, key: 'vmail', disabled: mailGot, shine: !mailGot });
  btn(W - 132, 10, 56, 44, P.move ? '완료' : '옮기기', () => { P.move = P.move ? null : { from: null }; P.sel = null; }, { bg: P.move ? '#ff9a2a' : '#5a8ac8', size: 13, key: 'vmove' });
  btn(W - 70, 10, 54, 44, 'X', () => { VILP = null; musicFor(); }, { bg: '#8a7a9a', size: 19, key: 'vclose' });
  { const b = VILLAGE.map((q, i) => i).filter(i => vilOn(i)), n3 = b.filter(i => vilLv(i) >= 3).length, done = S.vilFest === todayKey(); if (vilFestOk()) pkBtn(16, 58, 196, 40, done ? '🎉 잔치는 내일 또!' : '🎉 마을 잔치 열기', () => vilFest(), { bg: done ? '#9a8a7a' : '#e8509a', size: 15, key: 'vfest', disabled: done, shine: !done }); else { RR(16, 58, 196, 30, 15); ctx.fillStyle = 'rgba(40,30,20,.5)'; ctx.fill(); txt(`🎉 잔치까지: 3단계 ${n3} / ${Math.max(5, b.length)}`, 114, 73, 13, '#ffd8ec', 'center', false); } }
  if (!P.play && !P.mini) btn(16, 104, 196, 34, '♥ 짝꿍 · 칭호', () => { P.bud = !P.bud; P.pdog = null; P.sel = null; }, { bg: P.bud ? '#e8509a' : '#c87aa0', size: 14, key: 'vbud' }); /* v4.1 */
  if (P.fest) { P.fest.t -= G.dt || 0.016; for (let q = 0; q < 50; q++) { const fx = ((q * 97 + G.time * 60 * (1 + q % 3)) % VW) - OX, fy = ((q * 53 + G.time * (80 + q % 5 * 20)) % H); ctx.save(); ctx.translate(fx, fy); ctx.rotate(G.time * 3 + q); ctx.fillStyle = ['#ff5a7a', '#ffd34d', '#5ab0ff', '#7ae08a', '#c87aff'][q % 5]; ctx.fillRect(-4, -2, 8, 4); ctx.restore(); } if (P.fest.t <= 0) { P.fest = null; P.mus = 0; musicFor(); } } /* 잔치 꽃가루 + 모두 춤 */
  if (P.move) { RR(W / 2 - 220, 60, 440, 34, 17); ctx.fillStyle = 'rgba(40,30,20,.72)'; ctx.fill(); txt(P.move.from == null ? '옮길 건물을 누르고, 바꿀 자리의 건물(또는 빈터)을 누르세요' : `「${VILLAGE[P.move.from].n}」과 자리를 바꿀 곳을 누르세요`, W / 2, 77, 14, '#fff3c4', 'center', false, null, 420); }
  else if (P.sel == null) { RR(W / 2 - 200, 60, 400, 30, 15); ctx.fillStyle = 'rgba(40,30,20,.55)'; ctx.fill(); txt('건물을 누르면 효과를 볼 수 있어요 · 강아지 쓰다듬기', W / 2, 75, 13.5, '#fff3c4', 'center', false); }
  if (P.sel != null && !P.move) { const i = P.sel, b = VILLAGE[i], on = vilOn(i), got = vilGot(i);
    pkCard(W / 2 - 330, 446, 660, 88, {}); const lv = vilLv(i); txt(b.n + (on ? `  ${lv}단계` : ''), W / 2 - 314, 466, 18, '#3a2210', 'left', false, null, 260); txt(on ? vilFx(i) : `${b.ch}장을 깨면 지어져요 · ${vilFx(i, 1)}`, W / 2 - 314, 494, 14, '#5a3a1e', 'left', false, null, on ? 330 : 600);
    if (on && lv < 3) txt(`다음 단계: ${vilFx(i, lv + 1)}`, W / 2 - 314, 518, 12.5, '#2e7d32', 'left', false, null, 330);
    if (on) { if (lv < 3) { btn(W / 2 + 28, 462, 140, 50, '', () => vilUpgrade(i), { bg: S.coins >= vilUpCost(i) ? '#e8962a' : '#a99a8a', size: 14, key: 'vup' }); txt(`${lv + 1}단계로`, W / 2 + 98, 476, 13.5, '#fff', 'center'); ART.icon(ctx, 'coin', W / 2 + 70, 498, 16); txt(`${vilUpCost(i)}`, W / 2 + 82, 498, 14, '#fff', 'left'); } else txt('최고 단계 ★★', W / 2 + 98, 488, 14, '#c08a10', 'center', false); }
    if (on && b.tap) btn(W / 2 + 176, 466, 140, 44, got ? '내일 또!' : b.tap === 'mail' ? '받기' : b.tap === 'bread' ? '빵 받기' : b.tap === 'flower' ? '꽃다발 팔기' : b.tap === 'fish' ? '낚시하기' : b.tap === 'star' ? '별똥별 줍기' : '용알 줍기', () => vilDaily(i), { bg: got ? '#9a8a7a' : '#5cb84a', size: 15, key: 'vdo', disabled: got });
    btn(W / 2 + 318, 440, 26, 26, 'x', () => { P.sel = null; }, { bg: '#a99a8a', size: 12, key: 'vselx' }); }
  /* v3.4 같이 놀기 */
  if (P.pdog && !P.play && P.sel == null && !P.move) { const a = P.pdog, nk = actName(a), left = vilPlayLeft(); pkCard(W / 2 - 300, 446, 600, 84, {}); txt(nk, W / 2 - 284, 468, 18, '#3a2210', 'left', false, null, 150); if (a.k === 'dog') { const j = joyOf(a.i); for (let q = 0; q < 10; q++) txt('♥', W / 2 - 220 + q * 9 + (q >= 5 ? 0 : 0), 468, 11, q < j ? '#ff5a8a' : 'rgba(120,90,70,.3)', 'center', false); } txt(left > 0 ? `같이 놀기 · 오늘 ${left}번 남음` : '오늘은 다 놀았어요 · 내일 또!', W / 2 - 284, 492, 12.5, '#5a3a1e', 'left', false, null, 150); if (a.k === 'dog') { const bd = buddyOf(a.i); txt(bd != null ? `짝꿍 ♥ ${UNITS[bd].nick}` : joyOf(a.i) >= 5 ? '행복! 전투 체력 +2%' : `하트 5개면 전투 체력 +2%`, W / 2 - 284, 512, 11.5, bd != null || joyOf(a.i) >= 5 ? '#d8407a' : '#8a6142', 'left', false, null, 150); }
    [['🎾 공', 'ball', '#5cb84a'], ['🥏 원반', 'disc', '#3a9ad0'], ['🙈 숨바꼭질', 'hide', '#e8762a']].forEach(([t, k, c], q) => btn(W / 2 - 120 + q * 136, 462, 128, 52, t, () => vilPlayStart(a, k), { bg: left > 0 ? c : '#a99a8a', size: 15, key: 'vplay' + k, disabled: left <= 0 })); btn(W / 2 + 276, 440, 26, 26, 'x', () => { P.pdog = null; }, { bg: '#a99a8a', size: 12, key: 'vpx' }); }
  if (P.play) { const pl = P.play;
    if (pl.stage === 'seek' || pl.stage === 'hide') { RR(W / 2 - 220, 60, 440, 34, 17); ctx.fillStyle = 'rgba(40,30,20,.75)'; ctx.fill(); txt(pl.stage === 'hide' ? '🙈 숨는 중… 하나, 둘, 셋…' : `🙈 어디 숨었을까? 반짝이는 곳을 눌러요 (${3 - pl.tries}번 남음)`, W / 2, 77, 15, '#fff3c4', 'center', false, null, 420);
      pl.cands.filter(c => c.tree).forEach(c => { ctx.fillStyle = '#4e9a3e'; ctx.beginPath(); ctx.arc(c.x - 16, c.y - 14, 18, 0, TAU); ctx.arc(c.x + 14, c.y - 12, 16, 0, TAU); ctx.arc(c.x, c.y - 26, 18, 0, TAU); ctx.fill(); ctx.fillStyle = '#6ac04a'; ctx.beginPath(); ctx.arc(c.x - 6, c.y - 30, 9, 0, TAU); ctx.fill(); });
      if (pl.stage === 'seek') { const sp = pl.spot; ctx.save(); ctx.translate(sp.tree ? sp.x + 16 : sp.x + 46, sp.tree ? sp.y - 6 : sp.y + 14); ctx.rotate(Math.sin(G.time * 10) * 0.5); ctx.fillStyle = '#c8945a'; ART.E(ctx, 0, -6, 2.6, 7); ctx.fill(); ctx.restore(); /* 살짝 보이는 꼬리 (힌트) */
        pl.cands.forEach((c, k) => { const cx = c.tree ? c.x : c.x, cy = c.tree ? c.y - 30 : c.y - 50, wr = pl.wrong && pl.wrong.c === c; ctx.save(); ctx.globalAlpha = 0.55 + Math.sin(G.time * 5 + k) * 0.3; ctx.beginPath(); ctx.arc(cx, cy - 34, 12, 0, TAU); ctx.fillStyle = wr ? '#c86a6a' : '#fff3a0'; ctx.fill(); ctx.restore(); txt(wr ? '없어요' : '?', cx, cy - 34, wr ? 11 : 15, '#4a2a14', 'center', false); uiPush({ x: cx - 50, y: cy - 70, w: 100, h: 110, key: 'seek' + k, tap: () => vilSeek(c) }); }); if (pl.wrong) { pl.wrong.t -= G.dt || 0.016; if (pl.wrong.t <= 0) pl.wrong = null; } } }
    if (pl.stage === 'aim') { RR(W / 2 - 210, 60, 420, 34, 17); ctx.fillStyle = 'rgba(40,30,20,.75)'; ctx.fill(); txt(pl.kind === 'disc' ? '🥏 원반을 던질 곳(아래 길 위)을 눌러 주세요' : '🎾 공을 던질 곳(아래 길 위)을 눌러 주세요', W / 2, 77, 15, '#fff3c4', 'center', false); ctx.save(); ctx.globalAlpha = 0.18 + Math.sin(G.time * 4) * 0.08; ctx.fillStyle = '#fff3a0'; ctx.fillRect(-OX, 418, VW, 92); ctx.restore(); uiPush({ x: -OX, y: 410, w: VW, h: 110, key: 'vaim', tap: p => vilPlayThrow(p.x, p.y) }); }
    let bx, by; if (pl.stage === 'fly') { pl.ft += G.dt || 0.016; const q = Math.min(1, pl.ft / (pl.kind === 'disc' ? 1.3 : 0.8)); bx = pl.hx + (pl.tx - pl.hx) * q; by = pl.hy - 20 + (pl.ty - pl.hy + 20) * q - Math.sin(q * Math.PI) * (pl.kind === 'disc' ? 50 : 120); if (q >= 1) { pl.stage = 'run'; pl.ball = 'ground'; pl.a.mode = 'fetch'; pl.a.path = [[pl.tx, pl.ty]]; } if (pl.kind === 'disc' && q > 0.3 && !pl.ran) { pl.ran = 1; pl.a.mode = 'fetch'; pl.a.path = [[pl.tx, pl.ty]]; } } /* 원반은 날아가는 동안 미리 달려감 */
    else if (pl.ball === 'ground') { bx = pl.tx; by = pl.ty; } else if (pl.ball === 'carry') { bx = pl.a.x + (pl.a.flip ? -14 : 14); by = pl.a.y - 22; }
    if (bx != null && pl.kind === 'disc') { ctx.fillStyle = 'rgba(30,15,0,.2)'; ART.E(ctx, bx, (pl.ball ? by : pl.ty) + 6, 9, 2.5); ctx.fill(); ctx.save(); ctx.translate(bx, by); ctx.scale(1, 0.4 + Math.abs(Math.sin(G.time * 12)) * 0.25); ctx.beginPath(); ctx.arc(0, 0, 10, 0, TAU); ctx.fillStyle = '#ff6a8a'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#a83a5a'; ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 5, 0, TAU); ctx.strokeStyle = '#ffd0dc'; ctx.stroke(); ctx.restore(); }
    else if (bx != null) { ctx.fillStyle = 'rgba(30,15,0,.2)'; ART.E(ctx, bx, (pl.ball ? by : pl.ty) + 6, 7, 2.5); ctx.fill(); ctx.beginPath(); ctx.arc(bx, by, 7, 0, TAU); ctx.fillStyle = '#d8f040'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#6a7a10'; ctx.stroke(); ctx.beginPath(); ctx.arc(bx - 3, by, 6, -0.9, 0.9); ctx.strokeStyle = '#fff'; ctx.stroke(); } }
  if (!P.bud && !P.mini) { drawMailbox(P); drawGuest(P); drawPetPlay(P); } /* v4.4 오늘의 손님 · v4.7 우체통 */
  vilMini(P);
  if (P.bud && !P.mini) drawVilBud(P);
}
/* ---- v4.4 오늘의 손님: 하루 한 번 마을에 떠돌이 강아지가 와서 부탁 → 들어주면 손님 카드(20장) + 코인 300 · 별가루 1 ---- */
const GUESTS = [
  ['떠돌이 시바 단풍', 0, 'apple'], ['방랑 불독 두부', 1, 'song'], ['여행 비글 솔솔', 2, 'walk'], ['눈길 허스키 서리', 3, 'song'], ['산골 진돗개 바위', 4, 'apple'],
  ['바닷가 코기 파도', 5, 'walk'], ['구름 푸들 몽글', 6, 'song'], ['기차역 닥스 칙칙', 7, 'walk'], ['등대 세인트 등불', 8, 'apple'], ['꼬마 치와와 콩알', 9, 'song'],
  ['사과밭 시바 홍옥', 0, 'apple'], ['노래꾼 불독 쿵짝', 1, 'song'], ['꽃길 비글 민들레', 2, 'walk'], ['별빛 허스키 은하', 3, 'walk'], ['대나무 진돗개 죽순', 4, 'apple'],
  ['빵집 코기 식빵', 5, 'apple'], ['발레 푸들 사뿐', 6, 'song'], ['우체부 닥스 편지', 7, 'walk'], ['눈썰매 세인트 함박', 8, 'song'], ['모험가 치와와 나침', 9, 'walk']];
const GUEST_REQ = { apple: ['사과 3개를 찾아 주세요!', '🍎 마을에 떨어진 사과 3개를 눌러 주워요'], song: ['노래 한 곡 들려줄래요?', '🎵 노래 들려주기 단추를 누르고 끝까지 들어요'], walk: ['같이 산책해요!', '🐾 내 기사 「보리」와 손님이 함께 걸어요'] };
function guestToday() { if ((S.cleared || 0) < 5) return null; let h = 11; for (const ch of todayKey()) h = (h * 31 + ch.charCodeAt(0)) % 100003; const k = h % GUESTS.length; return { k, g: GUESTS[k], done: S.guestDay === todayKey() }; }
function guestStart(P, q) { const G0 = q.g[2]; P.gq = { k: q.k, req: G0, t: 0, n: 0 }; P.gpan = false;
  if (G0 === 'apple') P.gq.apples = [0, 1, 2].map(i => { const x = 120 + Math.random() * 720; return { x, y: roadY(x, i % 3) + 18, got: false }; });
  if (G0 === 'song') { P.gq.t = 6; try { AUD.SFX.winSong && AUD.SFX.winSong(); } catch (e) {} }
  if (G0 === 'walk') P.gq.t = 9; }
function guestDone(P) { const q = P.gq; S.guestDay = todayKey(); S.guestLetter = { d: todayKey(), k: q.k, read: 0 }; /* v4.7 다음 날 우체통에 편지 */ S.guests = S.guests || {}; const nw = !S.guests[q.k]; S.guests[q.k] = (S.guests[q.k] || 0) + 1; S.coins += 300; S.dust = (S.dust || 0) + 1; save(); SFX.rare();
  floatMsg = { s: `${GUESTS[q.k][0]}: 고마워요! ${nw ? '손님 카드를 받았어요! ' : ''}코인 +300 · 별가루 +1`, x: W / 2, y: 110, t: 2.8 }; P.gq = null; P.gpan = true; P.gthank = 2.5; P.gbye = { i: 0, t: 0, pts: [[200, 0], [760, 1], [480, 2, 'wave'], [W + 70, 2]] }; } /* v4.6 부탁을 들어주면 마을을 한 바퀴 돌고 손 흔들며 떠나요 */
/* v4.7 우체통: 부탁을 들어준 손님이 다음 날 「어제 고마웠어요」 편지를 남김 (읽으면 코인 100) */
function letterReady() { const L = S.guestLetter; return !!(L && !L.read && L.d !== todayKey() && GUESTS[L.k]); }
function drawMailbox(P) { if ((S.cleared || 0) < 5) return; const x = 64, y = roadY(64, 2) + 4, on = letterReady(), bob = on ? Math.abs(Math.sin(G.time * 3)) * 3 : 0;
  ctx.fillStyle = 'rgba(30,15,0,.2)'; ART.E(ctx, x, y + 2, 14, 4); ctx.fill(); ctx.fillStyle = '#7a5030'; ctx.fillRect(x - 2.5, y - 30, 5, 30);
  RR(x - 15, y - 50, 30, 22, 9); ctx.fillStyle = ART.lgr(ctx, '#ff6a5a', '#c0392b', 0, y - 50, 0, y - 28); ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#5a1a10'; ctx.stroke(); ctx.fillStyle = '#3a1a10'; ctx.fillRect(x - 9, y - 42, 18, 3);
  ctx.save(); ctx.translate(x + 15, y - 44); ctx.rotate(on ? -1.4 : 0); ctx.fillStyle = '#ffd34d'; ctx.fillRect(0, -2, 3, 14); ctx.fillRect(0, -2, 9, 6); ctx.restore();
  if (on) txt('✉', x, y - 64 - bob, 16, '#fff6c8', 'center');
  if (!P.play && !P.letter && !P.lbox) uiPush({ x: x - 22, y: y - 74, w: 44, h: 76, key: 'vmail', tap: () => { if (on) P.letter = { k: S.guestLetter.k }; else P.lbox = 1; SFX.click(); } }); /* v4.8 새 편지가 없으면 편지함 */
  { const n = Object.keys(S.guests || {}).length; if (n >= GUESTS.length && !S.guestFest && !P.letter && !P.lbox) { S.guestFest = todayKey(); { const d = new Date(); S.festPhoto = { m: d.getMonth() + 1, d: d.getDate(), sea: vilSeason() }; } /* v5.1 잔치 사진 → 앨범 맨 앞 */ S.coins += 3000; S.dust = (S.dust || 0) + 5; VILP.fest = { t: 14 }; try { AUD.play('villfest'); } catch (e) {} SFX.rare(); floatMsg = { s: `🎉 손님 카드 ${GUESTS.length}장 다 모음! 손님 잔치 · 코인 3000 · 별가루 5`, x: W / 2, y: 120, t: 3.6 }; save(); } } /* v4.8 손님 카드 20장 = 마을 잔치 1번 */
  if (P.lbox) { const x0 = W / 2 - 330, y0 = 70; ctx.save(); ctx.fillStyle = 'rgba(20,10,0,.55)'; ctx.fillRect(-OX, 0, VW, H); ctx.restore(); uiPush({ x: -OX, y: 0, w: VW, h: H, key: 'lbxblk', tap: () => {} });
    RR(x0, y0, 660, 400, 16); ctx.fillStyle = ART.lgr(ctx, '#fffaf0', '#f6e6c8', 0, y0, 0, y0 + 400); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#c8902a'; ctx.stroke();
    const LT = S.letters || {}; txt(`📮 편지함 · 받은 편지 ${Object.keys(LT).length} / ${GUESTS.length}`, W / 2, y0 + 28, 18, '#7a3a1a', 'center', false);
    GUESTS.forEach((Gq, k) => { const cx = x0 + 30 + (k % 5) * 122, cy = y0 + 54 + Math.floor(k / 5) * 72, got = LT[k]; RR(cx, cy, 114, 64, 10); ctx.fillStyle = got ? '#fff6dc' : 'rgba(141,90,43,.12)'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = got ? '#c8902a' : 'rgba(141,90,43,.3)'; ctx.stroke();
      if (got) { ctx.save(); RR(cx + 4, cy + 6, 44, 52, 8); ctx.clip(); ART.drawFit(ctx, UNITS[Gq[1]].id, 'i0', cx + 26, cy + 34, 44, 50, { face: 0.85 }); ctx.restore(); txt(Gq[0].split(' ').pop(), cx + 82, cy + 22, 13, '#3e2418', 'center', false, null, 60); txt(got.replace(/^\d+-/, '').replace('-', '/'), cx + 82, cy + 44, 11.5, '#8a6142', 'center', false); uiPush({ x: cx, y: cy, w: 114, h: 64, key: 'lbx' + k, tap: () => { P.letter = { k, old: 1 }; P.lbox = 0; SFX.click(); } }); }
      else txt('?', cx + 57, cy + 32, 22, 'rgba(141,90,43,.4)', 'center', false); });
    btn(W / 2 - 60, y0 + 352, 120, 38, '닫기', () => { P.lbox = 0; }, { bg: '#a99a8a', size: 15, key: 'lbxx' }); return; }
  if (P.letter) { const L = typeof P.letter === 'object' ? P.letter : { k: S.guestLetter.k }, Gq = GUESTS[L.k], x0 = W / 2 - 230, y0 = 120; ctx.save(); ctx.fillStyle = 'rgba(20,10,0,.55)'; ctx.fillRect(-OX, 0, VW, H); ctx.restore(); uiPush({ x: -OX, y: 0, w: VW, h: H, key: 'lblk', tap: () => {} });
    RR(x0, y0, 460, 290, 14); ctx.fillStyle = ART.lgr(ctx, '#fffaf0', '#f6e6c8', 0, y0, 0, y0 + 290); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#c8902a'; ctx.stroke();
    for (let k = 0; k < 7; k++) { ctx.strokeStyle = 'rgba(160,120,70,.18)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0 + 30, y0 + 96 + k * 22); ctx.lineTo(x0 + 430, y0 + 96 + k * 22); ctx.stroke(); }
    ctx.save(); RR(x0 + 20, y0 + 18, 70, 70, 12); ctx.clip(); ART.drawFit(ctx, UNITS[Gq[1]].id, 'i0', x0 + 55, y0 + 56, 66, 66, { face: 0.8 }); ctx.restore();
    txt('✉ 어제 고마웠어요!', x0 + 104, y0 + 40, 19, '#7a3a1a', 'left', false, null, 330); txt(`보낸 이: ${Gq[0]}`, x0 + 104, y0 + 68, 13, '#8a6142', 'left', false, null, 330);
    txtW(`${heroName()} 기사님, 어제 부탁을 들어줘서 정말 고마웠어요. 다른 마을에 가서도 멍멍성 이야기를 자랑할게요! 작은 선물을 넣었어요.`, W / 2, y0 + 150, 14, '#4a2a14', 'center', 400, 22);
    if (!L.old) txt('🎁 코인 +100', W / 2, y0 + 214, 15, '#2e7d32', 'center', false); else txt(`받은 날: ${(S.letters || {})[L.k] || ''}`, W / 2, y0 + 214, 13, '#8a6142', 'center', false);
    const RP = ['또 놀러 와요! 기다릴게요', '덕분에 저도 즐거웠어요', '다음엔 멍멍성 구경시켜 줄게요']; S.replies = S.replies || {};
    if (L.rp) { ctx.save(); RR(x0 + 20, y0 + 96, 420, 140, 12); ctx.fillStyle = 'rgba(255,250,240,.97)'; ctx.fill(); ctx.restore(); txt('✏ 답장으로 보낼 말을 골라요', W / 2, y0 + 112, 14, '#7a3a1a', 'center', false); RP.forEach((r2, q) => btn(x0 + 40, y0 + 128 + q * 34, 380, 30, r2, () => { S.replies[L.k] = q; L.rp = 0; save(); SFX.click(); floatMsg = { s: `${Gq[0].split(' ').pop()}에게 답장을 보냈어요!`, x: W / 2, y: 110, t: 2 }; }, { bg: S.replies[L.k] === q ? '#e8509a' : '#c87aa0', size: 13, key: 'lrp' + q })); return; }
    if (S.replies[L.k] != null) txt(`보낸 답장: 「${RP[S.replies[L.k]]}」`, W / 2, y0 + 192, 12.5, '#a0408a', 'center', false, null, 420);
    if (L.old || S.letters && S.letters[L.k]) btn(W / 2 + 80, y0 + 236, 140, 40, '✏ 답장 쓰기', () => { L.rp = 1; }, { bg: '#c87aa0', size: 14, key: 'lrpb' }); /* v4.9 정해진 문장으로 답장 */
    btn(L.old || S.letters && S.letters[L.k] ? W / 2 - 220 : W / 2 - 70, y0 + 236, 140, 40, L.old ? '편지함으로' : '고마워요!', () => { if (L.old) { P.letter = 0; P.lbox = 1; return; } S.guestLetter.read = 1; S.letters = S.letters || {}; S.letters[L.k] = todayKey(); S.coins += 100; P.letter = 0; save(); SFX.coin(); }, { bg: '#5cb84a', size: 16, key: 'lok' }); } }
function drawPetPlay(P) { /* v5.1 손님이 없어도 펫 놀기 그림 (전엔 손님 그림 안에 있어서 손님이 가면 안 보였음) */
  for (const a of (P.acts || [])) if (!P.bc && a.k === 'pet' && a.playT > 0 && a.mate && a.mate.playT > 0) { const e2 = (2.8 - a.playT) * 1.4, ph = e2 % 1, f0 = Math.floor(e2) % 2 ? a.mate : a, f1 = f0 === a ? a.mate : a, bx = f0.x + (f1.x - f0.x) * ph, by = f0.y + (f1.y - f0.y) * ph - 22 - Math.sin(ph * Math.PI) * 38; ctx.save(); ctx.fillStyle = 'rgba(30,15,0,.18)'; ART.E(ctx, bx, f0.y + (f1.y - f0.y) * ph + 2, 5, 1.6); ctx.fill(); ctx.beginPath(); ctx.arc(bx, by, 6, 0, TAU); ctx.fillStyle = '#ff5a5a'; ctx.fill(); ctx.lineWidth = 1.4; ctx.strokeStyle = '#8a1a1a'; ctx.stroke(); ctx.beginPath(); ctx.arc(bx, by, 6, -0.6 + ph * 6, 0.6 + ph * 6); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore(); uiPush({ x: bx - 26, y: by - 26, w: 52, h: 52, key: 'vball', tap: () => { P.bc = { pet: f1, x: bx, y: by, ph: 'h', t: 0, n: 0 }; } }); } /* v5.1 펫끼리 공 주고받기 · v5.2 공을 누르면 기사가 받기 */
  if (P.bc) { /* v5.2 공 놀이 따라 하기: 공 누르기 → 기사가 받아서 펫에게 다시 던짐 · 3번이면 하트 */
    const c = P.bc, hero = (P.acts || []).find(a => a.k === 'hero'), pet = c.pet, dt = G.dt || 0.016; c.t += dt;
    if (!hero || !pet) { P.bc = null; return; }
    pet.playT = Math.max(pet.playT || 0, 1); if (pet.mate) pet.mate.playT = Math.max(pet.mate.playT || 0, 1); pet.path = []; hero.path = [];
    const hx = hero.x, hy = hero.y - 46, px = pet.x, py = pet.y - 24; let bx, by;
    if (c.ph === 'h') { const k = Math.min(1, c.t / 0.55); bx = c.x + (hx - c.x) * k; by = c.y + (hy - c.y) * k - Math.sin(k * Math.PI) * 40; if (k >= 1) { c.ph = 'p'; c.t = 0; c.n++; c.got = 0.8; } }
    else if (c.ph === 'p') { const k = Math.min(1, c.t / 0.65); bx = hx + (px - hx) * k; by = hy + (py - hy) * k - Math.sin(k * Math.PI) * 55; if (k >= 1) { c.t = 0; if (c.n >= 3) { c.ph = 'end'; } else c.ph = 'w'; } }
    else if (c.ph === 'w') { bx = px; by = py - 18 - Math.abs(Math.sin(c.t * 5)) * 26; if (c.t > 4) { P.bc = null; return; } uiPush({ x: bx - 28, y: by - 28, w: 56, h: 56, key: 'vball', tap: () => { c.ph = 'h'; c.t = 0; c.x = bx; c.y = by; } }); txt('👆 공을 눌러요!', px, py - 84, 13, '#fff3a0', 'center', true); }
    else { bx = px; by = py; for (let q = 0; q < 6; q++) { const an = q / 6 * TAU + c.t * 2; txt('♥', (hx + px) / 2 + Math.cos(an) * (30 + c.t * 30), (hy + py) / 2 - 20 + Math.sin(an) * (20 + c.t * 20) - c.t * 20, 18, q % 2 ? '#ff5a8a' : '#ffb0cc', 'center', false); } if (c.t < 1.6) txt('공 놀이 최고! ♥', (hx + px) / 2, (hy + py) / 2 - 64, 16, '#fff0f6', 'center', true); if (c.t > 1.8) { S.ballHearts = (S.ballHearts || 0) + 1; P.bc = null; pet.playT = 0; if (pet.mate) pet.mate.playT = 0; } return; }
    ctx.save(); ctx.beginPath(); ctx.arc(bx, by, 7, 0, TAU); ctx.fillStyle = '#ff5a5a'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#8a1a1a'; ctx.stroke(); ctx.beginPath(); ctx.arc(bx, by, 7, c.t * 9, c.t * 9 + 1.2); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    txt(`공 ${c.n} / 3`, hx, hy - 66, 13, '#fff3a0', 'center', true);
    if (c.got > 0) { c.got -= dt; txt('받았다!', hx, hy - 86, 14, '#ffffff', 'center', true); }
  }
  for (const a of (P.acts || [])) if (a.k === 'pet' && a.playT > 0) { ctx.save(); ctx.globalAlpha *= 0.62; txt(['♪', '♥', '☆'][(Math.floor(a.playT * 3) + (a.id || '').length) % 3], a.x, a.y - 40 - Math.abs(Math.sin(a.playT * 6)) * 8, 15, '#ff7ab0', 'center'); ctx.restore(); } /* v5.0 펫끼리 놀기 */
}
function drawGuest(P, night) { const q = guestToday(); if (!q) return; const hero = (P.acts || []).find(a => a.k === 'hero');
  if (q.done && !P.gbye && !P.gpan) return; /* 떠난 손님은 내일까지 안 보여요 */
  if (!q.done && S.replies && S.replies[q.k] != null && !(S.repThx || {})[q.k + ':' + todayKey()]) { P.gThx = (P.gThx || 0) + (G.dt || 0.016); if (P.gpos && P.gThx > 1 && P.gThx < 6) drawBubbleAt(P.gpos.x, P.gpos.y - 80, '답장 고마워요! 잘 읽었어요'); if (P.gThx >= 6) { S.repThx = S.repThx || {}; S.repThx[q.k + ':' + todayKey()] = 1; save(); } } /* v5.0 답장 받은 손님의 인사 */
  for (const a of (P.acts || [])) if (a.k === 'pet' && a.greetT > 0) { drawBubble(a.x + (a.x < (P.gpos ? P.gpos.x : 0) ? -30 : 30), a.y - 40, ['안녕!', '반가워요!', '놀러 왔어요?'][(a.id || '').length % 3], 1); if (a.greetT < 1.6 && P.gpos) drawBubble(P.gpos.x, P.gpos.y - 74, `${(PETS.find(p => p.id === a.id) || { n: '펫' }).n.split(' ').pop()}야 안녕!`, 1); } /* v4.9 펫 ↔ 손님 인사 */
  const g = P.gpos = P.gpos || { x: 880, y: roadY(880, 2) + 10, flip: true, tgo: 0 }; const dt = G.dt || 0.016;
  if (P.gbye && !P.gpan) { const B2 = P.gbye, pt = B2.pts[B2.i]; if (!pt) { P.gbye = null; return; } const tx = pt[0], ty = roadY(Math.min(W - 10, Math.max(10, tx)), pt[1]) + 10, dx = tx - g.x, dy = ty - g.y, dd = Math.hypot(dx, dy);
    if (dd > 3) { const sp = Math.min(dd, 70 * dt); g.x += dx / dd * sp; g.y += dy / dd * sp; g.flip = dx < 0; g.mv = true; }
    else { g.mv = false; if (pt[2] === 'wave') { B2.t += dt; g.flip = false; if (B2.t > 2.4) { B2.i++; B2.t = 0; } } else B2.i++; }
    if (B2.pts[B2.i] && B2.pts[B2.i][2] === 'wave' && !g.mv) { const wv = Math.sin(G.time * 12) * 0.6; ctx.save(); ctx.translate(g.x + 12, g.y - 40); ctx.rotate(-0.6 + wv); ctx.fillStyle = '#fff3e0'; ctx.strokeStyle = '#5a3a1e'; ctx.lineWidth = 1.5; ART.E(ctx, 0, -10, 6, 7); ctx.fill(); ctx.stroke(); ctx.restore(); drawBubble(g.x + 6, g.y - 70, '안녕! 또 올게요!', 1); } }
  if (P.gq && P.gq.req === 'walk' && hero) { const tx = hero.x + (hero.flip ? 34 : -34), ty = hero.y + 2, dx = tx - g.x, dy = ty - g.y, dd = Math.hypot(dx, dy); if (!g.tgo && dd > 14) g.tgo = 1; else if (g.tgo && dd < 3) g.tgo = 0; if (g.tgo) { const sp = Math.min(dd, 20 * dt); g.x += dx / dd * sp; g.y += dy / dd * sp; g.flip = dx < 0; g.mv = true; } else { g.mv = false; g.flip = hero.flip; } P.gq.t -= dt; if (P.gq.t <= 0) guestDone(P); }
  else g.mv = false;
  const u = q.g[1]; ctx.fillStyle = 'rgba(30,15,0,.2)'; ART.E(ctx, g.x, g.y + 2, 16, 4); ctx.fill(); drawCuteDog('vguest', UNITS[u].id, UNITS[u].id, g.x, g.y, 0.55, { flip: g.flip, ph: 3, em: false });
  ctx.save(); ctx.translate(g.x + (g.flip ? 14 : -14), g.y - 34); ctx.rotate(g.flip ? 0.5 : -0.5); ctx.strokeStyle = '#7a5030'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(0, 10); ctx.lineTo(0, -14); ctx.stroke(); ctx.fillStyle = '#e86a5a'; ctx.beginPath(); ctx.arc(0, -16, 7, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-2, -18, 1.6, 0, TAU); ctx.arc(3, -14, 1.6, 0, TAU); ctx.fill(); ctx.restore(); /* 봇짐 */
  if (!q.done && !P.gq && !(P.acts || []).some(a => a.k === 'pet' && a.greetT > 0)) { const by = g.y - 66 - Math.abs(Math.sin(G.time * 3)) * 4; ctx.beginPath(); ctx.arc(g.x, by, 11, 0, TAU); ctx.fillStyle = '#ffb300'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke(); txt('!', g.x, by + 1, 14, '#fff', 'center', false); }
  if (P.gthank > 0) { P.gthank -= dt; txt('♥', g.x, g.y - 64 - (2.5 - P.gthank) * 8, 16, '#ff6a9a', 'center'); }
  if (!P.play && !P.mini) uiPush({ x: g.x - 24, y: g.y - 56, w: 48, h: 60, key: 'vguest', tap: () => { P.gpan = !P.gpan; SFX.click(); } });
  if (P.gq && P.gq.req === 'apple') { for (const a of P.gq.apples) if (!a.got) { const bob = Math.sin(G.time * 3 + a.x) * 2; ctx.fillStyle = '#e8323a'; ctx.beginPath(); ctx.arc(a.x, a.y - 6 + bob, 8, 0, TAU); ctx.fill(); ctx.strokeStyle = '#7a1a10'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.fillStyle = '#4a9a3a'; ART.E(ctx, a.x + 4, a.y - 15 + bob, 4, 2); ctx.fill(); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35 + Math.sin(G.time * 5) * 0.2; ctx.drawImage(ART.softDot('#ffe08a'), a.x - 18, a.y - 24, 36, 36); ctx.restore();
      uiPush({ x: a.x - 18, y: a.y - 26, w: 36, h: 36, key: 'vapple' + Math.round(a.x), tap: () => { a.got = true; P.gq.n++; SFX.pick(); if (P.gq.n >= 3) guestDone(P); } }); }
    RR(W / 2 - 150, 98, 300, 30, 15); ctx.fillStyle = 'rgba(40,30,20,.75)'; ctx.fill(); txt(`🍎 사과 ${P.gq.n} / 3 · 반짝이는 사과를 눌러요`, W / 2, 113, 13, '#fff3c4', 'center', false); }
  if (P.gq && P.gq.req === 'song') { P.gq.t -= dt; for (let k = 0; k < 3; k++) { const ph = (G.time * 0.8 + k / 3) % 1; ctx.globalAlpha = Math.sin(ph * Math.PI); txt('♪', g.x - 20 + k * 20, g.y - 60 - ph * 30, 16, '#ffd34d', 'center'); } ctx.globalAlpha = 1; RR(W / 2 - 120, 98, 240, 30, 15); ctx.fillStyle = 'rgba(40,30,20,.75)'; ctx.fill(); txt(`🎵 노래 듣는 중… ${Math.max(0, Math.ceil(P.gq.t))}`, W / 2, 113, 13, '#fff3c4', 'center', false); if (P.gq.t <= 0) guestDone(P); }
  if (P.gq && P.gq.req === 'walk') { RR(W / 2 - 130, 98, 260, 30, 15); ctx.fillStyle = 'rgba(40,30,20,.75)'; ctx.fill(); txt(`🐾 같이 산책 중… ${Math.max(0, Math.ceil(P.gq.t))}`, W / 2, 113, 13, '#fff3c4', 'center', false); }
  if (P.gpan) { const x0 = W / 2 - 300, y0 = 130; ctx.save(); ctx.fillStyle = 'rgba(20,10,0,.55)'; ctx.fillRect(-OX, 0, VW, H); ctx.restore(); uiPush({ x: -OX, y: 0, w: VW, h: H, key: 'gblk', tap: () => { P.gpan = false; } }); pkCard(x0, y0, 600, 330, {});
    ctx.save(); RR(x0 + 16, y0 + 16, 150, 150, 14); ctx.fillStyle = ART.lgr(ctx, '#fff8e6', '#f2d6a0', 0, y0, 0, y0 + 160); ctx.fill(); ctx.clip(); ART.drawFit(ctx, UNITS[u].id, 'i0', x0 + 91, y0 + 94, 130, 130, { face: 0.8 }); ctx.restore();
    txt('오늘의 손님', x0 + 186, y0 + 30, 13, '#a0652a', 'left', false); txt(q.g[0], x0 + 186, y0 + 56, 18, '#3e2418', 'left', false, null, 390);
    txt('「' + GUEST_REQ[q.g[2]][0] + '」', x0 + 186, y0 + 88, 15, '#c0501a', 'left', false, null, 390); txt(GUEST_REQ[q.g[2]][1], x0 + 186, y0 + 114, 12.5, '#6b4426', 'left', false, null, 390);
    if (q.done) txt('오늘 부탁은 다 들어줬어요 · 내일 새 손님이 와요', x0 + 186, y0 + 146, 13, '#2e7d32', 'left', false, null, 390);
    else btn(x0 + 186, y0 + 132, 200, 40, q.g[2] === 'apple' ? '사과 찾으러 가기' : q.g[2] === 'song' ? '노래 들려주기' : '같이 산책하기', () => guestStart(P, q), { bg: '#ff8a2a', size: 15, key: 'gstart' });
    const GS = S.guests || {}; txt(`손님 카드 ${Object.keys(GS).length} / ${GUESTS.length}`, x0 + 16, y0 + 190, 14, '#3e2418', 'left', false);
    GUESTS.forEach((gg, k) => { const cx = x0 + 16 + (k % 10) * 57, cy = y0 + 204 + Math.floor(k / 10) * 60, got = GS[k]; RR(cx, cy, 52, 54, 8); ctx.fillStyle = got ? 'rgba(255,201,60,.35)' : 'rgba(141,90,43,.12)'; ctx.fill(); ctx.save(); RR(cx, cy, 52, 54, 8); ctx.clip(); if (!got) { ctx.globalAlpha = 0.25; ctx.filter = 'brightness(0)'; } ART.drawFit(ctx, UNITS[gg[1]].id, 'i0', cx + 26, cy + 30, 46, 46, { face: 0.85 }); ctx.restore(); if (got > 1) txt(`×${got}`, cx + 44, cy + 46, 11.5, '#8a5a1a', 'center', false); });
    btn(x0 + 520, y0 + 10, 66, 32, '닫기', () => { P.gpan = false; }, { bg: '#a99a8a', size: 13, key: 'gx' }); } }
/* v2.8 실제 시간 날씨: 3시간마다 바뀜(날짜+시간대로 정해져 모두 같음) · 밤은 19시~6시 */
const RW = { sun: { n: '맑음', ic: '☀', d: '뼈다귀가 10% 빨리 모여요', c: '#ffcf3a' }, rain: { n: '비', ic: '☔', d: '물 몬스터 체력 +25% · 마나 회복 +20%', c: '#7ac8ff' }, snow: { n: '눈', ic: '❄', d: '모두 10% 느려요 · 경험치 +15%', c: '#e0f0ff' }, cloud: { n: '흐림', ic: '☁', d: '특별한 효과 없음', c: '#c8c8d8' } };
function weatherNow() { const d = new Date(), hr = d.getHours(), blk = Math.floor(hr / 3), key = d.getFullYear() * 1000 + (d.getMonth() + 1) * 40 + d.getDate(); let h = (key * 131 + blk * 977) % 1000; const mo = d.getMonth() + 1, winter = mo === 12 || mo <= 2;
  const w = winter ? (h < 300 ? 'snow' : h < 450 ? 'cloud' : 'sun') : (h < 250 ? 'rain' : h < 420 ? 'cloud' : 'sun'); return { k: window.__wk || w, night: window.__night != null ? window.__night : (hr >= 19 || hr < 6) }; } /* __wk · __night: 검사용 */
function buyBox(bx) { const useGem = true; /* v4.4 보석만 */
  if (S.inv.length >= 28) { SHOPP.msg = { s: '장비 가방이 가득 찼어요 (장비 탭에서 정리)', t: 1.8 }; return; }
  if (useGem) { if ((S.gems || 0) < bx.gem) { SHOPP.msg = { s: '보석이 모자라요', t: 1.6 }; return; } S.gems -= bx.gem; } else { if (S.coins < bx.price) { SHOPP.msg = { s: '코인이 모자라요', t: 1.6 }; return; } S.coins -= bx.price; }
  const it = makeItem(Math.max(5, S.cleared), 0, bx.id); S.inv.push(it); buyLog(`${bx.n} → ${RAR[it.r]} ${it.name}`, useGem, useGem ? bx.gem : bx.price); SFX.rare(); SHOPP.got = { it, t: 2.4 }; save();
}
/* v2.9 상점 아이템 고급 그림: 아이템마다 직접 그린 그림(그림자·광택·테두리) · 128px로 한 번 그려 두고 줄여 씀 */
const ITEMART = {};
function itemArt(id, x, y, s) { let c = ITEMART[id]; if (!c) { c = ITEMART[id] = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); g.translate(64, 64); paintItem(g, id); } ctx.drawImage(c, x - s / 2, y - s / 2, s, s); }
function paintItem(g, id) {
  const L = (c, a) => ART.LI(c, a), D = (c, a) => ART.DK(c, a), lin = (a, b, y0, y1) => { const q = g.createLinearGradient(0, y0, 0, y1); q.addColorStop(0, a); q.addColorStop(1, b); return q; }, rad = (a, b, r, ox, oy) => { const q = g.createRadialGradient(ox || 0, oy || 0, 2, 0, 0, r); q.addColorStop(0, a); q.addColorStop(1, b); return q; };
  const ol = (w) => { g.lineWidth = w || 4; g.strokeStyle = '#3a2214'; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke(); };
  const shine = (x, y, rx, ry, a) => { g.save(); g.globalAlpha = a || 0.7; g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(x, y, rx, ry, -0.5, 0, Math.PI * 2); g.fill(); g.restore(); };
  const spark = (x, y, r, col) => { g.save(); g.fillStyle = col || '#fffbe0'; g.beginPath(); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, rr = k % 2 ? r * 0.3 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); g.restore(); };
  const bone = (x, y, len, rot, col) => { g.save(); g.translate(x, y); g.rotate(rot); g.beginPath(); g.rect(-len / 2, -6, len, 12); [[-len / 2, -7], [-len / 2, 7], [len / 2, -7], [len / 2, 7]].forEach(([a, b]) => { g.moveTo(a + 9, b); g.arc(a, b, 9, 0, Math.PI * 2); }); g.fillStyle = lin('#fffaf0', col || '#e8d4b0', -14, 14); g.fill(); ol(3.5); g.beginPath(); g.rect(-len / 2, -6, len, 12); g.fillStyle = lin('#fffaf0', col || '#e8d4b0', -6, 6); g.fill(); g.restore(); };
  g.save(); g.fillStyle = 'rgba(40,20,0,.22)'; g.beginPath(); g.ellipse(0, 50, 40, 8, 0, 0, Math.PI * 2); g.fill(); g.restore();
  if (id === 'bonebag') { bone(10, -30, 46, -0.6); bone(-12, -32, 40, 0.5, '#f0dcb8');
    g.beginPath(); g.moveTo(-30, -18); g.quadraticCurveTo(-50, 20, -38, 44); g.quadraticCurveTo(0, 56, 38, 44); g.quadraticCurveTo(50, 20, 30, -18); g.quadraticCurveTo(0, -8, -30, -18); g.fillStyle = lin('#d8a868', '#9a6a38', -18, 50); g.fill(); ol();
    g.save(); g.clip(); g.globalAlpha = 0.18; g.strokeStyle = '#5a3a18'; g.lineWidth = 1.5; for (let k = -50; k < 50; k += 7) { g.beginPath(); g.moveTo(k, -20); g.lineTo(k + 20, 56); g.stroke(); } g.restore();
    g.beginPath(); g.ellipse(0, -16, 32, 8, 0, 0, Math.PI * 2); g.fillStyle = '#c8945a'; g.fill(); ol(3);
    g.beginPath(); g.moveTo(-24, -6); g.quadraticCurveTo(0, 2, 24, -6); g.lineWidth = 6; g.strokeStyle = '#e8423a'; g.stroke(); g.fillStyle = '#e8423a'; g.beginPath(); g.ellipse(-8, -2, 9, 6, -0.4, 0, Math.PI * 2); g.ellipse(8, -2, 9, 6, 0.4, 0, Math.PI * 2); g.fill(); ol(2.5);
    g.save(); g.translate(0, 24); g.fillStyle = '#fff3d6'; g.beginPath(); g.arc(0, 0, 11, 0, Math.PI * 2); g.fill(); g.fillStyle = '#9a6a38'; g.beginPath(); g.ellipse(0, 3, 4.5, 3.5, 0, 0, Math.PI * 2); g.fill(); [[-6, -4], [-2, -7], [2, -7], [6, -4]].forEach(([a, b]) => { g.beginPath(); g.arc(a, b, 2, 0, Math.PI * 2); g.fill(); }); g.restore();
    shine(-26, 6, 6, 12, 0.35); }
  else if (id === 'manacandy') { g.beginPath(); g.moveTo(-34, -24); g.quadraticCurveTo(-44, 20, -30, 44); g.lineTo(30, 44); g.quadraticCurveTo(44, 20, 34, -24); g.closePath(); g.fillStyle = 'rgba(200,236,255,.55)'; g.fill();
    g.save(); g.clip(); const cs = ['#7ac8ff', '#ffd34d', '#ff9ed8', '#9ae08a', '#b8a0ff']; for (let k = 0; k < 16; k++) { const x = -28 + (k * 23) % 56, y = 40 - Math.floor(k / 4) * 13 - (k % 2) * 5; g.save(); g.translate(x, y); g.rotate(k); g.fillStyle = cs[k % 5]; g.beginPath(); for (let q = 0; q < 10; q++) { const a = q * Math.PI / 5 - Math.PI / 2, r = q % 2 ? 4 : 9; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); g.lineWidth = 1.5; g.strokeStyle = 'rgba(60,40,90,.5)'; g.stroke(); g.restore(); } g.restore();
    g.beginPath(); g.moveTo(-34, -24); g.quadraticCurveTo(-44, 20, -30, 44); g.lineTo(30, 44); g.quadraticCurveTo(44, 20, 34, -24); g.closePath(); ol();
    g.beginPath(); g.rect(-38, -40, 76, 16); g.fillStyle = lin('#8ac8ff', '#3a78c8', -40, -24); g.fill(); ol(3.5); g.beginPath(); g.rect(-30, -50, 60, 12); g.fillStyle = lin('#ffe08a', '#e0a020', -50, -38); g.fill(); ol(3);
    shine(-24, 0, 5, 18, 0.6); spark(30, -46, 9, '#fffbe0'); }
  else if (id === 'drum') { g.save(); g.rotate(-0.5); g.fillStyle = lin('#e8c890', '#a87a40', -3, 3); g.fillRect(-50, -50, 8, 56); g.restore(); g.save(); g.rotate(0.5); g.fillStyle = '#c89860'; g.fillRect(42, -50, 8, 56); g.restore();
    g.beginPath(); g.ellipse(0, 30, 44, 14, 0, 0, Math.PI); g.lineTo(-44, -16); g.ellipse(0, -16, 44, 14, 0, Math.PI, 0, true); g.closePath(); g.fillStyle = lin('#ff6a4a', '#b8281a', -20, 44); g.fill(); ol();
    g.strokeStyle = '#ffe08a'; g.lineWidth = 3; g.beginPath(); for (let k = 0; k <= 8; k++) { const x = -40 + k * 10; g.lineTo(x, k % 2 ? 26 : -10); } g.stroke();
    [-12, 28].forEach(yy => { g.beginPath(); g.ellipse(0, yy, 45, 10, 0, 0, Math.PI); g.lineWidth = 7; g.strokeStyle = '#e0a020'; g.stroke(); });
    g.beginPath(); g.ellipse(0, -16, 44, 14, 0, 0, Math.PI * 2); g.fillStyle = lin('#fff8ea', '#e8d8b8', -30, -2); g.fill(); ol();
    g.save(); g.translate(0, -16); g.scale(1, 0.32); g.fillStyle = 'rgba(232,66,58,.5)'; g.beginPath(); g.arc(0, 4, 14, 0, Math.PI * 2); g.fill(); g.restore();
    [[-34, -40, -0.9], [34, -40, 0.9]].forEach(([a, b, r]) => { g.save(); g.translate(a, b); g.rotate(r); g.fillStyle = '#c8945a'; g.fillRect(-3, -4, 6, 34); g.beginPath(); g.arc(0, -6, 7, 0, Math.PI * 2); g.fillStyle = '#ffe08a'; g.fill(); ol(2.5); g.restore(); });
    shine(-26, 10, 4, 12, 0.4); }
  else if (id === 'charm') { g.beginPath(); g.moveTo(0, -48); g.quadraticCurveTo(40, -44, 42, -28); g.quadraticCurveTo(44, 20, 0, 46); g.quadraticCurveTo(-44, 20, -42, -28); g.quadraticCurveTo(-40, -44, 0, -48); g.fillStyle = lin('#b8f0a0', '#3a9a4a', -48, 46); g.fill(); ol();
    g.beginPath(); g.moveTo(0, -38); g.quadraticCurveTo(30, -34, 32, -22); g.quadraticCurveTo(33, 14, 0, 34); g.quadraticCurveTo(-33, 14, -32, -22); g.quadraticCurveTo(-30, -34, 0, -38); g.lineWidth = 3; g.strokeStyle = '#ffe08a'; g.stroke();
    g.fillStyle = '#fff8e0'; g.beginPath(); g.ellipse(0, 4, 13, 11, 0, 0, Math.PI * 2); g.fill(); [[-14, -12], [-5, -19], [5, -19], [14, -12]].forEach(([a, b]) => { g.beginPath(); g.ellipse(a, b, 5.5, 6.5, 0, 0, Math.PI * 2); g.fill(); }); g.save(); g.fillStyle = 'rgba(40,110,50,.35)'; g.beginPath(); g.ellipse(0, 7, 8, 5, 0, 0, Math.PI * 2); g.fill(); g.restore();
    g.fillStyle = '#e8423a'; g.beginPath(); g.moveTo(-6, 44); g.lineTo(6, 44); g.lineTo(8, 58); g.lineTo(-8, 58); g.closePath(); g.fill(); ol(2.5); g.beginPath(); g.arc(0, 44, 5, 0, Math.PI * 2); g.fillStyle = '#ffe08a'; g.fill(); ol(2);
    shine(-22, -20, 5, 12, 0.5); spark(34, -40, 8); }
  else if (id === 'bomb') { g.strokeStyle = '#6a4a2a'; g.lineWidth = 5; g.beginPath(); g.moveTo(16, -34); g.quadraticCurveTo(30, -50, 22, -56); g.stroke(); spark(22, -56, 12, '#ffd34d'); spark(22, -56, 6, '#ffffff');
    const pf = [[0, 4, 34], [-24, 14, 20], [24, 14, 20], [-18, -14, 20], [18, -14, 20], [0, -22, 18]]; pf.forEach(([a, b, r]) => { g.beginPath(); g.arc(a, b, r + 3, 0, Math.PI * 2); g.fillStyle = '#3a2214'; g.fill(); }); pf.forEach(([a, b, r]) => { g.beginPath(); g.arc(a, b, r, 0, Math.PI * 2); const q = g.createRadialGradient(a - r * 0.3, b - r * 0.4, 2, a, b, r); q.addColorStop(0, '#f8eeff'); q.addColorStop(1, '#b48aff'); g.fillStyle = q; g.fill(); });
    g.fillStyle = '#3a2214'; g.beginPath(); g.arc(-10, 6, 4, 0, Math.PI * 2); g.arc(10, 6, 4, 0, Math.PI * 2); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(-9, 5, 1.5, 0, Math.PI * 2); g.arc(11, 5, 1.5, 0, Math.PI * 2); g.fill(); g.beginPath(); g.arc(0, 13, 5, 0.1, Math.PI - 0.1); g.lineWidth = 2.5; g.strokeStyle = '#3a2214'; g.stroke(); g.fillStyle = 'rgba(255,120,170,.5)'; g.beginPath(); g.ellipse(-18, 14, 5, 3, 0, 0, Math.PI * 2); g.ellipse(18, 14, 5, 3, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#6a4a8a'; g.fillRect(8, -38, 14, 10); }
  else if (id === 'feather') { g.save(); g.rotate(0.55); const fg = g.createRadialGradient(0, 0, 4, 0, 0, 70); fg.addColorStop(0, 'rgba(255,240,160,.7)'); fg.addColorStop(1, 'rgba(255,240,160,0)'); g.fillStyle = fg; g.beginPath(); g.arc(0, 0, 60, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(0, -54); g.quadraticCurveTo(30, -30, 22, 10); g.quadraticCurveTo(14, 34, 0, 40); g.quadraticCurveTo(-14, 34, -22, 10); g.quadraticCurveTo(-30, -30, 0, -54); g.fillStyle = lin('#fff6c8', '#f0b830', -54, 40); g.fill(); ol();
    g.strokeStyle = 'rgba(160,100,10,.55)'; g.lineWidth = 2; for (let k = -40; k < 30; k += 9) { g.beginPath(); g.moveTo(0, k); g.lineTo(18 - Math.abs(k) * 0.12, k - 10); g.moveTo(0, k); g.lineTo(-18 + Math.abs(k) * 0.12, k - 10); g.stroke(); }
    g.beginPath(); g.moveTo(0, -50); g.lineTo(0, 58); g.lineWidth = 4; g.strokeStyle = '#a86a10'; g.stroke(); g.beginPath(); g.moveTo(14, 18); g.lineTo(22, 22); g.moveTo(-14, 20); g.lineTo(-24, 22); g.lineWidth = 3; g.strokeStyle = '#3a2214'; g.stroke(); g.restore();
    spark(-30, -34, 10); spark(34, 20, 7); shine(-10, -24, 4, 10, 0.6); }
  else if (id === 'lunch') { g.beginPath(); g.rect(-44, -14, 88, 54); g.fillStyle = lin('#ffb86b', '#d8742a', -14, 40); g.fill(); ol();
    g.beginPath(); g.rect(-48, -30, 96, 20); g.fillStyle = lin('#ffd0a0', '#e8843a', -30, -10); g.fill(); ol();
    g.fillStyle = '#fff3d6'; [[-30, 8], [0, 22], [28, 6]].forEach(([a, b]) => { g.save(); g.translate(a, b); g.rotate(0.4); g.fillRect(-9, -2.5, 18, 5); [[-9, -2.5], [-9, 2.5], [9, -2.5], [9, 2.5]].forEach(([p, q]) => { g.beginPath(); g.arc(p, q, 3.5, 0, Math.PI * 2); g.fill(); }); g.restore(); });
    g.beginPath(); g.moveTo(-10, -30); g.lineTo(-24, -52); g.lineTo(-4, -44); g.lineTo(0, -30); g.lineTo(4, -44); g.lineTo(24, -52); g.lineTo(10, -30); g.closePath(); g.fillStyle = '#5cb8e8'; g.fill(); ol(3);
    g.beginPath(); g.rect(-8, -34, 16, 24); g.fillStyle = '#3a8ac8'; g.fill(); ol(3); g.save(); g.fillStyle = 'rgba(255,255,255,.7)'; for (let k = -40; k < 44; k += 14) { g.beginPath(); g.arc(k, -20, 2.5, 0, Math.PI * 2); g.fill(); } g.restore();
    shine(-34, 4, 4, 10, 0.4); }
  else if (id === 'clover') { g.strokeStyle = '#2e7d32'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, 8); g.quadraticCurveTo(6, 34, 18, 52); g.stroke();
    [0, 1, 2, 3].forEach(k => { g.save(); g.rotate(k * Math.PI / 2 + Math.PI / 4); g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(-26, -14, -24, -44, -6, -42); g.quadraticCurveTo(0, -36, 0, -30); g.quadraticCurveTo(0, -36, 6, -42); g.bezierCurveTo(24, -44, 26, -14, 0, 0); g.fillStyle = lin('#9aec7a', '#2e9a3a', -44, 0); g.fill(); ol(3.5); g.beginPath(); g.moveTo(0, -4); g.lineTo(0, -28); g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,.55)'; g.stroke(); g.restore(); });
    g.beginPath(); g.arc(0, 0, 6, 0, Math.PI * 2); g.fillStyle = '#ffd34d'; g.fill(); ol(2); spark(34, -36, 10); spark(-36, 30, 7); }
  else if (id === 'scroll') { g.save(); g.rotate(-0.15); g.beginPath(); g.rect(-34, -36, 68, 70); g.fillStyle = lin('#fff6dc', '#e8cf98', -36, 34); g.fill(); ol();
    g.strokeStyle = 'rgba(140,90,40,.45)'; g.lineWidth = 3; [-18, -6, 6, 18].forEach(y => { g.beginPath(); g.moveTo(-22, y); g.lineTo(y === 18 ? 6 : 22, y); g.stroke(); });
    [-40, 40].forEach(y => { g.beginPath(); g.ellipse(0, y, 42, 9, 0, 0, Math.PI * 2); g.fillStyle = lin('#e8c890', '#a87a40', y - 9, y + 9); g.fill(); ol(3.5); [-44, 44].forEach(x => { g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2); g.fillStyle = '#8a5ae8'; g.fill(); ol(2.5); }); });
    g.restore(); g.save(); g.translate(22, 26); g.fillStyle = '#b07cff'; g.beginPath(); for (let q = 0; q < 10; q++) { const a = q * Math.PI / 5 - Math.PI / 2, r = q % 2 ? 7 : 16; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); ol(3); g.restore(); spark(-34, -44, 9); }
  /* v4.6 새 아이템 그림 7개 다시 그림 (금속 광택 · 빛 · 테두리) */
  else if (id === 'thunder') { const sh = g.createRadialGradient(0, 4, 4, 0, 4, 64); sh.addColorStop(0, 'rgba(255,236,110,.75)'); sh.addColorStop(1, 'rgba(255,236,110,0)'); g.fillStyle = sh; g.beginPath(); g.arc(0, 4, 64, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(-46, -22); g.bezierCurveTo(-56, -42, -30, -58, -16, -46); g.bezierCurveTo(-8, -66, 26, -66, 30, -44); g.bezierCurveTo(52, -48, 56, -20, 40, -16); g.closePath(); g.fillStyle = lin('#8a90b8', '#3a3e6a', -64, -16); g.fill(); ol(3);
    g.save(); g.clip(); g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.ellipse(-10, -50, 26, 8, -0.2, 0, Math.PI * 2); g.fill(); g.restore();
    g.save(); g.shadowColor = '#fff27a'; g.shadowBlur = 16; g.beginPath(); g.moveTo(6, -24); g.lineTo(-16, 10); g.lineTo(0, 10); g.lineTo(-12, 50); g.lineTo(24, 2); g.lineTo(8, 2); g.lineTo(22, -24); g.closePath(); g.fillStyle = lin('#ffffff', '#ffc400', -24, 50); g.fill(); g.restore(); ol(3);
    g.strokeStyle = '#7ac8ff'; g.lineWidth = 3; [[-36, -8], [-26, 4], [32, -6], [40, 8]].forEach(([x, y]) => { g.beginPath(); g.moveTo(x, y); g.lineTo(x - 4, y + 10); g.stroke(); }); spark(-36, 30, 8); spark(38, 28, 7, '#fff6a0'); }
  else if (id === 'allout') { const sh = g.createRadialGradient(0, -6, 4, 0, -6, 60); sh.addColorStop(0, 'rgba(255,140,80,.5)'); sh.addColorStop(1, 'rgba(255,140,80,0)'); g.fillStyle = sh; g.beginPath(); g.arc(0, -6, 60, 0, Math.PI * 2); g.fill();
    [['#ff5a4a', -26, -0.14], ['#4a9aff', 0, 0], ['#4ac86a', 22, 0.1]].forEach(([c, x, r]) => { g.save(); g.translate(x, 34); g.rotate(r); g.scale(0.85, 0.85); g.beginPath(); g.rect(-3, -84, 6, 84); g.fillStyle = lin('#fff0a8', '#b8801a', -84, 0); g.fill(); g.beginPath(); g.moveTo(3, -82); g.quadraticCurveTo(22, -86, 30, -74); g.quadraticCurveTo(22, -62, 3, -58); g.closePath(); g.fillStyle = lin(L(c, 0.25), c, -86, -58); g.fill(); ol(2.5); g.fillStyle = '#fff'; g.beginPath(); g.arc(16, -71, 4, 0, Math.PI * 2); g.fill(); g.beginPath(); g.arc(0, -88, 4, 0, Math.PI * 2); g.fillStyle = '#ffd34d'; g.fill(); g.restore(); });
    g.beginPath(); g.moveTo(-30, 2); g.lineTo(30, 2); g.lineTo(26, 34); g.quadraticCurveTo(0, 50, -26, 34); g.closePath(); g.fillStyle = lin('#fff2a8', '#d08a10', 2, 46); g.fill(); ol(3);
    g.beginPath(); g.moveTo(-20, 8); g.lineTo(20, 8); g.lineTo(17, 30); g.quadraticCurveTo(0, 40, -17, 30); g.closePath(); g.fillStyle = lin('#e8404a', '#9a1a24', 8, 40); g.fill(); ART.paw(g, 0, 22, 1.25, '#fff3c4'); shine(-18, 12, 3, 7, 0.6); spark(-44, -40, 9); spark(44, -34, 8); }
  else if (id === 'timestop') { const sh = g.createRadialGradient(0, 4, 4, 0, 4, 62); sh.addColorStop(0, 'rgba(140,210,255,.55)'); sh.addColorStop(1, 'rgba(140,210,255,0)'); g.fillStyle = sh; g.beginPath(); g.arc(0, 4, 62, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(0, -48, 8, 0, Math.PI * 2); g.lineWidth = 4; g.strokeStyle = '#c8901a'; g.stroke(); g.beginPath(); g.rect(-9, -44, 18, 10); g.fillStyle = lin('#fff0a8', '#c8901a', -44, -34); g.fill(); ol(2.5);
    g.beginPath(); g.arc(0, 6, 42, 0, Math.PI * 2); g.fillStyle = lin('#fff3a8', '#b8780a', -36, 48); g.fill(); ol(); g.beginPath(); g.arc(0, 6, 34, 0, Math.PI * 2); g.fillStyle = rad('#ffffff', '#bfe4ff', 34, -8, -6); g.fill(); g.lineWidth = 2; g.strokeStyle = '#8a6010'; g.stroke();
    for (let q = 0; q < 12; q++) { const an = q / 12 * Math.PI * 2, r1 = q % 3 ? 28 : 25; g.lineWidth = q % 3 ? 1.5 : 3; g.strokeStyle = '#2a4a7a'; g.beginPath(); g.moveTo(Math.cos(an) * r1, 6 + Math.sin(an) * r1); g.lineTo(Math.cos(an) * 31, 6 + Math.sin(an) * 31); g.stroke(); }
    g.lineCap = 'round'; g.strokeStyle = '#1a2a5a'; g.lineWidth = 4; g.beginPath(); g.moveTo(0, 6); g.lineTo(0, -16); g.stroke(); g.lineWidth = 3; g.beginPath(); g.moveTo(0, 6); g.lineTo(15, 13); g.stroke(); g.fillStyle = '#e8404a'; g.beginPath(); g.arc(0, 6, 4, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 2; for (const [x, y] of [[-40, -30], [42, -20]]) for (let q = 0; q < 3; q++) { const an = q * Math.PI / 3; g.beginPath(); g.moveTo(x - Math.cos(an) * 8, y - Math.sin(an) * 8); g.lineTo(x + Math.cos(an) * 8, y + Math.sin(an) * 8); g.stroke(); }
    shine(-16, -10, 6, 12, 0.55); }
  else if (id === 'goldshield') { const sh = g.createRadialGradient(0, 0, 4, 0, 0, 62); sh.addColorStop(0, 'rgba(255,220,100,.6)'); sh.addColorStop(1, 'rgba(255,220,100,0)'); g.fillStyle = sh; g.beginPath(); g.arc(0, 0, 62, 0, Math.PI * 2); g.fill();
    for (const sd of [-1, 1]) { g.save(); g.scale(sd, 1); g.beginPath(); g.moveTo(30, -26); g.quadraticCurveTo(58, -40, 60, -12); g.quadraticCurveTo(52, -16, 50, -6); g.quadraticCurveTo(44, -12, 40, -2); g.quadraticCurveTo(36, -8, 32, 4); g.closePath(); g.fillStyle = lin('#ffffff', '#cfe0ff', -40, 4); g.fill(); ol(2.5); g.restore(); }
    g.beginPath(); g.moveTo(0, -50); g.lineTo(38, -36); g.quadraticCurveTo(40, 22, 0, 50); g.quadraticCurveTo(-40, 22, -38, -36); g.closePath(); g.fillStyle = lin('#fff8c0', '#c8800a', -50, 50); g.fill(); ol();
    g.beginPath(); g.moveTo(0, -38); g.lineTo(27, -27); g.quadraticCurveTo(28, 14, 0, 36); g.quadraticCurveTo(-28, 14, -27, -27); g.closePath(); g.fillStyle = lin('#3a6ad8', '#1a2a7a', -38, 36); g.fill(); g.lineWidth = 2.5; g.strokeStyle = '#ffe27a'; g.stroke();
    ART.paw(g, 0, 0, 1.8, '#ffe27a'); g.beginPath(); g.moveTo(0, -30); g.lineTo(6, -22); g.lineTo(0, -14); g.lineTo(-6, -22); g.closePath(); g.fillStyle = lin('#ffffff', '#ff5a7a', -30, -14); g.fill(); shine(-18, -26, 4, 10, 0.6); spark(42, -44, 8); spark(-30, 40, 6); }
  else if (id === 'goldbone') { const sh = g.createRadialGradient(0, -2, 4, 0, -2, 62); sh.addColorStop(0, 'rgba(255,214,80,.7)'); sh.addColorStop(1, 'rgba(255,214,80,0)'); g.fillStyle = sh; g.beginPath(); g.arc(0, -2, 62, 0, Math.PI * 2); g.fill();
    g.save(); g.globalAlpha = 0.35; g.strokeStyle = '#fff3a0'; g.lineWidth = 3; for (let q = 0; q < 10; q++) { const an = q * Math.PI / 5; g.beginPath(); g.moveTo(Math.cos(an) * 36, Math.sin(an) * 36 - 2); g.lineTo(Math.cos(an) * 56, Math.sin(an) * 56 - 2); g.stroke(); } g.restore();
    g.save(); g.rotate(-0.4); g.beginPath(); g.rect(-26, -8, 52, 16); [[-26, -9], [-26, 9], [26, -9], [26, 9]].forEach(([x, y]) => { g.moveTo(x + 11, y); g.arc(x, y, 11, 0, Math.PI * 2); }); g.fillStyle = lin('#fff6b8', '#c88a10', -20, 20); g.fill('nonzero'); ol(3.5);
    g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(-22, -6, 44, 3.5); ART.paw(g, 0, 2, 0.9, '#b8780a'); g.restore(); spark(-36, -36, 10); spark(38, 22, 8); spark(28, -40, 6); }
  else if (id === 'rainbowcandy') { const cols = ['#ff6b6b', '#ffb84d', '#ffe14a', '#6fd86a', '#5ab8ff', '#9b6bff']; const sh = g.createRadialGradient(0, -6, 4, 0, -6, 62); sh.addColorStop(0, 'rgba(255,170,230,.55)'); sh.addColorStop(1, 'rgba(255,170,230,0)'); g.fillStyle = sh; g.beginPath(); g.arc(0, -6, 62, 0, Math.PI * 2); g.fill();
    const starP = () => { g.beginPath(); for (let q = 0; q < 10; q++) { const an = q * Math.PI / 5 - Math.PI / 2, r = q % 2 ? 22 : 46; g.lineTo(Math.cos(an) * r, Math.sin(an) * r - 4); } g.closePath(); };
    starP(); g.save(); g.clip(); cols.forEach((c, k) => { g.fillStyle = c; g.beginPath(); g.moveTo(-80 + k * 22, 60); g.lineTo(-58 + k * 22, 60); g.lineTo(-18 + k * 22, -60); g.lineTo(-40 + k * 22, -60); g.closePath(); g.fill(); }); g.fillStyle = cols[5]; g.fillRect(52, -60, 40, 120); const gl = g.createLinearGradient(0, -50, 0, 40); gl.addColorStop(0, 'rgba(255,255,255,.55)'); gl.addColorStop(0.5, 'rgba(255,255,255,0)'); g.fillStyle = gl; g.fillRect(-60, -60, 120, 120); g.restore(); starP(); ol(3.5);
    g.fillStyle = '#3a2214'; g.beginPath(); g.arc(-8, -10, 3.4, 0, Math.PI * 2); g.arc(8, -10, 3.4, 0, Math.PI * 2); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(-7, -11, 1.3, 0, Math.PI * 2); g.arc(9, -11, 1.3, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,90,140,.5)'; g.beginPath(); g.ellipse(-15, -2, 5, 3, 0, 0, Math.PI * 2); g.ellipse(15, -2, 5, 3, 0, 0, Math.PI * 2); g.fill(); g.beginPath(); g.arc(0, -2, 5, 0.15 * Math.PI, 0.85 * Math.PI); g.lineWidth = 2.5; g.strokeStyle = '#3a2214'; g.stroke(); spark(40, -42, 9); spark(-42, 26, 7); spark(42, 30, 5, '#ffd8f0'); }
  else if (id === 'starpouch') { const sh = g.createRadialGradient(0, 0, 4, 0, 0, 60); sh.addColorStop(0, 'rgba(190,150,255,.55)'); sh.addColorStop(1, 'rgba(190,150,255,0)'); g.fillStyle = sh; g.beginPath(); g.arc(0, 0, 60, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(-26, -14); g.quadraticCurveTo(-50, 40, 0, 48); g.quadraticCurveTo(50, 40, 26, -14); g.quadraticCurveTo(0, -6, -26, -14); g.fillStyle = lin('#a07aff', '#3a1a8a', -14, 48); g.fill(); ol();
    g.save(); g.clip(); g.globalAlpha = 0.25; g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(-16, 12, 8, 22, 0.3, 0, Math.PI * 2); g.fill(); g.restore();
    g.beginPath(); g.moveTo(-28, -14); g.quadraticCurveTo(-36, -30, -20, -30); g.quadraticCurveTo(0, -22, 20, -30); g.quadraticCurveTo(36, -30, 28, -14); g.closePath(); g.fillStyle = lin('#c8a8ff', '#7a4ad8', -30, -14); g.fill(); ol(3);
    g.strokeStyle = '#ffd34d'; g.lineWidth = 4; g.beginPath(); g.moveTo(-26, -12); g.quadraticCurveTo(0, -4, 26, -12); g.stroke(); g.fillStyle = '#ffd34d'; g.beginPath(); g.arc(22, -4, 5, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#ffd34d'; g.lineWidth = 3; g.beginPath(); g.moveTo(22, -2); g.lineTo(26, 14); g.stroke();
    ART.star(g, 0, 20, 13, '#ffe27a'); g.lineWidth = 2; g.strokeStyle = '#b8780a'; g.stroke();
    [[0, -42, 11], [-22, -46, 7], [22, -46, 8], [-10, -56, 5], [12, -58, 5]].forEach(([x, y, r]) => spark(x, y, r, '#fff6a8')); }
  else if (id === 'x2ticket') { g.save(); g.rotate(-0.12); g.beginPath(); g.moveTo(-50, -26); g.lineTo(50, -26); g.lineTo(50, -8); g.arc(50, 0, 8, -Math.PI / 2, Math.PI / 2, true); g.lineTo(50, 26); g.lineTo(-50, 26); g.lineTo(-50, 8); g.arc(-50, 0, 8, Math.PI / 2, -Math.PI / 2, true); g.closePath(); g.fillStyle = lin('#ffb070', '#e8502a', -26, 26); g.fill(); ol();
    g.setLineDash([4, 4]); g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-26, -22); g.lineTo(-26, 22); g.stroke(); g.setLineDash([]); g.font = 'bold 34px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 6; g.strokeStyle = '#7a2a10'; g.strokeText('×2', 12, 2); g.fillStyle = '#fff6c0'; g.fillText('×2', 12, 2);
    g.fillStyle = '#ffe27a'; g.beginPath(); g.arc(-38, 0, 8, 0, Math.PI * 2); g.fill(); g.restore(); spark(42, -38, 9); }
  else if (id === 'box1' || id === 'box2') { const c = id === 'box2' ? '#9a6ae8' : '#d8823a', t = id === 'box2' ? '#ffe08a' : '#ffd34d';
    const sh = g.createRadialGradient(0, -6, 4, 0, -6, 64); sh.addColorStop(0, ART.rgba(t, 0.55)); sh.addColorStop(1, ART.rgba(t, 0)); g.fillStyle = sh; g.beginPath(); g.arc(0, -6, 62, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.rect(-46, -6, 92, 50); g.fillStyle = lin(L(c, 0.2), D(c, 0.35), -6, 44); g.fill(); ol();
    g.beginPath(); g.moveTo(-50, -4); g.lineTo(-50, -22); g.quadraticCurveTo(0, -54, 50, -22); g.lineTo(50, -4); g.closePath(); g.fillStyle = lin(L(c, 0.35), D(c, 0.15), -44, -4); g.fill(); ol();
    g.fillStyle = lin('#fff3b0', '#c8901a', -50, 44); [-34, 26].forEach(x => { g.fillRect(x, -36 + (x < 0 ? 4 : 4), 8, 80); }); g.beginPath(); g.rect(-50, -8, 100, 8); g.fill(); ol(3);
    g.beginPath(); g.rect(-11, -10, 22, 24); g.fillStyle = lin('#fff3b0', '#d8a020', -10, 14); g.fill(); ol(3); g.beginPath(); g.arc(0, 0, 3.5, 0, Math.PI * 2); g.rect(-1.5, 0, 3, 7); g.fillStyle = '#3a2214'; g.fill();
    if (id === 'box2') { spark(-40, -44, 10); spark(42, -38, 8); spark(0, -58, 7); } else spark(38, -40, 8); shine(-32, -24, 6, 10, 0.4); }
}
/* v2.9 상점 2차: 화폐 구분(코인 전용·보석 전용·둘 다) · 하루 한 번 할인 · 꾸미기(보석) · 결제 연결 자리(PAY) */
const CUR_TXT = { both: '코인·보석', coin: '코인만', gem: '보석만', cash: '현금 (준비 중)' }; /* v4.0 「둘 다」가 무엇인지 알기 어려워 글자를 바꿈 */
const dayNum = () => Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000);
const dealItem = () => { const pool = ITEMS.filter(q => q.kind !== 'ticket').concat(typeof BUNDLES !== 'undefined' ? BUNDLES : []); return pool[(dayNum() * 7 + 3) % pool.length]; }; /* 오늘의 할인 상품 (날짜로 정해져 모두 같음) · v3.3 묶음 상품도 포함 */
function buyLog(n, gem, p) { S.buyLog = S.buyLog || []; S.buyLog.unshift({ t: Date.now(), n, g: gem ? 1 : 0, p }); S.buyLog.length = Math.min(20, S.buyLog.length); } /* v3.3 산 물건 기록 (최근 20개) */
const bundlePrice = bd => { const d = dealItem() === bd; return d ? Math.max(1, Math.round(bd.gem * (1 - DEAL_OFF))) : bd.gem; }; /* v4.4 보석만 */
const DEAL_OFF = 0.3;
const dealLeft = () => { const n = new Date(), m = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1) - n, h = Math.floor(m / 3600000), mi = Math.floor(m / 60000) % 60, se = Math.floor(m / 1000) % 60; return `${h}:${String(mi).padStart(2, '0')}:${String(se).padStart(2, '0')}`; }; /* v3.2 오늘 할인이 바뀔 때까지(자정) */
/* v3.2 묶음 상품: 낱개보다 15% 싸게 · 코인으로도 꼭 살 수 있음 */
const BUNDLES = [ /* v4.4 보석만 · 낱개보다 15~20% 싸게 */
  { id: 'b_bone', n: '뼈다귀 주머니 3개', items: { bonebag: 3 }, gem: 8, d: '낱개보다 보석 1개 이득' },
  { id: 'b_mana', n: '마나 별사탕 3개', items: { manacandy: 3 }, gem: 8, d: '낱개보다 보석 1개 이득' },
  { id: 'b_brave', n: '용기 세트', items: { drum: 1, charm: 1 }, gem: 12, d: '용기의 북 + 수호 부적 (보석 2개 이득)' },
  { id: 'b_start', n: '출발 세트', items: { lunch: 1, clover: 1, scroll: 1 }, gem: 10, d: '도시락 + 클로버 + 두루마리 (보석 2개 이득)' },
  { id: 'b_boss', n: '보스 대비 세트', items: { bomb: 1, feather: 1, manacandy: 1 }, gem: 16, d: '폭탄 + 깃털 + 별사탕 (보석 4개 이득)' },
  { id: 'b_legend', n: '전설의 한 판 세트', items: { thunder: 1, allout: 1, timestop: 1 }, gem: 40, d: '천둥 번개 + 총출동 + 시간 멈춤 (9개 이득)' },
  { id: 'b_bosskill', n: '보스 사냥 세트', items: { thunder: 1, goldshield: 1, drum: 1 }, gem: 29, d: '천둥 번개 + 황금 방패 + 용기의 북 (6개 이득)' },
  { id: 'b_gold', n: '황금 출동 세트', items: { goldbone: 1, rainbowcandy: 1, starpouch: 1 }, gem: 21, d: '황금 뼈다귀 + 무지개 별사탕 + 별가루 주머니 (6개 이득)' },
];
function buyBundle(bd) { for (const k in bd.items) if (invN(k) + bd.items[k] > 20) { SHOPP.msg = { s: '가방이 넘쳐요 (아이템마다 최대 20개)', t: 1.8 }; return; }
  const bp = bundlePrice(bd); if ((S.gems || 0) < bp) { SHOPP.msg = { s: '보석이 모자라요 (보석 탭에서 살 수 있어요)', t: 1.8 }; return; } S.gems -= bp; buyLog(bd.n, true, bp);
  S.items = S.items || {}; for (const k in bd.items) S.items[k] = invN(k) + bd.items[k]; SFX.coin(); SHOPP.msg = { s: `「${bd.n}」 샀어요!`, t: 1.6 }; save(); }
function itemPrice(it) { const deal = dealItem() === it; return deal ? Math.max(1, Math.round(it.gem * (1 - DEAL_OFF))) : it.gem; } /* v4.4 보석만 */
/* 꾸미기 상품 (능력치 없음 → 보석 전용 가능. 게임 안 방법으로도 그대로 열 수 있음) */
const COSM = { wear: 12, decor: 15, rainbow: 30, fire: 500 }; /* v4.9 미르의 불꽃 보석 500 */ /* v4.7 미르의 불꽃 보석 100 */ /* v4.4 fire = 미르의 불꽃 기술 열기 */
/* 결제 연결 자리: Google Play 결제(Capacitor 결제 플러그인)는 계정 준비 후 연결. 지금은 구조만 */
const PAY = {
  ready: false,
  skus: { gem60: { g: 60, won: 1200 }, gem330: { g: 330, won: 5900 }, gem700: { g: 700, won: 11000 }, perm_r2: { perm: 'r2', won: 9900 }, perm_r4: { perm: 'r4', won: 19900 }, perm_sp2: { perm: 'sp2', won: 9900 } }, /* v4.5 영구 구매 3종 (결제는 구조만) */
  buy(sku, done) { if (!this.ready) { done && done({ ok: false, why: '준비 중' }); return; } /* 나중에: 결제 플러그인 호출 → 영수증 확인 → 보석이면 S.gems += g, 영구면 S.perm[perm] = 1 → save() (영구 상품은 「구매 복원」도 꼭) */ },
};
/* v3.8 광고 구조 (보상형 광고만 · 전투 중에는 절대 없음 · 이긴 뒤 결과 창에서 내가 고를 때만)
   - 앱(Capacitor)에 AdMob 플러그인이 있으면 그걸 부르고, 없으면(웹·테스트) 5초짜리 「광고 자리」 화면으로 대신함
   - 하루 10번까지 · 어린이 이용자를 생각해 실제 광고는 가족 정책 인증 광고 네트워크 + 어린이용 설정으로만 (출시 때 설정) */
const AD = {
  ready: false, /* 실제 광고 ID를 넣고 플러그인을 붙이면 true */
  unitId: 'ca-app-pub-3940256099942544/5224354917', /* 구글 공식 「테스트」 보상형 광고 ID — 출시 전에 내 ID로 바꾸기 */
  max: 5, /* v4.0 10 → 5: 41~120판 한 판 코인이 9천~1만9천이라 광고 10번이면 하루 진도가 거의 두 배 → 광고를 꼭 봐야 하는 느낌이 들지 않게 */
  left() { const k = todayKey(); if (!S.adDay || S.adDay.k !== k) S.adDay = { k, n: 0 }; return this.max - S.adDay.n; },
  show(done) { if (this.left() <= 0) { done(false); return; }
    const ok = () => { S.adDay.n++; save(); done(true); };
    const P = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.AdMob;
    if (this.ready && P) { try { P.prepareRewardVideoAd({ adId: this.unitId, isTesting: true, tagForChildDirectedTreatment: true }).then(() => P.showRewardVideoAd()).then(r => r ? ok() : done(false)).catch(() => done(false)); } catch (e) { done(false); } return; }
    ADP = { t: 0, dur: 5, done: ok }; /* 웹·테스트: 광고 자리 화면 */
  },
};
let ADP = null;
function drawAdPop() { if (!ADP) return; const P = ADP; P.t += G.dt || 0.016; const left = Math.max(0, Math.ceil(P.dur - P.t));
  ctx.save(); ctx.fillStyle = 'rgba(10,6,0,.86)'; ctx.fillRect(-OX, 0, VW, H); ctx.restore(); uiPush({ x: -OX, y: 0, w: VW, h: H, key: 'adblk', tap: () => {} });
  pkCard(W / 2 - 230, 140, 460, 250, {}); txt('📺 광고 자리 (테스트)', W / 2, 176, 20, '#3a2210', 'center', false);
  txt('앱 출시 때 이 자리에 짧은 보상형 광고가 나와요', W / 2, 212, 14, '#7a5230', 'center', false, null, 420);
  for (let k = 0; k < 3; k++) ART.paw(ctx, W / 2 - 40 + k * 40, 262 + Math.sin(G.time * 5 + k) * 4, 1.2, ['#ffb84d', '#ff8ab0', '#7ad0ff'][k]);
  if (left > 0) txt(`${left}초 뒤에 보상을 받아요`, W / 2, 320, 16, '#a0652a', 'center', false);
  else btn(W / 2 - 90, 300, 180, 50, '보상 받기!', () => { const d = P.done; ADP = null; d && d(); }, { bg: '#5cc96b', size: 18, key: 'adok' });
  btn(W / 2 + 190, 146, 34, 30, 'x', () => { ADP = null; }, { bg: '#a99a8a', size: 13, key: 'adx' }); }
function fitWrap(s, x, y, maxW, size, col, lh, maxLines) {
  let sz = size, lines; for (;;) { const es = sz < 14.5 ? Math.max(13.5, sz + 1) : sz; ctx.font = `bold ${es}px ${FONT}`; if ('letterSpacing' in ctx) ctx.letterSpacing = es < 16 ? '0.4px' : '0px'; /* v5.0 txt()가 실제로 그리는 크기로 재야 줄바꿈이 맞음 (폰 글씨) */ lines = []; let line = ''; for (const wd of s.split(' ')) { const t = line ? line + ' ' + wd : wd; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = wd; } else line = t; } if (line) lines.push(line); /* 낱말 단위로 줄바꿈 (글자 중간에서 안 끊김) */ if (lines.length <= maxLines || sz <= 10) break; sz -= 0.5; }
  lines.slice(0, maxLines).forEach((l, k) => txt(l, x, y + k * lh, sz, col, 'left', false, null, maxW)); /* v4.2 긴 낱말 한 줄도 칸 밖(단추 밑)으로 안 나가게 */
}
function curChip(x, y, cur, right) { const s = CUR_TXT[cur]; ctx.font = `bold 12px ${FONT}`; const w = ctx.measureText(s).width + 16, x0 = right ? x - w : x; RR(x0, y - 10, w, 20, 10); ctx.fillStyle = cur === 'coin' ? '#c8841a' : cur === 'gem' ? '#2a8ac0' : cur === 'cash' ? '#8a7a6a' : '#6a5a90'; ctx.fill(); txt(s, x0 + w / 2, y, 11.5, '#fff', 'center', false); }
function bossAt() { return B && B.n >= 110 && !B.special ? 0.85 : 0.6; } /* v4.6 보통·쉬움 121판부터 둥지가 85%일 때 보스 등장 (예전 60%) */
function toggleSpeed() { if (!B) return; if (!(S.perm && S.perm.sp2)) { B.speed = 1; B.msg = { t: 2.2, s: '속도 2배는 상점 「보석·영구」에서 영구로 열 수 있어요' }; return; } B.speed = B.speed === 1 ? 2 : 1; }
function priceBtn(x, y, w, h, gem, val, old, onTap, key, size) {
  btn(x, y, w, h, '', onTap, { bg: gem ? '#3a9ad0' : '#e8962a', size: size || 15, key });
  const cx = x + w / 2, cy = y + h / 2; ctx.font = `bold ${size || 15}px ${FONT}`; const tw = ctx.measureText(String(val)).width, iw = 18, sx = cx - (tw + iw + 4) / 2;
  if (gem) ART.gem(ctx, sx + 8, cy, 9, '#7ae8ff'); else ART.icon(ctx, 'coin', sx + 8, cy, 18); txt(String(val), sx + iw + 4, cy, size || 15, '#fff', 'left');
  if (old != null) { RR(x + w - 40, y - 9, 38, 16, 8); ctx.fillStyle = '#fff'; ctx.fill(); txt(String(old), x + w - 21, y - 1, 11, '#c0392b', 'center', false); ctx.save(); ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x + w - 36, y - 1); ctx.lineTo(x + w - 6, y - 1); ctx.stroke(); ctx.restore(); } /* 원래 가격 (줄 그음) */
}
function buyItem(it, coin) {
  const max = 20; if (invN(it.id) >= max) { SHOPP.msg = { s: '가방이 가득 찼어요 (아이템마다 최대 20개)', t: 1.8 }; return; }
  if (coin) { /* v4.6 전투를 크게 바꾸지 않는 작은 아이템은 코인으로도 */ if (!it.c) return; if ((S.coins || 0) < it.c) { SHOPP.msg = { s: '코인이 모자라요 (전투에서 모아요)', t: 1.8 }; return; } S.coins -= it.c; S.items[it.id] = invN(it.id) + 1; buyLog(it.n, false, it.c); SFX.coin(); SHOPP.msg = { s: `${it.n} 샀어요! (보유 ${S.items[it.id]})`, t: 1.6 }; SHOPP.pop = { id: it.id, t: 0.5 }; save(); return; }
  const p = itemPrice(it); if ((S.gems || 0) < p) { SHOPP.msg = { s: '보석이 모자라요 (보석 탭에서 살 수 있어요)', t: 1.8 }; return; } S.gems -= p;
  S.items[it.id] = invN(it.id) + 1; buyLog(it.n, true, p); SFX.coin(); SHOPP.msg = { s: `${it.n} 샀어요! (보유 ${S.items[it.id]})`, t: 1.6 }; SHOPP.pop = { id: it.id, t: 0.5 }; save();
}
function buyCosm(cost, fn, name) { if ((S.gems || 0) >= cost) buyLog(`꾸미기 「${name}」`, true, cost); if ((S.gems || 0) < cost) { SHOPP.msg = { s: '보석이 모자라요 (보석 탭에서 살 수 있어요)', t: 2 }; return; } S.gems -= cost; fn(); SFX.rare(); SHOPP.msg = { s: `「${name}」 꾸미기를 얻었어요!`, t: 1.8 }; save(); }
function drawShop() {
  const P = SHOPP; P.t += G.dt || 0.016; ui = []; dragH = null; S.items = S.items || {}; const tab = P.tab || 0;
  ctx.save(); ctx.globalAlpha = Math.min(1, P.t * 4); ctx.fillStyle = 'rgba(8,4,16,.8)'; ctx.fillRect(-OX, 0, VW, H); ctx.restore();
  pkFrame(18, 22, W - 36, 498, 'royal', {}); pkRibbon(W / 2, 4, '멍멍 상점', '#ff9a3a', 260);
  RR(40, 32, 170, 32, 16); ctx.fillStyle = 'rgba(0,0,0,.42)'; ctx.fill(); ART.icon(ctx, 'coin', 60, 48, 22); txt(`${S.coins}`, 76, 48, 16, '#ffe9a8', 'left', false);
  RR(218, 32, 120, 32, 16); ctx.fillStyle = 'rgba(0,0,0,.42)'; ctx.fill(); ART.gem(ctx, 238, 48, 9, '#5ae0ff'); txt(`${S.gems || 0}`, 254, 48, 16, '#c8f4ff', 'left', false);
  btn(W - 214, 26, 128, 36, '🧾 산 기록', () => { P.log = !P.log; }, { bg: '#6a5a90', size: 14, key: 'shlog' });
  ['전투 가방', '전투 아이템', '⚡ 강력', '장비 상자', '꾸미기', '🐾 펫', '보석·영구', '묶음 상품', '멍멍성'].forEach((n, q) => { const i = [3, 0, 7, 1, 2, 8, 4, 5, 6][q]; /* v4.6 전투 가방 맨 왼쪽 · v4.8 펫 탭 */ pkBtn(24 + q * 101, 72, 96, 40, n, () => { P.tab = i; P.sel = null; }, { bg: tab === i ? (i === 7 ? '#e8323a' : '#ff8a2a') : (i === 7 ? '#8a3a5a' : '#5a4a80'), size: 14, key: 'shtab' + i }); }); /* v4.5 「⚡ 강력」 탭 (안쪽 번호 7) */
  const deal = dealItem();
  if (tab === 0) { /* v4.4 13가지 · 보석만 · 매력 포인트(주황 글씨)와 꼬리표 */
    ITEMS.filter(q => !q.power).forEach((it, i) => { const x = 30 + (i % 4) * 226, y = 118 + Math.floor(i / 4) * 92, n = invN(it.id), isDeal = deal === it, hot = it.tag === 'NEW' || it.tag === '추천';
      pkCard(x, y, 218, 88, { state: isDeal ? 'claim' : 'normal' });
      if (hot) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25 + Math.sin(G.time * 3 + i) * 0.12; ctx.drawImage(ART.softDot(it.col), x - 6, y - 4, 90, 90); ctx.restore(); }
      const pop = P.pop && P.pop.id === it.id ? 1 + Math.sin(P.pop.t * 12) * 0.08 : 1; itemArt(it.id, x + 36, y + 46, 62 * pop);
      RR(x + 6, y + 6, 26, 18, 9); ctx.fillStyle = n ? '#2e7d32' : 'rgba(80,60,40,.55)'; ctx.fill(); txt(`${n}`, x + 19, y + 15, 11.5, '#fff', 'center', false);
      if (it.tag) { const tc = it.tag === 'NEW' ? '#e8323a' : it.tag === '인기' ? '#ff8a2a' : it.tag === '추천' ? '#2a9ad0' : '#8a7a6a'; ctx.font = `bold 11.5px ${FONT}`; const tw = ctx.measureText(it.tag).width + 14; RR(x + 212 - tw, y + 6, tw, 18, 9); ctx.fillStyle = tc; ctx.fill(); txt(it.tag, x + 212 - tw / 2, y + 15, 11.5, '#fff', 'center', false); }
      txt(it.n, x + 72, y + 17, 14, '#3e2418', 'left', false, null, it.tag ? 98 : 136);
      txt('✦ ' + it.pt, x + 72, y + 38, 12, '#c0501a', 'left', false, null, 140);
      uiPush({ x, y, w: 218, h: 56, key: 'shi' + i, tap: () => { P.sel = it.id; SFX.click(); } }); if (P.sel === it.id) { RR(x - 1, y - 1, 220, 90, 12); ctx.lineWidth = 3; ctx.strokeStyle = '#ffc93c'; ctx.stroke(); }
      if (it.c) { priceBtn(x + 72, y + 56, 66, 26, true, itemPrice(it), isDeal ? it.gem : null, () => buyItem(it), 'bg' + i, 13); priceBtn(x + 142, y + 56, 72, 26, false, it.c, null, () => buyItem(it, true), 'bc' + i, 12); }
      else priceBtn(x + 72, y + 56, 140, 26, true, itemPrice(it), isDeal ? it.gem : null, () => buyItem(it), 'bg' + i, 13);
      if (isDeal) { ctx.save(); ctx.translate(x + 8, y + 74); ctx.rotate(-0.2); RR(-10, -12, 86, 24, 9); ctx.fillStyle = '#e8323a'; ctx.fill(); txt('오늘 30%↓', 33, 0.5, 13.5, '#fff', 'center', false); ctx.restore(); } });
    if (P.pop) { P.pop.t -= G.dt || 0.016; if (P.pop.t <= 0) P.pop = null; }
    { const si = P.sel && ITEM(P.sel); if (si && si.kind !== undefined && ITEMS.includes(si)) { RR(260, 418, 664, 62, 12); ctx.fillStyle = 'rgba(255,248,230,.95)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#ffc93c'; ctx.stroke(); itemArt(si.id, 294, 449, 52); txt(si.n, 330, 436, 15, '#3e2418', 'left', false, null, 200); txt({ battle: '전투 중에 쓰기', start: '전투 시작할 때 자동' }[si.kind], 910, 436, 12, '#8a6142', 'right', false, null, 180); txt(si.d, 330, 462, 13, '#5a3a1e', 'left', false, null, 580); }
      else txtW('아이템을 누르면 자세한 설명이 여기에 나와요', 592, 449, 13, '#d8c8ff', 'center', 600, 16); } /* v4.4 설명은 눌렀을 때 크게 */
    txt(`작은 아이템은 코인으로도 · 나머지는 보석 · 아이템마다 최대 20개 · 한 판에 같은 아이템 2번까지   |   ⏰ 오늘 할인 바뀌기까지 ${dealLeft()}`, W / 2, 500, 12, '#d8c8ff', 'center', false, null, 880);
  } else if (tab === 1) {
    BOXES.forEach((bx, i) => { const x = 60 + i * 430, y = 126; pkCard(x, y, 410, 304, {}); const bob = Math.sin(G.time * 2 + i) * 4;
      bigText(bx.n, x + 205, y + 28, 24, '#fff6d0', i ? '#6a3ab0' : '#a8521a'); curChip(x + 205 + 70, y + 58, 'gem', false); txt(i ? '희귀 이상 보장' : '내 진도 수준', x + 205 - 6, y + 58, 13, '#8a5a2a', 'right', false);
      itemArt(bx.id, x + 205, y + 140 + bob, 150); txt(bx.d, x + 205, y + 220, 15, '#5a3a1e', 'center', false, null, 360);
      priceBtn(x + 105, y + 244, 200, 48, true, bx.gem, null, () => buyBox(bx), 'bxg' + i, 18); });
    txt(`장비 가방 ${S.inv.length} / 28`, W / 2, 448, 14, '#ffe9a8', 'center', false);
    txt('장비 상자: 일반 40.00% · 고급 30.00% · 희귀 20.00% · 전설 8.00% · 신화 2.00%   |   고급: 희귀 70.00% · 전설 25.00% · 신화 5.00%', W / 2, 470, 12.5, '#d8c8ff', 'center', false, null, 880);
    btn(W / 2 - 110, 484, 220, 30, '📋 확률 자세히 보기', () => { P.prob = true; }, { bg: '#6a5a90', size: 13, key: 'bxprob' });
    if (P.prob) { ctx.save(); ctx.fillStyle = 'rgba(10,5,20,.7)'; ctx.fillRect(-OX, 0, VW, H); ctx.restore(); uiPush({ x: -OX, y: 0, w: VW, h: H, key: 'probblk', tap: () => { P.prob = false; } }); pkCard(110, 70, 740, 430, {}); txt('📋 장비 상자 확률 정보', W / 2, 96, 18, '#3e2418', 'center', false);
      txt('게임산업진흥에 관한 법률에 따른 확률형 아이템 정보 공개 · 백분율(소수점 둘째 자리 반올림)', W / 2, 120, 12, '#8a6142', 'center', false, null, 700);
      [['장비 상자 (보석 18)', 'box1'], ['고급 장비 상자 (보석 60)', 'box2']].forEach(([n, id], c) => { const x0 = 140 + c * 350; txt(n, x0, 150, 15, '#3e2418', 'left', false); RR(x0, 162, 320, 26, 6); ctx.fillStyle = 'rgba(141,90,43,.2)'; ctx.fill(); [['등급', 40], ['확률', 130], ['무기·갑옷·장신구 각각', 250]].forEach(([h, dx]) => txt(h, x0 + dx, 175, 12, '#6b4426', 'center', false));
        BOX_RATES[id].forEach(([r, p], q) => { const y = 200 + q * 30; RR(x0, y - 12, 320, 26, 6); ctx.fillStyle = q % 2 ? 'rgba(141,90,43,.06)' : 'rgba(141,90,43,.12)'; ctx.fill(); txt(RAR[r] + (r === 4 ? ' ✦' : ''), x0 + 40, y + 1, 13, RART[r], 'center', false); txt(p.toFixed(2) + '%', x0 + 130, y + 1, 13.5, '#3e2418', 'center', false); txt((p / 3).toFixed(2) + '%', x0 + 250, y + 1, 13, '#5a3a1e', 'center', false); }); });
      ['· 신화(✦ 상점 전용) 장비는 장비 상자에서만 나와요. 전투에서 떨어지거나 보상으로 받는 장비는 전설까지예요.', '· 장비 종류(무기·갑옷·장신구)는 같은 확률(각 1/3), 같은 종류 안의 모양도 같은 확률이에요.', '· 장비 능력치는 내가 깬 판 수준으로 정해져요. 상점 전용 신화는 능력 +12%.', '· 확률은 상자를 열 때마다 같아요 (앞의 결과와 상관없음 · 천장 없음).'].forEach((t2, q) => txt(t2, 140, 372 + q * 24, 12.5, '#5a3a1e', 'left', false, null, 680));
      btn(W / 2 - 60, 464, 120, 30, '닫기', () => { P.prob = false; }, { bg: '#a99a8a', size: 13, key: 'probx' }); }
    if (P.got) { P.got.t -= G.dt || 0.016; const it = P.got.it; ctx.save(); ctx.globalAlpha = Math.min(1, P.got.t * 2); ART.panel(ctx, W / 2 - 180, 170, 360, 180, 'cream'); bigText('장비 획득!', W / 2, 202, 24, '#fff6b0', RART[it.r]); ART.itemIcon(ctx, it, W / 2 - 34, 222, 68); txt(`${RAR[it.r]} · ${it.name}`, W / 2, 316, 16, RART[it.r], 'center', false, null, 330); ctx.restore(); if (P.got.t <= 0) P.got = null; }
  } else if (tab === 2) {
    txt('옷·성 장식은 게임 안 방법(간식·주간 도전)으로도 열려요 · 미르의 불꽃(기술)은 보석으로만', W / 2, 128, 13, '#e8dcff', 'center', false);
    // 옷장
    const us = UNITS.map((u, i) => i).filter(i => unitUnlocked(i)); P.wd = ((P.wd || 0) + us.length) % us.length; const ui0 = us[P.wd], d = UNITS[ui0], b = BREED[d.id];
    pkCard(34, 144, 340, 340, {}); txt('👕 기사 옷', 50, 164, 16, '#3e2418', 'left', false); curChip(366, 164, 'gem', true);
    btn(44, 184, 40, 40, '◀', () => { P.wd--; }, { bg: '#8a7ab0', size: 16, key: 'cwl' }); btn(324, 184, 40, 40, '▶', () => { P.wd++; }, { bg: '#8a7ab0', size: 16, key: 'cwr' }); txt(`${d.nick} (${P.wd + 1}/${us.length})`, 204, 204, 16, '#5a3a1e', 'center', false, null, 220);
    [0, 1].forEach(n => { const x = 50 + n * 162, y = 234, w = b.wear[n], own = wearOpen(d.id, n); RR(x, y, 150, 238, 12); ctx.fillStyle = ART.lgr(ctx, own ? '#e8f8e0' : '#fff6e6', own ? '#bfe0b0' : '#e6cfae', 0, y, 0, y + 238); ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#d9a21b'; ctx.stroke(); /* v4.6 금테 + 무대 조명 */ ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.45; ctx.drawImage(ART.softDot('#fff2c0'), x + 15, y + 40, 120, 110); ctx.restore(); ctx.fillStyle = 'rgba(120,70,30,.22)'; ART.E(ctx, x + 75, y + 132, 44, 8); ctx.fill();
      drawCuteDog('cw' + n, d.id, ART.wearType(unitSprite0(ui0), w.k, w.c), x + 75, y + 128, 1.0, { ph: n, em: false }); txt(w.n, x + 75, y + 150, 14, '#3e2418', 'center', false, null, 140);
      txt(own ? '가지고 있어요' : `또는 ${wearLock(d.id, n)}`, x + 75, y + 174, 12, own ? '#2e7d32' : '#8a6142', 'center', false, null, 140);
      if (!own) priceBtn(x + 20, y + 192, 110, 36, true, COSM.wear, null, () => buyCosm(COSM.wear, () => { S.wearBuy = S.wearBuy || {}; S.wearBuy[d.id + '_' + n] = 1; }, w.n), 'cwb' + n); else btn(x + 20, y + 192, 110, 36, '입히러 가기', () => { SHOPP = null; WARDP = { t: 0, i: ui0 }; }, { bg: '#5cb84a', size: 14, key: 'cwg' + n }); });
    // 성 장식
    S.decor = S.decor || {}; pkCard(384, 144, 352, 340, {}); txt('🏰 성 장식', 400, 164, 16, '#3e2418', 'left', false); curChip(728, 164, 'gem', true);
    WEEKLY.slice(0, 10).forEach((Wr, i) => { const x = 396 + (i % 5) * 66, y = 184 + Math.floor(i / 5) * 146, own = !!S.decor[Wr.k], inSet = Object.values(CASTLE_SETS).find(St => St.need.includes(Wr.k)); RR(x, y, 62, 140, 10); ctx.fillStyle = ART.lgr(ctx, own ? '#e8f8e0' : '#fff6e6', own ? '#bfe0b0' : '#ecd8bc', 0, y, 0, y + 140); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#d9a21b'; ctx.stroke(); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35; ctx.drawImage(ART.softDot(Wr.col), x - 4, y + 10, 70, 70); ctx.restore(); if (inSet) { RR(x + 2, y + 2, 58, 14, 7); ctx.fillStyle = 'rgba(90,40,140,.8)'; ctx.fill(); txt(inSet.n.replace(' 세트', ''), x + 31, y + 9.5, 9, '#ffe9a8', 'center', false, null, 56); }
      drawDecor(x + 31, y + 72, Wr.k, 0.6); txtW(Wr.deco, x + 31, y + 88, 11, '#3e2418', 'center', 58, 13);
      if (own) txt('보유', x + 31, y + 122, 12.5, '#2e7d32', 'center', false); else priceBtn(x + 4, y + 108, 54, 28, true, COSM.decor, null, () => buyCosm(COSM.decor, () => { S.decor[Wr.k] = 1; }, Wr.deco), 'cdb' + i, 13); });
    // 미르 무지개 불꽃
    pkCard(746, 144, 180, 340, {}); txt('🐉 미르 불꽃', 760, 164, 16, '#3e2418', 'left', false); curChip(918, 192, 'gem', true);
    { const fl = (sc, col, dy) => { const fy = 330, wob = Math.sin(G.time * 7 + sc * 5) * 4 * sc; ctx.beginPath(); ctx.moveTo(836, fy + dy); ctx.bezierCurveTo(836 - 46 * sc, fy - 20 * sc + dy, 836 - 20 * sc + wob, fy - 70 * sc, 836 + wob, fy - 110 * sc); ctx.bezierCurveTo(836 + 22 * sc + wob, fy - 70 * sc, 836 + 46 * sc, fy - 20 * sc + dy, 836, fy + dy); ctx.fillStyle = col; ctx.fill(); }; ctx.save(); ctx.lineWidth = 3; ctx.strokeStyle = '#4a2a14'; fl(1, '#c87aff', 0); ctx.stroke(); ['#c87aff', '#6a8aff', '#3ab0ff', '#5ad06a', '#ffe03a', '#ffa03a', '#ff5a5a'].forEach((c, k) => fl(1 - k * 0.12, c, -k * 2)); ctx.fillStyle = '#fff8e0'; ctx.beginPath(); ctx.ellipse(836, 318, 6, 10, 0, 0, TAU); ctx.fill(); ctx.restore(); } /* 무지개 불꽃 그림 */
    if (!S.mirFire) { /* v4.4 미르의 불꽃(기술)은 보석으로 사야 씀 · 한 번 사면 계속 */ txt('미르의 불꽃', 836, 376, 15, '#3e2418', 'center', false); txtW('전투 기술 + 무지개 불꽃 색까지 · 한 번만 사면 끝', 836, 402, 11.5, '#8a6142', 'center', 160, 14); priceBtn(776, 426, 120, 38, true, COSM.fire, null, () => buyCosm(COSM.fire, () => { S.mirFire = 1; S.mirRainbow = 1; }, '미르의 불꽃'), 'cmf', 16); } /* v4.8 한 번 결제(보석 100)로 무지개 색까지 */
    else { txt('미르의 불꽃', 836, 380, 15, '#3e2418', 'center', false); txt('가지고 있어요 · 무지개 색 포함', 836, 418, 12.5, '#2e7d32', 'center', false, null, 170); }
  } else if (tab === 8) { /* v4.8 🐾 펫: 상점에서만 · 병아리만 코인 · 나머지 보석 · 유니콘은 4배 영구 선물 */
    S.pets = S.pets || {}; txt('펫은 전투에서 기사를 따라다니며 아이템을 줍고 능력을 줘요 · 데려갈 펫은 「펫」 창(지도 위 단추)에서 골라요', W / 2, 128, 12.5, '#e8dcff', 'center', false, null, 900);
    const L = PETS.filter(P => !P.season || petCanBuy(P) || S.pets[P.id]);
    L.slice(0, 10).forEach((P, k) => { const x = 34 + (k % 5) * 180, y = 142 + Math.floor(k / 5) * 172, own = !!S.pets[P.id], pr = P.price || {}, on = S.pet === P.id;
      pkCard(x, y, 172, 164, { state: own ? 'claim' : 'normal' }); ctx.save(); RR(x + 8, y + 8, 156, 70, 10); ctx.fillStyle = ART.lgr(ctx, P.id === 'unicorn' ? '#ffe8fa' : '#fff6e0', P.id === 'unicorn' ? '#e0d0ff' : '#f0dcb8', 0, y + 8, 0, y + 78); ctx.fill(); ctx.clip(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.4; ctx.drawImage(ART.softDot('#fff2c0'), x + 46, y + 4, 80, 76); ctx.restore();
      ART.draw(ctx, 'pet_' + P.id, 'i' + (Math.floor(G.time * 2.4 + k) % 3), x + 86, y + 72, 2.0, false, 0);
      txt(P.n, x + 86, y + 92, 13.5, '#3e2418', 'center', false, null, 160); txt(P.ab, x + 86, y + 112, 11.5, '#2e7d32', 'center', false, null, 160);
      if (own) txt(on ? '✓ 데려가는 중' : '✓ 가지고 있어요', x + 86, y + 142, 13, '#2e7d32', 'center', false);
      else if (pr.perm) { RR(x + 14, y + 126, 144, 30, 15); ctx.fillStyle = '#e8323a'; ctx.fill(); txt('👑 4배 영구 선물', x + 86, y + 141, 12.5, '#fff', 'center', false); uiPush({ x: x + 14, y: y + 126, w: 144, h: 30, key: 'ppm' + k, tap: () => { P2tab(4); } }); }
      else priceBtn(x + 26, y + 126, 120, 30, !pr.c, pr.c || pr.g, null, () => buyPet(P), 'pp' + k, 14); });
  } else if (tab === 7) { /* v4.5 ⚡ 강력 아이템: 판을 한 번에 뒤집는 큰 아이템 */
    txt('판을 한 번에 뒤집는 강력 아이템 · 한 판에 같은 아이템 2번까지', W / 2, 128, 13.5, '#ffd8e8', 'center', false);
    ITEMS.filter(q => q.power).forEach((it, i) => { const x = 34 + (i % 2) * 448, y = 146 + Math.floor(i / 2) * 176, n = invN(it.id), isDeal = deal === it; pkCard(x, y, 436, 166, { state: isDeal ? 'claim' : 'normal' });
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.3 + Math.sin(G.time * 2 + i) * 0.1; ctx.drawImage(ART.softDot(it.col), x - 4, y - 4, 170, 170); ctx.restore();
      const pop = P.pop && P.pop.id === it.id ? 1 + Math.sin(P.pop.t * 12) * 0.08 : 1; itemArt(it.id, x + 80, y + 80, 128 * pop);
      RR(x + 8, y + 8, 34, 22, 11); ctx.fillStyle = n ? '#2e7d32' : 'rgba(80,60,40,.55)'; ctx.fill(); txt(`${n}`, x + 25, y + 19, 13, '#fff', 'center', false);
      RR(x + 368, y + 10, 58, 22, 11); ctx.fillStyle = '#e8323a'; ctx.fill(); txt('강력', x + 397, y + 21, 12.5, '#fff', 'center', false);
      txt(it.n, x + 166, y + 28, 20, '#3e2418', 'left', false, null, 196); txt('✦ ' + it.pt, x + 166, y + 56, 14, '#c0501a', 'left', false, null, 256);
      fitWrap(it.d, x + 166, y + 82, 256, 13, '#5a3a1e', 17, 2);
      priceBtn(x + 166, y + 116, 256, 38, true, itemPrice(it), isDeal ? it.gem : null, () => buyItem(it), 'pw' + i, 17);
      if (isDeal) { ctx.save(); ctx.translate(x + 14, y + 140); ctx.rotate(-0.2); RR(-10, -12, 86, 24, 9); ctx.fillStyle = '#e8323a'; ctx.fill(); txt('오늘 30%↓', 33, 0.5, 13.5, '#fff', 'center', false); ctx.restore(); } });
    if (P.pop) { P.pop.t -= G.dt || 0.016; if (P.pop.t <= 0) P.pop = null; }
    txt('전투 가방에 넣어 가면 전투 중 오른쪽 위 단추로 써요 · 묶음 상품에 「전설의 한 판 세트」도 있어요', W / 2, 500, 12.5, '#ffd8e8', 'center', false, null, 880);
  } else if (tab === 6) { /* v4.5 화려한 멍멍성 (보석 · 꾸미기 · 능력치 없음) */
    S.castleOwn = S.castleOwn || {}; txt('성마다 능력이 있어요 · 어울리는 장식 2개를 성 자리에 두면 「세트」 효과가 더해져요', W / 2, 128, 13.5, '#e8dcff', 'center', false);
    [{ k: null, n: '기본 멍멍성', d: '대리석 왕궁 · 기본 성', gem: 0, bt: '기본 능력' }].concat(CASTLE_SKINS).forEach((Sk, i) => { const x = 34 + i * 222, y = 146, St = castleSetOf(Sk.k), son = (S.castleSkin || null) === Sk.k && castleSetOn(Sk.k); pkCard(x, y, 212, 330, { state: S.castleSkin === Sk.k ? 'claim' : 'normal' });
      const C = castleSkinImg(Sk.k); ctx.save(); RR(x + 10, y + 10, 192, 180, 12); ctx.fillStyle = ART.lgr(ctx, Sk.k === 'crystal' ? '#2a3a7a' : '#bfe6ff', Sk.k === 'crystal' ? '#8ab0e8' : '#e8f6ff', 0, y + 10, 0, y + 190); ctx.fill(); ctx.clip();
      ctx.save(); ctx.translate(x + 106, y + 168); ctx.scale(0.56, 0.56); ctx.translate(0, -(GY + 12)); ctx.drawImage(C.c, -C.ox, GY + 12 - C.oy, C.w, C.h); if (Sk.k) drawCastleSkinFx(Sk.k, 0, 0); /* v4.6 미리보기에도 왕관·무지개·수정 */
      if (St) { const at = [DSLOT[0], DSLOT[3]]; St.need.forEach((dk, q) => { ctx.globalAlpha = (S.decor || {})[dk] ? 1 : 0.55; drawDecor(at[q].x, GY + at[q].y, dk, at[q].s); }); ctx.globalAlpha = 1; } ctx.restore();
      RR(x + 10, y + 160, 192, 30, 0); ctx.fillStyle = son ? 'rgba(40,140,60,.85)' : 'rgba(40,24,60,.7)'; ctx.fill(); if (St) { txt(`${son ? '✓ ' : ''}${St.n}`, x + 106, y + 168.5, 11, son ? '#fff' : '#ffe9a8', 'center', false, null, 186); txt(St.bt, x + 106, y + 182, 10.5, son ? '#fff' : '#fff6d8', 'center', false, null, 186); } ctx.restore();
      txt(Sk.n, x + 106, y + 206, 16, '#3e2418', 'center', false, null, 196); txt(Sk.d, x + 106, y + 228, 11.5, '#6b4426', 'center', false, null, 192); txt('🛡 ' + (Sk.bt || ''), x + 106, y + 252, 12, Sk.k ? '#2e7d32' : '#8a7a6a', 'center', false, null, 196);
      const own = !Sk.k || S.castleOwn[Sk.k], on = (S.castleSkin || null) === Sk.k;
      if (on) txt('✓ 지금 쓰는 성', x + 106, y + 296, 15, '#2e7d32', 'center', false);
      else if (own) btn(x + 31, y + 276, 150, 40, '이 성으로', () => { S.castleSkin = Sk.k; save(); SFX.pick(); }, { bg: '#5cb84a', size: 15, key: 'csk' + i });
      else priceBtn(x + 31, y + 276, 150, 40, true, Sk.gem, null, () => buyCosm(Sk.gem, () => { S.castleOwn[Sk.k] = 1; S.castleSkin = Sk.k; }, Sk.n), 'csb' + i, 17); });
  } else if (tab === 5) {
    txt('여러 개를 한꺼번에 사면 보석이 덜 들어요 · 보석으로만 살 수 있어요', W / 2, 128, 13.5, '#e8dcff', 'center', false);
    BUNDLES.forEach((bd, i) => { const x = 30 + (i % 4) * 226, y = 146 + Math.floor(i / 4) * 176, ks = Object.keys(bd.items); pkCard(x, y, 218, 168, {}); /* v4.5 8종이라 4칸 × 2줄 */
      ks.forEach((k, q) => { const n = bd.items[k], cx = x + 109 + (q - (ks.length - 1) / 2) * 56; itemArt(k, cx, y + 52, 54); if (n > 1) { RR(cx + 12, y + 60, 30, 20, 10); ctx.fillStyle = '#e8323a'; ctx.fill(); txt(`×${n}`, cx + 27, y + 70, 12, '#fff', 'center', false); } });
      txt(bd.n, x + 109, y + 92, 15, '#3e2418', 'center', false, null, 200); txtW(bd.d, x + 109, y + 114, 11.5, '#2e7d32', 'center', 200, 13);
      const dl = dealItem() === bd; if (dl) { ctx.save(); ctx.translate(x + 12, y + 6); ctx.rotate(-0.25); RR(-14, -11, 78, 22, 8); ctx.fillStyle = '#e8323a'; ctx.fill(); txt('오늘 30%↓', 25, 1, 13.5, '#fff', 'center', false); ctx.restore(); }
      priceBtn(x + 14, y + 132, 190, 30, true, bundlePrice(bd), dl ? bd.gem : null, () => buyBundle(bd), 'bdg' + i); });
  } else if (tab === 3) {
    txt(`전투에 가져갈 아이템 ${bag4() ? 4 : 3}칸 (전투 중 오른쪽 위 버튼으로 사용 · 같은 아이템은 한 판에 2번까지)`, W / 2, 130, 13.5, '#e8dcff', 'center', false);
    const B3 = bag(); [0, 1, 2, 3].forEach(k => { const id = B3[k], x = 46 + k * 220, y = 148, it = id && ITEM(id), open4 = k < 3 || bag4(); pkCard(x, y, 206, 124, { state: it ? 'normal' : 'lock' }); txt(`${k + 1}번 칸`, x + 12, y + 16, 12.5, '#8a6142', 'left', false);
      if (!open4) { txt('🔒 레벨 30에 열려요', x + 103, y + 50, 13.5, '#8a6142', 'center', false); priceBtn(x + 38, y + 72, 130, 38, true, 30, null, () => { if ((S.gems || 0) < 30) { SHOPP.msg = { s: '보석이 모자라요 (레벨 30이 되면 무료로 열려요)', t: 2 }; return; } S.gems -= 30; S.bag4 = 1; bag(); SFX.rare(); SHOPP.msg = { s: '가방 4번째 칸이 열렸어요!', t: 1.8 }; save(); }, 'bag4b', 15); return; }
      if (it) { itemArt(id, x + 46, y + 68, 70); txt(it.n, x + 86, y + 52, 14.5, '#3e2418', 'left', false, null, 112); txt(`보유 ${invN(id)}`, x + 86, y + 76, 13, invN(id) ? '#2e7d32' : '#c0392b', 'left', false); btn(x + 132, y + 92, 64, 26, '빼기', () => { B3[k] = null; save(); }, { bg: '#a99a8a', size: 13, key: 'bagx' + k }); }
      else txt('비어 있음', x + 103, y + 68, 15, '#8a7a6a', 'center', false); });
    txt('아래에서 고르면 빈 칸(없으면 1번 칸)에 들어가요', W / 2, 292, 13, '#e8dcff', 'center', false);
    ITEMS.filter(q => q.kind !== 'ticket').forEach((it, i) => { const x = 38 + (i % 8) * 110, y = 304 + Math.floor(i / 8) * 96, on = B3.includes(it.id); RR(x, y, 104, 90, 12); ctx.fillStyle = on ? 'rgba(255,201,60,.3)' : 'rgba(255,255,255,.1)'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = on ? '#ffc93c' : 'rgba(255,255,255,.25)'; ctx.stroke();
      itemArt(it.id, x + 52, y + 28, 42); txtW(it.n, x + 52, y + 60, 11.5, '#fff3d6', 'center', 98, 13); txt(`보유 ${invN(it.id)}`, x + 52, y + 80, 11.5, '#d8ccff', 'center', false); /* v4.5 16가지라 8칸 × 2줄 */
      uiPush({ x, y, w: 104, h: 90, key: 'bagp' + i, tap: () => { if (B3.includes(it.id)) return; const e = B3.indexOf(null); B3[e >= 0 ? e : 0] = it.id; save(); SFX.click(); } }); });
  } else {
    txt('보석 💎 은 게임 안에서는 나오지 않고, 여기서만 살 수 있어요 · 영구 상품은 한 번 사면 계속', W / 2, 128, 13.5, '#e8dcff', 'center', false); /* v4.5 보석 3종 + 영구 3종 */
    const keys = Object.keys(PAY.skus); GEM_PACKS.forEach((g, i) => { const x = 34 + i * 298, y = 142, sk = PAY.skus[keys[i]]; pkCard(x, y, 286, 128, { state: PAY.ready ? 'normal' : 'lock' }); for (let q = 0; q <= i; q++) ART.gem(ctx, x + 46 + (q - i / 2) * 22, y + 50, 13, '#5ae0ff');
      if (i) { RR(x + 194, y + 8, 84, 20, 10); ctx.fillStyle = '#e8323a'; ctx.fill(); txt(i === 2 ? '최고 이득' : '인기', x + 236, y + 18, 11.5, '#fff', 'center', false); }
      txt(g.n, x + 96, y + 36, 16, '#3e2418', 'left', false, null, 100); txt(`보석 ${g.g}개 · ${sk.won.toLocaleString()}원`, x + 96, y + 60, 13, '#2a6a8a', 'left', false, null, 180);
      if (PAY.ready) btn(x + 60, y + 82, 166, 36, '사기', () => PAY.buy(keys[i], r => { SHOPP.msg = { s: r.ok ? `보석 ${g.g}개를 받았어요!` : '결제를 하지 못했어요', t: 1.8 }; }), { bg: '#3a9ad0', size: 15, key: 'gp' + i });
      else btn(x + 60, y + 82, 166, 36, '시험용 받기', () => { S.gems = (S.gems || 0) + g.g; save(); SFX.rare(); SHOPP.msg = { s: `시험용 보석 ${g.g}개 (출시 때 이 단추는 사라져요)`, t: 2 }; }, { bg: '#9a8a7a', size: 14, key: 'gp' + i }); });
    S.perm = S.perm || {}; [['perm_r2', 'r2', '🎫 보상 2배 (영구)', '이긴 판 코인이 언제나 2배', '#ff8a3a'], ['perm_r4', 'r4', '👑 광고 제거 + 보상 4배 + 펫 (영구)', '광고 없음 · 이긴 판 코인 4배 · 🦄 아기 유니콘 펫 선물', '#e8323a'], ['perm_sp2', 'sp2', '⏩ 전투 속도 2배 (영구)', '전투 중 x2 단추 열기 · 안 사면 늘 1배', '#3a9ad0']].forEach(([sku, k, n, d, col], i) => { const x = 34 + i * 298, y = 284, own = S.perm[k] || (k === 'r2' && S.perm.r4), won = PAY.skus[sku].won;
      pkCard(x, y, 286, 196, { state: own ? 'claim' : 'normal' }); RR(x + 10, y + 10, 266, 34, 10); ctx.fillStyle = col; ctx.fill(); txt(n, x + 143, y + 27, 15, '#fff', 'center', false, null, 256);
      txtW(d, x + 143, y + 72, 13, '#5a3a1e', 'center', 256, 17); txt(`${won.toLocaleString()}원 · 한 번만`, x + 143, y + 106, 15, '#3e2418', 'center', false);
      if (own) txt('✓ 가지고 있어요', x + 143, y + 150, 16, '#2e7d32', 'center', false);
      else if (PAY.ready) btn(x + 40, y + 130, 206, 42, '사기', () => PAY.buy(sku, r => { SHOPP.msg = { s: r.ok ? `「${n}」 열렸어요!` : '결제를 하지 못했어요', t: 1.8 }; }), { bg: col, size: 16, key: 'pm' + i });
      else btn(x + 40, y + 130, 206, 42, '시험용 받기', () => { S.perm[k] = 1; if (k === 'r4') { S.pets = S.pets || {}; S.pets.unicorn = 1; } save(); SFX.rare(); SHOPP.msg = { s: `시험용 「${n}」 (출시 때 이 단추는 사라져요)`, t: 2 }; }, { bg: '#9a8a7a', size: 15, key: 'pm' + i }); });
    txt(PAY.ready ? '※ 결제는 구글 플레이에서 해요 · 어린이는 보호자와 함께 사요' : '※ 결제 준비 중이라 「시험용 받기」로 받아 볼 수 있어요 (출시 때 사라짐)', W / 2, 498, 12.5, '#d8ccff', 'center', false, null, 880);
  }
  if (P.log) { ui = ui.filter(u => u.key === 'shlog'); ctx.fillStyle = 'rgba(10,5,20,.6)'; ctx.fillRect(-OX, 0, VW, H); pkCard(160, 76, 640, 430, {}); bigText('🧾 산 물건 기록 (최근 20개)', W / 2, 104, 22, '#fff3c4', '#6a5a90'); const L = S.buyLog || [];
    if (!L.length) txt('아직 산 물건이 없어요', W / 2, 280, 16, '#8a6142', 'center', false);
    L.forEach((r, k) => { const col = k % 2, row = Math.floor(k / 2), x = 180 + col * 306, y = 132 + row * 32, d = new Date(r.t); RR(x, y, 296, 28, 8); ctx.fillStyle = (row % 2) ? 'rgba(141,90,43,.05)' : 'rgba(141,90,43,.12)'; ctx.fill(); txt(`${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`, x + 8, y + 14, 11.5, '#8a6142', 'left', false); txt(r.n, x + 86, y + 14, 12.5, '#3e2418', 'left', false, null, 146); if (r.g) ART.gem(ctx, x + 246, y + 14, 7, '#5ae0ff'); else ART.icon(ctx, 'coin', x + 246, y + 14, 15); txt(`${r.p}`, x + 256, y + 14, 12.5, r.g ? '#2a6a8a' : '#a8601a', 'left', false); });
    btn(W / 2 - 60, 462, 120, 34, '닫기', () => { P.log = false; }, { bg: '#8a7a9a', size: 14, key: 'shlogx' }); }
  if (P.msg) { P.msg.t -= G.dt || 0.016; if (P.msg.t <= 0) P.msg = null; else { ctx.save(); ctx.globalAlpha = Math.min(1, P.msg.t * 3); drawBubbleAt(W / 2, 506, P.msg.s); ctx.restore(); } }
  btn(W - 74, 24, 50, 42, 'X', () => { SHOPP = null; }, { bg: '#8a7a9a', size: 19, key: 'shclose' });
}
/* 전투 중 아이템 사용 */
function useItem(id) {
  if (!B || B.over || B.paused) return; const it = ITEM(id); if (!it || invN(id) <= 0) return; B.itemUsed = B.itemUsed || {}; if ((B.itemUsed[id] || 0) >= 2) { B.msg = { t: 1.4, s: '이 아이템은 이번 판에 2번까지만!' }; return; }
  const h = B.hero; let ok = true;
  if (id === 'bonebag') B.food = Math.min(B.hs.fdMax, B.food + 60);
  else if (id === 'manacandy') B.mana = Math.min(B.hs.mpMax, B.mana + 50);
  else if (id === 'drum') B.drumT = 20;
  else if (id === 'charm') { B.charmT = 12; B.base.hp = Math.min(B.base.max, B.base.hp + B.base.max * 0.25); } /* v5.1 12초 · 25% */
  else if (id === 'bomb') { for (const e of B.enemies) if (!e.dead && e.x > B.camX - 40 && e.x < B.camX + W + 40) { const dmg = e.def.boss ? e.max * (0.12 + (B.si.ramp || 0) * 0.08) : e.max * 1.01; e.hp -= dmg; /* v5.1 폭탄: 졸개는 쓰러뜨림 */ e.hit = 0.2; addText(e.x, GY - 80, '퐁!', '#e0c8ff', 16); } B.shake = 10; for (let q = 0; q < 30; q++) B.parts.push({ x: B.camX + rnd(0, W), y: rnd(150, GY), vx: rnd(-80, 80), vy: -rnd(60, 200), g: 300, life: 0.8, max: 0.8, col: '#ffffff', size: 5, glow: true }); }
  else if (id === 'thunder') { if (!B.pvp) B.nest.hp = Math.max(1, B.nest.hp - B.nest.max * 0.1); for (const e of B.enemies) if (!e.dead) { const dmg = e.def.boss || e.oppHero ? e.max * 0.4 : e.max * 1.01; e.hp -= dmg; e.hit = 0.3; e.stun = Math.max(e.stun || 0, 3); addText(e.x, GY - 90, '번쩍!', '#fff3a0', 17); fx('pillar', { x: e.x, y: GY + 8, dur: 0.45, col: '#fff3a0' }); } B.shake = 12; fx('flash', { dur: 0.25 }); }
  else if (id === 'allout') { const fd = B.food; for (let rep = 0; rep < 2; rep++) for (const i of deck()) { B.food = 9999; B.ucd[i] = 0; spawnAlly(i); } B.food = fd; B.alloutT = 20; ring(h.x, GY - 30, '#ff6a3a', 260); }
  else if (id === 'timestop') { for (const e of B.enemies) if (!e.dead) e.stun = Math.max(e.stun || 0, e.def.boss ? 6 : 10); B.spawnT = (B.spawnT || 0) + 10; B.tstopT = 10; fx('flash', { dur: 0.2 }); }
  else if (id === 'goldshield') { B.charmT = Math.max(B.charmT || 0, 20); B.heroShield = 20; h.hp = h.max; B.base.hp = Math.min(B.base.max, B.base.hp + B.base.max * 0.3); ring(h.x, GY - 30, '#ffc83c', 200); }
  else if (id === 'goldbone') { B.food = B.hs.fdMax; B.goldT = 20; ring(h.x, GY - 30, '#ffd34d', 200); }
  else if (id === 'rainbowcandy') { B.food = B.hs.fdMax; B.mana = B.hs.mpMax; for (let k = 0; k < B.scd.length; k++) B.scd[k] = 0; ring(h.x, GY - 30, '#ff8ac8', 220); ring(h.x, GY - 30, '#8fe0ff', 160); }
  else if (id === 'feather') { if (!h.dead) ok = false; else { h.dead = false; h.resp = 0; h.hp = h.max * 0.6; h.x = Math.max(h.x, B.base.x + 60); poof(h.x, GY - 30, '#ffe08a', 16); } }
  else ok = false;
  if (!ok) { B.msg = { t: 1.4, s: id === 'feather' ? '기사가 쓰러졌을 때만 쓸 수 있어요' : '지금은 쓸 수 없어요' }; return; }
  S.items[id]--; B.itemUsed[id] = (B.itemUsed[id] || 0) + 1; S.itemLog = S.itemLog || {}; S.itemLog[id] = (S.itemLog[id] || 0) + 1; save(); SFX.pick(); addText(h.x, GY - 120, it.n + '!', '#fff3c4', 17, true);
}

/* v3.5 「합창 짖기」는 불편하다는 의견으로 뺐음 (v3.4에만 있었음) */
function drawFireflies() { if (!B.si.night) return; ctx.save(); ctx.globalCompositeOperation = 'lighter'; [B.hero, ...B.allies.slice(0, 8)].forEach((a, k) => { if (!a || a.dead) return; const fx0 = a.x - B.camX + Math.sin(G.time * 1.7 + k) * 22, fy0 = GY - 70 + Math.cos(G.time * 2.1 + k * 1.3) * 16; ctx.globalAlpha = 0.07; ctx.drawImage(ART.softDot('#fff2a0'), fx0 - 50, fy0 - 40, 100, 100); ctx.globalAlpha = 0.75; /* v3.8 반딧불 조명 0.3 → 0.07 (동료가 모이면 빛이 겹쳐 하얗게 번졌음 — 「전투 중 너무 빛남」의 큰 원인) */ ctx.drawImage(ART.softDot('#f4ff9a'), fx0 - 9, fy0 - 9, 18, 18); ctx.fillStyle = '#ffffe0'; circ(fx0, fy0, 3.2); }); ctx.restore(); } /* v3.4 밤 판: 우리 편 곁 반딧불 조명 (캐릭터 앞에 그림) */
function drawItemBar() {
  const B3 = bag(); B3.forEach((id, k) => { if (!id) return; const it = ITEM(id); if (!it || it.kind !== 'battle') return; const x = W - 44, y = 104 + k * 50, n = invN(id), used = (B.itemUsed && B.itemUsed[id]) || 0, ok = n > 0 && used < 2;
    uiPush({ x: x - 22, y: y - 22, w: 44, h: 44, key: 'item' + k, tap: () => useItem(id) });
    ctx.save(); if (!ok) ctx.globalAlpha = 0.45; ctx.beginPath(); ctx.arc(x, y, 21, 0, TAU); ctx.fillStyle = 'rgba(255,248,230,.92)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = ART.DK(it.col, 0.35); ctx.stroke(); itemArt(id, x, y, 38); txt('x' + n, x + 14, y + 15, 11, '#fff', 'center'); ctx.restore(); });
  if (B.raidWarn) { const a = 0.6 + Math.sin(G.time * 12) * 0.4, y = GY - 150; ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#e8323a'; ctx.beginPath(); ctx.moveTo(W - 30, y); ctx.lineTo(W - 70, y - 26); ctx.lineTo(W - 70, y - 12); ctx.lineTo(W - 120, y - 12); ctx.lineTo(W - 120, y + 12); ctx.lineTo(W - 70, y + 12); ctx.lineTo(W - 70, y + 26); ctx.closePath(); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke(); ctx.restore(); txt(`강한 ${ENEMIES[B.raidWarn.k] ? ENEMIES[B.raidWarn.k].name : '몬스터'}가 와요!`, W - 150, y - 40, 15, '#ffd0d0', 'right'); }
  if (B.drumT > 0) txt(`용기의 북 ${Math.ceil(B.drumT)}초`, W / 2, 132, 13, '#ffcf9a', 'center');
  if (B.charmT > 0) txt(`수호 부적 ${Math.ceil(B.charmT)}초`, W / 2, 150, 13, '#c8f0a8', 'center'); if (B.pvp && !B.over) { const lt = Math.max(0, 180 - B.t); RR(W / 2 - 60, 96, 120, 24, 12); ctx.fillStyle = lt < 30 ? 'rgba(200,40,40,.85)' : 'rgba(40,30,20,.7)'; ctx.fill(); txt(`⏱ ${fmtT(Math.ceil(lt))}`, W / 2, 108.5, 14, '#fff', 'center', false); } if (B.alloutT > 0) txt(`총출동 ${Math.ceil(B.alloutT)}초`, W / 2, 168, 13, '#ffb08a', 'center'); if (B.heroShield > 0) txt(`황금 방패 ${Math.ceil(B.heroShield)}초`, W / 2, 186, 13, '#ffe08a', 'center'); if (B.tstopT > 0) txt(`시간 멈춤 ${Math.ceil(B.tstopT)}초`, W / 2, 204, 13, '#bfe6ff', 'center');
}

/* =========================================================
   v4.0 랭킹 · 친구 도전장
   - 서버 없이 「도전장 코드」로 친구와 기록 겨루기 (코드에는 기사 이름·이번 주 주간 도전 기록·탑 층·별·깬 판만 들어감 — 개인 정보 없음)
   - 친구 기록에 도전: 같은 주·같은 난이도 주간 도전에서 그 친구의 시간을 화면에 띄우고 이기면 축하
   - 온라인 랭킹: 앱에 게임 서비스 플러그인(GameConnect)이 붙으면 구글 플레이 게임 순위표로 (지금은 구조만, docs/14)
   ========================================================= */
/* v4.1 QR 그림 만들기 (외부 라이브러리 없음) — 글자(바이트) 모드 · 오류 정정 L · 버전 1~6 (최대 136바이트) · 마스크 8가지 중 점수가 가장 낮은 것 */
const QR = (() => {
  const EXP = new Array(512), LOG = new Array(256); { let x = 1; for (let i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 256) x ^= 0x11d; } for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]; }
  const mul = (a, b) => a && b ? EXP[LOG[a] + LOG[b]] : 0;
  function rsGen(n) { let g = [1]; for (let i = 0; i < n; i++) { const ng = new Array(g.length + 1).fill(0); for (let j = 0; j < g.length; j++) { ng[j] ^= g[j]; ng[j + 1] ^= mul(g[j], EXP[i]); } g = ng; } return g; }
  function rsEc(data, n) { const g = rsGen(n), r = data.concat(new Array(n).fill(0)); for (let i = 0; i < data.length; i++) { const c = r[i]; if (c) for (let j = 0; j < g.length; j++) r[i + j] ^= mul(g[j], c); } return r.slice(data.length); }
  /* [전체 코드워드, 블록당 EC, 블록 수] — 오류 정정 L */
  const VT = [null, [26, 7, 1], [44, 10, 1], [70, 15, 1], [100, 20, 1], [134, 26, 1], [172, 18, 2]], AL = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34]];
  function utf8(s) { return Array.from(unescape(encodeURIComponent(s))).map(c => c.charCodeAt(0)); }
  function make(text) {
    const bytes = utf8(text); let v = 1; while (v <= 6) { const [tot, ec, nb] = VT[v]; if (tot - ec * nb >= bytes.length + 2) break; v++; } if (v > 6) return null;
    const [tot, ec, nb] = VT[v], dcw = tot - ec * nb, size = 17 + v * 4;
    const bits = []; const put = (val, n) => { for (let i = n - 1; i >= 0; i--) bits.push((val >> i) & 1); };
    put(4, 4); put(bytes.length, 8); bytes.forEach(b => put(b, 8)); for (let i = 0; i < 4 && bits.length < dcw * 8; i++) bits.push(0); while (bits.length % 8) bits.push(0);
    const data = []; for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(''), 2)); for (let k = 0; data.length < dcw; k++) data.push(k % 2 ? 0x11 : 0xec);
    const per = dcw / nb, blocks = [], ecs = []; for (let b = 0; b < nb; b++) { const d = data.slice(b * per, (b + 1) * per); blocks.push(d); ecs.push(rsEc(d, ec)); }
    const cw = []; for (let i = 0; i < per; i++) blocks.forEach(d => cw.push(d[i])); for (let i = 0; i < ec; i++) ecs.forEach(e => cw.push(e[i]));
    const M = Array.from({ length: size }, () => new Array(size).fill(null)), F = Array.from({ length: size }, () => new Array(size).fill(false));
    const set = (r, c, val) => { M[r][c] = val ? 1 : 0; F[r][c] = true; };
    const finder = (r0, c0) => { for (let r = -1; r <= 7; r++) for (let c = -1; c <= 7; c++) { const rr = r0 + r, cc = c0 + c; if (rr < 0 || cc < 0 || rr >= size || cc >= size) continue; const on = r >= 0 && r <= 6 && c >= 0 && c <= 6 && (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)); set(rr, cc, on); } };
    finder(0, 0); finder(0, size - 7); finder(size - 7, 0);
    for (let i = 8; i < size - 8; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
    const al = AL[v]; for (const r of al) for (const c of al) { if ((r === 6 && c === 6) || (r === 6 && c === al[al.length - 1]) || (r === al[al.length - 1] && c === 6)) continue; for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) set(r + dr, c + dc, Math.max(Math.abs(dr), Math.abs(dc)) !== 1); }
    for (let i = 0; i < 9; i++) { if (!F[8][i]) { F[8][i] = true; M[8][i] = 0; } if (!F[i][8]) { F[i][8] = true; M[i][8] = 0; } } for (let i = 0; i < 8; i++) { F[8][size - 1 - i] = true; M[8][size - 1 - i] = 0; F[size - 1 - i][8] = true; M[size - 1 - i][8] = 0; }
    set(size - 8, 8, 1);
    const db = []; cw.forEach(b => { for (let i = 7; i >= 0; i--) db.push((b >> i) & 1); });
    const pos = []; for (let c = size - 1, up = true; c > 0; c -= 2) { if (c === 6) c--; for (let k = 0; k < size; k++) { const r = up ? size - 1 - k : k; for (const cc of [c, c - 1]) if (!F[r][cc]) pos.push([r, cc]); } up = !up; }
    const MASKS = [(r, c) => (r + c) % 2 === 0, (r) => r % 2 === 0, (r, c) => c % 3 === 0, (r, c) => (r + c) % 3 === 0, (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0, (r, c) => (r * c) % 2 + (r * c) % 3 === 0, (r, c) => ((r * c) % 2 + (r * c) % 3) % 2 === 0, (r, c) => ((r + c) % 2 + (r * c) % 3) % 2 === 0];
    const fmt = m => { const d = (1 << 3) | m; let x = d << 10; for (let i = 14; i >= 10; i--) if (x & (1 << i)) x ^= 0x537 << (i - 10); return ((d << 10) | x) ^ 0x5412; };
    let best = null, bestS = 1e9;
    for (let m = 0; m < 8; m++) { const G = M.map(r => r.slice()); pos.forEach(([r, c], i) => { const b = i < db.length ? db[i] : 0; G[r][c] = b ^ (MASKS[m](r, c) ? 1 : 0); });
      const f = fmt(m), bt = i => (f >> i) & 1;
      for (let i = 0; i <= 5; i++) G[i][8] = bt(i); G[7][8] = bt(6); G[8][8] = bt(7); G[8][7] = bt(8); for (let i = 9; i < 15; i++) G[8][14 - i] = bt(i);
      for (let i = 0; i < 8; i++) G[8][size - 1 - i] = bt(i); for (let i = 8; i < 15; i++) G[size - 15 + i][8] = bt(i); G[size - 8][8] = 1;
      let sc = 0; for (let r = 0; r < size; r++) { let run = 1; for (let c = 1; c < size; c++) { if (G[r][c] === G[r][c - 1]) { run++; if (run === 5) sc += 3; else if (run > 5) sc++; } else run = 1; } } for (let c = 0; c < size; c++) { let run = 1; for (let r = 1; r < size; r++) { if (G[r][c] === G[r - 1][c]) { run++; if (run === 5) sc += 3; else if (run > 5) sc++; } else run = 1; } }
      for (let r = 0; r < size - 1; r++) for (let c = 0; c < size - 1; c++) { const s = G[r][c] + G[r + 1][c] + G[r][c + 1] + G[r + 1][c + 1]; if (s === 0 || s === 4) sc += 3; }
      let dk = 0; G.forEach(r => r.forEach(x => dk += x)); sc += Math.floor(Math.abs(dk * 100 / (size * size) - 50) / 5) * 10;
      if (sc < bestS) { bestS = sc; best = G; } }
    return best;
  }
  return { make };
})();

/* v4.1 메달 · 트로피 그림 (이모지 대신 직접 그림) */
function rkMedal(x, y, k) { const C = [['#fff3a0', '#e8b020', '#a87010'], ['#ffffff', '#c8d0dc', '#7a8698'], ['#ffd8b0', '#d0884a', '#8a4a1a']][k];
  ctx.fillStyle = k === 0 ? '#e8323a' : k === 1 ? '#3a8ad0' : '#3aa85a'; ctx.beginPath(); ctx.moveTo(x - 7, y - 14); ctx.lineTo(x - 2, y - 2); ctx.lineTo(x + 2, y - 2); ctx.lineTo(x + 7, y - 14); ctx.closePath(); ctx.fill();
  const g = ctx.createRadialGradient(x - 3, y - 3, 1, x, y + 2, 10); g.addColorStop(0, C[0]); g.addColorStop(0.6, C[1]); g.addColorStop(1, C[2]); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y + 2, 9, 0, TAU); ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = C[2]; ctx.stroke();
  txt(String(k + 1), x, y + 2.5, 11.5, C[2], 'center', false); }
function rkTrophy(x, y, s) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); const g = ctx.createLinearGradient(-16, 0, 16, 0); g.addColorStop(0, '#c8901a'); g.addColorStop(0.45, '#fff3a0'); g.addColorStop(1, '#a87010');
  ctx.lineWidth = 3; ctx.strokeStyle = '#c8901a'; [-1, 1].forEach(d => { ctx.beginPath(); ctx.arc(d * 14, -14, 6, d < 0 ? Math.PI * 0.5 : -Math.PI * 0.5, d < 0 ? Math.PI * 1.5 : Math.PI * 0.5, d > 0); ctx.stroke(); });
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-14, -22); ctx.lineTo(14, -22); ctx.quadraticCurveTo(14, 0, 0, 2); ctx.quadraticCurveTo(-14, 0, -14, -22); ctx.fill(); ctx.fillRect(-3, 2, 6, 8); ctx.fillStyle = '#8a5a2a'; RR(-11, 10, 22, 7, 2); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillRect(-9, -19, 3, 14); ART.star(ctx, 0, -12, 4.5, '#fffbe0'); ctx.restore(); }
/* v4.8 대전 등급 배지 (등급 색 방패 + 별 수) */
function tierBadge(x, y, e, sc) { const T = pvpTier(e), ti = PVP_TIER.indexOf(T); ctx.save(); ctx.translate(x, y); ctx.scale(sc || 1, sc || 1); ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(10, -7); ctx.quadraticCurveTo(10, 6, 0, 12); ctx.quadraticCurveTo(-10, 6, -10, -7); ctx.closePath(); ctx.fillStyle = T[2]; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(40,20,10,.6)'; ctx.stroke(); for (let k = 0; k < Math.min(3, Math.ceil(ti / 2)); k++) ART.star(ctx, (k - (Math.min(3, Math.ceil(ti / 2)) - 1) / 2) * 6, 0, 3, '#fff'); ctx.restore(); }
let RANKP = null;
const RANK_NAME = s => String(s || '').replace(/[^0-9A-Za-z가-힣ㄱ-ㅎㅏ-ㅣ ]/g, '').trim().slice(0, 8) || '멍멍기사';
/* v4.1 온라인 순위표 붙일 때 바꿀 곳: ① ready → true ② ids 5개를 Play Console ID로 ③ plug()의 플러그인 이름 ④ 점수 올리는 곳 3군데: 주간 기록(ms, 낮을수록 좋음), 탑 최고 층, 모은 별 — 자세한 건 docs/14 5절 */
const RANK_ONLINE = { ready: false, ids: { week0: 'CgkI_week_easy', week1: 'CgkI_week_normal', week2: 'CgkI_week_hard', tower: 'CgkI_tower', stars: 'CgkI_stars' },
  plug() { const P = window.Capacitor && window.Capacitor.Plugins; return P && (P.GameConnect || P.GameServices) || null; },
  submit(id, v) { const p = this.plug(); if (!this.ready || !p || !p.submitScore) return; try { p.submitScore({ leaderboardID: this.ids[id], totalScoreAmount: Math.round(v) }); } catch (e) {} },
  show(id) { const p = this.plug(); if (!this.ready || !p || !p.showLeaderboard) return false; try { p.showLeaderboard({ leaderboardID: this.ids[id] }); return true; } catch (e) { return false; } } };
function starTotal() { return Object.values(S.stars || {}).reduce((a, b) => a + b, 0); }
function myRank() { const d = S.diff != null ? S.diff : 1, wk = weekNo(), rc = weekRecs(d)[wk]; const tw = S.tower && S.tower.w === towerWeek() ? S.tower.best : 0;
  return { v: 1, n: RANK_NAME(heroName()), w: wk, d, t: rc ? rc.t : 0, tw, st: starTotal(), c: S.cleared || 0, b: S.wb && S.wb.w === wk ? S.wb.t : 0, a: S.deck.slice(0, 5).join(''), p: myPower(), e: pvpR().r, h: heroLookOk(myLook()) ? myLook() : '', l: S.lv || 1, me: 1 }; }
function towerWeek() { return S.tower ? S.tower.w : 0; }
function heroLookOk(h) { return typeof h === 'string' && /^-?[0-9]-[a-z]{1,10}_-?[0-9]-[a-z]{1,10}_-?[0-9]_[0-9]{1,2}(\.[0-9]{1,2}){8}$/.test(h); } /* v4.6 도전장 속 기사 모습 (모양만 · 숫자 범위 검사) */
function lookPack(h) { try { if (!heroLookOk(h)) return ''; const p = h.split('_'), w = /^(-?\d)-([a-z]+)$/.exec(p[0]), a = /^(-?\d)-([a-z]+)$/.exec(p[1]), b36 = v => Math.max(0, Math.min(35, v | 0)).toString(36);
  const wi = KINDS.weapon.indexOf(w[2]), ai = KINDS.armor.indexOf(a[2]); if (wi < 0 || ai < 0) return ''; return b36(+w[1] + 1) + b36(wi) + b36(+a[1] + 1) + b36(ai) + b36(+p[2] + 1) + p[3].split('.').map(Number).map(b36).join(''); } catch (e) { return ''; } }
function lookUnpack(c) { if (!/^[0-9a-z]{14}$/.test(c || '')) return ''; const v = [...c].map(ch => parseInt(ch, 36)), wk = KINDS.weapon[v[1]], ak = KINDS.armor[v[3]]; if (!wk || !ak) return ''; const h = `${v[0] - 1}-${wk}_${v[2] - 1}-${ak}_${v[4] - 1}_${v.slice(5).join('.')}`; return heroLookOk(h) ? h : ''; } /* v4.6 도전장에는 14글자로 줄여 담음 (QR 크기) */
function myLook() { return heroType().replace(/^hero_/, ''); }
function rankSum(s) { let h = 7; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) % 1679616; return h.toString(36).toUpperCase().padStart(4, '0'); }
function rankCode(r) { const p = [r.v, r.n, r.w, r.d, r.t, r.tw, r.st, r.c].concat(r.a ? [r.b || 0, r.a, r.p || 0, r.e || 1000].concat(r.h && lookPack(r.h) ? [lookPack(r.h), r.l || 1] : []) : r.b ? [r.b] : []).join('|'); /* v4.6 13·14번째 = 상대 기사 모습 · 레벨 */ /* v4.5 10~12번째 = 1:1 대전용 기사단(편성 숫자) · 힘 · 대전 점수 */ /* v4.4 9번째 = 주간 보스 대회 기록(초) · 없으면 예전 코드와 똑같음 */ let b; try { b = btoa(unescape(encodeURIComponent(p))).replace(/=+$/, ''); } catch (e) { b = ''; } return 'MMK-' + b + '-' + rankSum(p); }
function rankRead(code) { try { const m = /^MMK-([A-Za-z0-9+/]+)-([0-9A-Z]{4})$/.exec(String(code || '').trim().replace(/\s+/g, '')); if (!m) return null; let b = m[1]; while (b.length % 4) b += '='; const p = decodeURIComponent(escape(atob(b))); if (rankSum(p) !== m[2]) return null; if (btoa(unescape(encodeURIComponent(p))).replace(/=+$/, '') !== m[1]) return null; /* v4.1 끝 글자의 남는 비트만 바꾼 코드도 거절 (검사에서 1000개 중 3개가 통과했음) */ const [v, n, w, d, t, tw, st, c, b0, a0, p0, e0, h0, l0] = p.split('|'); const r = { v: +v, n: RANK_NAME(n), w: +w, d: +d, t: +t, tw: +tw, st: +st, c: +c, b: +(b0 || 0), a: a0 && /^[0-9]{1,5}$/.test(a0) ? a0 : '', p: +(p0 || 0), e: +(e0 || 0), h: lookUnpack(h0), l: Math.max(1, Math.min(200, +(l0 || 0) || 1)) }; if (!(r.b >= 0 && r.b <= 3600) || !(r.p >= 0 && r.p <= 5000) || !(r.e >= 0 && r.e <= 5000)) return null; if (!(r.d >= 0 && r.d <= 2) || r.t < 0 || r.t > 3600 || r.st < 0 || r.st > 3 * MAXST || r.c < 0 || r.c > MAXST) return null; return r; } catch (e) { return null; } }
function rankAdd(code) { const r = rankRead(code); if (!r) { floatMsg = { s: '도전장 코드가 맞지 않아요. 다시 확인해 주세요', x: W / 2, y: 120, t: 2.4 }; return false; } S.friends = (S.friends || []).filter(f => f.n !== r.n); S.friends.unshift(Object.assign(r, { at: Date.now() })); S.friends = S.friends.slice(0, 20); save(); SFX.coin(); floatMsg = { s: `${r.n} 기사의 도전장을 받았어요!`, x: W / 2, y: 120, t: 2.2 }; return true; }
function rankCopy() { const c = rankCode(myRank()); const done = () => { floatMsg = { s: '내 도전장 코드를 복사했어요! 친구에게 보내 주세요', x: W / 2, y: 120, t: 2.4 }; }; try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(c).then(done, () => { window.prompt('내 도전장 코드 (길게 눌러 복사)', c); }); return; } } catch (e) {} try { window.prompt('내 도전장 코드 (길게 눌러 복사)', c); } catch (e) {} }
function rankPaste() { let c = null; try { c = window.prompt('친구 도전장 코드를 붙여 넣어 주세요 (MMK-로 시작)'); } catch (e) {} if (c) rankAdd(c); }
function rankList(by) { const me = myRank(), all = [me, ...(S.friends || [])]; const wk = weekNo(), d = me.d;
  const key = by === 'pvp' ? r => (r.e || (r.me ? pvpR().r : 0)) : by === 'boss' ? r => (r.w === wk && r.b > 0 ? 100000 - r.b : 0) : by === 'tower' ? r => (r.w === wk ? r.tw : 0) : by === 'stars' ? r => r.st : by === 'stage' ? r => r.c : r => (r.w === wk && r.d === d && r.t > 0 ? 100000 - r.t : 0);
  return all.map(r => ({ r, k: key(r) })).sort((a, b) => b.k - a.k || (b.r.me ? 1 : 0) - (a.r.me ? 1 : 0)); }
/* ---- v4.3 보스 도전관: 깬 보스와 다시 싸워 별 3개(이기기 · 3분 안에 · 기사가 한 번도 안 쓰러지기)를 모음.
   별 3개면 다음 「강함」 단계(최대 5)가 열려 더 센 보스와 싸움 → 스테이지를 다 깬 뒤에도 계속 할 거리. 오늘의 보스는 코인 2배. 광고·결제 없음 ---- */
let BHP = null;
const BH_GMAX = 5;
function bhOf(z) { S.bh = S.bh || {}; return S.bh[z] || (S.bh[z] = { s: 0, g: 0, w: 0 }); } /* s: 이번 단계에서 모은 별(비트 1·2·4) · g: 지금 단계(0~4) · w: 이긴 횟수 */
function bhOpen(z) { return (S.cleared || 0) >= Math.min(MAXST, (z + 1) * CHL); }
function bhStars() { let n = 0; for (let z = 0; z < CHN; z++) { const b = (S.bh || {})[z]; if (b) n += b.g * 3 + [0, 1, 1, 2, 1, 2, 2, 3][b.s & 7]; } return n; } /* 지난 단계 별 3개씩 + 지금 단계 별 */
function bhToday() { const L = []; for (let z = 0; z < CHN; z++) if (bhOpen(z)) L.push(z); if (!L.length) return -1; let h = 3; for (const ch of todayKey()) h = (h * 31 + ch.charCodeAt(0)) % 100003; return L[h % L.length]; }
function startRematch(z, contest) {
  const b = bhOf(z), g = contest ? 0 : b.g, n0 = Math.min(MAXST, (z + 1) * CHL), top = Math.max(n0, Math.min(S.cleared || 0, MAXST)), ne = Math.round(n0 + (top - n0) * g / (BH_GMAX - 1)), sE = stageInfo(ne); /* 강함 1 = 그 보스의 원래 판 · 강함 5 = 내가 깬 가장 높은 판 수준 */
  startBattle(n0); B.rematch = z; B.special = true; B.heroDied = false;
  const k = 1 + g * 0.12, ka = 1 + g * 0.08;
  B.si = Object.assign({}, B.si, { name: `보스 도전관 · ${ENEMIES[BOSSES[z]].name} · 강함 ${g + 1}`, m: sE.m * k * 0.9, am: sE.am * ka, boss: true, bossKey: BOSSES[z] });
  B.nest.hp = B.nest.max = Math.round(sE.nestHp * (1 + g * 0.05)); ART.warm([BOSSES[z]]);
}
function wbBoss() { return (weekNo() * 7 + 3) % 10; } /* v4.4 주간 보스 대회: 매주 앞쪽 보스 10마리 중 1마리 (모두 같은 보스) */
function startContest() { const z = wbBoss(); startRematch(z, true); B.contest = 1; B.si = Object.assign({}, B.si, { name: `주간 보스 대회 · ${ENEMIES[BOSSES[z]].name}` }); }
function contestEnd(win) { if (!win) return; const wk = weekNo(), t = Math.round(B.t); if (!S.wb || S.wb.w !== wk) S.wb = { w: wk, t: 0, n: 0 }; S.wb.n++; const nb = !S.wb.t || t < S.wb.t; if (nb) S.wb.t = t; S.coins += 500; B.wbRew = { t, best: S.wb.t, nb }; }
function bhEnd(win, stars) { const z = B.rematch, b = bhOf(z); if (!S.bhDayN || S.bhDayN.k !== todayKey()) S.bhDayN = { k: todayKey(), n: 0 }; S.bhDayN.n++; if (B.contest) { contestEnd(win); return; } if (!win) return; b.w++; const bits = 1 | (B.t <= 180 ? 2 : 0) | (B.heroDied ? 0 : 4), nw = bits & ~b.s, nn = [0, 1, 1, 2, 1, 2, 2, 3][nw];
  b.s |= bits; const today = bhToday() === z, coin = (300 + b.g * 200) * (today ? 2 : 1); S.coins += coin + nn * 200; S.dust = (S.dust || 0) + nn * 3;
  B.bhRew = { coin, nn, today, up: false }; if (b.s === 7 && b.g < BH_GMAX - 1) { b.g++; b.s = 0; B.bhRew.up = b.g + 1; } else if (b.s === 7 && b.g === BH_GMAX - 1 && !b.max) { b.max = 1; S.dust = (S.dust || 0) + 15; B.bhRew.max = true; } }
function drawBossHall() { const P = BHP; P.t += G.dt || 0.016; ui = []; dragH = null; if (P.pg == null) P.pg = Math.floor(Math.max(0, P.sel != null ? P.sel : bhToday()) / 10); const pg = P.pg, sel = P.sel != null ? P.sel : Math.max(0, bhToday());
  ctx.save(); ctx.globalAlpha = Math.min(1, P.t * 4); ctx.fillStyle = 'rgba(15,6,0,.74)'; ctx.fillRect(-OX, 0, VW, H); ctx.restore(); uiPush({ x: -OX, y: 0, w: VW, h: H, key: 'bhblk', tap: () => {} });
  ART.panel(ctx, 40, 34, W - 80, 484, 'cream'); pkRibbon(W / 2, 14, '보스 도전관', '#c0392b', 260); rkTrophy(W / 2 - 160, 40, 1); rkTrophy(W / 2 + 160, 40, 1);
  btn(W - 92, 44, 40, 34, 'X', () => { BHP = null; }, { bg: '#a99a8a', size: 15, key: 'bhx' });
  txt(`깬 보스와 다시 싸워 별을 모아요 · 별 3개면 더 센 단계가 열려요 · 보스 별 ${bhStars()} / ${CHN * 3 * BH_GMAX}`, 64, 82, 13, '#6b4426', 'left', false, null, 780);
  for (let q = 0; q < 10; q++) { const z = pg * 10 + q; if (z >= CHN) break; const x = 60 + (q % 5) * 110, y = 98 + Math.floor(q / 5) * 172, open = bhOpen(z), b = bhOf(z), on = z === sel, k = BOSSES[z];
    RR(x, y, 104, 164, 12); ctx.fillStyle = on ? 'rgba(255,201,60,.45)' : open ? 'rgba(141,90,43,.12)' : 'rgba(80,60,40,.18)'; ctx.fill(); ctx.lineWidth = on ? 3 : 1.5; ctx.strokeStyle = on ? '#e0762a' : '#c69355'; ctx.stroke();
    ctx.save(); RR(x + 6, y + 6, 92, 96, 10); ctx.fillStyle = open ? ART.lgr(ctx, '#fff8e6', '#f2d6a0', 0, y, 0, y + 100) : '#b8a890'; ctx.fill(); ctx.clip(); if (!open) ctx.filter = 'brightness(0)'; ctx.globalAlpha = open ? 1 : 0.35; ART.drawFit(ctx, k, 'i0', x + 52, y + 56, 86, 86); ctx.restore();
    if (!open) txt('?', x + 52, y + 54, 30, '#fff3d6', 'center');
    txtW(open ? ENEMIES[k].name : `${(z + 1) * CHL}판을 깨면`, x + 52, y + 115, 11.5, open ? '#3e2418' : '#8a6142', 'center', 94, 13); /* v4.3 긴 보스 이름은 두 줄 */
    for (let i = 0; i < 3; i++) ART.icon(ctx, b.s & (1 << i) ? 'star' : 'starOff', x + 34 + i * 18, y + 138, 14);
    if (open) { RR(x + 26, y + 146, 52, 15, 7.5); ctx.fillStyle = b.g ? '#c0392b' : '#8a6142'; ctx.fill(); txt(`강함 ${b.g + 1}`, x + 52, y + 154, 10.5, '#fff', 'center', false); }
    if (open && bhToday() === z) { RR(x + 60, y + 2, 46, 17, 8.5); ctx.fillStyle = '#e8323a'; ctx.fill(); txt('오늘 ×2', x + 83, y + 11, 10.5, '#fff', 'center', false); }
    uiPush({ x, y, w: 104, h: 164, key: 'bhc' + q, tap: () => { P.sel = z; SFX.click(); } }); }
  const pages = Math.ceil(CHN / 10); btn(60, 450, 60, 34, '◀', () => { P.pg = (pg + pages - 1) % pages; }, { bg: '#c9a983', size: 15, key: 'bhp' }); txt(`${pg + 1} / ${pages}`, 145, 467, 14, '#6b4426', 'center', false); btn(170, 450, 60, 34, '▶', () => { P.pg = (pg + 1) % pages; }, { bg: '#c9a983', size: 15, key: 'bhn' });
  { const wz = wbBoss(), ok = bhOpen(wz), my = S.wb && S.wb.w === weekNo() ? S.wb.t : 0; pkBtn(244, 446, 360, 42, ok ? `🏆 이번 주 보스 대회 · ${ENEMIES[BOSSES[wz]].name}${my ? ' · 내 기록 ' + fmtT(my) : ''}` : `🏆 보스 대회 (${(wz + 1) * CHL}판을 깨면)`, () => { if (!ok) return; BHP = null; go(() => startContest()); }, { bg: ok ? '#e8962a' : '#a99a8a', size: 13, key: 'bhcontest', shine: ok && !my }); } /* v4.4 매주 같은 보스 · 강함 1 · 가장 빠른 기록을 도전장 코드에 넣어 친구와 비교 */
  const z = sel, k = BOSSES[z], b = bhOf(z), open = bhOpen(z); pkCard(620, 98, 280, 400, {});
  ctx.save(); RR(640, 110, 240, 120, 12); ctx.fillStyle = ART.lgr(ctx, '#fff8e6', '#f2d6a0', 0, 110, 0, 230); ctx.fill(); ctx.clip(); if (!open) ctx.filter = 'brightness(0)'; ART.drawFit(ctx, k, 'i0', 760, 172, 150, 112); ctx.restore();
  txt(open ? ENEMIES[k].name : '아직 못 만난 보스', 760, 246, 15, '#3e2418', 'center', false, null, 250); if (open && BOSS_TAG[k]) txt('「' + BOSS_TAG[k] + '」', 760, 266, 12, '#8a6142', 'center', false, null, 250);
  txt(`강함 ${b.g + 1} / ${BH_GMAX}${b.max ? ' · 모두 깸!' : ''}`, 760, 288, 13.5, '#c0392b', 'center', false);
  [['이기기', 1], ['3분 안에 이기기', 2], ['기사가 한 번도 안 쓰러지기', 4]].forEach(([n, bit], i) => { const y = 310 + i * 30, got = b.s & bit; ART.icon(ctx, got ? 'star' : 'starOff', 652, y, 17); txt(n, 668, y, 13, got ? '#2e7d32' : '#5a3412', 'left', false, null, 216); });
  const coin = (300 + b.g * 200) * (bhToday() === z ? 2 : 1); txt(`이기면 코인 ${coin}${bhToday() === z ? ' (오늘 ×2)' : ''} · 새 별마다 별가루 3`, 760, 410, 12, '#8a6142', 'center', false, null, 260);
  btn(660, 428, 200, 52, open ? '⚔ 도전!' : '아직 잠겨 있어요', () => { if (!open) return; BHP = null; go(() => startRematch(z)); }, { bg: open ? '#c0392b' : '#a99a8a', size: 19, key: 'bhgo', shine: open }); }
/* ---- v4.5 1:1 대전 (서버 없이): 상대의 도전장 코드에 담긴 기사단(편성 5마리)·힘으로 만든 「상대 기사단」과 싸움 · 대전 점수(엘로)로 랭킹 ----
   진짜 실시간 대전은 서버가 있어야 해서, 지금은 「상대의 기사단과 싸우기(비동기)」 방식. 상대 쪽에서는 내 기사단과 싸우게 됨. */
function myPower() { let p = (S.lv || 1) * 3; for (const u of UPS) if (u.unit !== undefined) p += (S.up[u.k] || 0) * 4; for (let i = 0; i < UNITS.length; i++) p += (awk(i) || 0) * 6 + (third(i) ? 10 : 0); return Math.round(p); }
const PVP_SEASON_W = 4; /* v4.6 대전 시즌 = 4주 */
const PVP_W0 = Math.floor((Date.UTC(2026, 10, 16) / 864e5 + 3) / 7); /* 시즌 1 시작 주 (2026-11-16 월) */
const pvpSeason = () => Math.floor((weekNo() - PVP_W0) / PVP_SEASON_W);
const PVP_S0 = 0; const seasonNo = s0 => s0 < 0 ? '맛보기' : s0 - PVP_S0 + 1; /* 화면에 보이는 시즌 번호 (2026년 11월 = 시즌 1) */
const PVP_SEASON_REW = [[300, 0], [800, 0], [1500, 1], [2500, 2], [4000, 3], [6000, 5]]; /* 등급별 [코인, 별가루] · 실버부터 「대전 트로피」 성 장식 */
function pvpR() { const R = S.pvp || (S.pvp = { r: 1000, w: 0, l: 0, log: [] }); R.vs = R.vs || {}; R.use = R.use || {}; R.hist = R.hist || []; const cs = pvpSeason(); if (R.s == null) R.s = cs; else if (R.s < cs) pvpSettle(R, cs); return R; }
function pvpSettle(R, cs) { const ti = PVP_TIER.indexOf(pvpTier(R.r)), rw = PVP_SEASON_REW[ti] || PVP_SEASON_REW[0], played = (R.w || 0) + (R.l || 0);
  if (played > 0) { S.coins += rw[0]; S.dust = (S.dust || 0) + rw[1]; if (ti >= 2) { S.decor = S.decor || {}; S.decor.pvptro = 1; } R.hist.unshift({ s: R.s, r: R.r, ti, w: R.w || 0, l: R.l || 0 }); R.hist.length = Math.min(8, R.hist.length); R.got = { s: R.s, ti, c: rw[0], d: rw[1], tro: ti >= 2 }; }
  R.tw = (R.tw || 0) + (R.w || 0); R.tl = (R.tl || 0) + (R.l || 0); R.w = 0; R.l = 0; R.r = Math.round(1000 + (R.r - 1000) * 0.5); /* 점수 절반만 남김 (1000 쪽으로) */ R.s = cs; save(); }
function pvpSeasonLeft() { const endDay = (PVP_W0 + (pvpSeason() + 1) * PVP_SEASON_W) * 7 - 3, left = endDay - Date.now() / 864e5; return Math.max(0, left); }
const PVP_TIER = [[0, '나무', '#a8845a'], [900, '브론즈', '#c8803a'], [1050, '실버', '#a8b8c8'], [1200, '골드', '#e8b020'], [1400, '다이아', '#5ac8ff'], [1650, '마스터', '#c86aff']];
const pvpTier = r => PVP_TIER.filter(t => r >= t[0]).pop();
const PVP_BOTS = [['연습생 바둑이', 0.8, '01234', 920, '1.3.0.2.1.0.0.1.0', 0.85], ['훈련관 초롱', 0.92, '02356', 1010, '2.1.2.1.3.1.0.1.0', 0.95], ['검술왕 번개', 1.0, '04579', 1100, '3.0.1.3.0.1.1.1.0', 1.0], ['방패왕 두부', 1.1, '14678', 1200, '4.2.2.0.2.1.2.1.0', 1.08], ['전설의 흰둥이', 1.25, '34589', 1350, '0.4.1.4.4.1.3.2.0', 1.2]]; /* v4.6 [이름, 힘, 기사단, 점수, 기사 모습, 레벨 배수] */
function pvpList() { const me = myPower(), L = PVP_BOTS.map(([n, k, a, e, hl, lk]) => ({ n, a, p: Math.round(me * k), e, bot: 1, h: `${['-1-sword', '1-sword', '2-sword', '3-sword', '3-sword'][Math.min(4, Math.round((k - 0.8) * 10))]}_${k >= 1 ? '2-vest' : '-1-vest'}_-1_${hl}`, l: Math.max(1, Math.round((S.lv || 1) * lk)) })); for (const f of (S.friends || [])) if (f.a) L.unshift({ n: f.n, a: f.a, p: f.p || me, e: f.e || 1000, fr: 1, h: f.h || '', l: f.l || S.lv || 1 }); return L; }
function startPvp(o) { const ratio = Math.max(0.5, Math.min(2, (o.p || 1) / Math.max(1, myPower()))), n = Math.max(10, Math.min(MAXST, S.cleared || 10)), keys = String(o.a || '01234').split('').map(Number).filter(i => UNITS[i]);
  for (const i of keys) { const u = UNITS[i]; ENEMIES['u' + i] = { name: u.nick + ' (상대)', hp: u.hp, atk: u.atk, range: u.range, spd: u.spd, rate: u.rate || 1, xp: 6, coin: 2, h: 52, s: u.s || 0.8, type: u.type, ranged: u.range > 80 }; }
  NOPET = true; startBattle(n); NOPET = false; B.pvp = Object.assign({}, o, { ratio }); B.special = true; B.towers = []; /* v4.9 대전엔 펫 능력 없음 */
  const K = PVP_K * Math.pow(1 + n / 40, 1.05) * Math.pow(ratio, 1.6); /* v4.8 힘 차이가 결과에 더 크게 (운에 덜 흔들림) */ B.si = Object.assign({}, B.si, { name: `1:1 대전 · ${o.n}`, pool: keys.map(i => 'u' + i), boss: false, bossKey: null, mid: false, midKey: null, totems: 0, m: K, am: K * 0.9, interval: 2.4, swarm: 1 });
  B.nest.hp = B.nest.max = Math.round(B.base.max * 1.6 * ratio); pvpHeroSpawn(); }
/* v4.6 상대 기사(주인공)도 나와요 — 모습은 도전장 그대로, 세기는 레벨 비율로 · 쓰러지면 15초 뒤 다시 */
function pvpHeroSpawn() { const o = B.pvp; if (!o) return; const look = heroLookOk(o.h) ? o.h : '-1-sword_-1-vest_-1_1.0.1.0.0.1.0.1.0', key = 'hero_' + look, cs = look.split('_')[3].split('.').map(Number), mount = cs[5] !== 0;
  const lr = Math.max(0.6, Math.min(1.6, Math.pow((o.l || S.lv || 1) / Math.max(1, S.lv || 1), 0.7))) * Math.sqrt(B.pvp.ratio || 1);
  ENEMIES[key] = { name: `${o.n} (상대 기사)`, hp: 1, atk: 1, range: B.hs.range || 40, spd: 70, rate: B.hs.rate || 0.9, xp: 10, coin: 5, h: mount ? 86 : 64, s: mount ? [0.84, 0.74, 0.66][Math.min(2, cs[7] | 0)] : 1.08, type: 'melee', oppHero: 1 };
  B.enemies.push({ side: 'e', def: ENEMIES[key], kind: key, sc: 1, x: B.nest.x - 60, y: rnd(4, 18), hp: B.hs.hp * lr * 1.2, max: B.hs.hp * lr * 1.2, atk: B.hs.atk * lr * 0.6, cd: 0.6, anim: 0, hit: 0, atkAnim: 0, dead: false, kb: 0, moving: true, shield: 1.4, oppHero: 1, rate: B.hs.rate || 0.9, range: B.hs.range || 40, spd: 70 });
  const e = B.enemies[B.enemies.length - 1]; e.oppSk = (cs[0] | 0) % 3; B.pvpHero = e; B.pvpHeroT = 0; ART.warm && ART.warm([key], 6); }
const PVP_K = 9;
/* v4.7 3분 판정: 남은 성 체력(%)이 1% 넘게 차이 나면 그것으로 · 거의 같으면 「잡은 수 − 잃은 동료 수」 · 그래도 같으면 상대 기사를 쓰러뜨린 쪽 */
function pvpJudge() { const me = B.base.hp / B.base.max, op = B.nest.hp / B.nest.max; let why, win;
  if (Math.abs(me - op) > 0.01) { win = me > op; why = `남은 성 ${Math.round(me * 100)}% : ${Math.round(op * 100)}%`; }
  else { const a = B.kills || 0, b = B.allyLost || 0; if (a !== b) { win = a > b; why = `성이 비슷해서 잡은 수 ${a} : 잃은 수 ${b}`; } else { win = (B.oppHeroK || 0) > 0; why = `모두 같아서 상대 기사 처치 ${B.oppHeroK || 0}번`; } }
  B.pvpWhy = why; return win; }
function pvpEnd(win) { const R = pvpR(), o = B.pvp, ex = 1 / (1 + Math.pow(10, ((o.e || 1000) - R.r) / 400)), d = Math.round(32 * ((win ? 1 : 0) - ex)), old = R.r; R.r = Math.max(0, R.r + d); if (win) R.w++; else R.l++; R.log.unshift({ n: o.n, win: win ? 1 : 0, d, t: Math.round(B.t) }); R.log.length = Math.min(6, R.log.length); { const V = R.vs[o.n] = R.vs[o.n] || { w: 0, l: 0, u: {} }; if (win) V.w++; else V.l++; for (const k in (B.pvpUse || {})) { V.u[k] = (V.u[k] || 0) + B.pvpUse[k]; R.use[k] = (R.use[k] || 0) + B.pvpUse[k]; } } if (win) S.coins += 200; B.pvpRew = { old, nw: R.r, d, win }; }
function drawPvpTab(P) { const R = pvpR(), T = pvpTier(R.r), L = pvpList();
  pkCard(64, 108, 300, 360, {}); txt('⚔ 1:1 대전', 214, 130, 17, '#3e2418', 'center', false); rkTrophy(214, 170, 1.0); txt(`${T[1]}`, 214, 214, 18, ART.DK(T[2], 0.35), 'center', false); txt(`대전 점수 ${R.r}`, 214, 240, 19, '#3e2418', 'center', false); txt(`이번 시즌 ${R.w}승 ${R.l}패 · 내 힘 ${myPower()}`, 214, 266, 13, '#6b4426', 'center', false, null, 280);
  RR(80, 280, 268, 24, 12); ctx.fillStyle = 'rgba(90,60,150,.16)'; ctx.fill(); txt(`🏆 시즌 ${seasonNo(pvpSeason())} · ${Math.ceil(pvpSeasonLeft())}일 남음 · 끝나면 등급 보상`, 214, 292.5, 12, '#5a3a8a', 'center', false, null, 262);
  txt('최근 대전', 82, 320, 13, '#8a6142', 'left', false); (R.log || []).slice(0, 4).forEach((g, k) => { const y = 342 + k * 24; txt(`${g.win ? '이김' : '짐'} · ${g.n}`, 82, y, 12.5, g.win ? '#2e7d32' : '#c0392b', 'left', false, null, 200); txt(`${g.d > 0 ? '+' : ''}${g.d}`, 346, y, 13, g.d > 0 ? '#2e7d32' : '#c0392b', 'right', false); });
  if (!(R.log || []).length) txt('아직 대전 기록이 없어요', 214, 360, 12.5, '#a08a70', 'center', false);
  btn(80, 428, 132, 32, P.hist ? '◀ 상대 고르기' : '📜 대전 기록', () => { P.hist = !P.hist; P.board = false; }, { bg: P.hist ? '#8a7ab0' : '#5a7ad0', size: 13.5, key: 'pvph' }); btn(220, 428, 128, 32, P.board ? '◀ 상대 고르기' : '🏅 시즌 순위', () => { P.board = !P.board; P.hist = false; }, { bg: P.board ? '#8a7ab0' : '#c8902a', size: 13.5, key: 'pvpb' });
  pkCard(376, 108, 520, 360, {});
  if (P.board) { /* v4.7 시즌 순위표: 나 + 친구 도전장(대전 점수 들어 있는 것) 1~10등 */
    const me = { n: heroName(), e: R.r, me: 1, w: R.w, l: R.l }, L2 = [me].concat((S.friends || []).filter(f => f.a).map(f => ({ n: f.n, e: f.e || 1000, wk: f.w }))).sort((a, b) => b.e - a.e).slice(0, 10);
    txt(`🏅 시즌 ${seasonNo(pvpSeason())} 대전 점수 순위 · 친구 도전장 기준`, 394, 130, 14, '#3e2418', 'left', false, null, 420); txt('친구 점수는 도전장을 받은 때 기준', 880, 130, 11, '#8a6142', 'right', false);
    L2.forEach((r, i) => { const y = 146 + i * 30, T3 = pvpTier(r.e); RR(390, y, 492, 27, 8); ctx.fillStyle = r.me ? 'rgba(255,201,60,.4)' : i % 2 ? 'rgba(141,90,43,.08)' : 'rgba(141,90,43,.15)'; ctx.fill();
      if (i < 3) rkTrophy(412, y + 13, 0.42); else txt(`${i + 1}`, 412, y + 13.5, 13, '#6b4426', 'center', false); txt(r.n + (r.me ? ' (나)' : ''), 436, y + 13.5, 13.5, '#3e2418', 'left', false, null, 220); tierBadge(696, y + 13.5, r.e, 1); txt(T3[1], 714, y + 13.5, 12.5, ART.DK(T3[2], 0.35), 'left', false); /* v4.8 등급 아이콘 */ txt(`${r.e}점`, 860, y + 13.5, 13.5, '#3e2418', 'right', false); });
    if (L2.length < 2) txt('친구 도전장을 넣으면 여기서 함께 순위를 볼 수 있어요 (친구 랭킹 탭 → 친구 도전장 넣기)', 636, 300, 12.5, '#8a6142', 'center', false, null, 480);
    { const H2 = R.hist[0]; txt(H2 ? `지난 시즌 ${seasonNo(H2.s)} 내 등급: ${PVP_TIER[H2.ti][1]} · ${H2.r}점 · ${H2.w}승 ${H2.l}패` : '지난 시즌 내 등급: 아직 없어요 (첫 시즌)', 636, 438, 12.5, '#3e2418', 'center', false, null, 490); if (H2) tierBadge(636 - 220, 438, H2.r, 0.9); } /* v4.8 */
    txt(`시즌이 끝나기까지 ${Math.ceil(pvpSeasonLeft())}일 · 끝나면 등급 보상 + 점수 절반`, 636, 458, 12, '#5a3a8a', 'center', false, null, 490);
  } else if (P.hist) { /* v4.6 대전 기록: 상대별 이김·짐 + 가장 많이 쓴 기사 */
    txt('📜 상대별 기록', 394, 130, 14, '#3e2418', 'left', false); txt('이김·짐 · 그 상대에게 많이 쓴 기사', 880, 130, 11.5, '#8a6142', 'right', false);
    const vs = Object.entries(R.vs).sort((a, b) => (b[1].w + b[1].l) - (a[1].w + a[1].l)).slice(0, 6);
    if (!vs.length) txt('대전을 하면 여기에 상대별 기록이 쌓여요', 636, 220, 13, '#a08a70', 'center', false);
    vs.forEach(([n, V], i) => { const y = 148 + i * 32, tot = V.w + V.l, top = Object.entries(V.u || {}).sort((a, b) => b[1] - a[1])[0]; RR(390, y, 492, 28, 8); ctx.fillStyle = i % 2 ? 'rgba(141,90,43,.08)' : 'rgba(141,90,43,.15)'; ctx.fill();
      txt(n, 402, y + 14, 13, '#3e2418', 'left', false, null, 170); txt(`${V.w}승 ${V.l}패`, 640, y + 14, 13, V.w >= V.l ? '#2e7d32' : '#c0392b', 'center', false); txt(`${Math.round(V.w / Math.max(1, tot) * 100)}%`, 712, y + 14, 12, '#6b4426', 'center', false);
      if (top && UNITS[+top[0]]) { ART.drawFit(ctx, UNITS[+top[0]].id, 'i0', 776, y + 14, 24, 26, { face: 0.85 }); txt(`${UNITS[+top[0]].nick} ${top[1]}번`, 792, y + 14, 11.5, '#5a3a1e', 'left', false, null, 86); } });
    const tu = Object.entries(R.use).sort((a, b) => b[1] - a[1]).slice(0, 3); txt('⭐ 대전에서 가장 많이 쓴 기사', 394, 352, 13.5, '#3e2418', 'left', false);
    if (!tu.length) txt('아직 없어요', 640, 352, 12.5, '#a08a70', 'left', false);
    tu.forEach(([k, c], q) => { const x = 412 + q * 160, u = UNITS[+k]; if (!u) return; RR(x - 14, 368, 148, 46, 10); ctx.fillStyle = q === 0 ? 'rgba(255,201,60,.35)' : 'rgba(141,90,43,.1)'; ctx.fill(); ART.drawFit(ctx, u.id, 'i0', x + 14, 391, 36, 40, { face: 0.85 }); txt(`${q + 1}. ${u.nick}`, x + 38, 383, 13, '#3e2418', 'left', false, null, 90); txt(`${c}번 출전`, x + 38, 402, 11.5, '#6b4426', 'left', false); });
    const H = R.hist[0]; txt(H ? `지난 시즌 ${seasonNo(H.s)}: ${PVP_TIER[H.ti][1]} · ${H.r}점 · ${H.w}승 ${H.l}패 (총 ${(R.tw || 0) + R.w}승 ${(R.tl || 0) + R.l}패)` : `시즌은 4주마다 끝나요 · 끝나면 점수가 1000 쪽으로 절반만 남아요`, 636, 440, 12, '#5a3a8a', 'center', false, null, 490);
  } else {
    txt('대전 상대 고르기 · 친구 도전장을 넣으면 친구 기사단과 기사도 나와요', 636, 130, 13, '#6b4426', 'center', false, null, 500);
    L.slice(0, 7).forEach((o, i) => { const y = 148 + i * 44; RR(390, y, 492, 38, 10); ctx.fillStyle = o.fr ? 'rgba(90,154,208,.18)' : 'rgba(141,90,43,.1)'; ctx.fill(); const t2 = pvpTier(o.e);
      if (o.h) { ctx.save(); RR(394, y + 2, 34, 34, 8); ctx.clip(); ART.drawFit(ctx, 'hero_' + o.h, 'i0', 411, y + 20, 34, 36, { face: 0.9 }); ctx.restore(); }
      txt(o.n + (o.fr ? ' (친구)' : ''), 434, y + 13, 13.5, '#3e2418', 'left', false, null, 134); txt(`기사 Lv.${o.l || '?'}`, 434, y + 29, 11, '#8a6142', 'left', false);
      String(o.a).split('').slice(0, 5).forEach((c, q) => { const ui2 = +c; if (UNITS[ui2]) ART.drawFit(ctx, UNITS[ui2].id, 'i0', 584 + q * 26, y + 20, 26, 30, { face: 0.85 }); }); txt(`${t2[1]} ${o.e}`, 746, y + 19, 12.5, ART.DK(t2[2], 0.35), 'center', false, null, 90);
      btn(800, y + 4, 74, 30, '대전!', () => { RANKP = null; go(() => startPvp(o)); }, { bg: '#c0392b', size: 14, key: 'pvp' + i }); });
  }
  txt('상대 기사단과 기사는 컴퓨터가 움직여요 · 3분 안에 상대 성을 부수거나, 3분 뒤 성이 더 많이 남으면 이겨요 · 이기면 코인 200', W / 2, 484, 12.5, '#8a6142', 'center', false, null, 840);
  if (R.got) { const G2 = R.got; ctx.fillStyle = 'rgba(10,5,20,.6)'; ctx.fillRect(-OX, 0, VW, H); uiPush({ x: -OX, y: 0, w: VW, h: H, key: 'pvpgb', tap: () => {} }); pkCard(W / 2 - 220, 150, 440, 230, { state: 'claim' }); rkTrophy(W / 2, 196, 1.1);
    txt(`시즌 ${seasonNo(G2.s)} 끝! 내 등급 ${PVP_TIER[G2.ti][1]}`, W / 2, 246, 18, '#3e2418', 'center', false); txt(`코인 +${G2.c}${G2.d ? ` · 별가루 +${G2.d}` : ''}${G2.tro ? ' · 🏆 대전 트로피 (성 장식)' : ''}`, W / 2, 278, 14, '#2e7d32', 'center', false, null, 420); txt('새 시즌: 점수가 1000 쪽으로 절반만 남았어요', W / 2, 304, 12.5, '#6b4426', 'center', false);
    btn(W / 2 - 70, 324, 140, 42, '받았어요!', () => { R.got = null; save(); SFX.rare(); }, { bg: '#5cb84a', size: 16, key: 'pvpgok' }); } }
function drawRank() { const P = RANKP; P.t += G.dt || 0.016; ui = []; dragH = null; const by = P.by || 'week', tab = P.tab || 0;
  ctx.save(); ctx.globalAlpha = Math.min(1, P.t * 4); ctx.fillStyle = 'rgba(15,6,0,.74)'; ctx.fillRect(-OX, 0, VW, H); ctx.restore(); uiPush({ x: -OX, y: 0, w: VW, h: H, key: 'rkblk', tap: () => {} });
  ART.panel(ctx, 40, 34, W - 80, 484, 'cream'); pkRibbon(W / 2, 14, '랭킹', '#e8962a', 240); rkTrophy(W / 2 - 150, 40, 1); rkTrophy(W / 2 + 150, 40, 1);
  [['친구 랭킹', 0], ['내 기록', 1], ['⚔ 1:1 대전', 3], ['온라인', 2]].forEach(([n, k], q) => btn(66 + q * 132, 64, 124, 34, n, () => { P.tab = k; }, { bg: tab === k ? '#ffc93c' : k === 3 ? '#e89a8a' : '#c9a983', size: 14, key: 'rkt' + k })); /* v4.5 1:1 대전 탭 (안쪽 번호 3) */
  btn(W - 86, 46, 36, 32, 'X', () => { RANKP = null; }, { bg: '#a99a8a', size: 15, key: 'rkx' });
  const me = myRank(), dn = DIFFS[me.d].n;
  if (tab === 3) drawPvpTab(P);
  else if (tab === 0) {
    txt('순위 기준', 70, 121, 13.5, '#6b4426', 'left', false); [['주간 도전', 'week'], ['탑 층', 'tower'], ['별', 'stars'], ['깬 판', 'stage'], ['보스 대회', 'boss'], ['대전 점수', 'pvp']].forEach(([n, k], q) => btn(146 + q * 98, 106, 92, 30, n, () => { P.by = k; }, { bg: by === k ? '#5a9ad0' : '#b8c8d8', size: 13, key: 'rkb' + k }));
    btn(746, 106, 124, 30, '내 도전장 QR', () => { P.qr = 1; }, { bg: '#7a5ab0', size: 13, key: 'rkqr' });
    RR(64, 144, W - 128, 30, 8); ctx.fillStyle = 'rgba(141,90,43,.22)'; ctx.fill();
    [['순위', 96], ['기사', 200], [by === 'pvp' ? '1:1 대전 점수' : by === 'boss' ? `보스 대회 · ${ENEMIES[BOSSES[wbBoss()]].name}` : `주간 도전 (${dn})`, 400], ['탑', 560], ['별', 660], ['깬 판', 760]].forEach(([s, x]) => txt(s, x, 159, 13, '#6b4426', 'center', false));
    const L = rankList(by), wk = weekNo();
    L.slice(0, 8).forEach(({ r, k }, i) => { const y = 180 + i * 31, me1 = !!r.me, on = P.sel === r; RR(64, y, W - 128, 28, 8); ctx.fillStyle = me1 ? 'rgba(255,201,60,.45)' : on ? 'rgba(90,154,208,.3)' : i % 2 ? 'rgba(141,90,43,.08)' : 'rgba(141,90,43,.16)'; ctx.fill(); if (on) { ctx.lineWidth = 2; ctx.strokeStyle = '#3a8ad0'; ctx.stroke(); }
      if (k > 0 && i < 3) rkMedal(96, y + 13, i); else txt(`${i + 1}`, 96, y + 14, 14, '#5a3412', 'center', false);
      txt(r.n + (me1 ? ' (나)' : ''), 200, y + 14, 14, me1 ? '#c0501a' : '#3e2418', 'center', false, null, 170);
      const old = !r.me && r.w < wk; if (by === 'pvp') { const e2 = r.me ? pvpR().r : r.e; txt(e2 ? `${pvpTier(e2)[1]} ${e2}` : '—', 400, y + 14, 13.5, e2 ? pvpTier(e2)[2] : '#3e2418', 'center', false); } else if (by === 'boss') txt(r.w === wk && r.b > 0 ? fmtT(r.b) : '—', 400, y + 14, 13.5, '#3e2418', 'center', false); else txt(r.w === wk && r.d === me.d && r.t > 0 ? fmtT(r.t) : r.w === wk && r.t > 0 ? `${fmtT(r.t)} · ${DIFFS[r.d].n}` : old && r.t > 0 ? `지난 기록 ${fmtT(r.t)} (${wk - r.w === 1 ? '지난주' : (wk - r.w) + '주 전'})` : '—', 400, y + 14, old ? 12 : 13.5, old ? '#a08a70' : '#3e2418', 'center', false, null, 190); /* v4.1 옛 주 기록은 순위에 넣지 않고 회색으로 */
      txt(r.w === wk && r.tw ? `${r.tw}층` : old && r.tw ? `(${r.tw}층)` : '—', 560, y + 14, 13.5, old ? '#a08a70' : '#3e2418', 'center', false); txt(`${r.st}`, 660, y + 14, 13.5, '#3e2418', 'center', false); txt(`${r.c}판`, 760, y + 14, 13.5, '#3e2418', 'center', false);
      if (!me1) uiPush({ x: 64, y, w: W - 128, h: 28, key: 'rkr' + i, tap: () => { P.sel = r; } }); });
    if (!(S.friends || []).length) txt('아직 친구가 없어요. 「내 도전장 복사」로 코드를 보내고, 친구 코드를 넣어 보세요!', W / 2, 250, 13.5, '#8a6142', 'center', false, null, 760);
    const sel = P.sel && (S.friends || []).includes(P.sel) ? P.sel : null, canRace = sel && sel.w === wk && sel.d === me.d && sel.t > 0;
    pkBtn(66, 434, 200, 46, '📋 내 도전장 복사', rankCopy, { bg: '#e0762a', size: 15, key: 'rkcopy' });
    pkBtn(276, 434, 200, 46, '➕ 친구 도전장 넣기', rankPaste, { bg: '#3a9ad0', size: 15, key: 'rkpaste' });
    pkBtn(486, 434, 240, 46, sel ? (canRace ? `🏁 ${sel.n} 기록에 도전` : `${sel.n}: 이번 주 기록 없음`) : '🏁 친구를 눌러 고르기', () => { if (!canRace) return; S.rival = { n: sel.n, t: sel.t, w: sel.w, d: sel.d }; save(); RANKP = null; go(() => startWeekly()); }, { bg: canRace ? '#5cc96b' : '#a99a8a', size: 14, key: 'rkrace', shine: !!canRace });
    if (sel) btn(738, 438, 120, 34, '친구 지우기', () => { S.friends = S.friends.filter(f => f !== sel); P.sel = null; save(); }, { bg: '#c8a090', size: 13, key: 'rkdel' });
    txt('친구 기록은 도전장을 받은 때의 기록이에요 · 새 기록은 새 도전장으로', W / 2, 498, 12, '#8a6142', 'center', false, null, 760);
  } else if (tab === 1) {
    const DR = weekRecs(me.d), wk = weekNo(), ws = Object.keys(DR).map(Number).sort((a, b) => b - a).slice(0, 6);
    pkCard(64, 108, 400, 360, {}); txt(`📅 주간 도전 최고 기록 (${dn})`, 80, 128, 15, '#3e2418', 'left', false);
    if (!ws.length) txt('아직 기록이 없어요', 264, 220, 13.5, '#8a6142', 'center', false);
    ws.forEach((w, i) => { const y = 160 + i * 46, r = DR[w], R = WEEKLY.find(q => q.k === r.k); RR(80, y, 368, 38, 10); ctx.fillStyle = w === wk ? 'rgba(255,201,60,.35)' : 'rgba(141,90,43,.1)'; ctx.fill(); txt(w === wk ? '이번 주' : `${wk - w}주 전`, 96, y + 19, 13.5, '#6b4426', 'left', false); txt(R ? R.n : '', 190, y + 19, 13, '#5a3412', 'left', false, null, 170); txt(fmtT(r.t), 430, y + 19, 16, '#3e2418', 'right', false); });
    pkCard(480, 108, 416, 360, {}); txt('⭐ 내 기록', 496, 128, 15, '#3e2418', 'left', false);
    const T = S.tower || {}, hist = (T.hist || []).map(h => h.best), bestT = Math.max(T.best || 0, ...hist, 0);
    [['깬 판', `${S.cleared || 0} / ${MAXST}`], ['모은 별', `${starTotal()} / ${MAXST * 3}`], ['이번 주 탑', `${T.w === towerWeek() ? T.best || 0 : 0}층`], ['탑 최고', `${bestT}층`], ['주간 스티커', `${Object.keys(S.stickers || {}).filter(k => k[0] === 'w').length}개`], ['친구', `${(S.friends || []).length}명`], ['친구 대결 이김', `이번 주 ${((S.duel && S.duel.w[weekNo()]) || []).length}명 · 모두 ${(S.duel && S.duel.tot) || 0}번`], ['미니 놀이', `${S.vilMiniDone || 0}번`], ['지난주 대결', (L => L.length ? L.join(' · ') + ' 이김' : '이긴 친구 없음')((S.duel && S.duel.w[weekNo() - 1]) || [])]].forEach(([a, b], i) => { const y = 154 + i * 34; /* v4.2 지난주 대결 결과(이긴 친구 이름) 한 줄 */ if (i === 8) { txt(a, 506, y, 14, '#6b4426', 'left', false); txt(b, 876, y, 13.5, '#3e2418', 'right', false, null, 250); return; } txt(a, 506, y, 14, '#6b4426', 'left', false); txt(b, 876, y, 16, '#3e2418', 'right', false); });
  } else {
    pkCard(64, 108, W - 128, 360, {}); txt('🌐 온라인 랭킹', 84, 132, 17, '#3e2418', 'left', false);
    const on = RANK_ONLINE.ready && RANK_ONLINE.plug();
    wrapTxt(on ? '구글 플레이 게임 순위표에서 전국 기사들과 주간 도전 시간 · 탑 층 · 별을 겨뤄요. 이름은 구글 플레이 게임 별명으로 보여요.' : '온라인 랭킹은 앱이 스토어에 나온 뒤 구글 플레이 게임 순위표로 열려요. 지금은 「친구 랭킹」에서 도전장 코드로 친구와 겨뤄 보세요!', 84, 170, W - 180, 14, '#5a3412', 24);
    [['주간 도전 (' + dn + ')', 'week' + me.d], ['탑 층', 'tower'], ['모은 별', 'stars']].forEach(([n, k], q) => btn(84 + q * 268, 300, 252, 50, n + ' 순위표', () => { if (!RANK_ONLINE.show(k)) floatMsg = { s: '앱 출시 후 열려요!', x: W / 2, y: 120, t: 1.8 }; }, { bg: on ? '#3a9a4a' : '#a99a8a', size: 15, key: 'rko' + q }));
    txt('어린이 이용자를 위해 채팅·쪽지는 없어요 · 순위표에는 별명과 기록만 보여요', W / 2, 400, 12.5, '#8a6142', 'center', false, null, 760);
  }
  if (P.qr) { /* v4.1 도전장 QR: 친구가 휴대폰 카메라로 찍으면 코드 글자가 나옴 → 복사해서 「친구 도전장 넣기」 */
    const code = rankCode(me); if (!P.qrM || P.qrC !== code) { P.qrM = QR.make(code); P.qrC = code; }
    ctx.save(); ctx.fillStyle = 'rgba(15,6,0,.6)'; ctx.fillRect(-OX, 0, VW, H); ctx.restore(); uiPush({ x: -OX, y: 0, w: VW, h: H, key: 'qrblk', tap: () => { P.qr = 0; } });
    /* v4.2 왼쪽 QR · 오른쪽 「찍기 → 복사 → 붙여넣기」 그림 설명 3칸 */
    const L0 = W / 2 - 310; pkCard(L0, 52, 620, 446, {}); txt(`${me.n} 기사의 도전장`, W / 2, 80, 18, '#3e2418', 'center', false); rkTrophy(L0 + 40, 80, 0.7); rkTrophy(L0 + 580, 80, 0.7);
    const M = P.qrM; if (M) { const n = M.length, cell = Math.floor(280 / (n + 4)), sz = cell * (n + 4), x0 = L0 + 160 - sz / 2, y0 = 104; ctx.fillStyle = '#ffffff'; ctx.fillRect(x0, y0, sz, sz); ctx.fillStyle = '#1e1208'; for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (M[r][c]) ctx.fillRect(x0 + (c + 2) * cell, y0 + (r + 2) * cell, cell, cell); ctx.strokeStyle = '#c8901a'; ctx.lineWidth = 2; ctx.strokeRect(x0 - 1, y0 - 1, sz + 2, sz + 2); }
    { const n3 = Math.ceil(code.length / 4); [0, 1, 2, 3].forEach(k => txt(code.slice(k * n3, (k + 1) * n3), L0 + 160, 394 + k * 13.5, 12.5, '#6b4426', 'center', false, null, 290)); } /* v5.0 폰 글씨: 네 줄 · 조금 크게 */
    const step = (k, y, title, sub, icon) => { RR(L0 + 318, y, 280, 92, 12); ctx.fillStyle = 'rgba(141,90,43,.1)'; ctx.fill(); ctx.strokeStyle = 'rgba(141,90,43,.35)'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.beginPath(); ctx.arc(L0 + 336, y + 18, 12, 0, TAU); ctx.fillStyle = '#e0762a'; ctx.fill(); txt(String(k), L0 + 336, y + 18.5, 13, '#fff', 'center', false);
      icon(L0 + 372, y + 54); txt(title, L0 + 420, y + 34, 14.5, '#3e2418', 'left', false, null, 172); txtW(sub, L0 + 420, y + 60, 12, '#6b4426', 'left', 172, 15); };
    const phone = (x, y) => { RR(x - 16, y - 28, 32, 54, 6); ctx.fillStyle = '#3e3a48'; ctx.fill(); RR(x - 12, y - 22, 24, 40, 3); ctx.fillStyle = '#bfe6ff'; ctx.fill(); ctx.beginPath(); ctx.arc(x, y - 25, 1.6, 0, TAU); ctx.fillStyle = '#9aa'; ctx.fill(); };
    step(1, 104, '카메라로 찍기', '친구 휴대폰 카메라를 이 QR에 비춰요', (x, y) => { phone(x, y); ctx.fillStyle = '#1e1208'; [[-7, -14], [3, -14], [-7, -4], [-2, 4], [4, 0]].forEach(([a, b]) => ctx.fillRect(x + a, y + b, 5, 5)); ctx.strokeStyle = '#e0762a'; ctx.lineWidth = 1.6; ctx.strokeRect(x - 10, y - 18, 20, 30); });
    step(2, 204, '글자 복사', 'MMK-로 시작하는 글자를 길게 눌러 복사', (x, y) => { phone(x, y); RR(x - 10, y - 8, 20, 10, 2); ctx.fillStyle = '#ffe08a'; ctx.fill(); ctx.fillStyle = '#8a6142'; ctx.fillRect(x - 7, y - 4.5, 14, 1.6); ctx.fillRect(x - 7, y - 1.5, 9, 1.6); ART.paw(ctx, x + 8, y + 12, 0.35, '#e0762a'); });
    step(3, 304, '게임에 붙여넣기', '친구 게임 → 🏆 랭킹 → 「친구 도전장 넣기」', (x, y) => { RR(x - 18, y - 22, 36, 44, 6); ctx.fillStyle = '#c8a070'; ctx.fill(); RR(x - 12, y - 16, 24, 34, 3); ctx.fillStyle = '#fffaf0'; ctx.fill(); RR(x - 7, y - 26, 14, 8, 2); ctx.fillStyle = '#8a6142'; ctx.fill(); rkMedal(x, y + 2, 0); });
    txt('도전장엔 이름·기록만 (주소 없음)', L0 + 458, 418, 12, '#8a6142', 'center', false, null, 280);
    btn(W / 2 - 150, 452, 140, 34, '📋 코드 복사', rankCopy, { bg: '#e0762a', size: 13, key: 'qrcopy' }); btn(W / 2 + 10, 452, 140, 34, '닫기', () => { P.qr = 0; }, { bg: '#a99a8a', size: 13, key: 'qrx' }); }
}
/* 주간 도전에서 친구 기록 띄우기 (전투 화면 위) */
function drawRival() { if (!B || !B.weekly || !B.rival || B.over) return; const r = B.rival, left = r.t - B.t; RR(W / 2 - 150, 104, 300, 26, 13); ctx.fillStyle = 'rgba(40,20,5,.66)'; ctx.fill(); txt(`🏁 ${r.n} 기록 ${fmtT(r.t)} · ${left > 0 ? fmtT(left) + ' 남음' : '넘었어요!'}`, W / 2, 117.5, 13, left > 0 ? '#ffe08a' : '#ff9a8a', 'center', false, null, 290); }
window.__MMK = { itemArt: (id, x, y, s) => itemArt(id, x, y, s), shopTest: () => { const S0 = JSON.stringify(S), sp = SHOPP; SHOPP = { t: 0 }; const res = { rej: 0, ok: 0, n: 0, prob: {} }; const all = () => { let got = 0; for (const it of ITEMS) { const b = invN(it.id); buyItem(it); if (invN(it.id) > b) got++; } for (const bx of BOXES) { const b = S.inv.length; buyBox(bx); if (S.inv.length > b) got++; } for (const bd of BUNDLES) { const k = Object.keys(bd.items)[0], b = invN(k); buyBundle(bd); if (invN(k) > b) got++; } return got; };
    S.items = {}; S.inv = []; S.gems = 0; const c0 = S.coins = 999999; res.n = ITEMS.length + BOXES.length + BUNDLES.length; res.rej = res.n - all(); res.coinUsed = c0 - S.coins; S.items = {}; S.inv = []; S.gems = 99999; res.ok = all();
    { S.items = {}; S.gems = 0; S.coins = 999999; const CI = ITEMS.filter(q => q.c); res.coinN = CI.length; res.coinOk = 0; let want = 0; for (const it of CI) { const b = invN(it.id); buyItem(it, true); if (invN(it.id) > b) res.coinOk++; want += it.c; } res.coinSpent = 999999 - S.coins; res.coinWant = want; res.powerCoin = ITEMS.filter(q => q.power && q.c).length; res.ticket = ITEMS.some(q => q.id === 'x2ticket') ? 1 : 0; } /* v4.6 작은 아이템 코인 구매 */
    for (const id in BOX_RATES) { const C = {}, N = 100000; for (let k = 0; k < N; k++) { const r = rollBox(id); C[r] = (C[r] || 0) + 1; } res.prob[id] = BOX_RATES[id].map(([r, p]) => [r, p, Math.round(C[r] / N * 10000) / 100]); }
    let fieldMyth = 0; for (let k = 0; k < 20000; k++) if (makeItem(400, 0).r === 4) fieldMyth++; res.fieldMyth = fieldMyth; { const fc = [0, 0, 0, 0, 0]; for (let k = 0; k < 100000; k++) fc[makeItem(400, 0).r]++; res.field = fc; let rwOk = 0; for (let k = 0; k < 200; k++) { const it = makeItem(400, 2, 'reward'); if (it.r >= 2 && it.r <= 3) rwOk++; } res.rewardOk = rwOk; } /* v4.8 필드 확률 */ Object.assign(S, JSON.parse(S0)); SHOPP = sp; return res; }, permTest: () => { const S0 = JSON.stringify(S), out = []; for (const pm of [{}, { r2: 1 }, { r4: 1 }, { r2: 1, r4: 1 }, { sp2: 1 }]) { S.perm = pm; startBattle(5); B.speed = 1; toggleSpeed(); const sp = B.speed; B.coins = 100; B.nest.hp = 0; B.over = false; endBattle(true); out.push({ p: Object.keys(pm).join('+') || '없음', k: B.permK, sp }); } Object.assign(S, JSON.parse(S0)); setScene('map'); return out; },
  pvpTest: (i) => { const o = pvpList().filter(q => q.bot)[i]; startPvp(o); return { n: o.n, hero: !!(B.pvpHero && B.pvpHero.oppHero), look: o.h, l: o.l }; },
  resultTest: (full, bud) => { startBattle(40); endBattle(true); const o = B.over; o.t = 3; if (bud) { S.pets = S.pets || {}; S.pets.panda = 1; S.pet = 'panda'; S.petLv = Object.assign(S.petLv || {}, { panda: 5 }); B.buddyNew = 1; o.t = 1.6; } if (full) { B.permK = 4; B.towerRew = 800; B.petUse = 14; B.petKill = 6; B.petCombo = 3; B.streakRew = 1; B.weekRew = { first: 1, deco: '꽃 화분', coin: 300 }; B.dustGot = 6; B.weekBest = { t: 133, old: 1 }; o.sold = 1200; o.aSold = 1200; B.loot = [makeItem(40), makeItem(40), makeItem(40)]; } return B.over; }, /* v5.2 검사: 결과 화면 줄 가장 많이 */
  PETS, petTest: () => { const S0 = JSON.stringify(S), out = []; S.pets = {}; PETS.forEach(P => S.pets[P.id] = 1); S.castleSkin = null; S.pet = null; startBattle(5); const b0 = B.base.max, x0 = B.xpK || 1;
    for (const P of PETS) { S.pet = P.id; startBattle(5); const e = petEff(); const r = { id: P.id, atk: +(B.petAtk || 0).toFixed(3), chp: +(B.base.max / b0 - 1).toFixed(3), xp: +((B.xpK || 1) / x0 - 1).toFixed(3), coin: e.coin || 1, mana: e.mana || 0, food: e.food || 0 };
      startPvp(pvpList().filter(q => q.bot)[0]); r.pvpAtk = B.petAtk || 0; r.pvpCoin = B.pvp ? 1 : 0; out.push(r); }
    S.petLv = { panda: 5 }; S.pet = 'panda'; startBattle(5); const lv5 = +(B.base.max / b0 - 1).toFixed(3); Object.assign(S, JSON.parse(S0)); setScene('map'); return { pets: out, pandaLv5: lv5 }; },
  startPvp: o => startPvp(o), pvpList: () => pvpList(), pvpR: () => pvpR(), myPower: () => myPower(), vilAlbum: () => { if (VILP) VILP.album = true; }, vilP: () => VILP, startContest: () => startContest(), wbBoss: () => wbBoss(), guestToday: () => guestToday(), vilGuest: () => { if (VILP) VILP.gpan = true; }, vilLetter: () => { S.guestLetter = { d: '2000-1-1', k: 3, read: 0 }; if (VILP) VILP.letter = { k: 3 }; }, vilLbox: () => { S.letters = { 0: '2026-11-14', 3: '2026-11-15', 7: '2026-11-12' }; if (VILP) VILP.lbox = 1; }, vilReply: (rp) => { S.letters = { 3: '2026-11-15' }; if (VILP) VILP.letter = { k: 3, old: 1, rp: rp ? 1 : 0 }; }, vilWalk: (p, q) => { if (VILP) vilBuddyWalk(VILP, { p, q, n: 0 }); }, openBH: (sel) => { BHP = { t: 0, sel, pg: sel != null ? Math.floor(sel / 10) : null }; }, startRematch: z => startRematch(z), bhOf, bhStars, huntSpot: () => huntSpot(), huntClaim: () => { const h = huntSpot(); if (h) huntClaim(h); return !!h; }, openRank: (tab, by, qr) => { RANKP = { t: 0, tab: tab || 0, by: by || 'week', qr: qr ? 1 : 0 }; }, openVilBud: () => { VILP = { t: 0, bud: true }; }, rankCode, rankAdd, rankRead, myRank, qrMake: s => QR.make(s), vilActs: () => VILP && VILP.acts, bossKey: z => BOSSES[z], nodePos: n => { const N = NODES[n - 1]; return N ? [N.x, N.y] : null; }, mapGo: x => { mapTX = mapX = clampMap(x - W / 2); }, mapX: () => mapX, vilModes: () => VILP && VILP.acts ? VILP.acts.map(a => a.mode) : [], vilMiniTest: (d, v) => { if (v != null) S.vilMiniN = v ? 1 : 0; vilMiniOpen(); const m = VILP.mini; for (let k = 0; k < (d || 0) && k < m.its.length; k++) { m.its[k].got = 1; m.its[k].f = 1; m.done++; } if (m.done >= m.its.length) m.end = 1; }, setVilSeason: s => { window.__sea = s; for (const k in VILBG) delete VILBG[k]; }, setMapTab: i => { mapTab = i; mapSel = null; popup = 0; codexSel = null; }, setCodex: (c, p) => { codexCat = c; codexPage = p || 0; codexSel = null; }, vilPlayTest: (k) => { if (!VILP || !VILP.acts) return; const a = VILP.acts.find(q => q.k === (k === 'pet' ? 'pet' : 'dog')); vilPlayStart(a, k === 'hide' ? 'hide' : k === 'disc' ? 'disc' : 'ball'); if (k !== 'hide') vilPlayThrow(700, 480); }, vilWet: () => { if (VILP) VILP.forceWet = 1; }, bot: { step: dt => update(dt), enhance, enhCost, unitUnlocked, upCost, capOf, UPS, ITEMS, BOXES, makeItem, invN, bag }, openVil: () => { VILP = { t: 0 }; }, openShop: t => { SHOPP = { t: 0, tab: t || 0 }; }, useItem, closePops0: 0, openCel: () => { CEL = { t: 0 }; }, closeDaily: () => { DAILY = null; }, openWard: i => { WARDP = { t: 0, i }; }, feedSnack, closePops: () => { BHP = null; RANKP = null; AWK_POP = null; VILP = null; SHOPP = null; CEL = null; WARDP = null; AWKINFO = null; COMBOP = null; WEEKP = null; MIRP = null; SHARDP = null; }, openAwkInfo: () => { AWKINFO = { t: 0 }; }, openCombo: () => { COMBOP = { t: 0 }; }, startWeekly, openWeekly: (tab) => { WEEKP = { t: 0, tab: tab || 0 }; }, pvpHist: () => { if (RANKP) RANKP.hist = true; }, pvpBoard: () => { if (RANKP) RANKP.board = true; }, weekRule, useCombo, openAwk: i => { AWK_POP = { i, t: 0 }; }, setSeason: k => { S.forceSeason = k; }, seasonNow, startEvent: k => startEvent(k), dayEv, mapTiles: () => { mapBg = null; buildMapBg(); MAP_SCENES = null; return mapBg.map(t => { const s = performance.now(); buildMapTile(t); return Math.round(performance.now() - s); }); }, givePet, enhance, openPet: () => { PETP = { t: 0 }; }, startTrial, startTower, get DAILY() { return DAILY; }, openDaily: () => { DAILY = { t: 0 }; }, openMir: () => { MIRP = { t: 0 }; }, NODES, makeItem, endBattle, get S() { return S; }, setS: o => { S = o; }, get B() { return B; }, get scene() { return scene; }, startBattle, spawnAlly, useSkill, inp, stageInfo,
  setScene: s => { titleReady = true; setScene(s); }, skipStory: () => storyEnd(), playStory, get ST() { return ST; }, setTab: t => { mapTab = t; popup = 0; }, setPopup: n => { popup = n; }, select: s => { mapSel = s; }, get ui() { return ui; }, tapCard: i => tapCard(i), version: VERSION };
})();
