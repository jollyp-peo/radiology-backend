const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

exports.convertDicomToPng = async (inputPath, outputPath) => {
  const scriptPath = path.join(__dirname, "../convert.py");
  const pythonPath = path.join(__dirname, "../venv/bin/python"); // Adjust if Windows

  return new Promise((resolve, reject) => {
    execFile(pythonPath, [scriptPath, inputPath, outputPath], (error, stdout, stderr) => {
      if (error) {
        console.error("❌ Conversion failed:");
        console.error("Error:", error.message);
        if (stderr) console.error("stderr:", stderr);
        if (stdout) console.log("stdout:", stdout);
        return resolve(false);
      }

      if (stderr) {
        console.warn("⚠️ Python script stderr:", stderr);
      }

      console.log("✅ DICOM converted to PNG:", outputPath);
      return resolve(true);
    });
  });
};