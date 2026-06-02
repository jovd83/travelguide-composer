/**
 * generate_docx.js — Premium DOCX Roadbook Generator
 *
 * Usage:
 *   node generate_docx.js --markdown <path> --output <path> [--lang nl] [--photos <dir>]
 *
 * Requires: npm install docx  (local node_modules)
 *
 * Features:
 *  - Table of Contents + page numbers + A4 Calibri fonts
 *  - Per-day template: Algemeen table → Hotel → Maaltijden → Gereserveerde activiteiten → Dagindeling
 *  - Dagindeling: 3-level nested bullets (time-of-day • time-slot ○ detail ▪)
 *  - Clickable route/map hyperlinks rendered as Word ExternalHyperlink
 *  - Photo embedding: reads image files from --photos dir or ./scratch/photos/
 */

const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  ImageRun, Header, Footer, HeadingLevel, AlignmentType, WidthType,
  BorderStyle, ShadingType, TableOfContents, PageNumber, PageBreak,
  ExternalHyperlink, LevelFormat
} = require('docx');
const fs   = require('fs');
const path = require('path');

// ── Configuration ───────────────────────────────────────────────────────────
const A4_WIDTH_DXA    = 11906;
const A4_HEIGHT_DXA   = 16838;
const MARGIN_DXA      = 1134;          // ~2 cm
const CONTENT_W       = A4_WIDTH_DXA - MARGIN_DXA * 2;
const IMG_WIDTH_PX    = 520;           // ~13.7 cm — fits A4 with margins

// ── Args ────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const argMap = {};
for (let i = 0; i < args.length; i += 2) argMap[args[i].replace('--', '')] = args[i + 1];
const mdPath     = argMap['markdown'] || './scratch/itinerary_parsed.md';
const outputPath = argMap['output']   || './output_roadbook.docx';
const lang       = argMap['lang']     || 'nl';
const photosDir  = argMap['photos']   || path.join(path.dirname(mdPath), '..', 'photos');

// ── Labels ──────────────────────────────────────────────────────────────────
const L = lang === 'nl'
  ? { toc: 'Inhoudsopgave', page: 'Pagina' }
  : { toc: 'Table of Contents', page: 'Page' };

// ── Numbering config (3-level schedule bullets) ─────────────────────────────
const NUMBERING_CONFIG = [
  {
    reference: 'schedule',
    levels: [
      {
        level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
        style: {
          run: { bold: true, font: 'Calibri', size: 20 },
          paragraph: { indent: { left: 360, hanging: 360 }, spacing: { before: 120, after: 60 } }
        }
      },
      {
        level: 1, format: LevelFormat.BULLET, text: '○', alignment: AlignmentType.LEFT,
        style: {
          run: { font: 'Calibri', size: 20 },
          paragraph: { indent: { left: 720, hanging: 360 }, spacing: { before: 60, after: 40 } }
        }
      },
      {
        level: 2, format: LevelFormat.BULLET, text: '▪', alignment: AlignmentType.LEFT,
        style: {
          run: { font: 'Calibri', size: 20, color: '444444' },
          paragraph: { indent: { left: 1080, hanging: 360 }, spacing: { before: 40, after: 40 } }
        }
      }
    ]
  }
];

// ── Time-of-day detector (L1 bullet trigger) ────────────────────────────────
const TIME_OF_DAY = /^(Ochtend|Voormiddag|Namiddag|Avond|Nacht|'s\s*(ochtends?|middags?|avonds?)|Morning|Afternoon|Evening|Night)\b/i;

// ── Time-slot detector (L2 bullet trigger) ──────────────────────────────────
const TIME_SLOT = /^(~?\d{1,2}[u:]\d{2}|\d{1,2}[u:]\d{2}[–-]\d{1,2}[u:]\d{2}|\+[-+]?\s*\d)/;

// ── Route/map link detector ──────────────────────────────────────────────────
const ROUTE_LINK = /^\[([^\]]+)\]\((https?:[^)]+)\)(.*)?$/;

