import express from "express";
import webhookRoutes from "./routes/webhook.routes";

const app = express();

// İmza doğrulaması ham gövde üzerinden yapıldığı için verify kancasıyla
// parse edilmemiş gövdeyi req.rawBody'de saklıyoruz.
app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as express.Request & { rawBody?: Buffer }).rawBody = buf;
    },
  })
);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/", webhookRoutes);

export default app;
