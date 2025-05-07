'use client'

import { useRouter } from 'next/navigation'

export default function CourseNavbar({ activeTab, setActiveTab }) {
  const router = useRouter()

  return (
    <nav className="bg-white shadow px-8 py-4 flex justify-between items-center">
      <div className="flex items-center gap-2">
        <button onClick={() => router.back()} className="text-white px-4 py-2 bg-[#4F46E5] hover:bg-[#4338ca] transition duration-300 rounded-sm cursor-pointer">
          ← Back
        </button>
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => setActiveTab('messages')}
          className={`py-2 px-4 rounded cursor-pointer ${activeTab === 'messages' ? 'bg-[#4F46E5] text-white' : 'text-gray-700 hover:bg-gray-200'}`}
        >
          Messages
        </button>
        
        <button
          onClick={() => setActiveTab('material')}
          className={`py-2 px-4 rounded cursor-pointer ${activeTab === 'material' ? 'bg-[#4F46E5] text-white' : 'text-gray-700 hover:bg-gray-200'}`}
        >
          Course Material
        </button>
        <button
          onClick={() => setActiveTab('assignments')}
          className={`py-2 px-4 rounded cursor-pointer ${activeTab === 'assignments' ? 'bg-[#4F46E5] text-white' : 'text-gray-700 hover:bg-gray-200'}`}
        >
          Assignments
        </button>
        <button
          onClick={() => setActiveTab('enrollments')}
          className={`py-2 px-4 rounded cursor-pointer  ${activeTab === 'enrollments' ? 'bg-[#4F46E5] text-white' : 'text-gray-700 hover:bg-gray-200'}`}
        >
          Enrollments
        </button>
      </div>
    </nav>
  )
}
