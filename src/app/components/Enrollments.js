import React, { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import useUserSession from "../lib/useUserSession";

const Enrollments = ({ id }) => {
  const { user } = useUserSession({ redirectIfNoSession: true });
  const [enrollments, setEnrollments] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null);

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
      .select(`
        id,
        enrolled_at,
        courses (id, title),
        users (id, name)
      `)
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
        .select(`
          id,
          requested_at,
          students:student_id (id, name),
          courses:course_id (id, created_by, title)
        `)
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
  };

  return (
    <div className="p-6 bg-white shadow-md rounded-xl">
      <h2 className="text-xl font-semibold mb-4 text-[#4F46E5]">Enrollments</h2>

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
      )}
    </div>
  );
};

export default Enrollments;
