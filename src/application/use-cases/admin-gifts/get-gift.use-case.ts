import { Injectable } from "@nestjs/common";

import { Gift } from "@domain/entities/gift.entity";
import { GiftNotFoundException } from "@domain/exceptions/domain.exception";
import { GiftRepository } from "@domain/repositories/gift.repository";

@Injectable()
export class AdminGetGiftUseCase {
  constructor(private readonly giftRepository: GiftRepository) {}

  async execute(id: string): Promise<Gift> {
    const gift = await this.giftRepository.findById(id);

    if (!gift) {
      throw new GiftNotFoundException();
    }

    return gift;
  }
}
