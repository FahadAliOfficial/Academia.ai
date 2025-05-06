import React, { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import AssignmentCard from "./AssignmentCard";
import { Pencil, Trash2, PlusCircle } from "lucide-react";
import useUserSession from "../lib/useUserSession";

const Assignments = ({ id, teacherId }) => {
  const { user } = useUserSession({ redirectIfNoSession: false });
  const [assignments, setAssignments] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState(null);

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
  }, [id]);

  const handleDelete = async (assignmentId) => {
    const { error } = await supabase
      .from("assignments")
      .delete()
      .eq("id", assignmentId);
    if (!error) {
      setAssignments(assignments.filter((a) => a.id !== assignmentId));
    }
  };

  const handleEdit = (assignmentId) => {
    const assignment = assignments.find((a) => a.id === assignmentId);
    if (assignment) {
      // setNewAssignment({ ...assignment, course_id: id });
      const formattedDate = new Date(assignment.due_date)
        .toISOString()
        .split("T")[0]; // YYYY-MM-DD
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
      console.log("All fields are required");
      return;
    }

    if (newAssignment.id) {
      // Update assignment
      const { error } = await supabase
        .from("assignments")
        .update({ title, description, course_id, due_date, max_score, is_active })
        .eq("id", newAssignment.id);

      if (error) {
        console.log("Error updating assignment:", error);
      } else {
        setAssignments((prev) =>
          prev.map((a) =>
            a.id === newAssignment.id ? { ...newAssignment } : a
          )
        );
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
      }
    }

    setNewAssignment({
      title: "",
      description: "",
      course_id: "",
      max_score: "",
      due_date: "",
      is_active: true,
    });
    setShowForm(false);
  };

  return (
    <div className="assignments-container bg-white shadow-lg p-6 rounded-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-[#4F46E5]">Assignments</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-[#4F46E5] text-white px-4 py-2 rounded hover:bg-[#4338ca] transition"
        >
          <PlusCircle size={20} />
          Add Assignment
        </button>
      </div>

      {loading ? (
        <p>Loading assignments...</p>
      ) : assignments.length === 0 ? (
        <p className="text-[#4F46E5]">No assignments yet.</p>
      ) : (
        <div className="space-y-4">
          {assignments.map((assignment) => (
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
                  </button>
                  <button
                    onClick={() => handleDelete(assignment.id)}
                    className="text-red-500 hover:scale-110 transition"
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form
            onSubmit={handleSubmit}
            className="bg-white p-6 rounded-2xl shadow-lg w-[90%] max-w-md space-y-4"
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
            />

            <input
              type="date"
              value={newAssignment.due_date}
              onChange={(e) =>
                setNewAssignment({ ...newAssignment, due_date: e.target.value })
              }
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
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Assignments;
