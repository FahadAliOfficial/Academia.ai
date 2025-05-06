'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'

import Enrollments from '@/app/components/Enrollments'
import Assignments from '@/app/components/Assignments'
import CourseNavbar from '@/app/components/courseNavbar'
import Messages from '@/app/components/Messages'

export default function CourseDetailPage() {
  const { id } = useParams()
  const [activeTab, setActiveTab] = useState('messages')

  useEffect(() => {
    if (!id) return

  }, [id])

return (
  <div className="min-h-screen bg-[#F9FAFB]">
    <CourseNavbar activeTab={activeTab} setActiveTab={setActiveTab} />

    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h2 className="text-2xl font-bold text-[#1F2937] mb-6">Course Details</h2>

      {activeTab === 'messages' && <Messages id={id} />}
      {activeTab === 'enrollments' && <Enrollments id={id}/>}
      {activeTab === 'assignments' && <Assignments id={id} />}
    </div>
  </div>
)

}
