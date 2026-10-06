import { PaymentCurrency } from "@domain/enums/payment-currency.enum";
import { WishStatus } from "@domain/enums/wish-status.enum";
import {
  FieldMustExistException,
  InvalidWishTargetAmountException,
  WishCompletedException,
  WishCurrencyChangeNotAllowedException,
  WishTargetAmountTooLowException,
} from "@domain/exceptions/domain.exception";
import { Wish } from "./wish.entity";

describe("Wish", () => {
  const createWish = () =>
    Wish.create({
      listId: "list-id",
      title: "MacBook Pro",
      description: "A new laptop",
      targetAmount: "1500",
      currency: PaymentCurrency.USD,
    });

  describe("create", () => {
    it("should create a wish with default active status", () => {
      const wish = createWish();

      expect(wish.id).toBeDefined();
      expect(wish.listId).toBe("list-id");
      expect(wish.title).toBe("MacBook Pro");
      expect(wish.description).toBe("A new laptop");
      expect(wish.targetAmount).toBe("1500");
      expect(wish.currency).toBe(PaymentCurrency.USD);
      expect(wish.getStatus()).toBe(WishStatus.ACTIVE);
      expect(wish.createdAt).toBeInstanceOf(Date);
      expect(wish.updatedAt).toBeInstanceOf(Date);
    });

    it("should trim title and description", () => {
      const wish = Wish.create({
        listId: "list-id",
        title: "  MacBook Pro  ",
        description: "  A new laptop  ",
      });

      expect(wish.title).toBe("MacBook Pro");
      expect(wish.description).toBe("A new laptop");
    });

    it("should allow a wish without a target amount", () => {
      const wish = Wish.create({
        listId: "list-id",
        title: "Surprise me",
      });

      expect(wish.targetAmount).toBeNull();
      expect(wish.currency).toBeNull();
    });

    it("should reject an empty list ID", () => {
      expect(() =>
        Wish.create({
          listId: "   ",
          title: "MacBook Pro",
        }),
      ).toThrow(new FieldMustExistException("Wish list ID"));
    });

    it("should reject an empty title", () => {
      expect(() =>
        Wish.create({
          listId: "list-id",
          title: "   ",
        }),
      ).toThrow(new FieldMustExistException("Wish title"));
    });

    it("should reject a zero target amount", () => {
      expect(() =>
        Wish.create({
          listId: "list-id",
          title: "MacBook Pro",
          targetAmount: "0",
        }),
      ).toThrow(new InvalidWishTargetAmountException());
    });

    it("should reject a negative target amount", () => {
      expect(() =>
        Wish.create({
          listId: "list-id",
          title: "MacBook Pro",
          targetAmount: "-100",
        }),
      ).toThrow(new InvalidWishTargetAmountException());
    });

    it("should preserve a provided ID and timestamps", () => {
      const createdAt = new Date("2026-01-01T00:00:00.000Z");
      const updatedAt = new Date("2026-01-02T00:00:00.000Z");

      const wish = Wish.create({
        id: "wish-id",
        listId: "list-id",
        title: "MacBook Pro",
        createdAt,
        updatedAt,
      });

      expect(wish.id).toBe("wish-id");
      expect(wish.createdAt).toBe(createdAt);
      expect(wish.updatedAt).toBe(updatedAt);
    });
  });

  describe("restore", () => {
    it("should restore a completed wish", () => {
      const createdAt = new Date("2026-01-01T00:00:00.000Z");
      const updatedAt = new Date("2026-01-02T00:00:00.000Z");

      const wish = Wish.restore({
        id: "wish-id",
        listId: "list-id",
        title: "MacBook Pro",
        description: "A new laptop",
        targetAmount: "1500",
        currency: PaymentCurrency.USD,
        status: WishStatus.COMPLETED,
        createdAt,
        updatedAt,
      });

      expect(wish.id).toBe("wish-id");
      expect(wish.getStatus()).toBe(WishStatus.COMPLETED);
      expect(wish.createdAt).toBe(createdAt);
      expect(wish.updatedAt).toBe(updatedAt);
    });
  });

  describe("update", () => {
    it("should update title and description", () => {
      const wish = createWish();

      wish.update(
        {
          title: "MacBook Air",
          description: "Updated description",
        },
        "0",
      );

      expect(wish.title).toBe("MacBook Air");
      expect(wish.description).toBe("Updated description");
    });

    it("should trim an updated title and description", () => {
      const wish = createWish();

      wish.update(
        {
          title: "  MacBook Air  ",
          description: "  Updated description  ",
        },
        "0",
      );

      expect(wish.title).toBe("MacBook Air");
      expect(wish.description).toBe("Updated description");
    });

    it("should reject an empty updated title", () => {
      const wish = createWish();

      expect(() =>
        wish.update(
          {
            title: "   ",
          },
          "0",
        ),
      ).toThrow(new FieldMustExistException("Wish title"));
    });

    it("should update the target amount", () => {
      const wish = createWish();

      wish.update(
        {
          targetAmount: "2000",
        },
        "0",
      );

      expect(wish.targetAmount).toBe("2000");
    });

    it("should allow removing the target amount before receiving gifts", () => {
      const wish = createWish();

      wish.update(
        {
          targetAmount: null,
        },
        "0",
      );

      expect(wish.targetAmount).toBeNull();
    });

    it("should reject a zero updated target amount", () => {
      const wish = createWish();

      expect(() =>
        wish.update(
          {
            targetAmount: "0",
          },
          "0",
        ),
      ).toThrow(new InvalidWishTargetAmountException());
    });

    it("should reject a negative updated target amount", () => {
      const wish = createWish();

      expect(() =>
        wish.update(
          {
            targetAmount: "-100",
          },
          "0",
        ),
      ).toThrow(new InvalidWishTargetAmountException());
    });

    it("should allow decreasing the target as long as it is not below received gifts", () => {
      const wish = createWish();

      wish.update(
        {
          targetAmount: "1200",
        },
        "1000",
      );

      expect(wish.targetAmount).toBe("1200");
    });

    it("should reject decreasing the target below received gifts", () => {
      const wish = createWish();

      expect(() =>
        wish.update(
          {
            targetAmount: "900",
          },
          "1000",
        ),
      ).toThrow(new WishTargetAmountTooLowException());
    });

    it("should allow increasing the target after receiving gifts", () => {
      const wish = createWish();

      wish.update(
        {
          targetAmount: "2000",
        },
        "1000",
      );

      expect(wish.targetAmount).toBe("2000");
    });

    it("should allow changing currency before receiving gifts", () => {
      const wish = createWish();

      wish.update(
        {
          currency: PaymentCurrency.USD,
        },
        "0",
      );

      expect(wish.currency).toBe(PaymentCurrency.USD);
    });

    it("should reject changing currency after receiving gifts", () => {
      const wish = createWish();

      expect(() =>
        wish.update(
          {
            currency: PaymentCurrency.EUR,
          },
          "100",
        ),
      ).toThrow(new WishCurrencyChangeNotAllowedException());
    });

    it("should update the timestamp when changed", () => {
      const wish = createWish();
      const previousUpdatedAt = wish.updatedAt;

      wish.update(
        {
          title: "Updated title",
        },
        "0",
      );

      expect(wish.updatedAt.getTime()).toBeGreaterThanOrEqual(
        previousUpdatedAt.getTime(),
      );
    });

    it("should allow reopening a completed wish by increasing its target", () => {
      const wish = Wish.restore({
        id: "wish-id",
        listId: "list-id",
        title: "MacBook Pro",
        description: null,
        targetAmount: "1500",
        currency: PaymentCurrency.USD,
        status: WishStatus.COMPLETED,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      });

      wish.update(
        {
          targetAmount: "2000",
        },
        "1500",
      );

      expect(wish.targetAmount).toBe("2000");
      expect(wish.getStatus()).toBe(WishStatus.ACTIVE);
    });

    it("should reject decreasing the target of a completed wish", () => {
      const wish = Wish.restore({
        id: "wish-id",
        listId: "list-id",
        title: "MacBook Pro",
        description: null,
        targetAmount: "1500",
        currency: PaymentCurrency.USD,
        status: WishStatus.COMPLETED,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      });

      expect(() =>
        wish.update(
          {
            targetAmount: "1200",
          },
          "1200",
        ),
      ).toThrow(new WishCompletedException());
    });

    it("should reject changing non-target fields on a completed wish", () => {
      const wish = Wish.restore({
        id: "wish-id",
        listId: "list-id",
        title: "MacBook Pro",
        description: null,
        targetAmount: "1500",
        currency: PaymentCurrency.USD,
        status: WishStatus.COMPLETED,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      });

      expect(() =>
        wish.update(
          {
            title: "MacBook Air",
          },
          "1500",
        ),
      ).toThrow(new WishCompletedException());
    });
  });

  describe("markCompleted", () => {
    it("should mark an active wish as completed", () => {
      const wish = createWish();

      wish.markCompleted();

      expect(wish.getStatus()).toBe(WishStatus.COMPLETED);
    });

    it("should reject completing an already completed wish", () => {
      const wish = createWish();

      wish.markCompleted();

      expect(() => wish.markCompleted()).toThrow(new WishCompletedException());
    });

    it("should update the timestamp", () => {
      const wish = createWish();
      const previousUpdatedAt = wish.updatedAt;

      wish.markCompleted();

      expect(wish.updatedAt.getTime()).toBeGreaterThanOrEqual(
        previousUpdatedAt.getTime(),
      );
    });
  });
});
