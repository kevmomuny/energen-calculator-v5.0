"""
Comprehensive PDF Analysis and Visual Preview Generator
Analyzes generated PDF for formatting, accuracy, and visual quality
"""

import pdfplumber
from pypdf import PdfReader
import json
import os

pdf_path = r'C:\ECalc\active\energen-calculator-v5.0\output\pdfs\Energen_Bid_null.pdf'
output_dir = r'C:\ECalc\active\energen-calculator-v5.0\output\pdfs'

print("=" * 80)
print("PDF QUALITY ANALYSIS REPORT")
print("=" * 80)

# Check if PDF exists
if not os.path.exists(pdf_path):
    print(f" ERROR: PDF not found at {pdf_path}")
    exit(1)

print(f"\nAnalyzing: {os.path.basename(pdf_path)}")
print(f"File size: {os.path.getsize(pdf_path) / 1024:.2f} KB")

# === METADATA ANALYSIS ===
print("\n" + "=" * 80)
print("1. METADATA ANALYSIS")
print("=" * 80)

reader = PdfReader(pdf_path)
meta = reader.metadata

print(f"Pages: {len(reader.pages)}")
print(f"Producer: {meta.get('/Producer', 'N/A')}")
print(f"Creator: {meta.get('/Creator', 'N/A')}")
print(f"Creation Date: {meta.get('/CreationDate', 'N/A')}")
print(f"Title: {meta.get('/Title', 'N/A')}")
print(f"Author: {meta.get('/Author', 'N/A')}")

# === PAGE DIMENSIONS ===
print("\n" + "=" * 80)
print("2. PAGE DIMENSIONS & LAYOUT")
print("=" * 80)

with pdfplumber.open(pdf_path) as pdf:
    for i, page in enumerate(pdf.pages, 1):
        width_in = page.width / 72
        height_in = page.height / 72
        print(f"\nPage {i}:")
        print(f"  Dimensions: {page.width} x {page.height} points")
        print(f"  Size: {width_in:.2f}\" x {height_in:.2f}\"")
        
        # Check if it's standard letter size
        is_letter = (abs(width_in - 8.5) < 0.1) and (abs(height_in - 11) < 0.1)
        print(f"  Standard Letter: {' YES' if is_letter else ' NO'}")

# === TEXT CONTENT ANALYSIS ===
print("\n" + "=" * 80)
print("3. TEXT CONTENT ANALYSIS")
print("=" * 80)

with pdfplumber.open(pdf_path) as pdf:
    page = pdf.pages[0]
    
    # Extract all text
    full_text = page.extract_text()
    
    # Count text objects
    words = page.extract_words()
    print(f"\nText objects: {len(words)}")
    print(f"Total characters: {len(full_text)}")
    
    # Check for key sections
    sections = {
        "Title": "GENERATOR SERVICE AGREEMENT" in full_text,
        "Customer Info": "CUSTOMER INFORMATION" in full_text,
        "Equipment Details": "EQUIPMENT DETAILS" in full_text,
        "Service Table": "SERVICE DESCRIPTION" in full_text,
        "Quarterly Totals": "QUARTERLY TOTALS" in full_text,
        "Contract Terms": "CONTRACT TERMS" in full_text or "SERVICE AGREEMENT TERMS" in full_text,
        "Signature Blocks": "CUSTOMER SIGNATURE" in full_text or "Authorized Signature" in full_text,
        "Footer": "Energen Systems" in full_text
    }
    
    print("\nSection Checklist:")
    for section, present in sections.items():
        status = "" if present else ""
        print(f"  {status} {section}")
    
    # Check for pricing data
    has_pricing = "$" in full_text and not full_text.count("$0.00") == full_text.count("$")
    print(f"\nPricing Data Present: {' YES' if has_pricing else ' NO (all $0.00)'}")

# === TABLE STRUCTURE ANALYSIS ===
print("\n" + "=" * 80)
print("4. TABLE STRUCTURE ANALYSIS")
print("=" * 80)

with pdfplumber.open(pdf_path) as pdf:
    page = pdf.pages[0]
    tables = page.extract_tables()
    
    print(f"\nTables detected: {len(tables)}")
    
    if len(tables) == 0:
        print(" WARNING: No tables detected by pdfplumber")
        print("   This may indicate:")
        print("   - Table is rendered as text/graphics instead of proper table structure")
        print("   - Table borders are images/graphics, not PDF table objects")
        print("   - Text positioning creates visual table appearance only")

    # Check for specific customer data
    print("\n" + "=" * 80)
    print("5. DATA ACCURACY CHECK")
    print("=" * 80)
    
    customer_data = {
        "Company Name": "ACME Industries Test Corp",
        "Address": "1234 Industrial Parkway",
        "City": "San Francisco",
        "State": "CA",
        "Zip": "94107"
    }
    
    print("\nCustomer Data Verification:")
    for field, expected in customer_data.items():
        present = expected in full_text
        status = "" if present else ""
        print(f"  {status} {field}: {expected}")

# === VISUAL PREVIEW GENERATION ===
print("\n" + "=" * 80)
print("6. GENERATING VISUAL PREVIEW")
print("=" * 80)

try:
    from pdf2image import convert_from_path
    
    print("\nConverting PDF to image...")
    images = convert_from_path(pdf_path, dpi=150)
    
    if images:
        preview_path = os.path.join(output_dir, 'Energen_Bid_preview.png')
        images[0].save(preview_path, 'PNG')
        print(f" Preview saved: {preview_path}")
        print(f"   Image size: {images[0].size}")
        print(f"   File size: {os.path.getsize(preview_path) / 1024:.2f} KB")
    else:
        print(" No images generated")
        
except ImportError:
    print(" pdf2image not available - skipping visual preview")
    print("   Install with: pip install pdf2image")
    print("   Also requires poppler: https://github.com/oschwartz10612/poppler-windows/releases/")
except Exception as e:
    print(f" Error generating preview: {e}")

# === FINAL ASSESSMENT ===
print("\n" + "=" * 80)
print("7. OVERALL PDF QUALITY ASSESSMENT")
print("=" * 80)

issues = []
warnings = []

# Check critical elements
if not sections.get("Title"):
    issues.append("Missing title section")
if not sections.get("Customer Info"):
    issues.append("Missing customer information")
if not sections.get("Service Table"):
    issues.append("Missing service table")
if not sections.get("Signature Blocks"):
    warnings.append("Missing signature blocks")

# Check data completeness
if not has_pricing:
    warnings.append("No pricing data (all values $0.00)")

# Check table structure
if len(tables) == 0:
    warnings.append("Service table not detected as structured table (may impact editing)")

print("\n Quality Report:")
print(f"   Structure: {' PASS' if len(issues) == 0 else ' FAIL'}")
print(f"   Data: {' COMPLETE' if has_pricing else ' INCOMPLETE'}")
print(f"   Formatting: {' GOOD' if len(warnings) <= 2 else ' NEEDS REVIEW'}")

if issues:
    print("\n Critical Issues:")
    for issue in issues:
        print(f"   - {issue}")

if warnings:
    print("\n Warnings:")
    for warning in warnings:
        print(f"   - {warning}")

if not issues and not warnings:
    print("\n PDF Quality: EXCELLENT")
elif not issues:
    print("\n PDF Quality: GOOD (minor warnings)")
else:
    print("\n PDF Quality: NEEDS IMPROVEMENT")

print("\n" + "=" * 80)
print("ANALYSIS COMPLETE")
print("=" * 80)
