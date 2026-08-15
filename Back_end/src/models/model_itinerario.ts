// Back_end/src/models/model_itinerario.ts
//
// REFEITO DO ZERO: antes esse módulo não tinha model nenhum, o
// service_itinerario.ts falava direto com o banco via AppDataSource.query
// (SQL cru). Isso destoava do resto do sistema, que usa TypeORM (repository
// pattern) em todo mundo — presenca, mensalidade, aluno etc. Este model
// segue exatamente o mesmo formato de model_presenca.ts.

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from "typeorm";

import { Aluno } from "./model_aluno";
import { Condutor } from "./model_condutor";

/*
  IMPORTANTE sobre o campo `turno` desta tabela:
  Ele NÃO é o turno escolar do aluno (isso fica em aluno.turno). Ele é o
  PERÍODO DA VIAGEM — quando o carro está na rua fazendo aquele trajeto
  específico (IDA ou VOLTA) daquele aluno. Um aluno do turno da manhã que
  volta da escola à tarde gera, por exemplo, um registro (turno=TARDE,
  tipo=VOLTA). A regra completa de derivação está em service_itinerario.ts.
*/
@Entity("itinerario_aluno")
@Unique("uk_aluno_turno_tipo", ["id_aluno", "turno", "tipo"])
export class ItinerarioAluno {
  @PrimaryGeneratedColumn({ name: "id_itinerario" })
  id_itinerario!: number;

  @Column({ type: "int" })
  id_aluno!: number;

  @Column({ type: "int" })
  id_condutor!: number;

  @Column({
    type: "enum",
    enum: ["MANHA", "TARDE", "NOITE"],
  })
  turno!: "MANHA" | "TARDE" | "NOITE";

  @Column({
    type: "enum",
    enum: ["IDA", "VOLTA"],
  })
  tipo!: "IDA" | "VOLTA";

  @Column({ type: "int" })
  ordem!: number;

  @CreateDateColumn({ name: "criado_em" })
  criado_em!: Date;

  @ManyToOne(() => Aluno)
  @JoinColumn({ name: "id_aluno" })
  aluno!: Aluno;

  @ManyToOne(() => Condutor)
  @JoinColumn({ name: "id_condutor" })
  condutor!: Condutor;
}