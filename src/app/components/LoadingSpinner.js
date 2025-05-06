import { Loader2 } from 'lucide-react' // Importing Lucide icon for loading

export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-screen bg-[#F9FAFB]">
      <div className="flex items-center space-x-2">
        {/* Spinning loader */}
        <Loader2 className="animate-spin h-8 w-8 text-[#4F46E5]" />
        <span className="text-[#4F46E5] font-semibold">Loading...</span>
      </div>
    </div>
  )
}
