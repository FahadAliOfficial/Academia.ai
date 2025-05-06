'use client'

export default function Loader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F9FAFB]">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-12 h-12 border-4 border-[#4F46E5] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[#4F46E5] font-medium text-sm">Loading, please wait...</p>
      </div>
    </div>
  )
}
