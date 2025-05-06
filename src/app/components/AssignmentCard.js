// components/AssignmentCard.js
import Link from "next/link";
import { useEffect, useState } from "react";
import useUserSession from "../lib/useUserSession";

export default function AssignmentCard({ assignment }) {
  const { user } = useUserSession({ redirectIfNoSession: false });
  const [role, setRole] = useState(null);
  useEffect(() => {
    if (!user) return;
    const role = user.user_metadata.role;
    setRole(role);
  }, [user]);
  return (
    <div className="bg-white p-3">
      <div className="flex justify-between items-center mb-4">
        {assignment.is_active && role == "teacher" && (
          <div className="bg-green-100 border border-green-400 text-green-700 rounded-full w-32 p-1">
            ✅ Active
          </div>
        )}
        {!assignment.is_active && role == "teacher" && (
          <div className="bg-green-100 border border-red-400 text-red-700 rounded-full w-32 p-1">
            ❌ Inactive
          </div>
        )}
      </div>
      <h2 className="text-lg font-bold text-[#1F2937]">{assignment.title}</h2>
      <p className="text-sm text-[#6B7280] mt-2">{assignment.description}</p>
      <p className="text-xs text-[#9CA3AF] mt-3">Due: {assignment.due_date}</p>
      {role == "teacher" && (
        <Link
          href={`../assignment/submissionList/${assignment.id}`}
          className="inline-block mt-4 px-4 py-2 bg-[#4F46E5] hover:bg-[#4338ca]  duration-300 text-white text-sm font-semibold rounded transition-colors"
        >
          View Assignment
        </Link>
      )}
      {role == "student" && (
        <Link
          href={`../assignment/${assignment.id}`}
          className="inline-block mt-4 px-4 py-2 bg-[#4F46E5] hover:bg-[#4338ca]  duration-300 text-white text-sm font-semibold rounded transition-colors"
        >
          View Assignment
        </Link>
      )}
    </div>
  );
}
