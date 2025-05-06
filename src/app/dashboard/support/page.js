"use client";
import { useEffect, useState } from "react";
import useUserSession from "@/app/lib/useUserSession";

export default function SupportPage() {
  const { user, loading } = useUserSession({ redirectIfNoSession: true });

  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    if (user) {
      setUserName(user.user_metadata.name?.toLowerCase() || "");
      setUserEmail(user.user_metadata.email?.toLowerCase() || "");
    }
  }, [user]);

  return (
    <div className="bg-[#F9FAFB] min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-[#1F2937] mb-6">
          🛠️ Support & Developer Info
        </h1>
        <h3 className="text-lg font-semibold mb-10 text-[#4F46E5]">
          Need help? I'm here for you!
        </h3>

        <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-200 space-y-6">
          <div>
            <p className="text-lg font-semibold text-[#4F46E5]">👨‍💻 Developer</p>
            <p className="text-lg text-[#1F2937] font-semibold">Fahad Ali</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-[#4F46E5]">📧 Contact</p>
            <p className="text-lg text-[#1F2937] font-semibold">
              fahadaliofficials@gmail.com
            </p>
          </div>
          <div>
            <p className="text-lg font-semibold text-[#4F46E5]">🔗 LinkedIn</p>
            <a
              href="https://www.linkedin.com/in/fahaddali/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-lg text-[#1F2937] font-semibold hover:underline"
            >
              https://www.linkedin.com/in/fahaddali/
            </a>
          </div>

          <div>
            <p className="text-lg font-semibold text-[#4F46E5]">
              📜 About This App
            </p>
            <p className="text-base text-[#374151]">
              This platform was developed to simplify and enhance the teaching
              experience. If you face any issues or have suggestions, feel free
              to reach out. I built this with love, clean code, and a strong cup
              of chai ☕.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
