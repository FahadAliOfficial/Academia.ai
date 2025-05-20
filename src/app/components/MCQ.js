import { useState, useEffect } from "react";

export default function MCQ({ question, index, onAnswer, result }) {
  const [selected, setSelected] = useState(null);

  const questionResult = Array.isArray(result)
    ? result.find((r) => r.question_id === question.id)
    : null;

  const showResult = !!questionResult;
  const isCorrect = showResult && questionResult.is_correct;

  useEffect(() => {
    if (showResult) {
      setSelected(parseInt(questionResult.student_answer));
    }
  }, [questionResult]);

  const handleOptionSelect = (optionId) => {
    setSelected(optionId);
    onAnswer(question.id, optionId);
  };

  return (
    <div
      className={`border rounded-lg p-5 shadow-sm transition-shadow duration-200 bg-white ${
        showResult
          ? isCorrect
            ? "border-green-500 bg-green-50"
            : "border-red-500 bg-red-50"
          : "border-gray-300 hover:shadow-md"
      }`}
    >
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

      <ul className="space-y-3">
        {question.options.map((opt, i) => {
          const isCorrectAnswer =
            showResult && opt.id.toString() === questionResult.correct_answer;
          const isWrongSelected =
            showResult &&
            opt.id.toString() === questionResult.student_answer &&
            !isCorrect;

          return (
            <li key={opt.id || i}>
              <label
                className={`flex items-center cursor-pointer select-none p-2 rounded-md ${
                  isCorrectAnswer
                    ? "bg-green-100 border border-green-300"
                    : isWrongSelected
                    ? "bg-red-100 border border-red-300"
                    : ""
                }`}
              >
                <input
                  type="radio"
                  name={`q-${question.id}`}
                  value={opt.id}
                  checked={selected === opt.id}
                  onChange={() => handleOptionSelect(opt.id)}
                  className="mr-3 accent-[#4F46E5]"
                  disabled={showResult}
                />
                <span className="text-black hover:text-[#4F46E5]">
                  {opt.label}. {opt.text}
                </span>
                {isCorrectAnswer && (
                  <span className="ml-2 text-green-600">✓</span>
                )}
              </label>
            </li>
          );
        })}
      </ul>

      {showResult && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm font-medium text-blue-800 mb-2">
            {isCorrect
              ? "✅ Your answer is correct!"
              : "❌ Your answer was incorrect."}
          </p>
        </div>
      )}
    </div>
  );
}
