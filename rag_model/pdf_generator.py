"""
Medical PDF Report Generator
=============================
Generates a professional, hospital-style PDF medical history report for a patient.
Uses reportlab (pure Python, no system dependencies) for Render compatibility.
Uses matplotlib for embedded trend charts.
"""

import io
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# REPORTLAB IMPORTS (guarded — all color defs inside the try block)
# ─────────────────────────────────────────────────────────────────────────────

try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import mm, cm
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
        HRFlowable, KeepTogether, PageBreak
    )
    from reportlab.platypus import Image as RLImage
    REPORTLAB_AVAILABLE = True

    # Color palette — defined HERE inside the try block so 'colors' is in scope
    COLORS = {
        "primary": colors.HexColor("#1a5f7a"),
        "accent": colors.HexColor("#2d9cdb"),
        "success": colors.HexColor("#27ae60"),
        "warning": colors.HexColor("#f39c12"),
        "danger": colors.HexColor("#e74c3c"),
        "critical": colors.HexColor("#8e1a1a"),
        "light_bg": colors.HexColor("#f0f4f8"),
        "header_bg": colors.HexColor("#1a5f7a"),
        "row_alt": colors.HexColor("#eaf4fb"),
        "border": colors.HexColor("#b0c4d8"),
        "text_dark": colors.HexColor("#1a202c"),
        "text_mid": colors.HexColor("#4a5568"),
        "text_light": colors.HexColor("#718096"),
        "white": colors.white,
    }

    RISK_COLOR_MAP = {
        "Normal": COLORS["success"],
        "Mild": COLORS["warning"],
        "Moderate": COLORS["warning"],
        "Severe": COLORS["danger"],
        "Critical": COLORS["critical"],
        "Unknown": COLORS["text_light"],
    }

except ImportError:
    REPORTLAB_AVAILABLE = False
    COLORS = {}
    RISK_COLOR_MAP = {}
    logger.warning("reportlab not installed. PDF generation unavailable.")


try:
    import matplotlib
    matplotlib.use('Agg')  # Non-interactive backend for servers
    import matplotlib.pyplot as plt
    import matplotlib.patches as mpatches
    MATPLOTLIB_AVAILABLE = True
except ImportError:
    MATPLOTLIB_AVAILABLE = False
    logger.warning("matplotlib not installed. Charts unavailable.")


# ─────────────────────────────────────────────────────────────────────────────
# CHART GENERATORS
# ─────────────────────────────────────────────────────────────────────────────

def _generate_trend_chart(test_name: str, history: list) -> Optional[bytes]:
    """Generate a line chart for a lab test trend. Returns PNG bytes."""
    if not MATPLOTLIB_AVAILABLE or len(history) < 2:
        return None
    try:
        dates = [h.get("date", f"T{i+1}") for i, h in enumerate(history)]
        values = [float(h.get("value", 0)) for h in history]

        dates_display = [d[:10] if len(d) > 10 else d for d in dates]

        fig, ax = plt.subplots(figsize=(6, 2.5))
        ax.plot(dates_display, values, 'o-', color='#2d9cdb', linewidth=2,
                markersize=6, markerfacecolor='white', markeredgewidth=2)
        ax.fill_between(range(len(values)), values, alpha=0.1, color='#2d9cdb')
        ax.set_title(test_name.title(), fontsize=10, fontweight='bold', color='#1a5f7a')
        ax.set_ylabel(history[0].get("unit", ""), fontsize=8)
        ax.tick_params(axis='x', rotation=30, labelsize=7)
        ax.tick_params(axis='y', labelsize=8)
        ax.grid(True, alpha=0.3, linestyle='--')
        ax.spines['top'].set_visible(False)
        ax.spines['right'].set_visible(False)
        plt.tight_layout()

        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=120, bbox_inches='tight')
        plt.close(fig)
        buf.seek(0)
        return buf.read()
    except Exception as e:
        logger.warning(f"Chart generation failed for {test_name}: {e}")
        return None


