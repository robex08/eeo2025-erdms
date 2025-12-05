const fs = require('fs')
const path = require('path')
const { XMLParser } = require('fast-xml-parser')
const { PDFDocument, StandardFonts } = require('pdf-lib')

async function main() {
  const file = process.argv[2] || path.join(__dirname, '..', 'PDF', 'Faktura_250100528.isdoc')
  const forcedFontArg = process.argv[3] // optional: node scripts/isdoc-to-pdf.js <file> <fontPath>
  if (!fs.existsSync(file)) {
    console.error('Input file not found:', file)
    process.exit(2)
  }
  const txt = fs.readFileSync(file, 'utf8')
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })
  const obj = parser.parse(txt)
  const invoice = obj.Invoice || obj
  const id = invoice.ID || ''
  const issueDate = invoice.IssueDate || ''
  const supplierName = invoice.AccountingSupplierParty && invoice.AccountingSupplierParty.Party && invoice.AccountingSupplierParty.Party.PartyName && invoice.AccountingSupplierParty.Party.PartyName.Name ? invoice.AccountingSupplierParty.Party.PartyName.Name : ''

  const pdf = await PDFDocument.create()
  // Register fontkit so pdf-lib can embed custom fonts (required for TTF)
  try {
    const fontkit = require('@pdf-lib/fontkit')
    pdf.registerFontkit(fontkit)
  } catch (e) {
    console.error('Please install @pdf-lib/fontkit to embed TTF fonts in Node:')
    console.error('  npm install @pdf-lib/fontkit')
    throw e
  }
  const page = pdf.addPage([595.28, 841.89])

  // Embed a Unicode TTF font that supports Czech diacritics. Place a TTF at
  // scripts/../assets/fonts/DejaVuSans.ttf or update the path below.
  let fontPath = forcedFontArg || path.join(__dirname, '..', 'assets', 'fonts', 'DejaVuSans.ttf')
  let fontBytes = null
  // helper to search common system fonts
  function findSystemFont() {
    const candidates = [
      '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
      '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
      '/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf',
      '/usr/share/fonts/truetype/freefont/FreeSans.ttf',
      '/usr/share/fonts/truetype/ubuntu/Ubuntu-R.ttf',
    ]
    for (const c of candidates) if (fs.existsSync(c)) return c
    const searchDirs = ['/usr/share/fonts', path.join(process.env.HOME || '', '.local', 'share', 'fonts')]
    let found = null
    for (const d of searchDirs) {
      try {
        if (!fs.existsSync(d)) continue
        const stack = [d]
        while (stack.length && !found) {
          const cur = stack.pop()
          const entries = fs.readdirSync(cur, { withFileTypes: true })
          for (const e of entries) {
            const p = path.join(cur, e.name)
            if (e.isDirectory()) stack.push(p)
            else if (e.isFile() && /\.(ttf|otf)$/i.test(e.name)) {
              if (/dejavu|liberation|noto|freesans|ubuntu|roboto|arial|times/i.test(e.name)) { found = p; break }
              if (!found) found = p
            }
          }
        }
      } catch (e) {}
      if (found) return found
    }
    return null
  }

  if (!fs.existsSync(fontPath)) {
    console.warn('Font not found at', fontPath)
    console.warn('Trying common system font locations (Linux)...')
    const candidates = [
      '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
      '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
      '/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf',
      '/usr/share/fonts/truetype/freefont/FreeSans.ttf',
      '/usr/share/fonts/truetype/ubuntu/Ubuntu-R.ttf',
    ]
    let found = null
    for (const c of candidates) {
      if (fs.existsSync(c)) { found = c; break }
    }
    if (!found) {
      // try a simple recursive search under /usr/share/fonts and ~/.local/share/fonts
      const searchDirs = ['/usr/share/fonts', path.join(process.env.HOME || '', '.local', 'share', 'fonts')]
      for (const d of searchDirs) {
        try {
          if (!fs.existsSync(d)) continue
          const stack = [d]
          while (stack.length && !found) {
            const cur = stack.pop()
            const entries = fs.readdirSync(cur, { withFileTypes: true })
            for (const e of entries) {
              const p = path.join(cur, e.name)
              if (e.isDirectory()) stack.push(p)
              else if (e.isFile() && /\.(ttf|otf)$/i.test(e.name)) {
                // prefer known names
                if (/dejavu|liberation|noto|freesans|ubuntu|roboto/i.test(e.name)) { found = p; break }
                if (!found) found = p
              }
            }
          }
        } catch (e) {
          // ignore permission errors
        }
        if (found) break
      }
    }
    if (found) {
      console.warn('Using system font:', found)
      fontPath = found
    } else {
      console.error('No suitable system font found. Please place a TTF supporting Czech diacritics into:', fontPath)
      process.exit(3)
    }
  }
  // read selected font and try embedding it. If embedding fails, try system fonts
  // (useful if assets font is corrupt) before falling back to StandardFonts.
  async function tryEmbedFontFromPath(pth) {
    try {
      const bytes = fs.readFileSync(pth)
      const f = await pdf.embedFont(bytes)
      return f
    } catch (e) {
      return { error: e }
    }
  }

  let font = null
  if (fs.existsSync(fontPath)) {
    const res = await tryEmbedFontFromPath(fontPath)
    if (!res || res.error) {
      console.error('Chyba při vložení fontu z', fontPath, res && res.error ? res.error : '')
      console.error('Zkusím najít systémový font a použít ho místo toho...')
      const systemFont = findSystemFont()
      if (systemFont) {
        console.warn('Použiji systémový font:', systemFont)
        const res2 = await tryEmbedFontFromPath(systemFont)
        if (!res2 || res2.error) {
          console.error('I systémový font se nepodařilo vložit:', res2 && res2.error)
          console.error('Použiju fallback vestavěný font (diakritika může chybět).')
          font = await pdf.embedFont(StandardFonts.Helvetica)
        } else {
          font = res2
        }
      } else {
        console.error('Nenalezen žádný systémový font. Použiju fallback vestavěný font (diakritika může chybět).')
        font = await pdf.embedFont(StandardFonts.Helvetica)
      }
    } else {
      font = res
    }
  } else {
    // fontPath didn't exist (handled earlier), but ensure font variable is set
    const systemFont = findSystemFont()
    if (systemFont) {
      console.warn('Použiji systémový font:', systemFont)
      const res2 = await tryEmbedFontFromPath(systemFont)
      if (!res2 || res2.error) {
        console.error('Nepodařilo se vložit systémový font, použiji fallback.')
        font = await pdf.embedFont(StandardFonts.Helvetica)
      } else {
        font = res2
      }
    } else {
      font = await pdf.embedFont(StandardFonts.Helvetica)
    }
  }
  page.drawText(`Faktura ${id}` , { x: 40, y: 800, size: 18, font })
  page.drawText(`Datum: ${issueDate}` , { x: 40, y: 780, size: 12, font })

  const out = await pdf.save()
  const outPath = path.join(__dirname, '..', 'out', `isdoc_${id || 'export'}.pdf`)
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, out)
  console.log('Written PDF:', outPath)
}

main().catch(err => { console.error(err); process.exit(1) })
