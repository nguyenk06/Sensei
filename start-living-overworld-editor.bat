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
set "SENSEI_CODEX_ROOT=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node"
set "SENSEI_CODEX_NODE=%SENSEI_CODEX_ROOT%\bin"
if not exist "%SENSEI_CODEX_NODE%\node.exe" goto :node_error
set "PATH=%SENSEI_CODEX_NODE%;%PATH%"
set "SENSEI_NODE_EXE=%SENSEI_CODEX_NODE%\node.exe"
for /f %%V in ('node.exe -p "process.versions.node.split('.')[0]"') do set "SENSEI_NODE_MAJOR=%%V"
if not "%SENSEI_NODE_MAJOR%"=="24" goto :node_error

:node_ready
if not defined SENSEI_NODE_EXE set "SENSEI_NODE_EXE=node.exe"
for /f %%V in ('node.exe --version') do echo Using Node.js %%V

if not defined SENSEI_CODEX_ROOT set "SENSEI_CODEX_ROOT=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node"
set "SENSEI_CODEX_PNPM=%SENSEI_CODEX_ROOT%\node_modules\pnpm\bin\pnpm.mjs"
if exist "%SENSEI_CODEX_PNPM%" (
  set "SENSEI_PACKAGE_RUNNER=codex-pnpm"
  goto :launch
)

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
  echo Launcher prerequisites are available using %SENSEI_PACKAGE_RUNNER%.
  exit /b 0
)

echo Starting the local editor at:
echo http://127.0.0.1:4174/tools/living-overworld-editor/
echo.
echo Keep this window open while using the editor.
echo Press Ctrl+C here when you are finished.
echo.

if "%SENSEI_PACKAGE_RUNNER%"=="codex-pnpm" goto :launch_codex_pnpm
call %SENSEI_PACKAGE_RUNNER% editor
goto :launch_result

:launch_codex_pnpm
"%SENSEI_NODE_EXE%" "%SENSEI_CODEX_PNPM%" editor

:launch_result
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
