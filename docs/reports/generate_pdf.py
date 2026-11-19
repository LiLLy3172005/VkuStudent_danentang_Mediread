# -*- coding: utf-8 -*-
"""
Generate polished PDF reports for VKU Capstone MediRead AI
Uses ReportLab to produce professional PDF documents with:
  - VKU header with school name, faculty, course info
  - Proper Vietnamese Unicode via a bundled TTF font fallback
  - Embedded ERD image in Report 2
  - Clean typography: headings, body, code blocks, tables
"""

import os, re, sys, textwrap
from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle,
    HRFlowable, KeepTogether, PageBreak
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Preformatted

# ── Colour palette ─────────────────────────────────────────────────────────
TEAL        = HexColor("#0B6B73")
TEAL_LIGHT  = HexColor("#E8F5F6")
TEAL_MID    = HexColor("#1a8a94")
GOLD        = HexColor("#D4A017")
GRAY_DARK   = HexColor("#2D2D2D")
GRAY_MID    = HexColor("#555555")
GRAY_LIGHT  = HexColor("#F5F5F5")
GRAY_BORDER = HexColor("#DDDDDD")
RED_WARN    = HexColor("#C0392B")

# ── Paths ──────────────────────────────────────────────────────────────────
REPORTS_DIR = Path(__file__).parent
ERD_IMAGE   = REPORTS_DIR / "database_schema_erd.jpg"
OUTPUT_DIR  = Path(r"D:\Đa nền tảng")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# ── Font registration (try several paths) ──────────────────────────────────
def _register_fonts():
    candidates = [
        (r"C:\Windows\Fonts\arial.ttf",         r"C:\Windows\Fonts\arialbd.ttf",   r"C:\Windows\Fonts\ariali.ttf"),
        (r"C:\Windows\Fonts\times.ttf",         r"C:\Windows\Fonts\timesbd.ttf",   r"C:\Windows\Fonts\timesi.ttf"),
        (r"C:\Windows\Fonts\calibri.ttf",       r"C:\Windows\Fonts\calibrib.ttf",  r"C:\Windows\Fonts\calibrii.ttf"),
        (r"C:\Windows\Fonts\segoeui.ttf",       r"C:\Windows\Fonts\segoeuib.ttf",  r"C:\Windows\Fonts\segoeuii.ttf"),
    ]
    for reg, bold, italic in candidates:
        if os.path.exists(reg) and os.path.exists(bold):
            pdfmetrics.registerFont(TTFont("Body",     reg))
            pdfmetrics.registerFont(TTFont("BodyBold", bold))
            if os.path.exists(italic):
                pdfmetrics.registerFont(TTFont("BodyItalic", italic))
            else:
                pdfmetrics.registerFont(TTFont("BodyItalic", reg))
            return "Body", "BodyBold", "BodyItalic"
    return "Helvetica", "Helvetica-Bold", "Helvetica-Oblique"

FONT, FONT_BOLD, FONT_ITALIC = _register_fonts()

