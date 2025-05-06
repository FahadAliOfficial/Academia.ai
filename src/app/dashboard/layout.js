'use client';
import SidebarTeacher from '@/app/components/SidebarTeacher'
import SidebarStudent from '@/app/components/SidebarStudent'
import useUserSession from '@/app/lib/useUserSession'
import { useState, useEffect } from 'react';
// import SidebarStudent from '@/app/components/SidebarStudent';
// import Navbar from '../components/Navbar'

export default function TeacherDashboardLayout({ children}) {
      const { user, loading } = useUserSession({ redirectIfNoSession: true });
    const [role, setRole] = useState([]);
    useEffect(() => {
        if (user && user.user_metadata?.role) {
          // user.user_metadata.role.toLowerCase();
          setRole(user.user_metadata.role.toLowerCase());
          // Redirect to role-specific page
          // router.push(`/dashboard/${role}`);
        }
      }, [user]);
  return (
    <div className="flex h-screen">
         {/* {showSidebar && <SidebarTeacher />} */}
         {role ==='teacher'&&(
             <SidebarTeacher />

         )}
         {role ==='student'&&(
             <SidebarStudent />

         )}

      <div className="flex-1 flex flex-col">
        {/* <Navbar /> */}
          {children}
      </div>
    </div>
  )
}
