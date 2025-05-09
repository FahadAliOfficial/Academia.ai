'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { LogOut } from 'lucide-react'    // Adding icon for logout
import { supabase } from "../lib/supabaseClient"; // Make sure to import supabase

const navItems = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'My Courses', href: '/dashboard/teacher/courses-bar' },
  { name: 'Assignment', href: '/dashboard/teacher/assignment-bar' },
  // { name: 'Grades', href: '/dashboard/teacher/grades' },
  { name: 'Chatbot', href: '/dashboard/chat-bot'},
  { name: 'Live Class', href: '/dashboard/LiveClass'},
  { name: 'Profile', href: '/dashboard/profile' },
  { name: 'Support', href: '/dashboard/support' },
]


export default function SidebarTeacher() {
  const pathname = usePathname()
  const router = useRouter()

  // State to handle logout confirmation
  const [showConfirm, setShowConfirm] = useState(false)

  // const handleLogout = () => {
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut(); // Sign out user
    localStorage.clear(); // This clears all items in localStorage
    if (error) {
      alert("Error logging out: " + error.message); // Show error if logout fails
    } else {
      
      router.push("/login"); // Redirect to login page
    }
  }

  const handleShowConfirm = () => setShowConfirm(true)
  const handleCancel = () => setShowConfirm(false)

  return (
    <aside className="w-64 h-screen bg-[#F9FAFB] border-r border-[#E5E7EB] flex flex-col shadow-md">
      <div className="text-xl font-bold text-[#4F46E5] p-5 border-b border-[#E5E7EB]">
        Teacher Panel
      </div>
      <nav className="flex-1 px-4 py-3 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`block px-4 py-2 rounded-md text-sm font-medium transition-all ${
              pathname === item.href
                ? 'bg-[#4F46E5] text-white'
                : 'text-[#374151] hover:bg-[#E0E7FF] hover:text-[#4F46E5]'
            }`}
          >
            {item.name}
          </Link>
        ))}
      </nav>

      {/* Logout Section */}
      {showConfirm ? (
        <div className="m-4 mt-auto bg-white p-4 rounded-md shadow-md space-y-2">
          <p className="text-sm text-gray-700">Are you sure you want to log out?</p>
          <div className="flex justify-between space-x-2">
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-md bg-[#F43F5E] hover:bg-[#E11D48] text-white font-semibold transition cursor-pointer"
            >
              Yes, Log Out
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2 rounded-md bg-[#D1D5DB] hover:bg-[#9CA3AF] text-[#374151] font-semibold transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={handleShowConfirm}
          className="m-4 mt-auto px-4 py-2 rounded-md bg-[#F43F5E] hover:bg-[#E11D48] text-white font-semibold transition flex items-center space-x-2 cursor-pointer"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      )}
    </aside>
  )
}
