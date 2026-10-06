import { Injectable } from "@nestjs/common";

import { Wish } from "@domain/entities/wish.entity";
import { ListNotFoundException } from "@domain/exceptions/domain.exception";
import { ListRepository } from "@domain/repositories/list.repository";
import { WishRepository } from "@domain/repositories/wish.repository";
import { PaymentCurrency } from "@domain/enums/payment-currency.enum";

export interface CreateWishInput {
  userId: string;
  listId: string;
  title: string;
  description?: string | null;
  targetAmount?: string | null;
  currency?: PaymentCurrency | null;
}

@Injectable()
export class CreateWishUseCase {
  constructor(
    private readonly wishRepository: WishRepository,
    private readonly listRepository: ListRepository,
  ) {}

  async execute(input: CreateWishInput): Promise<Wish> {
    const list = await this.listRepository.findByUserIdAndId(
      input.userId,
      input.listId,
    );

    if (!list) {
      throw new ListNotFoundException();
    }

    const wish = Wish.create({
      listId: list.id,
      title: input.title,
      description: input.description,
      targetAmount: input.targetAmount,
      currency: input.currency,
    });

    return this.wishRepository.create(wish);
  }
}
