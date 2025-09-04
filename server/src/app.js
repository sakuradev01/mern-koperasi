import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import fs from "fs";
import conf from "./conf/conf.js";

const app = express();
app.use(bodyParser.json());

// app.use(
//   cors({
//     origin: conf.CORS_ORIGIN.replace(/\/$/, ""),
//     credentials: true,
//     methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
//   })
// );

// Dynamic CORS configuration for production and development
const allowedOrigins = [
  "http://localhost:5173", 
  "http://localhost:3000",
  conf.corsOrigin1,
  conf.corsOrigin2, 
  conf.corsOrigin3,
  conf.corsOrigin4,
  conf.corsOrigin5
].filter(origin => origin && origin !== "undefined" && origin !== "null");

// Log CORS configuration at startup
console.log("🔧 CORS Configuration:");
console.log("📋 Allowed origins:", allowedOrigins);
console.log("🌐 CORS_ORIGIN1:", conf.corsOrigin1);
console.log("🌐 CORS_ORIGIN2:", conf.corsOrigin2);
console.log("🌐 CORS_ORIGIN3:", conf.corsOrigin3);
console.log("🌐 CORS_ORIGIN4:", conf.corsOrigin4);
console.log("🌐 CORS_ORIGIN5:", conf.corsOrigin5);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.log(`CORS blocked origin: ${origin}`);
        console.log(`Allowed origins: ${allowedOrigins.join(', ')}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
);

app.use(express.json());
app.use(express.static("public"));

// Custom middleware for serving uploads with proper CORS headers
app.use("/uploads", (req, res, next) => {
  // Set CORS headers for file access
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
}, express.static("uploads")); // Serve uploads folder with CORS

// Also expose uploads under /api to pass through Nginx reverse proxy
app.use("/api/uploads", express.static("uploads"));

app.use(cookieParser());

import Routes from "./routes/index.js";
import adminRoutes from "./routes/admin.routes.js";
app.use("/api", Routes);
app.use("/api", adminRoutes);

app.post("/testing", (req, res) => {
  console.log("Testing");
  res.send("Hello testing completed");
});

// Debug endpoint to check CORS and file configuration
app.get("/debug/config", (req, res) => {
  res.json({
    allowedOrigins,
    corsConfig: {
      corsOrigin1: conf.corsOrigin1,
      corsOrigin2: conf.corsOrigin2,
      corsOrigin3: conf.corsOrigin3,
      corsOrigin4: conf.corsOrigin4,
      corsOrigin5: conf.corsOrigin5,
    },
    requestOrigin: req.headers.origin,
    uploadsPath: "uploads/savings/",
    filesInUploads: fs.existsSync("uploads/savings/") ? fs.readdirSync("uploads/savings/") : []
  });
});

// Debug endpoint to check file access
app.get("/uploads/savings/:filename", (req, res) => {
  const filename = req.params.filename;
  const filePath = `uploads/savings/${filename}`;
  
  console.log(`🔍 File request: ${filename}`);
  console.log(`🔍 Full path: ${filePath}`);
  console.log(`🔍 Origin: ${req.headers.origin}`);
  console.log(`🔍 Allowed origins: ${allowedOrigins.join(', ')}`);
  
  // Set CORS headers explicitly
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    console.log(`✅ CORS allowed for origin: ${origin}`);
  } else {
    console.log(`❌ CORS blocked for origin: ${origin}`);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Check if file exists
  if (fs.existsSync(filePath)) {
    console.log(`✅ File exists: ${filePath}`);
    res.sendFile(filePath, { root: '.' });
  } else {
    console.log(`❌ File not found: ${filePath}`);
    res.status(404).json({ error: 'File not found' });
  }
});

app.get("/", (req, res) => {
  res.send("Welcome to the Express Server!");
});

export { app };
