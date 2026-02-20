import * as tf from '@tensorflow/tfjs-node';
import * as nsfwjs from 'nsfwjs';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

let model: nsfwjs.NSFWJS | null = null;

async function getModel(): Promise<nsfwjs.NSFWJS> {
  if (!model) {
    model = await nsfwjs.load();
  }
  return model;
}

export async function isImageSafe(filePath: string): Promise<{ safe: boolean; reason?: string }> {
  try {
    const imageBuffer = await sharp(filePath)
      .resize(224, 224)
      .toFormat('jpeg')
      .toBuffer();

    const tfImage = tf.node.decodeImage(imageBuffer, 3) as tf.Tensor3D;
    const nsfwModel = await getModel();
    const predictions = await nsfwModel.classify(tfImage);
    tfImage.dispose();

    const porn = predictions.find(p => p.className === 'Porn')?.probability || 0;
    const hentai = predictions.find(p => p.className === 'Hentai')?.probability || 0;
    const sexy = predictions.find(p => p.className === 'Sexy')?.probability || 0;

    if (porn > 0.6 || hentai > 0.6) {
      return { safe: false, reason: 'Image contains explicit content and cannot be uploaded.' };
    }

    if (sexy > 0.8) {
      return { safe: false, reason: 'Image contains inappropriate content and cannot be uploaded.' };
    }

    return { safe: true };
  } catch (err) {
    console.error('Image moderation error:', err);
    return { safe: true };
  }
}
