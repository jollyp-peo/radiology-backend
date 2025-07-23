const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../services/supabaseClient');
const { convertDicomToPng } = require('../services/dicomConverter');

exports.uploadDicomFolder = async (req, res) => {
  try {
    const folder = req.files;
    const category = req.body.category || 'cases'; // e.g., 'cases', 'xray-images'
    const uploaded = [];

    for (let file of folder) {
      const dcmPath = file.path;
      const pngFilename = `${uuidv4()}.png`;
      const pngPath = path.join('uploads', pngFilename);

      const success = convertDicomToPng(dcmPath, pngPath);
      if (!success) continue;

      const pngFile = fs.readFileSync(pngPath);
      const { data, error } = await supabase.storage
        .from(category)
        .upload(pngFilename, pngFile, { contentType: 'image/png' });

      if (error) console.error('Upload error:', error.message);
      else uploaded.push(`${process.env.SUPABASE_URL}/storage/v1/object/public/${category}/${pngFilename}`);

      // Cleanup
      fs.unlinkSync(dcmPath);
      fs.unlinkSync(pngPath);
    }

    res.status(200).json({ message: 'Upload complete', files: uploaded });
  } catch (err) {
    console.error('Upload failed:', err.message);
    res.status(500).json({ message: 'Upload failed' });
  }
};
