import { PaymentCurrency } from "@domain/enums/payment-currency.enum";
import {
  FieldMustExistException,
  InvalidGiftAmountException,
} from "@domain/exceptions/domain.exception";

import { Gift } from "./gift.entity";

describe("Gift", () => {
  const baseProps = {
    userId: "user-id",
    wishId: "wish-id",
    amount: "100.50",
    currency: PaymentCurrency.USD,
  };

  describe("create", () => {
    it("creates a targeted gift", () => {
      const gift = Gift.create(baseProps);

      expect(gift.id).toBeDefined();
      expect(gift.userId).toBe("user-id");
      expect(gift.wishId).toBe("wish-id");
      expect(gift.amount).toBe("100.50");
      expect(gift.currency).toBe(PaymentCurrency.USD);
      expect(gift.anonymous).toBe(false);
      expect(gift.message).toBeNull();
      expect(gift.createdAt).toBeInstanceOf(Date);
    });

    it("creates a general cash gift without a wish", () => {
      const gift = Gift.create({
        ...baseProps,
        wishId: null,
      });

      expect(gift.wishId).toBeNull();
    });

    it("defaults anonymous to false", () => {
      const gift = Gift.create(baseProps);

      expect(gift.anonymous).toBe(false);
    });

    it("accepts anonymous gifts", () => {
      const gift = Gift.create({
        ...baseProps,
        anonymous: true,
      });

      expect(gift.anonymous).toBe(true);
    });

    it("trims the user ID and rejects an empty value", () => {
      expect(() =>
        Gift.create({
          ...baseProps,
          userId: "   ",
        }),
      ).toThrow(FieldMustExistException);
    });

    it("rejects zero amount", () => {
      expect(() =>
        Gift.create({
          ...baseProps,
          amount: "0",
        }),
      ).toThrow(InvalidGiftAmountException);
    });

    it("rejects negative amount", () => {
      expect(() =>
        Gift.create({
          ...baseProps,
          amount: "-1",
        }),
      ).toThrow(InvalidGiftAmountException);
    });

    it("trims the message", () => {
      const gift = Gift.create({
        ...baseProps,
        message: "  Happy birthday!  ",
      });

      expect(gift.message).toBe("Happy birthday!");
    });

    it("normalizes an empty message to null", () => {
      const gift = Gift.create({
        ...baseProps,
        message: "   ",
      });

      expect(gift.message).toBeNull();
    });
  });

  describe("restore", () => {
    it("restores persisted state without changing it", () => {
      const createdAt = new Date("2026-01-01T00:00:00.000Z");

      const gift = Gift.restore({
        id: "gift-id",
        userId: "user-id",
        wishId: null,
        amount: "50",
        currency: PaymentCurrency.EUR,
        anonymous: true,
        message: "Happy birthday",
        createdAt,
      });

      expect(gift.id).toBe("gift-id");
      expect(gift.userId).toBe("user-id");
      expect(gift.wishId).toBeNull();
      expect(gift.amount).toBe("50");
      expect(gift.currency).toBe(PaymentCurrency.EUR);
      expect(gift.anonymous).toBe(true);
      expect(gift.message).toBe("Happy birthday");
      expect(gift.createdAt).toBe(createdAt);
    });
  });
});
