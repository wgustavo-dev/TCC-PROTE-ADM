import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import path = require("node:path");

import { AppDataSource } from "./config/database";
import routes from "./routes";

import { ServiceMensalidade } from "./services/service_mensalidade";
import { ServiceNotificacaoAutomatica } from "./services/service_notificacao_automatica";

dotenv.config();

const app = express();

const link = "http://localhost:3000";

const JWT_SECRET =
  process.env.JWT_SECRET || "prote_secret";


/*
=========================================================
CAMINHOS PÚBLICOS
=========================================================
*/

const PUBLIC_PATHS = [
  "/",
  "/login.html",
  "/esqueceu_senha.html",
  "/redefinir_senha.html"
];

const PUBLIC_PREFIXES = [
  "/api/",
  "/css/",
  "/js/",
  "/core/",
  "/uploads/"
];


/*
=========================================================
OBTER TOKEN
=========================================================
*/

function getTokenFromRequest(
  req: express.Request
) {

  const authHeader =
    req.headers.authorization;

  if (
    authHeader?.startsWith("Bearer ")
  ) {

    return authHeader.split(" ")[1];

  }


  const cookieHeader =
    req.headers.cookie || "";

  const cookies =
    Object.fromEntries(
      cookieHeader
        .split(";")
        .filter(Boolean)
        .map((entry) => {

          const [
            key,
            ...valueParts
          ] =
            entry
              .trim()
              .split("=");

          return [
            key,
            decodeURIComponent(
              valueParts
                .join("=")
            ).trim()
          ];

        })
    );


  return (
    cookies.prote_token ||
    cookies.prote_session ||
    null
  );

}


/*
=========================================================
MIDDLEWARES BÁSICOS
=========================================================
*/

app.use(
  cors({
    origin: true,
    credentials: true
  })
);

app.use(
  express.json()
);


/*
=========================================================
PROTEÇÃO DAS PÁGINAS
=========================================================
*/

app.use(
  (req, res, next) => {

    /*
    Apenas requisições GET de páginas
    precisam passar por esta verificação.
    */

    if (req.method !== "GET") {
      return next();
    }


    const pathname =
      req.path;


    /*
    Caminhos públicos
    */

    if (
      PUBLIC_PATHS.includes(
        pathname
      ) ||
      PUBLIC_PREFIXES.some(
        (prefix) =>
          pathname.startsWith(prefix)
      )
    ) {

      return next();

    }


    /*
    Obter token
    */

    const token =
      getTokenFromRequest(req);


    if (!token) {

      return res.redirect(
        "/login.html"
      );

    }


    /*
    Validar JWT
    */

    try {

      jwt.verify(
        token,
        JWT_SECRET
      );

      return next();

    } catch {

      return res.redirect(
        "/login.html"
      );

    }

  }
);


/*
=========================================================
RAIZ
=========================================================
*/

app.get(
  "/",
  (req, res) => {

    return res.redirect(
      "/login.html"
    );

  }
);


/*
=========================================================
ARQUIVOS FRONT-END
=========================================================
*/

app.use(
  express.static(
    path.join(
      __dirname,
      "../../Front_end/public"
    )
  )
);


/*
=========================================================
UPLOADS
=========================================================
*/

app.use(
  "/uploads",
  express.static(
    path.resolve(
      __dirname,
      "../uploads"
    )
  )
);


/*
=========================================================
ROTAS DA API
=========================================================
*/

app.use(routes);


/*
=========================================================
PORTA
=========================================================
*/

const PORT =
  process.env.PORT || 3000;


/*
=========================================================
INICIALIZAÇÃO DO BANCO
=========================================================
*/

