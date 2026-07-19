import AppIcon from '../components/ui/AppIcon';

export default function VehicleMapPage() {
  return (
    <section className="mapa-page">
      <header className="mapa-page-head">
        <h2>Mapa vozidel</h2>
        <p className="muted">Interaktivní mapa bude doplněna v další fázi.</p>
      </header>

      <div className="mapa-coming-soon" role="status" aria-live="polite">
        <div className="mapa-coming-soon-glow" aria-hidden="true" />
        <div className="mapa-coming-soon-grid" aria-hidden="true" />

        <div className="mapa-coming-soon-content">
          <span className="mapa-coming-soon-icon" aria-hidden="true">
            <AppIcon name="map" size={38} weight="duotone" />
          </span>
          <h3>Implementováno brzy</h3>
          <p>
            Připravujeme mapový přehled s živou polohou vozidel, skupinovými vrstvami a rychlým přepínáním podle stavu.
          </p>
        </div>
      </div>
    </section>
  );
}
