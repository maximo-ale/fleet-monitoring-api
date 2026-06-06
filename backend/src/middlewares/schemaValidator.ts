import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

export const validate = (schema: any, type: 'body' | 'params' | 'query') => {
    return async(req: Request, res: Response, next: NextFunction) => {
        const result = schema.safeParse(req[type]);

        if (!result.success){
            const errors = z.flattenError(result.error);

            return res.status(400).json({
                message: 'Invalid data',
                errors: errors.fieldErrors,
                formErrors: errors.formErrors,
            });
        }

        next();
    }
}