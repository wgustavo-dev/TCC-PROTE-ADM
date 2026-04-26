import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";

import { Aluno } from "./model_aluno";

@Entity("presenca")
export class Presenca {
  @PrimaryGeneratedColumn({ name: "id_presenca" })
  id_presenca!: number;

  @Column({ type: "int" })
  id_aluno!: number;

  @Column({ type: "date" })
  data!: Date;

  @Column({
    type: "enum",
    enum: ["PRESENTE", "AUSENTE"],
  })
  status!: "PRESENTE" | "AUSENTE";

  @ManyToOne(() => Aluno)
  @JoinColumn({ name: "id_aluno" })
  aluno!: Aluno;
}