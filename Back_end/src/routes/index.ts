import { Router } from 'express';
import routeAluno from './route_aluno';
import routeDocumento from './route_documento';
import routeDespesa from './route_despesa';
import routeOrcamento from './route_orcamento';
import routePresenca from './route_presenca';
import routeMensalidade from "./route_mensalidade";
import routeDashboard from "./route_dashboard";

const routes = Router();

routes.use('/api', routeAluno);
routes.use('/api', routeDocumento);
routes.use('/api', routeDespesa);
routes.use('/api', routeOrcamento);
routes.use('/api', routePresenca)
routes.use('/api', routeMensalidade)
routes.use("/api", routeDashboard);

export default routes;