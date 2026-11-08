/* =========================================================
   멍멍기사 디펜스 (MungMung Knight Defense) v0.2.0
   - 가로형 모바일 횡스크롤 디펜스 / HTML5 Canvas
   - 그림: art.js / 음악·효과음: audio.js (모두 코드 생성, 외부 에셋 0개)
   ========================================================= */
'use strict';
(function () {
const VERSION = '1.6.0';
if (window.ART && ART.BUILD !== VERSION && window.mmkFail) mmkFail('파일 버전이 섞였어요 (art ' + (ART.BUILD || '옛 버전') + ' / game ' + VERSION + '). 새로 고침을 눌러 주세요.');
const W = 960, H = 540, GY = 380;
const FONT = ART.FONT;
const cvs = document.getElementById('game');
let ctx = cvs.getContext('2d');
let dpr = 1, scl = 1;
function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  scl = Math.min(window.innerWidth / W, window.innerHeight / H);
  cvs.style.width = Math.floor(W * scl) + 'px'; cvs.style.height = Math.floor(H * scl) + 'px';
  cvs.width = Math.floor(W * scl * dpr); cvs.height = Math.floor(H * scl * dpr);
}
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
const MAXST = 280, CHN = 28, CHL = 10;
const CH_POOLS = [['slime', 'rat'], ['slime', 'rat', 'toad', 'wolf'], ['rat', 'toad', 'bat', 'golem'], ['bat', 'wolf', 'golem', 'toad'], ['wolf', 'golem', 'sknight', 'bat'],
  ['crab', 'slime', 'toad', 'bat'], ['bat', 'sknight', 'wolf', 'crab'], ['golem', 'bat', 'crab', 'sknight'], ['sknight', 'toad', 'wolf', 'bat', 'slime'], ['sknight', 'golem', 'wolf', 'bat', 'crab', 'toad'], ['crab', 'bat', 'sknight', 'slime', 'golem'], ['sknight', 'wolf', 'golem', 'bat', 'crab', 'toad'],
  ['rat', 'golem', 'bat', 'sknight', 'crab'], ['bat', 'golem', 'sknight', 'wolf', 'toad', 'slime'],
  ['golem', 'rat', 'bat', 'wolf', 'crab'], ['sknight', 'golem', 'bat', 'wolf', 'crab', 'toad'],
  ['slime', 'crab', 'bat', 'toad', 'rat'], ['sknight', 'crab', 'bat', 'wolf', 'rat', 'toad'],
  ['bat', 'slime', 'toad', 'wolf', 'crab'], ['sknight', 'wolf', 'toad', 'bat', 'rat', 'crab'],
  ['rat', 'wolf', 'slime', 'bat', 'crab'], ['bat', 'toad', 'crab', 'wolf', 'slime'], ['golem', 'rat', 'toad', 'wolf', 'sknight'], ['crab', 'slime', 'bat', 'sknight', 'wolf', 'toad'],
  ['slime', 'bat', 'toad', 'rat', 'crab', 'wolf'], ['sknight', 'bat', 'wolf', 'rat', 'golem', 'toad'],
  ['golem', 'wolf', 'rat', 'bat', 'toad', 'slime'], ['bat', 'golem', 'sknight', 'crab', 'slime', 'toad']];
const BOSSES = ['kkuruk', 'troll', 'scorp', 'frost', 'nox', 'kraken', 'owl', 'cgolem', 'sbori', 'void', 'whale', 'fenrir', 'mole', 'bonedra', 'cogowl', 'tcat', 'jelly', 'dmir', 'spiderq', 'shadowk', 'catgen', 'roc', 'badger', 'seaspirit', 'rainturtle', 'shadowchild', 'mtgiant', 'echofairy'];
const MIDS = ['slime', 'wolf', 'golem', 'golem', 'sknight', 'crab', 'sknight', 'golem', 'wolf', 'sknight', 'crab', 'wolf', 'golem', 'sknight', 'golem', 'sknight', 'crab', 'sknight', 'wolf', 'sknight', 'wolf', 'crab', 'golem', 'sknight', 'crab', 'sknight', 'golem', 'sknight'];
const CH_NAMES = ['1장 · 햇살 들판', '2장 · 도토리 숲', '3장 · 모래 언덕', '4장 · 눈꽃 설원', '5장 · 불꽃 화산', '6장 · 별빛 해안', '7장 · 구름 왕국', '8장 · 수정 동굴', '9장 · 그림자 늪', '10장 · 별의 성', '11장 · 별의 바다', '12장 · 오로라 신전', '13장 · 두더지 광산 도시', '14장 · 화석 정원', '15장 · 태엽 마을', '16장 · 시간의 탑', '17장 · 구름사탕 해변', '18장 · 거꾸로 바다', '19장 · 별빛 정원', '20장 · 첫 번째 기사의 성', '21장 · 야옹 공화국', '22장 · 깃털 군도', '23장 · 굴굴 연방', '24장 · 이름 없는 바다', '25장 · 무지개 다리', '26장 · 그림자 아이의 마을', '27장 · 소리 없는 산', '28장 · 메아리 동굴'];
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
function stageInfo(n) {
  const ch = Math.min(CHN - 1, Math.floor((n - 1) / CHL)), k = (n - 1) % CHL, th = ART.THEMES[ch];
  let pool = CH_POOLS[ch].slice(); if (n === 1) pool = ['slime']; else if (n === 2) pool = ['slime', 'rat'];
  if (k < 3 && pool.length > 2) pool = pool.slice(0, pool.length - 1);
  return { n, ch, ti: ch, th, sub: k + 1, m: (1 + (n - 1) * 0.075) * (n > 3 ? (n > 100 ? 1.09 : 1.15) : 1), am: (1 + (n - 1) * 0.055) * (n > 3 ? (n > 100 ? 1.07 : 1.1) : 1), pool,
    nestHp: Math.round(800 + n * 120), interval: Math.max(n > 100 ? 1.44 : 1.38, (n > 3 ? 2.75 : 3.0) - n * 0.017), boss: k === CHL - 1, bossKey: k === CHL - 1 ? BOSSES[ch] : null,
    mid: k === 4, midKey: k === 4 ? MIDS[ch] : null, world: 2500 + Math.min(n, 40) * 22 + (k === 5 || k === 8 ? 300 : 0),
    name: STAGE_NAMES[ch][k], mis: MISSIONS[k], totems: k === 5 ? 2 : k === 8 || k === 9 ? 1 : 0,
    night: k === 3 || k === 8, dusk: k === 6 || k === 7, weather: k === 7 ? 'storm' : k === 2 && (ch === 1 || ch === 5 || ch === 8) ? 'rain' : null,
    coinM: k === 1 ? 1.6 : k === 3 ? 1.3 : k === 6 ? 1.4 : 1, xpM: k === 2 ? 1.3 : 1, swarm: k === 2 ? 1.6 : 1, atkM: k === 3 ? 1.15 : 1, spdM: k === 7 ? 1.15 : 1, raid: k === 6 };
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
function makeItem(stage, minR) {
  const x = Math.random(); let r = (stage >= 30 && x < 0.01 + stage * 0.00025) ? 4 : x < 0.05 ? 3 : x < 0.17 ? 2 : x < 0.46 ? 1 : 0; r = Math.max(r, minR || 0);
  const slot = pick(['weapon', 'armor', 'charm']), kind = pick(KINDS[slot]), k = 1 + r * 0.6 + (r === 4 ? 0.4 : 0);
  let val;
  if (slot === 'weapon') val = Math.round((3 + stage * 1.1) * k * WSTAT[kind].k);
  else if (slot === 'armor') val = Math.round((20 + stage * 8) * k * (kind === 'plate' ? 1.3 : kind === 'robe' ? 0.8 : kind === 'scale' ? 1.1 : 1));
  else val = kind === 'necklace' ? Math.round((0.6 + stage * 0.09) * k * 10) / 10 : kind === 'ring' ? Math.round(3 + r * 2 + stage * 0.06) : kind === 'bell' ? Math.round((0.8 + stage * 0.08) * k * 10) / 10 : kind === 'badge' ? Math.round(6 + r * 4 + stage * 0.1) : Math.round(4 + r * 3 + stage * 0.08);
  const aff = []; const pool = AFFIX.slice().sort(() => Math.random() - 0.5);
  for (let i = 0; i < Math.max(0, r - 1); i++) aff.push({ k: pool[i].k, v: pool[i].v(r) });
  return { id: S.uid++, slot, kind, r, name: (aff.length ? PREFIX[aff[0].k] + ' ' : '') + EQN[kind][r], val, st: stage, aff };
}
function fixItem(it) { if (!it) return it; if (!it.kind) it.kind = KINDS[it.slot][0]; if (!it.aff) it.aff = []; if (!EQN[it.kind][it.r]) it.r = Math.min(it.r, 4); it.name = (it.aff.length && PREFIX[it.aff[0].k] ? PREFIX[it.aff[0].k] + ' ' : '') + EQN[it.kind][it.r] + (it.up ? ' +' + it.up : ''); return it; }
// v1.3 장비 강화 (+1~+10, 실패 없음, +5·+10에 추가 능력)
function enhCost(it) { return Math.round((50 + (it.st || 1) * 5) * (1 + it.r * 0.6) * Math.pow((it.up || 0) + 1, 1.35)); }
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
function xpNeed(lv) { return Math.floor(30 * Math.pow(lv, 1.5)); }
function heroStats() {
  const e = S.eq;
  let atk = 14 + S.lv * 3 + S.up.atk * 4, hp = 160 + S.lv * 24 + S.up.hp * 35, mpR = 4 + S.up.mana * 0.8, fdR = 8.5 + S.up.food * 1.3;
  const A = { crit: 5, steal: 0, aspd: 0, gold: 0, speed: 0, ally: 0, xp: 0, regen: 0, def: 0, cdr: 0, mana: 0 };
  ['weapon', 'armor', 'charm'].forEach(sl => { const it = e[sl]; if (it) { fixItem(it); (it.aff || []).forEach(a => { A[a.k] = (A[a.k] || 0) + a.v; }); } });
  const wk = e.weapon ? e.weapon.kind : 'sword', WS = WSTAT[wk];
  if (e.weapon) atk += e.weapon.val; if (e.armor) { hp += e.armor.val; if (e.armor.kind === 'plate') A.speed -= 8; else if (e.armor.kind === 'robe') mpR += 1.5; else if (e.armor.kind === 'scale') A.def += 8; else A.speed += 5; }
  if (e.charm) { const c = e.charm; if (c.kind === 'ring') A.crit += c.val; else if (c.kind === 'talisman') A.ally += c.val; else if (c.kind === 'bell') fdR += c.val; else if (c.kind === 'badge') A.xp += c.val; else { mpR += c.val; fdR += c.val; } }
  if (WSTAT[e.weapon ? e.weapon.kind : 'sword'].crit) A.crit += WSTAT[e.weapon.kind].crit; mpR += A.mana;
  return { atk, hp, mpR, fdR, mpMax: 100, fdMax: 100 + S.up.food * 15, wk, range: WS.range, rate: WS.rate / (1 + A.aspd / 100), cleave: WS.cleave || 1, pierce: WS.pierce || 0, stun: !!WS.stun, crit: A.crit, steal: A.steal, gold: A.gold, spd: 165 * (1 + A.speed / 100), ally: A.ally, xp: A.xp, regen: A.regen, def: Math.min(50, A.def), cdr: Math.min(40, A.cdr) };
}
const UPS = [
  { k: 'hp', name: '기사 체력', desc: '기사 체력 +35 · 성 체력 +80', ic: 'heart' },
  { k: 'atk', name: '기사 공격력', desc: '기사 공격력 +4', ic: 'sword' },
  { k: 'food', name: '뼈다귀 창고', desc: '뼈다귀 생산 +1.3/초 · 최대치 +15', ic: 'bone' },
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
const UPMAX = 10;
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
function toLogical(e) { const r = cvs.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; }
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
    else if (b.tap && !b.disabled) { pressT[b.key || (b.x + ',' + b.y)] = 0.14; SFX.click(); b.tap(); }
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
const BGM_CH = { 26: 'quietpeak', 27: 'echocave', 24: 'rainbowsong', 25: 'graytown', 20: 'catcity', 21: 'feathers', 22: 'burrowsong', 23: 'namesea', 0: 'meadow', 1: 'forest', 2: 'arabian', 3: 'snow', 4: 'volcano', 5: 'hawaiian', 6: 'sky', 7: 'crystal', 8: 'swamp', 9: 'castle', 10: 'orchestra', 11: 'aurora', 12: 'cave', 13: 'fossil', 14: 'musicbox', 15: 'orchestra', 16: 'dream', 17: 'crystal', 18: 'starlight', 19: 'finale' };
const BOSS_BGM = ch => ch < 9 ? 'bossm' : ch < 14 ? 'bossw1' : ch < 18 ? 'bossw2' : ch < 20 ? 'bossw3' : 'bossw4';
function musicFor() {
  if (!AUD.ready) return;
  if (scene === 'title' || scene === 'create') AUD.play('puppy');
  else if (scene === 'map') AUD.play(S.cleared >= 100 ? 'mapw' : 'mapp');
  else if (scene === 'battle' && B && !B.over) AUD.play(B.bossDone && B.enemies.some(e => e.def.boss) ? BOSS_BGM(B.si.ch) : (BGM_CH[B.si.ch] || 'battlem'));
  else if (scene === 'story' && ST) AUD.play(ST.sc.boss ? 'bossm' : ST.sc.ending ? 'puppy' : 'mapp');
}
function setScene(s) { scene = s; if (s === 'map') mapX = null; holds.clear(); refreshHolds(); musicFor(); }

/* ---------------- 스토리 컷신 ---------------- */
let ST = null;
const TYPE_SPD = 34;
function hasStory(k) { return !!(window.STORY && STORY.SCENES[k] && !(S.seen && S.seen[k])); }
function enterStage(n, direct) { const f = () => { if (hasStory('pre' + n)) playStory('pre' + n, () => startBattle(n)); else startBattle(n); }; if (direct) f(); else go(f); }
function afterResult(fn) { const k = 'post' + B.n; if (B.over && B.over.win && !B.special && hasStory(k)) go(() => playStory(k, fn)); else go(fn); }
function replayStory(key) { playStory(key, () => { setScene('map'); mapTab = 4; codexCat = 7; }); if (ST) ST.replay = true; }
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
  const sc = { troll: 0.95, scorp: 1.35, frost: 1.0, nox: 1.25, noxgood: 1.5, bat: 2.4, kkuruk: 1.15, kraken: 1.3, owl: 1.4, void: 1.45, cgolem: 1.05, sbori: 1.65, whale: 0.75, fenrir: 0.95, mole: 0.95, bonedra: 0.85, cogowl: 0.95, tcat: 0.9, jelly: 0.95, dmir: 0.62, spiderq: 0.8, shadowk: 0.9, catgen: 0.85, roc: 0.8, badger: 0.85, seaspirit: 0.8, rainturtle: 0.8, shadowchild: 0.85, mtgiant: 0.8, echofairy: 0.85, mir: 1.45 }[sp.type] || 2.7;
  const typing = active && ST.t * TYPE_SPD < [...L[2]].length;
  const bob = typing ? -Math.abs(Math.sin(ST.t * 10)) * 5 : 0, y0 = sp.type === 'bat' ? 520 : sp.type === 'void' ? 470 : 386;
  ctx.save(); ctx.globalAlpha = active ? 1 : 0.45;
  ctx.fillStyle = 'rgba(20,8,0,.3)'; ART.E(ctx, x, 388, 70, 12); ctx.fill();
  const pim = AP['pt_' + who];
  if (pim) { const ph = 330, pw = ph * pim.naturalWidth / pim.naturalHeight; ctx.save(); ctx.translate(x, 0); if (flip) ctx.scale(-1, 1); ctx.drawImage(pim, -pw / 2, 392 - ph + bob, pw, ph); ctx.restore(); }
  else ART.draw(ctx, type, key, x, y0 + bob, sc, flip, 0);
  ctx.restore();
}
function drawStory() {
  ART.drawBg(ctx, ST.ti, 300 + G.time * 10, G.time, GY, W, H);
  if (ST.sc.night) {
    ctx.fillStyle = 'rgba(16,14,60,.62)'; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.7; ctx.drawImage(ART.softDot('#b9a8ff'), 600, -40, 260, 260); ctx.restore();
    if (!['swamp', 'castle', 'crystal', 'volcano', 'starsea', 'aurora', 'mine', 'fossil', 'clock', 'tower', 'candy', 'upside', 'stargarden', 'burrow', 'namesea', 'shadowvil', 'echocave'].includes(ART.THEMES[ST.ti].kind)) { ctx.fillStyle = '#f4ecff'; circ(730, 90, 34); ctx.fillStyle = 'rgba(16,14,60,.9)'; circ(746, 80, 30); }
    for (let k = 0; k < 40; k++) { const sx = (k * 197) % W, sy = (k * 83) % 260; ctx.globalAlpha = 0.4 + Math.sin(G.time * 2 + k) * 0.35; ctx.fillStyle = '#fff'; circ(sx, sy, k % 5 ? 1.2 : 2); } ctx.globalAlpha = 1;
  }
  const dg = ctx.createLinearGradient(0, 0, 0, H); dg.addColorStop(0, 'rgba(20,8,0,.25)'); dg.addColorStop(1, 'rgba(20,8,0,.7)'); ctx.fillStyle = dg; ctx.fillRect(0, 0, W, H);
  const L = storyLine(), who = L[0], narr = who === 'narr', sp = STORY.SPEAKERS[who];
  if (ST.left) storyPortrait(ST.left, 230, !narr && who === ST.left, false);
  if (ST.right) storyPortrait(ST.right, 730, !narr && who === ST.right, true);
  ART.vignette(ctx, W, H);
  const full = L[2], lines = wrapLines(full, narr ? 760 : 836, narr ? 21 : 22);
  let left = Math.floor(ST.t * TYPE_SPD); const done = left >= [...full].length;
  if (narr) {
    ctx.fillStyle = 'rgba(15,6,20,.78)'; ctx.fillRect(0, 380, W, 150);
    ctx.fillStyle = 'rgba(255,207,90,.6)'; ctx.fillRect(0, 380, W, 2); ctx.fillRect(0, 528, W, 2);
    lines.forEach((ln, i) => { const part = [...ln].slice(0, Math.max(0, left)).join(''); left -= [...ln].length; txt(part, W / 2 - ctx.measureText(ln).width / 2, 455 - (lines.length - 1) * 16 + i * 32, 21, '#f3e9ff', 'left', 'rgba(0,0,0,.6)'); });
  } else {
    ART.panel(ctx, 30, 400, 900, 128, 'cream');
    const spn = nameSub(sp.name); ctx.font = `bold 18px ${FONT}`; const nw = ctx.measureText(spn).width + 44;
    ART.panel(ctx, 56, 376, nw, 38, 'dark'); txt(spn, 56 + nw / 2, 396, 18, sp.side === 'L' || sp.friendly ? '#ffe082' : '#ff9e9e', 'center');
    lines.forEach((ln, i) => { const part = [...ln].slice(0, Math.max(0, left)).join(''); left -= [...ln].length; txt(part, 70, 448 + i * 32, 22, '#4a2a14', 'left', false); });
  }
  if (done && Math.floor(G.time * 2.5) % 2 === 0) txt('▼', 900, 506, 18, narr ? '#ffcf5a' : '#a0652a', 'center', false);
  txt(`${ST.i + 1} / ${ST.sc.lines.length}`, 40, 24, 12, 'rgba(255,255,255,.75)', 'left');
  if (ST.titleT > 0) {
    const a = Math.min(1, ST.titleT * 1.5, (2.6 - ST.titleT) * 3);
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = 'rgba(15,6,20,.75)'; ctx.fillRect(0, 150, W, 120);
    bigText(ST.sc.title, W / 2, 210, 42, ST.sc.boss ? '#ffb3b3' : '#fff6b0', ST.sc.boss ? '#e53935' : '#ffb300');
    ctx.restore();
  }
  btn(W - 168, 10, 156, 40, ST.replay ? '닫기 ✕' : '건너뛰기 ▶▶', () => storyEnd(), { bg: '#a99a8a', size: 15, key: 'skip' });
  { const au = S.autoSt || 0; btn(W - 300, 10, 124, 40, ['자동 넘김 끔', '자동 ▶', '자동 ▶▶ 빠르게'][au], () => { S.autoSt = (au + 1) % 3; save(); }, { bg: au ? '#5cc96b' : '#c9a983', size: au === 2 ? 12 : 14, key: 'auto' }); }
  sceneTap = () => storyNext();
}

/* ---------------- 전투 ---------------- */
function startBattle(n) {
  const si = stageInfo(n), hs = heroStats();
  const types = [heroType(), ...deck().map(i => UNITS[i].id), ...si.pool, ...(si.bossKey ? [si.bossKey] : [])];
  ART.warm(types);
  B = {
    n, si, world: si.world, camX: 0, t: 0, food: 70, mana: 30,
    allies: [], enemies: [], proj: [], drops: [], parts: [], texts: [], rings: [], fx: [], fly: [], amb: [],
    base: { x: 110, hp: 1200 + S.up.hp * 80, max: 0, isStruct: true, side: 'a', hit: 0 },
    nest: { x: si.world - 110, hp: si.nestHp, max: si.nestHp, isStruct: true, side: 'e', hit: 0 },
    hero: { x: 230, y: 8, hp: hs.hp, max: hs.hp, atk: hs.atk, range: hs.range, rate: hs.rate, cd: 0, face: 1, dead: false, resp: 0, anim: 0, moving: false, hit: 0, atkAnim: 0, side: 'a', isHero: true, spd: hs.spd, dust: 0 },
    hs, ucd: UNITS.map(() => 0), scd: [0, 0, 0, 0], later: [], spawnT: 4, over: null, speed: 1, paused: false,
    kills: 0, coins: 0, coinShown: 0, coinPulse: 0, xp: 0, loot: [], bossDone: false, rush: false, buff: 0, shake: 0, msg: null,
    towers: Array.from({ length: si.totems }, (_, k) => ({ x: si.world * (si.totems === 2 ? (k ? 0.68 : 0.46) : 0.6), hp: si.nestHp * 0.45, max: si.nestHp * 0.45, isStruct: true, isTotem: true, side: 'e', hit: 0, dead: false })),
    warns: [], silence: 0, bossSk: null, tut: !S.tut ? 9 : 0, lvStart: S.lv, banner: 3.0, bubble: { s: pick(LINES.start), t: 2.6 },
  };
  B.base.max = B.base.hp;
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
const HERO_STRUCT = 0.5, ALLY_K = 1.3; // v1.4 밸런스: 기사가 둥지·토템에 주는 피해 35%, 동료 체력·공격 ×1.3
const promoted = i => (S.up['u' + i] || 0) >= UPMAX;
const unitSprite = i => UNITS[i].id + (third(i) ? 't' : promoted(i) ? 'p' : '');
function spawnAlly(i) {
  if (!B || B.over || B.paused) return false;
  const d = UNITS[i];
  if (!unitUnlocked(i) || B.food < d.cost || B.ucd[i] > 0 || B.allies.length >= 30) return false;
  B.food -= d.cost; B.ucd[i] = d.cd;
  const k = (1 + 0.15 * (S.up['u' + i] || 0)) * (1 + (B.hs.ally || 0) / 100) * ALLY_K;
  const PR = promoted(i) ? PROMO[i] : {}, T3 = third(i) ? 1.25 : 1;
  B.allies.push({ heal: (d.heal || 0) * k * (PR.heal || 1), side: 'a', def: d, kind: unitSprite(i), promo: !!PR.n, pcrit: PR.crit || 0, dr: PR.dr || 0, x: B.base.x + 40, y: rnd(0, 24), hp: d.hp * k * (PR.hp || 1) * T3, max: d.hp * k * (PR.hp || 1) * T3, atk: d.atk * k * (PR.atk || 1) * T3, third: T3 > 1, tcd: 4, range: d.range + (PR.range || 0), spd: d.spd * rnd(0.95, 1.05) * (PR.spd || 1), rate: d.rate * (PR.rate || 1), cd: rnd(0, 0.3), anim: rnd(0, 6), hit: 0, atkAnim: 0, dead: false, kb: 0, moving: true });
  burst(B.base.x + 40, GY - 20, '#fff59d', 10, 160, true); fx('spark', { x: B.base.x + 40, y: GY - 24, dur: 0.35, col: '#fff59d', r: 26 });
  { const tr = TRAITS[d.id]; addText(B.base.x + 44, GY - 70, tr ? pick(tr.v) : '멍!', '#fff3c4', 15); }
  SFX.summon();
  return true;
}
function spawnEnemy(key, off, elite) {
  if (B.enemies.length >= 42 && !ENEMIES[key].boss && !elite) return;
  const d = ENEMIES[key], si = B.si;
  const hm = (d.boss ? 1 + (si.m - 1) * 0.6 : si.m) * (elite ? 9 : 1), bsc = d.boss ? 1.32 : 1;
  const fromT = !d.boss && !elite && B.towers && B.towers.find(t => !t.dead && Math.random() < 0.45), sx = fromT ? fromT.x - 20 : B.nest.x - 30;
  B.enemies.push({ elite: !!elite, sc: elite ? 1.45 : bsc, side: 'e', def: d, kind: key, x: sx + (off || 0), y: rnd(0, 24), hp: d.hp * hm, max: d.hp * hm, atk: d.atk * si.am * si.atkM * (elite ? 1.8 : 1), range: d.range * (elite ? 1.15 : 1), spd: d.spd * si.spdM * rnd(0.9, 1.1), rate: d.rate, cd: 0.6, anim: rnd(0, 6), hit: 0, atkAnim: 0, dead: false, kb: 0, moving: true });
  fx('spark', { x: sx + 22, y: GY - 52, dur: 0.4, col: '#e040fb', r: 40 });
}
function findTarget(u) {
  const dir = u.side === 'a' ? 1 : -1; let best = null, bd = 1e9;
  const check = o => { if (o.dead || o.hide > 0) return; const d = (o.x - u.x) * dir; if (d > -14 && d <= u.range && d < bd) { bd = d; best = o; } };
  if (u.side === 'a') { for (const o of B.enemies) check(o); } else { for (const o of B.allies) check(o); if (!B.hero.dead) check(B.hero); }
  if (best) return best;
  if (u.side === 'a') { for (const tw of B.towers) if (!tw.dead && tw.x - 30 - u.x <= u.range && tw.x - u.x > -30) return tw; if (B.nest.x - 40 - u.x <= u.range) return B.nest; } else if (u.x - (B.base.x + 40) <= u.range) return B.base;
  return null;
}
function targetY(t) { return t.isStruct ? GY - 70 : GY + (t.y || 0) - (t.def && t.def.fly ? 62 : 28); }
function dealDmg(t, dmg, fromSide, crit) {
  if (t.dead || (t.isStruct && t.hp <= 0) || t.hide > 0) return;
  if (t.inv > 0 && fromSide === 'e') return;
  if (t.isHero && fromSide === 'e') dmg *= 1.2; // v1.4 기사 혼자 돌파 방지: 기사가 받는 피해 +20%
  if (t.isHero && B.hs.def) dmg *= 1 - B.hs.def / 100;
  if (t.dr) dmg *= 1 - t.dr;
  if (t.reflect > 0 && fromSide === 'a') { dmg *= 0.3; const r = B.allies.concat(B.hero.dead ? [] : [B.hero]).filter(o => !o.dead && Math.abs(o.x - t.x) < 220); if (r.length && Math.random() < 0.5) { const o = pick(r); B.reflectQ = (B.reflectQ || []); B.reflectQ.push([o, dmg * 0.8]); } if (Math.random() < 0.2) addText(t.x, GY - 190, '반사!', '#bff4ff', 15); }
  if (t === B.nest && B.towers.some(tw => !tw.dead)) { dmg *= 0.08; if (Math.random() < 0.15) addText(t.x, GY - 150, '토템 방어막!', '#e1a8ff', 14); }
  dmg = Math.max(1, Math.round(dmg * rnd(0.9, 1.1)));
  t.hp -= dmg; t.hit = 0.18;
  const ty = targetY(t) - 14;
  addText(t.x + rnd(-8, 8), ty, '' + dmg, crit ? '#ffd54f' : fromSide === 'a' ? '#ffffff' : '#ff8a80', crit ? 22 : t.isStruct ? 18 : 16, crit);
  fx('hit', { x: t.x + rnd(-6, 6), y: ty + 14, dur: 0.22, col: fromSide === 'a' ? '#fff3b0' : '#ff8a80', r: crit ? 26 : 16 });
  SFX.hit();
  if (t.isStruct) { t.hp = Math.max(0, t.hp); return; }
  if (t.hp <= 0) {
    t.hp = 0;
    if (t.isHero) heroDie();
    else { t.dead = true; if (t.side === 'e') { onEnemyDie(t); if (!(t.def && t.def.boss)) { B.ghosts = B.ghosts || []; if (B.ghosts.length < 14) B.ghosts.push({ k: t.kind, x: t.x, y: GY + (t.y || 0), s: t.def.s * (t.sc || 1), t: 0, vx: rnd(60, 140), rot: rnd(0.6, 1.4) }); } } else poof(t.x, GY - 20, '#ffffff', 6); }
  }
}
function onEnemyDie(e) {
  B.kills++; dailyAdd('k', 1);
  if (e.def.boss) { B.slowmo = 0.6; B.punch = 0.4; B.shake = 0.6; fx('flash', { dur: 0.25, col: '#ffffff' }); }
  const d = e.def;
  gainXp(Math.round(d.xp * (1 + (B.n - 1) * 0.1) * (B.si.xpM || 1) * (1 + (B.hs.xp || 0) / 100)));
  const c = Math.round(d.coin * (1 + (B.n - 1) * 0.08) * (e.elite ? 6 : 1) * (1 + (B.hs.gold || 0) / 100) * (B.si.coinM || 1)), y0 = GY + e.y - (d.fly ? 62 : 24);
  const nCoin = Math.min(5, Math.max(1, Math.round(c / 3)));
  for (let i = 0; i < nCoin; i++) B.drops.push({ type: 'coin', x: e.x, y: y0, vx: rnd(-70, 70), vy: rnd(-280, -180), t: 0, val: i === 0 ? c - (nCoin - 1) * Math.floor(c / nCoin) : Math.floor(c / nCoin), life: 30, ground: false, gy: GY + e.y + rnd(-4, 4) });
  const r = Math.random(); let it = null;
  if (d.boss || e.elite) it = 'box'; else if (r < (B.si.mis.k === 'treasure' ? 0.08 : 0.03)) it = 'box'; else if (r < 0.13) it = 'bone'; else if (r < 0.21) it = 'meat'; else if (r < 0.29) it = 'star';
  if (it) B.drops.push({ type: it, x: e.x, y: y0, vx: rnd(-70, 70), vy: -260, t: 0, life: 22, ground: false, gy: GY + e.y, minR: d.boss ? 2 : e.elite ? 1 : 0 });
  if (d.boss) for (let i = 0; i < 2; i++) B.drops.push({ type: 'box', x: e.x + rnd(-30, 30), y: y0, vx: rnd(-90, 90), vy: -300, t: 0, life: 22, ground: false, gy: GY + e.y, minR: 1 });
  poof(e.x, y0 + 8, d.boss ? '#ffe082' : '#b39ddb', d.boss ? 30 : 7);
  for (let i = 0; i < (d.boss ? 14 : e.elite ? 8 : 3); i++) B.parts.push({ x: e.x + rnd(-12, 12), y: y0 + rnd(-10, 10), vx: rnd(-15, 15), vy: rnd(-90, -50), life: rnd(0.7, 1.2), max: 1.2, col: '#c79bff', size: rnd(6, 11), g: -40, soft: true, wisp: true });
  if (e.elite) { B.shake = 0.35; addText(e.x, y0 - 30, '정예 처치!', '#ffd54f', 22, true); }
  burst(e.x, y0, d.boss ? '#ffd54f' : '#e1bee7', d.boss ? 40 : 8, d.boss ? 280 : 160, true);
  if (d.boss) { B.shake = 0.6; musicFor(); }
  SFX.die();
}
function gainXp(x) {
  B.xp += x; S.xp += x; let up = false;
  while (S.xp >= xpNeed(S.lv)) { S.xp -= xpNeed(S.lv); S.lv++; up = true; }
  if (up) {
    const h = B.hero, hs = heroStats(); B.hs = hs; h.max = hs.hp; h.atk = hs.atk; if (!h.dead) h.hp = h.max;
    addText(h.x, GY - 120, `LEVEL UP!  Lv.${S.lv}`, '#ffe082', 26, true);
    fx('pillar', { x: h.x, y: GY + 8, dur: 1.0 }); ring(h.x, GY + 4, '#ffe082', 110); burst(h.x, GY - 50, '#ffd54f', 30, 240, true);
    SFX.lvl(); say(pick(LINES.lvl));
    const sk = SKILLS.find(s => s.lv === S.lv); if (sk) B.msg = { t: 2.8, s: `새 스킬 해금: ${sk.name}!` };
    save();
  }
}
function heroDie() { const h = B.hero; h.dead = true; h.hp = 0; h.resp = 7; poof(h.x, GY - 30, '#ffffff', 14); burst(h.x, GY - 30, '#fff', 16); B.msg = { t: 2.4, s: '멍멍기사가 쓰러졌어요! 7초 후 성에서 부활' }; SFX.lose(); }
function pickup(d) {
  d.got = true; const h = B.hero;
  if (d.type === 'bone') { B.food = Math.min(B.hs.fdMax, B.food + 20); addText(d.x, d.y - 24, '+20 뼈다귀', '#fff8e1'); SFX.pick(); }
  else if (d.type === 'meat') { const v = Math.round(h.max * 0.3); h.hp = Math.min(h.max, h.hp + v); addText(d.x, d.y - 24, '+' + v + ' 체력', '#a5d6a7'); SFX.pick(); }
  else if (d.type === 'star') { B.mana = Math.min(B.hs.mpMax, B.mana + 25); addText(d.x, d.y - 24, '+25 마나', '#90caf9'); SFX.pick(); }
  else if (d.type === 'box') { const it = makeItem(B.n, d.minR || 0); B.loot.push(it); addText(d.x, d.y - 30, `${RAR[it.r]} ${it.name}!`, RARC[it.r], 19, it.r >= 2); fx('pillar', { x: d.x, y: d.y + 6, dur: 0.8, col: RARC[it.r] }); burst(d.x, d.y - 10, RARC[it.r], 20, 220, true); SFX.rare(); }
  fx('spark', { x: d.x, y: d.y - 8, dur: 0.3, col: '#ffffff', r: 22 });
}
function useSkill(i) {
  if (!B || B.over || B.paused) return;
  const s = SKILLS[i], h = B.hero;
  if (h.dead || B.mana < s.mp || B.scd[i] > 0 || S.lv < s.lv) return;
  if (s.mir && !mounted()) { B.msg = { t: 1.4, s: '미르를 타야 쓸 수 있어요 (설정 → 기사·용 꾸미기)' }; return; }
  if (B.silence > 0) { B.msg = { t: 1.4, s: '침묵의 장막! 잠시 스킬을 쓸 수 없어요' }; return; }
  B.mana -= s.mp; B.scd[i] = s.cd * (1 - (B.hs.cdr || 0) / 100); dailyAdd('s', 1);
  B.skillCut = { i, t: 0.9 };
  if (i === 0) {
    fx('pawstamp', { x: h.x + h.face * 70, y: GY + 6, dur: 0.55 }); B.freeze = 0.07; B.punch = 0.3;
    h.atkAnim = 0.3;
    for (const e of B.enemies) { const d = (e.x - h.x) * h.face; if (d > -30 && d < 150) { dealDmg(e, h.atk * 3, 'a', true); if (!e.def.boss) e.kb = h.face * 70; } }
    if (Math.abs(B.nest.x - 40 - h.x) < 150) dealDmg(B.nest, h.atk * 3 * HERO_STRUCT, 'a', true);
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
      for (const tw of B.towers) if (!tw.dead && (tw.x - hx0) * f0 > -20 && (tw.x - hx0) * f0 < len) dealDmg(tw, B.hero.atk * 0.95 * mult, 'a');
      if ((B.nest.x - 40 - hx0) * f0 > 0 && (B.nest.x - 40 - hx0) * f0 < len) dealDmg(B.nest, B.hero.atk * 0.95 * mult * HERO_STRUCT, 'a');
    } });
    addText(h.x, GY - 150, '미르, 불꽃이야!', '#ffab91', 18);
  } else {
    const tg = B.enemies.filter(e => !e.dead && e.x > B.camX - 30 && e.x < B.camX + W + 30);
    tg.forEach((e, k) => fx('meteor', { x: e.x + rnd(-10, 10), y: GY + e.y, dur: 0.55, delay: 0.25 + k * 0.06, target: e, dmg: h.atk * 4.5 }));
    for (let k = 0; k < 8; k++) fx('meteor', { x: B.camX + rnd(60, W - 60), y: GY + rnd(0, 20), dur: 0.55, delay: 0.2 + k * 0.1 });
    if (B.nest.x > B.camX && B.nest.x < B.camX + W + 60) fx('meteor', { x: B.nest.x - 20, y: GY, dur: 0.55, delay: 0.5, target: B.nest, dmg: h.atk * 4.5 });
    for (const tw of B.towers) if (!tw.dead && tw.x > B.camX && tw.x < B.camX + W + 40) fx('meteor', { x: tw.x, y: GY, dur: 0.55, delay: 0.45, target: tw, dmg: h.atk * 4.5 });
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
  u.anim += dt; if (u.hit > 0) u.hit -= dt; if (u.atkAnim > 0) u.atkAnim -= dt;
  if (u.kb) { u.x += u.kb * dt * 6; u.kb *= Math.pow(0.02, dt); if (Math.abs(u.kb) < 1) u.kb = 0; }
  const dir = u.side === 'a' ? 1 : -1, buff = u.side === 'a' && B.buff > 0, aura = u.side === 'a' && !B.hero.dead && Math.abs(u.x - B.hero.x) < 170;
  if (u.side === 'a') { u.emT = (u.emT == null ? rnd(2, 7) : u.emT) - dt; if (u.em) { u.em.t -= dt; if (u.em.t <= 0) u.em = null; } if (u.emT <= 0) { const tr = TRAITS[u.kind]; u.emT = rnd(6, 12); if (tr) u.em = { k: pick(tr.e), t: 1.6 }; } }
  if (u.inv > 0) u.inv -= dt;
  if (u.stun > 0) { u.stun -= dt; u.moving = false; return; }
  if (u.third && u.side === 'a') { u.tcd -= dt; if (u.tcd <= 0) { u.tcd = 10; thirdSkill(u); } }
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
  else { u.moving = true; u.x += dir * u.spd * (buff ? 1.3 : 1) * dt; }
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
}
function updDrops(dt) {
  for (const d of B.drops) {
    d.t += dt;
    if (!d.ground) { d.vy += 900 * dt; d.x += d.vx * dt; d.y += d.vy * dt; if (d.y >= d.gy) { if (d.vy > 150) { d.y = d.gy; d.vy *= -0.35; d.vx *= 0.6; } else { d.y = d.gy; d.ground = true; d.vx = 0; d.vy = 0; } } }
    if (d.type === 'coin' && d.t > 0.75 && !d.got) { d.got = true; B.fly.push({ x: d.x - B.camX, y: d.y - 8, sx: d.x - B.camX, sy: d.y - 8, t: 0, val: d.val }); }
    d.life -= dt;
  }
  B.drops = B.drops.filter(d => !d.got && d.life > 0);
  for (const f of B.fly) { f.t += dt / 0.55; if (f.t >= 1 && !f.done) { f.done = true; B.coins += Math.round(f.val * ((petDef() || {}).coin || 1)); B.coinPulse = 0.25; SFX.coin(); } }
  B.fly = B.fly.filter(f => !f.done);
}
function updFx(dt) {
  if (B.punch > 0) B.punch = Math.max(0, B.punch - dt * 1.2); if (B.dark > 0) B.dark -= dt; if (B.skillCut) { B.skillCut.t -= dt; if (B.skillCut.t <= 0) B.skillCut = null; }
  for (const a of B.allies) if (a.hop > 0) a.hop -= dt;
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
  for (const tw of B.towers) { if (tw.hit > 0) tw.hit -= dt; if (!tw.dead && tw.hp <= 0) { tw.dead = true; B.shake = 0.5; burst(tw.x, GY - 60, '#e1a8ff', 40, 260, true); poof(tw.x, GY - 30, '#7e57c2', 14); fx('boom', { x: tw.x, y: GY + 4, dur: 0.6, r: 90 }); const left = B.towers.filter(t => !t.dead).length; B.msg = { t: 2.4, s: left ? `그림자 토템 파괴! (남은 토템 ${left})` : '모든 토템 파괴! 둥지 방어막이 사라졌다!' }; B.coins += Math.round(30 + B.n * 4); SFX.slam(); } }
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
  ctx.fillStyle = '#0a0604'; ctx.fillRect(0, 0, W, h); ctx.fillRect(0, H - h, W, h);
  if (I.t > 0.5 && I.t < 1.7) { ctx.save(); ctx.globalAlpha = Math.min(1, (I.t - 0.5) * 4, (1.7 - I.t) * 4); bigText(ENEMIES[I.k].name, W / 2, H - 24, 24, '#ffcdd2', '#c62828'); ctx.restore(); }
  ctx.save(); ctx.globalAlpha = 0.6 * a; txt('▶▶ 화면을 누르면 건너뛰기', W - 120, h / 2, 11, '#fff3c4', 'center', false); ctx.restore();
}
function updBattle(dt) {
  if (B.paused) return;
  updFx(dt);
  if (B.over) { updDrops(dt); return; }
  updPet(dt);
  // v1.4 동료 없이 기사 혼자 둥지에 붙어 있으면 둥지가 조금씩 회복 (동료와 함께 싸우도록)
  if (!B.hero.dead && B.hero.x > B.nest.x - 320 && !B.allies.some(a => !a.dead && a.x > B.nest.x - 320) && B.nest.hp > 0) B.nest.hp = Math.min(B.nest.max, B.nest.hp + B.nest.max * 0.003 * dt);
  B.t += dt; const hs = B.hs;
  if (B.tut > 0) B.tut -= dt;
  B.food = Math.min(hs.fdMax, B.food + hs.fdR * dt); B.mana = Math.min(hs.mpMax, B.mana + hs.mpR * dt);
  for (let i = 0; i < B.ucd.length; i++) if (B.ucd[i] > 0) B.ucd[i] -= dt;
  if (B.queue != null && spawnAlly(B.queue)) { B.cardPop = { i: B.queue, t: 0.25 }; B.queue = null; }
  for (let i = 0; i < B.scd.length; i++) if (B.scd[i] > 0) B.scd[i] -= dt;
  if (B.buff > 0) B.buff -= dt;
  updHero(dt);
  const si = B.si, ratio = B.nest.hp / B.nest.max;
  B.spawnT -= dt;
  if (B.spawnT <= 0 && B.enemies.length >= 22) B.spawnT = 0.5;
  if (B.spawnT <= 0) {
    B.spawnT = si.interval * rnd(0.6, 1.3) * (ratio < 0.5 ? 0.75 : 1) / si.swarm;
    if (si.raid && Math.random() < 0.25) { const strong = ['wolf', 'golem', 'sknight'].filter(k => B.n > 10 || k === 'wolf'); spawnEnemy(pick(strong)); }
    spawnEnemy(si.pool[Math.floor(Math.pow(Math.random(), 1.3) * si.pool.length)]);
    if (Math.random() < Math.min(0.45, 0.15 + B.n * 0.015)) spawnEnemy(pick(si.pool), 20);
  }
  if (si.mid && !B.midDone && ratio < 0.6) { B.midDone = true; spawnEnemy(si.midKey, 0, true); B.cut = { k: si.midKey, t: 2.2, T: 2.2, elite: true }; SFX.growl(); B.shake = 0.4; }
  if (si.boss && !B.bossDone && ratio < 0.6) {
    B.bossDone = true; spawnEnemy(si.bossKey);
    const bb = B.enemies.find(e => e.def.boss); B.intro = { t: 0, T: 2.4, k: si.bossKey, b: bb, cam0: B.camX, roar: false, wing: false }; musicFor();
  }
  if (!B.rush && ratio < 0.3) { B.rush = true; for (let i = 0; i < 4 + Math.floor(B.n / 3); i++) spawnEnemy(pick(si.pool), i * 18); B.msg = { t: 2.4, s: '둥지가 화났어요! 몬스터 러시!' }; }
  if (B.slow > 0) B.slow -= dt;
  for (const a of B.allies) updUnit(a, B.slow > 0 ? dt * 0.5 : dt);
  if (B.gears && B.gears.length) { for (const gq of B.gears) { gq.x += gq.v * dt; gq.rot = (gq.rot || 0) + dt * 9; for (const t of foesIn(gq.x - gq.r, gq.x + gq.r)) if (!gq.hit.has(t)) { gq.hit.add(t); dealDmg(t, gq.A, 'e'); if (!t.isHero && !t.dead) t.stun = Math.max(t.stun || 0, 0.3); } if (Math.random() < 0.4) B.parts.push({ x: gq.x, y: GY + 4, vx: rnd(20, 80), vy: rnd(-80, -20), life: 0.4, max: 0.4, col: '#ffd34d', size: 3, g: 300 }); } B.gears = B.gears.filter(gq => gq.x > B.base.x && gq.x0 - gq.x < 460); }
  for (const e of B.enemies) { if (e.def.boss && bossSkill(e, dt)) continue; updUnit(e, dt); }
  if (B.later.length) { for (const L of B.later) { L.t -= dt; if (L.t <= 0 && !L.done) { L.done = true; L.fn(); } } B.later = B.later.filter(L => !L.done); }
  if (B.silence > 0) B.silence -= dt; if (B.bossSk) { B.bossSk.t -= dt; if (B.bossSk.t <= 0) B.bossSk = null; }
  for (const w of B.warns) { w.t -= dt; if (w.t <= 0 && !w.done) { w.done = true; if (w.fn && !(w.src && w.src.dead)) w.fn(); } }
  B.warns = B.warns.filter(w => !w.done);
  if (B.reflectQ && B.reflectQ.length) { const q = B.reflectQ; B.reflectQ = []; for (const [o, d] of q) { dealDmg(o, d, 'e'); fx('spark', { x: o.x, y: GY - 40, dur: 0.3, col: '#9feaff', r: 22 }); } }
  updProj(dt); updDrops(dt);
  B.allies = B.allies.filter(u => !u.dead); B.enemies = B.enemies.filter(u => !u.dead);
  if (!B.hero.dead) { B.look = (B.look || 0) + ((B.hero.moving ? B.hero.face * 70 : 0) - (B.look || 0)) * Math.min(1, dt * 2.5); const tx = clamp(B.hero.x - W * 0.42 + B.look, 0, B.world - W); B.camX += (tx - B.camX) * Math.min(1, dt * 4.5); }
  else B.camX += (0 - B.camX) * Math.min(1, dt * 2);
  if (B.nest.hp <= 0) endBattle(true); else if (B.base.hp <= 0) endBattle(false);
}
/* ---------------- v0.8 보스 고유 기술 ---------------- */
const BOSS_SK = {
  kkuruk: { n: '꾸룩 분열', cd: 9 }, troll: { n: '대지 내려찍기', cd: 8 }, scorp: { n: '맹독 꼬리침', cd: 7 }, frost: { n: '얼음 감옥', cd: 9 },
  nox: { n: '그림자 돌진', cd: 8 }, kraken: { n: '촉수 끌어당기기', cd: 8 }, owl: { n: '폭풍 번개', cd: 8 }, cgolem: { n: '프리즘 반사막', cd: 12 },
  sbori: { n: '거울 멍멍 강타', cd: 7 }, void: { n: '침묵의 장막', cd: 12 }, whale: { n: '은하 물기둥', cd: 9 }, fenrir: { n: '별 삼키기', cd: 12 },
  mole: { n: '드릴 잠행', cd: 9 }, bonedra: { n: '뼈의 숨결', cd: 9 },
  cogowl: { n: '톱니 굴리기', cd: 9.5 }, tcat: { n: '시간 먹기', cd: 12 },
  jelly: { n: '졸음 거품', cd: 10 }, dmir: { n: '악몽 불꽃', cd: 10.5 },
  rainturtle: { n: '일곱 빛 줄다리', cd: 10 }, shadowchild: { n: '숨바꼭질', cd: 9 },
  mtgiant: { n: '쉿! 눈사태', cd: 10.5 }, echofairy: { n: '따라쟁이 메아리', cd: 9.5 },
  catgen: { n: '냥냥 연속 펀치', cd: 9 }, roc: { n: '깃털 폭풍', cd: 10 }, badger: { n: '땅울림 북', cd: 10 }, seaspirit: { n: '이름 삼키는 파도', cd: 11 },
  spiderq: { n: '별실 그물', cd: 10 }, shadowk: { n: '거울 기술', cd: 9 },
};
function foesIn(x0, x1) { const a = B.allies.filter(u => !u.dead && u.x >= x0 && u.x <= x1); if (!B.hero.dead && B.hero.x >= x0 && B.hero.x <= x1) a.push(B.hero); return a; }
function zoneHit(x0, x1, dmg, o) { o = o || {}; for (const t of foesIn(x0, x1)) { dealDmg(t, dmg, 'e'); if (t.dead) continue; if (o.stun) t.stun = Math.max(t.stun || 0, o.stun); if (o.root) t.root = Math.max(t.root || 0, o.root); if (o.kb && !t.isHero) t.kb = o.kb; if (o.kb && t.isHero) t.x = clamp(t.x + o.kb * 0.8, B.base.x + 20, B.nest.x - 50); } }
function warnZone(src, x0, x1, T, col, fn) { B.warns.push({ src, x0: Math.max(B.base.x + 30, x0), x1: Math.min(B.nest.x, x1), t: T, T, col, fn }); }
function frontX() { let f = B.hero.dead ? B.base.x + 80 : B.hero.x; for (const a of B.allies) if (!a.dead) f = Math.max(f, a.x); return f; }
function spawnAt(k, x) { const n0 = B.enemies.length; spawnEnemy(k); const n = B.enemies[B.enemies.length - 1]; if (B.enemies.length > n0 && n) { n.x = x; n.y = rnd(0, 24); } }
function bossSkill(e, dt) {
  if (e.reflect > 0) e.reflect -= dt;
  if (e.hide > 0) {
    e.hide -= dt; e.x += (e.hideTo - e.x) * Math.min(1, dt * 2.2); e.moving = true; e.anim += dt;
    if (Math.random() < 0.5) B.parts.push({ x: e.x + rnd(-20, 20), y: GY + 4, vx: rnd(-40, 40), vy: rnd(-160, -60), life: 0.5, max: 0.5, col: '#8a5a35', size: rnd(3, 6), g: 600 });
    return true;
  }
  const sk = BOSS_SK[e.kind]; if (!sk || e.stun > 0 || window.NOBSK) return false;
  if (e.skT == null) e.skT = 3.2;
  e.skT -= dt; if (e.skT > 0) return false;
  const enr = e.hp / e.max < 0.4; e.skT = sk.cd * rnd(0.9, 1.15) * (enr ? 0.72 : 1);
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
  if (B.slow > 0) { ctx.save(); ctx.globalAlpha = 0.15 + Math.sin(G.time * 4) * 0.05; ctx.fillStyle = '#7a5ad0'; ctx.fillRect(B.camX, 0, W, H); ctx.restore(); }
  for (const w of B.warns) {
    const p = 1 - w.t / w.T, mid = (w.x0 + w.x1) / 2, rx = Math.max(10, (w.x1 - w.x0) / 2);
    ctx.save(); ctx.fillStyle = ART.rgba(w.col, 0.18 + 0.12 * Math.sin(G.time * 18)); ctx.beginPath(); ctx.ellipse(mid, GY + 10, rx, 18, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,70,50,.9)'; ctx.lineWidth = 3; ctx.setLineDash([10, 6]); ctx.lineDashOffset = -G.time * 30; ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = ART.rgba(w.col, 0.5); ctx.beginPath(); ctx.ellipse(mid, GY + 10, rx * p, 18 * p, 0, 0, TAU); ctx.fill();
    if (Math.floor(G.time * 8) % 2) txt('!', mid, GY - 22, 28, '#ff5252', 'center');
    ctx.restore();
  }
  for (const e of B.enemies) {
    if (e.hide > 0) { ctx.fillStyle = '#6b4426'; ART.E(ctx, e.x, GY + 8, 40, 12); ctx.fill(); ctx.fillStyle = '#8a5a35'; ART.E(ctx, e.x, GY + 2, 30, 10); ctx.fill(); }
    if (e.reflect > 0) { ctx.save(); ctx.globalAlpha = 0.35 + Math.sin(G.time * 6) * 0.15; ctx.strokeStyle = '#bff4ff'; ctx.lineWidth = 3; ctx.beginPath(); for (let k = 0; k <= 6; k++) { const a = k / 6 * TAU + G.time, r = 120; ctx.lineTo(e.x + Math.cos(a) * r * 0.8, GY - 90 + Math.sin(a) * r); } ctx.stroke(); ctx.fillStyle = 'rgba(160,240,255,.12)'; ctx.fill(); ctx.restore(); }
  }
}
function endBattle(win) {
  if (B.over) return;
  for (const d of B.drops) { if (d.type === 'coin') B.coins += d.val; else if (d.type === 'box' && win) B.loot.push(makeItem(B.n, d.minR || 0)); }
  for (const f of B.fly) B.coins += f.val;
  B.drops = []; B.fly = [];
  const r = B.base.hp / B.base.max; let stars = 0, bonus = 0, unlockMsg = null;
  if (win) {
    stars = r > 0.7 ? 3 : r > 0.35 ? 2 : 1; bonus = B.special ? 0 : 40 + B.n * 20; dailyAdd('c', 1);
    const g0 = dragonStage();
    if (!B.special && B.n > S.cleared) { S.cleared = B.n; const nu = UNITS.find(u => u.unlock === B.n + 1); if (nu) { unlockMsg = nu; const ni = UNITS.indexOf(nu); if (!S.deck.includes(ni) && S.deck.length < 5) S.deck.push(ni); } }
    if (!B.special) S.stars[B.n] = Math.max(S.stars[B.n] || 0, stars);
    if (dragonStage() > g0 && mounted()) GROWN = { st: dragonStage(), t: 0 };
    if (!B.special && B.n % CHL === 0 && !S.chRew[B.si.ch]) grantChapterReward(B.si.ch);
    for (const e of B.enemies) poof(e.x, GY - 20, '#b39ddb', 4);
    B.enemies = []; burst(B.nest.x, GY - 70, '#ce93d8', 70, 320, true); poof(B.nest.x, GY - 40, '#7e57c2', 24);
    AUD.stop(); SFX.win();
  } else { AUD.stop(); SFX.lose(); }
  if (B.special) specialEnd(win);
  let sold = 0, aSold = 0; const AS = S.autoSell || 0; for (const it of B.loot) { if (it.r < AS) aSold += sellPrice(it); else if (S.inv.length < 28) S.inv.push(it); else sold += sellPrice(it); } sold += aSold;
  S.coins += B.coins + bonus + sold; S.tut = true;
  B.over = { win, stars, bonus, sold, aSold, t: 0, unlockMsg };
  holds.clear(); refreshHolds(); save();
}

/* ---------------- 그리기 도우미 ---------------- */
const { RR, E } = { RR: (x, y, w, h, r) => ART.RR(ctx, x, y, w, h, r), E: (x, y, rx, ry) => ART.E(ctx, x, y, rx, ry) };
function circ(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
function txt(s, x, y, size, col, align, stroke, weight, maxW) {
  ctx.font = `${weight || 'bold'} ${size}px ${FONT}`; ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle';
  // v0.9: 폰마다 글꼴 폭이 달라 겹치는 문제 → 최대 폭을 넘으면 글자 크기를 자동으로 줄임
  if (maxW) { const w0 = ctx.measureText(s).width; if (w0 > maxW) { size = Math.max(8, size * maxW / w0); ctx.font = `${weight || 'bold'} ${size}px ${FONT}`; } }
  if (stroke !== false) { ctx.lineWidth = Math.max(3, size / 4.2); ctx.strokeStyle = typeof stroke === 'string' ? stroke : 'rgba(45,22,8,.92)'; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); }
  ctx.fillStyle = col || '#fff'; ctx.fillText(s, x, y);
}
function bigText(s, x, y, size, c1, c2, outline) {
  ctx.font = `900 ${size}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.fillStyle = 'rgba(40,15,0,.4)'; ctx.fillText(s, x + 2, y + 5);
  ctx.lineWidth = size / 3.6; ctx.strokeStyle = outline || '#4a2511'; ctx.strokeText(s, x, y);
  const g = ctx.createLinearGradient(0, y - size / 2, 0, y + size / 2); g.addColorStop(0, c1); g.addColorStop(1, c2); ctx.fillStyle = g; ctx.fillText(s, x, y);
}
function btn(x, y, w, h, label, tap, o) {
  o = o || {}; const key = o.key || (label + '@' + Math.round(x) + ',' + Math.round(y));
  const b = { x, y, w, h, tap, hold: o.hold, disabled: o.disabled, key }; ui.push(b);
  const pressed = (o.hold && inp[o.hold]) || pressT[key] > 0;
  ctx.save(); if (o.disabled) ctx.globalAlpha = 0.5;
  ART.button(ctx, x, y, w, h, o.bg || '#ffb84d', pressed, o.r);
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
      ctx.globalAlpha = 1 - p; ctx.globalCompositeOperation = 'lighter';
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
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - p; const r = f.r * (0.4 + p * 0.8);
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
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - p; ctx.translate(f.x, f.y); ctx.rotate(p * 1.5);
      const r = f.r * (0.5 + p * 0.8); ctx.fillStyle = f.col;
      ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, q = i % 2 ? r * 0.22 : r; ctx.lineTo(Math.cos(a) * q, Math.sin(a) * q); } ctx.closePath(); ctx.fill();
      ctx.drawImage(ART.softDot('#ffffff'), -r * 0.6, -r * 0.6, r * 1.2, r * 1.2);
      ctx.restore();
    } else if (f.type === 'pillar') {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.sin(p * Math.PI) * 0.85;
      const col = f.col || '#ffe082', w = 46 * (1 - p * 0.4), g = ctx.createLinearGradient(f.x - w, 0, f.x + w, 0);
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
  ctx.drawImage(ART.softDot(d.type === 'box' ? '#ffd740' : d.type === 'star' ? '#64b5f6' : '#ffffff'), d.x - 20, y - 22, 40, 40); ctx.restore();
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
function frameKey(u, spd) {
  if (u.atkAnim > 0) { const p = 1 - u.atkAnim / 0.3; return 'a' + Math.min(7, Math.max(0, Math.floor(p * 8))); }
  if (u.moving) return 'w' + (Math.floor(u.anim * (spd || u.spd) / 34 * 10) % 10);
  const tt = (u.anim + (u.x % 3)) % 3.4; if (tt < 0.13) return 'ib';
  return 'i' + (Math.floor(u.anim * 4.8) % 6);
}
// v1.0 전투 연출: 공격 때 앞으로 쭉 내딛기, 맞을 때 찌그러짐·뒤로 밀림 (그림만 움직임 · 판정 위치는 그대로)
function motionOf(u, dir) {
  let lx = 0, sx = 1, sy = 1;
  if (u.atkAnim > 0) { const T = u.isHero ? 0.3 : 0.3, p = 1 - u.atkAnim / T, k = p < 0.45 ? -Math.sin(p / 0.45 * Math.PI * 0.5) * 0.35 : Math.sin((p - 0.45) / 0.55 * Math.PI); lx = dir * k * (u.def && u.def.boss ? 14 : 8); if (p > 0.45 && p < 0.75) { sx = 1.06; sy = 0.95; } }
  if (u.hit > 0) { const h = u.hit / 0.18; lx -= dir * h * 4; sx *= 1 + h * 0.07; sy *= 1 - h * 0.07; }
  return { lx, sx, sy };
}
function drawEntity(u) {
  if (u.x < B.camX - 110 || u.x > B.camX + W + 110) return;
  const y = GY + u.y;
  if (!(u.def && u.def.fly)) { ctx.fillStyle = 'rgba(30,15,0,.22)'; ART.E(ctx, u.x, y + 2, u.def && u.def.boss ? 64 : u.isHero ? 22 : 17, u.def && u.def.boss ? 11 : 5); ctx.fill(); }
  else { ctx.fillStyle = 'rgba(30,15,0,.14)'; ART.E(ctx, u.x, y + 2, 14, 4); ctx.fill(); }
  const flash = u.hit > 0 ? u.hit / 0.18 * 0.85 : 0;
  let top;
  if (u.isHero) {
    if (B.buff > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 + Math.sin(G.time * 8) * 0.2; ctx.drawImage(ART.softDot('#80d8ff'), u.x - 40, y - 70, 80, 80); ctx.restore(); }
    ctx.save(); ctx.globalAlpha = 0.5; ctx.strokeStyle = 'rgba(255,213,79,.7)'; ctx.lineWidth = 2; ctx.setLineDash([7, 7]); ctx.lineDashOffset = -G.time * 20; ctx.beginPath(); ctx.ellipse(u.x, y + 3, 170, 13, 0, 0, TAU); ctx.stroke(); ctx.restore();
    const wr = S.eq.weapon ? S.eq.weapon.r : -1;
    if (wr >= 3) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (let k = 0; k < 3; k++) { const a = G.time * 2 + k * 2.1, px = u.x + u.face * 18 + Math.cos(a) * 10, py = y - 44 + Math.sin(a * 1.3) * 16; ctx.globalAlpha = 0.6; ctx.drawImage(ART.softDot(wr === 4 ? '#ff7ae6' : '#ffd54f'), px - 6, py - 6, 12, 12); } ctx.restore(); }
    { const m = motionOf(u, u.face); ctx.save(); ctx.translate(u.x + m.lx, y); ctx.scale(m.sx, m.sy); ART.draw(ctx, heroType(), frameKey(u, 120), 0, 0, heroScale(), u.face < 0, flash); ctx.restore(); }
    top = y - 84;
  } else if (u.side === 'a') {
    const d = u.def, tr = TRAITS[d.id] || {}, idle = !u.moving && u.atkAnim <= 0;
    let hp2 = u.hop > 0 ? -Math.sin(u.hop / 0.5 * Math.PI) * 14 : 0, jx = 0, sx2 = 1, sy2 = 1;
    if (tr.fx === 'bounce' && u.moving) hp2 -= Math.abs(Math.sin(G.time * 9 + u.x)) * 5;
    if (tr.fx === 'wiggle') { const w = Math.sin(G.time * 14 + u.x); sx2 = 1 + w * 0.03; sy2 = 1 - w * 0.03; }
    if (tr.fx === 'shiver' && idle) jx = Math.sin(G.time * 60 + u.x) * 0.8;
    if (tr.fx === 'stretch' && u.moving) { sx2 = 1.06; sy2 = 0.95; }
    if (tr.fx === 'snore' && idle) { sy2 = 1 + Math.sin(G.time * 2) * 0.03; }
    if (tr.fx === 'howl' && u.em && u.em.k === 'howl') { hp2 -= 3; }
    const m = motionOf(u, 1); ctx.save(); ctx.translate(u.x + jx + m.lx, y + hp2); ctx.scale(sx2 * m.sx, sy2 * m.sy); if (u.promo) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35 + Math.sin(G.time * 4 + u.anim) * 0.15; ctx.drawImage(ART.softDot('#ffe082'), -34, -70, 68, 80); ctx.restore(); } ART.draw(ctx, u.kind, frameKey(u), 0, 0, d.s, false, flash); ctx.restore();
    if (u.em) drawEmote(u.em, u.x + 6, y - 70 * d.s - 14);
    top = y - 70 * d.s;
    if (B.buff > 0) { ctx.fillStyle = '#80d8ff'; ART.star(ctx, u.x, top - 2 + Math.sin(G.time * 6 + u.x) * 2, 4.5, '#b3ecff'); }
  } else {
    if (u.elite) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.55 + Math.sin(G.time * 5) * 0.2; ctx.drawImage(ART.softDot('#ffb300'), u.x - 60, y - u.def.h * 1.5 - 20, 120, u.def.h * 1.5 + 40); ctx.restore(); }
    if (u.root > 0) { ctx.save(); ctx.strokeStyle = 'rgba(255,240,190,.85)'; ctx.lineWidth = 1.2; const cy2 = y - 20; for (let k = 0; k < 6; k++) { const an = k / 6 * TAU; ctx.beginPath(); ctx.moveTo(u.x, cy2); ctx.lineTo(u.x + Math.cos(an) * 22, cy2 + Math.sin(an) * 22); ctx.stroke(); } ctx.beginPath(); ctx.arc(u.x, cy2, 11, 0, TAU); ctx.arc(u.x, cy2, 19, 0, TAU); ctx.stroke(); ctx.restore(); }
    if (u.stun > 0) { for (let k = 0; k < 3; k++) { const a = G.time * 6 + k * 2.1; ART.star(ctx, u.x + Math.cos(a) * 14, y - u.def.h * (u.sc || 1) - 4 + Math.sin(a) * 4, 4, '#ffe082'); } }
    { const m = motionOf(u, -1); ctx.save(); ctx.translate(u.x + m.lx, y); ctx.scale(m.sx, m.sy); ART.draw(ctx, u.kind, frameKey(u), 0, 0, u.def.s * (u.sc || 1), true, flash); ctx.restore(); }
    top = y - u.def.h * (u.sc || 1);
    if (u.elite) { ART.icon(ctx, 'star', u.x, top - 18, 16); txt('정예', u.x, top - 30, 12, '#ffd54f', 'center'); }
  }
  if (u.hp < u.max && !u.isHero) { const bw = u.def && u.def.boss ? 96 : u.elite ? 64 : 34; bar(u.x - bw / 2, top - 6, bw, 7, u.hp / u.max, u.side === 'a' ? '#66bb6a' : '#ff5252'); }
  if (u.isHero) {
    ctx.save(); ctx.translate(u.x, top - 6); RR(-22, -9, 44, 18, 9); ctx.fillStyle = 'rgba(40,20,5,.75)'; ctx.fill(); ctx.strokeStyle = '#ffcf5a'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
    txt(`Lv.${S.lv}`, u.x, top - 5.5, 12, '#ffe082', 'center', false);
    if (B.bubble) drawBubble(u.x + 10, top - 22, B.bubble.s, Math.min(1, B.bubble.t * 3));
  }
}
function drawEmote(em, x, y) {
  const a = Math.min(1, em.t * 3, (1.6 - em.t) * 6), bob = Math.sin((1.6 - em.t) * 8) * 2;
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y + bob);
  const k = em.k;
  if (k === 'heart') { ctx.fillStyle = '#ff5a8a'; ctx.beginPath(); ctx.moveTo(0, 6); ctx.bezierCurveTo(-9, -1, -4, -9, 0, -4); ctx.bezierCurveTo(4, -9, 9, -1, 0, 6); ctx.fill(); ctx.strokeStyle = '#7a1a3a'; ctx.lineWidth = 1.2; ctx.stroke(); }
  else if (k === 'zz') { txt('z', -4, 2, 12, '#cfe8ff', 'center', '#2a3a6a'); txt('Z', 5, -8, 16, '#cfe8ff', 'center', '#2a3a6a'); }
  else if (k === 'note') { txt('♪', 0, 0, 20, '#ffe082', 'center', '#7a4a00'); }
  else if (k === 'star' || k === 'sparkle') { ART.star(ctx, 0, 0, 8, '#ffe27a'); ART.star(ctx, 9, -8, 4, '#ffffff'); }
  else if (k === '!' || k === '?') { txt(k, 0, 0, 22, k === '!' ? '#ff7043' : '#64b5f6', 'center', '#3a1a00'); }
  else if (k === 'sweat') { ctx.fillStyle = '#7fd0ff'; ctx.beginPath(); ctx.moveTo(0, -8); ctx.quadraticCurveTo(7, 2, 0, 6); ctx.quadraticCurveTo(-7, 2, 0, -8); ctx.fill(); ctx.strokeStyle = '#2a6a9a'; ctx.lineWidth = 1; ctx.stroke(); }
  else if (k === 'drool') { ctx.fillStyle = 'rgba(200,235,255,.9)'; ctx.beginPath(); ctx.moveTo(12, 30); ctx.quadraticCurveTo(15, 38, 12, 42); ctx.quadraticCurveTo(9, 38, 12, 30); ctx.fill(); }
  else if (k === 'dots') { txt('……', 0, 0, 14, '#ffffff', 'center', '#333'); }
  else { const w = { huff: '흥!', sniff: '킁킁', howl: '아우~' }[k] || k; txt(w, 0, 0, 13, '#fff8e1', 'center', '#4a2a14'); }
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
function drawCastle() {
  const b = B.base, C = ART.castle(), sh = b.hit > 0 ? rnd(-2, 2) : 0, r = b.hp / b.max;
  ctx.drawImage(C.c, b.x - C.ox + sh, GY + 12 - C.oy, C.w, C.h);
  const fx0 = b.x - 106 + sh, fy0 = GY + 12 - 258, wv = G.time * 6;
  ctx.fillStyle = '#5b3a22'; ctx.fillRect(fx0 - 1.5, fy0 - 34, 3, 36);
  ctx.beginPath(); ctx.moveTo(fx0, fy0 - 34); for (let i = 0; i <= 10; i++) ctx.lineTo(fx0 + i * 4, fy0 - 34 + Math.sin(wv + i * 0.6) * 2.5 * (i / 10)); for (let i = 10; i >= 0; i--) ctx.lineTo(fx0 + i * 4, fy0 - 14 + Math.sin(wv + i * 0.6) * 2.5 * (i / 10)); ctx.closePath();
  ctx.fillStyle = '#e53935'; ctx.fill(); ART.paw(ctx, fx0 + 20, fy0 - 24 + Math.sin(wv + 3) * 1.2, 0.75, '#fff');
  if (r < 0.66) { ctx.strokeStyle = 'rgba(40,20,10,.75)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(b.x - 40, GY - 60); ctx.lineTo(b.x - 28, GY - 40); ctx.lineTo(b.x - 36, GY - 22); ctx.stroke(); }
  if (r < 0.33) { ctx.beginPath(); ctx.moveTo(b.x + 30, GY - 130); ctx.lineTo(b.x + 20, GY - 105); ctx.lineTo(b.x + 34, GY - 90); ctx.stroke(); if (Math.random() < 0.15) B.parts.push({ x: b.x + rnd(-40, 40), y: GY - 150, vx: rnd(-10, 10), vy: -30, life: 1.2, max: 1.2, col: '#6d6d6d', size: 14, g: -10, soft: true }); }
}
function drawTotem(tw) {
  if (tw.x < B.camX - 100 || tw.x > B.camX + W + 100) return;
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
function drawBattle() {
  const sx = B.shake > 0 ? rnd(-7, 7) * Math.min(1, B.shake * 2) : 0, sy = B.shake > 0 ? rnd(-4, 4) * Math.min(1, B.shake * 2) : 0;
  ctx.save(); ctx.translate(sx, sy);
  if (B.punch > 0) { const z = 1 + B.punch * 0.12, fxp = clamp(B.hero.x - B.camX, 0, W); ctx.translate(fxp, GY - 40); ctx.scale(z, z); ctx.translate(-fxp, -(GY - 40)); }
  ART.drawBg(ctx, B.si.ti, B.camX, G.time, GY, W, H);
  drawScenery();
  if (B.dark > 0) { ctx.fillStyle = `rgba(30,10,0,${Math.min(0.5, B.dark * 0.5)})`; ctx.fillRect(0, 0, W, H); }
  drawRays(B.si.th.kind);
  if (B.si.dusk) { const g2 = ctx.createLinearGradient(0, 0, 0, GY); g2.addColorStop(0, 'rgba(255,110,60,.28)'); g2.addColorStop(1, 'rgba(255,170,90,.12)'); ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H); }
  if (B.si.night) { ctx.fillStyle = 'rgba(14,16,60,.42)'; ctx.fillRect(0, 0, W, H); for (let k = 0; k < 40; k++) { ctx.globalAlpha = 0.4 + Math.sin(G.time * 2 + k) * 0.35; ctx.fillStyle = '#fff'; circ((k * 197) % W, (k * 61) % 220, k % 6 ? 1.1 : 1.8); } ctx.globalAlpha = 1; }
  drawAmb(true);
  ctx.save(); ctx.translate(-B.camX, 0);
  drawCastle(); drawNest(); for (const tw of B.towers) drawTotem(tw);
  for (const d of B.drops) drawDrop(d);
  for (const r of B.rings) { ctx.strokeStyle = r.col; ctx.globalAlpha = Math.max(0, r.life / 0.45); ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(r.x, r.y, r.r, r.r * 0.3, 0, 0, TAU); ctx.stroke(); }
  ctx.globalAlpha = 1;
  drawWarns();
  if (B.ghosts && B.ghosts.length) { for (const gq of B.ghosts) { gq.t += G.dt || 0.016; const p = gq.t / 0.55; ctx.save(); ctx.globalAlpha = Math.max(0, 1 - p); ctx.translate(gq.x + gq.vx * gq.t, gq.y - 160 * gq.t + 320 * gq.t * gq.t); ctx.rotate(gq.rot * gq.t * 3); ctx.scale(1 - p * 0.3, 1 - p * 0.3); ART.draw(ctx, gq.k, 'ib', 0, 0, gq.s, true, 0.6); ctx.restore(); } B.ghosts = B.ghosts.filter(gq => gq.t < 0.55); }
  const list = B.allies.concat(B.enemies.filter(e => !(e.hide > 0))); if (!B.hero.dead) list.push(B.hero);
  list.sort((a, b) => a.y - b.y);
  drawPet();
  for (const u of list) drawEntity(u);
  for (const p of B.proj) {
    if (p.kind === 'bomb') { ctx.save(); ctx.globalAlpha = 0.35; p.trail.forEach((q, i) => { ctx.fillStyle = '#ffd9a0'; circ(q[0], q[1], 2 + i * 0.6); }); ctx.restore(); ART.bone(ctx, p.x, p.y, 20, '#fff3d6', p.a); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(ART.softDot('#ff9a3d'), p.x - 12, p.y - 12, 24, 24); ctx.restore(); }
    else if (p.kind === 'heart') { ctx.save(); ctx.translate(p.x, p.y); const sc = 1 + Math.sin(G.time * 16) * 0.12; ctx.scale(sc, sc); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(ART.softDot('#ff7ab6'), -14, -14, 28, 28); ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#ff4f8f'; ctx.beginPath(); ctx.moveTo(0, 6); ctx.bezierCurveTo(-9, -1, -4, -9, 0, -4); ctx.bezierCurveTo(4, -9, 9, -1, 0, 6); ctx.fill(); ctx.restore(); }
    else if (p.kind === 'arrow') { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = '#6d4c41'; ctx.fillRect(-12, -1.2, 20, 2.4); ctx.fillStyle = '#e0e6ea'; ctx.beginPath(); ctx.moveTo(8, -3.5); ctx.lineTo(15, 0); ctx.lineTo(8, 3.5); ctx.fill(); ctx.fillStyle = '#e53935'; ctx.beginPath(); ctx.moveTo(-12, -4); ctx.lineTo(-7, 0); ctx.lineTo(-12, 4); ctx.fill(); ctx.restore(); }
    else {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const col = p.kind === 'orb' ? '#b388ff' : '#9ccc65';
      p.trail.forEach((q, i) => { const s = 6 + i * 2; ctx.globalAlpha = i / p.trail.length * 0.5; ctx.drawImage(ART.softDot(col), q[0] - s, q[1] - s, s * 2, s * 2); });
      ctx.globalAlpha = 1; ctx.drawImage(ART.softDot(col), p.x - 16, p.y - 16, 32, 32); ctx.drawImage(ART.softDot('#ffffff'), p.x - 6, p.y - 6, 12, 12);
      ctx.restore();
    }
  }
  drawFx();
  for (const p of B.parts) {
    const a = Math.max(0, Math.min(1, p.life / p.max * 1.5));
    if (p.bone) { ctx.globalAlpha = a; ART.bone(ctx, p.x, p.y, 18, '#fffaf0', p.rot); }
    else if (p.note) { ctx.globalAlpha = a; txt('♪', p.x, p.y, 18, '#b3ecff', 'center', '#0d47a1'); }
    else if (p.soft) { ctx.globalAlpha = a * 0.7; const s = p.size * (1.6 - p.life / p.max * 0.6); ctx.drawImage(ART.softDot(p.col), p.x - s, p.y - s, s * 2, s * 2); }
    else if (p.glow) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a; ctx.drawImage(ART.softDot(p.col), p.x - p.size, p.y - p.size, p.size * 2, p.size * 2); ctx.restore(); }
    else { ctx.globalAlpha = a; ctx.fillStyle = p.col; circ(p.x, p.y, p.size * 0.5); }
  }
  ctx.globalAlpha = 1;
  for (const t of B.texts) {
    const age = t.max - t.life, pop = age < 0.12 ? 1 + (1 - age / 0.12) * 0.7 : 1;
    ctx.globalAlpha = Math.min(1, t.life / t.max * 2.2); txt(t.s, t.x, t.y, Math.round(t.size * pop), t.col, 'center', t.crit ? '#5a1a00' : true, '900');
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  ART.drawFore(ctx, B.si.ti, B.camX, G.time, GY, W, H);
  drawAmb(false);
  if (B.si.weather) { ctx.save(); ctx.strokeStyle = B.si.weather === 'storm' ? 'rgba(220,230,255,.45)' : 'rgba(190,215,255,.4)'; ctx.lineWidth = 1.2; ctx.beginPath(); const n2 = B.si.weather === 'storm' ? 90 : 60, sl = B.si.weather === 'storm' ? 10 : 4; for (let k = 0; k < n2; k++) { const rx = (k * 131 + G.time * 260 * (1 + (k % 3) * 0.2)) % (W + 40) - 20, ry = (k * 89 + G.time * 620) % (H + 40) - 20; ctx.moveTo(rx, ry); ctx.lineTo(rx - sl, ry + 16); } ctx.stroke(); ctx.restore(); if (B.si.weather === 'storm' && Math.sin(G.time * 0.9) > 0.995) { ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(0, 0, W, H); } }
  ART.vignette(ctx, W, H);
  for (const f of B.fx) if (f.type === 'flash') { ctx.globalAlpha = (1 - f.t / f.dur) * 0.6; ctx.fillStyle = f.col; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  ctx.restore();
  drawHUD();
  if (B.bossSk) { const a = Math.min(1, B.bossSk.t * 2); ctx.save(); ctx.globalAlpha = a; ART.panel(ctx, W / 2 - 150, 120, 300, 40, 'dark'); txt('⚠ ' + B.bossSk.s, W / 2, 140, 20, '#ffab91', 'center'); ctx.restore(); }
  if (B.silence > 0) txt('🔇 침묵 ' + B.silence.toFixed(1) + '초', W - 90, 168, 14, '#d1c4e9', 'center');
  if (B.skillCut) drawSkillCut(B.skillCut);
  if (B.banner > 0) drawBanner();
  if (B.paused && !B.over) drawPause();
  if (B.over) drawResult();
}
const PROPSET = { meadow: ['house', 'flag', 'fence'], forest: ['mushhouse', 'lantern', 'log'], desert: ['tent', 'pillar', 'flag'], snow: ['igloo', 'lantern', 'snowman'], volcano: ['pillar', 'tornflag', 'brazier'],
  coast: ['hut', 'lantern', 'boat'], sky: ['balloon', 'flag', 'house'], crystal: ['lantern', 'pillar', 'cart'], swamp: ['pillar', 'lantern', 'shrine'], castle: ['pillar', 'tornflag', 'brazier'], starsea: ['lantern', 'boat', 'flag'], aurora: ['pillar', 'lantern', 'shrine'], mine: ['beam', 'cart', 'lantern', 'ore'], fossil: ['ribs', 'fern', 'lantern', 'egg'], clock: ['clockpost', 'gears', 'house', 'lantern'], tower: ['hourglass', 'pillar', 'clockpost', 'gears'], candy: ['lollipop', 'lantern', 'flag', 'boat'], upside: ['coral', 'lantern', 'boat', 'pillar'], stargarden: ['starflower', 'lantern', 'starflower', 'pillar'], firstcastle: ['banner', 'pillar', 'lantern', 'banner'], catrep: ['fishflag', 'lantern', 'house', 'fishflag'], feather: ['bigfeather', 'flag', 'bigfeather', 'lantern'], burrow: ['mushlamp', 'mushlamp', 'lantern', 'pillar'], namesea: ['boat', 'lantern', 'coral', 'boat'], rainbow: ['starflower', 'flag', 'lantern', 'starflower'], shadowvil: ['lantern', 'house', 'lantern', 'pillar'], silentmt: ['flag', 'pillar', 'house', 'lantern'], echocave: ['lantern', 'pillar', 'lantern', 'cart'] };
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
function drawScenery() {
  const th = B.si.th, n = B.n, set = PROPSET[th.kind] || ['lantern'];
  const sky = th.sky[2];
  // 원경 랜드마크 (패럴랙스 0.35)
  const lx0 = 500 + (n * 397) % 900, px = lx0 - B.camX * 0.35;
  if (px > -300 && px < W + 300) { ctx.save(); ctx.globalAlpha = 0.9; const c = lmCanvas(th.kind); ctx.drawImage(c, px - 150, GY - 252, 300, 250); ctx.globalAlpha = 0.28; ctx.fillStyle = sky; ctx.fillRect(px - 150, GY - 252, 300, 250); ctx.restore(); }
  // 중경 소품 (패럴랙스 0.7)
  let seed = n * 7919; const R = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const cnt = 6 + Math.floor(R() * 3);
  for (let k = 0; k < cnt; k++) {
    const wx = 260 + k * (B.world * 0.7 / cnt) + R() * 120, x = wx - B.camX * 0.7, kind = set[Math.floor(R() * set.length)], sc = 0.7 + R() * 0.35;
    if (x < -120 || x > W + 120) continue;
    const c = propCanvas(kind, th); ctx.save(); ctx.globalAlpha = 0.95; ctx.drawImage(c, x - 80 * sc, GY - 4 - 150 * sc, 160 * sc, 160 * sc); ctx.globalAlpha = 0.18; ctx.restore();
  }
  // 안개 (원근감)
  const hz = ctx.createLinearGradient(0, GY - 120, 0, GY + 10); hz.addColorStop(0, ART.rgba(sky, 0)); hz.addColorStop(1, ART.rgba(sky, B.si.night ? 0.12 : 0.22)); ctx.fillStyle = hz; ctx.fillRect(0, GY - 120, W, 130);
}
function drawRays(kind) {
  const night = kind === 'swamp' || kind === 'castle' || kind === 'volcano' || kind === 'crystal' || kind === 'mine' || kind === 'fossil' || kind === 'tower' || kind === 'upside' || kind === 'stargarden' || kind === 'burrow' || kind === 'namesea' || kind === 'shadowvil' || kind === 'echocave';
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const col = kind === 'crystal' ? '120,220,255' : kind === 'volcano' || kind === 'mine' ? '255,170,80' : kind === 'fossil' ? '200,255,170' : night ? '190,170,255' : '255,245,200';
  for (let k = 0; k < 5; k++) {
    const x = 520 + k * 120 - (B.camX * 0.05) % 120, a = (0.05 + 0.03 * Math.sin(G.time * 0.6 + k * 1.7)) * (night ? 0.8 : 1);
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
    else if (a.k === 'snow') { ctx.globalAlpha = 0.9; ctx.drawImage(ART.softDot('#ffffff'), a.x - a.r * 2, a.y - a.r * 2, a.r * 4, a.r * 4); ctx.globalAlpha = 1; }
    else if (a.k === 'sand') { ctx.fillStyle = 'rgba(255,236,190,.5)'; ctx.fillRect(a.x, a.y, a.r * 4, 1.4); }
    else if (a.k === 'bubble') { ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(a.x, a.y, a.r * 1.4, 0, TAU); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.8)'; circ(a.x - a.r * 0.5, a.y - a.r * 0.5, a.r * 0.35); }
    else if (a.k === 'feather') { ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(Math.sin(a.ph * 1.6) * 0.9); ctx.fillStyle = 'rgba(255,255,255,.92)'; ART.E(ctx, 0, 0, a.r * 2.6, a.r * 0.9); ctx.fill(); ctx.strokeStyle = 'rgba(180,190,230,.8)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-a.r * 2.6, 0); ctx.lineTo(a.r * 2.6, 0); ctx.stroke(); ctx.restore(); }
    else if (a.k === 'wisp') { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.45 + Math.sin(a.ph * 3) * 0.3; ctx.drawImage(ART.softDot(i % 2 ? '#c56bff' : '#7affd0'), a.x - a.r * 2.5, a.y - a.r * 2.5, a.r * 5, a.r * 5); ctx.restore(); }
    else if (a.k === 'sparkle') { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 + Math.sin(a.ph * 5) * 0.4; const c = ['#7ae8ff', '#c9a0ff', '#8affd6'][i % 3]; ctx.drawImage(ART.softDot(c), a.x - a.r * 3, a.y - a.r * 3, a.r * 6, a.r * 6); ART.star(ctx, a.x, a.y, a.r * 1.1, '#ffffff', 0.3); ctx.restore(); }
    else if (a.k === 'star') { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.55 + Math.sin(a.ph * 4) * 0.35; ART.star(ctx, a.x, a.y, a.r * 1.5, i % 2 ? '#ffe27a' : '#bfe6ff', 0.4); ctx.restore(); }
    else if (a.k === 'cog') { ctx.save(); ctx.globalAlpha = 0.45; ART.gearShape(ctx, a.x, a.y, a.r * 1.4, 8, i % 2 ? '#b8862e' : '#8a6a4a', a.ph * 2); ctx.restore(); }
    else if (a.k === 'sand') { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 + Math.sin(a.ph * 5) * 0.3; ctx.drawImage(ART.softDot(i % 2 ? '#ffe9a0' : '#d9b0ff'), a.x - a.r * 2, a.y - a.r * 2, a.r * 4, a.r * 4); ctx.restore(); }
    else if (a.k === 'dust') { ctx.globalAlpha = 0.45 + Math.sin(a.ph * 3) * 0.2; ctx.fillStyle = i % 2 ? '#d8c09a' : '#a88a64'; circ(a.x, a.y, a.r * 0.7); if (i % 7 === 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(ART.softDot('#ffd27a'), a.x - 6, a.y - 6, 12, 12); ctx.restore(); } ctx.globalAlpha = 1; }
    else if (a.k === 'spore') { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.45 + Math.sin(a.ph * 4) * 0.3; ctx.drawImage(ART.softDot(i % 3 ? '#c8ff9a' : '#ffe9a0'), a.x - a.r * 2.4, a.y - a.r * 2.4, a.r * 4.8, a.r * 4.8); ctx.restore(); }
    else { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.6 + Math.sin(a.ph * 6) * 0.3; ctx.drawImage(ART.softDot('#ff8a3d'), a.x - a.r * 2, a.y - a.r * 2, a.r * 4, a.r * 4); ctx.restore(); }
  }
}
function drawSkillCut(c) {
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
  const gb = ctx.createLinearGradient(0, 140, 0, 290); gb.addColorStop(0, 'rgba(30,12,0,0)'); gb.addColorStop(0.2, 'rgba(30,12,0,.6)'); gb.addColorStop(0.8, 'rgba(30,12,0,.6)'); gb.addColorStop(1, 'rgba(30,12,0,0)'); ctx.fillStyle = gb; ctx.fillRect(0, 140, W, 150);
  ctx.fillStyle = 'rgba(255,207,90,.8)'; ctx.fillRect(x - 220, 160, 440, 2); ctx.fillRect(x - 220, 270, 440, 2);
  txt(`${CH_NAMES[B.si.ch]}  ·  ${B.si.sub}/${CHL}`, x, 176, 14, '#ffd98a', 'center');
  bigText(`STAGE ${B.n}  「${B.si.name}」`, x, 210, 38, '#fff6b0', '#ffb300');
  txt('임무: ' + B.si.mis.n + '  —  ' + B.si.mis.d, x, 252, 15, '#ffffff', 'center');
  ctx.restore();
}
const BOSS_TAG = { mtgiant: '입을 꿰맨 산의 거인', echofairy: '남의 말만 따라 하는 요정', rainturtle: '일곱 빛의 문지기', shadowchild: '처음 무지개를 본 아이', catgen: '야옹 공화국의 장군', roc: '깃털 군도의 바람', badger: '땅속 북소리', seaspirit: '이름을 잃은 바다', spiderq: '별실의 여왕', shadowk: '거울 속의 기사', jelly: '영원한 꿈의 여왕', dmir: '미르의 두려움', cogowl: '시간을 감는 박사', tcat: '시간을 먹는 자', mole: '땅속을 가르는 왕', bonedra: '뼈의 심장을 지키는 자', whale: '별빛을 삼킨 고래', fenrir: '별을 먹는 자', cgolem: '빛을 가두는 왕', sbori: '또 하나의 보리', kkuruk: '들판의 폭군', troll: '숲을 삼킨 거인', scorp: '모래 폭풍의 왕', frost: '얼어붙은 심장', nox: '달을 가린 그림자', kraken: '심해의 여왕', owl: '폭풍 해적 선장', void: '모든 소리를 삼킨 자' };
function drawBossCut(c) {
  const T = (c.T || 2.8) - c.t, inA = Math.min(1, T / 0.35), out = c.t < 0.4 ? c.t / 0.4 : 1, a = inA * out, e = 1 - Math.pow(1 - inA, 3);
  ctx.save(); ctx.globalAlpha = a * 0.55; ctx.fillStyle = '#12000a'; ctx.fillRect(0, 0, W, H); ctx.restore();
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
  const h = B.hero, hs = B.hs;
  // 하단 독
  ART.panel(ctx, -20, H - 140, W + 40, 170, 'wood');
  // 기사 정보
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
  // 진행도
  const mx = 340, mw = 280;
  ART.panel(ctx, mx - 10, 8, mw + 20, 64, 'dark');
  txt(`STAGE ${B.n} · ${B.si.name}`, W / 2, 22, 14, '#fff3c4', 'center');
  const toM = x => mx + 18 + (x / B.world) * (mw - 36), my = 36;
  RR(mx + 14, my, mw - 28, 12, 6); ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.5; RR(toM(B.camX), my - 1, (W / B.world) * (mw - 36), 14, 4); ctx.stroke();
  for (const e of B.enemies) { ctx.fillStyle = e.def.boss ? '#ffeb3b' : '#ff5252'; ctx.fillRect(toM(e.x) - 1.5, my + 3, 3, 6); }
  ctx.fillStyle = '#64b5f6'; for (const a of B.allies) ctx.fillRect(toM(a.x) - 1.5, my + 3, 3, 6);
  if (!h.dead) { ART.icon(ctx, 'star', toM(h.x), my + 6, 13); }
  ART.icon(ctx, 'castle', mx + 10, my + 6, 20); ART.icon(ctx, 'nest', mx + mw - 10, my + 6, 20);
  bar(mx + 2, 54, 134, 12, B.base.hp / B.base.max, '#81c784'); txt('멍멍성', mx + 69, 60, 10, '#fff', 'center');
  bar(mx + 144, 54, 134, 12, B.nest.hp / B.nest.max, '#ba68c8'); txt('몬스터 둥지', mx + 211, 60, 10, '#fff', 'center');
  // 코인 / 버튼
  const cp = B.coinPulse > 0 ? 1 + B.coinPulse * 1.2 : 1;
  ART.panel(ctx, W - 262, 12, 132, 38, 'dark');
  ART.icon(ctx, 'coin', W - 240, 31, 24 * cp); txt('' + B.coins, W - 222, 32, 18, '#ffe082');
  btn(W - 122, 10, 54, 42, B.speed === 1 ? 'x1' : 'x2', () => { B.speed = B.speed === 1 ? 2 : 1; }, { bg: B.speed === 2 ? '#ffc93c' : '#c9b9a6', size: 18 });
  btn(W - 62, 10, 52, 42, 'II', () => { B.paused = true; }, { bg: '#c9b9a6', size: 18 });
  for (const f of B.fly) { const p = ease(f.t), x = f.sx + (W - 240 - f.sx) * p, y = f.sy + (31 - f.sy) * p - Math.sin(p * Math.PI) * 60; ART.icon(ctx, 'coin', x, y, 16); }
  // 이동 버튼
  for (const [m, key, dir] of [[MOVE_L, 'left', -1], [MOVE_R, 'right', 1]]) {
    btn(m.x, m.y, m.w, m.h, '', null, { hold: key, bg: inp[key] ? '#ffd27a' : '#f3e2c4', r: 22 });
    const p = inp[key] ? 4 : 0, cx = m.x + m.w / 2, cy = m.y + m.h / 2 + p;
    ctx.fillStyle = '#7a4520'; ctx.beginPath(); ctx.moveTo(cx + dir * 22, cy); ctx.lineTo(cx - dir * 14, cy - 22); ctx.lineTo(cx - dir * 14, cy + 22); ctx.closePath(); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = '#4a2a14'; ctx.lineJoin = 'round'; ctx.stroke();
  }
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
  const sks = [[744, H - 60], [820, H - 60], [896, H - 60], [820, H - 140]];
  for (let i = 0; i < 4; i++) {
    if (i === 3 && !mounted()) continue;
    const s = SKILLS[i], [x, y] = sks[i], r = i === 3 ? 29 : 33, unl = S.lv >= s.lv, ok = unl && !h.dead && B.mana >= s.mp && B.scd[i] <= 0;
    ui.push({ x: x - r - 2, y: y - r - 8, w: r * 2 + 4, h: r * 2 + 14, tap: () => useSkill(i), key: 'sk' + i });
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
    if (!unl) { ctx.fillStyle = 'rgba(0,0,0,.45)'; circ(x, yy, r); txt(`Lv.${s.lv}`, x, yy, 15, '#fff', 'center'); }
    else {
      RR(x - 15, yy + 17, 30, 15, 7); ctx.fillStyle = 'rgba(20,40,90,.85)'; ctx.fill(); txt('' + s.mp, x, yy + 24.5, 11, '#bfe3ff', 'center', false);
      if (B.scd[i] > 0) { ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.beginPath(); ctx.moveTo(x, yy); ctx.arc(x, yy, r, -Math.PI / 2, -Math.PI / 2 + TAU * (B.scd[i] / s.cd)); ctx.closePath(); ctx.fill(); txt('' + Math.ceil(B.scd[i]), x, yy - 2, 19, '#fff', 'center'); }
    }
  }
  // 물약
  const px = 896, py = H - 140;
  ui.push({ x: px - 28, y: py - 26, w: 56, h: 50, tap: usePotion });
  ctx.fillStyle = 'rgba(20,8,0,.4)'; circ(px, py + 4, 23);
  ctx.fillStyle = ART.rg(ctx, S.potions > 0 ? '#c8f0cc' : '#9e9e9e', px, py, 23); circ(px, py, 23); ctx.lineWidth = 2.5; ctx.strokeStyle = '#4a2a14'; ctx.beginPath(); ctx.arc(px, py, 23, 0, TAU); ctx.stroke();
  ART.icon(ctx, 'potion', px, py, 30); txt('x' + S.potions, px + 18, py + 16, 13, '#fff', 'center');
  // 메시지·튜토리얼
  if (B.cut) drawBossCut(B.cut);
  if (B.intro) { drawIntroBars(); ui = [{ x: 0, y: 0, w: W, h: H, key: 'skipIntro', tap: () => { if (B.intro) B.intro.t = B.intro.T; } }]; }
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
  ctx.fillStyle = 'rgba(20,8,0,.6)'; ctx.fillRect(0, 0, W, H);
  ART.panel(ctx, W / 2 - 180, 100, 360, 340, 'cream');
  bigText('일시 정지', W / 2, 146, 34, '#fff3c4', '#ffb300');
  btn(W / 2 - 125, 190, 250, 58, '계속하기', () => { B.paused = false; }, { bg: '#5cc96b' });
  btn(W / 2 - 125, 262, 250, 58, '다시 시작', () => go(() => startBattle(B.n)), { bg: '#ffb84d' });
  btn(W / 2 - 125, 334, 250, 58, '지도로 (포기)', () => go(() => { save(); setScene('map'); }), { bg: '#a99a8a' });
}
function drawResult() {
  ui = [];
  const o = B.over, a = Math.min(1, o.t * 2);
  ctx.globalAlpha = a; ctx.fillStyle = 'rgba(20,8,0,.6)'; ctx.fillRect(0, 0, W, H);
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
  if (B.towerRew) lines.push(['탑 보상', `+${B.towerRew} 코인`]);
  if (B.trial != null && o.win) lines.push(['전직 시험', `합격! 「${THIRD[B.trial].n}」`]);
  if (o.sold) lines.push([o.aSold === o.sold ? '자동 판매' : '자동 판매 · 가방 가득', `+${o.sold} 코인`]);
  const lx = W / 2 - 110, rx = W / 2 + 230;
  const LH = lines.length >= 5 || o.unlockMsg ? 23 : 27; // v1.2 겹침 방지: 줄 간격 자동
  lines.forEach((l, i) => { txt(l[0], lx, py + 146 + i * LH, 15, '#7a5230', 'left', false); txt(l[1], rx, py + 146 + i * LH, 15, '#3e2723', 'right', false, null, 150); });
  let yy = py + 146 + lines.length * LH + 4;
  if (B.loot.length) {
    txt('획득 장비', lx, yy + 12, 15, '#7a5230', 'left', false);
    const show = B.loot.slice(0, 6);
    show.forEach((it, i) => ART.itemIcon(ctx, it, lx + 80 + i * 46, yy - 6, 40));
    if (B.loot.length > 6) txt(`+${B.loot.length - 6}`, lx + 80 + 6 * 46 + 4, yy + 14, 14, '#7a5230', 'left', false);
    yy += 44;
  }
  if (o.unlockMsg) {
    ART.draw(ctx, o.unlockMsg.id, 'i' + (Math.floor(G.time * 2.4) % 3), W / 2 - 205, py + 320, 1.2, false, 0);
    RR(lx - 6, yy - 2, 346, 26, 13); ctx.fillStyle = 'rgba(46,125,50,.14)'; ctx.fill();
    txt(`새 동료 합류! ${o.unlockMsg.nick} · ${o.unlockMsg.name}`, lx + 167, yy + 11, 15, '#2e7d32', 'center', false, null, 332);
    yy += 30;
  }
  if (o.win && !B.special && hasStory('post' + B.n)) txt('▶ 이야기가 이어집니다', rx, Math.max(yy + 10, py + 352), 13, '#a0652a', 'right', false);
  ctx.globalAlpha = 1;
  if (o.t < 0.9) return;
  const by = py + 372;
  btn(W / 2 - 245, by, 150, 56, '지도로', () => afterResult(() => { setScene('map'); mapTab = 0; }), { bg: '#a99a8a' });
  if (!B.special) btn(W / 2 - 78, by, 150, 56, '다시하기', () => { const k = B.n; afterResult(() => startBattle(k)); }, { bg: '#ffb84d' });
  if (B.tower != null) btn(W / 2 + 89, by, 156, 56, o.win ? `${S.tower.cur}층 도전` : '다시 도전', () => afterResult(() => startTower()), { bg: '#9c6bff', size: 17 });
  else if (B.trial != null) btn(W / 2 + 89, by, 156, 56, o.win ? '강화 보기' : '다시 시험', () => { const k = B.trial; afterResult(() => { if (o.win) { setScene('map'); mapTab = 1; } else startTrial(k); }); }, { bg: '#ff8a3d', size: 17 });
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
  ART.drawBg(ctx, [0, 1, 2, 5, 10][c.dragon] || 0, t * 18, t, GY + 40, W, H);
  ctx.fillStyle = 'rgba(30,12,0,.25)'; ctx.fillRect(0, 0, W, H);
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
    cols.forEach((col, j) => { const x = 590 + j * 50; ui.push({ x: x - 20, y: y - 2, w: 40, h: 40, tap: () => { c[k] = j; SFX.pick(); }, key: 'sw' + k + j }); ctx.fillStyle = col; circ(x, y + 18, 15); ctx.lineWidth = c[k] === j ? 4 : 2; ctx.strokeStyle = c[k] === j ? '#e65100' : 'rgba(60,30,10,.5)'; ctx.beginPath(); ctx.arc(x, y + 18, c[k] === j ? 18 : 15, 0, TAU); ctx.stroke(); });
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
const SEASON_N = ['시즌 1 · 열 개의 별뼈', '시즌 2 · 별의 바다', '시즌 3 · 뼈의 심장', '시즌 4 · 시간의 시계탑', '시즌 5 · 꿈꾸는 섬', '시즌 6 · 별 너머의 왕국', '시즌 7 · 네 개의 바람', '시즌 8 · 무지개 다리 너머', '시즌 9 · 갈라진 무지개'];
function buildTitleBg() {
  const c = ART.mk(W, H), g = c.getContext('2d');
  // 새벽 하늘
  const sky = g.createLinearGradient(0, 0, 0, 380); sky.addColorStop(0, '#2b3a7a'); sky.addColorStop(0.35, '#7a6ab8'); sky.addColorStop(0.62, '#f2a2a0'); sky.addColorStop(0.85, '#ffd9a0'); sky.addColorStop(1, '#fff0c8'); g.fillStyle = sky; g.fillRect(0, 0, W, H);
  let sd = 31; const R = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
  for (let k = 0; k < 90; k++) { g.fillStyle = `rgba(255,255,255,${0.2 + R() * 0.6})`; const r = R() < 0.1 ? 1.6 : 0.9; g.beginPath(); g.arc(R() * W, R() * 170, r, 0, TAU); g.fill(); }
  // 수채 구름
  for (let k = 0; k < 14; k++) { const x = R() * W, y = 150 + R() * 140, r = 40 + R() * 80; const gr = g.createRadialGradient(x, y, 4, x, y, r); gr.addColorStop(0, `rgba(255,${200 + R() * 40 | 0},${200 + R() * 40 | 0},.35)`); gr.addColorStop(1, 'rgba(255,220,220,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
  // 먼 산 3겹
  [['#8a7ab8', 250, 60, 0.012], ['#a88ab0', 285, 45, 0.019], ['#c69aa0', 318, 30, 0.027]].forEach(([col, base, amp, f], li) => { g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 8) g.lineTo(x, base - Math.abs(Math.sin(x * f + li * 2)) * amp - Math.sin(x * f * 3.1) * amp * 0.25); g.lineTo(W, H); g.closePath(); g.fillStyle = col; g.globalAlpha = 0.8; g.fill(); g.globalAlpha = 1; });
  // 성이 있는 언덕
  g.beginPath(); g.moveTo(430, H); g.quadraticCurveTo(560, 300, 720, 300); g.quadraticCurveTo(880, 300, 980, 380); g.lineTo(980, H); g.closePath(); g.fillStyle = ART.lgr(g, '#8ccf6a', '#4f9a48', 0, 300, 0, 480); g.fill();
  // 멍멍성
  const cx = 730, by = 312;
  const tower = (x, w, h, roof, flag) => {
    g.fillStyle = ART.lgr(g, '#fff6e6', '#d8c4a6', x - w / 2, 0, x + w / 2, 0); g.fillRect(x - w / 2, by - h, w, h); g.strokeStyle = 'rgba(90,60,40,.7)'; g.lineWidth = 2; g.strokeRect(x - w / 2, by - h, w, h);
    for (let k = 0; k < Math.floor(w / 10); k++) { g.fillStyle = '#efe0c8'; g.fillRect(x - w / 2 + k * 10 + 1, by - h - 7, 6, 7); g.strokeRect(x - w / 2 + k * 10 + 1, by - h - 7, 6, 7); }
    g.beginPath(); g.moveTo(x - w / 2 - 6, by - h - 4); g.lineTo(x, by - h - roof); g.lineTo(x + w / 2 + 6, by - h - 4); g.closePath(); g.fillStyle = ART.lgr(g, '#5aa0e8', '#2a5aa8', x - w / 2, 0, x + w / 2, 0); g.fill(); g.stroke();
    if (flag) { g.strokeStyle = '#5a3a22'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, by - h - roof); g.lineTo(x, by - h - roof - 22); g.stroke(); g.beginPath(); g.moveTo(x, by - h - roof - 22); g.quadraticCurveTo(x + 14, by - h - roof - 24, x + 24, by - h - roof - 16); g.lineTo(x, by - h - roof - 10); g.closePath(); g.fillStyle = '#e8473c'; g.fill(); }
    for (let k = 0; k < 2; k++) { const wy = by - h + 20 + k * 30; if (wy > by - 14) continue; ART.RR(g, x - 5, wy, 10, 14, 5); g.fillStyle = '#ffd98a'; g.fill(); }
  };
  tower(cx - 92, 34, 96, 52, true); tower(cx + 92, 34, 96, 52, true);
  g.fillStyle = ART.lgr(g, '#fff2dc', '#d9c4a4', 0, by - 70, 0, by); g.fillRect(cx - 80, by - 70, 160, 70); g.strokeStyle = 'rgba(90,60,40,.7)'; g.strokeRect(cx - 80, by - 70, 160, 70);
  tower(cx, 54, 150, 78, true); tower(cx - 46, 30, 118, 44, false); tower(cx + 46, 30, 118, 44, false);
  g.beginPath(); g.arc(cx, by, 18, Math.PI, 0); g.lineTo(cx + 18, by); g.lineTo(cx - 18, by); g.fillStyle = '#6e4320'; g.fill();
  // 할미 발코니
  ART.RR(g, cx - 22, by - 106, 44, 8, 3); g.fillStyle = '#c9a07a'; g.fill(); ART.RR(g, cx - 14, by - 138, 28, 32, 13); g.fillStyle = '#ffe6a8'; g.fill();
  // 성 앞 길
  g.beginPath(); g.moveTo(cx - 14, by + 2); g.bezierCurveTo(cx - 40, 360, 520, 380, 470, H); g.lineTo(560, H); g.bezierCurveTo(600, 400, cx - 10, 360, cx + 14, by + 2); g.closePath(); g.fillStyle = 'rgba(240,215,160,.9)'; g.fill();
  // 앞 들판
  g.beginPath(); g.moveTo(0, 410); g.quadraticCurveTo(300, 380, 600, 400); g.quadraticCurveTo(800, 412, W, 396); g.lineTo(W, H); g.lineTo(0, H); g.closePath(); g.fillStyle = ART.lgr(g, '#9ed878', '#5aa84e', 0, 390, 0, H); g.fill();
  for (let k = 0; k < 160; k++) { const x = R() * W, y = 405 + R() * 135; g.fillStyle = ['#ffffff', '#ffd34d', '#ff9ec4', '#bfe6ff'][k % 4]; g.globalAlpha = 0.85; g.beginPath(); g.arc(x, y, 1.4 + R() * 1.6, 0, TAU); g.fill(); }
  g.globalAlpha = 1;
  // 왼쪽 글자 자리 은은한 크림 번짐
  const lg = g.createLinearGradient(0, 0, 470, 0); lg.addColorStop(0, 'rgba(255,246,228,.55)'); lg.addColorStop(1, 'rgba(255,246,228,0)'); g.fillStyle = lg; g.fillRect(0, 0, 470, H);
  // 종이 결
  g.globalAlpha = 0.05; for (let k = 0; k < 300; k++) { g.fillStyle = k % 2 ? '#7a5230' : '#ffffff'; g.fillRect(R() * W, R() * H, 2 + R() * 5, 1); } g.globalAlpha = 1;
  // v1.1 깊이감 마감: 빛줄기 · 먼 꿈의 섬 · 흐린 전경 꽃 · 비네트
  g.save(); g.globalCompositeOperation = 'screen';
  for (let k = 0; k < 6; k++) { const a = -0.55 + k * 0.17, gr = g.createLinearGradient(760, 0, 760 + Math.sin(a) * 600, 560); gr.addColorStop(0, 'rgba(255,240,200,.22)'); gr.addColorStop(1, 'rgba(255,240,200,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(760, -20); g.lineTo(760 + Math.sin(a - 0.05) * 900, 600); g.lineTo(760 + Math.sin(a + 0.05) * 900, 600); g.closePath(); g.fill(); }
  g.restore();
  { const ix = 330, iy = 250; g.save(); g.globalAlpha = 0.5; g.filter = 'blur(1.5px)'; g.fillStyle = '#c8a8e8'; g.beginPath(); g.ellipse(ix, iy, 46, 9, 0, 0, TAU); g.fill(); g.beginPath(); g.moveTo(ix - 30, iy); g.quadraticCurveTo(ix - 10, iy - 34, ix + 4, iy - 20); g.quadraticCurveTo(ix + 20, iy - 40, ix + 34, iy); g.closePath(); g.fill(); g.fillStyle = '#ffd0f0'; g.fillRect(ix + 8, iy - 34, 4, 22); g.globalAlpha = 0.35; g.fillStyle = '#fff6d0'; g.beginPath(); g.arc(ix + 10, iy - 36, 6, 0, TAU); g.fill(); g.restore(); }
  { const fl = ART.mk(W, H), f = fl.getContext('2d'); let s2 = 77; const Q = () => { s2 = (s2 * 16807) % 2147483647; return s2 / 2147483647; };
    for (let k = 0; k < 26; k++) { const side = k % 2, x = side ? W - Q() * 150 : Q() * 150, y = H - Q() * 70, r = 9 + Q() * 12, c = ['#ffb3c8', '#fff3a0', '#ffffff', '#c8b0ff'][k % 4];
      f.fillStyle = '#4a8a3a'; f.beginPath(); f.ellipse(x, y + r, r * 0.4, r * 1.4, side ? 0.4 : -0.4, 0, TAU); f.fill();
      for (let q = 0; q < 5; q++) { const a = q / 5 * TAU; f.fillStyle = c; f.beginPath(); f.ellipse(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6, r * 0.5, r * 0.32, a, 0, TAU); f.fill(); }
      f.fillStyle = '#ffcf40'; f.beginPath(); f.arc(x, y, r * 0.28, 0, TAU); f.fill(); }
    g.save(); g.filter = 'blur(3px)'; g.globalAlpha = 0.9; g.drawImage(fl, 0, 0); g.restore(); }
  { const v = g.createRadialGradient(W / 2, H * 0.45, H * 0.35, W / 2, H * 0.5, W * 0.65); v.addColorStop(0, 'rgba(40,20,60,0)'); v.addColorStop(1, 'rgba(40,20,60,.32)'); g.fillStyle = v; g.fillRect(0, 0, W, H); }
  return c;
}
function drawStoryTitle(t) {
  TCX = 236;
  if (!titleBg) titleBg = buildTitleBg();
  ctx.drawImage(titleBg, 0, 0);
  // 무지개 뼈다귀 + 별뼈 별자리
  const bx = 730, byy = 40, got = Math.min(16, Math.floor(S.cleared / CHL));
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  ['#ff6b6b', '#ffb84d', '#ffe14a', '#6fd86a', '#5ab8ff', '#9b6bff'].forEach((c2, k) => { ctx.strokeStyle = ART.rgba(c2, 0.22); ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(bx, byy + 60, 70 - k * 6, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke(); });
  ctx.globalAlpha = 0.7 + Math.sin(t * 2) * 0.2; ctx.drawImage(ART.softDot('#fff3c0'), bx - 70, byy - 50, 140, 100); ctx.restore();
  ART.bone(ctx, bx, byy, 54, '#fffaf0', Math.sin(t * 0.8) * 0.08);
  for (let k = 0; k < 16; k++) { const a = -Math.PI + (k + 0.5) / 16 * Math.PI, x = bx + Math.cos(a) * 150, y = byy + 30 + Math.sin(a) * 74, on = k < got; ctx.globalAlpha = on ? 0.95 : 0.35; ART.bone(ctx, x, y, on ? 14 : 11, on ? '#ffe9a0' : '#c8c0e0', a + Math.PI / 2); if (on) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.4 + Math.sin(t * 3 + k) * 0.3; ctx.drawImage(ART.softDot('#ffe9a0'), x - 12, y - 12, 24, 24); ctx.restore(); } }
  ctx.globalAlpha = 1;
  // 할미가 발코니에서 손 흔들기
  ART.draw(ctx, 'granny', Math.floor(t * 2) % 2 ? 'c_happy' : 'i0', 730, 210, 0.42, true, 0);
  // 깃발 반짝
  // 기사단 (해금된 동료만)
  const crew = [['u1', 520, 452], ['u0', 570, 470], ['u2', 830, 466], ['u3', 880, 450], ['u6', 470, 476], ['u9', 920, 480], ['u5', 780, 486], ['u8', 960, 470]];
  crew.forEach(([id, x, y], i) => { const ui2 = UNITS.findIndex(u => u.id === id); if (ui2 > 0 && !unitUnlocked(ui2) && i > 2) return; ctx.fillStyle = 'rgba(30,40,0,.22)'; ART.E(ctx, x, y + 2, 18, 4); ctx.fill(); ART.draw(ctx, id, (t + i * 0.7) % 3 < 0.5 ? 'c_happy' : 'i' + (Math.floor(t * 2.4 + i) % 3), x, y + Math.max(0, Math.sin(t * 4 + i)) * -3, 0.82, x > 700, 0); });
  // 주인공 + 미르
  const hk0 = (t % 3.4) < 0.4 ? 'a' + Math.min(7, Math.floor((t % 3.4) / 0.4 * 8)) : 'i' + (Math.floor(t * 2.4) % 3);
  ctx.fillStyle = 'rgba(30,40,0,.25)'; ART.E(ctx, 680, 502, 90, 10); ctx.fill();
  ART.draw(ctx, heroType(), hk0, 670, 500, mounted() ? mountK() * 1.25 : 1.8, false, 0);
  // 꽃잎
  ctx.save(); for (let k = 0; k < 16; k++) { const ph = (t * 0.08 + k * 0.137) % 1, x = (k * 131 + t * 30) % (W + 60) - 30, y = ph * H; ctx.globalAlpha = 0.7; ctx.fillStyle = k % 3 ? '#ffc2d8' : '#fff3b0'; ctx.save(); ctx.translate(x, y); ctx.rotate(t + k); ART.E(ctx, 0, 0, 4, 2.2); ctx.fill(); ctx.restore(); } ctx.restore();
  // 로고 + 시즌 리본 + 주제
  const L = ART.logo(), lw = 410, lh = lw * L.height / L.width, ly = 14 + Math.sin(t * 2) * 4;
  ctx.drawImage(L, TCX - lw / 2, ly, lw, lh);
  const sn = SEASON_N[S.cleared >= 260 ? 8 : S.cleared >= 240 ? 7 : S.cleared >= 200 ? 6 : S.cleared >= 180 ? 5 : S.cleared >= 160 ? 4 : S.cleared >= 140 ? 3 : S.cleared >= 120 ? 2 : S.cleared >= 100 ? 1 : 0];
  ctx.font = `bold 15px ${FONT}`; const sw2 = ctx.measureText(sn).width + 40;
  ART.RR(ctx, TCX - sw2 / 2, ly + lh + 2, sw2, 28, 14); ctx.fillStyle = ART.lgr(ctx, '#e0623a', '#b4401f', 0, ly + lh, 0, ly + lh + 30); ctx.fill(); ctx.strokeStyle = '#5a2410'; ctx.lineWidth = 2; ctx.stroke();
  txt(sn, TCX, ly + lh + 16, 15, '#fff3c4', 'center', false);
  txt('혼자 짖으면 소리, 함께 짖으면 노래!', TCX, ly + lh + 50, 16, '#6a3a1a', 'center', '#fff6e0');
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 6; k++) { const ph = (t * 0.7 + k * 0.37) % 1, x = TCX - 180 + ((k * 97) % 360), y = ly + 30 + ((k * 53) % 100); ctx.globalAlpha = Math.sin(ph * Math.PI) * 0.8; ART.star(ctx, x, y, 7 * Math.sin(ph * Math.PI), '#ffe9a0', 0.25); }
  ctx.restore();
  txt('v' + VERSION, 14, H - 12, 12, 'rgba(90,52,18,.7)', 'left', false);
}
function drawTitle() {
  const t = G.time, tim = AP.title;
  if (tim) {
    TCX = 222;
    const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#fdf8ee'); bg.addColorStop(1, '#efe0c2'); ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
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
  drawLyrics(AP.title ? 400 : 392, TCX, 410);
  btn(TCX - 120, 474, 240, 56, '게임 시작', () => go(() => { if (!S.custom) openCreator(() => setScene('map'), true); else setScene('map'); }), { bg: '#5cc96b', size: 24 });
  btn(W - 132, 478, 118, 44, S.music ? '♪ 음악 ON' : '♪ 음악 OFF', () => { S.music = !S.music; applyAudioPrefs(); save(); }, { bg: S.music ? '#ffb84d' : '#a99a8a', size: 15 });
}
function drawLyrics(y, cx, pw) {
  cx = cx || W / 2; pw = pw || 600;
  const L = AUD.lyric();
  ctx.globalAlpha = 0.9; ART.panel(ctx, cx - pw / 2, y, pw, 62, 'dark'); ctx.globalAlpha = 1;
  txt('♪ 달려라 멍멍기사 (주제가)', cx - pw / 2 + 16, y + 13, 12, '#ffcf5a', 'left', false);
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
  { n: '노랑', m: '웃음', c: '#ffd83a', at: 280, by: '메아리 요정 되울이' }, { n: '초록', m: '자람', c: '#6ad06a', at: 999, by: '시즌 10 · 사막의 별시장' },
  { n: '파랑', m: '고요함', c: '#4ab0ff', at: 999, by: '시즌 11 · 잠든 시계 숲' }, { n: '남색', m: '두려움', c: '#6a6aff', at: 999, by: '???' }, { n: '보라', m: '꿈', c: '#b86aff', at: 999, by: '???' }];
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
    ART.RR(g, rx, ry, rw, 30, 9); g.fillStyle = ART.lgr(g, '#e8703f', '#b4401f', 0, ry, 0, ry + 30); g.fill(); g.lineWidth = 2; g.strokeStyle = '#5a2410'; g.stroke();
    ART.RR(g, rx + 3, ry + 3, rw - 6, 24, 7); g.lineWidth = 1.2; g.strokeStyle = 'rgba(255,215,120,.8)'; g.stroke();
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
let mapDragObj = null;
function mapDrag() {
  if (mapDragObj) { dragH = mapDragObj; return; }
  dragH = mapDragObj = { id: null, sx: 0, sm: 0, moved: 0,
    down(p, id) { if (popup || p.y < 56) return; this.id = id; this.sx = p.x; this.sm = mapTX; this.moved = 0; },
    move(p) { const d = p.x - this.sx; this.moved = Math.max(this.moved, Math.abs(d)); mapTX = clampMap(this.sm - d); mapX = mapTX; },
    up(p, ok) { const id = this.id; this.id = null; if (id == null || !ok || this.moved > 14 || popup || scene !== 'map' || mapTab !== 0) return; const wx = p.x + mapX;
      for (let z = 0; z < CHN; z++) { const cx = 24 + z * ZW + (ZW - 10) / 2 + 72, cy = 153; if (Math.hypot(wx - cx, p.y - cy) < 22 && S.cleared >= (z + 1) * CHL && !S.chRew[z]) { grantChapterReward(z); return; } }
      let best = null, bd = 34; for (const N of NODES) { const d = Math.hypot(wx - N.x, p.y - N.y); if (d < bd) { bd = d; best = N; } }
      if (best) { if (best.n <= S.cleared + 1) { popup = best.n; SFX.click(); } else { mapToast = { s: `${best.n - 1}스테이지를 먼저 클리어하세요`, t: 1.4 }; } } } };
}
let mapToast = null;
function drawMapTop() {
  if (mapTab === 0) { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#ffe7b8'); g.addColorStop(1, '#f2c487'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  else {
    const ch = Math.min(7, Math.floor(Math.min(MAXST - 1, S.cleared) / 5));
    ART.drawBg(ctx, ch, G.time * 14, G.time, 470, W, H);
    ctx.fillStyle = 'rgba(255,226,180,.38)'; ctx.fillRect(0, 0, W, H);
    const vg = ctx.createRadialGradient(W / 2, H / 2, 160, W / 2, H / 2, 620); vg.addColorStop(0, 'rgba(60,25,0,0)'); vg.addColorStop(1, 'rgba(60,25,0,.45)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    for (let k = 0; k < 14; k++) { const px = (k * 137 + G.time * 18) % (W + 40) - 20, py = 80 + (k * 71) % 440 + Math.sin(G.time + k) * 8; ctx.globalAlpha = 0.35 + Math.sin(G.time * 2 + k) * 0.2; ART.paw(ctx, px, py, 0.9, 'rgba(255,250,230,.6)'); } ctx.globalAlpha = 1;
  }
  ART.panel(ctx, -20, -20, W + 40, 76, 'wood');
  const L = ART.logo(); ctx.drawImage(L, 10, 0, 156, 156 * L.height / L.width);
  ART.panel(ctx, 172, 10, 196, 38, 'dark');
  ctx.save(); ctx.beginPath(); ctx.arc(191, 29, 16, 0, TAU); ctx.fillStyle = '#fff3d6'; ctx.fill(); ctx.clip(); ART.drawFit(ctx, heroFace(), 'i0', 191, 30, 32, 32, { face: 0.62, pad: 1.0 }); ctx.restore();
  txt(`Lv.${S.lv} 멍멍기사`, 210, 22, 12, '#ffe082');
  bar(210, 31, 146, 11, S.xp / xpNeed(S.lv), '#ffca28'); txt(`${S.xp}/${xpNeed(S.lv)}`, 283, 37, 9, '#fff', 'center');
  ART.panel(ctx, W - 166, 10, 154, 38, 'dark'); ART.icon(ctx, 'coin', W - 146, 29, 24); txt('' + S.coins, W - 128, 30, 18, '#ffe082');
  const tabs = ['지도', '강화', '장비', '편성', '도감', '설정'];
  tabs.forEach((n, i) => btn(378 + i * 69, 12, 64, 34, n, () => { mapTab = i; mapSel = null; resetArm = 0; popup = 0; codexSel = null; }, { bg: mapTab === i ? '#ffc93c' : '#c9a983', size: 15, key: 'tab' + i }));
}
function drawMap() {
  drawMapTop();
  if (mapTab === 0) drawStages(); else if (mapTab === 1) drawUpgrades(); else if (mapTab === 2) drawEquip(); else if (mapTab === 3) drawFormation(); else if (mapTab === 4) drawCodex(); else drawSettings();
  if (!CHR && !GROWN && !PROMO_POP && !THIRD_POP && !MIRP && !PETP && !DAILY) checkShardPop();
  if (CHR) drawChapterReward(); else if (SHARDP) drawShardPop(); else if (GROWN) drawGrown(); else if (PROMO_POP) drawPromo(); else if (THIRD_POP) drawThirdPop(); else if (MIRP) drawMirPanel(); else if (PETP) drawPetPanel(); else if (DAILY) drawDaily();
}
function grantChapterReward(ch) {
  if (S.chRew[ch] || S.cleared < (ch + 1) * CHL) return;
  const n = (ch + 1) * CHL, coins = 1000 + ch * 800, it = makeItem(n, ch >= 9 ? 4 : 3);
  S.chRew[ch] = 1; S.coins += coins; S.potions = Math.min(9, S.potions + 2); if (S.inv.length < 28) S.inv.push(it); else S.coins += sellPrice(it);
  CHR = { ch, coins, it, pot: 2, t: 0 }; save();
}
function drawChapterReward() {
  const c = CHR; c.t += G.dt || 0.016; ui = []; dragH = null;
  const a = Math.min(1, c.t * 3), op = Math.min(1, Math.max(0, (c.t - 0.5) * 2));
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = 'rgba(15,6,0,.72)'; ctx.fillRect(0, 0, W, H);
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
  ctx.save(); ctx.globalAlpha = Math.min(1, P.t * 3); ctx.fillStyle = 'rgba(15,6,0,.72)'; ctx.fillRect(0, 0, W, H);
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
function drawGrown() {
  const g = GROWN; g.t += G.dt || 0.016; ui = []; dragH = null;
  ctx.save(); ctx.globalAlpha = Math.min(1, g.t * 3); ctx.fillStyle = 'rgba(15,6,0,.7)'; ctx.fillRect(0, 0, W, H);
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
  for (let k = 0; k < 7; k++) { const t = (k + 0.5) / 7, on = k < c; ctx.beginPath(); ctx.arc(X(t), Y(t) + 26, 11, 0, TAU); ctx.fillStyle = on ? SHARDS[k].c : 'rgba(255,255,255,.55)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = on ? '#fff' : 'rgba(120,90,60,.5)'; ctx.stroke(); txt(on ? '★' : '?', X(t), Y(t) + 27, 11, on ? '#fff' : '#8a6a4a', 'center', false); }
  ctx.restore();
  const mx = X(0.5); ART.panel(ctx, mx - 150, yE + 104, 300, 48, 'dark');
  txt(`무지개 다리 ${c} / 7칸`, mx, yE + 120, 16, '#ffe082', 'center'); txt('새 친구를 사귈 때마다 한 칸씩 자라요', mx, yE + 140, 11, '#fff3c4', 'center', false);
}
// v1.6 색깔 조각을 얻었을 때 연출 (지도에 돌아오면 한 번)
let SHARDP = null;
function checkShardPop() { const c = shardsOwned(); if (S.shardSeen == null) S.shardSeen = 0; if (c > S.shardSeen && !SHARDP) SHARDP = { t: 0, i: c - 1 }; }
function drawShardPop() {
  const P = SHARDP; P.t += G.dt || 0.016; ui = []; dragH = null; const q = SHARDS[P.i];
  ctx.save(); ctx.globalAlpha = Math.min(1, P.t * 3); ctx.fillStyle = 'rgba(15,6,20,.78)'; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.7; ctx.drawImage(ART.softDot(q.c), W / 2 - 200, 40, 400, 340); ctx.restore();
  for (let k = 0; k < 12; k++) { const a = k / 12 * TAU + P.t * 0.6; ctx.strokeStyle = q.c; ctx.globalAlpha = 0.35; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(W / 2 + Math.cos(a) * 70, 200 + Math.sin(a) * 70); ctx.lineTo(W / 2 + Math.cos(a) * (130 + Math.sin(P.t * 4 + k) * 20), 200 + Math.sin(a) * (130 + Math.sin(P.t * 4 + k) * 20)); ctx.stroke(); }
  ctx.globalAlpha = Math.min(1, P.t * 3);
  const sc = Math.min(1, P.t * 2.2), r = 52 * sc, wob = Math.sin(P.t * 3) * 0.2; ctx.save(); ctx.translate(W / 2, 200); ctx.rotate(wob);
  ctx.beginPath(); ctx.moveTo(0, -r * 1.2); ctx.lineTo(r * 0.8, -r * 0.2); ctx.lineTo(r * 0.5, r); ctx.lineTo(-r * 0.5, r); ctx.lineTo(-r * 0.8, -r * 0.2); ctx.closePath(); ctx.fillStyle = ART.lgr(ctx, '#ffffff', q.c, 0, -r, 0, r); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#ffffff'; ctx.stroke(); ctx.restore();
  bigText(`${q.n} 색깔 조각 · 「${q.m}」`, W / 2, 316, 30, '#fff6d0', q.c);
  txt(`${q.by}에게서 받은 조각`, W / 2, 352, 15, '#fff3c4', 'center');
  SHARDS.forEach((z, k) => { const x = W / 2 - 150 + k * 50, on = k <= P.i, now = k === P.i; ctx.beginPath(); ctx.arc(x, 398, now ? 16 + Math.sin(P.t * 6) * 2 : 14, 0, TAU); ctx.fillStyle = on ? z.c : 'rgba(255,255,255,.18)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke(); });
  txt(`색깔 조각 ${P.i + 1} / 7 · 무지개 다리가 자랐어요!`, W / 2, 434, 14, '#ffe082', 'center');
  ctx.restore();
  if (P.t > 0.9) btn(W / 2 - 100, 456, 200, 48, '다리 보러 가기', () => { S.shardSeen = shardsOwned(); save(); SHARDP = null; mapTab = 0; mapTX = clampMap(NODES[MAXST - 1].x + 160 - W / 2); }, { bg: '#5cc96b', size: 18, key: 'shardok' });
}
function fitText(s, w) { if (ctx.measureText(s).width <= w) return s; while (s.length > 1 && ctx.measureText(s + '…').width > w) s = s.slice(0, -1); return s + '…'; }
function drawStages() {
  if (!mapBg) buildMapBg();
  const next = Math.min(MAXST, S.cleared + 1), NC = NODES[next - 1];
  if (mapX === null) { mapTX = clampMap(NC.x - W / 2); mapX = mapTX; }
  mapX += (mapTX - mapX) * Math.min(1, G.dt * 12 || 0.2);
  if (!popup) mapDrag();
  ctx.save(); ctx.beginPath(); ctx.rect(0, 56, W, H - 56); ctx.clip();
  let built = false; { const sx0 = mapX * MS, sx1 = sx0 + W * MS, k = 1 / MS; MAP_IDLE += G.dt || 0.016; for (const t of mapBg) { const a = Math.max(sx0, t.x), b = Math.min(sx1, t.x + t.w); if (b <= a) continue; if (!t.c && !built) { buildMapTile(t); built = true; } if (!t.c) { ctx.fillStyle = '#f3e3c0'; ctx.fillRect((a - sx0) * k, 56, (b - a) * k, H - 56); continue; } ctx.drawImage(t.c, a - t.x, 0, b - a, H * MS, (a - sx0) * k, 0, (b - a) * k, H); } }
  if (!built && MAP_IDLE > 0.6 && !(dragH && dragH.id != null) && Math.abs(mapTX - mapX) < 2) { const sx0 = mapX * MS, sx1 = sx0 + W * MS; const nb = mapBg.filter(t => !t.c && t.x + t.w > sx0 - MTW && t.x < sx1 + MTW).sort((a, b) => Math.abs(a.x - sx0) - Math.abs(b.x - sx0))[0]; if (nb) { buildMapTile(nb); MAP_IDLE = 0; } }
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
    ctx.fillStyle = ART.lgr(ctx, ring[0], ring[1], 0, N.y - r - 3, 0, N.y + r + 3); circ(N.x, N.y, r + 3);
    const face = !open ? '#9e9890' : boss ? '#ffe0d8' : mid ? '#ff9f43' : done ? '#ffcf3a' : '#fff3d6';
    ctx.fillStyle = ART.rg(ctx, face, N.x, N.y, r, 0.45, 0.25); circ(N.x, N.y, r - 1);
    ctx.lineWidth = 2; ctx.strokeStyle = '#4a2a14'; ctx.beginPath(); ctx.arc(N.x, N.y, r + 3, 0, TAU); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.45)'; ART.E(ctx, N.x - r * 0.3, N.y - r * 0.45, r * 0.42, r * 0.2); ctx.fill();
    if (boss) { const k = BOSSES[N.z]; ctx.save(); ctx.beginPath(); ctx.arc(N.x, N.y, r - 2, 0, TAU); ctx.clip(); ctx.fillStyle = done ? '#fff3c4' : open ? '#ffd6d0' : '#cfc6bd'; ctx.fillRect(N.x - r, N.y - r, r * 2, r * 2); if (!open) ctx.globalAlpha = 0.45; ART.draw(ctx, k, done ? 'c_happy' : 'i' + (Math.floor(G.time * 2) % 3), N.x + 2, N.y + 42, ENEMIES[k].s * 0.36, true, 0); ctx.restore();
      ctx.lineWidth = 3; ctx.strokeStyle = done ? '#d9a830' : open ? '#c0392b' : '#7a6a5a'; ctx.beginPath(); ctx.arc(N.x, N.y, r - 1, 0, TAU); ctx.stroke();
      RR(N.x - 17, N.y + r - 8, 34, 16, 8); ctx.fillStyle = open ? '#c0392b' : '#7a6a5a'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#4a1a0a'; ctx.stroke(); txt('' + N.n, N.x, N.y + r, 11, '#fff', 'center', false); }
    else if (open) txt('' + N.n, N.x, N.y + 1, N.n >= 100 ? 11 : 13, mid ? '#fff' : '#5a3412', 'center', mid); else ART.icon(ctx, 'lock', N.x, N.y, 18);
    if (boss && open) { ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.moveTo(N.x - 10, N.y - r - 1); ctx.lineTo(N.x - 10, N.y - r - 11); ctx.lineTo(N.x - 5, N.y - r - 5); ctx.lineTo(N.x, N.y - r - 13); ctx.lineTo(N.x + 5, N.y - r - 5); ctx.lineTo(N.x + 10, N.y - r - 11); ctx.lineTo(N.x + 10, N.y - r - 1); ctx.closePath(); ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#6a3a0a'; ctx.stroke(); }
    if (mid && open) ART.icon(ctx, 'star', N.x + r, N.y - r + 2, 13);
    const sy = boss ? 10 : 0; if (st) { RR(N.x - 19, N.y + r + 2 + sy, 38, 13, 6.5); ctx.fillStyle = 'rgba(40,20,5,.7)'; ctx.fill(); for (let k = 0; k < 3; k++) ART.icon(ctx, k < st ? 'star' : 'starOff', N.x - 11 + k * 11, N.y + r + 8.5 + sy, 11); }
  }
  // 주인공 표시 + 화살표
  const hb = Math.abs(Math.sin(G.time * 3)) * -5;
  ctx.fillStyle = 'rgba(40,20,5,.3)'; ART.E(ctx, NC.x, NC.y - 14, 26, 5); ctx.fill();
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
  for (let k = 0; k < 7; k++) { const cx = ((k * 977 + G.time * (10 + k * 3)) % (MAPW + 400)) - 200, cy = 150 + (k * 73) % 300; if (cx < mapX - 200 || cx > mapX + W + 200) continue; ctx.save(); ctx.globalAlpha = 0.32; ctx.fillStyle = '#ffffff'; [[0, 0, 40], [-30, 8, 26], [30, 6, 30], [10, -12, 24]].forEach(([a, b, r]) => { ART.E(ctx, cx + a, cy + b, r, r * 0.6); ctx.fill(); }); ctx.restore(); }
  for (let k = 0; k < 5; k++) { const bx = ((k * 613 + G.time * 60) % (MAPW + 200)) - 100, by = 140 + (k * 59) % 120 + Math.sin(G.time * 2 + k) * 8, f = Math.sin(G.time * 10 + k) * 4; if (bx < mapX - 40 || bx > mapX + W + 40) continue; ctx.strokeStyle = 'rgba(60,40,30,.7)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(bx - 7, by - f); ctx.quadraticCurveTo(bx - 3, by - 3, bx, by); ctx.quadraticCurveTo(bx + 3, by - 3, bx + 7, by - f); ctx.stroke(); }
  for (let k = 0; k < 24; k++) { const sx3 = (k * 271) % MAPW, sy3 = 130 + (k * 157) % 380; if (sx3 < mapX || sx3 > mapX + W) continue; ctx.globalAlpha = Math.max(0, Math.sin(G.time * 2.5 + k * 1.7)); ART.star(ctx, sx3, sy3, 3, '#fffbe0'); } ctx.globalAlpha = 1;
  ctx.restore();
  // 화면 고정 장식: 금박 액자 테두리
  ctx.save(); ctx.lineWidth = 6; ctx.strokeStyle = ART.lgr(ctx, '#fff0a0', '#a8700f', 0, 56, 0, H); ctx.strokeRect(3, 59, W - 6, H - 62); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(90,50,10,.7)'; ctx.strokeRect(8, 64, W - 16, H - 72);
  [[10, 66, 1, 1], [W - 10, 66, -1, 1], [10, H - 10, 1, -1], [W - 10, H - 10, -1, -1]].forEach(([x, y, dx, dy]) => { ctx.fillStyle = '#d9a830'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + dx * 26, y); ctx.quadraticCurveTo(x + dx * 10, y + dy * 10, x, y + dy * 26); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#6a3a0a'; ctx.lineWidth = 1; ctx.stroke(); ART.star(ctx, x + dx * 9, y + dy * 9, 4, '#fff6c0'); });
  ctx.restore();
  // 제목 카르투슈, 나침반
  ART.panel(ctx, W / 2 - 150, 62, 300, 40, 'wood'); ART.paw(ctx, W / 2 - 110, 82, 1.1, '#ffcf5a'); ART.paw(ctx, W / 2 + 110, 82, 1.1, '#ffcf5a'); txt('뼈다귀 왕국 전도', W / 2, 82, 17, '#fff3c4', 'center');
  ctx.save(); ctx.translate(46, 84); ctx.scale(0.62, 0.62); ctx.rotate(Math.sin(G.time * 0.5) * 0.05); ctx.globalAlpha = 0.95; ART.E(ctx, 0, 0, 30, 30); ctx.fillStyle = 'rgba(255,248,230,.85)'; ctx.fill(); ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 2; ctx.stroke();
  for (let k = 0; k < 4; k++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(0, -26); ctx.lineTo(5, 0); ctx.lineTo(-5, 0); ctx.closePath(); ctx.fillStyle = k === 3 ? '#e53935' : '#8a5a2b'; ctx.fill(); }
  ctx.restore(); txt('N', 46, 66, 10, '#e53935', 'center');
  // 스크롤 바 & 화살표
  const tw = W - 240, tx = 120; RR(tx, H - 14, tw, 6, 3); ctx.fillStyle = 'rgba(60,30,10,.25)'; ctx.fill();
  const kw = tw * W / MAPW; RR(tx + (tw - kw) * (mapX / (MAPW - W)), H - 14, kw, 6, 3); ctx.fillStyle = '#c0782f'; ctx.fill();
  if (!popup) {
    if (mapTX > 2) btn(8, 270, 44, 64, '◀', () => { mapTX = clampMap(mapTX - 420); }, { bg: '#c9a983', size: 20, key: 'mapL' });
    if (mapTX < MAPW - W - 2) btn(W - 52, 270, 44, 64, '▶', () => { mapTX = clampMap(mapTX + 420); }, { bg: '#c9a983', size: 20, key: 'mapR' });
    btn(W - 132, 64, 120, 34, '현재 위치', () => { mapTX = clampMap(NC.x - W / 2); }, { bg: '#ffc93c', size: 14, key: 'mapNow' });
    { ensureDaily(); const D = S.daily, red = S.att.last !== todayKey() || MISSIONS_D.some((m, k) => D[m.f] >= m.goal && !D.got[k]);
      btn(W - 132, 104, 120, 34, '오늘의 할 일', () => { DAILY = { t: 0 }; }, { bg: '#ff8a3d', size: 13, key: 'mapDaily' });
      if (red) { ctx.fillStyle = '#ff3b30'; circ(W - 16, 106, 7); txt('!', W - 16, 106, 11, '#fff', 'center', false); } }
    ctx.globalAlpha = 0.85; ART.panel(ctx, W / 2 - 160, H - 46, 320, 26, 'dark'); ctx.globalAlpha = 1; txt('드래그 · ←→ 키로 이동 · 스테이지를 눌러 출전!', W / 2, H - 33, 12, '#fff3c4', 'center', false);
  }
  if (mapToast) { mapToast.t -= G.dt || 0.016; ctx.globalAlpha = Math.min(1, mapToast.t * 3); ART.panel(ctx, W / 2 - 170, 110, 340, 34, 'dark'); txt(mapToast.s, W / 2, 127, 14, '#ffcf6b', 'center', false); ctx.globalAlpha = 1; if (mapToast.t <= 0) mapToast = null; }
  if (popup) drawStagePopup(popup);
}
function drawStagePopup(n) {
  ui = ui.filter(b => b.key && b.key.startsWith('tab'));
  ctx.fillStyle = 'rgba(20,8,0,.55)'; ctx.fillRect(0, 56, W, H);
  ui.push({ x: 0, y: 56, w: W, h: H, tap: () => { popup = 0; }, key: 'dim' });
  const si = stageInfo(n), x = W / 2 - 260, y = 84, w = 520, h = 380;
  ART.panel(ctx, x, y, w, h, 'cream');
  ui.push({ x, y, w, h, tap: () => {}, key: 'pbody' });
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
  const items = UPS.concat([{ k: 'potion', name: '회복 물약 구매', desc: '전투 중 기사 체력 60% 회복', ic: 'potion' }]);
  items.forEach((u, i) => {
    const col = i % 3, row = Math.floor(i / 3), x = 14 + col * 312, y = 62 + row * 94, w = 304, h = 88;
    ART.panel(ctx, x, y, w, h, 'cream');
    let cost, can, lvTxt, locked = false;
    if (u.k === 'potion') { cost = 50; lvTxt = `보유 ${S.potions}/9`; can = S.coins >= cost && S.potions < 9; }
    else { const l = S.up[u.k]; cost = upCost(u); lvTxt = l >= UPMAX ? 'MAX' : `Lv.${l}/${UPMAX}`; can = l < UPMAX && S.coins >= cost; if (u.unit !== undefined && !unitUnlocked(u.unit)) { locked = true; can = false; } }
    ctx.save(); RR(x + 12, y + 14, 56, 56, 12); ctx.fillStyle = ART.lgr(ctx, '#fff3d6', '#f2cf90', 0, y + 14, 0, y + 70); ctx.fill(); ctx.clip();
    if (u.unit !== undefined) ART.drawFit(ctx, unitSprite(u.unit), locked ? 'ib' : 'i0', x + 40, y + 42, 54, 54, { face: 0.8 });
    else ART.icon(ctx, u.ic, x + 40, y + 42, 36);
    ctx.restore(); ctx.lineWidth = 2; ctx.strokeStyle = '#c69355'; RR(x + 12, y + 14, 56, 56, 12); ctx.stroke();
    txt(u.name, x + 76, y + 26, 15, '#4e342e', 'left', false, null, w - 186);
    txt(locked ? `스테이지 ${UNITS[u.unit].unlock - 1} 클리어 후 합류` : u.unit !== undefined ? (third(u.unit) ? `★★ 3차 직업: ${THIRD[u.unit].n}` : promoted(u.unit) ? `★ 2차 직업: ${PROMO[u.unit].n} · 전직 시험 가능` : `Lv.10에 2차 직업 「${PROMO[u.unit].n}」`) : u.desc.replace(/ 체력·공격력/, ''), x + 76, y + 48, 10.5, '#8a6142', 'left', false, null, w - 186);
    txt(lvTxt, x + 76, y + 66, 11, '#a0652a', 'left', false);
    if (u.k !== 'potion' && !locked) for (let k = 0; k < UPMAX; k++) { RR(x + 122 + k * 6.5, y + 63, 5, 6, 2); ctx.fillStyle = k < S.up[u.k] ? '#ffb300' : 'rgba(141,90,43,.2)'; ctx.fill(); }
    const full = u.k !== 'potion' && S.up[u.k] >= UPMAX;
    btn(x + w - 100, y + 22, 88, 44, '', () => {
      if (u.k === 'potion') { if (S.coins >= 50 && S.potions < 9) { S.coins -= 50; S.potions++; save(); SFX.coin(); } }
      else if (S.up[u.k] < UPMAX && S.coins >= upCost(u)) { S.coins -= upCost(u); S.up[u.k]++; save(); SFX.lvl(); if (u.unit !== undefined && S.up[u.k] >= UPMAX) { PROMO_POP = { i: u.unit, t: 0 }; SFX.rare(); } }
    }, { bg: can ? '#5cc96b' : '#b5a99b', disabled: !can, key: 'up' + u.k });
    if (full && u.unit !== undefined && !third(u.unit)) { btn(x + w - 100, y + 22, 88, 44, '전직 시험', () => go(() => startTrial(u.unit)), { bg: '#ff8a3d', size: 14, key: 'trial' + u.unit }); }
    else if (full && u.unit !== undefined) txt('3차 ★', x + w - 56, y + 44, 16, '#fff', 'center');
    else if (full) txt('완료', x + w - 56, y + 44, 16, '#fff', 'center');
    else { ART.icon(ctx, 'coin', x + w - 84, y + 44, 18); txt('' + cost, x + w - 72, y + 45, cost >= 10000 ? 12 : 15, '#fff', 'left'); }
  });
}
function drawEquip() {
  const hs = heroStats();
  ART.panel(ctx, 16, 64, 300, 466, 'cream');
  ctx.save(); RR(30, 78, 272, 190, 14); ctx.fillStyle = ART.lgr(ctx, '#bfe6ff', '#fff3d6', 0, 78, 0, 268); ctx.fill(); ctx.clip();
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5; ctx.drawImage(ART.softDot('#fff6c2'), 66, 80, 200, 200); ctx.restore();
  ctx.fillStyle = 'rgba(30,15,0,.2)'; ART.E(ctx, 166, 256, 50, 8); ctx.fill();
  ART.draw(ctx, heroType(), (G.time % 3) < 0.3 ? 'a' + Math.min(7, Math.floor((G.time % 3) / 0.3 * 8)) : 'i' + (Math.floor(G.time * 2.4) % 3), mounted() ? 172 : 160, 258, mounted() ? mountK() * 0.95 : 2.2, false, 0);
  btn(226, 84, 70, 30, '꾸미기', () => openCreator(() => setScene('map')), { bg: '#ffb84d', size: 13, key: 'eqcus' });
  btn(226, 118, 70, 30, '미르', () => { MIRP = { t: 0 }; }, { bg: '#9c6bff', size: 13, key: 'eqmir' });
  btn(226, 152, 70, 30, '펫', () => { PETP = { t: 0 }; }, { bg: '#ff8a3d', size: 13, key: 'eqpet' });
  txt(`${heroName()}  Lv.${S.lv}`, 166, 288, 18, '#5a3412', 'center', false);
  const stats = [['sword', `공격력 ${hs.atk}`], ['heart', `체력 ${hs.hp}`], ['mana', `마나 ${hs.mpR.toFixed(1)}/초`], ['bone', `뼈다귀 ${hs.fdR.toFixed(1)}/초`], ['star', `치명타 ${hs.crit}%`], ['coin', `${KINDN[hs.wk]} · 사거리 ${hs.range}`]];
  stats.forEach(([ic, s], i) => { const sx = 40 + (i % 2) * 136, sy = 306 + Math.floor(i / 2) * 24; ART.icon(ctx, ic, sx + 8, sy, 18); txt(s, sx + 22, sy + 1, 13, '#5a3412', 'left', false, null, 110); });
  ['weapon', 'armor', 'charm'].forEach((sl, i) => {
    const x = 34 + i * 92, y = 380, it = S.eq[sl], sel = mapSel && mapSel.from === 'eq' && mapSel.slot === sl;
    ui.push({ x, y, w: 80, h: 110, tap: () => { if (it) mapSel = { from: 'eq', slot: sl }; }, key: 'eq' + sl });
    RR(x, y, 80, 110, 12); ctx.fillStyle = sel ? '#ffe082' : 'rgba(141,90,43,.12)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = sel ? '#e65100' : '#c69355'; ctx.stroke();
    txt(SLOTN[sl], x + 40, y + 14, 12, '#8a6142', 'center', false);
    if (it) { ART.itemIcon(ctx, it, x + 12, y + 26, 56); txt(it.name, x + 40, y + 96, 11, RART[it.r], 'center', false, null, 74); }
    else { ctx.globalAlpha = 0.35; ART.icon(ctx, sl === 'weapon' ? 'sword' : sl === 'armor' ? 'heart' : 'mana', x + 40, y + 54, 34); ctx.globalAlpha = 1; txt('비어 있음', x + 40, y + 96, 11, '#b49a80', 'center', false); }
  });
  const gx = 330, gy = 64;
  ART.panel(ctx, gx, gy, 614, 340, 'cream');
  txt(`가방 ${S.inv.length}/28`, gx + 22, gy + 22, 14, '#8a6142', 'left', false);
  const cs = 74;
  for (let i = 0; i < 28; i++) {
    const x = gx + 24 + (i % 7) * (cs + 9), y = gy + 38 + Math.floor(i / 7) * (cs - 2), it = S.inv[i];
    RR(x, y, cs, cs - 8, 10); ctx.fillStyle = 'rgba(141,90,43,.13)'; ctx.fill();
    if (it) {
      ui.push({ x, y, w: cs, h: cs - 8, tap: () => { mapSel = { from: 'inv', id: it.id }; }, key: 'inv' + it.id });
      ART.itemIcon(ctx, it, x + 7, y + 2, cs - 12);
      if (mapSel && mapSel.from === 'inv' && mapSel.id === it.id) { ctx.strokeStyle = '#e65100'; ctx.lineWidth = 4; RR(x - 1, y - 1, cs + 2, cs - 6, 11); ctx.stroke(); }
    }
  }
  const dy = 414; ART.panel(ctx, gx, dy, 614, 116, 'cream');
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
    ctx.save(); RR(x + 3, y + 3, 88, h - 6, 10); ctx.clip(); ctx.globalAlpha = unl ? 1 : 0.35; ART.drawFit(ctx, unitSprite(i), unl ? 'i' + (Math.floor(G.time * 2.4 + i) % 3) : 'ib', x + 47, y + h / 2 + 2, 84, h - 14); ctx.restore(); if (promoted(i)) { RR(x + 6, y + 6, 40, 16, 8); ctx.fillStyle = '#ffcf3a'; ctx.fill(); txt('2차', x + 26, y + 14.5, 11, '#5a3412', 'center', false); }
    txt(d.nick, x + 94, y + 20, 16, '#4e342e', 'left', false);
    txt(d.breed, x + 94, y + 39, 11, '#a0652a', 'left', false, null, 74);
    if (TRAITS[d.id] && formHover === i) {}
    RR(x + 94, y + 48, 70, 18, 9); ctx.fillStyle = d.col; ctx.fill(); txt(d.role, x + 129, y + 57.5, 11, '#fff', 'center', false, null, 64);
    if (unl) {
      const k = 1 + 0.15 * (S.up['u' + i] || 0);
      txt(`체력 ${Math.round(d.hp * k)}`, x + 94, y + 80, 11, '#5a3412', 'left', false);
      txt(d.type === 'healer' ? `치유 ${Math.round(d.heal * k)}` : `공격 ${Math.round(d.atk * k)}`, x + 94, y + 96, 11, '#5a3412', 'left', false);
      ART.icon(ctx, 'bone', x + 100, y + 114, 14); txt(`${d.cost} · ${d.cd}초`, x + 110, y + 114.5, 11, '#5a3412', 'left', false, null, 58);
      if (inD) { RR(x + w - 40, y - 8, 46, 20, 10); ctx.fillStyle = '#e65100'; ctx.fill(); txt(`${S.deck.indexOf(i) + 1}번`, x + w - 17, y + 2, 11, '#fff', 'center', false); }
      ui.push({ x, y, w, h, key: 'form' + i, tap: () => { formHover = i;
        if (inD) { if (S.deck.length > 1) { S.deck = S.deck.filter(v => v !== i); SFX.click(); } else formMsg = { s: '최소 1마리는 출전해야 해요', t: 1.5 }; }
        else if (S.deck.length < 5) { S.deck.push(i); SFX.woof(); } else formMsg = { s: '부대가 가득 찼어요 · 먼저 한 마리를 빼 주세요', t: 1.6 };
        save(); } });
    } else { ART.icon(ctx, 'lock', x + 128, y + 92, 22); txt(`스테이지 ${d.unlock - 1} 클리어`, x + 94, y + 118, 10.5, '#8a6142', 'left', false, null, 74); }
  });
  ART.panel(ctx, 14, 400, W - 28, 130, 'dark');
  txt('출전 부대', 40, 420, 14, '#ffcf5a', 'left');
  for (let k = 0; k < 5; k++) { const i = S.deck[k], x = 40 + k * 112, y = 434; RR(x, y, 100, 84, 12); ctx.fillStyle = 'rgba(255,240,210,.12)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,207,90,.6)'; ctx.lineWidth = 1.5; ctx.stroke();
    if (i != null) { ART.drawFit(ctx, unitSprite(i), 'i0', x + 50, y + 40, 70, 56); txt(UNITS[i].nick, x + 50, y + 78, 11, '#fff3c4', 'center'); } else txt('비어 있음', x + 50, y + 44, 11, 'rgba(255,240,210,.5)', 'center', false); txt(`${k + 1}`, x + 10, y + 12, 11, '#ffcf5a', 'center', false); }
  const sel = UNITS[S.deck[S.deck.length - 1]];
  const fd = UNITS[formHover >= 0 ? formHover : S.deck[0]];
  if (fd) { ART.draw(ctx, fd.id, 'i' + (Math.floor(G.time * 2.4) % 3), 640, 512, 0.95, false, 0); txt(`${fd.nick} · ${fd.breed}`, 690, 424, 14, '#ffcf5a', 'left'); txt('성격: ' + TRAITS[fd.id].q, 690, 448, 12, '#fff3d6', 'left', false); txt(fd.desc || ({ melee: '빠른 근접 돌격', tank: '튼튼하게 앞을 막음', ranged: '멀리서 화살 공격', magic: '범위 마법 공격', elite: '강력한 근접 검술' })[fd.type], 690, 470, 12, '#fff3d6', 'left', false); txt('말버릇: "' + TRAITS[fd.id].v.join('", "') + '"', 690, 492, 12, '#ffe0a6', 'left', false); }
  if (formMsg) { formMsg.t -= G.dt || 0.016; ctx.globalAlpha = Math.min(1, formMsg.t * 3); ART.panel(ctx, W / 2 - 180, 228, 360, 36, 'dark'); txt(formMsg.s, W / 2, 246, 14, '#ffcf6b', 'center', false); ctx.globalAlpha = 1; if (formMsg.t <= 0) formMsg = null; }
}
let formMsg = null, formHover = -1;
function wrapTxt(s, x, y, maxW, size, col, lh) {
  ctx.font = `${size}px ${FONT}`; let line = '', yy = y;
  for (const para of s.split('\n')) { line = ''; for (const ch of para) { if (ctx.measureText(line + ch).width > maxW) { txt(line, x, yy, size, col, 'left', false); yy += lh; line = ch.trim() ? ch : ''; } else line += ch; } txt(line, x, yy, size, col, 'left', false); yy += lh * 1.25; }
}
function drawCodex() {
  const L = window.LORE || [], cats = ['세계', '지역', '기사단', '악당', '별뼈', '역사', '색깔조각', '컷신'];
  ART.panel(ctx, 14, 62, 300, 468, 'cream');
  cats.forEach((c, i) => btn(24 + (i % 4) * 70, 74 + Math.floor(i / 4) * 42, 66, 36, c, () => { codexCat = i; codexSel = null; codexPage = 0; }, { bg: codexCat === i ? '#ffc93c' : i >= 6 ? '#d8b0e8' : '#c9a983', size: c.length > 3 ? 11.5 : 14, key: 'cc' + i }));
  if (codexCat === 6) return drawCodexShards();
  if (codexCat === 7) return drawCodexReplay();
  const list = L.filter(e => e.cat === cats[codexCat]), got = L.filter(e => S.cleared >= (e.at || 0)).length;
  txt(`기록 ${got} / ${L.length}`, 164, 168, 12, '#a0652a', 'center', false);
  const PER = 10, pages = Math.max(1, Math.ceil(list.length / PER)); if (codexPage >= pages) codexPage = pages - 1;
  if (pages > 1) { btn(26, 488, 60, 32, '◀', () => { codexPage = (codexPage + pages - 1) % pages; }, { bg: '#c9a983', size: 15, key: 'cxp' }); btn(242, 488, 60, 32, '▶', () => { codexPage = (codexPage + 1) % pages; }, { bg: '#c9a983', size: 15, key: 'cxn' }); txt(`${codexPage + 1} / ${pages}`, 164, 504, 13, '#7a5230', 'center', false); }
  list.slice(codexPage * PER, codexPage * PER + PER).forEach((e, i) => {
    const y = 182 + i * 30, open = S.cleared >= (e.at || 0);
    RR(26, y, 276, 26, 8); ctx.fillStyle = codexSel === e ? '#ffe082' : 'rgba(141,90,43,.1)'; ctx.fill();
    txt(open ? e.title : `??? (스테이지 ${e.at} 클리어)`, 38, y + 13.5, 13, open ? '#4e342e' : '#a89580', 'left', false, null, 252);
    if (open) ui.push({ x: 26, y, w: 276, h: 26, key: 'cx' + i, tap: () => { codexSel = e; } });
  });
  ART.panel(ctx, 326, 62, 620, 468, 'cream');
  const e = codexSel && S.cleared >= (codexSel.at || 0) ? codexSel : null;
  if (!e) {
    bigText('멍멍기사 세계 도감', 636, 120, 30, '#fff3c4', '#ffb300');
    wrapTxt('뼈다귀 왕국과 그림자 늪에 얽힌 모든 기록이 여기 모입니다.\n스테이지를 깰수록 새 기록이 열려요. 왼쪽 목록에서 읽고 싶은 기록을 눌러 보세요.', 360, 180, 550, 15, '#6b4426', 24);
    ['hero', 'u0', 'u1', 'u2', 'u3', 'u4', 'u5', 'u6', 'u7', 'u8', 'u9'].forEach((k, i) => ART.draw(ctx, k === 'hero' ? heroFace() : k, 'i' + (Math.floor(G.time * 2.4 + i) % 3), 372 + i * 52, 480, 0.72, false, 0));
    return;
  }
  txt(`[${e.cat}]`, 352, 92, 13, '#a0652a', 'left', false);
  txt(e.title, 352, 116, 22, '#4e342e', 'left', false, null, 560);
  if (e.art) { ctx.save(); RR(770, 80, 160, 150, 14); ctx.fillStyle = ART.lgr(ctx, '#fff8e6', '#f2d6a0', 0, 80, 0, 230); ctx.fill(); ctx.clip(); ART.drawFit(ctx, e.art === 'hero' ? heroFace() : e.art, 'i' + (Math.floor(G.time * 2.4) % 3), 850, 157, 150, 140, { flip: !!e.flip }); ctx.restore(); ctx.strokeStyle = '#c69355'; ctx.lineWidth = 2; RR(770, 80, 160, 150, 14); ctx.stroke(); }
  wrapTxt(nameSub(e.text), 352, 150, e.art ? 400 : 570, 14.5, '#5a3412', 23);
}
// v1.6 도감: 색깔 조각 7칸
function drawCodexShards() {
  const c = shardsOwned();
  txt(`색깔 조각 ${c} / 7`, 164, 168, 13, '#a0652a', 'center', false);
  SHARDS.forEach((q, k) => { const y = 182 + k * 42, on = S.cleared >= q.at; RR(26, y, 276, 36, 10); ctx.fillStyle = on ? 'rgba(255,240,200,.9)' : 'rgba(141,90,43,.1)'; ctx.fill();
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
}
// v1.6 도감: 본 컷신 다시 보기 (장 선택 → 장면 선택)
function drawCodexReplay() {
  const PER = 10, chs = Math.min(CHN, Math.floor(S.cleared / CHL) + 1), pages = Math.max(1, Math.ceil(chs / PER)); if (codexPage >= pages) codexPage = pages - 1;
  txt('본 컷신을 다시 볼 수 있어요', 164, 168, 12, '#a0652a', 'center', false);
  if (pages > 1) { btn(26, 488, 60, 32, '◀', () => { codexPage = (codexPage + pages - 1) % pages; }, { bg: '#c9a983', size: 15, key: 'rpp' }); btn(242, 488, 60, 32, '▶', () => { codexPage = (codexPage + 1) % pages; }, { bg: '#c9a983', size: 15, key: 'rpn' }); txt(`${codexPage + 1} / ${pages}`, 164, 504, 13, '#8a6142', 'center', false); }
  const sel = codexSel && codexSel.rep != null ? codexSel.rep : Math.min(chs - 1, Math.floor(S.cleared / CHL));
  for (let i = 0; i < PER; i++) { const z = codexPage * PER + i; if (z >= chs) break; const y = 182 + i * 30;
    RR(26, y, 276, 26, 8); ctx.fillStyle = sel === z ? '#ffe082' : 'rgba(141,90,43,.1)'; ctx.fill(); txt(CH_NAMES[z], 38, y + 13.5, 13, '#4e342e', 'left', false, null, 252);
    ui.push({ x: 26, y, w: 276, h: 26, key: 'rp' + i, tap: () => { codexSel = { rep: z }; } }); }
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
  btn(W / 2 - 290, 210, 280, 56, '♪ 주제가 「달려라 멍멍기사」', () => go(() => { titleReady = true; setScene('title'); }), { bg: '#ffb84d', size: 17 });
  btn(W / 2 + 10, 210, 280, 56, '스토리 다시 보기 (도감)', () => { mapTab = 4; codexCat = 7; codexSel = null; codexPage = 0; }, { bg: '#9b6bff', size: 17, key: 'replay' });
  btn(W / 2 - 290, 280, 280, 50, '🐉 기사 · 용 꾸미기', () => openCreator(() => setScene('map')), { bg: '#5cc96b', size: 17, key: 'custom' });
  btn(W / 2 + 10, 280, 280, 50, resetArm ? '정말 초기화? 한 번 더!' : '저장 데이터 초기화', () => { if (!resetArm) { resetArm = 1; return; } S = defSave(); save(); resetArm = 0; mapTab = 0; }, { bg: resetArm ? '#ef5350' : '#c9a983', size: resetArm ? 16 : 18 });
  const lines = [`멍멍기사 디펜스  v${VERSION}`, '모든 캐릭터·그림·음악·효과음은 이 게임을 위해 코드로 직접 만든 오리지널입니다.', '주제가 「달려라 멍멍기사」 작사·작곡: 멍멍기사 디펜스 제작팀 (오리지널)', '저장 데이터는 이 기기에만 보관되며 외부로 전송되지 않습니다.', '조작: ◀▶ 이동 · 카드 소환 · 스킬 버튼 · (PC: ←→ / 1~5 / Q W E · F 미르의 불꽃 / R / P)', '제작: 덕환사마'];
  lines.forEach((s, i) => txt(s, W / 2, 352 + i * 26, i ? 13 : 16, i ? '#8a6142' : '#5a3412', 'center', false));
  ART.draw(ctx, 'u0', 'i' + (Math.floor(G.time * 2.4) % 3), 190, 500, 0.9, false, 0);
  ART.draw(ctx, 'u2', 'i' + (Math.floor(G.time * 2.4 + 1) % 3), 770, 500, 0.9, true, 0);
}

/* ---------------- 루프 ---------------- */
function update(dt) {
  G.time += dt; G.dt = dt;
  for (const k in pressT) { pressT[k] -= dt; if (pressT[k] <= 0) delete pressT[k]; }
  if (scene === 'story' && ST) { const au = S.autoSt || 0; ST.t += dt * (au === 2 ? 1.7 : 1); if (ST.titleT > 0) ST.titleT -= dt;
    else if (au && !trans && !ST.done && ST.t * TYPE_SPD >= [...storyLine()[2]].length) { ST.autoT = (ST.autoT || 0) + dt; if (ST.autoT > (au === 2 ? 0.7 : 1.3) + [...storyLine()[2]].length * (au === 2 ? 0.02 : 0.035)) storyNext(); } }
  if (trans) { trans.t += dt; if (!trans.done && trans.t >= trans.dur / 2) { trans.done = true; trans.fn(); } if (trans.t >= trans.dur) trans = null; }
  if (scene === 'battle' && B) { if (B.intro) updIntro(dt); else if (B.slowmo > 0 && !B.over) { B.slowmo -= dt; updBattle(dt * 0.3); } else if (B.freeze > 0) { B.freeze -= dt; updFx(dt * 0.3); } else { const steps = B.paused ? 1 : B.speed; for (let i = 0; i < steps; i++) updBattle(dt); } if (B.over) B.over.t += dt; }
}
function drawTrans() {
  if (!trans) return;
  const p = trans.t / trans.dur, k = p < 0.5 ? p * 2 : (1 - p) * 2, r = (1 - ease(k)) * 620;
  ctx.save(); ctx.fillStyle = '#2a1a10'; ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.arc(W / 2, H / 2, Math.max(0.1, r), 0, TAU, true); ctx.fill();
  if (k > 0.85) ART.paw(ctx, W / 2, H / 2, 4, 'rgba(255,207,90,.8)');
  ctx.restore();
}
function draw() {
  ctx.setTransform(scl * dpr, 0, 0, scl * dpr, 0, 0);
  ui = []; sceneTap = null; dragH = null;
  if (scene === 'title') drawTitle(); else if (scene === 'create' && CR) drawCreate(); else if (scene === 'map') drawMap(); else if (scene === 'story' && ST) drawStory(); else if (B) drawBattle();
  drawTrans();
}
let last = performance.now();
function loop(now) { const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now; try { update(dt); draw(); } catch (err) { console.error(err); if (!window.__mmkErr) { window.__mmkErr = 1; window.mmkFail && window.mmkFail('게임 루프: ' + (err && err.stack || err)); } } requestAnimationFrame(loop); }
requestAnimationFrame(loop);

try {
  const CapApp = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
  if (CapApp) CapApp.addListener('backButton', () => {
    if (scene === 'battle' && B && !B.over) B.paused = !B.paused;
    else if (scene === 'battle') go(() => setScene('map'));
    else if (scene === 'map') { if (popup) popup = 0; else if (mapTab !== 0) mapTab = 0; else go(() => setScene('title')); }
    else if (scene === 'create') creatorDone();
    else CapApp.exitApp();
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
const ATT_REW = [{ coins: 500 }, { pot: 1 }, { coins: 1000 }, { item: 2 }, { coins: 2000 }, { pot: 3 }, { item: 3, coins: 3000, pet: 1 }];
const rewText = r => [r.coins ? `${r.coins}코인` : '', r.pot ? `물약 ${r.pot}` : '', r.item ? `${RAR[r.item]} 장비` : '', r.pet ? '친구 펫' : ''].filter(Boolean).join(' + ');
function giveRew(r) {
  if (r.coins) S.coins += r.coins;
  if (r.pot) S.potions = Math.min(9, S.potions + r.pot);
  if (r.pet) { const pp = givePet(); if (pp) PETP = { t: 0, got: pp }; }
  if (r.item) { const it = makeItem(Math.max(10, S.cleared), r.item); if (S.inv.length < 28) S.inv.push(it); else S.coins += sellPrice(it); }
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
  B.si = Object.assign({}, B.si, { name: `무한의 탑 ${f}층${boss ? ' · 수호자' : ''}`, m: B.si.m * (1 + f * 0.035), am: B.si.am * (1 + f * 0.025), boss, bossKey: boss ? BOSSES[ch] : null, mid: f % 5 === 0 && !boss, midKey: f % 5 === 0 && !boss ? MIDS[ch] : null });
  if (boss) ART.warm([BOSSES[ch]]);
}
function specialEnd(win) {
  if (B.trial != null) { if (win && !third(B.trial)) { S.third = S.third || {}; S.third[B.trial] = 1; THIRD_POP = { i: B.trial, t: 0 }; } }
  if (B.tower != null) {
    ensureDaily();
    if (win) { const f = B.tower; S.tower.best = Math.max(S.tower.best, f); S.tower.cur = f + 1; B.towerRew = 200 + f * 70; S.coins += B.towerRew; if (f % 5 === 0) S.potions = Math.min(9, S.potions + 1); }
  }
  TRIAL = null; TOWER = null;
}
/* ---- 3차 직업 고유 기술 (10초마다) ---- */
function thirdSkill(u) {
  const i = UNITS.indexOf(u.def), T = THIRD[i]; if (!T) return;
  const foes = B.enemies.filter(e => !e.dead && !(e.hide > 0) && e.x - u.x > -40 && e.x - u.x < Math.max(u.range, 120) + 160).sort((a, b) => a.x - b.x);
  const allies = B.allies.filter(a => !a.dead).concat(B.hero.dead ? [] : [B.hero]);
  const heal = p => allies.forEach(a => { if (Math.abs(a.x - u.x) < (p > 0.28 ? 9999 : 220)) { a.hp = Math.min(a.max, a.hp + a.max * p); burst(a.x, GY - 40, '#a5f5b0', 4, 80, true); } });
  if (i !== 1 && i !== 6 && !foes.length) { u.tcd = 1; return; }
  addText(u.x, GY - 110, T.sk + '!', T.col, 18, true); fx('pillar', { x: u.x, y: GY + 4, dur: 0.6, col: T.col }); u.atkAnim = 0.4;
  const A = u.atk;
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
const PETS = [
  { id: 'chick', n: '병아리 삐삐', d: '멀리 있는 아이템도 주워 와요', R: 340, spd: 300 },
  { id: 'hamster', n: '햄스터 볼볼', d: '아이템 줍기 + 코인 15% 더', R: 220, spd: 240, coin: 1.15 },
  { id: 'turtle', n: '아기 거북 느릿', d: '천천히 줍기 + 기사 체력 회복', R: 180, spd: 150, heal: 0.004 },
];
let PETP = null;
const petDef = () => PETS.find(p => p.id === S.pet);
function givePet() { S.pets = S.pets || {}; const nx = PETS.find(p => !S.pets[p.id]); if (!nx) return null; S.pets[nx.id] = 1; if (!S.pet) S.pet = nx.id; save(); return nx; }
function updPet(dt) {
  const P = petDef(); if (!P || !B || B.over) return; const h = B.hero;
  if (!B.pet) B.pet = { x: h.x - 40, y: 18, t: 0, moving: false, face: 1, tgt: null };
  const pt = B.pet; pt.t += dt;
  if (P.heal && !h.dead) h.hp = Math.min(h.max, h.hp + h.max * P.heal * dt);
  if (!pt.tgt || pt.tgt.got || pt.tgt.life <= 0) pt.tgt = B.drops.filter(d => d.type !== 'coin' && !d.got && d.ground && Math.abs(d.x - h.x) < P.R).sort((a, b) => Math.abs(a.x - pt.x) - Math.abs(b.x - pt.x))[0] || null;
  const tx = pt.tgt ? pt.tgt.x : h.x - 38 * (h.face || 1), dx = tx - pt.x;
  pt.moving = Math.abs(dx) > 6; if (pt.moving) { pt.face = dx > 0 ? 1 : -1; pt.x += Math.sign(dx) * Math.min(Math.abs(dx), P.spd * dt); }
  if (pt.tgt && Math.abs(pt.tgt.x - pt.x) < 14) { pickup(pt.tgt); addText(pt.x, GY - 50, { chick: '삐약!', hamster: '찍찍!', turtle: '느릿!' }[P.id], '#fff3a0', 14); pt.tgt = null; }
}
function drawPet() {
  const P = petDef(); if (!P || !B || !B.pet) return; const pt = B.pet;
  ctx.fillStyle = 'rgba(30,15,0,.18)'; ART.E(ctx, pt.x, GY + pt.y + 2, 12, 3); ctx.fill();
  ART.draw(ctx, 'pet_' + P.id, pt.moving ? 'w' + (Math.floor(pt.t * 16) % 10) : 'i' + (Math.floor(pt.t * 2.4) % 3), pt.x, GY + pt.y, 1, pt.face < 0, 0);
}
function drawPetPanel() {
  const Pp = PETP; Pp.t += G.dt || 0.016; ui = []; dragH = null; S.pets = S.pets || {};
  ctx.save(); ctx.globalAlpha = Math.min(1, Pp.t * 4); ctx.fillStyle = 'rgba(15,6,0,.7)'; ctx.fillRect(0, 0, W, H); ctx.restore();
  ART.panel(ctx, 80, 50, W - 160, 440, 'cream');
  bigText('친구 펫', W / 2, 88, 30, '#fff6b0', '#ff9800');
  txt('7일 출석을 채울 때마다 새 친구가 와요 · 펫은 전투에서 기사를 따라다니며 아이템을 주워 와요', W / 2, 120, 13, '#8a6142', 'center', false, null, 760);
  PETS.forEach((P, k) => {
    const x = 110 + k * 250, y = 140, own = !!S.pets[P.id], on = S.pet === P.id;
    RR(x, y, 230, 270, 16); ctx.fillStyle = on ? 'rgba(255,201,60,.35)' : 'rgba(141,90,43,.1)'; ctx.fill(); ctx.lineWidth = on ? 4 : 2; ctx.strokeStyle = on ? '#e65100' : '#c69355'; RR(x, y, 230, 270, 16); ctx.stroke();
    ctx.save(); ctx.globalAlpha = own ? 1 : 0.35; ART.draw(ctx, 'pet_' + P.id, own ? 'i' + (Math.floor(G.time * 2.4) % 3) : 'ib', x + 115, y + 140, 3.2, false, 0); ctx.restore();
    txt(P.n, x + 115, y + 170, 18, '#4e342e', 'center', false); txt(P.d, x + 115, y + 198, 14, '#8a6142', 'center', false, null, 210);
    btn(x + 35, y + 218, 160, 40, !own ? '출석 7일 보상' : on ? '데려가는 중' : '데려가기', () => { if (own) { S.pet = on ? null : P.id; save(); } }, { bg: !own ? '#b5a99b' : on ? '#ffc93c' : '#5cc96b', disabled: !own, size: 14, key: 'pet' + k });
  });
  btn(W / 2 - 90, 428, 180, 48, '완료', () => { PETP = null; }, { bg: '#5cc96b', size: 20, key: 'petdone' });
}
/* ---- 미르 꾸미기 ---- */
const MIR_PAT = ['무늬 없음', '보랏빛 무늬', '별빛 무늬', '황금 무늬'], MIR_FLAME = ['주황 불꽃', '보라 불꽃', '파랑 불꽃'];
const FLAME_PAL = [null, { a: '#f6e0ff', b: '#c070ff', c: '#7a2ad0', h: '#b050ff' }, { a: '#e0f6ff', b: '#40b0ff', c: '#1a50d0', h: '#40a0ff' }];
function mirSkin() { return S.mir || { pat: 0, flame: 0 }; }
function drawMirPanel() {
  const P = MIRP; P.t += G.dt || 0.016; ui = []; dragH = null; const m = mirSkin();
  ctx.save(); ctx.globalAlpha = Math.min(1, P.t * 4); ctx.fillStyle = 'rgba(15,6,0,.7)'; ctx.fillRect(0, 0, W, H); ctx.restore();
  ART.panel(ctx, 60, 40, W - 120, 460, 'cream');
  bigText('미르 꾸미기', W / 2, 78, 30, '#fff6b0', '#ff9800');
  ctx.save(); RR(84, 110, 380, 300, 18); ctx.fillStyle = ART.lgr(ctx, '#bfe6ff', '#fff3d6', 0, 110, 0, 410); ctx.fill(); ctx.clip();
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5; ctx.drawImage(ART.softDot('#fff6c2'), 120, 120, 300, 280); ctx.restore();
  if (!mounted()) txt('지금은 도보 기사예요 (설정 → 기사·용 꾸미기에서 용 타기)', 274, 396, 12, '#a0652a', 'center', false, null, 360);
  ART.draw(ctx, heroType(), (G.time % 2.4) < 0.35 ? 'a2' : 'i' + (Math.floor(G.time * 2.4) % 3), 270, 370, mounted() ? mountK() * 1.25 : 2.4, false, 0);
  txt('날개 무늬', 500, 128, 17, '#5a3412', 'left', false);
  MIR_PAT.forEach((n, k) => btn(500 + (k % 2) * 172, 144 + Math.floor(k / 2) * 52, 164, 44, n, () => { S.mir = Object.assign(mirSkin(), { pat: k }); S.custom = Object.assign({}, S.custom || {}, { pat: k }); ART.clearHeroCache(heroType()); save(); }, { bg: m.pat === k ? '#ffc93c' : '#c9a983', size: 15, key: 'mp' + k }));
  txt('불꽃 색', 500, 268, 17, '#5a3412', 'left', false);
  MIR_FLAME.forEach((n, k) => btn(500 + k * 116, 284, 108, 44, n, () => { S.mir = Object.assign(mirSkin(), { flame: k }); save(); }, { bg: m.flame === k ? '#ffc93c' : '#c9a983', size: 14, key: 'mf' + k }));
  const fc = [['#fff6c0', '#ffc030', '#e0301a'], ['#f6e0ff', '#c070ff', '#7a2ad0'], ['#e0f6ff', '#40b0ff', '#1a50d0']][m.flame];
  const gr = ctx.createLinearGradient(500, 0, 840, 0); gr.addColorStop(0, fc[0]); gr.addColorStop(0.5, fc[1]); gr.addColorStop(1, ART.rgba(fc[2], 0)); ctx.fillStyle = gr; RR(500, 344, 340, 22, 11); ctx.fill();
  txt('무늬는 시즌 5·6의 보랏빛 무늬 이야기에서 이어져요', 670, 386, 12, '#a0652a', 'center', false, null, 340);
  btn(W / 2 - 90, 432, 180, 50, '완료', () => { MIRP = null; }, { bg: '#5cc96b', size: 20, key: 'mirdone' });
}
/* ---- 3차 직업 축하 ---- */
function drawThirdPop() {
  const P = THIRD_POP; P.t += G.dt || 0.016; ui = []; dragH = null; const i = P.i, T = THIRD[i];
  ctx.save(); ctx.globalAlpha = Math.min(1, P.t * 3); ctx.fillStyle = 'rgba(15,6,0,.74)'; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.translate(W / 2, 250); ctx.rotate(G.time * 0.4); ctx.globalCompositeOperation = 'lighter'; for (let k = 0; k < 14; k++) { ctx.rotate(TAU / 14); ctx.fillStyle = ART.rgba(T.col, 0.09); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-30, -400); ctx.lineTo(30, -400); ctx.closePath(); ctx.fill(); } ctx.restore();
  ART.panel(ctx, W / 2 - 270, 50, 540, 440, 'cream');
  bigText('3차 직업 각성!', W / 2, 96, 32, '#fff6b0', '#ff6f00');
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(ART.softDot(T.col), W / 2 - 110, 120, 220, 230); ctx.restore();
  ART.draw(ctx, UNITS[i].id + 't', 'c_happy', W / 2, 340, 2.3, false, 0);
  bigText(T.n, W / 2, 376, 25, '#fff3c4', '#e65100'); txt(`고유 기술 「${T.sk}」 · ${T.d}`, W / 2, 410, 14, '#5a3412', 'center', false, null, 500);
  ctx.restore();
  if (P.t > 0.8) btn(W / 2 - 100, 430, 200, 48, '최고야!', () => { THIRD_POP = null; }, { bg: '#5cc96b', size: 20, key: 'thirdok' });
}
/* ---- 오늘의 할 일 (일일 미션 · 7일 출석 · 무한의 탑) ---- */
function drawDaily() {
  ensureDaily(); const P = DAILY; P.t += G.dt || 0.016; ui = []; dragH = null; const D = S.daily, today = todayKey();
  ctx.save(); ctx.globalAlpha = Math.min(1, P.t * 4); ctx.fillStyle = 'rgba(15,6,0,.7)'; ctx.fillRect(0, 0, W, H); ctx.restore();
  ART.panel(ctx, 24, 24, W - 48, 492, 'cream');
  bigText('오늘의 할 일', W / 2, 58, 28, '#fff6b0', '#ff9800');
  btn(W - 96, 34, 56, 40, 'X', () => { DAILY = null; }, { bg: '#a99a8a', size: 18, key: 'dclose' });
  // 일일 미션
  txt('일일 미션 (매일 자정 초기화)', 48, 96, 16, '#5a3412', 'left', false);
  MISSIONS_D.forEach((m, k) => {
    const y = 110 + k * 62, v = Math.min(m.goal, D[m.f]), done = v >= m.goal, got = D.got[k], r = m.rew();
    RR(44, y, 450, 54, 12); ctx.fillStyle = got ? 'rgba(92,201,107,.18)' : 'rgba(141,90,43,.1)'; ctx.fill();
    txt(m.n, 60, y + 17, 15, '#4e342e', 'left', false); txt('보상: ' + rewText(r), 60, y + 39, 12, '#a0652a', 'left', false, null, 240);
    RR(300, y + 32, 90, 10, 5); ctx.fillStyle = 'rgba(141,90,43,.2)'; ctx.fill(); RR(300, y + 32, 90 * v / m.goal, 10, 5); ctx.fillStyle = '#ffb300'; ctx.fill(); txt(`${v}/${m.goal}`, 345, y + 18, 12, '#5a3412', 'center', false);
    btn(402, y + 8, 84, 38, got ? '받음' : '받기', () => { if (done && !got) { D.got[k] = 1; giveRew(r); } }, { bg: done && !got ? '#5cc96b' : '#b5a99b', disabled: !done || got, size: 15, key: 'dm' + k });
  });
  // 7일 출석
  const canAtt = S.att.last !== today, day = S.att.n % 7;
  txt('7일 출석 보상', 48, 312, 16, '#5a3412', 'left', false);
  ATT_REW.forEach((r, k) => {
    const x = 44 + k * 64, y = 326, past = k < day;
    RR(x, y, 58, 74, 10); ctx.fillStyle = past ? 'rgba(92,201,107,.25)' : k === day && canAtt ? 'rgba(255,201,60,.45)' : 'rgba(141,90,43,.1)'; ctx.fill();
    txt(`${k + 1}일`, x + 29, y + 13, 12, '#5a3412', 'center', false);
    ART.icon(ctx, r.item ? 'star' : r.pot ? 'potion' : 'coin', x + 29, y + 38, 24);
    txt(r.pet ? '펫+전설' : r.item ? RAR[r.item] : r.pot ? `물약${r.pot}` : `${r.coins}`, x + 29, y + 62, 10, '#8a6142', 'center', false, null, 54);
    if (past) txt('✔', x + 46, y + 14, 14, '#2e7d32', 'center', false);
  });
  btn(150, 410, 220, 46, canAtt ? `${day + 1}일째 출석하기` : '오늘 출석 완료', () => { if (S.att.last !== todayKey()) { const r = ATT_REW[S.att.n % 7]; S.att.last = todayKey(); S.att.n++; giveRew(r); } }, { bg: canAtt ? '#ff8a3d' : '#b5a99b', disabled: !canAtt, size: 16, key: 'att' });
  // 무한의 탑
  const T = S.tower; RR(512, 92, 400, 400, 14); ctx.fillStyle = ART.lgr(ctx, '#3a2a6a', '#1e1438', 0, 92, 0, 492); ctx.fill();
  for (let k = 0; k < 40; k++) { ctx.globalAlpha = 0.3 + Math.sin(G.time * 2 + k) * 0.3; ctx.fillStyle = '#fff'; ctx.fillRect(520 + (k * 97) % 380, 100 + (k * 53) % 380, 2, 2); } ctx.globalAlpha = 1;
  bigText('무한의 탑', 712, 124, 26, '#fff3c4', '#b48cff');
  txt('층마다 강해져요 · 10층마다 수호자 · 매주 월요일 1층부터', 712, 154, 12, '#d8c8ff', 'center', false, null, 380);
  // 탑 그림
  for (let k = 0; k < 6; k++) { const y = 380 - k * 34, w = 120 - k * 10; RR(612 - w / 2, y, w, 30, 6); ctx.fillStyle = k + 1 <= (T.cur - 1) % 6 + 0 ? '#c8a0ff' : '#5a4a9a'; ctx.fill(); ctx.fillStyle = '#ffe08a'; ctx.fillRect(608 - w / 2 + w / 2 - 2, y + 9, 8, 12); }
  ART.star(ctx, 612, 160 + 22, 10, '#fff3a0');
  txt(`이번 주 도전: ${T.cur}층`, 812, 200, 17, '#ffffff', 'center', '#1e1438');
  txt(`이번 주 최고: ${T.best}층`, 812, 228, 14, '#ffe08a', 'center', false);
  const rank = T.hist.concat(T.best ? [{ w: T.w, best: T.best, now: true }] : []).sort((a, b) => b.best - a.best).slice(0, 5);
  txt('내 기록 순위 (이 기기)', 812, 262, 13, '#d8c8ff', 'center', false);
  rank.forEach((r, k) => txt(`${k + 1}위  ${r.best}층${r.now ? ' (이번 주)' : ''}`, 812, 286 + k * 22, 13, r.now ? '#fff3a0' : '#ffffff', 'center', false));
  if (!rank.length) txt('아직 기록이 없어요', 812, 290, 13, '#ffffff', 'center', false);
  btn(722, 418, 180, 54, `${T.cur}층 도전!`, () => { if (S.cleared < 10) return; DAILY = null; go(() => startTower()); }, { bg: S.cleared >= 10 ? '#9c6bff' : '#b5a99b', disabled: S.cleared < 10, size: 18, key: 'tower' });
  if (S.cleared < 10) txt('스테이지 10 클리어 후 열려요', 812, 404, 12, '#ffb3b3', 'center', false);
}

window.__MMK = { mapTiles: () => { mapBg = null; buildMapBg(); MAP_SCENES = null; return mapBg.map(t => { const s = performance.now(); buildMapTile(t); return Math.round(performance.now() - s); }); }, givePet, enhance, openPet: () => { PETP = { t: 0 }; }, startTrial, startTower, get DAILY() { return DAILY; }, openDaily: () => { DAILY = { t: 0 }; }, openMir: () => { MIRP = { t: 0 }; }, NODES, makeItem, endBattle, get S() { return S; }, get B() { return B; }, get scene() { return scene; }, startBattle, spawnAlly, useSkill, inp, stageInfo,
  setScene: s => { titleReady = true; setScene(s); }, skipStory: () => storyEnd(), playStory, get ST() { return ST; }, setTab: t => { mapTab = t; popup = 0; }, setPopup: n => { popup = n; }, select: s => { mapSel = s; }, get ui() { return ui; }, tapCard: i => tapCard(i), version: VERSION };
})();
