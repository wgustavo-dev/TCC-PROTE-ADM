import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";

import { Condutor } from "./model_condutor";

@Entity("monitor")
export class Monitor {
  @PrimaryGeneratedColumn({ name: "id_monitor" })
  id_monitor!: number;

  @Column({ type: "varchar", length: 100 })
  nome!: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  email!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  senha!: string;

  @Column({ type: "varchar", length: 30, nullable: true })
  telefone!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  foto!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  token_recuperacao!: string;

  @Column({ type: "datetime", nullable: true })
  expiracao_recuperacao!: Date;

  // NOVO (Controle de Acessos): todo monitor pertence obrigatoriamente
  // a um condutor. O valor é preenchido pelo backend a partir do
  // condutor autenticado (req.user), nunca escolhido pelo frontend.
  @Column({ type: "int" })
  id_condutor!: number;

  @ManyToOne(() => Condutor)
  @JoinColumn({ name: "id_condutor" })
  condutor!: Condutor;

  // NOVO (Controle de Acessos): exclusão lógica.
  // DELETE não remove a linha, apenas define ativo = false.
  @Column({ type: "boolean", default: true })
  ativo!: boolean;
}
