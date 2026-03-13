const mongoose = require('mongoose');

const accessLogSchema = new mongoose.Schema(
  {
    linkId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Link',
      required: true,
      index: true
    },
    slug: {
      type: String,
      required: true,
      index: true
    },
    usuarioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    dispositivo: {
      type: String,
      enum: ['mobile', 'desktop'],
      required: true
    },
    plataforma: {
      type: String,
      default: 'other',
      index: true
    },
    userAgent: {
      type: String,
      default: ''
    },
    ip: {
      type: String,
      default: ''
    },
    referer: {
      type: String,
      default: ''
    },
    source: {
      type: String,
      default: 'direct',
      index: true
    },
    utmSource: {
      type: String,
      default: ''
    },
    utmMedium: {
      type: String,
      default: ''
    },
    utmCampaign: {
      type: String,
      default: ''
    },
    country: {
      type: String,
      default: 'unknown',
      index: true
    },
    region: {
      type: String,
      default: ''
    },
    city: {
      type: String,
      default: ''
    },
    horaAcesso: {
      type: Number,
      min: 0,
      max: 23,
      default: 0,
      index: true
    },
    criadoEm: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    versionKey: false
  }
);

accessLogSchema.index({ usuarioId: 1, criadoEm: -1 });

module.exports = mongoose.model('AccessLog', accessLogSchema);
