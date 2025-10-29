import PyPDF2
import re

# Open RFP PDF
pdf = open('Request for Proposal No. ANR-6-2025 Genertor Services/1-RFP-ANR-6-2025.pdf', 'rb')
reader = PyPDF2.PdfReader(pdf)

print(f"Total pages: {len(reader.pages)}\n")

# Extract all pages and search for contact information
all_emails = set()
all_phones = set()
contact_contexts = []

for i in range(len(reader.pages)):
    text = reader.pages[i].extract_text()

    # Find emails
    page_emails = re.findall(r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}', text)

    # Find phone numbers
    page_phones = re.findall(r'\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', text)

    if page_emails or page_phones:
        print(f"=== PAGE {i+1} ===")

        for email in page_emails:
            all_emails.add(email)
            # Get context
            idx = text.find(email)
            if idx > 0:
                context_start = max(0, idx - 150)
                context_end = min(len(text), idx + 150)
                context = text[context_start:context_end].replace('\n', ' ')
                print(f"\nEmail: {email}")
                print(f"Context: ...{context}...")

        for phone in page_phones:
            all_phones.add(phone)

        print()

print("\n" + "="*60)
print("SUMMARY OF ALL CONTACTS")
print("="*60)
print("\nEmails found:")
for email in sorted(all_emails):
    print(f"  - {email}")

print("\nPhones found:")
for phone in sorted(all_phones):
    print(f"  - {phone}")

pdf.close()
