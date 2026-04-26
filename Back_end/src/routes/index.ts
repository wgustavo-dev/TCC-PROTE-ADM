import {Router} from "express";
import routeAluno from "./route_aluno";

const routes = Router();
routes.use("/api", routeAluno);

export default routes;