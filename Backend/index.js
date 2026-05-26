import express from "express";
import dotenv from "dotenv";
import morgan from "morgan";
import cors from "cors";
import connectDB from "./db/index.js";
import logger from "./logger.js";

// Route Imports (ESM syntax)
import userRoutes from "./routes/userRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";

// Load env vars
dotenv.config({
  path: "./.env",
  override: true,
});

const app = express();

// Middleware
app.use(express.json());

// Morgan logging
const morganFormat = ":method :url :status :response-time ms";
app.use(
  morgan(morganFormat, {
    stream: {
      write: (message) => {
        const [method, url, status, responseTime] = message.split(" ");
        logger.info(JSON.stringify({ method, url, status, responseTime }));
      },
    },
  })
);

// CORS
app.use(
  cors({
    origin: "*",
  })
);

// ---------------- ROUTES ----------------
app.use("/api/v1/users", userRoutes);
app.use("/chat", chatRoutes); 
app.use("/api/reports", reportRoutes); // Correct ES module usage

// ❌ REMOVE THIS (CAUSES ERROR)
// app.use("/api/reports", require("./routes/reportRoutes.js"));
// ESM cannot use require()

// Server Port
const PORT = process.env.PORT || 5000;

// Connect DB → Start Server
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    logger.error("❌ Failed to connect to MongoDB:", error);
  });
