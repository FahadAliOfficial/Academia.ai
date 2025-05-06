// utils/auth.js
import { supabase } from "@/app/lib/supabaseClient";
import { useRouter } from "next/router"; // Use for page redirection

export const checkSession = async () => {
  const { data: session, error } = await supabase.auth.getSession();

  if (error || !session) {
    // Redirect to the login page if no session exists or if there is an error
    window.location.href = "/login";
    return false;
  }
  return true;
};
    