"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import useUserSession from "@/app/lib/useUserSession";
import LoadingSpinner from "@/app/components/LoadingSpinner";

export default function CourseDetailPage() {
  const { id } = useParams(); // assignment ID
  const { user } = useUserSession({ redirectIfNoSession: false });

  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [role, setRole] = useState(null);
  const [studentID, setStudentId] = useState(null);
  const [isLate, setIsLate] = useState(false);
  <time datetime="2016-10-25" suppressHydrationWarning />;

  // Extract role and studentID
  useEffect(() => {
    if (user) {
      const userRole = user.user_metadata.role;
      setRole(userRole);
      if (userRole === "student") {
        setStudentId(user.id);
      }
    }
  }, [user]);

  // Fetch assignment + submission if student
  useEffect(() => {
    if (!id || !role || (role === "student" && !studentID)) return;

    const fetchAssignment = async () => {
      setLoading(true);

      const { data: assignmentData, error: assignmentError } = await supabase
        .from("assignments")
        .select("title, description, due_date, max_score")
        .eq("id", id)
        .single();

      if (assignmentError || !assignmentData) {
        console.error("Assignment Fetch Error:", assignmentError?.message);
        setLoading(false);
        return;
      }

      const dueDateObj = new Date(assignmentData.due_date);
      const formattedAssignment = {
        ...assignmentData,
        due_date: dueDateObj.toLocaleDateString(),
        raw_due_date: dueDateObj,
      };

      // If student, also fetch submission data
      if (role === "student") {
        const { data: submissionData, error: submissionError } = await supabase
          .from("submissions")
          .select("file_url, submitted_at, grade, is_late")
          .eq("assignment_id", id)
          .eq("student_id", studentID)
          .single();

        if (submissionError && submissionError.code !== "PGRST116") {
          console.error("Submission Fetch Error:", submissionError?.message);
        }

        formattedAssignment.submission = submissionData || null;
        setIsSubmitted(!!submissionData);
        // Determine lateness for students
        if (submissionData) {
          setIsLate(submissionData.is_late); // Use actual value from DB
        } else {
          setIsLate(new Date() > dueDateObj); // No submission yet, check if due date has passed
        }
      }

      setAssignment(formattedAssignment);
      setLoading(false);
    };

    fetchAssignment();
  }, [id, role, studentID]);

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
  };

  const handleSubmit = async () => {
    if (!files.length) return alert("Please upload at least one file.");
    if (!assignment) return alert("Assignment not loaded yet.");

    const dueDate = new Date(assignment.raw_due_date); // Use raw date
    const isLateSubmission = new Date() > dueDate;

    const uploadedFileUrls = [];

    for (const file of files) {
      setLoading(true);
      const fileExt = file.name.split(".").pop();
      const filePath = `assignments/${user.id}/${id}-${Date.now()}.${fileExt}`;

      const { data: storageData, error: uploadError } = await supabase.storage
        .from("submissions")
        .upload(filePath, file);

      if (uploadError) {
        console.error("File upload failed:", uploadError.message);
        alert("File upload failed. Try again.");
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("submissions")
        .getPublicUrl(filePath);

      const fileUrl = publicUrlData?.publicUrl;
      if (fileUrl) uploadedFileUrls.push(fileUrl);
    }

    // Save to submissions table
    const { error: dbError } = await supabase.from("submissions").insert([
      {
        assignment_id: id,
        student_id: user.id,
        file_url:
          uploadedFileUrls.length === 1
            ? uploadedFileUrls[0]
            : uploadedFileUrls,
        is_late: isLateSubmission,
        submitted_at: new Date().toISOString(),
      },
    ]);

    if (dbError) {
      console.error("Submission failed:", dbError.message);
      alert("Submission failed. Please try again.");
    } else {
      setLoading(false);
      setIsSubmitted(true);
      setIsLate(isLateSubmission);
    }
  };

  const handleUnsubmit = async () => {
    const { error } = await supabase
      .from("submissions")
      .delete()
      .eq("assignment_id", id)
      .eq("student_id", user.id);

    if (error) {
      console.error("Unsubmit failed:", error.message);
    } else {
      setIsSubmitted(false);
      setFiles([]);
    }
  };

  const handleShowForm = () => {
    // For teachers: show grading form/modal (to be implemented)
    alert("Marking feature to be implemented.");
  };
  if (loading) return <LoadingSpinner />;
  if (!assignment) return <p className="p-4">No assignment found.</p>;

  return (
    <div className="min-h-screen bg-[#F9FAFB] p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => history.back()}
            className="text-white px-4 py-2 bg-[#4F46E5] hover:bg-[#4338ca] transition duration-300 rounded-sm"
          >
            ← Back
          </button>
        </div>

        <div className="bg-white shadow-xl rounded-lg p-6 border">
          <div className="flex flex-wrap justify-between w-full items-center gap-2">
            <div className="flex gap-2">
              {isSubmitted && (
                <div className="bg-green-100 border border-green-400 text-green-700 rounded-full px-3 py-1 text-sm">
                  ✅ Submitted
                </div>
              )}
              {isLate && (
                <div className="bg-red-100 border border-red-400 text-red-700 rounded-full px-3 py-1 text-sm">
                  Late
                </div>
              )}
            </div>

            {role === "student" && assignment?.submission && (
              <div className="bg-white p-6 shadow-xl rounded-lg border">
                <div>
                  <strong className="text-sm text-gray-500 mb-1">Grade:</strong>{" "}
                  <span className="text-sm font-bold text-[#4F46E5]">
                    {assignment.submission.grade !== null
                      ? `${assignment.submission.grade} / ${assignment.max_score}`
                      : "Not graded yet"}
                  </span>
                </div>
                <div></div>
              </div>
            )}
          </div>

          <h2 className="text-3xl font-bold text-[#1F2937] mb-2">
            {assignment.title}
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Due: {assignment.due_date}
          </p>
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-[#374151] mb-1">
              Description
            </h3>
            <p className="text-gray-700">{assignment.description}</p>
          </div>

          {role === "student" && (
            <div className="mb-6">
              
              {
                !isSubmitted && (
                  <div>
                    <h3 className="text-lg font-semibold text-[#374151] mb-2">
                Upload Files
              </h3>
              <input
            type="file"
            multiple
            onChange={handleFileChange}
            disabled={!!assignment?.submission?.file_url}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-indigo-50 file:text-indigo-700
              hover:file:bg-indigo-100"
          />
                  </div>
                )
              }
              {files.length > 0 && (
                <ul className="mt-3 list-disc list-inside text-sm text-gray-600">
                  {files.map((file, idx) => (
                    <li key={idx}>{file.name}</li>
                  ))}
                </ul>
              )}
              
            </div>
          )}
       {assignment?.submission?.file_url && (
  <div className="mt-4">
    <p className="text-sm text-gray-600">Submitted Files:</p>
    {(() => {
      // Check if it's a single URL string and split it if necessary
      const fileUrls = Array.isArray(assignment.submission.file_url)
        ? assignment.submission.file_url
        : assignment.submission.file_url
            .replace(/["[\]"]/g, "")  // Remove any surrounding brackets or quotes
            .split(',');  // Split the string into individual URLs

      return fileUrls.map((url, idx) => (
        <div key={idx}>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 underline text-sm"
            download
          >
            Download File {idx + 1}
          </a>
        </div>
      ));
    })()}
  </div>
)}


          <div className="flex gap-4">
            {!isSubmitted ? (
              <button
                onClick={handleSubmit}
                className="bg-[#4F46E5] text-white px-4 py-2 rounded hover:bg-[#4338ca] transition"
              >
                Submit Assignment
              </button>
            ) : (
              <button
                onClick={handleUnsubmit}
                className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 transition"
              >
                Unsubmit
              </button>
            )}

            {role === "teacher" && (
              <button
                onClick={handleShowForm}
                className="bg-[#4F46E5] text-white px-4 py-2 rounded hover:bg-[#4338ca] transition"
              >
                Mark
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
