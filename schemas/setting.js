var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var SettingSchema = new Schema({
  host: String,
  hd: String,
  hds: [Number],
  rate: String,
  keepmp4: [Number],
  paomadeng: String,
  isqiepian: String,
  paojiange: Number,
  paotime: Number,
  gifkaiguan: String,
  gifduration: Number,
  gifstart: Number,
  gifwidth: Number,
  antiurl: [String],
  antiredirect: String,
  antikey: String,
  wmpath: String,
  miaoqie: String,
  screenshots: Number,
  tsjiami: String,
  api: String,
  apikey: String,
  uploadkey: String,
  createAt: {
    type: Date,
    default: Date.now()
  }
});
SettingSchema.pre('save', function(next) {
  if (!this.createAt) {
    this.createAt = Date.now();
  }
  next();
});
module.exports = SettingSchema;
