# Icon schema for frontend-v2

Single icon library for the project:
- `@phosphor-icons/react`

Rules:
- Use only `AppIcon` from `src/components/ui/AppIcon.jsx`.
- Do not import icons directly in feature components.
- For icon-only buttons, always set `title` and `aria-label`.
- Use theme/context naming from `AppIcon` map (`vehicles`, `sync`, `db`, `warning`, etc.).

Current implementation coverage:
- Sidebar navigation and topbar controls in `src/layout/AppShell.jsx`
- Vehicles overview action buttons in `src/components/vehicles/OverviewActionButtons.jsx`
- Vehicles overview title in `src/pages/VehiclesOverviewPage.jsx`
- Login feature bullets in `src/pages/LoginPage.jsx`
