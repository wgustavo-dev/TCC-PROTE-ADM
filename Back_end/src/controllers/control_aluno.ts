import {Request, Response} from 'express';
import {ServiceAluno} from '../services/service_aluno';

const service = new ServiceAluno();

export class ControlAluno{

    async listar(req: Request, res: Response){
        try{
            const alunos =await service.listar();
            return res.json(alunos);

        }catch (error){
            return res.status(500).json({error: error.message});
        }
    }

    async buscarPorID(req: Request, res: Response){
        try{
            const { id } = req.params;

            const aluno = await service.buscarPorID(Number(id));
            return res.status(201).json(aluno);
        }catch (error:any){
            return res.status(404).json({error: error.message});
        }
    }

    async criar(req: Request, res: Response){
        try{

                console.log("BODY RECEBIDO:", req.body);

            const dados = req.body;
            const aluno = await service.criar(dados);

            return res.status(201).json(aluno);

        }catch(error:any){
            return res.status(400).json({erro: error.message})
        }
    }

    async atualizar(req: Request, res: Response){
        try{
            const { id } = req.params;
            const dados = req.body;

            const aluno = await service.atualizar(Number(id), dados);

            return res.json(aluno);
}catch(error:any){
    return res.status(400).json({error: error.message})
}
    }

    async deletar(req:Request, res:Response){
        try{
            const {id}= req.params;

            const resultado =await service.deletar(Number(id))
            return res.json(resultado);
        }catch(error:any){
            return res.status(404).json({error: error.message})
        }
    }
}
