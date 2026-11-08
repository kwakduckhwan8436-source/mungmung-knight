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

// v1.7 화면 꽉 채우기: 상태 표시줄·내비게이션 바 숨김(몰입 모드) + 노치 영역까지 사용 + 게임 중 화면 꺼짐 방지
(function immersive() {
  const javaRoot = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'java');
  const find = d => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) { const r = find(p); if (r) return r; } else if (f === 'MainActivity.java') return p; } return null; };
  const ma = fs.existsSync(javaRoot) && find(javaRoot);
  if (!ma) { console.error('MainActivity.java 를 찾지 못했어요'); return; }
  const pkg = (/package\s+([\w.]+);/.exec(fs.readFileSync(ma, 'utf8')) || [])[1];
  fs.writeFileSync(ma, `package ${pkg};

import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        goFullscreen();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) goFullscreen();
    }

    private void goFullscreen() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        if (Build.VERSION.SDK_INT >= 28) {
            WindowManager.LayoutParams lp = getWindow().getAttributes();
            lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(lp);
        }
        WindowInsetsControllerCompat c = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        c.hide(WindowInsetsCompat.Type.systemBars());
        c.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    }
}
`);
  console.log('✔ 전체 화면(몰입 모드) MainActivity 적용');
})();
