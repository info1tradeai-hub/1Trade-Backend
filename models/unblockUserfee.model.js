import mogoose from 'mongoose';
const unblockUserFeeSchema = new mogoose.Schema(
    {
        amount: {
            type: Number,
            default: 0,
        },
        userId: {
            type: mogoose.Schema.Types.ObjectId,
            ref: 'UserModel',
        },
        unblockDate: {
            type: Date,
            default: null,
        },
        message: {
            type: String,
            default: '',
        }
    },
    { timestamps: true }
);
const UnblockUserFeeModel = mogoose.model('UnblockUserFeeModel', unblockUserFeeSchema);
export default UnblockUserFeeModel;