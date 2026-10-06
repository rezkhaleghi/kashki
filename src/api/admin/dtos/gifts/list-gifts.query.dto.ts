import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsUUID } from "class-validator";

import { PaymentCurrency } from "@domain/enums/payment-currency.enum";
import { SortablePaginationQueryDto } from "@shared/pagination/pagination.query.dto";

export class ListGiftsQueryDto extends SortablePaginationQueryDto {
  @ApiPropertyOptional({
    format: "uuid",
    description: "Filter gifts by giver.",
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({
    format: "uuid",
    description: "Filter targeted gifts by wish.",
  })
  @IsOptional()
  @IsUUID()
  wishId?: string;

  @ApiPropertyOptional({
    enum: PaymentCurrency,
  })
  @IsOptional()
  @IsEnum(PaymentCurrency)
  currency?: PaymentCurrency;

  @ApiPropertyOptional({
    enum: ["createdAt", "amount"],
    default: "createdAt",
  })
  @IsOptional()
  @IsEnum(["createdAt", "amount"])
  sortBy: "createdAt" | "amount" = "createdAt";
}
