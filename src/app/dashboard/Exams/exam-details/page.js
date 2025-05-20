"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import LoadingSpinner from "@/app/components/LoadingSpinner";
import ProtectedPage from "@/app/components/ProtectedPage";

export default function ExamDashboard() {  const [examData, setExamData] = useState([]);
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState("");
  const [questionType, setQuestionType] = useState("EASY");
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [resultToDelete, setResultToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchCourses = async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title");
      if (error) {
        console.error("Error fetching courses:", error);
        return;
      }
      setCourses(data);
      setLoading(false);
    };
    fetchCourses();
  }, []);
  // Handler for delete button click
  const handleDeleteResult = (resultId) => {
    setResultToDelete(resultId);
    setDeleteModalOpen(true);
  };
  // Handler for confirming deletion
  const confirmDelete = async () => {
    if (!resultToDelete) return;
    
    setDeleteLoading(true);
    try {
      // First get the user_id and exam_id for the result
      const { data: resultData, error: fetchError } = await supabase
        .from('exam_results')
        .select('user_id, exam_id')
        .eq('id', resultToDelete)
        .single();
      
      if (fetchError) {
        console.error("Error fetching result data:", fetchError);
        throw fetchError;
      }
      
      // Delete from exam_result_details
      const { error: detailsError } = await supabase
        .from('exam_result_details')
        .delete()
        .eq('exam_result_id', resultToDelete);
      
      if (detailsError) {
        console.error("Error deleting result details:", detailsError);
        throw detailsError;
      }
      
      // Then delete from exam_results
      const { error } = await supabase
        .from('exam_results')
        .delete()
        .eq('id', resultToDelete);
        
      if (error) {
        console.error("Error deleting result:", error);
        throw error;
      }
      
      // Update UI by filtering out the deleted result
      setExamData(prevData => 
        prevData.map(exam => ({
          ...exam,
          results: exam.results.filter(res => res.id !== resultToDelete)
        }))
      );
        // Show success notification
      alert("Exam result deleted successfully! The student can now retake this exam.");
      
      setDeleteModalOpen(false);
    } catch (err) {
      console.error("Failed to delete result:", err);
      alert("Failed to delete result. Please try again.");
    } finally {
      setDeleteLoading(false);
      setResultToDelete(null);
    }
  };

  useEffect(() => {
    const fetchFilteredExams = async () => {
      if (!courseId || !questionType) return;
      setLoading(true);
      const { data: exams, error: examsError } = await supabase
        .from("exams")
        .select("id, title, type")
        .eq("course_id", courseId)
        .eq("type", questionType.toLowerCase());

      if (examsError) {
        console.error("Error fetching exams:", examsError);
        return;
      }

      const examsWithResults = await Promise.all(
        exams.map(async (exam) => {
          const { data: results, error: resultsError } = await supabase
            .from("exam_results")
            .select("id, user_id, total_marks, obtained, created_at")
            .eq("exam_id", exam.id);

          if (resultsError) {
            console.error("Error fetching exam results:", resultsError);
            return;
          }

          const userIds = results.map((r) => r.user_id);
          const { data: users, error: usersError } = await supabase
            .from("users")
            .select("id, name")
            .in("id", userIds);

          if (usersError) {
            console.error("Error fetching user names:", usersError);
            return;
          }

          const userMap = Object.fromEntries(users.map((u) => [u.id, u.name]));

          return {
            ...exam,
            results: results.map((r) => ({
              ...r,
              studentName: userMap[r.user_id] || "Unknown",
            })),
          };
        })
      );

      setExamData(examsWithResults.filter(Boolean));
      setLoading(false);
    };

    fetchFilteredExams();
  }, [courseId, questionType]);

  if (loading) return <LoadingSpinner />;
  return (
    <ProtectedPage requiredRole={["teacher"]}>
      <div className="min-h-screen bg-white p-6 shadow-lg overflow-auto">
        <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="mb-4 cursor-pointer bg-[#4F46E5] text-white px-4 py-2 rounded hover:bg-[#4338ca] transition"
        >
          <ArrowLeft className="inline mr-2" size={18} />
          Back
        </button>

        <h1 className="text-2xl font-bold text-[#4F46E5] mb-6">
          Exam Results Dashboard
        </h1>

        {/* Filter Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
        </div>

        {/* Results Section */}
        {examData.length > 0 ? (
          examData.map((exam) => (
            <div
              key={exam.id}
              className="bg-white shadow rounded-lg p-4 mb-6 border"
            >
              <h3 className="text-lg font-semibold text-[#4F46E5] mb-3">
                {exam.title} ({exam.type})
              </h3>{" "}
              <table className="min-w-full text-sm">
                <thead className="border-b text-gray-600">
                  <tr>
                    <th className="py-2 text-left">Student</th>
                    <th className="py-2 text-left">Obtained Marks</th>
                    <th className="py-2 text-left">Total Marks</th>
                    <th className="py-2 text-left">Date</th>
                    <th className="py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {exam.results.map((res) => (
                    <tr
                      key={res.id}
                      className="border-t hover:bg-gray-50 text-gray-800"
                    >                      <td className="py-2">{res.studentName}</td>
                      <td className="py-2">{res.obtained}</td>
                      <td className="py-2">{res.total_marks}</td>
                      <td className="py-2">
                        {new Date(res.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-2 flex space-x-2">
                        <button
                          onClick={() =>
                            router.push(`/dashboard/Exams/review/${res.id}`)
                          }
                          className="bg-[#4F46E5] cursor-pointer text-white px-3 py-1 rounded hover:bg-[#4338ca] transition text-xs"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => handleDeleteResult(res.id)}
                          className="bg-red-600 cursor-pointer text-white px-3 py-1 rounded hover:bg-red-700 transition text-xs"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {exam.results.length === 0 && (
                    <tr>
                      <td
                        colSpan="5"
                        className="py-3 text-center text-gray-500"
                      >
                        No results available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ))
        ) : (
          <p className="text-gray-500 text-center mt-10">
            Select a course and question type to view exam results.
          </p>        )}      </div>
      </div>
      
      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
<div className="fixed inset-0 bg-white/30 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-xl font-medium text-gray-900 mb-4">Confirm Delete</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this exam result? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleteLoading}
                className="cursor-pointer px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteLoading}
                className="cursor-pointer px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition flex items-center"
              >
                {deleteLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </ProtectedPage>
  );
}