# ── Style factory ──────────────────────────────────────────────────────────
def make_styles():
    s = {}
    def ps(name, **kw):
        defaults = dict(fontName=FONT, fontSize=10, leading=15,
                        textColor=GRAY_DARK, spaceAfter=4)
        defaults.update(kw)
        return ParagraphStyle(name, **defaults)

    s["h1"] = ps("h1", fontName=FONT_BOLD, fontSize=18, leading=24,
                 textColor=TEAL, spaceAfter=6, spaceBefore=12)
    s["h2"] = ps("h2", fontName=FONT_BOLD, fontSize=14, leading=20,
                 textColor=TEAL_MID, spaceAfter=4, spaceBefore=10,
                 borderPad=4, leftIndent=0)
    s["h3"] = ps("h3", fontName=FONT_BOLD, fontSize=11, leading=16,
                 textColor=GRAY_DARK, spaceAfter=3, spaceBefore=8)
    s["body"] = ps("body", alignment=TA_JUSTIFY, leading=16, spaceAfter=5)
    s["bullet"] = ps("bullet", leftIndent=14, bulletIndent=0,
                     leading=15, spaceAfter=3)
    s["code"] = ps("code", fontName="Courier", fontSize=8, leading=11,
                   backColor=GRAY_LIGHT, leftIndent=10, rightIndent=10,
                   borderPad=4, spaceAfter=6, textColor=HexColor("#1a1a1a"))
    s["caption"] = ps("caption", fontName=FONT_ITALIC, fontSize=9,
                      textColor=GRAY_MID, alignment=TA_CENTER, spaceAfter=8)
    s["note"] = ps("note", fontName=FONT_ITALIC, fontSize=9.5,
                   textColor=HexColor("#555"), leftIndent=12,
                   backColor=TEAL_LIGHT, borderPad=6, spaceAfter=6)
    s["header_title"] = ps("header_title", fontName=FONT_BOLD, fontSize=15,
                           textColor=white, alignment=TA_CENTER, leading=20)
    s["header_sub"]   = ps("header_sub", fontName=FONT, fontSize=9,
                           textColor=HexColor("#DDE"), alignment=TA_CENTER, leading=13)
    s["meta_key"]  = ps("meta_key",  fontName=FONT_BOLD, fontSize=9,
                        textColor=TEAL, spaceAfter=1)
    s["meta_val"]  = ps("meta_val",  fontName=FONT, fontSize=9.5,
                        textColor=GRAY_DARK, spaceAfter=4)
    return s

ST = make_styles()

# ── Header builder ─────────────────────────────────────────────────────────
def vku_header(report_no: str, report_title: str):
    """Returns a coloured header table (full page width)."""
    top = Table([[
        Paragraph("ĐẠI HỌC CÔNG NGHỆ THÔNG TIN VÀ TRUYỀN THÔNG VIỆT - HÀN (VKU)", ST["header_sub"]),
    ]], colWidths=[17*cm])
    top.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), TEAL),
        ("TOPPADDING",  (0,0), (-1,-1), 6),
        ("BOTTOMPADDING",(0,0),(-1,-1), 2),
    ]))

    mid_data = [[
        Paragraph(f"MediRead AI — {report_title}", ST["header_title"]),
    ]]
    mid = Table(mid_data, colWidths=[17*cm])
    mid.setStyle(TableStyle([
        ("BACKGROUND",   (0,0), (-1,-1), TEAL),
        ("TOPPADDING",   (0,0), (-1,-1), 4),
        ("BOTTOMPADDING",(0,0), (-1,-1), 4),
    ]))

    bot_data = [[
        Paragraph(f"{report_no}  •  Môn: Phát triển UD Di động Đa nền tảng  •  GVHD: TS. Nguyễn Thanh Tuấn  •  Nhóm 04 - MediRead", ST["header_sub"])
    ]]
    bot = Table(bot_data, colWidths=[17*cm])
    bot.setStyle(TableStyle([
        ("BACKGROUND",    (0,0),(-1,-1), HexColor("#094f55")),
        ("TOPPADDING",    (0,0),(-1,-1), 4),
        ("BOTTOMPADDING", (0,0),(-1,-1), 6),
    ]))

    wrapper = Table([[top],[mid],[bot]], colWidths=[17*cm])
    wrapper.setStyle(TableStyle([
        ("LEFTPADDING",  (0,0),(-1,-1), 0),
        ("RIGHTPADDING", (0,0),(-1,-1), 0),
        ("TOPPADDING",   (0,0),(-1,-1), 0),
        ("BOTTOMPADDING",(0,0),(-1,-1), 0),
    ]))
    return wrapper

