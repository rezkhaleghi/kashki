import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";

import { FileInterceptor } from "@nestjs/platform-express";

import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

import type { Request, Response } from "express";

import { FileStorage } from "@application/interfaces/file-storage.interface";
import { UpdateUserAvatarUseCase } from "@application/use-cases/users/update-user-avatar.use-case";
import { DeleteUserAvatarUseCase } from "@application/use-cases/users/delete-user-avatar.use-case";

import { AuthSessionGuard } from "../auth/auth-session.guard";

@ApiTags("files")
@Controller("files")
export class FilesController {
  constructor(
    private readonly fileStorage: FileStorage,
    private readonly updateUserAvatarUseCase: UpdateUserAvatarUseCase,
    private readonly deleteUserAvatarUseCase: DeleteUserAvatarUseCase,
  ) {}

  @Post("me/avatar")
  @UseGuards(AuthSessionGuard)
  @UseInterceptors(FileInterceptor("file"))
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Update the currently authenticated user's avatar",
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
        },
      },
      required: ["file"],
    },
  })
  @ApiResponse({
    status: 204,
    description: "Avatar updated successfully",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid or unsupported image",
  })
  @ApiResponse({
    status: 401,
    description: "Not authenticated",
  })
  async updateAvatar(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: 5 * 1024 * 1024,
          }),
          new FileTypeValidator({
            fileType: /^image\/(jpeg|png|webp|gif)$/,
          }),
        ],
      }),
    )
    file: {
      buffer: Buffer;
      mimetype: string;
    },
    @Req() req: Request,
  ): Promise<void> {
    await this.updateUserAvatarUseCase.execute(req.session.userId!, {
      buffer: file.buffer,
      mimetype: file.mimetype,
    });
  }

  @Delete("me/avatar")
  @UseGuards(AuthSessionGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Delete the currently authenticated user's avatar",
  })
  @ApiResponse({
    status: 204,
    description: "Avatar deleted successfully",
  })
  @ApiResponse({
    status: 401,
    description: "Not authenticated",
  })
  async deleteAvatar(@Req() req: Request): Promise<void> {
    await this.deleteUserAvatarUseCase.execute(req.session.userId!);
  }

  @Get("*")
  @ApiOperation({
    summary: "Get a public avatar",
    description: "Streams a publicly accessible avatar from file storage.",
  })
  @ApiParam({
    name: "path",
    description: "Avatar storage object path",
    example: "avatars/da953d8a-9ee6-4c29-bf20-027bc65fad41/avatar.webp",
  })
  @ApiProduces(
    "image/webp",
    "image/jpeg",
    "image/png",
    "image/gif",
    "application/octet-stream",
  )
  @ApiResponse({
    status: 200,
    description: "The requested avatar.",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid file path.",
  })
  @ApiResponse({
    status: 404,
    description: "File not found.",
  })
  async getFile(
    @Param() params: Record<string, string | string[]>,
    @Res({ passthrough: true }) response: Response,
  ): Promise<StreamableFile> {
    const objectName = String(params["0"]);

    if (!objectName.startsWith("avatars/")) {
      throw new BadRequestException("Only public avatar files are accessible.");
    }

    const file = await this.fileStorage.get(objectName);

    response.setHeader("Content-Type", file.contentType);
    response.setHeader("Content-Length", file.size);
    response.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

    return new StreamableFile(file.stream);
  }
}
