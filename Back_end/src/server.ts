import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { AppDataSource } from "./config/database";
import path = require("node:path");

dotenv.config();

const app = express();
const link = "http://localhost:3000"

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../../Front_end/public")));



const PORT = process.env.PORT || 3000;


AppDataSource.initialize()
  .then(() => {
    console.log("Banco de dados conectado com sucesso");

    app.listen(PORT, () => {
      console.log(("Servidor rodando: " + link));
    });
  })
  .catch((error) => {
    console.error("Erro ao conectar no banco:", error);
  });