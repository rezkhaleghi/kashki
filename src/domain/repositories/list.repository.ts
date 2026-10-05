import { List } from "@domain/entities/list.entity";
import { PageQuery, PageResult } from "@shared/pagination/page-query";

/**
 * Persistence contract for Lists.
 *
 * The application layer depends on this abstraction rather than TypeORM.
 * The infrastructure layer provides the concrete implementation.
 */
export abstract class ListRepository {
  abstract create(list: List): Promise<List>;

  abstract save(list: List): Promise<List>;

  abstract findById(id: string): Promise<List | null>;

  abstract findByUserIdAndId(userId: string, id: string): Promise<List | null>;

  abstract findPageByUserId(
    userId: string,
    params: PageQuery<"createdAt" | "name">,
  ): Promise<PageResult<List>>;

  /**
   * Finds all lists across all users for administrator operations.
   */
  abstract findPage(
    params: PageQuery<"createdAt" | "name">,
  ): Promise<PageResult<List>>;

  abstract deleteById(id: string): Promise<void>;
}
