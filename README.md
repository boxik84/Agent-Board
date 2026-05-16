# AgentBoard

**AI Agent Orchestration Platform** — interný operačný systém pre riadenie AI agentov, úloh a tímovej spolupráce.

## O projekte

AgentBoard je full-stack platforma inšpirovaná Paperclip AI, postavená pre reálne nasadenie AI agentov v spoločnosti. Umožňuje sledovať, riadiť a komunikovať s AI agentmi cez jednotné rozhranie.

### Hlavné funkcie

- **Dashboard** — prehľad aktivít agentov, náklady, behy, tickety
- **Inbox** — správy od agentov vyžadujúce schválenie (hire requests, task requests)
- **Agenti** — individuálne stránky každého agenta s tabmi: Dashboard, Instrukcie, Skills, Konfigurácia, Behy, Rozpočet
- **Board of Directors** — Boxik (Chairman), Ángel Muerto (Vice Chairman · CTO), Torl_ (Chief of Admin)
- **Org Chart** — hierarchia celého tímu
- **Úlohy** — kanban board (Backlog / In Progress / Review / Done), priradenie BoD členom alebo agentom
- **Office** — live vizualizácia kancelárie, agenti sa pohybujú medzi stolmi a poradami
- **Heartbeats** — sledovanie behov agentov, logy, spúšťanie manuálnych behov
- **Rozpočty** — mesačné náklady per agent
- **Aktivita** — timeline udalostí v spoločnosti

## Tech Stack

| Vrstva | Technológia |
|--------|------------|
| Frontend | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui (OKLCH dark theme) |
| Backend | Node.js + Fastify |
| Databáza | SQLite + Drizzle ORM |
| Auth | JWT |
| Monorepo | pnpm workspaces |

## Štruktúra

```
agentboard/
├── apps/
│   ├── api/          # Fastify backend (port 3001)
│   └── web/          # React/Vite frontend (port 5173)
└── packages/
    └── db/           # Drizzle schema + migrations
```

## Lokálne spustenie

```bash
# Inštalácia závislostí
pnpm install

# Spustenie (API + web súčasne)
pnpm --filter api dev
pnpm --filter web dev
```

Frontend: http://localhost:5173  
API: http://localhost:3001

## Prvé prihlásenie

Pri prvom spustení sa automaticky vytvorí spoločnosť. Zaregistruj sa na `/login`.

---

*Interný projekt — The Open Company*
