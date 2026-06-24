'use strict';

const { Router } = require('express');
const ctrl = require('../controllers/user.controller');
const { authenticate, requireAdmin } = require('../middlewares/auth.middleware');

const router = Router();

/* Ähli /api/users marşrutlary — token + admin gerek */
router.use(authenticate, requireAdmin);

/**
 * @swagger
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: Ulanyjylaryň sanawy (diňe admin)
 *     responses:
 *       200:
 *         description: Ulanyjylar sanawy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/User' }
 *       403:
 *         description: Rugsat ýok (admin däl)
 *   post:
 *     tags: [Users]
 *     summary: Täze ulanyjy goş (diňe admin)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserInput'
 *     responses:
 *       201:
 *         description: Ulanyjy döredildi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/User' }
 *       409:
 *         description: Bu email eýýäm bar
 */
router.get('/', ctrl.list);
router.post('/', ctrl.create);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Ulanyjyny poz (diňe admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Pozuldy
 *       400:
 *         description: Özüňi pozup bolmaýar / iň soňky admin galmaly
 *       404:
 *         description: Ulanyjy tapylmady
 */
router.delete('/:id', ctrl.remove);

module.exports = router;
