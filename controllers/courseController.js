const fs = require("fs");
const path = require("path");
const supabase = require("../services/supabaseClient");
const { v4: uuidv4 } = require("uuid");

exports.uploadCourse = async (req, res) => {
  try {
    const { title, type, recorded_link } = req.body;
    const folder = `courses/${uuidv4()}`;
    let video_url = null;
    let material_url = null;

    // Upload based on course type
    if (type === "Video" && req.files?.video?.[0]) {
      const file = req.files.video[0];
      const filePath = `${folder}/${file.originalname}`;
      const buffer = fs.readFileSync(file.path);

      const { error } = await supabase.storage
        .from("courses")
        .upload(filePath, buffer, {
          contentType: file.mimetype,
        });

      fs.unlinkSync(file.path);
      if (error) throw error;

      const { data } = supabase.storage.from("courses").getPublicUrl(filePath);
      video_url = data.publicUrl;
    }

    if (type === "Presentation" && req.files?.material?.[0]) {
      const file = req.files.material[0];
      const filePath = `${folder}/${file.originalname}`;
      const buffer = fs.readFileSync(file.path);

      const { error } = await supabase.storage
        .from("courses")
        .upload(filePath, buffer, {
          contentType: file.mimetype,
        });

      fs.unlinkSync(file.path);
      if (error) throw error;

      const { data } = supabase.storage.from("courses").getPublicUrl(filePath);
      material_url = data.publicUrl;
    }

    const { data, error: dbErr } = await supabase
      .from("courses")
      .insert([
        {
          title,
          type,
          video_url,
          material_url,
          recorded_link: recorded_link || null,
        },
      ])
      .select()
      .single();

    if (dbErr) throw dbErr;

    res.status(201).json({ message: "Course uploaded", id: data.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ detail: "Upload failed" });
  }
};

exports.listCourses = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("courses")
      .select("id, title, type, video_url, material_url, recorded_link, created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ detail: "Failed to fetch courses" });
  }
};

exports.getSingleCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase.from("courses").select("*").eq("id", id).single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ detail: "Failed to fetch course" });
  }
};

exports.deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error: fetchErr } = await supabase
      .from("courses")
      .select("video_url, material_url")
      .eq("id", id)
      .single();

    if (fetchErr) throw fetchErr;

    const pathsToDelete = [];

    [data.video_url, data.material_url].forEach((url) => {
      if (url) {
        const parts = url.split("/storage/v1/object/public/courses/");
        if (parts[1]) pathsToDelete.push(parts[1]);
      }
    });

    if (pathsToDelete.length) {
      await supabase.storage.from("courses").remove(pathsToDelete);
    }

    await supabase.from("courses").delete().eq("id", id);
    res.status(200).json({ message: "Course deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ detail: "Failed to delete course" });
  }
};
