import mongoose from 'mongoose';

const girlSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 30
  },
  photo: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true,
    enum: ['Москва', 'СПб', 'Казань', 'Екатеринбург', 'Новосибирск', 'Другой'],
    index: true
  },
  age: {
    type: Number,
    required: true,
    min: 18,
    max: 35
  },
  services: [{
    name: String,
    price: Number,
    duration: String,
    description: String
  }],
  rating: {
    type: Number,
    default: 5,
    min: 0,
    max: 5
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  ordersCount: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

// Index for catalog filtering
girlSchema.index({ city: 1, isOnline: -1 });

export default mongoose.model('Girl', girlSchema);