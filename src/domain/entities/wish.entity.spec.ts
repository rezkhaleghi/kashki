import { PaymentCurrency } from "../enums/payment-currency.enum";
import { WishStatus } from "../enums/wish-status.enum";
import {
  FieldMustExistException,
  InvalidWishTargetAmountException,
  WishCompletedException,
} from "../exceptions/domain.exception";
import { Wish } from "./wish.entity";

describe("Wish", () => {
  const createWish = () =>
    Wish.create({
      listId: "list-1",
      title: "  MacBook Pro  ",
      description: "  16-inch MacBook Pro  ",
      targetAmount: "2000",
      currency: PaymentCurrency.USDT,
    });

  it("creates an active wish with trimmed values and generated identifiers", () => {
    const wish = createWish();

    expect(wish.id).toBeDefined();
    expect(wish.listId).toBe("list-1");
    expect(wish.title).toBe("MacBook Pro");
    expect(wish.description).toBe("16-inch MacBook Pro");
    expect(wish.targetAmount).toBe("2000");
    expect(wish.currency).toBe(PaymentCurrency.USDT);
    expect(wish.getStatus()).toBe(WishStatus.ACTIVE);
    expect(wish.createdAt).toBeInstanceOf(Date);
    expect(wish.updatedAt).toBeInstanceOf(Date);
  });

  it("creates a wish without an optional target", () => {
    const wish = Wish.create({
      listId: "list-1",
      title: "Birthday Book",
    });

    expect(wish.targetAmount).toBeNull();
    expect(wish.currency).toBeNull();
    expect(wish.getStatus()).toBe(WishStatus.ACTIVE);
  });

  it("preserves provided values when creating persisted state", () => {
    const createdAt = new Date("2026-01-01T00:00:00.000Z");
    const updatedAt = new Date("2026-01-02T00:00:00.000Z");

    const wish = Wish.create({
      id: "wish-1",
      listId: "list-1",
      title: "Birthday Trip",
      description: null,
      targetAmount: "1500",
      currency: PaymentCurrency.USDT,
      status: WishStatus.ACTIVE,
      createdAt,
      updatedAt,
    });

    expect(wish.id).toBe("wish-1");
    expect(wish.listId).toBe("list-1");
    expect(wish.title).toBe("Birthday Trip");
    expect(wish.description).toBeNull();
    expect(wish.targetAmount).toBe("1500");
    expect(wish.currency).toBe(PaymentCurrency.USDT);
    expect(wish.getStatus()).toBe(WishStatus.ACTIVE);
    expect(wish.createdAt).toBe(createdAt);
    expect(wish.updatedAt).toBe(updatedAt);
  });

  it("restores persisted state without changing values", () => {
    const createdAt = new Date("2026-01-01T00:00:00.000Z");
    const updatedAt = new Date("2026-01-02T00:00:00.000Z");

    const wish = Wish.restore({
      id: "wish-1",
      listId: "list-1",
      title: "Birthday Trip",
      description: "Trip to Italy",
      targetAmount: "1500",
      currency: PaymentCurrency.USDT,
      status: WishStatus.COMPLETED,
      createdAt,
      updatedAt,
    });

    expect(wish.id).toBe("wish-1");
    expect(wish.listId).toBe("list-1");
    expect(wish.title).toBe("Birthday Trip");
    expect(wish.description).toBe("Trip to Italy");
    expect(wish.targetAmount).toBe("1500");
    expect(wish.currency).toBe(PaymentCurrency.USDT);
    expect(wish.getStatus()).toBe(WishStatus.COMPLETED);
    expect(wish.createdAt).toBe(createdAt);
    expect(wish.updatedAt).toBe(updatedAt);
  });

  it("updates wish fields", () => {
    const wish = createWish();

    wish.update({
      title: "  New MacBook  ",
      description: "  Updated description  ",
      targetAmount: "2500",
      currency: PaymentCurrency.USDT,
    });

    expect(wish.title).toBe("New MacBook");
    expect(wish.description).toBe("Updated description");
    expect(wish.targetAmount).toBe("2500");
    expect(wish.currency).toBe(PaymentCurrency.USDT);
  });

  it("clears optional fields when explicitly set to null", () => {
    const wish = createWish();

    wish.update({
      description: null,
      targetAmount: null,
      currency: null,
    });

    expect(wish.description).toBeNull();
    expect(wish.targetAmount).toBeNull();
    expect(wish.currency).toBeNull();
  });

  it("does not change fields that are undefined", () => {
    const wish = createWish();

    wish.update({});

    expect(wish.title).toBe("MacBook Pro");
    expect(wish.description).toBe("16-inch MacBook Pro");
    expect(wish.targetAmount).toBe("2000");
    expect(wish.currency).toBe(PaymentCurrency.USDT);
  });

  it("rejects an empty list ID during creation", () => {
    expect(() =>
      Wish.create({
        listId: "   ",
        title: "MacBook Pro",
      }),
    ).toThrow(FieldMustExistException);
  });

  it("rejects an empty title during creation", () => {
    expect(() =>
      Wish.create({
        listId: "list-1",
        title: "   ",
      }),
    ).toThrow(FieldMustExistException);
  });

  it("rejects an empty title during update", () => {
    const wish = createWish();

    expect(() =>
      wish.update({
        title: "   ",
      }),
    ).toThrow(FieldMustExistException);
  });

  it("rejects a zero target amount", () => {
    expect(() =>
      Wish.create({
        listId: "list-1",
        title: "MacBook Pro",
        targetAmount: "0",
      }),
    ).toThrow(InvalidWishTargetAmountException);
  });

  it("rejects a negative target amount", () => {
    expect(() =>
      Wish.create({
        listId: "list-1",
        title: "MacBook Pro",
        targetAmount: "-100",
      }),
    ).toThrow(InvalidWishTargetAmountException);
  });

  it("rejects a zero target amount during update", () => {
    const wish = createWish();

    expect(() =>
      wish.update({
        targetAmount: "0",
      }),
    ).toThrow(InvalidWishTargetAmountException);
  });

  it("rejects a negative target amount during update", () => {
    const wish = createWish();

    expect(() =>
      wish.update({
        targetAmount: "-100",
      }),
    ).toThrow(InvalidWishTargetAmountException);
  });

  it("marks an active wish as completed", () => {
    const wish = createWish();

    wish.markCompleted();

    expect(wish.getStatus()).toBe(WishStatus.COMPLETED);
  });

  it("rejects updating a completed wish", () => {
    const wish = createWish();

    wish.markCompleted();

    expect(() =>
      wish.update({
        title: "Another Wish",
      }),
    ).toThrow(WishCompletedException);
  });

  it("rejects completing an already completed wish", () => {
    const wish = createWish();

    wish.markCompleted();

    expect(() => wish.markCompleted()).toThrow(WishCompletedException);
  });

  it("updates updatedAt when the wish changes", () => {
    const wish = createWish();

    const previousUpdatedAt = wish.updatedAt;

    wish.update({
      title: "New Wish",
    });

    expect(wish.updatedAt.getTime()).toBeGreaterThanOrEqual(
      previousUpdatedAt.getTime(),
    );
  });

  it("updates updatedAt when the wish is completed", () => {
    const wish = createWish();

    const previousUpdatedAt = wish.updatedAt;

    wish.markCompleted();

    expect(wish.updatedAt.getTime()).toBeGreaterThanOrEqual(
      previousUpdatedAt.getTime(),
    );
  });
});