# ── Meta info box ──────────────────────────────────────────────────────────
def meta_box(pairs):
    rows = []
    for k, v in pairs:
        rows.append([Paragraph(k, ST["meta_key"]), Paragraph(v, ST["meta_val"])])
    t = Table(rows, colWidths=[4.5*cm, 12.5*cm])
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0,0),(-1,-1), TEAL_LIGHT),
        ("BOX",           (0,0),(-1,-1), 0.5, TEAL),
        ("INNERGRID",     (0,0),(-1,-1), 0.3, GRAY_BORDER),
        ("VALIGN",        (0,0),(-1,-1), "TOP"),
        ("TOPPADDING",    (0,0),(-1,-1), 4),
        ("BOTTOMPADDING", (0,0),(-1,-1), 4),
        ("LEFTPADDING",   (0,0),(-1,-1), 6),
        ("RIGHTPADDING",  (0,0),(-1,-1), 6),
    ]))
    return t

# ── Markdown-lite parser → ReportLab flowables ────────────────────────────
def md_to_flowables(md_text: str, erd_image_path=None, report_no: int = 0):
    """Very lightweight Markdown → ReportLab converter."""
    flowables = []
    lines = md_text.splitlines()
    i = 0
    in_code = False
    code_buf = []

    def flush_code():
        nonlocal in_code, code_buf
        if code_buf:
            raw = "\n".join(code_buf)
            # wrap long lines
            wrapped = []
            for ln in raw.splitlines():
                wrapped.extend(textwrap.wrap(ln, 90) or [""])
            flowables.append(Preformatted("\n".join(wrapped), ST["code"]))
            flowables.append(Spacer(1, 4))
        code_buf = []
        in_code = False

    def clean(txt):
        # bold **text**
        txt = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', txt)
        # italic *text*
        txt = re.sub(r'\*(.+?)\*', r'<i>\1</i>', txt)
        # inline code `text`
        txt = re.sub(r'`([^`]+)`', r'<font name="Courier" size="9" color="#c0392b">\1</font>', txt)
        # links [text](url)
        txt = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'<u>\1</u>', txt)
        # math $...$  → strip dollar signs
        txt = re.sub(r'\$(.+?)\$', r'<i>\1</i>', txt)
        return txt

    while i < len(lines):
        line = lines[i]

        # --- fenced code block ---
        if line.strip().startswith("```"):
            if not in_code:
                in_code = True
                code_buf = []
            else:
                flush_code()
            i += 1
            continue

        if in_code:
            code_buf.append(line)
            i += 1
            continue

        # --- headings ---
        if line.startswith("# "):
            flowables.append(Spacer(1, 6))
            flowables.append(Paragraph(clean(line[2:]), ST["h1"]))
            flowables.append(HRFlowable(width="100%", thickness=1.5,
                                        color=TEAL, spaceAfter=6))
            i += 1; continue
        if line.startswith("## "):
            flowables.append(Spacer(1, 6))
            flowables.append(Paragraph(clean(line[3:]), ST["h2"]))
            flowables.append(HRFlowable(width="100%", thickness=0.5,
                                        color=TEAL_LIGHT, spaceAfter=4))
            i += 1; continue
        if line.startswith("### "):
            flowables.append(Spacer(1, 4))
            flowables.append(Paragraph(clean(line[4:]), ST["h3"]))
            i += 1; continue

        # --- horizontal rule ---
        if re.match(r'^-{3,}$', line.strip()):
            flowables.append(HRFlowable(width="100%", thickness=0.5,
                                        color=GRAY_BORDER, spaceAfter=4))
            i += 1; continue

        # --- blockquote (note box) ---
        if line.startswith("> "):
            flowables.append(Paragraph(clean(line[2:]), ST["note"]))
            i += 1; continue

        # --- bullet list ---
        m = re.match(r'^(\s*)[*\-]\s+(.*)', line)
        if m:
            indent = len(m.group(1))
            txt = clean(m.group(2))
            style = ParagraphStyle(
                "bul_dyn", parent=ST["bullet"],
                leftIndent=14 + indent * 10,
                bulletText="•"
            )
            flowables.append(Paragraph(txt, style))
            i += 1; continue

        # --- numbered list ---
        m2 = re.match(r'^\s*(\d+)\.\s+(.*)', line)
        if m2:
            txt = clean(f"{m2.group(1)}. {m2.group(2)}")
            flowables.append(Paragraph(txt, ST["bullet"]))
            i += 1; continue

        # --- table rows ---
        if line.startswith("|") and "|" in line[1:]:
            # Collect full table
            table_lines = []
            while i < len(lines) and lines[i].startswith("|"):
                table_lines.append(lines[i])
                i += 1
            # filter separator rows
            rows = [r for r in table_lines
                    if not re.match(r'^[\|\s:\-]+$', r)]
            if rows:
                tdata = []
                for r in rows:
                    cells = [c.strip() for c in r.strip("|").split("|")]
                    tdata.append(cells)
                # Build reportlab table
                col_count = max(len(r) for r in tdata)
                col_w = [17*cm / col_count] * col_count
                rt_data = []
                for ri, row in enumerate(tdata):
                    # pad / trim
                    while len(row) < col_count: row.append("")
                    style_ = ST["meta_key"] if ri == 0 else ST["body"]
                    rt_data.append([Paragraph(clean(c), style_) for c in row[:col_count]])
                rt = Table(rt_data, colWidths=col_w, repeatRows=1)
                rt.setStyle(TableStyle([
                    ("BACKGROUND",    (0,0), (-1,0), TEAL),
                    ("TEXTCOLOR",     (0,0), (-1,0), white),
                    ("FONTNAME",      (0,0), (-1,0), FONT_BOLD),
                    ("BACKGROUND",    (0,1), (-1,-1), white),
                    ("ROWBACKGROUNDS",(0,1), (-1,-1), [white, TEAL_LIGHT]),
                    ("GRID",          (0,0), (-1,-1), 0.4, GRAY_BORDER),
                    ("VALIGN",        (0,0), (-1,-1), "TOP"),
                    ("TOPPADDING",    (0,0), (-1,-1), 5),
                    ("BOTTOMPADDING", (0,0), (-1,-1), 5),
                    ("LEFTPADDING",   (0,0), (-1,-1), 6),
                    ("RIGHTPADDING",  (0,0), (-1,-1), 6),
                ]))
                flowables.append(rt)
                flowables.append(Spacer(1, 6))
            continue

        # --- ERD image placeholder ---
        if "database_schema_erd.jpg" in line and erd_image_path and os.path.exists(erd_image_path):
            img = Image(str(erd_image_path), width=16*cm, height=9*cm,
                        kind="proportional")
            flowables.append(Spacer(1, 6))
            flowables.append(img)
            flowables.append(Paragraph(
                "Hình 1: Entity-Relationship Diagram (ERD) toàn hệ thống MediRead AI — Supabase PostgreSQL",
                ST["caption"]
            ))
            flowables.append(Spacer(1, 6))
            i += 1; continue

        # --- skip raw markdown image lines ---
        if line.strip().startswith("!["):
            i += 1; continue

        # --- empty line → small spacer ---
        if not line.strip():
            flowables.append(Spacer(1, 4))
            i += 1; continue

        # --- normal paragraph ---
        flowables.append(Paragraph(clean(line), ST["body"]))
        i += 1

    if in_code:
        flush_code()

    return flowables


