import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/app/lib/supabaseClient';

// Simple component to test real-time functionality
const RealTimeTest = ({ courseId }) => {
  const [status, setStatus] = useState('disconnected');
  const [messages, setMessages] = useState([]);
  const [testMessage, setTestMessage] = useState('');
  const channelRef = useRef(null);

  useEffect(() => {
    if (!courseId) return;

    console.log('🧪 Setting up real-time test for course:', courseId);

    // Clean up existing subscription
    if (channelRef.current) {
      channelRef.current.unsubscribe();
    }

    // Create test channel
    channelRef.current = supabase
      .channel(`test-messages-${courseId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `course_id=eq.${courseId}`
        },
        (payload) => {
          console.log('✅ Real-time INSERT received:', payload);
          setMessages(prev => [...prev, `INSERT: ${payload.new.content} (ID: ${payload.new.id})`]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `course_id=eq.${courseId}`
        },
        (payload) => {
          console.log('✅ Real-time UPDATE received:', payload);
          setMessages(prev => [...prev, `UPDATE: ${payload.new.content} (ID: ${payload.new.id})`]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `course_id=eq.${courseId}`
        },
        (payload) => {
          console.log('✅ Real-time DELETE received:', payload);
          setMessages(prev => [...prev, `DELETE: ID ${payload.old.id}`]);
        }
      )
      .on(
        'broadcast',
        { event: 'test-broadcast' },
        (payload) => {
          console.log('✅ Broadcast received:', payload);
          setMessages(prev => [...prev, `BROADCAST: ${payload.payload.message}`]);
        }
      )
      .subscribe((status) => {
        console.log('🔌 Test subscription status:', status);
        setStatus(status);
      });

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, [courseId]);

  const sendTestBroadcast = () => {
    if (channelRef.current && status === 'SUBSCRIBED') {
      channelRef.current.send({
        type: 'broadcast',
        event: 'test-broadcast',
        payload: { message: `Test broadcast at ${new Date().toLocaleTimeString()}` }
      });
    }
  };

  const insertTestMessage = async () => {
    if (!testMessage.trim()) return;

    console.log('🧪 Inserting test message:', testMessage);
    
    const { data, error } = await supabase
      .from('messages')
      .insert([{
        course_id: courseId,
        sender_id: 'test-user-id',
        content: testMessage,
        message_type: 'text'
      }])
      .select();

    if (error) {
      console.error('❌ Error inserting test message:', error);
      setMessages(prev => [...prev, `ERROR: ${error.message}`]);
    } else {
      console.log('✅ Test message inserted:', data);
      setTestMessage('');
    }
  };

  return (
    <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 m-4">
      <h3 className="text-lg font-bold text-yellow-800 mb-3">🧪 Real-Time Test Panel</h3>
      
      <div className="mb-3">
        <span className="font-semibold">Status: </span>
        <span className={`px-2 py-1 rounded text-sm font-medium ${
          status === 'SUBSCRIBED' ? 'bg-green-100 text-green-800' :
          status === 'CHANNEL_ERROR' ? 'bg-red-100 text-red-800' :
          'bg-yellow-100 text-yellow-800'
        }`}>
          {status}
        </span>
      </div>

      <div className="mb-3">
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            placeholder="Enter test message..."
            className="flex-1 px-3 py-1 border rounded"
          />
          <button
            onClick={insertTestMessage}
            disabled={!testMessage.trim()}
            className="px-3 py-1 bg-blue-500 text-white rounded disabled:bg-gray-300"
          >
            Insert Message
          </button>
          <button
            onClick={sendTestBroadcast}
            disabled={status !== 'SUBSCRIBED'}
            className="px-3 py-1 bg-green-500 text-white rounded disabled:bg-gray-300"
          >
            Test Broadcast
          </button>
        </div>
      </div>

      <div className="mb-3">
        <h4 className="font-semibold mb-2">Real-time Events Received:</h4>
        <div className="bg-white rounded border max-h-40 overflow-y-auto p-2">
          {messages.length === 0 ? (
            <p className="text-gray-500 italic">No events received yet...</p>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className="text-sm font-mono mb-1 p-1 bg-gray-50 rounded">
                {msg}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="text-xs text-gray-600">
        <p>Course ID: {courseId}</p>
        <p>This panel tests real-time functionality independently of the main Messages component.</p>
      </div>
    </div>
  );
};

export default RealTimeTest;
