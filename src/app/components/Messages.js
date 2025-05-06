import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import useUserSession from "../lib/useUserSession";
import LoadingSpinner from "./LoadingSpinner";
const Messages = ({ id }) => {
  const { user } = useUserSession({ redirectIfNoSession: true });
  const [messages, setMessages] = useState([]);
  const [editingMessage, setEditingMessage] = useState(null);
  const [newContent, setNewContent] = useState("");
  const [isLoading, setIsLoading] = useState(true); // For loading state
  const [error, setError] = useState(null); // For error state
  const [sender_Id, setSenderId] = useState(null); // For sender ID
  const [role, setRole] = useState(null);
  // Fetch messages and sender names using useCallback for optimization
  useEffect(() => {
    if (user) {
      setRole(user.user_metadata.role);
      setSenderId(user.id);
    }
  }, [user]);
  const fetchMessages = useCallback(async () => {
    if (!id) return;

    try {
      setIsLoading(true);
      setError(null);

      // Fetch messages
      const { data: messagesData, error: messagesError } = await supabase
        .from("messages")
        .select("id, sender_id, content, sent_at")
        .eq("course_id", id);

      if (messagesError) {
        throw new Error(messagesError.message);
      }

      // Fetch sender names in parallel using Promise.all
      const messagesWithSenderNames = await Promise.all(
        messagesData.map(async (message) => {
          const { data: senderData, error: senderError } = await supabase
            .from("users")
            .select("name")
            .eq("id", message.sender_id)
            .single();

          if (senderError) {
            message.sender_name = "Unknown"; // Fallback for sender name
          } else {
            message.sender_name = senderData?.name || "Unknown";
          }

          // Format the sent_at date
          message.sent_at = new Date(message.sent_at).toLocaleString();

          return message;
        })
      );

      setMessages(messagesWithSenderNames);
    } catch (err) {
      setError(err.message || "An error occurred while fetching messages.");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  // Fetch messages when the component is mounted or id changes
  useEffect(() => {
    fetchMessages();
  }, [id, fetchMessages]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Update message
  const updateMessage = async (messageId) => {
    if (newContent.trim() === "") {
      alert("Message content cannot be empty");
      return;
    }

    const { data, error } = await supabase
      .from("messages")
      .update({ content: newContent })
      .eq("id", messageId);

    if (error) {
      console.error("Error updating message:", error);
      alert("Error updating message.");
    } else {
      // Update the message in state
      const updatedMessages = messages.map((message) =>
        message.id === messageId ? { ...message, content: newContent } : message
      );
      setMessages(updatedMessages);
      setEditingMessage(null);
      setNewContent(""); // Clear the input
    }
  };

  // Delete message
  const deleteMessage = async (messageId) => {
    const { error } = await supabase
      .from("messages")
      .delete()
      .eq("id", messageId);

    if (error) {
      console.error("Error deleting message:", error);
      alert("Error deleting message.");
    } else {
      // Remove the deleted message from state
      const updatedMessages = messages.filter(
        (message) => message.id !== messageId
      );
      setMessages(updatedMessages);
    }
  };
  //adding new message
  const handleSendMessage = async () => {
    if (newContent.trim() === "") {
      alert("Message content cannot be empty");
      return;
    }
    console.log("Sender ID:", sender_Id); // Check sender ID
    const { data, error } = await supabase.from("messages").insert([
      {
        course_id: id,
        sender_id: sender_Id,
        content: newContent,
        message_type: "text",
      },
    ]);
    // console.log("Sending message:", sender_Id);
    if (error) {
      console.error("Failed to send message:", error.message);
      alert("Failed to send message.");
    } else {
      console.log("Message sent:", data);
      setNewContent(""); // Clear textarea
      fetchMessages();
    }
  };
  return (
    <div className="bg-white p-6 rounded-2xl shadow-md mb-10">
      <h2 className="text-xl font-semibold text-[#4F46E5] mb-4">Messages</h2>

      <div className="space-y-4">
        {messages.length === 0 ? (
          <p className="text-black">No messages yet.</p>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className="p-4 border border-gray-200 rounded-xl bg-[#F9FAFB] shadow-sm"
            >
              <div className="flex justify-between items-center text-sm text-[#1F2937]">
                <span className="font-semibold">
                  {" "}
                  {sender_Id === message.sender_id
                    ? "You"
                    : message.sender_name}
                </span>
                <span className="text-gray-500">{message.sent_at}</span>
              </div>

              <div className="mt-2 text-[#374151]">
                {editingMessage === message.id ? (
                  <div>
                    <textarea
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                    />
                    <div className="mt-3 flex gap-3">
                      <button
                        onClick={() => updateMessage(message.id)}
                        className="bg-[#4F46E5] text-white px-4 py-2 rounded-lg hover:bg-[#4338ca]"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingMessage(null)}
                        className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2">{message.content}</p>
                )}
              </div>

              {(role === "teacher" || sender_Id === message.sender_id) && (
                <div className="mt-4 flex gap-2 text-sm">
                  <button
                    onClick={() => {
                      setEditingMessage(message.id);
                      setNewContent(message.content);
                    }}
                    className="bg-[#4F46E5] py-2 px-3 rounded-lg cursor-pointer hover:bg-[#4338ca] transition duration-300"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteMessage(message.id)}
                    className="text-white hover:bg-red-600 transition duration-300 py-2 px-2 rounded-lg bg-red-500 cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
      <div>
        <textarea
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          placeholder="Type a new message..."
          className="w-full text-black p-3 border border-gray-300 rounded-lg focus:outline-none  mt-4"
        />
        <button
          onClick={handleSendMessage}
          className="bg-[#4F46E5] text-white px-4 py-2 rounded-lg hover:bg-[#4338ca] transition duration-300 cursor-pointer mt-2"
        >
          Send Message
        </button>
      </div>
    </div>
  );
};

export default Messages;
