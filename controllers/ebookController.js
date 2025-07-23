const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const supabase = require("../services/supabaseClient");

// Upload ebook
exports.uploadEbook = async (req, res) => {
  try {
    const { title } = req.body;
    const file = req.files?.pdf?.[0];

    if (!title || !file) {
      return res.status(400).json({ detail: "Title and PDF file are required" });
    }

    const folder = `ebooks/${uuidv4()}`;
    const filePath = `${folder}/${file.originalname}`;
    const buffer = fs.readFileSync(file.path);

    const { error: uploadErr } = await supabase.storage
      .from("ebooks")
      .upload(filePath, buffer, {
        contentType: file.mimetype,
      });

    fs.unlinkSync(file.path);
    if (uploadErr) throw uploadErr;

    const { data: urlData } = supabase.storage.from("ebooks").getPublicUrl(filePath);

    const { data, error: dbErr } = await supabase
      .from("ebooks")
      .insert([{ title, pdf_url: urlData.publicUrl }])
      .select()
      .single();

    if (dbErr) throw dbErr;

    res.status(201).json({ message: "Ebook uploaded", id: data.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ detail: "Upload failed" });
  }
};

// List all ebooks
exports.listEbooks = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("ebooks")
      .select("id, title, pdf_url, created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ detail: "Failed to fetch ebooks" });
  }
};

// View single ebook
exports.getEbook = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("ebooks")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ detail: "Failed to fetch ebook" });
  }
};

// Delete ebook
exports.deleteEbook = async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error: fetchErr } = await supabase
      .from("ebooks")
      .select("pdf_url")
      .eq("id", id)
      .single();

    if (fetchErr) throw fetchErr;

    const filePath = data.pdf_url.split("/storage/v1/object/public/ebooks/")[1];
    await supabase.storage.from("ebooks").remove([filePath]);
    await supabase.from("ebooks").delete().eq("id", id);

    res.status(200).json({ message: "Ebook deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ detail: "Failed to delete ebook" });
  }
};