// ── Inline markdown parser → TextRun / ExternalHyperlink array ──────────────
function parseInline(text, opts = {}) {
  const size  = opts.size  || 20;
  const color = opts.color || '000000';
  const bold  = opts.bold  || false;
  const result = [];

  // Split on **bold**, *italic*, and [label](url)
  const tokens = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\(https?:[^)]+\))/);
  for (const tok of tokens) {
    if (!tok) continue;
    const bm = tok.match(/^\*\*([^*]+)\*\*$/);
    const im = tok.match(/^\*([^*]+)\*$/);
    const lm = tok.match(/^\[([^\]]+)\]\((https?:[^)]+)\)$/);
    if (bm) {
      result.push(new TextRun({ text: bm[1], bold: true, font: 'Calibri', size, color }));
    } else if (im) {
      result.push(new TextRun({ text: im[1], italics: true, font: 'Calibri', size, color }));
    } else if (lm) {
      result.push(new ExternalHyperlink({
        link: lm[2],
        children: [new TextRun({ text: lm[1], style: 'Hyperlink', font: 'Calibri', size })]
      }));
    } else {
      result.push(new TextRun({ text: tok, bold, font: 'Calibri', size, color }));
    }
  }
  return result;
}

// ── Simple text paragraph ────────────────────────────────────────────────────
function textPara(text, opts = {}) {
  return new Paragraph({
    children: parseInline(text, opts),
    spacing: { after: opts.after || 80 },
    alignment: opts.alignment || AlignmentType.LEFT,
    heading: opts.heading,
    indent: opts.indent,
  });
}

// ── Metadata table (Algemeen / Maaltijden rows) ──────────────────────────────
function metaTable(rows) {
  const b = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
  const borders = { top: b, bottom: b, left: b, right: b };
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [2400, CONTENT_W - 2400],
    rows: rows.map(([lbl, val]) => new TableRow({ children: [
      new TableCell({
        borders, width: { size: 2400, type: WidthType.DXA },
        shading: { fill: 'F2F2F2', type: ShadingType.CLEAR },
        margins: { top: 60, bottom: 60, left: 120, right: 120 },
        children: [new Paragraph({ children: [new TextRun({ text: lbl, bold: true, font: 'Calibri', size: 20 })] })]
      }),
      new TableCell({
        borders, width: { size: CONTENT_W - 2400, type: WidthType.DXA },
        margins: { top: 60, bottom: 60, left: 120, right: 120 },
        children: [new Paragraph({ children: parseInline(val || '/', { size: 20 }) })]
      }),
    ]}))
  });
}

// ── Route link paragraph (clickable, styled) ─────────────────────────────────
function routeLinkPara(label, url, suffix = '') {
  const icon = '🗺️';
  return new Paragraph({
    children: [
      new TextRun({ text: icon + ' ', font: 'Calibri', size: 20 }),
      new ExternalHyperlink({
        link: url,
        children: [new TextRun({ text: label, style: 'Hyperlink', font: 'Calibri', size: 20, bold: true })]
      }),
      ...(suffix ? [new TextRun({ text: '  ' + suffix.trim(), font: 'Calibri', size: 18, color: '666666', italics: true })] : []),
    ],
    spacing: { before: 80, after: 80 },
    indent: { left: 360 },
  });
}

// ── Dagindeling bullet (L0/L1/L2) ───────────────────────────────────────────
function scheduleBullet(text, level, bold = false) {
  // Detect inline route link inside the text
  const lm = text.match(/^\[([^\]]+)\]\((https?:[^)]+)\)(.*)?$/);
  if (lm) {
    return new Paragraph({
      numbering: { reference: 'schedule', level },
      children: [
        new ExternalHyperlink({
          link: lm[2],
          children: [new TextRun({ text: lm[1], style: 'Hyperlink', font: 'Calibri', size: 20 })]
        }),
        ...(lm[3] ? [new TextRun({ text: lm[3], font: 'Calibri', size: 20 })] : [])
      ],
      spacing: { after: 60 },
    });
  }
  return new Paragraph({
    numbering: { reference: 'schedule', level },
    children: parseInline(text, { bold, size: 20 }),
    spacing: { after: level === 0 ? 80 : 60 },
  });
}

