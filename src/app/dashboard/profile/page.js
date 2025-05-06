'use client';
import useUserSession from "@/app/lib/useUserSession";
import { useEffect, useState } from "react";

export default function ProfilePage() {
  const { user, loading } = useUserSession({ redirectIfNoSession: true });

  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [role, setRole] = useState("");

  useEffect(() => {
    if (user && user.user_metadata?.role) {
      setUserName(user.user_metadata.name?.toLowerCase() || "");
      setUserEmail(user.user_metadata.email?.toLowerCase() || "");
      setRole(user.user_metadata.role || "");
    }
  }, [user]);

  return (
    <div className="bg-[#F9FAFB] min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-[#1F2937] mb-6">
      👤 Your Profile
      </h1>
        <h3 className="text-lg font-semibold mb-10 text-[#4F46E5]">Manage your personal information.</h3>

        <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-200 space-y-6">
          <div>
            <p className="text-lg font-semibold text-[#4F46E5]">Name</p>
            <p className="text-lg text-[#1F2937] font-semibold">{userName || "—"}</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-[#4F46E5]">Email</p>
            <p className="text-lg text-[#1F2937] font-semibold">{userEmail || "—"}</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-[#4F46E5]">Role</p>
            <p className="text-lg text-[#1F2937] font-semibold capitalize">{role || "—"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
