import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEnum,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

import { PaymentCurrency } from "@domain/enums/payment-currency.enum";

export class UpdateWishDto {
  @ApiPropertyOptional({
    example: "MacBook Pro M5",
    minLength: 1,
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({
    example: "The 14-inch model would be perfect.",
    maxLength: 1000,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @ApiPropertyOptional({
    example: "1500",
    nullable: true,
  })
  @IsOptional()
  @IsNumberString()
  targetAmount?: string | null;

  @ApiPropertyOptional({
    enum: PaymentCurrency,
    nullable: true,
  })
  @IsOptional()
  @IsEnum(PaymentCurrency)
  currency?: PaymentCurrency | null;
}
