import { PaymentCurrency } from "@domain/enums/payment-currency.enum";
import { List } from "@domain/entities/list.entity";
import { Wish } from "@domain/entities/wish.entity";
import {
  ListNotFoundException,
  WishCompletedException,
  WishCurrencyChangeNotAllowedException,
  WishNotFoundException,
  WishTargetAmountTooLowException,
} from "@domain/exceptions/domain.exception";
import { GiftRepository } from "@domain/repositories/gift.repository";
import { ListRepository } from "@domain/repositories/list.repository";
import { WishRepository } from "@domain/repositories/wish.repository";
import { UnitOfWork } from "@application/interfaces/unit-of-work.interface";

import { UpdateWishInput, UpdateWishUseCase } from "./update-wish.use-case";

describe("UpdateWishUseCase", () => {
  const userId = "owner-id";
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

  let useCase: UpdateWishUseCase;

  const createList = () =>
    List.create({
      id: listId,
      userId,
      name: "Birthday",
    });

  const createWish = () =>
    Wish.create({
      id: wishId,
      listId,
      title: "MacBook",
      description: "Old description",
      targetAmount: "2000",
      currency: PaymentCurrency.USD,
    });

  beforeEach(() => {
    jest.clearAllMocks();

    listFindByIdForUpdate.mockResolvedValue(createList());
    wishFindByIdForUpdate.mockResolvedValue(createWish());
    sumAmountByWishIdAndCurrency.mockResolvedValue("0");
    saveWish.mockImplementation(async (wish) => wish);

    useCase = new UpdateWishUseCase(unitOfWork);
  });

  it("updates a wish owned by the requester", async () => {
    const input: UpdateWishInput = {
      userId,
      listId,
      wishId,
      title: "MacBook Pro",
      description: "16 inch MacBook Pro",
      targetAmount: "2500",
      currency: PaymentCurrency.USD,
    };

    await useCase.execute(input);

    expect(saveWish).toHaveBeenCalledTimes(1);

    const savedWish = saveWish.mock.calls[0][0];

    expect(savedWish.title).toBe("MacBook Pro");
    expect(savedWish.description).toBe("16 inch MacBook Pro");
    expect(savedWish.targetAmount).toBe("2500");
    expect(savedWish.currency).toBe(PaymentCurrency.USD);
  });

  it("returns ListNotFoundException when the list does not exist", async () => {
    listFindByIdForUpdate.mockResolvedValue(null);

    await expect(
      useCase.execute({
        userId,
        listId,
        wishId,
        title: "Updated",
      }),
    ).rejects.toBeInstanceOf(ListNotFoundException);

    expect(wishFindByIdForUpdate).not.toHaveBeenCalled();
    expect(saveWish).not.toHaveBeenCalled();
  });

  it("returns ListNotFoundException when the list belongs to another user", async () => {
    const anotherUserList = List.create({
      id: listId,
      userId: "another-user",
      name: "Birthday",
    });

    listFindByIdForUpdate.mockResolvedValue(anotherUserList);

    await expect(
      useCase.execute({
        userId,
        listId,
        wishId,
        title: "Updated",
      }),
    ).rejects.toBeInstanceOf(ListNotFoundException);

    expect(wishFindByIdForUpdate).not.toHaveBeenCalled();
    expect(saveWish).not.toHaveBeenCalled();
  });

  it("returns WishNotFoundException when the wish does not exist", async () => {
    wishFindByIdForUpdate.mockResolvedValue(null);

    await expect(
      useCase.execute({
        userId,
        listId,
        wishId,
        title: "Updated",
      }),
    ).rejects.toBeInstanceOf(WishNotFoundException);

    expect(saveWish).not.toHaveBeenCalled();
  });

  it("returns WishNotFoundException when the wish belongs to another list", async () => {
    const wish = Wish.create({
      id: wishId,
      listId: "another-list",
      title: "MacBook",
      targetAmount: "2000",
      currency: PaymentCurrency.USD,
    });

    wishFindByIdForUpdate.mockResolvedValue(wish);

    await expect(
      useCase.execute({
        userId,
        listId,
        wishId,
        title: "Updated",
      }),
    ).rejects.toBeInstanceOf(WishNotFoundException);

    expect(saveWish).not.toHaveBeenCalled();
  });

  it("allows changing the title without received gifts", async () => {
    await useCase.execute({
      userId,
      listId,
      wishId,
      title: "MacBook Air",
    });

    const savedWish = saveWish.mock.calls[0][0];

    expect(savedWish.title).toBe("MacBook Air");
  });

  it("allows clearing the description", async () => {
    await useCase.execute({
      userId,
      listId,
      wishId,
      description: null,
    });

    const savedWish = saveWish.mock.calls[0][0];

    expect(savedWish.description).toBeNull();
  });

  it("rejects lowering the target below the received amount", async () => {
    sumAmountByWishIdAndCurrency.mockResolvedValue("1500");

    await expect(
      useCase.execute({
        userId,
        listId,
        wishId,
        targetAmount: "1000",
      }),
    ).rejects.toBeInstanceOf(WishTargetAmountTooLowException);

    expect(saveWish).not.toHaveBeenCalled();
  });

  it("allows increasing the target above the received amount", async () => {
    sumAmountByWishIdAndCurrency.mockResolvedValue("1500");

    await useCase.execute({
      userId,
      listId,
      wishId,
      targetAmount: "2500",
    });

    const savedWish = saveWish.mock.calls[0][0];

    expect(savedWish.targetAmount).toBe("2500");
  });

  it("allows the target to equal the received amount", async () => {
    sumAmountByWishIdAndCurrency.mockResolvedValue("2000");

    await useCase.execute({
      userId,
      listId,
      wishId,
      targetAmount: "2000",
    });

    const savedWish = saveWish.mock.calls[0][0];

    expect(savedWish.targetAmount).toBe("2000");
  });

  it("rejects changing currency after gifts have been received", async () => {
    sumAmountByWishIdAndCurrency.mockResolvedValue("100");

    await expect(
      useCase.execute({
        userId,
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
      userId,
      listId,
      wishId,
      currency: PaymentCurrency.EUR,
    });

    const savedWish = saveWish.mock.calls[0][0];

    expect(savedWish.currency).toBe(PaymentCurrency.EUR);
  });

  it("rejects updating a completed wish", async () => {
    const wish = Wish.create({
      id: wishId,
      listId,
      title: "MacBook",
      targetAmount: "2000",
      currency: PaymentCurrency.USD,
    });

    wish.markCompleted();

    wishFindByIdForUpdate.mockResolvedValue(wish);
    sumAmountByWishIdAndCurrency.mockResolvedValue("2000");

    await expect(
      useCase.execute({
        userId,
        listId,
        wishId,
        title: "New MacBook",
      }),
    ).rejects.toBeInstanceOf(WishCompletedException);

    expect(saveWish).not.toHaveBeenCalled();
  });

  it("allows increasing the target of a completed wish", async () => {
    const wish = Wish.create({
      id: wishId,
      listId,
      title: "MacBook",
      targetAmount: "2000",
      currency: PaymentCurrency.USD,
    });

    wish.markCompleted();

    wishFindByIdForUpdate.mockResolvedValue(wish);
    sumAmountByWishIdAndCurrency.mockResolvedValue("2000");

    await useCase.execute({
      userId,
      listId,
      wishId,
      targetAmount: "2500",
    });

    const savedWish = saveWish.mock.calls[0][0];

    expect(savedWish.targetAmount).toBe("2500");
    expect(savedWish.getStatus()).toBe("ACTIVE");
  });
});
