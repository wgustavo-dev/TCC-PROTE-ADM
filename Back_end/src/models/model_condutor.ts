import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";

import { Monitor } from "./model_monitor";

@Entity("condutor")
export class Condutor {
  @PrimaryGeneratedColumn({ name: "id_condutor" })
  id_condutor!: number;

  @Column({ type: "varchar", length: 100 })
  nome!: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  email!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  senha!: string;

  @Column({ type: "varchar", length: 20, nullable: true })
  telefone!: string;

  @Column({ type: "text", nullable: true })
  escolas!: string;

  @Column({ type: "boolean", default: false })
  possui_monitor!: boolean;

  @Column({ type: "varchar", length: 255, nullable: true })
  foto!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  token_recuperacao!: string;

  @Column({ type: "datetime", nullable: true })
  expiracao_recuperacao!: Date;

  @Column({ type: "int", nullable: true })
  id_monitor!: number;

  @ManyToOne(() => Monitor, { nullable: true })
  @JoinColumn({ name: "id_monitor" })
  monitor!: Monitor;
}