import { Injectable } from "@nestjs/common";

import { User } from "@domain/entities/user.entity";

import {
  UserNotFoundException,
  UsernameAlreadyExistsException,
} from "@domain/exceptions/domain.exception";

import { UserRepository } from "@domain/repositories/user.repository";

@Injectable()
export class UpdateCurrentUserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(
    userId: string,
    input: {
      firstName?: string | null;
      lastName?: string | null;
      userName?: string | null;
      dateOfBirth?: Date | null;
      bio?: string | null;
      hideYear?: boolean;
    },
  ): Promise<User> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new UserNotFoundException();
    }

    if (input.userName !== undefined && input.userName !== null) {
      const existingUser = await this.userRepository.findByUserName(
        input.userName,
      );

      if (existingUser && existingUser.id !== userId) {
        throw new UsernameAlreadyExistsException(input.userName);
      }
    }

    user.update({
      firstName: input.firstName,
      lastName: input.lastName,
      userName: input.userName,
      dateOfBirth: input.dateOfBirth,
      bio: input.bio,
      hideYear: input.hideYear,
    });

    return this.userRepository.save(user);
  }
}
