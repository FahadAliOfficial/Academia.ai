'use client';
import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import { useParams } from "next/navigation";
import Link from "next/link";
import ProtectedPage from "@/app/components/ProtectedPage";
import LoadingSpinner from "@/app/components/LoadingSpinner";

function ExamReview() {
  const params = useParams();
  const examId = params.examId;
  
  const [exam, setExam] = useState(null);
  const [result, setResult] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchExamData = async () => {
      try {
        setIsLoading(true);
        
        // Get user ID
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user?.id) {
          setError("Authentication error. Please login again.");
          setIsLoading(false);
          return;
        }
        
        // Fetch exam details
        const { data: examData, error: examError } = await supabase
          .from("exams")
          .select("*")
          .eq("id", examId)
          .single();
          
        if (examError) {
          console.error("Error fetching exam:", examError);
          setError("Failed to load exam details.");
          setIsLoading(false);
          return;
        }
        
        setExam(examData);
        
        // Fetch exam result
        const { data: resultData, error: resultError } = await supabase
          .from("exam_results")
          .select("*")
          .eq("exam_id", examId)
          .eq("user_id", userData.user.id)
          .single();
          
        if (resultError) {
          console.error("Error fetching exam result:", resultError);
          setError("Failed to load your exam result.");
          setIsLoading(false);
          return;
        }
        
        setResult(resultData);
        
        // Fetch exam questions
        const { data: questionData, error: questionError } = await supabase
          .from("exam_questions")
          .select("*")
          .eq("exam_id", examId);
          
        if (questionError) {
          console.error("Error fetching questions:", questionError);
          setError("Failed to load exam questions.");
          setIsLoading(false);
          return;
        }
        
        setQuestions(questionData);
        
        // Fetch student answers
        const { data: answerData, error: answerError } = await supabase
          .from("student_answers")
          .select("*")
          .eq("exam_result_id", resultData.id);
          
        if (answerError) {
          console.error("Error fetching answers:", answerError);
          setError("Failed to load your answers.");
          setIsLoading(false);
          return;
        }
        
        setAnswers(answerData);
        setIsLoading(false);
        
      } catch (err) {
        console.error("Unexpected error:", err);
        setError("An unexpected error occurred.");
        setIsLoading(false);
      }
    };
    
    if (examId) {
      fetchExamData();
    }
  }, [examId]);
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
        <Link href="/dashboard/student/exam-portal">
          <button className="text-[#4F46E5] hover:underline">
            &larr; Back to Exam Portal
          </button>
        </Link>
      </div>
    );
  }
  
  if (!exam || !result) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-700">No exam data found or you don't have access to this exam.</p>
        </div>
        <Link href="/dashboard/student/exam-portal">
          <button className="text-[#4F46E5] hover:underline">
            &larr; Back to Exam Portal
          </button>
        </Link>
      </div>
    );
  }
  
  const score = result.total_marks > 0 ? Math.round((result.obtained / result.total_marks) * 100) : 0;
  const completedDate = new Date(result.created_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
  
  return (
    <div className="p-6 bg-white shadow-lg min-h-screen">
      <Link href="/dashboard/student/exam-portal">
        <button className="text-[#4F46E5] hover:underline mb-6">
          &larr; Back to Exam Portal
        </button>
      </Link>
      
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">{exam.title}</h1>
        <p className="text-gray-600 mb-4">{exam.description}</p>
        
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-white rounded-lg border border-gray-100 shadow-sm">
              <p className="text-sm text-gray-500 mb-1">Your Score</p>
              <p className={`text-2xl font-bold ${
                score >= 70 ? 'text-green-600' : score >= 50 ? 'text-yellow-600' : 'text-red-600'
              }`}>{score}%</p>
              <div className="mt-2 bg-gray-100 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    score >= 70 ? 'bg-green-500' : score >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                  }`} 
                  style={{ width: `${score}%` }}
                ></div>
              </div>
            </div>
            
            <div className="p-4 bg-white rounded-lg border border-gray-100 shadow-sm">
              <p className="text-sm text-gray-500 mb-1">Marks</p>
              <p className="text-2xl font-bold text-gray-800">
                {result.obtained} / {result.total_marks}
              </p>
              <p className="text-xs text-gray-500 mt-2">Points earned</p>
            </div>
            
            <div className="p-4 bg-white rounded-lg border border-gray-100 shadow-sm">
              <p className="text-sm text-gray-500 mb-1">Completed On</p>
              <p className="text-xl font-bold text-gray-800">{completedDate}</p>
              <p className="text-xs text-gray-500 mt-2">Date of submission</p>
            </div>
          </div>
        </div>
      </div>
      
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Review Your Answers</h2>
      
      {questions.length > 0 ? (
        <div className="space-y-6">
          {questions.map((question, index) => {
            const studentAnswer = answers.find(a => a.question_id === question.id);
            
            return (
              <div key={question.id} className="border border-gray-200 rounded-lg p-6">
                <p className="font-medium text-gray-800 mb-4">
                  <span className="text-[#4F46E5] font-bold mr-2">Q{index + 1}.</span> 
                  {question.question_text}
                </p>
                
                {question.type === 'multiple_choice' && question.options && (
                  <div className="space-y-3 mb-6">
                    {JSON.parse(question.options).map((option, optIndex) => {
                      const isCorrect = option === question.correct_answer;
                      const isSelected = studentAnswer && studentAnswer.student_answer === option;
                      
                      return (
                        <div 
                          key={optIndex}
                          className={`p-3 rounded-md ${
                            isSelected && isCorrect ? 'bg-green-50 border border-green-200' :
                            isSelected && !isCorrect ? 'bg-red-50 border border-red-200' :
                            isCorrect ? 'bg-gray-50 border border-gray-200' : 
                            'bg-white border border-gray-100'
                          }`}
                        >
                          <div className="flex items-center">
                            <span className={`w-5 h-5 rounded-full mr-3 flex items-center justify-center text-xs ${
                              isSelected ? (isCorrect ? 'bg-green-500 text-white' : 'bg-red-500 text-white') :
                              isCorrect ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'
                            }`}>
                              {String.fromCharCode(65 + optIndex)}
                            </span>
                            <span className={isCorrect ? 'font-medium' : ''}>{option}</span>
                            
                            {isSelected && isCorrect && (
                              <span className="ml-auto text-green-600">
                                ✓ Correct
                              </span>
                            )}
                            {isSelected && !isCorrect && (
                              <span className="ml-auto text-red-600">
                                ✗ Incorrect
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {question.type === 'short_answer' && (
                  <div className="mb-6">
                    <div className="mb-2">
                      <h4 className="text-sm font-medium text-gray-700 mb-1">Your Answer:</h4>
                      <p className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                        {studentAnswer ? studentAnswer.student_answer || "No answer provided" : "No answer recorded"}
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-1">Correct Answer:</h4>
                      <p className="p-3 bg-green-50 border border-green-200 rounded-md">
                        {question.correct_answer}
                      </p>
                    </div>
                  </div>
                )}
                
                {question.explanation && (
                  <div className="mt-3 bg-blue-50 border border-blue-200 rounded-md p-3">
                    <p className="text-sm font-medium text-blue-800 mb-1">Explanation:</p>
                    <p className="text-sm text-blue-700">{question.explanation}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-gray-500">No questions found for this exam.</p>
      )}
    </div>
  );
}

export default function ProtectedExamReview() {
  return (
    <ProtectedPage requiredRole={["student"]}>
      <ExamReview />
    </ProtectedPage>
  );
}