def _generate_risk_pie(normal_count: int, abnormal_count: int) -> Optional[bytes]:
    """Generate a pie chart showing normal vs abnormal test ratio."""
    if not MATPLOTLIB_AVAILABLE:
        return None
    try:
        fig, ax = plt.subplots(figsize=(3, 3))
        labels = ['Normal', 'Abnormal']
        sizes = [max(normal_count, 0), max(abnormal_count, 0)]
        colors_pie = ['#27ae60', '#e74c3c']

        if sum(sizes) == 0:
            plt.close(fig)
            return None

        wedges, texts, autotexts = ax.pie(
            sizes, labels=labels, colors=colors_pie,
            autopct='%1.0f%%', startangle=90,
            textprops={'fontsize': 9}
        )
        for at in autotexts:
            at.set_fontsize(9)
            at.set_fontweight('bold')
        ax.set_title('Test Results', fontsize=10, fontweight='bold', color='#1a5f7a')
        plt.tight_layout()

        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=120, bbox_inches='tight')
        plt.close(fig)
        buf.seek(0)
        return buf.read()
    except Exception as e:
        logger.warning(f"Pie chart failed: {e}")
        return None


# ─────────────────────────────────────────────────────────────────────────────
# PDF DOCUMENT BUILDER
# ─────────────────────────────────────────────────────────────────────────────

