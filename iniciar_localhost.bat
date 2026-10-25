@echo off
chcp 65001 >nul
title CinePWA - Servidor Local
cd /d "%~dp0"

echo ========================================================
echo               CinePWA - Servidor Local
echo ========================================================
echo.

:: Verifica se a pasta node_modules existe
if not exist "node_modules\" (
    echo [INFO] Instalando dependencias necessarias...
    call npm install
    if errorlevel 1 (
        echo [ERRO] Falha ao instalar dependencias.
        pause
        exit /b %errorlevel%
    )
)

echo.
echo [INFO] Iniciando servidor Vite em localhost...
echo [INFO] Pressione CTRL+C na janela para encerrar o servidor.
echo.

:: Inicia o servidor e abre automaticamente o navegador padrao
call npm run dev -- --open --host

if errorlevel 1 (
    echo.
    echo [ERRO] O servidor encerrou com erro.
    pause
)
