const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../config/prisma');
const { signToken, hashPassword, verifyPassword, authenticate } = require('../middleware/auth');
const { AppError } = require('../middleware/error');
const { supabaseAdmin, supabaseAvailable } = require('../config/supabase');

const router = express.Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(errors);
  }
  next();
};

router.post(
  '/register-admin',
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password >= 6 chars'),
    body('name').isLength({ min: 2 }),
  ],
  validate,
  async (req, res, next) => {
    try {
      const admins = await prisma.user.count({ where: { role: 'ADMIN' } });
      if (admins > 0 && !process.env.ALLOW_ADMIN_SEED) {
        return next(new AppError('Admin already seeded', 400));
      }
      const { email, password, name } = req.body;
      const hashed = await hashPassword(password);
      const user = await prisma.user.create({
        data: { email, name, passwordHash: hashed, role: 'ADMIN' },
      });
      const token = signToken({ sub: user.id, role: user.role });
      res.json({ success: true, data: { token, user: { id: user.id, email, name, role: user.role } } });
    } catch (e) { next(e); }
  }
);

router.post(
  '/login',
  [body('email').isEmail(), body('password').isLength({ min: 1 })],
  validate,
  async (req, res, next) => {
    try {
      const { email, password, supabaseToken } = req.body;
      if (supabaseToken && supabaseAvailable) {
        const { data } = await supabaseAdmin.auth.getUser(supabaseToken);
        if (data?.user) {
          let user = await prisma.user.findFirst({
            where: { supabaseUid: data.user.id },
            include: { affiliate: true },
          });
          if (!user) {
            user = await prisma.user.create({
              data: {
                supabaseUid: data.user.id,
                email: data.user.email,
                name: data.user.user_metadata?.name,
                role: data.user.app_metadata?.role || 'CUSTOMER',
              },
              include: { affiliate: true },
            });
          }
          const token = signToken({ sub: user.id, role: user.role });
          return res.json({
            success: true,
            data: {
              token,
              user: {
                id: user.id, email: user.email, name: user.name, role: user.role,
                affiliateId: user.affiliate?.id,
              },
            },
          });
        }
      }
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        include: { affiliate: true },
      });
      if (!user) return next(new AppError('Invalid credentials', 401, 'AUTH_FAILED'));
      if (!user.passwordHash) return next(new AppError('Use Supabase login', 401));
      const ok = await verifyPassword(password, user.passwordHash);
      if (!ok) return next(new AppError('Invalid credentials', 401, 'AUTH_FAILED'));
      const token = signToken({ sub: user.id, role: user.role });
      res.json({
        success: true,
        data: {
          token,
          user: {
            id: user.id, email: user.email, name: user.name, role: user.role,
            affiliateId: user.affiliate?.id,
          },
        },
      });
    } catch (e) { next(e); }
  }
);

router.get('/me', authenticate, (req, res) => {
  const u = req.user;
  res.json({
    success: true,
    data: {
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      phone: u.phone,
      affiliateId: u.affiliate?.id,
      affiliateStatus: u.affiliate?.status,
      affiliateCode: u.affiliate?.affiliateCode,
    },
  });
});

module.exports = router;
