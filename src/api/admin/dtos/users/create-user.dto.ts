import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  MinLength,
} from "class-validator";

import { UserRole } from "@domain/enums/user-role.enum";

export class CreateUserDto {
  @ApiProperty({
    example: "user@gmail.com",
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: "strongPassword123",
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiPropertyOptional({
    enum: UserRole,
    default: UserRole.USER,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role: UserRole = UserRole.USER;

  @ApiProperty({
    example: "john_doe",
    description: "Unique public username used in the user's profile URL.",
    minLength: 3,
    maxLength: 50,
  })
  @IsString()
  @Length(3, 50)
  userName!: string;
}
