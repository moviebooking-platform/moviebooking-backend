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
  const logger = new Logger('MovieService');

  initIdCipher();

  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('Movie Service API')
    .setDescription('Movie catalogue and request management API for Movie Ticket Booking System')
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
    .addTag('movies', 'Movie catalogue endpoints')
    .addTag('movie-images', 'Movie image management endpoints')
    .addTag('movie-requests', 'Movie request workflow endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

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

  app.useGlobalFilters(new HttpExceptionFilter());

  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(app.get(Reflector)),
  );

  app.enableCors();

  const port = process.env.MOVIE_SERVICE_PORT || 3003;
  await app.listen(port);

  logger.log(`Movie Service running on port ${port}`);
  logger.log(`Swagger docs available at http://localhost:${port}/api/docs`);
}

bootstrap();
