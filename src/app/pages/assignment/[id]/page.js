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
  const [subUrls, setsubUrls] = useState([]);
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
  const fetchFiles = async () => {
    if (!studentID || !id) return;
    
    const folderPath = `assignments/${id}/${studentID}`;
    const { data: subs, error } = await supabase.storage
      .from("submissions")
      .list(folderPath);
  
    if (error || !subs || subs.length === 0) {
      setsubUrls([]);
      setLoading(false);
      return;
    }
  
    const urls = subs.map(file => {
      const { data } = supabase.storage
        .from("submissions")
        .getPublicUrl(`${folderPath}/${file.name}`);
      return {
        name: file.name,
        url: data.publicUrl,
      };
    });
  
    setsubUrls(urls);
    setLoading(false);
  };
  useEffect(() => {
    fetchFiles(); 
    
  }, [id, studentID]);
  
  // Fetch assignment + submission if student
  const fetchAssignment = async () => {

    if (!id || !role || (role === "student" && !studentID)) return;

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

      // Get the file URL from assignment submission

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
  }
  useEffect(() => {
    fetchAssignment();
  }, [id, role, studentID]);

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
  };

  const handleSubmit = async () => {
    
    if (!files.length && !subUrls) return alert("Please upload at least one file.");
    if (!assignment) return alert("Assignment not loaded yet.");

    const dueDate = new Date(assignment.raw_due_date); // Use raw date
    const isLateSubmission = new Date() > dueDate;

    const uploadedFileUrls = [];
    const existingFileUrls = assignment.submission?.file_url
      ? Array.isArray(assignment.submission.file_url)
        ? assignment.submission.file_url
        : assignment.submission.file_url.replace(/["[\]"]/g, "").split(",")
      : [];

    for (const file of files) {
      // Check if the file already exists in the existing submission
      const fileExists = existingFileUrls.some((url) => {
        const fileName = file.name.split(".")[0];
        const existingFileName = url
          .split("/storage/v1/object/public/")[1]
          ?.split("-")[0];
        return existingFileName === fileName;
      });

      if (fileExists) {
        continue; // Skip uploading this file if it already exists
      }

      setLoading(true);
      const fileExt = file.name.split(".").pop();
      const baseName =
        file.name.substring(0, file.name.lastIndexOf(".")) || "file";
      const filePath = `assignments/${id}/${studentID}/${baseName}.${fileExt}`;

      const { data: storageData, error: uploadError } = await supabase.storage
        .from("submissions")
        .upload(filePath, file);
      if(uploadError?.message.includes("already exists")){
        alert("This file has already upload!");
        setLoading(false);
        return;
      }
      if (uploadError) {
        console.error("File upload failed:", uploadError.message);
        // alert("File upload failed. Try again.");
        return;
      }

      // if (assignment?.submission?.file_url !== filePath) {
      //   const { data: publicUrlData } = supabase.storage
      //     .from("submissions")
      //     .getPublicUrl(filePath);
      //   const fileUrl = publicUrlData?.publicUrl;
      //   if (fileUrl) uploadedFileUrls.push(fileUrl);
      // } else {
      //   return;
      // }
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
      fetchFiles();
      setIsLate(isLateSubmission);
    }
  };

  // const handleUnsubmit = async () => {
  //   const { error } = await supabase
  //     .from("submissions")
  //     .delete()
  //     .eq("assignment_id", id)
  //     .eq("student_id", user.id);

  //   if (error) {
  //     console.error("Unsubmit failed:", error.message);
  //   } else {
  //     setIsSubmitted(false);
  //     setFiles([]);
  //   }
  // };
  const handleUnsubmit = async () => {
    // Delete submission entry from the database
    // const { data: submissionData, error: submissionError } = await supabase
    //   .from("submissions")
    //   .select("file_url")
    //   .eq("assignment_id", id)
    //   .eq("student_id", user.id)
    //   .single();

    // if (submissionError) {
    //   console.error("Unsubmit failed:", submissionError.message);
    //   return;
    // }

    // Delete the submission record from the database
    const { error } = await supabase
      .from("submissions")
      .delete()
      .eq("assignment_id", id)
      .eq("student_id", user.id);

    if (error) {
      console.error("Unsubmit failed:", error.message);
    } else {
      setIsSubmitted(false);
      // setFiles([]); // Clear selected files
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
              {!isSubmitted && (
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
              )}
              {files.length > 0 && (
                <ul className="mt-3 list-disc list-inside text-sm text-gray-600">
                  {files.map((file, idx) => (
                    <li key={idx}>{file.name}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {(
             <div className="my-5">
             <p className="text-sm text-gray-600">Submitted Files:</p>
             {subUrls.map((file, idx) => (
               <div key={idx} className="flex justify-between items-center">
                 <a
                   href={file.url}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="text-indigo-600 underline text-sm"
                   download
                 >
                   {file.name}
                 </a>
                 <button
                   onClick={async () => {
                     if (isSubmitted) {
                       alert("Unsubmit First.");
                       return;
                     }
       
                     const filePath = `assignments/${id}/${studentID}/${file.name}`;
                     const { error } = await supabase.storage
                       .from("submissions")
                       .remove([filePath]);
       
                     if (error) {
                       console.error("File delete failed:", error.message);
                       alert("Failed to delete file.");
                     } else {
                       // Refresh file list
                       setFiles(prev => prev.filter(f => f.name !== file.name));
                       fetchFiles();
                     }
                   }}
                   className="text-red-600 text-lg"
                 >
                   ❌
                 </button>
               </div>
             ))}
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
