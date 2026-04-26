# Dentists of West Henderson — Operatory Status Board

Real-time dental operatory tracking system.
Runs on Raspberry Pi 5, displays on tablets and TV.

## Files
- server.js — Node.js + Socket.io server (runs on Pi)
- master-tablet-preview.jsx — Master control tablet
- frontdesk-tablet-preview.jsx — Front desk tablet
- tv-preview.jsx — 43" TV display
- op-tablet-preview.jsx — Per-operatory tablet
- PROJECT_STATE.md — Full project documentation

## Pi Deployment
SSH: actang13@192.168.0.144
Deploy path: /home/actang13/opboard/
Restart: sudo systemctl restart opboard
