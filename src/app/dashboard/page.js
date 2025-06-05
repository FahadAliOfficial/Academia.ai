"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useUserSession from "@/app/lib/useUserSession";
import { supabase } from "@/app/lib/supabaseClient";
import LoadingSpinner from "@/app/components/LoadingSpinner";
import ProtectedPage from "@/app/components/ProtectedPage";

function DashboardContent() {
  const { user, loading } = useUserSession({ redirectIfNoSession: true });
  const router = useRouter();
  const [role, setRole] = useState("");
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
    <div className="p-6 bg-gradient-to-br from-[#F9FAFB] to-[#EEF2FF] min-h-screen overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white p-6 rounded-2xl shadow-md mb-6 border border-indigo-50">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[#1F2937] mb-1">
                Welcome, {userData.name} 🎓
              </h1>
              <p className="text-gray-500">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <div className="hidden md:block">
              <div className="bg-indigo-50 rounded-full px-4 py-2 text-indigo-600 font-medium">
                {role === "student" ? "Student Dashboard" : "Teacher Dashboard"}
              </div>
            </div>
          </div>
        </div>
        {role === "student" && liveClassNotification && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl shadow-sm animate-pulse flex items-center">
            <div className="bg-yellow-500 rounded-full p-2 mr-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-white"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div>
              <p className="font-medium">Live Class in Progress!</p>
              <p>{liveClassNotification}</p>
            </div>{" "}
            <button className="ml-auto bg-yellow-500 hover:bg-yellow-600 text-white py-2 px-4 rounded-lg transition">
              Join Now
            </button>
          </div>
        )}{" "}
        {role === "student" && (
          //student
          <div className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Your Academic Progress
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-indigo-50 transition-all hover:shadow-md hover:border-indigo-200">
                <div className="flex items-center mb-3">
                  <div className="p-2 bg-indigo-100 rounded-lg mr-3">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 text-indigo-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    Courses Enrolled
                  </h3>
                </div>
                <div className="flex items-end justify-between">
                  <p className="text-3xl font-bold text-[#4F46E5]">
                    {studentStats.coursesEnrolled}
                  </p>
                  <span className="text-sm text-green-600 font-medium">
                    Active
                  </span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-indigo-50 transition-all hover:shadow-md hover:border-indigo-200">
                <div className="flex items-center mb-3">
                  <div className="p-2 bg-red-100 rounded-lg mr-3">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 text-red-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    Assignments Due
                  </h3>
                </div>
                <div className="flex items-end justify-between">
                  <p className="text-3xl font-bold text-red-600">
                    {studentStats.assignmentsDue}
                  </p>
                  {studentStats.assignmentsDue > 0 && (
                    <span className="text-sm text-red-600 font-medium animate-pulse">
                      Attention needed
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-indigo-50 transition-all hover:shadow-md hover:border-indigo-200">
                <div className="flex items-center mb-3">
                  <div className="p-2 bg-blue-100 rounded-lg mr-3">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 text-blue-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    Total Assignments
                  </h3>
                </div>
                <div className="flex items-end justify-between">
                  <p className="text-3xl font-bold text-blue-600">
                    {studentStats.totalAssignments}
                  </p>
                  {studentStats.totalAssignments > 0 && (
                    <span className="text-sm text-blue-600 font-medium">
                      {Math.round(
                        ((studentStats.totalAssignments -
                          studentStats.assignmentsDue) /
                          studentStats.totalAssignments) *
                          100
                      )}
                      % completed
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-indigo-50 transition-all hover:shadow-md hover:border-indigo-200">
                <div className="flex items-center mb-3">
                  <div className="p-2 bg-green-100 rounded-lg mr-3">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 text-green-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    Tasks To Complete
                  </h3>
                </div>
                <div className="flex items-end justify-between">
                  <p className="text-3xl font-bold text-green-600">
                    {todos.length}
                  </p>
                  <span className="text-sm text-green-600 font-medium">
                    Personal tasks
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}{" "}
        {role === "teacher" && (
          <div className="mb-10">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Teaching Overview
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-indigo-50 transition-all hover:shadow-md hover:border-indigo-200">
                <div className="flex items-center mb-3">
                  <div className="p-2 bg-indigo-100 rounded-lg mr-3">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 text-indigo-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0h10a2 2 0 012 2v2M7 7h10"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    Active Courses
                  </h3>
                </div>
                <div className="flex items-end justify-between">
                  <p className="text-3xl font-bold text-indigo-600">
                    {teacherStats.totalCourses}
                  </p>
                  <a
                    href="/dashboard/teacher/courses-bar"
                    className="text-sm text-indigo-600 font-medium hover:underline"
                  >
                    View all
                  </a>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-indigo-50 transition-all hover:shadow-md hover:border-indigo-200">
                <div className="flex items-center mb-3">
                  <div className="p-2 bg-green-100 rounded-lg mr-3">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 text-green-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    Tasks To Complete
                  </h3>
                </div>
                <div className="flex items-end justify-between">
                  <p className="text-3xl font-bold text-green-600">
                    {todos.length}
                  </p>
                  <span className="text-sm text-green-600 font-medium">
                    Personal tasks
                  </span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-indigo-50 transition-all hover:shadow-md hover:border-indigo-200">
                <div className="flex items-center mb-3">
                  <div className="p-2 bg-amber-100 rounded-lg mr-3">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 text-amber-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    Pending Reviews
                  </h3>
                </div>
                <div className="flex items-end justify-between">
                  <p className="text-3xl font-bold text-amber-600">
                    {teacherStats.pendingReviews}
                  </p>
                  {teacherStats.pendingReviews > 0 && (
                    <span className="text-sm text-amber-600 font-medium animate-pulse">
                      Needs attention
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-indigo-50 transition-all hover:shadow-md hover:border-indigo-200">
                <div className="flex items-center mb-3">
                  <div className="p-2 bg-purple-100 rounded-lg mr-3">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 text-purple-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    Upcoming Lectures
                  </h3>
                </div>
                <div className="flex items-end justify-between">
                  <p className="text-3xl font-bold text-purple-600">
                    {teacherStats.remainingLectures}
                  </p>
                  <a
                    href="/dashboard/LiveClass"
                    className="text-sm text-purple-600 font-medium hover:underline"
                  >
                    Schedule
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}{" "}
        {/* Todo Section */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-50">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-800">
              <span className="text-indigo-600">Personal</span> Task List
            </h2>
            <div className="text-sm text-gray-500">
              {todos?.length || 0} tasks
            </div>
          </div>
          <div className="relative mb-6">
            <input
              type="text"
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && newTodo.trim() !== "" && handleAddTodo()
              }
              placeholder="Add a new task and press Enter..."
              className="w-full pl-4 pr-12 py-3 border border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-black"
            />
            <button
              onClick={handleAddTodo}
              disabled={newTodo.trim() === ""}
              className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full ${
                newTodo.trim() === ""
                  ? "bg-gray-100 text-gray-400"
                  : "bg-indigo-600 text-white hover:bg-indigo-700"
              } transition-colors`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
          {todos?.length > 0 ? (
            <ul className="divide-y divide-gray-100 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
              {todos.map((todo) => (
                <li
                  key={todo.id}
                  className="group py-3 px-2 hover:bg-gray-50 rounded-lg transition-colors flex items-center justify-between"
                >
                  {editingId === todo.id ? (
                    <div className="flex-1 flex">
                      <input
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleSaveEdit(todo.id)
                        }
                        autoFocus
                        className="flex-1 px-3 py-2 border text-black border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  ) : (
                    <span className="text-gray-800 flex-1 break-words">
                      {todo.task}
                    </span>
                  )}

                  <div className="flex gap-1 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    {editingId === todo.id ? (
                      <button
                        onClick={() => handleSaveEdit(todo.id)}
                        className="p-1.5 rounded-full bg-green-100 text-green-700 hover:bg-green-200 transition"
                        title="Save"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleEditTodo(todo.id, todo.task)}
                        className="p-1.5 rounded-full bg-amber-100 text-amber-700 hover:bg-amber-200 transition"
                        title="Edit"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                          />
                        </svg>
                      </button>
                    )}

                    <button
                      onClick={() => handleDeleteTodo(todo.id)}
                      className="p-1.5 rounded-full bg-red-100 text-red-700 hover:bg-red-200 transition"
                      title="Delete"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-8">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 text-gray-300 mx-auto mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                />
              </svg>
              <p className="text-gray-500">
                Your task list is empty. Add a new task to get started!
              </p>
            </div>
          )}{" "}
        </section>
        <style jsx global>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background-color: #f3f4f6;
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background-color: #d1d5db;
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background-color: #9ca3af;
          }
        `}</style>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedPage>
      <DashboardContent />
    </ProtectedPage>
  );
}
