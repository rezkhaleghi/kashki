import { List } from "@domain/entities/list.entity";
import { Wish } from "@domain/entities/wish.entity";
import {
  ListNotFoundException,
  WishCannotBeDeletedException,
  WishNotFoundException,
} from "@domain/exceptions/domain.exception";
import { GiftRepository } from "@domain/repositories/gift.repository";
import { ListRepository } from "@domain/repositories/list.repository";
import { WishRepository } from "@domain/repositories/wish.repository";
import { UnitOfWork } from "@application/interfaces/unit-of-work.interface";

import { DeleteWishUseCase } from "./delete-wish.use-case";

describe("DeleteWishUseCase", () => {
  const userId = "owner-id";
  const listId = "list-id";
  const wishId = "wish-id";

  const listFindByIdForUpdate = jest.fn<Promise<List | null>, [string]>();

  const wishFindByIdForUpdate = jest.fn<Promise<Wish | null>, [string]>();

  const existsByWishId = jest.fn<Promise<boolean>, [string]>();

  const deleteById = jest.fn<Promise<void>, [string]>();

  const listRepository = {
    findByIdForUpdate: listFindByIdForUpdate,
  } as unknown as ListRepository;

  const wishRepository = {
    findByIdForUpdate: wishFindByIdForUpdate,
    deleteById,
  } as unknown as WishRepository;

  const giftRepository = {
    existsByWishId,
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

  let useCase: DeleteWishUseCase;

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
    });

  beforeEach(() => {
    jest.clearAllMocks();

    listFindByIdForUpdate.mockResolvedValue(createList());
    wishFindByIdForUpdate.mockResolvedValue(createWish());
    existsByWishId.mockResolvedValue(false);
    deleteById.mockResolvedValue();

    useCase = new DeleteWishUseCase(unitOfWork);
  });

  it("deletes a wish that has no gifts", async () => {
    await useCase.execute({
      userId,
      listId,
      wishId,
    });

    expect(existsByWishId).toHaveBeenCalledWith(wishId);
    expect(deleteById).toHaveBeenCalledWith(wishId);
  });

  it("returns ListNotFoundException when the list does not exist", async () => {
    listFindByIdForUpdate.mockResolvedValue(null);

    await expect(
      useCase.execute({
        userId,
        listId,
        wishId,
      }),
    ).rejects.toBeInstanceOf(ListNotFoundException);

    expect(wishFindByIdForUpdate).not.toHaveBeenCalled();
    expect(deleteById).not.toHaveBeenCalled();
  });

  it("returns ListNotFoundException when the user does not own the list", async () => {
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
      }),
    ).rejects.toBeInstanceOf(ListNotFoundException);

    expect(wishFindByIdForUpdate).not.toHaveBeenCalled();
    expect(deleteById).not.toHaveBeenCalled();
  });

  it("returns WishNotFoundException when the wish does not exist", async () => {
    wishFindByIdForUpdate.mockResolvedValue(null);

    await expect(
      useCase.execute({
        userId,
        listId,
        wishId,
      }),
    ).rejects.toBeInstanceOf(WishNotFoundException);

    expect(deleteById).not.toHaveBeenCalled();
  });

  it("returns ListNotFoundException when the wish belongs to another list", async () => {
    const wish = Wish.create({
      id: wishId,
      listId: "another-list",
      title: "MacBook",
    });

    wishFindByIdForUpdate.mockResolvedValue(wish);

    await expect(
      useCase.execute({
        userId,
        listId,
        wishId,
      }),
    ).rejects.toBeInstanceOf(ListNotFoundException);

    expect(deleteById).not.toHaveBeenCalled();
  });

  it("rejects deletion when gifts already exist", async () => {
    existsByWishId.mockResolvedValue(true);

    await expect(
      useCase.execute({
        userId,
        listId,
        wishId,
      }),
    ).rejects.toBeInstanceOf(WishCannotBeDeletedException);

    expect(deleteById).not.toHaveBeenCalled();
  });

  it("checks gift history before deleting", async () => {
    await useCase.execute({
      userId,
      listId,
      wishId,
    });

    expect(existsByWishId).toHaveBeenCalledTimes(1);
    expect(existsByWishId).toHaveBeenCalledWith(wishId);
  });
});
