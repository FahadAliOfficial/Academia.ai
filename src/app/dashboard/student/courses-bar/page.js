"use client";

import { useState, useEffect } from "react";
import { Pencil, Trash2, PlusCircle } from "lucide-react";
import { supabase } from "@/app/lib/supabaseClient"; // Adjust the path to your supabaseClient
import CourseCard from "@/app/components/CourseCard"; // Adjust the path to your CourseCard component
import useUserSession from "@/app/lib/useUserSession";
import { useRouter } from "next/navigation";

export default function CoursesPage() {
    
  const { user } = useUserSession({ redirectIfNoSession: true });
  const [courses, setCourses] = useState([]); // Initialize with an empty array

  const router = useRouter();

  useEffect(() => {
    if (user && user.user_metadata?.role) {
      const role = user.user_metadata.sub;
      if(role){
        role.id
      }
      else{
        router.back(); // Redirect to the previous page if no role is found
      }
    }
  }, [user, router]);


  useEffect(() => {
    // Fetch courses from Supabase when the teacherId is set
    const fetchCourses = async () => {
      if (teacherId) {
        // Fetch courses data
        const { data, error } = await supabase
          .from("courses")
          .select(
            "id, title, description, thumbnail_url, created_by, created_at, updated_at, status"
          )
          .eq("created_by", teacherId); // Filter courses by the teacher's ID

        // Fetch teacher's name
        const { data: teacherData, error: teacherError } = await supabase
          .from("users")
          .select("name")
          .eq("id", teacherId);

        if (error) {
          console.log("Error fetching courses:", error);
        } else if (teacherError) {
          console.log("Error fetching teacher data:", teacherError);
        } else {
          // Merge teacher's name with each course
          const coursesWithTeacherName = data.map((course) => ({
            ...course,
            teacher: teacherData[0]?.name || "Unknown Teacher", // Add the teacher's name to each course
          }));

          // Set the courses with teacher names
          setCourses(coursesWithTeacherName);
        }
      }
    };

    fetchCourses();
  }, [teacherId]); // Run the query whenever the teacherId changes


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

     
    </div>
  );
}
