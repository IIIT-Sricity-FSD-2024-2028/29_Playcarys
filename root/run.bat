@echo off
setlocal enabledelayedexpansion
title PlayCarys

REM ===================================================================
REM  PlayCarys - start everything, print the links, stay out of the way.
REM
REM  Local servers first, then the public link, then the addresses.
REM
REM  Every process goes through hidden.vbs: no window, no taskbar icon,
REM  properly detached. Each argument is passed as ONE plain quoted string
REM  and the commands use relative paths, so nothing here ever has to nest
REM  a quote inside a quote - that is what silently broke an earlier
REM  version and started nothing at all.
REM
REM  `ping` is the sleep, not `timeout`: timeout reads the console and dies
REM  with "Input redirection is not supported" whenever this file is run
REM  from anything other than a double-click.
REM ===================================================================

cd /d "%~dp0"
if not exist "logs" mkdir "logs"

if not exist "back-end\dist\main.js" (
    echo.
    echo   Building the server once, this takes a minute...
    pushd back-end
    call npm run build
    popd
)

cls
echo.
echo   PlayCarys
echo.
echo   starting servers...

wscript //nologo "%~dp0hidden.vbs" "node dist\main.js"    "%~dp0back-end"  "%~dp0logs\backend.log"
wscript //nologo "%~dp0hidden.vbs" "node dev-server.js"   "%~dp0front-end" "%~dp0logs\frontend.log"

REM Wait for the API to actually answer. curl ships with Windows 10 and 11.
set "READY="
for /l %%i in (1,1,30) do (
    if not defined READY (
        curl -s -o nul -m 2 http://localhost:3000/api/v1/ && set "READY=1"
        if not defined READY ping 127.0.0.1 -n 2 >nul
    )
)

echo   starting public link...
del /q "%~dp0logs\tunnel.log" 2>nul
wscript //nologo "%~dp0hidden.vbs" "node node_modules\localtunnel\bin\lt.js --port 8080" "%~dp0front-end" "%~dp0logs\tunnel.log"

set "PUBURL="
for /l %%i in (1,1,25) do (
    if not defined PUBURL (
        ping 127.0.0.1 -n 2 >nul
        for /f "tokens=4" %%u in ('findstr /c:"your url is" "%~dp0logs\tunnel.log" 2^>nul') do set "PUBURL=%%u"
    )
)

REM The address other laptops on this Wi-Fi should open.
REM
REM Read back from the server's own log rather than parsed out of ipconfig.
REM ipconfig lists adapters in no useful order, so the first IPv4 on this
REM laptop is 192.168.56.1 - the VirtualBox host-only adapter, which no other
REM machine can reach. dev-server.js asks the OS which address it would
REM actually route through, and prints that.
set "LANURL="
for /f "tokens=3" %%a in ('findstr /c:"lan address" "%~dp0logs\frontend.log" 2^>nul') do set "LANURL=%%a"

cls
echo.
echo   PlayCarys is running
echo.
echo     Local      http://localhost:8080
if defined LANURL echo     Wi-Fi      !LANURL!
if defined PUBURL (
    echo     Public     !PUBURL!
) else (
    echo     Public     unavailable - see logs\tunnel.log
)
echo.
if not defined READY echo   NOTE: the API was slow to start. If sign-in fails, wait a moment and refresh.
echo   Close this window to stop PlayCarys.
echo.

start "" http://localhost:8080
pause >nul

REM Closing the window stops everything - that is the whole "stop" story.
taskkill /f /im node.exe >nul 2>&1