# ── Page footer ────────────────────────────────────────────────────────────
def make_footer(canvas_obj, doc):
    canvas_obj.saveState()
    w, h = A4
    canvas_obj.setFillColor(TEAL)
    canvas_obj.rect(0, 0, w, 1.1*cm, fill=1, stroke=0)
    canvas_obj.setFillColor(white)
    canvas_obj.setFont(FONT_BOLD, 8)
    canvas_obj.drawString(1.5*cm, 0.4*cm, "MediRead AI  •  VKU Capstone  •  Nhóm 04")
    canvas_obj.drawRightString(w - 1.5*cm, 0.4*cm, f"Trang {doc.page}")
    canvas_obj.restoreState()


# ── Main build function ────────────────────────────────────────────────────
META_COMMON = [
    ("Học phần:",    "Phát triển Ứng dụng Di động Đa nền tảng (Cross-Platform Mobile App)"),
    ("Khoa:",        "Khoa học Máy tính — VKU Việt - Hàn"),
    ("GVHD:",        "TS. Nguyễn Thanh Tuấn"),
    ("Nhóm:",        "Nhóm 04 - MediRead Team"),
    ("Đề tài (VN):", "Ứng dụng di động MediRead AI — Số hóa, giải thích phiếu xét nghiệm, đơn thuốc y khoa và trợ lý Bác sĩ AI"),
    ("Đề tài (EN):", "MediRead AI — Cross-Platform App for Medical Document Digitization, Lab Explanation & AI Consultation"),
    ("GitHub:",      "https://github.com/LiLLy3172005/VkuStudent_danentang_Mediread"),
]

