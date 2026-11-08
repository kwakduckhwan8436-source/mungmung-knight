/* =========================================================
   멍멍기사 디펜스 — 오디오 엔진 v0.2
   - 외부 음원 0개: 모든 음악·효과음을 WebAudio로 실시간 합성
   - 「멍멍기사의 노래」 오리지널 작곡·작사
   - 보컬 신스: 한글 음절의 모음(포먼트)·초성(자음 소리)을 분석해 "노래하듯" 발음
   ========================================================= */
'use strict';
window.AUD = (function () {
  let AC = null, master, musicG, sfxG, echo, noiseBuf, gtr;
  const st = { music: true, sfx: true };

  /* ---------- 「멍멍기사의 노래」 ----------
     단위: 8분음표. [음, 길이, 가사, 'b'=멍멍 효과음, 줄번호]  r = 쉼표 */
  const LYRICS = [
    '반짝반짝 투구 쓰고',
    '꼬리 흔들 출발해',
    '뼈다귀 성 지키러 (멍멍!)',
    '멍멍기사 나간다',
    '멍! 멍! 멍멍기사',
    '용감한 우리 기사',
    '친구들아 모여라 (멍멍!)',
    '함께라면 무섭지 않아',
    '멍! 멍! 멍멍기사',
    '오늘도 승리다! 멍! 멍! 멍!',
    '구름 너머 바다 건너',
    '별뼈 찾아 달려가',
    '무서운 밤이 와도 (멍멍!)',
    '친구들이 함께야',
    '두근두근 심장 소리',
    '꼬리 끝에 불꽃 켜고',
    '하나 둘 셋 다 함께',
    '크게 외쳐 보자!',
  ];
  const INTRO = [['C5', 1], ['G4', 1], ['E4', 1], ['G4', 1], ['C5', 1], ['D5', 1], ['E5', 2],
    ['D5', 1], ['C5', 1], ['A4', 1], ['G4', 1], ['F4', 2], ['G4', 2]];
  const MEL = [
    // 1절
    ['E4', 1, '반', 0, 0], ['E4', 1, '짝', 0, 0], ['G4', 1, '반', 0, 0], ['G4', 1, '짝', 0, 0], ['A4', 1, '투', 0, 0], ['A4', 1, '구', 0, 0], ['G4', 2, '쓰', 0, 0], ['E4', 4, '고', 0, 0], ['r', 4],
    ['F4', 1, '꼬', 0, 1], ['F4', 1, '리', 0, 1], ['A4', 1, '흔', 0, 1], ['A4', 1, '들', 0, 1], ['G4', 2, '출', 0, 1], ['F4', 2, '발', 0, 1], ['E4', 4, '해', 0, 1], ['r', 4],
    ['E4', 1, '뼈', 0, 2], ['E4', 1, '다', 0, 2], ['G4', 1, '귀', 0, 2], ['C5', 1, '성', 0, 2], ['B4', 1, '지', 0, 2], ['A4', 1, '키', 0, 2], ['G4', 2, '러', 0, 2], ['G4', 2, '멍', 'b', 2], ['G4', 2, '멍', 'b', 2], ['r', 4],
    ['G4', 1, '멍', 0, 3], ['G4', 1, '멍', 0, 3], ['A4', 1, '기', 0, 3], ['B4', 1, '사', 0, 3], ['C5', 2, '나', 0, 3], ['D5', 1, '간', 0, 3], ['C5', 5, '다', 0, 3], ['r', 4],
    // 후렴
    ['C5', 2, '멍', 'b', 4], ['C5', 2, '멍', 'b', 4], ['A4', 1, '멍', 0, 4], ['A4', 1, '멍', 0, 4], ['G4', 1, '기', 0, 4], ['E4', 1, '사', 0, 4],
    ['F4', 1, '용', 0, 5], ['F4', 1, '감', 0, 5], ['A4', 1, '한', 0, 5], ['C5', 1, '우', 0, 5], ['B4', 1, '리', 0, 5], ['A4', 1, '기', 0, 5], ['G4', 2, '사', 0, 5],
    ['E4', 1, '친', 0, 6], ['E4', 1, '구', 0, 6], ['G4', 1, '들', 0, 6], ['G4', 1, '아', 0, 6], ['A4', 1, '모', 0, 6], ['G4', 1, '여', 0, 6], ['E4', 2, '라', 0, 6], ['G4', 2, '멍', 'b', 6], ['G4', 2, '멍', 'b', 6], ['r', 4],
    ['F4', 1, '함', 0, 7], ['F4', 1, '께', 0, 7], ['F4', 1, '라', 0, 7], ['E4', 1, '면', 0, 7], ['D4', 1, '무', 0, 7], ['D4', 1, '섭', 0, 7], ['E4', 1, '지', 0, 7], ['F4', 1, '않', 0, 7], ['G4', 4, '아', 0, 7], ['r', 4],
    ['C5', 2, '멍', 'b', 8], ['C5', 2, '멍', 'b', 8], ['A4', 1, '멍', 0, 8], ['A4', 1, '멍', 0, 8], ['G4', 1, '기', 0, 8], ['E4', 1, '사', 0, 8],
    ['F4', 1, '오', 0, 9], ['A4', 1, '늘', 0, 9], ['C5', 1, '도', 0, 9], ['r', 1], ['D5', 2, '승', 0, 9], ['E5', 2, '리', 0, 9],
    ['C5', 6, '다', 0, 9], ['r', 2],
    ['C5', 2, '멍', 'b', 9], ['G4', 2, '멍', 'b', 9], ['C5', 2, '멍', 'b', 9], ['r', 2],
  ];
  // 마디(8분음표 8개)마다 코드
  const CHORDS = ['C', 'G', /*1절*/ 'C', 'C', 'F', 'C', 'Am', 'G', 'G', 'C', /*후렴*/ 'C', 'F', 'C', 'G', 'Dm', 'G', 'C', 'F', 'C', 'C'];
  const CH = { D: [2, 6, 9], D7: [2, 6, 12], A: [9, 13, 16], Bb: [10, 14, 17], B: [11, 15, 18], Gm: [7, 10, 14], Eb: [3, 7, 10], E: [4, 8, 11], G7: [7, 11, 17], Em: [4, 7, 11], C: [0, 4, 7], F: [5, 9, 12], G: [7, 11, 14], Am: [9, 12, 16], Dm: [2, 5, 9], Cm: [0, 3, 7], Fm: [5, 8, 12], Ab: [8, 12, 15], Bm: [11, 14, 18], 'F#m': [6, 9, 13] };
  const MINOR_CH = { C: 'Cm', F: 'Fm', G: 'G', Am: 'Ab', Dm: 'Fm' };
  // v1.2 장별 전투곡 대확장: 코드 진행에 맞춰 멜로디를 자동 작곡 (씨앗값이 같으면 항상 같은 곡)
  const NN = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const nm = m => NN[m % 12] + (Math.floor(m / 12) - 1);
  function genMel(bars, key, minor, seed, calm) {
    let sd = seed; const R = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
    const sc = minor ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11], pool = [];
    for (let m = 62; m <= 88; m++) if (sc.includes(((m - key) % 12 + 12) % 12)) pool.push(m);
    const RH = calm ? [[4, 4], [2, 2, 4], [3, 1, 4], [2, 2, 2, 2], [6, 2]] : [[2, 2, 2, 2], [2, 1, 1, 2, 2], [1, 1, 2, 2, 2], [3, 1, 2, 2], [2, 2, 4], [1, 1, 1, 1, 2, 2]];
    const rhs = []; for (let i = 0; i < 4; i++) rhs.push(RH[Math.floor(R() * RH.length)]);
    let ci = pool.indexOf(pool.reduce((b, m) => Math.abs(m - 76) < Math.abs(b - 76) ? m : b, pool[0])), dir = 1; const out = [];
    bars.forEach((c, bi) => {
      const tones = (CH[c] || CH.C).map(x => x % 12), last = bi === bars.length - 1;
      const rh = last ? [2, 2, 4] : rhs[bi % 4];
      rh.forEach((d, j) => {
        if (j === 0 || (last && j === rh.length - 1)) { let best = ci, bd = 99; for (let k = Math.max(0, ci - 4); k <= Math.min(pool.length - 1, ci + 4); k++) if (tones.includes(pool[k] % 12) && Math.abs(k - ci) < bd) { bd = Math.abs(k - ci); best = k; } if (last && j === rh.length - 1) { for (let k = Math.max(0, ci - 5); k <= Math.min(pool.length - 1, ci + 5); k++) if (pool[k] % 12 === tones[0] && Math.abs(k - ci) < 6) { best = k; break; } } ci = best; }
        else { if (R() < 0.25) dir = -dir; if (ci < 4) dir = 1; if (ci > pool.length - 5) dir = -1; ci += dir * (R() < 0.75 ? 1 : 2); }
        ci = Math.max(0, Math.min(pool.length - 1, ci)); out.push([nm(pool[ci]), d]);
      });
    });
    return out;
  }
  const WB = (bars, key, minor, seed, calm) => { const b2 = bars.concat(bars); return { bars, mel: genMel(b2, key, minor, seed, calm) }; };
  const SONGS = {
    theme:  { bpm: 116, lead: 'voice', drums: 'pop', bark: true },
    map:    { bpm: 96, lead: 'bell', drums: 'light', bark: false },
    battle: { bpm: 146, lead: 'square', drums: 'battle', bark: true },
    boss:   { bpm: 136, lead: 'saw', drums: 'battle', bark: false, minor: true },
    anime:  { bpm: 152, anime: true },
    march:  { bpm: 144, march: true, vocal: true, lead: 'brass', drums: 'march' },
    puppy:  { bpm: 132, march: true, vocal: true, lead: 'marimba', drums: 'puppy', puppy: true, swing: 0.3 },
    mapp:   { bpm: 112, march: true, lead: 'marimba', drums: 'light', puppy: true, swing: 0.3 },
    mapm:   { bpm: 108, march: true, lead: 'bell', drums: 'light', noIntro: false },
    battlem:{ bpm: 158, march: true, lead: 'brass', drums: 'battle' },
    bossm:  { bpm: 140, march: true, lead: 'saw', drums: 'battle', minor: true },
    arabian:  { world: true, bpm: 132, drums: 'darbuka', lead: 'oud', lead2: 'flute', drone: 'D',
      bars: ['D', 'Gm', 'D', 'D', 'Gm', 'D', 'Gm', 'D'],
      mel: [['D5', 2], ['Eb5', 1], ['F#5', 1], ['G5', 2], ['F#5', 1], ['Eb5', 1], ['D5', 4], ['r', 2], ['A4', 1], ['Bb4', 1], ['C5', 2], ['Bb4', 1], ['A4', 1], ['Bb4', 2], ['A4', 1], ['G4', 1], ['F#4', 2], ['G4', 1], ['A4', 1], ['D4', 4],
        ['G4', 1], ['A4', 1], ['Bb4', 1], ['C5', 1], ['D5', 2], ['Eb5', 2], ['F#5', 1], ['G5', 1], ['F#5', 1], ['Eb5', 1], ['D5', 4], ['Bb4', 1], ['C5', 1], ['D5', 1], ['Eb5', 1], ['D5', 2], ['C5', 1], ['Bb4', 1], ['A4', 2], ['G4', 1], ['F#4', 1], ['D4', 4]] },
    hawaiian: { world: true, bpm: 104, swing: 0.28, drums: 'hula', lead: 'slide', lead2: 'uke',
      bars: ['G', 'C', 'D7', 'G', 'Em', 'C', 'D', 'G'],
      mel: [['B4', 2], ['D5', 2], ['G5', 3], ['E5', 1], ['E5', 4], ['D5', 2], ['C5', 2], ['A4', 2], ['C5', 2], ['F#5', 3], ['E5', 1], ['D5', 8],
        ['G4', 2], ['B4', 2], ['E5', 3], ['D5', 1], ['C5', 2], ['E5', 2], ['G5', 4], ['F#5', 2], ['E5', 2], ['D5', 2], ['A4', 2], ['G4', 8]] },
    orchestra: { world: true, bpm: 120, drums: 'orch', lead: 'strings', lead2: 'brass',
      bars: ['Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'C', 'A'],
      mel: [['D5', 3], ['A4', 1], ['D5', 2], ['F5', 2], ['E5', 3], ['D5', 1], ['C5', 2], ['D5', 2], ['A5', 4], ['G5', 2], ['F5', 2], ['E5', 6], ['C5', 2],
        ['D5', 3], ['E5', 1], ['F5', 2], ['G5', 2], ['A5', 3], ['Bb5', 1], ['A5', 2], ['F5', 2], ['G5', 3], ['F5', 1], ['E5', 2], ['C5', 2], ['C#5', 4], ['E5', 4]] },
    musicbox: { world: true, bpm: 118, drums: 'tick', lead: 'musicbox', lead2: 'musicbox2',
      bars: ['C', 'G', 'Am', 'F', 'C', 'G', 'F', 'G'],
      mel: [['E5', 1], ['G5', 1], ['C6', 2], ['B5', 1], ['G5', 1], ['E5', 2], ['D5', 1], ['G5', 1], ['B5', 2], ['A5', 1], ['G5', 1], ['D5', 2], ['C5', 1], ['E5', 1], ['A5', 2], ['G5', 1], ['E5', 1], ['C5', 2], ['F5', 1], ['A5', 1], ['C6', 2], ['B5', 1], ['A5', 1], ['G5', 2],
        ['E5', 2], ['G5', 2], ['C6', 2], ['E6', 2], ['D6', 2], ['B5', 2], ['G5', 2], ['D5', 2], ['C5', 1], ['D5', 1], ['E5', 1], ['F5', 1], ['A5', 2], ['G5', 2], ['B4', 2], ['D5', 2], ['G5', 4]] },
    dream: { world: true, bpm: 92, swing: 0.22, drums: 'hula', lead: 'musicbox', lead2: 'flute',
      bars: ['F', 'Dm', 'Bb', 'C', 'F', 'Am', 'Bb', 'C'],
      mel: [['A5', 2], ['C6', 1], ['A5', 1], ['F5', 4], ['D5', 2], ['F5', 1], ['A5', 1], ['G5', 4], ['Bb5', 2], ['A5', 1], ['G5', 1], ['F5', 2], ['D5', 2], ['E5', 6], ['C5', 2],
        ['F5', 2], ['A5', 2], ['C6', 3], ['A5', 1], ['E5', 2], ['G5', 2], ['C6', 4], ['D6', 2], ['C6', 1], ['Bb5', 1], ['A5', 2], ['F5', 2], ['G5', 3], ['A5', 1], ['F5', 4]] },
    meadow: Object.assign({ world: true, bpm: 128, drums: 'pop2', lead: 'marimba', lead2: 'flute' }, WB(['G', 'C', 'D', 'G', 'Em', 'C', 'D', 'G'], 7, false, 11)),
    forest: Object.assign({ world: true, bpm: 116, swing: 0.25, drums: 'tick', lead: 'flute', lead2: 'uke' }, WB(['Em', 'C', 'G', 'D', 'Em', 'C', 'D', 'Em'], 4, true, 23)),
    snow: Object.assign({ world: true, bpm: 120, drums: 'tick', lead: 'musicbox', lead2: 'bell' }, WB(['F', 'Dm', 'Bb', 'C', 'F', 'Am', 'Bb', 'C'], 5, false, 37, true)),
    volcano: Object.assign({ world: true, bpm: 152, drums: 'orch', lead: 'brass', lead2: 'strings' }, WB(['Dm', 'Bb', 'C', 'A', 'Dm', 'Gm', 'A', 'Dm'], 2, true, 41)),
    sky: Object.assign({ world: true, bpm: 112, swing: 0.2, drums: 'hula', lead: 'flute', lead2: 'musicbox2' }, WB(['C', 'Am', 'F', 'G', 'C', 'Em', 'F', 'G'], 0, false, 53, true)),
    crystal: Object.assign({ world: true, bpm: 124, drums: 'tick', lead: 'bell', lead2: 'musicbox2' }, WB(['Am', 'F', 'C', 'G', 'Am', 'F', 'G', 'E'], 9, true, 61)),
    swamp: Object.assign({ world: true, bpm: 118, drums: 'darbuka', lead: 'oud', lead2: 'marimba', drone: 'E' }, WB(['Em', 'C', 'B', 'Em', 'Am', 'C', 'B', 'Em'], 4, true, 71)),
    castle: Object.assign({ world: true, bpm: 140, drums: 'orch', lead: 'brass', lead2: 'strings' }, WB(['C', 'G', 'Am', 'F', 'C', 'G', 'F', 'G'], 0, false, 83)),
    aurora: Object.assign({ world: true, bpm: 108, drums: 'tick', lead: 'strings', lead2: 'musicbox' }, WB(['D', 'A', 'Bb', 'F', 'D', 'G', 'A', 'D'], 2, false, 89, true)),
    fossil: Object.assign({ world: true, bpm: 132, drums: 'darbuka', lead: 'marimba', lead2: 'oud' }, WB(['Am', 'Dm', 'E', 'Am', 'F', 'Dm', 'E', 'Am'], 9, true, 97)),
    starlight: Object.assign({ world: true, bpm: 126, drums: 'orch', lead: 'musicbox2', lead2: 'strings' }, WB(['Eb', 'Cm', 'Ab', 'Bb', 'Eb', 'Gm', 'Ab', 'Bb'], 3, false, 103)),
    finale: Object.assign({ world: true, bpm: 146, drums: 'orch', lead: 'brass', lead2: 'strings' }, WB(['C', 'Am', 'F', 'G', 'C', 'Em', 'F', 'G'], 0, false, 113)),
    bossw1: Object.assign({ world: true, bpm: 150, drums: 'orch', lead: 'strings', lead2: 'brass' }, WB(['Cm', 'Ab', 'Bb', 'G', 'Cm', 'Fm', 'G', 'Cm'], 0, true, 127)),
    bossw2: Object.assign({ world: true, bpm: 156, drums: 'darbuka', lead: 'brass', lead2: 'oud' }, WB(['Dm', 'Bb', 'Gm', 'A', 'Dm', 'Bb', 'A', 'Dm'], 2, true, 131)),
    bossw3: Object.assign({ world: true, bpm: 160, drums: 'orch', lead: 'brass', lead2: 'strings' }, WB(['Em', 'C', 'D', 'B', 'Em', 'Am', 'B', 'Em'], 4, true, 137)),
    catcity: Object.assign({ world: true, bpm: 124, swing: 0.15, drums: 'tick', lead: 'musicbox', lead2: 'marimba' }, WB(['C', 'Am', 'F', 'G', 'C', 'Am', 'Dm', 'G'], 0, false, 151)),
    feathers: Object.assign({ world: true, bpm: 118, swing: 0.25, drums: 'hula', lead: 'flute', lead2: 'uke' }, WB(['D', 'G', 'A', 'D', 'Bm', 'G', 'A', 'D'], 2, false, 163, true)),
    burrowsong: Object.assign({ world: true, bpm: 136, drums: 'darbuka', lead: 'marimba', lead2: 'brass' }, WB(['Am', 'G', 'F', 'E', 'Am', 'G', 'F', 'E'], 9, true, 173)),
    namesea: Object.assign({ world: true, bpm: 104, drums: 'orch', lead: 'strings', lead2: 'musicbox2' }, WB(['Em', 'C', 'G', 'D', 'Em', 'C', 'D', 'Em'], 4, true, 181, true)),
    bossw4: Object.assign({ world: true, bpm: 162, drums: 'orch', lead: 'brass', lead2: 'strings' }, WB(['Am', 'F', 'G', 'E', 'Am', 'Dm', 'E', 'Am'], 9, true, 191)),
    rainbowsong: Object.assign({ world: true, bpm: 122, swing: 0.12, drums: 'hula', lead: 'musicbox2', lead2: 'flute' }, WB(['G', 'D', 'Em', 'C', 'G', 'D', 'C', 'D'], 7, false, 199)),
    quietpeak: Object.assign({ world: true, bpm: 104, drums: 'march', lead: 'bell', lead2: 'flute' }, WB(['D', 'A', 'Bm', 'G', 'D', 'A', 'G', 'A'], 2, false, 223)),
    echocave: Object.assign({ world: true, bpm: 112, swing: 0.08, drums: 'cave', lead: 'marimba', lead2: 'voice' }, WB(['Em', 'C', 'G', 'D', 'Em', 'C', 'D', 'Em'], 4, true, 227, true)),
    graytown: Object.assign({ world: true, bpm: 98, drums: 'tick', lead: 'musicbox', lead2: 'strings' }, WB(['Am', 'F', 'C', 'G', 'Am', 'F', 'G', 'Am'], 9, true, 211, true)),
    mapw: Object.assign({ world: true, bpm: 100, swing: 0.2, drums: 'hula', lead: 'marimba', lead2: 'musicbox' }, WB(['F', 'C', 'Dm', 'Bb', 'F', 'C', 'Bb', 'C'], 5, false, 149, true)),
    cave: { world: true, bpm: 126, drums: 'cave', lead: 'marimba', lead2: 'bell',
      bars: ['Em', 'C', 'D', 'B', 'Em', 'C', 'D', 'B'],
      mel: [['E4', 1], ['G4', 1], ['B4', 2], ['A4', 1], ['G4', 1], ['F#4', 2], ['E4', 1], ['G4', 1], ['C5', 2], ['B4', 1], ['A4', 1], ['G4', 2], ['F#4', 1], ['A4', 1], ['D5', 2], ['C5', 1], ['B4', 1], ['A4', 2], ['B4', 2], ['A4', 1], ['G4', 1], ['F#4', 4],
        ['G4', 1], ['B4', 1], ['E5', 2], ['D5', 1], ['B4', 1], ['G4', 2], ['A4', 1], ['C5', 1], ['E5', 2], ['D5', 1], ['C5', 1], ['A4', 2], ['F#4', 1], ['A4', 1], ['D5', 2], ['F#5', 2], ['E5', 2], ['D#5', 2], ['B4', 4]] },
  };
  /* ---------- v0.5 새 주제가 「달려라 멍멍기사」 (클래식 TV 만화 행진곡풍 오리지널) ----------
     [음, 8분음표 길이, 가사, 'b'=진짜 멍멍 소리] — 한 줄 = 2마디(8분음표 16개) */
  const M_LYR = [
    '아침 해가 반짝 떠오르면', '꼬리 깃발 높이 휘날리며', '뼈다귀 검을 번쩍 들고', '오늘도 달려간다 (멍멍!)',
    '어두운 그림자 몰려와도', '우리는 절대 물러서지 않아',
    '멍멍멍! 멍멍기사!', '정의의 기사 멍멍기사!', '친구와 함께라면 무섭지 않아', '달려라 달려라 멍멍기사!', '용감무쌍 멍! 멍! 멍멍기사!',
  ];
  const ML = (line, arr) => arr.map(([n, d, syl, b]) => [n, d, syl || '', b || 0, line]);
  const M_VERSE = [].concat(
    ML(0, [['G4', 1, '아'], ['G4', 1, '침'], ['C5', 2, '해'], ['B4', 1, '가'], ['A4', 1, '반'], ['G4', 2, '짝'], ['E4', 1, '떠'], ['F4', 1, '오'], ['G4', 2, '르'], ['C5', 4, '면']]),
    ML(1, [['A4', 1, '꼬'], ['A4', 1, '리'], ['D5', 2, '깃'], ['C5', 1, '발'], ['B4', 1, '높'], ['A4', 2, '이'], ['F4', 1, '휘'], ['G4', 1, '날'], ['A4', 2, '리'], ['G4', 4, '며']]),
    ML(2, [['E5', 1, '뼈'], ['D5', 1, '다'], ['C5', 2, '귀'], ['C5', 1, '검'], ['B4', 1, '을'], ['A4', 1, '번'], ['B4', 1, '쩍'], ['C5', 4, '들'], ['G4', 4, '고']]),
    ML(3, [['F4', 1, '오'], ['F4', 1, '늘'], ['A4', 2, '도'], ['G4', 1, '달'], ['G4', 1, '려'], ['E4', 1, '간'], ['D4', 1, '다'], ['G4', 2, '멍', 'b'], ['G4', 2, '멍', 'b'], ['r', 4]]));
  const M_PRE = [].concat(
    ML(4, [['A4', 1, '어'], ['A4', 1, '두'], ['A4', 2, '운'], ['G4', 1, '그'], ['A4', 1, '림'], ['C5', 2, '자'], ['B4', 1, '몰'], ['A4', 1, '려'], ['G#4', 2, '와'], ['E4', 4, '도']]),
    ML(5, [['C5', 1, '우'], ['C5', 1, '리'], ['C5', 1, '는'], ['D5', 1, '절'], ['E5', 2, '대'], ['D5', 1, '물'], ['C5', 1, '러'], ['B4', 1, '서'], ['C5', 1, '지'], ['B4', 2, '않'], ['G4', 4, '아']]));
  const M_CHORUS = [].concat(
    ML(6, [['G4', 1, '멍'], ['G4', 1, '멍'], ['C5', 2, '멍'], ['E5', 1, '멍'], ['E5', 1, '멍'], ['D5', 2, '기'], ['C5', 4, '사'], ['r', 4]]),
    ML(7, [['A4', 1, '정'], ['A4', 1, '의'], ['A4', 1, '의'], ['G4', 1, '기'], ['A4', 2, '사'], ['C5', 1, '멍'], ['C5', 1, '멍'], ['D5', 2, '기'], ['E5', 6, '사']]),
    ML(8, [['F4', 1, '친'], ['G4', 1, '구'], ['A4', 2, '와'], ['C5', 1, '함'], ['C5', 1, '께'], ['A4', 1, '라'], ['C5', 1, '면'], ['D5', 1, '무'], ['C5', 1, '섭'], ['B4', 1, '지'], ['A4', 1, '않'], ['G4', 4, '아']]),
    ML(9, [['E5', 1, '달'], ['D5', 1, '려'], ['C5', 2, '라'], ['F5', 1, '달'], ['E5', 1, '려'], ['D5', 2, '라'], ['C5', 1, '멍'], ['C5', 1, '멍'], ['D5', 2, '기'], ['B4', 4, '사']]),
    ML(10, [['G4', 1, '용'], ['A4', 1, '감'], ['B4', 1, '무'], ['C5', 1, '쌍'], ['G4', 2, '멍', 'b'], ['G4', 2, '멍', 'b'], ['E5', 1, '멍'], ['E5', 1, '멍'], ['D5', 2, '기'], ['C5', 4, '사']]));
  const M_FAN = [['G4', 1], ['C5', 1], ['E5', 1], ['G5', 3], ['E5', 1], ['G5', 1], ['A5', 2], ['G5', 2], ['E5', 2], ['C5', 2], ['D5', 1], ['D5', 1], ['E5', 1], ['F5', 1], ['G5', 2], ['E5', 2], ['D5', 2], ['G4', 2, 'b'], ['G4', 2, 'b'], ['B4', 2]];
  const M_SECT = [
    { k: 'fan', bars: ['C', 'F', 'G', 'G'], crash: true },
    { k: 'verse', mel: M_VERSE, bars: ['C', 'C', 'Dm', 'G', 'Am', 'C', 'F', 'G'], crash: true },
    { k: 'pre', mel: M_PRE, bars: ['Am', 'E', 'F', 'G'], roll: true },
    { k: 'chorus', mel: M_CHORUS, bars: ['C', 'C', 'F', 'C', 'F', 'G', 'Am', 'G7', 'G', 'C'], crash: true, full: true },
    { k: 'brk', mel: null, bars: ['F', 'G'], roll: true },
    { k: 'chorus', mel: M_CHORUS, bars: ['C', 'C', 'F', 'C', 'F', 'G', 'Am', 'G7', 'G', 'C'], crash: true, full: true, tr: 1 },
    { k: 'end', bars: ['C', 'C'], tr: 1, crash: true },
  ];
  function brass(t, f, dur, out, v) {
    const g = AC.createGain(), lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 2;
    lp.frequency.setValueAtTime(700, t); lp.frequency.linearRampToValueAtTime(3000, t + 0.05); lp.frequency.linearRampToValueAtTime(1900, t + Math.max(0.08, dur));
    lp.connect(g); g.connect(out); g.connect(echo);
    env(g, t, 0.025, v || 0.11, 0.1, 0.75, t + Math.max(0.05, dur * 0.88), 0.07);
    const o1 = osc('sawtooth', f, t, t + dur + 0.12, lp, -7), o2 = osc('sawtooth', f, t, t + dur + 0.12, lp, 7), o3 = osc('square', f / 2, t, t + dur + 0.12, lp);
    o3.detune.value = 3; vibrato([o1, o2], f, t + 0.18, t + dur + 0.12, 0.007);
  }
  function marimba(t, f, dur, out, v) {
    const g = AC.createGain(); g.connect(out); g.connect(echo); env(g, t, 0.003, v || 0.16, Math.min(0.35, dur * 0.8), 0.01, t + Math.min(0.4, dur), 0.08);
    osc('sine', f, t, t + 0.6, g); const g2 = AC.createGain(); g2.gain.value = 0.35; g2.connect(g); osc('sine', f * 4, t, t + 0.12, g2); osc('triangle', f * 2, t, t + 0.3, g2);
  }
  function uke(t, freqs, out, v) { freqs.forEach((f, k) => { const g = AC.createGain(), lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600; lp.connect(g); g.connect(out); env(g, t + k * 0.012, 0.002, v || 0.05, 0.18, 0.01, t + k * 0.012 + 0.2, 0.05); osc('sawtooth', f, t + k * 0.012, t + 0.4, lp); osc('triangle', f * 2, t + k * 0.012, t + 0.3, lp); }); }
  function clap(t, out, v) { for (let k = 0; k < 3; k++) { const g = AC.createGain(); g.connect(out); env(g, t + k * 0.012, 0.001, (v || 0.22) * (k === 2 ? 1 : 0.6), 0.05, 0.01, t + k * 0.012 + 0.06, 0.04); noise(t + k * 0.012, 0.1, g, 'bandpass', 1400, 1.2); } }
  function shaker(t, out, v) { const g = AC.createGain(); g.connect(out); env(g, t, 0.01, v || 0.05, 0.04, 0.01, t + 0.05, 0.02); noise(t, 0.08, g, 'highpass', 6000, 0.7); }
  function squeak(t, out) { const g = AC.createGain(); g.connect(out); env(g, t, 0.005, 0.12, 0.1, 0.3, t + 0.12, 0.05); const o = osc('sine', 900, t, t + 0.2, g); o.frequency.exponentialRampToValueAtTime(1900, t + 0.08); o.frequency.exponentialRampToValueAtTime(1300, t + 0.16); }
  function snareRoll(t, dur, out) { const n = Math.floor(dur / 0.055); for (let i = 0; i < n; i++) snare(t + i * 0.055, out, 0.12 + 0.3 * i / n); }
  /* ---------- v0.8 장마다 다른 전투곡 (아라비안 · 하와이안 · 오케스트라 · 광산) ---------- */
  function oud(t, f, dur, v) { const g = AC.createGain(), bp = AC.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f * 2.2; bp.Q.value = 1.4; bp.connect(g); g.connect(musicG); g.connect(echo); env(g, t, 0.002, v || 0.16, Math.min(0.5, dur), 0.05, t + Math.min(0.6, dur), 0.08); osc('sawtooth', f, t, t + 0.8, bp); osc('triangle', f * 2, t, t + 0.3, bp, 4); }
  function flute(t, f, dur, v) { const g = AC.createGain(); g.connect(musicG); g.connect(echo); env(g, t, 0.06, v || 0.09, 0.1, 0.8, t + dur * 0.92, 0.08); const o = osc('sine', f, t, t + dur + 0.15, g); vibrato([o], f, t + 0.15, t + dur + 0.15, 0.012); const gb = AC.createGain(); gb.connect(musicG); env(gb, t, 0.02, (v || 0.09) * 0.25, 0.08, 0.2, t + dur * 0.8, 0.05); noise(t, dur, gb, 'bandpass', f * 2, 3); }
  function slideGtr(t, f, dur, v) { const g = AC.createGain(), lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400; lp.connect(g); g.connect(musicG); g.connect(echo); env(g, t, 0.01, v || 0.1, 0.25, 0.5, t + dur * 0.95, 0.12); const o1 = osc('triangle', f * 0.94, t, t + dur + 0.2, lp), o2 = osc('sine', f * 2 * 0.94, t, t + dur + 0.2, lp); [o1, o2].forEach((o, k) => o.frequency.exponentialRampToValueAtTime(f * (k + 1), t + 0.09)); vibrato([o1, o2], f, t + 0.2, t + dur + 0.2, 0.01); }
  function strings(t, freqs, dur, v) { const g = AC.createGain(), lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600; lp.connect(g); g.connect(musicG); g.connect(echo); env(g, t, Math.min(0.12, dur * 0.3), v || 0.05, 0.2, 0.85, t + dur * 0.95, 0.15); freqs.forEach(f => { [-9, 0, 9].forEach(d => osc('sawtooth', f, t, t + dur + 0.3, lp, d)); }); }
  function timp(t, f, v) { const g = AC.createGain(); g.connect(musicG); env(g, t, 0.003, v || 0.6, 0.6, 0.01, t + 0.7, 0.2); const o = osc('sine', f, t, t + 0.9, g); o.frequency.exponentialRampToValueAtTime(f * 0.8, t + 0.5); const g2 = AC.createGain(); g2.connect(musicG); env(g2, t, 0.002, (v || 0.6) * 0.3, 0.08, 0.01, t + 0.1, 0.03); noise(t, 0.12, g2, 'lowpass', 400, 0.7); }
  function dum(t, v) { const g = AC.createGain(); g.connect(musicG); env(g, t, 0.002, v || 0.55, 0.2, 0.01, t + 0.22, 0.05); const o = osc('sine', 110, t, t + 0.3, g); o.frequency.exponentialRampToValueAtTime(70, t + 0.2); }
  function tek(t, v) { const g = AC.createGain(); g.connect(musicG); env(g, t, 0.001, v || 0.2, 0.04, 0.01, t + 0.05, 0.02); noise(t, 0.06, g, 'bandpass', 3200, 2.5); }
  function mbox(t, f, dur, v) { const g = AC.createGain(); g.connect(musicG); g.connect(echo); env(g, t, 0.002, v || 0.12, 0.6, 0.01, t + Math.min(1.2, dur + 0.5), 0.2); osc('sine', f, t, t + 1.6, g); const g2 = AC.createGain(); g2.connect(musicG); env(g2, t, 0.001, (v || 0.12) * 0.35, 0.15, 0.01, t + 0.25, 0.05); osc('sine', f * 3.01, t, t + 0.4, g2); osc('triangle', f * 2, t, t + 0.3, g2); }
  function wood(t, f, v) { const g = AC.createGain(); g.connect(musicG); env(g, t, 0.001, v || 0.18, 0.04, 0.01, t + 0.06, 0.02); osc('sine', f, t, t + 0.1, g); noise(t, 0.03, g, 'bandpass', f * 2, 4); }
  function anvil(t, v) { const g = AC.createGain(); g.connect(musicG); g.connect(echo); env(g, t, 0.001, v || 0.07, 0.35, 0.01, t + 0.4, 0.1); osc('sine', 2480, t, t + 0.5, g); osc('sine', 3710, t, t + 0.3, g); osc('triangle', 1240, t, t + 0.2, g); }
  function buildWorld(name) {
    const S = SONGS[name], e8 = 60 / S.bpm / 2, bar = 8 * e8, ev = [];
    const swg = tt => { if (!S.swing) return tt; const pos = Math.round(tt / e8); return Math.abs(tt / e8 - pos) < 0.01 && pos % 2 ? tt + e8 * S.swing : tt; };
    const melLen = S.mel.reduce((a, x) => a + x[1], 0) * e8, passes = 2;
    for (let p = 0; p < passes; p++) {
      const s0 = p * melLen, ld = p ? S.lead2 : S.lead;
      let tt = s0;
      for (const [n, d] of S.mel) {
        const dd = d * e8, at0 = swg(tt);
        if (n !== 'r') { const f = hz(midi(n));
          if (ld === 'oud') ev.push({ t: at0, fn: at => { oud(at, f, dd, 0.15); if (d >= 2) oud(at + e8 * 0.5, f, dd * 0.5, 0.07); } });
          else if (ld === 'flute') ev.push({ t: at0, fn: at => { flute(at, f * 2, dd, 0.08); oud(at, f, dd, 0.06); } });
          else if (ld === 'slide') ev.push({ t: at0, fn: at => slideGtr(at, f, dd, 0.11) });
          else if (ld === 'uke') ev.push({ t: at0, fn: at => { uke(at, [f, f * 1.5], musicG, 0.06); marimba(at, f * 2, dd, musicG, 0.07); } });
          else if (ld === 'strings') ev.push({ t: at0, fn: at => strings(at, [f], dd, 0.05) });
          else if (ld === 'brass') ev.push({ t: at0, fn: at => { brass(at, f, dd, musicG, 0.1); brass(at, f / 2, dd, musicG, 0.05); strings(at, [f * 2], dd, 0.025); } });
          else if (ld === 'musicbox') ev.push({ t: at0, fn: at => { mbox(at, f, dd, 0.17); if (d >= 2) mbox(at, f / 2, dd, 0.06); } });
          else if (ld === 'musicbox2') ev.push({ t: at0, fn: at => { mbox(at, f * 2, dd, 0.1); mbox(at, f, dd, 0.12); strings(at, [f / 2], dd, 0.02); } });
          else if (ld === 'marimba') ev.push({ t: at0, fn: at => { marimba(at, f, dd, musicG, 0.17); marimba(at, f / 2, dd, musicG, 0.08); } });
          else ev.push({ t: at0, fn: at => { lead(at, f * 2, dd, musicG, 'bell'); marimba(at, f, dd, musicG, 0.1); } }); }
        tt += dd;
      }
      const nb = Math.round(melLen / bar);
      for (let bi = 0; bi < nb; bi++) {
        const c = S.bars[bi % S.bars.length], tones = CH[c] || CH.C, root = 36 + tones[0], b0 = s0 + bi * bar, last = bi === nb - 1;
        if (bi === 0) ev.push({ t: b0, fn: at => crash(at, musicG, p ? 0.14 : 0.1) });
        if (S.drums === 'darbuka') {
          ev.push({ t: b0, fn: at => bass(at, hz(38), bar * 0.95, musicG, 'triangle') });
          [0, 3, 4, 6].forEach(i => ev.push({ t: b0 + i * e8, fn: at => dum(at, i === 0 ? 0.6 : 0.4) }));
          [2, 5, 7].forEach(i => ev.push({ t: b0 + i * e8, fn: at => tek(at, 0.18) }));
          for (let i = 0; i < 8; i++) ev.push({ t: b0 + i * e8 + e8 / 2, fn: at => tek(at, 0.05) });
          [1, 3, 5, 7].forEach(i => { const fs = tones.map(x => hz(48 + x)); ev.push({ t: b0 + i * e8, fn: at => fs.forEach(f => oud(at, f, e8, 0.035)) }); });
          if (p && bi % 2 === 0) ev.push({ t: b0, fn: at => strings(at, tones.map(x => hz(60 + x)), bar * 0.95, 0.018) });
        } else if (S.drums === 'hula') {
          [[0, 0], [4, 7]].forEach(([i, iv]) => ev.push({ t: b0 + i * e8, fn: at => bass(at, hz(root + iv), e8 * 3, musicG, 'triangle') }));
          [0, 2, 3, 5, 6, 7].forEach(i => { const fs = tones.map(x => hz(60 + x)); ev.push({ t: swg(b0 + i * e8), fn: at => uke(at, i % 2 ? fs.slice().reverse() : fs, musicG, i % 2 ? 0.03 : 0.045) }); });
          for (let i = 0; i < 8; i++) { ev.push({ t: swg(b0 + i * e8), fn: at => shaker(at, musicG, i % 2 ? 0.03 : 0.05) }); if (i === 0 || i === 3) ev.push({ t: b0 + i * e8, fn: at => tom(at, 130, musicG) }); if (i === 2 || i === 6) ev.push({ t: b0 + i * e8, fn: at => clap(at, musicG, 0.1) }); }
          if (last) ev.push({ t: b0 + 6 * e8, fn: at => slideGtr(at, hz(79), e8 * 2, 0.06) });
        } else if (S.drums === 'orch') {
          ev.push({ t: b0, fn: at => strings(at, tones.map(x => hz(48 + x)), bar * 0.98, 0.03) });
          for (let i = 0; i < 8; i++) { const f = hz(root + 12 + (i % 4 === 2 ? 7 : 0)); ev.push({ t: b0 + i * e8, fn: at => { const g = AC.createGain(); g.connect(musicG); env(g, at, 0.005, 0.07, 0.08, 0.01, at + 0.1, 0.03); osc('sawtooth', f, at, at + 0.15, g); } }); }
          ev.push({ t: b0, fn: at => timp(at, hz(root), 0.65) }); ev.push({ t: b0 + 4 * e8, fn: at => timp(at, hz(root + 7 - 12), 0.45) });
          if (p) [2, 6].forEach(i => ev.push({ t: b0 + i * e8, fn: at => snare(at, musicG, 0.2) }));
          if (last) ev.push({ t: b0 + 4 * e8, fn: at => snareRoll(at, e8 * 4, musicG) });
          if (bi % 4 === 3) ev.push({ t: b0 + 6 * e8, fn: at => brass(at, hz(60 + tones[0]), e8 * 2, musicG, 0.06) });
        } else if (S.drums === 'tick') {
          [[0, 0], [2, 7], [4, 12], [6, 7]].forEach(([i, iv]) => ev.push({ t: b0 + i * e8, fn: at => { const g = AC.createGain(); g.connect(musicG); env(g, at, 0.003, 0.22, 0.12, 0.01, at + 0.18, 0.05); osc('triangle', hz(root + iv), at, at + 0.25, g); } }));
          for (let i = 0; i < 8; i++) ev.push({ t: b0 + i * e8, fn: at => wood(at, i % 2 ? 1450 : 1050, i % 2 ? 0.1 : 0.16) });
          ev.push({ t: b0, fn: at => kick(at, musicG, 0.5) }); ev.push({ t: b0 + 4 * e8, fn: at => kick(at, musicG, 0.35) });
          if (p) ev.push({ t: b0, fn: at => strings(at, tones.map(x => hz(60 + x)), bar * 0.95, 0.018) });
          if (last) for (let q = 0; q < 6; q++) ev.push({ t: b0 + 5 * e8 + q * e8 / 2, fn: at => wood(at, 900 + q * 120, 0.08) });
        } else {
          [[0, 0], [3, 0], [4, 7], [6, 12]].forEach(([i, iv]) => ev.push({ t: b0 + i * e8, fn: at => bass(at, hz(root + iv), e8 * 1.4, musicG, 'square') }));
          [0, 4].forEach(i => ev.push({ t: b0 + i * e8, fn: at => kick(at, musicG, 0.8) }));
          [2, 6].forEach(i => ev.push({ t: b0 + i * e8, fn: at => anvil(at, 0.06) }));
          for (let i = 0; i < 8; i++) ev.push({ t: b0 + i * e8, fn: at => hat(at, musicG, i % 2 ? 0.04 : 0.07) });
          if (last) { ev.push({ t: b0 + 5 * e8, fn: at => tom(at, 180, musicG) }); ev.push({ t: b0 + 6 * e8, fn: at => tom(at, 140, musicG) }); ev.push({ t: b0 + 7 * e8, fn: at => tom(at, 110, musicG) }); }
          if (p) ev.push({ t: b0, fn: at => pad(at, tones.map(x => hz(60 + x)), bar * 0.95, 0.022) });
        }
        if (bi === nb - 1 && p === passes - 1 && true) ev.push({ t: b0 + 7 * e8, fn: at => bark(at, 700, musicG, 0.3, 'yap') });
      }
    }
    ev.sort((a, b) => a.t - b.t);
    return { name, ev, loop: melLen * passes, notes: [], melStart: 0 };
  }
  function buildMarch(name) {
    const S = SONGS[name], e8 = 60 / S.bpm / 2, bar = 8 * e8, ev = [], notes = [];
    const mn = m => S.minor ? toMinor(m) : m;
    const swg = tt => { if (!S.swing) return tt; const pos = Math.round(tt / e8); return Math.abs(tt / e8 - pos) < 0.01 && pos % 2 ? tt + e8 * S.swing : tt; };
    let t = 0;
    const leadNote = (at0, m, dd) => {
      if (S.lead === 'brass') ev.push({ t: at0, fn: at => brass(at, hz(m), dd, musicG, 0.1) });
      else if (S.lead === 'bell') ev.push({ t: at0, fn: at => lead(at, hz(m + 12), dd, musicG, 'bell') });
      else if (S.lead === 'marimba') ev.push({ t: swg(at0), fn: at => marimba(at, hz(m + 12), dd, musicG, 0.15) });
      else ev.push({ t: at0, fn: at => lead(at, hz(m), dd, musicG, S.lead) });
    };
    for (const sec of M_SECT) {
      const tr = sec.tr || 0, s0 = t;
      if (sec.k === 'fan' || sec.k === 'brk') {
        let tt = s0; const riff = sec.k === 'brk' ? M_FAN.slice(0, 10) : M_FAN;
        for (const [n, d, fl] of riff) { const m = mn(midi(n) + tr), dd = d * e8, at0 = tt;
          if (fl === 'b') ev.push({ t: at0, fn: at => bark(at, hz(m), musicG, 0.6) });
          else if (S.puppy) { ev.push({ t: swg(at0), fn: at => { marimba(at, hz(m + 12), dd, musicG, 0.17); marimba(at, hz(m), dd, musicG, 0.1); } }); }
          else { ev.push({ t: at0, fn: at => brass(at, hz(m), dd, musicG, 0.12) }); ev.push({ t: at0, fn: at => brass(at, hz(m - 12), dd, musicG, 0.07) }); }
          tt += dd; }
      } else if (sec.k === 'end') {
        [0, 4, 7, 12].forEach(iv => ev.push({ t: s0, fn: at => brass(at, hz(mn(60 + iv + tr)), bar * 1.4, musicG, 0.09) }));
        [0, 2, 4].forEach(k => ev.push({ t: s0 + bar + k * e8, fn: at => bark(at, hz(67 + tr), musicG, 0.65, k === 4 ? 'big' : 'woof') }));
      } else {
        let tt = s0;
        for (const [n, d, syl, fl, line] of sec.mel) {
          const dd = d * e8;
          if (n !== 'r') { const m = mn(midi(n) + tr), at0 = tt;
            if (S.vocal) notes.push({ t: at0, d: dd, syl, line, bark: fl === 'b' });
            const ta = swg(at0); if (S.vocal) notes[notes.length - 1].t = ta;
            if (fl === 'b') ev.push({ t: ta, fn: at => bark(at, hz(m), musicG, 0.6, S.puppy ? 'yap' : 'woof') });
            else if (S.vocal && S.puppy) ev.push({ t: ta, fn: at => { voice(at, hz(m), dd, syl, musicG); marimba(at, hz(m + 12), dd, musicG, 0.09); if (sec.full) voice(at, hz(m - 4), dd, syl, musicG); } });
            else if (S.vocal) ev.push({ t: at0, fn: at => { voice(at, hz(m), dd, syl, musicG); lead(at, hz(m + 12), dd, musicG, 'bell'); if (sec.full) { voice(at, hz(m - 4), dd, syl, musicG); brass(at, hz(m), dd, musicG, 0.045); } } });
            else leadNote(at0, m, dd); }
          tt += dd;
        }
      }
      sec.bars.forEach((c0, bi) => {
        const c = S.minor ? (MINOR_CH[c0] || c0) : c0, tones = CH[c] || CH.C, root = 36 + tones[0] + tr, b0 = s0 + bi * bar, last = bi === sec.bars.length - 1;
        if (bi === 0 && sec.crash) ev.push({ t: b0, fn: at => crash(at, musicG, 0.15) });
        if (sec.k === 'end') { if (bi === 0) { ev.push({ t: b0, fn: at => kick(at, musicG, 1) }); ev.push({ t: b0, fn: at => bass(at, hz(root), bar * 1.6, musicG, 'triangle') }); } return; }
        // 움파 베이스 (행진곡)
        [[0, 0], [2, 7], [4, 0], [6, 7]].forEach(([i, iv]) => { const f = hz(root + iv); ev.push({ t: b0 + i * e8, fn: at => bass(at, f, e8 * 1.5, musicG, 'triangle') }); });
        // 뒷박 화음 (브라스 스탭 / 글로켄)
        if (S.puppy) { [0, 1, 3, 4, 5, 7].forEach(i => { const fs = tones.map(x => hz(mn(60 + x + tr))); ev.push({ t: swg(b0 + i * e8), fn: at => uke(at, fs, musicG, i % 2 ? 0.035 : 0.05) }); }); }
        else [1, 3, 5, 7].forEach(i => { const fs = tones.map(x => hz(mn(60 + x + tr))); ev.push({ t: b0 + i * e8, fn: at => fs.forEach(f => S.lead === 'bell' ? pluck(at, f, musicG, 0.035) : brass(at, f, e8 * 0.55, musicG, 0.025)) }); });
        if (sec.full || sec.k === 'pre') { const fs = tones.map(x => hz(mn(72 + x + tr))); ev.push({ t: b0, fn: at => pad(at, fs, bar * 0.95, 0.03) }); }
        for (let i = 0; i < 8; i++) {
          const tt = b0 + i * e8;
          if (sec.roll && last && i >= 4) { if (i === 4) ev.push({ t: tt, fn: at => snareRoll(at, e8 * 4, musicG) }); continue; }
          if (S.drums === 'puppy') {
            if (i === 0 || (i === 5 && sec.full)) ev.push({ t: tt, fn: at => kick(at, musicG, 0.8) });
            if (i === 2 || i === 6) ev.push({ t: tt, fn: at => clap(at, musicG, 0.2) });
            ev.push({ t: swg(tt), fn: at => shaker(at, musicG, i % 2 ? 0.035 : 0.05) });
            if (i === 7 && bi % 2 === 1) ev.push({ t: swg(tt), fn: at => bark(at, 760, musicG, 0.25, 'yap') });
            if (last && i === 6 && !sec.roll) ev.push({ t: tt, fn: at => squeak(at, musicG) });
            continue;
          }
          if (S.drums === 'light') { if (i === 0) ev.push({ t: tt, fn: at => kick(at, musicG, 0.4) }); if (i % 2) ev.push({ t: tt, fn: at => hat(at, musicG, 0.05) }); continue; }
          if (i === 0 || i === 4) ev.push({ t: tt, fn: at => kick(at, musicG, 0.95) });
          if (i === 2 || i === 6) ev.push({ t: tt, fn: at => snare(at, musicG, 0.42) });
          if (S.drums === 'battle' || sec.full) ev.push({ t: tt, fn: at => hat(at, musicG, 0.09) }); else if (i % 2 === 0) ev.push({ t: tt, fn: at => hat(at, musicG, 0.07) });
          if (sec.full && i === 7) ev.push({ t: tt + e8 / 2, fn: at => snare(at, musicG, 0.2) });
        }
      });
      t = s0 + sec.bars.length * bar;
    }
    ev.sort((a, b) => a.t - b.t);
    return { name, ev, loop: t + bar, notes, melStart: 0, lyrics: M_LYR };
  }
  /* ---------- 「멍멍기사의 노래」 애니메이션 오프닝 버전 ----------
     인트로 훅 → 1절 → 2절 → 프리코러스 → 후렴 → 브레이크 → 키 업(+2) 마지막 후렴 → 엔딩 */
  const A_HOOK = [['A4', 1], ['C5', 1], ['F5', 2], ['E5', 1], ['C5', 1], ['D5', 2], ['D5', 1], ['B4', 1], ['G4', 1], ['B4', 1], ['D5', 2], ['G5', 2],
    ['E5', 1], ['D5', 1], ['C5', 1], ['B4', 1], ['C5', 2], ['E5', 2], ['G4', 2, 'b'], ['G4', 2, 'b'], ['G4', 1], ['A4', 1], ['B4', 2]];
  const A_V2 = [
    ['G4', 1, '구', 0, 10], ['G4', 1, '름', 0, 10], ['A4', 1, '너', 0, 10], ['A4', 1, '머', 0, 10], ['C5', 1, '바', 0, 10], ['C5', 1, '다', 0, 10], ['A4', 2, '건', 0, 10], ['G4', 4, '너', 0, 10], ['r', 4],
    ['F4', 1, '별', 0, 11], ['F4', 1, '뼈', 0, 11], ['A4', 1, '찾', 0, 11], ['C5', 1, '아', 0, 11], ['B4', 2, '달', 0, 11], ['A4', 2, '려', 0, 11], ['G4', 4, '가', 0, 11], ['r', 4],
    ['E4', 1, '무', 0, 12], ['G4', 1, '서', 0, 12], ['C5', 1, '운', 0, 12], ['C5', 1, '밤', 0, 12], ['D5', 1, '이', 0, 12], ['C5', 1, '와', 0, 12], ['A4', 2, '도', 0, 12], ['G4', 2, '멍', 'b', 12], ['G4', 2, '멍', 'b', 12], ['r', 4],
    ['G4', 1, '친', 0, 13], ['A4', 1, '구', 0, 13], ['B4', 1, '들', 0, 13], ['C5', 1, '이', 0, 13], ['D5', 2, '함', 0, 13], ['E5', 1, '께', 0, 13], ['D5', 5, '야', 0, 13], ['r', 4],
  ];
  const A_PRE = [
    ['A4', 1, '두', 0, 14], ['A4', 1, '근', 0, 14], ['A4', 1, '두', 0, 14], ['A4', 1, '근', 0, 14], ['G4', 1, '심', 0, 14], ['A4', 1, '장', 0, 14], ['C5', 2, '소', 0, 14], ['A4', 4, '리', 0, 14], ['r', 4],
    ['G4', 1, '꼬', 0, 15], ['G4', 1, '리', 0, 15], ['G4', 1, '끝', 0, 15], ['G4', 1, '에', 0, 15], ['E4', 1, '불', 0, 15], ['G4', 1, '꽃', 0, 15], ['B4', 2, '켜', 0, 15], ['G4', 4, '고', 0, 15], ['r', 4],
    ['F4', 1, '하', 0, 16], ['F4', 1, '나', 0, 16], ['A4', 2, '둘', 0, 16], ['C5', 2, '셋', 0, 16], ['D5', 1, '다', 0, 16], ['D5', 1, '함', 0, 16], ['C5', 4, '께', 0, 16], ['r', 4],
    ['D5', 1, '크', 0, 17], ['D5', 1, '게', 0, 17], ['E5', 1, '외', 0, 17], ['E5', 1, '쳐', 0, 17], ['F5', 2, '보', 0, 17], ['G5', 6, '자', 0, 17], ['r', 4],
  ];
  const A_SECT = [
    { k: 'hook', bars: ['F', 'G', 'Am', 'G'], crash: true },
    { k: 'v1', bars: ['C', 'C', 'F', 'C', 'Am', 'G', 'G', 'C'], crash: true, soft: true },
    { k: 'v2', bars: ['C', 'C', 'F', 'C', 'Am', 'G', 'F', 'G'], soft: true },
    { k: 'pre', bars: ['F', 'G', 'Em', 'Am', 'F', 'G', 'Dm', 'G'], crash: true, build: true },
    { k: 'ch', bars: ['C', 'F', 'C', 'G', 'Dm', 'G', 'C', 'F', 'C', 'C'], crash: true, full: true },
    { k: 'brk', bars: ['F', 'G'], tr: 2, crash: true },
    { k: 'ch', bars: ['C', 'F', 'C', 'G', 'Dm', 'G', 'C', 'F', 'C', 'C'], tr: 2, crash: true, full: true },
    { k: 'end', bars: ['C', 'C'], tr: 2, crash: true },
  ];

  function midi(n) {
    const m = /^([A-G])(#|b)?(\d)$/.exec(n); if (!m) return null;
    const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]];
    return base + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (+m[3] + 1) * 12;
  }
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  function toMinor(m) { const pc = ((m % 12) + 12) % 12; return (pc === 4 || pc === 9 || pc === 11) ? m - 1 : m; }

  function setupNodes(offline) {
    master = AC.createGain(); master.gain.value = 0.85;
    const comp = AC.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3;
    master.connect(comp); comp.connect(AC.destination);
    musicG = AC.createGain(); musicG.gain.value = (st.music || offline) ? 0.34 : 0; musicG.connect(master);
    sfxG = AC.createGain(); sfxG.gain.value = st.sfx ? 0.6 : 0; sfxG.connect(master);
    echo = AC.createDelay(1); echo.delayTime.value = 0.26;
    const fb = AC.createGain(); fb.gain.value = 0.28; const eg = AC.createGain(); eg.gain.value = 0.22;
    echo.connect(fb); fb.connect(echo); echo.connect(eg); eg.connect(musicG);
    // 디스토션 기타 버스
    gtr = AC.createGain(); gtr.gain.value = 1;
    const sh = AC.createWaveShaper(), cv = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; cv[i] = Math.tanh(x * 7) * 0.8; } sh.curve = cv; sh.oversample = '2x';
    const glp = AC.createBiquadFilter(); glp.type = 'lowpass'; glp.frequency.value = 3000; glp.Q.value = 0.8;
    const ghp = AC.createBiquadFilter(); ghp.type = 'highpass'; ghp.frequency.value = 90;
    const gout = AC.createGain(); gout.gain.value = 0.11;
    gtr.connect(sh); sh.connect(ghp); ghp.connect(glp); glp.connect(gout); gout.connect(musicG);
    noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  function init() {
    if (AC) { if (AC.state === 'suspended') AC.resume().catch(() => {}); return; }
    try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; return; }
    setupNodes(false);
    setInterval(tick, 25);
    document.addEventListener('visibilitychange', () => { if (!AC) return; if (document.hidden) AC.suspend().catch(() => {}); else AC.resume().catch(() => {}); });
  }
  /* 오프라인 렌더 (노래 파일 만들기용) */
  function renderOffline(name, loops) {
    const saved = [AC, master, musicG, sfxG, echo, noiseBuf, gtr];
    const song = build(name), sr = 44100, len = song.loop * loops + 2.5;
    const oc = new OfflineAudioContext(2, Math.ceil(sr * len), sr);
    AC = oc; setupNodes(true);
    for (let k = 0; k < loops; k++) for (const e of song.ev) e.fn(0.1 + k * song.loop + e.t);
    [AC, master, musicG, sfxG, echo, noiseBuf, gtr] = saved;
    return oc.startRendering();
  }
  /* ---------- 악기 ---------- */
  function env(g, t, a, peak, d, sus, end, rel) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak * sus), t + a + d);
    g.gain.setValueAtTime(Math.max(0.0002, peak * sus), end);
    g.gain.exponentialRampToValueAtTime(0.0001, end + rel);
  }
  function osc(type, f, t, stop, out, detune) {
    const o = AC.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t);
    if (detune) o.detune.value = detune; o.connect(out); o.start(t); o.stop(stop); return o;
  }
  function noise(t, dur, out, filt, fq, q) {
    const s = AC.createBufferSource(); s.buffer = noiseBuf;
    const f = AC.createBiquadFilter(); f.type = filt; f.frequency.value = fq; f.Q.value = q || 1;
    s.connect(f); f.connect(out); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02); return f;
  }
  function kick(t, out, v) { const g = AC.createGain(); g.connect(out); env(g, t, 0.003, v || 0.9, 0.12, 0.01, t + 0.13, 0.05);
    const o = osc('sine', 150, t, t + 0.25, g); o.frequency.exponentialRampToValueAtTime(42, t + 0.14); }
  function snare(t, out, v) { const g = AC.createGain(); g.connect(out); env(g, t, 0.002, v || 0.38, 0.11, 0.01, t + 0.12, 0.04);
    noise(t, 0.16, g, 'bandpass', 1900, 0.7); const g2 = AC.createGain(); g2.connect(out); env(g2, t, 0.002, 0.2, 0.06, 0.01, t + 0.06, 0.03); osc('triangle', 190, t, t + 0.1, g2); }
  function hat(t, out, v) { const g = AC.createGain(); g.connect(out); env(g, t, 0.001, v || 0.1, 0.035, 0.01, t + 0.035, 0.02); noise(t, 0.06, g, 'highpass', 7500, 0.7); }
  function bass(t, f, dur, out, type) {
    const g = AC.createGain(); const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = type === 'square' ? 900 : 1400; lp.connect(g); g.connect(out);
    env(g, t, 0.005, 0.32, 0.1, 0.6, t + dur * 0.85, 0.05); osc(type || 'triangle', f, t, t + dur + 0.1, lp);
  }
  function pluck(t, f, out, v) { const g = AC.createGain(); g.connect(out); env(g, t, 0.003, v || 0.07, 0.15, 0.01, t + 0.16, 0.05); osc('triangle', f, t, t + 0.25, g); }
  function lead(t, f, dur, out, type) {
    const g = AC.createGain(); const lp = AC.createBiquadFilter(); lp.type = 'lowpass';
    lp.frequency.value = type === 'bell' ? 5000 : 3200; lp.connect(g); g.connect(out); g.connect(echo);
    if (type === 'bell') {
      env(g, t, 0.003, 0.16, 0.5, 0.05, t + Math.max(0.05, dur * 0.9), 0.2);
      osc('triangle', f, t, t + dur + 0.4, lp); osc('sine', f * 2, t, t + dur + 0.4, lp);
      return;
    }
    env(g, t, 0.01, type === 'saw' ? 0.1 : 0.12, 0.12, 0.65, t + dur * 0.9, 0.06);
    const o1 = osc(type === 'saw' ? 'sawtooth' : 'square', f, t, t + dur + 0.12, lp, -6);
    const o2 = osc(type === 'saw' ? 'square' : 'square', f, t, t + dur + 0.12, lp, 6);
    vibrato([o1, o2], f, t + 0.12, t + dur + 0.12, 0.006);
  }
  function vibrato(oscs, f, t, stop, depth) {
    const l = AC.createOscillator(); l.frequency.value = 5.6; const lg = AC.createGain(); lg.gain.value = f * depth;
    l.connect(lg); oscs.forEach(o => lg.connect(o.frequency)); l.start(t); l.stop(stop);
  }
  /* 보컬 신스: 한글 자모 → 포먼트 */
  const VF = { a: [820, 1250], e: [520, 1850], i: [310, 2300], o: [500, 860], u: [340, 760], eo: [620, 1060], eu: [360, 1420] };
  const JUNG = ['a', 'e', 'a', 'e', 'eo', 'e', 'eo', 'e', 'o', 'a', 'e', 'e', 'o', 'u', 'eo', 'e', 'i', 'u', 'eu', 'i', 'i'];
  function jamo(s) {
    const c = s.charCodeAt(0) - 0xAC00; if (c < 0 || c > 11171) return { v: 'a', on: 'none' };
    const cho = Math.floor(c / 588), jung = Math.floor((c % 588) / 28), jong = c % 28;
    let on = 'none';
    if ([0, 1, 3, 4, 7, 8, 15, 16, 17].includes(cho)) on = 'stop';
    else if ([9, 10, 12, 13, 14].includes(cho)) on = 'fric';
    else if (cho === 18) on = 'h';
    else if (cho === 2 || cho === 6) on = 'nasal';
    return { v: JUNG[jung], on, nasalEnd: jong === 21 || jong === 4 || jong === 16 };
  }
  function voice(t, f, dur, syl, out) {
    const j = jamo(syl || '아'), F = VF[j.v];
    const g = AC.createGain(); g.connect(out); g.connect(echo);
    const end = t + Math.max(0.06, dur * 0.92);
    env(g, t, 0.025, 0.55, 0.08, 0.8, end, 0.07);
    const src = AC.createGain(); src.gain.value = 1;
    const o1 = osc('sawtooth', f, t, end + 0.1, src, -5), o2 = osc('sawtooth', f, t, end + 0.1, src, 5);
    vibrato([o1, o2], f, t + 0.15, end + 0.1, 0.008);
    [[F[0], 7, 1], [F[1], 9, 0.55], [2900, 6, 0.18]].forEach(([fq, q, gv], i) => {
      const bp = AC.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = q;
      if (j.on === 'nasal' && i === 0) { bp.frequency.setValueAtTime(260, t); bp.frequency.linearRampToValueAtTime(fq, t + 0.07); }
      else bp.frequency.setValueAtTime(fq, t);
      if (j.nasalEnd && i === 0) bp.frequency.linearRampToValueAtTime(280, end);
      const bg = AC.createGain(); bg.gain.value = gv * 2.4; src.connect(bp); bp.connect(bg); bg.connect(g);
    });
    if (j.on === 'stop') { const ng = AC.createGain(); ng.connect(out); env(ng, t, 0.002, 0.12, 0.02, 0.01, t + 0.02, 0.01); noise(t, 0.04, ng, 'bandpass', 2200, 1.2); }
    if (j.on === 'fric' || j.on === 'h') { const ng = AC.createGain(); ng.connect(out); env(ng, t - 0.01, 0.01, j.on === 'h' ? 0.05 : 0.09, 0.05, 0.01, t + 0.05, 0.02); noise(t - 0.01, 0.08, ng, 'highpass', j.on === 'h' ? 1500 : 4200, 0.8); }
  }
  /* 진짜 강아지 짖는 소리: 샘플 단위 합성
     - 피치: 짧게 올라갔다 빠르게 떨어짐 / 주기 배가(서브하모닉)로 거친 목소리
     - 시작 순간 숨 노이즈 / 입이 닫히며 포먼트가 내려감 ("워-프") / 소프트 클리핑 */
  const BARKS = {};
  function biquadBP(f, q, sr) { const w = 2 * Math.PI * f / sr, al = Math.sin(w) / (2 * q), a0 = 1 + al; return [al / a0, 0, -al / a0, -2 * Math.cos(w) / a0, (1 - al) / a0]; }
  function makeBark(sr, f0, dur, rough, seed) {
    const n = Math.floor(sr * dur), out = new Float32Array(n);
    let r = seed || 7; const rnd = () => { r = (r * 16807) % 2147483647; return r / 2147483647 * 2 - 1; };
    const F = [[880, 520, 5, 1.0], [1750, 1150, 6, 0.75], [2900, 2600, 7, 0.32]];
    const st = F.map(() => [0, 0, 0, 0]); let co = F.map(x => biquadBP(x[0], x[2], sr));
    let ph = 0, ph2 = 0, hp = 0, hpx = 0;
    for (let i = 0; i < n; i++) {
      const t = i / sr, u = t / dur;
      const pitch = t < 0.022 ? f0 * (0.82 + 0.4 * t / 0.022) : f0 * (1.22 * Math.exp(-(t - 0.022) * 7.5) + 0.0) * 1 + f0 * 0.0;
      const fq = Math.max(f0 * 0.62, pitch) * (1 + rnd() * 0.035);
      ph += fq / sr; if (ph >= 1) ph -= 1; ph2 += fq / 2 / sr; if (ph2 >= 1) ph2 -= 1;
      const pulse = (1 - 2 * ph) * 0.8 + Math.pow(1 - ph, 6) * 1.2;
      const sub = (1 - 2 * ph2) * rough;
      const breath = rnd() * (t < 0.03 ? 0.9 : 0.28 + 0.2 * u);
      const env = t < 0.004 ? t / 0.004 : t < 0.045 ? 1 : Math.exp(-(t - 0.045) * (dur > 0.2 ? 13 : 18));
      const src = (pulse + sub + breath) * env;
      if (i % 48 === 0) co = F.map(x => biquadBP(x[0] + (x[1] - x[0]) * Math.min(1, u * 1.3), x[2], sr));
      let y = 0;
      for (let k = 0; k < 3; k++) { const c = co[k], z = st[k]; const v = c[0] * src + c[2] * z[1] - c[3] * z[2] - c[4] * z[3]; z[1] = z[0]; z[0] = src; z[3] = z[2]; z[2] = v; y += v * F[k][3]; }
      hp = 0.985 * (hp + y - hpx); hpx = y;
      out[i] = Math.tanh(hp * 3.2);
    }
    let pk = 0; for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(out[i]));
    for (let i = 0; i < n; i++) out[i] = out[i] / (pk || 1) * 0.9;
    return out;
  }
  function barkBuf(kind) {
    const key = kind + '@' + AC.sampleRate; if (BARKS[key]) return BARKS[key];
    const P = { yap: [640, 0.13, 0.25, 11], woof: [430, 0.2, 0.45, 23], big: [255, 0.27, 0.7, 41] }[kind];
    const d = makeBark(AC.sampleRate, P[0], P[1], P[2], P[3]);
    const b = AC.createBuffer(1, d.length, AC.sampleRate); b.getChannelData(0).set(d);
    return (BARKS[key] = { b, f: P[0] });
  }
  function bark(t, f, out, v, kind) {
    const B = barkBuf(kind || 'woof'), s = AC.createBufferSource(), g = AC.createGain();
    s.buffer = B.b; s.playbackRate.value = Math.max(0.75, Math.min(1.4, (f || B.f) / B.f));
    g.gain.value = (v || 0.5) * 1.6; s.connect(g); g.connect(out); s.start(t);
  }

  /* 애니 OP 악기 */
  function power(t, f, dur, v) { const g = AC.createGain(); g.connect(gtr); env(g, t, 0.004, v, 0.08, 0.7, t + dur * 0.9, 0.04);
    [[f, -7], [f, 7], [f * 1.5, 0], [f * 2, 3]].forEach(([fq, dt]) => osc('sawtooth', fq, t, t + dur + 0.08, g, dt)); }
  function pad(t, freqs, dur, v) { const g = AC.createGain(); const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200; lp.connect(g); g.connect(musicG); g.connect(echo);
    env(g, t, 0.25, v, 0.3, 0.8, t + dur, 0.35); freqs.forEach(fq => { osc('sawtooth', fq, t, t + dur + 0.5, lp, -9); osc('sawtooth', fq, t, t + dur + 0.5, lp, 9); }); }
  function crash(t, out, v) { const g = AC.createGain(); g.connect(out); env(g, t, 0.002, v || 0.16, 1.1, 0.01, t + 1.2, 0.3); noise(t, 1.5, g, 'highpass', 5200, 0.6); }
  function tom(t, f, out) { const g = AC.createGain(); g.connect(out); env(g, t, 0.002, 0.5, 0.18, 0.01, t + 0.2, 0.05); const o = osc('sine', f, t, t + 0.3, g); o.frequency.exponentialRampToValueAtTime(f * 0.55, t + 0.22); }
  function buildAnime() {
    const S = SONGS.anime, e8 = 60 / S.bpm / 2, ev = [], notes = [], bar = 8 * e8;
    let t = 0;
    const melFor = { hook: null, v1: MEL.slice(0, MEL.findIndex(x => x[4] === 4)), v2: A_V2, pre: A_PRE, ch: MEL.slice(MEL.findIndex(x => x[4] === 4)), brk: null, end: null };
    for (const sec of A_SECT) {
      const tr = sec.tr || 0, s0 = t;
      // 멜로디
      if (sec.k === 'hook' || sec.k === 'brk') {
        let tt = s0; const riff = sec.k === 'brk' ? A_HOOK.slice(0, 12) : A_HOOK;
        for (const [n, d, fl] of riff) { const m = midi(n) + tr, dd = d * e8, at0 = tt;
          if (fl === 'b') ev.push({ t: at0, fn: at => bark(at, hz(m), musicG, 0.55) });
          else ev.push({ t: at0, fn: at => { lead(at, hz(m), dd, musicG, 'saw'); lead(at, hz(m + 12), dd, musicG, 'bell'); } });
          tt += dd; }
      } else if (sec.k === 'end') {
        [0, 4, 7].forEach(iv => ev.push({ t: s0, fn: at => lead(at, hz(72 + iv + tr), bar * 1.5, musicG, 'saw') }));
        [0, 2, 4].forEach(k => ev.push({ t: s0 + bar + k * e8, fn: at => bark(at, hz(67 + tr), musicG, 0.6, k === 4 ? 'big' : 'woof') }));
      } else {
        let tt = s0;
        for (const [n, d, syl, fl, line] of melFor[sec.k]) {
          const dd = d * e8;
          if (n !== 'r') { const m = midi(n) + tr, at0 = tt;
            notes.push({ t: at0, d: dd, syl, line, bark: fl === 'b' });
            if (fl === 'b') ev.push({ t: at0, fn: at => bark(at, hz(m), musicG, 0.55) });
            else ev.push({ t: at0, fn: at => { voice(at, hz(m), dd, syl, musicG); lead(at, hz(m + 12), dd, musicG, 'bell'); if (sec.full) voice(at, hz(m - 5), dd, syl, musicG); } }); }
          tt += dd;
        }
      }
      // 반주
      sec.bars.forEach((c, bi) => {
        const tones = CH[c], root = 40 + tones[0] + tr, b0 = s0 + bi * bar, last = bi === sec.bars.length - 1;
        if (bi === 0 && sec.crash) ev.push({ t: b0, fn: at => crash(at, musicG, 0.18) });
        // 기타
        if (sec.k === 'end') { if (bi === 0) ev.push({ t: b0, fn: at => power(at, hz(root), bar * 1.8, 0.5) }); }
        else if (sec.soft) { [0, 3, 6].forEach(i => ev.push({ t: b0 + i * e8, fn: at => power(at, hz(root), e8 * (i === 6 ? 2 : 3) * 0.9, 0.3) })); }
        else for (let i = 0; i < 8; i++) ev.push({ t: b0 + i * e8, fn: at => power(at, hz(root), e8 * 0.85, i % 4 === 0 ? 0.5 : 0.32) });
        // 스트링
        if (!sec.soft || bi % 2 === 0) { const fs = tones.map(x => hz(60 + x + tr)); ev.push({ t: b0, fn: at => pad(at, fs, bar * (sec.soft ? 2 : 1) * 0.95, sec.full ? 0.05 : 0.035) }); }
        // 베이스
        for (let i = 0; i < 8; i++) { const f = hz(root - 12 + (i === 7 && !sec.soft ? 7 : 0)); ev.push({ t: b0 + i * e8, fn: at => bass(at, f, e8 * 0.9, musicG, 'sawtooth') }); }
        // 드럼
        for (let i = 0; i < 8; i++) {
          const tt = b0 + i * e8;
          if (sec.k === 'end') { if (bi === 0 && i === 0) ev.push({ t: tt, fn: at => kick(at, musicG, 1) }); continue; }
          if (sec.build && last) { ev.push({ t: tt, fn: at => snare(at, musicG, 0.25 + i * 0.04) }); ev.push({ t: tt + e8 / 2, fn: at => snare(at, musicG, 0.2 + i * 0.04) }); continue; }
          if (sec.k === 'brk' && last && i >= 4) { const f = [220, 180, 150, 120][i - 4]; ev.push({ t: tt, fn: at => tom(at, f, musicG) }); ev.push({ t: tt + e8 / 2, fn: at => tom(at, f * 0.9, musicG) }); continue; }
          if (i === 0 || i === 4 || (!sec.soft && (i === 3 || i === 7) && sec.full)) ev.push({ t: tt, fn: at => kick(at, musicG, 0.95) });
          if (sec.soft && i === 5) ev.push({ t: tt, fn: at => kick(at, musicG, 0.7) });
          if (i === 2 || i === 6) ev.push({ t: tt, fn: at => snare(at, musicG, 0.45) });
          ev.push({ t: tt, fn: at => hat(at, musicG, sec.full ? 0.11 : 0.08) });
          if (sec.full) ev.push({ t: tt + e8 / 2, fn: at => hat(at, musicG, 0.05) });
        }
      });
      t = s0 + sec.bars.length * bar;
    }
    ev.sort((a, b) => a.t - b.t);
    return { name: 'anime', ev, loop: t + bar, notes, melStart: 0 };
  }
  /* ---------- 시퀀서 ---------- */
  let cur = null; // {name, ev:[{t,fn}], loop, start, next, k}
  function build(name) {
    if (SONGS[name].world) return buildWorld(name);
    if (SONGS[name].anime) return buildAnime();
    if (SONGS[name].march) return buildMarch(name);
    const S = SONGS[name], e8 = 60 / S.bpm / 2, ev = [];
    const mn = m => S.minor ? toMinor(m) : m;
    let t = 0;
    // 인트로 리프
    for (const [n, d] of INTRO) { const m = mn(midi(n)), tt = t, dd = d * e8; ev.push({ t: tt, fn: (at) => lead(at, hz(m), dd, musicG, S.lead === 'voice' ? 'square' : S.lead) }); t += d * e8; }
    const melStart = t, notes = [];
    for (const [n, d, syl, fl, line] of MEL) {
      if (n !== 'r') {
        const m = mn(midi(n)), dd = d * e8, tt = t;
        notes.push({ t: tt, d: dd, syl, line, bark: fl === 'b' });
        if (S.lead === 'voice') {
          if (fl === 'b') ev.push({ t: tt, fn: at => bark(at, hz(m), musicG, 0.5) });
          else ev.push({ t: tt, fn: at => { voice(at, hz(m), dd, syl, musicG); lead(at, hz(m + 12), dd, musicG, 'bell'); } });
        } else {
          ev.push({ t: tt, fn: at => lead(at, hz(m), dd, musicG, S.lead) });
          if (fl === 'b' && S.bark) ev.push({ t: tt, fn: at => bark(at, hz(m), musicG, 0.35) });
        }
      }
      t += d * e8;
    }
    const total = CHORDS.length * 8 * e8;
    // 반주
    CHORDS.forEach((c0, bi) => {
      const c = S.minor ? MINOR_CH[c0] : c0, tones = CH[c], root = 36 + tones[0], b0 = bi * 8 * e8;
      const pat = S.drums === 'battle' ? [0, 12, 0, 12, 0, 12, 7, 12] : [0, null, 12, null, 7, null, 12, null];
      pat.forEach((iv, i) => { if (iv == null) return; const f = hz(root + iv); ev.push({ t: b0 + i * e8, fn: at => bass(at, f, e8 * (S.drums === 'battle' ? 0.9 : 1.6), musicG, S.minor ? 'square' : 'triangle') }); });
      if (S.drums !== 'battle') for (let i = 0; i < 8; i++) { const f = hz(60 + tones[i % 3] + (i >= 4 ? 12 : 0)); ev.push({ t: b0 + i * e8, fn: at => pluck(at, f, musicG, S.lead === 'bell' ? 0.05 : 0.04) }); }
      for (let i = 0; i < 8; i++) {
        const tt = b0 + i * e8;
        if (S.drums === 'light') { if (i % 2 === 1) ev.push({ t: tt, fn: at => hat(at, musicG, 0.05) }); if (i === 0) ev.push({ t: tt, fn: at => kick(at, musicG, 0.35) }); }
        else if (S.drums === 'pop') { if (i === 0 || i === 4) ev.push({ t: tt, fn: at => kick(at, musicG) }); if (i === 2 || i === 6) ev.push({ t: tt, fn: at => snare(at, musicG) }); ev.push({ t: tt, fn: at => hat(at, musicG, i % 2 ? 0.06 : 0.1) }); }
        else if (S.drums === 'battle') {
          if (i % 2 === 0) ev.push({ t: tt, fn: at => kick(at, musicG) });
          if (i === 2 || i === 6) ev.push({ t: tt, fn: at => snare(at, musicG, 0.42) });
          ev.push({ t: tt, fn: at => hat(at, musicG, 0.09) }); ev.push({ t: tt + e8 / 2, fn: at => hat(at, musicG, 0.05) });
        }
      }
    });
    ev.sort((a, b) => a.t - b.t);
    return { name, ev, loop: total, notes, melStart };
  }
  function play(name) {
    if (!AC) return;
    if (cur && cur.name === name) return;
    cur = build(name);
    cur.start = AC.currentTime + 0.12; cur.k = 0; cur.i = 0;
  }
  function stop() { cur = null; }
  function tick() {
    if (!AC || !cur || AC.state !== 'running') return;
    const ahead = AC.currentTime + 0.18;
    for (let guard = 0; guard < 400; guard++) {
      const e = cur.ev[cur.i], at = cur.start + cur.k * cur.loop + e.t;
      if (at > ahead) break;
      if (at > AC.currentTime - 0.05 && st.music) { try { e.fn(at); } catch (er) {} }
      cur.i++; if (cur.i >= cur.ev.length) { cur.i = 0; cur.k++; }
    }
  }
  /* 노래방 가사 상태 */
  function lyric() {
    if (!AC || !cur || !cur.notes || !cur.notes.length) return null;
    const pos = AC.currentTime - cur.start; if (pos < 0) return null;
    const p = pos % cur.loop;
    let idx = -1;
    for (let i = 0; i < cur.notes.length; i++) if (cur.notes[i].t <= p + 0.03) idx = i; else break;
    if (idx < 0) return { line: 0, done: 0, intro: true };
    const n = cur.notes[idx], sameLine = cur.notes.filter(x => x.line === n.line), done = sameLine.indexOf(n) + 1;
    return { text: (cur.lyrics || LYRICS)[n.line], line: n.line, done, total: sameLine.length, sylls: sameLine.map(x => x.bark ? '멍' : x.syl), pulse: Math.max(0, 1 - (p - n.t) / 0.25) };
  }
  /* ---------- 효과음 ---------- */
  let lastHit = 0, lastCoin = 0;
  function sx(fn) { if (!AC || !st.sfx) return; try { fn(AC.currentTime); } catch (e) {} }
  function blip(t, f, d, type, v, slide) { const g = AC.createGain(); g.connect(sfxG); env(g, t, 0.004, v, d * 0.6, 0.3, t + d * 0.7, d * 0.3); const o = osc(type, f, t, t + d + 0.05, g); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d); }
  const SFX = {
    click: () => sx(t => blip(t, 760, 0.06, 'triangle', 0.18)),
    hit: () => { const n = performance.now(); if (n - lastHit < 60) return; lastHit = n; sx(t => { const g = AC.createGain(); g.connect(sfxG); env(g, t, 0.002, 0.18, 0.05, 0.01, t + 0.05, 0.02); noise(t, 0.07, g, 'bandpass', 1200, 1.5); blip(t, 220, 0.06, 'square', 0.06, -100); }); },
    slash: () => sx(t => { const g = AC.createGain(); g.connect(sfxG); env(g, t, 0.01, 0.16, 0.08, 0.01, t + 0.09, 0.04); const f = noise(t, 0.12, g, 'bandpass', 2500, 2); f.frequency.exponentialRampToValueAtTime(6000, t + 0.1); }),
    coin: () => { const n = performance.now(); if (n - lastCoin < 70) return; lastCoin = n; sx(t => { blip(t, 1320, 0.07, 'square', 0.07); blip(t + 0.05, 1980, 0.12, 'square', 0.07); }); },
    pick: () => sx(t => { blip(t, 660, 0.08, 'triangle', 0.2); blip(t + 0.06, 990, 0.12, 'triangle', 0.2); }),
    rare: () => sx(t => [784, 988, 1175, 1568].forEach((f, i) => blip(t + i * 0.07, f, 0.2, 'triangle', 0.18))),
    summon: () => sx(t => { bark(t, 640 + Math.random() * 80, sfxG, 0.3, 'yap'); }),
    lvl: () => sx(t => [523, 659, 784, 1046, 1318].forEach((f, i) => blip(t + i * 0.08, f, 0.25, 'square', 0.08))),
    slam: () => sx(t => { kick(t, sfxG, 1); const g = AC.createGain(); g.connect(sfxG); env(g, t, 0.005, 0.3, 0.25, 0.01, t + 0.25, 0.1); noise(t, 0.35, g, 'lowpass', 900, 1); }),
    bark: () => sx(t => { bark(t, 430, sfxG, 0.6); bark(t + 0.24, 450, sfxG, 0.6); bark(t + 0.5, 420, sfxG, 0.7); }),
    storm: () => sx(t => { for (let i = 0; i < 8; i++) blip(t + i * 0.05, 400 + Math.random() * 800, 0.14, 'triangle', 0.1, -250); kick(t + 0.3, sfxG, 1); }),
    win: () => sx(t => { [523, 659, 784, 1046].forEach((f, i) => blip(t + i * 0.12, f, 0.22, 'square', 0.1)); [523, 659, 784].forEach(f => blip(t + 0.55, f * 2, 0.8, 'triangle', 0.12)); bark(t + 0.6, 450, sfxG, 0.5); bark(t + 0.85, 470, sfxG, 0.5); }),
    lose: () => sx(t => [392, 349, 311, 262].forEach((f, i) => blip(t + i * 0.22, f, 0.3, 'triangle', 0.15))),
    boss: () => sx(t => { blip(t, 80, 0.8, 'sawtooth', 0.25, 30); kick(t, sfxG, 1); kick(t + 0.4, sfxG, 1); }),
    die: () => sx(t => { const g = AC.createGain(); g.connect(sfxG); env(g, t, 0.005, 0.14, 0.12, 0.01, t + 0.14, 0.05); noise(t, 0.18, g, 'lowpass', 2500, 0.8); blip(t, 500, 0.12, 'square', 0.05, -350); }),
    start: () => sx(t => { bark(t, 450, sfxG, 0.5); blip(t + 0.15, 523, 0.1, 'square', 0.08); blip(t + 0.25, 784, 0.18, 'square', 0.08); }),
    woof: () => sx(t => bark(t, 430 + Math.random() * 60, sfxG, 0.35)),
    growl: () => sx(t => bark(t, 250, sfxG, 0.7, 'big')),
  };
  function setMusic(on) { st.music = on; if (musicG) musicG.gain.setTargetAtTime(on ? 0.34 : 0, AC.currentTime, 0.05); }
  function setSfx(on) { st.sfx = on; if (sfxG) sfxG.gain.setTargetAtTime(on ? 0.6 : 0, AC.currentTime, 0.05); }
  function barkSample(kind) { const P = { yap: [640, 0.13, 0.25, 11], woof: [430, 0.2, 0.45, 23], big: [255, 0.27, 0.7, 41] }[kind]; return makeBark(44100, P[0], P[1], P[2], P[3]); }
  return { BUILD: '1.6.0', SONG_LYRICS: M_LYR, init, renderOffline, barkSample, play, stop, lyric, SFX, setMusic, setSfx, LYRICS, get ready() { return !!AC; }, get current() { return cur && cur.name; } };
})();
