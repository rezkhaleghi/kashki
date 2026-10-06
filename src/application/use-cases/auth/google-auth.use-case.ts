import { Injectable } from "@nestjs/common";

import { UnitOfWork } from "@application/interfaces/unit-of-work.interface";
import { GoogleAuthInput } from "@application/dtos/google-auth.input";

import { User } from "@domain/entities/user.entity";
import { List } from "@domain/entities/list.entity";
import { UserStatus } from "@domain/enums/user-status.enum";
import { InvalidCredentialsException } from "@domain/exceptions/domain.exception";
import { normalizeEmail } from "@domain/utils/normalize-email";

const DEFAULT_BIRTHDAY_LIST_NAME = "Birthday";

@Injectable()
export class GoogleAuthUseCase {
  constructor(private readonly unitOfWork: UnitOfWork) {}

  async execute(input: GoogleAuthInput): Promise<User> {
    const email = normalizeEmail(input.email);

    return this.unitOfWork.execute(
      async ({ userRepository, listRepository }) => {
        const linkedUser = await userRepository.findByGoogleId(input.googleId);

        if (linkedUser) {
          if (linkedUser.status !== UserStatus.ACTIVE) {
            throw new InvalidCredentialsException();
          }

          return linkedUser;
        }

        const existing = await userRepository.findByEmail(email);

        if (existing) {
          if (existing.status !== UserStatus.ACTIVE) {
            throw new InvalidCredentialsException();
          }

          existing.linkGoogleAccount(input.googleId);

          if (!existing.emailVerified) {
            existing.verifyEmail();
          }

          return userRepository.save(existing);
        }

        const user = User.create({
          email,
          hashedPassword: null,
          googleId: input.googleId,
        });

        user.verifyEmail();

        const birthdayList = List.create({
          userId: user.id,
          name: DEFAULT_BIRTHDAY_LIST_NAME,
        });

        /*
         * Google signup is another user-creation path. The new user and
         * their mandatory Birthday List must therefore use the same
         * transaction as normal signup.
         */
        const saved = await userRepository.save(user);
        await listRepository.create(birthdayList);

        return saved;
      },
    );
  }
}
