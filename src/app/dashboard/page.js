"use client";

import { useEffect, useState, useRef } from "react";
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
  const [activeLiveClass, setActiveLiveClass] = useState(null);
  const subscriptionRef = useRef(null);  useEffect(() => {
    if (user && user.user_metadata?.role) {
      setRole(user.user_metadata.role.toLowerCase());
    }
  }, [user, router]);

  // Function to join live class directly
  const handleJoinLiveClass = async () => {
    if (!activeLiveClass) return;
    
    // Store live class data for the join page
    localStorage.setItem("liveClassData", JSON.stringify(activeLiveClass));
    
    // Navigate to join page
    router.push(`/dashboard/LiveClass/join/${activeLiveClass.meeting_link}`);
  };

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
  // Real-time live class notifications
  useEffect(() => {
    if (!user || role !== "student") return;

    const setupLiveClassNotifications = async () => {
      // Get enrolled courses first
      const { data: enrolledCourses } = await supabase
        .from("enrollments")
        .select("course_id")
        .eq("user_id", user.id);

      const courseIds = enrolledCourses?.map((e) => e.course_id) || [];
      
      if (courseIds.length === 0) return;

      // Check for existing active live classes
      const { data: existingLiveClasses } = await supabase
        .from("live_classes")
        .select("*")
        .in("course_id", courseIds)
        .eq("is_active", true);

      if (existingLiveClasses && existingLiveClasses.length > 0) {
        setActiveLiveClass(existingLiveClasses[0]);
        playNotificationSound();
      }

      // Clean up existing subscription
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }

      console.log("🔄 Setting up real-time subscription for live classes");

      // Set up real-time subscription for live_classes table
      subscriptionRef.current = supabase
        .channel("live-classes-notifications")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "live_classes"
          },
          async (payload) => {
            console.log("📺 New live class detected:", payload);
            const newLiveClass = payload.new;
            
            // Check if this live class is for one of the student's enrolled courses
            if (courseIds.includes(newLiveClass.course_id) && newLiveClass.is_active) {
              console.log("🎓 Live class is for enrolled course, showing notification");
              setActiveLiveClass(newLiveClass);
              playNotificationSound();
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE", 
            schema: "public",
            table: "live_classes"
          },
          async (payload) => {
            console.log("📺 Live class updated:", payload);
            const updatedLiveClass = payload.new;
            
            // Check if this is for an enrolled course
            if (courseIds.includes(updatedLiveClass.course_id)) {
              if (updatedLiveClass.is_active) {
                console.log("🎓 Live class went live, showing notification");
                setActiveLiveClass(updatedLiveClass);
                playNotificationSound();
              } else {
                console.log("🎓 Live class ended, removing notification");
                setActiveLiveClass(null);
                setLiveClassNotification(null);
              }
            }
          }
        )
        .subscribe((status) => {
          console.log(`🔌 Live class subscription status: ${status}`);
        });
    };

    setupLiveClassNotifications();

    // Cleanup subscription on unmount
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [user, role]);

  // Audio notification function
  const playNotificationSound = () => {
    try {
      // Create audio context and generate notification sound
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 1);
    } catch (error) {
      console.log("Audio notification not available:", error);
    }
  };

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
        </div>        {role === "student" && (liveClassNotification || activeLiveClass) && (
          <div className="mb-6 p-6 bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 text-red-800 rounded-xl shadow-lg animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="bg-red-500 rounded-full p-3 mr-4 animate-bounce">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-white"
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
                <div>
                  <p className="font-bold text-lg">🔴 Live Class in Progress!</p>
                  <p className="text-red-700">{liveClassNotification || activeLiveClass?.title}</p>
                  <p className="text-sm text-red-600 mt-1">
                    Don't miss out - join now to participate in the live session
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={handleJoinLiveClass}
                  className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center gap-2"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
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
                  Join Now
                </button>
                <button 
                  onClick={() => {
                    setLiveClassNotification(null);
                    setActiveLiveClass(null);
                  }}
                  className="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-100 transition-colors"
                  title="Dismiss notification"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
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
