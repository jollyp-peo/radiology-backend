const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const supabase = require("../services/supabaseClient");
const { convertDicomToPng } = require("../services/dicomConverter");

async function getFileType(buffer) {
	const { fileTypeFromBuffer } = await import("file-type");
	return await fileTypeFromBuffer(buffer);
}

exports.uploadAtlasSeries = async (req, res) => {
	try {
		const { name, modality, description } = req.body;
		const files = req.files?.files || [];
		const legendFile = req.files?.legend_image?.[0];

		const folder = `${modality.toLowerCase()}/${uuidv4()}`;
		const uploadedImages = [];

		for (let file of files) {
			const fileBuffer = fs.readFileSync(file.path);
			const fileType = await getFileType(fileBuffer);
			let finalPath = file.path;
			let isPng = false;

			// Only accept certain mimetypes
			if (
				!fileType ||
				!["image/png", "image/jpeg", "application/dicom"].includes(
					fileType.mime
				)
			) {
				console.warn("Unsupported file type:", fileType?.mime || "unknown");
				fs.unlinkSync(file.path);
				continue;
			}

			// Convert DICOM to PNG
			if (fileType.mime === "application/dicom") {
				const pngPath = path.join("uploads", `${uuidv4()}.png`);
				const success = await convertDicomToPng(file.path, pngPath);
				fs.unlinkSync(file.path);
				if (!success) continue;
				finalPath = pngPath;
				isPng = true;
			}

			// If already PNG or JPEG, rename/copy to .png format
			if (fileType.mime.startsWith("image/") && !isPng) {
				const outputPath = path.join("uploads", `${uuidv4()}.png`);
				fs.copyFileSync(finalPath, outputPath);
				fs.unlinkSync(finalPath);
				finalPath = outputPath;
			}

			// Upload to Supabase
			const uploadName = `${uuidv4()}.png`;
			const { error: uploadError } = await supabase.storage
				.from("atlas")
				.upload(`${folder}/${uploadName}`, fs.readFileSync(finalPath), {
					contentType: "image/png",
				});

			fs.unlinkSync(finalPath);
			if (uploadError) continue;

			const { data: urlData } = supabase.storage
				.from("atlas")
				.getPublicUrl(`${folder}/${uploadName}`);
			uploadedImages.push(urlData.publicUrl);
		}

		// Upload legend image (optional)
		let legend_url = null;
		if (legendFile) {
			const buffer = fs.readFileSync(legendFile.path);
			const legendName = `${uuidv4()}-${legendFile.originalname}`;
			const { error } = await supabase.storage
				.from("atlas")
				.upload(`${folder}/legend/${legendName}`, buffer, {
					contentType: legendFile.mimetype,
				});

			if (!error) {
				const { data } = supabase.storage
					.from("atlas")
					.getPublicUrl(`${folder}/legend/${legendName}`);
				legend_url = data.publicUrl;
			}
			fs.unlinkSync(legendFile.path);
		}
		if (uploadedImages.length === 0) {
			return res
				.status(400)
				.json({
					detail:
						"No valid images were uploaded. Ensure DICOM files are valid or use supported image types.",
				});
		}

		// Save metadata
		const { data, error: insertError } = await supabase
			.from("atlas_series")
			.insert([
				{
					name,
					modality,
					description,
					legend_url,
					image_urls: uploadedImages,
				},
			])
			.select()
			.single();

		if (insertError) throw insertError;

		res.status(201).json({ series_id: data.id, message: "Upload successful" });
	} catch (err) {
		console.error("Upload error:", err.message);
		res.status(500).json({ detail: "Upload failed" });
	}
};

//return all uploaded series
exports.getAtlasSeries = async (req, res) => {
	try {
		const { data, error } = await supabase
			.from("atlas_series")
			.select("id, name, modality, legend_url, image_urls");

		if (error) throw error;

		res.json(data);
	} catch (err) {
		console.error(err.message);
		res.status(500).json({ detail: "Failed to fetch atlas series" });
	}
};

//return full detail for a specific series ID
exports.getSingleSeries = async (req, res) => {
	try {
		const { id } = req.params;

		const { data, error } = await supabase
			.from("atlas_series")
			.select("*")
			.eq("id", id)
			.single();

		if (error) throw error;

		const series = {
			id: data.id,
			name: data.name,
			modality: data.modality,
			description: data.description,
			images: data.image_urls.map((url, index) => ({
				id: index,
				image_url: url,
			})),
			legend_image: data.legend_url || null,
		};

		res.json(series);
	} catch (err) {
		console.error(err.message);
		res.status(500).json({ detail: "Failed to fetch series" });
	}
};

// delete series
exports.deleteAtlasSeries = async (req, res) => {
	try {
		const { id } = req.params;

		// 1. Get the series by ID
		const { data: series, error: fetchErr } = await supabase
			.from("atlas_series")
			.select("image_urls, legend_url")
			.eq("id", id)
			.single();

		if (fetchErr || !series) {
			return res.status(404).json({ detail: "Series not found" });
		}

		const imagesToDelete = [];

		// 2. Extract file paths from public URLs
		for (const url of series.image_urls) {
			const pathStart = url.indexOf("/storage/v1/object/public/atlas/") + 35;
			const filePath = url.substring(pathStart);
			imagesToDelete.push(filePath);
		}

		if (series.legend_url) {
			const pathStart =
				series.legend_url.indexOf("/storage/v1/object/public/atlas/") + 35;
			const filePath = series.legend_url.substring(pathStart);
			imagesToDelete.push(filePath);
		}

		// 3. Delete from Supabase storage
		const { error: deleteError } = await supabase.storage
			.from("atlas")
			.remove(imagesToDelete);

		if (deleteError) {
			console.warn(
				"Some files may not have been deleted from bucket:",
				deleteError.message
			);
		}

		// 4. Delete from DB
		const { error: dbError } = await supabase
			.from("atlas_series")
			.delete()
			.eq("id", id);

		if (dbError) throw dbError;

		res.json({ message: "Series deleted successfully" });
	} catch (err) {
		console.error("Delete series error:", err.message);
		res.status(500).json({ detail: "Failed to delete series" });
	}
};