REPORTS = [
    {
        "file":  REPORTS_DIR / "REPORT_1_PROPOSAL_SPECIFICATION.md",
        "out":   OUTPUT_DIR / "Report_1_De_Xuat_De_Tai_MediRead_AI.pdf",
        "no":    "Report 1 — M1 (10%)",
        "title": "Đề Xuất Đề Tài & Yêu Cầu Nghiệp Vụ",
    },
    {
        "file":  REPORTS_DIR / "REPORT_2_CLEAN_ARCHITECTURE_DATABASE.md",
        "out":   OUTPUT_DIR / "Report_2_Clean_Architecture_Database_MediRead_AI.pdf",
        "no":    "Report 2 — M2 (15%)",
        "title": "Kiến Trúc Clean Architecture & CSDL Supabase",
        "erd":   ERD_IMAGE,
    },
    {
        "file":  REPORTS_DIR / "REPORT_3_AI_OFFLINE_SYNC_TESTS.md",
        "out":   OUTPUT_DIR / "Report_3_AI_Offline_Sync_Tests_MediRead_AI.pdf",
        "no":    "Report 3 — M3 (15%)",
        "title": "Tích Hợp AI, Offline Sync & Kiểm Thử",
    },
    {
        "file":  REPORTS_DIR / "REPORT_4_FINAL_CAPSTONE_SUMMARY.md",
        "out":   OUTPUT_DIR / "Report_4_Final_Capstone_MediRead_AI.pdf",
        "no":    "Report 4 — M4 (60%)",
        "title": "Báo Cáo Tổng Kết Cuối Kỳ & Hồ Sơ Bảo Vệ",
    },
]


def build_pdf(cfg):
    md_text = Path(cfg["file"]).read_text(encoding="utf-8")
    erd = str(cfg.get("erd", "")) or None

    doc = SimpleDocTemplate(
        str(cfg["out"]),
        pagesize=A4,
        leftMargin=2*cm, rightMargin=2*cm,
        topMargin=2*cm,  bottomMargin=2.2*cm,
        title=f"MediRead AI — {cfg['title']}",
        author="Nhóm 04 - MediRead Team VKU",
        subject=cfg["no"],
    )

    story = []

    # Header banner
    story.append(vku_header(cfg["no"], cfg["title"]))
    story.append(Spacer(1, 10))

    # Meta info table
    story.append(meta_box(META_COMMON))
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1, color=TEAL, spaceAfter=8))

    # Report body
    body_flowables = md_to_flowables(md_text, erd_image_path=erd)
    story.extend(body_flowables)

    doc.build(story, onFirstPage=make_footer, onLaterPages=make_footer)
    print(f"  ✓  {cfg['out'].name}")


if __name__ == "__main__":
    print(f"\n{'='*60}")
    print("  Đang xuất 4 báo cáo PDF — MediRead AI VKU Capstone")
    print(f"  Thư mục đầu ra: {OUTPUT_DIR}")
    print(f"{'='*60}")
    for r in REPORTS:
        sys.stdout.write(f"  → {r['no']} ... ")
        sys.stdout.flush()
        try:
            build_pdf(r)
        except Exception as e:
            print(f"  ✗ LỖI: {e}")
    print(f"\n{'='*60}")
    print("  Hoàn tất! Mở thư mục D:\\Đa nền tảng để kiểm tra.")
    print(f"{'='*60}\n")
