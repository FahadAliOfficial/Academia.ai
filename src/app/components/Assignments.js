import React, { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import AssignmentCard from "./AssignmentCard";
import { Pencil, Trash2, PlusCircle } from "lucide-react";
import useUserSession from "../lib/useUserSession";

const Assignments = ({ id, teacherId }) => {
  const { user } = useUserSession({ redirectIfNoSession: false });  const [assignments, setAssignments] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(null);  const [userRole, setUserRole] = useState(null);
  const [vectorModalOpen, setVectorModalOpen] = useState(false);
  const [vectorStatus, setVectorStatus] = useState("loading"); // 'loading', 'success', 'error'
  const [vectorMessage, setVectorMessage] = useState("");
  const [confirmDeleteModal, setConfirmDeleteModal] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState(null);

  const [newAssignment, setNewAssignment] = useState({
    title: "",
    description: "",
    due_date: "",
    course_id: id,
    max_score: "",
    is_active: true,
  });
  useEffect(() => {
    if (user && user.user_metadata?.role) {
      const role = user.user_metadata.role.toLowerCase();
      setUserRole(role); // Set role based on user metadata
    }
  }, [user]);

  useEffect(() => {
    if (!id) return;

    const fetchAssignments = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("assignments")
        .select("id, title, description, due_date, max_score, is_active")
        .eq("course_id", id);

      if (error) {
        console.error("Error fetching assignments:", error);
      } else {
        const formatted = data.map((item) => ({
          id: item.id,
          due_date: new Date(item.due_date).toLocaleDateString(),
          title: item.title || "Untitled",
          description: item.description || "No description",
          max_score: item.max_score || "N/A",
          is_active: item.is_active || false,
        }));
        setAssignments(formatted);
      }
      setLoading(false);
    };

    fetchAssignments();
  }, [id]);  const handleDelete = async (assignmentId) => {
    // Show confirmation modal instead of browser alert
    const assignment = assignments.find(a => a.id === assignmentId);
    setAssignmentToDelete(assignment);
    setConfirmDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!assignmentToDelete) return;

    setConfirmDeleteModal(false);
    setDeleteLoading(assignmentToDelete.id);
    setVectorModalOpen(true);
    setVectorStatus("loading");
    setVectorMessage("Deleting assignment...");
    
    try {
      const { error } = await supabase
        .from("assignments")
        .delete()
        .eq("id", assignmentToDelete.id);
      
      if (error) {
        console.error("Error deleting assignment:", error);
        setVectorStatus("error");
        setVectorMessage("Failed to delete assignment. Please try again.");
        setTimeout(() => setVectorModalOpen(false), 3000);
        return;
      }
      
      // Update the UI by removing the deleted assignment
      setAssignments(prev => prev.filter((a) => a.id !== assignmentToDelete.id));
      setVectorStatus("success");
      setVectorMessage("Assignment deleted successfully!");
      setTimeout(() => setVectorModalOpen(false), 2000);
      console.log("Assignment deleted successfully");
    } catch (error) {
      console.error("Unexpected error:", error);
      setVectorStatus("error");
      setVectorMessage("An unexpected error occurred. Please try again.");
      setTimeout(() => setVectorModalOpen(false), 3000);
    } finally {
      setDeleteLoading(null);
      setAssignmentToDelete(null);
    }
  };

  const cancelDelete = () => {
    setConfirmDeleteModal(false);
    setAssignmentToDelete(null);
  };
  const handleEdit = (assignmentId) => {
    const assignment = assignments.find((a) => a.id === assignmentId);
    if (assignment) {
      // Parse the date string back to ISO format for the date input
      let formattedDate;
      try {
        // Handle different date formats
        const dateObj = new Date(assignment.due_date);
        if (isNaN(dateObj.getTime())) {
          // If due_date is already in MM/DD/YYYY format, parse it differently
          const parts = assignment.due_date.split('/');
          if (parts.length === 3) {
            const [month, day, year] = parts;
            formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          } else {
            formattedDate = new Date().toISOString().split("T")[0];
          }
        } else {
          formattedDate = dateObj.toISOString().split("T")[0];
        }
      } catch (error) {
        console.error("Date parsing error:", error);
        formattedDate = new Date().toISOString().split("T")[0];
      }
      
      setNewAssignment({
        ...assignment,
        due_date: formattedDate,
        course_id: id,
        is_active: assignment.is_active || false,
      });
      setShowForm(true);
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    const { title, description, course_id, max_score, due_date, is_active } = newAssignment;

    if (!title || !description || !max_score || !due_date) {
      setVectorModalOpen(true);
      setVectorStatus("error");
      setVectorMessage("All fields are required");
      setTimeout(() => setVectorModalOpen(false), 3000);
      return;
    }

    // Show loading modal
    setVectorModalOpen(true);
    setVectorStatus("loading");
    setVectorMessage(newAssignment.id ? "Updating assignment..." : "Creating assignment...");

    if (newAssignment.id) {
      // Update assignment
      const { error } = await supabase
        .from("assignments")
        .update({ title, description, course_id, due_date, max_score, is_active })
        .eq("id", newAssignment.id);

      if (error) {
        console.log("Error updating assignment:", error);
        setVectorStatus("error");
        setVectorMessage("Failed to update assignment. Please try again.");
        setTimeout(() => setVectorModalOpen(false), 3000);
        return;
      } else {
        // Update the UI with properly formatted data
        setAssignments((prev) =>
          prev.map((a) =>
            a.id === newAssignment.id 
              ? {
                  ...a,
                  title,
                  description,
                  max_score,
                  is_active,
                  due_date: new Date(due_date).toLocaleDateString(),
                }
              : a
          )
        );
        setVectorStatus("success");
        setVectorMessage("Assignment updated successfully!");
      }
    } else {
      // Insert new assignment
      const { data, error } = await supabase
        .from("assignments")
        .insert([
          {
            title,
            description,
            course_id,
            max_score,
            due_date,
            is_active,
          },
        ])
        .select();

      if (error) {
        console.log("Error inserting assignment:", error);
        setVectorStatus("error");
        setVectorMessage("Failed to create assignment. Please try again.");
        setTimeout(() => setVectorModalOpen(false), 3000);
        return;
      } else {
        const inserted = data[0];
        setAssignments((prev) => [
          ...prev,
          {
            id: inserted.id,
            due_date: new Date(inserted.due_date).toLocaleDateString(),
            title: inserted.title,
            description: inserted.description,
            max_score: inserted.max_score,
            is_active: inserted.is_active,
          },
        ]);
        setVectorStatus("success");
        setVectorMessage("Assignment created successfully!");
      }
    }

    // Reset form and close modal
    setNewAssignment({
      title: "",
      description: "",
      course_id: "",
      max_score: "",
      due_date: "",
      is_active: true,
    });
    setShowForm(false);
    setTimeout(() => setVectorModalOpen(false), 2000);
  };

  return (
    <div className="assignments-container bg-white shadow-lg p-6 rounded-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-[#4F46E5]">Assignments</h2>
        {userRole === "teacher" && (
          <button
          onClick={() => setShowForm(true)}
          className="flex items-center cursor-pointer gap-2 bg-[#4F46E5] text-white px-4 py-2 rounded hover:bg-[#4338ca] transition"
        >
          <PlusCircle size={20} />
          Add Assignment
        </button>
        )}
      </div>

      {loading ? (
        <p className="text-black">Loading assignments...</p>
      ) : assignments.length === 0 ? (
        <p className="text-[#4F46E5]">No assignments yet.</p>
      ) : (
        <div className="space-y-4">
          {assignments
          .filter((assignment) => {
            if(userRole ==='student'){
              return assignment.is_active;
            }
            return true;
          })
          .map((assignment) => (
            
            <div
              key={assignment.id}
              className="relative group border border-gray-200 p-4 rounded-lg shadow-sm hover:shadow-md transition bg-white"
            >
              
              <AssignmentCard assignment={assignment} />
              {userRole === "teacher" && (
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={() => handleEdit(assignment.id)}
                    className="text-blue-600 hover:scale-110 transition"
                  >
                    <Pencil size={20} />
                  </button>                  <button
                    onClick={() => handleDelete(assignment.id)}
                    disabled={deleteLoading === assignment.id}
                    className={`${
                      deleteLoading === assignment.id 
                        ? 'text-gray-400 cursor-not-allowed' 
                        : 'text-red-500 hover:scale-110'
                    } transition`}
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && userRole === "teacher" && (
        <div className="fixed inset-0 bg-white/30 backdrop-blur-md transition-opacity duration-300 flex items-center justify-center z-50">
          <form
            onSubmit={handleSubmit}
            className="bg-white p-6 rounded-2xl shadow-2xl w-[90%] max-w-md space-y-4"
          >
            <h2 className="text-2xl font-bold text-[#1F2937]">
              {newAssignment.id ? "Edit Assignment" : "Add New Assignment"}
            </h2>

            <input
              type="text"
              placeholder="Title"
              value={newAssignment.title}
              onChange={(e) =>
                setNewAssignment({ ...newAssignment, title: e.target.value })
              }
              className="w-full p-2 border text-black border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
              required
            />

            <textarea
              placeholder="Description"
              value={newAssignment.description}
              onChange={(e) =>
                setNewAssignment({
                  ...newAssignment,
                  description: e.target.value,
                })
              }
              className="w-full p-2 text-black border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
              required
            />            <input
              type="date"
              value={newAssignment.due_date}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => {
                const selectedDate = new Date(e.target.value);
                const today = new Date();
                today.setHours(0, 0, 0, 0); // Reset time to start of day for comparison
                
                if (selectedDate < today) {
                  setVectorModalOpen(true);
                  setVectorStatus("error");
                  setVectorMessage("Cannot select a past date. Please choose today or a future date.");
                  return;
                }
                
                setNewAssignment({ ...newAssignment, due_date: e.target.value });
              }}
              className="w-full p-2 text-black border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
              required
            />

            <input
              type="number"
              placeholder="Max Score"
              value={newAssignment.max_score}
              onChange={(e) =>
                setNewAssignment({
                  ...newAssignment,
                  max_score: e.target.value,
                })
              }
              className="w-full p-2 text-black border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
              required
            />

            <input
              type="checkbox"
              checked={newAssignment.is_active}
              onChange={(e) =>
                setNewAssignment({
                  ...newAssignment,
                  is_active: e.target.checked,
                })
              }
              id="active-checkbox"
            />
            <label htmlFor="active-checkbox" className="text-gray-700 ml-10">
              Active
            </label>

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setNewAssignment({
                    title: "",
                    description: "",
                    due_date: "",
                    course_id: id,
                    max_score: "",
                    is_active: true,
                  });
                }}
                className="text-gray-600 px-4 py-2 cursor-pointer hover:underline transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-[#4F46E5] text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-[#4338ca] transition"
              >
                {newAssignment.id ? "Update" : "Add"}
              </button>
            </div>          </form>
        </div>
      )}      {/* Status Modal */}
      {vectorModalOpen && (
        <div className="fixed inset-0 bg-white/30 backdrop-blur-md flex items-center justify-center z-50 transition-opacity duration-300">
          <div className="bg-white p-6 rounded-xl w-[90%] max-w-md text-center shadow-2xl space-y-4">
            {vectorStatus === "loading" ? (
              <>
                <p className="text-[#4F46E5] text-xl font-semibold">
                  Processing...
                </p>
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#4F46E5] mx-auto"></div>
                <p className="text-gray-600">{vectorMessage}</p>
              </>
            ) : (
              <>
                <p
                  className={`text-xl font-semibold ${
                    vectorStatus === "success"
                      ? "text-green-600"
                      : "text-red-500"
                  }`}
                >
                  {vectorMessage}
                </p>
                <button
                  className="bg-[#4F46E5] text-white px-4 py-2 rounded hover:bg-[#4338ca]"
                  onClick={() => setVectorModalOpen(false)}
                >
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteModal && assignmentToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-300">
          <div className="bg-white p-6 rounded-xl w-[90%] max-w-md text-center shadow-2xl space-y-4">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 size={24} className="text-red-600" />
              </div>
            </div>
            
            <h3 className="text-xl font-semibold text-gray-900">
              Delete Assignment
            </h3>
            
            <p className="text-gray-600">
              Are you sure you want to delete <strong>"{assignmentToDelete.title}"</strong>?
            </p>
            
            <p className="text-sm text-gray-500">
              This action cannot be undone. All data associated with this assignment will be permanently removed.
            </p>
            
            <div className="flex gap-3 justify-center pt-4">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition cursor-pointer"
              >
                Delete Assignment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Assignments;
