import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from "typeorm";
import { PaymentCurrency } from "@domain/enums/payment-currency.enum";
import { UserOrmEntity } from "./user.orm-entity";
import { WishOrmEntity } from "./wish.orm-entity";

@Entity("gifts")
@Index(["wishId", "createdAt"])
@Index(["userId", "createdAt"])
export class GiftOrmEntity {
  @PrimaryColumn("uuid")
  id!: string;

  @Column("uuid")
  userId!: string;

  @ManyToOne(() => UserOrmEntity, {
    nullable: false,
    onDelete: "RESTRICT",
  })
  @JoinColumn({ name: "userId" })
  user!: UserOrmEntity;

  @Column("uuid", { nullable: true })
  wishId!: string | null;

  @ManyToOne(() => WishOrmEntity, {
    nullable: true,
    onDelete: "RESTRICT",
  })
  @JoinColumn({ name: "wishId" })
  wish!: WishOrmEntity | null;

  @Column({
    type: "decimal",
    precision: 30,
    scale: 18,
  })
  amount!: string;

  @Column({
    type: "enum",
    enum: PaymentCurrency,
  })
  currency!: PaymentCurrency;

  @Column({
    type: "boolean",
    default: false,
  })
  anonymous!: boolean;

  @Column({
    type: "varchar",
    nullable: true,
  })
  message!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
