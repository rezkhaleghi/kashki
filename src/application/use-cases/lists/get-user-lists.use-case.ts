import { Injectable } from "@nestjs/common";

import { ListRepository } from "@domain/repositories/list.repository";
import { PageQuery, PageResult } from "@shared/pagination/page-query";
import { List } from "@domain/entities/list.entity";

@Injectable()
export class GetUserListsUseCase {
  constructor(private readonly listRepository: ListRepository) {}

  async execute(
    userId: string,
    params: PageQuery<"createdAt" | "name">,
  ): Promise<PageResult<List>> {
    return this.listRepository.findPageByUserId(userId, params);
  }
}
