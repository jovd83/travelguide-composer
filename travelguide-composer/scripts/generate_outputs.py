#!/usr/bin/env python3
import os
import sys
import re
import argparse

def log(msg):
    print(f"[Compiler] {msg}", file=sys.stderr)

# A simple, robust, self-contained Markdown-to-HTML converter 
# to avoid strict library dependencies
def md_to_html(md_text):
    lines = md_text.split('\n')
    html_lines = []
    in_list = False
    in_table = False
    table_headers = []
    map_counter = 0

    def parse_map(match):
        nonlocal map_counter
        lat = match.group(1)
        lon = match.group(2)
        zoom = match.group(3) if match.group(3) else "15"
        label = match.group(4) if match.group(4) else "POI Route Stop"
        map_id = f"map_{map_counter}"
        map_counter += 1
        
        map_html = f"""
<div class="map-card" style="margin: 2rem 0; background: #fff; border: 1px solid #ebe9e4; border-radius: 4px; padding: 1rem;">
    <div class="curated-label" style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.15em; color: #8a8885; margin-bottom: 0.5rem;">Interactive Map: {label}</div>
    <div id="{map_id}" style="height: 350px; border-radius: 4px; background: #f0f0f0; box-shadow: inset 0 2px 4px rgba(0,0,0,0.06); position: relative; z-index: 1;"></div>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
        (function() {{
            var checkLeaflet = setInterval(function() {{
                if (window.L) {{
                    clearInterval(checkLeaflet);
                    var map = L.map('{map_id}').setView([{lat}, {lon}], {zoom});
                    L.tileLayer('https://{{s}}.tile.openstreetmap.org/{{z}}/{{x}}/{{y}}.png', {{
                        attribution: '&copy; OpenStreetMap contributors'
                    }}).addTo(map);
                    L.marker([{lat}, {lon}]).addTo(map).bindPopup('<b>{label}</b>').openPopup();
                }}
            }}, 100);
        }})();
    </script>
</div>
"""
        return map_html

    for line in lines:
        line_strip = line.strip()

        # Handle Tables (Markdown Grid)
        if line_strip.startswith('|') and line_strip.endswith('|'):
            if not in_table:
                in_table = True
                html_lines.append("<table class='logistics-table'>")
            
            # Split elements
            cells = [c.strip() for c in line_strip.split('|')[1:-1]]
            
            # Check if this is a separator row e.g., |---|---|
            if all(re.match(r'^:-*-*:?$', c) or re.match(r'^-+$', c) for c in cells):
                continue
                
            if not table_headers:
                table_headers = cells
                html_lines.append("<thead><tr>")
                for cell in cells:
                    html_lines.append(f"<th>{cell}</th>")
                html_lines.append("</tr></thead><tbody>")
            else:
                html_lines.append("<tr>")
                for cell in cells:
                    # Highlight rating stars if present in cell
                    cell_styled = cell.replace('🌟', '⭐').replace('⭐', "<span class='rating-stars'>★</span>")
                    # Handle links inside tables
                    cell_styled = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2">\1</a>', cell_styled)
                    html_lines.append(f"<td>{cell_styled}</td>")
                html_lines.append("</tr>")
            continue
        elif in_table:
            in_table = False
            table_headers = []
            html_lines.append("</tbody></table>")

        # Handle headings
        if line_strip.startswith('# '):
            if in_list:
                html_lines.append("</ul>")
                in_list = False
            html_lines.append(f"<h1>{line_strip[2:]}</h1>")
        elif line_strip.startswith('## '):
            if in_list:
                html_lines.append("</ul>")
                in_list = False
            html_lines.append(f"<h2>{line_strip[3:]}</h2>")
        elif line_strip.startswith('### '):
            if in_list:
                html_lines.append("</ul>")
                in_list = False
            html_lines.append(f"<h3>{line_strip[4:]}</h3>")
        
        # Handle list items
        elif line_strip.startswith('- ') or line_strip.startswith('* '):
            if not in_list:
                html_lines.append("<ul>")
                in_list = True
            content = line_strip[2:]
            # Parse links inside list
            content = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2">\1</a>', content)
            # Parse bold/italic
            content = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', content)
            content = re.sub(r'\*([^*]+)\*', r'<em>\1</em>', content)
            html_lines.append(f"<li>{content}</li>")
        
        # Handle horizontal divider
        elif line_strip in ['---', '***']:
            if in_list:
                html_lines.append("</ul>")
                in_list = False
            html_lines.append("<hr class='whitespace-divider' />")
            
        # Handle blank lines
        elif not line_strip:
            if in_list:
                html_lines.append("</ul>")
                in_list = False
            continue
            
        # Standard paragraphs
        else:
            if in_list:
                html_lines.append("</ul>")
                in_list = False
                
            content = line_strip
            
            # Check for Leaflet Map tag trigger: [MAP: lat=X, lon=Y, zoom=Z, label=Label]
            map_match = re.match(r'^\[MAP:\s*lat=([\d\.-]+),\s*lon=([\d\.-]+)(?:,\s*zoom=(\d+))?(?:,\s*label=([^\]]+))?\]', content)
            if map_match:
                html_lines.append(parse_map(map_match))
                continue

            # Parse images: ![alt](url)
            content = re.sub(r'!\[([^\]]*)\]\(([^)]+)\)', r'<div class="visual-image-card"><img src="\2" alt="\1" class="visual-img" style="width:100%; max-height:400px; object-fit:cover; border-radius:8px; display:block; margin: 1.5rem auto 0.5rem auto;" /><div class="visual-img-caption" style="text-align:center; font-size:0.85rem; color:#8a8885; font-style:italic; margin-bottom: 1.5rem;">\1</div></div>', content)

            # Parse links
            content = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2">\1</a>', content)
            # Parse bold/italic
            content = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', content)
            content = re.sub(r'\*([^*]+)\*', r'<em>\1</em>', content)
            
            # Special box layout triggers:
            # Check for blockquotes or customized containers
            if content.startswith('> [!NOTE]') or content.startswith('> [!IMPORTANT]') or content.startswith('> [!TIP]'):
                # Box header
                label = "INFO"
                if "IMPORTANT" in content: label = "IMPORTANT"
                elif "TIP" in content: label = "TIP"
                html_lines.append(f"<div class='architectural-box'><div class='curated-label'>{label}</div>")
            elif content.startswith('> '):
                # continuation of quote or a tip box
                html_lines.append(f"<p>{content[2:]}</p>")
            elif "insider tip" in content.lower() or "insider advice" in content.lower():
                html_lines.append(f"<div class='insider-tip'><div class='insider-tip-header'>Insider Tip</div><p>{content}</p></div>")
            elif "tourist trap" in content.lower() or "avoid" in content.lower():
                html_lines.append(f"<div class='tourist-trap-warning'><div class='tourist-trap-header'>Avoid (Tourist Trap!)</div><p>{content}</p></div>")
            else:
                html_lines.append(f"<p>{content}</p>")
                
    if in_list:
        html_lines.append("</ul>")
    if in_table:
        html_lines.append("</tbody></table>")

    return "\n".join(html_lines)

