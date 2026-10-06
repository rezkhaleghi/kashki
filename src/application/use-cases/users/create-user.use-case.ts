import { Injectable } from "@nestjs/common";

import { PasswordHasher } from "@application/interfaces/password-hasher.interface";
import { CreateUserInput } from "@application/dtos/create-user.input";
import { UnitOfWork } from "@application/interfaces/unit-of-work.interface";

import { User } from "@domain/entities/user.entity";
import { UserBalance } from "@domain/entities/user-balance.entity";
import { List } from "@domain/entities/list.entity";
import { PaymentCurrency } from "@domain/enums/payment-currency.enum";
import { UserAlreadyExistsException } from "@domain/exceptions/domain.exception";
import { normalizeEmail } from "@domain/utils/normalize-email";

import { ConfigService } from "@nestjs/config";
import { EnvironmentConfig } from "@infrastructure/config/environment.config";

/**
 * The Birthday List is part of the user's initial aggregate setup.
 *
 * Keeping the name here avoids coupling the List domain entity to the
 * Kashki-specific concept of a default birthday list.
 */
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

    const hashedPassword = await this.passwordHasher.hash(input.password);

    return this.unitOfWork.execute(
      async ({ userRepository, userBalanceRepository, listRepository }) => {
        const existing = await userRepository.findByEmail(email);

        if (existing) {
          throw new UserAlreadyExistsException(email);
        }

        const user = User.create({
          email,
          hashedPassword,
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

        /*
         * User, balance, and default list intentionally live in the same
         * UnitOfWork transaction. A newly-created user must never exist
         * without the Birthday List that the product guarantees.
         */
        await userRepository.save(user);
        await userBalanceRepository.create(balance);
        await listRepository.create(birthdayList);

        return user;
      },
    );
  }
}
