import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";

import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";

import type { Request } from "express";

import { AuthSessionGuard } from "../auth/auth-session.guard";

import { ListNotificationsUseCase } from "@application/use-cases/notifications/list-notifications.use-case";
import { ReadNotificationUseCase } from "@application/use-cases/notifications/read-notification.use-case";

import { ListNotificationsQueryDto } from "./dtos/list-notifications.query.dto";
import { NotificationResponseDto } from "./dtos/notification.response.dto";

@ApiTags("notifications")
@Controller("notifications")
export class NotificationsController {
  constructor(
    private readonly listNotificationsUseCase: ListNotificationsUseCase,
    private readonly readNotificationUseCase: ReadNotificationUseCase,
  ) {}

  @Get()
  @UseGuards(AuthSessionGuard)
  @ApiOperation({
    summary: "List the current user's notifications",
  })
  @ApiResponse({
    status: 200,
    description: "Current user's notifications",
  })
  @ApiResponse({
    status: 401,
    description: "Not authenticated",
  })
  async list(@Query() query: ListNotificationsQueryDto, @Req() req: Request) {
    return this.listNotificationsUseCase.execute({
      userId: req.session.userId!,
      page: query.page,
      limit: query.limit,
      sortDirection: query.sortDirection,
      channel: query.channel,
      type: query.type,
    });
  }

  @Patch(":id/read")
  @UseGuards(AuthSessionGuard)
  @ApiOperation({
    summary: "Mark one of the current user's in-app notifications as read",
  })
  @ApiResponse({
    status: 200,
    description: "Notification marked as read",
    type: NotificationResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Not authenticated",
  })
  @ApiResponse({
    status: 404,
    description: "Notification not found",
  })
  @ApiResponse({
    status: 400,
    description: "Notification cannot be marked as read",
  })
  async markAsRead(@Param("id") id: string, @Req() req: Request) {
    return this.readNotificationUseCase.execute(req.session.userId!, id);
  }
}
