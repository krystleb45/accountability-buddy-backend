// src/api/models/AccountabilityPartnership.ts
import mongoose, { Document, Model, Schema } from "mongoose";

export interface IAccountabilityPartnership extends Document {
  user1: mongoose.Types.ObjectId;
  user2: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

interface IAccountabilityPartnershipModel
  extends Model<IAccountabilityPartnership> {
  findBetweenUsers(
    u1: string,
    u2: string
  ): Promise<IAccountabilityPartnership | null>;
}

const AccountabilityPartnershipSchema = new Schema<
  IAccountabilityPartnership,
  IAccountabilityPartnershipModel
>(
  {
    user1: { type: Schema.Types.ObjectId, ref: "User", required: true },
    user2: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  {
    timestamps: true,
  }
);

// now give it an explicit return type
AccountabilityPartnershipSchema.statics.findBetweenUsers = function(
  this: IAccountabilityPartnershipModel,
  u1: string,
  u2: string
): Promise<IAccountabilityPartnership | null> {
  const id1 = new mongoose.Types.ObjectId(u1);
  const id2 = new mongoose.Types.ObjectId(u2);
  return this.findOne({
    $or: [
      { user1: id1, user2: id2 },
      { user1: id2, user2: id1 },
    ],
  }).exec();
};

const AccountabilityPartnership = mongoose.model<
  IAccountabilityPartnership,
  IAccountabilityPartnershipModel
>(
  "AccountabilityPartnership",
  AccountabilityPartnershipSchema
);

export default AccountabilityPartnership;
