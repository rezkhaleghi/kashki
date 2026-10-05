import { List } from "./list.entity";
import { ListVisibility } from "../enums/list-visibility.enum";
import { FieldMustExistException } from "../exceptions/domain.exception";

describe("List", () => {
  it("creates a private list with trimmed values", () => {
    const list = List.create({
      userId: "user-1",
      name: "  Birthday Gifts  ",
      description: "  Things I would like  ",
    });

    expect(list.id).toBeDefined();
    expect(list.userId).toBe("user-1");
    expect(list.name).toBe("Birthday Gifts");
    expect(list.description).toBe("Things I would like");
    expect(list.visibility).toBe(ListVisibility.PRIVATE);
    expect(list.createdAt).toBeInstanceOf(Date);
    expect(list.updatedAt).toBeInstanceOf(Date);
  });

  it("creates a list with the requested visibility", () => {
    const publicList = List.create({
      userId: "user-1",
      name: "Wedding Gifts",
      visibility: ListVisibility.PUBLIC,
    });

    const unlistedList = List.create({
      userId: "user-1",
      name: "Private Event",
      visibility: ListVisibility.UNLISTED,
    });

    expect(publicList.visibility).toBe(ListVisibility.PUBLIC);
    expect(unlistedList.visibility).toBe(ListVisibility.UNLISTED);
  });

  it("preserves provided values when restoring persisted state", () => {
    const createdAt = new Date("2026-01-01T00:00:00.000Z");
    const updatedAt = new Date("2026-01-02T00:00:00.000Z");

    const list = List.create({
      id: "list-1",
      userId: "user-1",
      name: "Birthday Gifts",
      description: null,
      visibility: ListVisibility.PUBLIC,
      createdAt,
      updatedAt,
    });

    expect(list.id).toBe("list-1");
    expect(list.userId).toBe("user-1");
    expect(list.name).toBe("Birthday Gifts");
    expect(list.description).toBeNull();
    expect(list.visibility).toBe(ListVisibility.PUBLIC);
    expect(list.createdAt).toBe(createdAt);
    expect(list.updatedAt).toBe(updatedAt);
  });

  it("updates list fields", () => {
    const list = List.create({
      userId: "user-1",
      name: "Birthday Gifts",
      description: "Old description",
      visibility: ListVisibility.PRIVATE,
    });

    list.update({
      name: "  Wedding Gifts  ",
      description: "  New description  ",
      visibility: ListVisibility.PUBLIC,
    });

    expect(list.name).toBe("Wedding Gifts");
    expect(list.description).toBe("New description");
    expect(list.visibility).toBe(ListVisibility.PUBLIC);
  });

  it("clears the description when explicitly set to null", () => {
    const list = List.create({
      userId: "user-1",
      name: "Birthday Gifts",
      description: "Things I want",
    });

    list.update({
      description: null,
    });

    expect(list.description).toBeNull();
  });

  it("does not change fields that are undefined", () => {
    const list = List.create({
      userId: "user-1",
      name: "Birthday Gifts",
      description: "Things I want",
      visibility: ListVisibility.PUBLIC,
    });

    list.update({});

    expect(list.name).toBe("Birthday Gifts");
    expect(list.description).toBe("Things I want");
    expect(list.visibility).toBe(ListVisibility.PUBLIC);
  });

  it("rejects an empty list name during creation", () => {
    expect(() =>
      List.create({
        userId: "user-1",
        name: "   ",
      }),
    ).toThrow(FieldMustExistException);
  });

  it("rejects an empty user ID during creation", () => {
    expect(() =>
      List.create({
        userId: "   ",
        name: "Birthday Gifts",
      }),
    ).toThrow(FieldMustExistException);
  });

  it("rejects an empty list name during update", () => {
    const list = List.create({
      userId: "user-1",
      name: "Birthday Gifts",
    });

    expect(() =>
      list.update({
        name: "   ",
      }),
    ).toThrow(FieldMustExistException);
  });

  it("updates updatedAt when the list changes", () => {
    const list = List.create({
      userId: "user-1",
      name: "Birthday Gifts",
    });

    const previousUpdatedAt = list.updatedAt;

    list.update({
      name: "Wedding Gifts",
    });

    expect(list.updatedAt.getTime()).toBeGreaterThanOrEqual(
      previousUpdatedAt.getTime(),
    );
  });
});
