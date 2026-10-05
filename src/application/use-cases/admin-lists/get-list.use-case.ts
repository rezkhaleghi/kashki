import { Injectable } from "@nestjs/common";

import { List } from "@domain/entities/list.entity";
import { ListNotFoundException } from "@domain/exceptions/domain.exception";
import { ListRepository } from "@domain/repositories/list.repository";

@Injectable()
export class AdminGetListUseCase {
  constructor(private readonly listRepository: ListRepository) {}

  async execute(id: string): Promise<List> {
    const list = await this.listRepository.findById(id);

    if (!list) {
      throw new ListNotFoundException();
    }

    return list;
  }
}
