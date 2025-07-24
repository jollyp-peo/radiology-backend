const express = require('express');
const cors = require('cors');
require('dotenv').config();
// const caseRoutes = require("./routes/caseRoutes");
const courseRoutes = require("./routes/courseRoutes");
const ebookRoutes = require("./routes/ebookRoutes");

const app = express();

app.use(express.json());

const allowedOrigins = [
  "http://localhost:5173", // for local dev
  "https://evercare-radiology.vercel.app/", // your Vercel frontend
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("CORS not allowed from this origin"));
      }
    },
    credentials: true,
  })
);

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/upload', require('./routes/uploadRoutes'));
app.use('/api/atlas', require('./routes/atlasRoutes'));
app.use('/api/cases', require('./routes/caseRoutes'));
app.use("/api/courses", courseRoutes);
app.use("/api/ebooks", ebookRoutes);


app.listen(process.env.PORT, () =>
  console.log(`Server running on port ${process.env.PORT}`)
);
