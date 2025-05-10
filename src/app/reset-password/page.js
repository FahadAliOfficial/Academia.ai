'use client';
import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  <time datetime="2016-10-25" suppressHydrationWarning />;

  const handleReset = async (e) => {
    e.preventDefault();

    if (password !== confirm) {
      setMessage('❌ Passwords do not match!');
      return;
    }

    const { data, error } = await supabase.auth.updateUser({ password });

    if (error) {
      setMessage(`❌ ${error.message}`);
    } else {
      setMessage('✅ Password updated successfully!');
      setTimeout(() => router.push('/login'), 2000);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="bg-white shadow-xl rounded-2xl p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-[#4F46E5] mb-6 text-center">
          Reset Your Password
        </h2>
        <form onSubmit={handleReset} className="space-y-4">
          <input
            type="password"
            placeholder="New Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-4 py-3 border text-black border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
          />
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            className="w-full px-4 py-3 border text-black border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
          />
          <button
            type="submit"
            className="w-full bg-[#4F46E5] hover:bg-[#4338ca] text-white font-semibold py-3 rounded-lg transition-colors"
          >
            Update Password
          </button>
        </form>
        {message && (
          <p className="mt-4 text-center text-sm text-gray-700">
            {message}
          </p>
        )}
      </div>
    </main>
  );
}
