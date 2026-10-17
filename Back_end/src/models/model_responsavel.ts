// Back_end/src/models/model_responsavel.ts

import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";

@Entity("responsavel")
@Index("uk_responsavel_telefone", ["telefone"], { unique: true })
@Index("uk_responsavel_telefone_emergencia", ["telefone_emergencia"], { unique: true })
@Index("uk_responsavel_email", ["email"], { unique: true })
export class Responsavel {
  @PrimaryGeneratedColumn({ name: "id_responsavel" })
  id_responsavel!: number;

  @Column({ type: "varchar", length: 100 })
  nome!: string;

  @Column({ type: "varchar", length: 20 })
  telefone!: string;

  @Column({ type: "varchar", length: 20, nullable: true })
  telefone_emergencia!: string | null;

  /*
    Email é opcional no banco e no backend.
  */
  @Column({ type: "varchar", length: 100, nullable: true })
  email!: string | null;

  /*
    Endereço agora é obrigatório.
    Antes estava nullable: true.
  */
  @Column({ type: "varchar", length: 255 })
  endereco!: string;

  /*
    Quantidade de alunos agora é obrigatória.
    No fluxo manual, esse campo define quantas vezes o sistema repetirá:
    aluno -> mensalidade.
  */
  @Column({ type: "int", default: 1 })
  quantidade_alunos!: number;
}