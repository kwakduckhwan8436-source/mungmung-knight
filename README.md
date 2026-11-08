# 멍멍기사 디펜스 (MungMung Knight Defense) v2.3.0

가로형 모바일 횡스크롤 디펜스 게임. 강아지 기사가 직접 움직여 싸우고, 뼈다귀로 강아지 동료를 소환해
오른쪽 끝 **몬스터 둥지**를 부수면 승리. 몬스터를 잡으면 코인·경험치·아이템이 나오고, 기사는 레벨업,
코인으로 강화, 상자에서 나온 장비를 장착합니다.

- 엔진 없음: HTML5 Canvas + 순수 JavaScript (캐릭터·배경·음악 전부 코드로 그림)
- v0.8 그림 팩: `www/art/`에 그림 파일을 넣으면 코드 그림 대신 사용 (지금은 타이틀 그림 1장, 없으면 자동으로 코드 그림)
- 앱 출시: Capacitor 8 로 감싸서 안드로이드 AAB 빌드 → 구글 플레이
- 웹(PWA)으로도 바로 실행 가능

## 바로 실행
```
www/index.html 을 더블클릭 (PC 크롬) 또는
npm run serve  → 휴대폰에서 http://<PC IP>:8080 접속
```
PC 조작: ←→(또는 A/D) 이동 · 1~5 소환 · Q/W/E 스킬 · F/스페이스 미르의 불꽃 · R 물약 · P 일시정지

## 폴더
```
www/            게임 본체 (앱에 그대로 들어감)
  index.html    화면 틀 + 세로 화면 안내
  js/audio.js   음악 엔진 + 「멍멍기사의 노래」
  js/art.js     캐릭터·배경·UI 그래픽 엔진
  js/story.js   스토리 컷신 대본 1부 (프롤로그~5장)
  js/story2.js  스토리 컷신 대본 2부 (6장~10장·엔딩)
  js/story3.js  스토리 사이드 장면 3부 (기사단 일상·새 동료)
  js/lore.js    세계 도감(세계관 기록)
  js/story4.js  시즌 2 컷신 (11장 별의 바다 · 12장 오로라 신전) + 도감 추가 기록
  js/story5.js  시즌 3 컷신 (13장 두더지 광산 도시 · 14장 화석 정원) + 도감 추가 기록
  js/story6.js  시즌 4 컷신 (15장 태엽 마을 · 16장 시간의 탑) + 도감 추가 기록
  js/lore2.js   세계관 확장 기록 (생활·문화·제도·졸병 몬스터 도감·연표)
  art/artpack.js 그림 팩 설정 (어떤 그림 파일을 쓸지)
  art/title.jpg  타이틀 그림
  js/game.js    게임 로직·화면
  manifest.webmanifest, sw.js, icons/
media/          주제가 「달려라 멍멍기사」(강아지 편곡 포함)·BGM MP3 · 강아지 10종 도감 · 멍멍 효과음 샘플 · 캐릭터 설정집 · 악당 도감 · 캐릭터 PNG · goods/ 굿즈 시안
store/          플레이스토어 등록용 아이콘 1024, 피처그래픽, 스크린샷
docs/           프로젝트 문서 · 출시 가이드 · 법적 체크리스트 · 개인정보처리방침 초안
tools/          test_play.py (자동 플레이 테스트) · store_assets.py · villain_sheet.py · merch_render.py · patch_android.js
capacitor.config.json, package.json
```
자세한 내용은 docs/ 를 보세요.
