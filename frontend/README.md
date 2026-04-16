# EaseMove Frontend

React 18 + Vite frontend for EaseMove Melbourne.

## Run Locally

```bash
npm install
npm run dev
```

Create `frontend/.env.local`:

```text
VITE_API_BASE_URL=http://localhost:3000
```

## Key Files

| File | Purpose |
| --- | --- |
| `src/app/App.tsx` | Main application UI, tabs, score cards, comparison, comfort preferences |
| `src/components/LeafletMap.tsx` | Vanilla Leaflet map managed through React refs |
| `src/hooks/usePrecincts.ts` | Polls the backend every 5 minutes |
| `src/lib/api.ts` | Backend API client and comfort weight localStorage helpers |
| `src/app/components/ui/` | Shadcn UI components |

## Notes

- Comfort weights are saved in localStorage with the key `easemove_weights`.
- The frontend sends comfort weights to the backend using query parameters so returned scores use the selected weighting.
- No user account, GPS tracking, or personal data is collected.
