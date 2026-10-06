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

import { PaymentCurrency } from "@domain/enums/payment-currency.enum";
import { WishStatus } from "@domain/enums/wish-status.enum";

import { ListOrmEntity } from "./list.orm-entity";

@Entity("wishes")
@Index(["listId", "createdAt"])
@Index(["status"])
export class WishOrmEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @Column("uuid")
  listId!: string;

  @ManyToOne(() => ListOrmEntity, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "listId" })
  list!: ListOrmEntity;

  @Column({ type: "varchar", length: 255 })
  title!: string;

  @Column({ type: "varchar", nullable: true })
  description!: string | null;

  /**
   * A Wish owns its product links directly.
   *
   * A separate WishLink table would add joins and CRUD complexity without
   * giving the MVP any useful capability. If links later need metadata such
   * as store name, label, priority, or price snapshots, this can be migrated
   * to a dedicated entity.
   */
  @Column({
    type: "jsonb",
    default: () => "'[]'",
  })
  links!: string[];

  @Column({
    type: "decimal",
    precision: 30,
    scale: 18,
    nullable: true,
  })
  targetAmount!: string | null;

  @Column({
    type: "enum",
    enum: PaymentCurrency,
    nullable: true,
  })
  currency!: PaymentCurrency | null;

  @Column({
    type: "enum",
    enum: WishStatus,
    default: WishStatus.ACTIVE,
  })
  status!: WishStatus;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
