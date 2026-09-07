import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn
} from "typeorm";

@Entity("notificacao")
export class Notificacao {

    @PrimaryGeneratedColumn()
    id_notificacao!: number;

    @Column()
    id_condutor!: number;

    @Column({ length: 50 })
    tipo!: string;

    @Column({ length: 150 })
    titulo!: string;

    @Column("text")
    mensagem!: string;

    @Column({
        type: "enum",
        enum: ["BAIXA", "MEDIA", "ALTA", "CRITICA"],
        default: "MEDIA"
    })
    prioridade!: "BAIXA" | "MEDIA" | "ALTA" | "CRITICA";

    @Column({
        type: "boolean",
        default: false
    })
    lida!: boolean;

    @Column({
        type: "boolean",
        default: false
    })
    resolvida!: boolean;

    @Column({
        type: "varchar",
        length: 50,
        nullable: true
    })
    entidade_tipo!: string | null;

    @Column({
        type: "int",
        nullable: true
    })
    entidade_id!: number | null;

    @CreateDateColumn({
        type: "datetime"
    })
    data_criacao!: Date;

    @Column({
        type: "datetime",
        nullable: true
    })
    data_leitura!: Date | null;

    @Column({
        type: "datetime",
        nullable: true
    })
    data_resolucao!: Date | null;

    @Column({
        type: "datetime",
        nullable: true
    })
    data_expiracao!: Date | null;
}