/**
 * BACKUP: Standalone Věcná správnost section from OrderForm25.js
 * Date: 2024
 * Lines: 22119-23149 (1031 lines)
 * 
 * This section will be removed and replaced with per-invoice checkboxes
 * Kept for reference and potential rollback
 */

              {/* ✅ SEKCE: VĚCNÁ SPRÁVNOST - FÁZE 7 */}
              {vecnaSpravnostState.visible && (() => {
                // ✅ isPokladna už máme z workflowManager (globálně dostupné)

                return (
                  <FormSection data-section="vecna_spravnost">
                    <SectionHeader
                      sectionTheme="section-orange"
                      isActive={true}
                      style={{
                        background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
                        borderColor: '#0d9488'
                      }}
                    >
                      <SectionTitle sectionTheme="section-orange" style={{ color: '#fff' }}>
                        <SectionIcon sectionTheme="section-orange" style={{ color: '#fff' }}>
                          <FontAwesomeIcon icon={faCheckCircle} />
                        </SectionIcon>
                        Věcná správnost objednávky
                        {/* ❌ Nezobrazovat zámek když je globální lock (shouldLockAllSections) */}
                        {isVecnaSpravnostLocked && !shouldLockAllSections && (
                          <LockWarning title="Sekce je zamčena - věcná správnost již byla potvrzena">
                            🔒 Sekce zamčena
                          </LockWarning>
                        )}
                      </SectionTitle>

                      <SectionControls>
                        {/* ❌ Nezobrazovat tlačítko odemknutí když je globální lock (shouldLockAllSections) */}
                        {isVecnaSpravnostLocked && !shouldLockAllSections && canEditApprovedSections && (
                          <UnlockButton
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowUnlockVecnaSpravnostConfirm(true);
                            }}
                            title="Odemknout sekci Věcná správnost"
                          >
                            <Unlock />
                          </UnlockButton>
                        )}
                        <CollapseIcon
                          collapsed={sectionStates.vecna_spravnost}
                          onClick={() => toggleSection('vecna_spravnost')}
                          style={{ color: '#fff', cursor: 'pointer' }}
                        >
                          <FontAwesomeIcon icon={faChevronUp} />
                        </CollapseIcon>
                      </SectionControls>
                    </SectionHeader>

                    <SectionContent collapsed={sectionStates.vecna_spravnost}>
                      <div style={{ padding: '1rem 0' }}>
                        {/* Informační box */}
                        <div style={{
                          background: '#f0fdfa',
                          border: '1px solid #14b8a6',
                          borderRadius: '8px',
                          padding: '1rem',
                          marginBottom: '1.5rem'
                        }}>
                          <div style={{ fontWeight: '600', color: '#0f766e', marginBottom: '0.75rem' }}>
                            📋 Kontrola věcné správnosti
                          </div>
                          <div style={{ fontSize: '0.875rem', color: '#134e4a', lineHeight: '1.6' }}>
                            {isPokladna
                              ? 'Zkontrolujte prosím všechny údaje objednávky a ověřte jejich správnost.'
                              : 'Porovnejte údaje z objednávky a faktury a ověřte jejich správnost.'
                            }
                          </div>
                        </div>

                        {/* GRID LAYOUT - DVA SLOUPCE pro FAKTURU, JEDEN SLOUPEC pro POKLADNU */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: isPokladna ? '1fr' : '1fr 1fr',
                          gap: '1.5rem',
                          marginBottom: '1.5rem'
                        }}>

                          {/* LEVÝ SLOUPEC - OBJEDNÁVKA */}
                          <div style={{
                            border: '2px solid #3b82f6',
                            borderRadius: '12px',
                            padding: '1.25rem',
                            background: '#eff6ff'
                          }}>
                            <div style={{
                              fontWeight: '700',
                              fontSize: '1.1rem',
                              color: '#1e40af',
                              marginBottom: '1.25rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem'
                            }}>
                              📄 OBJEDNÁVKA
                            </div>

                            {/* MAX Cena */}
                            <div style={{ marginBottom: '1.25rem' }}>
                              <div style={{
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                color: '#1e40af',
                                marginBottom: '0.5rem',
                                textTransform: 'uppercase'
                              }}>
                                Max. cena s DPH
                              </div>
                              <div style={{
                                fontSize: '1.25rem',
                                fontWeight: '700',
                                color: '#1e3a8a',
                                background: '#dbeafe',
                                padding: '0.75rem',
                                borderRadius: '6px',
                                border: '1px solid #93c5fd',
                                textAlign: 'right'
                              }}>
                                {formData.max_cena_s_dph ? `${parseFloat(formData.max_cena_s_dph).toLocaleString('cs-CZ')} Kč` : '---'}
                              </div>
                            </div>

                            {/* Střediska */}
                            <div style={{ marginBottom: '1.25rem' }}>
                              <div style={{
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                color: '#1e40af',
                                marginBottom: '0.5rem',
                                textTransform: 'uppercase'
                              }}>
                                Střediska
                              </div>
                              <div style={{
                                fontSize: '0.95rem',
                                color: '#1e3a8a',
                                background: '#dbeafe',
                                padding: '0.75rem',
                                borderRadius: '6px',
                                border: '1px solid #93c5fd',
                                minHeight: '2.5rem'
                              }}>
                                {(() => {
                                  if (!formData.strediska_kod || formData.strediska_kod.length === 0) return '---';
                                  const strediskaNames = formData.strediska_kod.map(kod => {
                                    const strediskoOption = strediskaOptions.find(opt =>
                                      opt.kod === kod ||
                                      opt.value === kod ||
                                      opt.kod_stavu === kod
                                    );
                                    return strediskoOption ? (strediskoOption.nazev || strediskoOption.label || strediskoOption.nazev_stavu || kod) : kod;
                                  });
                                  return strediskaNames.join(', ');
                                })()}
                              </div>
                            </div>

                            {/* Položky */}
                            <div>
                              <div style={{
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                color: '#1e40af',
                                marginBottom: '0.5rem',
                                textTransform: 'uppercase'
                              }}>
                                Položky objednávky ({formData.polozky?.length || 0})
                              </div>
                              <div style={{
                                background: '#dbeafe',
                                padding: '0.75rem',
                                borderRadius: '6px',
                                border: '1px solid #93c5fd'
                              }}>
                                {formData.polozky && formData.polozky.length > 0 ? (
                                  formData.polozky.map((polozka, index) => (
                                    <div key={index} style={{
                                      background: '#fff',
                                      padding: '0.75rem',
                                      borderRadius: '4px',
                                      marginBottom: index < formData.polozky.length - 1 ? '0.5rem' : '0',
                                      border: '1px solid #bfdbfe'
                                    }}>
                                      <div style={{ fontWeight: '600', fontSize: '0.875rem', color: '#1e40af', marginBottom: '0.5rem' }}>
                                        {index + 1}. {polozka.nazev || polozka.popis || 'Položka bez názvu'}
                                      </div>
                                      <div style={{ fontSize: '0.75rem', color: '#1e3a8a', lineHeight: '1.5' }}>
                                        {/* Ceny */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem', marginBottom: '0.5rem' }}>
                                          <div><strong>Cena bez DPH:</strong> {polozka.cena_bez_dph ? `${parseFloat((polozka.cena_bez_dph || '0').toString().replace(/[^\d,.-]/g, '').replace(',', '.')).toLocaleString('cs-CZ')} Kč` : '---'}</div>
                                          <div><strong>Cena s DPH:</strong> {polozka.cena_s_dph ? `${parseFloat((polozka.cena_s_dph || '0').toString().replace(/[^\d,.-]/g, '').replace(',', '.')).toLocaleString('cs-CZ')} Kč` : '---'}</div>
                                        </div>

                                        {/* 🎯 LP kód položky */}
                                        {(() => {
                                          // Najít LP data - buď z backendu (lp_kod) nebo z lpOptionsForItems
                                          const lpData = polozka.lp_kod 
                                            ? { kod: polozka.lp_kod, nazev: polozka.lp_nazev, jeVBE: true }
                                            : lpOptionsForItems.find(lp => lp.id === polozka.lp_id);
                                          
                                          if (!lpData && !polozka.lp_id) return null;
                                          
                                          const isValid = polozka.lp_je_platne !== false; // Default true pokud není specifikováno
                                          
                                          return (
                                            <div style={{
                                              display: 'inline-block',
                                              background: isValid ? '#dcfce7' : '#fee2e2',
                                              color: isValid ? '#166534' : '#991b1b',
                                              padding: '0.35rem 0.6rem',
                                              borderRadius: '4px',
                                              fontSize: '0.7rem',
                                              fontWeight: '600',
                                              marginBottom: '0.5rem',
                                              border: `1px solid ${isValid ? '#86efac' : '#fecaca'}`
                                            }}>
                                              🎯 LP: {lpData ? `${lpData.kod || lpData.label || `ID:${polozka.lp_id}`}` : `LP ID: ${polozka.lp_id}`}
                                              {lpData?.nazev && ` - ${lpData.nazev}`}
                                              {!isValid && ' ⚠️'}
                                            </div>
                                          );
                                        })()}

                                        {/* Umístění - Úsek, Budova, Místnost na jeden řádek */}
                                        <div style={{
                                          display: 'flex',
                                          gap: '0.5rem',
                                          fontSize: '0.7rem',
                                          color: '#6b7280',
                                          background: '#f0f9ff',
                                          padding: '0.35rem 0.5rem',
                                          borderRadius: '3px',
                                          border: '1px solid #e0f2fe'
                                        }}>
                                          <span><strong>Úsek:</strong> {polozka.vecna_spravnost_usek || '---'}</span>
                                          <span>•</span>
                                          <span><strong>Budova:</strong> {polozka.vecna_spravnost_budova || '---'}</span>
                                          <span>•</span>
                                          <span><strong>Místnost:</strong> {polozka.vecna_spravnost_mistnost || '---'}</span>
                                        </div>

                                        {polozka.vecna_spravnost_poznamka && (
                                          <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #e0e7ff', fontSize: '0.7rem' }}>
                                            <strong>Poznámka:</strong> {polozka.vecna_spravnost_poznamka}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div style={{ fontSize: '0.875rem', color: '#6b7280', textAlign: 'center', padding: '0.5rem' }}>
                                    Žádné položky
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* PRAVÝ SLOUPEC - FAKTURA - POUZE PRO REŽIM FAKTURA */}
                          {!isPokladna && (
                          <div style={{
                            border: '2px solid #8b5cf6',
                            borderRadius: '12px',
                            padding: '1.25rem',
                            background: '#f5f3ff'
                          }}>
                            <div style={{
                              fontWeight: '700',
                              fontSize: '1.1rem',
                              color: '#6b21a8',
                              marginBottom: '1.25rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem'
                            }}>
                              🧾 FAKTURA
                            </div>

                            {/* Celková cena */}
                            <div style={{ marginBottom: '1.25rem' }}>
                              <div style={{
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                color: '#6b21a8',
                                marginBottom: '0.5rem',
                                textTransform: 'uppercase'
                              }}>
                                Celková cena s DPH
                              </div>
                              <div style={{
                                fontSize: '1.25rem',
                                fontWeight: '700',
                                color: '#581c87',
                                background: '#ede9fe',
                                padding: '0.75rem',
                                borderRadius: '6px',
                                border: '1px solid #c4b5fd',
                                textAlign: 'right'
                              }}>
                                {(() => {
                                  if (!formData.faktury || formData.faktury.length === 0) return '0 Kč';
                                  const totalAmount = formData.faktury.reduce((sum, faktura) => {
                                    const amount = parseFloat(faktura.fa_castka) || 0;
                                    return sum + amount;
                                  }, 0);
                                  return `${totalAmount.toLocaleString('cs-CZ')} Kč`;
                                })()}
                              </div>
                            </div>

                            {/* Střediska */}
                            <div style={{ marginBottom: '1.25rem' }}>
                              <div style={{
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                color: '#6b21a8',
                                marginBottom: '0.5rem',
                                textTransform: 'uppercase'
                              }}>
                                Střediska
                              </div>
                              <div style={{
                                fontSize: '0.95rem',
                                color: '#581c87',
                                background: '#ede9fe',
                                padding: '0.75rem',
                                borderRadius: '6px',
                                border: '1px solid #c4b5fd',
                                minHeight: '2.5rem'
                              }}>
                                {(() => {
                                  if (!formData.faktury || formData.faktury.length === 0) return '---';
                                  const uniqueStrediska = new Set();
                                  formData.faktury.forEach((faktura) => {
                                    const strediska = faktura.fa_strediska_kod;

                                    if (Array.isArray(strediska)) {
                                      strediska.forEach(s => {
                                        let nazev;
                                        if (typeof s === 'object' && s !== null) {
                                          if (s.nazev_stavu) {
                                            nazev = s.nazev_stavu;
                                          } else if (s.kod_stavu) {
                                            const strediskoOption = strediskaOptions.find(opt =>
                                              opt.kod === s.kod_stavu ||
                                              opt.value === s.kod_stavu ||
                                              opt.kod_stavu === s.kod_stavu
                                            );
                                            nazev = strediskoOption ? (strediskoOption.nazev || strediskoOption.label || strediskoOption.nazev_stavu || s.kod_stavu) : s.kod_stavu;
                                          } else {
                                            nazev = s.label || s.name || s.nazev || String(s);
                                          }
                                        } else if (typeof s === 'string') {
                                          const strediskoOption = strediskaOptions.find(opt =>
                                            opt.kod === s ||
                                            opt.value === s ||
                                            opt.kod_stavu === s
                                          );
                                          nazev = strediskoOption ? (strediskoOption.nazev || strediskoOption.label || strediskoOption.nazev_stavu || s) : s;
                                        } else {
                                          nazev = String(s);
                                        }

                                        if (nazev) uniqueStrediska.add(nazev);
                                      });
                                    } else if (typeof strediska === 'string' && strediska) {
                                      strediska.split(',').forEach(s => {
                                        const trimmed = s.trim();
                                        if (trimmed) {
                                          const strediskoOption = strediskaOptions.find(opt =>
                                            opt.kod === trimmed ||
                                            opt.value === trimmed ||
                                            opt.kod_stavu === trimmed
                                          );
                                          const nazev = strediskoOption ? (strediskoOption.nazev || strediskoOption.label || strediskoOption.nazev_stavu || trimmed) : trimmed;
                                          uniqueStrediska.add(nazev);
                                        }
                                      });
                                    }
                                  });
                                  const strediskaArray = Array.from(uniqueStrediska);
                                  return strediskaArray.length > 0 ? strediskaArray.join(', ') : '---';
                                })()}
                              </div>
                            </div>

                            {/* Položky z poznámky nebo rozšiřujících dat */}
                            <div>
                              <div style={{
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                color: '#6b21a8',
                                marginBottom: '0.5rem',
                                textTransform: 'uppercase'
                              }}>
                                Položky faktury
                              </div>
                              <div style={{
                                background: '#ede9fe',
                                padding: '0.75rem',
                                borderRadius: '6px',
                                border: '1px solid #c4b5fd'
                              }}>
                                {formData.faktury && formData.faktury.length > 0 ? (
                                  formData.faktury.map((faktura, fIndex) => (
                                    <div key={fIndex} style={{
                                      background: '#fff',
                                      padding: '0.75rem',
                                      borderRadius: '4px',
                                      marginBottom: fIndex < formData.faktury.length - 1 ? '0.5rem' : '0',
                                      border: '1px solid #ddd6fe'
                                    }}>
                                      <div style={{ fontWeight: '600', fontSize: '0.875rem', color: '#6b21a8', marginBottom: '0.5rem' }}>
                                        Faktura {fIndex + 1} {faktura.fa_cislo_vema ? `(${faktura.fa_cislo_vema})` : ''}
                                      </div>
                                      <div style={{ fontSize: '0.8rem', color: '#581c87', lineHeight: '1.5' }}>
                                        <div><strong>Částka celkem:</strong> {faktura.fa_castka ? `${parseFloat(faktura.fa_castka).toLocaleString('cs-CZ')} Kč` : '---'}</div>

                                        {/* Položky z rozšiřujících dat (ISDOC) */}
                                        {(() => {
                                          let polozky = null;

                                          // Pokusíme se získat položky z různých zdrojů
                                          if (faktura._isdoc_polozky && Array.isArray(faktura._isdoc_polozky)) {
                                            polozky = faktura._isdoc_polozky;
                                          } else if (faktura.rozsirujici_data) {
                                            try {
                                              const rozsirData = typeof faktura.rozsirujici_data === 'string'
                                                ? JSON.parse(faktura.rozsirujici_data)
                                                : faktura.rozsirujici_data;

                                              if (rozsirData?.isdoc?.polozky && Array.isArray(rozsirData.isdoc.polozky)) {
                                                polozky = rozsirData.isdoc.polozky;
                                              }
                                            } catch (e) {
                                            }
                                          }

                                          if (polozky && polozky.length > 0) {
                                            return (
                                              <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #e9d5ff' }}>
                                                <strong>Položky ({polozky.length}):</strong>
                                                <div style={{ marginTop: '0.5rem' }}>
                                                  {polozky.map((polozka, pIndex) => (
                                                    <div key={pIndex} style={{
                                                      background: '#faf5ff',
                                                      padding: '0.5rem',
                                                      borderRadius: '4px',
                                                      marginTop: pIndex > 0 ? '0.5rem' : '0',
                                                      border: '1px solid #e9d5ff',
                                                      fontSize: '0.75rem'
                                                    }}>
                                                      <div style={{ fontWeight: '600', marginBottom: '0.25rem', color: '#6b21a8' }}>
                                                        {pIndex + 1}. {polozka.popis || '---'}
                                                      </div>
                                                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem', fontSize: '0.7rem' }}>
                                                        <div><strong>Množství:</strong> {polozka.mnozstvi || '---'} {polozka.jednotka || ''}</div>
                                                        <div><strong>Cena/ks:</strong> {polozka.cena_za_jednotku ? `${parseFloat((polozka.cena_za_jednotku || '0').toString().replace(/[^\d,.-]/g, '').replace(',', '.')).toLocaleString('cs-CZ')} Kč` : '---'}</div>
                                                        <div><strong>Bez DPH:</strong> {polozka.cena_celkem_bez_dph ? `${parseFloat((polozka.cena_celkem_bez_dph || '0').toString().replace(/[^\d,.-]/g, '').replace(',', '.')).toLocaleString('cs-CZ')} Kč` : '---'}</div>
                                                        <div><strong>S DPH:</strong> {polozka.cena_celkem_s_dph ? `${parseFloat((polozka.cena_celkem_s_dph || '0').toString().replace(/[^\d,.-]/g, '').replace(',', '.')).toLocaleString('cs-CZ')} Kč` : '---'}</div>
                                                      </div>
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            );
                                          }

                                          return null;
                                        })()}

                                        {faktura.fa_poznamka && (
                                          <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #e9d5ff' }}>
                                            <strong>Poznámka:</strong>
                                            <div style={{ marginTop: '0.25rem', fontSize: '0.75rem' }}>
                                              {faktura.fa_poznamka}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div style={{ fontSize: '0.875rem', color: '#6b7280', textAlign: 'center', padding: '0.5rem' }}>
                                    Žádné faktury
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          )}
                        </div>

                        {/* ⚠️ POROVNÁNÍ CEN - Upozornění na překročení MAX ceny - POUZE PRO REŽIM FAKTURA */}
                        {!isPokladna && (() => {
                          const maxCena = parseFloat(formData.max_cena_s_dph) || 0;
                          const fakturyCelkem = formData.faktury ? formData.faktury.reduce((sum, faktura) => {
                            const amount = parseFloat(faktura.fa_castka) || 0;
                            return sum + amount;
                          }, 0) : 0;

                          const rozdil = fakturyCelkem - maxCena;
                          const prekroceno = rozdil > 0;
                          const jeVPoradku = maxCena > 0 && fakturyCelkem > 0 && !prekroceno;

                          // Zobrazit jen pokud jsou vyplněny obě částky
                          if (maxCena === 0 || fakturyCelkem === 0) return null;

                          // Pokud je cena v pořádku, zobrazit jen ✓ bez kalkulace
                          if (jeVPoradku) {
                            return (
                              <div style={{
                                background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                                border: '2px solid #22c55e',
                                borderRadius: '12px',
                                padding: '1rem',
                                marginBottom: '1.5rem',
                                boxShadow: '0 4px 12px rgba(34, 197, 94, 0.15)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem'
                              }}>
                                <div style={{ fontSize: '1.5rem' }}>✅</div>
                                <div>
                                  <div style={{ fontWeight: '700', fontSize: '1.1rem', color: '#15803d' }}>
                                    Cena faktury je v pořádku
                                  </div>
                                  <div style={{ fontSize: '0.875rem', color: '#14532d' }}>
                                    Faktura nepřekračuje schválenou maximální částku
                                  </div>
                                </div>
                              </div>
                            );
                          }

                          // Pokud je překročení, zobrazit kompletní kalkulaci
                          return (
                            <div style={{
                              background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                              border: '2px solid #ef4444',
                              borderRadius: '12px',
                              padding: '1.25rem',
                              marginBottom: '1.5rem',
                              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.15)'
                            }}>
                              {/* Hlavička */}
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                marginBottom: '1rem'
                              }}>
                                <div style={{ fontSize: '1.5rem' }}>⚠️</div>
                                <div>
                                  <div style={{
                                    fontWeight: '700',
                                    fontSize: '1.1rem',
                                    color: '#b91c1c',
                                    marginBottom: '0.25rem'
                                  }}>
                                    POZOR: Překročena MAX cena objednávky!
                                  </div>
                                  <div style={{
                                    fontSize: '0.875rem',
                                    color: '#7f1d1d'
                                  }}>
                                    Faktura přesahuje maximální schválenou částku
                                  </div>
                                </div>
                              </div>

                              {/* Tabulka porovnání */}
                              <div style={{
                                background: 'white',
                                borderRadius: '8px',
                                padding: '1rem',
                                marginBottom: '1rem'
                              }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                  <tbody>
                                    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                                      <td style={{ padding: '0.75rem 0', fontWeight: '600', color: '#374151' }}>
                                        MAX cena objednávky:
                                      </td>
                                      <td style={{ padding: '0.75rem 0', textAlign: 'right', fontWeight: '700', color: '#1e40af', fontFamily: 'monospace', fontSize: '1.1rem' }}>
                                        {maxCena.toLocaleString('cs-CZ')} Kč
                                      </td>
                                    </tr>
                                    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                                      <td style={{ padding: '0.75rem 0', fontWeight: '600', color: '#374151' }}>
                                        Celková cena s DPH:
                                      </td>
                                      <td style={{ padding: '0.75rem 0', textAlign: 'right', fontWeight: '700', color: '#6b21a8', fontFamily: 'monospace', fontSize: '1.1rem' }}>
                                        {fakturyCelkem.toLocaleString('cs-CZ')} Kč
                                      </td>
                                    </tr>
                                    <tr style={{ borderBottom: '2px solid #ef4444' }}>
                                      <td style={{ padding: '0.75rem 0', fontWeight: '700', color: '#111827', fontSize: '1.05rem' }}>
                                        Rozdíl (překročení schválené MAX ceny o):
                                      </td>
                                      <td style={{
                                        padding: '0.75rem 0',
                                        textAlign: 'right',
                                        fontWeight: '800',
                                        color: '#dc2626',
                                        fontFamily: 'monospace',
                                        fontSize: '1.2rem'
                                      }}>
                                        +{Math.abs(rozdil).toLocaleString('cs-CZ')} Kč
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>

                              {/* Popis/Nápověda */}
                              <div style={{
                                background: '#fee2e2',
                                border: '1px solid #fecaca',
                                borderRadius: '6px',
                                padding: '1rem',
                                fontSize: '0.875rem',
                                lineHeight: '1.6',
                                color: '#7f1d1d'
                              }}>
                                <div style={{ fontWeight: '700', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <span style={{ fontSize: '1.2rem' }}>💡</span>
                                  <span>Co to znamená?</span>
                                </div>
                                <ul style={{ margin: '0.5rem 0 0 1.5rem', paddingLeft: '0' }}>
                                  <li>Faktura <strong>překračuje maximální schválenou částku</strong> objednávky o <strong>{Math.abs(rozdil).toLocaleString('cs-CZ')} Kč</strong></li>
                                  <li>Před potvrzením věcné správnosti prosím ověřte, zda je toto překročení oprávněné <strong style={{ color: '#dc2626' }}>a napište do poznámky důvod.</strong></li>
                                  <li>Pokud je překročení v pořádku, můžete pokračovat v potvrzení</li>
                                  <li>Pokud není v pořádku, kontaktujte zadavatele nebo schvalovatele objednávky</li>
                                </ul>
                              </div>
                            </div>
                          );
                        })()}

                        {/* ⚠️ POROVNÁNÍ CEN PRO POKLADNA - kontrola součtu položek vůči MAX ceně */}
                        {isPokladna && (() => {
                          const maxCena = parseFloat(formData.max_cena_s_dph) || 0;

                          // Spočítat součet položek objednávky
                          const polozkycelkem = formData.polozky ? formData.polozky.reduce((sum, polozka) => {
                            const cenaSdph = parseFloat(polozka.cena_s_dph) || 0;
                            return sum + cenaSdph;
                          }, 0) : 0;

                          const rozdil = polozkycelkem - maxCena;
                          const prekroceno = rozdil > 0;
                          const jeVPoradku = maxCena > 0 && polozkycelkem > 0 && !prekroceno;

                          // Zobrazit jen pokud jsou vyplněny obě částky
                          if (maxCena === 0 || polozkycelkem === 0) return null;

                          // Pokud je cena v pořádku, zobrazit jen ✓ bez kalkulace
                          if (jeVPoradku) {
                            return (
                              <div style={{
                                background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                                border: '2px solid #22c55e',
                                borderRadius: '12px',
                                padding: '1rem',
                                marginBottom: '1.5rem',
                                boxShadow: '0 4px 12px rgba(34, 197, 94, 0.15)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem'
                              }}>
                                <div style={{ fontSize: '1.5rem' }}>✅</div>
                                <div>
                                  <div style={{ fontWeight: '700', fontSize: '1.1rem', color: '#15803d' }}>
                                    Cena položek je v pořádku
                                  </div>
                                  <div style={{ fontSize: '0.875rem', color: '#14532d' }}>
                                    Součet položek nepřekračuje schválenou maximální částku
                                  </div>
                                </div>
                              </div>
                            );
                          }

                          // Pokud je překročení, zobrazit kompletní kalkulaci
                          return (
                            <div style={{
                              background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                              border: '2px solid #ef4444',
                              borderRadius: '12px',
                              padding: '1.25rem',
                              marginBottom: '1.5rem',
                              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.15)'
                            }}>
                              {/* Hlavička */}
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                marginBottom: '1rem'
                              }}>
                                <div style={{ fontSize: '1.5rem' }}>⚠️</div>
                                <div>
                                  <div style={{
                                    fontWeight: '700',
                                    fontSize: '1.1rem',
                                    color: '#b91c1c',
                                    marginBottom: '0.25rem'
                                  }}>
                                    POZOR: Překročena MAX cena objednávky!
                                  </div>
                                  <div style={{
                                    fontSize: '0.875rem',
                                    color: '#7f1d1d'
                                  }}>
                                    Součet položek přesahuje maximální schválenou částku
                                  </div>
                                </div>
                              </div>

                              {/* Tabulka porovnání */}
                              <div style={{
                                background: 'white',
                                borderRadius: '8px',
                                padding: '1rem',
                                marginBottom: '1rem'
                              }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                  <tbody>
                                    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                                      <td style={{ padding: '0.75rem 0', fontWeight: '600', color: '#374151' }}>
                                        MAX cena objednávky:
                                      </td>
                                      <td style={{ padding: '0.75rem 0', textAlign: 'right', fontWeight: '700', color: '#1e40af', fontFamily: 'monospace', fontSize: '1.1rem' }}>
                                        {maxCena.toLocaleString('cs-CZ')} Kč
                                      </td>
                                    </tr>
                                    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                                      <td style={{ padding: '0.75rem 0', fontWeight: '600', color: '#374151' }}>
                                        Součet položek objednávky:
                                      </td>
                                      <td style={{ padding: '0.75rem 0', textAlign: 'right', fontWeight: '700', color: '#1e40af', fontFamily: 'monospace', fontSize: '1.1rem' }}>
                                        {polozkycelkem.toLocaleString('cs-CZ')} Kč
                                      </td>
                                    </tr>
                                    <tr style={{ borderBottom: '2px solid #ef4444' }}>
                                      <td style={{ padding: '0.75rem 0', fontWeight: '700', color: '#111827', fontSize: '1.05rem' }}>
                                        Rozdíl (překročení schválené MAX ceny o):
                                      </td>
                                      <td style={{
                                        padding: '0.75rem 0',
                                        textAlign: 'right',
                                        fontWeight: '800',
                                        color: '#dc2626',
                                        fontFamily: 'monospace',
                                        fontSize: '1.2rem'
                                      }}>
                                        +{Math.abs(rozdil).toLocaleString('cs-CZ')} Kč
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>

                              {/* Popis/Nápověda */}
                              <div style={{
                                background: '#fee2e2',
                                border: '1px solid #fecaca',
                                borderRadius: '6px',
                                padding: '1rem',
                                fontSize: '0.875rem',
                                lineHeight: '1.6',
                                color: '#7f1d1d'
                              }}>
                                <div style={{ fontWeight: '700', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <span style={{ fontSize: '1.2rem' }}>💡</span>
                                  <span>Co to znamená?</span>
                                </div>
                                <ul style={{ margin: '0.5rem 0 0 1.5rem', paddingLeft: '0' }}>
                                  <li>Součet položek <strong>překračuje maximální schválenou částku</strong> objednávky o <strong>{Math.abs(rozdil).toLocaleString('cs-CZ')} Kč</strong></li>
                                  <li>Před potvrzením věcné správnosti prosím ověřte, zda je toto překročení oprávněné <strong style={{ color: '#dc2626' }}>a napište do poznámky důvod.</strong></li>
                                  <li>Pokud je překročení v pořádku, můžete pokračovat v potvrzení</li>
                                  <li>Pokud není v pořádku, kontaktujte zadavatele nebo schvalovatele objednávky</li>
                                </ul>
                              </div>
                            </div>
                          );
                        })()}

                        {/* UMÍSTĚNÍ MAJETKU */}
                        <FormRow>
                          <FormGroup style={{ gridColumn: '1 / -1' }}>
                            <Label>UMÍSTĚNÍ MAJETKU</Label>
                            <TextArea
                              value={formData.vecna_spravnost_umisteni_majetku || ''}
                              onChange={(e) => handleInputChange('vecna_spravnost_umisteni_majetku', e.target.value)}
                              placeholder="Volný text o umístění majetku..."
                              rows={2}
                              disabled={isVecnaSpravnostLocked}
                              style={{
                                background: isVecnaSpravnostLocked ? '#f3f4f6' : undefined,
                                cursor: isVecnaSpravnostLocked ? 'not-allowed' : undefined,
                                opacity: isVecnaSpravnostLocked ? 0.6 : 1
                              }}
                            />
                            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                              Umístění majetku, pokud je relevantní
                            </div>
                          </FormGroup>
                        </FormRow>

                        {/* POZNÁMKA - POVINNÉ při překročení MAX ceny */}
                        {(() => {
                          const maxCena = parseFloat(formData.max_cena_s_dph) || 0;

                          // Pro POKLADNA: kontrola součtu položek
                          // Pro FAKTURA: kontrola součtu faktur
                          let prekroceno = false;

                          if (isPokladna) {
                            const polozkycelkem = formData.polozky ? formData.polozky.reduce((sum, polozka) => {
                              const cenaSdph = parseFloat(polozka.cena_s_dph) || 0;
                              return sum + cenaSdph;
                            }, 0) : 0;
                            prekroceno = (polozkycelkem - maxCena) > 0;
                          } else {
                            const fakturyCelkem = formData.faktury ? formData.faktury.reduce((sum, faktura) => {
                              const amount = parseFloat(faktura.fa_castka) || 0;
                              return sum + amount;
                            }, 0) : 0;
                            prekroceno = (fakturyCelkem - maxCena) > 0;
                          }

                          const jePovinne = prekroceno;

                          return (
                            <FormRow style={{ marginTop: '1.5rem' }}>
                              <FormGroup style={{ gridColumn: '1 / -1' }}>
                                <Label required={jePovinne}>
                                  POZNÁMKA K VĚCNÉ SPRÁVNOSTI
                                </Label>
                                <TextArea
                                  value={formData.vecna_spravnost_poznamka || ''}
                                  onChange={(e) => handleInputChange('vecna_spravnost_poznamka', e.target.value)}
                                  placeholder={
                                    jePovinne
                                      ? (isPokladna
                                          ? "⚠️ POVINNÉ: Uveďte prosím důvod, proč součet položek překročil maximální cenu objednávky. Vysvětlete, proč došlo k navýšení částky..."
                                          : "⚠️ POVINNÉ: Uveďte prosím důvod, proč faktura překročila maximální cenu objednávky. Vysvětlete, proč došlo k navýšení částky..."
                                        )
                                      : (isPokladna
                                          ? "Poznámka ke kontrole objednávky..."
                                          : "Poznámka k věcné správnosti..."
                                        )
                                  }
                                  rows={jePovinne ? 4 : 3}
                                  disabled={isVecnaSpravnostLocked}
                                  hasError={jePovinne && (!formData.vecna_spravnost_poznamka || formData.vecna_spravnost_poznamka.trim() === '')}
                                  style={{
                                    borderColor: jePovinne && (!formData.vecna_spravnost_poznamka || formData.vecna_spravnost_poznamka.trim() === '') ? '#dc2626' : undefined,
                                    background: isVecnaSpravnostLocked ? '#f3f4f6' : (jePovinne ? '#fef2f2' : undefined),
                                    cursor: isVecnaSpravnostLocked ? 'not-allowed' : undefined,
                                    opacity: isVecnaSpravnostLocked ? 0.6 : 1
                                  }}
                                />
                                {!jePovinne && (
                                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                                    Volitelná poznámka k věcné správnosti
                                  </div>
                                )}
                              </FormGroup>
                            </FormRow>
                          );
                        })()}

                        {/* ANO/NE CHECKBOX - POVINNÉ */}
                        <FormRow style={{ marginTop: '1.5rem' }}>
                          <FormGroup style={{ gridColumn: '1 / -1' }}>
                            {(() => {
                              // Výpočet jestli je cena překročena
                              const maxCena = parseFloat(formData.max_cena_s_dph) || 0;

                              // Pro POKLADNA: kontrola součtu položek
                              // Pro FAKTURA: kontrola součtu faktur
                              let prekroceno = false;

                              if (isPokladna) {
                                const polozkycelkem = formData.polozky ? formData.polozky.reduce((sum, polozka) => {
                                  const cenaSdph = parseFloat(polozka.cena_s_dph) || 0;
                                  return sum + cenaSdph;
                                }, 0) : 0;
                                prekroceno = (polozkycelkem - maxCena) > 0;
                              } else {
                                const fakturyCelkem = formData.faktury ? formData.faktury.reduce((sum, faktura) => {
                                  const amount = parseFloat(faktura.fa_castka) || 0;
                                  return sum + amount;
                                }, 0) : 0;
                                prekroceno = (fakturyCelkem - maxCena) > 0;
                              }

                              // Checkbox je disabled pokud je cena překročena a poznámka není vyplněna
                              const poznamkaVyplnena = formData.vecna_spravnost_poznamka && formData.vecna_spravnost_poznamka.trim() !== '';
                              const isDisabled = (prekroceno && !poznamkaVyplnena) || isVecnaSpravnostLocked;

                              return (
                                <div style={{
                                  background: isDisabled ? '#fee2e2' : '#fef3c7',
                                  border: `2px solid ${isDisabled ? '#dc2626' : '#eab308'}`,
                                  borderRadius: '8px',
                                  padding: '1.25rem',
                                  opacity: isDisabled ? 0.7 : 1,
                                  transition: 'all 0.3s ease'
                                }}>
                                  <label style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1rem',
                                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                                    fontSize: '1rem',
                                    fontWeight: '600',
                                    color: isDisabled ? '#7f1d1d' : '#713f12'
                                  }}>
                                    <input
                                      type="checkbox"
                                      checked={formData.potvrzeni_vecne_spravnosti === true || formData.potvrzeni_vecne_spravnosti === 1}
                                      onChange={(e) => {
                                        if (!isDisabled) {
                                          handleInputChange('potvrzeni_vecne_spravnosti', e.target.checked ? 1 : 0);
                                        }
                                      }}
                                      disabled={isDisabled}
                                      required
                                      style={{
                                        width: '24px',
                                        height: '24px',
                                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                                        accentColor: isDisabled ? '#dc2626' : '#eab308'
                                      }}
                                    />
                                    <span>
                                      ✅ Potvrzuji věcnou správnost objednávky
                                      <span style={{ color: '#dc2626', marginLeft: '0.25rem' }}>*</span>
                                    </span>
                                  </label>
                                  <div style={{
                                    fontSize: '0.875rem',
                                    color: isDisabled ? '#7f1d1d' : '#92400e',
                                    marginTop: '0.75rem',
                                    marginLeft: '2.5rem'
                                  }}>
                                    {isDisabled && (prekroceno && !poznamkaVyplnena) ? (
                                      <div>
                                        <div style={{
                                          fontWeight: '600',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '0.5rem',
                                          marginBottom: '0.5rem'
                                        }}>
                                          <span style={{ fontSize: '1.1rem' }}>⚠️</span>
                                          <strong>Vysvětlete důvod překročení MAX ceny!</strong>
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: '#7f1d1d', lineHeight: '1.5' }}>
                                          {isPokladna
                                            ? "Součet položek překročil maximální povolenou částku objednávky. Před potvrzením věcné správnosti musíte vysvětlit, proč došlo k navýšení ceny (např. změna rozsahu dodávky, dodatečné požadavky, cenové změny, apod.)."
                                            : "Faktura překročila maximální povolenou částku objednávky. Před potvrzením věcné správnosti musíte vysvětlit, proč došlo k navýšení ceny (např. změna rozsahu dodávky, dodatečné požadavky, cenové změny dodavatele, apod.)."
                                          }
                                        </div>
                                      </div>
                                    ) : (
                                      'Zaškrtnutím potvrzujete, že jste zkontrolovali všechny údaje a souhlasíte s jejich správností.'
                                    )}
                                  </div>
                                </div>
                              );
                            })()}
                          </FormGroup>
                        </FormRow>

                        {/* 📘 MODRÝ INFO BOX - Zobrazit ve Fázi 7 (VECNA_SPRAVNOST), než je checkbox zaškrtnutý */}
                        {hasWorkflowState(formData.stav_workflow_kod, 'VECNA_SPRAVNOST') &&
                         !hasWorkflowState(formData.stav_workflow_kod, 'ZKONTROLOVANA') &&
                         !hasWorkflowState(formData.stav_workflow_kod, 'DOKONCENA') && (
                          <div style={{
                            marginTop: '1.5rem',
                            background: '#dbeafe',
                            border: '1px solid #3b82f6',
                            borderRadius: '8px',
                            padding: '1rem',
                            color: '#1e40af'
                          }}>
                            <div style={{ fontWeight: '600', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ fontSize: '1.2rem' }}>ℹ️</span>
                              Další krok: Dokončení objednávky
                            </div>
                            <div style={{ fontSize: '0.875rem', lineHeight: '1.6' }}>
                              Po ověření a zkontrolování všech údajů zaškrtněte checkbox výše a uložte změny. Následně se objednávka posunie dál, kde bude provedeno finální potvrzení a uzavření celého procesu.
                            </div>
                          </div>
                        )}

                        {/* Informace o potvrzení - ZOBRAZIT AŽ VE FÁZI 8 (workflow ZKONTROLOVANA nebo DOKONCENA) */}
                        {formData.potvrdil_vecnou_spravnost_id &&
                         formData.dt_potvrzeni_vecne_spravnosti &&
                         (hasWorkflowState(formData.stav_workflow_kod, 'ZKONTROLOVANA') || hasWorkflowState(formData.stav_workflow_kod, 'DOKONCENA')) && (
                          <div style={{
                            marginTop: '1.5rem',
                            background: '#dcfce7',
                            border: '1px solid #16a34a',
                            borderRadius: '6px',
                            padding: '1rem',
                            color: '#166534',
                            fontSize: '0.875rem'
                          }}>
                            <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                              ✅ Věcná správnost byla zkontrolována a potvrzena
                            </div>
                            <div style={{ marginTop: '0.25rem', color: '#15803d' }}>
                              Objednávka prošla kontrolou věcné správnosti a může být dokončena.
                            </div>
                            <div style={{ marginTop: '0.5rem' }}>
                              <strong>Datum kontroly:</strong> {prettyDate(formData.dt_potvrzeni_vecne_spravnosti)} • <strong>Zkontroloval:</strong> {getUserNameById(formData.potvrdil_vecnou_spravnost_id)}
                            </div>
                          </div>
                        )}
                      </div>
                    </SectionContent>
                  </FormSection>
                );
              })()}
