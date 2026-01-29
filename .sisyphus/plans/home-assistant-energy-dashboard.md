# Work Plan: Home Assistant Energy Dashboard

**Created**: 2026-01-29
**Status**: Draft

## Overview

Integrate Home Assistant to display solar and battery energy data on an 800x480 color e-ink display. The dashboard will show real-time metrics and a rolling 24-hour historical graph.

## Requirements Summary

| Requirement | Decision |
|-------------|----------|
| Data Source | Home Assistant REST API (public HTTPS) |
| Token Storage | `.env` (dev) / Coolify secrets (prod) |
| Entities | `sensor.pv_power`, `sensor.battery_state_of_charge`, `sensor.active_power`, `sensor.house_consumption` |
| Priority Metrics | Battery SOC (%), PV Power (W), House Consumption (W) |
| Graph | Server-rendered SVG, rolling 24 hours, all 3 power metrics |
| Y-Axis | Auto-scale based on max value |
| Update Model | Pull live on each request |
| Error Handling | Show error screen when HA unreachable |
| Timezone | Configurable via `TZ` env var |
| Icons | Emoji (test on display, fallback to SVG if needed) |

## Target Layout

```
┌────────────────────────────────────────────────────────────────┐
│  🔋 85%      ☀️ 3.2kW      🏠 1.4kW              12:34 PM     │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│                                                                │
│              [SVG Graph: Rolling 24h Power]                    │
│                                                                │
│              — PV  — House  — Grid                             │
│                                                                │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

- **Header**: Key metrics + current time (serves as "last updated")
- **Main**: SVG graph (~380px height, more space without footer)

## Environment Variables

```env
# Required
HA_URL=https://your-homeassistant.duckdns.org
HA_TOKEN=your_long_lived_access_token

# Optional
TZ=Australia/Sydney  # Default: UTC
```

## Technical Design

### Architecture

```
Request → index.ts → fetchHomeAssistant() → renderDashboard()
                           ↓
                    HA REST API (/api/states, /api/history)
                           ↓
                    Parse & Transform Data
                           ↓
                    Generate SVG Graph
                           ↓
                    Render HTML Response
```

### File Structure (After Implementation)

```
power-terminal/
├── index.ts                    # Server entry point + routing
├── src/
│   ├── config.ts               # Environment config loader
│   ├── types.ts                # TypeScript interfaces
│   ├── services/
│   │   └── homeAssistant.ts    # HA API client
│   ├── components/
│   │   ├── dashboard.ts        # Main dashboard renderer
│   │   ├── metrics.ts          # Metric cards (battery, solar, etc)
│   │   ├── graph.ts            # SVG graph generator
│   │   └── error.ts            # Error screen renderer
│   └── utils/
│       └── format.ts           # Number/date formatting
├── .env.example                # Example environment file
└── .env                        # Local secrets (gitignored)
```

### Home Assistant API Endpoints

1. **Current State** - `GET /api/states/{entity_id}`
   - Returns current value, unit, last_changed
   - Auth: `Authorization: Bearer {token}`

2. **History** - `GET /api/history/period/{start_time}?filter_entity_id={ids}`
   - Returns array of state changes over time
   - Will fetch last 24 hours for graph data
   - Downsample to ~288 points (5-min intervals) for SVG performance

### Data Formatting

| Metric | Raw | Display |
|--------|-----|---------|
| PV Power | 3200 W | 3.2kW (≥1000W) or 850W (<1000W) |
| House Consumption | 1450 W | 1.5kW |
| Grid Power | -500 W | -0.5kW (negative = export) |
| Battery SOC | 85 | 85% |

### Error States

| Condition | Display |
|-----------|---------|
| Network error | Error screen: "Unable to connect to Home Assistant" |
| Auth error (401/403) | Error screen: "Authentication failed - check HA_TOKEN" |
| Entity not found | Error screen: "Entity not found: {entity_id}" |
| Entity unavailable | Show "—" for that metric, continue rendering others |
| Timeout (>10s) | Error screen: "Home Assistant not responding" |

### SVG Graph Specifications

- **Dimensions**: 760px wide × 350px tall (with padding)
- **Time Range**: Rolling 24 hours
- **Lines**: 
  - PV Power: Yellow/Orange (#F59E0B)
  - House Consumption: Blue (#3B82F6)  
  - Grid Power: Green (#10B981) for import, Red (#EF4444) for export
- **Y-Axis**: Auto-scale, labeled in kW
- **X-Axis**: Time labels every 4 hours
- **Legend**: Below graph with line samples

## Implementation Tasks

### Phase 1: Foundation
- [ ] Create project structure (`src/` directory, files)
- [ ] Set up configuration loader (`src/config.ts`)
- [ ] Create TypeScript interfaces (`src/types.ts`)
- [ ] Create `.env.example` with documented variables
- [ ] Add `.env` to `.gitignore`

### Phase 2: Home Assistant Integration
- [ ] Implement HA API client (`src/services/homeAssistant.ts`)
  - [ ] `fetchCurrentState(entityId)` - get current sensor value
  - [ ] `fetchHistory(entityIds, hours)` - get historical data
  - [ ] Error handling with typed errors
  - [ ] Request timeout (10 seconds)

### Phase 3: Data Processing
- [ ] Implement data transformation utilities
  - [ ] Parse HA state responses
  - [ ] Downsample history to 5-minute intervals
  - [ ] Handle missing/unavailable data points
- [ ] Implement formatting utilities (`src/utils/format.ts`)
  - [ ] `formatPower(watts)` - W or kW with appropriate precision
  - [ ] `formatPercent(value)` - percentage display
  - [ ] `formatTime(date, timezone)` - localized time

### Phase 4: UI Components
- [ ] Implement error screen (`src/components/error.ts`)
- [ ] Implement metric cards (`src/components/metrics.ts`)
  - [ ] Battery SOC with emoji
  - [ ] PV Power with emoji
  - [ ] House Consumption with emoji
  - [ ] Current time
- [ ] Implement SVG graph (`src/components/graph.ts`)
  - [ ] Coordinate system and scaling
  - [ ] Line rendering for each metric
  - [ ] Axis labels and grid lines
  - [ ] Legend
- [ ] Implement main dashboard (`src/components/dashboard.ts`)
  - [ ] Compose all components

### Phase 5: Integration
- [ ] Update `index.ts` to use new components
- [ ] Wire up HA data fetching on request
- [ ] Add error boundary (catch all errors → error screen)

### Phase 6: Testing & Polish
- [ ] Test with real Home Assistant instance
- [ ] Verify rendering on e-ink display
- [ ] Test error states (disconnect HA, invalid token, etc.)
- [ ] Test timezone handling
- [ ] Performance check (should render <3 seconds)

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| HA history API returns too many data points | Downsample to 288 points max |
| Emoji don't render on e-ink | Ready to swap for inline SVG icons |
| HA API slow/timeout | 10 second timeout, error screen |
| Graph Y-axis has extreme outliers | Consider 95th percentile scaling (future) |

## Out of Scope

- Local data caching/storage
- Additional sensors beyond the 4 specified
- Interactive graph (zoom, pan, tooltips)
- Multi-language support
- Historical data beyond 24 hours
- WebSocket real-time updates

## Definition of Done

- [ ] Dashboard displays all 4 metrics with correct formatting
- [ ] Rolling 24-hour SVG graph renders correctly
- [ ] Current time displays in configured timezone (header serves as last updated)
- [ ] Error screen shows when HA unreachable
- [ ] Works on 800x480 color e-ink display
- [ ] Page renders in <3 seconds
