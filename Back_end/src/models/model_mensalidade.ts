// Back_end/src/models/model_mensalidade.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";

import { Aluno } from "./model_aluno";
import { Condutor } from "./model_condutor";

@Entity("mensalidade")
export class Mensalidade {
  @PrimaryGeneratedColumn({ name: "id_mensalidade" })
  id_mensalidade!: number;

  /*
    MANTIDO/CORRIGIDO:
    id_aluno é obrigatório.
    Mensalidade não pode existir sem aluno.
  */
  @Column({ type: "int" })
  id_aluno!: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  valor!: number;

  @Column({ type: "date" })
  data_vencimento!: Date;

  @Column({ type: "date", nullable: true })
  data_pagamento!: Date | null;

  @Column({
    type: "enum",
    enum: ["PAGO", "PENDENTE", "ATRASADO"],
    default: "PENDENTE",
  })
  status!: "PAGO" | "PENDENTE" | "ATRASADO";

  /*
    ADICIONADO:
    O schema do banco possui id_condutor na tabela mensalidade.
    O model precisa representar esse campo para ficar sincronizado com o banco.
  */
  @Column({ type: "int", nullable: true })
  id_condutor!: number | null;

  /*
    ADICIONADO (schema_prote_v1.11):
    Mês/ano de referência desta mensalidade, no formato "YYYY-MM".
    Existe para impedir que a rotina de renovação mensal crie duas
    mensalidades para o mesmo aluno no mesmo mês (histórico nunca é
    apagado, só usado para checar o que já foi gerado).
  */
  @Column({ type: "char", length: 7 })
  mes_referencia!: string;

  /*
    ALTERADO:
    Relação com aluno explicitamente obrigatória.
  */
  @ManyToOne(() => Aluno, { nullable: false })
  @JoinColumn({ name: "id_aluno" })
  aluno!: Aluno;

  /*
    ADICIONADO:
    Relação opcional com condutor, acompanhando o schema atual.
  */
  @ManyToOne(() => Condutor, { nullable: true })
  @JoinColumn({ name: "id_condutor" })
  condutor!: Condutor | null;
}