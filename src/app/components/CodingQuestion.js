import { useState } from "react";

export function CodingQuestion({ question, index, onAnswer, result }) {
  const [code, setCode] = useState("");

  const handleChange = (e) => {
    const val = e.target.value;
    setCode(val);
    onAnswer(question.id, val);
  };

  const questionResult = Array.isArray(result)
    ? result.find(r => r.question_id === question.id)
    : null;

  const showResult = questionResult !== null && questionResult !== undefined;
  const isCorrect = showResult && questionResult.is_correct;

  return (
    <div className={`border rounded-lg p-5 shadow-sm transition-shadow duration-200 bg-white
      ${showResult ? (isCorrect ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50') : 'border-gray-300 hover:shadow-md'}`}>
      <div className="flex items-start mb-4">
        <h3 className="font-semibold text-lg text-[#4F46E5] flex-grow pr-4">
          {index + 1}. {question.question}
        </h3>
        <span className="text-lg font-bold text-[#4F46E5] flex-shrink-0">
          Marks: 
          {showResult && (
            <span className="ml-2">
              {questionResult.score_obtained}/
            </span>
          )}
          {question.max_score}
        </span>
      </div>

      <textarea
        value={code}
        onChange={handleChange}
        placeholder="Write your code solution here"
        rows={6}
        disabled={showResult}
        className="w-full border border-black rounded px-3 py-2 font-mono resize-none outline-none text-black focus:border-[#4F46E5]"
      />

      {showResult && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">          <p className="text-sm font-medium text-blue-800 mb-2">
            {isCorrect
              ? "✅ Your code is correct!"
              : "❌ Your code was incorrect."}
          </p>
          <div className="text-sm text-black">
            <strong>Correct Answer:</strong>
          </div>
          <pre className="mt-1 p-2 bg-white border text-black rounded whitespace-pre-wrap text-sm">{questionResult.correct_answer}</pre>
        </div>
      )}
    </div>
  );
}
