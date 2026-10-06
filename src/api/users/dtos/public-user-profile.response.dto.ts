import { ApiProperty } from "@nestjs/swagger";

import { ListVisibility } from "@domain/enums/list-visibility.enum";
import { PaymentCurrency } from "@domain/enums/payment-currency.enum";
import { WishStatus } from "@domain/enums/wish-status.enum";

export class PublicUserWishResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty({ nullable: true })
  targetAmount!: string | null;

  @ApiProperty({
    enum: PaymentCurrency,
    nullable: true,
  })
  currency!: PaymentCurrency | null;

  @ApiProperty({
    enum: WishStatus,
  })
  status!: WishStatus;

  @ApiProperty({
    nullable: true,
    description:
      "Amount received so far. Null when the wish has no target/currency.",
  })
  receivedAmount!: string | null;
}

export class PublicUserListResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty({
    enum: ListVisibility,
  })
  visibility!: ListVisibility;

  @ApiProperty({
    type: () => PublicUserWishResponseDto,
    isArray: true,
  })
  wishes!: PublicUserWishResponseDto[];
}

export class PublicUserProfileResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ nullable: true })
  firstName!: string | null;

  @ApiProperty({ nullable: true })
  lastName!: string | null;

  @ApiProperty({ nullable: true })
  userName!: string | null;

  @ApiProperty({ nullable: true })
  avatar!: string | null;

  @ApiProperty({ nullable: true })
  bio!: string | null;

  @ApiProperty({
    nullable: true,
    description:
      "Public birthday. YYYY-MM-DD when hideYear is false, MM-DD when hideYear is true.",
    example: "07-25",
  })
  birthday!: string | null;

  @ApiProperty({
    type: () => PublicUserListResponseDto,
    isArray: true,
  })
  lists!: PublicUserListResponseDto[];
}
