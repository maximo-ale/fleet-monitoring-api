import { Request, Response, NextFunction } from 'express';

export const health = async(req: Request, res: Response, next: NextFunction) => {
    return res.status(200).json({
        status: "ok",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
    });
}