AppDataSource.initialize()

  .then(async () => {

    console.log(
      "Banco de dados conectado com sucesso"
    );


    /*
    =====================================================
    CONTROLE DE ACESSOS
    =====================================================
    */

    /*
    Remove a antiga FK condutor -> monitor (id_monitor),
    caso ela ainda exista.

    O relacionamento atual é monitor -> condutor.
    */

    const [fkAntigaRow]: any[] =
      await AppDataSource.query(`
        SELECT CONSTRAINT_NAME
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'condutor'
          AND COLUMN_NAME = 'id_monitor'
          AND REFERENCED_TABLE_NAME = 'monitor'
        LIMIT 1
      `);


    if (
      fkAntigaRow?.CONSTRAINT_NAME
    ) {

      await AppDataSource.query(
        `
        ALTER TABLE condutor
        DROP FOREIGN KEY \`${fkAntigaRow.CONSTRAINT_NAME}\`
        `
      );

    }


    /*
    =====================================================
    RENOVAÇÃO MENSAL DE MENSALIDADES
    =====================================================
    */

    /*
    A rotina executa:

    1. Ao iniciar o servidor.
    2. Depois, uma vez por hora.

    O serviço já trabalha de forma idempotente,
    utilizando mes_referencia para evitar duplicações.
    */

    const serviceMensalidade =
      new ServiceMensalidade();


    const UMA_HORA_MS =
      60 * 60 * 1000;


    const executarRenovacaoMensal =
      async () => {

        try {

          const resultado =
            await serviceMensalidade
              .gerarRenovacaoMensal();


          console.log(
            `[mensalidade] ${resultado.message}`
          );

        } catch (error) {

          console.error(
            "[mensalidade] Falha na rotina de renovação mensal:",
            error
          );

        }

      };


    /*
    Executa imediatamente.
    */

    await executarRenovacaoMensal();


    /*
    Depois executa a cada hora.
    */

    setInterval(
      executarRenovacaoMensal,
      UMA_HORA_MS
    );


    /*
    =====================================================
    NOTIFICAÇÕES AUTOMÁTICAS
    =====================================================
    */

    const serviceNotificacaoAutomatica =
      new ServiceNotificacaoAutomatica();


    /*
    Busca todos os condutores cadastrados
    e executa a verificação individualmente.
    */

    const executarVerificacaoNotificacoes =
      async () => {

        try {

          const condutores =
            await AppDataSource.query(`
              SELECT id_condutor
              FROM condutor
            `);


          if (
            !Array.isArray(condutores) ||
            condutores.length === 0
          ) {

            console.log(
              "[notificacao] Nenhum condutor encontrado."
            );

            return;

          }


          console.log(
            `[notificacao] Verificando notificações para ${condutores.length} condutor(es)...`
          );


          for (
            const condutor
            of condutores
          ) {

            const idCondutor =
              Number(
                condutor.id_condutor
              );


            if (!idCondutor) {
              continue;
            }


            try {

              await serviceNotificacaoAutomatica
                .executar(
                  idCondutor
                );


              console.log(
                `[notificacao] Verificação concluída para o condutor ${idCondutor}.`
              );

            } catch (error) {

              /*
              Um condutor com erro não deve
              impedir os demais de serem processados.
              */

              console.error(
                `[notificacao] Erro ao verificar o condutor ${idCondutor}:`,
                error
              );

            }

          }


          console.log(
            "[notificacao] Verificação automática concluída."
          );

        } catch (error) {

          console.error(
            "[notificacao] Falha na rotina automática de notificações:",
            error
          );

        }

      };


    /*
    =====================================================
    EXECUÇÃO INICIAL
    =====================================================
    */

    /*
    Executa uma vez imediatamente após
    a conexão com o banco.
    */

    await executarVerificacaoNotificacoes();


    /*
    =====================================================
    ATUALIZAÇÃO AUTOMÁTICA
    =====================================================
    */

    /*
    Verifica novamente a cada hora.

    Assim:

    - servidor iniciou -> verifica
    - 1 hora -> verifica
    - 2 horas -> verifica
    - 3 horas -> verifica
    */

    setInterval(
      executarVerificacaoNotificacoes,
      UMA_HORA_MS
    );


    /*
    =====================================================
    AJUSTES DA TABELA MONITOR
    =====================================================
    */

    const [condutorCountRow]: any[] =
      await AppDataSource.query(
        `
        SELECT COUNT(*) AS total
        FROM condutor
        `
      );


    if (
      Number(
        condutorCountRow?.total || 0
      ) > 0
    ) {

      await AppDataSource.query(`
        UPDATE monitor
        SET id_condutor = (
          SELECT id_condutor
          FROM condutor
          ORDER BY id_condutor
          LIMIT 1
        )
        WHERE id_condutor IS NULL
      `);

    }


    /*
    =====================================================
    TABELA ESCOLA
    =====================================================
    */

    await AppDataSource.query(`
      CREATE TABLE IF NOT EXISTS escola (
        id_escola INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(150) NOT NULL,
        endereco VARCHAR(255)
      )
    `);


    /*
    =====================================================
    ESCOLA PADRÃO
    =====================================================
    */

    const [escolaCountRow]: any[] =
      await AppDataSource.query(
        `
        SELECT COUNT(*) AS total
        FROM escola
        `
      );


    if (
      Number(
        escolaCountRow?.total || 0
      ) === 0
    ) {

      await AppDataSource.query(
        `
        INSERT INTO escola
          (nome, endereco)
        VALUES
          (
            'Escola Padrão',
            'Endereço não informado'
          )
        `
      );

    }


    /*
    =====================================================
    ATUALIZAR ALUNOS SEM ESCOLA
    =====================================================
    */

    await AppDataSource.query(`
      UPDATE aluno
      SET id_escola = (
        SELECT id_escola
        FROM escola
        ORDER BY id_escola
        LIMIT 1
      )
      WHERE id_escola IS NULL
         OR id_escola = 0
    `);


    /*
    =====================================================
    MODELS
    =====================================================
    */

    console.log(
      "Models carregados:"
    );


    AppDataSource.entityMetadatas
      .forEach(
        (entity) => {

          console.log(
            `- ${entity.name} -> tabela: ${entity.tableName}`
          );

        }
      );


    /*
    =====================================================
    INICIAR SERVIDOR
    =====================================================
    */

    app.listen(
      PORT,
      () => {

        console.log(
          `Servidor rodando: ${link}`
        );

      }
    );

  })

  .catch(
    (error) => {

      console.error(
        "Erro ao conectar no banco:",
        error
      );

    }
  );