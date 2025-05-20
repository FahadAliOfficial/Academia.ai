'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabaseClient';

const QuestionPortalPage = () => {
  const searchParams = useSearchParams();
  const courseId = searchParams.get('courseId');
  const questionType = searchParams.get('type');
  const fileName = searchParams.get('file');

  const [questions, setQuestions] = useState([]);

  useEffect(() => {
    const fetchQuestions = async () => {
      if (!courseId || !questionType || !fileName) return;

      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('exam_id', courseId)
        .eq('type', questionType.toLowerCase());

      if (!error) setQuestions(data);
    };

    fetchQuestions();
  }, [courseId, questionType, fileName]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-6">
        <h1 className="text-3xl font-bold text-indigo-600 mb-4">📘 Question Portal</h1>

        <div className="text-sm text-gray-500 mb-6">
          <p><span className="font-semibold text-gray-700">File:</span> {fileName}</p>
          <p><span className="font-semibold text-gray-700">Type:</span> {questionType?.toUpperCase()}</p>
        </div>

        {questions.length === 0 ? (
          <div className="bg-yellow-100 text-yellow-800 p-4 rounded text-center">
            No questions found for this selection.
          </div>
        ) : (
          <ul className="space-y-6">
            {questions.map((q, index) => (
              <li key={q.id} className="bg-gray-100 p-5 rounded-lg shadow-sm border border-gray-200">
                <p className="font-medium text-gray-800">
                  {index + 1}. {q.question}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default QuestionPortalPage;
