import { Module } from "@nestjs/common";

import { ApplicationModule } from "@application/application.module";
import { WishesController } from "./wishes.controller";

@Module({
  imports: [ApplicationModule],
  controllers: [WishesController],
})
export class WishesModule {}
