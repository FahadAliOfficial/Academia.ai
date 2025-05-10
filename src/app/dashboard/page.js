"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useUserSession from "@/app/lib/useUserSession";
import { supabase } from "@/app/lib/supabaseClient";
import LoadingSpinner from "@/app/components/LoadingSpinner";

export default function DashboardPage() {
  const { user, loading } = useUserSession({ redirectIfNoSession: true });
  const router = useRouter();
  const [role, setRole] = useState("");
  <time datetime="2016-10-25" suppressHydrationWarning />;
  const [liveClassNotification, setLiveClassNotification] = useState(null);

  useEffect(() => {
    if (user && user.user_metadata?.role) {
      setRole(user.user_metadata.role.toLowerCase());
    }
  }, [user, router]);

  const [userData, setUserData] = useState(null);
  const [userID, setUserID] = useState("");

  // Auth and Role Check
  useEffect(() => {
    const fetchData = async () => {
      const { data, error: authError } = await supabase.auth.getUser();

      if (authError || !data?.user) {
        router.push("/login");
        return;
      }

      const user = data.user;
      setUserID(user.id);

      const { data: userDetails, error: userError } = await supabase
        .from("users")
        .select("name, role")
        .eq("id", user.id)
        .single();

      if (userError || !userDetails) {
        router.push("/login");
        return;
      }

      setUserData(userDetails);
    };

    fetchData();
  }, [router]);

  //handling todos
  const [todos, setTodos] = useState([]);
  const [newTodo, setNewTodo] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");

  useEffect(() => {
    if (userID) fetchTodos();
  }, [userID]);

  const fetchTodos = async () => {
    const { data, error } = await supabase
      .from("usertodo")
      .select("id, task, created_at")
      .eq("user_id", userID);

    if (error) {
      console.error("Error fetching todos:", error);
    } else {
      setTodos(Array.isArray(data) ? data : []);
    }
  };

  const handleAddTodo = async () => {
    if (newTodo.trim() !== "") {
      const { data, error } = await supabase
        .from("usertodo")
        .insert([{ task: newTodo, user_id: userID }])
        .select();

      if (error) {
        console.error("Error adding todo:", error);
      } else {
        if (Array.isArray(data)) {
          setTodos((prev) => [...prev, ...data]);
        } else {
          setTodos((prev) => [...prev, data]);
        }
        setNewTodo("");
        fetchTodos();
      }
    }
  };

  const handleDeleteTodo = async (id) => {
    const { error } = await supabase.from("usertodo").delete().eq("id", id);

    if (error) {
      console.error("Error deleting todo:", error);
    } else {
      setTodos(todos.filter((todo) => todo.id !== id));
    }
  };

  const handleEditTodo = (id, text) => {
    setEditingId(id);
    setEditText(text);
  };

  const handleSaveEdit = async (id) => {
    const { data, error } = await supabase
      .from("usertodo")
      .update({ task: editText })
      .eq("id", id)
      .select();

    if (error) {
      console.error("Error updating todo:", error);
    } else {
      setTodos(
        todos.map((todo) =>
          todo.id === id ? { ...todo, task: editText } : todo
        )
      );
      setEditingId(null);
      setEditText("");
    }
  };

  const [studentStats, setStudentStats] = useState([]);
  const [teacherStats, setTeacherStats] = useState([]);

  //dashboard stats
  useEffect(() => {
    if (!user || !role) return;

    const fetchStats = async () => {
      if (role === "student") {
        const { data: enrolledCourses } = await supabase
          .from("enrollments")
          .select("course_id")
          .eq("user_id", user.id);

        const courseIds = enrolledCourses?.map((e) => e.course_id) || [];

        const { data: liveClasses } = await supabase
          .from("live_classes")
          .select("title, course_id")
          .in("course_id", courseIds)
          .eq("is_active", true);

        if (liveClasses && liveClasses.length > 0) {
          setLiveClassNotification(liveClasses[0].title);
        }
        const { data: assignments } = await supabase
          .from("assignments")
          .select("id")
          .in("course_id", courseIds);

        const assignmentIds = assignments?.map((a) => a.id) || [];

        // Step 2: Get all submissions by the student
        const { data: submissions } = await supabase
          .from("submissions")
          .select("assignment_id")
          .eq("student_id", user.id);
        const submittedAssignmentIds =
          submissions?.map((s) => s.assignment_id) || [];
        const submittedSet = new Set(submittedAssignmentIds);
        const missingAssignments = assignmentIds.filter(
          (id) => !submittedSet.has(id)
        );

        setStudentStats({
          coursesEnrolled: courseIds.length,
          assignmentsDue: missingAssignments?.length || 0,
          totalAssignments: assignmentIds?.length || 0,
          tasksCompleted: todos.length,
        });
      } else if (role === "teacher") {
        const { data: courses } = await supabase
          .from("courses")
          .select("id")
          .eq("created_by", user.id);

        const courseIds = courses.map((c) => c.id);

        const { data: pendingReviews } = await supabase
          .from("submissions")
          .select("*")
          .or("feedback.is.null,grade.is.null");

        const { data: upcomingLectures } = await supabase
          .from("live_classes")
          .select("*")
          .in("course_id", courseIds)
          .gt("scheduled_at", new Date().toISOString()); // Adjust based on your field

        setTeacherStats({
          totalCourses: courseIds.length,
          pendingReviews: pendingReviews?.length || 0,
          remainingLectures: upcomingLectures?.length || 0,
        });
      }
    };

    fetchStats();
  }, [role, user, todos]);

  if (!userData) return <LoadingSpinner />;

  return (
    <div className="p-6 bg-[#F9FAFB] min-h-screen overflow-y-auto">
      <h1 className="text-3xl font-bold text-[#1F2937] mb-6">
        Welcome, {userData.name} 🎓
      </h1>
      {role === "student" && liveClassNotification && (
        <div className="mb-6 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 rounded-2xl shadow">
          📢 <strong>Live Class Started:</strong> {liveClassNotification}
        </div>
      )}

      {role === "student" && (
        //student
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <div className="bg-white p-4 rounded-2xl shadow-md">
            <h3 className="text-lg font-semibold text-[#4F46E5]">
              Courses Enrolled
            </h3>
            <p className="text-2xl text-[#1F2937] mt-1">
              {studentStats.coursesEnrolled}
            </p>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-md">
            <h3 className="text-lg font-semibold text-[#4F46E5]">
              Assignments Due
            </h3>
            <p className="text-2xl text-[#1F2937] mt-1">
              {studentStats.assignmentsDue}
            </p>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-md">
            <h3 className="text-lg font-semibold text-[#4F46E5]">
              Total Assignments
            </h3>
            <p className="text-2xl text-[#1F2937] mt-1">
              {studentStats.totalAssignments}
            </p>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-md">
            <h3 className="text-lg font-semibold text-[#4F46E5]">
              Tasks To Complete
            </h3>
            <p className="text-2xl text-[#1F2937] mt-1">{todos.length}</p>
          </div>
        </div>
      )}

      {role === "teacher" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <div className="bg-white p-4 rounded-2xl shadow-md">
            <h3 className="text-lg font-semibold text-[#4F46E5]">
              Total Courses
            </h3>
            <p className="text-2xl text-[#1F2937] mt-1">
              {teacherStats.totalCourses}
            </p>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-md">
            <h3 className="text-lg font-semibold text-[#4F46E5]">
              Tasks To Complete
            </h3>
            <p className="text-2xl text-[#1F2937] mt-1">{todos.length}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-md">
            <h3 className="text-lg font-semibold text-[#4F46E5]">
              Pending Reviews
            </h3>
            <p className="text-2xl text-[#1F2937] mt-1">
              {teacherStats.pendingReviews}
            </p>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-md">
            <h3 className="text-lg font-semibold text-[#4F46E5]">
              Remaining Lectures
            </h3>
            <p className="text-2xl text-[#1F2937] mt-1">
              {teacherStats.remainingLectures}
            </p>
          </div>
        </div>
      )}
      {/* Todo Section */}
      <section>
        <h2 className="text-xl font-semibold text-[#4F46E5] mb-3">
          Your To-do List
        </h2>
        <div className="flex items-center gap-3 mb-4">
          <input
            type="text"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            placeholder="Add a new task..."
            className="flex-1 px-4 py-2 border border-black rounded-lg focus:border-[#4F46E5] outline-none text-black"
          />
          <button
            onClick={handleAddTodo}
            className="bg-[#4F46E5] text-white px-4 py-2 cursor-pointer rounded-lg hover:bg-[#4338ca] transition"
          >
            Add
          </button>
        </div>
        <ul className="space-y-2">
          {todos?.map((todo) => (
            <li
              key={todo.id}
              className="bg-white px-4 py-2 rounded-lg shadow flex items-center justify-between"
            >
              {editingId === todo.id ? (
                <input
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="flex-1 px-2 py-1 border text-black border-gray-300 rounded mr-2"
                />
              ) : (
                <span className="text-[#1F2937] flex-1">{todo.task}</span>
              )}
              <div className="flex gap-2 ml-4">
                {editingId === todo.id ? (
                  <button
                    onClick={() => handleSaveEdit(todo.id)}
                    className="text-sm bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                  >
                    Save
                  </button>
                ) : (
                  <button
                    onClick={() => handleEditTodo(todo.id, todo.task)}
                    className="text-sm bg-yellow-400 text-white px-3 py-1 rounded hover:bg-yellow-500"
                  >
                    Edit
                  </button>
                )}
                <button
                  onClick={() => handleDeleteTodo(todo.id)}
                  className="text-sm bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
