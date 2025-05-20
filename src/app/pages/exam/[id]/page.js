'use client';
import { useEffect, useState, use } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import MCQ from "@/app/components/MCQ";
import { FillBlanks } from "@/app/components/FillBlanks";
import {ShortAnswer} from "@/app/components/ShortAnswer";
import {CodingQuestion} from "@/app/components/CodingQuestion";
import {CodeError} from "@/app/components/CodeError";
import { useRouter } from 'next/navigation'
import { checkAnswerWithGemini } from "@/app/lib/geminiClient";
import useUserSession from "@/app/lib/useUserSession";
import LoadingSpinner from "@/app/components/LoadingSpinner";
// import {QAAnswer} from "@/app/components/QAAnswer";

export default function ExamPage(idd) {
  const params = use(idd.params);
  const { id } = params;
  const { user } = useUserSession({ redirectIfNoSession: false });
  const [questions, setQuestions] = useState([]);
  const [exam, setExam] = useState(null);
  const [isLoading, setIsLoading] = useState(false);  const [studentAnswers, setStudentAnswers] = useState({});
  const [questionResults, setQuestionResults] = useState({});
  // const [userRole, setRole] = useState({})
  const [userId, setUserId] = useState({});
  const [vectorModalOpen, setVectorModalOpen] = useState(false);
  const [vectorStatus, setVectorStatus] = useState("loading");  
  const [vectorMessage, setVectorMessage] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [examResults, setExamResults] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const router = useRouter();
    useEffect(() => {
     if (user && user.user_metadata?.role) {
      // setRole(user.user_metadata.role.toLowerCase());
      setUserId(user.id);
      
      // Check if page was reloaded after submission
      const checkSessionStorage = () => {
        const wasSubmitted = sessionStorage.getItem(`exam_submitted_${id}`);
        if (wasSubmitted === 'true') {
          // Redirect to exam portal if page was reloaded after submission
          router.push('/dashboard/student/exam-portal');
          return true;
        }
        return false;
      };
        // Check if the user has already submitted this exam
      const checkPreviousSubmission = async () => {
        // If page was reloaded after submission, don't continue with the database check
        if (checkSessionStorage()) return;
        
        if (id && user.id) {
          // Clear hasSubmitted state first to ensure we're getting the latest state
          setHasSubmitted(false);
          
          const { data, error } = await supabase
            .from('exam_results')
            .select('id')
            .eq('user_id', user.id)
            .eq('exam_id', id)
            .limit(1);
            
          if (error) {
            console.error("Error checking previous submissions:", error);
          } else if (data && data.length > 0) {
            // User has already submitted this exam
            setHasSubmitted(true);
          } else {
            // No submission found in database, make sure sessionStorage is clean too
            sessionStorage.removeItem(`exam_submitted_${id}`);
          }
        }
      };
      
      checkPreviousSubmission();
    }
  }, [user, id]);
  useEffect(() => {
    if (!id) return;

    const fetchExamAndQuestions = async () => {
      setIsLoading(true);

      // Fetch exam
      const { data: examData, error: examError } = await supabase
        .from("exams")
        .select("*")
        .eq("id", id)
        .single();
      if (examError) {
        console.error("Error fetching exam:", examError);
        setIsLoading(false);
        return;
      }
      setExam(examData);

      // Fetch questions for exam
      const { data: questionsData, error: questionsError } = await supabase
        .from("questions")
        .select("*")
        .eq("exam_id", id);

      if (questionsError) {
        console.error("Error fetching questions:", questionsError);
        setIsLoading(false);
        return;
      }

      // Get all MCQ question IDs to fetch options
      const mcqQuestionIds = questionsData
        .filter(q => q.type === "mcq")
        .map(q => q.id);

      let optionsData = [];
      if (mcqQuestionIds.length > 0) {
        const { data: opts, error: optsError } = await supabase
          .from("mcq_options")
          .select("*")
          .in("question_id", mcqQuestionIds);

        if (optsError) {
          console.error("Error fetching MCQ options:", optsError);
          setIsLoading(false);
          return;
        }
        optionsData = opts;
      }

      // Map options by question_id for quick lookup
      const optionsByQuestionId = optionsData.reduce((acc, opt) => {
        if (!acc[opt.question_id]) acc[opt.question_id] = [];
                acc[opt.question_id].push({
            id: opt.id,
            text: opt.text,
            label: opt.label,
            is_correct: opt.is_correct,
            });
        return acc;
      }, {});

     // STEP 1: Separate question IDs by type
const questionTypeIds = {
  fill_blank: [],
  short_answer: [],
  coding: [],
  code_error: [],
  // qa_answers: [],
};

questionsData.forEach(q => {
  if (questionTypeIds[q.type]) {
    questionTypeIds[q.type].push(q.id);
  }
});

// STEP 2: Helper to fetch by question_id
const fetchTypeData = async (table, ids) => {
  if (!ids.length) return [];
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .in("question_id", ids);
  if (error) {
    console.error(`Error fetching ${table}:`, error);
    return [];
  }
  return data;
};

// STEP 3: Fetch all type-specific data
const [fillBlankData, shortAnswerData, codingData, codeErrorData] = await Promise.all([
  fetchTypeData("fill_blanks", questionTypeIds.fill_blank),
  fetchTypeData("short_answers", questionTypeIds.short_answer),
  fetchTypeData("coding_questions", questionTypeIds.coding),
  fetchTypeData("code_errors", questionTypeIds.code_error),
  // fetchTypeData("qa_answers", questionTypeIds.qa_answers),
]);

// STEP 4: Index them by question_id
const mapByQuestionId = (arr) =>
  arr.reduce((acc, item) => {
    acc[item.question_id] = item;
    return acc;
  }, {});

const fillBlanksMap = mapByQuestionId(fillBlankData);
const shortAnswerMap = mapByQuestionId(shortAnswerData);
const codingMap = mapByQuestionId(codingData);
const codeErrorsMap = mapByQuestionId(codeErrorData);
// const qaAnswersMap = mapByQuestionId(qaAnswerData);

// STEP 5: Attach to questions
const questionsWithOptions = questionsData.map(q => {
  const base = { ...q, options: q.type === "mcq" ? optionsByQuestionId[q.id] || [] : [] };

  switch (q.type) {
    case "fill_blank":
      return { ...base, answer: fillBlanksMap[q.id]?.answer || "" };
    case "short_answer":
      return { ...base, answer: shortAnswerMap[q.id]?.answer || "" };
    case "coding":
      return { ...base, code: codingMap[q.id]?.code || "" };
    case "code_error":
      return {
        ...base,
        buggy_code: codeErrorsMap[q.id]?.buggy_code || "",
        fix_code: codeErrorsMap[q.id]?.fix_code || ""
      };
    // case "qa_answers":
    //   return { ...base, answer: qaAnswersMap[q.id]?.answer || "" };
    default:
      return base;
  }
});

setQuestions(questionsWithOptions);

      setIsLoading(false);
    };

    fetchExamAndQuestions();
  }, [id]);



  
  const handleAnswerChange = (questionId, answer) => {
  setStudentAnswers(prev => ({
    ...prev,
    [questionId]: answer
  }));
};  const renderQuestion = (question, index) => {
    // If results are showing, hide questions
    if (showResults) {
      return null;
    }
    
    switch (question.type) {
        case "mcq":
      return <MCQ key={question.id} question={question} index={index} onAnswer={handleAnswerChange} result={questionResults}/>;
    case "fill_blank":
      return <FillBlanks key={question.id} question={question} index={index} onAnswer={handleAnswerChange} result={questionResults}/>;
    case "short_answer":
      return <ShortAnswer key={question.id} question={question} index={index} onAnswer={handleAnswerChange} result={questionResults}/>;
    case "coding":
      return <CodingQuestion key={question.id} question={question} index={index} onAnswer={handleAnswerChange} result={questionResults}/>;
    case "code_error":
      return <CodeError key={question.id} question={question} index={index} onAnswer={handleAnswerChange} result={questionResults}/>;
    // case "qa_answers":
    //   return <QAAnswer key={question.id} question={question} index={index} />;
    default:
      return (
        <div key={question.id} className="p-4 border rounded bg-red-50 text-red-700">
          Unknown question type: {question.type}
        </div>
      );
    }
  };
const getPartialScore = (response) => {
  const normalized = response.trim().toUpperCase();

  if (normalized === "YES" || normalized === "100" || normalized.includes("100")) return 100;
  if (normalized === "75" || normalized.includes("75")) return 75;
  if (normalized === "50" || normalized.includes("50")) return 50;
  if (normalized === "25" || normalized.includes("25")) return 25;
  if (normalized === "NO" || normalized === "0") return 0;

  // If no match, try to find numbers 0, 25, 50, 75, or 100 inside the text
  const match = normalized.match(/\b(0|25|50|75|100)\b/);
  if (match) return Number(match[0]);

  return 0; // fallback
};



async function askGeminiWithRetry(prompt, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await checkAnswerWithGemini(prompt);
      const score = getPartialScore(response);
      if ([0, 25, 50, 75, 100].includes(score)) {
        return score;
      }
      // If invalid score, retry
      console.warn(`Invalid score received: "${response}", retrying (${attempt}/${maxRetries})...`);
    } catch (error) {
      console.error("Error calling Gemini:", error);
      // Optionally retry on error
    }
  }
  // If all retries fail, return 0 as fallback
  return 0;
}
async function saveExamResults(results) {
  // 1. Insert summary record into exam_results
  const { data: examResultData, error: examResultError } = await supabase
    .from('exam_results')
    .insert([
      {
        user_id: userId,
        exam_id: exam?.id,
        course_id: exam?.course_id,
        total_marks: results.reduce((acc, r) => acc + r.maxScore, 0),
        obtained: (results.reduce((acc, r) => acc + r.scoreObtained, 0)).toFixed(2),
      },
    ])
    .select()  // to get inserted record
    .single();

  if (examResultError) {
    console.error('Error inserting exam_results:', examResultError);
    throw examResultError;
  }

  const examResultId = examResultData.id;
  
  // 2. Prepare detailed records for exam_result_details
  const detailsToInsert = results.map((r) => ({
    exam_result_id: examResultId,
    question_id: r.questionId,
    student_answer: String(r.studentAnswer || ""),
    correct_answer: String(r.correctAnswer || ""),
    is_correct: r.isCorrect,
    score_obtained: (r.scoreObtained).toFixed(2),
    max_score: r.maxScore,
  }));
  setQuestionResults(detailsToInsert);

  // 3. Insert details records
  const { error: detailsError } = await supabase
    .from('exam_result_details')
    .insert(detailsToInsert);
  if (detailsError) {
    console.error('Error inserting exam_result_details:', detailsError);
    throw detailsError;
  }
  
  // Store submission state in session storage to handle page reloads
  sessionStorage.setItem(`exam_submitted_${exam?.id}`, 'true');
  
  // Store complete result data for displaying results
  const resultData = {
    summary: examResultData,
    details: detailsToInsert,
    questions: questions.reduce((acc, q) => {
      acc[q.id] = q;
      return acc;
    }, {}),
    totalScore: results.reduce((acc, r) => acc + r.maxScore, 0),
    obtainedScore: results.reduce((acc, r) => acc + r.scoreObtained, 0),
    percentage: (results.reduce((acc, r) => acc + r.scoreObtained, 0) / results.reduce((acc, r) => acc + r.maxScore, 0)) * 100
  };
  
  setExamResults(resultData);
  setShowResults(true);
  
  return examResultData;
}  const handleSubmission = async () => {
  // console.log("Student Answers State:", studentAnswers);
  setVectorModalOpen(true);       // Show modal
  setVectorStatus("loading");
  setVectorMessage("Submitting your answers...");

  try{
  setVectorMessage("Marking your answers...");

  const resultsPromises = questions.map(async (q) => {
    const studentAnswer = studentAnswers[q.id];
    
    if (studentAnswer === undefined) {
      return {
        questionId: q.id,
        studentAnswer: null,
        correctAnswer: q.type === "mcq" 
          ? q.options?.find(opt => opt.is_correct)?.id 
          : q.answer || q.code || q.fix_code || "",
        isCorrect: false,
        scoreObtained: 0,
        maxScore: q.max_score || 1,
        type: q.type
      };
    }

    let scoreObtained = 0;

    switch (q.type) {
      case "mcq": {
        const correctOptionId = q.options?.find(opt => opt.is_correct)?.id;
        const isCorrect = correctOptionId !== undefined && String(correctOptionId) === String(studentAnswer);
        scoreObtained = isCorrect ? (q.max_score || 1) : 0;
        return {
          questionId: q.id,
          studentAnswer,
          correctAnswer: correctOptionId,
          isCorrect,
          scoreObtained,
          maxScore: q.max_score || 1,
          type: q.type
        };
      }

      case "fill_blank": {
        const correctAnswer = q.answer?.trim().toLowerCase() || "";
        const studentAnsProcessed = (studentAnswer || "").trim().toLowerCase();
        const isCorrect = correctAnswer === studentAnsProcessed;
        scoreObtained = isCorrect ? (q.max_score || 1) : 0;
        return {
          questionId: q.id,
          studentAnswer,
          correctAnswer: correctAnswer,
          isCorrect,
          scoreObtained,
          maxScore: q.max_score || 1,
          type: q.type
        };
      }

      case "short_answer": {
        const promptSA = `
Question:
${q.question}

Correct Answer:
${q.answer}

Student Answer:
${studentAnswer}

On a scale of 0, 25, 50, 75, or 100, how correct is the student's answer compared to the correct answer?
- 0 means completely incorrect.
- 25 means minimal understanding.
- 50 means partial understanding.
- 75 means mostly correct but missing some details.
- 100 means fully correct.

Reply ONLY with one of these numbers (no explanation or text): 0, 25, 50, 75, or 100.
`;
        const partialScore = await askGeminiWithRetry(promptSA);
        scoreObtained = (partialScore / 100) * (q.max_score || 1);
        return {
          questionId: q.id,
          studentAnswer,
          correctAnswer: q.answer,
          isCorrect: partialScore === 100,
          scoreObtained,
          maxScore: q.max_score || 1,
          type: q.type
        };
      }

      case "coding": {
        const promptCoding = `
Question:
${q.question}

Reference Solution:
\`\`\`
${q.code}
\`\`\`

Student's Code:
\`\`\`
${studentAnswer}
\`\`\`

On a scale of 0, 25, 50, 75, or 100, how correct is the student's code implementation?
- 0 means the code is completely incorrect or doesn't run.
- 25 means some parts are correct but most are wrong.
- 50 means the code runs and partially solves the problem.
- 75 means the code solves most parts correctly with minor issues.
- 100 means the code is fully correct and solves the problem.

Reply ONLY with one of these numbers (no explanation or text): 0, 25, 50, 75, or 100.
`;
        const partialScore = await askGeminiWithRetry(promptCoding);
        scoreObtained = (partialScore / 100) * (q.max_score || 1);
        return {
          questionId: q.id,
          studentAnswer,
          correctAnswer: q.code,
          isCorrect: partialScore === 100,
          scoreObtained,
          maxScore: q.max_score || 1,
          type: q.type
        };
      }

      case "code_error": {
        const promptCodeError = `
Original buggy code:
\`\`\`
${q.buggy_code}
\`\`\`

Expected fixed code:
\`\`\`
${q.fix_code}
\`\`\`

Student's fixed code:
\`\`\`
${studentAnswer}
\`\`\`

On a scale of 0, 25, 50, 75, or 100, how correct is the student's fix?
- 0 means no bugs fixed or code broken.
- 25 means only a few bugs fixed.
- 50 means about half the bugs fixed.
- 75 means most bugs fixed, minor issues remain.
- 100 means all bugs correctly fixed.

Reply ONLY with one of these numbers (no explanation or text): 0, 25, 50, 75, or 100.
`;
        const partialScore = await askGeminiWithRetry(promptCodeError);
        scoreObtained = (partialScore / 100) * (q.max_score || 1);
        return {
          questionId: q.id,
          studentAnswer,
          correctAnswer: q.fix_code,
          isCorrect: partialScore === 100,
          scoreObtained,
          maxScore: q.max_score || 1,
          type: q.type
        };
      }

      default:
        return {
          questionId: q.id,
          studentAnswer,
          correctAnswer: q.answer || q.code || q.fix_code || "",
          isCorrect: false,
          scoreObtained: 0,
          maxScore: q.max_score || 1,
          type: q.type
        };
    }
  });
  
  
  const results = await Promise.all(resultsPromises);

  // Calculate total score out of sum of max scores
  const totalMaxScore = results.reduce((acc, r) => acc + r.maxScore, 0);
  const totalScoreObtained = results.reduce((acc, r) => acc + r.scoreObtained, 0);

  const finalPercentage = (totalScoreObtained / totalMaxScore) * 100;    const resultData = await saveExamResults(results);
    setHasSubmitted(true); // Mark as submitted
    setVectorStatus("success");
    setVectorMessage(`Exam submitted! Your score is ${totalScoreObtained.toFixed(2)} out of ${results.reduce((acc, r) => acc + r.maxScore, 0)}, having Percentage of ${finalPercentage.toFixed(2)}.`);

    // Close the modal when user clicks the button
    setTimeout(() => {
      setVectorModalOpen(false); 
    }, 2000);
  } catch (error) {
    console.error("Error submitting exam:", error);
    // alert("There was an error submitting your exam. Please try again.");
    setVectorStatus("error");
    setVectorMessage("There was an error submitting your exam. Please try again.");
  }
};

