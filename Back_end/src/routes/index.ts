import { Router } from 'express';
import routeAuth from './route_auth';
import routeAluno from './route_aluno';
import routeDocumento from './route_documento';
import routeDespesa from './route_despesa';
import routeOrcamento from './route_orcamento';
import routePresenca from './route_presenca';
import routeMensalidade from "./route_mensalidade";
import routeDashboard from "./route_dashboard";
import routeResponsavel from "./route_responsavel";
import routeEscola from "./route_escola";
import routeAcessos from "./route_acessos";
import routeItinerario from "./route_itinerario";

const routes = Router();

routes.use('/api/auth', routeAuth);
routes.use('/api', routeAcessos);
routes.use('/api', routeResponsavel);
routes.use('/api', routeAluno);
routes.use('/api', routeEscola);
routes.use('/api', routeDocumento);
routes.use('/api', routeDespesa);
routes.use('/api', routeOrcamento);
routes.use('/api', routePresenca)
routes.use('/api', routeMensalidade)
routes.use("/api", routeDashboard);
routes.use("/api", routeItinerario);
export default routes;