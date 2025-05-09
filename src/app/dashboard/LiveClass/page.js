'use client';
import React, { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import { PlusCircle, Trash2 } from "lucide-react";
import useUserSession from "@/app/lib/useUserSession";
import LoadingSpinner from "@/app/components/LoadingSpinner";
import LiveClassCard from "@/app/components/LiveClassCard";

const LiveClasses = () => {
  const { user } = useUserSession({ redirectIfNoSession: false });
  const [liveClasses, setLiveClasses] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [courses, setCourses] = useState([]);
  const [newClass, setNewClass] = useState({
    title: "",
    course_id: "",
    scheduled_at: "",
    meeting_link: "",
    is_active: true,
  });

  useEffect(() => {
    if (user && user.user_metadata?.role) {
      setUserRole(user.user_metadata.role.toLowerCase());
          setLoading(false); 

    }
  }, [user]);

useEffect(() => {
  if (!userRole || !user) return;

  const fetchLiveClasses = async () => {
    setLoading(true);

    if (userRole === "teacher") {
      const { data, error } = await supabase
        .from("live_classes")
        .select("*");
      if (!error) setLiveClasses(data);
    } else {
      // For students: get enrolled course_ids
      const { data: enrollments, error: enrollmentError } = await supabase
        .from("enrollments")
        .select("course_id")
        .eq("user_id", user.id);

      if (!enrollmentError && enrollments.length > 0) {
        const courseIds = enrollments.map((e) => e.course_id);

        const { data: classes, error: classError } = await supabase
          .from("live_classes")
          .select("*")
          .in("course_id", courseIds);

        if (!classError) setLiveClasses(classes);
      }
    }

    setLoading(false);
  };

  fetchLiveClasses();
}, [userRole, user]);


  useEffect(() => {
    const fetchCourses = async () => {
      const { data, error } = await supabase.from("courses").select("*");
      if (!error) setCourses(data);
    };

    fetchCourses();
  }, []);

  const handleDelete = async (id) => {
    const { error } = await supabase.from("live_classes").delete().eq("id", id);
    if (!error) {
      setLiveClasses((prev) => prev.filter((cls) => cls.id !== id));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { title, course_id, scheduled_at, meeting_link, is_active } = newClass;

    if (!title || !course_id || !scheduled_at || !meeting_link) return;

    // Add teacher_id based on the logged-in user
    const { data, error } = await supabase
      .from("live_classes")
      .insert([
        {
          title,
          course_id,
          teacher_id: user.id,  
          scheduled_at,
          meeting_link,
          is_active,
        },
      ])
      .select();

    if (!error && data) {
      setLiveClasses((prev) => [...prev, data[0]]);
      setNewClass({
        title: "",
        course_id: "",
        scheduled_at: "",
        meeting_link: "",
        is_active: true,
      });
      setShowForm(false);
    } else {
      console.error("Error creating live class:", error);
    }
  };
if (loading) return <LoadingSpinner />;
  return (
    <div className="min-h-screen bg-white shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-[#4F46E5]">Live Classes</h2>
        {userRole === "teacher" && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-[#4F46E5] text-white px-4 py-2 rounded hover:bg-[#4338ca] transition"
          >
            <PlusCircle size={20} />
            Schedule Class
          </button>
        )}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : liveClasses.length === 0 ? (
        <p className="text-[#4F46E5]">No live classes scheduled yet.</p>
      ) : (
        <div className="space-y-4">
          {liveClasses
            .filter((cls) => userRole !== "student" || cls.is_active)
            .map((cls) => (
              <div
                key={cls.id}
                className="relative group border border-gray-200 p-4 rounded-lg shadow-sm hover:shadow-md transition"
              >
                <LiveClassCard liveClass={cls} />
                {userRole === "teacher" && (
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={() => handleDelete(cls.id)}
                      className="text-red-500 hover:scale-110 transition"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                )}
              </div>
            ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form
            onSubmit={handleSubmit}
            className="bg-white p-6 rounded-2xl shadow-lg w-[90%] max-w-md space-y-4"
          >
            <h2 className="text-2xl font-bold text-[#1F2937]">Schedule Live Class</h2>

            <input
              type="text"
              placeholder="Title"
              value={newClass.title}
              onChange={(e) => setNewClass({ ...newClass, title: e.target.value })}
              className="w-full p-2 border border-gray-300 text-black rounded-md"
              required
            />

            <select
              value={newClass.course_id}
              onChange={(e) => setNewClass({ ...newClass, course_id: e.target.value })}
              className="w-full p-2 border border-gray-300 text-black rounded-md"
              required
            >
              <option value="">Select Course</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>

            <input
              type="datetime-local"
              value={newClass.scheduled_at}
              onChange={(e) => setNewClass({ ...newClass, scheduled_at: e.target.value })}
              className="w-full p-2 border border-gray-300 text-black rounded-md"
              required
            />

            <input
              type="text"
              placeholder="Meeting Link"
              value={newClass.meeting_link}
              onChange={(e) => setNewClass({ ...newClass, meeting_link: e.target.value })}
              className="w-full p-2 border border-gray-300 text-black rounded-md"
              required
            />

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={newClass.is_active}
                onChange={(e) => setNewClass({ ...newClass, is_active: e.target.checked })}
              />
              <label className="text-gray-700">Active</label>
            </div>

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-gray-600 hover:underline"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-[#4F46E5] text-white px-4 py-2 rounded-lg hover:bg-[#4338ca] transition"
              >
                Schedule
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default LiveClasses;
