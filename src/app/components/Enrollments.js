import React, { useRef, useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import useUserSession from "@/app/lib/useUserSession";

const Enrollments = ({ id }) => {
  const { user } = useUserSession({ redirectIfNoSession: true });
  const [enrollments, setEnrollments] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null);
  const [file, setFile] = useState(null); // ✅ File upload state
  const [vectorModalOpen, setVectorModalOpen] = useState(false);
  const [vectorStatus, setVectorStatus] = useState("loading"); // 'loading', 'success', 'error'
  const [vectorMessage, setVectorMessage] = useState("Starting upload...");
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user && user.user_metadata?.role) {
      setRole(user.user_metadata.role.toLowerCase());
    }
  }, [user]);

  const fetchData = async () => {
    if (!id || !user) return;
    setLoading(true);

    // ✅ Fetch enrolled students
    const { data: enrolledData, error: enrolledError } = await supabase
      .from("enrollments")
      .select(
        `
        id,
        enrolled_at,
        courses (id, title),
        users (id, name)
      `
      )
      .eq("course_id", id);

    if (enrolledError) {
      console.error("Error fetching enrollments:", enrolledError);
    } else {
      const formatted = enrolledData.map((item) => ({
        id: item.id,
        enrolled_at: new Date(item.enrolled_at).toLocaleDateString(),
        course_title: item.courses?.title || "Unknown Course",
        user_name: item.users?.name || "Unknown User",
      }));
      setEnrollments(formatted);
    }

    // ✅ Fetch requests (only if teacher)
    if (role === "teacher") {
      const { data: requestData, error: requestError } = await supabase
        .from("enrollment_requests")
        .select(
          `
          id,
          requested_at,
          students:student_id (id, name),
          courses:course_id (id, created_by, title)
        `
        )
        .eq("course_id", id)
        .eq("status", "pending");

      if (requestError) {
        console.error("Error fetching requests:", requestError);
      } else {
        const filtered = requestData.filter(
          (r) => r.courses.created_by === user.id
        );
        const formattedRequests = filtered.map((item) => ({
          id: item.id,
          requested_at: new Date(item.requested_at).toLocaleDateString(),
          student_id: item.students.id,
          student_name: item.students.name,
          course_title: item.courses.title,
        }));
        setRequests(formattedRequests);
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    if (role && id) {
      fetchData();
    }
  }, [id, role, user]);

  const deleteEnrollment = async (enrollmentId) => {
    const { error } = await supabase
      .from("enrollments")
      .delete()
      .eq("id", enrollmentId);
    if (error) {
      alert("Failed to delete enrollment.");
      console.error("Delete error:", error);
    } else {
      setEnrollments((prev) => prev.filter((e) => e.id !== enrollmentId));
    }
  };

  const acceptRequest = async (requestId, studentId) => {
    const { error: enrollError } = await supabase.from("enrollments").insert([
      {
        user_id: studentId,
        course_id: id,
      },
    ]);

    if (!enrollError) {
      const { error: deleteError } = await supabase
        .from("enrollment_requests")
        .delete()
        .eq("id", requestId);

      if (deleteError) {
        console.error("Error deleting request:", deleteError);
        return;
      }

      fetchData(); // refresh UI
    } else {
      console.error("Error accepting request:", enrollError);
    }
  };

  const rejectRequest = async (requestId) => {
    const { error } = await supabase
      .from("enrollment_requests")
      .delete()
      .eq("id", requestId);

    if (!error) {
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } else {
      console.error("Error rejecting request:", error);
    }
  }; //  ✅ File upload logic
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];

    if (selectedFile) {
      // Check file type
      const validTypes = [".csv", ".xlsx", ".xls"];
      const fileExtension = selectedFile.name
        .substring(selectedFile.name.lastIndexOf("."))
        .toLowerCase();

      if (!validTypes.includes(fileExtension)) {
        alert("Please select a valid CSV or Excel file");
        e.target.value = "";
        return;
      }

      // Check file size (limit to 5MB)
      if (selectedFile.size > 5 * 1024 * 1024) {
        alert("File is too large. Maximum size is 5MB.");
        e.target.value = "";
        return;
      }
    }

    setFile(selectedFile);
  };
  const handleFileUpload = async () => {
    if (!file) {
      alert("Please select a file first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("course_id", id);

    // Open modal and show loading
    setVectorModalOpen(true);
    setVectorStatus("loading");
    setVectorMessage("Uploading and registering students...");

    try {
      const response = await fetch("http://127.0.0.1:5000/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (response.ok) {
        // Process results to create a summary
        const newUsers = result.results.filter((r) =>
          r.status.includes("new user")
        ).length;
        const existingUsers = result.results.filter((r) =>
          r.status.includes("existing user")
        ).length;
        const skippedUsers = result.results.filter((r) =>
          r.status.includes("already enrolled")
        ).length;
        const errorUsers = result.results.filter((r) =>
          r.status.includes("error")
        ).length;

        const summary = `
          Registration complete:
          • ${newUsers} new students created and enrolled
          • ${existingUsers} existing students enrolled
          • ${skippedUsers} students skipped (already enrolled)
          ${errorUsers > 0 ? `• ${errorUsers} errors occurred` : ""}
        `;

        setVectorStatus("success");
        setVectorMessage(summary);

        setFile(null); // Clear state
        fileInputRef.current.value = ""; // Clear input field
        fetchData();
      } else {
        setVectorStatus("error");
        setVectorMessage(result.error || "Upload failed.");
      }
    } catch (error) {
      console.error("File upload error:", error);
      setVectorStatus("error");
      setVectorMessage("Something went wrong. Please try again.");
    }
  };
  return (
    <div className="p-6 bg-white shadow-md rounded-xl">
      <h2 className="text-xl font-semibold mb-4 text-[#4F46E5]">Enrollments</h2>
      {/* ✅ File Upload Section */}
      {role === "teacher" && (
        <div className="mb-6 space-y-4">
          <label
            htmlFor="fileUpload"
            className="block text-sm font-medium text-gray-700"
          >
            Upload Students File (CSV or Excel)
          </label>{" "}
          <div className="space-y-2">
            <input
              id="fileUpload"
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv, .xlsx, .xls"
              className="block w-full text-sm text-gray-700 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <div className="text-xs text-gray-500">
              File should have columns: STUDENT-ID, NAME, EMAIL
            </div>
          </div>
          <button
            onClick={handleFileUpload}
            className="inline-flex items-center gap-2 bg-blue-600 text-white font-medium px-4 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12v9m0 0l-3-3m3 3l3-3m0-12a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
            Upload File
          </button>
        </div>
      )}
      {loading ? (
        <p className="text-[#4F46E5]">Loading data...</p>
      ) : (
        <>
          {/* ✅ Enrolled Students */}
          <h3 className="text-lg font-medium mb-2 text-black">
            Enrolled Students
          </h3>
          {enrollments.length === 0 ? (
            <p className="text-[#4F46E5]">No students enrolled yet.</p>
          ) : (
            <table className="w-full mb-6 text-left border border-gray-200 rounded-lg">
              <thead>
                <tr className="bg-gray-100 text-gray-700">
                  <th className="p-3">Student</th>
                  <th className="p-3">Course</th>
                  <th className="p-3">Enrolled At</th>
                  {role === "teacher" && <th className="p-3">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {enrollments.map((e) => (
                  <tr key={e.id} className="border-t border-black text-black">
                    <td className="p-3">{e.user_name}</td>
                    <td className="p-3">{e.course_title}</td>
                    <td className="p-3">{e.enrolled_at}</td>
                    {role === "teacher" && (
                      <td className="p-3">
                        <button
                          onClick={() => deleteEnrollment(e.id)}
                          className="text-white bg-red-500 hover:bg-red-600 cursor-pointer px-3 py-1 rounded-md"
                        >
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* ✅ Enrollment Requests */}
          {role === "teacher" && (
            <>
              <h3 className="text-lg font-medium mb-2 text-black">
                Enrollment Requests
              </h3>
              {requests.length === 0 ? (
                <p className="text-[#4F46E5]">No pending requests.</p>
              ) : (
                <table className="w-full text-left border border-gray-200 rounded-lg">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700">
                      <th className="p-3">Student</th>
                      <th className="p-3">Course</th>
                      <th className="p-3">Requested At</th>
                      <th className="p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((r) => (
                      <tr
                        key={r.id}
                        className="border-t border-black text-black"
                      >
                        <td className="p-3">{r.student_name}</td>
                        <td className="p-3">{r.course_title}</td>
                        <td className="p-3">{r.requested_at}</td>
                        <td className="p-3 space-x-2">
                          <button
                            onClick={() => acceptRequest(r.id, r.student_id)}
                            className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 cursor-pointer"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => rejectRequest(r.id)}
                            className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 cursor-pointer"
                          >
                            Reject
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </>
      )}{" "}
      {role === "teacher" && vectorModalOpen && (
        <div className="fixed inset-0 bg-white/30 backdrop-blur-md transition-opacity duration-300 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-[90%] max-w-md text-center shadow-2xl space-y-4 animate-fadeIn">
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
                <div
                  className={`${
                    vectorStatus === "success"
                      ? "text-green-600"
                      : "text-red-500"
                  }`}
                >
                  <h3 className="text-xl font-semibold mb-4">
                    {vectorStatus === "success"
                      ? "Upload Complete"
                      : "Upload Failed"}
                  </h3>
                  <div className="whitespace-pre-line text-left text-gray-700">
                    {vectorMessage}
                  </div>
                </div>
                <button
                  className="bg-[#4F46E5] text-white mt-4 px-4 py-2 rounded hover:bg-[#4338ca]"
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

export default Enrollments;
