// Back_end/src/models/model_escola.ts

import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity("escola")
export class Escola {
  @PrimaryGeneratedColumn({ name: "id_escola" })
  id_escola!: number;

  @Column({ type: "varchar", length: 150 })
  nome!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  endereco!: string | null;
}