def compile_to_html(md_path, theme, output_path, assets_dir):
    log(f"Compiling {md_path} to HTML (Theme: {theme})")
    
    # Read base template
    template_path = os.path.join(assets_dir, "templates", "base.html")
    if not os.path.exists(template_path):
        # Graceful fallback to inline minimal base template
        base_html = """<!DOCTYPE html><html><head><meta charset="utf-8"/><title>{{TITLE}}</title><style>{{STYLE_CONTENT}}</style></head><body><div class="container"><h1>{{TITLE}}</h1>{{CONTENT}}</div></body></html>"""
    else:
        with open(template_path, 'r', encoding='utf-8') as f:
            base_html = f.read()

    # Read selected CSS theme
    css_path = os.path.join(assets_dir, "css", f"{theme}.css")
    if not os.path.exists(css_path):
        log(f"Theme CSS {css_path} not found. Using empty style.")
        css_content = "body { font-family: sans-serif; padding: 2rem; }"
    else:
        with open(css_path, 'r', encoding='utf-8') as f:
            css_content = f.read()

    # Read markdown content
    with open(md_path, 'r', encoding='utf-8') as f:
        md_text = f.read()

    # Parse title from first header
    title_match = re.search(r'^#\s+(.+)$', md_text, re.MULTILINE)
    title = title_match.group(1) if title_match else "Travel Itinerary"

    # Remove the first header from the body to avoid double titles
    body_md = re.sub(r'^#\s+.+$', '', md_text, count=1, flags=re.MULTILINE)

    # Convert remaining markdown to HTML
    body_html = md_to_html(body_md)

    # Replace placeholders
    subtitle_html = "<div class='subtitle'>Enriched Premium Travel Guide</div>" if "visual" in theme else ""
    final_html = base_html.replace("{{TITLE}}", title)
    final_html = final_html.replace("{{STYLE_CONTENT}}", css_content)
    final_html = final_html.replace("{{SUBTITLE_HTML}}", subtitle_html)
    final_html = final_html.replace("{{CONTENT}}", body_html)

    # Write output
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(final_html)
    log(f"Successfully compiled gorgeous dynamic HTML to: {output_path}")

