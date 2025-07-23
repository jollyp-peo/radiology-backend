const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const supabase = require("../services/supabaseClient");
const { convertDicomToPng } = require("../services/dicomConverter");

exports.uploadCase = async (req, res) => {
	try {
		const { title, description, category } = req.body;
		const files = req.files || [];
		const folder = `cases/${uuidv4()}`;
		const uploadedImages = [];

		for (const file of files) {
			const dcmPath = file.path;
			const pngFilename = `${uuidv4()}.png`;
			const pngPath = path.join("uploads", pngFilename);

			const success = await convertDicomToPng(dcmPath, pngPath);
			if (!success || !fs.existsSync(pngPath)) {
				fs.unlinkSync(dcmPath); // cleanup .dcm
				continue; // Skip if PNG wasn't created
			}

			const pngFile = fs.readFileSync(pngPath);
			const storagePath = `${folder}/${pngFilename}`;

			const { error } = await supabase.storage
				.from("cases")
				.upload(storagePath, pngFile, { contentType: "image/png" });

			if (!error) {
				const { data: urlData } = supabase.storage
					.from("cases")
					.getPublicUrl(storagePath);
				uploadedImages.push(urlData.publicUrl);
			}

			fs.unlinkSync(dcmPath);
			fs.unlinkSync(pngPath);
		}

		if (!uploadedImages.length) {
			return res.status(500).json({ detail: "All conversions failed" });
		}

		const thumbnail = uploadedImages[0];
		const { data, error: dbError } = await supabase
			.from("cases")
			.insert([
				{ title, description, category, image_urls: uploadedImages, thumbnail },
			])
			.select()
			.single();

		if (dbError) throw dbError;
		res.status(201).json({ message: "Case uploaded", id: data.id });
	} catch (err) {
		console.error(err);
		res.status(500).json({ detail: "Upload failed" });
	}
};

exports.listCases = async (req, res) => {
	try {
		const { data, error } = await supabase
			.from("cases")
			.select("id, title, description, category, thumbnail");
		if (error) throw error;
		res.json(data);
	} catch (err) {
		console.error(err);
		res.status(500).json({ detail: "Failed to fetch cases" });
	}
};

exports.getSingleCase = async (req, res) => {
	try {
		const { id } = req.params;
		const { data, error } = await supabase
			.from("cases")
			.select("*")
			.eq("id", id)
			.single();
		if (error) throw error;

		const result = {
			id: data.id,
			title: data.title,
			description: data.description,
			category: data.category,
			images: Array.isArray(data.image_urls)
				? data.image_urls.map((url, index) => ({ id: index, image_url: url }))
				: [],
		};

		res.json(result);
	} catch (err) {
		console.error(err);
		res.status(500).json({ detail: "Failed to fetch case" });
	}
};

exports.deleteCase = async (req, res) => {
	try {
		const { id } = req.params;
		const { data, error: fetchErr } = await supabase
			.from("cases")
			.select("image_urls")
			.eq("id", id)
			.single();

		if (fetchErr) throw fetchErr;

		const paths = data.image_urls.map(
			(url) => url.split("/storage/v1/object/public/cases/")[1]
		);
		await supabase.storage.from("cases").remove(paths);
		await supabase.from("cases").delete().eq("id", id);

		res.status(200).json({ message: "Case deleted" });
	} catch (err) {
		console.error(err);
		res.status(500).json({ detail: "Failed to delete case" });
	}
};
 