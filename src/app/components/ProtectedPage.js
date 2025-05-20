"use client";
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import LoadingSpinner from './LoadingSpinner';

export default function ProtectedPage({ 
  children,
  requiredRole = null, // null = any authenticated user can access
  redirectTo = '/login'
}) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      setIsLoading(true);
      
      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('User not authenticated, redirecting to login');
        router.push('/login');
        return;
      }
      
      // If no specific role is required, any authenticated user can access
      if (!requiredRole) {
        setIsAuthorized(true);
        setIsLoading(false);
        return;
      }
      
      // Get user's role from metadata
      const userRole = user.user_metadata?.role?.toLowerCase();
      
      // Check if user has the required role
      if (Array.isArray(requiredRole)) {
        // If requiredRole is an array, check if userRole is in the array
        if (requiredRole.map(role => role.toLowerCase()).includes(userRole)) {
          setIsAuthorized(true);
        } else {
          console.log(`Access denied: User is ${userRole}, but needs to be one of ${requiredRole.join(', ')}`);
          router.push('/dashboard');
        }
      } else {
        // If requiredRole is a string, check if userRole matches
        if (userRole === requiredRole.toLowerCase()) {
          setIsAuthorized(true);
        } else {
          console.log(`Access denied: User is ${userRole}, but needs to be ${requiredRole}`);
          router.push('/dashboard');
        }
      }
      
      setIsLoading(false);
    };
    
    checkUser();
  }, [requiredRole, redirectTo, router]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">
      <LoadingSpinner />
    </div>;
  }

  if (!isAuthorized) {
    return null; // Don't render children if not authorized
  }

  return <>{children}</>;
}
