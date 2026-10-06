import { Module } from "@nestjs/common";

import { ApplicationModule } from "@application/application.module";

import { GiftsController } from "./gifts.controller";

@Module({
  imports: [ApplicationModule],
  controllers: [GiftsController],
})
export class GiftsModule {}
