"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import { Upload, FileText, BarChartBig, PlusCircle, Edit, X, Save } from "lucide-react";
import useUserSession from "@/app/lib/useUserSession";
import LoadingSpinner from "@/app/components/LoadingSpinner";
import { useRouter } from 'next/navigation';
import ProtectedPage from "@/app/components/ProtectedPage";

const QuestionUpload = () => {
  const { user } = useUserSession({ redirectIfNoSession: false });
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState("");
  const [file, setFile] = useState(null);
  const [questionType, setQuestionType] = useState("EASY");
  const [chapterName, setChapterName] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vectorModalOpen, setVectorModalOpen] = useState(false);
  const [vectorStatus, setVectorStatus] = useState("loading");
  const [vectorMessage, setVectorMessage] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [parsedQuestions, setParsedQuestions] = useState([]);
  const [parsedTitle, setParsedTitle] = useState("");
  const [parsedDescription, setParsedDescription] = useState("");
  const [showQuestionEditor, setShowQuestionEditor] = useState(false);
  const [chapterModalOpen, setChapterModalOpen] = useState(false);
  const [currentExamId, setCurrentExamId] = useState(null);
  const [existingChapters, setExistingChapters] = useState([]);
  const [newQuestion, setNewQuestion] = useState({
    type: "mcq",
    question: "",
    answer: "",
    max_score: 1,
    options: { A: "", B: "", C: "", D: "" },
    code: "",
    buggy: "",
    fix: "",
  });
  const [totalChapters, setTotalChapters] = useState(0);
  const [chapterNumber, setChapterNumber] = useState("");
  const router = useRouter();
  
  // Generate chapters array based on totalChapters
  const chapters = Array.from(
    { length: totalChapters },
    (_, index) => index + 1
  );
  
  const addNewQuestion = () => {
    if (!newQuestion.question || !newQuestion.answer) {
      alert("Please fill out both question and answer fields.");
      return;
    }

    const questionToAdd = { ...newQuestion };

    // Validate based on question type
    if (questionToAdd.type === "mcq") {
      // Ensure at least two options are provided for MCQ
      const filledOptions = Object.values(questionToAdd.options).filter(opt => opt.trim());
      if (filledOptions.length < 2) {
        alert("MCQ questions must have at least two options.");
        return;
      }
      // Check that answer is one of the option labels
      if (!Object.keys(questionToAdd.options).includes(questionToAdd.answer)) {
        alert("Answer must be one of the option labels (A, B, C, D).");
        return;
      }
    } else if (questionToAdd.type === "coding" && !questionToAdd.code) {
      alert("Coding questions must include starter code.");
      return;
    } else if (questionToAdd.type === "code_error" && (!questionToAdd.buggy || !questionToAdd.fix)) {
      alert("Code error questions must include both buggy and fixed code.");
      return;
    }

    setParsedQuestions([...parsedQuestions, questionToAdd]);
    
    // Reset the form for the next question
    setNewQuestion({
      type: "mcq",
      question: "",
      answer: "",
      max_score: 1,
      options: { A: "", B: "", C: "", D: "" },
      code: "",
      buggy: "",
      fix: "",
    });
  };

  const deleteQuestion = (index) => {
    const updatedQuestions = [...parsedQuestions];
    updatedQuestions.splice(index, 1);
    setParsedQuestions(updatedQuestions);
  };

  const startWithoutFile = () => {
    setParsedTitle("");
    setParsedDescription("");
    setParsedQuestions([]);
    // Set file to null but we'll handle this in handleSaveExam
    setFile(null);
    setCurrentExamId(null);
    setChapterModalOpen(true);
  };
  
  // Function to fetch exam questions for editing
  const fetchExamQuestions = async (examId) => {
    setVectorModalOpen(true);
    setVectorStatus("loading");
    setVectorMessage("Loading exam questions...");
    
    try {
      // Fetch questions for this exam
      const { data: questions, error: questionsError } = await supabase
        .from("questions")
        .select("*")
        .eq("exam_id", examId);
        
      if (questionsError) throw questionsError;
      
      const loadedQuestions = [];
      
      // Process each question
      for (const q of questions) {
        const baseQuestion = {
          id: q.id,
          type: q.type,
          question: q.question,
          answer: "",
          max_score: q.max_score
        };
        
        if (q.type.toLowerCase() === "mcq") {
          const { data: options } = await supabase
            .from("mcq_options")
            .select("*")
            .eq("question_id", q.id);
            
          if (options) {
            const formattedOptions = {};
            let correctAnswer = "";
            
            options.forEach(opt => {
              formattedOptions[opt.label] = opt.text;
              if (opt.is_correct) correctAnswer = opt.label;
            });
            
            loadedQuestions.push({
              ...baseQuestion,
              options: formattedOptions,
              answer: correctAnswer
            });
          }
        } 
        else if (q.type.toLowerCase() === "fill_blank") {
          const { data: details } = await supabase
            .from("fill_blanks")
            .select("*")
            .eq("question_id", q.id)
            .single();
            
          if (details) {
            loadedQuestions.push({
              ...baseQuestion,
              answer: details.answer
            });
          }
        }
        else if (q.type.toLowerCase() === "short_answer") {
          const { data: details } = await supabase
            .from("short_answers")
            .select("*")
            .eq("question_id", q.id)
            .single();
            
          if (details) {
            loadedQuestions.push({
              ...baseQuestion,
              answer: details.answer
            });
          }
        }
        else if (q.type.toLowerCase() === "coding") {
          const { data: details } = await supabase
            .from("coding_questions")
            .select("*")
            .eq("question_id", q.id)
            .single();
            
          if (details) {
            loadedQuestions.push({
              ...baseQuestion,
              code: details.code,
              answer: ""
            });
          }
        }
        else if (q.type.toLowerCase() === "code_error") {
          const { data: details } = await supabase
            .from("code_errors")
            .select("*")
            .eq("question_id", q.id)
            .single();
            
          if (details) {
            loadedQuestions.push({
              ...baseQuestion,
              buggy: details.buggy_code,
              fix: details.fix_code,
              answer: ""
            });
          }
        }
      }
      
      setParsedQuestions(loadedQuestions);
      setCurrentExamId(examId);
      setShowQuestionEditor(true);
      
      setVectorModalOpen(false);
    } catch (err) {
      console.error("Error loading exam questions:", err);
      setVectorStatus("error");
      setVectorMessage(`Error loading exam questions: ${err.message}`);
      setTimeout(() => setVectorModalOpen(false), 3000);
    }
  };
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .select("*");
      if (!courseError) setCourses(courseData);

      if (courseId) {
        let query = supabase
          .from("exams")
          .select("*")
          .eq("course_id", courseId)
          .eq("type", questionType.toLowerCase());
        
        // Add chapter filter if a chapter is selected
        if (chapterNumber && chapterNumber !== "") {
          query = query.eq("chapter", parseInt(chapterNumber));
        }
        
        const { data: uploadedData, error: uploadedError } = await query;
        setUploadedFiles(!uploadedError ? uploadedData || [] : []);
        
        // Fetch existing chapters for this course
        const { data: chaptersData, error: chaptersError } = await supabase
          .from("exams")
          .select("chapter_name, chapter")
          .eq("course_id", courseId)
          .not("chapter_name", "is", null);
          
        if (!chaptersError && chaptersData) {
          // Create a unique list of chapters
          const uniqueChapters = chaptersData.reduce((acc, item) => {
            if (item.chapter_name && !acc.some(ch => ch.name === item.chapter_name)) {
              acc.push({ 
                name: item.chapter_name, 
                number: item.chapter 
              });
            }
            return acc;
          }, []);
          
          setExistingChapters(uniqueChapters);
          
          // Find the highest chapter number for default total chapters
          if (uniqueChapters.length > 0) {
            const highestChapter = Math.max(...uniqueChapters
              .filter(ch => ch.number)
              .map(ch => ch.number));
            if (highestChapter > 0) {
              setTotalChapters(highestChapter);
            }
          }
        }
      } else {
        setUploadedFiles([]);
        setExistingChapters([]);
      }
      setLoading(false);    };

    fetchData();
  }, [courseId, questionType, chapterNumber]);

  const handleUpload = async () => {
    if (!file || !courseId || !questionType) return;

    setVectorModalOpen(true);
    setVectorStatus("loading");
    setVectorMessage("Parsing questions...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("course_id", courseId);

      const response = await fetch("http://localhost:5000/parse-questions", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Parsing service failed.");
        const { title, description, questions } = await response.json();
      
      setParsedTitle(title);
      setParsedDescription(description);
      setParsedQuestions(questions);
      
      setVectorModalOpen(false);
      setChapterModalOpen(true);
    } catch (err) {
      console.error("Parsing error:", err);
      setVectorStatus("error");
      setVectorMessage("Failed to parse questions.");
      setTimeout(() => setVectorModalOpen(false), 3000);
    }
  };

  const handleSaveExam = async () => {
    if (!courseId || !parsedQuestions.length || !chapterName) {
      alert("Missing required information. Please ensure course, questions, and chapter name are provided.");
      return;
    }
    
    setVectorModalOpen(true);
    setVectorStatus("loading");
    setVectorMessage(currentExamId ? "Updating exam..." : "Saving exam questions...");
    
    try {
      // Generate a source file name or use the uploaded file name
      const sourceFileName = file ? file.name : `${chapterName.replace(/\s+/g, '_')}_manual_exam.txt`;
      
      // If there's a file, upload it to storage for future reference
      let filePath = null;
      if (file) {
        const timestamp = new Date().getTime();
        filePath = `exams/${courseId}/${timestamp}_${sourceFileName}`;
        
        const { error: storageError } = await supabase.storage
          .from('exam-files')
          .upload(filePath, file);
          
        if (storageError) {
          console.error("Error uploading file:", storageError);
          // Continue even if file upload fails - we still need to create the exam record
        }
      }

      let examId;
      
      if (currentExamId) {
        // Update existing exam
        const { data: examData, error: examError } = await supabase
          .from("exams")
          .update({
            title: parsedTitle || `${chapterName} Exam`,
            description: parsedDescription || `Exam for ${chapterName}`,
            type: questionType.toLowerCase(),
            chapter_name: chapterName,
            chapter: chapterNumber ? parseInt(chapterNumber) : null,
          })
          .eq("id", currentExamId)
          .select();
          
        if (examError) throw new Error("Failed to update exam: " + examError?.message);
        examId = currentExamId;
        
        // Delete existing questions (we'll recreate them)
        await supabase.from("questions").delete().eq("exam_id", examId);
        
      } else {
        // Insert a new exam
        const { data: examData, error: examError } = await supabase
          .from("exams")
          .insert([{
            course_id: courseId,
            title: parsedTitle || `${chapterName} Exam`,
            description: parsedDescription || `Exam for ${chapterName}`,
            type: questionType.toLowerCase(),
            chapter_name: chapterName,
            chapter: chapterNumber ? parseInt(chapterNumber) : null,
            source_file: sourceFileName, // Add source file name to satisfy the not-null constraint
            // file_path: filePath // Store the actual storage path if a file was uploaded
          }])
          .select();
          
        if (examError || !examData || examData.length === 0) {
          throw new Error("Failed to create exam: " + examError?.message);
        }

        examId = examData[0].id;
      }

      // Insert all questions
      for (const q of parsedQuestions) {
        const { type, question, answer, max_score, ...details } = q;
        const { data: questionInsert, error: insertError } = await supabase
          .from("questions")
          .insert([{ exam_id: examId, type, question, max_score }])
          .select();

        if (insertError || !questionInsert?.[0]) continue;

        const questionId = questionInsert[0].id;

        switch (type.toLowerCase()) {
          case "mcq":
            if (
              details.options &&
              typeof details.options === "object" &&
              !Array.isArray(details.options)
            ) {
              const options = Object.entries(details.options).map(
                ([label, text]) => ({
                  question_id: questionId,
                  label,
                  text,
                  is_correct: label === answer,
                })
              );
              await supabase.from("mcq_options").insert(options);
            }
            break;
          case "fill_blank":
            await supabase
              .from("fill_blanks")
              .insert([{ question_id: questionId, answer }]);
            break;
          case "short_answer":
            await supabase
              .from("short_answers")
              .insert([{ question_id: questionId, answer }]);
            break;
          case "coding":
            await supabase
              .from("coding_questions")
              .insert([{ question_id: questionId, code: details.code }]);
            break;
          case "code_error":
            await supabase.from("code_errors").insert([
              {
                question_id: questionId,
                buggy_code: details.buggy,
                fix_code: details.fix,
              },
            ]);
            break;

          default:
            break;
        }
      }
        // Refresh the uploaded files list
      let query = supabase
        .from("exams")
        .select("*")
        .eq("course_id", courseId)
        .eq("type", questionType.toLowerCase());
      
      // Add chapter filter if selected
      if (chapterNumber) {
        query = query.eq("chapter", parseInt(chapterNumber));
      }
      
      const { data: updatedUploads } = await query;
      
      setUploadedFiles(updatedUploads || []);
      
      // Reset the form
      setFile(null);
      setParsedQuestions([]);
      setParsedTitle("");
      setParsedDescription("");
      setShowQuestionEditor(false);
      setChapterModalOpen(false);

      setVectorStatus("success");
      setVectorMessage("Exam saved successfully!");
      
      // Close the modal after a short delay to show success message
      setTimeout(() => {
        setVectorModalOpen(false);
      }, 2000);
    } catch (err) {
      console.error("Error saving exam:", err);
      setVectorStatus("error");
      setVectorMessage(`Failed to save exam: ${err.message}`);
      
      // Keep modal open a bit longer if there's an error
      setTimeout(() => {
        setVectorModalOpen(false);
      }, 3000);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-white p-6 shadow-lg">
      <h2 className="text-2xl font-bold text-[#4F46E5] mb-6">
        Upload Questions
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <select
          className="border border-gray-300 rounded-md p-2 text-black"
          value={courseId}
          onChange={(e) => {
            setCourseId(e.target.value);
            setTotalChapters(0);
            setChapterNumber("");
          }}
        >
          <option value="">Select Course</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.title}
            </option>
          ))}
        </select>

        <select
          className="border border-gray-300 rounded-md p-2 text-black"
          value={questionType}
          onChange={(e) => setQuestionType(e.target.value)}
        >
          {["EASY", "HARD", "VHARD"].map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="flex flex-col">
          <select            className="border border-gray-300 rounded-md p-2 text-black w-full"
            value={chapterNumber}
            onChange={(e) => {
              setChapterNumber(e.target.value);
              // Trigger a re-fetch when chapter changes
              if (courseId && questionType) {
                // This will trigger the useEffect that depends on courseId, questionType, and now chapterNumber
              }
            }}
          >
            <option value="">All Chapters</option>
            {Array.from({ length: 20 }, (_, i) => i + 1).map((chapter) => (
              <option key={chapter} value={chapter}>
                Chapter {chapter}
              </option>
            ))}
          </select>
          
          {existingChapters.length > 0 && (
            <div className="mt-2">
              <p className="text-sm text-gray-500 mb-1">Existing chapters in this course:</p>
              <div className="flex flex-wrap gap-2">
                {existingChapters.map((chapter, idx) => (
                  <span 
                    key={idx}
                    className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full cursor-pointer hover:bg-blue-200"
                    onClick={() => {
                      setChapterName(chapter.name);
                      if(chapter.number) setChapterNumber(chapter.number.toString());
                    }}
                  >
                    {chapter.name} {chapter.number && `(Ch. ${chapter.number})`}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex items-start">
          <input
            type="file"
            className="border border-gray-300 rounded-md p-2 text-black w-full"
            onChange={(e) => setFile(e.target.files[0])}
          />
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={startWithoutFile}
          className="cursor-pointer bg-gray-200 text-[#4F46E5] px-4 py-2 rounded hover:bg-gray-300 transition"
        >
          <PlusCircle size={18} className="inline mr-2" /> Create exam without file
        </button>
        <div className="flex justify-center">
          <button
          onClick={handleUpload}
          className="mt-4 cursor-pointer mr-2 bg-[#4F46E5] text-white px-4 py-2 rounded hover:bg-[#4338ca] transition"
        >
          <Upload size={18} className="inline mr-2" /> Upload
        </button>
        <button
          onClick={() => {
            router.push('./Exams/exam-details');
          }}
          className="mt-4 cursor-pointer bg-[#4F46E5] text-white px-4 py-2 rounded hover:bg-[#4338ca] transition"
        >
          <BarChartBig size={18} className="inline mr-2" /> Results
        </button>
          </div>
      </div>

      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-2 text-[#4F46E5]">
          Uploaded Questions
        </h3>
        {!courseId ? (
          <p className="text-gray-500">
            Please select a course to view uploaded questions.
          </p>
        ) : uploadedFiles.length === 0 ? (
          <p className="text-gray-500">
            No files uploaded yet for this course and question type.
          </p>
        ) : (          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className="relative p-4 border rounded-lg shadow hover:shadow-md flex flex-col h-full"
              >
                {/* Live/Offline Badge */}
                <div className="absolute top-2 right-2">
                  {file.is_live ? (
                    <span className="px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full">
                      Live
                    </span>
                  ) : (
                    <span className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-200 rounded-full">
                      Offline
                    </span>
                  )}
                </div>
                <div className="flex-grow overflow-hidden">
                  <FileText className="text-[#4F46E5] mb-2" />
                  <p className="font-semibold text-gray-800 overflow-hidden text-ellipsis">
                    {file.title || file.source_file}
                  </p>
                  <p className="text-sm text-gray-600 mb-1 overflow-hidden text-ellipsis line-clamp-2">
                    {file.description || "No description"}
                  </p>
                  {/* Display chapter name and number if available */}
                  {file.chapter_name && (
                    <p className="text-xs font-medium text-indigo-800 bg-indigo-100 inline-block px-2 py-1 rounded mb-2">
                      {file.chapter_name} {file.chapter && `(Chapter ${file.chapter})`}
                    </p>
                  )}
                  {!file.chapter_name && file.chapter && (
                    <p className="text-xs font-medium text-indigo-800 bg-indigo-100 inline-block px-2 py-1 rounded mb-2">
                      Chapter {file.chapter}
                    </p>
                  )}
                </div>
                <div className="mt-auto pt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      // Load the exam data for editing
                      setParsedTitle(file.title || "");
                      setParsedDescription(file.description || "");
                      setChapterName(file.chapter_name || "");
                      setChapterNumber(file.chapter ? file.chapter.toString() : "");
                      
                      // Fetch questions for this exam
                      fetchExamQuestions(file.id);
                    }}
                    className="mt-4 mr-2 px-4 py-2 rounded cursor-pointer text-sm transition bg-yellow-500 text-white hover:bg-yellow-600"
                  >
                    <Edit size={16} className="inline mr-1" /> Edit
                  </button>
                  
                  <button
                    onClick={async () => {
                      setIsUpdating(true);
                      let change = null;
                      if (file.is_live) {
                        change = false;
                      } else change = true;
                      const { data, error } = await supabase
                        .from("exams")
                        .update({ is_live: change })
                        .eq("id", file.id);

                      if (error) {
                        console.error("Error making file live:", error);
                      } else {
                        console.log("File made live:", data);
                        setUploadedFiles((prevFiles) =>
                          prevFiles.map((f) =>
                            f.id === file.id ? { ...f, is_live: change } : f
                          )
                        );
                      }

                      setIsUpdating(false);
                    }}
                    disabled={isUpdating}
                    className={`mt-4 mr-2 px-4 py-2 rounded cursor-pointer text-sm transition ${
                      isUpdating
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-[#4F46E5] text-white hover:bg-[#4338ca]"
                    }`}
                  >
                    {isUpdating ? "Changing..." : "Change"}
                  </button>
                  <button
                    onClick={async () => {
                      setIsDeleting(true);

                      const { data, error } = await supabase
                        .from("exams")
                        .delete()
                        .eq("id", file.id);

                      if (error) {
                        console.error("Error deleting file:", error);
                      } else {
                        console.log("File has been deleted:", data);
                        setUploadedFiles((prevFiles) =>
                          prevFiles.filter((f) => f.id !== file.id)
                        );
                      }

                      setIsDeleting(false);
                    }}
                    disabled={isDeleting}
                    className={`mt-4 px-4 py-2 rounded cursor-pointer text-sm transition ${
                      isDeleting
                        ? "bg-gray-400 cursor-not-allowed"
                        : "bg-red-600 text-white hover:bg-red-800"
                    }`}
                  >
                    {isDeleting ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* "Start without file" button */}
      <div className="mt-4">
        
      </div>

      {/* Chapter Name Modal */}
      {chapterModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-[90%] max-w-md text-center shadow-lg space-y-4 animate-fadeIn">
            <h3 className="text-xl font-semibold text-[#4F46E5]">Enter Chapter Information</h3>
            <p className="text-gray-600">Please provide information about this exam's chapter</p>
            <div className="space-y-3">
              <div className="flex flex-col text-left">
                <label className="text-gray-700 text-sm font-medium mb-1">Chapter Name</label>
                <input
                  type="text"
                  placeholder="e.g. Introduction to Variables"
                  value={chapterName}
                  onChange={(e) => setChapterName(e.target.value)}
                  className="border border-gray-300 rounded-md p-2 text-black"
                />
              </div>
              
              {existingChapters.length > 0 && (
                <div className="text-left">
                  <label className="text-gray-700 text-sm font-medium mb-1">Existing Chapters</label>
                  <div className="flex flex-wrap gap-2 mt-1 mb-3">
                    {existingChapters.map((chapter, idx) => (
                      <span 
                        key={idx}
                        className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full cursor-pointer hover:bg-blue-200"
                        onClick={() => {
                          setChapterName(chapter.name);
                          if(chapter.number) setChapterNumber(chapter.number.toString());
                        }}
                      >
                        {chapter.name} {chapter.number && `(Ch. ${chapter.number})`}
                      </span>
                    ))}
                  </div>
                </div>
              )}
                <div className="flex flex-col text-left mt-3">
                <label className="text-gray-700 text-sm font-medium mb-1">Chapter Number (optional)</label>
                <select
                  value={chapterNumber}
                  onChange={(e) => setChapterNumber(e.target.value)}
                  className="border border-gray-300 rounded-md p-2 text-black"
                >
                  <option value="">Select chapter number</option>
                  {Array.from({ length: 20 }, (_, i) => i + 1).map((num) => (
                    <option key={num} value={num}>{num}</option>
                  ))}
                </select>
              </div>
              
              <div className="pt-4 flex justify-between">
                <button
                  onClick={() => {
                    setChapterModalOpen(false);
                    setFile(null); // Reset file if uploaded
                  }}
                  className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!chapterName.trim()) {
                      alert("Please enter a chapter name");
                      return;
                    }
                    setChapterModalOpen(false);
                    setShowQuestionEditor(true);
                  }}
                  className="bg-[#4F46E5] text-white px-4 py-2 rounded hover:bg-[#4338ca]"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Question Editor UI */}
      {showQuestionEditor && (
        <div className="fixed inset-0 bg-white z-50 overflow-auto p-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-[#4F46E5]">
                {currentExamId ? "Edit Exam" : "Create Exam"} - {chapterName}
              </h2>
              <div className="flex space-x-2">
                <button
                  onClick={handleSaveExam}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition flex items-center"
                >
                  <Save size={18} className="inline mr-2" /> Save Exam
                </button>
                <button
                  onClick={() => {
                    setShowQuestionEditor(false);
                    setChapterName("");
                    setParsedQuestions([]);
                    setParsedTitle("");
                    setParsedDescription("");
                  }}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
                >
                  <X size={18} className="inline mr-2" /> Cancel
                </button>
              </div>
            </div>

            {/* Exam Title and Description */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-1">
                  Exam Title
                </label>
                <input
                  type="text"
                  value={parsedTitle}
                  onChange={(e) => setParsedTitle(e.target.value)}
                  placeholder="Enter exam title"
                  className="border border-gray-300 rounded-md p-2 text-black w-full"
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-1">
                  Exam Description
                </label>
                <input
                  type="text"
                  value={parsedDescription}
                  onChange={(e) => setParsedDescription(e.target.value)}
                  placeholder="Enter exam description"
                  className="border border-gray-300 rounded-md p-2 text-black w-full"
                />
              </div>
            </div>

            {/* Questions List */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-[#4F46E5] mb-2">
                Exam Questions ({parsedQuestions.length})
              </h3>

              {parsedQuestions.length === 0 ? (
                <div className="p-4 bg-gray-100 rounded text-center">
                  <p className="text-gray-500">No questions added yet. Add a new question below.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {parsedQuestions.map((q, index) => (
                    <div key={index} className="p-4 border rounded-lg shadow hover:shadow-md">
                      <div className="flex justify-between">
                        <h4 className="font-medium text-gray-800">Q{index + 1}: {q.type.toUpperCase()}</h4>
                        <button
                          onClick={() => deleteQuestion(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X size={16} />
                        </button>
                      </div>
                      <p className="mt-2 text-gray-700">{q.question}</p>
                      
                      {q.type === "mcq" && (
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          {Object.entries(q.options).map(([label, text]) => (
                            <div key={label} className={`p-2 rounded ${label === q.answer ? 'bg-green-100' : 'bg-gray-50'}`}>
                              <span className="font-medium">{label}:</span> {text}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {q.type !== "mcq" && (
                        <div className="mt-2 bg-blue-50 p-2 rounded">
                          <span className="font-medium">Answer:</span> {q.answer}
                        </div>
                      )}
                      
                      {q.type === "coding" && q.code && (
                        <div className="mt-2 bg-gray-100 p-2 rounded font-mono text-sm">
                          <p className="font-medium">Starter Code:</p>
                          <pre>{q.code}</pre>
                        </div>
                      )}
                      
                      {q.type === "code_error" && (
                        <>
                          <div className="mt-2 bg-red-50 p-2 rounded font-mono text-sm">
                            <p className="font-medium">Buggy Code:</p>
                            <pre>{q.buggy}</pre>
                          </div>
                          <div className="mt-2 bg-green-50 p-2 rounded font-mono text-sm">
                            <p className="font-medium">Fix Code:</p>
                            <pre>{q.fix}</pre>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add New Question Form */}
            <div className="bg-gray-50 p-6 rounded-lg border">
              <h3 className="text-lg font-semibold text-[#4F46E5] mb-4">
                Add New Question
              </h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-1">
                      Question Type
                    </label>
                    <select
                      className="border border-gray-300 rounded-md p-2 text-black w-full"
                      value={newQuestion.type}
                      onChange={(e) => setNewQuestion({
                        ...newQuestion,
                        type: e.target.value
                      })}
                    >
                      <option value="mcq">Multiple Choice (MCQ)</option>
                      <option value="fill_blank">Fill in the Blanks</option>
                      <option value="short_answer">Short Answer</option>
                      <option value="coding">Coding Question</option>
                      <option value="code_error">Code Error Detection</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-1">
                      Max Score
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={newQuestion.max_score}
                      onChange={(e) => setNewQuestion({
                        ...newQuestion,
                        max_score: parseInt(e.target.value) || 1
                      })}
                      className="border border-gray-300 rounded-md p-2 text-black w-full"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-1">
                    Question Text
                  </label>
                  <textarea
                    rows="3"
                    value={newQuestion.question}
                    onChange={(e) => setNewQuestion({
                      ...newQuestion,
                      question: e.target.value
                    })}
                    placeholder="Enter your question here..."
                    className="border border-gray-300 rounded-md p-2 text-black w-full"
                  />
                </div>
                
                {newQuestion.type === "mcq" && (
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-1">
                      Options
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {Object.keys(newQuestion.options).map((key) => (
                        <div key={key} className="flex items-center">
                          <span className="font-medium w-6">{key}:</span>
                          <input
                            type="text"
                            value={newQuestion.options[key]}
                            onChange={(e) => setNewQuestion({
                              ...newQuestion,
                              options: {
                                ...newQuestion.options,
                                [key]: e.target.value
                              }
                            })}
                            placeholder={`Option ${key}`}
                            className="border border-gray-300 rounded-md p-2 text-black w-full"
                          />
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-2">
                      <label className="block text-gray-700 text-sm font-medium mb-1">
                        Correct Answer
                      </label>
                      <select
                        className="border border-gray-300 rounded-md p-2 text-black w-full"
                        value={newQuestion.answer}
                        onChange={(e) => setNewQuestion({
                          ...newQuestion,
                          answer: e.target.value
                        })}
                      >
                        <option value="">Select correct answer</option>
                        {Object.keys(newQuestion.options).map((key) => (
                          <option key={key} value={key}>
                            {key}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
                
                {(newQuestion.type === "fill_blank" || newQuestion.type === "short_answer") && (
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-1">
                      Correct Answer
                    </label>
                    <input
                      type="text"
                      value={newQuestion.answer}
                      onChange={(e) => setNewQuestion({
                        ...newQuestion,
                        answer: e.target.value
                      })}
                      placeholder="Enter the correct answer"
                      className="border border-gray-300 rounded-md p-2 text-black w-full"
                    />
                  </div>
                )}
                
                {newQuestion.type === "coding" && (
                  <div>
                    <label className="block text-gray-700 text-sm font-medium mb-1">
                      Starter Code
                    </label>
                    <textarea
                      rows="5"
                      value={newQuestion.code}
                      onChange={(e) => setNewQuestion({
                        ...newQuestion,
                        code: e.target.value
                      })}
                      placeholder="Provide starter code for students"
                      className="border border-gray-300 rounded-md p-2 text-black w-full font-mono"
                    />
                    <label className="block text-gray-700 text-sm font-medium mt-2 mb-1">
                      Expected Answer/Solution
                    </label>
                    <textarea
                      rows="3"
                      value={newQuestion.answer}
                      onChange={(e) => setNewQuestion({
                        ...newQuestion,
                        answer: e.target.value
                      })}
                      placeholder="Expected output or solution approach"
                      className="border border-gray-300 rounded-md p-2 text-black w-full"
                    />
                  </div>
                )}
                
                {newQuestion.type === "code_error" && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-1">
                        Buggy Code
                      </label>
                      <textarea
                        rows="5"
                        value={newQuestion.buggy}
                        onChange={(e) => setNewQuestion({
                          ...newQuestion,
                          buggy: e.target.value
                        })}
                        placeholder="Code with bugs for students to find"
                        className="border border-gray-300 rounded-md p-2 text-black w-full font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-1">
                        Fixed Code
                      </label>
                      <textarea
                        rows="5"
                        value={newQuestion.fix}
                        onChange={(e) => setNewQuestion({
                          ...newQuestion,
                          fix: e.target.value
                        })}
                        placeholder="The corrected version of the code"
                        className="border border-gray-300 rounded-md p-2 text-black w-full font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 text-sm font-medium mb-1">
                        Explanation (Answer)
                      </label>
                      <textarea
                        rows="2"
                        value={newQuestion.answer}
                        onChange={(e) => setNewQuestion({
                          ...newQuestion,
                          answer: e.target.value
                        })}
                        placeholder="Explanation of what was wrong and how to fix it"
                        className="border border-gray-300 rounded-md p-2 text-black w-full"
                      />
                    </div>
                  </div>
                )}
                
                <div className="pt-2">
                  <button
                    onClick={addNewQuestion}
                    className="bg-[#4F46E5] text-white px-4 py-2 rounded hover:bg-[#4338ca] transition"
                  >
                    <PlusCircle size={18} className="inline mr-2" /> Add Question
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading/Success Modal */}
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
              <>
                <p
                  className={`text-xl font-semibold ${
                    vectorStatus === "success"
                      ? "text-green-600"
                      : "text-red-500"
                  }`}
                >
                  {vectorMessage}
                </p>
                <button
                  className="bg-[#4F46E5] text-white px-4 py-2 rounded hover:bg-[#4338ca]"
                  onClick={() => setVectorModalOpen(false)}
                >
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const ProtectedQuestionUpload = () => {
  return (
    <ProtectedPage requiredRole={["teacher"]}>
      <QuestionUpload />
    </ProtectedPage>
  );
};

export default ProtectedQuestionUpload;
