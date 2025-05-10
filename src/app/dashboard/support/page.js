"use client";
import { useEffect, useState } from "react";
import useUserSession from "@/app/lib/useUserSession";
import { Github, Mail, Linkedin, Code } from "lucide-react";

export default function SupportPage() {
  const { user, loading } = useUserSession({ redirectIfNoSession: true });

  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isTeacher, setIsTeacher] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); 
  const [formStatus, setFormStatus] = useState(""); 

  useEffect(() => {
    if (user) {
      setUserName(user.user_metadata.name?.toLowerCase() || "");
      setUserEmail(user.user_metadata.email?.toLowerCase() || "");
      setIsTeacher(user.user_metadata.role === "teacher"); 
    }
  }, [user]);

  const handleMessageSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormStatus("");

    if (!message || !userName || !userEmail) {
      setFormStatus("Please fill in all fields.");
      setIsSubmitting(false);
      return;
    }

    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setFormStatus("Your message has been sent successfully!");
      setMessage(""); 
    } catch (error) {
      setFormStatus("There was an error sending your message.");
    }
    setIsSubmitting(false);
  };

  return (
    <div className="bg-[#F9FAFB] min-h-screen p-8 overflow-auto">
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
              className="text-lg text-[#1F2937] font-semibold hover:underline flex items-center gap-2"
            >
              <Linkedin size={20} />
              https://www.linkedin.com/in/fahaddali/
            </a>
          </div>

          <div>
            <p className="text-lg font-semibold text-[#4F46E5]">📜 About This App</p>
            <p className="text-base text-[#374151]">
              This platform was developed to simplify and enhance the teaching
              experience. If you face any issues or have suggestions, feel free
              to reach out. I built this with love, clean code, and a strong cup
              of chai ☕.
            </p>
          </div>

          <div className="mt-10">
            {isTeacher ? (
              <div>
                <h4 className="text-xl font-semibold text-[#4F46E5]">👨‍🏫 For Teachers</h4>
                <p className="text-base text-[#374151]">
                  As a teacher, you can manage your courses, review submissions, and interact with students seamlessly.
                </p>
              </div>
            ) : (
              <div>
                <h4 className="text-xl font-semibold text-[#4F46E5]">👩‍🎓 For Students</h4>
                <p className="text-base text-[#374151]">
                  As a student, you can track your courses, assignments, and progress. If you have any questions, don't hesitate to ask.
                </p>
              </div>
            )}
          </div>

          <div className="mt-10">
            <p className="text-lg font-semibold text-[#4F46E5] mb-5">📬 Send a Message</p>
            <form className="space-y-4" onSubmit={handleMessageSubmit}>
              <input
                type="text"
                className="w-full p-3 border text-black border-gray-300 rounded-xl focus:border-[#4F46E5] outline-none"
                placeholder="Your Name"
                value={userName}
                disabled
              />
              <input
                type="email"
                className="w-full p-3 border text-black border-gray-300 rounded-xl focus:border-[#4F46E5] outline-none"
                placeholder="Your Email"
                value={userEmail}
                disabled
              />
              <textarea
                className="w-full p-3 border text-black border-gray-300 rounded-xl focus:border-[#4F46E5] outline-none"
                rows="4"
                placeholder="Your Message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <button
                type="submit"
                className="w-full bg-[#4F46E5] text-white py-3 rounded-xl"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Sending..." : "Send Message"}
              </button>
            </form>

            {formStatus && (
              <p className="mt-4 text-center text-lg font-semibold text-[#1F2937]">
                {formStatus}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
