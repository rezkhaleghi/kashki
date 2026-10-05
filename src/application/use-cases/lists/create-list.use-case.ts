import { Injectable } from "@nestjs/common";

import { List } from "@domain/entities/list.entity";
import { ListVisibility } from "@domain/enums/list-visibility.enum";
import { UserNotFoundException } from "@domain/exceptions/domain.exception";
import { ListRepository } from "@domain/repositories/list.repository";
import { UserRepository } from "@domain/repositories/user.repository";

export interface CreateListInput {
  userId: string;
  name: string;
  description?: string | null;
  visibility?: ListVisibility;
}

@Injectable()
export class CreateListUseCase {
  constructor(
    private readonly listRepository: ListRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(input: CreateListInput): Promise<List> {
    const user = await this.userRepository.findById(input.userId);

    if (!user) {
      throw new UserNotFoundException();
    }

    const list = List.create({
      userId: input.userId,
      name: input.name,
      description: input.description,
      visibility: input.visibility,
    });

    return this.listRepository.create(list);
  }
}
