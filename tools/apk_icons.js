// cap add android 직후 실행: 기본 Capacitor 아이콘을 멍멍기사 아이콘(www/icons/icon-512.png)으로 바꿈
const fs = require('fs'), path = require('path');
const res = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');
const src = path.join(__dirname, '..', 'www', 'icons', 'icon-512.png');
if (!fs.existsSync(res)) { console.error('android 폴더가 없습니다. 먼저 npx cap add android'); process.exit(1); }
let n = 0;
for (const d of fs.readdirSync(res)) {
  const dir = path.join(res, d);
  if (d.startsWith('mipmap-anydpi')) { fs.rmSync(dir, { recursive: true, force: true }); continue; } // 적응형 아이콘 대신 그림 아이콘 사용
  if (!d.startsWith('mipmap-')) continue;
  for (const f of ['ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png']) if (fs.existsSync(path.join(dir, f))) { fs.copyFileSync(src, path.join(dir, f)); n++; }
}
console.log(`✔ 앱 아이콘 ${n}개 교체`);
