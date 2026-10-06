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
      "Wish to contribute to. When supplied, the Wish owner is the recipient.",
    nullable: true,
  })
  @IsOptional()
  @IsUUID()
  wishId?: string | null;

  @ApiPropertyOptional({
    format: "uuid",
    description:
      "Recipient user for a general cash gift. Required when wishId is omitted.",
    nullable: true,
  })
  @IsOptional()
  @IsUUID()
  recipientUserId?: string | null;

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
