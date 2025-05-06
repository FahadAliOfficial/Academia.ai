import SidebarStudent from '@/app/components/SidebarStudent'
// import Navbar from '../components/Navbar'

export default function StudentDashboardLayout({ children}) {
  return (
    <div className="flex h-screen">
         {/* {showSidebar && <SidebarTeacher />} */}
      <SidebarStudent />
      <div className="flex-1 flex flex-col">
        {/* <Navbar /> */}
          {children}
      </div>
    </div>
  )
}
