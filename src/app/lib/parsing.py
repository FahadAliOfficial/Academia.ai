import pdfplumber
import re

def extract_text_from_pdf(pdf_path):
    text = ""
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text += page.extract_text() + "\n"
    return text

def parse_exam_text(text):
    sections = text.split('---')
    parsed_data = []

    for section in sections:
        section = section.strip()
        if not section:
            continue

        entry = {}

        # Match exam title and description
        if '📄 Exam Title:' in section:
            title_match = re.search(r'📄 Exam Title:\s*(.+)', section)
            desc_match = re.search(r'📘 Description:\s*(.+)', section)
            entry['type'] = 'meta'
            entry['title'] = title_match.group(1) if title_match else None
            entry['description'] = desc_match.group(1) if desc_match else None

        elif '[MCQ]' in section:
            entry['type'] = 'mcq'
            q = re.search(r'Question:\s*(.+)', section)
            options = re.findall(r'([A-D])\. (.+)', section)
            ans = re.search(r'Answer:\s*([A-D])', section)
            entry['question'] = q.group(1) if q else None
            entry['options'] = {opt[0]: opt[1] for opt in options}
            entry['answer'] = ans.group(1) if ans else None

        elif '[FILL_BLANK]' in section:
            entry['type'] = 'fill_blank'
            q = re.search(r'Question:\s*(.+)', section)
            a = re.search(r'Answer:\s*(.+)', section)
            entry['question'] = q.group(1) if q else None
            entry['answer'] = a.group(1) if a else None

        elif '[SHORT_ANSWER]' in section:
            entry['type'] = 'short_answer'
            q = re.search(r'Question:\s*(.+)', section)
            a = re.search(r'Answer:\s*(.+)', section, re.DOTALL)
            entry['question'] = q.group(1) if q else None
            entry['answer'] = a.group(1).strip() if a else None

        elif '[CODING]' in section:
            entry['type'] = 'coding'
            q = re.search(r'Question:\s*(.+)', section)
            code = re.findall(r'python\s+Copy\s+Edit\s+(.*)', section, re.DOTALL)
            entry['question'] = q.group(1) if q else None
            entry['code'] = code[0].strip() if code else None

        elif '[CODE_ERROR]' in section:
            entry['type'] = 'code_error'
            q = re.search(r'Question:\s*(.+)', section)
            code = re.findall(r'python\s+Copy\s+Edit\s+(.*?)(?=Expected Fix:)', section, re.DOTALL)
            fix = re.findall(r'Expected Fix:.*?python\s+Copy\s+Edit\s+(.*)', section, re.DOTALL)
            entry['question'] = q.group(1) if q else None
            entry['code'] = code[0].strip() if code else None
            entry['fix'] = fix[0].strip() if fix else None

        elif '[QUESTION_ANSWER]' in section:
            entry['type'] = 'qa'
            q = re.search(r'Question:\s*(.+)', section)
            a = re.search(r'Answer:\s*(.+)', section)
            entry['question'] = q.group(1) if q else None
            entry['answer'] = a.group(1) if a else None

        parsed_data.append(entry)

    return parsed_data

# Example usage
pdf_path = "D:\\Projects\\AcademiaAi\\academia\\src\\app\\lib\test.pdf"  # Path to your PDF
pdf_text = extract_text_from_pdf(pdf_path)
parsed_questions = parse_exam_text(pdf_text)

for q in parsed_questions:
    print(q)
