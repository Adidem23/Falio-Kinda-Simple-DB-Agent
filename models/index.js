const mongoose=require('mongoose');

const todoSchema = new mongoose.Schema({
    title: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now   
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

const TODOMODEL=mongoose.model('todo',todoSchema);

module.exports=TODOMODEL;
