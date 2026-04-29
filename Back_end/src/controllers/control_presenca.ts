import {  Request,  Response,  } from "express";
import { ServicePresenca } from "../services/service_presenca";
import { Presenca } from "../models/model_presenca";

const service = new ServicePresenca()


export class ControlPresenca{

    async listar (req: Request, res: Response){
        try{
            const presenca = await service.listar();
            return res.json(presenca)

        }catch (error:any){
            return res.status(500).json({error:error.message})
        }
    }

    async listarPorData(req: Request, res: Response){
        try{
            //se der problema tira o as data string
            const {data} = req.params as { data: string }

            const presenca = await service.listarPorData(data)
            return res.json(presenca)
        }catch(error:any){
            return res.status(500).json({error:error.message})
        }
    }

    async criar(req: Request, res: Response){
        try{
            console.log("body recebido:", req.body)

            const dados = req.body
            const presenca = await service.criar(dados)

            return res.status(201).json(presenca);

        }catch(error:any){
            return res.status(400).json({erro: error.message})
        }
    }

    async atualizar (req: Request, res: Response){
        try{
            const { id }= req.params;
            const dados = req.body;

            const presenca =await service.atualizar(Number (id), dados)

            return res.json(presenca)

        }catch(error:any){

            return res.status(400).json({error:error.message})
        }
   
    }

    async deletar (req: Request, res: Response){
        try{
            const { id }= req.params;
            const dados = req.body;

            const resultado =await service.deletar(Number (id))

            return res.json(resultado)

        }catch(error:any){
            
            return res.status(404).json({error:error.message})
        }
    }
}