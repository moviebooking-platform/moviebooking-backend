import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import {
  HttpExceptionFilter,
  TransformInterceptor,
  LoggingInterceptor,
  initIdCipher,
} from '@moviebooking/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('TheatreService');

  // Initialize ID encryption
  initIdCipher();

  // Global prefix
  app.setGlobalPrefix('api');

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Theatre Service API')
    .setDescription('Theatre, screen, and seat management API for Movie Ticket Booking System')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT token',
      },
      'JWT-auth',
    )
    .addTag('theatres', 'Theatre management endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: false,
      },
    }),
  );

  // Global filters
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global interceptors
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(app.get(Reflector)),
  );

  // CORS
  app.enableCors();

  const port = process.env.THEATRE_SERVICE_PORT || 3002;
  await app.listen(port);

  logger.log(`Theatre Service running on port ${port}`);
  logger.log(`Swagger docs available at http://localhost:${port}/api/docs`);
}

bootstrap();
