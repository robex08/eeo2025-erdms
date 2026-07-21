import AppIcon from '../components/ui/AppIcon';

export default function LookupsPage() {
  return (
    <section>
      <div className="section-head">
        <div>
          <h2 className="title-with-icon">
            <AppIcon name="db" size={20} weight="duotone" />
            <span>Číselníky</span>
          </h2>
          <p className="muted">Správa číselníků v2 je dostupná pouze rolím superadmin a administrator.</p>
        </div>
      </div>

      <div className="status-box">
        Sekce Číselníky je připravená pro navazující správu položek podle kategorií.
      </div>
    </section>
  );
}
