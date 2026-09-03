const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../config/prisma');
const { AppError } = require('../middleware/error');
const { authenticate } = require('../middleware/auth');
const { normalizeCoupon } = require('../utils/ids');
const couponEngine = require('../services/couponEngine');
const settings = require('../services/settings');

const router = express.Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(errors);
  next();
};

// Coupon validation (public / customer)
router.post(
  '/validate',
  [body('couponCode').isString().isLength({ min: 2 })],
  validate,
  async (req, res, next) => {
    try {
      const { couponCode, customerId, customerEmail, items, subtotal } = req.body;
      const result = await couponEngine.validateCoupon(couponCode, {
        customerId, customerEmail, items, subtotal,
      });
      res.json({ success: result.valid, ...result });
    } catch (e) { next(e); }
  }
);

// Apply coupon to session (stateless: same as validate but with stacking check)
router.post(
  '/apply',
  [body('couponCode').isString().isLength({ min: 2 })],
  validate,
  async (req, res, next) => {
    try {
      const { couponCode, customerId, customerEmail, items, subtotal, otherDiscountsApplied = false } = req.body;

      const allowStacking = (await settings.get('ALLOW_COUPON_STACKING')) === true;
      if (otherDiscountsApplied && !allowStacking) {
        return res.json({
          success: false,
          valid: false,
          errors: ['Affiliate coupons cannot be combined with other discounts'],
        });
      }

      const result = await couponEngine.validateCoupon(couponCode, {
        customerId, customerEmail, items, subtotal,
      });
      if (!result.valid) return res.json({ success: false, ...result });

      // Increment usage count softly (placeholder; real count happens on successful order)
      // For now we just return success.
      res.json({ success: true, ...result });
    } catch (e) { next(e); }
  }
);

router.delete('/remove', (req, res) => {
  res.json({ success: true, data: { message: 'Coupon removed from session' } });
});

module.exports = router;
