# TAREH Admin Dashboard

React + TypeScript + Vite 8 starter for the Arabic RTL administration application.

## Requirements
- Node.js 24.15.0 or newer.
- npm.

## Local setup

    cd admin
    npm install
    cp .env.example .env
    npm run dev

PowerShell:

    Copy-Item .env.example .env
    npm install
    npm run dev

Open http://localhost:5173.

## Current implementation
- Premium dark Arabic RTL layout.
- Reads public today's matches and leagues from the backend.
- Handles loading, API errors and empty data.
- Shows match counts, live count and enabled leagues from server responses.

## Not yet implemented
- Admin authentication and session handling.
- Protected admin routes and role management.
- CRUD operations and result finalization.
- Provider configuration and sync management.
- User and prediction administration.

This is a development shell, not a production admin console. Keep protected admin functionality disabled until backend authentication and authorization are implemented.
