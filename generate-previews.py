"""Render local PDF submissions and collect title evidence without changing originals."""
import argparse
import concurrent.futures
import json
import logging
import pathlib
import shutil
import subprocess

from PIL import Image, ImageDraw
from pypdf import PdfReader
import pdfplumber

logging.getLogger('pdfminer').setLevel(logging.ERROR)
logging.getLogger('pypdf').setLevel(logging.ERROR)


def process(work, root, renderer):
    student = work['student']
    original = root / 'private' / 'pdfs' / f'{student}.pdf'
    image = root / 'dist' / 'thumbnails' / f'{student}.webp'
    evidence = {'student': student, 'filename': work['sourceFilename']}
    if not original.exists():
        return {**evidence, 'error': 'Original PDF is missing'}
    try:
        reader = PdfReader(original)
        evidence['pages'] = len(reader.pages)
        evidence['metadataTitle'] = str((reader.metadata or {}).get('/Title', ''))
        evidence['text'] = reader.pages[0].extract_text() or ''
        try:
            with pdfplumber.open(original) as pdf:
                page = pdf.pages[0]
                words = page.extract_words(extra_attrs=['size'])
                evidence['largeText'] = [
                    {'text': w['text'], 'size': round(w['size'], 1), 'top': round(w['top'], 1)}
                    for w in sorted(words, key=lambda w: (-w['size'], w['top'], w['x0']))[:80]]
        except Exception as error:
            evidence['layoutWarning'] = str(error)
        if not image.exists():
            prefix = root / 'private' / 'pdfs' / f'{student}-first-page'
            subprocess.run([renderer, '-f', '1', '-singlefile', '-scale-to', '1100',
                            '-png', str(original), str(prefix)], check=True,
                           stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=90)
            rendered = prefix.with_suffix('.png')
            with Image.open(rendered) as source:
                source.convert('RGB').save(image, 'WEBP', quality=86, method=5)
            rendered.unlink()
        with Image.open(image) as preview:
            evidence['dimensions'] = list(preview.size)
        evidence['thumbnail'] = './thumbnails/' + image.name
        evidence['bytes'] = image.stat().st_size
        return evidence
    except Exception as error:
        return {**evidence, 'error': str(error)}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--renderer', default=shutil.which('pdftoppm'))
    args = parser.parse_args()
    if not args.renderer:
        raise SystemExit('pdftoppm is required')
    root = pathlib.Path(__file__).resolve().parent
    catalog = json.loads((root / 'private/catalog.json').read_text(encoding='utf-8'))
    works = [w for w in catalog['works'] if w['mimeType'] == 'application/pdf']
    (root / 'dist/thumbnails').mkdir(parents=True, exist_ok=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(lambda w: process(w, root, args.renderer), works))
    (root / 'private/title-extraction.json').write_text(
        json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')
    successful = [r for r in results if 'error' not in r]
    for offset in range(0, len(successful), 12):
        sheet = Image.new('RGB', (1200, 1320), '#e8e8e4')
        draw = ImageDraw.Draw(sheet)
        for index, item in enumerate(successful[offset:offset + 12]):
            x, y = (index % 4) * 300, (index // 4) * 440
            draw.text((x + 10, y + 8), item['student'], fill='black')
            with Image.open(root / 'dist' / item['thumbnail'][2:]) as source:
                source.thumbnail((280, 405))
                sheet.paste(source, (x + (300-source.width)//2, y + 28))
        sheet.save(root / 'outputs' / f'pdf-contact-{offset//12+1}.jpg', quality=92)
    print(json.dumps({'rendered': len(successful), 'total': len(works),
                      'bytes': sum(r['bytes'] for r in successful),
                      'errors': [r for r in results if 'error' in r]}))


if __name__ == '__main__':
    main()
