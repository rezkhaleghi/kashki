import { PaymentCurrency } from "@domain/enums/payment-currency.enum";
import { List } from "@domain/entities/list.entity";
import { Wish } from "@domain/entities/wish.entity";
import {
  ListNotFoundException,
  WishCurrencyChangeNotAllowedException,
  WishNotFoundException,
  WishTargetAmountTooLowException,
} from "@domain/exceptions/domain.exception";
import { GiftRepository } from "@domain/repositories/gift.repository";
import { ListRepository } from "@domain/repositories/list.repository";
import { WishRepository } from "@domain/repositories/wish.repository";
import { UnitOfWork } from "@application/interfaces/unit-of-work.interface";

import {
  AdminUpdateWishInput,
  AdminUpdateWishUseCase,
} from "./update-wish.use-case";

describe("AdminUpdateWishUseCase", () => {
  const listId = "list-id";
  const wishId = "wish-id";

  const listFindByIdForUpdate = jest.fn<Promise<List | null>, [string]>();

  const wishFindByIdForUpdate = jest.fn<Promise<Wish | null>, [string]>();

  const sumAmountByWishIdAndCurrency = jest.fn<
    Promise<string>,
    [string, PaymentCurrency]
  >();

  const saveWish = jest.fn<Promise<Wish>, [Wish]>();

  const listRepository = {
    findByIdForUpdate: listFindByIdForUpdate,
  } as unknown as ListRepository;

  const wishRepository = {
    findByIdForUpdate: wishFindByIdForUpdate,
    save: saveWish,
  } as unknown as WishRepository;

  const giftRepository = {
    sumAmountByWishIdAndCurrency,
  } as unknown as GiftRepository;

  const unitOfWork = {
    execute: jest.fn(async (callback: any) =>
      callback({
        listRepository,
        wishRepository,
        giftRepository,
      }),
    ),
  } as unknown as UnitOfWork;

  let useCase: AdminUpdateWishUseCase;

  const createList = () =>
    List.create({
      id: listId,
      userId: "owner-id",
      name: "Birthday",
    });

  const createWish = () =>
    Wish.create({
      id: wishId,
      listId,
      title: "MacBook",
      description: "MacBook Pro",
      targetAmount: "1000",
      currency: PaymentCurrency.USD,
    });

  beforeEach(() => {
    jest.clearAllMocks();

    listFindByIdForUpdate.mockResolvedValue(createList());
    wishFindByIdForUpdate.mockResolvedValue(createWish());
    sumAmountByWishIdAndCurrency.mockResolvedValue("0");
    saveWish.mockImplementation(async (wish) => wish);

    useCase = new AdminUpdateWishUseCase(unitOfWork);
  });

  it("updates a wish", async () => {
    const input: AdminUpdateWishInput = {
      listId,
      wishId,
      title: "New MacBook",
      description: "Updated description",
      targetAmount: "1200",
      currency: PaymentCurrency.USD,
    };

    await useCase.execute(input);

    expect(saveWish).toHaveBeenCalledTimes(1);

    const savedWish = saveWish.mock.calls[0][0];

    expect(savedWish.title).toBe("New MacBook");
    expect(savedWish.description).toBe("Updated description");
    expect(savedWish.targetAmount).toBe("1200");
    expect(savedWish.currency).toBe(PaymentCurrency.USD);
  });

  it("throws when the list does not exist", async () => {
    listFindByIdForUpdate.mockResolvedValue(null);

    await expect(
      useCase.execute({
        listId,
        wishId,
        title: "Updated",
      }),
    ).rejects.toBeInstanceOf(ListNotFoundException);

    expect(wishFindByIdForUpdate).not.toHaveBeenCalled();
    expect(saveWish).not.toHaveBeenCalled();
  });

  it("throws when the wish does not exist", async () => {
    wishFindByIdForUpdate.mockResolvedValue(null);

    await expect(
      useCase.execute({
        listId,
        wishId,
        title: "Updated",
      }),
    ).rejects.toBeInstanceOf(WishNotFoundException);

    expect(saveWish).not.toHaveBeenCalled();
  });

  it("throws when the wish belongs to another list", async () => {
    const wish = Wish.create({
      id: wishId,
      listId: "another-list",
      title: "MacBook",
      targetAmount: "1000",
      currency: PaymentCurrency.USD,
    });

    wishFindByIdForUpdate.mockResolvedValue(wish);

    await expect(
      useCase.execute({
        listId,
        wishId,
        title: "Updated",
      }),
    ).rejects.toBeInstanceOf(WishNotFoundException);

    expect(saveWish).not.toHaveBeenCalled();
  });

  it("allows target amount to remain equal to the amount already received", async () => {
    sumAmountByWishIdAndCurrency.mockResolvedValue("1000");

    await useCase.execute({
      listId,
      wishId,
      targetAmount: "1000",
    });

    const savedWish = saveWish.mock.calls[0][0];

    expect(savedWish.targetAmount).toBe("1000");
  });

  it("rejects target amount below the amount already received", async () => {
    sumAmountByWishIdAndCurrency.mockResolvedValue("600");

    await expect(
      useCase.execute({
        listId,
        wishId,
        targetAmount: "500",
      }),
    ).rejects.toBeInstanceOf(WishTargetAmountTooLowException);

    expect(saveWish).not.toHaveBeenCalled();
  });

  it("allows increasing the target above the received amount", async () => {
    sumAmountByWishIdAndCurrency.mockResolvedValue("600");

    await useCase.execute({
      listId,
      wishId,
      targetAmount: "1000",
    });

    const savedWish = saveWish.mock.calls[0][0];

    expect(savedWish.targetAmount).toBe("1000");
  });

  it("rejects changing currency after gifts have been received", async () => {
    sumAmountByWishIdAndCurrency.mockResolvedValue("100");

    await expect(
      useCase.execute({
        listId,
        wishId,
        currency: PaymentCurrency.EUR,
      }),
    ).rejects.toBeInstanceOf(WishCurrencyChangeNotAllowedException);

    expect(saveWish).not.toHaveBeenCalled();
  });

  it("allows changing currency when no gifts have been received", async () => {
    sumAmountByWishIdAndCurrency.mockResolvedValue("0");

    await useCase.execute({
      listId,
      wishId,
      currency: PaymentCurrency.EUR,
    });

    const savedWish = saveWish.mock.calls[0][0];

    expect(savedWish.currency).toBe(PaymentCurrency.EUR);
  });
});
