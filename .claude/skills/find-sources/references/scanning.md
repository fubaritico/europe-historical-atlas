# Scanning an atlas — the recipe (2026-11-10)

> Tried the night of 09 to 10/11 on *Les Balkans, atlas historique* (Hupchick, Cox): 12 pages, 11 MB, the text found in
> the PDF, a map plate sharp enough to read every name. An atlas scanned once becomes searchable like the BnF's.

## The scanner: VueScan (Standard edition), Canon MG3500 — the settings, once

| tab | setting | value | why |
| --- | --- | --- | --- |
| Input | Scan resolution | **Auto (300 dpi)** | the standard for text recognition; sharp enough for a map plate; ~0.5–1 MB a page in the PDF |
| Input | Media / Media size | Color / A4 | A4 is the glass, not the page |
| Input | Default folder | a folder per atlas on the external disk (`ATLAS-BOOKS/<atlas>/`) | the scans never enter the repository |
| Input | File type · PDF file name | PDF · `<atlas>-0001+.pdf` | one PDF per atlas; the `+` numbers it |
| Crop | Crop size · Multi crop | Auto · **Off** | Auto cuts round the page; Multi crop would split a plate |
| Output | PDF multi page · **PDF OCR text** | On · **checked** | one file, its text searchable (Western European alphabets only — Greek or Cyrillic text needs `ocrmypdf` on the images) |

The figure at the bottom of VueScan (« 19.6 MB ») is the raw image while scanning, not the file: the PDF is compressed.

## Scanning

1. **A black sheet behind the page** — a thin page lets its back show through, and the text recognition then mixes the
   two (pages 10 and 12 of the trial).
2. First page → **Scan**; every next page → **Scan+** (adds to the same PDF); a new atlas → **Scan**, a new file.
3. A plate larger than the glass: two or three pieces overlapping, each **Scan+**; they are stitched before use.
4. The pages are written as they come: nothing to save. **Cmd + Q** closes the PDF.
5. VueScan may warn *"make sure the transport lock switch is in the unlocked position"*: the MG3500 has no such lock —
   it means the scanner did not answer. Quit VueScan, switch the printer off and on, scan again; the pages before stay.

## After — by me

1. Count the pages and the text per page (`pypdf` in a scratchpad venv); a page with no text is looked at.
2. Find the index pages, and the legend; note the atlas in `files/plans/sources/bibliotheque.md` (title, edition,
   translator, year, licence: public domain → calque, in copyright → reference).
3. Its index is then read as any other (`SKILL.md`, step 7); its plates, as verification layers
   (`/use-cartographer`, `references/layers.md`).
