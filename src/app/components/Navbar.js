'use client'

import Link from 'next/link'

export default function Navbar() {
  return (
    <header className="w-full bg-[#F9FAFB] border-b border-[#E5E7EB] px-6 py-4 flex items-center justify-between shadow-sm">
      <div className="text-2xl font-bold text-[#4F46E5]">EduPlatform</div>

      <nav className="flex items-center space-x-6 text-sm font-medium">
        <Link
          href="/profile"
          className="text-[#374151] hover:text-[#4F46E5] transition-colors"
        >
          Profile
        </Link>
        <Link
          href="/support"
          className="text-[#374151] hover:text-[#4F46E5] transition-colors"
        >
          Help
        </Link>
      </nav>
    </header>
  )
}
