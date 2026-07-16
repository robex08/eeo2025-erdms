export default function LegacyPage() {
  return (
    <section>
      <h2>Legacy přehled vozidel</h2>
      <p className="muted">
        Tato stránka je záměrně ponechána pro testování a porovnání. Zůstává deprecated, dokud frontend v2 a API v2
        neprojdou validací na DEV.
      </p>
      <a className="btn btn-ghost" href="/vehicles" target="_blank" rel="noreferrer">
        Otevřít legacy aplikaci
      </a>
    </section>
  );
}
