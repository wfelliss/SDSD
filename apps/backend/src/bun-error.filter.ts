import { ExceptionFilter, Catch, ArgumentsHost, Logger, HttpException } from '@nestjs/common';

@Catch()
export class BunErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger('BunErrorFilter');

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    // HttpExceptions (401, 403, 404, etc.) are expected application-level responses,
    // not infrastructure failures. Return their correct status code and body so the
    // client can handle them properly (e.g. redirect to /login on 401).
    if (exception instanceof HttpException) {
      response
        .status(exception.getStatus())
        .json(exception.getResponse());
      return;
    }

    // 🔍 UNWRAP BUN AGGREGATE ERRORS
    if (exception instanceof AggregateError || exception.name === 'AggregateError') {
      this.logger.error('💥 AGGREGATE ERROR DETECTED 💥');
      
      // Log every single inner error
      if (exception.errors && Array.isArray(exception.errors)) {
        exception.errors.forEach((err, index) => {
          this.logger.error(`Error #${index + 1}: ${err.message}`);
          if (err.code) this.logger.error(`Code: ${err.code}`);
          if (err.syscall) this.logger.error(`Syscall: ${err.syscall}`);
          this.logger.error(`Error #${index + 1}: ${err.message}`);
          if (err instanceof Error) {
            this.logger.error(`Stack for inner error #${index + 1}:`, err.stack);
          } else {
            this.logger.error(`Full details for non-error inner exception #${index + 1}:`, err);
          }
        });
      }
    } else {
      // Log standard errors
      this.logger.error(`Standard Error: ${exception.message}`, exception.stack);
    }

    // Send a response so the client doesn't hang
    response.status(500).json({
      statusCode: 500,
      message: 'Check server logs for Bun error details',
    });
  }
}