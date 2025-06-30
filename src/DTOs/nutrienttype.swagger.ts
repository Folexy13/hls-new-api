/**
 * Swagger components for NutrientType DTOs
 * Add this file to your swagger config via `apis` or import into your main swagger definition.
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     CreateNutrientTypeDTO:
 *       type: object
 *       required:
 *         - code
 *       properties:
 *         code:
 *           type: string
 *           description: Unique code for the nutrient type
 *         basicId:
 *           type: integer
 *           description: Optional basic nutrient id
 *         lifestyleId:
 *           type: integer
 *           description: Optional lifestyle nutrient id
 *         preferenceId:
 *           type: integer
 *           description: Optional preference nutrient id
 *     UpdateNutrientTypeDTO:
 *       type: object
 *       properties:
 *         code:
 *           type: string
 *           description: Unique code for the nutrient type
 *         basicId:
 *           type: integer
 *           description: Optional basic nutrient id
 *         lifestyleId:
 *           type: integer
 *           description: Optional lifestyle nutrient id
 *         preferenceId:
 *           type: integer
 *           description: Optional preference nutrient id
 *     GetNutrientTypeByCodeDTO:
 *       type: object
 *       required:
 *         - code
 *       properties:
 *         code:
 *           type: string
 *           description: Unique code for the nutrient type
 */
