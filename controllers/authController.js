const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../services/supabaseClient');

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

exports.registerUser = async (req, res) => {
  console.log("👉 Register endpoint hit");              // STEP 1
  console.log("🧾 Received body:", req.body);           // STEP 2

  const { firstName, lastName, email, password } = req.body;

  if (!firstName || !lastName || !email || !password) {
    console.log("❌ Missing field(s)");
    return res.status(400).json({ message: 'All fields are required.' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const { data, error } = await supabase
    .from('users')
    .insert([{ 
      first_name: firstName, 
      last_name: lastName, 
      email, 
      password: hashedPassword 
    }])
    .select();

  if (error) {
    console.error("❌ Supabase insert error:", error.message);
    return res.status(400).json({ message: error.message });
  }

  const token = generateToken(data[0].id);
  console.log("✅ Registration successful");
  res.status(201).json({ user: data[0], token });
};


exports.loginUser = async (req, res) => {
  console.log("👉 Login endpoint hit");
  console.log("🧾 Received:", req.body);

  const { email, password } = req.body;

  if (!email || !password) {
    console.log("❌ Missing fields");
    return res.status(400).json({ message: "Email and password are required." });
  }

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !data) {
    console.log("❌ User not found or Supabase error", error?.message);
    return res.status(400).json({ message: "Invalid credentials" });
  }

  const match = await bcrypt.compare(password, data.password);
  if (!match) {
    console.log("❌ Password mismatch");
    return res.status(400).json({ message: "Invalid credentials" });
  }

  const token = generateToken(data.id);
  console.log("✅ Login successful");
  res.status(200).json({ user: data, token });
};

