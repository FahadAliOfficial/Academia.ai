"use client"; // Marking this as a client-side component

import { useState, useEffect } from "react"; // Ensure useEffect is imported
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/navigation";
import useUserSession from "../lib/useUserSession";
import LoadingSpinner from "../components/LoadingSpinner";

export default function LoginPage() {
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false); // For loading state
  const [errorMessage, setErrorMessage] = useState(""); // For error messages
  const { user } = useUserSession();
  const router = useRouter();
  
  
  
  
  useEffect(() => {
    <time datetime="2016-10-25" suppressHydrationWarning />;
    if (user) {
      router.push("/dashboard");
    }
  }, [user, router]);
  

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true); // Start loading state
    setErrorMessage(""); // Clear any previous errors

    try {
      const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMessage("Invalid credentials. Please try again."); // Set the error message if login fails
        setLoading(false); // Stop loading state
        return;
      }

      // Fetch user role
      const userId = data.user.id;
      const { data: userDetails, error: userError } = await supabase
        .from("users")
        .select("role")
        .eq("id", userId)
        .single();

      if (userError) {
        setErrorMessage("Failed to fetch user role.");
        setLoading(false);
        return;
      }

      const role = userDetails.role;
      router.push(`/dashboard/`); // Redirect to the user's dashboard
      setLoading(false); // Stop loading state
    } catch (err) {
      setErrorMessage("An unexpected error occurred. Please try again later.");
      setLoading(false);
    }
  };

    if(loading) return <LoadingSpinner />

  return (
    <main className="flex items-center justify-center min-h-screen bg-[#F9FAFB]">
      <div className="bg-white p-6 rounded-lg shadow-lg w-80 text-center">
        <div className="border-2 border-dashed border-[#4F46E5] p-3 text-[#4F46E5] font-bold mb-4">
          Your Logo Here
        </div>
        <form onSubmit={handleLogin}>
          <label className="block text-left text-sm font-bold mt-2 text-[#1F2937]">
            Username or email address <span className="text-[#F43F5E]">*</span>
          </label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="text"
            required
            className="w-full p-2 border text-black border-[#E5E7EB] rounded mt-1 focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]"
          />
          <label className="block text-left text-sm font-bold mt-3 text-[#1F2937]">
            Password <span className="text-[#F43F5E]">*</span>
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full p-2 border text-black border-[#E5E7EB] rounded mt-1 focus:outline-none focus:ring-2 focus:ring-[#0EA5E9]"
          />
          {errorMessage && (
            <p className="text-red-500 text-xs mt-2">{errorMessage}</p>
          )}{" "}
          {/* Error Message */}
          <p className="text-left text-xs text-[#6B7280] mt-2">
            <a href="../forget-password" className="hover:text-[#4F46E5]">
              Forgot password?
            </a>
          </p>
          <p className="text-left text-xs text-[#6B7280] mt-1">
            <a href="../register" className="hover:text-[#4F46E5]">
              Create an account
            </a>
          </p>
          <button
            type="submit"
            disabled={loading} // Disable button while loading
            className="w-full bg-[#4F46E5] hover:bg-[#0EA5E9] text-white font-bold py-2 rounded mt-3 cursor-pointer transition-colors duration-200"
          >
            {loading ? "Logging In..." : "Login"}{" "}
            {/* Button text changes during loading */}
          </button>
        </form>
      </div>
    </main>
  );
}

// import { useEffect } from 'react';
// import { supabase } from '../lib/supabaseClient';

// export default function TestConnection() {
//   useEffect(() => {
//     const checkDBConnection = async () => {
//       const { data, error } = await supabase.from('users').select('*').limit(1);

//       if (error) {
//         console.error('❌ Supabase DB connection failed:', error.message);
//       } else {
//         console.log('✅ Supabase DB connected! Sample user:', data);
//       }
//     };

//     checkDBConnection();
//   }, []);

//   return <div>Check console for DB connection status.</div>;
// }
// import { login, signup } from './actions'

// export default function LoginPage() {
//   return (
//     <form>
//       <label htmlFor="email">Email:</label>
//       <input id="email" name="email" type="email" required />
//       <label htmlFor="password">Password:</label>
//       <input id="password" name="password" type="password" required />
//       <button formAction={login}>Log in</button>
//       <button formAction={signup}>Sign up</button>
//     </form>
//   )
// }
