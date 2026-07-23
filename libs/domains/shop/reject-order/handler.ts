import { type Db } from '@nba/db';
import { RejectOrderRepository } from './repository';
import { Order } from '../shared/order';
import {
  OrderNotFoundError,
  OrderInvalidOrProcessedError,
  SeasonClosedError,
  ConcurrentModificationError
} from '../shared/errors';
import { isSeasonClosed } from '@nba/members-api';
import { RejectOrderInput, RejectOrderOutput } from "./dto";

export async function rejectOrder(db: Db, id: RejectOrderInput): Promise<RejectOrderOutput> {
  const repo = new RejectOrderRepository();

  const orderData = await repo.getOrderById(db, id);
  if (!orderData) {
    throw new OrderNotFoundError();
  }
  const order = new Order(orderData);

  if (!order.canBeRejected()) {
    throw new OrderInvalidOrProcessedError();
  }

  if (await isSeasonClosed(db, order.seasonId)) {
    throw new SeasonClosedError();
  }

  const updated = await repo.rejectWithLock(db, id);
  if (!updated) {
    throw new ConcurrentModificationError();
  }

  return updated;
}
