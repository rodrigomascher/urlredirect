const mongoose = require('mongoose');

const linkSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: /^[a-z0-9-]{3,40}$/
    },
    urlDestino: {
      type: String,
      required: true,
      trim: true
    },
    usuarioId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    dataCriacao: {
      type: Date,
      default: Date.now
    }
  },
  {
    versionKey: false
  }
);

linkSchema.index({ usuarioId: 1, slug: 1 }, { unique: true });

module.exports = mongoose.model('Link', linkSchema);
