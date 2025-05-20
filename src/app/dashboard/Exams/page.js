"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import { Upload, FileText, BarChartBig  } from "lucide-react";
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
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vectorModalOpen, setVectorModalOpen] = useState(false);
  const [vectorStatus, setVectorStatus] = useState("loading");
  const [vectorMessage, setVectorMessage] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .select("*");
      if (!courseError) setCourses(courseData);

      if (courseId) {
        const { data: uploadedData, error: uploadedError } = await supabase
          .from("exams")
          .select("*")
          .eq("course_id", courseId)
          .eq("type", questionType.toLowerCase());
        setUploadedFiles(!uploadedError ? uploadedData || [] : []);
      } else {
        setUploadedFiles([]);
      }
      setLoading(false);
    };

    fetchData();
  }, [courseId, questionType]);


  const handleUpload = async () => {
    if (!file || !courseId || !questionType) return;

    setVectorModalOpen(true);
    setVectorStatus("loading");
    setVectorMessage("Calling API...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("course_id", courseId);

      const response = await fetch("http://localhost:5000/parse-questions", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Parsing service failed.");
      setVectorMessage("Parsing successful, saving to database...");

      const { title, description, questions } = await response.json();

      const { data: examData, error } = await supabase
        .from("exams")
        .insert([
          {
            course_id: courseId,
            title,
            description,
            type: questionType.toLowerCase(),
            source_file: file.name,
          },
        ])
        .select();

      if (error) {
        setVectorStatus("error");
        setVectorMessage(`Upload failed: ${error.message}`);
        return;
      }

      const examId = examData[0].id;

      for (const q of questions) {
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

      const { data: updatedUploads } = await supabase
        .from("exams")
        .select("*")
        .eq("course_id", courseId)
        .eq("type", questionType.toLowerCase());

      setUploadedFiles(updatedUploads || []);
      setFile(null);

      setVectorStatus("success");
      setVectorMessage("Questions parsed and saved successfully!");
    } catch (err) {
      console.error("Parsing error:", err);
      setVectorStatus("error");
      setVectorMessage("Failed to parse and save questions.");
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-white p-6 shadow-lg">
      <h2 className="text-2xl font-bold text-[#4F46E5] mb-6">
        Upload Questions
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <select
          className="border border-gray-300 rounded-md p-2 text-black"
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
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

        <input
          type="file"
          className="border border-gray-300 rounded-md p-2 text-black"
          onChange={(e) => setFile(e.target.files[0])}
        />
      </div>

      <div className="flex justify-between">
        <button
        onClick={handleUpload}
        className="mt-4 cursor-pointer bg-[#4F46E5] text-white px-4 py-2 rounded hover:bg-[#4338ca] transition"
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
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className="relative p-4 border rounded-lg shadow hover:shadow-md"
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
                <FileText className="text-[#4F46E5] mb-2" />
                <p className="font-semibold text-gray-800">
                  {file.title || file.source_file}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  {file.description || "No description"}
                </p>
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
            ))}
          </div>
        )}
      </div>

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
