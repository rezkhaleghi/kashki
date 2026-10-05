import { Injectable } from "@nestjs/common";

import { List } from "@domain/entities/list.entity";
import { ListRepository } from "@domain/repositories/list.repository";
import { PageQuery, PageResult } from "@shared/pagination/page-query";

export interface ListListsInput extends PageQuery<"createdAt" | "name"> {
  userId: string;
}

@Injectable()
export class ListListsUseCase {
  constructor(private readonly listRepository: ListRepository) {}

  async execute(input: ListListsInput): Promise<PageResult<List>> {
    return this.listRepository.findPageByUserId(input.userId, {
      page: input.page,
      limit: input.limit,
      sortBy: input.sortBy,
      sortDirection: input.sortDirection,
    });
  }
}
