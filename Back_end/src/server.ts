import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { AppDataSource } from "./config/database";
import path = require("node:path");
import routes from "./routes";

dotenv.config();

const app = express();
const link = "http://localhost:3000"


app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../../Front_end/public")));
//servir imagens
app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));
app.use(routes);


const PORT = process.env.PORT || 3000;


AppDataSource.initialize()
  .then(() => {
    console.log("Banco de dados conectado com sucesso");
// lista as tabelas que foram carregadas
    console.log("Models carregados:");

AppDataSource.entityMetadatas.forEach((entity) => {
  console.log(`- ${entity.name} -> tabela: ${entity.tableName}`);
});

    app.listen(PORT, () => {
      console.log(("Servidor rodando: " + link));
    });
  })
  .catch((error) => {
    console.error("Erro ao conectar no banco:", error);
  });