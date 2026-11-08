@echo off
chcp 65001 > nul
rem 멍멍기사 디펜스 — PC(윈도우)에서 직접 APK 만들기
rem 준비물: Node.js 22 이상, Android Studio(설치하면 SDK와 Java가 같이 깔림)
cd /d "%~dp0\.."
call npm install || goto :err
if exist android rmdir /s /q android
call npx cap add android || goto :err
node tools\patch_android.js
node tools\apk_icons.js
call npx cap sync android || goto :err
if not exist "%USERPROFILE%\.android" mkdir "%USERPROFILE%\.android"
if not exist "%USERPROFILE%\.android\debug.keystore" copy /y tools\keystore\debug.keystore "%USERPROFILE%\.android\debug.keystore"
cd android
call gradlew.bat assembleDebug || goto :err
cd ..
copy /y android\app\build\outputs\apk\debug\app-debug.apk mungmung-knight.apk
echo.
echo ===== 완료! 프로젝트 폴더의 mungmung-knight.apk 를 핸드폰으로 옮겨 설치하세요 =====
pause
exit /b 0
:err
echo 오류가 났어요. 위 메시지를 캡처해서 보내 주세요.
pause
exit /b 1
