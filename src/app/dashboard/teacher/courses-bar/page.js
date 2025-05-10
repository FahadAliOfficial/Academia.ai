"use client";

import { useState, useEffect } from "react";
import { Pencil, Trash2, PlusCircle } from "lucide-react";
import { supabase } from "@/app/lib/supabaseClient";
import CourseCard from "@/app/components/CourseCard"; 
import useUserSession from "@/app/lib/useUserSession";
import { useRouter } from "next/navigation";

export default function CoursesPage() {
    
  const { user } = useUserSession({ redirectIfNoSession: true });
  const [courses, setCourses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [newCourse, setNewCourse] = useState({
    title: "",
    description: "",
    teacher: "",
    thumbnail_url: "",
    status: "draft",
  });
  const [teacherId, setTeacherId] = useState(null);
  const router = useRouter();

  useEffect(() => {
    if (user && user.user_metadata?.role) {
      const role = user.user_metadata.sub;
      if(role){
        setTeacherId(role); 
      }
      else{
        router.back();
      }
    }
  }, [user, router]);


  useEffect(() => {
    const fetchCourses = async () => {
      if (teacherId) {
        const { data, error } = await supabase
          .from("courses")
          .select(
            "id, title, description, thumbnail_url, created_by, created_at, updated_at, status"
          )
          .eq("created_by", teacherId); 

        const { data: teacherData, error: teacherError } = await supabase
          .from("users")
          .select("name")
          .eq("id", teacherId);

        if (error) {
          console.log("Error fetching courses:", error);
        } else if (teacherError) {
          console.log("Error fetching teacher data:", teacherError);
        } else {
          const coursesWithTeacherName = data.map((course) => ({
            ...course,
            teacher: teacherData[0]?.name || "Unknown Teacher",
          }));

          setCourses(coursesWithTeacherName);
        }
      }
    };

    fetchCourses();
  }, [teacherId]);

  const handleDelete = async (id) => {
    const { error } = await supabase.from("courses").delete().eq("id", id);

    if (error) {
      console.log("Error deleting course:", error);
    } else {
      setCourses(courses.filter((course) => course.id !== id));
    }
  };

  const handleEdit = (id) => {
    const course = courses.find((c) => c.id === id);
    setNewCourse(course);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { title, description, teacher, thumbnail_url, status } = newCourse;

    if (!title || !description || !teacher) {
      console.log("All fields are required");
      return;
    }

    if (newCourse.id) {
      // Update course
      const { error } = await supabase
        .from("courses")
        .update({ title, description, thumbnail_url, status })
        .eq("id", newCourse.id);

      if (error) {
        console.log("Error updating course:", error);
      } else {
        setCourses((prev) =>
          prev.map((c) => (c.id === newCourse.id ? newCourse : c))
        );
      }
    } else {
      // Insert new course
      const { error } = await supabase.from("courses").insert([
        {
          title,
          description,
          thumbnail_url,
          status,
          created_by: teacherId,
        },
      ]);

      if (error) {
        console.log("Error inserting course:", error);
      } else {
        setCourses((prev) => [
          ...prev,
          {
            ...newCourse,
            id: Date.now().toString(),
            status,
            created_by: teacherId,
          },
        ]);
      }
    }

    setNewCourse({
      title: "",
      description: "",
      teacher: "",
      thumbnail_url: "",
      status: "draft",
    });
    setShowForm(false);
  };

  return (
    <div className="p-6 bg-[#F9FAFB] min-h-screen overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-[#1F2937]">📚 My Courses</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 text-white bg-[#4F46E5] px-4 py-2 rounded-lg hover:bg-[#4338ca] transition duration-300"
        >
          <PlusCircle size={18} />
          Add Course
        </button>
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
                <div
                  className={`absolute top-4 left-4 px-2 py-1 text-white text-sm rounded-full ${
                    course.status === "published"
                      ? "bg-green-500"
                      : course.status === "draft"
                      ? "bg-yellow-500"
                      : "bg-gray-500"
                  }`}
                >
                  {course.status === "published"
                    ? "Published"
                    : course.status === "draft"
                    ? "Drafted"
                    : "Archived"}
                </div>

                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={() => handleEdit(course.id)}
                    className="text-blue-600 hover:scale-110 transition duration-200"
                  >
                    <Pencil size={20} className="cursor-pointer" />
                  </button>
                  <button
                    onClick={() => handleDelete(course.id)}
                    className="text-red-500 hover:scale-110 transition duration-200"
                  >
                    <Trash2 size={20} className="cursor-pointer" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">You haven't created any courses yet.</p>
        )}
      </section>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form
            onSubmit={handleSubmit}
            className="bg-white p-6 rounded-2xl shadow-lg w-[90%] max-w-md space-y-4"
          >
            <h2 className="text-2xl font-bold text-[#1F2937]">
              {newCourse.id ? "Edit Course" : "Add New Course"}
            </h2>
            <input
              type="text"
              placeholder="Course Title"
              value={newCourse.title}
              onChange={(e) =>
                setNewCourse({ ...newCourse, title: e.target.value })
              }
              className="w-full text-black p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
              required
            />
            <textarea
              placeholder="Description"
              value={newCourse.description}
              onChange={(e) =>
                setNewCourse({ ...newCourse, description: e.target.value })
              }
              className="w-full text-black p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
              required
            />
            <input
              type="text"
              placeholder="Teacher Name"
              value={newCourse.teacher}
              onChange={(e) =>
                setNewCourse({ ...newCourse, teacher: e.target.value })
              }
              className="w-full text-black p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
              required
            />
            <input
              type="text"
              placeholder="Thumbnail URL"
              value={newCourse.thumbnail_url}
              onChange={(e) =>
                setNewCourse({ ...newCourse, thumbnail_url: e.target.value })
              }
              className="w-full p-2 text-black border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
              required
            />
            <select
              value={newCourse.status}
              onChange={(e) =>
                setNewCourse({ ...newCourse, status: e.target.value })
              }
              className="w-full p-2 border text-black border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setNewCourse({
                    title: "",
                    description: "",
                    teacher: "",
                    thumbnail_url: "",
                    status: "draft",
                  });
                }}
                className="text-gray-600 px-4 py-2 cursor-pointer hover:underline transition duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-[#4F46E5] text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-[#4338ca] transition duration-300"
              >
                {newCourse.id ? "Update" : "Add"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
