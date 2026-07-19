export default function LegacyPage() {
  return (
    <section>
      <h2>Původní přehled vozidel</h2>
      <p className="muted">
        Tato stránka je ponechána pouze pro interní porovnání. Pro běžnou práci používejte hlavní přehled vozidel.
      </p>
      <a className="btn btn-ghost" href="/vehicles" target="_blank" rel="noreferrer">
        Otevřít hlavní přehled
      </a>
    </section>
  );
}
