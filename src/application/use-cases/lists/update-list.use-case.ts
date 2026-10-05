import { Injectable } from "@nestjs/common";

import { List } from "@domain/entities/list.entity";
import {
  ListAccessNotAllowedException,
  ListNotFoundException,
} from "@domain/exceptions/domain.exception";
import { ListRepository } from "@domain/repositories/list.repository";
import { ListVisibility } from "@domain/enums/list-visibility.enum";

export interface UpdateListInput {
  listId: string;
  userId: string;
  name?: string;
  description?: string | null;
  visibility?: ListVisibility;
}

@Injectable()
export class UpdateListUseCase {
  constructor(private readonly listRepository: ListRepository) {}

  async execute(input: UpdateListInput): Promise<List> {
    const list = await this.listRepository.findByUserIdAndId(
      input.userId,
      input.listId,
    );

    if (!list) {
      throw new ListNotFoundException();
    }

    list.update({
      name: input.name,
      description: input.description,
      visibility: input.visibility,
    });

    return this.listRepository.save(list);
  }
}
