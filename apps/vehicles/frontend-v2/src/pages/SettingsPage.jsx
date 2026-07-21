import AppIcon from '../components/ui/AppIcon';

export default function SettingsPage() {
  return (
    <section>
      <div className="section-head">
        <div>
          <h2 className="title-with-icon">
            <AppIcon name="lock" size={20} weight="duotone" />
            <span>Nastavení</span>
          </h2>
          <p className="muted">Sekce Nastavení je dostupná pouze rolím superadmin a administrator.</p>
        </div>
      </div>

      <div className="status-box">
        Sekce Nastavení je zatím v přípravě. Detaily doplníme v další etapě.
      </div>
    </section>
  );
}
