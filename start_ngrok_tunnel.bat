@echo off
title MediRead AI Permanent API Tunnel
echo ========================================================
echo   KHOI DONG NGROK PERMANENT TUNNEL - MEDIREAD AI BACKEND
echo ========================================================
echo Link co dinh vinh vien 100%%:
echo https://supersulfureted-superciliously-kasen.ngrok-free.dev
echo ========================================================
"%~dp0ngrok.exe" http 8000 --url https://supersulfureted-superciliously-kasen.ngrok-free.dev
pause
