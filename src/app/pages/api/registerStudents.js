import { supabase } from "@/app/lib/supabaseClient";


export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { students } = req.body;

  try {
    const responses = [];

    for (const s of students) {
      const { email, name, studentId } = s;

      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: false,
        user_metadata: { name, studentId },
      });

      if (error) {
        responses.push({ email, error: error.message });
      } else {
        responses.push({ email, status: "created" });
      }
    }

    res.status(200).json({ message: "Users processed", results: responses });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}
