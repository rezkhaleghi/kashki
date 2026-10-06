import { User } from "@domain/entities/user.entity";
import { List } from "@domain/entities/list.entity";
import { Wish } from "@domain/entities/wish.entity";

import { ListVisibility } from "@domain/enums/list-visibility.enum";
import { PaymentCurrency } from "@domain/enums/payment-currency.enum";
import { UserRole } from "@domain/enums/user-role.enum";
import { UserStatus } from "@domain/enums/user-status.enum";
import { WishStatus } from "@domain/enums/wish-status.enum";

import { UserNotFoundException } from "@domain/exceptions/domain.exception";

import { GiftRepository } from "@domain/repositories/gift.repository";
import { ListRepository } from "@domain/repositories/list.repository";
import { UserRepository } from "@domain/repositories/user.repository";
import { WishRepository } from "@domain/repositories/wish.repository";

import { GetPublicUserProfileUseCase } from "./get-public-user-profile.use-case";

describe("GetPublicUserProfileUseCase", () => {
  let useCase: GetPublicUserProfileUseCase;

  let userRepository: jest.Mocked<UserRepository>;
  let listRepository: jest.Mocked<ListRepository>;
  let wishRepository: jest.Mocked<WishRepository>;
  let giftRepository: jest.Mocked<GiftRepository>;

  beforeEach(() => {
    /**
     * These repositories are intentionally partial mocks.
     *
     * The repository contracts contain many methods that this use case does
     * not need. Mocking every method would add noise and make this spec
     * harder to maintain whenever an unrelated repository method changes.
     */
    userRepository = {
      findByUserName: jest.fn(),
    } as unknown as jest.Mocked<UserRepository>;

    listRepository = {
      findPageByUserId: jest.fn(),
    } as unknown as jest.Mocked<ListRepository>;

    wishRepository = {
      findPageByListId: jest.fn(),
    } as unknown as jest.Mocked<WishRepository>;

    giftRepository = {
      sumAmountByWishIdAndCurrency: jest.fn(),
    } as unknown as jest.Mocked<GiftRepository>;

    useCase = new GetPublicUserProfileUseCase(
      userRepository,
      listRepository,
      wishRepository,
      giftRepository,
    );
  });

  describe("execute", () => {
    it("should return the public profile with public lists and their wishes", async () => {
      const user = User.restore({
        id: "user-1",
        email: "bob@example.com",
        hashedPassword: "hashed-password",
        role: UserRole.USER,
        emailVerified: true,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        googleId: null,
        firstName: "Bob",
        lastName: "Smith",
        userName: "bob",
        dateOfBirth: new Date("2000-07-25T00:00:00.000Z"),
        avatar: "https://example.com/avatar.jpg",
        bio: "Hello",
        hideYear: false,
        status: UserStatus.ACTIVE,
      });

      const publicList = List.create({
        id: "list-public",
        userId: user.id,
        name: "Birthday",
        description: "Birthday wishes",
        visibility: ListVisibility.PUBLIC,
      });

      const privateList = List.create({
        id: "list-private",
        userId: user.id,
        name: "Private",
        description: "Private wishes",
        visibility: ListVisibility.PRIVATE,
      });

      const wish = Wish.create({
        id: "wish-1",
        listId: publicList.id,
        title: "MacBook Pro",
        description: "A new MacBook",
        targetAmount: "1500",
        currency: PaymentCurrency.USD,
      });

      userRepository.findByUserName.mockResolvedValue(user);

      listRepository.findPageByUserId.mockResolvedValue({
        data: [publicList, privateList],
        page: 1,
        limit: 100,
        total: 2,
        totalPages: 1,
      });

      wishRepository.findPageByListId.mockResolvedValue({
        data: [wish],
        page: 1,
        limit: 100,
        total: 1,
        totalPages: 1,
      });

      giftRepository.sumAmountByWishIdAndCurrency.mockResolvedValue("700");

      const result = await useCase.execute("Bob");

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

      expect(userRepository.findByUserName).toHaveBeenCalledWith("bob");

      expect(listRepository.findPageByUserId).toHaveBeenCalledWith(user.id, {
        page: 1,
        limit: 100,
        sortBy: "createdAt",
        sortDirection: "DESC",
      });

      expect(wishRepository.findPageByListId).toHaveBeenCalledWith(
        publicList.id,
        {
          page: 1,
          limit: 100,
          sortBy: "createdAt",
          sortDirection: "DESC",
        },
      );

      expect(giftRepository.sumAmountByWishIdAndCurrency).toHaveBeenCalledWith(
        wish.id,
        PaymentCurrency.USD,
      );
    });

    it("should only include public lists", async () => {
      const user = User.restore({
        id: "user-1",
        email: "bob@example.com",
        hashedPassword: "hashed-password",
        role: UserRole.USER,
        emailVerified: true,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        googleId: null,
        firstName: "Bob",
        lastName: "Smith",
        userName: "bob",
        dateOfBirth: null,
        avatar: null,
        bio: null,
        hideYear: false,
        status: UserStatus.ACTIVE,
      });

      const publicList = List.create({
        id: "list-public",
        userId: user.id,
        name: "Public",
        visibility: ListVisibility.PUBLIC,
      });

      const privateList = List.create({
        id: "list-private",
        userId: user.id,
        name: "Private",
        visibility: ListVisibility.PRIVATE,
      });

      const unlistedList = List.create({
        id: "list-unlisted",
        userId: user.id,
        name: "Unlisted",
        visibility: ListVisibility.UNLISTED,
      });

      userRepository.findByUserName.mockResolvedValue(user);

      listRepository.findPageByUserId.mockResolvedValue({
        data: [publicList, privateList, unlistedList],
        page: 1,
        limit: 100,
        total: 3,
        totalPages: 1,
      });

      wishRepository.findPageByListId.mockResolvedValue({
        data: [],
        page: 1,
        limit: 100,
        total: 0,
        totalPages: 0,
      });

      const result = await useCase.execute("bob");

      expect(result.lists).toHaveLength(1);
      expect(result.lists[0].id).toBe(publicList.id);

      expect(wishRepository.findPageByListId).toHaveBeenCalledTimes(1);
      expect(wishRepository.findPageByListId).toHaveBeenCalledWith(
        publicList.id,
        {
          page: 1,
          limit: 100,
          sortBy: "createdAt",
          sortDirection: "DESC",
        },
      );
    });

    it("should hide the birth year when hideYear is true", async () => {
      const user = User.restore({
        id: "user-1",
        email: "bob@example.com",
        hashedPassword: "hashed-password",
        role: UserRole.USER,
        emailVerified: true,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        googleId: null,
        firstName: "Bob",
        lastName: "Smith",
        userName: "bob",
        dateOfBirth: new Date("2000-07-25T00:00:00.000Z"),
        avatar: null,
        bio: null,
        hideYear: true,
        status: UserStatus.ACTIVE,
      });

      userRepository.findByUserName.mockResolvedValue(user);

      listRepository.findPageByUserId.mockResolvedValue({
        data: [],
        page: 1,
        limit: 100,
        total: 0,
        totalPages: 0,
      });

      const result = await useCase.execute("bob");

      expect(result.birthday).toBe("07-25");
      expect(result).not.toHaveProperty("dateOfBirth");
    });

    it("should return the full birthday when hideYear is false", async () => {
      const user = User.restore({
        id: "user-1",
        email: "bob@example.com",
        hashedPassword: "hashed-password",
        role: UserRole.USER,
        emailVerified: true,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        googleId: null,
        firstName: "Bob",
        lastName: "Smith",
        userName: "bob",
        dateOfBirth: new Date("2000-07-25T00:00:00.000Z"),
        avatar: null,
        bio: null,
        hideYear: false,
        status: UserStatus.ACTIVE,
      });

      userRepository.findByUserName.mockResolvedValue(user);

      listRepository.findPageByUserId.mockResolvedValue({
        data: [],
        page: 1,
        limit: 100,
        total: 0,
        totalPages: 0,
      });

      const result = await useCase.execute("bob");

      expect(result.birthday).toBe("2000-07-25");
    });

    it("should return null birthday when the user has no date of birth", async () => {
      const user = User.restore({
        id: "user-1",
        email: "bob@example.com",
        hashedPassword: "hashed-password",
        role: UserRole.USER,
        emailVerified: true,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        googleId: null,
        firstName: "Bob",
        lastName: "Smith",
        userName: "bob",
        dateOfBirth: null,
        avatar: null,
        bio: null,
        hideYear: false,
        status: UserStatus.ACTIVE,
      });

      userRepository.findByUserName.mockResolvedValue(user);

      listRepository.findPageByUserId.mockResolvedValue({
        data: [],
        page: 1,
        limit: 100,
        total: 0,
        totalPages: 0,
      });

      const result = await useCase.execute("bob");

      expect(result.birthday).toBeNull();
    });

    it("should reject a restricted user as not found", async () => {
      const user = User.restore({
        id: "user-1",
        email: "bob@example.com",
        hashedPassword: "hashed-password",
        role: UserRole.USER,
        emailVerified: true,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        googleId: null,
        firstName: "Bob",
        lastName: "Smith",
        userName: "bob",
        dateOfBirth: null,
        avatar: null,
        bio: null,
        hideYear: false,
        status: UserStatus.RESTRICTED,
      });

      userRepository.findByUserName.mockResolvedValue(user);

      await expect(useCase.execute("bob")).rejects.toThrow(
        UserNotFoundException,
      );

      expect(listRepository.findPageByUserId).not.toHaveBeenCalled();
    });

    it("should reject a non-existent user", async () => {
      userRepository.findByUserName.mockResolvedValue(null);

      await expect(
        useCase.execute("00000000-0000-0000-0000-000000000000"),
      ).rejects.toThrow(UserNotFoundException);

      expect(listRepository.findPageByUserId).not.toHaveBeenCalled();
    });

    it("should return null receivedAmount for a targetless wish", async () => {
      const user = User.restore({
        id: "user-1",
        email: "bob@example.com",
        hashedPassword: "hashed-password",
        role: UserRole.USER,
        emailVerified: true,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        googleId: null,
        firstName: "Bob",
        lastName: "Smith",
        userName: "bob",
        dateOfBirth: new Date("2000-07-25T00:00:00.000Z"),
        avatar: null,
        bio: null,
        hideYear: false,
        status: UserStatus.ACTIVE,
      });

      const publicList = List.create({
        id: "list-public",
        userId: user.id,
        name: "Birthday",
        description: null,
        visibility: ListVisibility.PUBLIC,
      });

      const wish = Wish.create({
        id: "wish-1",
        listId: publicList.id,
        title: "Surprise me",
        description: "Anything is fine",
        targetAmount: null,
        currency: null,
      });

      userRepository.findByUserName.mockResolvedValue(user);

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

      const result = await useCase.execute("bob");

      expect(result.lists).toHaveLength(1);
      expect(result.lists[0].wishes).toHaveLength(1);

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

    it("should load all wish pages for a public list", async () => {
      const user = User.restore({
        id: "user-1",
        email: "bob@example.com",
        hashedPassword: "hashed-password",
        role: UserRole.USER,
        emailVerified: true,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        googleId: null,
        firstName: "Bob",
        lastName: "Smith",
        userName: "bob",
        dateOfBirth: null,
        avatar: null,
        bio: null,
        hideYear: false,
        status: UserStatus.ACTIVE,
      });

      const publicList = List.create({
        id: "list-public",
        userId: user.id,
        name: "Birthday",
        visibility: ListVisibility.PUBLIC,
      });

      const firstWish = Wish.create({
        id: "wish-1",
        listId: publicList.id,
        title: "First wish",
      });

      const secondWish = Wish.create({
        id: "wish-2",
        listId: publicList.id,
        title: "Second wish",
      });

      userRepository.findByUserName.mockResolvedValue(user);

      listRepository.findPageByUserId.mockResolvedValue({
        data: [publicList],
        page: 1,
        limit: 100,
        total: 1,
        totalPages: 1,
      });

      wishRepository.findPageByListId
        .mockResolvedValueOnce({
          data: [firstWish],
          page: 1,
          limit: 100,
          total: 2,
          totalPages: 2,
        })
        .mockResolvedValueOnce({
          data: [secondWish],
          page: 2,
          limit: 100,
          total: 2,
          totalPages: 2,
        });

      const result = await useCase.execute("bob");

      expect(result.lists[0].wishes).toHaveLength(2);
      expect(result.lists[0].wishes[0].id).toBe(firstWish.id);
      expect(result.lists[0].wishes[1].id).toBe(secondWish.id);

      expect(wishRepository.findPageByListId).toHaveBeenNthCalledWith(
        1,
        publicList.id,
        {
          page: 1,
          limit: 100,
          sortBy: "createdAt",
          sortDirection: "DESC",
        },
      );

      expect(wishRepository.findPageByListId).toHaveBeenNthCalledWith(
        2,
        publicList.id,
        {
          page: 2,
          limit: 100,
          sortBy: "createdAt",
          sortDirection: "DESC",
        },
      );
    });

    it("should load all list pages", async () => {
      const user = User.restore({
        id: "user-1",
        email: "bob@example.com",
        hashedPassword: "hashed-password",
        role: UserRole.USER,
        emailVerified: true,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        googleId: null,
        firstName: "Bob",
        lastName: "Smith",
        userName: "bob",
        dateOfBirth: null,
        avatar: null,
        bio: null,
        hideYear: false,
        status: UserStatus.ACTIVE,
      });

      const firstList = List.create({
        id: "list-1",
        userId: user.id,
        name: "Birthday",
        visibility: ListVisibility.PUBLIC,
      });

      const secondList = List.create({
        id: "list-2",
        userId: user.id,
        name: "Other",
        visibility: ListVisibility.PUBLIC,
      });

      userRepository.findByUserName.mockResolvedValue(user);

      listRepository.findPageByUserId
        .mockResolvedValueOnce({
          data: [firstList],
          page: 1,
          limit: 100,
          total: 2,
          totalPages: 2,
        })
        .mockResolvedValueOnce({
          data: [secondList],
          page: 2,
          limit: 100,
          total: 2,
          totalPages: 2,
        });

      wishRepository.findPageByListId.mockResolvedValue({
        data: [],
        page: 1,
        limit: 100,
        total: 0,
        totalPages: 0,
      });

      const result = await useCase.execute("bob");

      expect(result.lists).toHaveLength(2);

      expect(listRepository.findPageByUserId).toHaveBeenNthCalledWith(
        1,
        user.id,
        {
          page: 1,
          limit: 100,
          sortBy: "createdAt",
          sortDirection: "DESC",
        },
      );

      expect(listRepository.findPageByUserId).toHaveBeenNthCalledWith(
        2,
        user.id,
        {
          page: 2,
          limit: 100,
          sortBy: "createdAt",
          sortDirection: "DESC",
        },
      );
    });
  });
});
