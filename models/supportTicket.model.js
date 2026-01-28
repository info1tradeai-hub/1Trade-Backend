import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'UserModel' },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
});

const supportTicketSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'UserModel', required: true },
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'UserModel', default: null },
    status: {
        type: String,
        enum: ['pending', 'approved', 'closed'],
        default: 'pending',
    },
    subject: {
        type: String,
        required: true,
    },
    messages: [messageSchema],
}, { timestamps: true });

export const SupportTicket = mongoose.model('SupportTicket', supportTicketSchema);
