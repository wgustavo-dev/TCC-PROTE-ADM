import { randomBytes } from "node:crypto";
import { AppDataSource } from "../config/database";
import { Condutor } from "../models/model_condutor";
import { Monitor } from "../models/model_monitor";
import { Repository } from "typeorm";
import bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";
import { Resend } from "resend";

const JWT_SECRET = process.env.JWT_SECRET || "prote_secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "8h";

type AccessRole = "CONDUTOR" | "MONITOR";

type AuthRecord =
  | { user: Condutor; role: "CONDUTOR"; repository: Repository<Condutor> }
  | { user: Monitor; role: "MONITOR"; repository: Repository<Monitor> };

interface AuthPayload {
  id: number;
  email: string;
  role: AccessRole;
}

export class ServiceAuth {
  private condutorRepository = AppDataSource.getRepository(Condutor);
  private monitorRepository = AppDataSource.getRepository(Monitor);

  async login(email: string, senha: string) {
    const registro = await this.findUserByEmail(email);

    if (!registro || !registro.user.senha) {
      throw new Error("Usuário ou senha inválidos.");
    }

    const senhaValida = await bcrypt.compare(senha, registro.user.senha);

    if (!senhaValida) {
      throw new Error("Usuário ou senha inválidos.");
    }

    const usuarioId =
      registro.role === "CONDUTOR"
        ? (registro.user as Condutor).id_condutor
        : (registro.user as Monitor).id_monitor;

    const token = jwt.sign(
      {
        id: usuarioId,
        email: registro.user.email,
        role: registro.role,
      } as AuthPayload,
      JWT_SECRET as jwt.Secret,
      { expiresIn: JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"] }
    );

    return {
      token,
      usuario: {
        id: usuarioId,
        nome: registro.user.nome,
        email: registro.user.email,
        role: registro.role,
      },
    };
  }

  async recuperarSenha(email: string) {
    const registro = await this.findUserByEmail(email);

    if (!registro) {
      throw new Error("E-mail não encontrado.");
    }

    const resetToken = randomBytes(24).toString("hex");
    const expiracao = new Date(Date.now() + 60 * 60 * 1000);

    registro.user.token_recuperacao = resetToken;
    registro.user.expiracao_recuperacao = expiracao;

    await (registro.repository as any).save(registro.user);
    const resetUrl = `${process.env.APP_URL || "http://localhost:3000"}/redefinir_senha.html?token=${resetToken}`;

    // Envia o e-mail (se configurado). Se o envio falhar, lança erro para o controlador
    try {
      await this.enviarEmailRecuperacao(registro.user.email, resetToken);
    } catch (err) {
      console.error('Erro ao enviar e-mail de recuperação:', err);
      throw err;
    }

    // Em ambiente de desenvolvimento ou quando explicitamente solicitado, retorne o token/link
    const devShow = (process.env.DEV_SHOW_RESET_LINK || '').toLowerCase() === 'true' || (process.env.NODE_ENV || '').toLowerCase() !== 'production';

    if (devShow) {
      console.log('Reset URL (dev):', resetUrl);
      return {
        message: "E-mail enviado com instruções para redefinir a senha.",
        resetToken,
        resetUrl,
      };
    }

    return {
      message: "E-mail enviado com instruções para redefinir a senha.",
    };
  }

  private createResendClient() {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      throw new Error(
        "Envio de e-mail não configurado. Configure RESEND_API_KEY no arquivo .env."
      );
    }

    return new Resend(apiKey);
  }

  private async enviarEmailRecuperacao(email: string, token: string) {
    const resend = this.createResendClient();
    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const resetUrl = `${appUrl}/redefinir_senha.html?token=${token}`;
    const fromAddress =
      process.env.EMAIL_FROM || process.env.SMTP_FROM || "PROTE <onboarding@resend.dev>";

    try {
      const result = await resend.emails.send({
        from: fromAddress,
        to: email,
        subject: "Recuperação de senha PROTE",
        text:
          `Você solicitou a recuperação de senha para PROTE.` +
          `\n\nUse o link abaixo para redefinir a senha:` +
          `\n${resetUrl}` +
          `\n\nO link expira em 1 hora.`,
        html:
          `<p>Você solicitou a recuperação de senha para PROTE.</p>` +
          `<p>Clique no link abaixo para redefinir sua senha:</p>` +
          `<p><a href="${resetUrl}">${resetUrl}</a></p>` +
          `<p>O link expira em 1 hora.</p>`,
      });

      console.log("Resend send result:", JSON.stringify(result, null, 2));

      if (result.error) {
        console.error("Erro ao enviar email Resend:", result.error);
        throw new Error(`Erro ao enviar email: ${JSON.stringify(result.error)}`);
      }

      console.log("Email enviado com sucesso para:", email);
    } catch (err) {
      console.error("Erro ao chamar Resend API:", err);
      throw err;
    }
  }

  async redefinirSenha(token: string, novaSenha: string) {
    const registro = await this.findUserByToken(token);

    if (!registro) {
      throw new Error("Token inválido ou expirado.");
    }

    if (!registro.user.token_recuperacao || !registro.user.expiracao_recuperacao) {
      throw new Error("Token inválido ou expirado.");
    }

    const expiracao = new Date(registro.user.expiracao_recuperacao);
    if (expiracao.getTime() < Date.now()) {
      throw new Error("Token expirado.");
    }

    registro.user.senha = await bcrypt.hash(novaSenha, 10);
    registro.user.token_recuperacao = null as any;
    registro.user.expiracao_recuperacao = null as any;

    await (registro.repository as any).save(registro.user);
  }

  private async findUserByEmail(email: string) {
    const condutor = await this.condutorRepository.findOneBy({ email });
    if (condutor) {
      return { user: condutor, role: "CONDUTOR" as AccessRole, repository: this.condutorRepository };
    }

    const monitor = await this.monitorRepository.findOneBy({ email });
    if (monitor) {
      return { user: monitor, role: "MONITOR" as AccessRole, repository: this.monitorRepository };
    }

    return null;
  }

  private async findUserByToken(token: string) {
    const condutor = await this.condutorRepository.findOneBy({ token_recuperacao: token });
    if (condutor) {
      return { user: condutor, role: "CONDUTOR" as AccessRole, repository: this.condutorRepository };
    }

    const monitor = await this.monitorRepository.findOneBy({ token_recuperacao: token });
    if (monitor) {
      return { user: monitor, role: "MONITOR" as AccessRole, repository: this.monitorRepository };
    }

    return null;
  }
}
