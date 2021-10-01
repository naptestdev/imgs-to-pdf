const express = require("express");
const app = express();
require("dotenv/config");
const fileUpload = require("express-fileupload");
const fs = require("fs");
const { join } = require("path");
const imagesToPdf = require("images-to-pdf");

function id() {
  return Math.random()
    .toString(36)
    .slice(-8)
    .split("")
    .map((e) => (Math.random() > 0.5 ? e : e.toUpperCase()))
    .join("");
}

app.use(fileUpload({ useTempFiles: true, createParentPath: true }));
app.use(express.static("asset"));

app.get("/", (req, res) => {
  res.sendFile(join(__dirname, "public", "index.html"));
});

app.get("/pending", (req, res) => {
  if (!req.query.images) return res.sendStatus(400);
  res.sendFile(join(__dirname, "public", "pending.html"));
});

app.post("/upload", (req, res) => {
  try {
    const file = req.files.file;
    if (!file) return res.sendStatus(400);
    if (!file.mimetype.startsWith("image")) return res.sendStatus(400);

    const fileId = id();
    const extension = file.name.split(".").slice(-1)[0];
    const path = join(__dirname, "images", fileId, `image.${extension}`);

    file.mv(path, (err) => {
      if (err) return res.sendStatus(500);
      res.send(fileId);
    });
  } catch (error) {
    console.log(error);
    if (!res.headersSent) res.sendStatus(500);
  }
});

app.get("/image/:id", (req, res) => {
  try {
    const dir = join(__dirname, "images", req.params.id);
    if (!fs.existsSync(dir)) return res.sendStatus(404);
    const file = fs.readdirSync(dir)[0];
    res.sendFile(join(dir, file));
  } catch (error) {
    console.log(error);
    if (!res.headersSent) res.sendStatus(500);
  }
});

app.get("/pdf", async (req, res) => {
  try {
    if (!req.query.images) return res.sendStatus(400);
    const images = req.query.images.split(",");

    const pdfDir = join(__dirname, "pdf", encodeURIComponent(req.query.images));
    const pdfPath = join(pdfDir, "result.pdf");

    if (fs.existsSync(pdfPath)) return res.download(pdfPath);

    fs.mkdirSync(pdfDir, { recursive: true });

    let paths = [];
    images.forEach((i) => {
      const dir = join(__dirname, "images", i);
      if (!fs.existsSync(dir)) {
        res.sendStatus(404);
        throw 404;
      }
      const file = fs.readdirSync(dir)[0];
      paths.push(join(dir, file));
    });

    await imagesToPdf(paths, pdfPath);

    res.download(pdfPath);
  } catch (error) {
    console.log(error);
    if (!res.headersSent) res.sendStatus(500);
  }
});

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Server is listening on port ${port}`));
