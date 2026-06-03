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
const mdPath      = argMap['markdown']  || './scratch/itinerary_parsed.md';
const outputPath  = argMap['output']    || './output_roadbook.docx';
const lang        = argMap['lang']      || 'nl';
const photosDir   = argMap['photos']    || path.join(path.dirname(mdPath), '..', 'photos');
const photoMapArg = argMap['photo-map'] || null;

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

// ── 2-column label/value table (Algemeen / Maaltijden) ───────────────────────
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

// ── General markdown table → Word Table ──────────────────────────────────────
// Accepts an array of raw '| a | b | c |' strings (including separator rows).
// Returns an array of docx objects (Table + spacing Paragraph).
function buildMarkdownTable(tableLines) {
  // Parse rows, skip separator lines
  const parsed = [];   // [{cells: string[], header: bool}]
  let firstDataSeen = false;
  for (const line of tableLines) {
    const cells = line.trim().split('|').slice(1, -1).map(c => c.trim());
    if (cells.every(c => /^[-: ]+$/.test(c))) { firstDataSeen = true; continue; } // separator
    parsed.push({ cells, header: !firstDataSeen });
    if (!firstDataSeen) firstDataSeen = false; // first real row = header
  }
  if (!parsed.length) return [];

  const colCount  = Math.max(...parsed.map(r => r.cells.length));
  const colW      = Math.floor(CONTENT_W / colCount);
  const colWidths = Array.from({ length: colCount }, (_, i) =>
    i === colCount - 1 ? CONTENT_W - colW * (colCount - 1) : colW
  );

  const bd = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
  const borders = { top: bd, bottom: bd, left: bd, right: bd };

  const tableRows = parsed.map((row, rowIdx) =>
    new TableRow({
      tableHeader: rowIdx === 0,
      children: Array.from({ length: colCount }, (_, ci) => {
        const cellText = row.cells[ci] || '';
        const isHeader = rowIdx === 0;
        return new TableCell({
          borders,
          width: { size: colWidths[ci], type: WidthType.DXA },
          shading: isHeader ? { fill: 'E8F5E9', type: ShadingType.CLEAR } : undefined,
          margins: { top: 60, bottom: 60, left: 120, right: 120 },
          children: [new Paragraph({
            children: parseInline(cellText, { size: 19, bold: isHeader }),
          })]
        });
      })
    })
  );

  return [
    new Table({ width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: colWidths, rows: tableRows }),
    new Paragraph({ spacing: { after: 100 } }),
  ];
}

// ── Time-of-day heading (Ochtend / Namiddag / Avond) ─────────────────────────
// These are the TOP-LEVEL structure of a day — rendered as prominent headings
// with a thick green left border, clearly bigger than sight names below them.
function timeOfDayHeading(text) {
  const clean = text.replace(/^\*+|\*+$/g, '').trim();
  return new Paragraph({
    children: [new TextRun({ text: clean, bold: true, font: 'Calibri', size: 26, color: '1a5a1a' })],
    spacing: { before: 320, after: 100 },
    border: { left: { style: BorderStyle.SINGLE, size: 18, color: '2e7d32', space: 10 } },
  });
}

// ── Sight / sub-section heading inside Dagindeling ───────────────────────────
// Visual hierarchy:
//   TIME-OF-DAY (26pt green + left border)  ← most prominent
//     SIGHT NAME (21pt green underline)      ← second level
//       Sub-section (19pt dark-gray)         ← least prominent
const SUB_SECTION_RE = /^(Wat is er|Praktische\s*info|Etiquette|Leuke\s+weetjes|Hoe\s+te\s+bereiken|Openingstijden)/i;