// ── Blockquote tip paragraph ─────────────────────────────────────────────────
function tipPara(text) {
  const clean = text.replace(/^>\s*/, '').replace(/^\*\*Tip[^*]*\*\*:\s*/, '');
  return new Paragraph({
    children: [
      new TextRun({ text: '💡 ', font: 'Calibri', size: 20 }),
      new TextRun({ text: clean, font: 'Calibri', size: 19, italics: true, color: '2e7d32' }),
    ],
    spacing: { before: 80, after: 80 },
    indent: { left: 360, right: 360 },
    border: { left: { style: BorderStyle.SINGLE, size: 6, color: '2e7d32', space: 8 } },
  });
}

// ── Image embedding ──────────────────────────────────────────────────────────
function embedImage(imgPath, caption) {
  try {
    const ext  = path.extname(imgPath).replace('.', '').toLowerCase() || 'jpeg';
    const type = ext === 'jpg' ? 'jpeg' : ext;
    const data = fs.readFileSync(imgPath);
    return [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 160, after: 80 },
        children: [new ImageRun({
          type, data,
          transformation: { width: IMG_WIDTH_PX, height: Math.round(IMG_WIDTH_PX * 0.65) },
          altText: { title: caption, description: caption, name: caption }
        })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 160 },
        children: [new TextRun({ text: caption, font: 'Calibri', size: 18, italics: true, color: '666666' })]
      }),
    ];
  } catch (e) {
    console.warn(`[DOCX] Image skip: ${imgPath} — ${e.message}`);
    return [];
  }
}

// ── Load photos from directory ───────────────────────────────────────────────
function loadPhotos(dir) {
  if (!fs.existsSync(dir)) return [];
  const exts = ['.png', '.jpg', '.jpeg'];
  return fs.readdirSync(dir)
    .filter(f => exts.includes(path.extname(f).toLowerCase()))
    .sort()
    .map(f => path.join(dir, f));
}