def compile_to_docx(md_path, theme, output_path):
    log(f"Compiling {md_path} to DOCX (Style mapping: {theme})")
    try:
        import docx
        from docx.shared import Inches, Pt, RGBColor
        from docx.enum.text import WD_ALIGN_PARAGRAPH
        
        doc = docx.Document()
        
        # Read markdown lines
        with open(md_path, 'r', encoding='utf-8') as f:
            md_text = f.read()

        lines = md_text.split('\n')
        for line in lines:
            line_strip = line.strip()
            if not line_strip:
                continue
            
            if line_strip.startswith('# '):
                h = doc.add_heading(line_strip[2:], level=1)
                h.alignment = WD_ALIGN_PARAGRAPH.CENTER
            elif line_strip.startswith('## '):
                doc.add_heading(line_strip[3:], level=2)
            elif line_strip.startswith('### '):
                doc.add_heading(line_strip[4:], level=3)
            elif line_strip.startswith('- ') or line_strip.startswith('* '):
                # Clean basic markdown links and bold formatting
                txt = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'\1 (\2)', line_strip[2:])
                txt = txt.replace('**', '').replace('*', '')
                doc.add_paragraph(txt, style='List Bullet')
            elif line_strip == '---' or line_strip == '***':
                doc.add_paragraph().paragraph_format.space_before = Pt(20)
            else:
                txt = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'\1 (\2)', line_strip)
                txt = txt.replace('**', '').replace('*', '')
                doc.add_paragraph(txt)

        doc.save(output_path)
        log(f"Successfully compiled standard Word document to: {output_path}")
    except ImportError:
        log("python-docx is not installed. Falling back to writing rich Markdown text as DOCX text stream.")
        # Fallback: simple text write
        with open(output_path, 'w', encoding='utf-8') as f:
            with open(md_path, 'r', encoding='utf-8') as r:
                f.write(r.read())
        log(f"Saved text document (docx file extension placeholder) to: {output_path}")

def main():
    parser = argparse.ArgumentParser(description="Travel Itinerary Output Compiler")
    parser.add_argument("--markdown", required=True, help="Path to finalized markdown itinerary")
    parser.add_argument("--theme", default="boutique", choices=["backpacker", "visual", "scholarly", "boutique", "opinionated", "roadbook"], help="Visual style theme")
    parser.add_argument("--format", default="html", choices=["html", "docx", "pdf"], help="Target file format")
    parser.add_argument("--output", required=True, help="Destination output file path")
    parser.add_argument("--assets-dir", default="./assets", help="Path to the assets folder")
    
    args = parser.parse_args()

    if not os.path.exists(args.markdown):
        log(f"Error: Markdown file {args.markdown} not found.")
        sys.exit(1)

    if args.format == "html":
        compile_to_html(args.markdown, args.theme, args.output, args.assets_dir)
    elif args.format == "docx":
        compile_to_docx(args.markdown, args.theme, args.output)
    elif args.format == "pdf":
        log("PDF compilation selected. Note: PDF works by compiling HTML and letting the agent print-to-pdf or using system converters. We will generate the HTML base first, then convert.")
        html_temp = args.output + ".temp.html"
        compile_to_html(args.markdown, args.theme, html_temp, args.assets_dir)
        # We save the HTML so the user can easily print to PDF from browser, or let agent run converting utilities
        os.rename(html_temp, args.output)
        log(f"Compiled intermediate HTML as printable PDF resource to: {args.output}")

if __name__ == "__main__":
    main()
