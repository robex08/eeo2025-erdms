# PDF Tool

A minimal CLI to work with PDF files directly: show info, extract text, split by page ranges, and merge multiple PDFs.

## Install

Python 3.8+ recommended.

```bash
python3 -m pip install --user pypdf pdfminer.six
```

## Usage

Show info:
```bash
python3 pdf_tool.py info "Jak poprvé pracovat s Pokladnou.pdf"
```

Extract text from all pages to stdout:
```bash
python3 pdf_tool.py text "Jak poprvé pracovat s Pokladnou.pdf"
```

Extract text from selected pages to file:
```bash
python3 pdf_tool.py text "Jak poprvé pracovat s Pokladnou.pdf" -p 1-3,5 -o output.txt
```

Split into page ranges:
```bash
python3 pdf_tool.py split "Jak poprvé pracovat s Pokladnou.pdf" splits -r 1-3,5
```

Merge multiple PDFs:
```bash
python3 pdf_tool.py merge part1.pdf part2.pdf -o merged.pdf
```

## Notes
- Uses `pdfminer.six` for high-quality text extraction when available, falls back to `pypdf`.
- For viewing PDFs in VS Code, open the PDF directly to use the built-in viewer.
