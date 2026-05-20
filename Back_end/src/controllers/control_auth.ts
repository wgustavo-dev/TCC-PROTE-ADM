import { Request, Response } from "express";
import { ServiceAuth } from "../services/service_auth";

const serviceAuth = new ServiceAuth();

export class ControlAuth {
  async login(req: Request, res: Response) {
    try {
      const { email, senha } = req.body;

      if (!email || !senha) {
        return res.status(400).json({ error: "E-mail e senha são obrigatórios." });
      }

      const resultado = await serviceAuth.login(email.trim(), senha);

      return res.status(200).json(resultado);
    } catch (error: any) {
      return res.status(400).json({ error: error.message || "Erro ao fazer login." });
    }
  }

  async recuperarSenha(req: Request, res: Response) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: "Informe um e-mail válido." });
      }

      const resultado = await serviceAuth.recuperarSenha(email.trim());

      return res.status(200).json(resultado);
    } catch (error: any) {
      return res.status(400).json({ error: error.message || "Erro ao solicitar recuperação de senha." });
    }
  }

  async redefinirSenha(req: Request, res: Response) {
    try {
      const { token, novaSenha } = req.body;

      if (!token || !novaSenha) {
        return res.status(400).json({ error: "Token e nova senha são obrigatórios." });
      }

      await serviceAuth.redefinirSenha(token, novaSenha);

      return res.status(200).json({ message: "Senha redefinida com sucesso." });
    } catch (error: any) {
      return res.status(400).json({ error: error.message || "Erro ao redefinir senha." });
    }
  }
}
