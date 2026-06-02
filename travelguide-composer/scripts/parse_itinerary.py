#!/usr/bin/env python3
import os
import sys
import re
import argparse
import zipfile
import xml.etree.ElementTree as ET

def log(msg):
    print(f"[Parser] {msg}", file=sys.stderr)

def parse_markdown(filepath):
    log(f"Parsing Markdown file: {filepath}")
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    return content

def parse_docx(filepath):
    log(f"Parsing Word DOCX file: {filepath}")
    try:
        import docx
        doc = docx.Document(filepath)
        fullText = []
        for para in doc.paragraphs:
            # Simple text extraction. For links, we might need a more advanced parser, 
            # but we can also extract hyperlinks by searching XML or using docx features.
            fullText.append(para.text)
        
        # Extract hyperlinks from XML for maximum accuracy
        links = []
        try:
            # docx hyperlinks are inside relationships. We can parse XML.
            with zipfile.ZipFile(filepath) as z:
                xml_content = z.read('word/document.xml')
                root = ET.fromstring(xml_content)
                # Find all hyperlinked texts
                namespaces = {
                    'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
                    'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
                }
                for hyperlink in root.findall('.//w:hyperlink', namespaces):
                    rId = hyperlink.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
                    text_nodes = hyperlink.findall('.//w:t', namespaces)
                    text = "".join([node.text for node in text_nodes if node.text])
                    if rId and text:
                        links.append((text, rId))
        except Exception as e:
            log(f"Could not parse DOCX XML for links: {e}")

        # Combine paragraphs
        body = "\n\n".join(fullText)
        if links:
            body += "\n\n### Extracted Document Links\n"
            for txt, rid in links:
                body += f"- {txt} (Relationship ID: {rid})\n"
        return body

    except ImportError:
        log("python-docx is not installed. Falling back to native Zip XML parsing.")
        # Fallback XML parsing
        try:
            texts = []
            with zipfile.ZipFile(filepath) as z:
                xml_content = z.read('word/document.xml')
                root = ET.fromstring(xml_content)
                namespaces = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
                for p in root.findall('.//w:p', namespaces):
                    p_texts = []
                    for t in p.findall('.//w:t', namespaces):
                        if t.text:
                            p_texts.append(t.text)
                    if p_texts:
                        texts.append("".join(p_texts))
            return "\n\n".join(texts)
        except Exception as e:
            log(f"Zip fallback failed: {e}")
            raise RuntimeError(f"Could not parse DOCX. Please install python-docx (pip install python-docx)")

def parse_xlsx(filepath):
    log(f"Parsing Excel XLSX file: {filepath}")
    try:
        import openpyxl
        wb = openpyxl.load_workbook(filepath, data_only=True)
        lines = []
        for sheet in wb.sheetnames:
            lines.append(f"# Sheet: {sheet}")
            ws = wb[sheet]
            for row in ws.iter_rows(values_only=True):
                # Filter out completely empty rows
                if any(row):
                    row_strs = [str(val) if val is not None else "" for val in row]
                    lines.append(" | ".join(row_strs))
            lines.append("") # empty line after sheet
        return "\n".join(lines)
    except ImportError:
        log("openpyxl is not installed. Falling back to native Zip shared strings parsing.")
        try:
            with zipfile.ZipFile(filepath) as z:
                # Excel shared strings contains all texts
                xml_content = z.read('xl/sharedStrings.xml')
                root = ET.fromstring(xml_content)
                namespaces = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
                strings = []
                for si in root.findall('.//ns:si', namespaces):
                    t_nodes = si.findall('.//ns:t', namespaces)
                    text = "".join([t.text for t in t_nodes if t.text])
                    if text:
                        strings.append(text)
                return "\n\n".join(strings)
        except Exception as e:
            log(f"Zip fallback failed: {e}")
            raise RuntimeError("Could not parse XLSX. Please install openpyxl (pip install openpyxl)")

def parse_pdf(filepath):
    log(f"Parsing PDF file: {filepath}")
    try:
        import pypdf
        reader = pypdf.PdfReader(filepath)
        text_pages = []
        for i, page in enumerate(reader.pages):
            text_pages.append(f"## Page {i+1}\n" + page.extract_text())
        return "\n\n".join(text_pages)
    except ImportError:
        log("pypdf is not installed. Please run: pip install pypdf")
        # Try a quick sys call fallback if pdftotext exists
        import subprocess
        try:
            res = subprocess.run(["pdftotext", filepath, "-"], capture_output=True, text=True)
            if res.returncode == 0:
                return res.stdout
        except Exception:
            pass
        raise RuntimeError("Could not parse PDF. Please install pypdf (pip install pypdf)")

def main():
    parser = argparse.ArgumentParser(description="Multi-format Itinerary Parser")
    parser.add_argument("--file", required=True, help="Path to the travel itinerary file")
    parser.add_argument("--output", help="Path to write the parsed Markdown text")
    args = parser.parse_args()

    if not os.path.exists(args.file):
        log(f"Error: File {args.file} not found.")
        sys.exit(1)

    ext = os.path.splitext(args.file.lower())[1]
    
    try:
        if ext == ".md" or ext == ".txt":
            content = parse_markdown(args.file)
        elif ext == ".docx":
            content = parse_docx(args.file)
        elif ext in [".xlsx", ".xls"]:
            content = parse_xlsx(args.file)
        elif ext == ".pdf":
            content = parse_pdf(args.file)
        else:
            log(f"Unsupported extension: {ext}. Treating as text/markdown.")
            content = parse_markdown(args.file)
    except Exception as e:
        log(f"Failure during parsing: {e}")
        sys.exit(2)

    # Write output if specified
    if args.output:
        os.makedirs(os.path.dirname(os.path.abspath(args.output)), exist_ok=True)
        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(content)
        log(f"Successfully saved parsed Markdown to: {args.output}")
    else:
        print(content)

if __name__ == "__main__":
    main()
