'use client';
import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/navigation';


export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', confirm: '', role: 'student',
  });

  const handleChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();

    if (formData.password !== formData.confirm) {
      alert('Passwords do not match!');
      return;
    }

    const { email, password, name, role } = formData;
    

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role, name },
      },
    });

    if (signUpError) {
      alert(signUpError.message);
      return;
    }

    const user = signUpData.user;
    if (user) {
      const { error: insertError } = await supabase.from('users').insert([
        {
          id: user.id,
          name,
          email,
          role,
        },
      ]);

      if (insertError) {
        alert(`User created, but failed to save extra data: ${insertError.message}`);
        return;
      }

      alert('Signup successful!');
      router.push('/login');
    }
  };
  return (
    <main className="flex items-center justify-center min-h-screen bg-[#F9FAFB]">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96 text-center">
        <div className="border-2 border-dashed border-[#4F46E5] p-3 text-[#4F46E5] font-bold mb-4">
          Your Logo Here
        </div>
        <form onSubmit={handleSubmit}>
              <label className="block text-left text-sm font-bold mt-2 text-[#1F2937]">
                Full Name <span className="text-[#F43F5E]">*</span>
              </label>
              <input
                name="name"
                onChange={handleChange}
                type="text"
                required
                className="text-black w-full p-2 border border-[#E5E7EB] rounded mt-1 focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]"
              />
            

          <label className="block text-left text-sm font-bold mt-3 text-[#1F2937]">
            Email address <span className="text-[#F43F5E]">*</span>
          </label>
          <input
            name="email"
            onChange={handleChange}
            type="email"
            required
            className="text-black w-full p-2 border border-[#E5E7EB] rounded mt-1 focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]"
          />

          <label className="block text-left text-sm font-bold mt-3 text-[#1F2937]">
            Password <span className="text-[#F43F5E]">*</span>
          </label>
          <input
            name="password"
            onChange={handleChange}
            type="password"
            required
            className="text-black w-full p-2 border border-[#E5E7EB] rounded mt-1 focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]"
          />

          <label className="block text-left text-sm font-bold mt-3 text-[#1F2937]">
            Confirm Password <span className="text-[#F43F5E]">*</span>
          </label>
          <input
            name="confirm"
            onChange={handleChange}
            type="password"
            required
            className="text-black w-full p-2 border border-[#E5E7EB] rounded mt-1 focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]"
          />

          <label className="block text-left text-sm font-bold mt-3 text-[#1F2937]">
            You are a:
          </label>
          <select
            name="role"
            onChange={handleChange}
            required
            className="w-full p-2 border border-[#E5E7EB] rounded mt-1 focus:outline-none focus:ring-2 focus:ring-[#0EA5E9] text-[#1F2937]"
          >
            <option value="">Select Role</option>
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
          </select>

          <a
            href="../login"
            className="block text-left text-xs text-[#6B7280] mt-2 hover:text-[#4F46E5]"
          >
            Already have an account?
          </a>
          <button
            type="submit"
            className="w-full bg-[#4F46E5] hover:bg-[#0EA5E9] text-white font-bold py-2 rounded mt-3"
          >
            Signup
          </button>
        </form>
      </div>
    </main>
  );

}
