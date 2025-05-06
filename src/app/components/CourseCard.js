// components/CourseCard.js
import Link from 'next/link';

export default function CourseCard({ course }) {
  const formattedDate = new Date(course.created_at).toLocaleDateString(); // Format the date as needed
  
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-lg shadow-md p-6 hover:shadow-lg hover:border-[#4F46E5] transition-all duration-300">
      {/* Course Thumbnail */}
      {course.thumbnail_url && (
        <img
          src={course.thumbnail_url}
          alt={course.title}
          className="w-full h-40 object-cover rounded-lg mb-4"
        />
      )}

      {/* Course Title */}
      <h2 className="text-2xl font-semibold text-[#1F2937]">{course.title}</h2>

      {/* Course Description */}
      <p className="text-sm text-[#6B7280] mt-2">{course.description}</p>

      {/* Course Instructor */}
      <p className="text-xs text-[#9CA3AF] mt-3">Instructor: {course.teacher}</p>

      {/* Course Creation Date */}
      <p className="text-xs text-[#9CA3AF] mt-1">Created on: {formattedDate}</p>

      {/* View Course Link */}
      <Link
        href={`../../pages/course/${course.id}`}
        className="inline-block mt-6 px-6 py-2 bg-[#4F46E5] hover:bg-[#4338ca] text-white text-sm font-semibold rounded-md transition-all duration-200"
      >
        View Course
      </Link>
    </div>
  );
}
