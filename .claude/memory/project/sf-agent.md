# SaaS Factory Agent — Proyecto Hermano

## Que es
App de escritorio (Electron) que corre en segundo plano en la maquina del usuario.
Actua como "las manos" mientras SF Manager (Vercel) es "el cerebro".

## Ubicacion
`/Users/ricardomarchetti/ProyectosIA/AplicacionesSaas/SaasFactoryAgent/`

## Stack
Electron 34 + React 19 + TypeScript + Tailwind + Vite

## Tablas Supabase (compartidas)
- `agent_instances` — maquinas con agente instalado
- `agent_commands` — cola de comandos web → agente
- `sync_configs` — config de sync por proyecto/provider
- `sync_history` — historial de syncs

## Estado (2026-03-23)
- Scaffolding completo: main process, preload, renderer con 6 paginas
- Core: scanner + git-reader portados de SF Manager
- Tablas Supabase creadas con RLS
- Git repo inicializado
- Pendiente: npm install, primer run, conectar con Supabase, iCloud sync
