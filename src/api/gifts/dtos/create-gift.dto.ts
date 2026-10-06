import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsEnum,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from "class-validator";

import { PaymentCurrency } from "@domain/enums/payment-currency.enum";

export class CreateGiftDto {
  @ApiPropertyOptional({
    format: "uuid",
    description:
      "Wish to contribute to. Omit this field for a general cash contribution.",
    nullable: true,
  })
  @IsOptional()
  @IsUUID()
  wishId?: string | null;

  @ApiProperty({
    example: "100.00",
    description: "Positive amount to transfer from the giver's balance.",
  })
  @IsNumberString()
  amount!: string;

  @ApiProperty({
    enum: PaymentCurrency,
    example: PaymentCurrency.USD,
  })
  @IsEnum(PaymentCurrency)
  currency!: PaymentCurrency;

  @ApiPropertyOptional({
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  anonymous?: boolean;

  @ApiPropertyOptional({
    example: "Happy birthday!",
    maxLength: 1000,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  message?: string | null;
}
