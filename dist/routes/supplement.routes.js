"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSupplementRoutes = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const supplement_controller_1 = require("../controllers/supplement.controller");
const auth_guard_1 = require("../middlewares/auth.guard");
const response_utility_1 = require("../utilities/response.utility");
// Configure multer for memory storage (for Cloudinary upload)
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (_req, file, cb) => {
        // Accept only image files
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        }
        else {
            cb(new Error('Only image files are allowed'));
        }
    },
});
const createSupplementRoutes = (container) => {
    const router = (0, express_1.Router)();
    const supplementController = container.get(supplement_controller_1.SupplementController);
    const authGuard = container.get(auth_guard_1.AuthGuard);
    /**
     * @swagger
     * /api/v2/supplements:
     *   get:
     *     tags: [Supplements]
     *     summary: Get all supplements with pagination
     *     parameters:
     *       - in: query
     *         name: page
     *         schema:
     *           type: integer
     *           minimum: 1
     *           default: 1
     *       - in: query
     *         name: limit
     *         schema:
     *           type: integer
     *           minimum: 1
     *           maximum: 100
     *           default: 10
     *     responses:
     *       200:
     *         description: List of supplements retrieved successfully
     */
    router.get('/', (0, response_utility_1.authenticatedHandler)(supplementController.getSupplements.bind(supplementController)));
    /**
     * @swagger
     * /api/v2/supplements/search:
     *   get:
     *     tags: [Supplements]
     *     summary: Search supplements
     *     parameters:
     *       - in: query
     *         name: q
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Search results retrieved successfully
     */
    router.get('/search', (0, response_utility_1.authenticatedHandler)(supplementController.searchSupplements.bind(supplementController)));
    /**
     * @swagger
     * /api/v2/supplements/user:
     *   get:
     *     tags: [Supplements]
     *     summary: Get supplements by authenticated user
     *     security:
     *       - BearerAuth: []
     *     responses:
     *       200:
     *         description: List of user's supplements retrieved successfully
     */
    router.get('/user', authGuard.verify(), (0, response_utility_1.authenticatedHandler)(supplementController.getUserSupplements.bind(supplementController)));
    /**
     * @swagger
     * /api/v2/supplements/{id}:
     *   get:
     *     tags: [Supplements]
     *     summary: Get supplement by ID
     *     parameters:
     *       - name: id
     *         in: path
     *         required: true
     *         schema:
     *           type: integer
     *     responses:
     *       200:
     *         description: Supplement details retrieved successfully
     */
    router.get('/:id', (0, response_utility_1.authenticatedHandler)(supplementController.getSupplementById.bind(supplementController)));
    /**
     * @swagger
     * /api/v2/supplements:
     *   post:
     *     tags: [Supplements]
     *     summary: Create a new supplement
     *     security:
     *       - BearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/CreateSupplementRequest'
     *     responses:
     *       201:
     *         description: Supplement created successfully
     */
    router.post('/', authGuard.verify(), (0, response_utility_1.authenticatedHandler)(supplementController.createSupplement.bind(supplementController)));
    /**
     * @swagger
     * /api/v2/supplements/{id}:
     *   put:
     *     tags: [Supplements]
     *     summary: Update supplement by ID
     *     security:
     *       - BearerAuth: []
     *     parameters:
     *       - name: id
     *         in: path
     *         required: true
     *         schema:
     *           type: integer
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/UpdateSupplementRequest'
     *     responses:
     *       200:
     *         description: Supplement updated successfully
     */
    router.put('/:id', authGuard.verify(), (0, response_utility_1.authenticatedHandler)(supplementController.updateSupplement.bind(supplementController)));
    /**
     * @swagger
     * /api/v2/supplements/{id}:
     *   delete:
     *     tags: [Supplements]
     *     summary: Delete supplement by ID
     *     security:
     *       - BearerAuth: []
     *     parameters:
     *       - name: id
     *         in: path
     *         required: true
     *         schema:
     *           type: integer
     *     responses:
     *       200:
     *         description: Supplement deleted successfully
     */
    router.delete('/:id', authGuard.verify(), (0, response_utility_1.authenticatedHandler)(supplementController.deleteSupplement.bind(supplementController)));
    /**
     * @swagger
     * /api/v2/supplements/upload-image:
     *   post:
     *     tags: [Supplements]
     *     summary: Upload an image for a supplement
     *     security:
     *       - BearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         multipart/form-data:
     *           schema:
     *             type: object
     *             properties:
     *               image:
     *                 type: string
     *                 format: binary
     *     responses:
     *       200:
     *         description: Image uploaded successfully
     */
    router.post('/upload-image', authGuard.verify(), upload.single('image'), (0, response_utility_1.authenticatedHandler)(supplementController.uploadImage.bind(supplementController)));
    /**
     * @swagger
     * /api/v2/supplements/upload-image-base64:
     *   post:
     *     tags: [Supplements]
     *     summary: Upload a base64 encoded image for a supplement
     *     security:
     *       - BearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               image:
     *                 type: string
     *     responses:
     *       200:
     *         description: Image uploaded successfully
     */
    router.post('/upload-image-base64', authGuard.verify(), (0, response_utility_1.authenticatedHandler)(supplementController.uploadImageBase64.bind(supplementController)));
    return router;
};
exports.createSupplementRoutes = createSupplementRoutes;
//# sourceMappingURL=supplement.routes.js.map