function sightSubHeading(text) {
  const clean       = text.replace(/^\[|\]$/g, '').replace(/^\*+|\*+$/g, '').trim();
  const isSubSection = SUB_SECTION_RE.test(clean);
  return new Paragraph({
    children: [new TextRun({
      text: clean,
      bold: true,
      font: 'Calibri',
      size: isSubSection ? 19 : 21,
      color: isSubSection ? '455a64' : '2e6b2e',
    })],
    spacing: { before: isSubSection ? 140 : 220, after: isSubSection ? 60 : 80 },
    border: isSubSection
      ? {}
      : { bottom: { style: BorderStyle.SINGLE, size: 2, color: 'b0bec5', space: 2 } },
  });
}

// ── 📎 Meer info link line ────────────────────────────────────────────────────
function meerInfoPara(s) {
  const cleanText = s.replace(/^📎\s*(Meer\s+info:\s*)?/i, '');
  return new Paragraph({
    children: [
      new TextRun({ text: '📎 Meer info: ', font: 'Calibri', size: 18, color: '888888', bold: true }),
      ...parseInline(cleanText, { size: 18, color: '555555' }),
    ],
    // Large 'after' spacing so the next time-of-day heading has clear separation
    spacing: { before: 60, after: 240 },
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

// ── Read actual image dimensions from file header (no external deps) ─────────
function readImageDimensions(buf, ext) {
  try {
    if (ext === 'png') {
      // PNG: IHDR chunk at offset 8; width @ 16, height @ 20 (big-endian uint32)
      if (buf[0] === 0x89 && buf[1] === 0x50) {
        return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
      }
    }
    if (ext === 'jpg' || ext === 'jpeg') {
      // JPEG: scan segments for SOF0/SOF2 markers which carry dimensions
      let i = 2; // skip SOI FF D8
      while (i + 3 < buf.length) {
        if (buf[i] !== 0xFF) break;
        i++;
        const marker = buf[i++];
        if (marker === 0xD9 || marker === 0xDA) break; // EOI / SOS
        const segLen = buf.readUInt16BE(i); i += 2;
        // SOF markers: C0-C3, C5-C7, C9-CB, CD-CF
        const isSOF = (marker >= 0xC0 && marker <= 0xCF) &&
                      marker !== 0xC4 && marker !== 0xC8 && marker !== 0xCC;
        if (isSOF && i + 4 < buf.length) {
          // precision (1) + height (2) + width (2)
          return { w: buf.readUInt16BE(i + 3), h: buf.readUInt16BE(i + 1) };
        }
        i += segLen - 2;
      }
    }
  } catch (_) {}
  return null;
}

// ── Image embedding — preserves original aspect ratio ────────────────────────
function embedImage(imgPath, caption) {
  try {
    const ext  = path.extname(imgPath).replace('.', '').toLowerCase() || 'jpeg';
    const type = ext === 'jpg' ? 'jpeg' : ext;
    const data = fs.readFileSync(imgPath);

    // Compute render size preserving aspect ratio
    const dims = readImageDimensions(data, ext);
    let rw = IMG_WIDTH_PX;
    let rh = dims ? Math.round(IMG_WIDTH_PX * dims.h / dims.w) : Math.round(IMG_WIDTH_PX * 0.65);

    // Cap height so tall portrait images don't overflow a page (~14 cm at 96 dpi)
    const MAX_H = 530;
    if (rh > MAX_H) { rh = MAX_H; rw = Math.round(MAX_H * (dims ? dims.w / dims.h : 1.5)); }

    return [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 160, after: 80 },
        children: [new ImageRun({
          type, data,
          transformation: { width: rw, height: rh },
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

// ── Load photo-map JSON (day_label -> [{file, caption}, ...]) ────────────────
function loadPhotoMap(jsonPath, photosDir) {
  if (!jsonPath || !fs.existsSync(jsonPath)) return null;
  const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const map = {};  // normalized_key -> [{path, caption}, ...]
  const arr = Array.isArray(raw) ? raw : Object.entries(raw).flatMap(([d, files]) => files.map(f => ({ day: d, file: f })));
  for (const entry of arr) {
    const { day, file, caption } = entry;
    const key = normDay(day);
    if (!map[key]) map[key] = [];
    const abs = path.isAbsolute(file) ? file : path.join(photosDir, file);
    if (fs.existsSync(abs)) map[key].push({ path: abs, caption: caption || null });
  }
  return map;
}

// Normalize a day title to a stable key: extract "dag N" number
function normDay(title) {
  if (!title) return '';
  const m = (title + '').match(/\bdag\s+(\d+)/i);
  return m ? `dag${m[1]}` : title.toLowerCase().replace(/\s+/g, '').slice(0, 20);
}

// ── Strip leading/trailing ** for regex testing only ─────────────────────────
function stripBold(s) {
  return s.replace(/^\*+\s*/, '').replace(/\s*\*+$/, '').trim();
}

// ── Process Dagindeling lines → 3-level nested bullets ───────────────────────
//
//  L0 (•) — time-of-day header: Ochtend / Namiddag / Avond / ...
//  L1 (○) — time-slot entry:   09:00, 16u00–20u00, ~20:30, or first desc after L0
//  L2 (▪) — detail paragraphs following a L1 time-slot
//
//  Transition rules:
//   TIME_OF_DAY match → always L0, reset
//   TIME_SLOT match   → always L1 (even from L2)
//   description after L0 → L1 (first sub-item of the header)
//   description after L1 or L2 → L2 (detail stays at L2)
//   route link → rendered inline, no level change
//   tip blockquote → standalone styled block, level reset
function buildDagindeling(lines) {
  const result  = [];
  let lastLevel = -1;   // -1 = plain-text mode; 0/1/2 = time-schedule bullet mode
  let tableBuf  = [];

  const flushTable = () => {
    if (tableBuf.length) {
      buildMarkdownTable(tableBuf).forEach(el => result.push(el));
      tableBuf  = [];
      lastLevel = -1;
    }
  };

  for (const rawLine of lines) {
    const s = rawLine.trim();

    // ── Table rows ────────────────────────────────────────────────────────────
    if (s.startsWith('|') && s.endsWith('|')) { tableBuf.push(s); continue; }
    flushTable();

    if (!s) continue;
    if (s.match(/^#{1,3}\s/)) continue;   // skip H1-H3 (already rendered as Word headings)

    // ── #### heading = sight name or sub-section ─────────────────────────────
    const h4m = s.match(/^####\s+(.+)/);
    if (h4m) { result.push(sightSubHeading(h4m[1])); lastLevel = -1; continue; }

    // ── Full-line **bold** = sight name or sub-section heading ────────────────
    // (entire trimmed string is **wrapped in bold**, nothing else on the line)
    const fullBoldM = s.match(/^\*\*([^*]{3,})\*\*\s*[:!?]?\s*$/);
    if (fullBoldM) { result.push(sightSubHeading(fullBoldM[1])); lastLevel = -1; continue; }

    // ── 📎 Meer info link line ────────────────────────────────────────────────
    if (s.startsWith('📎') || /^Meer\s+info:/i.test(s)) {
      result.push(meerInfoPara(s)); lastLevel = -1; continue;
    }

    // ── Inline image ──────────────────────────────────────────────────────────
    const imgM = s.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
    if (imgM) {
      if (fs.existsSync(imgM[2])) embedImage(imgM[2], imgM[1]).forEach(el => result.push(el));
      continue;
    }

    // ── Blockquote tip ────────────────────────────────────────────────────────
    if (s.startsWith('>')) { result.push(tipPara(s)); lastLevel = -1; continue; }

    // ── Separator ─────────────────────────────────────────────────────────────
    if (s.match(/^[-*_]{3,}$/)) { lastLevel = -1; continue; }

    // ── Route / map link ──────────────────────────────────────────────────────
    const rm = s.match(ROUTE_LINK);
    if (rm) { result.push(routeLinkPara(rm[1], rm[2], rm[3] || '')); continue; }

    // ── Explicit markdown bullet: "- text" or "* text" (detected from RAW line)
    // This MUST come before the time-of-day checks so that `- **Duur**: 1u` renders
    // as a clean bullet and NOT as a nested schedule bullet with the "-" in the text.
    const explicitBullet = rawLine.match(/^(\s*)[-*]\s+(.+)/);
    if (explicitBullet) {
      const level = explicitBullet[1].length === 0 ? 0 : explicitBullet[1].length <= 2 ? 1 : 2;
      result.push(scheduleBullet(explicitBullet[2], level));
      lastLevel = level;
      continue;
    }

    // ── Strip bold markers before time-pattern tests ──────────────────────────
    const sTest = stripBold(s);

    // ── Time-of-day header (Ochtend, Namiddag, Avond …) ─────────────────────
    // Heading = time label + optional SHORT location/tagline (≤ 50 chars, no
    // new sentence). Any longer description flows as a body paragraph below.
    if (TIME_OF_DAY.test(sTest)) {
      // Strip ALL **bold** markers to get clean text for splitting
      const fullClean = s.replace(/\*\*/g, '').trim();
      const dashIdx   = fullClean.indexOf(' — ');

      if (dashIdx < 0) {
        // No dash: whole line is the heading
        result.push(timeOfDayHeading(fullClean));
      } else {
        const timeLabel = fullClean.slice(0, dashIdx).trim();
        const rest      = fullClean.slice(dashIdx + 3).trim();

        // Short location name (≤ 50 chars, no mid-sentence period)?
        const isShortLabel = rest.length <= 50 && !rest.match(/\.\s+\S/);
        if (isShortLabel) {
          result.push(timeOfDayHeading(timeLabel + ' — ' + rest));
        } else {
          // Long description: heading = time label only; rest = body paragraph
          result.push(timeOfDayHeading(timeLabel));
          if (rest) result.push(textPara(rest, { size: 20, after: 80 }));
        }
      }
      lastLevel = -1;
      continue;
    }

    // ── L1 — time-slot entry (09:00, ~20:30, 16u00–20u00 …) ──────────────────
    if (TIME_SLOT.test(sTest)) {
      result.push(scheduleBullet(s, 1));
      lastLevel = 1;
      continue;
    }

    // ── Schedule context: descriptions after time slots stay indented ─────────
    if (lastLevel >= 1) { result.push(scheduleBullet(s, 2)); lastLevel = 2; continue; }
    if (lastLevel === 0) { result.push(scheduleBullet(s, 1)); lastLevel = 1; continue; }

    // ── Default: plain body paragraph (after headings, in sight-description mode)
    result.push(textPara(s, { size: 20 }));
    // don't change lastLevel — stays -1 so subsequent paragraphs also stay plain
  }

  flushTable();
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
  const photoMap = loadPhotoMap(photoMapArg, photosDir);  // day-keyed map if provided

  console.log(`[DOCX] ${sections.length} sections, ${photos.length} photos available${photoMap ? ' (with day mapping)' : ''}`);

  const body = [
    new TableOfContents(L.toc, { hyperlink: true, headingStyleRange: '1-2' }),
    new Paragraph({ children: [new PageBreak()] }),
  ];

  let h2count = 0;

  for (const sec of sections) {

    // ── H1: Part header or intro/appendix section ────────────────────────────
    if (sec.type === 'h1') {
      body.push(new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: sec.title, font: 'Calibri', size: 36, bold: true, color: '1a5a1a' })],
        spacing: { before: 400, after: 200 },
        pageBreakBefore: body.length > 3,
      }));

      // Process H1 body lines (intro / appendix sections with ### sub-headings)
      if (sec.lines && sec.lines.length > 0) {
        let tblBuf = [];
        const flushT = () => {
          if (tblBuf.length) { buildMarkdownTable(tblBuf).forEach(el => body.push(el)); tblBuf = []; }
        };
        for (const rawLine of sec.lines) {
          const s = rawLine.trim();
          if (s.startsWith('|') && s.endsWith('|')) { tblBuf.push(s); continue; }
          flushT();
          if (!s || s.match(/^[-*_]{3,}$/)) continue;

          // ### sub-heading
          const h3m = s.match(/^###\s+(.+)/);
          if (h3m) { body.push(new Paragraph({
            heading: HeadingLevel.HEADING_3,
            children: [new TextRun({ text: h3m[1], font: 'Calibri', size: 24, bold: true, color: '37474f' })],
            spacing: { before: 260, after: 100 },
          })); continue; }

          // #### sub-sub-heading (Malaysia / Singapore labels)
          const h4m = s.match(/^####\s+(.+)/);
          if (h4m) { body.push(sightSubHeading(h4m[1])); continue; }

          // Full-line bold = sub-heading
          const boldM = s.match(/^\*\*([^*]{3,})\*\*\s*[:!?]?\s*$/);
          if (boldM) { body.push(sightSubHeading(boldM[1])); continue; }

          // Explicit bullet - text
          const bm = rawLine.match(/^(\s*)[-*]\s+(.+)/);
          if (bm) {
            const lvl = bm[1].length === 0 ? 0 : bm[1].length <= 2 ? 1 : 2;
            body.push(new Paragraph({
              numbering: { reference: 'schedule', level: lvl },
              children: parseInline(bm[2], { size: 20 }),
              spacing: { after: 60 },
            })); continue;
          }

          // Route link / meer info / blockquote / image
          const rm = s.match(ROUTE_LINK);
          if (rm) { body.push(routeLinkPara(rm[1], rm[2], rm[3] || '')); continue; }
          if (s.startsWith('📎')) { body.push(meerInfoPara(s)); continue; }
          if (s.startsWith('>')) { body.push(tipPara(s)); continue; }

          // Default paragraph
          body.push(textPara(s, { size: 20 }));
        }
        flushT();
      }
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

      // Inject photo(s) for this day section
      if (photoMap) {
        const dayKey  = normDay(sec.title);
        const dayPhotos = photoMap[dayKey] || [];
        for (const { path: imgFile, caption } of dayPhotos) {
          embedImage(imgFile, caption || sec.title).forEach(p => body.push(p));
        }
      }

      // ── Parse sub-sections within the day ───────────────────────────────
      let currentH3  = '';
      let hotelLines = [];
      let dagLines   = [];       // accumulate Dagindeling content
      let inDag      = false;
      let mainTblBuf = [];       // buffer for multi-row tables in main loop

      const flushMainTable = () => {
        if (mainTblBuf.length) {
          buildMarkdownTable(mainTblBuf).forEach(el => body.push(el));
          mainTblBuf = [];
        }
      };

      const flush = () => {
        flushMainTable();
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

        // ── Table row — buffer full multi-row table before rendering ─────────
        if (s.startsWith('|') && s.endsWith('|')) {
          mainTblBuf.push(s);
          continue;
        }
        // Non-table line: flush buffered table rows first
        flushMainTable();

        // ── Meal bullet: - **Ontbijt**: ... / - **Lunch**: ... / - **Diner**: ...
        const mealM = s.match(/^[-*]\s+\*\*(.+?)\*\*:\s*(.+)?/);
        if (mealM) {
          body.push(new Paragraph({
            numbering: { reference: 'schedule', level: 0 },   // proper Word bullet •
            children: [
              new TextRun({ text: mealM[1] + ': ', bold: true, font: 'Calibri', size: 20 }),
              ...parseInline(mealM[2] || '/', { size: 20 }),
            ],
            spacing: { before: 60, after: 40 },
          }));
          continue;
        }

        // ── ★ Vegetarisch / review links line (sub-item under a meal bullet) ──
        if (s.startsWith('★') || s.startsWith('⭐')) {
          const clean = s.replace(/^[★⭐]\s*/, '');
          body.push(new Paragraph({
            children: [
              new TextRun({ text: '★ ', font: 'Calibri', size: 17, color: '2e7d32', bold: true }),
              ...parseInline(clean, { size: 17, color: '444444' }),
            ],
            spacing: { before: 20, after: 80 },
            indent: { left: 720 },   // indented under the meal bullet
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
