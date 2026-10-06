import {
  Body,
  Controller,
  Get,
  Patch,
  Query,
  Req,
  UseGuards,
  Param,
} from "@nestjs/common";

import { ApiOperation, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";

import type { Request } from "express";

import { User } from "@domain/entities/user.entity";

import { AuthSessionGuard } from "../auth/auth-session.guard";

import { GetCurrentUserUseCase } from "@application/use-cases/users/get-current-user.use-case";
import { UpdateCurrentUserUseCase } from "@application/use-cases/users/update-current-user.use-case";
import { SearchUsersUseCase } from "@application/use-cases/users/search-users.use-case";
import { GetUserBalancesUseCase } from "@application/use-cases/users/get-user-balances.use-case";
import { GetPublicUserProfileUseCase } from "@application/use-cases/users/get-public-user-profile.use-case";

import { UpdateProfileDto } from "./dtos/update-profile.dto";
import { AuthenticatedUserResponseDto } from "../auth/dtos/authenticated-user.response.dto";
import { ListUserBalancesQueryDto } from "./dtos/list-user-balances.query.dto";
import { SearchUsersQueryDto } from "./dtos/search-users.query.dto";
import { PublicUserProfileResponseDto } from "./dtos/public-user-profile.response.dto";

@ApiTags("users")
@Controller("users")
export class UsersController {
  constructor(
    private readonly getCurrentUserUseCase: GetCurrentUserUseCase,
    private readonly getCurrentUserBalancesUseCase: GetUserBalancesUseCase,
    private readonly updateCurrentUserUseCase: UpdateCurrentUserUseCase,
    private readonly searchUsersUseCase: SearchUsersUseCase,
    private readonly getPublicUserProfileUseCase: GetPublicUserProfileUseCase,
  ) {}

  @Get("me")
  @UseGuards(AuthSessionGuard)
  @ApiOperation({
    summary: "Get the currently authenticated user's profile",
  })
  @ApiResponse({
    status: 200,
    description: "Current user profile",
    type: AuthenticatedUserResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Not authenticated",
  })
  async getMe(@Req() req: Request) {
    const user = await this.getCurrentUserUseCase.execute(req.session.userId!);

    return this.toUserResponse(user);
  }

  @Get("me/balances")
  @UseGuards(AuthSessionGuard)
  @ApiOperation({
    summary: "Get the currently authenticated user's balances",
    description:
      "Returns a paginated list of balances belonging to the currently authenticated user.",
  })
  @ApiResponse({
    status: 200,
    description: "Current user's balances",
  })
  @ApiResponse({
    status: 401,
    description: "Not authenticated",
  })
  async getMyBalances(
    @Query() query: ListUserBalancesQueryDto,
    @Req() req: Request,
  ) {
    return this.getCurrentUserBalancesUseCase.execute(req.session.userId!, {
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      sortDirection: query.sortDirection,
    });
  }

  @Patch("me")
  @UseGuards(AuthSessionGuard)
  @ApiOperation({
    summary: "Update the currently authenticated user's profile",
  })
  @ApiResponse({
    status: 200,
    description: "Profile updated",
    type: AuthenticatedUserResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: "Username already exists",
  })
  async updateMe(@Body() dto: UpdateProfileDto, @Req() req: Request) {
    const user = await this.updateCurrentUserUseCase.execute(
      req.session.userId!,
      {
        firstName: dto.firstName,
        lastName: dto.lastName,
        userName: dto.userName,
        dateOfBirth:
          dto.dateOfBirth === undefined || dto.dateOfBirth === null
            ? dto.dateOfBirth
            : new Date(dto.dateOfBirth),
        bio: dto.bio,
        hideYear: dto.hideYear,
      },
    );

    return this.toUserResponse(user);
  }

  @Get("search")
  @ApiOperation({
    summary: "Search users",
    description:
      "Search users by exact email, username, first name, last name, or full name.",
  })
  @ApiResponse({
    status: 200,
    description: "Users matching the search query",
  })
  async search(@Query() query: SearchUsersQueryDto) {
    return this.searchUsersUseCase.execute(query.q, {
      page: query.page,
      limit: query.limit,
    });
  }

  @Get(":username")
  @ApiOperation({
    summary: "Get a user's public profile",
    description:
      "Returns public profile information, birthday presentation, public lists, and the wishes contained in those lists.",
  })
  @ApiParam({
    name: "username",
    description: "Public username",
    example: "pocketjack",
  })
  @ApiResponse({
    status: 200,
    description: "Public user profile",
    type: PublicUserProfileResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "User not found",
  })
  async getPublicProfile(@Param("username") username: string) {
    return this.getPublicUserProfileUseCase.execute(username);
  }

  private toUserResponse(user: User) {
    return {
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
      firstName: user.firstName,
      lastName: user.lastName,
      userName: user.userName,
      dateOfBirth: user.dateOfBirth,
      avatar: user.avatar,
      bio: user.bio,
      hideYear: user.hideYear,
    };
  }
}
