/**
 * generate_docx.js — Premium DOCX Roadbook Generator
 *
 * Usage:
 *   node generate_docx.js --markdown <path> --output <path> [--lang nl]
 *
 * Requires: npm install -g docx
 *
 * This script reads an enriched Markdown itinerary and produces a professional
 * DOCX roadbook with: Table of Contents, per-day template, embedded photos,
 * page numbers, and A4 Calibri formatting — matching the Florida_2022_roadbook standard.
 */

const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  ImageRun, Header, Footer, HeadingLevel, AlignmentType, WidthType,
  BorderStyle, ShadingType, TableOfContents, PageNumber, PageBreak,
  ExternalHyperlink, BookmarkStart, BookmarkEnd
} = require('docx');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// ── Configuration ──────────────────────────────────────────────────────────
const A4_WIDTH_DXA = 11906;
const A4_HEIGHT_DXA = 16838;
const MARGIN_DXA = 1134;  // ~2cm
const CONTENT_WIDTH_DXA = A4_WIDTH_DXA - MARGIN_DXA * 2;  // 9638 DXA
const IMG_WIDTH_PX = 550;  // ~14.5cm at 96dpi — fits A4 content width

// ── Parse args ─────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const argMap = {};
for (let i = 0; i < args.length; i += 2) {
  argMap[args[i].replace('--', '')] = args[i + 1];
}
const mdPath = argMap['markdown'] || './scratch/itinerary_parsed.md';
const outputPath = argMap['output'] || './output_roadbook.docx';
const lang = argMap['lang'] || 'nl';

// ── Labels (Dutch/English) ──────────────────────────────────────────────────
const labels = lang === 'nl'
  ? { toc: 'Inhoudsopgave', meals: 'Maaltijden', hotel: 'Hotel', general: 'Algemeen', activities: 'Gereserveerde activiteiten', schedule: 'Dagindeling', page: 'Pagina' }
  : { toc: 'Table of Contents', meals: 'Meals', hotel: 'Hotel', general: 'General', activities: 'Reserved Activities', schedule: 'Daily Schedule', page: 'Page' };

// ── Download image helper ───────────────────────────────────────────────────
async function downloadImage(url, destPath) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(destPath)) { resolve(destPath); return; }
    const proto = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(destPath);
    proto.get(url, (res) => {
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(destPath); });
    }).on('error', (err) => { fs.unlink(destPath, () => {}); reject(err); });
  });
}

// ── Parse markdown into sections ────────────────────────────────────────────
function parseMarkdown(mdText) {
  const lines = mdText.split('\n');
  const sections = [];
  let current = null;

  for (const line of lines) {
    const h1 = line.match(/^#\s+(.+)/);
    const h2 = line.match(/^##\s+(.+)/);
    const h3 = line.match(/^###\s+(.+)/);
    const img = line.match(/^!\[([^\]]*)\]\(([^)]+)\)/);

    if (h1) {
      if (current) sections.push(current);
      current = { type: 'h1', title: h1[1], lines: [] };
    } else if (h2) {
      if (current) sections.push(current);
      current = { type: 'h2', title: h2[1], lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) sections.push(current);
  return sections;
}

// ── Build paragraph from text with inline markdown ──────────────────────────
function textParagraph(text, opts = {}) {
  const runs = [];
  // Handle bold **text**
  const parts = text.split(/(\*\*[^*]+\*\*)/);
  for (const part of parts) {
    const boldMatch = part.match(/^\*\*([^*]+)\*\*$/);
    runs.push(new TextRun({
      text: boldMatch ? boldMatch[1] : part,
      bold: !!boldMatch,
      font: 'Calibri',
      size: opts.size || 22,  // 11pt = 22 half-points
      color: opts.color || '000000',
    }));
  }
  return new Paragraph({
    children: runs,
    spacing: { after: 80 },
    alignment: opts.alignment || AlignmentType.LEFT,
    heading: opts.heading,
  });
}

// ── Build day section table (Algemeen) ─────────────────────────────────────
function buildMetaTable(rows) {
  const border = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
  const borders = { top: border, bottom: border, left: border, right: border };
  return new Table({
    width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
    columnWidths: [2400, 7238],
    rows: rows.map(([label, value]) => new TableRow({
      children: [
        new TableCell({
          borders,
          width: { size: 2400, type: WidthType.DXA },
          shading: { fill: 'F2F2F2', type: ShadingType.CLEAR },
          margins: { top: 60, bottom: 60, left: 120, right: 120 },
          children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, font: 'Calibri', size: 20 })] })]
        }),
        new TableCell({
          borders,
          width: { size: 7238, type: WidthType.DXA },
          margins: { top: 60, bottom: 60, left: 120, right: 120 },
          children: [new Paragraph({ children: [new TextRun({ text: value || '/', font: 'Calibri', size: 20 })] })]
        }),
      ]
    }))
  });
}

