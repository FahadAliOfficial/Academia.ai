"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import useUserSession from "@/app/lib/useUserSession";

function ChatbotPage() {
  const { user } = useUserSession({ redirectIfNoSession: true });
  const userId = user?.id;

  const [apiKey, setApiKey] = useState("");
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [activeSessionName, setActiveSessionName] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatW, setchatW] = useState(false);
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [role, setRole] = useState("");

  useEffect(() => {
    if (user) {
      setRole(user.user_metadata.role);
    }
  }, [user]);

  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("courses")
        .select("id, title");
      if (error) {
        alert("Error fetching courses");
        return;
      }
      setCourses(data);
      setLoading(false);
    };
    if (userId) fetchCourses();
  }, [userId]);

  useEffect(() => {
    if (!userId || !selectedCourseId) return;

    const fetchSessions = async () => {
      const { data: sessionData } = await supabase
        .from("chat_sessions")
        .select("session_id, session_name")
        .eq("user_id", userId)
        .eq("course_id", selectedCourseId)
        .order("created_at", { ascending: false });

      setSessions(sessionData || []);
      if (sessionData?.[0]) {
        setSessionId(sessionData[0].session_id);
        setActiveSessionName(sessionData[0].session_name);
      }
    };

    const fetchKey = async () => {
      let localKey = localStorage.getItem("gemini_api_key");
      if (!localKey) {
        const { data: keyData } = await supabase
          .from("user_api_keys")
          .select("api_key")
          .eq("user_id", userId)
          .single();

        if (keyData?.api_key) {
          localKey = keyData.api_key;
          localStorage.setItem("gemini_api_key", localKey);
        } else {
          const userKey = prompt("Please enter your Gemini API key:");
          if (userKey) {
            await supabase.from("user_api_keys").insert({
              user_id: userId,
              api_key: userKey,
            });
            localStorage.setItem("gemini_api_key", userKey);
            localKey = userKey;
          }
        }
      }
      setApiKey(localKey);
    };

    fetchKey();
    fetchSessions();
  }, [userId, selectedCourseId]);

  useEffect(() => {
    if (!sessionId || !selectedCourseId) return;

    const fetchChat = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("bot_chat_history")
        .select("*")
        .eq("user_id", userId)
        .eq("course_id", selectedCourseId)
        .eq("session_id", sessionId)
        .order("timestamp");

      setHistory(data || []);
      setLoading(false);
    };

    fetchChat();
  }, [sessionId, selectedCourseId]);

  const handleSend = async () => {
    if (!message.trim() || !selectedCourseId || !apiKey) return;

    setchatW(true); 

    let newSessionId = sessionId;
    let newSessionName = activeSessionName;

    if (!sessionId) {
      newSessionId = crypto.randomUUID();
      newSessionName = `AI Session - ${new Date().toLocaleTimeString()}`;

      await supabase.from("chat_sessions").insert({
        user_id: userId,
        course_id: selectedCourseId,
        session_id: newSessionId,
        session_name: newSessionName,
      });

      setSessionId(newSessionId);
      setActiveSessionName(newSessionName);
      setSessions((prev) => [
        { session_id: newSessionId, session_name: newSessionName },
        ...prev,
      ]);
    }

    const userMessage = {
      id: crypto.randomUUID(),
      course_id: selectedCourseId,
      user_id: userId,
      sender: "user",
      message,
      session_id: newSessionId,
    };

    await supabase.from("bot_chat_history").insert(userMessage);
    setHistory((prev) => [...prev, userMessage]);

    try {
      const response = await fetch("http://localhost:5000/load_vector_db", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_key: apiKey,
          course_id: selectedCourseId,
          query: message,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        let userFriendlyError = "Something went wrong. Please try again.";

        if (response.status === 404 && data.error.includes("No vector DB")) {
          userFriendlyError =
            "The teacher hasn't uploaded any course material yet.";
        } else if (
          response.status === 400 &&
          data.error.includes("Missing required fields")
        ) {
          userFriendlyError =
            "Missing input data. Please ensure all fields are filled.";
        } else if (data.error) {
          userFriendlyError = data.error;
        }
        const botError = {
          id: crypto.randomUUID(),
          course_id: selectedCourseId,
          user_id: userId,
          sender: "bot",
          message: userFriendlyError,
          session_id: newSessionId,
        };
        await supabase.from("bot_chat_history").insert(botError);
        setHistory((prev) => [...prev, botError]);
        setchatW(false);
        setMessage("");
        return;

        // throw new Error(userFriendlyError);
      }

      const botReply = {
        id: crypto.randomUUID(),
        course_id: selectedCourseId,
        user_id: userId,
        sender: "bot",
        message: data.response,
        session_id: newSessionId,
      };

      await supabase.from("bot_chat_history").insert(botReply);
      setHistory((prev) => [...prev, botReply]);
      setchatW(false);
    } catch (error) {
      const botError = {
        id: crypto.randomUUID(),
        course_id: selectedCourseId,
        user_id: userId,
        sender: "bot",
        message: error.message || "Error fetching response from backend.",
        session_id: newSessionId,
      };
      setMessage(""); 
      setchatW(false);
      await supabase.from("bot_chat_history").insert(botError);
      setHistory((prev) => [...prev, botError]);
      console.error("Error:", error);
    }

    setMessage("");
  };

  const handleNewSession = () => {
    setSessionId(null);
    setHistory([]);
    setActiveSessionName("");
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen flex flex-col">
      <h1 className="text-2xl text-[#4F46E5] font-bold mb-4">
        AI Course Assistant
      </h1>

      <div className="mb-4">
        <label className="block text-lg font-medium mb-1 text-[#4F46E5]">
          Select a Course
        </label>
        <select
          className="p-2 border text-black border-gray-700 rounded w-full"
          value={selectedCourseId}
          onChange={(e) => {
            setSelectedCourseId(e.target.value);
            setSessionId(null);
            setSessions([]);
            setHistory([]);
          }}
        >
          <option value="">-- Choose a Course --</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.title}
            </option>
          ))}
        </select>
      </div>

      {selectedCourseId && (
        <>
          <div className="mb-2 overflow-x-auto w-full">
            <button
              className="px-3 py-1 rounded border bg-green-600 text-white"
              onClick={handleNewSession}
            >
              + New Chat
            </button>
            {sessions.map((s) => (
              <button
                key={s.session_id}
                className={`px-3 py-1 ml-2 mt-1 rounded border ${
                  sessionId === s.session_id
                    ? "bg-[#4F46E5] text-white"
                    : "bg-white border-gray-300"
                }`}
                onClick={() => {
                  setSessionId(s.session_id);
                  setActiveSessionName(s.session_name);
                }}
              >
                {s.session_name}
              </button>
            ))}
          </div>

          <div className="bg-white p-4 shadow rounded mb-4 h-[60vh] overflow-y-auto">
            {!loading && history.length === 0 && (
              <p className="text-gray-500">
                No messages yet. Ask a question to begin.
              </p>
            )}
            {loading ? (
              <p className="text-gray-500">Loading chat history...</p>
            ) : (
              <>
                {history.map((h, i) => (
                  <div key={i} className="mb-2">
                    <strong
                      className={
                        h.sender === "bot" ? "text-green-600" : "text-[#4F46E5]"
                      }
                    >
                      {h.sender}:
                    </strong>
                    <span className="text-[#374151] ml-1 whitespace-pre-wrap">
                      {h.message}
                    </span>
                  </div>
                ))}
                {history.length > 0 && (
                  <div className="text-sm text-center text-gray-400 mb-2">
                    --- Chat History ---
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex gap-2">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="flex-1 p-2 border text-black border-black rounded focus:border-[#4F46E5] outline-none"
              placeholder="Ask your question..."
              disabled={chatW}
            />
            <button
              onClick={handleSend}
              className={`px-4 py-2 text-white rounded ${
                chatW ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600"
              }`}
              disabled={chatW}
            >
              {chatW ? "Sending..." : "Send"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default ChatbotPage;
