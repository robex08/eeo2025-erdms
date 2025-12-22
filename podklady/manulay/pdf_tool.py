import argparse
import os
import sys
from typing import List, Optional, Tuple

def _parse_ranges(ranges_str: str, max_pages: Optional[int] = None) -> List[Tuple[int, int]]:
    ranges = []
    parts = [p.strip() for p in ranges_str.split(',') if p.strip()]
    for part in parts:
        if '-' in part:
            a, b = part.split('-', 1)
            start = int(a)
            end = int(b)
        else:
            start = int(part)
            end = start
        if max_pages is not None:
            start = max(1, min(start, max_pages))
            end = max(1, min(end, max_pages))
        if start > end:
            start, end = end, start
        ranges.append((start, end))
    return ranges

def pdf_info(path: str) -> int:
    try:
        from pypdf import PdfReader
    except Exception:
        try:
            from PyPDF2 import PdfReader  # fallback
        except Exception as e:
            print("Missing dependency: install 'pypdf'", file=sys.stderr)
            return 2
    reader = PdfReader(path)
    num_pages = len(reader.pages)
    metadata = reader.metadata
    encrypted = getattr(reader, 'is_encrypted', False)
    print(f"File: {os.path.basename(path)}")
    print(f"Pages: {num_pages}")
    print(f"Encrypted: {encrypted}")
    if metadata:
        for k, v in metadata.items():
            print(f"{k}: {v}")
    return 0

def extract_text(path: str, output: Optional[str] = None, pages: Optional[str] = None) -> int:
    text = None
    used = None
    try:
        from pdfminer.high_level import extract_text as pm_extract_text
        used = 'pdfminer.six'
        if pages:
            # pdfminer expects list of page numbers starting at 0
            from pypdf import PdfReader
            r = PdfReader(path)
            ranges = _parse_ranges(pages, len(r.pages))
            page_numbers = []
            for s, e in ranges:
                page_numbers.extend(list(range(s - 1, e)))
            text = pm_extract_text(path, page_numbers=page_numbers)
        else:
            text = pm_extract_text(path)
    except Exception:
        try:
            from pypdf import PdfReader
            used = 'pypdf'
            r = PdfReader(path)
            if pages:
                ranges = _parse_ranges(pages, len(r.pages))
                parts = []
                for s, e in ranges:
                    for i in range(s - 1, e):
                        parts.append(r.pages[i].extract_text() or '')
                text = "\n".join(parts)
            else:
                parts = []
                for p in r.pages:
                    parts.append(p.extract_text() or '')
                text = "\n".join(parts)
        except Exception:
            print("Missing dependencies: install 'pdfminer.six' or 'pypdf'", file=sys.stderr)
            return 2
    if output:
        with open(output, 'w', encoding='utf-8') as f:
            f.write(text or '')
        print(f"Text extracted using {used} -> {output}")
    else:
        print(text or '')
    return 0

def split_pdf(path: str, output_dir: str, ranges: str) -> int:
    try:
        from pypdf import PdfReader, PdfWriter
    except Exception:
        try:
            from PyPDF2 import PdfReader, PdfWriter
        except Exception:
            print("Missing dependency: install 'pypdf'", file=sys.stderr)
            return 2
    reader = PdfReader(path)
    os.makedirs(output_dir, exist_ok=True)
    rs = _parse_ranges(ranges, len(reader.pages))
    for idx, (s, e) in enumerate(rs, start=1):
        writer = PdfWriter()
        for i in range(s - 1, e):
            writer.add_page(reader.pages[i])
        out_name = f"{os.path.splitext(os.path.basename(path))[0]}_{s}-{e}.pdf"
        out_path = os.path.join(output_dir, out_name)
        with open(out_path, 'wb') as f:
            writer.write(f)
        print(f"Wrote {out_path}")
    return 0

def merge_pdfs(paths: List[str], output_path: str) -> int:
    try:
        from pypdf import PdfReader, PdfWriter
    except Exception:
        try:
            from PyPDF2 import PdfReader, PdfWriter
        except Exception:
            print("Missing dependency: install 'pypdf'", file=sys.stderr)
            return 2
    writer = PdfWriter()
    for p in paths:
        r = PdfReader(p)
        for page in r.pages:
            writer.add_page(page)
    with open(output_path, 'wb') as f:
        writer.write(f)
    print(f"Merged -> {output_path}")
    return 0

def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(prog='pdf_tool', description='Simple PDF utility')
    sub = parser.add_subparsers(dest='cmd', required=True)

    p_info = sub.add_parser('info', help='Show PDF info')
    p_info.add_argument('path')

    p_text = sub.add_parser('text', help='Extract text from PDF')
    p_text.add_argument('path')
    p_text.add_argument('-o', '--output', help='Write to file')
    p_text.add_argument('-p', '--pages', help='Pages, e.g., 1-3,5,8-10')

    p_split = sub.add_parser('split', help='Split PDF into ranges')
    p_split.add_argument('path')
    p_split.add_argument('output_dir')
    p_split.add_argument('-r', '--ranges', required=True, help='Ranges, e.g., 1-3,5,8-10')

    p_merge = sub.add_parser('merge', help='Merge PDFs')
    p_merge.add_argument('paths', nargs='+')
    p_merge.add_argument('-o', '--output', required=True)

    args = parser.parse_args(argv)
    if args.cmd == 'info':
        return pdf_info(args.path)
    if args.cmd == 'text':
        return extract_text(args.path, args.output, args.pages)
    if args.cmd == 'split':
        return split_pdf(args.path, args.output_dir, args.ranges)
    if args.cmd == 'merge':
        return merge_pdfs(args.paths, args.output)
    return 1

if __name__ == '__main__':
    sys.exit(main())
