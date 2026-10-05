import { Injectable } from "@nestjs/common";

import {
  ListAccessNotAllowedException,
  ListNotFoundException,
} from "@domain/exceptions/domain.exception";
import { ListRepository } from "@domain/repositories/list.repository";

export interface DeleteListInput {
  listId: string;
  userId: string;
}

@Injectable()
export class DeleteListUseCase {
  constructor(private readonly listRepository: ListRepository) {}

  async execute(input: DeleteListInput): Promise<void> {
    const list = await this.listRepository.findByUserIdAndId(
      input.userId,
      input.listId,
    );

    if (!list) {
      throw new ListNotFoundException();
    }

    await this.listRepository.deleteById(input.listId);
  }
}
