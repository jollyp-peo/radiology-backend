const express = require('express');
const cors = require('cors');
require('dotenv').config();
// const caseRoutes = require("./routes/caseRoutes");
const courseRoutes = require("./routes/courseRoutes");
const ebookRoutes = require("./routes/ebookRoutes");

const app = express();
app.use(cors());
app.use(express.json());

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
