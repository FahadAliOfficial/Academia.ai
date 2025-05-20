"use client";
import { useEffect, useState, use } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import LoadingSpinner from "@/app/components/LoadingSpinner";
import MCQ from "@/app/components/MCQ";
// Import components conditionally if they exist
import { ShortAnswer } from "@/app/components/ShortAnswer";
import { CodingQuestion } from "@/app/components/CodingQuestion";
import { CodeError } from "@/app/components/CodeError";
import ProtectedPage from "@/app/components/ProtectedPage";

// Import FillBlanks correctly with named export
import { FillBlanks } from "@/app/components/FillBlanks";

export default function ExamReview({ params }) {
  const unwrappedParams = use(params); // Unwrap params with React.use()
  const id = unwrappedParams.id; // Exam result ID
  const [loading, setLoading] = useState(true);
  const [examResult, setExamResult] = useState(null);
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [resultDetails, setResultDetails] = useState([]);
  const [student, setStudent] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editedScores, setEditedScores] = useState({});
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  
  useEffect(() => {
    const fetchExamReview = async () => {
      setLoading(true);
      
      // Fetch the exam result
      const { data: resultData, error: resultError } = await supabase
        .from("exam_results")
        .select("*")
        .eq("id", id)
        .single();
      
      if (resultError) {
        console.error("Error fetching exam result:", resultError);
        setLoading(false);
        return;
      }
      
      setExamResult(resultData);
      
      // Fetch the student info
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id, name, email")
        .eq("id", resultData.user_id)
        .single();
        
      if (userError) {
        console.error("Error fetching user data:", userError);
      } else {
        setStudent(userData);
      }
      
      // Fetch the exam
      const { data: examData, error: examError } = await supabase
        .from("exams")
        .select("*")
        .eq("id", resultData.exam_id)
        .single();
        
      if (examError) {
        console.error("Error fetching exam:", examError);
      } else {
        setExam(examData);
      }
      
      // Fetch all result details
      const { data: detailsData, error: detailsError } = await supabase
        .from("exam_result_details")
        .select("*")
        .eq("exam_result_id", id);
        
      if (detailsError) {
        console.error("Error fetching exam result details:", detailsError);
      } else {
        setResultDetails(detailsData);
        
        // Initialize edited scores
        const initialScores = {};
        detailsData.forEach(detail => {
          initialScores[detail.question_id] = parseFloat(detail.score_obtained);
        });
        setEditedScores(initialScores);
      }
      
      // Fetch questions
      if (examData) {
        const { data: questionsData, error: questionsError } = await supabase
          .from("questions")
          .select("*")
          .eq("exam_id", examData.id);
          
        if (questionsError) {
          console.error("Error fetching questions:", questionsError);
        } else {
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
            } else {
              optionsData = opts;
            }
          }

          // Map options by question_id for quick lookup
          const optionsByQuestionId = optionsData.reduce((acc, opt) => {
            if (!acc[opt.question_id]) {
              acc[opt.question_id] = [];
            }
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

          // STEP 5: Attach to questions
          const questionsWithOptions = questionsData.map(q => {
            const base = { ...q, options: q.type === "mcq" ? optionsByQuestionId[q.id] || [] : [] };

            switch (q.type) {
              case "fill_blank":
                return {
                  ...base,
                  answer: fillBlanksMap[q.id]?.answer || ""
                };
              case "short_answer":
                return {
                  ...base,
                  answer: shortAnswerMap[q.id]?.answer || ""
                };
              case "coding":
                return {
                  ...base,
                  code: codingMap[q.id]?.code || ""
                };
              case "code_error":
                return {
                  ...base,
                  buggy_code: codeErrorsMap[q.id]?.buggy_code || "",
                  fix_code: codeErrorsMap[q.id]?.fix_code || ""
                };
              default:
                return base;
            }
          });

          setQuestions(questionsWithOptions);
        }
      }
      
      setLoading(false);
    };
    
    fetchExamReview();
  }, [id]);

  const handleScoreChange = (questionId, newScore) => {
    setEditedScores(prev => ({
      ...prev,
      [questionId]: parseFloat(newScore)
    }));
  };

  const saveScores = async () => {
    setSaving(true);
    
    try {
      // Update each result detail with new score
      const updates = resultDetails.map(detail => {
        const newScore = editedScores[detail.question_id];
        return supabase
          .from('exam_result_details')
          .update({ score_obtained: newScore.toFixed(2) })
          .eq('id', detail.id);
      });
      
      await Promise.all(updates);
      
      // Calculate new total
      const newTotal = Object.values(editedScores).reduce((sum, score) => sum + score, 0);
      
      // Update the main exam result
      await supabase
        .from('exam_results')
        .update({ obtained: newTotal.toFixed(2) })
        .eq('id', id);
        
      // Refresh the data
      const { data: refreshedDetails } = await supabase
        .from("exam_result_details")
        .select("*")
        .eq("exam_result_id", id);
        
      setResultDetails(refreshedDetails);
      
      alert("Scores updated successfully!");
      setEditMode(false);
    } catch (error) {
      console.error("Error updating scores:", error);
      alert("Failed to update scores. Please try again.");
    } finally {
      setSaving(false);
    }
  };
  
  const renderQuestion = (question, index) => {
    // Find the result details for this question
    const details = resultDetails.find(d => d.question_id === question.id);
    
    // Create a read-only or editable version based on mode
    const isEditable = editMode;
    
    // Override onAnswer to do nothing in review mode
    const dummyOnAnswer = () => {};
    
    switch (question.type) {
      case "mcq":
        return (
          <div key={question.id}>
            <MCQ 
              question={question} 
              index={index} 
              onAnswer={dummyOnAnswer} 
              result={resultDetails}
            />
            {isEditable && (
              <div className="mt-2 mb-6 flex items-center bg-blue-50 p-3 rounded-md">
                <label className="text-sm font-medium text-black mr-2">
                  Score:
                </label>
                <input 
                  type="number" 
                  min="0" 
                  max={question.max_score} 
                  step="0.01"
                  value={editedScores[question.id] || 0}
                  onChange={(e) => handleScoreChange(question.id, e.target.value)}
                  className="w-24 border text-black border-gray-300 rounded px-2 py-1 text-sm"
                />
                <span className="ml-1 text-sm text-black">
                  / {question.max_score}
                </span>
              </div>
            )}
          </div>
        );
      case "fill_blank":
        return (
          <div key={question.id}>
            <FillBlanks 
              question={question} 
              index={index} 
              onAnswer={dummyOnAnswer} 
              result={resultDetails}
            />
            {isEditable && (
              <div className="mt-2 mb-6 flex items-center bg-blue-50 p-3 rounded-md">
                <label className="text-sm font-medium text-black mr-2">
                  Score:
                </label>
                <input 
                  type="number" 
                  min="0" 
                  max={question.max_score} 
                  step="0.01"
                  value={editedScores[question.id] || 0}
                  onChange={(e) => handleScoreChange(question.id, e.target.value)}
                  className="w-24 border text-black border-gray-300 rounded px-2 py-1 text-sm"
                />
                <span className="ml-1 text-sm text-black">
                  / {question.max_score}
                </span>
              </div>
            )}
          </div>
        );
      case "short_answer":
        return (
          <div key={question.id}>
            <ShortAnswer 
              question={question} 
              index={index} 
              onAnswer={dummyOnAnswer} 
              result={resultDetails}
            />
            {isEditable && (
              <div className="mt-2 mb-6 flex items-center bg-blue-50 p-3 rounded-md">
                <label className="text-sm font-medium text-black mr-2">
                  Score:
                </label>
                <input 
                  type="number" 
                  min="0" 
                  max={question.max_score} 
                  step="0.01"
                  value={editedScores[question.id] || 0}
                  onChange={(e) => handleScoreChange(question.id, e.target.value)}
                  className="w-24 border text-black border-gray-300 rounded px-2 py-1 text-sm"
                />
                <span className="ml-1 text-sm text-black">
                  / {question.max_score}
                </span>
              </div>
            )}
          </div>
        );
      case "coding":
        return (
          <div key={question.id}>
            <CodingQuestion 
              question={question} 
              index={index} 
              onAnswer={dummyOnAnswer} 
              result={resultDetails}
            />
            {isEditable && (
              <div className="mt-2 mb-6 flex items-center bg-blue-50 p-3 rounded-md">
                <label className="text-sm font-medium text-black mr-2">
                  Score:
                </label>
                <input 
                  type="number" 
                  min="0" 
                  max={question.max_score} 
                  step="0.01"
                  value={editedScores[question.id] || 0}
                  onChange={(e) => handleScoreChange(question.id, e.target.value)}
                  className="w-24 border text-black border-gray-300 rounded px-2 py-1 text-sm"
                />
                <span className="ml-1 text-sm text-black">
                  / {question.max_score}
                </span>
              </div>
            )}
          </div>
        );
      case "code_error":
        return (
          <div key={question.id}>
            <CodeError 
              question={question} 
              index={index} 
              onAnswer={dummyOnAnswer} 
              result={resultDetails}
            />
            {isEditable && (
              <div className="mt-2 mb-6 flex items-center bg-blue-50 p-3 rounded-md">
                <label className="text-sm font-medium text-black mr-2">
                  Score:
                </label>
                <input 
                  type="number" 
                  min="0" 
                  max={question.max_score} 
                  step="0.01"
                  value={editedScores[question.id] || 0}
                  onChange={(e) => handleScoreChange(question.id, e.target.value)}
                  className="w-24 border text-black border-gray-300 rounded px-2 py-1 text-sm"
                />
                <span className="ml-1 text-sm text-black">
                  / {question.max_score}
                </span>
              </div>
            )}
          </div>
        );
      default:
        return (
          <div key={question.id} className="p-4 border rounded bg-red-50 text-red-700">
            Unknown question type: {question.type}
          </div>
        );
    }
  };

  if (loading) return <LoadingSpinner />;

  const totalScore = resultDetails.reduce((acc, detail) => acc + parseFloat(detail.score_obtained), 0);
  const maxPossibleScore = questions.reduce((acc, q) => acc + q.max_score, 0);
  const percentage = maxPossibleScore > 0 ? ((totalScore / maxPossibleScore) * 100).toFixed(1) : 0;

  return (
    <div className="min-h-screen bg-white p-6 overflow-auto">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => router.back()}
            className="cursor-pointer bg-[#4F46E5] text-white px-4 py-2 rounded hover:bg-[#4338ca] transition flex items-center"
          >
            <ArrowLeft className="inline mr-2" size={18} />
            Back
          </button>
          
          {editMode ? (
            <div className="flex gap-2">
              <button
                onClick={() => setEditMode(false)}
                className="cursor-pointer bg-gray-200 text-black px-4 py-2 rounded hover:bg-gray-300 transition"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={saveScores}
                className="cursor-pointer bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition flex items-center"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <span className="animate-spin mr-2">⟳</span>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="inline mr-2" size={18} />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditMode(true)}
              className="cursor-pointer bg-[#4F46E5] text-white px-4 py-2 rounded hover:bg-[#4338ca] transition"
            >
              Edit Scores
            </button>
          )}
        </div>

        {/* Header section */}
        <div className="bg-gray-50 p-6 rounded-lg shadow-md mb-8 border border-gray-200">
          <h1 className="text-2xl font-bold text-[#4F46E5] mb-2">
            {exam?.title}
          </h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-black"><span className="font-medium">Student:</span> {student?.name}</p>
              <p className="text-black"><span className="font-medium">Email:</span> {student?.email}</p>
              <p className="text-black"><span className="font-medium">Submitted:</span> {new Date(examResult?.created_at).toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-800">
                {totalScore.toFixed(2)} / {maxPossibleScore} 
                <span className="ml-2 text-lg text-black">({percentage}%)</span>
              </p>
              <p className="text-black">
                {percentage >= 80 ? 'Excellent' : 
                 percentage >= 70 ? 'Good' :
                 percentage >= 60 ? 'Satisfactory' :
                 percentage >= 50 ? 'Pass' : 'Fail'}
              </p>
            </div>
          </div>
        </div>

        {/* Questions section */}
        <div className="space-y-8">
          {questions.map((question, index) => renderQuestion(question, index))}
        </div>
      </div>
    </div>
  );
}
