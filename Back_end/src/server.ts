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

app.get('/', (req, res) => {
  return res.redirect('/login.html');
});

app.use(express.static(path.join(__dirname, "../../Front_end/public")));
//servir imagens
app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));
app.use(routes);


const PORT = process.env.PORT || 3000;


AppDataSource.initialize()
  .then(async () => {
    console.log("Banco de dados conectado com sucesso");

    await AppDataSource.query(
      `ALTER TABLE condutor ADD COLUMN IF NOT EXISTS senha VARCHAR(255)`
    );
    await AppDataSource.query(
      `ALTER TABLE condutor ADD COLUMN IF NOT EXISTS token_recuperacao VARCHAR(255)`
    );
    await AppDataSource.query(
      `ALTER TABLE condutor ADD COLUMN IF NOT EXISTS expiracao_recuperacao DATETIME`
    );
    await AppDataSource.query(
      `ALTER TABLE monitor ADD COLUMN IF NOT EXISTS senha VARCHAR(255)`
    );
    await AppDataSource.query(
      `ALTER TABLE monitor ADD COLUMN IF NOT EXISTS token_recuperacao VARCHAR(255)`
    );
    await AppDataSource.query(
      `ALTER TABLE monitor ADD COLUMN IF NOT EXISTS expiracao_recuperacao DATETIME`
    );

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