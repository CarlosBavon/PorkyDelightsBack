const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// Ensure uploads directory exists
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

// Configure multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });

// Menu data
let menuData = {
  freshporkcuts: [],
  processedPork: [],
  internationalPork: [],
};

// Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "OK" });
});

app.get("/api/menu", (req, res) => {
  res.json(menuData);
});

app.post("/api/menu", (req, res) => {
  const { name, description, price, category, image } = req.body;

  const newItem = {
    id: Date.now(),
    name,
    description,
    price,
    category,
    image,
    createdAt: new Date().toISOString(),
  };

  menuData[category].push(newItem);
  res.json(newItem);
});

app.delete("/api/menu/:id", (req, res) => {
  const id = parseInt(req.params.id);

  for (const category in menuData) {
    menuData[category] = menuData[category].filter((item) => item.id !== id);
  }

  res.json({ message: "Item deleted" });
});

app.post("/api/upload", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const imageUrl = `${req.protocol}://${req.get("host")}/uploads/${
    req.file.filename
  }`;
  res.json({ imageUrl });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
