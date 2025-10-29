import PyPDF2
import sys

# Open SOW PDF
pdf = open('Request for Proposal No. ANR-6-2025 Genertor Services/3-SOW.pdf', 'rb')
reader = PyPDF2.PdfReader(pdf)

print(f"SOW Total pages: {len(reader.pages)}\n")

# Extract all pages
for i in range(len(reader.pages)):
    text = reader.pages[i].extract_text()
    print(f"\n{'='*60}")
    print(f"PAGE {i+1}")
    print('='*60)
    # Replace problematic unicode characters
    text = text.encode('ascii', 'ignore').decode('ascii')
    print(text)

pdf.close()
