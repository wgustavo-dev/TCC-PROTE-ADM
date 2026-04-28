import { Request, Response } from "express";
import { ServiceMensalidade } from "../services/service_mensalidade";

const service = new ServiceMensalidade()

export class ControlMensalidade{

    async listar (req:Request, res:Response){
        try{
            const mensalidade = await service.listar()
            return res.json(mensalidade);

        }catch (error:any){
            return res.status(500).json({error:error.message})
        }
    }

    async buscarPorId(req:Request, res:Response){
        try{
            const {id} = req.params;

            const mensalidade = await service.buscarPorId(Number(id));
            return res.status(201).json(mensalidade)

        }catch( error:any){
            return res.status(404).json({error:error.message})
        }
    }

    async criar(req: Request, res: Response){
        try{
            
            const dados = req.body
            const mensalidade = await service.criar(dados)
;
            return res.status(201).json(mensalidade)

        }catch(error:any){
            return res.status(400).json({erro:error.message})
        }
    }

    async atualizar(req: Request, res:Response){
        try{
            const {id} = req.params;
            const dados = req.body;

            const mensalidade = await service.atualizar (Number(id), dados);

            return res.json(mensalidade)

        }catch(error:any){
            return res.status(400).json({error: error.message})
        }
    }

    async deletar(req:Request, res: Response){
        try{
            const {id} = req.params;

            const resultado = await service.deletar(Number(id))
            return res.json(resultado);
        }catch (error:any){
            return res.status(404).json({
                error:error.message
            })
        }

    }

    async marcarComoPago (req:Request, res:Response){
        try{
            const {id} = req.params

            const mensalidade = await service.marcarComoPago(Number(id))

            return res.json(mensalidade)

        }catch(error:any){
            return res.status(400).json({ error: error.message });
        }
    }
}