const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Serve uploaded files
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
    cb(null, "image-" + uniqueSuffix + path.extname(file.originalname));
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

// In-memory storage for menu items (consider using a database in production)
let menuItems = {
  freshporkcuts: [],
  processedPork: [],
  internationalPork: [],
};

// Load menu items from file if it exists (for persistence between restarts)
const menuItemsFile = path.join(__dirname, "menuItems.json");
try {
  if (fs.existsSync(menuItemsFile)) {
    const data = fs.readFileSync(menuItemsFile, "utf8");
    menuItems = JSON.parse(data);
    console.log("Menu items loaded from file");
  }
} catch (error) {
  console.error("Error loading menu items from file:", error);
}

// Save menu items to file
const saveMenuItems = () => {
  try {
    fs.writeFileSync(menuItemsFile, JSON.stringify(menuItems, null, 2));
  } catch (error) {
    console.error("Error saving menu items to file:", error);
  }
};

// API Routes

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Server is running" });
});

// Get all menu items
app.get("/api/menu", (req, res) => {
  try {
    res.json(menuItems);
  } catch (error) {
    console.error("Error getting menu items:", error);
    res.status(500).json({ error: "Failed to get menu items" });
  }
});

// Add a new menu item
app.post("/api/menu", (req, res) => {
  try {
    const { name, description, price, category, image } = req.body;

    if (!name || !description || !price || !category || !image) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const newItem = {
      id: Date.now(),
      name,
      description,
      price: parseFloat(price),
      category,
      image,
      createdAt: new Date().toISOString(),
    };

    if (!menuItems[category]) {
      menuItems[category] = [];
    }

    menuItems[category].push(newItem);
    saveMenuItems();

    res.status(201).json(newItem);
  } catch (error) {
    console.error("Error adding menu item:", error);
    res.status(500).json({ error: "Failed to add menu item" });
  }
});

// Delete a menu item
app.delete("/api/menu/:id", (req, res) => {
  try {
    const id = parseInt(req.params.id);
    let deleted = false;
    let deletedItem = null;

    // Search through all categories and remove the item
    for (const category in menuItems) {
      const index = menuItems[category].findIndex((item) => item.id === id);
      if (index !== -1) {
        deletedItem = menuItems[category][index];
        menuItems[category].splice(index, 1);
        deleted = true;
        break;
      }
    }

    if (deleted) {
      saveMenuItems();
      res.json({
        message: "Menu item deleted successfully",
        item: deletedItem,
      });
    } else {
      res.status(404).json({ error: "Menu item not found" });
    }
  } catch (error) {
    console.error("Error deleting menu item:", error);
    res.status(500).json({ error: "Failed to delete menu item" });
  }
});

// Upload image
app.post("/api/upload", upload.single("image"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Determine the base URL based on environment
    let baseUrl;
    if (process.env.NODE_ENV === "production") {
      baseUrl = process.env.BACKEND_URL || `https://${req.get("host")}`;
    } else {
      baseUrl = `${req.protocol}://${req.get("host")}`;
    }

    const imageUrl = `${baseUrl}/uploads/${req.file.filename}`;
    res.json({ imageUrl });
  } catch (error) {
    console.error("Error uploading image:", error);
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
    console.error("Error deleting image:", error);
    res.status(500).json({ error: "Failed to delete image" });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("Server error:", error);
  res.status(500).json({ error: "Internal server error" });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});
