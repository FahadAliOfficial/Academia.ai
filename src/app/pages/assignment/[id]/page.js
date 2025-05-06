"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import useUserSession from "@/app/lib/useUserSession";

export default function CourseDetailPage() {
  const { id } = useParams();
  const { user } = useUserSession({ redirectIfNoSession: false });
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [role, setRole] = useState(null);
  const [studentID, setStudentId] = useState(null);
  const [isLate, setIsLate] = useState(false);


  // const [studentId, setStudentId] = useState(null);

  useEffect(() => {
    if (!user) return;
    const role = user.user_metadata.role;
    setRole(role);
    if (role === "student") {
      setStudentId(user.id);
    }
  }, [user]);

  useEffect(() => {
    if (!id) return;

    const fetchAssignment = async () => {
      const { data: assignmentData, error: assignmentError } = await supabase
        .from("assignments")
        .select("title, description, due_date, max_score")
        .eq("id", id)
        .single();

      if (assignmentError || !assignmentData) {
        alert("Assignment Fetch Error:", assignmentError?.message);
        setLoading(false);
        return;
      }

      const formatedAssignment = {
        ...assignmentData,
        due_date: new Date(assignmentData.due_date).toLocaleDateString(),
      };

      if (role === "student") {
        //fetching submission
        const { data: submissionData, error: submissionError } = await supabase
          .from("submissions")
          .select("file_url, submitted_at, grade, feedback, is_late")
          .eq("id", id)
          .eq("student_id", studentID)
          .single();
        if (submissionError) {
          alert("Assignment fetch Phase 2: Error", submissionError?.message);
          return;
        }
        const mergedData = {
          ...formatedAssignment,
          submission: submissionData || null,
        };
        // setIsLate(mergedData.submission.is_late);
        setIsLate(new Date(assignment.due_date) < new Date());
        setAssignment(mergedData);
        setIsSubmitted(assignmentData.isSubmitted);
        setLoading(false);
        return;
      }

      setAssignment(formatedAssignment);
      setLoading(false);
    };

    fetchAssignment();
  }, [id]);

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
  };
  const handleSubmit = async () => {
    // if (role === "student") {
    // TODO: Upload logic with Supabase Storage or API
    if (!files.length) return alert("Please upload a file.");

    // Example: Upload to Supabase Storage (optional)
    // const file = files[0];
    // const { data: uploadData, error: uploadError } = await supabase.storage
    //   .from("submissions")
    //   .upload(`user-${studentId}/${assignmentId}/${file.name}`, file);

    // if (uploadError) {
    //   console.error("Upload failed:", uploadError.message);
    //   return;
    // }

    // const fileUrl = supabase.storage
    //   .from("submissions")
    //   .getPublicUrl(`user-${studentId}/${assignmentId}/${file.name}`)
    //   .data.publicUrl;

    // Insert into `submissions` table

    setIsLate(assignment.due_date < new Date().toLocaleDateString());
    const { data, error } = await supabase.from("submissions").insert([
      {
        assignment_id: id,
        student_id: user.id,
        file_url: files[0].name, // or fileUrl if using Supabase Storage
        // score: null, // or set to a default value
        is_late: isLate, // or calculate based on due date
        submitted_at: new Date().toISOString(),
      },
    ]);

    if (error) {
      console.error("Submission failed:", error.message);
    } else {
      console.log("Submitted successfully");
      setIsSubmitted(true);
    }
    // } else {
    // console.log("You are not authorized to submit this assignment.");
    // alert("You are not authorized to submit this assignment.");
    // }
  };
  const handleUnsubmit = () => {
    // TODO: Unsubmit logic
    setIsSubmitted(false);
  };

  
  // const handleShowForm = () => {
  //   setShowForm(true);
  // };

  if (loading) return <p className="p-4">Loading assignment...</p>;
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
          <div className="flex justify-between w-full">
            {isSubmitted && (
              <div className="block top-4 right-4 bg-green-100 border border-green-400 text-green-700 rounded-full p-1">
                ✅
              </div>
            )}
            {isLate && (
              <div className="w-15 text-center bg-green-100 border border-red-400 text-red-700 rounded-full p-1">
                Late
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

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-[#374151] mb-2">
              Upload Files
            </h3>
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-indigo-50 file:text-indigo-700
                hover:file:bg-indigo-100"
            />

            {files.length > 0 && (
              <ul className="mt-3 list-disc list-inside text-sm text-gray-600">
                {files.map((file, idx) => (
                  <li key={idx}>{file.name}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex gap-4">
            {!isSubmitted ? (
              <button
                onClick={handleSubmit}
                className="bg-[#4F46E5] cursor-pointer text-white px-4 py-2 rounded hover:bg-[#4338ca] transition"
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
            {role == "teacher" && (
              <button
                onClick={handleShowForm}
                className="cursor-pointer text-white px-4 py-2 bg-[#4F46E5] hover:bg-[#4338ca] transition duration-300 rounded-sm"
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
