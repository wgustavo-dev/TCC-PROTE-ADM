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
import { Escola } from "./model_escola";

@Entity("aluno")
export class Aluno {
  @PrimaryGeneratedColumn({ name: "id_aluno" })
  id_aluno!: number;

  @Column({ type: "varchar", length: 100 })
  nome!: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  bairro!: string;

  /*
    ALTERADO:
    Antes existia um campo "escola" (varchar) com o nome da escola
    digitado como texto livre.
    Agora o aluno se relaciona com a escola por ID, pois escolas
    recebem alunos (relação real, não texto solto).
  */
  @Column({ type: "int" })
  id_escola!: number;

  @Column({
    type: "enum",
    enum: ["MANHA", "TARDE"],
    nullable: true,
  })
  turno!: "MANHA" | "TARDE";

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

  /*
    ADICIONADO (schema_prote_v1.11):
    Dia do mês em que a mensalidade deste aluno vence ("todo dia X").
    É definido/atualizado a partir do formulário de mensalidade e usado
    pela rotina de renovação mensal para gerar a mensalidade do mês
    seguinte automaticamente.
  */
  @Column({ type: "tinyint", nullable: true })
  dia_vencimento!: number | null;

  @ManyToOne(() => Responsavel, { nullable: false })
  @JoinColumn({ name: "id_responsavel" })
  responsavel!: Responsavel;

  @ManyToOne(() => Condutor, { nullable: true })
  @JoinColumn({ name: "id_condutor" })
  condutor!: Condutor;

  /*
    ADICIONADO:
    Relação obrigatória com escola.
  */
  @ManyToOne(() => Escola, { nullable: false })
  @JoinColumn({ name: "id_escola" })
  escola!: Escola;
}