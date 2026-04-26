import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity("monitor")
export class Monitor {
    @PrimaryGeneratedColumn({name:"id_monitor"})
    id_monitor!: number;
    
    @Column({type:"varchar", length: 100})
    nome!: string;

    @Column({type: "varchar", length:100, nullable: true})
    email!: string;

    @Column({type: "varchar", length: 30, nullable: true})
    telefone!: string;

    @Column({type: "varchar", length: 255, nullable: true})
    foto!:string;
}