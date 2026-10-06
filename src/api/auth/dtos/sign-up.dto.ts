import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, Length, MinLength } from "class-validator";

/**
 * HTTP contract for user registration.
 *
 * The username is collected during signup because Kashki uses it as the
 * stable, human-readable identifier in public profile URLs.
 */
export class SignUpDto {
  @ApiProperty({
    example: "pocketj",
    description: "Unique public username used in the user's profile URL.",
  })
  @IsString()
  @Length(3, 50)
  userName!: string;

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

  @ApiProperty({
    example: "123456",
    minLength: 6,
    maxLength: 6,
  })
  @IsString()
  @Length(6, 6)
  otp!: string;
}
