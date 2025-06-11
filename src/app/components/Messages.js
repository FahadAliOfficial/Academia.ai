import React, { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import useUserSession from "../lib/useUserSession";
import LoadingSpinner from "./LoadingSpinner";

const Messages = ({ id }) => {
  const { user } = useUserSession({ redirectIfNoSession: true });
  const [messages, setMessages] = useState([]);
  const [editingMessage, setEditingMessage] = useState(null);
  const [newContent, setNewContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sender_Id, setSenderId] = useState(null);
  const [role, setRole] = useState(null);
  const subscriptionRef = useRef(null);
  const messagesEndRef = useRef(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);// Helper function to fetch sender name for a message
  const fetchSenderName = useCallback(async (senderId) => {
    const { data: senderData, error: senderError } = await supabase
      .from("users")
      .select("name")
      .eq("id", senderId)
      .single();

    if (senderError) {
      return "Unknown";
    }
    return senderData?.name || "Unknown";
  }, []);

  // Play notification sound for new messages
  const playNotificationSound = useCallback(() => {
    if (soundEnabled) {
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
      } catch (error) {
        console.log('Audio not supported or blocked');
      }
    }
  }, [soundEnabled]);

  // Handle typing indicators
  const handleTyping = useCallback(() => {
    if (!isTyping && sender_Id) {
      setIsTyping(true);
      // Broadcast typing status via Supabase realtime
      if (subscriptionRef.current) {
        subscriptionRef.current.send({
          type: 'broadcast',
          event: 'typing',
          payload: { 
            user_id: sender_Id, 
            user_name: user?.user_metadata?.full_name || user?.email || 'User',
            typing: true 
          }
        });
      }
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout to stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      if (subscriptionRef.current && sender_Id) {
        subscriptionRef.current.send({
          type: 'broadcast',
          event: 'typing',
          payload: { 
            user_id: sender_Id, 
            typing: false 
          }
        });
      }
    }, 3000);
  }, [isTyping, sender_Id, user]);

  // Scroll to bottom of messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);// Fetch messages and sender names using useCallback for optimization  // Set user role and ID
  useEffect(() => {
    if (user) {
      setRole(user.user_metadata.role);
      setSenderId(user.id);
    }
  }, [user]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);  // Set up real-time subscription
  useEffect(() => {
    if (!id || !sender_Id) return;

    // Clean up existing subscription
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    console.log(`🔄 Setting up real-time subscription for course: ${id}, user: ${sender_Id}`);

    // Create new subscription for this course's messages
    subscriptionRef.current = supabase
      .channel(`messages-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `course_id=eq.${id}`
        },
        async (payload) => {
          console.log('✅ New message received via real-time:', payload);
          const newMessage = payload.new;
          
          // Don't play sound for own messages
          if (newMessage.sender_id !== sender_Id) {
            playNotificationSound();
          }
          
          // Fetch sender name for the new message
          const senderName = await fetchSenderName(newMessage.sender_id);
          
          const formattedMessage = {
            ...newMessage,
            sender_name: senderName,
            sent_at: new Date(newMessage.sent_at).toLocaleString()
          };

          console.log('📨 Adding formatted message to state:', formattedMessage);
          setMessages(prev => [...prev, formattedMessage]);
        }
      )      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `course_id=eq.${id}`
        },        async (payload) => {
          console.log('✏️ Message updated via real-time:', payload);
          const updatedMessage = payload.new;

          // Check if this is a soft delete (is_deleted flag set to true)
          if (updatedMessage.is_deleted) {
            console.log('🗑️ Detected soft delete via UPDATE event:', updatedMessage);
            
            // Only show notification if this deletion was by someone else
            if (updatedMessage.sender_id !== sender_Id) {
              try {
                // Get the name of who deleted the message
                const deleterName = await fetchSenderName(updatedMessage.deleted_by || updatedMessage.sender_id);
                console.log(`🔔 Showing delete notification for: ${deleterName}`);
                
                // Use inline notification for deletion
                const notification = document.createElement('div');
                notification.className = 'fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-lg z-50 transition-all duration-300';
                notification.innerHTML = `
                  <div class="flex items-center gap-2">
                    <span>🗑️</span>
                    <span><strong>${deleterName}</strong> deleted a message</span>
                    <button class="ml-2 text-sm opacity-60 hover:opacity-100" onclick="this.remove()">✕</button>
                  </div>
                `;
                document.body.appendChild(notification);
                
                // Auto remove after 4 seconds
                setTimeout(() => {
                  if (document.body.contains(notification)) {
                    notification.style.opacity = '0';
                    setTimeout(() => {
                      if (document.body.contains(notification)) {
                        document.body.removeChild(notification);
                      }
                    }, 300);
                  }
                }, 4000);
              } catch (error) {
                console.error('❌ Error showing delete notification:', error);
              }
            }
            
            // Remove the soft-deleted message from state
            console.log(`🔄 Removing soft-deleted message ${updatedMessage.id} from state`);
            setMessages(prev => {
              const newMessages = prev.filter(msg => msg.id !== updatedMessage.id);
              console.log(`📊 Messages before: ${prev.length}, after: ${newMessages.length}`);
              return newMessages;
            });
            
            return; // Exit early for soft deletes
          }

          // Regular message update (content editing)
          console.log('✏️ Regular message update detected');
          
          // Only show notification if this update was by someone else
          if (updatedMessage.sender_id !== sender_Id) {
            // Get the name of who updated the message
            const updaterName = await fetchSenderName(updatedMessage.sender_id);
            console.log(`🔔 Showing update notification for: ${updaterName}`);
            
            // Use inline notification for now to ensure it works
            const notification = document.createElement('div');
            notification.className = 'fixed top-4 right-4 bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded shadow-lg z-50 transition-all duration-300';
            notification.innerHTML = `
              <div class="flex items-center gap-2">
                <span>✏️</span>
                <span><strong>${updaterName}</strong> edited a message</span>
                <button class="ml-2 text-sm opacity-60 hover:opacity-100" onclick="this.remove()">✕</button>
              </div>
            `;
            document.body.appendChild(notification);
            
            // Auto remove after 4 seconds
            setTimeout(() => {
              if (document.body.contains(notification)) {
                notification.style.opacity = '0';
                setTimeout(() => {
                  if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                  }
                }, 300);
              }
            }, 4000);
          }
          
          // Update the message in state (for edits only, not deletions)
          setMessages(prev => prev.map(msg => 
            msg.id === updatedMessage.id 
              ? { ...msg, content: updatedMessage.content, updated_at: updatedMessage.updated_at }
              : msg
          ));
        }
      ).on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `course_id=eq.${id}`
        },        async (payload) => {
          console.log('🗑️ Message deleted via real-time:', payload);
          console.log('🔍 Payload details:', JSON.stringify(payload, null, 2));
          
          const deletedMessage = payload.old;
          if (!deletedMessage) {
            console.error('❌ No deleted message data in payload');
            return;
          }
          
          console.log(`🔍 Deleted message sender_id: ${deletedMessage.sender_id}, current user: ${sender_Id}`);
          console.log(`🔍 Deleted message details:`, deletedMessage);
          
          // Only show notification if this deletion was by someone else
          if (deletedMessage.sender_id !== sender_Id) {
            try {
              // Get the name of who deleted the message
              const deleterName = await fetchSenderName(deletedMessage.sender_id);
              console.log(`🔔 Showing delete notification for: ${deleterName}`);
              
              // Use inline notification for now to ensure it works
              const notification = document.createElement('div');
              notification.className = 'fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-lg z-50 transition-all duration-300';
              notification.innerHTML = `
                <div class="flex items-center gap-2">
                  <span>🗑️</span>
                  <span><strong>${deleterName}</strong> deleted a message</span>
                  <button class="ml-2 text-sm opacity-60 hover:opacity-100" onclick="this.remove()">✕</button>
                </div>
              `;
              document.body.appendChild(notification);
              
              // Auto remove after 4 seconds
              setTimeout(() => {
                if (document.body.contains(notification)) {
                  notification.style.opacity = '0';
                  setTimeout(() => {
                    if (document.body.contains(notification)) {
                      document.body.removeChild(notification);
                    }
                  }, 300);
                }
              }, 4000);
            } catch (error) {
              console.error('❌ Error showing delete notification:', error);
            }
          } else {
            console.log(`ℹ️ Not showing notification - user deleted their own message`);
          }
          
          // Remove the message from state
          console.log(`🔄 Removing message ${deletedMessage.id} from state`);
          setMessages(prev => {
            const newMessages = prev.filter(msg => msg.id !== deletedMessage.id);
            console.log(`📊 Messages before: ${prev.length}, after: ${newMessages.length}`);
            return newMessages;
          });
        }
      ).on(
        'broadcast',
        { event: 'typing' },
        (payload) => {
          console.log('⌨️ Typing event received:', payload);
          const { user_id, user_name, typing } = payload.payload;
          
          if (user_id !== sender_Id) { // Don't show own typing indicator
            if (typing) {
              setTypingUsers(prev => {
                const exists = prev.find(u => u.user_id === user_id);
                if (!exists) {
                  return [...prev, { user_id, user_name }];
                }
                return prev;
              });
            } else {
              setTypingUsers(prev => prev.filter(u => u.user_id !== user_id));
            }
          }
        }
      )
      .on(
        'broadcast',
        { event: 'test' },
        (payload) => {
          console.log('🧪 Test broadcast received:', payload);
        }
      )
      .subscribe((status) => {
        console.log(`🔌 Subscription status changed: ${status}`);
        setConnectionStatus(status);
        
        // Add additional debugging for subscription states
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time subscription is active and ready!');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Real-time subscription failed - check Supabase configuration');
        } else if (status === 'TIMED_OUT') {
          console.warn('⏰ Real-time subscription timed out - retrying...');
        } else {
          console.log(`🔄 Real-time subscription status: ${status}`);
        }
      });

    // Cleanup function
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [id, sender_Id, fetchSenderName, playNotificationSound]);  // Fetch initial messages
  const fetchMessages = useCallback(async () => {
    if (!id) return;

    console.log("🔍 Fetching messages for course:", id);

    try {
      setIsLoading(true);
      setError(null);      // Fetch messages - simplified approach
      const { data: messagesData, error: messagesError } = await supabase
        .from("messages")
        .select("*") // Select all columns to avoid column not found errors
        .eq("course_id", id)
        .order("sent_at", { ascending: true });
        
      console.log("📦 Raw messages from database:", messagesData);
        
      // Filter out soft-deleted messages in JavaScript if the column exists
      const filteredMessages = messagesData?.filter(msg => !msg.is_deleted) || [];

      if (messagesError) {
        console.error("❌ Database error:", messagesError);
        throw new Error(messagesError.message);
      }

      console.log("📥 Filtered messages count:", filteredMessages?.length || 0);

      // Fetch sender names in parallel using Promise.all
      const messagesWithSenderNames = await Promise.all(
        filteredMessages.map(async (message) => {
          const senderName = await fetchSenderName(message.sender_id);
          return {
            ...message,
            sender_name: senderName,
            sent_at: new Date(message.sent_at).toLocaleString()
          };
        })
      );

      setMessages(messagesWithSenderNames);
    } catch (err) {
      setError(err.message || "An error occurred while fetching messages.");
    } finally {
      setIsLoading(false);
    }
  }, [id, fetchSenderName]);
  // Fetch messages when the component is mounted
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);  // Update message
  const updateMessage = async (messageId) => {
    if (newContent.trim() === "") {
      alert("Message content cannot be empty");
      return;
    }

    console.log(`✏️ Updating message ${messageId} with content: "${newContent.trim()}"`);

    // Store original content for potential rollback
    const originalMessage = messages.find(msg => msg.id === messageId);
    const originalContent = originalMessage?.content;

    // Optimistic update: immediately update UI
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, content: newContent.trim() }
        : msg
    ));

    const { error } = await supabase
      .from("messages")
      .update({ content: newContent.trim() })
      .eq("id", messageId);

    if (error) {
      console.error("❌ Error updating message:", error);
      
      // Revert optimistic update if failed
      if (originalContent) {
        setMessages(prev => prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, content: originalContent }
            : msg
        ));
      }
      
      if (error.message.includes('row-level security')) {
        alert("You don't have permission to update this message. Only message authors can edit their messages.");
      } else {
        alert(`Error updating message: ${error.message}`);
      }
    } else {
      console.log('✅ Message updated successfully, real-time will notify other users...');
      // Real-time subscription will handle updating for other users
      setEditingMessage(null);
      setNewContent("");
    }
  };  // Soft delete message (using UPDATE instead of DELETE for real-time compatibility)
  const deleteMessage = async (messageId) => {
    console.log(`🗑️ Soft deleting message ${messageId} by user ${sender_Id}`);

    // Find the message to delete
    const messageToDelete = messages.find(msg => msg.id === messageId);
    console.log(`📋 Message to soft delete:`, messageToDelete);

    // Optimistic update: immediately remove from UI for better UX
    if (messageToDelete) {
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
    }

    // Use UPDATE to soft delete instead of DELETE to trigger real-time notifications
    const { data, error } = await supabase
      .from("messages")
      .update({ 
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: sender_Id
      })
      .eq("id", messageId)
      .select(); // Add select to see what was updated

    if (error) {
      console.error("❌ Error soft deleting message:", error);
      console.error("❌ Full error details:", JSON.stringify(error, null, 2));
      
      // Revert the optimistic update if deletion failed
      if (messageToDelete) {
        setMessages(prev => {
          // Re-insert the message at its original position
          const newMessages = [...prev];
          const originalIndex = messages.findIndex(msg => msg.id === messageId);
          newMessages.splice(originalIndex, 0, messageToDelete);
          return newMessages.sort((a, b) => new Date(a.sent_at) - new Date(b.sent_at));
        });
      }
      
      if (error.message.includes('row-level security')) {
        alert("You don't have permission to delete this message. Only message authors can delete their messages.");
      } else {
        alert(`Error deleting message: ${error.message}`);
      }
    } else {
      console.log('✅ Message soft deleted successfully:', data);
      console.log('🔄 Real-time UPDATE event will notify other users about deletion...');
    }
    // Real-time subscription will handle the UPDATE event and notify other users
  };// Send new message
  const handleSendMessage = async () => {
    if (newContent.trim() === "") {
      alert("Message content cannot be empty");
      return;
    }

    console.log(`📤 Sending message: "${newContent.trim()}" to course: ${id} from user: ${sender_Id}`);

    const messageData = {
      course_id: id,
      sender_id: sender_Id,
      content: newContent,
      message_type: "text",
    };

    console.log('📝 Message data being inserted:', messageData);

    const { data, error } = await supabase
      .from("messages")
      .insert([messageData])
      .select(); // Select to get the inserted data

    if (error) {
      console.error("❌ Failed to send message:", error);
      alert(`Failed to send message: ${error.message}`);
    } else {
      console.log('✅ Message inserted successfully:', data);
      const insertedMessage = data[0];
      
      setNewContent(""); // Clear textarea
      
      // Stop typing indicator
      setIsTyping(false);
      if (subscriptionRef.current && sender_Id) {
        subscriptionRef.current.send({
          type: 'broadcast',
          event: 'typing',
          payload: { 
            user_id: sender_Id, 
            typing: false 
          }
        });
      }
        // Fallback: if real-time doesn't work, manually add to state after 2 seconds
      console.log('🔄 Waiting for real-time event to update message list...');
      
      setTimeout(async () => {
        // Check if message was added by real-time
        setMessages(currentMessages => {
          const messageInState = currentMessages.find(m => m.id === insertedMessage.id);
          if (!messageInState) {
            console.log('⚠️ Real-time event not received, manually adding message to state');
            // Format and add the message manually
            const formatMessage = async () => {
              const senderName = await fetchSenderName(insertedMessage.sender_id);
              return {
                ...insertedMessage,
                sender_name: senderName,
                sent_at: new Date(insertedMessage.sent_at).toLocaleString()
              };
            };
            
            formatMessage().then(formattedMessage => {
              setMessages(prev => [...prev, formattedMessage]);
            });
          }
          return currentMessages;
        });
      }, 2000);
    }
  };

  // Test real-time connectivity
  const testRealTimeConnection = async () => {
    console.log('🧪 Testing real-time connection...');
    
    // Test 1: Check if we can create a subscription
    const testChannel = supabase.channel('test-connection');
    testChannel.subscribe((status) => {
      console.log(`🧪 Test subscription status: ${status}`);
      if (status === 'SUBSCRIBED') {
        console.log('✅ Basic real-time connection is working');
        testChannel.unsubscribe();
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Real-time connection failed');
        testChannel.unsubscribe();
      }
    });
    
    // Test 2: Send a broadcast message to verify channel communication
    if (subscriptionRef.current) {
      subscriptionRef.current.send({
        type: 'broadcast',
        event: 'test',
        payload: { message: 'Test message', timestamp: Date.now() }
      });
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-md mb-10">
        <h2 className="text-xl font-semibold text-red-500 mb-4">Error</h2>
        <p className="text-red-600">{error}</p>
        <button
          onClick={fetchMessages}
          className="mt-4 bg-[#4F46E5] text-white px-4 py-2 rounded-lg hover:bg-[#4338ca] transition duration-300"
        >
          Retry
        </button>
      </div>
    );
  }return (
    <div className="bg-white p-6 rounded-2xl shadow-md mb-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-[#4F46E5]">Messages</h2>
          {/* Real-time connection status indicator */}
        <div className="flex items-center gap-4">
          {/* Sound toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-lg transition-colors ${
              soundEnabled 
                ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
            }`}
            title={soundEnabled ? 'Sound notifications ON' : 'Sound notifications OFF'}
          >
            {soundEnabled ? '🔊' : '🔇'}
          </button>
            {/* Connection status */}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus === 'SUBSCRIBED' ? 'bg-green-500' : 
              connectionStatus === 'CHANNEL_ERROR' ? 'bg-red-500' : 
              'bg-yellow-500'
            }`}></div>
            <span className="text-xs text-gray-500">
              {connectionStatus === 'SUBSCRIBED' ? 'Live' : 
               connectionStatus === 'CHANNEL_ERROR' ? 'Offline' : 
               'Connecting...'}
            </span>
          </div>
          
          {/* Test Connection Button - only show if not connected */}
          {connectionStatus !== 'SUBSCRIBED' && (
            <button
              onClick={testRealTimeConnection}
              className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              title="Test real-time connection"
            >
              Test Connection
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4 max-h-96 overflow-y-auto">{/* Add scrollable container */}
        {messages.length === 0 ? (
          <p className="text-black">No messages yet.</p>
        ) : (          messages.map((message) => (
            <div
              key={message.id}
              className={`p-4 border rounded-xl shadow-sm transition-all duration-300 hover:shadow-md ${
                sender_Id === message.sender_id 
                  ? 'bg-blue-50 border-blue-200 ml-12' 
                  : 'bg-[#F9FAFB] border-gray-200 mr-12'
              }`}
            >
              <div className="flex justify-between items-center text-sm text-[#1F2937]">
                <span className="font-semibold">
                  {" "}
                  {sender_Id === message.sender_id
                    ? "You"
                    : message.sender_name}
                </span>
                <span className="text-gray-500">{message.sent_at}</span>
              </div>              <div className="mt-2 text-[#374151]">
                {editingMessage === message.id ? (
                  <div>
                    <textarea
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          updateMessage(message.id);
                        }
                        if (e.key === 'Escape') {
                          setEditingMessage(null);
                          setNewContent("");
                        }
                      }}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
                      rows="3"
                      autoFocus
                    />
                    <div className="mt-3 flex gap-3">
                      <button
                        onClick={() => updateMessage(message.id)}
                        className="bg-[#4F46E5] text-white px-4 py-2 rounded-lg hover:bg-[#4338ca]"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingMessage(null);
                          setNewContent("");
                        }}
                        className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Press Enter to save, Escape to cancel
                    </p>
                  </div>
                ) : (
                  <div className="relative">
                    <p className="mt-2">{message.content}</p>
                    {/* Show edited indicator if message was modified */}
                    {message.updated_at && message.updated_at !== message.sent_at && (
                      <span className="text-xs text-gray-400 italic ml-2">(edited)</span>
                    )}
                  </div>
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
          ))        )}      </div>
      {/* Invisible element to scroll to */}
      <div ref={messagesEndRef} />
      
      {/* Typing indicators */}
      {typingUsers.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg animate-pulse mt-4">
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
          </div>
          <span className="text-sm text-gray-600">
            {typingUsers.length === 1 
              ? `${typingUsers[0].user_name} is typing...`
              : `${typingUsers.length} people are typing...`
            }
          </span>
        </div>
      )}
      
        <div>        <textarea
          value={newContent}
          onChange={(e) => {
            setNewContent(e.target.value);
            handleTyping(); // Trigger typing indicator
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          placeholder="Type a new message... (Press Enter to send, Shift+Enter for new line)"
          className="w-full text-black p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5] mt-4"
          rows="3"
        />
        <div className="flex justify-between items-center mt-2">
          <span className="text-xs text-gray-500">
            {connectionStatus === 'SUBSCRIBED' ? 
              '✅ Messages will appear instantly for everyone' : 
              '⚠️ Real-time updates may be delayed'}
          </span>
          <button
            onClick={handleSendMessage}
            disabled={!newContent.trim() || connectionStatus === 'CHANNEL_ERROR'}
            className={`px-4 py-2 rounded-lg transition duration-300 cursor-pointer ${
              !newContent.trim() || connectionStatus === 'CHANNEL_ERROR'
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-[#4F46E5] hover:bg-[#4338ca]'
            } text-white`}
          >
            Send Message
          </button>
        </div>
      </div>
    </div>
  );
};

export default Messages;