def generate_medical_pdf(
    user_info: dict,
    health_profile: dict,
    timeline: list,
    lab_insights: dict,
    ai_summary: str = "",
) -> bytes:
    """
    Generate a complete medical history PDF.

    Args:
        user_info: {username, email, age, gender, bloodType, dateOfBirth, ...}
        health_profile: AI-generated health profile JSON
        timeline: Chronological medical events
        lab_insights: {test_name: [{value, unit, risk_level, date}...]}
        ai_summary: AI-generated narrative summary

    Returns:
        PDF bytes for download
    """
    if not REPORTLAB_AVAILABLE:
        raise ImportError(
            "reportlab is required for PDF generation. "
            "Install with: pip install reportlab"
        )

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        rightMargin=20 * mm,
        leftMargin=20 * mm,
        topMargin=15 * mm,
        bottomMargin=20 * mm,
        title="Medical History Report",
        author="MedReport AI",
    )

    styles = getSampleStyleSheet()

    style_h1 = ParagraphStyle(
        'H1', parent=styles['Heading1'],
        fontSize=22, textColor=COLORS["white"],
        spaceAfter=6, fontName='Helvetica-Bold',
        alignment=TA_CENTER
    )
    style_h2 = ParagraphStyle(
        'H2', parent=styles['Heading2'],
        fontSize=13, textColor=COLORS["primary"],
        spaceBefore=14, spaceAfter=6, fontName='Helvetica-Bold',
        borderPad=4
    )
    style_h3 = ParagraphStyle(
        'H3', parent=styles['Heading3'],
        fontSize=11, textColor=COLORS["primary"],
        spaceBefore=8, spaceAfter=4, fontName='Helvetica-Bold'
    )
    style_body = ParagraphStyle(
        'Body', parent=styles['Normal'],
        fontSize=9, textColor=COLORS["text_dark"],
        spaceAfter=4, leading=14
    )
    style_body_mid = ParagraphStyle(
        'BodyMid', parent=styles['Normal'],
        fontSize=9, textColor=COLORS["text_mid"],
        spaceAfter=3, leading=13
    )
    style_alert = ParagraphStyle(
        'Alert', parent=styles['Normal'],
        fontSize=9, textColor=COLORS["danger"],
        spaceAfter=4, leading=14, fontName='Helvetica-Bold'
    )
    style_center = ParagraphStyle(
        'Center', parent=styles['Normal'],
        fontSize=9, alignment=TA_CENTER,
        textColor=COLORS["text_light"]
    )

    story = []
    W = A4[0] - 40 * mm  # usable width

    # ── HEADER BANNER ──
    header_table = Table(
        [[Paragraph("MEDREPORT AI", style_h1)]],
        colWidths=[W]
    )
    header_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), COLORS["primary"]),
        ('TOPPADDING', (0, 0), (-1, -1), 14),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 14),
        ('LEFTPADDING', (0, 0), (-1, -1), 16),
        ('RIGHTPADDING', (0, 0), (-1, -1), 16),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 4 * mm))

    sub_table = Table(
        [[Paragraph("PATIENT MEDICAL HISTORY REPORT", ParagraphStyle(
            'sub', parent=styles['Normal'],
            fontSize=11, textColor=COLORS["primary"],
            fontName='Helvetica-Bold', alignment=TA_CENTER
        ))]],
        colWidths=[W]
    )
    sub_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), COLORS["light_bg"]),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LINEBELOW', (0, 0), (-1, -1), 0.5, COLORS["border"]),
    ]))
    story.append(sub_table)
    story.append(Spacer(1, 6 * mm))

    story.append(Paragraph(
        f"Generated: {datetime.now().strftime('%B %d, %Y at %H:%M')}  -  Confidential Medical Document",
        style_center
    ))
    story.append(Spacer(1, 5 * mm))
    story.append(HRFlowable(width=W, thickness=1, color=COLORS["border"]))
    story.append(Spacer(1, 5 * mm))

    # ── PATIENT INFORMATION ──
    story.append(Paragraph("1. PATIENT INFORMATION", style_h2))

    name = user_info.get("username", "N/A")
    email = user_info.get("email", "N/A")
    age = user_info.get("age", "N/A")
    gender = str(user_info.get("gender", "N/A")).capitalize()
    blood_type = user_info.get("bloodType", "N/A")
    dob = user_info.get("dateOfBirth", "N/A")
    phone = user_info.get("phone", "N/A")
    medical_id = user_info.get("medicalId", "N/A")

    patient_data = [
        ["Full Name", name, "Medical ID", medical_id],
        ["Email", email, "Date of Birth", dob],
        ["Age", str(age), "Phone", phone],
        ["Gender", gender, "Blood Type", blood_type],
    ]

    pt = Table(patient_data, colWidths=[35 * mm, 70 * mm, 35 * mm, W - 140 * mm])
    pt.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('TEXTCOLOR', (0, 0), (0, -1), COLORS["text_mid"]),
        ('TEXTCOLOR', (2, 0), (2, -1), COLORS["text_mid"]),
        ('TEXTCOLOR', (1, 0), (1, -1), COLORS["text_dark"]),
        ('TEXTCOLOR', (3, 0), (3, -1), COLORS["text_dark"]),
        ('ROWBACKGROUNDS', (0, 0), (-1, -1), [COLORS["white"], COLORS["light_bg"]]),
        ('GRID', (0, 0), (-1, -1), 0.3, COLORS["border"]),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(pt)
    story.append(Spacer(1, 6 * mm))

    # ── AI HEALTH PROFILE ──
    story.append(Paragraph("2. AI-GENERATED HEALTH PROFILE", style_h2))

    if health_profile:
        profile_items = [
            ("Chronic Conditions", health_profile.get("chronic_conditions", [])),
            ("Known Allergies", health_profile.get("allergies", [])),
            ("Current Medications", health_profile.get("current_medications", [])),
            ("Previous Diagnoses", health_profile.get("previous_diagnoses", [])),
            ("Risk Indicators", health_profile.get("risk_indicators", [])),
            ("Recurring Symptoms", health_profile.get("recurring_symptoms", [])),
        ]

        profile_data = [["Category", "Details"]]
        for label, items in profile_items:
            val = ", ".join(items) if isinstance(items, list) and items else (str(items) if items else "None identified")
            profile_data.append([label, val])

        pft = Table(profile_data, colWidths=[50 * mm, W - 50 * mm])
        pft.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), COLORS["primary"]),
            ('TEXTCOLOR', (0, 0), (-1, 0), COLORS["white"]),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),
            ('TEXTCOLOR', (0, 1), (0, -1), COLORS["text_mid"]),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [COLORS["white"], COLORS["light_bg"]]),
            ('GRID', (0, 0), (-1, -1), 0.3, COLORS["border"]),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        story.append(pft)
    else:
        story.append(Paragraph(
            "No health profile data available yet. Upload medical reports and chat with the AI to build your profile.",
            style_body_mid
        ))

    story.append(Spacer(1, 6 * mm))

    # ── AI SUMMARY ──
    if ai_summary:
        story.append(Paragraph("3. AI HEALTH SUMMARY", style_h2))
        clean_summary = (
            ai_summary.replace("**", "")
            .replace("##", "")
            .replace("#", "")
            .replace("*", "-")
            .replace("=", "")
            .replace("■", "")
            .replace("⬛", "")
            .replace("▪", "")
        )
        for line in clean_summary.split("\n"):
            line = line.strip(" =■▪⬛\t\r")
            if line:
                if line.startswith("-") or (len(line) > 1 and line[0].isdigit() and line[1] == "."):
                    story.append(Paragraph(f"&nbsp;&nbsp;{line}", style_body))
                else:
                    story.append(Paragraph(line, style_body))
        story.append(Spacer(1, 6 * mm))

    # ── LAB RESULTS ──
    story.append(Paragraph("4. LAB RESULTS & TRENDS", style_h2))

    lab_tests = lab_insights.get("lab_tests", {})
    if lab_tests:
        all_last_risks = [
            h[-1].get("risk_level", "Unknown")
            for h in lab_tests.values() if h
        ]
        normal_count = sum(1 for r in all_last_risks if r == "Normal")
        abnormal_count = len(all_last_risks) - normal_count

        summary_row_data = [[
            Paragraph(f"<b>Total Tests Tracked</b><br/>{len(lab_tests)} unique tests", style_body),
            Paragraph(f"<b>Normal Results</b><br/><font color='#27ae60'>{normal_count} tests</font>", style_body),
            Paragraph(f"<b>Abnormal Results</b><br/><font color='#e74c3c'>{abnormal_count} tests</font>", style_body),
            Paragraph(f"<b>Total Reports</b><br/>{lab_insights.get('total_reports', 0)} uploaded", style_body),
        ]]
        summary_t = Table(summary_row_data, colWidths=[W / 4] * 4)
        summary_t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), COLORS["light_bg"]),
            ('GRID', (0, 0), (-1, -1), 0.3, COLORS["border"]),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        story.append(summary_t)
        story.append(Spacer(1, 5 * mm))

        # Detailed test table
        test_table_data = [["Test Name", "Latest Value", "Unit", "Risk Level", "Readings", "Trend"]]
        for test_name, history in sorted(lab_tests.items()):
            if not history:
                continue
            latest = history[-1]
            risk = latest.get("risk_level", "Unknown")

            if len(history) >= 2:
                try:
                    first_v = float(history[0].get("value", 0))
                    last_v = float(latest.get("value", 0))
                    pct = (last_v - first_v) / first_v * 100 if first_v else 0
                    trend = f"Up {pct:.0f}%" if pct > 5 else (f"Down {abs(pct):.0f}%" if pct < -5 else "Stable")
                except Exception:
                    trend = "N/A"
            else:
                trend = "Single reading"

            test_table_data.append([
                test_name.title(),
                str(latest.get("value", "N/A")),
                latest.get("unit", ""),
                risk,
                str(len(history)),
                trend
            ])

        tt = Table(test_table_data, colWidths=[50 * mm, 28 * mm, 20 * mm, 26 * mm, 22 * mm, W - 146 * mm])
        risk_styles = []
        for i, row in enumerate(test_table_data[1:], 1):
            risk_level = row[3]
            risk_color = RISK_COLOR_MAP.get(risk_level, COLORS["text_dark"])
            risk_styles.append(('TEXTCOLOR', (3, i), (3, i), risk_color))
            risk_styles.append(('FONTNAME', (3, i), (3, i), 'Helvetica-Bold'))

        tt.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), COLORS["primary"]),
            ('TEXTCOLOR', (0, 0), (-1, 0), COLORS["white"]),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [COLORS["white"], COLORS["light_bg"]]),
            ('GRID', (0, 0), (-1, -1), 0.3, COLORS["border"]),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ] + risk_styles))
        story.append(tt)
        story.append(Spacer(1, 5 * mm))

        # Trend charts
        multi_tests = [(k, v) for k, v in lab_tests.items() if len(v) >= 2]
        if multi_tests:
            story.append(Paragraph("4.1 Lab Value Trend Charts", style_h3))
            chart_row = []
            charts_added = 0
            for test_name, history in multi_tests[:6]:
                chart_bytes = _generate_trend_chart(test_name, history)
                if chart_bytes:
                    img_buf = io.BytesIO(chart_bytes)
                    img = RLImage(img_buf, width=85 * mm, height=35 * mm)
                    chart_row.append(img)
                    charts_added += 1
                    if len(chart_row) == 2:
                        row_table = Table([[chart_row[0], chart_row[1]]], colWidths=[90 * mm, 90 * mm])
                        row_table.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP')]))
                        story.append(row_table)
                        story.append(Spacer(1, 3 * mm))
                        chart_row = []
            if chart_row:
                story.append(Table([[chart_row[0]]], colWidths=[90 * mm]))
    else:
        story.append(Paragraph("No lab results tracked yet. Upload medical reports to see your data.", style_body_mid))

    story.append(Spacer(1, 6 * mm))

    # ── HEALTH TIMELINE ──
    story.append(Paragraph("5. MEDICAL TIMELINE", style_h2))

    if timeline:
        timeline_data = [["Date", "Event Type", "Details"]]
        for event in sorted(timeline, key=lambda x: x.get("created_at", ""), reverse=True)[:20]:
            date = str(event.get("created_at", ""))[:10]
            etype = event.get("type", "event").replace("_", " ").title()
            if event.get("type") == "report":
                tests = event.get("tests", [])
                abnormal = [t for t in tests if t.get("risk_level") not in ("Normal", "Unknown", None)]
                detail = f"{len(tests)} tests extracted"
                if abnormal:
                    detail += f" - {len(abnormal)} abnormal"
            elif event.get("type") == "chat_session":
                detail = f"{event.get('message_count', 0)} messages"
            else:
                detail = str(event.get("topic", ""))
            timeline_data.append([date, etype, detail])

        tlt = Table(timeline_data, colWidths=[25 * mm, 40 * mm, W - 65 * mm])
        tlt.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), COLORS["primary"]),
            ('TEXTCOLOR', (0, 0), (-1, 0), COLORS["white"]),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [COLORS["white"], COLORS["light_bg"]]),
            ('GRID', (0, 0), (-1, -1), 0.3, COLORS["border"]),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        story.append(tlt)
    else:
        story.append(Paragraph("No timeline events recorded yet.", style_body_mid))

    story.append(Spacer(1, 6 * mm))

    # ── IMPORTANT ALERTS ──
    if lab_tests:
        critical_tests = [
            (name, h[-1]) for name, h in lab_tests.items()
            if h and h[-1].get("risk_level") in ("Critical", "Severe")
        ]
        if critical_tests:
            story.append(Paragraph("WARNING: IMPORTANT HEALTH ALERTS", style_h2))
            for test_name, latest in critical_tests:
                story.append(Paragraph(
                    f"[!] {test_name.title()}: {latest.get('value')} {latest.get('unit', '')} - "
                    f"{latest.get('risk_level')} - Consult your doctor immediately.",
                    style_alert
                ))
            story.append(Spacer(1, 4 * mm))

    # ── FOOTER ──
    story.append(HRFlowable(width=W, thickness=0.5, color=COLORS["border"]))
    story.append(Spacer(1, 3 * mm))
    story.append(Paragraph(
        "DISCLAIMER: This document is generated by MedReport AI and is intended for informational "
        "purposes only. It does not constitute medical advice, diagnosis, or treatment. Always "
        "consult a qualified healthcare professional before making any medical decisions.",
        ParagraphStyle('Disclaimer', parent=styles['Normal'],
                       fontSize=7, textColor=COLORS["text_light"],
                       leading=10, alignment=TA_CENTER)
    ))
    story.append(Spacer(1, 2 * mm))
    story.append(Paragraph(
        f"MedReport AI  -  Generated on {datetime.now().strftime('%B %d, %Y')}  -  Confidential",
        style_center
    ))

    doc.build(story)
    buf.seek(0)
    return buf.read()
