import { Module } from "@nestjs/common";

import { ApplicationModule } from "@application/application.module";
import { ListsController } from "./lists.controller";

@Module({
  imports: [ApplicationModule],
  controllers: [ListsController],
})
export class ListsModule {}
