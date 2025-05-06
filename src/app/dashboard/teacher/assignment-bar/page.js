// "use client";

// import { useState, useEffect } from "react";
// import { Pencil, Trash2, PlusCircle } from "lucide-react";
// import CourseCard from "@/app/components/CourseCard"; // Adjust the path to your CourseCard component
// import useUserSession from "@/app/lib/useUserSession";
// import { useRouter } from "next/navigation";
// export default function AssignmentDashboardPage() {
    
//   const { user, loading } = useUserSession({ redirectIfNoSession: true });
//   const [teacherId, setTeacherId] = useState(null); // Store teacher's ID
//   const router = useRouter();

//   useEffect(() => {
    //     if (user && user.user_metadata?.role) {
//       const role = user.user_metadata.sub;
//       if(role){
//         setTeacherId(role); // Set teacherId based on user metadata
//       }
//       else{
//         router.back(); // Redirect to the previous page if no role is found
//       }
//     }
//   }, [user, router]);

// }
// pages/dashboard/teacher.js

    // const { count, error } = await supabase
    // .from('assignments')
    // .select('*', { count: 'exact', head: true });
    // alert(count);
"use client";
import { supabase } from "@/app/lib/supabaseClient"; // Adjust the path to your supabaseClient
import Link from "next/link";
import { useState, useEffect } from "react";

export default function TeacherDashboard() {
  const [coursesData, setCoursesData] = useState([]);
  const [totalAssignments, setTotalAssignments] = useState(0);
  const [totalSubmissions, setTotalSubmissions] = useState(0);
  const [totalStudents, setTotalStudents] = useState(0);

  useEffect(() => {
    const fetchCourseDetails = async () => {
      // Get all courses
      const { data: courses, error: coursesError } = await supabase
        .from('courses')
        .select('id, title');

      if (coursesError) {
        console.error('Error fetching courses:', coursesError);
        return;
      }

      const courseDetailsPromises = courses.map(async (course) => {
        // Get assignments for the course
        const { data: assignmentsData, error: assignmentsError } = await supabase
          .from('assignments')
          .select('id, title, due_date')
          .eq('course_id', course.id);

        if (assignmentsError) {
          console.error('Error fetching assignments for course:', assignmentsError);
          return;
        }

        // Get number of users enrolled in the course
        const { data: enrollments, error: enrollmentsError } = await supabase
          .from('enrollments')
          .select('user_id')
          .eq('course_id', course.id);

        if (enrollmentsError) {
          console.error('Error fetching enrollments for course:', enrollmentsError);
          return;
        }

        const enrolledUsers = enrollments.length;

        // Get total submissions for each assignment and track submissions per student
        let totalSubmissionsCount = 0;
        for (const assignment of assignmentsData) {
          const { data: submissions, error: submissionsError } = await supabase
            .from('submissions')
            .select('id, student_id')
            .eq('assignment_id', assignment.id);

          if (submissionsError) {
            console.error('Error fetching submissions for assignment:', submissionsError);
            return;
          }

          // Count submissions per student
          const submissionCount = submissions.length;
          totalSubmissionsCount += submissionCount;

          // Add submissions data to the assignment
          assignment.submissions = submissionCount;
          assignment.total = enrolledUsers;
        }

        return {
          course,
          assignments: assignmentsData,
          totalAssignments: assignmentsData.length,
          totalSubmissions: totalSubmissionsCount,
          totalStudents: enrolledUsers,
        };
      });

      const allCourseDetails = await Promise.all(courseDetailsPromises);
      setCoursesData(allCourseDetails);

      // Aggregating totals for all courses
      const combinedAssignments = allCourseDetails.reduce((acc, courseData) => acc + courseData.totalAssignments, 0);
      const combinedSubmissions = allCourseDetails.reduce((acc, courseData) => acc + courseData.totalSubmissions, 0);
      const combinedStudents = allCourseDetails.reduce((acc, courseData) => acc + courseData.totalStudents, 0);

      setTotalAssignments(combinedAssignments);
      setTotalSubmissions(combinedSubmissions);
      setTotalStudents(combinedStudents);
    };

    fetchCourseDetails();
  }, []);   

  return (
    <div className="min-h-screen bg-[#F9FAFB] p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-[#1F2937] mb-6">
          Assignment Dashboard
        </h1>

        {/* Combined Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white p-6 shadow-xl rounded-lg border">
            <p className="text-sm text-gray-500 mb-1">Total Assignments</p>
            <p className="text-2xl font-bold text-[#4F46E5]">{totalAssignments}</p>
          </div>
          <div className="bg-white p-6 shadow-xl rounded-lg border">
            <p className="text-sm text-gray-500 mb-1">Total Submissions</p>
            <p className="text-2xl font-bold text-[#4F46E5]">{totalSubmissions}</p>
          </div>
          <div className="bg-white p-6 shadow-xl rounded-lg border">
            <p className="text-sm text-gray-500 mb-1">Total Students</p>
            <p className="text-2xl font-bold text-[#4F46E5]">{totalStudents}</p>
          </div>
        </div>

        {/* Recent Assignments Section */}
        <div className="bg-white shadow-xl rounded-lg p-6 border">
          <h3 className="text-xl font-semibold text-[#1F2937] mb-4">Recent Assignments</h3>
          <table className="min-w-full text-sm">
            <thead className="text-gray-600 border-b">
              <tr>
                <th className="py-2 text-left">Course Title</th>
                <th className="py-2 text-left">Assignment Title</th>
                <th className="py-2 text-left">Due Date</th>
                <th className="py-2 text-left">Submitted</th>
                <th className="py-2 text-left">Total</th>
                <th className="py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>

              {coursesData.flatMap((courseData) =>
                courseData.assignments.map((a) => (
                  <tr key={a.id} className="border-t hover:bg-gray-50">
                    <td className="py-2 font-medium text-[#374151]">{courseData.course.title}</td>
                    <td className="py-2 font-medium text-[#374151]">{a.title}</td>
                    <td className="py-2 text-gray-600">{a.due_date}</td>
                    <td className="py-2 text-gray-700">{a.submissions}</td>
                    <td className="py-2 text-gray-700">{a.total}</td>
                    <td className="py-2">
                    <Link
        href={`../../../pages/assignment/submissionList/${a.id}`}
        >
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
