import { supabase } from "@/app/lib/supabaseClient";

// Messages
export const getMessagesByCourse = (courseId) =>
  supabase.from("messages").select("id, sender_id, content, sent_at").eq("course_id", courseId);

export const insertMessage = ({ courseId, senderId, content }) =>
  supabase.from("messages").insert([{ course_id: courseId, sender_id: senderId, content, message_type: "text" }]);

export const updateMessage = (messageId, newContent) =>
  supabase.from("messages").update({ content: newContent }).eq("id", messageId);

export const deleteMessage = (messageId) =>
  supabase.from("messages").delete().eq("id", messageId);

// Enrollments
export const getEnrollmentsByCourse = (courseId) =>
  supabase.from("enrollments").select(`id, enrolled_at, courses (id, title), users (id, name)`).eq("course_id", courseId);

export const insertEnrollment = ({ studentId, courseId }) =>
  supabase.from("enrollments").insert([{ user_id: studentId, course_id: courseId }]);

export const deleteEnrollment = (enrollmentId) =>
  supabase.from("enrollments").delete().eq("id", enrollmentId);

// Enrollment Requests
export const getPendingRequests = (courseId) =>
  supabase
    .from("enrollment_requests")
    .select(`
      id,
      requested_at,
      students:student_id (id, name),
      courses:course_id (id, created_by, title)
    `)
    .eq("course_id", courseId)
    .eq("status", "pending");

export const deleteEnrollmentRequest = (requestId) =>
  supabase.from("enrollment_requests").delete().eq("id", requestId);

// Assignments
export const getAssignmentsByCourse = (courseId) =>
  supabase.from("assignments").select("id, title, description, due_date").eq("course_id", courseId);
