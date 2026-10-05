import { Injectable } from "@nestjs/common";

import { List } from "@domain/entities/list.entity";
import {
  ListAccessNotAllowedException,
  ListNotFoundException,
} from "@domain/exceptions/domain.exception";
import { ListVisibility } from "@domain/enums/list-visibility.enum";
import { ListRepository } from "@domain/repositories/list.repository";

export interface GetListInput {
  listId: string;
  requesterUserId?: string;
}

@Injectable()
export class GetListUseCase {
  constructor(private readonly listRepository: ListRepository) {}

  async execute(input: GetListInput): Promise<List> {
    const list = await this.listRepository.findById(input.listId);

    if (!list) {
      throw new ListNotFoundException();
    }

    const isOwner = list.userId === input.requesterUserId;

    if (isOwner) {
      return list;
    }

    if (list.visibility === ListVisibility.PRIVATE) {
      throw new ListAccessNotAllowedException();
    }

    return list;
  }
}
