import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { Gift } from "@domain/entities/gift.entity";
import {
  GiftRepository,
  GiftFilters,
} from "@domain/repositories/gift.repository";
import { PaymentCurrency } from "@domain/enums/payment-currency.enum";
import { PageQuery, PageResult } from "@shared/pagination/page-query";

import { GiftOrmEntity } from "../orm-entities/gift.orm-entity";

@Injectable()
export class GiftRepositoryImpl implements GiftRepository {
  constructor(
    @InjectRepository(GiftOrmEntity)
    private readonly repo: Repository<GiftOrmEntity>,
  ) {}

  async create(gift: Gift): Promise<Gift> {
    const saved = await this.repo.save(this.toOrm(gift));

    return this.toDomain(saved);
  }

  async findById(id: string): Promise<Gift | null> {
    const row = await this.repo.findOne({
      where: { id },
    });

    return row ? this.toDomain(row) : null;
  }

  async findPageByWishId(
    wishId: string,
    params: PageQuery<"createdAt" | "amount">,
  ): Promise<PageResult<Gift>> {
    return this.findPage({ wishId }, params);
  }

  async findPageByUserId(
    userId: string,
    params: PageQuery<"createdAt" | "amount">,
  ): Promise<PageResult<Gift>> {
    return this.findPage({ userId }, params);
  }

  async findPage(
    filters: GiftFilters,
    params: PageQuery<"createdAt" | "amount">,
  ): Promise<PageResult<Gift>> {
    const query = this.repo.createQueryBuilder("gift");

    if (filters.userId) {
      query.andWhere("gift.userId = :userId", {
        userId: filters.userId,
      });
    }

    if (filters.wishId) {
      query.andWhere("gift.wishId = :wishId", {
        wishId: filters.wishId,
      });
    }

    if (filters.currency) {
      query.andWhere("gift.currency = :currency", {
        currency: filters.currency,
      });
    }

    const sortBy = params.sortBy ?? "createdAt";
    const sortDirection = params.sortDirection ?? "DESC";

    query
      .orderBy(`gift.${sortBy}`, sortDirection)
      .skip((params.page - 1) * params.limit)
      .take(params.limit);

    const [rows, total] = await query.getManyAndCount();

    return {
      data: rows.map((row) => this.toDomain(row)),
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.ceil(total / params.limit),
    };
  }

  async existsByWishId(wishId: string): Promise<boolean> {
    return this.repo.exists({
      where: { wishId },
    });
  }

  async sumAmountByWishIdAndCurrency(
    wishId: string,
    currency: PaymentCurrency,
  ): Promise<string> {
    const result = await this.repo
      .createQueryBuilder("gift")
      .select("COALESCE(SUM(gift.amount), 0)", "total")
      .where("gift.wishId = :wishId", { wishId })
      .andWhere("gift.currency = :currency", { currency })
      .getRawOne<{ total: string }>();

    return result?.total ?? "0";
  }

  private toDomain(row: GiftOrmEntity): Gift {
    return Gift.restore({
      id: row.id,
      userId: row.userId,
      wishId: row.wishId,
      amount: row.amount,
      currency: row.currency,
      anonymous: row.anonymous,
      message: row.message,
      createdAt: row.createdAt,
    });
  }

  private toOrm(gift: Gift): GiftOrmEntity {
    const row = new GiftOrmEntity();

    row.id = gift.id;
    row.userId = gift.userId;
    row.wishId = gift.wishId;
    row.amount = gift.amount;
    row.currency = gift.currency;
    row.anonymous = gift.anonymous;
    row.message = gift.message;
    row.createdAt = gift.createdAt;

    return row;
  }
}
