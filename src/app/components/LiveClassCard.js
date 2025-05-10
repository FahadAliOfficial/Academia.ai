'use client'

import React, { useState, useEffect } from "react";
import { Video } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";
import useUserSession from "@/app/lib/useUserSession";

const LiveClassCard = ({ liveClass }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();
  const { user } = useUserSession({ redirectIfNoSession: true });
  const [userRole, setRole] = useState([])
  useEffect(() => {
    if (user && user.user_metadata?.role) {
      setRole(user.user_metadata.role.toLowerCase());
    }
  }, [user]);
  const handleJoinClass = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleJoin = async () => {
    if(!user) return;
    if(userRole === 'teacher'){
      const { data, error } = await supabase
      .from('live_classes')
      .update({ is_active: 'true' }) 
      .eq('id', liveClass.id);
      if(error) console.log("Error while updating the Class live: ", error);
    }
    setIsModalOpen(false);
    
    localStorage.setItem("liveClassData", JSON.stringify(liveClass)); 
    router.push(`/dashboard/LiveClass/join/${liveClass.meeting_link}`);
  };

  return (
    <div className="space-y-2">
      <h3 className="text-xl font-semibold text-gray-800">{liveClass.title}</h3>
      <p className="text-sm text-gray-500">
        Scheduled: {new Date(liveClass.scheduled_at).toLocaleString()}
      </p>
      <button
        onClick={handleJoinClass}
        className="inline-flex items-center gap-2 text-blue-600 hover:underline font-medium"
      >
        <Video size={18} /> Join Class
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-lg w-[90%] max-w-lg space-y-4">
            <h2 className="text-2xl font-bold text-[#1F2937]">{liveClass.title}</h2>
            <p className="text-sm text-gray-500">
              Scheduled: {new Date(liveClass.scheduled_at).toLocaleString()}
            </p>
            <p className="text-sm text-gray-600">Meeting Link:</p>
            <a
              className="text-blue-600 hover:underline"
            >
              {liveClass.meeting_link}
            </a>
            <div className="flex justify-between mt-4">
              <button
                onClick={handleCloseModal}
                className="cursor-pointer text-gray-600 hover:underline"
              >
                Close
              </button>
              <button
                onClick={handleJoin}
                className="cursor-pointer bg-[#4F46E5] text-white px-4 py-2 rounded-lg hover:bg-[#4338ca] transition"
              >
                Join Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveClassCard;
