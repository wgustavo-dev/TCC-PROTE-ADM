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
@Unique("uk_presenca_aluno_data_turno_tipo", ["id_aluno", "data", "turno", "tipo"])
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

  // Diferencia a chamada de IDA (indo para a escola) da chamada de VOLTA
  // (retornando para casa). Junto com id_aluno + data + turno, forma a
  // identidade lógica de um registro de presença — necessário porque a
  // TARDE pode ter, no mesmo turno, alunos de IDA e alunos de VOLTA
  // (ver service_linha_trajeto.ts e service_itinerario.ts).
  @Column({
    type: "enum",
    enum: ["IDA", "VOLTA"],
  })
  tipo!: "IDA" | "VOLTA";

  @Column({
    type: "enum",
    enum: ["PRESENTE", "AUSENTE"],
  })
  status!: "PRESENTE" | "AUSENTE";

  // Observação opcional, só faz sentido quando o aluno está AUSENTE
  // (ex.: "Não volta com a gente hoje porque o pai buscou"). Pertence à
  // presença específica de aluno/data/turno/tipo — nunca é compartilhada
  // entre o registro de IDA e o de VOLTA do mesmo aluno.
  @Column({ type: "text", nullable: true })
  observacao!: string | null;

  @ManyToOne(() => Aluno)
  @JoinColumn({ name: "id_aluno" })
  aluno!: Aluno;
}