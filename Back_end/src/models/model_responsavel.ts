import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity("responsavel")
export class Responsavel{
    @PrimaryGeneratedColumn({name:"id_responsavel"})
    id_responsavel!:number;

    @Column({type:"varchar", length: 100})
    nome!: string;

    @Column({type:"varchar", length:20})
    telefone!:string;

    @Column({type:"varchar", length:100, nullable: true})
    email!:string;

    @Column({type:"varchar", length:255, nullable: true})
    endereco!:string;

    @Column({type:"int", nullable: true})
    quantidade_alunos!:number;
}