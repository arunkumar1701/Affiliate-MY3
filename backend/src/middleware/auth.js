const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Request, Response, NextFunction } = require('express');
const config = require('../config');
const prisma = require('../config/prisma');
const { supabaseAdmin, supabaseAvailable } = require('../config/supabase');
const { AppError } = require('./error');

const signToken = (payload) =>
  jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

const hashPassword = async (password) => bcrypt.hash(password, 12);
const verifyPassword = async (password, hash) => bcrypt.compare(password, hash);

const authenticate = async (req, res, next) => {
  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }
  if (!token) {
    return next(new AppError('Authentication required', 401, 'AUTH_REQUIRED'));
  }

  let decoded = null;
  try {
    decoded = jwt.verify(token, config.jwt.secret);
  } catch (e) {
    // Try Supabase token if local JWT fails
    if (supabaseAvailable) {
      try {
        const { data } = await supabaseAdmin.auth.getUser(token);
        if (data && data.user) {
          const user = await prisma.user.findFirst({
            where: { supabaseUid: data.user.id },
            include: { affiliate: true },
          });
          if (user) {
            req.user = user;
            return next();
          }
        }
      } catch (supErr) {
        // fallthrough
      }
    }
    return next(new AppError('Invalid or expired token', 401, 'INVALID_TOKEN'));
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.sub },
    include: { affiliate: true },
  });
  if (!user) {
    return next(new AppError('User no longer exists', 401, 'USER_NOT_FOUND'));
  }
  req.user = user;
  next();
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401, 'AUTH_REQUIRED'));
  }
  if (!roles.includes(req.user.role)) {
    return next(
      new AppError(
        `Access denied. Required role: ${roles.join(', ')}`,
        403,
        'FORBIDDEN_ROLE'
      )
    );
  }
  next();
};

const requireOwnershipOrAdmin = (getOwnerId) => (req, res, next) => {
  if (!req.user) return next(new AppError('Authentication required', 401, 'AUTH_REQUIRED'));
  if (req.user.role === 'ADMIN') return next();
  const ownerId = typeof getOwnerId === 'function' ? getOwnerId(req) : getOwnerId;
  const myAffiliateId = req.user.affiliate?.id;
  if (myAffiliateId && ownerId === myAffiliateId) return next();
  return next(new AppError('Access denied', 403, 'FORBIDDEN_OWNERSHIP'));
};

module.exports = {
  signToken,
  hashPassword,
  verifyPassword,
  authenticate,
  requireRole,
  requireOwnershipOrAdmin,
};
