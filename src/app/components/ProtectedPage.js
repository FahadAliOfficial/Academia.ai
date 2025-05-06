"use client";
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function ProtectedPage({ children }) {
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) router.push('/login');
    };
    checkUser();
  }, []);

  return <>{children}</>;
}
