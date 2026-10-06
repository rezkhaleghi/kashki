import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEnum,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

import { PaymentCurrency } from "@domain/enums/payment-currency.enum";

export class CreateWishDto {
  @ApiProperty({
    example: "MacBook Pro",
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional({
    example: "MacBook Pro 16-inch",
    maxLength: 1000,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @ApiPropertyOptional({
    example: "1500.00",
    description: "Positive target amount. Omit for a targetless wish.",
    nullable: true,
  })
  @IsOptional()
  @IsNumberString()
  targetAmount?: string | null;

  @ApiPropertyOptional({
    enum: PaymentCurrency,
    example: PaymentCurrency.USD,
    nullable: true,
  })
  @IsOptional()
  @IsEnum(PaymentCurrency)
  currency?: PaymentCurrency | null;
}
