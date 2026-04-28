import multer from "multer";
import path from "path";
import fs from "fs";

const pastaUpload = path.resolve(__dirname, "../../uploads/alunos");

if (!fs.existsSync(pastaUpload)) {
  fs.mkdirSync(pastaUpload, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, pastaUpload);
  },

  filename: (req, file, callback) => {
    const nomeArquivo = `${Date.now()}-${file.originalname}`;
    callback(null, nomeArquivo);
  },
});

export const uploadAluno = multer({
  storage,
  fileFilter: (req, file, callback) => {
    const tiposPermitidos = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "image/webp",
    ];

    if (tiposPermitidos.includes(file.mimetype)) {
      callback(null, true);
    } else {
      callback(new Error("Formato de imagem inválido"));
    }
  },
});