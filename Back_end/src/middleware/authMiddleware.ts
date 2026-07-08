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

function getTokenFromCookie(req: Request) {
  const cookieHeader = req.headers.cookie || "";
  const cookies = Object.fromEntries(
    cookieHeader.split(";").filter(Boolean).map((entry) => {
      const [key, ...valueParts] = entry.trim().split("=");
      return [key, decodeURIComponent(valueParts.join("=")).trim()];
    })
  );

  return cookies.prote_token || cookies.prote_session || null;
}

export function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authorization = req.headers.authorization;
  const tokenFromHeader = authorization?.startsWith("Bearer ") ? authorization.split(" ")[1] : null;
  const token = tokenFromHeader || getTokenFromCookie(req);

  if (!token) {
    return res.status(401).json({ error: "Token de autenticação ausente." });
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
