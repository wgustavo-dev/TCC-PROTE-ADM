import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";

import { Aluno } from "./model_aluno";

@Entity("mensalidade")
export class Mensalidade {
  @PrimaryGeneratedColumn({ name: "id_mensalidade" })
  id_mensalidade!: number;

  @Column({ type: "int" })
  id_aluno!: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  valor!: number;

  @Column({ type: "date" })
  data_vencimento!: Date;

  @Column({ type: "date", nullable: true })
  data_pagamento!: Date;

  @Column({
    type: "enum",
    enum: ["PAGO", "PENDENTE", "ATRASADO"],
    default: "PENDENTE",
  })
  status!: "PAGO" | "PENDENTE" | "ATRASADO";

  @ManyToOne(() => Aluno)
  @JoinColumn({ name: "id_aluno" })
  aluno!: Aluno;
}