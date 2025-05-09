'use client' // Ensure this runs only on the client side

import React, { useState } from "react";
import { Video } from "lucide-react";
import { useRouter } from "next/navigation"; // Using `next/navigation` in Next.js 13+ for app routing

const LiveClassCard = ({ liveClass }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  // Handle opening the modal
  const handleJoinClass = () => {
    setIsModalOpen(true);
  };

  // Handle closing the modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  // Handle joining the class
  const handleJoin = () => {
    setIsModalOpen(false); // Close the modal
    localStorage.setItem("liveClassData", JSON.stringify(liveClass)); // Store class data in localStorage
    router.push(`/dashboard/LiveClass/join/${liveClass.meeting_link}`); // Navigate to the class room
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

      {/* Modal for class call */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-lg w-[90%] max-w-lg space-y-4">
            <h2 className="text-2xl font-bold text-[#1F2937]">{liveClass.title}</h2>
            <p className="text-sm text-gray-500">
              Scheduled: {new Date(liveClass.scheduled_at).toLocaleString()}
            </p>
            <p className="text-sm text-gray-600">Meeting Link:</p>
            <a
              // href={}
              // target="_blank"
              // rel="noopener noreferrer"
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
