import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity("despesa")
export class Despesa {
  @PrimaryGeneratedColumn({ name: "id_despesa" })
  id_despesa!: number;

  @Column({ type: "varchar", length: 100 })
  tipo!: string;

  @Column({ type: "text", nullable: true })
  descricao!: string;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  valor!: number;

  @Column({ type: "date" })
  data!: Date;
}