"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import useUserSession from "@/app/lib/useUserSession";
import LoadingSpinner from "@/app/components/LoadingSpinner";
import { ChartNoAxesColumnDecreasing } from "lucide-react";

export default function SubmissionsListPage() {
  const { id } = useParams(); // assignment ID
  const { user } = useUserSession({ redirectIfNoSession: false });

  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [grade, setGrade] = useState("");
  const [feedback, setFeedback] = useState("");
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [maxScore, setMaxScore] = useState(100); // default, optionally fetched
  const [subUrls, setSubUrls] = useState([]); // Add this state for file URLs

  useEffect(() => {
    if (!id || !user) return;

    const fetchSubmissions = async () => {
      const { data, error } = await supabase
        .from("submissions")
        .select(
          "submitted_at, grade, feedback, is_late, file_url, student_id, assignment_id, users:student_id ( name, email )"
        )
        .eq("assignment_id", id);

      if (error) {
        alert("Failed to fetch submissions: " + error.message);
        return;
      }
      setSubmissions(data);
      setLoading(false);
    };

    fetchSubmissions();
  }, [id, user]);

  useEffect(() => {
    if (!id || !submissions.length) return;

    const fetchFiles = async () => {
      setLoading(true);
      const allUrls = [];

      const urlsMap = {};

      for (const submission of submissions) {
        const studentId = submission.student_id;
        const folderPath = `assignments/${id}/${studentId}`;

        const { data: subs, error } = await supabase.storage
          .from("submissions")
          .list(folderPath);

        if (error || !subs) continue;

        urlsMap[studentId] = subs.map((file) => {
          const { data } = supabase.storage
            .from("submissions")
            .getPublicUrl(`${folderPath}/${file.name}`);
          return {
            name: file.name,
            url: data.publicUrl,
          };
        });
      }

      setSubUrls(urlsMap); // 👈 Map studentId -> [files]

      setLoading(false);
    };

    fetchFiles();
  }, [submissions, id]);

  const handleShowForm = (submission) => {
    setSelectedSubmission(submission);
    setGrade(submission.grade ?? "");
    setFeedback(submission.feedback ?? "");
    setShowForm(true);
  };

  const handleMarkSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSubmission) return alert("No submission selected.");
    if (Number(grade) > maxScore)
      return alert("Obtained marks exceed maximum allowed.");

    const { data, error } = await supabase
      .from("submissions")
      .update({
        grade: Number(grade),
        feedback: feedback,
      })
      .eq("assignment_id", id)
      .eq("student_id", selectedSubmission.student_id);

    if (error) {
      console.error("Grading failed:", error.message);
      alert("Failed to submit marks.");
      return;
    }

    alert("Grading submitted successfully.");
    setSubmissions((prev) =>
      prev.map((s) =>
        s.student_id === selectedSubmission.student_id
          ? { ...s, grade: Number(grade), feedback }
          : s
      )
    );
    setShowForm(false);
    setSelectedSubmission(null);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-[#F9FAFB] py-10 px-4 md:px-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => history.back()}
            className="text-sm px-4 py-2 bg-[#4F46E5] text-white rounded-md hover:bg-[#4338ca] transition"
          >
            ← Back
          </button>
          <h2 className="text-2xl md:text-3xl font-semibold text-[#1F2937]">
            Assignment Submissions
          </h2>
        </div>

        <div className="bg-white rounded-xl shadow-md border overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm md:text-base">
            <thead className="bg-[#EEF2FF] text-[#1F2937]">
              <tr>
                <th className="p-4 border-b">Student</th>
                <th className="p-4 border-b">Email</th>
                <th className="p-4 border-b">Submitted At</th>
                <th className="p-4 border-b">Late?</th>
                <th className="p-4 border-b">Grade</th>
                <th className="p-4 border-b">Feedback</th>
                <th className="p-4 border-b">File</th>
                <th className="p-4 border-b">Edit</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((sub, idx) => (
                <tr
                  key={idx}
                  className={`${
                    idx % 2 === 0 ? "bg-white" : "bg-[#F9FAFB]"
                  } text-gray-800`}
                >
                  <td className="p-4 border-b font-medium">
                    {sub.users?.name || "N/A"}
                  </td>
                  <td className="p-4 border-b text-gray-600">
                    {sub.users?.email || "N/A"}
                  </td>
                  <td className="p-4 border-b">
                    {new Date(sub.submitted_at).toLocaleString()}
                  </td>
                  <td className="p-4 border-b">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        sub.is_late
                          ? "bg-red-100 text-red-600"
                          : "bg-green-100 text-green-600"
                      }`}
                    >
                      {sub.is_late ? "Yes" : "No"}
                    </span>
                  </td>
                  <td className="p-4 border-b">
                    <span className="inline-block bg-blue-100 text-blue-700 text-xs font-medium px-2 py-1 rounded-full">
                      {sub.grade ?? "N/A"}
                    </span>
                  </td>
                  <td className="p-4 border-b">
                    {sub.feedback === ""
                      ? "—"
                      : sub.feedback?.length > 50
                      ? sub.feedback.slice(0, 50) + "..."
                      : sub.feedback}
                  </td>
                  <td className="p-4 border-b">
                    {subUrls[sub.student_id]?.length > 0 ? (
                      subUrls[sub.student_id].map((file, i) => (
                        <div key={i}>
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#4F46E5] hover:underline font-medium"
                          >
                            {file.name}
                          </a>
                        </div>
                      ))
                    ) : (
                      <span className="text-gray-400">No file</span>
                    )}
                  </td>
                  <td className="p-4 border-b">
                    <button
                      onClick={() => handleShowForm(sub)}
                      className="cursor-pointer text-white px-4 py-2 bg-[#4F46E5] hover:bg-[#4338ca] transition duration-300 rounded-sm"
                    >
                      Mark
                    </button>
                  </td>
                </tr>
              ))}

              {submissions.length === 0 && (
                <tr>
                  <td colSpan="8" className="p-6 text-center text-gray-500">
                    No submissions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form
            onSubmit={handleMarkSubmit}
            className="bg-white p-6 rounded-2xl shadow-lg w-[90%] max-w-md space-y-4"
          >
            <h2 className="text-2xl font-bold text-[#1F2937]">Grading</h2>

            <input
              type="text"
              placeholder="Total Marks"
              value={maxScore}
              readOnly
              className="w-full p-2 border text-black border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
              required
            />
            <input
              type="number"
              placeholder="Obtained Marks"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="w-full p-2 text-black border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
              required
            />
            <textarea
              placeholder="Feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="w-full p-2 text-black border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
              required
            />

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-gray-600 px-4 py-2 cursor-pointer hover:underline transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-[#4F46E5] text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-[#4338ca] transition"
              >
                Mark
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
