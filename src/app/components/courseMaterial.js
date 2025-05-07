import React, { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import { FlipHorizontal, PlusCircle, Trash2 } from "lucide-react";
import useUserSession from "../lib/useUserSession";

const CourseMaterials = ({ id }) => {
  const { user } = useUserSession({ redirectIfNoSession: false });
  const [materials, setMaterials] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [newMaterial, setNewMaterial] = useState({
    description: "",
    file: null,
    course_id: id,
  });

  useEffect(() => {
    if (user?.user_metadata?.role) {
      setUserRole(user.user_metadata.role.toLowerCase());
    }
  }, [user]);

  useEffect(() => {
    const fetchMaterials = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("course_materials")
        .select("id, description, file_url")
        .eq("course_id", id);

      if (error) {
        console.error("Error fetching materials:", error);
      } else {
        setMaterials(data);
      }
      setLoading(false);
    };

    fetchMaterials();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { description, file } = newMaterial;
    if (!description || !file) return;

    setUploading(true);

    const fileExt = file.name.split(".").pop();
    const fileName = `${file.name.split(".")[0]}.${fileExt}`;
    const filePath = `${id}/files/${fileName}`;

    // 1. Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("course-materials")
      .upload(filePath, file);

      if(uploadError?.message.includes("already exists")){
        alert("This file has already upload!");
        return;
      }
    if (uploadError) {
      console.error("Error uploading file:", uploadError);
      setUploading(false);
      return;
    }

    // 2. Get Public URL
    const { data: publicUrlData } = supabase.storage
      .from("course-materials")
      .getPublicUrl(filePath);

    const file_url = publicUrlData.publicUrl;

    // 3. Save metadata in DB
    const { data, error } = await supabase
      .from("course_materials")
      .insert([{ description, file_url, course_id: id }])
      .select();

    if (error) {
      console.error("Error saving material info:", error);
    } else {
      setMaterials([...materials, data[0]]);
    }

    setUploading(false);
    setShowForm(false);
    setNewMaterial({
      description: "",
      file: null,
      course_id: id,
    });
  };

  const handleDelete = async (materialId, fileUrl) => {
    try {
      if (!fileUrl) {
        console.error("Missing file URL");
        return;
      }
  
      const fileName = fileUrl.split("/").pop();
      const filePath = `course-materials/${id}/files/${decodeURIComponent(fileName)}`;
  
      console.log("Deleting file at:", filePath); // Log the file path to ensure it's correct
  
      // Attempt to remove the file from Supabase storage
      const { error: storageError } = await supabase.storage
        .from("course-materials")
        .remove([filePath]);
  
      if (storageError) {
        console.error("Storage deletion error:", storageError.message);
        return;
      }
  
      // If file is deleted, proceed to delete from database
      const { error: dbError } = await supabase
        .from("course_materials")
        .delete()
        .eq("id", materialId);
  
      if (dbError) {
        console.error("Database deletion error:", dbError.message);
        return;
      }
  
      // Update local state
      setMaterials((prev) => prev.filter((mat) => mat.id !== materialId));
  
    } catch (err) {
      console.error("Unexpected error:", err);
    }
  };
  
  
  return (
    <div className="bg-white shadow-lg p-6 rounded-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#4F46E5]">Course Materials</h2>
        {userRole === "teacher" && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-[#4F46E5] text-white px-4 py-2 rounded hover:bg-[#4338ca] transition"
          >
            <PlusCircle size={20} />
            Add Material
          </button>
        )}
      </div>

      {loading ? (
        <p>Loading materials...</p>
      ) : materials.length === 0 ? (
        <p className="text-[#4F46E5]">No course materials uploaded yet.</p>
      ) : (
        <ul className="space-y-4">
          {materials.map((mat) => (
            <li
              key={mat.id}
              className="relative border border-gray-200 p-4 rounded-lg shadow-sm hover:shadow-md transition bg-white"
            >
              <p className="text-gray-600 mb-2">{mat.description}</p>
              <a
                href={mat.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                View Material
              </a>


              {userRole === "teacher" && (
                <button
                  onClick={() => handleDelete(mat.id, mat.file_url)}
                  className="absolute top-4 right-4 text-red-500 hover:scale-110 transition"
                >
                  <Trash2 size={20} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {showForm && userRole === "teacher" && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form
            onSubmit={handleSubmit}
            className="bg-white p-6 rounded-2xl shadow-lg w-[90%] max-w-md space-y-4"
          >
            <h2 className="text-2xl font-bold text-[#4F46E5]">Add Course Material</h2>

            <textarea
              placeholder="Description"
              value={newMaterial.description}
              onChange={(e) =>
                setNewMaterial({ ...newMaterial, description: e.target.value })
              }
              className="w-full p-2 border text-black border-gray-300 rounded-md"
              required
            />
            <input
              type="file"
              onChange={(e) =>
                setNewMaterial({ ...newMaterial, file: e.target.files[0] })
              }
              className="w-full p-2 border text-black border-gray-300 rounded-md"
              required
            />

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setNewMaterial({ description: "", file: null, course_id: id });
                }}
                className="text-gray-600 px-4 py-2 hover:underline"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-[#4F46E5] text-white px-4 py-2 rounded-lg hover:bg-[#4338ca]"
                disabled={uploading}
              >
                {uploading ? "Uploading..." : "Upload"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default CourseMaterials;
