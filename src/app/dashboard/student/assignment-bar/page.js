"use client";
import { supabase } from "@/app/lib/supabaseClient"; // Adjust the path to your supabaseClient
import { useState, useEffect } from "react";
import useUserSession from "@/app/lib/useUserSession";
import { useRouter } from "next/navigation";
import Link from "next/link";
export default function StudentDashboard() {
  const { user } = useUserSession({ redirectIfNoSession: true });

  const [studentData, setStudentData] = useState([]);
  const [totalAssignments, setTotalAssignments] = useState(0);
  const [totalPendingAssignments, setTotalPendingAssignments] = useState(0);
  const [totalCourses, setTotalCourses] = useState(0);
  const router = useRouter();

  // Assuming the user session is handled and user is already authenticated
  const [userId, setuserID] = useState();
  useEffect(() => {
    if (user && user.id) {
      setuserID(user.id);
    }
  }, [user]);

  useEffect(() => {
    if (!userId) return;
    const fetchStudentAssignments = async () => {
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from("enrollments")
        .select("course_id")
        .eq("user_id", userId);
    
      if (enrollmentsError) {
        console.error("Error fetching enrollments:", enrollmentsError);
        return;
      }
    
      // Set total courses based on enrollment length
      setTotalCourses(enrollments.length);
      
      const courseDetailsPromises = enrollments.map(async (enrollment) => {
        const { data: assignmentsData, error: assignmentsError } = await supabase
          .from("assignments")
          .select("id, title, due_date")
          .eq("course_id", enrollment.course_id);
        if (assignmentsError || !assignmentsData) {
          console.error("Error fetching assignments for course:", assignmentsError);
          return null; // Skip this course
        }
    
        const assignmentsWithStatus = await Promise.all(
          assignmentsData.map(async (assignment) => {
            const { data: submission, error: submissionError } = await supabase
              .from("submissions")
              .select("id, grade, feedback")
              .eq("assignment_id", assignment.id)
              .eq("student_id", userId);
    
            if (submissionError) {
              console.error("Error fetching submission for assignment:", submissionError);
              return null;
            }
    
            const submissionStatus = submission?.length > 0 ? submission[0] : null;
    
            return {
              ...assignment,
              submission: submissionStatus,
            };
          })
        );
    
        const validAssignments = assignmentsWithStatus.filter(Boolean);
    
        let pendingAssignmentsCount = 0;
        let completedAssignmentsCount = 0;
    
        validAssignments.forEach((assignment) => {
          if (assignment.submission) {
            completedAssignmentsCount++;
          } else {
            pendingAssignmentsCount++;
          }
        });
    
        return {
          course_id: enrollment.course_id,
          assignments: validAssignments,
          totalAssignments: validAssignments.length,
          pendingAssignments: pendingAssignmentsCount,
          completedAssignments: completedAssignmentsCount,
        };
      });
    
      const allCourseDetails = (await Promise.all(courseDetailsPromises)).filter(Boolean); // Filter out nulls
    
      setStudentData(allCourseDetails);
    
      const combinedAssignments = allCourseDetails.reduce(
        (acc, courseData) => acc + courseData.totalAssignments,
        0
      );
      const combinedPendingAssignments = allCourseDetails.reduce(
        (acc, courseData) => acc + courseData.pendingAssignments,
        0
      );
    
      setTotalAssignments(combinedAssignments);
      setTotalPendingAssignments(combinedPendingAssignments);
    };

    fetchStudentAssignments();
  }, [userId]);

  return (
    <div className="min-h-screen bg-[#F9FAFB] p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-[#1F2937] mb-6">
          Student Dashboard
        </h1>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white p-6 shadow-xl rounded-lg border">
            <p className="text-sm text-gray-500 mb-1">Total Assignments</p>
            <p className="text-2xl font-bold text-[#4F46E5]">
              {totalAssignments}
            </p>
          </div>
          <div className="bg-white p-6 shadow-xl rounded-lg border">
            <p className="text-sm text-gray-500 mb-1">Pending Assignments</p>
            <p className="text-2xl font-bold text-[#4F46E5]">
              {totalPendingAssignments}
            </p>
          </div>
          <div className="bg-white p-6 shadow-xl rounded-lg border">
            <p className="text-sm text-gray-500 mb-1">Total Courses</p>
            <p className="text-2xl font-bold text-[#4F46E5]">{totalCourses}</p>
          </div>
        </div>

        {/* Assignments Section */}
        <div className="bg-white shadow-xl rounded-lg p-6 border">
          <h3 className="text-xl font-semibold text-[#1F2937] mb-4">
            Assignments
          </h3>
          <table className="min-w-full text-sm">
            <thead className="text-gray-600 border-b">
              <tr>
                <th className="py-2 text-left">Assignment Title</th>
                <th className="py-2 text-left">Due Date</th>
                <th className="py-2 text-left">Grade</th>
                <th className="py-2 text-left">Feedback</th>
                <th className="py-2 text-left">Status</th>
                <th className="py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {studentData.flatMap((courseData) =>
                courseData.assignments.map((assignment) => (
                  <tr key={assignment.id} className="border-t hover:bg-gray-50">
                    <td className="py-2 font-medium text-[#374151]">
                      {assignment.title}
                    </td>
                    <td className="py-2 text-gray-600">
                      {assignment.due_date}
                    </td>
                    <td className="py-2 text-gray-700">
                      {assignment.submission?.grade || "Not Graded"}
                    </td>
                    <td className="py-2 text-gray-700" suppressHydrationWarning>
                      {assignment.submission?.feedback?.trim()
                        ? assignment.submission.feedback.length > 30
                          ? assignment.submission.feedback.slice(0, 30) + "..."
                          : assignment.submission.feedback
                        : "—"}
                    </td>

                    <td className="py-2 text-gray-700">
                      {assignment.submission ? "Submitted" : "Pending"}
                    </td>
                    <td className="py-2">
                      <Link href={`../../../pages/assignment/${assignment.id}`}>
                        <button className="text-sm text-white bg-[#4F46E5] px-3 py-1 rounded hover:bg-[#4338ca]">
                          View
                        </button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
