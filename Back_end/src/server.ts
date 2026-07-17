import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { AppDataSource } from "./config/database";
import path = require("node:path");
import routes from "./routes";

dotenv.config();

const app = express();
const link = "http://localhost:3000";
const JWT_SECRET = process.env.JWT_SECRET || "prote_secret";

const PUBLIC_PATHS = ["/", "/login.html", "/esqueceu_senha.html", "/redefinir_senha.html"];
const PUBLIC_PREFIXES = ["/api/", "/css/", "/js/", "/core/", "/uploads/"];

function getTokenFromRequest(req: express.Request) {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.split(" ")[1];
  }

  const cookieHeader = req.headers.cookie || "";
  const cookies = Object.fromEntries(
    cookieHeader.split(";").filter(Boolean).map((entry) => {
      const [key, ...valueParts] = entry.trim().split("=");
      return [key, decodeURIComponent(valueParts.join("=")).trim()];
    })
  );

  return cookies.prote_token || cookies.prote_session || null;
}

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use((req, res, next) => {
  if (req.method !== "GET") return next();

  const pathname = req.path;

  if (
    PUBLIC_PATHS.includes(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  ) {
    return next();
  }

  const token = getTokenFromRequest(req);

  if (!token) {
    return res.redirect("/login.html");
  }

  try {
    jwt.verify(token, JWT_SECRET);
    return next();
  } catch {
    return res.redirect("/login.html");
  }
});

app.get("/", (req, res) => {
  return res.redirect("/login.html");
});

app.use(express.static(path.join(__dirname, "../../Front_end/public")));
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

    await AppDataSource.query(`
      CREATE TABLE IF NOT EXISTS escola (
        id_escola INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(150) NOT NULL,
        endereco VARCHAR(255)
      )
    `);

    await AppDataSource.query(`
      ALTER TABLE aluno
      ADD COLUMN IF NOT EXISTS id_escola INT NULL
    `);

    const [escolaCountRow]: any[] = await AppDataSource.query(
      `SELECT COUNT(*) AS total FROM escola`
    );

    if (Number(escolaCountRow?.total || 0) === 0) {
      await AppDataSource.query(
        `INSERT INTO escola (nome, endereco) VALUES ('Escola Padrão', 'Endereço não informado')`
      );
    }

    await AppDataSource.query(`
      UPDATE aluno
      SET id_escola = (
        SELECT id_escola FROM escola ORDER BY id_escola LIMIT 1
      )
      WHERE id_escola IS NULL OR id_escola = 0
    `);

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