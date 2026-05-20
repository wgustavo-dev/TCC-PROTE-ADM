import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";

import { Condutor } from "./model_condutor";

@Entity("orcamento")
export class Orcamento {
  @PrimaryGeneratedColumn({ name: "id_orcamento" })
  id_orcamento!: number;

  @Column({ type: "varchar", length: 100 })
  nome_responsavel!: string;

  @Column({ type: "varchar", length: 20 })
  telefone!: string;

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

  @Column({ type: "int", default: 1 })
  quantidade_alunos!: number;

  @Column({
    type: "enum",
    enum: ["IDA", "VOLTA", "AMBOS"],
    nullable: true,
  })
  tipo_trajeto!: "IDA" | "VOLTA" | "AMBOS";

  @Column({ type: "varchar", length: 255, nullable: true })
  endereco_embarque!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  endereco_desembarque!: string;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  valor!: number;

  @Column({
    type: "enum",
    enum: ["PENDENTE", "EM_CADASTRO", "CONVERTIDO", "RECUSADO"],
    default: "PENDENTE",
  })
  status!: "PENDENTE" | "CONVERTIDO" | "RECUSADO" |"EM_CADASTRO";

  @Column({ type: "boolean", default: false })
  convertido!: boolean;

  @Column({ type: "date", nullable: true })
  data_solicitacao!: Date;

  @Column({ type: "date", nullable: true })
  data_conversao!: Date;

  @Column({ type: "int", nullable: true })
  id_condutor!: number;

  @ManyToOne(() => Condutor, { nullable: true })
  @JoinColumn({ name: "id_condutor" })
  condutor!: Condutor;
}