from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import re
import pdfplumber
import docx
import tempfile

app = Flask(__name__)
CORS(app, origins=["http://127.0.0.1:5500", "http://localhost:3000"])

def extract_text_from_file(file_path):
    if file_path.lower().endswith('.pdf'):
        return extract_pdf_text(file_path)
    elif file_path.lower().endswith('.docx'):
        return extract_docx_text(file_path)
    else:
        raise ValueError("Unsupported file format. Only PDF and DOCX are supported.")

def extract_pdf_text(path):
    text = ""
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    return text

def extract_docx_text(path):
    doc = docx.Document(path)
    return "\n".join(para.text for para in doc.paragraphs)

def parse_questions(raw_text):
    questions = []
    exam_title = ''
    description = ''

    raw_text = raw_text.replace('\r\n', '\n').replace('\r', '\n')

    title_match = re.search(r'\[Exam Title:\s*(.*?)\]', raw_text, re.DOTALL)
    if title_match:
        exam_title = title_match.group(1).strip()
    desc_match = re.search(r'\[Description:\s*(.*?)\]', raw_text, re.DOTALL)
    if desc_match:
        description = desc_match.group(1).strip()

    blocks = re.split(r'\n?\[(MCQ|FILL_BLANK|SHORT_ANSWER|CODING|CODE_ERROR|QUESTION_ANSWER)\]\n?', raw_text)

    for i in range(1, len(blocks), 2):
        qtype = blocks[i]
        block = blocks[i + 1]

        marks_match = re.search(r'Marks:\s*(\d+)', block)
        marks = int(marks_match.group(1)) if marks_match else 0

        if qtype == 'MCQ':
            q_match = re.search(r'Question:\s*(.*?)\n(?=A\.)', block, re.DOTALL)
            options = re.findall(r'([A-D])\. (.+)', block)
            ans_match = re.search(r'Answer:\s*([A-D])', block)
            if q_match and options and ans_match:
                questions.append({
                    'type': 'mcq',
                    'question': q_match.group(1).strip(),
                    'options': dict(options),
                    'answer': ans_match.group(1),
                    'max_score': marks
                })

        elif qtype == 'FILL_BLANK':
            q = re.search(r'Question:\s*(.*?)\n', block)
            ans = re.search(r'Answer:\s*(.*)', block)
            if q and ans:
                questions.append({
                    'type': 'fill_blank',
                    'question': q.group(1).strip(),
                    'answer': ans.group(1).strip(),
                    'max_score': marks
                })

        elif qtype == 'SHORT_ANSWER':
            q = re.search(r'Question:\s*(.*?)\n', block)
            ans = re.search(r'Answer:\s*(.*)', block)
            if q and ans:
                questions.append({
                    'type': 'short_answer',
                    'question': q.group(1).strip(),
                    'answer': ans.group(1).strip(),
                    'max_score': marks
                })

        elif qtype == 'CODING':
            q = re.search(r'Question:\s*(.*?)\nCode:', block)
            code = re.search(r'Code:\n?(.*)', block, re.DOTALL)
            if q and code:
                questions.append({
                    'type': 'coding',
                    'question': q.group(1).strip(),
                    'code': code.group(1).strip(),
                    'max_score': marks
                })

        elif qtype == 'CODE_ERROR':
            q = re.search(r'Question:\s*(.*?)\nCode:', block)
            buggy = re.search(r'Code:\n?(.*?)(?:Expected Fix:|$)', block, re.DOTALL)
            fix = re.search(r'Expected Fix:\s*(?:```(?:python)?\n)?(.*?)(?:```|$)', block, re.DOTALL)
            if q and buggy:
                questions.append({
                    'type': 'code_error',
                    'question': q.group(1).strip(),
                    'buggy': buggy.group(1).strip(),
                    'fix': fix.group(1).strip() if fix else '',
                    'max_score': marks
                })

        # Uncomment and add marks here if you want to support QUESTION_ANSWER type
        # elif qtype == 'QUESTION_ANSWER':
        #     q = re.search(r'Question:\s*(.*?)\n', block)
        #     ans = re.search(r'Answer:\s*(.*)', block)
        #     if q and ans:
        #         questions.append({
        #             'type': 'qa',
        #             'question': q.group(1).strip(),
        #             'answer': ans.group(1).strip(),
        #             'marks': marks
        #         })

    return exam_title, description, questions

@app.route("/parse-questions", methods=["POST"])
def handle_file_upload():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "Empty filename"}), 400

    _, ext = os.path.splitext(file.filename)
    if ext.lower() not in ['.pdf', '.docx']:
        return jsonify({"error": "Unsupported file format"}), 400

    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        file.save(tmp.name)
        tmp_path = tmp.name

    try:
        raw_text = extract_text_from_file(tmp_path)
        title, desc, questions = parse_questions(raw_text)
        os.remove(tmp_path)  # Clean up temp file
        return jsonify({
            "title": title,
            "description": desc,
            "questions": questions
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