// ── Process Dagindeling lines → bullets ──────────────────────────────────────
function buildDagindeling(lines) {
  const result = [];
  let lastLevel = -1;

  for (const rawLine of lines) {
    const s = rawLine.trim();
    if (!s || s.match(/^#{1,4}\s/)) continue;

    // Blockquote tip
    if (s.startsWith('>')) {
      result.push(tipPara(s));
      lastLevel = -1;
      continue;
    }

    // Standalone route / map link
    const rm = s.match(ROUTE_LINK);
    if (rm) {
      result.push(routeLinkPara(rm[1], rm[2], rm[3] || ''));
      lastLevel = -1;
      continue;
    }

    // Horizontal rule or separator
    if (s.match(/^[-*_]{3,}$/)) { lastLevel = -1; continue; }

    // L1 — time-of-day header
    if (TIME_OF_DAY.test(s)) {
      result.push(scheduleBullet(s, 0, true));
      lastLevel = 0;
      continue;
    }

    // L2 — time-slot entry
    if (TIME_SLOT.test(s)) {
      result.push(scheduleBullet(s, 1));
      lastLevel = 1;
      continue;
    }

    // L3 — detail paragraph (after a time-slot or another L2/L3)
    if (lastLevel >= 1) {
      result.push(scheduleBullet(s, 2));
      // keep lastLevel = 2 so subsequent lines stay at L3
      lastLevel = 2;
      continue;
    }

    // L1 fallback (line after a reset — treat as new top-level item)
    if (lastLevel <= 0) {
      result.push(scheduleBullet(s, lastLevel < 0 ? 0 : 0));
      lastLevel = 0;
      continue;
    }

    result.push(scheduleBullet(s, 1));
    lastLevel = 1;
  }

  return result;
}

// ── Markdown → sections ──────────────────────────────────────────────────────
function parseMarkdown(text) {
  const lines = text.split('\n');
  const sections = [];
  let cur = null;
  for (const line of lines) {
    const h1 = line.match(/^#\s+(.+)/);
    const h2 = line.match(/^##\s+(.+)/);
    if (h1) { if (cur) sections.push(cur); cur = { type: 'h1', title: h1[1], lines: [] }; }
    else if (h2) { if (cur) sections.push(cur); cur = { type: 'h2', title: h2[1], lines: [] }; }
    else if (cur) cur.lines.push(line);
  }
  if (cur) sections.push(cur);
  return sections;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function buildDocx() {
  console.log(`[DOCX] Reading: ${mdPath}`);
  const md       = fs.readFileSync(mdPath, 'utf8');
  const sections = parseMarkdown(md);
  const photos   = loadPhotos(photosDir);
  let   photoIdx = 0;
  // Distribute photos evenly: inject one every N days until exhausted
  const totalH2   = sections.filter(s => s.type === 'h2').length;
  // photoStep = how many days between photos; minimum 1
  const photoStep = photos.length > 0 ? Math.max(1, Math.floor(totalH2 / Math.min(photos.length, totalH2))) : Infinity;

  console.log(`[DOCX] ${sections.length} sections, ${photos.length} photos available`);

  const body = [
    new TableOfContents(L.toc, { hyperlink: true, headingStyleRange: '1-2' }),
    new Paragraph({ children: [new PageBreak()] }),
  ];

  let h2count = 0;

  for (const sec of sections) {

    // ── H1: Part header ──────────────────────────────────────────────────────
    if (sec.type === 'h1') {
      body.push(new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: sec.title, font: 'Calibri', size: 36, bold: true, color: '1a5a1a' })],
        spacing: { before: 400, after: 200 },
        pageBreakBefore: body.length > 3,
      }));
      continue;
    }

    // ── H2: Day section ──────────────────────────────────────────────────────
    if (sec.type === 'h2') {
      h2count++;
      body.push(new Paragraph({ children: [new PageBreak()] }));
      body.push(new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: sec.title, font: 'Calibri', size: 28, bold: true, color: '2e7d32' })],
        spacing: { before: 240, after: 160 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '2e7d32', space: 1 } },
      }));

      // Inject one photo per N days from photos directory (every photoStep-th day)
      if (photoIdx < photos.length && (h2count % photoStep === 1 || photoStep === 1)) {
        const imgFile = photos[photoIdx++];
        const caption = path.basename(imgFile, path.extname(imgFile)).replace(/[-_]/g, ' ');
        embedImage(imgFile, caption).forEach(p => body.push(p));
      }

      // ── Parse sub-sections within the day ───────────────────────────────
      let currentH3  = '';
      let hotelLines = [];
      let dagLines   = [];       // accumulate Dagindeling content
      let inDag      = false;

      const flush = () => {
        if (hotelLines.length) {
          hotelLines.forEach(l => body.push(textPara(l, { size: 20, color: '333333', after: 60 })));
          hotelLines = [];
        }
        if (inDag && dagLines.length) {
          buildDagindeling(dagLines).forEach(p => body.push(p));
          dagLines = [];
          inDag = false;
        }
      };

      for (const rawLine of sec.lines) {
        const s = rawLine.trim();

        // ── H3 heading ───────────────────────────────────────────────────────
        const h3m = s.match(/^###\s+(.+)/);
        if (h3m) {
          flush();
          currentH3 = h3m[1].toLowerCase();
          inDag     = currentH3.includes('dagindeling') || currentH3.includes('daily schedule') || currentH3.includes('schedule');
          body.push(new Paragraph({
            heading: HeadingLevel.HEADING_3,
            children: [new TextRun({ text: h3m[1], font: 'Calibri', size: 24, bold: true, color: '37474f' })],
            spacing: { before: 200, after: 100 },
          }));
          continue;
        }

        if (!s) continue;

        // ── Accumulate Dagindeling lines ─────────────────────────────────────
        if (inDag) {
          dagLines.push(rawLine);
          continue;
        }

        // ── Table row (Algemeen / Maaltijden) ────────────────────────────────
        if (s.startsWith('|') && s.endsWith('|')) {
          const cells = s.split('|').slice(1, -1).map(c => c.trim());
          if (!cells.some(c => /^[-: ]+$/.test(c))) {
            body.push(metaTable([[cells[0], cells[1] || '']]));
            body.push(new Paragraph({ spacing: { after: 40 } }));
          }
          continue;
        }

        // ── Meal / list item: **Label**: value ───────────────────────────────
        const mealM = s.match(/^[-*]\s+\*\*(.+?)\*\*:\s*(.+)?/);
        if (mealM) {
          body.push(new Paragraph({
            children: [
              new TextRun({ text: mealM[1] + ': ', bold: true, font: 'Calibri', size: 20 }),
              ...parseInline(mealM[2] || '/', { size: 20 }),
            ],
            spacing: { after: 60 },
            indent: { left: 360 },
          }));
          continue;
        }

        // ── Standalone route link ─────────────────────────────────────────────
        const rm = s.match(ROUTE_LINK);
        if (rm) {
          body.push(routeLinkPara(rm[1], rm[2], rm[3] || ''));
          continue;
        }

        // ── Blockquote tip ────────────────────────────────────────────────────
        if (s.startsWith('>')) {
          body.push(tipPara(s));
          continue;
        }

        // ── Image ─────────────────────────────────────────────────────────────
        const imgM = s.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
        if (imgM) {
          const [, cap, src] = imgM;
          const localPath = src.startsWith('http') ? null : src;
          if (localPath && fs.existsSync(localPath)) {
            embedImage(localPath, cap).forEach(p => body.push(p));
          }
          continue;
        }

        // ── Hotel block ───────────────────────────────────────────────────────
        if (currentH3.includes('hotel')) {
          hotelLines.push(s);
          continue;
        }

        // ── Default paragraph ─────────────────────────────────────────────────
        if (!s.match(/^[-]{3,}$/)) {
          body.push(textPara(s, { size: 20 }));
        }
      }

      flush(); // flush any remaining hotel / dagindeling lines
    }
  }

  // ── Document assembly ────────────────────────────────────────────────────────
  const footerPara = new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [
      new TextRun({ text: L.page + ' ', font: 'Calibri', size: 18, color: '888888' }),
      new TextRun({ children: [PageNumber.CURRENT], font: 'Calibri', size: 18, color: '888888' }),
    ],
  });

  const doc = new Document({
    numbering: { config: NUMBERING_CONFIG },
    styles: {
      default: { document: { run: { font: 'Calibri', size: 22 } } },
      paragraphStyles: [
        { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 36, bold: true, font: 'Calibri', color: '1a5a1a' },
          paragraph: { spacing: { before: 400, after: 200 }, outlineLevel: 0 } },
        { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 28, bold: true, font: 'Calibri', color: '2e7d32' },
          paragraph: { spacing: { before: 240, after: 160 }, outlineLevel: 1 } },
        { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 24, bold: true, font: 'Calibri', color: '37474f' },
          paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 2 } },
      ]
    },
    sections: [{
      properties: {
        page: {
          size: { width: A4_WIDTH_DXA, height: A4_HEIGHT_DXA },
          margin: { top: MARGIN_DXA, right: MARGIN_DXA, bottom: MARGIN_DXA, left: MARGIN_DXA }
        }
      },
      footers: { default: new Footer({ children: [footerPara] }) },
      children: body,
    }]
  });

  console.log(`[DOCX] Writing: ${outputPath}`);
  fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
  const buf = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buf);
  console.log(`[DOCX] Done! ${(buf.length / 1024).toFixed(0)} KB → ${outputPath}`);
}

buildDocx().catch(console.error);
