import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
} from "typeorm";

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

  @Column({ type: "varchar", length: 255, nullable: true })
  foto!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  token_recuperacao!: string;

  @Column({ type: "datetime", nullable: true })
  expiracao_recuperacao!: Date;

  // NOVO (Controle de Acessos): exclusão lógica.
  // DELETE não remove a linha, apenas define ativo = false.
  @Column({ type: "boolean", default: true })
  ativo!: boolean;
}
