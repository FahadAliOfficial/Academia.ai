"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import Link from "next/link";
import ProtectedPage from "@/app/components/ProtectedPage";
import ExamDetailsModal from "./ExamDetailsModal";

function ExamPortal() {
  const [availableExams, setAvailableExams] = useState([]);
  const [completedExams, setCompletedExams] = useState([]);
  const [filteredCompletedExams, setFilteredCompletedExams] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingExamDetails, setLoadingExamDetails] = useState({});
  const [examDetails, setExamDetails] = useState({});
  const [activeTab, setActiveTab] = useState("available");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);
  // Filter state variables
  const [courses, setCourses] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedChapter, setSelectedChapter] = useState("");

  // Fetch courses when component mounts
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const { data, error } = await supabase
          .from("courses")
          .select("id, title");

        if (error) {
          console.error("Error fetching courses:", error);
          return;
        }

        setCourses(data || []);
      } catch (err) {
        console.error("Failed to fetch courses:", err);
      }
    };

    fetchCourses();
  }, []);

  // Fetch chapters when selected course changes
  useEffect(() => {
    const fetchChapters = async () => {
      if (!selectedCourse) {
        setChapters([]);
        return;
      }

      try {
        // Fetch existing chapters for this course
        const { data: chaptersData, error: chaptersError } = await supabase
          .from("exams")
          .select("chapter_name, chapter")
          .eq("course_id", selectedCourse)
          .not("chapter_name", "is", null);

        if (!chaptersError && chaptersData) {          // Create a unique list of chapters
          const uniqueChapters = chaptersData.reduce((acc, item) => {
            // Convert chapter to number if it exists
            const chapterNumber = item.chapter !== null ? Number(item.chapter) : null;
            
            if (
              item.chapter_name &&
              !acc.some((ch) => ch.number === chapterNumber)
            ) {
              acc.push({
                name: item.chapter_name,
                number: chapterNumber,
              });
            }
            return acc;
          }, []);

          // Sort chapters by number
          uniqueChapters.sort((a, b) => (a.number || 0) - (b.number || 0));
          setChapters(uniqueChapters);

          // Reset chapter selection when course changes
          setSelectedChapter("");
        }
      } catch (err) {
        console.error("Failed to fetch chapters:", err);
      }
    };

    fetchChapters();
  }, [selectedCourse]);
  // Filter completed exams based on selected course and chapter
  useEffect(() => {
    if (completedExams.length === 0) {
      setFilteredCompletedExams([]);
      return;
    }

    let filtered = [...completedExams];

    // Apply course filter
    if (selectedCourse) {
      filtered = filtered.filter((exam) => exam.courseId === selectedCourse);
    }    // Apply chapter filter
    if (selectedChapter) {
      const selectedChapterNumber = parseInt(selectedChapter);
      filtered = filtered.filter((exam) => {
        // Ensure we're comparing numbers
        const examChapterNumber = Number(exam.chapter);
        
        console.log("Filtering chapter:", {
          examChapter: exam.chapter,
          examChapterNumber,
          selectedChapterNumber,
          matches: !isNaN(examChapterNumber) && examChapterNumber === selectedChapterNumber
        });
        
        return !isNaN(examChapterNumber) && examChapterNumber === selectedChapterNumber;
      });
    }

    console.log("Filtering exams:", {
      total: completedExams.length,
      filtered: filtered.length,
      selectedCourse,
      selectedChapter,
      sampleExam: completedExams[0],
    });

    setFilteredCompletedExams(filtered);
  }, [completedExams, selectedCourse, selectedChapter]);

  // Fetch exams data
  useEffect(() => {
    const fetchExams = async () => {
      setIsLoading(true);

      // Get user session
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      if (!userId) {
        console.error("User not authenticated");
        setIsLoading(false);
        return;
      }

      // Step 1: Get all exam results for this user with exam details
      try {
        // First, get exam_results with exam details
        const { data: examResults, error: resultsError } = await supabase
          .from("exam_results")
          .select(
            `
            id, 
            total_marks, 
            obtained, 
            created_at,
            exam_id,
            user_id, 
            exams:exam_id (
              id, 
              title, 
              description, 
              type,
              course_id,
              chapter,
              chapter_name
            )
          `
          )
          .eq("user_id", userId);

        // For each exam result, get course information from the exam's course_id
        let enrichedResults = [];
        if (examResults && !resultsError) {
          for (const result of examResults) {
            if (result.exams?.course_id) {
              const { data: courseData } = await supabase
                .from("courses")
                .select("id, title")
                .eq("id", result.exams.course_id)
                .single();

              enrichedResults.push({
                ...result,
                courses: courseData,
              });
            } else {
              enrichedResults.push(result);
            }
          }
        }
        if (resultsError) {
          console.error("Error fetching exam results:", resultsError);
          setCompletedExams([]);
          setFilteredCompletedExams([]);
        } else {
          // Process exam results only if we have valid data
          if (enrichedResults && enrichedResults.length > 0) {
            // Format and store completed exams
            const formattedCompletedExams = enrichedResults.map((result) => {
              // Debug exam data structure
              console.log("Enriched exam result:", {
                id: result.id,
                exam_id: result.exam_id,
                exams: result.exams,
                courses: result.courses,
              });

              return {
                id: result.id,                examId: result.exam_id,
                title: result.exams?.title || "Unknown Exam",
                description: result.exams?.description || "",
                type: result.exams?.type || "",
                courseId: result.exams?.course_id,
                courseName: result.courses?.title || "Unknown Course",
                chapter: result.exams?.chapter !== null ? Number(result.exams?.chapter) : null,
                chapterName: result.exams?.chapter_name,
                totalMarks: result.total_marks || 0,
                obtained: result.obtained || 0,
                score:
                  result.total_marks > 0
                    ? Math.round((result.obtained / result.total_marks) * 100)
                    : 0,
                completedDate: new Date(result.created_at).toLocaleDateString(
                  "en-US",
                  {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  }
                ),
              };
            });            console.log("Formatted completed exams:", formattedCompletedExams.map(exam => ({
              id: exam.id,
              title: exam.title,
              chapter: exam.chapter,
              chapterType: typeof exam.chapter
            })));
            
            setCompletedExams(formattedCompletedExams);
            setFilteredCompletedExams(formattedCompletedExams);
            // Get IDs of exams the student has already taken
            const takenExamIds = enrichedResults
              .map((result) => result.exam_id)
              .filter(Boolean);

            // Step 2: Fetch all live exams NOT in takenExamIds
            let query = supabase
              .from("exams")
              .select(
                `
                *,
                courses:course_id (
                  id,
                  title
                )
              `
              )
              .eq("is_live", true);

            if (takenExamIds.length > 0) {
              query = query.not("id", "in", `(${takenExamIds.join(",")})`);
            }

            const { data: availableExamsData, error: availableError } =
              await query;

            if (availableError) {
              console.error("Error fetching available exams:", availableError);
              setAvailableExams([]);
            } else {
              // Format available exams with course information
              const formattedAvailableExams = (availableExamsData || []).map(
                (exam) => ({
                  ...exam,
                  courseName: exam.courses?.title || "Unknown Course",
                })
              );
              setAvailableExams(formattedAvailableExams);
            }
          } else {
            setCompletedExams([]);
            setFilteredCompletedExams([]);

            // If no exam results, just fetch all live exams
            const { data: availableExamsData, error: availableError } =
              await supabase
                .from("exams")
                .select(
                  `
                *,
                courses:course_id (
                  id,
                  title
                )
              `
                )
                .eq("is_live", true);

            if (availableError) {
              console.error("Error fetching available exams:", availableError);
              setAvailableExams([]);
            } else {
              // Format available exams with course information
              const formattedAvailableExams = (availableExamsData || []).map(
                (exam) => ({
                  ...exam,
                  courseName: exam.courses?.title || "Unknown Course",
                })
              );
              setAvailableExams(formattedAvailableExams);
            }
          }
        }
      } catch (error) {
        console.error("Unexpected error in fetchExams:", error);
        setCompletedExams([]);
        setFilteredCompletedExams([]);
        setAvailableExams([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchExams();
  }, []);

  return (
    <div className="min-h-screen bg-white p-6 shadow-lg overflow-auto">
      {/* Exam Details Modal */}
      <ExamDetailsModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        exam={selectedExam}
        examDetails={selectedExam ? examDetails[selectedExam.examId] : []}
        loadingDetails={
          selectedExam ? loadingExamDetails[selectedExam.id] : false
        }
      />

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#4F46E5] mb-4">
          Student Exam Portal
        </h2>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            className={`px-6 py-2 font-medium text-sm ${
              activeTab === "available"
                ? "border-b-2 border-[#4F46E5] text-[#4F46E5]"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("available")}
          >
            Available Exams
          </button>
          <button
            className={`px-6 py-2 font-medium text-sm ${
              activeTab === "completed"
                ? "border-b-2 border-[#4F46E5] text-[#4F46E5]"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("completed")}
          >
            Completed Exams
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-gray-500">Loading exams...</p>
      ) : activeTab === "available" ? (
        availableExams.length === 0 ? (
          <p className="text-gray-500">
            No live exams are available right now.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {availableExams.map((exam) => (
              <div
                key={exam.id}
                className="relative p-6 border rounded-lg shadow hover:shadow-md transition"
              >
                {/* Live Badge */}
                <div className="absolute top-4 right-4">
                  <span className="px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full">
                    Available
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  {exam.title}
                </h3>
                <p className="text-gray-600 mb-4">
                  {exam.description || "No description"}
                </p>
                {exam.chapter_name && (
                  <p className="text-sm text-gray-500 mb-3">
                    Chapter: {exam.chapter_name}{" "}
                    {exam.chapter && `(Chapter ${exam.chapter})`}
                  </p>
                )}
                <p className="text-sm text-gray-500 mb-3">
                  Course: {exam.courseName}
                </p>
                <Link href={`../../../pages/exam/${exam.id}`}>
                  <button className="mt-2 w-full cursor-pointer bg-[#4F46E5] text-white px-4 py-2 rounded hover:bg-[#4338ca] transition">
                    Start Exam
                  </button>
                </Link>
              </div>
            ))}
          </div>
        )
      ) : (
        // Completed Exams Tab
        <>
          {/* Filter Controls for Completed Exams */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <select
              className="border border-gray-300 rounded-md p-2 text-black"
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
            >
              <option value="">All Courses</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>

            <div className="relative">
              <select
                className="border border-gray-300 rounded-md p-2 text-black w-full pr-10"
                value={selectedChapter}
                onChange={(e) => setSelectedChapter(e.target.value)}
                disabled={!selectedCourse || chapters.length === 0}
              >
                <option value="">All Chapters</option>                {chapters.map((chapter) => (
                  <option 
                    key={chapter.number} 
                    value={chapter.number ? chapter.number.toString() : ""}
                  >
                    {chapter.name} {chapter.number && `(Ch. ${chapter.number})`}
                  </option>
                ))}
              </select>
              {selectedChapter && (
                <button
                  onClick={() => setSelectedChapter("")}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-red-500"
                  title="Clear chapter filter"
                >
                  <span className="text-xl">×</span>
                </button>
              )}
            </div>

            <div>
              {(selectedCourse || selectedChapter) && (
                <button
                  onClick={() => {
                    setSelectedCourse("");
                    setSelectedChapter("");
                  }}
                  className="border border-gray-300 rounded-md px-4 py-2 bg-gray-100 hover:bg-gray-200 transition text-gray-600 text-sm"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          </div>

          {/* Active Filters Summary */}
          {(selectedCourse || selectedChapter) && (
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Filtered by:{" "}
                {selectedCourse
                  ? courses.find((c) => c.id === selectedCourse)?.title ||
                    "Selected course"
                  : ""}
                {selectedCourse && selectedChapter ? " / " : ""}
                {selectedChapter ? `Chapter ${selectedChapter}` : ""}
              </p>
            </div>
          )}

          {completedExams.length === 0 ? (
            <p className="text-gray-500">
              You haven't completed any exams yet.
            </p>
          ) : filteredCompletedExams.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">
                No exams match the selected filters.
              </p>
              <button
                onClick={() => {
                  setSelectedCourse("");
                  setSelectedChapter("");
                }}
                className="mt-2 text-[#4F46E5] hover:underline text-sm"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {filteredCompletedExams.map((result) => (
                <div
                  key={result.id}
                  className="relative p-6 border rounded-lg shadow hover:shadow-md transition"
                >
                  {/* Result Badge */}
                  <div className="absolute top-4 right-4">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        result.score >= 70
                          ? "bg-green-100 text-green-800"
                          : result.score >= 50
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {result.score}%
                    </span>
                  </div>

                  <h3 className="text-xl font-semibold text-gray-800 mb-2">
                    {result.title}
                  </h3>

                  <p className="text-gray-600 mb-3">
                    {result.description || "No description"}
                  </p>

                  {/* Course and Chapter info */}
                  {result.chapterName && (
                    <p className="text-sm text-gray-500 mb-1">
                      Chapter: {result.chapterName}{" "}
                      {result.chapter && `(Chapter ${result.chapter})`}
                    </p>
                  )}
                  <p className="text-sm text-gray-500 mb-3">
                    Course: {result.courseName}
                  </p>

                  <div className="mt-4 mb-3 bg-gray-100 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full ${
                        result.score >= 70
                          ? "bg-green-500"
                          : result.score >= 50
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      }`}
                      style={{ width: `${result.score}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-gray-500">
                      Score: {result.obtained}/{result.totalMarks}
                    </span>
                    <span className="text-gray-500">
                      {result.completedDate}
                    </span>
                  </div>
                  <button
                    onClick={async () => {
                      // Set selected exam and open modal
                      setSelectedExam(result);

                      // If we don't have details yet, fetch them
                      if (!examDetails[result.examId]) {
                        try {
                          setLoadingExamDetails((prev) => ({
                            ...prev,
                            [result.id]: true,
                          }));

                          // Fetch exam result details directly from the exam_result_details table
                          const { data: resultDetails, error: detailsError } =
                            await supabase
                              .from("exam_result_details")
                              .select("*")
                              .eq("exam_result_id", result.id)
                              .order("id", { ascending: true });

                          if (detailsError) {
                            console.error(
                              "Error fetching exam result details:",
                              detailsError
                            );
                            return;
                          }

                          // Also fetch exam questions to get question text if available
                          const { data: questions, error: questionsError } =
                            await supabase
                              .from("exam_questions")
                              .select("*")
                              .eq("exam_id", result.examId);

                          // If we successfully got questions, merge the question text with result details
                          let processedDetails = resultDetails;
                          if (!questionsError && questions?.length > 0) {
                            processedDetails = resultDetails.map((detail) => {
                              const matchingQuestion = questions.find(
                                (q) => q.id === detail.question_id
                              );
                              return {
                                ...detail,
                                question_text:
                                  matchingQuestion?.question_text || "Question",
                                question_type:
                                  matchingQuestion?.type || "unknown",
                              };
                            });
                          }
                          // Store the details
                          setExamDetails((prev) => ({
                            ...prev,
                            [result.examId]: processedDetails,
                          }));
                        } catch (err) {
                          console.error("Failed to load exam details:", err);
                        } finally {
                          setLoadingExamDetails((prev) => ({
                            ...prev,
                            [result.id]: false,
                          }));
                          // Open the modal after fetching is complete
                          setModalOpen(true);
                        }
                      } else {
                        // If we already have details, just open the modal
                        setModalOpen(true);
                      }
                    }}
                    className="mt-4 w-full cursor-pointer bg-[#4F46E5] text-white px-4 py-2 rounded hover:bg-[#4338ca] transition flex items-center justify-center"
                  >
                    <span>View Question Details</span>
                    <svg
                      className="ml-2 w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      ></path>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function ProtectedExamPortal() {
  return (
    <ProtectedPage requiredRole={["student"]}>
      <ExamPortal />
    </ProtectedPage>
  );
}
