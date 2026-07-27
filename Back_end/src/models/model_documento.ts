import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";

import { Condutor } from "./model_condutor";

@Entity("documento")
export class Documento {
  @PrimaryGeneratedColumn({ name: "id_documento" })
  id_documento!: number;

  @Column({ type: "varchar", length: 100 })
  tipo_documento!: string;

  @Column({ type: "date", nullable: true })
  data_emissao!: Date;

  @Column({ type: "date", nullable: true })
  data_validade!: Date;

  @Column({
    type: "enum",
    enum: ["VALIDO", "VENCIDO"],
    default: "VALIDO",
  })
  status!: "VALIDO" | "VENCIDO";

  @Column({ type: "int", nullable: true })
  id_condutor!: number;

  @ManyToOne(() => Condutor, { nullable: true })
  @JoinColumn({ name: "id_condutor" })
  condutor!: Condutor;
}