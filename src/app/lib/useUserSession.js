"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "./supabaseClient";

export default function useUserSession({ redirectIfNoSession = false } = {}) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const getSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) {
        if (redirectIfNoSession) {
          router.push("/login");
        }
        setUser(null);
        setLoading(false);
        return;
      }

      setUser(data.session.user);
      setLoading(false);
    };

    getSession();
  }, [redirectIfNoSession, router]);

  return { user, loading };
}
