import { Response, NextFunction } from "express";
import type { AuthRequest } from "./authMiddleware";

type AccessRole = "CONDUTOR" | "MONITOR";

export function roleMiddleware(allowedRoles: AccessRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: "Usuário não autenticado." });
    }

    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: "Acesso negado para o seu perfil." });
    }

    next();
  };
}
