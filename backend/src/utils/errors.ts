export class DefaultError {
    message: string;
    errCode: number;

    constructor(message: string, errCode: number){
        this.message = message;
        this.errCode = errCode;
    }
}

export class BadRequestError extends DefaultError {
    constructor(message: string = 'Bad Request Error'){
        super(message, 400);
    }
}

export class NotFoundError extends DefaultError {
    constructor(message: string = 'Not Found Error'){
        super(message, 404);
    }
}