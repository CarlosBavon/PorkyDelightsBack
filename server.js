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
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    // Create a unique filename with timestamp
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    // Check if file is an image
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// In-memory storage for menu items (replace with a database in production)
let menuItems = {
  freshporkcuts: [],
  processedPork: [],
  internationalPork: [],
};

// API Routes

// Get all menu items
app.get("/api/menu", (req, res) => {
  res.json(menuItems);
});

// Add a new menu item
app.post("/api/menu", (req, res) => {
  try {
    const { name, description, price, category, image } = req.body;

    const newItem = {
      id: Date.now(),
      name,
      description,
      price: parseFloat(price),
      category,
      image,
      createdAt: new Date().toISOString(),
    };

    menuItems[category].push(newItem);

    res.status(201).json(newItem);
  } catch (error) {
    res.status(500).json({ error: "Failed to add menu item" });
  }
});

// Delete a menu item
app.delete("/api/menu/:id", (req, res) => {
  try {
    const id = parseInt(req.params.id);
    let deleted = false;

    // Search through all categories and remove the item
    for (const category in menuItems) {
      const index = menuItems[category].findIndex((item) => item.id === id);
      if (index !== -1) {
        // Delete associated image file
        const item = menuItems[category][index];
        if (item.image && item.image.includes("/uploads/")) {
          const filename = item.image.split("/").pop();
          const filePath = path.join(__dirname, "uploads", filename);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        }

        menuItems[category].splice(index, 1);
        deleted = true;
        break;
      }
    }

    if (deleted) {
      res.json({ message: "Menu item deleted successfully" });
    } else {
      res.status(404).json({ error: "Menu item not found" });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to delete menu item" });
  }
});

// Upload image
app.post("/api/upload", upload.single("image"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const imageUrl = `${req.protocol}://${req.get("host")}/uploads/${
      req.file.filename
    }`;
    res.json({ imageUrl });
  } catch (error) {
    res.status(500).json({ error: "Failed to upload image" });
  }
});

// Delete image
app.delete("/api/upload/:filename", (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, "uploads", filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ message: "Image deleted successfully" });
    } else {
      res.status(404).json({ error: "Image not found" });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to delete image" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
