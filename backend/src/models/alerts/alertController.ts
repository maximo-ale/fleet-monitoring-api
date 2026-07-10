import { Request, Response } from 'express';
import { AlertData, AlertQuery } from './alertInterface';
import * as alertService from './alertService';

export const getRecentAlerts = async(req: Request, res: Response) => {
    const query: AlertQuery = {
        limit: req.query.limit ? Number(req.query.limit) : undefined,
    };
    
    const alerts: AlertData[] = await alertService.getRecentAlerts(query);

    return res.status(200).json(alerts);
}
