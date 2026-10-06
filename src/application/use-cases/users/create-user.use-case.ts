import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { PasswordHasher } from "@application/interfaces/password-hasher.interface";
import { CreateUserInput } from "@application/dtos/create-user.input";
import { UnitOfWork } from "@application/interfaces/unit-of-work.interface";

import { User } from "@domain/entities/user.entity";
import { UserBalance } from "@domain/entities/user-balance.entity";
import { List } from "@domain/entities/list.entity";
import { PaymentCurrency } from "@domain/enums/payment-currency.enum";
import {
  UserAlreadyExistsException,
  UsernameAlreadyExistsException,
} from "@domain/exceptions/domain.exception";
import { normalizeEmail } from "@domain/utils/normalize-email";

import { EnvironmentConfig } from "@infrastructure/config/environment.config";

const DEFAULT_BIRTHDAY_LIST_NAME = "Birthday";

@Injectable()
export class CreateUserUseCase {
  constructor(
    private readonly passwordHasher: PasswordHasher,
    private readonly unitOfWork: UnitOfWork,
    private readonly configService: ConfigService<EnvironmentConfig>,
  ) {}

  async execute(input: CreateUserInput): Promise<User> {
    const email = normalizeEmail(input.email);

    /**
     * Usernames are public identifiers, so we normalize them once at the
     * application boundary. This keeps signup, profile URLs, and username
     * lookup consistent regardless of casing entered by the client.
     */
    const userName = input.userName.trim().toLowerCase();

    return this.unitOfWork.execute(
      async ({ userRepository, userBalanceRepository, listRepository }) => {
        const existingEmail = await userRepository.findByEmail(email);

        if (existingEmail) {
          throw new UserAlreadyExistsException(email);
        }

        const existingUsername = await userRepository.findByUserName(userName);

        if (existingUsername) {
          throw new UsernameAlreadyExistsException(userName);
        }

        /**
         * Password hashing is intentionally performed only after the
         * uniqueness checks. Hashing is deliberately expensive, so there is
         * no reason to perform it when signup will be rejected anyway.
         */
        const hashedPassword = await this.passwordHasher.hash(input.password);

        const user = User.create({
          email,
          hashedPassword,
        });

        user.update({
          userName,
        });

        user.verifyEmail();

        const defaultCurrency = this.configService.get<PaymentCurrency>(
          "DEFAULT_CURRENCY",
          PaymentCurrency.USD,
        );

        const balance = UserBalance.create({
          userId: user.id,
          currency: defaultCurrency,
          amount: "0",
        });

        const birthdayList = List.create({
          userId: user.id,
          name: DEFAULT_BIRTHDAY_LIST_NAME,
        });

        /**
         * User, balance, and default list intentionally live in the same
         * UnitOfWork transaction. A newly-created user must never exist
         * without the Birthday List guaranteed by the product.
         *
         * The username uniqueness constraint in PostgreSQL remains the final
         * authority against concurrent signup races.
         */
        await userRepository.save(user);
        await userBalanceRepository.create(balance);
        await listRepository.create(birthdayList);

        return user;
      },
    );
  }
}
