import { registerAs } from "@nestjs/config";
import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import { UserOrmEntity } from "../database/orm-entities/user.orm-entity";
import { AuditLogOrmEntity } from "../database/orm-entities/audit-log.orm-entity";
import { UserBalanceOrmEntity } from "@infrastructure/database/orm-entities/user-balance.orm-entity";
import { LedgerOrmEntity } from "@infrastructure/database/orm-entities/ledger.orm-entity";
import { DepositOrmEntity } from "@infrastructure/database/orm-entities/deposit.orm-entity";
import { WithdrawalOrmEntity } from "@infrastructure/database/orm-entities/withdrawal.orm-entity";
import { TicketOrmEntity } from "../database/orm-entities/ticket.orm-entity";
import { TicketMessageOrmEntity } from "../database/orm-entities/ticket-message.orm-entity";
import { TicketCategoryOrmEntity } from "../database/orm-entities/ticket-category.orm-entity";
import { NotificationOrmEntity } from "@infrastructure/database/orm-entities/notification.orm-entity";
import { ListOrmEntity } from "@infrastructure/database/orm-entities/list.orm-entity";
import { WishOrmEntity } from "@infrastructure/database/orm-entities/wish.orm-entity";

/**
 * NestJS database configuration.
 *
 * This configuration is used by TypeORM when running
 * inside the NestJS application.
 */
export default registerAs(
  "database",
  (): TypeOrmModuleOptions => ({
    type: "postgres",
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT ?? "5432", 10),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [
      UserOrmEntity,
      AuditLogOrmEntity,
      UserBalanceOrmEntity,
      LedgerOrmEntity,
      DepositOrmEntity,
      WithdrawalOrmEntity,
      TicketOrmEntity,
      TicketMessageOrmEntity,
      TicketCategoryOrmEntity,
      NotificationOrmEntity,
      ListOrmEntity,
      WishOrmEntity,
    ],
    synchronize: process.env.NODE_ENV === "development",
    // synchronize: true, // Set to false in production to avoid data loss
    extra: {
      max: 10,
    },
  }),
);

//                     Database
//                        │
//           ┌────────────┴────────────┐
//           │                         │
//       NestJS app                TypeORM CLI
//           │                         │
//           ▼                         ▼
// typeorm-config.ts             data-source.ts
//           │                         │
//           ▼                         ▼
//    TypeOrmModule              DataSource
