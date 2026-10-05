import { Injectable } from "@nestjs/common";

import { List } from "@domain/entities/list.entity";
import { ListRepository } from "@domain/repositories/list.repository";
import { PageQuery, PageResult } from "@shared/pagination/page-query";

export interface AdminListListsInput extends PageQuery<"createdAt" | "name"> {}

@Injectable()
export class AdminListListsUseCase {
  constructor(private readonly listRepository: ListRepository) {}

  async execute(input: AdminListListsInput): Promise<PageResult<List>> {
    return this.listRepository.findPage({
      page: input.page,
      limit: input.limit,
      sortBy: input.sortBy,
      sortDirection: input.sortDirection,
    });
  }
}
