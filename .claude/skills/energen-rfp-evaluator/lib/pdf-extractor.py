#!/usr/bin/env python3
"""
pdf-extractor.py - PDF Text Extraction Utility for RFP Evaluator

Uses pypdf library to extract text from PDF documents.
Called by Node.js RFP evaluator scripts via subprocess.

Usage:
    python pdf-extractor.py <pdf-file-path>

Output: JSON to stdout with format:
{
    "success": true,
    "text": "extracted text content",
    "pages": 50,
    "fileName": "document.pdf"
}

@version 1.0.0
"""

import sys
import json
import os
from pathlib import Path

try:
    from pypdf import PdfReader
except ImportError:
    print(json.dumps({
        "success": false,
        "error": "pypdf library not installed. Install with: pip install pypdf",
        "text": "",
        "pages": 0
    }))
    sys.exit(1)


def extract_text_from_pdf(pdf_path):
    """
    Extract all text from a PDF file

    Args:
        pdf_path (str): Path to PDF file

    Returns:
        dict: Extraction results with text, page count, etc.
    """
    try:
        # Validate file exists
        if not os.path.exists(pdf_path):
            return {
                "success": False,
                "error": f"File not found: {pdf_path}",
                "text": "",
                "pages": 0,
                "fileName": os.path.basename(pdf_path)
            }

        # Read PDF
        reader = PdfReader(pdf_path)
        page_count = len(reader.pages)

        # Extract text from all pages
        text_content = ""
        for page_num, page in enumerate(reader.pages, start=1):
            try:
                page_text = page.extract_text()
                if page_text:
                    # Add page separator for multi-pass extraction
                    text_content += f"\n--- PAGE {page_num} ---\n"
                    text_content += page_text
                    text_content += f"\n--- END PAGE {page_num} ---\n\n"
            except Exception as page_error:
                # Continue even if one page fails
                text_content += f"\n--- PAGE {page_num} ERROR: {str(page_error)} ---\n\n"

        # Get file size
        file_size = os.path.getsize(pdf_path)

        return {
            "success": True,
            "text": text_content,
            "pages": page_count,
            "fileName": os.path.basename(pdf_path),
            "filePath": pdf_path,
            "fileSize": file_size,
            "charCount": len(text_content)
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "text": "",
            "pages": 0,
            "fileName": os.path.basename(pdf_path) if pdf_path else "unknown"
        }


def main():
    """Main entry point for CLI usage"""

    if len(sys.argv) < 2:
        print(json.dumps({
            "success": False,
            "error": "Usage: python pdf-extractor.py <pdf-file-path>",
            "text": "",
            "pages": 0
        }))
        sys.exit(1)

    pdf_path = sys.argv[1]
    result = extract_text_from_pdf(pdf_path)

    # Output JSON to stdout
    print(json.dumps(result, ensure_ascii=True, indent=None))

    # Exit with appropriate code
    sys.exit(0 if result["success"] else 1)


if __name__ == "__main__":
    main()
