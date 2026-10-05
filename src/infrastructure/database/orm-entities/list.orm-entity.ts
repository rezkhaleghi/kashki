import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";

import { ListVisibility } from "@domain/enums/list-visibility.enum";
import { UserOrmEntity } from "./user.orm-entity";

/**
 * ORM representation of a List.
 *
 * The domain List entity remains persistence-agnostic. This class exists
 * only at the infrastructure boundary where TypeORM-specific concerns
 * such as columns, indexes and foreign keys belong.
 */
@Entity("lists")
@Index(["userId", "createdAt"])
@Index(["visibility"])
export class ListOrmEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @Column("uuid")
  userId!: string;

  @ManyToOne(() => UserOrmEntity, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "userId" })
  user!: UserOrmEntity;

  @Column({ type: "varchar" })
  name!: string;

  @Column({ type: "varchar", nullable: true })
  description!: string | null;

  @Column({
    type: "enum",
    enum: ListVisibility,
    default: ListVisibility.PRIVATE,
  })
  visibility!: ListVisibility;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
