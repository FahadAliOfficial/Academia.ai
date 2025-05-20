import { Loader2 } from 'lucide-react' // Importing Lucide icon for loading

export default function LoadingSpinner() {
  return (
    <div className="fixed inset-0 w-full h-full flex items-center justify-center bg-[#F9FAFB]">
      <div className="flex items-center space-x-3 bg-white py-3 px-5 rounded-lg shadow-md">
        {/* Spinning loader */}
        <Loader2 className="animate-spin h-6 w-6 text-[#4F46E5]" />
        <span className="text-[#4F46E5] font-semibold">Loading...</span>
      </div>
    </div>
  )
}
