import { Module } from "@nestjs/common";

import { ApplicationModule } from "@application/application.module";

import { NotificationsController } from "./notifications.controller";

@Module({
  imports: [ApplicationModule],
  controllers: [NotificationsController],
})
export class NotificationsModule {}
