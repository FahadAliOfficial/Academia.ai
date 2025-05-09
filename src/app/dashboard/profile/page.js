'use client';
import { useEffect, useState } from "react";
import useUserSession from "@/app/lib/useUserSession";
import { supabase } from "@/app/lib/supabaseClient"; // Make sure this exists

export default function ProfilePage() {
  const { user, loading } = useUserSession({ redirectIfNoSession: true });

  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [role, setRole] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [newApiKey, setNewApiKey] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (user && user.user_metadata?.role) {
        setUserName(user.user_metadata.name?.toLowerCase() || "");
        setUserEmail(user.user_metadata.email?.toLowerCase() || "");
        setRole(user.user_metadata.role || "");

        const localKey = localStorage.getItem("gemini_api_key");
        if (localKey) {
          setApiKey(localKey);
        } else {
          const { data: keyData, error } = await supabase
            .from("user_api_keys")
            .select("api_key")
            .eq("user_id", user.id)
            .single();

          if (keyData?.api_key) {
            setApiKey(keyData.api_key);
            localStorage.setItem("gemini_api_key", keyData.api_key);
          }
        }
      }
    };
    fetchData();
  }, [user]);

  const handleUpdateApiKey = async () => {
    if (!newApiKey) return;
    setUpdating(true);
    const { error } = await supabase
      .from("user_api_keys")
      .upsert({ user_id: user.id, api_key: newApiKey });

    if (!error) {
      setApiKey(newApiKey);
      localStorage.setItem("gemini_api_key", newApiKey);
      setNewApiKey("");
    }
    setUpdating(false);
  };

  const handleDeleteApiKey = async () => {
    const { error } = await supabase
      .from("user_api_keys")
      .delete()
      .eq("user_id", user.id);

    if (!error) {
      setApiKey("");
      localStorage.removeItem("gemini_api_key");
    }
  };

  return (
    <div className="bg-[#F9FAFB] min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-[#1F2937] mb-6">👤 Your Profile</h1>
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
          <div>
            <p className="text-lg font-semibold text-[#4F46E5]">Gemini API Key</p>
            <p className="text-lg text-[#1F2937] font-semibold break-all">
              {apiKey || "—"}
            </p>
            <div className="mt-4 flex gap-2">
              <input
                type="text"
                placeholder="Enter new API key"
                className="border border-black focus:border-[#4F46E5] outline-none text-black p-2 rounded-md w-full"
                value={newApiKey}
                onChange={(e) => setNewApiKey(e.target.value)}
              />
              <button
                className="bg-[#4F46E5] text-white px-4 py-2 rounded-md"
                onClick={handleUpdateApiKey}
                disabled={updating}
              >
                {updating ? "Updating..." : "Update"}
              </button>
              <button
                className="bg-red-500 text-white px-4 py-2 rounded-md"
                onClick={handleDeleteApiKey}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
