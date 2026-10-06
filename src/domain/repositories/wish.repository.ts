import { Wish } from "@domain/entities/wish.entity";
import { PageQuery, PageResult } from "@shared/pagination/page-query";

export abstract class WishRepository {
  abstract create(wish: Wish): Promise<Wish>;

  abstract save(wish: Wish): Promise<Wish>;

  abstract findById(id: string): Promise<Wish | null>;

  abstract findByIdForUpdate(id: string): Promise<Wish | null>;

  abstract findByListIdAndId(listId: string, id: string): Promise<Wish | null>;

  abstract findPageByListId(
    listId: string,
    params: PageQuery<"createdAt" | "title">,
  ): Promise<PageResult<Wish>>;

  abstract findPage(
    params: PageQuery<"createdAt" | "title">,
  ): Promise<PageResult<Wish>>;

  abstract deleteById(id: string): Promise<void>;
}
