// npx cap add/sync android 직후 실행: 가로 화면 고정 + 화면 꺼짐 방지 없음(기본) 설정
const fs = require('fs');
const path = require('path');
const mf = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
if (!fs.existsSync(mf)) { console.error('android 폴더가 없습니다. 먼저 npm run android:add'); process.exit(1); }
let x = fs.readFileSync(mf, 'utf8');
if (!/screenOrientation=/.test(x)) {
  x = x.replace(/(<activity[^>]*android:name="[^"]*MainActivity"[^>]*?)(\s*>)/, '$1\n            android:screenOrientation="sensorLandscape"$2');
  fs.writeFileSync(mf, x);
  console.log('✔ MainActivity 가로 고정(sensorLandscape) 적용');
} else console.log('✔ 이미 screenOrientation 설정됨');
