import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsNumberString,
  IsOptional,
  IsString,
  IsUrl,
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
    example: [
      "https://www.amazon.com/dp/example",
      "https://www.digikala.com/product/example",
    ],
    description: "Product/store links for the wish. Maximum 10 links.",
    maxItems: 10,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @IsUrl(
    {
      protocols: ["http", "https"],
      require_protocol: true,
    },
    { each: true },
  )
  links?: string[];

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
