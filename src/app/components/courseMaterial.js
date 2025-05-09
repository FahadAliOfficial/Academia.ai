import React, { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import {
  ChartNoAxesColumnDecreasing,
  FlipHorizontal,
  PlusCircle,
  Trash2,
} from "lucide-react";
import useUserSession from "../lib/useUserSession";

const CourseMaterials = ({ id }) => {
  const { user } = useUserSession({ redirectIfNoSession: false });
  const [materials, setMaterials] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [vectorModalOpen, setVectorModalOpen] = useState(false);
  const [vectorStatus, setVectorStatus] = useState("loading"); // 'loading', 'success', 'error'
  const [vectorMessage, setVectorMessage] = useState("");

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

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("course-materials")
      .upload(filePath, file);

    if (uploadError?.message.includes("already exists")) {
      alert("This file has already upload!");
      return;
    }
    if (uploadError) {
      console.error("Error uploading file:", uploadError);
      setUploading(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("course-materials")
      .getPublicUrl(filePath);

    const file_url = publicUrlData.publicUrl;

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
      const urlPrefix =
        "https://msyjkqyzbolwgcdyrmnq.supabase.co/storage/v1/object/public/course-materials/";
      const relativePathEncoded = fileUrl.replace(urlPrefix, "");
      const filePath = decodeURIComponent(relativePathEncoded);

      console.log("Deleting file at:", filePath);

      const { error: storageError } = await supabase.storage
        .from("course-materials")
        .remove([filePath]);

      if (storageError) {
        console.error("Storage deletion error:", storageError.message);
        return;
      }

      const { error: dbError } = await supabase
        .from("course_materials")
        .delete()
        .eq("id", materialId);

      if (dbError) {
        console.error("Database deletion error:", dbError.message);
        return;
      }

      setMaterials((prev) => prev.filter((mat) => mat.id !== materialId));
    } catch (err) {
      console.error("Unexpected error:", err);
    }
  };

  return (
    <div className="bg-white shadow-lg p-6 rounded-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#4F46E5]">Course Materials</h2>
        {userRole === "teacher" && materials.length > 0 && (
          <button
            onClick={async () => {
              setVectorModalOpen(true);
              setVectorStatus("loading");
              setVectorMessage("Building your vector database, please wait...");

              try {
                const { data: keyData, error } = await supabase
                  .from("user_api_keys")
                  .select("api_key")
                  .eq("user_id", user.id)
                  .single();

                if (error) {
                  setVectorStatus("error");
                  setVectorMessage("Failed to fetch API key.");
                  return;
                }

                const response = await fetch(
                  "http://localhost:5000/build_vector_db",
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      course_id: id,
                      api: keyData.api_key,
                    }),
                  }
                );

                const data = await response.json();

                if (response.ok) {
                  setVectorStatus("success");
                  setVectorMessage(
                    "✅ Vector DB built and uploaded successfully!"
                  );
                } else {
                  setVectorStatus("error");
                  setVectorMessage(
                    `❌ Failed to build vector DB: ${
                      data?.error || "Unknown error"
                    }`
                  );
                }
              } catch (error) {
                setVectorStatus("error");
                setVectorMessage(
                  "⚠️ An error occurred while building the vector DB."
                );
                console.error(error);
              }
            }}
            className="mt-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
          >
            Build Vector DB
          </button>
        )}

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
            <h2 className="text-2xl font-bold text-[#4F46E5]">
              Add Course Material
            </h2>

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
                  setNewMaterial({
                    description: "",
                    file: null,
                    course_id: id,
                  });
                }}
                className="cursor-pointer text-gray-600 px-4 py-2 hover:underline"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="cursor-pointer bg-[#4F46E5] text-white px-4 py-2 rounded-lg hover:bg-[#4338ca]"
                disabled={uploading}
              >
                {uploading ? "Uploading..." : "Upload"}
              </button>
            </div>
          </form>
        </div>
      )}
      {vectorModalOpen && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-white p-6 rounded-xl w-[90%] max-w-md text-center shadow-lg space-y-4">
      {vectorStatus === "loading" ? (
        <>
          <p className="text-[#4F46E5] text-xl font-semibold">Processing...</p>
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#4F46E5] mx-auto"></div>
          <p className="text-gray-600">{vectorMessage}</p>
        </>
      ) : (
        <>
          <p
            className={`text-xl font-semibold ${
              vectorStatus === "success" ? "text-green-600" : "text-red-500"
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

    </div>
    
  );
  
};

export default CourseMaterials;
