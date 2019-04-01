var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var MovieSchema = new Schema({
  status: String,
  size: String,
  category: String,
  originalname: String,
  originaltitle: String,
  aka: String,
  language: String,
  banben: String,
  poster: String,
  count: { type: Number, default: 0 },
  path: String,
  duration: String,
  director: [String],
  writer: [String],
  rate: Number,
  year: Number,
  stars: [String],
  summary: String,
  country: [String],
  tags: [String],
  m3u8paths: [{ hd: Number, path: String }],
  totv: Schema.Types.ObjectId,
  md5: String,
  createAt: {
    type: Date
  }
});
MovieSchema.pre('save', function(next) {
  if (!this.createAt) {
    this.createAt = Date.now();
  }
  next();
});
MovieSchema.index({ director: 1 });
MovieSchema.index({ stars: 1 });
MovieSchema.index({ writer: 1 });
MovieSchema.index({ country: 1 });
MovieSchema.index({ tags: 1 });
MovieSchema.index({ status: 1, createAt: -1 });
MovieSchema.index({ originalname: 1, createAt: -1 });
module.exports = MovieSchema;
