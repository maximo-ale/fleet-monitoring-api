import { Request, Response, NextFunction } from 'express';
import { DefaultError } from '../utils/errors';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    console.log('err: ', err);
    
    if (err instanceof DefaultError){
        return res.status(err.errCode).json({message: err.message});
    }

    return res.status(500).json({message: 'Internal server error'});
}