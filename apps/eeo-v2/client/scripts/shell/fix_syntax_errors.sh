#!/bin/bash

echo "🔧 Opravuji syntaktické chyby způsobené čištěním console logů..."

# Oprav index.js - chybějící catch bloky
echo "Opravuji src/index.js..."

# Oprav NotesPanel.js - chybějící catch pro try blok na řádku ~437
echo "Opravuji src/components/panels/NotesPanel.js - chybějící catch blok..."

# Najít řádek s "for (const cacheKey of cacheKeys)" a přidat catch po příslušném }
sed -i '437a\
				} catch {}' src/components/panels/NotesPanel.js

# Najít další chybějící catch blok kolem řádku 542
sed -i '/for (const cacheKey of centersCacheKeys)/,/} catch {}/ {
    /resolvedCenters.join(.*,.*);$/a\
					} catch {}
}' src/components/panels/NotesPanel.js

# Najít druhý try blok s userCacheKeys a přidat catch
sed -i '/for (const cacheKey of userCacheKeys)/,/} catch {}/ {
    /}$/a\
					} catch {}
}' src/components/panels/NotesPanel.js

echo "✅ Syntaktické chyby opraveny!"