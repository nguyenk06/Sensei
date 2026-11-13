@echo off
setlocal

title Sensei Living Overworld Layout Editor
cd /d "%~dp0"

echo.
echo  Sensei Living Overworld Layout Editor
echo  --------------------------------------
echo  Project: %CD%
echo.

where node.exe >nul 2>nul
if errorlevel 1 (
  goto :try_codex_node
)

for /f %%V in ('node.exe -p "process.versions.node.split('.')[0]"') do set "SENSEI_NODE_MAJOR=%%V"
if "%SENSEI_NODE_MAJOR%"=="24" goto :node_ready

:try_codex_node
set "SENSEI_CODEX_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin"
if not exist "%SENSEI_CODEX_NODE%\node.exe" goto :node_error
set "PATH=%SENSEI_CODEX_NODE%;%PATH%"
for /f %%V in ('node.exe -p "process.versions.node.split('.')[0]"') do set "SENSEI_NODE_MAJOR=%%V"
if not "%SENSEI_NODE_MAJOR%"=="24" goto :node_error

:node_ready
for /f %%V in ('node.exe --version') do echo Using Node.js %%V

where pnpm.cmd >nul 2>nul
if not errorlevel 1 goto :ready

where corepack.cmd >nul 2>nul
if errorlevel 1 (
  echo ERROR: pnpm and Corepack were not found on PATH.
  echo Install pnpm 11 or enable Corepack, then run this launcher again.
  goto :failed
)

set "SENSEI_PACKAGE_RUNNER=corepack pnpm"
goto :launch

:ready
set "SENSEI_PACKAGE_RUNNER=pnpm"

:launch
if /i "%~1"=="--check" (
  echo Launcher prerequisites are available.
  exit /b 0
)

echo Starting the local editor at:
echo http://127.0.0.1:4174/tools/living-overworld-editor/
echo.
echo Keep this window open while using the editor.
echo Press Ctrl+C here when you are finished.
echo.

call %SENSEI_PACKAGE_RUNNER% editor
if errorlevel 1 goto :failed
exit /b 0

:failed
echo.
echo The editor did not start. Review the message above.
echo.
pause
exit /b 1

:node_error
echo ERROR: Sensei requires Node.js 24, but a compatible runtime was not found.
echo Install Node.js 24 or make it available on PATH, then run this launcher again.
goto :failed
