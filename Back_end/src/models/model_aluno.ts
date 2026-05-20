// Back_end/src/models/model_aluno.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";

import { Responsavel } from "./model_responsavel";
import { Condutor } from "./model_condutor";

@Entity("aluno")
export class Aluno {
  @PrimaryGeneratedColumn({ name: "id_aluno" })
  id_aluno!: number;

  @Column({ type: "varchar", length: 100 })
  nome!: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  bairro!: string;

  @Column({ type: "varchar", length: 150, nullable: true })
  escola!: string;

  @Column({
    type: "enum",
    enum: ["MANHA", "TARDE", "NOITE"],
    nullable: true,
  })
  turno!: "MANHA" | "TARDE" | "NOITE";

  @Column({ type: "varchar", length: 255, nullable: true })
  endereco_embarque!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  endereco_desembarque!: string;

  @Column({
    type: "enum",
    enum: ["IDA", "VOLTA", "AMBOS"],
    nullable: true,
  })
  tipo_trajeto!: "IDA" | "VOLTA" | "AMBOS";

  /*
    ALTERADO:
    Antes id_responsavel era nullable: true.
    Agora é obrigatório, porque aluno não pode existir sem responsável.
  */
  @Column({ type: "int" })
  id_responsavel!: number;

  @Column({ type: "int", nullable: true })
  id_condutor!: number;

  @Column({ type: "varchar", length: 255, nullable: true })
  foto!: string;

  @ManyToOne(() => Responsavel, { nullable: false })
  @JoinColumn({ name: "id_responsavel" })
  responsavel!: Responsavel;

  @ManyToOne(() => Condutor, { nullable: true })
  @JoinColumn({ name: "id_condutor" })
  condutor!: Condutor;
}