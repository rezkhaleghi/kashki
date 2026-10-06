import { Injectable } from "@nestjs/common";

import { Wish } from "@domain/entities/wish.entity";
import { WishNotFoundException } from "@domain/exceptions/domain.exception";
import { WishRepository } from "@domain/repositories/wish.repository";

@Injectable()
export class AdminGetWishUseCase {
  constructor(private readonly wishRepository: WishRepository) {}

  async execute(id: string): Promise<Wish> {
    const wish = await this.wishRepository.findById(id);

    if (!wish) {
      throw new WishNotFoundException();
    }

    return wish;
  }
}
