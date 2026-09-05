import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { webhookRouter } from "./routes/webhook.js";
import { apiRouter } from "./routes/api.js";
import "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json());
app.use(webhookRouter);
app.use("/api", apiRouter);
app.use(express.static(path.join(__dirname, "..", "public")));

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`WhatsApp AI broadcaster running on http://localhost:${port}`);
});
