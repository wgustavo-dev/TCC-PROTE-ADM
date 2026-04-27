import { Router } from 'express';
import routeAluno from './route_aluno';
import routeDocumento from './route_documento';
import routeDespesa from './route_despesa';
import routeOrcamento from './route_orcamento';

const routes = Router();

routes.use('/api', routeAluno);
routes.use('/api', routeDocumento);
routes.use('/api', routeDespesa);
routes.use('/api', routeOrcamento);

export default routes;