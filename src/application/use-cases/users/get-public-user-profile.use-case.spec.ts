import { User } from "@domain/entities/user.entity";
import { List } from "@domain/entities/list.entity";
import { Wish } from "@domain/entities/wish.entity";
import { GiftRepository } from "@domain/repositories/gift.repository";
import { ListRepository } from "@domain/repositories/list.repository";
import { UserRepository } from "@domain/repositories/user.repository";
import { WishRepository } from "@domain/repositories/wish.repository";
import { ListVisibility } from "@domain/enums/list-visibility.enum";
import { PaymentCurrency } from "@domain/enums/payment-currency.enum";
import { WishStatus } from "@domain/enums/wish-status.enum";
import { UserStatus } from "@domain/enums/user-status.enum";
import { UserNotFoundException } from "@domain/exceptions/user-not-found.exception";
import { PageQuery, PageResult } from "@shared/pagination/page-query";
import { GetPublicUserProfileUseCase } from "./get-public-user-profile.use-case";

describe("GetPublicUserProfileUseCase", () => {
  let useCase: GetPublicUserProfileUseCase;

  let userRepository: jest.Mocked<UserRepository>;
  let listRepository: jest.Mocked<ListRepository>;
  let wishRepository: jest.Mocked<WishRepository>;
  let giftRepository: jest.Mocked<GiftRepository>;

  beforeEach(() => {
    userRepository = {
      findById: jest.fn<
        ReturnType<UserRepository["findById"]>,
        Parameters<UserRepository["findById"]>
      >(),
    } as jest.Mocked<UserRepository>;

    listRepository = {
      findPageByUserId: jest.fn<
        ReturnType<ListRepository["findPageByUserId"]>,
        Parameters<ListRepository["findPageByUserId"]>
      >(),
    } as jest.Mocked<ListRepository>;

    wishRepository = {
      findPageByListId: jest.fn<
        ReturnType<WishRepository["findPageByListId"]>,
        Parameters<WishRepository["findPageByListId"]>
      >(),
    } as jest.Mocked<WishRepository>;

    giftRepository = {
      sumAmountByWishIdAndCurrency: jest.fn<
        ReturnType<GiftRepository["sumAmountByWishIdAndCurrency"]>,
        Parameters<GiftRepository["sumAmountByWishIdAndCurrency"]>
      >(),
    } as jest.Mocked<GiftRepository>;

    useCase = new GetPublicUserProfileUseCase(
      userRepository,
      listRepository,
      wishRepository,
      giftRepository,
    );
  });

  describe("execute", () => {
    it("should return the user's public profile with public lists and wishes", async () => {
      const user = User.create({
        email: "bob@example.com",
        hashedPassword: "hashed-password",
        firstName: "Bob",
        lastName: "Smith",
        userName: "bob",
        dateOfBirth: new Date("2000-07-25T00:00:00.000Z"),
        avatar: "https://example.com/avatar.jpg",
        bio: "Hello",
      });

      const publicList = List.create({
        userId: user.id,
        name: "Birthday",
        description: "Birthday wishes",
        visibility: ListVisibility.PUBLIC,
      });

      const privateList = List.create({
        userId: user.id,
        name: "Private",
        description: "Private wishes",
        visibility: ListVisibility.PRIVATE,
      });

      const wish = Wish.create({
        listId: publicList.id,
        title: "MacBook Pro",
        description: "A new MacBook",
        targetAmount: "1500",
        currency: PaymentCurrency.USD,
      });

      userRepository.findById.mockResolvedValue(user);

      listRepository.findPageByUserId.mockResolvedValue({
        data: [publicList, privateList],
        page: 1,
        limit: 100,
        total: 2,
        totalPages: 1,
      });

      wishRepository.findPageByListId.mockResolvedValueOnce({
        data: [wish],
        page: 1,
        limit: 100,
        total: 1,
        totalPages: 1,
      });

      giftRepository.sumAmountByWishIdAndCurrency.mockResolvedValue("700");

      const result = await useCase.execute(user.id);

      expect(result).toEqual({
        id: user.id,
        firstName: "Bob",
        lastName: "Smith",
        userName: "bob",
        avatar: "https://example.com/avatar.jpg",
        bio: "Hello",
        birthday: "2000-07-25",
        lists: [
          {
            id: publicList.id,
            name: "Birthday",
            description: "Birthday wishes",
            visibility: ListVisibility.PUBLIC,
            wishes: [
              {
                id: wish.id,
                title: "MacBook Pro",
                description: "A new MacBook",
                targetAmount: "1500",
                currency: PaymentCurrency.USD,
                status: WishStatus.ACTIVE,
                receivedAmount: "700",
              },
            ],
          },
        ],
      });

      expect(wishRepository.findPageByListId).toHaveBeenCalledWith(
        publicList.id,
        expect.objectContaining({
          page: 1,
        }),
      );

      expect(giftRepository.sumAmountByWishIdAndCurrency).toHaveBeenCalledWith(
        wish.id,
        PaymentCurrency.USD,
      );
    });

    it("should hide the birth year when hideYear is true", async () => {
      const user = User.create({
        email: "bob@example.com",
        hashedPassword: "hashed-password",
        firstName: "Bob",
        lastName: "Smith",
        userName: "bob",
        dateOfBirth: new Date("2000-07-25T00:00:00.000Z"),
        hideYear: true,
      });

      userRepository.findById.mockResolvedValue(user);

      listRepository.findPageByUserId.mockResolvedValue({
        data: [],
        page: 1,
        limit: 100,
        total: 0,
        totalPages: 0,
      });

      const result = await useCase.execute(user.id);

      expect(result.birthday).toBe("07-25");
      expect(result).not.toHaveProperty("dateOfBirth");
    });

    it("should return null birthday when the user has no date of birth", async () => {
      const user = User.create({
        email: "bob@example.com",
        hashedPassword: "hashed-password",
        firstName: "Bob",
        lastName: "Smith",
        userName: "bob",
        dateOfBirth: null,
      });

      userRepository.findById.mockResolvedValue(user);

      listRepository.findPageByUserId.mockResolvedValue({
        data: [],
        page: 1,
        limit: 100,
        total: 0,
        totalPages: 0,
      });

      const result = await useCase.execute(user.id);

      expect(result.birthday).toBeNull();
    });

    it("should reject a restricted user as not found", async () => {
      const user = User.create({
        email: "bob@example.com",
        hashedPassword: "hashed-password",
        firstName: "Bob",
        lastName: "Smith",
        userName: "bob",
      });

      userRepository.findById.mockResolvedValue(user);

      Object.defineProperty(user, "status", {
        value: UserStatus.RESTRICTED,
      });

      await expect(useCase.execute(user.id)).rejects.toThrow(
        UserNotFoundException,
      );

      expect(listRepository.findPageByUserId).not.toHaveBeenCalled();
    });

    it("should throw when the user does not exist", async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(
        useCase.execute("00000000-0000-0000-0000-000000000000"),
      ).rejects.toThrow(UserNotFoundException);

      expect(listRepository.findPageByUserId).not.toHaveBeenCalled();
    });

    it("should return null receivedAmount for a wish without a target", async () => {
      const user = User.create({
        email: "bob@example.com",
        hashedPassword: "hashed-password",
        firstName: "Bob",
        lastName: "Smith",
        userName: "bob",
        dateOfBirth: new Date("2000-07-25T00:00:00.000Z"),
      });

      const publicList = List.create({
        userId: user.id,
        name: "Birthday",
        description: null,
        visibility: ListVisibility.PUBLIC,
      });

      const wish = Wish.create({
        listId: publicList.id,
        title: "Surprise me",
        description: "Anything is fine",
        targetAmount: null,
        currency: null,
      });

      userRepository.findById.mockResolvedValue(user);

      listRepository.findPageByUserId.mockResolvedValue({
        data: [publicList],
        page: 1,
        limit: 100,
        total: 1,
        totalPages: 1,
      });

      wishRepository.findPageByListId.mockResolvedValue({
        data: [wish],
        page: 1,
        limit: 100,
        total: 1,
        totalPages: 1,
      });

      const result = await useCase.execute(user.id);

      expect(result.lists).toHaveLength(1);
      expect(result.lists[0].wishes[0]).toEqual({
        id: wish.id,
        title: "Surprise me",
        description: "Anything is fine",
        targetAmount: null,
        currency: null,
        status: WishStatus.ACTIVE,
        receivedAmount: null,
      });

      expect(
        giftRepository.sumAmountByWishIdAndCurrency,
      ).not.toHaveBeenCalled();
    });
  });
});