if(isLoading) return <LoadingSpinner />
  return (
    <div className="min-h-screen bg-white p-6 shadow-lg">
      <div className="flex items-center gap-2 mb-10">
        <button onClick={() => router.back()} className="text-white px-4 py-2 bg-[#4F46E5] hover:bg-[#4338ca] transition duration-300 rounded-sm cursor-pointer">
          ← Back
        </button>
      </div>
      <h1 className="text-3xl font-bold text-[#4F46E5] mb-6">{exam?.title || "Loading Exam..."}</h1>

      {isLoading ? (
        <p className="text-gray-500">Loading questions...</p>
      ) : questions.length === 0 ? (
        <p className="text-gray-500">No questions available for this exam.</p>
      ) : (
        <div className="space-y-6">
          {questions.map((q, i) => renderQuestion(q, i))}
        </div>
      )}      {!hasSubmitted && vectorStatus !== "success" && (
        <button 
          onClick={handleSubmission} 
          className="text-lg font-bold rounded-lg mt-5 cursor-pointer py-3 hover:bg-[#4338ca] transition px-6 text-white bg-[#4F46E5]"
        >
          Submit
        </button>
      )}      {hasSubmitted && !showResults && (
        <div className="mt-5 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
          <p className="text-yellow-700 font-medium">You have already submitted this exam.</p>
          <button
            onClick={() => router.push('/dashboard/student/exam-portal')} 
            className="mt-3 px-4 py-2 bg-[#4F46E5] text-white rounded hover:bg-[#4338ca]"
          >
            Return to Exam Portal
          </button>
        </div>
      )}
      
      {/* Results display section */}
      {showResults && examResults && (
        <div className="mt-10 bg-white border rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-[#4F46E5] mb-4">Exam Results</h2>
          
          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-3 rounded-md shadow border text-center">
                <p className="text-gray-600 text-sm">Total Score</p>
                <p className="text-2xl font-bold text-[#4F46E5]">{examResults.totalScore.toFixed(2)}</p>
              </div>
              <div className="bg-white p-3 rounded-md shadow border text-center">
                <p className="text-gray-600 text-sm">Your Score</p>
                <p className="text-2xl font-bold text-[#4F46E5]">{examResults.obtainedScore.toFixed(2)}</p>
              </div>
              <div className="bg-white p-3 rounded-md shadow border text-center">
                <p className="text-gray-600 text-sm">Percentage</p>
                <p className="text-2xl font-bold text-[#4F46E5]">{examResults.percentage.toFixed(2)}%</p>
              </div>
            </div>
          </div>
          
          <h3 className="text-xl font-semibold text-gray-700 mb-3">Question Details</h3>
          
          <div className="space-y-6">
            {examResults.details.map((result, index) => (
              <div key={index} className={`border rounded-md p-4 ${result.is_correct ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-lg text-black">Question {index + 1}</span>
                  <span className={`px-2 py-1 rounded text-sm ${result.is_correct ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {result.score_obtained} / {result.max_score}
                  </span>
                </div>
                
                <p className="mb-2 text-[#4F46E5] font-medium text-lg">{examResults.questions[result.question_id]?.question || 'Question'}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                  <div className="bg-white p-3 rounded border">
                    <p className="text-sm text-gray-500 mb-1">Your Answer:</p>
                    <p className="font-mono text-gray-800 whitespace-pre-wrap">
                      {result.type === "mcq" 
                        ? (examResults.questions[result.question_id]?.options?.find(o => o.id == result.student_answer)?.text || "No answer selected") 
                        : result.student_answer}
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded border">
                    <p className="text-sm text-gray-500 mb-1">Correct Answer:</p>
                    <p className="font-mono text-gray-800 whitespace-pre-wrap">
                      {result.type === "mcq" 
                        ? (examResults.questions[result.question_id]?.options?.find(o => o.id == result.correct_answer)?.text || "Error finding correct answer") 
                        : result.correct_answer}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-8 text-center">
            <button
              onClick={() => router.push('/dashboard/student/exam-portal')}
              className="px-6 py-3 bg-[#4F46E5] text-white rounded-lg hover:bg-[#4338ca] transition-colors"
            >
              Return to Exam Portal
            </button>
          </div>
        </div>
      )}

      {vectorModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-[90%] max-w-md text-center shadow-lg space-y-4 animate-fadeIn">
            {vectorStatus === "loading" ? (
              <>
                <p className="text-[#4F46E5] text-xl font-semibold">
                  Processing...
                </p>
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#4F46E5] mx-auto"></div>
                <p className="text-gray-600">{vectorMessage}</p>
              </>
            ) : (
              <>                <p
                  className={`text-xl font-semibold ${
                    vectorStatus === "success"
                      ? "text-green-600"
                      : "text-red-500"
                  }`}
                >
                  {vectorMessage}
                </p>                <button
                  className="bg-[#4F46E5] text-white px-4 py-2 rounded hover:bg-[#4338ca]"
                  onClick={() => {
                    if (vectorStatus === "success") {
                      // Close modal to show results instead of redirecting
                      setVectorModalOpen(false);
                    } else {
                      setVectorModalOpen(false);
                    }
                  }}
                >
                  {vectorStatus === "success" ? "View Results" : "Close"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
    
  );
}