// ── Build embedded image paragraph ─────────────────────────────────────────
function buildImageParagraph(imgPath, caption, type = 'jpeg') {
  try {
    const data = fs.readFileSync(imgPath);
    return [
      new Paragraph({
        children: [new ImageRun({
          type,
          data,
          transformation: { width: IMG_WIDTH_PX, height: Math.round(IMG_WIDTH_PX * 0.667) },
          altText: { title: caption, description: caption, name: caption }
        })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 160, after: 80 },
      }),
      new Paragraph({
        children: [new TextRun({ text: caption, italics: true, font: 'Calibri', size: 18, color: '666666' })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 160 },
      })
    ];
  } catch (e) {
    console.warn(`[DOCX] Could not embed image ${imgPath}: ${e.message}`);
    return [];
  }
}

// ── Main build ──────────────────────────────────────────────────────────────
async function buildDocx() {
  console.log(`[DOCX] Reading: ${mdPath}`);
  const md = fs.readFileSync(mdPath, 'utf8');
  const sections = parseMarkdown(md);

  const bodyChildren = [
    // Table of Contents
    new TableOfContents(labels.toc, {
      hyperlink: true,
      headingStyleRange: '1-2',
    }),
    new Paragraph({ children: [new PageBreak()] }),
  ];

  for (const section of sections) {
    if (section.type === 'h1') {
      bodyChildren.push(new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: section.title, font: 'Calibri', size: 36, bold: true, color: '1a5a1a' })],
        spacing: { before: 400, after: 200 },
        pageBreakBefore: bodyChildren.length > 3,
      }));
    } else if (section.type === 'h2') {
      // Each day gets a page break (except the first)
      bodyChildren.push(new Paragraph({ children: [new PageBreak()] }));
      bodyChildren.push(new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: section.title, font: 'Calibri', size: 28, bold: true, color: '2e7d32' })],
        spacing: { before: 240, after: 160 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '2e7d32', space: 1 } },
      }));

      // Parse the day's lines for structured content
      const dayLines = section.lines;
      let i = 0;
      let inMealList = false;
      let hotelBlock = [];
      let collectingHotel = false;

      for (i = 0; i < dayLines.length; i++) {
        const line = dayLines[i];
        const stripped = line.trim();

        // H3 sub-sections within day
        const h3m = stripped.match(/^###\s+(.+)/);
        if (h3m) {
          if (hotelBlock.length) {
            hotelBlock.forEach(l => bodyChildren.push(textParagraph(l, { size: 20, color: '333333' })));
            hotelBlock = [];
          }
          bodyChildren.push(new Paragraph({
            heading: HeadingLevel.HEADING_3,
            children: [new TextRun({ text: h3m[1], font: 'Calibri', size: 24, bold: true, color: '37474f' })],
            spacing: { before: 200, after: 100 },
          }));
          collectingHotel = h3m[1].toLowerCase().includes('hotel');
          continue;
        }

        // Image lines
        const imgMatch = stripped.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
        if (imgMatch) {
          const [, caption, src] = imgMatch;
          const ext = path.extname(src).replace('.', '') || 'jpeg';
          const localPath = src.startsWith('http') ? path.join('./scratch/photos', `img_${i}.${ext}`) : src;
          if (src.startsWith('http') && !fs.existsSync(localPath)) {
            console.warn(`[DOCX] Photo not downloaded yet: ${src} → ${localPath}`);
          }
          if (fs.existsSync(localPath)) {
            buildImageParagraph(localPath, caption, ext).forEach(p => bodyChildren.push(p));
          }
          continue;
        }

        // Table rows
        if (stripped.startsWith('|') && stripped.endsWith('|')) {
          const cells = stripped.split('|').slice(1, -1).map(c => c.trim());
          if (!cells.some(c => c.match(/^[-: ]+$/))) {
            const metaTable = buildMetaTable([[cells[0], cells[1]]]);
            bodyChildren.push(metaTable);
            bodyChildren.push(new Paragraph({ spacing: { after: 60 } }));
          }
          continue;
        }

        // List items (meals etc.)
        const listMatch = stripped.match(/^[-*]\s+\*\*(.+?)\*\*:\s*(.+)?/);
        if (listMatch) {
          const label = listMatch[1];
          const value = listMatch[2] || '/';
          bodyChildren.push(new Paragraph({
            children: [
              new TextRun({ text: `${label}: `, bold: true, font: 'Calibri', size: 20 }),
              new TextRun({ text: value, font: 'Calibri', size: 20 }),
            ],
            spacing: { after: 60 },
            indent: { left: 360 },
          }));
          continue;
        }

        // Hotel multi-line block
        if (collectingHotel && stripped && !stripped.startsWith('#')) {
          hotelBlock.push(stripped);
          continue;
        }

        // Standard paragraph
        if (stripped && !stripped.match(/^[-]{3,}$/)) {
          bodyChildren.push(textParagraph(stripped, { size: 20 }));
        }
      }

      if (hotelBlock.length) {
        hotelBlock.forEach(l => bodyChildren.push(textParagraph(l, { size: 20, color: '333333' })));
      }
    }
  }

  // Footer with page numbers
  const footerParagraph = new Paragraph({
    children: [
      new TextRun({ text: `${labels.page} `, font: 'Calibri', size: 18, color: '666666' }),
      new TextRun({ children: [PageNumber.CURRENT], font: 'Calibri', size: 18, color: '666666' }),
    ],
    alignment: AlignmentType.CENTER,
  });

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: 'Calibri', size: 22 } }
      },
      paragraphStyles: [
        {
          id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 36, bold: true, font: 'Calibri', color: '1a5a1a' },
          paragraph: { spacing: { before: 400, after: 200 }, outlineLevel: 0 }
        },
        {
          id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 28, bold: true, font: 'Calibri', color: '2e7d32' },
          paragraph: { spacing: { before: 240, after: 160 }, outlineLevel: 1 }
        },
        {
          id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { size: 24, bold: true, font: 'Calibri', color: '37474f' },
          paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 2 }
        },
      ]
    },
    sections: [{
      properties: {
        page: {
          size: { width: A4_WIDTH_DXA, height: A4_HEIGHT_DXA },
          margin: { top: MARGIN_DXA, right: MARGIN_DXA, bottom: MARGIN_DXA, left: MARGIN_DXA }
        }
      },
      footers: {
        default: new Footer({ children: [footerParagraph] })
      },
      children: bodyChildren,
    }]
  });

  console.log(`[DOCX] Writing: ${outputPath}`);
  fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buffer);
  console.log(`[DOCX] Done! ${(buffer.length / 1024).toFixed(0)} KB → ${outputPath}`);
}

buildDocx().catch(console.error);
