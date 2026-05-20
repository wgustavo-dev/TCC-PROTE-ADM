import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "prote_secret";

type AccessRole = "CONDUTOR" | "MONITOR";

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: AccessRole;
  };
}

export function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authorization = req.headers.authorization;

  if (!authorization) {
    return res.status(401).json({ error: "Token de autenticação ausente." });
  }

  const [type, token] = authorization.split(" ");

  if (type !== "Bearer" || !token) {
    return res.status(401).json({ error: "Formato de token inválido." });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as {
      id: number;
      email: string;
      role: AccessRole;
    };

    req.user = {
      id: payload.id,
      email: payload.email,
      role: payload.role,
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: "Token inválido ou expirado." });
  }
}
