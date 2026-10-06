import { Gift } from "@domain/entities/gift.entity";
import { List } from "@domain/entities/list.entity";
import { UserBalance } from "@domain/entities/user-balance.entity";
import { Wish } from "@domain/entities/wish.entity";

import { ListVisibility } from "@domain/enums/list-visibility.enum";
import { LedgerType } from "@domain/enums/ledger-type.enum";
import { PaymentCurrency } from "@domain/enums/payment-currency.enum";
import { WishStatus } from "@domain/enums/wish-status.enum";

import {
  GiftCurrencyMismatchException,
  GiftTargetAmountExceededException,
  ListAccessNotAllowedException,
  ListNotFoundException,
  UserBalanceNotFoundException,
  WishCompletedException,
  WishCurrencyRequiredException,
  WishNotFoundException,
} from "@domain/exceptions/domain.exception";

import { UnitOfWork } from "@application/interfaces/unit-of-work.interface";
import { CreateGiftUseCase } from "./create-gift.use-case";

describe("CreateGiftUseCase", () => {
  const userId = "gifter-id";
  const listId = "list-id";
  const wishId = "wish-id";

  let useCase: CreateGiftUseCase;
  let unitOfWork: jest.Mocked<UnitOfWork>;
  let repositories: any;
  let list: List;
  let wish: Wish;
  let balance: UserBalance;

  beforeEach(() => {
    /**
     * These are domain entities with mutable state. They must be recreated
     * for every test so one test cannot leak state into another test.
     *
     * In particular, the completion test changes the Wish status from
     * ACTIVE to COMPLETED.
     */
    list = List.create({
      id: listId,
      userId: "owner-id",
      name: "Birthday",
      visibility: ListVisibility.PUBLIC,
    });

    wish = Wish.create({
      id: wishId,
      listId,
      title: "MacBook",
      targetAmount: "500",
      currency: PaymentCurrency.USD,
    });

    balance = UserBalance.create({
      id: "balance-id",
      userId,
      currency: PaymentCurrency.USD,
      amount: "1000",
    });

    repositories = {
      listRepository: {
        findById: jest.fn(),
      },
      wishRepository: {
        findByIdForUpdate: jest.fn(),
        save: jest.fn(),
      },
      giftRepository: {
        create: jest.fn(),
        sumAmountByWishIdAndCurrency: jest.fn(),
      },
      userBalanceRepository: {
        findByUserIdAndCurrencyForUpdate: jest.fn(),
        save: jest.fn(),
      },
      ledgerRepository: {
        create: jest.fn(),
      },
    };

    unitOfWork = {
      execute: jest.fn(async (work) => work(repositories)),
    } as unknown as jest.Mocked<UnitOfWork>;

    useCase = new CreateGiftUseCase(unitOfWork);

    repositories.listRepository.findById.mockResolvedValue(list);
    repositories.wishRepository.findByIdForUpdate.mockResolvedValue(wish);
    repositories.userBalanceRepository.findByUserIdAndCurrencyForUpdate.mockResolvedValue(
      balance,
    );
    repositories.userBalanceRepository.save.mockImplementation(
      async (value: UserBalance) => value,
    );
    repositories.giftRepository.sumAmountByWishIdAndCurrency.mockResolvedValue(
      "100",
    );
    repositories.giftRepository.create.mockImplementation(
      async (value: Gift) => value,
    );
    repositories.ledgerRepository.create.mockImplementation(
      async (value: unknown) => value,
    );
    repositories.wishRepository.save.mockImplementation(
      async (value: Wish) => value,
    );
  });

  it("creates a gift, debits the balance and records a transfer-out ledger entry", async () => {
    const result = await useCase.execute({
      userId,
      wishId,
      amount: "100",
      currency: PaymentCurrency.USD,
    });

    expect(result).toBeInstanceOf(Gift);
    expect(result.amount).toBe("100");

    expect(
      repositories.userBalanceRepository.findByUserIdAndCurrencyForUpdate,
    ).toHaveBeenCalledWith(userId, PaymentCurrency.USD);

    expect(repositories.userBalanceRepository.save).toHaveBeenCalled();

    expect(repositories.giftRepository.create).toHaveBeenCalled();

    expect(repositories.ledgerRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: LedgerType.TRANSFER_OUT,
      }),
    );
  });

  it("creates a general cash gift without a wish", async () => {
    repositories.userBalanceRepository.findByUserIdAndCurrencyForUpdate.mockResolvedValue(
      balance,
    );

    const result = await useCase.execute({
      userId,
      amount: "100",
      currency: PaymentCurrency.USD,
    });

    expect(result.wishId).toBeNull();
    expect(
      repositories.wishRepository.findByIdForUpdate,
    ).not.toHaveBeenCalled();
  });

  it("rejects a missing wish", async () => {
    repositories.wishRepository.findByIdForUpdate.mockResolvedValue(null);

    await expect(
      useCase.execute({
        userId,
        wishId,
        amount: "100",
        currency: PaymentCurrency.USD,
      }),
    ).rejects.toThrow(WishNotFoundException);
  });

  it("rejects a private wish for a non-owner", async () => {
    const privateList = List.create({
      id: listId,
      userId: "owner-id",
      name: "Private",
      visibility: ListVisibility.PRIVATE,
    });

    repositories.listRepository.findById.mockResolvedValue(privateList);

    await expect(
      useCase.execute({
        userId,
        wishId,
        amount: "100",
        currency: PaymentCurrency.USD,
      }),
    ).rejects.toThrow(ListAccessNotAllowedException);
  });

  it("rejects a missing list", async () => {
    repositories.listRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        userId,
        wishId,
        amount: "100",
        currency: PaymentCurrency.USD,
      }),
    ).rejects.toThrow(ListNotFoundException);
  });

  it("rejects a completed wish", async () => {
    const completedWish = Wish.create({
      id: wishId,
      listId,
      title: "MacBook",
      targetAmount: "500",
      currency: PaymentCurrency.USD,
      status: WishStatus.COMPLETED,
    });

    repositories.wishRepository.findByIdForUpdate.mockResolvedValue(
      completedWish,
    );

    await expect(
      useCase.execute({
        userId,
        wishId,
        amount: "100",
        currency: PaymentCurrency.USD,
      }),
    ).rejects.toThrow(WishCompletedException);
  });

  it("rejects a targeted wish without currency", async () => {
    const invalidWish = Wish.create({
      id: wishId,
      listId,
      title: "MacBook",
      targetAmount: "500",
      currency: null,
    });

    repositories.wishRepository.findByIdForUpdate.mockResolvedValue(
      invalidWish,
    );

    await expect(
      useCase.execute({
        userId,
        wishId,
        amount: "100",
        currency: PaymentCurrency.USD,
      }),
    ).rejects.toThrow(WishCurrencyRequiredException);
  });

  it("rejects a currency mismatch", async () => {
    await expect(
      useCase.execute({
        userId,
        wishId,
        amount: "100",
        currency: PaymentCurrency.EUR,
      }),
    ).rejects.toThrow(GiftCurrencyMismatchException);
  });

  it("rejects a gift that exceeds the remaining target", async () => {
    repositories.giftRepository.sumAmountByWishIdAndCurrency.mockResolvedValue(
      "450",
    );

    await expect(
      useCase.execute({
        userId,
        wishId,
        amount: "100",
        currency: PaymentCurrency.USD,
      }),
    ).rejects.toThrow(GiftTargetAmountExceededException);
  });

  it("marks the wish completed when the target is reached", async () => {
    repositories.giftRepository.sumAmountByWishIdAndCurrency
      .mockResolvedValueOnce("400")
      .mockResolvedValueOnce("500");

    await useCase.execute({
      userId,
      wishId,
      amount: "100",
      currency: PaymentCurrency.USD,
    });

    expect(wish.getStatus()).toBe(WishStatus.COMPLETED);
    expect(repositories.wishRepository.save).toHaveBeenCalledWith(wish);
  });

  it("does not mark a targetless wish completed", async () => {
    const targetlessWish = Wish.create({
      id: wishId,
      listId,
      title: "Surprise",
      targetAmount: null,
      currency: null,
    });

    repositories.wishRepository.findByIdForUpdate.mockResolvedValue(
      targetlessWish,
    );

    await useCase.execute({
      userId,
      wishId,
      amount: "100",
      currency: PaymentCurrency.USD,
    });

    expect(targetlessWish.getStatus()).toBe(WishStatus.ACTIVE);
    expect(repositories.wishRepository.save).not.toHaveBeenCalled();
  });

  it("does not debit or create a gift when the balance does not exist", async () => {
    repositories.userBalanceRepository.findByUserIdAndCurrencyForUpdate.mockResolvedValue(
      null,
    );

    await expect(
      useCase.execute({
        userId,
        wishId,
        amount: "100",
        currency: PaymentCurrency.USD,
      }),
    ).rejects.toThrow(UserBalanceNotFoundException);

    expect(repositories.giftRepository.create).not.toHaveBeenCalled();
    expect(repositories.ledgerRepository.create).not.toHaveBeenCalled();
  });
});
