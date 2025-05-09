"use client";

import { useState, useEffect } from "react";
import { Pencil, Trash2, PlusCircle } from "lucide-react";
import { supabase } from "@/app/lib/supabaseClient"; // Adjust the path to your supabaseClient
import CourseCard from "@/app/components/CourseCard"; // Adjust the path to your CourseCard component
import useUserSession from "@/app/lib/useUserSession";
import { useRouter } from "next/navigation";
import LoadingSpinner from "@/app/components/LoadingSpinner";
<time datetime="2016-10-25" suppressHydrationWarning />;

export default function CoursesPage() {
  const { user } = useUserSession({ redirectIfNoSession: true });
  const [courses, setCourses] = useState([]); // Initialize with an empty array
  const [userID, setuserID] = useState([]);
  const [allCourse, setAllCourses] = useState([]);
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  useEffect(() => {
    if (user && user.id) {
        setuserID(user.id);
    }
  }, [user]);

  const [enrollmentRequests, setEnrollmentRequests] = useState([]);

  // And fetch them (example logic)
  useEffect(() => {
    if(!userID) return;
    const fetchRequests = async () => {
      if (!userID) return console.log("No user!");

      setLoading(true);

      const { data, error } = await supabase
        .from("enrollment_requests") // adjust the table name
        .select("course_id")
        .eq("student_id", userID);
        setLoading(false);
      if (!data || data.length === 0) {
          console.log("No enrollment requests found.");
          return;
       }
      if (error) {
        console.error("Error fetching enrollment requests:", error.message|| error);
        return;
      }

      setEnrollmentRequests(data.map((req) => req.course_id));
    };

    fetchRequests();
  }, [userID]);

  useEffect(() => {
    if(!userID) return;

    const fetchCourses = async () => {
      if (!userID || typeof userID !== "string" || userID.trim() === "") return;
      setLoading(true);
      // Fetch all courses first
      const { data: allCourses, error: allCoursesError } = await supabase
        .from("courses")
        .select(
          "title, description, thumbnail_url, created_by, created_at, updated_at, id"
        )
        .eq("status", "published");
  
      if (allCoursesError) {
        console.error("Error fetching all courses:", allCoursesError);
        return;
      }
  
      // Fetch the enrolled courses for the current user
      const { data: enrollments, error: enrollmentError } = await supabase
        .from("enrollments")
        .select("course_id")
        .eq("user_id", userID);
  
      if (enrollmentError) {
        console.error("Error fetching enrollments:", enrollmentError);
        return;
      }
  
      const courseIDs = enrollments.map((e) => e.course_id);
  
      // Split all courses into enrolled and unenrolled
      const enrolledCourses = allCourses.filter((course) =>
        courseIDs.includes(course.id)
      );
      const unenrolledCourses = allCourses.filter(
        (course) => !courseIDs.includes(course.id)
      );
  
      // Get teacher names for both enrolled and unenrolled courses
      const teacherIDs = [
        ...new Set(allCourses.map((course) => course.created_by)),
      ];
  
      const { data: teacherProfiles, error: teacherError } = await supabase
        .from("users")
        .select("id, name")
        .in("id", teacherIDs);
  
      if (teacherError) {
        console.error("Error fetching teachers:", teacherError);
        return;
      }
  
      // Merge teacher data with courses
      const mergeTeacherData = (courses) => {
        return courses.map((course) => {
          const teacherName =
            teacherProfiles.find((t) => t.id === course.created_by)?.name ||
            "Unknown Instructor";
          return {
            ...course,
            teacher: teacherName,
          };
        });
      };
  
      // Set both the enrolled and unenrolled courses
      setCourses(mergeTeacherData(enrolledCourses));
      setAllCourses(mergeTeacherData(unenrolledCourses));
      setLoading(false);
    };
  
    fetchCourses();
  }, [userID]);
  
  const handleRequestEnrollment = async (courseId) => {
    const { error } = await supabase
      .from("enrollment_requests")
      .insert([{ student_id: userID, course_id: courseId }]);

    if (error) {
      console.error("Error requesting enrollment:", error);
      return;
    }

    setEnrollmentRequests([...enrollmentRequests, courseId]);
  };

  const handleDeleteRequest = async (courseId) => {
    const { error } = await supabase
      .from("enrollment_requests")
      .delete()
      .eq("student_id", userID)
      .eq("course_id", courseId);

    if (error) {
      console.error("Error removing enrollment request:", error);
      return;
    }

    setEnrollmentRequests(enrollmentRequests.filter((id) => id !== courseId));
  };

  if(loading) return <LoadingSpinner />

  return (
    <div className="p-6 bg-[#F9FAFB] min-h-screen overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-[#1F2937]">📚 My Courses</h1>
      </div>

      {/* Search Bar
<div className="mb-6">
        <input
          type="text"
          value={searchQuery}
          // onChange={handleSearchChange}
          placeholder="Search by course title"
          className="w-full p-3 border text-black border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
        />
      </div> */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-[#4F46E5] mb-3">
          My Courses
        </h2>
        {courses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <div
                key={course.id}
                className="relative group bg-white shadow-lg rounded-lg overflow-hidden"
              >
                <CourseCard course={course} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">You haven't Enrolled any courses yet.</p>
        )}
      </section>
      <hr />

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-[#4F46E5] mb-3">
          More Courses
        </h2>
        {allCourse.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allCourse.map((course) => {
              const requested = enrollmentRequests.includes(course.id);
              return (
                <div
                  key={course.id}
                  className="relative group bg-white shadow-lg rounded-lg overflow-hidden"
                >
                  <CourseCard course={course} />
                  <div className="absolute inset-0 bg-black bg-opacity-30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    {!requested ? (
                      <button
                        onClick={() => handleRequestEnrollment(course.id)}
                        className="bg-[#4F46E5] text-white px-4 py-2 rounded hover:bg-[#4338ca]"
                      >
                        Request Enrollment
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDeleteRequest(course.id)}
                        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                      >
                        Remove Request
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500">No other courses available.</p>
        )}
      </section>
    </div>
  );
}
