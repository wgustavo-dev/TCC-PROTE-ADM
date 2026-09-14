import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from "typeorm";

import { Aluno } from "./model_aluno";

@Entity("presenca")
@Unique("uk_presenca_aluno_data_turno", ["id_aluno", "data", "turno"])
export class Presenca {
  @PrimaryGeneratedColumn({ name: "id_presenca" })
  id_presenca!: number;

  @Column({ type: "int" })
  id_aluno!: number;

  @Column({ type: "date" })
  data!: Date;

  @Column({
    type: "enum",
    enum: ["MANHA", "TARDE", "NOITE"],
  })
  turno!: "MANHA" | "TARDE" | "NOITE";

  @Column({
    type: "enum",
    enum: ["PRESENTE", "AUSENTE"],
  })
  status!: "PRESENTE" | "AUSENTE";

  @ManyToOne(() => Aluno)
  @JoinColumn({ name: "id_aluno" })
  aluno!: Aluno;
}
